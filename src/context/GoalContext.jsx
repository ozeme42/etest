import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbGetGoals, dbAddGoal, dbUpdateGoalProgress, dbDeleteGoal, toUUID } from '../services/supabaseService';
import { isCacheValid, touchCache } from '../utils/cacheManager';

const GoalContext = createContext();

export function useGoal() {
  return useContext(GoalContext);
}

const INITIAL_GOALS = [];

export function GoalProvider({ children }) {
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('eTestGoals');
    return saved ? JSON.parse(saved) : INITIAL_GOALS;
  });

  useEffect(() => {
    async function syncFromSupabase() {
      if (isCacheValid('goals', 30) && goals.length > 0) return;
      const dbGoals = await dbGetGoals();
      if (dbGoals && Array.isArray(dbGoals)) {
        touchCache('goals');
        if (dbGoals.length > 0) {
          setGoals(dbGoals);
        }
      }
    }
    syncFromSupabase();
  }, []);

  useEffect(() => {
    localStorage.setItem('eTestGoals', JSON.stringify(goals));
  }, [goals]);

  const addGoal = async (goalData) => {
    const rawId = goalData.id || `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const uuidId = toUUID(rawId) || rawId;
    const newGoal = {
      ...goalData,
      id: uuidId,
      current: Number(goalData.current) || 0,
      createdAt: new Date().toISOString()
    };
    setGoals(prev => {
      const exists = prev.some(g => g.id === newGoal.id);
      if (exists) return prev.map(g => g.id === newGoal.id ? newGoal : g);
      return [...prev, newGoal];
    });
    await dbAddGoal(newGoal);
    return newGoal;
  };

  const updateGoalProgress = async (goalId, addedAmount) => {
    let targetGoal = null;
    setGoals(prev => prev.map(g => {
      if (g.id === goalId || toUUID(g.id) === toUUID(goalId)) {
        const newCurrent = Math.min(g.target, (Number(g.current) || 0) + Number(addedAmount));
        targetGoal = { ...g, current: newCurrent };
        return targetGoal;
      }
      return g;
    }));
    if (targetGoal) {
      await dbUpdateGoalProgress(goalId, targetGoal.current);
    }
  };

  const deleteGoal = async (goalId) => {
    setGoals(prev => prev.filter(g => g.id !== goalId && toUUID(g.id) !== toUUID(goalId)));
    await dbDeleteGoal(goalId);
  };

  return (
    <GoalContext.Provider value={{ goals, addGoal, updateGoalProgress, deleteGoal }}>
      {children}
    </GoalContext.Provider>
  );
}
