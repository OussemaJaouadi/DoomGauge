import type { ObservationCoverage, ObservationSession, PreviewObservation, RecurringWindow } from '../types/telemetryPreview';
import { hasObservationCoverage } from './telemetryInsights';
import { shiftDate } from './telemetryPreview';
import { localDateKey } from './time';

export function calendarEvidence(dates: readonly string[], events: readonly PreviewObservation[], sessions: readonly ObservationSession[], coverage: readonly ObservationCoverage[], window?: RecurringWindow) {
  return [...dates].sort().map(date => {
    const start = new Date(`${date}T00:00:00`), end = shiftDate(start, 1);
    if (window) { start.setMinutes(window.startMinute); end.setTime(new Date(`${date}T00:00:00`).getTime()); end.setMinutes(window.endMinute); }
    const startTs = start.getTime(), endTs = end.getTime();
    const selected = events.filter(event => localDateKey(new Date(event.ts)) === date);
    const ids = new Set(selected.map(event => event.id));
    const matching = sessions.filter(session => session.startTs < endTs && session.endTs > startTs);
    const contribution = (session: ObservationSession) => session.events.reduce((sum, event) => sum + (ids.has(event.id) ? event.durationMs : 0), 0);
    const ranked = [...matching].sort((a, b) => contribution(b) - contribution(a) || b.startTs - a.startTs || a.id.localeCompare(b.id));
    const status = hasObservationCoverage(coverage, startTs, endTs) ? 'complete' : selected.length || coverage.some(interval => interval.startTs < endTs && interval.endTs > startTs) ? 'partial' : 'unobserved';
    return { date, events: selected, sessions: matching, activeMs: selected.reduce((sum, event) => sum + event.durationMs, 0), reels: selected.length, status, defaultSessionId: ranked[0]?.id ?? null };
  });
}
export interface CalendarSelection { date: string; id: string | null; records: boolean }
export type CalendarAction = { type: 'date'; date: string; id: string | null } | { type: 'session'; id: string } | { type: 'records' } | { type: 'back' };
export function calendarSelection(state: CalendarSelection, action: CalendarAction): CalendarSelection {
  if (action.type === 'date') return { date: action.date, id: action.id, records: false };
  if (action.type === 'session') return { ...state, id: action.id, records: false };
  return { ...state, records: action.type === 'records' && state.id !== null };
}
export function initialCalendarSelection(days: ReturnType<typeof calendarEvidence>): CalendarSelection {
  const day = days.findLast(item => item.reels > 0) ?? days.at(-1);
  return { date: day?.date ?? '', id: day?.defaultSessionId ?? null, records: false };
}
