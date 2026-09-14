// Types & Models
import type { Visit } from '../types/tracking';

// Utilities & Helpers
import { localDateKey } from './time';

export function affectedDates(visit: Visit): Set<string> {
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
