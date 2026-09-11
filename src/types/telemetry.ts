import { QUICK_SKIP_MS } from '../config/tracking';
import type { Platform } from './models';

export type Lens = 'trajectory' | 'circadian' | 'survival' | 'gravity' | 'neuro';
export type TimeRange = 'day' | '7d' | '30d';
export type Daypart = 'MORNING' | 'AFTERNOON' | 'PRIME' | 'GRAVEYARD';

export interface TelemetryEvent {
  platform: Platform;
  /** ms epoch of reel start */
  ts: number;
  /** active watched ms */
  durationMs: number;
  /** total reel length when readable; null = unmeasured */
  videoDurationMs: number | null;
  skipped: boolean;
}

export interface DayRollup {
  /** local YYYY-MM-DD */
  date: string;
  platform: Platform;
  reelCount: number;
  skipCount: number;
  totalActiveMs: number;
}

export const LENSES: { id: Lens; index: string; label: string }[] = [
  { id: 'trajectory', index: '1', label: 'Macro Trajectory' },
  { id: 'circadian', index: '2', label: 'Circadian Clock' },
  { id: 'survival', index: '3', label: 'Survival Decay' },
  { id: 'gravity', index: '4', label: 'Session Gravity' },
  { id: 'neuro', index: '5', label: 'Dual-State Neuro' },
];

export const DAYPARTS: { id: Daypart; label: string; range: string }[] = [
  { id: 'MORNING', label: 'Morning', range: '06:00-12:00' },
  { id: 'AFTERNOON', label: 'Afternoon', range: '12:00-18:00' },
  { id: 'PRIME', label: 'Prime', range: '18:00-23:00' },
  { id: 'GRAVEYARD', label: 'Graveyard', range: '23:00-06:00' },
];

export interface DurationBucketSpec {
  readonly label: string;
  readonly lower: number;
  readonly upper: number;
}

export const DURATION_BUCKETS: readonly DurationBucketSpec[] = [
  { label: '<3s', lower: 0, upper: QUICK_SKIP_MS },
  { label: '3–10s', lower: QUICK_SKIP_MS, upper: 10_000 },
  { label: '10–30s', lower: 10_000, upper: 30_000 },
  { label: '30–60s', lower: 30_000, upper: 60_000 },
  { label: '>60s', lower: 60_000, upper: Infinity },
] as const;

export interface SessionBucketSpec {
  readonly label: string;
  readonly lower: number;
  readonly upper: number;
}

export const SESSION_BUCKETS: readonly SessionBucketSpec[] = [
  { label: '<1m', lower: 0, upper: 60_000 },
  { label: '1–3m', lower: 60_000, upper: 180_000 },
  { label: '3–5m', lower: 180_000, upper: 300_000 },
  { label: '5–10m', lower: 300_000, upper: 600_000 },
  { label: '10–20m', lower: 600_000, upper: 1_200_000 },
  { label: '>20m', lower: 1_200_000, upper: Infinity },
] as const;
