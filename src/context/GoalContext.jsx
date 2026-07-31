import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbGetGoals, dbAddGoal, dbUpdateGoalProgress, dbDeleteGoal } from '../services/supabaseService';

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
      const dbGoals = await dbGetGoals();
      if (dbGoals && dbGoals.length > 0) {
        setGoals(dbGoals);
      }
    }
    syncFromSupabase();
  }, []);

  useEffect(() => {
    localStorage.setItem('eTestGoals', JSON.stringify(goals));
  }, [goals]);

  const addGoal = async (goalData) => {
    const newGoal = {
      id: `goal-${Date.now()}`,
      ...goalData,
      current: 0,
      createdAt: new Date().toISOString()
    };
    setGoals(prev => [...prev, newGoal]);
    await dbAddGoal(newGoal);
  };

  const updateGoalProgress = async (goalId, addedAmount) => {
    let targetGoal = null;
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const newCurrent = Math.min(g.target, g.current + Number(addedAmount));
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
    setGoals(prev => prev.filter(g => g.id !== goalId));
    await dbDeleteGoal(goalId);
  };

  return (
    <GoalContext.Provider value={{ goals, addGoal, updateGoalProgress, deleteGoal }}>
      {children}
    </GoalContext.Provider>
  );
}
