/**
 * Safe wrapper for localStorage.setItem that catches QuotaExceededError.
 * If storage is full, it automatically cleans up old temporary draft keys and lightweight caches.
 */
export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    try {
      cleanupLocalStorage();
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      // Storage full, fallback safely without error spam
      return false;
    }
  }
}

/**
 * Cleans up old temporary draft keys (draft_quiz_*, quiz_state_*, etc.)
 * to free up space for critical auth and user data.
 */
export function cleanupLocalStorage() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('draft_quiz_') || k.startsWith('quiz_state_') || k.startsWith('temp_') || k.startsWith('cache_') || k.startsWith('dailyQuestDone_'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[LocalStorage] Cleanup error:', e);
  }
}
