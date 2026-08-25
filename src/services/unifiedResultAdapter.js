import { toUUID } from './supabaseService';
import { getTurkeyYMD, extractItemDate } from '../utils/dateHelpers';

/**
 * 🛡️ UNIFIED RESULT ADAPTER (Single Source of Truth)
 * 
 * Standartlaştırılmış Çözüm ve Test Modeli:
 * Veri nereden gelirse gelsin (submissions tablosu, homeworks altındaki ödev testleri,
 * serbest kitap testleri veya deneme sınavları) tek bir standart modele dönüştürülür.
 */

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
  const map = {};

  // 1. Check studentAnswers dictionary { "1": "A", "2": "C" }
  if (rawSub.studentAnswers && typeof rawSub.studentAnswers === 'object' && !Array.isArray(rawSub.studentAnswers)) {
    Object.entries(rawSub.studentAnswers).forEach(([k, v]) => {
      const qNo = parseInt(k, 10);
      if (!isNaN(qNo)) {
        const letter = normalizeLetter(v);
        if (letter) map[qNo] = letter;
      }
    });
    return map;
  }

  // 2. Check answersMap dictionary
  if (rawSub.answersMap && typeof rawSub.answersMap === 'object' && !Array.isArray(rawSub.answersMap)) {
    Object.entries(rawSub.answersMap).forEach(([k, v]) => {
      const qNo = parseInt(k, 10);
      if (!isNaN(qNo)) {
        const letter = normalizeLetter(v);
        if (letter) map[qNo] = letter;
      }
    });
    return map;
  }

  // 3. Check answers array [ { questionNo: 1, userAnswer: "A" } ]
  if (Array.isArray(rawSub.answers)) {
    rawSub.answers.forEach((a, idx) => {
      if (!a || a.type === 'metadata') return;
      const qNo = a.questionNo || a.questionIndex || (idx + 1);
      const letter = normalizeLetter(a.userAnswer ?? a.selectedOption ?? a.userAnswerLetter ?? a.answer);
      if (letter) map[qNo] = letter;
    });
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

  const matchedBookTest = (bookTests || []).find(bt =>
    String(bt.id) === testIdCandidate ||
    toUUID(bt.id) === testIdCandidate ||
    (bt.id && testIdCandidate.includes(String(bt.id)))
  );

  const matchedHw = (homeworks || []).find(h =>
    String(h.id) === String(rawSub.hwId || rawSub.homeworkId || raw.hwId || raw.homeworkId) ||
    String(h.id) === testIdCandidate
  );

  const bookId = String(
    matchedBookTest?.book_id || matchedBookTest?.bookId ||
    rawSub.bookId || raw.bookId || matchedHw?.bookId || ''
  );

  const matchedBook = (books || []).find(b =>
    String(b.id) === bookId ||
    toUUID(b.id) === bookId ||
    (matchedHw?.title && b.title && matchedHw.title.toLowerCase().includes(b.title.toLowerCase()))
  );

  // 2. Identify Subject & Topic
  const matchedSubject = (matchedBook?.subjects || []).find(s =>
    String(s.id) === String(matchedBookTest?.subject_id || matchedBookTest?.subjectId)
  ) || (books || []).flatMap(b => b.subjects || []).find(s =>
    String(s.id) === String(matchedBookTest?.subject_id || matchedBookTest?.subjectId)
  );

  const matchedTopic = (matchedSubject?.topics || []).find(t =>
    String(t.id) === String(matchedBookTest?.topic_id || matchedBookTest?.topicId)
  );

  const subjectName = matchedSubject?.name || meta.subjectName || rawSub.subject || matchedHw?.subject || matchedBook?.subject || 'Genel';
  const topicName = matchedTopic?.name || meta.topicName || rawSub.topic || matchedBookTest?.topicName || 'Genel Konu';
  const testTitle = matchedBookTest?.name || rawSub.testTitle || rawSub.title || matchedHw?.title || 'Konu Testi';
  const cleanBookTitle = matchedBook?.title || rawSub.bookTitle || '';
  const fullTitle = cleanBookTitle ? `${cleanBookTitle} - ${subjectName} (${testTitle})` : `${subjectName} - ${testTitle}`;

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

  // Override correct/wrong counts if pre-evaluated by teacher or explicitly defined
  if (typeof rawSub.correctCount === 'number' && typeof rawSub.wrongCount === 'number') {
    if (rawSub.correctCount !== correctCount || rawSub.wrongCount !== wrongCount) {
      if ((rawSub.correctCount + rawSub.wrongCount) <= totalQuestions) {
        correctCount = rawSub.correctCount;
        wrongCount = rawSub.wrongCount;
        blankCount = Math.max(0, totalQuestions - correctCount - wrongCount);
      }
    }
  }

  // 6. Score & Net Calculation
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const netScore = Number((correctCount - (wrongCount / 4)).toFixed(2));

  // 7. Date Resolution
  const dateVal = extractItemDate(rawSub.submittedAt || rawSub.submitted_at || rawSub.completedAt || rawSub.date || raw.submittedAt || raw.completedAt || rawSub);

  // 8. Unique Clean ID & Subject/Type Keys
  const studentId = String(rawSub.studentId ?? rawSub.userId ?? rawSub.student_id ?? '');
  const realTestId = matchedBookTest?.id || testIdCandidate;
  const uniqueId = String(rawSub.id || rawSub.submissionId || `${rawSub.hwId || 'sub'}_${studentId}_${realTestId}`);

  const isPhysicalExam = Boolean(
    rawSub.type === 'physicalExam' || rawSub.typeKey === 'physicalExam' || rawSub.isPhysicalExam ||
    raw.type === 'physicalExam' || raw.typeKey === 'physicalExam' || raw.isPhysicalExam ||
    String(rawSub.id || '').startsWith('me_') || String(testIdCandidate).startsWith('me_')
  );
  const typeKey = isPhysicalExam ? 'physicalExam' : (matchedHw ? 'homework' : (matchedBook ? 'book' : 'individual'));
  const calculatedSubjectKey = getSubjectKey({ fullTitle, subjectName });

  return {
    id: uniqueId,
    submissionId: uniqueId,
    supabaseId: rawSub.supabaseId || (toUUID(rawSub.id) ? rawSub.id : null),
    sourceType: matchedHw ? 'homework' : (matchedBook ? 'book' : 'submission'),
    typeKey,
    
    testId: realTestId,
    bookTestId: realTestId,
    realTestId,
    testTitle,
    fullTitle,
    bookId: bookId || null,
    bookTitle: cleanBookTitle,
    subjectId: matchedSubject?.id || null,
    subjectName,
    subjectKey: calculatedSubjectKey,
    topicId: matchedTopic?.id || null,
    topicName,
    
    studentId,
    date: dateVal,
    submittedAt: dateVal,
    
    totalQuestions,
    correctCount,
    wrongCount,
    blankCount,
    scorePercentage,
    score: scorePercentage,
    computedScore: scorePercentage,
    netScore,
    totalNet: netScore,
    
    answerKey,
    studentAnswersMap,
    answers: detailedAnswers,
    mistakeReasons,
    
    raw: rawSub
  };
}

/**
 * Returns all unified submissions for a student across all sources, deduplicated and sorted by date.
 */
export function getAllUnifiedStudentSubmissions({
  studentId,
  submissions = [],
  homeworks = [],
  books = [],
  bookTests = [],
  mockExams = []
}) {
  if (!studentId) return [];

  const studentIdStr = String(studentId);
  const studentUuidStr = toUUID(studentIdStr);

  const isMatchStudent = (s) => {
    if (!s) return false;
    const sid = String(s.studentId ?? s.userId ?? s.student_id ?? '');
    return sid === studentIdStr || (studentUuidStr && sid === studentUuidStr) || (studentUuidStr && toUUID(sid) === studentUuidStr);
  };

  const results = [];
  const processedKeys = new Set();

  // 1. Process Homework Submissions (including Whole-Book Tasks)
  (homeworks || []).forEach(hw => {
    if (!hw) return;
    const hwSubList = Array.isArray(hw.submissions) && hw.submissions.length > 0
      ? hw.submissions
      : (Array.isArray(hw.raw_data?.submissions) ? hw.raw_data.submissions : []);

    const matchingSubs = [
      ...hwSubList.filter(isMatchStudent),
      ...(submissions || []).filter(s => isMatchStudent(s) && (
        String(s.hwId) === String(hw.id) ||
        String(s.homeworkId) === String(hw.id) ||
        String(s.testId) === String(hw.id)
      ))
    ].filter(s => s && s.status !== 'in_progress' && s.status !== 'draft');

    matchingSubs.forEach((sub, subIdx) => {
      const subWithHw = { ...sub, hwId: hw.id, homeworkTitle: hw.title };
      const normalized = normalizeUnifiedSubmission(subWithHw, { books, bookTests, homeworks });
      if (!normalized) return;

      const dedupeKey = `${normalized.testId}_${normalized.date}_${normalized.correctCount}_${normalized.wrongCount}`;
      if (processedKeys.has(dedupeKey) || processedKeys.has(normalized.id)) return;
      processedKeys.add(dedupeKey);
      processedKeys.add(normalized.id);
      if (sub.id) processedKeys.add(String(sub.id));
      if (sub.submissionId) processedKeys.add(String(sub.submissionId));

      results.push(normalized);
    });
  });

  // 2. Process Standalone Submissions (Book Tests, Study Room, Free Quizzes)
  (submissions || []).forEach(sub => {
    if (!sub || !isMatchStudent(sub)) return;
    if (sub.status === 'in_progress' || sub.status === 'draft') return;
    if (sub.id && processedKeys.has(String(sub.id))) return;
    if (sub.submissionId && processedKeys.has(String(sub.submissionId))) return;

    const normalized = normalizeUnifiedSubmission(sub, { books, bookTests, homeworks });
    if (!normalized) return;

    const dedupeKey = `${normalized.testId}_${normalized.date}_${normalized.correctCount}_${normalized.wrongCount}`;
    if (processedKeys.has(dedupeKey) || processedKeys.has(normalized.id)) return;
    processedKeys.add(dedupeKey);
    processedKeys.add(normalized.id);

    results.push(normalized);
  });

  // Sort newest first
  results.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

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

  // Search in submissions
  foundRawSub = (submissions || []).find(isMatch);

  // Search in homeworks
  if (!foundRawSub && homeworks) {
    for (const hw of homeworks) {
      const subs = hw.submissions || hw.raw_data?.submissions || [];
      const match = subs.find(isMatch);
      if (match) {
        foundRawSub = { ...match, hwId: hw.id };
        break;
      }
    }
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
    type: 'optik_form'
  } : null);

  return {
    submission: normalizedSubmission,
    test: normalizedTest
  };
}
