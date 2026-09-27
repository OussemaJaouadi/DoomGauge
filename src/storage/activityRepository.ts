// Types & Models
import type { StoredVisit, Coverage } from '../types/tracking';
import type { ActivityRecords, IndexedVisit, IndexedCoverage } from '../types/storage';

// Tokens & Meta
import { PLATFORMS } from '../types/models';
import { RECOVERY_GRACE_MS } from '../config/tracking';
import { DAY_MS, SPANNING_DAY_KEY } from '../config/storage';

// Utilities & Helpers
import { acceptRevision, intervalMs, isQuickSkip } from '../utils/tracking';
import { affectedDates } from '../utils/trackingDates';
import { rangeDays } from '../utils/storageRange';
import { requestResult, runTransaction } from './database';

export function saveVisit(visit: StoredVisit): Promise<boolean> {
  return runTransaction(['visits', 'trackingMeta'], 'readwrite', async transaction => {
    const visits = transaction.objectStore('visits');
    const previous = await requestResult(visits.get(visit.id)) as StoredVisit | undefined;
    if (!acceptRevision(previous, visit)) {
      return false;
    }
    const indexed: IndexedVisit = { ...visit, rangeDays: rangeDays(visit.startedAt, visit.observedAt) };
    visits.put(indexed);
    const metadata = transaction.objectStore('trackingMeta');
    for (const date of affectedDates(visit)) {
      metadata.put(true, `dirty:${date}`);
    }
    return true;
  });
}

export function saveCoverage(coverage: Coverage): Promise<boolean> {
  return runTransaction(['trackingCoverage'], 'readwrite', async transaction => {
    const store = transaction.objectStore('trackingCoverage');
    const previous = await requestResult<Coverage | undefined>(store.get(coverage.id));
    if (previous) {
      if (previous.tabId !== coverage.tabId || previous.startTs !== coverage.startTs) {
        throw new Error('Coverage ownership mismatch');
      }
      if (previous.endTs >= coverage.endTs) {
        return false;
      }
    }
    const indexed: IndexedCoverage = { ...coverage, rangeDays: rangeDays(coverage.startTs, coverage.endTs) };
    store.put(indexed);
    return true;
  });
}

async function readDayIndex<T extends { id: string }>(store: IDBObjectStore, start: number, end: number): Promise<T[]> {
  if (end <= start) {
    return [];
  }
  const index = store.index('by_day');
  const days = IDBKeyRange.bound(Math.floor(start / DAY_MS), Math.ceil(end / DAY_MS) - 1);
  const [records, spanning] = await Promise.all([
    requestResult<T[]>(index.getAll(days)),
    requestResult<T[]>(index.getAll(IDBKeyRange.only(SPANNING_DAY_KEY))),
  ]);
  const unique = new Map<string, T>();
  for (const record of [...records, ...spanning]) {
    unique.set(record.id, record);
  }
  return [...unique.values()];
}

export function readTracking(start: number, end: number): Promise<ActivityRecords> {
  return runTransaction(['visits', 'trackingCoverage'], 'readonly', async transaction => {
    const [visits, coverage] = await Promise.all([
      readDayIndex<IndexedVisit>(transaction.objectStore('visits'), start, end),
      readDayIndex<IndexedCoverage>(transaction.objectStore('trackingCoverage'), start, end),
    ]);
    const overlappingVisits = visits.filter(visit => visit.startedAt < end && visit.observedAt >= start);
    const overlappingCoverage = coverage.filter(interval => interval.startTs < end && interval.endTs >= start);
    return {
      visits: overlappingVisits.map(({ rangeDays: _days, ...visit }) => visit),
      coverage: overlappingCoverage.map(({ rangeDays: _days, ...interval }) => interval),
    };
  });
}

export function readUnfinishedVisits(now = Date.now()): Promise<StoredVisit[]> {
  return runTransaction(['visits'], 'readonly', async transaction => {
    const index = transaction.objectStore('visits').index('by_status');
    const visits = await requestResult<StoredVisit[]>(index.getAll('open'));
    return visits.filter(visit => now - visit.receivedAt > RECOVERY_GRACE_MS);
  });
}

export function recoverVisits(alive: ReadonlySet<string>, now = Date.now(), unknownTabs: ReadonlySet<number> = new Set()): Promise<boolean> {
  return runTransaction(['visits'], 'readwrite', async transaction => {
    const visits = transaction.objectStore('visits');
    const open = await requestResult(visits.index('by_status').getAll('open')) as StoredVisit[];
    let changed = false;
    for (const visit of open) {
      const abandoned = now - visit.receivedAt > RECOVERY_GRACE_MS
        && !alive.has(visit.id) && !unknownTabs.has(visit.tabId);
      if (abandoned) {
        visits.put({ ...visit, status: 'interrupted' });
        changed = true;
      }
    }
    return changed;
  });
}

export async function rebuildRollups(): Promise<void> {
  const keys = await runTransaction(['trackingMeta'], 'readonly', transaction => {
    return requestResult(transaction.objectStore('trackingMeta').getAllKeys());
  });
  for (const key of keys) {
    if (typeof key !== 'string' || !key.startsWith('dirty:')) {
      continue;
    }
    await rebuildDay(key);
  }
}

function rebuildDay(key: string): Promise<void> {
  return runTransaction(['visits', 'trackingMeta', 'rollups'], 'readwrite', async transaction => {
    const metadata = transaction.objectStore('trackingMeta');
    const dirty = await requestResult(metadata.get(key));
    if (dirty) {
      const date = key.slice(6);
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const candidates = await readDayIndex<IndexedVisit>(transaction.objectStore('visits'), start.getTime(), end.getTime());
      const visits = candidates.filter(visit => visit.observedAt >= start.getTime());
      for (const platform of PLATFORMS) {
        const relevant = visits.filter(visit => visit.platform === platform && visit.startedAt < end.getTime());
        const started = relevant.filter(visit => visit.startedAt >= start.getTime());
        const skipCount = started.filter(isQuickSkip).length;
        const totalActiveMs = relevant.reduce((sum, visit) => {
          return sum + intervalMs(visit.intervals, start.getTime(), end.getTime());
        }, 0);
        transaction.objectStore('rollups').put({ date, platform, reelCount: started.length, skipCount, totalActiveMs });
      }
      metadata.delete(key);
    }
  });
}
