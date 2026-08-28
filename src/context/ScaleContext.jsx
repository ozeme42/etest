import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { safeSetItem } from '../utils/storageUtils';
import { dbGetScales, dbSaveScale, dbDeleteScale } from '../services/supabaseService';

const ScaleContext = createContext();

export function useScale() {
  return useContext(ScaleContext);
}

export function ScaleProvider({ children }) {
  const LS_KEY = 'eTestScales';

  const [scales, setScalesState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    safeSetItem(LS_KEY, JSON.stringify(scales));
  }, [scales]);

  // On mount: sync from Supabase (if configured)
  useEffect(() => {
    // We don't know teacherId at provider level, so we load ALL and rely on teacherId filter in components.
    // Supabase syncing is done per-teacher via saveScale/deleteScale.
    // Initial full pull handled by the component via loadScalesForTeacher.
  }, []);

  const loadScalesForTeacher = useCallback(async (teacherId) => {
    const dbScales = await dbGetScales(teacherId);
    if (dbScales && dbScales.length > 0) {
      setScalesState(prev => {
        const merged = [...prev.filter(s => s.teacherId !== teacherId)];
        dbScales.forEach(dbS => {
          if (!merged.find(s => s.id === dbS.id)) merged.push(dbS);
          else {
            const idx = merged.findIndex(s => s.id === dbS.id);
            merged[idx] = { ...merged[idx], ...dbS };
          }
        });
        return merged;
      });
    }
  }, []);

  const getScalesForTeacher = useCallback((teacherId) => {
    return scales.filter(s => s.teacherId === teacherId || s.createdBy === teacherId);
  }, [scales]);

  const saveScale = useCallback(async (scale) => {
    setScalesState(prev => {
      const idx = prev.findIndex(s => s.id === scale.id);
      return idx >= 0 ? prev.map((s, i) => i === idx ? scale : s) : [...prev, scale];
    });
    await dbSaveScale(scale);
  }, []);

  const deleteScale = useCallback(async (scaleId) => {
    setScalesState(prev => prev.filter(s => s.id !== scaleId));
    await dbDeleteScale(scaleId);
  }, []);

  const value = useMemo(() => ({
    scales,
    getScalesForTeacher,
    loadScalesForTeacher,
    saveScale,
    deleteScale,
  }), [scales, getScalesForTeacher, loadScalesForTeacher, saveScale, deleteScale]);

  return (
    <ScaleContext.Provider value={value}>
      {children}
    </ScaleContext.Provider>
  );
}
