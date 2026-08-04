import React, { useState } from 'react';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import DrawingCanvas from '../common/DrawingCanvas';
import { Pencil, CheckCircle2, Clock, FileText } from 'lucide-react';

export default function PdfQuizRunner({ test, questions, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [openEndedText, setOpenEndedText] = useState({});
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  const qCount = questions.length || test.questionCount || 10;
  const isOpenEndedMode = test.questionType === 'acik_uclu' || test.isOpenEnded;

  const handleOptionSelect = (qNo, optionIdx) => {
    setAnswers(prev => ({ ...prev, [qNo]: optionIdx }));
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: 'white' }}>
      {/* Header */}
      <header style={{ padding: '0.85rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ padding: '0.35rem 0.65rem', background: '#4f46e5', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem' }}>
            PDF SINAV
          </span>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>{test.title}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              background: isDrawingOpen ? '#eab308' : 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
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
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
            }}
          >
            <CheckCircle2 size={18} /> Sınavı Bitir
          </button>
        </div>
      </header>

      {/* Main Content Split View */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: PDF Document Viewer */}
        <div style={{ flex: 1, height: '100%', borderRight: '1px solid #334155', background: '#0f172a' }}>
          <PdfViewerWithControls payload={test.contentPayload || test.pdfPayload} title={test.title} height="100%" />
        </div>

        {/* Right: Answer Panel */}
        <div style={{ width: '380px', flexShrink: 0, height: '100%', background: '#1e293b', overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#a5b4fc' }}>
              {isOpenEndedMode ? "✍️ Açık Uçlu / Yazılı Cevap Paneli" : "🎯 Optik Cevap Paneli"}
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
              Sol taraftaki PDF dokümanını inceleyerek yanıtlarınızı giriniz.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: qCount }).map((_, idx) => {
              const qNo = idx + 1;
              const selectedOpt = answers[qNo];
              const textVal = openEndedText[qNo] || '';

              return (
                <div key={qNo} style={{ background: '#0f172a', padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid #334155' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.5rem', color: '#e2e8f0', display: 'flex', justifyBetween: 'space-between' }}>
                    <span>Soru {qNo}</span>
                    {selectedOpt !== undefined || textVal ? (
                      <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 900 }}>✓ Yanıtlandı</span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>— Boş</span>
                    )}
                  </div>

                  {isOpenEndedMode ? (
                    <textarea
                      value={textVal}
                      onChange={(e) => handleTextChange(qNo, e.target.value)}
                      placeholder={`Soru ${qNo} için cevabınızı/açıklamanızı yazınız...`}
                      rows={3}
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        color: 'white',
                        fontSize: '0.82rem',
                        resize: 'vertical',
                        outline: 'none'
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => {
                        const isSelected = selectedOpt === optIdx;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleOptionSelect(qNo, optIdx)}
                            style={{
                              flex: 1,
                              height: '36px',
                              borderRadius: '0.5rem',
                              border: isSelected ? 'none' : '1px solid #475569',
                              background: isSelected ? '#4f46e5' : '#1e293b',
                              color: isSelected ? 'white' : '#cbd5e1',
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
      </div>

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
    </div>
  );
}
