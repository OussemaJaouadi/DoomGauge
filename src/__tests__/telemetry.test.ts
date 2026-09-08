// Uses the bun test runner's globals (no @types/bun in this repo).
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare function expect(actual: unknown): {
  toBe(expected: unknown): void;
  toBeNull(): void;
  toBeGreaterThan(n: number): void;
  toEqual(expected: unknown): void;
  toBeCloseTo(expected: number, precision?: number): void;
  not: { toBeNull(): void };
};

import {
  attentionROI,
  binDayparts,
  buildHourlyTrajectory,
  calibrationBadge,
  compulsionIndex,
  daypartOfHour,
  fanoFactor,
  findRunaways,
  frustrationGradient,
  hourlyMatrix,
  interArrivalGaps,
  kmCurve,
  quantile,
} from '../utils/telemetry';
import { localDateKey } from '../utils/time';
import { getTelemetryFixture, seededRandom } from '../data/mock';
import type { TelemetryEvent } from '../types/telemetry';

const evt = (ts: number, durationMs: number, platform: TelemetryEvent['platform'] = 'youtube'): TelemetryEvent => ({
  platform,
  ts,
  durationMs,
  videoDurationMs: 30000,
  skipped: durationMs < 3000,
});

describe('deterministic fixtures', () => {
  test('same seed + date → identical fixture, no Math.random', () => {
    const d = new Date(2026, 8, 5, 12, 0, 0);
    const a = getTelemetryFixture(d, '7d');
    const b = getTelemetryFixture(d, '7d');
    expect(a).toEqual(b);
    expect(a.rollups.length).toBe(21);
    expect(a.events.length).toBeGreaterThan(40);
    expect(a.hourlyByDay.length).toBe(7);
  });
  test('seededRandom is stable', () => {
    expect(seededRandom(42)()).toBe(seededRandom(42)());
  });
});

describe('dayparts', () => {
  test('canonical bins', () => {
    expect(daypartOfHour(7)).toBe('MORNING');
    expect(daypartOfHour(13)).toBe('AFTERNOON');
    expect(daypartOfHour(20)).toBe('PRIME');
    expect(daypartOfHour(2)).toBe('GRAVEYARD');
    expect(daypartOfHour(23)).toBe('GRAVEYARD');
  });
  test('binDayparts aggregates', () => {
    const bins = binDayparts([evt(new Date(2026, 0, 1, 8).getTime(), 5000), evt(new Date(2026, 0, 1, 23, 30).getTime(), 1000)]);
    expect(bins.MORNING.reels).toBe(1);
    expect(bins.GRAVEYARD.reels).toBe(1);
    expect(bins.PRIME.reels).toBe(0);
  });
});

describe('gaps + runaways', () => {
  test('interArrivalGaps subtracts watch time', () => {
    const gaps = interArrivalGaps([evt(0, 10000), evt(70000, 5000)]);
    expect(gaps).toEqual([60]);
  });
  test('fano ≈ 0 for metronomic gaps, large for bursty', () => {
    expect(fanoFactor([60, 60, 60, 60])).toBeCloseTo(0, 5);
    const bursty = fanoFactor([5, 5, 5, 3600]);
    expect((bursty as number) > 100).toBe(true);
  });
  test('cold-start runaway: ≥45m idle + >15m continuous', () => {
    const start = 1000000;
    const run: TelemetryEvent[] = [];
    for (let i = 0; i < 40; i++) run.push(evt(start + 3600000 + i * 30000, 20000, 'instagram'));
    const found = findRunaways([evt(0, 5000), ...run]);
    expect(found.length).toBe(1);
    expect(found[0]!.gateway).toBe('instagram');
    expect(found[0]!.overrunMin).toBeGreaterThan(0);
  });
  test('fixture contains the crafted black-hole runaway', () => {
    const { events } = getTelemetryFixture(new Date(2026, 8, 5, 12), '7d');
    expect(findRunaways(events).length).toBeGreaterThan(0);
  });
});

describe('survival', () => {
  test('KM cliff fires when ≥70% discarded early', () => {
    const evts: TelemetryEvent[] = [];
    for (let i = 0; i < 8; i++) evts.push(evt(i * 60000, 1500));
    for (let i = 0; i < 2; i++) evts.push(evt(1000000 + i * 60000, 25000));
    const { tCliff, points } = kmCurve(evts);
    expect(tCliff).toBe(1.5);
    expect(points[0]).toEqual({ t: 0, s: 1 });
  });
  test('empty input → nulls', () => {
    expect(kmCurve([])).toEqual({ points: [], tCliff: null, tLock: null });
    expect(fanoFactor([])).toBeNull();
  });
  test('frustration gradient rises on the fixture', () => {
    const { events } = getTelemetryFixture(new Date(2026, 8, 5, 12), '7d');
    expect(frustrationGradient(events)).not.toBeNull();
  });
});

describe('indices', () => {  test('compulsion is dimensionless vs baseline', () => {
    expect(compulsionIndex(0.6, 3, 3)).toBe(0.6);
    expect(compulsionIndex(0.6, 6, 3)).toBe(1.2);
    expect(compulsionIndex(0.6, 3, null)).toBeNull();
  });
  test('ROI measured-only', () => {
    const evts: TelemetryEvent[] = [
      { platform: 'youtube', ts: 0, durationMs: 27000, videoDurationMs: 30000, skipped: false },
      { platform: 'youtube', ts: 60000, durationMs: 1000, videoDurationMs: 30000, skipped: true },
      { platform: 'youtube', ts: 120000, durationMs: 5000, videoDurationMs: null, skipped: false },
    ];
    expect(attentionROI(evts)).toBeCloseTo(96.4, 1);
    expect(attentionROI([])).toBeNull();
  });
  test('quantile + calibration badge', () => {
    expect(quantile([1, 2, 3, 4, 5], 0.8)).toBeCloseTo(4.2, 5);
    expect(quantile([], 0.5)).toBeNull();
    expect(calibrationBadge(3).state).toBe('calibrating');
    expect(calibrationBadge(7).state).toBe('calibrated');
  });
});

describe('fix regressions', () => {
  test('zero-padded date keys sort chronologically (Oct 2 before Oct 10)', () => {
    const keys = [
      localDateKey(new Date(2026, 9, 10, 12)),
      localDateKey(new Date(2026, 9, 2, 12)),
    ].sort();
    expect(keys).toEqual(['2026-10-02', '2026-10-10']);
  });
  test('hourlyMatrix reacts to platform filtering', () => {
    const { events } = getTelemetryFixture(new Date(2026, 8, 5, 12), '7d');
    const end = new Date(2026, 8, 5, 12);
    const all = hourlyMatrix(events, 7, end);
    const ytOnly = hourlyMatrix(
      events.filter((e) => e.platform === 'youtube'),
      7,
      end,
    );
    expect(all.length).toBe(7);
    expect(all[0]!.length).toBe(24);
    const sum = (m: number[][]) => m.flat().reduce((s, v) => s + v, 0);
    expect(sum(ytOnly) < sum(all)).toBe(true);
    expect(sum(ytOnly)).toBeGreaterThan(0);
  });
  test('hourlyMatrix bins land on the right day + hour', () => {
    const day = new Date(2026, 8, 5, 12);
    const evts: TelemetryEvent[] = [evt(new Date(2026, 8, 5, 21, 15).getTime(), 5000)];
    const m = hourlyMatrix(evts, 1, day);
    expect(m[0]![21]).toBe(1);
    expect(m[0]![20]).toBe(0);
  });
  test('buildHourlyTrajectory produces 24 hourly bins with active minutes per platform', () => {
    const day = new Date(2026, 8, 5, 0, 0, 0);
    const evts: TelemetryEvent[] = [
      evt(day.getTime() + 14 * 3600000 + 10 * 60000, 120000, 'youtube'), // 2 mins at 14:10
      evt(day.getTime() + 14 * 3600000 + 30 * 60000, 60000, 'instagram'), // 1 min at 14:30
      evt(day.getTime() + 22 * 3600000, 180000, 'facebook'), // 3 mins at 22:00
    ];
    const visible = { youtube: true, instagram: true, facebook: true };
    const bins = buildHourlyTrajectory(evts, visible);

    expect(bins.length).toBe(24);
    expect(bins[14]!.date).toBe('14:00');
    expect(bins[14]!.youtube).toBe(2);
    expect(bins[14]!.instagram).toBe(1);
    expect(bins[14]!.facebook).toBe(0);
    expect(bins[14]!.total).toBe(3);

    expect(bins[22]!.date).toBe('22:00');
    expect(bins[22]!.facebook).toBe(3);
    expect(bins[22]!.total).toBe(3);

    // Muted platform is excluded
    const muted = buildHourlyTrajectory(evts, { youtube: true, instagram: false, facebook: true });
    expect(muted[14]!.instagram).toBe(0);
    expect(muted[14]!.total).toBe(2);
  });
});
