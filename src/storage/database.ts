// Types & Models
import type { OpenDatabase } from '../types/storage';

// Utilities & Helpers
import { TrackingError } from '../runtime/errors';

const connections = new WeakMap<IDBFactory, Promise<IDBDatabase>>();
const storeNames = ['preferences', 'visits', 'trackingCoverage', 'trackingMeta', 'rollups'];

function upgradeDatabase(database: IDBDatabase, transaction: IDBTransaction): void {
  for (const name of storeNames) {
    if (database.objectStoreNames.contains(name)) {
      continue;
    }
    if (name === 'visits' || name === 'trackingCoverage') {
      database.createObjectStore(name, { keyPath: 'id' });
    } else if (name === 'rollups') {
      database.createObjectStore(name, { keyPath: ['date', 'platform'] });
    } else {
      database.createObjectStore(name);
    }
  }
  const visits = transaction.objectStore('visits');
  if (!visits.indexNames.contains('by_end')) {
    visits.createIndex('by_end', 'observedAt');
  }
  if (!visits.indexNames.contains('by_status')) {
    visits.createIndex('by_status', 'status');
  }
  const coverage = transaction.objectStore('trackingCoverage');
  if (!coverage.indexNames.contains('by_end')) {
    coverage.createIndex('by_end', 'endTs');
  }
}

function hasCurrentSchema(database: IDBDatabase): boolean {
  if (!storeNames.every(name => database.objectStoreNames.contains(name))) {
    return false;
  }
  const transaction = database.transaction(['visits', 'trackingCoverage'], 'readonly');
  const visits = transaction.objectStore('visits');
  const coverage = transaction.objectStore('trackingCoverage');
  return visits.indexNames.contains('by_end')
    && visits.indexNames.contains('by_status')
    && coverage.indexNames.contains('by_end');
}

function openVersion(factory: IDBFactory, version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open('doomgauge-v1', version);
    let failed = false;
    request.onupgradeneeded = () => {
      upgradeDatabase(request.result, request.transaction!);
    };
    request.onerror = () => {
      failed = true;
      reject(request.error);
    };
    request.onblocked = () => {
      failed = true;
      reject(new Error('Local database upgrade blocked. Close other extension pages, then retry.'));
    };
    request.onsuccess = () => {
      if (failed) {
        request.result.close();
      } else {
        resolve(request.result);
      }
    };
  });
}

/** Shared only within this background lifetime; rejected opens never poison later retries. */
export function openLocalDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  const existing = connections.get(factory);
  if (existing) {
    return existing;
  }
  const pending = Promise.resolve().then(async () => {
    let database = await openVersion(factory);
    if (!hasCurrentSchema(database)) {
      const version = database.version + 1;
      database.close();
      database = await openVersion(factory, version);
    }
    const invalidate = () => {
      if (connections.get(factory) === pending) {
        connections.delete(factory);
      }
    };
    database.onversionchange = () => {
      database.close();
      invalidate();
    };
    database.onclose = invalidate;
    return database;
  }).catch(cause => {
    if (connections.get(factory) === pending) {
      connections.delete(factory);
    }
    throw cause;
  });
  connections.set(factory, pending);
  return pending;
}

export async function closeLocalDatabase(factory: IDBFactory = indexedDB): Promise<void> {
  const pending = connections.get(factory);
  connections.delete(factory);
  if (pending) {
    const database = await pending;
    database.close();
  }
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Acknowledgment means transaction commit, not just request success. */
export async function runTransaction<T>(
  names: string[],
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction) => Promise<T>,
  open: OpenDatabase = openLocalDatabase,
): Promise<T> {
  try {
    const database = await open();
    const options = mode === 'readwrite' ? { durability: 'strict' as const } : undefined;
    const transaction = database.transaction(names, mode, options);
    const completion = new Promise<Error | DOMException | null>(resolve => {
      transaction.oncomplete = () => resolve(null);
      transaction.onabort = transaction.onerror = () => {
        resolve(transaction.error ?? new Error('Local transaction failed'));
      };
    });
    try {
      const result = await run(transaction);
      const error = await completion;
      if (error) {
        throw error;
      }
      return result;
    } catch (cause) {
      try {
        transaction.abort();
      } catch (abortError) {
        const alreadyFinished = abortError instanceof DOMException && abortError.name === 'InvalidStateError';
        if (!alreadyFinished) {
          console.error('[DoomGauge] Abort transaction', abortError);
        }
      }
      throw cause;
    }
  } catch (cause) {
    throw new TrackingError('storage-failed', cause);
  }
}
