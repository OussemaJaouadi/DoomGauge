import type { PreviewObservation as Observation, DaypartFilter } from '../types/telemetryPreview';
import { daypartOfHour } from './telemetry';
import { intervalMs, isQuickSkip } from './tracking';
import type { Visit } from '../types/tracking';

export function toObservation(visit: Visit): Observation {
  return {
    id: visit.id, platform: visit.platform, ts: visit.startedAt, endedTs: visit.observedAt,
    durationMs: visit.activeMs, videoDurationMs: visit.videoDurationMs ?? null,
    skipped: isQuickSkip(visit), status: visit.status,
    activeIntervals: visit.intervals, countInScope: true,
  };
}

function matchesHour(timestamp: number, hours: DaypartFilter) {
  if (hours === 'all') return true;
  const daypart = daypartOfHour(new Date(timestamp).getHours());
  return typeof hours === 'string' ? hours === daypart : hours.includes(daypart);
}

/** Clip active time while retaining visit identity and the original start. */
export function clipObservation(
  event: Observation, start: number, end: number, hours: DaypartFilter = 'all',
): Observation | undefined {
  const counted = event.countInScope !== false && event.ts >= start && event.ts < end && matchesHour(event.ts, hours);
  if (!event.activeIntervals) return counted ? event : undefined;
  const intervals: NonNullable<Observation['activeIntervals']> = [];
  for (const interval of event.activeIntervals) {
    let cursor = Math.max(start, interval.start);
    const stop = Math.min(end, interval.end);
    while (cursor < stop) {
      const nextHour = new Date(cursor);
      nextHour.setMinutes(60, 0, 0);
      const boundary = Math.min(stop, Math.max(cursor + 1, nextHour.getTime()));
      if (matchesHour(cursor, hours)) intervals.push({ start: cursor, end: boundary });
      cursor = boundary;
    }
  }
  if (!counted && !intervals.length) return undefined;
  return {
    ...event, activeIntervals: intervals, durationMs: intervalMs(intervals), countInScope: counted,
    status: event.endedTs > end ? 'open' : event.status,
    skipped: counted && event.endedTs <= end && event.skipped,
  };
}

export function clipObservations(
  events: readonly Observation[], start: number, end: number, hours: DaypartFilter = 'all',
) {
  return events.flatMap(event => {
    const scoped = clipObservation(event, start, end, hours);
    return scoped ? [scoped] : [];
  });
}
