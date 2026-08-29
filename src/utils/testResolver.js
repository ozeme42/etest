import { toUUID } from '../services/supabaseService';
import { getTurkeyYMD, extractItemDate } from './dateHelpers';
import { checkIsAnswerCorrect, resolveQuestionCorrectAnswer, formatAnswerLetter, normalizeAnswerIndex } from './answerEvaluation';
import { normalizeUnifiedTest, normalizeUnifiedSubmission } from '../services/unifiedQuizAdapter';
import { getAllUnifiedStudentSubmissions } from '../services/unifiedResultAdapter';
import { extractImageUrls } from '../components/quiz/common/ImageLightbox';

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

export const hasMeaningfulOptions = (opts) => {
  if (!Array.isArray(opts) || opts.length === 0) return false;
  return opts.some((opt, idx) => {
    const text = typeof opt === 'string' ? opt : (opt?.text || opt?.optionText || opt?.label || opt?.title || '');
    const clean = text.trim().toLowerCase();
    const letter = String.fromCharCode(65 + idx).toLowerCase();
    return clean && clean !== letter && clean !== `şık ${letter}` && clean !== `sik ${letter}` && clean !== `seçenek ${letter}` && clean !== `secenek ${letter}`;
  });
};

/**
 * Helper to extract option texts robustly from any question object format.
 */
export function extractQuestionOptions(qObj, testObj = {}) {
  if (!qObj) qObj = {};
  if (!testObj) testObj = {};

  const parseOptionsFromTarget = (target) => {
    if (!target) return null;
    if (hasMeaningfulOptions(target.options)) return target.options;
    if (hasMeaningfulOptions(target.choices)) return target.choices;
    if (hasMeaningfulOptions(target.secenekler)) return target.secenekler;
    if (hasMeaningfulOptions(target.optionsList)) return target.optionsList;
    if (hasMeaningfulOptions(target.answers)) return target.answers;
    if (hasMeaningfulOptions(target.items)) return target.items;
    if (hasMeaningfulOptions(target.opt)) return target.opt;
    if (hasMeaningfulOptions(target.raw_data?.options)) return target.raw_data.options;
    if (hasMeaningfulOptions(target.bankQ?.options)) return target.bankQ.options;
    if (hasMeaningfulOptions(target.bankQ?.choices)) return target.bankQ.choices;
    if (hasMeaningfulOptions(target.bankQ?.raw_data?.options)) return target.bankQ.raw_data.options;

    // Check explanation JSON
    for (const exp of [target.explanation, target.bankQ?.explanation, target.raw_data?.explanation]) {
      if (typeof exp === 'string' && exp.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(exp);
          if (hasMeaningfulOptions(parsed.options)) return parsed.options;
          if (hasMeaningfulOptions(parsed.choices)) return parsed.choices;
          if (hasMeaningfulOptions(parsed.secenekler)) return parsed.secenekler;
        } catch {}
      }
    }

    // Check contentPayload JSON
    for (const cp of [target.contentPayload, target.content_payload, target.bankQ?.contentPayload]) {
      if (typeof cp === 'string' && cp.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(cp);
          if (hasMeaningfulOptions(parsed.options)) return parsed.options;
          if (hasMeaningfulOptions(parsed.choices)) return parsed.choices;
          if (hasMeaningfulOptions(parsed.secenekler)) return parsed.secenekler;
        } catch {}
      }
    }

    return null;
  };

  let rawOptions = parseOptionsFromTarget(qObj) || parseOptionsFromTarget(testObj) || qObj.options || testObj.options;

  if (typeof rawOptions === 'string') {
    const trimmed = rawOptions.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        rawOptions = JSON.parse(trimmed);
      } catch {}
    }
  }

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

  const cleanOptionPrefix = (str, idx) => {
    if (!str || typeof str !== 'string') return str;
    const letter = String.fromCharCode(65 + idx);
    const regex = new RegExp(`^(?:\\(|\\[)?${letter}(?:\\)|\\.|\\:|\\]|-)\\s*`, 'i');
    return str.replace(regex, '').trim();
  };

  const mapped = optArray.map((opt, optIdx) => {
    const optLabel = String.fromCharCode(65 + optIdx);
    if (typeof opt === 'string') {
      const trimmed = cleanOptionPrefix(opt.trim(), optIdx);
      return trimmed || opt.trim();
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

      if (textCandidate) return cleanOptionPrefix(textCandidate.trim(), optIdx) || textCandidate.trim();
    }
    return String.fromCharCode(65 + optIdx);
  });

  return mapped.length > 0 ? mapped : [];
}

export const normalizeId = (id) => String(id || '').replace(/^hw_/, '').replace(/^q_?/, '').replace(/^bt_?/, '').replace(/^tbt_?/, '');

/**
 * Resolves full question objects for a given test from QuestionBank.
 */
export function resolveTestQuestions(foundTest, allBankQuestions = []) {
  if (!foundTest) return [];

  let rawQuestions = [];

  // 1. If test has sections array
  if (rawQuestions.length === 0 && foundTest.sections && Array.isArray(foundTest.sections) && foundTest.sections.length > 0) {
    const unbundledSecs = [];
    foundTest.sections.forEach((sec, sIdx) => {
      if (sec.resolvedQuestions && Array.isArray(sec.resolvedQuestions) && sec.resolvedQuestions.length > 0) {
        unbundledSecs.push(...sec.resolvedQuestions);
      } else if (sec.questions && Array.isArray(sec.questions) && sec.questions.length > 0) {
        unbundledSecs.push(...sec.questions);
      } else {
        const res = resolveTestQuestions(sec, allBankQuestions);
        if (res && res.length > 0) {
          unbundledSecs.push(...res);
        } else {
          unbundledSecs.push(sec);
        }
      }
    });
    if (unbundledSecs.length > 0) {
      rawQuestions = unbundledSecs;
    }
  }

  // 2. If test has questionsList array (e.g. JSON package, optic package, or multi-question package)
  if (rawQuestions.length === 0 && foundTest.questionsList && Array.isArray(foundTest.questionsList) && foundTest.questionsList.length > 0) {
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
  // 3. If contentPayload is a JSON string containing an array of questions or { questions: [...] }
  else if (rawQuestions.length === 0 && typeof foundTest.contentPayload === 'string' && (foundTest.contentPayload.trim().startsWith('[') || foundTest.contentPayload.trim().startsWith('{'))) {
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

  // 4. If test has questionIds, selectedQuestions, tests, or items
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
  // 5. If test has questions array directly
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
  // 6. Fallback: single item
  else if (rawQuestions.length === 0 && (foundTest.contentPayload || foundTest.htmlPayload || foundTest.pdfPayload || foundTest.type || foundTest.contentType || foundTest.imageUrl || foundTest.imageUrls)) {
    rawQuestions = [foundTest];
  }

  // Unbundle multi-image question sets if single container with multiple images
  if (rawQuestions.length === 1) {
    const singleQ = rawQuestions[0];
    const extractedImgs = Array.from(new Set([
      ...extractImageUrls(singleQ),
      ...extractImageUrls(foundTest)
    ]));

    if (extractedImgs.length > 1) {
      rawQuestions = extractedImgs.map((imgUrl, imgIdx) => ({
        ...singleQ,
        id: `${singleQ.id || 'q'}_sub_${imgIdx + 1}`,
        questionNo: imgIdx + 1,
        questionText: `Soru ${imgIdx + 1}`,
        imageUrl: imgUrl,
        imageUrls: [imgUrl],
        images: [imgUrl],
        contentPayload: imgUrl,
        options: singleQ.options || ['A', 'B', 'C', 'D', 'E']
      }));
    } else if (extractedImgs.length === 1) {
      rawQuestions = [{
        ...singleQ,
        imageUrl: extractedImgs[0],
        imageUrls: [extractedImgs[0]],
        images: [extractedImgs[0]],
        contentPayload: extractedImgs[0]
      }];
    }
  }

  // Final check: enrich items from allBankQuestions if needed
  const finalQuestions = rawQuestions.map((q, idx) => {
    const isPayloadMissing = !q.contentPayload || q.contentPayload === '[STORED_IN_INDEXEDDB]' || q.contentPayload === '[LOCALSTORAGE_CACHE]';
    const isImageMissing = !q.imageUrl || q.imageUrl === '[STORED_IN_INDEXEDDB]' || q.imageUrl === '[LOCALSTORAGE_CACHE]';

    const qHasMeaningfulOpts = hasMeaningfulOptions(q.options);
    if (q.id && (isPayloadMissing || isImageMissing || !q.questionText || !qHasMeaningfulOpts || !q.options || q.options.length === 0)) {
      const matched = allBankQuestions.find(bq => String(bq.id) === String(q.id) || normalizeId(bq.id) === normalizeId(q.id));
      if (matched) {
        const matchedImgs = extractImageUrls(matched);
        const currentImgs = extractImageUrls(q);
        const resolvedImgs = currentImgs.length > 0 ? currentImgs : matchedImgs;
        const targetImg = (rawQuestions.length > 1 && resolvedImgs.length >= rawQuestions.length)
          ? resolvedImgs[idx]
          : (resolvedImgs[0] || (!isImageMissing ? q.imageUrl : matched.imageUrl) || q.imageUrl);

        const chosenOpts = qHasMeaningfulOpts ? q.options : (hasMeaningfulOptions(matched.options) ? matched.options : (matched.options || q.options));

        return {
          ...matched,
          ...q,
          contentPayload: targetImg || (!isPayloadMissing ? q.contentPayload : matched.contentPayload) || q.contentPayload,
          imageUrl: targetImg || null,
          imageUrls: targetImg ? [targetImg] : undefined,
          images: targetImg ? [targetImg] : undefined,
          options: chosenOpts,
          questionText: extractQuestionText(q, foundTest, idx) || extractQuestionText(matched, foundTest, idx)
        };
      }
    }

    const specificImg = q.imageUrl || (Array.isArray(q.imageUrls) && q.imageUrls.length === 1 ? q.imageUrls[0] : null);
    if (specificImg) {
      return {
        ...q,
        imageUrl: specificImg,
        imageUrls: [specificImg],
        images: [specificImg],
        questionText: extractQuestionText(q, foundTest, idx),
        options: extractQuestionOptions(q, foundTest)
      };
    }

    const currentImgs = extractImageUrls(q);
    const targetImg = (rawQuestions.length > 1 && currentImgs.length >= rawQuestions.length) ? currentImgs[idx] : (currentImgs[0] || q.imageUrl || null);
    return {
      ...q,
      imageUrl: targetImg,
      imageUrls: targetImg ? [targetImg] : undefined,
      images: targetImg ? [targetImg] : undefined,
      questionText: extractQuestionText(q, foundTest, idx),
      options: extractQuestionOptions(q, foundTest)
    };
  });

  return finalQuestions;
}
export function isHomeworkForStudent(hw, student, grades = []) {
  if (!hw || !student) return false;
  const studentObj = typeof student === 'string' ? { id: student } : student;
  const studentId = String(studentObj.id || studentObj.studentId || studentObj.userId || '');
  const studentUuid = toUUID(studentId);
  const rawTargetIds = [
    ...(Array.isArray(hw.targetIds) ? hw.targetIds : []),
    ...(Array.isArray(hw.target_ids) ? hw.target_ids : []),
    ...(Array.isArray(hw.targetStudentIds) ? hw.targetStudentIds : []),
    ...(Array.isArray(hw.studentIds) ? hw.studentIds : []),
    ...(hw.studentId ? [hw.studentId] : []),
    ...(hw.targetStudentId ? [hw.targetStudentId] : []),
    ...(hw.assignedStudentId ? [hw.assignedStudentId] : []),
    ...(hw.targetStudent ? [hw.targetStudent] : []),
    ...(hw.raw_data?.targetIds || []),
    ...(hw.raw_data?.targetStudentId ? [hw.raw_data.targetStudentId] : []),
    ...(hw.raw_data?.studentId ? [hw.raw_data.studentId] : [])
  ];
  const targetIds = Array.isArray(rawTargetIds) ? rawTargetIds.map(String) : [];

  // Check if student is explicitly targeted by id or UUID
  const isDirectlyTargeted = targetIds.some(tid => {
    const tidStr = String(tid);
    return tidStr === studentId ||
      (studentUuid && tidStr === studentUuid) ||
      toUUID(tidStr) === studentId ||
      (studentUuid && toUUID(tidStr) === studentUuid);
  });

  if (isDirectlyTargeted) return true;

  if (hw.targetType === 'student' || hw.targetType === 'individual' || hw.targetType === 'students' || hw.targetType === 'user') {
    return isDirectlyTargeted;
  }

  // 2. Class / Grade target
  if (hw.targetType === 'grade' || hw.targetType === 'class' || !hw.targetType) {
    if (targetIds.length === 0) return true; // General assignment to everyone

    // Gather all possible identifiers for the student
    const studentIdentifiers = new Set([
      studentId,
      studentUuid,
      String(studentObj.gradeId || ''),
      String(studentObj.classId || ''),
      String(studentObj.grade || ''),
      String(studentObj.className || '')
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
      const tidStr = String(tid);
      if (studentIdentifiers.has(tidStr)) return true;
      const matchedGrade = grades.find(g => String(g.id) === tidStr || String(g.name) === tidStr);
      if (matchedGrade) {
        if (studentIdentifiers.has(String(matchedGrade.id)) || (matchedGrade.name && studentIdentifiers.has(String(matchedGrade.name)))) {
          return true;
        }
      }
      return false;
    });
  }

  return isDirectlyTargeted;
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

  // 1. Map Books and build strict sequential order of all tests as defined in the book's subjects & topics
  const bookMap = new Map();
  const bookTestSequentialIndexMap = new Map();
  let globalSeq = 0;

  (books || []).forEach((b, bIdx) => {
    if (!b?.id) return;
    const bId = String(b.id);
    const bUuid = String(b.id).replace(/-/g, '');
    bookMap.set(bId, { index: bIdx, book: b });
    if (bUuid) bookMap.set(bUuid, { index: bIdx, book: b });

    // Traverse subjects -> tests and subjects -> topics -> tests in exact book order
    (b.subjects || []).forEach((subj, sIdx) => {
      (subj.tests || []).forEach((t, tIdx) => {
        if (t?.id) {
          const tId = String(t.id);
          const tUuid = String(t.id).replace(/-/g, '');
          const info = {
            bookIndex: bIdx,
            subjectIndex: sIdx,
            topicIndex: -1,
            testIndex: tIdx,
            seq: globalSeq++
          };
          bookTestSequentialIndexMap.set(tId, info);
          if (tUuid) bookTestSequentialIndexMap.set(tUuid, info);
        }
      });
      (subj.topics || []).forEach((tp, tpIdx) => {
        (tp.tests || []).forEach((t, tIdx) => {
          if (t?.id) {
            const tId = String(t.id);
            const tUuid = String(t.id).replace(/-/g, '');
            const info = {
              bookIndex: bIdx,
              subjectIndex: sIdx,
              topicIndex: tpIdx,
              testIndex: tIdx,
              seq: globalSeq++
            };
            bookTestSequentialIndexMap.set(tId, info);
            if (tUuid) bookTestSequentialIndexMap.set(tUuid, info);
          }
        });
      });
    });
  });

  const testMap = new Map();
  (bookTests || []).forEach(t => {
    if (t?.id) {
      testMap.set(String(t.id), t);
      const tUuid = String(t.id).replace(/-/g, '');
      if (tUuid) testMap.set(tUuid, t);
    }
  });

  // Helper to extract starting page number from title/name (e.g. "45-46. Sayfa..." -> 45, "s. 13" -> 13)
  const extractPageNo = (str) => {
    if (!str) return null;
    const m = String(str).match(/(?:(\d+)\s*[-–]\s*\d+|\b(\d+))\s*\.?\s*sayfa|sayfa\s*(\d+)|s\.\s*(\d+)/i);
    if (m) {
      const num = parseInt(m[1] || m[2] || m[3] || m[4], 10);
      if (!isNaN(num)) return num;
    }
    return null;
  };

  // Helper to extract unit number from title/name (e.g. "2. Ünite" -> 2)
  const extractUnitNo = (str) => {
    if (!str) return null;
    const m = String(str).match(/(\d+)\s*\.\s*ünite/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num)) return num;
    }
    return null;
  };

  // Helper to extract test number from title/name (e.g. "TEST - 6" -> 6)
  const extractTestNo = (str) => {
    if (!str) return null;
    const m = String(str).match(/test\s*[-–]?\s*(\d+)/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num)) return num;
    }
    return null;
  };

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

    // 2. Book Order (Order of books in system)
    const tObjA = a.testId ? testMap.get(String(a.testId)) : null;
    const tObjB = b.testId ? testMap.get(String(b.testId)) : null;

    const bookIdA = a.bookId || tObjA?.bookId || (a.hwId && a.isAutoHomework ? a.bookId : null);
    const bookIdB = b.bookId || tObjB?.bookId || (b.hwId && b.isAutoHomework ? b.bookId : null);

    const bInfoA = bookIdA ? bookMap.get(String(bookIdA)) : null;
    const bInfoB = bookIdB ? bookMap.get(String(bookIdB)) : null;

    const bookIndexA = bInfoA ? bInfoA.index : 9999;
    const bookIndexB = bInfoB ? bInfoB.index : 9999;
    if (bookIndexA !== bookIndexB) return bookIndexA - bookIndexB;

    // 3. Subject Hierarchy Order (Türkçe -> Matematik -> Fen ...)
    const subjNameA = (a.subject || tObjA?.subject || '').trim();
    const subjNameB = (b.subject || tObjB?.subject || '').trim();

    const bookObj = bInfoA?.book || bInfoB?.book;
    if (bookObj && Array.isArray(bookObj.subjects)) {
      const sIdxA = bookObj.subjects.findIndex(s => 
        (tObjA?.subjectId && String(s.id) === String(tObjA.subjectId)) ||
        (subjNameA && s.name?.toLocaleLowerCase('tr-TR') === subjNameA.toLocaleLowerCase('tr-TR'))
      );
      const sIdxB = bookObj.subjects.findIndex(s => 
        (tObjB?.subjectId && String(s.id) === String(tObjB.subjectId)) ||
        (subjNameB && s.name?.toLocaleLowerCase('tr-TR') === subjNameB.toLocaleLowerCase('tr-TR'))
      );
      if (sIdxA !== -1 && sIdxB !== -1 && sIdxA !== sIdxB) {
        return sIdxA - sIdxB;
      }
    }

    // 4. Sequential Book Test Index if both tests exist in the book's internal structure
    const seqA = a.testId && bookTestSequentialIndexMap.has(String(a.testId)) ? bookTestSequentialIndexMap.get(String(a.testId)).seq : 999999;
    const seqB = b.testId && bookTestSequentialIndexMap.has(String(b.testId)) ? bookTestSequentialIndexMap.get(String(b.testId)).seq : 999999;
    if (seqA !== seqB && seqA !== 999999 && seqB !== 999999) {
      return seqA - seqB;
    }

    // 5. Page Number Order (Sayfa Numarası Sırası: 9-10 < 13-14 < 17-18 ...)
    const titleA = a.testName || a.title || a.name || '';
    const titleB = b.testName || b.title || b.name || '';

    const pageA = extractPageNo(titleA);
    const pageB = extractPageNo(titleB);
    if (pageA !== null && pageB !== null && pageA !== pageB) {
      return pageA - pageB;
    }

    // 6. Unit Number Order (Ünite Numarası Sırası)
    const unitA = extractUnitNo(titleA);
    const unitB = extractUnitNo(titleB);
    if (unitA !== null && unitB !== null && unitA !== unitB) {
      return unitA - unitB;
    }

    // 7. Test Number Order (Test Numarası Sırası)
    const testNoA = extractTestNo(titleA);
    const testNoB = extractTestNo(titleB);
    if (testNoA !== null && testNoB !== null && testNoA !== testNoB) {
      return testNoA - testNoB;
    }

    // 8. Natural Alphanumeric Sorting by Test Name / Title
    return titleA.localeCompare(titleB, 'tr', { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Computes unified submission stats for multi-section assignments and tests.
 */
export function computeUnifiedSubmissionStats(sub, hw, allQuestions = []) {
  if (!sub) return null;
  const isMultiSec = Boolean(
    hw?.isBulk ||
    hw?.type === 'multi' ||
    sub?.type === 'multi' ||
    (Array.isArray(hw?.sections) && hw.sections.length > 1) ||
    (Array.isArray(hw?.tests) && hw.tests.length > 1) ||
    (Array.isArray(hw?.items) && hw.items.length > 1) ||
    (sub?.sections && typeof sub.sections === 'object' && Object.keys(sub.sections).length > 1)
  );

  if (!isMultiSec) return null;

  try {
    const unifiedTest = normalizeUnifiedTest(hw || sub, allQuestions);
    const rawSections = unifiedTest.sections;
    if (!rawSections || rawSections.length === 0) return null;

    const unifiedSub = normalizeUnifiedSubmission(sub, unifiedTest);
    const sectionAnswersMap = unifiedSub.sections || {};
    const teacherScores = sub.teacherScores || sub.scores || (sub.raw_data && (sub.raw_data.teacherScores || sub.raw_data.scores)) || {};

    let totalQuestions = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let pendingCount = 0;

    rawSections.forEach((sec, sIdx) => {
      const sa = sectionAnswersMap[sec.id] ||
                 sectionAnswersMap[sIdx] ||
                 sectionAnswersMap[String(sIdx)] ||
                 (sec.title && sectionAnswersMap[sec.title]) ||
                 (sec.raw?.id && sectionAnswersMap[sec.raw.id]) ||
                 (sec.raw?.questionId && sectionAnswersMap[sec.raw.questionId]) ||
                 { answers: {}, openEndedText: {}, teacherScores: {} };
          const secQs = sec.questions || [];
      const count = sec.qCount || secQs.length || 1;
      const isSecOpenEnded = sec.type === 'open_ended';

      for (let i = 1; i <= count; i++) {
        totalQuestions++;
        const qObj = secQs[i - 1] || {};
        const isQOE = isSecOpenEnded ||
                      qObj.type === 'open_ended' ||
                      qObj.type === 'acik_uclu' ||
                      qObj.type === 'yazili' ||
                      qObj.questionType === 'acik_uclu' ||
                      qObj.questionType === 'yazili' ||
                      Boolean(sa.openEndedText?.[i] && String(sa.openEndedText[i]).trim() !== '') ||
                      Boolean(sa.openEndedText?.[String(i)] && String(sa.openEndedText[String(i)]).trim() !== '');

        const teacherScore = teacherScores[sec.id]?.[i] ??
                             teacherScores[sIdx]?.[i] ??
                             sa.teacherScores?.[i] ??
                             sa.teacherScores?.[String(i)];

        if (isQOE) {
          const textVal = sa.openEndedText?.[i] ?? sa.openEndedText?.[String(i)];
          const hasText = textVal && String(textVal).trim() !== '';

          if (teacherScore !== undefined && teacherScore !== null && teacherScore !== 'empty') {
            const scNum = Number(teacherScore);
            if (scNum >= 5 || scNum > 0) {
              correctCount++;
            } else {
              wrongCount++;
            }
          } else if (teacherScore === 'empty' || !hasText) {
            blankCount++;
          } else {
            correctCount++;
          }
        } else {
          // Multiple choice
          const rawAns = sa.answers?.[i] ?? sa.answers?.[String(i)];
          const u = normalizeAnswerIndex(rawAns);
          if (u === null) {
            blankCount++;
          } else {
            const cAns = (Array.isArray(sec.correctAnswers) && sec.correctAnswers[i - 1] !== undefined)
              ? sec.correctAnswers[i - 1]
              : (Array.isArray(sec.raw?.correctAnswers) && sec.raw.correctAnswers[i - 1] !== undefined)
                ? sec.raw.correctAnswers[i - 1]
                : (sec.answerKey?.[i - 1] ?? sec.raw?.answerKey?.[i - 1] ?? sec.opticAnswers?.[i - 1] ?? sec.raw?.opticAnswers?.[i - 1] ?? qObj.correctAnswer ?? qObj.answer ?? qObj.correctOption);

            let isCorr = null;
            if (cAns !== undefined && cAns !== null && cAns !== '') {
              const normC = normalizeAnswerIndex(cAns);
              if (normC !== null) {
                isCorr = (u === normC);
              }
            }

            if (isCorr === null) {
              isCorr = checkIsAnswerCorrect(u, qObj.raw || qObj, sec.raw || sec, i);
            }

            if (isCorr === true) {
              correctCount++;
            } else if (isCorr === false) {
              wrongCount++;
            } else {
              correctCount++;
            }
          }
        }
      }
    });

    const totalScored = correctCount + wrongCount + blankCount;
    const scorePct = totalScored > 0 ? Math.round((correctCount / totalScored) * 100) : 0;
    const rawNet = Math.max(0, correctCount - (wrongCount * 0.25));
    const netScore = Number.isInteger(rawNet) ? rawNet : Number(rawNet.toFixed(2));

    return {
      total: totalQuestions,
      correct: correctCount,
      wrong: wrongCount,
      blank: blankCount,
      pending: pendingCount,
      scorePct,
      netScore
    };
  } catch (err) {
    console.warn('computeUnifiedSubmissionStats error in testResolver:', err);
    return null;
  }
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
  const sid = studentId || targetStudent?.id;
  if (!sid) {
    return { generalTrialExams: [], otherHomeworkSubmissions: [] };
  }

  const unifiedSubs = getAllUnifiedStudentSubmissions({
    studentId: sid,
    submissions,
    homeworks,
    books,
    bookTests,
    mockExams: studentMockExams
  });

  const trials = [];
  const homeworksOnly = [];

  unifiedSubs.forEach(s => {
    const item = {
      id: s.id,
      submissionId: s.submissionId || s.id,
      originalSubmissionId: s.submissionId || s.id,
      title: s.fullTitle || s.testTitle || s.title || s.testName || 'Test',
      testTitle: s.fullTitle || s.testTitle || s.title || s.testName || 'Test',
      subject: s.subjectName || s.subject || 'Genel',
      subjectName: s.subjectName || s.subject || 'Genel',
      date: s.date,
      totalNet: s.netScore ?? s.totalNet ?? 0,
      net: s.netScore ?? s.totalNet ?? 0,
      correctCount: s.correctCount || 0,
      correct: s.correctCount || 0,
      wrongCount: s.wrongCount || 0,
      wrong: s.wrongCount || 0,
      emptyCount: s.blankCount ?? s.emptyCount ?? 0,
      blankCount: s.blankCount ?? s.emptyCount ?? 0,
      empty: s.blankCount ?? s.emptyCount ?? 0,
      totalQuestions: s.totalQuestions || 0,
      sourceType: s.sourceType,
      approvalStatus: 'approved',
      isTrial: s.typeKey === 'physicalExam',
      parentBookId: s.bookId,
      scores: s.scores || {}
    };

    if (s.typeKey === 'physicalExam' || s.sourceType === 'physicalExam') {
      item.totalCorrect = item.correctCount;
      item.totalWrong = item.wrongCount;
      item.totalEmpty = item.emptyCount;
      trials.push(item);
    } else {
      homeworksOnly.push(item);
    }
  });

  // Include manual mock exams if not already in unifiedSubs
  (studentMockExams || []).forEach(m => {
    if (!m) return;
    const mId = String(m.id);
    if (unifiedSubs.some(u => String(u.id) === mId || String(u.submissionId) === mId)) return;
    
    let tD = m.totalCorrect ?? m.correctCount ?? 0;
    let tY = m.totalWrong ?? m.wrongCount ?? 0;
    let tB = m.totalEmpty ?? m.emptyCount ?? 0;
    if (tD === 0 && tY === 0 && tB === 0 && m.scores && typeof m.scores === 'object') {
      Object.values(m.scores).forEach(sc => {
        tD += Number(sc?.d || sc?.correct || 0);
        tY += Number(sc?.y || sc?.wrong || 0);
        tB += Number(sc?.b || sc?.empty || sc?.blank || 0);
      });
    }
    trials.push({
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
    });
  });

  trials.sort((a, b) => new Date(b.date) - new Date(a.date));
  homeworksOnly.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { generalTrialExams: trials, otherHomeworkSubmissions: homeworksOnly };
}

/**
 * Accurately checks if a submission matches a specific book test without falsely matching generic names or cross-subject tests.
 */
export function isSubmissionMatchingBookTest(s, targetTestOrId, bookTests = [], books = []) {
  if (!s || !targetTestOrId) return false;
  if (s.status === 'in_progress' || s.status === 'draft') return false;

  const targetTest = typeof targetTestOrId === 'object'
    ? targetTestOrId
    : (bookTests || []).find(bt => String(bt.id) === String(targetTestOrId) || (toUUID(bt.id) && String(toUUID(bt.id)) === String(targetTestOrId)));

  const specId = typeof targetTestOrId === 'object' ? String(targetTestOrId.id || '') : String(targetTestOrId);
  const specClean = specId.replace(/^q_/, '').replace(/^bt_/, '').replace(/^tbt_/, '');
  const specUuid = String(toUUID(specId) || '');

  const sTestId = String(s.testId || s.test_id || '');
  const sRealTestId = String(s.realTestId || s.metadata?.realTestId || '');
  const sBookTestId = String(s.bookTestId || s.metadata?.bookTestId || '');

  // 1. Direct Specific ID Matching:
  const isDirectIdMatch = (sTestId && (sTestId === specId || sTestId === specClean || (specUuid && sTestId === specUuid))) ||
                          (sRealTestId && (sRealTestId === specId || sRealTestId === specClean || (specUuid && sRealTestId === specUuid))) ||
                          (sBookTestId && (sBookTestId === specId || sBookTestId === specClean || (specUuid && sBookTestId === specUuid)));

  // If there is an exact direct testId match, confirm subjects don't conflict (e.g. reused IDs)
  if (isDirectIdMatch) {
    const sSubj = String(s.subject || s.subjectName || s.metadata?.subject || s.lesson || '').toLowerCase().trim();
    const tSubj = String(targetTest?.subject || targetTest?.subjectName || targetTest?.parentSubjectName || '').toLowerCase().trim();
    if (sSubj && tSubj) {
      const isCrossConflict = (tSubj.includes('türk') && (sSubj.includes('mat') || sSubj.includes('fen') || sSubj.includes('sos'))) ||
                              (tSubj.includes('mat') && (sSubj.includes('türk') || sSubj.includes('fen') || sSubj.includes('sos'))) ||
                              (tSubj.includes('fen') && (sSubj.includes('türk') || sSubj.includes('mat') || sSubj.includes('sos'))) ||
                              (tSubj.includes('sos') && (sSubj.includes('türk') || sSubj.includes('mat') || sSubj.includes('fen')));
      if (isCrossConflict) return false;
    }
    return true;
  }

  // 1.5. Strict Book Isolation
  // If the submission explicitly states which book it belongs to, and it doesn't match the target test's book, reject it!
  const targetBookId = String(targetTest?.bookId || targetTest?.book_id || '').toLowerCase().trim();
  const subBookId = String(s.bookId || s.book_id || s.metadata?.bookId || s.metadata?.book_id || '').toLowerCase().trim();
  
  if (targetBookId && subBookId) {
    const tUuid = toUUID(targetBookId);
    const sUuid = toUUID(subBookId);
    if (targetBookId !== subBookId && (!tUuid || tUuid !== sUuid)) {
      return false; // Explicit book mismatch
    }
  }

  // Also check book title if available
  const subBookTitle = String(s.bookTitle || s.metadata?.bookTitle || '').toLowerCase().trim();
  if (subBookTitle && books && books.length > 0) {
    let targetBookTitle = '';
    if (targetTest?.bookTitle) {
      targetBookTitle = String(targetTest.bookTitle).toLowerCase().trim();
    } else {
      const book = books.find(b => String(b.id) === targetBookId || toUUID(String(b.id)) === toUUID(targetBookId));
      if (book) targetBookTitle = String(book.title).toLowerCase().trim();
    }
    
    if (targetBookTitle && subBookTitle !== targetBookTitle && !targetBookTitle.includes(subBookTitle) && !subBookTitle.includes(targetBookTitle)) {
      // Very strict mismatch, e.g. "Paragraf" vs "Ünite Ünite"
      return false; 
    }
  }

  // Note: sBookTestId/sRealTestId guard removed intentionally.
  // Subject (step 2) + page number (step 4) + title matching is specific enough to prevent false
  // positives without an expensive O(n) bookTests lookup on every submission check.

  // 2. Subject (Ders) verification - CRUCIAL for multi-lesson books
  const targetSubject = String(targetTest?.subject || targetTest?.subjectName || targetTest?.parentSubjectName || targetTest?.ders || '').toLowerCase().trim();
  const subSubject = String(s.subject || s.subjectName || s.metadata?.subject || s.metadata?.ders || s.ders || s.lesson || '').toLowerCase().trim();

  if (targetSubject && subSubject && targetSubject !== 'genel' && subSubject !== 'genel' && subSubject !== 'genel testler' && targetSubject !== 'genel testler') {
    const isSubjectMatch = subSubject === targetSubject ||
      subSubject.includes(targetSubject) ||
      targetSubject.includes(subSubject) ||
      (targetSubject.includes('türk') && subSubject.includes('türk')) ||
      (targetSubject.includes('mat') && subSubject.includes('mat')) ||
      (targetSubject.includes('fen') && subSubject.includes('fen')) ||
      (targetSubject.includes('sos') && subSubject.includes('sos')) ||
      (targetSubject.includes('ing') && subSubject.includes('ing')) ||
      (targetSubject.includes('din') && subSubject.includes('din'));

    if (!isSubjectMatch) {
      return false; // Subject conflict!
    }
  }

  if (!targetTest) return false;

  const extractPageNumbers = (str) => {
    if (!str || typeof str !== 'string') return null;
    const match = str.match(/(\d+)\s*[-–/]\s*(\d+)/);
    if (match) return `${match[1]}-${match[2]}`;
    const singleMatch = str.match(/sayfa\s*(\d+)/i) || str.match(/(\d+)\.\s*sayfa/i);
    if (singleMatch) return singleMatch[1];
    return null;
  };

  const tName = String(targetTest.name || targetTest.title || '').toLowerCase().trim();
  const sTitle = String(s.title || s.testTitle || s.test_title || s.metadata?.testTitle || '').toLowerCase().trim();
  const cleanSTitle = sTitle.replace(/^.*?—\s*/, '').replace(/^.*?[›>]\s*/, '').replace(/\s*\(.*?\)$/, '').trim();

  const targetPages = targetTest.pageRange ||
    (targetTest.startPage && targetTest.endPage ? `${targetTest.startPage}-${targetTest.endPage}` : null) ||
    extractPageNumbers(targetTest.name) ||
    extractPageNumbers(targetTest.title);

  const subPages = s.metadata?.pageRange ||
    (s.metadata?.startPage && s.metadata?.endPage ? `${s.metadata.startPage}-${s.metadata.endPage}` : null) ||
    extractPageNumbers(s.title) ||
    extractPageNumbers(s.testTitle) ||
    extractPageNumbers(s.test_title);

  // 3. Strict page matching (Definitive if both exist)
  if (targetPages) {
    if (subPages) {
      if (targetPages === subPages) return true;
    } else {
      const hasPageRangeInTitle = sTitle.includes(targetPages) || cleanSTitle.includes(targetPages);
      if (hasPageRangeInTitle) return true;
    }
    // If target has specific pages and submission DOES NOT match those pages, reject immediately
    if (subPages && targetPages !== subPages) return false;
  } else if (subPages) {
    // Submission has specific pages but target test does not, they cannot match
    return false;
  }

  // 4. Unit (Ünite) verification
  const targetUnit = String(targetTest?.unit || targetTest?.unitName || targetTest?.topic || targetTest?.topicName || '').toLowerCase().trim();
  const subUnit = String(s.unit || s.unitName || s.topic || s.topicName || s.metadata?.unit || s.metadata?.topic || s.metadata?.unitTopic || '').toLowerCase().trim();

  if (targetUnit && subUnit) {
    const tUnitNum = targetUnit.match(/(\d+)\.\s*ünite/i)?.[1] || targetUnit.match(/ünite\s*(\d+)/i)?.[1];
    const sUnitNum = subUnit.match(/(\d+)\.\s*ünite/i)?.[1] || subUnit.match(/ünite\s*(\d+)/i)?.[1];
    if (tUnitNum && sUnitNum && tUnitNum !== sUnitNum) {
      return false; // Unit mismatch!
    }
  }



  // If both have orderIndex, check orderIndex
  if (targetTest.orderIndex !== undefined && targetTest.orderIndex !== null && s.metadata?.orderIndex !== undefined && s.metadata?.orderIndex !== null) {
    return Number(targetTest.orderIndex) === Number(s.metadata.orderIndex);
  }

  // Generic names across subjects MUST have subject match to avoid cross-subject false positives.
  // Unit is only checked when BOTH sides have unit info (to avoid blocking when unit is simply missing).
  const isGeneric = /^(problem sayfası|etkinlik sayfası|sayfa|test|deneme|kazanım testi|konu testi|ödev|çalışma|test \d+|test-\d+|ü\.?\s*değ\.?\s*\d+|ünite değerlendirme \d+|yeni nesil \d+|etkinlik \d+)$/i.test(tName);
  if (isGeneric) {
    // Subject must match
    if (!targetSubject || !subSubject) return false;
    const isSubjOk = subSubject === targetSubject ||
      subSubject.includes(targetSubject) || targetSubject.includes(subSubject) ||
      (targetSubject.includes('türk') && subSubject.includes('türk')) ||
      (targetSubject.includes('mat') && subSubject.includes('mat')) ||
      (targetSubject.includes('fen') && subSubject.includes('fen')) ||
      (targetSubject.includes('sos') && subSubject.includes('sos')) ||
      (targetSubject.includes('ing') && subSubject.includes('ing')) ||
      (targetSubject.includes('din') && subSubject.includes('din'));
    if (!isSubjOk) return false;

    // If BOTH sides have unit info, verify they don't conflict
    if (targetUnit && subUnit) {
      const tUnitNum = targetUnit.match(/(\d+)\.\s*ünite/i)?.[1] || targetUnit.match(/ünite\s*(\d+)/i)?.[1];
      const sUnitNum = subUnit.match(/(\d+)\.\s*ünite/i)?.[1] || subUnit.match(/ünite\s*(\d+)/i)?.[1];
      if (tUnitNum && sUnitNum && tUnitNum !== sUnitNum) return false;
    }

    // Title must match
    return cleanSTitle === tName || cleanSTitle.includes(tName) || tName.includes(cleanSTitle);
  }

  // Non-generic unique title match
  return cleanSTitle === tName;
}
