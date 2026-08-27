import { isSupabaseConfigured } from '../lib/supabase';
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { dbGetHomeworks, dbAddHomework, dbDeleteHomework, dbClearHomeworkSubmissionsForStudent, dbDeleteBookSubmissionsForEveryone, dbDeleteSubmissionsByIds, toUUID } from '../services/supabaseService';
import { useAuth } from './AuthContext';
import { idbSetPayload, idbGetPayload, idbDeletePayload } from '../services/indexedDbService';
import { isCacheValid, touchCache, invalidateCache } from '../utils/cacheManager';

const HomeworkContext = createContext();

export function useHomework() {
  return useContext(HomeworkContext);
}

export function HomeworkProvider({ children }) {
  const [homeworks, setHomeworks] = useState(() => {
    try {
      const saved = localStorage.getItem('eTestHomeworks');
      const parsed = saved ? JSON.parse(saved) : [];
      return (parsed || []).filter(h => h.id !== 'global_ai_config' && h.subject !== 'SYSTEM' && !String(h.title || '').includes('GLOBAL_AI_CONFIG'));
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshHomeworks = async (force = false) => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return null;
    }
    
    // Check 30-second persistent cache (metadata is lightweight ~5KB, so 30s gives fresh updates with zero lag)
    if (!force && isCacheValid('homeworks', 0.5) && homeworks.length > 0) {
      setIsLoading(false);
      return homeworks;
    }

    setIsLoading(true);
    try {
      const dbHws = await dbGetHomeworks();
      if (dbHws && Array.isArray(dbHws)) {
        touchCache('homeworks');
        const cleanDbHws = dbHws.filter(h => h.id !== 'global_ai_config' && h.subject !== 'SYSTEM' && !String(h.title || '').includes('GLOBAL_AI_CONFIG'));
        
        setHomeworks(cleanDbHws);
        try {
          localStorage.setItem('eTestHomeworks', JSON.stringify(cleanDbHws));
        } catch {}
        return cleanDbHws;
      }
      return dbHws;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshHomeworks();
  }, []);

  // Restore payloads from IndexedDB if stored as placeholder
  useEffect(() => {
    async function restoreLocalPayloads() {
      const current = homeworks || [];
      const hasPlaceholders = current.some(h => 
        h.contentPayload === '[STORED_IN_INDEXEDDB]' ||
        h.pdfPayload === '[STORED_IN_INDEXEDDB]' ||
        h.imageUrl === '[STORED_IN_INDEXEDDB]' ||
        (Array.isArray(h.sections) && h.sections.some(s => s.contentPayload === '[STORED_IN_INDEXEDDB]' || s.pdfPayload === '[STORED_IN_INDEXEDDB]'))
      );
      if (!hasPlaceholders) return;

      const restored = await Promise.all(current.map(async (hw) => {
        let p = hw.contentPayload;
        let pdf = hw.pdfPayload;
        let img = hw.imageUrl;
        let secArr = hw.sections;

        if (!p || p === '[STORED_IN_INDEXEDDB]' || p === '[LOCALSTORAGE_CACHE]') {
          const val = await idbGetPayload(hw.id) || (hw.questionIds?.[0] ? await idbGetPayload(hw.questionIds[0]) : null);
          if (val && !val.includes('[STORED_IN_INDEXEDDB]')) {
            p = val;
            if (val.startsWith('data:image/') || val.startsWith('http')) img = val;
            if (val.startsWith('data:application/pdf') || val.startsWith('%PDF-')) pdf = val;
          }
        }

        if (Array.isArray(secArr)) {
          secArr = await Promise.all(secArr.map(async (sec) => {
            if (sec.contentPayload === '[STORED_IN_INDEXEDDB]' || !sec.contentPayload) {
              const sval = await idbGetPayload(sec.id) || (sec.questionId ? await idbGetPayload(sec.questionId) : null);
              if (sval && !sval.includes('[STORED_IN_INDEXEDDB]')) {
                return { ...sec, contentPayload: sval };
              }
            }
            return sec;
          }));
        }

        return {
          ...hw,
          contentPayload: p || hw.contentPayload,
          pdfPayload: pdf || hw.pdfPayload,
          imageUrl: img || hw.imageUrl,
          sections: secArr || hw.sections
        };
      }));

      setHomeworks(restored);
    }

    restoreLocalPayloads();
  }, []);

  useEffect(() => {
    const stripHeavy = (val) => {
      if (typeof val === 'string' && val.length > 500 && !val.startsWith('http')) return '[STORED_IN_INDEXEDDB]';
      return val;
    };

    try {
      const sanitized = homeworks.map(hw => {
        const copy = { ...hw };
        delete copy.submissions; // Submissions are persisted in EvaluationContext
        if (typeof copy.contentPayload === 'string' && copy.contentPayload.length > 500 && !copy.contentPayload.startsWith('http')) {
          copy.contentPayload = '[STORED_IN_INDEXEDDB]';
        }
        if (typeof copy.pdfPayload === 'string' && copy.pdfPayload.length > 500 && !copy.pdfPayload.startsWith('http')) {
          copy.pdfPayload = '[STORED_IN_INDEXEDDB]';
        }
        if (typeof copy.htmlPayload === 'string' && copy.htmlPayload.length > 500 && !copy.htmlPayload.startsWith('http')) {
          copy.htmlPayload = '[STORED_IN_INDEXEDDB]';
        }
        if (Array.isArray(copy.questions)) {
          copy.questions = copy.questions.map(q => {
            const newQ = { ...q };
            if (typeof newQ.image === 'string' && newQ.image.length > 500 && !newQ.image.startsWith('http')) {
              newQ.image = '[STORED_IN_INDEXEDDB]';
            }
            return newQ;
          });
        }
        // ── Bug 2 Fix: Also sanitize heavy payloads INSIDE sections array ──
        if (Array.isArray(copy.sections)) {
          copy.sections = copy.sections.map(sec => {
            const s = { ...sec };
            if (s.pdfPayload) s.pdfPayload = stripHeavy(s.pdfPayload);
            if (s.contentPayload) s.contentPayload = stripHeavy(s.contentPayload);
            if (s.htmlPayload) s.htmlPayload = stripHeavy(s.htmlPayload);
            // Also strip heavy base64 imageUrls if any
            if (Array.isArray(s.imageUrls)) {
              s.imageUrls = s.imageUrls.map(u => (typeof u === 'string' && u.startsWith('data:') && u.length > 500 ? '[STORED_IN_INDEXEDDB]' : u));
            }
            // Strip heavy questionsList contentPayload entries
            if (Array.isArray(s.questionsList)) {
              s.questionsList = s.questionsList.map(q => {
                if (!q || typeof q !== 'object') return q;
                const qc = { ...q };
                if (qc.contentPayload) qc.contentPayload = stripHeavy(qc.contentPayload);
                if (qc.imageUrl && typeof qc.imageUrl === 'string' && qc.imageUrl.startsWith('data:') && qc.imageUrl.length > 500) qc.imageUrl = '[STORED_IN_INDEXEDDB]';
                return qc;
              });
            }
            return s;
          });
        }
        return copy;
      });
      
      localStorage.setItem('eTestHomeworks', JSON.stringify(sanitized));
    } catch (err) {
      if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        try {
          // Minimal payload without heavy nested lists
          const minimal = homeworks.map(h => ({
            id: h.id, title: h.title, dueDate: h.dueDate, targetType: h.targetType, targetIds: h.targetIds, bookId: h.bookId, tests: h.tests, optionCount: h.optionCount,
            // Preserve structural fields but drop payloads
            questionIds: h.questionIds, contentType: h.contentType, questionType: h.questionType,
            questionCount: h.questionCount, totalQuestions: h.totalQuestions,
            answerKey: h.answerKey,
            sections: Array.isArray(h.sections) ? h.sections.map(s => ({
              id: s.id, questionId: s.questionId, title: s.title, contentType: s.contentType,
              formatType: s.formatType, questionCount: s.questionCount, questionType: s.questionType,
              answerKey: s.answerKey, pdfUrl: s.pdfUrl, imageUrls: s.imageUrls
            })) : undefined
          }));
          localStorage.setItem('eTestHomeworks', JSON.stringify(minimal.slice(-20)));
        } catch (e2) {
          console.warn('[HomeworkContext] Quota exceeded even after minimal save:', e2);
        }
      } else {
        console.warn('[HomeworkContext] Error saving to localStorage:', err);
      }
    }
  }, [homeworks]);

  const { currentUser } = useAuth();
  const user = currentUser;
  const hasMigratedU1Ref = useRef(false);

  useEffect(() => {
    if (user?.id && homeworks.length > 0 && !hasMigratedU1Ref.current) {
      let hasU1 = false;
      homeworks.forEach(hw => {
        if (hw.submissions?.some(s => s.studentId === 'u1')) {
          hasU1 = true;
        }
      });

      if (hasU1) {
        hasMigratedU1Ref.current = true;
        setHomeworks(prev => {
          const updated = prev.map(hw => {
            if (hw.submissions?.some(s => s.studentId === 'u1')) {
              const newSubmissions = hw.submissions.map(s => s.studentId === 'u1' ? { ...s, studentId: user.id } : s);
              const newHw = { ...hw, submissions: newSubmissions };
              dbAddHomework(newHw).catch(() => {});
              return newHw;
            }
            return hw;
          });
          try {
            localStorage.setItem('eTestHomeworks', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    }
  }, [user?.id, homeworks]);

  const addHomework = async (hwData) => {
    const newId = `hw_${Math.random().toString(36).substr(2, 6)}_${Date.now()}`;
    const newHw = {
      id: newId,
      createdAt: new Date().toISOString(),
      submissions: [],
      ...hwData
    };

    const bigPayload = hwData.htmlPayload || hwData.pdfPayload || hwData.contentPayload || hwData.imageUrl || (Array.isArray(hwData.imageUrls) ? hwData.imageUrls.filter(u => typeof u === 'string' && !u.includes('[STORED_IN_INDEXEDDB]')).join('\n\n') : null) || hwData.imagePayload;
    if (bigPayload && typeof bigPayload === 'string' && bigPayload.length > 50 && !bigPayload.startsWith('http') && !bigPayload.includes('[STORED_IN_INDEXEDDB]')) {
      try {
        await idbSetPayload(newId, bigPayload);
        await idbSetPayload(String(newId).replace(/^hw_/, ''), bigPayload);
        if (Array.isArray(hwData.questionIds)) {
          for (const qid of hwData.questionIds) {
            const strQid = typeof qid === 'object' ? (qid.id || qid.questionId) : String(qid);
            if (strQid) {
              await idbSetPayload(strQid, bigPayload);
              await idbSetPayload(strQid.replace(/^q_/, ''), bigPayload);
            }
          }
        }
      } catch (e) {}
    }

    if (Array.isArray(hwData.sections)) {
      for (const sec of hwData.sections) {
        const secId = sec.id || sec.questionId;
        const secPayload = sec.htmlPayload || sec.pdfPayload || sec.contentPayload || sec.imageUrl || (Array.isArray(sec.imageUrls) ? sec.imageUrls.filter(u => typeof u === 'string' && u.startsWith('data:')).join('\n\n') : null) || sec.imagePayload;
        if (secId && secPayload && typeof secPayload === 'string' && secPayload.length > 50 && !secPayload.includes('[STORED_IN_INDEXEDDB]')) {
          try {
            await idbSetPayload(String(secId), secPayload);
            await idbSetPayload(String(secId).replace(/^q_?/, ''), secPayload);
            await idbSetPayload(String(secId).replace(/^q_?/, 'q_'), secPayload);
          } catch (e) {}
        }
      }
    }

    setHomeworks(prev => [...prev, newHw]);
    await dbAddHomework(newHw);
    return newHw;
  };

  const updateHomework = async (id, hwData) => {
    const idStr = String(id || '');
    const idUuid = toUUID(idStr);

    const bigPayload = hwData.htmlPayload || hwData.pdfPayload || hwData.contentPayload || hwData.imageUrl || (Array.isArray(hwData.imageUrls) ? hwData.imageUrls.filter(u => typeof u === 'string' && !u.includes('[STORED_IN_INDEXEDDB]')).join('\n\n') : null) || hwData.imagePayload;
    if (bigPayload && typeof bigPayload === 'string' && bigPayload.length > 50 && !bigPayload.startsWith('http') && !bigPayload.includes('[STORED_IN_INDEXEDDB]')) {
      try {
        await idbSetPayload(idStr, bigPayload);
        await idbSetPayload(idStr.replace(/^hw_/, ''), bigPayload);
        if (Array.isArray(hwData.questionIds)) {
          for (const qid of hwData.questionIds) {
            const strQid = typeof qid === 'object' ? (qid.id || qid.questionId) : String(qid);
            if (strQid) {
              await idbSetPayload(strQid, bigPayload);
              await idbSetPayload(strQid.replace(/^q_/, ''), bigPayload);
            }
          }
        }
      } catch (e) {}
    }

    if (Array.isArray(hwData.sections)) {
      for (const sec of hwData.sections) {
        const secId = sec.id || sec.questionId;
        const secPayload = sec.htmlPayload || sec.pdfPayload || sec.contentPayload || sec.imageUrl || (Array.isArray(sec.imageUrls) ? sec.imageUrls.filter(u => typeof u === 'string' && u.startsWith('data:')).join('\n\n') : null) || sec.imagePayload;
        if (secId && secPayload && typeof secPayload === 'string' && secPayload.length > 50 && !secPayload.includes('[STORED_IN_INDEXEDDB]')) {
          try {
            await idbSetPayload(String(secId), secPayload);
            await idbSetPayload(String(secId).replace(/^q_?/, ''), secPayload);
            await idbSetPayload(String(secId).replace(/^q_?/, 'q_'), secPayload);
          } catch (e) {}
        }
      }
    }

    let updatedTarget = null;
    setHomeworks(prev => {
      const next = prev.map(hw => {
        const isMatch = String(hw.id) === idStr || (idUuid && String(hw.id) === idUuid) || (toUUID(hw.id) && String(toUUID(hw.id)) === idUuid);
        if (isMatch) {
          updatedTarget = { ...hw, ...hwData, id: hw.id };
          return updatedTarget;
        }
        return hw;
      });
      try {
        localStorage.setItem('eTestHomeworks', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (!updatedTarget) {
      const targetHw = homeworks.find(h => String(h.id) === idStr || (idUuid && String(h.id) === idUuid) || (toUUID(h.id) && String(toUUID(h.id)) === idUuid));
      if (targetHw) {
        updatedTarget = { ...targetHw, ...hwData, id: targetHw.id };
      } else {
        updatedTarget = { id: idStr, ...hwData };
      }
    }

    if (updatedTarget) {
      await dbAddHomework(updatedTarget);
    }
  };

  const deleteHomework = async (id) => {
    const idStr = String(id);
    const idUuid = toUUID(idStr);
    setHomeworks(prev => {
      const next = prev.filter(hw => String(hw.id) !== idStr && (!idUuid || toUUID(hw.id) !== idUuid));
      try {
        localStorage.setItem('eTestHomeworks', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    invalidateCache('homeworks');
    await dbDeleteHomework(id);
    try {
      localStorage.removeItem(`quiz_draft_${id}`);
      localStorage.removeItem(`homework_sub_${id}`);
      localStorage.removeItem(`quiz_submission_${id}`);
      localStorage.removeItem(`draft_quiz_${id}_ans`);
      if (typeof idbDeletePayload === 'function') {
        await idbDeletePayload(id);
        await idbDeletePayload(idStr.replace(/^hw_/, ''));
        if (idUuid) await idbDeletePayload(idUuid);
      }
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('homework_deleted', { detail: { id } }));
  };

  const deleteAllHomeworks = async () => {
    const currentHomeworks = [...homeworks];
    setHomeworks([]);
    try {
      localStorage.setItem('eTestHomeworks', JSON.stringify([]));
    } catch (e) {}
    invalidateCache('homeworks');
    for (const hw of currentHomeworks) {
      await dbDeleteHomework(hw.id);
      try {
        localStorage.removeItem(`quiz_draft_${hw.id}`);
        localStorage.removeItem(`homework_sub_${hw.id}`);
        localStorage.removeItem(`quiz_submission_${hw.id}`);
        localStorage.removeItem(`draft_quiz_${hw.id}_ans`);
        if (typeof idbDeletePayload === 'function') {
          await idbDeletePayload(hw.id);
        }
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('homework_deleted', { detail: { id: hw.id } }));
    }
  };

  const submitHomework = (hwId, studentId, score, totalQuestions, extraData = {}) => {
    setHomeworks(prev => prev.map(hw => {
      if (String(hw.id) === String(hwId)) {
        const targetTestId = extraData.testId || extraData.bookTestId;
        const existingList = Array.isArray(hw.submissions) ? [...hw.submissions] : [];
        const existingIdx = existingList.findIndex(s => {
          if (String(s.studentId) !== String(studentId)) return false;
          if (targetTestId && (s.testId || s.bookTestId)) {
            return String(s.testId || s.bookTestId) === String(targetTestId);
          }
          return !targetTestId && !s.testId;
        });

        let newSubmissions;
        if (existingIdx >= 0) {
          newSubmissions = existingList.map((s, idx) =>
            idx === existingIdx ? { ...s, score, completedAt: new Date().toISOString(), totalQuestions, ...extraData } : s
          );
        } else {
          newSubmissions = [...existingList, { studentId, score, completedAt: new Date().toISOString(), totalQuestions, ...extraData }];
        }
        const updated = { ...hw, submissions: newSubmissions };
        dbAddHomework(updated);
        return updated;
      }
      return hw;
    }));
  };

  const updateHomeworkSubmission = (hwId, studentOrSubId, updatedSubData) => {
    setHomeworks(prev => prev.map(hw => {
      if (String(hw.id) === String(hwId)) {
        const targetTestId = updatedSubData?.testId || updatedSubData?.bookTestId;
        const existingList = Array.isArray(hw.submissions) ? [...hw.submissions] : [];
        const foundIdx = existingList.findIndex(s => {
          const isSameStudent = String(s.studentId) === String(studentOrSubId) ||
            String(s.studentId) === String(updatedSubData?.studentId) ||
            String(s.id) === String(studentOrSubId) ||
            String(s.id) === String(updatedSubData?.id);
          if (!isSameStudent) return false;
          if (targetTestId && (s.testId || s.bookTestId)) {
            return String(s.testId || s.bookTestId) === String(targetTestId);
          }
          return true;
        });

        let nextSubmissions;
        if (foundIdx >= 0) {
          nextSubmissions = existingList.map((s, idx) =>
            idx === foundIdx ? { ...s, ...updatedSubData, status: updatedSubData.status || 'completed' } : s
          );
        } else {
          nextSubmissions = [...existingList, { ...updatedSubData, status: updatedSubData.status || 'completed' }];
        }

        const updatedHw = { ...hw, submissions: nextSubmissions };
        dbAddHomework(updatedHw);
        return updatedHw;
      }
      return hw;
    }));
  };

  const clearHomeworkSubmissionsForStudent = async (hwId, studentId, bookId, testIds = []) => {
    const testIdsSet = new Set((testIds || []).map(String));
    (testIds || []).forEach(tid => {
      const s = String(tid);
      testIdsSet.add(s);
      testIdsSet.add(s.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, ''));
      const u = toUUID(tid);
      if (u) testIdsSet.add(String(u));
    });
    const hasSpecificTests = testIdsSet.size > 0;

    const stIdStr = String(studentId);
    const stUuid = toUUID(stIdStr);

    let updatedList = [];
    setHomeworks(prev => {
      updatedList = prev.map(hw => {
        const isTargetHw = hwId && (String(hw.id) === String(hwId) || String(toUUID(hw.id)) === String(hwId));
        const isTargetBookHw = bookId && (
          String(hw.bookId) === String(bookId) || 
          (hw.raw_data && String(hw.raw_data.bookId) === String(bookId)) ||
          (hw.title && bookId && hw.title.includes(bookId))
        );

        if (hasSpecificTests || isTargetHw || isTargetBookHw || (!hwId && !bookId)) {
          const subs = hw.submissions || hw.raw_data?.submissions || [];
          const updatedSubs = subs.filter(s => {
            const isMatchStudent = String(s.studentId) === stIdStr || (stUuid && String(s.studentId) === stUuid) || (stUuid && toUUID(s.studentId) === stUuid) || String(s.studentId) === 'u1' || stIdStr === 'u1';
            if (!isMatchStudent) return true; // keep other students

            if (hasSpecificTests) {
              const candidateFields = [
                s.testId,
                s.bookTestId,
                s.realTestId,
                s.id,
                s.metadata?.testId,
                s.metadata?.bookTestId,
                s.metadata?.realTestId
              ];
              const isMatchingTest = candidateFields.some(f => {
                if (!f) return false;
                const fs = String(f);
                const clean = fs.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
                const fu = toUUID(f);
                return testIdsSet.has(fs) || testIdsSet.has(clean) || (fu && testIdsSet.has(String(fu)));
              });
              return !isMatchingTest; // drop matching test
            }
            return false; // drop all for this student in this homework
          });

          const cleanRaw = { ...(hw.raw_data || {}), submissions: updatedSubs };
          delete cleanRaw.raw_data;

          return {
            ...hw,
            submissions: updatedSubs,
            raw_data: cleanRaw
          };
        }
        return hw;
      });

      try {
        localStorage.setItem('eTestHomeworks', JSON.stringify(updatedList));
        localStorage.setItem('etest_homeworks', JSON.stringify(updatedList));
      } catch (e) {}

      return updatedList;
    });

    // Execute direct Supabase database update
    await dbClearHomeworkSubmissionsForStudent(hwId, studentId, bookId, testIds);
  };

  return (
    <HomeworkContext.Provider value={{
      homeworks,
      isLoading,
      refreshHomeworks,
      addHomework,
      updateHomework,
      deleteHomework,
      deleteAllHomeworks,
      submitHomework,
      updateHomeworkSubmission,
      clearHomeworkSubmissionsForStudent
    }}>
      {children}
    </HomeworkContext.Provider>
  );
}
