import { createClient } from '@supabase/supabase-js';
import { safeSetItem, cleanupLocalStorage } from '../utils/storageUtils';

export const CURRENT_SUPABASE_URL = 'https://bstcisckpnmwmcggmtfi.supabase.co';
export const CURRENT_SUPABASE_KEY = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Clean up any stale tokens from the old blocked projects
try {
  Object.keys(localStorage).forEach(k => {
    if (k.includes('oocwiitwxrungkbevhry') || k.includes('nvizichancilyhgmivlj')) {
      localStorage.removeItem(k);
    }
  });
} catch {}

const isOldProject = Boolean(
  (rawUrl && (rawUrl.includes('oocwiitwxrungkbevhry') || rawUrl.includes('nvizichancilyhgmivlj'))) ||
  (rawKey && (rawKey.includes('oocwiitwxrungkbevhry') || rawKey.includes('nvizichancilyhgmivlj') || rawKey.includes('HdO8o8rM2U6FkbR03NfAnL_bE3YRSzG8AXGefydqU-s')))
);

export const supabaseUrl = (!isOldProject && rawUrl && rawUrl.startsWith('http')) ? rawUrl : CURRENT_SUPABASE_URL;
export const supabaseAnonKey = (!isOldProject && rawKey && rawKey.length > 20) ? rawKey : CURRENT_SUPABASE_KEY;

let quotaExceededDetected = false;

export const setSupabaseQuotaExceeded = () => {
  quotaExceededDetected = true;
  try {
    sessionStorage.setItem('eTestSupabaseQuotaExceeded', 'true');
  } catch {}
};

export const resetSupabaseQuotaStatus = () => {
  quotaExceededDetected = false;
  try {
    sessionStorage.removeItem('eTestSupabaseQuotaExceeded');
  } catch {}
};

export const isSupabaseConfigured = () => {
  if (quotaExceededDetected) return false;
  try {
    if (sessionStorage.getItem('eTestSupabaseQuotaExceeded') === 'true') {
      quotaExceededDetected = true;
      return false;
    }
  } catch {}
  return Boolean(rawUrl && rawKey && rawUrl !== 'https://demo-project.supabase.co');
};

// Custom memory fallback storage if LocalStorage quota is completely full or disabled
const memoryStore = new Map();

const safeStorage = {
  getItem: (key) => {
    try {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    } catch {}
    return memoryStore.get(key) || null;
  },
  setItem: (key, value) => {
    const success = safeSetItem(key, value);
    if (!success) {
      memoryStore.set(key, value);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
    memoryStore.delete(key);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
