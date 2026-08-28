import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { dbGetGoals, dbAddGoal, dbUpdateGoalProgress, dbDeleteGoal, toUUID } from '../services/supabaseService';
import { isCacheValid, touchCache } from '../utils/cacheManager';

const GoalContext = createContext();

export function useGoal() {
  return useContext(GoalContext);
}

export function GoalProvider({ children }) {
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('eTestGoals');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    async function syncGoals() {
      if (isCacheValid('goals', 30) && goals.length > 0) return;
      const dbGoals = await dbGetGoals();
      if (dbGoals) {
        touchCache('goals');
        setGoals(dbGoals);
      }
    }
    syncGoals();
  }, []);

  useEffect(() => {
    localStorage.setItem('eTestGoals', JSON.stringify(goals));
  }, [goals]);

  const addGoal = async (goalData) => {
    const newGoal = {
      id: `goal_${Date.now()}`,
      createdAt: new Date().toISOString(),
      current: 0,
      ...goalData
    };
    setGoals(prev => {
      const filtered = prev.filter(g => !(g.studentId === newGoal.studentId && g.type === newGoal.type && g.period === newGoal.period));
      return [...filtered, newGoal];
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

  const value = useMemo(() => ({
    goals,
    addGoal,
    updateGoalProgress,
    deleteGoal
  }), [goals]);

  return (
    <GoalContext.Provider value={value}>
      {children}
    </GoalContext.Provider>
  );
}
