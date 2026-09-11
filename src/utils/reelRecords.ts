import { QUICK_SKIP_MS } from '../config/tracking';
import type { Platform } from '../types/models';
import type { PreviewObservation } from '../types/telemetryPreview';
import { localDateKey } from './time';

export type RecordSort = 'started' | 'active' | 'elapsed';
export interface RecordFilters {
  platforms: readonly Platform[];
  quickSkips: boolean;
  from: string;
  to: string;
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
