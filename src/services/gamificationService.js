/**
 * Gamification Service
 * Scaled XP System (1/10th scale) with 30+ Comprehensive Badges & Achievements, Levels, and Leaderboards.
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
  // ─── TEST & SINAV BAŞARILARI ───
  {
    id: 'first_step',
    title: 'İlk Adım',
    desc: 'İlk testini veya ödevini başarıyla tamamla.',
    icon: '🎯',
    category: 'test',
    xpReward: 5,
    check: (stats) => stats.totalSolvedTests >= 1,
    progress: (stats) => ({ current: Math.min(1, stats.totalSolvedTests), target: 1 })
  },
  {
    id: 'test_5',
    title: 'Isınma Turları',
    desc: 'Toplam 5 farklı test veya ödev tamamla.',
    icon: '🏃',
    category: 'test',
    xpReward: 8,
    check: (stats) => stats.totalSolvedTests >= 5,
    progress: (stats) => ({ current: Math.min(5, stats.totalSolvedTests), target: 5 })
  },
  {
    id: 'test_15',
    title: 'Sınav Maratoncusu',
    desc: 'Toplam 15 farklı test veya ödev tamamla.',
    icon: '🎽',
    category: 'test',
    xpReward: 15,
    check: (stats) => stats.totalSolvedTests >= 15,
    progress: (stats) => ({ current: Math.min(15, stats.totalSolvedTests), target: 15 })
  },
  {
    id: 'test_30',
    title: 'Sınav Şampiyonu',
    desc: 'Toplam 30 farklı test veya ödev tamamla.',
    icon: '🏆',
    category: 'test',
    xpReward: 25,
    check: (stats) => stats.totalSolvedTests >= 30,
    progress: (stats) => ({ current: Math.min(30, stats.totalSolvedTests), target: 30 })
  },
  {
    id: 'perfect_score',
    title: 'Keskin Nişancı',
    desc: 'Bir testte tüm soruları %100 doğru yap.',
    icon: '🎖️',
    category: 'accuracy',
    xpReward: 10,
    check: (stats) => stats.perfectTestsCount >= 1,
    progress: (stats) => ({ current: Math.min(1, stats.perfectTestsCount), target: 1 })
  },
  {
    id: 'perfect_3',
    title: 'Üçte Üç',
    desc: '3 farklı testte %100 tam doğru yap.',
    icon: '💎',
    category: 'accuracy',
    xpReward: 20,
    check: (stats) => stats.perfectTestsCount >= 3,
    progress: (stats) => ({ current: Math.min(3, stats.perfectTestsCount), target: 3 })
  },
  {
    id: 'high_accuracy',
    title: 'Usta Çözücü',
    desc: 'En az 5 testte %90 ve üzeri başarı elde et.',
    icon: '✨',
    category: 'accuracy',
    xpReward: 15,
    check: (stats) => stats.highAccuracyTests >= 5,
    progress: (stats) => ({ current: Math.min(5, stats.highAccuracyTests), target: 5 })
  },

  // ─── SORU SAYISI KİLOMETRE TAŞLARI ───
  {
    id: 'q_25',
    title: 'Soru Avcısı',
    desc: 'Toplam 25 soru çöz.',
    icon: '🏹',
    category: 'milestone',
    xpReward: 4,
    check: (stats) => stats.totalQuestionsSolved >= 25,
    progress: (stats) => ({ current: Math.min(25, stats.totalQuestionsSolved), target: 25 })
  },
  {
    id: 'q_50',
    title: 'Çırak Çözücü',
    desc: 'Toplam 50 soru çöz.',
    icon: '📜',
    category: 'milestone',
    xpReward: 8,
    check: (stats) => stats.totalQuestionsSolved >= 50,
    progress: (stats) => ({ current: Math.min(50, stats.totalQuestionsSolved), target: 50 })
  },
  {
    id: 'q_100',
    title: 'Yüzbaşı',
    desc: 'Toplam 100 soru çözerek ilk büyük barajı aş.',
    icon: '🛡️',
    category: 'milestone',
    xpReward: 15,
    check: (stats) => stats.totalQuestionsSolved >= 100,
    progress: (stats) => ({ current: Math.min(100, stats.totalQuestionsSolved), target: 100 })
  },
  {
    id: 'q_250',
    title: 'Çelik İrade',
    desc: 'Toplam 250 soru çöz.',
    icon: '⚔️',
    category: 'milestone',
    xpReward: 20,
    check: (stats) => stats.totalQuestionsSolved >= 250,
    progress: (stats) => ({ current: Math.min(250, stats.totalQuestionsSolved), target: 250 })
  },
  {
    id: 'q_500',
    title: 'Soru Canavarı',
    desc: 'Toplam 500 soru çöz.',
    icon: '👑',
    category: 'milestone',
    xpReward: 30,
    check: (stats) => stats.totalQuestionsSolved >= 500,
    progress: (stats) => ({ current: Math.min(500, stats.totalQuestionsSolved), target: 500 })
  },
  {
    id: 'q_1000',
    title: 'Efsanevi Çözücü',
    desc: 'Toplam 1.000 soru çözerek efsaneler arasına gir.',
    icon: '🌟',
    category: 'milestone',
    xpReward: 50,
    check: (stats) => stats.totalQuestionsSolved >= 1000,
    progress: (stats) => ({ current: Math.min(1000, stats.totalQuestionsSolved), target: 1000 })
  },

  // ─── DERS ODAKLI UZMANLIKLAR ───
  {
    id: 'math_explorer',
    title: 'Matematik Çırağı',
    desc: 'Matematik dersinde toplam 20 doğru soruya ulaş.',
    icon: '📐',
    category: 'subject',
    xpReward: 6,
    check: (stats) => (stats.subjectCorrect?.['Matematik'] || 0) >= 20,
    progress: (stats) => ({ current: Math.min(20, stats.subjectCorrect?.['Matematik'] || 0), target: 20 })
  },
  {
    id: 'math_wizard',
    title: 'Matematik Dehası',
    desc: 'Matematik dersinde toplam 60 doğru soruya ulaş.',
    icon: '🧮',
    category: 'subject',
    xpReward: 15,
    check: (stats) => (stats.subjectCorrect?.['Matematik'] || 0) >= 60,
    progress: (stats) => ({ current: Math.min(60, stats.subjectCorrect?.['Matematik'] || 0), target: 60 })
  },
  {
    id: 'science_explorer',
    title: 'Fen Kaşifi',
    desc: 'Fen Bilimleri dersinde toplam 20 doğru soruya ulaş.',
    icon: '🔬',
    category: 'subject',
    xpReward: 6,
    check: (stats) => (stats.subjectCorrect?.['Fen Bilimleri'] || 0) >= 20,
    progress: (stats) => ({ current: Math.min(20, stats.subjectCorrect?.['Fen Bilimleri'] || 0), target: 20 })
  },
  {
    id: 'science_genius',
    title: 'Fen Bilgini',
    desc: 'Fen Bilimleri dersinde toplam 60 doğru soruya ulaş.',
    icon: '🧬',
    category: 'subject',
    xpReward: 15,
    check: (stats) => (stats.subjectCorrect?.['Fen Bilimleri'] || 0) >= 60,
    progress: (stats) => ({ current: Math.min(60, stats.subjectCorrect?.['Fen Bilimleri'] || 0), target: 60 })
  },
  {
    id: 'turkish_explorer',
    title: 'Kelime Ustası',
    desc: 'Türkçe dersinde toplam 20 doğru soruya ulaş.',
    icon: '📖',
    category: 'subject',
    xpReward: 6,
    check: (stats) => (stats.subjectCorrect?.['Türkçe'] || 0) >= 20,
    progress: (stats) => ({ current: Math.min(20, stats.subjectCorrect?.['Türkçe'] || 0), target: 20 })
  },
  {
    id: 'turkish_master',
    title: 'Türkçe Üstadı',
    desc: 'Türkçe dersinde toplam 60 doğru soruya ulaş.',
    icon: '✒️',
    category: 'subject',
    xpReward: 15,
    check: (stats) => (stats.subjectCorrect?.['Türkçe'] || 0) >= 60,
    progress: (stats) => ({ current: Math.min(60, stats.subjectCorrect?.['Türkçe'] || 0), target: 60 })
  },
  {
    id: 'social_expert',
    title: 'Tarih & Coğrafya',
    desc: 'Sosyal Bilgiler / İnkılap Tarihi dersinde 20 doğruya ulaş.',
    icon: '🌍',
    category: 'subject',
    xpReward: 6,
    check: (stats) => (stats.subjectCorrect?.['Sosyal Bilgiler'] || stats.subjectCorrect?.['T.C. İnkılap Tarihi ve Atatürkçülük'] || 0) >= 20,
    progress: (stats) => ({ current: Math.min(20, (stats.subjectCorrect?.['Sosyal Bilgiler'] || 0) + (stats.subjectCorrect?.['T.C. İnkılap Tarihi ve Atatürkçülük'] || 0)), target: 20 })
  },
  {
    id: 'english_pro',
    title: 'Global Dil',
    desc: 'İngilizce dersinde 20 doğru soruya ulaş.',
    icon: '💬',
    category: 'subject',
    xpReward: 6,
    check: (stats) => (stats.subjectCorrect?.['İngilizce'] || 0) >= 20,
    progress: (stats) => ({ current: Math.min(20, stats.subjectCorrect?.['İngilizce'] || 0), target: 20 })
  },
  {
    id: 'religion_pro',
    title: 'Ahlak & Değerler',
    desc: 'Din Kültürü dersinde 20 doğru soruya ulaş.',
    icon: '🕊️',
    category: 'subject',
    xpReward: 6,
    check: (stats) => (stats.subjectCorrect?.['Din Kültürü ve Ahlak Bilgisi'] || stats.subjectCorrect?.['Din Kültürü'] || 0) >= 20,
    progress: (stats) => ({ current: Math.min(20, (stats.subjectCorrect?.['Din Kültürü ve Ahlak Bilgisi'] || stats.subjectCorrect?.['Din Kültürü'] || 0)), target: 20 })
  },

  // ─── GÜNLÜK SERİ & DİSİPLİN (STREAKS) ───
  {
    id: 'streak_3',
    title: 'Alev Başlangıcı',
    desc: '3 gün aralıksız her gün ders çalış / test çöz.',
    icon: '🔥',
    category: 'streak',
    xpReward: 8,
    check: (stats) => stats.dailyStreak >= 3,
    progress: (stats) => ({ current: Math.min(3, stats.dailyStreak), target: 3 })
  },
  {
    id: 'streak_7',
    title: 'Durdurulamaz Seri',
    desc: '7 gün üst üste kesintisiz çalışmayı sürdür.',
    icon: '⚡',
    category: 'streak',
    xpReward: 18,
    check: (stats) => stats.dailyStreak >= 7,
    progress: (stats) => ({ current: Math.min(7, stats.dailyStreak), target: 7 })
  },
  {
    id: 'streak_14',
    title: 'Alışkanlık Zaferi',
    desc: '14 gün üst üste her gün test çöz / çalış.',
    icon: '🌋',
    category: 'streak',
    xpReward: 30,
    check: (stats) => stats.dailyStreak >= 14,
    progress: (stats) => ({ current: Math.min(14, stats.dailyStreak), target: 14 })
  },
  {
    id: 'streak_30',
    title: 'Demir Disiplin',
    desc: '30 gün kesintisiz seri yaparak alışkanlığı taçlandır.',
    icon: '🛡️',
    category: 'streak',
    xpReward: 50,
    check: (stats) => stats.dailyStreak >= 30,
    progress: (stats) => ({ current: Math.min(30, stats.dailyStreak), target: 30 })
  },

  // ─── ÇALIŞMA ODASI & ZAMAN ───
  {
    id: 'pomodoro_1',
    title: 'İlk Odak',
    desc: 'Çalışma odasında ilk Pomodoro oturumunu tamamla.',
    icon: '⏱️',
    category: 'study',
    xpReward: 4,
    check: (stats) => stats.pomodoroSessions >= 1,
    progress: (stats) => ({ current: Math.min(1, stats.pomodoroSessions), target: 1 })
  },
  {
    id: 'pomodoro_5',
    title: 'Odaklanma Ustası',
    desc: 'Çalışma odasında en az 5 Pomodoro oturumu tamamla.',
    icon: '🧘',
    category: 'study',
    xpReward: 12,
    check: (stats) => stats.pomodoroSessions >= 5,
    progress: (stats) => ({ current: Math.min(5, stats.pomodoroSessions), target: 5 })
  },
  {
    id: 'pomodoro_15',
    title: 'Derin Çalışma',
    desc: 'Çalışma odasında toplam 15 Pomodoro oturumuna ulaş.',
    icon: '🧠',
    category: 'study',
    xpReward: 25,
    check: (stats) => stats.pomodoroSessions >= 15,
    progress: (stats) => ({ current: Math.min(15, stats.pomodoroSessions), target: 15 })
  },
  {
    id: 'night_owl',
    title: 'Gece Kuşu',
    desc: 'Saat 22:00\'den sonra bir test çöz.',
    icon: '🦉',
    category: 'special',
    xpReward: 5,
    check: (stats) => stats.hasNightTest === true,
    progress: (stats) => ({ current: stats.hasNightTest ? 1 : 0, target: 1 })
  },
  {
    id: 'early_bird',
    title: 'Erken Kalkan',
    desc: 'Sabah 08:30\'dan önce bir test çöz.',
    icon: '🌅',
    category: 'special',
    xpReward: 5,
    check: (stats) => stats.hasEarlyTest === true,
    progress: (stats) => ({ current: stats.hasEarlyTest ? 1 : 0, target: 1 })
  },
  {
    id: 'weekend_warrior',
    title: 'Hafta Sonu Savaşçısı',
    desc: 'Hafta sonu (Cumartesi veya Pazar) test çöz.',
    icon: '🏕️',
    category: 'special',
    xpReward: 5,
    check: (stats) => stats.hasWeekendTest === true,
    progress: (stats) => ({ current: stats.hasWeekendTest ? 1 : 0, target: 1 })
  }
];

export function getLevelInfo(xp) {
  const currentXp = Math.max(0, Math.round(Number(xp) || 0));
  let activeTier = LEVEL_TIERS[0];
  let nextTier = LEVEL_TIERS[1];

  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (currentXp >= LEVEL_TIERS[i].minXp) {
      activeTier = LEVEL_TIERS[i];
      nextTier = LEVEL_TIERS[i + 1] || null;
    }
  }

  const min = activeTier.minXp;
  const max = nextTier ? nextTier.minXp : (activeTier.minXp + 500);
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
  let highAccuracyTests = 0;
  let hasNightTest = false;
  let hasEarlyTest = false;
  let hasWeekendTest = false;
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

    // High accuracy (>= 90%)
    if (totalQ > 0 && (correct / totalQ) >= 0.9) {
      highAccuracyTests++;
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

        const dayOfWeek = dt.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) hasWeekendTest = true;
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
    if (d) {
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) {
        activeDates.add(dt.toISOString().split('T')[0]);
        if (dt.getDay() === 0 || dt.getDay() === 6) hasWeekendTest = true;
      }
    }
  });

  // Calculate Daily Streak
  const sortedDates = Array.from(activeDates).sort().reverse();
  let dailyStreak = 0;
  if (sortedDates.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

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
    highAccuracyTests,
    hasNightTest,
    hasEarlyTest,
    hasWeekendTest,
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

  // Scaled XP Calculation (1/10 scale)
  let totalXp = 0;
  totalXp += totalCorrect * 1;                         // 1 XP per correct answer (was 10)
  totalXp += Math.round(totalSolvedTests * 2.5);       // 2.5 XP per completed test (was 25)
  totalXp += perfectTestsCount * 5;                    // 5 XP per 100% test (was 50)
  totalXp += Math.floor(totalStudyMinutes / 25) * 2;   // 2 XP per 25 min pomodoro (was 20)
  totalXp += Math.round(dailyStreak * 1.5);            // 1.5 XP per streak day (was 15)
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
