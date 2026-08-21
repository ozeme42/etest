/**
 * scoreCalculator.js
 * 
 * Centralized score and accuracy calculation for Multiple-Choice & Open-Ended tests.
 */
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { isQuestionOpenEnded } from './quizTypeDetector';

/**
 * Calculates live score, accuracy, and evaluation status for a quiz session.
 */
export function calculateQuizScores({
  sections = [],
  sectionAnswers = {},
  teacherScores = {},
  test = {},
  userAnswers = null,
  penaltyRatio = 0.25
}) {
  let totalPts = 0;
  let maxPts = 0;
  let correct = 0;
  let wrong = 0;
  let blank = 0;
  let pending = 0;
  let totalOE = 0;

  sections.forEach(sec => {
    const sa = sectionAnswers[sec?.id] || {};
    const secQs = sec?.resolvedQuestions || [];
    const bankQ = sec?.bankQ || test;
    const count = sec?.qCount || secQs.length || 1;

    for (let i = 1; i <= count; i++) {
      maxPts += 10;
      const qObj = secQs[i - 1] || {};
      const isQOE = isQuestionOpenEnded(qObj, sec, test, sa.answers?.[i]);

      const teacherSc = teacherScores?.[sec?.id]?.[i];
      const hasTeacherGraded = isQOE
        ? (teacherSc !== undefined && teacherSc !== null && teacherSc !== 'pending')
        : (teacherSc !== undefined && teacherSc !== null);

      if (isQOE && hasTeacherGraded) {
        if (teacherSc === 'empty') {
          blank++;
        } else {
          const numSc = Number(teacherSc);
          totalPts += numSc;
          if (numSc >= 5) correct++;
          else wrong++;
        }
      } else if (isQOE) {
        totalOE++;
        pending++;
      } else {
        const userAnsObj = sa.answers?.[i];
        let numUAns = null;
        if (userAnsObj !== undefined && userAnsObj !== null) {
          if (typeof userAnsObj === 'number') numUAns = userAnsObj;
          else if (typeof userAnsObj === 'object') {
            const raw = userAnsObj?.userAnswer ?? userAnsObj?.selectedOption ?? userAnsObj?.studentAnswer;
            if (typeof raw === 'number') numUAns = raw;
          }
        }

        const hasAns = typeof numUAns === 'number' && !isNaN(numUAns);
        const isCorr = hasAns ? checkIsAnswerCorrect(numUAns, qObj, bankQ, i) : null;
        if (isCorr === true) {
          totalPts += 10;
          correct++;
        } else if (hasAns) {
          wrong++;
        } else {
          blank++;
        }
      }
    }
  });

  const isPending = totalOE > 0 && pending > 0;
  const pct = maxPts > 0 ? Math.min(100, Math.round((totalPts / maxPts) * 100)) : 0;
  const net = Math.max(0, parseFloat((correct - (wrong * penaltyRatio)).toFixed(2)));

  return {
    totalPts,
    maxPts,
    pct,
    correct,
    wrong,
    blank,
    net,
    pending,
    isPending,
    totalOE
  };
}
