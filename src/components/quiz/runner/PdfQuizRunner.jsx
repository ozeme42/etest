import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import DrawingCanvas from '../common/DrawingCanvas';
import { Pencil, CheckCircle2, Clock, FileText, ArrowLeft, Sun, Moon } from 'lucide-react';
import { idbGetPayload, idbSetPayload } from '../../../services/indexedDbService';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import QuizPanelLayout from './QuizPanelLayout';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export default function PdfQuizRunner({ test, questions = [], onSubmit, onAutoSave, draftAnswers, onExit }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { isDark, toggleTheme } = useTheme();
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

    return false;
  }, [test, questions]);

  const perQuestionMins = Number(test.timePerQuestion || test.time_per_question || test.durationPerQuestion) || 2;

  // Exact question count calculation
  const qCount = useMemo(() => {
    // 1. Direct answer key length (highest priority for multiple-choice tests with answer keys)
    const keyArray = test.answerKey || questions[0]?.answerKey;
    if (Array.isArray(keyArray) && keyArray.length > 0) {
      const valid = keyArray.filter(x => x !== undefined && x !== null && String(x).trim() !== '');
      if (valid.length > 0) return valid.length;
    }
    if (typeof keyArray === 'string' && keyArray.trim().length > 0) {
      return keyArray.trim().length;
    }
    if (typeof keyArray === 'object' && keyArray !== null && Object.keys(keyArray).length > 0) {
      return Object.keys(keyArray).length;
    }

    // 2. Direct question list length if defined with multiple questions
    if (Array.isArray(test.questionsList) && test.questionsList.length > 0) {
      return test.questionsList.length;
    }
    if (Array.isArray(questions[0]?.questionsList) && questions[0].questionsList.length > 0) {
      return questions[0].questionsList.length;
    }

    // 3. Questions array if more than 1
    if (Array.isArray(questions) && questions.length > 1) {
      return questions.length;
    }
    if (Array.isArray(test.questions) && test.questions.length > 1) {
      return test.questions.length;
    }
    if (Array.isArray(test.questionIds) && test.questionIds.length > 1) {
      return test.questionIds.length;
    }

    // 4. Title regex (e.g. "(5 Soru)" or "5 Soru")
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

    // 5. Open-ended single document mode default to 1 unless explicit sub-questions
    if (isOpenEndedMode) {
      const rawCount = Number(test.questionCount || questions[0]?.questionCount);
      if (!isNaN(rawCount) && rawCount > 0 && rawCount !== 10) {
        return rawCount;
      }
      return (questions && questions.length > 0) ? questions.length : 1;
    }

    // 6. Explicit questionCount from question bank item
    const qbCount = Number(test.questionCount || questions[0]?.questionCount);
    if (!isNaN(qbCount) && qbCount > 0 && qbCount !== 10) {
      return qbCount;
    }

    const testTotalQ = Number(test.totalQuestions || test.questionsCount || test.qCount);
    if (!isNaN(testTotalQ) && testTotalQ > 0 && testTotalQ !== 10) {
      return testTotalQ;
    }

    return 1;
  }, [test, questions, isOpenEndedMode]);

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

  const handleManualPdfUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      setIdbPdf(dataUrl);
      if (test.id) {
        try {
          await idbSetPayload(test.id, dataUrl);
          await idbSetPayload(`q_${test.id}`, dataUrl);
          await idbSetPayload(`hw_${test.id}`, dataUrl);
        } catch (err) {}
      }
    };
    reader.readAsDataURL(file);
  };

  const pdfPayload = getDirectPayload() || idbPdf;

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
      const currentAns = prev[qNo];
      const updated = { ...prev };
      if (currentAns === optionIdx) {
        delete updated[qNo];
      } else {
        updated[qNo] = optionIdx;
      }
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
        userAnswer: isOpenEndedMode ? (textAns || null) : (userAns !== undefined ? userAns : null),
        userAnswerText: textAns || null,
        isOpenEnded: isOpenEndedMode,
        isCorrect: isOpenEndedMode ? null : isCorrect
      };
    });

    onSubmit(formattedAnswers, { isOpenEnded: isOpenEndedMode });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <header style={{ 
        padding: isMobile ? '0.45rem 0.75rem' : '0.65rem 1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: 'var(--color-surface)', 
        borderBottom: '1.5px solid var(--color-border)',
        flexShrink: 0,
        gap: '0.6rem',
        flexWrap: 'nowrap',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.65rem', overflow: 'hidden', minWidth: 0, flex: 1 }}>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              title="Sınavdan Çıkış Yap"
              style={{
                background: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border-input)',
                color: 'var(--color-text)',
                padding: isMobile ? '0.22rem 0.5rem' : '0.35rem 0.75rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                cursor: 'pointer',
                fontSize: isMobile ? '0.72rem' : '0.8rem',
                fontWeight: 800,
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowLeft size={isMobile ? 13 : 16} />
              <span>Çıkış Yap</span>
            </button>
          )}

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
              📄 PDF TESTİ
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <h2 style={{ 
              color: 'var(--color-text)', 
              fontSize: isMobile ? '0.82rem' : '1.05rem', 
              fontWeight: 900, 
              margin: 0, 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              {test.title || "PDF Testi"}
            </h2>
            {!isMobile && (
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 700 }}>
                {isOpenEndedMode ? "Açık Uçlu / Yazılı Sınav" : "Çoktan Seçmeli"} • {qCount} Soru
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.65rem', flexShrink: 0 }}>
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
            style={{
              padding: isMobile ? '0.25rem 0.5rem' : '0.4rem 0.75rem',
              borderRadius: '0.65rem',
              background: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border-input)',
              color: 'var(--color-text)',
              fontWeight: 800,
              fontSize: isMobile ? '0.72rem' : '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'all 0.15s ease'
            }}
          >
            {isDark ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#6366f1" />}
            {!isMobile && <span>{isDark ? 'Açık' : 'Koyu'}</span>}
          </button>

          {/* Total Countdown Timer Badge */}
          <div style={{
            padding: isMobile ? '0.3rem 0.55rem' : '0.4rem 0.85rem',
            borderRadius: '0.65rem',
            background: timeLeft < 300 ? (isDark ? 'rgba(220, 38, 38, 0.2)' : '#fef2f2') : 'var(--color-surface-hover)',
            border: `1.5px solid ${timeLeft < 300 ? '#fca5a5' : 'var(--color-border-input)'}`,
            color: timeLeft < 300 ? '#dc2626' : 'var(--color-text)',
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
              background: isDrawingOpen ? '#f59e0b' : 'var(--color-surface-hover)',
              border: `1.5px solid ${isDrawingOpen ? '#d97706' : 'var(--color-border-input)'}`,
              color: isDrawingOpen ? 'white' : 'var(--color-text)',
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
              boxShadow: '0 4px 16px rgba(16,185,129,0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckCircle2 size={isMobile ? 14 : 18} /> 
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
          <div style={{ flex: 1, width: '100%', height: '100%', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
            <PdfViewerWithControls 
              payload={pdfPayload} 
              title={test.title} 
              height="100%" 
              isDrawingOpen={isDrawingOpen}
              onToggleDrawing={() => setIsDrawingOpen(false)}
            />
          </div>
        }
        answerContent={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {Array.from({ length: qCount }).map((_, idx) => {
              const qNo = idx + 1;
              const selectedOpt = answers[qNo];
              const textVal = openEndedText[qNo] || '';
              const isAnswered = selectedOpt !== undefined || Boolean(textVal);

              return (
                <div key={qNo} style={{
                  background: 'var(--color-surface)',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.85rem',
                  border: isAnswered ? '1.5px solid #6366f1' : '1.5px solid var(--color-border)',
                  boxShadow: isAnswered ? '0 3px 12px rgba(99,102,241,0.08)' : '0 1px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease'
                }}>
                  <div style={{ fontWeight: 900, fontSize: '0.82rem', marginBottom: '0.55rem', color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '0.45rem',
                      background: isAnswered ? '#4f46e5' : 'var(--color-surface-hover)',
                      color: isAnswered ? '#ffffff' : 'var(--color-text)',
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
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>○ Boş</span>
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
                        background: 'var(--color-surface-hover)',
                        border: textVal ? '1.5px solid #10b981' : '1.5px solid var(--color-border-input)',
                        color: 'var(--color-text)',
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
                        const targetObj = q || test || {};
                        const explicitOpt = Number(targetObj?.optionCount || targetObj?.optionsCount || targetObj?.book?.optionCount || test?.optionCount || test?.optionsCount || test?.book?.optionCount || (typeof book !== 'undefined' ? book?.optionCount : undefined));
  const isExplicitFive = explicitOpt === 5 ? true : (explicitOpt === 4 ? false : Boolean(
                          Number(test?.optionCount) === 5 ||
                          Number(test?.optionsCount) === 5 ||
                          Number(test?.book?.optionCount) === 5 ||
                          String(test?.optionCount || test?.optionsCount || test?.book?.optionCount || '').includes('5') ||
                          test?.examType === 'TYT' || test?.examType === 'AYT' || test?.examType === 'YKS' ||
                          test?.book?.publisher === 'TYT' || test?.book?.publisher === 'AYT' || test?.book?.publisher === 'YKS' ||
                          Boolean(String(test?.grade || test?.book?.grade || '').match(/^(9|10|11|12)/)) ||
                          Boolean(String(test?.title || test?.book?.title || '').match(/tyt|ayt|yks|9\s*sınıf|10\s*sınıf|11\s*sınıf|12\s*sınıf|lise/i))
                        ));
                        const isFourOptions = !isExplicitFive;
                        const optList = isFourOptions ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];
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
                                border: isSelected ? 'none' : '1.5px solid var(--color-border-input)',
                                background: isSelected ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--color-surface)',
                                color: isSelected ? 'white' : 'var(--color-text)',
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
    </div>
  );
}
