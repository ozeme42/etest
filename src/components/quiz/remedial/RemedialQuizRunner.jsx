import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTheme } from '../../../context/ThemeContext';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  HelpCircle,
  Maximize2,
  RotateCcw,
  Sparkles,
  Zap,
  BookOpen,
  Layers,
  Check,
  X
} from 'lucide-react';
import DrawingCanvas from '../common/DrawingCanvas';
import ImageLightbox, { extractImageUrls, isValidImageUrl } from '../common/ImageLightbox';
import QuizResultModal from '../modals/QuizResultModal';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';

/**
 * RemedialQuizRunner
 * Dedicated, ultra-clean, modern solving environment for Custom Remedial Tests ("Özel Telafi Testi").
 * Features single-question visual focus on the left and a complete optical answer sheet on the right.
 */
export default function RemedialQuizRunner({
  test = {},
  questions = [],
  onSubmit,
  onAutoSave,
  draftAnswers = null,
  onExit
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { isDark } = useTheme();

  // 1. Flatten and normalize questions from test/sections/questions
  const normalizedQuestions = useMemo(() => {
    const list = [];
    if (Array.isArray(questions) && questions.length > 0) {
      questions.forEach((q, idx) => {
        if (q && q.type !== 'metadata') {
          list.push({ ...q, originalIndex: idx });
        }
      });
    } else if (Array.isArray(test.sections) && test.sections.length > 0) {
      test.sections.forEach((sec, sIdx) => {
        const secQs = sec.resolvedQuestions || sec.questions || [sec];
        secQs.forEach((q, qIdx) => {
          if (q && q.type !== 'metadata') {
            list.push({
              ...q,
              sectionId: sec.id,
              sectionTitle: sec.title || `${sIdx + 1}. Bölüm`,
              originalIndex: list.length
            });
          }
        });
      });
    } else if (Array.isArray(test.questions) && test.questions.length > 0) {
      test.questions.forEach((q, idx) => {
        if (q && q.type !== 'metadata') {
          list.push({ ...q, originalIndex: idx });
        }
      });
    }

    if (list.length === 0) {
      const fallbackCount = test.totalQuestions || test.qCount || 1;
      for (let i = 1; i <= fallbackCount; i++) {
        list.push({
          id: `q_${i}`,
          questionNo: i,
          title: `Soru ${i}`,
          optionsCount: 4,
          originalIndex: i - 1
        });
      }
    }

    return list.map((q, idx) => {
      const qNo = idx + 1;
      // Extract images
      const imgList = [];
      if (Array.isArray(q.imageUrls)) imgList.push(...q.imageUrls);
      if (Array.isArray(q.images)) imgList.push(...q.images);
      if (q.imageUrl && isValidImageUrl(q.imageUrl)) imgList.push(q.imageUrl);
      if (q.image && isValidImageUrl(q.image)) imgList.push(q.image);
      if (q.contentPayload && isValidImageUrl(q.contentPayload)) imgList.push(...extractImageUrls(q.contentPayload));
      if (q.documentPayload && isValidImageUrl(q.documentPayload)) imgList.push(...extractImageUrls(q.documentPayload));

      const cleanImgs = Array.from(new Set(imgList.filter(isValidImageUrl)));

      // Correct answer resolution
      let cAns = q.correctAnswer ?? q.correctAnswerLetter ?? q.answer ?? q.correctOption;
      if (typeof cAns === 'string' && /^[A-E]$/i.test(cAns.trim())) {
        cAns = cAns.trim().toUpperCase().charCodeAt(0) - 65;
      } else if (typeof cAns === 'string' && !isNaN(Number(cAns))) {
        cAns = Number(cAns);
      }

      return {
        ...q,
        globalIndex: idx,
        displayQNo: qNo,
        images: cleanImgs,
        resolvedCorrectAnswer: typeof cAns === 'number' ? cAns : null,
        optCount: Number(q.optionsCount || q.optionCount || 4)
      };
    });
  }, [test, questions]);

  const totalQuestions = normalizedQuestions.length;

  // 2. Answer State Management
  const [answers, setAnswers] = useState(() => {
    const initial = {};
    if (draftAnswers) {
      if (Array.isArray(draftAnswers)) {
        draftAnswers.forEach((a, idx) => {
          if (a && a.type !== 'metadata') {
            const qNum = a.questionNo || (idx + 1);
            let uAns = a.userAnswer ?? a.selectedOption ?? a.selectedAnswer ?? a.answer;
            if (typeof uAns === 'string' && /^[A-E]$/i.test(uAns.trim())) {
              uAns = uAns.trim().toUpperCase().charCodeAt(0) - 65;
            } else if (typeof uAns === 'string' && !isNaN(Number(uAns))) {
              uAns = Number(uAns);
            }
            if (typeof uAns === 'number') initial[qNum] = uAns;
          }
        });
      } else if (typeof draftAnswers === 'object') {
        Object.keys(draftAnswers).forEach(k => {
          let uAns = draftAnswers[k];
          if (typeof uAns === 'string' && /^[A-E]$/i.test(uAns.trim())) {
            uAns = uAns.trim().toUpperCase().charCodeAt(0) - 65;
          } else if (typeof uAns === 'string' && !isNaN(Number(uAns))) {
            uAns = Number(uAns);
          }
          if (typeof uAns === 'number') initial[Number(k)] = uAns;
        });
      }
    }
    return initial;
  });

  const [activeQIdx, setActiveQIdx] = useState(0);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [overallResultStats, setOverallResultStats] = useState(null);
  const [formattedSubmission, setFormattedSubmission] = useState([]);

  // Timer: 1.5 minutes per question or configured duration
  const [timeLeft, setTimeLeft] = useState(() => {
    return (test.durationMinutes ? test.durationMinutes * 60 : Math.max(totalQuestions * 90, 300));
  });

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const answeredCount = useMemo(() => {
    return Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== null && answers[k] !== '' && answers[k] !== 'empty').length;
  }, [answers]);

  const activeQuestion = normalizedQuestions[activeQIdx] || normalizedQuestions[0] || {};

  // Handle Option Click
  const handleSelectOption = (qNo, optIdx) => {
    setAnswers(prev => {
      const current = prev[qNo];
      const nextVal = current === optIdx ? null : optIdx;
      const updated = { ...prev };
      if (nextVal === null) {
        delete updated[qNo];
      } else {
        updated[qNo] = nextVal;
      }

      if (onAutoSave) {
        onAutoSave(updated);
      }
      return updated;
    });
  };

  // Finish exam
  const handleFinishExam = () => {
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    const submissionPayload = [];

    normalizedQuestions.forEach((q, idx) => {
      const qNo = idx + 1;
      const userAnsIdx = answers[qNo];
      const hasAns = userAnsIdx !== undefined && userAnsIdx !== null;
      const userAnsLetter = hasAns ? String.fromCharCode(65 + userAnsIdx) : null;

      let isCorrect = null;
      let correctAnsLetter = null;

      if (q.resolvedCorrectAnswer !== null && q.resolvedCorrectAnswer !== undefined) {
        correctAnsLetter = String.fromCharCode(65 + q.resolvedCorrectAnswer);
        if (hasAns) {
          isCorrect = (userAnsIdx === q.resolvedCorrectAnswer);
        }
      } else if (q.correctAnswer) {
        correctAnsLetter = String(q.correctAnswer).toUpperCase();
        if (hasAns) {
          isCorrect = (userAnsLetter === correctAnsLetter);
        }
      }

      if (hasAns) {
        if (isCorrect === true) correct++;
        else wrong++;
      } else {
        blank++;
      }

      submissionPayload.push({
        questionId: q.id || `remedial_q_${qNo}`,
        questionNo: qNo,
        questionNoInSection: qNo,
        sectionId: q.sectionId || 'remedial_sec',
        sectionTitle: q.sectionTitle || 'Telafi Soruları',
        userAnswer: userAnsLetter,
        userAnswerIndex: userAnsIdx,
        isCorrect,
        correctAnswer: correctAnsLetter,
        imageUrls: q.images,
        imageUrl: q.images?.[0] || null,
        metadata: {
          bookTitle: q.bookTitle,
          testName: q.testName,
          unitName: q.unitName,
          originalQNo: q.originalQNo || q.qNo
        }
      });
    });

    const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const net = Math.max(0, correct - (wrong * 0.25));

    setOverallResultStats({
      correct,
      wrong,
      blank,
      total: totalQuestions,
      score,
      net
    });
    setFormattedSubmission(submissionPayload);
    setShowResultModal(true);
  };

  const handleConfirmClose = () => {
    setShowResultModal(false);
    if (onSubmit) onSubmit(formattedSubmission, { isCloseAction: true });
  };

  const handleConfirmReview = () => {
    setShowResultModal(false);
    if (onSubmit) onSubmit(formattedSubmission, { isReviewAction: true });
  };

  const defaultOptionLetters = ['A', 'B', 'C', 'D', 'E'];

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
      overflow: 'hidden',
      fontFamily: 'inherit'
    }}>
      {/* ── 🌟 TOP MODERN HEADER ── */}
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
        {/* Left: Exit button & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={onExit}
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
            title="Çıkış Yap"
          >
            <ArrowLeft size={18} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'nowrap' }}>
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
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.1))',
                color: '#4f46e5',
                padding: '0.1rem 0.45rem',
                borderRadius: '0.35rem',
                border: '1px solid rgba(99,102,241,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <Sparkles size={11} /> Özel Telafi & Pekiştirme
              </span>
              {!isMobile && (
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                  • {totalQuestions} Yanlış Sorudan Oluşturuldu
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Timer, Drawing Pad, Finish Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.75rem', flexShrink: 0 }}>
          {/* Timer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '0.6rem',
            background: timeLeft < 120 ? '#fee2e2' : 'var(--color-surface-hover)',
            color: timeLeft < 120 ? '#dc2626' : 'var(--color-text)',
            border: `1px solid ${timeLeft < 120 ? '#fca5a5' : 'var(--color-border)'}`,
            fontSize: isMobile ? '0.78rem' : '0.86rem',
            fontWeight: 900
          }}>
            <Clock size={15} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          {/* Drawing Canvas Toggle */}
          <button
            type="button"
            onClick={() => setIsDrawingOpen(p => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: isMobile ? '0.4rem 0.6rem' : '0.45rem 0.85rem',
              borderRadius: '0.65rem',
              border: `1.5px solid ${isDrawingOpen ? '#6366f1' : 'var(--color-border-input)'}`,
              background: isDrawingOpen ? 'rgba(99,102,241,0.12)' : 'var(--color-surface-hover)',
              color: isDrawingOpen ? '#4f46e5' : 'var(--color-text)',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Karalama Tahtasını Aç/Kapat"
          >
            <Edit3 size={15} />
            <span>{isMobile ? '' : 'Çizim'}</span>
          </button>

          {/* Finish Button */}
          <button
            type="button"
            onClick={handleFinishExam}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: isMobile ? '0.45rem 0.75rem' : '0.5rem 1.15rem',
              borderRadius: '0.65rem',
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#ffffff',
              fontSize: isMobile ? '0.78rem' : '0.86rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(22,163,74,0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckCircle2 size={16} />
            <span>{isMobile ? 'Bitir' : 'Sınavı Bitir ve Gönder'}</span>
          </button>
        </div>
      </header>

      {/* ── 🌟 MAIN TWO-PANEL SPLIT BODY ── */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        overflow: 'hidden'
      }}>
        {/* ── LEFT PANEL: QUESTION SOLVING AREA (70%) ── */}
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
            {/* Progress Badge */}
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
              <b style={{ color: '#4f46e5' }}>{activeQIdx + 1}</b> / {totalQuestions} Soru • <span style={{ color: answeredCount === totalQuestions ? '#16a34a' : 'var(--color-text-muted)' }}>{answeredCount} Yanıtlandı</span>
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
              {normalizedQuestions.map((q, idx) => {
                const qNo = idx + 1;
                const isCurrent = activeQIdx === idx;
                const isAnswered = answers[qNo] !== undefined && answers[qNo] !== null;

                let bBg = 'var(--color-surface-hover)';
                let bBorder = '1px solid var(--color-border-input)';
                let bColor = 'var(--color-text-muted)';

                if (isCurrent) {
                  bBg = 'linear-gradient(135deg, #4f46e5, #6366f1)';
                  bBorder = '2px solid #4f46e5';
                  bColor = '#ffffff';
                } else if (isAnswered) {
                  bBg = 'rgba(22, 163, 74, 0.15)';
                  bBorder = '1.5px solid #16a34a';
                  bColor = '#16a34a';
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
                    title={`Soru ${qNo}'e Geç`}
                  >
                    {isAnswered && !isCurrent ? <Check size={14} strokeWidth={3} /> : qNo}
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
            gap: '1.25rem',
            alignItems: 'center'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '900px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {/* Question Header Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                padding: '0.45rem 0.85rem',
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
                    fontWeight: 900,
                    boxShadow: '0 2px 6px rgba(79,70,229,0.25)'
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

                {answers[activeQIdx + 1] !== undefined && answers[activeQIdx + 1] !== null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      background: 'rgba(22, 163, 74, 0.15)',
                      color: '#16a34a',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '0.45rem',
                      border: '1px solid rgba(22, 163, 74, 0.3)'
                    }}>
                      ✓ Cevaplandı ({String.fromCharCode(65 + answers[activeQIdx + 1])})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectOption(activeQIdx + 1, answers[activeQIdx + 1])}
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.45rem',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-hover)',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      title="İşareti Kaldır"
                    >
                      Temizle
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                    ⏳ Henüz İşaretlenmedi
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
                      {activeQuestion.questionText || activeQuestion.title || `Soru ${activeQIdx + 1} İçeriği`}
                    </p>
                  </div>
                )}
              </div>

              {/* Large Touch Option Buttons Bar */}
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
                  Cevabınızı İşaretleyin:
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.65rem' }}>
                  {defaultOptionLetters.slice(0, activeQuestion.optCount || 4).map((letter, optIdx) => {
                    const isSelected = answers[activeQIdx + 1] === optIdx;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => handleSelectOption(activeQIdx + 1, optIdx)}
                        style={{
                          width: isMobile ? '44px' : '52px',
                          height: isMobile ? '44px' : '52px',
                          borderRadius: '0.75rem',
                          border: isSelected ? '2.5px solid #4f46e5' : '1.5px solid var(--color-border-input)',
                          background: isSelected ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'var(--color-surface-hover)',
                          color: isSelected ? '#ffffff' : 'var(--color-text)',
                          fontSize: isMobile ? '1rem' : '1.15rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSelected ? '0 4px 12px rgba(79,70,229,0.4)' : 'none',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                          touchAction: 'manipulation'
                        }}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stepper Navigation Buttons */}
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
                  {activeQIdx + 1} / {totalQuestions}
                </div>

                {activeQIdx < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveQIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: isMobile ? '0.5rem 0.95rem' : '0.65rem 1.35rem',
                      borderRadius: '0.75rem',
                      border: 'none',
                      background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                      color: '#ffffff',
                      fontSize: isMobile ? '0.8rem' : '0.88rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(79,70,229,0.3)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>Sonraki Soru</span>
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishExam}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: isMobile ? '0.5rem 0.95rem' : '0.65rem 1.35rem',
                      borderRadius: '0.75rem',
                      border: 'none',
                      background: 'linear-gradient(135deg, #16a34a, #15803d)',
                      color: '#ffffff',
                      fontSize: isMobile ? '0.8rem' : '0.88rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(22,163,74,0.3)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>Sınavı Tamamla</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: COMPLETE OPTICAL ANSWER SHEET (32%) ── */}
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
          {/* Optical Header */}
          <div style={{
            padding: '0.85rem 1rem',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1rem' }}>📋</span>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)' }}>
                Optik Cevap Kağıdı
              </h3>
            </div>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 900,
              background: answeredCount === totalQuestions ? 'rgba(22, 163, 74, 0.15)' : 'rgba(99,102,241,0.12)',
              color: answeredCount === totalQuestions ? '#16a34a' : '#4f46e5',
              padding: '0.2rem 0.55rem',
              borderRadius: '0.4rem',
              border: `1px solid ${answeredCount === totalQuestions ? 'rgba(22, 163, 74, 0.3)' : 'rgba(99,102,241,0.3)'}`
            }}>
              {answeredCount} / {totalQuestions} Kodlandı
            </span>
          </div>

          {/* Optical Rows List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            {normalizedQuestions.map((q, idx) => {
              const qNo = idx + 1;
              const isCurrent = activeQIdx === idx;
              const userAns = answers[qNo];
              const hasAns = userAns !== undefined && userAns !== null;

              let rowBg = 'var(--color-surface)';
              let rowBorder = '1px solid var(--color-border)';

              if (isCurrent) {
                rowBg = 'rgba(99,102,241,0.12)';
                rowBorder = '1.5px solid #4f46e5';
              } else if (hasAns) {
                rowBg = 'rgba(99,102,241,0.04)';
                rowBorder = '1px solid rgba(99,102,241,0.2)';
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
                  {/* Question number - click to jump */}
                  <div
                    onClick={() => setActiveQIdx(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    title="Bu soruyu sol ekranda göster"
                  >
                    <span style={{
                      fontSize: '0.84rem',
                      fontWeight: 900,
                      color: isCurrent ? '#4f46e5' : (hasAns ? '#4f46e5' : 'var(--color-text-secondary)'),
                      minWidth: '22px'
                    }}>
                      {qNo}.
                    </span>
                    {isCurrent && (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        color: '#4f46e5',
                        background: 'rgba(99,102,241,0.2)',
                        padding: '1px 5px',
                        borderRadius: 4
                      }}>
                        Aktif
                      </span>
                    )}
                  </div>

                  {/* Bubble buttons */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {defaultOptionLetters.slice(0, q.optCount || 4).map((letter, optIdx) => {
                      const isSelected = userAns === optIdx;
                      let btnBg = 'var(--color-surface)';
                      let btnBorder = '1.5px solid var(--color-border-input)';
                      let btnColor = 'var(--color-text)';

                      if (isSelected) {
                        btnBg = 'linear-gradient(135deg, #4f46e5, #6366f1)';
                        btnBorder = '2px solid #4f46e5';
                        btnColor = '#ffffff';
                      }

                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => {
                            setActiveQIdx(idx);
                            handleSelectOption(qNo, optIdx);
                          }}
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
                            transition: 'all 0.12s ease',
                            boxShadow: isSelected ? '0 2px 8px rgba(79,70,229,0.35)' : 'none',
                            touchAction: 'manipulation'
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

      {/* Global Overlay Drawing Canvas */}
      <DrawingCanvas
        isOpen={isDrawingOpen}
        onClose={() => setIsDrawingOpen(false)}
      />

      {/* Image Lightbox */}
      {lightboxImg && (
        <ImageLightbox
          imageUrl={lightboxImg}
          onClose={() => setLightboxImg(null)}
        />
      )}

      {/* Results Modal */}
      <QuizResultModal
        isOpen={showResultModal}
        title={test.title || 'Özel Telafi Testi Sonucu'}
        stats={overallResultStats || {}}
        sectionBreakdown={[{
          title: 'Telafi Soruları',
          qCount: totalQuestions,
          secDoğru: overallResultStats?.correct || 0,
          secYanlış: overallResultStats?.wrong || 0,
          secBoş: overallResultStats?.blank || 0
        }]}
        isOpenEnded={false}
        test={test}
        onClose={handleConfirmClose}
        onReview={handleConfirmReview}
      />
    </div>
  );
}
