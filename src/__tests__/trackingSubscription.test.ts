// Types & Models
import type { TrackingData } from '../types/tracking';

// Tokens & Meta
import { CHANGE_REFRESH_DELAY_MS } from '../config/runtime';

// Utilities & Helpers
import { TrackingQuery } from '../tracking/query';
import { watchTracking } from '../tracking/subscription';
import { ThemeController } from '../theme/controller';
import { TrackingError } from '../runtime/errors';

declare function test(name: string, run: () => void | Promise<void>): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void };

const empty: TrackingData = { visits: [], coverage: [], savingFailed: false };
const settle = () => new Promise(resolve => setTimeout(resolve, CHANGE_REFRESH_DELAY_MS + 20));

test('visible pages stay idle, coalesce relevant notices, and refresh when returning from hidden', async () => {
  const originalChrome = globalThis.chrome;
  const originalDocument = globalThis.document;
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  let listener: ((message: unknown, sender: chrome.runtime.MessageSender) => void) | undefined;
  Object.assign(globalThis, {
    document,
    chrome: { runtime: { id: 'extension', onMessage: {
      addListener: (callback: typeof listener) => { listener = callback; },
      removeListener: () => { listener = undefined; },
    } } },
  });
  let reads = 0;
  const query = new TrackingQuery(async () => { reads += 1; return empty; });
  const stop = watchTracking(query, 100, 200);
  try {
    await new Promise(resolve => setTimeout(resolve, 2100));
    expect(reads).toBe(1);
    listener!({ type: 'tracking:changed', start: 300, end: 400 }, { id: 'extension' });
    listener!({ type: 'tracking:changed' }, { id: 'other' });
    listener!({ type: 'tracking:changed' }, { id: 'extension', tab: { id: 1 } as chrome.tabs.Tab });
    await settle();
    expect(reads).toBe(1);
    for (let index = 0; index < 5; index += 1) {
      listener!({ type: 'tracking:changed', start: 150, end: 180 }, { id: 'extension' });
    }
    await settle();
    expect(reads).toBe(2);
    document.visibilityState = 'hidden';
    listener!({ type: 'tracking:changed' }, { id: 'extension' });
    await settle();
    expect(reads).toBe(2);
    document.visibilityState = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect(reads).toBe(3);
    listener!({ type: 'tracking:changed' }, { id: 'extension' });
    stop();
    await settle();
    expect(reads).toBe(3);
    expect(listener).toBe(undefined);
  } finally {
    stop();
    Object.assign(globalThis, { chrome: originalChrome, document: originalDocument });
  }
});

test('changes during a read queue exactly one follow-up read', async () => {
  let resolve!: (data: TrackingData) => void;
  let reads = 0;
  const query = new TrackingQuery(() => {
    reads += 1;
    return new Promise(complete => { resolve = complete; });
  });
  const first = query.refresh();
  await Promise.resolve();
  query.invalidate();
  query.invalidate();
  resolve(empty);
  await first;
  expect(reads).toBe(2);
  const second = query.refresh();
  resolve({ ...empty, savingFailed: true });
  await second;
  expect(reads).toBe(2);
  expect(query.getSnapshot().data.savingFailed).toBe(true);
});

test('background readiness recovers a failed read without replaying theme saves', async () => {
  let offline = true;
  const query = new TrackingQuery(async () => {
    if (offline) {
      throw new TrackingError('background-unavailable');
    }
    return empty;
  });
  const operations: string[] = [];
  const theme = new ThemeController(async message => {
    operations.push(message.type);
    if (offline) {
      throw new TrackingError('background-unavailable');
    }
    return { ok: true, preference: 'dark' };
  }, () => {});
  await query.refresh();
  await theme.initialize();
  offline = false;
  await query.reconnect();
  await theme.reconnect();
  expect(query.getSnapshot().status).toBe('success');
  expect(theme.getSnapshot().preference).toBe('dark');
  expect(operations).toEqual(['theme:get', 'theme:get']);
  offline = true;
  await theme.choose('light');
  const count = operations.length;
  offline = false;
  await theme.reconnect();
  expect(operations.length).toBe(count);
  expect(theme.getSnapshot().failedOperation).toBe('save');
});
