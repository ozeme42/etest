/**
 * Gamification Service
 * Computes XP, Player Levels, Badges & Achievements, Streaks, and Leaderboards.
 */

export const LEVEL_TIERS = [
  { level: 1, title: 'Çırak', minXp: 0, maxXp: 250, icon: '🥉', color: '#94a3b8', bgGradient: 'linear-gradient(135deg, #64748b, #475569)' },
  { level: 2, title: 'Yolcu', minXp: 250, maxXp: 600, icon: '🧭', color: '#38bdf8', bgGradient: 'linear-gradient(135deg, #0284c7, #0369a1)' },
  { level: 3, title: 'Kaşif', minXp: 600, maxXp: 1200, icon: '🔭', color: '#34d399', bgGradient: 'linear-gradient(135deg, #059669, #047857)' },
  { level: 4, title: 'Savaşçı', minXp: 1200, maxXp: 2200, icon: '⚔️', color: '#fbbf24', bgGradient: 'linear-gradient(135deg, #d97706, #b45309)' },
  { level: 5, title: 'Usta', minXp: 2200, maxXp: 3800, icon: '🏹', color: '#fb7185', bgGradient: 'linear-gradient(135deg, #e11d48, #be123c)' },
  { level: 6, title: 'Üstat', minXp: 3800, maxXp: 6000, icon: '🛡️', color: '#a78bfa', bgGradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)' },
  { level: 7, title: 'Efsane', minXp: 6000, maxXp: 9500, icon: '⚡', color: '#f43f5e', bgGradient: 'linear-gradient(135deg, #f43f5e, #e11d48)' },
  { level: 8, title: 'Bilge', minXp: 9500, maxXp: 999999, icon: '👑', color: '#eab308', bgGradient: 'linear-gradient(135deg, #f59e0b, #d97706)' }
];

export const BADGE_DEFINITIONS = [
  {
    id: 'first_step',
    title: 'İlk Adım',
    desc: 'İlk testini veya ödevini başarıyla tamamla.',
    icon: '🎯',
    category: 'test',
    xpReward: 50,
    check: (stats) => stats.totalSolvedTests >= 1,
    progress: (stats) => ({ current: Math.min(1, stats.totalSolvedTests), target: 1 })
  },
  {
    id: 'perfect_score',
    title: 'Keskin Nişancı',
    desc: 'Bir testte tüm soruları %100 doğru yap.',
    icon: '🎖️',
    category: 'accuracy',
    xpReward: 100,
    check: (stats) => stats.perfectTestsCount >= 1,
    progress: (stats) => ({ current: Math.min(1, stats.perfectTestsCount), target: 1 })
  },
  {
    id: 'streak_3',
    title: 'Alev Başlangıcı',
    desc: '3 gün aralıksız her gün ders çalış / test çöz.',
    icon: '🔥',
    category: 'streak',
    xpReward: 80,
    check: (stats) => stats.dailyStreak >= 3,
    progress: (stats) => ({ current: Math.min(3, stats.dailyStreak), target: 3 })
  },
  {
    id: 'streak_7',
    title: 'Durdurulamaz Seri',
    desc: '7 gün üst üste kesintisiz çalışmayı sürdür.',
    icon: '⚡',
    category: 'streak',
    xpReward: 200,
    check: (stats) => stats.dailyStreak >= 7,
    progress: (stats) => ({ current: Math.min(7, stats.dailyStreak), target: 7 })
  },
  {
    id: 'night_owl',
    title: 'Gece Kuşu',
    desc: 'Saat 22:00\'den sonra bir test çöz.',
    icon: '🦉',
    category: 'special',
    xpReward: 50,
    check: (stats) => stats.hasNightTest === true,
    progress: (stats) => ({ current: stats.hasNightTest ? 1 : 0, target: 1 })
  },
  {
    id: 'early_bird',
    title: 'Erken Kalkan',
    desc: 'Sabah 08:30\'dan önce bir test çöz.',
    icon: '🌅',
    category: 'special',
    xpReward: 50,
    check: (stats) => stats.hasEarlyTest === true,
    progress: (stats) => ({ current: stats.hasEarlyTest ? 1 : 0, target: 1 })
  },
  {
    id: 'pomodoro_pro',
    title: 'Odaklanma Ustası',
    desc: 'Çalışma odasında en az 3 Pomodoro oturumu tamamla.',
    icon: '⏱️',
    category: 'study',
    xpReward: 100,
    check: (stats) => stats.pomodoroSessions >= 3,
    progress: (stats) => ({ current: Math.min(3, stats.pomodoroSessions), target: 3 })
  },
  {
    id: 'math_wizard',
    title: 'Matematik Dehası',
    desc: 'Matematik dersinde toplam 40+ doğru soruya ulaş.',
    icon: '📐',
    category: 'subject',
    xpReward: 120,
    check: (stats) => (stats.subjectCorrect?.['Matematik'] || 0) >= 40,
    progress: (stats) => ({ current: Math.min(40, stats.subjectCorrect?.['Matematik'] || 0), target: 40 })
  },
  {
    id: 'science_genius',
    title: 'Fen Kaşifi',
    desc: 'Fen Bilimleri dersinde toplam 40+ doğru soruya ulaş.',
    icon: '🔬',
    category: 'subject',
    xpReward: 120,
    check: (stats) => (stats.subjectCorrect?.['Fen Bilimleri'] || 0) >= 40,
    progress: (stats) => ({ current: Math.min(40, stats.subjectCorrect?.['Fen Bilimleri'] || 0), target: 40 })
  },
  {
    id: 'turkish_master',
    title: 'Türkçe Üstadı',
    desc: 'Türkçe dersinde toplam 40+ doğru soruya ulaş.',
    icon: '📖',
    category: 'subject',
    xpReward: 120,
    check: (stats) => (stats.subjectCorrect?.['Türkçe'] || 0) >= 40,
    progress: (stats) => ({ current: Math.min(40, stats.subjectCorrect?.['Türkçe'] || 0), target: 40 })
  },
  {
    id: 'centurion',
    title: 'Yüzbaşı',
    desc: 'Toplam 100 soru çöz.',
    icon: '🛡️',
    category: 'milestone',
    xpReward: 150,
    check: (stats) => stats.totalQuestionsSolved >= 100,
    progress: (stats) => ({ current: Math.min(100, stats.totalQuestionsSolved), target: 100 })
  },
  {
    id: 'titan',
    title: 'Soru Canavarı',
    desc: 'Toplam 500 soru çözerek ustalığını kanıtla.',
    icon: '👑',
    category: 'milestone',
    xpReward: 300,
    check: (stats) => stats.totalQuestionsSolved >= 500,
    progress: (stats) => ({ current: Math.min(500, stats.totalQuestionsSolved), target: 500 })
  }
];

export function getLevelInfo(xp) {
  const currentXp = Math.max(0, Number(xp) || 0);
  let activeTier = LEVEL_TIERS[0];
  let nextTier = LEVEL_TIERS[1];

  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (currentXp >= LEVEL_TIERS[i].minXp) {
      activeTier = LEVEL_TIERS[i];
      nextTier = LEVEL_TIERS[i + 1] || null;
    }
  }

  const min = activeTier.minXp;
  const max = nextTier ? nextTier.minXp : (activeTier.minXp + 5000);
  const span = max - min;
  const inTierXp = currentXp - min;
  const progressPercent = Math.min(100, Math.max(0, Math.round((inTierXp / span) * 100)));
  const remainingXp = Math.max(0, max - currentXp);

  return {
    ...activeTier,
    totalXp: currentXp,
    inTierXp,
    tierSpan: span,
    progressPercent,
    remainingXp,
    nextTierTitle: nextTier?.title || 'Zirve'
  };
}

export function computeStudentGamificationData({
  studentId,
  submissions = [],
  studySessions = []
}) {
  const sId = String(studentId || '');
  if (!sId) {
    return {
      xp: 0,
      levelInfo: getLevelInfo(0),
      stats: { totalSolvedTests: 0, totalCorrect: 0, totalQuestionsSolved: 0, dailyStreak: 0 },
      unlockedBadges: [],
      lockedBadges: BADGE_DEFINITIONS.map(b => ({ ...b, progress: { current: 0, target: 1 } }))
    };
  }

  // Filter student submissions
  const studentSubs = (submissions || []).filter(s => {
    if (!s) return false;
    const subSid = String(s.studentId || s.student_id || s.userId || s.user_id || '');
    return subSid === sId || (sId.includes('-') && subSid.replace(/-/g, '') === sId.replace(/-/g, ''));
  }).filter(s => s.status !== 'in_progress' && s.status !== 'draft');

  let totalCorrect = 0;
  let totalWrong = 0;
  let totalEmpty = 0;
  let totalSolvedTests = 0;
  let perfectTestsCount = 0;
  let hasNightTest = false;
  let hasEarlyTest = false;
  const subjectCorrect = {};
  const activeDates = new Set();

  studentSubs.forEach(s => {
    totalSolvedTests++;
    const correct = Number(s.correctCount || s.correct || 0);
    const wrong = Number(s.wrongCount || s.wrong || 0);
    const empty = Number(s.blankCount || s.emptyCount || 0);
    const totalQ = Number(s.totalQuestions || (correct + wrong + empty) || 1);

    totalCorrect += correct;
    totalWrong += wrong;
    totalEmpty += empty;

    // Perfect test
    if (totalQ > 0 && correct === totalQ && wrong === 0) {
      perfectTestsCount++;
    }

    // Subject breakdown
    const subj = s.subjectName || s.subject || 'Genel';
    subjectCorrect[subj] = (subjectCorrect[subj] || 0) + correct;

    // Date & Time checks
    const rawDate = s.submittedAt || s.completedAt || s.createdAt || s.date;
    if (rawDate) {
      const dt = new Date(rawDate);
      if (!isNaN(dt.getTime())) {
        const ymd = dt.toISOString().split('T')[0];
        activeDates.add(ymd);

        const hours = dt.getHours();
        if (hours >= 22 || hours < 4) hasNightTest = true;
        if (hours >= 5 && hours <= 8) hasEarlyTest = true;
      }
    }
  });

  // Calculate Pomodoro & Study Room activity
  const studentSessions = (studySessions || []).filter(ss => String(ss.studentId || ss.userId || '') === sId);
  const pomodoroSessions = studentSessions.length;
  let totalStudyMinutes = 0;
  studentSessions.forEach(ss => {
    totalStudyMinutes += Number(ss.durationMinutes || ss.duration || 25);
    const d = ss.date || ss.createdAt;
    if (d) activeDates.add(new Date(d).toISOString().split('T')[0]);
  });

  // Calculate Daily Streak
  const sortedDates = Array.from(activeDates).sort().reverse();
  let dailyStreak = 0;
  if (sortedDates.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // If active today or yesterday, streak is alive
    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      dailyStreak = 1;
      let checkDate = new Date(sortedDates[0]);
      for (let i = 1; i < sortedDates.length; i++) {
        const prevExpected = new Date(checkDate.getTime() - 86400000).toISOString().split('T')[0];
        if (sortedDates[i] === prevExpected) {
          dailyStreak++;
          checkDate = new Date(sortedDates[i]);
        } else {
          break;
        }
      }
    }
  }

  const totalQuestionsSolved = totalCorrect + totalWrong + totalEmpty;

  // Build stats object for badge checker
  const stats = {
    totalSolvedTests,
    totalCorrect,
    totalQuestionsSolved,
    perfectTestsCount,
    hasNightTest,
    hasEarlyTest,
    pomodoroSessions,
    totalStudyMinutes,
    dailyStreak,
    subjectCorrect
  };

  // Evaluate Badges
  const unlockedBadges = [];
  const lockedBadges = [];

  BADGE_DEFINITIONS.forEach(b => {
    const isUnlocked = b.check(stats);
    const prog = b.progress(stats);
    if (isUnlocked) {
      unlockedBadges.push({ ...b, unlocked: true, progress: prog });
    } else {
      lockedBadges.push({ ...b, unlocked: false, progress: prog });
    }
  });

  // Total XP Calculation
  let totalXp = 0;
  totalXp += totalCorrect * 10;
  totalXp += totalSolvedTests * 25;
  totalXp += perfectTestsCount * 50;
  totalXp += Math.floor(totalStudyMinutes / 25) * 20;
  totalXp += dailyStreak * 15;
  unlockedBadges.forEach(b => { totalXp += b.xpReward; });

  const levelInfo = getLevelInfo(totalXp);

  return {
    xp: totalXp,
    levelInfo,
    stats,
    unlockedBadges,
    lockedBadges
  };
}

export function computeLeaderboard({
  users = [],
  submissions = [],
  studySessions = []
}) {
  const students = (users || []).filter(u => u.role === 'student');

  const ranking = students.map(st => {
    const data = computeStudentGamificationData({
      studentId: st.id,
      submissions,
      studySessions
    });

    return {
      id: st.id,
      name: st.name || st.fullName || 'Öğrenci',
      avatar: st.avatar || null,
      xp: data.xp,
      levelInfo: data.levelInfo,
      streak: data.stats.dailyStreak,
      badgeCount: data.unlockedBadges.length,
      solvedCount: data.stats.totalQuestionsSolved,
      correctCount: data.stats.totalCorrect
    };
  });

  // Sort descending by XP
  return ranking.sort((a, b) => b.xp - a.xp);
}
