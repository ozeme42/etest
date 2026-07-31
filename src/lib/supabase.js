import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseUrl = rawUrl && rawUrl.startsWith('http') ? rawUrl : 'https://demo-project.supabase.co';
const supabaseAnonKey = rawKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwOTQ1OTIwMCwiZXhwIjoyMDQ1MDM1MjAwfQ.demo';

export const isSupabaseConfigured = () => {
  return Boolean(rawUrl && rawKey && rawUrl !== 'https://demo-project.supabase.co');
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
