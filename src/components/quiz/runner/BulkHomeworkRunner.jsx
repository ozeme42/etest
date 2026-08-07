import React, { useState, useEffect, useMemo } from 'react';
import DrawingCanvas from '../common/DrawingCanvas';
import { Pencil, CheckCircle2, FileSpreadsheet, Clock, ChevronRight, ChevronLeft, Layers } from 'lucide-react';

export default function BulkHomeworkRunner({ test, questions, onSubmit }) {
  const draftKey = useMemo(() => `draft_bulk_quiz_${test.id || 'test'}`, [test.id]);

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);

  // Group questions into sections if test.sections is missing
  const sections = useMemo(() => {
    if (test.sections && Array.isArray(test.sections) && test.sections.length > 0) {
      return test.sections;
    }

    if (questions && questions.length > 0) {
      // Group by testName or sectionTitle
      const groups = {};
      questions.forEach((q, idx) => {
        const secTitle = q.testName || q.sectionTitle || 'Genel Test';
        if (!groups[secTitle]) {
          groups[secTitle] = {
            id: `sec_${Object.keys(groups).length}`,
            title: secTitle,
            questions: []
          };
        }
        groups[secTitle].questions.push({
          ...q,
          localQuestionNo: groups[secTitle].questions.length + 1
        });
      });

      const result = Object.values(groups);
      if (result.length > 0) return result;
    }

    return [{
      id: test.id || 'sec_1',
      title: test.title || test.name || 'Test',
      questionCount: questions.length || test.questionCount || 20,
      questions: questions
    }];
  }, [test.sections, test.id, test.title, test.name, test.questionCount, questions]);

  const currentSection = sections[currentSectionIdx] || sections[0];

  const [answers, setAnswers] = useState(() => {
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

  const totalQuestionsCount = useMemo(() => {
    return sections.reduce((sum, sec) => sum + (sec.questions?.length || sec.questionCount || 0), 0) || questions.length || 20;
  }, [sections, questions]);

  const isOpenEndedMode = test.questionType === 'acik_uclu' || test.isOpenEnded;
  const perQuestionMins = Number(test.timePerQuestion || test.time_per_question || test.durationPerQuestion) || 2;
  const totalSeconds = useMemo(() => (totalQuestionsCount * perQuestionMins * 60) || 1200, [totalQuestionsCount, perQuestionMins]);

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

  const getGlobalKey = (secIdx, qNo) => `${secIdx}_${qNo}`;

  const handleOptionSelect = (secIdx, qNo, optIdx) => {
    const key = getGlobalKey(secIdx, qNo);
    setAnswers(prev => ({
      ...prev,
      [key]: optIdx,
      [String(key)]: optIdx
    }));
  };

  const handleTextChange = (secIdx, qNo, val) => {
    const key = getGlobalKey(secIdx, qNo);
    setOpenEndedText(prev => ({
      ...prev,
      [key]: val,
      [String(key)]: val
    }));
  };

  const handleSubmit = () => {
    try {
      localStorage.removeItem(`${draftKey}_ans`);
      localStorage.removeItem(`${draftKey}_txt`);
      localStorage.removeItem(`${draftKey}_time`);
    } catch {}

    const formattedAnswers = [];
    let globalNo = 1;

    sections.forEach((sec, secIdx) => {
      const secQs = sec.questions || [];
      const qCount = secQs.length || sec.questionCount || 20;

      for (let idx = 0; idx < qCount; idx++) {
        const qNo = idx + 1;
        const qObj = secQs[idx] || {};
        const key = getGlobalKey(secIdx, qNo);

        const userAns = answers[key] !== undefined ? answers[key] : (answers[qNo] !== undefined ? answers[qNo] : answers[String(qNo)]);
        const textAns = openEndedText[key] || openEndedText[qNo] || openEndedText[String(qNo)] || null;

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

        formattedAnswers.push({
          questionId: qObj.id || `sec${secIdx}_q${qNo}`,
          questionNo: globalNo++,
          sectionId: sec.id,
          sectionTitle: sec.title,
          userAnswer: userAns !== undefined ? userAns : null,
          userAnswerText: textAns,
          isCorrect,
          correctAnswerLetter: qObj.correctAnswerLetter || (correctOpt !== null && correctOpt !== undefined ? String.fromCharCode(65 + correctOpt) : null)
        });
      }
    });

    onSubmit(formattedAnswers);
  };

  const getSectionAnsweredCount = (secIdx, sec) => {
    const qCount = sec.questions?.length || sec.questionCount || 0;
    let count = 0;
    for (let i = 1; i <= qCount; i++) {
      const key = getGlobalKey(secIdx, i);
      if (answers[key] !== undefined || answers[i] !== undefined || openEndedText[key] || openEndedText[i]) {
        count++;
      }
    }
    return count;
  };

  const currentSecQs = currentSection.questions || [];
  const currentQCount = currentSecQs.length || currentSection.questionCount || 20;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      
      {/* ── HEADER ── */}
      <header style={{ padding: '0.85rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ padding: '0.35rem 0.65rem', background: '#7c3aed', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Layers size={14} /> BÖLÜMLÜ ÇOKLU ÖDEV
          </span>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#f8fafc' }}>{test.title || test.name}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '0.65rem',
            background: timeLeft < 300 ? '#7f1d1d' : '#0f172a',
            border: `1.5px solid ${timeLeft < 300 ? '#ef4444' : '#334155'}`,
            color: timeLeft < 300 ? '#fca5a5' : '#e0e7ff',
            fontWeight: 900,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Clock size={16} color={timeLeft < 300 ? '#ef4444' : '#059669'} />
            <span>{formatTime(timeLeft)}</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
              (Toplam {totalQuestionsCount * perQuestionMins} dk)
            </span>
          </div>

          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              background: isDrawingOpen ? '#eab308' : '#0f172a',
              border: '1px solid #334155',
              color: isDrawingOpen ? 'white' : '#e2e8f0',
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
              boxShadow: '0 4px 16px rgba(16,185,129,0.35)'
            }}
          >
            <CheckCircle2 size={18} /> Sınavı Bitir ve Gönder
          </button>
        </div>
      </header>

      {/* ── MULTI SECTION NAVIGATION TABS ── */}
      <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto' }}>
        {sections.map((sec, secIdx) => {
          const isCurrent = secIdx === currentSectionIdx;
          const ansCount = getSectionAnsweredCount(secIdx, sec);
          const totalCount = sec.questions?.length || sec.questionCount || 0;
          const isCompleted = ansCount === totalCount && totalCount > 0;

          return (
            <button
              key={sec.id || secIdx}
              onClick={() => setCurrentSectionIdx(secIdx)}
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: '0.75rem',
                fontWeight: 900,
                fontSize: '0.82rem',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: isCurrent ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : isCompleted ? 'rgba(16,185,129,0.15)' : '#1e293b',
                border: isCurrent ? '2px solid #818cf8' : isCompleted ? '1px solid #10b981' : '1px solid #334155',
                color: isCurrent ? 'white' : isCompleted ? '#34d399' : '#cbd5e1',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{secIdx + 1}. Bölüm: {sec.title}</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.85, padding: '0.1rem 0.4rem', borderRadius: '0.3rem', background: 'rgba(0,0,0,0.2)' }}>
                {ansCount}/{totalCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ maxWidth: '950px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        
        {/* SECTION BANNER */}
        <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', color: 'white', boxShadow: '0 8px 24px rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>
                {currentSectionIdx + 1}. Bölüm — {currentSection.title}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                Kağıt üzerinde çözdüğünüz bölümün cevaplarını aşağıdaki kabarcıklara işaretleyiniz.
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontSize: '0.82rem', fontWeight: 900 }}>
            Bölüm {currentSectionIdx + 1} / {sections.length}
          </div>
        </div>

        {/* OPTIK GRID FORM FOR ACTIVE SECTION */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.35)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: currentQCount }).map((_, idx) => {
            const qNo = idx + 1;
            const qObj = currentSecQs[idx] || {};
            const key = getGlobalKey(currentSectionIdx, qNo);

            const selectedOpt = answers[key] !== undefined ? answers[key] : (answers[qNo] !== undefined ? answers[qNo] : answers[String(qNo)]);
            const textVal = openEndedText[key] || openEndedText[qNo] || openEndedText[String(qNo)] || '';

            return (
              <div key={qNo} style={{ background: '#0f172a', padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.85rem', color: '#f8fafc' }}>
                  <span>Soru {qNo}</span>
                  {selectedOpt !== undefined || textVal ? (
                    <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 900 }}>✓ Kodlandı</span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>— Boş</span>
                  )}
                </div>

                {isOpenEndedMode ? (
                  <textarea
                    value={textVal}
                    onChange={(e) => handleTextChange(currentSectionIdx, qNo, e.target.value)}
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
                          onClick={() => handleOptionSelect(currentSectionIdx, qNo, optIdx)}
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

        {/* ── BOTTOM SECTION NAVIGATION BUTTONS ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCurrentSectionIdx(p => Math.max(0, p - 1))}
            disabled={currentSectionIdx === 0}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.85rem',
              background: currentSectionIdx === 0 ? '#1e293b' : '#334155',
              border: '1px solid #475569',
              color: currentSectionIdx === 0 ? '#64748b' : '#f8fafc',
              fontWeight: 900,
              fontSize: '0.9rem',
              cursor: currentSectionIdx === 0 ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <ChevronLeft size={18} /> Önceki Bölüm
          </button>

          {currentSectionIdx < sections.length - 1 ? (
            <button
              onClick={() => setCurrentSectionIdx(p => Math.min(sections.length - 1, p + 1))}
              style={{
                padding: '0.75rem 1.75rem',
                borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 16px rgba(99,102,241,0.35)'
              }}
            >
              Sonraki Bölüm <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              style={{
                padding: '0.75rem 1.75rem',
                borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 16px rgba(16,185,129,0.35)'
              }}
            >
              <CheckCircle2 size={18} /> Sınavı Bitir ve Gönder
            </button>
          )}
        </div>
      </div>

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
    </div>
  );
}
