import React, { useState, useMemo } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTeacherGrading } from '../hooks/useTeacherGrading';
import { useQuizPayloads } from '../hooks/useQuizPayloads';
import { isSectionOpenEnded, isQuestionOpenEnded } from '../utils/quizTypeDetector';
import { resolveTestQuestions } from '../../../utils/testResolver';
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
 * Clean, modular review and teacher grading orchestrator for Composite Homeworks.
 */
export default function CompositeHomeworkReview({
  submission = {},
  test = {},
  questions = [],
  isTeacher = false,
  onClose
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

  // 4. Map answers per section for quick lookup
  const sectionAnswersMap = useMemo(() => {
    const map = {};
    rawSections.forEach(s => {
      map[s.id] = { answers: {}, openEndedText: {} };
    });

    const rawAns = submission.answers || submission.formattedAnswers || submission.raw_data?.answers || [];
    if (Array.isArray(rawAns)) {
      rawAns.forEach((a, idx) => {
        // 1. Match section by ID, question ID, or sectionIndex
        let matchedSec = null;
        if (a.sectionId) {
          matchedSec = rawSections.find(s =>
            String(s.id) === String(a.sectionId) ||
            String(s.questionId) === String(a.sectionId) ||
            String(s.bankQ?.id) === String(a.sectionId) ||
            String(s.id).replace(/^q_|^hw_|^sec_/, '') === String(a.sectionId).replace(/^q_|^hw_|^sec_/, '')
          );
        }
        if (!matchedSec && a.questionId) {
          matchedSec = rawSections.find(s =>
            s.resolvedQuestions?.some(q => String(q.id) === String(a.questionId)) ||
            s.questions?.some(q => String(q.id) === String(a.questionId))
          );
        }
        if (!matchedSec && a.sectionIndex !== undefined && rawSections[a.sectionIndex]) {
          matchedSec = rawSections[a.sectionIndex];
        }
        if (!matchedSec) {
          matchedSec = rawSections[0];
        }

        const sId = matchedSec?.id || rawSections[0]?.id || 'sec_1';
        const qNo = Number(a.questionNoInSection || a.questionNo || (idx + 1));
        if (!map[sId]) map[sId] = { answers: {}, openEndedText: {} };

        if (a.userAnswer !== null && a.userAnswer !== undefined && a.userAnswer !== '' && a.userAnswer !== 'empty') {
          const uVal = typeof a.userAnswer === 'object' ? a.userAnswer.userAnswer : a.userAnswer;
          map[sId].answers[qNo] = uVal;
          map[sId].answers[String(qNo)] = uVal;
        }
        const textVal = a.userAnswerText || a.user_answer_text || a.textAns || (typeof a.userAnswer === 'string' ? a.userAnswer : null);
        if (textVal) {
          const strText = typeof textVal === 'string' ? textVal : (textVal.text || textVal.userAnswerText || '');
          map[sId].openEndedText[qNo] = strText;
          map[sId].openEndedText[String(qNo)] = strText;
        }
      });
    }
    return map;
  }, [rawSections, submission]);

  const isSecOE = isSectionOpenEnded(activeSec, test);
  const isSecPdf = Boolean(activeSec.contentType === 'pdf' || activeSec.pdfUrl || (activePayload && typeof activePayload === 'string' && (activePayload.startsWith('data:application/pdf') || activePayload.includes('.pdf'))));
  const isSecHtml = !isSecPdf && Boolean(activeSec.contentType === 'html' || activeSec.htmlPayload || (activePayload && typeof activePayload === 'string' && (activePayload.includes('<!DOCTYPE') || activePayload.includes('<html'))));

  const currentSecQuestions = activeSec.resolvedQuestions || [];
  const currentSecAnswers = sectionAnswersMap[activeSec.id] || { answers: {}, openEndedText: {} };

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
              🔍 {test.title || 'Birleşik Ödev İncelemesi'}
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb' }}>
              Öğrenci: {submission.studentName || 'Öğrenci'} • {rawSections.length} Bölüm
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
      <div style={{ flex: 1, minHeight: 0 }}>
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
                  payload={activePayload || activeSec.pdfUrl || activeSec.contentPayload || activeSec.pdfPayload}
                  id={activeSec.id || activeSec.testId}
                  testId={activeSec.testId || activeSec.sourceTestId || activeSec.originalTestId}
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
                />
              ) : (
                <OpticalBubblePanel
                  qCount={activeSec.qCount || 1}
                  answers={currentSecAnswers.answers}
                  isReviewMode={true}
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
                  payload={activePayload || activeSec.htmlPayload || activeSec.contentPayload}
                  id={activeSec.id || activeSec.questionId}
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
                />
              ) : (
                <OpticalBubblePanel
                  qCount={activeSec.qCount || 1}
                  answers={currentSecAnswers.answers}
                  isReviewMode={true}
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

                  const qImages = [];
                  if (Array.isArray(q.imageUrls) && q.imageUrls.length > 0) qImages.push(...q.imageUrls);
                  if (q.imageUrl) qImages.push(q.imageUrl);
                  if (q.contentPayload) qImages.push(q.contentPayload);
                  if (qImages.length === 0) {
                    if (Array.isArray(activeSec.imageUrls) && activeSec.imageUrls[idx]) qImages.push(activeSec.imageUrls[idx]);
                    else if (activeSec.imageUrl) qImages.push(activeSec.imageUrl);
                  }

                  return (
                    <OpenEndedReview
                      key={q.id || idx}
                      question={q}
                      qNo={qNo}
                      totalQuestions={currentSecQuestions.length}
                      imageUrls={qImages}
                      userAnswerText={text}
                      teacherScore={score}
                      teacherNote={note}
                      isTrulyEvaluated={submission.isEvaluatedByTeacher === true || submission.status === 'evaluated'}
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
                  const cAns = q.correctAnswer ?? q.answer ?? q.correctOption;
                  const isCorrect = uAns !== null && uAns !== undefined ? checkIsAnswerCorrect(uAns, q, activeSec, qNo) : null;

                  const qImages = [];
                  if (Array.isArray(q.imageUrls) && q.imageUrls.length > 0) qImages.push(...q.imageUrls);
                  if (q.imageUrl) qImages.push(q.imageUrl);
                  if (q.contentPayload) qImages.push(q.contentPayload);
                  if (qImages.length === 0) {
                    if (Array.isArray(activeSec.imageUrls) && activeSec.imageUrls[idx]) qImages.push(activeSec.imageUrls[idx]);
                    else if (activeSec.imageUrl) qImages.push(activeSec.imageUrl);
                  }

                  return (
                    <MultipleChoiceReview
                      key={q.id || idx}
                      question={q}
                      qNo={qNo}
                      totalQuestions={currentSecQuestions.length}
                      imageUrls={qImages}
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
              />
            }
          />
        )}
      </div>
    </div>
  );
}
