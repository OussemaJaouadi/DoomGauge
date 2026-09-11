import { platformForUrl } from '../utils/reelDetection';
import { validVisit } from '../utils/tracking';
import { saveVisit, readTracking, saveCoverage, recoverVisits, rebuildRollups } from './storage';
import { reportFailure, reportDeliveryFailure, TrackingError } from '../utils/errors';
import type { TrackingRequest, CollectorHealth } from '../types/tracking';

const tabsWithSaveFailures = new Set<number>();
const collectorHealth = new Map<string, CollectorHealth>();
const MAINTENANCE_ALARM = 'tracking-maintenance';
const COVERAGE_GAP_MS = 5000;

function isExtensionPage(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id
    && Boolean(sender.url?.startsWith(chrome.runtime.getURL('')));
}

async function isTabFocused(tabId: number): Promise<boolean> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id !== tabId) {
    return false;
  }
  return (await chrome.windows.get(tab.windowId)).focused;
}

async function findSupportedTabs(): Promise<(chrome.tabs.Tab & { id: number })[]> {
  const tabs = await chrome.tabs.query({});
  return tabs.filter((tab): tab is chrome.tabs.Tab & { id: number } =>
    tab.id !== undefined && Boolean(platformForUrl(tab.url ?? '')));
}

async function probeVisit(tabId: number): Promise<string | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      chrome.tabs.sendMessage(tabId, { type: 'tracking:probe' }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TrackingError('timeout')), 1500);
      }),
    ]);
    return typeof response?.visitId === 'string' ? response.visitId : undefined;
  } catch (cause) {
    reportDeliveryFailure('Probe collector', cause);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function runTrackingMaintenance(): Promise<void> {
  const tabs = await findSupportedTabs();
  const visits = await Promise.all(tabs.map(tab => probeVisit(tab.id)));
  const survivingVisitIds = new Set(visits.filter((id): id is string => id !== undefined));
  await recoverVisits(survivingVisitIds);
  await rebuildRollups();
}

async function recordHeartbeat(message: Extract<TrackingRequest, { type: 'tracking:heartbeat' }>, tabId: number) {
  const focused = await isTabFocused(tabId);
  const now = Date.now();
  const previous = collectorHealth.get(message.collectorId);
  const observing = focused && message.observing;
  const hasContinuousCoverage = previous?.observing && observing
    && now >= previous.lastHeartbeatAt && now - previous.lastHeartbeatAt < COVERAGE_GAP_MS;
  const start = hasContinuousCoverage ? previous.coverageStart : now;
  if (hasContinuousCoverage) {
    await saveCoverage({ id: `${message.collectorId}:${start}`, tabId, startTs: start, endTs: now });
  }
  collectorHealth.set(message.collectorId, { tabId, lastHeartbeatAt: now, observing, coverageStart: start });
  return { ok: true as const, focused };
}

function parseTrackingRequest(value: unknown): TrackingRequest {
  if (!value || typeof value !== 'object') {
    throw new TrackingError('invalid-request');
  }
  const message = value as Record<string, unknown>;
  switch (message.type) {
    case 'tracking:query':
      if (typeof message.start !== 'number' || typeof message.end !== 'number'
        || !Number.isFinite(message.start) || !Number.isFinite(message.end)
        || message.end <= message.start || message.end - message.start > 100 * 86400000) {
        break;
      }
      return { type: message.type, start: message.start, end: message.end };
    case 'tracking:visit':
      if (validVisit(message.visit)) {
        return { type: message.type, visit: message.visit };
      }
      break;
    case 'tracking:heartbeat':
      if (typeof message.collectorId !== 'string' || !message.collectorId.length
        || message.collectorId.length > 100 || typeof message.observing !== 'boolean') {
        break;
      }
      return { type: message.type, collectorId: message.collectorId, observing: message.observing };
    case 'tracking:health':
      if (typeof message.failed === 'boolean') {
        return { type: message.type, failed: message.failed };
      }
  }
  throw new TrackingError('invalid-request');
}

export async function handleTrackingMessage(value: unknown, sender: chrome.runtime.MessageSender) {
  if (sender.id !== chrome.runtime.id) {
    throw new TrackingError('invalid-request');
  }
  const message = parseTrackingRequest(value);
  if (message.type === 'tracking:query') {
    if (!isExtensionPage(sender)) {
      throw new TrackingError('invalid-request');
    }
    const data = await readTracking(message.start, message.end);
    return { ok: true as const, ...data, savingFailed: tabsWithSaveFailures.size > 0 };
  }

  const platform = platformForUrl(sender.url ?? '');
  const tabId = sender.tab?.id;
  if (!platform || tabId === undefined || sender.frameId !== 0) {
    throw new TrackingError('invalid-request');
  }
  switch (message.type) {
    case 'tracking:visit':
      if (message.visit.platform !== platform || message.visit.observedAt > Date.now() + 60000) {
        throw new TrackingError('invalid-request');
      }
      await saveVisit({
        ...message.visit, tabId,
        documentId: sender.documentId ?? `${tabId}:${message.visit.collectorId}`,
        receivedAt: Date.now(),
      });
      tabsWithSaveFailures.delete(tabId);
      return { ok: true as const };
    case 'tracking:heartbeat':
      return recordHeartbeat(message, tabId);
    case 'tracking:health':
      if (message.failed) {
        tabsWithSaveFailures.add(tabId);
      } else {
        tabsWithSaveFailures.delete(tabId);
      }
      await chrome.action.setBadgeText({ text: tabsWithSaveFailures.size ? '!' : '' });
      return { ok: true as const };
  }
}

async function notifyFocusChanged(): Promise<void> {
  for (const status of collectorHealth.values()) {
    status.observing = false;
  }
  const tabs = await findSupportedTabs();
  await Promise.all(tabs.map(tab =>
    chrome.tabs.sendMessage(tab.id, { type: 'tracking:focus' })
      .catch(cause => reportDeliveryFailure('Notify collector focus', cause))));
}

export function installTrackingBackground(): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, reply) => {
    if (!message || typeof message !== 'object' || !('type' in message)
      || typeof message.type !== 'string' || !message.type.startsWith('tracking:')) {
      return false;
    }
    void handleTrackingMessage(message, sender).then(reply, cause => {
      reply(reportFailure(message.type as string, cause));
    });
    return true;
  });
  const focusChanged = () => {
    void notifyFocusChanged().catch(cause => reportFailure('Update focus', cause));
  };
  chrome.tabs.onActivated.addListener(focusChanged);
  chrome.windows.onFocusChanged.addListener(focusChanged);
  chrome.tabs.onRemoved.addListener(tabId => {
    tabsWithSaveFailures.delete(tabId);
    for (const [collectorId, status] of collectorHealth) {
      if (status.tabId === tabId) {
        collectorHealth.delete(collectorId);
      }
    }
  });
  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === MAINTENANCE_ALARM) {
      void runTrackingMaintenance().catch(cause => reportFailure('Tracking maintenance', cause));
    }
  });
  void chrome.alarms.create(MAINTENANCE_ALARM, { periodInMinutes: 1 })
    .catch(cause => reportFailure('Schedule tracking maintenance', cause));
  void runTrackingMaintenance().catch(cause => reportFailure('Recover tracking', cause));
}
