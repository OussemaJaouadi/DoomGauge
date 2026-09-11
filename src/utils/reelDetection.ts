import type { Platform } from '../types/models';
import type { ReelCandidate } from '../types/tracking';

export const hosts: Record<Platform, string> = {
  youtube: 'www.youtube.com',
  instagram: 'www.instagram.com',
  facebook: 'www.facebook.com',
};
const reelRoute = /^\/reels?\/([^/]+)/;
const reelLinks = 'a[href*="/reel/"], a[href*="/reels/"]';

export function platformForUrl(url: string): Platform | undefined {
  try {
    const host = new URL(url).hostname;
    return (Object.keys(hosts) as Platform[]).find(platform => hosts[platform] === host);
  } catch {
    // Invalid URLs are unsupported inputs, not tracking failures.
    return undefined;
  }
}

export function reelIdentity(platform: Platform, url: string): string | undefined {
  try {
    const pattern = platform === 'youtube' ? /^\/shorts\/([^/]+)/ : reelRoute;
    const id = new URL(url).pathname.match(pattern)?.[1];
    return id && /^[\w-]+$/.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

export function visibleFraction(
  rect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>,
  width: number, height: number,
) {
  const area = rect.width * rect.height;
  if (area <= 0) return 0;
  const visibleWidth = Math.max(0, Math.min(width, rect.right) - Math.max(0, rect.left));
  const visibleHeight = Math.max(0, Math.min(height, rect.bottom) - Math.max(0, rect.top));
  return visibleWidth * visibleHeight / area;
}


export function findReel(platform: Platform, doc: Document = document): ReelCandidate | undefined {
  const routeId = reelIdentity(platform, doc.location.href);
  const feedRoute = platform === 'youtube'
    ? doc.location.pathname.startsWith('/shorts')
    : /^\/reels?(\/|$)/.test(doc.location.pathname);
  const selector = platform === 'youtube' ? 'a[href*="/shorts/"]' : reelLinks;
  const candidates = [...doc.querySelectorAll('video')].map(video => {
    const container = video.closest('ytd-reel-video-renderer, ytd-shorts, [role="article"], article')
      ?? video.parentElement;
    const link = container?.querySelector<HTMLAnchorElement>(selector);
    const id = (link ? reelIdentity(platform, link.href) : undefined) ?? routeId;
    // Outside reel routes, require a reel link in this video's container.
    const supported = feedRoute || Boolean(link && id);
    const fraction = visibleFraction(video.getBoundingClientRect(), innerWidth, innerHeight);
    return { video, reelId: id, key: id ?? video.currentSrc ?? '', fraction, supported };
  }).filter(candidate => candidate.supported && candidate.fraction >= .5)
    .sort((left, right) => right.fraction - left.fraction);
  const best = candidates[0];
  return best?.key ? best : undefined;
}
