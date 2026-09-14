// Types & Models
import type { Visit, StoredVisit, ActiveInterval, PlaybackState } from '../types/tracking';

// Tokens & Meta
import { PLATFORMS } from '../types/models';
import { QUICK_SKIP_MS, MAX_TRACKING_ID_LENGTH, MAX_REEL_ID_LENGTH, MAX_VISIT_INTERVALS, MAX_TIMESTAMP_MS } from '../config/tracking';

export function isQuickSkip(visit: Pick<Visit, 'status' | 'activeMs'>) {
  return visit.status === 'completed' && visit.activeMs < QUICK_SKIP_MS;
}

function validId(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= limit;
}

export function validVisit(value: unknown): value is Visit {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const visit = value as Visit;
  const validIdentity = validId(visit.id, MAX_TRACKING_ID_LENGTH)
    && validId(visit.collectorId, MAX_TRACKING_ID_LENGTH) && PLATFORMS.includes(visit.platform);
  if (!validIdentity) {
    return false;
  }
  if (!Number.isSafeInteger(visit.revision) || visit.revision < 1) {
    return false;
  }
  if (!['open', 'completed', 'interrupted'].includes(visit.status)) {
    return false;
  }
  if (![visit.startedAt, visit.observedAt, visit.activeMs].every(Number.isFinite)) {
    return false;
  }
  const validTimestamps = visit.startedAt >= 0 && visit.observedAt <= MAX_TIMESTAMP_MS
    && visit.observedAt >= visit.startedAt;
  if (!validTimestamps) {
    return false;
  }
  if (visit.activeMs < 0 || visit.activeMs > visit.observedAt - visit.startedAt + 1) {
    return false;
  }
  const invalidReelId = visit.reelId !== undefined
    && (typeof visit.reelId !== 'string' || visit.reelId.length > MAX_REEL_ID_LENGTH);
  if (invalidReelId) {
    return false;
  }
  const invalidDuration = visit.videoDurationMs !== undefined
    && (!Number.isFinite(visit.videoDurationMs) || visit.videoDurationMs <= 0);
  if (invalidDuration) {
    return false;
  }
  if (!Array.isArray(visit.intervals) || visit.intervals.length > MAX_VISIT_INTERVALS) {
    return false;
  }

  let previousEnd = visit.startedAt;
  let total = 0;
  for (const interval of visit.intervals) {
    if (!interval || !Number.isFinite(interval.start) || !Number.isFinite(interval.end)) {
      return false;
    }
    const invalidBounds = interval.start < previousEnd || interval.end < interval.start || interval.end > visit.observedAt;
    if (invalidBounds) {
      return false;
    }
    total += interval.end - interval.start;
    previousEnd = interval.end;
  }
  return Math.abs(total - visit.activeMs) < 1;
}

export function acceptRevision(previous: StoredVisit | undefined, next: StoredVisit) {
  if (!previous) {
    return true;
  }
  const sameOwner = previous.tabId === next.tabId && previous.documentId === next.documentId
    && previous.collectorId === next.collectorId && previous.platform === next.platform
    && previous.startedAt === next.startedAt;
  if (!sameOwner) {
    throw new Error('Visit ownership mismatch');
  }
  if (next.revision <= previous.revision) {
    return false;
  }
  const nonMonotonic = previous.status === 'completed'
    || next.observedAt < previous.observedAt || next.activeMs < previous.activeMs;
  if (nonMonotonic) {
    throw new Error('Non-monotonic visit');
  }
  for (let index = 0; index < previous.intervals.length; index++) {
    const prior = previous.intervals[index]!;
    const current = next.intervals[index];
    const sealed = index < previous.intervals.length - 1;
    const rewritten = !current || current.start !== prior.start || current.end < prior.end
      || (sealed && current.end !== prior.end);
    if (rewritten) {
      throw new Error('Recorded intervals cannot be rewritten');
    }
  }
  return true;
}

export function intervalMs(intervals: readonly ActiveInterval[], start = -Infinity, end = Infinity) {
  return intervals.reduce((sum, interval) =>
    sum + Math.max(0, Math.min(end, interval.end) - Math.max(start, interval.start)), 0);
}

export function canAccumulate(state: PlaybackState) {
  return state.focused && state.visible && state.intersecting && !state.paused
    && !state.ended && !state.seeking && !state.buffering && state.readyState >= 3;
}
