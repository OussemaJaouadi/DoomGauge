import type { Platform } from './models';

export type UIState = 'loading' | 'success' | 'empty' | 'error';
export type Tab = 'today' | 'signals' | 'hourly';
export type View = { kind: 'tabs'; tab: Tab } | { kind: 'platform'; platform: Platform };

/** Preview-only observations; does not change the production event protocol. */
export interface PopupMockView {
  completed?: boolean;
  skipped?: boolean;
  countInScope?: boolean;
  id: string;
  platform: Platform;
  startedAt: number;
  endedAt: number;
  activeMs: number;
  videoDurationMs?: number;
}

export interface PopupActivitySession {
  id: string;
  startedAt: number;
  endedAt: number;
  activeMs: number;
  reelCount: number;
  platforms: Platform[];
}

export interface TemporalVortex {
  startTime: string;
  endTime: string;
  activeMs: number;
  elapsedMs: number;
  gapMs: number;
  reelCount: number;
  platforms: Platform[];
}

export interface TemporalDaySummary {
  sessionCount: number;
  totalActiveMs: number;
  totalElapsedMs: number;
  avgSessionActiveMs: number;
  concentrationPct: number;
  activeConcentrationPct: number;
  worstReelCount: number;
  totalReelCount: number;
}

export interface TemporalInsights {
  worstVortex: TemporalVortex | null;
  daySummary: TemporalDaySummary;
}

export interface ViewingDistributionBucket {
  label: string;
  upperMs: number;
  count: number;
  activeMs: number;
  countPct: number;
  timePct: number;
}

export interface ViewingDistribution {
  totalCount: number;
  totalMs: number;
  medianMs: number | null;
  buckets: ViewingDistributionBucket[];
}
