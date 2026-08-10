import { createContext, useContext, useState, useEffect } from 'react';
import {
  dbGetStudyPlans,
  dbAddStudyPlan,
  dbDeleteStudyPlan,
  dbAddStudyAssignment,
  dbUpdateStudyAssignment
} from '../services/supabaseService';

const StudyPlanContext = createContext();

export function useStudyPlan() {
  return useContext(StudyPlanContext);
}

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
    async function syncStudyPlansFromSupabase() {
      const res = await dbGetStudyPlans();
      if (res) {
        if (res.plans) setStudyPlans(res.plans);
        if (res.assignments) setStudyAssignments(res.assignments);
      }
    }
    syncStudyPlansFromSupabase();
  }, []);

  useEffect(() => {
    localStorage.setItem('eTestStudyPlans', JSON.stringify(studyPlans));
  }, [studyPlans]);

  useEffect(() => {
    localStorage.setItem('eTestStudyAssignments', JSON.stringify(studyAssignments));
  }, [studyAssignments]);

  const addStudyPlan = async (planData) => {
    const newPlan = {
      id: `plan_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...planData
    };
    setStudyPlans(prev => [...prev, newPlan]);
    await dbAddStudyPlan(newPlan);
    return newPlan;
  };

  const updateStudyPlan = async (id, planData) => {
    setStudyPlans(prev => prev.map(p => p.id === id ? { ...p, ...planData } : p));
    const target = studyPlans.find(p => p.id === id);
    if (target) {
      await dbAddStudyPlan({ ...target, ...planData });
    }
  };

  const deleteStudyPlan = async (id) => {
    setStudyPlans(prev => prev.filter(p => p.id !== id));
    await dbDeleteStudyPlan(id);
  };

  const addStudyAssignment = async (assignmentData) => {
    const newAssignment = {
      id: `sa_${Math.random().toString(36).substr(2, 6)}_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'assigned',
      ...assignmentData
    };
    setStudyAssignments(prev => [...prev, newAssignment]);
    await dbAddStudyAssignment(newAssignment);
    return newAssignment;
  };

  const updateStudyAssignment = async (id, data) => {
    setStudyAssignments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    await dbUpdateStudyAssignment(id, data);
  };

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
