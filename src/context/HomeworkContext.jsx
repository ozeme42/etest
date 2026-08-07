import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetHomeworks, dbAddHomework, dbDeleteHomework } from '../services/supabaseService';
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

  useEffect(() => {
    async function syncHomeworksFromSupabase() {
      const dbHws = await dbGetHomeworks();
      if (dbHws) {
        setHomeworks(dbHws);
      }
    }
    syncHomeworksFromSupabase();
  }, []);

  useEffect(() => {
    try {
      const sanitized = homeworks.map(hw => {
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
        return copy;
      });
      localStorage.setItem('eTestHomeworks', JSON.stringify(sanitized));
    } catch (err) {
      console.warn('[HomeworkContext] localStorage quota exceeded, saved in memory & DB:', err);
    }
  }, [homeworks]);

  const addHomework = async (hwData) => {
    const newId = `hw_${Date.now()}`;
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
