// React & 3rd-party
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';

// Utilities & Helpers
import { startBackground } from '../runtime/background';
import { openLocalDatabase, closeLocalDatabase } from '../storage/database';
import { TrackingService } from '../tracking/service';

declare function test(name: string, run: () => void | Promise<void>): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void };

function event<T>() {
  const listeners = new Set<T>();
  return {
    listeners,
    addListener(listener: T) { listeners.add(listener); },
    removeListener(listener: T) { listeners.delete(listener); },
  };
}

test('both modes register one receiver before maintenance; teardown removes subscriptions', async () => {
  const originalChrome = globalThis.chrome;
  const originalDatabase = globalThis.indexedDB;
  const originalKeys = globalThis.IDBKeyRange;
  try {
    for (const devData of [true, false]) {
      const messages = event<(message: unknown, sender: chrome.runtime.MessageSender, reply: (value: unknown) => void) => boolean>();
      const tabs = event<() => void>();
      const windows = event<() => void>();
      const removed = event<(id: number) => void>();
      const alarms = event<(alarm: chrome.alarms.Alarm) => void>();
      let maintenanceCalls = 0;
      let receiverCountAtMaintenance = 0;
      const factory = new IDBFactory();
      Object.assign(globalThis, {
        indexedDB: factory,
        IDBKeyRange,
        chrome: {
          runtime: { id: 'extension', getURL: () => 'chrome-extension://extension/', onMessage: messages },
          tabs: { onActivated: tabs, onRemoved: removed, query: async () => [] },
          windows: { onFocusChanged: windows },
          alarms: {
            onAlarm: alarms,
            create: async () => {
              maintenanceCalls += 1;
              receiverCountAtMaintenance = messages.listeners.size;
              throw new Error('Maintenance API temporarily unavailable');
            },
            clear: async () => {
              maintenanceCalls += 1;
              receiverCountAtMaintenance = messages.listeners.size;
            },
          },
        },
      });
      const stop = startBackground(devData);
      expect(messages.listeners.size).toBe(1);
      expect(maintenanceCalls).toBe(0);
      expect(startBackground(devData)).toBe(stop);
      const listener = [...messages.listeners][0]!;
      const sender = { id: 'extension', url: 'chrome-extension://extension/popup.html' };
      const theme = await new Promise(resolve => {
        expect(listener({ type: 'theme:get' }, sender, resolve)).toBe(true);
      });
      expect(theme).toEqual({ ok: true, preference: 'system' });
      const query = await new Promise(resolve => {
        listener({ type: 'tracking:query', start: 0, end: 1000 }, sender, resolve);
      });
      expect(query).toEqual(devData
        ? { ok: false, code: 'invalid-request' }
        : { ok: true, visits: [], coverage: [], savingFailed: false });
      expect(receiverCountAtMaintenance).toBe(1);
      expect(maintenanceCalls).toBe(1);
      stop();
      stop();
      expect([messages, tabs, windows, removed, alarms].every(source => source.listeners.size === 0)).toBe(true);
      await closeLocalDatabase(factory);
    }
  } finally {
    Object.assign(globalThis, { chrome: originalChrome, indexedDB: originalDatabase, IDBKeyRange: originalKeys });
  }
});

test('worker service coalesces concurrent range reads and maintenance', async () => {
  const originalChrome = globalThis.chrome;
  const originalDatabase = globalThis.indexedDB;
  const originalKeys = globalThis.IDBKeyRange;
  const factory = new IDBFactory();
  let probes = 0;
  Object.assign(globalThis, {
    indexedDB: factory,
    IDBKeyRange,
    chrome: { tabs: { query: async () => { probes += 1; return []; } } },
  });
  try {
    await openLocalDatabase(factory);
    const service = new TrackingService();
    const first = service.read(0, 1000);
    expect(service.read(0, 1000)).toBe(first);
    const second = service.read(1000, 2000);
    expect(second === first).toBe(false);
    await Promise.all([first, second]);
    const maintenance = service.runMaintenance();
    expect(service.runMaintenance()).toBe(maintenance);
    await maintenance;
    expect(probes).toBe(1);
    service.stop();
    await service.runMaintenance();
    expect(probes).toBe(1);
  } finally {
    await closeLocalDatabase(factory);
    Object.assign(globalThis, { chrome: originalChrome, indexedDB: originalDatabase, IDBKeyRange: originalKeys });
  }
});
