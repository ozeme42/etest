const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://bstcisckpnmwmcggmtfi.supabase.co';
const key = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';
const supabase = createClient(url, key);

const BOOK_ID = 'tb_hiperzeka_5_mat_cilt3';
const BOOK_TITLE = '5. Sınıf Matematik CİLT-3 (MAX)';
const PUBLISHER = 'Hiper Zeka / Uzman Kariyer';
const PDF_URL = 'https://www.uzmankariyer.com/hiperzeka/uploads/ebooks/2026/max/5/5_max_mat/mobile/index.html';
const SUBJECT_ID = 'sub_cilt3_matematik';

const openEndedTests = JSON.parse(fs.readFileSync('scripts/mat_open_tests_structured.json', 'utf8'));
const parsedQuestions = JSON.parse(fs.readFileSync('scripts/parsed_all_mat_questions.json', 'utf8'));

// Helper to get question text
function getQText(fasNo, type, num, fallback) {
  const item = parsedQuestions[fasNo] && parsedQuestions[fasNo][type] && parsedQuestions[fasNo][type][num];
  if (item && item.text && item.text.trim().length > 5) {
    return item.text.trim();
  }
  return fallback;
}

async function run() {
  console.log('--- STARTING COMPLETE IMPORT FOR 5. SINIF MATEMATİK CİLT-3 (MAX) ---');

  // 1. Fetch current book record from Supabase
  const { data: bookRecord, error: bookFetchErr } = await supabase
    .from('tracked_books')
    .select('*')
    .eq('id', BOOK_ID)
    .single();

  if (bookFetchErr || !bookRecord) {
    console.error('Error fetching book from Supabase:', bookFetchErr);
    return;
  }

  console.log(`Found book record: ${bookRecord.title}`);

  // 2. Fetch existing tests from tracked_book_tests
  const { data: existingTests, error: testsFetchErr } = await supabase
    .from('tracked_book_tests')
    .select('*')
    .eq('book_id', BOOK_ID);

  if (testsFetchErr) {
    console.error('Error fetching tests from Supabase:', testsFetchErr);
    return;
  }

  console.log(`Found ${existingTests.length} existing tests in DB.`);

  // Filter out any previous placeholder open-ended tests
  const mcTests = existingTests.filter(t => {
    const isOldOpen = t.id.includes('open') || 
                      (t.answer_key && t.answer_key.__meta && t.answer_key.__meta.isOpenEnded) ||
                      t.name.includes('Açık Uçlu');
    return !isOldOpen;
  });

  const oldOpenTests = existingTests.filter(t => {
    return t.id.includes('open') || 
           (t.answer_key && t.answer_key.__meta && t.answer_key.__meta.isOpenEnded) ||
           t.name.includes('Açık Uçlu');
  });

  console.log(`Retaining ${mcTests.length} Multiple Choice tests.`);
  console.log(`Removing ${oldOpenTests.length} old placeholder open tests.`);

  // 3. Prepare new 39 open-ended test items
  const newOpenTestsToInsert = [];
  const topicOpenTestsMap = {};

  let globalOrder = 100; // after MC tests

  openEndedTests.forEach((testDef, idx) => {
    const testId = `tbt_mat3_oe_f${testDef.fasNo}_t${idx + 1}_${Date.now().toString(36).substring(2, 6)}`;
    const qCount = testDef.items.length;

    const answerKeyMap = {
      __meta: {
        isOpenEnded: true,
        questionType: 'acik_uclu',
        startQuestionNumber: 1
      }
    };

    const questionsList = [];

    testDef.items.forEach((item, qIdx) => {
      const qNo = qIdx + 1;
      const qText = getQText(testDef.fasNo, item.type, item.num, `${item.title}: Aşağıdaki soruyu/etkinliği cevaplayınız.`);
      
      answerKeyMap[String(qNo)] = item.ans;

      questionsList.push({
        id: `q_${testId}_${qNo}`,
        questionNo: qNo,
        title: item.title,
        text: qText,
        questionText: qText,
        correctAnswerText: item.ans,
        correctAnswer: item.ans,
        answerKey: item.ans,
        isOpenEnded: true,
        type: 'acik_uclu',
        questionType: 'acik_uclu'
      });
    });

    const testItem = {
      id: testId,
      book_id: BOOK_ID,
      bookId: BOOK_ID,
      subject_id: SUBJECT_ID,
      subjectId: SUBJECT_ID,
      topic_id: testDef.topicId,
      topicId: testDef.topicId,
      name: testDef.name,
      question_count: qCount,
      questionCount: qCount,
      answer_key: answerKeyMap,
      answerKey: answerKeyMap,
      questions_list: questionsList,
      questionsList: questionsList,
      option_count: 0,
      optionCount: 0,
      isOpenEnded: true,
      questionType: 'acik_uclu',
      pdf_url: PDF_URL,
      pdfUrl: PDF_URL,
      order: globalOrder,
      orderIndex: globalOrder
    };

    newOpenTestsToInsert.push(testItem);

    if (!topicOpenTestsMap[testDef.topicId]) {
      topicOpenTestsMap[testDef.topicId] = [];
    }
    topicOpenTestsMap[testDef.topicId].push(testItem);

    globalOrder++;
  });

  console.log(`Generated ${newOpenTestsToInsert.length} new open-ended test items.`);

  // 4. Update the subjects/topics hierarchy in the book record
  const currentSubjects = bookRecord.subjects || [];
  const matSubject = currentSubjects.find(s => s.id === SUBJECT_ID || s.name === 'Matematik');

  if (matSubject && matSubject.topics) {
    matSubject.topics.forEach(topic => {
      // Filter out old open tests from this topic's tests
      const topicMcTests = (topic.tests || []).filter(t => {
        return !t.id.includes('open') && 
               !(t.answer_key && t.answer_key.__meta && t.answer_key.__meta.isOpenEnded) &&
               !(t.answerKey && t.answerKey.__meta && t.answerKey.__meta.isOpenEnded) &&
               !t.name.includes('Açık Uçlu');
      });

      // Update pdfUrl on topic MC tests
      topicMcTests.forEach(t => {
        t.pdf_url = PDF_URL;
        t.pdfUrl = PDF_URL;
      });

      // Append new open tests for this topic
      const newTopicOpenTests = topicOpenTestsMap[topic.id] || [];
      topic.tests = [...topicMcTests, ...newTopicOpenTests];
    });
  }

  // Update meta subject
  const metaSubject = currentSubjects.find(s => s.id === '__book_meta__');
  if (metaSubject) {
    metaSubject.pdfUrl = PDF_URL;
    metaSubject.pdf_url = PDF_URL;
  }

  // 5. Update tracked_books in Supabase
  console.log('Updating tracked_books table...');
  const { error: bookUpdateErr } = await supabase
    .from('tracked_books')
    .update({
      pdf_url: PDF_URL,
      subjects: currentSubjects,
      raw_data: {
        ...bookRecord.raw_data,
        pdfUrl: PDF_URL,
        pdf_url: PDF_URL,
        subjects: currentSubjects
      }
    })
    .eq('id', BOOK_ID);

  if (bookUpdateErr) {
    console.error('Error updating tracked_books:', bookUpdateErr);
    return;
  }
  console.log('Successfully updated tracked_books in Supabase!');

  // 6. Delete old open tests from tracked_book_tests
  if (oldOpenTests.length > 0) {
    const oldIds = oldOpenTests.map(t => t.id);
    console.log(`Deleting ${oldIds.length} old open tests from tracked_book_tests...`);
    const { error: delErr } = await supabase
      .from('tracked_book_tests')
      .delete()
      .in('id', oldIds);

    if (delErr) {
      console.warn('Warning deleting old open tests:', delErr);
    } else {
      console.log('Deleted old open tests.');
    }
  }

  // 7. Update pdf_url on remaining MC tests in tracked_book_tests
  console.log('Updating pdf_url on MC tests...');
  const mcIds = mcTests.map(t => t.id);
  if (mcIds.length > 0) {
    await supabase
      .from('tracked_book_tests')
      .update({ pdf_url: PDF_URL })
      .in('id', mcIds);
  }

  // 8. Insert new open tests into tracked_book_tests
  console.log(`Inserting ${newOpenTestsToInsert.length} new open tests into tracked_book_tests...`);
  
  // Prepare insert payloads (snake_case columns for PostgreSQL)
  const insertPayloads = newOpenTestsToInsert.map(t => ({
    id: t.id,
    book_id: t.book_id,
    subject_id: t.subject_id,
    topic_id: t.topic_id,
    name: t.name,
    question_count: t.question_count,
    answer_key: t.answer_key,
    option_count: 0,
    pdf_url: PDF_URL
  }));

  // Batch insert
  const batchSize = 20;
  for (let i = 0; i < insertPayloads.length; i += batchSize) {
    const batch = insertPayloads.slice(i, i + batchSize);
    const { error: batchErr } = await supabase
      .from('tracked_book_tests')
      .upsert(batch, { onConflict: 'id' });
    if (batchErr) {
      console.error(`Error inserting batch ${i}:`, batchErr);
    }
  }
  console.log('Successfully inserted all new open-ended tests into tracked_book_tests!');

  // 9. Verify count in Supabase
  const { count: finalCount } = await supabase
    .from('tracked_book_tests')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', BOOK_ID);

  console.log(`=== SUPABASE VERIFICATION ===`);
  console.log(`Total tests now in DB for ${BOOK_ID}: ${finalCount} (${mcTests.length} MC + ${newOpenTestsToInsert.length} Open-Ended)`);

  // 10. Sync with backup.json
  console.log('Syncing with local backup.json...');
  try {
    const { data: allBooks } = await supabase.from('tracked_books').select('*');
    const { data: allTests } = await supabase.from('tracked_book_tests').select('*');

    const backupFile = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
    backupFile[0].backup_data.tracked_books = allBooks;
    backupFile[0].backup_data.tracked_book_tests = allTests;
    fs.writeFileSync('backup.json', JSON.stringify(backupFile, null, 2), 'utf8');
    console.log('backup.json updated successfully!');
  } catch (syncErr) {
    console.warn('Notice while updating backup.json:', syncErr.message);
  }

  console.log('--- IMPORT COMPLETED SUCCESSFULLY! ---');
}

run();
