declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void; toBeGreaterThan(value: number): void; toBeCloseTo(value: number, precision?: number): void };
import { buildPreviewDay, buildPreviewHistory } from '../data/telemetryPreview';
import { durationCurve, mechanicsSummary, observationRollups, observationSessions, observationTotals, periodBounds, recurringWindows, scopedSessions, selectObservations, shiftDate, trajectoryRows } from '../utils/telemetryPreview';
import { localDateKey } from '../utils/time';
import type { PreviewObservation } from '../types/telemetryPreview';

const view = (id: string, ts: number, durationMs = 1000, extra: Partial<PreviewObservation> = {}): PreviewObservation => ({ id, ts, durationMs, endedTs: ts + durationMs, platform: 'youtube', skipped: durationMs < 3000, videoDurationMs: null, ...extra });

describe('telemetry preview source and scope', () => {
  test('overlapping dates are identical in different history windows', () => {
    const end = new Date(2026, 8, 7);
    const day = buildPreviewDay(end);
    const month = buildPreviewHistory(shiftDate(end, -29), end);
    expect(month.filter(e => localDateKey(new Date(e.ts)) === localDateKey(end))).toEqual(day);
    expect(buildPreviewDay(end)).toEqual(day);
  });
  test('summaries, rollups and trajectory reconcile after filters', () => {
    const now = new Date(2026, 8, 7, 15, 45);
    const bounds = periodBounds(now, '7d', now);
    const history = buildPreviewHistory(bounds.previousStart, now);
    const selected = selectObservations(history, bounds.start.getTime(), now.getTime(), 'instagram', 'PRIME');
    const totals = observationTotals(selected);
    const rollups = observationRollups(selected, bounds.dates);
    const rows = trajectoryRows(selected, [], bounds.dates, [], false, 'time');
    expect(rollups.reduce((s, r) => s + r.reelCount, 0)).toBe(totals.reels);
    expect(rollups.reduce((s, r) => s + r.totalActiveMs, 0)).toBe(totals.activeMs);
    expect(rows.reduce((s, r) => s + r.instagram, 0) * 60000).toBeCloseTo(totals.activeMs, 5);
    expect(rows.every(r => r.youtube === 0 && r.facebook === 0)).toBe(true);
    expect(selected.every(e => e.endedTs <= now.getTime())).toBe(true);
  });
  test('partial comparison uses matching final-day cutoff and calendar period length', () => {
    const now = new Date(2026, 8, 7, 14, 25, 10);
    const bounds = periodBounds(now, '7d', now);
    expect(bounds.dates.length).toBe(7);
    expect(bounds.completeDates.length).toBe(6);
    expect(localDateKey(bounds.previousStart)).toBe('2026-08-25');
    expect(localDateKey(bounds.previousCutoff)).toBe('2026-08-31');
    expect(bounds.previousCutoff.getHours()).toBe(14);
    expect(bounds.previousCutoff.getMinutes()).toBe(25);
    const historical = periodBounds(new Date(2026, 7, 31), '7d', now);
    expect(historical.completeDates.length).toBe(7);
    expect(localDateKey(historical.cutoff)).toBe('2026-09-01');
    expect(localDateKey(shiftDate(new Date(2026, 2, 8, 12), 1))).toBe('2026-03-09');
  });
  test('cutoffs exclude incomplete views and unavailable future observations', () => {
    expect(selectObservations([view('before', -1000), view('valid', 0), view('incomplete', 9000, 2000), view('future', 10000)], 0, 10000, 'overview', 'all').map(e => e.id)).toEqual(['valid']);
  });
  test('single-day trajectory hides future hours while preserving observed values', () => {
    const ts = new Date(2026, 8, 7, 10).getTime();
    const rows = trajectoryRows([view('a', ts, 60000)], [], ['2026-09-07'], ['2026-09-06'], true, 'time', 10);
    expect(rows.length).toBe(11);
    expect(rows[10]!.label).toBe('10:00');
    expect(rows[10]!.youtube).toBe(1);
  });
  test('generated observations are valid and do not overlap', () => {
    const events = buildPreviewDay(new Date(2026, 8, 7));
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e, i) => e.endedTs >= e.ts + e.durationMs && e.skipped === (e.durationMs < 3000) && (i === 0 || e.ts >= events[i - 1]!.endedTs))).toBe(true);
  });
});

describe('session identity and elapsed time', () => {
  for (const gap of [59000, 60000, 61000]) test(`gap ${gap} respects 60-second boundary`, () => {
    expect(observationSessions([view('a', 0), view('b', 1000 + gap)]).length).toBe(gap > 60000 ? 2 : 1);
  });
  test('two one-second views twenty minutes apart are not a continuous session', () => {
    const sessions = observationSessions([view('a', 0), view('b', 1200000)]);
    expect(sessions.length).toBe(2);
    expect(sessions.every(s => s.endTs - s.startTs === 1000)).toBe(true);
  });
  test('latest end survives nested overlaps; explicit pauses are not active', () => {
    const events = [view('outer', 0, 1000, { endedTs: 120000 }), view('inner', 10000), view('next', 180000)];
    const sessions = observationSessions(events);
    expect(sessions.length).toBe(1);
    expect(sessions[0]!.endTs).toBe(181000);
    expect(observationTotals(events).activeMs).toBe(3000);
  });
  test('filtering preserves a cross-platform overnight parent session', () => {
    const start = new Date(2026, 8, 6, 23, 59, 30).getTime();
    const events = [view('a', start, 20000), view('b', start + 35000, 10000, { platform: 'instagram' }), view('c', start + 75000)];
    const full = observationSessions(events);
    const selected = scopedSessions(full, events.filter(e => e.platform === 'youtube'));
    expect(selected.length).toBe(1);
    expect(selected[0]!.id).toBe(full[0]!.id);
    expect(selected[0]!.endTs).toBe(full[0]!.endTs);
    expect(selected[0]!.events.length).toBe(2);
    expect(full[0]!.events.length).toBe(3);
  });
});

describe('recurrence and observed duration', () => {
  const dates = Array.from({ length: 7 }, (_, i) => `2026-09-0${i + 1}`);
  const at = (day: string, hour: string) => new Date(`${day}T${hour}:00`).getTime();
  test('frequency uses distinct completed days and includes quiet observed days', () => {
    const events = dates.slice(0, 3).flatMap(date => [view(`${date}-a`, at(date, '21:10'), 10000), view(`${date}-b`, at(date, '21:40'), 20000)]);
    const windows = recurringWindows(events, dates);
    expect(windows.length).toBe(1);
    expect(windows[0]!.startMinute).toBe(1260);
    expect(windows[0]!.endMinute).toBe(1320);
    expect(windows[0]!.matchingDates.length).toBe(3);
    expect(windows[0]!.eligibleDays).toBe(7);
    expect(windows[0]!.medianActiveMs).toBe(30000);
    expect(recurringWindows(events, dates.slice(0, 2))).toEqual([]);
  });
  test('30-day recurrence needs nine days, not a single high-volume evening', () => {
    const month = Array.from({ length: 30 }, (_, i) => localDateKey(new Date(2026, 8, i + 1)));
    const events = month.slice(0, 8).map(date => view(date, at(date, '21:10')));
    expect(recurringWindows(events, month)).toEqual([]);
    expect(recurringWindows([...events, view('ninth', at(month[8]!, '21:10'))], month).length).toBe(1);
  });
  test('midnight separates intervals and current uncompleted day cannot establish recurrence', () => {
    const events = dates.slice(0, 3).flatMap(date => [view(`${date}-late`, at(date, '23:45')), view(`${date}-early`, at(date, '00:15'))]);
    expect(recurringWindows(events, dates).length).toBe(2);
    expect(recurringWindows(events, dates.slice(0, 2))).toEqual([]);
  });
  test('duration curves retain equality, count all exits, and include long watches', () => {
    const curve = durationCurve([view('a', 0, 1000), view('b', 2000, 10000), view('c', 20000, 120000)]);
    expect(curve.map(p => p.seconds)).toEqual([0, 1, 10, 120]);
    expect(curve[2]!.percent).toBeCloseTo(200 / 3);
    expect(curve[3]!.percent).toBeCloseTo(100 / 3);
    expect(durationCurve([])).toEqual([]);
  });
  test('missing mechanics differ from measured zero; commentary is never inferred', () => {
    const unknown = mechanicsSummary([view('a', 0, 1000, { endedTs: 100000 })]);
    expect(unknown.commentMs).toBe(null);
    expect(unknown.replayCount).toBe(null);
    const measured = mechanicsSummary([view('a', 0, 1000, { replayCount: 0, commentOpenMs: 0, entryRoute: 'Home feed' }), view('b', 2000)]);
    expect(measured.commentMs).toBe(0);
    expect(measured.commentMeasured).toBe(1);
    expect(measured.replayCount).toBe(0);
    expect(measured.entryMeasured).toBe(1);
  });
  test('empty selections have no invented averages or percentages', () => {
    const totals = observationTotals([]);
    expect(totals.medianMs).toBe(null);
    expect(totals.averageMs).toBe(null);
    expect(totals.skipPct).toBe(null);
    expect(scopedSessions([], [])).toEqual([]);
  });
});
