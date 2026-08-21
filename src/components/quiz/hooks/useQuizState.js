import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useQuizState
 * Manages quiz answer state (Multiple Choice & Open Ended), local storage drafts, auto-saving, and countdown timer.
 */
export function useQuizState({
  testId,
  sections = [],
  draftAnswers = [],
  timePerQuestion = 2,
  onAutoSave = null,
  isReviewMode = false
}) {
  const draftKey = `draft_quiz_${testId || 'test'}`;

  // 1. Initial State construction from sections & drafts
  const [sectionAnswers, setSectionAnswers] = useState(() => {
    const initialMap = {};
    sections.forEach(sec => {
      initialMap[sec.id] = { answers: {}, openEndedText: {} };
    });

    if (draftAnswers && Array.isArray(draftAnswers) && draftAnswers.length > 0) {
      draftAnswers.forEach(a => {
        const secId = a.sectionId || sections[0]?.id || 'sec_1';
        if (!initialMap[secId]) initialMap[secId] = { answers: {}, openEndedText: {} };
        const qNo = Number(a.questionNoInSection || a.questionNo || 1);

        if (a.userAnswer !== null && a.userAnswer !== undefined && a.userAnswer !== '') {
          initialMap[secId].answers[qNo] = typeof a.userAnswer === 'object' ? a.userAnswer.userAnswer : a.userAnswer;
        }
        if (a.userAnswerText) {
          initialMap[secId].openEndedText[qNo] = a.userAnswerText;
        }
      });
      return initialMap;
    }

    try {
      const saved = localStorage.getItem(`${draftKey}_ans`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...initialMap, ...parsed };
        }
      }
    } catch {}

    return initialMap;
  });

  // 2. Countdown Timer
  const totalQuestions = sections.reduce((sum, s) => sum + (s.qCount || s.resolvedQuestions?.length || 1), 0);
  const totalSeconds = Math.max(60, totalQuestions * (Number(timePerQuestion) || 2) * 60);

  const [timeLeft, setTimeLeft] = useState(() => {
    if (isReviewMode) return 0;
    try {
      const saved = localStorage.getItem(`${draftKey}_time`);
      if (saved) {
        const num = Number(saved);
        if (!isNaN(num) && num > 0) return num;
      }
    } catch {}
    return totalSeconds;
  });

  useEffect(() => {
    if (isReviewMode) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        const next = prev - 1;
        try { localStorage.setItem(`${draftKey}_time`, String(next)); } catch {}
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [draftKey, isReviewMode]);

  // 3. Debounced Auto-Save
  const saveTimeoutRef = useRef(null);

  const triggerAutoSave = useCallback((currentAnswers) => {
    if (isReviewMode || !onAutoSave) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      const formatted = [];
      let gNo = 1;
      sections.forEach(sec => {
        const sa = currentAnswers[sec.id] || {};
        const count = sec.qCount || sec.resolvedQuestions?.length || 1;
        for (let i = 1; i <= count; i++) {
          formatted.push({
            questionId: sec.resolvedQuestions?.[i - 1]?.id || `${sec.id}_${i}`,
            questionNo: gNo++,
            questionNoInSection: i,
            sectionId: sec.id,
            userAnswer: sa.answers?.[i] ?? null,
            userAnswerText: sa.openEndedText?.[i] ?? null
          });
        }
      });
      onAutoSave(formatted);
    }, 1000);
  }, [isReviewMode, onAutoSave, sections]);

  // 4. Update handlers
  const handleSelectOption = useCallback((secId, qNo, optIdx) => {
    if (isReviewMode) return;
    setSectionAnswers(prev => {
      const secState = prev[secId] || { answers: {}, openEndedText: {} };
      const currentAns = secState.answers?.[qNo];
      const newAnswers = { ...secState.answers };

      if (currentAns === optIdx) {
        delete newAnswers[qNo];
      } else {
        newAnswers[qNo] = optIdx;
      }

      const updated = { ...prev, [secId]: { ...secState, answers: newAnswers } };
      try { localStorage.setItem(`${draftKey}_ans`, JSON.stringify(updated)); } catch {}
      triggerAutoSave(updated);
      return updated;
    });
  }, [draftKey, isReviewMode, triggerAutoSave]);

  const handleTextChange = useCallback((secId, qNo, text) => {
    if (isReviewMode) return;
    setSectionAnswers(prev => {
      const secState = prev[secId] || { answers: {}, openEndedText: {} };
      const updated = {
        ...prev,
        [secId]: {
          ...secState,
          openEndedText: {
            ...secState.openEndedText,
            [qNo]: text
          }
        }
      };
      try { localStorage.setItem(`${draftKey}_ans`, JSON.stringify(updated)); } catch {}
      triggerAutoSave(updated);
      return updated;
    });
  }, [draftKey, isReviewMode, triggerAutoSave]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`${draftKey}_ans`);
      localStorage.removeItem(`${draftKey}_time`);
    } catch {}
  }, [draftKey]);

  return {
    sectionAnswers,
    timeLeft,
    handleSelectOption,
    handleTextChange,
    clearDraft
  };
}
