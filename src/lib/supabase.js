import { createClient } from '@supabase/supabase-js';
import { safeSetItem, cleanupLocalStorage } from '../utils/storageUtils';

const NEW_SUPABASE_URL = 'https://nvizichancilyhgmivlj.supabase.co';
const NEW_SUPABASE_KEY = 'sb_publishable_nelqUJSnXNfmiTXchT3igQ_KCjlK2LG';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// If old blocked project is used in environment variables, automatically redirect to new project
const supabaseUrl = (rawUrl && !rawUrl.includes('oocwiitwxrungkbevhry')) ? rawUrl : NEW_SUPABASE_URL;
const supabaseAnonKey = (rawKey && !rawUrl.includes('oocwiitwxrungkbevhry')) ? rawKey : NEW_SUPABASE_KEY;

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
