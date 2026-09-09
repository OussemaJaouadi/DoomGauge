import type { Platform } from '../types/models';
export const hosts:Record<Platform,string>={youtube:'www.youtube.com',instagram:'www.instagram.com',facebook:'www.facebook.com'};
export function platformForUrl(url:string):Platform|undefined {try {const host=new URL(url).hostname;return (Object.keys(hosts) as Platform[]).find(p=>hosts[p]===host);}catch{return undefined;}}
export function reelIdentity(platform:Platform,url:string):string|undefined {
  try {const path=new URL(url).pathname;const pattern=platform==='youtube'?/^\/shorts\/([^/]+)/:platform==='instagram'?/^\/reels?\/([^/]+)/:/^\/reels?\/([^/]+)/;
    const id=path.match(pattern)?.[1];return id&&/^[\w-]+$/.test(id)?id:undefined;
  }catch{return undefined;}
}
export function visibleFraction(rect:Pick<DOMRect,'left'|'right'|'top'|'bottom'|'width'|'height'>,width:number,height:number){const area=rect.width*rect.height;return area>0?Math.max(0,Math.min(width,rect.right)-Math.max(0,rect.left))*Math.max(0,Math.min(height,rect.bottom)-Math.max(0,rect.top))/area:0;}
export interface ReelCandidate {video:HTMLVideoElement;key:string;reelId?:string}
export function findReel(platform:Platform,doc:Document=document):ReelCandidate|undefined {
  const routeId=reelIdentity(platform,doc.location.href);
  const feedRoute=platform==='youtube'?doc.location.pathname.startsWith('/shorts'): /^\/reels?(\/|$)/.test(doc.location.pathname);
  const candidates=[...doc.querySelectorAll('video')].map(video=>{
    const container=video.closest('ytd-reel-video-renderer, ytd-shorts, [role="article"], article')??video.parentElement;
    const selector=platform==='youtube'?'a[href*="/shorts/"]':platform==='instagram'?'a[href*="/reel/"] , a[href*="/reels/"]':'a[href*="/reel/"] , a[href*="/reels/"]';
    const link=container?.querySelector<HTMLAnchorElement>(selector);
    const id=(link?reelIdentity(platform,link.href):undefined)??routeId;
    // Outside a reel route, require an explicit reel link in this video's container.
    const supported=feedRoute||Boolean(link&&id);
    const fraction=visibleFraction(video.getBoundingClientRect(),innerWidth,innerHeight);
    return {video,reelId:id,key:id??video.currentSrc??'',fraction,supported};
  }).filter(c=>c.supported&&c.fraction>=.5).sort((a,b)=>b.fraction-a.fraction);
  const best=candidates[0];return best&&best.key?best:undefined;
}
