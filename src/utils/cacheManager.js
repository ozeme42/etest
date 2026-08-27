/**
 * Cache Manager Utility
 * Prevents redundant Supabase API network egress by enforcing smart localStorage TTL.
 */

export function isCacheValid(key, ttlMinutes = 30) {
  try {
    const lastSync = localStorage.getItem(`eTest_last_sync_${key}`);
    if (!lastSync) return false;
    const elapsed = Date.now() - Number(lastSync);
    return elapsed < ttlMinutes * 60 * 1000;
  } catch {
    return false;
  }
}

export function touchCache(key) {
  try {
    localStorage.setItem(`eTest_last_sync_${key}`, String(Date.now()));
  } catch {}
}

export function invalidateCache(key) {
  try {
    localStorage.removeItem(`eTest_last_sync_${key}`);
  } catch {}
}

export function invalidateAllCaches() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('eTest_last_sync_'));
    keys.forEach(k => localStorage.removeItem(k));
  } catch {}
}
