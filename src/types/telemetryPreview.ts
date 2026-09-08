import type { Platform } from './models';
import type { TelemetryEvent, TimeRange, Daypart } from './telemetry';

export type TelemetryPage = 'overview' | Platform;
export type TelemetryTab = 'patterns' | 'sessions' | 'viewing';
export type WorkspaceView = 'windows' | 'trends' | 'sessions' | 'viewing';
export type TelemetryMetric = 'time' | 'reels';
export type DaypartFilter = 'all' | Daypart | readonly Daypart[];
export interface ObservationCoverage { startTs: number; endTs: number }
export interface PreviewObservation extends TelemetryEvent {
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
