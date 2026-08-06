import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetHomeworks, dbAddHomework, dbDeleteHomework } from '../services/supabaseService';

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
    localStorage.setItem('eTestHomeworks', JSON.stringify(homeworks));
  }, [homeworks]);

  const addHomework = async (hwData) => {
    const newHw = {
      id: `hw_${Date.now()}`,
      createdAt: new Date().toISOString(),
      submissions: [],
      ...hwData
    };
    setHomeworks(prev => [...prev, newHw]);
    await dbAddHomework(newHw);
    return newHw;
  };

  const updateHomework = async (id, hwData) => {
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

  const submitHomework = (hwId, studentId, score, totalQuestions) => {
    setHomeworks(prev => prev.map(hw => {
      if (hw.id === hwId) {
        const existing = (hw.submissions || []).find(s => s.studentId === studentId);
        let newSubmissions = [...(hw.submissions || [])];
        if (existing) {
          newSubmissions = newSubmissions.map(s => 
            s.studentId === studentId ? { ...s, score, completedAt: new Date().toISOString(), totalQuestions } : s
          );
        } else {
          newSubmissions.push({ studentId, score, completedAt: new Date().toISOString(), totalQuestions });
        }
        const updated = { ...hw, submissions: newSubmissions };
        dbAddHomework(updated);
        return updated;
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
      submitHomework
    }}>
      {children}
    </HomeworkContext.Provider>
  );
}
