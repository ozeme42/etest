/**
 * Resolves full question objects for a given test from QuestionBank.
 */
export function resolveTestQuestions(foundTest, allBankQuestions = []) {
  if (!foundTest) return [];

  let rawQuestions = [];
  const normalizeId = (id) => String(id || '').replace(/^q_?/, '');

  // 1. If test has questionIds (e.g. assigned homework referencing QuestionBank question IDs)
  if (foundTest.questionIds && Array.isArray(foundTest.questionIds) && foundTest.questionIds.length > 0) {
    rawQuestions = foundTest.questionIds.map((qId, idx) => {
      const bankMatch = allBankQuestions.find(bq =>
        String(bq.id) === String(qId) ||
        normalizeId(bq.id) === normalizeId(qId)
      );
      if (bankMatch) return bankMatch;
      return {
        id: qId,
        questionText: `Soru ${idx + 1}`,
        options: ['A', 'B', 'C', 'D', 'E'],
        correctAnswer: 0
      };
    });
  }
  // 2. If test has questions array directly
  else if (foundTest.questions && Array.isArray(foundTest.questions) && foundTest.questions.length > 0) {
    rawQuestions = foundTest.questions.map(q => {
      if (typeof q === 'string') {
        const bankMatch = allBankQuestions.find(bq => String(bq.id) === String(q) || normalizeId(bq.id) === normalizeId(q));
        return bankMatch || { id: q, questionText: 'Soru', options: ['A','B','C','D','E'] };
      }
      return q;
    });
  }
  // 3. Fallback: test itself is a single question from QuestionBank
  else if (foundTest.contentPayload || foundTest.htmlPayload || foundTest.pdfPayload || foundTest.type || foundTest.contentType) {
    rawQuestions = [foundTest];
  }

  // Final check: if single item in rawQuestions has no contentPayload but exists in allBankQuestions
  const finalQuestions = rawQuestions.map(q => {
    if (q.id && (!q.contentPayload && !q.htmlPayload && !q.pdfPayload)) {
      const matched = allBankQuestions.find(bq => String(bq.id) === String(q.id) || normalizeId(bq.id) === normalizeId(q.id));
      if (matched) return { ...matched, ...q };
    }
    return q;
  });

  return finalQuestions;
}
