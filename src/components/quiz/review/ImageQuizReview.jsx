import React, { useState } from 'react';
import ImageLightbox, { StandardImageFrame } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { ArrowLeft, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ImageQuizReview({ submission, test, questions }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const answers = submission.answers || [];
  const activeQuestion = questions[currentIndex] || {};
  const qCount = questions.length || submission.totalQuestions || test.questionCount || 10;

  const activeAnsObj = answers.find(a => (a.questionNo === currentIndex + 1 || a.questionId === activeQuestion.id)) || answers[currentIndex] || {};
  const imageUrls = activeQuestion.imageUrls || (activeQuestion.contentPayload ? [activeQuestion.contentPayload] : []);

  const correctCount = submission.correctCount || answers.filter(a => a.isCorrect === true).length;
  const wrongCount = submission.wrongCount || answers.filter(a => a.isCorrect === false && a.userAnswer !== null && a.userAnswer !== undefined).length;
  const blankCount = submission.blankCount || (qCount - correctCount - wrongCount);

  // Map answers for grid navigator
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
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>🖼️ Görsel Formatında Sınav İncelemesi</div>
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

      <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        <QuestionGridNav
          totalQuestions={qCount}
          currentIndex={currentIndex}
          onSelectIndex={setCurrentIndex}
          answers={answersMap}
          isReviewMode={true}
        />

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: '#ec4899' }}>
              Soru {currentIndex + 1} İncelemesi
            </h3>

            {activeAnsObj.isCorrect === true ? (
              <span style={{ padding: '0.35rem 0.75rem', background: '#dcfce7', color: '#15803d', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle size={16} /> DOĞRU CEVAPLADIN
              </span>
            ) : activeAnsObj.isCorrect === false ? (
              <span style={{ padding: '0.35rem 0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <XCircle size={16} /> YANLIŞ CEVAPLADIN
              </span>
            ) : (
              <span style={{ padding: '0.35rem 0.75rem', background: '#f1f5f9', color: '#64748b', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem' }}>
                BOŞ BIRAKILDI
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

          {activeAnsObj.userAnswerText ? (
            <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>YAZILI CEVABINIZ</div>
              <div style={{ marginTop: '0.35rem', fontSize: '0.92rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {activeAnsObj.userAnswerText}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: activeAnsObj.isCorrect === true ? '#f0fdf4' : activeAnsObj.isCorrect === false ? '#fef2f2' : '#f8fafc', padding: '1rem', borderRadius: '0.85rem', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>SENİN CEVABIN</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: activeAnsObj.isCorrect === true ? '#15803d' : activeAnsObj.isCorrect === false ? '#b91c1c' : '#64748b', marginTop: '0.25rem' }}>
                  {activeAnsObj.userAnswer !== undefined && activeAnsObj.userAnswer !== null
                    ? (typeof activeAnsObj.userAnswer === 'number' ? String.fromCharCode(65 + activeAnsObj.userAnswer) : activeAnsObj.userAnswer)
                    : 'Boş'}
                </div>
              </div>

              {activeQuestion.correctAnswer !== undefined && (
                <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.85rem', border: '1px solid #86efac' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#15803d' }}>DOĞRU CEVAP</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#15803d', marginTop: '0.25rem' }}>
                    {typeof activeQuestion.correctAnswer === 'number' ? String.fromCharCode(65 + activeQuestion.correctAnswer) : activeQuestion.correctAnswer}
                  </div>
                </div>
              )}
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
              background: currentIndex === qCount - 1 ? '#e2e8f0' : '#ec4899',
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
