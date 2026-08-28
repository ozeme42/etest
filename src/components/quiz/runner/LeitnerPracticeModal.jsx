import React, { useState } from 'react';
import { X, Award, ChevronRight, CheckCircle2, XCircle, ZoomIn } from 'lucide-react';
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
  const [lastResultInfo, setLastResultInfo] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);

  if (!isOpen || questions.length === 0) return null;

  const currentQ = questions[currentIndex] || questions[0];
  const qText = currentQ.questionText || currentQ.text || currentQ.title || `Soru ${currentIndex + 1}`;
  
  // Resolve option count and option labels
  let options = currentQ.options || ['A', 'B', 'C', 'D', 'E'];
  if (typeof currentQ.optionCount === 'number' && currentQ.optionCount >= 2 && currentQ.optionCount <= 5) {
    options = ['A', 'B', 'C', 'D', 'E'].slice(0, currentQ.optionCount);
  }

  // Resolve correct option index
  let correctOpt = 0;
  if (currentQ.correctAnswer !== undefined && currentQ.correctAnswer !== null && !isNaN(Number(currentQ.correctAnswer))) {
    correctOpt = Number(currentQ.correctAnswer);
  } else if (typeof currentQ.correctAnswerLetter === 'string' && /^[A-Ea-e]$/.test(currentQ.correctAnswerLetter.trim())) {
    correctOpt = currentQ.correctAnswerLetter.trim().toUpperCase().charCodeAt(0) - 65;
  } else if (typeof currentQ.correctAnswer === 'string' && /^[A-Ea-e]$/.test(currentQ.correctAnswer.trim())) {
    correctOpt = currentQ.correctAnswer.trim().toUpperCase().charCodeAt(0) - 65;
  }

  // Resolve question image
  const qImage = currentQ.imageUrl || currentQ.image || (Array.isArray(currentQ.imageUrls) ? currentQ.imageUrls[0] : null) || (typeof currentQ.contentPayload === 'string' && (currentQ.contentPayload.startsWith('data:image') || currentQ.contentPayload.startsWith('http')) ? currentQ.contentPayload : null);

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
    const result = recordLeitnerResult(studentId, qKey, isRight);
    setLastResultInfo({ isRight, boxLevel: result?.boxLevel || (isRight ? 2 : 1) });
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(p => p + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setLastResultInfo(null);
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
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '1.25rem',
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '0.9rem 1.25rem',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Award size={20} />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900 }}>
                🧠 Aralıklı Tekrar (Leitner) Telafi Pratiği
              </h3>
              <div style={{ fontSize: '0.7rem', opacity: 0.85, fontWeight: 700 }}>
                Hafızada kalıcı hale getirene kadar adımlı tekrar
              </div>
            </div>
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

        {/* Content Body */}
        {!isFinished ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            {/* Progress & Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800 }}>
              <span style={{ color: '#64748b' }}>Soru {currentIndex + 1} / {questions.length}</span>
              <span style={{
                background: '#e0e7ff',
                color: '#4338ca',
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontWeight: 900
              }}>
                {currentQ.subject || 'Telafi Sorusu'}
              </span>
            </div>

            {/* Question Box (Image / Text) */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.85rem',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {qImage && (
                <div style={{ position: 'relative', textAlign: 'center' }}>
                  <img
                    src={qImage}
                    alt={`Soru ${currentIndex + 1}`}
                    onClick={() => setZoomImage(qImage)}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '260px',
                      objectFit: 'contain',
                      borderRadius: '0.5rem',
                      cursor: 'zoom-in',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff'
                    }}
                  />
                  <div style={{
                    marginTop: 4,
                    fontSize: '0.68rem',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3
                  }}>
                    <ZoomIn size={12} /> Büyütmek için görsele tıklayın
                  </div>
                </div>
              )}

              {(!qImage || qText !== `Soru ${currentIndex + 1}`) && (
                <div style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  lineHeight: 1.5,
                  color: '#0f172a'
                }}>
                  {qText}
                </div>
              )}
            </div>

            {/* Answer Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {options.map((opt, optIdx) => {
                const optLetter = String.fromCharCode(65 + optIdx);
                const optText = typeof opt === 'string' && opt.length > 2 ? opt : (opt?.text || opt?.label || `${optLetter} Şıkkı`);
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
                  optBorder = '2px solid #6366f1';
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
                      padding: '0.65rem 0.9rem',
                      borderRadius: '0.75rem',
                      border: optBorder,
                      background: optBg,
                      cursor: isAnswerRevealed ? 'default' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: isAnswerRevealed && isCorrectOpt ? '#10b981' : (isAnswerRevealed && isSelected ? '#ef4444' : (isSelected ? '#6366f1' : '#f1f5f9')),
                      color: (isSelected || (isAnswerRevealed && isCorrectOpt)) ? '#ffffff' : '#334155',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {optLetter}
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                      {optText}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Answer Feedback / Leitner Box update */}
            {isAnswerRevealed && lastResultInfo && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                background: lastResultInfo.isRight ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${lastResultInfo.isRight ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {lastResultInfo.isRight ? (
                    <CheckCircle2 size={20} color="#10b981" />
                  ) : (
                    <XCircle size={20} color="#ef4444" />
                  )}
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.85rem', color: lastResultInfo.isRight ? '#059669' : '#dc2626' }}>
                      {lastResultInfo.isRight ? 'Tebrikler, Doğru Cevap!' : `Yanlış Cevap! (Doğru Şık: ${String.fromCharCode(65 + correctOpt)})`}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                      {lastResultInfo.isRight
                        ? `Soru ${lastResultInfo.boxLevel}. Aşamaya yükseltildi ⬆️`
                        : 'Soru 1. Aşamaya geri alındı 🔄'}
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: lastResultInfo.isRight ? '#d1fae5' : '#fee2e2',
                  color: lastResultInfo.isRight ? '#059669' : '#dc2626'
                }}>
                  {lastResultInfo.boxLevel}. Kutu
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
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
                    cursor: selectedOption !== null ? 'pointer' : 'not-allowed',
                    boxShadow: selectedOption !== null ? '0 4px 12px rgba(79,70,229,0.3)' : 'none'
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
                    gap: '0.35rem',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
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
            
            <div style={{
              display: 'flex',
              gap: 12,
              margin: '6px 0'
            }}>
              <div style={{ padding: '8px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontWeight: 900 }}>
                ✓ {practiceStats.correct} Doğru
              </div>
              <div style={{ padding: '8px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 900 }}>
                ✗ {practiceStats.wrong} Yanlış
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', maxWidth: '380px', lineHeight: 1.4 }}>
              Doğru çözdüğünüz sorular bir sonraki Leitner hafıza kutusuna aktarıldı ve sonraki tekrar tarihleri güncellendi.
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
                marginTop: '0.5rem',
                boxShadow: '0 4px 14px rgba(79,70,229,0.3)'
              }}
            >
              Tamamla & Kapat
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Zoom Modal */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <img src={zoomImage} alt="Zoom" style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}
