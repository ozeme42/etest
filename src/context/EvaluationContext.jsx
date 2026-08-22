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

const DEFAULT_SAMPLE_SUBMISSIONS = [];

const getDeletedIds = () => {
  try {
    const saved = localStorage.getItem('eTestDeletedSubmissions');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
};

const markIdsAsDeleted = (ids) => {
  try {
    const current = getDeletedIds();
    (ids || []).forEach(id => {
      if (id) current.add(String(id));
    });
    const arr = Array.from(current).slice(-500);
    localStorage.setItem('eTestDeletedSubmissions', JSON.stringify(arr));
  } catch {}
};

const unmarkIdAsDeleted = (id) => {
  if (!id) return;
  try {
    const current = getDeletedIds();
    if (current.has(String(id))) {
      current.delete(String(id));
      localStorage.setItem('eTestDeletedSubmissions', JSON.stringify(Array.from(current)));
    }
  } catch {}
};

export function EvaluationProvider({ children }) {
  const [submissions, setSubmissions] = useState(() => {
    const deletedIds = getDeletedIds();
    const saved = localStorage.getItem('eTestSubmissions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed)
          ? parsed.filter(s => s && !String(s.id).startsWith('sub_sample') && !deletedIds.has(String(s.id)) && !deletedIds.has(String(s.supabaseId)))
          : [];
      } catch (e) {}
    }
    return [];
  });

  const [isSyncing, setIsSyncing] = useState(true);

  const syncFromSupabase = async (showLoading = false) => {
    if (showLoading) setIsSyncing(true);
    try {
      const dbSubsList = await dbGetSubmissions();
      if (dbSubsList && Array.isArray(dbSubsList)) {
        const deletedIds = getDeletedIds();

        // Filter out deleted items from DB list immediately
        const validDbSubs = dbSubsList.filter(s => {
          const sid = String(s?.id || '');
          const suid = String(s?.supabaseId || '');
          if (deletedIds.has(sid) || (suid && deletedIds.has(suid))) return false;
          return true;
        });

        // Auto-sync any local mistake reasons into submissions and Supabase
        const updatedSubs = validDbSubs.map(sub => {
          const testId = String(sub.testId || sub.realTestId || sub.bookTestId || '');
          const cleanTId = testId.replace(/^bt_/, '').replace(/^q_/, '');
          let subMistakeReasons = (sub.mistakeReasons && typeof sub.mistakeReasons === 'object') ? { ...sub.mistakeReasons } : {};
          let changed = false;

          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('mistake_reasons_') || k.startsWith('mistake_reason_'))) {
                if (k.includes(testId) || (cleanTId && k.includes(cleanTId))) {
                  const parsed = JSON.parse(localStorage.getItem(k));
                  if (parsed && typeof parsed === 'object') {
                    Object.entries(parsed).forEach(([qNo, r]) => {
                      if (r && subMistakeReasons[qNo] !== r) {
                        subMistakeReasons[qNo] = r;
                        changed = true;
                      }
                    });
                  }
                }
              }
            }
          } catch {}

          if (changed && Object.keys(subMistakeReasons).length > 0) {
            const updated = { ...sub, mistakeReasons: subMistakeReasons };
            dbSaveSubmission(updated);
            return updated;
          }
          return sub;
        });

        setSubmissions(prev => {
          const dbIds = new Set();
          (updatedSubs || []).forEach(s => {
            if (s?.id) dbIds.add(String(s.id));
            if (s?.supabaseId) dbIds.add(String(s.supabaseId));
          });

          // Keep ALL local items that are not in DB yet and not deleted
          const localOnly = (prev || []).filter(localSub => {
            const lId = String(localSub?.id || '');
            const lSuId = String(localSub?.supabaseId || '');
            if (!lId && !lSuId) return false;
            if (deletedIds.has(lId) || (lSuId && deletedIds.has(lSuId))) return false;
            if (dbIds.has(lId) || (lSuId && dbIds.has(lSuId))) return false;
            return true; // Preserve all local submissions!
          });

          // Also check localStorage backups for any submissions saved across tabs or sessions
          let lsSubs = [];
          try {
            const l1 = JSON.parse(localStorage.getItem('eTestSubmissions') || '[]');
            const l2 = JSON.parse(localStorage.getItem('etest_submissions') || '[]');
            lsSubs = [...(Array.isArray(l1) ? l1 : []), ...(Array.isArray(l2) ? l2 : [])];
          } catch {}

          const lsOnly = lsSubs.filter(lsSub => {
            const lId = String(lsSub?.id || '');
            const lSuId = String(lsSub?.supabaseId || '');
            if (!lId && !lSuId) return false;
            if (deletedIds.has(lId) || (lSuId && deletedIds.has(lSuId))) return false;
            if (dbIds.has(lId) || (lSuId && dbIds.has(lSuId))) return false;
            if (localOnly.some(lo => (lo.id && lo.id === lsSub.id) || (lo.supabaseId && lo.supabaseId === lsSub.supabaseId))) return false;
            return true;
          });

          const mergedList = [...updatedSubs, ...localOnly, ...lsOnly];
          try {
            localStorage.setItem('eTestSubmissions', JSON.stringify(mergedList));
            localStorage.setItem('etest_submissions', JSON.stringify(mergedList));
          } catch {}
          return mergedList;
        });
      }
    } catch (err) {
      console.warn('[Supabase] Submission sync error:', err);
    } finally {
      if (showLoading) setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncFromSupabase(true);

    // 1. Periodic background polling silently
    const interval = setInterval(() => {
      syncFromSupabase(false);
    }, 30000);

    // 2. Refresh on window focus and tab visibility silently
    const handleFocus = () => {
      syncFromSupabase(false);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromSupabase(false);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. Supabase Realtime subscription on submissions table silently
    let channel = null;
    if (isSupabaseConfigured()) {
      try {
        channel = supabase
          .channel('public_submissions_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
            syncFromSupabase(false);
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

  const { currentUser } = useAuth();
  const user = currentUser;

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

    // Calculate scorePercentage if not explicitly provided
    if (newSub.scorePercentage === undefined || newSub.scorePercentage === null) {
      const correct = newSub.correctCount ?? newSub.correct;
      const wrong = newSub.wrongCount ?? newSub.wrong ?? 0;
      const blank = newSub.blankCount ?? newSub.blank ?? 0;
      const ansCount = Array.isArray(newSub.answers) ? newSub.answers.length : 0;
      const total = newSub.totalQuestions || ((correct !== undefined ? correct : 0) + wrong + blank) || ansCount;
      if (total > 0 && correct !== undefined && correct !== null) {
        newSub.scorePercentage = Math.min(100, Math.max(0, Math.round((correct / total) * 100)));
      } else if (newSub.score !== undefined && newSub.score !== null) {
        const s = +newSub.score;
        if (total > 0 && s <= total) {
          newSub.scorePercentage = Math.min(100, Math.max(0, Math.round((s / total) * 100)));
        } else {
          newSub.scorePercentage = Math.min(100, Math.max(0, Math.round(s)));
        }
      }
    }

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
      unmarkIdAsDeleted(newSub.id);
      const nextSubs = [...prev, newSub];
      try {
        localStorage.setItem('etest_submissions', JSON.stringify(nextSubs));
        localStorage.setItem('eTestSubmissions', JSON.stringify(nextSubs));
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
    unmarkIdAsDeleted(id);
    if (updatedData?.id) unmarkIdAsDeleted(updatedData.id);

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
    if (!id) return;
    const target = submissions.find(s => String(s.id) === String(id) || String(s.supabaseId) === String(id));
    const idsToDelete = [String(id)];
    if (target?.id) idsToDelete.push(String(target.id));
    if (target?.supabaseId) idsToDelete.push(String(target.supabaseId));

    markIdsAsDeleted(idsToDelete);

    setSubmissions(prev => {
      const remaining = prev.filter(s => !idsToDelete.includes(String(s.id)) && !idsToDelete.includes(String(s.supabaseId)));
      try {
        localStorage.setItem('eTestSubmissions', JSON.stringify(remaining));
        localStorage.setItem('etest_submissions', JSON.stringify(remaining));
      } catch (e) {}
      return remaining;
    });

    await dbDeleteSubmissionsByIds(idsToDelete);
    for (const sid of idsToDelete) {
      await dbDeleteSubmission(sid);
    }
  };

  const clearSubmissionsForStudent = async (studentId) => {
    setSubmissions(prev => prev.filter(s => String(s.studentId) !== String(studentId)));
    await dbClearStudentSubmissions(studentId);
  };

  const deleteSubmissionsByTestId = async (testId) => {
    if (!testId) return;
    const toDelete = [];
    const tStr = String(testId);
    const tU = toUUID(tStr);

    submissions.forEach(s => {
      const raw = s.raw_data || {};
      const matches = String(s.testId) === tStr ||
        String(s.hwId) === tStr ||
        String(s.homeworkId) === tStr ||
        String(s.id) === tStr ||
        String(raw.hwId) === tStr ||
        String(raw.homeworkId) === tStr ||
        String(raw.testId) === tStr ||
        String(s.id || '').startsWith(`hw_sub_${tStr}_`) ||
        String(s.id || '').startsWith(`hw_${tStr}_`) ||
        (tU && String(s.testId) === tU) ||
        (tU && String(s.hwId) === tU) ||
        (tU && String(s.homeworkId) === tU);
      if (matches) {
        if (s.id) toDelete.push(String(s.id));
        if (s.supabaseId) toDelete.push(String(s.supabaseId));
      }
    });

    if (toDelete.length > 0) {
      markIdsAsDeleted(toDelete);
    }

    setSubmissions(prev => {
      const remaining = prev.filter(s => {
        const sid = String(s.id);
        const suid = String(s.supabaseId || '');
        const raw = s.raw_data || {};
        const isTarget = toDelete.includes(sid) ||
          toDelete.includes(suid) ||
          String(s.testId) === tStr ||
          String(s.hwId) === tStr ||
          String(s.homeworkId) === tStr ||
          String(raw.hwId) === tStr ||
          String(raw.homeworkId) === tStr ||
          String(s.id || '').startsWith(`hw_sub_${tStr}_`) ||
          String(s.id || '').startsWith(`hw_${tStr}_`);
        return !isTarget;
      });
      try {
        localStorage.setItem('eTestSubmissions', JSON.stringify(remaining));
        localStorage.setItem('etest_submissions', JSON.stringify(remaining));
      } catch (e) {}
      return remaining;
    });

    try {
      await dbDeleteBookSubmissionsForEveryone([], tStr);
      if (tU) await dbDeleteBookSubmissionsForEveryone([], tU);
      if (toDelete.length > 0) {
        await dbDeleteSubmissionsByIds(toDelete);
        for (const id of toDelete) {
          await dbDeleteSubmission(id);
        }
      }
    } catch (e) {}
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

    const stIdStr = String(studentId);
    const stUuid = toUUID(stIdStr);

    const toDeleteIds = [];

    // Collect ALL matching submission IDs synchronously from current state
    submissions.forEach(s => {
      const isMatchStudent = String(s.studentId) === stIdStr || 
        (stUuid && String(s.studentId) === String(stUuid)) || 
        (stUuid && toUUID(s.studentId) === String(stUuid)) ||
        String(s.studentId) === 'u1' || stIdStr === 'u1';

      if (!isMatchStudent) return;

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
        const fu = toUUID(f);
        return testIdsSet.has(fs) || testUuidsSet.has(fs) || (fu && testUuidsSet.has(fu)) || (fu && testIdsSet.has(fu));
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
        if (s.id) toDeleteIds.push(String(s.id));
        if (s.supabaseId) toDeleteIds.push(String(s.supabaseId));
      }
    });

    setSubmissions(prev => {
      const remaining = prev.filter(s => !toDeleteIds.includes(String(s.id)) && !toDeleteIds.includes(String(s.supabaseId)));
      try {
        localStorage.setItem('eTestSubmissions', JSON.stringify(remaining));
        localStorage.setItem('etest_submissions', JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    // 1. Delete all collected submission IDs from Supabase
    if (toDeleteIds.length > 0) {
      await dbDeleteSubmissionsByIds(toDeleteIds);
      for (const delId of toDeleteIds) {
        await dbDeleteSubmission(delId);
      }
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

    submissions.forEach(s => {
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
        if (s.id) toDeleteIds.push(String(s.id));
        if (s.supabaseId) toDeleteIds.push(String(s.supabaseId));
      }
    });

    setSubmissions(prev => {
      const remaining = prev.filter(s => !toDeleteIds.includes(String(s.id)) && !toDeleteIds.includes(String(s.supabaseId)));
      try {
        localStorage.setItem('eTestSubmissions', JSON.stringify(remaining));
        localStorage.setItem('etest_submissions', JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    if (toDeleteIds.length > 0) {
      await dbDeleteSubmissionsByIds(toDeleteIds);
      for (const delId of toDeleteIds) {
        await dbDeleteSubmission(delId);
      }
    }
    await dbDeleteBookSubmissionsForEveryone(testIds, hwId);
  };

  const approveSubmission = async (id, approverUser = null) => {
    if (!id) return;
    const updatePayload = {
      approvalStatus: 'approved',
      isApproved: true,
      status: 'completed',
      approvedBy: approverUser?.id || null,
      approvedByName: approverUser?.name || null,
      approvedAt: new Date().toISOString()
    };
    await updateSubmission(id, updatePayload);
    window.dispatchEvent(new CustomEvent('submission_approved', { detail: { id, ...updatePayload } }));
    window.dispatchEvent(new CustomEvent('submission_updated', { detail: { id, ...updatePayload } }));
  };

  const rejectSubmission = async (id, reason = '', rejecterUser = null) => {
    if (!id) return;
    const updatePayload = {
      approvalStatus: 'rejected',
      isApproved: false,
      status: 'rejected',
      rejectedReason: reason,
      rejectedBy: rejecterUser?.id || null,
      rejectedByName: rejecterUser?.name || null,
      rejectedAt: new Date().toISOString()
    };
    await updateSubmission(id, updatePayload);
    window.dispatchEvent(new CustomEvent('submission_rejected', { detail: { id, ...updatePayload } }));
    window.dispatchEvent(new CustomEvent('submission_updated', { detail: { id, ...updatePayload } }));
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
      approveSubmission,
      rejectSubmission,
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