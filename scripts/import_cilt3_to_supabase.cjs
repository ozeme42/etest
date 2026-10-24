const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://bstcisckpnmwmcggmtfi.supabase.co';
const key = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';
const supabase = createClient(url, key);

const content = fs.readFileSync('C:/Users/mahmut/.gemini/antigravity/brain/602e7fcd-8fa0-4825-8afe-e3d07dddec13/scratch/compact_answer_pages.txt', 'utf8');

const pages = content.split(/^Page\s+(\d+)\s+/m);
const pageMap = {};
for(let i=1; i<pages.length; i+=2) {
  pageMap[pages[i]] = pages[i+1];
}

const fasikuls = [
  { no: 1, name: '1. Fasikül: Söz Varlığımız & Cümlede Anlam', pages: ['143','144','145'] },
  { no: 2, name: '2. Fasikül: Deyimler & Metin Türleri & Dil Yapıları', pages: ['240','241'] },
  { no: 3, name: '3. Fasikül: Söz Sanatları & Metinde Anlam & Noktalama', pages: ['336','337'] },
  { no: 4, name: '4. Fasikül: Atasözleri & Paragraf & Yazım Kuralları', pages: ['431','432','433'] },
  { no: 5, name: '5. Fasikül: Metinde Soru-Cevap & 5N1K & Zamirler', pages: ['496','497'] },
  { no: 6, name: '6. Fasikül: Nezaket İfadeleri & Metin Tamamlama', pages: ['528','529'] }
];

const BOOK_ID = 'tb_hiperzeka_5_turkce_cilt3';
const BOOK_TITLE = '5. Sınıf Türkçe CİLT-3 (MAX)';
const PUBLISHER = 'Hiper Zeka / Uzman Kariyer';
const PDF_URL = 'https://www.uzmankariyer.com/hiperzeka/uploads/ebooks/2026/max/5/5_max_turkce/mobile/index.html';

async function run() {
  console.log('--- PREPARING CİLT-3 DATA ---');

  const subjects = [];
  const allTestsToInsert = [];

  let globalTestIndex = 1;

  for (const fas of fasikuls) {
    const text = fas.pages.map(p => pageMap[p] || '').join('\n');
    const simpleAnsRegex = /(?:(\b0[1-9]|\b[1-9][0-9])\s+)?(1\.[A-D](?:\s+\d+\.[A-D]+)+)/g;

    const fasTopicId = `top_cilt3_fas_${fas.no}`;
    const fasSubjId = `sub_cilt3_turkce`;

    const topicTests = [];
    let m;
    let localIdx = 1;

    while ((m = simpleAnsRegex.exec(text)) !== null) {
      const numLabel = m[1] ? `Test ${m[1]}` : `Test ${localIdx}`;
      const ansStr = m[2];

      const answers = {};
      const aMatches = ansStr.matchAll(/(\d+)\.([A-D])/g);
      for (const a of aMatches) {
        answers[a[1]] = a[2];
      }
      const qCount = Object.keys(answers).length;
      if (qCount >= 3) {
        const testId = `tbt_cilt3_f${fas.no}_t${localIdx}_${Date.now().toString(36).substring(2,6)}`;
        const testName = `${fas.no}. Fasikül - ${numLabel}`;

        const testItem = {
          id: testId,
          name: testName,
          book_id: BOOK_ID,
          bookId: BOOK_ID,
          subject_id: fasSubjId,
          subjectId: fasSubjId,
          topic_id: fasTopicId,
          topicId: fasTopicId,
          question_count: qCount,
          questionCount: qCount,
          answer_key: answers,
          answerKey: answers,
          option_count: 4,
          optionCount: 4,
          pdf_url: PDF_URL,
          pdfUrl: PDF_URL,
          order: globalTestIndex,
          orderIndex: globalTestIndex
        };

        topicTests.push(testItem);
        allTestsToInsert.push({
          id: testId,
          book_id: BOOK_ID,
          subject_id: fasSubjId,
          topic_id: fasTopicId,
          name: testName,
          question_count: qCount,
          answer_key: answers,
          option_count: 4,
          pdf_url: PDF_URL
        });

        localIdx++;
        globalTestIndex++;
      }
    }

    subjects.push({
      id: fasSubjId,
      name: 'Türkçe',
      topics: [
        {
          id: fasTopicId,
          name: fas.name,
          tests: topicTests
        }
      ]
    });
  }

  const consolidatedSubjects = [
    {
      id: '__book_meta__',
      __meta: true,
      title: BOOK_TITLE,
      publisher: PUBLISHER,
      bookType: 'standard',
      optionCount: 4,
      pdfUrl: PDF_URL,
      maxPage: 529,
      hideAnswerKey: true
    },
    {
      id: 'sub_cilt3_turkce',
      name: 'Türkçe',
      topics: subjects.map(s => s.topics[0])
    }
  ];

  console.log(`Extracted ${allTestsToInsert.length} tests across 6 fasiküls.`);

  console.log('Upserting book to tracked_books...');
  const bookPayload = {
    id: BOOK_ID,
    title: BOOK_TITLE,
    publisher: PUBLISHER,
    book_type: 'standard',
    option_count: 4,
    pdf_url: PDF_URL,
    subjects: consolidatedSubjects,
    raw_data: {
      title: BOOK_TITLE,
      publisher: PUBLISHER,
      bookType: 'standard',
      optionCount: 4,
      pdfUrl: PDF_URL,
      maxPage: 529,
      hideAnswerKey: true,
      subjects: consolidatedSubjects
    }
  };

  const { error: bErr } = await supabase.from('tracked_books').upsert(bookPayload);
  if (bErr) {
    console.error('Error inserting book:', bErr);
    return;
  }
  console.log('Book successfully upserted!');

  console.log('Cleaning existing tests for book...');
  await supabase.from('tracked_book_tests').delete().eq('book_id', BOOK_ID);

  console.log('Inserting tests in batches...');
  const BATCH_SIZE = 40;
  for (let i = 0; i < allTestsToInsert.length; i += BATCH_SIZE) {
    const chunk = allTestsToInsert.slice(i, i + BATCH_SIZE);
    const { error: tErr } = await supabase.from('tracked_book_tests').insert(chunk);
    if (tErr) {
      console.error(`Error inserting batch ${i}:`, tErr);
    } else {
      console.log(`Inserted batch ${i + 1} to ${Math.min(i + BATCH_SIZE, allTestsToInsert.length)}`);
    }
  }

  const { count: finalCount } = await supabase.from('tracked_book_tests').select('*', { count: 'exact', head: true }).eq('book_id', BOOK_ID);
  console.log(`VERIFICATION: Total tests in DB for ${BOOK_ID}: ${finalCount}`);
  console.log('FINISHED SUCCESSFULLY!');
}

run();
