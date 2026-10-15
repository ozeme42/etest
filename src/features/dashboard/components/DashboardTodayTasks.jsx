import React, { memo, useState, useMemo } from 'react';
import {
  Check,
  PlayCircle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  BookOpen,
  Plus,
  Target,
  Trophy,
  Compass,
  ArrowRight,
  Eye,
  Lock,
  Layers,
  Flame,
  Calendar,
  Zap,
  Clock
} from 'lucide-react';
import { getRemedialLockStatus } from '../../../services/remedialSpacedRepetitionService';

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

  const items = dayProgramInfo.items || [];
  const totalTasks = items.length;
  const completedTasks = useMemo(() => items.filter(t => t.done).length, [items]);
  const remainingTasks = totalTasks - completedTasks;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Total questions count in today's tasks
  const { totalQuestions, completedQuestions } = useMemo(() => {
    let tot = 0;
    let comp = 0;
    items.forEach(t => {
      const q = Number(t.questionCount || t.targetQuestionCount || 0);
      const val = isNaN(q) ? 0 : q;
      tot += val;
      if (t.done) comp += val;
    });
    return { totalQuestions: tot, completedQuestions: comp };
  }, [items]);

  // Estimated XP
  const { totalXp, earnedXp } = useMemo(() => {
    let tot = 0;
    let earned = 0;
    items.forEach(t => {
      const isExam = t.isExamTask || t.taskType === 'deneme' || Boolean(t.roadmapAssignmentId);
      const xpVal = isExam ? 50 : 25;
      tot += xpVal;
      if (t.done) earned += xpVal;
    });
    return { totalXp: tot, earnedXp: earned };
  }, [items]);

  // Unique subjects in today's plan
  const subjects = useMemo(() => {
    const map = new Map();
    items.forEach(t => {
      const cleanSubj = (t.subject && t.subject.toLowerCase() === 'geometri') ? 'Matematik' : (t.subject || 'Diğer');
      map.set(cleanSubj, (map.get(cleanSubj) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [items]);

  // Find index of the first incomplete task (Next Target)
  const firstIncompleteIdx = useMemo(() => {
    return items.findIndex(t => !t.done);
  }, [items]);

  // Filtered task items
  const filteredTasks = useMemo(() => {
    return items.filter(task => {
      if (filterStatus === 'pending' && task.done) return false;
      if (filterStatus === 'completed' && !task.done) return false;

      if (selectedSubject !== 'all') {
        const cleanSubj = (task.subject && task.subject.toLowerCase() === 'geometri') ? 'Matematik' : (task.subject || 'Diğer');
        if (cleanSubj !== selectedSubject) return false;
      }
      return true;
    });
  }, [items, filterStatus, selectedSubject]);

  const headerGradient = dayProgramInfo.isToday
    ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #8b5cf6 100%)'
    : activeDayConfig?.color
    ? `linear-gradient(135deg, ${activeDayConfig.color}, #3b82f6)`
    : 'linear-gradient(135deg, #4f46e5, #6366f1)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      
      {/* ═══════════════════════════════════════════════════════════════
          BÖLÜM 1: 🎯 ODAK MERKEZİ: BUGÜN NE YAPACAKSIN? (HERO PANEL)
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        borderRadius: 20,
        overflow: 'hidden',
        border: '1.5px solid var(--color-border)',
        background: 'var(--color-surface)',
        boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.45)' : '0 10px 30px rgba(99, 102, 241, 0.08)'
      }}>
        
        {/* ── Renkli Hero Başlık ── */}
        <div style={{
          background: headerGradient,
          padding: isMobile ? '1rem 1.1rem' : '1.25rem 1.6rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          color: '#ffffff',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: isMobile ? 42 : 48,
              height: isMobile ? 42 : 48,
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '1.35rem' : '1.6rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              flexShrink: 0
            }}>
              {dayProgramInfo.isToday ? '🎯' : (activeDayConfig?.icon || '📅')}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: isMobile ? '1.12rem' : '1.35rem',
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
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '3px 10px',
                    borderRadius: 99,
                    background: '#10b981',
                    color: '#ffffff',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.45)'
                  }}>
                    ✓ GÜN TAMAMLANDI
                  </span>
                ) : remainingTasks > 0 ? (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '3px 10px',
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

              <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {dayProgramInfo.fullDateLabel && <span>📌 {dayProgramInfo.fullDateLabel}</span>}
                <span>•</span>
                <span>{dayProgramInfo.isToday ? 'Bugünkü hedeflerine odaklan ve XP kazan!' : 'Planlanan ders hedefleri'}</span>
              </div>
            </div>
          </div>

          {/* Aksiyon Araçları */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onAddTask && (
              <button
                type="button"
                onClick={onAddTask}
                style={{
                  background: 'rgba(255, 255, 255, 0.22)',
                  border: '1.5px solid rgba(255, 255, 255, 0.45)',
                  color: '#ffffff',
                  borderRadius: 14,
                  padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1.05rem',
                  fontSize: isMobile ? '0.76rem' : '0.82rem',
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
                <Plus size={14} strokeWidth={3} />
                <span>Görev Ekle</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Bento KPI İlerleme Şeridi ── */}
        {totalTasks > 0 && (
          <div style={{
            padding: isMobile ? '0.85rem 0.95rem' : '1rem 1.4rem',
            background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
            borderBottom: '1.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'stretch',
            gap: 10,
            flexWrap: 'wrap'
          }}>
            {/* 1. Görev Durumu */}
            <div className="today-metric-pill" style={{ flex: '1 1 180px' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.05rem',
                flexShrink: 0
              }}>
                🎯
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Görev İlerlemesi
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)', fontFamily: "'Outfit', sans-serif" }}>
                    {completedTasks} / {totalTasks}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: completionPct === 100 ? '#10b981' : '#6366f1' }}>
                    %{completionPct}
                  </span>
                </div>
                {/* Mini progress bar */}
                <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
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
              <div className="today-metric-pill" style={{ flex: '1 1 140px' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.05rem',
                  flexShrink: 0
                }}>
                  📝
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Hedef Soru
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)', fontFamily: "'Outfit', sans-serif" }}>
                    {completedQuestions} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>/ {totalQuestions} Soru</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. XP Kazancı */}
            <div className="today-metric-pill" style={{ flex: '1 1 130px' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.05rem',
                flexShrink: 0
              }}>
                ⚡
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  XP Kazancı
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f59e0b', fontFamily: "'Outfit', sans-serif" }}>
                  +{earnedXp} <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>/ +{totalXp} XP</span>
                </div>
              </div>
            </div>

            {/* 4. Durum / Seri */}
            <div className="today-metric-pill" style={{ flex: '1 1 140px' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: dayProgramInfo.hasAllCompleted
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.05rem',
                flexShrink: 0
              }}>
                {dayProgramInfo.hasAllCompleted ? '🏆' : '🔥'}
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Hedef Durumu
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: dayProgramInfo.hasAllCompleted ? '#10b981' : 'var(--color-text)', fontFamily: "'Outfit', sans-serif" }}>
                  {dayProgramInfo.hasAllCompleted ? 'Tümü Bitti 🎉' : `${remainingTasks} Hedef Kaldı`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filtre Çipleri (Çoklu Görevde Odaklanmayı Kolaylaştırır) ── */}
        {totalTasks > 1 && (
          <div style={{
            padding: '0.65rem 1.15rem',
            background: 'var(--color-surface)',
            borderBottom: '1.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
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
                borderColor: filterStatus === 'all' ? '#4f46e5' : 'transparent'
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
                borderColor: filterStatus === 'pending' ? '#dc2626' : 'transparent'
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
                borderColor: filterStatus === 'completed' ? '#059669' : 'transparent'
              }}
            >
              <span>✓ Tamamlanan ({completedTasks})</span>
            </button>

            {/* Ders Filtreleri (Birden fazla ders varsa) */}
            {subjects.length > 1 && (
              <>
                <div style={{ width: 1, height: 18, background: 'var(--color-border)', margin: '0 4px' }} />
                {subjects.map(([subj, count]) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSelectedSubject(prev => prev === subj ? 'all' : subj)}
                    className="today-filter-chip"
                    style={{
                      background: selectedSubject === subj ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      color: selectedSubject === subj ? '#6366f1' : 'var(--color-text-muted)',
                      border: selectedSubject === subj ? '1.5px solid #6366f1' : '1px solid var(--color-border)'
                    }}
                  >
                    <span>{subj} ({count})</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Görev Listesi ── */}
        {filteredTasks.length > 0 ? (
          <div style={{ padding: '0.65rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(showAllDayTasks || !isMobile ? filteredTasks : filteredTasks.slice(0, 6)).map((task, idx) => {
              const isReadingTask = task.taskType === 'okuma' ||
                task.subject === 'Kitap Okuma' ||
                String(task.topic || '').toLowerCase().includes('kitap okuma') ||
                String(task.title || '').toLowerCase().includes('kitap okuma') ||
                String(task.taskType || '').toLowerCase().includes('okuma');
              const isQuizTask = !isReadingTask && Boolean(task.isAutoHomework || task.testId || task.hwId || task.roadmapAssignmentId);
              const cleanSubj = (task.subject && task.subject.toLowerCase() === 'geometri') ? 'Matematik' : (task.subject || 'Ders');
              const rowTheme = getRowTheme ? getRowTheme(cleanSubj, idx) : {};
              const isExamItem = task.isExamTask || task.taskType === 'deneme';

              const rawBook = (task.bookTitle || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();
              let displayTitle = (task.testName || task.title || task.topic || 'Ders Çalışması')
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
                if (task.testName && !/^(ödev|görev|test|sınav|kitap testi)$/i.test(task.testName.trim()) && task.testName.toLowerCase() !== rawBook.toLowerCase()) {
                  displayTitle = task.testName.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim();
                } else if (task.unitTopic) {
                  displayTitle = `${task.unitTopic} Testi`;
                } else if (task.isBookTask) {
                  displayTitle = task.testName || task.title || (rawBook ? `${rawBook} Testi` : 'Kitap Testi');
                } else if (task.subject) {
                  displayTitle = `${task.subject} Testi`;
                } else {
                  displayTitle = 'Konu Testi';
                }
              }

              let pageBadge = null;
              const pageMatch = displayTitle.match(/^(\d+(?:[-–]\d+)?\.\s*(?:Sayfa|s\.)|\s*s\.\s*\d+(?:[-–]\d+)?)\s*/i);
              if (pageMatch) {
                pageBadge = pageMatch[0].trim();
                displayTitle = displayTitle.substring(pageMatch[0].length).trim();
              }

              // Remedial Stage
              const stageMatch = (task.text || task.title || task.topic || '').match(/\[(\d+)\.\s*Tekrar(?:\s*[-–(]\s*(\d+)g\s*[)]?)?/i);
              const detectedStage = task.stage || (stageMatch ? parseInt(stageMatch[1], 10) : null);
              const detectedInterval = task.intervalDays || (stageMatch && stageMatch[2] ? parseInt(stageMatch[2], 10) : null);
              const isRemedialTask = Boolean(task.isRemedial || task.isRemedialTest || task.type === 'remedialTest' || task.taskType === 'remedialTest' || task.isTeacherRemedial || task.isSpacedRepetition || detectedStage);
              const syncAttemptNumber = task.attemptNumber || (detectedStage ? detectedStage : (task.pastAttemptCount != null ? task.pastAttemptCount + 1 : 1));

              const STAGE_THEMES = {
                1: { icon: '🌱', label: '1. Çözüm (İlk Çözüm)', bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.35)' },
                2: { icon: '🌿', label: '2. Çözüm (1. Tekrar)', bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.35)' },
                3: { icon: '🌳', label: '3. Çözüm (2. Tekrar)', bg: 'rgba(168, 85, 247, 0.12)', text: '#7c3aed', border: 'rgba(168, 85, 247, 0.35)' },
                4: { icon: '⚡', label: '4. Çözüm (3. Tekrar)', bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.35)' },
                5: { icon: '🏆', label: '5. Çözüm (Ustalaşıldı)', bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.35)' }
              };
              const currentTheme = STAGE_THEMES[syncAttemptNumber] || STAGE_THEMES[2];

              // Is this the immediate next target for the student today?
              const isNextTarget = dayProgramInfo.isToday && !task.done && (idx === firstIncompleteIdx);

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
                    borderLeft: `6px solid ${task.done ? '#10b981' : isNextTarget ? '#6366f1' : isExamItem ? '#e11d48' : (rowTheme.accent || '#6366f1')}`,
                    borderRadius: 18,
                    padding: isMobile ? '0.85rem 0.95rem' : '1rem 1.25rem',
                    cursor: 'pointer',
                    boxShadow: isNextTarget 
                      ? '0 0 0 2px rgba(99, 102, 241, 0.4), 0 8px 24px rgba(99, 102, 241, 0.18)' 
                      : '0 4px 16px rgba(0, 0, 0, 0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '0.75rem' : '1rem', flex: 1, minWidth: 0 }}>
                    {/* Checkbox / Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                      style={{
                        width: isMobile ? 32 : 36,
                        height: isMobile ? 32 : 36,
                        borderRadius: 12,
                        border: task.done ? 'none' : `2px solid ${isNextTarget ? '#6366f1' : (rowTheme.border || 'var(--color-border-input)')}`,
                        background: task.done ? 'linear-gradient(135deg, #10b981, #059669)' : (isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        cursor: 'pointer',
                        padding: 0,
                        marginTop: 2,
                        boxShadow: task.done ? '0 4px 12px rgba(16,185,129,0.45)' : '0 2px 6px rgba(0,0,0,0.06)',
                        transition: 'all 0.18s ease'
                      }}
                      title={task.done ? 'Görevi Tamamlandı olarak işaretledin' : 'Görevi Tamamlandı olarak işaretle'}
                    >
                      {task.done ? (
                        <Check size={18} color="#ffffff" strokeWidth={3.5} />
                      ) : isNextTarget ? (
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />
                      ) : (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'transparent' }} />
                      )}
                    </button>

                    {/* Task Details */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {/* Row 1: Badges & Next Target Indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {isNextTarget && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 900,
                            color: '#ffffff',
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            padding: '2px 8px',
                            borderRadius: 99,
                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <Zap size={11} fill="#ffffff" /> ŞİMDİKİ HEDEF
                          </span>
                        )}

                        {task.subject && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 900,
                            color: rowTheme.text || (isExamItem ? '#92400e' : '#6366f1'),
                            background: rowTheme.badgeBg || (isExamItem ? '#fef3c7' : 'rgba(99, 102, 241, 0.12)'),
                            border: `1px solid ${rowTheme.border || (isExamItem ? '#fde68a' : 'rgba(165, 180, 252, 0.35)')}`,
                            padding: '2px 8px',
                            borderRadius: 8,
                            flexShrink: 0
                          }}>
                            {cleanSubj}
                          </span>
                        )}

                        <span className="game-badge-xp" style={{ fontSize: '0.64rem', padding: '2px 6px' }}>
                          +{isExamItem || task.roadmapAssignmentId ? '50' : '25'} XP
                        </span>

                        {isRemedialTask && (
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 900,
                            color: currentTheme.text,
                            background: currentTheme.bg,
                            border: `1px solid ${currentTheme.border}`,
                            padding: '2px 7px',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            flexShrink: 0
                          }}>
                            <span>{currentTheme.icon}</span>
                            <span>{syncAttemptNumber}. Tekrar</span>
                          </span>
                        )}

                        {pageBadge && (
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-surface-hover)',
                            border: '1px solid var(--color-border)',
                            padding: '1px 6px',
                            borderRadius: 6,
                            flexShrink: 0
                          }}>
                            📄 {pageBadge}
                          </span>
                        )}

                        {task.questionCount && (
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            color: 'var(--color-text-muted)',
                            background: 'var(--color-surface-hover)',
                            padding: '1px 6px',
                            borderRadius: 6,
                            border: '1px solid var(--color-border)'
                          }}>
                            📝 {task.questionCount} Soru
                          </span>
                        )}
                      </div>

                      {/* Row 2: Title */}
                      <div style={{
                        fontSize: isMobile ? '0.92rem' : '1.02rem',
                        fontWeight: 800,
                        color: task.done ? 'var(--color-text-muted)' : 'var(--color-text)',
                        textDecoration: task.done ? 'line-through' : 'none',
                        wordBreak: 'break-word',
                        lineHeight: 1.35,
                        fontFamily: "'Outfit', sans-serif"
                      }}>
                        {displayTitle}
                      </div>

                      {/* Row 3: Meta Context Pill Ribbon */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        {task.bookTitle && !/^kitap$/i.test(task.bookTitle.trim()) && !/^takip kitabı$/i.test(task.bookTitle.trim()) && (
                          <span style={{
                            color: (task.roadmapAssignmentId || task.isRoadmapTask) ? '#7c3aed' : 'var(--color-text-secondary)',
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: isMobile ? 200 : 360,
                            background: (task.roadmapAssignmentId || task.isRoadmapTask) ? 'rgba(124, 58, 237, 0.12)' : 'var(--color-surface-hover)',
                            padding: '1px 7px',
                            borderRadius: 6,
                            border: (task.roadmapAssignmentId || task.isRoadmapTask) ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid var(--color-border)'
                          }}>
                            {(task.roadmapAssignmentId || task.isRoadmapTask) ? `🗺️ ${task.bookTitle}` : `📖 ${task.bookTitle}`}
                          </span>
                        )}
                        {task.unitTopic && (
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                            📌 {task.unitTopic}
                          </span>
                        )}
                        {(task.time || task.dueDateStr) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={11} /> {task.time || task.dueDateStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action Button */}
                  {task.done ? (
                    isReadingTask || !isQuizTask ? (
                      <span
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 900,
                          color: '#10b981',
                          background: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)',
                          border: '1.5px solid rgba(16, 185, 129, 0.4)',
                          padding: isMobile ? '0.45rem 0.75rem' : '0.55rem 0.95rem',
                          borderRadius: 12,
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        ✓ Bitti
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                        className="game-btn-3d"
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 900,
                          color: '#10b981',
                          background: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)',
                          border: '1.5px solid rgba(16, 185, 129, 0.4)',
                          padding: isMobile ? '0.45rem 0.75rem' : '0.55rem 0.95rem',
                          borderRadius: 12,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <Eye size={14} /> İncele
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
                            borderRadius: 12,
                            padding: isMobile ? '0.45rem 0.75rem' : '0.55rem 0.95rem',
                            fontSize: isMobile ? '0.72rem' : '0.76rem',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                          title={lockStatus.lockMessage}
                        >
                          <Lock size={13} color="#f59e0b" />
                          <span>{lockStatus.daysLeft === 1 ? 'Yarın Açılacak' : lockStatus.formattedDate}</span>
                        </button>
                      );
                    })()
                  ) : isQuizTask ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                      className="game-btn-3d game-btn-primary"
                      style={{
                        borderRadius: 14,
                        padding: isMobile ? '0.55rem 0.95rem' : '0.65rem 1.25rem',
                        fontSize: isMobile ? '0.82rem' : '0.88rem',
                        fontWeight: 900,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {isRemedialTask && syncAttemptNumber > 1 ? (
                        <>
                          <RotateCcw size={15} /> {`${syncAttemptNumber}. Tekrar`}
                        </>
                      ) : (
                        <>
                          <PlayCircle size={16} /> Başlat ⚔️
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
                        padding: isMobile ? '0.5rem 0.85rem' : '0.6rem 1.15rem',
                        fontSize: isMobile ? '0.78rem' : '0.84rem',
                        fontWeight: 900
                      }}
                    >
                      Tamamla ✓
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : totalTasks > 0 ? (
          /* Filtre sonucu boş */
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🔍</div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Seçilen filtreye uygun görev bulunamadı.</div>
            <button
              type="button"
              onClick={() => { setFilterStatus('all'); setSelectedSubject('all'); }}
              style={{
                marginTop: 8,
                background: 'none',
                border: 'none',
                color: '#6366f1',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.8rem',
                textDecoration: 'underline'
              }}
            >
              Tüm Görevleri Göster ({totalTasks})
            </button>
          </div>
        ) : (
          /* Hiç görev yok */
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>🎉</div>
            <div style={{ fontWeight: 900, color: '#10b981', fontSize: '1.1rem', marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>
              {dayProgramInfo.isToday
                ? 'Bugün için planlanan tüm görevler bitti veya henüz görev eklenmedi!'
                : `${dayProgramInfo.dayName} günü için kayıtlı görev bulunmuyor.`}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: 460, margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
              Harika bir disiplin! Kütüphaneden yeni testler çözebilir veya programına yeni ders hedefleri ekleyebilirsin.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              {onAddTask && (
                <button
                  type="button"
                  onClick={onAddTask}
                  className="game-btn-3d game-btn-primary"
                  style={{
                    borderRadius: 14,
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.85rem',
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
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.85rem',
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
          <div style={{ padding: '0.65rem 0.85rem', background: 'var(--color-surface)', borderTop: '1.5px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={() => setShowAllDayTasks && setShowAllDayTasks(prev => !prev)}
              style={{
                width: '100%',
                background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
                border: '1.5px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '0.85rem',
                padding: '0.65rem 1rem',
                color: isDark ? '#a5b4fc' : '#4f46e5',
                fontWeight: 900,
                fontSize: '0.82rem',
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
                  <span style={{ fontSize: '0.7rem', background: '#6366f1', color: 'white', padding: '1px 7px', borderRadius: 99, fontWeight: 900 }}>
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
            margin: '0.5rem 0.75rem 0.75rem',
            padding: '1.1rem 1.25rem',
            borderRadius: 16,
            background: isDark ? 'rgba(16, 185, 129, 0.12)' : 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                flexShrink: 0
              }}>
                🏆
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '0.98rem', color: '#059669', fontFamily: "'Outfit', sans-serif" }}>
                  Tebrikler! Bugünün Tüm Görevlerini Bitirdin!
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
                  +{earnedXp} XP kazandın • {completedQuestions} Soru tamamlandı. Harika bir gün!
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
                    borderRadius: 12,
                    padding: '0.55rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 900,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <BookOpen size={14} /> Kitapları Aç
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
});
