import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetHomeworks, dbAddHomework, dbDeleteHomework } from '../services/supabaseService';
import { useAuth } from './AuthContext';
import { idbSetPayload, idbDeletePayload } from '../services/indexedDbService';

const HomeworkContext = createContext();

export function useHomework() {
  return useContext(HomeworkContext);
}

export function HomeworkProvider({ children }) {
  const [homeworks, setHomeworks] = useState(() => {
    const saved = localStorage.getItem('eTestHomeworks');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function syncHomeworksFromSupabase() {
      setIsLoading(true);
      try {
        const dbHws = await dbGetHomeworks();
        if (dbHws) {
          setHomeworks(dbHws);
        }
      } finally {
        setIsLoading(false);
      }
    }
    syncHomeworksFromSupabase();
  }, []);

  useEffect(() => {
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
        return copy;
      });
      
      localStorage.setItem('eTestHomeworks', JSON.stringify(sanitized));
    } catch (err) {
      if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        try {
          // Minimal payload without heavy nested lists
          const minimal = homeworks.map(h => ({
            id: h.id, title: h.title, dueDate: h.dueDate, targetType: h.targetType, targetIds: h.targetIds, bookId: h.bookId, tests: h.tests, optionCount: h.optionCount
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

useEffect(() => {
  if (user?.id && homeworks.length > 0) {
    let hasU1 = false;
    homeworks.forEach(hw => {
      if (hw.submissions?.some(s => s.studentId === 'u1')) {
        hasU1 = true;
      }
    });

    if (hasU1) {
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

    const bigPayload = hwData.htmlPayload || hwData.pdfPayload || hwData.contentPayload;
    if (bigPayload && typeof bigPayload === 'string' && bigPayload.length > 500 && !bigPayload.startsWith('http')) {
      try {
        await idbSetPayload(newId, bigPayload);
      } catch (e) {}
    }

    setHomeworks(prev => [...prev, newHw]);
    await dbAddHomework(newHw);
    return newHw;
  };

  const updateHomework = async (id, hwData) => {
    const bigPayload = hwData.htmlPayload || hwData.pdfPayload || hwData.contentPayload;
    if (bigPayload && typeof bigPayload === 'string' && bigPayload.length > 500 && !bigPayload.startsWith('http')) {
      try {
        await idbSetPayload(id, bigPayload);
      } catch (e) {}
    }

    setHomeworks(prev => prev.map(hw => hw.id === id ? { ...hw, ...hwData } : hw));
    const targetHw = homeworks.find(h => h.id === id);
    if (targetHw) {
      await dbAddHomework({ ...targetHw, ...hwData });
    }
  };

  const deleteHomework = async (id) => {
    setHomeworks(prev => prev.filter(hw => hw.id !== id));
    await dbDeleteHomework(id);
    try {
      localStorage.removeItem(`quiz_draft_${id}`);
      localStorage.removeItem(`homework_sub_${id}`);
      localStorage.removeItem(`quiz_submission_${id}`);
      localStorage.removeItem(`draft_quiz_${id}_ans`);
      if (typeof idbDeletePayload === 'function') {
        await idbDeletePayload(id);
      }
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('homework_deleted', { detail: { id } }));
  };

  const deleteAllHomeworks = async () => {
    const currentHomeworks = [...homeworks];
    setHomeworks([]);
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
          return !targetTestId && !s.testId;
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
      const u = toUUID(tid);
      if (u) testIdsSet.add(String(u));
    });
    const hasSpecificTests = testIdsSet.size > 0;

    const stIdStr = String(studentId);
    const stUuid = toUUID(stIdStr);

    setHomeworks(prev => prev.map(hw => {
      const isTargetHw = hwId && (String(hw.id) === String(hwId) || String(toUUID(hw.id)) === String(hwId));
      const isTargetBookHw = bookId && (
        String(hw.bookId) === String(bookId) || 
        (hw.raw_data && String(hw.raw_data.bookId) === String(bookId)) ||
        (hw.title && bookId && hw.title.includes(bookId))
      );

      if (isTargetHw || isTargetBookHw || (!hwId && !bookId)) {
        const updatedSubs = (hw.submissions || []).filter(s => {
          const isMatchStudent = String(s.studentId) === stIdStr || (stUuid && String(s.studentId) === stUuid) || (stUuid && toUUID(s.studentId) === stUuid) || String(s.studentId) === 'u1' || stIdStr === 'u1';
          if (!isMatchStudent) return true; // keep other students

          if (hasSpecificTests) {
            const isMatchingTest = testIdsSet.has(String(s.testId)) || testIdsSet.has(String(s.bookTestId)) || testIdsSet.has(toUUID(s.testId));
            return !isMatchingTest; // drop matching test
          }
          return false; // drop all for this student in this homework
        });

        const updatedHw = {
          ...hw,
          submissions: updatedSubs,
          raw_data: {
            ...(hw.raw_data || {}),
            submissions: updatedSubs
          }
        };
        dbAddHomework(updatedHw).catch(console.error);
        return updatedHw;
      }
      return hw;
    }));
  };

  return (
    <HomeworkContext.Provider value={{
      homeworks,
      isLoading,
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
