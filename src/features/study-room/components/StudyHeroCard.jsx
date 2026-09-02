import React from 'react';
import {
  Play, Pause, RotateCcw, CheckCircle2,
  BookOpen, Clock, Target, Plus, Minus,
  ListTodo, Check, Sparkles, ChevronRight, X,
  FileText
} from 'lucide-react';
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
  isSelectedTaskOpenEnded
}) {
  return (
    <div style={{
      background: themeObj.cardBg,
      border: `1px solid ${themeObj.border}`,
      borderRadius: isMobile ? 22 : 28,
      padding: isMobile ? '1.1rem 1rem' : '1.75rem 2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '1rem' : '1.25rem',
      boxShadow: themeObj.isDark
        ? '0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.05)'
        : '0 20px 40px -15px rgba(99, 102, 241, 0.08), 0 1px 3px rgba(0,0,0,0.03)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 1. MOD SEÇİCİ SEGMENLER (HAP BUTONLAR) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
        background: themeObj.innerBg,
        padding: 4,
        borderRadius: 16,
        border: `1px solid ${themeObj.border}`
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
                padding: isMobile ? '0.55rem 0.4rem' : '0.65rem 0.8rem',
                borderRadius: 12,
                border: 'none',
                background: isActive ? (themeObj.accentGradient || themeObj.accent) : 'transparent',
                color: isActive ? '#ffffff' : themeObj.subText,
                fontWeight: 800,
                fontSize: isMobile ? '0.78rem' : '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isActive ? `0 4px 14px ${themeObj.accent}40` : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. AKTİF GÖREV & DERS BİLGİSİ BANDI */}
      <div style={{
        background: themeObj.innerBg,
        borderRadius: 16,
        padding: isMobile ? '0.65rem 0.85rem' : '0.75rem 1.1rem',
        border: `1px solid ${themeObj.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: selectedTask ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: selectedTask ? '#6366f1' : '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            flexShrink: 0
          }}>
            {selectedTask ? '📖' : '🎯'}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: isMobile ? '0.82rem' : '0.9rem',
              fontWeight: 900,
              color: themeObj.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {selectedTask ? (selectedTask.title || selectedTask.name || 'Seçili Test') : 'Serbest Çalışma Hedefi'}
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: themeObj.subText,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span>{selectedSubject}</span>
              {selectedTask && (
                <>
                  <span>•</span>
                  <span>{targetGoalCount} Soru</span>
                  {selectedTask.sourceLabel && <span>• {selectedTask.sourceLabel}</span>}
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {selectedTask && (
            <button
              onClick={onClearTask}
              title="Görevi Kaldır (Serbest Çalışmaya Geç)"
              style={{
                background: 'transparent',
                border: `1px solid ${themeObj.border}`,
                color: themeObj.subText,
                borderRadius: 10,
                padding: '0.4rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={14} />
            </button>
          )}

          <button
            onClick={onOpenTaskPicker}
            style={{
              background: selectedTask ? themeObj.buttonBg : 'rgba(99, 102, 241, 0.14)',
              border: `1px solid ${selectedTask ? themeObj.border : 'rgba(99, 102, 241, 0.35)'}`,
              color: selectedTask ? themeObj.text : '#6366f1',
              borderRadius: 10,
              padding: isMobile ? '0.4rem 0.7rem' : '0.45rem 0.85rem',
              fontSize: isMobile ? '0.74rem' : '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s'
            }}
          >
            <BookOpen size={14} />
            <span>{selectedTask ? 'Değiştir' : 'Görev Seç'}</span>
          </button>
        </div>
      </div>

      {/* 3. MERKEZ DİJİTAL SAYAÇ & İLERLEME HALKASI/ÇUBUĞU */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '0.5rem 0' : '1rem 0',
        position: 'relative'
      }}>
        {/* Durum Rozeti */}
        <div style={{
          background: isRunning ? 'rgba(16, 185, 129, 0.14)' : 'rgba(148, 163, 184, 0.15)',
          color: isRunning ? '#10b981' : themeObj.subText,
          border: `1px solid ${isRunning ? 'rgba(16, 185, 129, 0.35)' : 'rgba(148, 163, 184, 0.25)'}`,
          padding: '0.25rem 0.75rem',
          borderRadius: 99,
          fontSize: '0.74rem',
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: isRunning ? '#10b981' : '#94a3b8',
            boxShadow: isRunning ? '0 0 8px #10b981' : 'none'
          }} />
          <span>{timerStatusLabel}</span>
        </div>

        {/* Büyük Dijital Süre Metni */}
        <div style={{
          fontSize: isMobile ? '3.5rem' : '4.6rem',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
          color: themeObj.text,
          lineHeight: 1,
          textShadow: isRunning ? `0 0 30px ${themeObj.accent}30` : 'none',
          userSelect: 'none',
          margin: '0.35rem 0'
        }}>
          {displayTimerText}
        </div>

        {/* İlerleme Çubuğu */}
        <div style={{
          width: '100%',
          maxWidth: 420,
          height: 6,
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

        {/* Motivasyon Sözü */}
        {activeQuote && (
          <div
            onClick={onNextQuote}
            title="Sözü Değiştir (Tıkla)"
            style={{
              fontSize: isMobile ? '0.72rem' : '0.8rem',
              color: themeObj.subText,
              fontStyle: 'italic',
              textAlign: 'center',
              marginTop: 12,
              cursor: 'pointer',
              maxWidth: 440,
              padding: '0 0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <span>“{activeQuote}”</span>
            <Sparkles size={11} style={{ opacity: 0.6 }} />
          </div>
        )}
      </div>

      {/* 4. MODA ÖZEL AKILLI DENETLEYİCİLER */}

      {/* A. Soru Çözümü Modu: Soru Sayacı & Hedef */}
      {activeStudyMode === 'question' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 10,
          background: themeObj.innerBg,
          padding: isMobile ? '0.8rem' : '1rem',
          borderRadius: 18,
          border: `1px solid ${themeObj.border}`
        }}>
          {/* Sol: Çözülen Soru Sayacı (+1 / -1) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: themeObj.cardBg,
            padding: '0.65rem 0.85rem',
            borderRadius: 14,
            border: `1px solid ${themeObj.border}`
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: themeObj.subText }}>Çözülen Soru</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: themeObj.text }}>
                {currentProgressCount} <span style={{ fontSize: '0.82rem', color: themeObj.subText }}>/ {targetGoalCount}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={handleDecrementProgress}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `1px solid ${themeObj.border}`,
                  background: themeObj.innerBg,
                  color: themeObj.text,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Minus size={15} />
              </button>

              <button
                onClick={handleIncrementProgress}
                style={{
                  height: 36,
                  padding: '0 0.85rem',
                  borderRadius: 10,
                  border: 'none',
                  background: themeObj.accentGradient || themeObj.accent,
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: `0 3px 10px ${themeObj.accent}40`
                }}
              >
                <Plus size={15} />
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
            padding: '0.65rem 0.85rem',
            borderRadius: 14,
            border: `1px solid ${themeObj.border}`,
            gap: 8
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
                  fontSize: '0.85rem',
                  fontWeight: 900,
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
                  fontSize: '0.82rem',
                  fontWeight: 900,
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
          padding: isMobile ? '0.75rem' : '0.85rem 1.25rem',
          borderRadius: 18,
          border: `1px solid ${themeObj.border}`,
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
                    padding: isMobile ? '0.4rem 0.6rem' : '0.45rem 0.8rem',
                    borderRadius: 10,
                    border: `1px solid ${isPActive ? themeObj.accent : themeObj.border}`,
                    background: isPActive ? themeObj.accent : themeObj.cardBg,
                    color: isPActive ? '#ffffff' : themeObj.text,
                    fontSize: isMobile ? '0.72rem' : '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Ağaç & Döngü Rozeti */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.3rem' }}>{currentTree?.icon || '🌲'}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: themeObj.text }}>{currentTree?.name || 'Ağaç'} Büyüyor</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#10b981' }}>{completedCycles} Döngü Tamamlandı</div>
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
            height: isMobile ? 50 : 56,
            borderRadius: 16,
            border: 'none',
            background: isRunning
              ? (themeObj.isDark ? '#e11d48' : '#ef4444')
              : (themeObj.accentGradient || themeObj.accent),
            color: '#ffffff',
            fontSize: isMobile ? '1rem' : '1.1rem',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: isRunning
              ? '0 6px 20px rgba(239, 68, 68, 0.4)'
              : `0 6px 20px ${themeObj.accent}45`,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {isRunning ? <Pause size={20} /> : <Play size={20} fill="white" />}
          <span>{isRunning ? 'Duraklat' : 'Başlat'}</span>
        </button>

        {/* SEANSI BİTİR (TAMAMLA) */}
        <button
          onClick={handleConfirmFinish}
          title="Seansı Başarıyla Tamamla"
          style={{
            height: isMobile ? 50 : 56,
            padding: isMobile ? '0 1rem' : '0 1.4rem',
            borderRadius: 16,
            border: '1px solid rgba(16, 185, 129, 0.4)',
            background: themeObj.isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5',
            color: '#10b981',
            fontWeight: 900,
            fontSize: isMobile ? '0.82rem' : '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s'
          }}
        >
          <CheckCircle2 size={18} />
          {!isMobile && <span>Bitir</span>}
        </button>

        {/* SIFIRLA BUTONU */}
        <button
          onClick={handleResetTimer}
          title="Sayacı Sıfırla"
          style={{
            width: isMobile ? 50 : 56,
            height: isMobile ? 50 : 56,
            borderRadius: 16,
            border: `1px solid ${themeObj.border}`,
            background: themeObj.innerBg,
            color: themeObj.subText,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* 6. HIZLI OPTİK FORM BUTONU (SEÇİLİ TEST VARSA GÖZÜKÜR) */}
      {selectedTask && (
        <button
          onClick={() => setActiveToolTab('optical')}
          style={{
            width: '100%',
            padding: '0.65rem 1rem',
            borderRadius: 14,
            border: `1.5px solid ${activeToolTab === 'optical' ? themeObj.accent : themeObj.border}`,
            background: activeToolTab === 'optical' ? 'rgba(99, 102, 241, 0.12)' : themeObj.innerBg,
            color: activeToolTab === 'optical' ? themeObj.accent : themeObj.text,
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color={themeObj.accent} />
            <span>{isSelectedTaskOpenEnded ? 'Açık Uçlu Cevap Formu' : 'Optik Cevap Formu'}</span>
            <span style={{
              background: themeObj.accent,
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 900,
              padding: '1px 6px',
              borderRadius: 99
            }}>
              {opticalAnswerCount} / {targetGoalCount} İşaretlendi
            </span>
          </div>

          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
