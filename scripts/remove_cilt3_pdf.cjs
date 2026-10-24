const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://bstcisckpnmwmcggmtfi.supabase.co';
const key = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';
const supabase = createClient(url, key);

const BOOK_ID = 'tb_hiperzeka_5_turkce_cilt3';

async function removePdfLinks() {
  console.log('--- REMOVING PDF LINKS FROM MAX TÜRKÇE (CİLT-3) ---');

  // 1. Update book in tracked_books
  const { data: book, error: fetchErr } = await supabase.from('tracked_books').select('*').eq('id', BOOK_ID).single();
  if (fetchErr || !book) {
    console.error('Error fetching book:', fetchErr);
    return;
  }

  // Clean pdfUrl in subjects
  const updatedSubjects = (book.subjects || []).map(subj => {
    if (subj.__meta || subj.id === '__book_meta__') {
      return { ...subj, pdfUrl: '' };
    }
    const cleanTopics = (subj.topics || []).map(top => {
      const cleanTests = (top.tests || []).map(test => ({
        ...test,
        pdfUrl: '',
        pdf_url: ''
      }));
      return { ...top, tests: cleanTests };
    });
    return { ...subj, topics: cleanTopics };
  });

  const updatedRawData = {
    ...(book.raw_data || {}),
    pdfUrl: '',
    pdf_url: '',
    subjects: updatedSubjects
  };

  const { error: bUpdErr } = await supabase.from('tracked_books').update({
    pdf_url: '',
    subjects: updatedSubjects,
    raw_data: updatedRawData
  }).eq('id', BOOK_ID);

  if (bUpdErr) {
    console.error('Error updating tracked_books:', bUpdErr);
    return;
  }
  console.log('Successfully cleared pdf_url in tracked_books!');

  // 2. Update all tracked_book_tests for this book
  const { error: tUpdErr } = await supabase.from('tracked_book_tests').update({
    pdf_url: ''
  }).eq('book_id', BOOK_ID);

  if (tUpdErr) {
    console.error('Error updating tracked_book_tests:', tUpdErr);
    return;
  }
  console.log('Successfully cleared pdf_url in all tracked_book_tests!');

  // 3. Update backup.json
  const { data: allBooks } = await supabase.from('tracked_books').select('*');
  const { data: allTests } = await supabase.from('tracked_book_tests').select('*');
  const backup = JSON.parse(fs.readFileSync('./backup.json', 'utf8'));
  backup[0].backup_data.tracked_books = allBooks;
  backup[0].backup_data.tracked_book_tests = allTests;
  fs.writeFileSync('./backup.json', JSON.stringify(backup, null, 2), 'utf8');
  console.log('backup.json successfully synced with cleared PDF links!');

  // 4. Verify
  const { data: verifyBook } = await supabase.from('tracked_books').select('id, title, pdf_url').eq('id', BOOK_ID).single();
  const { data: verifyTests } = await supabase.from('tracked_book_tests').select('id, name, pdf_url').eq('book_id', BOOK_ID).limit(5);

  console.log('\nVERIFICATION:');
  console.log('Book pdf_url:', JSON.stringify(verifyBook.pdf_url));
  console.log('Sample test pdf_urls:', verifyTests.map(t => JSON.stringify(t.pdf_url)));
  console.log('DONE!');
}

removePdfLinks();
