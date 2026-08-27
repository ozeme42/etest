import React from 'react';
import { Award, CheckCircle2, XCircle, Clock, Eye, X, Layers } from 'lucide-react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { isSectionOpenEnded } from '../utils/quizTypeDetector';

/**
 * QuizResultModal
 * Single, unified, beautifully styled exam result modal.
 * Supports both Single Assignments and Composite Multi-Section Assignments.
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

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: isMobile ? '0.75rem' : '1.25rem'
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: isMobile ? '1.25rem' : '1.5rem',
        maxWidth: isMultiSection ? '560px' : '480px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: isMobile ? '1.5rem 1.25rem' : '2rem',
        boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
        textAlign: 'center',
        position: 'relative',
        border: '1.5px solid var(--color-border)'
      }}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-text)'
          }}
        >
          <X size={17} />
        </button>

        {/* Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: isPureOpenEnded ? 'rgba(124,58,237,0.15)' : 'rgba(99,102,241,0.15)',
          color: isPureOpenEnded ? '#a78bfa' : '#6366f1',
          border: `2px solid ${isPureOpenEnded ? 'rgba(167,139,250,0.4)' : 'rgba(99,102,241,0.4)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          fontSize: '1.75rem'
        }}>
          {isPureOpenEnded ? '⏳' : <Award size={32} />}
        </div>

        {/* Title & Subtitle */}
        <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.4rem', fontWeight: 900, color: 'var(--color-text)', margin: '0 0 0.35rem' }}>
          {isPureOpenEnded ? 'Değerlendirmeye Gönderildi!' : title}
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--color-text-muted)', margin: '0 0 1.25rem', lineHeight: 1.45 }}>
          {isPureOpenEnded
            ? 'Cevaplarınız başarıyla kaydedildi ve öğretmen değerlendirmesine iletildi.'
            : 'Sınavınızı başarıyla tamamladınız. İşte detaylı karneniz:'}
        </p>

        {/* Score & Key Metrics Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          borderRadius: '1.15rem',
          padding: '1.25rem',
          color: '#ffffff',
          marginBottom: '1.25rem',
          boxShadow: '0 6px 20px rgba(15,23,42,0.25)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', textAlign: 'center', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>DOĞRU</span>
              <span style={{ fontSize: isMobile ? '1.2rem' : '1.35rem', fontWeight: 900, color: '#4ade80' }}>
                {isPureOpenEnded ? '-' : (stats.correct ?? 0)}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>YANLIŞ</span>
              <span style={{ fontSize: isMobile ? '1.2rem' : '1.35rem', fontWeight: 900, color: '#f87171' }}>
                {isPureOpenEnded ? '-' : (stats.wrong ?? 0)}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>BOŞ</span>
              <span style={{ fontSize: isMobile ? '1.2rem' : '1.35rem', fontWeight: 900, color: '#cbd5e1' }}>
                {stats.blank ?? submission?.blankCount ?? 0}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>BAŞARI</span>
              <span style={{
                fontSize: isPureOpenEnded ? '0.75rem' : (isMobile ? '1.2rem' : '1.35rem'),
                fontWeight: 900,
                color: isPureOpenEnded ? '#c084fc' : '#60a5fa',
                display: 'block',
                lineHeight: 1.2
              }}>
                {isPureOpenEnded ? 'Değerlendirmede' : `%${stats.score ?? submission?.score ?? 0}`}
              </span>
            </div>
          </div>

          {/* Pending Open-Ended badge in mixed exams */}
          {!isPureOpenEnded && stats.pending > 0 && (
            <div style={{
              marginTop: '0.75rem',
              paddingTop: '0.65rem',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#d8b4fe'
            }}>
              <Clock size={13} />
              <span>{stats.pending} Açık Uçlu Soru Öğretmen Değerlendirmesinde</span>
            </div>
          )}
        </div>

        {/* If pure open ended, also show informative note */}
        {isPureOpenEnded && (
          <div style={{
            background: 'rgba(124, 58, 237, 0.08)',
            border: '1.5px solid rgba(167, 139, 250, 0.35)',
            borderRadius: '1rem',
            padding: '0.9rem 1.1rem',
            marginBottom: '1.25rem',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a78bfa', fontWeight: 900, fontSize: '0.88rem' }}>
              <Clock size={16} /> Öğretmen Değerlendirmesi Bekleniyor
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
              Yazılı açık uçlu sınavınız başarıyla sisteme iletildi. Öğretmeniniz yanıtlarınızı inceleyip notlandırdıktan sonra nihai karneniz ve başarı yüzdeniz güncellenecektir.
            </p>
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '0.85rem',
              borderRadius: '0.85rem',
              border: '1.5px solid var(--color-border-input)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            Kapat & Çık
          </button>
          {handleReview && (
            <button
              onClick={handleReview}
              style={{
                flex: 1.2,
                minWidth: '150px',
                padding: '0.85rem',
                borderRadius: '0.85rem',
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Eye size={16} /> Sınavı İncele
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
