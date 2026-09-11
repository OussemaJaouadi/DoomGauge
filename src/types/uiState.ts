import type { ReactNode } from 'react';

export type EmptyReason = 'activity' | 'filters' | 'history' | 'followup' | 'unobserved' | 'session' | 'settings' | 'completed';
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
