import React, { useState, useMemo } from 'react';
import {
  Trophy, Award, X, Sparkles, Flame, CheckCircle2, Lock,
  Crown, Star, Zap, Shield, TrendingUp, Users, Target, Filter,
  Check, ArrowRight
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
  { key: 'subject', label: '📚 Ders Başarıları' },
  { key: 'milestone', label: '🏹 Soru Sayısı' },
  { key: 'test', label: '🎯 Test & Kitap' },
  { key: 'accuracy', label: '🎖️ Tam Puan & İsabet' },
  { key: 'streak', label: '🔥 Günlük Seri' },
  { key: 'study', label: '⏱️ Odaklanma' },
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
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface, #ffffff)',
          color: 'var(--color-text, #0f172a)',
          width: '100%',
          maxWidth: 820,
          maxHeight: '92vh',
          borderRadius: 24,
          border: '1.5px solid var(--color-border)',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                fontSize: '1.4rem'
              }}
            >
              {levelInfo.icon}
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }}>
                Başarılar & Liderlik Arenası
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
                {levelInfo.title} (Lv. {levelInfo.level}) • {xp.toLocaleString('tr-TR')} Toplam XP • 🔥 {stats.dailyStreak} Gün Seri ({streakTierInfo?.multiplier}x XP)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: 6,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}
        >
          {[
            { key: 'badges', label: '🏆 Rozetlerim', count: `${unlockedBadges.length}/${BADGE_DEFINITIONS.length}` },
            { key: 'streaks', label: '🔥 Seri Çarpanları', count: `${stats.dailyStreak} Gün` },
            { key: 'leaderboard', label: '🥇 Liderlik Sıralaması', count: `${leaderboard.length} Öğrenci` },
            { key: 'levels', label: '⭐ Rütbe Basamakları', count: `${LEVEL_TIERS.length} Seviye` }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: 1,
                minWidth: 'fit-content',
                padding: '0.55rem 0.8rem',
                borderRadius: 12,
                border: 'none',
                fontWeight: activeTab === t.key ? 900 : 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                background: activeTab === t.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                color: activeTab === t.key ? 'white' : 'var(--color-text-muted)',
                boxShadow: activeTab === t.key ? '0 4px 14px rgba(99,102,241,0.25)' : 'none',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                whiteSpace: 'nowrap'
              }}
            >
              <span>{t.label}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>({t.count})</span>
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {/* TAB 1: BADGES */}
          {activeTab === 'badges' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Category Filter Pills */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {BADGE_CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: selectedCategory === cat.key ? '1px solid #6366f1' : '1px solid var(--color-border)',
                      background: selectedCategory === cat.key ? (isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff') : 'transparent',
                      color: selectedCategory === cat.key ? '#6366f1' : 'var(--color-text-muted)',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Unlocked Badges Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Sparkles size={16} className="text-amber-500" />
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Kazanılan Rozetler ({filteredUnlockedBadges.length})
                  </h3>
                </div>

                {filteredUnlockedBadges.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 16, border: '1px dashed var(--color-border)' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                      Bu kategoride henüz kazanılmış bir rozetin bulunmuyor. Test çözerek ve çalışarak rozetleri açabilirsin! 🎯
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                    {filteredUnlockedBadges.map(b => (
                      <div
                        key={b.id}
                        style={{
                          padding: '0.85rem',
                          borderRadius: 16,
                          background: isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb',
                          border: '1.5px solid rgba(245, 158, 11, 0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 5
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '1.7rem' }}>{b.icon}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#d97706', background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: 6 }}>
                            +{b.xpReward} XP
                          </span>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: '0.86rem' }}>{b.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>{b.desc}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: '0.7rem', color: '#16a34a', fontWeight: 800 }}>
                          <CheckCircle2 size={13} />
                          <span>Tamamlandı</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Locked Badges Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Lock size={15} className="text-slate-400" />
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
                    Kilitli Rozetler ({filteredLockedBadges.length})
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                  {filteredLockedBadges.map(b => {
                    const pct = Math.round((b.progress.current / b.progress.target) * 100);
                    return (
                      <div
                        key={b.id}
                        style={{
                          padding: '0.85rem',
                          borderRadius: 16,
                          background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                          border: '1.5px solid var(--color-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 5,
                          opacity: 0.85
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '1.7rem', filter: 'grayscale(1)' }}>{b.icon}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)', background: 'var(--color-border)', padding: '2px 6px', borderRadius: 6 }}>
                            +{b.xpReward} XP
                          </span>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: '0.86rem', color: 'var(--color-text)' }}>{b.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>{b.desc}</div>

                        {/* Progress Bar */}
                        <div style={{ marginTop: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 3 }}>
                            <span>İlerleme</span>
                            <span>{b.progress.current} / {b.progress.target}</span>
                          </div>
                          <div style={{ width: '100%', height: 6, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', overflow: 'hidden' }}>
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

          {/* TAB 2: STREAK MULTIPLIER & TIERS */}
          {activeTab === 'streaks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Active Streak Status Header */}
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15))',
                  border: '1.5px solid rgba(245,158,11,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: '2.5rem', animation: 'bounce 2s infinite' }}>🔥</div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--color-text)' }}>
                      {stats.dailyStreak} Günlük Kesintisiz Seri
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Mevcut Çarpan: <strong style={{ color: '#f59e0b' }}>{streakTierInfo?.multiplier}x XP</strong> • Toplam Seri Bonusu: <strong>+{stats.cumulativeStreakBonus || 0} XP</strong>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      padding: '6px 14px',
                      borderRadius: 12,
                      background: stats.isTodaySolved ? '#22c55e' : '#f59e0b',
                      color: 'white',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {stats.isTodaySolved ? '✅ Bugünkü Seri Tamam' : '⚡ Bugün Soru Çöz!'}
                  </span>
                </div>
              </div>

              {/* All Streak Tiers List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Kademeli Seri Çarpanları & Günlük Bonuslar
                </h3>

                {STREAK_TIERS.filter(t => t.minDays > 0).map(t => {
                  const isReached = stats.dailyStreak >= t.minDays;
                  const isCurrent = streakTierInfo?.minDays === t.minDays;
                  return (
                    <div
                      key={t.minDays}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: 16,
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
                        gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: '1.8rem' }}>{t.icon}</div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{t.title}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, background: '#f59e0b', color: 'white', padding: '1px 6px', borderRadius: 6 }}>
                              {t.multiplier}x XP
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a' }}>
                              +{t.dailyBonusXp} XP / gün
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                            {t.desc} (Gereken: {t.minDays} Gün Kesintisiz Seri)
                          </div>
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#f59e0b', background: 'rgba(245,158,11,0.2)', padding: '4px 10px', borderRadius: 8 }}>
                            Aktif Kademede
                          </span>
                        ) : isReached ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={15} /> Açıldı
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                            {t.minDays - stats.dailyStreak} Gün Kaldı
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Podium for Top 3 */}
              {leaderboard.length >= 3 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignItems: 'flex-end', paddingTop: 10, paddingBottom: 10 }}>
                  {/* 2nd Place */}
                  <div
                    style={{
                      padding: '1rem 0.75rem',
                      borderRadius: 18,
                      background: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9',
                      border: '2px solid #cbd5e1',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <div style={{ fontSize: '1.6rem' }}>🥈</div>
                    <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--color-text)' }}>{leaderboard[1].name}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>{leaderboard[1].xp.toLocaleString('tr-TR')} XP</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Lv. {leaderboard[1].levelInfo.level} • {leaderboard[1].levelInfo.title}</div>
                  </div>

                  {/* 1st Place */}
                  <div
                    style={{
                      padding: '1.25rem 0.75rem',
                      borderRadius: 20,
                      background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                      border: '2px solid #f59e0b',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)'
                    }}
                  >
                    <div style={{ fontSize: '2rem' }}>👑</div>
                    <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#d97706' }}>{leaderboard[0].name}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#b45309' }}>{leaderboard[0].xp.toLocaleString('tr-TR')} XP</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Lv. {leaderboard[0].levelInfo.level} • {leaderboard[0].levelInfo.title}</div>
                  </div>

                  {/* 3rd Place */}
                  <div
                    style={{
                      padding: '1rem 0.75rem',
                      borderRadius: 18,
                      background: isDark ? 'rgba(217, 119, 6, 0.12)' : '#ffedd5',
                      border: '2px solid #fdba74',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <div style={{ fontSize: '1.6rem' }}>🥉</div>
                    <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--color-text)' }}>{leaderboard[2].name}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c2410c' }}>{leaderboard[2].xp.toLocaleString('tr-TR')} XP</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Lv. {leaderboard[2].levelInfo.level} • {leaderboard[2].levelInfo.title}</div>
                  </div>
                </div>
              )}

              {/* Full Ranking Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {leaderboard.map((user, idx) => {
                  const isCurrent = String(user.id) === String(student?.id);
                  return (
                    <div
                      key={user.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 14,
                        background: isCurrent
                          ? (isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff')
                          : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                        border: isCurrent ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 900, fontSize: '0.9rem', width: 24, textAlign: 'center', color: idx < 3 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                            {user.name} {isCurrent && <span style={{ fontSize: '0.7rem', color: '#6366f1' }}>(Sen)</span>}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            {user.levelInfo.icon} {user.levelInfo.title} (Lv. {user.levelInfo.level}) • {user.solvedCount} Soru Çözüldü
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#6366f1' }}>
                          {user.xp.toLocaleString('tr-TR')} XP
                        </div>
                        {user.streak > 0 && (
                          <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 800 }}>
                            🔥 {user.streak} Gün
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: LEVELS ROADMAP */}
          {activeTab === 'levels' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LEVEL_TIERS.map(tier => {
                const isCurrent = levelInfo.level === tier.level;
                const isPassed = levelInfo.level > tier.level;
                return (
                  <div
                    key={tier.level}
                    style={{
                      padding: '0.9rem 1.1rem',
                      borderRadius: 16,
                      background: isCurrent
                        ? (isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff')
                        : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                      border: isCurrent ? `2px solid ${tier.color}` : '1.5px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: tier.bgGradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.4rem'
                        }}
                      >
                        {tier.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>
                          {tier.title} <span style={{ fontSize: '0.75rem', color: tier.color }}>(Lv. {tier.level})</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Gereken XP: <strong>{tier.minXp.toLocaleString('tr-TR')} XP</strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: tier.color, background: `${tier.color}20`, padding: '4px 10px', borderRadius: 8 }}>
                          Mevcut Rütben
                        </span>
                      ) : isPassed ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={14} /> Açıldı
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Lock size={13} /> Kilitli
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
