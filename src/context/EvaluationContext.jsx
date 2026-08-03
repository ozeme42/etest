import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetSubmissions, dbSaveSubmission, dbDeleteSubmission, dbClearStudentSubmissions } from '../services/supabaseService';

const EvaluationContext = createContext();

export function useEvaluation() {
  return useContext(EvaluationContext);
}

export function EvaluationProvider({ children }) {
  const [submissions, setSubmissions] = useState(() => {
    const saved = localStorage.getItem('eTestSubmissions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    async function syncFromSupabase() {
      const dbSubs = await dbGetSubmissions();
      if (dbSubs && dbSubs.length > 0) {
        setSubmissions(dbSubs);
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
