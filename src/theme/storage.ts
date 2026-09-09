import { isThemePreference, type ThemePreference } from './palette';

/** Add the preferences store without replacing any existing activity stores. */
export async function openThemeDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  const open = (version?: number) => new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const request = factory.open('doomgauge-v1', version);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('preferences')) request.result.createObjectStore('preferences'); };
    request.onblocked = () => { settled = true; reject(new Error('Preferences upgrade blocked')); };
    request.onerror = () => { settled = true; reject(request.error ?? new Error('Preferences unavailable')); };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      if (settled) db.close(); else { settled = true; resolve(db); }
    };
  });
  const db = await open();
  if (db.objectStoreNames.contains('preferences')) return db;
  const version = db.version + 1;
  db.close();
  return open(version);
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
