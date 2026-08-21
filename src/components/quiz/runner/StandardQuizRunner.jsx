import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useQuestionBank } from '../../../context/QuestionBankContext';
import { resolveTestQuestions } from '../../../utils/testResolver';
import { idbGetPayload } from '../../../services/indexedDbService';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Sun, Moon } from 'lucide-react';

export default function StandardQuizRunner({ test, questions: initialQuestions, onAutoSave, onSubmit, studentId }) {
  const { isDark, toggleTheme } = useTheme();
  const { tests: globalTests } = useQuestionBank();
  
  const [idbPayload, setIdbPayload] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [openEndedText, setOpenEndedText] = useState({});
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Gesture handling for touch swipes
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const draftKey = useMemo(() => {
    return `quiz_draft_${test.id || 'unassigned'}_${studentId || 'anon'}`;
  }, [test.id, studentId]);

  // Load IndexedDB payload if needed
  useEffect(() => {
    let isMounted = true;
    async function checkIdb() {
      if (
        test.contentPayload === '[STORED_IN_INDEXEDDB]' ||
        (initialQuestions && initialQuestions.some(q => q.contentPayload === '[STORED_IN_INDEXEDDB]' || q.imageUrl === '[STORED_IN_INDEXEDDB]'))
      ) {
        try {
          const payload = await idbGetPayload(test.id);
          if (isMounted && payload) {
            setIdbPayload(payload);
          }
        } catch (err) {
          console.error("IDB payload load error in StandardQuizRunner:", err);
        }
      }
    }
    checkIdb();
    return () => { isMounted = false; };
  }, [test.id, test.contentPayload, initialQuestions]);

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

  // Resolve questions robustly
  const resolvedQuestions = useMemo(() => {
    const questions = resolveTestQuestions(test, initialQuestions, globalTests);
    if (questions && questions.length > 0) return questions;

    const parseJsonList = (str) => {
      if (!str || typeof str !== 'string') return null;
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
      } catch {}
      return null;
    };

    const payloadParsed = parseJsonList(test.contentPayload || idbPayload);
    if (payloadParsed) return payloadParsed;

    if (Array.isArray(test.questions) && test.questions.length > 0) {
      return test.questions;
    }

    return [test];
  }, [initialQuestions, test, globalTests, idbPayload]);

  const activeQuestion = resolvedQuestions[currentIndex] || {};
  const qCount = useMemo(() => {
    return Math.max(test.questionCount || 0, resolvedQuestions.length || 1);
  }, [test.questionCount, resolvedQuestions.length]);

  const isOpenEndedMode = useMemo(() => {
    if (
      test.questionType === 'acik_uclu' ||
      test.type === 'acik_uclu' ||
      test.contentType === 'acik_uclu' ||
      test.isOpenEnded
    ) {
      return true;
    }

    if (activeQuestion && (
      activeQuestion.type === 'acik_uclu' ||
      activeQuestion.type === 'yazili' ||
      activeQuestion.contentType === 'acik_uclu' ||
      activeQuestion.contentType === 'yazili' ||
      activeQuestion.isOpenEnded
    )) {
      return true;
    }

    if (activeQuestion && (
      activeQuestion.type === 'coktan_secmeli' ||
      activeQuestion.questionType === 'coktan_secmeli'
    )) {
      return false;
    }

    if (
      test.questionType === 'coktan_secmeli' ||
      test.type === 'coktan_secmeli' ||
      test.contentType === 'coktan_secmeli' ||
      (Array.isArray(test.answerKey) && test.answerKey.length > 0)
    ) {
      return false;
    }

    const hasValidOptions = activeQuestion && Array.isArray(activeQuestion.options) && activeQuestion.options.some(opt => opt && String(opt).trim() !== '');
    if (hasValidOptions) {
      return false;
    }

    const titleStr = String(test.title || test.name || '').toLowerCase();
    if (titleStr && (
      titleStr.includes('açık uçlu') ||
      titleStr.includes('acik uclu') ||
      titleStr.includes('yazılı') ||
      titleStr.includes('yazili')
    )) {
      return true;
    }
    
    return false;
  }, [test, activeQuestion]);

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

  const saveTimeoutRef = useRef(null);

  const triggerAutoSave = (currentAnswers, currentText) => {
    if (!onAutoSave) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      const formattedAnswers = [];
      for (let i = 0; i < qCount; i++) {
        const qNo = i + 1;
        const qObj = resolvedQuestions[i] || {};
        const userAns = currentAnswers[qNo] !== undefined ? currentAnswers[qNo] : (currentAnswers[String(qNo)] !== undefined ? currentAnswers[String(qNo)] : currentAnswers[i + 1]);
        const textAns = currentText[qNo] || currentText[String(qNo)] || null;

        formattedAnswers.push({
          questionId: qObj.id || `q${qNo}`,
          questionNo: qNo,
          userAnswer: userAns !== undefined ? userAns : null,
          userAnswerText: textAns,
          correctAnswerLetter: qObj.correctAnswerLetter || null
        });
      }
      onAutoSave(formattedAnswers);
    }, 2000);
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
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [draftKey]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const p = n => String(n).padStart(2, '0');
    return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
  };

  let questionImageUrls = [];
  const isQObjActuallyTest = String(activeQuestion.id) === String(test.id);

  if (!isQObjActuallyTest && activeQuestion.imageUrls && activeQuestion.imageUrls.length > 0) {
    questionImageUrls = activeQuestion.imageUrls;
  } else if (!isQObjActuallyTest && activeQuestion.imageUrl) {
    questionImageUrls = [activeQuestion.imageUrl];
  } else if (!isQObjActuallyTest && activeQuestion.contentPayload && activeQuestion.contentPayload.startsWith('data:image')) {
    questionImageUrls = [activeQuestion.contentPayload];
  } else {
    const processPayloadStr = (payload) => {
      if (!payload) return [];
      if (Array.isArray(payload)) return payload;
      if (typeof payload === 'string') {
        if (payload.includes('|') || payload.includes('\n')) {
          return payload.split(/\n\n|\n|\|/).map(s => s.trim()).filter(Boolean);
        }
        if (payload.startsWith('data:image') || payload.startsWith('http') || payload.startsWith('/')) {
          return [payload];
        }
      }
      return [];
    };

    let testRawImages = [];
    if (test.imageUrls && test.imageUrls.length > 0) {
      testRawImages = processPayloadStr(test.imageUrls);
    }
    if (testRawImages.length === 0 && test.imageUrl) {
      testRawImages = processPayloadStr(test.imageUrl);
    }
    if (testRawImages.length === 0 && test.contentPayload && test.contentPayload !== '[STORED_IN_INDEXEDDB]') {
      testRawImages = processPayloadStr(test.contentPayload);
    } 
    if (testRawImages.length === 0 && idbPayload && idbPayload !== '[STORED_IN_INDEXEDDB]') {
      testRawImages = processPayloadStr(idbPayload);
    }
    
    const testImages = testRawImages.filter(isValidImageUrl);
    if (testImages.length > 0) {
      if (testImages.length === 1) {
        questionImageUrls = [testImages[0]];
      } else {
        if (testImages[currentIndex]) {
          questionImageUrls = [testImages[currentIndex]];
        }
      }
    }
  }

  const imageUrls = (Array.isArray(questionImageUrls) ? questionImageUrls : [questionImageUrls]).filter(isValidImageUrl);

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
      const qObj = resolvedQuestions[i] || {};
      const userAnsObj = answers[qNo];
      const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
      const textAns = openEndedText[qNo];

      let isCorrect = null;
      if (userAns !== undefined && userAns !== null) {
        if (qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
          isCorrect = Number(userAns) === Number(qObj.correctAnswer);
        }
      }

      formatted.push({
        questionId: qObj.id || `q${qNo}`,
        questionNo: qNo,
        userAnswer: userAns !== undefined ? userAns : null,
        userAnswerText: textAns || null,
        isCorrect,
        correctAnswer: qObj.correctAnswer !== undefined ? qObj.correctAnswer : null
      });
    }

    try {
      localStorage.removeItem(`${draftKey}_ans`);
      localStorage.removeItem(`${draftKey}_txt`);
      localStorage.removeItem(`${draftKey}_time`);
    } catch {}

    onSubmit(formatted);
  };

  // Touch Swipe Handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50 && currentIndex < qCount - 1) {
      setCurrentIndex(p => p + 1);
    } else if (diff < -50 && currentIndex > 0) {
      setCurrentIndex(p => p - 1);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const currentAnswer = answers[currentIndex + 1]?.userAnswer;
  const currentTextAnswer = openEndedText[currentIndex + 1] || '';

  const options = (activeQuestion.options && Array.isArray(activeQuestion.options) && activeQuestion.options.length > 0)
    ? activeQuestion.options
    : ['A', 'B', 'C', 'D', 'E'];

  const qText = activeQuestion.questionText || activeQuestion.text || activeQuestion.question || activeQuestion.title || activeQuestion.name || (activeQuestion.contentPayload && !activeQuestion.contentPayload.startsWith('data:') ? activeQuestion.contentPayload : null);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', overflow: 'hidden' }}
    >
      <ImageLightbox isOpen={Boolean(lightboxSrc)} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* ── Header ── */}
      <header style={{ padding: '0.65rem 1.25rem', background: 'var(--color-surface)', borderBottom: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span style={{ padding: '0.28rem 0.6rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius: '0.4rem', fontWeight: 900, fontSize: '0.7rem', color: 'white' }}>
            📝 SINAV
          </span>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 900, margin: 0, color: 'var(--color-text)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test.title || test.name}</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
            Soru {currentIndex + 1} / {qCount}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
            style={{
              padding: '0.32rem 0.65rem',
              borderRadius: '0.5rem',
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border-input)',
              color: 'var(--color-text)',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'all 0.15s ease'
            }}
          >
            {isDark ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#6366f1" />}
            <span>{isDark ? 'Açık' : 'Koyu'}</span>
          </button>

          <div style={{ padding: '0.32rem 0.75rem', borderRadius: '0.5rem', background: timeLeft < 300 ? (isDark ? 'rgba(220, 38, 38, 0.2)' : '#fef2f2') : 'var(--color-surface-hover)', color: timeLeft < 300 ? '#dc2626' : 'var(--color-text)', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: `1.5px solid ${timeLeft < 300 ? '#fecaca' : 'var(--color-border-input)'}` }}>
            <Clock size={14} color={timeLeft < 300 ? '#dc2626' : '#059669'} /> {formatTime(timeLeft)}
          </div>
          <button onClick={handleSubmit} style={{ padding: '0.4rem 1rem', borderRadius: '0.55rem', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 3px 10px rgba(16,185,129,0.25)' }}>
            <CheckCircle2 size={16} /> Testi Bitir
          </button>
        </div>
      </header>

      {/* ── Question Navigation Pills ── */}
      <div style={{ background: 'var(--color-surface)', borderBottom: '1.5px solid var(--color-border)', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, overflowX: 'auto' }}>
        {Array.from({ length: qCount }).map((_, idx) => {
          const qNum = idx + 1;
          const isCurrent = idx === currentIndex;
          const hasAns = answers[qNum] !== undefined || openEndedText[qNum];
          return (
            <button
              key={qNum}
              onClick={() => setCurrentIndex(idx)}
              style={{
                minWidth: '32px',
                height: '32px',
                padding: '0 0.5rem',
                borderRadius: '0.45rem',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                border: isCurrent ? '2px solid #2563eb' : (hasAns ? '1.5px solid #10b981' : '1px solid var(--color-border-input)'),
                background: isCurrent ? '#2563eb' : (hasAns ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5') : 'var(--color-surface)'),
                color: isCurrent ? 'white' : (hasAns ? '#10b981' : 'var(--color-text)')
              }}
            >
              {qNum}
            </button>
          );
        })}
      </div>

      {/* ── Main Question Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text)' }}>
                Soru {currentIndex + 1}
              </h3>
              {isOpenEndedMode && (
                <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(124, 58, 237, 0.15)', color: '#a855f7', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 800 }}>✍️ Açık Uçlu</span>
              )}
            </div>

            {/* Images */}
            {imageUrls.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                {imageUrls.map((url, i) => (
                  <StandardImageFrame key={i} src={url} alt={`Soru ${currentIndex + 1} Görsel ${i + 1}`} onOpenFullscreen={() => setLightboxSrc(url)} />
                ))}
              </div>
            )}

            {/* Question Text */}
            {qText && qText !== `Soru ${currentIndex + 1}` && (
              <div style={{ fontSize: '1.05rem', color: 'var(--color-text)', lineHeight: 1.6, fontWeight: 600, marginBottom: '1.5rem' }}>
                {qText}
              </div>
            )}

            {/* Options or Text Area */}
            {isOpenEndedMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  ✍️ Açık Uçlu Yanıtınızı Buraya Yazınız:
                </label>
                <textarea
                  value={currentTextAnswer}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Soru ${currentIndex + 1} için yanıtınızı buraya yazınız...`}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid var(--color-border-input)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
                {options.map((optText, optIdx) => {
                  const isSelected = currentAnswer === optIdx;
                  const optLetter = String.fromCharCode(65 + optIdx);
                  const showText = typeof optText === 'string' && optText.length > 1 && optText !== optLetter;

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleOptionSelect(optIdx)}
                      style={{
                        padding: '0.9rem 1.25rem',
                        borderRadius: '0.85rem',
                        border: isSelected ? '2px solid #2563eb' : '1.5px solid var(--color-border)',
                        background: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'var(--color-surface-hover)',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontWeight: 900, color: isSelected ? '#3b82f6' : 'var(--color-text-secondary)', fontSize: '1rem', marginRight: '0.75rem', minWidth: '24px' }}>
                        {optLetter})
                      </span>
                      <span style={{ fontSize: '0.95rem', color: isSelected ? '#3b82f6' : 'var(--color-text)', fontWeight: 700 }}>
                        {showText ? optText : `Seçenek ${optLetter}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prev / Next Bottom Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '2rem' }}>
            <button
              onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
              disabled={currentIndex === 0}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '0.65rem',
                background: currentIndex === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                border: '1.5px solid var(--color-border-input)',
                color: currentIndex === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: currentIndex === 0 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <ChevronLeft size={16} /> Önceki Soru
            </button>
            <button
              onClick={() => setCurrentIndex(p => Math.min(qCount - 1, p + 1))}
              disabled={currentIndex === qCount - 1}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '0.65rem',
                background: currentIndex === qCount - 1 ? 'var(--color-surface-hover)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                border: currentIndex === qCount - 1 ? '1.5px solid var(--color-border-input)' : 'none',
                color: currentIndex === qCount - 1 ? 'var(--color-text-muted)' : 'white',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: currentIndex === qCount - 1 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              Sonraki Soru <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
