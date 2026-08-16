import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dbGetSubmissions, dbSaveSubmission, dbDeleteSubmission, dbDeleteSubmissionsByIds, dbDeleteSubmissionsForStudentAndTests, dbDeleteBookSubmissionsForEveryone, dbClearStudentSubmissions, toUUID } from '../services/supabaseService';
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

  const syncFromSupabase = async () => {
    setIsSyncing(true);
    try {
      const dbSubsList = await dbGetSubmissions();
      if (dbSubsList && Array.isArray(dbSubsList)) {
        setSubmissions(dbSubsList);
        try {
          localStorage.setItem('eTestSubmissions', JSON.stringify(dbSubsList));
          localStorage.setItem('etest_submissions', JSON.stringify(dbSubsList));
        } catch {}
      }
    } catch (err) {
      console.warn('[Supabase] Submission sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncFromSupabase();

    // 1. Periodic background polling every 8 seconds
    const interval = setInterval(() => {
      syncFromSupabase();
    }, 8000);

    // 2. Refresh on window focus and tab visibility
    const handleFocus = () => {
      syncFromSupabase();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromSupabase();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. Supabase Realtime subscription on submissions table
    let channel = null;
    if (isSupabaseConfigured()) {
      try {
        channel = supabase
          .channel('public_submissions_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
            syncFromSupabase();
          })
          .subscribe();
      } catch (err) {
        console.warn('[Supabase] Realtime subscription error:', err);
      }
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
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
    let savedTarget = null;
    setSubmissions(prev => {
      let found = false;
      const nextSubs = prev.map(sub => {
        const isMatch = (
          String(sub.id) === String(id) ||
          String(sub.testId) === String(id) ||
          (sub.hwId && String(sub.hwId) === String(id)) ||
          (updatedData.studentId && String(sub.studentId) === String(updatedData.studentId) && (
            (updatedData.testId && String(sub.testId) === String(updatedData.testId)) ||
            (updatedData.hwId && String(sub.hwId) === String(updatedData.hwId))
          ))
        );

        if (isMatch) {
          found = true;
          const merged = { ...sub, ...updatedData };
          delete merged.contentPayload;
          delete merged.pdfPayload;
          delete merged.htmlPayload;
          delete merged.imageUrl;
          delete merged.imageUrls;
          if (merged.questionsList) {
            merged.questionsList = merged.questionsList.map(q => {
              const qCopy = { ...q };
              delete qCopy.contentPayload;
              delete qCopy.htmlPayload;
              delete qCopy.imageUrls;
              delete qCopy.imageUrl;
              return qCopy;
            });
          }
          savedTarget = merged;
          return merged;
        }
        return sub;
      });

      if (!found) {
        const newTarget = {
          id: id || `sub_${Date.now()}`,
          submittedAt: new Date().toISOString(),
          ...updatedData
        };
        delete newTarget.contentPayload;
        delete newTarget.pdfPayload;
        delete newTarget.htmlPayload;
        delete newTarget.imageUrl;
        delete newTarget.imageUrls;
        savedTarget = newTarget;
        nextSubs.push(newTarget);
      }

      if (savedTarget) {
        try {
          localStorage.setItem('eTestSubmissions', JSON.stringify(nextSubs));
          localStorage.setItem('etest_submissions', JSON.stringify(nextSubs));
        } catch (e) {}
      }
      return nextSubs;
    });

    if (savedTarget) {
      await dbSaveSubmission(savedTarget);
    }
  };

  const deleteSubmission = async (id) => {
    let subToDelete = null;
    setSubmissions(prev => {
      subToDelete = prev.find(s => s.id === id || s.supabaseId === id);
      return prev.filter(s => s.id !== id && s.supabaseId !== id);
    });
    if (id) await dbDeleteSubmission(id);
    if (subToDelete?.supabaseId && subToDelete.supabaseId !== id) {
      await dbDeleteSubmission(subToDelete.supabaseId);
    }
  };

  const clearSubmissionsForStudent = async (studentId) => {
    setSubmissions(prev => prev.filter(s => String(s.studentId) !== String(studentId)));
    await dbClearStudentSubmissions(studentId);
  };

  const deleteSubmissionsByTestId = async (testId) => {
    if (!testId) return;
    const toDelete = [];
    setSubmissions(prev => {
      const remaining = [];
      prev.forEach(s => {
        const matches = String(s.testId) === String(testId) ||
          String(s.hwId) === String(testId) ||
          String(s.homeworkId) === String(testId) ||
          String(s.id) === String(testId) ||
          String(s.id).includes(testId) ||
          String(s.testId).includes(testId);
        if (matches) {
          if (s.id) toDelete.push(s.id);
          if (s.supabaseId) toDelete.push(s.supabaseId);
        } else {
          remaining.push(s);
        }
      });
      return remaining;
    });
    for (const id of toDelete) {
      await dbDeleteSubmission(id);
    }
  };

  useEffect(() => {
    const handleHwDeleted = (e) => {
      if (e.detail?.id) {
        deleteSubmissionsByTestId(e.detail.id);
      }
    };
    window.addEventListener('homework_deleted', handleHwDeleted);
    return () => window.removeEventListener('homework_deleted', handleHwDeleted);
  }, []);

  const deleteStudentSubmissionsForBookOrHw = async (studentId, hwId, bookId, testIds = []) => {
    if (!studentId) return;
    const hasSpecificTests = testIds && Array.isArray(testIds) && testIds.length > 0;

    const testIdsSet = new Set((testIds || []).map(String));
    const testUuidsSet = new Set();
    (testIds || []).forEach(tid => {
      const u = toUUID(tid);
      if (u) testUuidsSet.add(String(u));
    });

    const hwIdsSet = new Set();
    if (hwId) {
      hwIdsSet.add(String(hwId));
      const hu = toUUID(hwId);
      if (hu) hwIdsSet.add(String(hu));
    }

    const toDeleteIds = [];

    setSubmissions(prev => {
      const remaining = [];
      prev.forEach(s => {
        if (String(s.studentId) !== String(studentId)) {
          remaining.push(s);
          return;
        }

        const candidateFields = [
          s.testId,
          s.realTestId,
          s.bookTestId,
          s.metadata?.realTestId,
          s.metadata?.bookTestId,
          s.metadata?.realId
        ];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) candidateFields.push(...s.bookTestIds);

        const isMatchingTest = candidateFields.some(f => {
          if (!f) return false;
          const fs = String(f);
          return testIdsSet.has(fs) || testUuidsSet.has(fs);
        });

        let shouldDelete = false;

        if (hasSpecificTests) {
          shouldDelete = isMatchingTest;
        } else {
          const isMatchingBook = bookId && (String(s.bookId) === String(bookId));
          const isMatchingHw = hwId && (
            hwIdsSet.has(String(s.hwId)) || 
            hwIdsSet.has(String(s.homeworkId)) || 
            hwIdsSet.has(String(s.testId))
          );
          shouldDelete = isMatchingBook || isMatchingHw || isMatchingTest;
        }

        if (shouldDelete) {
          if (s.id) toDeleteIds.push(s.id);
          if (s.supabaseId) toDeleteIds.push(s.supabaseId);
        } else {
          remaining.push(s);
        }
      });

      try {
        localStorage.setItem('eTestSubmissions', JSON.stringify(remaining));
        localStorage.setItem('etest_submissions', JSON.stringify(remaining));
      } catch {}

      return remaining;
    });

    // 1. Delete all collected submission IDs from Supabase
    if (toDeleteIds.length > 0) {
      await dbDeleteSubmissionsByIds(toDeleteIds);
    }
    // 2. Direct batch delete in Supabase by student + test/homework IDs
    await dbDeleteSubmissionsForStudentAndTests(studentId, testIds, hasSpecificTests ? null : hwId);

    try {
      (testIds || []).forEach(tId => {
        localStorage.removeItem(`draft_tracked_book_test_${tId}_${studentId}`);
        localStorage.removeItem(`draft_tracked_book_test_${tId}_${studentId}_time`);
        localStorage.removeItem(`draft_quiz_${tId}_ans`);
        localStorage.removeItem(`draft_quiz_${tId}_time`);
      });
      if (!hasSpecificTests && hwId) {
        localStorage.removeItem(`draft_tracked_book_test_${hwId}_${studentId}`);
        localStorage.removeItem(`draft_quiz_${hwId}_ans`);
      }
    } catch {}
  };

  const deleteBookSubmissionsForEveryone = async (bookId, hwId, testIds = []) => {
    const testIdsSet = new Set((testIds || []).map(String));
    if (hwId) testIdsSet.add(String(hwId));

    const testUuidsSet = new Set();
    (testIds || []).forEach(tid => {
      const u = toUUID(tid);
      if (u) testUuidsSet.add(String(u));
    });
    if (hwId) {
      const hu = toUUID(hwId);
      if (hu) testUuidsSet.add(String(hu));
    }

    const toDeleteIds = [];

    setSubmissions(prev => {
      const remaining = [];
      prev.forEach(s => {
        const isMatchingBook = bookId && (String(s.bookId) === String(bookId));
        const isMatchingHw = hwId && (
          String(s.hwId) === String(hwId) || 
          String(s.homeworkId) === String(hwId) || 
          String(s.testId) === String(hwId) ||
          testUuidsSet.has(String(s.hwId)) ||
          testUuidsSet.has(String(s.homeworkId)) ||
          testUuidsSet.has(String(s.testId))
        );

        const candidateFields = [
          s.testId,
          s.realTestId,
          s.bookTestId,
          s.metadata?.realTestId,
          s.metadata?.bookTestId,
          s.metadata?.realId
        ];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) candidateFields.push(...s.bookTestIds);

        const isMatchingTest = candidateFields.some(f => {
          if (!f) return false;
          const fs = String(f);
          return testIdsSet.has(fs) || testUuidsSet.has(fs);
        });

        if (isMatchingBook || isMatchingHw || isMatchingTest) {
          if (s.id) toDeleteIds.push(s.id);
          if (s.supabaseId) toDeleteIds.push(s.supabaseId);
        } else {
          remaining.push(s);
        }
      });

      try {
        localStorage.setItem('eTestSubmissions', JSON.stringify(remaining));
        localStorage.setItem('etest_submissions', JSON.stringify(remaining));
      } catch {}

      return remaining;
    });

    if (toDeleteIds.length > 0) {
      await dbDeleteSubmissionsByIds(toDeleteIds);
    }
    await dbDeleteBookSubmissionsForEveryone(testIds, hwId);
  };

  const deleteAllSubmissions = async () => {
    setSubmissions(prev => {
      prev.forEach(s => dbDeleteSubmission(s.id));
      try {
        localStorage.removeItem('eTestSubmissions');
        localStorage.removeItem('etest_submissions');
      } catch {}
      return [];
    });
  };

  return (
    <EvaluationContext.Provider value={{
      submissions,
      isSyncing,
      refreshSubmissions: syncFromSupabase,
      addSubmission,
      evaluateAnswer,
      finalizeSubmission,
      updateSubmission,
      deleteSubmission,
      clearSubmissionsForStudent,
      deleteSubmissionsByTestId,
      deleteStudentSubmissionsForBookOrHw,
      deleteBookSubmissionsForEveryone,
      deleteAllSubmissions
    }}>
      {children}
    </EvaluationContext.Provider>
  );
}