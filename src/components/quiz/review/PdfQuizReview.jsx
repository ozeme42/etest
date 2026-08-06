import React from 'react';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PdfQuizReview({ submission, test, questions }) {
  const navigate = useNavigate();

  const answers = submission.answers || [];
  const qCount = questions.length || submission.totalQuestions || test.questionCount || 10;

  const correctCount = submission.correctCount || answers.filter(a => a.isCorrect === true).length;
  const wrongCount = submission.wrongCount || answers.filter(a => a.isCorrect === false && a.userAnswer !== null && a.userAnswer !== undefined).length;
  const blankCount = submission.blankCount || (qCount - correctCount - wrongCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: 'white' }}>
      {/* Header */}
      <header style={{ padding: '0.85rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.75rem',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
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
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>{test.title} — İnceleme Raporu</h2>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>📄 PDF Formatında Sınav İncelemesi</div>
          </div>
        </div>

        {/* Score Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#064e3b', color: '#34d399', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #059669' }}>
            ✓ {correctCount} Doğru
          </div>
          <div style={{ background: '#7f1d1d', color: '#f87171', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #dc2626' }}>
            ✕ {wrongCount} Yanlış
          </div>
          <div style={{ background: '#334155', color: '#94a3b8', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.82rem', border: '1px solid #475569' }}>
            ○ {blankCount} Boş
          </div>
        </div>
      </header>

      {/* Split Screen */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, height: '100%', borderRight: '1px solid #334155', background: '#0f172a' }}>
          <PdfViewerWithControls payload={test.contentPayload || test.pdfPayload} title={test.title} height="100%" />
        </div>

        <div style={{ width: '400px', flexShrink: 0, height: '100%', background: '#1e293b', overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#a5b4fc', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
            📊 Cevap & Soru Analizi
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: qCount }).map((_, idx) => {
              const qNo = idx + 1;
              const qObj = questions[idx] || {};
              const ansObj = answers.find(a => (a.questionNo === qNo || a.questionId === qObj.id)) || answers[idx] || {};

              const userAns = ansObj.userAnswer;
              const textAns = ansObj.userAnswerText;
              const correctAns = qObj.correctAnswer;
              const isCorrect = ansObj.isCorrect;

              const isBlank = userAns === null || userAns === undefined;
              const isText = !!textAns;

              return (
                <div
                  key={qNo}
                  style={{
                    background: isCorrect === true ? 'rgba(16,185,129,0.1)' : isCorrect === false ? 'rgba(239,68,68,0.1)' : '#0f172a',
                    padding: '1rem',
                    borderRadius: '0.85rem',
                    border: `1px solid ${isCorrect === true ? '#059669' : isCorrect === false ? '#dc2626' : '#334155'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>Soru {qNo}</span>
                    {isCorrect === true ? (
                      <span style={{ color: '#34d399', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <CheckCircle size={15} /> DOĞRU
                      </span>
                    ) : isCorrect === false ? (
                      <span style={{ color: '#f87171', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <XCircle size={15} /> YANLIŞ
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.8rem' }}>BOŞ / İNCELEMEDE</span>
                    )}
                  </div>

                  {isText ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800 }}>ÖĞRENCİ YAZILI CEVABI</div>
                      <div style={{ fontSize: '0.85rem', background: '#1e293b', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #475569', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>
                        {textAns}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyBetween: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800 }}>SENİN CEVABIN: </span>
                        <span style={{ fontWeight: 900, color: isCorrect === true ? '#34d399' : isCorrect === false ? '#f87171' : '#94a3b8' }}>
                          {!isBlank ? (typeof userAns === 'number' ? String.fromCharCode(65 + userAns) : userAns) : 'Boş'}
                        </span>
                      </div>
                      {correctAns !== undefined && (
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800 }}>DOĞRU CEVAP: </span>
                          <span style={{ fontWeight: 900, color: '#34d399' }}>
                            {typeof correctAns === 'number' ? String.fromCharCode(65 + correctAns) : correctAns}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {qObj.solutionText && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <strong style={{ color: '#818cf8' }}>Çözüm Açıklaması: </strong> {qObj.solutionText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
