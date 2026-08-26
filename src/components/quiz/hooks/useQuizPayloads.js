import { useState, useEffect } from 'react';
import { idbGetPayload } from '../../../services/indexedDbService';
import { extractImageUrls, isValidImageUrl } from '../common/ImageLightbox';

const extractDirectPayload = (obj) => {
  if (!obj) return null;
  if (Array.isArray(obj.imageUrls) && obj.imageUrls.length > 0) {
    const valid = obj.imageUrls.filter(isValidImageUrl);
    if (valid.length > 0) return valid.join('\n\n');
  }
  if (Array.isArray(obj.images) && obj.images.length > 0) {
    const valid = obj.images.filter(isValidImageUrl);
    if (valid.length > 0) return valid.join('\n\n');
  }
  const candidates = [
    obj.pdfPayload,
    obj.contentPayload,
    obj.htmlPayload,
    obj.imagePayload,
    obj.imageUrl,
    obj.image,
    obj.pdfUrl,
    obj.url,
    obj.filePayload,
    obj.payload,
    obj.data
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
    const isMultiSection = Array.isArray(test?.sections) && test.sections.length > 1;

    // 1. Direct memory check
    let direct = extractDirectPayload(activeSec) ||
      extractDirectPayload(activeSec?.bankQ) ||
      (!isMultiSection ? extractDirectPayload(test) : null);

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
        ...(!isMultiSection ? [test?.id, test?.realTestId, test?.sourceTestId, test?.bookTestId, test?.homeworkId] : []),
        ...(activeSec?.questionIds || []),
        ...(activeSec?.resolvedQuestions || []).map(q => q?.id || q?.questionId),
        ...(activeSec?.questions || []).map(q => q?.id || q?.questionId),
        ...(!isMultiSection ? (test?.questions || []).map(q => q?.id || q?.questionId) : []),
        ...(!isMultiSection ? (test?.questionsList || []).map(q => q?.id || q?.questionId) : [])
      ].filter(Boolean);

      const idsToTry = [];
      rawIds.forEach(id => {
        const strId = typeof id === 'object' ? (id.id || id.questionId) : String(id);
        if (strId) {
          const clean = strId.replace(/^q_|^hw_|^test_|^sec_|^img_|^image_/, '');
          idsToTry.push(strId);
          idsToTry.push(clean);
          idsToTry.push(`q_${clean}`);
          idsToTry.push(`q${clean}`);
          idsToTry.push(`hw_${clean}`);
          idsToTry.push(`test_${clean}`);
          idsToTry.push(`sec_${clean}`);
          idsToTry.push(`img_${clean}`);
          idsToTry.push(`image_${clean}`);
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
    activeSec?.imageUrl,
    activeSec?.imageUrls,
    activeSec?.images,
    activeSec?.testId,
    test?.id,
    test?.contentPayload,
    test?.pdfPayload,
    test?.pdfUrl,
    test?.imageUrl,
    test?.imageUrls
  ]);

  return { payload, loading };
}
