import { QUICK_SKIP_MS, SESSION_BREAK_MS } from '../config/tracking';
import { PLATFORMS } from '../types/models';
import type { HourItem, Platform, PlatformStats } from '../types/models';
import type {
  PopupActivitySession,
  PopupMockView,
  TemporalDaySummary,
  TemporalInsights,
  TemporalVortex,
  ViewingDistribution,
  ViewingDistributionBucket,
} from '../types/popup';
import { DURATION_BUCKETS } from '../types/telemetry';
import { avgFlickSec, impatiencePct } from './metrics';

export { SESSION_BREAK_MS } from '../config/tracking';
export type {
  TemporalDaySummary,
  TemporalInsights,
  TemporalVortex,
  ViewingDistribution,
  ViewingDistributionBucket,
} from '../types/popup';

/** Completed observations in a local day's preview window. No duration inference. */
export function viewsThroughCutoff(views: readonly PopupMockView[], dayStart: number, cutoff: number) {
  return views.filter(view => view.startedAt >= dayStart && view.startedAt < cutoff && view.endedAt <= cutoff);
}

/**
 * Appends a new view to a chronological sessions array in O(1) time.
 * If the break since the last session's end is <= SESSION_BREAK_MS, extends the session in-place.
 * Otherwise creates a new session. Ideal for real-time streaming updates.
 */
export function appendViewToSessions(
  sessions: PopupActivitySession[],
  view: PopupMockView
): PopupActivitySession[] {
  const current = sessions[sessions.length - 1];
  if (!current || view.startedAt - current.endedAt > SESSION_BREAK_MS) {
    sessions.push({
      id: view.id,
      startedAt: view.startedAt,
      endedAt: view.endedAt,
      activeMs: view.activeMs,
      reelCount: view.countInScope === false ? 0 : 1,
      platforms: [view.platform],
    });
  } else {
    current.endedAt = Math.max(current.endedAt, view.endedAt);
    current.activeMs += view.activeMs;
    current.reelCount += view.countInScope === false ? 0 : 1;
    if (!current.platforms.includes(view.platform)) {
      current.platforms.push(view.platform);
    }
  }
  return sessions;
}

export function groupActivitySessions(views: readonly PopupMockView[]): PopupActivitySession[] {
  const sessions: PopupActivitySession[] = [];
  const sorted = [...views].sort((a, b) => a.startedAt - b.startedAt || a.id.localeCompare(b.id));
  for (const view of sorted) {
    appendViewToSessions(sessions, view);
  }
  return sessions;
}

export function mostActiveSession(sessions: readonly PopupActivitySession[]) {
  return sessions.reduce<PopupActivitySession | undefined>((best, session) =>
    !best || session.activeMs > best.activeMs ||
    (session.activeMs === best.activeMs && session.startedAt < best.startedAt) ? session : best,
  undefined);
}

export function summarizePopupViews(views: readonly PopupMockView[]) {
  const totalMs = views.reduce((sum, view) => sum + view.activeMs, 0);
  const platforms = PLATFORMS.map(platform => {
    const platformViews = views.filter(view => view.platform === platform);
    const count = platformViews.filter(v => v.countInScope !== false).length;
    const completedCount = platformViews.filter(v => v.completed !== false && v.countInScope !== false).length;
    const timeMs = platformViews.reduce((sum, view) => sum + view.activeMs, 0);
    const skip = platformViews.filter(view => view.completed !== false && view.countInScope !== false && (view.skipped ?? view.activeMs < QUICK_SKIP_MS)).length;
    const measured = platformViews.filter(view => view.completed !== false && view.countInScope !== false && Number.isFinite(view.videoDurationMs) && view.videoDurationMs! > 0);
    const early = measured.filter(view => view.activeMs / view.videoDurationMs! < 0.5).length;
    const hourly = Array.from({ length: 24 }, () => 0);
    for (const view of platformViews.filter(v => v.countInScope !== false)) hourly[new Date(view.startedAt).getHours()]! += 1;
    return {
      platform, count, completedCount, timeMs, skip, hourly,
      avgFlick: avgFlickSec(timeMs, count),
      velocity: timeMs > 0 ? (count / (timeMs / 60000)).toFixed(1) : '0.0',
      share: totalMs > 0 ? Math.round(timeMs / totalMs * 100) : 0,
      earlyExit: measured.length ? `${early} / ${measured.length} measured` : 'No measured video lengths',
    } satisfies PlatformStats & { platform: typeof platform };
  });
  const totalSkips = platforms.reduce((sum, p) => sum + p.skip, 0);
  const totalCount = platforms.reduce((sum,p)=>sum+p.count,0), totalCompleted = platforms.reduce((sum,p)=>sum+p.completedCount,0);
  return { totalMs, totalCount, totalCompleted, totalSkips, platforms, impatience: impatiencePct(totalSkips, totalCompleted) };
}

export function deltaTrend(delta: number): 'worse' | 'better' | 'neutral' {
  return delta > 0 ? 'worse' : delta < 0 ? 'better' : 'neutral';
}

/** Buckets use active viewing duration, never video length or elapsed span. */
export function summarizeViewingDistribution(views: readonly PopupMockView[]): ViewingDistribution {
  const buckets = DURATION_BUCKETS.map(bucket => ({
    label: bucket.label,
    upperMs: bucket.upper,
    count: 0,
    activeMs: 0,
  }));
  const durations = views.filter(view=>view.countInScope!==false).map(view => view.activeMs).sort((a, b) => a - b);
  for (const view of views) {
    const activeMs=view.activeMs;
    const bucket = buckets.find(bucket => activeMs < bucket.upperMs)!;
    bucket.count += view.countInScope === false ? 0 : 1;
    bucket.activeMs += activeMs;
  }
  const totalMs = views.reduce((sum, view) => sum + view.activeMs, 0);
  const middle = Math.floor(durations.length / 2);
  const medianMs = durations.length === 0 ? null : durations.length % 2
    ? durations[middle]!
    : (durations[middle - 1]! + durations[middle]!) / 2;
  return {
    totalCount: durations.length,
    totalMs,
    medianMs,
    buckets: buckets.map(bucket => ({
      ...bucket,
      countPct: durations.length ? bucket.count / durations.length * 100 : 0,
      timePct: totalMs ? bucket.activeMs / totalMs * 100 : 0,
    })),
  };
}

export function formatActivityClock(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Builds an HourItem[] array from platform hourly stats through an optional cutoff hour. */
export function buildHourlyItems(
  platforms: Record<Platform, PlatformStats>,
  throughHour: number = 24
): HourItem[] {
  return Array.from({ length: Math.min(24, Math.max(0, throughHour)) }, (_, hour) => {
    const youtube = platforms.youtube.hourly[hour] ?? 0;
    const instagram = platforms.instagram.hourly[hour] ?? 0;
    const facebook = platforms.facebook.hourly[hour] ?? 0;
    return {
      hour,
      label: String(hour).padStart(2, '0'),
      youtube,
      instagram,
      facebook,
      total: youtube + instagram + facebook,
    };
  });
}

/** Increments the hourly bucket in O(1) time when a new view arrives in real-time. */
export function updateHourlyBuckets(
  hourly: HourItem[],
  view: PopupMockView
): HourItem[] {
  const hour = new Date(view.startedAt).getHours();
  const bucket = hourly[hour];
  if (bucket) {
    bucket[view.platform] = (bucket[view.platform] ?? 0) + 1;
    bucket.total = (bucket.total ?? 0) + 1;
  }
  return hourly;
}

/**
 * Summarizes observed sessions, selecting the greatest active watch time.
 * Residual elapsed time describes pauses/gaps, not their cause or a mental state.
 */
export function deriveTemporalInsights(
  sessions: readonly PopupActivitySession[],
  hourly: readonly HourItem[]
): TemporalInsights {
  const worst = mostActiveSession(sessions);
  let worstVortex: TemporalVortex | null = null;

  if (worst) {
    const elapsedMs = Math.max(0, worst.endedAt - worst.startedAt);
    const gapMs = Math.max(0, elapsedMs - worst.activeMs);
    worstVortex = {
      startTime: formatActivityClock(worst.startedAt),
      endTime: formatActivityClock(worst.endedAt),
      activeMs: worst.activeMs,
      elapsedMs,
      gapMs,
      reelCount: worst.reelCount,
      platforms: worst.platforms,
    };
  }

  const sessionCount = sessions.length;
  const totalActiveMs = sessions.reduce((acc, s) => acc + s.activeMs, 0);
  const totalElapsedMs = sessions.reduce((acc, s) => acc + Math.max(0, s.endedAt - s.startedAt), 0);
  const totalReelCount = sessions.reduce((acc, s) => acc + s.reelCount, 0);
  const avgSessionActiveMs = sessionCount > 0 ? Math.round(totalActiveMs / sessionCount) : 0;
  const worstReelCount = worst ? worst.reelCount : 0;
  const concentrationPct = totalReelCount > 0 && worstReelCount > 0
    ? Math.round((worstReelCount / totalReelCount) * 100)
    : 0;

  return {
    worstVortex,
    daySummary: {
      sessionCount,
      totalActiveMs,
      totalElapsedMs,
      avgSessionActiveMs,
      concentrationPct,
      activeConcentrationPct: totalActiveMs > 0 && worst
        ? Math.round(worst.activeMs / totalActiveMs * 100) : 0,
      worstReelCount,
      totalReelCount,
    },
  };
}
