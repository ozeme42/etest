import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  dbGetCurriculum,
  dbAddGrade,
  dbDeleteGrade,
  dbAddSubject,
  dbDeleteSubject,
  dbAddUnit,
  dbDeleteUnit,
  dbAddTopic,
  dbDeleteTopic
} from '../services/supabaseService';
import { idbSetPayload, idbGetPayload } from '../services/indexedDbService';
import { isCacheValid, touchCache, invalidateCache } from '../utils/cacheManager';

const CurriculumContext = createContext();

export function useCurriculum() {
  const context = useContext(CurriculumContext);
  if (!context) {
    throw new Error('useCurriculum must be used within a CurriculumProvider');
  }
  return context;
}

const DEFAULT_CURRICULUM_DATA = {
  grades: [],
  subjects: [],
  units: [],
  topics: [],
  tests: []
};

const MOCK_IDS = new Set(['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10']);

export const naturalSort = (a, b) => {
  const nameA = String(a?.name || a?.grade || a?.title || a || '').trim();
  const nameB = String(b?.name || b?.grade || b?.title || b || '').trim();
  return nameA.localeCompare(nameB, 'tr', { numeric: true, sensitivity: 'base' });
};

const generateUniqueId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

export function CurriculumProvider({ children }) {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('eTestCurriculum') || localStorage.getItem('curriculumData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.grades && Array.isArray(parsed.grades)) {
          return {
            grades: (parsed.grades || []).filter(g => !MOCK_IDS.has(g.id)).sort(naturalSort),
            subjects: (parsed.subjects || []).filter(s => !MOCK_IDS.has(s.id)).sort(naturalSort),
            units: (parsed.units || []).filter(u => !MOCK_IDS.has(u.id)).sort(naturalSort),
            topics: (parsed.topics || []).filter(t => !MOCK_IDS.has(t.id)).sort(naturalSort),
            tests: (parsed.tests || []).filter(t => !MOCK_IDS.has(t.id))
          };
        }
      } catch (e) {
        console.warn('Failed to parse curriculum cache, using defaults:', e);
      }
    }
    return DEFAULT_CURRICULUM_DATA;
  });

  const syncCurriculum = async (force = false) => {
    let curCache = null;
    try {
      const idbCached = await idbGetPayload('eTestCurriculum_Cache');
      if (idbCached) {
        curCache = JSON.parse(idbCached);
      }
    } catch {}

    if (!curCache) {
      const raw = localStorage.getItem('eTestCurriculum') || localStorage.getItem('curriculumData');
      if (raw) {
        try { curCache = JSON.parse(raw); } catch {}
      }
    }

    if (curCache && curCache.grades && curCache.grades.length > 0) {
      setData({
        grades: (curCache.grades || []).filter(g => !MOCK_IDS.has(g.id)).sort(naturalSort),
        subjects: (curCache.subjects || []).filter(s => !MOCK_IDS.has(s.id)).sort(naturalSort),
        units: (curCache.units || []).filter(u => !MOCK_IDS.has(u.id)).sort(naturalSort),
        topics: (curCache.topics || []).filter(t => !MOCK_IDS.has(t.id)).sort(naturalSort),
        tests: (curCache.tests || []).filter(t => !MOCK_IDS.has(t.id))
      });
    }

    // Fetch latest from Supabase only if forced or 60m cache expired
    if (!force && isCacheValid('curriculum', 60) && curCache && curCache.grades?.length > 0) {
      return;
    }

    if (isSupabaseConfigured()) {
      const dbCurData = await dbGetCurriculum();
      if (dbCurData && dbCurData.grades && dbCurData.grades.length > 0) {
        touchCache('curriculum');
        setData({
          grades: (dbCurData.grades || []).sort(naturalSort),
          subjects: (dbCurData.subjects || []).sort(naturalSort),
          units: (dbCurData.units || []).sort(naturalSort),
          topics: (dbCurData.topics || []).sort(naturalSort),
          tests: dbCurData.tests || []
        });
      }
    }
  };

  useEffect(() => {
    syncCurriculum(false);

    if (!isSupabaseConfigured() || !supabase) return;

    // Real-time synchronization: Instant updates when curriculum is edited
    const curChannel = supabase
      .channel('realtime_curriculum_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grades' }, () => syncCurriculum(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, () => syncCurriculum(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => syncCurriculum(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topics' }, () => syncCurriculum(true))
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(curChannel);
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (data.grades.length > 0) {
      try {
        localStorage.setItem('eTestCurriculum', JSON.stringify(data));
        localStorage.setItem('curriculumData', JSON.stringify(data));
      } catch {}
      idbSetPayload('eTestCurriculum_Cache', JSON.stringify(data)).catch(e => console.warn('IDB save failed:', e));
    }
  }, [data]);

  const addGrade = async (name) => {
    if (!name || !name.trim()) return;
    const newGrade = { id: generateUniqueId('g'), name: name.trim() };
    setData(prev => {
      const exists = (prev.grades || []).some(g => g.name.toLowerCase() === name.trim().toLowerCase());
      if (exists) return prev;
      return { ...prev, grades: [...(prev.grades || []), newGrade].sort(naturalSort) };
    });
    await dbAddGrade(newGrade);
  };

  const updateGrade = async (id, name) => {
    if (!id || !name || !name.trim()) return;
    const trimmed = name.trim();
    setData(prev => ({
      ...prev,
      grades: (prev.grades || []).map(g => g.id === id ? { ...g, name: trimmed } : g).sort(naturalSort)
    }));
    await dbAddGrade({ id, name: trimmed });
  };

  const addSubject = async (gradeId, name) => {
    if (!name || !name.trim()) return;
    const newSubject = { id: generateUniqueId('s'), gradeId, name: name.trim() };
    setData(prev => ({ ...prev, subjects: [...(prev.subjects || []), newSubject].sort(naturalSort) }));
    await dbAddSubject(newSubject);
  };

  const updateSubject = async (id, name) => {
    if (!id || !name || !name.trim()) return;
    const trimmed = name.trim();
    let currentGradeId = '';
    setData(prev => {
      const existing = (prev.subjects || []).find(s => s.id === id);
      if (existing) currentGradeId = existing.gradeId;
      return {
        ...prev,
        subjects: (prev.subjects || []).map(s => s.id === id ? { ...s, name: trimmed } : s).sort(naturalSort)
      };
    });
    await dbAddSubject({ id, gradeId: currentGradeId, name: trimmed });
  };

  const addUnit = async (subjectId, name) => {
    if (!name || !name.trim()) return;
    const newUnit = { id: generateUniqueId('u'), subjectId, name: name.trim() };
    setData(prev => ({ ...prev, units: [...(prev.units || []), newUnit].sort(naturalSort) }));
    await dbAddUnit(newUnit);
  };

  const updateUnit = async (id, name) => {
    if (!id || !name || !name.trim()) return;
    const trimmed = name.trim();
    let currentSubjectId = '';
    setData(prev => {
      const existing = (prev.units || []).find(u => u.id === id);
      if (existing) currentSubjectId = existing.subjectId;
      return {
        ...prev,
        units: (prev.units || []).map(u => u.id === id ? { ...u, name: trimmed } : u).sort(naturalSort)
      };
    });
    await dbAddUnit({ id, subjectId: currentSubjectId, name: trimmed });
  };

  const addTopic = async (unitId, name) => {
    if (!name || !name.trim()) return;
    const newTopic = { id: generateUniqueId('t'), unitId, name: name.trim() };
    setData(prev => ({ ...prev, topics: [...(prev.topics || []), newTopic].sort(naturalSort) }));
    await dbAddTopic(newTopic);
  };

  const updateTopic = async (id, name) => {
    if (!id || !name || !name.trim()) return;
    const trimmed = name.trim();
    let currentUnitId = '';
    setData(prev => {
      const existing = (prev.topics || []).find(t => t.id === id);
      if (existing) currentUnitId = existing.unitId;
      return {
        ...prev,
        topics: (prev.topics || []).map(t => t.id === id ? { ...t, name: trimmed } : t).sort(naturalSort)
      };
    });
    await dbAddTopic({ id, unitId: currentUnitId, name: trimmed });
  };

  const updateItem = async (type, id, name) => {
    if (type === 'grades') await updateGrade(id, name);
    else if (type === 'subjects') await updateSubject(id, name);
    else if (type === 'units') await updateUnit(id, name);
    else if (type === 'topics') await updateTopic(id, name);
  };

  const addTest = (test) => {
    const newTest = { id: generateUniqueId('test'), ...test, date: new Date().toISOString() };
    setData(prev => ({ ...prev, tests: [...(prev.tests || []), newTest] }));
  };

  const updateTest = (id, testData) => {
    setData(prev => ({
      ...prev,
      tests: (prev.tests || []).map(t => t.id === id ? { ...t, ...testData } : t)
    }));
  };

  const deleteItem = async (type, id) => {
    setData(prev => {
      const newData = { ...prev };
      newData[type] = (newData[type] || []).filter(item => item.id !== id);
      return newData;
    });

    if (type === 'grades') await dbDeleteGrade(id);
    if (type === 'subjects') await dbDeleteSubject(id);
    if (type === 'units') await dbDeleteUnit(id);
    if (type === 'topics') await dbDeleteTopic(id);
  };

  const bulkAddCurriculum = async (jsonData) => {
    if (!Array.isArray(jsonData)) return;

    const newGrades = [];
    const newSubjects = [];
    const newUnits = [];
    const newTopics = [];

    jsonData.forEach(g => {
      if (!g.grade) return;
      const gId = generateUniqueId('g');
      newGrades.push({ id: gId, name: g.grade.trim() });

      if (Array.isArray(g.subjects)) {
        g.subjects.forEach(s => {
          if (!s.name) return;
          const sId = generateUniqueId('s');
          newSubjects.push({ id: sId, gradeId: gId, name: s.name.trim() });

          if (Array.isArray(s.units)) {
            s.units.forEach(u => {
              if (!u.name) return;
              const uId = generateUniqueId('u');
              newUnits.push({ id: uId, subjectId: sId, name: u.name.trim() });

              if (Array.isArray(u.topics)) {
                u.topics.forEach(t => {
                  const tName = typeof t === 'string' ? t : t.name;
                  if (!tName) return;
                  const tId = generateUniqueId('t');
                  newTopics.push({ id: tId, unitId: uId, name: tName.trim() });
                });
              }
            });
          }
        });
      }
    });

    setData(prev => ({
      ...prev,
      grades: [...(prev.grades || []), ...newGrades].sort(naturalSort),
      subjects: [...(prev.subjects || []), ...newSubjects].sort(naturalSort),
      units: [...(prev.units || []), ...newUnits].sort(naturalSort),
      topics: [...(prev.topics || []), ...newTopics].sort(naturalSort)
    }));

    // Perform DB insertions in background
    for (const g of newGrades) await dbAddGrade(g);
    for (const s of newSubjects) await dbAddSubject(s);
    for (const u of newUnits) await dbAddUnit(u);
    for (const t of newTopics) await dbAddTopic(t);
  };

  const value = useMemo(() => ({
    data,
    addGrade,
    updateGrade,
    addSubject,
    updateSubject,
    addUnit,
    updateUnit,
    addTopic,
    updateTopic,
    updateItem,
    addTest,
    updateTest,
    deleteItem,
    bulkAddCurriculum
  }), [data]);

  return (
    <CurriculumContext.Provider value={value}>
      {children}
    </CurriculumContext.Provider>
  );
}
