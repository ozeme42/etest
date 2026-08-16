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
      getSummariesByUnit: () => []
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

      // Fetch from Supabase
      try {
        const remote = await dbGetSummaries();
        if (remote && isMounted) {
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

  return (
    <SummaryContext.Provider value={{
      summaries,
      isLoading,
      saveSummary,
      deleteSummary,
      getSummary,
      hasSummary,
      getSummariesBySubject,
      getSummariesByUnit
    }}>
      {children}
    </SummaryContext.Provider>
  );
}
