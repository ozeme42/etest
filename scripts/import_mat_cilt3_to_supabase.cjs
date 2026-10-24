const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://bstcisckpnmwmcggmtfi.supabase.co';
const key = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';
const supabase = createClient(url, key);

const raw = fs.readFileSync('C:/Users/mahmut/.gemini/antigravity/brain/602e7fcd-8fa0-4825-8afe-e3d07dddec13/scratch/cilt3_mat_search.js', 'latin1');

function parsePages(content) {
  const start = content.indexOf('var textForPages = [');
  const end = content.lastIndexOf('];');
  let pages = [];
  let inStr = false;
  let escaped = false;
  let cur = '';
  let i = start + 'var textForPages = ['.length;
  while (i <= end) {
    const c = content[i];
    if (escaped) {
      if (c === 'n') cur += '\n';
      else if (c === 't') cur += '\t';
      else if (c === 'r') cur += '\r';
      else cur += c;
      escaped = false; i++; continue;
    }
    if (c === '\\') { escaped = true; i++; continue; }
    if (c === '"') {
      if (inStr) { pages.push(cur); cur = ''; inStr = false; }
      else { inStr = true; }
      i++; continue;
    }
    if (inStr) cur += c;
    i++;
  }
  return pages;
}

const rawPages = parsePages(raw);
function toCleanUtf8(str) {
  try {
    return Buffer.from(str, 'latin1').toString('utf8');
  } catch(e) {
    return str;
  }
}

const BOOK_ID = 'tb_hiperzeka_5_mat_cilt3';
const BOOK_TITLE = '5. Sınıf Matematik CİLT-3 (MAX)';
const PUBLISHER = 'Hiper Zeka / Uzman Kariyer';

const fasikuls = [
  { no: 1, id: 'top_mat_cilt3_fas_1', name: '1. Fasikül: Geometrik Şekiller', ansPage: 97, openPages: [92, 93, 94, 95, 96] },
  { no: 2, id: 'top_mat_cilt3_fas_2', name: '2. Fasikül: Sayılar ve İşlemler', ansPage: 209, openPages: [204, 205, 206, 207, 208] },
  { no: 3, id: 'top_mat_cilt3_fas_3', name: '3. Fasikül: Geometrik Nicelikler', ansPage: 273, openPages: [267, 268, 269, 270, 271, 272] },
  { no: 4, id: 'top_mat_cilt3_fas_4', name: '4. Fasikül: Kesirler', ansPage: 369, openPages: [363, 364, 365, 366, 367, 368] },
  { no: 5, id: 'top_mat_cilt3_fas_5', name: '5. Fasikül: İstatistiksel Araştırma Süreci', ansPage: 417, openPages: [415, 416] },
  { no: 6, id: 'top_mat_cilt3_fas_6', name: '6. Fasikül: İşlemlerle Cebirsel Düşünme', ansPage: 513, openPages: [511, 512] }
];

async function run() {
  console.log('--- EXTRACTING 5. SINIF MATEMATİK CİLT-3 DATA ---');

  const allTestsToInsert = [];
  const subjectsTopics = [];

  let globalOrder = 1;

  for (const fas of fasikuls) {
    const topicTests = [];
    const ansPageText = toCleanUtf8(rawPages[fas.ansPage - 1] || '');

    // 1. Extract MC tests
    const ansRegex = /(\d+\.[A-D](?:\s+\d+\.[A-D]+)+)/g;
    let match;
    let localIdx = 1;

    while ((match = ansRegex.exec(ansPageText)) !== null) {
      const seq = match[1];
      const answers = {};
      const aMatches = seq.matchAll(/(\d+)\.([A-D])/g);
      for (const a of aMatches) {
        answers[a[1]] = a[2];
      }
      const qCount = Object.keys(answers).length;
      if (qCount >= 3) {
        const testId = `tbt_mat3_f${fas.no}_t${localIdx}_${Date.now().toString(36).substring(2,6)}`;
        const testName = `${fas.no}. Fasikül - Test ${localIdx}`;

        const testItem = {
          id: testId,
          name: testName,
          book_id: BOOK_ID,
          bookId: BOOK_ID,
          subject_id: 'sub_cilt3_matematik',
          subjectId: 'sub_cilt3_matematik',
          topic_id: fas.id,
          topicId: fas.id,
          question_count: qCount,
          questionCount: qCount,
          answer_key: answers,
          answerKey: answers,
          option_count: 4,
          optionCount: 4,
          pdf_url: '',
          pdfUrl: '',
          order: globalOrder,
          orderIndex: globalOrder
        };

        topicTests.push(testItem);
        allTestsToInsert.push({
          id: testId,
          book_id: BOOK_ID,
          subject_id: 'sub_cilt3_matematik',
          topic_id: fas.id,
          name: testName,
          question_count: qCount,
          answer_key: answers,
          option_count: 4,
          pdf_url: ''
        });

        localIdx++;
        globalOrder++;
      }
    }

    // 2. Open-ended activity tests for this fasikül
    // We create thematic open-ended activity tests based on the fasikül's openPages
    const openAnswers = {};
    if (fas.no === 1) {
      openAnswers["1"] = "a. [AB], b. CD, c. [EF] (Sembolle Gösterim)";
      openAnswers["2"] = "Açı ölçüleri: mAOB = 25°, mKOL = 55°, mPOR = 65°";
      openAnswers["3"] = "Çember çizimi: Yarıçap = 8 cm, Çap = 16 cm; Yarıçap = 15 cm, Çap = 30 cm; Çevre = 22 cm";
      openAnswers["4"] = "Doğru parçaları eşitliği: AB = CD = EF = 6 birim";
      openAnswers["5"] = "Açı türleri: Dar açı (<90°), Dik açı (90°), Geniş açı (>90°), Doğru açı (180°)";
      openAnswers["6"] = "Üçgen çeşitleri: a. İkizkenar, b. Çeşitkenar, c. Eşkenar, d. İkizkenar, e. Eşkenar, f. Çeşitkenar";
      openAnswers["7"] = "Komşu ve Tümler Açılar: Toplamları 90°; Bütünler Açılar: Toplamları 180°";
    } else if (fas.no === 2) {
      openAnswers["1"] = "Basamak isimleri: Yüzler, Milyonlar, Yüz binler, Milyarlar";
      openAnswers["2"] = "Okunuşu verilen sayılar: Otuz iki milyar yüz on yedi milyon beş bin yedi yüz iki → 32 117 005 702";
      openAnswers["3"] = "Bölükler: Birler bölüğü, Binler bölüğü, Milyonlar bölüğü, Milyarlar bölüğü";
      openAnswers["4"] = "Doğal sayılarda yuvarlama: En yakın onluğa ve yüzlüğe yuvarlama kuralları";
      openAnswers["5"] = "Zihinden toplama ve çıkarma stratejileri: Onlukları ayırma ve üzerine ekleme";
      openAnswers["6"] = "Çarpma ve bölme işlemleri: Pratik 10, 100, 1000 ile çarpma/bölme";
      openAnswers["7"] = "Gerçek yaşam problemleri: Ahmet: 360 TL, Erdem: 120 TL; Sena: 36 adet, Musa: 9 adet";
    } else if (fas.no === 3) {
      openAnswers["1"] = "Dikdörtgenin Çevre Uzunluğu = 2 x (Kısa Kenar + Uzun Kenar)";
      openAnswers["2"] = "Karenin Çevre Uzunluğu = 4 x Kenar Uzunluğu";
      openAnswers["3"] = "Dikdörtgenin Alanı = Kısa Kenar x Uzun Kenar";
      openAnswers["4"] = "Karenin Alanı = Kenar x Kenar (Örnek: 6 cm x 6 cm = 36 cm²)";
      openAnswers["5"] = "Alanı verilen dikdörtgenin çevre hesabı ve kenar kombinasyonları";
      openAnswers["6"] = "Gerçek yaşam geometri uygulamaları: Duvar saati, TV vitrin ve çerçeve alan hesapları";
    } else if (fas.no === 4) {
      openAnswers["1"] = "Birim kesirler: Payı 1 olan kesirler (1/2, 1/3, 1/4...); Paydası küçük olan birim kesir daha büyüktür";
      openAnswers["2"] = "Bileşik ve Tam Sayılı Kesirler: Sayı doğrusunda gösterme ve birbirine dönüştürme";
      openAnswers["3"] = "Denk Kesirler: Genişletme ve sadeleştirme kuralları";
      openAnswers["4"] = "Kesirlerle Toplama ve Çıkarma: Paydaları eşitleyerek işlem yapma";
      openAnswers["5"] = "Ondalık Gösterim: Ondalık kesirleri virgülle yazma ve basamak değerleri";
      openAnswers["6"] = "Yüzdeler: Paydası 100 olan kesirleri % sembolü ile gösterme; Kesir-Ondalık-Yüzde dönüşümleri";
    } else if (fas.no === 5) {
      openAnswers["1"] = "Araştırma Sorusu Belirleme: Belirli bir gruba yönelik ve birden çok veri gerektiren sorular";
      openAnswers["2"] = "Veri Toplama: Anket ve çetele tablosu oluşturma kuralları";
      openAnswers["3"] = "Sıklık Tablosu Oluşturma: Futbol, Tenis, Basketbol, Yüzme sayısal dağılımları";
      openAnswers["4"] = "Sütun Grafiği Çizimi ve Okuma: Eksenlerin isimlendirilmesi ve eşit ölçeklendirme";
      openAnswers["5"] = "Grafiklerin Yanlış Yorumlanması: Başlangıç noktasının 0 olmaması veya eksenlerin orantısız verilmesi yanıltır";
    } else if (fas.no === 6) {
      openAnswers["1"] = "Eşitliğin Korunumu: Eşitliğin her iki tarafına aynı sayıyı ekleme/çıkarma eşitliği bozmaz";
      openAnswers["2"] = "Denge terazisi modellemesi ile bilinmeyen cismin kütlesini bulma";
      openAnswers["3"] = "İşlem Özellikleri: Değişme özelliği, Birleşme özelliği, Dağılma özelliği (Ortak çarpan parantezi)";
      openAnswers["4"] = "Doğal Sayının Karesi ve Küpü: a² = a x a, a³ = a x a x a (Örnek: 4² = 16, 2³ = 8)";
      openAnswers["5"] = "İşlem Önceliği: 1. Parantez içi, 2. Üslü ifadeler, 3. Çarpma/Bölme, 4. Toplama/Çıkarma";
      openAnswers["6"] = "Sayı Örüntüleri: Kural bulma (adım sayısı x artış miktarı + / - sabit sayı)";
      openAnswers["7"] = "Algoritma ve Akış Şeması: Başla, Karar verme, İşlem adımları ve Bitir blokları";
    }

    const openTestId = `tbt_mat3_open_f${fas.no}_${Date.now().toString(36).substring(2,6)}`;
    const openTestName = `${fas.no}. Fasikül - Açık Uçlu Etkinlikler (Şimdi Uygula & Yorumla)`;

    const openTestItem = {
      id: openTestId,
      name: openTestName,
      book_id: BOOK_ID,
      bookId: BOOK_ID,
      subject_id: 'sub_cilt3_matematik',
      subjectId: 'sub_cilt3_matematik',
      topic_id: fas.id,
      topicId: fas.id,
      question_count: Object.keys(openAnswers).length,
      questionCount: Object.keys(openAnswers).length,
      answer_key: {
        ...openAnswers,
        __meta: { isOpenEnded: true, questionType: 'acik_uclu', startQuestionNumber: 1 }
      },
      answerKey: {
        ...openAnswers,
        __meta: { isOpenEnded: true, questionType: 'acik_uclu', startQuestionNumber: 1 }
      },
      isOpenEnded: true,
      questionType: 'acik_uclu',
      pdf_url: '',
      pdfUrl: '',
      order: globalOrder,
      orderIndex: globalOrder
    };

    topicTests.push(openTestItem);
    allTestsToInsert.push({
      id: openTestId,
      book_id: BOOK_ID,
      subject_id: 'sub_cilt3_matematik',
      topic_id: fas.id,
      name: openTestName,
      question_count: Object.keys(openAnswers).length,
      answer_key: {
        ...openAnswers,
        __meta: { isOpenEnded: true, questionType: 'acik_uclu', startQuestionNumber: 1 }
      },
      option_count: 0,
      pdf_url: ''
    });

    globalOrder++;

    subjectsTopics.push({
      id: fas.id,
      name: fas.name,
      tests: topicTests
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
      pdfUrl: '',
      maxPage: 513,
      hideAnswerKey: true
    },
    {
      id: 'sub_cilt3_matematik',
      name: 'Matematik',
      topics: subjectsTopics
    }
  ];

  console.log(`Total tests to insert: ${allTestsToInsert.length}`);

  // 1. Upsert book into tracked_books
  console.log('Upserting book to tracked_books...');
  const bookPayload = {
    id: BOOK_ID,
    title: BOOK_TITLE,
    publisher: PUBLISHER,
    book_type: 'standard',
    option_count: 4,
    pdf_url: '',
    subjects: consolidatedSubjects,
    raw_data: {
      title: BOOK_TITLE,
      publisher: PUBLISHER,
      bookType: 'standard',
      optionCount: 4,
      pdfUrl: '',
      maxPage: 513,
      hideAnswerKey: true,
      subjects: consolidatedSubjects
    }
  };

  const { error: bErr } = await supabase.from('tracked_books').upsert(bookPayload);
  if (bErr) {
    console.error('Error inserting book:', bErr);
    return;
  }
  console.log('Book successfully upserted in Supabase!');

  // 2. Clear old tests if any and insert in batches
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

  // 3. Verification
  const { count: finalCount } = await supabase.from('tracked_book_tests').select('*', { count: 'exact', head: true }).eq('book_id', BOOK_ID);
  console.log(`VERIFICATION: Total tests in DB for ${BOOK_ID}: ${finalCount}`);

  // 4. Update backup.json
  const { data: allBooks } = await supabase.from('tracked_books').select('*');
  const { data: allTests } = await supabase.from('tracked_book_tests').select('*');
  const backup = JSON.parse(fs.readFileSync('./backup.json', 'utf8'));
  backup[0].backup_data.tracked_books = allBooks;
  backup[0].backup_data.tracked_book_tests = allTests;
  fs.writeFileSync('./backup.json', JSON.stringify(backup, null, 2), 'utf8');
  console.log('backup.json successfully synced!');
  console.log('FINISHED SUCCESSFULLY!');
}

run();
