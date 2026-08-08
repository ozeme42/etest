import React, { useState, useEffect, useMemo, useRef } from 'react';
import DrawingCanvas from '../common/DrawingCanvas';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import QuestionGridNav from '../common/QuestionGridNav';
import { Pencil, CheckCircle2, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { idbGetPayload } from '../../../services/indexedDbService';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';

export default function ImageQuizRunner({ test, questions = [], onSubmit, onAutoSave, draftAnswers }) {
  const draftKey = useMemo(() => `draft_quiz_${test.id || 'test'}`, [test.id]);

  const [currentIndex, setCurrentIndex] = useState(0);
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
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const loadedRef = useRef(null);
  const [idbPayload, setIdbPayload] = useState(null);

  const extractPayload = (obj) => {
    if (!obj) return null;
    const candidates = [obj.contentPayload, obj.imageUrl, obj.url, obj.imagePayload, obj.payload];
    return candidates.find(c => typeof c === 'string' && c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]') || null;
  };

  useEffect(() => {
    const testId = test.id;
    if (extractPayload(test)) return;
    if (loadedRef.current === testId) return;

    async function loadFromIdb() {
      const ids = [testId, testId?.replace(/^q_/, ''), questions?.[0]?.id, test.questionsList?.[0]?.id].filter(Boolean);
      let resolved = null;
      for (const id of ids) {
        const val = await idbGetPayload(id);
        if (val && val !== '[STORED_IN_INDEXEDDB]') { resolved = val; break; }
      }
      if (!resolved && questions?.length > 0) {
        for (const q of questions) {
          const c = extractPayload(q);
          if (c) { resolved = c; break; }
          if (q.id) { const val = await idbGetPayload(q.id); if (val) { resolved = val; break; } }
        }
      }
      if (resolved) { loadedRef.current = testId; setIdbPayload(resolved); }
    }
    loadFromIdb();
  }, [test.id, test.contentPayload, questions]);

  const allImageUrls = useMemo(() => {
    const urls = [];

    const getObjUrls = (obj) => {
      if (!obj) return [];
      if (obj.imageUrls && Array.isArray(obj.imageUrls) && obj.imageUrls.length > 0) {
        return obj.imageUrls;
      }
      if (obj.imageUrl && typeof obj.imageUrl === 'string' && obj.imageUrl !== '[STORED_IN_INDEXEDDB]') {
        return [obj.imageUrl];
      }
      const payload = extractPayload(obj) || idbPayload;
      if (payload && typeof payload === 'string') {
        if (payload.startsWith('http') || payload.startsWith('data:image')) {
          return [payload];
        }
        if (payload.includes('|') || payload.includes('\n')) {
          return payload.split(/\n\n|\n|\|/).map(s => s.trim()).filter(Boolean);
        }
      }
      if (obj.url && typeof obj.url === 'string') {
        return [obj.url];
      }
      return [];
    };

    if (questions && questions.length > 0) {
      questions.forEach(q => {
        urls.push(...getObjUrls(q));
      });
    }
    if (urls.length === 0) {
      urls.push(...getObjUrls(test));
    }
    if (urls.length === 0 && idbPayload) {
      if (idbPayload.startsWith('http') || idbPayload.startsWith('data:image')) {
        urls.push(idbPayload);
      } else if (idbPayload.includes('|') || idbPayload.includes('\n')) {
        urls.push(...idbPayload.split(/\n\n|\n|\|/).map(s => s.trim()).filter(Boolean));
      }
    }

    return urls.filter(isValidImageUrl);
  }, [questions, test, idbPayload]);

  const activeQuestion = questions[currentIndex] || questions[0] || {};

  const qCount = useMemo(() => {
    if (questions && questions.length > 1) return questions.length;
    if (test.questionsList && test.questionsList.length > 0) return test.questionsList.length;
    if (test.questionCount && Number(test.questionCount) > 0) return Number(test.questionCount);
    if (test.totalQuestions && Number(test.totalQuestions) > 0) return Number(test.totalQuestions);
    const keyArray = test.answerKey || questions[0]?.answerKey;
    if (Array.isArray(keyArray) && keyArray.length > 0) return keyArray.length;
    if (allImageUrls.length > 0) return allImageUrls.length;
    return 1;
  }, [questions, test, allImageUrls.length]);

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

    const titleStr = String(test.title || test.name || '').toLowerCase();
    if (titleStr && (
      titleStr.includes('açık uçlu') ||
      titleStr.includes('acik uclu') ||
      titleStr.includes('yazılı') ||
      titleStr.includes('yazili')
    )) {
      return true;
    }

    if (activeQuestion) {
      if (
        activeQuestion.type === 'acik_uclu' ||
        activeQuestion.type === 'yazili' ||
        activeQuestion.contentType === 'acik_uclu' ||
        activeQuestion.contentType === 'yazili' ||
        activeQuestion.isOpenEnded
      ) {
        return true;
      }
    }
    
    return false;
  }, [test, activeQuestion]);

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
        const qObj = questions[i] || questions[0] || {};
        const userAns = currentAnswers[qNo] !== undefined ? currentAnswers[qNo] : (currentAnswers[String(qNo)] !== undefined ? currentAnswers[String(qNo)] : currentAnswers[i + 1]);
        const textAns = currentText[qNo] || currentText[String(qNo)] || null;

        formattedAnswers.push({
          questionId: qObj.id ? `${qObj.id}_${qNo}` : `q${qNo}`,
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

  const activeImageUrl = useMemo(() => {
    const qDirect = activeQuestion.imageUrl || (activeQuestion.imageUrls && activeQuestion.imageUrls[0]) || activeQuestion.contentPayload;
    if (qDirect && isValidImageUrl(qDirect) && qDirect !== '[STORED_IN_INDEXEDDB]') {
      return qDirect;
    }
    if (allImageUrls[currentIndex]) {
      return allImageUrls[currentIndex];
    }
    if (allImageUrls.length > 0) {
      return allImageUrls[0];
    }
    const testDirect = test.imageUrl || test.contentPayload || (test.imageUrls && test.imageUrls[0]) || idbPayload;
    if (testDirect && isValidImageUrl(testDirect) && testDirect !== '[STORED_IN_INDEXEDDB]') {
      return testDirect;
    }
    return null;
  }, [activeQuestion, allImageUrls, currentIndex, test, idbPayload]);

  const imageUrls = useMemo(() => {
    // Önce tüm görseller listesinden mevcut indeksteki görseli al
    // (paket halinde yüklenen görsel soru setleri için)
    if (allImageUrls.length > 0) {
      const url = allImageUrls[currentIndex] || allImageUrls[0];
      return url ? [url] : [];
    }

    // Bireysel soruların kendi imageUrls dizisi varsa sadece ilkini al
    if (activeQuestion.imageUrls && Array.isArray(activeQuestion.imageUrls) && activeQuestion.imageUrls.length > 0) {
      const firstValid = activeQuestion.imageUrls.find(isValidImageUrl);
      return firstValid ? [firstValid] : [];
    }

    return activeImageUrl ? [activeImageUrl].filter(isValidImageUrl) : [];
  }, [activeQuestion, allImageUrls, currentIndex, activeImageUrl]);


  const handleOptionSelect = (optionIdx) => {
    setAnswers(prev => {
      const updated = {
        ...prev,
        [currentIndex + 1]: {
          questionId: activeQuestion.id || `q_${currentIndex + 1}`,
          userAnswer: optionIdx,
          isCorrect: activeQuestion.correctAnswer !== undefined ? optionIdx === activeQuestion.correctAnswer : null
        }
      };
      // Format current Answers properly for triggerAutoSave
      const simplifiedAnswers = {};
      Object.keys(updated).forEach(k => {
        simplifiedAnswers[k] = updated[k]?.userAnswer;
      });
      triggerAutoSave(simplifiedAnswers, openEndedText);
      return updated;
    });
  };

  const handleTextChange = (val) => {
    setOpenEndedText(prev => {
      const updatedText = {
        ...prev,
        [currentIndex + 1]: val
      };
      
      const simplifiedAnswers = {};
      Object.keys(answers).forEach(k => {
        simplifiedAnswers[k] = answers[k]?.userAnswer;
      });
      triggerAutoSave(simplifiedAnswers, updatedText);
      return updatedText;
    });

    setAnswers(prev => ({
      ...prev,
      [currentIndex + 1]: {
        questionId: activeQuestion.id || `q_${currentIndex + 1}`,
        userAnswerText: val
      }
    }));
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
      const savedAns = answers[qNo] || {};
      const textVal = openEndedText[qNo] || '';
      const userAns = savedAns.userAnswer !== undefined ? savedAns.userAnswer : null;

      // checkIsAnswerCorrect artık answerKey'i önce kontrol ediyor
      const isCorrect = userAns !== null
        ? checkIsAnswerCorrect(userAns, qObj, { ...test, answerKey: test.answerKey || questions[0]?.answerKey }, qNo)
        : null;

      return {
        questionId: qObj.id || `q_${qNo}`,
        questionNo: qNo,
        userAnswer: userAns,
        userAnswerText: textVal || savedAns.userAnswerText || null,
        isCorrect
      };
    });

    onSubmit(formattedAnswers);
  };

  const currentAnsObj = answers[currentIndex + 1] || {};
  const currentTextVal = openEndedText[currentIndex + 1] || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      {/* Header */}
      <header style={{ padding: '0.85rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ padding: '0.35rem 0.65rem', background: '#ec4899', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', color: 'white' }}>
            🖼️ GÖRSEL SINAV
          </span>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#f1f5f9' }}>{test.title}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Total Countdown Timer Badge */}
          <div style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '0.65rem',
            background: timeLeft < 300 ? '#7f1d1d' : '#0f172a',
            border: `1.5px solid ${timeLeft < 300 ? '#ef4444' : '#334155'}`,
            color: timeLeft < 300 ? '#fca5a5' : '#38bdf8',
            fontWeight: 900,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Clock size={16} color={timeLeft < 300 ? '#ef4444' : '#38bdf8'} />
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
              background: isDrawingOpen ? '#eab308' : '#334155',
              border: '1px solid #475569',
              color: isDrawingOpen ? 'white' : '#f8fafc',
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

      {/* Main Body */}
      <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        {/* Top Question Stepper & Grid */}
        <QuestionGridNav
          totalQuestions={qCount}
          currentIndex={currentIndex}
          onSelectIndex={setCurrentIndex}
          answers={answers}
        />

        {/* Question Display Card */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#818cf8' }}>
              Soru {currentIndex + 1} / {qCount}
            </h3>
            {isOpenEndedMode && (
              <span style={{ padding: '0.25rem 0.65rem', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid #6366f1', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.75rem' }}>
                ✍️ Açık Uçlu / Yazılı
              </span>
            )}
          </div>

          {/* Question Images */}
          {imageUrls.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {imageUrls.map((url, imgIdx) => (
                <StandardImageFrame
                  key={imgIdx}
                  src={url}
                  alt={`Soru ${currentIndex + 1} Görsel ${imgIdx + 1}`}
                  onOpenFullscreen={() => setLightboxSrc(url)}
                />
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', background: '#0f172a', borderRadius: '1rem', border: '1px dashed #334155', color: '#94a3b8', fontWeight: 700 }}>
              Görsel yüklenmemiş veya içerik bulunmuyor.
            </div>
          )}

          {/* Question Text / Prompt if available */}
          {activeQuestion.questionText && (
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.6 }}>
              {activeQuestion.questionText}
            </div>
          )}

          {/* Options or Text Area */}
          <div style={{ marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1px solid #334155' }}>
            {isOpenEndedMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#94a3b8' }}>
                  Cevabınızı / Yanıtınızı Detaylıca Yazınız:
                </label>
                <textarea
                  value={currentTextVal}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Cevabınızı buraya yazınız..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    background: '#0f172a',
                    border: '1.5px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem', textAlign: 'center' }}>
                  Doğru Şıkkı Seçiniz:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => {
                    const isSelected = currentAnsObj.userAnswer === optIdx;
                    return (
                      <button
                        key={opt}
                        onClick={() => handleOptionSelect(optIdx)}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          border: isSelected ? '2px solid #6366f1' : '2px solid #334155',
                          background: isSelected ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : '#1e293b',
                          color: isSelected ? '#ffffff' : '#94a3b8',
                          fontWeight: 900,
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 4px 14px rgba(79,70,229,0.35)' : 'none'
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2rem' }}>
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.85rem',
              border: '1px solid #334155',
              background: currentIndex === 0 ? '#0f172a' : '#1e293b',
              color: currentIndex === 0 ? '#475569' : '#e2e8f0',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <ChevronLeft size={18} /> Önceki Soru
          </button>

          <button
            onClick={() => setCurrentIndex(Math.min(qCount - 1, currentIndex + 1))}
            disabled={currentIndex === qCount - 1}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.85rem',
              border: 'none',
              background: currentIndex === qCount - 1 ? '#334155' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: currentIndex === qCount - 1 ? '#64748b' : '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: currentIndex === qCount - 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: currentIndex === qCount - 1 ? 'none' : '0 4px 14px rgba(99,102,241,0.35)'
            }}
          >
            Sonraki Soru <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
      <ImageLightbox isOpen={!!lightboxSrc} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
