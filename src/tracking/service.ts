// Types & Models
import type { CollectorHealth, TrackingData, Visit } from '../types/tracking';

// Tokens & Meta
import { COVERAGE_GAP_MS } from '../config/tracking';

// Utilities & Helpers
import { readTracking, saveVisit, saveCoverage, recoverVisits, rebuildRollups } from '../storage/activityRepository';
import { findSupportedTabs, isTabFocused, probeVisit } from '../runtime/tabs';
import { reportDeliveryFailure } from '../runtime/errors';

/** One instance per worker. Sampling and checkpoint queues remain in each collector. */
export class TrackingService {
  private tabsWithSaveFailures = new Set<number>();
  private collectors = new Map<string, CollectorHealth>();
  private maintenance: Promise<void> | undefined;
  private reads = new Map<string, Promise<TrackingData>>();
  private stopped = false;

  stop(): void {
    this.stopped = true;
    this.collectors.clear();
    this.tabsWithSaveFailures.clear();
    this.reads.clear();
  }

  read(start: number, end: number): Promise<TrackingData> {
    const key = `${start}:${end}`;
    const pending = this.reads.get(key);
    if (pending) {
      return pending;
    }
    const reading = readTracking(start, end).then(records => {
      return { ...records, savingFailed: this.tabsWithSaveFailures.size > 0 };
    }).finally(() => {
      this.reads.delete(key);
    });
    this.reads.set(key, reading);
    return reading;
  }

  async recordVisit(visit: Visit, tabId: number, documentId?: string): Promise<void> {
    await saveVisit({
      ...visit,
      tabId,
      documentId: documentId ?? `${tabId}:${visit.collectorId}`,
      receivedAt: Date.now(),
    });
    this.tabsWithSaveFailures.delete(tabId);
  }

  async heartbeat(collectorId: string, observing: boolean, tabId: number): Promise<boolean> {
    const focused = await isTabFocused(tabId);
    if (this.stopped) {
      return false;
    }
    const now = Date.now();
    const previous = this.collectors.get(collectorId);
    const isObserving = focused && observing;
    const continuous = previous?.observing && isObserving && previous.tabId === tabId
      && now >= previous.lastHeartbeatAt && now - previous.lastHeartbeatAt < COVERAGE_GAP_MS;
    const start = continuous ? previous.coverageStart : now;
    if (continuous) {
      await saveCoverage({ id: `${collectorId}:${start}`, tabId, startTs: start, endTs: now });
    }
    if (!this.stopped) {
      this.collectors.set(collectorId, { tabId, lastHeartbeatAt: now, observing: isObserving, coverageStart: start });
    }
    return focused;
  }

  async recordHealth(tabId: number, failed: boolean): Promise<void> {
    if (failed) {
      this.tabsWithSaveFailures.add(tabId);
    } else {
      this.tabsWithSaveFailures.delete(tabId);
    }
    await chrome.action.setBadgeText({ text: this.tabsWithSaveFailures.size ? '!' : '' });
  }

  removeTab(tabId: number): void {
    this.tabsWithSaveFailures.delete(tabId);
    for (const [collectorId, status] of this.collectors) {
      if (status.tabId === tabId) {
        this.collectors.delete(collectorId);
      }
    }
  }

  async notifyFocusChanged(): Promise<void> {
    for (const status of this.collectors.values()) {
      status.observing = false;
    }
    const tabs = await findSupportedTabs();
    if (this.stopped) {
      return;
    }
    await Promise.all(tabs.map(async tab => {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'tracking:focus' });
      } catch (cause) {
        reportDeliveryFailure('Notify collector focus', cause);
      }
    }));
  }

  runMaintenance(): Promise<void> {
    if (this.stopped) {
      return Promise.resolve();
    }
    if (!this.maintenance) {
      this.maintenance = this.recoverAndSummarize().finally(() => {
        this.maintenance = undefined;
      });
    }
    return this.maintenance;
  }

  private async recoverAndSummarize(): Promise<void> {
    const tabs = await findSupportedTabs();
    if (this.stopped) {
      return;
    }
    const visits = await Promise.all(tabs.map(tab => probeVisit(tab.id)));
    if (this.stopped) {
      return;
    }
    const survivingIds = visits.filter((id): id is string => id !== undefined);
    await recoverVisits(new Set(survivingIds));
    if (this.stopped) {
      return;
    }
    // Prune navigation/reload remnants; coverage across these gaps is unknown.
    const oldestHeartbeat = Date.now() - COVERAGE_GAP_MS;
    for (const [id, collector] of this.collectors) {
      if (collector.lastHeartbeatAt < oldestHeartbeat) {
        this.collectors.delete(id);
      }
    }
    await rebuildRollups();
  }
}
