// Pure telemetry math for Surface B lenses (v1 mock phase).
// No side effects — covered by src/__tests__/telemetry.test.ts.

import type { Daypart, TelemetryEvent } from '../types/telemetry';

/** Canonical daypart bins (spec R7 AC2/AC5). */
export function daypartOfHour(hour: number): Daypart {
  if (hour >= 6 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 18) return 'AFTERNOON';
  if (hour >= 18 && hour < 23) return 'PRIME';
  return 'GRAVEYARD';
}

export interface DaypartBin {
  reels: number;
  activeMs: number;
}

/** Aggregate events into the 4 canonical dayparts (local hour of ts). */
export function binDayparts(events: TelemetryEvent[]): Record<Daypart, DaypartBin> {
  const bins: Record<Daypart, DaypartBin> = {
    MORNING: { reels: 0, activeMs: 0 },
    AFTERNOON: { reels: 0, activeMs: 0 },
    PRIME: { reels: 0, activeMs: 0 },
    GRAVEYARD: { reels: 0, activeMs: 0 },
  };
  for (const e of events) {
    const bin = bins[daypartOfHour(new Date(e.ts).getHours())];
    bin.reels++;
    bin.activeMs += e.durationMs;
  }
  return bins;
}

/** 24-bin reel counts per day row (oldest → newest), derived from events. */
export function hourlyMatrix(events: TelemetryEvent[], days: number, endDate: Date): number[][] {
  const rows: number[][] = Array.from({ length: days }, () => new Array(24).fill(0));
  const start = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  const startDay = start.getTime() - (days - 1) * 86400000;
  for (const e of events) {
    const dayIdx = Math.floor((e.ts - startDay) / 86400000);
    if (dayIdx < 0 || dayIdx >= days) continue;
    const row = rows[dayIdx];
    if (!row) continue;
    const h = new Date(e.ts).getHours();
    row[h] = (row[h] ?? 0) + 1;
  }
  return rows;
}

/** Gaps (seconds) between consecutive reel watches. */
export function interArrivalGaps(events: TelemetryEvent[]): number[] {
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    gaps.push(Math.max(0, (sorted[i]!.ts - (prev.ts + prev.durationMs)) / 1000));
  }
  return gaps;
}

/** Fano factor of gaps: ≈1 memoryless, ≫1 bursty doom loop. Null when empty. */
export function fanoFactor(gaps: number[]): number | null {
  if (gaps.length === 0) return null;
  const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  if (mean <= 0) return null;
  const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length;
  return variance / mean;
}

export interface RunawaySession {
  startTs: number;
  spanMin: number;
  reels: number;
  /** minutes past the 15-minute horizon */
  overrunMin: number;
  /** platform of the first reel = gateway */
  gateway: TelemetryEvent['platform'];
}

export interface WatchSession {
  startTs: number;
  endTs: number;
  events: TelemetryEvent[];
}

/** Split events into sessions on idle gaps ≥ idleMin (single home for sessionization). */
export function splitSessions(events: TelemetryEvent[], idleMin = 45): WatchSession[] {
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  const out: WatchSession[] = [];
  let run: TelemetryEvent[] = [];
  const flush = () => {
    if (run.length === 0) return;
    out.push({
      startTs: run[0]!.ts,
      endTs: run[run.length - 1]!.ts + run[run.length - 1]!.durationMs,
      events: run,
    });
    run = [];
  };
  for (const e of sorted) {
    const prev = run[run.length - 1];
    if (prev && (e.ts - (prev.ts + prev.durationMs)) / 60000 >= idleMin) flush();
    run.push(e);
  }
  flush();
  return out;
}

/** Velocity (reels/active-min), skip rate, and mean dwell of one session. */
export function sessionStats(s: WatchSession): { velocity: number; skipRate: number; dwellSec: number } {
  const activeMin = Math.max((s.endTs - s.startTs) / 60000, 1 / 60);
  const skipRate = s.events.filter((e) => e.skipped).length / s.events.length;
  const dwellSec = s.events.reduce((sum, e) => sum + e.durationMs, 0) / s.events.length / 1000;
  return { velocity: s.events.length / activeMin, skipRate, dwellSec };
}

/**
 * Cold-start runaways: session opened after idle gap ≥ idleMin
 * exceeding minLenMin continuous watch (no intent signal needed).
 */
export function findRunaways(
  events: TelemetryEvent[],
  idleMin = 45,
  minLenMin = 15,
): RunawaySession[] {
  const out: RunawaySession[] = [];
  for (const s of splitSessions(events, idleMin)) {
    const spanMin = (s.endTs - s.startTs) / 60000;
    if (spanMin > minLenMin) {
      out.push({
        startTs: s.startTs,
        spanMin: Math.round(spanMin * 10) / 10,
        reels: s.events.length,
        overrunMin: Math.round((spanMin - minLenMin) * 10) / 10,
        gateway: s.events[0]!.platform,
      });
    }
  }
  return out;
}

export interface SurvivalPoint {
  /** seconds */
  t: number;
  s: number;
}
export interface SurvivalCurve {
  points: SurvivalPoint[];
  /** first t with S(t) ≤ 0.30 (≥70% discarded) */
  tCliff: number | null;
  /** first t after cliff with S(t) ≤ 0.15 (retention flattened) */
  tLock: number | null;
}

/**
 * Kaplan-Meier attention survival over abandonment durations.
 * Skips (<3s) are events; completed watches are censored at their duration.
 */
export function kmCurve(events: TelemetryEvent[]): SurvivalCurve {
  const durs = events.map((e) => e.durationMs / 1000).sort((a, b) => a - b);
  if (durs.length === 0) return { points: [], tCliff: null, tLock: null };
  const distinct = [...new Set(durs)].sort((a, b) => a - b);
  let s = 1;
  const points: SurvivalPoint[] = [{ t: 0, s: 1 }];
  let tCliff: number | null = null;
  let tLock: number | null = null;
  for (const t of distinct) {
    const atRisk = durs.filter((d) => d >= t).length;
    const abandoned = events.filter((e) => e.skipped && Math.abs(e.durationMs / 1000 - t) < 1e-9).length;
    if (atRisk > 0) s *= 1 - abandoned / atRisk;
    points.push({ t: Math.round(t * 10) / 10, s: Math.round(s * 1000) / 1000 });
    if (tCliff === null && s <= 0.3) tCliff = t;
    if (tCliff !== null && tLock === null && t > tCliff && s <= 0.15) tLock = t;
  }
  return { points, tCliff, tLock };
}

/** Skip-rate slope across 5-minute buckets of continuous sessions: reveals frustration acceleration. */
export function frustrationGradient(events: TelemetryEvent[]): number | null {
  const runaways = findRunaways(events, 45, 5);
  if (runaways.length === 0) return null;
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  let early = 0;
  let earlyN = 0;
  let late = 0;
  let lateN = 0;
  for (const r of runaways) {
    const mid = r.startTs + ((r.spanMin * 60000) / 2);
    for (const e of sorted) {
      if (e.ts < r.startTs || e.ts > r.startTs + r.spanMin * 60000) continue;
      if (e.ts < mid) {
        earlyN++;
        if (e.skipped) early++;
      } else {
        lateN++;
        if (e.skipped) late++;
      }
    }
  }
  if (earlyN === 0 || lateN === 0) return null;
  return earlyN > 0 ? (late / lateN - early / earlyN) * 100 : null;
}

/** p-quantile of values (linear interpolation). Null when empty. */
export function quantile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

/**
 * Dimensionless Compulsion Index = (skipRate × velocity) / baselineMedianVelocity.
 * 1.0× = personal norm; >2.0× = acute agitation. Null without baseline.
 */
export function compulsionIndex(
  skipRate: number,
  velocityPerMin: number,
  baselineMedianVelocity: number | null,
): number | null {
  if (baselineMedianVelocity === null || baselineMedianVelocity <= 0) return null;
  return Math.round(((skipRate * velocityPerMin) / baselineMedianVelocity) * 100) / 100;
}

/**
 * Attention ROI %: active time on completed videos (>80% of length,
 * measured-only) over total active time. Null when nothing measured.
 */
export function attentionROI(events: TelemetryEvent[]): number | null {
  const measured = events.filter((e) => e.videoDurationMs !== null);
  if (measured.length === 0) return null;
  const total = measured.reduce((s, e) => s + e.durationMs, 0);
  if (total <= 0) return null;
  const completed = measured
    .filter((e) => e.durationMs / (e.videoDurationMs as number) > 0.8)
    .reduce((s, e) => s + e.durationMs, 0);
  return Math.round((completed / total) * 1000) / 10;
}

export type CalibrationState = 'calibrating' | 'calibrated';

/** Days 1–6 amber v0 heuristic; day 7+ green personal baseline. */
export function calibrationBadge(daysOfHistory: number): { state: CalibrationState; label: string } {
  if (daysOfHistory >= 7) return { state: 'calibrated', label: '[CALIBRATED // 7D BASELINE]' };
  return { state: 'calibrating', label: `[v0 HEURISTIC // CALIBRATING ${daysOfHistory}/7 DAYS]` };
}
