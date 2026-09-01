import { toUUID } from '../services/supabaseService';
import { getTurkeyYMD, extractItemDate } from './dateHelpers';
import { checkIsAnswerCorrect, resolveQuestionCorrectAnswer, formatAnswerLetter, normalizeAnswerIndex } from './answerEvaluation';
import { normalizeUnifiedTest, normalizeUnifiedSubmission } from '../services/unifiedQuizAdapter';
import { getAllUnifiedStudentSubmissions } from '../services/unifiedResultAdapter';
import { extractImageUrls } from '../components/quiz/common/ImageLightbox';

/**
 * Checks whether a tracked book or homework is a Mock Exam (Deneme)
 */
export function isExamBook(b) {
  if (!b) return false;
  const raw = b.raw_data || {};

  // If this object has a parent bookId of a standard book, it is a sub-test, NOT a standalone exam!
  if (b.bookId && !b.bookType && !b.book_type && !b.isPhysical && b.type !== 'physicalExam' && b.contentType !== 'physicalExam') {
    return false;
  }

  // If bookType is explicitly standard or mixed, it is NOT an exam!
  if (b.bookType === 'standard' || b.bookType === 'mixed' || b.book_type === 'standard' || b.book_type === 'mixed') {
    return false;
  }

  const pub = String(b.publisher || raw.publisher || '').toUpperCase().trim();
  const title = String(b.title || raw.title || b.name || '').toLowerCase().trim();

  // 1. Explicit exam indicators
  if (
    b.bookType === 'exam' ||
    b.book_type === 'exam' ||
    raw.bookType === 'exam' ||
    raw.book_type === 'exam' ||
    b.type === 'exam' ||
    b.type === 'physicalExam' ||
    raw.type === 'exam' ||
    raw.type === 'physicalExam' ||
    b.contentType === 'physicalExam' ||
    raw.contentType === 'physicalExam' ||
    b.isExamBook ||
    raw.isExamBook ||
    b.isExam ||
    raw.isExam ||
    b.isPhysicalExam === true ||
    b.id === 'tb_07kzdf_1787267196768'
  ) {
    return true;
  }

  // 2. Exam Formats used by ExamManager & Physical Exam creator
  const EXAM_PRESETS = ['LGS', 'TYT', 'AYT', 'CUSTOM', 'ÖZEL', 'DENEME', 'YKS', 'MSÜ', 'KPSS', 'DGS'];
  if (EXAM_PRESETS.includes(pub)) {
    if (
      b.penaltyRatio !== undefined ||
      raw.penaltyRatio !== undefined ||
      b.examType ||
      raw.examType ||
      (Array.isArray(b.subjects) && b.subjects.length >= 2) ||
      (Array.isArray(raw.subjects) && raw.subjects.length >= 2)
    ) {
      return true;
    }
  }

  // 3. Standalone exam title keywords ONLY if not a sub-test
  if (!b.bookId && !b.testId) {
    const isExamTitle =
      title.includes('hazır bulunuşluk') ||
      title.includes('hazir bulunusluk') ||
      title.includes('fiziki deneme') ||
      (title.includes('deneme sınavı') && (EXAM_PRESETS.includes(pub) || pub === 'CUSTOM' || pub === 'DENEME'));

    if (isExamTitle) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a tracked book is a standard or mixed book (NOT a Mock Exam)
 */
export function isStandardOrMixedBook(b) {
  return Boolean(b && !isExamBook(b));
}

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
    if (!b) return;
    const bId = String(b.id || '');
    const bUuid = String(b.id || '').replace(/-/g, '');
    const entry = { index: bIdx, book: b };

    if (bId) bookMap.set(bId, entry);
    if (bUuid) bookMap.set(bUuid, entry);

    // Also index by clean lowercase book title
    const bTitle = String(b.title || '').toLocaleLowerCase('tr').replace(/\s*\(tüm kitap görevi\)/gi, '').replace(/\s*\(tüm kitap\)/gi, '').replace(/\s*\(kendi eklediğim\)/gi, '').trim();
    if (bTitle) {
      bookMap.set(bTitle, entry);
    }

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

  const parseTestCategory = (name) => {
    const str = String(name || '').trim();
    const lower = str.toLowerCase();
    let cat = 6;
    if (/^(test|kazanım|kavrama|etkinlik|konu)/i.test(lower) || /^t-\d+/i.test(lower) || /^test-\d+/i.test(lower)) {
      cat = 1;
    } else if (/^(sayfa|problem sayfas|problem|paragraf)/i.test(lower) || /\d+[\.\-]\s*sayfa/i.test(lower)) {
      cat = 2;
    } else if (/^(ünite|ü\.|değerlendirme|ü\. değ|ü\.değ)/i.test(lower)) {
      cat = 3;
    } else if (/^(yeni nesil|beceri|lgs)/i.test(lower)) {
      cat = 4;
    } else if (/^(tarama|sarmal|tekrar|genel tekrar)/i.test(lower)) {
      cat = 5;
    } else if (/^(deneme|sınav|tatil)/i.test(lower)) {
      cat = 6;
    }
    return cat;
  };

  const getBookInfo = (it) => {
    if (!it) return { index: 99999, title: '', book: null, isBook: false };

    const tObj = it.testId ? testMap.get(String(it.testId)) : null;
    const bIdCandidate = it.bookId || tObj?.bookId || (it.hwId && it.isAutoHomework ? it.bookId : null);

    let bInfo = null;
    if (bIdCandidate) {
      const sId = String(bIdCandidate);
      bInfo = bookMap.get(sId) || bookMap.get(sId.replace(/-/g, '')) || null;
    }

    const rawBookTitle = String(it.bookTitle || tObj?.bookTitle || tObj?.book_title || '').trim();
    const cleanBookTitle = rawBookTitle.toLocaleLowerCase('tr').replace(/\s*\(tüm kitap görevi\)/gi, '').replace(/\s*\(tüm kitap\)/gi, '').replace(/\s*\(kendi eklediğim\)/gi, '').trim();

    if (!bInfo && cleanBookTitle) {
      bInfo = bookMap.get(cleanBookTitle);
      if (!bInfo) {
        for (const [key, val] of bookMap.entries()) {
          if (key.length > 5 && (cleanBookTitle.includes(key) || key.includes(cleanBookTitle))) {
            bInfo = val;
            break;
          }
        }
      }
    }

    if (bInfo) {
      return {
        index: bInfo.index,
        title: bInfo.book?.title || rawBookTitle,
        book: bInfo.book,
        isBook: true
      };
    }

    if (cleanBookTitle) {
      return {
        index: 5000,
        title: cleanBookTitle,
        book: null,
        isBook: true
      };
    }

    const isBookTask = it.isBookTask || it.sourceType === 'trackedBook' || it.taskType === 'kitap' || Boolean(it.testId && tObj);
    return {
      index: isBookTask ? 8000 : 99999,
      title: isBookTask ? 'Kitap' : 'Genel',
      book: null,
      isBook: isBookTask
    };
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

    // 2. Strict Book Grouping (Book 1 tasks ALWAYS grouped consecutively until Book 1 finishes!)
    const bA = getBookInfo(a);
    const bB = getBookInfo(b);

    if (bA.isBook !== bB.isBook) {
      return bA.isBook ? -1 : 1;
    }

    if (bA.index !== bB.index) {
      return bA.index - bB.index;
    }

    if (bA.title && bB.title && bA.title !== bB.title) {
      return bA.title.localeCompare(bB.title, 'tr', { sensitivity: 'base' });
    }

    // 3. WITHIN THE SAME BOOK: Subject Hierarchy Order (Türkçe -> Matematik -> Fen ...)
    const tObjA = a.testId ? testMap.get(String(a.testId)) : null;
    const tObjB = b.testId ? testMap.get(String(b.testId)) : null;
    const subjNameA = (a.subject || tObjA?.subject || '').trim();
    const subjNameB = (b.subject || tObjB?.subject || '').trim();

    const bookObj = bA.book || bB.book;
    if (bookObj && Array.isArray(bookObj.subjects)) {
      const sIdxA = bookObj.subjects.findIndex(s => 
        (tObjA?.subjectId && String(s.id) === String(tObjA.subjectId)) ||
        (subjNameA && s.name?.toLocaleLowerCase('tr') === subjNameA.toLocaleLowerCase('tr'))
      );
      const sIdxB = bookObj.subjects.findIndex(s => 
        (tObjB?.subjectId && String(s.id) === String(tObjB.subjectId)) ||
        (subjNameB && s.name?.toLocaleLowerCase('tr') === subjNameB.toLocaleLowerCase('tr'))
      );
      if (sIdxA !== -1 && sIdxB !== -1 && sIdxA !== sIdxB) {
        return sIdxA - sIdxB;
      }
    } else {
      const stdOrder = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İnkılap Tarihi', 'İngilizce', 'Din Kültürü', 'Genel'];
      const sIdxA = stdOrder.indexOf(subjNameA);
      const sIdxB = stdOrder.indexOf(subjNameB);
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

    const titleA = a.testName || a.title || a.name || '';
    const titleB = b.testName || b.title || b.name || '';

    // 5. Unit Number Order (Ünite Numarası Sırası: 1. Ünite < 2. Ünite < 3. Ünite)
    const unitA = extractUnitNo(titleA) || extractUnitNo(a.unitTopic || a.topic);
    const unitB = extractUnitNo(titleB) || extractUnitNo(b.unitTopic || b.topic);
    if (unitA !== null && unitB !== null && unitA !== unitB) {
      return unitA - unitB;
    }

    // 6. Page Number Order (Sayfa Numarası Sırası: 9-10 < 13-14 < 17-18 ...)
    const pageA = extractPageNo(titleA) || Number(a.page || 0);
    const pageB = extractPageNo(titleB) || Number(b.page || 0);
    if (pageA > 0 && pageB > 0 && pageA !== pageB) {
      return pageA - pageB;
    }

    // 7. Test Category & Number Order (Test-1 < Test-2 < Paragraf < Ü. Değ < Yeni Nesil)
    const catA = parseTestCategory(titleA);
    const catB = parseTestCategory(titleB);
    if (catA !== catB) {
      return catA - catB;
    }

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
    // 🛡️ Explicit Exam / Trial Check — Tracked books are standard books and MUST NOT be in trials!
    const isStandardBookSub = s.bookId && books.some(b => (String(b.id) === String(s.bookId) || toUUID(b.id) === toUUID(s.bookId)) && isStandardOrMixedBook(b));

    const isTrial = !isStandardBookSub && Boolean(
      s.typeKey === 'physicalExam' ||
      s.sourceType === 'physicalExam' ||
      s.isTrial ||
      s.isExam ||
      s.isMockExam ||
      s.isTrialExam ||
      String(s.id || '').startsWith('me_') ||
      String(s.testId || '').startsWith('me_') ||
      (s.bookId && books.some(b => (String(b.id) === String(s.bookId) || toUUID(b.id) === toUUID(s.bookId)) && isExamBook(b))) ||
      (s.hwId && homeworks.some(h => (String(h.id) === String(s.hwId) || toUUID(h.id) === toUUID(s.hwId)) && isExamBook(h)))
    );

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
      isTrial: isTrial,
      parentBookId: s.bookId,
      scores: (s.scores && Object.keys(s.scores).length > 0) ? s.scores : {
        [s.subjectName || s.subject || 'Genel']: {
          d: s.correctCount || 0,
          y: s.wrongCount || 0,
          b: s.blankCount ?? s.emptyCount ?? 0,
          correct: s.correctCount || 0,
          wrong: s.wrongCount || 0,
          empty: s.blankCount ?? s.emptyCount ?? 0,
          net: s.netScore ?? s.totalNet ?? 0
        }
      }
    };

    if (isTrial) {
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

  const seenTrialKeys = new Set();
  const uniqueTrials = [];
  trials.forEach(item => {
    const rawT = String(item.title || item.testTitle || '').toLowerCase().replace(/\s*\(tüm kitap görevi\)/gi, '').trim();
    const cleanT = rawT.replace(/[^a-z0-9ğüşıöç]/g, '');
    const dateStr = String(item.date || '').slice(0, 10);
    const scoreSig = `${item.correctCount || item.totalCorrect || 0}_${item.wrongCount || item.totalWrong || 0}_${item.totalNet || item.net || 0}`;
    const sig = `${cleanT}___${dateStr}___${scoreSig}`;
    
    const idKey = String(item.id || item.submissionId || '');
    const testIdKey = String(item.testId || item.realTestId || item.originalSubmissionId || '');

    if (idKey && seenTrialKeys.has(`id_${idKey}`)) return;
    if (testIdKey && seenTrialKeys.has(`tid_${testIdKey}`)) return;
    if (sig && seenTrialKeys.has(`sig_${sig}`)) return;

    if (idKey) seenTrialKeys.add(`id_${idKey}`);
    if (testIdKey) seenTrialKeys.add(`tid_${testIdKey}`);
    if (sig) seenTrialKeys.add(`sig_${sig}`);

    uniqueTrials.push(item);
  });

  const seenHwKeys = new Set();
  const uniqueHws = [];
  homeworksOnly.forEach(item => {
    const idKey = String(item.id || item.submissionId || '');
    if (idKey && seenHwKeys.has(idKey)) return;
    if (idKey) seenHwKeys.add(idKey);
    uniqueHws.push(item);
  });

  uniqueTrials.sort((a, b) => new Date(b.date) - new Date(a.date));
  uniqueHws.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { generalTrialExams: uniqueTrials, otherHomeworkSubmissions: uniqueHws };
}

/**
 * Generates an immutable collision-free composite key for a book test:
 * [Normalized Book Title]___[Subject]___[Unit Number]___[Category + Number]
 */
export function createCompositeTestKey(bookTitle, subjectName, unitName, testName) {
  const norm = (str) => String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç]/g, '')
    .trim();

  const b = norm(bookTitle);
  const s = norm(subjectName);
  const uMatch = String(unitName || '').match(/(\d+)/);
  const u = uMatch ? uMatch[1] : norm(unitName);
  
  const t = String(testName || '').toLowerCase();
  const numMatch = t.match(/\d+/g);
  const num = numMatch ? numMatch[numMatch.length - 1] : '';
  let cat = 'test';
  if (t.includes('ünite değerlendirme') || t.includes('ü. değ') || t.includes('ü.değ') || t.includes('ü değ') || t.includes('udeg')) {
    cat = 'udeg';
  } else if (t.includes('yeni nesil') || t.includes('yeninesil') || t.includes('yn')) {
    cat = 'yeninesil';
  } else if (t.includes('paragraf')) {
    cat = 'paragraf';
  } else if (t.includes('problem')) {
    cat = 'problem';
  }

  return `${b}___${s}___u${u}___${cat}_${num}`;
}

export function getSubmissionCompositeKey(s) {
  if (!s) return '';
  if (s._compKey) return s._compKey;
  if (s.compositeKey) {
    s._compKey = s.compositeKey;
    return s.compositeKey;
  }
  const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a?.type === 'metadata') : (s.metadata || {});
  if (meta?.compositeKey) {
    s._compKey = meta.compositeKey;
    return meta.compositeKey;
  }

  const rawTitle = String(s.title || s.testTitle || s.test_title || meta?.testTitle || '').trim();
  let book = String(s.bookTitle || meta?.bookTitle || '').trim();
  let subj = String(s.subject || s.subjectName || meta?.subjectName || meta?.subject || '').trim();
  let unit = String(s.unit || s.unitName || meta?.unitTopic || meta?.topicName || '').trim();
  let test = String(s.testName || meta?.testName || '').trim();

  let subStr = rawTitle;
  if (subStr.includes('—')) {
    const parts = subStr.split('—');
    if (!book) book = parts[0].trim();
    subStr = parts.slice(1).join('—').trim();
  }
  if (subStr.includes('›') || subStr.includes('>')) {
    const parts = subStr.split(/[›>]/);
    if (!subj) subj = parts[0].trim();
    subStr = parts.slice(1).join('›').trim();
  }
  const parenMatch = subStr.match(/\((.*?)\)/);
  if (parenMatch) {
    if (!test) test = parenMatch[1].trim();
    if (!unit) unit = subStr.replace(/\(.*?\)/, '').trim();
  } else if (!test) {
    test = subStr.trim();
  }

  const res = createCompositeTestKey(book, subj, unit, test);
  s._compKey = res;
  return res;
}

/**
 * Accurately checks if a submission matches a specific book test without falsely matching generic names or cross-subject tests.
 */
export function isSubmissionMatchingBookTest(s, targetTestOrId, bookTests = [], books = []) {
  if (!s || !targetTestOrId) return false;
  if (s.status === 'in_progress' || s.status === 'draft') return false;

  const specId = typeof targetTestOrId === 'object' ? String(targetTestOrId.id || targetTestOrId.testId || targetTestOrId.bookTestId || '') : String(targetTestOrId);
  const specClean = specId.replace(/^q_/, '').replace(/^bt_/, '').replace(/^tbt_/, '');
  const specUuid = String(toUUID(specClean || specId) || '');

  const sTestId = String(s.testId || s.test_id || '');
  const sClean = sTestId.replace(/^q_/, '').replace(/^bt_/, '').replace(/^tbt_/, '');
  const sUuid = String(toUUID(sClean || sTestId) || '');

  const sRealTestId = String(s.realTestId || s.metadata?.realTestId || '');
  const sRealClean = sRealTestId.replace(/^q_/, '').replace(/^bt_/, '').replace(/^tbt_/, '');

  const sBookTestId = String(s.bookTestId || s.metadata?.bookTestId || '');
  const sBookClean = sBookTestId.replace(/^q_/, '').replace(/^bt_/, '').replace(/^tbt_/, '');

  // ⚡ FAST PATH 1: Instant Direct ID Matching (0.0001ms)
  if (specId && specId !== 'undefined' && specId !== 'null' && specClean.length > 3) {
    const isDirectIdMatch = (sTestId && (sTestId === specId || sClean === specClean || (specUuid && sUuid === specUuid))) ||
                            (sRealTestId && (sRealTestId === specId || sRealClean === specClean || (specUuid && toUUID(sRealClean) === specUuid))) ||
                            (sBookTestId && (sBookTestId === specId || sBookClean === specClean || (specUuid && toUUID(sBookClean) === specUuid))) ||
                            (s.id && (String(s.id).includes(specClean) || String(s.id).includes(specId) || (specUuid && String(s.id).includes(specUuid)))) ||
                            (s.metadata?.testId && String(s.metadata.testId) === specId) ||
                            (s.metadata?.realTestId && String(s.metadata.realTestId) === specId) ||
                            (s.metadata?.bookTestId && String(s.metadata.bookTestId) === specId) ||
                            (Array.isArray(s.bookTestIds) && s.bookTestIds.some(id => String(id) === specId || (specUuid && toUUID(id) === specUuid))) ||
                            (Array.isArray(s.tests) && s.tests.some(id => String(id) === specId || (specUuid && toUUID(id) === specUuid)));

    if (isDirectIdMatch) {
      const sSubj = String(s.subject || s.subjectName || s.metadata?.subject || s.lesson || '').toLowerCase().trim();
      const tSubj = String(targetTestOrId?.subject || targetTestOrId?.subjectName || targetTestOrId?.parentSubjectName || '').toLowerCase().trim();
      if (sSubj && tSubj) {
        const isCrossConflict = (tSubj.includes('türk') && (sSubj.includes('mat') || sSubj.includes('fen') || sSubj.includes('sos'))) ||
                                (tSubj.includes('mat') && (sSubj.includes('türk') || sSubj.includes('fen') || sSubj.includes('sos'))) ||
                                (tSubj.includes('fen') && (sSubj.includes('türk') || sSubj.includes('mat') || sSubj.includes('sos'))) ||
                                (tSubj.includes('sos') && (sSubj.includes('türk') || sSubj.includes('mat') || sSubj.includes('fen')));
        if (isCrossConflict) return false;
      }
      return true;
    }
  }

  let targetTest = typeof targetTestOrId === 'object'
    ? targetTestOrId
    : (bookTests || []).find(bt => String(bt.id) === specId || (toUUID(bt.id) && String(toUUID(bt.id)) === specUuid));

  // 🛡️ 2. COMPOSITE SIGNATURE MATCHING (Pillar 1: Guaranteed Cross-Disciplinary Safety)
  if (targetTest) {
    const tBookTitle = targetTest.bookTitle || '';
    const tSubjName = targetTest.subject || targetTest.subjectName || targetTest.parentSubjectName || '';
    const tUnitName = targetTest.unit || targetTest.unitName || targetTest.unitTopic || targetTest.topicName || '';
    const tTestName = targetTest.name || targetTest.title || targetTest.testName || '';

    if (tBookTitle && tSubjName && tTestName) {
      const targetSig = createCompositeTestKey(tBookTitle, tSubjName, tUnitName, tTestName);
      const subSig = getSubmissionCompositeKey(s);
      if (targetSig && subSig && targetSig === subSig) {
        return true;
      }
    }
  }

  // Lookup targetTest metadata from bookTests if not already filled
  if (targetTest && !targetTest.name && !targetTest.title && !targetTest.testName && specClean) {
    const found = (bookTests || []).find(bt => {
      const btClean = String(bt.id).replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
      return String(bt.id) === specId || btClean === specClean || (toUUID(bt.id) && toUUID(bt.id) === specUuid);
    });
    if (found) targetTest = { ...found, ...targetTest };
  }

  const cleanHelper = (str) => String(str || '')
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s*\(tüm kitap görevi\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const tName = cleanHelper(targetTest?.name || targetTest?.testName || targetTest?.title || '');
  if (!tName || tName.length < 2) return false; // Prevent empty string matching!

  // Parse submission metadata
  const rawSTitle = String(s.title || s.testTitle || s.test_title || s.metadata?.testTitle || s.testName || '').trim();
  let subStr = rawSTitle;
  let subBook = String(s.bookTitle || s.metadata?.bookTitle || '').trim();
  let subSubject = String(s.subject || s.subjectName || s.metadata?.subject || s.metadata?.ders || s.ders || '').trim();
  let subUnit = String(s.unit || s.unitName || s.topic || s.topicName || s.metadata?.unit || s.metadata?.topic || '').trim();
  let subTest = '';

  if (subStr.includes('—')) {
    const parts = subStr.split('—');
    if (!subBook) subBook = parts[0].trim();
    subStr = parts.slice(1).join('—').trim();
  } else if (subStr.includes(' - ') && !subStr.match(/\d+\s*-\s*\d+/)) {
    const parts = subStr.split(' - ');
    if (!subBook && parts.length > 1) subBook = parts[0].trim();
    subStr = parts.slice(1).join(' - ').trim();
  }

  if (subStr.includes('›') || subStr.includes('>')) {
    const parts = subStr.split(/[›>]/);
    if (!subSubject) subSubject = parts[0].trim();
    subStr = parts.slice(1).join('›').trim();
  }

  const parenMatch = subStr.match(/\((.*?)\)/);
  if (parenMatch) {
    subTest = parenMatch[1].trim();
    if (!subUnit) subUnit = subStr.replace(/\(.*?\)/, '').trim();
  } else {
    subTest = subStr.trim();
  }

  if (!subSubject) {
    const sLow = rawSTitle.toLowerCase();
    if (sLow.includes('türkçe') || sLow.includes('turkce') || sLow.includes('paragraf')) subSubject = 'Türkçe';
    else if (sLow.includes('matematik') || sLow.includes('mat') || sLow.includes('problem')) subSubject = 'Matematik';
    else if (sLow.includes('fen')) subSubject = 'Fen Bilimleri';
    else if (sLow.includes('sosyal')) subSubject = 'Sosyal Bilgiler';
  }

  if (!subUnit) {
    const uMatch = rawSTitle.match(/(\d+)\.\s*ünite/i);
    if (uMatch) subUnit = `${uMatch[1]}. Ünite`;
  }

  const subPageMatch = rawSTitle.match(/(\d+)\s*[-–/]\s*(\d+)/);
  const subPages = s.metadata?.pageRange || (subPageMatch ? `${subPageMatch[1]}-${subPageMatch[2]}` : '');

  const normSubTest = cleanHelper(subTest);
  const normSubSubject = cleanHelper(subSubject);
  const normSubUnit = cleanHelper(subUnit);
  const normSubBook = cleanHelper(subBook);

  const tSubject = cleanHelper(targetTest?.subject || targetTest?.subjectName || targetTest?.parentSubjectName || targetTest?.ders || '');
  const tUnit = cleanHelper(targetTest?.unit || targetTest?.unitName || targetTest?.unitTopic || targetTest?.topic || targetTest?.topicName || '');
  const tBook = cleanHelper(targetTest?.bookTitle || targetTest?.bookName || '');
  const tPageMatch = (tName || '').match(/(\d+)\s*[-–/]\s*(\d+)/);
  const tPages = targetTest?.pageRange || (tPageMatch ? `${tPageMatch[1]}-${tPageMatch[2]}` : '');

  // 2. Strict Page Number Matching
  if (tPages && subPages) {
    if (tPages === subPages) return true;
    return false; // Different page ranges never match
  }

  // 3. Strict Book Isolation (if both books are known)
  if (tBook && normSubBook) {
    const isBookMatch = tBook.includes(normSubBook) || normSubBook.includes(tBook) ||
      (tBook.includes('paragraf') && normSubBook.includes('paragraf')) ||
      (tBook.includes('ünite ünite') && normSubBook.includes('ünite ünite'));
    if (!isBookMatch) return false;
  }

  // 4. Strict Subject Isolation
  if (tSubject && normSubSubject) {
    const isSubjectMatch = tSubject === normSubSubject ||
      (tSubject.includes('türk') && normSubSubject.includes('türk')) ||
      (tSubject.includes('mat') && normSubSubject.includes('mat')) ||
      (tSubject.includes('fen') && normSubSubject.includes('fen')) ||
      (tSubject.includes('sos') && normSubSubject.includes('sos'));
    if (!isSubjectMatch) return false;
  }

  // 5. Strict Unit Isolation
  const tUnitNum = tUnit.match(/(\d+)\.\s*ünite/i)?.[1] || tUnit.match(/ünite\s*(\d+)/i)?.[1];
  const sUnitNum = normSubUnit.match(/(\d+)\.\s*ünite/i)?.[1] || normSubUnit.match(/ünite\s*(\d+)/i)?.[1];
  if (tUnitNum && sUnitNum && tUnitNum !== sUnitNum) {
    return false; // Different units can NEVER match!
  }

  // 6. Test Category & Number Canonical Normalizer (ONLY if unit numbers match!)
  const extractTestCategoryAndNumber = (str) => {
    const s = cleanHelper(str);
    const numMatch = s.match(/\d+/g);
    const num = numMatch ? parseInt(numMatch[numMatch.length - 1], 10) : null;
    let category = 'test';
    if (s.includes('ünite değerlendirme') || s.includes('ü. değ') || s.includes('ü.değ') || s.includes('ü değ') || s.includes('udeg') || s.includes('ünite deg')) {
      category = 'udeg';
    } else if (s.includes('yeni nesil') || s.includes('yeninesil') || s.includes('yn')) {
      category = 'yeninesil';
    } else if (s.includes('paragraf')) {
      category = 'paragraf';
    }
    return { category, num, raw: s };
  };

  const tCat = extractTestCategoryAndNumber(tName);
  const sCat = extractTestCategoryAndNumber(normSubTest || rawSTitle);

  if (tUnitNum && sUnitNum && tUnitNum === sUnitNum) {
    if (tCat.category && sCat.category && tCat.category === sCat.category) {
      if (tCat.num !== null && sCat.num !== null && tCat.num === sCat.num) {
        return true;
      }
    }
  }

  // 7. Exact String Matching with Strict Number Isolation
  if (!normSubTest || normSubTest.length < 2) return false;

  const cleanTName = tName.replace(/^.*?—\s*/, '').replace(/^.*?[›>]\s*/, '').trim();
  const normOnlyChars = (str) => cleanHelper(str).replace(/[^a-z0-9ğüşıöç]/g, '');

  const normSubChars = normOnlyChars(normSubTest);
  const normTChars = normOnlyChars(cleanTName);

  if (normSubChars === normTChars && normTChars.length >= 2) {
    if (!tUnitNum || !sUnitNum || tUnitNum === sUnitNum) {
      return true;
    }
  }

  const subNums = (normSubTest.match(/\d+/g) || []).join('-');
  const targetNums = (cleanTName.match(/\d+/g) || []).join('-');

  if (subNums && targetNums && subNums !== targetNums) {
    return false; // Test-1 vs Test-14 mismatch!
  }

  if ((subNums && !targetNums) || (!subNums && targetNums)) {
    return false;
  }

  if (normSubTest === cleanTName) {
    if (!tUnitNum || !sUnitNum || tUnitNum === sUnitNum) {
      return true;
    }
  }

  if ((normSubTest.length >= 6 && cleanTName.includes(normSubTest)) || (cleanTName.length >= 6 && normSubTest.includes(cleanTName))) {
    if (subNums === targetNums) {
      if (!tUnitNum || !sUnitNum || tUnitNum === sUnitNum) {
        return true;
      }
    }
  }

  return false;
}
