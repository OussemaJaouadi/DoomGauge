import type { Platform } from './models';
import type { TelemetryEvent, TimeRange, Daypart } from './telemetry';

export type TelemetryPage = 'overview' | Platform;
export type TelemetryTab = 'patterns' | 'sessions' | 'viewing';
export type WorkspaceView = 'windows' | 'trends' | 'sessions' | 'viewing';
export type TelemetryMetric = 'time' | 'reels';
export type DaypartFilter = 'all' | Daypart | readonly Daypart[];
export interface ObservationCoverage { startTs: number; endTs: number }
export interface PreviewObservation extends TelemetryEvent {
  status?: 'open' | 'completed' | 'interrupted';
  activeIntervals?: { start: number; end: number }[];
  countInScope?: boolean;
  id: string;
  endedTs: number;
  entryRoute?: 'Reels feed' | 'Direct link' | 'Home feed';
  replayCount?: number;
  commentOpenMs?: number;
}
export interface ObservationSession {
  id: string;
  startTs: number;
  endTs: number;
  events: PreviewObservation[];
}
export interface PageSelection {
  range: TimeRange;
  endDate: Date;
  view: WorkspaceView;
}
export interface RecurringWindow {
  startMinute: number;
  endMinute: number;
  matchingDates: string[];
  eligibleDays: number;
  medianActiveMs: number;
}
export interface RankedRecurringWindow extends RecurringWindow {
  totalActiveMs: number;
  sharePct: number | null;
}

export type Evidence =
  | { kind: 'sessionBucket'; index: number }
  | { kind: 'window'; window: RecurringWindow }
  | { kind: 'day'; date: string; hour?: number }
  | { kind: 'session'; id: string; unfiltered?: boolean }
  | { kind: 'bucket'; index: number }
  | { kind: 'returns'; minutes: number }
  | { kind: 'curve' };

export interface EvidenceState {
  context: string;
  stack: Evidence[];
}

export type EvidenceAction =
  | { type: 'open'; context: string; evidence: Evidence }
  | { type: 'push'; context: string; evidence: Evidence }
  | { type: 'back' }
  | { type: 'close' };

export interface SessionReturn {
  origin: ObservationSession;
  next: ObservationSession;
  gapMs: number;
}

export interface ReturnRate {
  minutes: number;
  eligibleCount: number;
  returnedCount: number;
  percentage: number | null;
  matches: SessionReturn[];
}

export type RecordSort = 'started' | 'active' | 'elapsed';

export interface RecordFilters {
  platforms: readonly Platform[];
  quickSkips: boolean;
  from: string;
  to: string;
}

