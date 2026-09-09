import { clipObservations } from '../tracking/measurements';
import type { ObservationSession, PreviewObservation, RecurringWindow } from '../types/telemetryPreview';
import { localDateKey } from './time';
import { minuteOfDay, shiftDate, startOfDay } from './telemetryPreview';

export const DURATION_BUCKETS = [
  { label: '<3s', lower: 0, upper: 3000 },
  { label: '3–<10s', lower: 3000, upper: 10000 },
  { label: '10–<30s', lower: 10000, upper: 30000 },
  { label: '30–<60s', lower: 30000, upper: 60000 },
  { label: '≥60s', lower: 60000, upper: Infinity },
];
export type Evidence = { kind: 'sessionBucket'; index: number } | { kind: 'window'; window: RecurringWindow } | { kind: 'day'; date: string; hour?: number } |
  { kind: 'session'; id: string; unfiltered?: boolean } | { kind: 'bucket'; index: number } |
  { kind: 'returns'; minutes: number } | { kind: 'curve' };
export interface EvidenceState { context: string; stack: Evidence[] }
export const SESSION_BUCKETS = [
  { label: '<1m', lower: 0, upper: 60000 }, { label: '1–<3m', lower: 60000, upper: 180000 },
  { label: '3–<5m', lower: 180000, upper: 300000 }, { label: '5–<10m', lower: 300000, upper: 600000 },
  { label: '10–<20m', lower: 600000, upper: 1200000 }, { label: '≥20m', lower: 1200000, upper: Infinity },
];
export function sessionDistribution(sessions: readonly ObservationSession[]) {
  const buckets = SESSION_BUCKETS.map(bucket => ({ ...bucket, sessions: [] as ObservationSession[], activeMs: 0 }));
  for (const session of sessions) {
    const activeMs = session.events.reduce((sum, event) => sum + event.durationMs, 0);
    const bucket = buckets.find(bucket => activeMs >= bucket.lower && activeMs < bucket.upper);
    if (bucket) { bucket.sessions.push(session); bucket.activeMs += activeMs; }
  }
  return buckets;
}
export type EvidenceAction = { type: 'open'; context: string; evidence: Evidence } |
  { type: 'push'; context: string; evidence: Evidence } | { type: 'back' } | { type: 'close' };
export function evidenceReducer(state: EvidenceState, action: EvidenceAction): EvidenceState {
  switch (action.type) {
    case 'open': return { context: action.context, stack: [action.evidence] };
    case 'push': return { context: action.context, stack: [...(state.context === action.context ? state.stack : []), action.evidence] };
    case 'back': return { ...state, stack: state.stack.slice(0, -1) };
    case 'close': return { ...state, stack: [] };
  }
}
export function activeEvidence(state: EvidenceState, context: string) { return state.context === context ? state.stack.at(-1) : undefined; }
export function evidenceEvents(events: readonly PreviewObservation[], evidence: Evidence) {
  if(evidence.kind === 'day') {
    const start=new Date(evidence.date+'T00:00:00'); if(evidence.hour!==undefined)start.setHours(evidence.hour);
    const end=new Date(start); if(evidence.hour!==undefined)end.setHours(end.getHours()+1);else end.setDate(end.getDate()+1);
    return clipObservations(events,start.getTime(),end.getTime());
  }
  if(evidence.kind === 'window' && events.some(e=>e.activeIntervals)) return evidence.window.matchingDates.flatMap(date=>{
    const start=new Date(date+'T00:00:00'),end=new Date(start);start.setMinutes(evidence.window.startMinute);end.setMinutes(evidence.window.endMinute);
    return clipObservations(events,start.getTime(),end.getTime());
  });
  const windowDates = new Set(evidence.kind === 'window' ? evidence.window.matchingDates : []);
  return events.filter(event => {
    if (evidence.kind === 'window') return windowDates.has(localDateKey(new Date(event.ts))) && minuteOfDay(event.ts) >= evidence.window.startMinute && minuteOfDay(event.ts) < evidence.window.endMinute;
    if (evidence.kind === 'bucket') { const bucket = DURATION_BUCKETS[evidence.index]; return bucket !== undefined && event.durationMs >= bucket.lower && event.durationMs < bucket.upper; }
    return true;
  });
}

/** Split display spans at calendar boundaries; active totals retain start-date attribution. */
export function evidenceTimeline(sessions: readonly ObservationSession[], events: readonly PreviewObservation[], window?: RecurringWindow) {
  const dates = new Set<string>();
  for (const session of sessions) {
    for (let day = startOfDay(new Date(session.startTs)); day.getTime() < session.endTs; day = shiftDate(day, 1)) dates.add(localDateKey(day));
  }
  for (const event of events) dates.add(localDateKey(new Date(event.ts)));
  return [...dates].sort().flatMap(date => {
    if (window && !window.matchingDates.includes(date)) return [];
    const day = new Date(`${date}T00:00:00`);
    const start = new Date(day); start.setMinutes(window?.startMinute ?? 0);
    const end = window ? new Date(day) : shiftDate(day, 1);
    if (window) end.setMinutes(window.endMinute);
    const startTs = start.getTime(), endTs = end.getTime();
    const spans = sessions.filter(session => session.endTs > startTs && session.startTs < endTs).map(session => ({
      session, startTs: Math.max(startTs, session.startTs), endTs: Math.min(endTs, session.endTs),
      clippedStart: session.startTs < startTs, clippedEnd: session.endTs > endTs,
    }));
    const activeMs = clipObservations(events,startTs,endTs).reduce((sum, event) => sum + event.durationMs, 0);
    return [{ date, startTs, endTs, spans, activeMs }];
  });
}

export interface DetailSelection { id: string | null; unfiltered: boolean; records: boolean }
export function detailReducer(state: DetailSelection, action: { type: 'select'; id: string; unfiltered?: boolean } | { type: 'records' } | { type: 'back' }): DetailSelection {
  if (action.type === 'select') return { id: action.id, unfiltered: action.unfiltered ?? false, records: false };
  if (action.type === 'records') return state.id ? { ...state, records: true } : state;
  return { ...state, records: false };
}
