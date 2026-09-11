import { acceptRevision, intervalMs, isQuickSkip } from '../utils/tracking';
import type { StoredVisit, Coverage } from '../types/tracking';
import { localDateKey } from '../utils/time';
import { PLATFORMS } from '../types/models';
import { openLocalDatabase } from '../utils/database';
import { TrackingError } from '../utils/errors';

const stores = ['preferences', 'visits', 'trackingCoverage', 'trackingMeta', 'rollups'];
const RECOVERY_GRACE_MS = 10000;

export function openTrackingDatabase(factory: IDBFactory = indexedDB) {
  return openLocalDatabase(stores, database => {
    if (!database.objectStoreNames.contains('preferences')) database.createObjectStore('preferences');
    if (!database.objectStoreNames.contains('visits')) {
      const visits = database.createObjectStore('visits', { keyPath: 'id' });
      visits.createIndex('by_end', 'observedAt');
      visits.createIndex('by_status', 'status');
    }
    if (!database.objectStoreNames.contains('trackingCoverage')) {
      const coverage = database.createObjectStore('trackingCoverage', { keyPath: 'id' });
      coverage.createIndex('by_end', 'endTs');
    }
    if (!database.objectStoreNames.contains('trackingMeta')) database.createObjectStore('trackingMeta');
    if (!database.objectStoreNames.contains('rollups')) {
      database.createObjectStore('rollups', { keyPath: ['date', 'platform'] });
    }
  }, factory);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(
  names: string[], mode: IDBTransactionMode, run: (transaction: IDBTransaction) => Promise<T>,
): Promise<T> {
  let database: IDBDatabase | undefined;
  try {
    database = await openTrackingDatabase();
    const transaction = database.transaction(names, mode, mode === 'readwrite' ? { durability: 'strict' } : undefined);
    // Capture completion immediately, including when a request also fails.
    const completion = new Promise<{ error?: Error | DOMException }>(resolve => {
      transaction.oncomplete = () => resolve({});
      transaction.onabort = transaction.onerror = () =>
        resolve({ error: transaction.error ?? new Error('Tracking transaction failed') });
    });
    try {
      const value = await run(transaction);
      const outcome = await completion;
      if (outcome.error) throw outcome.error;
      return value;
    } catch (cause) {
      try {
        transaction.abort();
      } catch (abortError) {
        // An already completed/aborted transaction cannot be aborted again.
        if (!(abortError instanceof DOMException && abortError.name === 'InvalidStateError')) {
          console.error('[DoomGauge] Abort tracking transaction', abortError);
        }
      }
      throw cause;
    }
  } catch (cause) {
    throw new TrackingError('storage-failed', cause);
  } finally {
    database?.close();
  }
}

function affectedDates(visit: StoredVisit) {
  const dates = new Set([localDateKey(new Date(visit.startedAt))]);
  for (const interval of visit.intervals) {
    const date = new Date(interval.start);
    date.setHours(0, 0, 0, 0);
    while (date.getTime() < interval.end) {
      dates.add(localDateKey(date));
      date.setDate(date.getDate() + 1);
    }
  }
  return dates;
}

export function saveVisit(visit: StoredVisit) {
  return transaction(['visits', 'trackingMeta'], 'readwrite', async transaction => {
    const visits = transaction.objectStore('visits');
    const previous = await requestResult(visits.get(visit.id)) as StoredVisit | undefined;
    if (!acceptRevision(previous, visit)) return;
    visits.put(visit);
    const metadata = transaction.objectStore('trackingMeta');
    for (const date of affectedDates(visit)) metadata.put(true, `dirty:${date}`);
  });
}

export function saveCoverage(coverage: Coverage) {
  return transaction(['trackingCoverage'], 'readwrite', async transaction => {
    transaction.objectStore('trackingCoverage').put(coverage);
  });
}

export function readTracking(start: number, end: number) {
  return transaction(['visits', 'trackingCoverage'], 'readonly', async transaction => {
    const visitsRequest = transaction.objectStore('visits').index('by_end').getAll(IDBKeyRange.lowerBound(start));
    const coverageRequest = transaction.objectStore('trackingCoverage').index('by_end').getAll(IDBKeyRange.lowerBound(start));
    const [visits, coverage] = await Promise.all([requestResult(visitsRequest), requestResult(coverageRequest)]);
    return {
      visits: (visits as StoredVisit[]).filter(visit => visit.startedAt < end),
      coverage: (coverage as Coverage[]).filter(interval => interval.startTs < end),
    };
  });
}

export function recoverVisits(alive: ReadonlySet<string>, now = Date.now()) {
  return transaction(['visits'], 'readwrite', async transaction => {
    const visits = transaction.objectStore('visits');
    const open = await requestResult(visits.index('by_status').getAll('open')) as StoredVisit[];
    for (const visit of open) {
      if (now - visit.receivedAt > RECOVERY_GRACE_MS && !alive.has(visit.id)) {
        visits.put({ ...visit, status: 'interrupted' });
      }
    }
  });
}

export function rebuildRollups() {
  return transaction(['visits', 'trackingMeta', 'rollups'], 'readwrite', async transaction => {
    const metadata = transaction.objectStore('trackingMeta');
    const keys = await requestResult(metadata.getAllKeys());
    for (const key of keys) {
      if (typeof key !== 'string' || !key.startsWith('dirty:')) continue;
      const date = key.slice(6);
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const visits = await requestResult(transaction.objectStore('visits').index('by_end')
        .getAll(IDBKeyRange.lowerBound(start.getTime()))) as StoredVisit[];
      for (const platform of PLATFORMS) {
        const relevant = visits.filter(visit => visit.platform === platform && visit.startedAt < end.getTime());
        const started = relevant.filter(visit => visit.startedAt >= start.getTime());
        transaction.objectStore('rollups').put({
          date, platform, reelCount: started.length,
          skipCount: started.filter(isQuickSkip).length,
          totalActiveMs: relevant.reduce((sum, visit) => sum + intervalMs(visit.intervals, start.getTime(), end.getTime()), 0),
        });
      }
      metadata.delete(key);
    }
  });
}
