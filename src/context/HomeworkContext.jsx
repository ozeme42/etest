import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetHomeworks, dbAddHomework, dbDeleteHomework } from '../services/supabaseService';
import { useAuth } from './AuthContext';
import { idbSetPayload } from '../services/indexedDbService';

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
    let sanitized = [];
    try {
      sanitized = homeworks.map(hw => {
        const copy = { ...hw };
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
          // Keep only the latest 10 homeworks to fit in quota
          const trimmed = sanitized.slice(-10);
          localStorage.setItem('eTestHomeworks', JSON.stringify(trimmed));
          console.warn('[HomeworkContext] localStorage quota exceeded, trimmed to 10 latest homeworks.');
        } catch (e2) {
          console.warn('[HomeworkContext] Quota exceeded even after trimming:', e2);
        }
      } else {
        console.warn('[HomeworkContext] Error saving to localStorage:', err);
      }
    }
  }, [homeworks]);

const { user } = useAuth();

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
  };

  const deleteAllHomeworks = async () => {
    const currentHomeworks = [...homeworks];
    setHomeworks([]);
    for (const hw of currentHomeworks) {
      await dbDeleteHomework(hw.id);
    }
  };

  const submitHomework = (hwId, studentId, score, totalQuestions, extraData = {}) => {
    setHomeworks(prev => prev.map(hw => {
      if (hw.id === hwId) {
        const existing = (hw.submissions || []).find(s => s.studentId === studentId);
        let newSubmissions = [...(hw.submissions || [])];
        if (existing) {
          newSubmissions = newSubmissions.map(s => 
            s.studentId === studentId ? { ...s, score, completedAt: new Date().toISOString(), totalQuestions, ...extraData } : s
          );
        } else {
          newSubmissions.push({ studentId, score, completedAt: new Date().toISOString(), totalQuestions, ...extraData });
        }
        const updated = { ...hw, submissions: newSubmissions };
        dbAddHomework(updated);
        return updated;
      }
      return hw;
    }));
  };

  const updateHomeworkSubmission = (hwId, studentId, updatedSubData) => {
    setHomeworks(prev => prev.map(hw => {
      if (String(hw.id) === String(hwId)) {
        const nextSubmissions = (hw.submissions || []).map(s => {
          if (String(s.studentId) === String(studentId) || String(s.id) === String(updatedSubData.id)) {
            return { ...s, ...updatedSubData, status: 'completed', isEvaluatedByTeacher: true };
          }
          return s;
        });
        const updatedHw = { ...hw, submissions: nextSubmissions };
        dbAddHomework(updatedHw);
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
      updateHomeworkSubmission
    }}>
      {children}
    </HomeworkContext.Provider>
  );
}
