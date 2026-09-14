// Types & Models
import type { Platform } from '../types/models';
import type { ReelCandidate } from '../types/tracking';

// Utilities & Helpers
import { reelIdentity, visibleFraction } from '../utils/reelDetection';

const reelLinks = 'a[href*="/reel/"], a[href*="/reels/"]';

export function findReel(platform: Platform, doc: Document = document): ReelCandidate | undefined {
  const routeId = reelIdentity(platform, doc.location.href);
  const feedRoute = platform === 'youtube'
    ? doc.location.pathname.startsWith('/shorts')
    : /^\/reels?(\/|$)/.test(doc.location.pathname);
  const selector = platform === 'youtube' ? 'a[href*="/shorts/"]' : reelLinks;
  let best: ReelCandidate | undefined;
  let bestFraction = 0;

  for (const video of doc.querySelectorAll('video')) {
    const container = video.closest('ytd-reel-video-renderer, ytd-shorts, [role="article"], article')
      ?? video.parentElement;
    const link = container?.querySelector<HTMLAnchorElement>(selector);
    const id = (link ? reelIdentity(platform, link.href) : undefined) ?? routeId;
    const supported = feedRoute || Boolean(link && id);
    if (!supported) {
      continue;
    }
    const fraction = visibleFraction(video.getBoundingClientRect(), innerWidth, innerHeight);
    const moreVisible = fraction >= 0.5 && fraction > bestFraction;
    if (moreVisible) {
      best = { video, reelId: id, key: id ?? video.currentSrc ?? '' };
      bestFraction = fraction;
    }
  }
  return best?.key ? best : undefined;
}
