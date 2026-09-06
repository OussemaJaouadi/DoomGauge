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
