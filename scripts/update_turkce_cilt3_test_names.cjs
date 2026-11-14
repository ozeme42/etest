const { createClient } = require('@supabase/supabase-js');
const { testNameMap } = require('./build_exact_names_map.cjs');

const url = 'https://bstcisckpnmwmcggmtfi.supabase.co';
const key = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';
const supabase = createClient(url, key);

const BOOK_ID = 'tb_hiperzeka_5_turkce_cilt3';

async function main() {
  console.log(`Starting update of test names for book: ${BOOK_ID}...`);
  console.log(`Total tests to rename: ${Object.keys(testNameMap).length}`);

  // 1. Update tracked_book_tests table row by row
  let updatedInTestsTable = 0;
  for (const [testId, newName] of Object.entries(testNameMap)) {
    const { error } = await supabase
      .from('tracked_book_tests')
      .update({ name: newName })
      .eq('id', testId)
      .eq('book_id', BOOK_ID);

    if (error) {
      console.error(`Error updating test ${testId}:`, error);
    } else {
      updatedInTestsTable++;
    }
  }
  console.log(`Successfully updated ${updatedInTestsTable} rows in 'tracked_book_tests'.`);

  // 2. Update tracked_books table (subjects JSONB)
  const { data: book, error: bErr } = await supabase
    .from('tracked_books')
    .select('id, subjects')
    .eq('id', BOOK_ID)
    .single();

  if (bErr || !book) {
    console.error('Error fetching book from tracked_books:', bErr);
    return;
  }

  let updatedInSubjectsCount = 0;
  const subjects = book.subjects || [];

  subjects.forEach(subject => {
    (subject.topics || []).forEach(topic => {
      (topic.tests || []).forEach(test => {
        if (testNameMap[test.id]) {
          test.name = testNameMap[test.id];
          updatedInSubjectsCount++;
        }
      });
    });
  });

  const { error: uErr } = await supabase
    .from('tracked_books')
    .update({ subjects })
    .eq('id', BOOK_ID);

  if (uErr) {
    console.error('Error updating tracked_books subjects JSON:', uErr);
  } else {
    console.log(`Successfully updated ${updatedInSubjectsCount} tests inside 'tracked_books.subjects'!`);
  }

  // 3. Verification
  console.log('\n--- VERIFYING UPDATE ---');
  const { data: verifyTests } = await supabase
    .from('tracked_book_tests')
    .select('id, name')
    .eq('book_id', BOOK_ID)
    .order('id');

  const genericCount = verifyTests.filter(t => /Test\s+\d+$/.test(t.name)).length;
  console.log(`Remaining tests with generic 'Test XX' name: ${genericCount} / ${verifyTests.length}`);
  
  console.log('\nSample verified test names:');
  verifyTests.slice(0, 10).forEach(t => console.log(`  [${t.id}] ${t.name}`));
}

main();
