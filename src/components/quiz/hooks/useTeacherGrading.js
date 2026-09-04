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

  // Helper to precompute ranges
  const secRanges = useMemo(() => {
    let acc = 0;
    return (sections || []).map((sec, sIdx) => {
      const qCount = sec.qCount || sec.questions?.length || sec.resolvedQuestions?.length || 1;
      const start = acc + 1;
      const end = acc + qCount;
      acc = end;
      return { sec, sIdx, start, end, qCount };
    });
  }, [sections]);

  // 1. Initial scores map: { [secId]: { [qNo]: score } }
  const [teacherScores, setTeacherScores] = useState(() => {
    const map = {};
    let runningCount = 0;
    const ranges = (sections || []).map((sec, sIdx) => {
      const qCount = sec.qCount || sec.questions?.length || sec.resolvedQuestions?.length || 1;
      const start = runningCount + 1;
      const end = runningCount + qCount;
      runningCount = end;

      map[sec.id] = {};
      map[sIdx] = {};
      map[String(sIdx)] = {};
      if (sec.raw?.id) map[sec.raw.id] = {};
      if (sec.raw?.questionId) map[sec.raw.questionId] = {};

      return { sec, sIdx, start, end, qCount };
    });

    const setScoreInMap = (sIdx, secId, rawId, qNo, scoreVal) => {
      const keys = [secId, sIdx, String(sIdx), rawId].filter(Boolean);
      keys.forEach(k => {
        if (!map[k]) map[k] = {};
        map[k][qNo] = scoreVal;
        map[k][String(qNo)] = scoreVal;
      });
    };

    // A. Load from submission.teacherScores
    if (submission?.teacherScores && typeof submission.teacherScores === 'object') {
      Object.entries(submission.teacherScores).forEach(([k, v]) => {
        if (v && typeof v === 'object') {
          // Nested map: { [secKey]: { [qNo]: score } }
          const targetSec = ranges.find(r => String(r.sec.id) === String(k) || String(r.sIdx) === String(k) || String(r.sec.raw?.id) === String(k));
          const sIdx = targetSec ? targetSec.sIdx : k;
          const secId = targetSec ? targetSec.sec.id : k;
          const rawId = targetSec?.sec.raw?.id;
          Object.entries(v).forEach(([qNo, score]) => {
            setScoreInMap(sIdx, secId, rawId, Number(qNo), score);
          });
        } else if (v !== undefined && v !== null) {
          // Flat map: { [globalQNo]: score }
          const globalQNo = Number(k);
          const matched = ranges.find(r => globalQNo >= r.start && globalQNo <= r.end);
          if (matched) {
            const localQNo = (globalQNo - matched.start) + 1;
            setScoreInMap(matched.sIdx, matched.sec.id, matched.sec.raw?.id, localQNo, v);
          }
        }
      });
    }

    // B. Load from submission.sections[...].teacherScores
    if (submission?.sections && typeof submission.sections === 'object') {
      Object.entries(submission.sections).forEach(([k, secObj]) => {
        if (secObj?.teacherScores && typeof secObj.teacherScores === 'object') {
          const matched = ranges.find(r => String(r.sec.id) === String(k) || String(r.sIdx) === String(k) || String(r.sec.raw?.id) === String(k));
          const sIdx = matched ? matched.sIdx : k;
          const secId = matched ? matched.sec.id : k;
          const rawId = matched?.sec.raw?.id;
          Object.entries(secObj.teacherScores).forEach(([qNo, score]) => {
            setScoreInMap(sIdx, secId, rawId, Number(qNo), score);
          });
        }
      });
    }

    // C. Load from submission.answers
    const rawAns = submission?.answers || submission?.formattedAnswers || submission?.raw_data?.answers || [];
    if (Array.isArray(rawAns)) {
      rawAns.forEach((a, idx) => {
        const globalNo = Number(a.questionNo || (idx + 1));
        let matched = null;
        if (globalNo && ranges.length > 0) {
          matched = ranges.find(r => globalNo >= r.start && globalNo <= r.end);
        }
        if (!matched && a.sectionIndex !== undefined && ranges[a.sectionIndex]) {
          matched = ranges[a.sectionIndex];
        }
        if (!matched && a.sectionId) {
          matched = ranges.find(r => String(r.sec.id) === String(a.sectionId) || String(r.sec.raw?.id) === String(a.sectionId));
        }
        if (!matched) {
          matched = ranges[0] || { sec: sections[0], sIdx: 0, start: 1, end: 1, qCount: 1 };
        }

        let qNo = Number(a.questionNoInSection);
        if (!qNo || isNaN(qNo) || qNo < 1 || qNo > matched.qCount) {
          qNo = (globalNo >= matched.start && globalNo <= matched.end) ? (globalNo - matched.start) + 1 : 1;
        }

        const isGraded = a.evaluatedByTeacher === true || Boolean(a.evaluatedAt) || (typeof a.score === 'number' && a.score > 0) || a.evalStatus === 'graded' || a.evalStatus === 'evaluated' || submission?.isEvaluatedByTeacher === true || submission?.isEvaluated === true;
        const isExplicitEmpty = a.evalStatus === 'empty' || a.score === 'empty' || (Number(a.score) === 0 && a.isCorrect === null && isGraded);

        if (isExplicitEmpty) {
          setScoreInMap(matched.sIdx, matched.sec.id, matched.sec.raw?.id, qNo, 'empty');
        } else if (a.score !== undefined && a.score !== null && (isGraded || a.score !== '')) {
          const val = typeof a.score === 'number' ? a.score : (a.score === 'empty' ? 'empty' : Number(a.score));
          setScoreInMap(matched.sIdx, matched.sec.id, matched.sec.raw?.id, qNo, val);
        } else if (a.teacherScore !== undefined && a.teacherScore !== null && (isGraded || a.teacherScore !== '')) {
          const val = typeof a.teacherScore === 'number' ? a.teacherScore : (a.teacherScore === 'empty' ? 'empty' : Number(a.teacherScore));
          setScoreInMap(matched.sIdx, matched.sec.id, matched.sec.raw?.id, qNo, val);
        }
      });
    }

    return map;
  });

  // 2. Initial notes map: { [secId]: { [qNo]: note } }
  const [teacherNotes, setTeacherNotes] = useState(() => {
    const map = {};
    let runningCount = 0;
    const ranges = (sections || []).map((sec, sIdx) => {
      const qCount = sec.qCount || sec.questions?.length || sec.resolvedQuestions?.length || 1;
      const start = runningCount + 1;
      const end = runningCount + qCount;
      runningCount = end;

      map[sec.id] = {};
      map[sIdx] = {};
      map[String(sIdx)] = {};
      if (sec.raw?.id) map[sec.raw.id] = {};
      if (sec.raw?.questionId) map[sec.raw.questionId] = {};

      return { sec, sIdx, start, end, qCount };
    });

    const setNoteInMap = (sIdx, secId, rawId, qNo, noteVal) => {
      const keys = [secId, sIdx, String(sIdx), rawId].filter(Boolean);
      keys.forEach(k => {
        if (!map[k]) map[k] = {};
        map[k][qNo] = noteVal;
        map[k][String(qNo)] = noteVal;
      });
    };

    if (submission?.teacherNotes && typeof submission.teacherNotes === 'object') {
      Object.entries(submission.teacherNotes).forEach(([k, v]) => {
        if (v && typeof v === 'object') {
          const targetSec = ranges.find(r => String(r.sec.id) === String(k) || String(r.sIdx) === String(k) || String(r.sec.raw?.id) === String(k));
          const sIdx = targetSec ? targetSec.sIdx : k;
          const secId = targetSec ? targetSec.sec.id : k;
          const rawId = targetSec?.sec.raw?.id;
          Object.entries(v).forEach(([qNo, note]) => {
            setNoteInMap(sIdx, secId, rawId, Number(qNo), String(note || ''));
          });
        } else if (v) {
          const globalQNo = Number(k);
          const matched = ranges.find(r => globalQNo >= r.start && globalQNo <= r.end);
          if (matched) {
            const localQNo = (globalQNo - matched.start) + 1;
            setNoteInMap(matched.sIdx, matched.sec.id, matched.sec.raw?.id, localQNo, String(v));
          }
        }
      });
    }

    const rawAns = submission?.answers || submission?.formattedAnswers || submission?.raw_data?.answers || [];
    if (Array.isArray(rawAns)) {
      rawAns.forEach((a, idx) => {
        const globalNo = Number(a.questionNo || (idx + 1));
        let matched = null;
        if (globalNo && ranges.length > 0) {
          matched = ranges.find(r => globalNo >= r.start && globalNo <= r.end);
        }
        if (!matched && a.sectionIndex !== undefined && ranges[a.sectionIndex]) {
          matched = ranges[a.sectionIndex];
        }
        if (!matched && a.sectionId) {
          matched = ranges.find(r => String(r.sec.id) === String(a.sectionId) || String(r.sec.raw?.id) === String(a.sectionId));
        }
        if (!matched) {
          matched = ranges[0] || { sec: sections[0], sIdx: 0, start: 1, end: 1, qCount: 1 };
        }

        let qNo = Number(a.questionNoInSection);
        if (!qNo || isNaN(qNo) || qNo < 1 || qNo > matched.qCount) {
          qNo = (globalNo >= matched.start && globalNo <= matched.end) ? (globalNo - matched.start) + 1 : 1;
        }

        const note = a.teacherNote || a.teacher_note || a.feedback;
        if (note) {
          setNoteInMap(matched.sIdx, matched.sec.id, matched.sec.raw?.id, qNo, String(note));
        }
      });
    }

    return map;
  });

  const [overallFeedback, setOverallFeedback] = useState(submission?.teacherFeedback || submission?.teacherNote || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleScoreChange = useCallback((secId, qNo, score) => {
    setTeacherScores(prev => {
      const next = { ...prev };
      const sIdx = (sections || []).findIndex((s, idx) => String(s.id) === String(secId) || String(idx) === String(secId) || String(s.raw?.id) === String(secId));
      const keysToUpdate = [secId];
      if (sIdx !== -1) {
        keysToUpdate.push(sIdx, String(sIdx));
        if (sections[sIdx]?.id) keysToUpdate.push(sections[sIdx].id);
        if (sections[sIdx]?.raw?.id) keysToUpdate.push(sections[sIdx].raw.id);
      }
      keysToUpdate.forEach(k => {
        next[k] = { ...(next[k] || {}), [qNo]: score, [String(qNo)]: score };
      });
      return next;
    });
  }, [sections]);

  const handleNoteChange = useCallback((secId, qNo, note) => {
    setTeacherNotes(prev => {
      const next = { ...prev };
      const sIdx = (sections || []).findIndex((s, idx) => String(s.id) === String(secId) || String(idx) === String(secId) || String(s.raw?.id) === String(secId));
      const keysToUpdate = [secId];
      if (sIdx !== -1) {
        keysToUpdate.push(sIdx, String(sIdx));
        if (sections[sIdx]?.id) keysToUpdate.push(sections[sIdx].id);
        if (sections[sIdx]?.raw?.id) keysToUpdate.push(sections[sIdx].raw.id);
      }
      keysToUpdate.forEach(k => {
        next[k] = { ...(next[k] || {}), [qNo]: note, [String(qNo)]: note };
      });
      return next;
    });
  }, [sections]);

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
            const qObj = secQs[qIdx] || {};
            const existingAns = (Array.isArray(rawAns) ? rawAns.find(a => 
              (String(a.sectionId) === String(sId) && Number(a.questionNoInSection || a.questionNo) === qNo) ||
              (sec.raw?.id && String(a.sectionId) === String(sec.raw.id) && Number(a.questionNoInSection || a.questionNo) === qNo) ||
              (a.sectionIndex !== undefined && Number(a.sectionIndex) === sIdx && Number(a.questionNoInSection || a.questionNo) === qNo) ||
              (qObj.id && a.questionId && String(a.questionId) === String(qObj.id)) ||
              Number(a.questionNo) === currentGlobalNo
            ) : null) || {};

            const userAns = sa.answers?.[qNo] ?? sa.answers?.[String(qNo)] ?? existingAns.userAnswer;
            const textAns = sa.openEndedText?.[qNo] ?? sa.openEndedText?.[String(qNo)] ?? existingAns.userAnswerText ?? existingAns.textAns ?? submission?.openEndedText?.[currentGlobalNo] ?? submission?.openEndedText?.[String(currentGlobalNo)];

            const score = teacherScores[sId]?.[qNo] ?? 
                          teacherScores[sId]?.[String(qNo)] ?? 
                          teacherScores[sIdx]?.[qNo] ?? 
                          teacherScores[sIdx]?.[String(qNo)] ?? 
                          teacherScores[String(sIdx)]?.[qNo] ?? 
                          teacherScores[String(sIdx)]?.[String(qNo)] ?? 
                          (sec.raw?.id ? (teacherScores[sec.raw.id]?.[qNo] ?? teacherScores[sec.raw.id]?.[String(qNo)]) : undefined) ??
                          (teacherScores[currentGlobalNo] !== undefined ? teacherScores[currentGlobalNo] : undefined) ??
                          (teacherScores[String(currentGlobalNo)] !== undefined ? teacherScores[String(currentGlobalNo)] : undefined) ??
                          sa.teacherScores?.[qNo] ??
                          sa.teacherScores?.[String(qNo)] ??
                          existingAns.score;

            const note = teacherNotes[sId]?.[qNo] ?? 
                         teacherNotes[sId]?.[String(qNo)] ?? 
                         teacherNotes[sIdx]?.[qNo] ?? 
                         teacherNotes[sIdx]?.[String(qNo)] ?? 
                         teacherNotes[String(sIdx)]?.[qNo] ?? 
                         teacherNotes[String(sIdx)]?.[String(qNo)] ?? 
                         (sec.raw?.id ? (teacherNotes[sec.raw.id]?.[qNo] ?? teacherNotes[sec.raw.id]?.[String(qNo)]) : undefined) ??
                         (teacherNotes[currentGlobalNo] !== undefined ? teacherNotes[currentGlobalNo] : undefined) ??
                         (teacherNotes[String(currentGlobalNo)] !== undefined ? teacherNotes[String(currentGlobalNo)] : undefined) ??
                         sa.teacherNotes?.[qNo] ??
                         sa.teacherNotes?.[String(qNo)] ??
                         existingAns.teacherNote ?? '';

            totalMax += 10;
            let isCorrect = existingAns.isCorrect;

            if (score === 'empty') {
              isCorrect = null;
              blank++;
            } else if (score !== undefined && score !== null && score !== '') {
              const numSc = Number(score);
              totalEarned += numSc;
              isCorrect = numSc >= 5;
              if (isCorrect) correct++; else wrong++;
            } else if (userAns === null && !textAns) {
              isCorrect = null;
              blank++;
            } else {
              const u = normalizeAnswerIndex(userAns);
              if (u === null && !textAns) {
                isCorrect = null;
                blank++;
              } else {
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
              sectionIndex: sIdx,
              sectionTitle: sec.title,
              questionNo: currentGlobalNo,
              questionNoInSection: qNo,
              userAnswer: userAns !== undefined ? userAns : null,
              userAnswerText: textAns || null,
              score: score === 'empty' ? 'empty' : (score !== undefined && score !== '' && score !== null ? score : (isCorrect === true ? 10 : (isCorrect === false ? 0 : 'empty'))),
              isCorrect: score === 'empty' ? null : isCorrect,
              evalStatus: score === 'empty' ? 'empty' : (isCorrect === true ? (score === 5 ? 'half' : 'correct') : (isCorrect === false ? 'wrong' : 'empty')),
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
          const score = teacherScores[sId]?.[qNo] ?? teacherScores[sId]?.[String(qNo)] ?? teacherScores[qNo] ?? a.score;
          const note = teacherNotes[sId]?.[qNo] ?? teacherNotes[sId]?.[String(qNo)] ?? teacherNotes[qNo] ?? a.teacherNote ?? '';

          totalMax += 10;
          let isCorrect = a.isCorrect;

          if (score !== undefined && score !== null && score !== '' && score !== 'empty') {
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

      // Also create flat maps for 1..N question indexing
      const flatTeacherScores = {};
      const flatTeacherNotes = {};
      updatedAnswers.forEach((ans, aIdx) => {
        const qNum = ans.questionNo || (aIdx + 1);
        if (ans.score !== undefined && ans.score !== null) {
          flatTeacherScores[qNum] = ans.score;
          flatTeacherScores[String(qNum)] = ans.score;
        }
        if (ans.teacherNote) {
          flatTeacherNotes[qNum] = ans.teacherNote;
          flatTeacherNotes[String(qNum)] = ans.teacherNote;
        }
      });

      const mergedTeacherScores = { ...teacherScores, ...flatTeacherScores };
      const mergedTeacherNotes = { ...teacherNotes, ...flatTeacherNotes };

      const patch = {
        answers: updatedAnswers,
        teacherScores: mergedTeacherScores,
        teacherNotes: mergedTeacherNotes,
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

      const subId = submission?.id || submission?.submissionId || submission?._id;
      if (updateSubmission && subId) {
        await updateSubmission(subId, patch);
      }
      const hwId = submission?.hwId || submission?.testId || submission?.homeworkId || test?.id;
      const studentId = submission?.studentId || submission?.userId || submission?.id;
      if (updateHomeworkSubmission && hwId && studentId) {
        try {
          await updateHomeworkSubmission(hwId, studentId, patch);
        } catch (e) {
          console.warn('updateHomeworkSubmission error in useTeacherGrading:', e);
        }
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
