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
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalBlank = 0;
    let totalQuestions = 0;
    let totalEarned = 0;
    let totalMax = 0;

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

      for (let i = 1; i <= count; i++) {
        totalQuestions++;
        totalMax += 10;
        const qObj = secQs[i - 1] || {};
        const uAns = sa.answers?.[i] ?? sa.answers?.[String(i)];
        const textVal = sa.openEndedText?.[i] ?? sa.openEndedText?.[String(i)];
        const isQOE = isOE || qObj.type === 'open_ended';

        let isCorrect = null;
        if (!isQOE && uAns !== undefined && uAns !== null && uAns !== '' && uAns !== 'empty') {
          isCorrect = checkIsAnswerCorrect(uAns, qObj.raw || qObj, sec.raw || sec, i);
        }

        if (isCorrect === true) {
          secDoğru++;
          totalCorrect++;
          totalEarned += 10;
        } else if (isCorrect === false) {
          secYanlış++;
          totalWrong++;
        } else {
          secBoş++;
          totalBlank++;
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
        secBoş
      });
    });

    const score = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
    const net = Math.max(0, totalCorrect - (totalWrong * 0.25));

    setOverallResultStats({ correct: totalCorrect, wrong: totalWrong, blank: totalBlank, score, net, total: totalQuestions });
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Top Bar */}
      <CompositeTopHeader
        title={unifiedTest.title || 'Sınav'}
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
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
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
            isMobile={isMobile}
          />
        )}

        {/* Global Drawing Pad */}
        <DrawingCanvas
          isOpen={isDrawingOpen}
          onClose={() => setIsDrawingOpen(false)}
        />
      </div>

      {/* Results Modal */}
      <QuizResultModal
        isOpen={showResultModal}
        title={unifiedTest.title || 'Sınav Sonucu'}
        stats={overallResultStats || {}}
        sectionBreakdown={sectionBreakdownStats}
        onClose={handleConfirmClose}
        onReview={handleConfirmReview}
      />
    </div>
  );
}
