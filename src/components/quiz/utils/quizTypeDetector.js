/**
 * quizTypeDetector.js
 * 
 * Provides deterministic, reliable type detection for Questions, Sections, and Tests.
 * Ensures that in multi-section composite tests, each section and question maintains its own format.
 */

/**
 * Checks if a specific question is open-ended.
 */
export function isQuestionOpenEnded(qObj = {}, sec = {}, test = {}, userAnsObj = null) {
  const bankQ = sec?.bankQ || {};

  // 1. TOP PRIORITY: Explicit Question-level Open-Ended Flags
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

  // 2. TOP PRIORITY: Explicit Question-level Multiple-Choice Flags
  if (
    qObj?.type === 'coktan_secmeli' ||
    qObj?.questionType === 'coktan_secmeli' ||
    qObj?.contentType === 'coktan_secmeli'
  ) {
    return false;
  }

  // 3. Section / Bank Question Open-Ended Flags
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

  // 4. Section / Bank Question Multiple-Choice Flags
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

  // 6. If student previously wrote open-ended answer text
  if (userAnsObj?.userAnswerText || userAnsObj?.textAns) {
    return true;
  }

  // 7. Fallback: If options have real text choices
  const hasRealOptionTexts = Array.isArray(qObj?.options) && qObj.options.length >= 2 &&
    qObj.options.some(opt => {
      if (typeof opt === 'string') {
        const t = opt.trim();
        return t.length > 0 && !['A', 'B', 'C', 'D', 'E'].includes(t.toUpperCase());
      }
      return opt && typeof opt === 'object' && (opt.text || opt.content);
    });

  if (hasRealOptionTexts) {
    return false;
  }

  return false;
}

/**
 * Checks if a section or bank question is open-ended (written/klasik).
 */
export function isSectionOpenEnded(sec = {}, test = {}) {
  const bankQ = sec?.bankQ || {};

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

  // 2. Explicit Multiple-Choice Flags on Section or Bank Question
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

  // 3. Test-level flags ONLY for single-test assignments (where test IS the section)
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

  // 4. Check resolved questions for any explicit open-ended question
  const resQs = Array.isArray(sec?.resolvedQuestions) && sec.resolvedQuestions.length > 0
    ? sec.resolvedQuestions
    : (Array.isArray(test?.questions) ? test.questions : []);

  if (resQs.length > 0 && resQs.some(q => isQuestionOpenEnded(q, sec, test))) {
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
