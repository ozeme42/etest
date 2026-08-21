import { useState, useMemo, useCallback } from 'react';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';
import { checkIsAnswerCorrect, normalizeAnswerIndex } from '../../../utils/answerEvaluation';

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
    sections.forEach((s, sIdx) => { 
      map[s.id] = {}; 
      if (s.id !== String(sIdx)) map[sIdx] = {};
    });

    if (submission?.teacherScores && typeof submission.teacherScores === 'object') {
      Object.entries(submission.teacherScores).forEach(([k, v]) => {
        if (v && typeof v === 'object') map[k] = { ...(map[k] || {}), ...v };
      });
    }

    const rawAns = submission?.answers || submission?.formattedAnswers || [];
    if (Array.isArray(rawAns)) {
      rawAns.forEach((a, idx) => {
        const sId = a.sectionId || sections[0]?.id || 'sec_1';
        const qNo = a.questionNoInSection || (idx + 1);
        if (!map[sId]) map[sId] = {};
        if (map[sId][qNo] !== undefined) return;
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
    sections.forEach((s, sIdx) => { 
      map[s.id] = {}; 
      if (s.id !== String(sIdx)) map[sIdx] = {};
    });

    if (submission?.teacherNotes && typeof submission.teacherNotes === 'object') {
      Object.entries(submission.teacherNotes).forEach(([k, v]) => {
        if (v && typeof v === 'object') map[k] = { ...(map[k] || {}), ...v };
      });
    }

    const rawAns = submission?.answers || submission?.formattedAnswers || [];
    if (Array.isArray(rawAns)) {
      rawAns.forEach((a, idx) => {
        const sId = a.sectionId || sections[0]?.id || 'sec_1';
        const qNo = a.questionNoInSection || (idx + 1);
        if (!map[sId]) map[sId] = {};
        if (map[sId][qNo] !== undefined) return;
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

      let updatedAnswers = [];

      if (sections && sections.length > 0) {
        let globalNo = 1;
        updatedAnswers = sections.flatMap((sec, sIdx) => {
          const sId = sec.id || `sec_${sIdx + 1}`;
          const secQs = sec.questions || sec.resolvedQuestions || [];
          const count = sec.qCount || secQs.length || 1;
          const sa = (submission.sections && (submission.sections[sId] || submission.sections[sIdx] || submission.sections[String(sIdx)])) || {};

          return Array.from({ length: count }).map((_, qIdx) => {
            const qNo = qIdx + 1;
            const currentGlobalNo = globalNo++;
            const existingAns = (Array.isArray(rawAns) ? rawAns.find(a => 
              (String(a.sectionId) === String(sId) && Number(a.questionNoInSection || a.questionNo) === qNo) ||
              Number(a.questionNo) === currentGlobalNo
            ) : null) || {};

            const userAns = sa.answers?.[qNo] ?? sa.answers?.[String(qNo)] ?? existingAns.userAnswer;
            const textAns = sa.openEndedText?.[qNo] ?? sa.openEndedText?.[String(qNo)] ?? existingAns.userAnswerText;

            const score = teacherScores[sId]?.[qNo] ?? teacherScores[sIdx]?.[qNo] ?? existingAns.score;
            const note = teacherNotes[sId]?.[qNo] ?? teacherNotes[sIdx]?.[qNo] ?? existingAns.teacherNote ?? '';

            totalMax += 10;
            let isCorrect = existingAns.isCorrect;

            if (score !== undefined && score !== null && score !== 'empty') {
              const numSc = Number(score);
              totalEarned += numSc;
              isCorrect = numSc >= 5;
              if (isCorrect) correct++; else wrong++;
            } else if (score === 'empty' || (userAns === null && !textAns)) {
              blank++;
            } else {
              const u = normalizeAnswerIndex(userAns);
              if (u === null && !textAns) {
                blank++;
              } else {
                const qObj = secQs[qIdx] || {};
                let isRight = checkIsAnswerCorrect(u, qObj.raw || qObj, sec.raw || sec, qNo);
                if (isRight === null) {
                  const cAns = (Array.isArray(sec.correctAnswers) && sec.correctAnswers[qIdx] !== undefined)
                    ? sec.correctAnswers[qIdx]
                    : (qObj.correctAnswer ?? qObj.answer ?? qObj.correctOption ?? sec.answerKey?.[qIdx] ?? sec.raw?.answerKey?.[qIdx]);
                  if (cAns !== undefined && cAns !== null) {
                    const normC = normalizeAnswerIndex(cAns);
                    isRight = normC !== null ? (u === normC) : null;
                  }
                }

                if (isRight === true) {
                  totalEarned += 10;
                  isCorrect = true;
                  correct++;
                } else if (isRight === false) {
                  isCorrect = false;
                  wrong++;
                } else {
                  totalEarned += 10;
                  isCorrect = true;
                  correct++;
                }
              }
            }

            return {
              ...existingAns,
              sectionId: sId,
              sectionTitle: sec.title,
              questionNo: currentGlobalNo,
              questionNoInSection: qNo,
              userAnswer: userAns !== undefined ? userAns : null,
              userAnswerText: textAns || null,
              score: score !== undefined ? score : (isCorrect ? 10 : 0),
              isCorrect,
              teacherNote: note,
              evaluatedByTeacher: true,
              evaluatedAt: new Date().toISOString()
            };
          });
        });
      } else if (Array.isArray(rawAns) && rawAns.length > 0) {
        updatedAnswers = rawAns.map((a, idx) => {
          const sId = a.sectionId || 'sec_1';
          const qNo = a.questionNoInSection || (idx + 1);
          const score = teacherScores[sId]?.[qNo] ?? a.score;
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
          } else {
            correct++;
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
      }

      const finalScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
      const patch = {
        answers: updatedAnswers,
        teacherScores,
        teacherNotes,
        score: finalScore,
        scorePercentage: finalScore,
        rawScore: totalEarned,
        maxScore: totalMax,
        correctCount: correct,
        wrongCount: wrong,
        blankCount: blank,
        isEvaluated: true,
        isEvaluatedByTeacher: true,
        evaluatedAt: new Date().toISOString(),
        teacherFeedback: overallFeedback,
        teacherNote: overallFeedback,
        status: 'evaluated'
      };

      if (updateSubmission) {
        await updateSubmission(submission.id, patch);
      }
      if (updateHomeworkSubmission && (submission.hwId || submission.testId || submission.homeworkId)) {
        await updateHomeworkSubmission(submission.hwId || submission.testId || submission.homeworkId, submission.studentId || submission.userId, patch);
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
