import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTheme } from '../../../context/ThemeContext';
import OpenEndedRunner from '../runner/OpenEndedRunner';
import OpenEndedStatusPanel from '../panels/OpenEndedStatusPanel';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import QuizResultModal from '../modals/QuizResultModal';
import DrawingCanvas from '../common/DrawingCanvas';
import { idbGetPayload } from '../../../services/indexedDbService';
import { Clock, Send, ArrowLeft, Pencil, ChevronLeft, ChevronRight, Check, LayoutList, Square } from 'lucide-react';

/**
 * SingleOpenEndedRunner
 * Dedicated, isolated runner strictly for Single Open-Ended (Written) assignments.
 * Contains Question Texts + Images + Textarea + Drawing Pad. Zero optical bubbles.
 */
export default function SingleOpenEndedRunner({
  test = {},
  questions = [],
  onSubmit,
  onAutoSave,
  draftAnswers = [],
  onExit
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { isDark } = useTheme();
  const draftKey = `draft_single_oe_${test.id || 'test'}`;

  const [activeQIdx, setActiveQIdx] = useState(0);
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'list'

  // 1. Text Answers State
  const [openEndedText, setOpenEndedText] = useState(() => {
    const init = {};
    if (draftAnswers && draftAnswers.length > 0) {
      draftAnswers.forEach(a => {
        const qNo = a.questionNoInSection || a.questionNo;
        if (qNo && a.userAnswerText) {
          init[qNo] = a.userAnswerText;
        }
      });
      return init;
    }
    try {
      const saved = localStorage.getItem(`${draftKey}_txt`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [idbPayloadMap, setIdbPayloadMap] = useState({});
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [submissionPayload, setSubmissionPayload] = useState([]);
  const saveTimeoutRef = useRef(null);

  const totalQuestions = questions.length || test.questionCount || 1;

  // Load IndexedDB question images
  useEffect(() => {
    let isMounted = true;
    async function loadIdbImages() {
      const payloadMap = {};
      for (const q of questions) {
        if (q?.id && (q.imageUrl === '[STORED_IN_INDEXEDDB]' || q.contentPayload === '[STORED_IN_INDEXEDDB]' || !q.imageUrl)) {
          try {
            const val = await idbGetPayload(q.id);
            if (val && val !== '[STORED_IN_INDEXEDDB]' && isMounted) {
              payloadMap[q.id] = val;
            }
          } catch (e) {}
        }
      }
      if (test?.id && (!test.contentPayload || test.contentPayload === '[STORED_IN_INDEXEDDB]' || !test.imageUrl)) {
        try {
          const val = await idbGetPayload(test.id);
          if (val && val !== '[STORED_IN_INDEXEDDB]' && isMounted) {
            payloadMap[test.id] = val;
          }
        } catch (e) {}
      }
      if (isMounted) setIdbPayloadMap(payloadMap);
    }
    loadIdbImages();
    return () => { isMounted = false; };
  }, [questions, test]);

  const triggerAutoSave = React.useCallback((currentTextMap) => {
    if (!onAutoSave) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const formatted = questions.map((q, idx) => {
        const num = idx + 1;
        const txt = currentTextMap[num] ?? null;
        return {
          questionId: q.id || `q_${num}`,
          questionNo: num,
          questionNoInSection: num,
          userAnswer: txt,
          userAnswerText: txt,
          textAns: txt,
          isOpenEnded: true
        };
      });
      onAutoSave(formatted);
    }, 800);
  }, [onAutoSave, questions]);

  const handleTextChange = (qNo, val) => {
    setOpenEndedText(prev => {
      const next = { ...prev, [qNo]: val };
      try {
        localStorage.setItem(`${draftKey}_txt`, JSON.stringify(next));
      } catch {}
      triggerAutoSave(next);
      return next;
    });
  };

  const handleFinishExam = () => {
    const formatted = questions.map((q, idx) => {
      const num = idx + 1;
      const txt = openEndedText[num] ?? '';
      return {
        questionId: q.id || `q_${num}`,
        questionNo: num,
        questionNoInSection: num,
        userAnswer: txt,
        userAnswerText: txt,
        textAns: txt,
        isOpenEnded: true,
        score: null,
        isCorrect: null,
        evaluatedByTeacher: false
      };
    });

    setSubmissionPayload(formatted);
    setShowResultModal(true);
  };

  const handleConfirmClose = () => {
    setShowResultModal(false);
    try {
      localStorage.removeItem(`${draftKey}_txt`);
    } catch {}
    if (onSubmit) onSubmit(submissionPayload, { isReviewAction: false });
  };

  const handleConfirmReview = () => {
    setShowResultModal(false);
    if (onSubmit) onSubmit(submissionPayload, { isReviewAction: true });
  };

  const answeredCount = Object.values(openEndedText).filter(v => typeof v === 'string' && v.trim() !== '').length;

  const getQuestionImages = (q, idx) => {
    const qImage = idbPayloadMap[q?.id] || idbPayloadMap[test.id] || q?.imageUrl || (Array.isArray(q?.imageUrls) ? q.imageUrls[0] : null);
    const qImgs = [];
    if (qImage) qImgs.push(qImage);
    if (Array.isArray(q?.imageUrls)) qImgs.push(...q.imageUrls);
    if (Array.isArray(q?.images)) qImgs.push(...q.images);
    return qImgs;
  };

  const activeQuestion = questions[activeQIdx] || questions[0] || {};
  const activeQImages = getQuestionImages(activeQuestion, activeQIdx);

  return (
    <div style={{ minHeight: '100%', width: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Top Header */}
      <div style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.65rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem', minWidth: 0 }}>
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
              flexShrink: 0
            }}
            title="Geri Dön"
          >
            <ArrowLeft size={isMobile ? 18 : 20} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? '0.92rem' : '1.1rem', fontWeight: 900, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {test.title || 'Açık Uçlu (Yazılı) Sınav'}
            </h3>
            <span style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 800, color: '#d97706' }}>
              ✍️ Açık Uçlu / Yazılı • {totalQuestions} Soru
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.65rem' }}>
          <button
            type="button"
            onClick={() => setIsDrawingOpen(prev => !prev)}
            style={{
              padding: isMobile ? '0.45rem 0.7rem' : '0.55rem 1rem',
              borderRadius: '0.75rem',
              border: `1.5px solid ${isDrawingOpen ? '#6366f1' : 'var(--color-border-input)'}`,
              background: isDrawingOpen ? 'rgba(99,102,241,0.12)' : 'var(--color-surface-hover)',
              color: isDrawingOpen ? '#4f46e5' : 'var(--color-text)',
              fontWeight: 800,
              fontSize: isMobile ? '0.78rem' : '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Pencil size={15} />
            <span>{isMobile ? 'Çizim' : 'Çizim Tahtası'}</span>
          </button>

          <button
            type="button"
            onClick={handleFinishExam}
            style={{
              padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1.25rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: isMobile ? '0.82rem' : '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Send size={15} />
            <span>{isMobile ? 'Bitir' : 'Sınavı Bitir ve Gönder'}</span>
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <QuizPanelLayout
          panelTitle="Yazılı Yanıtlar"
          panelSubtitle="Soru Listesi"
          icon="✍️"
          defaultPosition="right"
          defaultSize={300}
          defaultOpenOnMobile={false}
          documentContent={
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--color-bg)' }}>
              {/* ── TOP QUESTION NAVIGATOR STRIP ── */}
              <div style={{
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                padding: isMobile ? '0.45rem 0.65rem' : '0.55rem 1.15rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.65rem',
                zIndex: 10,
                flexShrink: 0
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                  <b style={{ color: '#7c3aed' }}>{activeQIdx + 1}</b> / {totalQuestions} Soru • <span style={{ color: answeredCount === totalQuestions ? '#10b981' : 'var(--color-text-muted)' }}>{answeredCount} Yanıtlandı</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  padding: '0.1rem 0',
                  flex: 1,
                  justifyContent: isMobile ? 'flex-start' : 'center'
                }}>
                  {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNo) => {
                    const isCurrent = activeQIdx === qNo - 1;
                    const isAnswered = typeof openEndedText[qNo] === 'string' && openEndedText[qNo].trim() !== '';

                    let bBg = 'var(--color-surface-hover)';
                    let bBorder = '1px solid var(--color-border-input)';
                    let bColor = 'var(--color-text-muted)';

                    if (isCurrent) {
                      bBg = 'linear-gradient(135deg, #7c3aed, #6366f1)';
                      bBorder = '2px solid #7c3aed';
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
                          width: isMobile ? '28px' : '30px',
                          height: isMobile ? '28px' : '30px',
                          borderRadius: '50%',
                          border: bBorder,
                          background: bBg,
                          color: bColor,
                          fontWeight: 900,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: isCurrent ? '0 2px 8px rgba(124,58,237,0.35)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Soru ${qNo}'e Geç`}
                      >
                        {isAnswered && !isCurrent ? <Check size={13} strokeWidth={3} /> : qNo}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setViewMode(prev => prev === 'single' ? 'list' : 'single')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-hover)',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    title={viewMode === 'single' ? 'Tüm Soruları Liste Halinde Göster' : 'Tek Tek Sırayla Göster'}
                  >
                    {viewMode === 'single' ? <LayoutList size={13} /> : <Square size={13} />}
                    <span>{isMobile ? '' : (viewMode === 'single' ? 'Tüm Liste' : 'Tek Soru')}</span>
                  </button>
                </div>
              </div>

              {/* ── MAIN CONTENT ── */}
              <div style={{ padding: isMobile ? '0.75rem 0.65rem' : '1.25rem 1.5rem', overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {viewMode === 'single' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <OpenEndedRunner
                      key={activeQuestion.id || activeQIdx}
                      question={{ ...activeQuestion, imageUrl: activeQImages[0] || activeQuestion.imageUrl }}
                      imageUrls={activeQImages}
                      qNo={activeQIdx + 1}
                      totalQuestions={totalQuestions}
                      value={openEndedText[activeQIdx + 1] || ''}
                      onChange={(val) => handleTextChange(activeQIdx + 1, val)}
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
                      borderRadius: '1rem',
                      padding: isMobile ? '0.6rem 0.75rem' : '0.75rem 1.25rem',
                      marginTop: '0.25rem'
                    }}>
                      <button
                        type="button"
                        disabled={activeQIdx === 0}
                        onClick={() => setActiveQIdx(prev => Math.max(0, prev - 1))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: isMobile ? '0.45rem 0.75rem' : '0.55rem 1.1rem',
                          borderRadius: '0.7rem',
                          border: '1.5px solid var(--color-border-input)',
                          background: activeQIdx === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                          color: activeQIdx === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                          fontSize: isMobile ? '0.78rem' : '0.85rem',
                          fontWeight: 800,
                          cursor: activeQIdx === 0 ? 'not-allowed' : 'pointer',
                          opacity: activeQIdx === 0 ? 0.5 : 1,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <ChevronLeft size={16} />
                        <span>Önceki Soru</span>
                      </button>

                      <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                        {activeQIdx + 1} / {totalQuestions}
                      </div>

                      <button
                        type="button"
                        disabled={activeQIdx >= totalQuestions - 1}
                        onClick={() => setActiveQIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1.2rem',
                          borderRadius: '0.7rem',
                          border: 'none',
                          background: activeQIdx >= totalQuestions - 1 ? 'var(--color-surface-hover)' : 'linear-gradient(135deg, #7c3aed, #6366f1)',
                          color: activeQIdx >= totalQuestions - 1 ? 'var(--color-text-muted)' : '#ffffff',
                          fontSize: isMobile ? '0.78rem' : '0.85rem',
                          fontWeight: 900,
                          cursor: activeQIdx >= totalQuestions - 1 ? 'not-allowed' : 'pointer',
                          opacity: activeQIdx >= totalQuestions - 1 ? 0.5 : 1,
                          boxShadow: activeQIdx >= totalQuestions - 1 ? 'none' : '0 2px 8px rgba(124,58,237,0.3)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>Sonraki Soru</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  questions.map((q, idx) => {
                    const qImgs = getQuestionImages(q, idx);
                    return (
                      <div key={idx} id={`q-card-${idx + 1}`}>
                        <OpenEndedRunner
                          question={{ ...q, imageUrl: qImgs[0] || q.imageUrl }}
                          imageUrls={qImgs}
                          qNo={idx + 1}
                          totalQuestions={totalQuestions}
                          value={openEndedText[idx + 1] || ''}
                          onChange={(val) => handleTextChange(idx + 1, val)}
                          onOpenDrawing={() => setIsDrawingOpen(true)}
                          isMobile={isMobile}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          }
          answerContent={
            <OpenEndedStatusPanel
              qCount={totalQuestions}
              openEndedText={openEndedText}
              resolvedQuestions={questions}
              onSelectQuestion={(qNo) => {
                setActiveQIdx(qNo - 1);
                setViewMode('single');
              }}
            />
          }
        />

        {/* Global Drawing Pad */}
        <DrawingCanvas
          isOpen={isDrawingOpen}
          onClose={() => setIsDrawingOpen(false)}
        />
      </div>

      {/* Result Modal */}
      {showResultModal && (
        <QuizResultModal
          isOpen={showResultModal}
          isOpenEnded={true}
          onClose={() => setShowResultModal(false)}
          onConfirmClose={handleConfirmClose}
          onConfirmReview={handleConfirmReview}
          test={test}
          submission={{
            ...test,
            answers: submissionPayload,
            score: 0,
            correctCount: 0,
            wrongCount: 0,
            blankCount: submissionPayload.filter(a => !a.userAnswerText).length,
            totalQuestions,
            isOpenEnded: true,
            isEvaluated: false
          }}
        />
      )}
    </div>
  );
}
