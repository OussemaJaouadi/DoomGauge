// Types & Models
import type { CollectorProbe } from '../types/runtime';

// Tokens & Meta
import { PROBE_TIMEOUT_MS } from '../config/runtime';

// Utilities & Helpers
import { reportDeliveryFailure } from './errors';

export async function isTabFocused(tabId: number): Promise<boolean> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id !== tabId) {
    return false;
  }
  const window = await chrome.windows.get(tab.windowId);
  return window.focused;
}

export async function probeVisit(tabId: number): Promise<CollectorProbe> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<undefined>(resolve => {
      timer = setTimeout(() => resolve(undefined), PROBE_TIMEOUT_MS);
    });
    const response = await Promise.race([
      chrome.tabs.sendMessage(tabId, { type: 'tracking:probe' }),
      deadline,
    ]);
    if (!response || typeof response.collectorId !== 'string') {
      return { status: 'unknown' };
    }
    return { status: 'responded', visitId: typeof response.visitId === 'string' ? response.visitId : undefined };
  } catch (cause) {
    const missing = cause instanceof Error
      && (cause.message.includes('Receiving end does not exist') || cause.message.includes('No tab with id'));
    if (missing) {
      return { status: 'absent' };
    }
    reportDeliveryFailure('Probe collector', cause);
    return { status: 'unknown' };
  } finally {
    clearTimeout(timer);
  }
}
