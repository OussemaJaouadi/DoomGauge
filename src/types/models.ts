export const PLATFORMS = ['youtube', 'instagram', 'facebook'] as const;
export type Platform = typeof PLATFORMS[number];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Day = typeof DAYS[number];

export interface HourItem {
  hour: number;
  label: string;
  youtube: number;
  instagram: number;
  facebook: number;
  total: number;
}

export interface Interval {
  start: number;
  end: number;
  peakHour: number;
  peakValue: number;
  total: number;
}

export interface PeakRange {
  start: number;
  end: number;
  peakHour: number;
  peakValue: number;
  total: number;
}

export interface ValleyRange {
  start: number;
  end: number;
}

export type ChartMode = 'time' | 'count';

export interface ChartItem {
  platform: Platform;
  label: string;
  timeMs: number;
  count: number;
  color: string;
}

export interface PlatformStats {
  completedCount?: number;
  count: number;
  timeMs: number;
  skip: number;
  avgFlick: number;
  velocity: string;
  share: number;
  earlyExit: string;
  hourly: number[];
}
