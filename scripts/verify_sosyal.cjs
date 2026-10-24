const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://bstcisckpnmwmcggmtfi.supabase.co';
const key = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';
const supabase = createClient(url, key);

const BOOK_ID = 'tb_hiperzeka_5_sosyal';

async function verify() {
  const { data: book, error: bErr } = await supabase
    .from('tracked_books')
    .select('*')
    .eq('id', BOOK_ID)
    .single();

  if (bErr) throw bErr;
  console.log(`[OK] Book found: ${book.title} (ID: ${book.id})`);
  console.log(`[OK] Publisher: ${book.publisher}, pdf_url: "${book.pdf_url}"`);

  const { data: tests, error: tErr } = await supabase
    .from('tracked_book_tests')
    .select('*')
    .eq('book_id', BOOK_ID);

  if (tErr) throw tErr;
  console.log(`[OK] Total tests in DB: ${tests.length}`);

  const mcTests = tests.filter(t => !t.answer_key || !t.answer_key.__meta || !t.answer_key.__meta.isOpenEnded);
  const openTests = tests.filter(t => t.answer_key && t.answer_key.__meta && t.answer_key.__meta.isOpenEnded);

  console.log(`[OK] Çoktan Seçmeli (MC) testler: ${mcTests.length}`);
  console.log(`[OK] Açık Uçlu (Open-Ended) testler: ${openTests.length}`);

  // Check per topic
  const topics = book.subjects.find(s => s.id === 'sub_sosyal_5').topics;
  topics.forEach(top => {
    const topTests = tests.filter(t => t.topic_id === top.id);
    const topMC = topTests.filter(t => !t.answer_key || !t.answer_key.__meta || !t.answer_key.__meta.isOpenEnded);
    const topOpen = topTests.filter(t => t.answer_key && t.answer_key.__meta && t.answer_key.__meta.isOpenEnded);
    console.log(`  - ${top.name}: Toplam ${topTests.length} test (MC: ${topMC.length}, Açık Uçlu: ${topOpen.length})`);
  });

  // Verify all pdf_url are empty string
  const nonBlank = tests.filter(t => t.pdf_url && t.pdf_url.trim().length > 0);
  console.log(`[OK] pdf_url dolu olan test sayısı: ${nonBlank.length} (0 olmalı)`);
}

verify().catch(console.error);
