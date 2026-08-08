import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetQuestions, dbAddQuestion, dbDeleteQuestion } from '../services/supabaseService';
import { idbSetPayload, idbGetPayload, idbDeletePayload } from '../services/indexedDbService';

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
        return (parsed || []).filter(q => q.id !== 'q1');
      } catch (e) {
        console.warn('[LocalStorage] Error parsing saved questions:', e);
      }
    }
    return INITIAL_QUESTIONS;
  });

  useEffect(() => {
    async function syncAndRestorePayloads() {
      // 1. Restore full PDF/Image payloads from IndexedDB for questions loaded from localStorage metadata
      const currentQs = questions || [];
      const restored = await Promise.all(currentQs.map(async (q) => {
        if (!q.contentPayload || q.contentPayload === '[STORED_IN_INDEXEDDB]' || (typeof q.contentPayload === 'string' && q.contentPayload.includes('[LOCALSTORAGE_CACHE]'))) {
          const fullPayload = await idbGetPayload(q.id);
          if (fullPayload) {
            return { ...q, contentPayload: fullPayload };
          }
        }
        return q;
      }));

      setQuestions(prev => {
        const mergedMap = new Map();
        (restored || []).forEach(q => mergedMap.set(String(q.id), q));
        (prev || []).forEach(q => {
          const existing = mergedMap.get(String(q.id));
          // If current in-memory question has full PDF DataURL, keep it!
          if (!existing || (typeof q.contentPayload === 'string' && q.contentPayload.startsWith('data:'))) {
            mergedMap.set(String(q.id), q);
          }
        });
        return Array.from(mergedMap.values());
      });

      // 2. Safely merge from Supabase database without creating duplicate cards
      const dbQs = await dbGetQuestions();
      if (dbQs && dbQs.length > 0) {
        setQuestions(prev => {
          const mergedMap = new Map();
          (prev || []).forEach(q => mergedMap.set(String(q.id), q));

          dbQs.forEach(dbQ => {
            if (dbQ.id === 'q1') return;

            let existingKey = String(dbQ.id);

            const existing = mergedMap.get(existingKey);
            if (existing) {
              const hasFullLocalPayload = typeof existing.contentPayload === 'string' &&
                existing.contentPayload.length > 500 &&
                !existing.contentPayload.includes('[STORED_IN_INDEXEDDB]') &&
                !existing.contentPayload.includes('[LOCALSTORAGE_CACHE]');

              const dbHasStorageUrl = typeof dbQ.contentPayload === 'string' && dbQ.contentPayload.startsWith('http');

              mergedMap.set(existingKey, {
                ...dbQ,
                ...existing,
                id: existing.id || dbQ.id,
                questionsList: existing.questionsList || dbQ.questionsList || null,
                contentPayload: dbHasStorageUrl ? dbQ.contentPayload :
                                hasFullLocalPayload ? existing.contentPayload :
                                (dbQ.contentPayload || existing.contentPayload)
              });
            } else {
              mergedMap.set(String(dbQ.id), dbQ);
            }
          });
          return Array.from(mergedMap.values());
        });
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

        // NEVER strip HTML content or text under 100,000 chars (100KB) from localStorage
        if (!isHtml && typeof copy.contentPayload === 'string' && copy.contentPayload.length > 100000) {
          copy.contentPayload = '[STORED_IN_INDEXEDDB]';
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

      const bundleId = `q${Date.now()}`;
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
        const qId = singleBundleQuestion.id;
        await idbSetPayload(qId, payload);
        await idbSetPayload(String(qId).replace(/^q_?/, ''), payload);
        await idbSetPayload(String(qId).replace(/^q_?/, 'q_'), payload);
        await idbSetPayload(String(qId).replace(/^q_?/, 'q'), payload);
      }

      setQuestions(prev => [...prev, singleBundleQuestion]);
      await dbAddQuestion(singleBundleQuestion);
    } else {
      const newQuestion = { id: `q_${Date.now()}`, htmlPayload: questionData.contentPayload || questionData.htmlPayload, ...questionData };
      if (newQuestion.contentPayload && typeof newQuestion.contentPayload === 'string' && newQuestion.contentPayload.length > 500) {
        const payload = newQuestion.contentPayload;
        const qId = newQuestion.id;
        await idbSetPayload(qId, payload);
        await idbSetPayload(String(qId).replace(/^q_?/, ''), payload);
        await idbSetPayload(String(qId).replace(/^q_?/, 'q_'), payload);
        await idbSetPayload(String(qId).replace(/^q_?/, 'q'), payload);
      }
      setQuestions(prev => [...prev, newQuestion]);
      await dbAddQuestion(newQuestion);
    }
  };

  const deleteQuestion = async (id) => {
    const targetQ = questions.find(q => q.id === id);
    setQuestions(prev => prev.filter(q => q.id !== id));

    // 1. Delete from IndexedDB (main ID and ID variants)
    await idbDeletePayload(id);
    await idbDeletePayload(String(id).replace(/^q_?/, ''));
    await idbDeletePayload(`q_${id}`);
    await idbDeletePayload(`q${id}`);

    // 2. Delete sub-question payloads if bundle
    if (targetQ && Array.isArray(targetQ.questionsList)) {
      for (const subQ of targetQ.questionsList) {
        if (subQ.id) {
          await idbDeletePayload(subQ.id);
          await idbDeletePayload(String(subQ.id).replace(/^q_?/, ''));
        }
      }
    }

    // 3. Delete from Supabase Database & Storage Bucket ('question_files')
    await dbDeleteQuestion(targetQ || id);
  };

  const updateQuestion = async (id, updatedData) => {
    let updatedQ = null;
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        updatedQ = { ...q, ...updatedData };
        return updatedQ;
      }
      return q;
    }));
    if (updatedQ) {
      if (updatedQ.contentPayload && typeof updatedQ.contentPayload === 'string' && updatedQ.contentPayload.length > 500) {
        const payload = updatedQ.contentPayload;
        const qId = updatedQ.id;
        await idbSetPayload(qId, payload);
        await idbSetPayload(String(qId).replace(/^q_?/, ''), payload);
        await idbSetPayload(String(qId).replace(/^q_?/, 'q_'), payload);
        await idbSetPayload(String(qId).replace(/^q_?/, 'q'), payload);
      }
      await dbAddQuestion(updatedQ);
    }
  };

  return (
    <QuestionBankContext.Provider value={{
      questions,
      addQuestion,
      updateQuestion,
      deleteQuestion
    }}>
      {children}
    </QuestionBankContext.Provider>
  );
}
