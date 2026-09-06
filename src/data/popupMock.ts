import { PLATFORMS, type HourItem, type Platform, type PlatformStats } from '../types/models';
import { avgFlickSec, impatiencePct } from '../utils/metrics';

// Both days are measured through this fixed, complete preview window.
export const POPUP_AS_OF_HOUR = 22;
const seeds = {
  youtube: { timeMs: 1120000, skip: 14, earlyExit: '16 / 23 measured', hours: { 8: 2, 12: 3, 13: 4, 18: 3, 19: 4, 20: 5, 21: 2 } },
  instagram: { timeMs: 730000, skip: 11, earlyExit: '12 / 15 measured', hours: { 8: 1, 12: 1, 13: 2, 18: 2, 19: 3, 20: 4, 21: 2 } },
  facebook: { timeMs: 485000, skip: 4, earlyExit: '6 / 9 measured', hours: { 12: 1, 13: 1, 18: 1, 19: 1, 20: 3, 21: 2 } },
};
const totalMs = PLATFORMS.reduce((sum, platform) => sum + seeds[platform].timeMs, 0);

export const PLATFORM_MOCK = Object.fromEntries(PLATFORMS.map(platform => {
  const seed = seeds[platform];
  const hours: Partial<Record<number, number>> = seed.hours;
  const hourly = Array.from({ length: 24 }, (_, hour) => hours[hour] ?? 0);
  const count = hourly.reduce((sum, value) => sum + value, 0);
  return [platform, {
    count, timeMs: seed.timeMs, skip: seed.skip, earlyExit: seed.earlyExit, hourly,
    avgFlick: avgFlickSec(seed.timeMs, count),
    velocity: (count / (seed.timeMs / 60000)).toFixed(1),
    share: Math.round(seed.timeMs / totalMs * 100),
  }];
})) as Record<Platform, PlatformStats>;

const platforms = PLATFORMS.map(platform => ({ platform, ...PLATFORM_MOCK[platform] }));
const totalCount = platforms.reduce((sum, p) => sum + p.count, 0);
export const MOCK = {
  totalMs, totalCount, platforms,
  // Previous day's observations at the same cutoff, not full-day totals.
  yesterdayMs: 1800000,
  yesterdayCount: 33,
  impatience: impatiencePct(platforms.reduce((sum, p) => sum + p.skip, 0), totalCount),
};

export const HOURLY_MOCK: HourItem[] = Array.from({ length: POPUP_AS_OF_HOUR }, (_, hour) => {
  const youtube = PLATFORM_MOCK.youtube.hourly[hour]!;
  const instagram = PLATFORM_MOCK.instagram.hourly[hour]!;
  const facebook = PLATFORM_MOCK.facebook.hourly[hour]!;
  return { hour, label: String(hour).padStart(2, '0'), youtube, instagram, facebook, total: youtube + instagram + facebook };
});
