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

  // --- Adım 1: Önce answerKey dizisi var mı kontrol et ---
  // Bundle/paket sınavlarda (PDF, HTML, Görsel) test.answerKey veya qObj.answerKey
  // bireysel soru doğrularını içerir. qObj.correctAnswer paket meta verisidir, öncelik verilmemeli.
  const keySource = test.answerKey || qObj.answerKey || test.opticAnswers || qObj.opticAnswers || test.imageAnswers || qObj.imageAnswers;

  if (keySource) {
    let targetKeyVal = null;

    if (Array.isArray(keySource)) {
      targetKeyVal = keySource[qNo - 1];
    } else if (typeof keySource === 'object') {
      targetKeyVal = keySource[qNo] ?? keySource[String(qNo)] ?? keySource[qNo - 1] ?? keySource[String(qNo - 1)];
    } else if (typeof keySource === 'string' && keySource.trim().length > 0) {
      let cleanStr = keySource.replace(/[^A-Ea-e0-4]/g, '');
      if (/[A-Ea-e]/.test(cleanStr)) {
        cleanStr = cleanStr.replace(/[0-4]/g, '');
      }
      targetKeyVal = cleanStr[qNo - 1];
    }

    if (targetKeyVal !== null && targetKeyVal !== undefined && targetKeyVal !== '' && targetKeyVal !== ' ') {
      const targetIdx = normalizeAns(targetKeyVal);
      if (targetIdx !== null) {
        return userIdx === targetIdx;
      }
    }
  }

  // --- Adım 2: answerKey yoksa bulkAnswerKey dene ---
  const bulkStr = test.bulkAnswerKey || qObj.bulkAnswerKey;
  if (typeof bulkStr === 'string' && bulkStr.trim().length > 0) {
    let cleanBulk = bulkStr.replace(/[^A-Ea-e0-4]/g, '');
    if (/[A-Ea-e]/.test(cleanBulk)) {
      cleanBulk = cleanBulk.replace(/[0-4]/g, '');
    }
    const bulkKeyVal = cleanBulk[qNo - 1];
    if (bulkKeyVal) {
      const targetIdx = normalizeAns(bulkKeyVal);
      if (targetIdx !== null) return userIdx === targetIdx;
    }
  }

  // --- Adım 3: Bireysel soru seviyesi correctAnswer ---
  // Sadece gerçek tekil soru nesnelerinde geçerli (bundle değil, qObj.isBundle !== true)
  // qObj.answerKey yoksa ve qObj.isBundle değilse bireysel correctAnswer'a bak
  if (!qObj.isBundle && !qObj.answerKey) {
    const qTarget = qObj.correctAnswer ?? qObj.correctAnswerLetter;
    if (qTarget !== undefined && qTarget !== null && qTarget !== '') {
      const targetIdx = normalizeAns(qTarget);
      if (targetIdx !== null) {
        return userIdx === targetIdx;
      }
    }
  }

  // --- Adım 4: test.questionsList içinde bireysel soru doğrusu ---
  const subQ = test.questionsList?.[qNo - 1] || test.questions?.[qNo - 1];
  if (subQ) {
    const subTarget = subQ.correctAnswer ?? subQ.correctAnswerLetter;
    if (subTarget !== undefined && subTarget !== null && subTarget !== '') {
      const targetIdx = normalizeAns(subTarget);
      if (targetIdx !== null) return userIdx === targetIdx;
    }
  }

  return false;
}
