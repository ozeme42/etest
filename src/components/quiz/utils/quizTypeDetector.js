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

  // 1. TOP PRIORITY: Explicit Multiple-Choice Flags or Options or AnswerKey -> NOT OPEN-ENDED!
  const hasOptions = (Array.isArray(sec?.options) && sec.options.length > 1) ||
                     (Array.isArray(bankQ?.options) && bankQ.options.length > 1);
  const hasAnswerKey = (Array.isArray(sec?.answerKey) && sec.answerKey.length > 0) ||
                       (typeof sec?.answerKey === 'string' && sec.answerKey.trim().length > 0) ||
                       (typeof sec?.answerKey === 'object' && sec?.answerKey !== null && Object.keys(sec.answerKey).length > 0 && sec?.answerKey.__meta?.isOpenEnded !== true) ||
                       (Array.isArray(bankQ?.answerKey) && bankQ.answerKey.length > 0) ||
                       (typeof bankQ?.answerKey === 'string' && bankQ.answerKey.trim().length > 0);

  if (
    sec?.questionType === 'coktan_secmeli' ||
    sec?.type === 'coktan_secmeli' ||
    sec?.formatType === 'coktan_secmeli' ||
    sec?.sourceFormat === 'coktan_secmeli' ||
    bankQ?.questionType === 'coktan_secmeli' ||
    bankQ?.type === 'coktan_secmeli' ||
    bankQ?.formatType === 'coktan_secmeli' ||
    bankQ?.sourceFormat === 'coktan_secmeli' ||
    hasOptions ||
    hasAnswerKey
  ) {
    return false;
  }

  // 2. Explicit Open-Ended Flags on Section or Bank Question
  if (
    sec?.type === 'acik_uclu' ||
    sec?.questionType === 'acik_uclu' ||
    sec?.type === 'gorsel_klasik' ||
    sec?.questionType === 'gorsel_klasik' ||
    sec?.formatType === 'gorsel_klasik' ||
    sec?.sourceFormat === 'gorsel_klasik' ||
    sec?.isOpenEnded === true ||
    sec?.is_open_ended === true ||
    sec?.openEnded === true ||
    sec?.answerKey?.__meta?.isOpenEnded === true ||
    sec?.answerKey?.__meta?.questionType === 'acik_uclu' ||
    (sec?.name && /açık\s*uçlu|acik\s*uclu|klasik\s*soru|yazılı\s*klasik/i.test(sec.name)) ||
    (sec?.title && /açık\s*uçlu|acik\s*uclu|klasik\s*soru|yazılı\s*klasik/i.test(sec.title)) ||
    bankQ?.type === 'acik_uclu' ||
    bankQ?.questionType === 'acik_uclu' ||
    bankQ?.type === 'gorsel_klasik' ||
    bankQ?.questionType === 'gorsel_klasik' ||
    bankQ?.formatType === 'gorsel_klasik' ||
    bankQ?.sourceFormat === 'gorsel_klasik' ||
    bankQ?.isOpenEnded === true ||
    bankQ?.is_open_ended === true ||
    bankQ?.openEnded === true ||
    bankQ?.answerKey?.__meta?.isOpenEnded === true ||
    bankQ?.answerKey?.__meta?.questionType === 'acik_uclu'
  ) {
    return true;
  }

  // 3. Test-level flags for single-test assignments (where test IS the section)
  if (!sec?.id || sec?.id === test?.id || !test?.sections?.length) {
    const testHasKey = (Array.isArray(test?.answerKey) && test.answerKey.length > 0) ||
                       (typeof test?.answerKey === 'string' && test.answerKey.trim().length > 0) ||
                       (typeof test?.answerKey === 'object' && test?.answerKey !== null && Object.keys(test.answerKey).length > 0 && test?.answerKey.__meta?.isOpenEnded !== true);
    if (
      test?.questionType === 'coktan_secmeli' ||
      test?.type === 'coktan_secmeli' ||
      test?.formatType === 'coktan_secmeli' ||
      testHasKey
    ) {
      return false;
    }

    if (
      test?.type === 'acik_uclu' ||
      test?.questionType === 'acik_uclu' ||
      test?.examType === 'acik_uclu' ||
      test?.formatType === 'gorsel_klasik' ||
      test?.sourceFormat === 'gorsel_klasik' ||
      test?.isOpenEnded === true ||
      test?.openEnded === true ||
      test?.is_open_ended === true ||
      test?.answerKey?.__meta?.isOpenEnded === true ||
      test?.answerKey?.__meta?.questionType === 'acik_uclu' ||
      (test?.name && /açık\s*uçlu|acik\s*uclu|klasik\s*soru|yazılı\s*klasik/i.test(test.name)) ||
      (test?.title && /açık\s*uçlu|acik\s*uclu|klasik\s*soru|yazılı\s*klasik/i.test(test.title))
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
    q?.type === 'gorsel_klasik' ||
    q?.questionType === 'gorsel_klasik' ||
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
  // 1. Explicit Multiple-Choice on Question level
  if (
    qObj?.questionType === 'coktan_secmeli' ||
    qObj?.type === 'coktan_secmeli' ||
    qObj?.contentType === 'coktan_secmeli' ||
    (Array.isArray(qObj?.options) && qObj.options.length > 1) ||
    qObj?.correctAnswerLetter ||
    typeof qObj?.correctAnswer === 'number'
  ) {
    return false;
  }

  // 2. If question itself is explicitly Open-Ended
  const isQExplicitOE = Boolean(
    qObj?.type === 'acik_uclu' ||
    qObj?.questionType === 'acik_uclu' ||
    qObj?.contentType === 'acik_uclu' ||
    qObj?.type === 'gorsel_klasik' ||
    qObj?.questionType === 'gorsel_klasik' ||
    qObj?.isOpenEnded === true ||
    qObj?.openEnded === true ||
    qObj?.is_open_ended === true
  );

  if (isQExplicitOE) {
    return true;
  }

  return isSectionOpenEnded(sec, test);
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
