declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void; toBeCloseTo(value: number, precision?: number): void };
import { hasObservationCoverage, rankedRecurringWindows, sessionConcentration, sessionReturnRates } from '../utils/telemetryInsights';
import { selectObservations } from '../utils/telemetryPreview';
import { DAYPARTS } from '../types/telemetry';
import type { ObservationSession, PreviewObservation } from '../types/telemetryPreview';

const minute = 60_000;
const view = (id: string, ts: number, durationMs = minute, platform: PreviewObservation['platform'] = 'youtube'): PreviewObservation => ({ id, ts, endedTs: ts + durationMs, durationMs, platform, skipped: false, videoDurationMs: null });
const session = (id: string, start: number, platform: PreviewObservation['platform'] = 'youtube'): ObservationSession => ({ id, startTs: start * minute, endTs: (start + 1) * minute, events: [view(id, start * minute, minute, platform)] });

describe('intervention insight denominators', () => {
  test('multi-select unions dayparts without duplicates and supports all or none', () => {
    const start = new Date(2026, 8, 1).getTime();
    const events = Array.from({ length: 24 }, (_, hour) => view(String(hour), start + hour * 60 * minute));
    const select = (parts: Parameters<typeof selectObservations>[4]) => selectObservations(events, start, start + 24 * 60 * minute, 'overview', parts);
    const first = DAYPARTS[0]!.id;
    const second = DAYPARTS[1]!.id;
    expect(select([first, second]).length).toBe(select(first).length + select(second).length);
    expect(select([first, first])).toEqual(select(first));
    expect(select([])).toEqual([]);
    expect(select(DAYPARTS.map(part => part.id))).toEqual(select('all'));
  });
  test('concentration uses all selected active time rather than only top five or elapsed spans', () => {
    const sessions = Array.from({ length: 6 }, (_, i) => session(String(i), i * 10));
    sessions[0]!.endTs = 9 * minute;
    const result = sessionConcentration(sessions);
    expect(result.totalActiveMs).toBe(6 * minute);
    expect(result.top.length).toBe(5);
    expect(result.topSharePct).toBeCloseTo(500 / 6);
    expect(sessionConcentration([]).topSharePct).toBe(null);
  });
  test('coverage merges contiguous intervals but rejects an unobserved gap', () => {
    expect(hasObservationCoverage([{ startTs: 10, endTs: 20 }, { startTs: 0, endTs: 10 }], 5, 20)).toBe(true);
    expect(hasObservationCoverage([{ startTs: 0, endTs: 9 }, { startTs: 10, endTs: 20 }], 5, 20)).toBe(false);
  });
  test('filtered origins still find subsequent sessions outside the display filter', () => {
    const sessions = [session('origin', 0), session('return', 6)];
    const rates = sessionReturnRates(sessions, [sessions[0]!], [{ startTs: 0, endTs: 31 * minute }], 'overview');
    expect(rates.map(rate => [rate.eligibleCount, rate.returnedCount])).toEqual([[1, 1], [1, 1], [1, 1]]);
    expect(rates[0]!.matches[0]!.next.id).toBe('return');
  });
  test('platform returns skip other platforms and use original session ends', () => {
    const sessions = [session('origin', 0), session('other', 3, 'instagram'), session('same', 10)];
    const coverage = [{ startTs: 0, endTs: 40 * minute }];
    expect(sessionReturnRates(sessions, [sessions[0]!], coverage, 'overview')[0]!.returnedCount).toBe(1);
    expect(sessionReturnRates(sessions, [sessions[0]!], coverage, 'youtube').map(rate => rate.returnedCount)).toEqual([0, 1, 1]);
  });
  test('requires full follow-up even when an early return is already known', () => {
    const sessions = [session('origin', 0), session('return', 3)];
    const rates = sessionReturnRates(sessions, [sessions[0]!], [{ startTs: 0, endTs: 6 * minute }], 'overview');
    expect(rates.map(rate => rate.percentage)).toEqual([100, null, null]);
    expect(sessionReturnRates(sessions, [sessions[0]!], [], 'overview')[0]!.percentage).toBe(null);
  });
  test('observed quiet follow-up is a zero return, not missing data', () => {
    const origin = session('origin', 0);
    expect(sessionReturnRates([origin], [origin], [{ startTs: 0, endTs: 31 * minute }], 'overview').map(rate => rate.percentage)).toEqual([0, 0, 0]);
  });
  test('recurring shares exclude partial-day time and rank by burden', () => {
    const dates = ['2026-09-01', '2026-09-02', '2026-09-03'];
    const events = dates.flatMap((date, i) => [view(`a${i}`, new Date(`${date}T08:00:00`).getTime()), view(`b${i}`, new Date(`${date}T20:00:00`).getTime(), 3 * minute)]);
    events.push(view('partial', new Date('2026-09-04T08:00:00').getTime(), 100 * minute));
    const windows = rankedRecurringWindows(events, dates);
    expect(windows.map(window => window.startMinute)).toEqual([1200, 480]);
    expect(windows.map(window => window.sharePct)).toEqual([75, 25]);
    expect(windows[0]!.matchingDates.length).toBe(3);
  });
});
