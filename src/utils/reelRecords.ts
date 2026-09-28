// Types & Models
import type { Platform } from '../types/models';
import type {
  PreviewObservation,
  RecordFilters,
  RecordSort,
} from '../types/telemetryPreview';

// Tokens & Meta
import { QUICK_SKIP_MS } from '../config/tracking';

// Utilities & Helpers
import { localDateKey } from './time';

export type { RecordFilters, RecordSort };

/** Visit numbers within the selected records; unknown reel IDs stay unclassified. */
export function repeatVisitNumbers(events: readonly PreviewObservation[]): Map<string, number> {
  const numbers = new Map<string, number>();
  const seen = new Map<string, number>();
  const chronological = [...events].filter(event => event.countInScope !== false)
    .sort((first, second) => first.ts - second.ts || first.id.localeCompare(second.id));
  for (const event of chronological) {
    if (!event.reelId) {
      continue;
    }
    const content = `${event.platform}:${event.reelId}`;
    const visitNumber = (seen.get(content) ?? 0) + 1;
    seen.set(content, visitNumber);
    numbers.set(event.id, visitNumber);
  }
  return numbers;
}

export function filterReelRecords(events: readonly PreviewObservation[], filters: RecordFilters, sort: RecordSort, descending: boolean) {
  const value = (event: PreviewObservation) => sort === 'started' ? event.ts : sort === 'active' ? event.durationMs : event.endedTs - event.ts;
  return events.filter(event => {
    if (!filters.platforms.includes(event.platform) || (filters.quickSkips && (event.status ? !event.skipped : event.durationMs >= QUICK_SKIP_MS))) return false;
    const date = localDateKey(new Date(event.ts));
    return (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to);
  }).sort((a, b) => (value(a) - value(b)) * (descending ? -1 : 1) || a.ts - b.ts || a.id.localeCompare(b.id));
}
export function recordPage<T>(rows: readonly T[], requestedPage: number, size: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.max(0, Math.min(requestedPage, pageCount - 1));
  return { page, pageCount, total: rows.length, start: rows.length ? page * size + 1 : 0, end: Math.min((page + 1) * size, rows.length), rows: rows.slice(page * size, (page + 1) * size) };
}
