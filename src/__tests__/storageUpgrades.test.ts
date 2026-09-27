// React & 3rd-party
import { IDBFactory, IDBKeyRange, IDBIndex } from 'fake-indexeddb';

// Types & Models
import type { StoredVisit } from '../types/tracking';

// Tokens & Meta
import { DATABASE_NAME, SCHEMA_VERSION, SCHEMA_VERSION_KEY, DAY_MS, SPANNING_DAY_KEY } from '../config/storage';

// Utilities & Helpers
import { openLocalDatabase, closeLocalDatabase, requestResult } from '../storage/database';
import { readTheme } from '../storage/preferenceRepository';
import { readTracking, saveVisit, rebuildRollups } from '../storage/activityRepository';

declare function test(name: string, run: () => void | Promise<void>): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void };

function visit(id: string, start: number, end = start + 1000): StoredVisit {
  return {
    id, collectorId: 'collector', tabId: 1, documentId: 'document', platform: 'youtube',
    startedAt: start, observedAt: end, receivedAt: end, activeMs: 0, intervals: [], revision: 1, status: 'completed',
  };
}

async function legacyDatabase(factory: IDBFactory, records: StoredVisit[], schema = 1): Promise<void> {
  const request = factory.open(DATABASE_NAME, 7);
  request.onupgradeneeded = () => {
    const db = request.result;
    db.createObjectStore('preferences').put('dark', 'theme');
    db.createObjectStore('trackingMeta').put(schema, SCHEMA_VERSION_KEY);
    db.createObjectStore('rollups', { keyPath: ['date', 'platform'] });
    const coverage = db.createObjectStore('trackingCoverage', { keyPath: 'id' });
    coverage.createIndex('by_end', 'endTs');
    const visits = db.createObjectStore('visits', { keyPath: 'id' });
    visits.createIndex('by_end', 'observedAt');
    visits.createIndex('by_status', 'status');
    for (const record of records) {
      visits.put(record);
    }
  };
  const database = await requestResult(request);
  database.close();
}

test('schema upgrades index existing records in place and do not run again on reopening', async () => {
  const factory = new IDBFactory();
  const record = visit('legacy', 10 * DAY_MS, 12 * DAY_MS);
  await legacyDatabase(factory, [record]);
  const database = await openLocalDatabase(factory);
  const transaction = database.transaction(['visits', 'trackingMeta']);
  const [indexed, schema, count] = await Promise.all([
    requestResult(transaction.objectStore('visits').get('legacy')),
    requestResult(transaction.objectStore('trackingMeta').get(SCHEMA_VERSION_KEY)),
    requestResult(transaction.objectStore('visits').count()),
  ]);
  expect(indexed).toEqual({ ...record, rangeDays: [10, 11, 12] });
  expect(count).toBe(1);
  expect(schema).toBe(SCHEMA_VERSION);
  expect(await readTheme(() => openLocalDatabase(factory))).toBe('dark');
  const nativeVersion = database.version;
  await closeLocalDatabase(factory);
  const reopened = await openLocalDatabase(factory);
  expect(reopened.version).toBe(nativeVersion);
  await closeLocalDatabase(factory);
});

test('failed migration rolls back records, indexes and schema version together', async () => {
  const factory = new IDBFactory();
  const good = visit('a-good', 1000);
  const invalid = { ...visit('z-invalid', 2000), observedAt: NaN };
  await legacyDatabase(factory, [good, invalid]);
  let failed = false;
  try {
    await openLocalDatabase(factory);
  } catch (cause) {
    failed = cause instanceof Error && cause.message.includes('invalid timestamps');
  }
  expect(failed).toBe(true);
  const database = await requestResult(factory.open(DATABASE_NAME));
  expect(database.version).toBe(7);
  const transaction = database.transaction(['visits', 'trackingMeta', 'preferences']);
  expect(transaction.objectStore('visits').indexNames.contains('by_day')).toBe(false);
  const [retained, version, theme] = await Promise.all([
    requestResult(transaction.objectStore('visits').get('a-good')),
    requestResult(transaction.objectStore('trackingMeta').get(SCHEMA_VERSION_KEY)),
    requestResult(transaction.objectStore('preferences').get('theme')),
  ]);
  expect(retained).toEqual(good);
  expect(version).toBe(1);
  expect(theme).toBe('dark');
  database.close();
});

test('newer schemas are rejected without changing their records', async () => {
  const factory = new IDBFactory();
  await legacyDatabase(factory, [visit('future', 1000)], SCHEMA_VERSION + 1);
  const failed = await openLocalDatabase(factory).then(() => false, () => true);
  expect(failed).toBe(true);
  const database = await requestResult(factory.open(DATABASE_NAME));
  expect(database.version).toBe(7);
  const transaction = database.transaction('visits');
  expect(await requestResult(transaction.objectStore('visits').count())).toBe(1);
  database.close();
});

test('range reads use bounded day indexes and deduplicate cross-day visits', async () => {
  const previousDatabase = globalThis.indexedDB;
  const previousKeys = globalThis.IDBKeyRange;
  const factory = new IDBFactory();
  Object.assign(globalThis, { indexedDB: factory, IDBKeyRange });
  const originalGetAll = IDBIndex.prototype.getAll;
  try {
    await saveVisit(visit('old', DAY_MS));
    await saveVisit(visit('selected', 10 * DAY_MS, 12 * DAY_MS));
    await saveVisit(visit('later', 100 * DAY_MS));
    await saveVisit(visit('long', 0, 150 * DAY_MS));
    const indexes: string[] = [];
    const upperBounds: unknown[] = [];
    IDBIndex.prototype.getAll = function(query, count) {
      indexes.push(this.name);
      upperBounds.push(query instanceof IDBKeyRange ? query.upper : query);
      return originalGetAll.call(this, query, count);
    };
    const data = await readTracking(10 * DAY_MS, 12 * DAY_MS);
    expect(data.visits.map(record => record.id).sort()).toEqual(['long', 'selected']);
    expect(data.visits.every(record => !('rangeDays' in record))).toBe(true);
    expect(indexes.every(name => name === 'by_day')).toBe(true);
    expect(upperBounds.every(value => value === 11 || value === SPANNING_DAY_KEY)).toBe(true);
    const db = await openLocalDatabase(factory);
    const stored = await requestResult(db.transaction('visits').objectStore('visits').get('long'));
    expect(stored.rangeDays).toEqual([SPANNING_DAY_KEY]);
  } finally {
    IDBIndex.prototype.getAll = originalGetAll;
    await closeLocalDatabase(factory);
    Object.assign(globalThis, { indexedDB: previousDatabase, IDBKeyRange: previousKeys });
  }
});

test('summaries commit one dirty day at a time and idle maintenance performs no writes', async () => {
  const previousDatabase = globalThis.indexedDB;
  const previousKeys = globalThis.IDBKeyRange;
  const factory = new IDBFactory();
  Object.assign(globalThis, { indexedDB: factory, IDBKeyRange });
  try {
    await saveVisit(visit('first', 10 * DAY_MS));
    await saveVisit(visit('second', 20 * DAY_MS));
    const db = await openLocalDatabase(factory);
    const originalTransaction = db.transaction.bind(db);
    let writes = 0;
    db.transaction = (names, mode, options) => {
      if (mode === 'readwrite') {
        writes += 1;
      }
      return originalTransaction(names, mode, options);
    };
    await rebuildRollups();
    expect(writes).toBe(2);
    writes = 0;
    await rebuildRollups();
    expect(writes).toBe(0);
  } finally {
    await closeLocalDatabase(factory);
    Object.assign(globalThis, { indexedDB: previousDatabase, IDBKeyRange: previousKeys });
  }
});
