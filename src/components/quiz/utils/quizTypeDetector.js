/**
 * quizTypeDetector.js
 * 
 * Provides deterministic, reliable type detection for Questions, Sections, and Tests.
 * Ensures that in multi-section composite tests, each section and question maintains its own format.
 */

/**
 * Checks if a section or bank question is open-ended (written/klasik).
 */
export function isSectionOpenEnded(sec = {}, test = {}) {
  const bankQ = sec?.bankQ || {};
  const resQs = Array.isArray(sec?.resolvedQuestions) && sec.resolvedQuestions.length > 0
    ? sec.resolvedQuestions
    : (Array.isArray(test?.questions) ? test.questions : []);

  // 1. If any question in this section has 2 or more options (A, B, C, D) -> STRICTLY MULTIPLE CHOICE
  if (resQs.some(q => (Array.isArray(q?.options) && q.options.length >= 2) || (Array.isArray(q?.choices) && q.choices.length >= 2))) {
    return false;
  }

  // 2. If section or bank question has an answer key with letter choices (A, B, C, D) -> STRICTLY MULTIPLE CHOICE
  const ak = sec?.answerKey || bankQ?.answerKey;
  if (ak) {
    if (Array.isArray(ak) && ak.some(k => typeof k === 'string' && /^[A-E]$/i.test(k.trim()))) return false;
    if (typeof ak === 'string' && /[A-E]/i.test(ak)) return false;
  }

  // 3. Explicit Multiple Choice Flags on Section or Bank Question
  if (
    sec?.type === 'coktan_secmeli' ||
    sec?.questionType === 'coktan_secmeli' ||
    sec?.formatType === 'coktan_secmeli' ||
    sec?.sourceFormat === 'coktan_secmeli' ||
    bankQ?.type === 'coktan_secmeli' ||
    bankQ?.questionType === 'coktan_secmeli' ||
    bankQ?.formatType === 'coktan_secmeli' ||
    bankQ?.sourceFormat === 'coktan_secmeli'
  ) {
    return false;
  }

  // 4. Explicit Open-Ended Flags on Section or Bank Question
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
    bankQ?.openEnded === true
  ) {
    return true;
  }

  // 5. Test-level flags ONLY for single-test assignments (where test IS the section)
  if (!sec?.id || sec?.id === test?.id) {
    if (
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
  }

  return false;
}

/**
 * Checks if a specific question is open-ended.
 */
export function isQuestionOpenEnded(qObj = {}, sec = {}, test = {}, userAnsObj = null) {
  // 1. If the question itself explicitly has 2 or more options (A, B, C, D) -> STRICTLY MULTIPLE CHOICE
  if (Array.isArray(qObj?.options) && qObj.options.length >= 2) {
    return false;
  }
  if (Array.isArray(qObj?.choices) && qObj.choices.length >= 2) {
    return false;
  }
  if (
    qObj?.type === 'coktan_secmeli' ||
    qObj?.questionType === 'coktan_secmeli' ||
    qObj?.contentType === 'coktan_secmeli'
  ) {
    return false;
  }

  // 2. If the section or bankQ is explicitly multiple choice
  const bankQ = sec?.bankQ || {};
  if (
    sec?.type === 'coktan_secmeli' ||
    sec?.questionType === 'coktan_secmeli' ||
    sec?.formatType === 'coktan_secmeli' ||
    sec?.sourceFormat === 'coktan_secmeli' ||
    bankQ?.type === 'coktan_secmeli' ||
    bankQ?.questionType === 'coktan_secmeli' ||
    bankQ?.formatType === 'coktan_secmeli' ||
    bankQ?.sourceFormat === 'coktan_secmeli'
  ) {
    return false;
  }

  // 3. Explicit question-level open-ended flags
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
    qObj?.is_open_ended === true
  ) {
    return true;
  }

  // 4. Explicit section-level open-ended flags (NOT parent test flags for multi-section)
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
    bankQ?.openEnded === true
  ) {
    return true;
  }

  // 5. Test-level flags ONLY for single-test assignments (where test IS the section)
  if (!sec?.id || sec?.id === test?.id) {
    if (
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
  }

  // 6. If student wrote open-ended answer text in submission:
  if (userAnsObj?.userAnswerText || userAnsObj?.textAns) {
    return true;
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
