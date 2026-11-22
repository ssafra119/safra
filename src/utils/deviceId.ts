const DEVICE_ID_LS_KEY = 'safra_device_id_v1';
const IDB_NAME = 'safra_device_db';
const IDB_STORE = 'device_meta';
const IDB_KEY = 'deviceId';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function openDeviceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('IndexedDB open timeout'));
      }
    }, 1500);

    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        window.clearTimeout(timer);
        if (!settled) {
          settled = true;
          resolve(req.result);
        } else {
          try {
            req.result.close();
          } catch {}
        }
      };
      req.onerror = () => {
        window.clearTimeout(timer);
        if (!settled) {
          settled = true;
          reject(req.error || new Error('Failed to open IndexedDB'));
        }
      };
      req.onblocked = () => {
        window.clearTimeout(timer);
        if (!settled) {
          settled = true;
          reject(new Error('IndexedDB blocked'));
        }
      };
    } catch (err) {
      window.clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(err);
      }
    }
  });
}

async function readFromIdb(): Promise<string | null> {
  try {
    const db = await openDeviceDb();
    return await new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        try {
          db.close();
        } catch {}
        resolve(null);
      }, 1500);
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const getReq = store.get(IDB_KEY);
        getReq.onsuccess = () => {
          window.clearTimeout(timer);
          const val = typeof getReq.result === 'string' ? getReq.result : null;
          db.close();
          resolve(val);
        };
        getReq.onerror = () => {
          window.clearTimeout(timer);
          db.close();
          resolve(null);
        };
      } catch {
        window.clearTimeout(timer);
        try {
          db.close();
        } catch {}
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

async function writeToIdb(deviceId: string): Promise<void> {
  try {
    const db = await openDeviceDb();
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        try {
          db.close();
        } catch {}
        resolve();
      }, 1500);
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(deviceId, IDB_KEY);
        tx.oncomplete = () => {
          window.clearTimeout(timer);
          db.close();
          resolve();
        };
        tx.onerror = () => {
          window.clearTimeout(timer);
          db.close();
          resolve();
        };
      } catch {
        window.clearTimeout(timer);
        try {
          db.close();
        } catch {}
        resolve();
      }
    });
  } catch {
    // Ignore IDB errors in restricted browser modes
  }
}

function readFromLocalStorage(): string | null {
  try {
    const val = window.localStorage.getItem(DEVICE_ID_LS_KEY);
    return val && val.trim().length > 0 ? val.trim() : null;
  } catch {
    return null;
  }
}

function writeToLocalStorage(deviceId: string): void {
  try {
    window.localStorage.setItem(DEVICE_ID_LS_KEY, deviceId);
  } catch {
    // Ignore localStorage quota/privacy errors
  }
}

/**
 * Retrieves or generates a persistent unique deviceId stored redundantly
 * in both localStorage and IndexedDB so mobile browsers do not lose it.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const lsId = readFromLocalStorage();
  const idbId = await readFromIdb();

  if (idbId && !lsId) {
    writeToLocalStorage(idbId);
    return idbId;
  }

  if (lsId && !idbId) {
    await writeToIdb(lsId);
    return lsId;
  }

  if (lsId && idbId) {
    return lsId;
  }

  const freshId = generateUuid();
  writeToLocalStorage(freshId);
  await writeToIdb(freshId);
  return freshId;
}
