import { PLATFORMS, type Platform, type PlatformStats } from '../types/models';
import type { PreviewObservation } from '../types/telemetryPreview';
import { clipObservations } from './measurements';
import { buildHourlyItems, summarizePopupViews, summarizeViewingDistribution, groupActivitySessions, deriveTemporalInsights } from '../utils/popupActivity';
export function livePopup(events:PreviewObservation[],now:Date){
  const start=new Date(now);start.setHours(0,0,0,0);const previousStart=new Date(start);previousStart.setDate(previousStart.getDate()-1);const previousEnd=new Date(now);previousEnd.setDate(previousEnd.getDate()-1);
  const convert=(start:number,end:number)=>clipObservations(events,start,end).map(e=>({id:e.id,platform:e.platform,startedAt:e.ts,endedAt:Math.min(e.endedTs,end),activeMs:e.durationMs,videoDurationMs:e.videoDurationMs??undefined,completed:!e.status||e.status==='completed',countInScope:e.countInScope,skipped:e.skipped}));
  const views=convert(start.getTime(),now.getTime()),previousViews=convert(previousStart.getTime(),previousEnd.getTime());
  const today=summarizePopupViews(views),previous=summarizePopupViews(previousViews);
  const platforms=Object.fromEntries(PLATFORMS.map(p=>[p,today.platforms.find(v=>v.platform===p)!])) as unknown as Record<Platform,PlatformStats>;
  const hourly=buildHourlyItems(platforms,now.getHours()+1);
  return {mock:{...today,yesterdayMs:previous.totalMs,yesterdayCount:previous.totalCount},platforms,hourly,insights:deriveTemporalInsights(groupActivitySessions(views),hourly),distribution:summarizeViewingDistribution(views)};
}
