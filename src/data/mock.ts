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

import type { TimeRange } from '../types/telemetry';
import { PLATFORMS } from '../types/models';

export function getTelemetryData(endDate: Date, range: TimeRange) {
  // Regenerate fake telemetry data so the dashboard doesn't crash
  const now = endDate.getTime();
  const sessions = [];
  const events = [];
  
  // Create 3 fake sessions
  for (let i = 0; i < 3; i++) {
    sessions.push({
      startTime: now - (i * 3600000 * 4),
      durationMs: 1200000 + (Math.random() * 2400000)
    });
  }
  
  // Create 50 fake events
  const platforms = PLATFORMS;
  for (let i = 0; i < 50; i++) {
    const durationMs = 1000 + (Math.random() * 30000);
    events.push({
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      ts: now - (i * 120000),
      durationMs,
      skipped: durationMs < 3000
    });
  }
  
  return {
    sessions: sessions.sort((a, b) => a.startTime - b.startTime),
    events: events.sort((a, b) => a.ts - b.ts)
  };
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
