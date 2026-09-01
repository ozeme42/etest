import React, { useState, useMemo, useRef } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
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
  RotateCcw,
  Award,
  Check,
  X,
  ListOrdered,
  Bot,
  Loader2,
  Lightbulb,
  AlertTriangle,
  RefreshCw,
  Key,
  Info
} from 'lucide-react';
import ImageLightbox, { extractImageUrls, isValidImageUrl } from '../common/ImageLightbox';
import { solveQuestionWithAi, cleanAiMathText, resolveImageToBase64 } from '../../../services/aiSolutionService';

/**
 * RemedialQuizReview
 * Dedicated, ultra-clean review and deep mistake analysis screen for Custom Remedial Tests ("Özel Telafi Testi").
 * Features:
 * - Single deduplicated question crop image display
 * - Robust AI Step-by-Step Question Solver with common misconception analysis
 * - Centered luxury option evaluation
 * - Full mobile responsiveness with slide-up optical evaluation drawer
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
  const { currentUser } = useAuth();

  const [isMobileOpticalOpen, setIsMobileOpticalOpen] = useState(false);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [lightboxImg, setLightboxImg] = useState(null);

  // AI Solution State: mapped by qNo
  const [aiSolutions, setAiSolutions] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // 1. Gather raw structures
  const rawQuestionsList = test.questionsList || test.raw_data?.questionsList || test.raw?.questionsList || [];
  const rawImageUrls = test.imageUrls || test.raw_data?.imageUrls || test.raw?.imageUrls || [];
  const rawContentPayload = test.contentPayload || test.raw_data?.contentPayload || test.raw?.contentPayload || '';
  const extractedPayloadImages = useMemo(() => extractImageUrls(rawContentPayload), [rawContentPayload]);

  // 2. Normalize questions & answers from submission and test
  const reviewQuestions = useMemo(() => {
    const rawSubAnswers = submission.answers || submission.raw_data?.answers || [];
    const cleanSubAns = Array.isArray(rawSubAnswers) ? rawSubAnswers.filter(a => a && a.type !== 'metadata') : [];

    const baseQuestions = (Array.isArray(questions) && questions.length > 0)
      ? questions
      : (Array.isArray(test.questions) && test.questions.length > 0
          ? test.questions
          : (rawQuestionsList.length > 0 ? rawQuestionsList : cleanSubAns));

    return baseQuestions.map((q, idx) => {
      const qNo = idx + 1;
      const subAns = cleanSubAns.find(a => (a.questionNo === qNo || a.questionNoInSection === qNo)) || cleanSubAns[idx] || {};
      const subQ = rawQuestionsList[idx] || {};

      let uAnsLetter = subAns.userAnswer ?? subAns.selectedOption ?? q.userAnswer ?? null;
      if (typeof uAnsLetter === 'number') {
        uAnsLetter = String.fromCharCode(65 + uAnsLetter);
      }

      let cAnsLetter = subAns.correctAnswer ?? subAns.correctAnswerLetter ?? subQ.correctAnswer ?? subQ.correctAnswerLetter ?? q.correctAnswer ?? q.correctAnswerLetter ?? q.answer ?? q.correctOption ?? test.answerKey?.[qNo] ?? test.raw_data?.answerKey?.[qNo] ?? null;
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

      // Robust multi-layer image extraction:
      const rawImgs = [];
      if (q.imageUrl && isValidImageUrl(q.imageUrl)) rawImgs.push(q.imageUrl);
      if (q.image && isValidImageUrl(q.image)) rawImgs.push(q.image);
      if (Array.isArray(q.imageUrls)) rawImgs.push(...q.imageUrls);
      if (Array.isArray(q.images)) rawImgs.push(...q.images);
      if (q.contentPayload && isValidImageUrl(q.contentPayload)) rawImgs.push(...extractImageUrls(q.contentPayload));

      if (subAns.imageUrl && isValidImageUrl(subAns.imageUrl)) rawImgs.push(subAns.imageUrl);
      if (Array.isArray(subAns.imageUrls)) rawImgs.push(...subAns.imageUrls);

      if (subQ.imageUrl && isValidImageUrl(subQ.imageUrl)) rawImgs.push(subQ.imageUrl);
      if (subQ.image && isValidImageUrl(subQ.image)) rawImgs.push(subQ.image);
      if (subQ.contentPayload && isValidImageUrl(subQ.contentPayload)) rawImgs.push(...extractImageUrls(subQ.contentPayload));

      if (rawImageUrls[idx] && isValidImageUrl(rawImageUrls[idx])) rawImgs.push(rawImageUrls[idx]);
      if (extractedPayloadImages[idx] && isValidImageUrl(extractedPayloadImages[idx])) rawImgs.push(extractedPayloadImages[idx]);

      if (rawImgs.length === 0 && baseQuestions.length === 1) {
        if (test.imageUrl && isValidImageUrl(test.imageUrl)) rawImgs.push(test.imageUrl);
        if (test.raw_data?.imageUrl && isValidImageUrl(test.raw_data.imageUrl)) rawImgs.push(test.raw_data.imageUrl);
      }

      // Exact deduplication
      const cleanImgs = Array.from(new Set(rawImgs.filter(isValidImageUrl).map(s => String(s).trim())));
      const primaryImage = cleanImgs[0] || null;

      return {
        ...q,
        globalIndex: idx,
        displayQNo: qNo,
        userAnsLetter: isBlank ? 'Boş' : String(uAnsLetter).toUpperCase(),
        correctAnsLetter: cAnsLetter ? String(cAnsLetter).toUpperCase() : '—',
        isCorrect: Boolean(isCorrect),
        isBlank: Boolean(isBlank),
        primaryImage,
        images: primaryImage ? [primaryImage] : [],
        unitName: subAns.metadata?.unitName || q.unitName || subQ.unitName || '',
        testName: subAns.metadata?.testName || q.testName || subQ.testName || '',
        originalQNo: subAns.metadata?.originalQNo || q.originalQuestionNo || q.originalQNo || subQ.originalQuestionNo || subQ.originalQNo || q.qNo,
        optCount: Number(q.optionsCount || q.optionCount || subQ.optionCount || 4)
      };
    });
  }, [test, questions, submission, rawQuestionsList, rawImageUrls, extractedPayloadImages]);

  const totalCount = reviewQuestions.length;
  const activeQuestion = reviewQuestions[activeQIdx] || reviewQuestions[0] || {};
  const defaultOptions = ['A', 'B', 'C', 'D', 'E'];

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

  // AI Solver Handler
  const handleSolveWithAi = async (forceRefresh = false) => {
    const qNo = activeQIdx + 1;
    if (!forceRefresh && aiSolutions[qNo]) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const isGenericTitle = !activeQuestion.questionText || /^soru\s*\d+/i.test(activeQuestion.questionText.trim());
      const qText = isGenericTitle ? '' : activeQuestion.questionText;

      const res = await solveQuestionWithAi({
        userId: currentUser?.id,
        imageBase64: activeQuestion.primaryImage,
        questionText: qText,
        options: defaultOptions.slice(0, activeQuestion.optCount || 4),
        studentAnswer: activeQuestion.userAnsLetter !== 'Boş' ? activeQuestion.userAnsLetter : '',
        correctAnswer: activeQuestion.correctAnsLetter !== '—' ? activeQuestion.correctAnsLetter : '',
        mistakeReason: !activeQuestion.isCorrect ? `Öğrencinin Yanıtı: ${activeQuestion.userAnsLetter}, Doğru Cevap: ${activeQuestion.correctAnsLetter}` : '',
        subject: test.subject || activeQuestion.subject || 'Genel',
        grade: test.grade || '',
        topic: activeQuestion.unitName || test.topic || '',
        questionNo: qNo,
        forceRefresh
      });

      setAiSolutions(prev => ({
        ...prev,
        [qNo]: res
      }));
    } catch (err) {
      if (err.message === 'API_KEY_REQUIRED') {
        setShowApiKeyModal(true);
      } else {
        setAiError(err.message || 'Yapay zeka çözümü üretilirken bir hata oluştu.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem('gemini_api_key', tempApiKey.trim());
      setShowApiKeyModal(false);
      handleSolveWithAi(true);
    }
  };

  const currentSolution = aiSolutions[activeQIdx + 1];

  // Normalized Steps for current solution
  const normalizedSteps = useMemo(() => {
    if (!currentSolution) return [];
    if (Array.isArray(currentSolution.steps) && currentSolution.steps.length > 0) {
      return currentSolution.steps.map((st, i) => {
        if (typeof st === 'string') {
          return {
            title: `${i + 1}. Adım`,
            content: cleanAiMathText(st)
          };
        }
        if (typeof st === 'object' && st !== null) {
          const detail = st.detail || st.explanation || st.text || st.description || st.content || st.step || '';
          const title = st.title && st.title !== detail ? st.title : `${i + 1}. Adım`;
          return {
            title,
            content: cleanAiMathText(detail || st.title || '')
          };
        }
        return { title: `${i + 1}. Adım`, content: String(st) };
      });
    } else if (currentSolution.explanation) {
      return [{
        title: 'Detaylı Çözüm',
        content: cleanAiMathText(currentSolution.explanation)
      }];
    }
    return [];
  }, [currentSolution]);

  // Optical Evaluation Rows Render Helper
  const renderOpticalEvaluationContent = () => (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '0.65rem 0.85rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.45rem'
    }}>
      {reviewQuestions.map((q, idx) => {
        const qNo = idx + 1;
        const isCurrent = activeQIdx === idx;

        let rowBg = isDark ? '#1e1e24' : '#ffffff';
        let rowBorder = isDark ? '1px solid #2e2e38' : '1px solid #e2e8f0';

        if (q.isBlank) {
          rowBg = isDark ? '#18181b' : '#f8fafc';
        } else if (q.isCorrect) {
          rowBg = isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.06)';
          rowBorder = '1px solid rgba(16,185,129,0.3)';
        } else {
          rowBg = isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)';
          rowBorder = '1px solid rgba(239,68,68,0.3)';
        }

        if (isCurrent) {
          rowBorder = '1.5px solid #6366f1';
        }

        return (
          <div
            key={qNo}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.4rem 0.65rem',
              borderRadius: '0.65rem',
              background: rowBg,
              border: rowBorder,
              transition: 'all 0.15s ease'
            }}
          >
            {/* Number & Status */}
            <div
              onClick={() => {
                setActiveQIdx(idx);
                if (isMobile) setIsMobileOpticalOpen(false);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
              title="Bu soruyu sol ekranda göster"
            >
              <span style={{
                fontSize: '0.84rem',
                fontWeight: 900,
                color: isCurrent ? '#6366f1' : (q.isCorrect ? '#16a34a' : (q.isBlank ? 'var(--color-text-muted)' : '#dc2626')),
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

                let btnBg = isDark ? '#27272a' : '#f4f4f5';
                let btnBorder = isDark ? '1px solid #3f3f46' : '1px solid #e4e4e7';
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
                  btnBg = isDark ? 'rgba(16,185,129,0.25)' : '#dcfce7';
                  btnBorder = '2px solid #16a34a';
                  btnColor = '#15803d';
                }

                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => {
                      setActiveQIdx(idx);
                      if (isMobile) setIsMobileOpticalOpen(false);
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
  );

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
        height: isMobile ? '56px' : '66px',
        padding: isMobile ? '0 0.65rem' : '0 1.5rem',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.45rem' : '0.75rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobile ? '32px' : '36px',
              height: isMobile ? '32px' : '36px',
              borderRadius: '0.65rem',
              border: '1.5px solid var(--color-border-input)',
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              flexShrink: 0
            }}
            title="İncelemeyi Kapat"
          >
            <ArrowLeft size={isMobile ? 16 : 18} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontSize: isMobile ? '0.82rem' : '1.02rem',
              fontWeight: 900,
              color: 'var(--color-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {test.title || test.name || 'Özel Telafi Testi'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
              <span style={{
                fontSize: isMobile ? '0.62rem' : '0.68rem',
                fontWeight: 900,
                background: 'rgba(99,102,241,0.12)',
                color: '#4f46e5',
                padding: '0.1rem 0.45rem',
                borderRadius: '0.35rem',
                border: '1px solid rgba(99,102,241,0.3)'
              }}>
                🔍 İnceleme & AI Çözüm
              </span>
            </div>
          </div>
        </div>

        {/* Right: Score Badges & Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.65rem', flexShrink: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: isMobile ? '0.25rem 0.5rem' : '0.35rem 0.75rem',
            borderRadius: '0.6rem',
            background: stats.pct >= 70 ? '#dcfce7' : (stats.pct >= 40 ? '#fef3c7' : '#fee2e2'),
            color: stats.pct >= 70 ? '#15803d' : (stats.pct >= 40 ? '#b45309' : '#b91c1c'),
            fontWeight: 900,
            fontSize: isMobile ? '0.74rem' : '0.84rem',
            border: `1px solid ${stats.pct >= 70 ? '#86efac' : (stats.pct >= 40 ? '#fde68a' : '#fca5a5')}`
          }}>
            <Trophy size={isMobile ? 13 : 15} />
            <span>%{stats.pct}</span>
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
              padding: isMobile ? '0.35rem 0.65rem' : '0.45rem 1.15rem',
              borderRadius: '0.65rem',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#ffffff',
              fontSize: isMobile ? '0.74rem' : '0.84rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79,70,229,0.3)'
            }}
          >
            Kapat
          </button>
        </div>
      </header>

      {/* ── 🌟 MAIN REVIEW BODY ── */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* ── SOLVING & REVIEW AREA ── */}
        <div style={{
          flex: isMobile ? '1 1 100%' : '1 1 68%',
          width: isMobile ? '100%' : 'auto',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--color-bg)',
          borderRight: isMobile ? 'none' : '1px solid var(--color-border)',
          overflow: 'hidden'
        }}>
          {/* Question Nav Strip */}
          <div style={{
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            padding: isMobile ? '0.35rem 0.5rem' : '0.55rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            flexShrink: 0
          }}>
            <div style={{ fontSize: isMobile ? '0.72rem' : '0.78rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
              <b style={{ color: '#4f46e5' }}>{activeQIdx + 1}</b> / {totalCount} Soru İncelemesi
            </div>

            {/* Question Bubbles Carousel */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
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
                      width: isMobile ? '26px' : '32px',
                      height: isMobile ? '26px' : '32px',
                      borderRadius: '50%',
                      border: bBorder,
                      background: bBg,
                      color: bColor,
                      fontWeight: 900,
                      fontSize: isMobile ? '0.7rem' : '0.76rem',
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
                    {q.isBlank ? qNo : (q.isCorrect ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Question Main Card */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '0.5rem 0.65rem 5rem 0.65rem' : '1rem 2rem 2rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '850px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              {/* Question Header Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '0.75rem',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.45rem',
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 900
                  }}>
                    SORU {activeQIdx + 1}
                  </span>
                  {activeQuestion.unitName && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                      📌 {activeQuestion.unitName}
                    </span>
                  )}
                  {activeQuestion.testName && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      • {activeQuestion.testName} {activeQuestion.originalQNo ? `(S.${activeQuestion.originalQNo})` : ''}
                    </span>
                  )}
                </div>

                {/* Status Evaluation Pill */}
                {activeQuestion.isBlank ? (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    background: 'var(--color-surface-hover)',
                    color: 'var(--color-text-muted)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '0.4rem',
                    border: '1px solid var(--color-border)'
                  }}>
                    — Boş Bırakıldı (Doğru: {activeQuestion.correctAnsLetter})
                  </span>
                ) : activeQuestion.isCorrect ? (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '0.4rem',
                    border: '1px solid #86efac',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <CheckCircle2 size={13} /> Doğru ({activeQuestion.userAnsLetter})
                  </span>
                ) : (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    background: '#fee2e2',
                    color: '#b91c1c',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '0.4rem',
                    border: '1px solid #fca5a5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <XCircle size={13} /> Yanlış (Senin: {activeQuestion.userAnsLetter} • Doğru: {activeQuestion.correctAnsLetter})
                  </span>
                )}
              </div>

              {/* 1. Soru Görseli (Deduplicated Single Image) */}
              <div style={{
                position: 'relative',
                background: isDark ? '#18181b' : '#ffffff',
                border: isDark ? '1.5px solid #27272a' : '1.5px solid #e4e4e7',
                borderRadius: '1rem',
                padding: isMobile ? '0.65rem' : '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: isMobile ? '200px' : '280px',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)'
              }}>
                {activeQuestion.primaryImage ? (
                  <div style={{ position: 'relative', maxWidth: '100%' }}>
                    <img
                      src={activeQuestion.primaryImage}
                      alt={`Soru ${activeQIdx + 1}`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: isMobile ? '340px' : '460px',
                        objectFit: 'contain',
                        borderRadius: '0.5rem',
                        display: 'block',
                        margin: '0 auto',
                        cursor: 'zoom-in'
                      }}
                      onClick={() => setLightboxImg(activeQuestion.primaryImage)}
                    />
                    <button
                      type="button"
                      onClick={() => setLightboxImg(activeQuestion.primaryImage)}
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
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <BookOpen size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>
                      {activeQuestion.questionText || `Soru ${activeQIdx + 1}`}
                    </p>
                  </div>
                )}
              </div>

              {/* 2. 🌟 AI STEP-BY-STEP QUESTION SOLVER ACTION BAR ── */}
              <div style={{
                background: isDark ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(124,58,237,0.08))' : 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                border: '1.5px solid rgba(99,102,241,0.3)',
                borderRadius: '1.2rem',
                padding: isMobile ? '0.75rem 0.85rem' : '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '0.6rem',
                      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Bot size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.08rem', fontWeight: 900, color: 'var(--color-text)' }}>
                        Yapay Zeka Soru Çözücü
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: isMobile ? '0.78rem' : '0.84rem', color: 'var(--color-text-muted)' }}>
                        Sorunun görseli üzerinden adım adım çözüm ve çeldirici analizi
                      </p>
                    </div>
                  </div>

                  {/* Solve Trigger Button */}
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() => handleSolveWithAi(Boolean(currentSolution))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: isMobile ? '0.55rem 0.95rem' : '0.65rem 1.25rem',
                      borderRadius: '0.75rem',
                      border: 'none',
                      background: currentSolution
                        ? 'var(--color-surface-hover)'
                        : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      color: currentSolution ? 'var(--color-text)' : '#ffffff',
                      fontSize: isMobile ? '0.82rem' : '0.9rem',
                      fontWeight: 900,
                      cursor: aiLoading ? 'not-allowed' : 'pointer',
                      boxShadow: currentSolution ? 'none' : '0 4px 14px rgba(79,70,229,0.3)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 size={18} className="spin-animation" />
                        <span>Görsel Analiz Ediliyor...</span>
                      </>
                    ) : currentSolution ? (
                      <>
                        <RefreshCw size={16} />
                        <span>Yeniden Çözdür</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Adım Adım Çözüm Oluştur</span>
                      </>
                    )}
                  </button>
                </div>

                {/* AI Error message */}
                {aiError && (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.65rem',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#dc2626',
                    fontSize: '0.84rem',
                    fontWeight: 700
                  }}>
                    ⚠️ {aiError}
                  </div>
                )}

                {/* AI Solution Render Card */}
                {currentSolution && (
                  <div style={{
                    background: isDark ? '#18181b' : '#ffffff',
                    border: '1px solid var(--color-border)',
                    borderRadius: '1rem',
                    padding: isMobile ? '1rem 0.95rem' : '1.35rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    textAlign: 'left',
                    animation: 'fadeIn 0.25s ease-out'
                  }}>
                    {/* Summary */}
                    {currentSolution.summary && (
                      <div style={{
                        padding: '0.85rem 1.1rem',
                        borderRadius: '0.85rem',
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.6rem'
                      }}>
                        <Info size={20} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: isMobile ? '0.92rem' : '1.02rem', color: isDark ? '#c7d2fe' : '#312e81', lineHeight: 1.6, fontWeight: 700 }}>
                          {cleanAiMathText(currentSolution.summary)}
                        </div>
                      </div>
                    )}

                    {/* Solution Steps */}
                    {normalizedSteps.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ fontSize: isMobile ? '0.86rem' : '0.95rem', fontWeight: 900, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '0.4rem', letterSpacing: '0.02em' }}>
                          <Sparkles size={16} /> ÇÖZÜM ADIMLARI
                        </div>
                        {normalizedSteps.map((step, sIdx) => (
                          <div
                            key={sIdx}
                            style={{
                              padding: isMobile ? '0.85rem 1rem' : '1rem 1.25rem',
                              borderRadius: '0.85rem',
                              background: isDark ? '#27272a' : '#f8fafc',
                              border: isDark ? '1px solid #3f3f46' : '1px solid #e2e8f0',
                              boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.02)'
                            }}
                          >
                            <div style={{ fontSize: isMobile ? '0.92rem' : '1.02rem', fontWeight: 900, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                              {step.title}
                            </div>
                            <div style={{ fontSize: isMobile ? '0.95rem' : '1.06rem', color: 'var(--color-text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                              {step.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Key Concept / Tip */}
                    {(currentSolution.goldenRule || currentSolution.keyConcept || currentSolution.tips) && (
                      <div style={{
                        padding: isMobile ? '0.85rem 1rem' : '1rem 1.25rem',
                        borderRadius: '0.85rem',
                        background: 'rgba(16, 185, 129, 0.09)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.6rem'
                      }}>
                        <Lightbulb size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: isMobile ? '0.92rem' : '1.02rem', color: isDark ? '#86efac' : '#14532d', lineHeight: 1.6 }}>
                          <b style={{ color: isDark ? '#a7f3d0' : '#15803d' }}>Altın Kural & İpucu:</b> {cleanAiMathText(currentSolution.goldenRule || currentSolution.keyConcept || currentSolution.tips)}
                        </div>
                      </div>
                    )}

                    {/* Common Misconception / Mistake Analysis */}
                    {(currentSolution.mistakeAdvice || currentSolution.mistakeAnalysis || currentSolution.whyStudentFailed) && (
                      <div style={{
                        padding: isMobile ? '0.85rem 1rem' : '1rem 1.25rem',
                        borderRadius: '0.85rem',
                        background: 'rgba(239, 68, 68, 0.09)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.6rem'
                      }}>
                        <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: isMobile ? '0.92rem' : '1.02rem', color: isDark ? '#fca5a5' : '#7f1d1d', lineHeight: 1.6 }}>
                          <b style={{ color: isDark ? '#fecaca' : '#b91c1c' }}>Yanlış Analizi:</b> {cleanAiMathText(currentSolution.mistakeAdvice || currentSolution.mistakeAnalysis || currentSolution.whyStudentFailed)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. 🌟 CENTERED OPTION EVALUATION BOX ── */}
              <div style={{
                background: isDark
                  ? 'linear-gradient(180deg, rgba(30,30,36,0.9), rgba(24,24,28,0.95))'
                  : 'linear-gradient(180deg, #ffffff, #f8fafc)',
                border: isDark ? '1.5px solid #3f3f46' : '1.5px solid #e2e8f0',
                borderRadius: '1.2rem',
                padding: isMobile ? '0.85rem 0.75rem' : '1.25rem 1.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isMobile ? '0.65rem' : '0.85rem',
                boxShadow: isDark
                  ? '0 8px 30px rgba(0,0,0,0.35)'
                  : '0 8px 30px rgba(0,0,0,0.06)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: isMobile ? '0.78rem' : '0.86rem',
                  fontWeight: 900,
                  color: isDark ? '#e4e4e7' : '#334155',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase'
                }}>
                  <Sparkles size={14} color="#6366f1" />
                  <span>Şık Değerlendirmesi</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isMobile ? '0.65rem' : '1.15rem',
                  width: '100%'
                }}>
                  {defaultOptions.slice(0, activeQuestion.optCount || 4).map((letter) => {
                    const isUserChoice = activeQuestion.userAnsLetter === letter;
                    const isCorrectAnswer = activeQuestion.correctAnsLetter === letter;

                    let btnBg = isDark ? '#27272a' : '#ffffff';
                    let btnBorder = isDark ? '2px solid #3f3f46' : '2px solid #cbd5e1';
                    let btnColor = isDark ? '#f4f4f5' : '#1e293b';

                    if (isUserChoice) {
                      if (activeQuestion.isCorrect) {
                        btnBg = 'linear-gradient(135deg, #16a34a, #15803d)';
                        btnBorder = '2.5px solid #16a34a';
                        btnColor = '#ffffff';
                      } else {
                        btnBg = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                        btnBorder = '2.5px solid #dc2626';
                        btnColor = '#ffffff';
                      }
                    } else if (isCorrectAnswer) {
                      btnBg = isDark ? 'rgba(16,185,129,0.25)' : '#dcfce7';
                      btnBorder = '2.5px solid #16a34a';
                      btnColor = '#15803d';
                    }

                    return (
                      <div
                        key={letter}
                        style={{
                          width: isMobile ? '52px' : '64px',
                          height: isMobile ? '52px' : '64px',
                          borderRadius: '1rem',
                          border: btnBorder,
                          background: btnBg,
                          color: btnColor,
                          fontSize: isMobile ? '1.15rem' : '1.35rem',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: (isUserChoice || isCorrectAnswer)
                            ? '0 8px 24px rgba(0,0,0,0.2)'
                            : (isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.04)'),
                          transform: (isUserChoice || isCorrectAnswer) ? 'scale(1.05)' : 'scale(1)'
                        }}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stepper Navigation (Desktop) */}
              {!isMobile && (
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
                      padding: '0.65rem 1.25rem',
                      borderRadius: '0.75rem',
                      border: '1.5px solid var(--color-border-input)',
                      background: activeQIdx === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                      color: activeQIdx === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: activeQIdx === 0 ? 'not-allowed' : 'pointer',
                      opacity: activeQIdx === 0 ? 0.5 : 1
                    }}
                  >
                    <ChevronLeft size={18} />
                    <span>Önceki Soru</span>
                  </button>

                  <div style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
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
                      padding: '0.65rem 1.35rem',
                      borderRadius: '0.75rem',
                      border: 'none',
                      background: activeQIdx >= totalCount - 1 ? 'var(--color-surface-hover)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                      color: activeQIdx >= totalCount - 1 ? 'var(--color-text-muted)' : '#ffffff',
                      fontSize: '0.88rem',
                      fontWeight: 900,
                      cursor: activeQIdx >= totalCount - 1 ? 'not-allowed' : 'pointer',
                      opacity: activeQIdx >= totalCount - 1 ? 0.5 : 1
                    }}
                  >
                    <span>Sonraki Soru</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Bottom Fixed Action Bar */}
          {isMobile && (
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: '58px',
              background: 'var(--color-surface)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 0.75rem',
              zIndex: 50,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
            }}>
              <button
                type="button"
                disabled={activeQIdx === 0}
                onClick={() => setActiveQIdx(p => Math.max(0, p - 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--color-border)',
                  background: activeQIdx === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                  color: activeQIdx === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  opacity: activeQIdx === 0 ? 0.5 : 1
                }}
              >
                <ChevronLeft size={16} />
                <span>Önceki</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMobileOpticalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.6rem',
                  border: '1.5px solid #6366f1',
                  background: 'rgba(99,102,241,0.12)',
                  color: '#4f46e5',
                  fontSize: '0.78rem',
                  fontWeight: 900
                }}
              >
                <ListOrdered size={15} />
                <span>Optik Analiz (%{stats.pct})</span>
              </button>

              <button
                type="button"
                disabled={activeQIdx >= totalCount - 1}
                onClick={() => setActiveQIdx(p => Math.min(totalCount - 1, p + 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.6rem',
                  border: 'none',
                  background: activeQIdx >= totalCount - 1 ? 'var(--color-surface-hover)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: activeQIdx >= totalCount - 1 ? 'var(--color-text-muted)' : '#ffffff',
                  fontSize: '0.76rem',
                  fontWeight: 900,
                  opacity: activeQIdx >= totalCount - 1 ? 0.5 : 1
                }}
              >
                <span>Sonraki</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ── DESKTOP RIGHT: COMPLETE OPTICAL EVALUATION SHEET (32%) ── */}
        {!isMobile && (
          <aside style={{
            width: '32%',
            minWidth: '300px',
            maxWidth: '360px',
            height: '100%',
            background: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
          }}>
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

            {renderOpticalEvaluationContent()}
          </aside>
        )}
      </div>

      {/* ── MOBILE SLIDE-UP OPTICAL DRAWER ── */}
      {isMobile && isMobileOpticalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          backdropFilter: 'blur(4px)'
        }}>
          <div
            onClick={() => setIsMobileOpticalOpen(false)}
            style={{ flex: 1 }}
          />

          <div style={{
            background: 'var(--color-surface)',
            borderTopLeftRadius: '1.25rem',
            borderTopRightRadius: '1.25rem',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-surface-hover)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1rem' }}>📋</span>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  Optik Değerlendirme (%{stats.pct})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpticalOpen(false)}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {renderOpticalEvaluationContent()}
            </div>

            {/* Footer */}
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setIsMobileOpticalOpen(false)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Kapat ve Soruya Dön
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <ImageLightbox
          imageUrl={lightboxImg}
          onClose={() => setLightboxImg(null)}
        />
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(6px)'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1.25rem',
            maxWidth: '420px',
            width: '100%',
            padding: '1.5rem',
            border: '1px solid var(--color-border)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#4f46e5' }}>
              <Key size={20} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--color-text)' }}>
                Gemini API Anahtarı Gerekli
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Yapay zeka ile anında adım adım soru çözümü ve görsel analizi yapabilmek için lütfen Google Gemini API anahtarınızı giriniz:
            </p>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.65rem',
                border: '1.5px solid var(--color-border-input)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: '0.88rem',
                boxSizing: 'border-box',
                marginBottom: '1rem'
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.6rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                Kaydet & Çöz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
