// Types & Models
import type { ThemeResponse } from '../types/theme';

// Utilities & Helpers
import { ThemeController } from '../theme/controller';
import { sendTracking } from '../tracking/messages';
import { sendRequest } from '../runtime/messages';
import { isThemeResponse } from '../utils/theme';
import { TrackingError } from '../runtime/errors';

declare function test(name: string, run: () => void | Promise<void>): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void };

test('theme fallback applies synchronously while duplicate initialization shares the pending read', async () => {
  let complete!: (value: ThemeResponse) => void;
  let reads = 0;
  const applied: string[] = [];
  const controller = new ThemeController(() => {
    reads += 1;
    return new Promise(resolve => { complete = resolve; });
  }, preference => applied.push(preference));
  const pending = controller.initialize();
  expect(applied[0]).toBe('system');
  expect(controller.initialize()).toBe(pending);
  expect(reads).toBe(1);
  complete({ ok: true, preference: 'dark' });
  await pending;
  await controller.initialize();
  expect(reads).toBe(1);
  expect(controller.getSnapshot().preference).toBe('dark');
});

test('retrying a failed theme read never saves the fallback preference', async () => {
  const operations: string[] = [];
  const controller = new ThemeController(async message => {
    operations.push(message.type);
    if (operations.length === 1) {
      throw new TrackingError('background-unavailable');
    }
    return { ok: true, preference: 'dark' };
  }, () => {});
  await controller.initialize();
  expect(controller.getSnapshot().failedOperation).toBe('read');
  await controller.retry();
  expect(operations).toEqual(['theme:get', 'theme:get']);
  expect(controller.getSnapshot().preference).toBe('dark');
  expect(controller.getSnapshot().error).toBe(false);
});

test('a failed theme save retains local appearance through broadcasts and retries the save', async () => {
  const operations: string[] = [];
  const controller = new ThemeController(async message => {
    operations.push(message.type);
    if (operations.length === 1) {
      throw new TrackingError('storage-failed');
    }
    return { ok: true, preference: 'light' };
  }, () => {});
  await controller.choose('light');
  controller.receive('dark');
  expect(controller.getSnapshot().preference).toBe('light');
  expect(controller.getSnapshot().failedOperation).toBe('save');
  await controller.retry();
  expect(operations).toEqual(['theme:set', 'theme:set']);
  expect(controller.getSnapshot().error).toBe(false);
});

test('a late failed read cannot replace a newer theme choice or its state', async () => {
  let rejectRead!: (cause: Error) => void;
  const controller = new ThemeController(message => {
    if (message.type === 'theme:get') {
      return new Promise((_, reject) => { rejectRead = reject; });
    }
    return Promise.resolve({ ok: true, preference: message.preference });
  }, () => {});
  const reading = controller.initialize();
  await controller.choose('light');
  rejectRead(new Error('old read failed'));
  await reading;
  expect(controller.getSnapshot().preference).toBe('light');
  expect(controller.getSnapshot().error).toBe(false);
});

test('unavailable reads recover; writes and structured storage failures never replay', async () => {
  const original = globalThis.chrome;
  let attempts = 0;
  const cause = new Error('Could not establish connection. Receiving end does not exist.');
  Object.assign(globalThis, { chrome: { runtime: { sendMessage: () => {
    attempts += 1;
    if (attempts === 1) {
      throw cause;
    }
    return { ok: true, preference: 'dark' };
  } } } });
  try {
    const result = await sendRequest({ type: 'theme:get' }, isThemeResponse, { retryUnavailable: true });
    expect(result.preference).toBe('dark');
    expect(attempts).toBe(2);
    attempts = 0;
    try {
      await sendTracking({ type: 'tracking:health', failed: true });
    } catch (error) {
      expect(error instanceof Error && error.cause).toBe(cause);
    }
    expect(attempts).toBe(1);
    attempts = 0;
    chrome.runtime.sendMessage = (() => {
      attempts += 1;
      return Promise.resolve({ ok: false, code: 'storage-failed' });
    }) as typeof chrome.runtime.sendMessage;
    try {
      await sendTracking({ type: 'tracking:query', start: 0, end: 1 });
    } catch (error) {
      expect(error instanceof TrackingError && error.code).toBe('storage-failed');
    }
    expect(attempts).toBe(1);
  } finally {
    Object.assign(globalThis, { chrome: original });
  }
});

test('reads can reconnect after a longer worker restart and stop after bounded retries', async () => {
  const original = globalThis.chrome;
  let attempts = 0;
  let unavailable = true;
  Object.assign(globalThis, { chrome: { runtime: { sendMessage: async () => {
    attempts += 1;
    if (unavailable || attempts < 3) {
      throw new Error('Receiving end does not exist');
    }
    return { ok: true, preference: 'dark' };
  } } } });
  try {
    const failed = await sendRequest({ type: 'theme:get' }, isThemeResponse, { retryUnavailable: true }).then(() => false, () => true);
    expect(failed).toBe(true);
    expect(attempts).toBe(4);
    attempts = 0;
    unavailable = false;
    const result = await sendRequest({ type: 'theme:get' }, isThemeResponse, { retryUnavailable: true });
    expect(result.preference).toBe('dark');
    expect(attempts).toBe(3);
  } finally {
    Object.assign(globalThis, { chrome: original });
  }
});

test('stale extension contexts receive an actionable error without automatic retries', async () => {
  const original = globalThis.chrome;
  let attempts = 0;
  Object.assign(globalThis, { chrome: { runtime: { sendMessage: () => {
    attempts += 1;
    throw new Error('Extension context invalidated.');
  } } } });
  try {
    try {
      await sendRequest({ type: 'theme:get' }, isThemeResponse, { retryUnavailable: true });
      throw new Error('Expected a stale-context error');
    } catch (cause) {
      expect(cause instanceof TrackingError && cause.code).toBe('extension-reloaded');
    }
    expect(attempts).toBe(1);
  } finally {
    Object.assign(globalThis, { chrome: original });
  }
});
