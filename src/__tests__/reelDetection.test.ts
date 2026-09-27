// Utilities & Helpers
import { findReel } from '../tracking/detection';
import { reelIdentity } from '../utils/reelDetection';

declare function test(name: string, run: () => void): void;
declare function expect(value: unknown): { toBe(value: unknown): void };

// Small DOM tree fixture: containment follows parents, including SVG descendants.
class PlayerElement {
  parentElement: PlayerElement | null = null;
  children: PlayerElement[] = [];
  left = 0;
  top = 0;
  width = 100;
  height = 100;

  constructor(readonly tagName: string) {}

  append(child: PlayerElement) {
    child.parentElement = this;
    this.children.push(child);
  }

  contains(element: PlayerElement): boolean {
    return element === this || this.children.some(child => child.contains(element));
  }

  matches() {
    return ['BODY', 'HTML', 'MAIN'].includes(this.tagName);
  }

  closest(selector: string): PlayerElement | null {
    if (!selector.includes('dialog')) {
      return null;
    }
    if (this.tagName === 'DIALOG') {
      return this;
    }
    return this.parentElement?.closest(selector) ?? null;
  }

  querySelectorAll(): PlayerElement[] {
    return this.children.flatMap(child => {
      return child.tagName === 'VIDEO' ? [child] : child.querySelectorAll();
    });
  }

  getBoundingClientRect() {
    return {
      left: this.left, right: this.left + this.width,
      top: this.top, bottom: this.top + this.height,
      width: this.width, height: this.height,
    };
  }
}

test('SVG and transparent controls qualify one visible player among seven videos', () => {
  const originalWidth = globalThis.innerWidth;
  const originalHeight = globalThis.innerHeight;
  Object.assign(globalThis, { innerWidth: 100, innerHeight: 100 });
  const body = new PlayerElement('BODY');
  const player = new PlayerElement('DIV');
  const video = new PlayerElement('VIDEO');
  const controls = new PlayerElement('DIV');
  const button = new PlayerElement('BUTTON');
  const svg = new PlayerElement('SVG');
  const path = new PlayerElement('PATH');
  body.append(player);
  player.append(video);
  player.append(controls);
  controls.append(button);
  button.append(svg);
  svg.append(path);
  const videos = [video];
  for (let index = 1; index < 7; index++) {
    const preload = new PlayerElement('VIDEO');
    preload.top = index * 100;
    body.append(preload);
    videos.push(preload);
  }
  let hit: PlayerElement | null = path;
  const document = {
    location: new URL('https://www.instagram.com/reels/DdIdLFeR007/'),
    querySelectorAll: () => videos,
    elementFromPoint: () => hit,
  };
  try {
    expect(findReel('instagram', document as unknown as Document)?.video).toBe(video);
    hit = controls;
    expect(findReel('instagram', document as unknown as Document)?.video).toBe(video);
    hit = player;
    expect(findReel('instagram', document as unknown as Document)?.video).toBe(video);
    player.width = 101;
    expect(findReel('instagram', document as unknown as Document)?.video).toBe(video);
    player.width = 200;
    expect(findReel('instagram', document as unknown as Document)).toBe(undefined);
    player.width = 100;
    const overlay = new PlayerElement('DIV');
    body.append(overlay);
    hit = overlay;
    expect(findReel('instagram', document as unknown as Document)).toBe(undefined);
    const dialog = new PlayerElement('DIALOG');
    player.append(dialog);
    hit = dialog;
    expect(findReel('instagram', document as unknown as Document)).toBe(undefined);
    const secondVideo = new PlayerElement('VIDEO');
    secondVideo.top = 100;
    player.append(secondVideo);
    hit = path;
    expect(findReel('instagram', document as unknown as Document)).toBe(undefined);
    hit = null;
    expect(findReel('instagram', document as unknown as Document)).toBe(undefined);
  } finally {
    Object.assign(globalThis, { innerWidth: originalWidth, innerHeight: originalHeight });
  }
});

test('messages and home feeds cannot qualify through nearby reel links', () => {
  const video = {
    closest: () => ({ querySelector: () => ({ href: 'https://www.facebook.com/reel/123/' }) }),
    getBoundingClientRect: () => ({ left: 0, right: 100, top: 0, bottom: 100, width: 100, height: 100 }),
  };
  for (const platform of ['facebook', 'instagram'] as const) {
    for (const path of ['/', '/messages/', '/direct/inbox/', '/reels/', '/reel/123/comments']) {
      const document = {
        location: new URL(`https://www.${platform}.com${path}`),
        querySelectorAll: () => [video],
        elementFromPoint: () => video,
      };
      expect(findReel(platform, document as unknown as Document)).toBe(undefined);
    }
  }
  expect(reelIdentity('facebook', 'https://example.com/reel/123')).toBe(undefined);
  expect(reelIdentity('instagram', 'https://www.facebook.com/reel/123')).toBe(undefined);
});

test('covered and ambiguous players do not count; stale YouTube player identity is rejected', () => {
  const originalWidth = globalThis.innerWidth;
  const originalHeight = globalThis.innerHeight;
  Object.assign(globalThis, { innerWidth: 100, innerHeight: 100 });
  const video = {
    closest: () => null,
    getBoundingClientRect: () => ({ left: 0, right: 100, top: 0, bottom: 100, width: 100, height: 100 }),
  };
  const document = {
    location: new URL('https://www.facebook.com/reel/123/'),
    querySelectorAll: () => [video],
    elementFromPoint: () => ({}),
  };
  try {
    expect(findReel('facebook', document as unknown as Document)).toBe(undefined);
    document.elementFromPoint = () => video;
    expect(findReel('facebook', document as unknown as Document)?.reelId).toBe('123');
    const secondVideo = {
      ...video,
      getBoundingClientRect: () => ({ left: 50, right: 100, top: 0, bottom: 100, width: 50, height: 100 }),
    };
    const firstVideo = {
      ...video,
      getBoundingClientRect: () => ({ left: 0, right: 50, top: 0, bottom: 100, width: 50, height: 100 }),
    };
    const ambiguousDocument = {
      ...document,
      querySelectorAll: () => [firstVideo, secondVideo],
      elementFromPoint: (x: number) => x < 50 ? firstVideo : secondVideo,
    };
    expect(findReel('facebook', ambiguousDocument as unknown as Document)).toBe(undefined);
    const staleVideo = { ...video, closest: () => ({ getAttribute: () => 'old' }) };
    const youtubeDocument = {
      ...document,
      location: new URL('https://www.youtube.com/shorts/new'),
      querySelectorAll: () => [staleVideo],
      elementFromPoint: () => staleVideo,
    };
    expect(findReel('youtube', youtubeDocument as unknown as Document)).toBe(undefined);
  } finally {
    Object.assign(globalThis, { innerWidth: originalWidth, innerHeight: originalHeight });
  }
});
