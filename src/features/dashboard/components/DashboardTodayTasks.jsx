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
  ArrowRight
} from 'lucide-react';
import { getRemedialLockStatus } from '../../../services/remedialSpacedRepetitionService';

const SUBJECT_THEMES = {
  'Matematik': {
    from: '#3b82f6',
    to: '#1d4ed8',
    icon: '📐',
    badgeBg: 'rgba(59, 130, 246, 0.12)',
    badgeText: '#2563eb',
    badgeBorder: 'rgba(59, 130, 246, 0.3)',
    glow: 'rgba(59, 130, 246, 0.22)'
  },
  'Türkçe': {
    from: '#f43f5e',
    to: '#be123c',
    icon: '📖',
    badgeBg: 'rgba(244, 63, 94, 0.12)',
    badgeText: '#e11d48',
    badgeBorder: 'rgba(244, 63, 94, 0.3)',
    glow: 'rgba(244, 63, 94, 0.22)'
  },
  'Fen Bilimleri': {
    from: '#10b981',
    to: '#047857',
    icon: '🧪',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeText: '#059669',
    badgeBorder: 'rgba(16, 185, 129, 0.3)',
    glow: 'rgba(16, 185, 129, 0.22)'
  },
  'Sosyal Bilgiler': {
    from: '#f59e0b',
    to: '#b45309',
    icon: '🌍',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
    badgeText: '#d97706',
    badgeBorder: 'rgba(245, 158, 11, 0.3)',
    glow: 'rgba(245, 158, 11, 0.22)'
  },
  'İngilizce': {
    from: '#8b5cf6',
    to: '#6d28d9',
    icon: '💬',
    badgeBg: 'rgba(139, 92, 246, 0.12)',
    badgeText: '#7c3aed',
    badgeBorder: 'rgba(139, 92, 246, 0.3)',
    glow: 'rgba(139, 92, 246, 0.22)'
  },
  'Din Kültürü': {
    from: '#06b6d4',
    to: '#0e7490',
    icon: '✨',
    badgeBg: 'rgba(6, 182, 212, 0.12)',
    badgeText: '#0891b2',
    badgeBorder: 'rgba(6, 182, 212, 0.3)',
    glow: 'rgba(6, 182, 212, 0.22)'
  },
  'Kitap Okuma': {
    from: '#ec4899',
    to: '#be185d',
    icon: '📚',
    badgeBg: 'rgba(236, 72, 153, 0.12)',
    badgeText: '#db2777',
    badgeBorder: 'rgba(236, 72, 153, 0.3)',
    glow: 'rgba(236, 72, 153, 0.22)'
  },
  'Deneme': {
    from: '#f97316',
    to: '#c2410c',
    icon: '🎯',
    badgeBg: 'rgba(249, 115, 22, 0.12)',
    badgeText: '#ea580c',
    badgeBorder: 'rgba(249, 115, 22, 0.3)',
    glow: 'rgba(249, 115, 22, 0.22)'
  }
};

const DAY_PALETTE = [
  // 0: Pazartesi - Mavi
  {
    bg: 'rgba(59, 130, 246, 0.12)',
    darkBg: 'rgba(59, 130, 246, 0.2)',
    border: 'rgba(59, 130, 246, 0.35)',
    text: '#2563eb',
    darkText: '#93c5fd',
    activeBg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    glow: 'rgba(59, 130, 246, 0.4)'
  },
  // 1: Salı - Mor
  {
    bg: 'rgba(139, 92, 246, 0.12)',
    darkBg: 'rgba(139, 92, 246, 0.2)',
    border: 'rgba(139, 92, 246, 0.35)',
    text: '#7c3aed',
    darkText: '#c4b5fd',
    activeBg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    glow: 'rgba(139, 92, 246, 0.4)'
  },
  // 2: Çarşamba - Camgöbeği
  {
    bg: 'rgba(6, 182, 212, 0.12)',
    darkBg: 'rgba(6, 182, 212, 0.2)',
    border: 'rgba(6, 182, 212, 0.35)',
    text: '#0891b2',
    darkText: '#67e8f9',
    activeBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    glow: 'rgba(6, 182, 212, 0.4)'
  },
  // 3: Perşembe - Zümrüt Yeşil
  {
    bg: 'rgba(16, 185, 129, 0.12)',
    darkBg: 'rgba(16, 185, 129, 0.2)',
    border: 'rgba(16, 185, 129, 0.35)',
    text: '#059669',
    darkText: '#6ee7b7',
    activeBg: 'linear-gradient(135deg, #10b981, #047857)',
    glow: 'rgba(16, 185, 129, 0.4)'
  },
  // 4: Cuma - Turuncu / Amber
  {
    bg: 'rgba(245, 158, 11, 0.12)',
    darkBg: 'rgba(245, 158, 11, 0.2)',
    border: 'rgba(245, 158, 11, 0.35)',
    text: '#d97706',
    darkText: '#fcd34d',
    activeBg: 'linear-gradient(135deg, #f59e0b, #b45309)',
    glow: 'rgba(245, 158, 11, 0.4)'
  },
  // 5: Cumartesi - Mercan Kırmızı
  {
    bg: 'rgba(244, 63, 94, 0.12)',
    darkBg: 'rgba(244, 63, 94, 0.2)',
    border: 'rgba(244, 63, 94, 0.35)',
    text: '#e11d48',
    darkText: '#fda4af',
    activeBg: 'linear-gradient(135deg, #f43f5e, #be123c)',
    glow: 'rgba(244, 63, 94, 0.4)'
  },
  // 6: Pazar - Pembe / Fuşya
  {
    bg: 'rgba(236, 72, 153, 0.12)',
    darkBg: 'rgba(236, 72, 153, 0.2)',
    border: 'rgba(236, 72, 153, 0.35)',
    text: '#db2777',
    darkText: '#f472b6',
    activeBg: 'linear-gradient(135deg, #ec4899, #be185d)',
    glow: 'rgba(236, 72, 153, 0.4)'
  }
];

const resolveSubjectTheme = (subj) => {
  if (!subj) return { from: '#6366f1', to: '#4f46e5', icon: '📝', badgeBg: 'rgba(99, 102, 241, 0.12)', badgeText: '#6366f1', badgeBorder: 'rgba(99, 102, 241, 0.3)', glow: 'rgba(99, 102, 241, 0.22)' };
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
  return { from: '#6366f1', to: '#4f46e5', icon: '📝', badgeBg: 'rgba(99, 102, 241, 0.12)', badgeText: '#6366f1', badgeBorder: 'rgba(99, 102, 241, 0.3)', glow: 'rgba(99, 102, 241, 0.22)' };
};

export default memo(function DashboardTodayTasks({
  isMobile = false,
  isDark = false,
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
  const [filterStatus, setFilterStatus] = useState('pending'); // 'pending', 'completed'
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

  const headerGradient = safeDayInfo.isToday
    ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #8b5cf6 100%)'
    : activeDayConfig?.color
    ? `linear-gradient(135deg, ${activeDayConfig.color}, #3b82f6)`
    : 'linear-gradient(135deg, #4f46e5, #6366f1)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', width: '100%' }}>
      
      {/* ═══════════════════════════════════════════════════════════════
          🎯 BİRLEŞTİRİLMİŞ MODERN ODAK MERKEZİ & HAFTALIK GÖREV TAKVİMİ
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        borderRadius: isMobile ? '0 0 20px 20px' : '0 0 24px 24px',
        overflow: 'hidden',
        border: isDark ? '1.5px solid rgba(99, 102, 241, 0.3)' : '1.5px solid #e2e8f0',
        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #edf2f7',
        background: isDark
          ? 'linear-gradient(180deg, #13192f 0%, #0d1222 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        boxShadow: isDark
          ? '0 18px 45px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(99, 102, 241, 0.12)'
          : '0 12px 35px -8px rgba(99, 102, 241, 0.08), 0 2px 8px rgba(0, 0, 0, 0.02)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        
        {/* ── 1. KOMPAKT MODERN BAŞLIK & HIZLI AKSİYONLAR ── */}
        <div style={{
          padding: isMobile ? '0.75rem 0.85rem' : '0.85rem 1.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #edf2f7'
        }}>
          {/* Sol: Kompakt Gün Başlığı & Kalan Görev Rozeti */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: isMobile ? '1.15rem' : '1.3rem', lineHeight: 1 }}>
              {safeDayInfo.isToday ? '🎯' : (activeDayConfig?.icon || '📅')}
            </span>
            <span style={{
              fontSize: isMobile ? '0.98rem' : '1.15rem',
              fontWeight: 900,
              color: 'var(--color-text)',
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '-0.01em'
            }}>
              {safeDayInfo.isToday ? 'Bugün Ne Yapacaksın?' : (`${safeDayInfo.dayName || 'Ders'} Programı`)}
            </span>
            
            {safeDayInfo.fullDateLabel && (
              <span style={{
                fontSize: isMobile ? '0.72rem' : '0.78rem',
                color: 'var(--color-text-muted)',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 8,
                background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'
              }}>
                {safeDayInfo.fullDateLabel}
              </span>
            )}

            {safeDayInfo.hasAllCompleted && totalTasks > 0 ? (
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: 99,
                background: '#10b981',
                color: '#ffffff',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)'
              }}>
                ✓ Tamamlandı
              </span>
            ) : remainingTasks > 0 ? (
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: 99,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)'
              }}>
                {remainingTasks} Kaldı
              </span>
            ) : null}
          </div>

          {/* Sağ: Kompakt Aksiyon Butonları */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                  borderRadius: 10,
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                }}
              >
                <Zap size={13} fill="#ffffff" />
                <span>Bugün</span>
              </button>
            )}

            {onAddTask && (
              <button
                type="button"
                onClick={onAddTask}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: 10,
                  padding: '0.38rem 0.85rem',
                  fontSize: '0.76rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 3px 10px rgba(79, 70, 229, 0.3)'
                }}
              >
                <Plus size={14} strokeWidth={3} />
                <span>Görev Ekle</span>
              </button>
            )}

            {showProgramButton && (
              <button
                type="button"
                onClick={() => navigate('/my-program')}
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                  color: 'var(--color-text)',
                  borderRadius: 10,
                  padding: '0.38rem 0.7rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
                title="Haftalık Program"
              >
                <CalendarDays size={13} />
                <span style={{ display: isMobile ? 'none' : 'inline' }}>Program</span>
              </button>
            )}

            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                  color: 'var(--color-text)',
                  borderRadius: 10,
                  padding: '0.38rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
                title="Haftalık Programı Yazdır"
              >
                <Printer size={13} />
              </button>
            )}
          </div>
        </div>

        {/* ── 2. ULTRA-KOMPAKT & ŞIK 7 GÜNLÜK TAKVİM ŞERİDİ ── */}
        {Array.isArray(daysOfWeek) && daysOfWeek.length > 0 && onSelectDay && (
          <div style={{
            padding: isMobile ? '0.45rem 0.5rem' : '0.55rem 1.1rem',
            background: isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(248, 250, 252, 0.9)',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #edf2f7'
          }}>
            {/* Hafta Gezinme Çubuğu */}
            {(onPrevWeek || onNextWeek || weekInfo?.weekRangeLabel) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: isMobile ? '0.4rem' : '0.5rem',
                padding: '0 2px'
              }}>
                <button
                  type="button"
                  onClick={onPrevWeek}
                  className="game-btn-3d"
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #cbd5e1',
                    borderRadius: 9,
                    padding: isMobile ? '0.24rem 0.45rem' : '0.28rem 0.75rem',
                    fontSize: isMobile ? '0.68rem' : '0.74rem',
                    fontWeight: 800,
                    color: isDark ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                  }}
                  title="Önceki Hafta"
                >
                  <ChevronLeft size={isMobile ? 12 : 14} />
                  <span>{isMobile ? 'Önceki' : 'Önceki Hafta'}</span>
                </button>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: isMobile ? '0.74rem' : '0.82rem',
                    fontWeight: 900,
                    color: weekOffset === 0 ? 'var(--color-text)' : '#6366f1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <Calendar size={isMobile ? 12 : 13} />
                    <span>{weekInfo?.weekRangeLabel || 'Hafta'}</span>
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
                        padding: '1.5px 7px',
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)'
                      }}
                      title="Bugünün Haftasına Dön"
                    >
                      <RotateCcw size={10} />
                      <span>Bu Hafta</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onNextWeek}
                  className="game-btn-3d"
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #cbd5e1',
                    borderRadius: 9,
                    padding: isMobile ? '0.24rem 0.45rem' : '0.28rem 0.75rem',
                    fontSize: isMobile ? '0.68rem' : '0.74rem',
                    fontWeight: 800,
                    color: isDark ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                  }}
                  title="Sonraki Hafta"
                >
                  <span>{isMobile ? 'Sonraki' : 'Sonraki Hafta'}</span>
                  <ChevronRight size={isMobile ? 12 : 14} />
                </button>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: isMobile ? 4 : 8,
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
                      height: isMobile ? 38 : 44,
                      borderRadius: 11,
                      border: isSelected
                        ? (isDark ? '2px solid #ffffff' : `2px solid ${dayCol.activeBorder}`)
                        : isCurrentToday
                        ? '2px solid #f59e0b'
                        : `1.5px solid ${dayCol.border}`,
                      background: isSelected
                        ? dayCol.activeBg
                        : (isDark ? dayCol.darkBg : dayCol.bg),
                      color: isSelected
                        ? '#ffffff'
                        : (isDark ? dayCol.darkText : dayCol.text),
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isSelected
                        ? `0 4px 14px ${dayCol.glow}`
                        : (isCurrentToday ? '0 0 0 1px #f59e0b' : 'none'),
                      transition: 'all 0.16s ease',
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: isMobile ? '0 2px' : '0 6px',
                      transform: isSelected && !isMobile ? 'translateY(-1px)' : 'none'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobile ? 3 : 6,
                      lineHeight: 1
                    }}>
                      {/* Tarih Numarası ve Simge (Mobilde sadece sayı & simge, gün adı yok) */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: isMobile ? 3 : 4,
                        fontSize: isMobile ? '0.88rem' : '1rem',
                        fontWeight: 900,
                        fontFamily: "'Outfit', sans-serif"
                      }}>
                        <Calendar size={isMobile ? 11 : 12} style={{ opacity: isSelected ? 1 : 0.7, flexShrink: 0 }} />
                        {dateNumber || '-'}
                      </span>

                      {/* Kısa Dik Çizgi (Sadece Masaüstü) */}
                      {!isMobile && (
                        <span style={{
                          width: '1.5px',
                          height: '13px',
                          background: 'currentColor',
                          opacity: isSelected ? 0.6 : 0.4,
                          borderRadius: 99
                        }} />
                      )}

                      {/* Gün İsmi (Sadece Masaüstü) */}
                      {!isMobile && (
                        <span style={{
                          fontSize: '0.82rem',
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
                          padding: '1px 6px',
                          borderRadius: 99,
                          background: isSelected
                            ? 'rgba(255, 255, 255, 0.28)'
                            : (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.75)'),
                          color: isSelected
                            ? '#ffffff'
                            : 'currentColor',
                          marginLeft: 2,
                          whiteSpace: 'nowrap'
                        }}>
                          {taskCount > 0 ? `${taskCount} görev` : '-'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Filtre Çipleri ── */}
        {totalTasks > 1 && (
          <div style={{
            padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.4rem',
            background: 'var(--color-surface)',
            borderBottom: '1.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 6 : 8,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className="today-filter-chip"
              style={{
                background: filterStatus === 'pending'
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                color: filterStatus === 'pending' ? '#ffffff' : 'var(--color-text-muted)',
                borderColor: filterStatus === 'pending' ? '#dc2626' : 'transparent',
                boxShadow: filterStatus === 'pending' ? '0 4px 12px rgba(239, 68, 68, 0.35)' : 'none',
                fontWeight: 900,
                fontSize: isMobile ? '0.74rem' : '0.8rem',
                padding: isMobile ? '0.35rem 0.7rem' : '0.45rem 1rem',
                borderRadius: 12
              }}
            >
              <span>⏳ Bekleyen ({remainingTasks})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className="today-filter-chip"
              style={{
                background: filterStatus === 'completed'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                color: filterStatus === 'completed' ? '#ffffff' : 'var(--color-text-muted)',
                borderColor: filterStatus === 'completed' ? '#059669' : 'transparent',
                boxShadow: filterStatus === 'completed' ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none',
                fontWeight: 900,
                fontSize: isMobile ? '0.74rem' : '0.8rem',
                padding: isMobile ? '0.35rem 0.7rem' : '0.45rem 1rem',
                borderRadius: 12
              }}
            >
              <span>✓ Tamamlanan ({completedTasks})</span>
            </button>

            {/* Ders Filtreleri */}
            {subjects.length > 1 && (
              <>
                <div style={{ width: 1.5, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />
                {subjects.map(([subj, count]) => {
                  const sTheme = resolveSubjectTheme(subj);
                  const isSelected = selectedSubject === subj;
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSelectedSubject(prev => prev === subj ? 'all' : subj)}
                      className="today-filter-chip"
                      style={{
                        background: isSelected ? sTheme.badgeBg : 'transparent',
                        color: isSelected ? sTheme.badgeText : 'var(--color-text-muted)',
                        border: isSelected ? `1.5px solid ${sTheme.from}` : '1.5px solid var(--color-border)',
                        fontSize: isMobile ? '0.72rem' : '0.78rem',
                        padding: isMobile ? '0.32rem 0.65rem' : '0.45rem 0.85rem'
                      }}
                    >
                      <span>{sTheme.icon} {subj} ({count})</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ── KOMPAKT & ŞIK GÖREV KARTLARI LİSTESİ ── */}
        {filteredTasks.length > 0 ? (
          <div style={{
            padding: isMobile ? '0.5rem 0.5rem' : '0.85rem 1.15rem',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: isMobile ? '0.45rem' : '0.65rem',
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

              // Compute accurate success percentage with failsafe against raw net scores:
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
                  // Guard against net score being mistakenly treated as percentage:
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
                successScore >= 80 ? { icon: '🏆', label: 'Güçlü', color: '#10b981', bg: isDark ? 'rgba(16,185,129,0.2)' : '#dcfce7', border: 'rgba(16,185,129,0.35)', text: '#15803d' }
                : successScore >= 60 ? { icon: '📈', label: 'Gelişiyor', color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7', border: 'rgba(245,158,11,0.35)', text: '#b45309' }
                : { icon: '⚠️', label: 'Tekrar Etmeli', color: '#ef4444', bg: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2', border: 'rgba(239,68,68,0.35)', text: '#b91c1c' }
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
                      ? (isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)') 
                      : (isNextTarget 
                          ? (isDark ? 'linear-gradient(145deg, rgba(99, 102, 241, 0.14), var(--color-surface))' : 'linear-gradient(145deg, rgba(99, 102, 241, 0.06), #ffffff)') 
                          : (isDark ? 'rgba(255,255,255,0.025)' : '#ffffff')),
                    border: `1.5px solid ${task.done ? 'rgba(16,185,129,0.35)' : isNextTarget ? '#818cf8' : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0')}`,
                    borderLeft: `4px solid ${task.done ? '#10b981' : isNextTarget ? '#6366f1' : sTheme.from}`,
                    borderRadius: isMobile ? 12 : 14,
                    padding: isMobile ? '0.55rem 0.65rem' : '0.65rem 0.95rem',
                    cursor: 'pointer',
                    boxShadow: isNextTarget 
                      ? '0 0 0 1.5px rgba(99, 102, 241, 0.25), 0 4px 14px rgba(99, 102, 241, 0.12)' 
                      : (task.done ? '0 1px 4px rgba(16,185,129,0.05)' : '0 2px 8px rgba(0,0,0,0.03)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: isMobile ? 8 : 12,
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Sol: Hızlı Tamamlama Kutusu (Checkbox) */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                    style={{
                      width: isMobile ? 28 : 32,
                      height: isMobile ? 28 : 32,
                      minWidth: isMobile ? 28 : 32,
                      borderRadius: isMobile ? 8 : 9,
                      border: task.done 
                        ? '2px solid #10b981' 
                        : isDark ? '2px solid rgba(255, 255, 255, 0.22)' : '2px solid #cbd5e1',
                      background: task.done
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'),
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      cursor: 'pointer',
                      padding: 0,
                      boxShadow: task.done ? '0 2px 6px rgba(16, 185, 129, 0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    title={task.done ? 'Tamamlandı (Geri almak için tıkla)' : 'Tamamlandı olarak işaretle'}
                  >
                    {task.done ? (
                      <Check size={isMobile ? 16 : 18} color="#ffffff" strokeWidth={3.5} />
                    ) : null}
                  </button>

                  {/* Orta: Ders, Başlık ve Alt Bilgi */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Satır 1: Ders Rozeti + Görev Başlığı + Sonuç/Hedef Rozeti */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: isMobile ? '0.64rem' : '0.68rem',
                        fontWeight: 900,
                        color: sTheme.badgeText,
                        background: sTheme.badgeBg,
                        border: `1px solid ${sTheme.badgeBorder}`,
                        padding: '1.5px 6px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: isMobile ? '0.74rem' : '0.82rem', lineHeight: 1 }}>{sTheme.icon}</span>
                        <span>{cleanSubj}</span>
                      </span>

                      <span style={{
                        fontSize: isMobile ? '0.85rem' : '0.94rem',
                        fontWeight: 800,
                        color: task.done ? 'var(--color-text-muted)' : 'var(--color-text)',
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
                          fontSize: '0.6rem',
                          fontWeight: 900,
                          color: '#ffffff',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          padding: '1px 6px',
                          borderRadius: 99,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2,
                          flexShrink: 0
                        }}>
                          <Zap size={9} fill="#ffffff" /> Sıradaki
                        </span>
                      )}

                      {task.done && isTestTask && statusTag && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          color: statusTag.color,
                          background: statusTag.bg,
                          border: `1px solid ${statusTag.border}`,
                          padding: '1px 5px',
                          borderRadius: 6,
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
                      fontSize: isMobile ? '0.68rem' : '0.72rem',
                      color: 'var(--color-text-muted)',
                      fontWeight: 650
                    }}>
                      {sBook && !/^kitap$/i.test(sBook.trim()) && !/^takip kitabı$/i.test(sBook.trim()) && (
                        <span style={{
                          color: (task.roadmapAssignmentId || task.isRoadmapTask) ? '#7c3aed' : 'var(--color-text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: isMobile ? 140 : 200
                        }}>
                          {(task.roadmapAssignmentId || task.isRoadmapTask) ? `🗺️ ${sBook}` : `📖 ${sBook}`}
                        </span>
                      )}
                      {task.questionCount && !isReadingTask && (
                        <span>• 📝 {task.questionCount} Soru</span>
                      )}
                      {isReadingTask && (
                        <span style={{ color: '#db2777' }}>• 📚 Okuma</span>
                      )}
                      {pageBadge && (
                        <span>• 📄 {pageBadge}</span>
                      )}
                      {isRemedialTask && (
                        <span style={{ color: '#7c3aed', fontWeight: 800 }}>• 🔄 {syncAttemptNumber}. Tekrar</span>
                      )}
                      {sUnit && !sBook && (
                        <span>• 📌 {sUnit}</span>
                      )}
                      {(task.time || task.dueDateStr) && (
                        <span>• ⏱️ {String(task.time || task.dueDateStr)}</span>
                      )}
                    </div>
                  </div>

                  {/* Sağ: Kompakt Aksiyon Butonu */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {task.done ? (
                      isReadingTask || !isQuizTask ? (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#10b981',
                          background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '0.3rem 0.65rem',
                          borderRadius: 8
                        }}>
                          ✓ Bitti
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                          style={{
                            fontSize: isMobile ? '0.7rem' : '0.75rem',
                            fontWeight: 800,
                            color: '#10b981',
                            background: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ecfdf5',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: isMobile ? '0.32rem 0.6rem' : '0.38rem 0.75rem',
                            borderRadius: 8,
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
                              background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                              color: isDark ? '#94a3b8' : '#64748b',
                              border: isDark ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid #e2e8f0',
                              borderRadius: 8,
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.72rem',
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
                          borderRadius: 8,
                          padding: isMobile ? '0.35rem 0.7rem' : '0.42rem 0.9rem',
                          fontSize: isMobile ? '0.74rem' : '0.78rem',
                          fontWeight: 850,
                          cursor: 'pointer',
                          boxShadow: `0 2px 8px ${sTheme.glow}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {isRemedialTask && syncAttemptNumber > 1 ? (
                          <>
                            <RotateCcw size={12} />
                            <span>Tekrar</span>
                          </>
                        ) : (
                          <>
                            <span>Çöz</span>
                            <ArrowRight size={13} />
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
                          borderRadius: 8,
                          padding: isMobile ? '0.35rem 0.7rem' : '0.42rem 0.9rem',
                          fontSize: isMobile ? '0.74rem' : '0.78rem',
                          fontWeight: 850,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {isReadingTask ? (
                          <>
                            <BookOpen size={12} />
                            <span>Okudum</span>
                          </>
                        ) : (
                          <span>Tamamla</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : totalTasks > 0 ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {filterStatus === 'pending' && remainingTasks === 0 ? (
              <div>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#10b981', marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>
                  Harika! Bekleyen hiçbir görev kalmadı.
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 14 }}>
                  Günün tüm hedeflerini tamamladın!
                </div>
                <button
                  type="button"
                  onClick={() => setFilterStatus('completed')}
                  className="game-btn-3d game-btn-emerald"
                  style={{
                    padding: '0.6rem 1.35rem',
                    borderRadius: 14,
                    fontSize: '0.84rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>✓ Tamamlanan Görevleri Gör ({completedTasks})</span>
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Seçilen filtreye uygun görev bulunamadı.</div>
                <button
                  type="button"
                  onClick={() => { setFilterStatus('pending'); setSelectedSubject('all'); }}
                  style={{
                    marginTop: 10,
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    textDecoration: 'underline'
                  }}
                >
                  Filtreleri Sıfırla
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Hiç görev yok */
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🎉</div>
            <div style={{ fontWeight: 900, color: '#10b981', fontSize: '1.2rem', marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>
              {dayProgramInfo.isToday
                ? 'Bugün için planlanan tüm görevler bitti veya henüz görev eklenmedi!'
                : `${dayProgramInfo.dayName} günü için kayıtlı görev bulunmuyor.`}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: 460, margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Harika bir disiplin! Kütüphaneden yeni testler çözebilir veya programına yeni ders hedefleri ekleyebilirsin.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {onAddTask && (
                <button
                  type="button"
                  onClick={onAddTask}
                  className="game-btn-3d game-btn-primary"
                  style={{
                    borderRadius: 14,
                    padding: '0.75rem 1.45rem',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Plus size={16} strokeWidth={2.5} /> Yeni Görev Ekle
                </button>
              )}
              {onNavigateBooks && (
                <button
                  type="button"
                  onClick={onNavigateBooks}
                  className="game-btn-3d"
                  style={{
                    borderRadius: 14,
                    padding: '0.75rem 1.45rem',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    background: isDark ? 'rgba(2, 132, 199, 0.2)' : '#f0f9ff',
                    border: '1.5px solid #0284c7',
                    color: '#0284c7',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <BookOpen size={16} /> Kütüphaneye Git
                </button>
              )}
            </div>
          </div>
        )}

        {/* Daha Fazla Göster Butonu (Mobilde 6'dan fazla görev varsa) */}
        {isMobile && filteredTasks.length > 6 && (
          <div style={{ padding: '0.75rem 0.95rem', background: 'var(--color-surface)', borderTop: '1.5px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={() => setShowAllDayTasks && setShowAllDayTasks(prev => !prev)}
              style={{
                width: '100%',
                background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
                border: '1.5px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '0.85rem',
                padding: '0.7rem 1rem',
                color: isDark ? '#a5b4fc' : '#4f46e5',
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
            margin: '0.75rem 1rem 1rem',
            padding: '1.25rem 1.45rem',
            borderRadius: 18,
            background: isDark ? 'rgba(16, 185, 129, 0.12)' : 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                flexShrink: 0
              }}>
                🏆
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#059669', fontFamily: "'Outfit', sans-serif" }}>
                  Tebrikler! Bugünün Tüm Görevlerini Bitirdin!
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 3 }}>
                  +{earnedXp} XP kazandın • {completedQuestions > 0 ? `${completedQuestions} Soru tamamlandı.` : `${completedTasks} Görev tamamlandı.`} Harika bir gün!
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {onNavigateBooks && (
                <button
                  type="button"
                  onClick={onNavigateBooks}
                  className="game-btn-3d game-btn-emerald"
                  style={{
                    borderRadius: 14,
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.84rem',
                    fontWeight: 900,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <BookOpen size={16} /> Kitapları Aç
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
});
