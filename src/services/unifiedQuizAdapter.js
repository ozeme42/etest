import { idbGetPayload } from './indexedDbService';
import { extractQuestionText, extractQuestionOptions, resolveTestQuestions } from '../utils/testResolver';
import { checkIsAnswerCorrect } from '../utils/answerEvaluation';

/**
 * Normalizes a single option or string into clean letter index (0..4) or null.
 */
export function normalizeOptionIndex(val) {
  if (val === null || val === undefined || val === '' || val === 'empty') return null;
  if (typeof val === 'number') {
    return (val >= 0 && val <= 4) ? val : null;
  }
  if (typeof val === 'object') {
    return normalizeOptionIndex(val.userAnswer ?? val.value ?? val.optionIndex ?? val.index);
  }
  const str = String(val).trim().toUpperCase();
  if (/^[A-E]$/.test(str)) {
    return str.charCodeAt(0) - 65;
  }
  const num = Number(str);
  return (!isNaN(num) && num >= 0 && num <= 4) ? num : null;
}

/**
 * Normalizes an option letter index (0..4) into 'A', 'B', 'C', 'D', 'E'.
 */
export function optionIndexToLetter(idx) {
  if (idx === null || idx === undefined || idx < 0 || idx > 4) return '';
  return String.fromCharCode(65 + Number(idx));
}

/**
 * Extracts all non-indexeddb image payloads from a question or section object.
 */
export function extractDirectImages(item) {
  if (!item) return [];
  const urls = [];
  
  const processCand = (c) => {
    if (typeof c !== 'string' || !c || c.includes('[STORED_IN_INDEXEDDB]') || c.includes('[LOCALSTORAGE_CACHE]')) return;
    if (c.includes('\n\n') || c.includes('\n') || c.includes('|')) {
      const parts = c.split(/\n\n|\n|\|/).map(s => s.trim()).filter(s => s.startsWith('data:image') || s.startsWith('http') || /\.(png|jpe?g|webp|gif)/i.test(s));
      urls.push(...parts);
    } else if (c.startsWith('data:image') || c.startsWith('http') || (c.length > 50 && !c.includes('<') && !c.includes('PDF'))) {
      urls.push(c);
    }
  };

  if (Array.isArray(item.imageUrls)) {
    item.imageUrls.forEach(processCand);
  }
  if (Array.isArray(item.images)) {
    item.images.forEach(processCand);
  }

  const singleCandidates = [item.imageUrl, item.image, item.contentPayload, item.imagePayload, item.payload, item.url];
  singleCandidates.forEach(processCand);

  return Array.from(new Set(urls.filter(Boolean)));
}

/**
 * Extracts direct document payload (PDF or HTML) from an item.
 */
export function extractDirectDocumentPayload(item) {
  if (!item) return null;
  const candidates = [
    item.documentPayload,
    item.pdfPayload,
    item.htmlPayload,
    item.contentPayload,
    item.pdfUrl,
    item.filePayload,
    item.url,
    item.payload,
    item.data
  ];
  return candidates.find(c =>
    typeof c === 'string' &&
    c.trim().length > 0 &&
    !c.includes('[STORED_IN_INDEXEDDB]') &&
    !c.includes('[LOCALSTORAGE_CACHE]')
  ) || null;
}

/**
 * Determines section content format: 'pdf' | 'html' | 'image' | 'text'
 */
export function detectSectionFormat(sec = {}, test = {}) {
  const isMultiSection = Array.isArray(test?.sections) && test.sections.length > 1;
  const docPayload = extractDirectDocumentPayload(sec) || extractDirectDocumentPayload(sec?.bankQ) || (!isMultiSection ? extractDirectDocumentPayload(test) : null);

  const secContentType = String(sec.contentType || sec.type || sec.format || (!isMultiSection ? (test.contentType || test.type) : '') || '').toLowerCase();
  if (secContentType.includes('pdf') || sec.pdfUrl || (docPayload && (docPayload.startsWith('data:application/pdf') || docPayload.includes('.pdf')))) {
    return 'pdf';
  }
  if (secContentType.includes('html') || sec.htmlPayload || (docPayload && (docPayload.includes('<!DOCTYPE') || docPayload.includes('<html') || docPayload.includes('<div')))) {
    return 'html';
  }
  if (secContentType.includes('gorsel') || secContentType.includes('image') || sec.imageUrl || (Array.isArray(sec.imageUrls) && sec.imageUrls.length > 0)) {
    return 'image';
  }
  return 'standard';
}

/**
 * Determines whether a section or question is Open-Ended (Written)
 */
export function isItemOpenEnded(item = {}, parentTest = {}) {
  if (!item) return false;

  const itemType = String(item.questionType || item.type || item.contentType || item.formatType || item.sourceFormat || '').toLowerCase();

  // 1. If item is Multiple Choice (has options or is coktan_secmeli) -> NEVER Open-Ended
  const hasMultipleChoiceType = (
    itemType.includes('coktan_secmeli') ||
    itemType.includes('multiple_choice') ||
    itemType.includes('optic') ||
    itemType.includes('optik')
  );

  const hasOptions = (
    (Array.isArray(item.options) && item.options.filter(Boolean).length >= 2) ||
    (Array.isArray(item.raw?.options) && item.raw.options.filter(Boolean).length >= 2) ||
    (Array.isArray(item.bankQ?.options) && item.bankQ.options.filter(Boolean).length >= 2)
  );

  if (hasMultipleChoiceType || hasOptions) {
    return false;
  }

  // 2. Direct explicit Open-Ended markers on item
  if (
    itemType.includes('acik_uclu') ||
    itemType.includes('open_ended') ||
    itemType.includes('gorsel_klasik') ||
    itemType === 'klasik' ||
    item.isOpenEnded === true ||
    item.is_open_ended === true ||
    item.openEnded === true
  ) {
    return true;
  }

  const itemTitle = String(item.title || item.name || item.sectionTitle || item.testTitle || '').toLowerCase();
  if (
    (itemTitle.includes('açık uçlu') || itemTitle.includes('acik uclu') || itemTitle.includes('klasik soru') || itemTitle.includes('yazılı klasik')) &&
    !itemTitle.includes('çoktan seçmeli') && !itemTitle.includes('coktan secmeli')
  ) {
    return true;
  }

  // 3. If parent test is single-section (NOT multi-section) and has open-ended markers
  const isMultiSectionParent = Array.isArray(parentTest?.sections) && parentTest.sections.length > 1;
  if (!isMultiSectionParent && parentTest) {
    const parentType = String(parentTest.questionType || parentTest.type || parentTest.contentType || '').toLowerCase();
    if (
      parentType.includes('acik_uclu') ||
      parentType.includes('open_ended') ||
      parentType.includes('gorsel_klasik') ||
      parentTest.isOpenEnded === true ||
      parentTest.is_open_ended === true
    ) {
      return true;
    }

    const parentTitle = String(parentTest.title || parentTest.name || '').toLowerCase();
    if (
      (parentTitle.includes('açık uçlu') || parentTitle.includes('acik uclu') || parentTitle.includes('klasik soru') || parentTitle.includes('yazılı klasik')) &&
      !parentTitle.includes('çoktan seçmeli') && !parentTitle.includes('coktan secmeli')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * normalizeUnifiedTest
 * Standardizes ANY test structure (single, composite, question bank, book test, PDF, HTML, Written, Multi-choice).
 */
export function normalizeUnifiedTest(rawTest = {}, allBankQuestions = []) {
  if (!rawTest || typeof rawTest !== 'object') {
    return {
      id: 'test_default',
      title: 'Sınav',
      sections: [],
      totalQuestions: 1,
      isComposite: false
    };
  }

  const testId = rawTest.id || rawTest.testId || rawTest.homeworkId || 'test_1';
  const testTitle = rawTest.title || rawTest.name || 'Sınav Dokümanı';

  // 1. Resolve raw sections
  let rawSectionsList = [];
  const candidateSections = (Array.isArray(rawTest.sections) && rawTest.sections.length > 1)
    ? rawTest.sections
    : (Array.isArray(rawTest.tests) && rawTest.tests.length > 1
        ? rawTest.tests
        : (Array.isArray(rawTest.items) && rawTest.items.length > 1 ? rawTest.items : null));

  if (candidateSections && candidateSections.length > 1) {
    rawSectionsList = candidateSections.map((item, idx) => {
      const itemId = typeof item === 'object' ? (item.id || item.questionId) : item;
      const bankQ = (Array.isArray(allBankQuestions) ? allBankQuestions.find(q => String(q.id) === String(itemId) || String(q.id).replace(/^q_/, '') === String(itemId).replace(/^q_/, '')) : null) ||
                    (typeof item === 'object' ? item : null);

      const secTitle = (typeof item === 'object' ? (item.title || item.name) : null) || bankQ?.title || bankQ?.name || `${idx + 1}. Bölüm`;
      const resolvedQs = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : (item?.questions || item?.questionsList || (typeof item === 'object' ? [item] : []));

      return {
        ...(bankQ || {}),
        ...(typeof item === 'object' ? item : {}),
        id: itemId || `sec_${idx + 1}`,
        questionId: itemId,
        title: secTitle,
        bankQ: bankQ || (typeof item === 'object' ? item : { id: itemId, title: secTitle }),
        resolvedQuestions: resolvedQs
      };
    });
  } else {
    // Single section wrapping the test itself
    let resolvedQs = [];
    if (Array.isArray(rawTest.resolvedQuestions) && rawTest.resolvedQuestions.length > 0) {
      resolvedQs = rawTest.resolvedQuestions;
    } else if (Array.isArray(rawTest.questions) && rawTest.questions.length > 0 && typeof rawTest.questions[0] === 'object' && (rawTest.questions[0].questionText || rawTest.questions[0].text || rawTest.questions[0].options)) {
      resolvedQs = rawTest.questions;
    } else if (Array.isArray(rawTest.questionsList) && rawTest.questionsList.length > 0) {
      resolvedQs = resolveTestQuestions(rawTest, allBankQuestions);
    } else {
      resolvedQs = resolveTestQuestions(rawTest, allBankQuestions);
    }

    rawSectionsList = [{
      ...rawTest,
      id: testId || 'sec_1',
      title: testTitle,
      resolvedQuestions: resolvedQs.length > 0 ? resolvedQs : (Array.isArray(rawTest.questions) && rawTest.questions.length > 0 ? rawTest.questions : [rawTest])
    }];
  }

  // 2. Normalize each section into standard schema
  let globalQuestionCounter = 1;
  const normalizedSections = rawSectionsList.map((sec, secIdx) => {
    const secId = String(sec.id || `sec_${secIdx + 1}`);
    const secTitle = sec.title || `${secIdx + 1}. Bölüm`;
    const format = detectSectionFormat(sec, rawTest);
    const isOE = isItemOpenEnded(sec, rawTest);
    const docPayload = extractDirectDocumentPayload(sec) || extractDirectDocumentPayload(sec.bankQ) || extractDirectDocumentPayload(rawTest);
    const secImages = extractDirectImages(sec);

    const rawQuestions = Array.isArray(sec.resolvedQuestions) && sec.resolvedQuestions.length > 0
      ? sec.resolvedQuestions
      : (Array.isArray(sec.questions) && sec.questions.length > 0 ? sec.questions : [sec]);

    const targetCount = sec.qCount || sec.questionCount || rawQuestions.length || 1;
    const hasMultipleRawQs = rawQuestions.length > 1;

    // Build standard questions for this section
    const normalizedQuestions = [];
    for (let i = 0; i < targetCount; i++) {
      const qObj = hasMultipleRawQs ? (rawQuestions[i] || {}) : (i === 0 ? (rawQuestions[0] || {}) : {});
      const qNo = i + 1;
      const globalNo = globalQuestionCounter++;
      const isQOE = isOE || isItemOpenEnded(qObj, sec);

      // Question text & options
      const qText = extractQuestionText(qObj, sec, i);
      const rawOpts = extractQuestionOptions(qObj, sec);
      const rawOptCount = Number(qObj.optionCount || qObj.optionsCount || sec.optionCount || sec.optionsCount || rawTest.optionCount || rawTest.optionsCount || (rawOpts.length > 0 ? rawOpts.length : 0));
      const optionsCount = (rawOptCount >= 2 && rawOptCount <= 5) ? rawOptCount : (rawOpts.length >= 5 ? 5 : 4);
      const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, optionsCount);

      const options = letters.map((opt, optIdx) => {
        const raw = rawOpts[optIdx];
        let text = '';
        if (typeof raw === 'string') text = raw;
        else if (raw && typeof raw === 'object') {
          text = raw.text || raw.optionText || raw.label || raw.title || raw.value || '';
        }
        const clean = text.trim();
        const isPlaceholder = !clean || clean.toLowerCase() === opt.toLowerCase() || clean.toLowerCase() === `şık ${opt.toLowerCase()}`;
        return {
          letter: opt,
          text: isPlaceholder ? '' : clean,
          hasText: !isPlaceholder
        };
      });

      // Images for this question
      const qImages = extractDirectImages(qObj);
      if (qImages.length === 0 && secImages.length > 0) {
        if (secImages.length === targetCount && secImages[i]) {
          qImages.push(secImages[i]);
        } else if (secImages[0]) {
          qImages.push(secImages[0]);
        }
      }

      // Correct Answer normalization:
      // Priority 1: If individual raw question object exists for this index (multi-question array): qObj.correctAnswer
      // Priority 2: sec.questionsList?.[i]?.correctAnswer
      // Priority 3: sec.answerKey / sec.bankQ.answerKey / sec.opticAnswers (matching index i / qNo)
      // Priority 4: rawTest.answerKey (matching globalNo - 1)
      // Priority 5: If targetCount === 1, qObj.correctAnswer
      let rawCorrect = null;
      if (hasMultipleRawQs && qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
        rawCorrect = qObj.correctAnswer;
      } else if (sec.questionsList?.[i]?.correctAnswer !== undefined && sec.questionsList[i].correctAnswer !== null) {
        rawCorrect = sec.questionsList[i].correctAnswer;
      } else {
        const keySources = [
          sec.answerKey,
          sec.answer_key,
          sec.opticAnswers,
          sec.imageAnswers,
          sec.bankQ?.answerKey,
          sec.bankQ?.answer_key,
          sec.bankQ?.opticAnswers,
          sec.bankQ?.imageAnswers,
          rawTest.answerKey,
          rawTest.answer_key,
          rawTest.opticAnswers
        ];
        for (const ks of keySources) {
          if (!ks) continue;
          if (Array.isArray(ks)) {
            const val = ks[i] ?? ks[String(i)] ?? (ks[0] === null ? ks[qNo] : undefined);
            if (val !== undefined && val !== null && val !== '') {
              rawCorrect = val;
              break;
            }
          } else if (typeof ks === 'object' && ks !== null) {
            const isZeroIndexed = (0 in ks) || ('0' in ks);
            const val = isZeroIndexed ? (ks[i] ?? ks[String(i)]) : (ks[qNo] ?? ks[String(qNo)] ?? ks[i]);
            if (val !== undefined && val !== null && val !== '') {
              rawCorrect = val;
              break;
            }
          } else if (typeof ks === 'string') {
            const clean = ks.replace(/[^A-Ea-e0-4]/g, '');
            if (clean.length > i) {
              rawCorrect = clean[i];
              break;
            }
          }
        }

        if (rawCorrect === null && targetCount === 1 && qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
          rawCorrect = qObj.correctAnswer;
        }
      }

      const normalizedCorrect = normalizeOptionIndex(rawCorrect);

      normalizedQuestions.push({
        id: qObj.id || `${secId}_${qNo}`,
        qNo,
        globalNo,
        sectionId: secId,
        sectionTitle: secTitle,
        type: isQOE ? 'open_ended' : 'multiple_choice',
        isOpenEnded: isQOE,
        text: qText,
        options,
        optionsCount,
        hasOptionText: options.some(o => o.hasText),
        images: qImages,
        correctAnswer: normalizedCorrect,
        rawCorrectAnswer: rawCorrect,
        maxScore: 10,
        raw: qObj
      });
    }

    return {
      id: secId,
      title: secTitle,
      format, // 'pdf' | 'html' | 'image' | 'standard'
      type: isOE ? 'open_ended' : 'multiple_choice',
      isOpenEnded: isOE,
      documentPayload: docPayload,
      pdfUrl: sec.pdfUrl || (format === 'pdf' ? docPayload : null),
      htmlPayload: sec.htmlPayload || (format === 'html' ? docPayload : null),
      images: secImages,
      questions: normalizedQuestions,
      qCount: normalizedQuestions.length,
      raw: sec
    };
  });

  const totalQuestions = normalizedSections.reduce((sum, s) => sum + s.questions.length, 0);
  const isComposite = normalizedSections.length > 1;

  return {
    id: testId,
    title: testTitle,
    isComposite,
    sections: normalizedSections,
    totalQuestions,
    timePerQuestion: Number(rawTest.timePerQuestion || rawTest.time_per_question) || 2,
    raw: rawTest
  };
}

/**
 * normalizeUnifiedSubmission
 * Standardizes student answers & grading data across all sections.
 */
export function normalizeUnifiedSubmission(rawSubmission = {}, unifiedTest = {}) {
  const submission = rawSubmission || {};
  const sectionsMap = {};

  const rawSections = unifiedTest.sections || [];

  // Precompute cumulative question ranges for all sections
  let runningCount = 0;
  const sectionRanges = rawSections.map((sec, sIdx) => {
    const qCount = sec.qCount || sec.questions?.length || sec.resolvedQuestions?.length || 1;
    const start = runningCount + 1;
    const end = runningCount + qCount;
    runningCount = end;

    const secData = {
      answers: {},
      openEndedText: {},
      teacherScores: {},
      teacherNotes: {}
    };

    sectionsMap[sIdx] = secData;
    sectionsMap[String(sIdx)] = secData;
    if (sec.id && !sectionsMap[sec.id]) sectionsMap[sec.id] = secData;

    return { sec, sIdx, start, end, qCount, secData };
  });

  const rawAns = submission.answers || submission.formattedAnswers || submission.raw_data?.answers || [];

  if (Array.isArray(rawAns)) {
    rawAns.forEach((a, idx) => {
      let matchedRange = null;
      const globalNo = Number(a.questionNo || (idx + 1));

      // 1. Primary match: Global question number mapping against sectionRanges (completely deterministic & unambiguous)
      if (globalNo && sectionRanges.length > 0) {
        matchedRange = sectionRanges.find(r => globalNo >= r.start && globalNo <= r.end);
      }

      // 2. Match by direct sectionIndex property
      if (!matchedRange && a.sectionIndex !== undefined && sectionRanges[a.sectionIndex]) {
        matchedRange = sectionRanges[a.sectionIndex];
      }

      // 3. Match by questionId within section's questions
      if (!matchedRange && a.questionId) {
        matchedRange = sectionRanges.find(r => r.sec.questions?.some(q => String(q.id) === String(a.questionId)));
      }

      // 4. Match by exact sectionId
      if (!matchedRange && a.sectionId) {
        const cleanA = String(a.sectionId).replace(/^q_|^hw_|^sec_|^sec/, '');
        matchedRange = sectionRanges.find(r =>
          String(r.sec.id) === String(a.sectionId) ||
          String(r.sec.raw?.id) === String(a.sectionId) ||
          String(r.sec.raw?.questionId) === String(a.sectionId) ||
          String(r.sec.id).replace(/^q_|^hw_|^sec_|^sec/, '') === cleanA
        );
      }

      // 5. Match by sectionTitle if single candidate
      if (!matchedRange && a.sectionTitle) {
        const sTitleNorm = String(a.sectionTitle).toLowerCase().trim();
        const candidates = sectionRanges.filter(r => r.sec.title && String(r.sec.title).toLowerCase().trim() === sTitleNorm);
        if (candidates.length === 1) {
          matchedRange = candidates[0];
        }
      }

      if (!matchedRange) {
        matchedRange = sectionRanges[0] || { sec: rawSections[0], sIdx: 0, start: 1, end: 1, qCount: 1, secData: {} };
      }

      const { sec: matchedSec, start: rStart, qCount: rCount, secData: targetSecData } = matchedRange;
      const sId = matchedSec?.id || 'sec_1';

      // Determine local question number within section (1..qCount)
      let qNo = Number(a.questionNoInSection);
      if (!qNo || isNaN(qNo) || qNo < 1 || qNo > rCount) {
        if (globalNo >= rStart && globalNo <= matchedRange.end) {
          qNo = (globalNo - rStart) + 1;
        } else {
          qNo = 1;
        }
      }

      // MC Answer
      if (a.userAnswer !== null && a.userAnswer !== undefined && a.userAnswer !== '' && a.userAnswer !== 'empty') {
        const uVal = typeof a.userAnswer === 'object' ? a.userAnswer.userAnswer : a.userAnswer;
        const normOpt = normalizeOptionIndex(uVal);
        if (normOpt !== null) {
          targetSecData.answers[qNo] = normOpt;
          targetSecData.answers[String(qNo)] = normOpt;
        }
      }

      // Open-Ended Text (checking all candidate fields and submission-level maps)
      const textVal = a.userAnswerText ||
                      a.user_answer_text ||
                      a.textAns ||
                      a.studentAnswer ||
                      a.writtenAnswer ||
                      submission.openEndedText?.[sId]?.[qNo] ||
                      submission.openEndedText?.[`${sId}_${qNo}`] ||
                      submission.openEndedText?.[qNo] ||
                      submission.raw_data?.openEndedText?.[sId]?.[qNo] ||
                      (typeof a.userAnswer === 'string' && isNaN(Number(a.userAnswer)) && !/^[A-E]$/i.test(a.userAnswer.trim()) ? a.userAnswer : null);

      if (textVal) {
        const str = typeof textVal === 'string' ? textVal : (textVal.text || textVal.userAnswerText || '');
        targetSecData.openEndedText[qNo] = str;
        targetSecData.openEndedText[String(qNo)] = str;
      }

      // Teacher Score & Note
      if (a.score !== undefined && a.score !== null && a.score !== '') {
        targetSecData.teacherScores[qNo] = a.score === 'empty' ? 'empty' : Number(a.score);
        targetSecData.teacherScores[String(qNo)] = targetSecData.teacherScores[qNo];
      }
      if (a.teacherNote || a.note) {
        targetSecData.teacherNotes[qNo] = String(a.teacherNote || a.note);
        targetSecData.teacherNotes[String(qNo)] = targetSecData.teacherNotes[qNo];
      }
    });
  }

  // Also ingest direct section maps if present in submission (e.g. submission.sections or submission.sectionAnswers)
  const directSecMaps = [
    submission.sections,
    submission.sectionAnswers,
    submission.raw_data?.sections,
    submission.raw_data?.sectionAnswers,
    submission.raw_data?.section_answers
  ].filter(Boolean);

  directSecMaps.forEach(dMap => {
    if (typeof dMap === 'object' && !Array.isArray(dMap)) {
      Object.entries(dMap).forEach(([sKey, sVal]) => {
        if (!sVal || typeof sVal !== 'object') return;
        // Only match by exact id or numeric sIdx — never by title (titles can be duplicate)
        const targetRange = sectionRanges.find(r =>
          String(r.sec.id) === String(sKey) ||
          String(r.sIdx) === String(sKey)
        );
        if (targetRange) {
          const tSecData = targetRange.secData;
          if (sVal.answers && typeof sVal.answers === 'object') {
            Object.entries(sVal.answers).forEach(([qNo, ansVal]) => {
              const norm = normalizeOptionIndex(ansVal);
              // ONLY write if slot is not already populated by the primary rawAns pass
              if (norm !== null && tSecData.answers[Number(qNo)] === undefined) {
                tSecData.answers[Number(qNo)] = norm;
                tSecData.answers[String(qNo)] = norm;
              }
            });
          }
          if (sVal.openEndedText && typeof sVal.openEndedText === 'object') {
            Object.entries(sVal.openEndedText).forEach(([qNo, txt]) => {
              if (txt && tSecData.openEndedText[Number(qNo)] === undefined) {
                tSecData.openEndedText[Number(qNo)] = String(txt);
                tSecData.openEndedText[String(qNo)] = String(txt);
              }
            });
          }
        }
      });
    }
  });

  // Teacher evaluation check
  const isTrulyEvaluated = Boolean(
    submission.isEvaluatedByTeacher === true ||
    submission.status === 'evaluated' ||
    (submission.score !== undefined && Number(submission.score) > 0) ||
    Boolean(submission.teacherFeedback || submission.teacherNote) ||
    Object.values(sectionsMap).some(s => Object.values(s.teacherScores).some(sc => sc !== undefined && sc !== null && sc !== 'empty' && sc > 0))
  );

  return {
    id: submission.id || submission.submissionId,
    studentId: submission.studentId || submission.userId,
    studentName: submission.studentName || submission.userName || 'Öğrenci',
    submittedAt: submission.submittedAt || submission.createdAt || new Date().toISOString(),
    isEvaluated: isTrulyEvaluated,
    teacherFeedback: submission.teacherFeedback || submission.teacherNote || '',
    sections: sectionsMap,
    raw: submission
  };
}

/**
 * Hydrates IndexedDB payloads into unified test sections and questions.
 */
export async function hydrateIndexedDbPayloads(unifiedTest) {
  if (!unifiedTest || !Array.isArray(unifiedTest.sections)) return unifiedTest;

  for (const sec of unifiedTest.sections) {
    const needsDoc = !sec.documentPayload || sec.documentPayload.includes('[STORED_IN_INDEXEDDB]');
    const needsImages = !sec.images || sec.images.length === 0 || sec.questions.some(q => !q.images || q.images.length === 0);

    if (needsDoc || needsImages) {
      const keysToTry = [
        sec.id,
        sec.raw?.questionId,
        sec.raw?.id,
        sec.raw?.testId,
        sec.raw?.sourceTestId,
        unifiedTest.id,
        unifiedTest.raw?.id,
        unifiedTest.raw?.homeworkId,
        unifiedTest.raw?.testId
      ].filter(Boolean);

      for (const k of keysToTry) {
        const cleanK = String(k);
        const variants = [
          cleanK,
          cleanK.replace(/^q_?/, ''),
          cleanK.replace(/^hw_?/, ''),
          cleanK.replace(/^test_?/, ''),
          `q_${cleanK.replace(/^q_?|^hw_?/, '')}`,
          `hw_${cleanK.replace(/^q_?|^hw_?/, '')}`
        ];
        for (const candidate of variants) {
          try {
            const val = await idbGetPayload(candidate);
            if (val && typeof val === 'string' && val.length > 10 && !val.includes('[STORED_IN_INDEXEDDB]')) {
              if (sec.format === 'pdf' || val.startsWith('data:application/pdf') || val.includes('.pdf')) {
                sec.documentPayload = val;
                sec.pdfUrl = val;
              } else if (sec.format === 'html' || val.includes('<!DOCTYPE') || val.includes('<html') || val.includes('<div')) {
                sec.documentPayload = val;
                sec.htmlPayload = val;
              } else {
                // Image or multi-image payload
                let imgList = [];
                if (val.includes('\n\n') || val.includes('\n') || val.includes('|')) {
                  imgList = val.split(/\n\n|\n|\|/).map(s => s.trim()).filter(s => s.startsWith('data:image') || s.startsWith('http') || /\.(png|jpe?g|webp|gif)/i.test(s));
                } else if (val.startsWith('data:image') || val.startsWith('http') || val.length > 50) {
                  imgList = [val];
                }

                if (imgList.length > 0) {
                  sec.images = imgList;
                  sec.questions.forEach((q, qIdx) => {
                    if (imgList.length === sec.questions.length && imgList[qIdx]) {
                      q.images = [imgList[qIdx]];
                    } else if (imgList[0]) {
                      q.images = [imgList[0]];
                    }
                  });
                }
              }
              break;
            }
          } catch {}
        }
        if (sec.documentPayload && !sec.documentPayload.includes('[STORED_IN_INDEXEDDB]') && sec.images && sec.images.length > 0) break;
      }
    }
  }

  return unifiedTest;
}
