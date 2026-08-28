import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy, Flame, Award, ChevronRight, Zap, Star, Shield,
  Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import { computeStudentGamificationData } from '../../services/gamificationService';
import GamificationModal from './GamificationModal';
import { useTheme } from '../../context/ThemeContext';

const StudentGamificationCard = React.memo(function StudentGamificationCard({
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

  const { levelInfo, streakTierInfo, stats, unlockedBadges, xp } = gamification;

  return (
    <>
      <div
        className="card-elevated"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))'
            : 'linear-gradient(135deg, #ffffff, #f8fafc)',
          borderRadius: isMobile ? 16 : 20,
          padding: isMobile ? '0.75rem 0.95rem' : '1.15rem 1.45rem',
          border: isDark ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 8 : 12,
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.04)'
        }}
      >
        {/* Ambient Top Glow */}
        <div
          style={{
            position: 'absolute',
            top: -30,
            right: -30,
            width: isMobile ? 90 : 130,
            height: isMobile ? 90 : 130,
            borderRadius: '50%',
            background: levelInfo.color || '#6366f1',
            opacity: isDark ? 0.15 : 0.08,
            filter: 'blur(30px)',
            pointerEvents: 'none'
          }}
        />

        {/* ── 1. ÜST SATIR: RÜTBE + SEVİYE + SERİ + BUTON ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {/* Sol: İkon + Başlık + XP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, minWidth: 0 }}>
            <div
              style={{
                width: isMobile ? 36 : 46,
                height: isMobile ? 36 : 46,
                borderRadius: isMobile ? 12 : 15,
                background: levelInfo.bgGradient || 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.3rem' : '1.6rem',
                boxShadow: `0 4px 12px ${levelInfo.color}35`,
                border: '2px solid rgba(255,255,255,0.25)',
                flexShrink: 0
              }}
            >
              {levelInfo.icon}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
                <span style={{ fontSize: isMobile ? '0.92rem' : '1.05rem', fontWeight: 900, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {levelInfo.title}
                </span>
                <span
                  style={{
                    fontSize: isMobile ? '0.66rem' : '0.72rem',
                    fontWeight: 900,
                    padding: isMobile ? '1px 5px' : '2px 7px',
                    borderRadius: 6,
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    color: levelInfo.color,
                    flexShrink: 0
                  }}
                >
                  Lv. {levelInfo.level}
                </span>
              </div>
              <div style={{ fontSize: isMobile ? '0.72rem' : '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', marginTop: 1 }}>
                <strong style={{ color: levelInfo.color }}>{xp.toLocaleString('tr-TR')} XP</strong>
              </div>
            </div>
          </div>

          {/* Sağ: Seri Rozeti + Rozetler & Liderlik Butonu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Seri Rozeti */}
            <div
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: isMobile ? '4px 8px' : '6px 11px',
                borderRadius: 10,
                background: stats.dailyStreak > 0
                  ? (isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7')
                  : (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                border: stats.dailyStreak > 0
                  ? '1px solid rgba(245, 158, 11, 0.35)'
                  : '1px solid var(--color-border)',
                color: stats.dailyStreak > 0 ? '#d97706' : 'var(--color-text-muted)',
                fontWeight: 900,
                fontSize: isMobile ? '0.74rem' : '0.8rem',
                cursor: 'pointer'
              }}
              title="Günlük Kesintisiz Seri"
            >
              <Flame size={isMobile ? 14 : 16} className={stats.dailyStreak > 0 ? 'text-amber-500 animate-pulse' : ''} />
              <span>{stats.dailyStreak} Gün</span>
              {streakTierInfo?.multiplier > 1.0 && (
                <span style={{ fontSize: '0.65rem', background: '#f59e0b', color: '#ffffff', padding: '0 4px', borderRadius: 4, fontWeight: 900 }}>
                  {streakTierInfo.multiplier}x
                </span>
              )}
            </div>

            {/* Rozetler & Liderlik Butonu */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-gradient"
              style={{
                padding: isMobile ? '5px 10px' : '6px 13px',
                fontSize: isMobile ? '0.74rem' : '0.8rem',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Trophy size={isMobile ? 13 : 15} />
              <span>{isMobile ? 'Rozetler' : 'Rozetler & Liderlik'}</span>
              <ChevronRight size={isMobile ? 12 : 14} />
            </button>
          </div>
        </div>

        {/* ── 2. İLERLEME ÇUBUĞU ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '0.68rem' : '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 4 }}>
            <span>Sonraki: <strong style={{ color: 'var(--color-text)' }}>{levelInfo.nextTierTitle}</strong> (%{levelInfo.progressPercent})</span>
            <span>{levelInfo.inTierXp} / {levelInfo.tierSpan} XP</span>
          </div>

          <div
            style={{
              width: '100%',
              height: isMobile ? 6 : 8,
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
                boxShadow: `0 0 10px ${levelInfo.color}80`
              }}
            />
          </div>
        </div>

        {/* ── 3. KOMPAKT SERİ BİLGİSİ & MİNİ ROZET SAYACI (TEK SATIR) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            fontSize: isMobile ? '0.7rem' : '0.75rem',
            paddingTop: isMobile ? 2 : 4,
            borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)'
          }}
        >
          {/* Sol: Seri Koruma Durumu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            {stats.isTodaySolved ? (
              <>
                <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                <span style={{ fontWeight: 800, color: isDark ? '#86efac' : '#15803d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isMobile ? `Bugün korundu (+${streakTierInfo?.dailyBonusXp} XP)` : streakTierInfo?.statusText}
                </span>
              </>
            ) : (
              <>
                <Flame size={13} className="text-amber-500 animate-pulse flex-shrink-0" />
                <span style={{ fontWeight: 800, color: isDark ? '#fcd34d' : '#b45309', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isMobile ? 'Serini korumak için bugün 1 test çöz!' : streakTierInfo?.statusText}
                </span>
              </>
            )}
          </div>

          {/* Sağ: Rozetler Sayacı Linki */}
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: isMobile ? '0.68rem' : '0.74rem',
              fontWeight: 800,
              color: 'var(--color-text-muted)',
              flexShrink: 0,
              padding: 0
            }}
          >
            <span>🎖️ {unlockedBadges.length} Rozet</span>
            <ChevronRight size={12} />
          </button>
        </div>
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
});

export default StudentGamificationCard;
