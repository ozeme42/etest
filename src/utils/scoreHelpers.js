/**
 * Calculates submission score percentage reliably across different test types.
 */
export function getSubmissionScorePct(sub) {
  if (!sub) return null;
  const correct = sub.correctCount ?? sub.correct;
  const wrong = sub.wrongCount ?? sub.wrong ?? 0;
  const blank = sub.blankCount ?? sub.emptyCount ?? sub.blank ?? 0;
  const ansCount = Array.isArray(sub.answers) ? sub.answers.length : 0;
  const total = sub.totalQuestions || ((correct !== undefined ? correct : 0) + wrong + blank) || ansCount;
  
  if (total > 0 && correct !== undefined && correct !== null && (correct > 0 || wrong > 0 || blank > 0)) {
    return Math.min(100, Math.max(0, Math.round((correct / total) * 100)));
  }
  if (sub.scorePercentage !== undefined && sub.scorePercentage !== null) {
    return Math.min(100, Math.max(0, Math.round(+sub.scorePercentage)));
  }
  if (sub.score !== undefined && sub.score !== null) {
    const s = +sub.score;
    if (total > 0 && s <= total) {
      return Math.min(100, Math.max(0, Math.round((s / total) * 100)));
    }
    return Math.min(100, Math.max(0, Math.round(s)));
  }
  return null;
}
