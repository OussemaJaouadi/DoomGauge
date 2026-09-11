import { EMPTY_MESSAGES } from '../types/uiState';
import type { EmptyReason, StateOverride, RegionState, ActivityReadState, EmptyMessageSpec } from '../types/uiState';

export { EMPTY_MESSAGES, EMPTY_MESSAGES as emptyMessages };
export type { EmptyMessageSpec };
export function resolveState(whole?: StateOverride, region?: StateOverride, actual: StateOverride = { status: 'success' }): StateOverride {
  return whole && whole.status !== 'success' ? whole : region && region.status !== 'success' ? region : actual;
}
export function retryOverrides(overrides: Record<string, StateOverride>, id: string) {
  const next = { ...overrides };
  delete next[id];
  if (next.page?.status !== 'success') delete next.page;
  return next;
}

export const readyState: RegionState = { status: 'ready' };

export function contentState(count: number, filtered = false): RegionState {
  if (count > 0) {
    return readyState;
  }
  return { status: 'empty', reason: filtered ? 'filters' : 'activity' };
}

export function ratioState(eligibleCount: number, reason: EmptyReason): RegionState {
  if (eligibleCount > 0) {
    return readyState;
  }
  return { status: 'unavailable', reason };
}

export function resolveRegionState(local: RegionState, read?: ActivityReadState): RegionState {
  if (!read || read.hasData) {
    return local;
  }
  if (read.status === 'error') {
    return { status: 'error', source: 'read', message: 'Activity could not be loaded.' };
  }
  return { status: 'loading' };
}

export function previewRegionState(actual: RegionState, whole?: StateOverride, region?: StateOverride): RegionState {
  const override = whole && whole.status !== 'success' ? whole : region;
  if (!override || override.status === 'success') {
    return actual;
  }
  if (override.status === 'loading') {
    return { status: 'loading' };
  }
  if (override.status === 'error') {
    return { status: 'error', source: 'region' };
  }
  const reason = override.reason ?? 'activity';
  const unavailable = override.status === 'unavailable'
    || ['history', 'followup', 'unobserved', 'completed'].includes(reason);
  return { status: unavailable ? 'unavailable' : 'empty', reason };
}
