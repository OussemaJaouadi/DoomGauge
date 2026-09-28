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
    Element: globalThis.Element,
    HTMLVideoElement: globalThis.HTMLVideoElement,
  };
  let pageScans = 0;
  const document = Object.assign(new EventTarget(), {
    visibilityState: 'visible',
    hasFocus: () => true,
    documentElement: {},
    location: new URL('https://www.youtube.com/watch?v=ordinary'),
    querySelectorAll: () => { pageScans += 1; return []; },
  });
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  let mutationCallback: MutationCallback | undefined;
  class MutationWatcher extends Observer {
    constructor(callback: MutationCallback) {
      super();
      mutationCallback = callback;
    }
  }
  let videosObserved = 0;
  class IntersectionWatcher extends Observer {
    override observe() { videosObserved += 1; }
  }
  class PageElement {
    querySelectorAll() { return []; }
  }
  class PageVideo extends PageElement {
    isConnected = true;
  }
  const listeners = new Set<unknown>();
  let messages = 0;
  Object.assign(globalThis, {
    document,
    window: new EventTarget(),
    MutationObserver: MutationWatcher,
    IntersectionObserver: IntersectionWatcher,
    Element: PageElement,
    HTMLVideoElement: PageVideo,
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
    const scanCount = pageScans;
    mutationCallback!([{ type: 'childList', addedNodes: [new PageElement()] } as unknown as MutationRecord], {} as MutationObserver);
    expect(pageScans).toBe(scanCount);
    mutationCallback!([{ type: 'childList', addedNodes: [new PageVideo()] } as unknown as MutationRecord], {} as MutationObserver);
    expect(videosObserved).toBe(1);
    await new Promise(resolve => setTimeout(resolve, 2100));
    expect(messages).toBe(0);
    expect(listeners.size).toBe(1);
  } finally {
    stop();
    expect(listeners.size).toBe(0);
    Object.assign(globalThis, originals);
  }
});
