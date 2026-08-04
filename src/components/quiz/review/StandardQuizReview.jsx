import React, { useState } from 'react';
import ImageLightbox, { StandardImageFrame } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { ArrowLeft, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StandardQuizReview({ submission, test, questions }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const answers = submission.answers || [];
  const activeQuestion = questions[currentIndex] || {};
  const qCount = questions.length || submission.totalQuestions || test.questionCount || 10;

  const activeAnsObj = answers.find(a => (a.questionNo === currentIndex + 1 || a.questionId === activeQuestion.id)) || answers[currentIndex] || {};
  const imageUrls = activeQuestion.imageUrls || (activeQuestion.imageUrl ? [activeQuestion.imageUrl] : (activeQuestion.contentPayload ? [activeQuestion.contentPayload] : []));

  const correctCount = submission.correctCount || answers.filter(a => a.isCorrect === true).length;
  const wrongCount = submission.wrongCount || answers.filter(a => a.isCorrect === false && a.userAnswer !== null && a.userAnswer !== undefined).length;
  const blankCount = submission.blankCount || (qCount - correctCount - wrongCount);

  const answersMap = {};
  Array.from({ length: qCount }).forEach((_, idx) => {
    const qNo = idx + 1;
    const qObj = questions[idx] || {};
    const foundAns = answers.find(a => (a.questionNo === qNo || a.questionId === qObj.id)) || answers[idx];
    if (foundAns) answersMap[qNo] = foundAns;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      <header style={{ padding: '0.85rem 1.5rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', sticky: 'top', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.75rem',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#1e293b',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#1e293b' }}>{test.title} — İnceleme Raporu</h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📝 Standart Metin Sınav İncelemesi</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #86efac' }}>
            ✓ {correctCount} Doğru
          </div>
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #fca5a5' }}>
            ✕ {wrongCount} Yanlış
          </div>
          <div style={{ background: '#f1f5f9', color: '#64748b', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #cbd5e1' }}>
            ○ {blankCount} Boş
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        <QuestionGridNav
          totalQuestions={qCount}
          currentIndex={currentIndex}
          onSelectIndex={setCurrentIndex}
          answers={answersMap}
          isReviewMode={true}
        />

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: '#4f46e5' }}>
              Soru {currentIndex + 1} İncelemesi
            </h3>

            {activeAnsObj.isCorrect === true ? (
              <span style={{ padding: '0.35rem 0.75rem', background: '#dcfce7', color: '#15803d', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle size={16} /> DOĞRU
              </span>
            ) : activeAnsObj.isCorrect === false ? (
              <span style={{ padding: '0.35rem 0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <XCircle size={16} /> YANLIŞ
              </span>
            ) : (
              <span style={{ padding: '0.35rem 0.75rem', background: '#f1f5f9', color: '#64748b', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem' }}>
                BOŞ
              </span>
            )}
          </div>

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

          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.6 }}>
            {activeQuestion.text || activeQuestion.questionText || `Soru ${currentIndex + 1}`}
          </div>

          {activeAnsObj.userAnswerText ? (
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>YAZILI CEVABINIZ</div>
              <div style={{ marginTop: '0.35rem', fontSize: '0.92rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {activeAnsObj.userAnswerText}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              {(activeQuestion.options && activeQuestion.options.length > 0
                ? activeQuestion.options
                : ['A', 'B', 'C', 'D', 'E']
              ).map((opt, optIdx) => {
                const optLabel = String.fromCharCode(65 + optIdx);
                const optText = typeof opt === 'string' ? opt : opt.text;

                const isUserChoice = activeAnsObj.userAnswer === optIdx;
                const isCorrectOption = activeQuestion.correctAnswer === optIdx;

                let border = '1px solid #e2e8f0';
                let bg = '#ffffff';
                let textColor = '#1e293b';

                if (isCorrectOption) {
                  border = '2px solid #059669';
                  bg = '#f0fdf4';
                  textColor = '#15803d';
                } else if (isUserChoice && !isCorrectOption) {
                  border = '2px solid #dc2626';
                  bg = '#fef2f2';
                  textColor = '#b91c1c';
                }

                return (
                  <div
                    key={optIdx}
                    style={{
                      padding: '0.85rem 1.1rem',
                      borderRadius: '0.85rem',
                      border,
                      background: bg,
                      color: textColor,
                      fontWeight: isUserChoice || isCorrectOption ? 900 : 700,
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isCorrectOption ? '#059669' : (isUserChoice ? '#dc2626' : '#f1f5f9'), color: (isCorrectOption || isUserChoice) ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                      {optLabel}
                    </div>
                    <span style={{ flexGrow: 1 }}>{optText || `Şık ${optLabel}`}</span>
                    {isCorrectOption && <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#059669' }}>✓ DOĞRU CEVAP</span>}
                    {isUserChoice && !isCorrectOption && <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#dc2626' }}>✕ SENİN SEÇİMİN</span>}
                  </div>
                );
              })}
            </div>
          )}

          {activeQuestion.solutionText && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '0.85rem', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3', fontSize: '0.9rem' }}>
              <strong>💡 Çözüm Açıklaması: </strong> {activeQuestion.solutionText}
            </div>
          )}
        </div>

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
              gap: '0.4rem'
            }}
          >
            Sonraki Soru <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <ImageLightbox isOpen={!!lightboxSrc} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
