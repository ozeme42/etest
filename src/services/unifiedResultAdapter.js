import { toUUID } from './supabaseService';
import { getTurkeyYMD, extractItemDate } from '../utils/dateHelpers';

/**
 * 🛡️ UNIFIED RESULT ADAPTER (Single Source of Truth)
 * 
 * Standartlaştırılmış Çözüm ve Test Modeli:
 * Veri nereden gelirse gelsin (submissions tablosu, homeworks altındaki ödev testleri,
 * serbest kitap testleri veya deneme sınavları) tek bir standart modele dönüştürülür.
 */

export function isDeletedItem(s) {
  if (!s) return true;
  let deletedIds = new Set();
  try {
    const raw = localStorage.getItem('eTestDeletedSubmissions');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) deletedIds = new Set(parsed.map(String));
    }
  } catch {}

  const candidates = [
    s.id,
    s.submissionId,
    s.supabaseId,
    s.testId,
    s.realTestId,
    s.bookTestId,
    s.metadata?.realTestId,
    s.metadata?.bookTestId,
    s.metadata?.testId
  ];
  return candidates.some(c => {
    if (!c) return false;
    const str = String(c);
    const clean = str.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
    const u = toUUID(str);
    return deletedIds.has(str) || deletedIds.has(clean) || (u && deletedIds.has(String(u)));
  });
}

export function purgeTestCache(testId, studentId) {
  if (!testId) return;
  const tStr = String(testId);
  const tClean = tStr.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
  const sStr = studentId ? String(studentId) : '';

  try {
    const rawDel = localStorage.getItem('eTestDeletedSubmissions');
    let delSet = new Set();
    if (rawDel) {
      const parsed = JSON.parse(rawDel);
      if (Array.isArray(parsed)) delSet = new Set(parsed.map(String));
    }
    delSet.add(tStr);
    delSet.add(tClean);
    delSet.add(`bt_${tClean}`);
    delSet.add(`tbt_${tClean}`);
    localStorage.setItem('eTestDeletedSubmissions', JSON.stringify(Array.from(delSet).slice(-500)));

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
    (matchedHw?.title && b.title && matchedHw.title.toLowerCase().includes(b.title.toLowerCase()))
  );

  let matchedSubject = (matchedBook?.subjects || []).find(s =>
    String(s.id) === String(matchedBookTest?.subject_id || matchedBookTest?.subjectId)
  ) || (books || []).flatMap(b => b.subjects || []).find(s =>
    String(s.id) === String(matchedBookTest?.subject_id || matchedBookTest?.subjectId)
  );

  let matchedTopic = (matchedSubject?.topics || []).find(t =>
    String(t.id) === String(matchedBookTest?.topic_id || matchedBookTest?.topicId)
  );

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

  // Check generated book tests pattern if still not found
  if (!matchedBookTest && books && Array.isArray(books)) {
    for (const b of books) {
      const bId = String(b.id || '');
      const rawSubjs = b.subjects || b.raw_data?.subjects || [];
      for (let sIdx = 0; sIdx < rawSubjs.length; sIdx++) {
        const s = rawSubjs[sIdx];
        const sId = String(s.id || `subj_${sIdx}`);
        const topics = s.topics || [{ id: `top_${sId}_1`, name: '1. Ünite' }];
        for (let tpIdx = 0; tpIdx < topics.length; tpIdx++) {
          const tp = topics[tpIdx];
          const tpId = String(tp.id || `tp_${tpIdx}`);
          const uName = tp.name || tp.title || `${tpIdx + 1}. Ünite`;
          for (let i = 1; i <= 20; i++) {
            const genId = `tbt_${bId}_${sId}_${tpId}_${i}`;
            const genName = i <= 12 ? `Test-${i}` : (i <= 16 ? `Yeni Nesil ${i - 12}` : `Ü. Değ. ${i - 16}`);
            if (genId === testIdCandidate || cleanCandidate.endsWith(`_${tpId}_${i}`) || testIdCandidate.includes(`_${sId}_${tpId}_${i}`) || testIdCandidate.includes(`_${tpId}_${i}`)) {
              matchedBookTest = {
                id: genId,
                bookId: b.id,
                subjectId: s.id,
                topicId: tp.id,
                name: genName,
                topicName: uName,
                subjectName: s.name || b.subject
              };
              matchedBook = b;
              matchedSubject = s;
              matchedTopic = tp;
              break;
            }
          }
          if (matchedBookTest) break;
        }
        if (matchedBookTest) break;
      }
      if (matchedBookTest) break;
    }
  }

  const subjectName = matchedSubject?.name || meta.subjectName || rawSub.subject || matchedHw?.subject || matchedBook?.subject || 'Genel';
  const topicName = matchedTopic?.name || meta.topicName || rawSub.topic || matchedBookTest?.topicName || 'Genel Konu';
  const testName = matchedBookTest?.name || rawSub.testName || rawSub.name || rawSub.testTitle || rawSub.title || matchedHw?.title || 'Test';
  const rawBookTitle = matchedBook?.title || rawSub.bookTitle || '';
  const cleanBookTitle = rawBookTitle.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();
  const fullTitle = cleanBookTitle
    ? (topicName ? `${cleanBookTitle} — ${subjectName} › ${topicName} (${testName})` : `${cleanBookTitle} — ${subjectName} (${testName})`)
    : (topicName ? `${subjectName} › ${topicName} (${testName})` : testName);

  // 3. Question Count & Answer Key
  const rawAnswerKey = matchedBookTest?.answer_key || matchedBookTest?.answerKey || rawSub.answerKey || rawSub.answer_key || matchedHw?.answerKey || {};
  const answerKey = normalizeAnswerKey(rawAnswerKey);

  const studentAnswersMap = normalizeStudentAnswers(rawSub);

  const totalQuestions = Math.max(
    matchedBookTest?.question_count || matchedBookTest?.questionCount || 0,
    rawSub.totalQuestions || raw.totalQuestions || 0,
    Object.keys(studentAnswersMap).length,
    Object.keys(answerKey).length,
    Array.isArray(rawSub.answers) ? rawSub.answers.filter(a => a && a.type !== 'metadata').length : 0,
    1
  );

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

  const isSubWritten = Boolean(
    rawSub.isOpenEnded ||
    rawSub.type === 'acik_uclu' ||
    rawSub.type === 'yazili' ||
    rawSub.questionType === 'acik_uclu' ||
    rawSub.questionType === 'yazili' ||
    rawSub.sourceFormat === 'yazili' ||
    rawSub.formatType === 'yazili' ||
    rawSub.openEndedText ||
    rawSub.openEndedAnswers ||
    (fullTitle && (fullTitle.toLowerCase().includes('açık uçlu') || fullTitle.toLowerCase().includes('acik uclu') || fullTitle.toLowerCase().includes('yazılı') || fullTitle.toLowerCase().includes('yazili') || fullTitle.toLowerCase().includes('klasik'))) ||
    (Array.isArray(rawSub.answers) && rawSub.answers.some(a => a && (a.isOpenEnded || a.userAnswerText || a.studentAnswerText || (typeof a.userAnswer === 'string' && a.userAnswer.length > 2))))
  );

  if (isSubWritten && Array.isArray(rawSub.answers) && rawSub.answers.length > 0) {
    rawSub.answers.forEach((a, idx) => {
      detailedAnswers.push({
        ...a,
        questionNo: a.questionNo || a.questionNoInSection || (idx + 1),
        userAnswer: a.userAnswerText || a.studentAnswerText || a.userAnswer,
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
        if (Array.isArray(rawSub.answers)) {
          const existing = rawSub.answers.find(a => (a.questionNo === i || a.questionIndex === i));
          if (existing?.isCorrect !== undefined) isCorrect = existing.isCorrect;
        }
      }

      if (isCorrect === true) correctCount++;
      else if (userLetter) wrongCount++;
      else blankCount++;

      detailedAnswers.push({
        questionNo: i,
        userAnswer: userLetter,
        correctAnswer: correctLetter,
        isCorrect,
        reason: mistakeReasons[i] || null
      });
    }
  }

  // Override correct/wrong counts if pre-evaluated by teacher, entered manually, or explicitly defined in snake_case / camelCase
  const expCorrect = rawSub.correctCount ?? rawSub.correct_count ?? rawSub.correct ?? raw.correctCount ?? raw.correct_count;
  const expWrong = rawSub.wrongCount ?? rawSub.wrong_count ?? rawSub.wrong ?? raw.wrongCount ?? raw.wrong_count;
  const expEmpty = rawSub.emptyCount ?? rawSub.empty_count ?? rawSub.blankCount ?? rawSub.blank_count ?? rawSub.empty ?? raw.emptyCount ?? raw.empty_count;

  if (expCorrect !== undefined && expCorrect !== null && !isNaN(Number(expCorrect))) {
    const numCorr = Number(expCorrect);
    const numWrg = (expWrong !== undefined && expWrong !== null && !isNaN(Number(expWrong))) ? Number(expWrong) : 0;
    const numEmp = (expEmpty !== undefined && expEmpty !== null && !isNaN(Number(expEmpty))) ? Number(expEmpty) : Math.max(0, totalQuestions - numCorr - numWrg);
    
    if ((correctCount === 0 && wrongCount === 0 && (numCorr > 0 || numWrg > 0)) || Object.keys(studentAnswersMap).length === 0) {
      correctCount = numCorr;
      wrongCount = numWrg;
      blankCount = numEmp;
    } else if (numCorr !== correctCount || numWrg !== wrongCount) {
      correctCount = numCorr;
      wrongCount = numWrg;
      blankCount = Math.max(0, totalQuestions - correctCount - wrongCount);
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
  let scorePercentage = 0;
  if (totalQuestions > 0) {
    scorePercentage = Math.round((correctCount / totalQuestions) * 100);
  } else if (expScorePct !== undefined && expScorePct !== null && !isNaN(Number(expScorePct))) {
    scorePercentage = Math.round(Number(expScorePct));
  } else if (rawSub.score !== undefined && rawSub.score !== null && !isNaN(Number(rawSub.score)) && Number(rawSub.score) > 10) {
    scorePercentage = Math.round(Number(rawSub.score));
  }

  const expNet = rawSub.totalNet ?? rawSub.total_net ?? rawSub.net ?? raw.totalNet;
  const netScore = (expNet !== undefined && expNet !== null && !isNaN(Number(expNet)))
    ? Number(Number(expNet).toFixed(2))
    : Number((correctCount - (wrongCount / 4)).toFixed(2));

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
    String(rawSub.id || '').startsWith('me_') || String(testIdCandidate).startsWith('me_')
  );

  const isBookTest = Boolean(
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

  const isEvaluated = Boolean(
    rawSub.isEvaluated === true ||
    rawSub.isEvaluatedByTeacher === true ||
    rawSub.evaluatedByTeacher === true ||
    rawSub.status === 'evaluated' ||
    rawSub.status === 'graded' ||
    Boolean(rawSub.teacherFeedback || rawSub.teacherNote) ||
    Boolean(rawSub.teacherScores && Object.keys(rawSub.teacherScores).length > 0) ||
    Boolean(rawSub.evaluatedAt && (rawSub.teacherFeedback || rawSub.teacherNote || rawSub.isEvaluated || rawSub.status === 'evaluated')) ||
    (Array.isArray(rawSub.answers) && rawSub.answers.some(a => a.evaluatedByTeacher || (a.score !== undefined && a.score !== null && a.score !== 'empty' && a.score !== 'pending')))
  );

  const isPendingEvaluation = isSubWritten && !isEvaluated;

  return {
    id: uniqueId,
    submissionId: uniqueId,
    supabaseId: rawSub.supabaseId || (toUUID(rawSub.id) ? rawSub.id : null),
    sourceType: matchedHw ? 'homework' : (matchedBook ? 'book' : 'submission'),
    typeKey,
    
    testId: realTestId,
    bookTestId: realTestId,
    realTestId,
    testName,
    testTitle: fullTitle,
    title: testName,
    fullTitle,
    bookId: bookId || null,
    bookTitle: cleanBookTitle,
    subjectId: matchedSubject?.id || null,
    subjectName,
    subject: subjectName,
    subjectKey: calculatedSubjectKey,
    topicId: matchedTopic?.id || null,
    topicName,
    unitTopic: topicName,
    
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

    let deletedIds = new Set();
    try {
      const savedDeleted = localStorage.getItem('eTestDeletedSubmissions');
      if (savedDeleted) {
        const parsed = JSON.parse(savedDeleted);
        if (Array.isArray(parsed)) deletedIds = new Set(parsed.map(String));
      }
    } catch {}

    const isDeletedItem = (s) => {
      if (!s) return true;
      const candidates = [
        s.id,
        s.submissionId,
        s.supabaseId,
        s.testId,
        s.realTestId,
        s.bookTestId,
        s.metadata?.realTestId,
        s.metadata?.bookTestId,
        s.metadata?.testId
      ];
      return candidates.some(c => {
        if (!c) return false;
        const str = String(c);
        const clean = str.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
        const u = toUUID(str);
        return deletedIds.has(str) || deletedIds.has(clean) || (u && deletedIds.has(String(u)));
      });
    };

    const results = [];
    const processedTestIds = new Set();

    const allCandidateSubs = [];

    // 1. Standalone Submissions (Pure Source of Truth for test-by-test completion date)
    (submissions || []).filter(isMatchStudent).forEach(sub => {
      allCandidateSubs.push({ ...sub, isStandalone: true });
    });

    // 2. Homework Submissions
    (homeworks || []).forEach(hw => {
      if (!hw) return;
      const hwSubList = Array.isArray(hw.submissions) && hw.submissions.length > 0
        ? hw.submissions
        : (Array.isArray(hw.raw_data?.submissions) ? hw.raw_data.submissions : []);

      hwSubList.filter(isMatchStudent).forEach(sub => {
        allCandidateSubs.push({ ...sub, hwId: hw.id, homeworkTitle: hw.title, isStandalone: false });
      });
    });

    // 3. Synthesize submissions for tests that have recorded mistake reasons in localStorage
    if (typeof localStorage !== 'undefined') {
      const existingCandidateTestIds = new Set(allCandidateSubs.map(s => String(s.testId || s.realTestId || s.bookTestId || s.id)));

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || (!k.startsWith('mistake_reasons_') && !k.startsWith('mistake_reason_'))) continue;

        const parts = k.split('_');
        const keyStudentId = parts[parts.length - 1];
        const isMatchThisStudent = !studentIdStr || keyStudentId === studentIdStr || (studentUuidStr && keyStudentId === studentUuidStr) || (studentUuidStr && toUUID(keyStudentId) === studentUuidStr);
        if (!isMatchThisStudent && parts.length > 3) continue;

        try {
          const val = localStorage.getItem(k);
          if (!val) continue;
          const parsedReasons = JSON.parse(val);
          if (!parsedReasons || typeof parsedReasons !== 'object' || Object.keys(parsedReasons).length === 0) continue;

          let testId = k.replace(/^mistake_reasons_bt_/, '').replace(/^mistake_reasons_/, '').replace(`_${keyStudentId}`, '');
          if (!testId || existingCandidateTestIds.has(testId)) continue;

          let matchedBt = (bookTests || []).find(bt => String(bt.id) === testId || toUUID(bt.id) === testId || String(bt.id).includes(testId));
          let matchedB = matchedBt ? (books || []).find(b => String(b.id) === String(matchedBt.bookId || matchedBt.book_id)) : (books && books[0] ? books[0] : null);
          let matchedS = null;
          let matchedTp = null;
          let testName = matchedBt?.name || 'Test';
          let unitName = matchedBt?.unit_name || matchedBt?.unitName || matchedBt?.topic_name || matchedBt?.topicName || '1. Ünite';
          let subjectName = matchedBt?.subject_name || matchedBt?.subjectName || matchedBt?.subject || matchedB?.subject || 'Genel';

          // If testId is generated format tbt_bookId_subjId_topId_i or contains subj/top indices:
          if (books && Array.isArray(books)) {
            for (const b of books) {
              const bId = String(b.id || '');
              const rawSubjs = b.subjects || b.raw_data?.subjects || [];
              for (let sIdx = 0; sIdx < rawSubjs.length; sIdx++) {
                const s = rawSubjs[sIdx];
                const sId = String(s.id || `subj_${sIdx}`);
                const topics = s.topics || [{ id: `top_${sId}_1`, name: '1. Ünite' }];
                for (let tpIdx = 0; tpIdx < topics.length; tpIdx++) {
                  const tp = topics[tpIdx];
                  const tpId = String(tp.id || `tp_${tpIdx}`);
                  const uName = tp.name || tp.title || `${tpIdx + 1}. Ünite`;
                  for (let i = 1; i <= 20; i++) {
                    const genId = `tbt_${bId}_${sId}_${tpId}_${i}`;
                    const genName = i <= 12 ? `Test-${i}` : (i <= 16 ? `Yeni Nesil ${i - 12}` : `Ü. Değ. ${i - 16}`);
                    if (genId === testId || testId.endsWith(`_${tpId}_${i}`) || testId.includes(`_${sId}_${tpId}_${i}`) || testId.includes(`_${tpId}_${i}`)) {
                      matchedBt = { id: genId, name: genName };
                      matchedB = b;
                      matchedS = s;
                      matchedTp = tp;
                      testName = genName;
                      unitName = uName;
                      subjectName = s.name || b.subject || 'Genel';
                      break;
                    }
                  }
                  if (matchedS) break;
                }
                if (matchedS) break;
              }
              if (matchedB && matchedS) break;
            }
          }

          const wrongQNos = Object.keys(parsedReasons).map(q => parseInt(q, 10)).filter(q => !isNaN(q) && q > 0);
          const totalQ = matchedBt?.questionCount || matchedBt?.question_count || Math.max(12, ...wrongQNos);
          const wrongCount = wrongQNos.length;
          const correctCount = Math.max(0, totalQ - wrongCount);

          const syntheticAnswers = [];
          for (let q = 1; q <= totalQ; q++) {
            const isWrong = wrongQNos.includes(q);
            syntheticAnswers.push({
              questionNo: q,
              isCorrect: !isWrong,
              userAnswer: isWrong ? 'Y' : 'D',
              correctAnswer: matchedBt?.answerKey?.[q] || 'A',
              mistakeReason: parsedReasons[q] || null
            });
          }

          const cleanBookTitle = (matchedB?.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();
          const fullTitle = `${cleanBookTitle} — ${subjectName} › ${unitName} (${testName})`;

          allCandidateSubs.push({
            id: `mistake_sub_${testId}_${studentIdStr}`,
            submissionId: `mistake_sub_${testId}_${studentIdStr}`,
            testId: testId,
            realTestId: testId,
            bookTestId: testId,
            bookId: matchedB?.id || 'book_1',
            bookTitle: cleanBookTitle,
            subjectId: matchedS?.id || 'subj_1',
            subjectName: subjectName,
            subject: subjectName,
            topicId: matchedTp?.id || 'top_1',
            topicName: unitName,
            unitTopic: unitName,
            testName: testName,
            testTitle: fullTitle,
            title: testName,
            fullTitle: fullTitle,
            studentId: studentIdStr,
            score: Number((correctCount - (wrongCount / 4)).toFixed(2)),
            computedScore: Math.round((correctCount / totalQ) * 100),
            scorePercentage: Math.round((correctCount / totalQ) * 100),
            correctCount,
            wrongCount,
            blankCount: 0,
            emptyCount: 0,
            totalNet: Number((correctCount - (wrongCount / 4)).toFixed(2)),
            netScore: Number((correctCount - (wrongCount / 4)).toFixed(2)),
            totalQuestions: totalQ,
            answers: [
              ...syntheticAnswers,
              {
                type: 'metadata',
                realId: `mistake_sub_${testId}_${studentIdStr}`,
                realTestId: testId,
                bookTestId: testId,
                bookTitle: cleanBookTitle,
                subjectName: subjectName,
                topicName: unitName,
                unitTopic: unitName,
                totalQuestions: totalQ,
                totalNet: Number((correctCount - (wrongCount / 4)).toFixed(2)),
                isManual: false,
                sourceType: 'trackedBook',
                mistakeReasons: parsedReasons
              }
            ],
            mistakeReasons: parsedReasons,
            sourceType: 'trackedBook',
            typeKey: 'book',
            date: getTurkeyToday(),
            submittedAt: new Date().toISOString(),
            isStandalone: true
          });
          existingCandidateTestIds.add(testId);
        } catch (e) {}
      }
    }

    // 4. Scan all canonical book tests and match with submissions
    if (books && Array.isArray(books)) {
      const existingCandidateTestIds = new Set(allCandidateSubs.map(s => String(s.id || s.submissionId || s.testId || s.realTestId || s.bookTestId || '')));

      books.forEach(b => {
        const bId = String(b.id || '');
        const bUuid = toUUID(b.id);
        const rawSubjs = (b.subjects && b.subjects.length > 0) ? b.subjects : (b.raw_data?.subjects || []);

        rawSubjs.forEach((subj, sIdx) => {
          const sId = String(subj.id || `subj_${sIdx}`);
          const sName = subj.name || b.subject || 'Genel';
          const topics = (subj.topics && Array.isArray(subj.topics) && subj.topics.length > 0)
            ? subj.topics
            : [{ id: `top_${sId}_1`, name: '1. Ünite' }];

          topics.forEach((tp, tpIdx) => {
            const tpId = String(tp.id || `tp_${tpIdx}`);
            const uName = tp.name || tp.title || `${tpIdx + 1}. Ünite`;

            let matchedTests = (bookTests || []).filter(bt => {
              const isMatchBook = String(bt.bookId || bt.book_id) === bId || (bUuid && String(bt.bookId || bt.book_id) === bUuid);
              if (!isMatchBook) return false;
              return String(bt.topicId || bt.topic_id) === tpId || (topics.length === 1 && String(bt.subjectId || bt.subject_id) === sId);
            });

            if (matchedTests.length === 0 && tp.tests && Array.isArray(tp.tests) && tp.tests.length > 0) {
              matchedTests = tp.tests;
            }

            if (matchedTests.length === 0) {
              matchedTests = [];
              for (let i = 1; i <= 20; i++) {
                matchedTests.push({
                  id: `tbt_${bId}_${sId}_${tpId}_${i}`,
                  bookId: bId,
                  subjectId: sId,
                  topicId: tpId,
                  name: i <= 12 ? `Test-${i}` : (i <= 16 ? `Yeni Nesil ${i - 12}` : `Ü. Değ. ${i - 16}`),
                  questionCount: 20,
                  answerKey: {}
                });
              }
            }

            matchedTests.forEach(testObj => {
              const tIdStr = String(testObj.id);
              const tCleanId = tIdStr.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
              const tUuidStr = String(toUUID(testObj.id) || '');

              const matchedSubs = (submissions || []).filter(s => {
                if (!s || isDeletedItem(s) || !isMatchStudent(s)) return false;
                if (s.status === 'in_progress' || s.status === 'draft') return false;

                const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a.type === 'metadata') : (s.metadata || {});
                const matchFields = [
                  String(s.testId || ''),
                  String(s.realTestId || ''),
                  String(s.bookTestId || ''),
                  String(s.id || ''),
                  String(meta?.realTestId || ''),
                  String(meta?.bookTestId || ''),
                  String(meta?.realId || '')
                ].filter(f => Boolean(f) && f.length >= 2);
                if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
                  matchFields.push(...s.bookTestIds.map(String).filter(f => Boolean(f) && f.length >= 2));
                }

                return matchFields.some(f => (
                  f === tIdStr ||
                  (tCleanId && tCleanId.length >= 3 && f === tCleanId) ||
                  (tUuidStr && f === tUuidStr) ||
                  (toUUID(f) && toUUID(f) === tIdStr) ||
                  (tUuidStr && toUUID(f) === tUuidStr)
                ));
              });

              matchedSubs.forEach(s => {
                const subKey = String(s.id || s.submissionId || `${tIdStr}_${s.studentId}`);
                if (!existingCandidateTestIds.has(subKey)) {
                  allCandidateSubs.push({
                    ...s,
                    bookId: b.id,
                    bookTitle: b.title,
                    subjectId: sId,
                    subjectName: sName,
                    topicId: tpId,
                    topicName: uName,
                    testId: tIdStr,
                    realTestId: tIdStr,
                    testName: testObj.name,
                    isStandalone: true
                  });
                  existingCandidateTestIds.add(subKey);
                }
              });
            });
          });
        });
      });
    }

    // Sort candidates: Evaluated first, Standalone submissions before generic homework updates, then newest
    allCandidateSubs.sort((a, b) => {
      const aEval = (a.isEvaluated || a.isEvaluatedByTeacher || a.status === 'evaluated' || a.teacherFeedback) ? 1 : 0;
      const bEval = (b.isEvaluated || b.isEvaluatedByTeacher || b.status === 'evaluated' || b.teacherFeedback) ? 1 : 0;
      if (bEval !== aEval) return bEval - aEval;

      const aStand = a.isStandalone ? 1 : 0;
      const bStand = b.isStandalone ? 1 : 0;
      if (bStand !== aStand) return bStand - aStand;

      return new Date(b.submittedAt || b.date || 0).getTime() - new Date(a.submittedAt || a.date || 0).getTime();
    });

    allCandidateSubs.forEach(sub => {
      if (!sub || isDeletedItem(sub)) return;
      if (sub.status === 'in_progress' || sub.status === 'draft') return;
      const rawSubId = String(sub.id || sub.submissionId || '');
      if (rawSubId.startsWith('draft_') || rawSubId.startsWith('64726166')) return;

      const normalized = normalizeUnifiedSubmission(sub, { books, bookTests, homeworks });
      if (!normalized || isDeletedItem(normalized)) return;

      // Filter out umbrella "(Tüm Kitap Görevi)" placeholder container assignments ONLY if no specific test was completed
      const t = String(normalized.testTitle || normalized.fullTitle || normalized.title || '').toLowerCase();
      const isPlaceholderWithoutTest = (t.includes('(tüm kitap görevi)') || t.includes('(tüm kitap)')) && (!normalized.testId || String(normalized.testId) === String(normalized.bookId));
      if (isPlaceholderWithoutTest) return;

      const testKey = String(normalized.id || normalized.submissionId || `${normalized.bookId || ''}_${normalized.subjectName || normalized.subject || ''}_${normalized.topicName || ''}_${normalized.testName || normalized.testId || ''}_${normalized.date || normalized.submittedAt || ''}`);
      if (processedTestIds.has(testKey)) return;
      processedTestIds.add(testKey);

      results.push(normalized);
    });

    // Sort newest first by exact timestamp
    results.sort((a, b) => {
      const timeB = new Date(b.submittedAt || b.date || 0).getTime();
      const timeA = new Date(a.submittedAt || a.date || 0).getTime();
      return timeB - timeA;
    });

    return results;
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
