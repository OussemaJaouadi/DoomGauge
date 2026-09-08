import { PLATFORMS, type HourItem, type Platform, type PlatformStats } from '../types/models';
import type { PopupMockView } from '../types/popup';
import { buildHourlyItems, deriveTemporalInsights, groupActivitySessions, summarizePopupViews, summarizeViewingDistribution, viewsThroughCutoff } from '../utils/popupActivity';

export const POPUP_AS_OF_HOUR = 22;
export const POPUP_DAY_START = new Date(2026, 8, 6).getTime();
export const POPUP_CUTOFF = new Date(2026, 8, 6, POPUP_AS_OF_HOUR).getTime();
export const POPUP_YESTERDAY_START = new Date(2026, 8, 5).getTime();
export const POPUP_YESTERDAY_CUTOFF = new Date(2026, 8, 5, POPUP_AS_OF_HOUR).getTime();

// Build observations first. Every displayed statistic is then derived from them.
const seeds = {
  youtube: { count: 23, skip: 14, timeMs: 1_120_000 },
  instagram: { count: 15, skip: 11, timeMs: 730_000 },
  facebook: { count: 9, skip: 4, timeMs: 485_000 },
};

function makeViews(day: number, previous = false): PopupMockView[] {
  const observations: Omit<PopupMockView, 'startedAt' | 'endedAt'>[] = [];
  for (let i = 0; i < 23; i++) {
    for (const platform of PLATFORMS) {
      const seed = seeds[platform];
      const count = previous ? seed.count - 4 : seed.count;
      if (i >= count) continue;
      const skips = previous ? seed.skip - 3 : seed.skip;
      const skipped = Math.floor((i + 1) * skips / count) > Math.floor(i * skips / count);
      const longCount = count - skips;
      const longTotal = (previous ? Math.round(seed.timeMs * 0.76) : seed.timeMs) - skips * 2000;
      const longIndex = i - Math.floor(i * skips / count);
      const activeMs = skipped ? 2000 : Math.floor(longTotal / longCount) + (longIndex < longTotal % longCount ? 1 : 0);
      observations.push({
        id: `${day}-${platform}-${i}`, platform, activeMs,
        // Some lengths intentionally unavailable; early exits use measured views only.
        videoDurationMs: i % 5 === 0 ? undefined : skipped ? 60_000 : Math.ceil(activeMs * (i % 3 === 0 ? 2.5 : 1.2)),
      });
    }
  }
  const starts = [new Date(2026, 8, day, 8, 10), new Date(2026, 8, day, 12, 35), new Date(2026, 8, day, 19, 50), new Date(2026, 8, day, 21, 10)];
  let cursor = starts[0]!.getTime();
  return observations.map((view, index) => {
    if (index === 7) cursor = starts[1]!.getTime();
    if (index === 16) cursor = starts[2]!.getTime();
    if (index === 39) cursor = starts[3]!.getTime();
    const startedAt = cursor;
    // A pause increases elapsed time but contributes no active time.
    const endedAt = startedAt + view.activeMs + (index % 7 === 0 ? 20_000 : 0);
    cursor = endedAt + (index % 4 === 0 ? 45_000 : 8000);
    return { ...view, startedAt, endedAt };
  });
}

export const POPUP_VIEWS = viewsThroughCutoff(makeViews(6), POPUP_DAY_START, POPUP_CUTOFF);
export const POPUP_YESTERDAY_VIEWS = viewsThroughCutoff(makeViews(5, true), POPUP_YESTERDAY_START, POPUP_YESTERDAY_CUTOFF);
const today = summarizePopupViews(POPUP_VIEWS);
const yesterday = summarizePopupViews(POPUP_YESTERDAY_VIEWS);
export const MOCK = { ...today, yesterdayMs: yesterday.totalMs, yesterdayCount: yesterday.totalCount };
export const PLATFORM_MOCK: Record<Platform, PlatformStats> = {
  youtube: today.platforms.find(p => p.platform === 'youtube')!,
  instagram: today.platforms.find(p => p.platform === 'instagram')!,
  facebook: today.platforms.find(p => p.platform === 'facebook')!,
};
export const POPUP_SESSIONS = groupActivitySessions(POPUP_VIEWS);
export const HOURLY_MOCK: HourItem[] = buildHourlyItems(PLATFORM_MOCK, POPUP_AS_OF_HOUR);
export const POPUP_INSIGHTS = deriveTemporalInsights(POPUP_SESSIONS, HOURLY_MOCK);
export const POPUP_DISTRIBUTION = summarizeViewingDistribution(POPUP_VIEWS);
