import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetSubmissions, dbSaveSubmission, dbDeleteSubmission, dbClearStudentSubmissions } from '../services/supabaseService';

const EvaluationContext = createContext();

export function useEvaluation() {
  return useContext(EvaluationContext);
}

const DEFAULT_SAMPLE_SUBMISSIONS = [
  {
    id: 'sub_sample_1',
    testId: 't1',
    studentId: 'u1',
    testTitle: 'LGS Matematik Çarpanlar ve Katlar Genel Tarama Sınavı',
    title: 'LGS Matematik Çarpanlar ve Katlar Genel Tarama Sınavı',
    subject: 'Matematik',
    score: 70,
    correctCount: 7,
    wrongCount: 2,
    emptyCount: 1,
    totalQuestions: 10,
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    answers: [
      { questionId: 'q1', isCorrect: true, userAnswer: 'A' },
      { questionId: 'q2', isCorrect: true, userAnswer: 'B' },
      { questionId: 'q3', isCorrect: false, userAnswer: 'C', subIndex: 2 },
      { questionId: 'q4', isCorrect: true, userAnswer: 'D' },
      { questionId: 'q5', isCorrect: false, userAnswer: 'A', subIndex: 4 },
      { questionId: 'q6', isCorrect: true, userAnswer: 'B' },
      { questionId: 'q7', isCorrect: true, userAnswer: 'C' },
      { questionId: 'q8', isCorrect: false, userAnswer: '', subIndex: 7 },
      { questionId: 'q9', isCorrect: true, userAnswer: 'A' },
      { questionId: 'q10', isCorrect: true, userAnswer: 'B' }
    ]
  },
  {
    id: 'sub_sample_2',
    testId: 't2',
    studentId: 'u1',
    testTitle: 'Fen Bilimleri Mevsimler ve İklim Ünite Denemesi',
    title: 'Fen Bilimleri Mevsimler ve İklim Ünite Denemesi',
    subject: 'Fen Bilimleri',
    score: 80,
    correctCount: 8,
    wrongCount: 1,
    emptyCount: 1,
    totalQuestions: 10,
    submittedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    answers: [
      { questionId: 'fq1', isCorrect: true, userAnswer: 'A' },
      { questionId: 'fq2', isCorrect: false, userAnswer: 'D', subIndex: 1 },
      { questionId: 'fq3', isCorrect: true, userAnswer: 'C' },
      { questionId: 'fq4', isCorrect: true, userAnswer: 'B' },
      { questionId: 'fq5', isCorrect: false, userAnswer: '', subIndex: 4 },
      { questionId: 'fq6', isCorrect: true, userAnswer: 'A' },
      { questionId: 'fq7', isCorrect: true, userAnswer: 'D' },
      { questionId: 'fq8', isCorrect: true, userAnswer: 'C' },
      { questionId: 'fq9', isCorrect: true, userAnswer: 'B' },
      { questionId: 'fq10', isCorrect: true, userAnswer: 'A' }
    ]
  },
  {
    id: 'sub_sample_3',
    testId: 't3',
    studentId: 'u1',
    testTitle: 'Türkçe Paragrafta Anlam ve Söz Sanatları Tara Testi',
    title: 'Türkçe Paragrafta Anlam ve Söz Sanatları Tara Testi',
    subject: 'Türkçe',
    score: 75,
    correctCount: 6,
    wrongCount: 2,
    emptyCount: 0,
    totalQuestions: 8,
    submittedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    answers: [
      { questionId: 'tq1', isCorrect: true, userAnswer: 'B' },
      { questionId: 'tq2', isCorrect: false, userAnswer: 'A', subIndex: 1 },
      { questionId: 'tq3', isCorrect: true, userAnswer: 'D' },
      { questionId: 'tq4', isCorrect: false, userAnswer: 'C', subIndex: 3 },
      { questionId: 'tq5', isCorrect: true, userAnswer: 'A' },
      { questionId: 'tq6', isCorrect: true, userAnswer: 'B' },
      { questionId: 'tq7', isCorrect: true, userAnswer: 'C' },
      { questionId: 'tq8', isCorrect: true, userAnswer: 'D' }
    ]
  }
];

export function EvaluationProvider({ children }) {
  const [submissions, setSubmissions] = useState(() => {
    const saved = localStorage.getItem('eTestSubmissions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.length > 0 ? parsed : DEFAULT_SAMPLE_SUBMISSIONS;
      } catch (e) {}
    }
    return DEFAULT_SAMPLE_SUBMISSIONS;
  });

  useEffect(() => {
    async function syncFromSupabase() {
      const dbSubs = await dbGetSubmissions();
      if (dbSubs && dbSubs.length > 0) {
        setSubmissions(prev => {
          // Merge remote DB submissions with local ones
          const map = new Map();
          prev.forEach(s => map.set(s.id, s));
          dbSubs.forEach(s => map.set(s.id, { ...map.get(s.id), ...s }));
          return Array.from(map.values());
        });
      }
    }
    syncFromSupabase();
  }, []);

  useEffect(() => {
    localStorage.setItem('eTestSubmissions', JSON.stringify(submissions));
  }, [submissions]);

  const addSubmission = async (subData) => {
    const newSub = {
      id: `sub_${Date.now()}`,
      submittedAt: new Date().toISOString(),
      ...subData
    };
    setSubmissions(prev => [...prev, newSub]);
    await dbSaveSubmission(newSub);
    return newSub.id;
  };

  const evaluateAnswer = (submissionId, questionId, isBundle, subIndex, evaluationResult) => {
    setSubmissions(prev => {
      let updatedSub = null;
      const nextSubs = prev.map(sub => {
        if (sub.id !== submissionId) return sub;

        let updatedAnswers = sub.answers.map(ans => {
          const isMatch = isBundle 
            ? ans.questionId === questionId && ans.isBundle && ans.subIndex === subIndex
            : ans.questionId === questionId && !ans.isBundle;
            
          if (isMatch) {
            return {
              ...ans,
              isCorrect: evaluationResult,
              earnedPoints: evaluationResult ? 10 : 0
            };
          }
          return ans;
        });

        updatedSub = { ...sub, answers: updatedAnswers };
        return updatedSub;
      });

      if (updatedSub) {
        dbSaveSubmission(updatedSub);
      }
      return nextSubs;
    });
  };

  const finalizeSubmission = (submissionId) => {
    setSubmissions(prev => {
      let updatedSub = null;
      const nextSubs = prev.map(sub => {
        if (sub.id !== submissionId) return sub;
        
        const totalScore = sub.answers.reduce((acc, ans) => acc + (ans.earnedPoints || 0), 0);
        updatedSub = { ...sub, status: 'completed', score: totalScore };
        return updatedSub;
      });

      if (updatedSub) {
        dbSaveSubmission(updatedSub);
      }
      return nextSubs;
    });
  };

  const deleteSubmission = async (id) => {
    setSubmissions(prev => prev.filter(s => s.id !== id));
    await dbDeleteSubmission(id);
  };

  const clearSubmissionsForStudent = async (studentId) => {
    setSubmissions(prev => prev.filter(s => String(s.studentId) !== String(studentId)));
    await dbClearStudentSubmissions(studentId);
  };

  return (
    <EvaluationContext.Provider value={{
      submissions,
      addSubmission,
      evaluateAnswer,
      finalizeSubmission,
      deleteSubmission,
      clearSubmissionsForStudent
    }}>
      {children}
    </EvaluationContext.Provider>
  );
}
