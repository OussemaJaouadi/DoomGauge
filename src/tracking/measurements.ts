import type { PreviewObservation } from '../types/telemetryPreview';
import type { DaypartFilter } from '../types/telemetryPreview';
import { daypartOfHour } from '../utils/telemetry';
import type { Visit } from './model';
export function toObservation(v:Visit):PreviewObservation {return {id:v.id,platform:v.platform,ts:v.startedAt,endedTs:v.observedAt,durationMs:v.activeMs,videoDurationMs:v.videoDurationMs??null,skipped:v.status==='completed'&&v.activeMs<3000,status:v.status,activeIntervals:v.intervals,countInScope:true};}
const matchesHour=(ts:number,hours:DaypartFilter)=>hours==='all'||(typeof hours==='string'?hours===daypartOfHour(new Date(ts).getHours()):hours.includes(daypartOfHour(new Date(ts).getHours())));
/** Clips recorded active intervals, retaining original identity and start timestamp. */
export function clipObservation(e:PreviewObservation,start:number,end:number,hours:DaypartFilter='all'):PreviewObservation|undefined {
  const counted=e.countInScope!==false&&e.ts>=start&&e.ts<end&&matchesHour(e.ts,hours);
  if(!e.activeIntervals)return counted?e:undefined;
  const intervals:NonNullable<PreviewObservation['activeIntervals']>=[];
  for(const interval of e.activeIntervals){let cursor=Math.max(start,interval.start);const stop=Math.min(end,interval.end);
    while(cursor<stop){const next=new Date(cursor);next.setMinutes(60,0,0);const boundary=Math.min(stop,Math.max(cursor+1,next.getTime()));
      if(matchesHour(cursor,hours))intervals.push({start:cursor,end:boundary});cursor=boundary;
    }
  }
  if(!counted&&!intervals.length)return undefined;
  return {...e,activeIntervals:intervals,durationMs:intervals.reduce((sum,i)=>sum+i.end-i.start,0),countInScope:counted,status:e.endedTs>end?'open':e.status,skipped:counted&&e.endedTs<=end&&e.skipped};
}
export function clipObservations(events:readonly PreviewObservation[],start:number,end:number,hours:DaypartFilter='all'){return events.flatMap(e=>{const scoped=clipObservation(e,start,end,hours);return scoped?[scoped]:[];});}
