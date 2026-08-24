import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy, Award, X, Sparkles, Flame, CheckCircle2, Lock,
  Crown, Star, Zap, Shield, TrendingUp, Users, Target, Filter,
  Check, ArrowRight, ChevronLeft
} from 'lucide-react';
import {
  computeStudentGamificationData,
  computeLeaderboard,
  LEVEL_TIERS,
  STREAK_TIERS,
  BADGE_DEFINITIONS
} from '../../services/gamificationService';
import { useTheme } from '../../context/ThemeContext';

const BADGE_CATEGORIES = [
  { key: 'all', label: 'Tümü' },
  { key: 'subject', label: '📚 Dersler' },
  { key: 'milestone', label: '🏹 Soru Sayısı' },
  { key: 'test', label: '🎯 Test & Kitap' },
  { key: 'accuracy', label: '🎖️ İsabet' },
  { key: 'streak', label: '🔥 Seri' },
  { key: 'study', label: '⏱️ Odak' },
  { key: 'special', label: '✨ Özel' }
];

export default function GamificationModal({
  student,
  submissions = [],
  homeworks = [],
  books = [],
  bookTests = [],
  mockExams = [],
  studySessions = [],
  users = [],
  onClose
}) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('badges'); // 'badges' | 'streaks' | 'leaderboard' | 'levels'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const gamification = useMemo(() => {
    return computeStudentGamificationData({
      studentId: student?.id,
      submissions,
      homeworks,
      books,
      bookTests,
      mockExams,
      studySessions
    });
  }, [student, submissions, homeworks, books, bookTests, mockExams, studySessions]);

  const leaderboard = useMemo(() => {
    return computeLeaderboard({
      users,
      submissions,
      homeworks,
      books,
      bookTests,
      mockExams,
      studySessions
    });
  }, [users, submissions, homeworks, books, bookTests, mockExams, studySessions]);

  const { levelInfo, streakTierInfo, stats, unlockedBadges, lockedBadges, xp } = gamification;

  const filteredUnlockedBadges = useMemo(() => {
    if (selectedCategory === 'all') return unlockedBadges;
    return unlockedBadges.filter(b => b.category === selectedCategory);
  }, [unlockedBadges, selectedCategory]);

  const filteredLockedBadges = useMemo(() => {
    if (selectedCategory === 'all') return lockedBadges;
    return lockedBadges.filter(b => b.category === selectedCategory);
  }, [lockedBadges, selectedCategory]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface, #ffffff)',
          color: 'var(--color-text, #0f172a)',
          width: '100%',
          maxWidth: isMobile ? '100vw' : 820,
          height: isMobile ? '94dvh' : 'auto',
          maxHeight: isMobile ? '94dvh' : '92vh',
          borderRadius: isMobile ? '24px 24px 0 0' : 24,
          border: isMobile ? 'none' : '1.5px solid var(--color-border)',
          boxShadow: '0 30px 70px -15px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: isMobile ? 'slideUpDrawer 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── NATIVE DRAG HANDLE (MOBİL TUTAMAÇ ÇUBUĞU) ── */}
        {isMobile && (
          <div style={{ padding: '8px 0 2px 0', display: 'flex', justifyContent: 'center', background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)' }}>
            <div style={{ width: 38, height: 4, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)' }} />
          </div>
        )}

        {/* ── 1. MODAL HEADER (NATIVE APP BAR) ── */}
        <div
          style={{
            padding: isMobile ? '0.75rem 1rem' : '1.15rem 1.45rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, minWidth: 0 }}>
            {/* Geri / Kapat Butonu (Mobilde) veya Avatar */}
            {isMobile ? (
              <button
                onClick={onClose}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                  border: 'none',
                  color: 'var(--color-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <ChevronLeft size={20} />
              </button>
            ) : (
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                  fontSize: '1.4rem',
                  flexShrink: 0
                }}
              >
                {levelInfo.icon}
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 style={{ fontSize: isMobile ? '0.98rem' : '1.15rem', fontWeight: 900, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Başarılar & Liderlik
                </h2>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: 6,
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    color: levelInfo.color,
                    flexShrink: 0
                  }}
                >
                  Lv. {levelInfo.level}
                </span>
              </div>
              <p style={{ fontSize: isMobile ? '0.72rem' : '0.78rem', color: 'var(--color-text-muted)', margin: '1px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {levelInfo.title} • <strong style={{ color: levelInfo.color }}>{xp.toLocaleString('tr-TR')} XP</strong> • 🔥 {stats.dailyStreak} Gün ({streakTierInfo?.multiplier}x)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── 2. NATIVE SEGMENTED TABS ── */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: isMobile ? '6px 10px' : '8px 16px',
            borderBottom: '1px solid var(--color-border)',
            background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}
        >
          {[
            { key: 'badges', label: '🏆 Rozetler', count: `${unlockedBadges.length}/${BADGE_DEFINITIONS.length}` },
            { key: 'streaks', label: '🔥 Seri', count: `${stats.dailyStreak}g • ${streakTierInfo?.multiplier}x` },
            { key: 'leaderboard', label: '🥇 Liderlik', count: `${leaderboard.length} Kişi` },
            { key: 'levels', label: '⭐ Rütbeler', count: `${LEVEL_TIERS.length} Seviye` }
          ].map(t => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  flex: 1,
                  minWidth: 'fit-content',
                  padding: isMobile ? '6px 9px' : '7px 12px',
                  borderRadius: 10,
                  border: 'none',
                  fontWeight: isActive ? 900 : 700,
                  fontSize: isMobile ? '0.75rem' : '0.82rem',
                  cursor: 'pointer',
                  background: isActive ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                  color: isActive ? 'white' : 'var(--color-text-muted)',
                  boxShadow: isActive ? '0 3px 10px rgba(99,102,241,0.28)' : 'none',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{t.label}</span>
                <span style={{ fontSize: '0.66rem', opacity: isActive ? 0.9 : 0.7 }}>({t.count})</span>
              </button>
            );
          })}
        </div>

        {/* ── 3. SCROLLABLE BODY ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0.85rem 0.95rem 2rem 0.95rem' : '1.25rem 1.5rem', WebkitOverflowScrolling: 'touch' }}>
          
          {/* ════ TAB 1: BADGES ════ */}
          {activeTab === 'badges' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Category Filter Chips */}
              <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
                {BADGE_CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    style={{
                      padding: isMobile ? '4px 9px' : '5px 11px',
                      borderRadius: 8,
                      border: selectedCategory === cat.key ? '1px solid #6366f1' : '1px solid var(--color-border)',
                      background: selectedCategory === cat.key ? (isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff') : 'transparent',
                      color: selectedCategory === cat.key ? '#6366f1' : 'var(--color-text-muted)',
                      fontWeight: 800,
                      fontSize: isMobile ? '0.72rem' : '0.76rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Unlocked Badges Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <Sparkles size={15} className="text-amber-500" />
                  <h3 style={{ fontSize: isMobile ? '0.82rem' : '0.9rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Kazanılan Rozetler ({filteredUnlockedBadges.length})
                  </h3>
                </div>

                {filteredUnlockedBadges.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.25rem', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 14, border: '1px dashed var(--color-border)' }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      Bu kategoride henüz kazanılmış bir rozetin bulunmuyor. Test çözerek rozetleri açabilirsin! 🎯
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(210px, 1fr))', gap: isMobile ? 8 : 10 }}>
                    {filteredUnlockedBadges.map(b => (
                      <div
                        key={b.id}
                        style={{
                          padding: isMobile ? '0.7rem' : '0.85rem',
                          borderRadius: 14,
                          background: isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb',
                          border: '1.5px solid rgba(245, 158, 11, 0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: isMobile ? '1.5rem' : '1.7rem' }}>{b.icon}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#d97706', background: 'rgba(245,158,11,0.18)', padding: '1px 5px', borderRadius: 5 }}>
                            +{b.xpReward} XP
                          </span>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: isMobile ? '0.8rem' : '0.86rem', lineHeight: 1.2 }}>{b.title}</div>
                        <div style={{ fontSize: isMobile ? '0.68rem' : '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.25 }}>{b.desc}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, fontSize: '0.66rem', color: '#16a34a', fontWeight: 800 }}>
                          <CheckCircle2 size={12} />
                          <span>Tamamlandı</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Locked Badges Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <Lock size={14} className="text-slate-400" />
                  <h3 style={{ fontSize: isMobile ? '0.82rem' : '0.9rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
                    Kilitli Rozetler ({filteredLockedBadges.length})
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(210px, 1fr))', gap: isMobile ? 8 : 10 }}>
                  {filteredLockedBadges.map(b => {
                    const pct = Math.round((b.progress.current / b.progress.target) * 100);
                    return (
                      <div
                        key={b.id}
                        style={{
                          padding: isMobile ? '0.7rem' : '0.85rem',
                          borderRadius: 14,
                          background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                          border: '1.5px solid var(--color-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          opacity: 0.85
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: isMobile ? '1.5rem' : '1.7rem', filter: 'grayscale(1)' }}>{b.icon}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', background: 'var(--color-border)', padding: '1px 5px', borderRadius: 5 }}>
                            +{b.xpReward} XP
                          </span>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: isMobile ? '0.8rem' : '0.86rem', color: 'var(--color-text)', lineHeight: 1.2 }}>{b.title}</div>
                        <div style={{ fontSize: isMobile ? '0.68rem' : '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.25 }}>{b.desc}</div>

                        {/* Progress Bar */}
                        <div style={{ marginTop: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                            <span>İlerleme</span>
                            <span>{b.progress.current}/{b.progress.target}</span>
                          </div>
                          <div style={{ width: '100%', height: 5, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: '#6366f1', borderRadius: 99 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ════ TAB 2: STREAKS ════ */}
          {activeTab === 'streaks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Active Streak Hero Banner */}
              <div
                style={{
                  padding: isMobile ? '0.9rem' : '1.25rem',
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15))',
                  border: '1.5px solid rgba(245,158,11,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: isMobile ? '2rem' : '2.5rem' }}>🔥</div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: isMobile ? '0.95rem' : '1.1rem', color: 'var(--color-text)' }}>
                      {stats.dailyStreak} Günlük Seri
                    </div>
                    <div style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                      Çarpan: <strong style={{ color: '#f59e0b' }}>{streakTierInfo?.multiplier}x XP</strong> • Bonus: <strong>+{stats.cumulativeStreakBonus || 0} XP</strong>
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: isMobile ? '0.72rem' : '0.8rem',
                    fontWeight: 900,
                    padding: isMobile ? '4px 9px' : '6px 14px',
                    borderRadius: 10,
                    background: stats.isTodaySolved ? '#22c55e' : '#f59e0b',
                    color: 'white',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {stats.isTodaySolved ? '✅ Seri Güvende' : '⚡ Test Çöz!'}
                </span>
              </div>

              {/* Tiers List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STREAK_TIERS.filter(t => t.minDays > 0).map(t => {
                  const isReached = stats.dailyStreak >= t.minDays;
                  const isCurrent = streakTierInfo?.minDays === t.minDays;
                  return (
                    <div
                      key={t.minDays}
                      style={{
                        padding: isMobile ? '0.75rem 0.9rem' : '1rem 1.25rem',
                        borderRadius: 14,
                        background: isCurrent
                          ? (isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7')
                          : isReached
                            ? (isDark ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4')
                            : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                        border: isCurrent
                          ? '2px solid #f59e0b'
                          : isReached
                            ? '1.5px solid rgba(34, 197, 94, 0.3)'
                            : '1.5px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontSize: isMobile ? '1.5rem' : '1.8rem' }}>{t.icon}</div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: isMobile ? '0.85rem' : '0.95rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>{t.title}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#f59e0b', color: 'white', padding: '1px 5px', borderRadius: 5 }}>
                              {t.multiplier}x
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#16a34a' }}>
                              +{t.dailyBonusXp} XP/g
                            </span>
                          </div>
                          <div style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                            {t.minDays} Gün Seri
                          </div>
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#f59e0b', background: 'rgba(245,158,11,0.2)', padding: '3px 8px', borderRadius: 6 }}>
                            Aktif
                          </span>
                        ) : isReached ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Check size={14} /> Açıldı
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                            {t.minDays - stats.dailyStreak}g Kaldı
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════ TAB 3: LEADERBOARD ════ */}
          {activeTab === 'leaderboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Top 3 Podium */}
              {leaderboard.length >= 3 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 6 : 10, alignItems: 'flex-end', paddingTop: 6, paddingBottom: 6 }}>
                  {/* 2nd Place */}
                  <div
                    style={{
                      padding: isMobile ? '0.75rem 0.4rem' : '1rem 0.75rem',
                      borderRadius: 16,
                      background: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9',
                      border: '2px solid #cbd5e1',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2
                    }}
                  >
                    <div style={{ fontSize: isMobile ? '1.3rem' : '1.6rem' }}>🥈</div>
                    <div style={{ fontWeight: 900, fontSize: isMobile ? '0.76rem' : '0.85rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{leaderboard[1].name}</div>
                    <div style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800, color: '#64748b' }}>{leaderboard[1].xp.toLocaleString('tr-TR')} XP</div>
                  </div>

                  {/* 1st Place */}
                  <div
                    style={{
                      padding: isMobile ? '0.95rem 0.4rem' : '1.25rem 0.75rem',
                      borderRadius: 18,
                      background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                      border: '2px solid #f59e0b',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      boxShadow: '0 6px 20px rgba(245, 158, 11, 0.25)'
                    }}
                  >
                    <div style={{ fontSize: isMobile ? '1.6rem' : '2rem' }}>👑</div>
                    <div style={{ fontWeight: 900, fontSize: isMobile ? '0.82rem' : '0.95rem', color: '#d97706', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{leaderboard[0].name}</div>
                    <div style={{ fontSize: isMobile ? '0.74rem' : '0.82rem', fontWeight: 900, color: '#b45309' }}>{leaderboard[0].xp.toLocaleString('tr-TR')} XP</div>
                  </div>

                  {/* 3rd Place */}
                  <div
                    style={{
                      padding: isMobile ? '0.75rem 0.4rem' : '1rem 0.75rem',
                      borderRadius: 16,
                      background: isDark ? 'rgba(217, 119, 6, 0.12)' : '#ffedd5',
                      border: '2px solid #fdba74',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2
                    }}
                  >
                    <div style={{ fontSize: isMobile ? '1.3rem' : '1.6rem' }}>🥉</div>
                    <div style={{ fontWeight: 900, fontSize: isMobile ? '0.76rem' : '0.85rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{leaderboard[2].name}</div>
                    <div style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800, color: '#c2410c' }}>{leaderboard[2].xp.toLocaleString('tr-TR')} XP</div>
                  </div>
                </div>
              )}

              {/* Ranking List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {leaderboard.map((user, idx) => {
                  const isCurrent = String(user.id) === String(student?.id);
                  return (
                    <div
                      key={user.id}
                      style={{
                        padding: isMobile ? '0.6rem 0.8rem' : '0.75rem 1rem',
                        borderRadius: 12,
                        background: isCurrent
                          ? (isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff')
                          : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                        border: isCurrent ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ fontWeight: 900, fontSize: '0.82rem', width: 20, textAlign: 'center', color: idx < 3 ? '#f59e0b' : 'var(--color-text-muted)', flexShrink: 0 }}>
                          #{idx + 1}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 900, fontSize: isMobile ? '0.82rem' : '0.88rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.name} {isCurrent && <span style={{ fontSize: '0.68rem', color: '#6366f1' }}>(Sen)</span>}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                            {user.levelInfo.icon} Lv.{user.levelInfo.level} • {user.solvedCount} Soru
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: isMobile ? '0.82rem' : '0.9rem', color: '#6366f1' }}>
                          {user.xp.toLocaleString('tr-TR')} XP
                        </div>
                        {user.streak > 0 && (
                          <div style={{ fontSize: '0.66rem', color: '#d97706', fontWeight: 800 }}>
                            🔥 {user.streak}g
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════ TAB 4: LEVELS ROADMAP ════ */}
          {activeTab === 'levels' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {LEVEL_TIERS.map(tier => {
                const isCurrent = levelInfo.level === tier.level;
                const isPassed = levelInfo.level > tier.level;
                return (
                  <div
                    key={tier.level}
                    style={{
                      padding: isMobile ? '0.7rem 0.9rem' : '0.9rem 1.1rem',
                      borderRadius: 14,
                      background: isCurrent
                        ? (isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff')
                        : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                      border: isCurrent ? `2px solid ${tier.color}` : '1.5px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: isMobile ? 36 : 44,
                          height: isMobile ? 36 : 44,
                          borderRadius: isMobile ? 10 : 12,
                          background: tier.bgGradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: isMobile ? '1.2rem' : '1.4rem',
                          flexShrink: 0
                        }}
                      >
                        {tier.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: isMobile ? '0.85rem' : '0.95rem' }}>
                          {tier.title} <span style={{ fontSize: '0.72rem', color: tier.color }}>(Lv. {tier.level})</span>
                        </div>
                        <div style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', color: 'var(--color-text-muted)' }}>
                          Gereken: <strong>{tier.minXp.toLocaleString('tr-TR')} XP</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      {isCurrent ? (
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, color: tier.color, background: `${tier.color}20`, padding: '3px 8px', borderRadius: 6 }}>
                          Mevcut
                        </span>
                      ) : isPassed ? (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <CheckCircle2 size={13} /> Açıldı
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Lock size={12} /> Kilitli
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
