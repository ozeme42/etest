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
    <div className="game-card-elevated" style={{
      padding: isMobile ? '1rem 0.85rem' : '1.35rem 1.6rem',
      borderRadius: 22
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.95rem', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>
            📜
          </div>
          <div>
            <h2 style={{ fontSize: isMobile ? '0.98rem' : '1.1rem', fontWeight: 900, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
              Görev Panosu (Ödevlerim)
            </h2>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              Öğretmeniniz veya koçunuz tarafından verilen aktif görevler
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/student/homeworks')}
          className="game-btn-3d"
          style={{
            background: actualPendingCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            color: actualPendingCount > 0 ? '#ef4444' : '#10b981',
            border: actualPendingCount > 0 ? '1.5px solid rgba(239, 68, 68, 0.35)' : '1.5px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 99,
            padding: '0.3rem 0.85rem',
            fontSize: '0.72rem',
            fontWeight: 900
          }}
        >
          {actualPendingCount > 0 ? `🔥 ${actualPendingCount} Bekleyen` : 'Tümü Bitti 🎉'}
          <ChevronRight size={13} />
        </button>
      </div>

      {pendingTasks.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 18, border: '2px dashed var(--color-border-input, #cbd5e1)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>🏆</div>
          <div style={{ fontWeight: 900, color: '#10b981', fontSize: '0.95rem', marginBottom: 4 }}>
            Tüm ödev görevleri tamamlandı!
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600 }}>
            Harika iş! Öğretmeniniz yeni bir görev atadığında bildirim alacaksınız.
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}>
          {pendingTasks.slice(0, 5).map((task, idx) => {
            const rowTheme = getRowTheme ? getRowTheme(task.subject, idx) : {};
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
                className="game-quest-row"
                style={{
                  borderLeft: `5px solid ${task.isDone ? '#10b981' : isOverdue ? '#e11d48' : isDueToday ? '#f59e0b' : (rowTheme.accent || '#6366f1')}`,
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.65rem' : '0.85rem', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: isMobile ? 32 : 38,
                    height: isMobile ? 32 : 38,
                    borderRadius: 12,
                    background: task.isDone ? 'rgba(16,185,129,0.15)' : isOverdue ? 'rgba(225,29,72,0.15)' : isDueToday ? 'rgba(245,158,11,0.15)' : (rowTheme.badgeBg || 'var(--color-surface-hover)'),
                    color: task.isDone ? '#10b981' : isOverdue ? '#e11d48' : isDueToday ? '#f59e0b' : (rowTheme.accent || '#6366f1'),
                    border: `1.5px solid ${task.isDone ? 'rgba(16,185,129,0.4)' : isOverdue ? 'rgba(225,29,72,0.4)' : isDueToday ? 'rgba(245,158,11,0.4)' : (rowTheme.border || 'var(--color-border)')}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isMobile ? '0.85rem' : '1.05rem', fontWeight: 900, flexShrink: 0
                  }}>
                    {task.isDone ? '✓' : isOverdue ? '🔥' : isDueToday ? '⚡' : '📜'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {task.subject && (
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: 900,
                          color: rowTheme.text || '#6366f1',
                          background: rowTheme.badgeBg || 'rgba(99, 102, 241, 0.12)',
                          border: `1px solid ${rowTheme.border || 'rgba(165, 180, 252, 0.35)'}`,
                          padding: '1px 7px',
                          borderRadius: 8,
                          flexShrink: 0
                        }}>
                          {task.subject}
                        </span>
                      )}
                      <span className="game-badge-xp" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                        +30 XP
                      </span>
                      <span style={{
                        fontSize: isMobile ? '0.86rem' : '0.94rem',
                        fontWeight: 900,
                        color: task.isDone ? 'var(--color-text-muted)' : 'var(--color-text)',
                        textDecoration: task.isDone ? 'line-through' : 'none',
                        wordBreak: 'break-word',
                        lineHeight: 1.3
                      }}>
                        {displayTitle}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                      {task.bookTitle && (
                        <span style={{ color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 140 : 260 }}>
                          📖 {task.bookTitle}
                        </span>
                      )}
                      {task.questionCount && (
                        <span>• 🎯 {task.questionCount} Soru</span>
                      )}
                      {dueLabel && (
                        <span style={{ color: isOverdue ? '#ef4444' : isDueToday ? '#f59e0b' : 'inherit' }}>
                          • ⏱️ {dueLabel} {isOverdue && '(Gecikti!)'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="game-btn-3d game-btn-primary"
                  style={{
                    borderRadius: 12,
                    padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1.15rem',
                    fontSize: isMobile ? '0.78rem' : '0.84rem'
                  }}
                >
                  Görevi Çöz <ChevronRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
