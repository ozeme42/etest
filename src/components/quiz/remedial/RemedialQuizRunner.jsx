import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTheme } from '../../../context/ThemeContext';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useAuth } from '../../../context/AuthContext';
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
  X,
  Target,
  Trophy,
  Flame,
  Award,
  ListOrdered
} from 'lucide-react';
import DrawingCanvas from '../common/DrawingCanvas';
import ImageLightbox, { extractImageUrls, isValidImageUrl, normalizeImageUrl } from '../common/ImageLightbox';
import QuizResultModal from '../modals/QuizResultModal';
import { toUUID } from '../../../services/supabaseService';

/**
 * RemedialQuizRunner
 * Dedicated, ultra-clean, modern solving environment for Custom Remedial Tests ("Özel Telafi Testi").
 * Features centered luxury option buttons, full mobile responsiveness with bottom-sheet optical drawer,
 * and real-time repetition tracking (%100 Mastery progress).
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
  const { currentUser } = useAuth();
  const { submissions = [] } = useEvaluation();

  const [isMobileOpticalOpen, setIsMobileOpticalOpen] = useState(false);

  // 1. Gather all potential image sources from test & questions
  const rawQuestionsList = test.questionsList || test.raw_data?.questionsList || test.raw?.questionsList || [];
  const rawImageUrls = test.imageUrls || test.raw_data?.imageUrls || test.raw?.imageUrls || [];
  const rawContentPayload = test.contentPayload || test.raw_data?.contentPayload || test.raw?.contentPayload || '';
  const extractedPayloadImages = useMemo(() => extractImageUrls(rawContentPayload), [rawContentPayload]);

  // 2. Flatten and normalize questions with robust multi-source image resolution & exact deduplication
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
    } else if (Array.isArray(rawQuestionsList) && rawQuestionsList.length > 0) {
      rawQuestionsList.forEach((q, idx) => {
        list.push({ ...q, originalIndex: idx });
      });
    }

    if (list.length === 0) {
      const fallbackCount = test.totalQuestions || test.qCount || rawImageUrls.length || extractedPayloadImages.length || 1;
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
      const subQ = rawQuestionsList[idx] || {};

      // Multi-layer image extraction:
      const rawImgs = [];
      if (q.imageUrl && isValidImageUrl(q.imageUrl)) rawImgs.push(q.imageUrl);
      if (q.image && isValidImageUrl(q.image)) rawImgs.push(q.image);
      if (Array.isArray(q.imageUrls)) rawImgs.push(...q.imageUrls);
      if (Array.isArray(q.images)) rawImgs.push(...q.images);
      if (q.contentPayload && isValidImageUrl(q.contentPayload)) rawImgs.push(...extractImageUrls(q.contentPayload));
      if (q.documentPayload && isValidImageUrl(q.documentPayload)) rawImgs.push(...extractImageUrls(q.documentPayload));

      if (subQ.imageUrl && isValidImageUrl(subQ.imageUrl)) rawImgs.push(subQ.imageUrl);
      if (subQ.image && isValidImageUrl(subQ.image)) rawImgs.push(subQ.image);
      if (subQ.contentPayload && isValidImageUrl(subQ.contentPayload)) rawImgs.push(...extractImageUrls(subQ.contentPayload));

      if (rawImageUrls[idx] && isValidImageUrl(rawImageUrls[idx])) rawImgs.push(rawImageUrls[idx]);
      if (extractedPayloadImages[idx] && isValidImageUrl(extractedPayloadImages[idx])) rawImgs.push(extractedPayloadImages[idx]);

      if (rawImgs.length === 0 && list.length === 1) {
        if (test.imageUrl && isValidImageUrl(test.imageUrl)) rawImgs.push(test.imageUrl);
        if (test.raw_data?.imageUrl && isValidImageUrl(test.raw_data.imageUrl)) rawImgs.push(test.raw_data.imageUrl);
      }

      // Exact deduplication and normalization
      const cleanImgs = Array.from(new Set(rawImgs.filter(isValidImageUrl).map(s => normalizeImageUrl(String(s).trim())).filter(Boolean)));
      const primaryImage = cleanImgs[0] || null;

      // Correct answer resolution
      let cAns = q.correctAnswer ?? q.correctAnswerLetter ?? subQ.correctAnswer ?? subQ.correctAnswerLetter ?? q.answer ?? q.correctOption ?? test.answerKey?.[qNo] ?? test.raw_data?.answerKey?.[qNo];
      if (typeof cAns === 'string' && /^[A-E]$/i.test(cAns.trim())) {
        cAns = cAns.trim().toUpperCase().charCodeAt(0) - 65;
      } else if (typeof cAns === 'string' && !isNaN(Number(cAns))) {
        cAns = Number(cAns);
      }

      return {
        ...q,
        globalIndex: idx,
        displayQNo: qNo,
        primaryImage,
        images: primaryImage ? [primaryImage] : [],
        resolvedCorrectAnswer: typeof cAns === 'number' ? cAns : null,
        optCount: Number(q.optionsCount || q.optionCount || subQ.optionCount || 4),
        unitName: q.unitName || subQ.unitName || '',
        testName: q.testName || subQ.testName || q.title || '',
        originalQNo: q.originalQuestionNo || q.originalQNo || subQ.originalQuestionNo || subQ.originalQNo || q.qNo
      };
    });
  }, [test, questions, rawQuestionsList, rawImageUrls, extractedPayloadImages]);

  const fullTestTotalQuestions = normalizedQuestions.length;

  // 3. Attempt Number & Historical Mastery Tracking & Previously Correctly Solved Questions
  const { attemptNumber, previousBest, previousCorrect, previousTotal, previousMasteryPct, pastSubs, correctlySolvedQNos } = useMemo(() => {
    const studentIdStr = String(currentUser?.id || '').trim();
    const studentUuid = String(toUUID(currentUser?.id) || '').trim();
    const currentTestId = String(test.id || test.testId || '').trim();
    const currentTestUuid = String(toUUID(currentTestId) || '').trim();
    const currentTitle = String(test.title || test.name || '').toLowerCase().trim();

    const pSubs = (submissions || []).filter(s => {
      if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
      const sId = String(s.studentId ?? s.userId ?? s.student_id ?? '');
      const isStudentMatch = !studentIdStr || sId === studentIdStr || sId === studentUuid || toUUID(sId) === studentUuid;
      if (!isStudentMatch) return false;

      const sTestId = String(s.testId || s.hwId || s.bookTestId || s.id || '');
      const isIdMatch = currentTestId && (sTestId === currentTestId || sTestId === currentTestUuid || toUUID(sTestId) === currentTestUuid);
      const isTitleMatch = currentTitle && String(s.title || s.testTitle || '').toLowerCase().trim() === currentTitle;

      return isIdMatch || isTitleMatch;
    }).sort((a, b) => new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0));

    const attemptCount = pSubs.length + 1;
    let prevCorr = 0;
    let prevTot = normalizedQuestions.length;
    const solvedSet = new Set();

    if (pSubs.length > 0) {
      const last = pSubs[pSubs.length - 1];
      prevCorr = Number(last.correctCount ?? last.correct ?? 0);
      prevTot = Number(last.totalQuestions ?? last.total ?? normalizedQuestions.length);

      pSubs.forEach(sub => {
        const answersArr = Array.isArray(sub.answers) ? sub.answers : [];
        answersArr.forEach((ans, aIdx) => {
          const qNo = ans.questionNo || ans.questionNoInSection || (aIdx + 1);
          if (ans.isCorrect === true) {
            solvedSet.add(qNo);
          }
        });
      });
    }

    const prevPct = prevTot > 0 ? Math.round((prevCorr / prevTot) * 100) : 0;

    return {
      attemptNumber: attemptCount,
      previousBest: pSubs.length > 0 ? pSubs[pSubs.length - 1] : null,
      previousCorrect: prevCorr,
      previousTotal: prevTot,
      previousMasteryPct: prevPct,
      pastSubs: pSubs,
      correctlySolvedQNos: solvedSet
    };
  }, [submissions, currentUser, test, normalizedQuestions.length]);

  // 4. Active Questions for this solving session (Eliminate already correct questions in retake mode)
  const isRetakeMode = pastSubs.length > 0 && correctlySolvedQNos.size > 0 && correctlySolvedQNos.size < fullTestTotalQuestions;

  const activeQuestions = useMemo(() => {
    if (!isRetakeMode) {
      return normalizedQuestions;
    }
    const remaining = normalizedQuestions.filter(q => !correctlySolvedQNos.has(q.displayQNo));
    return remaining.length > 0 ? remaining : normalizedQuestions;
  }, [normalizedQuestions, isRetakeMode, correctlySolvedQNos]);

  const totalQuestions = activeQuestions.length;

  // 5. Answer State Management
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
    return activeQuestions.filter(q => answers[q.displayQNo] !== undefined && answers[q.displayQNo] !== null).length;
  }, [answers, activeQuestions]);

  const activeQuestion = activeQuestions[activeQIdx] || activeQuestions[0] || {};

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
        try {
          const autoSaveArr = normalizedQuestions.map((q, idx) => {
            const questionNumber = idx + 1;
            const userVal = updated[questionNumber];
            return {
              questionNo: questionNumber,
              questionId: q.id || `remedial_q_${questionNumber}`,
              userAnswer: userVal !== undefined && userVal !== null ? String.fromCharCode(65 + userVal) : null,
              userAnswerIndex: userVal !== undefined && userVal !== null ? userVal : null
            };
          });
          onAutoSave(autoSaveArr);
        } catch (e) {
          console.warn('Remedial onAutoSave error:', e);
        }
      }
      return updated;
    });
  };

  // Finish exam
  const handleFinishExam = () => {
    let activeCorrect = 0;
    let activeWrong = 0;
    let activeBlank = 0;
    const submissionPayload = [];

    const latestPastSub = pastSubs.length > 0 ? pastSubs[pastSubs.length - 1] : null;
    const pastAnswers = Array.isArray(latestPastSub?.answers) ? latestPastSub.answers : [];

    normalizedQuestions.forEach((q, idx) => {
      const qNo = idx + 1;
      const isEliminatedCorrect = isRetakeMode && correctlySolvedQNos.has(qNo) && !activeQuestions.some(aq => aq.displayQNo === qNo);

      if (isEliminatedCorrect) {
        const prevAnsObj = pastAnswers.find(a => (a.questionNo === qNo || a.questionNoInSection === qNo)) || pastAnswers[idx] || {};
        let correctAnsLetter = (q.resolvedCorrectAnswer !== null && q.resolvedCorrectAnswer !== undefined)
          ? String.fromCharCode(65 + q.resolvedCorrectAnswer)
          : (q.correctAnswer || 'A');

        submissionPayload.push({
          questionId: q.id || `remedial_q_${qNo}`,
          questionNo: qNo,
          questionNoInSection: qNo,
          sectionId: q.sectionId || 'remedial_sec',
          sectionTitle: q.sectionTitle || 'Telafi Soruları',
          userAnswer: prevAnsObj.userAnswer || correctAnsLetter,
          userAnswerIndex: prevAnsObj.userAnswerIndex ?? (q.resolvedCorrectAnswer ?? 0),
          isCorrect: true,
          correctAnswer: correctAnsLetter,
          imageUrls: q.primaryImage ? [q.primaryImage] : [],
          imageUrl: q.primaryImage || null,
          metadata: {
            bookTitle: q.bookTitle || test.bookTitle,
            testName: q.testName || test.title,
            unitName: q.unitName,
            originalQNo: q.originalQNo || q.qNo,
            previouslyMastered: true
          }
        });
        return;
      }

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
        if (isCorrect === true) activeCorrect++;
        else activeWrong++;
      } else {
        activeBlank++;
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
        imageUrls: q.primaryImage ? [q.primaryImage] : [],
        imageUrl: q.primaryImage || null,
        metadata: {
          bookTitle: q.bookTitle || test.bookTitle,
          testName: q.testName || test.title,
          unitName: q.unitName,
          originalQNo: q.originalQNo || q.qNo
        }
      });
    });

    const masteredFromPast = isRetakeMode ? correctlySolvedQNos.size : 0;
    const totalCorrect = activeCorrect + masteredFromPast;
    const totalWrong = activeWrong;
    const totalBlank = activeBlank;
    const score = fullTestTotalQuestions > 0 ? Math.round((totalCorrect / fullTestTotalQuestions) * 100) : 0;
    const net = Math.max(0, totalCorrect - (totalWrong * 0.25));

    setOverallResultStats({
      correct: totalCorrect,
      wrong: totalWrong,
      blank: totalBlank,
      total: fullTestTotalQuestions,
      score,
      net,
      attemptNumber,
      previousMasteryPct,
      isRetakeMode,
      activeCorrect,
      eliminatedCorrect: masteredFromPast
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

  // Optical rows render helper
  const renderOpticalSheetContent = () => (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '0.65rem 0.85rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.45rem'
    }}>
      {isRetakeMode && (
        <div style={{
          padding: '6px 8px',
          borderRadius: 8,
          background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
          border: '1px solid rgba(99,102,241,0.3)',
          color: '#6366f1',
          fontSize: '0.7rem',
          fontWeight: 800,
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>🎯 Kalan {activeQuestions.length} Yanlış</span>
          <span style={{ fontSize: '0.66rem', color: '#16a34a' }}>✓ {correctlySolvedQNos.size} Doğru Elendi</span>
        </div>
      )}

      {activeQuestions.map((q, idx) => {
        const qNo = q.displayQNo || (idx + 1);
        const isCurrent = activeQIdx === idx;
        const userAns = answers[qNo];
        const hasAns = userAns !== undefined && userAns !== null;

        let rowBg = isDark ? '#1e1e24' : '#ffffff';
        let rowBorder = isDark ? '1px solid #2e2e38' : '1px solid #e2e8f0';

        if (isCurrent) {
          rowBg = isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.09)';
          rowBorder = '1.5px solid #6366f1';
        } else if (hasAns) {
          rowBg = isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)';
          rowBorder = '1px solid rgba(16,185,129,0.25)';
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
            {/* Question number - click to jump */}
            <div
              onClick={() => {
                setActiveQIdx(idx);
                if (isMobile) setIsMobileOpticalOpen(false);
              }}
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
                color: isCurrent ? '#6366f1' : (hasAns ? '#16a34a' : 'var(--color-text-secondary)'),
                minWidth: '22px'
              }}>
                {qNo}.
              </span>
              {isCurrent && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: '#6366f1',
                  padding: '1px 6px',
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
                let btnBg = isDark ? '#27272a' : '#f4f4f5';
                let btnBorder = isDark ? '1px solid #3f3f46' : '1px solid #e4e4e7';
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
      overflow: 'hidden',
      fontFamily: 'inherit'
    }}>
      {/* ── 🌟 TOP MODERN HEADER ── */}
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
        {/* Left: Exit button & Title & Attempt Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.45rem' : '0.75rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={onExit}
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
            title="Çıkış Yap"
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

            {/* Badges: Attempt + Mastery Tracking */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px', flexWrap: 'nowrap' }}>
              <span style={{
                fontSize: isMobile ? '0.62rem' : '0.68rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(79,70,229,0.12))',
                color: '#4f46e5',
                padding: '0.1rem 0.45rem',
                borderRadius: '0.35rem',
                border: '1px solid rgba(99,102,241,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                whiteSpace: 'nowrap'
              }}>
                <RotateCcw size={10} /> {attemptNumber}. Çözüm
              </span>

              {previousBest && !isMobile && (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  background: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5',
                  color: '#15803d',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '0.35rem',
                  border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}>
                  <Award size={10} /> Önceki: {previousCorrect}/{previousTotal} (%{previousMasteryPct})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Timer, Drawing, Finish Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.75rem', flexShrink: 0 }}>
          {/* Timer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: isMobile ? '0.25rem 0.45rem' : '0.35rem 0.65rem',
            borderRadius: '0.55rem',
            background: timeLeft < 120 ? '#fee2e2' : 'var(--color-surface-hover)',
            color: timeLeft < 120 ? '#dc2626' : 'var(--color-text)',
            border: `1px solid ${timeLeft < 120 ? '#fca5a5' : 'var(--color-border)'}`,
            fontSize: isMobile ? '0.74rem' : '0.86rem',
            fontWeight: 900
          }}>
            <Clock size={isMobile ? 13 : 15} />
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
              padding: isMobile ? '0.35rem 0.5rem' : '0.45rem 0.85rem',
              borderRadius: '0.65rem',
              border: `1.5px solid ${isDrawingOpen ? '#6366f1' : 'var(--color-border-input)'}`,
              background: isDrawingOpen ? 'rgba(99,102,241,0.12)' : 'var(--color-surface-hover)',
              color: isDrawingOpen ? '#4f46e5' : 'var(--color-text)',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
            title="Karalama Tahtasını Aç/Kapat"
          >
            <Edit3 size={isMobile ? 14 : 15} />
            {!isMobile && <span>Çizim</span>}
          </button>

          {/* Finish Button */}
          <button
            type="button"
            onClick={handleFinishExam}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: isMobile ? '0.35rem 0.65rem' : '0.5rem 1.15rem',
              borderRadius: '0.65rem',
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#ffffff',
              fontSize: isMobile ? '0.74rem' : '0.86rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(22,163,74,0.3)'
            }}
          >
            <CheckCircle2 size={isMobile ? 14 : 16} />
            <span>{isMobile ? 'Bitir' : 'Sınavı Bitir ve Gönder'}</span>
          </button>
        </div>
      </header>

      {/* ── 🌟 MAIN BODY (Desktop: Split Screen, Mobile: Full Screen) ── */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* ── SOLVING AREA ── */}
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
            <div style={{ fontSize: isMobile ? '0.72rem' : '0.78rem', fontWeight: 800, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
              <b style={{ color: '#4f46e5' }}>{activeQIdx + 1}</b> / {totalQuestions} • <span style={{ color: answeredCount === totalQuestions ? '#16a34a' : 'var(--color-text-muted)' }}>{answeredCount} Yanıt</span>
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
              {activeQuestions.map((q, idx) => {
                const qNo = q.displayQNo || (idx + 1);
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
                    title={`Soru ${qNo}'e Geç`}
                  >
                    {isAnswered && !isCurrent ? <Check size={12} strokeWidth={3} /> : qNo}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Main Scrollable Card */}
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
              {/* Aralıklı Tekrar Bilgi Bannerı */}
              {isRetakeMode && (
                <div style={{
                  padding: '7px 12px',
                  borderRadius: '0.75rem',
                  background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: '#6366f1',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={14} className="text-amber-500" fill="currentColor" />
                    <span>🎯 Aralıklı Tekrar Modu: Daha önce doğru çözülen {correctlySolvedQNos.size} soru elendi. Sadece kalan yanlışları çözüyorsunuz.</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#16a34a', whiteSpace: 'nowrap' }}>
                    ✓ {correctlySolvedQNos.size} Doğru Cepte
                  </span>
                </div>
              )}

              {/* Question Header Pill */}
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
                    SORU {activeQuestion.displayQNo || (activeQIdx + 1)}
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

                {answers[activeQuestion.displayQNo || (activeQIdx + 1)] !== undefined && answers[activeQuestion.displayQNo || (activeQIdx + 1)] !== null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      background: 'rgba(22, 163, 74, 0.15)',
                      color: '#16a34a',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '0.4rem',
                      border: '1px solid rgba(22, 163, 74, 0.3)'
                    }}>
                      ✓ Cevaplandı ({String.fromCharCode(65 + answers[activeQuestion.displayQNo || (activeQIdx + 1)])})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectOption(activeQuestion.displayQNo || (activeQIdx + 1), answers[activeQuestion.displayQNo || (activeQIdx + 1)])}
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '0.4rem',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-hover)',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      title="İşareti Kaldır"
                    >
                      Temizle
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                    ⏳ İşaretlenmedi
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
                      alt={`Soru ${activeQuestion.displayQNo || (activeQIdx + 1)}`}
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
                      {activeQuestion.questionText || `Soru ${activeQuestion.displayQNo || (activeQIdx + 1)}`}
                    </p>
                  </div>
                )}
              </div>

              {/* 2. 🌟 CENTERED LUXURY MODERN OPTION BUTTONS ── */}
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
                {/* Title */}
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
                  <span>Cevabınızı İşaretleyin</span>
                </div>

                {/* Centered Option Buttons Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isMobile ? '0.65rem' : '1.15rem',
                  width: '100%'
                }}>
                  {defaultOptionLetters.slice(0, activeQuestion.optCount || 4).map((letter, optIdx) => {
                    const curQNo = activeQuestion.displayQNo || (activeQIdx + 1);
                    const isSelected = answers[curQNo] === optIdx;

                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => handleSelectOption(curQNo, optIdx)}
                        style={{
                          width: isMobile ? '52px' : '64px',
                          height: isMobile ? '52px' : '64px',
                          borderRadius: '1rem',
                          border: isSelected
                            ? '2.5px solid #4f46e5'
                            : (isDark ? '2px solid #3f3f46' : '2px solid #cbd5e1'),
                          background: isSelected
                            ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
                            : (isDark ? '#27272a' : '#ffffff'),
                          color: isSelected
                            ? '#ffffff'
                            : (isDark ? '#f4f4f5' : '#1e293b'),
                          fontSize: isMobile ? '1.15rem' : '1.35rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSelected
                            ? '0 8px 24px rgba(79,70,229,0.45), 0 0 0 3px rgba(99,102,241,0.2)'
                            : (isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.04)'),
                          transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                          transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          touchAction: 'manipulation'
                        }}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Stepper Navigation Buttons (Desktop only or inline) */}
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
                        padding: '0.65rem 1.35rem',
                        borderRadius: '0.75rem',
                        border: 'none',
                        background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(79,70,229,0.3)'
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
                        padding: '0.65rem 1.35rem',
                        borderRadius: '0.75rem',
                        border: 'none',
                        background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(22,163,74,0.3)'
                      }}
                    >
                      <CheckCircle2 size={18} />
                      <span>Sınavı Tamamla</span>
                    </button>
                  )}
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
              {/* Prev */}
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

              {/* Optical Sheet Toggle Button */}
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
                <span>Optik Form ({answeredCount}/{totalQuestions})</span>
              </button>

              {/* Next / Finish */}
              {activeQIdx < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveQIdx(p => Math.min(totalQuestions - 1, p + 1))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: '#ffffff',
                    fontSize: '0.76rem',
                    fontWeight: 900
                  }}
                >
                  <span>Sonraki</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishExam}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: '#ffffff',
                    fontSize: '0.76rem',
                    fontWeight: 900
                  }}
                >
                  <span>Bitir</span>
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── DESKTOP RIGHT PANEL: COMPLETE OPTICAL ANSWER SHEET (32%) ── */}
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

            {renderOpticalSheetContent()}
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
                  Optik Cevap Kağıdı ({answeredCount}/{totalQuestions})
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
              {renderOpticalSheetContent()}
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
