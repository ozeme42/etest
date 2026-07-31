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
    localStorage.setItem('eTestQuestions', JSON.stringify(questions));
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
