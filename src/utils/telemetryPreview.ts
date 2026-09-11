import { clipObservations } from './trackingMeasurements';
import { PLATFORMS } from '../types/models';
import type { Platform } from '../types/models';
import type { TimeRange, DayRollup } from '../types/telemetry';
import type { DaypartFilter, ObservationSession, PreviewObservation, RecurringWindow, TelemetryPage } from '../types/telemetryPreview';
import { daypartOfHour, quantile } from './telemetry';
import { localDateKey } from './time';

export const RANGE_LENGTH: Record<TimeRange, number> = { day: 1, '7d': 7, '30d': 30 };
export function shiftDate(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
export function periodBounds(endDate: Date, range: TimeRange, now: Date) {
  const endDay = startOfDay(endDate);
  const isToday = localDateKey(endDate) === localDateKey(now);
  const cutoff = isToday ? new Date(now) : shiftDate(endDay, 1);
  const start = shiftDate(endDay, 1 - RANGE_LENGTH[range]);
  const dates = Array.from({ length: RANGE_LENGTH[range] }, (_, i) => localDateKey(shiftDate(start, i)));
  const previousStart = shiftDate(start, -RANGE_LENGTH[range]);
  const previousEndDay = shiftDate(endDay, -RANGE_LENGTH[range]);
  const previousCutoff = isToday
    ? new Date(previousEndDay.getFullYear(), previousEndDay.getMonth(), previousEndDay.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
    : shiftDate(previousEndDay, 1);
  return { start, cutoff, dates, previousStart, previousCutoff, completeDates: isToday ? dates.slice(0, -1) : dates };
}

export function selectObservations(events: readonly PreviewObservation[], start: number, cutoff: number, page: TelemetryPage, daypart: DaypartFilter) {
  return clipObservations(events.filter(e=>e.activeIntervals || e.endedTs<=cutoff), start, cutoff, daypart).filter(e => page === 'overview' || e.platform === page);
}
export function observationTotals(events: readonly PreviewObservation[]) {
  const activeMs = events.reduce((sum, e) => sum + e.durationMs, 0);
  const skips = events.filter(e => e.skipped).length;
  const reels = events.filter(e => e.countInScope !== false).length;
  const completed = events.filter(e => e.countInScope !== false && (!e.status || e.status === 'completed')).length;
  return { activeMs, reels, completed, skips, skipPct: completed ? skips / completed * 100 : null,
    medianMs: quantile(events.map(e => e.durationMs), 0.5), averageMs: events.length ? activeMs / events.length : null };
}
export function observationRollups(events: readonly PreviewObservation[], dates: readonly string[]): DayRollup[] {
  return dates.flatMap(date => PLATFORMS.map(platform => {
    const totals = observationTotals(clipObservations(events, new Date(`${date}T00:00:00`).getTime(), shiftDate(new Date(`${date}T00:00:00`), 1).getTime()).filter(e => e.platform === platform));
    return { date, platform, reelCount: totals.reels, skipCount: totals.skips, totalActiveMs: totals.activeMs };
  }));
}

/** Extract once from the full chronological record, before any presentation filters. */
export function observationSessions(events: readonly PreviewObservation[]): ObservationSession[] {
  const sessions: ObservationSession[] = [];
  for (const e of [...events].sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id))) {
    const current = sessions[sessions.length - 1];
    if (!current || e.ts - current.endTs > 60_000) {
      sessions.push({ id: e.id, startTs: e.ts, endTs: e.endedTs, events: [e] });
    } else {
      current.endTs = Math.max(current.endTs, e.endedTs);
      current.events.push(e);
    }
  }
  return sessions;
}
export function scopedSessions(sessions: readonly ObservationSession[], events: readonly PreviewObservation[]) {
  const ids = new Set(events.map(e => e.id));
  return sessions.map(session => ({ ...session, events: session.events.filter(e => ids.has(e.id)).map(e => events.find(selected => selected.id === e.id)!) })).filter(s => s.events.length > 0);
}
export function minuteOfDay(ts: number) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}
export function clockMinute(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(Math.floor(minute % 60)).padStart(2, '0')}`;
}
export function sessionClockRange(startTs: number, endTs: number) {
  const startDate = localDateKey(new Date(startTs));
  const endDate = localDateKey(new Date(endTs));
  const startTime = clockMinute(minuteOfDay(startTs));
  const endTime = clockMinute(minuteOfDay(endTs));
  return {
    startDate,
    endDate,
    startTime,
    endTime,
    clockLabel: `${startTime}–${endTime}`,
    dateLabel: startDate === endDate ? startDate : `${startDate} → ${endDate}`,
    overnight: startDate !== endDate,
  };
}
export function sessionsMatchingWindow(sessions: readonly ObservationSession[], window: RecurringWindow) {
  const dates = new Set(window.matchingDates);
  return sessions.filter(session => session.events.some(e =>
    dates.has(localDateKey(new Date(e.ts))) && minuteOfDay(e.ts) >= window.startMinute && minuteOfDay(e.ts) < window.endMinute));
}

/** Frequency is counted once per eligible day; quiet observed days stay in the denominator. */
export function recurringWindows(events: readonly PreviewObservation[], completeDates: readonly string[]): RecurringWindow[] {
  const eligible = new Set(completeDates);
  const completed = events.filter(e => eligible.has(localDateKey(new Date(e.ts))));
  const bins = Array.from({ length: 48 }, (_, i) => new Set(completed
    .filter(e => Math.floor(minuteOfDay(e.ts) / 30) === i).map(e => localDateKey(new Date(e.ts)))));
  const required = Math.max(3, Math.ceil(eligible.size * 0.3));
  const windows: RecurringWindow[] = [];
  for (let i = 0; i < bins.length; i++) {
    if (bins[i]!.size < required) continue;
    const startMinute = i * 30;
    while (i + 1 < bins.length && bins[i + 1]!.size >= required) i++;
    const endMinute = (i + 1) * 30;
    const matching = completed.filter(e => minuteOfDay(e.ts) >= startMinute && minuteOfDay(e.ts) < endMinute);
    const matchingDates = [...new Set(matching.map(e => localDateKey(new Date(e.ts))))].sort();
    const dailyTimes = matchingDates.map(date => observationTotals(matching.filter(e => localDateKey(new Date(e.ts)) === date)).activeMs);
    windows.push({ startMinute, endMinute, matchingDates, eligibleDays: eligible.size, medianActiveMs: quantile(dailyTimes, 0.5) ?? 0 });
  }
  return windows;
}

/** Empirical P(active duration >= t). No censoring or inferred video completion. */
export function durationCurve(events: readonly PreviewObservation[]) {
  const durations = events.map(e => e.durationMs).sort((a, b) => a - b);
  if (!durations.length) return [];
  const thresholds = [...new Set([0, ...durations])];
  let below = 0;
  return thresholds.map(ms => {
    while (below < durations.length && durations[below]! < ms) below++;
    return { seconds: ms / 1000, percent: (durations.length - below) / durations.length * 100 };
  });
}

export function mechanicsSummary(events: readonly PreviewObservation[]) {
  const entries = events.filter(e => e.entryRoute !== undefined);
  const replays = events.filter(e => e.replayCount !== undefined);
  const comments = events.filter(e => e.commentOpenMs !== undefined);
  return {
    entries: (['Reels feed', 'Home feed', 'Direct link'] as const).map(route => ({ route, count: entries.filter(e => e.entryRoute === route).length })),
    entryMeasured: entries.length,
    replayMeasured: replays.length,
    replayCount: replays.length ? replays.reduce((sum, e) => sum + e.replayCount!, 0) : null,
    commentMeasured: comments.length,
    commentMs: comments.length ? comments.reduce((sum, e) => sum + e.commentOpenMs!, 0) : null,
  };
}

export function platformTotals(events: readonly PreviewObservation[]) {
  return PLATFORMS.map(platform => ({ platform, ...observationTotals(events.filter(e => e.platform === platform)) }));
}

export interface TrajectoryRow { label: string; youtube: number; instagram: number; facebook: number; previous: number }
export function trajectoryRows(events: readonly PreviewObservation[], previous: readonly PreviewObservation[], dates: readonly string[], previousDates: readonly string[], hourly: boolean, metric: 'time' | 'reels', throughHour = 23): TrajectoryRow[] {
  const sum = (items: readonly PreviewObservation[]) => metric === 'time' ? observationTotals(items).activeMs / 60_000 : observationTotals(items).reels;
  return Array.from({ length: hourly ? Math.max(0, Math.min(24, throughHour + 1)) : dates.length }, (_, i) => {
    const scoped = (items: readonly PreviewObservation[], keys: readonly string[]) => {
      const start = new Date(`${keys[hourly ? 0 : i]}T00:00:00`);
      if (hourly) start.setHours(i);
      const end = new Date(start); if (hourly) end.setHours(end.getHours()+1); else end.setDate(end.getDate()+1);
      return clipObservations(items, start.getTime(), end.getTime());
    };
    const current = scoped(events, dates);
    const row = { label: hourly ? clockMinute(i * 60) : dates[i]!.slice(5), previous: sum(scoped(previous, previousDates)) } as TrajectoryRow;
    for (const platform of PLATFORMS) row[platform] = sum(current.filter(e => e.platform === platform));
    return row;
  });
}
