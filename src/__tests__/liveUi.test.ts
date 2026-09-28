import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TelemetryOverview } from '../components/telemetry/TelemetryOverview';
import { ReturnsControl } from '../components/telemetry/ReturnsControl';
import { ReelRecords } from '../components/telemetry/ReelRecords';
import { WorkspaceCanvas } from '../components/telemetry/WorkspaceCanvas';
import { observationTotals } from '../utils/telemetryPreview';
import { toObservation } from '../utils/trackingMeasurements';
import type { Visit } from '../types/tracking';
declare function test(name:string,fn:()=>void):void;
declare function expect(value:unknown):{toBe(v:unknown):void};
const startedAt=new Date(2026,8,9,1).getTime();
const events=(['open','completed','interrupted'] as const).map((status,i)=>toObservation({id:String(i),collectorId:'c',platform:'youtube',startedAt,observedAt:startedAt+1000,activeMs:1000,intervals:[{start:startedAt,end:startedAt+1000}],revision:1,status} satisfies Visit));
const plain=(markup:string)=>markup.replace(/<[^>]*>/g,'');
test('live overview labels the completed denominator and hides unsupported comparisons',()=>{
  const html=plain(renderToStaticMarkup(createElement(TelemetryOverview,{totals:observationTotals(events),previous:observationTotals([]),rates:[],comparisonAvailable:false,onInspect:()=>{}})));
  expect(html.includes('1 / 1 completed')).toBe(true);expect(html.includes('100.0%')).toBe(true);expect(html.includes('vs previous')).toBe(false);
});
test('records expose in-progress and interrupted status without changing top pagination',()=>{
  const html=renderToStaticMarkup(createElement(ReelRecords,{events}));
  expect(html.includes('In progress')).toBe(true);expect(html.includes('Interrupted')).toBe(true);expect(html.includes('Completed')).toBe(true);
  expect(html.indexOf('Reel record pages')<html.indexOf('<table>')).toBe(true);
});
test('unknown empty trend buckets are unavailable rather than zero',()=>{
  const html=plain(renderToStaticMarkup(createElement(WorkspaceCanvas,{view:'trends',events,previous:[],sessions:[],windows:[],dates:['2026-09-09'],previousDates:['2026-09-08'],activityDates:[],page:'overview',throughHour:1,onInspect:()=>{},coverage:[]})));
  expect(html.includes('00:00—')).toBe(true);expect(html.includes('01:003s')).toBe(true);
});

test('observed returns remain readable when coverage cannot support a percentage',()=>{
  const rate={minutes:5,observedCount:1,observedMatches:[],eligibleCount:0,returnedCount:0,percentage:null,matches:[]};
  const html=plain(renderToStaticMarkup(createElement(ReturnsControl,{rates:[rate],onInspect:()=>{}})));
  expect(html.includes('Observed returns')).toBe(true);
  expect(html.includes('1')).toBe(true);
  expect(html.includes('NaN%')).toBe(false);
});

test('records open directly in the selected telemetry view',()=>{
  const html=plain(renderToStaticMarkup(createElement(WorkspaceCanvas,{view:'records',events,previous:[],sessions:[],windows:[],dates:['2026-09-09'],previousDates:['2026-09-08'],activityDates:[],page:'overview',throughHour:1,onInspect:()=>{},coverage:[]})));
  expect(html.includes('Reel records')).toBe(true);
  expect(html.includes('3 in selection')).toBe(true);
});

test('the trend omits a previous period when tracking coverage cannot support comparison',()=>{
  const html=plain(renderToStaticMarkup(createElement(WorkspaceCanvas,{view:'trends',events,previous:events,sessions:[],windows:[],dates:['2026-09-09'],previousDates:['2026-09-08'],activityDates:[],page:'overview',throughHour:1,onInspect:()=>{},coverage:[],comparisonAvailable:false})));
  expect(html.includes('Selected period')).toBe(true);
  expect(html.includes('Previous period')).toBe(false);
});
