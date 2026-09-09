import { Component, useEffect, useState, type ReactNode, type ErrorInfo } from 'react';
import { EmptyState, ErrorState } from './State';
import { useStatePreview } from './StatePreview';
import { emptyMessages, resolveState, type EmptyReason, type SkeletonShape, type StateOverride } from './stateModel';
import './States.css';

export function Skeleton({ shape, label, count: requestedCount }: { shape: SkeletonShape; label: string; count?: number }) {
  const count = requestedCount ?? (shape === 'metric' ? 1 : shape === 'calendar' ? 35 : shape === 'week' ? 7 : shape === 'table' ? 10 : shape === 'metrics' ? 3 : shape === 'settings' ? 2 : 4);
  return <div className={`state-skeleton skeleton-${shape}`} role="status" aria-label={`Loading ${label}`}><span className="state-sr-only">Loading {label}</span><div aria-hidden="true">{Array.from({ length: count }, (_, index) => <span key={index} />)}</div></div>;
}
export class RegionErrorBoundary extends Component<{ children: ReactNode; fallback: (retry: () => void) => ReactNode; onRetry?: () => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: Error, info: ErrorInfo) { console.error('UI region failed', error, info.componentStack); }
  override render() { return this.state.failed ? this.props.fallback(() => { this.setState({ failed: false }); this.props.onRetry?.(); }) : this.props.children; }
}
interface Props {
  id: string; label: string; shape?: SkeletonShape; children: ReactNode; actual?: StateOverride;
  reasons?: readonly EmptyReason[]; onClearFilters?: () => void; onRetry?: () => void; className?: string; skeletonCount?: number;
}
const defaultReasons: readonly EmptyReason[] = ['activity', 'filters', 'unobserved'];
export function StateRegion({ id, label, shape = 'rows', children, actual, reasons = defaultReasons, onClearFilters, onRetry, className = '', skeletonCount }: Props) {
  const { register, overrides, retry } = useStatePreview();
  const [revision, setRevision] = useState(0);
  const reasonKey = reasons.join(',');
  useEffect(() => register(id, { label, reasons: reasonKey.split(',') as EmptyReason[] }), [register, id, label, reasonKey]);
  const state = resolveState(overrides.page, overrides[id], actual);
  const recover = () => { retry(id); setRevision(value => value + 1); onRetry?.(); };
  const reason = state.reason && reasons.includes(state.reason) ? state.reason : reasons[0] ?? 'activity';
  const error = (action: () => void) => <ErrorState title={`${label} unavailable`} hint="Try loading this section again." action={{ label: 'Retry', onClick: action }} />;
  return <div className={`state-region ${state.status !== 'success' ? `state-region-${shape}` : ''} ${className}`} aria-busy={state.status === 'loading'}>
    {state.status === 'loading' ? <Skeleton shape={shape} label={label} count={skeletonCount} /> : state.status === 'error' ? error(recover) : state.status === 'empty' ? <EmptyState {...emptyMessages[reason]} action={reason === 'filters' && onClearFilters ? { label: 'Clear filters', onClick: () => { onClearFilters(); recover(); } } : reason === 'settings' ? { label: 'Restore mock defaults', onClick: recover } : undefined} /> : <RegionErrorBoundary key={revision} fallback={error} onRetry={recover}>{children}</RegionErrorBoundary>}
  </div>;
}
