// React & 3rd-party
import { IDBFactory } from 'fake-indexeddb';

// Utilities & Helpers
import { openLocalDatabase, closeLocalDatabase, requestResult, runTransaction } from '../storage/database';
import { readTheme, writeTheme } from '../storage/preferenceRepository';
import { TrackingError } from '../runtime/errors';

declare function test(name: string, run: () => void | Promise<void>): void;
declare function expect(value: unknown): {
  toBe(value: unknown): void;
  toEqual(value: unknown): void;
};

test('concurrent theme reads and writes share one open connection', async () => {
  const factory = new IDBFactory();
  const originalOpen = factory.open.bind(factory);
  let opens = 0;
  factory.open = (name, version) => {
    opens += 1;
    return originalOpen(name, version);
  };
  const open = () => openLocalDatabase(factory);
  expect(open()).toBe(open());
  await writeTheme('dark', open);
  const preferences = await Promise.all(Array.from({ length: 100 }, () => readTheme(open)));
  expect(preferences.every(preference => preference === 'dark')).toBe(true);
  expect(opens).toBe(1);
  await closeLocalDatabase(factory);
  expect(await readTheme(open)).toBe('dark');
  expect(opens).toBe(2);
  await closeLocalDatabase(factory);
});

test('legacy schema upgrades preserve data and add missing indexes', async () => {
  const factory = new IDBFactory();
  const legacyOpen = factory.open('doomgauge-v1', 9);
  legacyOpen.onupgradeneeded = () => {
    const database = legacyOpen.result;
    database.createObjectStore('preferences').put('light', 'theme');
    database.createObjectStore('events').put({ retained: true }, 'legacy');
    database.createObjectStore('visits', { keyPath: 'id' });
  };
  const legacy = await requestResult(legacyOpen);
  legacy.close();

  const database = await openLocalDatabase(factory);
  expect(database.version).toBe(10);
  expect(await readTheme(() => openLocalDatabase(factory))).toBe('light');
  const transaction = database.transaction(['events', 'visits']);
  const event = await requestResult(transaction.objectStore('events').get('legacy'));
  expect(event).toEqual({ retained: true });
  expect(transaction.objectStore('visits').indexNames.contains('by_end')).toBe(true);
  expect(transaction.objectStore('visits').indexNames.contains('by_status')).toBe(true);
  await closeLocalDatabase(factory);
});

test('version changes release and invalidate the shared connection', async () => {
  const factory = new IDBFactory();
  const first = await openLocalDatabase(factory);
  const upgrade = factory.open('doomgauge-v1', first.version + 1);
  const external = await requestResult(upgrade);
  external.close();
  const next = await openLocalDatabase(factory);
  expect(next === first).toBe(false);
  expect(next.version).toBe(first.version + 1);
  await closeLocalDatabase(factory);
});

test('a rejected open retains its cause and allows a later retry', async () => {
  const factory = new IDBFactory();
  const originalOpen = factory.open.bind(factory);
  const cause = new Error('temporarily unavailable');
  factory.open = () => {
    throw cause;
  };
  try {
    await readTheme(() => openLocalDatabase(factory));
    throw new Error('Expected rejection');
  } catch (error) {
    expect(error instanceof TrackingError && error.code).toBe('storage-failed');
    expect(error instanceof Error && error.cause).toBe(cause);
  }
  factory.open = originalOpen;
  expect(await readTheme(() => openLocalDatabase(factory))).toBe('system');
  await closeLocalDatabase(factory);
});

test('blocked upgrades reject visibly and recover after the blocking connection closes', async () => {
  const factory = new IDBFactory();
  const legacy = await requestResult(factory.open('doomgauge-v1', 1));
  let blocked = false;
  try {
    await openLocalDatabase(factory);
  } catch (error) {
    blocked = error instanceof Error && error.message.includes('blocked');
  } finally {
    legacy.close();
  }
  expect(blocked).toBe(true);
  await writeTheme('light', () => openLocalDatabase(factory));
  expect(await readTheme(() => openLocalDatabase(factory))).toBe('light');
  await closeLocalDatabase(factory);
});

test('aborted transactions never acknowledge or overwrite the committed theme', async () => {
  const factory = new IDBFactory();
  const open = () => openLocalDatabase(factory);
  await writeTheme('dark', open);
  let acknowledged = false;
  try {
    await runTransaction(['preferences'], 'readwrite', async transaction => {
      await requestResult(transaction.objectStore('preferences').put('light', 'theme'));
      transaction.abort();
    }, open);
    acknowledged = true;
  } catch (error) {
    expect(error instanceof TrackingError && error.code).toBe('storage-failed');
  }
  expect(acknowledged).toBe(false);
  expect(await readTheme(open)).toBe('dark');
  await closeLocalDatabase(factory);
});

test('preference writes acknowledge only after transaction completion', async () => {
  let committed = false;
  const transaction = {
    oncomplete: undefined as undefined | (() => void),
    onabort: undefined as undefined | (() => void),
    onerror: undefined as undefined | (() => void),
    objectStore: () => ({ put: () => {} }),
  };
  const open = async () => ({ transaction: () => transaction }) as unknown as IDBDatabase;
  const write = writeTheme('dark', open).then(() => {
    committed = true;
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(committed).toBe(false);
  transaction.oncomplete!();
  await write;
  expect(committed).toBe(true);
});
