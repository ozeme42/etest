/**
 * Helper to extract question text robustly from any question object format.
 */
export function extractQuestionText(qObj, testObj = {}, index = 0) {
  if (!qObj) qObj = {};
  if (!testObj) testObj = {};

  const candidates = [
    qObj.questionText,
    qObj.text,
    qObj.question,
    qObj.title,
    qObj.questionTitle,
    qObj.stem,
    qObj.body,
    qObj.prompt,
    qObj.soruMetni,
    qObj.soru,
    qObj.content,
    qObj.description,
    qObj.name,
    qObj.questionTextHtml,
    qObj.htmlText,
    qObj.html,
    (typeof qObj.contentPayload === 'string' && !qObj.contentPayload.startsWith('http') && !qObj.contentPayload.startsWith('data:') && !qObj.contentPayload.startsWith('[') && !qObj.contentPayload.startsWith('{') && qObj.contentPayload !== '[STORED_IN_INDEXEDDB]' && qObj.contentPayload !== '[LOCALSTORAGE_CACHE]' ? qObj.contentPayload : null),
    (index === 0 ? (testObj.questionText || testObj.text || testObj.question || testObj.title) : null)
  ];

  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim() && !c.startsWith('data:') && !c.startsWith('http')) {
      return c.trim();
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
    optArray = rawOptions;
  } else if (rawOptions && typeof rawOptions === 'object') {
    const keys = ['A', 'B', 'C', 'D', 'E'];
    const foundKeys = keys.filter(k => rawOptions[k] !== undefined || rawOptions[k.toLowerCase()] !== undefined);
    if (foundKeys.length > 0) {
      optArray = keys.map(k => rawOptions[k] ?? rawOptions[k.toLowerCase()]);
    } else {
      optArray = Object.values(rawOptions);
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

  // Eğer tüm seçenekler gerçek metin içeriyorsa döndür
  const realOptions = mapped.filter(Boolean);
  if (realOptions.length > 0) return mapped.map((m, i) => m || String.fromCharCode(65 + i));

  // Tüm seçenekler boş - boş array döndür (soru girişi tamamlanmamış)
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

  // 3. If test has questionIds
  if (rawQuestions.length === 0 && foundTest.questionIds && Array.isArray(foundTest.questionIds) && foundTest.questionIds.length > 0) {
    rawQuestions = foundTest.questionIds.map((qId, idx) => {
      const bankMatch = allBankQuestions.find(bq =>
        String(bq.id) === String(qId) ||
        normalizeId(bq.id) === normalizeId(qId)
      );
      if (bankMatch) {
        // Eğer text tipli tekil soru ise doğrudan döndür (questionText ve options korunur)
        return {
          ...bankMatch,
          questionText: bankMatch.questionText || bankMatch.text || bankMatch.title || `Soru ${idx + 1}`,
          options: bankMatch.options || []
        };
      }
      return {
        id: qId,
        questionText: `Soru ${idx + 1}`,
        options: []
      };
    });
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
  else if (rawQuestions.length === 0 && (foundTest.contentPayload || foundTest.htmlPayload || foundTest.pdfPayload || foundTest.type || foundTest.contentType)) {
    rawQuestions = [foundTest];
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

/**
 * Checks if a homework assignment applies to the given student.
 * Handles individual student IDs, grade IDs, class IDs, and grade names robustly.
 */
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


