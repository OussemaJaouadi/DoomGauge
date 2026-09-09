import { useCallback, useEffect, useState, useMemo } from 'react';
import type { Coverage, StoredVisit } from './model';
import { sendTracking } from './messages';
import { toObservation } from './measurements';
interface Data {visits:StoredVisit[];coverage:Coverage[];savingFailed:boolean}
const empty:Data={visits:[],coverage:[],savingFailed:false};
export function useTracking(start:number,end:number,enabled=true){
  const [data,setData]=useState(empty),[status,setStatus]=useState<'loading'|'success'|'error'>('loading'),[revision,setRevision]=useState(0);
  const retry=useCallback(()=>setRevision(v=>v+1),[]);
  useEffect(()=>{if(!enabled)return;let alive=true,busy=false;setStatus('loading');setData(empty);
    const read=async()=>{if(busy)return;busy=true;try{const next=await sendTracking<Data>({type:'tracking:query',start,end},8000);if(alive){setData(next);setStatus('success');}}catch{if(alive)setStatus('error');}finally{busy=false;}};
    void read();const timer=setInterval(()=>{if(document.visibilityState==='visible')void read();},2000);
    return()=>{alive=false;clearInterval(timer);};
  },[start,end,enabled,revision]);
  const events=useMemo(()=>data.visits.map(toObservation),[data.visits]);
  return {...data,events,status,retry};
}
