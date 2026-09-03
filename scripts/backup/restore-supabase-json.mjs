import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Read .env directly
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (k === 'VITE_SUPABASE_URL' && !supabaseUrl) supabaseUrl = v;
        if (k === 'VITE_SUPABASE_ANON_KEY' && !supabaseAnonKey) supabaseAnonKey = v;
      }
    }
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ HATA: .env dosyasında VITE_SUPABASE_URL veya VITE_SUPABASE_ANON_KEY bulunamadı!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function restoreData() {
  const backupDir = path.join(rootDir, 'backups');
  let targetFile = process.argv[2];

  if (!targetFile) {
    targetFile = path.join(backupDir, 'etest_latest_backup.json');
  } else if (!path.isAbsolute(targetFile)) {
    targetFile = path.join(rootDir, targetFile);
  }

  if (!fs.existsSync(targetFile)) {
    console.error(`❌ HATA: Yedek dosyası bulunamadı: ${targetFile}`);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('🔄 eTest SUPABASE GERİ YÜKLEME (RESTORE) BAŞLADI');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`🌐 Hedef Supabase URL: ${supabaseUrl}`);
  console.log(`📁 Kaynak Dosya: ${targetFile}`);

  const rawJson = fs.readFileSync(targetFile, 'utf-8');
  const backup = JSON.parse(rawJson);
  const tables = backup.tables || {};

  // Recommended restore order respecting foreign keys
  const RESTORE_ORDER = [
    'users',
    'grades',
    'subjects',
    'units',
    'topics',
    'summaries',
    'goals',
    'schedules',
    'tracked_books',
    'tracked_book_tests',
    'study_plans',
    'study_assignments',
    'homeworks',
    'questions',
    'submissions',
    'coaching_profiles',
    'scales'
  ];

  let totalRestored = 0;

  for (const table of RESTORE_ORDER) {
    const rows = tables[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    process.stdout.write(`⏳ '${table}' (${rows.length} kayıt) aktarılıyor... `);
    try {
      // Chunk into batches of 50 for safety
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
        if (error) {
          throw error;
        }
      }
      totalRestored += rows.length;
      console.log(`✅ Tamamlandı`);
    } catch (err) {
      console.log(`⚠️ Hata: ${err.message}`);
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(`🎉 TÜM VERİLER BAŞARIYLA GERİ YÜKLENDİ!`);
  console.log(`📊 Toplam Aktarılan Satır: ${totalRestored}`);
  console.log('═══════════════════════════════════════════════════════');
}

restoreData().catch(err => {
  console.error('Kritik Geri Yükleme Hatası:', err);
  process.exit(1);
});
