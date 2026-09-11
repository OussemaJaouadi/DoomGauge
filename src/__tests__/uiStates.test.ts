import { DEV_DATA } from '../config/dataMode';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StateRegion, Skeleton } from '../components/ui/StateRegion';
import type { SkeletonShape } from '../types/uiState';
import { resolveState, retryOverrides, emptyMessages } from '../utils/uiState';
import { popupStateFixture } from '../data/uiStateFixtures';
import { PlatformRow } from '../components/dashboard/PlatformRow';
import { StatePreviewControls } from '../components/ui/StatePreview';

declare function test(name: string, fn: () => void): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void };

test('page previews win; Normal returns to the actual dataset state', () => {
  expect(resolveState({ status: 'loading' }, { status: 'error' })).toEqual({ status: 'loading' });
  expect(resolveState({ status: 'success' }, { status: 'empty', reason: 'filters' })).toEqual({ status: 'empty', reason: 'filters' });
  expect(resolveState(undefined, { status: 'success' }, { status: 'empty', reason: 'history' })).toEqual({ status: 'empty', reason: 'history' });
});
test('retry removes the target/page override without clearing sibling failures', () => {
  const initial = { page: { status: 'error' as const }, first: { status: 'error' as const }, second: { status: 'loading' as const } };
  expect(retryOverrides(initial, 'first')).toEqual({ second: { status: 'loading' } });
  expect(initial.first.status).toBe('error');
});
test('loading hides real values and exposes one named status with decorative shapes', () => {
  const html = renderToStaticMarkup(createElement(StateRegion, { id: 'test', label: 'Reel count', shape: 'metric', state: { status: 'loading' }, children: '428 reels' }));
  expect(html.includes('428 reels')).toBe(false);
  expect(html.includes('aria-busy="true"')).toBe(true);
  expect((html.match(/role="status"/g) ?? []).length).toBe(1);
  expect(html.includes('aria-hidden="true"')).toBe(true);
  expect(html.includes('<button')).toBe(false);
});
test('each skeleton family renders its geometry without focusable placeholders', () => {
  for (const shape of ['metric', 'metrics', 'donut', 'chart', 'calendar', 'week', 'rows', 'table', 'settings'] as SkeletonShape[]) {
    const html = renderToStaticMarkup(createElement(Skeleton, { shape, label: 'Activity' }));
    expect(html.includes(`skeleton-${shape}`)).toBe(true);
    expect(html.includes('tabindex')).toBe(false);
  }
  const table = renderToStaticMarkup(createElement(Skeleton, { shape: 'table', label: 'Records', count: 25 }));
  expect((table.match(/<span><\/span>/g) ?? []).length).toBe(25);
});
test('local errors hide only their own values and include recovery', () => {
  const html = renderToStaticMarkup(createElement(Fragment, null,
    createElement(StateRegion, { id: 'broken', label: 'Activity', state: { status: 'error', source: 'region' }, children: 'stale value' }),
    createElement(StateRegion, { state: { status: 'ready' }, id: 'healthy', label: 'Reels', children: '19 reels' }),
  ));
  expect(html.includes('stale value')).toBe(false);
  expect(html.includes('19 reels')).toBe(true);
  expect(html.includes('role="alert"')).toBe(true);
  expect(html.includes('Retry')).toBe(true);
});
test('filter empty states expose scoped recovery and settings restore only mock defaults', () => {
  const html = renderToStaticMarkup(createElement(StateRegion, { id: 'filtered', label: 'Records', state: { status: 'empty', reason: 'filters' }, onClearFilters: () => {}, children: 'hidden' }));
  expect(html.includes('No matching activity')).toBe(true);
  expect(html.includes('Clear filters')).toBe(true);
  const settings = renderToStaticMarkup(createElement(StateRegion, { id: 'settings', label: 'Settings', reasons: ['settings'], state: { status: 'empty', reason: 'settings' }, children: 'hidden' }));
  expect(settings.includes('Restore mock defaults')).toBe(true);
  expect(new Set(Object.values(emptyMessages).map(message => message.title)).size).toBe(8);
});
test('data fixtures reconcile zero, sparse history and previous-only comparisons', () => {
  const normal = popupStateFixture('normal'), zero = popupStateFixture('zero'), sparse = popupStateFixture('insufficient'), old = popupStateFixture('previousOnly');
  expect(normal.summary.totalCount > 0).toBe(true);
  expect(zero.summary.totalCount).toBe(0);
  expect(zero.summary.yesterdayCount).toBe(0);
  expect(zero.distribution.medianMs).toBe(null);
  expect(zero.hourly.reduce((sum, hour) => sum + hour.total, 0)).toBe(0);
  expect(sparse.summary.totalCount).toBe(1);
  expect(old.summary.totalCount).toBe(0);
  expect(old.summary.yesterdayCount > 0).toBe(true);
  expect(popupStateFixture('filtered').summary.totalCount).toBe(0);
});
test('zero platform totals have unavailable shares, not a fabricated zero percent', () => {
  const html = renderToStaticMarkup(createElement(PlatformRow, { platform: 'youtube', count: 0, timeMs: 0, totalCount: 0, totalTimeMs: 0 }));
  expect(html.includes('share unavailable')).toBe(true);
  expect(html.includes('>0%</span>')).toBe(false);
  expect(html.includes('—')).toBe(true);
});
test('preview controls follow the data mode rather than the build server', () => {
  expect(renderToStaticMarkup(createElement(StatePreviewControls)).includes('States')).toBe(DEV_DATA);
});
