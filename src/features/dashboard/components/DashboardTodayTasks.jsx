import React, { memo, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  PlayCircle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Plus,
  Eye,
  Lock,
  Clock,
  Zap,
  Target,
  Trophy,
  Flame,
  Calendar,
  CalendarDays,
  Printer,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Compass,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { getRemedialLockStatus } from '../../../services/remedialSpacedRepetitionService';

const SUBJECT_THEMES = {
  'Matematik': {
    from: '#3b82f6',
    to: '#1d4ed8',
    icon: '📐',
    badgeBg: 'rgba(59, 130, 246, 0.12)',
    badgeText: '#2563eb',
    badgeBorder: 'rgba(59, 130, 246, 0.3)',
    glow: 'rgba(59, 130, 246, 0.28)'
  },
  'Türkçe': {
    from: '#f43f5e',
    to: '#be123c',
    icon: '📖',
    badgeBg: 'rgba(244, 63, 94, 0.12)',
    badgeText: '#e11d48',
    badgeBorder: 'rgba(244, 63, 94, 0.3)',
    glow: 'rgba(244, 63, 94, 0.28)'
  },
  'Fen Bilimleri': {
    from: '#10b981',
    to: '#047857',
    icon: '🧪',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeText: '#059669',
    badgeBorder: 'rgba(16, 185, 129, 0.3)',
    glow: 'rgba(16, 185, 129, 0.28)'
  },
  'Sosyal Bilgiler': {
    from: '#f59e0b',
    to: '#b45309',
    icon: '🌍',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
    badgeText: '#d97706',
    badgeBorder: 'rgba(245, 158, 11, 0.3)',
    glow: 'rgba(245, 158, 11, 0.28)'
  },
  'İngilizce': {
    from: '#8b5cf6',
    to: '#6d28d9',
    icon: '💬',
    badgeBg: 'rgba(139, 92, 246, 0.12)',
    badgeText: '#7c3aed',
    badgeBorder: 'rgba(139, 92, 246, 0.3)',
    glow: 'rgba(139, 92, 246, 0.28)'
  },
  'Din Kültürü': {
    from: '#06b6d4',
    to: '#0e7490',
    icon: '✨',
    badgeBg: 'rgba(6, 182, 212, 0.12)',
    badgeText: '#0891b2',
    badgeBorder: 'rgba(6, 182, 212, 0.3)',
    glow: 'rgba(6, 182, 212, 0.28)'
  },
  'Kitap Okuma': {
    from: '#ec4899',
    to: '#be185d',
    icon: '📚',
    badgeBg: 'rgba(236, 72, 153, 0.12)',
    badgeText: '#db2777',
    badgeBorder: 'rgba(236, 72, 153, 0.3)',
    glow: 'rgba(236, 72, 153, 0.28)'
  },
  'Deneme': {
    from: '#f97316',
    to: '#c2410c',
    icon: '🎯',
    badgeBg: 'rgba(249, 115, 22, 0.12)',
    badgeText: '#ea580c',
    badgeBorder: 'rgba(249, 115, 22, 0.3)',
    glow: 'rgba(249, 115, 22, 0.28)'
  }
};

const DAY_PALETTE = [
  // 0: Pazartesi - Mavi
  {
    bg: 'rgba(59, 130, 246, 0.1)',
    darkBg: 'rgba(59, 130, 246, 0.18)',
    border: 'rgba(59, 130, 246, 0.3)',
    text: '#2563eb',
    darkText: '#93c5fd',
    activeBg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    glow: 'rgba(59, 130, 246, 0.4)'
  },
  // 1: Salı - Mor
  {
    bg: 'rgba(139, 92, 246, 0.1)',
    darkBg: 'rgba(139, 92, 246, 0.18)',
    border: 'rgba(139, 92, 246, 0.3)',
    text: '#7c3aed',
    darkText: '#c4b5fd',
    activeBg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    glow: 'rgba(139, 92, 246, 0.4)'
  },
  // 2: Çarşamba - Camgöbeği
  {
    bg: 'rgba(6, 182, 212, 0.1)',
    darkBg: 'rgba(6, 182, 212, 0.18)',
    border: 'rgba(6, 182, 212, 0.3)',
    text: '#0891b2',
    darkText: '#67e8f9',
    activeBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    glow: 'rgba(6, 182, 212, 0.4)'
  },
  // 3: Perşembe - Zümrüt Yeşil
  {
    bg: 'rgba(16, 185, 129, 0.1)',
    darkBg: 'rgba(16, 185, 129, 0.18)',
    border: 'rgba(16, 185, 129, 0.3)',
    text: '#059669',
    darkText: '#6ee7b7',
    activeBg: 'linear-gradient(135deg, #10b981, #047857)',
    glow: 'rgba(16, 185, 129, 0.4)'
  },
  // 4: Cuma - Turuncu / Amber
  {
    bg: 'rgba(245, 158, 11, 0.1)',
    darkBg: 'rgba(245, 158, 11, 0.18)',
    border: 'rgba(245, 158, 11, 0.3)',
    text: '#d97706',
    darkText: '#fcd34d',
    activeBg: 'linear-gradient(135deg, #f59e0b, #b45309)',
    glow: 'rgba(245, 158, 11, 0.4)'
  },
  // 5: Cumartesi - Mercan Kırmızı
  {
    bg: 'rgba(244, 63, 94, 0.1)',
    darkBg: 'rgba(244, 63, 94, 0.18)',
    border: 'rgba(244, 63, 94, 0.3)',
    text: '#e11d48',
    darkText: '#fda4af',
    activeBg: 'linear-gradient(135deg, #f43f5e, #be123c)',
    glow: 'rgba(244, 63, 94, 0.4)'
  },
  // 6: Pazar - Pembe / Fuşya
  {
    bg: 'rgba(236, 72, 153, 0.1)',
    darkBg: 'rgba(236, 72, 153, 0.18)',
    border: 'rgba(236, 72, 153, 0.3)',
    text: '#db2777',
    darkText: '#f472b6',
    activeBg: 'linear-gradient(135deg, #ec4899, #be185d)',
    glow: 'rgba(236, 72, 153, 0.4)'
  }
];

const resolveSubjectTheme = (subj) => {
  if (!subj) return { from: '#6366f1', to: '#4f46e5', icon: '📝', badgeBg: 'rgba(99, 102, 241, 0.12)', badgeText: '#6366f1', badgeBorder: 'rgba(99, 102, 241, 0.3)', glow: 'rgba(99, 102, 241, 0.25)' };
  const sStr = typeof subj === 'object' ? (subj?.name || subj?.title || subj?.subject || '') : String(subj || '');
  const s = sStr.toLowerCase();
  if (s.includes('matematik') || s.includes('geometri')) return SUBJECT_THEMES['Matematik'];
  if (s.includes('türkçe') || s.includes('edebiyat')) return SUBJECT_THEMES['Türkçe'];
  if (s.includes('fen') || s.includes('fizik') || s.includes('kimya') || s.includes('biyoloji')) return SUBJECT_THEMES['Fen Bilimleri'];
  if (s.includes('sosyal') || s.includes('tarih') || s.includes('coğrafya') || s.includes('inkılap')) return SUBJECT_THEMES['Sosyal Bilgiler'];
  if (s.includes('ingilizce') || s.includes('dil')) return SUBJECT_THEMES['İngilizce'];
  if (s.includes('din')) return SUBJECT_THEMES['Din Kültürü'];
  if (s.includes('okuma') || s.includes('kitap')) return SUBJECT_THEMES['Kitap Okuma'];
  if (s.includes('deneme')) return SUBJECT_THEMES['Deneme'];
  return { from: '#6366f1', to: '#4f46e5', icon: '📝', badgeBg: 'rgba(99, 102, 241, 0.12)', badgeText: '#6366f1', badgeBorder: 'rgba(99, 102, 241, 0.3)', glow: 'rgba(99, 102, 241, 0.25)' };
};

export default memo(function DashboardTodayTasks({
  isMobile = false,
  isDark: propIsDark = null,
  // ─── BİRLEŞTİRİLMİŞ HAFTALIK TAKVİM PROPS ───
  daysOfWeek = null,
  activeDayKey = null,
  todayDayKey = null,
  weekTasksCountMap = null,
  weekInfo = null,
  weekOffset = 0,
  onPrevWeek = null,
  onNextWeek = null,
  onCurrentWeek = null,
  onSelectDay = null,
  onPrint = null,
  showProgramButton = true,
  // ─── GÖREV PROGRAMI PROPS ───
  activeDayConfig = {},
  dayProgramInfo = { items: [], isToday: true, totalCount: 0, completedCount: 0 },
  catchUpTasks = [],
  showAllDayTasks = false,
  setShowAllDayTasks,
  onToggleTask,
  onTaskClick,
  getRowTheme,
  onAddTask,
  onNavigateRemedial,
  onNavigateBooks
}) {
  const navigate = useNavigate();
  const { isDark: themeIsDark } = useTheme();
  const isDarkEffective = propIsDark !== null ? propIsDark : themeIsDark;

  const [filterStatus, setFilterStatus] = useState('pending'); // 'pending', 'completed', 'all'
  const [selectedSubject, setSelectedSubject] = useState('all');

  const safeDayInfo = dayProgramInfo || { items: [], isToday: true, totalCount: 0, completedCount: 0 };
  const items = Array.isArray(safeDayInfo.items) ? safeDayInfo.items : [];
  const totalTasks = items.length;
  const completedTasks = useMemo(() => items.filter(t => t?.done).length, [items]);
  const remainingTasks = Math.max(0, totalTasks - completedTasks);
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Soru ve XP hesaplamaları (Kitap okuma görevleri soru çözüm DEĞİLDİR)
  const { totalQuestions, completedQuestions } = useMemo(() => {
    let tot = 0;
    let comp = 0;
    items.forEach(t => {
      if (!t) return;
      const sSubj = typeof t.subject === 'object' ? (t.subject?.name || '') : String(t.subject || '');
      const sTopic = typeof t.topic === 'object' ? (t.topic?.name || '') : String(t.topic || '');
      const sTitle = typeof t.title === 'object' ? (t.title?.name || '') : String(t.title || '');
      const sType = typeof t.taskType === 'object' ? (t.taskType?.name || '') : String(t.taskType || '');

      const isReading = sType.toLowerCase().includes('okuma') ||
        sSubj === 'Kitap Okuma' ||
        sTopic.toLowerCase().includes('kitap okuma') ||
        sTitle.toLowerCase().includes('kitap okuma') ||
        Boolean(t.readingBookId);
      if (isReading) return; // Kitap okuma görevinde soru bulunmaz!
      const q = Number(t.questionCount || t.targetQuestionCount || 0);
      const val = isNaN(q) ? 0 : q;
      tot += val;
      if (t.done) comp += val;
    });
    return { totalQuestions: tot, completedQuestions: comp };
  }, [items]);

  const { totalXp, earnedXp } = useMemo(() => {
    let tot = 0;
    let earned = 0;
    items.forEach(t => {
      if (!t) return;
      const isExam = t.isExamTask || t.taskType === 'deneme' || Boolean(t.roadmapAssignmentId);
      const xpVal = isExam ? 50 : 25;
      tot += xpVal;
      if (t.done) earned += xpVal;
    });
    return { totalXp: tot, earnedXp: earned };
  }, [items]);

  const subjects = useMemo(() => {
    const map = new Map();
    items.forEach(t => {
      if (!t) return;
      const rawSubj = typeof t.subject === 'object' ? (t.subject?.name || t.subject?.title || 'Diğer') : (t.subject || 'Diğer');
      const sLower = String(rawSubj).toLowerCase().trim();
      const cleanSubj = sLower === 'geometri' ? 'Matematik' : String(rawSubj).trim();
      map.set(cleanSubj, (map.get(cleanSubj) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [items]);

  const firstIncompleteIdx = useMemo(() => {
    return items.findIndex(t => !t?.done);
  }, [items]);

  const filteredTasks = useMemo(() => {
    return items.filter(task => {
      if (!task) return false;
      if (filterStatus === 'pending' && task.done) return false;
      if (filterStatus === 'completed' && !task.done) return false;

      if (selectedSubject !== 'all') {
        const rawSubj = typeof task.subject === 'object' ? (task.subject?.name || task.subject?.title || 'Diğer') : (task.subject || 'Diğer');
        const sLower = String(rawSubj).toLowerCase().trim();
        const cleanSubj = sLower === 'geometri' ? 'Matematik' : String(rawSubj).trim();
        if (cleanSubj !== selectedSubject) return false;
      }
      return true;
    });
  }, [items, filterStatus, selectedSubject]);

  // Luxury Card Styling Constants
  const cardBg = isDarkEffective ? 'rgba(26, 30, 54, 0.72)' : '#ffffff';
  const cardBorder = isDarkEffective ? '1.5px solid rgba(255, 255, 255, 0.08)' : '1.5px solid #edf2f7';
  const cardShadow = isDarkEffective
    ? '0 16px 36px -8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
    : '0 8px 24px -4px rgba(0, 0, 0, 0.04), 0 2px 6px rgba(0, 0, 0, 0.02)';
  const textColor = isDarkEffective ? '#ffffff' : '#0f172a';
  const subTextColor = isDarkEffective ? '#94a3b8' : '#64748b';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.85rem' : '1.25rem', width: '100%' }}>
      
      {/* ═══════════════════════════════════════════════════════════════
          💎 1. TOP 4 GLASSMORPHIC KPI STATUS CARDS (KOKPİT İSTATİSTİKLERİ)
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
        gap: isMobile ? '0.65rem' : '1rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        
        {/* KART 1: Bugünkü Görevler */}
        <div style={{
          background: cardBg,
          borderRadius: 20,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '0.85rem 0.85rem' : '1.15rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: isMobile ? 38 : 44,
              height: isMobile ? 38 : 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 6px 18px rgba(99, 102, 241, 0.35)',
              fontSize: isMobile ? '1.2rem' : '1.4rem'
            }}>
              🎯
            </div>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.72rem',
              fontWeight: 900,
              color: '#6366f1',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.28)',
              padding: '2px 8px',
              borderRadius: 99
            }}>
              {safeDayInfo.isToday ? 'Bugün' : (safeDayInfo.dayName || 'Hedef')}
            </span>
          </div>

          <div>
            <div style={{ fontSize: isMobile ? '0.7rem' : '0.78rem', fontWeight: 800, color: subTextColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Görev Durumu
            </div>
            <div style={{ fontSize: isMobile ? '1.3rem' : '1.65rem', fontWeight: 900, color: textColor, lineHeight: 1.15, fontFamily: "'Outfit', sans-serif" }}>
              {completedTasks} <span style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', color: subTextColor, fontWeight: 700 }}>/ {totalTasks}</span>
            </div>
            <div style={{ fontSize: isMobile ? '0.68rem' : '0.74rem', color: remainingTasks === 0 && totalTasks > 0 ? '#10b981' : '#6366f1', fontWeight: 800, marginTop: 2 }}>
              {totalTasks === 0 ? 'Görev planlanmadı' : remainingTasks === 0 ? '✓ Tümü Tamamlandı!' : `${remainingTasks} görev bekliyor`}
            </div>
          </div>

          <div style={{ width: '100%', height: 5, background: isDarkEffective ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              width: `${totalTasks > 0 ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              borderRadius: 99,
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* KART 2: Bugünkü Soru Yükü */}
        <div style={{
          background: cardBg,
          borderRadius: 20,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '0.85rem 0.85rem' : '1.15rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: isMobile ? 38 : 44,
              height: isMobile ? 38 : 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)',
              fontSize: isMobile ? '1.2rem' : '1.4rem'
            }}>
              📝
            </div>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.72rem',
              fontWeight: 900,
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
              padding: '2px 8px',
              borderRadius: 99
            }}>
              Soru Çözümü
            </span>
          </div>

          <div>
            <div style={{ fontSize: isMobile ? '0.7rem' : '0.78rem', fontWeight: 800, color: subTextColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Bugünkü Soru Yükü
            </div>
            <div style={{ fontSize: isMobile ? '1.3rem' : '1.65rem', fontWeight: 900, color: textColor, lineHeight: 1.15, fontFamily: "'Outfit', sans-serif" }}>
              {completedQuestions} <span style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', color: subTextColor, fontWeight: 700 }}>/ {totalQuestions > 0 ? totalQuestions : '0'}</span>
            </div>
            <div style={{ fontSize: isMobile ? '0.68rem' : '0.74rem', color: totalQuestions > 0 && completedQuestions >= totalQuestions ? '#10b981' : '#059669', fontWeight: 800, marginTop: 2 }}>
              {totalQuestions === 0 ? 'Soru görevi yok' : completedQuestions >= totalQuestions ? '✓ Tüm Sorular Çözüldü!' : `${totalQuestions - completedQuestions} Soru Kaldı`}
            </div>
          </div>

          <div style={{ width: '100%', height: 5, background: isDarkEffective ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              width: `${totalQuestions > 0 ? Math.min(100, Math.round((completedQuestions / totalQuestions) * 100)) : 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #10b981, #06b6d4)',
              borderRadius: 99,
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* KART 3: Başarı & Tamamlanma Oranı */}
        <div style={{
          background: cardBg,
          borderRadius: 20,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '0.85rem 0.85rem' : '1.15rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: isMobile ? 38 : 44,
              height: isMobile ? 38 : 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 6px 18px rgba(245, 158, 11, 0.35)',
              fontSize: isMobile ? '1.2rem' : '1.4rem'
            }}>
              🔥
            </div>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.72rem',
              fontWeight: 900,
              color: '#f59e0b',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              padding: '2px 8px',
              borderRadius: 99
            }}>
              İlerleme
            </span>
          </div>

          <div>
            <div style={{ fontSize: isMobile ? '0.7rem' : '0.78rem', fontWeight: 800, color: subTextColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tamamlanma %
            </div>
            <div style={{ fontSize: isMobile ? '1.3rem' : '1.65rem', fontWeight: 900, color: textColor, lineHeight: 1.15, fontFamily: "'Outfit', sans-serif" }}>
              %{completionPct}
            </div>
            <div style={{ fontSize: isMobile ? '0.68rem' : '0.74rem', color: completionPct === 100 ? '#10b981' : completionPct >= 50 ? '#f59e0b' : subTextColor, fontWeight: 800, marginTop: 2 }}>
              {completionPct === 100 ? 'Kusursuz Gün 🌟' : completionPct >= 75 ? 'Harika Gidiyorsun 🚀' : completionPct >= 50 ? 'Yarılandın ⚡' : 'Hadi Başlayalım!'}
            </div>
          </div>

          <div style={{ width: '100%', height: 5, background: isDarkEffective ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              width: `${completionPct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
              borderRadius: 99,
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* KART 4: Kazanılan XP & Enerji */}
        <div style={{
          background: cardBg,
          borderRadius: 20,
          border: cardBorder,
          boxShadow: cardShadow,
          padding: isMobile ? '0.85rem 0.85rem' : '1.15rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: isMobile ? 38 : 44,
              height: isMobile ? 38 : 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 6px 18px rgba(14, 165, 233, 0.35)',
              fontSize: isMobile ? '1.2rem' : '1.4rem'
            }}>
              ⚡
            </div>
            <span style={{
              fontSize: isMobile ? '0.62rem' : '0.72rem',
              fontWeight: 900,
              color: '#0ea5e9',
              background: 'rgba(14, 165, 233, 0.12)',
              border: '1px solid rgba(14, 165, 233, 0.28)',
              padding: '2px 8px',
              borderRadius: 99
            }}>
              Ödül Puanı
            </span>
          </div>

          <div>
            <div style={{ fontSize: isMobile ? '0.7rem' : '0.78rem', fontWeight: 800, color: subTextColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Kazanılan XP
            </div>
            <div style={{ fontSize: isMobile ? '1.3rem' : '1.65rem', fontWeight: 900, color: '#0ea5e9', lineHeight: 1.15, fontFamily: "'Outfit', sans-serif" }}>
              +{earnedXp} <span style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', color: subTextColor, fontWeight: 700 }}>/ {totalXp} XP</span>
            </div>
            <div style={{ fontSize: isMobile ? '0.68rem' : '0.74rem', color: '#0ea5e9', fontWeight: 800, marginTop: 2 }}>
              {earnedXp === totalXp && totalXp > 0 ? 'Tüm XP toplandı! 🏆' : `+${totalXp - earnedXp} XP daha kazanabilirsin`}
            </div>
          </div>

          <div style={{ width: '100%', height: 5, background: isDarkEffective ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              width: `${totalXp > 0 ? Math.min(100, Math.round((earnedXp / totalXp) * 100)) : 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #0ea5e9, #6366f1)',
              borderRadius: 99,
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ⚔️ 2. ULTRA-LUXURY COCKPIT HERO BANNER & WEEK TIMELINE STRIP
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        borderRadius: 22,
        overflow: 'hidden',
        border: isDarkEffective ? '1.5px solid rgba(255, 255, 255, 0.09)' : '1.5px solid #edf2f7',
        background: isDarkEffective ? 'rgba(22, 26, 46, 0.95)' : '#ffffff',
        boxShadow: isDarkEffective
          ? '0 20px 50px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
          : '0 10px 35px -5px rgba(0, 0, 0, 0.05)',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative'
      }}>
        
        {/* Neon Rainbow Top Border Beam */}
        <div style={{
          width: '100%',
          height: 3.5,
          background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 35%, #ec4899 70%, #10b981 100%)'
        }} />

        {/* ── Cockpit Header: Title & Action Controls ── */}
        <div style={{
          padding: isMobile ? '0.85rem 1rem' : '1.1rem 1.6rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: isDarkEffective ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #f1f5f9'
        }}>
          {/* Sol: 3D Badge + Gün Başlığı + Kalan Görev Rozeti */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 900,
              padding: '3px 9px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              color: '#a855f7',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              ⚔️ GÜNLÜK HEDEF & GÖREV KOKPİTİ
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: isMobile ? '1.25rem' : '1.45rem', lineHeight: 1 }}>
                {safeDayInfo.isToday ? '🎯' : (activeDayConfig?.icon || '📅')}
              </span>
              <span style={{
                fontSize: isMobile ? '1.05rem' : '1.25rem',
                fontWeight: 900,
                color: textColor,
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '-0.02em'
              }}>
                {safeDayInfo.isToday ? 'Bugün Ne Yapacaksın?' : (`${safeDayInfo.dayName || 'Ders'} Programı`)}
              </span>
            </div>

            {safeDayInfo.fullDateLabel && (
              <span style={{
                fontSize: isMobile ? '0.72rem' : '0.78rem',
                color: subTextColor,
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: 8,
                background: isDarkEffective ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                border: isDarkEffective ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0'
              }}>
                {safeDayInfo.fullDateLabel}
              </span>
            )}

            {safeDayInfo.hasAllCompleted && totalTasks > 0 ? (
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 900,
                padding: '3px 10px',
                borderRadius: 99,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                <Check size={12} strokeWidth={3} /> Tüm Görevler Bitti
              </span>
            ) : remainingTasks > 0 ? (
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 900,
                padding: '3px 10px',
                borderRadius: 99,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.28)'
              }}>
                {remainingTasks} Görev Kaldı
              </span>
            ) : null}
          </div>

          {/* Sağ: Ultra-Şık Aksiyon Butonları */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {(weekOffset !== 0 || (activeDayKey && todayDayKey && activeDayKey !== todayDayKey)) && (onCurrentWeek || onSelectDay) && (
              <button
                type="button"
                onClick={() => {
                  if (onCurrentWeek) onCurrentWeek();
                  else if (onSelectDay && todayDayKey) onSelectDay(todayDayKey);
                }}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 11,
                  padding: isMobile ? '0.42rem 0.75rem' : '0.45rem 0.95rem',
                  fontSize: isMobile ? '0.74rem' : '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 3px 10px rgba(245, 158, 11, 0.35)',
                  transition: 'all 0.16s ease'
                }}
              >
                <Zap size={14} fill="#ffffff" />
                <span>Bugüne Dön</span>
              </button>
            )}

            {onAddTask && (
              <button
                type="button"
                onClick={onAddTask}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1 60%, #8b5cf6)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: 11,
                  padding: isMobile ? '0.45rem 0.85rem' : '0.48rem 1.1rem',
                  fontSize: isMobile ? '0.78rem' : '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                  transition: 'all 0.18s ease'
                }}
              >
                <Plus size={15} strokeWidth={3} />
                <span>Yeni Görev Ekle</span>
              </button>
            )}

            {showProgramButton && (
              <button
                type="button"
                onClick={() => navigate('/my-program')}
                style={{
                  background: isDarkEffective ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc',
                  border: isDarkEffective ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                  color: textColor,
                  borderRadius: 11,
                  padding: isMobile ? '0.45rem 0.7rem' : '0.48rem 0.85rem',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
                title="Haftalık Program Sayfası"
              >
                <CalendarDays size={14} />
                <span style={{ display: isMobile ? 'none' : 'inline' }}>Haftalık Program</span>
              </button>
            )}

            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                style={{
                  background: isDarkEffective ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc',
                  border: isDarkEffective ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                  color: textColor,
                  borderRadius: 11,
                  padding: isMobile ? '0.45rem 0.65rem' : '0.48rem 0.75rem',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
                title="Haftalık Programı Yazdır"
              >
                <Printer size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── 7-Day Futuristic Timeline & Calendar Strip ── */}
        {Array.isArray(daysOfWeek) && daysOfWeek.length > 0 && onSelectDay && (
          <div style={{
            padding: isMobile ? '0.55rem 0.65rem' : '0.75rem 1.4rem',
            background: isDarkEffective ? 'rgba(0, 0, 0, 0.2)' : 'rgba(248, 250, 252, 0.95)',
            borderBottom: isDarkEffective ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #edf2f7'
          }}>
            {/* Hafta Gezinme Çubuğu */}
            {(onPrevWeek || onNextWeek || weekInfo?.weekRangeLabel) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: isMobile ? '0.45rem' : '0.65rem',
                padding: '0 2px'
              }}>
                <button
                  type="button"
                  onClick={onPrevWeek}
                  style={{
                    background: isDarkEffective ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
                    border: isDarkEffective ? '1px solid rgba(255, 255, 255, 0.12)' : '1.5px solid #cbd5e1',
                    borderRadius: 10,
                    padding: isMobile ? '0.28rem 0.55rem' : '0.35rem 0.85rem',
                    fontSize: isMobile ? '0.7rem' : '0.76rem',
                    fontWeight: 800,
                    color: textColor,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                  }}
                  title="Önceki Hafta"
                >
                  <ChevronLeft size={isMobile ? 13 : 15} />
                  <span>{isMobile ? 'Önceki' : 'Önceki Hafta'}</span>
                </button>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span style={{
                    fontSize: isMobile ? '0.76rem' : '0.84rem',
                    fontWeight: 900,
                    color: weekOffset === 0 ? textColor : '#6366f1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <Calendar size={isMobile ? 13 : 14} color="#6366f1" />
                    <span>{weekInfo?.weekRangeLabel || 'Haftalık Takvim'}</span>
                  </span>

                  {weekOffset !== 0 && (onCurrentWeek || onSelectDay) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onCurrentWeek) onCurrentWeek();
                        else if (onSelectDay && todayDayKey) onSelectDay(todayDayKey);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '2px 8px',
                        fontSize: '0.64rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)'
                      }}
                      title="Bu Haftaya Dön"
                    >
                      <RotateCcw size={10} />
                      <span>Bu Hafta</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onNextWeek}
                  style={{
                    background: isDarkEffective ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
                    border: isDarkEffective ? '1px solid rgba(255, 255, 255, 0.12)' : '1.5px solid #cbd5e1',
                    borderRadius: 10,
                    padding: isMobile ? '0.28rem 0.55rem' : '0.35rem 0.85rem',
                    fontSize: isMobile ? '0.7rem' : '0.76rem',
                    fontWeight: 800,
                    color: textColor,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                  }}
                  title="Sonraki Hafta"
                >
                  <span>{isMobile ? 'Sonraki' : 'Sonraki Hafta'}</span>
                  <ChevronRight size={isMobile ? 13 : 15} />
                </button>
              </div>
            )}

            {/* 7 Günün Şık Kartları */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: isMobile ? 5 : 8,
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {daysOfWeek.map((day, dayIdx) => {
                const dayCol = DAY_PALETTE[dayIdx % DAY_PALETTE.length];
                const isSelected = activeDayKey === day.key;
                const isCurrentToday = (weekOffset === 0) && (todayDayKey === day.key);
                const taskCount = (weekTasksCountMap && weekTasksCountMap[day.key]) || 0;
                const dayDate = weekInfo?.dayDateMap?.[day.key];
                const dateNumber = dayDate?.dateLabel ? dayDate.dateLabel.split(' ')[0] : '';
                const shortDayName = day.short || day.name.slice(0, 3);

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => onSelectDay(day.key)}
                    title={`${day.name} (${dateNumber || ''})`}
                    style={{
                      height: isMobile ? 42 : 50,
                      borderRadius: 13,
                      border: isSelected
                        ? (isDarkEffective ? '2px solid #ffffff' : '2px solid #6366f1')
                        : isCurrentToday
                        ? '2px solid #f59e0b'
                        : `1.5px solid ${dayCol.border}`,
                      background: isSelected
                        ? dayCol.activeBg
                        : (isDarkEffective ? dayCol.darkBg : dayCol.bg),
                      color: isSelected
                        ? '#ffffff'
                        : (isDarkEffective ? dayCol.darkText : dayCol.text),
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: isMobile ? 'row' : 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isSelected
                        ? `0 5px 16px ${dayCol.glow}`
                        : (isCurrentToday ? '0 0 0 1px #f59e0b' : 'none'),
                      transition: 'all 0.18s ease',
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: isMobile ? '0 2px' : '0 8px',
                      transform: isSelected && !isMobile ? 'translateY(-2px)' : 'none'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobile ? 3 : 6,
                      lineHeight: 1
                    }}>
                      {/* Tarih Numarası ve Simge */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: isMobile ? 2 : 4,
                        fontSize: isMobile ? '0.9rem' : '1.05rem',
                        fontWeight: 900,
                        fontFamily: "'Outfit', sans-serif"
                      }}>
                        <Calendar size={isMobile ? 11 : 13} style={{ opacity: isSelected ? 1 : 0.7, flexShrink: 0 }} />
                        {dateNumber || '-'}
                      </span>

                      {/* Kısa Dik Çizgi (Sadece Masaüstü) */}
                      {!isMobile && (
                        <span style={{
                          width: '1.5px',
                          height: '14px',
                          background: 'currentColor',
                          opacity: isSelected ? 0.6 : 0.4,
                          borderRadius: 99
                        }} />
                      )}

                      {/* Gün İsmi (Sadece Masaüstü) */}
                      {!isMobile && (
                        <span style={{
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          letterSpacing: '0.01em',
                          opacity: isSelected ? 1 : 0.95
                        }}>
                          {shortDayName}
                        </span>
                      )}

                      {/* Masaüstünde Küçük Görev Sayısı */}
                      {!isMobile && (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '1.5px 6px',
                          borderRadius: 99,
                          background: isSelected
                            ? 'rgba(255, 255, 255, 0.28)'
                            : (isDarkEffective ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)'),
                          color: isSelected
                            ? '#ffffff'
                            : 'currentColor',
                          marginLeft: 2,
                          whiteSpace: 'nowrap'
                        }}>
                          {taskCount > 0 ? `${taskCount}` : '-'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Filtre Çipleri (Bekleyen / Tamamlanan / Branşlar) ── */}
        <div style={{
          padding: isMobile ? '0.6rem 0.85rem' : '0.85rem 1.6rem',
          background: isDarkEffective ? 'rgba(15, 18, 33, 0.75)' : '#ffffff',
          borderBottom: isDarkEffective ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #edf2f7',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 8,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          {/* Bekleyen Görevler Butonu */}
          <button
            type="button"
            onClick={() => setFilterStatus(prev => prev === 'pending' ? 'all' : 'pending')}
            style={{
              background: filterStatus === 'pending'
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : (isDarkEffective ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
              color: filterStatus === 'pending' ? '#ffffff' : subTextColor,
              border: filterStatus === 'pending' ? '1.5px solid #dc2626' : '1.5px solid transparent',
              boxShadow: filterStatus === 'pending' ? '0 4px 12px rgba(239, 68, 68, 0.35)' : 'none',
              fontWeight: 900,
              fontSize: isMobile ? '0.74rem' : '0.8rem',
              padding: isMobile ? '0.38rem 0.75rem' : '0.45rem 1rem',
              borderRadius: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s ease'
            }}
          >
            <span>⏳ Bekleyen ({remainingTasks})</span>
          </button>

          {/* Tamamlanan Görevler Butonu */}
          <button
            type="button"
            onClick={() => setFilterStatus(prev => prev === 'completed' ? 'all' : 'completed')}
            style={{
              background: filterStatus === 'completed'
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : (isDarkEffective ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
              color: filterStatus === 'completed' ? '#ffffff' : subTextColor,
              border: filterStatus === 'completed' ? '1.5px solid #059669' : '1.5px solid transparent',
              boxShadow: filterStatus === 'completed' ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none',
              fontWeight: 900,
              fontSize: isMobile ? '0.74rem' : '0.8rem',
              padding: isMobile ? '0.38rem 0.75rem' : '0.45rem 1rem',
              borderRadius: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s ease'
            }}
          >
            <span>✓ Tamamlanan ({completedTasks})</span>
          </button>

          {/* Tümü Filtresi */}
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            style={{
              background: filterStatus === 'all'
                ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                : (isDarkEffective ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
              color: filterStatus === 'all' ? '#ffffff' : subTextColor,
              border: filterStatus === 'all' ? '1.5px solid #4f46e5' : '1.5px solid transparent',
              boxShadow: filterStatus === 'all' ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none',
              fontWeight: 900,
              fontSize: isMobile ? '0.74rem' : '0.8rem',
              padding: isMobile ? '0.38rem 0.75rem' : '0.45rem 1rem',
              borderRadius: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s ease'
            }}
          >
            <span>Tümü ({totalTasks})</span>
          </button>

          {/* Ders Filtreleri */}
          {subjects.length > 1 && (
            <>
              <div style={{ width: 1.5, height: 22, background: isDarkEffective ? 'rgba(255,255,255,0.1)' : '#e2e8f0', margin: '0 4px', flexShrink: 0 }} />
              {subjects.map(([subj, count]) => {
                const sTheme = resolveSubjectTheme(subj);
                const isSelected = selectedSubject === subj;
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSelectedSubject(prev => prev === subj ? 'all' : subj)}
                    style={{
                      background: isSelected ? sTheme.badgeBg : (isDarkEffective ? 'rgba(255,255,255,0.04)' : '#f8fafc'),
                      color: isSelected ? sTheme.badgeText : subTextColor,
                      border: isSelected ? `1.5px solid ${sTheme.from}` : (isDarkEffective ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'),
                      fontSize: isMobile ? '0.72rem' : '0.78rem',
                      fontWeight: 800,
                      padding: isMobile ? '0.34rem 0.7rem' : '0.42rem 0.85rem',
                      borderRadius: 12,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: isSelected ? `0 3px 10px ${sTheme.glow}` : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{sTheme.icon} {subj} ({count})</span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* ── 3. ULTRA-LUXURY QUEST CARDS (2-COLUMN GRID) ── */}
        {filteredTasks.length > 0 ? (
          <div style={{
            padding: isMobile ? '0.65rem 0.65rem' : '1.1rem 1.4rem',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: isMobile ? '0.65rem' : '0.95rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {(showAllDayTasks || !isMobile ? filteredTasks : filteredTasks.slice(0, 6)).map((task, idx) => {
              if (!task) return null;
              const sSubj = typeof task.subject === 'object' ? (task.subject?.name || '') : String(task.subject || '');
              const sTopic = typeof task.topic === 'object' ? (task.topic?.name || '') : String(task.topic || '');
              const sTitle = typeof task.title === 'object' ? (task.title?.name || '') : String(task.title || '');
              const sTestName = typeof task.testName === 'object' ? (task.testName?.name || '') : String(task.testName || '');
              const sType = typeof task.taskType === 'object' ? (task.taskType?.name || '') : String(task.taskType || '');
              const sUnit = typeof task.unitTopic === 'object' ? (task.unitTopic?.name || '') : String(task.unitTopic || '');
              const sBook = typeof task.bookTitle === 'object' ? (task.bookTitle?.title || task.bookTitle?.name || '') : String(task.bookTitle || '');

              const isReadingTask = sType.toLowerCase().includes('okuma') ||
                sSubj === 'Kitap Okuma' ||
                sTopic.toLowerCase().includes('kitap okuma') ||
                sTitle.toLowerCase().includes('kitap okuma') ||
                Boolean(task.readingBookId);
              const isQuizTask = !isReadingTask && Boolean(task.isAutoHomework || task.testId || task.hwId || task.roadmapAssignmentId);
              const cleanSubj = sSubj.toLowerCase() === 'geometri' ? 'Matematik' : (sSubj || 'Ders');
              const sTheme = resolveSubjectTheme(cleanSubj);
              const isExamItem = task.isExamTask || task.taskType === 'deneme';

              const isTestTask = !isReadingTask && (
                Boolean(task.testResult) ||
                isQuizTask ||
                Boolean(task.testId || task.bookTestId || task.realTestId) ||
                Boolean(task.isExamTask || task.taskType === 'deneme' || task.taskType === 'test' || task.taskType === 'remedialTest') ||
                Boolean(task.questionCount) ||
                /test|deneme|sınav|soru/i.test(sTitle || sTopic || sTestName)
              );

              const testResult = task.testResult ? {
                ...task.testResult
              } : (task.submission ? (() => {
                const sub = task.submission;
                const c = Number(sub.correctCount ?? sub.correct_count ?? sub.correct ?? 0);
                const w = Number(sub.wrongCount ?? sub.wrong_count ?? sub.wrong ?? 0);
                const e = Number(sub.emptyCount ?? sub.empty_count ?? sub.blankCount ?? sub.blank_count ?? 0);
                const explicitQ = Number(sub.totalQuestions ?? sub.questionCount ?? task.questionCount ?? 0);
                const q = (c + w + e > 0) ? (c + w + e) : explicitQ;

                let scoreVal = 0;
                const explicitPct = sub.scorePercentage ?? sub.scorePct ?? sub.accuracy ?? sub.successRate;
                if (explicitPct !== undefined && explicitPct !== null && !isNaN(Number(explicitPct))) {
                  scoreVal = Math.min(100, Math.max(0, Math.round(Number(explicitPct))));
                } else if (q > 0) {
                  scoreVal = Math.min(100, Math.max(0, Math.round((c / q) * 100)));
                } else if (c > 0 && w === 0) {
                  scoreVal = 100;
                } else if (c + w > 0) {
                  scoreVal = Math.min(100, Math.max(0, Math.round((c / (c + w)) * 100)));
                } else if (sub.score !== undefined && sub.score !== null && !isNaN(Number(sub.score))) {
                  scoreVal = Math.min(100, Math.max(0, Math.round(Number(sub.score))));
                }

                return {
                  score: scoreVal,
                  correctCount: c,
                  wrongCount: w,
                  emptyCount: e,
                  totalQuestions: q,
                  net: sub.net !== undefined ? Number(sub.net) : Math.max(0, Math.round((c - (w / 3)) * 100) / 100),
                  isPendingApproval: Boolean(sub.isPendingApproval || sub.approvalStatus === 'pending'),
                  isPendingEval: Boolean(sub.isPendingEval || sub.isPendingEvaluation)
                };
              })() : (task.score !== undefined ? {
                score: Math.round(Number(task.score)),
                correctCount: Number(task.correctCount || task.correctAnswers || 0),
                wrongCount: Number(task.wrongCount || 0),
                emptyCount: Number(task.emptyCount || 0),
                totalQuestions: Number(task.totalQuestions || task.questionCount || 0),
                net: Number(task.net || 0),
                isPendingApproval: false,
                isPendingEval: false
              } : null));

              // Compute accurate success percentage
              const successScore = (() => {
                if (!testResult) return null;
                const c = Number(testResult.correctCount || 0);
                const w = Number(testResult.wrongCount || 0);
                const e = Number(testResult.emptyCount || 0);
                const q = Number(testResult.totalQuestions || (c + w + e > 0 ? c + w + e : 0));
                const explicitPct = testResult.scorePercentage ?? testResult.scorePct;
                if (explicitPct !== undefined && explicitPct !== null && !isNaN(Number(explicitPct))) {
                  return Math.min(100, Math.max(0, Math.round(Number(explicitPct))));
                }
                if (testResult.score !== undefined && testResult.score !== null && !isNaN(Number(testResult.score))) {
                  const rawSc = Number(testResult.score);
                  if (q > 0) {
                    const calculatedPct = Math.round((c / q) * 100);
                    if (rawSc < calculatedPct && (rawSc === c || rawSc === Number(testResult.net))) {
                      return calculatedPct;
                    }
                  }
                  return Math.min(100, Math.max(0, Math.round(rawSc)));
                }
                if (q > 0) return Math.min(100, Math.max(0, Math.round((c / q) * 100)));
                if (c > 0 && w === 0) return 100;
                return 0;
              })();

              if (testResult && successScore !== null) {
                testResult.score = successScore;
              }

              const statusTag = successScore !== null ? (
                successScore >= 80 ? { icon: '🏆', label: 'Güçlü', color: '#10b981', bg: isDarkEffective ? 'rgba(16,185,129,0.18)' : '#dcfce7', border: 'rgba(16,185,129,0.35)', text: '#15803d' }
                : successScore >= 60 ? { icon: '📈', label: 'Gelişiyor', color: '#f59e0b', bg: isDarkEffective ? 'rgba(245,158,11,0.18)' : '#fef3c7', border: 'rgba(245,158,11,0.35)', text: '#b45309' }
                : { icon: '⚠️', label: 'Tekrar Etmeli', color: '#ef4444', bg: isDarkEffective ? 'rgba(239,68,68,0.18)' : '#fee2e2', border: 'rgba(239,68,68,0.35)', text: '#b91c1c' }
              ) : null;

              const rawBook = sBook.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();
              let displayTitle = String(sTestName || sTitle || sTopic || 'Ders Çalışması')
                .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
                .replace(/\s*\(Tüm Kitap\)/gi, '')
                .replace(/\s*\(Kendi Eklediğim\)/gi, '')
                .replace(/\s*\(Görev\)/gi, '')
                .replace(/^👨‍🏫\s*/, '')
                .replace(/^\[\d+\.\s*Tekrar[^\]]*\]\s*/i, '')
                .trim();

              if (rawBook && displayTitle.toLowerCase().includes(rawBook.toLowerCase())) {
                const stripped = displayTitle.replace(new RegExp(rawBook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/^[\s\—\-\:\/]+/, '').trim();
                if (stripped && !/^(test|testi)$/i.test(stripped)) {
                  displayTitle = stripped;
                }
              }

              if (!displayTitle || /^(ödev|görev|test|testi|sınav|kitap testi|ders çalışması)$/i.test(displayTitle.trim()) || (rawBook && displayTitle.toLowerCase() === rawBook.toLowerCase())) {
                if (sTestName && !/^(ödev|görev|test|testi|sınav|kitap testi)$/i.test(sTestName.trim()) && sTestName.toLowerCase() !== rawBook.toLowerCase()) {
                  displayTitle = sTestName.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim();
                } else if (sTopic && !/^(ödev|görev|test|testi|sınav|kitap testi)$/i.test(sTopic.trim())) {
                  displayTitle = `${sTopic} Testi`;
                } else if (sUnit) {
                  displayTitle = `${sUnit} Testi`;
                } else if (task.isBookTask) {
                  displayTitle = isReadingTask ? (sTitle || 'Kitap Okuma') : (sTestName || sTitle || (rawBook ? `${rawBook} Testi` : 'Kitap Testi'));
                } else if (cleanSubj) {
                  displayTitle = isReadingTask ? (sTitle || 'Kitap Okuma') : `${cleanSubj} Testi`;
                } else {
                  displayTitle = isReadingTask ? 'Kitap Okuma' : 'Konu Testi';
                }
              }

              let pageBadge = null;
              const pageMatch = displayTitle.match(/^(\d+(?:[-–]\d+)?\.\s*(?:Sayfa|s\.)|\s*s\.\s*\d+(?:[-–]\d+)?)\s*/i);
              if (pageMatch) {
                pageBadge = pageMatch[0].trim();
                displayTitle = displayTitle.substring(pageMatch[0].length).trim();
              }

              // Remedial Stage
              const stageMatch = String(task.text || sTitle || sTopic || '').match(/\[(\d+)\.\s*Tekrar(?:\s*[-–(]\s*(\d+)g\s*[)]?)?/i);
              const detectedStage = task.stage || (stageMatch ? parseInt(stageMatch[1], 10) : null);
              const detectedInterval = task.intervalDays || (stageMatch && stageMatch[2] ? parseInt(stageMatch[2], 10) : null);
              const isRemedialTask = Boolean(task.isRemedial || task.isRemedialTest || task.type === 'remedialTest' || task.taskType === 'remedialTest' || task.isTeacherRemedial || task.isSpacedRepetition || detectedStage);
              const syncAttemptNumber = task.attemptNumber || (detectedStage ? detectedStage : (task.pastAttemptCount != null ? task.pastAttemptCount + 1 : 1));

              const isNextTarget = safeDayInfo.isToday && !task.done && (idx === firstIncompleteIdx);

              return (
                <div
                  key={`${task.id || 'task'}_${idx}`}
                  onClick={() => {
                    if (isReadingTask) {
                      onToggleTask && onToggleTask(task);
                    } else {
                      onTaskClick && onTaskClick(task);
                    }
                  }}
                  className={`game-quest-row ${isNextTarget ? 'quest-next-target' : ''}`}
                  style={{
                    background: task.done 
                      ? (isDarkEffective ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)') 
                      : (isNextTarget 
                          ? (isDarkEffective ? 'linear-gradient(145deg, rgba(99, 102, 241, 0.18), rgba(26, 30, 54, 0.9))' : 'linear-gradient(145deg, rgba(99, 102, 241, 0.08), #ffffff)') 
                          : (isDarkEffective ? 'rgba(255, 255, 255, 0.035)' : '#ffffff')),
                    border: `1.5px solid ${task.done ? 'rgba(16,185,129,0.38)' : isNextTarget ? '#818cf8' : (isDarkEffective ? 'rgba(255, 255, 255, 0.09)' : '#e2e8f0')}`,
                    borderLeft: `5px solid ${task.done ? '#10b981' : isNextTarget ? '#6366f1' : sTheme.from}`,
                    borderRadius: isMobile ? 14 : 16,
                    padding: isMobile ? '0.7rem 0.75rem' : '0.85rem 1.15rem',
                    cursor: 'pointer',
                    boxShadow: isNextTarget 
                      ? '0 0 0 2px rgba(99, 102, 241, 0.3), 0 8px 24px rgba(99, 102, 241, 0.16)' 
                      : (task.done ? '0 2px 8px rgba(16,185,129,0.06)' : '0 4px 14px rgba(0,0,0,0.03)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: isMobile ? 9 : 14,
                    transition: 'all 0.18s ease',
                    boxSizing: 'border-box',
                    position: 'relative'
                  }}
                >
                  {/* Sol: 3D Neon Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                    style={{
                      width: isMobile ? 32 : 36,
                      height: isMobile ? 32 : 36,
                      minWidth: isMobile ? 32 : 36,
                      borderRadius: 11,
                      border: task.done 
                        ? '2px solid #10b981' 
                        : isDarkEffective ? '2px solid rgba(255, 255, 255, 0.25)' : '2px solid #cbd5e1',
                      background: task.done
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : (isDarkEffective ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'),
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      cursor: 'pointer',
                      padding: 0,
                      boxShadow: task.done ? '0 4px 12px rgba(16, 185, 129, 0.4)' : 'none',
                      transition: 'all 0.16s ease'
                    }}
                    title={task.done ? 'Tamamlandı (Geri almak için tıkla)' : 'Tamamlandı olarak işaretle'}
                  >
                    {task.done ? (
                      <Check size={isMobile ? 18 : 20} color="#ffffff" strokeWidth={3.5} />
                    ) : null}
                  </button>

                  {/* Orta: Ders, Başlık ve Rozetler */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Satır 1: Ders Rozeti + Başlık + Rozetler */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: isMobile ? '0.64rem' : '0.7rem',
                        fontWeight: 900,
                        color: sTheme.badgeText,
                        background: sTheme.badgeBg,
                        border: `1px solid ${sTheme.badgeBorder}`,
                        padding: '2px 7px',
                        borderRadius: 7,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: isMobile ? '0.78rem' : '0.86rem', lineHeight: 1 }}>{sTheme.icon}</span>
                        <span>{cleanSubj}</span>
                      </span>

                      <span style={{
                        fontSize: isMobile ? '0.88rem' : '0.98rem',
                        fontWeight: 800,
                        color: task.done ? subTextColor : textColor,
                        textDecoration: task.done ? 'line-through' : 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.3
                      }}>
                        {displayTitle}
                      </span>

                      {isNextTarget && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          color: '#ffffff',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          padding: '2px 7px',
                          borderRadius: 99,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(99, 102, 241, 0.35)'
                        }}>
                          <Zap size={10} fill="#ffffff" /> Sıradaki
                        </span>
                      )}

                      {task.done && isTestTask && statusTag && (
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          color: statusTag.color,
                          background: statusTag.bg,
                          border: `1px solid ${statusTag.border}`,
                          padding: '2px 6px',
                          borderRadius: 7,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          flexShrink: 0
                        }}>
                          <span>{statusTag.icon}</span>
                          <span>%{successScore} • {statusTag.label}</span>
                        </span>
                      )}
                    </div>

                    {/* Satır 2: Kitap, Soru Sayısı, Sayfa ve Süre */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexWrap: 'wrap',
                      fontSize: isMobile ? '0.68rem' : '0.74rem',
                      color: subTextColor,
                      fontWeight: 650
                    }}>
                      {sBook && !/^kitap$/i.test(sBook.trim()) && !/^takip kitabı$/i.test(sBook.trim()) && (
                        <span style={{
                          color: (task.roadmapAssignmentId || task.isRoadmapTask) ? '#a855f7' : subTextColor,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: isMobile ? 150 : 220,
                          fontWeight: 700
                        }}>
                          {(task.roadmapAssignmentId || task.isRoadmapTask) ? `🗺️ ${sBook}` : `📖 ${sBook}`}
                        </span>
                      )}
                      {task.questionCount && !isReadingTask && (
                        <span style={{ color: '#10b981', fontWeight: 800 }}>• 📝 {task.questionCount} Soru</span>
                      )}
                      {isReadingTask && (
                        <span style={{ color: '#ec4899', fontWeight: 800 }}>• 📚 Kitap Okuma</span>
                      )}
                      {pageBadge && (
                        <span>• 📄 {pageBadge}</span>
                      )}
                      {isRemedialTask && (
                        <span style={{ color: '#a855f7', fontWeight: 800 }}>• 🔄 {syncAttemptNumber}. Tekrar</span>
                      )}
                      {sUnit && !sBook && (
                        <span>• 📌 {sUnit}</span>
                      )}
                      {(task.time || task.dueDateStr) && (
                        <span>• ⏱️ {String(task.time || task.dueDateStr)}</span>
                      )}
                    </div>
                  </div>

                  {/* Sağ: Ultra-Tactile 3D Aksiyon Butonu */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {task.done ? (
                      isReadingTask || !isQuizTask ? (
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 900,
                          color: '#10b981',
                          background: isDarkEffective ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          padding: isMobile ? '0.34rem 0.65rem' : '0.4rem 0.8rem',
                          borderRadius: 9
                        }}>
                          ✓ Bitti
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                          style={{
                            fontSize: isMobile ? '0.72rem' : '0.78rem',
                            fontWeight: 800,
                            color: '#10b981',
                            background: isDarkEffective ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            padding: isMobile ? '0.35rem 0.65rem' : '0.42rem 0.85rem',
                            borderRadius: 9,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Eye size={13} />
                          <span style={{ display: isMobile ? 'none' : 'inline' }}>İncele</span>
                        </button>
                      )
                    ) : isRemedialTask && getRemedialLockStatus(task).isLocked ? (
                      (() => {
                        const lockStatus = getRemedialLockStatus(task);
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(lockStatus.lockMessage);
                            }}
                            style={{
                              background: isDarkEffective ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                              color: isDarkEffective ? '#94a3b8' : '#64748b',
                              border: isDarkEffective ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid #e2e8f0',
                              borderRadius: 9,
                              padding: '0.38rem 0.75rem',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title={lockStatus.lockMessage}
                          >
                            <Lock size={12} color="#f59e0b" />
                            <span>{lockStatus.daysLeft === 1 ? 'Yarın' : lockStatus.formattedDate}</span>
                          </button>
                        );
                      })()
                    ) : isQuizTask ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                        style={{
                          background: `linear-gradient(135deg, ${sTheme.from}, ${sTheme.to})`,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 9,
                          padding: isMobile ? '0.38rem 0.75rem' : '0.45rem 1rem',
                          fontSize: isMobile ? '0.76rem' : '0.82rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          boxShadow: `0 3px 12px ${sTheme.glow}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        {isRemedialTask && syncAttemptNumber > 1 ? (
                          <>
                            <RotateCcw size={13} />
                            <span>Tekrar</span>
                          </>
                        ) : (
                          <>
                            <span>Çöz & Başla</span>
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 9,
                          padding: isMobile ? '0.38rem 0.75rem' : '0.45rem 1rem',
                          fontSize: isMobile ? '0.76rem' : '0.82rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          boxShadow: '0 3px 12px rgba(16, 185, 129, 0.35)'
                        }}
                      >
                        {isReadingTask ? (
                          <>
                            <BookOpen size={13} />
                            <span>Okudum</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} strokeWidth={3} />
                            <span>Tamamla</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : totalTasks > 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: subTextColor }}>
            {filterStatus === 'pending' && remainingTasks === 0 ? (
              <div>
                <div style={{ fontSize: '3rem', marginBottom: 10 }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#10b981', marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>
                  Harika! Bekleyen hiçbir görev kalmadı!
                </div>
                <div style={{ fontSize: '0.88rem', color: subTextColor, marginBottom: 16 }}>
                  Günün tüm hedeflerini tamamladın, tebrik ederiz!
                </div>
                <button
                  type="button"
                  onClick={() => setFilterStatus('completed')}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: 14,
                    fontSize: '0.86rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Tamamlanan Görevleri Gör ({completedTasks})</span>
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: textColor }}>Seçilen filtreye uygun görev bulunamadı.</div>
                <button
                  type="button"
                  onClick={() => { setFilterStatus('all'); setSelectedSubject('all'); }}
                  style={{
                    marginTop: 12,
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                    textDecoration: 'underline'
                  }}
                >
                  Tüm Görevleri Göster
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Hiç görev yok */
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚀</div>
            <div style={{ fontWeight: 900, color: '#6366f1', fontSize: '1.25rem', marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>
              {dayProgramInfo.isToday
                ? 'Bugün için planlanan görev bulunmuyor!'
                : `${dayProgramInfo.dayName || 'Seçili gün'} için henüz görev planlanmamış.`}
            </div>
            <p style={{ fontSize: '0.88rem', color: subTextColor, maxWidth: 480, margin: '0 auto 1.6rem', lineHeight: 1.5 }}>
              Harika bir çalışma günü tasarlayabilirsin! Kütüphaneden testler seçebilir veya programına yeni ders hedefleri ekleyebilirsin.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {onAddTask && (
                <button
                  type="button"
                  onClick={onAddTask}
                  style={{
                    borderRadius: 14,
                    padding: '0.75rem 1.45rem',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Plus size={16} strokeWidth={3} /> Yeni Görev Ekle
                </button>
              )}
              {onNavigateBooks && (
                <button
                  type="button"
                  onClick={onNavigateBooks}
                  style={{
                    borderRadius: 14,
                    padding: '0.75rem 1.45rem',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    background: isDarkEffective ? 'rgba(2, 132, 199, 0.18)' : '#f0f9ff',
                    border: '1.5px solid #0284c7',
                    color: '#0284c7',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <BookOpen size={16} /> Kütüphaneyi Keşfet
                </button>
              )}
            </div>
          </div>
        )}

        {/* Daha Fazla Göster Butonu (Mobilde 6'dan fazla görev varsa) */}
        {isMobile && filteredTasks.length > 6 && (
          <div style={{ padding: '0.75rem 0.95rem', background: isDarkEffective ? 'rgba(0,0,0,0.2)' : '#f8fafc', borderTop: isDarkEffective ? '1px solid rgba(255,255,255,0.08)' : '1px solid #edf2f7' }}>
            <button
              type="button"
              onClick={() => setShowAllDayTasks && setShowAllDayTasks(prev => !prev)}
              style={{
                width: '100%',
                background: isDarkEffective ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.08)',
                border: '1.5px solid rgba(99, 102, 241, 0.28)',
                borderRadius: '0.85rem',
                padding: '0.7rem 1rem',
                color: isDarkEffective ? '#a5b4fc' : '#4f46e5',
                fontWeight: 900,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s ease'
              }}
            >
              {showAllDayTasks ? (
                <>
                  <ChevronUp size={16} />
                  <span>Daha Az Göster (İlk 6 Görev)</span>
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  <span>Diğer {filteredTasks.length - 6} Görevi Göster</span>
                  <span style={{ fontSize: '0.72rem', background: '#6366f1', color: 'white', padding: '1px 8px', borderRadius: 99, fontWeight: 900 }}>
                    +{filteredTasks.length - 6}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Günün Tüm Görevleri Bittiğinde Kutlama Kartı ── */}
        {dayProgramInfo.hasAllCompleted && totalTasks > 0 && (
          <div style={{
            margin: '0.85rem 1rem 1.15rem',
            padding: '1.35rem 1.55rem',
            borderRadius: 20,
            background: isDarkEffective ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(6, 182, 212, 0.1))' : 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1.5px solid rgba(16, 185, 129, 0.45)',
            boxShadow: '0 8px 30px rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                flexShrink: 0
              }}>
                🏆
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#059669', fontFamily: "'Outfit', sans-serif" }}>
                  Muhteşem Başarı! Bugünün Tüm Görevlerini Bitirdin!
                </div>
                <div style={{ fontSize: '0.82rem', color: subTextColor, fontWeight: 700, marginTop: 4 }}>
                  +{earnedXp} XP kazandın • {completedQuestions > 0 ? `${completedQuestions} Soru çözüldü.` : `${completedTasks} Görev tamamlandı.`} Disiplinin için tebrikler!
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {onNavigateBooks && (
                <button
                  type="button"
                  onClick={onNavigateBooks}
                  style={{
                    borderRadius: 12,
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.84rem',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 3px 12px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <BookOpen size={16} /> Kütüphaneyi Aç
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
});
