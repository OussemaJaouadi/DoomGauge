// Types & Models
import type { OpenDatabase } from '../types/storage';

// Tokens & Meta
import { DATABASE_NAME, SCHEMA_VERSION, SCHEMA_VERSION_KEY } from '../config/storage';

// Utilities & Helpers
import { TrackingError } from '../runtime/errors';
import { migrateDatabase } from './migrations';

const connections = new WeakMap<IDBFactory, Promise<IDBDatabase>>();

function openVersion(factory: IDBFactory, version?: number, fromVersion = 0): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, version);
    let failed = false;
    request.onupgradeneeded = () => {
      const transaction = request.transaction!;
      void migrateDatabase(request.result, transaction, fromVersion).catch(cause => {
        failed = true;
        reject(cause);
        abortTransaction(transaction);
      });
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

async function readSchemaVersion(database: IDBDatabase): Promise<number> {
  if (!database.objectStoreNames.contains('trackingMeta')) {
    return 0;
  }
  const transaction = database.transaction('trackingMeta', 'readonly');
  const version = await requestResult(transaction.objectStore('trackingMeta').get(SCHEMA_VERSION_KEY));
  if (version === undefined) {
    return 0;
  }
  if (!Number.isInteger(version) || version < 0 || version > SCHEMA_VERSION) {
    throw new Error('Unsupported local database schema. Use a compatible extension version.');
  }
  return version;
}

/** Shared only within this background lifetime; rejected opens never poison later retries. */
export function openLocalDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  const existing = connections.get(factory);
  if (existing) {
    return existing;
  }
  const pending = Promise.resolve().then(async () => {
    let database = await openVersion(factory);
    try {
      const schemaVersion = await readSchemaVersion(database);
      if (schemaVersion < SCHEMA_VERSION) {
        const version = database.version + 1;
        database.close();
        database = await openVersion(factory, version, schemaVersion);
      }
    } catch (cause) {
      database.close();
      throw cause;
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

function abortTransaction(transaction: IDBTransaction): void {
  try {
    transaction.abort();
  } catch (cause) {
    const alreadyFinished = cause instanceof DOMException && cause.name === 'InvalidStateError';
    if (!alreadyFinished) {
      console.error('[DoomGauge] Abort transaction', cause);
    }
  }
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
      abortTransaction(transaction);
      throw cause;
    }
  } catch (cause) {
    throw new TrackingError('storage-failed', cause);
  }
}
