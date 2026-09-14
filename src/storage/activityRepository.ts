// Types & Models
import type { StoredVisit, Coverage } from '../types/tracking';
import type { ActivityRecords } from '../types/storage';

// Tokens & Meta
import { PLATFORMS } from '../types/models';
import { RECOVERY_GRACE_MS } from '../config/tracking';

// Utilities & Helpers
import { acceptRevision, intervalMs, isQuickSkip } from '../utils/tracking';
import { affectedDates } from '../utils/trackingDates';
import { requestResult, runTransaction } from './database';

export function saveVisit(visit: StoredVisit): Promise<void> {
  return runTransaction(['visits', 'trackingMeta'], 'readwrite', async transaction => {
    const visits = transaction.objectStore('visits');
    const previous = await requestResult(visits.get(visit.id)) as StoredVisit | undefined;
    if (!acceptRevision(previous, visit)) {
      return;
    }
    visits.put(visit);
    const metadata = transaction.objectStore('trackingMeta');
    for (const date of affectedDates(visit)) {
      metadata.put(true, `dirty:${date}`);
    }
  });
}

export function saveCoverage(coverage: Coverage): Promise<void> {
  return runTransaction(['trackingCoverage'], 'readwrite', async transaction => {
    transaction.objectStore('trackingCoverage').put(coverage);
  });
}

export function readTracking(start: number, end: number): Promise<ActivityRecords> {
  return runTransaction(['visits', 'trackingCoverage'], 'readonly', async transaction => {
    const visitsIndex = transaction.objectStore('visits').index('by_end');
    const coverageIndex = transaction.objectStore('trackingCoverage').index('by_end');
    const visitsRequest = visitsIndex.getAll(IDBKeyRange.lowerBound(start));
    const coverageRequest = coverageIndex.getAll(IDBKeyRange.lowerBound(start));
    const [visits, coverage] = await Promise.all([requestResult(visitsRequest), requestResult(coverageRequest)]);
    return {
      visits: (visits as StoredVisit[]).filter(visit => visit.startedAt < end),
      coverage: (coverage as Coverage[]).filter(interval => interval.startTs < end),
    };
  });
}

export function recoverVisits(alive: ReadonlySet<string>, now = Date.now()): Promise<void> {
  return runTransaction(['visits'], 'readwrite', async transaction => {
    const visits = transaction.objectStore('visits');
    const open = await requestResult(visits.index('by_status').getAll('open')) as StoredVisit[];
    for (const visit of open) {
      const abandoned = now - visit.receivedAt > RECOVERY_GRACE_MS && !alive.has(visit.id);
      if (abandoned) {
        visits.put({ ...visit, status: 'interrupted' });
      }
    }
  });
}

export function rebuildRollups(): Promise<void> {
  return runTransaction(['visits', 'trackingMeta', 'rollups'], 'readwrite', async transaction => {
    const metadata = transaction.objectStore('trackingMeta');
    const keys = await requestResult(metadata.getAllKeys());
    for (const key of keys) {
      if (typeof key !== 'string' || !key.startsWith('dirty:')) {
        continue;
      }
      const date = key.slice(6);
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const visitsIndex = transaction.objectStore('visits').index('by_end');
      const visitsRequest = visitsIndex.getAll(IDBKeyRange.lowerBound(start.getTime()));
      const visits = await requestResult<StoredVisit[]>(visitsRequest);
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
