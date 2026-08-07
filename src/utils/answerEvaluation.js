/**
 * Evaluates whether a user's answer for a question is correct.
 * 
 * @param {number|string} userAns - The option index (0 for A, 1 for B...) or answer string selected by the user.
 * @param {object} qObj - The question object (may contain correctAnswer, answerKey, options).
 * @param {object} test - The overall test object (may contain answerKey array or global answer keys).
 * @param {number} qNo - 1-based question number.
 * @returns {boolean|null} true if correct, false if incorrect, null if open-ended/unevaluated.
 */
export function checkIsAnswerCorrect(userAns, qObj = {}, test = {}, qNo = 1) {
  if (userAns === null || userAns === undefined || userAns === '') {
    return false;
  }

  const normalizeAns = (val) => {
    if (val === null || val === undefined || val === '' || val === ' ') return null;
    if (typeof val === 'number') return val;
    const str = String(val).trim().toUpperCase();
    if (/^[A-E]$/.test(str)) {
      return str.charCodeAt(0) - 65;
    }
    const num = Number(str);
    return (!isNaN(num) && num >= 0 && num <= 4) ? num : str;
  };

  const userIdx = normalizeAns(userAns);
  if (userIdx === null) return false;

  // 1. Direct question-level check (correctAnswer or correctAnswerLetter)
  const qTarget = qObj.correctAnswer ?? qObj.correctAnswerLetter;
  if (qTarget !== undefined && qTarget !== null && qTarget !== '') {
    const targetIdx = normalizeAns(qTarget);
    if (targetIdx !== null) {
      return userIdx === targetIdx;
    }
  }

  // 2. Check questionsList or questions array at index qNo - 1
  const subQ = test.questionsList?.[qNo - 1] || test.questions?.[qNo - 1];
  if (subQ) {
    const subTarget = subQ.correctAnswer ?? subQ.correctAnswerLetter;
    if (subTarget !== undefined && subTarget !== null && subTarget !== '') {
      const targetIdx = normalizeAns(subTarget);
      if (targetIdx !== null) return userIdx === targetIdx;
    }
  }

  // 3. Collect answer keys from test or qObj (answerKey, opticAnswers, imageAnswers, bulkAnswerKey)
  const keySource = test.answerKey || qObj.answerKey || test.opticAnswers || qObj.opticAnswers || test.imageAnswers || qObj.imageAnswers;

  let targetKeyVal = null;

  if (Array.isArray(keySource)) {
    targetKeyVal = keySource[qNo - 1];
  } else if (keySource && typeof keySource === 'object') {
    targetKeyVal = keySource[qNo] ?? keySource[String(qNo)] ?? keySource[qNo - 1] ?? keySource[String(qNo - 1)];
  } else if (typeof keySource === 'string' && keySource.trim().length > 0) {
    const cleanStr = keySource.replace(/[^A-Ea-e0-4]/g, '');
    targetKeyVal = cleanStr[qNo - 1];
  }

  if (targetKeyVal === null || targetKeyVal === undefined) {
    const bulkStr = test.bulkAnswerKey || qObj.bulkAnswerKey;
    if (typeof bulkStr === 'string' && bulkStr.trim().length > 0) {
      const cleanBulk = bulkStr.replace(/[^A-Ea-e0-4]/g, '');
      targetKeyVal = cleanBulk[qNo - 1];
    }
  }

  if (targetKeyVal !== null && targetKeyVal !== undefined && targetKeyVal !== '' && targetKeyVal !== ' ') {
    const targetIdx = normalizeAns(targetKeyVal);
    if (targetIdx !== null) {
      return userIdx === targetIdx;
    }
  }

  return false;
}
