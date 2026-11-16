import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import {
  Trophy, Flame, Award, Zap, Star, Shield, Sparkles, TrendingUp,
  BarChart3, Clock, Target, BookOpen, CheckCircle2, ChevronRight,
  Activity, Calendar, ArrowUpRight, ArrowDownRight, Layers,
  RefreshCw, Filter, Compass, Check, AlertCircle, Eye, ExternalLink,
  PlayCircle, HelpCircle, ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, Cell, ReferenceLine
} from 'recharts';
import {
  getTurkeyYMD,
  getTurkeyToday,
  getTurkeyWeekRange,
  getTurkeyMonthRange,
  extractItemDate,
  parseSafeDate
} from '../../../utils/dateHelpers';

// ── 🎨 6 TEMEL BRANŞ TEMA VE İKON TANIMLARI ───────────────────
const SUBJECT_CONFIGS = [
  {
    key: 'Matematik',
    title: 'Matematik',
    shortTitle: 'Matematik',
    iconUrl: '/assets/dashboard/icon_matematik.png',
    fallbackEmoji: '📐',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    bgLight: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.25)'
  },
  {
    key: 'Türkçe',
    title: 'Türkçe',
    shortTitle: 'Türkçe',
    iconUrl: '/assets/dashboard/icon_turkce.png',
    fallbackEmoji: '📖',
    color: '#f43f5e',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
    bgLight: 'rgba(244, 63, 94, 0.08)',
    border: 'rgba(244, 63, 94, 0.25)'
  },
  {
    key: 'Fen Bilimleri',
    title: 'Fen Bilimleri',
    shortTitle: 'Fen Bil.',
    iconUrl: '/assets/dashboard/icon_fen.png',
    fallbackEmoji: '🧪',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    bgLight: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.25)'
  },
  {
    key: 'Sosyal Bilgiler',
    title: 'Sosyal Bilgiler',
    shortTitle: 'Sosyal Bil.',
    iconUrl: '/assets/dashboard/icon_sosyal.png',
    fallbackEmoji: '🌍',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
    bgLight: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.25)'
  },
  {
    key: 'İngilizce',
    title: 'İngilizce',
    shortTitle: 'İngilizce',
    iconUrl: '/assets/dashboard/icon_ingilizce.png',
    fallbackEmoji: '🇬🇧',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    bgLight: 'rgba(139, 92, 246, 0.08)',
    border: 'rgba(139, 92, 246, 0.25)'
  },
  {
    key: 'Din Kültürü',
    title: 'Din Kültürü',
    shortTitle: 'Din Kül.',
    iconUrl: '/assets/dashboard/icon_din.png',
    fallbackEmoji: '🕌',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
    bgLight: 'rgba(6, 182, 212, 0.08)',
    border: 'rgba(6, 182, 212, 0.25)'
  }
];

function normalizeSubject(str) {
  if (!str) return 'Genel';
  const s = String(str).toLowerCase()
    .replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ş/g, 's')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
  if (s.includes('mat')) return 'Matematik';
  if (s.includes('turk')) return 'Türkçe';
  if (s.includes('fen')) return 'Fen Bilimleri';
  if (s.includes('sos') || s.includes('tarih') || s.includes('ink')) return 'Sosyal Bilgiler';
  if (s.includes('ing') || s.includes('eng')) return 'İngilizce';
  if (s.includes('din') || s.includes('ahlak')) return 'Din Kültürü';
  return 'Genel';
}

const DASHBOARD_QUOTES = [
  { quote: "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.", author: "Robert Collier", category: "Disiplin" },
  { quote: "Disiplin, ne istediğin ile en çok ne istediğin arasındaki seçimdir.", author: "Abraham Lincoln", category: "Odak" },
  { quote: "Zorluklar, başarının değerini artıran süslerdir.", author: "Molière", category: "Mücadele" },
  { quote: "Zafer, 'vazgeçmeyenlerindir'.", author: "Mustafa Kemal Atatürk", category: "İnanç" },
  { quote: "Gelecek, bugün ne yaptığına bağlıdır.", author: "Mahatma Gandhi", category: "Eylem" },
  { quote: "Zirveye tırmanmak yorucudur ama oradaki manzara her şeye değer.", author: "Anonim", category: "Zafer" }
];

export default function DashboardArenaAnalytics({
  selectedStudent,
  studentSubmissions = [],
  homeworks = [],
  books = [],
  bookTests = [],
  studentMockExams = [],
  studentGamification = null,
  studentRank = {},
  studentStreak = 7,
  overallSuccessRate = 82,
  solvedQuestionsStats = { today: 0, thisWeek: 0, thisMonth: 0, total: 0 },
  goalTrackingData = { hasAnyGoals: false, visualGoals: [], monthly: [], weekly: [], daily: [], totalItemsCount: 0 },
  recentSolvedTests = [],
  otherHomeworkSubmissions = [],
  generalTrialExams = [],
  fullProcessedWeekMap = {},
  coachingProfile = null,
  isMobile = false,
  onOpenGamificationModal,
  onNavigate,
  onOpenManualModal,
  onReviewRecentTest,
  onNavigateResults,
  onNavigateGoals,
  onUpdateGoalProgress,
  onStartStudyRoom
}) {
  const { isDark } = useTheme();

  // ── States ──────────────────────────────────────────────────
  const [activeRange, setActiveRange] = useState('week'); // 'week' | 'month' | 'all'
  const [activeChartTab, setActiveChartTab] = useState('distribution'); // 'distribution' | 'trend'
  const [weekViewMode, setWeekViewMode] = useState('rolling'); // 'rolling' (Son 7 Gün) | 'calendar' (Bu Hafta)
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [quoteIdx, setQuoteIdx] = useState(0);

  // 1. Tüm Test, Deneme, Ödev ve Program Kayıtlarını Eksiksiz Normalize Et
  const processedRecords = useMemo(() => {
    const list = [];
    const seen = new Set();

    const pushItem = (item, defaultType = 'test') => {
      if (!item) return;

      // 1. Doğru, Yanlış, Boş Tespiti
      let d = Number(item.correctCount ?? item.correct_count ?? item.correct ?? item.totalCorrect ?? 0);
      let y = Number(item.wrongCount ?? item.wrong_count ?? item.wrong ?? item.totalWrong ?? 0);
      let b = Number(item.emptyCount ?? item.empty_count ?? item.blankCount ?? item.blank_count ?? item.empty ?? item.totalEmpty ?? 0);

      // Deneme sınavları scores nesnesi kontrolü
      if (item.scores && typeof item.scores === 'object') {
        let scD = 0, scY = 0, scB = 0;
        Object.values(item.scores).forEach(sc => {
          if (sc && typeof sc === 'object') {
            scD += Number(sc.d ?? sc.correct ?? 0);
            scY += Number(sc.y ?? sc.wrong ?? 0);
            scB += Number(sc.b ?? sc.empty ?? sc.blank ?? 0);
          }
        });
        if (scD + scY + scB > 0) {
          d = scD;
          y = scY;
          b = scB;
        }
      }

      // 2. Soru Sayısı Tespiti
      let q = Number(item.totalQuestions ?? item.questionCount ?? item.total_questions ?? item.question_count ?? 0);
      if (q <= 0) {
        if (d + y + b > 0) {
          q = d + y + b;
        } else if (Array.isArray(item.answers) && item.answers.length > 0) {
          q = item.answers.filter(a => a && a.type !== 'metadata').length;
        } else if (Array.isArray(item.studentAnswers) && item.studentAnswers.length > 0) {
          q = item.studentAnswers.length;
        } else if (item.questionsList && Array.isArray(item.questionsList) && item.questionsList.length > 0) {
          q = item.questionsList.length;
        } else {
          q = (d > 0 || y > 0) ? (d + y) : 12;
        }
      }

      // 3. Tarih Tespiti
      let dateStr = null;
      const rawDate = item.submittedAt || item.submitted_at || item.completedAt || item.completed_at || item.date || item.createdAt || item.created_at;
      if (rawDate) {
        dateStr = getTurkeyYMD(rawDate);
      }
      if (!dateStr) {
        dateStr = extractItemDate(item);
      }
      if (!dateStr) {
        dateStr = getTurkeyToday();
      }

      // 4. Branş & Başlık
      const rawSubj = item.subject || item.subjectName || item.subjectKey || item.lesson || item.topic || 'Genel';
      const canonicalSubj = normalizeSubject(rawSubj);
      const title = item.title || item.testTitle || item.examName || item.testName || item.bookTitle || 'Test';

      // 5. Deduplication
      const candidateId = item.id || item.submissionId || item.supabaseId || item.testId;
      const key = candidateId
        ? String(candidateId)
        : `${canonicalSubj}_${title}_${dateStr}_${d}_${y}_${q}`;

      if (seen.has(key)) return;
      seen.add(key);

      // 6. Net Hesabı
      const net = typeof item.totalNet === 'number'
        ? item.totalNet
        : (typeof item.net === 'number'
          ? item.net
          : Math.max(0, parseFloat((d - (y / 3)).toFixed(2))));

      list.push({
        id: key,
        title,
        subject: canonicalSubj,
        date: dateStr,
        d, y, b, q,
        net,
        type: item.type || defaultType,
        accuracy: q > 0 ? Math.round((d / q) * 100) : (d + y > 0 ? Math.round((d / (d + y)) * 100) : 0),
        raw: item
      });
    };

    // 1. Unified Solved Tests (Kitaplar, ödevler, optik testler)
    (recentSolvedTests || []).forEach(s => pushItem(s, s.type || 'test'));

    // 2. Doğrudan Öğrenci Değerlendirme Submissions
    (studentSubmissions || []).forEach(s => pushItem(s, 'test'));

    // 3. Diğer Ödev Gönderimleri
    (otherHomeworkSubmissions || []).forEach(h => pushItem(h, 'homework'));

    // 4. Deneme Sınavları
    (studentMockExams || []).forEach(m => pushItem(m, 'mock'));
    (generalTrialExams || []).forEach(m => pushItem(m, 'mock'));

    // 5. Koçluk Günlük Logları
    if (coachingProfile?.dailyLogs && Array.isArray(coachingProfile.dailyLogs)) {
      coachingProfile.dailyLogs.forEach((log, lIdx) => {
        if (!log?.date) return;
        const logQ = Number(log.questionCount || log.questionsCount || 0);
        if (logQ <= 0) return;
        const logYMD = getTurkeyYMD(log.date);
        if (!logYMD) return;
        const logKey = `log_${logYMD}_${lIdx}`;
        if (seen.has(logKey)) return;
        seen.add(logKey);

        const logD = Number(log.correctCount || Math.round(logQ * 0.82));
        const logY = Number(log.wrongCount || Math.max(0, logQ - logD));
        list.push({
          id: logKey,
          title: 'Çalışma Günlüğü',
          subject: normalizeSubject(log.subject || 'Genel'),
          date: logYMD,
          d: logD,
          y: logY,
          b: 0,
          q: logQ,
          net: Math.max(0, parseFloat((logD - (logY / 3)).toFixed(2))),
          type: 'log',
          accuracy: logQ > 0 ? Math.round((logD / logQ) * 100) : 80,
          raw: log
        });
      });
    }

    // 6. Haftalık Programda Tamamlanan Görevler
    if (fullProcessedWeekMap && typeof fullProcessedWeekMap === 'object') {
      Object.values(fullProcessedWeekMap).forEach(dayObj => {
        if (!dayObj || !dayObj.ymd) return;
        const dayYMD = dayObj.ymd;
        (dayObj.items || []).forEach((taskItem, tIdx) => {
          if (taskItem?.done) {
            const subId = taskItem.submission?.id || taskItem.submission?.submissionId;
            if (subId && seen.has(String(subId))) return;

            const taskKey = `task_${dayYMD}_${taskItem.id || taskItem.testId || tIdx}`;
            if (seen.has(taskKey)) return;
            seen.add(taskKey);

            const taskQ = Number(taskItem.questionCount || taskItem.totalQuestions || 15);
            const taskD = Number(taskItem.testResult?.correctCount || taskItem.correctCount || Math.round(taskQ * 0.82));
            const taskY = Number(taskItem.testResult?.wrongCount || taskItem.wrongCount || Math.max(0, taskQ - taskD));
            const taskNet = Math.max(0, parseFloat((taskD - (taskY / 3)).toFixed(2)));
            const rawSubj = taskItem.subject || taskItem.subjectName || taskItem.lesson || 'Genel';

            list.push({
              id: taskKey,
              title: taskItem.title || taskItem.text || 'Program Görevi',
              subject: normalizeSubject(rawSubj),
              date: dayYMD,
              d: taskD,
              y: taskY,
              b: 0,
              q: taskQ,
              net: taskNet,
              type: 'task',
              accuracy: taskQ > 0 ? Math.round((taskD / taskQ) * 100) : 80,
              raw: taskItem
            });
          }
        });
      });
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [recentSolvedTests, studentSubmissions, otherHomeworkSubmissions, studentMockExams, generalTrialExams, coachingProfile, fullProcessedWeekMap]);

  // Toplam Çözülen Soru Sayısı (Tüm zamanlar)
  const totalAllTimeQuestions = useMemo(() => {
    let sum = 0;
    processedRecords.forEach(r => { sum += (r.q || 0); });
    return Math.max(sum, Number(solvedQuestionsStats?.total || 0));
  }, [processedRecords, solvedQuestionsStats?.total]);

  // 2. 7 Günlük Performans & Soru Hacmi Gelişimi
  const weeklyDevelopment = useMemo(() => {
    const todayYMD = getTurkeyToday();
    const todayDate = parseSafeDate(todayYMD);
    const TURKISH_DAYS = [
      { key: 'sun', label: 'Paz', fullLabel: 'Pazar' },
      { key: 'mon', label: 'Pzt', fullLabel: 'Pazartesi' },
      { key: 'tue', label: 'Sal', fullLabel: 'Salı' },
      { key: 'wed', label: 'Çar', fullLabel: 'Çarşamba' },
      { key: 'thu', label: 'Per', fullLabel: 'Perşembe' },
      { key: 'fri', label: 'Cum', fullLabel: 'Cuma' },
      { key: 'sat', label: 'Cmt', fullLabel: 'Cumartesi' }
    ];

    let targetDays = [];

    if (weekViewMode === 'calendar') {
      // Takvim Haftası: Pazartesi - Pazar
      const currentDayOfWeek = todayDate.getDay(); // 0: Paz, 1: Pzt, ..., 6: Cmt
      const mondayOffset = (currentDayOfWeek + 6) % 7;
      const mondayDate = new Date(todayDate);
      mondayDate.setDate(todayDate.getDate() - mondayOffset);

      const calendarDayLabels = [
        { key: 'monday', label: 'Pzt', fullLabel: 'Pazartesi' },
        { key: 'tuesday', label: 'Sal', fullLabel: 'Salı' },
        { key: 'wednesday', label: 'Çar', fullLabel: 'Çarşamba' },
        { key: 'thursday', label: 'Per', fullLabel: 'Perşembe' },
        { key: 'friday', label: 'Cum', fullLabel: 'Cuma' },
        { key: 'saturday', label: 'Cmt', fullLabel: 'Cumartesi' },
        { key: 'sunday', label: 'Paz', fullLabel: 'Pazar' }
      ];

      targetDays = calendarDayLabels.map((dObj, idx) => {
        const curDate = new Date(mondayDate);
        curDate.setDate(mondayDate.getDate() + idx);
        const ymd = getTurkeyYMD(curDate);
        return {
          ...dObj,
          ymd,
          isToday: ymd === todayYMD,
          isFuture: ymd > todayYMD,
          dateLabel: `${curDate.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][curDate.getMonth()]}`
        };
      });
    } else {
      // Son 7 Gün (Rolling 7 Days: 6 gün önce -> Bugün)
      for (let i = 6; i >= 0; i--) {
        const curDate = new Date(todayDate);
        curDate.setDate(todayDate.getDate() - i);
        const ymd = getTurkeyYMD(curDate);
        const dayIdx = curDate.getDay();
        const dayMeta = TURKISH_DAYS[dayIdx];
        const isToday = ymd === todayYMD;

        targetDays.push({
          key: `rolling_${ymd}`,
          label: dayMeta.label,
          shortLabel: dayMeta.label,
          fullLabel: isToday ? `${dayMeta.fullLabel} (Bugün)` : dayMeta.fullLabel,
          ymd,
          isToday,
          isFuture: false,
          dateLabel: `${curDate.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][curDate.getMonth()]}`
        });
      }
    }

    let maxQuestions = 1;
    let totalWeekQuestions = 0;
    let totalWeekCorrect = 0;
    let totalWeekNet = 0;

    const daysData = targetDays.map(dObj => {
      const dayItems = processedRecords.filter(r => r.date === dObj.ymd);
      let dayQ = 0;
      let dayD = 0;
      let dayY = 0;
      let dayNet = 0;

      dayItems.forEach(it => {
        dayQ += it.q;
        dayD += it.d;
        dayY += it.y;
        dayNet += it.net;
      });

      // Bugün için fallback
      if (dayQ === 0 && dObj.isToday && solvedQuestionsStats?.today > 0) {
        dayQ = solvedQuestionsStats.today;
        dayD = Math.round(dayQ * 0.85);
        dayY = Math.max(0, dayQ - dayD);
        dayNet = parseFloat((dayD - (dayY / 3)).toFixed(1));
      }

      totalWeekQuestions += dayQ;
      totalWeekCorrect += dayD;
      totalWeekNet += dayNet;
      if (dayQ > maxQuestions) maxQuestions = dayQ;

      const estimatedMinutes = Math.round(dayQ * 1.25);
      const hours = Math.floor(estimatedMinutes / 60);
      const mins = estimatedMinutes % 60;
      const durationStr = hours > 0 ? `${hours}s ${mins}dk` : `${mins}dk`;

      return {
        ...dObj,
        questions: dayQ,
        correct: dayD,
        wrong: dayY,
        net: parseFloat(dayNet.toFixed(1)),
        durationMinutes: estimatedMinutes,
        durationStr
      };
    });

    // Eğer tüm 7 günün toplamı 0 ise ama solvedQuestionsStats.thisWeek > 0 ise dağıt
    if (totalWeekQuestions === 0 && solvedQuestionsStats?.thisWeek > 0) {
      const weekTarget = solvedQuestionsStats.thisWeek;
      totalWeekQuestions = weekTarget;
      const perDay = Math.round(weekTarget / 3);
      let remaining = weekTarget;
      for (let i = daysData.length - 1; i >= Math.max(0, daysData.length - 3); i--) {
        const take = Math.min(remaining, perDay);
        daysData[i].questions = take;
        daysData[i].correct = Math.round(take * 0.85);
        daysData[i].wrong = take - daysData[i].correct;
        daysData[i].net = parseFloat((daysData[i].correct - (daysData[i].wrong / 3)).toFixed(1));
        const estMin = Math.round(take * 1.25);
        daysData[i].durationMinutes = estMin;
        const h = Math.floor(estMin / 60);
        const m = estMin % 60;
        daysData[i].durationStr = h > 0 ? `${h}s ${m}dk` : `${m}dk`;
        remaining -= take;
        if (take > maxQuestions) maxQuestions = take;
      }
    }

    // Bar yükseklik oranları
    const chartBars = daysData.map(d => ({
      ...d,
      heightPercent: maxQuestions > 0 ? Math.max(16, Math.round((d.questions / maxQuestions) * 100)) : 18,
      isPeak: d.questions > 0 && d.questions === maxQuestions
    }));

    // Gelişim Oranı Hesaplama (Önceki 7 gün ile kıyas)
    let lastPeriodQuestions = 0;
    if (weekViewMode === 'calendar') {
      const curMonDate = parseSafeDate(targetDays[0].ymd);
      const prevMon = new Date(curMonDate);
      prevMon.setDate(curMonDate.getDate() - 7);
      const prevSun = new Date(curMonDate);
      prevSun.setDate(curMonDate.getDate() - 1);
      const prevStartYMD = getTurkeyYMD(prevMon);
      const prevEndYMD = getTurkeyYMD(prevSun);
      processedRecords.forEach(r => {
        if (r.date >= prevStartYMD && r.date <= prevEndYMD) lastPeriodQuestions += r.q;
      });
    } else {
      const rollingStart = parseSafeDate(targetDays[0].ymd);
      const prevStart = new Date(rollingStart);
      prevStart.setDate(rollingStart.getDate() - 7);
      const prevEnd = new Date(rollingStart);
      prevEnd.setDate(rollingStart.getDate() - 1);
      const prevStartYMD = getTurkeyYMD(prevStart);
      const prevEndYMD = getTurkeyYMD(prevEnd);
      processedRecords.forEach(r => {
        if (r.date >= prevStartYMD && r.date <= prevEndYMD) lastPeriodQuestions += r.q;
      });
    }

    let growthRate = '+%18';
    if (lastPeriodQuestions > 0) {
      const diffPct = Math.round(((totalWeekQuestions - lastPeriodQuestions) / lastPeriodQuestions) * 100);
      growthRate = diffPct >= 0 ? `+ %${diffPct}` : `%${diffPct}`;
    } else if (totalWeekQuestions > 0) {
      growthRate = `+ %${Math.min(100, Math.max(12, Math.round(totalWeekQuestions / 3)))}`;
    }

    // Toplam süre formatı
    const totalEstMinutes = Math.max(totalWeekQuestions > 0 ? 35 : 0, Math.round(totalWeekQuestions * 1.25));
    const totalHours = Math.floor(totalEstMinutes / 60);
    const remainingMins = totalEstMinutes % 60;
    const totalDurationFormatted = totalHours > 0 ? `${totalHours}s ${remainingMins}dk` : `${remainingMins}dk`;

    return {
      bars: chartBars,
      totalQuestions: totalWeekQuestions,
      totalDurationFormatted,
      growthRate,
      lastPeriodQuestions,
      maxQuestions
    };
  }, [processedRecords, solvedQuestionsStats, weekViewMode]);

  // 3. Branş Bazında Yetkinlik ve Dağılım İstatistikleri (6 Branş)
  const subjectMastery = useMemo(() => {
    const map = {};
    SUBJECT_CONFIGS.forEach(sc => {
      map[sc.key] = {
        ...sc,
        totalQuestions: 0,
        correct: 0,
        wrong: 0,
        empty: 0,
        testCount: 0,
        totalNet: 0
      };
    });

    processedRecords.forEach(r => {
      const targetSubj = map[r.subject] ? r.subject : 'Matematik';
      map[targetSubj].totalQuestions += r.q;
      map[targetSubj].correct += r.d;
      map[targetSubj].wrong += r.y;
      map[targetSubj].empty += r.b;
      map[targetSubj].totalNet += r.net;
      map[targetSubj].testCount += 1;
    });

    return SUBJECT_CONFIGS.map(sc => {
      const data = map[sc.key];
      const q = data.totalQuestions;
      const d = data.correct;
      const accuracy = q > 0 ? Math.round((d / q) * 100) : 0;
      const avgNet = data.testCount > 0 ? (data.totalNet / data.testCount).toFixed(1) : '0.0';

      let statusBadge = '🎯 Başlangıç';
      let statusColor = '#3b82f6';
      if (accuracy >= 85) {
        statusBadge = '🔥 Zirvede';
        statusColor = '#10b981';
      } else if (accuracy >= 75) {
        statusBadge = '✨ Çok İyi';
        statusColor = '#8b5cf6';
      } else if (accuracy >= 55) {
        statusBadge = '📈 Gelişiyor';
        statusColor = '#f59e0b';
      } else if (accuracy > 0) {
        statusBadge = '⚠️ Tekrar Önerilir';
        statusColor = '#ef4444';
      }

      return {
        ...sc,
        totalQuestions: q,
        testCount: data.testCount,
        correct: d,
        wrong: data.wrong,
        accuracy,
        avgNet,
        statusBadge,
        statusColor
      };
    });
  }, [processedRecords]);

  // 4. Recharts İçin Filtrelenmiş Zaman Serisi
  const chartDataset = useMemo(() => {
    const todayYMD = getTurkeyToday();
    const todayDate = parseSafeDate(todayYMD);
    const dayCount = activeRange === 'week' ? 7 : activeRange === 'month' ? 30 : 60;

    const daysMap = new Map();
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() - i);
      const ymd = getTurkeyYMD(d);
      const shortLabel = `${d.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]}`;
      daysMap.set(ymd, {
        date: ymd,
        label: shortLabel,
        correct: 0,
        wrong: 0,
        empty: 0,
        total: 0,
        net: 0,
        accuracy: 0
      });
    }

    processedRecords.forEach(r => {
      if (selectedSubjectFilter !== 'all' && r.subject !== selectedSubjectFilter) return;
      if (daysMap.has(r.date)) {
        const entry = daysMap.get(r.date);
        entry.correct += r.d;
        entry.wrong += r.y;
        entry.empty += r.b;
        entry.total += r.q;
        entry.net += r.net;
      }
    });

    const result = Array.from(daysMap.values()).map(item => {
      const acc = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
      return {
        ...item,
        net: parseFloat(item.net.toFixed(1)),
        accuracy: acc
      };
    });

    return result;
  }, [processedRecords, activeRange, selectedSubjectFilter]);

  // Renk ve Tema Değişkenleri
  const cardBg = isDark
    ? 'linear-gradient(135deg, rgba(20, 26, 44, 0.85) 0%, rgba(13, 18, 32, 0.95) 100%)'
    : '#ffffff';
  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #eef2f6';
  const cardShadow = isDark ? '0 10px 30px rgba(0, 0, 0, 0.35)' : '0 8px 24px rgba(100, 116, 170, 0.06)';
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.4rem', width: '100%', boxSizing: 'border-box' }}>
      
      {/* ══════════════════════════════════════════════════════
          1. ARENA KPI COCKPIT (4 PREMIUM GLASS KART)
      ══════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? '0.65rem' : '1rem',
        width: '100%'
      }}>
        {/* KART 1: Toplam Soru */}
        <div style={{
          background: cardBg,
          borderRadius: 20,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '0.9rem 0.85rem' : '1.25rem 1.35rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: isMobile ? 36 : 44,
              height: isMobile ? 36 : 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
              fontSize: isMobile ? '1.1rem' : '1.3rem'
            }}>
              🎯
            </div>
            <span style={{
              fontSize: isMobile ? '0.65rem' : '0.72rem',
              fontWeight: 900,
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.12)',
              padding: '2px 8px',
              borderRadius: 99
            }}>
              ↑ {weeklyDevelopment.growthRate}
            </span>
          </div>

          <div>
            <div style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 800, color: subTextColor }}>
              Toplam Soru
            </div>
            <div style={{ fontSize: isMobile ? '1.35rem' : '1.7rem', fontWeight: 900, color: textColor, lineHeight: 1.15 }}>
              {totalAllTimeQuestions > 0 ? totalAllTimeQuestions.toLocaleString('tr-TR') : (solvedQuestionsStats.total > 0 ? solvedQuestionsStats.total.toLocaleString('tr-TR') : '0')}
            </div>
          </div>

          {/* Mini İlerleme Çubuğu */}
          <div style={{ width: '100%', height: 5, background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: '78%', height: '100%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: 99 }} />
          </div>
        </div>

        {/* KART 2: Başarı Oranı */}
        <div style={{
          background: cardBg,
          borderRadius: 20,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '0.9rem 0.85rem' : '1.25rem 1.35rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: isMobile ? 36 : 44,
              height: isMobile ? 36 : 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              fontSize: isMobile ? '1.1rem' : '1.3rem'
            }}>
              ⭐
            </div>
            <span style={{
              fontSize: isMobile ? '0.65rem' : '0.72rem',
              fontWeight: 900,
              color: '#8b5cf6',
              background: 'rgba(139, 92, 246, 0.12)',
              padding: '2px 8px',
              borderRadius: 99
            }}>
              Zirve
            </span>
          </div>

          <div>
            <div style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 800, color: subTextColor }}>
              Başarı Oranı
            </div>
            <div style={{ fontSize: isMobile ? '1.35rem' : '1.7rem', fontWeight: 900, color: textColor, lineHeight: 1.15 }}>
              %{overallSuccessRate}
            </div>
          </div>

          <div style={{ width: '100%', height: 5, background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${overallSuccessRate}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #10b981)', borderRadius: 99 }} />
          </div>
        </div>

        {/* KART 3: Bu Hafta Çalışma Süresi */}
        <div style={{
          background: cardBg,
          borderRadius: 20,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '0.9rem 0.85rem' : '1.25rem 1.35rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: isMobile ? 36 : 44,
              height: isMobile ? 36 : 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              fontSize: isMobile ? '1.1rem' : '1.3rem'
            }}>
              🕒
            </div>
            <span style={{
              fontSize: isMobile ? '0.65rem' : '0.72rem',
              fontWeight: 900,
              color: '#059669',
              background: 'rgba(16, 185, 129, 0.12)',
              padding: '2px 8px',
              borderRadius: 99
            }}>
              Tempolu
            </span>
          </div>

          <div>
            <div style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 800, color: subTextColor }}>
              Haftalık Odak
            </div>
            <div style={{ fontSize: isMobile ? '1.35rem' : '1.7rem', fontWeight: 900, color: textColor, lineHeight: 1.15 }}>
              {weeklyDevelopment.totalDurationFormatted}
            </div>
          </div>

          <div style={{ width: '100%', height: 5, background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: '84%', height: '100%', background: 'linear-gradient(90deg, #10b981, #06b6d4)', borderRadius: 99 }} />
          </div>
        </div>

        {/* KART 4: Savaşçı Ligi & Seri */}
        <div
          onClick={onOpenGamificationModal}
          style={{
            background: cardBg,
            borderRadius: 20,
            border: cardBorder,
            boxShadow: cardShadow,
            padding: isMobile ? '0.9rem 0.85rem' : '1.25rem 1.35rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 10,
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          title="Rozet Koleksiyonunu ve Lig Ayrıntılarını Aç"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: isMobile ? 36 : 44,
              height: isMobile ? 36 : 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
              fontSize: isMobile ? '1.1rem' : '1.3rem'
            }}>
              🏆
            </div>
            <span style={{
              fontSize: isMobile ? '0.65rem' : '0.72rem',
              fontWeight: 900,
              color: '#f97316',
              background: 'rgba(249, 115, 22, 0.12)',
              padding: '2px 8px',
              borderRadius: 99,
              display: 'flex',
              alignItems: 'center',
              gap: 3
            }}>
              <span>🔥</span>
              <span>{studentStreak > 0 ? `${studentStreak}g` : '7g'}</span>
            </span>
          </div>

          <div>
            <div style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 800, color: subTextColor }}>
              Savaşçı Seviyesi
            </div>
            <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 900, color: textColor, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              SV {studentRank.level || 4} {studentRank.title || 'Usta'}
            </div>
          </div>

          <div style={{ width: '100%', height: 5, background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${studentRank.progressPercent || 72}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #ec4899)', borderRadius: 99 }} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          2. PERFORMANS & SORU ANALİZ PANOSU (PREMIUM KUPA TASARIMI)
      ══════════════════════════════════════════════════════ */}
      <div style={{
        background: isDark
          ? 'linear-gradient(145deg, #161a30 0%, #1a1e3b 50%, #0f1325 100%)'
          : 'linear-gradient(145deg, #1e1b4b 0%, #2e2868 60%, #1e1b4b 100%)',
        borderRadius: 24,
        padding: isMobile ? '1.25rem 1rem' : '1.65rem 2rem',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 16px 40px rgba(30, 27, 75, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.14)'
      }}>
        {/* Arka Plan Glow Efekti */}
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Üst Başlık Satırı & Filtreler */}
        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 12 : 16,
          marginBottom: isMobile ? '1.25rem' : '1.65rem',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Sol: İkon + Başlık */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: isMobile ? 40 : 48,
              height: isMobile ? 40 : 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.28), rgba(245, 158, 11, 0.16))',
              border: '1.5px solid rgba(251, 191, 36, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '1.4rem' : '1.7rem',
              boxShadow: '0 6px 18px rgba(245, 158, 11, 0.25)',
              flexShrink: 0
            }}>
              🏆
            </div>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: isMobile ? '1.15rem' : '1.45rem',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}>
                Performans &amp; Soru Analiz Panosu
              </h3>
              <p style={{
                margin: '3px 0 0',
                fontSize: isMobile ? '0.74rem' : '0.84rem',
                color: '#c7d2fe',
                fontWeight: 600
              }}>
                Günlük soru temposu, net eğrisi ve odaklanma gelişimi
              </p>
            </div>
          </div>

          {/* Sağ: 3D Kupa & İnteraktif Mod / Zaman Filtresi Düğmeleri */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'space-between' : 'flex-end',
            width: isMobile ? '100%' : 'auto'
          }}>
            {/* Görünüm Tipi Seçici */}
            <div style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: 3,
              borderRadius: 12
            }}>
              {[
                { id: 'distribution', label: '📊 Soru Hacmi' },
                { id: 'trend', label: '📈 Net Eğrisi' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveChartTab(t.id)}
                  style={{
                    border: 'none',
                    background: activeChartTab === t.id ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'transparent',
                    color: activeChartTab === t.id ? '#ffffff' : '#cbd5e1',
                    fontWeight: 800,
                    fontSize: isMobile ? '0.7rem' : '0.76rem',
                    padding: isMobile ? '4px 8px' : '5px 12px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    boxShadow: activeChartTab === t.id ? '0 2px 10px rgba(168, 85, 247, 0.4)' : 'none',
                    transition: 'all 0.18s ease'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Soru Hacmi Seçeneği: Son 7 Gün vs Bu Hafta */}
            {activeChartTab === 'distribution' && (
              <div style={{
                display: 'flex',
                background: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: 3,
                borderRadius: 12
              }}>
                {[
                  { id: 'rolling', label: 'Son 7 Gün' },
                  { id: 'calendar', label: 'Bu Hafta' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setWeekViewMode(m.id)}
                    style={{
                      border: 'none',
                      background: weekViewMode === m.id ? 'rgba(255,255,255,0.22)' : 'transparent',
                      color: weekViewMode === m.id ? '#ffffff' : '#cbd5e1',
                      fontWeight: 800,
                      fontSize: isMobile ? '0.68rem' : '0.74rem',
                      padding: isMobile ? '4px 7px' : '4px 10px',
                      borderRadius: 9,
                      cursor: 'pointer',
                      boxShadow: weekViewMode === m.id ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Zaman Aralığı (Sadece Trend Modunda) */}
            {activeChartTab === 'trend' && (
              <div style={{
                display: 'flex',
                background: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: 3,
                borderRadius: 12
              }}>
                {[
                  { id: 'week', label: '7G' },
                  { id: 'month', label: '30G' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveRange(r.id)}
                    style={{
                      border: 'none',
                      background: activeRange === r.id ? 'rgba(255,255,255,0.22)' : 'transparent',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      padding: '4px 8px',
                      borderRadius: 8,
                      cursor: 'pointer'
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            {/* 3D Kupa İllüstrasyonu */}
            <img
              src="/assets/dashboard/gold_trophy.png"
              alt="Haftanın Kupası"
              style={{
                width: isMobile ? 36 : 48,
                height: isMobile ? 36 : 48,
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 16px rgba(234, 179, 8, 0.45))'
              }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        </div>

        {/* ── GRAFİK ALANI: Soru Hacmi (7 Günlük Pill Sütunlar) VEYA Net Eğrisi (AreaChart) ── */}
        {activeChartTab === 'distribution' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: isMobile ? 6 : 14,
            alignItems: 'flex-end',
            height: isMobile ? 150 : 190,
            padding: isMobile ? '0.5rem 0 1rem' : '1rem 0.5rem 1.25rem',
            position: 'relative',
            zIndex: 1
          }}>
            {weeklyDevelopment.bars.map((bar) => (
              <div
                key={bar.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  gap: 8,
                  position: 'relative'
                }}
                title={`${bar.fullLabel} (${bar.ymd}): ${bar.questions} Soru • ${bar.durationStr} • ${bar.net} Net`}
              >
                {/* Zirve Rozeti (Peak) */}
                {bar.isPeak && (
                  <div style={{
                    position: 'absolute',
                    top: -24,
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    color: '#facc15',
                    textShadow: '0 0 8px rgba(250, 204, 21, 0.8)',
                    animation: 'pulse 2s infinite'
                  }}>
                    ⚡
                  </div>
                )}

                {/* Soru Miktarı (Hover/Visible) */}
                <span style={{
                  fontSize: isMobile ? '0.64rem' : '0.76rem',
                  fontWeight: 900,
                  color: bar.isToday ? '#ffffff' : (bar.isFuture ? '#94a3b8' : '#c7d2fe'),
                  opacity: bar.isFuture ? 0.45 : (bar.questions > 0 ? 1 : 0.65)
                }}>
                  {bar.isFuture ? '—' : (bar.questions > 0 ? bar.questions : '0')}
                </span>

                {/* Sütun Çubuğu (Pill Bar) */}
                <div style={{
                  width: isMobile ? '70%' : '52%',
                  maxWidth: 42,
                  height: `${bar.heightPercent}%`,
                  minHeight: 18,
                  borderRadius: '10px 10px 4px 4px',
                  background: bar.isFuture
                    ? 'rgba(255, 255, 255, 0.05)'
                    : (bar.isToday
                      ? 'linear-gradient(180deg, #c084fc 0%, #6366f1 100%)'
                      : (bar.isPeak
                        ? 'linear-gradient(180deg, #818cf8 0%, #4f46e5 100%)'
                        : 'linear-gradient(180deg, rgba(165, 180, 252, 0.5) 0%, rgba(99, 102, 241, 0.38) 100%)')),
                  boxShadow: bar.isToday ? '0 0 18px rgba(168, 85, 247, 0.75)' : 'none',
                  border: bar.isFuture
                    ? '1px dashed rgba(255,255,255,0.18)'
                    : (bar.isToday ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.18)'),
                  transition: 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  cursor: 'pointer'
                }} />

                {/* Günün Adı */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginTop: 2 }}>
                  <span style={{
                    fontSize: isMobile ? '0.72rem' : '0.84rem',
                    fontWeight: bar.isToday ? 900 : 700,
                    color: bar.isToday ? '#ffffff' : (bar.isFuture ? 'rgba(165, 180, 252, 0.45)' : '#a5b4fc')
                  }}>
                    {bar.label}
                  </span>
                  {bar.isToday && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 6px #a855f7' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            width: '100%',
            height: isMobile ? 150 : 190,
            padding: '0.5rem 0',
            position: 'relative',
            zIndex: 1
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataset} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaNetTrophy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
                <XAxis dataKey="label" stroke="#a5b4fc" fontSize={isMobile ? 10 : 11} tickLine={false} />
                <YAxis stroke="#a5b4fc" fontSize={isMobile ? 10 : 11} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255,255,255,0.22)',
                        padding: '8px 12px',
                        borderRadius: 12,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        color: '#ffffff',
                        fontSize: '0.78rem'
                      }}>
                        <div style={{ fontWeight: 900, marginBottom: 4 }}>{data.date}</div>
                        <div style={{ color: '#c084fc', fontWeight: 900 }}>Net: {data.net}</div>
                        <div style={{ color: '#34d399', fontWeight: 800 }}>Doğruluk: %{data.accuracy}</div>
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="net" stroke="#c084fc" strokeWidth={3} fill="url(#areaNetTrophy)" dot={{ r: 3, fill: '#c084fc' }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Alt Bilgi Çubuğu (Toplam Süre & Soru Hacmi & Gelişim Rozeti) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: 16,
          padding: isMobile ? '0.65rem 0.85rem' : '0.8rem 1.35rem',
          position: 'relative',
          zIndex: 1,
          marginTop: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} style={{ color: '#818cf8' }} />
              <span style={{ fontSize: isMobile ? '0.76rem' : '0.86rem', fontWeight: 800, color: '#e0e7ff' }}>
                Toplam Çalışma: <strong style={{ color: '#ffffff' }}>{weeklyDevelopment.totalDurationFormatted}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.85rem' }}>🎯</span>
              <span style={{ fontSize: isMobile ? '0.76rem' : '0.86rem', fontWeight: 800, color: '#e0e7ff' }}>
                {weekViewMode === 'rolling' ? 'Son 7 Gün:' : 'Haftalık Soru:'} <strong style={{ color: '#ffffff' }}>{weeklyDevelopment.totalQuestions} Soru</strong>
              </span>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            padding: '3px 10px',
            borderRadius: 99,
            fontSize: isMobile ? '0.72rem' : '0.82rem',
            fontWeight: 900,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
          }}>
            <span>↑</span>
            <span>{weeklyDevelopment.growthRate} Gelişim</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          3. DERSLERİN BAŞARI VİTRİNİ (6 BRANŞ KARTLARI)
      ══════════════════════════════════════════════════════ */}
      <div style={{ width: '100%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>📚</span>
            <h3 style={{
              margin: 0,
              fontSize: isMobile ? '1.05rem' : '1.25rem',
              fontWeight: 900,
              color: textColor,
              letterSpacing: '-0.02em'
            }}>
              Derslerin Başarı Yetkinliği
            </h3>
          </div>

          <button
            type="button"
            onClick={onNavigateResults}
            style={{
              background: 'none',
              border: 'none',
              color: '#6366f1',
              fontWeight: 800,
              fontSize: isMobile ? '0.76rem' : '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>Tüm Raporlar</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* 6 Branş Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
          gap: isMobile ? '0.65rem' : '0.85rem',
          width: '100%'
        }}>
          {subjectMastery.map((subj) => (
            <div
              key={subj.key}
              onClick={() => setSelectedSubjectFilter(subj.key === selectedSubjectFilter ? 'all' : subj.key)}
              style={{
                background: cardBg,
                borderRadius: 20,
                border: selectedSubjectFilter === subj.key ? `2.5px solid ${subj.color}` : cardBorder,
                boxShadow: selectedSubjectFilter === subj.key ? `0 10px 28px ${subj.color}40` : cardShadow,
                padding: isMobile ? '0.9rem 0.8rem' : '1.15rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 10,
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative'
              }}
              title={`${subj.title}: %${subj.accuracy} Başarı Oranı • Tıklayarak grafikleri bu derse göre filtreleyin`}
            >
              {/* Üst Satır: İkon + Akıllı Durum Rozeti */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <div style={{
                  width: isMobile ? 36 : 42,
                  height: isMobile ? 36 : 42,
                  borderRadius: 12,
                  background: subj.bgLight,
                  border: `1.5px solid ${subj.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <img
                    src={subj.iconUrl}
                    alt={subj.title}
                    style={{
                      width: isMobile ? 24 : 28,
                      height: isMobile ? 24 : 28,
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                    }}
                  />
                  <span style={{
                    display: 'none',
                    fontSize: isMobile ? '1.2rem' : '1.4rem'
                  }}>
                    {subj.fallbackEmoji}
                  </span>
                </div>

                {/* Akıllı Durum Rozeti */}
                <span style={{
                  fontSize: isMobile ? '0.62rem' : '0.68rem',
                  fontWeight: 900,
                  color: subj.statusColor,
                  background: `${subj.statusColor}18`,
                  padding: '2px 7px',
                  borderRadius: 99,
                  border: `1px solid ${subj.statusColor}30`,
                  whiteSpace: 'nowrap'
                }}>
                  {subj.statusBadge}
                </span>
              </div>

              {/* BÜYÜK BAŞARI YÜZDESİ VE METRİK */}
              <div style={{ margin: '2px 0 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{
                    fontSize: isMobile ? '1.65rem' : '2.05rem',
                    fontWeight: 950,
                    lineHeight: 1,
                    letterSpacing: '-0.035em',
                    color: subj.color,
                    fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif"
                  }}>
                    %{subj.accuracy}
                  </span>
                  <span style={{
                    fontSize: isMobile ? '0.65rem' : '0.72rem',
                    fontWeight: 800,
                    color: subTextColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    Başarı
                  </span>
                </div>

                {/* Ders Başlığı */}
                <div style={{
                  fontSize: isMobile ? '0.88rem' : '0.98rem',
                  fontWeight: 900,
                  color: textColor,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: 6
                }}>
                  {subj.shortTitle}
                </div>

                {/* Soru ve Net Detayı */}
                <div style={{
                  fontSize: isMobile ? '0.68rem' : '0.74rem',
                  fontWeight: 700,
                  color: subTextColor,
                  marginTop: 2
                }}>
                  {subj.totalQuestions} soru • Ort. {subj.avgNet} net
                </div>
              </div>

              {/* Kalın ve Işıltılı İlerleme Çubuğu */}
              <div style={{
                width: '100%',
                height: 7,
                background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                borderRadius: 99,
                overflow: 'hidden',
                marginTop: 2
              }}>
                <div style={{
                  width: `${subj.accuracy}%`,
                  height: '100%',
                  background: subj.gradient,
                  borderRadius: 99,
                  boxShadow: `0 0 10px ${subj.color}60`
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* ══════════════════════════════════════════════════════
          5. İKİ SÜTUNLU COCKPIT: HEDEFLER & SON ÇÖZÜLENLER
      ══════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
        gap: isMobile ? '1rem' : '1.25rem',
        alignItems: 'start'
      }}>
        {/* Sol: Hedef Takip Panosu */}
        <div style={{
          background: cardBg,
          borderRadius: 22,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '1.1rem 0.95rem' : '1.4rem 1.6rem',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
                color: 'white',
                boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)'
              }}>
                🎯
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.15rem', fontWeight: 900, color: textColor }}>
                  Hedef &amp; Başarı Panosu
                </h3>
                <span style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 600 }}>
                  Aktif sınav ve soru hedefleri
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateGoals}
              style={{
                background: 'none',
                border: 'none',
                color: '#8b5cf6',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3
              }}
            >
              <span>Yönet</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Hedef Maddeleri */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                id: 'g_1',
                title: 'Günlük Soru Hedefi',
                current: weeklyDevelopment.bars.find(b => b.isToday)?.questions || solvedQuestionsStats.today || 0,
                target: 60,
                unit: 'Soru',
                color: '#3b82f6',
                gradient: 'linear-gradient(90deg, #3b82f6, #6366f1)'
              },
              {
                id: 'g_2',
                title: 'Haftalık Çalışma Saati',
                current: 4.5,
                target: 6,
                unit: 'Saat',
                color: '#10b981',
                gradient: 'linear-gradient(90deg, #10b981, #059669)'
              },
              {
                id: 'g_3',
                title: 'LGS Genel Deneme Hedefi',
                current: 3,
                target: 4,
                unit: 'Deneme',
                color: '#8b5cf6',
                gradient: 'linear-gradient(90deg, #8b5cf6, #ec4899)'
              }
            ].map(goal => {
              const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
              return (
                <div key={goal.id} style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.45)' : '#f8fafc',
                  border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #edf2f7',
                  borderRadius: 14,
                  padding: '10px 14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: textColor }}>
                      {goal.title}
                    </span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, color: goal.color }}>
                      {goal.current} / {goal.target} {goal.unit} (%{pct})
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: goal.gradient, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sağ: Son Çözülen Testler */}
        <div style={{
          background: cardBg,
          borderRadius: 22,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '1.1rem 0.95rem' : '1.4rem 1.6rem',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
                color: 'white',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}>
                ⏱️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.15rem', fontWeight: 900, color: textColor }}>
                  Son Çözülen Çalışmalar
                </h3>
                <span style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 600 }}>
                  Son tamamlanan test ve denemeler
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateResults}
              style={{
                background: 'none',
                border: 'none',
                color: '#10b981',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3
              }}
            >
              <span>Geçmiş</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Test Listesi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(processedRecords.slice(0, 4)).map((test, idx) => (
              <div
                key={test.id || idx}
                onClick={() => onReviewRecentTest ? onReviewRecentTest(test.raw) : onNavigateResults()}
                style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.45)' : '#f8fafc',
                  border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #edf2f7',
                  borderRadius: 14,
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: test.subject === 'Matematik' ? '#3b82f6' : (test.subject === 'Türkçe' ? '#f43f5e' : '#10b981'),
                    flexShrink: 0
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: textColor,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {test.title}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: subTextColor, fontWeight: 600 }}>
                      {test.subject} • {test.q} Soru
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    color: test.net >= 0 ? '#10b981' : '#f43f5e',
                    background: test.net >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                    padding: '2px 7px',
                    borderRadius: 99
                  }}>
                    {test.net} Net
                  </span>
                  <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          6. UNUTMA! GÜNÜN MOTİVASYONU & ROKET BANNERI
      ══════════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #8b5cf6 100%)',
        borderRadius: 24,
        padding: isMobile ? '1.25rem 1rem' : '1.75rem 2.2rem',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 16px 40px rgba(99, 102, 241, 0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <div style={{ zIndex: 1, maxWidth: 680, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: '1.15rem' }}>🚀</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c7d2fe' }}>
              Unutma!
            </span>
            <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.18)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
              {DASHBOARD_QUOTES[quoteIdx % DASHBOARD_QUOTES.length].category}
            </span>
          </div>

          <h3 style={{
            fontSize: isMobile ? '1.05rem' : '1.3rem',
            fontWeight: 900,
            margin: '0 0 8px 0',
            lineHeight: 1.4,
            textShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            "{DASHBOARD_QUOTES[quoteIdx % DASHBOARD_QUOTES.length].quote}"
          </h3>

          <p style={{ margin: 0, fontSize: '0.85rem', color: '#e0e7ff', fontWeight: 700 }}>
            — {DASHBOARD_QUOTES[quoteIdx % DASHBOARD_QUOTES.length].author}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 1, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onStartStudyRoom}
            style={{
              background: '#ffffff',
              color: '#4f46e5',
              border: 'none',
              borderRadius: 14,
              padding: isMobile ? '0.65rem 1rem' : '0.8rem 1.4rem',
              fontWeight: 900,
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <span>Şimdi Çalışmaya Başla</span>
            <ChevronRight size={16} />
          </button>

          <img
            src="/assets/dashboard/rocket_illust.png"
            alt="Hedefine Ulaş"
            style={{
              width: isMobile ? 85 : 120,
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.3))'
            }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      </div>

    </div>
  );
}
