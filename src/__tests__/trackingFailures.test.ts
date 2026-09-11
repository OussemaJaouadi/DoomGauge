import { sendTracking } from '../tracking/messages';
import { TrackingError, reportDeliveryFailure } from '../utils/errors';
import { TrackingQuery } from '../tracking/query';
import { handleTrackingMessage } from '../tracking/background';
import { readTracking } from '../tracking/storage';
import { Outbox } from '../tracking/outbox';
import type { Visit } from '../types/tracking';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TelemetryFilters } from '../components/telemetry/TelemetryFilters';

declare function test(name: string, run: () => void | Promise<void>): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void };

async function withTransport(send: () => unknown, run: () => Promise<void>) {
  const original = globalThis.chrome;
  Object.assign(globalThis, { chrome: { runtime: { sendMessage: send } } });
  try { await run(); } finally { Object.assign(globalThis, { chrome: original }); }
}

async function failureCode(action: Promise<unknown>) {
  try { await action; return 'unexpected-success'; }
  catch (error) { return error instanceof TrackingError ? error.code : 'untyped-error'; }
}

test('transport distinguishes timeout, unavailable background and structured rejection', async () => {
  await withTransport(() => new Promise(() => {}), async () => {
    expect(await failureCode(sendTracking({ type: 'tracking:health', failed: true }, 1))).toBe('timeout');
  });
  const cause = new Error('worker unavailable');
  await withTransport(() => { throw cause; }, async () => {
    try { await sendTracking({ type: 'tracking:health', failed: true }); }
    catch (error) {
      expect(error instanceof TrackingError && error.code).toBe('background-unavailable');
      expect(error instanceof Error && error.cause).toBe(cause);
    }
  });
  await withTransport(() => ({ ok: false, code: 'storage-failed' }), async () => {
    expect(await failureCode(sendTracking({ type: 'tracking:query', start: 0, end: 1 }))).toBe('storage-failed');
  });
});

test('malformed query responses never become successful empty data', async () => {
  for (const response of [undefined, { ok: true }, { ok: false }, { ok: true, visits: [], coverage: [{}], savingFailed: false }]) {
    await withTransport(() => response, async () => {
      const query = new TrackingQuery(() => sendTracking({ type: 'tracking:query', start: 0, end: 1 }));
      await query.refresh();
      expect(query.getSnapshot().status).toBe('error');
      expect(query.getSnapshot().hasData).toBe(false);
    });
  }
  await withTransport(() => ({ ok: true, visits: [], coverage: [], savingFailed: false }), async () => {
    const query = new TrackingQuery(() => sendTracking({ type: 'tracking:query', start: 0, end: 1 }));
    await query.refresh();
    expect(query.getSnapshot().status).toBe('success');
    expect(query.getSnapshot().hasData).toBe(true);
  });
});

test('storage-open failures retain their cause and reject the read', async () => {
  const original = globalThis.indexedDB;
  const cause = new Error('storage blocked');
  Object.assign(globalThis, { indexedDB: { open: () => { throw cause; } } });
  try {
    try { await readTracking(0, 1); throw new Error('Expected failure'); }
    catch (error) {
      expect(error instanceof TrackingError && error.code).toBe('storage-failed');
      expect(error instanceof Error && error.cause).toBe(cause);
    }
  } finally { Object.assign(globalThis, { indexedDB: original }); }
});

test('malformed requests reject before storage work', async () => {
  const original = globalThis.chrome;
  Object.assign(globalThis, { chrome: { runtime: { id: 'extension' } } });
  try {
    expect(await failureCode(handleTrackingMessage(null, { id: 'extension' }))).toBe('invalid-request');
    expect(await failureCode(handleTrackingMessage({ type: 'tracking:health' }, { id: 'extension' }))).toBe('invalid-request');
  } finally { Object.assign(globalThis, { chrome: original }); }
});

test('only missing recipients are suppressed; unexpected delivery errors retain diagnostics', () => {
  const original = console.error;
  const reports: unknown[][] = [];
  console.error = (...args) => { reports.push(args); };
  try {
    reportDeliveryFailure('Broadcast', new Error('Could not establish connection. Receiving end does not exist.'));
    expect(reports.length).toBe(0);
    const cause = new Error('permission denied');
    reportDeliveryFailure('Broadcast', cause);
    expect(reports[0]?.[1]).toBe(cause);
  } finally { console.error = original; }
});

test('failed saves keep the newest pending revision for retry', async () => {
  let fail = true;
  const revisions: number[] = [];
  const outbox = new Outbox(async visit => {
    if (fail) throw new TrackingError('background-unavailable');
    revisions.push(visit.revision);
  }, () => {});
  const visit = { id: 'visit', revision: 1 } as Visit;
  outbox.put(visit);
  await Promise.resolve();
  outbox.put({ ...visit, revision: 2 });
  await Promise.resolve();
  expect(outbox.size).toBe(1);
  fail = false;
  await outbox.flush();
  expect(revisions).toEqual([2]);
  expect(outbox.size).toBe(0);
});

test('export control stays disabled until a successful read', () => {
  const props = {
    range: 'day' as const, onRangeChange: () => {}, dateLabel: 'Today',
    onBack: () => {}, onForward: () => {}, forwardDisabled: true,
    daypart: [], onDaypartChange: () => {}, onExport: () => {}, comparisonLabel: '',
  };
  const failed = renderToStaticMarkup(createElement(TelemetryFilters, { ...props, exportDisabled: true }));
  expect(/class="analysis-export"[^>]*disabled/.test(failed)).toBe(true);
  const loaded = renderToStaticMarkup(createElement(TelemetryFilters, { ...props, exportDisabled: false }));
  expect(/class="analysis-export"[^>]*disabled/.test(loaded)).toBe(false);
});
