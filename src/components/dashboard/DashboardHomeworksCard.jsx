import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default memo(function DashboardHomeworksCard({
  isMobile = false,
  pendingCount = 0,
  pendingTasks = [],
  onHwClick,
  getRowTheme
}) {
  const navigate = useNavigate();
  const actualPendingCount = Array.isArray(pendingTasks) ? pendingTasks.length : (pendingCount || 0);

  const getHwDayDiff = (dueDate) => {
    if (!dueDate) return null;
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) return null;
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="sd-card" style={{
      padding: isMobile ? '0.95rem 0.85rem' : '1.35rem 1.6rem',
      borderRadius: 16,
      background: 'var(--color-surface)',
      border: '1.5px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', boxShadow: '0 3px 10px rgba(239,68,68,0.35)' }}>
            📋
          </div>
          <div>
            <h2 style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
              Ödevlerim & Görev Takibi
            </h2>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Öğretmeniniz veya koçunuz tarafından atanan ödevler
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/student/homeworks')}
          style={{
            background: actualPendingCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            color: actualPendingCount > 0 ? '#ef4444' : '#10b981',
            border: actualPendingCount > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 99,
            padding: '0.25rem 0.75rem',
            fontSize: '0.7rem',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          {actualPendingCount > 0 ? `${actualPendingCount} Bekleyen` : 'Tümü Bitti 🎉'}
          <ChevronRight size={12} />
        </button>
      </div>

      {pendingTasks.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16, border: '1px dashed var(--color-border-input, #cbd5e1)' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>🎉</div>
          <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.92rem', marginBottom: 4 }}>
            Henüz bekleyen ödeviniz yok!
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
            Öğretmeniniz veya koçunuz yeni ödev atadığında burada listelenecektir.
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          {pendingTasks.slice(0, 5).map((task, idx) => {
            const rowTheme = getRowTheme ? getRowTheme(task.subject, idx) : {};
            const isLast = idx === Math.min(pendingTasks.length, 5) - 1;

            const diffDays = getHwDayDiff(task.dueDateObj || task.dueDate);
            const isOverdue = !task.isDone && diffDays !== null && diffDays < 0;
            const isDueToday = !task.isDone && diffDays !== null && diffDays === 0;

            const rawTitle = task.title || task.name || task.testName || 'Ödev Görevi';
            const rawBook = task.bookTitle || '';
            let displayTitle = rawTitle;
            if (rawBook && displayTitle.toLowerCase().includes(rawBook.toLowerCase())) {
              displayTitle = displayTitle.replace(rawBook, '').replace(/^[\s\—\-\:\/]+/, '').trim();
              if (!displayTitle) displayTitle = task.testName || rawTitle;
            }

            const dueLabel = task.dueDateObj ? task.dueDateObj.toLocaleDateString('tr-TR') : (task.dueDate ? new Date(task.dueDate).toLocaleDateString('tr-TR') : '');

            return (
              <div
                key={task.id || idx}
                onClick={() => onHwClick && onHwClick(task)}
                className="hw-row"
                style={{
                  background: 'var(--color-surface)',
                  borderLeft: `4px solid ${task.isDone ? '#10b981' : isOverdue ? '#e11d48' : isDueToday ? '#f59e0b' : (rowTheme.accent || '#6366f1')}`,
                  borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                  padding: isMobile ? '0.65rem 0.75rem' : '0.85rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: isMobile ? '0.55rem' : '0.85rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.55rem' : '0.75rem', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: isMobile ? 28 : 34,
                    height: isMobile ? 28 : 34,
                    borderRadius: '50%',
                    background: task.isDone ? 'rgba(16,185,129,0.12)' : isOverdue ? 'rgba(225,29,72,0.1)' : isDueToday ? 'rgba(245,158,11,0.12)' : (rowTheme.badgeBg || 'var(--color-surface-hover)'),
                    color: task.isDone ? '#10b981' : isOverdue ? '#e11d48' : isDueToday ? '#f59e0b' : (rowTheme.accent || '#6366f1'),
                    border: `1.5px solid ${task.isDone ? 'rgba(16,185,129,0.3)' : isOverdue ? 'rgba(225,29,72,0.3)' : isDueToday ? 'rgba(245,158,11,0.3)' : (rowTheme.border || 'var(--color-border)')}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isMobile ? '0.78rem' : '0.95rem', fontWeight: 900, flexShrink: 0
                  }}>
                    {task.isDone ? '✓' : isOverdue ? '!' : isDueToday ? '⚡' : '⏳'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {task.subject && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          color: rowTheme.text || '#6366f1',
                          background: rowTheme.badgeBg || 'rgba(99, 102, 241, 0.12)',
                          border: `1px solid ${rowTheme.border || 'rgba(165, 180, 252, 0.35)'}`,
                          padding: '1px 6px',
                          borderRadius: 6,
                          flexShrink: 0
                        }}>
                          {task.subject}
                        </span>
                      )}
                      <span style={{
                        fontSize: isMobile ? '0.84rem' : '0.9rem',
                        fontWeight: 800,
                        color: task.isDone ? 'var(--color-text-muted)' : 'var(--color-text)',
                        textDecoration: task.isDone ? 'line-through' : 'none',
                        wordBreak: 'break-word',
                        lineHeight: 1.3
                      }}>
                        {displayTitle}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>
                      {task.bookTitle && (
                        <span style={{ color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 150 : 250 }}>
                          📖 {task.bookTitle}
                        </span>
                      )}
                      {task.questionCount && (
                        <span>• {task.questionCount}</span>
                      )}
                      {dueLabel && (
                        <span>• ⏰ {dueLabel}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: isMobile ? '0.35rem 0.75rem' : '0.45rem 0.95rem',
                    fontSize: isMobile ? '0.74rem' : '0.78rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                    boxShadow: '0 3px 10px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  Çöz <ChevronRight size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
