import { createContext, useContext, useState, useEffect } from 'react';

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
      // Clean old hardcoded mock items (g1, g2, s1, s2)
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
    localStorage.setItem('eTestCurriculum', JSON.stringify(data));
  }, [data]);

  const addGrade = (name) => {
    if (!name || !name.trim()) return;
    const newGrade = { id: generateUniqueId('g'), name: name.trim() };
    setData(prev => {
      const exists = (prev.grades || []).some(g => g.name.toLowerCase() === name.trim().toLowerCase());
      if (exists) return prev;
      return { ...prev, grades: [...(prev.grades || []), newGrade] };
    });
  };

  const addSubject = (gradeId, name) => {
    if (!name || !name.trim()) return;
    const newSubject = { id: generateUniqueId('s'), gradeId, name: name.trim() };
    setData(prev => ({ ...prev, subjects: [...(prev.subjects || []), newSubject] }));
  };

  const addUnit = (subjectId, name) => {
    if (!name || !name.trim()) return;
    const newUnit = { id: generateUniqueId('u'), subjectId, name: name.trim() };
    setData(prev => ({ ...prev, units: [...(prev.units || []), newUnit] }));
  };

  const addTopic = (unitId, name) => {
    if (!name || !name.trim()) return;
    const newTopic = { id: generateUniqueId('t'), unitId, name: name.trim() };
    setData(prev => ({ ...prev, topics: [...(prev.topics || []), newTopic] }));
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

  const deleteItem = (type, id) => {
    setData(prev => {
      const newData = { ...prev };
      if (newData[type]) {
        newData[type] = newData[type].filter(item => item.id !== id);
      }
      return newData;
    });
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
      deleteItem
    }}>
      {children}
    </CurriculumContext.Provider>
  );
}
