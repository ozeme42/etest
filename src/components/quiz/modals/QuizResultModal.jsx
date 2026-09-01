import React from 'react';
import { Award, CheckCircle2, XCircle, Clock, Eye, X, Layers, Trophy, Sparkles, Flame, HelpCircle, ArrowRight, RotateCcw, Target } from 'lucide-react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTheme } from '../../../context/ThemeContext';
import { isSectionOpenEnded, isMultipleChoice } from '../utils/quizTypeDetector';

/**
 * QuizResultModal
 * Ultra-modern, premium glassmorphism exam result card.
 * Supports Single Assignments, Remedial/Mistake Tests, and Composite Multi-Section Exams.
 */
export default function QuizResultModal({
  isOpen,
  title = 'Sınav Sonucu',
  stats = { correct: 0, wrong: 0, blank: 0, pending: 0, score: 0, net: 0, total: 1 },
  isOpenEnded = false,
  submission,
  test,
  sectionBreakdown = [],
  onClose,
  onReview,
  onConfirmClose,
  onConfirmReview
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const handleClose = onConfirmClose || onClose;
  const handleReview = onConfirmReview || onReview;

  const isMultiSection = Array.isArray(sectionBreakdown) && sectionBreakdown.length > 1;

  const hasMultipleChoiceAnswers = Array.isArray(submission?.answers) && submission.answers.some(a => 
    typeof a.userAnswer === 'number' || (typeof a.userAnswer === 'string' && /^[A-Ea-e0-4]$/.test(String(a.userAnswer).trim()))
  );

  const hasScoreOrGrading = (Number(stats.correct) > 0 || Number(stats.wrong) > 0 || (stats.score !== undefined && stats.score !== null && Number(stats.score) > 0));

  const isExplicitMultipleChoice = isMultipleChoice(test) ||
    test?.type === 'coktan_secmeli' ||
    test?.questionType === 'coktan_secmeli' ||
    test?.contentType === 'coktan_secmeli' ||
    hasMultipleChoiceAnswers;

  const isPureOpenEnded = !isExplicitMultipleChoice && !hasScoreOrGrading && Boolean(
    isOpenEnded ||
    submission?.isOpenEnded ||
    submission?.test?.isOpenEnded ||
    isSectionOpenEnded(test) ||
    test?.type === 'acik_uclu' ||
    test?.questionType === 'acik_uclu' ||
    test?.type === 'gorsel_klasik' ||
    test?.questionType === 'gorsel_klasik' ||
    (Array.isArray(sectionBreakdown) && sectionBreakdown.length > 0 && sectionBreakdown.every(s => s.isOE || s.type === 'open_ended')) ||
    (submission?.answers && submission.answers.some(a => a.isOpenEnded)) ||
    (stats.pending > 0 && stats.correct === 0 && stats.wrong === 0)
  );

  const scoreNum = Number(stats.score ?? submission?.score ?? 0);
  const correctNum = Number(stats.correct ?? 0);
  const wrongNum = Number(stats.wrong ?? 0);
  const blankNum = Number(stats.blank ?? submission?.blankCount ?? 0);
  const totalQuestions = stats.total || (correctNum + wrongNum + blankNum) || 1;
  const netScore = stats.net !== undefined ? stats.net : Math.max(0, correctNum - (wrongNum * 0.25));

  // Determine achievement mood
  let moodConfig = {
    badge: '👏 İYİ ÇABA!',
    message: 'Sonuçların kaydedildi. Yanlışlarını inceleyerek tam ustalığa ulaşabilirsin.',
    color: '#6366f1',
    bgGradient: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.05))',
    borderColor: 'rgba(99,102,241,0.3)',
    icon: <Sparkles size={28} color="#6366f1" />
  };

  if (scoreNum >= 80) {
    moodConfig = {
      badge: '🏆 HARİKA BAŞARI!',
      message: 'Tebrikler! Konuyu yüksek başarıyla tamamladın.',
      color: '#16a34a',
      bgGradient: 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(16,185,129,0.05))',
      borderColor: 'rgba(22,163,74,0.35)',
      icon: <Trophy size={30} color="#16a34a" />
    };
  } else if (scoreNum >= 50) {
    moodConfig = {
      badge: '📈 GELİŞİYOR!',
      message: 'Güzel bir ilerleme kaydettin. Kalan eksiklerini kapatmaya çok yakınsın.',
      color: '#0284c7',
      bgGradient: 'linear-gradient(135deg, rgba(2,132,199,0.15), rgba(56,189,248,0.05))',
      borderColor: 'rgba(2,132,199,0.35)',
      icon: <Target size={28} color="#0284c7" />
    };
  } else if (scoreNum < 50 && !isPureOpenEnded) {
    moodConfig = {
      badge: '💪 PEKİŞTİRME FIRSATI!',
      message: 'Yanlış yaptığın soruları inceleyerek bir sonraki tekrarda ustalığını %100 yapabilirsin!',
      color: '#f59e0b',
      bgGradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))',
      borderColor: 'rgba(245,158,11,0.35)',
      icon: <Flame size={28} color="#f59e0b" />
    };
  }

  const isRemedial = Boolean(
    test?.isRemedial || test?.isRemedialTest || test?.sourceType === 'pdfSlicerRemedial' ||
    /özel\s*telafi|telafi\s*testi/i.test(title)
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(10, 15, 30, 0.78)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: isMobile ? '0.75rem' : '1.25rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: isDark ? 'linear-gradient(180deg, #18181b 0%, #121215 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: isMobile ? '1.5rem' : '1.75rem',
        maxWidth: isMultiSection ? '580px' : '500px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: isMobile ? '1.5rem 1.15rem' : '2.25rem 2rem',
        boxShadow: isDark
          ? '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)'
          : '0 25px 60px rgba(15,23,42,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '1.1rem',
            right: '1.1rem',
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            border: 'none',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            transition: 'all 0.15s ease'
          }}
          title="Kapat"
        >
          <X size={18} />
        </button>

        {/* Hero Top Icon with Halo Glow */}
        <div style={{
          width: isMobile ? '62px' : '72px',
          height: isMobile ? '62px' : '72px',
          borderRadius: '50%',
          background: isPureOpenEnded ? 'rgba(124,58,237,0.15)' : moodConfig.bgGradient,
          border: `2px solid ${isPureOpenEnded ? 'rgba(167,139,250,0.4)' : moodConfig.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 0.85rem',
          boxShadow: isPureOpenEnded ? '0 10px 25px rgba(124,58,237,0.2)' : `0 10px 25px ${moodConfig.borderColor}`,
          transform: 'scale(1)',
          animation: 'bounceSubtle 0.5s ease-out'
        }}>
          {isPureOpenEnded ? <Clock size={32} color="#a78bfa" /> : moodConfig.icon}
        </div>

        {/* Motivational Pill Badge */}
        {!isPureOpenEnded && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            background: moodConfig.bgGradient,
            border: `1px solid ${moodConfig.borderColor}`,
            color: moodConfig.color,
            fontSize: '0.74rem',
            fontWeight: 900,
            letterSpacing: '0.04em',
            marginBottom: '0.45rem'
          }}>
            {moodConfig.badge}
          </div>
        )}

        {/* Title & Subtitle */}
        <h2 style={{
          fontSize: isMobile ? '1.2rem' : '1.4rem',
          fontWeight: 900,
          color: 'var(--color-text)',
          margin: '0 0 0.35rem',
          lineHeight: 1.3
        }}>
          {isPureOpenEnded ? 'Değerlendirmeye Gönderildi!' : title}
        </h2>
        <p style={{
          fontSize: isMobile ? '0.82rem' : '0.88rem',
          color: 'var(--color-text-muted)',
          margin: '0 0 1.35rem',
          lineHeight: 1.45,
          padding: '0 0.5rem'
        }}>
          {isPureOpenEnded
            ? 'Cevaplarınız başarıyla kaydedildi ve öğretmen değerlendirmesine iletildi.'
            : moodConfig.message}
        </p>

        {/* ── 🌟 4 LUXURY STATS GRID (Doğru, Yanlış, Boş, Başarı) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: isMobile ? '0.45rem' : '0.65rem',
          marginBottom: '1.25rem'
        }}>
          {/* DOĞRU */}
          <div style={{
            background: isDark ? 'rgba(22, 163, 74, 0.1)' : '#f0fdf4',
            border: isDark ? '1.5px solid rgba(22, 163, 74, 0.3)' : '1.5px solid #bbf7d0',
            borderRadius: '1rem',
            padding: isMobile ? '0.75rem 0.35rem' : '0.95rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#16a34a', fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 900 }}>
              <CheckCircle2 size={13} />
              <span>DOĞRU</span>
            </div>
            <span style={{ fontSize: isMobile ? '1.35rem' : '1.65rem', fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>
              {isPureOpenEnded ? '-' : correctNum}
            </span>
          </div>

          {/* YANLIŞ */}
          <div style={{
            background: isDark ? 'rgba(220, 38, 38, 0.1)' : '#fef2f2',
            border: isDark ? '1.5px solid rgba(220, 38, 38, 0.3)' : '1.5px solid #fecaca',
            borderRadius: '1rem',
            padding: isMobile ? '0.75rem 0.35rem' : '0.95rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#dc2626', fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 900 }}>
              <XCircle size={13} />
              <span>YANLIŞ</span>
            </div>
            <span style={{ fontSize: isMobile ? '1.35rem' : '1.65rem', fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>
              {isPureOpenEnded ? '-' : wrongNum}
            </span>
          </div>

          {/* BOŞ */}
          <div style={{
            background: isDark ? 'rgba(113, 113, 122, 0.1)' : '#f8fafc',
            border: isDark ? '1.5px solid rgba(113, 113, 122, 0.3)' : '1.5px solid #e2e8f0',
            borderRadius: '1rem',
            padding: isMobile ? '0.75rem 0.35rem' : '0.95rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-muted)', fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 900 }}>
              <HelpCircle size={13} />
              <span>BOŞ</span>
            </div>
            <span style={{ fontSize: isMobile ? '1.35rem' : '1.65rem', fontWeight: 900, color: 'var(--color-text-secondary)', lineHeight: 1 }}>
              {blankNum}
            </span>
          </div>

          {/* BAŞARI */}
          <div style={{
            background: isDark ? 'rgba(99, 102, 241, 0.12)' : '#eef2ff',
            border: isDark ? '1.5px solid rgba(99, 102, 241, 0.35)' : '1.5px solid #c7d2fe',
            borderRadius: '1rem',
            padding: isMobile ? '0.75rem 0.35rem' : '0.95rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#4f46e5', fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 900 }}>
              <Trophy size={13} />
              <span>BAŞARI</span>
            </div>
            <span style={{
              fontSize: isPureOpenEnded ? '0.75rem' : (isMobile ? '1.35rem' : '1.65rem'),
              fontWeight: 900,
              color: '#4f46e5',
              lineHeight: 1
            }}>
              {isPureOpenEnded ? 'Bekliyor' : `%${scoreNum}`}
            </span>
          </div>
        </div>

        {/* ── 🌟 PROGRESS & MASTERY BAR ── */}
        {!isPureOpenEnded && (
          <div style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderRadius: '1rem',
            padding: '0.85rem 1rem',
            marginBottom: '1.35rem',
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', fontSize: '0.76rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Target size={14} color="#6366f1" />
                {isRemedial ? 'Pekiştirme & Ustalık İlerlemesi' : 'Toplam Başarı Oranı'}
              </span>
              <span style={{ color: moodConfig.color, fontWeight: 900 }}>
                {correctNum} / {totalQuestions} Soru (%{scoreNum})
              </span>
            </div>

            {/* Visual Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              borderRadius: '9999px',
              background: isDark ? '#27272a' : '#e2e8f0',
              overflow: 'hidden',
              display: 'flex'
            }}>
              <div style={{
                width: `${Math.min(100, Math.max(0, scoreNum))}%`,
                background: scoreNum >= 80
                  ? 'linear-gradient(90deg, #10b981, #16a34a)'
                  : (scoreNum >= 50 ? 'linear-gradient(90deg, #3b82f6, #6366f1)' : 'linear-gradient(90deg, #f59e0b, #ef4444)'),
                borderRadius: '9999px',
                transition: 'width 0.6s ease-out'
              }} />
            </div>

            {isRemedial && wrongNum > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                💡 Kalan <b style={{ color: '#dc2626' }}>{wrongNum} yanlışı</b> sonraki aralıklı tekrarda tekrar çözerek %100 ustalığa ulaşabilirsin.
              </div>
            )}
          </div>
        )}

        {/* Section Breakdown (Only if multi-section) */}
        {isMultiSection && (
          <div style={{ textAlign: 'left', marginBottom: '1.35rem' }}>
            <h4 style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--color-text)', margin: '0 0 0.55rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={15} /> Bölüm Bazlı Sonuçlar:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {sectionBreakdown.map((sec, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--color-surface-hover)',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)', display: 'block' }}>
                      {sec.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {sec.isOE ? '✍️ Açık Uçlu / Yazılı' : `🔘 Çoktan Seçmeli (${sec.qCount} Soru)`}
                    </span>
                  </div>

                  <div>
                    {sec.isOE ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#a78bfa', background: 'rgba(124,58,237,0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', border: '1px solid rgba(167,139,250,0.3)' }}>
                        Değerlendirmede
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.82rem', fontWeight: 900, display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                        <span style={{ color: '#16a34a' }}>{sec.secDoğru} D</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>/</span>
                        <span style={{ color: '#dc2626' }}>{sec.secYanlış} Y</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>/</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{sec.secBoş ?? 0} B</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 🌟 LUXURY ACTION BUTTONS ── */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: isMobile ? '0.75rem' : '0.85rem',
              borderRadius: '0.9rem',
              border: isDark ? '1.5px solid #3f3f46' : '1.5px solid #cbd5e1',
              background: isDark ? '#27272a' : '#ffffff',
              color: 'var(--color-text)',
              fontWeight: 800,
              fontSize: isMobile ? '0.82rem' : '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Kapat & Çık
          </button>

          {handleReview && (
            <button
              onClick={handleReview}
              style={{
                flex: 1.3,
                minWidth: '160px',
                padding: isMobile ? '0.75rem' : '0.85rem',
                borderRadius: '0.9rem',
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: isMobile ? '0.84rem' : '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(79,70,229,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Eye size={17} />
              <span>Sınavı & Yanıtları İncele</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
