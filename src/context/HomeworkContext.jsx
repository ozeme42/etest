import { createContext, useContext, useState, useEffect } from 'react';

const HomeworkContext = createContext();

export function useHomework() {
  return useContext(HomeworkContext);
}

// targetType: 'grade' or 'student'
// targetIds: array of gradeIds or studentIds
// status: array of submissions: { studentId, score, completedAt, totalQuestions }

export function HomeworkProvider({ children }) {
  const [homeworks, setHomeworks] = useState(() => {
    const saved = localStorage.getItem('eTestHomeworks');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('eTestHomeworks', JSON.stringify(homeworks));
  }, [homeworks]);

  const addHomework = (hwData) => {
    const newHw = {
      id: `hw_${Date.now()}`,
      createdAt: new Date().toISOString(),
      submissions: [],
      ...hwData
    };
    setHomeworks(prev => [...prev, newHw]);
  };

  const updateHomework = (id, hwData) => {
    setHomeworks(prev => prev.map(hw => hw.id === id ? { ...hw, ...hwData } : hw));
  };

  const deleteHomework = (id) => {
    setHomeworks(prev => prev.filter(hw => hw.id !== id));
  };

  const submitHomework = (hwId, studentId, score, totalQuestions) => {
    setHomeworks(prev => prev.map(hw => {
      if (hw.id === hwId) {
        // Prevent duplicate submissions or update existing
        const existing = hw.submissions.find(s => s.studentId === studentId);
        let newSubmissions = [...hw.submissions];
        if (existing) {
          newSubmissions = newSubmissions.map(s => 
            s.studentId === studentId ? { ...s, score, completedAt: new Date().toISOString(), totalQuestions } : s
          );
        } else {
          newSubmissions.push({ studentId, score, completedAt: new Date().toISOString(), totalQuestions });
        }
        return { ...hw, submissions: newSubmissions };
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
      submitHomework
    }}>
      {children}
    </HomeworkContext.Provider>
  );
}
