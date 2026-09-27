// Types & Models
import type { Coverage, StoredVisit } from '../types/tracking';

// Tokens & Meta
import { SCHEMA_VERSION, SCHEMA_VERSION_KEY } from '../config/storage';

// Utilities & Helpers
import { rangeDays } from '../utils/storageRange';

function createOriginalStores(database: IDBDatabase, transaction: IDBTransaction): void {
  for (const name of ['preferences', 'visits', 'trackingCoverage', 'trackingMeta', 'rollups']) {
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

function indexExistingRecords(store: IDBObjectStore): Promise<void> {
  if (!store.indexNames.contains('by_day')) {
    store.createIndex('by_day', 'rangeDays', { multiEntry: true });
  }
  return new Promise((resolve, reject) => {
    const request = store.openCursor();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      try {
        const record = cursor.value as StoredVisit | Coverage;
        const start = 'startedAt' in record ? record.startedAt : record.startTs;
        const end = 'observedAt' in record ? record.observedAt : record.endTs;
        cursor.update({ ...record, rangeDays: rangeDays(start, end) });
        cursor.continue();
      } catch (cause) {
        reject(cause);
      }
    };
  });
}

/** All schema and record changes belong to the same native upgrade transaction. */
export async function migrateDatabase(database: IDBDatabase, transaction: IDBTransaction, fromVersion: number): Promise<void> {
  if (fromVersion < 1) {
    createOriginalStores(database, transaction);
  }
  if (fromVersion < 2) {
    await Promise.all([
      indexExistingRecords(transaction.objectStore('visits')),
      indexExistingRecords(transaction.objectStore('trackingCoverage')),
    ]);
  }
  transaction.objectStore('trackingMeta').put(SCHEMA_VERSION, SCHEMA_VERSION_KEY);
}
