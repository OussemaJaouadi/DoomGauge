// Types & Models
import type { DayKey } from '../types/storage';

// Tokens & Meta
import { DAY_MS, MAX_INDEXED_DAYS, SPANNING_DAY_KEY } from '../config/storage';

/** UTC buckets index elapsed spans, independent of the display timezone. */
export function rangeDays(start: number, end: number): DayKey[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new Error('Cannot index a record with invalid timestamps');
  }
  const first = Math.floor(start / DAY_MS);
  const last = Math.floor(end / DAY_MS);
  if (last - first >= MAX_INDEXED_DAYS) {
    return [SPANNING_DAY_KEY];
  }
  const days: DayKey[] = [];
  for (let day = first; day <= last; day += 1) {
    days.push(day);
  }
  return days;
}
