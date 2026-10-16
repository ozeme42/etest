import React from 'react';
import {
  Play, Pause, RotateCcw, CheckCircle2,
  BookOpen, Clock, Target, Plus, Minus,
  ListTodo, Check, Sparkles, ChevronRight, X,
  FileText, Zap, Flame, Compass
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { STUDY_SUBJECTS, formatSecToMinSec } from '../constants/studyRoomConstants';

export default function StudyHeroCard({
  themeObj,
  isMobile,
  activeStudyMode,
  handleSwitchMasterMode,
  selectedTask,
  onOpenTaskPicker,
  onClearTask,
  selectedSubject,
  handleSelectSubject,
  minutesPerQuestion,
  setMinutesPerQuestion,
  targetGoalCount,
  handleSetNewTargetGoal,
  currentProgressCount,
  handleIncrementProgress,
  handleDecrementProgress,
  isRunning,
  handleToggleTimer,
  handleResetTimer,
  handleConfirmFinish,
  displayTimerText,
  timerStatusLabel,
  timerStatusColor,
  progressPercentage,
  activeQuote,
  onNextQuote,
  // Pomodoro specifics
  pomodoroMode,
  handleSelectPomodoroMode,
  completedCycles,
  currentTree,
  // Optical toggle
  activeToolTab,
  setActiveToolTab,
  opticalAnswerCount,
  hasAnswerKey,
  isSelectedTaskOpenEnded,
  // New props for focused view & daily program integration
  todayPendingTasks = [],
  onSelectTodayTask,
  onToggleZenMode
}) {
  return (
    <div style={{
      background: themeObj.cardBg,
      border: `1.5px solid ${themeObj.border}`,
      borderRadius: isMobile ? 22 : 28,
      padding: isMobile ? '1.15rem 1rem' : '1.85rem 2.2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '1.1rem' : '1.35rem',
      boxShadow: themeObj.isDark
        ? '0 24px 48px -12px rgba(0, 0, 0, 0.65), 0 0 1px 1px rgba(255, 255, 255, 0.06)'
        : '0 20px 45px -12px rgba(99, 102, 241, 0.12), 0 2px 6px rgba(0, 0, 0, 0.03)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    }}>
      {/* 1. MOD SEÇİCİ SEGMENLER (HAP BUTONLAR) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
        background: themeObj.innerBg,
        padding: 5,
        borderRadius: 18,
        border: `1.5px solid ${themeObj.border}`
      }}>
        {[
          { id: 'question', label: 'Soru Çözümü', icon: '✏️' },
          { id: 'pomodoro', label: 'Pomodoro', icon: '⏳' },
          { id: 'stopwatch', label: 'Kronometre', icon: '⏱️' }
        ].map(m => {
          const isActive = activeStudyMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => handleSwitchMasterMode(m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: isMobile ? '0.6rem 0.4rem' : '0.7rem 0.85rem',
                borderRadius: 14,
                border: 'none',
                background: isActive ? (themeObj.accentGradient || themeObj.accent) : 'transparent',
                color: isActive ? '#ffffff' : themeObj.subText,
                fontWeight: 900,
                fontFamily: "'Outfit', sans-serif",
                fontSize: isMobile ? '0.8rem' : '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isActive ? `0 4px 14px ${themeObj.accent}45` : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. AKTİF GÖREV VEYA BUGÜNKÜ GÖREVLER BENTO ALANI */}
      {!selectedTask ? (
        <div style={{
          background: themeObj.innerBg,
          borderRadius: 20,
          padding: isMobile ? '0.9rem' : '1.15rem 1.25rem',
          border: `1.5px solid ${themeObj.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
                flexShrink: 0
              }}>
                <Compass size={18} />
              </div>
              <div>
                <div style={{
                  fontSize: isMobile ? '0.86rem' : '0.95rem',
                  fontWeight: 900,
                  fontFamily: "'Outfit', sans-serif",
                  color: themeObj.text
                }}>
                  Bugünün Programındaki Görevlerin:
                </div>
                <div style={{ fontSize: '0.7rem', color: themeObj.subText, fontWeight: 700 }}>
                  {todayPendingTasks.length > 0
                    ? `${todayPendingTasks.length} planlı görev bekliyor • 1 tıkla seans başlat`
                    : 'Bugün için atanmış bekleyen görev bulunamadı'}
                </div>
              </div>
            </div>

            <button
              onClick={onOpenTaskPicker}
              style={{
                background: themeObj.isDark ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff',
                border: '1.5px solid rgba(99, 102, 241, 0.4)',
                color: '#6366f1',
                borderRadius: 12,
                padding: '0.45rem 0.85rem',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s'
              }}
              className="hover:scale-105 active:scale-95"
            >
              <BookOpen size={14} />
              <span>Tüm Havuzdan Seç</span>
            </button>
          </div>

          {/* Bugünkü Görev Kartları */}
          {todayPendingTasks.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 8,
              marginTop: 2
            }}>
              {todayPendingTasks.slice(0, 4).map((t, idx) => (
                <div
                  key={t.id || idx}
                  onClick={() => onSelectTodayTask ? onSelectTodayTask(t) : onOpenTaskPicker()}
                  style={{
                    background: themeObj.cardBg,
                    border: `1.5px solid ${themeObj.border}`,
                    borderRadius: 14,
                    padding: '0.65rem 0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  className="hover:border-indigo-500 hover:shadow-md hover:scale-[1.02] active:scale-95"
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.82rem',
                      fontWeight: 900,
                      fontFamily: "'Outfit', sans-serif",
                      color: themeObj.text,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {t.title || t.topic || 'Ders Görevi'}
                    </div>
                    <div style={{
                      fontSize: '0.68rem',
                      color: themeObj.subText,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: 2
                    }}>
                      <span style={{ color: '#4f46e5', fontWeight: 800 }}>{t.subject || 'Ders'}</span>
                      <span>•</span>
                      <span>{t.questionCount || 20} Soru</span>
                      <span>•</span>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>+50 XP</span>
                    </div>
                  </div>
                  <ChevronRight size={15} color="#6366f1" style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* SEÇİLİ GÖREV BANDI */
        <div style={{
          background: themeObj.innerBg,
          borderRadius: 18,
          padding: isMobile ? '0.75rem 0.9rem' : '0.85rem 1.25rem',
          border: `1.5px solid ${themeObj.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: '0 3px 12px rgba(79, 70, 229, 0.35)',
              flexShrink: 0
            }}>
              📖
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: isMobile ? '0.88rem' : '0.98rem',
                fontWeight: 900,
                fontFamily: "'Outfit', sans-serif",
                color: themeObj.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {selectedTask.title || selectedTask.name || 'Seçili Test'}
              </div>
              <div style={{
                fontSize: '0.72rem',
                color: themeObj.subText,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 2
              }}>
                <span style={{ color: '#4f46e5', fontWeight: 800 }}>{selectedSubject}</span>
                <span>•</span>
                <span>{targetGoalCount} Soru</span>
                {selectedTask.sourceLabel && <span>• {selectedTask.sourceLabel}</span>}
                <span>•</span>
                <span style={{ color: '#10b981', fontWeight: 800 }}>⚡ +50 XP</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <button
              onClick={onClearTask}
              title="Görevi Kaldır (Serbest Çalışmaya Geç)"
              style={{
                background: 'transparent',
                border: `1.5px solid ${themeObj.border}`,
                color: themeObj.subText,
                borderRadius: 11,
                padding: '0.45rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className="hover:text-red-500 hover:border-red-400"
            >
              <X size={15} />
            </button>

            <button
              onClick={onOpenTaskPicker}
              style={{
                background: themeObj.buttonBg,
                border: `1.5px solid ${themeObj.border}`,
                color: themeObj.text,
                borderRadius: 11,
                padding: isMobile ? '0.45rem 0.75rem' : '0.5rem 0.95rem',
                fontSize: isMobile ? '0.76rem' : '0.82rem',
                fontWeight: 800,
                fontFamily: "'Outfit', sans-serif",
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s'
              }}
              className="hover:scale-105 active:scale-95"
            >
              <BookOpen size={14} />
              <span>Değiştir</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. MERKEZ DİJİTAL SAYAÇ & İLERLEME ÇUBUĞU */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '0.65rem 0' : '1.1rem 0',
        position: 'relative'
      }}>
        {/* Durum Rozeti */}
        <div style={{
          background: isRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
          color: isRunning ? '#10b981' : themeObj.subText,
          border: `1.5px solid ${isRunning ? 'rgba(16, 185, 129, 0.35)' : 'rgba(148, 163, 184, 0.25)'}`,
          padding: '0.28rem 0.85rem',
          borderRadius: 99,
          fontSize: '0.75rem',
          fontWeight: 900,
          fontFamily: "'Outfit', sans-serif",
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 6,
          boxShadow: isRunning ? '0 0 14px rgba(16, 185, 129, 0.25)' : 'none'
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isRunning ? '#10b981' : '#94a3b8',
            boxShadow: isRunning ? '0 0 10px #10b981' : 'none'
          }} />
          <span>{timerStatusLabel}</span>
        </div>

        {/* Büyük Dijital Süre Metni */}
        <div style={{
          fontSize: isMobile ? '3.8rem' : '5rem',
          fontWeight: 900,
          fontFamily: "'Outfit', sans-serif",
          letterSpacing: '-0.035em',
          fontVariantNumeric: 'tabular-nums',
          color: themeObj.text,
          lineHeight: 1,
          textShadow: isRunning ? `0 0 35px ${themeObj.accent}35` : 'none',
          userSelect: 'none',
          margin: '0.4rem 0'
        }}>
          {displayTimerText}
        </div>

        {/* İlerleme Çubuğu */}
        <div style={{
          width: '100%',
          maxWidth: 440,
          height: 8,
          borderRadius: 99,
          background: themeObj.innerBg,
          overflow: 'hidden',
          marginTop: 10,
          border: `1px solid ${themeObj.border}`
        }}>
          <div style={{
            width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
            height: '100%',
            background: themeObj.accentGradient || themeObj.accent,
            borderRadius: 99,
            transition: 'width 0.4s ease'
          }} />
        </div>

        {/* Motivasyon Sözü & Zen Odak Butonu */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginTop: 14
        }}>
          {activeQuote && (
            <div
              onClick={onNextQuote}
              title="Sözü Değiştir (Tıkla)"
              style={{
                fontSize: isMobile ? '0.74rem' : '0.82rem',
                color: themeObj.subText,
                fontStyle: 'italic',
                textAlign: 'center',
                cursor: 'pointer',
                maxWidth: 440,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5
              }}
            >
              <span>“{activeQuote}”</span>
              <Sparkles size={12} style={{ opacity: 0.7 }} />
            </div>
          )}

          {onToggleZenMode && (
            <button
              onClick={onToggleZenMode}
              style={{
                background: 'transparent',
                border: '1px dashed rgba(99, 102, 241, 0.4)',
                color: '#6366f1',
                borderRadius: 99,
                padding: '0.2rem 0.65rem',
                fontSize: '0.7rem',
                fontWeight: 800,
                fontFamily: "'Outfit', sans-serif",
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
              className="hover:scale-105 active:scale-95"
            >
              <Sparkles size={12} />
              <span>Tam Odak Modu</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. MODA ÖZEL AKILLI DENETLEYİCİLER */}

      {/* A. Soru Çözümü Modu: Soru Sayacı & Hedef */}
      {activeStudyMode === 'question' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 10,
          background: themeObj.innerBg,
          padding: isMobile ? '0.85rem' : '1.1rem',
          borderRadius: 20,
          border: `1.5px solid ${themeObj.border}`
        }}>
          {/* Sol: Çözülen Soru Sayacı (+1 / -1) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: themeObj.cardBg,
            padding: '0.75rem 0.95rem',
            borderRadius: 16,
            border: `1.5px solid ${themeObj.border}`
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: themeObj.subText }}>Çözülen Soru</div>
              <div style={{
                fontSize: '1.35rem',
                fontWeight: 900,
                fontFamily: "'Outfit', sans-serif",
                color: themeObj.text
              }}>
                {currentProgressCount} <span style={{ fontSize: '0.85rem', color: themeObj.subText }}>/ {targetGoalCount}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={handleDecrementProgress}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  border: `1.5px solid ${themeObj.border}`,
                  background: themeObj.innerBg,
                  color: themeObj.text,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                className="hover:scale-105 active:scale-95"
              >
                <Minus size={15} />
              </button>

              <button
                onClick={() => {
                  handleIncrementProgress();
                  confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
                }}
                style={{
                  height: 38,
                  padding: '0 0.95rem',
                  borderRadius: 11,
                  border: 'none',
                  background: themeObj.accentGradient || themeObj.accent,
                  color: '#ffffff',
                  fontWeight: 900,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: `0 3px 12px ${themeObj.accent}45`
                }}
                className="hover:scale-105 active:scale-95"
              >
                <Plus size={16} />
                <span>+1 Soru</span>
              </button>
            </div>
          </div>

          {/* Sağ: Ders Seçimi & Soru Başı Dakika */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: themeObj.cardBg,
            padding: '0.75rem 0.95rem',
            borderRadius: 16,
            border: `1.5px solid ${themeObj.border}`,
            gap: 10
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: themeObj.subText }}>Aktif Ders</div>
              <select
                value={selectedSubject}
                onChange={e => handleSelectSubject(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: themeObj.text,
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  fontFamily: "'Outfit', sans-serif",
                  outline: 'none',
                  cursor: 'pointer',
                  marginTop: 2
                }}
              >
                {STUDY_SUBJECTS.map(s => (
                  <option key={s.id} value={s.id} style={{ background: themeObj.cardBg, color: themeObj.text }}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: themeObj.subText }}>Hedef Süre</div>
              <select
                value={minutesPerQuestion}
                onChange={e => setMinutesPerQuestion(Number(e.target.value))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: themeObj.accent,
                  fontSize: '0.84rem',
                  fontWeight: 900,
                  fontFamily: "'Outfit', sans-serif",
                  outline: 'none',
                  cursor: 'pointer',
                  marginTop: 2
                }}
              >
                <option value={1.0} style={{ background: themeObj.cardBg, color: themeObj.text }}>1.0 dk / soru</option>
                <option value={1.25} style={{ background: themeObj.cardBg, color: themeObj.text }}>1.25 dk (1:15)</option>
                <option value={1.5} style={{ background: themeObj.cardBg, color: themeObj.text }}>1.5 dk (1:30)</option>
                <option value={2.0} style={{ background: themeObj.cardBg, color: themeObj.text }}>2.0 dk / soru</option>
                <option value={2.5} style={{ background: themeObj.cardBg, color: themeObj.text }}>2.5 dk / soru</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* B. Pomodoro Modu: Faz Seçimi & Ağaç Büyüme */}
      {activeStudyMode === 'pomodoro' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: themeObj.innerBg,
          padding: isMobile ? '0.85rem' : '0.95rem 1.35rem',
          borderRadius: 20,
          border: `1.5px solid ${themeObj.border}`,
          flexWrap: 'wrap',
          gap: 10
        }}>
          {/* Faz Butonları */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'focus', label: '25 dk Odak' },
              { id: 'shortBreak', label: '5 dk Mola' },
              { id: 'longBreak', label: '15 dk Uzun Mola' }
            ].map(p => {
              const isPActive = pomodoroMode === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPomodoroMode(p.id)}
                  style={{
                    padding: isMobile ? '0.45rem 0.65rem' : '0.5rem 0.9rem',
                    borderRadius: 12,
                    border: `1.5px solid ${isPActive ? themeObj.accent : themeObj.border}`,
                    background: isPActive ? (themeObj.accentGradient || themeObj.accent) : themeObj.cardBg,
                    color: isPActive ? '#ffffff' : themeObj.text,
                    fontSize: isMobile ? '0.74rem' : '0.8rem',
                    fontWeight: 800,
                    fontFamily: "'Outfit', sans-serif",
                    cursor: 'pointer'
                  }}
                  className="hover:scale-105 active:scale-95"
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Ağaç & Döngü Rozeti */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: '1.4rem' }}>{currentTree?.icon || '🌲'}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: 900,
                fontFamily: "'Outfit', sans-serif",
                color: themeObj.text
              }}>
                {currentTree?.name || 'Ağaç'} Büyüyor
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981' }}>
                {completedCycles} Döngü Tamamlandı
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ANA AKSİYON BUTONLARI ROW */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 4
      }}>
        {/* BÜYÜK BAŞLAT / DURAKLAT BUTONU */}
        <button
          onClick={handleToggleTimer}
          style={{
            flex: 1,
            height: isMobile ? 52 : 58,
            borderRadius: 18,
            border: 'none',
            background: isRunning
              ? (themeObj.isDark ? '#e11d48' : '#ef4444')
              : (themeObj.accentGradient || themeObj.accent),
            color: '#ffffff',
            fontSize: isMobile ? '1.02rem' : '1.12rem',
            fontWeight: 900,
            fontFamily: "'Outfit', sans-serif",
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            boxShadow: isRunning
              ? '0 6px 22px rgba(239, 68, 68, 0.45)'
              : `0 6px 22px ${themeObj.accent}45`,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="hover:scale-[1.02] active:scale-95"
        >
          {isRunning ? <Pause size={22} /> : <Play size={22} fill="white" />}
          <span>{isRunning ? 'Duraklat' : 'Başlat'}</span>
        </button>

        {/* SEANSI BİTİR (TAMAMLA) */}
        <button
          onClick={handleConfirmFinish}
          title="Seansı Başarıyla Tamamla"
          style={{
            height: isMobile ? 52 : 58,
            padding: isMobile ? '0 1.1rem' : '0 1.5rem',
            borderRadius: 18,
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            background: themeObj.isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5',
            color: '#10b981',
            fontWeight: 900,
            fontFamily: "'Outfit', sans-serif",
            fontSize: isMobile ? '0.84rem' : '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s'
          }}
          className="hover:scale-105 active:scale-95"
        >
          <CheckCircle2 size={19} />
          {!isMobile && <span>Bitir</span>}
        </button>

        {/* SIFIRLA BUTONU */}
        <button
          onClick={handleResetTimer}
          title="Sayacı Sıfırla"
          style={{
            width: isMobile ? 52 : 58,
            height: isMobile ? 52 : 58,
            borderRadius: 18,
            border: `1.5px solid ${themeObj.border}`,
            background: themeObj.innerBg,
            color: themeObj.subText,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          className="hover:scale-105 active:scale-95"
        >
          <RotateCcw size={19} />
        </button>
      </div>

      {/* 6. HIZLI OPTİK FORM BUTONU (SEÇİLİ TEST VARSA GÖZÜKÜR) */}
      {selectedTask && (
        <button
          onClick={() => setActiveToolTab('optical')}
          style={{
            width: '100%',
            padding: '0.75rem 1.1rem',
            borderRadius: 16,
            border: `1.5px solid ${activeToolTab === 'optical' ? themeObj.accent : themeObj.border}`,
            background: activeToolTab === 'optical' ? 'rgba(99, 102, 241, 0.14)' : themeObj.innerBg,
            color: activeToolTab === 'optical' ? themeObj.accent : themeObj.text,
            fontWeight: 900,
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s'
          }}
          className="hover:border-indigo-400"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <FileText size={17} color={themeObj.accent} />
            <span>{isSelectedTaskOpenEnded ? 'Açık Uçlu Cevap Formu' : 'Optik Cevap Formu'}</span>
            <span style={{
              background: themeObj.accent,
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: 99
            }}>
              {opticalAnswerCount} / {targetGoalCount} İşaretlendi
            </span>
          </div>

          <ChevronRight size={17} />
        </button>
      )}
    </div>
  );
}
