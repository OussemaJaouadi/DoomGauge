import { openLocalDatabase } from '../utils/database';
import { isThemePreference } from './palette';
import type { ThemePreference } from '../types/theme';

export function openThemeDatabase(factory: IDBFactory = indexedDB) {
  return openLocalDatabase(['preferences'], database => {
    if (!database.objectStoreNames.contains('preferences')) database.createObjectStore('preferences');
  }, factory);
}

export async function readTheme(open = openThemeDatabase): Promise<ThemePreference> {
  const db = await open();
  try {
    return await new Promise<ThemePreference>((resolve, reject) => {
      const tx = db.transaction('preferences', 'readonly');
      const request = tx.objectStore('preferences').get('theme');
      tx.oncomplete = () => resolve(isThemePreference(request.result) ? request.result : 'system');
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Cannot read theme'));
    });
  } finally { db.close(); }
}
export async function writeTheme(value: ThemePreference, open = openThemeDatabase): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('preferences', 'readwrite');
      tx.objectStore('preferences').put(value, 'theme');
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Cannot save theme'));
    });
  } finally { db.close(); }
}
