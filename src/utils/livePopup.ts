import type { Platform, PlatformStats } from '../types/models';
import type { PreviewObservation as Observation } from '../types/telemetryPreview';
import { clipObservations } from './trackingMeasurements';
import { buildHourlyItems, summarizePopupViews, summarizeViewingDistribution, groupActivitySessions, deriveTemporalInsights } from './popupActivity';

export function livePopup(events: Observation[], now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - 1);
  const previousEnd = new Date(now);
  previousEnd.setDate(previousEnd.getDate() - 1);

  function viewsBetween(start: number, end: number) {
    return clipObservations(events, start, end).map(event => ({
      id: event.id, platform: event.platform, startedAt: event.ts,
      endedAt: Math.min(event.endedTs, end), activeMs: event.durationMs,
      videoDurationMs: event.videoDurationMs ?? undefined,
      completed: !event.status || event.status === 'completed',
      countInScope: event.countInScope, skipped: event.skipped,
    }));
  }

  const views = viewsBetween(start.getTime(), now.getTime());
  const previousViews = viewsBetween(previousStart.getTime(), previousEnd.getTime());
  const today = summarizePopupViews(views);
  const previous = summarizePopupViews(previousViews);
  const statsFor = (platform: Platform) => today.platforms.find(stats => stats.platform === platform)!;
  const platforms = {
    youtube: statsFor('youtube'), instagram: statsFor('instagram'), facebook: statsFor('facebook'),
  } satisfies Record<Platform, PlatformStats>;
  const hourly = buildHourlyItems(platforms, now.getHours() + 1);
  return {
    summary: { ...today, yesterdayMs: previous.totalMs, yesterdayCount: previous.totalCount },
    platforms, hourly,
    readInsights() {
      return deriveTemporalInsights(groupActivitySessions(views), hourly);
    },
    readDistribution() {
      return summarizeViewingDistribution(views);
    },
  };
}
