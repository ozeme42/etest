const { createClient } = require('@supabase/supabase-js');
const url = 'https://bstcisckpnmwmcggmtfi.supabase.co';
const key = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';
const supabase = createClient(url, key);

async function check() {
  const { data } = await supabase
    .from('tracked_book_tests')
    .select('id, name, question_count, is_open_ended, question_type, option_count')
    .eq('book_id', 'tb_hiperzeka_5_fen_max')
    .eq('is_open_ended', true)
    .order('id');
  
  console.log('Open-ended tests in Supabase count:', data.length);
  data.forEach((t, i) => {
    console.log(`${i+1}. ${t.name} -> ${t.question_count} Soru (${t.question_type}, options: ${t.option_count})`);
  });
}
check();
