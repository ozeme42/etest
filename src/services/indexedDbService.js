// IndexedDB Service for storing large PDF and Image DataURL payloads without LocalStorage 5MB quota limits
const DB_NAME = 'eTestLargeStorage';
const STORE_NAME = 'question_payloads';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function idbSetPayload(id, payload) {
  if (!id || !payload) return false;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(payload, String(id));
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] idbSetPayload error:', err);
    return false;
  }
}

export async function idbGetPayload(id) {
  if (!id) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(id));
      req.onsuccess = (e) => resolve(e.target.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] idbGetPayload error:', err);
    return null;
  }
}

export async function idbDeletePayload(id) {
  if (!id) return false;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(String(id));
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] idbDeletePayload error:', err);
    return false;
  }
}

export async function idbGetAllEntries() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      const keysReq = store.getAllKeys();

      let items = [];
      let keys = [];

      req.onsuccess = () => {
        items = req.result || [];
        if (keys.length > 0) {
          resolve(keys.map((k, idx) => ({ id: k, payload: items[idx] })));
        }
      };
      keysReq.onsuccess = () => {
        keys = keysReq.result || [];
        if (items.length > 0) {
          resolve(keys.map((k, idx) => ({ id: k, payload: items[idx] })));
        }
      };
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] idbGetAllEntries error:', err);
    return [];
  }
}

export async function idbGetAllKeys() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] idbGetAllKeys error:', err);
    return [];
  }
}

export async function idbGetFirstAvailablePayload(candidateIds = []) {
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) return null;
  const idsToTry = [];
  candidateIds.filter(Boolean).forEach(id => {
    const strId = typeof id === 'object' ? (id.id || id.questionId) : String(id);
    if (strId) {
      const clean = strId.replace(/^q_|^hw_|^test_|^sec_|^img_|^image_/, '');
      idsToTry.push(strId);
      idsToTry.push(clean);
      idsToTry.push(`q_${clean}`);
      idsToTry.push(`q${clean}`);
      idsToTry.push(`hw_${clean}`);
      idsToTry.push(`test_${clean}`);
      idsToTry.push(`img_${clean}`);
    }
  });

  const unique = [...new Set(idsToTry.filter(Boolean))];
  for (const key of unique) {
    try {
      const val = await idbGetPayload(key);
      if (val && typeof val === 'string' && val.length > 20 && !val.includes('[STORED_IN_INDEXEDDB]') && !val.includes('[LOCALSTORAGE_CACHE]')) {
        return val;
      }
    } catch {}
  }
  return null;
}

