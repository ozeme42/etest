/**
 * Offline Quiz Storage & Background Synchronization Service
 * Provides IndexedDB-backed resilience for quiz progress and offline exam submissions.
 */

const DB_NAME = 'eTestOfflineSync';
const DB_VERSION = 1;
const SUBMISSIONS_STORE = 'offline_submissions';
const DRAFTS_STORE = 'quiz_drafts';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(SUBMISSIONS_STORE)) {
        db.createObjectStore(SUBMISSIONS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        db.createObjectStore(DRAFTS_STORE, { keyPath: 'draftKey' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Checks whether the current device is online.
 */
export function isDeviceOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Saves a completed submission to the local offline queue when internet is unavailable.
 */
export async function saveOfflineSubmission(submission) {
  if (!submission) return false;
  try {
    const db = await openOfflineDB();
    const submissionId = submission.id || submission.submissionId || `offline_sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      ...submission,
      id: String(submissionId),
      isOfflineQueued: true,
      queuedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(SUBMISSIONS_STORE, 'readwrite');
      const store = tx.objectStore(SUBMISSIONS_STORE);
      const req = store.put(record);
      req.onsuccess = () => {
        console.log(`[OfflineSync] Submission ${record.id} saved to offline queue.`);
        resolve(record);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[OfflineSync] Failed to save offline submission:', err);
    // Fallback to localStorage queue if IndexedDB is blocked
    try {
      const raw = localStorage.getItem('eTestOfflineSubmissionsQueue') || '[]';
      const queue = JSON.parse(raw);
      queue.push({ ...submission, queuedAt: Date.now() });
      localStorage.setItem('eTestOfflineSubmissionsQueue', JSON.stringify(queue));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Retrieves all pending offline submissions awaiting synchronization.
 */
export async function getPendingOfflineSubmissions() {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SUBMISSIONS_STORE, 'readonly');
      const store = tx.objectStore(SUBMISSIONS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem('eTestOfflineSubmissionsQueue') || '[]';
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
}

/**
 * Removes a submission from the offline queue once successfully synced.
 */
export async function removeOfflineSubmission(id) {
  if (!id) return false;
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SUBMISSIONS_STORE, 'readwrite');
      const store = tx.objectStore(SUBMISSIONS_STORE);
      const req = store.delete(String(id));
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    try {
      const raw = localStorage.getItem('eTestOfflineSubmissionsQueue') || '[]';
      const queue = JSON.parse(raw).filter(s => String(s.id) !== String(id));
      localStorage.setItem('eTestOfflineSubmissionsQueue', JSON.stringify(queue));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Synchronizes all pending offline submissions with Supabase.
 */
export async function syncPendingOfflineSubmissions(saveFunction) {
  if (!isDeviceOnline() || typeof saveFunction !== 'function') return { syncedCount: 0, failedCount: 0 };
  const pending = await getPendingOfflineSubmissions();
  if (!pending || pending.length === 0) return { syncedCount: 0, failedCount: 0 };

  console.log(`[OfflineSync] Found ${pending.length} pending submissions. Starting background sync...`);
  let syncedCount = 0;
  let failedCount = 0;

  for (const sub of pending) {
    try {
      const cleanSub = { ...sub };
      delete cleanSub.isOfflineQueued;
      delete cleanSub.queuedAt;

      await saveFunction(cleanSub);
      await removeOfflineSubmission(sub.id);
      syncedCount++;
      console.log(`[OfflineSync] Successfully synced submission ${sub.id}`);
    } catch (err) {
      console.warn(`[OfflineSync] Failed to sync submission ${sub.id}:`, err);
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}

/**
 * Saves active quiz answers as draft in case of accidental reload or crash.
 */
export async function saveActiveQuizDraft(testId, studentId, answersData) {
  if (!testId || !studentId) return false;
  const draftKey = `${testId}_${studentId}`;
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DRAFTS_STORE, 'readwrite');
      const store = tx.objectStore(DRAFTS_STORE);
      const req = store.put({
        draftKey,
        testId: String(testId),
        studentId: String(studentId),
        data: answersData,
        updatedAt: Date.now()
      });
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Retrieves saved quiz draft if created within the last 48 hours.
 */
export async function getActiveQuizDraft(testId, studentId) {
  if (!testId || !studentId) return null;
  const draftKey = `${testId}_${studentId}`;
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DRAFTS_STORE, 'readonly');
      const store = tx.objectStore(DRAFTS_STORE);
      const req = store.get(draftKey);
      req.onsuccess = () => {
        const item = req.result;
        if (!item) return resolve(null);
        // Expiration check (48 hours)
        const ageMs = Date.now() - (item.updatedAt || 0);
        if (ageMs > 48 * 3600 * 1000) {
          resolve(null);
        } else {
          resolve(item.data);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Clears the quiz draft once the quiz is submitted or discarded.
 */
export async function clearActiveQuizDraft(testId, studentId) {
  if (!testId || !studentId) return false;
  const draftKey = `${testId}_${studentId}`;
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DRAFTS_STORE, 'readwrite');
      const store = tx.objectStore(DRAFTS_STORE);
      const req = store.delete(draftKey);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Sets up global listeners to automatically flush pending submissions when device reconnects.
 */
export function initOfflineSyncListeners(saveFunction) {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    console.log('[OfflineSync] Device came online. Triggering synchronization...');
    try {
      const { syncedCount } = await syncPendingOfflineSubmissions(saveFunction);
      if (syncedCount > 0) {
        window.dispatchEvent(new CustomEvent('offline_submissions_synced', { detail: { count: syncedCount } }));
      }
    } catch (e) {
      console.warn('[OfflineSync] Auto-sync error:', e);
    }
  };

  window.addEventListener('online', handleOnline);

  // Run an immediate sync check if currently online
  if (isDeviceOnline()) {
    setTimeout(handleOnline, 3000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

