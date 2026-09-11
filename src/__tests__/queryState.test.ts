import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDataMode } from '../config/dataMode';
import { TrackingQuery } from '../tracking/query';
import type { TrackingData } from '../types/tracking';
import { ActivityReadProvider, ActivityReadNotice } from '../components/ui/ActivityReadState';
import type { ActivityReadState } from '../types/uiState';
import { StateRegion, Skeleton } from '../components/ui/StateRegion';

declare function test(name: string, run: () => void | Promise<void>): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void; toThrow(): void };
const empty: TrackingData = { visits: [], coverage: [], savingFailed: false };

test('data mode has an explicit safe default and rejects misspellings', () => {
  expect(parseDataMode(undefined)).toBe('actual');
  expect(parseDataMode('dev')).toBe('dev');
  expect(parseDataMode('actual')).toBe('actual');
  expect(() => parseDataMode('development')).toThrow();
  expect(() => parseDataMode('')).toThrow();
});

test('successful empty reads are ready data, not failures', async () => {
  const query = new TrackingQuery(async () => empty);
  expect(query.getSnapshot().status).toBe('loading');
  await query.refresh();
  expect(query.getSnapshot().status).toBe('success');
  expect(query.getSnapshot().hasData).toBe(true);
});

test('concurrent reads coalesce; retry preserves the last successful snapshot', async () => {
  let resolve!: (data: TrackingData) => void;
  let reject!: (error: Error) => void;
  let calls = 0;
  const query = new TrackingQuery(() => { calls++; return new Promise((yes, no) => { resolve = yes; reject = no; }); });
  const first = query.refresh();
  expect(query.refresh()).toBe(first);
  await Promise.resolve();
  expect(calls).toBe(1);
  resolve(empty); await first;
  const refresh = query.refresh();
  expect(query.getSnapshot().data).toBe(empty);
  expect(query.getSnapshot().status).toBe('success');
  expect(query.getSnapshot().hasData).toBe(true);
  await Promise.resolve(); reject(Error('offline')); await refresh;
  expect(query.getSnapshot().status).toBe('error');
  expect(query.getSnapshot().data).toBe(empty);
  const retry = query.refresh();
  expect(query.getSnapshot().data).toBe(empty);
  expect(query.getSnapshot().hasData).toBe(true);
  await Promise.resolve(); resolve({ ...empty, savingFailed: true }); await retry;
  expect(query.getSnapshot().data.savingFailed).toBe(true);
});

test('initial failure retries loading; separate ranges cannot overwrite each other', async () => {
  let fail = true;
  const query = new TrackingQuery(async () => { if (fail) throw Error('offline'); return empty; });
  await query.refresh();
  expect(query.getSnapshot().hasData).toBe(false);
  fail = false;
  const retry = query.refresh(); expect(query.getSnapshot().status).toBe('loading'); await retry;
  const otherRange = new TrackingQuery(async () => ({ ...empty, savingFailed: true }));
  await otherRange.refresh();
  expect(query.getSnapshot().data.savingFailed).toBe(false);
});

function renderRead(read: ActivityReadState) {
  return renderToStaticMarkup(createElement(ActivityReadProvider, { value: read,
    children: createElement(Fragment, null,
      createElement('nav', null, 'Today / Signals / Hourly'),
      createElement(ActivityReadNotice),
      createElement(StateRegion, { state: { status: 'ready' }, id: 'metrics', label: 'Metrics', shape: 'metrics', skeletonCount: 2, children: 'saved metrics' }),
      createElement(StateRegion, { state: { status: 'ready' }, id: 'distribution', label: 'Distribution', shape: 'donut', children: 'saved distribution' })) }));
}
const read: ActivityReadState = { status: 'loading', hasData: false, refreshing: true, error: null, retry: () => {} };

test('initial loading retains navigation and uses regional skeleton geometry', () => {
  const html = renderRead(read);
  expect(html.includes('Today / Signals / Hourly')).toBe(true);
  expect(html.includes('skeleton-metrics')).toBe(true);
  expect(html.includes('skeleton-donut')).toBe(true);
  expect(html.includes('--skeleton-columns:2')).toBe(true);
  expect(html.includes('saved metrics')).toBe(false);
  const three = renderToStaticMarkup(createElement(Skeleton, { shape: 'metrics', label: 'Three', count: 3 }));
  expect(three.includes('--skeleton-columns:3')).toBe(true);
});

test('one initial query notice owns retry; stale failures retain rendered data', () => {
  const failed = renderRead({ ...read, status: 'error', refreshing: false, error: 'Connection unavailable.' });
  expect(failed.split('Retry this view').length - 1).toBe(1);
  expect(failed.includes('state-unavailable')).toBe(true);
  expect(failed.includes('Loading Metrics')).toBe(false);
  const stale = renderRead({ ...read, status: 'error', hasData: true, refreshing: false });
  expect(stale.includes('saved metrics')).toBe(true);
  expect(stale.includes('saved distribution')).toBe(true);
  expect(stale.includes('skeleton-')).toBe(false);
});
