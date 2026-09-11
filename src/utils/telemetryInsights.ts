import type {
  ObservationCoverage,
  ObservationSession,
  PreviewObservation,
  RankedRecurringWindow,
  TelemetryPage,
  SessionReturn,
  ReturnRate,
} from '../types/telemetryPreview';
import { localDateKey } from './time';
import { minuteOfDay, observationTotals, recurringWindows } from './telemetryPreview';

export type { SessionReturn, ReturnRate };


export function sessionConcentration(sessions: readonly ObservationSession[]) {
  const ranked = sessions.map(session => ({ session, activeMs: observationTotals(session.events).activeMs }))
    .sort((a, b) => b.activeMs - a.activeMs || a.session.startTs - b.session.startTs);
  const totalActiveMs = ranked.reduce((sum, item) => sum + item.activeMs, 0);
  let cumulativeMs = 0;
  const top = ranked.slice(0, 5).map(item => {
    cumulativeMs += item.activeMs;
    return { ...item, sharePct: totalActiveMs ? item.activeMs / totalActiveMs * 100 : null,
      cumulativePct: totalActiveMs ? cumulativeMs / totalActiveMs * 100 : null };
  });
  return { top, totalActiveMs, sessionCount: sessions.length, topSharePct: top.at(-1)?.cumulativePct ?? null };
}

/** A missing interval cannot be interpreted as time away from reels. */
export function hasObservationCoverage(coverage: readonly ObservationCoverage[], start: number, end: number): boolean {
  let coveredUntil = start;
  for (const interval of [...coverage].sort((a, b) => a.startTs - b.startTs)) {
    if (interval.endTs <= coveredUntil) continue;
    if (interval.startTs > coveredUntil) return false;
    coveredUntil = interval.endTs;
    if (coveredUntil >= end) return true;
  }
  return false;
}


export function sessionReturnRates(fullSessions: readonly ObservationSession[], selectedSessions: readonly ObservationSession[], coverage: readonly ObservationCoverage[], page: TelemetryPage): ReturnRate[] {
  const originIds = new Set(selectedSessions.map(session => session.id));
  const candidates = [...fullSessions].filter(session => page === 'overview' || session.events.some(event => event.platform === page))
    .sort((a, b) => a.startTs - b.startTs);
  const pairs = candidates.flatMap((origin, index) => originIds.has(origin.id) ? [{ origin, next: candidates[index + 1] }] : []);
  return [5, 15, 30].map(minutes => {
    const horizonMs = minutes * 60_000;
    const eligible = pairs.filter(pair => hasObservationCoverage(coverage, pair.origin.endTs, pair.origin.endTs + horizonMs));
    const matches = eligible.flatMap(({ origin, next }) => next && next.startTs >= origin.endTs && next.startTs - origin.endTs <= horizonMs
      ? [{ origin, next, gapMs: next.startTs - origin.endTs }] : []);
    return { minutes, eligibleCount: eligible.length, returnedCount: matches.length,
      percentage: eligible.length ? matches.length / eligible.length * 100 : null, matches };
  });
}

export function rankedRecurringWindows(events: readonly PreviewObservation[], completeDates: readonly string[]): RankedRecurringWindow[] {
  const eligibleDates = new Set(completeDates);
  const completedEvents = events.filter(event => eligibleDates.has(localDateKey(new Date(event.ts))));
  const denominatorMs = observationTotals(completedEvents).activeMs;
  return recurringWindows(completedEvents, completeDates).map(window => {
    const totalActiveMs = observationTotals(completedEvents.filter(event => minuteOfDay(event.ts) >= window.startMinute && minuteOfDay(event.ts) < window.endMinute)).activeMs;
    return { ...window, totalActiveMs, sharePct: denominatorMs ? totalActiveMs / denominatorMs * 100 : null };
  }).sort((a, b) => b.totalActiveMs - a.totalActiveMs || a.startMinute - b.startMinute);
}
