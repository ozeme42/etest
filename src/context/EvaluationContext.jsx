import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetSubmissions, dbSaveSubmission, dbDeleteSubmission, dbClearStudentSubmissions } from '../services/supabaseService';

const EvaluationContext = createContext();

export function useEvaluation() {
  return useContext(EvaluationContext);
}

const DEFAULT_SAMPLE_SUBMISSIONS = [
  {
    id: 'sub_sample_open_1',
    testId: 't4',
    studentId: 'u1',
    studentName: 'Ahmet Yılmaz',
    testTitle: 'Din Kültürü ve Ahlak Bilgisi Açık Uçlu Sınavı',
    title: 'Din Kültürü ve Ahlak Bilgisi Açık Uçlu Sınavı',
    subject: 'Din Kültürü',
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    emptyCount: 0,
    pendingCount: 2,
    totalQuestions: 2,
    status: 'pending_evaluation',
    isOpenEnded: true,
    isEvaluatedByTeacher: false,
    submittedAt: new Date().toISOString(),
    answers: [
      {
        questionId: 'q1',
        questionNo: 1,
        questionText: '1) İslam dininde infak ve sadakanın toplumsal dayanışmaya katkılarını açıklayınız.',
        userAnswerText: 'İnfak ve sadaka zenginler ile fakirler arasında sevgi ve kardeşlik bağını güçlendirir, toplumdaki ekonomik adaletsizlikleri azaltır.'
      },
      {
        questionId: 'q2',
        questionNo: 2,
        questionText: '2) Hz. Muhammed\'in (s.a.v.) adaletli ve güvenilir bir lider olmasının toplumsal yansımalarını yazınız.',
        userAnswerText: 'Peygamber efendimizin El-Emin sıfatı toplumda yüksek bir güven ortamı oluşturmuştur. Her konuda hakkaniyetli davranmıştır.'
      }
    ]
  },
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

  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    async function syncFromSupabase() {
      setIsSyncing(true);
      try {
        const dbSubs = await dbGetSubmissions();
        if (Array.isArray(dbSubs) && dbSubs.length > 0) {
          setSubmissions(prev => {
            const map = new Map();
            dbSubs.forEach(s => map.set(String(s.id), s));
            prev.forEach(s => {
              const existing = map.get(String(s.id));
              if (!existing || s.isEvaluatedByTeacher || s.status === 'completed' || s.status === 'evaluated') {
                map.set(String(s.id), { ...existing, ...s });
              }
            });
            return Array.from(map.values());
          });
        }
      } finally {
        setIsSyncing(false);
      }
    }
    syncFromSupabase();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('eTestSubmissions', JSON.stringify(submissions));
    } catch (err) {
      console.warn('EvaluationContext: localStorage quota exceeded while saving submissions.', err);
    }
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

  const updateSubmission = async (id, updatedData) => {
    setSubmissions(prev => {
      let target = null;
      const nextSubs = prev.map(sub => {
        if (String(sub.id) === String(id)) {
          target = { ...sub, ...updatedData };
          return target;
        }
        return sub;
      });
      if (target) {
        dbSaveSubmission(target);
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

  const deleteSubmissionsByTestId = async (testId) => {
    setSubmissions(prev => {
      const remaining = [];
      const toDelete = [];
      prev.forEach(s => {
        if (String(s.testId) === String(testId)) {
          toDelete.push(s.id);
        } else {
          remaining.push(s);
        }
      });
      toDelete.forEach(id => dbDeleteSubmission(id));
      return remaining;
    });
  };

  const deleteAllSubmissions = async () => {
    setSubmissions(prev => {
      prev.forEach(s => dbDeleteSubmission(s.id));
      return [];
    });
  };

  return (
    <EvaluationContext.Provider value={{
      submissions,
      isSyncing,
      addSubmission,
      evaluateAnswer,
      finalizeSubmission,
      updateSubmission,
      deleteSubmission,
      clearSubmissionsForStudent,
      deleteSubmissionsByTestId,
      deleteAllSubmissions
    }}>
      {children}
    </EvaluationContext.Provider>
  );
}
