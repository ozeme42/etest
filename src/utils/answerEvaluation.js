/**
 * Normalizes any answer representation into a standard numeric index 0..4 (0=A, 1=B, 2=C, 3=D, 4=E)
 * or returns the trimmed string if it cannot be parsed as A-E.
 */
export function normalizeAnswerIndex(val) {
  if (val === null || val === undefined || val === '' || val === ' ' || val === 'empty') return null;
  if (typeof val === 'number') {
    return (!isNaN(val) && val >= 0 && val <= 4) ? val : null;
  }
  if (typeof val === 'object') {
    return normalizeAnswerIndex(val.userAnswer ?? val.value ?? val.optionIndex ?? val.index);
  }
  const str = String(val).trim().toUpperCase();
  if (/^[A-E]$/.test(str)) {
    return str.charCodeAt(0) - 65;
  }
  const num = Number(str);
  if (!isNaN(num) && num >= 0 && num <= 4) {
    return num;
  }
  return str;
}

/**
 * checkIsAnswerCorrect
 * Evaluates whether a user's answer for a question is correct across all question bank items,
 * homeworks, exams, and multi-format tests.
 * 
 * @param {number|string} userAns - The option index (0 for A, 1 for B...) or answer string selected by the user.
 * @param {object} qObj - The question object.
 * @param {object} test - The overall test or section object.
 * @param {number} qNo - 1-based question number.
 * @returns {boolean|null} true if correct, false if incorrect, null if blank or open-ended.
 */
export function checkIsAnswerCorrect(userAns, qObj = {}, test = {}, qNo = 1) {
  if (userAns === null || userAns === undefined || userAns === '' || userAns === 'empty') {
    return null;
  }

  const userIdx = normalizeAnswerIndex(userAns);
  if (userIdx === null) return null;

  // ── STEP 1: Check if this specific qNo has an entry in any answerKey sources ──
  // For multi-question documents (PDF, HTML, Multi-image, Optic), the answerKey array is the definitive source per question number.
  const candidateKeys = [
    qObj?.answerKey,
    qObj?.answer_key,
    qObj?.correctAnswers,
    qObj?.correct_answers,
    qObj?.opticAnswers,
    qObj?.imageAnswers,
    qObj?.raw?.answerKey,
    qObj?.raw?.answer_key,
    qObj?.raw?.correctAnswers,
    qObj?.raw?.opticAnswers,
    test?.answerKey,
    test?.answer_key,
    test?.correctAnswers,
    test?.correct_answers,
    test?.opticAnswers,
    test?.imageAnswers,
    test?.raw?.answerKey,
    test?.raw?.answer_key,
    test?.raw?.correctAnswers,
    test?.raw?.correct_answers,
    test?.raw?.opticAnswers,
    test?.bankQ?.answerKey,
    test?.bankQ?.answer_key,
    test?.bankQ?.correctAnswers,
    test?.bankQ?.opticAnswers,
    test?.contentPayload?.answerKey,
    test?.contentPayload?.correctAnswers,
    test?.htmlPayload?.answerKey,
    test?.pdfPayload?.answerKey,
    test?.metadata?.answerKey,
    test?.raw_data?.answerKey,
    test?.raw_data?.correctAnswers,
    test?.book?.answerKey
  ];

  for (const keySource of candidateKeys) {
    if (!keySource) continue;
    let targetKeyVal = null;

    if (Array.isArray(keySource) && keySource.length > 0) {
      targetKeyVal = keySource[qNo - 1] ?? keySource[String(qNo - 1)];
      if (targetKeyVal === undefined || targetKeyVal === null || targetKeyVal === '') {
        if (keySource[0] === null || keySource[0] === '' || keySource[0] === undefined) {
          targetKeyVal = keySource[qNo] ?? keySource[String(qNo)];
        }
      }
    } else if (typeof keySource === 'object' && keySource !== null && Object.keys(keySource).length > 0) {
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
            targetKeyVal = parsed[qNo] ?? parsed[qNo - 1];
          }
        } catch {}
      }
      if (targetKeyVal === null || targetKeyVal === undefined) {
        const clean = keySource.replace(/[^A-Ea-e0-4]/g, '');
        if (clean.length >= qNo) {
          targetKeyVal = clean[qNo - 1];
        }
      }
    }

    if (targetKeyVal !== null && targetKeyVal !== undefined && targetKeyVal !== '' && targetKeyVal !== ' ') {
      const targetIdx = normalizeAnswerIndex(targetKeyVal);
      if (targetIdx !== null) {
        return userIdx === targetIdx;
      }
    }
  }

  // ── STEP 2: Check sub-question in test.questions / test.questionsList array ─
  const testQs = test?.questions || test?.resolvedQuestions || test?.questionsList || test?.bankQ?.questionsList || test?.raw?.questions || [];
  if (Array.isArray(testQs) && testQs.length > 0) {
    const subQ = testQs[qNo - 1];
    if (subQ && typeof subQ === 'object') {
      const subCandidates = [
        subQ.correctAnswer,
        subQ.correct_answer,
        subQ.correctOption,
        subQ.correct_option,
        subQ.correctAnswerLetter,
        subQ.correct_answer_letter,
        subQ.correct,
        subQ.dogruCevap,
        subQ.dogru_cevap,
        subQ.raw?.correctAnswer,
        subQ.raw?.correct_answer
      ];
      for (const cand of subCandidates) {
        if (cand !== undefined && cand !== null && cand !== '' && cand !== 'empty') {
          const targetIdx = normalizeAnswerIndex(cand);
          if (targetIdx !== null) return userIdx === targetIdx;
        }
      }
      if (Array.isArray(subQ.options) && subQ.options.length > 0) {
        const optIdx = subQ.options.findIndex(o => (typeof o === 'object' && o !== null && (o.isCorrect === true || o.is_correct === true || o.correct === true)));
        if (optIdx !== -1) return userIdx === optIdx;
      }
    }
  }

  // ── STEP 3: Direct question object properties ──────────────────────────────
  if (qObj && typeof qObj === 'object') {
    const isSameAsTest = (qObj === test || (qObj.id && test?.id && String(qObj.id) === String(test.id) && !qObj.questionNo));
    const isSpecificToThisQuestion = !isSameAsTest || (
      qNo === 1 ||
      Number(qObj.questionNo) === qNo ||
      Number(qObj.number) === qNo ||
      Number(qObj.qNo) === qNo ||
      Number(qObj.questionNoInSection) === qNo
    );

    if (isSpecificToThisQuestion) {
      const directCandidates = [
        qObj.correctAnswer,
        qObj.correct_answer,
        qObj.correctOption,
        qObj.correct_option,
        qObj.correctAnswerLetter,
        qObj.correct_answer_letter,
        qObj.correct,
        qObj.dogruCevap,
        qObj.dogru_cevap,
        qObj.raw?.correctAnswer,
        qObj.raw?.correct_answer
      ];

      for (const cand of directCandidates) {
        if (cand !== undefined && cand !== null && cand !== '' && cand !== 'empty') {
          const targetIdx = normalizeAnswerIndex(cand);
          if (targetIdx !== null) {
            return userIdx === targetIdx;
          }
        }
      }

      if (Array.isArray(qObj.options) && qObj.options.length > 0) {
        const optIdx = qObj.options.findIndex(o => {
          if (typeof o === 'object' && o !== null) {
            return o.isCorrect === true || o.is_correct === true || o.correct === true;
          }
          return false;
        });
        if (optIdx !== -1) {
          return userIdx === optIdx;
        }
      }
    }
  }

  // ── STEP 4: bulkAnswerKey string ───────────────────────────────────────────
  const bulkSources = [test?.bulkAnswerKey, qObj?.bulkAnswerKey, test?.bankQ?.bulkAnswerKey, test?.raw?.bulkAnswerKey];
  for (const bulkStr of bulkSources) {
    if (typeof bulkStr === 'string' && bulkStr.trim().length > 0) {
      const cleanBulk = bulkStr.replace(/[^A-Ea-e0-4]/g, '');
      const bulkKeyVal = cleanBulk[qNo - 1];
      if (bulkKeyVal) {
        const targetIdx = normalizeAnswerIndex(bulkKeyVal);
        if (targetIdx !== null) return userIdx === targetIdx;
      }
    }
  }

  return null;
}

/**
 * Formats any raw answer/option value into a displayable letter ('A', 'B', 'C', 'D', 'E').
 */
export function formatAnswerLetter(val) {
  if (val === null || val === undefined || val === '' || val === 'empty') return null;
  if (typeof val === 'number') {
    return val >= 0 && val <= 4 ? String.fromCharCode(65 + val) : String(val);
  }
  const str = String(val).trim().toUpperCase();
  if (/^[A-E]$/.test(str)) return str;
  const num = Number(str);
  if (!isNaN(num) && num >= 0 && num <= 4) {
    return String.fromCharCode(65 + num);
  }
  return str;
}

/**
 * Robustly extracts the correct answer for question qNo (1-based index)
 * across all potential test, section, question, submission, and bank payload objects.
 */
export function resolveQuestionCorrectAnswer(qNo, qObj = {}, ansObj = {}, testObj = {}, questionsList = []) {
  const idx = qNo - 1;

  // 1. Optic answers from test / bankQ (Primary source for PDF, Image, and Optic tests)
  const opticSources = [
    testObj?.opticAnswers,
    testObj?.optic_answers,
    testObj?.bankQ?.opticAnswers,
    testObj?.bankQ?.optic_answers,
    qObj?.opticAnswers,
    qObj?.optic_answers
  ];
  for (const opt of opticSources) {
    if (!opt || typeof opt !== 'object') continue;
    if (opt[qNo] !== undefined && opt[qNo] !== null && opt[qNo] !== '') return opt[qNo];
    if (opt[String(qNo)] !== undefined && opt[String(qNo)] !== null && opt[String(qNo)] !== '') return opt[String(qNo)];
    if (opt[idx] !== undefined && opt[idx] !== null && opt[idx] !== '') return opt[idx];
    if (opt[String(idx)] !== undefined && opt[String(idx)] !== null && opt[String(idx)] !== '') return opt[String(idx)];
  }

  // 2. Answer key arrays, objects, and strings from test / payload / bankQ
  const keySources = [
    testObj?.answerKey,
    testObj?.answer_key,
    testObj?.pdfPayload?.answerKey,
    testObj?.pdfPayload?.answer_key,
    testObj?.htmlPayload?.answerKey,
    testObj?.htmlPayload?.answer_key,
    testObj?.contentPayload?.answerKey,
    testObj?.contentPayload?.answer_key,
    testObj?.bankQ?.answerKey,
    testObj?.bankQ?.answer_key
  ];

  for (const src of keySources) {
    if (!src) continue;
    if (Array.isArray(src) && src[idx] !== undefined && src[idx] !== null && src[idx] !== '') {
      return src[idx];
    }
    if (typeof src === 'object' && !Array.isArray(src)) {
      if (src[qNo] !== undefined && src[qNo] !== null && src[qNo] !== '') return src[qNo];
      if (src[String(qNo)] !== undefined && src[String(qNo)] !== null && src[String(qNo)] !== '') return src[String(qNo)];
      if (src[idx] !== undefined && src[idx] !== null && src[idx] !== '') return src[idx];
      if (src[String(idx)] !== undefined && src[String(idx)] !== null && src[String(idx)] !== '') return src[String(idx)];
    }
    if (typeof src === 'string') {
      const clean = src.replace(/[^A-Ea-e0-4]/g, '');
      if (clean[idx]) return clean[idx];
    }
  }

  // 3. Bulk answer key string
  const bulkSources = [testObj?.bulkAnswerKey, testObj?.bankQ?.bulkAnswerKey, qObj?.bulkAnswerKey];
  for (const bulkStr of bulkSources) {
    if (typeof bulkStr === 'string' && bulkStr.trim().length > 0) {
      const cleanBulk = bulkStr.replace(/[^A-Ea-e0-4]/g, '');
      if (cleanBulk[idx]) return cleanBulk[idx];
    }
  }

  // 4. Specific question item in questionsList (if questionsList has separate items per question)
  if (Array.isArray(questionsList) && questionsList.length > idx && questionsList[idx]) {
    const specificQ = questionsList[idx];
    const qDirect = specificQ.correctAnswer ?? specificQ.correct_answer ?? specificQ.correctOption ?? specificQ.correct_option ?? specificQ.correctAnswerLetter ?? specificQ.correct_answer_letter ?? specificQ.dogruCevap ?? specificQ.raw?.correctAnswer;
    if (qDirect !== undefined && qDirect !== null && qDirect !== '' && qDirect !== 'empty') {
      return qDirect;
    }
    if (Array.isArray(specificQ.options)) {
      const foundIdx = specificQ.options.findIndex(o => typeof o === 'object' && o !== null && (o.isCorrect === true || o.is_correct === true || o.correct === true));
      if (foundIdx !== -1) return foundIdx;
    }
  }

  // 5. Explicit question object for this question number (avoiding single-item questions[0] fallback for other questions)
  if (qObj && (idx === 0 || qObj.questionNo === qNo || qObj.number === qNo || qObj.index === idx)) {
    const qDirect = qObj.correctAnswer ?? qObj.correct_answer ?? qObj.correctOption ?? qObj.correct_option ?? qObj.correctAnswerLetter ?? qObj.correct_answer_letter ?? qObj.dogruCevap ?? qObj.raw?.correctAnswer;
    if (qDirect !== undefined && qDirect !== null && qDirect !== '' && qDirect !== 'empty') {
      return qDirect;
    }
    if (Array.isArray(qObj.options)) {
      const foundIdx = qObj.options.findIndex(o => typeof o === 'object' && o !== null && (o.isCorrect === true || o.is_correct === true || o.correct === true));
      if (foundIdx !== -1) return foundIdx;
    }
  }

  // 6. Direct from ansObj (evaluated during submission)
  if (ansObj) {
    const cand = ansObj.correctAnswer ?? ansObj.correctOption ?? ansObj.correctAnswerLetter ?? ansObj.correct_answer;
    if (cand !== undefined && cand !== null && cand !== '' && cand !== 'empty') {
      return cand;
    }
  }

  return null;
}

