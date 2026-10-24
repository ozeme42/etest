const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { BOOK_ID, SUBJECT_ID, topics, mcTests, openEndedTests } = require('./build_sosyal_complete.cjs');

const url = 'https://bstcisckpnmwmcggmtfi.supabase.co';
const key = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';
const supabase = createClient(url, key);

async function main() {
  console.log('--- Step 1: Checking tracked_books for', BOOK_ID);

  const bookPayload = {
    id: BOOK_ID,
    title: '5. Sınıf Hiper Sosyal Bilgiler Soru Bankası',
    publisher: 'Hiper Zeka / Uzman Kariyer',
    book_type: 'standard',
    option_count: 4,
    pdf_url: '', // Pure physical question bank mode
    raw_data: {
      title: '5. Sınıf Hiper Sosyal Bilgiler Soru Bankası',
      publisher: 'Hiper Zeka / Uzman Kariyer',
      bookType: 'standard',
      optionCount: 4,
      pdfUrl: '',
      pdf_url: '',
      hideAnswerKey: true
    },
    subjects: [
      {
        id: '__book_meta__',
        title: '5. Sınıf Hiper Sosyal Bilgiler Soru Bankası',
        __meta: true,
        pdfUrl: '',
        bookType: 'standard',
        publisher: 'Hiper Zeka / Uzman Kariyer',
        optionCount: 4,
        hideAnswerKey: true
      },
      {
        id: SUBJECT_ID,
        name: 'Sosyal Bilgiler',
        topics: topics.map(t => ({
          id: t.id,
          name: t.name,
          order: t.order
        }))
      }
    ]
  };

  console.log('--- Step 2: Upserting tracked_books entry...');
  const { error: upsertErr } = await supabase
    .from('tracked_books')
    .upsert(bookPayload, { onConflict: 'id' });

  if (upsertErr) {
    console.error('Error upserting book:', upsertErr);
    return;
  }
  console.log('Successfully upserted book:', BOOK_ID);

  console.log('--- Step 3: Removing any old tests for', BOOK_ID);
  const { error: delErr } = await supabase
    .from('tracked_book_tests')
    .delete()
    .eq('book_id', BOOK_ID);

  if (delErr) {
    console.warn('Warning deleting old tests:', delErr);
  } else {
    console.log('Old tests deleted (if any).');
  }

  console.log('--- Step 4: Preparing tests for insertion...');
  const allTestsToInsert = [];

  // 1. MC Tests
  mcTests.forEach((t, i) => {
    const qCount = Object.keys(t.answerKey).length;
    allTestsToInsert.push({
      id: `tbt_sosyal_mc_${i + 1}_${Math.random().toString(36).substr(2, 4)}`,
      book_id: BOOK_ID,
      subject_id: SUBJECT_ID,
      topic_id: t.topicId,
      name: t.name,
      question_count: qCount,
      answer_key: t.answerKey,
      option_count: 4,
      pdf_url: '',
      is_open_ended: false,
      question_type: 'coktan_secmeli'
    });
  });

  // 2. Open-Ended Tests
  openEndedTests.forEach((t, i) => {
    allTestsToInsert.push({
      id: `tbt_sosyal_open_${i + 1}_${Math.random().toString(36).substr(2, 4)}`,
      book_id: BOOK_ID,
      subject_id: SUBJECT_ID,
      topic_id: t.topicId,
      name: t.name,
      question_count: t.qCount,
      answer_key: t.answers,
      option_count: 0,
      pdf_url: '',
      is_open_ended: false,
      question_type: 'coktan_secmeli'
    });
  });

  console.log(`Total tests to insert: ${allTestsToInsert.length}`);

  // Batch insert (chunks of 20)
  for (let c = 0; c < allTestsToInsert.length; c += 20) {
    const chunk = allTestsToInsert.slice(c, c + 20);
    const { error: insErr } = await supabase
      .from('tracked_book_tests')
      .insert(chunk);

    if (insErr) {
      console.error(`Error inserting chunk ${c}:`, insErr);
      return;
    }
    console.log(`Inserted chunk ${c + 1} to ${Math.min(c + 20, allTestsToInsert.length)}`);
  }

  console.log('--- Step 5: Verifying insertion from Supabase...');
  const { data: inserted, error: countErr } = await supabase
    .from('tracked_book_tests')
    .select('id, name, question_count, option_count, pdf_url')
    .eq('book_id', BOOK_ID);

  if (countErr) {
    console.error('Error verifying count:', countErr);
  } else {
    console.log(`Verified: ${inserted.length} tests exist in Supabase for ${BOOK_ID}`);
    const nonBlankPdf = inserted.filter(x => x.pdf_url && x.pdf_url.length > 0);
    console.log(`Tests with non-empty pdf_url: ${nonBlankPdf.length}`);
  }

  console.log('--- Step 6: Syncing backup.json...');
  try {
    const backupRaw = fs.readFileSync('backup.json', 'utf8');
    const backup = JSON.parse(backupRaw);
    const data = backup[0].backup_data;

    // Remove old book and tests from backup_data if present
    data.tracked_books = (data.tracked_books || []).filter(b => b.id !== BOOK_ID);
    data.tracked_books.push(bookPayload);

    data.tracked_book_tests = (data.tracked_book_tests || []).filter(t => t.book_id !== BOOK_ID);
    data.tracked_book_tests.push(...allTestsToInsert);

    fs.writeFileSync('backup.json', JSON.stringify(backup, null, 2), 'utf8');
    console.log('Successfully updated backup.json!');
  } catch (err) {
    console.error('Error updating backup.json:', err);
  }

  console.log('--- DONE! ---');
}

main();
