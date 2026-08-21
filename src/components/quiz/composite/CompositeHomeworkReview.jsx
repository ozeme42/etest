import React, { useState, useMemo } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTeacherGrading } from '../hooks/useTeacherGrading';
import { useQuizPayloads } from '../hooks/useQuizPayloads';
import { normalizeUnifiedTest, normalizeUnifiedSubmission } from '../../../services/unifiedQuizAdapter';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';

import SectionTabBar from './navigation/SectionTabBar';
import MultipleChoiceReview from '../review/MultipleChoiceReview';
import OpenEndedReview from '../review/OpenEndedReview';
import OpticalBubblePanel from '../panels/OpticalBubblePanel';
import OpenEndedStatusPanel from '../panels/OpenEndedStatusPanel';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import HtmlViewerWithControls from '../../HtmlViewerWithControls';
import { ArrowLeft, Save, Award } from 'lucide-react';

/**
 * CompositeHomeworkReview
 * Standardized High-Level Review and Teacher Grading Orchestrator.
 */
export default function CompositeHomeworkReview({
  submission = {},
  test = {},
  questions = [],
  isTeacher = false,
  onClose
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  // 1. Standardize test & submission schemas
  const unifiedTest = useMemo(() => {
    return normalizeUnifiedTest(test, questions);
  }, [test, questions]);

  const rawSections = unifiedTest.sections;

  const unifiedSub = useMemo(() => {
    return normalizeUnifiedSubmission(submission, unifiedTest);
  }, [submission, unifiedTest]);

  const [activeSecIdx, setActiveSecIdx] = useState(0);
  const activeSec = rawSections[activeSecIdx] || rawSections[0] || {};

  // 2. Teacher Grading State & Save Handlers
  const {
    teacherScores,
    teacherNotes,
    overallFeedback,
    setOverallFeedback,
    handleScoreChange,
    handleNoteChange,
    saveGrading,
    isSaving
  } = useTeacherGrading({
    submission,
    test,
    sections: rawSections
  });

  // 3. Payload Loader for active section
  const { payload: activePayload } = useQuizPayloads(activeSec, test);

  const sectionAnswersMap = unifiedSub.sections;
  const currentSecAnswers = sectionAnswersMap[activeSec.id] ||
                            sectionAnswersMap[activeSecIdx] ||
                            sectionAnswersMap[String(activeSecIdx)] ||
                            (activeSec.title && sectionAnswersMap[activeSec.title]) ||
                            (activeSec.raw?.id && sectionAnswersMap[activeSec.raw.id]) ||
                            (activeSec.raw?.questionId && sectionAnswersMap[activeSec.raw.questionId]) ||
                            { answers: {}, openEndedText: {}, teacherScores: {}, teacherNotes: {} };
  const currentSecQuestions = activeSec.questions || [];

  const isSecOE = activeSec.type === 'open_ended';
  const isSecPdf = activeSec.format === 'pdf' || Boolean(activePayload && (String(activePayload).startsWith('data:application/pdf') || String(activePayload).includes('.pdf')));
  const isSecHtml = !isSecPdf && (activeSec.format === 'html' || Boolean(activePayload && (String(activePayload).includes('<!DOCTYPE') || String(activePayload).includes('<html'))));

  const handleSaveAndClose = async () => {
    await saveGrading();
    if (onClose) onClose();
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
            onClick={onClose}
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
              🔍 {unifiedTest.title || 'Sınav İncelemesi'}
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb' }}>
              Öğrenci: {unifiedSub.studentName || 'Öğrenci'} • {rawSections.length} Bölüm
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            {isTeacher ? 'Kapat' : 'Kapat & Çık'}
          </button>

          {isTeacher && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndClose}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.85rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
              }}
            >
              <Save size={15} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet'}
            </button>
          )}
        </div>
      </div>

      {/* Section Tab Bar */}
      <SectionTabBar
        sections={rawSections}
        activeSecIdx={activeSecIdx}
        onSelectSection={setActiveSecIdx}
        sectionAnswers={sectionAnswersMap}
        isReviewMode={true}
      />

      {/* Main Review Content */}
      <div style={{ flex: 1, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {isSecPdf ? (
          <QuizPanelLayout
            panelTitle={isSecOE ? 'Yazılı Değerlendirme' : 'Cevap Anahtarı'}
            panelSubtitle={activeSec.title}
            icon={isSecOE ? '✍️' : '🔍'}
            defaultPosition="right"
            defaultSize={320}
            documentContent={
              <div style={{ flex: 1, height: '100%', minHeight: 0 }}>
                <PdfViewerWithControls
                  payload={activePayload || activeSec.documentPayload || activeSec.pdfUrl}
                  id={activeSec.id}
                  testId={unifiedTest.id}
                  title={activeSec.title || 'PDF Dokümanı'}
                  height="100%"
                />
              </div>
            }
            answerContent={
              isSecOE ? (
                <OpenEndedStatusPanel
                  qCount={activeSec.qCount || 1}
                  openEndedText={currentSecAnswers.openEndedText}
                  resolvedQuestions={currentSecQuestions}
                  isReviewMode={true}
                />
              ) : (
                <OpticalBubblePanel
                  qCount={activeSec.qCount || 1}
                  answers={currentSecAnswers.answers}
                  isReviewMode={true}
                  resolvedQuestions={currentSecQuestions}
                  testCtx={activeSec.raw || activeSec}
                />
              )
            }
          />
        ) : isSecHtml ? (
          <QuizPanelLayout
            panelTitle={isSecOE ? 'Yazılı Değerlendirme' : 'Cevap Anahtarı'}
            panelSubtitle={activeSec.title}
            icon={isSecOE ? '✍️' : '🔍'}
            defaultPosition="right"
            defaultSize={320}
            documentContent={
              <div style={{ flex: 1, height: '100%', minHeight: 0 }}>
                <HtmlViewerWithControls
                  payload={activePayload || activeSec.documentPayload || activeSec.htmlPayload}
                  id={activeSec.id}
                  title={activeSec.title || 'HTML Dokümanı'}
                  height="100%"
                />
              </div>
            }
            answerContent={
              isSecOE ? (
                <OpenEndedStatusPanel
                  qCount={activeSec.qCount || 1}
                  openEndedText={currentSecAnswers.openEndedText}
                  resolvedQuestions={currentSecQuestions}
                  isReviewMode={true}
                />
              ) : (
                <OpticalBubblePanel
                  qCount={activeSec.qCount || 1}
                  answers={currentSecAnswers.answers}
                  isReviewMode={true}
                  resolvedQuestions={currentSecQuestions}
                  testCtx={activeSec.raw || activeSec}
                />
              )
            }
          />
        ) : isSecOE ? (
          <QuizPanelLayout
            panelTitle="Yazılı Puanlama"
            panelSubtitle={activeSec.title}
            icon="✍️"
            defaultPosition="right"
            defaultSize={300}
            documentContent={
              <div style={{ padding: isMobile ? '1rem' : '1.5rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {currentSecQuestions.map((q, idx) => {
                  const qNo = idx + 1;
                  const text = currentSecAnswers.openEndedText[qNo] || '';
                  const score = teacherScores[activeSec.id]?.[qNo];
                  const note = teacherNotes[activeSec.id]?.[qNo] || '';

                  return (
                    <OpenEndedReview
                      key={q.id || idx}
                      question={q}
                      qNo={qNo}
                      totalQuestions={currentSecQuestions.length}
                      imageUrls={q.images || []}
                      userAnswerText={text}
                      teacherScore={score}
                      teacherNote={note}
                      isTrulyEvaluated={unifiedSub.isEvaluated}
                      onScoreChange={(sc) => handleScoreChange(activeSec.id, qNo, sc)}
                      onNoteChange={(nt) => handleNoteChange(activeSec.id, qNo, nt)}
                      isTeacher={isTeacher}
                      isMobile={isMobile}
                    />
                  );
                })}
              </div>
            }
            answerContent={
              <OpenEndedStatusPanel
                qCount={activeSec.qCount || currentSecQuestions.length}
                openEndedText={currentSecAnswers.openEndedText}
                resolvedQuestions={currentSecQuestions}
                isReviewMode={true}
              />
            }
          />
        ) : (
          <QuizPanelLayout
            panelTitle="Soru İncelemesi"
            panelSubtitle={activeSec.title}
            icon="🔍"
            defaultPosition="right"
            defaultSize={320}
            documentContent={
              <div style={{ padding: isMobile ? '1rem' : '1.5rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {currentSecQuestions.map((q, idx) => {
                  const qNo = idx + 1;
                  const uAns = currentSecAnswers.answers[qNo] ?? currentSecAnswers.answers[String(qNo)];
                  const cAns = q.correctAnswer;
                  const isCorrect = uAns !== null && uAns !== undefined ? checkIsAnswerCorrect(uAns, q.raw || q, activeSec.raw || activeSec, qNo) : null;

                  return (
                    <MultipleChoiceReview
                      key={q.id || idx}
                      question={q}
                      qNo={qNo}
                      totalQuestions={currentSecQuestions.length}
                      imageUrls={q.images || []}
                      userAnswer={uAns}
                      correctAnswer={cAns}
                      isCorrect={isCorrect}
                      isMobile={isMobile}
                    />
                  );
                })}
              </div>
            }
            answerContent={
              <OpticalBubblePanel
                qCount={activeSec.qCount || currentSecQuestions.length}
                answers={currentSecAnswers.answers}
                isReviewMode={true}
                resolvedQuestions={currentSecQuestions}
                testCtx={activeSec.raw || activeSec}
              />
            }
          />
        )}
      </div>
    </div>
  );
}
