/**
 * quizTypeDetector.js
 * 
 * Provides deterministic, reliable type detection for Questions, Sections, and Tests.
 * Ensures that in multi-section composite tests, each section and question maintains its own format.
 */

/**
 * Checks if a section or question is definitively Multiple Choice (has options or is coktan_secmeli).
 */
/**
 * Checks if a section or question is definitively Multiple Choice (has options or is coktan_secmeli).
 */
export function isMultipleChoice(item = {}) {
  if (!item) return false;

  // 1. Explicit Open-Ended overrides (NEVER Multiple Choice)
  const isExplicitOE = (
    item.isOpenEnded === true ||
    item.is_open_ended === true ||
    item.openEnded === true ||
    item.type === 'acik_uclu' ||
    item.questionType === 'acik_uclu' ||
    item.type === 'gorsel_klasik' ||
    item.questionType === 'gorsel_klasik' ||
    item.formatType === 'gorsel_klasik' ||
    item.sourceFormat === 'gorsel_klasik' ||
    item.bankQ?.type === 'acik_uclu' ||
    item.bankQ?.questionType === 'acik_uclu' ||
    item.bankQ?.isOpenEnded === true ||
    item.answerKey?.__meta?.isOpenEnded === true ||
    item.answerKey?.__meta?.questionType === 'acik_uclu'
  );

  if (isExplicitOE) {
    // If it has explicit 2+ options it could be MC, otherwise strictly open-ended
    if (!Array.isArray(item.options) || item.options.filter(Boolean).length <= 1) {
      return false;
    }
  }

  // Tracked Book / Physical Test Check (Definitively Multiple Choice unless explicitly flagged OE)
  const isBookOrPhysical = Boolean(
    item.isBookAssignment ||
    item.sourceType === 'trackedBook' ||
    item.sourceType === 'bookTest' ||
    item.sourceType === 'book' ||
    item.sourceType === 'study_room_optical' ||
    item.sourceType === 'physicalExam' ||
    item.typeKey === 'book' ||
    item.typeKey === 'physicalExam' ||
    item.type === 'book' ||
    item.type === 'physicalExam' ||
    item.bookId ||
    item.book_id ||
    item.bookTestId ||
    item.isPhysical ||
    item.sourceFormat === 'physical' ||
    item.formatType === 'physical' ||
    String(item.id || '').startsWith('bt_') ||
    String(item.id || '').startsWith('tbt_')
  );

  if (isBookOrPhysical && !isExplicitOE) {
    return true;
  }

  // 2. Multiple Choice Answer Key detection (Letters A-E)
  const ak = item.answerKey || item.answer_key || item.correctAnswers || item.opticAnswers;
  if (ak && ak.__meta?.isOpenEnded !== true && ak.__meta?.questionType !== 'acik_uclu') {
    if (Array.isArray(ak) && ak.length > 0) {
      const hasLetters = ak.some(k => typeof k === 'string' && /^[A-Ea-e]$/.test(k.trim()));
      if (hasLetters) return true;
    }
    if (typeof ak === 'object' && !Array.isArray(ak)) {
      const vals = Object.values(ak).filter(v => v !== null && typeof v === 'string');
      if (vals.some(v => /^[A-Ea-e]$/.test(v.trim()))) return true;
    }
    if (typeof ak === 'string' && /^[A-Ea-e\s]+$/.test(ak.trim()) && ak.trim().length > 0) {
      return true;
    }
  }

  const qType = String(item.questionType || item.type || item.contentType || item.formatType || item.sourceFormat || '').toLowerCase();
  
  if (
    qType === 'coktan_secmeli' ||
    qType === 'multiple_choice' ||
    qType === 'test'
  ) {
    return true;
  }

  if (
    qType === 'optik_form' ||
    qType === 'optic' ||
    qType === 'optik'
  ) {
    return !isExplicitOE;
  }

  if (Array.isArray(item.options) && item.options.filter(Boolean).length >= 2) {
    return true;
  }
  if (Array.isArray(item.raw?.options) && item.raw.options.filter(Boolean).length >= 2) {
    return true;
  }
  if (Array.isArray(item.bankQ?.options) && item.bankQ.options.filter(Boolean).length >= 2) {
    return true;
  }

  const qList = item.resolvedQuestions || item.questions || item.questionsList;
  if (Array.isArray(qList) && qList.length > 0) {
    const hasMC = qList.some(q => 
      (Array.isArray(q?.options) && q.options.filter(Boolean).length >= 2) ||
      q?.questionType === 'coktan_secmeli' ||
      q?.type === 'coktan_secmeli'
    );
    if (hasMC) return true;
  }

  return false;
}

/**
 * Checks if a section or bank question is open-ended (written/klasik).
 */
export function isSectionOpenEnded(sec = {}, test = {}) {
  const bankQ = sec?.bankQ || test?.bankQ || {};

  // 1. If section, bankQ, or test is definitively Multiple Choice -> NEVER Open-Ended
  if (isMultipleChoice(sec) || isMultipleChoice(bankQ) || (test?.id && isMultipleChoice(test))) {
    return false;
  }

  // If sec or test is a tracked book test or physical exam -> NEVER Open-Ended unless explicitly flagged
  const isBookOrPhysical = Boolean(
    sec?.isBookAssignment || sec?.sourceType === 'trackedBook' || sec?.sourceType === 'bookTest' || sec?.sourceType === 'book' || sec?.sourceType === 'physicalExam' || sec?.typeKey === 'book' || sec?.type === 'book' || sec?.bookId || sec?.book_id || sec?.bookTestId || sec?.isPhysical || sec?.sourceFormat === 'physical' ||
    test?.isBookAssignment || test?.sourceType === 'trackedBook' || test?.sourceType === 'bookTest' || test?.sourceType === 'book' || test?.sourceType === 'physicalExam' || test?.typeKey === 'book' || test?.type === 'book' || test?.bookId || test?.book_id || test?.bookTestId || test?.isPhysical || test?.sourceFormat === 'physical'
  );
  const isExplicitOE = Boolean(
    sec?.isOpenEnded === true || sec?.is_open_ended === true || sec?.questionType === 'acik_uclu' || sec?.type === 'acik_uclu' ||
    test?.isOpenEnded === true || test?.is_open_ended === true || test?.questionType === 'acik_uclu' || test?.type === 'acik_uclu'
  );
  if (isBookOrPhysical && !isExplicitOE) {
    return false;
  }

  // 2. Explicit Open-Ended Flags on Section, Bank Question or Test
  if (
    sec?.isOpenEnded === true ||
    sec?.is_open_ended === true ||
    sec?.openEnded === true ||
    sec?.type === 'acik_uclu' ||
    sec?.questionType === 'acik_uclu' ||
    sec?.type === 'gorsel_klasik' ||
    sec?.questionType === 'gorsel_klasik' ||
    sec?.formatType === 'gorsel_klasik' ||
    sec?.sourceFormat === 'gorsel_klasik' ||
    sec?.type === 'yazili' ||
    sec?.questionType === 'yazili' ||
    sec?.answerKey?.__meta?.isOpenEnded === true ||
    sec?.answerKey?.__meta?.questionType === 'acik_uclu' ||
    bankQ?.isOpenEnded === true ||
    bankQ?.is_open_ended === true ||
    bankQ?.openEnded === true ||
    bankQ?.type === 'acik_uclu' ||
    bankQ?.questionType === 'acik_uclu' ||
    bankQ?.type === 'gorsel_klasik' ||
    bankQ?.questionType === 'gorsel_klasik' ||
    bankQ?.formatType === 'gorsel_klasik' ||
    bankQ?.sourceFormat === 'gorsel_klasik' ||
    bankQ?.type === 'yazili' ||
    bankQ?.questionType === 'yazili' ||
    bankQ?.answerKey?.__meta?.isOpenEnded === true ||
    bankQ?.answerKey?.__meta?.questionType === 'acik_uclu' ||
    test?.isOpenEnded === true ||
    test?.is_open_ended === true ||
    test?.openEnded === true ||
    test?.type === 'acik_uclu' ||
    test?.questionType === 'acik_uclu' ||
    test?.formatType === 'gorsel_klasik' ||
    test?.sourceFormat === 'gorsel_klasik' ||
    test?.type === 'yazili' ||
    test?.questionType === 'yazili' ||
    test?.answerKey?.__meta?.isOpenEnded === true ||
    test?.answerKey?.__meta?.questionType === 'acik_uclu'
  ) {
    return true;
  }

  // 3. Title Keyword Detection strictly for Açık Uçlu (when NOT coktan_secmeli or test)
  const titleStr = String(sec?.title || sec?.name || bankQ?.title || bankQ?.name || test?.title || test?.name || '').toLowerCase();
  if (
    (titleStr.includes('açık uçlu') || titleStr.includes('acik uclu')) &&
    !titleStr.includes('çoktan seçmeli') && !titleStr.includes('coktan secmeli') && !titleStr.includes('test')
  ) {
    return true;
  }

  // 4. Check resolved questions
  const resQs = Array.isArray(sec?.resolvedQuestions) && sec.resolvedQuestions.length > 0
    ? sec.resolvedQuestions
    : (Array.isArray(sec?.questions) && sec.questions.length > 0
      ? sec.questions
      : (Array.isArray(test?.questions) ? test.questions : []));

  if (resQs.length > 0 && resQs.some(q => (
    q?.isOpenEnded === true ||
    q?.is_open_ended === true ||
    q?.openEnded === true ||
    q?.type === 'acik_uclu' ||
    q?.questionType === 'acik_uclu' ||
    q?.type === 'gorsel_klasik' ||
    q?.questionType === 'gorsel_klasik' ||
    q?.type === 'yazili' ||
    q?.questionType === 'yazili'
  ))) {
    return true;
  }

  // If it's a book or physical test, it never defaults to open-ended
  if (isBookOrPhysical) {
    return false;
  }

  // Default is multiple choice unless explicitly flagged as open-ended
  return false;
}

/**
 * Checks if a specific question is open-ended.
 */
export function isQuestionOpenEnded(qObj = {}, sec = {}, test = {}, userAnsObj = null) {
  if (!qObj) return false;

  // 1. If question is Multiple Choice (has options or is coktan_secmeli) -> NEVER Open-Ended
  if (isMultipleChoice(qObj)) {
    return false;
  }

  // 2. Explicit Open-Ended on Question
  const isQExplicitOE = Boolean(
    qObj.isOpenEnded === true ||
    qObj.openEnded === true ||
    qObj.is_open_ended === true ||
    qObj.type === 'acik_uclu' ||
    qObj.questionType === 'acik_uclu' ||
    qObj.type === 'gorsel_klasik' ||
    qObj.questionType === 'gorsel_klasik' ||
    qObj.formatType === 'gorsel_klasik' ||
    qObj.sourceFormat === 'gorsel_klasik'
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
