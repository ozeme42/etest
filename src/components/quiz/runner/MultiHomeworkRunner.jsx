import React, { useState, useEffect, useMemo } from 'react';
import { useQuestionBank } from '../../../context/QuestionBankContext';
import { resolveTestQuestions } from '../../../utils/testResolver';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { idbGetPayload } from '../../../services/indexedDbService';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Layers, FileSpreadsheet, Pencil } from 'lucide-react';
import DrawingCanvas from '../common/DrawingCanvas';

// Helper to check open-ended
function checkIsOE(obj) {
  if (!obj) return false;
  return Boolean(
    obj.questionType === 'acik_uclu' ||
    obj.type === 'acik_uclu' ||
    obj.questionType === 'yazili' ||
    obj.type === 'yazili' ||
    obj.contentType === 'yazili' ||
    obj.isOpenEnded === true
  );
}

// ─── RIGHT OPTIK PANEL ────────────────────────────────────────────────────────
function RightOptikPanel({ qCount, answers, openEndedText, isOpenEnded, onOptionSelect, onTextChange }) {
  return (
    <div style={{ width: '300px', background: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '0.85rem 1rem', background: '#0f172a', borderBottom: '1px solid #334155', fontWeight: 900, fontSize: '0.85rem', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>📋 Optik Kodlama</span>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Toplam {qCount} Soru</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {Array.from({ length: qCount }).map((_, idx) => {
          const qNo = idx + 1;
          const userAnsObj = answers[qNo];
          const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
          const textVal = openEndedText[qNo] || '';

          return (
            <div key={qNo} style={{ background: '#0f172a', padding: '0.65rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.78rem', color: '#f8fafc' }}>
                <span>Soru {qNo}</span>
                {userAns !== undefined || textVal ? (
                  <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 900 }}>✓ Kodlandı</span>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>— Boş</span>
                )}
              </div>

              {isOpenEnded ? (
                <textarea
                  value={textVal}
                  onChange={(e) => onTextChange(qNo, e.target.value)}
                  placeholder={`Soru ${qNo} açık uçlu yanıt...`}
                  rows={2}
                  style={{ width: '100%', padding: '0.35rem', borderRadius: '0.4rem', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.78rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                />
              ) : (
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => {
                    const isSelected = userAns === optIdx;
                    return (
                      <button
                        key={opt}
                        onClick={() => onOptionSelect(qNo, optIdx)}
                        style={{
                          flex: 1,
                          height: '30px',
                          borderRadius: '0.4rem',
                          border: isSelected ? 'none' : '1px solid #334155',
                          background: isSelected ? '#059669' : '#1e293b',
                          color: isSelected ? 'white' : '#cbd5e1',
                          fontWeight: 900,
                          fontSize: '0.8rem',
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
  );
}

// ─── MAIN MULTI-HOMEWORK RUNNER COMPONENT ────────────────────────────────────
export default function MultiHomeworkRunner({ test, questions, onSubmit }) {
  const { questions: allBankQuestions } = useQuestionBank();
  const draftKey = useMemo(() => `draft_multi_hw_${test.id || 'test'}`, [test.id]);

  // 1. Build sections cleanly
  const sections = useMemo(() => {
    // If test has explicit sections array
    if (test.sections && Array.isArray(test.sections) && test.sections.length > 0) {
      return test.sections.map((sec, idx) => {
        const bankQ = allBankQuestions?.find(q => String(q.id) === String(sec.questionId || sec.id)) || sec;
        let resolvedQuestions = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : (sec.questions || []);
        const qCount = bankQ?.questionCount || sec.questionCount || resolvedQuestions.length || 1;

        if (resolvedQuestions.length < qCount) {
          const filled = [...resolvedQuestions];
          for (let i = filled.length; i < qCount; i++) {
            const subQ = bankQ?.questionsList?.[i] || {};
            filled.push({
              ...subQ,
              id: subQ.id || `${bankQ?.id || sec.id || 'q'}_sub_${i + 1}`,
              questionText: subQ.questionText || subQ.text || subQ.title || `Soru ${i + 1}`,
              options: (subQ.options && subQ.options.length > 0) ? subQ.options : ['A', 'B', 'C', 'D', 'E'],
              correctAnswer: subQ.correctAnswer !== undefined ? subQ.correctAnswer : 0
            });
          }
          resolvedQuestions = filled;
        }

        return {
          id: sec.id || sec.questionId || `sec_${idx}`,
          title: sec.title || bankQ?.title || bankQ?.name || `${idx + 1}. Bölüm`,
          bankQ: bankQ || sec,
          resolvedQuestions,
          qCount
        };
      });
    }

    // If test has tests array
    if (test.tests && Array.isArray(test.tests) && test.tests.length > 0) {
      return test.tests.map((subTest, idx) => {
        const bankQ = allBankQuestions?.find(q => String(q.id) === String(subTest.id || subTest.questionId)) || subTest;
        let resolvedQuestions = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : (subTest.questions || []);
        const qCount = bankQ?.questionCount || subTest.questionCount || resolvedQuestions.length || 1;

        return {
          id: subTest.id || `test_${idx}`,
          title: subTest.title || subTest.name || bankQ?.title || `${idx + 1}. Bölüm`,
          bankQ: bankQ || subTest,
          resolvedQuestions,
          qCount
        };
      });
    }

    // Group questions by testName if passed as flat array
    if (questions && questions.length > 0) {
      const groups = {};
      questions.forEach((q) => {
        const groupKey = q.testId || q.testName || q.sectionTitle || test.id || 'sec_main';
        const groupTitle = q.testName || q.sectionTitle || test.title || test.name || 'Bölüm 1';

        if (!groups[groupKey]) {
          groups[groupKey] = {
            id: groupKey,
            title: groupTitle,
            bankQ: test,
            resolvedQuestions: [],
            qCount: 0
          };
        }
        groups[groupKey].resolvedQuestions.push(q);
        groups[groupKey].qCount += 1;
      });

      const res = Object.values(groups);
      if (res.length > 0) return res;
    }

    const resolvedQuestions = resolveTestQuestions(test, allBankQuestions);
    return [{
      id: test.id || 'sec_1',
      title: test.title || test.name || 'Bölüm 1',
      bankQ: test,
      resolvedQuestions: resolvedQuestions.length > 0 ? resolvedQuestions : (questions || []),
      qCount: test.questionCount || resolvedQuestions.length || questions.length || 1
    }];
  }, [test, questions, allBankQuestions]);

  const [activeSecIdx, setActiveSecIdx] = useState(0);
  const activeSec = sections[activeSecIdx] || sections[0];

  const [sectionAnswers, setSectionAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(`${draftKey}_ans`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return Object.fromEntries(sections.map(s => [s.id, { answers: {}, openEndedText: {} }]));
  });

  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  const totalQuestionsCount = useMemo(() => {
    return sections.reduce((sum, s) => sum + s.qCount, 0);
  }, [sections]);

  const perQuestionMins = Number(test.timePerQuestion || test.time_per_question) || 2;
  const totalSeconds = useMemo(() => totalQuestionsCount * perQuestionMins * 60 || 1200, [totalQuestionsCount, perQuestionMins]);

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
    try {
      localStorage.setItem(`${draftKey}_ans`, JSON.stringify(sectionAnswers));
    } catch {}
  }, [sectionAnswers, draftKey]);

  useEffect(() => {
    if (timeLeft <= 0) { handleSubmit(); return; }
    try { localStorage.setItem(`${draftKey}_time`, String(timeLeft)); } catch {}

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [draftKey]);

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '--:--';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = n => String(n).padStart(2, '0');
    return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
  };

  const handleSelectOption = (secId, qNo, optIdx, qObj) => {
    const correctAns = qObj.correctAnswer;
    const isCorrect = (correctAns !== null && correctAns !== undefined) ? optIdx === correctAns : null;

    setSectionAnswers(prev => {
      const currentSecState = prev[secId] || { answers: {}, openEndedText: {} };
      return {
        ...prev,
        [secId]: {
          ...currentSecState,
          answers: {
            ...currentSecState.answers,
            [qNo]: { userAnswer: optIdx, isCorrect, questionId: qObj.id }
          }
        }
      };
    });
  };

  const handleTextChange = (secId, qNo, val) => {
    setSectionAnswers(prev => {
      const currentSecState = prev[secId] || { answers: {}, openEndedText: {} };
      return {
        ...prev,
        [secId]: {
          ...currentSecState,
          openEndedText: {
            ...currentSecState.openEndedText,
            [qNo]: val
          }
        }
      };
    });
  };

  const handleSubmit = () => {
    try {
      localStorage.removeItem(`${draftKey}_ans`);
      localStorage.removeItem(`${draftKey}_time`);
    } catch {}

    const formattedAnswers = [];
    let globalNo = 1;

    sections.forEach(sec => {
      const sa = sectionAnswers[sec.id] || {};
      const secQs = sec.resolvedQuestions || [];

      for (let idx = 0; idx < sec.qCount; idx++) {
        const qNo = idx + 1;
        const qObj = secQs[idx] || {};
        const ansObj = sa.answers?.[qNo] || {};
        const userAns = typeof ansObj === 'object' ? ansObj.userAnswer : ansObj;
        const textAns = sa.openEndedText?.[qNo] || null;

        formattedAnswers.push({
          questionId: qObj.id || `${sec.id}_${qNo}`,
          questionNo: globalNo++,
          sectionId: sec.id,
          sectionTitle: sec.title,
          userAnswer: userAns !== undefined ? userAns : null,
          userAnswerText: textAns,
          isCorrect: ansObj.isCorrect !== undefined ? ansObj.isCorrect : null,
          correctAnswer: qObj.correctAnswer !== undefined ? qObj.correctAnswer : null
        });
      }
    });

    onSubmit(formattedAnswers);
  };

  const activeSecState = sectionAnswers[activeSec.id] || { answers: {}, openEndedText: {} };
  const secOE = checkIsOE(activeSec.bankQ);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#f8fafc', overflow: 'hidden' }}>
      
      {/* ── HEADER BAR ── */}
      <header style={{ padding: '0.75rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ padding: '0.35rem 0.65rem', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Layers size={14} /> TOPLU ÖDEV RUNNER
          </span>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0, color: '#f8fafc' }}>{test.title || test.name}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.4rem 0.85rem', borderRadius: '0.65rem', background: timeLeft < 300 ? '#7f1d1d' : '#0f172a', border: `1.5px solid ${timeLeft < 300 ? '#ef4444' : '#334155'}`, color: timeLeft < 300 ? '#fca5a5' : '#e0e7ff', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={16} color={timeLeft < 300 ? '#ef4444' : '#059669'} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', background: isDrawingOpen ? '#eab308' : '#0f172a', border: '1px solid #334155', color: isDrawingOpen ? 'white' : '#e2e8f0', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Pencil size={16} /> {isDrawingOpen ? "Çizimi Kapat" : "Çizim Aracı"}
          </button>

          <button
            onClick={handleSubmit}
            style={{ padding: '0.55rem 1.25rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
          >
            <CheckCircle2 size={18} /> Sınavı Bitir ve Gönder
          </button>
        </div>
      </header>

      {/* ── TOP SECTION TABS BAR (PERMANENT) ── */}
      <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexShrink: 0, overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {sections.map((sec, idx) => {
            const isCurrent = idx === activeSecIdx;
            const secAnsState = sectionAnswers[sec.id]?.answers || {};
            const secTxtState = sectionAnswers[sec.id]?.openEndedText || {};
            const ansCount = Object.keys(secAnsState).length + Object.keys(secTxtState).filter(k => secTxtState[k]).length;
            const isCompleted = ansCount === sec.qCount && sec.qCount > 0;

            return (
              <button
                key={sec.id || idx}
                onClick={() => setActiveSecIdx(idx)}
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
                <span>{idx + 1}. Bölüm: {sec.title}</span>
                <span style={{ fontSize: '0.72rem', opacity: 0.85, padding: '0.1rem 0.4rem', borderRadius: '0.3rem', background: 'rgba(0,0,0,0.25)' }}>
                  {ansCount}/{sec.qCount}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => setActiveSecIdx(p => Math.max(0, p - 1))}
            disabled={activeSecIdx === 0}
            style={{ padding: '0.4rem 0.9rem', borderRadius: '0.6rem', background: activeSecIdx === 0 ? '#1e293b' : '#334155', border: '1px solid #475569', color: activeSecIdx === 0 ? '#64748b' : 'white', fontWeight: 800, fontSize: '0.8rem', cursor: activeSecIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            <ChevronLeft size={16} /> Önceki Bölüm
          </button>
          <button
            onClick={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
            disabled={activeSecIdx === sections.length - 1}
            style={{ padding: '0.4rem 0.9rem', borderRadius: '0.6rem', background: activeSecIdx === sections.length - 1 ? '#1e293b' : 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', color: activeSecIdx === sections.length - 1 ? '#64748b' : 'white', fontWeight: 800, fontSize: '0.8rem', cursor: activeSecIdx === sections.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            Sonraki Bölüm <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA (QUESTIONS STACKED ON 1 PAGE + RIGHT OPTIK PANEL) ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        
        {/* CENTER / SCROLLABLE QUESTIONS LIST FOR ACTIVE SECTION */}
        <div style={{ flex: 1, minWidth: 0, background: '#f8fafc', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* SECTION BANNER */}
          <div style={{ background: 'linear-gradient(135deg, #4f46e5, #3730a3)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', color: 'white', boxShadow: '0 6px 20px rgba(79,70,229,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>{activeSecIdx + 1}. Bölüm — {activeSec.title}</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                  Bu bölümdeki {activeSec.qCount} sorunun tamamı aşağıda sıralanmıştır.
                </p>
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.85rem', borderRadius: '0.65rem', fontSize: '0.82rem', fontWeight: 900 }}>
              Bölüm {activeSecIdx + 1} / {sections.length}
            </div>
          </div>

          {/* QUESTION CARDS STACKED VERTICALLY */}
          {Array.from({ length: activeSec.qCount }).map((_, idx) => {
            const qNo = idx + 1;
            const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[idx]) || {};
            const isQOpenEnded = secOE || checkIsOE(qObj);

            const qText = qObj.questionText || qObj.text || qObj.question || qObj.title || qObj.questionTitle || qObj.name || (qObj.contentPayload && !qObj.contentPayload.startsWith('data:') ? qObj.contentPayload : null) || `Soru ${qNo}`;

            const rawImages = (qObj.imageUrls && qObj.imageUrls.length > 0)
              ? qObj.imageUrls
              : (qObj.imageUrl ? [qObj.imageUrl] : (qObj.contentPayload && qObj.contentPayload.startsWith('data:image') ? [qObj.contentPayload] : []));
            const imageUrls = (Array.isArray(rawImages) ? rawImages : [rawImages]).filter(isValidImageUrl);

            const options = (qObj.options && Array.isArray(qObj.options) && qObj.options.length > 0) ? qObj.options : ['A', 'B', 'C', 'D', 'E'];

            const userAnsObj = activeSecState.answers?.[qNo];
            const selectedOpt = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
            const textVal = activeSecState.openEndedText?.[qNo] || '';

            return (
              <div key={qNo} style={{ background: 'white', borderRadius: '1.1rem', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* QUESTION HEADER */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ padding: '0.3rem 0.75rem', background: '#eef2ff', color: '#4f46e5', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.85rem' }}>
                      SORU {qNo}
                    </span>
                    {isQOpenEnded && (
                      <span style={{ padding: '0.2rem 0.6rem', background: '#fef3c7', color: '#b45309', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.75rem' }}>
                        ✍️ Açık Uçlu / Yazılı
                      </span>
                    )}
                  </div>

                  {selectedOpt !== undefined || textVal ? (
                    <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 900 }}>✓ Cevaplandı</span>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>— Yanıtlanmadı</span>
                  )}
                </div>

                {/* QUESTION IMAGES */}
                {imageUrls.map((url, imgIdx) => (
                  <StandardImageFrame key={imgIdx} src={url} alt={`Soru ${qNo} Görsel`} />
                ))}

                {/* QUESTION TEXT */}
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.65 }}>
                  {qText}
                </div>

                {/* MULTIPLE CHOICE OPTIONS OR WRITTEN INPUT */}
                {!isQOpenEnded ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                    {options.map((opt, optIdx) => {
                      const isSelected = selectedOpt === optIdx;
                      const optLetter = String.fromCharCode(65 + optIdx);
                      let optText = '';
                      if (typeof opt === 'string') {
                        optText = opt;
                      } else if (opt && typeof opt === 'object') {
                        optText = opt.text || opt.optionText || opt.label || opt.title || opt.value || opt.content || '';
                      }
                      const showText = Boolean(optText && optText.trim() !== optLetter);

                      return (
                        <button key={optIdx} onClick={() => handleSelectOption(activeSec.id, qNo, optIdx, qObj)} style={{
                          padding: '0.9rem 1.25rem', borderRadius: '0.75rem', textAlign: 'left', cursor: 'pointer', fontWeight: isSelected ? 900 : 700,
                          border: isSelected ? '2px solid #6366f1' : '1.5px solid #cbd5e1',
                          background: isSelected ? 'linear-gradient(135deg, #eef2ff, #e0e7ff)' : 'white',
                          color: isSelected ? '#3730a3' : '#1e293b', transition: 'all 0.15s ease',
                          display: 'flex', alignItems: 'center'
                        }}>
                          <span style={{ fontWeight: 900, color: isSelected ? '#6366f1' : '#475569', fontSize: '0.95rem', marginRight: '0.75rem', minWidth: '24px' }}>
                            {optLetter})
                          </span>
                          <span style={{ fontSize: '0.95rem', color: isSelected ? '#1e1b4b' : '#1e293b', fontWeight: 700 }}>
                            {showText ? optText : `Seçenek ${optLetter}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#475569' }}>
                      ✍️ Açık Uçlu Yanıtınızı Buraya Yazınız:
                    </label>
                    <textarea
                      value={textVal}
                      onChange={e => handleTextChange(activeSec.id, qNo, e.target.value)}
                      placeholder={`Soru ${qNo} için yanıtınızı buraya yazınız...`}
                      rows={4}
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* BOTTOM SECTION NAV BUTTONS */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              onClick={() => setActiveSecIdx(p => Math.max(0, p - 1))}
              disabled={activeSecIdx === 0}
              style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', background: activeSecIdx === 0 ? '#cbd5e1' : '#334155', border: 'none', color: activeSecIdx === 0 ? '#64748b' : 'white', fontWeight: 900, fontSize: '0.9rem', cursor: activeSecIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ChevronLeft size={18} /> Önceki Bölüm
            </button>

            {activeSecIdx < sections.length - 1 ? (
              <button
                onClick={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
                style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
              >
                Sonraki Bölüm <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
              >
                <CheckCircle2 size={18} /> Sınavı Bitir ve Gönder
              </button>
            )}
          </div>
        </div>

        {/* RIGHT OPTIK PANEL */}
        <RightOptikPanel
          qCount={activeSec.qCount}
          answers={activeSecState.answers || {}}
          openEndedText={activeSecState.openEndedText || {}}
          isOpenEnded={secOE}
          onOptionSelect={(qNo, optIdx) => {
            const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[qNo - 1]) || {};
            handleSelectOption(activeSec.id, qNo, optIdx, qObj);
          }}
          onTextChange={(qNo, val) => handleTextChange(activeSec.id, qNo, val)}
        />
      </div>

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
    </div>
  );
}
