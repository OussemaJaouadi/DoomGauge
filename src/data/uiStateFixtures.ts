import { type Platform, type PlatformStats } from '../types/models';
import type { DataPreset } from '../components/ui/stateModel';
import { POPUP_VIEWS, POPUP_YESTERDAY_VIEWS, POPUP_AS_OF_HOUR } from './popupMock';
import { buildHourlyItems, deriveTemporalInsights, groupActivitySessions, summarizePopupViews, summarizeViewingDistribution } from '../utils/popupActivity';

export function popupStateFixture(preset: DataPreset) {
  const views = preset === 'zero' || preset === 'filtered' || preset === 'previousOnly' ? [] : preset === 'insufficient' ? POPUP_VIEWS.slice(0, 1) : POPUP_VIEWS;
  const previousViews = preset === 'zero' || preset === 'filtered' || preset === 'insufficient' ? [] : POPUP_YESTERDAY_VIEWS;
  const today = summarizePopupViews(views), previous = summarizePopupViews(previousViews);
  const platforms = { youtube: today.platforms.find(item => item.platform === 'youtube')!, instagram: today.platforms.find(item => item.platform === 'instagram')!, facebook: today.platforms.find(item => item.platform === 'facebook')! } satisfies Record<Platform, PlatformStats>;
  const hourly = buildHourlyItems(platforms, POPUP_AS_OF_HOUR);
  return { mock: { ...today, yesterdayMs: previous.totalMs, yesterdayCount: previous.totalCount }, platforms, hourly, insights: deriveTemporalInsights(groupActivitySessions(views), hourly), distribution: summarizeViewingDistribution(views) };
}
