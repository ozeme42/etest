import React, { memo, useState } from 'react';
import { Check, PlayCircle, RotateCcw, AlertTriangle, Sparkles, ChevronDown, ChevronUp, Flame, CheckCircle2, BookOpen, Compass, FileText, BarChart3, Calendar, Eye, Lock, Plus } from 'lucide-react';
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
  onAddTask
}) {
  const [isCatchUpExpanded, setIsCatchUpExpanded] = useState(false);

  const headerGradient = dayProgramInfo.isToday
    ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
    : activeDayConfig?.color
    ? `linear-gradient(135deg, ${activeDayConfig.color}, #3b82f6)`
    : 'linear-gradient(135deg, #4f46e5, #6366f1)';

  const hasCatchUp = Array.isArray(catchUpTasks) && catchUpTasks.length > 0;

  // Category Icon & Badge Resolver for Catch-Up Items
  const getCatchUpCategoryBadge = (task) => {
    if (task.categoryType === 'yol_haritasi' || task.isRoadmapTask || task.roadmapAssignmentId) {
      return { label: '🗺️ Yol Haritası', bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', border: 'rgba(124, 58, 237, 0.3)' };
    }
    if (task.categoryType === 'kitap' || task.isBookTask || task.bookTestId || (task.testId && task.bookId)) {
      return { label: '📚 Kitap Takibi', bg: 'rgba(5, 150, 105, 0.12)', color: '#059669', border: 'rgba(5, 150, 105, 0.3)' };
    }
    if (task.categoryType === 'deneme' || task.isExamTask || task.type === 'physicalExam') {
      return { label: '📊 Deneme Sınavı', bg: 'rgba(225, 29, 72, 0.12)', color: '#e11d48', border: 'rgba(225, 29, 72, 0.3)' };
    }
    if (task.categoryType === 'program') {
      return { label: '📅 Program Görevi', bg: 'rgba(79, 70, 229, 0.12)', color: '#4f46e5', border: 'rgba(79, 70, 229, 0.3)' };
    }
    return { label: '📝 Ödev', bg: 'rgba(217, 119, 6, 0.12)', color: '#d97706', border: 'rgba(217, 119, 6, 0.3)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ═══════════════════════════════════════════════════
          BÖLÜM 1: 🎯 BUGÜNÜN ODAK GÖREVLERİ (SADE & NET)
          ═══════════════════════════════════════════════════ */}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {onAddTask && (
              <button
                type="button"
                onClick={onAddTask}
                style={{
                  background: 'rgba(255, 255, 255, 0.22)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: '#ffffff',
                  borderRadius: 99,
                  padding: isMobile ? '3px 9px' : '4px 12px',
                  fontSize: isMobile ? '0.7rem' : '0.76rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Plus size={12} strokeWidth={2.5} /> {isMobile ? 'Ekle' : 'Görev Ekle'}
              </button>
            )}
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

                  // 🎯 Remedial Repetition / Attempt Count Parsing (Synchronized with Quiz Runner)
                  const stageMatch = (task.text || task.title || task.topic || '').match(/\[(\d+)\.\s*Tekrar(?:\s*[-–(]\s*(\d+)g\s*[)]?)?/i);
                  const detectedStage = task.stage || (stageMatch ? parseInt(stageMatch[1], 10) : null);
                  const detectedInterval = task.intervalDays || (stageMatch && stageMatch[2] ? parseInt(stageMatch[2], 10) : null);
                  const isRemedialTask = Boolean(task.isRemedial || task.isRemedialTest || task.type === 'remedialTest' || task.taskType === 'remedialTest' || task.isTeacherRemedial || task.isSpacedRepetition || detectedStage);

                  // Exact attempt count synchronized 1:1 with Quiz Runner
                  const syncAttemptNumber = task.attemptNumber || (detectedStage ? detectedStage : (task.pastAttemptCount != null ? task.pastAttemptCount + 1 : 1));

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
                        borderLeft: `4px solid ${task.done ? '#10b981' : isExamItem ? '#e11d48' : (rowTheme.accent || '#6366f1')}`,
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
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '0.65rem' : '0.85rem', flex: 1, minWidth: 0 }}>
                        {/* Checkbox / Toggle Button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                          style={{
                            width: isMobile ? 26 : 28,
                            height: isMobile ? 26 : 28,
                            borderRadius: '50%',
                            border: task.done ? 'none' : `2px solid ${rowTheme.border || 'var(--color-border-input)'}`,
                            background: task.done ? '#10b981' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            cursor: 'pointer',
                            padding: 0,
                            marginTop: 2,
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
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {/* Row 1: Badges + Title */}
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
                                    ? `${syncAttemptNumber}. Çözüm (${detectedStage || (syncAttemptNumber - 1)}. Tekrar)`
                                    : '1. Çözüm (İlk Çözüm)'}
                                </span>
                                {detectedInterval !== null && detectedInterval !== undefined && (
                                  <span style={{ opacity: 0.85, fontSize: '0.6rem' }}>
                                    • {detectedInterval === 0 ? 'Bugün' : `${detectedInterval}g`}
                                  </span>
                                )}
                              </span>
                            )}
                            {pageBadge && (
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: 'var(--color-text-secondary)',
                                background: 'var(--color-surface-hover)',
                                border: '1px solid var(--color-border)',
                                padding: '1px 5px',
                                borderRadius: 5,
                                flexShrink: 0
                              }}>
                                📄 {pageBadge}
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

                          {/* Row 2: Clean Meta Pill Ribbon */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            {task.bookTitle && !/^kitap$/i.test(task.bookTitle.trim()) && !/^takip kitabı$/i.test(task.bookTitle.trim()) && (
                              <span style={{
                                color: 'var(--color-text-secondary)',
                                fontWeight: 700,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: isMobile ? 190 : 320,
                                background: 'var(--color-surface-hover)',
                                padding: '1px 6px',
                                borderRadius: 5,
                                border: '1px solid var(--color-border)'
                              }}>
                                📖 {task.bookTitle}
                              </span>
                            )}
                            {task.unitTopic && (
                              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                                📌 {task.unitTopic}
                              </span>
                            )}
                            {task.questionCount && (
                              <span style={{ background: 'var(--color-surface-hover)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                                {task.questionCount} Soru
                              </span>
                            )}
                            {(task.time || task.dueDateStr) && (
                              <span style={{ color: 'var(--color-text-muted)' }}>
                                ⏰ {task.time || task.dueDateStr}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action */}
                      {task.done ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            color: '#10b981',
                            background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: isMobile ? '0.35rem 0.65rem' : '0.4rem 0.8rem',
                            borderRadius: 8,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Eye size={13} /> ✓ Tamamlandı • İncele
                        </button>
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
                                background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
                                color: isDark ? '#94a3b8' : '#64748b',
                                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: isMobile ? '0.35rem 0.65rem' : '0.4rem 0.85rem',
                                fontSize: isMobile ? '0.72rem' : '0.76rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                flexShrink: 0
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
                          style={{
                            background: (isRemedialTask && syncAttemptNumber > 1)
                              ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                              : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            padding: isMobile ? '0.4rem 0.8rem' : '0.45rem 1rem',
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
                          {isRemedialTask && syncAttemptNumber > 1 ? (
                            <>
                              <RotateCcw size={14} /> {`${syncAttemptNumber}. Çözümü Yap`}
                            </>
                          ) : (
                            <>
                              <PlayCircle size={14} /> Çöz
                            </>
                          )}
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
                            padding: isMobile ? '0.4rem 0.65rem' : '0.45rem 0.8rem',
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
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.08)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {showAllDayTasks ? (
                      <>
                        <ChevronUp size={16} />
                        <span>Daha Az Göster (İlk 5 Görev)</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        <span>Diğer {dayProgramInfo.items.length - 5} Görevi Göster</span>
                        <span style={{ fontSize: '0.7rem', background: '#6366f1', color: 'white', padding: '1px 7px', borderRadius: 99, fontWeight: 900 }}>
                          +{dayProgramInfo.items.length - 5}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>🎉</div>
              <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.92rem', marginBottom: 3 }}>
                {dayProgramInfo.isToday ? 'Bugün için planlanan tüm görevler bitti veya görev yok!' : `${dayProgramInfo.dayName} günü için kayıtlı görev bulunamadı.`}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: onAddTask ? 12 : 0 }}>
                Harika gidiyorsun! Haftalık programından yeni hedefler ekleyebilirsin.
              </div>
              {onAddTask && (
                <button
                  type="button"
                  onClick={onAddTask}
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: 99,
                    padding: '0.45rem 1.1rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={14} strokeWidth={2.5} /> Hedef / Görev Ekle
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          BÖLÜM 2: 🔥 EKSİKLERİ TAMAMLA & AKILLI TELAFİ HAVUZU
          (Kitap Takibi, Yol Haritası, Sınavlar, Ödevler, Program)
          ═══════════════════════════════════════════════════ */}
      <div style={{
        background: 'var(--color-surface)',
        border: hasCatchUp ? '1.5px solid rgba(245, 158, 11, 0.45)' : '1.5px solid var(--color-border)',
        borderRadius: '1.15rem',
        overflow: 'hidden',
        boxShadow: hasCatchUp ? '0 4px 16px rgba(245, 158, 11, 0.08)' : '0 4px 16px rgba(0, 0, 0, 0.03)'
      }}>
        {/* Header */}
        <div
          onClick={() => setIsCatchUpExpanded(prev => !prev)}
          style={{
            background: hasCatchUp 
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(239, 68, 68, 0.12))'
              : (isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)'),
            borderBottom: isCatchUpExpanded ? (hasCatchUp ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid var(--color-border)') : 'none',
            padding: isMobile ? '0.75rem 1rem' : '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: hasCatchUp ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              flexShrink: 0,
              boxShadow: hasCatchUp ? '0 2px 8px rgba(239, 68, 68, 0.25)' : '0 2px 8px rgba(16, 185, 129, 0.25)'
            }}>
              {hasCatchUp ? '🔥' : '✨'}
            </div>
            <div>
              <h4 style={{
                margin: 0,
                fontSize: isMobile ? '0.88rem' : '0.98rem',
                fontWeight: 900,
                color: 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                Akıllı Telafi Havuzu (Eksikleri Kapat)
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: hasCatchUp ? '#ef4444' : '#10b981',
                  color: '#ffffff',
                  boxShadow: hasCatchUp ? '0 2px 6px rgba(239, 68, 68, 0.3)' : '0 2px 6px rgba(16, 185, 129, 0.3)'
                }}>
                  {hasCatchUp ? `${catchUpTasks.length} Geciken Görev` : '0 Eksik • Tam'}
                </span>
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {hasCatchUp 
                  ? 'Kitap takibi, yol haritası, deneme sınavı ve haftalık programdan kalan eksikleri tamamla!'
                  : 'Tebrikler! Geciken hiçbir görevin yok, tüm hedeflerin zamanında ilerliyor.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: hasCatchUp ? '#f59e0b' : '#10b981', fontWeight: 800, fontSize: '0.78rem' }}>
            <span>{isCatchUpExpanded ? 'Gizle' : 'Göster'}</span>
            {isCatchUpExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {/* Catch-Up Task Items */}
        {isCatchUpExpanded && (
          <div>
            {hasCatchUp ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                maxHeight: isMobile ? 'none' : '380px',
                overflowY: isMobile ? 'visible' : 'auto'
              }}>
                {catchUpTasks.map((task, cIdx) => {
                  const isLast = cIdx === catchUpTasks.length - 1;
                  const isQuizTask = task.isAutoHomework || task.testId || task.hwId || task.roadmapAssignmentId;
                  const rowTheme = getRowTheme ? getRowTheme(task.subject, cIdx) : {};
                  const catBadge = getCatchUpCategoryBadge(task);
                  const rawBook = (task.bookTitle || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();
                  let displayTitle = (task.testName || task.title || task.topic || 'Telafi Görevi')
                    .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
                    .replace(/\s*\(Tüm Kitap\)/gi, '')
                    .replace(/\s*\(Kendi Eklediğim\)/gi, '')
                    .replace(/\s*\(Görev\)/gi, '')
                    .trim();

                  if (rawBook && displayTitle.toLowerCase().includes(rawBook.toLowerCase())) {
                    displayTitle = displayTitle.replace(new RegExp(rawBook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/^[\s\—\-\:\/]+/, '').trim();
                  }

                  if (!displayTitle || /^(ödev|görev|test|sınav|kitap testi|telafi görevi)$/i.test(displayTitle.trim()) || (rawBook && displayTitle.toLowerCase() === rawBook.toLowerCase())) {
                    if (task.testName && !/^(ödev|görev|test|sınav|kitap testi)$/i.test(task.testName.trim()) && task.testName.toLowerCase() !== rawBook.toLowerCase()) {
                      displayTitle = task.testName.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim();
                    } else if (task.unitTopic) {
                      displayTitle = `${task.unitTopic} Testi`;
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

                  return (
                    <div
                      key={`catchup_${task.id || task.hwId || cIdx}`}
                      onClick={() => onTaskClick && onTaskClick(task)}
                      className="hw-row"
                      style={{
                        padding: isMobile ? '0.75rem 0.85rem' : '0.85rem 1.15rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: isMobile ? '0.65rem' : '0.9rem',
                        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        borderLeft: `4px solid ${rowTheme.accent || '#f59e0b'}`,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '0.65rem' : '0.85rem', flex: 1, minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onToggleTask && onToggleTask(task); }}
                          style={{
                            width: isMobile ? 26 : 28,
                            height: isMobile ? 26 : 28,
                            borderRadius: '50%',
                            border: `2px solid ${rowTheme.border || 'rgba(245, 158, 11, 0.6)'}`,
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            cursor: 'pointer',
                            padding: 0,
                            marginTop: 2
                          }}
                          title="Tamamlandı olarak işaretle"
                        >
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'transparent' }} />
                        </button>

                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {task.subject && (
                              <span style={{
                                fontSize: '0.64rem',
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
                              fontSize: '0.62rem',
                              fontWeight: 900,
                              color: '#dc2626',
                              background: '#fef2f2',
                              border: '1px solid #fecdd3',
                              padding: '1px 6px',
                              borderRadius: 6,
                              flexShrink: 0
                            }}>
                              ⚠️ Gecikti
                            </span>
                            {pageBadge && (
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: 'var(--color-text-secondary)',
                                background: 'var(--color-surface-hover)',
                                border: '1px solid var(--color-border)',
                                padding: '1px 5px',
                                borderRadius: 5,
                                flexShrink: 0
                              }}>
                                📄 {pageBadge}
                              </span>
                            )}
                            <span style={{
                              fontSize: isMobile ? '0.84rem' : '0.9rem',
                              fontWeight: 800,
                              color: 'var(--color-text)',
                              wordBreak: 'break-word',
                              lineHeight: 1.3
                            }}>
                              {displayTitle}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            {task.bookTitle && !/^kitap$/i.test(task.bookTitle.trim()) && !/^takip kitabı$/i.test(task.bookTitle.trim()) && (
                              <span style={{
                                color: 'var(--color-text-secondary)',
                                fontWeight: 700,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: isMobile ? 190 : 320,
                                background: 'var(--color-surface-hover)',
                                padding: '1px 6px',
                                borderRadius: 5,
                                border: '1px solid var(--color-border)'
                              }}>
                                📖 {task.bookTitle}
                              </span>
                            )}
                            {task.unitTopic && (
                              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                                📌 {task.unitTopic}
                              </span>
                            )}
                            {task.questionCount && (
                              <span style={{ background: 'var(--color-surface-hover)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                                {String(task.questionCount).replace(/\s*soru\s*$/i, '')} Soru
                              </span>
                            )}
                            {(task.time || task.dueDateStr) && (
                              <span style={{ color: 'var(--color-text-muted)' }}>
                                ⏰ {task.time || `Hedef: ${task.dueDateStr}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {task.roadmapAssignmentId ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                            style={{
                              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
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
                              boxShadow: '0 3px 10px rgba(124, 58, 237, 0.3)'
                            }}
                          >
                            <Compass size={13} /> Haritaya Git
                          </button>
                        ) : isQuizTask ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onTaskClick && onTaskClick(task); }}
                            style={{
                              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
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
                              boxShadow: '0 3px 10px rgba(99, 102, 241, 0.3)'
                            }}
                          >
                            <PlayCircle size={13} /> Çözmeye Başla
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
                              padding: isMobile ? '0.35rem 0.6rem' : '0.45rem 0.75rem',
                              fontSize: isMobile ? '0.72rem' : '0.76rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Tamamla
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text)' }}>
                <CheckCircle2 size={24} color="#10b981" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  <strong style={{ color: '#10b981' }}>Eksiksiz İlerleme:</strong> Kitap takibi, yol haritası veya haftalık programında gecikmiş hiçbir görevin bulunmuyor. Harikasın!
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
});
