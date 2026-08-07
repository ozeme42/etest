import React, { useState, useEffect, useMemo } from 'react';
import DrawingCanvas from '../common/DrawingCanvas';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { Pencil, CheckCircle2, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

export default function StandardQuizRunner({ test, questions, onSubmit }) {
  const draftKey = useMemo(() => `draft_quiz_${test.id || 'test'}`, [test.id]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(`${draftKey}_ans`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [openEndedText, setOpenEndedText] = useState(() => {
    try {
      const saved = localStorage.getItem(`${draftKey}_txt`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const activeQuestion = questions[currentIndex] || {};
  const qCount = questions.length || test.questionCount || 1;
  const isOpenEndedMode = test.questionType === 'acik_uclu' || test.isOpenEnded || activeQuestion.type === 'acik_uclu';

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

  const rawImages = (activeQuestion.imageUrls && activeQuestion.imageUrls.length > 0)
    ? activeQuestion.imageUrls
    : (activeQuestion.imageUrl ? [activeQuestion.imageUrl] : (activeQuestion.contentPayload ? [activeQuestion.contentPayload] : []));

  const imageUrls = (Array.isArray(rawImages) ? rawImages : [rawImages]).filter(isValidImageUrl);

  const handleOptionSelect = (optionIdx) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex + 1]: {
        questionId: activeQuestion.id || `q_${currentIndex + 1}`,
        userAnswer: optionIdx,
        isCorrect: activeQuestion.correctAnswer !== undefined ? optionIdx === activeQuestion.correctAnswer : null
      }
    }));
  };

  const handleTextChange = (val) => {
    setOpenEndedText(prev => ({
      ...prev,
      [currentIndex + 1]: val
    }));
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
      const qObj = questions[idx] || {};
      const savedAns = answers[qNo] || {};
      const textVal = openEndedText[qNo] || '';

      return {
        questionId: qObj.id || `q_${qNo}`,
        questionNo: qNo,
        userAnswer: savedAns.userAnswer !== undefined ? savedAns.userAnswer : null,
        userAnswerText: textVal || savedAns.userAnswerText || null,
        isCorrect: qObj.correctAnswer !== undefined && savedAns.userAnswer !== undefined ? savedAns.userAnswer === qObj.correctAnswer : null
      };
    });

    onSubmit(formattedAnswers);
  };

  const currentAnsObj = answers[currentIndex + 1] || {};
  const currentTextVal = openEndedText[currentIndex + 1] || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      {/* Header */}
      <header style={{ padding: '0.85rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ padding: '0.35rem 0.65rem', background: '#6366f1', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', color: 'white' }}>
            STANDART SINAV
          </span>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#f8fafc' }}>{test.title}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Total Countdown Timer Badge */}
          <div style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '0.65rem',
            background: timeLeft < 300 ? '#7f1d1d' : '#0f172a',
            border: `1.5px solid ${timeLeft < 300 ? '#ef4444' : '#334155'}`,
            color: timeLeft < 300 ? '#fca5a5' : '#e0e7ff',
            fontWeight: 900,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Clock size={16} color={timeLeft < 300 ? '#ef4444' : '#6366f1'} />
            <span>{formatTime(timeLeft)}</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
              (Toplam {qCount * perQuestionMins} dk)
            </span>
          </div>

          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              background: isDrawingOpen ? '#eab308' : '#0f172a',
              border: '1px solid #334155',
              color: isDrawingOpen ? 'white' : '#e2e8f0',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Pencil size={16} /> {isDrawingOpen ? "Çizimi Kapat" : "Çizim Aracı"}
          </button>

          <button
            onClick={handleSubmit}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 16px rgba(16,185,129,0.35)'
            }}
          >
            <CheckCircle2 size={18} /> Sınavı Bitir
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
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
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.6 }}>
            {activeQuestion.text || activeQuestion.questionText || `Soru ${currentIndex + 1}`}
          </div>

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
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(activeQuestion.options && activeQuestion.options.length > 0
                  ? activeQuestion.options
                  : ['A', 'B', 'C', 'D', 'E']
                ).map((opt, optIdx) => {
                  const isSelected = currentAnsObj.userAnswer === optIdx;
                  const optLabel = String.fromCharCode(65 + optIdx);
                  const rawOptText = typeof opt === 'string' ? opt : (opt?.text || '');
                  const optText = (rawOptText && rawOptText.trim() !== optLabel) ? rawOptText : `Şık ${optLabel}`;

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
            )}
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
