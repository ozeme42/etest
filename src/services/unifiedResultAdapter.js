import { toUUID } from './supabaseService';
import { getTurkeyYMD, extractItemDate } from '../utils/dateHelpers';
import { isExamBook, isStandardOrMixedBook } from '../utils/testResolver';

/**
 * 🛡️ UNIFIED RESULT ADAPTER (Single Source of Truth)
 * 
 * Standartlaştırılmış Çözüm ve Test Modeli:
 * Veri nereden gelirse gelsin (submissions tablosu, homeworks altındaki ödev testleri,
 * serbest kitap testleri veya deneme sınavları) tek bir standart modele dönüştürülür.
 */

let cachedDeletedIds = null;
let lastDeletedFetch = 0;

export function getCachedDeletedIds() {
  const now = Date.now();
  if (cachedDeletedIds && now - lastDeletedFetch < 3000) {
    return cachedDeletedIds;
  }
  cachedDeletedIds = new Set();
  const keys = [
    'eTestDeletedSubmissions',
    'eTestDeletedRecords',
    'deletedHomeworks',
    'deletedExams',
    'deletedSubmissions'
  ];
  keys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) parsed.forEach(id => id && cachedDeletedIds.add(String(id)));
      }
    } catch {}
  });
  lastDeletedFetch = now;
  return cachedDeletedIds;
}

export function isDeletedItem(s) {
  if (!s) return true;
  const deletedIds = getCachedDeletedIds();
  if (deletedIds.size === 0) return false;

  const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a?.type === 'metadata') : (s.metadata || {});
  const candidates = [
    s.id,
    s.submissionId,
    s.supabaseId,
    s.originalSubmissionId,
    s.testId,
    s.test_id,
    s.hwId,
    s.homework_id,
    meta?.realId,
    meta?.submissionId,
    meta?.hwId,
    meta?.realTestId
  ];
  return candidates.some(c => {
    if (!c) return false;
    const strC = String(c);
    return deletedIds.has(strC) || (toUUID(strC) && deletedIds.has(String(toUUID(strC))));
  });
}

export function purgeTestCache(testId, studentId) {
  if (!testId) return;
  const tStr = String(testId);
  const tClean = tStr.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
  const sStr = studentId ? String(studentId) : '';

  try {
    // ⚠️ purgeTestCache sadece taslak yanıtları ve sayaçları temizler, testId'yi kalıcı silinmiş listesine eklemez!

    const patterns = [
      `draft_tracked_book_test_${tStr}_${sStr}`,
      `draft_tracked_book_test_${tClean}_${sStr}`,
      `draft_tracked_book_test_${tStr}`,
      `draft_tracked_book_test_${tClean}`,
      `draft_tracked_book_flagged_${tStr}_${sStr}`,
      `draft_tracked_book_flagged_${tClean}_${sStr}`,
      `draft_tracked_book_flagged_${tStr}`,
      `draft_tracked_book_flagged_${tClean}`,
      `mistake_reasons_${tStr}_${sStr}`,
      `mistake_reasons_${tClean}_${sStr}`,
      `mistake_reasons_bt_${tStr}_${sStr}`,
      `mistake_reasons_bt_${tClean}_${sStr}`,
      `mistake_reasons_${tStr}`,
      `mistake_reasons_${tClean}`,
      `sub_latest_${tStr}`,
      `sub_latest_${tClean}`,
      `quiz_answers_${tStr}`,
      `quiz_answers_${tClean}`,
      `quiz_draft_${tStr}`,
      `quiz_draft_${tClean}`,
      `draft_quiz_${tStr}_ans`,
      `draft_quiz_${tClean}_ans`,
      `draft_quiz_${tStr}_txt`,
      `draft_quiz_${tClean}_txt`,
      `draft_quiz_${tStr}_time`,
      `draft_quiz_${tClean}_time`
    ];

    patterns.forEach(k => {
      try {
        localStorage.removeItem(k);
        localStorage.removeItem(`${k}_time`);
      } catch {}
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('test-cache-purged', { detail: { testId: tStr, studentId: sStr } }));
    }
  } catch (e) {
    console.error('purgeTestCache error:', e);
  }
}

/**
 * Helper: Answer letter to 0-based index and vice-versa
 */
export function normalizeLetter(val) {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).trim().toUpperCase();
  if (['A', 'B', 'C', 'D', 'E'].includes(str)) return str;
  if (!isNaN(str) && Number(str) >= 0 && Number(str) <= 4) {
    return String.fromCharCode(65 + Number(str));
  }
  return null;
}

export function normalizeIndex(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const str = String(val).trim().toUpperCase();
  if (['A', 'B', 'C', 'D', 'E'].includes(str)) {
    return str.charCodeAt(0) - 65;
  }
  const num = parseInt(str, 10);
  return !isNaN(num) && num >= 0 && num <= 4 ? num : null;
}

export function getSubjectKey(s) {
  if (!s) return 'Genel Testler';
  const rawKey = typeof s === 'string' ? s : (s.subjectKey || s.subjectName || s.subject || '');
  const rawTitle = typeof s === 'string' ? '' : (s.fullTitle || s.testTitle || s.testName || s.title || '');
  const t = (rawTitle + ' ' + rawKey).toLowerCase();

  if (t.includes('matematik') || t.includes('mat')) return 'Matematik';
  if (t.includes('fen')) return 'Fen Bilimleri';
  if (t.includes('türkçe') || t.includes('turkce') || t.includes('türk')) return 'Türkçe';
  if (t.includes('sosyal') || t.includes('inkılap') || t.includes('tarih')) return 'Sosyal Bilgiler';
  if (t.includes('ingilizce') || t.includes('english') || t.includes('ing')) return 'İngilizce';
  if (t.includes('din') || t.includes('ahlak')) return 'Din Kültürü';
  if (t.includes('deneme') || t.includes('genel')) return 'Genel Testler';

  if (rawKey && !rawKey.toLowerCase().includes('kitap') && rawKey !== 'Diğer') {
    return rawKey;
  }
  return 'Genel Testler';
}

/**
 * Helper: Normalizes any answer key format to a clean standard map { 1: 'A', 2: 'B', ... }
 */
export function normalizeAnswerKey(rawKey) {
  if (!rawKey) return {};
  const map = {};

  if (Array.isArray(rawKey)) {
    rawKey.forEach((k, idx) => {
      const qNo = idx + 1;
      const letter = normalizeLetter(k?.correctAnswer ?? k?.answer ?? k);
      if (letter) map[qNo] = letter;
    });
    return map;
  }

  if (typeof rawKey === 'object') {
    Object.entries(rawKey).forEach(([k, v]) => {
      const qNo = parseInt(k, 10);
      if (!isNaN(qNo)) {
        const letter = normalizeLetter(v?.correctAnswer ?? v?.answer ?? v);
        if (letter) map[qNo] = letter;
      }
    });
    return map;
  }

  return map;
}

/**
 * Helper: Normalizes student answers from any format (studentAnswers object or answers array)
 */
export function normalizeStudentAnswers(rawSub) {
  if (!rawSub) return {};
  if (typeof rawSub === 'object' && !Array.isArray(rawSub) && !rawSub.answers && !rawSub.studentAnswers && !rawSub.answersMap && !rawSub.studentAnswersMap && !rawSub.raw_data?.studentAnswers) {
    const directMap = {};
    Object.entries(rawSub).forEach(([k, v]) => {
      const qNo = parseInt(k, 10);
      if (!isNaN(qNo)) {
        const letter = normalizeLetter(v);
        if (letter) directMap[qNo] = letter;
      }
    });
    if (Object.keys(directMap).length > 0) return directMap;
  }
  const map = {};

  const raw = (rawSub && typeof rawSub === 'object') ? (rawSub.raw_data || rawSub.raw || {}) : {};
  const meta = (rawSub && Array.isArray(rawSub.answers)) ? (rawSub.answers.find(a => a?.type === 'metadata') || {}) : (rawSub.metadata || {});

  // 1. Check studentAnswers dictionary { "1": "A", "2": "C" }
  const rawMap = rawSub.studentAnswersMap || rawSub.studentAnswers || rawSub.student_answers || rawSub.answersMap ||
                 raw.studentAnswersMap || raw.studentAnswers || raw.student_answers || raw.answersMap ||
                 meta.studentAnswers || meta.studentAnswersMap;

  if (rawMap && typeof rawMap === 'object' && !Array.isArray(rawMap)) {
    Object.entries(rawMap).forEach(([k, v]) => {
      const qNo = parseInt(k, 10);
      if (!isNaN(qNo)) {
        const letter = normalizeLetter(v);
        if (letter) map[qNo] = letter;
      }
    });
    if (Object.keys(map).length > 0) return map;
  }

  // 2. Check answers array [ { questionNo: 1, userAnswer: "A" } ] or primitive array
  const rawAnswers = Array.isArray(rawSub) ? rawSub : (
    Array.isArray(rawSub.answers) ? rawSub.answers : (
      Array.isArray(rawSub.questions) ? rawSub.questions : (
        Array.isArray(raw.answers) ? raw.answers : (
          Array.isArray(raw.questions) ? raw.questions : []
        )
      )
    )
  );

  if (Array.isArray(rawAnswers) && rawAnswers.length > 0) {
    rawAnswers.forEach((a, idx) => {
      if (a === null || a === undefined) return;
      if (typeof a === 'object' && a.type === 'metadata') return;
      const qNo = (typeof a === 'object') ? (a.questionNo || a.questionNoInSection || a.questionIndex || (idx + 1)) : (idx + 1);
      const rawAns = (typeof a === 'object') ? (a.userAnswer ?? a.selectedOption ?? a.userAnswerLetter ?? a.answerLetter ?? a.answer ?? a.userAnswerText) : a;
      const letter = normalizeLetter(rawAns);
      if (letter) map[qNo] = letter;
    });
    if (Object.keys(map).length > 0) return map;
  }

  // 3. Fallback: Check local storage drafts for this test & student
  const testId = String(rawSub.testId || rawSub.bookTestId || rawSub.realTestId || rawSub.id || '');
  const cleanTId = testId.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
  const studentId = String(rawSub.studentId || rawSub.userId || rawSub.student_id || '');
  
  if (testId && typeof localStorage !== 'undefined') {
    const keys = [
      `draft_tracked_book_test_${testId}_${studentId}`,
      `draft_tracked_book_test_${cleanTId}_${studentId}`,
      `draft_tracked_book_test_${testId}`,
      `draft_tracked_book_test_${cleanTId}`,
      `quiz_answers_${testId}`,
      `quiz_answers_${cleanTId}`,
      `sub_latest_${testId}`,
      `sub_latest_${cleanTId}`
    ];
    for (const k of keys) {
      try {
        const stored = localStorage.getItem(k);
        if (stored) {
          const parsed = JSON.parse(stored);
          const candidateMap = parsed?.studentAnswers || parsed?.answers || (typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null);
          if (candidateMap && typeof candidateMap === 'object') {
            Object.entries(candidateMap).forEach(([qk, qv]) => {
              const qNo = parseInt(qk, 10);
              if (!isNaN(qNo)) {
                const letter = normalizeLetter(typeof qv === 'object' ? qv?.userAnswer : qv);
                if (letter) map[qNo] = letter;
              }
            });
            if (Object.keys(map).length > 0) return map;
          }
        }
      } catch (e) {}
    }
  }

  return map;
}

/**
 * Core: Standardizes any test submission into a full UnifiedSubmission
 */
export function normalizeUnifiedSubmission(rawSub, { books = [], bookTests = [], homeworks = [] } = {}) {
  if (!rawSub) return null;

  const raw = rawSub.raw_data || {};
  const meta = (Array.isArray(rawSub.answers) ? rawSub.answers.find(a => a?.type === 'metadata') : null) || rawSub.metadata || {};

  // 1. Identify Test & Book
  const testIdCandidate = String(
    rawSub.testId || rawSub.realTestId || rawSub.bookTestId ||
    meta.realTestId || meta.bookTestId || meta.testId ||
    raw.testId || raw.realTestId || rawSub.id || ''
  );
  const cleanCandidate = testIdCandidate.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');

  let matchedBookTest = (bookTests || []).find(bt => {
    const btIdStr = String(bt.id);
    const cleanBtId = btIdStr.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
    return btIdStr === testIdCandidate ||
      toUUID(btIdStr) === testIdCandidate ||
      (cleanBtId.length >= 3 && cleanBtId === cleanCandidate) ||
      (btIdStr.length >= 6 && testIdCandidate.includes(btIdStr));
  });

  const matchedHw = (homeworks || []).find(h =>
    String(h.id) === String(rawSub.hwId || rawSub.homeworkId || raw.hwId || raw.homeworkId) ||
    String(h.id) === testIdCandidate
  );

  const bookId = String(
    matchedBookTest?.book_id || matchedBookTest?.bookId ||
    rawSub.bookId || raw.bookId || matchedHw?.bookId || ''
  );

  let matchedBook = (books || []).find(b =>
    String(b.id) === bookId ||
    toUUID(b.id) === bookId ||
    (matchedHw?.title && b.title && matchedHw.title.toLowerCase().includes(b.title.toLowerCase())) ||
    (testIdCandidate && b.id && testIdCandidate.includes(String(b.id)))
  );

  if (!matchedBook && (rawSub.type === 'book' || rawSub.typeKey === 'book' || rawSub.sourceType === 'trackedBook' || testIdCandidate.startsWith('tbt_') || testIdCandidate.startsWith('bt_'))) {
    matchedBook = (books || []).find(b => isStandardOrMixedBook(b)) || null;
  }

  let matchedSubject = (matchedBook?.subjects || []).find(s =>
    String(s.id) === String(matchedBookTest?.subject_id || matchedBookTest?.subjectId)
  ) || (books || []).flatMap(b => b.subjects || []).find(s =>
    String(s.id) === String(matchedBookTest?.subject_id || matchedBookTest?.subjectId)
  );

  if (!matchedSubject && matchedBook) {
    const subjMatch = testIdCandidate.match(/subj_(\d+)/);
    if (subjMatch && matchedBook.subjects && matchedBook.subjects[parseInt(subjMatch[1], 10)]) {
      matchedSubject = matchedBook.subjects[parseInt(subjMatch[1], 10)];
    } else if (matchedBook.subjects && matchedBook.subjects.length > 0) {
      matchedSubject = matchedBook.subjects[0];
    }
  }

  let matchedTopic = (matchedSubject?.topics || []).find(t =>
    String(t.id) === String(matchedBookTest?.topic_id || matchedBookTest?.topicId)
  );

  if (!matchedTopic && matchedSubject) {
    const topMatch = testIdCandidate.match(/top_subj_\d+_(\d+)/) || testIdCandidate.match(/top_\w+_(\d+)/);
    if (topMatch && matchedSubject.topics && matchedSubject.topics[parseInt(topMatch[1], 10) - 1]) {
      matchedTopic = matchedSubject.topics[parseInt(topMatch[1], 10) - 1];
    } else if (matchedSubject.topics && matchedSubject.topics.length > 0) {
      matchedTopic = matchedSubject.topics[0];
    }
  }

  // Deep search in books tree if not found
  if (books && Array.isArray(books)) {
    for (const b of books) {
      if (!b.subjects || !Array.isArray(b.subjects)) continue;
      for (const s of b.subjects) {
        if (s.tests && Array.isArray(s.tests)) {
          const ft = s.tests.find(t => {
            const tIdStr = String(t.id);
            const cleanTId = tIdStr.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
            return tIdStr === testIdCandidate || (cleanTId.length >= 3 && cleanTId === cleanCandidate) || (tIdStr.length >= 6 && testIdCandidate.includes(tIdStr));
          });
          if (ft) {
            if (!matchedBookTest) matchedBookTest = { ...ft, bookId: b.id, subjectId: s.id };
            if (!matchedBook) matchedBook = b;
            if (!matchedSubject) matchedSubject = s;
            break;
          }
        }
        if (s.topics && Array.isArray(s.topics)) {
          for (const tp of s.topics) {
            if (tp.tests && Array.isArray(tp.tests)) {
              const ft = tp.tests.find(t => {
                const tIdStr = String(t.id);
                const cleanTId = tIdStr.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
                return tIdStr === testIdCandidate || (cleanTId.length >= 3 && cleanTId === cleanCandidate) || (tIdStr.length >= 6 && testIdCandidate.includes(tIdStr));
              });
              if (ft) {
                if (!matchedBookTest) matchedBookTest = { ...ft, bookId: b.id, subjectId: s.id, topicId: tp.id };
                if (!matchedBook) matchedBook = b;
                if (!matchedSubject) matchedSubject = s;
                if (!matchedTopic) matchedTopic = tp;
                break;
              }
            }
          }
        }
      }
      if (matchedBookTest) break;
    }
  }

  let rawBookTitle = matchedBook?.title || rawSub.bookTitle || meta.bookTitle || matchedHw?.bookTitle || '';
  if (!rawBookTitle && rawSub.title && rawSub.title.includes('—')) {
    rawBookTitle = rawSub.title.split('—')[0].trim();
  }
  const cleanBookTitle = (rawBookTitle || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();

  // Fast extraction if still not found
  if (!matchedBookTest && books && Array.isArray(books)) {
    const rawSubTitle = String(rawSub.testTitle || rawSub.title || meta.testTitle || meta.testName || matchedHw?.title || cleanBookTitle || '').trim();
    const candMatch = testIdCandidate.match(/_(\d+)$/);
    const i = candMatch ? parseInt(candMatch[1], 10) : 1;
    const isExamHint = Boolean(
      rawSub.type === 'physicalExam' || rawSub.typeKey === 'physicalExam' || rawSub.isPhysicalExam ||
      rawSub.isExam || matchedHw?.type === 'physicalExam' || matchedBook?.bookType === 'exam' ||
      /deneme|sınav/i.test(String(rawSubTitle || matchedHw?.title || cleanBookTitle || ''))
    );
    const fallbackTestName = isExamHint ? (rawSubTitle || matchedHw?.title || cleanBookTitle || 'Deneme Sınavı') : 'Test-1';
    const genName = (!isNaN(i) && i >= 1 && !isExamHint) ? (i <= 12 ? `Test-${i}` : (i <= 16 ? `Yeni Nesil ${i - 12}` : `Ü. Değ. ${i - 16}`)) : fallbackTestName;
    matchedBookTest = {
      id: testIdCandidate,
      name: rawSubTitle || genName,
      subjectName: rawSub.subject || (isExamHint ? 'Genel' : 'Genel')
    };
  }

  // Gather all identifier strings for deep parsing
  const allIdAndTitleStrings = [
    testIdCandidate,
    rawSub.testId,
    rawSub.realTestId,
    rawSub.bookTestId,
    meta.realTestId,
    meta.bookTestId,
    meta.unitTopic,
    meta.topicName,
    rawSub.testTitle,
    rawSub.title,
    rawSub.unitTopic
  ].filter(Boolean).join(' ');

  // 1. Resolve exact subject name
  const validCurriculumSubjects = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü', 'T.C. İnkılap Tarihi'];
  let subjectName = matchedSubject?.name;

  if (!subjectName || !validCurriculumSubjects.includes(subjectName)) {
    const subjIndexMatch = allIdAndTitleStrings.match(/subj_(\d+)/i);
    if (subjIndexMatch && matchedBook?.subjects && matchedBook.subjects.length > 0) {
      const sIdx = parseInt(subjIndexMatch[1], 10);
      if (!isNaN(sIdx) && matchedBook.subjects[sIdx]) {
        subjectName = matchedBook.subjects[sIdx].name;
      }
    }
  }

  if (!subjectName || !validCurriculumSubjects.includes(subjectName)) {
    if (matchedBook?.subject && validCurriculumSubjects.includes(matchedBook.subject)) {
      subjectName = matchedBook.subject;
    } else if (matchedBook?.subjects && matchedBook.subjects.length > 0 && validCurriculumSubjects.includes(matchedBook.subjects[0]?.name)) {
      subjectName = matchedBook.subjects[0].name;
    } else if (rawSub.subject && validCurriculumSubjects.includes(rawSub.subject)) {
      subjectName = rawSub.subject;
    } else if (matchedHw?.subject && validCurriculumSubjects.includes(matchedHw.subject)) {
      subjectName = matchedHw.subject;
    } else {
      subjectName = 'Türkçe';
    }
  }

  if (!subjectName || !validCurriculumSubjects.includes(subjectName)) {
    const subjIndexMatch = allIdAndTitleStrings.match(/subj_(\d+)/i);
    if (subjIndexMatch && matchedBook?.subjects && matchedBook.subjects.length > 0) {
      const sIdx = parseInt(subjIndexMatch[1], 10);
      if (!isNaN(sIdx) && matchedBook.subjects[sIdx]) {
        subjectName = matchedBook.subjects[sIdx].name;
      }
    }
  }

  if (!subjectName || !validCurriculumSubjects.includes(subjectName)) {
    if (matchedBook?.subject && validCurriculumSubjects.includes(matchedBook.subject)) {
      subjectName = matchedBook.subject;
    } else if (matchedBook?.subjects && matchedBook.subjects.length > 0 && validCurriculumSubjects.includes(matchedBook.subjects[0]?.name)) {
      subjectName = matchedBook.subjects[0].name;
    } else if (rawSub.subject && validCurriculumSubjects.includes(rawSub.subject)) {
      subjectName = rawSub.subject;
    } else if (matchedHw?.subject && validCurriculumSubjects.includes(matchedHw.subject)) {
      subjectName = matchedHw.subject;
    } else {
      subjectName = 'Türkçe';
    }
  }

  // Detect if this item is an Exam / Deneme
  const isDirectExam = Boolean(
    rawSub.type === 'physicalExam' || rawSub.typeKey === 'physicalExam' || rawSub.isPhysicalExam ||
    raw.type === 'physicalExam' || raw.typeKey === 'physicalExam' || raw.isPhysicalExam ||
    rawSub.isExam || raw.isExam ||
    matchedHw?.type === 'physicalExam' || matchedHw?.contentType === 'physicalExam' || matchedHw?.isPhysical === true ||
    (matchedHw && isExamBook(matchedHw)) ||
    (matchedBook && isExamBook(matchedBook)) ||
    matchedBook?.bookType === 'exam' ||
    String(rawSub.id || '').startsWith('me_') || String(testIdCandidate).startsWith('me_') ||
    String(rawSub.hwId || '').startsWith('me_') ||
    /deneme|sınav|hazır bulunuşluk|hazir bulunusluk|lgs|tyt|ayt|kpss|yks/i.test(
      String(rawSub.title || rawSub.testTitle || meta.testTitle || meta.testName || matchedHw?.title || cleanBookTitle || matchedBook?.title || '')
    )
  );

  // 2. Resolve exact unit name (1. Ünite, 2. Ünite, 3. Ünite, 4. Ünite, 5. Ünite...)
  // IMPORTANT: Deneme / Sınav NEVER has a unit!
  let topicName = null;
  if (!isDirectExam) {
    topicName = matchedTopic?.name || meta.topicName || meta.unitTopic || rawSub.topic || rawSub.unitTopic || matchedBookTest?.topicName || null;
    if (!topicName || topicName === 'Genel Konu' || topicName === '1. Ünite') {
      const unitMatch = allIdAndTitleStrings.match(/top_subj_\d+_(\d+)/i) ||
                        allIdAndTitleStrings.match(/top_\w+_(\d+)/i) ||
                        allIdAndTitleStrings.match(/(\d+)\.\s*Ünite/i);
      if (unitMatch) {
        topicName = `${unitMatch[1]}. Ünite`;
      } else {
        topicName = null; // NEVER default to fake '1. Ünite'!
      }
    }
  }

  // 3. Resolve clean test name (Test-1, Test-8, Yeni Nesil 6, 9-10. Sayfa 1. Ünite - PARAGRAF TEST - 1...)
  let testName = matchedBookTest?.name;
  if (isDirectExam) {
    const examCandidate = cleanBookTitle || matchedHw?.title || rawSub.testTitle || rawSub.title || meta.testTitle || '';
    if (examCandidate && /deneme|sınav/i.test(examCandidate)) {
      testName = examCandidate;
    }
  }

  if (!testName || testName === 'Test') {
    const rawT = rawSub.testName || rawSub.testTitle || rawSub.title || meta.testTitle || meta.testName || '';
    if (rawT.includes('—')) {
      const cleanT = rawT.split('—').pop().trim();
      const parenMatch = cleanT.match(/\((.*?)\)/);
      if (parenMatch) testName = parenMatch[1].trim();
      else if (cleanT) testName = cleanT;
    } else if (rawT) {
      testName = rawT;
    }

    if (!testName || testName === 'Test') {
      const candidates = [
        rawSub.testName,
        rawSub.name,
        meta.testName,
        rawSub.testTitle,
        rawSub.title,
        meta.testTitle
      ].filter(Boolean);

      for (const c of candidates) {
        const match = String(c).match(/(Test[-\s]?\d+|Yeni Nesil[-\s]?\d+|Ü\.?\s?Değ\.?[-\s]?\d+|Ünite Değerlendirme[-\s]?\d+)/i);
        if (match && !match[0].includes('Tüm Kitap')) {
          testName = match[0].replace(/Ünite Değerlendirme/i, 'Ü. Değ.');
          break;
        }
      }
    }
  }

  if (!testName || testName === 'Test' || testName.includes('(Tüm Kitap Görevi)') || testName.includes('(Tüm Kitap)') || testName === matchedHw?.title) {
    const tIdStr = String(testIdCandidate);
    const match = tIdStr.match(/(Test[-\s]?\d+|Yeni Nesil[-\s]?\d+|Ü\.?\s?Değ\.?[-\s]?\d+)/i);
    if (match) {
      testName = match[0];
    } else {
      const tbtNumMatch = tIdStr.match(/_(\d+)$/);
      if (tbtNumMatch) {
        const testNum = parseInt(tbtNumMatch[1], 10);
        if (!isNaN(testNum) && testNum >= 1 && testNum <= 30) {
          testName = testNum <= 12 ? `Test-${testNum}` : (testNum <= 16 ? `Yeni Nesil ${testNum - 12}` : `Ü. Değ. ${testNum - 16}`);
        } else if (rawSub.testTitle && !rawSub.testTitle.includes('(Tüm Kitap Görevi)') && !rawSub.testTitle.includes('Tüm Kitap')) {
          testName = rawSub.testTitle;
        } else if (rawSub.title && !rawSub.title.includes('(Tüm Kitap Görevi)') && !rawSub.title.includes('Tüm Kitap')) {
          testName = rawSub.title;
        } else {
          testName = rawSub.title || rawSub.testTitle || 'Test';
        }
      } else {
        testName = rawSub.title || rawSub.testTitle || 'Test';
      }
    }
  }

  const fullTitle = isDirectExam
    ? (testName || cleanBookTitle || matchedHw?.title || rawSub.title || 'Deneme Sınavı')
    : (cleanBookTitle
      ? (topicName ? `${cleanBookTitle} — ${subjectName} › ${topicName} (${testName})` : `${cleanBookTitle} — ${subjectName} (${testName})`)
      : (topicName ? `${subjectName} › ${topicName} (${testName})` : (rawSub.title || testName)));

  // 3. Question Count & Answer Key
  const rawAnswerKey = matchedBookTest?.answer_key || matchedBookTest?.answerKey || rawSub.answerKey || rawSub.answer_key || matchedHw?.answerKey || {};
  const answerKey = normalizeAnswerKey(rawAnswerKey);

  const studentAnswersMap = normalizeStudentAnswers(rawSub);

  const expCorrect = rawSub.correctCount ?? rawSub.correct_count ?? rawSub.correct ?? raw.correctCount ?? raw.correct_count;
  const expWrong = rawSub.wrongCount ?? rawSub.wrong_count ?? rawSub.wrong ?? raw.wrongCount ?? raw.wrong_count;
  const expEmpty = rawSub.emptyCount ?? rawSub.empty_count ?? rawSub.blankCount ?? rawSub.blank_count ?? rawSub.empty ?? raw.emptyCount ?? raw.empty_count;
  const derivedQuestionsCount = (Number(expCorrect) || 0) + (Number(expWrong) || 0) + (Number(expEmpty) || 0);

  let totalQuestions = Math.max(
    matchedBookTest?.question_count || matchedBookTest?.questionCount || 0,
    rawSub.totalQuestions || raw.totalQuestions || 0,
    derivedQuestionsCount,
    Object.keys(studentAnswersMap).length,
    Object.keys(answerKey).length,
    Array.isArray(rawSub.answers) ? rawSub.answers.filter(a => a && a.type !== 'metadata').length : 0,
    1
  );

  if (derivedQuestionsCount > 0 && totalQuestions < derivedQuestionsCount) {
    totalQuestions = derivedQuestionsCount;
  }

  // 🛡️ CRITICAL FIX: Prevent artificial blank questions inflating total questions!
  // If the submission explicitly provides correctCount and wrongCount (and optionally blankCount),
  // e.g. 47D + 7Y + 0B = 54, do not let an unpruned template or answer-key length (e.g. 60 or 90)
  // invent fake blank questions that unfairly depress the student's success rate.
  if (expCorrect !== undefined && expCorrect !== null && expWrong !== undefined && expWrong !== null) {
    const numCorr = Number(expCorrect) || 0;
    const numWrg = Number(expWrong) || 0;
    const hasExplicitBlank = expEmpty !== undefined && expEmpty !== null && !isNaN(Number(expEmpty));
    const numEmp = hasExplicitBlank ? Number(expEmpty) : 0;
    const explicitQ = numCorr + numWrg + numEmp;

    if (explicitQ > 0) {
      if (hasExplicitBlank && numEmp === 0) {
        totalQuestions = explicitQ;
      } else if (explicitQ < totalQuestions && (rawSub.type === 'physicalExam' || rawSub.typeKey === 'physicalExam' || rawSub.isPhysicalExam || rawSub.isPhysical)) {
        totalQuestions = explicitQ;
      }
    }
  }

  // 4. Mistake Reasons Map
  const mistakeReasons = rawSub.mistakeReasons || raw.mistakeReasons || {};
  if (Array.isArray(rawSub.answers)) {
    rawSub.answers.forEach(a => {
      const qNo = a.questionNo || a.questionIndex;
      const r = a.reason || a.mistakeReason;
      if (qNo && r && !mistakeReasons[qNo]) {
        mistakeReasons[qNo] = r;
      }
    });
  }

  // 5. Construct Normalized Detailed Answers
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  const detailedAnswers = [];

  const titleLower = String(rawSub.title || rawSub.testTitle || meta.testTitle || meta.testName || matchedHw?.title || cleanBookTitle || '').toLowerCase();
  
  const isExplicitMC = Boolean(
    /\bçok\b|\bcok\b|çoktan|coktan/i.test(titleLower) ||
    rawSub.type === 'multiple_choice' ||
    rawSub.type === 'coktan_secmeli' ||
    rawSub.questionType === 'multiple_choice' ||
    rawSub.questionType === 'coktan_secmeli' ||
    rawSub.contentType === 'multiple_choice' ||
    rawSub.contentType === 'coktan_secmeli' ||
    matchedHw?.type === 'multiple_choice' ||
    matchedHw?.contentType === 'multiple_choice' ||
    (Array.isArray(rawSub.answers) && rawSub.answers.length > 0 && rawSub.answers.every(a => 
      typeof a === 'number' || (typeof a === 'string' && /^[A-E]$/i.test(a)) ||
      (!a.isOpenEnded && !a.is_open_ended && a.type !== 'open_ended' && a.questionType !== 'acik_uclu' &&
      (!a.userAnswerText || String(a.userAnswerText).trim().length === 0))
    ))
  );

  const hasOEKeywords = !isExplicitMC && (
    titleLower.includes('açık uçlu') ||
    titleLower.includes('acik uclu') ||
    titleLower.includes('klasik') ||
    titleLower.includes('yazılı sınav') ||
    titleLower.includes('klasik yazılı') ||
    titleLower.includes('görsel soru') ||
    titleLower.includes('gorsel soru') ||
    /\baç\b|\bac\b/.test(titleLower) ||
    (/\byazılı\b|\byazili\b/.test(titleLower) && !/\bçok\b|\bcok\b/i.test(titleLower))
  );

  const hasWrittenAnswers = !isExplicitMC && Boolean(
    (rawSub.openEndedText && Object.keys(rawSub.openEndedText).length > 0) ||
    rawSub.writtenAnswer ||
    rawSub.writtenAnswers ||
    (Array.isArray(rawSub.answers) && rawSub.answers.some(a => 
      a?.isOpenEnded || a?.is_open_ended || a?.type === 'acik_uclu' || a?.type === 'gorsel_klasik' || a?.type === 'open_ended' ||
      a?.writtenAnswer || (a?.userAnswerText && String(a.userAnswerText).trim() !== '' && String(a.userAnswerText).trim() !== 'empty') ||
      a?.maxScore !== undefined
    ))
  );

  const isSubWritten = !isExplicitMC && Boolean(
    rawSub.isOpenEnded ||
    rawSub.type === 'acik_uclu' ||
    rawSub.type === 'yazili' ||
    rawSub.type === 'gorsel_klasik' ||
    rawSub.questionType === 'acik_uclu' ||
    rawSub.questionType === 'yazili' ||
    rawSub.questionType === 'gorsel_klasik' ||
    rawSub.contentType === 'acik_uclu' ||
    rawSub.contentType === 'yazili' ||
    rawSub.contentType === 'gorsel_klasik' ||
    matchedHw?.isOpenEnded ||
    matchedHw?.type === 'acik_uclu' ||
    matchedHw?.questionType === 'acik_uclu' ||
    hasWrittenAnswers ||
    (hasOEKeywords && (!isDirectExam && rawSub.type !== 'optik_form' && rawSub.type !== 'multiple_choice' && matchedBookTest === null))
  );

  const isEvaluated = Boolean(
    rawSub.isEvaluated === true ||
    rawSub.isEvaluatedByTeacher === true ||
    rawSub.evaluatedByTeacher === true ||
    rawSub.status === 'evaluated' ||
    rawSub.status === 'graded' ||
    Boolean(rawSub.teacherFeedback || rawSub.teacherNote) ||
    Boolean(rawSub.teacherScores && Object.keys(rawSub.teacherScores).length > 0) ||
    Boolean(rawSub.evaluatedAt && (rawSub.teacherFeedback || rawSub.teacherNote || rawSub.isEvaluated || rawSub.status === 'evaluated')) ||
    (Array.isArray(rawSub.answers) && rawSub.answers.some(a => a && (a.evaluatedByTeacher || (a.score !== undefined && a.score !== null && a.score !== 'empty' && a.score !== 'pending' && a.score !== ''))))
  );

  const isPendingEvaluation = isSubWritten && !isEvaluated;

  if (Array.isArray(rawSub.answers) && rawSub.answers.some(a => a?.type !== 'metadata' && (a?.score !== undefined || a?.teacherFeedback || a?.teacherScore !== undefined))) {
    rawSub.answers.filter(a => a?.type !== 'metadata').forEach((a, idx) => {
      const isCorrect = (a.isCorrect === true || Number(a.score || 0) > 0);
      if (isCorrect) correctCount++;
      else if (a.userAnswer && a.userAnswer !== 'empty') wrongCount++;
      else blankCount++;

      detailedAnswers.push({
        questionNo: a.questionNo || (idx + 1),
        score: a.score !== undefined ? a.score : (isCorrect ? 1 : 0),
        maxScore: a.maxScore || 10,
        teacherFeedback: a.teacherFeedback || a.teacherNote || null,
        userAnswer: a.userAnswer,
        userAnswerText: a.userAnswerText || a.studentAnswerText || a.userAnswer,
        correctAnswer: a.correctAnswer,
        isCorrect: a.isCorrect
      });
    });
  } else {
    for (let i = 1; i <= totalQuestions; i++) {
      const userLetter = studentAnswersMap[i] || null;
      const correctLetter = answerKey[i] || null;

      let isCorrect = null;
      if (userLetter && correctLetter) {
        isCorrect = (userLetter === correctLetter);
      } else if (userLetter && !correctLetter) {
        isCorrect = null;
      } else if (!userLetter) {
        isCorrect = null;
      }

      if (isCorrect === true) correctCount++;
      else if (isCorrect === false) wrongCount++;
      else blankCount++;

      detailedAnswers.push({
        questionNo: i,
        userAnswer: userLetter,
        correctAnswer: correctLetter,
        isCorrect
      });
    }
  }

  // 5. Override explicit counts if present
  if (expCorrect !== undefined && expCorrect !== null && !isNaN(Number(expCorrect))) {
    correctCount = Number(expCorrect);
  }
  if (expWrong !== undefined && expWrong !== null && !isNaN(Number(expWrong))) {
    wrongCount = Number(expWrong);
  }
  if (expEmpty !== undefined && expEmpty !== null && !isNaN(Number(expEmpty))) {
    blankCount = Number(expEmpty);
  } else if (totalQuestions > 0 && (correctCount > 0 || wrongCount > 0)) {
    if (blankCount === 0 && (correctCount + wrongCount) < totalQuestions) {
      blankCount = (expEmpty !== undefined && expEmpty !== null && !isNaN(Number(expEmpty)))
        ? Number(expEmpty)
        : Math.max(0, totalQuestions - correctCount - wrongCount);
    }
    if (expEmpty !== undefined && expEmpty !== null && Number(expEmpty) === 0) {
      blankCount = 0;
    }
  }

  // If student marked answers were not recorded letter-by-letter, align detailedAnswers with explicit correct/wrong counts
  if (Object.keys(studentAnswersMap).length === 0 && (correctCount > 0 || wrongCount > 0)) {
    detailedAnswers.forEach((ans, idx) => {
      if (idx < correctCount) {
        ans.isCorrect = true;
        if (!ans.userAnswer && ans.correctAnswer) ans.userAnswer = ans.correctAnswer;
      } else if (idx < correctCount + wrongCount) {
        ans.isCorrect = false;
      } else {
        ans.isCorrect = null;
      }
    });
  }

  // 6. Score & Net Calculation
  const expScorePct = rawSub.scorePercentage ?? rawSub.score_percentage ?? rawSub.pct ?? raw.scorePercentage;
  let scorePercentage = null;
  if (!isPendingEvaluation) {
    if (totalQuestions > 0 && correctCount >= 0) {
      scorePercentage = Math.min(100, Math.max(0, Math.round((correctCount / totalQuestions) * 100)));
    } else if (expScorePct !== undefined && expScorePct !== null && !isNaN(Number(expScorePct))) {
      scorePercentage = Math.min(100, Math.max(0, Math.round(Number(expScorePct))));
    } else if (rawSub.score !== undefined && rawSub.score !== null && !isNaN(Number(rawSub.score)) && Number(rawSub.score) > 10) {
      scorePercentage = Math.min(100, Math.max(0, Math.round(Number(rawSub.score))));
    }
  }

  const expNet = rawSub.totalNet ?? rawSub.total_net ?? rawSub.net ?? raw.totalNet;
  const netScore = isPendingEvaluation
    ? null
    : ((expNet !== undefined && expNet !== null && !isNaN(Number(expNet)))
        ? Number(Number(expNet).toFixed(2))
        : Number((correctCount - (wrongCount / 4)).toFixed(2)));

  // 7. Date Resolution
  const dateVal = extractItemDate(rawSub);
  const [y, m, d] = dateVal.split('-').map(Number);
  const resolvedSubmittedAt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();

  // 8. Unique Clean ID & Subject/Type Keys
  const studentId = String(rawSub.studentId ?? rawSub.userId ?? rawSub.student_id ?? '');
  const realTestId = matchedBookTest?.id || testIdCandidate;
  const uniqueId = String(rawSub.id || rawSub.submissionId || `${rawSub.hwId || 'sub'}_${studentId}_${realTestId}`);

  const isPhysicalExam = Boolean(
    rawSub.type === 'physicalExam' || rawSub.typeKey === 'physicalExam' || rawSub.isPhysicalExam ||
    raw.type === 'physicalExam' || raw.typeKey === 'physicalExam' || raw.isPhysicalExam ||
    rawSub.isExam || raw.isExam ||
    matchedHw?.type === 'physicalExam' || matchedHw?.contentType === 'physicalExam' || matchedHw?.isPhysical === true ||
    (matchedHw && isExamBook(matchedHw)) ||
    (matchedBook && isExamBook(matchedBook)) ||
    matchedBook?.bookType === 'exam' ||
    String(rawSub.id || '').startsWith('me_') || String(testIdCandidate).startsWith('me_') ||
    String(rawSub.hwId || '').startsWith('me_')
  );

  const isBookTest = !isPhysicalExam && Boolean(
    matchedBook ||
    matchedBookTest ||
    rawSub.bookId ||
    rawSub.bookTestId ||
    rawSub.sourceType === 'trackedBook' ||
    rawSub.sourceType === 'book' ||
    rawSub.typeKey === 'book' ||
    cleanBookTitle ||
    String(realTestId).startsWith('tbt_') ||
    String(realTestId).startsWith('tb_')
  );

  const typeKey = isPhysicalExam
    ? 'physicalExam'
    : (isBookTest ? 'book' : (matchedHw ? 'homework' : 'individual'));

  const sourceType = isPhysicalExam
    ? 'physicalExam'
    : (isBookTest ? 'book' : (matchedHw ? 'homework' : 'submission'));

  const calculatedSubjectKey = getSubjectKey({ fullTitle, subjectName });

  let subjectStats = rawSub.subjectStats || rawSub.metadata?.subjectStats;
  if (!subjectStats && matchedHw?.submissions) {
    const hwSub = matchedHw.submissions.find(s => {
      const sSid = String(s.studentId || s.student_id || '');
      return sSid === String(studentId) || (toUUID(sSid) && toUUID(sSid) === String(studentId));
    });
    if (hwSub?.subjectStats) {
      subjectStats = hwSub.subjectStats;
    }
  }

  // Extract per-subject breakdown for multi-subject or single-subject tests
  const scores = {};
  if (rawSub.scores && typeof rawSub.scores === 'object') {
    Object.entries(rawSub.scores).forEach(([k, v]) => {
      const d = Number(v.d ?? v.correct ?? 0);
      const y = Number(v.y ?? v.wrong ?? 0);
      const b = Number(v.b ?? v.empty ?? v.blank ?? 0);
      const net = v.net !== undefined ? Number(v.net) : parseFloat((d - y / 4).toFixed(2));
      scores[k] = { d, y, b, correct: d, wrong: y, empty: b, blank: b, net };
    });
  } else if (subjectStats) {
    const rawList = Array.isArray(subjectStats) ? subjectStats : (Array.isArray(subjectStats.subjectStats) ? subjectStats.subjectStats : Object.values(subjectStats));
    rawList.forEach(item => {
      if (item && item.name) {
        const d = Number(item.correct ?? item.d ?? 0);
        const y = Number(item.wrong ?? item.y ?? 0);
        const b = Number(item.blank ?? item.b ?? item.empty ?? 0);
        const net = item.net !== undefined ? Number(item.net) : parseFloat((d - y / 4).toFixed(2));
        scores[item.name] = { d, y, b, correct: d, wrong: y, empty: b, blank: b, net, totalQ: item.count || (d + y + b) };
      }
    });
  }

  // If no multi-subject breakdown, use the primary subject of the test
  if (Object.keys(scores).length === 0 && subjectName && subjectName !== 'Genel') {
    scores[subjectName] = {
      d: correctCount,
      y: wrongCount,
      b: blankCount,
      correct: correctCount,
      wrong: wrongCount,
      empty: blankCount,
      blank: blankCount,
      net: netScore
    };
  }

  const isMultiSubjectExam = isDirectExam || Object.keys(scores).length > 1 || (isPhysicalExam && (matchedHw?.title || cleanBookTitle));
  const finalDisplayTitle = isMultiSubjectExam ? (matchedHw?.title || cleanBookTitle || rawSub.testTitle || rawSub.title || testName) : fullTitle;
  const finalSubjectName = (isMultiSubjectExam || rawSub.subject === 'Genel') ? 'Genel' : subjectName;

  return {
    id: uniqueId,
    submissionId: uniqueId,
    scores,
    supabaseId: rawSub.supabaseId || (toUUID(rawSub.id) ? rawSub.id : null),
    sourceType: matchedHw ? 'homework' : (matchedBook ? 'book' : 'submission'),
    typeKey: isDirectExam ? 'physicalExam' : typeKey,
    isPhysicalExam: isDirectExam || isPhysicalExam,
    isExam: isDirectExam || isPhysicalExam,
    
    testId: realTestId,
    bookTestId: realTestId,
    realTestId,
    testName: isMultiSubjectExam ? finalDisplayTitle : testName,
    testTitle: finalDisplayTitle,
    title: isMultiSubjectExam ? finalDisplayTitle : (testName || finalDisplayTitle),
    fullTitle: finalDisplayTitle,
    bookId: bookId || null,
    bookTitle: cleanBookTitle,
    subjectId: isMultiSubjectExam ? null : (matchedSubject?.id || null),
    subjectName: finalSubjectName,
    subject: finalSubjectName,
    subjectKey: calculatedSubjectKey,
    topicId: isMultiSubjectExam ? null : (matchedTopic?.id || null),
    topicName: isMultiSubjectExam ? null : topicName,
    unitTopic: isMultiSubjectExam ? null : topicName,
    
    studentId,
    date: dateVal,
    submittedAt: resolvedSubmittedAt || dateVal,
    
    totalQuestions,
    correctCount,
    wrongCount,
    blankCount,
    emptyCount: blankCount,
    scorePercentage,
    score: scorePercentage,
    computedScore: scorePercentage,
    pct: scorePercentage,
    netScore,
    totalNet: netScore,
    net: netScore,
    
    answerKey,
    studentAnswersMap,
    answers: detailedAnswers,
    mistakeReasons,
    
    isOpenEnded: isSubWritten,
    isEvaluated,
    isEvaluatedByTeacher: isEvaluated,
    isPendingEvaluation,
    type: isSubWritten ? 'acik_uclu' : (rawSub.type || (matchedBookTest ? 'optik_form' : 'coktan_secmeli')),
    questionType: isSubWritten ? 'acik_uclu' : (rawSub.questionType || (matchedBookTest ? 'optik_form' : 'coktan_secmeli')),
    sourceFormat: isSubWritten ? 'yazili' : (matchedBookTest ? 'physical' : 'digital'),
    openEndedText: rawSub.openEndedText || rawSub.openEndedAnswers || null,
    questionsList: rawSub.questionsList || rawSub.questions || [],
    teacherFeedback: rawSub.teacherFeedback || rawSub.teacherNote || '',
    status: isEvaluated ? 'evaluated' : (rawSub.status || 'completed'),

    raw: rawSub
  };
}

  /**
   * Returns all unified submissions for a student across all sources, deduplicated and sorted by date.
   */
  export function getAllUnifiedStudentSubmissions({
    studentId,
    targetStudent = null,
    submissions = [],
    homeworks = [],
    books = [],
    bookTests = [],
    mockExams = []
  }) {
    if (!studentId && !targetStudent) return [];

    const studentIdStr = String(studentId || targetStudent?.id || '').trim();
    const studentUuidStr = toUUID(studentIdStr);

    const targetStudentObj = targetStudent || null;
    const targetIds = new Set([
      studentIdStr,
      studentUuidStr,
      String(targetStudentObj?.id || '').trim(),
      String(targetStudentObj?.supabaseId || '').trim(),
      String(targetStudentObj?.userId || '').trim(),
      String(targetStudentObj?.studentId || '').trim(),
      String(targetStudentObj?.student_id || '').trim(),
      String(targetStudentObj?.email || '').trim().toLowerCase()
    ].filter(Boolean));

    const isMatchStudent = (s) => {
      if (!s) return false;
      if (!studentIdStr && !targetStudentObj) return true;
      const sIds = [
        String(s.studentId ?? s.userId ?? s.student_id ?? s.raw_data?.studentId ?? s.raw_data?.student_id ?? '').trim(),
        String(s.studentEmail ?? s.email ?? s.raw_data?.email ?? '').trim().toLowerCase()
      ].filter(Boolean);
      return sIds.some(sid => targetIds.has(sid) || (toUUID(sid) && targetIds.has(String(toUUID(sid)))));
    };

    const results = [];
    const processedTestKeys = new Set();
    const processedAttemptSigs = new Set();

    const registerTestKeys = (sub, normalized) => {
      const sId = String(sub.id || sub.submissionId || sub.supabaseId || '');
      if (sId) processedTestKeys.add(sId);

      const candidateIds = [
        sub.test_id, sub.testId, sub.realTestId, sub.bookTestId,
        normalized?.testId, normalized?.realTestId, normalized?.bookTestId,
        sub.raw_data?.test_id, sub.raw_data?.testId,
        sub.hwId, sub.hw_id, sub.homeworkId,
        normalized?.hwId, normalized?.id, normalized?.bookId
      ].filter(Boolean);

      candidateIds.forEach(cid => {
        const str = String(cid);
        const clean = str.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
        processedTestKeys.add(str);
        processedTestKeys.add(clean);
        const u = toUUID(str);
        if (u) processedTestKeys.add(String(u));
      });

      const titleStr = normalized?.testTitle || normalized?.fullTitle || normalized?.testName || sub.title || sub.testTitle || sub.test_name || sub.name || '';
      const dateStr = String(normalized?.date || sub.created_at || sub.submittedAt || sub.date || '').slice(0, 10);
      const dCount = normalized?.correctCount ?? sub.correct_count ?? sub.correctCount ?? 0;
      const yCount = normalized?.wrongCount ?? sub.wrong_count ?? sub.wrongCount ?? 0;
      const qTotal = normalized?.totalQuestions ?? sub.totalQuestions ?? 0;
      const cleanTitle = String(titleStr).toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
      const sig = `${cleanTitle}_${dateStr}_${dCount}_${yCount}`;
      if (sig) processedAttemptSigs.add(sig);

      const scoreSig = `${dateStr}_${dCount}_${yCount}_${qTotal}`;
      if (scoreSig) processedAttemptSigs.add(`score_${scoreSig}`);
    };

    // 1. PRIMARY SOURCE: All student submissions from EvaluationContext / Supabase
    (submissions || []).filter(isMatchStudent).forEach(sub => {
      if (!sub || isDeletedItem(sub)) return;
      if (sub.status === 'in_progress' || sub.status === 'draft') return;

      const normalized = normalizeUnifiedSubmission(sub, { books, bookTests, homeworks });
      if (normalized && !isDeletedItem(normalized)) {
        registerTestKeys(sub, normalized);
        results.push(normalized);
      }
    });

    // 2. Homework Submissions not already in submissions table
    (homeworks || []).forEach(hw => {
      if (!hw || !hw.submissions || !Array.isArray(hw.submissions)) return;
      const hwIdStr = String(hw.id || '');
      const hwUuidStr = String(toUUID(hw.id) || '');
      if ((hwIdStr && processedTestKeys.has(hwIdStr)) || (hwUuidStr && processedTestKeys.has(hwUuidStr))) {
        return;
      }

      hw.submissions.filter(isMatchStudent).forEach(hs => {
        if (!hs || isDeletedItem(hs)) return;
        if (hs.status === 'in_progress' || hs.status === 'draft') return;

        const hsId = String(hs.id || hs.submissionId || hs.supabaseId || '');
        const hsTestId = String(hs.testId || hs.realTestId || hs.bookTestId || '');
        const hsClean = hsTestId.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
        const hsUuid = toUUID(hsTestId);

        const isAlreadyIn = (hsId && processedTestKeys.has(hsId)) ||
                            (hsTestId && processedTestKeys.has(hsTestId)) ||
                            (hsClean && processedTestKeys.has(hsClean)) ||
                            (hsUuid && processedTestKeys.has(String(hsUuid))) ||
                            (hwIdStr && processedTestKeys.has(hwIdStr));

        const titleStr = hs.testTitle || hs.title || hs.test_name || hs.name || hw.title || '';
        const cleanTitle = String(titleStr).toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
        const dateStr = String(hs.created_at || hs.submittedAt || hs.date || '').slice(0, 10);
        const dCount = hs.correct_count ?? hs.correctCount ?? 0;
        const yCount = hs.wrong_count ?? hs.wrongCount ?? 0;
        const qTotal = hs.totalQuestions || ((dCount + yCount) || 0);
        const sig = `${cleanTitle}_${dateStr}_${dCount}_${yCount}`;
        const isSigMatch = sig && processedAttemptSigs.has(sig);
        const isScoreSigMatch = processedAttemptSigs.has(`score_${dateStr}_${dCount}_${yCount}_${qTotal}`);

        if (isAlreadyIn || isSigMatch || isScoreSigMatch) return;

        const normalized = normalizeUnifiedSubmission({ ...hs, hwId: hw.id, title: hs.title || hw.title, testTitle: hs.testTitle || hw.title }, { books, bookTests, homeworks });
        if (normalized && !isDeletedItem(normalized)) {
          registerTestKeys(hs, normalized);
          results.push(normalized);
        }
      });
    });

    // 3. Mock Exams submissions not already added
    (mockExams || []).forEach(exam => {
      if (!exam || !exam.submissions || !Array.isArray(exam.submissions)) return;
      exam.submissions.filter(isMatchStudent).forEach(sub => {
        if (!sub || isDeletedItem(sub)) return;
        const subId = String(sub.id || sub.submissionId || sub.supabaseId || '');
        const subTestId = String(sub.testId || sub.realTestId || '');
        if ((subId && processedTestKeys.has(subId)) || (subTestId && processedTestKeys.has(subTestId))) return;

        const normalized = normalizeUnifiedSubmission({ ...sub, testTitle: exam.title, isExam: true }, { books, bookTests, homeworks });
        if (normalized && !isDeletedItem(normalized)) {
          registerTestKeys(sub, normalized);
          results.push(normalized);
        }
      });
    });

    // Intelligent Deduplication Pass
    // Sort newest first by date, but within same day, prioritize Deneme/Exam over generic test!
    results.sort((a, b) => {
      const timeB = new Date(b.submittedAt || b.date || b.createdAt || 0).getTime();
      const timeA = new Date(a.submittedAt || a.date || a.createdAt || 0).getTime();
      if (Math.abs(timeB - timeA) > 1000 * 60 * 60 * 24) {
        return timeB - timeA;
      }
      const aTitle = String(a.fullTitle || a.testTitle || a.title || '');
      const bTitle = String(b.fullTitle || b.testTitle || b.title || '');
      const aIsDeneme = Boolean(a.isPhysicalExam || a.typeKey === 'physicalExam' || /deneme|sınav/i.test(aTitle) || a.subject === 'Genel');
      const bIsDeneme = Boolean(b.isPhysicalExam || b.typeKey === 'physicalExam' || /deneme|sınav/i.test(bTitle) || b.subject === 'Genel');
      if (aIsDeneme && !bIsDeneme) return -1;
      if (!aIsDeneme && bIsDeneme) return 1;
      return timeB - timeA;
    });

    const finalSeen = new Set();
    const finalResults = [];
    results.forEach(item => {
      const idStr = String(item.id || item.submissionId || '');
      if (idStr && finalSeen.has(`id_${idStr}`)) return;

      const dateStr = String(item.date || item.submittedAt || '').slice(0, 10);
      const d = item.correctCount || 0;
      const y = item.wrongCount || 0;
      const tot = item.totalQuestions || 0;

      const titleStr = String(item.fullTitle || item.testTitle || item.title || '').trim();
      const cleanTitle = titleStr.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
      const isDeneme = Boolean(item.isPhysicalExam || item.typeKey === 'physicalExam' || /deneme|sınav/i.test(titleStr) || item.subject === 'Genel');
      const isGenericTest = /^(test|yeni nesil|ü\.?\s*değ)[-\s]?\d*$/i.test(titleStr) || titleStr === 'Test';

      const sig = `${cleanTitle}_${dateStr}_${d}_${y}`;
      if (sig && finalSeen.has(`sig_${sig}`)) return;

      const scoreSig = `score_${dateStr}_${d}_${y}_${tot}`;
      if (finalSeen.has(scoreSig)) {
        // A matching attempt (e.g. Deneme) on this date with the exact same D, Y, Total Questions was already recorded!
        return;
      }

      if (idStr) finalSeen.add(`id_${idStr}`);
      if (sig) finalSeen.add(`sig_${sig}`);
      if (isDeneme || tot >= 20 || isGenericTest || item.subject === 'Genel') {
        finalSeen.add(scoreSig);
      }
      finalResults.push(item);
    });

    return finalResults;
  }

/**
 * Universal finder for Review Page: Finds or builds normalized submission and test for any targetId.
 */
export function findUnifiedSubmissionOrTest(targetId, {
  studentId,
  submissions = [],
  homeworks = [],
  books = [],
  bookTests = []
}) {
  if (!targetId) return { submission: null, test: null };

  const targetStr = String(targetId);
  const tbtMatch = targetStr.match(/tbt_[a-zA-Z0-9_]+/);
  const extractedTbtId = tbtMatch ? tbtMatch[0] : null;

  // 1. Search in bookTests
  const matchedBookTest = (bookTests || []).find(bt =>
    String(bt.id) === targetStr ||
    (extractedTbtId && String(bt.id) === extractedTbtId) ||
    toUUID(bt.id) === targetStr
  );

  // 2. Find matching submission
  let foundRawSub = null;
  const isMatch = (s) => {
    if (!s) return false;
    if (studentId) {
      const sid = String(s.studentId ?? s.userId ?? s.student_id ?? '');
      if (sid !== String(studentId) && toUUID(sid) !== toUUID(studentId)) return false;
    }
    const tid = String(s.testId || s.realTestId || s.bookTestId || '');
    if (tid === targetStr || (extractedTbtId && tid === extractedTbtId)) return true;
    if (String(s.id) === targetStr || String(s.submissionId) === targetStr) return true;
    return false;
  };

  const allMatchingSubs = [];
  (submissions || []).forEach(s => {
    if (isMatch(s)) allMatchingSubs.push(s);
  });
  if (homeworks) {
    for (const hw of homeworks) {
      const subs = hw.submissions || hw.raw_data?.submissions || [];
      subs.forEach(s => {
        if (isMatch(s)) allMatchingSubs.push({ ...s, hwId: hw.id });
      });
    }
  }

  if (allMatchingSubs.length > 0) {
    allMatchingSubs.sort((a, b) => {
      const aDone = a.status !== 'in_progress' && a.status !== 'draft';
      const bDone = b.status !== 'in_progress' && b.status !== 'draft';
      if (aDone && !bDone) return -1;
      if (!aDone && bDone) return 1;

      const countAnswers = (sub) => {
        if (Array.isArray(sub?.answers)) {
          return sub.answers.filter(x => x && x.type !== 'metadata' && (
            (x.userAnswer !== null && x.userAnswer !== undefined && x.userAnswer !== '' && x.userAnswer !== 'empty') ||
            (x.userAnswerText && String(x.userAnswerText).trim() !== '')
          )).length;
        }
        return 0;
      };
      const aCount = countAnswers(a);
      const bCount = countAnswers(b);
      if (aCount !== bCount) return bCount - aCount;

      const timeB = new Date(b.submittedAt || b.evaluatedAt || b.updatedAt || b.date || b.createdAt || 0).getTime();
      const timeA = new Date(a.submittedAt || a.evaluatedAt || a.updatedAt || a.date || a.createdAt || 0).getTime();
      return timeB - timeA;
    });
    foundRawSub = allMatchingSubs[0];
  }

  // 3. Normalize
  const normalizedSubmission = foundRawSub
    ? normalizeUnifiedSubmission(foundRawSub, { books, bookTests, homeworks })
    : (matchedBookTest ? {
        id: targetStr,
        testId: matchedBookTest.id,
        testTitle: matchedBookTest.name || 'Test',
        studentId: studentId || '',
        answers: [],
        totalQuestions: matchedBookTest.question_count || 12,
        answerKey: normalizeAnswerKey(matchedBookTest.answer_key || matchedBookTest.answerKey)
      } : null);

  const normalizedTest = matchedBookTest || (foundRawSub ? {
    id: normalizedSubmission?.testId || targetStr,
    title: normalizedSubmission?.testTitle || 'İnceleme Testi',
    questionCount: normalizedSubmission?.totalQuestions || 12,
    answer_key: normalizedSubmission?.answerKey || {},
    type: normalizedSubmission?.isOpenEnded ? 'acik_uclu' : (normalizedSubmission?.type || (matchedBookTest ? 'optik_form' : 'coktan_secmeli')),
    questionType: normalizedSubmission?.isOpenEnded ? 'acik_uclu' : (normalizedSubmission?.questionType || (matchedBookTest ? 'optik_form' : 'coktan_secmeli')),
    sourceFormat: normalizedSubmission?.sourceFormat || (normalizedSubmission?.isOpenEnded ? 'yazili' : (matchedBookTest ? 'physical' : 'digital')),
    isOpenEnded: normalizedSubmission?.isOpenEnded || false
  } : null);

  return {
    submission: normalizedSubmission,
    test: normalizedTest
  };
}
