import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HintBody } from '../components/ui/HintBody';
import { hintFacts } from '../components/ui/hintContent';

declare function test(name: string, fn: () => void): void;
declare function expect(value: unknown): { toBe(value: unknown): void };

test('plain hints preserve text and escape markup', () => {
  const html = renderToStaticMarkup(createElement(HintBody, { content: 'Quick skip: <3s & active' }));
  expect(html).toBe('<span>Quick skip: &lt;3s &amp; active</span>');
});

test('structured hints pair dates and cutoff with readable labels', () => {
  const html = renderToStaticMarkup(createElement(HintBody, { content: hintFacts([
    ['Selected', '2026-09-01 → 2026-09-07'],
    ['Previous', '2026-08-25 → 2026-08-31'],
    ['Cutoff', 'Both through 13:11'],
  ], 'Equal elapsed periods.') }));
  expect(html.includes('<dt>Selected</dt><dd>2026-09-01 → 2026-09-07</dd>')).toBe(true);
  expect(html.includes('<dt>Previous</dt><dd>2026-08-25 → 2026-08-31</dd>')).toBe(true);
  expect(html.includes('<dt>Cutoff</dt><dd>Both through 13:11</dd>')).toBe(true);
  expect(html.includes('<p class="hint-note">Equal elapsed periods.</p>')).toBe(true);
});

test('zero coverage and unavailable values remain distinct without an empty note', () => {
  const html = renderToStaticMarkup(createElement(HintBody, { content: hintFacts([
    ['5m', '0 / 12 eligible endings'], ['15m', '—'], ['Coverage', '0 / 12 measured'],
  ]) }));
  expect(html.includes('<dd>0 / 12 eligible endings</dd>')).toBe(true);
  expect(html.includes('<dd>—</dd>')).toBe(true);
  expect(html.includes('<dd>0 / 12 measured</dd>')).toBe(true);
  expect(html.includes('hint-note')).toBe(false);
});
