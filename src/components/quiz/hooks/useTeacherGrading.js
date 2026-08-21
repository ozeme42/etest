import { useState, useMemo, useCallback } from 'react';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';

/**
 * useTeacherGrading
 * Manages teacher scoring, question feedback notes, overall comments, and saving to backend.
 */
export function useTeacherGrading({ submission, test, sections = [] }) {
  const { updateSubmission } = useEvaluation();
  const { updateHomeworkSubmission } = useHomework();

  // 1. Initial scores map: { [secId]: { [qNo]: score } }
  const [teacherScores, setTeacherScores] = useState(() => {
    const map = {};
    sections.forEach(s => { map[s.id] = {}; });
    const rawAns = submission?.answers || submission?.formattedAnswers || [];

    if (Array.isArray(rawAns)) {
      rawAns.forEach((a, idx) => {
        const sId = a.sectionId || sections[0]?.id || 'sec_1';
        const qNo = a.questionNoInSection || (idx + 1);
        if (!map[sId]) map[sId] = {};
        if (a.score !== undefined && a.score !== null) {
          map[sId][qNo] = typeof a.score === 'number' ? a.score : Number(a.score);
        } else if (a.isCorrect === true) {
          map[sId][qNo] = 10;
        } else if (a.isCorrect === false) {
          map[sId][qNo] = 0;
        }
      });
    }
    return map;
  });

  // 2. Initial notes map: { [secId]: { [qNo]: note } }
  const [teacherNotes, setTeacherNotes] = useState(() => {
    const map = {};
    sections.forEach(s => { map[s.id] = {}; });
    const rawAns = submission?.answers || submission?.formattedAnswers || [];

    if (Array.isArray(rawAns)) {
      rawAns.forEach((a, idx) => {
        const sId = a.sectionId || sections[0]?.id || 'sec_1';
        const qNo = a.questionNoInSection || (idx + 1);
        if (!map[sId]) map[sId] = {};
        if (a.teacherNote || a.teacher_note || a.feedback) {
          map[sId][qNo] = a.teacherNote || a.teacher_note || a.feedback;
        }
      });
    }
    return map;
  });

  const [overallFeedback, setOverallFeedback] = useState(submission?.teacherFeedback || submission?.teacherNote || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleScoreChange = useCallback((secId, qNo, score) => {
    setTeacherScores(prev => ({
      ...prev,
      [secId]: {
        ...(prev[secId] || {}),
        [qNo]: score
      }
    }));
  }, []);

  const handleNoteChange = useCallback((secId, qNo, note) => {
    setTeacherNotes(prev => ({
      ...prev,
      [secId]: {
        ...(prev[secId] || {}),
        [qNo]: note
      }
    }));
  }, []);

  const saveGrading = async () => {
    if (!submission?.id) return;
    setIsSaving(true);
    try {
      const rawAns = submission?.answers || submission?.formattedAnswers || [];
      let totalEarned = 0;
      let totalMax = 0;
      let correct = 0;
      let wrong = 0;
      let blank = 0;

      const updatedAnswers = rawAns.map((a, idx) => {
        const sId = a.sectionId || sections[0]?.id || 'sec_1';
        const qNo = a.questionNoInSection || (idx + 1);
        const score = teacherScores[sId]?.[qNo];
        const note = teacherNotes[sId]?.[qNo] || a.teacherNote || '';

        totalMax += 10;
        let isCorrect = a.isCorrect;

        if (score !== undefined && score !== null && score !== 'empty') {
          const numSc = Number(score);
          totalEarned += numSc;
          isCorrect = numSc >= 5;
          if (isCorrect) correct++; else wrong++;
        } else if (score === 'empty' || (!a.userAnswer && !a.userAnswerText)) {
          blank++;
        } else if (isCorrect === true) {
          totalEarned += 10;
          correct++;
        } else if (isCorrect === false) {
          wrong++;
        }

        return {
          ...a,
          score: score !== undefined ? score : (isCorrect ? 10 : 0),
          isCorrect,
          teacherNote: note,
          evaluatedByTeacher: true,
          evaluatedAt: new Date().toISOString()
        };
      });

      const finalScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
      const patch = {
        answers: updatedAnswers,
        score: finalScore,
        correctCount: correct,
        wrongCount: wrong,
        blankCount: blank,
        isEvaluatedByTeacher: true,
        evaluatedAt: new Date().toISOString(),
        teacherFeedback: overallFeedback,
        status: 'evaluated'
      };

      if (updateSubmission) {
        await updateSubmission(submission.id, patch);
      }
      if (updateHomeworkSubmission && (submission.hwId || submission.testId)) {
        await updateHomeworkSubmission(submission.hwId || submission.testId, submission.studentId, patch);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return {
    teacherScores,
    teacherNotes,
    overallFeedback,
    setOverallFeedback,
    handleScoreChange,
    handleNoteChange,
    saveGrading,
    isSaving
  };
}
