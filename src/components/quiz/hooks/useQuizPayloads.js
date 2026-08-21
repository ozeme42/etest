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

    const rawCandidates = [
      activeSec?.contentPayload,
      activeSec?.htmlPayload,
      activeSec?.pdfPayload,
      activeSec?.pdfUrl,
      activeSec?.url,
      bankQ?.contentPayload,
      bankQ?.htmlPayload,
      bankQ?.pdfPayload,
      bankQ?.pdfUrl,
      bankQ?.url,
      test?.contentPayload,
      test?.htmlPayload,
      test?.pdfPayload,
      test?.pdfUrl
    ];

    const direct = rawCandidates.find(c => typeof c === 'string' && c.length > 50 && !c.includes('[STORED_IN_INDEXEDDB]') && !c.includes('[LOCALSTORAGE_CACHE]'));

    if (direct) {
      setPayload(direct);
      return;
    }

    async function loadIdb() {
      setLoading(true);
      const keysToTry = [
        activeSec?.id,
        activeSec?.questionId,
        bankQ?.id,
        bankQ?.questionId,
        test?.id,
        test?.realTestId
      ].filter(Boolean);

      for (const k of keysToTry) {
        const variants = [k, String(k).replace(/^q_?/, ''), `q_${String(k).replace(/^q_?/, '')}`, `q${String(k).replace(/^q_?/, '')}`];
        for (const candidate of variants) {
          try {
            const val = await idbGetPayload(candidate);
            if (val && typeof val === 'string' && val.length > 50 && !val.includes('[STORED_IN_INDEXEDDB]') && isMounted) {
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
  }, [activeSec?.id, activeSec?.contentPayload, activeSec?.htmlPayload, test?.id]);

  return { payload, loading };
}
