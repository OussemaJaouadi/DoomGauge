export const MOCK = {
  totalMs: 5020000, // 1h23m40s
  totalCount: 47,
  yesterdayMs: 2740000, // 45m40s → dual delta +38m
  yesterdayCount: 33, // → dual delta ↑ 14 reels
  platforms: [
    { platform: 'youtube' as const, count: 23, timeMs: 1120000, pct: 37 },
    { platform: 'instagram' as const, count: 15, timeMs: 730000, pct: 28 },
    { platform: 'facebook' as const, count: 9, timeMs: 485000, pct: 18 },
  ],
  velocity: '3.2',
  impatience: 62,
  sparkline: {
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    total: [20, 30, 23, 43, 60, 48, 77],
    youtube: [10, 15, 12, 20, 30, 25, 40],
    instagram: [5, 10, 8, 15, 20, 18, 25],
    facebook: [2, 5, 3, 8, 10, 5, 12],
  },
};

import type { TimeRange, DayRollup, TelemetryEvent } from '../types/telemetry';
import { PLATFORMS } from '../types/models';

/** Deterministic PRNG (mulberry32) — fixtures are stable per seed, no Math.random. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromDate(d: Date): number {
  return d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
}

function localDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const DAY_MS = 86400000;

/**
 * Deterministic telemetry fixture for Surface B (mock phase).
 * - rollups: per-day per-platform aggregates (trajectory lens)
 * - events: per-reel events with measured-only videoDurationMs (survival/gravity/neuro lenses)
 * - hourlyByDay: 24-bin counts per day index (circadian lens)
 */
export interface TelemetryFixture {
  rollups: DayRollup[];
  events: TelemetryEvent[];
  hourlyByDay: number[][];
}

export function getTelemetryFixture(endDate: Date, range: TimeRange): TelemetryFixture {
  const days = range === 'day' ? 1 : range === '7d' ? 7 : 30;
  const rand = seededRandom(seedFromDate(endDate) * 131 + days);
  const rollups: DayRollup[] = [];
  const events: TelemetryEvent[] = [];
  const hourlyByDay: number[][] = [];

  const basePattern = [0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 1, 3, 6, 5, 2, 0, 1, 2, 3, 5, 8, 10, 4];

  for (let back = days - 1; back >= 0; back--) {
    const day = new Date(endDate.getTime() - back * DAY_MS);
    day.setHours(0, 0, 0, 0);
    const dateKey = localDateKey(day);
    const growth = 1 + (days - 1 - back) * 0.06;
    const hourly: number[] = [];

    PLATFORMS.forEach((platform, pi) => {
      const share = pi === 0 ? 0.5 : pi === 1 ? 0.32 : 0.18;
      let reelCount = 0;
      let skipCount = 0;
      let totalActiveMs = 0;

      for (let h = 0; h < 24; h++) {
        const slot = Math.max(0, Math.round(basePattern[h]! * growth * share + (rand() < 0.3 ? 1 : 0)));
        hourly[h] = (hourly[h] ?? 0) + slot;
        for (let i = 0; i < slot; i++) {
          const minute = Math.floor(rand() * 60);
          const ts = day.getTime() + h * 3600000 + minute * 60000;
          const durationMs = 800 + Math.floor(rand() * 29000);
          const measured = rand() < 0.7;
          const videoDurationMs = measured ? 5000 + Math.floor(rand() * 55000) : null;
          const skipped = durationMs < 3000;
          events.push({ platform, ts, durationMs, videoDurationMs, skipped });
          reelCount++;
          if (skipped) skipCount++;
          totalActiveMs += durationMs;
        }
      }
      rollups.push({ date: dateKey, platform, reelCount, skipCount, totalActiveMs });
    });
    hourlyByDay.push(hourly);
  }

  // Crafted deterministic black-hole cluster on the most recent prime evening:
  // 40 reels, ~30s gaps, preceded by a 60m idle gap → exercises the runaway detector.
  const anchor = new Date(endDate);
  anchor.setHours(21, 30, 0, 0);
  const clusterStart = anchor.getTime() - 40 * 30000;
  for (let i = 0; i < 40; i++) {
    const durationMs = 1200 + ((i * 7919) % 9000);
    events.push({
      platform: 'instagram',
      ts: clusterStart + i * 30000,
      durationMs,
      videoDurationMs: 30000,
      skipped: durationMs < 3000,
    });
  }

  events.sort((a, b) => a.ts - b.ts);
  return { rollups, events, hourlyByDay };
}

export function getTelemetryData(endDate: Date, range: TimeRange) {
  // Legacy shape for the pre-lens scaffold: sessions derived deterministically.
  const { events } = getTelemetryFixture(endDate, range);
  const sessions: { startTime: number; durationMs: number }[] = [];
  let run: TelemetryEvent[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const startTime = run[0]!.ts;
    const end = run[run.length - 1]!.ts + run[run.length - 1]!.durationMs;
    sessions.push({ startTime, durationMs: end - startTime });
    run = [];
  };
  for (const e of events) {
    const prev = run[run.length - 1];
    if (prev && e.ts - (prev.ts + prev.durationMs) >= 45 * 60000) flush();
    run.push(e);
  }
  flush();
  return { sessions, events };
}

import type { HourItem } from '../types/models';
export const HOURLY_MOCK: HourItem[] = (() => {
  const pattern = [0,0,0,0,0,0,1,2,1,0,0,1,3,6,5,2,0,1,2,3,5,8,10,4];
  return pattern.map((total, h)=>{
    const yt = Math.floor(total*0.5);
    const fb = Math.floor(total*0.2);
    const ig = total - yt - fb;
    return { hour:h, label: `${String(h).padStart(2,'0')}`, youtube: yt, instagram: ig, facebook: fb, total };
  });
})();

import type { Platform, PlatformStats } from '../types/models';

export const PLATFORM_MOCK: Record<Platform, PlatformStats> = {
  youtube: { count: 23, timeMs: 1120000, skip: 14, avgFlick: 1.1, velocity: '1.2', share: 37, earlyExit: '3 / 18 measured', hourly: [0,0,0,0,0,0,0,1,1,0,0,1,2,5,3,1,0,1,1,2,3,5,4,1] },
  instagram: { count: 15, timeMs: 730000, skip: 11, avgFlick: 0.9, velocity: '1.8', share: 28, earlyExit: '5 / 12 measured', hourly: [0,0,0,0,0,0,1,1,0,0,0,0,1,2,2,1,0,1,2,2,3,4,2,1] },
  facebook: { count: 9, timeMs: 485000, skip: 4, avgFlick: 1.6, velocity: '0.9', share: 18, earlyExit: '1 / 7 measured', hourly: [0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,1,1,2] },
};
