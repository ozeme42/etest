import React, { memo, useState, useMemo } from 'react';
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
  Trophy
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
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'completed'
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
          BÖLÜM: 🎯 BÜYÜK, RENKLİ & ŞIK GÜNLÜK PROGRAM ODAK MERKEZİ
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        borderRadius: 22,
        overflow: 'hidden',
        border: '1.5px solid var(--color-border)',
        background: 'var(--color-surface)',
        boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.5)' : '0 10px 30px rgba(99, 102, 241, 0.09)'
      }}>
        
        {/* ── Renkli Hero Başlık ── */}
        <div style={{
          background: headerGradient,
          padding: isMobile ? '1.1rem 1.15rem' : '1.35rem 1.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: isMobile ? 44 : 52,
              height: isMobile ? 44 : 52,
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '1.45rem' : '1.75rem',
              boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
              flexShrink: 0
            }}>
              {dayProgramInfo.isToday ? '🎯' : (activeDayConfig?.icon || '📅')}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: isMobile ? '1.18rem' : '1.42rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: '-0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  {dayProgramInfo.isToday ? '🎯 Bugün Ne Yapacaksın?' : `📅 ${dayProgramInfo.dayName} Görev Programı`}
                </h3>

                {dayProgramInfo.hasAllCompleted && totalTasks > 0 ? (
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    padding: '3px 12px',
                    borderRadius: 99,
                    background: '#10b981',
                    color: '#ffffff',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.45)'
                  }}>
                    ✓ GÜN TAMAMLANDI
                  </span>
                ) : remainingTasks > 0 ? (
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    padding: '3px 12px',
                    borderRadius: 99,
                    background: 'rgba(255, 255, 255, 0.22)',
                    backdropFilter: 'blur(8px)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.35)'
                  }}>
                    {remainingTasks} Görev Kaldı
                  </span>
                ) : null}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.92)', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {dayProgramInfo.fullDateLabel && <span>📌 {dayProgramInfo.fullDateLabel}</span>}
                <span>•</span>
                <span>{dayProgramInfo.isToday ? 'Bugünkü ders programın ve çözülecek testlerin' : 'Belirlenen ders görevleri'}</span>
              </div>
            </div>
          </div>

          {/* Aksiyon Ekle Butonu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onAddTask && (
              <button
                type="button"
                onClick={onAddTask}
                style={{
                  background: 'rgba(255, 255, 255, 0.24)',
                  border: '1.5px solid rgba(255, 255, 255, 0.5)',
                  color: '#ffffff',
                  borderRadius: 14,
                  padding: isMobile ? '0.5rem 0.95rem' : '0.6rem 1.25rem',
                  fontSize: isMobile ? '0.78rem' : '0.86rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                  transition: 'all 0.18s ease'
                }}
              >
                <Plus size={16} strokeWidth={3} />
                <span>Görev Ekle</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Bento KPI İlerleme Şeridi ── */}
        {totalTasks > 0 && (
          <div style={{
            padding: isMobile ? '0.75rem 0.65rem' : '1.1rem 1.6rem',
            background: isDark ? 'rgba(15, 23, 42, 0.65)' : '#f8fafc',
            borderBottom: '1.5px solid var(--color-border)',
            display: isMobile ? 'grid' : 'flex',
            gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : undefined,
            alignItems: 'stretch',
            gap: isMobile ? 8 : 12,
            flexWrap: isMobile ? undefined : 'wrap'
          }}>
            {/* 1. Görev Durumu */}
            <div className="today-metric-pill" style={{ flex: isMobile ? undefined : '1 1 180px', padding: isMobile ? '0.55rem 0.65rem' : '0.65rem 0.85rem' }}>
              <div style={{
                width: isMobile ? 32 : 38,
                height: isMobile ? 32 : 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1rem' : '1.15rem',
                flexShrink: 0
              }}>
                🎯
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Görevler
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: isMobile ? '0.98rem' : '1.12rem', fontWeight: 900, color: 'var(--color-text)', fontFamily: "'Outfit', sans-serif" }}>
                    {completedTasks}/{totalTasks}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: completionPct === 100 ? '#10b981' : '#6366f1' }}>
                    %{completionPct}
                  </span>
                </div>
                <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, marginTop: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${completionPct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #10b981)',
                    borderRadius: 99,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>

            {/* 2. Soru Hedefi */}
            {totalQuestions > 0 && (
              <div className="today-metric-pill" style={{ flex: isMobile ? undefined : '1 1 150px', padding: isMobile ? '0.55rem 0.65rem' : '0.65rem 0.85rem' }}>
                <div style={{
                  width: isMobile ? 32 : 38,
                  height: isMobile ? 32 : 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '1rem' : '1.15rem',
                  flexShrink: 0
                }}>
                  📝
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Hedef Soru
                  </div>
                  <div style={{ fontSize: isMobile ? '0.98rem' : '1.12rem', fontWeight: 900, color: 'var(--color-text)', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {completedQuestions} <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>/ {totalQuestions}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. XP Kazancı */}
            <div className="today-metric-pill" style={{ flex: isMobile ? undefined : '1 1 140px', padding: isMobile ? '0.55rem 0.65rem' : '0.65rem 0.85rem' }}>
              <div style={{
                width: isMobile ? 32 : 38,
                height: isMobile ? 32 : 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1rem' : '1.15rem',
                flexShrink: 0
              }}>
                ⚡
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  XP Kazancı
                </div>
                <div style={{ fontSize: isMobile ? '0.98rem' : '1.12rem', fontWeight: 900, color: '#f59e0b', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  +{earnedXp} <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>/ +{totalXp}</span>
                </div>
              </div>
            </div>

            {/* 4. Durum */}
            <div className="today-metric-pill" style={{ flex: isMobile ? undefined : '1 1 150px', padding: isMobile ? '0.55rem 0.65rem' : '0.65rem 0.85rem' }}>
              <div style={{
                width: isMobile ? 32 : 38,
                height: isMobile ? 32 : 38,
                borderRadius: 10,
                background: safeDayInfo.hasAllCompleted
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1rem' : '1.15rem',
                flexShrink: 0
              }}>
                {dayProgramInfo.hasAllCompleted ? '🏆' : '🔥'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Durum
                </div>
                <div style={{ fontSize: isMobile ? '0.86rem' : '0.98rem', fontWeight: 900, color: dayProgramInfo.hasAllCompleted ? '#10b981' : 'var(--color-text)', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {dayProgramInfo.hasAllCompleted ? 'Tümü Bitti 🎉' : `${remainingTasks} Hedef Kaldı`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filtre Çipleri ── */}
        {totalTasks > 1 && (
          <div style={{
            padding: '0.75rem 1.4rem',
            background: 'var(--color-surface)',
            borderBottom: '1.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className="today-filter-chip"
              style={{
                background: filterStatus === 'all' ? '#6366f1' : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                color: filterStatus === 'all' ? '#ffffff' : 'var(--color-text-muted)',
                borderColor: filterStatus === 'all' ? '#4f46e5' : 'transparent',
                fontSize: '0.78rem'
              }}
            >
              <span>Tümü ({totalTasks})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className="today-filter-chip"
              style={{
                background: filterStatus === 'pending' ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                color: filterStatus === 'pending' ? '#ffffff' : 'var(--color-text-muted)',
                borderColor: filterStatus === 'pending' ? '#dc2626' : 'transparent',
                fontSize: '0.78rem'
              }}
            >
              <span>⏳ Bekleyen ({remainingTasks})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className="today-filter-chip"
              style={{
                background: filterStatus === 'completed' ? '#10b981' : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                color: filterStatus === 'completed' ? '#ffffff' : 'var(--color-text-muted)',
                borderColor: filterStatus === 'completed' ? '#059669' : 'transparent',
                fontSize: '0.78rem'
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
                        fontSize: '0.78rem'
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

        {/* ── BÜYÜK, RENKLİ & ŞIK GÖREV KARTLARI LİSTESİ ── */}
        {filteredTasks.length > 0 ? (
          <div style={{
            padding: isMobile ? '0.85rem 0.65rem' : '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
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
                displayTitle = displayTitle.replace(new RegExp(rawBook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/^[\s\—\-\:\/]+/, '').trim();
              }

              if (!displayTitle || /^(ödev|görev|test|sınav|kitap testi|ders çalışması)$/i.test(displayTitle.trim()) || (rawBook && displayTitle.toLowerCase() === rawBook.toLowerCase())) {
                if (sTestName && !/^(ödev|görev|test|sınav|kitap testi)$/i.test(sTestName.trim()) && sTestName.toLowerCase() !== rawBook.toLowerCase()) {
                  displayTitle = sTestName.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim();
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
                          ? (isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.05)') 
                          : 'var(--color-surface)'),
                    borderLeft: `7px solid ${task.done ? '#10b981' : isNextTarget ? '#6366f1' : sTheme.from}`,
                    borderTop: `1.5px solid ${task.done ? 'rgba(16,185,129,0.3)' : isNextTarget ? '#818cf8' : 'var(--color-border)'}`,
                    borderRight: `1.5px solid ${task.done ? 'rgba(16,185,129,0.3)' : isNextTarget ? '#818cf8' : 'var(--color-border)'}`,
                    borderBottom: `1.5px solid ${task.done ? 'rgba(16,185,129,0.3)' : isNextTarget ? '#818cf8' : 'var(--color-border)'}`,
                    borderRadius: 20,
                    padding: isMobile ? '1rem 0.95rem' : '1.25rem 1.55rem',
                    cursor: 'pointer',
                    boxShadow: isNextTarget 
                      ? '0 0 0 2px rgba(99, 102, 241, 0.35), 0 10px 28px rgba(99, 102, 241, 0.22)' 
                      : (task.done 
                          ? '0 4px 14px rgba(16,185,129,0.08)' 
                          : `0 6px 20px ${sTheme.glow}`),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    gap: isMobile ? '0.85rem' : '1.25rem',
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.15rem', flex: 1, minWidth: 0 }}>
                    
                    {/* Büyük Ders Avatar İkonu */}
                    <div style={{
                      width: isMobile ? 42 : 50,
                      height: isMobile ? 42 : 50,
                      borderRadius: 16,
                      background: task.done
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : `linear-gradient(135deg, ${sTheme.from}, ${sTheme.to})`,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isMobile ? '1.25rem' : '1.5rem',
                      boxShadow: task.done
                        ? '0 4px 14px rgba(16, 185, 129, 0.35)'
                        : `0 6px 16px ${sTheme.glow}`,
                      flexShrink: 0
                    }}>
                      {task.done ? '✓' : sTheme.icon}
                    </div>

                    {/* Checkbox / Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                      style={{
                        width: isMobile ? 32 : 36,
                        height: isMobile ? 32 : 36,
                        borderRadius: 12,
                        border: task.done ? 'none' : `2px solid ${isNextTarget ? '#6366f1' : 'var(--color-border-input)'}`,
                        background: task.done ? 'linear-gradient(135deg, #10b981, #059669)' : (isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        cursor: 'pointer',
                        padding: 0,
                        boxShadow: task.done ? '0 4px 12px rgba(16,185,129,0.45)' : '0 2px 6px rgba(0,0,0,0.06)',
                        transition: 'all 0.18s ease'
                      }}
                      title={task.done ? 'Tamamlandı' : 'Tamamlandı olarak işaretle'}
                    >
                      {task.done ? (
                        <Check size={18} color="#ffffff" strokeWidth={3.5} />
                      ) : isNextTarget ? (
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />
                      ) : (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'transparent' }} />
                      )}
                    </button>

                    {/* Görev Detayları */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      
                      {/* Üst Satır: Ders Rozeti & Etiketler */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {isNextTarget && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            color: '#ffffff',
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            padding: '3px 9px',
                            borderRadius: 99,
                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <Zap size={12} fill="#ffffff" /> ŞİMDİKİ HEDEF
                          </span>
                        )}

                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          color: sTheme.badgeText,
                          background: sTheme.badgeBg,
                          border: `1.5px solid ${sTheme.badgeBorder}`,
                          padding: '2px 9px',
                          borderRadius: 8,
                          flexShrink: 0
                        }}>
                          {sTheme.icon} {cleanSubj}
                        </span>

                        <span className="game-badge-xp" style={{ fontSize: '0.66rem', padding: '2px 7px' }}>
                          +{isExamItem || task.roadmapAssignmentId ? '50' : '25'} XP
                        </span>

                        {isRemedialTask && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 900,
                            color: '#7c3aed',
                            background: 'rgba(124, 58, 237, 0.12)',
                            border: '1px solid rgba(124, 58, 237, 0.3)',
                            padding: '2px 8px',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            flexShrink: 0
                          }}>
                            🔄 {syncAttemptNumber}. Tekrar
                          </span>
                        )}

                        {pageBadge && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-surface-hover)',
                            border: '1px solid var(--color-border)',
                            padding: '2px 7px',
                            borderRadius: 6,
                            flexShrink: 0
                          }}>
                            📄 {pageBadge}
                          </span>
                        )}

                        {task.questionCount && !isReadingTask && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            color: 'var(--color-text-muted)',
                            background: 'var(--color-surface-hover)',
                            padding: '2px 7px',
                            borderRadius: 6,
                            border: '1px solid var(--color-border)'
                          }}>
                            📝 {task.questionCount} Soru
                          </span>
                        )}

                        {isReadingTask && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            color: '#ec4899',
                            background: 'rgba(236, 72, 153, 0.1)',
                            padding: '2px 7px',
                            borderRadius: 6,
                            border: '1px solid rgba(236, 72, 153, 0.3)'
                          }}>
                            📖 Okuma Görevi
                          </span>
                        )}
                      </div>

                      {/* Başlık (Büyük & Belirgin) */}
                      <div style={{
                        fontSize: isMobile ? '0.98rem' : '1.12rem',
                        fontWeight: 900,
                        color: task.done ? 'var(--color-text-muted)' : 'var(--color-text)',
                        textDecoration: task.done ? 'line-through' : 'none',
                        wordBreak: 'break-word',
                        lineHeight: 1.35,
                        fontFamily: "'Outfit', sans-serif"
                      }}>
                        {displayTitle}
                      </div>

                      {/* Alt Meta Şeridi */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        {sBook && !/^kitap$/i.test(sBook.trim()) && !/^takip kitabı$/i.test(sBook.trim()) && (
                          <span style={{
                            color: (task.roadmapAssignmentId || task.isRoadmapTask) ? '#7c3aed' : 'var(--color-text-secondary)',
                            fontWeight: 800,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: isMobile ? 220 : 380,
                            background: (task.roadmapAssignmentId || task.isRoadmapTask) ? 'rgba(124, 58, 237, 0.12)' : 'var(--color-surface-hover)',
                            padding: '2px 8px',
                            borderRadius: 6,
                            border: (task.roadmapAssignmentId || task.isRoadmapTask) ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid var(--color-border)'
                          }}>
                            {(task.roadmapAssignmentId || task.isRoadmapTask) ? `🗺️ ${sBook}` : `📖 ${sBook}`}
                          </span>
                        )}
                        {sUnit && (
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                            📌 {sUnit}
                          </span>
                        )}
                        {(task.time || task.dueDateStr) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} /> {String(task.time || task.dueDateStr || '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sağ Aksiyon Butonu */}
                  <div style={{ flexShrink: 0, width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: isMobile ? 'stretch' : 'center', marginTop: isMobile ? 6 : 0 }}>
                    {task.done ? (
                      isReadingTask || !isQuizTask ? (
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 900,
                            color: '#10b981',
                            background: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)',
                            border: '1.5px solid rgba(16, 185, 129, 0.4)',
                            padding: isMobile ? '0.5rem 0.95rem' : '0.65rem 1.25rem',
                            borderRadius: 14,
                            whiteSpace: 'nowrap',
                            width: isMobile ? '100%' : 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ✓ Tamamlandı
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                          className="game-btn-3d"
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 900,
                            color: '#10b981',
                            background: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)',
                            border: '1.5px solid rgba(16, 185, 129, 0.4)',
                            padding: isMobile ? '0.5rem 0.95rem' : '0.65rem 1.25rem',
                            borderRadius: 14,
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: isMobile ? '100%' : 'auto',
                            gap: 6
                          }}
                        >
                          <Eye size={15} /> İncele
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
                            className="game-btn-3d"
                            style={{
                              background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                              color: isDark ? '#94a3b8' : '#64748b',
                              border: isDark ? '1.5px solid rgba(255, 255, 255, 0.14)' : '1.5px solid #e2e8f0',
                              borderRadius: 14,
                              padding: isMobile ? '0.5rem 0.95rem' : '0.65rem 1.25rem',
                              fontSize: '0.76rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: isMobile ? '100%' : 'auto',
                              gap: 6
                            }}
                            title={lockStatus.lockMessage}
                          >
                            <Lock size={14} color="#f59e0b" />
                            <span>{lockStatus.daysLeft === 1 ? 'Yarın Açılacak' : lockStatus.formattedDate}</span>
                          </button>
                        );
                      })()
                    ) : isQuizTask ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                        className="game-btn-3d"
                        style={{
                          background: `linear-gradient(135deg, ${sTheme.from}, ${sTheme.to})`,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 14,
                          padding: isMobile ? '0.6rem 1.1rem' : '0.75rem 1.45rem',
                          fontSize: isMobile ? '0.84rem' : '0.92rem',
                          fontWeight: 900,
                          boxShadow: `0 4px 14px ${sTheme.glow}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          width: isMobile ? '100%' : 'auto',
                          justifyContent: 'center'
                        }}
                      >
                        {isRemedialTask && syncAttemptNumber > 1 ? (
                          <>
                            <RotateCcw size={16} /> {`${syncAttemptNumber}. Tekrar`}
                          </>
                        ) : (
                          <>
                            <PlayCircle size={17} /> Başlat ⚔️
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                        className="game-btn-3d game-btn-emerald"
                        style={{
                          borderRadius: 14,
                          padding: isMobile ? '0.55rem 1rem' : '0.7rem 1.35rem',
                          fontSize: isMobile ? '0.82rem' : '0.88rem',
                          fontWeight: 900,
                          width: isMobile ? '100%' : 'auto',
                          justifyContent: 'center',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        {isReadingTask ? (
                          <>
                            <BookOpen size={16} /> Okudum ✓
                          </>
                        ) : (
                          'Tamamla ✓'
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
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Seçilen filtreye uygun görev bulunamadı.</div>
            <button
              type="button"
              onClick={() => { setFilterStatus('all'); setSelectedSubject('all'); }}
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
              Tüm Görevleri Göster ({totalTasks})
            </button>
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
