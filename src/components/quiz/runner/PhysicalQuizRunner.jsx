import React, { useState, useEffect, useMemo } from 'react';
import DrawingCanvas from '../common/DrawingCanvas';
import { Pencil, CheckCircle2, FileSpreadsheet, Clock, ArrowLeft, FileText, PanelLeft, PanelTop, Maximize2, X as XIcon, EyeOff, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import ResizablePdfPanel from '../../ResizablePdfPanel';

export default function PhysicalQuizRunner({ test, questions, onSubmit, onAutoSave, draftAnswers, bookPdfUrl }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const hasPdf = !!(bookPdfUrl);
  const navigate = useNavigate();
  // 'side' | 'top' | 'float' | 'hidden'
  const [pdfMode, setPdfMode] = useState(hasPdf ? (isMobile ? 'top' : 'side') : 'hidden');
  const [showOptikForm, setShowOptikForm] = useState(true);
  const draftKey = useMemo(() => `draft_quiz_${test.id || 'test'}`, [test.id]);

  const [answers, setAnswers] = useState(() => {
    const initAns = {};
    // 1. First load from Supabase (draftAnswers)
    if (draftAnswers && draftAnswers.length > 0) {
      draftAnswers.forEach(a => {
        if (a.userAnswer !== null && a.userAnswer !== undefined) {
          initAns[a.questionNo] = a.userAnswer;
          initAns[String(a.questionNo)] = a.userAnswer;
        }
      });
    }
    // 2. Then override with localStorage if it has newer/unsynced data
    try {
      const saved = localStorage.getItem(`${draftKey}_ans`);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([k, v]) => {
          initAns[k] = v;
          initAns[Number(k)] = v;
          initAns[String(k)] = v;
        });
      }
    } catch {}
    return initAns;
  });

  const [openEndedText, setOpenEndedText] = useState(() => {
    const initTxt = {};
    if (draftAnswers && draftAnswers.length > 0) {
      draftAnswers.forEach(a => {
        if (a.userAnswerText) {
          initTxt[a.questionNo] = a.userAnswerText;
          initTxt[String(a.questionNo)] = a.userAnswerText;
        }
      });
    }
    try {
      const saved = localStorage.getItem(`${draftKey}_txt`);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([k, v]) => {
          initTxt[k] = v;
          initTxt[Number(k)] = v;
          initTxt[String(k)] = v;
        });
      }
    } catch {}
    return initTxt;
  });

  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const qCount = test.questionCount || test.totalQuestions || (questions.length > 1 ? questions.length : 1);
  const isOpenEndedMode = test.questionType === 'acik_uclu' || test.isOpenEnded;

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

  const [saveTimeout, setSaveTimeout] = useState(null);

  const triggerAutoSave = (currentAnswers, currentText) => {
    if (!onAutoSave) return;
    if (saveTimeout) clearTimeout(saveTimeout);

    const timeoutId = setTimeout(() => {
      const formattedAnswers = [];
      for (let i = 0; i < qCount; i++) {
        const qNo = i + 1;
        const qObj = questions[i] || {};
        const userAns = currentAnswers[qNo] !== undefined ? currentAnswers[qNo] : (currentAnswers[String(qNo)] !== undefined ? currentAnswers[String(qNo)] : currentAnswers[i + 1]);
        const textAns = currentText[qNo] || currentText[String(qNo)] || null;

        formattedAnswers.push({
          questionId: qObj.id || `q${qNo}`,
          questionNo: qNo,
          userAnswer: userAns !== undefined ? userAns : null,
          userAnswerText: textAns || null,
          correctAnswerLetter: qObj.correctAnswerLetter || null
        });
      }
      onAutoSave(formattedAnswers);
    }, 500);
    setSaveTimeout(timeoutId);
  };

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

  const handleOptionSelect = (qNo, optIdx) => {
    setAnswers(prev => {
      const updated = {
        ...prev,
        [qNo]: optIdx,
        [String(qNo)]: optIdx
      };
      triggerAutoSave(updated, openEndedText);
      return updated;
    });
  };

  const handleTextChange = (qNo, val) => {
    setOpenEndedText(prev => {
      const updated = {
        ...prev,
        [qNo]: val,
        [String(qNo)]: val
      };
      triggerAutoSave(answers, updated);
      return updated;
    });
  };

  const handleSubmit = (force = false) => {
    if (!force) {
      setShowFinishModal(true);
      return;
    }

    try {
      localStorage.removeItem(`${draftKey}_ans`);
      localStorage.removeItem(`${draftKey}_txt`);
      localStorage.removeItem(`${draftKey}_time`);
    } catch {}

    const formattedAnswers = Array.from({ length: qCount }).map((_, idx) => {
      const qNo = idx + 1;
      const qObj = questions[idx] || {};
      
      const userAns = answers[qNo] !== undefined ? answers[qNo] : (answers[String(qNo)] !== undefined ? answers[String(qNo)] : null);
      const textAns = openEndedText[qNo] || openEndedText[String(qNo)] || null;

      let correctOpt = qObj.correctAnswer;
      if (correctOpt === null || correctOpt === undefined) {
        const letter = qObj.correctAnswerLetter;
        if (letter && typeof letter === 'string') {
          correctOpt = letter.toUpperCase().charCodeAt(0) - 65;
        }
      }

      let isCorrect = null;
      if (userAns !== null && userAns !== undefined) {
        if (correctOpt !== null && correctOpt !== undefined) {
          isCorrect = Number(userAns) === Number(correctOpt);
        }
      }

      return {
        questionId: qObj.id || `q_${qNo}`,
        questionNo: qNo,
        userAnswer: userAns,
        userAnswerText: textAns,
        isCorrect
      };
    });

    onSubmit(formattedAnswers);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f172a', color: '#f8fafc' }}>
      <header style={{ 
        padding: isMobile ? '0.5rem 0.75rem' : '0.85rem 1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: '#1e293b', 
        borderBottom: '1px solid #334155',
        position: 'sticky', 
        top: 0, 
        zIndex: 10,
        flexShrink: 0,
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Geri Dön"
            >
              <ArrowLeft size={isMobile ? 18 : 22} />
            </button>
            <h2 style={{ 
              color: '#f8fafc', 
              fontSize: isMobile ? '0.9rem' : '1.15rem', 
              fontWeight: 800, 
              margin: 0, 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              {test.title || test.name || 'Fiziki Test'}
            </h2>
          </div>
          <span style={{ color: '#94a3b8', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 600 }}>
            Fiziki Sınav • {qCount} Soru
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{
            padding: isMobile ? '0.35rem 0.5rem' : '0.4rem 0.85rem',
            borderRadius: '0.65rem',
            background: timeLeft < 300 ? '#7f1d1d' : '#0f172a',
            border: `1.5px solid ${timeLeft < 300 ? '#ef4444' : '#334155'}`,
            color: timeLeft < 300 ? '#fca5a5' : '#e0e7ff',
            fontWeight: 900,
            fontSize: isMobile ? '0.75rem' : '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Clock size={isMobile ? 14 : 16} color={timeLeft < 300 ? '#ef4444' : '#059669'} />
            <span>{formatTime(timeLeft)}</span>
            {!isMobile && (
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                (Toplam {qCount * perQuestionMins} dk)
              </span>
            )}
          </div>

          {/* PDF Mode Buttons */}
          {hasPdf && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* Side (Hidden on Mobile) */}
              {!isMobile && (
                <button
                  onClick={() => setPdfMode('side')}
                  title="Sol panele sabitle"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: isMobile ? '0.35rem' : '0.4rem 0.7rem',
                    borderRadius: '0.6rem', border: `1.5px solid ${pdfMode === 'side' ? '#3b82f6' : '#334155'}`,
                    background: pdfMode === 'side' ? '#1d4ed8' : '#0f172a',
                    color: pdfMode === 'side' ? 'white' : '#93c5fd',
                    fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <PanelLeft size={isMobile ? 13 : 14} />
                  Sol Panel
                </button>
              )}
              {/* Top */}
              <button
                onClick={() => setPdfMode('top')}
                title="Üst panele sabitle"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: isMobile ? '0.35rem' : '0.4rem 0.7rem',
                  borderRadius: '0.6rem', border: `1.5px solid ${pdfMode === 'top' ? '#3b82f6' : '#334155'}`,
                  background: pdfMode === 'top' ? '#1d4ed8' : '#0f172a',
                  color: pdfMode === 'top' ? 'white' : '#93c5fd',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <PanelTop size={isMobile ? 13 : 14} />
                {!isMobile && 'Üst Panel'}
              </button>
              {/* Float */}
              <button
                onClick={() => setPdfMode('float')}
                title="Yüzen pencere"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: isMobile ? '0.35rem' : '0.4rem 0.7rem',
                  borderRadius: '0.6rem', border: `1.5px solid ${pdfMode === 'float' ? '#3b82f6' : '#334155'}`,
                  background: pdfMode === 'float' ? '#1d4ed8' : '#0f172a',
                  color: pdfMode === 'float' ? 'white' : '#93c5fd',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <Maximize2 size={isMobile ? 13 : 14} />
                {!isMobile && 'Pencere'}
              </button>
              {/* Hidden */}
              <button
                onClick={() => setPdfMode('hidden')}
                title="Gizle"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: isMobile ? '0.35rem' : '0.4rem 0.7rem',
                  borderRadius: '0.6rem', border: `1.5px solid ${pdfMode === 'hidden' ? '#ef4444' : '#334155'}`,
                  background: pdfMode === 'hidden' ? '#7f1d1d' : '#0f172a',
                  color: pdfMode === 'hidden' ? '#fca5a5' : '#94a3b8',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <XIcon size={isMobile ? 13 : 14} />
                {!isMobile && 'Gizle'}
              </button>
            </div>
          )}

          <button
            onClick={() => setShowOptikForm(!showOptikForm)}
            style={{
              padding: isMobile ? '0.4rem 0.5rem' : '0.5rem 1rem',
              borderRadius: '0.75rem',
              background: !showOptikForm ? '#eab308' : '#0f172a',
              border: '1px solid #334155',
              color: !showOptikForm ? 'white' : '#e2e8f0',
              fontWeight: 800,
              fontSize: isMobile ? '0.75rem' : '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title={showOptikForm ? "Optik Gizle" : "Optik Göster"}
          >
            {showOptikForm ? <EyeOff size={isMobile ? 14 : 16} /> : <Eye size={isMobile ? 14 : 16} />}
            {!isMobile && (showOptikForm ? "Optik Gizle" : "Optik Göster")}
          </button>

          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: isMobile ? '0.4rem 0.5rem' : '0.5rem 1rem',
              borderRadius: '0.75rem',
              background: isDrawingOpen ? '#eab308' : '#0f172a',
              border: '1px solid #334155',
              color: isDrawingOpen ? 'white' : '#e2e8f0',
              fontWeight: 800,
              fontSize: isMobile ? '0.75rem' : '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title="Çizim Aracı"
          >
            <Pencil size={isMobile ? 14 : 16} /> 
            {!isMobile && (isDrawingOpen ? "Çizimi Kapat" : "Çizim Aracı")}
          </button>

          <button
            onClick={() => handleSubmit()}
            style={{
              padding: isMobile ? '0.4rem 0.6rem' : '0.55rem 1.25rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.75rem' : '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 16px rgba(16,185,129,0.35)'
            }}
          >
            <CheckCircle2 size={isMobile ? 14 : 18} /> 
            {!isMobile && "Optik Formu Kaydet"}
            {isMobile && "Kaydet"}
          </button>
        </div>
      </header>

      {/* MAIN: PDF (side/top) + Optik Form — full remaining height */}
      <div
        data-quiz-layout
        style={{
          display: 'flex',
          flexDirection: pdfMode === 'top' ? 'column' : 'row',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* LEFT/TOP: PDF panel (rendered inline by ResizablePdfPanel) */}
        {hasPdf && (
          <ResizablePdfPanel
            pdfUrl={bookPdfUrl}
            title={test.title || test.name || 'Kitap PDF'}
            mode={pdfMode}
            onModeChange={setPdfMode}
            isFullScreen={!showOptikForm}
          />
        )}

        {/* RIGHT/BOTTOM: Optik Form — scrollable */}
        {showOptikForm && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ maxWidth: pdfMode === 'hidden' ? 900 : undefined, width: '100%', margin: pdfMode === 'hidden' ? '0 auto' : undefined, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', color: 'white', boxShadow: '0 8px 24px rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '1rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileSpreadsheet size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem' }}>Dijital Optik Form Kodlama</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                  {hasPdf && pdfMode !== 'hidden' ? 'PDF\u2019i okuyarak cevaplar\u0131 i\u015faretleyin.' : 'Ka\u011f\u0131t \u00fczerinde \u00e7\u00f6zd\u00fc\u011f\u00fcn\u00fcz s\u0131nav\u0131n cevaplar\u0131n\u0131 i\u015faretleyiniz.'}
                </p>
              </div>
            </div>

            {/* Optik Grid Form */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.35)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {Array.from({ length: qCount }).map((_, idx) => {
                const qNo = idx + 1;
                const qObj = questions[idx] || {};
                const selectedOpt = answers[qNo] !== undefined ? answers[qNo] : answers[String(qNo)];
                const textVal = openEndedText[qNo] || openEndedText[String(qNo)] || '';

                return (
                  <div key={qNo} style={{ background: '#0f172a', padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.85rem', color: '#f8fafc' }}>
                      <span>{qObj.testName ? `${qObj.testName} - Soru ${qNo}` : `Soru ${qNo}`}</span>
                      {selectedOpt !== undefined || textVal ? (
                        <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 900 }}>✓ Kodlandı</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>— Boş</span>
                      )}
                    </div>

                    {isOpenEndedMode ? (
                      <textarea
                        value={textVal}
                        onChange={(e) => handleTextChange(qNo, e.target.value)}
                        placeholder={`Soru ${qNo} açık uçlu yanıt...`}
                        rows={2}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.82rem', fontFamily: 'inherit' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {(() => {
                          const optionsList = (qObj.options && Array.isArray(qObj.options) && qObj.options.length > 0)
                            ? qObj.options
                            : (test.optionCount === 4 || test.optionsCount === 4 || test.examType === 'LGS' || String(test.grade || '').match(/^[5-8]/))
                              ? ['A', 'B', 'C', 'D']
                              : ['A', 'B', 'C', 'D', 'E'];
                          return optionsList.map((opt, optIdx) => {
                            const isSelected = selectedOpt === optIdx;
                            return (
                              <button
                                key={opt}
                                onClick={() => handleOptionSelect(qNo, optIdx)}
                                style={{
                                  flex: 1, height: '34px', borderRadius: '0.5rem',
                                  border: isSelected ? 'none' : '1px solid #334155',
                                  background: isSelected ? '#059669' : '#1e293b',
                                  color: isSelected ? 'white' : '#cbd5e1',
                                  fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s ease'
                                }}
                              >
                                {opt}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '2rem' }}>
              <button
                onClick={() => handleSubmit()}
                style={{
                  padding: '1rem 3rem', borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                  border: 'none', color: 'white', fontWeight: 900, fontSize: '1.1rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  boxShadow: '0 8px 25px rgba(79, 70, 229, 0.4)'
                }}
              >
                <CheckCircle2 size={22} />
                Sınavı Kaydet ve Gönder
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />

      {/* FINISH MODAL */}
      {showFinishModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)' }}>
          <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center', padding: '2.5rem', background: '#1e293b', borderRadius: '1.5rem', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '1rem', color: '#f8fafc' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', border: '2px solid #ef4444', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ margin: '0', fontSize: '1.5rem', fontWeight: 900 }}>Sınavı Bitiriyorsunuz</h3>
            <p style={{ margin: '0', color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Tüm cevaplarınızı optik forma doğru geçirdiğinizden emin misiniz? Sınavı bitirdikten sonra cevaplarınızı değiştiremezsiniz.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setShowFinishModal(false)}
                style={{ flex: 1, minWidth: '140px', padding: '0.85rem 1rem', borderRadius: '0.85rem', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
              >
                Kontrol Etmeye Dön
              </button>
              <button 
                onClick={() => {
                  setShowFinishModal(false);
                  handleSubmit(true);
                }}
                style={{ flex: 1, minWidth: '140px', padding: '0.85rem 1rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
              >
                Sınavı Kaydet ve Gönder
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────
          FLOATING ACTION BUTTON TO SHOW OPTIK FORM WHEN HIDDEN
          ───────────────────────────────────────────────────────────── */}
      {(!showOptikForm || pdfMode === 'float') && (
        <button
          onClick={() => {
            setShowOptikForm(true);
            if (pdfMode === 'float') setPdfMode(isMobile ? 'top' : 'side');
          }}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '1.5rem',
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(16,185,129,0.5)',
            border: 'none',
            zIndex: 9999,
            cursor: 'pointer'
          }}
          title="Optik Formu Aç"
        >
          <FileSpreadsheet size={24} />
        </button>
      )}

    </div>
  );
}
