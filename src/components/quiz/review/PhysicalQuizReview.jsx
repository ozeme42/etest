import React from 'react';
import { ArrowLeft, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PhysicalQuizReview({ submission, test, questions }) {
  const navigate = useNavigate();

  const answers = submission.answers || [];
  const qCount = questions.length || submission.totalQuestions || test.questionCount || test.totalQuestions || 20;

  const correctCount = submission.correctCount || answers.filter(a => a.isCorrect === true).length;
  const wrongCount = submission.wrongCount || answers.filter(a => a.isCorrect === false && a.userAnswer !== null && a.userAnswer !== undefined).length;
  const blankCount = submission.blankCount || (qCount - correctCount - wrongCount);

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
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📋 Optik Form / Fiziki Sınav İncelemesi</div>
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

      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: '1.25rem', padding: '1.5rem', color: 'white', boxShadow: '0 8px 24px rgba(5,150,105,0.2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>Optik Form İnceleme & Analiz</h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
              İşaretlediğiniz cevaplar ile cevap anahtarı karşılaştırması aşağıdadır.
            </p>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: qCount }).map((_, idx) => {
            const qNo = idx + 1;
            const qObj = questions[idx] || {};
            const ansObj = answers.find(a => (a.questionNo === qNo || a.questionId === qObj.id)) || answers[idx] || {};

            const userAns = ansObj.userAnswer;
            const textAns = ansObj.userAnswerText;
            const correctAns = qObj.correctAnswer;
            const isCorrect = ansObj.isCorrect;
            const isBlank = userAns === null || userAns === undefined;

            return (
              <div
                key={qNo}
                style={{
                  background: isCorrect === true ? '#f0fdf4' : isCorrect === false ? '#fef2f2' : '#f8fafc',
                  padding: '1rem',
                  borderRadius: '0.85rem',
                  border: `1px solid ${isCorrect === true ? '#86efac' : isCorrect === false ? '#fca5a5' : '#cbd5e1'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>Soru {qNo}</span>
                  {isCorrect === true ? (
                    <span style={{ color: '#15803d', fontWeight: 900, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle size={15} /> DOĞRU
                    </span>
                  ) : isCorrect === false ? (
                    <span style={{ color: '#b91c1c', fontWeight: 900, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <XCircle size={15} /> YANLIŞ
                    </span>
                  ) : (
                    <span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.78rem' }}>BOŞ</span>
                  )}
                </div>

                {textAns ? (
                  <div style={{ fontSize: '0.82rem', color: '#334155', background: '#ffffff', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginTop: '0.35rem' }}>
                    <strong>Cevabınız: </strong>{textAns}
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyBetween: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>KODLANAN: </span>
                      <span style={{ fontWeight: 900, color: isCorrect === true ? '#15803d' : isCorrect === false ? '#b91c1c' : '#64748b' }}>
                        {!isBlank ? (typeof userAns === 'number' ? String.fromCharCode(65 + userAns) : userAns) : 'Boş'}
                      </span>
                    </div>
                    {correctAns !== undefined && (
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>CEVAP ANAHTARI: </span>
                        <span style={{ fontWeight: 900, color: '#15803d' }}>
                          {typeof correctAns === 'number' ? String.fromCharCode(65 + correctAns) : correctAns}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
