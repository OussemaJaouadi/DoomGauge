declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare function expect(actual: unknown): {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeGreaterThan(expected: unknown): void;
};
import type { PopupActivitySession, PopupMockView } from '../types/popup';
import {
  appendViewToSessions,
  buildHourlyItems,
  deltaTrend,
  deriveTemporalInsights,
  groupActivitySessions,
  mostActiveSession,
  summarizePopupViews,
  summarizeViewingDistribution,
  updateHourlyBuckets,
  viewsThroughCutoff,
} from '../utils/popupActivity';
import {
  MOCK,
  PLATFORM_MOCK,
  POPUP_VIEWS,
  POPUP_YESTERDAY_VIEWS,
  POPUP_SESSIONS,
  POPUP_INSIGHTS,
  HOURLY_MOCK,
  POPUP_DAY_START,
  POPUP_CUTOFF,
  POPUP_YESTERDAY_CUTOFF,
  POPUP_YESTERDAY_START,
} from '../data/popupMock';

function view(id: string, startedAt: number, endedAt: number, overrides: Partial<PopupMockView> = {}): PopupMockView {
  return { id, platform: 'youtube', startedAt, endedAt, activeMs: endedAt - startedAt, ...overrides };
}

describe('popup session extraction', () => {
  for (const gap of [59, 60, 61]) {
    test(`${gap}-second gap ${gap > 60 ? 'starts another session' : 'stays in the session'}`, () => {
      const sessions = groupActivitySessions([view('a', 0, 1000), view('b', 1000 + gap * 1000, 3000 + gap * 1000)]);
      expect(sessions.length).toBe(gap > 60 ? 2 : 1);
      expect(sessions.reduce((sum, s) => sum + s.reelCount, 0)).toBe(2);
    });
  }
  test('appendViewToSessions streams views into sessions in O(1)', () => {
    const sessions: PopupActivitySession[] = [];
    appendViewToSessions(sessions, view('s1', 0, 10_000));
    expect(sessions.length).toBe(1);
    expect(sessions[0]!.reelCount).toBe(1);

    // Within 60s -> appends to s1
    appendViewToSessions(sessions, view('s2', 20_000, 30_000, { platform: 'instagram' }));
    expect(sessions.length).toBe(1);
    expect(sessions[0]!.reelCount).toBe(2);
    expect(sessions[0]!.platforms).toEqual(['youtube', 'instagram']);

    // Beyond 60s -> starts session 2
    appendViewToSessions(sessions, view('s3', 100_000, 110_000));
    expect(sessions.length).toBe(2);
  });
  test('platform changes join one session and input is sorted without mutation', () => {
    const views = [view('b', 2000, 3000, { platform: 'facebook' }), view('a', 0, 1000)];
    const sessions = groupActivitySessions(views);
    expect(sessions[0]!.platforms).toEqual(['youtube', 'facebook']);
    expect(sessions[0]!.id).toBe('a');
    expect(views.map(v => v.id)).toEqual(['b', 'a']);
  });
  test('nested overlaps retain the latest end when deciding the next break', () => {
    const sessions = groupActivitySessions([
      view('outer', 0, 120_000), view('inner', 10_000, 20_000), view('next', 179_000, 180_000),
    ]);
    expect(sessions.length).toBe(1);
    expect(sessions[0]!.endedAt).toBe(180_000);
    // Active time sums observations, including overlapping ones, by contract.
    expect(sessions[0]!.activeMs).toBe(131_000);
  });
  test('pauses and short inter-view breaks increase elapsed, never active time', () => {
    const session = groupActivitySessions([
      view('paused', 0, 50_000, { activeMs: 2000 }), view('next', 100_000, 101_000),
    ])[0]!;
    expect(session.activeMs).toBe(3000);
    expect(session.endedAt - session.startedAt).toBe(101_000);
  });
  test('most active uses watching, not elapsed duration or count; ties choose earliest', () => {
    const sessions = groupActivitySessions([
      view('slow', 0, 100_000, { activeMs: 1000 }), view('early', 200_000, 205_000), view('late', 400_000, 405_000),
    ]);
    expect(mostActiveSession([...sessions].reverse())?.id).toBe('early');
  });
  test('empty inputs have no phantom session or most-active annotation', () => {
    expect(groupActivitySessions([])).toEqual([]);
    expect(mostActiveSession([])).toBe(undefined);
  });
});

describe('popup observations and aggregates', () => {
  test('cutoff accepts completed views only and excludes other days or future views', () => {
    const views = [view('previous', -1000, 0), view('valid', 0, 1000), view('boundary', 9000, 10_000), view('ongoing', 9500, 11_000), view('future', 10_000, 12_000)];
    const result = viewsThroughCutoff(views, 0, 10_000);
    expect(result.map(v => v.id)).toEqual(['valid', 'boundary']);
  });
  test('zero and just-under-three-second views skip; exactly three seconds does not', () => {
    const views = [view('zero', 0, 0), view('two-nine', 0, 2999), view('three', 0, 3000)];
    const summary = summarizePopupViews(views);
    expect(summary.totalSkips).toBe(2);
  });
  test('early exits exclude unknown, zero and nonfinite video lengths', () => {
    const views = [
      view('none', 0, 2000),
      view('zero-len', 0, 2000, { videoDurationMs: 0 }),
      view('infinite', 0, 2000, { videoDurationMs: Number.POSITIVE_INFINITY }),
      view('valid-early', 0, 2000, { videoDurationMs: 10_000 }),
      view('valid-stay', 0, 8000, { videoDurationMs: 10_000 }),
    ];
    const summary = summarizePopupViews(views);
    expect(summary.platforms[0]!.earlyExit).toBe('1 / 2 measured');
  });
  test('empty metrics have finite values', () => {
    const empty = summarizePopupViews([]);
    expect(empty.totalMs).toBe(0);
    expect(empty.totalCount).toBe(0);
    expect(empty.totalSkips).toBe(0);
    expect(empty.impatience).toBe(0);
    expect(empty.platforms.every(p => p.avgFlick === 0 && p.velocity === '0.0' && p.share === 0)).toBe(true);
  });
  test('every fixture reconciles to raw observations and session totals', () => {
    expect(MOCK.totalCount).toBe(47);
    expect(MOCK.totalSkips).toBe(29);
    expect(MOCK.totalMs).toBe(2_335_000);
    expect(POPUP_SESSIONS.length).toBe(4);
    expect(POPUP_SESSIONS.reduce((sum, s) => sum + s.activeMs, 0)).toBe(MOCK.totalMs);
    expect(POPUP_SESSIONS.reduce((sum, s) => sum + s.reelCount, 0)).toBe(POPUP_VIEWS.length);
    for (const platform of MOCK.platforms) {
      const raw = POPUP_VIEWS.filter(v => v.platform === platform.platform);
      expect(PLATFORM_MOCK[platform.platform].timeMs).toBe(raw.reduce((sum, v) => sum + v.activeMs, 0));
      expect(platform.skip).toBe(raw.filter(v => v.activeMs < 3000).length);
    }
    expect(MOCK.yesterdayMs).toBe(POPUP_YESTERDAY_VIEWS.reduce((sum, v) => sum + v.activeMs, 0));
    expect(MOCK.yesterdayCount).toBe(POPUP_YESTERDAY_VIEWS.length);
  });
  test('fixtures stay inside their local-day cutoff and contain real pauses', () => {
    expect(POPUP_VIEWS.every(v => v.startedAt >= POPUP_DAY_START && v.endedAt <= POPUP_CUTOFF)).toBe(true);
    expect(POPUP_YESTERDAY_VIEWS.every(v => v.startedAt >= POPUP_YESTERDAY_START && v.endedAt <= POPUP_YESTERDAY_CUTOFF)).toBe(true);
    expect(POPUP_VIEWS.some(v => v.endedAt - v.startedAt > v.activeMs)).toBe(true);
    expect(new Set(POPUP_VIEWS.map(v => v.id)).size).toBe(POPUP_VIEWS.length);
  });
  test('unchanged comparisons are neutral', () => {
    expect(deltaTrend(0)).toBe('neutral');
    expect(deltaTrend(-1)).toBe('better');
    expect(deltaTrend(1)).toBe('worse');
  });
});

describe('temporal insights and hourly helpers', () => {
  test('buildHourlyItems creates 24 or cutoff items with platform totals', () => {
    const items = buildHourlyItems(PLATFORM_MOCK, 22);
    expect(items.length).toBe(22);
    expect(items[0]!.hour).toBe(0);
    expect(items[0]!.total).toBe(items[0]!.youtube + items[0]!.instagram + items[0]!.facebook);
  });
  test('updateHourlyBuckets updates hour in O(1)', () => {
    const hourly = buildHourlyItems(PLATFORM_MOCK, 24);
    const prevTotal = hourly[14]!.total;
    const testView = view('rt-1', new Date(2026, 8, 6, 14, 20).getTime(), new Date(2026, 8, 6, 14, 21).getTime(), { platform: 'youtube' });
    updateHourlyBuckets(hourly, testView);
    expect(hourly[14]!.total).toBe(prevTotal + 1);
  });
  test('deriveTemporalInsights correctly identifies worst vortex, load concentration, and session metrics', () => {
    const insights = deriveTemporalInsights(POPUP_SESSIONS, HOURLY_MOCK);
    expect(insights.worstVortex !== null).toBe(true);
    expect(insights.worstVortex!.reelCount).toBe(23);
    expect(insights.worstVortex!.gapMs).toBeGreaterThan(0);
    expect(insights.daySummary.sessionCount).toBe(4);
    expect(insights.daySummary.totalReelCount).toBe(47);
    expect(insights.daySummary.worstReelCount).toBe(23);
    expect(insights.daySummary.concentrationPct).toBe(49); // 23 / 47 = 48.9% -> 49%
    expect(insights.daySummary.activeConcentrationPct).toBe(40);
    expect(insights.daySummary.avgSessionActiveMs).toBeGreaterThan(0);
  });
  test('deriveTemporalInsights handles empty sessions cleanly', () => {
    const empty = deriveTemporalInsights([], []);
    expect(empty.worstVortex).toBe(null);
    expect(empty.daySummary.sessionCount).toBe(0);
    expect(empty.daySummary.concentrationPct).toBe(0);
    expect(empty.daySummary.activeConcentrationPct).toBe(0);
    expect(empty.daySummary.avgSessionActiveMs).toBe(0);
  });
});

describe('viewing duration distribution', () => {
  test('duration boundaries partition every view exactly once, ignoring elapsed time and video length', () => {
    const durations = [0, 2999, 3000, 9999, 10000, 29999, 30000, 59999, 60000];
    const result = summarizeViewingDistribution(durations.map((activeMs, i) =>
      view(String(i), 0, 200_000, { activeMs, videoDurationMs: 1_000_000 })));
    expect(result.buckets.map(bucket => bucket.count)).toEqual([2, 2, 2, 2, 1]);
    expect(result.buckets.reduce((sum, bucket) => sum + bucket.activeMs, 0)).toBe(durations.reduce((sum, ms) => sum + ms, 0));
    expect(result.medianMs).toBe(10000);
  });

  test('count and time weight the same observations differently', () => {
    const result = summarizeViewingDistribution([view('skip', 0, 2000), view('long', 0, 98000)]);
    expect(result.buckets[0]!.countPct).toBe(50);
    expect(result.buckets[0]!.timePct).toBe(2);
    expect(result.buckets[4]!.countPct).toBe(50);
    expect(result.buckets[4]!.timePct).toBe(98);
    expect(result.medianMs).toBe(50000);
  });

  test('empty and zero-time observations do not create invalid shares', () => {
    const empty = summarizeViewingDistribution([]);
    expect(empty.medianMs).toBe(null);
    expect(empty.buckets.every(bucket => bucket.countPct === 0 && bucket.timePct === 0)).toBe(true);
    const zero = summarizeViewingDistribution([view('zero', 0, 0)]);
    expect(zero.medianMs).toBe(0);
    expect(zero.buckets[0]!.countPct).toBe(100);
    expect(zero.buckets.every(bucket => bucket.timePct === 0)).toBe(true);
  });

  test('preview distribution reconciles with headline and quick skips without mutating observations', () => {
    const order = POPUP_VIEWS.map(view => view.id);
    const result = summarizeViewingDistribution(POPUP_VIEWS);
    expect(result.totalCount).toBe(MOCK.totalCount);
    expect(result.totalMs).toBe(MOCK.totalMs);
    expect(result.buckets[0]!.count).toBe(MOCK.totalSkips);
    expect(result.buckets[0]!.activeMs).toBe(58000);
    expect(result.medianMs).toBe(2000);
    expect(POPUP_VIEWS.map(view => view.id)).toEqual(order);
  });
});
