import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useQuestionBank } from '../../../context/QuestionBankContext';
import { resolveTestQuestions } from '../../../utils/testResolver';
import { idbGetPayload } from '../../../services/indexedDbService';
import ImageLightbox, { StandardImageFrame, isValidImageUrl, extractImageUrls, normalizeImageUrl } from '../common/ImageLightbox';
import DrawingCanvas from '../common/DrawingCanvas';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Sun, Moon, Pencil, ArrowLeft } from 'lucide-react';
import { isSectionOpenEnded } from '../utils/quizTypeDetector';
import { checkIsAnswerCorrect, compareOpenEndedAnswers } from '../../../utils/answerEvaluation';

export default function ImageQuizRunner({ test, questions: initialQuestions, onAutoSave, onSubmit, studentId, onExit }) {
  const { isDark, toggleTheme } = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { tests: globalTests } = useQuestionBank();

  // Resolve questions if not fully populated
  const questions = useMemo(() => {
    if (Array.isArray(initialQuestions) && initialQuestions.length > 0) {
      return initialQuestions;
    }
    return resolveTestQuestions(test, globalTests || []);
  }, [test, initialQuestions, globalTests]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [openEndedText, setOpenEndedText] = useState({});
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [idbPayload, setIdbPayload] = useState(null);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  const draftKey = useMemo(() => {
    return `quiz_draft_${test.id || 'unassigned'}_${studentId || 'anon'}`;
  }, [test.id, studentId]);

  // Load IndexedDB payload if needed
  useEffect(() => {
    let isMounted = true;
    async function checkIdb() {
      const rawIds = [
        test.id,
        test.testId,
        test.hwId,
        test.homeworkId,
        test.realTestId,
        test.sourceTestId,
        test.sourceId,
        test.questionId,
        ...(test.questionIds || []),
        ...(test.selectedQuestions || []),
        ...(questions || []).map(q => q.id),
        ...(questions || []).map(q => q.questionId),
        ...(Array.isArray(test.sections) ? test.sections.map(s => s.id || s.questionId) : []),
        ...(Array.isArray(test.questionsList) ? test.questionsList.map(q => q.id || q.questionId) : [])
      ];

      const idsToTry = [];
      rawIds.forEach(id => {
        if (!id) return;
        const strId = typeof id === 'object' ? (id.id || id.questionId) : String(id);
        if (strId) {
          const clean = strId.replace(/^q_|^hw_|^test_|^sec_|^img_|^image_/, '');
          idsToTry.push(strId);
          idsToTry.push(clean);
          idsToTry.push(`q_${clean}`);
          idsToTry.push(`q${clean}`);
          idsToTry.push(`hw_${clean}`);
          idsToTry.push(`test_${clean}`);
          idsToTry.push(`img_${clean}`);
        }
      });

      const uniqueIds = [...new Set(idsToTry.filter(Boolean))];
      for (const candidate of uniqueIds) {
        try {
          const payload = await idbGetPayload(candidate);
          if (isMounted && payload && payload.length > 50 && !payload.includes('[STORED_IN_INDEXEDDB]')) {
            setIdbPayload(payload);
            return;
          }
        } catch (err) {}
      }
    }
    checkIdb();
    return () => { isMounted = false; };
  }, [test, questions]);

  // Load draft answers from localStorage
  useEffect(() => {
    try {
      const savedAns = localStorage.getItem(`${draftKey}_ans`);
      if (savedAns) {
        setAnswers(JSON.parse(savedAns));
      }
      const savedTxt = localStorage.getItem(`${draftKey}_txt`);
      if (savedTxt) {
        setOpenEndedText(JSON.parse(savedTxt));
      }
    } catch {}
  }, [draftKey]);

  // Get all image URLs
  const allImageUrls = useMemo(() => {
    const list = [];
    if (Array.isArray(questions) && questions.length > 0) {
      questions.forEach(q => {
        const qUrls = extractImageUrls(q);
        qUrls.forEach(u => { if (!list.includes(u)) list.push(u); });
      });
    }
    const testUrls = extractImageUrls(test);
    testUrls.forEach(u => { if (!list.includes(u)) list.push(u); });

    if (idbPayload) {
      const idbUrls = extractImageUrls(idbPayload);
      idbUrls.forEach(u => { if (!list.includes(u)) list.push(u); });
    }

    return list.filter(isValidImageUrl).map(normalizeImageUrl);
  }, [questions, test, idbPayload]);

  const activeQuestion = questions[currentIndex] || {};

  const qCount = useMemo(() => {
    if (questions && questions.length > 1) return questions.length;
    if (test.questionsList && test.questionsList.length > 0) return test.questionsList.length;
    if (test.questionCount && Number(test.questionCount) > 0) return Number(test.questionCount);
    if (test.totalQuestions && Number(test.totalQuestions) > 0) return Number(test.totalQuestions);
    const keyArray = test.answerKey || questions[0]?.answerKey;
    if (Array.isArray(keyArray) && keyArray.length > 0) return keyArray.length;
    if (allImageUrls.length > 0) return allImageUrls.length;
    return 1;
  }, [questions, test, allImageUrls.length]);

  const currentQ = questions[currentIndex] || {};
  const isOpenEndedMode = useMemo(() => {
    return isSectionOpenEnded(test) || isSectionOpenEnded(currentQ) || currentQ.type === 'acik_uclu' || currentQ.questionType === 'acik_uclu' || currentQ.isOpenEnded;
  }, [test, currentQ]);

  const perQuestionMins = Number(test.timePerQuestion || test.time_per_question || test.durationPerQuestion) || 2;
  const totalSeconds = useMemo(() => (qCount * perQuestionMins * 60) || 1200, [qCount, perQuestionMins]);

  const [timeLeft, setTimeLeft] = useState(() => {
    try {
      const saved = localStorage.getItem(`${draftKey}_time`);
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0 && val <= totalSeconds) return val;
      }
    } catch {}
    return totalSeconds;
  });

  useEffect(() => {
    if (timeLeft > totalSeconds) {
      setTimeLeft(totalSeconds);
    }
  }, [totalSeconds]);

  // Save draft answers instantly
  useEffect(() => {
    try {
      if (Object.keys(answers).length > 0) {
        localStorage.setItem(`${draftKey}_ans`, JSON.stringify(answers));
      }
    } catch {}
  }, [answers, draftKey]);

  useEffect(() => {
    try {
      if (Object.keys(openEndedText).length > 0) {
        localStorage.setItem(`${draftKey}_txt`, JSON.stringify(openEndedText));
      }
    } catch {}
  }, [openEndedText, draftKey]);

  const [saveTimeout, setSaveTimeout] = useState(null);

  const triggerAutoSave = (currentAnswers, currentText) => {
    if (!onAutoSave) return;
    if (saveTimeout) clearTimeout(saveTimeout);

    const timeoutId = setTimeout(() => {
      const formattedAnswers = [];
      for (let i = 0; i < qCount; i++) {
        const qNo = i + 1;
        const qObj = questions[i] || questions[0] || {};
        const userAns = currentAnswers[qNo] !== undefined ? currentAnswers[qNo] : (currentAnswers[String(qNo)] !== undefined ? currentAnswers[String(qNo)] : currentAnswers[i + 1]);
        const textAns = currentText[qNo] || currentText[String(qNo)] || null;

        formattedAnswers.push({
          questionId: qObj.id ? `${qObj.id}_${qNo}` : `q${qNo}`,
          questionNo: qNo,
          userAnswer: userAns !== undefined ? userAns : null,
          userAnswerText: textAns || null,
          correctAnswerLetter: qObj.correctAnswerLetter || null
        });
      }
      onAutoSave(formattedAnswers);
    }, 2000);
    setSaveTimeout(timeoutId);
  };

  // Save timer instantly
  useEffect(() => {
    if (timeLeft <= 0) return;
    try {
      localStorage.setItem(`${draftKey}_time`, String(timeLeft));
    } catch {}

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
  }, [draftKey]);

  const hasAutoSubmittedRef = useRef(false);
  useEffect(() => {
    if (timeLeft === 0 && !hasAutoSubmittedRef.current) {
      hasAutoSubmittedRef.current = true;
      handleSubmit();
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const p = n => String(n).padStart(2, '0');
    return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
  };

  const activeImageUrl = useMemo(() => {
    // 1. Direct active question imageUrl
    if (activeQuestion.imageUrl && isValidImageUrl(activeQuestion.imageUrl)) {
      return normalizeImageUrl(activeQuestion.imageUrl);
    }
    // 2. Direct active question contentPayload
    if (activeQuestion.contentPayload && isValidImageUrl(activeQuestion.contentPayload)) {
      return normalizeImageUrl(activeQuestion.contentPayload);
    }
    // 3. Extracted from active question
    const fromActive = extractImageUrls(activeQuestion);
    if (fromActive.length > 0) {
      if (fromActive.length > 1 && fromActive[currentIndex]) return fromActive[currentIndex];
      return fromActive[0];
    }
    // 4. From allImageUrls matching current question index
    if (allImageUrls.length > 0) {
      if (allImageUrls[currentIndex]) return allImageUrls[currentIndex];
      if (allImageUrls.length === 1 && currentIndex === 0) return allImageUrls[0];
    }
    // 5. Test direct (indexed by currentIndex)
    const testDirect = extractImageUrls(test);
    if (testDirect.length > 0) {
      if (testDirect[currentIndex]) return testDirect[currentIndex];
      if (testDirect.length === 1 && currentIndex === 0) return testDirect[0];
    }
    // 6. From IDB
    if (idbPayload) {
      const idbUrls = extractImageUrls(idbPayload);
      if (idbUrls.length > 0) {
        if (idbUrls[currentIndex]) return idbUrls[currentIndex];
        if (idbUrls.length === 1 && currentIndex === 0) return idbUrls[0];
      }
    }
    return null;
  }, [activeQuestion, allImageUrls, currentIndex, test, idbPayload]);

  const imageUrls = useMemo(() => {
    if (activeImageUrl) return [activeImageUrl];
    return [];
  }, [activeImageUrl]);

  const handleOptionSelect = (optionIdx) => {
    setAnswers(prev => {
      const currentAns = prev[currentIndex + 1]?.userAnswer;
      const nextOpt = currentAns === optionIdx ? null : optionIdx;

      const updated = { ...prev };
      if (nextOpt === null) {
        delete updated[currentIndex + 1];
      } else {
        updated[currentIndex + 1] = {
          questionId: activeQuestion.id || `q_${currentIndex + 1}`,
          userAnswer: nextOpt,
          isCorrect: activeQuestion.correctAnswer !== undefined ? nextOpt === activeQuestion.correctAnswer : null
        };
      }

      // Format current Answers properly for triggerAutoSave
      const simplifiedAnswers = {};
      Object.keys(updated).forEach(k => {
        if (updated[k]?.userAnswer !== null && updated[k]?.userAnswer !== undefined) {
          simplifiedAnswers[k] = updated[k].userAnswer;
        }
      });
      triggerAutoSave(simplifiedAnswers, openEndedText);
      return updated;
    });
  };

  const handleTextChange = (val) => {
    setOpenEndedText(prev => {
      const updatedText = {
        ...prev,
        [currentIndex + 1]: val
      };
      
      const simplifiedAnswers = {};
      Object.keys(answers).forEach(k => {
        simplifiedAnswers[k] = answers[k]?.userAnswer;
      });
      triggerAutoSave(simplifiedAnswers, updatedText);
      return updatedText;
    });

    setAnswers(prev => ({
      ...prev,
      [currentIndex + 1]: {
        questionId: activeQuestion.id || `q_${currentIndex + 1}`,
        userAnswerText: val
      }
    }));
  };

  const handleSubmit = () => {
    const formatted = [];
    for (let i = 0; i < qCount; i++) {
      const qNo = i + 1;
      const qObj = questions[i] || questions[0] || {};
      const userAnsObj = answers[qNo];
      const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
      const textAns = openEndedText[qNo];
      const isOe = isSectionOpenEnded(test) || isSectionOpenEnded(qObj) || qObj.type === 'acik_uclu' || qObj.questionType === 'acik_uclu' || qObj.isOpenEnded;

      let isCorrect = null;
      if (isOe) {
        const correctKey = qObj.correctAnswer || (test.answerKey ? (test.answerKey[qNo] ?? test.answerKey[String(qNo)]) : null);
        if (correctKey !== null && correctKey !== undefined && String(correctKey).trim() !== '') {
          isCorrect = compareOpenEndedAnswers(textAns || userAns, correctKey);
        }
      } else if (userAns !== undefined && userAns !== null && userAns !== '') {
        isCorrect = checkIsAnswerCorrect(userAns, qObj, test, qNo);
      }

      formatted.push({
        questionId: qObj.id || `q${qNo}`,
        questionNo: qNo,
        userAnswer: userAns !== undefined ? userAns : null,
        userAnswerText: textAns || null,
        isCorrect,
        correctAnswer: qObj.correctAnswer !== undefined ? qObj.correctAnswer : (test.answerKey ? (test.answerKey[qNo] ?? test.answerKey[String(qNo)]) : null)
      });
    }

    try {
      localStorage.removeItem(`${draftKey}_ans`);
      localStorage.removeItem(`${draftKey}_txt`);
      localStorage.removeItem(`${draftKey}_time`);
    } catch {}

    onSubmit(formatted);
  };

  const currentAnswer = answers[currentIndex + 1]?.userAnswer;
  const currentTextAnswer = openEndedText[currentIndex + 1] || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', overflow: 'hidden' }}>
      
      {/* ── Header ── */}
      <header style={{
        padding: isMobile ? '0.45rem 0.75rem' : '0.65rem 1.25rem',
        background: 'var(--color-surface)',
        borderBottom: '1.5px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
        gap: '0.5rem',
        flexShrink: 0,
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.65rem', overflow: 'hidden', minWidth: 0, flex: 1 }}>
          <button
            type="button"
            onClick={onExit || (() => window.history.back())}
            title="Sınavdan Çık / Geri Dön"
            style={{
              padding: isMobile ? '0.28rem 0.5rem' : '0.35rem 0.75rem',
              borderRadius: '0.55rem',
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border-input)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
              fontSize: isMobile ? '0.74rem' : '0.82rem',
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={isMobile ? 15 : 18} />
            {!isMobile && <span>Geri</span>}
          </button>
          <span style={{
            padding: isMobile ? '0.2rem 0.45rem' : '0.28rem 0.6rem',
            background: 'linear-gradient(135deg, #059669, #10b981)',
            borderRadius: '0.4rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.62rem' : '0.7rem',
            color: 'white',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            🖼️ GÖRSEL TEST
          </span>
          <h2 style={{
            fontSize: isMobile ? '0.82rem' : '0.95rem',
            fontWeight: 900,
            margin: 0,
            color: 'var(--color-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0
          }}>
            {test.title || test.name}
          </h2>
          <span style={{
            fontSize: isMobile ? '0.68rem' : '0.78rem',
            color: 'var(--color-text-muted)',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            Soru {currentIndex + 1}/{qCount}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.6rem', flexShrink: 0 }}>
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
            style={{
              padding: isMobile ? '0.25rem 0.45rem' : '0.32rem 0.65rem',
              borderRadius: '0.5rem',
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border-input)',
              color: 'var(--color-text)',
              fontWeight: 800,
              fontSize: isMobile ? '0.72rem' : '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.15s ease'
            }}
          >
            {isDark ? <Sun size={isMobile ? 12 : 14} color="#f59e0b" /> : <Moon size={isMobile ? 12 : 14} color="#6366f1" />}
            {!isMobile && <span>{isDark ? 'Açık' : 'Koyu'}</span>}
          </button>

          <div style={{
            padding: isMobile ? '0.25rem 0.55rem' : '0.32rem 0.75rem',
            borderRadius: '0.5rem',
            background: timeLeft < 300 ? (isDark ? 'rgba(220, 38, 38, 0.2)' : '#fef2f2') : 'var(--color-surface-hover)',
            color: timeLeft < 300 ? '#dc2626' : 'var(--color-text)',
            fontWeight: 900,
            fontSize: isMobile ? '0.74rem' : '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            border: `1.5px solid ${timeLeft < 300 ? '#fecaca' : 'var(--color-border-input)'}`,
            whiteSpace: 'nowrap'
          }}>
            <Clock size={isMobile ? 12 : 14} color={timeLeft < 300 ? '#dc2626' : '#059669'} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsDrawingOpen(prev => !prev)}
            style={{
              padding: isMobile ? '0.28rem 0.65rem' : '0.4rem 0.85rem',
              borderRadius: '0.55rem',
              border: `1.5px solid ${isDrawingOpen ? '#6366f1' : 'var(--color-border-input)'}`,
              background: isDrawingOpen ? 'rgba(99,102,241,0.12)' : 'var(--color-surface-hover)',
              color: isDrawingOpen ? '#4f46e5' : 'var(--color-text)',
              fontWeight: 800,
              fontSize: isMobile ? '0.72rem' : '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              whiteSpace: 'nowrap'
            }}
          >
            <Pencil size={isMobile ? 13 : 15} />
            <span>{isMobile ? 'Çizim' : 'Çizim Tahtası'}</span>
          </button>

          <button
            onClick={handleSubmit}
            style={{
              padding: isMobile ? '0.28rem 0.65rem' : '0.4rem 1rem',
              borderRadius: '0.55rem',
              background: 'linear-gradient(135deg,#10b981,#059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.72rem' : '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              boxShadow: '0 3px 10px rgba(16,185,129,0.25)',
              whiteSpace: 'nowrap'
            }}
          >
            <CheckCircle2 size={isMobile ? 13 : 16} />
            <span>{isMobile ? 'Bitir' : 'Testi Bitir'}</span>
          </button>
        </div>
      </header>

      {/* ── Mobile Horizontal Question Navigator Bar ── */}
      {isMobile && (
        <div style={{
          padding: '0.4rem 0.6rem',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          overflowX: 'auto',
          flexShrink: 0,
          WebkitOverflowScrolling: 'touch'
        }}>
          {Array.from({ length: qCount }).map((_, idx) => {
            const qNum = idx + 1;
            const isCurrent = idx === currentIndex;
            const hasAns = answers[qNum] !== undefined || Boolean(openEndedText[qNum]);
            return (
              <button
                key={qNum}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  minWidth: '34px',
                  height: '30px',
                  padding: '0 0.35rem',
                  borderRadius: '0.45rem',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  border: isCurrent ? '2px solid #6366f1' : (hasAns ? '1.5px solid #10b981' : '1px solid var(--color-border-input)'),
                  background: isCurrent ? '#6366f1' : (hasAns ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5') : 'var(--color-surface)'),
                  color: isCurrent ? 'white' : (hasAns ? '#10b981' : 'var(--color-text)')
                }}
              >
                {qNum}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        overflow: 'hidden',
        minHeight: 0
      }}>
        {/* Question Image Viewer */}
        <div style={{
          flex: isMobile ? 1 : 1,
          minWidth: 0,
          background: 'var(--color-bg)',
          overflowY: 'auto',
          padding: isMobile ? '0.75rem' : '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: isMobile ? '0.65rem' : '1rem'
        }}>
          <ImageLightbox isOpen={Boolean(lightboxSrc)} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

          {imageUrls.length > 0 ? (
            imageUrls.map((url, idx) => (
              <StandardImageFrame key={idx} src={url} alt={`Soru ${currentIndex + 1}`} onOpenFullscreen={() => setLightboxSrc(url)} />
            ))
          ) : (
            <div style={{ padding: isMobile ? '1.5rem' : '3rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '2px dashed var(--color-border)', borderRadius: '1rem', background: 'var(--color-surface)', width: '100%', maxWidth: '400px', boxSizing: 'border-box' }}>
              <span style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', display: 'block', marginBottom: '0.4rem' }}>🖼️</span>
              <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--color-text)', fontSize: isMobile ? '0.9rem' : '1rem' }}>Görsel Yüklenemedi</h4>
              <p style={{ margin: 0, fontSize: isMobile ? '0.75rem' : '0.85rem' }}>Bu soruya ait görsel içerik bulunamadı veya henüz yüklenmedi.</p>
            </div>
          )}

          {/* On Mobile: Question Input is embedded right below the image inside the scrollable container */}
          {isMobile && (
            <div style={{
              width: '100%',
              background: 'var(--color-surface)',
              borderRadius: '0.85rem',
              border: '1.5px solid var(--color-border)',
              padding: '0.85rem',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  Soru {currentIndex + 1}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsDrawingOpen(prev => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '0.4rem',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-hover)',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    title="Çizim Tahtası"
                  >
                    <Pencil size={12} />
                    <span>Çizim</span>
                  </button>
                  {isOpenEndedMode && (
                    <span style={{ padding: '0.15rem 0.45rem', background: 'rgba(124, 58, 237, 0.15)', color: '#a855f7', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '0.4rem', fontSize: '0.72rem', fontWeight: 800 }}>✍️ Açık Uçlu / Yazılı</span>
                  )}
                </div>
              </div>

              {isOpenEndedMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                    ✍️ Yanıtınızı Giriniz:
                  </label>
                  <textarea
                    value={currentTextAnswer}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder={`Soru ${currentIndex + 1} için yanıtınızı buraya yazınız...`}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '0.65rem',
                      border: '1.5px solid var(--color-border-input)',
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      fontFamily: 'inherit',
                      fontSize: '0.88rem',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                    Seçeneğinizi İşaretleyiniz:
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => {
                      const isSelected = currentAnswer === optIdx;
                      return (
                        <button
                          key={opt}
                          onClick={() => handleOptionSelect(optIdx)}
                          style={{
                            flex: 1,
                            height: '42px',
                            borderRadius: '0.55rem',
                            border: isSelected ? '2px solid #2563eb' : '1.5px solid var(--color-border-input)',
                            background: isSelected ? '#2563eb' : 'var(--color-surface-hover)',
                            color: isSelected ? 'white' : 'var(--color-text)',
                            fontWeight: 900,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side on Desktop: Answer Form / Optical Bubble Bar */}
        {!isMobile && (
          <div style={{ width: '360px', flexShrink: 0, background: 'var(--color-surface)', borderLeft: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Desktop Question Grid Bar */}
            <div style={{ padding: '1rem', borderBottom: '1.5px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-text-secondary)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sorular ({qCount})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.35rem', maxHeight: '110px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                {Array.from({ length: qCount }).map((_, idx) => {
                  const qNum = idx + 1;
                  const isCurrent = idx === currentIndex;
                  const hasAns = answers[qNum] !== undefined || Boolean(openEndedText[qNum]);
                  return (
                    <button
                      key={qNum}
                      onClick={() => setCurrentIndex(idx)}
                      style={{
                        height: '32px',
                        borderRadius: '0.45rem',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        border: isCurrent ? '2px solid #6366f1' : (hasAns ? '1.5px solid #10b981' : '1px solid var(--color-border-input)'),
                        background: isCurrent ? '#6366f1' : (hasAns ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5') : 'var(--color-surface)'),
                        color: isCurrent ? 'white' : (hasAns ? '#10b981' : 'var(--color-text)')
                      }}
                    >
                      {qNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Question Input Card */}
            <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  Soru {currentIndex + 1}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsDrawingOpen(prev => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '0.45rem',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-hover)',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    title="Çizim Tahtası"
                  >
                    <Pencil size={13} />
                    <span>Çizim Tahtası</span>
                  </button>
                  {isOpenEndedMode && (
                    <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(124, 58, 237, 0.15)', color: '#a855f7', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 800 }}>✍️ Açık Uçlu / Yazılı</span>
                  )}
                </div>
              </div>

              {isOpenEndedMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                    ✍️ Yanıtınızı Giriniz:
                  </label>
                  <textarea
                    value={currentTextAnswer}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder={`Soru ${currentIndex + 1} için yanıtınızı buraya yazınız...`}
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.65rem',
                      border: '1.5px solid var(--color-border-input)',
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                    Seçeneğinizi İşaretleyiniz:
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => {
                      const isSelected = currentAnswer === optIdx;
                      return (
                        <button
                          key={opt}
                          onClick={() => handleOptionSelect(optIdx)}
                          style={{
                            flex: 1,
                            height: '46px',
                            borderRadius: '0.6rem',
                            border: isSelected ? '2px solid #2563eb' : '1.5px solid var(--color-border-input)',
                            background: isSelected ? '#2563eb' : 'var(--color-surface-hover)',
                            color: isSelected ? 'white' : 'var(--color-text)',
                            fontWeight: 900,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Bottom Navigation */}
            <div style={{ padding: '0.85rem 1.25rem', borderTop: '1.5px solid var(--color-border)', background: 'var(--color-surface-hover)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <button
                onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
                disabled={currentIndex === 0}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: '0.55rem',
                  background: currentIndex === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                  border: '1.5px solid var(--color-border-input)',
                  color: currentIndex === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: currentIndex === 0 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem'
                }}
              >
                <ChevronLeft size={16} /> Önceki
              </button>
              <button
                onClick={() => setCurrentIndex(p => Math.min(qCount - 1, p + 1))}
                disabled={currentIndex === qCount - 1}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: '0.55rem',
                  background: currentIndex === qCount - 1 ? 'var(--color-surface-hover)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: currentIndex === qCount - 1 ? '1.5px solid var(--color-border-input)' : 'none',
                  color: currentIndex === qCount - 1 ? 'var(--color-text-muted)' : 'white',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: currentIndex === qCount - 1 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem'
                }}
              >
                Sonraki <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      {isMobile && (
        <div style={{
          padding: '0.5rem 0.75rem',
          borderTop: '1.5px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          flexShrink: 0,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
          zIndex: 15
        }}>
          <button
            onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
            disabled={currentIndex === 0}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '0.55rem',
              background: currentIndex === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
              border: '1.5px solid var(--color-border-input)',
              color: currentIndex === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: currentIndex === 0 ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem'
            }}
          >
            <ChevronLeft size={15} /> Önceki
          </button>

          <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-text-secondary)', padding: '0 0.25rem', whiteSpace: 'nowrap' }}>
            {currentIndex + 1} / {qCount}
          </span>

          <button
            onClick={() => {
              if (currentIndex < qCount - 1) {
                setCurrentIndex(p => p + 1);
              } else {
                handleSubmit();
              }
            }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '0.55rem',
              background: currentIndex === qCount - 1 ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              boxShadow: '0 2px 8px rgba(99,102,241,0.25)'
            }}
          >
            {currentIndex === qCount - 1 ? (
              <>Testi Bitir <CheckCircle2 size={15} /></>
            ) : (
              <>Sonraki <ChevronRight size={15} /></>
            )}
          </button>
        </div>
      )}

      {/* Global Drawing Pad */}
      <DrawingCanvas
        isOpen={isDrawingOpen}
        onClose={() => setIsDrawingOpen(false)}
      />
    </div>
  );
}
