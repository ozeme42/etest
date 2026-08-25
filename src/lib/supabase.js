import { createClient } from '@supabase/supabase-js';
import { safeSetItem, cleanupLocalStorage } from '../utils/storageUtils';

export const CURRENT_SUPABASE_URL = 'https://bstcisckpnmwmcggmtfi.supabase.co';
export const CURRENT_SUPABASE_KEY = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseUrl = rawUrl && rawUrl.startsWith('http') ? rawUrl : CURRENT_SUPABASE_URL;
const supabaseAnonKey = rawKey && rawKey.length > 20 ? rawKey : CURRENT_SUPABASE_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
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
