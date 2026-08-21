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
  const docPayload = extractDirectDocumentPayload(sec) || extractDirectDocumentPayload(sec?.bankQ) || extractDirectDocumentPayload(test);

  const rawContentType = String(sec.contentType || sec.type || sec.format || test.contentType || test.type || '').toLowerCase();
  if (rawContentType.includes('pdf') || sec.pdfUrl || (docPayload && (docPayload.startsWith('data:application/pdf') || docPayload.includes('.pdf')))) {
    return 'pdf';
  }
  if (rawContentType.includes('html') || sec.htmlPayload || (docPayload && (docPayload.includes('<!DOCTYPE') || docPayload.includes('<html') || docPayload.includes('<div')))) {
    return 'html';
  }
  if (rawContentType.includes('gorsel') || rawContentType.includes('image') || sec.imageUrl || (Array.isArray(sec.imageUrls) && sec.imageUrls.length > 0)) {
    return 'image';
  }
  return 'standard';
}

/**
 * Determines whether a section or question is Open-Ended (Written)
 */
export function isItemOpenEnded(item = {}, parentTest = {}) {
  if (!item) return false;
  const qType = String(item.questionType || item.type || item.contentType || parentTest.questionType || parentTest.type || '').toLowerCase();
  if (qType.includes('acik_uclu') || qType.includes('yazili') || qType.includes('klasik') || item.isOpenEnded || parentTest.isOpenEnded) {
    return true;
  }
  const title = String(item.title || item.name || parentTest.title || '').toLowerCase();
  if (title.includes('açık uçlu') || title.includes('acik uclu') || title.includes('yazılı') || title.includes('yazili') || title.includes('klasik')) {
    return true;
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
  // 1. Resolve raw sections
  let rawSectionsList = [];
  const hasExplicitMultiSections = Array.isArray(rawTest.sections) && rawTest.sections.length > 1;
  const candidateSections = hasExplicitMultiSections ? rawTest.sections : null;

  if (candidateSections && candidateSections.length > 1) {
    rawSectionsList = candidateSections.map((item, idx) => {
      const itemId = typeof item === 'object' ? (item.id || item.questionId) : item;
      const bankQ = allBankQuestions.find(q => String(q.id) === String(itemId) || String(q.id).replace(/^q_/, '') === String(itemId).replace(/^q_/, '')) ||
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
      const optionsCount = (rawOpts.length >= 5 || Number(sec.optionsCount || rawTest.optionsCount) === 5) ? 5 : 4;
      const letters = optionsCount === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];

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
  rawSections.forEach(s => {
    sectionsMap[s.id] = {
      answers: {},
      openEndedText: {},
      teacherScores: {},
      teacherNotes: {}
    };
  });

  const rawAns = submission.answers || submission.formattedAnswers || submission.raw_data?.answers || [];

  if (Array.isArray(rawAns)) {
    rawAns.forEach((a, idx) => {
      // Find matching section
      let matchedSec = null;
      if (a.sectionId) {
        matchedSec = rawSections.find(s =>
          String(s.id) === String(a.sectionId) ||
          String(s.raw?.questionId) === String(a.sectionId) ||
          String(s.id).replace(/^q_|^hw_|^sec_/, '') === String(a.sectionId).replace(/^q_|^hw_|^sec_/, '')
        );
      }
      if (!matchedSec && a.questionId) {
        matchedSec = rawSections.find(s => s.questions.some(q => String(q.id) === String(a.questionId)));
      }
      if (!matchedSec && a.sectionIndex !== undefined && rawSections[a.sectionIndex]) {
        matchedSec = rawSections[a.sectionIndex];
      }
      if (!matchedSec) {
        matchedSec = rawSections[0];
      }

      const sId = matchedSec?.id || rawSections[0]?.id || 'sec_1';
      const qNo = Number(a.questionNoInSection || a.questionNo || (idx + 1));
      if (!sectionsMap[sId]) {
        sectionsMap[sId] = { answers: {}, openEndedText: {}, teacherScores: {}, teacherNotes: {} };
      }

      // MC Answer
      if (a.userAnswer !== null && a.userAnswer !== undefined && a.userAnswer !== '' && a.userAnswer !== 'empty') {
        const uVal = typeof a.userAnswer === 'object' ? a.userAnswer.userAnswer : a.userAnswer;
        const normOpt = normalizeOptionIndex(uVal);
        if (normOpt !== null) {
          sectionsMap[sId].answers[qNo] = normOpt;
          sectionsMap[sId].answers[String(qNo)] = normOpt;
        }
      }

      // Open-Ended Text
      const textVal = a.userAnswerText || a.user_answer_text || a.textAns || (typeof a.userAnswer === 'string' && isNaN(Number(a.userAnswer)) ? a.userAnswer : null);
      if (textVal) {
        const str = typeof textVal === 'string' ? textVal : (textVal.text || textVal.userAnswerText || '');
        sectionsMap[sId].openEndedText[qNo] = str;
        sectionsMap[sId].openEndedText[String(qNo)] = str;
      }

      // Teacher Score & Note
      if (a.score !== undefined && a.score !== null && a.score !== '') {
        sectionsMap[sId].teacherScores[qNo] = a.score === 'empty' ? 'empty' : Number(a.score);
        sectionsMap[sId].teacherScores[String(qNo)] = sectionsMap[sId].teacherScores[qNo];
      }
      if (a.teacherNote || a.note) {
        sectionsMap[sId].teacherNotes[qNo] = String(a.teacherNote || a.note);
        sectionsMap[sId].teacherNotes[String(qNo)] = sectionsMap[sId].teacherNotes[qNo];
      }
    });
  }

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
