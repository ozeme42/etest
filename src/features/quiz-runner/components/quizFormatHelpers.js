export function resolveTestContext(test = {}, sec = {}, bankQ = {}) {
  const bq = bankQ?.bankQ ? { ...bankQ.bankQ, ...bankQ } : (bankQ || {});
  const secBq = sec?.bankQ ? { ...sec.bankQ } : {};
  const testBq = test?.bankQ ? { ...test.bankQ } : {};

  return {
    ...test,
    ...sec,
    ...bq,
    answerKey: sec?.answerKey || bq?.answerKey || secBq?.answerKey || testBq?.answerKey || test?.answerKey,
    answer_key: sec?.answer_key || bq?.answer_key || secBq?.answer_key || testBq?.answer_key || test?.answer_key,
    opticAnswers: sec?.opticAnswers || bq?.opticAnswers || secBq?.opticAnswers || testBq?.opticAnswers || test?.opticAnswers,
    htmlPayload: sec?.htmlPayload || bq?.htmlPayload || test?.htmlPayload,
    pdfPayload: sec?.pdfPayload || bq?.pdfPayload || test?.pdfPayload,
    bankQ: {
      ...testBq,
      ...secBq,
      ...bq
    }
  };
}

export function isSectionOpenEnded(sec = {}, test = {}) {
  const bankQ = sec?.bankQ || test?.bankQ || {};

  // 1. TOP PRIORITY: Explicit Multiple Choice Flags or Options
  if (
    sec?.type === 'coktan_secmeli' ||
    sec?.questionType === 'coktan_secmeli' ||
    sec?.formatType === 'coktan_secmeli' ||
    sec?.sourceFormat === 'coktan_secmeli' ||
    bankQ?.type === 'coktan_secmeli' ||
    bankQ?.questionType === 'coktan_secmeli' ||
    bankQ?.formatType === 'coktan_secmeli' ||
    bankQ?.sourceFormat === 'coktan_secmeli' ||
    (Array.isArray(sec?.options) && sec.options.length > 1) ||
    (Array.isArray(bankQ?.options) && bankQ.options.length > 1) ||
    (Array.isArray(sec?.questions) && sec.questions.length > 0 && sec.questions.every(q => (Array.isArray(q?.options) && q.options.length > 1) || q?.questionType === 'coktan_secmeli' || q?.type === 'coktan_secmeli')) ||
    (Array.isArray(sec?.resolvedQuestions) && sec.resolvedQuestions.length > 0 && sec.resolvedQuestions.every(q => (Array.isArray(q?.options) && q.options.length > 1) || q?.questionType === 'coktan_secmeli' || q?.type === 'coktan_secmeli'))
  ) {
    return false;
  }

  // 2. Explicit Open-Ended Flags
  if (
    sec?.type === 'acik_uclu' ||
    sec?.questionType === 'acik_uclu' ||
    sec?.formatType === 'gorsel_klasik' ||
    sec?.sourceFormat === 'gorsel_klasik' ||
    sec?.type === 'gorsel_klasik' ||
    sec?.questionType === 'gorsel_klasik' ||
    sec?.isOpenEnded === true ||
    sec?.is_open_ended === true ||
    sec?.openEnded === true ||
    bankQ?.type === 'acik_uclu' ||
    bankQ?.questionType === 'acik_uclu' ||
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

  if (!sec?.id || sec?.id === test?.id || !test?.sections?.length) {
    if (
      test?.type === 'acik_uclu' ||
      test?.questionType === 'acik_uclu' ||
      test?.examType === 'acik_uclu' ||
      test?.formatType === 'gorsel_klasik' ||
      test?.sourceFormat === 'gorsel_klasik' ||
      test?.isOpenEnded === true ||
      test?.is_open_ended === true ||
      test?.openEnded === true
    ) {
      return true;
    }
  }

  return false;
}

export function isQuestionOE(qObj, sec = {}, test = {}, userAnsObj = null) {
  if (!qObj) return isSectionOpenEnded(sec, test);

  if (
    qObj.type === 'coktan_secmeli' ||
    qObj.questionType === 'coktan_secmeli' ||
    qObj.formatType === 'coktan_secmeli' ||
    qObj.sourceFormat === 'coktan_secmeli' ||
    (Array.isArray(qObj.options) && qObj.options.length > 1) ||
    qObj.correctAnswerLetter ||
    typeof qObj.correctAnswer === 'number'
  ) {
    return false;
  }

  if (userAnsObj && typeof userAnsObj === 'object') {
    if (userAnsObj.isOpenEnded === true || userAnsObj.is_open_ended === true || userAnsObj.type === 'acik_uclu') {
      return true;
    }
    if (userAnsObj.userAnswer && typeof userAnsObj.userAnswer === 'string' && userAnsObj.userAnswer.length > 2 && !/^[A-Ea-e]$/.test(userAnsObj.userAnswer.trim())) {
      return true;
    }
    if (userAnsObj.text && typeof userAnsObj.text === 'string' && userAnsObj.text.length > 0) {
      return true;
    }
  }

  if (
    qObj.type === 'acik_uclu' ||
    qObj.questionType === 'acik_uclu' ||
    qObj.formatType === 'gorsel_klasik' ||
    qObj.sourceFormat === 'gorsel_klasik' ||
    qObj.type === 'gorsel_klasik' ||
    qObj.questionType === 'gorsel_klasik' ||
    qObj.isOpenEnded === true ||
    qObj.is_open_ended === true ||
    qObj.openEnded === true
  ) {
    return true;
  }

  return isSectionOpenEnded(sec, test);
}

export function checkIsOE(obj) {
  if (!obj) return false;
  return isSectionOpenEnded(obj, null) || isQuestionOE(obj, obj, null, null);
}

export function unwrapUserAnswer(val) {
  if (val === undefined || val === null) return null;
  let curr = val;
  while (curr && typeof curr === 'object' && !Array.isArray(curr)) {
    const next = curr.userAnswer ?? curr.user_answer ?? curr.userAns ?? curr.user_ans ?? curr.answer ?? curr.selectedOption ?? curr.selected_option ?? curr.selectedAnswer ?? curr.studentAnswer ?? curr.option ?? curr.value ?? curr.selected;
    if (next === undefined || next === curr) break;
    curr = next;
  }
  if (curr === undefined || curr === null || curr === '') return null;
  return curr;
}
