import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbGetSchedules, dbAddSchedule, dbToggleSchedule, dbDeleteSchedule } from '../services/supabaseService';

const ScheduleContext = createContext();

export function useSchedule() {
  return useContext(ScheduleContext);
}

const INITIAL_SCHEDULE = [];

export function ScheduleProvider({ children }) {
  const [schedules, setSchedules] = useState(() => {
    const saved = localStorage.getItem('eTestSchedule');
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULE;
  });

  useEffect(() => {
    async function syncFromSupabase() {
      const dbSchedules = await dbGetSchedules();
      if (dbSchedules && dbSchedules.length > 0) {
        setSchedules(dbSchedules);
      }
    }
    syncFromSupabase();
  }, []);

  useEffect(() => {
    localStorage.setItem('eTestSchedule', JSON.stringify(schedules));
  }, [schedules]);

  const addSchedule = async (data) => {
    const newItem = {
      id: `sch-${Date.now()}`,
      ...data,
      done: false,
      createdAt: new Date().toISOString(),
    };
    setSchedules(prev => [...prev, newItem]);
    await dbAddSchedule(newItem);
  };

  const toggleScheduleDone = async (id) => {
    let newDoneState = false;
    setSchedules(prev =>
      prev.map(s => {
        if (s.id === id) {
          newDoneState = !s.done;
          return { ...s, done: newDoneState };
        }
        return s;
      })
    );
    await dbToggleSchedule(id, newDoneState);
  };

  const deleteSchedule = async (id) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    await dbDeleteSchedule(id);
  };

  const resetDoneForStudent = (studentId) => {
    setSchedules(prev => prev.map(s => s.studentId === studentId ? { ...s, done: false } : s));
  };

  return (
    <ScheduleContext.Provider value={{ schedules, addSchedule, toggleScheduleDone, deleteSchedule, resetDoneForStudent }}>
      {children}
    </ScheduleContext.Provider>
  );
}
