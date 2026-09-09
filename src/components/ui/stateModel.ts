import type { UIState } from '../../types/popup';
export type EmptyReason = 'activity' | 'filters' | 'history' | 'followup' | 'unobserved' | 'session' | 'settings';
export type SkeletonShape = 'metric' | 'metrics' | 'donut' | 'chart' | 'calendar' | 'week' | 'rows' | 'table' | 'settings';
export type DataPreset = 'normal' | 'zero' | 'filtered' | 'insufficient' | 'previousOnly';
export interface StateOverride { status: UIState; reason?: EmptyReason }
export const emptyMessages: Record<EmptyReason, { title: string; hint: string }> = {
  activity: { title: 'No activity recorded', hint: 'No completed reels in this period.' },
  filters: { title: 'No matching activity', hint: 'Try changing the selected filters.' },
  history: { title: 'Not enough history', hint: 'Recurring windows need at least 3 completed observed days.' },
  followup: { title: 'Not enough follow-up', hint: 'This return threshold needs a fully observed follow-up period.' },
  unobserved: { title: 'No observation coverage', hint: 'Activity is unknown for this period.' },
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
