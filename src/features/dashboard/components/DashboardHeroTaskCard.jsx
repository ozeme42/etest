import React, { memo, useMemo } from 'react';
import { 
  Sparkles, 
  Flame, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  PlayCircle, 
  BookOpen, 
  Trophy, 
  Compass, 
  AlertTriangle,
  ChevronRight,
  Target
} from 'lucide-react';

const getDayDiff = (dueDate) => {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return null;
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

const getSubjectBadgeStyle = (subject) => {
  const s = String(subject || '').toLowerCase();
  if (s.includes('matematik')) {
    return { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6', label: 'Matematik' };
  }
  if (s.includes('türkçe') || s.includes('turkce')) {
    return { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b', label: 'Türkçe' };
  }
  if (s.includes('fen')) {
    return { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981', label: 'Fen Bilimleri' };
  }
  if (s.includes('sosyal') || s.includes('inkılap') || s.includes('tarih')) {
    return { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444', label: 'Sosyal Bilgiler' };
  }
  if (s.includes('ingilizce')) {
    return { bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)', color: '#a855f7', label: 'İngilizce' };
  }
  if (s.includes('din')) {
    return { bg: 'rgba(20, 184, 166, 0.12)', border: 'rgba(20, 184, 166, 0.3)', color: '#14b8a6', label: 'Din Kültürü' };
  }
  if (s.includes('okuma')) {
    return { bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.3)', color: '#ec4899', label: 'Kitap Okuma' };
  }
  return { bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.3)', color: '#6366f1', label: subject || 'Genel Görev' };
};

export default memo(function DashboardHeroTaskCard({
  isMobile = false,
  isDark = false,
  studentName = '',
  pendingTasks = [],
  dayTasks = [],
  catchUpTasks = [],
  onStartHomework,
  onStartDayTask,
  onViewAllTasks,
  onExploreBooks,
  onViewAnalytics
}) {
  // Determine the highest priority task
  const heroTask = useMemo(() => {
    // 1. Overdue homeworks
    const overdueHw = pendingTasks.find(t => {
      if (t.isDone || t.done) return false;
      const diff = getDayDiff(t.dueDateObj || t.dueDate);
      return diff !== null && diff < 0;
    });
    if (overdueHw) {
      return {
        task: overdueHw,
        type: 'overdue_hw',
        priorityLabel: 'Acil / Gecikmiş Ödev',
        priorityEmoji: '🔥',
        urgency: 'high',
        gradient: isDark
          ? 'linear-gradient(135deg, rgba(225, 29, 72, 0.22) 0%, rgba(15, 23, 42, 0.85) 100%)'
          : 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)',
        borderColor: isDark ? 'rgba(244, 63, 94, 0.45)' : 'rgba(254, 205, 211, 0.95)',
        badgeColor: '#e11d48',
        badgeBg: 'rgba(225, 29, 72, 0.12)'
      };
    }

    // 2. Catch-up tasks
    const activeCatchUp = (catchUpTasks || []).find(t => !t.done && !t.isDone);
    if (activeCatchUp) {
      return {
        task: activeCatchUp,
        type: 'catch_up',
        priorityLabel: 'Telafi Edilecek Görev',
        priorityEmoji: '⚡',
        urgency: 'high',
        gradient: isDark
          ? 'linear-gradient(135deg, rgba(234, 88, 12, 0.2) 0%, rgba(15, 23, 42, 0.85) 100%)'
          : 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)',
        borderColor: isDark ? 'rgba(249, 115, 22, 0.4)' : 'rgba(254, 215, 170, 0.95)',
        badgeColor: '#ea580c',
        badgeBg: 'rgba(234, 88, 12, 0.12)'
      };
    }

    // 3. Homeworks due today
    const todayHw = pendingTasks.find(t => {
      if (t.isDone || t.done) return false;
      const diff = getDayDiff(t.dueDateObj || t.dueDate);
      return diff === 0;
    });
    if (todayHw) {
      return {
        task: todayHw,
        type: 'today_hw',
        priorityLabel: 'Bugün Teslim Edilecek Ödev',
        priorityEmoji: '⏳',
        urgency: 'medium',
        gradient: isDark
          ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%)'
          : 'linear-gradient(135deg, #fefce8 0%, #ffffff 100%)',
        borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(254, 240, 138, 0.95)',
        badgeColor: '#d97706',
        badgeBg: 'rgba(217, 119, 6, 0.12)'
      };
    }

    // 4. Incomplete task from today's schedule
    const activeDayTask = (dayTasks || []).find(t => !t.done && !t.isDone && !t.completed);
    if (activeDayTask) {
      return {
        task: activeDayTask,
        type: 'day_task',
        priorityLabel: 'Sıradaki Günlük Çalışman',
        priorityEmoji: '🎯',
        urgency: 'normal',
        gradient: isDark
          ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.22) 0%, rgba(15, 23, 42, 0.85) 100%)'
          : 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
        borderColor: isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(187, 247, 208, 0.95)',
        badgeColor: '#4f46e5',
        badgeBg: 'rgba(79, 70, 229, 0.12)'
      };
    }

    // 5. Any other pending homework
    const nextHw = pendingTasks.find(t => !t.isDone && !t.done);
    if (nextHw) {
      return {
        task: nextHw,
        type: 'upcoming_hw',
        priorityLabel: 'Yaklaşan Ödev',
        priorityEmoji: '📋',
        urgency: 'normal',
        gradient: isDark
          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%)'
          : 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)',
        borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(199, 210, 254, 0.95)',
        badgeColor: '#6366f1',
        badgeBg: 'rgba(99, 102, 241, 0.12)'
      };
    }

    return null;
  }, [pendingTasks, dayTasks, catchUpTasks, isDark]);

  const firstName = studentName ? studentName.trim().split(' ')[0] : 'Öğrenci';

  // ── ALL TASKS COMPLETED STATE ──
  if (!heroTask) {
    return (
      <div
        className="sd-card"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.9) 100%)'
            : 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
          border: isDark ? '1.5px solid rgba(16, 185, 129, 0.35)' : '1.5px solid rgba(167, 243, 208, 0.9)',
          borderRadius: 20,
          padding: isMobile ? '1.25rem 1rem' : '1.6rem 2rem',
          boxShadow: isDark ? '0 8px 30px rgba(0, 0, 0, 0.3)' : '0 8px 24px rgba(16, 185, 129, 0.08)',
          marginBottom: '1.25rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 140,
          height: 140,
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: isMobile ? 48 : 56,
              height: isMobile ? 48 : 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '1.5rem' : '1.8rem',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)',
              flexShrink: 0
            }}>
              🏆
            </div>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '0.2rem 0.65rem',
                borderRadius: 99,
                fontSize: '0.72rem',
                fontWeight: 800,
                marginBottom: 4
              }}>
                <Sparkles size={12} /> Tüm Görevler Tamamlandı!
              </div>
              <h2 style={{
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                fontWeight: 900,
                color: 'var(--color-text)',
                margin: 0,
                letterSpacing: '-0.02em'
              }}>
                Tebrikler {firstName}, bugün harika bir iş çıkardın! 🎉
              </h2>
              <p style={{
                fontSize: '0.82rem',
                color: 'var(--color-text-muted)',
                margin: '4px 0 0',
                fontWeight: 600
              }}>
                Bugün için bekleyen zorunlu bir ödevin kalmadı. İstersen kitaplığından soru çözebilir veya serbest test yapabilirsin.
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'stretch' : 'flex-end',
            flexWrap: 'wrap'
          }}>
            {onExploreBooks && (
              <button
                type="button"
                onClick={onExploreBooks}
                className="sd-btn"
                style={{
                  flex: isMobile ? 1 : 'initial',
                  padding: '0.65rem 1.1rem',
                  borderRadius: 12,
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border)',
                  color: 'var(--color-text)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <BookOpen size={15} color="#10b981" /> Kitaplarıma Git
              </button>
            )}
            {onViewAnalytics && (
              <button
                type="button"
                onClick={onViewAnalytics}
                className="sd-btn"
                style={{
                  flex: isMobile ? 1 : 'initial',
                  padding: '0.65rem 1.1rem',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Trophy size={15} /> Gelişimimi Gör
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE HERO TASK CARD ──
  const { task, type, priorityLabel, priorityEmoji, urgency, gradient, borderColor, badgeColor, badgeBg } = heroTask;
  const isHomeworkType = type === 'overdue_hw' || type === 'today_hw' || type === 'upcoming_hw';

  const rawTitle = task.title || task.name || task.testName || task.topic || 'Öncelikli Çalışma Görevi';
  const rawBook = task.bookTitle || task.sourceBook || '';
  let cleanTitle = rawTitle;
  if (rawBook && cleanTitle.toLowerCase().includes(rawBook.toLowerCase())) {
    cleanTitle = cleanTitle.replace(rawBook, '').replace(/^[\s\—\-\:\/]+/, '').trim();
    if (!cleanTitle) cleanTitle = task.testName || rawTitle;
  }

  const subjectBadge = getSubjectBadgeStyle(task.subject || task.lesson);
  const questionCount = task.questionCount || task.qCount || task.targetQuestionCount || (task.questions ? task.questions.length : null);
  const diffDays = getDayDiff(task.dueDateObj || task.dueDate);

  const handleAction = () => {
    if (isHomeworkType && onStartHomework) {
      onStartHomework(task);
    } else if (onStartDayTask) {
      onStartDayTask(task);
    }
  };

  return (
    <div
      className="sd-card"
      style={{
        background: gradient,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 20,
        padding: isMobile ? '1.1rem 1rem' : '1.4rem 1.8rem',
        boxShadow: isDark
          ? '0 10px 30px rgba(0, 0, 0, 0.4)'
          : urgency === 'high'
          ? '0 10px 28px rgba(225, 29, 72, 0.08)'
          : '0 10px 28px rgba(99, 102, 241, 0.08)',
        marginBottom: '1.25rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: isMobile ? '1rem' : '1.5rem'
      }}>
        {/* Left / Main info area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top meta tags bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            {/* Priority Status Tag */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: badgeBg,
              color: badgeColor,
              border: `1px solid ${borderColor}`,
              padding: '0.22rem 0.65rem',
              borderRadius: 99,
              fontSize: '0.72rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <span>{priorityEmoji}</span>
              <span>{priorityLabel}</span>
            </div>

            {/* Subject Tag */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: subjectBadge.bg,
              color: subjectBadge.color,
              border: `1px solid ${subjectBadge.border}`,
              padding: '0.22rem 0.65rem',
              borderRadius: 99,
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {subjectBadge.label}
            </div>

            {/* Due date notice if applicable */}
            {diffDays !== null && (
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: diffDays < 0 ? '#ef4444' : diffDays === 0 ? '#d97706' : 'var(--color-text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3
              }}>
                <Clock size={12} />
                {diffDays < 0 
                  ? `${Math.abs(diffDays)} gün gecikti`
                  : diffDays === 0
                  ? 'Bugün teslim'
                  : `${diffDays} gün kaldı`}
              </div>
            )}
          </div>

          {/* Title and details */}
          <h2 style={{
            fontSize: isMobile ? '1.15rem' : '1.35rem',
            fontWeight: 900,
            color: 'var(--color-text)',
            margin: '0 0 0.35rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            wordBreak: 'break-word'
          }}>
            {cleanTitle}
          </h2>

          {/* Subtitle / Book or details */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            fontWeight: 600,
            flexWrap: 'wrap'
          }}>
            {rawBook && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <BookOpen size={13} color="var(--color-text-muted)" />
                <strong>{rawBook}</strong>
              </span>
            )}
            {questionCount && (
              <span style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                padding: '0.15rem 0.5rem',
                borderRadius: 6,
                fontSize: '0.74rem',
                fontWeight: 700
              }}>
                📝 {questionCount} Soru
              </span>
            )}
            <span style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              padding: '0.15rem 0.5rem',
              borderRadius: 6,
              fontSize: '0.74rem',
              fontWeight: 700
            }}>
              ⏱️ ~{Math.max(10, (questionCount || 10) * 1.5)} dk
            </span>
          </div>
        </div>

        {/* Right CTA actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          flexShrink: 0,
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'stretch' : 'flex-end'
        }}>
          {onViewAllTasks && !isMobile && (
            <button
              type="button"
              onClick={onViewAllTasks}
              className="sd-btn"
              style={{
                padding: '0.75rem 1.1rem',
                borderRadius: 14,
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              Tüm Liste <ChevronRight size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={handleAction}
            className="sd-btn"
            style={{
              flex: isMobile ? 1 : 'initial',
              minHeight: 48,
              padding: isMobile ? '0.75rem 1.25rem' : '0.8rem 1.6rem',
              borderRadius: 14,
              background: urgency === 'high'
                ? 'linear-gradient(135deg, #e11d48, #be123c)'
                : 'linear-gradient(135deg, #4f46e5, #4338ca)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: isMobile ? '0.92rem' : '0.98rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: urgency === 'high'
                ? '0 6px 20px rgba(225, 29, 72, 0.4)'
                : '0 6px 20px rgba(79, 70, 229, 0.4)'
            }}
          >
            <PlayCircle size={19} />
            <span>{isHomeworkType ? 'Ödeve Başla' : 'Hemen Başla'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});
