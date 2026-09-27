// Utilities & Helpers
import { startCollector } from '../tracking/content';

declare function test(name: string, run: () => void | Promise<void>): void;
declare function expect(value: unknown): { toBe(value: unknown): void };

test('ordinary supported pages send no heartbeats or saves while idle', async () => {
  const originals = {
    chrome: globalThis.chrome,
    document: globalThis.document,
    window: globalThis.window,
    MutationObserver: globalThis.MutationObserver,
    IntersectionObserver: globalThis.IntersectionObserver,
  };
  const document = Object.assign(new EventTarget(), {
    visibilityState: 'visible',
    hasFocus: () => true,
    documentElement: {},
    location: new URL('https://www.youtube.com/watch?v=ordinary'),
    querySelectorAll: () => [],
  });
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const listeners = new Set<unknown>();
  let messages = 0;
  Object.assign(globalThis, {
    document,
    window: new EventTarget(),
    MutationObserver: Observer,
    IntersectionObserver: Observer,
    chrome: { runtime: {
      onMessage: {
        addListener: (listener: unknown) => listeners.add(listener),
        removeListener: (listener: unknown) => listeners.delete(listener),
      },
      sendMessage: async () => { messages += 1; return { ok: true, focused: true }; },
    } },
  });
  const stop = startCollector('youtube');
  try {
    expect(startCollector('youtube')).toBe(stop);
    await new Promise(resolve => setTimeout(resolve, 2100));
    expect(messages).toBe(0);
    expect(listeners.size).toBe(1);
  } finally {
    stop();
    expect(listeners.size).toBe(0);
    Object.assign(globalThis, originals);
  }
});
