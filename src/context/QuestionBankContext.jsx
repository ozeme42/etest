import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetQuestions, dbAddQuestion, dbDeleteQuestion } from '../services/supabaseService';

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
    async function syncFromSupabase() {
      const dbQs = await dbGetQuestions();
      if (dbQs) {
        setQuestions(dbQs.filter(q => q.id !== 'q1'));
      }
    }
    syncFromSupabase();
  }, []);

  useEffect(() => {
    try {
      // Sanitize questions to prevent LocalStorage QuotaExceededError (5MB limit) when storing large images/PDFs
      const lightweightQuestions = (questions || []).map(q => {
        let safePayload = q.contentPayload;
        if (typeof safePayload === 'string' && safePayload.length > 500 && safePayload.startsWith('data:')) {
          safePayload = safePayload.slice(0, 100) + '...[LOCALSTORAGE_CACHE]';
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
      setQuestions(prev => [...prev, ...newQuestions]);
      for (const q of newQuestions) {
        await dbAddQuestion(q);
      }
    } else {
      const newQuestion = { id: `q${Date.now()}`, ...questionData };
      setQuestions(prev => [...prev, newQuestion]);
      await dbAddQuestion(newQuestion);
    }
  };

  const deleteQuestion = async (id) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
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
