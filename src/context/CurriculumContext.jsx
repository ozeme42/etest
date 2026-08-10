import { createContext, useContext, useState, useEffect } from 'react';
import {
  dbGetCurriculum,
  dbAddGrade,
  dbDeleteGrade,
  dbAddSubject,
  dbDeleteSubject,
  dbAddUnit,
  dbAddTopic
} from '../services/supabaseService';

const CurriculumContext = createContext();

export function useCurriculum() {
  return useContext(CurriculumContext);
}

const INITIAL_DATA = {
  grades: [],
  subjects: [],
  units: [],
  topics: [],
  tests: []
};

const MOCK_IDS = new Set(['g1', 'g2', 's1', 's2', 'u1', 't1']);

const generateUniqueId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

export function CurriculumProvider({ children }) {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('eTestCurriculum');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        grades: (parsed.grades || []).filter(g => !MOCK_IDS.has(g.id)),
        subjects: (parsed.subjects || []).filter(s => !MOCK_IDS.has(s.id)),
        units: (parsed.units || []).filter(u => !MOCK_IDS.has(u.id)),
        topics: (parsed.topics || []).filter(t => !MOCK_IDS.has(t.id)),
        tests: (parsed.tests || []).filter(t => !MOCK_IDS.has(t.id))
      };
    }
    return INITIAL_DATA;
  });

  useEffect(() => {
    async function syncCurriculumFromSupabase() {
      const dbCurData = await dbGetCurriculum();
      if (dbCurData && dbCurData.grades.length > 0) {
        setData(dbCurData);
      }
    }
    syncCurriculumFromSupabase();
  }, []);

  useEffect(() => {
    localStorage.setItem('eTestCurriculum', JSON.stringify(data));
  }, [data]);

  const addGrade = async (name) => {
    if (!name || !name.trim()) return;
    const newGrade = { id: generateUniqueId('g'), name: name.trim() };
    setData(prev => {
      const exists = (prev.grades || []).some(g => g.name.toLowerCase() === name.trim().toLowerCase());
      if (exists) return prev;
      return { ...prev, grades: [...(prev.grades || []), newGrade] };
    });
    await dbAddGrade(newGrade);
  };

  const addSubject = async (gradeId, name) => {
    if (!name || !name.trim()) return;
    const newSubject = { id: generateUniqueId('s'), gradeId, name: name.trim() };
    setData(prev => ({ ...prev, subjects: [...(prev.subjects || []), newSubject] }));
    await dbAddSubject(newSubject);
  };

  const addUnit = async (subjectId, name) => {
    if (!name || !name.trim()) return;
    const newUnit = { id: generateUniqueId('u'), subjectId, name: name.trim() };
    setData(prev => ({ ...prev, units: [...(prev.units || []), newUnit] }));
    await dbAddUnit(newUnit);
  };

  const addTopic = async (unitId, name) => {
    if (!name || !name.trim()) return;
    const newTopic = { id: generateUniqueId('t'), unitId, name: name.trim() };
    setData(prev => ({ ...prev, topics: [...(prev.topics || []), newTopic] }));
    await dbAddTopic(newTopic);
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
      grades: [...(prev.grades || []), ...newGrades],
      subjects: [...(prev.subjects || []), ...newSubjects],
      units: [...(prev.units || []), ...newUnits],
      topics: [...(prev.topics || []), ...newTopics]
    }));

    // Perform DB insertions in background
    for (const g of newGrades) await dbAddGrade(g);
    for (const s of newSubjects) await dbAddSubject(s);
    for (const u of newUnits) await dbAddUnit(u);
    for (const t of newTopics) await dbAddTopic(t);
  };

  return (
    <CurriculumContext.Provider value={{
      data,
      addGrade,
      addSubject,
      addUnit,
      addTopic,
      addTest,
      updateTest,
      deleteItem,
      bulkAddCurriculum
    }}>
      {children}
    </CurriculumContext.Provider>
  );
}
