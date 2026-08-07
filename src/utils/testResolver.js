/**
 * Resolves full question objects for a given test from QuestionBank.
 */
export function resolveTestQuestions(foundTest, allBankQuestions = []) {
  if (!foundTest) return [];

  let rawQuestions = [];
  const normalizeId = (id) => String(id || '').replace(/^q_?/, '');

  // 1. If test has questionsList array (e.g. JSON package, optic package, or multi-question package)
  if (foundTest.questionsList && Array.isArray(foundTest.questionsList) && foundTest.questionsList.length > 0) {
    rawQuestions = foundTest.questionsList.map((q, idx) => {
      if (typeof q === 'string') {
        const bankMatch = allBankQuestions.find(bq => String(bq.id) === String(q) || normalizeId(bq.id) === normalizeId(q));
        return bankMatch || { id: q, questionText: `Soru ${idx + 1}` };
      }
      return {
        ...q,
        questionText: q.questionText || q.text || q.question || q.title || `Soru ${idx + 1}`,
        options: (q.options && q.options.length > 0) ? q.options : ['A', 'B', 'C', 'D', 'E']
      };
    });
  }
  // 2. If contentPayload is a JSON string containing an array of questions or { questions: [...] }
  else if (typeof foundTest.contentPayload === 'string' && (foundTest.contentPayload.trim().startsWith('[') || foundTest.contentPayload.trim().startsWith('{'))) {
    try {
      const parsed = JSON.parse(foundTest.contentPayload);
      const list = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.questionsList || parsed.items || null);
      if (list && Array.isArray(list) && list.length > 0) {
        rawQuestions = list.map((q, idx) => ({
          ...q,
          id: q.id || `${foundTest.id || 'q'}_${idx + 1}`,
          questionText: q.questionText || q.text || q.question || q.title || `Soru ${idx + 1}`,
          options: (q.options && q.options.length > 0) ? q.options : ['A', 'B', 'C', 'D', 'E']
        }));
      }
    } catch {}
  }

  // 3. If test has questionIds
  if (rawQuestions.length === 0 && foundTest.questionIds && Array.isArray(foundTest.questionIds) && foundTest.questionIds.length > 0) {
    rawQuestions = foundTest.questionIds.map((qId, idx) => {
      const bankMatch = allBankQuestions.find(bq =>
        String(bq.id) === String(qId) ||
        normalizeId(bq.id) === normalizeId(qId)
      );
      if (bankMatch) return bankMatch;
      return {
        id: qId,
        questionText: `Soru ${idx + 1}`,
        options: ['A', 'B', 'C', 'D', 'E']
      };
    });
  }
  // 4. If test has questions array directly
  else if (rawQuestions.length === 0 && foundTest.questions && Array.isArray(foundTest.questions) && foundTest.questions.length > 0) {
    rawQuestions = foundTest.questions.map(q => {
      if (typeof q === 'string') {
        const bankMatch = allBankQuestions.find(bq => String(bq.id) === String(q) || normalizeId(bq.id) === normalizeId(q));
        return bankMatch || { id: q, questionText: 'Soru', options: ['A','B','C','D','E'] };
      }
      return q;
    });
  }
  // 5. Fallback: single item
  else if (rawQuestions.length === 0 && (foundTest.contentPayload || foundTest.htmlPayload || foundTest.pdfPayload || foundTest.type || foundTest.contentType)) {
    rawQuestions = [foundTest];
  }

  // Final check: enrich items from allBankQuestions if needed
  const finalQuestions = rawQuestions.map(q => {
    if (q.id && (!q.contentPayload && !q.htmlPayload && !q.pdfPayload && !q.questionText)) {
      const matched = allBankQuestions.find(bq => String(bq.id) === String(q.id) || normalizeId(bq.id) === normalizeId(q.id));
      if (matched) return { ...matched, ...q };
    }
    return q;
  });

  return finalQuestions;
}
