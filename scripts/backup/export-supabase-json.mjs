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

const TABLES = [
  'users',
  'grades',
  'subjects',
  'units',
  'topics',
  'summaries',
  'goals',
  'schedules',
  'submissions',
  'homeworks',
  'questions',
  'coaching_profiles',
  'study_plans',
  'study_assignments',
  'tracked_books',
  'tracked_book_tests',
  'scales'
];

async function exportAllData() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📦 eTest SUPABASE CANLI VERİTABANI YEDEKLEME BAŞLADI');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);

  const backupPayload = {
    version: '3.5',
    platform: 'e-Test Professional',
    exportedAt: new Date().toISOString(),
    sourceUrl: supabaseUrl,
    tables: {}
  };

  const backupDir = path.join(rootDir, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  let totalRows = 0;

  for (const table of TABLES) {
    process.stdout.write(`⏳ '${table}' tablosu indiriliyor... `);
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.log(`⚠️ (Atlandı / Tablo yok: ${error.message})`);
        backupPayload.tables[table] = [];
      } else {
        const count = data ? data.length : 0;
        totalRows += count;
        backupPayload.tables[table] = data || [];
        console.log(`✅ ${count} kayıt`);
      }
    } catch (err) {
      console.log(`❌ Hata: ${err.message}`);
      backupPayload.tables[table] = [];
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
  const fileName = `etest_tam_yedek_${dateStr}_${timeStr}.json`;
  const filePath = path.join(backupDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf-8');

  // Also write latest copy
  const latestPath = path.join(backupDir, 'etest_latest_backup.json');
  fs.writeFileSync(latestPath, JSON.stringify(backupPayload, null, 2), 'utf-8');

  const fileSizeMb = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);

  console.log('═══════════════════════════════════════════════════════');
  console.log(`🎉 YEDEKLEME BAŞARIYLA TAMAMLANDI!`);
  console.log(`📁 Kayıt Konumu: ${filePath}`);
  console.log(`📊 Toplam İndirilen Satır: ${totalRows}`);
  console.log(`💾 Dosya Boyutu: ${fileSizeMb} MB`);
  console.log('═══════════════════════════════════════════════════════');
}

exportAllData().catch(err => {
  console.error('Kritik Yedekleme Hatası:', err);
  process.exit(1);
});
