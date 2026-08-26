import { createContext, useContext, useState, useEffect } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  dbGetStudyPlans,
  dbAddStudyPlan,
  dbDeleteStudyPlan,
  dbAddStudyAssignment,
  dbUpdateStudyAssignment
} from '../services/supabaseService';

const StudyPlanContext = createContext();

export function useStudyPlan() {
  const context = useContext(StudyPlanContext);
  if (!context) {
    return { studyPlans: [], studyAssignments: [], addStudyPlan: async () => {}, updateStudyPlan: async () => {}, deleteStudyPlan: async () => {} };
  }
  return context;
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
      if (!isSupabaseConfigured()) return;
      const lastSync = sessionStorage.getItem('eTestLastStudyPlansSync');
      const now = Date.now();
      if (lastSync && now - Number(lastSync) < 15 * 60 * 1000 && studyPlans.length > 0) {
        return;
      }
      const res = await dbGetStudyPlans();
      if (res) {
        sessionStorage.setItem('eTestLastStudyPlansSync', String(now));
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

    const payload = { ...newAssignment };
    if (payload.completedTopics) {
      payload.topic = JSON.stringify(payload.completedTopics);
    }
    await dbAddStudyAssignment(payload);
    return newAssignment;
  };

  const updateStudyAssignment = async (id, data) => {
    setStudyAssignments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    
    const dbData = { ...data };
    if (dbData.completedTopics) {
      dbData.topic = JSON.stringify(dbData.completedTopics);
    }
    await dbUpdateStudyAssignment(id, dbData);
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
