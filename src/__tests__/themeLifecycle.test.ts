// Types & Models
import type { ThemeResponse } from '../types/theme';

declare function test(name: string, run: () => void | Promise<void>): void;
declare function expect(value: unknown): { toBe(value: unknown): void };

test('theme subscriptions coalesce and disposed clients cannot repaint after a late response', async () => {
  const originalChrome = globalThis.chrome;
  const originalDocument = globalThis.document;
  const originalMedia = globalThis.matchMedia;
  const messages = new Set<unknown>();
  const changes = new Set<unknown>();
  const root = { dataset: { theme: '' }, style: { colorScheme: '', setProperty: () => {} } };
  let complete!: (response: ThemeResponse) => void;
  let reads = 0;
  Object.assign(globalThis, {
    document: { documentElement: root },
    matchMedia: () => ({
      matches: true,
      addEventListener: (_name: string, listener: unknown) => changes.add(listener),
      removeEventListener: (_name: string, listener: unknown) => changes.delete(listener),
    }),
    chrome: { runtime: {
      onMessage: {
        addListener: (listener: unknown) => messages.add(listener),
        removeListener: (listener: unknown) => messages.delete(listener),
      },
      sendMessage: () => {
        reads += 1;
        return new Promise(resolve => { complete = resolve; });
      },
    } },
  });
  const { initializeTheme, disposeTheme } = await import('../theme/client');
  try {
    const pending = initializeTheme();
    expect(root.dataset.theme).toBe('dark');
    expect(initializeTheme()).toBe(pending);
    expect(messages.size).toBe(1);
    expect(changes.size).toBe(1);
    await Promise.resolve();
    expect(reads).toBe(1);
    disposeTheme();
    complete({ ok: true, preference: 'light' });
    await pending;
    expect(root.dataset.theme).toBe('dark');
    expect(messages.size).toBe(0);
    expect(changes.size).toBe(0);
    await initializeTheme();
    expect(root.dataset.theme).toBe('light');
    expect(messages.size).toBe(1);
    expect(reads).toBe(1);
  } finally {
    disposeTheme();
    Object.assign(globalThis, { chrome: originalChrome, document: originalDocument, matchMedia: originalMedia });
  }
});
