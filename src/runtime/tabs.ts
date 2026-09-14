// Types & Models
import type { SupportedTab } from '../types/runtime';

// Tokens & Meta
import { PROBE_TIMEOUT_MS } from '../config/runtime';

// Utilities & Helpers
import { platformForUrl } from '../utils/reelDetection';
import { reportDeliveryFailure, TrackingError } from './errors';

export async function isTabFocused(tabId: number): Promise<boolean> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id !== tabId) {
    return false;
  }
  const window = await chrome.windows.get(tab.windowId);
  return window.focused;
}

export async function findSupportedTabs(): Promise<SupportedTab[]> {
  const tabs = await chrome.tabs.query({});
  return tabs.filter((tab): tab is SupportedTab => {
    return tab.id !== undefined && Boolean(platformForUrl(tab.url ?? ''));
  });
}

export async function probeVisit(tabId: number): Promise<string | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TrackingError('timeout')), PROBE_TIMEOUT_MS);
    });
    const response = await Promise.race([
      chrome.tabs.sendMessage(tabId, { type: 'tracking:probe' }),
      deadline,
    ]);
    return typeof response?.visitId === 'string' ? response.visitId : undefined;
  } catch (cause) {
    reportDeliveryFailure('Probe collector', cause);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
