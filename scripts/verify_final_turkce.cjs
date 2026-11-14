const { createClient } = require('@supabase/supabase-js');
const url = 'https://bstcisckpnmwmcggmtfi.supabase.co';
const key = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';
const supabase = createClient(url, key);

const BOOK_ID = 'tb_hiperzeka_5_turkce_cilt3';

async function check() {
  const { data: book } = await supabase
    .from('tracked_books')
    .select('id, title, subjects')
    .eq('id', BOOK_ID)
    .single();

  const topics = book.subjects?.[0]?.topics || [];
  console.log(`Book: ${book.title} has ${topics.length} topics:`);
  topics.forEach((top, idx) => {
    console.log(`\nTopic ${idx + 1}: ${top.name} (${top.tests?.length} tests)`);
    top.tests.slice(0, 3).forEach(t => console.log(`   * ${t.name}`));
    if (top.tests.length > 3) {
      console.log(`   ...`);
      top.tests.slice(-2).forEach(t => console.log(`   * ${t.name}`));
    }
  });
}

check();
