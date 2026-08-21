import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useQuestionBank } from '../../../context/QuestionBankContext';
import { resolveTestQuestions } from '../../../utils/testResolver';
import { idbGetPayload } from '../../../services/indexedDbService';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Sun, Moon } from 'lucide-react';

export default function ImageQuizRunner({ test, questions: initialQuestions, onAutoSave, onSubmit, studentId }) {
  const { isDark, toggleTheme } = useTheme();
  const { tests: globalTests } = useQuestionBank();

  // Resolve questions if not fully populated
  const questions = useMemo(() => {
    return resolveTestQuestions(test, initialQuestions, globalTests);
  }, [test, initialQuestions, globalTests]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [openEndedText, setOpenEndedText] = useState({});
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [idbPayload, setIdbPayload] = useState(null);

  const draftKey = useMemo(() => {
    return `quiz_draft_${test.id || 'unassigned'}_${studentId || 'anon'}`;
  }, [test.id, studentId]);

  // Load IndexedDB payload if needed
  useEffect(() => {
    let isMounted = true;
    async function checkIdb() {
      const rawIds = [
        test.id,
        test.testId,
        test.homeworkId,
        test.sourceTestId,
        ...(test.questionIds || []),
        ...(test.selectedQuestions || []),
        ...(questions || []).map(q => q.id),
        ...(questions || []).map(q => q.questionId)
      ];

      const idsToTry = [];
      rawIds.forEach(id => {
        if (!id) return;
        const strId = typeof id === 'object' ? (id.id || id.questionId) : String(id);
        if (strId) {
          idsToTry.push(strId);
          idsToTry.push(strId.replace(/^q_?/, ''));
          idsToTry.push(strId.replace(/^hw_?/, ''));
          idsToTry.push(strId.replace(/^hw_?/, 'q_'));
          idsToTry.push(`q_${strId.replace(/^q_?|^hw_?/, '')}`);
          idsToTry.push(`hw_${strId.replace(/^q_?|^hw_?/, '')}`);
        }
      });

      const uniqueIds = [...new Set(idsToTry)];
      for (const candidate of uniqueIds) {
        try {
          const payload = await idbGetPayload(candidate);
          if (isMounted && payload && payload.length > 50 && !payload.includes('[STORED_IN_INDEXEDDB]')) {
            setIdbPayload(payload);
            return;
          }
        } catch (err) {}
      }
    }
    checkIdb();
    return () => { isMounted = false; };
  }, [test, questions]);

  // Load draft answers from localStorage
  useEffect(() => {
    try {
      const savedAns = localStorage.getItem(`${draftKey}_ans`);
      if (savedAns) {
        setAnswers(JSON.parse(savedAns));
      }
      const savedTxt = localStorage.getItem(`${draftKey}_txt`);
      if (savedTxt) {
        setOpenEndedText(JSON.parse(savedTxt));
      }
    } catch {}
  }, [draftKey]);

  // Get all image URLs
  const allImageUrls = useMemo(() => {
    let urls = [];
    const getObjUrls = (obj) => {
      if (!obj) return [];
      const list = [];
      if (Array.isArray(obj.imageUrls)) {
        obj.imageUrls.forEach(u => {
          if (typeof u === 'string' && u && !u.includes('[STORED_IN_INDEXEDDB]')) {
            if (u.includes('\n\n') || u.includes('\n') || u.includes('|')) {
              list.push(...u.split(/\n\n|\n|\|/).map(s => s.trim()).filter(Boolean));
            } else {
              list.push(u);
            }
          }
        });
      }
      if (obj.imageUrl && typeof obj.imageUrl === 'string' && !obj.imageUrl.includes('[STORED_IN_INDEXEDDB]')) {
        list.push(obj.imageUrl);
      }
      if (obj.contentPayload && typeof obj.contentPayload === 'string' && !obj.contentPayload.includes('[STORED_IN_INDEXEDDB]')) {
        if (obj.contentPayload.includes('\n\n') || obj.contentPayload.includes('\n') || obj.contentPayload.includes('|')) {
          list.push(...obj.contentPayload.split(/\n\n|\n|\|/).map(s => s.trim()).filter(Boolean));
        } else if (obj.contentPayload.startsWith('data:image') || obj.contentPayload.startsWith('http') || obj.contentPayload.length > 50) {
          list.push(obj.contentPayload);
        }
      }
      return list;
    };

    if (questions && questions.length > 0) {
      questions.forEach(q => {
        urls.push(...getObjUrls(q));
      });
    }
    if (urls.length === 0) {
      urls.push(...getObjUrls(test));
    }
    if (idbPayload) {
      if (idbPayload.includes('\n\n') || idbPayload.includes('\n') || idbPayload.includes('|')) {
        urls.push(...idbPayload.split(/\n\n|\n|\|/).map(s => s.trim()).filter(Boolean));
      } else if (idbPayload.startsWith('http') || idbPayload.startsWith('data:image') || idbPayload.length > 50) {
        urls.push(idbPayload);
      }
    }

    return Array.from(new Set(urls.filter(isValidImageUrl)));
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
      (Array.isArray(test.answerKey) && test.answerKey.length > 0 && !test.isOpenEnded && test.questionType !== 'acik_uclu' && test.questionType !== 'gorsel_klasik' && test.type !== 'acik_uclu' && test.type !== 'gorsel_klasik')
    ) {
      return false;
    }

    if (
      test.questionType === 'acik_uclu' ||
      test.questionType === 'yazili' ||
      test.questionType === 'gorsel_klasik' ||
      test.type === 'acik_uclu' ||
      test.type === 'yazili' ||
      test.type === 'gorsel_klasik' ||
      test.contentType === 'acik_uclu' ||
      test.contentType === 'yazili' ||
      test.contentType === 'gorsel_klasik' ||
      test.isOpenEnded
    ) {
      return true;
    }

    const titleStr = String(test.title || test.name || '').toLowerCase();
    if (titleStr && (
      titleStr.includes('açık uçlu') ||
      titleStr.includes('acik uclu') ||
      titleStr.includes('yazılı') ||
      titleStr.includes('yazili') ||
      titleStr.includes('klasik')
    )) {
      return true;
    }

    if (activeQuestion) {
      if (
        activeQuestion.type === 'acik_uclu' ||
        activeQuestion.type === 'yazili' ||
        activeQuestion.type === 'gorsel_klasik' ||
        activeQuestion.questionType === 'acik_uclu' ||
        activeQuestion.questionType === 'yazili' ||
        activeQuestion.questionType === 'gorsel_klasik' ||
        activeQuestion.contentType === 'acik_uclu' ||
        activeQuestion.contentType === 'yazili' ||
        activeQuestion.contentType === 'gorsel_klasik' ||
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
    if (allImageUrls.length > 0) {
      const url = allImageUrls[currentIndex] || allImageUrls[0];
      return url ? [url] : [];
    }
    if (activeQuestion.imageUrls && Array.isArray(activeQuestion.imageUrls) && activeQuestion.imageUrls.length > 0) {
      const firstValid = activeQuestion.imageUrls.find(isValidImageUrl);
      return firstValid ? [firstValid] : [];
    }
    return activeImageUrl ? [activeImageUrl].filter(isValidImageUrl) : [];
  }, [activeQuestion, allImageUrls, currentIndex, activeImageUrl]);

  const handleOptionSelect = (optionIdx) => {
    setAnswers(prev => {
      const currentAns = prev[currentIndex + 1]?.userAnswer;
      const nextOpt = currentAns === optionIdx ? null : optionIdx;

      const updated = { ...prev };
      if (nextOpt === null) {
        delete updated[currentIndex + 1];
      } else {
        updated[currentIndex + 1] = {
          questionId: activeQuestion.id || `q_${currentIndex + 1}`,
          userAnswer: nextOpt,
          isCorrect: activeQuestion.correctAnswer !== undefined ? nextOpt === activeQuestion.correctAnswer : null
        };
      }

      // Format current Answers properly for triggerAutoSave
      const simplifiedAnswers = {};
      Object.keys(updated).forEach(k => {
        if (updated[k]?.userAnswer !== null && updated[k]?.userAnswer !== undefined) {
          simplifiedAnswers[k] = updated[k].userAnswer;
        }
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
    const formatted = [];
    for (let i = 0; i < qCount; i++) {
      const qNo = i + 1;
      const qObj = questions[i] || questions[0] || {};
      const userAnsObj = answers[qNo];
      const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
      const textAns = openEndedText[qNo];

      let isCorrect = null;
      if (userAns !== undefined && userAns !== null) {
        if (qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
          isCorrect = Number(userAns) === Number(qObj.correctAnswer);
        }
      }

      formatted.push({
        questionId: qObj.id || `q${qNo}`,
        questionNo: qNo,
        userAnswer: userAns !== undefined ? userAns : null,
        userAnswerText: textAns || null,
        isCorrect,
        correctAnswer: qObj.correctAnswer !== undefined ? qObj.correctAnswer : null
      });
    }

    try {
      localStorage.removeItem(`${draftKey}_ans`);
      localStorage.removeItem(`${draftKey}_txt`);
      localStorage.removeItem(`${draftKey}_time`);
    } catch {}

    onSubmit(formatted);
  };

  const currentAnswer = answers[currentIndex + 1]?.userAnswer;
  const currentTextAnswer = openEndedText[currentIndex + 1] || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', overflow: 'hidden' }}>
      
      {/* ── Header ── */}
      <header style={{ padding: '0.65rem 1.25rem', background: 'var(--color-surface)', borderBottom: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span style={{ padding: '0.28rem 0.6rem', background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '0.4rem', fontWeight: 900, fontSize: '0.7rem', color: 'white' }}>
            🖼️ GÖRSEL TEST
          </span>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 900, margin: 0, color: 'var(--color-text)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test.title || test.name}</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
            Soru {currentIndex + 1} / {qCount}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
            style={{
              padding: '0.32rem 0.65rem',
              borderRadius: '0.5rem',
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border-input)',
              color: 'var(--color-text)',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'all 0.15s ease'
            }}
          >
            {isDark ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#6366f1" />}
            <span>{isDark ? 'Açık' : 'Koyu'}</span>
          </button>

          <div style={{ padding: '0.32rem 0.75rem', borderRadius: '0.5rem', background: timeLeft < 300 ? (isDark ? 'rgba(220, 38, 38, 0.2)' : '#fef2f2') : 'var(--color-surface-hover)', color: timeLeft < 300 ? '#dc2626' : 'var(--color-text)', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: `1.5px solid ${timeLeft < 300 ? '#fecaca' : 'var(--color-border-input)'}` }}>
            <Clock size={14} color={timeLeft < 300 ? '#dc2626' : '#059669'} /> {formatTime(timeLeft)}
          </div>
          <button onClick={handleSubmit} style={{ padding: '0.4rem 1rem', borderRadius: '0.55rem', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 3px 10px rgba(16,185,129,0.25)' }}>
            <CheckCircle2 size={16} /> Testi Bitir
          </button>
        </div>
      </header>

      {/* ── Main Content Split ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        
        {/* Left Side: Question Image Viewer */}
        <div style={{ flex: 1, minWidth: 0, background: 'var(--color-bg)', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '1rem' }}>
          <ImageLightbox isOpen={Boolean(lightboxSrc)} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
          
          {imageUrls.length > 0 ? (
            imageUrls.map((url, idx) => (
              <StandardImageFrame key={idx} src={url} alt={`Soru ${currentIndex + 1}`} onOpenFullscreen={() => setLightboxSrc(url)} />
            ))
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '2px dashed var(--color-border)', borderRadius: '1rem', background: 'var(--color-surface)', maxWidth: '400px' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🖼️</span>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text)' }}>Görsel Yüklenemedi</h4>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Bu soruya ait görsel içerik bulunamadı veya henüz yüklenmedi.</p>
            </div>
          )}
        </div>

        {/* Right Side: Answer Form / Optical Bubble Bar */}
        <div style={{ width: '360px', flexShrink: 0, background: 'var(--color-surface)', borderLeft: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Question Grid Bar */}
          <div style={{ padding: '1rem', borderBottom: '1.5px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-text-secondary)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sorular ({qCount})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.35rem', maxHeight: '110px', overflowY: 'auto', paddingRight: '0.2rem' }}>
              {Array.from({ length: qCount }).map((_, idx) => {
                const qNum = idx + 1;
                const isCurrent = idx === currentIndex;
                const hasAns = answers[qNum] !== undefined || openEndedText[qNum];
                return (
                  <button
                    key={qNum}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      height: '32px',
                      borderRadius: '0.45rem',
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      border: isCurrent ? '2px solid #6366f1' : (hasAns ? '1.5px solid #10b981' : '1px solid var(--color-border-input)'),
                      background: isCurrent ? '#6366f1' : (hasAns ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5') : 'var(--color-surface)'),
                      color: isCurrent ? 'white' : (hasAns ? '#10b981' : 'var(--color-text)')
                    }}
                  >
                    {qNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Question Input Card */}
          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>
                Soru {currentIndex + 1}
              </span>
              {isOpenEndedMode && (
                <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(124, 58, 237, 0.15)', color: '#a855f7', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 800 }}>✍️ Açık Uçlu</span>
              )}
            </div>

            {isOpenEndedMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                  ✍️ Yanıtınızı Giriniz:
                </label>
                <textarea
                  value={currentTextAnswer}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Soru ${currentIndex + 1} için yanıtınızı buraya yazınız...`}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.65rem',
                    border: '1.5px solid var(--color-border-input)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                  Seçeneğinizi İşaretleyiniz:
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => {
                    const isSelected = currentAnswer === optIdx;
                    return (
                      <button
                        key={opt}
                        onClick={() => handleOptionSelect(optIdx)}
                        style={{
                          flex: 1,
                          height: '46px',
                          borderRadius: '0.6rem',
                          border: isSelected ? '2px solid #2563eb' : '1.5px solid var(--color-border-input)',
                          background: isSelected ? '#2563eb' : 'var(--color-surface-hover)',
                          color: isSelected ? 'white' : 'var(--color-text)',
                          fontWeight: 900,
                          fontSize: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
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

          {/* Bottom Navigation */}
          <div style={{ padding: '0.85rem 1.25rem', borderTop: '1.5px solid var(--color-border)', background: 'var(--color-surface-hover)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
              disabled={currentIndex === 0}
              style={{
                flex: 1,
                padding: '0.55rem',
                borderRadius: '0.55rem',
                background: currentIndex === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                border: '1.5px solid var(--color-border-input)',
                color: currentIndex === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: currentIndex === 0 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem'
              }}
            >
              <ChevronLeft size={16} /> Önceki
            </button>
            <button
              onClick={() => setCurrentIndex(p => Math.min(qCount - 1, p + 1))}
              disabled={currentIndex === qCount - 1}
              style={{
                flex: 1,
                padding: '0.55rem',
                borderRadius: '0.55rem',
                background: currentIndex === qCount - 1 ? 'var(--color-surface-hover)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: currentIndex === qCount - 1 ? '1.5px solid var(--color-border-input)' : 'none',
                color: currentIndex === qCount - 1 ? 'var(--color-text-muted)' : 'white',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: currentIndex === qCount - 1 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem'
              }}
            >
              Sonraki <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
