import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dbGetSubmissions, dbSaveSubmission, dbDeleteSubmission, dbDeleteSubmissionsByIds, dbDeleteSubmissionsForStudentAndTests, dbDeleteBookSubmissionsForEveryone, dbClearStudentSubmissions, toUUID } from '../services/supabaseService';
import { useAuth } from './AuthContext';
import { isCacheValid, touchCache } from '../utils/cacheManager';
import { purgeTestCache } from '../services/unifiedResultAdapter';
import { compareOpenEndedAnswers } from '../utils/answerEvaluation';

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
      if (Array.isArray(parsed)) {
        // 🛡️ Sadece gerçek silinmiş submission oturum ID'leri tutulur; test ID'leri (tbt_..., bt_..., q_...) ASLA deleted listesinde kalamaz!
        const cleanList = parsed.filter(id => {
          const s = String(id || '');
          return (s.startsWith('sub_') || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s)) && !s.startsWith('tbt_') && !s.startsWith('bt_') && !s.startsWith('q_');
        });
        return new Set(cleanList);
      }
    }
  } catch {}
  return new Set();
};

const markIdsAsDeleted = (ids) => {
  try {
    const current = getDeletedIds();
    (ids || []).forEach(id => {
      const s = String(id || '');
      // Sadece tekil oturum ID'lerini kaydet, test ID'lerini kaydetme
      if (s && (s.startsWith('sub_') || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s)) && !s.startsWith('tbt_') && !s.startsWith('bt_') && !s.startsWith('q_')) {
        current.add(s);
      }
    });
    const arr = Array.from(current).slice(-500);
    localStorage.setItem('eTestDeletedSubmissions', JSON.stringify(arr));
  } catch {}
};

const unmarkIdAsDeleted = (id) => {
  if (!id) return;
  try {
    const current = getDeletedIds();
    let changed = false;
    const str = String(id);
    if (current.has(str)) {
      current.delete(str);
      changed = true;
    }
    const u = toUUID(str);
    if (u && current.has(String(u))) {
      current.delete(String(u));
      changed = true;
    }
    if (changed) {
      localStorage.setItem('eTestDeletedSubmissions', JSON.stringify(Array.from(current)));
    }
  } catch {}
};

const deduplicateSubmissions = (list) => {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  const seenIdentities = new Set();

  list.forEach(sub => {
    if (!sub) return;
    const sStudentId = String(sub.studentId || sub.student_id || sub.userId || sub.user_id || '').trim();
    const sTestId = String(sub.testId || sub.realTestId || sub.bookTestId || sub.test_id || sub.title || '').trim();
    const sTitle = String(sub.title || sub.testTitle || sub.test_title || '').trim().toLowerCase();
    
    const id1 = String(sub.id || '').trim();
    const id2 = String(sub.supabaseId || '').trim();
    const meta = (sub.answers && Array.isArray(sub.answers)) ? sub.answers.find(a => a.type === 'metadata') : (sub.metadata || {});
    const id3 = String(meta?.realId || meta?.submissionId || sub.originalSubmissionId || '').trim();

    const cleanTId = sTestId.replace(/^bt_/, '').replace(/^q_/, '').toLowerCase();
    const corr = sub.correctCount ?? sub.correct ?? 0;
    const wrg = sub.wrongCount ?? sub.wrong ?? 0;
    const dateStr = sub.submittedAt || sub.date || sub.createdAt || '';
    const dateYMD = String(dateStr).slice(0, 10);

    const logicalKey = `${sStudentId}___${cleanTId || sTitle}___${corr}_${wrg}_${dateYMD}`;

    // Check if seen by any ID or by logical match
    const isIdDuplicate = (id1 && seenIdentities.has(id1)) || (id2 && seenIdentities.has(id2)) || (id3 && seenIdentities.has(id3));
    const isLogicalDuplicate = seenIdentities.has(logicalKey);

    if (isIdDuplicate || isLogicalDuplicate) {
      return; // Skip duplicate!
    }

    if (id1) seenIdentities.add(id1);
    if (id2) seenIdentities.add(id2);
    if (id3) seenIdentities.add(id3);
    seenIdentities.add(logicalKey);

    const primaryKey = id1 || id2 || logicalKey || `sub_${map.size}`;
    map.set(primaryKey, sub);
  });

  return Array.from(map.values());
};

export function EvaluationProvider({ children }) {
  const [submissions, setSubmissions] = useState(() => {
    const deletedIds = getDeletedIds();
    const saved = localStorage.getItem('eTestSubmissions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed)
          ? deduplicateSubmissions(parsed.filter(s => s && !String(s.id).startsWith('sub_sample') && !deletedIds.has(String(s.id)) && !deletedIds.has(String(s.supabaseId))))
          : [];
      } catch (e) {}
    }
    return [];
  });

  const [isSyncing, setIsSyncing] = useState(true);

  const syncFromSupabase = async (showLoading = false, force = true) => {
    if (showLoading) setIsSyncing(true);

    try {
      const dbSubsList = await dbGetSubmissions();
      if (dbSubsList && Array.isArray(dbSubsList)) {
        touchCache('submissions');

        // 🛡️ Supabase veritabanı tek ve mutlak gerçeklik kaynağıdır.
        // Veritabanında olan bir kayıt, tabletteki eski yerel silinmişler listesi tarafından engellenemez!
        const validDbSubs = dbSubsList;
        validDbSubs.forEach(s => {
          if (s?.id) unmarkIdAsDeleted(s.id);
          if (s?.supabaseId) unmarkIdAsDeleted(s.supabaseId);
        });

        const updatedSubs = validDbSubs;

        setSubmissions(prev => {
          const currentDeletedIds = getDeletedIds();
          const dbIds = new Set();
          (updatedSubs || []).forEach(s => {
            if (s?.id) dbIds.add(String(s.id));
            if (s?.supabaseId) dbIds.add(String(s.supabaseId));
          });

          // Detect any completed submissions that existed locally on tablet but are now deleted from Supabase (by PC)
          const prevCompletedMissingFromDb = (prev || []).filter(s => {
            const sid = String(s?.id || '');
            const suid = String(s?.supabaseId || '');
            const isCompleted = s.status !== 'in_progress' && s.status !== 'draft';
            return isCompleted && !dbIds.has(sid) && (!suid || !dbIds.has(suid));
          });

          // Purge local cache for all tests that were deleted on another device (PC)
          prevCompletedMissingFromDb.forEach(s => {
            purgeTestCache(s.testId, s.studentId);
            purgeTestCache(s.bookTestId, s.studentId);
            purgeTestCache(s.id, s.studentId);
          });

          // Only keep purely unsubmitted local drafts that are in progress
          const localDraftsOnly = (prev || []).filter(localSub => {
            const isDraft = localSub.status === 'in_progress' || localSub.status === 'draft';
            const lId = String(localSub?.id || '');
            const lSuId = String(localSub?.supabaseId || '');
            if (!isDraft || (!lId && !lSuId)) return false;
            if (currentDeletedIds.has(lId) || (lSuId && currentDeletedIds.has(lSuId))) return false;
            if (dbIds.has(lId) || (lSuId && dbIds.has(lSuId))) return false;
            return true;
          });

          const mergedList = deduplicateSubmissions([...updatedSubs, ...localDraftsOnly]);
          try {
            localStorage.setItem('eTestSubmissions', JSON.stringify(mergedList));
            localStorage.setItem('etest_submissions', JSON.stringify(mergedList));
          } catch {}
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('etest-submissions-updated', { detail: { count: mergedList.length } }));
          }
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
    if (isSupabaseConfigured()) {
      syncFromSupabase(true, true);
    } else {
      setIsSyncing(false);
    }
  }, []);

  // Supabase Realtime synchronization across all devices (PC -> Tablet / Phone)
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    let debounceTimer = null;
    const debouncedSync = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => syncFromSupabase(false, true), 2000);
    };

    const subChannel = supabase
      .channel('realtime_submissions_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const delRow = payload.old;
          const delId = String(delRow?.id || delRow?.supabaseId || '');
          if (delId) {
            markIdsAsDeleted([delId]);
            purgeTestCache(delId);
            setSubmissions(prev => {
              const next = prev.filter(s => String(s.id) !== delId && String(s.supabaseId) !== delId);
              try {
                localStorage.setItem('eTestSubmissions', JSON.stringify(next));
                localStorage.setItem('etest_submissions', JSON.stringify(next));
              } catch (e) {}
              return next;
            });
          }
        } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          // 2 saniye biriktir, tek seferde çek
          debouncedSync();
        }
      })
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      try {
        supabase.removeChannel(subChannel);
      } catch {}
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
        const changedFromU1 = prev.filter(s => s.studentId === 'u1');
        changedFromU1.forEach(s => {
          dbSaveSubmission({ ...s, studentId: user.id }).catch(() => {});
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
      if (newSub.testId) unmarkIdAsDeleted(newSub.testId);
      if (newSub.realTestId) unmarkIdAsDeleted(newSub.realTestId);
      if (newSub.bookTestId) unmarkIdAsDeleted(newSub.bookTestId);
      const nextSubs = [...prev, newSub];
      try {
        localStorage.setItem('etest_submissions', JSON.stringify(nextSubs));
        localStorage.setItem('eTestSubmissions', JSON.stringify(nextSubs));
      } catch (e) {}
      return nextSubs;
    });
    await dbSaveSubmission(newSub);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('etest-submissions-updated', { detail: { newSubId: newSub.id } }));
    }
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
    if (target?.testId) idsToDelete.push(String(target.testId));
    if (target?.bookTestId) idsToDelete.push(String(target.bookTestId));

    markIdsAsDeleted(idsToDelete);
    idsToDelete.forEach(tid => purgeTestCache(tid, target?.studentId));

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
      toDelete.forEach(tid => purgeTestCache(tid));
    }
    purgeTestCache(tStr);
    if (tU) purgeTestCache(tU);

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

  /* 
  useEffect(() => {
    const handleHwDeleted = (e) => {
      if (e.detail?.id) {
        // deleteSubmissionsByTestId(e.detail.id); // Disabled to prevent wiping out book progress when homeworks are deleted
      }
    };
    window.addEventListener('homework_deleted', handleHwDeleted);
    return () => window.removeEventListener('homework_deleted', handleHwDeleted);
  }, []);
  */

  const deleteStudentSubmissionsForBookOrHw = async (studentId, hwId, bookId, testIds = []) => {
    if (!studentId) return;
    const hasSpecificTests = testIds && Array.isArray(testIds) && testIds.length > 0;

    const testIdsSet = new Set((testIds || []).map(String));
    const testUuidsSet = new Set();
    (testIds || []).forEach(tid => {
      const s = String(tid);
      testIdsSet.add(s);
      testIdsSet.add(s.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, ''));
      const u = toUUID(tid);
      if (u) {
        testUuidsSet.add(String(u));
        testIdsSet.add(String(u));
      }
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
        s.id,
        s.supabaseId,
        s.metadata?.realTestId,
        s.metadata?.bookTestId,
        s.metadata?.realId
      ];
      if (s.bookTestIds && Array.isArray(s.bookTestIds)) candidateFields.push(...s.bookTestIds);

      const isMatchingTest = candidateFields.some(f => {
        if (!f) return false;
        const fs = String(f);
        const clean = fs.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
        const fu = toUUID(f);
        return testIdsSet.has(fs) || testIdsSet.has(clean) || testUuidsSet.has(fs) || (fu && testUuidsSet.has(String(fu))) || (fu && testIdsSet.has(String(fu)));
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

    if (toDeleteIds.length > 0) {
      markIdsAsDeleted(toDeleteIds);
    }

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

  const toLetter = (val) => {
    if (val === null || val === undefined || val === '' || val === 'empty') return '';
    if (typeof val === 'number') return String.fromCharCode(65 + val);
    const str = String(val).trim().toUpperCase();
    if (/^[A-E]$/.test(str)) return str;
    const num = Number(str);
    if (!isNaN(num) && num >= 0 && num <= 4) return String.fromCharCode(65 + num);
    return str;
  };

  const reEvaluateSubmissionsForTest = async (testId, newAnswerKey, penaltyRatio = 3, questionCount = 20, isOpenEnded = false) => {
    if (!testId || !newAnswerKey) return;
    const tIdStr = String(testId);
    const tClean = tIdStr.replace(/^(tbt_|bt_|q_)/, '');
    const tUuid = toUUID(tIdStr);

    let updatedList = [];

    setSubmissions(prev => {
      let changed = false;
      const nextSubs = prev.map(sub => {
        if (!sub) return sub;
        const matchFields = [
          String(sub.testId || ''),
          String(sub.realTestId || ''),
          String(sub.bookTestId || ''),
          String(sub.metadata?.realTestId || ''),
          String(sub.metadata?.bookTestId || ''),
          String(sub.metadata?.testId || '')
        ];
        if (sub.bookTestIds && Array.isArray(sub.bookTestIds)) {
          matchFields.push(...sub.bookTestIds.map(String));
        }

        const isMatch = matchFields.some(f => f && (f === tIdStr || f === tClean || (tUuid && f === tUuid) || toUUID(f) === tIdStr || (tUuid && toUUID(f) === tUuid)));
        if (!isMatch) return sub;

        changed = true;

        // Extract student's answers
        const userAnsMap = {};
        if (Array.isArray(sub.answers) && sub.answers.length > 0) {
          sub.answers.forEach((a, idx) => {
            const qNo = a.questionNo || (idx + 1);
            userAnsMap[qNo] = a.userAnswerText ?? a.userAnswerLetter ?? a.answerLetter ?? a.userAnswer ?? a.selectedOption ?? '';
          });
        }
        if (sub.studentAnswers && typeof sub.studentAnswers === 'object') {
          Object.assign(userAnsMap, sub.studentAnswers);
        }
        if (sub.studentAnswersMap && typeof sub.studentAnswersMap === 'object') {
          Object.assign(userAnsMap, sub.studentAnswersMap);
        }

        const qCount = Number(questionCount) || Number(sub.totalQuestions) || Number(sub.total_questions) || Object.keys(newAnswerKey || {}).filter(k => k !== '__meta').length || 20;

        let correct = 0;
        let wrong = 0;
        let blank = 0;
        let pending = 0;
        const newAnswersArray = [];

        for (let i = 1; i <= qCount; i++) {
          const rawUserAns = userAnsMap[i] ?? userAnsMap[String(i)] ?? '';
          const rawCorrectKey = Array.isArray(newAnswerKey)
            ? (newAnswerKey[i - 1] ?? newAnswerKey[i] ?? '')
            : (newAnswerKey[i] ?? newAnswerKey[String(i)] ?? newAnswerKey[i - 1] ?? '');

          let isCorrect = false;
          let isWrong = false;
          let isPending = false;

          if (!rawUserAns && rawUserAns !== 0) {
            blank++;
          } else if (isOpenEnded || sub.isOpenEnded || sub.questionType === 'acik_uclu') {
            if (rawCorrectKey !== '' && rawCorrectKey !== null && rawCorrectKey !== undefined) {
              const isMatch = compareOpenEndedAnswers(rawUserAns, rawCorrectKey);
              if (isMatch === true) {
                correct++;
                isCorrect = true;
              } else if (isMatch === false) {
                wrong++;
                isWrong = true;
              } else {
                pending++;
                isPending = true;
              }
            } else {
              pending++;
              isPending = true;
            }
          } else {
            const userLetter = toLetter(rawUserAns);
            const correctLetter = toLetter(rawCorrectKey);
            if (!userLetter) {
              blank++;
            } else if (correctLetter && userLetter === correctLetter) {
              correct++;
              isCorrect = true;
            } else if (correctLetter) {
              wrong++;
              isWrong = true;
            } else {
              correct++;
              isCorrect = true;
            }
          }

          newAnswersArray.push({
            questionNo: i,
            userAnswer: isOpenEnded ? String(rawUserAns || '') : toLetter(rawUserAns),
            userAnswerLetter: !isOpenEnded ? toLetter(rawUserAns) : undefined,
            userAnswerText: isOpenEnded ? String(rawUserAns || '') : undefined,
            correctAnswer: isOpenEnded ? String(rawCorrectKey || '') : toLetter(rawCorrectKey),
            correctAnswerLetter: !isOpenEnded ? toLetter(rawCorrectKey) : undefined,
            isCorrect,
            isWrong,
            isBlank: !rawUserAns && rawUserAns !== 0,
            isPending,
            earnedPoints: isCorrect ? (100 / qCount) : 0
          });
        }

        const pRatio = Number(penaltyRatio) >= 0 ? Number(penaltyRatio) : 3;
        const rawNet = correct - (pRatio > 0 ? wrong / pRatio : 0);
        const net = Math.max(0, Number(rawNet.toFixed(2)));
        const scorePct = qCount > 0 ? Math.round((correct / qCount) * 100) : 0;

        const updated = {
          ...sub,
          answerKey: newAnswerKey,
          answers: newAnswersArray,
          studentAnswers: userAnsMap,
          studentAnswersMap: userAnsMap,
          correctCount: correct,
          correct_count: correct,
          wrongCount: wrong,
          wrong_count: wrong,
          blankCount: blank,
          emptyCount: blank,
          blank_count: blank,
          net: net,
          score: scorePct,
          scorePct: scorePct,
          totalQuestions: qCount,
          total_questions: qCount
        };

        updatedList.push(updated);
        return updated;
      });

      if (changed) {
        try {
          localStorage.setItem('eTestSubmissions', JSON.stringify(nextSubs));
          localStorage.setItem('etest_submissions', JSON.stringify(nextSubs));
        } catch (e) {}
      }
      return nextSubs;
    });

    for (const sub of updatedList) {
      await dbSaveSubmission(sub);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('submissions-updated', { detail: { testId, reEvaluated: true } }));
    }
  };

  // Auto-listen to answerKey updates across the entire app
  useEffect(() => {
    const handleTrackedTestsUpdated = (e) => {
      const detail = e?.detail;
      if (detail?.test?.id && detail?.test?.answerKey) {
        reEvaluateSubmissionsForTest(detail.test.id, detail.test.answerKey, detail.test.penaltyRatio, detail.test.questionCount, detail.test.isOpenEnded);
      } else if (Array.isArray(detail?.tests)) {
        detail.tests.forEach(t => {
          if (t?.id && t?.answerKey) {
            reEvaluateSubmissionsForTest(t.id, t.answerKey, t.penaltyRatio, t.questionCount, t.isOpenEnded);
          }
        });
      }
    };

    window.addEventListener('tracked-book-tests-updated', handleTrackedTestsUpdated);
    return () => window.removeEventListener('tracked-book-tests-updated', handleTrackedTestsUpdated);
  }, []);

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

  const value = useMemo(() => ({
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
    deleteAllSubmissions,
    reEvaluateSubmissionsForTest
  }), [submissions, isSyncing]);

  return (
    <EvaluationContext.Provider value={value}>
      {children}
    </EvaluationContext.Provider>
  );
}