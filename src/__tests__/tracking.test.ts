import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { VisitTracker } from '../tracking/engine';
import { Outbox } from '../tracking/outbox';
import { validVisit, acceptRevision, canAccumulate, type Visit, type StoredVisit } from '../tracking/model';
import { saveVisit, readTracking, recoverVisits, rebuildRollups, openTrackingDatabase, saveCoverage } from '../tracking/storage';
import { readTheme, writeTheme } from '../theme/storage';
import { clipObservations, toObservation } from '../tracking/measurements';
import { observationTotals, observationRollups, trajectoryRows, selectObservations } from '../utils/telemetryPreview';
import { livePopup } from '../tracking/popup';
import { calendarEvidence } from '../utils/evidenceCalendar';
import { evidenceEvents } from '../utils/telemetryWorkspace';
import { filterReelRecords } from '../utils/reelRecords';
import { platformForUrl, reelIdentity, visibleFraction, findReel } from '../tracking/platforms';
import { hasObservationCoverage } from '../utils/telemetryInsights';
declare function test(name:string,fn:()=>void|Promise<void>):void;
declare function expect(value:unknown):{toBe(v:unknown):void;toEqual(v:unknown):void;toThrow():void};
function fresh(){Object.assign(globalThis,{indexedDB:new IDBFactory(),IDBKeyRange});}
const record=(patch:Partial<StoredVisit>={}):StoredVisit=>({id:'visit',collectorId:'collector',platform:'youtube',startedAt:1000,observedAt:2000,activeMs:1000,intervals:[{start:1000,end:2000}],revision:1,status:'open',tabId:1,documentId:'doc',receivedAt:2000,...patch});
const get=<T>(r:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
test('tracker emits start immediately, measures elapsed time, excludes pauses and buffering',()=>{
  const saved:Visit[]=[];const t=new VisitTracker('c',v=>saved.push(v),()=> 'v');
  t.begin('youtube','reel',1000,0);expect(saved[0]!.activeMs).toBe(0);
  t.sample(true,1000,0);t.sample(false,1400,400);t.sample(false,1900,900);t.sample(true,2000,1000);t.sample(false,2400,1400);t.finish(2500,1500);
  const last=saved.at(-1)!;expect(last.activeMs).toBe(800);expect(last.intervals).toEqual([{start:1000,end:1400},{start:2000,end:2400}]);expect(last.status).toBe('completed');expect(validVisit(last)).toBe(true);
});
test('loops keep identity; a new encounter creates another visit',()=>{
  const saved:Visit[]=[];let id=0;const t=new VisitTracker('c',v=>saved.push(v),()=> String(++id));
  t.begin('instagram','same',1000,0);t.sample(true,1000,0);t.sample(true,1500,500);t.sample(true,2000,1000);t.checkpoint();
  expect(saved.at(-1)!.id).toBe('1');t.begin('instagram','same',2100,1100);expect(saved.at(-1)!.id).toBe('2');
});
test('sleep, timer stalls and clock changes do not invent watch time',()=>{
  const t=new VisitTracker('c',()=>{},()=> 'v');t.begin('facebook',undefined,1000,0);t.sample(true,1000,0);
  t.sample(true,61000,60000);expect(t.current!.activeMs).toBe(0);
  t.sample(true,61500,60500);expect(t.current!.activeMs).toBe(500);
  t.sample(true,1000,61000);expect(t.current!.activeMs).toBe(500);
});
test('malformed snapshots and interval rewrites are rejected',()=>{
  expect(validVisit(record())).toBe(true);expect(validVisit(record({activeMs:2}))).toBe(false);
  expect(validVisit(record({intervals:[{start:2000,end:1000}]}))).toBe(false);
  expect(()=>acceptRevision(record(),record({revision:2,intervals:[{start:1001,end:2001}],observedAt:2001}))).toThrow();
  expect(()=>acceptRevision(record(),record({revision:2,tabId:2}))).toThrow();
});
test('outbox retains failed writes and replaces them with latest cumulative snapshot',async()=>{
  let fail=true;const received:number[]=[];const failures:boolean[]=[];
  const box=new Outbox(async v=>{if(fail)throw Error();received.push(v.revision);},v=>failures.push(v));
  box.put(record());await Promise.resolve();await Promise.resolve();expect(box.size).toBe(1);
  box.put(record({revision:2}));await Promise.resolve();await Promise.resolve();fail=false;await box.flush();
  expect(received).toEqual([2]);expect(box.size).toBe(0);expect(failures.at(-1)).toBe(false);
});
test('a lost acknowledgment can be retried after commit without duplicate count or time',async()=>{
  fresh();await saveVisit(record());await saveVisit(record());await saveVisit(record({revision:2,observedAt:2500,activeMs:1500,intervals:[{start:1000,end:2500}]}));await saveVisit(record());
  const data=await readTracking(0,4000);expect(data.visits.length).toBe(1);expect(data.visits[0]!.activeMs).toBe(1500);
});
test('concurrent upserts retain highest revision and isolate other tabs',async()=>{
  fresh();await Promise.all([saveVisit(record({revision:2})),saveVisit(record()),saveVisit(record({id:'other',tabId:2,documentId:'two'}))]);
  const data=await readTracking(0,4000);expect(data.visits.length).toBe(2);expect(data.visits.find(v=>v.id==='visit')!.revision).toBe(2);
});
test('migration preserves preferences and legacy event stores',async()=>{
  fresh();await writeTheme('dark');const old=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('doomgauge-v1',2);r.onupgradeneeded=()=>r.result.createObjectStore('events');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const tx=old.transaction('events','readwrite');tx.objectStore('events').put({old:true},'legacy');await new Promise<void>(r=>{tx.oncomplete=()=>r();});old.close();
  const db=await openTrackingDatabase();expect(await get(db.transaction('events').objectStore('events').get('legacy'))).toEqual({old:true});db.close();expect(await readTheme()).toBe('dark');
});
test('recovery retains saved measurements, spares surviving visits and accepts delayed final save',async()=>{
  fresh();await saveVisit(record());await saveVisit(record({id:'alive'}));await recoverVisits(new Set(['alive']),20000);
  let data=await readTracking(0,4000);expect(data.visits.find(v=>v.id==='visit')!.status).toBe('interrupted');expect(data.visits.find(v=>v.id==='visit')!.observedAt).toBe(2000);expect(data.visits.find(v=>v.id==='alive')!.status).toBe('open');
  await saveVisit(record({revision:2,status:'completed'}));data=await readTracking(0,4000);expect(data.visits.find(v=>v.id==='visit')!.status).toBe('completed');
});
test('interrupted and in-progress visits retain totals but are not quick skips',()=>{
  const events=['open','interrupted','completed'].map((status,i)=>toObservation(record({id:String(i),status:status as Visit['status']})));
  expect(observationTotals(events).reels).toBe(3);expect(observationTotals(events).skips).toBe(1);expect(observationTotals(events).skipPct).toBe(100);
  expect(filterReelRecords(events,{platforms:['youtube'],quickSkips:true,from:'',to:''},'started',false).length).toBe(1);
});
test('midnight time splits without duplicating counts; popup, chart, calendar and rollup agree',async()=>{
  fresh();const start=new Date(2026,8,8,23,59,59).getTime(),midnight=new Date(2026,8,9).getTime(),end=midnight+1000;
  const v=record({startedAt:start,observedAt:end,intervals:[{start,end}],activeMs:2000,status:'completed'});await saveVisit(v);await rebuildRollups();
  const events=[toObservation(v)];const rolls=observationRollups(events,['2026-09-08','2026-09-09']);
  expect(rolls.filter(r=>r.platform==='youtube').map(r=>[r.reelCount,r.totalActiveMs])).toEqual([[1,1000],[0,1000]]);
  const db=await openTrackingDatabase();const persisted=await get(db.transaction('rollups').objectStore('rollups').get(['2026-09-09','youtube']));db.close();expect(persisted.totalActiveMs).toBe(1000);expect(persisted.reelCount).toBe(0);
  const popup=livePopup(events,new Date(end+1));expect(popup.mock.totalMs).toBe(1000);expect(popup.mock.totalCount).toBe(0);
  const selected=selectObservations(events,midnight,end+1,'overview','all');expect(observationTotals(selected).activeMs).toBe(1000);
  const chart=trajectoryRows(selected,[],['2026-09-09'],['2026-09-08'],true,'time');expect(chart[0]!.youtube*60000).toBe(1000);
  const day=calendarEvidence(['2026-09-09'],selected,[],[])[0]!;expect(day.activeMs).toBe(1000);expect(day.reels).toBe(0);
  expect(evidenceEvents(selected,{kind:'day',date:'2026-09-09',hour:0})[0]!.durationMs).toBe(1000);
});
test('hour/daypart clipping excludes pauses without moving a visit start',()=>{
  const start=new Date(2026,8,9,11,59,59).getTime(),end=start+3000;
  const event=toObservation(record({startedAt:start,observedAt:end,activeMs:2000,intervals:[{start,end:start+1000},{start:start+2000,end}]}));
  const scoped=clipObservations([event],start,end,'AFTERNOON');expect(scoped[0]!.durationMs).toBe(1000);expect(scoped[0]!.ts).toBe(start);expect(observationTotals(scoped).reels).toBe(0);
});
test('coverage stays bounded to observed intervals and gaps cannot qualify follow-up',async()=>{
  fresh();await saveCoverage({id:'c',tabId:1,startTs:1000,endTs:2000});await saveCoverage({id:'c',tabId:1,startTs:1000,endTs:3000});
  const {coverage}=await readTracking(0,10000);expect(coverage.length).toBe(1);expect(hasObservationCoverage(coverage,1000,3000)).toBe(true);expect(hasObservationCoverage(coverage,1000,3001)).toBe(false);
});
test('all platform identities reject unrelated routes and strip query data',()=>{
  expect(reelIdentity('youtube','https://www.youtube.com/shorts/abc?secret=1')).toBe('abc');
  expect(reelIdentity('instagram','https://www.instagram.com/reel/Ab_12/')).toBe('Ab_12');
  expect(reelIdentity('facebook','https://www.facebook.com/reel/123/')).toBe('123');
  expect(reelIdentity('youtube','https://www.youtube.com/watch?v=abc')).toBe(undefined);
  expect(platformForUrl('https://www.youtube.com.evil.test/shorts/x')).toBe(undefined);
  expect(visibleFraction({left:0,right:100,top:-50,bottom:50,width:100,height:100},100,100)).toBe(.5);
});
test('platform adapters select visible reel videos and reject ordinary feed videos',()=>{
  Object.assign(globalThis,{innerWidth:100,innerHeight:100});
  const video={currentSrc:'blob:video',closest:()=>null,parentElement:{querySelector:()=>null},getBoundingClientRect:()=>({left:0,right:100,top:0,bottom:100,width:100,height:100})};
  for(const [platform,url] of [['youtube','https://www.youtube.com/shorts/a'],['instagram','https://www.instagram.com/reels/a/'],['facebook','https://www.facebook.com/reel/1/']] as const){const doc={location:new URL(url),querySelectorAll:()=>[video]};expect(findReel(platform,doc as unknown as Document)?.video).toBe(video);}
  const doc={location:new URL('https://www.facebook.com/'),querySelectorAll:()=>[video]};expect(findReel('facebook',doc as unknown as Document)).toBe(undefined);
});

test('transaction abort rejects saving and leaves the previous committed snapshot intact',async()=>{
  fresh();await saveVisit(record());const db=await openTrackingDatabase();const tx=db.transaction('visits','readwrite');
  tx.objectStore('visits').put(record({revision:9,activeMs:0,intervals:[]}));tx.abort();db.close();
  const data=await readTracking(0,4000);expect(data.visits[0]!.revision).toBe(1);expect(data.visits[0]!.activeMs).toBe(1000);
  const rejected=await saveVisit(record({revision:2,tabId:99})).then(()=>false,()=>true);expect(rejected).toBe(true);
  expect((await readTracking(0,4000)).visits[0]!.revision).toBe(1);
});
test('dirty rollups are rebuilt after repeated checkpoints and completed quick skips update once',async()=>{
  fresh();await saveVisit(record());await rebuildRollups();await saveVisit(record({revision:2,status:'completed'}));await saveVisit(record({revision:2,status:'completed'}));await rebuildRollups();
  const db=await openTrackingDatabase();const rolls=await get(db.transaction('rollups').objectStore('rollups').getAll());db.close();
  const yt=rolls.find(r=>r.platform==='youtube');expect(yt.reelCount).toBe(1);expect(yt.totalActiveMs).toBe(1000);expect(yt.skipCount).toBe(1);
});

test('only focused visible playing media can accumulate; every pause condition wins',()=>{
  const active={focused:true,visible:true,intersecting:true,paused:false,ended:false,seeking:false,readyState:4,buffering:false};
  expect(canAccumulate(active)).toBe(true);
  for(const patch of [{focused:false},{visible:false},{intersecting:false},{paused:true},{ended:true},{seeking:true},{readyState:2},{buffering:true}])expect(canAccumulate({...active,...patch})).toBe(false);
});
test('a historical cutoff does not use a later completion to classify a quick skip',()=>{
  const e=toObservation(record({status:'completed'}));const scoped=clipObservations([e],0,1500);
  expect(scoped[0]!.status).toBe('open');expect(observationTotals(scoped).skipPct).toBe(null);expect(observationTotals(scoped).activeMs).toBe(500);
});

test('background admits only matching main-frame collectors and extension-page queries',async()=>{
  fresh();const original=globalThis.chrome;
  Object.assign(globalThis,{chrome:{runtime:{id:'extension',getURL:()=> 'chrome-extension://extension/'}}});
  try{
    const {handleTrackingMessage}=await import('../tracking/background');
    const sender={id:'extension',url:'https://www.youtube.com/shorts/a',frameId:0,documentId:'document',tab:{id:1}} as chrome.runtime.MessageSender;
    expect(await handleTrackingMessage({type:'tracking:visit',visit:record()},sender)).toEqual({ok:true});
    for(const invalid of [{...sender,frameId:1},{...sender,id:'other'},{...sender,url:'https://www.facebook.com/reel/a'}])expect(await handleTrackingMessage({type:'tracking:visit',visit:record()},invalid).then(()=>false,()=>true)).toBe(true);
    expect(await handleTrackingMessage({type:'tracking:query',start:0,end:4000},sender).then(()=>false,()=>true)).toBe(true);
    const result=await handleTrackingMessage({type:'tracking:query',start:0,end:4000},{id:'extension',url:'chrome-extension://extension/popup.html'});
    expect('visits' in result ? result.visits.length : -1).toBe(1);
  }finally{Object.assign(globalThis,{chrome:original});}
});
