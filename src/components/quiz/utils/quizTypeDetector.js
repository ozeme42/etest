/**
 * quizTypeDetector.js
 * 
 * Provides deterministic, reliable type detection for Questions, Sections, and Tests.
 * Explicitly separates Multiple-Choice, Open-Ended (Written), HTML, PDF, and Physical formats.
 */

/**
 * Checks if a section or bank question is explicitly open-ended (written/klasik).
 */
export function isSectionOpenEnded(sec = {}, test = {}) {
  const bankQ = sec?.bankQ || {};

  // 1. If explicitly multiple-choice, NEVER open-ended
  if (
    sec?.formatType === 'coktan_secmeli' ||
    sec?.sourceFormat === 'coktan_secmeli' ||
    sec?.questionType === 'coktan_secmeli' ||
    sec?.type === 'coktan_secmeli' ||
    bankQ?.formatType === 'coktan_secmeli' ||
    bankQ?.sourceFormat === 'coktan_secmeli' ||
    bankQ?.questionType === 'coktan_secmeli' ||
    bankQ?.type === 'coktan_secmeli'
  ) {
    return false;
  }

  // 2. Explicit section / bank question open-ended flags
  if (
    sec?.formatType === 'yazili' ||
    sec?.sourceFormat === 'yazili' ||
    sec?.formatType === 'gorsel_klasik' ||
    sec?.sourceFormat === 'gorsel_klasik' ||
    sec?.questionType === 'acik_uclu' ||
    sec?.type === 'acik_uclu' ||
    sec?.questionType === 'yazili' ||
    sec?.type === 'yazili' ||
    sec?.questionType === 'gorsel_klasik' ||
    sec?.type === 'gorsel_klasik' ||
    sec?.isOpenEnded === true ||
    sec?.is_open_ended === true ||
    sec?.openEnded === true ||
    bankQ?.formatType === 'yazili' ||
    bankQ?.sourceFormat === 'yazili' ||
    bankQ?.formatType === 'gorsel_klasik' ||
    bankQ?.sourceFormat === 'gorsel_klasik' ||
    bankQ?.questionType === 'acik_uclu' ||
    bankQ?.type === 'acik_uclu' ||
    bankQ?.questionType === 'yazili' ||
    bankQ?.type === 'yazili' ||
    bankQ?.questionType === 'gorsel_klasik' ||
    bankQ?.type === 'gorsel_klasik' ||
    bankQ?.isOpenEnded === true ||
    bankQ?.is_open_ended === true ||
    bankQ?.openEnded === true
  ) {
    return true;
  }

  // 3. Test-level open-ended flags
  if (
    test?.examType === 'acik_uclu' ||
    test?.formatType === 'yazili' ||
    test?.sourceFormat === 'yazili' ||
    test?.formatType === 'gorsel_klasik' ||
    test?.sourceFormat === 'gorsel_klasik' ||
    test?.isOpenEnded === true ||
    test?.openEnded === true ||
    test?.is_open_ended === true
  ) {
    return true;
  }

  // 4. Any question inside resolvedQuestions is open-ended
  if (Array.isArray(sec?.resolvedQuestions) && sec.resolvedQuestions.length > 0) {
    const hasOEQuestion = sec.resolvedQuestions.some(q => (
      q?.questionType === 'acik_uclu' ||
      q?.type === 'acik_uclu' ||
      q?.contentType === 'acik_uclu' ||
      q?.questionType === 'yazili' ||
      q?.type === 'yazili' ||
      q?.contentType === 'yazili' ||
      q?.questionType === 'gorsel_klasik' ||
      q?.type === 'gorsel_klasik' ||
      q?.isOpenEnded === true ||
      q?.openEnded === true ||
      q?.is_open_ended === true
    ));
    if (hasOEQuestion) return true;
  }

  return false;
}

/**
 * Checks if a specific question is open-ended.
 */
export function isQuestionOpenEnded(qObj = {}, sec = {}, test = {}, userAnsObj = null) {
  // If the question explicitly has multiple options (e.g. [A, B, C, D]):
  if (Array.isArray(qObj?.options) && qObj.options.length >= 2) {
    return false;
  }
  if (qObj?.questionType === 'coktan_secmeli' || qObj?.type === 'coktan_secmeli') {
    return false;
  }

  // If question itself is explicitly open-ended:
  if (
    qObj?.questionType === 'acik_uclu' ||
    qObj?.type === 'acik_uclu' ||
    qObj?.contentType === 'acik_uclu' ||
    qObj?.questionType === 'yazili' ||
    qObj?.type === 'yazili' ||
    qObj?.contentType === 'yazili' ||
    qObj?.questionType === 'gorsel_klasik' ||
    qObj?.type === 'gorsel_klasik' ||
    qObj?.isOpenEnded === true ||
    qObj?.openEnded === true ||
    qObj?.is_open_ended === true
  ) {
    return true;
  }

  // If section/test is open-ended:
  if (isSectionOpenEnded(sec, test)) {
    return true;
  }

  // If student wrote open-ended answer text in submission:
  if (userAnsObj?.userAnswerText || userAnsObj?.textAns || userAnsObj?.isOpenEnded === true) {
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
  if (cType.includes('pdf') || sec?.pdfUrl || bankQ?.pdfUrl || test?.pdfUrl) return 'pdf';
  if (cType.includes('html') || sec?.htmlPayload || bankQ?.htmlPayload || test?.htmlPayload) return 'html';
  if (isSectionOpenEnded(sec, test)) return 'open_ended';
  return 'multiple_choice';
}
