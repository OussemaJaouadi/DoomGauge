import type { Platform } from '../types/models';
import { VisitTracker } from './engine';
import { Outbox } from './outbox';
import { findReel } from '../utils/reelDetection';
import type { ReelCandidate } from '../types/tracking';
import { sendTracking } from './messages';
import { reportFailure } from '../utils/errors';
import { CHECKPOINT_MS, MAX_SAMPLE_GAP_MS, CLOCK_TOLERANCE_MS } from '../config/tracking';
import { canAccumulate } from '../utils/tracking';

const SAMPLE_MS = 500;
const FOCUS_LEASE_MS = 4000;
const MEDIA_EVENTS = ['play', 'playing', 'pause', 'waiting', 'stalled', 'seeking', 'seeked', 'ended'];

export function startCollector(platform: Platform) {
  const collectorId = crypto.randomUUID();
  let candidate: ReelCandidate | undefined;
  let focused = false;
  let leaseUntil = 0;
  let stopped = false;
  let lastCheckpoint = 0;
  let lastTick = performance.now();
  let lastWall = Date.now();
  let heartbeatBusy = false;
  const buffering = new WeakSet<HTMLVideoElement>();
  const outbox = new Outbox(
    async visit => { await sendTracking({ type: 'tracking:visit', visit }); },
    failed => {
      void sendTracking({ type: 'tracking:health', failed })
        .catch(cause => reportFailure('Report collector health', cause));
    },
  );
  const tracker = new VisitTracker(collectorId, visit => outbox.put(visit));
  const pageVisible = () => document.visibilityState === 'visible' && document.hasFocus();
  const isFocused = () => focused && Date.now() < leaseUntil && pageVisible();

  async function heartbeat() {
    if (heartbeatBusy || stopped) return;
    if (!pageVisible()) {
      focused = false;
      return;
    }
    heartbeatBusy = true;
    try {
      const response = await sendTracking({
        type: 'tracking:heartbeat', collectorId, observing: Boolean(findReel(platform)),
      });
      focused = response.focused;
      leaseUntil = Date.now() + FOCUS_LEASE_MS;
    } catch (cause) {
      focused = false;
      reportFailure('Collector heartbeat', cause);
    } finally {
      heartbeatBusy = false;
    }
  }

  function sampleCandidate(next: ReelCandidate | undefined, wall: number, mono: number) {
    if (candidate && (!next || next.key !== candidate.key || next.video !== candidate.video)) {
      tracker.finish(wall, mono);
      candidate = undefined;
    }
    if (next && isFocused() && !tracker.current) {
      tracker.begin(platform, next.reelId, wall, mono);
      candidate = next;
    }
    if (!candidate) return;
    const video = candidate.video;
    const eligible = canAccumulate({
      focused: isFocused(), visible: document.visibilityState === 'visible',
      intersecting: Boolean(next), paused: video.paused, ended: video.ended,
      seeking: video.seeking, readyState: video.readyState, buffering: buffering.has(video),
    });
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration * 1000 : undefined;
    tracker.sample(eligible, wall, mono, duration);
  }

  function rememberSample(wall: number, mono: number) {
    lastTick = mono;
    lastWall = wall;
  }

  function tick() {
    if (stopped) return;
    const wall = Date.now();
    const mono = performance.now();
    const clockDrift = Math.abs((wall - lastWall) - (mono - lastTick));
    if (mono - lastTick > MAX_SAMPLE_GAP_MS || clockDrift > CLOCK_TOLERANCE_MS) {
      tracker.finish(lastWall, lastTick, 'interrupted');
      candidate = undefined;
    }
    if (!tracker.current && !pageVisible()) {
      if (outbox.size && wall - lastCheckpoint >= CHECKPOINT_MS) {
        void outbox.flush();
        lastCheckpoint = wall;
      }
      rememberSample(wall, mono);
      return;
    }
    sampleCandidate(findReel(platform), wall, mono);
    if (wall - lastCheckpoint >= CHECKPOINT_MS) {
      if (tracker.current && isFocused()) tracker.checkpoint();
      lastCheckpoint = wall;
      if (outbox.size) void outbox.flush();
      void heartbeat();
    }
    rememberSample(wall, mono);
  }

  function stateChange(event?: Event) {
    if (event?.target instanceof HTMLVideoElement) {
      if (event.type === 'waiting' || event.type === 'stalled') buffering.add(event.target);
      if (event.type === 'playing' || event.type === 'seeked') buffering.delete(event.target);
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
    if (!message || typeof message !== 'object' || !('type' in message)) return false;
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
    if (scheduled || stopped) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (!stopped) tick();
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

  return function stopCollector() {
    tracker.finish(Date.now(), performance.now(), 'interrupted');
    stopped = true;
    clearInterval(timer);
    mutations.disconnect();
    intersections.disconnect();
    observed.clear();
    chrome.runtime.onMessage.removeListener(onMessage);
    for (const [target, event, listener, capture] of subscriptions) {
      target.removeEventListener(event, listener, capture);
    }
  };
}
