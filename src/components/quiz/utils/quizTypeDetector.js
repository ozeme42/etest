/**
 * quizTypeDetector.js
 * 
 * Provides deterministic, reliable type detection for Questions, Sections, and Tests.
 * Explicitly respects user-chosen types: 'acik_uclu' (written/open-ended) vs 'coktan_secmeli' (multiple-choice).
 */

/**
 * Checks if a section or bank question is explicitly open-ended (written/klasik).
 */
export function isSectionOpenEnded(sec = {}, test = {}) {
  const bankQ = sec?.bankQ || {};

  // 1. HIGHEST PRIORITY: Explicit Open-Ended Flags on Section, Bank Question, or Test
  if (
    sec?.type === 'acik_uclu' ||
    sec?.questionType === 'acik_uclu' ||
    sec?.formatType === 'yazili' ||
    sec?.sourceFormat === 'yazili' ||
    sec?.type === 'yazili' ||
    sec?.questionType === 'yazili' ||
    sec?.formatType === 'gorsel_klasik' ||
    sec?.sourceFormat === 'gorsel_klasik' ||
    sec?.type === 'gorsel_klasik' ||
    sec?.questionType === 'gorsel_klasik' ||
    sec?.isOpenEnded === true ||
    sec?.is_open_ended === true ||
    sec?.openEnded === true ||
    bankQ?.type === 'acik_uclu' ||
    bankQ?.questionType === 'acik_uclu' ||
    bankQ?.formatType === 'yazili' ||
    bankQ?.sourceFormat === 'yazili' ||
    bankQ?.type === 'yazili' ||
    bankQ?.questionType === 'yazili' ||
    bankQ?.formatType === 'gorsel_klasik' ||
    bankQ?.sourceFormat === 'gorsel_klasik' ||
    bankQ?.type === 'gorsel_klasik' ||
    bankQ?.questionType === 'gorsel_klasik' ||
    bankQ?.isOpenEnded === true ||
    bankQ?.is_open_ended === true ||
    bankQ?.openEnded === true ||
    test?.type === 'acik_uclu' ||
    test?.questionType === 'acik_uclu' ||
    test?.examType === 'acik_uclu' ||
    test?.formatType === 'yazili' ||
    test?.sourceFormat === 'yazili' ||
    test?.type === 'yazili' ||
    test?.questionType === 'yazili' ||
    test?.formatType === 'gorsel_klasik' ||
    test?.sourceFormat === 'gorsel_klasik' ||
    test?.isOpenEnded === true ||
    test?.openEnded === true ||
    test?.is_open_ended === true
  ) {
    return true;
  }

  // 2. Explicit Multiple-Choice Flags
  if (
    sec?.type === 'coktan_secmeli' ||
    sec?.questionType === 'coktan_secmeli' ||
    sec?.formatType === 'coktan_secmeli' ||
    sec?.sourceFormat === 'coktan_secmeli' ||
    bankQ?.type === 'coktan_secmeli' ||
    bankQ?.questionType === 'coktan_secmeli' ||
    bankQ?.formatType === 'coktan_secmeli' ||
    bankQ?.sourceFormat === 'coktan_secmeli' ||
    test?.type === 'coktan_secmeli' ||
    test?.questionType === 'coktan_secmeli'
  ) {
    return false;
  }

  // 3. Check resolved questions for explicit open-ended items
  const resQs = Array.isArray(sec?.resolvedQuestions) && sec.resolvedQuestions.length > 0
    ? sec.resolvedQuestions
    : (Array.isArray(test?.questions) ? test.questions : []);

  if (resQs.length > 0) {
    const hasOEQuestion = resQs.some(q => (
      q?.type === 'acik_uclu' ||
      q?.questionType === 'acik_uclu' ||
      q?.type === 'yazili' ||
      q?.questionType === 'yazili' ||
      q?.contentType === 'acik_uclu' ||
      q?.contentType === 'yazili' ||
      q?.type === 'gorsel_klasik' ||
      q?.questionType === 'gorsel_klasik' ||
      q?.isOpenEnded === true ||
      q?.openEnded === true ||
      q?.is_open_ended === true
    ));
    if (hasOEQuestion) return true;
  }

  // 4. Fallback: If questions have multiple options and not marked open-ended -> multiple choice
  if (resQs.some(q => (Array.isArray(q?.options) && q.options.length >= 2) || (Array.isArray(q?.choices) && q.choices.length >= 2))) {
    return false;
  }

  // 5. Fallback: If answer key exists with letter choices (A, B, C, D) -> multiple choice
  const ak = sec?.answerKey || bankQ?.answerKey || test?.answerKey;
  if (ak) {
    if (Array.isArray(ak) && ak.some(k => typeof k === 'string' && /^[A-E]$/i.test(k.trim()))) return false;
    if (typeof ak === 'string' && /[A-E]/i.test(ak)) return false;
  }

  return false;
}

/**
 * Checks if a specific question is open-ended.
 */
export function isQuestionOpenEnded(qObj = {}, sec = {}, test = {}, userAnsObj = null) {
  // 1. Explicit Open-Ended Flags on Question, Section, or Test
  if (
    qObj?.type === 'acik_uclu' ||
    qObj?.questionType === 'acik_uclu' ||
    qObj?.contentType === 'acik_uclu' ||
    qObj?.type === 'yazili' ||
    qObj?.questionType === 'yazili' ||
    qObj?.contentType === 'yazili' ||
    qObj?.type === 'gorsel_klasik' ||
    qObj?.questionType === 'gorsel_klasik' ||
    qObj?.isOpenEnded === true ||
    qObj?.openEnded === true ||
    qObj?.is_open_ended === true ||
    isSectionOpenEnded(sec, test)
  ) {
    return true;
  }

  // 2. Explicit Multiple-Choice Flags on Question
  if (
    qObj?.questionType === 'coktan_secmeli' ||
    qObj?.type === 'coktan_secmeli' ||
    qObj?.contentType === 'coktan_secmeli'
  ) {
    return false;
  }

  // 3. Fallback: If student wrote open-ended answer text
  if (userAnsObj?.userAnswerText || userAnsObj?.textAns || userAnsObj?.isOpenEnded === true) {
    return true;
  }

  // 4. Fallback: If question has options and not explicitly open-ended
  if (Array.isArray(qObj?.options) && qObj.options.length >= 2) {
    return false;
  }
  if (Array.isArray(qObj?.choices) && qObj.choices.length >= 2) {
    return false;
  }

  return false;
}

/**
 * Detects the overall section or test format.
 */
export function detectQuizFormat(sec = {}, test = {}) {
  const bankQ = sec?.bankQ || test?.bankQ || {};
  const cType = String(sec?.contentType || sec?.type || bankQ?.contentType || bankQ?.type || test?.contentType || test?.type || '').toLowerCase();
  
  if (cType === 'physicalexam' || test?.isPhysical) return 'physical';
  if (isSectionOpenEnded(sec, test)) return 'open_ended';
  if (cType.includes('pdf') || sec?.pdfUrl || bankQ?.pdfUrl || test?.pdfUrl) return 'pdf';
  if (cType.includes('html') || sec?.htmlPayload || bankQ?.htmlPayload || test?.htmlPayload) return 'html';
  return 'multiple_choice';
}
