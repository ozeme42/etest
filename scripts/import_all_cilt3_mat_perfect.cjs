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

const mcTests = JSON.parse(fs.readFileSync('scripts/all_mc_tests_structured.json', 'utf8'));
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

const topics = [
  { id: 'top_mat_cilt3_fas_1', name: '1. Fasikül: Geometrik Şekiller', fasNo: 1, order: 1 },
  { id: 'top_mat_cilt3_fas_2', name: '2. Fasikül: Sayılar ve İşlemler', fasNo: 2, order: 2 },
  { id: 'top_mat_cilt3_fas_3', name: '3. Fasikül: Geometrik Nicelikler', fasNo: 3, order: 3 },
  { id: 'top_mat_cilt3_fas_4', name: '4. Fasikül: Kesirler', fasNo: 4, order: 4 },
  { id: 'top_mat_cilt3_fas_5', name: '5. Fasikül: İstatistiksel Araştırma Süreci', fasNo: 5, order: 5 },
  { id: 'top_mat_cilt3_fas_6', name: '6. Fasikül: İşlemlerle Cebirsel Düşünme', fasNo: 6, order: 6 }
];

async function run() {
  console.log('--- STARTING PERFECT RE-IMPORT FOR 5. SINIF MATEMATİK CİLT-3 (MAX) ---');

  const allBookTests = [];
  const topicTestsMap = {};

  let globalOrder = 1;

  topics.forEach(top => {
    topicTestsMap[top.id] = [];

    // 1. First add the official Multiple Choice Tests for this fasikül:
    // a. Kavramları Kavra
    // b. Öğrendiğini Kanıtla
    // c. Becerini Sergile
    const fasMcTests = mcTests.filter(t => t.fasNo === top.fasNo);

    fasMcTests.forEach((mc, idx) => {
      // Create clean, unique ID
      const testId = `tbt_mat3_f${top.fasNo}_mc_${idx + 1}_${Date.now().toString(36).substring(2, 6)}`;
      const testItem = {
        id: testId,
        book_id: BOOK_ID,
        bookId: BOOK_ID,
        subject_id: SUBJECT_ID,
        subjectId: SUBJECT_ID,
        topic_id: top.id,
        topicId: top.id,
        name: mc.name,
        question_count: mc.questionCount,
        questionCount: mc.questionCount,
        answer_key: mc.answerKey,
        answerKey: mc.answerKey,
        option_count: 4,
        optionCount: 4,
        pdf_url: PDF_URL,
        pdfUrl: PDF_URL,
        order: globalOrder,
        orderIndex: globalOrder
      };

      allBookTests.push(testItem);
      topicTestsMap[top.id].push(testItem);
      globalOrder++;
    });

    // 2. Then add the Open-Ended Activity Tests for this fasikül
    const fasOpenTests = openEndedTests.filter(t => t.fasNo === top.fasNo);

    fasOpenTests.forEach((oe, idx) => {
      const testId = `tbt_mat3_f${top.fasNo}_oe_${idx + 1}_${Date.now().toString(36).substring(2, 6)}`;
      const qCount = oe.items.length;

      const answerKeyMap = {
        __meta: {
          isOpenEnded: true,
          questionType: 'acik_uclu',
          startQuestionNumber: 1
        }
      };

      const questionsList = [];

      oe.items.forEach((item, qIdx) => {
        const qNo = qIdx + 1;
        const qText = getQText(top.fasNo, item.type, item.num, `${item.title}: Aşağıdaki etkinliği cevaplayınız.`);
        
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
        topic_id: top.id,
        topicId: top.id,
        name: oe.name,
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

      allBookTests.push(testItem);
      topicTestsMap[top.id].push(testItem);
      globalOrder++;
    });
  });

  console.log(`Total tests prepared across all topics: ${allBookTests.length} (99 MC + 39 Open-Ended)`);

  // 3. Build updated subjects structure
  const updatedSubjects = [
    {
      id: '__book_meta__',
      __meta: true,
      title: BOOK_TITLE,
      publisher: PUBLISHER,
      bookType: 'standard',
      optionCount: 4,
      pdfUrl: PDF_URL,
      pdf_url: PDF_URL,
      maxPage: 513,
      hideAnswerKey: true
    },
    {
      id: SUBJECT_ID,
      name: 'Matematik',
      topics: topics.map(t => ({
        id: t.id,
        name: t.name,
        order: t.order,
        tests: topicTestsMap[t.id]
      }))
    }
  ];

  // 4. Update tracked_books in Supabase
  console.log('Updating tracked_books table in Supabase...');
  const { error: bookUpdErr } = await supabase
    .from('tracked_books')
    .update({
      pdf_url: PDF_URL,
      subjects: updatedSubjects,
      raw_data: {
        title: BOOK_TITLE,
        publisher: PUBLISHER,
        bookType: 'standard',
        optionCount: 4,
        pdfUrl: PDF_URL,
        pdf_url: PDF_URL,
        hideAnswerKey: true,
        subjects: updatedSubjects
      }
    })
    .eq('id', BOOK_ID);

  if (bookUpdErr) {
    console.error('Error updating tracked_books:', bookUpdErr);
    return;
  }
  console.log('Successfully updated tracked_books in Supabase!');

  // 5. Delete all existing tests for this book from tracked_book_tests
  console.log('Deleting existing tests for this book in tracked_book_tests...');
  const { error: delErr } = await supabase
    .from('tracked_book_tests')
    .delete()
    .eq('book_id', BOOK_ID);

  if (delErr) {
    console.error('Error deleting old tests:', delErr);
    return;
  }
  console.log('Deleted old tests successfully.');

  // 6. Insert all 138 tests into tracked_book_tests in batches
  console.log(`Inserting ${allBookTests.length} tests into tracked_book_tests...`);
  const insertPayloads = allBookTests.map(t => ({
    id: t.id,
    book_id: t.book_id,
    subject_id: t.subject_id,
    topic_id: t.topic_id,
    name: t.name,
    question_count: t.question_count,
    answer_key: t.answer_key,
    option_count: t.option_count,
    pdf_url: PDF_URL
  }));

  const batchSize = 25;
  for (let i = 0; i < insertPayloads.length; i += batchSize) {
    const batch = insertPayloads.slice(i, i + batchSize);
    const { error: batchErr } = await supabase
      .from('tracked_book_tests')
      .insert(batch);
    if (batchErr) {
      console.error(`Error inserting batch at ${i}:`, batchErr);
    }
  }
  console.log('Successfully inserted all 138 tests into tracked_book_tests!');

  // 7. Verify count in Supabase
  const { count: finalCount } = await supabase
    .from('tracked_book_tests')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', BOOK_ID);

  console.log(`=== SUPABASE VERIFICATION ===`);
  console.log(`Total tests in Supabase for ${BOOK_ID}: ${finalCount}`);

  // 8. Sync with backup.json
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

  console.log('--- RE-IMPORT FINISHED WITH FULL PERFECTION! ---');
}

run();
