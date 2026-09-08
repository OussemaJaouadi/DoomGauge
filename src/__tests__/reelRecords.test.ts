import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReelRecords } from '../components/telemetry/ReelRecords';
import { filterReelRecords, recordPage, type RecordFilters } from '../utils/reelRecords';
import type { PreviewObservation } from '../types/telemetryPreview';

declare function test(name: string, fn: () => void): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void };
const filters: RecordFilters = { platforms: ['youtube', 'instagram', 'facebook'], quickSkips: false, from: '', to: '' };
const event = (id: number, overrides: Partial<PreviewObservation> = {}): PreviewObservation => ({ id: String(id), ts: new Date(2026, 8, 8, 8, 0, id).getTime(), endedTs: new Date(2026, 8, 8, 8, 0, id + 5).getTime(), durationMs: 2000, platform: 'youtube', videoDurationMs: null, skipped: true, ...overrides });

test('large record sets paginate without missing or duplicated rows', () => {
  const rows = Array.from({ length: 3001 }, (_, index) => event(index));
  const ids = Array.from({ length: 121 }, (_, page) => recordPage(rows, page, 25).rows).flat().map(row => row.id);
  expect(ids).toEqual(rows.map(row => row.id));
  expect(recordPage(rows, 999, 25).start).toBe(3001);
  expect(recordPage(rows, 999, 25).end).toBe(3001);
  expect(recordPage(rows.slice(0, 2), 100, 25).page).toBe(0);
  expect(recordPage([], 100, 25).start).toBe(0);
  expect(recordPage([], 100, 25).end).toBe(0);
});

test('record filters combine platforms, local date boundaries and strict quick skips', () => {
  const rows = [event(0, { ts: new Date(2026, 8, 7, 23, 59, 59).getTime() }), event(1, { ts: new Date(2026, 8, 8, 0).getTime(), durationMs: 2999 }), event(2, { durationMs: 3000 }), event(3, { platform: 'instagram' }), event(4, { ts: new Date(2026, 8, 8, 23, 59, 59).getTime() })];
  expect(filterReelRecords(rows, { ...filters, platforms: ['youtube'], quickSkips: true, from: '2026-09-08', to: '2026-09-08' }, 'started', false).map(row => row.id)).toEqual(['1', '4']);
  expect(filterReelRecords(rows, { ...filters, platforms: [] }, 'started', false).length).toBe(0);
  expect(filterReelRecords(rows, { ...filters, from: '2026-09-09', to: '2026-09-08' }, 'started', false).length).toBe(0);
});

test('sorting separates active from elapsed time and preserves input order', () => {
  const rows = [event(1, { durationMs: 1000 }), event(2, { durationMs: 4000 }), event(3, { durationMs: 1000, endedTs: event(3).ts + 10000 })];
  expect(filterReelRecords(rows, filters, 'active', true).map(row => row.id)).toEqual(['2', '1', '3']);
  expect(filterReelRecords(rows, filters, 'elapsed', true).map(row => row.id)).toEqual(['3', '1', '2']);
  expect(filterReelRecords(rows, filters, 'started', true).map(row => row.id)).toEqual(['3', '2', '1']);
  expect(rows.map(row => row.id)).toEqual(['1', '2', '3']);
});

test('table initially renders only 10 records and exposes accessible sorting and pagination', () => {
  const html = renderToStaticMarkup(createElement(ReelRecords, { events: Array.from({ length: 3000 }, (_, index) => event(index)) }));
  expect((html.match(/<time /g) ?? []).length).toBe(10);
  expect(html.includes('aria-sort="ascending"')).toBe(true);
  expect(html.includes('aria-label="Next page"')).toBe(true);
  expect(html.includes('aria-label="Rows per page"')).toBe(true);
});
