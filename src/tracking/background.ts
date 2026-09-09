import { platformForUrl } from './platforms';
import { validVisit } from './model';
import { saveVisit, readTracking, saveCoverage, recoverVisits, rebuildRollups } from './storage';
const failures=new Set<number>();
const health=new Map<string,{tabId:number;at:number;focused:boolean;start:number}>();
const extensionPage=(sender:chrome.runtime.MessageSender)=>sender.id===chrome.runtime.id&&Boolean(sender.url?.startsWith(chrome.runtime.getURL('')));
async function focusedTab(tabId:number){const tabs=await chrome.tabs.query({active:true,lastFocusedWindow:true});if(tabs[0]?.id!==tabId)return false;const window=await chrome.windows.get(tabs[0].windowId);return window.focused;}
async function reconcile(){
  const tabs=await chrome.tabs.query({});const alive=new Set<string>();
  await Promise.all(tabs.filter(t=>t.id!==undefined&&platformForUrl(t.url??'')).map(async tab=>{
    try{const response=await Promise.race([chrome.tabs.sendMessage(tab.id!,{type:'tracking:probe'}),new Promise<undefined>(resolve=>setTimeout(resolve,1500))]);if(typeof response?.visitId==='string')alive.add(response.visitId);}catch{}
  }));
  await recoverVisits(alive);await rebuildRollups();
}
export async function handleTrackingMessage(message:unknown,sender:chrome.runtime.MessageSender){
  const m=message as {type?:string;visit?:unknown;collectorId?:unknown;failed?:unknown;observing?:unknown;start?:unknown;end?:unknown};

      if(sender.id!==chrome.runtime.id)throw Error('Invalid sender');
      if(m.type==='tracking:query'){
        if(!extensionPage(sender)||typeof m.start!=='number'||typeof m.end!=='number'||!Number.isFinite(m.start)||!Number.isFinite(m.end)||m.end<=m.start||m.end-m.start>100*86400000)throw Error('Invalid query');
        await rebuildRollups();const data=await readTracking(m.start,m.end);return {ok:true,...data,savingFailed:failures.size>0};
      }
      const platform=platformForUrl(sender.url??'');const tabId=sender.tab?.id;
      if(!platform||tabId===undefined||sender.frameId!==0)throw Error('Invalid collector');
      if(m.type==='tracking:visit'){
        if(!validVisit(m.visit)||m.visit.platform!==platform||m.visit.observedAt>Date.now()+60000)throw Error('Invalid visit');
        await saveVisit({...m.visit,tabId,documentId:sender.documentId??`${tabId}:${m.visit.collectorId}`,receivedAt:Date.now()});failures.delete(tabId);return {ok:true};
      }
      if(m.type==='tracking:heartbeat'){
        if(typeof m.collectorId!=='string'||m.collectorId.length>100)throw Error('Invalid collector ID');
        const focused=await focusedTab(tabId),now=Date.now(),old=health.get(m.collectorId);
        const observed=focused && m.observing === true;
        const continuous=old?.focused&&observed&&now>=old.at&&now-old.at<5000;
        const start=continuous?old.start:now;
        if(continuous)await saveCoverage({id:`${m.collectorId}:${start}`,tabId,startTs:start,endTs:now});
        health.set(m.collectorId,{tabId,at:now,focused:observed,start});return {ok:true,focused};
      }
      if(m.type==='tracking:health'){if(m.failed===true)failures.add(tabId);else failures.delete(tabId);await chrome.action.setBadgeText({text:failures.size?'!':''});return {ok:true};}
      throw Error('Unknown tracking message');
}
export function installTrackingBackground(){
  chrome.runtime.onMessage.addListener((message:unknown,sender,reply)=>{
    const m=message as {type?:string;visit?:unknown;collectorId?:unknown;failed?:unknown;observing?:unknown;start?:unknown;end?:unknown};
    if(typeof m?.type!=='string'||!m.type.startsWith('tracking:'))return false;

    void handleTrackingMessage(message,sender).then(reply,error=>{console.error('Tracking operation failed',error);reply({ok:false});});return true;
  });
  const focusChanged=()=>{for(const value of health.values())value.focused=false;void chrome.tabs.query({}).then(tabs=>Promise.all(tabs.filter(t=>t.id!==undefined&&platformForUrl(t.url??'')).map(t=>chrome.tabs.sendMessage(t.id!,{type:'tracking:focus'}).catch(()=>{}))));};
  chrome.tabs.onActivated.addListener(focusChanged);chrome.windows.onFocusChanged.addListener(focusChanged);
  chrome.tabs.onRemoved.addListener(tabId=>{failures.delete(tabId);for(const [key,value] of health)if(value.tabId===tabId)health.delete(key);});
  chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='tracking-maintenance')void reconcile().catch(console.error);});
  void chrome.alarms.create('tracking-maintenance',{periodInMinutes:1});
  void reconcile().catch(console.error);
}
