/**
 * spacedRepetitionService.js
 * 5-Stage Leitner Spaced Repetition Engine for Wrong/Blank Question Practice.
 * Interval Schedule:
 * - Box 1: 1 day interval (Yeni Yanlışlar)
 * - Box 2: 3 days interval (1. Aşama)
 * - Box 3: 7 days interval (2. Aşama)
 * - Box 4: 15 days interval (3. Aşama)
 * - Box 5: 30 days interval (Ustalaşılan Sorular 🏆)
 */

const LEITNER_INTERVALS = {
  1: 1,   // 1 day
  2: 3,   // 3 days
  3: 7,   // 7 days
  4: 15,  // 15 days
  5: 30   // 30 days / Mastered
};

const LEITNER_STORAGE_KEY_PREFIX = 'etest_leitner_boxes_';

export const LEITNER_BOX_CONFIG = [
  { level: 1, label: '1. Aşama (Yeni)', intervalDays: 1, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)', icon: '🌱' },
  { level: 2, label: '2. Aşama (3 Gün)', intervalDays: 3, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)', icon: '🌿' },
  { level: 3, label: '3. Aşama (7 Gün)', intervalDays: 7, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)', icon: '🌳' },
  { level: 4, label: '4. Aşama (15 Gün)', intervalDays: 15, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.35)', icon: '⚡' },
  { level: 5, label: '5. Aşama (Ustalaşıldı)', intervalDays: 30, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', icon: '🏆' }
];

export function getLeitnerData(studentId) {
  if (!studentId) return {};
  try {
    const raw = localStorage.getItem(`${LEITNER_STORAGE_KEY_PREFIX}${studentId}`);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('getLeitnerData error:', err);
    return {};
  }
}

export function saveLeitnerData(studentId, data) {
  if (!studentId) return;
  try {
    localStorage.setItem(`${LEITNER_STORAGE_KEY_PREFIX}${studentId}`, JSON.stringify(data));
  } catch (err) {
    console.error('saveLeitnerData error:', err);
  }
}

export function recordLeitnerResult(studentId, questionId, isCorrect) {
  if (!studentId || !questionId) return null;
  const currentData = getLeitnerData(studentId);
  const existing = currentData[questionId] || {
    boxLevel: 1,
    streak: 0,
    history: [],
    lastReviewedAt: null,
    nextReviewDate: null
  };

  const now = new Date();
  let newBoxLevel = existing.boxLevel || 1;
  let newStreak = existing.streak || 0;

  if (isCorrect) {
    newBoxLevel = Math.min(5, newBoxLevel + 1);
    newStreak += 1;
  } else {
    // Drop back to Box 1 on failure
    newBoxLevel = 1;
    newStreak = 0;
  }

  const intervalDays = LEITNER_INTERVALS[newBoxLevel] || 1;
  const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  const updatedEntry = {
    ...existing,
    boxLevel: newBoxLevel,
    streak: newStreak,
    lastReviewedAt: now.toISOString(),
    nextReviewDate: nextDate.toISOString(),
    history: [
      ...(existing.history || []).slice(-10),
      { date: now.toISOString(), isCorrect, boxLevel: newBoxLevel }
    ]
  };

  currentData[questionId] = updatedEntry;
  saveLeitnerData(studentId, currentData);
  return updatedEntry;
}

export function getLeitnerOverview(studentId, allWrongQuestions = []) {
  const leitnerData = getLeitnerData(studentId);
  const nowTime = new Date().getTime();

  const boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let dueTodayCount = 0;
  const categorizedQuestions = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  const dueQuestions = [];

  allWrongQuestions.forEach(q => {
    const qKey = q.id || q.questionId || `${q.testId}_${q.questionNo}`;
    const entry = leitnerData[qKey] || { boxLevel: 1, nextReviewDate: null };
    const level = entry.boxLevel || 1;
    boxCounts[level] = (boxCounts[level] || 0) + 1;
    categorizedQuestions[level].push({ ...q, leitnerInfo: entry });

    // Check if due for review
    const nextTime = entry.nextReviewDate ? new Date(entry.nextReviewDate).getTime() : 0;
    const isDue = !entry.nextReviewDate || nextTime <= nowTime;
    if (isDue && level < 5) {
      dueTodayCount++;
      dueQuestions.push({ ...q, leitnerInfo: entry });
    }
  });

  return {
    boxCounts,
    dueTodayCount,
    categorizedQuestions,
    dueQuestions,
    totalQuestions: allWrongQuestions.length
  };
}
