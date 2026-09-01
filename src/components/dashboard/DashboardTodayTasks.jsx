import React, { memo } from 'react';
import { Check, PlayCircle } from 'lucide-react';

export default memo(function DashboardTodayTasks({
  isMobile = false,
  isDark = false,
  activeDayConfig = {},
  dayProgramInfo = { items: [], isToday: true, totalCount: 0, completedCount: 0 },
  showAllDayTasks = false,
  setShowAllDayTasks,
  onToggleTask,
  onTaskClick,
  getRowTheme
}) {
  const headerGradient = dayProgramInfo.isToday
    ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
    : activeDayConfig?.color
    ? `linear-gradient(135deg, ${activeDayConfig.color}, #3b82f6)`
    : 'linear-gradient(135deg, #4f46e5, #6366f1)';

  return (
    <div>
      {/* ── RENKLİ BAŞLIK KARTI ── */}
      <div style={{
        background: headerGradient,
        borderRadius: '1.15rem 1.15rem 0 0',
        padding: isMobile ? '0.85rem 1rem' : '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
        color: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: isMobile ? 34 : 40,
            height: isMobile ? 34 : 40,
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.22)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '1.15rem' : '1.35rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {dayProgramInfo.isToday ? '🎯' : (activeDayConfig?.icon || '📅')}
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: isMobile ? '0.95rem' : '1.1rem',
              fontWeight: 900,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              {dayProgramInfo.isToday ? '🎯 Bugün Ne Yapacağım?' : `📅 ${dayProgramInfo.dayName} Görevleri`}
            </h3>
            {dayProgramInfo.fullDateLabel && (
              <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.88)', fontWeight: 700, marginTop: 2 }}>
                📌 {dayProgramInfo.fullDateLabel}
              </div>
            )}
          </div>
        </div>

        {dayProgramInfo.totalCount > 0 && (
          <span style={{
            fontSize: isMobile ? '0.72rem' : '0.78rem',
            fontWeight: 900,
            padding: '4px 12px',
            borderRadius: 99,
            background: dayProgramInfo.hasAllCompleted ? '#10b981' : 'rgba(255, 255, 255, 0.22)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {dayProgramInfo.hasAllCompleted ? '🎉 Tümü Tamamlandı!' : `${dayProgramInfo.completedCount} / ${dayProgramInfo.totalCount} Tamamlandı`}
          </span>
        )}
      </div>

      {/* ── BİRLEŞTİRİLMİŞ GÖREV LİSTESİ CONTAINER'I ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderTop: 'none',
        borderRadius: '0 0 1.15rem 1.15rem',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
      }}>
        {dayProgramInfo.items.length > 0 ? (
          <div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              maxHeight: isMobile ? 'none' : '420px',
              overflowY: isMobile ? 'visible' : 'auto',
              overscrollBehavior: 'contain'
            }}>
              {(showAllDayTasks || !isMobile ? dayProgramInfo.items : dayProgramInfo.items.slice(0, 5)).map((task, idx) => {
                const isQuizTask = task.isAutoHomework || task.testId || task.hwId || task.roadmapAssignmentId;
                const isLast = idx === (showAllDayTasks || !isMobile ? dayProgramInfo.items.length : Math.min(dayProgramInfo.items.length, 5)) - 1;
                const rowTheme = getRowTheme ? getRowTheme(task.subject, idx) : {};
                const isExamItem = task.isExamTask || task.taskType === 'deneme';

                const rawTitle = task.title || task.testName || task.topic || 'Ders Çalışması';
                const rawBook = task.bookTitle || '';
                let displayTitle = rawTitle
                  .replace(/^👨‍🏫\s*/, '')
                  .replace(/^\[\d+\.\s*Tekrar[^\]]*\]\s*/i, '')
                  .trim();
                if (rawBook && displayTitle.toLowerCase().includes(rawBook.toLowerCase())) {
                  displayTitle = displayTitle.replace(rawBook, '').replace(/^[\s\—\-\:\/]+/, '').trim();
                  if (!displayTitle) displayTitle = task.testName || rawTitle;
                }

                // 🎯 Remedial Repetition / Attempt Count Parsing (Synchronized with Quiz Runner)
                const stageMatch = (task.text || task.title || task.topic || '').match(/\[(\d+)\.\s*Tekrar(?:\s*[-–(]\s*(\d+)g\s*[)]?)?/i);
                const detectedStage = task.stage || (stageMatch ? parseInt(stageMatch[1], 10) : null);
                const detectedInterval = task.intervalDays || (stageMatch && stageMatch[2] ? parseInt(stageMatch[2], 10) : null);
                const isRemedialTask = Boolean(task.isRemedial || task.isRemedialTest || task.type === 'remedialTest' || task.taskType === 'remedialTest' || task.isTeacherRemedial || task.isSpacedRepetition || detectedStage);

                // Exact attempt count synchronized 1:1 with Quiz Runner
                const syncAttemptNumber = task.attemptNumber || (task.pastAttemptCount != null ? task.pastAttemptCount + 1 : (detectedStage ? detectedStage + 1 : (task.isRetake ? 2 : 1)));

                const STAGE_THEMES = {
                  1: { icon: '🌱', label: '1. Çözüm (İlk Çözüm)', bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.35)' },
                  2: { icon: '🌿', label: '2. Çözüm (1. Tekrar)', bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.35)' },
                  3: { icon: '🌳', label: '3. Çözüm (2. Tekrar)', bg: 'rgba(168, 85, 247, 0.12)', text: '#7c3aed', border: 'rgba(168, 85, 247, 0.35)' },
                  4: { icon: '⚡', label: '4. Çözüm (3. Tekrar)', bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.35)' },
                  5: { icon: '🏆', label: '5. Çözüm (Ustalaşıldı)', bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.35)' }
                };

                const currentTheme = STAGE_THEMES[syncAttemptNumber] || (syncAttemptNumber > 5 ? STAGE_THEMES[5] : STAGE_THEMES[2]);

                return (
                  <div
                    key={`${task.id || 'task'}_${idx}`}
                    onClick={() => onTaskClick && onTaskClick(task)}
                    className="hw-row"
                    style={{
                      background: task.done ? (isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)') : 'var(--color-surface)',
                      borderLeft: `5px solid ${task.done ? '#10b981' : isExamItem ? '#e11d48' : (rowTheme.accent || '#6366f1')}`,
                      borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                      padding: isMobile ? '0.75rem 0.85rem' : '0.85rem 1.15rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: isMobile ? '0.65rem' : '0.9rem',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.6rem' : '0.85rem', flex: 1, minWidth: 0 }}>
                      {/* Checkbox / Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                        style={{
                          width: isMobile ? 26 : 30,
                          height: isMobile ? 26 : 30,
                          borderRadius: '50%',
                          border: task.done ? 'none' : `2px solid ${rowTheme.border || 'var(--color-border-input)'}`,
                          background: task.done ? '#10b981' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          cursor: 'pointer',
                          padding: 0,
                          boxShadow: task.done ? '0 2px 6px rgba(16,185,129,0.3)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {task.done ? (
                          <Check size={14} color="#ffffff" strokeWidth={3} />
                        ) : (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'transparent' }} />
                        )}
                      </button>

                      {/* Task Details */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {task.subject && (
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: 900,
                              color: rowTheme.text || (isExamItem ? '#92400e' : '#6366f1'),
                              background: rowTheme.badgeBg || (isExamItem ? '#fef3c7' : 'rgba(99, 102, 241, 0.12)'),
                              border: `1px solid ${rowTheme.border || (isExamItem ? '#fde68a' : 'rgba(165, 180, 252, 0.35)')}`,
                              padding: '1px 6px',
                              borderRadius: 6,
                              flexShrink: 0
                            }}>
                              {task.subject}
                            </span>
                          )}
                          {isRemedialTask && (
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: 900,
                              color: currentTheme.text,
                              background: currentTheme.bg,
                              border: `1px solid ${currentTheme.border}`,
                              padding: '1px 7px',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              flexShrink: 0
                            }}>
                              <span>{currentTheme.icon}</span>
                              <span>
                                {syncAttemptNumber > 1
                                  ? `${syncAttemptNumber}. Çözüm ${detectedStage ? `(${detectedStage}. Tekrar)` : ''}`
                                  : '1. Çözüm (İlk Çözüm)'}
                              </span>
                              {detectedInterval && <span style={{ opacity: 0.85, fontSize: '0.6rem' }}>• {detectedInterval}g</span>}
                            </span>
                          )}
                          <span style={{
                            fontSize: isMobile ? '0.84rem' : '0.9rem',
                            fontWeight: 800,
                            color: task.done ? 'var(--color-text-muted)' : 'var(--color-text)',
                            textDecoration: task.done ? 'line-through' : 'none',
                            wordBreak: 'break-word',
                            lineHeight: 1.3
                          }}>
                            {displayTitle}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>
                          {task.bookTitle && (
                            <span style={{ color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 160 : 260 }}>
                              📖 {task.bookTitle}
                            </span>
                          )}
                          {task.unitTopic && !task.bookTitle && (
                            <span>📌 {task.unitTopic}</span>
                          )}
                          {task.questionCount && (
                            <span>• {task.questionCount}</span>
                          )}
                          {task.time && (
                            <span>• ⏰ {task.time}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Action */}
                    {task.done ? (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: 8,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        ✓ Tamam
                      </span>
                    ) : isQuizTask ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                        style={{
                          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          padding: isMobile ? '0.35rem 0.75rem' : '0.4rem 0.9rem',
                          fontSize: isMobile ? '0.75rem' : '0.8rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          flexShrink: 0,
                          boxShadow: '0 3px 10px rgba(79, 70, 229, 0.3)'
                        }}
                      >
                        <PlayCircle size={14} /> {syncAttemptNumber > 1 ? `${syncAttemptNumber}. Çözümü Yap` : 'Çöz'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                        style={{
                          background: 'var(--color-surface-hover)',
                          color: 'var(--color-text)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                          padding: isMobile ? '0.35rem 0.6rem' : '0.45rem 0.8rem',
                          fontSize: isMobile ? '0.72rem' : '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        Tamamla
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {isMobile && dayProgramInfo.items.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllDayTasks && setShowAllDayTasks(prev => !prev)}
                style={{
                  width: '100%',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: 'none',
                  borderTop: '1px solid var(--color-border)',
                  padding: '0.6rem 0.8rem',
                  color: '#6366f1',
                  fontWeight: 900,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                {showAllDayTasks ? (
                  <>▲ Daha Az Göster</>
                ) : (
                  <>▼ Diğer {dayProgramInfo.items.length - 5} Görevi Göster</>
                )}
              </button>
            )}
          </div>
        ) : (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 6 }}>🎉</div>
            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.92rem', marginBottom: 4 }}>
              {dayProgramInfo.isToday ? 'Bugün için planlanan tüm görevler bitti veya görev yok!' : `${dayProgramInfo.dayName} günü için kayıtlı görev bulunamadı.`}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Harika gidiyorsun! Haftalık programından yeni hedefler ekleyebilirsin.
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
