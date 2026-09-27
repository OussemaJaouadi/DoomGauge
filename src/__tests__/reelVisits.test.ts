// Types & Models
import type { Visit } from '../types/tracking';

// Utilities & Helpers
import { startCollector } from '../tracking/content';

declare function test(name: string, run: () => Promise<void>): void;
declare function expect(value: unknown): { toBe(value: unknown): void };

test('collectors distinguish repeat visits from loops, pauses, hidden tabs and player replacement', async () => {
  const originals = {
    chrome: globalThis.chrome,
    document: globalThis.document,
    window: globalThis.window,
    MutationObserver: globalThis.MutationObserver,
    IntersectionObserver: globalThis.IntersectionObserver,
    HTMLVideoElement: globalThis.HTMLVideoElement,
    innerWidth: globalThis.innerWidth,
    innerHeight: globalThis.innerHeight,
  };
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  class Video {
    paused = true;
    ended = false;
    seeking = false;
    readyState = 4;
    duration = 10;
    isConnected = true;
    closest() { return null; }
    getBoundingClientRect() {
      return { left: 0, right: 100, top: 0, bottom: 100, width: 100, height: 100 };
    }
  }
  try {
    for (const platform of ['youtube', 'facebook', 'instagram'] as const) {
      const route = platform === 'youtube' ? 'shorts' : 'reel';
      const url = (id: string) => new URL(`https://www.${platform}.com/${route}/${id}`);
      let video = new Video();
      const controls = { closest: () => null };
      const player = {
        contains: (element: unknown) => element === controls,
        matches: () => false,
        getBoundingClientRect: () => video.getBoundingClientRect(),
        querySelectorAll: () => [video],
      };
      Object.assign(video, { parentElement: player });
      const document = Object.assign(new EventTarget(), {
        visibilityState: 'visible',
        hasFocus: () => true,
        documentElement: {},
        location: url('A'),
        querySelectorAll: () => [video],
        elementFromPoint: () => controls,
      });
      const window = new EventTarget();
      const visits = new Map<string, Visit>();
      Object.assign(globalThis, {
        document, window,
        MutationObserver: Observer,
        IntersectionObserver: Observer,
        HTMLVideoElement: Video,
        innerWidth: 100,
        innerHeight: 100,
        chrome: { runtime: {
          onMessage: { addListener() {}, removeListener() {} },
          sendMessage: async (message: { type: string; visit?: Visit }) => {
            if (message.visit) {
              visits.set(message.visit.id, structuredClone(message.visit));
            }
            return { ok: true, focused: true };
          },
        } },
      });
      const step = async () => {
        window.dispatchEvent(new Event('focus'));
        await new Promise(resolve => setTimeout(resolve, 5));
      };
      const stop = startCollector(platform);
      try {
        await step();
        expect(visits.size).toBe(0);
        video.paused = false;
        video.readyState = 2;
        await step();
        expect(visits.size).toBe(0);
        video.readyState = 4;
        await step();
        video.paused = true;
        await step();
        video.paused = false;
        await step();
        await step(); // Loop: same content, same encounter.
        video = new Video();
        Object.assign(video, { parentElement: player });
        video.paused = false;
        await step();
        document.visibilityState = 'hidden';
        await step();
        document.visibilityState = 'visible';
        await step();
        await step();
        document.location = url('B');
        await step();
        document.location = url('A');
        await step();
        document.location = new URL(`https://www.${platform}.com/`);
        await step();
        document.location = url('A');
        await step();
        await step();
      } finally {
        stop();
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(visits.size).toBe(4);
      expect([...visits.values()].map(visit => visit.reelId).join(',')).toBe('A,B,A,A');
    }
  } finally {
    Object.assign(globalThis, originals);
  }
});
