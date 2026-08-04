import React, { useState } from 'react';
import DrawingCanvas from '../common/DrawingCanvas';
import ImageLightbox, { StandardImageFrame } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { Pencil, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function StandardQuizRunner({ test, questions, onSubmit }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [openEndedText, setOpenEndedText] = useState({});
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const activeQuestion = questions[currentIndex] || {};
  const qCount = questions.length || test.questionCount || 10;
  const isOpenEndedMode = test.questionType === 'acik_uclu' || test.isOpenEnded || activeQuestion.type === 'acik_uclu';

  const imageUrls = activeQuestion.imageUrls || (activeQuestion.imageUrl ? [activeQuestion.imageUrl] : (activeQuestion.contentPayload ? [activeQuestion.contentPayload] : []));

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* Header */}
      <header style={{ padding: '0.85rem 1.5rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', sticky: 'top', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ padding: '0.35rem 0.65rem', background: '#6366f1', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', color: 'white' }}>
            STANDART SINAV
          </span>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#1e293b' }}>{test.title}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              background: isDrawingOpen ? '#eab308' : '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: isDrawingOpen ? 'white' : '#1e293b',
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
              boxShadow: '0 4px 12px rgba(16,185,129,0.25)'
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

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: '#4f46e5' }}>
              Soru {currentIndex + 1}
            </h3>
            {isOpenEndedMode && (
              <span style={{ padding: '0.25rem 0.65rem', background: '#e0e7ff', color: '#4338ca', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.75rem' }}>
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
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.6 }}>
            {activeQuestion.text || activeQuestion.questionText || `Soru ${currentIndex + 1}`}
          </div>

          {/* Options or Open-Ended Answer Input */}
          <div style={{ marginTop: '0.75rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
            {isOpenEndedMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#475569' }}>
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
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.92rem',
                    outline: 'none',
                    fontFamily: 'inherit'
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
                  const optText = typeof opt === 'string' ? opt : opt.text;

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleOptionSelect(optIdx)}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '0.85rem',
                        border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                        background: isSelected ? '#eef2ff' : '#ffffff',
                        color: isSelected ? '#4338ca' : '#1e293b',
                        fontWeight: isSelected ? 900 : 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(79,70,229,0.12)' : 'none'
                      }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSelected ? '#4f46e5' : '#f1f5f9', color: isSelected ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem', flexShrink: 0 }}>
                        {optLabel}
                      </div>
                      <span style={{ flexGrow: 1 }}>{optText || `Şık ${optLabel}`}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', paddingBottom: '2rem' }}>
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.85rem',
              border: '1px solid #cbd5e1',
              background: currentIndex === 0 ? '#f1f5f9' : '#ffffff',
              color: currentIndex === 0 ? '#94a3b8' : '#1e293b',
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
              background: currentIndex === qCount - 1 ? '#e2e8f0' : '#4f46e5',
              color: currentIndex === qCount - 1 ? '#94a3b8' : '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: currentIndex === qCount - 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: currentIndex === qCount - 1 ? 'none' : '0 4px 12px rgba(79,70,229,0.25)'
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
