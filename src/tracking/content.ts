// Types & Models
import type { Platform } from '../types/models';
import type { ReelCandidate } from '../types/tracking';

// Tokens & Meta
import { CHECKPOINT_MS, SAMPLE_MS, FOCUS_LEASE_MS } from '../config/tracking';

// Utilities & Helpers
import { VisitTracker } from './engine';
import { Outbox } from './outbox';
import { findReel } from './detection';
import { sendTracking } from './messages';
import { reportFailure } from '../runtime/errors';
import { canAccumulate } from '../utils/tracking';
import { reelIdentity } from '../utils/reelDetection';

const MEDIA_EVENTS = ['play', 'playing', 'pause', 'waiting', 'stalled', 'seeking', 'seeked', 'ended'];
const collectors = new Map<Platform, () => void>();

export function startCollector(platform: Platform): () => void {
  const existing = collectors.get(platform);
  if (existing) {
    return existing;
  }
  const collectorId = crypto.randomUUID();
  let candidate: ReelCandidate | undefined;
  let focused = false;
  let leaseUntil = 0;
  let stopped = false;
  let lastCheckpoint = 0;
  let heartbeatBusy = false;
  let reportedObserving = false;
  const buffering = new WeakSet<HTMLVideoElement>();
  const outbox = new Outbox(
    async visit => {
      await sendTracking({ type: 'tracking:visit', visit });
    },
    failed => {
      void sendTracking({ type: 'tracking:health', failed })
        .catch(cause => reportFailure('Report collector health', cause));
    },
  );
  const tracker = new VisitTracker(collectorId, visit => outbox.put(visit));
  const pageVisible = () => document.visibilityState === 'visible' && document.hasFocus();
  const isFocused = () => focused && Date.now() < leaseUntil && pageVisible();

  async function heartbeat() {
    if (heartbeatBusy || stopped) {
      return;
    }
    if (!pageVisible()) {
      focused = false;
      return;
    }
    const observing = Boolean(findReel(platform));
    if (!observing && !reportedObserving) {
      focused = false;
      return;
    }
    heartbeatBusy = true;
    try {
      const response = await sendTracking({
        type: 'tracking:heartbeat', collectorId, observing,
      });
      if (stopped) {
        return;
      }
      focused = response.focused;
      reportedObserving = observing;
      leaseUntil = Date.now() + FOCUS_LEASE_MS;
    } catch (cause) {
      focused = false;
      reportFailure('Collector heartbeat', cause);
    } finally {
      heartbeatBusy = false;
    }
  }

  function sampleCandidate(next: ReelCandidate | undefined, wall: number, mono: number) {
    const routeId = reelIdentity(platform, document.location.href);
    const candidateChanged = candidate && routeId !== candidate.reelId;
    if (candidateChanged) {
      tracker.finish(wall, mono);
      candidate = undefined;
    }
    if (!next) {
      tracker.sample(false, wall, mono);
      return;
    }
    const video = next.video;
    const eligible = canAccumulate({
      focused: isFocused(), visible: document.visibilityState === 'visible',
      intersecting: true, paused: video.paused, ended: video.ended,
      seeking: video.seeking, readyState: video.readyState, buffering: buffering.has(video),
    });
    if (!tracker.current && eligible) {
      tracker.begin(platform, next.reelId, wall, mono);
    }
    if (tracker.current) {
      candidate = next;
    }
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration * 1000 : undefined;
    tracker.sample(eligible, wall, mono, duration);
  }

  function tick() {
    if (stopped) {
      return;
    }
    const wall = Date.now();
    const mono = performance.now();
    if (!tracker.current && !pageVisible()) {
      if (outbox.size && wall - lastCheckpoint >= CHECKPOINT_MS) {
        void outbox.flush();
        lastCheckpoint = wall;
      }
      return;
    }
    sampleCandidate(findReel(platform), wall, mono);
    if (wall - lastCheckpoint >= CHECKPOINT_MS) {
      if (tracker.current && isFocused()) {
        tracker.checkpoint();
      }
      lastCheckpoint = wall;
      if (outbox.size) {
        void outbox.flush();
      }
      void heartbeat();
    }
  }

  function stateChange(event?: Event) {
    if (event?.target instanceof HTMLVideoElement) {
      if (event.type === 'waiting' || event.type === 'stalled') {
        buffering.add(event.target);
      }
      if (event.type === 'playing' || event.type === 'seeked') {
        buffering.delete(event.target);
      }
    }
    tick();
    tracker.checkpoint();
    void heartbeat();
  }

  function hidden() {
    tick();
    tracker.checkpoint();
  }

  function pagehide() {
    tracker.finish(Date.now(), performance.now(), 'completed');
    candidate = undefined;
  }

  function onMessage(message: unknown, _sender: chrome.runtime.MessageSender, reply: (value: unknown) => void) {
    if (!message || typeof message !== 'object' || !('type' in message)) {
      return false;
    }
    if (message.type === 'tracking:probe') {
      reply({ collectorId, visitId: tracker.current?.id });
      void heartbeat();
    }
    if (message.type === 'tracking:focus') {
      focused = false;
      hidden();
      void heartbeat();
    }
    return false;
  }

  // One subscription list keeps setup and teardown symmetrical.
  const subscriptions: [EventTarget, string, EventListener, boolean][] = [
    ...MEDIA_EVENTS.map(name => [document, name, stateChange, true] as [EventTarget, string, EventListener, boolean]),
    [document, 'visibilitychange', hidden, false],
    [window, 'blur', hidden, false],
    [window, 'focus', stateChange, false],
    [window, 'pagehide', pagehide, false],
    [window, 'pageshow', stateChange, false],
    [window, 'popstate', stateChange, false],
    [document, 'yt-navigate-finish', stateChange, false],
  ];
  chrome.runtime.onMessage.addListener(onMessage);
  for (const [target, event, listener, capture] of subscriptions) {
    target.addEventListener(event, listener, capture);
  }

  // Observers handle transitions; the timer remains a measurement/route fallback.
  let scheduled = false;
  const schedule = () => {
    if (scheduled || stopped) {
      return;
    }
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (!stopped) {
        tick();
      }
    });
  };
  const observed = new Set<HTMLVideoElement>();
  const intersections = new IntersectionObserver(schedule, { threshold: [0, .5, 1] });
  function syncVideos() {
    for (const video of observed) {
      if (!video.isConnected) {
        intersections.unobserve(video);
        observed.delete(video);
      }
    }
    for (const video of document.querySelectorAll('video')) {
      if (!observed.has(video)) {
        observed.add(video);
        intersections.observe(video);
      }
    }
    schedule();
  }
  const mutations = new MutationObserver(syncVideos);
  mutations.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  syncVideos();
  const timer = setInterval(tick, SAMPLE_MS);
  void heartbeat().then(tick).catch(cause => reportFailure('Start collector sampling', cause));

  function stopCollector() {
    if (stopped) {
      return;
    }
    stopped = true;
    collectors.delete(platform);
    tracker.finish(Date.now(), performance.now(), 'interrupted');
    clearInterval(timer);
    mutations.disconnect();
    intersections.disconnect();
    observed.clear();
    chrome.runtime.onMessage.removeListener(onMessage);
    for (const [target, event, listener, capture] of subscriptions) {
      target.removeEventListener(event, listener, capture);
    }
  }
  collectors.set(platform, stopCollector);
  return stopCollector;
}
