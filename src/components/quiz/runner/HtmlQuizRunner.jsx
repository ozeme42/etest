import React, { useState, useEffect, useMemo, useRef } from 'react';
import HtmlViewerWithControls from '../../HtmlViewerWithControls';
import DrawingCanvas from '../common/DrawingCanvas';
import { Pencil, CheckCircle2, Clock } from 'lucide-react';
import { idbGetPayload } from '../../../services/indexedDbService';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';

export default function HtmlQuizRunner({ test, questions = [], onSubmit }) {
  const draftKey = useMemo(() => `draft_quiz_${test.id || 'test'}`, [test.id]);

  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(`${draftKey}_ans`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [openEndedText, setOpenEndedText] = useState(() => {
    try {
      const saved = localStorage.getItem(`${draftKey}_txt`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  // Exact question count calculation
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
    setAnswers(prev => ({ ...prev, [qNo]: optionIdx }));
  };

  const handleTextChange = (qNo, val) => {
    setOpenEndedText(prev => ({ ...prev, [qNo]: val }));
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

      const isCorrect = (userAns !== undefined && userAns !== null)
        ? checkIsAnswerCorrect(userAns, qObj, test, qNo)
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
      <header style={{ padding: '0.85rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ padding: '0.35rem 0.65rem', background: '#06b6d4', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', color: 'black' }}>
            HTML SINAV
          </span>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>{test.title}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Total Countdown Timer Badge */}
          <div style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '0.65rem',
            background: timeLeft < 300 ? 'rgba(225,29,72,0.2)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${timeLeft < 300 ? '#f43f5e' : 'rgba(255,255,255,0.15)'}`,
            color: timeLeft < 300 ? '#fda4af' : '#f8fafc',
            fontWeight: 900,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Clock size={16} color={timeLeft < 300 ? '#f43f5e' : '#06b6d4'} />
            <span>{formatTime(timeLeft)}</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
              (Toplam {qCount * perQuestionMins} dk)
            </span>
          </div>

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

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, height: '100%', borderRight: '1px solid #334155', background: '#ffffff', color: '#1e293b' }}>
          <HtmlViewerWithControls payload={htmlPayload} title={test.title} height="100%" />
        </div>

        <div style={{ width: '380px', flexShrink: 0, height: '100%', background: '#1e293b', overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#38bdf8' }}>
              {isOpenEndedMode ? "✍️ Açık Uçlu Cevap Paneli" : "🎯 Optik Cevap Paneli"}
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
              HTML dokümanını okuyup soruları cevaplayınız.
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
                      placeholder={`Soru ${qNo} için cevabınızı yazınız...`}
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
                              background: isSelected ? '#0284c7' : '#1e293b',
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
