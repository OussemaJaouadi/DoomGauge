// Types & Models
import type { TrackingQuery } from './query';

// Tokens & Meta
import { CHANGE_REFRESH_DELAY_MS } from '../config/runtime';

// Utilities & Helpers
import { isBackgroundNotice } from '../utils/backgroundNotice';
import { reportFailure } from '../runtime/errors';

/** Changes refresh visible pages; returning to a hidden page always reads once. */
export function watchTracking(query: TrackingQuery, start: number, end: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const visible = () => document.visibilityState === 'visible';
  const onMessage = (message: unknown, sender: chrome.runtime.MessageSender, reply?: (value: unknown) => void) => {
    if (!isBackgroundNotice(message, sender, chrome.runtime.id)) {
      return;
    }
    reply?.({ ok: true });
    if (!visible()) {
      return;
    }
    if (message.type === 'background:ready') {
      void query.reconnect();
      return;
    }
    const overlaps = message.start === undefined || message.end === undefined
      || (message.start < end && message.end >= start);
    if (overlaps && timer === undefined) {
      timer = setTimeout(() => {
        timer = undefined;
        if (visible()) {
          query.invalidate();
        }
      }, CHANGE_REFRESH_DELAY_MS);
    }
  };
  const onVisibility = () => {
    if (visible()) {
      query.invalidate();
    }
  };
  let listening = false;
  try {
    chrome.runtime.onMessage.addListener(onMessage);
    listening = true;
  } catch (cause) {
    reportFailure('Listen for activity changes', cause);
  }
  document.addEventListener('visibilitychange', onVisibility);
  void query.refresh();
  return () => {
    clearTimeout(timer);
    query.clearInvalidation();
    if (listening && chrome.runtime.id) {
      chrome.runtime.onMessage.removeListener(onMessage);
    }
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
