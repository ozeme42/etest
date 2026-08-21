import React, { useState, useMemo } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useQuizState } from '../hooks/useQuizState';
import { useQuizPayloads } from '../hooks/useQuizPayloads';
import { isSectionOpenEnded, isQuestionOpenEnded } from '../utils/quizTypeDetector';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { resolveTestQuestions } from '../../../utils/testResolver';

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
 * Clean, modular high-level orchestrator for Composite Multi-Section Homeworks.
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

  // 1. Build standardized sections array
  const rawSections = useMemo(() => {
    if (Array.isArray(test.sections) && test.sections.length > 0) {
      return test.sections.map((s, idx) => {
        const bankQ = s.bankQ || {};
        return {
          ...bankQ,
          ...s,
          id: s.id || s.questionId || bankQ.id || `sec_${idx + 1}`,
          title: s.title || s.name || bankQ.title || bankQ.name || `${idx + 1}. Bölüm`,
          resolvedQuestions: s.resolvedQuestions || resolveTestQuestions(s) || resolveTestQuestions(bankQ),
          qCount: s.qCount || s.questionCount || bankQ.questionCount || (s.resolvedQuestions?.length || 1),
          pdfPayload: s.pdfPayload || bankQ.pdfPayload || s.contentPayload || bankQ.contentPayload,
          contentPayload: s.contentPayload || bankQ.contentPayload || s.pdfPayload || bankQ.pdfPayload,
          pdfUrl: s.pdfUrl || bankQ.pdfUrl,
          htmlPayload: s.htmlPayload || bankQ.htmlPayload,
          contentType: s.contentType || bankQ.contentType
        };
      });
    }
    return [{
      id: test.id || 'sec_1',
      title: test.title || '1. Bölüm',
      resolvedQuestions: questions.length > 0 ? questions : resolveTestQuestions(test),
      qCount: questions.length || test.questionCount || 1,
      pdfPayload: test.pdfPayload || test.contentPayload,
      contentPayload: test.contentPayload || test.pdfPayload,
      pdfUrl: test.pdfUrl,
      htmlPayload: test.htmlPayload,
      contentType: test.contentType,
      ...test
    }];
  }, [test, questions]);

  const [activeSecIdx, setActiveSecIdx] = useState(0);
  const activeSec = rawSections[activeSecIdx] || rawSections[0];

  // 2. Answers State & Timers
  const {
    sectionAnswers,
    timeLeft,
    handleSelectOption,
    handleTextChange,
    clearDraft
  } = useQuizState({
    testId: test.id,
    sections: rawSections,
    draftAnswers,
    timePerQuestion: test.timePerQuestion || 2,
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

  // Determine section format
  const isSecOE = isSectionOpenEnded(activeSec, test);
  const isSecPdf = Boolean(activeSec.contentType === 'pdf' || activeSec.pdfUrl || (activePayload && typeof activePayload === 'string' && (activePayload.startsWith('data:application/pdf') || activePayload.includes('.pdf'))));
  const isSecHtml = !isSecPdf && Boolean(activeSec.contentType === 'html' || activeSec.htmlPayload || (activePayload && typeof activePayload === 'string' && (activePayload.includes('<!DOCTYPE') || activePayload.includes('<html'))));

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

    rawSections.forEach((sec) => {
      const sa = sectionAnswers[sec.id] || {};
      const secQs = sec.resolvedQuestions || [];
      const count = sec.qCount || secQs.length || 1;
      const isOE = isSectionOpenEnded(sec, test);

      let secDoğru = 0;
      let secYanlış = 0;
      let secBoş = 0;

      for (let i = 1; i <= count; i++) {
        totalQuestions++;
        totalMax += 10;
        const qObj = secQs[i - 1] || {};
        const uAns = sa.answers?.[i];
        const textVal = sa.openEndedText?.[i];
        const isQOE = isOE || isQuestionOpenEnded(qObj, sec, test, { userAnswerText: textVal });

        let isCorrect = null;
        if (!isQOE && uAns !== undefined && uAns !== null && uAns !== '') {
          isCorrect = checkIsAnswerCorrect(uAns, qObj, sec, i);
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
        title={test.title || 'Birleşik Ödev'}
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
            section={activeSec}
            payload={activePayload}
            answers={sectionAnswers[activeSec.id]?.answers || {}}
            openEndedText={sectionAnswers[activeSec.id]?.openEndedText || {}}
            isOpenEnded={isSecOE}
            onSelectOption={handleSelectOption}
            isMobile={isMobile}
          />
        ) : isSecHtml ? (
          <CompositeHtmlSection
            section={activeSec}
            payload={activePayload}
            answers={sectionAnswers[activeSec.id]?.answers || {}}
            openEndedText={sectionAnswers[activeSec.id]?.openEndedText || {}}
            isOpenEnded={isSecOE}
            onSelectOption={handleSelectOption}
            isMobile={isMobile}
          />
        ) : isSecOE ? (
          <CompositeOpenEndedSection
            section={activeSec}
            openEndedText={sectionAnswers[activeSec.id]?.openEndedText || {}}
            onTextChange={handleTextChange}
            onOpenDrawing={() => setIsDrawingOpen(true)}
            isMobile={isMobile}
          />
        ) : (
          <CompositeMultipleChoiceSection
            section={activeSec}
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
        title={test.title || 'Birleşik Ödev Sonucu'}
        stats={overallResultStats || {}}
        sectionBreakdown={sectionBreakdownStats}
        onClose={handleConfirmClose}
        onReview={handleConfirmReview}
      />
    </div>
  );
}
