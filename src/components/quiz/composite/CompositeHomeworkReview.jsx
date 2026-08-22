import React, { useState, useMemo } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTeacherGrading } from '../hooks/useTeacherGrading';
import { useQuizPayloads } from '../hooks/useQuizPayloads';
import { normalizeUnifiedTest, normalizeUnifiedSubmission } from '../../../services/unifiedQuizAdapter';
import { checkIsAnswerCorrect, normalizeAnswerIndex } from '../../../utils/answerEvaluation';
import { isSectionOpenEnded, isQuestionOpenEnded } from '../utils/quizTypeDetector';

import SectionTabBar from './navigation/SectionTabBar';
import MultipleChoiceReview from '../review/MultipleChoiceReview';
import OpenEndedReview from '../review/OpenEndedReview';
import OpticalBubblePanel from '../panels/OpticalBubblePanel';
import OpenEndedStatusPanel from '../panels/OpenEndedStatusPanel';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import HtmlViewerWithControls from '../../HtmlViewerWithControls';
import { useEvaluation } from '../../../context/EvaluationContext';
import { ArrowLeft, Save, Award, CheckCircle2, XCircle, HelpCircle, Clock, Trash2 } from 'lucide-react';

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
  const { deleteSubmission, deleteSubmissionsByTestId } = useEvaluation();

  const handleDeleteThisSubmission = async () => {
    if (!window.confirm(`"${unifiedTest.title || 'Bu sınav'}" sonucunu kalıcı olarak silmek istediğinizden emin misiniz?`)) return;
    try {
      const sId = submission?.id || submission?.submissionId;
      const tId = test?.id || submission?.testId || submission?.hwId;
      if (sId) await deleteSubmission(sId);
      if (tId) await deleteSubmissionsByTestId(tId);
      if (onClose) onClose();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // 1. Standardize test & submission schemas
  const unifiedTest = useMemo(() => {
    return normalizeUnifiedTest(test, questions);
  }, [test, questions]);
  const rawSections = (unifiedTest.sections && unifiedTest.sections.length > 0)
    ? unifiedTest.sections
    : (Array.isArray(test?.sections) && test.sections.length > 0 ? test.sections : (test?.tests || []));

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
  const currentSecAnswers = sectionAnswersMap[activeSecIdx] ||
                            sectionAnswersMap[String(activeSecIdx)] ||
                            sectionAnswersMap[activeSec.id] ||
                            (activeSec.raw?.id && sectionAnswersMap[activeSec.raw.id]) ||
                            (activeSec.raw?.questionId && sectionAnswersMap[activeSec.raw.questionId]) ||
                            { answers: {}, openEndedText: {}, teacherScores: {}, teacherNotes: {} };
  const currentSecQuestions = activeSec.questions || [];

  const isSecOE = activeSec.type === 'open_ended' || isSectionOpenEnded(activeSec, test);
  const isSecPdf = activeSec.format === 'pdf' || Boolean(activePayload && (String(activePayload).startsWith('data:application/pdf') || String(activePayload).includes('.pdf')));
  const isSecHtml = !isSecPdf && (activeSec.format === 'html' || Boolean(activePayload && (String(activePayload).includes('<!DOCTYPE') || String(activePayload).includes('<html'))));

  // 4. Overall stats — computed directly from raw submission data.
  //    MC sections: userAnswer vs correctAnswer per question.
  //    OE sections: teacherScores (live hook state OR DB).
  const overallStats = useMemo(() => {
    let totalQuestions = 0;
    let correctCount   = 0;
    let wrongCount     = 0;
    let blankCount     = 0;
    let pendingCount   = 0;

    const dbTS = submission?.teacherScores || {};

    rawSections.forEach((sec, sIdx) => {
      const secQs  = sec.questions || sec.resolvedQuestions || [];
      const count  = sec.qCount || secQs.length || 1;
      const rawId  = sec.raw?.id || sec.raw?.questionId || sec.id;
      const isSecOE = sec.type === 'open_ended' || isSectionOpenEnded(sec, test);

      const dbSecScores = dbTS[sec.id] || dbTS[rawId] || dbTS[String(sIdx)] || {};

      for (let i = 1; i <= count; i++) {
        totalQuestions++;
        const qObj = secQs[i - 1] || {};
        const isQOE = isSecOE || isQuestionOpenEnded(qObj, sec, test);

        const rawAnsItem = Array.isArray(submission?.answers)
          ? submission.answers.find(a =>
              (String(a.sectionId) === String(sec.id) || String(a.sectionId) === String(rawId) || Number(a.sectionIndex) === sIdx) &&
              Number(a.questionNoInSection || a.questionNo) === i
            )
          : null;

        if (isQOE) {
          // OE path: check teacher score
          const ansScore = (rawAnsItem && (rawAnsItem.evaluatedByTeacher || Boolean(rawAnsItem.evaluatedAt) || typeof rawAnsItem.score === 'number') && rawAnsItem.score !== undefined && rawAnsItem.score !== null)
            ? rawAnsItem.score
            : undefined;

          const ts =
            teacherScores[sec.id]?.[i]   ??
            teacherScores[rawId]?.[i]     ??
            teacherScores[sIdx]?.[i]      ??
            dbSecScores[i]                ??
            dbSecScores[String(i)]        ??
            ansScore;

          const sa = sectionAnswersMap[sIdx] ?? sectionAnswersMap[String(sIdx)] ?? {};
          const textVal = sa.openEndedText?.[i] ?? sa.openEndedText?.[String(i)] ?? rawAnsItem?.userAnswerText;
          const hasText = Boolean(textVal && String(textVal).trim());

          if (ts !== undefined && ts !== null && ts !== 'empty') {
            if (Number(ts) >= 5) correctCount++; else wrongCount++;
          } else if (hasText) {
            pendingCount++;  // student answered but teacher hasn't scored yet
          } else {
            blankCount++;    // student didn't answer
          }
        } else {
          // MC path: evaluate userAnswer vs correctAnswer
          const sa = sectionAnswersMap[sIdx] ?? sectionAnswersMap[String(sIdx)] ?? {};
          const rawAnsVal = sa.answers?.[i] ?? sa.answers?.[String(i)] ?? rawAnsItem?.userAnswer;

          const normalizeOpt = (v) => {
            if (v === null || v === undefined || v === '' || v === 'empty') return null;
            if (typeof v === 'number') return v;
            const s = String(v).trim().toUpperCase();
            const m = { A: 0, B: 1, C: 2, D: 3, E: 4 };
            if (m[s] !== undefined) return m[s];
            const n = Number(s);
            return isNaN(n) ? null : n;
          };

          const u = normalizeOpt(rawAnsVal);
          if (u === null) {
            blankCount++;
          } else {
            let isCorr = null;
            if (qObj && Object.keys(qObj).length > 0) {
              isCorr = checkIsAnswerCorrect(u, qObj.raw || qObj, sec.raw || sec, i);
            }
            if (isCorr === null && rawAnsItem && typeof rawAnsItem.isCorrect === 'boolean') {
              isCorr = rawAnsItem.isCorrect;
            }
            if (isCorr === false) wrongCount++;
            else correctCount++;
          }
        }
      }
    });

    const scorePct = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;
    const rawNet   = Math.max(0, correctCount - wrongCount * 0.25);
    const netScore = Number.isInteger(rawNet) ? rawNet : rawNet.toFixed(2);

    return { total: totalQuestions, correct: correctCount, wrong: wrongCount, blank: blankCount, pending: pendingCount, scorePct, netScore };
  }, [submission, rawSections, sectionAnswersMap, teacherScores, test]);

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
        padding: isMobile ? '0.75rem 1rem' : '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
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
            title="Geri Dön"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 900, color: '#0f172a' }}>
              🔍 {unifiedTest.title || 'Sınav İncelemesi'}
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb' }}>
              Öğrenci: {unifiedSub.studentName || 'Öğrenci'} • {rawSections.length} Bölüm ({overallStats.total} Soru)
            </span>
          </div>
        </div>

        {/* Right: Informative Metric Pills & Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          {/* Doğru Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '0.35rem 0.7rem',
            borderRadius: '0.65rem',
            background: '#f0fdf4',
            border: '1px solid #86efac',
            color: '#15803d',
            fontWeight: 900,
            fontSize: '0.82rem'
          }}>
            <CheckCircle2 size={15} color="#16a34a" />
            <span>{overallStats.correct} Doğru</span>
          </div>

          {/* Yanlış Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '0.35rem 0.7rem',
            borderRadius: '0.65rem',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            fontWeight: 900,
            fontSize: '0.82rem'
          }}>
            <XCircle size={15} color="#ef4444" />
            <span>{overallStats.wrong} Yanlış</span>
          </div>

          {/* Boş Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '0.35rem 0.7rem',
            borderRadius: '0.65rem',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#475569',
            fontWeight: 800,
            fontSize: '0.82rem'
          }}>
            <HelpCircle size={15} color="#64748b" />
            <span>{overallStats.blank} Boş</span>
          </div>

          {/* Başarı & Net Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '0.35rem 0.75rem',
            borderRadius: '0.65rem',
            background: '#eff6ff',
            border: '1px solid #93c5fd',
            color: '#1d4ed8',
            fontWeight: 900,
            fontSize: '0.82rem'
          }}>
            <Award size={15} color="#2563eb" />
            <span>%{overallStats.scorePct} Başarı (Net: {overallStats.netScore})</span>
          </div>

          {/* Değerlendirmede / Bekleyen Soru Pill */}
          {overallStats.pending > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '0.35rem 0.75rem',
              borderRadius: '0.65rem',
              background: '#faf5ff',
              border: '1.5px solid #ddd6fe',
              color: '#7c3aed',
              fontWeight: 900,
              fontSize: '0.82rem'
            }}>
              <Clock size={15} color="#8b5cf6" />
              <span>{overallStats.pending} Değerlendirmede</span>
            </div>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.55rem 1.15rem',
              borderRadius: '0.75rem',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              marginLeft: '0.25rem'
            }}
          >
            {isTeacher ? 'Kapat' : 'Kapat / Çık'}
          </button>

          {isTeacher && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndClose}
              style={{
                padding: '0.55rem 1.15rem',
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
                  const isBlank = uAns === null || uAns === undefined || uAns === '' || uAns === 'empty';
                  const isCorrect = isBlank ? null : checkIsAnswerCorrect(uAns, q.raw || q, activeSec.raw || activeSec, qNo);

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
