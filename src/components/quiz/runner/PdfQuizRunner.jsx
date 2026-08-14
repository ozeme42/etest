import React, { useState, useEffect, useMemo, useRef } from 'react';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import DrawingCanvas from '../common/DrawingCanvas';
import { Pencil, CheckCircle2, Clock, FileText } from 'lucide-react';
import { idbGetPayload } from '../../../services/indexedDbService';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import QuizPanelLayout from './QuizPanelLayout';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export default function PdfQuizRunner({ test, questions = [], onSubmit, onAutoSave, draftAnswers }) {
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

  const qCount = useMemo(() => {
    let count = Number(
      test.questionCount ||
      test.totalQuestions ||
      test.questionsCount ||
      questions[0]?.questionCount ||
      questions[0]?.totalQuestions
    );

    const keyArray = test.answerKey || questions[0]?.answerKey;
    if (Array.isArray(keyArray) && keyArray.length > 0) {
      return keyArray.length;
    }

    if (test.questionsList && test.questionsList.length > 0) {
      return test.questionsList.length;
    }
    if (test.questionIds && test.questionIds.length > 1) {
      return test.questionIds.length;
    }
    if (questions.length > 1) {
      return questions.length;
    }

    const maxAnsKey = Math.max(
      ...Object.keys(answers).map(Number).filter(n => !isNaN(n)),
      ...Object.keys(openEndedText).map(Number).filter(n => !isNaN(n)),
      0
    );
    if (maxAnsKey > 0) {
      return Math.max(maxAnsKey, count > 1 ? count : 10);
    }

    return (count && count > 1) ? count : 10;
  }, [test, questions, answers, openEndedText]);

  const [idbPdf, setIdbPdf] = useState(null);
  const loadedRef = useRef(null);

  const extractDirectPdf = (obj) => {
    if (!obj) return null;
    const candidates = [
      obj.pdfPayload,
      obj.contentPayload,
      obj.url,
      obj.pdfUrl,
      obj.content,
      obj.filePayload,
      obj.payload,
      obj.data
    ];
    return candidates.find(c => typeof c === 'string' && c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]') || null;
  };

  const getDirectPayload = () => {
    let p = extractDirectPdf(test);
    if (p) return p;

    if (questions && questions.length > 0) {
      for (const q of questions) {
        p = extractDirectPdf(q);
        if (p) return p;
      }
    }

    if (test.questions && Array.isArray(test.questions)) {
      for (const q of test.questions) {
        p = extractDirectPdf(q);
        if (p) return p;
      }
    }

    if (test.questionsList && Array.isArray(test.questionsList)) {
      for (const q of test.questionsList) {
        p = extractDirectPdf(q);
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
            setIdbPdf(val);
            return;
          }
        } catch (e) {}
      }
    }
    loadFromIdb();
  }, [test.id, test.contentPayload, test.pdfPayload, test.questionIds, questions]);

  const pdfPayload = getDirectPayload() || idbPdf;

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: 'white' }}>
      <header style={{ 
        padding: isMobile ? '0.5rem 0.75rem' : '0.85rem 1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: '#1e293b', 
        borderBottom: '1px solid #334155',
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
            {test.title || "PDF Testi"}
          </h2>
          <span style={{ color: '#94a3b8', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 600 }}>
            {isOpenEndedMode ? "Açık Uçlu Sınav" : "Çoktan Seçmeli"} • {qCount} Soru
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Total Countdown Timer Badge */}
          <div style={{
            padding: isMobile ? '0.35rem 0.5rem' : '0.4rem 0.85rem',
            borderRadius: '0.65rem',
            background: timeLeft < 300 ? 'rgba(225,29,72,0.2)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${timeLeft < 300 ? '#f43f5e' : 'rgba(255,255,255,0.15)'}`,
            color: timeLeft < 300 ? '#fda4af' : '#f8fafc',
            fontWeight: 900,
            fontSize: isMobile ? '0.75rem' : '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Clock size={isMobile ? 14 : 16} color={timeLeft < 300 ? '#f43f5e' : '#818cf8'} />
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
              background: isDrawingOpen ? '#eab308' : 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
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
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
            }}
          >
            <CheckCircle2 size={isMobile ? 14 : 18} /> 
            {!isMobile && "Sınavı Bitir"}
            {isMobile && "Bitir"}
          </button>
        </div>
      </header>

      <QuizPanelLayout
        panelTitle={isOpenEndedMode ? "Açık Uçlu Cevap Paneli" : "Optik Cevap Paneli"}
        panelSubtitle="Sınav dokümanını okuyup soruları cevaplayınız."
        icon={isOpenEndedMode ? "✍️" : "🎯"}
        documentContent={useMemo(() => (
          <div style={{ flex: 1, width: '100%', height: '100%', background: '#0f172a' }}>
            <PdfViewerWithControls 
              payload={pdfPayload} 
              title={test.title} 
              height="100%" 
              isDrawingOpen={isDrawingOpen}
              onToggleDrawing={() => setIsDrawingOpen(false)}
            />
          </div>
        ), [pdfPayload, test.title, isDrawingOpen])}
        answerContent={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: qCount }).map((_, idx) => {
              const qNo = idx + 1;
              const selectedOpt = answers[qNo];
              const textVal = openEndedText[qNo] || '';

              return (
                <div key={qNo} style={{ background: '#0f172a', padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid #334155' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.5rem', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
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
                      placeholder={`Soru ${qNo} için cevabınızı yazınız...`}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        borderRadius: '0.5rem',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        color: '#f8fafc',
                        fontSize: '0.85rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {(() => {
                        const isFourOptions = Boolean(
                          Number(test?.optionCount) === 4 ||
                          Number(test?.optionsCount) === 4 ||
                          Number(test?.book?.optionCount) === 4 ||
                          String(test?.optionCount || test?.optionsCount || test?.book?.optionCount || '').includes('4') ||
                          test?.examType === 'LGS' ||
                          test?.book?.publisher === 'LGS' ||
                          String(test?.grade || test?.book?.grade || '').match(/^[5-8]/) ||
                          String(test?.title || test?.book?.title || '').match(/lgs|5\s*sınıf|6\s*sınıf|7\s*sınıf|8\s*sınıf|ortaokul/i)
                        );
                        const optList = isFourOptions ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];
                        return optList.map((opt, optIdx) => {
                          const isSelected = selectedOpt === optIdx;
                          return (
                            <button
                              key={opt}
                              onClick={() => handleOptionSelect(qNo, optIdx)}
                            style={{
                              flex: 1,
                              height: '36px',
                              borderRadius: '0.5rem',
                              border: isSelected ? 'none' : '1px solid #334155',
                              background: isSelected ? 'linear-gradient(135deg, #10b981, #059669)' : '#1e293b',
                              color: isSelected ? 'white' : '#cbd5e1',
                              fontWeight: 900,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 4px 12px rgba(16,185,129,0.3)' : 'none'
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
    </div>
  );
}
