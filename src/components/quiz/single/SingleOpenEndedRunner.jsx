import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTheme } from '../../../context/ThemeContext';
import OpenEndedRunner from '../runner/OpenEndedRunner';
import OpenEndedStatusPanel from '../panels/OpenEndedStatusPanel';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import QuizResultModal from '../modals/QuizResultModal';
import DrawingCanvas from '../common/DrawingCanvas';
import { idbGetPayload } from '../../../services/indexedDbService';
import { Clock, Send, ArrowLeft, Pencil } from 'lucide-react';

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
      const updated = { ...prev, [qNo]: val };
      try { localStorage.setItem(`${draftKey}_txt`, JSON.stringify(updated)); } catch {}
      triggerAutoSave(updated);
      return updated;
    });
  };

  const handleFinishExam = () => {
    const formatted = questions.map((q, idx) => {
      const num = idx + 1;
      const txt = openEndedText[num] ?? null;
      return {
        questionId: q.id || `q_${num}`,
        questionNo: num,
        questionNoInSection: num,
        userAnswer: txt,
        userAnswerText: txt,
        textAns: txt,
        score: 0,
        isCorrect: null,
        evalStatus: txt ? 'pending' : 'empty',
        isOpenEnded: true
      };
    });

    setSubmissionPayload(formatted);
    setShowResultModal(true);
  };

  const handleConfirmClose = () => {
    try { localStorage.removeItem(`${draftKey}_txt`); } catch {}
    setShowResultModal(false);
    if (onSubmit) onSubmit(submissionPayload, { isCloseAction: true });
  };

  const handleConfirmReview = () => {
    try { localStorage.removeItem(`${draftKey}_txt`); } catch {}
    setShowResultModal(false);
    if (onSubmit) onSubmit(submissionPayload, { isReviewAction: true });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Top Header */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onExit}
            style={{
              padding: '0.45rem',
              borderRadius: '0.6rem',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#475569'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
              {test.title || 'Açık Uçlu (Yazılı) Sınav'}
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706' }}>
              ✍️ Açık Uçlu / Klasik • {totalQuestions} Soru
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setIsDrawingOpen(prev => !prev)}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '0.75rem',
              border: '1.5px solid #cbd5e1',
              background: isDrawingOpen ? '#eff6ff' : '#ffffff',
              color: isDrawingOpen ? '#2563eb' : '#334155',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Pencil size={15} /> Çizim Tahtası
          </button>

          <button
            type="button"
            onClick={handleFinishExam}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(22,163,74,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Send size={15} /> Sınavı Bitir ve Gönder
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
            <div style={{ padding: isMobile ? '1rem' : '1.5rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {questions.map((q, idx) => {
                const qImage = idbPayloadMap[q.id] || idbPayloadMap[test.id] || q.imageUrl || (Array.isArray(q.imageUrls) ? q.imageUrls[0] : null);
                return (
                  <OpenEndedRunner
                    key={q.id || idx}
                    question={{ ...q, imageUrl: qImage || q.imageUrl }}
                    qNo={idx + 1}
                    totalQuestions={totalQuestions}
                    value={openEndedText[idx + 1] || ''}
                    onChange={(val) => handleTextChange(idx + 1, val)}
                    onOpenDrawing={() => setIsDrawingOpen(true)}
                    isMobile={isMobile}
                  />
                );
              })}
            </div>
          }
          answerContent={
            <OpenEndedStatusPanel
              qCount={totalQuestions}
              openEndedText={openEndedText}
              resolvedQuestions={questions}
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
