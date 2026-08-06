import React, { useState } from 'react';
import DrawingCanvas from '../common/DrawingCanvas';
import { Pencil, CheckCircle2, FileSpreadsheet } from 'lucide-react';

export default function PhysicalQuizRunner({ test, questions, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [openEndedText, setOpenEndedText] = useState({});
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  const qCount = questions.length || test.questionCount || test.totalQuestions || 20;
  const isOpenEndedMode = test.questionType === 'acik_uclu' || test.isOpenEnded;

  const handleOptionSelect = (qNo, optIdx) => {
    setAnswers(prev => ({ ...prev, [qNo]: optIdx }));
  };

  const handleTextChange = (qNo, val) => {
    setOpenEndedText(prev => ({ ...prev, [qNo]: val }));
  };

  const handleSubmit = () => {
    const formattedAnswers = Array.from({ length: qCount }).map((_, idx) => {
      const qNo = idx + 1;
      const qObj = questions[idx] || {};
      const userAns = answers[qNo];
      const textAns = openEndedText[qNo];

      return {
        questionId: qObj.id || `q_${qNo}`,
        questionNo: qNo,
        userAnswer: userAns !== undefined ? userAns : null,
        userAnswerText: textAns || null,
        isCorrect: qObj.correctAnswer !== undefined && userAns !== undefined ? userAns === qObj.correctAnswer : null
      };
    });

    onSubmit(formattedAnswers);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      <header style={{ padding: '0.85rem 1.5rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', sticky: 'top', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ padding: '0.35rem 0.65rem', background: '#059669', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', color: 'white' }}>
            FİZİKİ / OPTİK FORM
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
            <CheckCircle2 size={18} /> Optik Formu Kaydet
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: '1.25rem', padding: '1.5rem', color: 'white', boxShadow: '0 8px 24px rgba(5,150,105,0.2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>Dijital Optik Form Kodlama</h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
              Kağıt üzerinde çözdüğünüz deneme sınavının cevaplarını aşağıdaki kabarcıklara işaretleyiniz.
            </p>
          </div>
        </div>

        {/* Optik Grid Form */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: qCount }).map((_, idx) => {
            const qNo = idx + 1;
            const selectedOpt = answers[qNo];
            const textVal = openEndedText[qNo] || '';

            return (
              <div key={qNo} style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                  <span>Soru {qNo}</span>
                  {selectedOpt !== undefined || textVal ? (
                    <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 900 }}>✓ Kodlandı</span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>— Boş</span>
                  )}
                </div>

                {isOpenEndedMode ? (
                  <textarea
                    value={textVal}
                    onChange={(e) => handleTextChange(qNo, e.target.value)}
                    placeholder={`Soru ${qNo} açık uçlu yanıt...`}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontFamily: 'inherit'
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => {
                      const isSelected = selectedOpt === optIdx;
                      return (
                        <button
                          key={opt}
                          onClick={() => handleOptionSelect(qNo, optIdx)}
                          style={{
                            flex: 1,
                            height: '34px',
                            borderRadius: '0.5rem',
                            border: isSelected ? 'none' : '1px solid #cbd5e1',
                            background: isSelected ? '#059669' : '#ffffff',
                            color: isSelected ? 'white' : '#334155',
                            fontWeight: 900,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
    </div>
  );
}
