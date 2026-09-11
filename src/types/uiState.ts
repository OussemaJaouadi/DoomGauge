import type { ReactNode } from 'react';

export type EmptyReason = 'activity' | 'filters' | 'history' | 'followup' | 'unobserved' | 'session' | 'settings' | 'completed';

export interface EmptyMessageSpec {
  title: string;
  hint: string;
}

export const EMPTY_MESSAGES: Record<EmptyReason, EmptyMessageSpec> = {
  completed: { title: 'No completed visits', hint: 'Quick skips need completed visits.' },
  activity: { title: 'No activity recorded', hint: 'No recordings in this period.' },
  filters: { title: 'No matching activity', hint: 'Try changing the selected filters.' },
  history: { title: 'Not enough history', hint: 'Recurring windows need at least 3 completed observed days.' },
  followup: { title: 'Not enough follow-up', hint: 'This return threshold needs a fully observed follow-up period.' },
  unobserved: { title: 'Not observed', hint: 'No measurement coverage for this selection.' },
  session: { title: 'Session unavailable', hint: 'Return to the date or session selection.' },
  settings: { title: 'No example settings', hint: 'Restore the mock defaults to explore the controls.' },
};

export type SkeletonShape = 'metric' | 'metrics' | 'donut' | 'chart' | 'calendar' | 'week' | 'rows' | 'table' | 'settings';
export type DataPreset = 'normal' | 'zero' | 'filtered' | 'insufficient' | 'previousOnly';
export interface StateOverride { status: 'loading' | 'success' | 'empty' | 'unavailable' | 'error'; reason?: EmptyReason }

export type RegionState =
  | { status: 'ready' }
  | { status: 'loading' }
  | { status: 'empty' | 'unavailable'; reason: EmptyReason }
  | { status: 'error'; source: 'read' | 'region'; message?: string };

export interface ActivityReadState {
  status: 'loading' | 'success' | 'error';
  hasData: boolean;
  refreshing: boolean;
  error: string | null;
  retry: () => void;
}

export interface StateRegionProps {
  id: string;
  label: string;
  state: RegionState | (() => RegionState);
  shape?: SkeletonShape;
  children: ReactNode | (() => ReactNode);
  reasons?: readonly EmptyReason[];
  onClearFilters?: () => void;
  onRetry?: () => void;
  className?: string;
  skeletonCount?: number;
}

export interface RegionBoundaryProps {
  children: ReactNode;
  fallback: (retry: () => void) => ReactNode;
  onRetry?: () => void;
}

export interface SkeletonProps { shape: SkeletonShape; label: string; count?: number }
