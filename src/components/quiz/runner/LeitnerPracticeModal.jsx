import React, { useState } from 'react';
import { X, Award, ChevronRight } from 'lucide-react';
import { recordLeitnerResult } from '../../../services/spacedRepetitionService';

export default function LeitnerPracticeModal({
  isOpen = false,
  onClose,
  questions = [],
  studentId,
  onFinish
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [practiceStats, setPracticeStats] = useState({ correct: 0, wrong: 0 });
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen || questions.length === 0) return null;

  const currentQ = questions[currentIndex] || questions[0];
  const qText = currentQ.questionText || currentQ.text || currentQ.title || `Soru ${currentIndex + 1}`;
  const options = currentQ.options || ['A', 'B', 'C', 'D', 'E'];
  const correctOpt = currentQ.correctAnswer !== undefined ? currentQ.correctAnswer : 0;

  const handleCheckAnswer = () => {
    if (selectedOption === null) return;
    setIsAnswerRevealed(true);
    const isRight = selectedOption === correctOpt;
    if (isRight) {
      setPracticeStats(p => ({ ...p, correct: p.correct + 1 }));
    } else {
      setPracticeStats(p => ({ ...p, wrong: p.wrong + 1 }));
    }

    const qKey = currentQ.id || currentQ.questionId || `${currentQ.testId}_${currentQ.questionNo}`;
    recordLeitnerResult(studentId, qKey, isRight);
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(p => p + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
      setIsFinished(true);
      if (onFinish) onFinish(practiceStats);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '1.25rem',
        maxWidth: '650px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={20} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>
              🧠 Aralıklı Tekrar (Leitner) Telafi Pratiği
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.35rem',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {!isFinished ? (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Progress Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>
              <span>Soru {currentIndex + 1} / {questions.length}</span>
              <span>{currentQ.subject || 'Telafi Sorusu'}</span>
            </div>

            {/* Question Text / Image */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.85rem',
              padding: '1.1rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              lineHeight: 1.5,
              color: '#0f172a'
            }}>
              {currentQ.imageUrl && (
                <img
                  src={currentQ.imageUrl}
                  alt="Soru Görseli"
                  style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '0.5rem', marginBottom: '0.85rem' }}
                />
              )}
              {qText}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {options.map((opt, optIdx) => {
                const optLetter = String.fromCharCode(65 + optIdx);
                const optText = typeof opt === 'string' ? opt : (opt?.text || opt?.label || optLetter);
                const isSelected = selectedOption === optIdx;
                const isCorrectOpt = optIdx === correctOpt;

                let optBorder = '1.5px solid #cbd5e1';
                let optBg = '#ffffff';

                if (isAnswerRevealed) {
                  if (isCorrectOpt) {
                    optBorder = '2px solid #10b981';
                    optBg = '#f0fdf4';
                  } else if (isSelected && !isCorrectOpt) {
                    optBorder = '2px solid #ef4444';
                    optBg = '#fef2f2';
                  }
                } else if (isSelected) {
                  optBorder = '2px solid #4f46e5';
                  optBg = '#eef2ff';
                }

                return (
                  <div
                    key={optIdx}
                    onClick={() => !isAnswerRevealed && setSelectedOption(optIdx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.75rem',
                      border: optBorder,
                      background: optBg,
                      cursor: isAnswerRevealed ? 'default' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: isSelected ? '#4f46e5' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#334155',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {optLetter}
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                      {optText}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              {!isAnswerRevealed ? (
                <button
                  type="button"
                  disabled={selectedOption === null}
                  onClick={handleCheckAnswer}
                  style={{
                    background: selectedOption !== null ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.75rem',
                    padding: '0.65rem 1.4rem',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    cursor: selectedOption !== null ? 'pointer' : 'not-allowed'
                  }}
                >
                  Cevabı Kontrol Et
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.75rem',
                    padding: '0.65rem 1.4rem',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {currentIndex + 1 < questions.length ? 'Sonraki Soru' : 'Sonucu Gör'} <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3rem' }}>🎉</div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              Tebrikler! Telafi Pratiğini Tamamladınız
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '380px', lineHeight: 1.4 }}>
              Doğru çözdüğünüz sorular bir sonraki Leitner hafıza kutusuna aktarıldı ve tekrar tarihi güncellendi.
            </p>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '0.75rem 1.8rem',
                fontSize: '0.88rem',
                fontWeight: 900,
                cursor: 'pointer',
                marginTop: '0.5rem'
              }}
            >
              Tamamla & Kapat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
