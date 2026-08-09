import React, { useState, useEffect, useMemo } from 'react';
import DrawingCanvas from '../common/DrawingCanvas';
import { Pencil, CheckCircle2, FileSpreadsheet, Clock } from 'lucide-react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export default function PhysicalQuizRunner({ test, questions, onSubmit, onAutoSave, draftAnswers }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const draftKey = useMemo(() => `draft_quiz_${test.id || 'test'}`, [test.id]);

  const [answers, setAnswers] = useState(() => {
    if (draftAnswers && draftAnswers.length > 0) {
      const initAns = {};
      draftAnswers.forEach(a => {
        if (a.userAnswer !== null && a.userAnswer !== undefined) {
          initAns[a.questionNo] = a.userAnswer;
          initAns[String(a.questionNo)] = a.userAnswer;
        }
      });
      return initAns;
    }
    try {
      const saved = localStorage.getItem(`${draftKey}_ans`);
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      const normalized = {};
      Object.entries(parsed).forEach(([k, v]) => {
        normalized[k] = v;
        normalized[Number(k)] = v;
        normalized[String(k)] = v;
      });
      return normalized;
    } catch { return {}; }
  });

  const [openEndedText, setOpenEndedText] = useState(() => {
    if (draftAnswers && draftAnswers.length > 0) {
      const initTxt = {};
      draftAnswers.forEach(a => {
        if (a.userAnswerText) {
          initTxt[a.questionNo] = a.userAnswerText;
          initTxt[String(a.questionNo)] = a.userAnswerText;
        }
      });
      return initTxt;
    }
    try {
      const saved = localStorage.getItem(`${draftKey}_txt`);
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      const normalized = {};
      Object.entries(parsed).forEach(([k, v]) => {
        normalized[k] = v;
        normalized[Number(k)] = v;
        normalized[String(k)] = v;
      });
      return normalized;
    } catch { return {}; }
  });

  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

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
    }, 2000);
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

  const handleSubmit = () => {
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
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
            onClick={handleSubmit}
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

      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: '1.25rem', padding: '1.5rem', color: 'white', boxShadow: '0 8px 24px rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.35)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
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
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
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
                            border: isSelected ? 'none' : '1px solid #334155',
                            background: isSelected ? '#059669' : '#1e293b',
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
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={handleSubmit}
          style={{
            padding: '1rem 3rem',
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
            border: 'none',
            color: 'white',
            fontWeight: 900,
            fontSize: '1.2rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 8px 25px rgba(79, 70, 229, 0.4)'
          }}
        >
          <CheckCircle2 size={24} /> 
          Sınavı Bitir ve Gönder
        </button>
      </div>

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
    </div>
  );
}
