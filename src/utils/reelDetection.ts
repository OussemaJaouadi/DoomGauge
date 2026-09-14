// Types & Models
import type { Platform } from '../types/models';

// Tokens & Meta
import { PLATFORM_HOSTS } from '../config/platforms';

const reelRoute = /^\/reels?\/([^/]+)/;

export function platformForUrl(url: string): Platform | undefined {
  try {
    const host = new URL(url).hostname;
    return (Object.keys(PLATFORM_HOSTS) as Platform[]).find(platform => PLATFORM_HOSTS[platform] === host);
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
  if (area <= 0) {
    return 0;
  }
  const visibleWidth = Math.max(0, Math.min(width, rect.right) - Math.max(0, rect.left));
  const visibleHeight = Math.max(0, Math.min(height, rect.bottom) - Math.max(0, rect.top));
  return visibleWidth * visibleHeight / area;
}
