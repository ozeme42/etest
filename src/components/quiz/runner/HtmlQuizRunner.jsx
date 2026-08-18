import React, { useState, useEffect, useMemo, useRef } from 'react';
import HtmlViewerWithControls from '../../HtmlViewerWithControls';
import DrawingCanvas from '../common/DrawingCanvas';
import { Pencil, CheckCircle2, Clock } from 'lucide-react';
import { idbGetPayload } from '../../../services/indexedDbService';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import QuizPanelLayout from './QuizPanelLayout';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export default function HtmlQuizRunner({ test, questions = [], onSubmit, onAutoSave, draftAnswers }) {
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
      return saved ? JSON.parse(saved) : {};
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
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  // Exact question count calculation
  const qCount = useMemo(() => {
    // 1. Direct Question Count field from test or questions (Authoritative!)
    const rawCount = Number(
      test.questionCount ||
      test.totalQuestions ||
      test.questionsCount ||
      test.qCount ||
      questions[0]?.questionCount ||
      questions[0]?.totalQuestions ||
      questions[0]?.qCount
    );
    if (!isNaN(rawCount) && rawCount > 0) {
      return rawCount;
    }

    // 2. Direct question list length if defined with multiple questions
    if (Array.isArray(test.questionsList) && test.questionsList.length > 0) {
      return test.questionsList.length;
    }

    // 3. Direct answer key length
    const keyArray = test.answerKey || questions[0]?.answerKey;
    if (Array.isArray(keyArray) && keyArray.length > 0) {
      const valid = keyArray.filter(x => x !== undefined && x !== null && String(x).trim() !== '');
      return valid.length || keyArray.length;
    }
    if (typeof keyArray === 'string' && keyArray.trim().length > 0) {
      return keyArray.trim().length;
    }
    if (typeof keyArray === 'object' && keyArray !== null && Object.keys(keyArray).length > 0) {
      return Object.keys(keyArray).length;
    }

    // 4. Title regex (e.g. "(2 Soru)" or "2 Soru")
    const titles = [test.title, test.name, questions[0]?.title, questions[0]?.name];
    for (const t of titles) {
      if (t) {
        const m = String(t).match(/(\d+)\s*Soru/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num) && num > 0) return num;
        }
      }
    }

    // 5. Questions array if more than 1
    if (Array.isArray(questions) && questions.length > 1) {
      return questions.length;
    }
    if (Array.isArray(test.questionIds) && test.questionIds.length > 1) {
      return test.questionIds.length;
    }

    return 1;
  }, [test, questions]);

  const [idbHtml, setIdbHtml] = useState(null);
  const loadedRef = useRef(null);

  const extractDirectHtml = (obj) => {
    if (!obj) return null;
    const candidates = [
      obj.contentPayload,
      obj.htmlPayload,
      obj.url,
      obj.htmlUrl,
      obj.content,
      obj.pdfPayload,
      obj.filePayload,
      obj.payload,
      obj.data,
      obj.html
    ];
    return candidates.find(c => typeof c === 'string' && c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]') || null;
  };

  const getDirectPayload = () => {
    let p = extractDirectHtml(test);
    if (p) return p;

    if (questions && questions.length > 0) {
      for (const q of questions) {
        p = extractDirectHtml(q);
        if (p) return p;
      }
    }

    if (test.questions && Array.isArray(test.questions)) {
      for (const q of test.questions) {
        p = extractDirectHtml(q);
        if (p) return p;
      }
    }

    if (test.questionsList && Array.isArray(test.questionsList)) {
      for (const q of test.questionsList) {
        p = extractDirectHtml(q);
        if (p) return p;
      }
    }

    return null;
  };

  useEffect(() => {
    const direct = getDirectPayload();
    if (direct) return;
    if (loadedRef.current === test.id) return;

    async function loadFromIdb() {
      const rawIds = [
        test.id,
        test.id?.replace(/^hw_/, ''),
        test.id?.replace(/^hw_/, 'q_'),
        ...(test.questionIds || []),
        ...(questions || []).map(q => q.id),
        ...(test.questions || []).map(q => q.id),
        ...(test.questionsList || []).map(q => q.id)
      ];

      const idsToTry = [];
      rawIds.forEach(id => {
        if (!id) return;
        const strId = typeof id === 'object' ? (id.id || id.questionId) : String(id);
        if (strId) {
          idsToTry.push(strId);
          idsToTry.push(strId.replace(/^q_?/, ''));
          idsToTry.push(strId.replace(/^q_?/, 'q'));
          idsToTry.push(strId.replace(/^q_?/, 'q_'));
          idsToTry.push(strId.replace(/^hw_/, ''));
          idsToTry.push(strId.replace(/^hw_/, 'q'));
          idsToTry.push(strId.replace(/^hw_/, 'q_'));
          idsToTry.push(`q_${strId}`);
          idsToTry.push(`q${strId}`);
        }
      });

      const uniqueIds = [...new Set(idsToTry)];

      for (const id of uniqueIds) {
        try {
          const val = await idbGetPayload(id);
          if (val && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]') {
            loadedRef.current = test.id;
            setIdbHtml(val);
            return;
          }
        } catch (e) {}
      }
    }
    loadFromIdb();
  }, [test.id, test.contentPayload, test.htmlPayload, test.questionIds, questions]);

  const htmlPayload = getDirectPayload() || idbHtml;

  const isOpenEndedMode = useMemo(() => {
    if (
      test.questionType === 'coktan_secmeli' ||
      test.type === 'coktan_secmeli' ||
      test.contentType === 'coktan_secmeli' ||
      (Array.isArray(test.answerKey) && test.answerKey.length > 0)
    ) {
      return false;
    }

    if (
      test.questionType === 'acik_uclu' ||
      test.questionType === 'yazili' ||
      test.type === 'acik_uclu' ||
      test.type === 'yazili' ||
      test.contentType === 'acik_uclu' ||
      test.contentType === 'yazili' ||
      test.isOpenEnded
    ) {
      return true;
    }

    if (test.title && (
      test.title.toLowerCase().includes('açık uçlu') ||
      test.title.toLowerCase().includes('acik uclu') ||
      test.title.toLowerCase().includes('yazılı') ||
      test.title.toLowerCase().includes('yazili')
    )) {
      return true;
    }

    if (questions.some(q =>
      q.type === 'acik_uclu' ||
      q.type === 'yazili' ||
      q.contentType === 'acik_uclu' ||
      q.contentType === 'yazili' ||
      q.isOpenEnded
    )) {
      return true;
    }

    if (
      test.questionType === 'coktan_secmeli' ||
      test.type === 'coktan_secmeli' ||
      test.contentType === 'coktan_secmeli'
    ) {
      return false;
    }

    return false;
  }, [test, questions]);

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
      const formattedAnswers = Array.from({ length: qCount }).map((_, idx) => {
        const qNo = idx + 1;
        const qObj = questions[idx] || questions[0] || {};
        const userAns = currentAnswers[qNo];
        const textAns = currentText[qNo];

        return {
          questionId: qObj.id ? `${qObj.id}_${qNo}` : `q_${qNo}`,
          questionNo: qNo,
          userAnswer: userAns !== undefined ? userAns : null,
          userAnswerText: textAns || null
        };
      });
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

  const handleOptionSelect = (qNo, optionIdx) => {
    setAnswers(prev => {
      const updated = { ...prev, [qNo]: optionIdx };
      triggerAutoSave(updated, openEndedText);
      return updated;
    });
  };

  const handleTextChange = (qNo, val) => {
    setOpenEndedText(prev => {
      const updated = { ...prev, [qNo]: val };
      triggerAutoSave(answers, updated);
      return updated;
    });
  };

  const handleSubmit = () => {
    // Clear draft storage upon submission
    try {
      localStorage.removeItem(`${draftKey}_ans`);
      localStorage.removeItem(`${draftKey}_txt`);
      localStorage.removeItem(`${draftKey}_time`);
    } catch {}

    const formattedAnswers = Array.from({ length: qCount }).map((_, idx) => {
      const qNo = idx + 1;
      const qObj = questions[idx] || questions[0] || {};
      const userAns = answers[qNo];
const textAns = openEndedText[qNo];

      // checkIsAnswerCorrect artık answerKey'i qObj.correctAnswer'dan önce kontrol ediyor
      const isCorrect = (userAns !== undefined && userAns !== null)
        ? checkIsAnswerCorrect(userAns, qObj, { ...test, answerKey: test.answerKey || questions[0]?.answerKey }, qNo)
        : (textAns ? null : false);

      return {
        questionId: qObj.id ? `${qObj.id}_${qNo}` : `q_${qNo}`,
        questionNo: qNo,
        userAnswer: userAns !== undefined ? userAns : null,
        userAnswerText: textAns || null,
        isCorrect
      };
    });

    onSubmit(formattedAnswers);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      <header style={{ 
        padding: isMobile ? '0.45rem 0.75rem' : '0.65rem 1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: '#ffffff', 
        borderBottom: '1.5px solid #e2e8f0',
        flexShrink: 0,
        gap: '0.6rem',
        flexWrap: 'nowrap',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.75rem', overflow: 'hidden', minWidth: 0, flex: 1 }}>
          {!isMobile && (
            <div style={{
              padding: '0.35rem 0.75rem',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              borderRadius: '0.65rem',
              fontWeight: 900,
              fontSize: '0.76rem',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(2,132,199,0.25)'
            }}>
              🌐 HTML TESTİ
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <h2 style={{ 
              color: '#0f172a', 
              fontSize: isMobile ? '0.88rem' : '1.1rem', 
              fontWeight: 900, 
              margin: 0, 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              {test.title || "HTML Testi"}
            </h2>
            <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700 }}>
              {isOpenEndedMode ? "Açık Uçlu Sınav" : "Çoktan Seçmeli"} • {qCount} Soru
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.65rem', flexShrink: 0 }}>
          {/* Total Countdown Timer Badge */}
          <div style={{
            padding: isMobile ? '0.3rem 0.55rem' : '0.4rem 0.85rem',
            borderRadius: '0.65rem',
            background: timeLeft < 300 ? '#fef2f2' : '#ffffff',
            border: `1.5px solid ${timeLeft < 300 ? '#fca5a5' : '#e2e8f0'}`,
            color: timeLeft < 300 ? '#dc2626' : '#0f172a',
            fontWeight: 900,
            fontSize: isMobile ? '0.75rem' : '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
          }}>
            <Clock size={14} color={timeLeft < 300 ? '#dc2626' : '#0284c7'} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: isMobile ? '0.35rem 0.55rem' : '0.45rem 0.95rem',
              borderRadius: '0.65rem',
              background: isDrawingOpen ? '#f59e0b' : '#ffffff',
              border: `1.5px solid ${isDrawingOpen ? '#d97706' : '#e2e8f0'}`,
              color: isDrawingOpen ? 'white' : '#334155',
              fontWeight: 800,
              fontSize: isMobile ? '0.75rem' : '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            title="Çizim Aracı"
          >
            <Pencil size={14} /> 
            {!isMobile && (isDrawingOpen ? "Çizimi Kapat" : "Çizim Tahtası")}
          </button>

          <button
            onClick={handleSubmit}
            style={{
              padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1.25rem',
              borderRadius: '0.65rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.78rem' : '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckCircle2 size={18} /> 
            {!isMobile && "Sınavı Bitir ve Gönder"}
            {isMobile && "Bitir"}
          </button>
        </div>
      </header>

      <QuizPanelLayout
        panelTitle={isOpenEndedMode ? "Açık Uçlu Cevap Paneli" : "Optik Cevap Kağıdı"}
        panelSubtitle={`${qCount} Soru`}
        icon={isOpenEndedMode ? "✍️" : "📋"}
        defaultPosition="right"
        defaultSize={340}
        documentContent={
          <div style={{ flex: 1, width: '100%', height: '100%', background: '#ffffff', color: '#1e293b' }}>
            <HtmlViewerWithControls payload={htmlPayload} title={test.title} height="100%" />
          </div>
        }
        answerContent={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {Array.from({ length: qCount }).map((_, idx) => {
              const qNo = idx + 1;
              const q = questions[idx] || questions[0] || {};
              const selectedOpt = answers[qNo];
              const textVal = openEndedText[qNo] || '';
              const isAnswered = selectedOpt !== undefined || Boolean(textVal);

              return (
                <div key={qNo} style={{
                  background: '#ffffff',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.85rem',
                  border: isAnswered ? '1.5px solid #c7d2fe' : '1.5px solid #e2e8f0',
                  boxShadow: isAnswered ? '0 3px 12px rgba(99,102,241,0.06)' : '0 1px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease'
                }}>
                  <div style={{ fontWeight: 900, fontSize: '0.82rem', marginBottom: '0.55rem', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '0.45rem',
                      background: isAnswered ? '#4f46e5' : '#f1f5f9',
                      color: isAnswered ? '#ffffff' : '#334155',
                      fontSize: '0.76rem',
                      letterSpacing: '0.02em'
                    }}>
                      SORU {qNo}
                    </span>
                    {isAnswered ? (
                      <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                        {isOpenEndedMode ? 'Yanıtlandı' : `Şık ${String.fromCharCode(65 + selectedOpt)}`}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>○ Boş</span>
                    )}
                  </div>

                  {isOpenEndedMode ? (
                    <textarea
                      value={textVal}
                      onChange={(e) => handleTextChange(qNo, e.target.value)}
                      placeholder={`Soru ${qNo} için cevabınızı yazınız...`}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.8rem',
                        borderRadius: '0.6rem',
                        background: '#ffffff',
                        border: textVal ? '1.5px solid #10b981' : '1.5px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '0.85rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                        lineHeight: 1.5,
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
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
                        const isFourOpts = !isExplicitFive;
                        const optList = (q?.options && Array.isArray(q.options) && q.options.length > 0)
                          ? (isFourOpts && q.options.length > 4 ? q.options.slice(0, 4) : q.options)
                          : (isFourOpts ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E']);
                        return optList.map((opt, optIdx) => {
                          const isSelected = selectedOpt === optIdx;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleOptionSelect(qNo, optIdx)}
                              style={{
                                flex: 1,
                                height: '36px',
                                borderRadius: '0.6rem',
                                border: isSelected ? 'none' : '1.5px solid #cbd5e1',
                                background: isSelected ? 'linear-gradient(135deg, #10b981, #059669)' : '#ffffff',
                                color: isSelected ? 'white' : '#334155',
                                fontWeight: 900,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isSelected ? '0 4px 12px rgba(16,185,129,0.35)' : 'none'
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
        }
      />

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
    </div>
  );
}
