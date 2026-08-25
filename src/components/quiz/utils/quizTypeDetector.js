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
  const bankQ = sec?.bankQ || test?.bankQ || {};

  // 1. TOP PRIORITY: Explicit Open-Ended Flags on Section or Bank Question
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
    sec?.answerKey?.__meta?.isOpenEnded === true ||
    sec?.answerKey?.__meta?.questionType === 'acik_uclu' ||
    (sec?.name && /açık uçlu|acik uclu|klasik|yazılı/i.test(sec.name)) ||
    (sec?.title && /açık uçlu|acik uclu|klasik|yazılı/i.test(sec.title)) ||
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
    bankQ?.answerKey?.__meta?.isOpenEnded === true ||
    bankQ?.answerKey?.__meta?.questionType === 'acik_uclu'
  ) {
    return true;
  }

  // 2. Explicit Multiple-Choice Flags on Section or Bank Question (unless explicitly overridden by open-ended name or meta)
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

  // 3. Test-level flags for single-test assignments (where test IS the section)
  if (!sec?.id || sec?.id === test?.id || !test?.sections?.length) {
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
      test?.is_open_ended === true ||
      test?.answerKey?.__meta?.isOpenEnded === true ||
      test?.answerKey?.__meta?.questionType === 'acik_uclu' ||
      (test?.name && /açık uçlu|acik uclu|klasik|yazılı/i.test(test.name)) ||
      (test?.title && /açık uçlu|acik uclu|klasik|yazılı/i.test(test.title))
    ) {
      return true;
    }
  }

  // 4. Check resolved questions for any explicit open-ended question
  const resQs = Array.isArray(sec?.resolvedQuestions) && sec.resolvedQuestions.length > 0
    ? sec.resolvedQuestions
    : (Array.isArray(test?.questions) ? test.questions : []);

  if (resQs.length > 0 && resQs.some(q => (
    q?.type === 'acik_uclu' ||
    q?.questionType === 'acik_uclu' ||
    q?.contentType === 'acik_uclu' ||
    q?.type === 'yazili' ||
    q?.questionType === 'yazili' ||
    q?.isOpenEnded === true
  ))) {
    return true;
  }

  return false;
}

/**
 * Checks if a specific question is open-ended.
 */
export function isQuestionOpenEnded(qObj = {}, sec = {}, test = {}, userAnsObj = null) {
  const bankQ = sec?.bankQ || test?.bankQ || {};

  // 1. HIGHEST PRIORITY: If question, section, bank question, or single-test container is marked as Open-Ended
  const isSectionOE = isSectionOpenEnded(sec, test);
  const isQExplicitOE = Boolean(
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
  );

  if (isSectionOE || isQExplicitOE) {
    return true;
  }

  // 2. Explicit Multiple-Choice Flags
  if (
    qObj?.type === 'coktan_secmeli' ||
    qObj?.questionType === 'coktan_secmeli' ||
    qObj?.contentType === 'coktan_secmeli' ||
    sec?.type === 'coktan_secmeli' ||
    sec?.questionType === 'coktan_secmeli' ||
    bankQ?.type === 'coktan_secmeli'
  ) {
    return false;
  }

  // 3. Fallback: If student wrote open-ended answer text
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
