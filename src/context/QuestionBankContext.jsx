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
      const parsed = JSON.parse(saved);
      return (parsed || []).filter(q => q.id !== 'q1');
    }
    return INITIAL_QUESTIONS;
  });

  useEffect(() => {
    async function syncAndRestorePayloads() {
      // 1. Restore full PDF/Image payloads from IndexedDB if cached locally
      const restored = await Promise.all((questions || []).map(async (q) => {
        if (typeof q.contentPayload === 'string' && q.contentPayload.includes('[LOCALSTORAGE_CACHE]')) {
          const fullPayload = await idbGetPayload(q.id);
          if (fullPayload) {
            return { ...q, contentPayload: fullPayload };
          }
        }
        return q;
      }));

      if (JSON.stringify(restored) !== JSON.stringify(questions)) {
        setQuestions(restored);
      }

      // 2. Sync from Supabase database
      const dbQs = await dbGetQuestions();
      if (dbQs && dbQs.length > 0) {
        setQuestions(dbQs.filter(q => q.id !== 'q1'));
      }
    }
    syncAndRestorePayloads();
  }, []);

  useEffect(() => {
    try {
      // Sanitize questions for LocalStorage (5MB limit). Full PDF/Image payloads are stored safely in IndexedDB and Supabase.
      const lightweightQuestions = (questions || []).map(q => {
        let safePayload = q.contentPayload;
        if (typeof safePayload === 'string' && safePayload.length > 500 && safePayload.startsWith('data:')) {
          safePayload = safePayload.slice(0, 80) + '...[LOCALSTORAGE_CACHE]';
        }
        let safeRaw = q.raw_data;
        if (safeRaw && typeof safeRaw === 'object') {
          safeRaw = { ...safeRaw };
          if (typeof safeRaw.contentPayload === 'string' && safeRaw.contentPayload.length > 500) {
            safeRaw.contentPayload = '[LOCALSTORAGE_CACHE]';
          }
        }
        return {
          ...q,
          contentPayload: safePayload,
          raw_data: safeRaw
        };
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
