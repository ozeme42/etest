import { useState, useEffect } from 'react';
import { idbGetPayload } from '../../../services/indexedDbService';

/**
 * useQuizPayloads
 * Automatically resolves and restores HTML, PDF, and Image payloads from IndexedDB and remote URLs.
 */
export function useQuizPayloads(activeSec = {}, test = {}) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const bankQ = activeSec?.bankQ || test?.bankQ || {};
    const firstQ = activeSec?.resolvedQuestions?.[0] || activeSec?.questions?.[0] || {};

    const rawCandidates = [
      activeSec?.contentPayload,
      activeSec?.htmlPayload,
      activeSec?.pdfPayload,
      activeSec?.pdfUrl,
      activeSec?.url,
      activeSec?.payload,
      activeSec?.imageUrl,
      firstQ?.contentPayload,
      firstQ?.htmlPayload,
      firstQ?.pdfPayload,
      firstQ?.pdfUrl,
      firstQ?.url,
      bankQ?.contentPayload,
      bankQ?.htmlPayload,
      bankQ?.pdfPayload,
      bankQ?.pdfUrl,
      bankQ?.url,
      test?.contentPayload,
      test?.htmlPayload,
      test?.pdfPayload,
      test?.pdfUrl,
      test?.url
    ];

    const direct = rawCandidates.find(c =>
      typeof c === 'string' &&
      c.trim().length > 0 &&
      !c.includes('[STORED_IN_INDEXEDDB]') &&
      !c.includes('[LOCALSTORAGE_CACHE]')
    );

    if (direct) {
      setPayload(direct);
      return;
    }

    async function loadIdb() {
      setLoading(true);
      const keysToTry = [
        activeSec?.id,
        activeSec?.questionId,
        activeSec?.testId,
        activeSec?.sourceTestId,
        activeSec?.originalTestId,
        activeSec?.bankTestId,
        firstQ?.id,
        firstQ?.testId,
        firstQ?.questionId,
        bankQ?.id,
        bankQ?.questionId,
        test?.id,
        test?.realTestId,
        test?.sourceTestId
      ].filter(Boolean);

      for (const k of keysToTry) {
        const cleanK = String(k);
        const variants = [
          cleanK,
          cleanK.replace(/^q_?/, ''),
          cleanK.replace(/^test_?/, ''),
          cleanK.replace(/^sec_?/, ''),
          `q_${cleanK.replace(/^q_?/, '')}`,
          `test_${cleanK.replace(/^test_?/, '')}`
        ];
        for (const candidate of variants) {
          try {
            const val = await idbGetPayload(candidate);
            if (val && typeof val === 'string' && val.length > 10 && !val.includes('[STORED_IN_INDEXEDDB]') && isMounted) {
              setPayload(val);
              setLoading(false);
              return;
            }
          } catch {}
        }
      }
      if (isMounted) setLoading(false);
    }

    loadIdb();

    return () => { isMounted = false; };
  }, [
    activeSec?.id,
    activeSec?.contentPayload,
    activeSec?.htmlPayload,
    activeSec?.pdfPayload,
    activeSec?.pdfUrl,
    activeSec?.testId,
    test?.id,
    test?.contentPayload,
    test?.pdfUrl
  ]);

  return { payload, loading };
}
