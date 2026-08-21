import { toUUID } from '../services/supabaseService';
import { getTurkeyYMD } from './dateHelpers';

/**
 * Intelligently extracts option choices (A, B, C, D, E) from raw question text if present.
 */
export function parseOptionsFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = rawText.trim();
  if (text.length < 4) return null;

  // Match patterns like:
  // A) ... B) ... C) ... D) ...
  // A. ... B. ... C. ... D. ...
  // [A] ... [B] ...
  // (A) ... (B) ...
  // A - ... B - ...
  // A: ... B: ...
  const optRegex = /(?:^|\s|\n)(?:\(|\[)?([A-Ea-e])(?:\)|\.|\:|\]|-)\s*([\s\S]*?)(?=(?:(?:\s|\n)(?:\(|\[)?[A-Ea-e](?:\)|\.|\:|\]|-)\s*)|$)/g;

  const matches = [];
  let m;
  while ((m = optRegex.exec(text)) !== null) {
    const letter = m[1].toUpperCase();
    const content = (m[2] || '').trim();
    matches.push({ letter, content, fullIndex: m.index });
  }

  if (matches.length >= 2) {
    const letters = matches.map(m => m.letter);
    const hasA = letters.includes('A');
    const hasB = letters.includes('B');
    if (hasA && hasB) {
      const optMap = {};
      matches.forEach(match => {
        if (!optMap[match.letter] && match.content) {
          optMap[match.letter] = match.content;
        }
      });

      const maxLetter = letters.includes('E') ? 'E' : (letters.includes('D') ? 'D' : (letters.includes('C') ? 'C' : 'B'));
      const count = maxLetter === 'E' ? 5 : (maxLetter === 'D' ? 4 : (maxLetter === 'C' ? 3 : 2));
      const opts = [];
      let foundAnyText = false;
      for (let i = 0; i < count; i++) {
        const L = String.fromCharCode(65 + i);
        const val = optMap[L] || '';
        if (val) foundAnyText = true;
        opts.push(val);
      }
      if (foundAnyText) {
        return opts;
      }
    }
  }
  return null;
}

/**
 * Strips option block (A) ... B) ...) from question stem if options were extracted from text.
 */
export function stripOptionsFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return rawText;
  const match = rawText.match(/(?:^|\s|\n)(?:\(|\[)?A(?:\)|\.|\:|\]|-)\s*[\s\S]*$/i);
  if (match && match.index > 0) {
    const stem = rawText.slice(0, match.index).trim();
    if (stem.length > 2) {
      return stem;
    }
  }
  return rawText;
}

/**
 * Helper to extract question text robustly from any question object format.
 */
export function extractQuestionText(qObj, testObj = {}, index = 0) {
  if (!qObj) qObj = {};
  if (!testObj) testObj = {};

  const isGenericSectionTitle = (str) => {
    if (!str || typeof str !== 'string') return true;
    const t = str.trim().toLowerCase();
    return (
      /^\d+\.\s*bölüm/i.test(t) ||
      /^bölüm\s*\d+/i.test(t) ||
      t === 'çoktan seçmeli bölüm' ||
      t === 'açık uçlu bölüm' ||
      t === 'genel test' ||
      t === 'ödev testi' ||
      t === 'sınav' ||
      t === 'kitap testi' ||
      t === 'kitap ödevi'
    );
  };

  const candidates = [
    qObj.questionText,
    qObj.text,
    qObj.question,
    qObj.soruMetni,
    qObj.soru,
    qObj.questionTitle,
    qObj.stem,
    qObj.body,
    qObj.prompt,
    qObj.content,
    qObj.description,
    qObj.questionTextHtml,
    qObj.htmlText,
    qObj.html,
    (typeof qObj.contentPayload === 'string' && !qObj.contentPayload.startsWith('http') && !qObj.contentPayload.startsWith('data:') && !qObj.contentPayload.startsWith('[') && !qObj.contentPayload.startsWith('{') && qObj.contentPayload !== '[STORED_IN_INDEXEDDB]' && qObj.contentPayload !== '[LOCALSTORAGE_CACHE]' ? qObj.contentPayload : null),
    (qObj.title && !isGenericSectionTitle(qObj.title) ? qObj.title : null),
    (index === 0 ? (testObj.questionText || testObj.text || testObj.soruMetni || testObj.soru || (testObj.title && !isGenericSectionTitle(testObj.title) ? testObj.title : null)) : null)
  ];

  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim() && !c.startsWith('data:') && !c.startsWith('http')) {
      const trimmed = c.trim();
      if (isGenericSectionTitle(trimmed)) continue;
      const parsedOpts = parseOptionsFromText(trimmed);
      if (parsedOpts && parsedOpts.length >= 2) {
        return stripOptionsFromText(trimmed);
      }
      return trimmed;
    }
  }

  return `Soru ${index + 1}`;
}

/**
 * Helper to extract option texts robustly from any question object format.
 */
export function extractQuestionOptions(qObj, testObj = {}) {
  if (!qObj) qObj = {};
  if (!testObj) testObj = {};

  const rawOptions = qObj.options || qObj.choices || qObj.secenekler || qObj.optionsList || qObj.answers || qObj.items || qObj.opt || testObj.options || testObj.choices || testObj.secenekler;

  let optArray = [];

  if (Array.isArray(rawOptions) && rawOptions.length > 0) {
    optArray = [...rawOptions];
  } else if (rawOptions && typeof rawOptions === 'object') {
    const keys = ['A', 'B', 'C', 'D', 'E'];
    const foundKeys = keys.filter(k => rawOptions[k] !== undefined || rawOptions[k.toLowerCase()] !== undefined);
    if (foundKeys.length > 0) {
      optArray = keys.map(k => rawOptions[k] ?? rawOptions[k.toLowerCase()]);
    } else {
      optArray = Object.values(rawOptions);
    }
  }

  // Check if options are embedded inside question text candidates
  const rawTextCandidates = [
    qObj.questionText,
    qObj.text,
    qObj.question,
    qObj.soruMetni,
    qObj.content,
    qObj.prompt,
    (typeof qObj.contentPayload === 'string' && !qObj.contentPayload.startsWith('http') && !qObj.contentPayload.startsWith('data:') && !qObj.contentPayload.startsWith('[') && !qObj.contentPayload.startsWith('{') ? qObj.contentPayload : null),
    testObj.questionText,
    testObj.text
  ].filter(t => t && typeof t === 'string');

  let parsedFromText = null;
  for (const rawText of rawTextCandidates) {
    parsedFromText = parseOptionsFromText(rawText);
    if (parsedFromText && parsedFromText.length >= 2) break;
  }

  if (parsedFromText && parsedFromText.length > 0) {
    if (optArray.length === 0) {
      optArray = parsedFromText;
    } else {
      // Merge: if optArray has empty or placeholder items, replace with parsedFromText
      optArray = optArray.map((opt, idx) => {
        const textVal = (typeof opt === 'string' ? opt : (opt?.text || opt?.optionText || '')).trim();
        const letter = String.fromCharCode(65 + idx);
        const lower = textVal.toLowerCase();
        const isPlaceholder = !textVal || lower === letter.toLowerCase() || lower === `şık ${letter.toLowerCase()}` || lower === `sik ${letter.toLowerCase()}` || lower === `seçenek ${letter.toLowerCase()}` || lower === `secenek ${letter.toLowerCase()}` || lower === `option ${letter.toLowerCase()}`;
        if (isPlaceholder && parsedFromText[idx]) {
          return parsedFromText[idx];
        }
        return opt;
      });
      if (optArray.length < parsedFromText.length) {
        for (let i = optArray.length; i < parsedFromText.length; i++) {
          optArray.push(parsedFromText[i]);
        }
      }
    }
  }

  if (optArray.length === 0) {
    return [];
  }

  const mapped = optArray.map((opt, optIdx) => {
    const optLabel = String.fromCharCode(65 + optIdx);
    if (typeof opt === 'string') {
      const trimmed = opt.trim();
      return trimmed || null;
    }
    if (opt && typeof opt === 'object') {
      const textCandidate = [
        opt.text,
        opt.optionText,
        opt.content,
        opt.value,
        opt.statement,
        opt.choice,
        opt.val,
        opt.title,
        opt.secenekText,
        opt.name,
        opt.answer,
        opt.label
      ].find(t => t && typeof t === 'string' && t.trim());

      if (textCandidate) return textCandidate.trim();
    }
    return null;
  });

  const realOptions = mapped.filter(Boolean);
  if (realOptions.length > 0) return mapped.map((m, i) => m || String.fromCharCode(65 + i));

  return [];
}

/**
 * Resolves full question objects for a given test from QuestionBank.
 */
export function resolveTestQuestions(foundTest, allBankQuestions = []) {
  if (!foundTest) return [];

  let rawQuestions = [];
  const normalizeId = (id) => String(id || '').replace(/^q_?/, '');

  // 1. If test has questionsList array (e.g. JSON package, optic package, or multi-question package)
  if (foundTest.questionsList && Array.isArray(foundTest.questionsList) && foundTest.questionsList.length > 0) {
    rawQuestions = foundTest.questionsList.map((q, idx) => {
      if (typeof q === 'string') {
        const bankMatch = allBankQuestions.find(bq => String(bq.id) === String(q) || normalizeId(bq.id) === normalizeId(q));
        return bankMatch || { id: q, questionText: `Soru ${idx + 1}` };
      }
      return {
        ...q,
        questionText: extractQuestionText(q, foundTest, idx),
        options: extractQuestionOptions(q, foundTest)
      };
    });
  }
  // 2. If contentPayload is a JSON string containing an array of questions or { questions: [...] }
  else if (typeof foundTest.contentPayload === 'string' && (foundTest.contentPayload.trim().startsWith('[') || foundTest.contentPayload.trim().startsWith('{'))) {
    try {
      const parsed = JSON.parse(foundTest.contentPayload);
      const list = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.questionsList || parsed.items || null);
      if (list && Array.isArray(list) && list.length > 0) {
        rawQuestions = list.map((q, idx) => ({
          ...q,
          id: q.id || `${foundTest.id || 'q'}_${idx + 1}`,
          questionText: extractQuestionText(q, foundTest, idx),
          options: extractQuestionOptions(q, foundTest)
        }));
      }
    } catch {}
  }

  // 3. If test has questionIds, selectedQuestions, tests, or items
  const candidateIdList = foundTest.questionIds || foundTest.selectedQuestions || foundTest.tests || foundTest.items || null;
  if (rawQuestions.length === 0 && Array.isArray(candidateIdList) && candidateIdList.length > 0) {
    const unbundled = [];
    candidateIdList.forEach((qId, idx) => {
      const rawId = typeof qId === 'object' ? (qId.id || qId.questionId) : qId;
      const bankMatch = allBankQuestions.find(bq =>
        String(bq.id) === String(rawId) ||
        normalizeId(bq.id) === normalizeId(rawId)
      ) || (typeof qId === 'object' ? qId : null);

      if (bankMatch) {
        if (bankMatch.questionsList && Array.isArray(bankMatch.questionsList) && bankMatch.questionsList.length > 0) {
          bankMatch.questionsList.forEach((subQ, subIdx) => {
            unbundled.push({
              ...subQ,
              id: subQ.id || `${bankMatch.id || rawId}_sub_${subIdx + 1}`,
              questionNo: subIdx + 1,
              questionText: extractQuestionText(subQ, bankMatch, subIdx),
              options: extractQuestionOptions(subQ, bankMatch)
            });
          });
        } else if (typeof bankMatch.contentPayload === 'string' && (bankMatch.contentPayload.trim().startsWith('[') || bankMatch.contentPayload.trim().startsWith('{'))) {
          try {
            const parsed = JSON.parse(bankMatch.contentPayload);
            const list = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.questionsList || parsed.items || null);
            if (list && Array.isArray(list) && list.length > 0) {
              list.forEach((subQ, subIdx) => {
                unbundled.push({
                  ...subQ,
                  id: subQ.id || `${bankMatch.id || rawId}_sub_${subIdx + 1}`,
                  questionNo: subIdx + 1,
                  questionText: extractQuestionText(subQ, bankMatch, subIdx),
                  options: extractQuestionOptions(subQ, bankMatch)
                });
              });
            } else {
              unbundled.push({
                ...bankMatch,
                questionText: extractQuestionText(bankMatch, foundTest, idx),
                options: extractQuestionOptions(bankMatch, foundTest)
              });
            }
          } catch {
            unbundled.push({
              ...bankMatch,
              questionText: extractQuestionText(bankMatch, foundTest, idx),
              options: extractQuestionOptions(bankMatch, foundTest)
            });
          }
        } else {
          unbundled.push({
            ...bankMatch,
            questionText: extractQuestionText(bankMatch, foundTest, idx),
            options: extractQuestionOptions(bankMatch, foundTest)
          });
        }
      } else {
        unbundled.push({
          id: rawId,
          questionText: `Soru ${idx + 1}`,
          options: []
        });
      }
    });
    if (unbundled.length > 0) {
      rawQuestions = unbundled;
    }
  }
  // 4. If test has questions array directly
  else if (rawQuestions.length === 0 && foundTest.questions && Array.isArray(foundTest.questions) && foundTest.questions.length > 0) {
    rawQuestions = foundTest.questions.map((q, idx) => {
      if (typeof q === 'string') {
        const bankMatch = allBankQuestions.find(bq => String(bq.id) === String(q) || normalizeId(bq.id) === normalizeId(q));
        return bankMatch || { id: q, questionText: `Soru ${idx + 1}`, options: ['A','B','C','D','E'] };
      }
      return {
        ...q,
        questionText: extractQuestionText(q, foundTest, idx),
        options: extractQuestionOptions(q, foundTest)
      };
    });
  }
  // 5. Fallback: single item
  else if (rawQuestions.length === 0 && (foundTest.contentPayload || foundTest.htmlPayload || foundTest.pdfPayload || foundTest.type || foundTest.contentType || foundTest.imageUrl || foundTest.imageUrls)) {
    rawQuestions = [foundTest];
  }

  // Unbundle multi-image question sets if single container with multiple images
  if (rawQuestions.length === 1) {
    const singleQ = rawQuestions[0];
    let imgs = [];
    if (Array.isArray(singleQ.imageUrls) && singleQ.imageUrls.length > 1) {
      imgs = singleQ.imageUrls.filter(u => typeof u === 'string' && !u.startsWith('[STORED_IN_'));
    } else if (typeof singleQ.contentPayload === 'string' && (singleQ.contentPayload.includes('\n\n') || singleQ.contentPayload.includes('|'))) {
      imgs = singleQ.contentPayload.split(/\n\n|\|/).map(s => s.trim()).filter(s => s.startsWith('data:image/') || s.startsWith('http') || /\.(png|jpe?g|webp|gif)/i.test(s));
    }
    if (imgs.length > 1) {
      rawQuestions = imgs.map((imgUrl, imgIdx) => ({
        ...singleQ,
        id: `${singleQ.id || 'q'}_sub_${imgIdx + 1}`,
        questionNo: imgIdx + 1,
        questionText: `Soru ${imgIdx + 1}`,
        imageUrl: imgUrl,
        imageUrls: [imgUrl],
        options: singleQ.options || ['A', 'B', 'C', 'D', 'E']
      }));
    }
  }

  // Final check: enrich items from allBankQuestions if needed
  const finalQuestions = rawQuestions.map((q, idx) => {
    if (q.id && (!q.contentPayload && !q.htmlPayload && !q.pdfPayload && !q.questionText)) {
      const matched = allBankQuestions.find(bq => String(bq.id) === String(q.id) || normalizeId(bq.id) === normalizeId(q.id));
      if (matched) return { ...matched, ...q };
    }
    return {
      ...q,
      questionText: extractQuestionText(q, foundTest, idx),
      options: extractQuestionOptions(q, foundTest)
    };
  });

  return finalQuestions;
}
export function isHomeworkForStudent(hw, student, grades = []) {
  if (!hw || !student) return false;
  const studentId = String(student.id || student.studentId || '');
  const targetIds = Array.isArray(hw.targetIds) ? hw.targetIds.map(String) : [];

  // 1. Direct student target
  if (hw.targetType === 'student') {
    return targetIds.includes(studentId);
  }

  // 2. Class / Grade target
  if (hw.targetType === 'grade' || hw.targetType === 'class' || !hw.targetType) {
    if (targetIds.length === 0) return true; // General assignment to everyone

    // Gather all possible identifiers for the student
    const studentIdentifiers = new Set([
      studentId,
      String(student.gradeId || ''),
      String(student.classId || ''),
      String(student.grade || ''),
      String(student.className || '')
    ]);

    // Also add grade names/IDs from grades list matching student's grade
    if (grades && Array.isArray(grades)) {
      grades.forEach(g => {
        const gId = String(g.id);
        const gName = String(g.name || '');
        if (studentIdentifiers.has(gId) || (gName && studentIdentifiers.has(gName))) {
          studentIdentifiers.add(gId);
          if (gName) studentIdentifiers.add(gName);
        }
      });
    }

    // Remove empty string
    studentIdentifiers.delete('');

    // Check if any targetId matches student's identifiers
    return targetIds.some(tid => {
      if (studentIdentifiers.has(tid)) return true;
      const matchedGrade = grades.find(g => String(g.id) === tid || String(g.name) === tid);
      if (matchedGrade) {
        if (studentIdentifiers.has(String(matchedGrade.id)) || (matchedGrade.name && studentIdentifiers.has(String(matchedGrade.name)))) {
          return true;
        }
      }
      return false;
    });
  }

  return targetIds.includes(studentId);
}

/**
 * Sorts an array of day items according to the official Book Tracking hierarchy:
 * 1. Book sequence (in `books` list / by book title)
 * 2. Subject sequence in book (`subject.topics` structure)
 * 3. Topic sequence in subject
 * 4. Test definition order in `bookTests` & natural numeric test sorting ("Test 1" before "Test 2" before "Test 10")
 * 5. Fallback task priority (Kitap/Ödev -> Konu -> Serbest/Manuel)
 */
export function sortItemsByBookOrder(items, books = [], bookTests = []) {
  if (!Array.isArray(items) || items.length <= 1) return items || [];

  const bookMap = new Map();
  (books || []).forEach((b, idx) => {
    if (b?.id) {
      bookMap.set(String(b.id), { index: idx, book: b });
      const bUuid = String(b.id).replace(/-/g, '');
      if (bUuid) bookMap.set(bUuid, { index: idx, book: b });
    }
  });

  const testMap = new Map();
  (bookTests || []).forEach((t, idx) => {
    if (t?.id) {
      testMap.set(String(t.id), { index: idx, test: t });
      const tUuid = String(t.id).replace(/-/g, '');
      if (tUuid) testMap.set(tUuid, { index: idx, test: t });
    }
  });

  return [...items].sort((a, b) => {
    // 1. Task type priority: Book tests & Quizzes first, then Topics/Roadmaps, then Manual/Schedule
    const getTypePriority = (it) => {
      if (it.taskType === 'kitap' || it.testId || it.bookTitle) return 1;
      if (it.taskType === 'ödev' || it.hwId) return 2;
      if (it.taskType === 'konu' || it.isRoadmapTask) return 3;
      return 4;
    };
    const prioA = getTypePriority(a);
    const prioB = getTypePriority(b);
    if (prioA !== prioB) return prioA - prioB;

    // 2. Book Level Match
    const tObjA = a.testId ? testMap.get(String(a.testId))?.test : null;
    const tObjB = b.testId ? testMap.get(String(b.testId))?.test : null;

    const bookIdA = a.bookId || tObjA?.bookId || (a.hwId && a.isAutoHomework ? a.bookId : null);
    const bookIdB = b.bookId || tObjB?.bookId || (b.hwId && b.isAutoHomework ? b.bookId : null);

    const bInfoA = bookIdA ? bookMap.get(String(bookIdA)) : null;
    const bInfoB = bookIdB ? bookMap.get(String(bookIdB)) : null;

    const bookIndexA = bInfoA ? bInfoA.index : 9999;
    const bookIndexB = bInfoB ? bInfoB.index : 9999;

    if (bookIndexA !== bookIndexB) {
      return bookIndexA - bookIndexB;
    }

    // Book Title alphabetical if indices are same
    const bookTitleA = (a.bookTitle || bInfoA?.book?.title || a.subject || '').trim();
    const bookTitleB = (b.bookTitle || bInfoB?.book?.title || b.subject || '').trim();
    const bookTitleComp = bookTitleA.localeCompare(bookTitleB, 'tr', { sensitivity: 'base' });
    if (bookTitleComp !== 0) return bookTitleComp;

    // 3. Subject and Topic Hierarchy within the same Book
    const bookObj = bInfoA?.book || bInfoB?.book;
    if (bookObj && Array.isArray(bookObj.subjects) && tObjA && tObjB) {
      const sIdxA = bookObj.subjects.findIndex(s => String(s.id) === String(tObjA.subjectId));
      const sIdxB = bookObj.subjects.findIndex(s => String(s.id) === String(tObjB.subjectId));
      if (sIdxA !== -1 && sIdxB !== -1 && sIdxA !== sIdxB) {
        return sIdxA - sIdxB;
      }
      if (sIdxA !== -1) {
        const subj = bookObj.subjects[sIdxA];
        if (subj && Array.isArray(subj.topics)) {
          const tpIdxA = subj.topics.findIndex(tp => String(tp.id) === String(tObjA.topicId));
          const tpIdxB = subj.topics.findIndex(tp => String(tp.id) === String(tObjB.topicId));
          if (tpIdxA !== -1 && tpIdxB !== -1 && tpIdxA !== tpIdxB) {
            return tpIdxA - tpIdxB;
          }
        }
      }
    }

    // 4. Test Index in bookTests
    const tIndexA = a.testId && testMap.has(String(a.testId)) ? testMap.get(String(a.testId)).index : 99999;
    const tIndexB = b.testId && testMap.has(String(b.testId)) ? testMap.get(String(b.testId)).index : 99999;
    if (tIndexA !== tIndexB && tIndexA !== 99999 && tIndexB !== 99999) {
      return tIndexA - tIndexB;
    }

    // 5. Natural Alphanumeric Sorting by Test Name / Title (e.g. "Test 1" < "Test 2" < "Test 10")
    const titleA = a.testName || a.title || a.name || '';
    const titleB = b.testName || b.title || b.name || '';
    return titleA.localeCompare(titleB, 'tr', { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Computes synchronized, clean, and normalized analytics data for any student:
 * - Filters out deleted homework submissions (only includes active homeworks and valid book tests)
 * - Excludes in-progress/drafts and empty unsubmitted items
 * - Separates mock exams (generalTrialExams) and regular homeworks (otherHomeworkSubmissions)
 * - Guarantees 100% data consistency between Coaching Page, Student Dashboard, and Results Page!
 */
export function computeStudentAnalyticsData({
  studentId,
  targetStudent = null,
  submissions = [],
  homeworks = [],
  books = [],
  bookTests = [],
  studentMockExams = []
}) {
  if (!studentId && !targetStudent) {
    return { generalTrialExams: [], otherHomeworkSubmissions: [] };
  }

  const studentIdStr = String(studentId || targetStudent?.id || '').trim();
  const studentUuidStr = String(toUUID(studentIdStr) || '').trim();
  const studentNameClean = (targetStudent?.name || targetStudent?.fullName || '').trim().toLowerCase();
  const studentEmailClean = (targetStudent?.email || '').trim().toLowerCase();

  const isStudentMatch = (s) => {
    if (!s) return false;
    const raw = s.raw_data || {};
    const sid = String(s.studentId || s.student_id || s.userId || s.user_id || raw.studentId || raw.student_id || raw.userId || '').trim();

    // Direct ID check
    if (studentIdStr && sid) {
      if (sid === studentIdStr || sid.toLowerCase() === studentIdStr.toLowerCase()) return true;
      if (studentUuidStr && (sid === studentUuidStr || String(toUUID(sid)) === studentUuidStr)) return true;
    }

    // Name check
    const sName = (s.studentName || s.student_name || raw.studentName || raw.student_name || '').trim().toLowerCase();
    if (studentNameClean && sName && (sName === studentNameClean || sName.includes(studentNameClean) || studentNameClean.includes(sName))) return true;

    // Email check
    const sEmail = (s.studentEmail || s.student_email || s.email || raw.studentEmail || raw.student_email || '').trim().toLowerCase();
    if (studentEmailClean && sEmail && sEmail === studentEmailClean) return true;

    return false;
  };

  const normalizeSub = (s, parentHw, defaultType = 'online', subDate = null, testObj = null, bookObj = null) => {
    let title = s.title || s.testTitle || parentHw?.title || 'Sınav / Test';

    let isExamBook = false;
    if (bookObj && bookObj.bookType === 'exam') {
      isExamBook = true;
    }

    if (testObj && bookObj) {
      const cleanBook = (bookObj.title || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();
      const testName = testObj.name || s.testTitle || s.title || 'Test';
      title = cleanBook ? `${cleanBook} — ${testName}` : testName;
    } else {
      title = (s.title || s.testTitle || parentHw?.title || 'Sınav / Test')
        .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
        .replace(/\s*\(Tüm Kitap\)/gi, '')
        .replace(/\s*\(Kendi Eklediğim\)/gi, '')
        .trim();
    }

    const isTrial = isExamBook || s.isDeneme || s.isExam || parentHw?.isDeneme || /deneme|lgs|yks|tyt|ayt|bursluluk|kurumsal/i.test(title);

    let correct = s.correctCount ?? s.correct ?? s.totalCorrect ?? 0;
    let wrong = s.wrongCount ?? s.wrong ?? s.totalWrong ?? 0;
    let empty = s.emptyCount ?? s.blankCount ?? s.empty ?? s.totalEmpty ?? 0;

    // Extract from answers array if available
    if (!correct && !wrong && !empty && Array.isArray(s.answers) && s.answers.length > 0) {
      correct = s.answers.filter(a => a.isCorrect === true || a.earnedPoints > 0).length;
      wrong = s.answers.filter(a => a.isCorrect === false).length;
      empty = Math.max(0, s.answers.length - (correct + wrong));
    }

    // Total questions
    const totalQ = parentHw?.totalQuestions || parentHw?.questionCount || testObj?.questionCount || s.totalQuestions || (correct + wrong + empty) || 10;

    // Deduce D/Y/B if score was stored as 0-100 percentage or points without D/Y/B
    if (!correct && !wrong && s.score !== undefined && s.score !== null) {
      const numScore = parseFloat(s.score) || 0;
      if (numScore <= totalQ && numScore > 0) {
        correct = Math.round(numScore);
      } else if (numScore > 0) {
        correct = Math.round((numScore / 100) * totalQ);
      }
      empty = Math.max(0, totalQ - (correct + wrong));
    }

    // Net calculation
    let net = 0;
    if (s.net !== undefined && s.net !== null) {
      net = parseFloat(s.net);
    } else if (s.totalNet !== undefined && s.totalNet !== null) {
      net = parseFloat(s.totalNet);
    } else if (correct > 0 || wrong > 0) {
      const penaltyRatio = /lgs|bursluluk/i.test(title) ? 3 : 4;
      net = Math.max(0, correct - (wrong / penaltyRatio));
    } else if (s.score !== undefined && parseFloat(s.score) <= totalQ) {
      net = parseFloat(s.score);
    }

    // Clean subject detection
    let subject = '';
    if (testObj && bookObj) {
      const subjObj = (bookObj.subjects || []).find(sb => String(sb.id) === String(testObj.subjectId));
      subject = subjObj?.name || bookObj.subject || '';
    } else {
      subject = s.subject || parentHw?.subject || '';
    }

    const KNOWN_SUBJECTS = ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü'];
    if (!KNOWN_SUBJECTS.includes(subject)) {
      const lower = (title + ' ' + (subject || '') + ' ' + (parentHw?.title || '')).toLowerCase();
      if (lower.includes('matematik') || lower.includes('geometri')) subject = 'Matematik';
      else if (lower.includes('türkçe') || lower.includes('paragraf') || lower.includes('edebiyat')) subject = 'Türkçe';
      else if (lower.includes('fen') || lower.includes('fizik') || lower.includes('kimya') || lower.includes('biyoloji')) subject = 'Fen Bilimleri';
      else if (lower.includes('sosyal') || lower.includes('tarih') || lower.includes('coğrafya') || lower.includes('inkılap')) subject = 'Sosyal Bilgiler';
      else if (lower.includes('ingilizce') || lower.includes('english')) subject = 'İngilizce';
      else if (lower.includes('din')) subject = 'Din Kültürü';
      else subject = 'Genel / Diğer';
    }

    const cleanDate = getTurkeyYMD(subDate || s.submittedAt || s.completedAt || s.createdAt || s.date);

    return {
      id: s.id || `sub_${Date.now()}_${Math.random()}`,
      originalSubmissionId: s.id,
      title,
      subject,
      date: cleanDate,
      totalNet: parseFloat(net.toFixed(2)),
      correctCount: correct,
      wrongCount: wrong,
      emptyCount: empty,
      sourceType: defaultType,
      approvalStatus: 'approved',
      isTrial,
      isExamBook,
      parentBookId: bookObj?.id || null,
      hwId: s.hwId || parentHw?.id || null,
      subjectName: subject
    };
  };

  // 1. Online Sınavlar & Kitap Testleri
  const onlineEval = [];
  const processedSubIds = new Set();

  (submissions || []).forEach(s => {
    if (!s) return;
    if (!isStudentMatch(s)) return;

    const subIdStr = String(s.id || s.supabaseId || '');
    if (subIdStr.startsWith('draft_') || subIdStr.startsWith('64726166')) return;
    if (s.status === 'in_progress' || s.status === 'draft') return;
    const raw = s.raw_data || {};
    if (raw.status === 'draft' || raw.status === 'in_progress') return;

    // Only approved manual tests count towards system analytics and statistics
    const isManualTest = s.isManual === true || s.sourceType === 'manual_test' || raw.isManual === true || raw.sourceType === 'manual_test' || String(s.id || '').startsWith('sub_manual') || String(s.testId || '').startsWith('sub_manual');
    if (isManualTest) {
      const isApproved = s.approvalStatus === 'approved' || s.isApproved === true || s.status === 'completed' || raw.approvalStatus === 'approved' || raw.isApproved === true;
      if (!isApproved) return;
    }

    let correct = s.correctCount ?? raw.correctCount ?? 0;
    let wrong = s.wrongCount ?? raw.wrongCount ?? 0;
    let empty = s.emptyCount ?? s.blankCount ?? raw.emptyCount ?? raw.blankCount ?? 0;

    if (!correct && !wrong && !empty && Array.isArray(s.answers) && s.answers.length > 0) {
      correct = s.answers.filter(a => a.isCorrect === true || a.earnedPoints > 0).length;
      wrong = s.answers.filter(a => a.isCorrect === false).length;
      empty = Math.max(0, s.answers.length - (correct + wrong));
    }

    // Soru çözülmemiş/boş taslakları atla
    if (correct === 0 && wrong === 0 && empty === 0 && (!s.answers || s.answers.length === 0)) return;

    const subDate = s.submittedAt || s.completedAt || raw.submittedAt || s.createdAt || s.date;
    if (!subDate) return;

    const bTestId = String(s.bookTestId || s.testId || raw.bookTestId || raw.testId || '');
    const testObj = (bookTests || []).find(bt => String(bt.id) === bTestId || (toUUID(bt.id) && String(toUUID(bt.id)) === bTestId));
    const bookObj = (books || []).find(b => String(b.id) === String(s.bookId || raw.bookId || testObj?.bookId) || (toUUID(b.id) && String(toUUID(b.id)) === String(s.bookId || raw.bookId || testObj?.bookId)));
    const parentHw = (homeworks || []).find(h => String(h.id) === String(s.testId) || String(h.id) === String(s.hwId) || String(h.id) === String(s.homeworkId) || (toUUID(h.id) && (String(toUUID(h.id)) === String(s.testId) || String(toUUID(h.id)) === String(s.hwId))));

    if (!isManualTest) {
      // If parent homework is linked to a book/exam that was deleted, discard it
      if (parentHw && parentHw.bookId && !books.some(b => String(b.id) === String(parentHw.bookId) || toUUID(b.id) === toUUID(parentHw.bookId))) {
        return;
      }

      // If submission is linked to a book/exam that was deleted, discard it
      if ((s.bookId || s.bookTestId || s.isExamBook) && !bookObj && !testObj) {
        return;
      }

      // If submission is linked to a homework that has been deleted (and is not an independent tracked book test), discard it!
      const isHwSub = Boolean(s.hwId || s.homeworkId || (s.testId && !testObj));
      if (isHwSub && !parentHw) {
        return; // Deleted homework!
      }

      if (!bookObj && !testObj && !parentHw) {
        return; // Orphaned submission for a deleted test/exam
      }
    }

    const dedupeKey = s.id ? String(s.id) : `${bTestId}_${subDate}`;
    if (processedSubIds.has(dedupeKey)) return;
    processedSubIds.add(dedupeKey);

    onlineEval.push(normalizeSub(s, parentHw, 'online', subDate, testObj, bookObj));
  });

  // 2. HomeworkContext Optik / Ödev Sınavları
  const hwSubmissions = [];
  (homeworks || []).forEach(hw => {
    if (!hw) return;
    if (hw.bookId && !books.some(b => String(b.id) === String(hw.bookId) || toUUID(b.id) === toUUID(hw.bookId))) {
      return; // Deleted book or exam!
    }
    if (hw.type === 'physicalExam' && !books.some(b => String(b.id) === String(hw.bookId) || toUUID(b.id) === toUUID(hw.bookId))) {
      return; // Deleted physical exam!
    }
    if (hw.isBookAssignment || hw.bookId || hw.title?.includes('(Tüm Kitap Görevi)') || hw.title?.includes('(Tüm Kitap)') || hw.title?.includes('(Kendi Eklediğim)')) {
      return;
    }
    if (hw.submissions && Array.isArray(hw.submissions)) {
      hw.submissions.forEach(sub => {
        if (isStudentMatch(sub)) {
          const subIdStr = String(sub.id || '');
          if (subIdStr.startsWith('draft_') || sub.status === 'in_progress' || sub.status === 'draft') return;
          if (sub.isSubmitted === false) return;
          const sDate = sub.submittedAt || sub.completedAt || sub.createdAt || hw.createdAt;
          if (!sDate) return;
          hwSubmissions.push(normalizeSub(sub, hw, 'optik', sDate));
        }
      });
    }
  });

  // 3. Fiziki Deneme Modülü Sınavları
  const manualExams = (studentMockExams || []).map(m => {
    let tD = m.totalCorrect ?? m.correctCount ?? m.correct ?? 0;
    let tY = m.totalWrong ?? m.wrongCount ?? m.wrong ?? 0;
    let tB = m.totalEmpty ?? m.emptyCount ?? m.blankCount ?? m.empty ?? 0;
    if (tD === 0 && tY === 0 && tB === 0 && m.scores && typeof m.scores === 'object') {
      Object.values(m.scores).forEach(sc => {
        tD += Number(sc?.d || sc?.correct || 0);
        tY += Number(sc?.y || sc?.wrong || 0);
        tB += Number(sc?.b || sc?.empty || sc?.blank || 0);
      });
    }
    return {
      id: m.id,
      title: m.title || 'Fiziki Deneme Sınavı',
      date: getTurkeyYMD(m.date || m.createdAt || m.submittedAt),
      totalNet: parseFloat(m.totalNet) || 0,
      sourceType: 'manual',
      approvalStatus: m.approvalStatus || (m.createdBy === 'student' ? 'pending' : 'approved'),
      scores: m.scores || {},
      totalCorrect: tD,
      totalWrong: tY,
      totalEmpty: tB,
      isTrial: true
    };
  });

  const seen = new Set();
  const all = [];
  [...manualExams, ...onlineEval, ...hwSubmissions].forEach(item => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      all.push(item);
    }
  });

  const trials = [];
  const homeworksOnly = [];
  const groupedExams = {};

  all.forEach(item => {
    if (item.sourceType === 'manual') {
      trials.push(item);
    } else if (item.isExamBook) {
      const groupKey = `${item.parentBookId}_${item.date}`;
      if (!groupedExams[groupKey]) {
        groupedExams[groupKey] = {
          id: `grp_${groupKey}`,
          title: item.title,
          date: item.date,
          totalNet: 0,
          totalCorrect: 0,
          totalWrong: 0,
          totalEmpty: 0,
          sourceType: item.sourceType,
          approvalStatus: item.approvalStatus,
          isTrial: true,
          scores: {},
          submissions: []
        };
      }

      const group = groupedExams[groupKey];
      const subj = item.subjectName || item.subject || 'Genel';
      group.scores[subj] = {
        d: item.correctCount || 0,
        y: item.wrongCount || 0,
        b: item.emptyCount || 0,
        net: item.totalNet || 0
      };
      if (item.originalSubmissionId) group.submissions.push(item.originalSubmissionId);
    } else {
      if (item.isTrial) {
        if (!item.scores) {
          const sName = item.subject || item.subjectName || 'Genel';
          item.scores = {
            [sName]: {
              d: item.correctCount || 0,
              y: item.wrongCount || 0,
              b: item.emptyCount || 0,
              net: item.totalNet || 0
            }
          };
        }
        item.totalCorrect = item.totalCorrect ?? item.correctCount ?? 0;
        item.totalWrong = item.totalWrong ?? item.wrongCount ?? 0;
        item.totalEmpty = item.totalEmpty ?? item.emptyCount ?? 0;
        trials.push(item);
      } else {
        homeworksOnly.push(item);
      }
    }
  });

  Object.values(groupedExams).forEach(grp => {
    let tNet = 0, tCorrect = 0, tWrong = 0, tEmpty = 0;
    Object.values(grp.scores).forEach(sc => {
      tNet += sc.net || 0;
      tCorrect += sc.d || 0;
      tWrong += sc.y || 0;
      tEmpty += sc.b || 0;
    });
    grp.totalNet = parseFloat(tNet.toFixed(2));
    grp.totalCorrect = tCorrect;
    grp.totalWrong = tWrong;
    grp.totalEmpty = tEmpty;
    trials.push(grp);
  });

  trials.sort((a, b) => new Date(b.date) - new Date(a.date));
  homeworksOnly.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { generalTrialExams: trials, otherHomeworkSubmissions: homeworksOnly };
}


