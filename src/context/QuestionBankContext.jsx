import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { dbGetQuestions, dbAddQuestion, dbDeleteQuestion, toUUID } from '../services/supabaseService';
import { idbSetPayload, idbGetPayload, idbDeletePayload } from '../services/indexedDbService';
import { isCacheValid, touchCache } from '../utils/cacheManager';

const QuestionBankContext = createContext();

export function useQuestionBank() {
  return useContext(QuestionBankContext);
}

const INITIAL_QUESTIONS = [];

export function QuestionBankProvider({ children }) {
  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem('eTestQuestions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const map = new Map();
          parsed.filter(q => q && q.id !== 'q1').forEach(q => {
            map.set(toUUID(q.id), q);
          });
          return Array.from(map.values());
        }
      } catch (e) {
        console.warn('[LocalStorage] Error parsing saved questions:', e);
      }
    }
    return INITIAL_QUESTIONS;
  });

  useEffect(() => {
    async function syncAndRestorePayloads() {
      const currentQs = questions || [];
      const restored = await Promise.all(currentQs.map(async (q) => {
        let payload = q.contentPayload;
        const isMissing = !payload || (typeof payload === 'string' && (payload.includes('[STORED_IN_INDEXEDDB]') || payload.includes('[LOCALSTORAGE_CACHE]')));
        if (isMissing) {
          const stored = await idbGetPayload(q.id) || await idbGetPayload(String(q.id).replace(/^q_?/, ''));
          if (stored) {
            payload = stored;
          }
        }
        return {
          ...q,
          contentPayload: payload
        };
      }));

      // Safely sync from Supabase database if configured
      const dbQs = await dbGetQuestions();
      if (dbQs && Array.isArray(dbQs)) {
        touchCache('questions');
        const dbMap = new Map();

        await Promise.all(dbQs.filter(q => q && q.id !== 'q1').map(async (dbQ) => {
          const canonicalKey = toUUID(dbQ.id);
          let payload = dbQ.contentPayload;
          const isMissing = !payload || (typeof payload === 'string' && (payload.includes('[STORED_IN_INDEXEDDB]') || payload.includes('[LOCALSTORAGE_CACHE]')));
          if (isMissing) {
            const stored = await idbGetPayload(dbQ.id) || await idbGetPayload(String(dbQ.id).replace(/^q_?/, ''));
            if (stored) {
              payload = stored;
            }
          }
          dbMap.set(canonicalKey, {
            ...dbQ,
            contentPayload: payload || dbQ.contentPayload
          });
        }));

        const finalArr = Array.from(dbMap.values());
        setQuestions(finalArr);
        try {
          localStorage.setItem('eTestQuestions', JSON.stringify(finalArr));
        } catch {}
      }
    }

    syncAndRestorePayloads();
  }, []);

  useEffect(() => {
    try {
      // Store lightweight metadata in LocalStorage (5MB limit).
      // Full PDF/Image DataURLs remain safely stored in React State & IndexedDB.
      const lightweightQuestions = (questions || []).map(q => {
        const copy = { ...q };
        const isHtml = q.contentType === 'html' || q.sourceFormat === 'html' ||
          (typeof q.contentPayload === 'string' && (q.contentPayload.includes('<html') || q.contentPayload.includes('<!DOCTYPE') || q.contentPayload.startsWith('data:text/html')));

        // Strip heavy base64 data to avoid LocalStorage QuotaExceededError
        if (!isHtml) {
          if (typeof copy.contentPayload === 'string' && copy.contentPayload.length > 50000 && copy.contentPayload.startsWith('data:')) {
            copy.contentPayload = '[STORED_IN_INDEXEDDB]';
          }
          if (Array.isArray(copy.imageUrls)) {
            copy.imageUrls = copy.imageUrls.map(u => (typeof u === 'string' && u.length > 50000 && u.startsWith('data:') ? '[STORED_IN_INDEXEDDB]' : u));
          }
          if (Array.isArray(copy.questionsList)) {
            copy.questionsList = copy.questionsList.map(sq => ({
              ...sq,
              contentPayload: typeof sq.contentPayload === 'string' && sq.contentPayload.length > 50000 && sq.contentPayload.startsWith('data:') ? '[STORED_IN_INDEXEDDB]' : sq.contentPayload,
              imageUrl: typeof sq.imageUrl === 'string' && sq.imageUrl.length > 50000 && sq.imageUrl.startsWith('data:') ? '[STORED_IN_INDEXEDDB]' : sq.imageUrl
            }));
          }
        }
        return copy;
      });
      localStorage.setItem('eTestQuestions', JSON.stringify(lightweightQuestions));
    } catch (err) {
      console.warn('[LocalStorage] QuotaExceededError avoided safely:', err.message);
    }
  }, [questions]);

  const addQuestion = async (questionData) => {
    if (Array.isArray(questionData)) {
      if (questionData.length === 0) return;

      const rawId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const bundleId = toUUID(rawId);
      const firstQ = questionData[0] || {};

      const subQuestions = questionData.map((q, idx) => ({
        id: q.id || `sub_${idx}_${Date.now()}`,
        questionText: q.questionText || q.title || `Soru ${idx + 1}`,
        options: q.options || ['A', 'B', 'C', 'D'],
        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
        contentType: q.contentType || firstQ.contentType || 'text',
        contentPayload: q.contentPayload || ''
      }));

      const answerKey = subQuestions.map(q => {
        const idx = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
        return String.fromCharCode(65 + idx);
      });

      const singleBundleQuestion = {
        id: bundleId,
        stringId: rawId,
        title: firstQ.title || `${firstQ.subject || 'Ders'} Toplu Test Paketi (${subQuestions.length} Soru)`,
        topicId: firstQ.topicId || 'global_all',
        subject: firstQ.subject || 'Matematik',
        gradeId: firstQ.gradeId || 'g1',
        contentType: firstQ.contentType || 'json',
        type: firstQ.type || 'coktan_secmeli',
        isBundle: true,
        questionCount: subQuestions.length,
        questionsList: subQuestions,
        answerKey: answerKey,
        contentPayload: JSON.stringify(subQuestions, null, 2)
      };

      if (singleBundleQuestion.contentPayload && singleBundleQuestion.contentPayload.length > 500) {
        const payload = singleBundleQuestion.contentPayload;
        await idbSetPayload(bundleId, payload);
      }

      setQuestions(prev => {
        const map = new Map();
        (prev || []).forEach(q => map.set(toUUID(q.id), q));
        map.set(bundleId, singleBundleQuestion);
        return Array.from(map.values());
      });

      const savedBundle = await dbAddQuestion(singleBundleQuestion);
      if (savedBundle && savedBundle[0]) {
        const row = savedBundle[0];
        setQuestions(prev => prev.map(item => toUUID(item.id) === bundleId ? { ...item, id: row.id || bundleId, contentPayload: row.content_payload || item.contentPayload, ...(row.raw_data || {}) } : item));
      }
    } else {
      const isHtmlType = questionData.contentType === 'html';
      const rawId = questionData.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const qId = toUUID(rawId);

      const newQuestion = { 
        ...questionData,
        id: qId,
        stringId: rawId,
        htmlPayload: isHtmlType ? (questionData.contentPayload || questionData.htmlPayload) : questionData.htmlPayload
      };

      if (newQuestion.contentPayload && typeof newQuestion.contentPayload === 'string' && newQuestion.contentPayload.length > 50) {
        const payload = newQuestion.contentPayload;
        await idbSetPayload(qId, payload);
      }
      if (Array.isArray(newQuestion.questionsList)) {
        for (const sq of newQuestion.questionsList) {
          if (sq.id && (sq.contentPayload || sq.imageUrl)) {
            const sqPayload = sq.contentPayload || sq.imageUrl;
            await idbSetPayload(sq.id, sqPayload);
          }
        }
      }

      setQuestions(prev => {
        const map = new Map();
        (prev || []).forEach(q => map.set(toUUID(q.id), q));
        map.set(qId, newQuestion);
        return Array.from(map.values());
      });

      const savedQ = await dbAddQuestion(newQuestion);
      if (savedQ && savedQ[0]) {
        const row = savedQ[0];
        setQuestions(prev => prev.map(item => toUUID(item.id) === qId ? { ...item, id: row.id || qId, contentPayload: row.content_payload || item.contentPayload, imageUrl: row.image_url || item.imageUrl, ...(row.raw_data || {}) } : item));
      }
    }
  };

  const deleteQuestion = async (id) => {
    const targetUuid = toUUID(id);
    const targetQ = questions.find(q => toUUID(q.id) === targetUuid);
    setQuestions(prev => {
      const filtered = prev.filter(q => toUUID(q.id) !== targetUuid && String(q.id) !== String(id));
      try {
        localStorage.setItem('eTestQuestions', JSON.stringify(filtered));
      } catch (e) {}
      return filtered;
    });

    // 1. Delete from IndexedDB (main ID and ID variants)
    await idbDeletePayload(id);
    await idbDeletePayload(targetUuid);
    await idbDeletePayload(String(id).replace(/^q_?/, ''));

    // 2. Delete sub-question payloads if bundle
    if (targetQ && Array.isArray(targetQ.questionsList)) {
      for (const subQ of targetQ.questionsList) {
        if (subQ.id) {
          await idbDeletePayload(subQ.id);
          await idbDeletePayload(toUUID(subQ.id));
        }
      }
    }

    // 3. Delete from Supabase Database & Storage Bucket ('question_files')
    await dbDeleteQuestion(targetQ || id);
  };

  const updateQuestion = async (id, updatedData) => {
    const targetUuid = toUUID(id);
    let updatedQ = null;
    setQuestions(prev => prev.map(q => {
      if (toUUID(q.id) === targetUuid) {
        updatedQ = { ...q, ...updatedData, id: q.id };
        return updatedQ;
      }
      return q;
    }));
    if (updatedQ) {
      if (updatedQ.contentPayload && typeof updatedQ.contentPayload === 'string' && updatedQ.contentPayload.length > 50) {
        const payload = updatedQ.contentPayload;
        await idbSetPayload(updatedQ.id, payload);
        await idbSetPayload(targetUuid, payload);
      }
      if (Array.isArray(updatedQ.questionsList)) {
        for (const sq of updatedQ.questionsList) {
          if (sq.id && (sq.contentPayload || sq.imageUrl)) {
            const sqPayload = sq.contentPayload || sq.imageUrl;
            await idbSetPayload(sq.id, sqPayload);
          }
        }
      }
      await dbAddQuestion(updatedQ);
    }
  };

  const value = useMemo(() => ({
    questions,
    addQuestion,
    updateQuestion,
    deleteQuestion
  }), [questions]);

  return (
    <QuestionBankContext.Provider value={value}>
      {children}
    </QuestionBankContext.Provider>
  );
}
