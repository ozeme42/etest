import React, { useState, useMemo } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useQuizState } from '../hooks/useQuizState';
import { useQuizPayloads } from '../hooks/useQuizPayloads';
import { normalizeUnifiedTest, normalizeOptionIndex } from '../../../services/unifiedQuizAdapter';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';

import SectionTabBar from './navigation/SectionTabBar';
import CompositeTopHeader from './navigation/CompositeTopHeader';
import CompositeMultipleChoiceSection from './sections/CompositeMultipleChoiceSection';
import CompositeOpenEndedSection from './sections/CompositeOpenEndedSection';
import CompositePdfSection from './sections/CompositePdfSection';
import CompositeHtmlSection from './sections/CompositeHtmlSection';
import QuizResultModal from '../modals/QuizResultModal';
import DrawingCanvas from '../common/DrawingCanvas';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

/**
 * CompositeHomeworkRunner
 * Standardized High-Level Orchestrator for all Quiz / Homework runners.
 */
export default function CompositeHomeworkRunner({
  test = {},
  questions = [],
  onSubmit,
  onAutoSave,
  draftAnswers = [],
  onExit
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  // 1. Convert any test structure into unified standard schema
  const unifiedTest = useMemo(() => {
    return normalizeUnifiedTest(test, questions);
  }, [test, questions]);

  const rawSections = unifiedTest.sections;
  const [activeSecIdx, setActiveSecIdx] = useState(0);
  const activeSec = rawSections[activeSecIdx] || rawSections[0] || {};

  // 2. Answers State & Timers
  const {
    sectionAnswers,
    timeLeft,
    handleSelectOption,
    handleTextChange,
    clearDraft
  } = useQuizState({
    testId: unifiedTest.id,
    sections: rawSections,
    draftAnswers,
    timePerQuestion: unifiedTest.timePerQuestion || 2,
    onAutoSave,
    isReviewMode: false
  });

  // 3. Payload Loader for active section
  const { payload: activePayload } = useQuizPayloads(activeSec, test);

  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [overallResultStats, setOverallResultStats] = useState(null);
  const [sectionBreakdownStats, setSectionBreakdownStats] = useState([]);
  const [submissionPayload, setSubmissionPayload] = useState([]);

  // Determine section format from unified schema
  const isSecOE = activeSec.type === 'open_ended';
  const isSecPdf = activeSec.format === 'pdf' || Boolean(activePayload && (String(activePayload).startsWith('data:application/pdf') || String(activePayload).includes('.pdf')));
  const isSecHtml = !isSecPdf && (activeSec.format === 'html' || Boolean(activePayload && (String(activePayload).includes('<!DOCTYPE') || String(activePayload).includes('<html'))));

  // Finish exam calculation
  const handleFinishExam = () => {
    let totalQuestions = 0;
    let totalScoredQuestions = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalBlank = 0;
    let totalPending = 0;
    const breakdown = [];
    const formattedAnswers = [];
    let globalNo = 1;

    rawSections.forEach((sec, secIdx) => {
      const sa = sectionAnswers[sec.id] || {};
      const secQs = sec.questions || [];
      const count = secQs.length;
      const isOE = sec.type === 'open_ended';

      let secDoğru = 0;
      let secYanlış = 0;
      let secBoş = 0;
      let secPending = 0;

      for (let i = 1; i <= count; i++) {
        totalQuestions++;
        const qObj = secQs[i - 1] || {};
        const uAns = sa.answers?.[i] ?? sa.answers?.[String(i)];
        const textVal = sa.openEndedText?.[i] ?? sa.openEndedText?.[String(i)];
        const isQOE = isOE || qObj.type === 'open_ended';

        let isCorrect = null;
        if (!isQOE && uAns !== undefined && uAns !== null && uAns !== '' && uAns !== 'empty') {
          isCorrect = checkIsAnswerCorrect(uAns, qObj.raw || qObj, sec.raw || sec, i);
        }

        if (isQOE) {
          secPending++;
          totalPending++;
        } else {
          totalScoredQuestions++;
          if (isCorrect === true) {
            secDoğru++;
            totalCorrect++;
          } else if (isCorrect === false) {
            secYanlış++;
            totalWrong++;
          } else {
            secBoş++;
            totalBlank++;
          }
        }

        formattedAnswers.push({
          questionId: qObj.id || `${sec.id}_${i}`,
          questionNo: globalNo++,
          questionNoInSection: i,
          sectionId: sec.id,
          sectionIndex: secIdx,
          sectionTitle: sec.title,
          userAnswer: isQOE ? (textVal || null) : (uAns !== undefined ? uAns : null),
          userAnswerText: textVal || null,
          textAns: textVal || null,
          isOpenEnded: isQOE,
          isCorrect,
          correctAnswer: qObj.correctAnswer
        });
      }

      breakdown.push({
        title: sec.title,
        qCount: count,
        isOE,
        secDoğru,
        secYanlış,
        secBoş,
        secPending
      });
    });

    const score = totalScoredQuestions > 0 ? Math.round((totalCorrect / totalScoredQuestions) * 100) : 0;
    const net = Math.max(0, totalCorrect - (totalWrong * 0.25));

    setOverallResultStats({
      correct: totalCorrect,
      wrong: totalWrong,
      blank: totalBlank,
      pending: totalPending,
      score,
      net,
      total: totalQuestions,
      scoredTotal: totalScoredQuestions
    });
    setSectionBreakdownStats(breakdown);
    setSubmissionPayload(formattedAnswers);
    setShowResultModal(true);
  };

  const handleConfirmClose = () => {
    clearDraft();
    setShowResultModal(false);
    if (onSubmit) onSubmit(submissionPayload, { isCloseAction: true });
  };

  const handleConfirmReview = () => {
    clearDraft();
    setShowResultModal(false);
    if (onSubmit) onSubmit(submissionPayload, { isReviewAction: true });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', color: 'var(--color-text)', overflow: 'hidden' }}>
      {/* Top Bar */}
      <CompositeTopHeader
        title={unifiedTest.title || 'Sınav'}
        isComposite={unifiedTest.isComposite}
        timeLeft={timeLeft}
        isReviewMode={false}
        isDrawingOpen={isDrawingOpen}
        onToggleDrawing={() => setIsDrawingOpen(p => !p)}
        onFinishExam={handleFinishExam}
        onExit={onExit}
      />

      {/* Section Tab Bar */}
      <SectionTabBar
        sections={rawSections}
        activeSecIdx={activeSecIdx}
        onSelectSection={setActiveSecIdx}
        sectionAnswers={sectionAnswers}
      />

      {/* Active Section Content */}
      <div style={{ flex: 1, minHeight: 0, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {isSecPdf ? (
          <CompositePdfSection
            section={{ ...activeSec, resolvedQuestions: activeSec.questions }}
            payload={activePayload || activeSec.documentPayload}
            answers={sectionAnswers[activeSec.id]?.answers || {}}
            openEndedText={sectionAnswers[activeSec.id]?.openEndedText || {}}
            isOpenEnded={isSecOE}
            onSelectOption={handleSelectOption}
            onTextChange={handleTextChange}
            isMobile={isMobile}
          />
        ) : isSecHtml ? (
          <CompositeHtmlSection
            section={{ ...activeSec, resolvedQuestions: activeSec.questions }}
            payload={activePayload || activeSec.documentPayload}
            answers={sectionAnswers[activeSec.id]?.answers || {}}
            openEndedText={sectionAnswers[activeSec.id]?.openEndedText || {}}
            isOpenEnded={isSecOE}
            onSelectOption={handleSelectOption}
            onTextChange={handleTextChange}
            isMobile={isMobile}
          />
        ) : isSecOE ? (
          <CompositeOpenEndedSection
            section={{ ...activeSec, resolvedQuestions: activeSec.questions }}
            openEndedText={sectionAnswers[activeSec.id]?.openEndedText || {}}
            onTextChange={handleTextChange}
            onOpenDrawing={() => setIsDrawingOpen(true)}
            isMobile={isMobile}
          />
        ) : (
          <CompositeMultipleChoiceSection
            section={{ ...activeSec, resolvedQuestions: activeSec.questions }}
            answers={sectionAnswers[activeSec.id]?.answers || {}}
            onSelectOption={handleSelectOption}
            onOpenDrawing={() => setIsDrawingOpen(true)}
            isMobile={isMobile}
          />
        )}

        {/* Global Drawing Pad */}
        <DrawingCanvas
          isOpen={isDrawingOpen}
          onClose={() => setIsDrawingOpen(false)}
        />
      </div>

      {/* Multi-Section Bottom Navigation Dock (if more than 1 section) */}
      {rawSections.length > 1 && (
        <div style={{
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          padding: isMobile ? '0.45rem 0.75rem' : '0.6rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.65rem',
          flexShrink: 0,
          zIndex: 50,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.03)'
        }}>
          {activeSecIdx > 0 ? (
            <button
              type="button"
              onClick={() => setActiveSecIdx(prev => Math.max(0, prev - 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: isMobile ? '0.45rem 0.75rem' : '0.55rem 1.1rem',
                borderRadius: '0.75rem',
                border: '1.5px solid var(--color-border-input)',
                background: 'var(--color-surface-hover)',
                color: 'var(--color-text)',
                fontSize: isMobile ? '0.78rem' : '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ChevronLeft size={16} />
              <span>{isMobile ? 'Önceki Bölüm' : `Önceki: ${rawSections[activeSecIdx - 1]?.title || `${activeSecIdx}. Bölüm`}`}</span>
            </button>
          ) : <div />}

          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
            {activeSecIdx + 1} / {rawSections.length}. Bölüm
          </div>

          {activeSecIdx < rawSections.length - 1 ? (
            <button
              type="button"
              onClick={() => setActiveSecIdx(prev => Math.min(rawSections.length - 1, prev + 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#ffffff',
                fontSize: isMobile ? '0.78rem' : '0.85rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{isMobile ? 'Sonraki Bölüm' : `Sonraki: ${rawSections[activeSecIdx + 1]?.title || `${activeSecIdx + 2}. Bölüm`}`}</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishExam}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#ffffff',
                fontSize: isMobile ? '0.78rem' : '0.85rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={16} />
              <span>Sınavı Tamamla</span>
            </button>
          )}
        </div>
      )}

      {/* Results Modal */}
      <QuizResultModal
        isOpen={showResultModal}
        title={unifiedTest.title || 'Sınav Sonucu'}
        stats={overallResultStats || {}}
        sectionBreakdown={sectionBreakdownStats}
        isOpenEnded={rawSections.every(s => s.type === 'open_ended')}
        test={unifiedTest}
        onClose={handleConfirmClose}
        onReview={handleConfirmReview}
      />
    </div>
  );
}
