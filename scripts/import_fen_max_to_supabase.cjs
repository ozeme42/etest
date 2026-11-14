const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { BOOK_ID, SUBJECT_ID, topics, mcTests, openEndedTests } = require('./build_fen_max_complete.cjs');

const url = 'https://bstcisckpnmwmcggmtfi.supabase.co';
const key = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';
const supabase = createClient(url, key);

async function main() {
  console.log('=== Step 1: Preparing all 89 tests for 5. Sınıf MAX Fen Bilimleri ===');

  const allTestsToInsert = [];
  const topicTestsMap = {};
  topics.forEach(t => {
    topicTestsMap[t.id] = [];
  });

  let globalOrder = 1;

  // For each topic (1 to 7):
  // 1. Şimdi Uygula
  // 2. MC Tests (Kavramları Kavra, Öğrendiğini Kanıtla, Becerini Sergile, Becerini Değerlendir)
  // 3. Birbirine Bağla
  // 4. Yaşama Uyarla
  topics.forEach((t, topIdx) => {
    const fasNo = topIdx + 1;

    // 1. Şimdi Uygula
    const simdiUygula = openEndedTests.find(oe => oe.topicId === t.id && oe.name.includes('Şimdi Uygula'));
    if (simdiUygula) {
      const testId = `tbt_max_fen_f${fasNo}_simdi_uygula`;
      const qCount = simdiUygula.qCount;
      const testItem = {
        id: testId,
        book_id: BOOK_ID,
        bookId: BOOK_ID,
        subject_id: SUBJECT_ID,
        subjectId: SUBJECT_ID,
        topic_id: t.id,
        topicId: t.id,
        name: simdiUygula.name,
        question_count: qCount,
        questionCount: qCount,
        answer_key: simdiUygula.answers,
        answerKey: simdiUygula.answers,
        option_count: 0,
        optionCount: 0,
        pdf_url: '',
        pdfUrl: '',
        is_open_ended: true,
        isOpenEnded: true,
        question_type: 'acik_uclu',
        questionType: 'acik_uclu',
        order: globalOrder,
        orderIndex: globalOrder
      };
      allTestsToInsert.push(testItem);
      topicTestsMap[t.id].push(testItem);
      globalOrder++;
    }

    // 2. MC Tests
    const fasMc = mcTests.filter(m => m.topicId === t.id);
    fasMc.forEach((mc, mcIdx) => {
      const qCount = Object.keys(mc.answerKey).length;
      // slug name for id
      const slug = mc.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const testId = `tbt_max_fen_f${fasNo}_mc_${mcIdx + 1}_${slug}`;

      const testItem = {
        id: testId,
        book_id: BOOK_ID,
        bookId: BOOK_ID,
        subject_id: SUBJECT_ID,
        subjectId: SUBJECT_ID,
        topic_id: t.id,
        topicId: t.id,
        name: mc.name,
        question_count: qCount,
        questionCount: qCount,
        answer_key: mc.answerKey,
        answerKey: mc.answerKey,
        option_count: 4,
        optionCount: 4,
        pdf_url: '',
        pdfUrl: '',
        is_open_ended: false,
        isOpenEnded: false,
        question_type: 'coktan_secmeli',
        questionType: 'coktan_secmeli',
        order: globalOrder,
        orderIndex: globalOrder
      };
      allTestsToInsert.push(testItem);
      topicTestsMap[t.id].push(testItem);
      globalOrder++;
    });

    // 3. Birbirine Bağla
    const birbirineBagla = openEndedTests.find(oe => oe.topicId === t.id && oe.name.includes('Birbirine Bağla'));
    if (birbirineBagla) {
      const testId = `tbt_max_fen_f${fasNo}_birbirine_bagla`;
      const qCount = birbirineBagla.qCount;
      const testItem = {
        id: testId,
        book_id: BOOK_ID,
        bookId: BOOK_ID,
        subject_id: SUBJECT_ID,
        subjectId: SUBJECT_ID,
        topic_id: t.id,
        topicId: t.id,
        name: birbirineBagla.name,
        question_count: qCount,
        questionCount: qCount,
        answer_key: birbirineBagla.answers,
        answerKey: birbirineBagla.answers,
        option_count: 0,
        optionCount: 0,
        pdf_url: '',
        pdfUrl: '',
        is_open_ended: true,
        isOpenEnded: true,
        question_type: 'acik_uclu',
        questionType: 'acik_uclu',
        order: globalOrder,
        orderIndex: globalOrder
      };
      allTestsToInsert.push(testItem);
      topicTestsMap[t.id].push(testItem);
      globalOrder++;
    }

    // 4. Yaşama Uyarla
    const yasamaUyarla = openEndedTests.find(oe => oe.topicId === t.id && oe.name.includes('Yaşama Uyarla'));
    if (yasamaUyarla) {
      const testId = `tbt_max_fen_f${fasNo}_yasama_uyarla`;
      const qCount = yasamaUyarla.qCount;
      const testItem = {
        id: testId,
        book_id: BOOK_ID,
        bookId: BOOK_ID,
        subject_id: SUBJECT_ID,
        subjectId: SUBJECT_ID,
        topic_id: t.id,
        topicId: t.id,
        name: yasamaUyarla.name,
        question_count: qCount,
        questionCount: qCount,
        answer_key: yasamaUyarla.answers,
        answerKey: yasamaUyarla.answers,
        option_count: 0,
        optionCount: 0,
        pdf_url: '',
        pdfUrl: '',
        is_open_ended: true,
        isOpenEnded: true,
        question_type: 'acik_uclu',
        questionType: 'acik_uclu',
        order: globalOrder,
        orderIndex: globalOrder
      };
      allTestsToInsert.push(testItem);
      topicTestsMap[t.id].push(testItem);
      globalOrder++;
    }
  });

  console.log(`Total tests prepared: ${allTestsToInsert.length}`);
  const oeCount = allTestsToInsert.filter(t => t.is_open_ended).length;
  const mcCount = allTestsToInsert.filter(t => !t.is_open_ended).length;
  console.log(`Open-ended tests: ${oeCount}, MC tests: ${mcCount}`);

  // Build subjects structure
  const updatedSubjects = [
    {
      id: '__book_meta__',
      title: '5. Sınıf MAX Fen Bilimleri Konu & Soru Fasikülleri',
      __meta: true,
      pdfUrl: '',
      pdf_url: '',
      bookType: 'standard',
      publisher: 'Hiper Zeka / Uzman Kariyer',
      optionCount: 4,
      hideAnswerKey: true
    },
    {
      id: SUBJECT_ID,
      name: 'Fen Bilimleri',
      topics: topics.map(t => ({
        id: t.id,
        name: t.name,
        order: t.order,
        tests: topicTestsMap[t.id]
      }))
    }
  ];

  const bookPayload = {
    id: BOOK_ID,
    title: '5. Sınıf MAX Fen Bilimleri Konu & Soru Fasikülleri',
    publisher: 'Hiper Zeka / Uzman Kariyer',
    book_type: 'standard',
    option_count: 4,
    pdf_url: '',
    raw_data: {
      title: '5. Sınıf MAX Fen Bilimleri Konu & Soru Fasikülleri',
      publisher: 'Hiper Zeka / Uzman Kariyer',
      bookType: 'standard',
      optionCount: 4,
      pdfUrl: '',
      pdf_url: '',
      hideAnswerKey: true,
      subjects: updatedSubjects
    },
    subjects: updatedSubjects
  };

  console.log('=== Step 2: Upserting tracked_books entry in Supabase ===');
  const { error: upsertErr } = await supabase
    .from('tracked_books')
    .upsert(bookPayload, { onConflict: 'id' });

  if (upsertErr) {
    console.error('Error upserting book:', upsertErr);
    return;
  }
  console.log('Successfully upserted tracked_books for:', BOOK_ID);

  console.log('=== Step 3: Deleting old tests in tracked_book_tests for', BOOK_ID, '===');
  const { error: delErr } = await supabase
    .from('tracked_book_tests')
    .delete()
    .eq('book_id', BOOK_ID);

  if (delErr) {
    console.warn('Warning deleting old tests:', delErr);
  } else {
    console.log('Old tests deleted successfully.');
  }

  console.log('=== Step 4: Inserting all 89 tests into tracked_book_tests ===');
  const insertPayloads = allTestsToInsert.map(t => ({
    id: t.id,
    book_id: t.book_id,
    subject_id: t.subject_id,
    topic_id: t.topic_id,
    name: t.name,
    question_count: t.question_count,
    answer_key: t.answer_key,
    option_count: t.option_count,
    pdf_url: t.pdf_url || '',
    is_open_ended: t.is_open_ended,
    question_type: t.question_type
  }));

  const batchSize = 20;
  for (let c = 0; c < insertPayloads.length; c += batchSize) {
    const chunk = insertPayloads.slice(c, c + batchSize);
    const { error: insErr } = await supabase
      .from('tracked_book_tests')
      .insert(chunk);

    if (insErr) {
      console.error(`Error inserting chunk ${c}:`, insErr);
      return;
    }
    console.log(`Inserted chunk ${c + 1} to ${Math.min(c + batchSize, insertPayloads.length)}`);
  }

  console.log('=== Step 5: Verifying insertion from Supabase ===');
  const { data: inserted, error: countErr } = await supabase
    .from('tracked_book_tests')
    .select('id, name, question_count, option_count, is_open_ended, question_type')
    .eq('book_id', BOOK_ID);

  if (countErr) {
    console.error('Error verifying count:', countErr);
  } else {
    console.log(`Verified: ${inserted.length} tests exist in Supabase for ${BOOK_ID}`);
    const oeTests = inserted.filter(x => x.is_open_ended);
    const mcTestsVerified = inserted.filter(x => !x.is_open_ended);
    console.log(`Verified Open-Ended: ${oeTests.length} tests`);
    console.log(`Verified Multiple-Choice: ${mcTestsVerified.length} tests`);
    
    // Total questions in open-ended
    const totalOeQuestions = oeTests.reduce((acc, t) => acc + (t.question_count || 0), 0);
    console.log(`Total questions across all 20 open-ended tests: ${totalOeQuestions} (expected: 296)`);
  }

  console.log('=== Step 6: Syncing with backup.json ===');
  try {
    const backupRaw = fs.readFileSync('backup.json', 'utf8');
    const backup = JSON.parse(backupRaw);
    const data = backup[0].backup_data;

    data.tracked_books = (data.tracked_books || []).filter(b => b.id !== BOOK_ID);
    data.tracked_books.push(bookPayload);

    data.tracked_book_tests = (data.tracked_book_tests || []).filter(t => t.book_id !== BOOK_ID);
    data.tracked_book_tests.push(...insertPayloads);

    fs.writeFileSync('backup.json', JSON.stringify(backup, null, 2), 'utf8');
    console.log('Successfully updated backup.json!');
  } catch (err) {
    console.error('Error updating backup.json:', err);
  }

  console.log('=== ALL DONE SUCCESSFULLY! ===');
}

main();
