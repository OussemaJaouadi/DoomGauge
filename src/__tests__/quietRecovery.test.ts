// React & 3rd-party
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';

// Types & Models
import type { StoredVisit } from '../types/tracking';
import type { TrackingChange } from '../types/runtime';

// Utilities & Helpers
import { TrackingService } from '../tracking/service';
import { saveVisit, readTracking } from '../storage/activityRepository';
import { openLocalDatabase, closeLocalDatabase } from '../storage/database';

declare function test(name: string, run: () => void | Promise<void>): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void };

function unfinished(id: string, tabId: number): StoredVisit {
  const now = Date.now();
  return {
    id, tabId, documentId: `document-${tabId}`, collectorId: `collector-${tabId}`, platform: 'youtube',
    startedAt: now - 120_000, observedAt: now - 100_000, receivedAt: now - 100_000,
    activeMs: 1000, intervals: [{ start: now - 120_000, end: now - 119_000 }], revision: 1, status: 'open',
  };
}

async function withStorage(run: () => Promise<void>): Promise<void> {
  const originalDatabase = globalThis.indexedDB;
  const originalKeys = globalThis.IDBKeyRange;
  const originalChrome = globalThis.chrome;
  const factory = new IDBFactory();
  Object.assign(globalThis, { indexedDB: factory, IDBKeyRange });
  try {
    await run();
  } finally {
    await closeLocalDatabase(factory);
    Object.assign(globalThis, { indexedDB: originalDatabase, IDBKeyRange: originalKeys, chrome: originalChrome });
  }
}

test('empty history causes no tab probes or write transactions across repeated maintenance', async () => {
  await withStorage(async () => {
    let probes = 0;
    Object.assign(globalThis, { chrome: { tabs: { sendMessage: () => { probes += 1; } } } });
    const db = await openLocalDatabase();
    const originalTransaction = db.transaction.bind(db);
    let writes = 0;
    db.transaction = (names, mode, options) => {
      if (mode === 'readwrite') {
        writes += 1;
      }
      return originalTransaction(names, mode, options);
    };
    const service = new TrackingService();
    await service.runMaintenance();
    await service.runMaintenance();
    expect(probes).toBe(0);
    expect(writes).toBe(0);
    expect(await service.read(0, Date.now())).toEqual({ visits: [], coverage: [], savingFailed: false });
  });
});

test('recovery probes only unfinished owners and preserves a surviving visit', async () => {
  await withStorage(async () => {
    const first = unfinished('alive', 1);
    const second = unfinished('closed', 2);
    await saveVisit(first);
    await saveVisit(second);
    await saveVisit({ ...unfinished('completed', 3), status: 'completed' });
    const probes: number[] = [];
    Object.assign(globalThis, { chrome: { tabs: { sendMessage: async (tabId: number) => {
      probes.push(tabId);
      if (tabId === 2) {
        throw new Error('No tab with id: 2.');
      }
      return { collectorId: 'collector-1', visitId: 'alive' };
    } } } });
    await new TrackingService().runMaintenance();
    expect(probes.sort()).toEqual([1, 2]);
    const records = await readTracking(0, Date.now());
    expect(records.visits.find(record => record.id === 'alive')?.status).toBe('open');
    const closed = records.visits.find(record => record.id === 'closed');
    expect(closed?.status).toBe('interrupted');
    expect(closed?.activeMs).toBe(second.activeMs);
    expect(closed?.intervals).toEqual(second.intervals);
  });
});

test('an unanswered tab is quiet and retains saved measurements and unfinished status', async () => {
  await withStorage(async () => {
    const record = unfinished('unknown', 4);
    await saveVisit(record);
    Object.assign(globalThis, { chrome: { tabs: { sendMessage: () => new Promise(() => {}) } } });
    const originalError = console.error;
    let errors = 0;
    console.error = () => { errors += 1; };
    try {
      await new TrackingService().runMaintenance();
      expect(errors).toBe(0);
      const stored = await readTracking(0, Date.now());
      expect(stored.visits[0]).toEqual(record);
    } finally {
      console.error = originalError;
    }
  });
});

test('activity changes are announced only for committed new revisions', async () => {
  await withStorage(async () => {
    const notices: TrackingChange[] = [];
    const service = new TrackingService(notice => notices.push(notice));
    const record = unfinished('saved', 5);
    await service.recordVisit(record, 5, record.documentId);
    await service.recordVisit(record, 5, record.documentId);
    expect(notices.length).toBe(1);
    const rejected = await service.recordVisit({ ...record, revision: 2 }, 6, 'other').then(() => false, () => true);
    expect(rejected).toBe(true);
    expect(notices.length).toBe(1);
    expect(notices[0]).toEqual({ type: 'tracking:changed', start: record.startedAt, end: record.observedAt });
    expect((await readTracking(0, Date.now())).visits.length).toBe(1);
  });
});
