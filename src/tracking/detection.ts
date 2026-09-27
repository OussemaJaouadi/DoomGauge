// Types & Models
import type { Platform } from '../types/models';
import type { ReelCandidate } from '../types/tracking';

// Tokens & Meta
import { PLAYER_BOUNDS_TOLERANCE_PX } from '../config/tracking';

// Utilities & Helpers
import { reelIdentity, visibleFraction } from '../utils/reelDetection';

function isPlayerSurface(video: HTMLVideoElement, hit: Element | null, rect: DOMRect): boolean {
  if (hit === video) {
    return true;
  }
  if (!hit) {
    return false;
  }
  let container = video.parentElement;
  while (container && !container.contains(hit)) {
    container = container.parentElement;
  }
  if (!container || container.matches('body, html, main, [role="main"]')) {
    return false;
  }
  const dialog = hit.closest('dialog, [role="dialog"]');
  if (dialog && !dialog.contains(video)) {
    return false;
  }
  const bounds = container.getBoundingClientRect();
  const matchesPlayerBounds = Math.abs(bounds.left - rect.left) <= PLAYER_BOUNDS_TOLERANCE_PX
    && Math.abs(bounds.right - rect.right) <= PLAYER_BOUNDS_TOLERANCE_PX
    && Math.abs(bounds.top - rect.top) <= PLAYER_BOUNDS_TOLERANCE_PX
    && Math.abs(bounds.bottom - rect.bottom) <= PLAYER_BOUNDS_TOLERANCE_PX;
  if (!matchesPlayerBounds) {
    return false;
  }
  const videos = container.querySelectorAll('video');
  return videos.length === 1 && videos[0] === video;
}

export function findReel(platform: Platform, doc: Document = document): ReelCandidate | undefined {
  const routeId = reelIdentity(platform, doc.location.href);
  if (!routeId) {
    return undefined;
  }
  let candidate: ReelCandidate | undefined;

  for (const video of doc.querySelectorAll('video')) {
    const rect = video.getBoundingClientRect();
    const fraction = visibleFraction(rect, innerWidth, innerHeight);
    if (fraction < 0.5) {
      continue;
    }
    // Player controls can cover the video; unrelated overlays cannot qualify it.
    const centerX = (Math.max(0, rect.left) + Math.min(innerWidth, rect.right)) / 2;
    const centerY = (Math.max(0, rect.top) + Math.min(innerHeight, rect.bottom)) / 2;
    const hit = doc.elementFromPoint(centerX, centerY);
    if (!isPlayerSurface(video, hit, rect)) {
      continue;
    }
    if (platform === 'youtube') {
      const renderer = video.closest('ytd-reel-video-renderer');
      const playerId = renderer?.getAttribute('video-id');
      if (playerId && playerId !== routeId) {
        continue;
      }
    }
    // A route identifies content only when exactly one player qualifies.
    if (candidate) {
      return undefined;
    }
    candidate = { video, reelId: routeId };
  }
  return candidate;
}
