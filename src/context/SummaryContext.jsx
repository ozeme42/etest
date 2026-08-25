import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbGetSummaries, dbSaveSummary, dbDeleteSummary } from '../services/supabaseService';
import { idbSetPayload, idbGetPayload } from '../services/indexedDbService';

const SummaryContext = createContext();

export function useSummaries() {
  const context = useContext(SummaryContext);
  if (!context) {
    return {
      summaries: [],
      isLoading: false,
      saveSummary: async () => {},
      deleteSummary: async () => {},
      getSummary: () => null,
      hasSummary: () => false,
      getSummariesBySubject: () => [],
      getSummariesByUnit: () => [],
      isSummaryRead: () => false,
      toggleSummaryRead: () => false,
      readMap: {}
    };
  }
  return context;
}

const CACHE_KEY = 'eTest_Curriculum_Summaries_Cache';

export function SummaryProvider({ children }) {
  const [summaries, setSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial Load: IndexedDB fast cache + Supabase DB fetch
  useEffect(() => {
    let isMounted = true;

    async function initSummaries() {
      setIsLoading(true);
      try {
        // Load local cache first for zero-latency UI
        const cached = await idbGetPayload(CACHE_KEY);
        if (cached && isMounted) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSummaries(parsed);
            }
          } catch (e) {}
        }
      } catch (e) {
        console.warn('IDB summary cache read failed', e);
      }

      // Fetch from Supabase if cache expired
      const lastSync = sessionStorage.getItem('eTestLastSummariesSync');
      const now = Date.now();
      if (lastSync && now - Number(lastSync) < 15 * 60 * 1000) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const remote = await dbGetSummaries();
        if (remote && isMounted) {
          sessionStorage.setItem('eTestLastSummariesSync', String(now));
          setSummaries(prev => {
            const map = new Map();
            // Remote first
            remote.forEach(s => map.set(String(s.targetId || s.id), s));
            // Keep any local unsynced
            let hasLocalOnly = false;
            prev.forEach(s => {
              const key = String(s.targetId || s.id);
              if (!map.has(key)) {
                map.set(key, s);
                hasLocalOnly = true;
              }
            });
            const merged = Array.from(map.values());
            idbSetPayload(CACHE_KEY, JSON.stringify(merged)).catch(() => {});

            // Auto-backup local summaries to cloud if any exist
            if (hasLocalOnly && merged.length > 0) {
              dbSaveSummary(merged[0], merged).catch(() => {});
            }

            return merged;
          });
        }
      } catch (err) {
        console.warn('Supabase summary fetch error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSummaries();
    return () => { isMounted = false; };
  }, []);

  // Save / Update summary
  const saveSummary = async (summaryData) => {
    if (!summaryData || (!summaryData.targetId && !summaryData.id)) return null;

    const targetIdStr = String(summaryData.targetId || summaryData.id);
    const summaryId = String(summaryData.id || `sum_${summaryData.targetType || 'item'}_${targetIdStr}`);

    const newSummary = {
      id: summaryId,
      targetType: summaryData.targetType || 'topic',
      targetId: targetIdStr,
      gradeId: summaryData.gradeId || null,
      subjectId: summaryData.subjectId || null,
      unitId: summaryData.unitId || null,
      topicId: summaryData.topicId || (summaryData.targetType === 'topic' ? targetIdStr : null),
      title: summaryData.title || '',
      contentHtml: summaryData.contentHtml || '',
      authorName: summaryData.authorName || 'Öğretmen',
      updatedAt: new Date().toISOString()
    };

    let nextList = [];
    setSummaries(prev => {
      const filtered = prev.filter(s => String(s.targetId) !== targetIdStr && String(s.id) !== summaryId);
      nextList = [newSummary, ...filtered];
      idbSetPayload(CACHE_KEY, JSON.stringify(nextList)).catch(() => {});
      return nextList;
    });

    try {
      await dbSaveSummary(newSummary, nextList);
    } catch (e) {
      console.warn('Failed to save summary to remote DB:', e);
    }

    return newSummary;
  };

  // Delete summary
  const deleteSummary = async (targetId) => {
    if (!targetId) return;
    const targetIdStr = String(targetId);

    let nextList = [];
    setSummaries(prev => {
      nextList = prev.filter(s => String(s.targetId) !== targetIdStr && String(s.id) !== targetIdStr);
      idbSetPayload(CACHE_KEY, JSON.stringify(nextList)).catch(() => {});
      return nextList;
    });

    try {
      await dbDeleteSummary(targetIdStr, nextList);
    } catch (e) {
      console.warn('Failed to delete summary from remote DB:', e);
    }
  };

  // Helper selectors
  const getSummary = (targetType, targetId) => {
    if (!targetId) return null;
    const targetIdStr = String(targetId);
    return summaries.find(s =>
      String(s.targetId) === targetIdStr ||
      String(s.id) === targetIdStr ||
      (targetType && s.targetType === targetType && String(s.targetId) === targetIdStr)
    ) || null;
  };

  const hasSummary = (targetType, targetId) => {
    const found = getSummary(targetType, targetId);
    return Boolean(found && found.contentHtml && found.contentHtml.trim().length > 0);
  };

  const getSummariesBySubject = (subjectId) => {
    if (!subjectId) return [];
    const subjIdStr = String(subjectId);
    return summaries.filter(s => String(s.subjectId) === subjIdStr);
  };

  const getSummariesByUnit = (unitId) => {
    if (!unitId) return [];
    const unitIdStr = String(unitId);
    return summaries.filter(s => String(s.unitId) === unitIdStr || (s.targetType === 'unit' && String(s.targetId) === unitIdStr));
  };

  // Read / Okundu State Management per student
  const [readMap, setReadMap] = useState(() => {
    try {
      const saved = localStorage.getItem('eTest_Read_Summaries_All');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {};
  });

  const getSummaryKey = (targetType, targetId) => `${targetType || 'item'}_${targetId}`;

  const isSummaryRead = (targetType, targetId, studentId = 'default') => {
    if (!targetId) return false;
    const stId = String(studentId || 'default');
    const key = getSummaryKey(targetType, targetId);
    const userReadList = readMap[stId] || [];
    return userReadList.includes(key) || userReadList.includes(String(targetId));
  };

  const toggleSummaryRead = (targetType, targetId, studentId = 'default') => {
    if (!targetId) return false;
    const stId = String(studentId || 'default');
    const key = getSummaryKey(targetType, targetId);

    let nextIsRead = false;
    setReadMap(prev => {
      const userList = prev[stId] ? [...prev[stId]] : [];
      const idx = userList.indexOf(key);
      const idIdx = userList.indexOf(String(targetId));

      let updatedUserList;
      if (idx >= 0 || idIdx >= 0) {
        updatedUserList = userList.filter(k => k !== key && k !== String(targetId));
        nextIsRead = false;
      } else {
        updatedUserList = [...userList, key];
        nextIsRead = true;
      }

      const updatedMap = { ...prev, [stId]: updatedUserList };
      try {
        localStorage.setItem('eTest_Read_Summaries_All', JSON.stringify(updatedMap));
        localStorage.setItem(`eTest_Read_Summaries_${stId}`, JSON.stringify(updatedUserList));
      } catch {}
      return updatedMap;
    });

    window.dispatchEvent(new CustomEvent('summary_read_changed', { detail: { targetType, targetId, studentId: stId } }));
    return nextIsRead;
  };

  return (
    <SummaryContext.Provider value={{
      summaries,
      isLoading,
      saveSummary,
      deleteSummary,
      getSummary,
      hasSummary,
      getSummariesBySubject,
      getSummariesByUnit,
      isSummaryRead,
      toggleSummaryRead,
      readMap
    }}>
      {children}
    </SummaryContext.Provider>
  );
}
