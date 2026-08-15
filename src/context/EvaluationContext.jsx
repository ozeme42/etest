import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { dbGetSubmissions, dbSaveSubmission, dbDeleteSubmission, dbClearStudentSubmissions } from '../services/supabaseService';
import { useAuth } from './AuthContext';

const EvaluationContext = createContext();

export function useEvaluation() {
  const context = useContext(EvaluationContext);
  if (!context) {
    return { submissions: [], addSubmission: async () => {}, deleteSubmission: async () => {}, clearStudentSubmissions: async () => {} };
  }
  return context;
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
        const dbSubsList = await dbGetSubmissions() || [];
        setSubmissions(prev => {
          const map = new Map();
          dbSubsList.forEach(s => map.set(String(s.id), s));
          prev.forEach(s => {
            const existing = map.get(String(s.id));

            // Yüksek boyutlu verileri temizle (eski kayıtlar için)
            delete s.contentPayload;
            delete s.pdfPayload;
            delete s.htmlPayload;
            delete s.imageUrl;
            delete s.imageUrls;
            if (s.questionsList) {
              s.questionsList = s.questionsList.map(q => {
                const qCopy = { ...q };
                delete qCopy.contentPayload;
                delete qCopy.htmlPayload;
                delete qCopy.imageUrls;
                delete qCopy.imageUrl;
                return qCopy;
              });
            }

            if (!existing) {
              if (!s.id.startsWith('sub_sample')) {
                dbSaveSubmission(s).catch(err => console.warn('Background sync failed:', err));
              }
              map.set(String(s.id), s);
            } else if (s.isEvaluatedByTeacher || s.status === 'completed' || s.status === 'evaluated') {
              map.set(String(s.id), { ...existing, ...s });
            }
          });
          return Array.from(map.values());
        });
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
      if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        try {
          // Keep only the latest 10 submissions to fit in quota
          const trimmed = submissions.slice(-10);
          localStorage.setItem('eTestSubmissions', JSON.stringify(trimmed));
          // Silently trimmed. The React state still holds all items, but localStorage holds 10 to prevent crashes.
        } catch (e2) {
          // Ignore
        }
      } else {
        console.warn('EvaluationContext: Error saving to localStorage:', err);
      }
    }
  }, [submissions]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'eTestSubmissions' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSubmissions(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const { user } = useAuth();

  // FIX: Bu ref, 'u1' -> gerçek kullanıcı id'si taşıma işleminin
  // yalnızca BİR KEZ çalışmasını garanti eder. Önceki kodda bu effect
  // `submissions` state'ine bağımlıydı; setSubmissions her çağrıldığında
  // yeni bir array referansı oluştuğu için effect kendi kendini tekrar
  // tetikliyor ve her seferinde dbSaveSubmission'ı yeniden çağırıyordu
  // (log'daki yüzlerce tekrarlanan hatanın sebebi buydu).
  const didMigrateU1Ref = useRef(false);

  useEffect(() => {
    if (!user?.id || didMigrateU1Ref.current) return;

    setSubmissions(prev => {
      const hasU1 = prev.some(s => s.studentId === 'u1');
      if (!hasU1) return prev; // Referansı değiştirme, gereksiz re-render/effect tetikleme

      didMigrateU1Ref.current = true;

      const updated = prev.map(s => s.studentId === 'u1' ? { ...s, studentId: user.id } : s);

      try {
        localStorage.setItem('eTestSubmissions', JSON.stringify(updated));
        updated
          .filter(s => s.studentId === user.id && s.id && !s.id.startsWith('sub_sample'))
          .forEach(s => {
            dbSaveSubmission(s).catch(() => {});
          });
      } catch (e) {}

      return updated;
    });
    // Yalnızca user.id değiştiğinde çalışsın; submissions'a bağımlı DEĞİL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const addSubmission = async (subData) => {
    const newSub = {
      id: `sub_${Date.now()}`,
      submittedAt: new Date().toISOString(),
      ...subData
    };

    // Yüksek boyutlu verileri silerek localStorage'ı koru
    delete newSub.contentPayload;
    delete newSub.pdfPayload;
    delete newSub.htmlPayload;
    delete newSub.imageUrl;
    delete newSub.imageUrls;
    if (newSub.questionsList) {
      newSub.questionsList = newSub.questionsList.map(q => {
        const qCopy = { ...q };
        delete qCopy.contentPayload;
        delete qCopy.htmlPayload;
        delete qCopy.imageUrls;
        delete qCopy.imageUrl;
        return qCopy;
      });
    }

    setSubmissions(prev => {
      const nextSubs = [...prev, newSub];
      try {
        localStorage.setItem('etest_submissions', JSON.stringify(nextSubs));
      } catch (e) {}
      return nextSubs;
    });
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

          // Yüksek boyutlu verileri silerek localStorage'ı koru
          delete target.contentPayload;
          delete target.pdfPayload;
          delete target.htmlPayload;
          delete target.imageUrl;
          delete target.imageUrls;
          if (target.questionsList) {
            target.questionsList = target.questionsList.map(q => {
              const qCopy = { ...q };
              delete qCopy.contentPayload;
              delete qCopy.htmlPayload;
              delete qCopy.imageUrls;
              delete qCopy.imageUrl;
              return qCopy;
            });
          }

          return target;
        }
        return sub;
      });
      if (target) {
        try {
          localStorage.setItem('etest_submissions', JSON.stringify(nextSubs));
        } catch (e) {}
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