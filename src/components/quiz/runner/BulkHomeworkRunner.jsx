import React, { useState, useEffect, useMemo } from 'react';
import DrawingCanvas from '../common/DrawingCanvas';
import { Pencil, CheckCircle2, FileSpreadsheet, Clock, ChevronRight, ChevronLeft, Layers, ArrowLeft } from 'lucide-react';

export default function BulkHomeworkRunner({ test, questions, onSubmit, onAutoSave, submissionAnswers, onBack }) {
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
    let initAns = null;
    if (submissionAnswers && submissionAnswers.length > 0) {
      initAns = {};
      submissionAnswers.forEach(a => {
        if (a.userAnswer !== null && a.userAnswer !== undefined) {
          const secIdx = sections.findIndex(s => s.id === a.sectionId || s.title === a.sectionTitle);
          
          let qNo = a.questionNoInSection;
          if (!qNo) {
            qNo = Number(a.questionNo);
            let accumulated = 0;
            for(let i=0; i<secIdx; i++) accumulated += sections[i].questionCount || sections[i].totalQuestions || sections[i].questions?.length || 20;
            if (qNo > accumulated && qNo <= accumulated + (sections[secIdx]?.questionCount || sections[secIdx]?.totalQuestions || 20)) {
              qNo = qNo - accumulated;
            } else if (qNo > (sections[secIdx]?.questionCount || sections[secIdx]?.totalQuestions || 20)) {
              qNo = ((qNo - 1) % (sections[secIdx]?.questionCount || sections[secIdx]?.totalQuestions || 20)) + 1;
            }
          }
          
          const key = secIdx >= 0 ? `${secIdx}_${qNo}` : `${qNo}`;
          initAns[key] = a.userAnswer;
          initAns[String(key)] = a.userAnswer;
        }
      });
    }

    try {
      const saved = localStorage.getItem(`${draftKey}_ans`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!initAns) initAns = {};
        Object.entries(parsed).forEach(([k, v]) => {
          initAns[k] = v;
          initAns[Number(k)] = v;
          initAns[String(k)] = v;
        });
      }
    } catch {}
    return initAns || {};
  });

  const [openEndedText, setOpenEndedText] = useState(() => {
    let initTxt = null;
    if (submissionAnswers && submissionAnswers.length > 0) {
      initTxt = {};
      submissionAnswers.forEach(a => {
        if (a.userAnswerText) {
          const secIdx = sections.findIndex(s => s.id === a.sectionId || s.title === a.sectionTitle);
          let qNo = a.questionNoInSection;
          if (!qNo) {
            qNo = Number(a.questionNo);
            let accumulated = 0;
            for(let i=0; i<secIdx; i++) accumulated += sections[i].questionCount || sections[i].questions?.length || 20;
            if (qNo > accumulated && qNo <= accumulated + (sections[secIdx]?.questionCount || 20)) {
              qNo = qNo - accumulated;
            } else if (qNo > (sections[secIdx]?.questionCount || 20)) {
              qNo = ((qNo - 1) % (sections[secIdx]?.questionCount || 20)) + 1;
            }
          }
          const key = secIdx >= 0 ? `${secIdx}_${qNo}` : `${qNo}`;
          initTxt[key] = a.userAnswerText;
          initTxt[String(key)] = a.userAnswerText;
        }
      });
    }

    try {
      const saved = localStorage.getItem(`${draftKey}_txt`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!initTxt) initTxt = {};
        Object.entries(parsed).forEach(([k, v]) => {
          initTxt[k] = v;
          initTxt[Number(k)] = v;
          initTxt[String(k)] = v;
        });
      }
    } catch {}
    return initTxt || {};
  });

  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  const totalQuestionsCount = useMemo(() => {
    return sections.reduce((sum, sec) => sum + (sec.questions?.length || sec.questionCount || sec.totalQuestions || 0), 0) || questions.length || 20;
  }, [sections, questions]);

  const titleStr = String(test.title || test.name || '').toLowerCase();
  const isExplicitlyMultipleChoice = test.questionType === 'coktan_secmeli' || test.type === 'coktan_secmeli';
  const isOpenEndedMode = Boolean(
    test.questionType === 'acik_uclu' || 
    test.isOpenEnded || 
    test.type === 'acik_uclu' ||
    (titleStr && (titleStr.includes('açık uçlu') || titleStr.includes('yazılı')))
  ) && !isExplicitlyMultipleChoice;
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

  const [saveTimeout, setSaveTimeout] = useState(null);

  const triggerAutoSave = (currentAnswers, currentOpenEnded) => {
    if (!onAutoSave) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    
    const timeoutId = setTimeout(() => {
      const formattedAnswers = [];
      let globalNo = 1;

      sections.forEach((sec, secIdx) => {
        const secQs = sec.questions || [];
        const qCount = secQs.length || sec.questionCount || sec.totalQuestions || 20;

        for (let idx = 0; idx < qCount; idx++) {
          const qNo = idx + 1;
          const qObj = secQs[idx] || {};
          const key = getGlobalKey(secIdx, qNo);

          const userAns = currentAnswers[key] !== undefined ? currentAnswers[key] : (currentAnswers[qNo] !== undefined ? currentAnswers[qNo] : currentAnswers[String(qNo)]);
          const textAns = currentOpenEnded[key] || currentOpenEnded[qNo] || currentOpenEnded[String(qNo)] || null;

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
            questionNoInSection: qNo,
            sectionId: sec.id,
            sectionTitle: sec.title,
            userAnswer: userAns !== undefined ? userAns : null,
            userAnswerText: textAns,
            isCorrect,
            correctAnswerLetter: qObj.correctAnswerLetter || (correctOpt !== null && correctOpt !== undefined ? String.fromCharCode(65 + correctOpt) : null)
          });
        }
      });
      onAutoSave(formattedAnswers);
    }, 500);
    setSaveTimeout(timeoutId);
  };

  const handleOptionSelect = (secIdx, qNo, optIdx) => {
    const key = getGlobalKey(secIdx, qNo);
    setAnswers(prev => {
      const updated = { ...prev, [key]: optIdx, [String(key)]: optIdx };
      triggerAutoSave(updated, openEndedText);
      return updated;
    });
  };

  const handleTextChange = (secIdx, qNo, val) => {
    const key = getGlobalKey(secIdx, qNo);
    setOpenEndedText(prev => {
      const updated = { ...prev, [key]: val, [String(key)]: val };
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

    const formattedAnswers = [];
    let globalNo = 1;

    sections.forEach((sec, secIdx) => {
      const secQs = sec.questions || [];
      const qCount = secQs.length || sec.questionCount || sec.totalQuestions || 20;

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
          questionNoInSection: qNo,
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      
      {/* ── HEADER ── */}
      <header style={{ padding: '0.85rem 1.5rem', background: '#ffffff', borderBottom: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap', gap: '0.75rem', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => window.history.back()}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Geri Dön"
          >
            <ArrowLeft size={22} />
          </button>
          <span style={{ padding: '0.35rem 0.65rem', background: '#7c3aed', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Layers size={14} /> BÖLÜMLÜ ÇOKLU ÖDEV
          </span>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>{test.title || test.name}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '0.65rem',
            background: timeLeft < 300 ? '#fef2f2' : '#ffffff',
            border: `1.5px solid ${timeLeft < 300 ? '#fecaca' : '#cbd5e1'}`,
            color: timeLeft < 300 ? '#dc2626' : '#0f172a',
            fontWeight: 900,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Clock size={16} color={timeLeft < 300 ? '#dc2626' : '#059669'} />
            <span>{formatTime(timeLeft)}</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
              (Toplam {totalQuestionsCount * perQuestionMins} dk)
            </span>
          </div>

          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              background: isDrawingOpen ? '#eab308' : '#ffffff',
              border: `1px solid ${isDrawingOpen ? '#eab308' : '#cbd5e1'}`,
              color: isDrawingOpen ? 'white' : '#334155',
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
              boxShadow: '0 4px 16px rgba(16,185,129,0.25)'
            }}
          >
            <CheckCircle2 size={18} /> Sınavı Bitir ve Gönder
          </button>
        </div>
      </header>

      {/* ── MULTI SECTION NAVIGATION TABS ── */}
      <div style={{ background: '#ffffff', borderBottom: '1.5px solid #e2e8f0', padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto' }}>
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
                background: isCurrent ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : isCompleted ? '#f0fdf4' : '#f8fafc',
                border: isCurrent ? '2px solid #6366f1' : isCompleted ? '1.5px solid #bbf7d0' : '1.5px solid #e2e8f0',
                color: isCurrent ? 'white' : isCompleted ? '#16a34a' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{secIdx + 1}. Bölüm: {sec.title}</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.85, padding: '0.1rem 0.4rem', borderRadius: '0.3rem', background: isCurrent ? 'rgba(0,0,0,0.2)' : '#e2e8f0', color: isCurrent ? 'white' : '#334155' }}>
                {ansCount}/{totalCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ maxWidth: '950px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        
        {/* SECTION BANNER */}
        <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', color: 'white', boxShadow: '0 8px 24px rgba(5,150,105,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
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
        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: currentQCount }).map((_, idx) => {
            const qNo = idx + 1;
            const qObj = currentSecQs[idx] || {};
            const key = getGlobalKey(currentSectionIdx, qNo);

            const selectedOpt = answers[key] !== undefined ? answers[key] : (answers[qNo] !== undefined ? answers[qNo] : answers[String(qNo)]);
            const textVal = openEndedText[key] || openEndedText[qNo] || openEndedText[String(qNo)] || '';

            return (
              <div key={qNo} style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                  <span>Soru {qNo}</span>
                  {selectedOpt !== undefined || textVal ? (
                    <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 900 }}>✓ Kodlandı</span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>— Boş</span>
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
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '0.82rem',
                      fontFamily: 'inherit'
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {(() => {
                      const isExplicitFive = Boolean(
                        Number(test?.optionCount) === 5 ||
                        Number(test?.optionsCount) === 5 ||
                        Number(test?.book?.optionCount) === 5 ||
                        String(test?.optionCount || test?.optionsCount || test?.book?.optionCount || '').includes('5') ||
                        test?.examType === 'TYT' || test?.examType === 'AYT' || test?.examType === 'YKS' ||
                        test?.book?.publisher === 'TYT' || test?.book?.publisher === 'AYT' || test?.book?.publisher === 'YKS' ||
                        Boolean(String(test?.grade || test?.book?.grade || '').match(/^(9|10|11|12)/)) ||
                        Boolean(String(test?.title || test?.book?.title || '').match(/tyt|ayt|yks|9\s*sınıf|10\s*sınıf|11\s*sınıf|12\s*sınıf|lise/i))
                      );
                      const isFourOptions = !isExplicitFive;
                      const optionsList = isFourOptions ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];
                      return optionsList.map((opt, optIdx) => {
                        const isSelected = selectedOpt === optIdx;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleOptionSelect(currentSectionIdx, qNo, optIdx)}
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
                      });
                    })()}
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
              background: currentSectionIdx === 0 ? '#f1f5f9' : '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: currentSectionIdx === 0 ? '#94a3b8' : '#334155',
              fontWeight: 800,
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
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)'
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
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)'
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
