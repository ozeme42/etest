import { createContext, useContext, useState, useEffect } from 'react';

const StudyPlanContext = createContext();

export function useStudyPlan() {
  return useContext(StudyPlanContext);
}

// Plan Structure:
// {
//   id: 'plan_1',
//   title: 'YKS 2027 Sayısal Yol Haritası',
//   createdAt: '2026-07-27...',
//   subjects: [
//     { id: 'subj_1', name: 'Matematik', topics: [{ id: 'top_1', name: 'Üslü Sayılar' }] }
//   ]
// }

export function StudyPlanProvider({ children }) {
  const [studyPlans, setStudyPlans] = useState(() => {
    const saved = localStorage.getItem('eTestStudyPlans');
    return saved ? JSON.parse(saved) : [];
  });

  const [studyAssignments, setStudyAssignments] = useState(() => {
    const saved = localStorage.getItem('eTestStudyAssignments');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('eTestStudyPlans', JSON.stringify(studyPlans));
  }, [studyPlans]);

  useEffect(() => {
    localStorage.setItem('eTestStudyAssignments', JSON.stringify(studyAssignments));
  }, [studyAssignments]);

  const addStudyPlan = (planData) => {
    const newPlan = {
      id: `plan_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...planData
    };
    setStudyPlans(prev => [...prev, newPlan]);
  };

  const updateStudyPlan = (id, planData) => {
    setStudyPlans(prev => prev.map(p => p.id === id ? { ...p, ...planData } : p));
  };

  const deleteStudyPlan = (id) => {
    setStudyPlans(prev => prev.filter(p => p.id !== id));
  };

  const addStudyAssignment = (assignmentData) => {
    const newAssignment = {
      id: `sa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      status: 'assigned', // assigned, completed
      ...assignmentData
    };
    setStudyAssignments(prev => [...prev, newAssignment]);
  };

  const updateStudyAssignment = (id, data) => {
    setStudyAssignments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
  }

  return (
    <StudyPlanContext.Provider value={{
      studyPlans,
      addStudyPlan,
      updateStudyPlan,
      deleteStudyPlan,
      studyAssignments,
      addStudyAssignment,
      updateStudyAssignment
    }}>
      {children}
    </StudyPlanContext.Provider>
  );
}
