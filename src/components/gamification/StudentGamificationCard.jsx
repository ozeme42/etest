import React, { useState, useMemo } from 'react';
import { Trophy, Flame, Award, ChevronRight, Zap, Star, Shield, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { computeStudentGamificationData } from '../../services/gamificationService';
import GamificationModal from './GamificationModal';
import { useTheme } from '../../context/ThemeContext';

export default function StudentGamificationCard({
  student,
  submissions = [],
  homeworks = [],
  books = [],
  bookTests = [],
  mockExams = [],
  studySessions = [],
  users = []
}) {
  const { isDark } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const { levelInfo, streakTierInfo, stats, unlockedBadges, xp } = gamification;

  return (
    <>
      <div
        className="card-elevated"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))'
            : 'linear-gradient(135deg, #ffffff, #f8fafc)',
          borderRadius: 20,
          padding: '1.25rem 1.5rem',
          border: isDark ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        {/* Ambient Top Glow */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: levelInfo.color || '#6366f1',
            opacity: isDark ? 0.15 : 0.08,
            filter: 'blur(35px)',
            pointerEvents: 'none'
          }}
        />

        {/* Header Row: Level + Streak + Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          {/* Level & Rank Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: levelInfo.bgGradient || 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                boxShadow: `0 6px 18px ${levelInfo.color}40`,
                border: '2px solid rgba(255,255,255,0.25)',
                flexShrink: 0
              }}
            >
              {levelInfo.icon}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  {levelInfo.title}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: 8,
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    color: levelInfo.color
                  }}
                >
                  Lv. {levelInfo.level}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', marginTop: 2 }}>
                Toplam <strong style={{ color: levelInfo.color }}>{xp.toLocaleString('tr-TR')} XP</strong>
              </div>
            </div>
          </div>

          {/* Streak & Multiplier Pill + Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Streak Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 12,
                background: stats.dailyStreak > 0
                  ? (isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7')
                  : (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                border: stats.dailyStreak > 0
                  ? '1.5px solid rgba(245, 158, 11, 0.35)'
                  : '1.5px solid var(--color-border)',
                color: stats.dailyStreak > 0 ? '#d97706' : 'var(--color-text-muted)',
                fontWeight: 900,
                fontSize: '0.82rem'
              }}
              title="Günlük Kesintisiz Seri ve Çarpan"
            >
              <Flame size={16} className={stats.dailyStreak > 0 ? 'text-amber-500 animate-pulse' : ''} />
              <span>{stats.dailyStreak} Gün Seri</span>
              {streakTierInfo?.multiplier > 1.0 && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    background: '#f59e0b',
                    color: '#ffffff',
                    padding: '1px 6px',
                    borderRadius: 6,
                    fontWeight: 900
                  }}
                >
                  {streakTierInfo.multiplier}x XP
                </span>
              )}
            </div>

            {/* Leaderboard / Badges Trigger */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-gradient"
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Trophy size={15} />
              <span>Rozetler & Liderlik</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Level Progress Bar Row */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 5 }}>
            <span>Sonraki Rütbe: <strong style={{ color: 'var(--color-text)' }}>{levelInfo.nextTierTitle}</strong></span>
            <span>%{levelInfo.progressPercent} ({levelInfo.inTierXp} / {levelInfo.tierSpan} XP)</span>
          </div>

          <div
            style={{
              width: '100%',
              height: 9,
              borderRadius: 99,
              background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${levelInfo.progressPercent}%`,
                background: levelInfo.bgGradient || 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: 99,
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: `0 0 12px ${levelInfo.color}80`
              }}
            />
          </div>
        </div>

        {/* 🌟 MOTİVE EDİCİ GÜNLÜK SERİ & ÇARPAN BİLGİ ŞERİDİ */}
        <div
          style={{
            padding: '0.65rem 0.95rem',
            borderRadius: 12,
            background: stats.isTodaySolved
              ? (isDark ? 'rgba(34, 197, 94, 0.12)' : '#f0fdf4')
              : (isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb'),
            border: stats.isTodaySolved
              ? '1px solid rgba(34, 197, 94, 0.3)'
              : '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {stats.isTodaySolved ? (
              <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <Flame size={16} className="text-amber-500 animate-pulse flex-shrink-0" />
            )}
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: stats.isTodaySolved ? (isDark ? '#86efac' : '#15803d') : (isDark ? '#fcd34d' : '#b45309') }}>
              {streakTierInfo?.statusText}
            </span>
          </div>

          {streakTierInfo?.nextTier && (
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Sonraki Bonus: <strong>{streakTierInfo.nextTier.title} ({streakTierInfo.nextTier.multiplier}x)</strong></span>
              <span style={{ color: '#f59e0b', fontWeight: 900 }}>• {streakTierInfo.daysToNext} Gün Kaldı</span>
            </div>
          )}
        </div>

        {/* Mini Unlocked Badges Shelf */}
        {unlockedBadges.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2, borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
              Rozetler ({unlockedBadges.length}):
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {unlockedBadges.slice(0, 5).map(b => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 8,
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: 'var(--color-text)',
                    whiteSpace: 'nowrap'
                  }}
                  title={b.desc}
                >
                  <span>{b.icon}</span>
                  <span>{b.title}</span>
                </div>
              ))}
              {unlockedBadges.length > 5 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                  +{unlockedBadges.length - 5}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Modal */}
      {isModalOpen && (
        <GamificationModal
          student={student}
          submissions={submissions}
          homeworks={homeworks}
          books={books}
          bookTests={bookTests}
          mockExams={mockExams}
          studySessions={studySessions}
          users={users}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
