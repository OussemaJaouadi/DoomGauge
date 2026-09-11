/** Add requested stores without replacing existing data or downgrading versions. */
export async function openLocalDatabase(
  stores: readonly string[],
  upgrade: (database: IDBDatabase) => void,
  factory: IDBFactory = indexedDB,
): Promise<IDBDatabase> {
  const open = (version?: number) => new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open('doomgauge-v1', version);
    let failed = false;
    request.onupgradeneeded = () => upgrade(request.result);
    request.onerror = () => { failed = true; reject(request.error); };
    request.onblocked = () => { failed = true; reject(new Error('Local database upgrade blocked')); };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      if (failed) database.close();
      else resolve(database);
    };
  });
  const database = await open();
  if (stores.every(store => database.objectStoreNames.contains(store))) return database;
  const version = database.version + 1;
  database.close();
  return open(version);
}
