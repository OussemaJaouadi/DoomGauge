import type { EmptyReason, StateOverride, RegionState, ActivityReadState } from '../types/uiState';

export const emptyMessages: Record<EmptyReason, { title: string; hint: string }> = {
  completed: { title: 'No completed visits', hint: 'Quick skips need completed visits.' },
  activity: { title: 'No activity recorded', hint: 'No recordings in this period.' },
  filters: { title: 'No matching activity', hint: 'Try changing the selected filters.' },
  history: { title: 'Not enough history', hint: 'Recurring windows need at least 3 completed observed days.' },
  followup: { title: 'Not enough follow-up', hint: 'This return threshold needs a fully observed follow-up period.' },
  unobserved: { title: 'Not observed', hint: 'No measurement coverage for this selection.' },
  session: { title: 'Session unavailable', hint: 'Return to the date or session selection.' },
  settings: { title: 'No example settings', hint: 'Restore the mock defaults to explore the controls.' },
};
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
