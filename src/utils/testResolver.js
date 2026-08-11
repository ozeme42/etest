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

