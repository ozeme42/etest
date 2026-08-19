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
    return null;
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
  if (userIdx === null) return null;

  // --- Adım 1: Tüm olası answerKey kaynaklarını topla ---
  const candidateKeys = [
    test?.answerKey,
    test?.answer_key,
    qObj?.answerKey,
    qObj?.answer_key,
    test?.opticAnswers,
    qObj?.opticAnswers,
    test?.imageAnswers,
    qObj?.imageAnswers,
    test?.correctAnswers,
    qObj?.correctAnswers,
    test?.contentPayload?.answerKey,
    test?.contentPayload?.answer_key,
    test?.htmlPayload?.answerKey,
    test?.htmlPayload?.answer_key,
    test?.pdfPayload?.answerKey,
    test?.pdfPayload?.answer_key,
    qObj?.contentPayload?.answerKey,
    qObj?.contentPayload?.answer_key,
    test?.metadata?.answerKey,
    test?.metadata?.answer_key,
    test?.raw_data?.answerKey,
    test?.raw_data?.answer_key,
    qObj?.raw_data?.answerKey,
    qObj?.raw_data?.answer_key,
    test?.bankQ?.answerKey,
    test?.bankQ?.answer_key,
    test?.bankQ?.opticAnswers,
    test?.bankQ?.contentPayload?.answerKey,
    test?.bankQ?.raw_data?.answerKey,
    test?.bankQ?.raw_data?.answer_key,
    test?.book?.answerKey,
    test?.book?.answer_key
  ];

  for (const keySource of candidateKeys) {
    if (!keySource) continue;
    let targetKeyVal = null;

    if (Array.isArray(keySource)) {
      targetKeyVal = keySource[qNo - 1] ?? keySource[String(qNo - 1)];
      if (targetKeyVal === undefined || targetKeyVal === null || targetKeyVal === '') {
        if (keySource[0] === null || keySource[0] === '' || keySource[0] === undefined) {
          targetKeyVal = keySource[qNo] ?? keySource[String(qNo)];
        }
      }
    } else if (typeof keySource === 'object' && keySource !== null) {
      const isZeroIndexed = (0 in keySource) || ('0' in keySource);
      if (isZeroIndexed) {
        targetKeyVal = keySource[qNo - 1] ?? keySource[String(qNo - 1)] ?? keySource[qNo] ?? keySource[String(qNo)];
      } else {
        targetKeyVal = keySource[qNo] ?? keySource[String(qNo)] ?? keySource[qNo - 1] ?? keySource[String(qNo - 1)];
      }
    } else if (typeof keySource === 'string' && keySource.trim().length > 0) {
      if (keySource.trim().startsWith('[') || keySource.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(keySource);
          if (Array.isArray(parsed)) {
            targetKeyVal = parsed[qNo - 1] ?? parsed[qNo];
          } else if (typeof parsed === 'object') {
            const is0 = (0 in parsed) || ('0' in parsed);
            targetKeyVal = is0 ? (parsed[qNo - 1] ?? parsed[qNo]) : (parsed[qNo] ?? parsed[qNo - 1]);
          }
        } catch {}
      }
      if (targetKeyVal === null || targetKeyVal === undefined) {
        let cleanStr = keySource.replace(/[^A-Ea-e0-4]/g, '');
        if (/[A-Ea-e]/.test(cleanStr)) {
          cleanStr = cleanStr.replace(/[0-4]/g, '');
        }
        targetKeyVal = cleanStr[qNo - 1];
      }
    }

    if (targetKeyVal !== null && targetKeyVal !== undefined && targetKeyVal !== '' && targetKeyVal !== ' ') {
      const targetIdx = normalizeAns(targetKeyVal);
      if (targetIdx !== null) {
        return userIdx === targetIdx;
      }
    }
  }

  // --- Adım 2: bulkAnswerKey dene ---
  const bulkSources = [test?.bulkAnswerKey, qObj?.bulkAnswerKey, test?.bankQ?.bulkAnswerKey, test?.raw_data?.bulkAnswerKey];
  for (const bulkStr of bulkSources) {
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
  }

  // --- Adım 3: Bireysel soru seviyesi correctAnswer ---
  const isIndividualQuestion = Boolean(
    (qObj?.questionNo === qNo || qObj?.questionNoInSection === qNo || String(qObj?.id || '').includes(`_${qNo}`) || String(qObj?.id || '').includes(`sub_${qNo}`)) &&
    !qObj?.isBundle && !qObj?.sections && !qObj?.questions
  );

  if (isIndividualQuestion || qNo === 1) {
    const qTarget = qObj?.correctAnswer ?? qObj?.correctAnswerLetter;
    if (qTarget !== undefined && qTarget !== null && qTarget !== '') {
      const targetIdx = normalizeAns(qTarget);
      if (targetIdx !== null) {
        return userIdx === targetIdx;
      }
    }
  }

  // --- Adım 4: test.questionsList içinde bireysel soru doğrusu ---
  const subQ = test?.questionsList?.[qNo - 1] || test?.questions?.[qNo - 1] || test?.resolvedQuestions?.[qNo - 1];
  if (subQ) {
    const subTarget = subQ.correctAnswer ?? subQ.correctAnswerLetter;
    if (subTarget !== undefined && subTarget !== null && subTarget !== '') {
      const targetIdx = normalizeAns(subTarget);
      if (targetIdx !== null) return userIdx === targetIdx;
    }
  }

  return false;
}
