import React, { useState, useEffect, useMemo, useRef } from 'react';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import DrawingCanvas from '../common/DrawingCanvas';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { Pencil, CheckCircle2, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { idbGetPayload } from '../../../services/indexedDbService';
import { extractQuestionText, extractQuestionOptions } from '../../../utils/testResolver';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export default function StandardQuizRunner({ test, questions, onSubmit, onAutoSave, draftAnswers }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const draftKey = useMemo(() => `draft_quiz_${test.id || 'test'}`, [test.id]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    if (draftAnswers && draftAnswers.length > 0) {
      const initAns = {};
      draftAnswers.forEach(a => {
        if (a.userAnswer !== null && a.userAnswer !== undefined) {
          initAns[a.questionNo] = a.userAnswer;
          initAns[String(a.questionNo)] = a.userAnswer;
        }
      });
      return initAns;
    }

    try {
      const saved = localStorage.getItem(`${draftKey}_ans`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [openEndedText, setOpenEndedText] = useState(() => {
    if (draftAnswers && draftAnswers.length > 0) {
      const initTxt = {};
      draftAnswers.forEach(a => {
        if (a.userAnswerText) {
          initTxt[a.questionNo] = a.userAnswerText;
          initTxt[String(a.questionNo)] = a.userAnswerText;
        }
      });
      return initTxt;
    }

    try {
      const saved = localStorage.getItem(`${draftKey}_txt`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // IndexedDB payload loading if contentPayload is in IndexedDB
  const loadedRef = useRef(null);
  const [idbPayload, setIdbPayload] = useState(null);

  useEffect(() => {
    const testId = test.id;
    const extractPayload = (obj) => {
      if (!obj) return null;
      const candidates = [obj.contentPayload, obj.jsonPayload, obj.payload];
      return candidates.find(c => typeof c === 'string' && c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]') || null;
    };

    if (extractPayload(test)) return;
    if (loadedRef.current === testId) return;

    async function loadFromIdb() {
      const ids = [testId, testId?.replace(/^q_/, ''), questions?.[0]?.id, test.questionsList?.[0]?.id].filter(Boolean);
      let resolved = null;
      for (const id of ids) {
        try {
          const val = await idbGetPayload(id);
          if (val && val !== '[STORED_IN_INDEXEDDB]') { resolved = val; break; }
        } catch {}
      }
      if (!resolved && questions?.length > 0) {
        for (const q of questions) {
          const c = extractPayload(q);
          if (c) { resolved = c; break; }
          if (q.id) {
            try {
              const val = await idbGetPayload(q.id);
              if (val) { resolved = val; break; }
            } catch {}
          }
        }
      }
      if (resolved) { loadedRef.current = testId; setIdbPayload(resolved); }
    }
    loadFromIdb();
  }, [test.id, test.contentPayload, questions]);

  // Resolve questions array
  const resolvedQuestions = useMemo(() => {
    const parseJsonList = (str) => {
      if (typeof str === 'string' && (str.trim().startsWith('[') || str.trim().startsWith('{'))) {
        try {
          const parsed = JSON.parse(str);
          const list = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.questionsList || parsed.items);
          if (list && Array.isArray(list) && list.length > 0) return list;
        } catch {}
      }
      return null;
    };

    if (questions && questions.length > 0) {
      if (questions.length === 1 && (questions[0].contentPayload || idbPayload)) {
        const parsed = parseJsonList(questions[0].contentPayload || idbPayload);
        if (parsed) return parsed;
      }
      if (questions.length === 1 && Array.isArray(questions[0].questionsList) && questions[0].questionsList.length > 0) {
        return questions[0].questionsList;
      }

      // Eğer tekil soru ve questionText/options varsa doğrudan kullan
      if (questions.length === 1) {
        const q = questions[0];
        // questionText yoksa test nesnesinden al
        const qText = q.questionText || q.text || q.question || test.questionText || test.text || '';
        const qOpts = (Array.isArray(q.options) && q.options.some(o => o && String(o).trim())) ? q.options
                    : (Array.isArray(test.options) && test.options.some(o => o && String(o).trim())) ? test.options
                    : q.options || [];
        return [{ ...q, questionText: qText, options: qOpts }];
      }

      return questions;
    }

    if (Array.isArray(test.questionsList) && test.questionsList.length > 0) {
      return test.questionsList;
    }

    const payloadParsed = parseJsonList(test.contentPayload || idbPayload);
    if (payloadParsed) return payloadParsed;

    if (Array.isArray(test.questions) && test.questions.length > 0) {
      return test.questions;
    }

    // Fallback: test nesnesinin kendisi tek soru olarak kullanılıyor
    return [test];
  }, [questions, test, idbPayload]);

  const activeQuestion = resolvedQuestions[currentIndex] || {};
  const qCount = useMemo(() => {
    return Math.max(test.questionCount || 0, resolvedQuestions.length || 1);
  }, [test.questionCount, resolvedQuestions.length]);

  const isOpenEndedMode = useMemo(() => {
    // 1. If the test as a whole is EXPLICITLY Open-Ended (Overrides everything!)
    if (
      test.questionType === 'acik_uclu' ||
      test.type === 'acik_uclu' ||
      test.contentType === 'acik_uclu' ||
      test.isOpenEnded
    ) {
      return true;
    }

    // 2. If the specific active question is EXPLICITLY Open-Ended
    if (activeQuestion && (
      activeQuestion.type === 'acik_uclu' ||
      activeQuestion.type === 'yazili' ||
      activeQuestion.contentType === 'acik_uclu' ||
      activeQuestion.contentType === 'yazili' ||
      activeQuestion.isOpenEnded
    )) {
      return true;
    }

    // 3. If the specific active question is EXPLICITLY Multiple Choice
    if (activeQuestion && (
      activeQuestion.type === 'coktan_secmeli' ||
      activeQuestion.questionType === 'coktan_secmeli'
    )) {
      return false;
    }

    // 4. If the test as a whole is EXPLICITLY Multiple Choice
    if (
      test.questionType === 'coktan_secmeli' ||
      test.type === 'coktan_secmeli' ||
      test.contentType === 'coktan_secmeli' ||
      (Array.isArray(test.answerKey) && test.answerKey.length > 0)
    ) {
      return false;
    }

    // 5. Check if options actually have valid text (not just empty strings)
    const hasValidOptions = activeQuestion && Array.isArray(activeQuestion.options) && activeQuestion.options.some(opt => opt && String(opt).trim() !== '');
    if (hasValidOptions) {
      return false;
    }

    // 6. Ambiguous fallback based on title
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

  const [saveTimeout, setSaveTimeout] = useState(null);

  const triggerAutoSave = (currentAnswers, currentText) => {
    if (!onAutoSave) return;
    if (saveTimeout) clearTimeout(saveTimeout);

    const timeoutId = setTimeout(() => {
      const formattedAnswers = [];
      for (let i = 0; i < qCount; i++) {
        const qNo = i + 1;
        const qObj = questions[i] || {};
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
    // Check all possible sources for the parent test images, including idbPayload which handles synced mobile payloads
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
      const updated = {
        ...prev,
        [currentIndex + 1]: {
          questionId: activeQuestion.id || `q_${currentIndex + 1}`,
          userAnswer: optionIdx,
          isCorrect: activeQuestion.correctAnswer !== undefined ? optionIdx === activeQuestion.correctAnswer : null
        }
      };
      
      const simplifiedAnswers = {};
      Object.keys(updated).forEach(k => {
        simplifiedAnswers[k] = updated[k]?.userAnswer;
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
    // Clear draft storage upon submission
    try {
      localStorage.removeItem(`${draftKey}_ans`);
      localStorage.removeItem(`${draftKey}_txt`);
      localStorage.removeItem(`${draftKey}_time`);
    } catch {}

    const formattedAnswers = Array.from({ length: qCount }).map((_, idx) => {
      const qNo = idx + 1;
      const qObj = resolvedQuestions[idx] || questions[idx] || {};
      const savedAns = answers[qNo] !== undefined ? answers[qNo] : (answers[String(qNo)] !== undefined ? answers[String(qNo)] : answers[idx]);
      const textVal = openEndedText[qNo] || openEndedText[String(qNo)] || '';

      const userAns = (savedAns !== null && typeof savedAns === 'object' && savedAns.userAnswer !== undefined)
        ? savedAns.userAnswer
        : ((savedAns !== null && savedAns !== undefined && typeof savedAns !== 'object') ? savedAns : null);

      const textAns = textVal || (savedAns && typeof savedAns === 'object' ? savedAns.userAnswerText : null) || null;
      
      const isCorrect = (userAns !== null && userAns !== undefined && userAns !== '')
        ? checkIsAnswerCorrect(userAns, qObj, { ...test, answerKey: test.answerKey || questions[0]?.answerKey }, qNo)
        : null;

      return {
        questionId: qObj.id || `q_${qNo}`,
        questionNo: qNo,
        userAnswer: userAns,
        userAnswerText: textAns,
        isCorrect: isCorrect
      };
    });

    onSubmit(formattedAnswers);
  };

  // 📱 Touch Swipe Gestures for Mobile
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const handleNext = () => setCurrentIndex(Math.min(qCount - 1, currentIndex + 1));
  const handlePrev = () => setCurrentIndex(Math.max(0, currentIndex - 1));

  const handleTouchStart = (e) => {
    if (isDrawingOpen) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (isDrawingOpen || touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Horizontal swipe threshold: at least 50px deltaX and predominantly horizontal
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0 && currentIndex < qCount - 1) {
        // Swiped Left -> Next Question
        handleNext();
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swiped Right -> Prev Question
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const currentAnsObj = answers[currentIndex + 1] || {};
  const currentTextVal = openEndedText[currentIndex + 1] || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      {/* Header */}
      <header style={{ 
        padding: isMobile ? '0.5rem 0.75rem' : '0.85rem 1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: '#1e293b', 
        borderBottom: '1px solid #334155',
        position: 'sticky', 
        top: 0, 
        zIndex: 10,
        flexShrink: 0,
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <h2 style={{ 
            color: '#f8fafc', 
            fontSize: isMobile ? '0.9rem' : '1.15rem', 
            fontWeight: 800, 
            margin: 0, 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            {test.title || "Standart Sınav"}
          </h2>
          <span style={{ color: '#94a3b8', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 600 }}>
            {isOpenEndedMode ? "Açık Uçlu Sınav" : "Çoktan Seçmeli"} • {qCount} Soru
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Total Countdown Timer Badge */}
          <div style={{
            padding: isMobile ? '0.35rem 0.5rem' : '0.4rem 0.85rem',
            borderRadius: '0.65rem',
            background: timeLeft < 300 ? '#7f1d1d' : '#0f172a',
            border: `1.5px solid ${timeLeft < 300 ? '#ef4444' : '#334155'}`,
            color: timeLeft < 300 ? '#fca5a5' : '#e0e7ff',
            fontWeight: 900,
            fontSize: isMobile ? '0.75rem' : '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Clock size={isMobile ? 14 : 16} color={timeLeft < 300 ? '#ef4444' : '#6366f1'} />
            <span>{formatTime(timeLeft)}</span>
            {!isMobile && (
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                (Toplam {qCount * perQuestionMins} dk)
              </span>
            )}
          </div>

          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: isMobile ? '0.4rem 0.5rem' : '0.5rem 1rem',
              borderRadius: '0.75rem',
              background: isDrawingOpen ? '#eab308' : '#0f172a',
              border: '1px solid #334155',
              color: isDrawingOpen ? 'white' : '#e2e8f0',
              fontWeight: 800,
              fontSize: isMobile ? '0.75rem' : '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title="Çizim Aracı"
          >
            <Pencil size={isMobile ? 14 : 16} /> 
            {!isMobile && (isDrawingOpen ? "Karalamayı Kapat" : "Karalama Kağıdı")}
          </button>

          <button
            onClick={handleSubmit}
            style={{
              padding: isMobile ? '0.4rem 0.6rem' : '0.55rem 1.25rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.75rem' : '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 16px rgba(16,185,129,0.35)'
            }}
          >
            <CheckCircle2 size={isMobile ? 14 : 18} /> 
            {!isMobile && "Sınavı Bitir"}
            {isMobile && "Bitir"}
          </button>
        </div>
      </header>

      {/* Main Body with Touch Swipe Support */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}
      >
        <QuestionGridNav
          totalQuestions={qCount}
          currentIndex={currentIndex}
          onSelectIndex={setCurrentIndex}
          answers={answers}
        />

        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 8px 30px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: '#38bdf8' }}>
              Soru {currentIndex + 1}
            </h3>
            {isOpenEndedMode && (
              <span style={{ padding: '0.25rem 0.65rem', background: 'rgba(99,102,241,0.2)', border: '1px solid #6366f1', color: '#a5b4fc', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.75rem' }}>
                ✍️ Açık Uçlu / Yazılı
              </span>
            )}
          </div>

          {/* Optional Image */}
          {imageUrls.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {imageUrls.map((url, imgIdx) => (
                <StandardImageFrame
                  key={imgIdx}
                  src={url}
                  alt={`Soru ${currentIndex + 1} Görsel`}
                  onOpenFullscreen={() => setLightboxSrc(url)}
                />
              ))}
            </div>
          )}

          {/* Question Text */}
          {(() => {
            const questionText = extractQuestionText(activeQuestion, test, currentIndex);
            return questionText ? (
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.6 }}>
                {questionText}
              </div>
            ) : null;
          })()}

          {/* Options or Open-Ended Answer Input */}
          <div style={{ marginTop: '0.75rem', paddingTop: '1.25rem', borderTop: '1px solid #334155' }}>
            {isOpenEndedMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#94a3b8' }}>
                  Cevabınızı Detaylıca Açıklayınız:
                </label>
                <textarea
                  value={currentTextVal}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Yanıtınızı buraya giriniz..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: '0.75rem',
                    background: '#0f172a',
                    border: '1.5px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.92rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            ) : (() => {
              const opts = extractQuestionOptions(activeQuestion, test);
              if (opts.length === 0) {
                return (
                  <div style={{
                    padding: '1.25rem',
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px dashed #f59e0b',
                    borderRadius: '0.85rem',
                    color: '#fbbf24',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textAlign: 'center'
                  }}>
                    ⚠️ Bu soru için seçenek girilmemiş. Lütfen Soru Bankası'ndan soruyu düzenleyerek şıkları ekleyin.
                  </div>
                );
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {opts.map((optText, optIdx) => {
                    const isSelected = currentAnsObj.userAnswer === optIdx;
                    const optLabel = String.fromCharCode(65 + optIdx);

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleOptionSelect(optIdx)}
                        style={{
                          padding: '1rem 1.25rem',
                          borderRadius: '0.85rem',
                          border: isSelected ? '2px solid #6366f1' : '1px solid #334155',
                          background: isSelected ? 'linear-gradient(135deg, #312e81, #1e1b4b)' : '#0f172a',
                          color: isSelected ? '#ffffff' : '#cbd5e1',
                          fontWeight: isSelected ? 900 : 700,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 4px 16px rgba(99,102,241,0.3)' : 'none'
                        }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSelected ? '#6366f1' : '#1e293b', color: isSelected ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem', flexShrink: 0, border: `1px solid ${isSelected ? '#818cf8' : '#475569'}` }}>
                          {optLabel}
                        </div>
                        <span style={{ flexGrow: 1 }}>{optText}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2rem' }}>
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.85rem',
              border: '1px solid #334155',
              background: currentIndex === 0 ? '#0f172a' : '#1e293b',
              color: currentIndex === 0 ? '#475569' : '#f8fafc',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <ChevronLeft size={18} /> Önceki Soru
          </button>

          <button
            onClick={() => setCurrentIndex(Math.min(qCount - 1, currentIndex + 1))}
            disabled={currentIndex === qCount - 1}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.85rem',
              border: 'none',
              background: currentIndex === qCount - 1 ? '#334155' : '#4f46e5',
              color: currentIndex === qCount - 1 ? '#64748b' : '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: currentIndex === qCount - 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: currentIndex === qCount - 1 ? 'none' : '0 4px 16px rgba(79,70,229,0.35)'
            }}
          >
            Sonraki Soru <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
      <ImageLightbox isOpen={!!lightboxSrc} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
