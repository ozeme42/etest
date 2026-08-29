import React, { useState, useMemo, useEffect } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTheme } from '../../../context/ThemeContext';
import MultipleChoiceRunner from '../runner/MultipleChoiceRunner';
import OpticalBubblePanel from '../panels/OpticalBubblePanel';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import QuizResultModal from '../modals/QuizResultModal';
import DrawingCanvas from '../common/DrawingCanvas';
import { extractImageUrls, isValidImageUrl, normalizeImageUrl } from '../common/ImageLightbox';
import { normalizeUnifiedTest, normalizeOptionIndex } from '../../../services/unifiedQuizAdapter';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import {
  Clock, Send, ArrowLeft, Sun, Moon, ChevronLeft, ChevronRight,
  Check, LayoutList, Square, Pencil, Sparkles, BookOpen, Layers, CheckCircle2
} from 'lucide-react';

export default function SingleMultipleChoiceRunner({
  test = {},
  questions = [],
  onSubmit,
  onAutoSave,
  draftAnswers = [],
  onExit
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { isDark, toggleTheme } = useTheme();
  const draftKey = `draft_single_mc_${test.id || 'test'}`;

  const [activeQIdx, setActiveQIdx] = useState(0);
  const [viewMode, setViewMode] = useState('single');
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const unifiedTest = useMemo(() => {
    const rawWithQs = {
      ...test,
      resolvedQuestions: (questions && questions.length > 0) ? questions : test.resolvedQuestions,
      questions: (questions && questions.length > 0) ? questions : test.questions
    };
    return normalizeUnifiedTest(rawWithQs, []);
  }, [test, questions]);

  const activeQuestions = (unifiedTest.sections[0]?.questions && unifiedTest.sections[0].questions.length > 0)
    ? unifiedTest.sections[0].questions
    : ((questions && questions.length > 0) ? questions : [test]);
  const totalQuestions = activeQuestions.length || 1;

  const getQImages = (q, idx) => {
    if (q?.imageUrl && isValidImageUrl(q.imageUrl)) return [normalizeImageUrl(q.imageUrl)];
    if (q?.contentPayload && isValidImageUrl(q.contentPayload)) return [normalizeImageUrl(q.contentPayload)];
    const extracted = extractImageUrls(q);
    if (extracted.length > 0) {
      if (typeof idx === 'number' && extracted.length > 1 && extracted[idx]) return [extracted[idx]];
      return [extracted[0]];
    }
    const testImgs = extractImageUrls(test);
    if (testImgs.length > 0) {
      if (typeof idx === 'number' && testImgs[idx]) return [testImgs[idx]];
      if (idx === 0) return [testImgs[0]];
    }
    return [];
  };

  const [answers, setAnswers] = useState(() => {
    const init = {};
    if (draftAnswers && draftAnswers.length > 0) {
      draftAnswers.forEach((a, idx) => {
        const qNo = Number(a.questionNoInSection || a.questionNo || (idx + 1));
        if (a.userAnswer !== null && a.userAnswer !== undefined && a.userAnswer !== '' && a.userAnswer !== 'empty') {
          const uVal = typeof a.userAnswer === 'object' ? a.userAnswer.userAnswer : a.userAnswer;
          const normOpt = normalizeOptionIndex(uVal);
          if (normOpt !== null) {
            init[qNo] = normOpt;
            init[String(qNo)] = normOpt;
          }
        }
      });
      return init;
    }
    try {
      const saved = localStorage.getItem(`${draftKey}_ans`) || 
                    (test.id ? localStorage.getItem(`draft_quiz_${test.id}_ans`) : null);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [showResultModal, setShowResultModal] = useState(false);
  const [resultStats, setResultStats] = useState(null);
  const [submissionPayload, setSubmissionPayload] = useState([]);
  const saveTimeoutRef = React.useRef(null);

  const triggerAutoSave = React.useCallback((currentAnswers) => {
    if (!onAutoSave) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const formatted = activeQuestions.map((q, idx) => {
        const num = idx + 1;
        return {
          questionId: q.id || `q_${num}`,
          questionNo: num,
          questionNoInSection: num,
          userAnswer: currentAnswers[num] ?? currentAnswers[String(num)] ?? null,
          isOpenEnded: false
        };
      });
      onAutoSave(formatted);
    }, 800);
  }, [onAutoSave, activeQuestions]);

  const handleSelectOption = (qNo, optIdx) => {
    setAnswers(prev => {
      const updated = { ...prev };
      const currentVal = updated[qNo] ?? updated[String(qNo)];
      if (currentVal === optIdx) {
        delete updated[qNo];
        delete updated[String(qNo)];
      } else {
        updated[qNo] = optIdx;
        updated[String(qNo)] = optIdx;
      }
      try {
        localStorage.setItem(`${draftKey}_ans`, JSON.stringify(updated));
        if (test.id) localStorage.setItem(`draft_quiz_${test.id}_ans`, JSON.stringify(updated));
      } catch {}
      triggerAutoSave(updated);
      return updated;
    });
  };

  const handleFinishExam = () => {
    let cCount = 0;
    let wCount = 0;
    let bCount = 0;

    const formattedAnswers = activeQuestions.map((q, idx) => {
      const qNo = idx + 1;
      const userOpt = answers[qNo] ?? answers[String(qNo)];
      const hasAns = userOpt !== null && userOpt !== undefined && userOpt !== 'empty';

      let isCorr = null;
      if (hasAns) {
        isCorr = checkIsAnswerCorrect(userOpt, q.raw || q, test.raw || test, qNo);
        if (isCorr === true) cCount++;
        else wCount++;
      } else {
        bCount++;
      }

      return {
        questionId: q.id || `q_${qNo}`,
        questionNo: qNo,
        questionNoInSection: qNo,
        userAnswer: hasAns ? userOpt : null,
        isCorrect: isCorr,
        score: isCorr === true ? 100 : 0,
        isOpenEnded: false
      };
    });

    const scorePct = totalQuestions > 0 ? Math.round((cCount / totalQuestions) * 100) : 0;
    const rawNet = Math.max(0, cCount - (wCount * 0.25));

    setResultStats({
      correct: cCount,
      wrong: wCount,
      blank: bCount,
      score: scorePct,
      net: Number.isInteger(rawNet) ? rawNet : rawNet.toFixed(2),
      totalQuestions: totalQuestions
    });

    setSubmissionPayload(formattedAnswers);
    setShowResultModal(true);
  };

  const handleConfirmClose = () => {
    setShowResultModal(false);
    try {
      localStorage.removeItem(`${draftKey}_ans`);
    } catch {}
    if (onSubmit) onSubmit(submissionPayload, { isReviewAction: false });
  };

  const handleConfirmReview = () => {
    setShowResultModal(false);
    if (onSubmit) onSubmit(submissionPayload, { isReviewAction: true });
  };

  const answeredCount = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== null && answers[k] !== '' && answers[k] !== 'empty').length;
  const progressPct = Math.round((answeredCount / totalQuestions) * 100);
  const activeQuestion = activeQuestions[activeQIdx] || activeQuestions[0] || {};
  const testSubject = test.subject || activeQuestion.subject || 'Ders';

  return (
    <div style={{ minHeight: '100%', width: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', background: 'var(--color-bg, #f8fafc)', color: 'var(--color-text, #0f172a)', position: 'relative' }}>
      
      {/* ── TOP HEADER ── */}
      <div style={{
        background: isDark ? 'rgba(30, 41, 59, 0.95)' : '#ffffff',
        borderBottom: '1.5px solid var(--color-border)',
        padding: isMobile ? '0.6rem 0.85rem' : '0.85rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.6rem' : '0.85rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={onExit}
            style={{
              padding: isMobile ? '0.45rem' : '0.55rem',
              borderRadius: '0.75rem',
              border: '1.5px solid var(--color-border-input)',
              background: 'var(--color-surface-hover)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text)',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}
            title="Sınavdan Çık"
          >
            <ArrowLeft size={isMobile ? 18 : 20} />
          </button>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.15rem', fontWeight: 900, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {unifiedTest.title || 'Çoktan Seçmeli Test'}
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: 2 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', color: '#6366f1', padding: '1px 7px', borderRadius: 99, border: '1px solid rgba(99,102,241,0.3)' }}>
                {testSubject}
              </span>
              <span style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                • {answeredCount}/{totalQuestions} Yanıtlandı (%{progressPct})
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.65rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '0.75rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1.5px solid rgba(16, 185, 129, 0.35)',
            color: '#10b981',
            fontWeight: 900,
            fontSize: isMobile ? '0.78rem' : '0.85rem'
          }}>
            <Clock size={15} />
            <span>{formatTime(secondsElapsed)}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsDrawingOpen(prev => !prev)}
            style={{
              padding: isMobile ? '0.45rem 0.7rem' : '0.5rem 0.95rem',
              borderRadius: '0.75rem',
              border: `1.5px solid ${isDrawingOpen ? '#6366f1' : 'var(--color-border-input)'}`,
              background: isDrawingOpen ? 'rgba(99,102,241,0.15)' : 'var(--color-surface-hover)',
              color: isDrawingOpen ? '#6366f1' : 'var(--color-text)',
              fontWeight: 800,
              fontSize: isMobile ? '0.78rem' : '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Pencil size={15} />
            <span>{isMobile ? 'Çizim' : 'Karalama Tahtası'}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: '0.75rem',
              border: '1.5px solid var(--color-border-input)',
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Temayı Değiştir"
          >
            {isDark ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#6366f1" />}
          </button>

          <button
            type="button"
            onClick={handleFinishExam}
            style={{
              padding: isMobile ? '0.5rem 0.95rem' : '0.55rem 1.35rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: isMobile ? '0.82rem' : '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Send size={15} />
            <span>{isMobile ? 'Bitir' : 'Sınavı Bitir ve Gönder'}</span>
          </button>
        </div>
      </div>

      <div style={{ width: '100%', height: '4px', background: 'rgba(99,102,241,0.1)', overflow: 'hidden' }}>
        <div style={{
          width: `${progressPct}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #6366f1, #10b981)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Main Layout */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <QuizPanelLayout
          panelTitle="Optik Cevap Kağıdı"
          panelSubtitle="İşaretlemeler anlık kaydedilir"
          icon="📋"
          defaultPosition="right"
          defaultSize={320}
          defaultOpenOnMobile={false}
          documentContent={
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--color-bg)' }}>
              {/* Question navigator */}
              <div style={{
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                padding: isMobile ? '0.45rem 0.75rem' : '0.6rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.65rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  overflowX: 'auto',
                  padding: '0.15rem 0',
                  flex: 1,
                  justifyContent: isMobile ? 'flex-start' : 'center'
                }}>
                  {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNo) => {
                    const isCurrent = activeQIdx === qNo - 1;
                    const isAnswered = answers[qNo] !== null && answers[qNo] !== undefined && answers[qNo] !== 'empty';

                    let bBg = 'var(--color-surface-hover)';
                    let bBorder = '1.5px solid var(--color-border-input)';
                    let bColor = 'var(--color-text-muted)';

                    if (isCurrent) {
                      bBg = 'linear-gradient(135deg, #6366f1, #4f46e5)';
                      bBorder = '2px solid #6366f1';
                      bColor = '#ffffff';
                    } else if (isAnswered) {
                      bBg = 'rgba(16, 185, 129, 0.15)';
                      bBorder = '1.5px solid #10b981';
                      bColor = '#10b981';
                    }

                    return (
                      <button
                        key={qNo}
                        type="button"
                        onClick={() => {
                          setActiveQIdx(qNo - 1);
                          if (viewMode === 'list') {
                            document.getElementById(`q-card-${qNo}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        style={{
                          width: isMobile ? '30px' : '34px',
                          height: isMobile ? '30px' : '34px',
                          borderRadius: '0.65rem',
                          border: bBorder,
                          background: bBg,
                          color: bColor,
                          fontWeight: 900,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: isCurrent ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Soru ${qNo}'e Geç`}
                      >
                        {isAnswered && !isCurrent ? <Check size={14} strokeWidth={3} /> : qNo}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setViewMode(prev => prev === 'single' ? 'list' : 'single')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '0.6rem',
                      border: '1.5px solid var(--color-border)',
                      background: 'var(--color-surface-hover)',
                      color: 'var(--color-text)',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    title={viewMode === 'single' ? 'Tüm Soruları Liste Halinde Göster' : 'Tek Tek Sırayla Göster'}
                  >
                    {viewMode === 'single' ? <LayoutList size={14} color="#6366f1" /> : <Square size={14} color="#6366f1" />}
                    <span>{isMobile ? '' : (viewMode === 'single' ? 'Tüm Liste' : 'Tek Soru')}</span>
                  </button>
                </div>
              </div>

              {/* Main Questions View */}
              <div style={{ padding: isMobile ? '0.85rem 0.75rem' : '1.5rem 2rem', overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {viewMode === 'single' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                    <MultipleChoiceRunner
                      key={activeQuestion.id || activeQIdx}
                      question={activeQuestion}
                      qNo={activeQIdx + 1}
                      totalQuestions={totalQuestions}
                      imageUrls={getQImages(activeQuestion, activeQIdx)}
                      selectedOption={answers[activeQIdx + 1]}
                      onSelectOption={(optIdx) => handleSelectOption(activeQIdx + 1, optIdx)}
                      onOpenDrawing={() => setIsDrawingOpen(true)}
                      isMobile={isMobile}
                    />

                    {/* Stepper Footer */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--color-surface)',
                      border: '1.5px solid var(--color-border)',
                      borderRadius: '1.15rem',
                      padding: isMobile ? '0.75rem 1rem' : '0.9rem 1.5rem',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                    }}>
                      <button
                        type="button"
                        disabled={activeQIdx === 0}
                        onClick={() => setActiveQIdx(prev => Math.max(0, prev - 1))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: isMobile ? '0.55rem 0.95rem' : '0.65rem 1.35rem',
                          borderRadius: '0.85rem',
                          border: '1.5px solid var(--color-border-input)',
                          background: activeQIdx === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                          color: activeQIdx === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                          fontSize: isMobile ? '0.82rem' : '0.88rem',
                          fontWeight: 800,
                          cursor: activeQIdx === 0 ? 'not-allowed' : 'pointer',
                          opacity: activeQIdx === 0 ? 0.45 : 1,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <ChevronLeft size={17} />
                        <span>Önceki Soru</span>
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#6366f1' }}>
                          {activeQIdx + 1} / {totalQuestions}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                          Soru İlerlemesi
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={activeQIdx >= totalQuestions - 1}
                        onClick={() => setActiveQIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: isMobile ? '0.55rem 1rem' : '0.65rem 1.45rem',
                          borderRadius: '0.85rem',
                          border: 'none',
                          background: activeQIdx >= totalQuestions - 1 ? 'var(--color-surface-hover)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                          color: activeQIdx >= totalQuestions - 1 ? 'var(--color-text-muted)' : '#ffffff',
                          fontSize: isMobile ? '0.82rem' : '0.88rem',
                          fontWeight: 900,
                          cursor: activeQIdx >= totalQuestions - 1 ? 'not-allowed' : 'pointer',
                          opacity: activeQIdx >= totalQuestions - 1 ? 0.45 : 1,
                          boxShadow: activeQIdx >= totalQuestions - 1 ? 'none' : '0 4px 14px rgba(79,70,229,0.35)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>Sonraki Soru</span>
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </div>
                ) : (
                  activeQuestions.map((q, idx) => (
                    <div key={idx} id={`q-card-${idx + 1}`}>
                      <MultipleChoiceRunner
                        question={q}
                        qNo={idx + 1}
                        totalQuestions={totalQuestions}
                        imageUrls={getQImages(q, idx)}
                        selectedOption={answers[idx + 1]}
                        onSelectOption={(optIdx) => handleSelectOption(idx + 1, optIdx)}
                        onOpenDrawing={() => setIsDrawingOpen(true)}
                        isMobile={isMobile}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          }
          answerContent={
            <OpticalBubblePanel
              qCount={totalQuestions}
              answers={answers}
              onSelectOption={(qNo, optIdx) => {
                setActiveQIdx(qNo - 1);
                handleSelectOption(qNo, optIdx);
              }}
              resolvedQuestions={activeQuestions}
            />
          }
        />

        <DrawingCanvas
          isOpen={isDrawingOpen}
          onClose={() => setIsDrawingOpen(false)}
        />
      </div>

      <QuizResultModal
        isOpen={showResultModal}
        title={unifiedTest.title || 'Çoktan Seçmeli Test Sonucu'}
        stats={resultStats || {}}
        isOpenEnded={false}
        onClose={handleConfirmClose}
        onReview={handleConfirmReview}
      />
    </div>
  );
}
