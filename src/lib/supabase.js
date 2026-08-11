import { createClient } from '@supabase/supabase-js';
import { safeSetItem, cleanupLocalStorage } from '../utils/storageUtils';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseUrl = rawUrl && rawUrl.startsWith('http') ? rawUrl : 'https://demo-project.supabase.co';
const supabaseAnonKey = rawKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwOTQ1OTIwMCwiZXhwIjoyMDQ1MDM1MjAwfQ.demo';

export const isSupabaseConfigured = () => {
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
