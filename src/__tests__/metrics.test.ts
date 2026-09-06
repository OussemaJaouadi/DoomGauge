// Uses the bun test runner's globals (no @types/bun in this repo).
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare function expect(actual: unknown): {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeNull(): void;
  toBeCloseTo(expected: number, precision?: number): void;
};
import {
  avgFlickSec,
  burnRatePct,
  computeVsYesterday,
  earlyExitRatio,
  elapsedMinutesSinceMidnight,
  formatBurnSub,
  formatCountDelta,
  formatMsDelta,
  impatiencePct,
  of10,
  skipDiagnostics,
} from '../utils/metrics';
import { MOCK, PLATFORM_MOCK, HOURLY_MOCK, POPUP_AS_OF_HOUR } from '../data/popupMock';

const fmt = (ms: number) => `${Math.round(ms / 60000)}m`;

describe('popup preview consistency', () => {
  test('headline, platform rows and hourly charts describe the same activity', () => {
    expect(MOCK.totalMs).toBe(MOCK.platforms.reduce((sum, p) => sum + p.timeMs, 0));
    expect(MOCK.totalCount).toBe(HOURLY_MOCK.reduce((sum, h) => sum + h.total, 0));
    for (const p of MOCK.platforms) {
      expect(PLATFORM_MOCK[p.platform].hourly.reduce((sum, count) => sum + count, 0)).toBe(p.count);
      expect(HOURLY_MOCK.reduce((sum, h) => sum + h[p.platform], 0)).toBe(p.count);
      expect(p.skip <= p.count).toBe(true);
      expect(p.share).toBe(Math.round(p.timeMs / MOCK.totalMs * 100));
    }
  });
  test('future hours are excluded from the same-cutoff comparison window', () => {
    expect(HOURLY_MOCK.length).toBe(POPUP_AS_OF_HOUR);
    expect(HOURLY_MOCK.every(h => h.hour < POPUP_AS_OF_HOUR)).toBe(true);
    expect(MOCK.impatience).toBe(Math.round(MOCK.platforms.reduce((sum, p) => sum + p.skip, 0) / MOCK.totalCount * 100));
  });
});

describe('burn rate (DRAINED)', () => {
  test('90 active min of 600 elapsed = 15%', () => {
    expect(burnRatePct(90 * 60000, 600)).toBeCloseTo(15, 5);
  });
  test('CALIBRATING guard below 30 elapsed minutes', () => {
    expect(burnRatePct(5 * 60000, 5)).toBeNull();
    expect(burnRatePct(29 * 60000, 29)).toBeNull();
    expect(formatBurnSub(5 * 60000, new Date(2026, 0, 1, 0, 5))).toBe('CALIBRATING (<30m)');
  });
  test('elapsed minutes since local midnight', () => {
    expect(elapsedMinutesSinceMidnight(new Date(2026, 0, 1, 10, 0))).toBe(600);
    expect(elapsedMinutesSinceMidnight(new Date(2026, 0, 1, 1, 30))).toBe(90);
  });
  test('burn sub shows 1-decimal elapsed-day share once calibrated', () => {
    // 102 active min of 478 elapsed ≈ 21.3%
    expect(formatBurnSub(102 * 60000, new Date(2026, 0, 1, 7, 58))).toBe('21.3% elapsed day');
  });
});

describe('dual deltas (VS YDAY)', () => {
  test('time delta keeps sign', () => {
    expect(formatMsDelta(38 * 60000, fmt)).toBe('+38m');
    expect(formatMsDelta(-22 * 60000, fmt)).toBe('-22m');
    expect(formatMsDelta(0, fmt)).toBe('±0s');
  });
  test('count delta arrows', () => {
    expect(formatCountDelta(14)).toBe('↑ 14 reels');
    expect(formatCountDelta(-8)).toBe('↓ 8 reels');
    expect(formatCountDelta(0)).toBe('±0 reels');
  });
  test('computeVsYesterday returns structured semantic directions and formatted values', () => {
    const surge = computeVsYesterday(5020000, 2740000, 47, 33, fmt);
    expect(surge.direction).toBe('surge');
    expect(surge.timeFormatted).toBe('38m');
    expect(surge.countFormatted).toBe('14 reels');

    const drop = computeVsYesterday(1000000, 2000000, 10, 20, fmt);
    expect(drop.direction).toBe('drop');
    expect(drop.timeFormatted).toBe('17m');
    expect(drop.countFormatted).toBe('10 reels');

    const steady = computeVsYesterday(1000000, 1000000, 15, 15, fmt);
    expect(steady.direction).toBe('steady');
    expect(steady.timeFormatted).toBe('0s');
    expect(steady.countFormatted).toBe('0 reels');
  });
});

describe('detail formulas', () => {
  test('avgFlick = totalActiveMs/(count*1000), 1 decimal', () => {
    expect(avgFlickSec(1120000, 23)).toBe(48.7);
    expect(avgFlickSec(0, 0)).toBe(0);
  });
  test('impatience + of10 + skipDiagnostics', () => {
    expect(impatiencePct(14, 23)).toBe(61);
    expect(of10(14, 23)).toBe(6);
    expect(of10(0, 0)).toBe(0);
    expect(skipDiagnostics(14, 23)).toEqual({ pct: 61, of10: 6 });
    expect(skipDiagnostics(0, 0)).toEqual({ pct: 0, of10: 0 });
  });
  test('early-exit measured-only denominator', () => {
    expect(earlyExitRatio(3, 18)).toBeCloseTo(3 / 18, 5);
    expect(earlyExitRatio(0, 0)).toBeNull();
  });
});
