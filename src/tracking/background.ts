// Types & Models
import type { TrackingResponses } from '../types/tracking';
import type { TrackingService } from './service';

// Tokens & Meta
import { MAINTENANCE_ALARM, MAX_FUTURE_VISIT_MS } from '../config/tracking';

// Utilities & Helpers
import { platformForUrl } from '../utils/reelDetection';
import { parseTrackingRequest } from '../utils/trackingMessages';
import { reportFailure, TrackingError } from '../runtime/errors';

export async function handleTrackingMessage(
  value: unknown,
  sender: chrome.runtime.MessageSender,
  service: TrackingService,
): Promise<TrackingResponses[keyof TrackingResponses]> {
  const message = parseTrackingRequest(value);
  if (sender.id !== chrome.runtime.id || !message) {
    throw new TrackingError('invalid-request');
  }
  if (message.type === 'tracking:query') {
    const extensionPage = sender.url?.startsWith(chrome.runtime.getURL(''));
    if (!extensionPage) {
      throw new TrackingError('invalid-request');
    }
    const data = await service.read(message.start, message.end);
    return { ok: true, ...data };
  }

  const platform = platformForUrl(sender.url ?? '');
  const tabId = sender.tab?.id;
  const validCollector = platform && tabId !== undefined && sender.frameId === 0;
  if (!validCollector) {
    throw new TrackingError('invalid-request');
  }
  switch (message.type) {
    case 'tracking:visit': {
      const validVisit = message.visit.platform === platform
        && message.visit.observedAt <= Date.now() + MAX_FUTURE_VISIT_MS;
      if (!validVisit) {
        throw new TrackingError('invalid-request');
      }
      await service.recordVisit(message.visit, tabId, sender.documentId);
      return { ok: true };
    }
    case 'tracking:heartbeat': {
      const focused = await service.heartbeat(message.collectorId, message.observing, tabId);
      return { ok: true, focused };
    }
    case 'tracking:health':
      await service.recordHealth(tabId, message.failed);
      return { ok: true };
  }
}

/** Registers synchronously; the caller starts maintenance after all handlers exist. */
export function installTrackingBackground(service: TrackingService): () => void {
  const focusChanged = () => {
    void service.notifyFocusChanged().catch(cause => reportFailure('Update focus', cause));
  };
  const tabRemoved = (tabId: number) => service.removeTab(tabId);
  const alarmFired = (alarm: chrome.alarms.Alarm) => {
    if (alarm.name === MAINTENANCE_ALARM) {
      void service.runMaintenance().catch(cause => reportFailure('Tracking maintenance', cause));
    }
  };
  chrome.tabs.onActivated.addListener(focusChanged);
  chrome.windows.onFocusChanged.addListener(focusChanged);
  chrome.tabs.onRemoved.addListener(tabRemoved);
  chrome.alarms.onAlarm.addListener(alarmFired);

  return () => {
    chrome.tabs.onActivated.removeListener(focusChanged);
    chrome.windows.onFocusChanged.removeListener(focusChanged);
    chrome.tabs.onRemoved.removeListener(tabRemoved);
    chrome.alarms.onAlarm.removeListener(alarmFired);
  };
}
