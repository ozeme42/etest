import React, { useState, useMemo } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTheme } from '../../../context/ThemeContext';
import MultipleChoiceRunner from '../runner/MultipleChoiceRunner';
import OpticalBubblePanel from '../panels/OpticalBubblePanel';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import QuizResultModal from '../modals/QuizResultModal';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { Clock, Send, ArrowLeft, Sun, Moon } from 'lucide-react';

/**
 * SingleMultipleChoiceRunner
 * Dedicated, isolated runner strictly for Single Multiple-Choice assignments.
 */
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

  // 1. Answers State
  const [answers, setAnswers] = useState(() => {
    const init = {};
    if (draftAnswers && draftAnswers.length > 0) {
      draftAnswers.forEach(a => {
        const qNo = a.questionNoInSection || a.questionNo;
        if (qNo && a.userAnswer !== null && a.userAnswer !== undefined) {
          init[qNo] = typeof a.userAnswer === 'object' ? a.userAnswer.userAnswer : a.userAnswer;
        }
      });
      return init;
    }
    try {
      const saved = localStorage.getItem(`${draftKey}_ans`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [showResultModal, setShowResultModal] = useState(false);
  const [resultStats, setResultStats] = useState(null);
  const [submissionPayload, setSubmissionPayload] = useState([]);
  const saveTimeoutRef = React.useRef(null);

  const totalQuestions = questions.length || test.questionCount || 1;

  const triggerAutoSave = React.useCallback((currentAnswers) => {
    if (!onAutoSave) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const formatted = questions.map((q, idx) => {
        const num = idx + 1;
        return {
          questionId: q.id || `q_${num}`,
          questionNo: num,
          questionNoInSection: num,
          userAnswer: currentAnswers[num] ?? null,
          isOpenEnded: false
        };
      });
      onAutoSave(formatted);
    }, 800);
  }, [onAutoSave, questions]);

  const handleSelectOption = (qNo, optIdx) => {
    setAnswers(prev => {
      const updated = { ...prev };
      if (updated[qNo] === optIdx) {
        delete updated[qNo];
      } else {
        updated[qNo] = optIdx;
      }
      try { localStorage.setItem(`${draftKey}_ans`, JSON.stringify(updated)); } catch {}
      triggerAutoSave(updated);
      return updated;
    });
  };

  const handleFinishExam = () => {
    let correct = 0;
    let wrong = 0;
    let blank = 0;

    const formatted = questions.map((q, idx) => {
      const qNo = idx + 1;
      const uAns = answers[qNo];
      const hasAns = uAns !== undefined && uAns !== null && uAns !== '';
      const isCorrect = hasAns ? checkIsAnswerCorrect(uAns, q, test, qNo) : null;

      if (isCorrect === true) correct++;
      else if (hasAns) wrong++;
      else blank++;

      return {
        questionId: q.id || `q_${qNo}`,
        questionNo: qNo,
        questionNoInSection: qNo,
        userAnswer: hasAns ? uAns : null,
        isOpenEnded: false,
        isCorrect,
        correctAnswer: q.correctAnswer
      };
    });

    const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const net = Math.max(0, correct - (wrong * 0.25));

    setResultStats({ correct, wrong, blank, score, net, total: totalQuestions });
    setSubmissionPayload(formatted);
    setShowResultModal(true);
  };

  const handleConfirmClose = () => {
    try { localStorage.removeItem(`${draftKey}_ans`); } catch {}
    setShowResultModal(false);
    if (onSubmit) onSubmit(submissionPayload, { isCloseAction: true });
  };

  const handleConfirmReview = () => {
    try { localStorage.removeItem(`${draftKey}_ans`); } catch {}
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
              {test.title || 'Çoktan Seçmeli Test'}
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb' }}>
              🔘 Çoktan Seçmeli • {totalQuestions} Soru
            </span>
          </div>
        </div>

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

      {/* Main Layout */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <QuizPanelLayout
          panelTitle="Optik Form"
          panelSubtitle="Cevap Kağıdı"
          icon="📋"
          defaultPosition="right"
          defaultSize={320}
          defaultOpenOnMobile={false}
          documentContent={
            <div style={{ padding: isMobile ? '1rem' : '1.5rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {questions.map((q, idx) => (
                <MultipleChoiceRunner
                  key={q.id || idx}
                  question={q}
                  qNo={idx + 1}
                  totalQuestions={totalQuestions}
                  selectedOption={answers[idx + 1]}
                  onSelectOption={(optIdx) => handleSelectOption(idx + 1, optIdx)}
                  isMobile={isMobile}
                />
              ))}
            </div>
          }
          answerContent={
            <OpticalBubblePanel
              qCount={totalQuestions}
              answers={answers}
              onSelectOption={handleSelectOption}
              resolvedQuestions={questions}
            />
          }
        />
      </div>

      {/* Result Modal */}
      <QuizResultModal
        isOpen={showResultModal}
        title={test.title || 'Çoktan Seçmeli Test Sonucu'}
        stats={resultStats || {}}
        isOpenEnded={false}
        onClose={handleConfirmClose}
        onReview={handleConfirmReview}
      />
    </div>
  );
}
