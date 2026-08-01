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

      // 2. Safely merge from Supabase database
      const dbQs = await dbGetQuestions();
      if (dbQs && dbQs.length > 0) {
        setQuestions(prev => {
          const mergedMap = new Map();
          (prev || []).forEach(q => mergedMap.set(String(q.id), q));

          dbQs.forEach(dbQ => {
            if (dbQ.id === 'q1') return;
            const existing = mergedMap.get(String(dbQ.id));
            if (existing) {
              // If local has full base64 data, keep it
              const hasFullLocalPayload = typeof existing.contentPayload === 'string' &&
                existing.contentPayload.length > 500 &&
                !existing.contentPayload.includes('[STORED_IN_INDEXEDDB]') &&
                !existing.contentPayload.includes('[LOCALSTORAGE_CACHE]');

              // If DB has a Storage HTTP URL, always prefer it (it means it was uploaded to Supabase Storage)
              const dbHasStorageUrl = typeof dbQ.contentPayload === 'string' && dbQ.contentPayload.startsWith('http');

              mergedMap.set(String(dbQ.id), {
                ...dbQ,
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
        if (typeof copy.contentPayload === 'string' && copy.contentPayload.length > 500) {
          copy.contentPayload = '[STORED_IN_INDEXEDDB]';
        }
        if (copy.raw_data && typeof copy.raw_data === 'object') {
          copy.raw_data = { ...copy.raw_data };
          if (typeof copy.raw_data.contentPayload === 'string' && copy.raw_data.contentPayload.length > 500) {
            copy.raw_data.contentPayload = '[STORED_IN_INDEXEDDB]';
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
      const newQuestions = questionData.map((q, idx) => ({
        id: `q${Date.now()}_${idx}`,
        ...q
      }));

      for (const q of newQuestions) {
        if (q.contentPayload && typeof q.contentPayload === 'string' && q.contentPayload.length > 500) {
          await idbSetPayload(q.id, q.contentPayload);
        }
      }

      setQuestions(prev => [...prev, ...newQuestions]);
      for (const q of newQuestions) {
        await dbAddQuestion(q);
      }
    } else {
      const newQuestion = { id: `q${Date.now()}`, ...questionData };
      if (newQuestion.contentPayload && typeof newQuestion.contentPayload === 'string' && newQuestion.contentPayload.length > 500) {
        await idbSetPayload(newQuestion.id, newQuestion.contentPayload);
      }
      setQuestions(prev => [...prev, newQuestion]);
      await dbAddQuestion(newQuestion);
    }
  };

  const deleteQuestion = async (id) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    await idbDeletePayload(id);
    await dbDeleteQuestion(id);
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
        await idbSetPayload(updatedQ.id, updatedQ.contentPayload);
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
