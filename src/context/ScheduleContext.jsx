import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbGetSchedules, dbAddSchedule, dbToggleSchedule, dbDeleteSchedule, toUUID } from '../services/supabaseService';

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
      if (dbSchedules && Array.isArray(dbSchedules)) {
        if (dbSchedules.length > 0) {
          setSchedules(dbSchedules);
        } else {
          // If Supabase is empty, check localStorage and push to DB
          const saved = localStorage.getItem('eTestSchedule');
          if (saved) {
            try {
              const localSch = JSON.parse(saved);
              if (Array.isArray(localSch) && localSch.length > 0) {
                for (const s of localSch) {
                  await dbAddSchedule(s);
                }
                const refreshed = await dbGetSchedules();
                if (refreshed && refreshed.length > 0) {
                  setSchedules(refreshed);
                }
              }
            } catch (e) {}
          }
        }
      }
    }
    syncFromSupabase();
  }, []);

  useEffect(() => {
    localStorage.setItem('eTestSchedule', JSON.stringify(schedules));
  }, [schedules]);

  const addSchedule = async (data) => {
    const rawId = data.id || `sch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const uuidId = toUUID(rawId) || rawId;
    const newItem = {
      ...data,
      id: uuidId,
      done: Boolean(data.done),
      createdAt: new Date().toISOString(),
    };
    setSchedules(prev => {
      const exists = prev.some(s => s.id === newItem.id);
      if (exists) return prev.map(s => s.id === newItem.id ? newItem : s);
      return [...prev, newItem];
    });
    await dbAddSchedule(newItem);
    return newItem;
  };

  const toggleScheduleDone = async (id) => {
    let newDoneState = false;
    setSchedules(prev =>
      prev.map(s => {
        if (s.id === id || toUUID(s.id) === toUUID(id)) {
          newDoneState = !s.done;
          return { ...s, done: newDoneState };
        }
        return s;
      })
    );
    await dbToggleSchedule(id, newDoneState);
  };

  const deleteSchedule = async (id) => {
    setSchedules(prev => prev.filter(s => s.id !== id && toUUID(s.id) !== toUUID(id)));
    await dbDeleteSchedule(id);
  };

  const resetDoneForStudent = (studentId) => {
    setSchedules(prev => prev.map(s => (s.studentId === studentId || toUUID(s.studentId) === toUUID(studentId)) ? { ...s, done: false } : s));
  };

  return (
    <ScheduleContext.Provider value={{ schedules, addSchedule, toggleScheduleDone, deleteSchedule, resetDoneForStudent }}>
      {children}
    </ScheduleContext.Provider>
  );
}
