import { Component, useEffect, type CSSProperties, type ErrorInfo, type ReactNode } from 'react';
import { useActivityReadState } from './ActivityReadState';
import { EmptyState, ErrorState } from './State';
import { useStatePreview } from './StatePreview';
import { emptyMessages, previewRegionState, resolveRegionState } from '../../utils/uiState';
import type { RegionBoundaryProps, SkeletonProps, StateRegionProps, SkeletonShape } from '../../types/uiState';
import './States.css';

const skeletonCounts: Record<SkeletonShape, number> = {
  metric: 1, metrics: 3, donut: 4, chart: 4, calendar: 35,
  week: 7, rows: 4, table: 10, settings: 2,
};

export function Skeleton({ shape, label, count }: SkeletonProps) {
  const itemCount = count ?? skeletonCounts[shape];
  const style = shape === 'metrics' ? { '--skeleton-columns': itemCount } as CSSProperties : undefined;
  return <div className={`state-skeleton skeleton-${shape}`} style={style} role="status" aria-label={`Loading ${label}`}>
    <span className="state-sr-only">Loading {label}</span>
    <div aria-hidden="true">{Array.from({ length: itemCount }, (_, index) => <span key={index} />)}</div>
  </div>;
}

export class RegionErrorBoundary extends Component<RegionBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI region failed', error, info.componentStack);
  }

  private retry = () => {
    this.setState({ failed: false });
    this.props.onRetry?.();
  };

  override render() {
    if (this.state.failed) {
      return this.props.fallback(this.retry);
    }
    return this.props.children;
  }
}

// Render callbacks run below the boundary, so calculation errors stay local.
function RegionContent({ children }: { children: StateRegionProps['children'] }) {
  return typeof children === 'function' ? children() : children;
}

export function StateRegion(props: StateRegionProps) {
  const { retry } = useStatePreview();
  const recover = () => {
    retry(props.id);
    props.onRetry?.();
  };
  return <RegionErrorBoundary onRetry={recover} fallback={action =>
    <ErrorState title={`${props.label} failed`} hint="This section could not be calculated." action={{ label: 'Retry section', onClick: action }} />}>
    <RegionView {...props} />
  </RegionErrorBoundary>;
}

function RegionView(props: StateRegionProps) {
  const { id, label, shape = 'rows', children, state: localState, onRetry,
    onClearFilters, className = '', skeletonCount } = props;
  const reasons = props.reasons ?? ['activity', 'filters', 'unobserved'];
  const { register, overrides, retry } = useStatePreview();
  const read = useActivityReadState();
  // Do not calculate local availability until the shared data has loaded.
  const local = read && !read.hasData ? { status: 'loading' as const }
    : typeof localState === 'function' ? localState() : localState;
  const state = previewRegionState(resolveRegionState(local, read), overrides.page, overrides[id]);
  const reasonKey = reasons.join(',');

  useEffect(() => register(id, { label, reasons: [...reasons] }), [register, id, label, reasonKey]);

  const recover = () => {
    retry(id);
    onRetry?.();
  };
  const errorFallback = (action: () => void) =>
    <ErrorState title={`${label} failed`} hint="This section could not be calculated." action={{ label: 'Retry section', onClick: action }} />;

  let content: ReactNode;
  switch (state.status) {
    case 'loading':
      content = <Skeleton shape={shape} label={label} count={skeletonCount} />;
      break;
    case 'error':
      content = state.source === 'read'
        ? <div className="state-unavailable" role="status">{label}: activity unavailable</div>
        : errorFallback(recover);
      break;
    case 'empty':
    case 'unavailable': {
      const action = state.reason === 'filters' && onClearFilters
        ? { label: 'Clear filters', onClick: () => { onClearFilters(); recover(); } }
        : state.reason === 'settings' ? { label: 'Restore mock defaults', onClick: recover } : undefined;
      content = <EmptyState {...emptyMessages[state.reason]} action={action} />;
      break;
    }
    case 'ready':
      content = <RegionContent>{children}</RegionContent>;
      break;
  }

  return <div className={`state-region ${state.status !== 'ready' ? `state-region-${shape}` : ''} ${className}`} aria-busy={state.status === 'loading'}>
    {content}
  </div>;
}
