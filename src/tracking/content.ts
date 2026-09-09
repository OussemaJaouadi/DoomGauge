import type { Platform } from '../types/models';
import { VisitTracker } from './engine';
import { Outbox } from './outbox';
import { findReel, type ReelCandidate } from './platforms';
import { sendTracking } from './messages';
import { CHECKPOINT_MS, MAX_SAMPLE_GAP_MS, canAccumulate } from './model';
export function startCollector(platform:Platform) {
  const collectorId=crypto.randomUUID();let candidate:ReelCandidate|undefined;
  let focused=false,leaseUntil=0,stopped=false,lastCheckpoint=0,lastTick=performance.now(),lastWall=Date.now(),heartbeatBusy=false;
  const buffering=new WeakSet<HTMLVideoElement>();
  const outbox=new Outbox(async visit=>{await sendTracking({type:'tracking:visit',visit});},failed=>{
    void Promise.resolve().then(()=>chrome.runtime.sendMessage({type:'tracking:health',failed})).catch(()=>{});
  });
  const tracker=new VisitTracker(collectorId,v=>outbox.put(v));
  const isFocused=()=>focused&&Date.now()<leaseUntil&&document.visibilityState==='visible'&&document.hasFocus();
  const heartbeat=async()=>{
    if(heartbeatBusy||stopped)return;
    if(document.visibilityState!=='visible'||!document.hasFocus()){focused=false;return;}
    heartbeatBusy=true;
    try {const r=await sendTracking<{ok:true;focused:boolean}>({type:'tracking:heartbeat',collectorId,observing:Boolean(findReel(platform))});focused=r.focused;leaseUntil=Date.now()+4000;}
    catch{focused=false;}finally{heartbeatBusy=false;}
  };
  const tick=()=>{
    if(stopped)return;
    const wall=Date.now(),mono=performance.now();
    if(mono-lastTick>MAX_SAMPLE_GAP_MS||Math.abs((wall-lastWall)-(mono-lastTick))>250){tracker.finish(lastWall,lastTick,'interrupted');candidate=undefined;}
    if(!tracker.current && (document.visibilityState!=='visible'||!document.hasFocus())){if(outbox.size && wall-lastCheckpoint>=CHECKPOINT_MS){void outbox.flush();lastCheckpoint=wall;}lastTick=mono;lastWall=wall;return;}
    const next=findReel(platform);
    if(candidate&&(!next||next.key!==candidate.key||next.video!==candidate.video)){tracker.finish(wall,mono);candidate=undefined;}
    if(next&&isFocused()&&!tracker.current){tracker.begin(platform,next.reelId,wall,mono);candidate=next;}
    if(candidate){const video=candidate.video;const eligible=canAccumulate({focused:isFocused(),visible:document.visibilityState==='visible',intersecting:Boolean(next),paused:video.paused,ended:video.ended,seeking:video.seeking,readyState:video.readyState,buffering:buffering.has(video)});
      tracker.sample(eligible,wall,mono,Number.isFinite(video.duration)&&video.duration>0?video.duration*1000:undefined);
    }
    if(wall-lastCheckpoint>=CHECKPOINT_MS){if(tracker.current&&isFocused())tracker.checkpoint();lastCheckpoint=wall;if(outbox.size)void outbox.flush();void heartbeat();}
    lastTick=mono;lastWall=wall;
  };
  const stateChange=(event?:Event)=>{
    if(event?.target instanceof HTMLVideoElement){
      if(event.type==='waiting'||event.type==='stalled')buffering.add(event.target);
      if(event.type==='playing'||event.type==='seeked')buffering.delete(event.target);
    }
    tick();tracker.checkpoint();void heartbeat();
  };
  const hidden=()=>{tick();tracker.checkpoint();};
  const pagehide=()=>{tracker.finish(Date.now(),performance.now(),'completed');candidate=undefined;};
  const message=(message:unknown,_sender:chrome.runtime.MessageSender,reply:(v:unknown)=>void)=>{
    const m=message as {type?:string};if(m?.type==='tracking:probe'){reply({collectorId,visitId:tracker.current?.id});void heartbeat();}
    if(m?.type==='tracking:focus'){focused=false;hidden();void heartbeat();}
    return false;
  };
  chrome.runtime.onMessage.addListener(message);
  const mediaEvents=['play','playing','pause','waiting','stalled','seeking','seeked','ended'];
  mediaEvents.forEach(e=>document.addEventListener(e,stateChange,true));
  document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',hidden);window.addEventListener('focus',stateChange);window.addEventListener('pagehide',pagehide);window.addEventListener('pageshow',stateChange);
  // Observe transitions immediately; the timer is a measurement/route fallback.
  let scheduled=false;
  const schedule=()=>{if(scheduled||stopped)return;scheduled=true;queueMicrotask(()=>{scheduled=false;if(!stopped)tick();});};
  const observed=new Set<HTMLVideoElement>();
  const intersections=new IntersectionObserver(schedule,{threshold:[0,.5,1]});
  const syncVideos=()=>{
    for(const video of observed)if(!video.isConnected){intersections.unobserve(video);observed.delete(video);}
    for(const video of document.querySelectorAll('video'))if(!observed.has(video)){observed.add(video);intersections.observe(video);}
    schedule();
  };
  const mutations=new MutationObserver(syncVideos);
  mutations.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  syncVideos();
  window.addEventListener('popstate',stateChange);document.addEventListener('yt-navigate-finish',stateChange);
  const timer=setInterval(tick,500);void heartbeat().then(tick);
  return ()=>{tracker.finish(Date.now(),performance.now(),'interrupted');stopped=true;clearInterval(timer);mutations.disconnect();intersections.disconnect();observed.clear();window.removeEventListener('popstate',stateChange);document.removeEventListener('yt-navigate-finish',stateChange);chrome.runtime.onMessage.removeListener(message);mediaEvents.forEach(e=>document.removeEventListener(e,stateChange,true));document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',hidden);window.removeEventListener('focus',stateChange);window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',stateChange);};
}
