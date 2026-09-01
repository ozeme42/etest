import React, { useState, useMemo } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTheme } from '../../../context/ThemeContext';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Trophy,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import ImageLightbox from '../common/ImageLightbox';

/**
 * RemedialQuizReview
 * Dedicated, ultra-clean review and deep mistake analysis screen for Custom Remedial Tests ("Özel Telafi Testi").
 */
export default function RemedialQuizReview({
  test = {},
  questions = [],
  submission = {},
  onClose,
  onRetake
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { isDark } = useTheme();

  // Normalize questions & answers from submission
  const reviewQuestions = useMemo(() => {
    const rawSubAnswers = submission.answers || submission.raw_data?.answers || [];
    const cleanSubAns = Array.isArray(rawSubAnswers) ? rawSubAnswers.filter(a => a && a.type !== 'metadata') : [];

    const baseQuestions = (Array.isArray(questions) && questions.length > 0)
      ? questions
      : (Array.isArray(test.questions) && test.questions.length > 0 ? test.questions : cleanSubAns);

    return baseQuestions.map((q, idx) => {
      const qNo = idx + 1;
      const subAns = cleanSubAns.find(a => (a.questionNo === qNo || a.questionNoInSection === qNo)) || cleanSubAns[idx] || {};

      let uAnsLetter = subAns.userAnswer ?? subAns.selectedOption ?? q.userAnswer ?? null;
      if (typeof uAnsLetter === 'number') {
        uAnsLetter = String.fromCharCode(65 + uAnsLetter);
      }

      let cAnsLetter = subAns.correctAnswer ?? subAns.correctAnswerLetter ?? q.correctAnswer ?? q.correctAnswerLetter ?? q.answer ?? q.correctOption ?? null;
      if (typeof cAnsLetter === 'number') {
        cAnsLetter = String.fromCharCode(65 + cAnsLetter);
      }

      const isBlank = !uAnsLetter || uAnsLetter === 'Boş' || uAnsLetter === 'EMPTY' || uAnsLetter === 'empty';
      let isCorrect = subAns.isCorrect;
      if (isCorrect === undefined || isCorrect === null) {
        if (!isBlank && uAnsLetter && cAnsLetter) {
          isCorrect = String(uAnsLetter).trim().toUpperCase() === String(cAnsLetter).trim().toUpperCase();
        } else {
          isCorrect = false;
        }
      }

      // Images
      const imgList = [];
      if (Array.isArray(subAns.imageUrls)) imgList.push(...subAns.imageUrls);
      if (subAns.imageUrl) imgList.push(subAns.imageUrl);
      if (Array.isArray(q.imageUrls)) imgList.push(...q.imageUrls);
      if (Array.isArray(q.images)) imgList.push(...q.images);
      if (q.imageUrl) imgList.push(q.imageUrl);
      if (q.image) imgList.push(q.image);

      return {
        ...q,
        globalIndex: idx,
        displayQNo: qNo,
        userAnsLetter: isBlank ? 'Boş' : String(uAnsLetter).toUpperCase(),
        correctAnsLetter: cAnsLetter ? String(cAnsLetter).toUpperCase() : '—',
        isCorrect: Boolean(isCorrect),
        isBlank: Boolean(isBlank),
        images: Array.from(new Set(imgList.filter(Boolean))),
        unitName: subAns.metadata?.unitName || q.unitName || '',
        testName: subAns.metadata?.testName || q.testName || '',
        originalQNo: subAns.metadata?.originalQNo || q.originalQNo || q.qNo,
        optCount: Number(q.optionsCount || 4)
      };
    });
  }, [test, questions, submission]);

  const totalCount = reviewQuestions.length;
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [lightboxImg, setLightboxImg] = useState(null);

  // Overall Stats
  const stats = useMemo(() => {
    let d = 0;
    let y = 0;
    let b = 0;
    reviewQuestions.forEach(q => {
      if (q.isBlank) b++;
      else if (q.isCorrect) d++;
      else y++;
    });
    const pct = totalCount > 0 ? Math.round((d / totalCount) * 100) : 0;
    const net = Math.max(0, d - (y * 0.25));
    return { d, y, b, pct, net };
  }, [reviewQuestions, totalCount]);

  const activeQuestion = reviewQuestions[activeQIdx] || reviewQuestions[0] || {};
  const defaultOptions = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div style={{
      height: '100vh',
      maxHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      overflow: 'hidden'
    }}>
      {/* ── 🌟 TOP HEADER ── */}
      <header style={{
        height: '62px',
        padding: isMobile ? '0 0.75rem' : '0 1.5rem',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 40,
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        {/* Left: Back & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '0.65rem',
              border: '1.5px solid var(--color-border-input)',
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="İncelemeyi Kapat"
          >
            <ArrowLeft size={18} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontSize: isMobile ? '0.88rem' : '1.02rem',
              fontWeight: 900,
              color: 'var(--color-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {test.title || test.name || 'Özel Telafi Testi'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                background: 'rgba(99,102,241,0.12)',
                color: '#4f46e5',
                padding: '0.1rem 0.45rem',
                borderRadius: '0.35rem',
                border: '1px solid rgba(99,102,241,0.3)'
              }}>
                🔍 Telafi Sınavı İnceleme & Analiz
              </span>
            </div>
          </div>
        </div>

        {/* Right: Score Badges & Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.65rem', flexShrink: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '0.55rem',
            background: stats.pct >= 70 ? '#dcfce7' : (stats.pct >= 40 ? '#fef3c7' : '#fee2e2'),
            color: stats.pct >= 70 ? '#15803d' : (stats.pct >= 40 ? '#b45309' : '#b91c1c'),
            fontWeight: 900,
            fontSize: '0.82rem'
          }}>
            <Trophy size={14} />
            <span>%{stats.pct} Başarı</span>
          </div>

          <div style={{ display: isMobile ? 'none' : 'flex', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 800 }}>
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.55rem', borderRadius: '0.45rem' }}>
              {stats.d} Doğru
            </span>
            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.55rem', borderRadius: '0.45rem' }}>
              {stats.y} Yanlış
            </span>
            <span style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', padding: '0.2rem 0.55rem', borderRadius: '0.45rem', border: '1px solid var(--color-border)' }}>
              {stats.b} Boş
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: isMobile ? '0.4rem 0.75rem' : '0.45rem 1rem',
              borderRadius: '0.65rem',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79,70,229,0.3)'
            }}
          >
            Tamamla
          </button>
        </div>
      </header>

      {/* ── 🌟 MAIN REVIEW BODY ── */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        overflow: 'hidden'
      }}>
        {/* ── LEFT: QUESTION DETAIL REVIEW (68%) ── */}
        <div style={{
          flex: isMobile ? 1 : '1 1 68%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--color-bg)',
          borderRight: isMobile ? 'none' : '1px solid var(--color-border)'
        }}>
          {/* Question Nav Strip */}
          <div style={{
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            padding: isMobile ? '0.45rem 0.65rem' : '0.55rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexShrink: 0
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
              <b style={{ color: '#4f46e5' }}>{activeQIdx + 1}</b> / {totalCount} Soru İncelemesi
            </div>

            {/* Question Bubbles Carousel */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              padding: '0.1rem 0',
              flex: 1,
              justifyContent: isMobile ? 'flex-start' : 'center'
            }}>
              {reviewQuestions.map((q, idx) => {
                const qNo = idx + 1;
                const isCurrent = activeQIdx === idx;

                let bBg = 'var(--color-surface-hover)';
                let bBorder = '1px solid var(--color-border-input)';
                let bColor = 'var(--color-text-muted)';

                if (q.isBlank) {
                  bBg = 'var(--color-surface)';
                  bBorder = '1px solid var(--color-border)';
                  bColor = 'var(--color-text-muted)';
                } else if (q.isCorrect) {
                  bBg = 'rgba(22, 163, 74, 0.15)';
                  bBorder = '1.5px solid #16a34a';
                  bColor = '#16a34a';
                } else {
                  bBg = 'rgba(220, 38, 38, 0.15)';
                  bBorder = '1.5px solid #dc2626';
                  bColor = '#dc2626';
                }

                if (isCurrent) {
                  bBorder = '2.5px solid #4f46e5';
                  bColor = '#4f46e5';
                  bBg = 'rgba(79,70,229,0.18)';
                }

                return (
                  <button
                    key={qNo}
                    type="button"
                    onClick={() => setActiveQIdx(idx)}
                    style={{
                      width: isMobile ? '28px' : '32px',
                      height: isMobile ? '28px' : '32px',
                      borderRadius: '50%',
                      border: bBorder,
                      background: bBg,
                      color: bColor,
                      fontWeight: 900,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isCurrent ? '0 2px 8px rgba(79,70,229,0.35)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Soru ${qNo}`}
                  >
                    {q.isBlank ? qNo : (q.isCorrect ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Question Main Card */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '0.75rem' : '1.25rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '900px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {/* Question Header Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '0.75rem',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '0.5rem',
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 900
                  }}>
                    SORU {activeQIdx + 1}
                  </span>
                  {activeQuestion.unitName && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                      📌 {activeQuestion.unitName}
                    </span>
                  )}
                  {activeQuestion.testName && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      • {activeQuestion.testName} {activeQuestion.originalQNo ? `(S.${activeQuestion.originalQNo})` : ''}
                    </span>
                  )}
                </div>

                {/* Status Evaluation Pill */}
                {activeQuestion.isBlank ? (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    background: 'var(--color-surface-hover)',
                    color: 'var(--color-text-muted)',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '0.45rem',
                    border: '1px solid var(--color-border)'
                  }}>
                    — Boş Bırakıldı (Doğru: {activeQuestion.correctAnsLetter})
                  </span>
                ) : activeQuestion.isCorrect ? (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '0.45rem',
                    border: '1px solid #86efac',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <CheckCircle2 size={14} /> Doğru Cevap ({activeQuestion.userAnsLetter})
                  </span>
                ) : (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    background: '#fee2e2',
                    color: '#b91c1c',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '0.45rem',
                    border: '1px solid #fca5a5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <XCircle size={14} /> Yanlış (Senin: {activeQuestion.userAnsLetter} • Doğru: {activeQuestion.correctAnsLetter})
                  </span>
                )}
              </div>

              {/* Question Image Box */}
              <div style={{
                position: 'relative',
                background: isDark ? '#18181b' : '#ffffff',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1rem',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '260px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}>
                {activeQuestion.images && activeQuestion.images.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', alignItems: 'center' }}>
                    {activeQuestion.images.map((imgUrl, i) => (
                      <div key={i} style={{ position: 'relative', maxWidth: '100%' }}>
                        <img
                          src={imgUrl}
                          alt={`Soru ${activeQIdx + 1}`}
                          style={{
                            maxWidth: '100%',
                            maxHeight: isMobile ? '380px' : '480px',
                            objectFit: 'contain',
                            borderRadius: '0.5rem',
                            display: 'block',
                            margin: '0 auto',
                            cursor: 'zoom-in'
                          }}
                          onClick={() => setLightboxImg(imgUrl)}
                        />
                        <button
                          type="button"
                          onClick={() => setLightboxImg(imgUrl)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '32px',
                            height: '32px',
                            borderRadius: '0.5rem',
                            background: 'rgba(0,0,0,0.65)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Büyüt"
                        >
                          <Maximize2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <BookOpen size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>
                      {activeQuestion.questionText || activeQuestion.title || `Soru ${activeQIdx + 1}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Option Review Analysis Bar */}
              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1rem',
                padding: isMobile ? '0.75rem' : '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  Şık Değerlendirmesi:
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.65rem' }}>
                  {defaultOptions.slice(0, activeQuestion.optCount || 4).map((letter) => {
                    const isUserChoice = activeQuestion.userAnsLetter === letter;
                    const isCorrectAnswer = activeQuestion.correctAnsLetter === letter;

                    let btnBg = 'var(--color-surface)';
                    let btnBorder = '1.5px solid var(--color-border-input)';
                    let btnColor = 'var(--color-text)';

                    if (isUserChoice) {
                      if (activeQuestion.isCorrect) {
                        btnBg = '#16a34a';
                        btnBorder = '2.5px solid #16a34a';
                        btnColor = '#ffffff';
                      } else {
                        btnBg = '#dc2626';
                        btnBorder = '2.5px solid #dc2626';
                        btnColor = '#ffffff';
                      }
                    } else if (isCorrectAnswer) {
                      btnBg = '#dcfce7';
                      btnBorder = '2.5px solid #16a34a';
                      btnColor = '#15803d';
                    }

                    return (
                      <div
                        key={letter}
                        style={{
                          width: isMobile ? '44px' : '50px',
                          height: isMobile ? '44px' : '50px',
                          borderRadius: '0.75rem',
                          border: btnBorder,
                          background: btnBg,
                          color: btnColor,
                          fontSize: isMobile ? '1rem' : '1.1rem',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: (isUserChoice || isCorrectAnswer) ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                        }}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stepper Navigation */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '0.25rem',
                gap: '0.75rem'
              }}>
                <button
                  type="button"
                  disabled={activeQIdx === 0}
                  onClick={() => setActiveQIdx(prev => Math.max(0, prev - 1))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: isMobile ? '0.5rem 0.85rem' : '0.65rem 1.25rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid var(--color-border-input)',
                    background: activeQIdx === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                    color: activeQIdx === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                    fontSize: isMobile ? '0.8rem' : '0.88rem',
                    fontWeight: 800,
                    cursor: activeQIdx === 0 ? 'not-allowed' : 'pointer',
                    opacity: activeQIdx === 0 ? 0.5 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ChevronLeft size={18} />
                  <span>Önceki Soru</span>
                </button>

                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                  {activeQIdx + 1} / {totalCount}
                </div>

                <button
                  type="button"
                  disabled={activeQIdx >= totalCount - 1}
                  onClick={() => setActiveQIdx(prev => Math.min(totalCount - 1, prev + 1))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: isMobile ? '0.5rem 0.95rem' : '0.65rem 1.35rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: activeQIdx >= totalCount - 1 ? 'var(--color-surface-hover)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: activeQIdx >= totalCount - 1 ? 'var(--color-text-muted)' : '#ffffff',
                    fontSize: isMobile ? '0.8rem' : '0.88rem',
                    fontWeight: 900,
                    cursor: activeQIdx >= totalCount - 1 ? 'not-allowed' : 'pointer',
                    opacity: activeQIdx >= totalCount - 1 ? 0.5 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>Sonraki Soru</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: COMPLETE OPTICAL EVALUATION SHEET (32%) ── */}
        <aside style={{
          width: isMobile ? '100%' : '32%',
          minWidth: isMobile ? 'auto' : '300px',
          maxWidth: isMobile ? 'none' : '360px',
          height: isMobile ? 'auto' : '100%',
          maxHeight: isMobile ? '240px' : 'none',
          background: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          {/* Header */}
          <div style={{
            padding: '0.85rem 1rem',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📋 Optik Değerlendirme
            </h3>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 900,
              background: stats.pct >= 50 ? '#dcfce7' : '#fee2e2',
              color: stats.pct >= 50 ? '#15803d' : '#b91c1c',
              padding: '0.2rem 0.55rem',
              borderRadius: '0.4rem'
            }}>
              %{stats.pct} Başarı
            </span>
          </div>

          {/* Rows */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            {reviewQuestions.map((q, idx) => {
              const qNo = idx + 1;
              const isCurrent = activeQIdx === idx;

              let rowBg = 'var(--color-surface)';
              let rowBorder = '1px solid var(--color-border)';

              if (q.isBlank) {
                rowBg = 'var(--color-surface-hover)';
              } else if (q.isCorrect) {
                rowBg = 'rgba(22, 163, 74, 0.08)';
                rowBorder = '1px solid rgba(22, 163, 74, 0.3)';
              } else {
                rowBg = 'rgba(220, 38, 38, 0.08)';
                rowBorder = '1px solid rgba(220, 38, 38, 0.3)';
              }

              if (isCurrent) {
                rowBorder = '1.5px solid #4f46e5';
              }

              return (
                <div
                  key={qNo}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '0.6rem',
                    background: rowBg,
                    border: rowBorder,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Number & Status */}
                  <div
                    onClick={() => setActiveQIdx(idx)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                    title="Bu soruyu sol ekranda göster"
                  >
                    <span style={{
                      fontSize: '0.84rem',
                      fontWeight: 900,
                      color: isCurrent ? '#4f46e5' : (q.isCorrect ? '#16a34a' : (q.isBlank ? 'var(--color-text-muted)' : '#dc2626')),
                      minWidth: '22px'
                    }}>
                      {qNo}.
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>
                      {q.isBlank ? (
                        <span style={{ color: 'var(--color-text-muted)' }}>Boş</span>
                      ) : q.isCorrect ? (
                        <span style={{ color: '#16a34a' }}>✓</span>
                      ) : (
                        <span style={{ color: '#dc2626' }}>✗</span>
                      )}
                    </span>
                  </div>

                  {/* Bubbles */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {defaultOptions.slice(0, q.optCount || 4).map((letter) => {
                      const isUserChoice = q.userAnsLetter === letter;
                      const isCorrectAnswer = q.correctAnsLetter === letter;

                      let btnBg = 'var(--color-surface)';
                      let btnBorder = '1.5px solid var(--color-border-input)';
                      let btnColor = 'var(--color-text)';

                      if (isUserChoice) {
                        if (q.isCorrect) {
                          btnBg = '#16a34a';
                          btnBorder = '2px solid #16a34a';
                          btnColor = '#ffffff';
                        } else {
                          btnBg = '#dc2626';
                          btnBorder = '2px solid #dc2626';
                          btnColor = '#ffffff';
                        }
                      } else if (isCorrectAnswer && !q.isCorrect) {
                        btnBg = '#dcfce7';
                        btnBorder = '2px solid #16a34a';
                        btnColor = '#15803d';
                      }

                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => setActiveQIdx(idx)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: btnBg,
                            border: btnBorder,
                            color: btnColor,
                            fontWeight: 900,
                            fontSize: '0.76rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.12s ease'
                          }}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <ImageLightbox
          imageUrl={lightboxImg}
          onClose={() => setLightboxImg(null)}
        />
      )}
    </div>
  );
}
