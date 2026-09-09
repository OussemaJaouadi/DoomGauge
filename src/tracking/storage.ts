import { acceptRevision, intervalMs, type StoredVisit, type Coverage } from './model';
import { localDateKey } from '../utils/time';
import { PLATFORMS } from '../types/models';
const stores=['visits','trackingCoverage','trackingMeta','rollups'];
export async function openTrackingDatabase(factory:IDBFactory=indexedDB):Promise<IDBDatabase> {
  const open=(version?:number)=>new Promise<IDBDatabase>((resolve,reject)=>{
    const r=factory.open('doomgauge-v1',version);let failed=false;
    r.onupgradeneeded=()=>{const db=r.result;
      if(!db.objectStoreNames.contains('preferences'))db.createObjectStore('preferences');
      if(!db.objectStoreNames.contains('visits')){const s=db.createObjectStore('visits',{keyPath:'id'});s.createIndex('by_end','observedAt');s.createIndex('by_status','status');}
      if(!db.objectStoreNames.contains('trackingCoverage')){const s=db.createObjectStore('trackingCoverage',{keyPath:'id'});s.createIndex('by_end','endTs');}
      if(!db.objectStoreNames.contains('trackingMeta'))db.createObjectStore('trackingMeta');
      if(!db.objectStoreNames.contains('rollups'))db.createObjectStore('rollups',{keyPath:['date','platform']});
    };
    r.onerror=r.onblocked=()=>{failed=true;reject(r.error??Error('Tracking storage unavailable'));};
    r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();if(failed)r.result.close();else resolve(r.result);};
  });
  const db=await open();if(stores.every(s=>db.objectStoreNames.contains(s)))return db;
  const version=db.version+1;db.close();return open(version);
}
const result=<T>(r:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function transaction<T>(names:string[],mode:IDBTransactionMode,run:(tx:IDBTransaction)=>Promise<T>):Promise<T>{
  const db=await openTrackingDatabase();
  try {const tx=db.transaction(names,mode,mode==='readwrite'?{durability:'strict'}:undefined);
    const done=new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(tx.error??Error('Tracking transaction failed'));});
    // Attach a rejection handler immediately even if an individual request also fails.
    void done.catch(()=>{});
    try{const value=await run(tx);await done;return value;}catch(error){try{tx.abort();}catch{}throw error;}
  }finally{db.close();}
}
function datesFor(v:StoredVisit){const dates=new Set([localDateKey(new Date(v.startedAt))]);for(const i of v.intervals){const d=new Date(i.start);d.setHours(0,0,0,0);while(d.getTime()<i.end){dates.add(localDateKey(d));d.setDate(d.getDate()+1);}}return dates;}
export async function saveVisit(visit:StoredVisit){return transaction(['visits','trackingMeta'],'readwrite',async tx=>{
  const s=tx.objectStore('visits');const old=await result(s.get(visit.id)) as StoredVisit|undefined;
  if(!acceptRevision(old,visit))return;
  s.put(visit);for(const date of datesFor(visit))tx.objectStore('trackingMeta').put(true,`dirty:${date}`);
});}
export async function saveCoverage(coverage:Coverage){return transaction(['trackingCoverage'],'readwrite',async tx=>{tx.objectStore('trackingCoverage').put(coverage);});}
export async function readTracking(start:number,end:number){return transaction(['visits','trackingCoverage'],'readonly',async tx=>{
  const vr=tx.objectStore('visits').index('by_end').getAll(IDBKeyRange.lowerBound(start));
  const cr=tx.objectStore('trackingCoverage').index('by_end').getAll(IDBKeyRange.lowerBound(start));
  const [visits,coverage]=await Promise.all([result(vr),result(cr)]);
  return {visits:(visits as StoredVisit[]).filter(v=>v.startedAt<end),coverage:(coverage as Coverage[]).filter(c=>c.startTs<end)};
});}
export async function recoverVisits(alive:ReadonlySet<string>,now=Date.now()) {return transaction(['visits'],'readwrite',async tx=>{
  const s=tx.objectStore('visits');const open=await result(s.index('by_status').getAll('open')) as StoredVisit[];
  for(const v of open)if(now-v.receivedAt>10000&&!alive.has(v.id))s.put({...v,status:'interrupted'});
});}
export async function rebuildRollups(){return transaction(['visits','trackingMeta','rollups'],'readwrite',async tx=>{
  const meta=tx.objectStore('trackingMeta');const keys=await result(meta.getAllKeys());
  for(const key of keys){if(typeof key!=='string'||!key.startsWith('dirty:'))continue;
    const date=key.slice(6),start=new Date(`${date}T00:00:00`),end=new Date(start);end.setDate(end.getDate()+1);
    const visits=await result(tx.objectStore('visits').index('by_end').getAll(IDBKeyRange.lowerBound(start.getTime()))) as StoredVisit[];
    for(const platform of PLATFORMS){const relevant=visits.filter(v=>v.platform===platform&&v.startedAt<end.getTime());const started=relevant.filter(v=>v.startedAt>=start.getTime());
      tx.objectStore('rollups').put({date,platform,reelCount:started.length,skipCount:started.filter(v=>v.status==='completed'&&v.activeMs<3000).length,totalActiveMs:relevant.reduce((sum,v)=>sum+intervalMs(v.intervals,start.getTime(),end.getTime()),0)});
    }meta.delete(key);
  }
});}
