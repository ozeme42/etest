import { useState, useEffect } from 'react';
import { idbGetPayload } from '../../../services/indexedDbService';

const extractDirectPayload = (obj) => {
  if (!obj) return null;
  const candidates = [
    obj.pdfPayload,
    obj.contentPayload,
    obj.htmlPayload,
    obj.pdfUrl,
    obj.url,
    obj.filePayload,
    obj.payload,
    obj.data,
    obj.imageUrl
  ];
  return candidates.find(c => typeof c === 'string' && c && !c.includes('[STORED_IN_INDEXEDDB]') && !c.includes('[LOCALSTORAGE_CACHE]')) || null;
};

/**
 * useQuizPayloads
 * Automatically resolves and restores HTML, PDF, and Image payloads from IndexedDB and remote URLs,
 * using the exact same robust multi-key resolution logic as PdfQuizRunner and PdfQuizReview.
 */
export function useQuizPayloads(activeSec = {}, test = {}) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Direct memory check
    let direct = extractDirectPayload(activeSec) ||
      extractDirectPayload(activeSec?.bankQ) ||
      extractDirectPayload(test);

    if (!direct && Array.isArray(activeSec?.resolvedQuestions)) {
      for (const q of activeSec.resolvedQuestions) {
        direct = extractDirectPayload(q);
        if (direct) break;
      }
    }

    if (!direct && Array.isArray(activeSec?.questions)) {
      for (const q of activeSec.questions) {
        direct = extractDirectPayload(q);
        if (direct) break;
      }
    }

    if (direct) {
      setPayload(direct);
      return;
    }

    // 2. Comprehensive IndexedDB lookup
    async function loadIdb() {
      setLoading(true);
      const rawIds = [
        activeSec?.id,
        activeSec?.questionId,
        activeSec?.testId,
        activeSec?.sourceTestId,
        activeSec?.originalTestId,
        activeSec?.bankTestId,
        activeSec?.bankQ?.id,
        activeSec?.bankQ?.questionId,
        test?.id,
        test?.realTestId,
        test?.sourceTestId,
        test?.bookTestId,
        test?.homeworkId,
        ...(activeSec?.questionIds || []),
        ...(activeSec?.resolvedQuestions || []).map(q => q?.id || q?.questionId),
        ...(activeSec?.questions || []).map(q => q?.id || q?.questionId),
        ...(test?.questions || []).map(q => q?.id || q?.questionId),
        ...(test?.questionsList || []).map(q => q?.id || q?.questionId)
      ].filter(Boolean);

      const idsToTry = [];
      rawIds.forEach(id => {
        const strId = typeof id === 'object' ? (id.id || id.questionId) : String(id);
        if (strId) {
          idsToTry.push(strId);
          idsToTry.push(strId.replace(/^q_?/, ''));
          idsToTry.push(strId.replace(/^q_?/, 'q'));
          idsToTry.push(strId.replace(/^q_?/, 'q_'));
          idsToTry.push(strId.replace(/^hw_?/, ''));
          idsToTry.push(strId.replace(/^hw_?/, 'q'));
          idsToTry.push(strId.replace(/^hw_?/, 'q_'));
          idsToTry.push(strId.replace(/^test_?/, ''));
          idsToTry.push(strId.replace(/^test_?/, 'q'));
          idsToTry.push(strId.replace(/^test_?/, 'q_'));
          idsToTry.push(strId.replace(/^sec_?/, ''));
          idsToTry.push(`q_${strId.replace(/^q_?/, '')}`);
          idsToTry.push(`q${strId.replace(/^q_?/, '')}`);
          idsToTry.push(`hw_${strId.replace(/^hw_?/, '')}`);
          idsToTry.push(`test_${strId.replace(/^test_?/, '')}`);
        }
      });

      const uniqueIds = [...new Set(idsToTry.filter(Boolean))];

      for (const candidate of uniqueIds) {
        try {
          const val = await idbGetPayload(candidate);
          if (val && typeof val === 'string' && val.length > 10 && !val.includes('[STORED_IN_INDEXEDDB]') && isMounted) {
            setPayload(val);
            setLoading(false);
            return;
          }
        } catch {}
      }

      if (isMounted) setLoading(false);
    }

    loadIdb();

    return () => { isMounted = false; };
  }, [
    activeSec?.id,
    activeSec?.contentPayload,
    activeSec?.pdfPayload,
    activeSec?.htmlPayload,
    activeSec?.pdfUrl,
    activeSec?.testId,
    test?.id,
    test?.contentPayload,
    test?.pdfPayload,
    test?.pdfUrl
  ]);

  return { payload, loading };
}
