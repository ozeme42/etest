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
import { ArrowLeft, Save, Award, CheckCircle2, XCircle, HelpCircle, Clock, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [viewMode, setViewMode] = useState('single');
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
    // If submission is already evaluated and stored direct counts, and no live hook edits:
    const hasLiveEdits = Object.values(teacherScores).some(sec => sec && Object.values(sec).some(v => v !== undefined && v !== null));
    if (!hasLiveEdits && submission?.isEvaluatedByTeacher && submission?.correctCount !== undefined && submission?.wrongCount !== undefined) {
      const correct = Number(submission.correctCount || 0);
      const wrong = Number(submission.wrongCount || 0);
      const blank = Number(submission.blankCount || 0);
      const total = Number(submission.totalQuestions || (correct + wrong + blank) || 27);
      const scorePct = submission.scorePercentage ?? (total > 0 ? Math.round((correct / total) * 100) : 0);
      const rawNet = Math.max(0, correct - wrong * 0.25);
      const netScore = Number.isInteger(rawNet) ? rawNet : rawNet.toFixed(2);
      return { total, correct, wrong, blank, pending: 0, scorePct, netScore };
    }

    let totalQuestions = 0;
    let correctCount   = 0;
    let wrongCount     = 0;
    let blankCount     = 0;
    let pendingCount   = 0;

    const dbTS = submission?.teacherScores || {};

    const secOffsets = [];
    let acc = 0;
    rawSections.forEach(s => {
      secOffsets.push(acc);
      acc += (s.qCount || s.questions?.length || s.resolvedQuestions?.length || 1);
    });

    rawSections.forEach((sec, sIdx) => {
      const secQs  = sec.questions || sec.resolvedQuestions || [];
      const count  = sec.qCount || secQs.length || 1;
      const rawId  = sec.raw?.id || sec.raw?.questionId || sec.id;
      const isSecOE = sec.type === 'open_ended' || isSectionOpenEnded(sec, test);
      const secStart = secOffsets[sIdx] || 0;

      const dbSecScores = dbTS[sec.id] || dbTS[rawId] || dbTS[String(sIdx)] || {};

      for (let i = 1; i <= count; i++) {
        totalQuestions++;
        const globalQNo = secStart + i;
        const qObj = secQs[i - 1] || {};
        const isQOE = isSecOE || isQuestionOpenEnded(qObj, sec, test);

        const rawAnsItem = Array.isArray(submission?.answers)
          ? submission.answers.find(a =>
              (a.sectionId && (String(a.sectionId) === String(sec.id) || String(a.sectionId) === String(rawId)) && Number(a.questionNoInSection) === i) ||
              Number(a.questionNo) === globalQNo ||
              (sIdx === 0 && Number(a.questionNo) === i)
            )
          : null;

        if (isQOE) {
          const sa = sectionAnswersMap[sIdx] ?? sectionAnswersMap[String(sIdx)] ?? {};
          const textVal = sa.openEndedText?.[i] ?? sa.openEndedText?.[String(i)] ?? rawAnsItem?.userAnswerText;
          const hasText = Boolean(textVal && String(textVal).trim());

          const directTeacherSc = teacherScores[sec.id]?.[i] ?? teacherScores[rawId]?.[i] ?? teacherScores[sIdx]?.[i] ?? dbSecScores[i] ?? dbSecScores[String(i)];
          const isExplicitEmpty = directTeacherSc === 'empty' || rawAnsItem?.score === 'empty' || rawAnsItem?.evalStatus === 'empty' || (rawAnsItem?.score === 0 && rawAnsItem?.isCorrect === null);
          const hasExplicitTeacherScore = !isExplicitEmpty && directTeacherSc !== undefined && directTeacherSc !== null && directTeacherSc !== 'empty';

          if (isExplicitEmpty) {
            blankCount++;
          } else if (hasExplicitTeacherScore) {
            if (Number(directTeacherSc) >= 5) correctCount++;
            else wrongCount++;
          } else if (rawAnsItem && (rawAnsItem.evaluatedByTeacher || rawAnsItem.evaluatedAt) && rawAnsItem.score !== undefined && rawAnsItem.score !== null) {
            if (Number(rawAnsItem.score) >= 5) correctCount++;
            else if (Number(rawAnsItem.score) > 0 || hasText) wrongCount++;
            else blankCount++;
          } else if (hasText) {
            pendingCount++;
          } else {
            blankCount++;
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
          if (u === null && (!rawAnsItem || (rawAnsItem.userAnswer === null && !rawAnsItem.answer))) {
            blankCount++;
          } else if (rawAnsItem && typeof rawAnsItem.isCorrect === 'boolean') {
            if (rawAnsItem.isCorrect) correctCount++;
            else wrongCount++;
          } else if (u !== null) {
            let isCorr = null;
            if (qObj && Object.keys(qObj).length > 0) {
              isCorr = checkIsAnswerCorrect(u, qObj.raw || qObj, sec.raw || sec, i);
            }
            if (isCorr === false) wrongCount++;
            else correctCount++;
          } else {
            blankCount++;
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
    <div style={{ minHeight: '100%', width: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Top Header */}
      <div style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '0.5rem 0.75rem' : '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.65rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
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
              🔍 {unifiedTest.title || 'Sınav İncelemesi'}
            </h3>
            <span style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 800, color: '#2563eb' }}>
              {unifiedSub.studentName || 'Öğrenci'} • {rawSections.length} Bölüm ({overallStats.total} Soru)
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
        onSelectSection={(idx) => {
          setActiveSecIdx(idx);
          setActiveQIdx(0);
        }}
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
                  isTeacher={isTeacher}
                  teacherScores={teacherScores[activeSec.id] || teacherScores[activeSec.raw?.id] || currentSecAnswers.teacherScores || {}}
                  teacherNotes={teacherNotes[activeSec.id] || teacherNotes[activeSec.raw?.id] || currentSecAnswers.teacherNotes || {}}
                  submissionAnswers={submission?.answers || []}
                  isTrulyEvaluated={Boolean(submission?.isEvaluatedByTeacher || submission?.status === 'evaluated')}
                  onSetTeacherScore={(qNo, sc) => handleScoreChange && handleScoreChange(activeSec.id, qNo, sc)}
                  onSetTeacherNote={(qNo, note) => handleNoteChange && handleNoteChange(activeSec.id, qNo, note)}
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
                  isTeacher={isTeacher}
                  teacherScores={teacherScores[activeSec.id] || teacherScores[activeSec.raw?.id] || currentSecAnswers.teacherScores || {}}
                  teacherNotes={teacherNotes[activeSec.id] || teacherNotes[activeSec.raw?.id] || currentSecAnswers.teacherNotes || {}}
                  submissionAnswers={submission?.answers || []}
                  isTrulyEvaluated={Boolean(submission?.isEvaluatedByTeacher || submission?.status === 'evaluated')}
                  onSetTeacherScore={(qNo, sc) => handleScoreChange && handleScoreChange(activeSec.id, qNo, sc)}
                  onSetTeacherNote={(qNo, note) => handleNoteChange && handleNoteChange(activeSec.id, qNo, note)}
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
              <div style={{ padding: isMobile ? '0.75rem 0.65rem' : '1.25rem 1.5rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Question Bubbles Navigator & View Mode Toggle */}
                {currentSecQuestions.length > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '0.85rem',
                    padding: '0.45rem 0.75rem',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', scrollbarWidth: 'none', flex: 1 }}>
                      {currentSecQuestions.map((q, idx) => {
                        const qNo = idx + 1;
                        const score = teacherScores[activeSec.id]?.[qNo];
                        const text = currentSecAnswers.openEndedText[qNo] || '';
                        const isSelected = viewMode === 'single' && activeQIdx === idx;
                        const isGraded = score !== undefined && score !== null && score !== '' && score !== 'empty';
                        const isBlank = !text || text.trim() === '';

                        return (
                          <button
                            key={q.id || idx}
                            type="button"
                            onClick={() => {
                              setViewMode('single');
                              setActiveQIdx(idx);
                            }}
                            style={{
                              minWidth: '32px',
                              height: '32px',
                              borderRadius: '0.5rem',
                              border: isSelected ? '2px solid #7c3aed' : '1px solid var(--color-border-input)',
                              background: isSelected ? '#7c3aed' : (isGraded ? '#dcfce7' : (isBlank ? 'var(--color-surface)' : '#faf5ff')),
                              color: isSelected ? '#ffffff' : (isGraded ? '#15803d' : (isBlank ? 'var(--color-text-muted)' : '#7c3aed')),
                              fontWeight: 900,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {qNo}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewMode(prev => prev === 'single' ? 'list' : 'single')}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--color-border-input)',
                        background: 'var(--color-surface-hover)',
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {viewMode === 'single' ? 'Tüm Liste' : 'Tek Soru'}
                    </button>
                  </div>
                )}

                {/* Content */}
                {viewMode === 'single' && currentSecQuestions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(() => {
                      const q = currentSecQuestions[activeQIdx] || currentSecQuestions[0];
                      const qNo = activeQIdx + 1;
                      const text = currentSecAnswers.openEndedText[qNo] || '';
                      const score = teacherScores[activeSec.id]?.[qNo];
                      const note = teacherNotes[activeSec.id]?.[qNo] || '';

                      return (
                        <OpenEndedReview
                          key={q.id || activeQIdx}
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
                    })()}

                    {/* Stepper Bottom Action */}
                    {currentSecQuestions.length > 1 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--color-surface)',
                        border: '1.5px solid var(--color-border)',
                        borderRadius: '0.85rem',
                        padding: '0.5rem 0.85rem',
                        marginTop: '0.25rem'
                      }}>
                        <button
                          type="button"
                          disabled={activeQIdx === 0}
                          onClick={() => setActiveQIdx(prev => Math.max(0, prev - 1))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '0.6rem',
                            border: '1.5px solid var(--color-border-input)',
                            background: activeQIdx === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                            color: activeQIdx === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: activeQIdx === 0 ? 'not-allowed' : 'pointer',
                            opacity: activeQIdx === 0 ? 0.45 : 1
                          }}
                        >
                          <ChevronLeft size={15} />
                          <span>Önceki Soru</span>
                        </button>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                          {activeQIdx + 1} / {currentSecQuestions.length}
                        </span>
                        <button
                          type="button"
                          disabled={activeQIdx >= currentSecQuestions.length - 1}
                          onClick={() => setActiveQIdx(prev => Math.min(currentSecQuestions.length - 1, prev + 1))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.4rem 0.85rem',
                            borderRadius: '0.6rem',
                            border: 'none',
                            background: activeQIdx >= currentSecQuestions.length - 1 ? 'var(--color-surface-hover)' : 'linear-gradient(135deg, #7c3aed, #6366f1)',
                            color: activeQIdx >= currentSecQuestions.length - 1 ? 'var(--color-text-muted)' : '#ffffff',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            cursor: activeQIdx >= currentSecQuestions.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: activeQIdx >= currentSecQuestions.length - 1 ? 0.45 : 1
                          }}
                        >
                          <span>Sonraki Soru</span>
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  currentSecQuestions.map((q, idx) => {
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
                  })
                )}
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
              <div style={{ padding: isMobile ? '0.75rem 0.65rem' : '1.25rem 1.5rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Question Bubbles Navigator & View Mode Toggle */}
                {currentSecQuestions.length > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '0.85rem',
                    padding: '0.45rem 0.75rem',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', scrollbarWidth: 'none', flex: 1 }}>
                      {currentSecQuestions.map((q, idx) => {
                        const qNo = idx + 1;
                        const uAns = currentSecAnswers.answers[qNo] ?? currentSecAnswers.answers[String(qNo)];
                        const isBlank = uAns === null || uAns === undefined || uAns === '' || uAns === 'empty';
                        const isCorr = isBlank ? null : checkIsAnswerCorrect(uAns, q.raw || q, activeSec.raw || activeSec, qNo);
                        const isSelected = viewMode === 'single' && activeQIdx === idx;

                        return (
                          <button
                            key={q.id || idx}
                            type="button"
                            onClick={() => {
                              setViewMode('single');
                              setActiveQIdx(idx);
                            }}
                            style={{
                              minWidth: '32px',
                              height: '32px',
                              borderRadius: '0.5rem',
                              border: isSelected ? '2px solid #2563eb' : '1px solid var(--color-border-input)',
                              background: isSelected ? '#2563eb' : (isCorr === true ? '#dcfce7' : (isCorr === false ? '#fee2e2' : 'var(--color-surface)')),
                              color: isSelected ? '#ffffff' : (isCorr === true ? '#15803d' : (isCorr === false ? '#b91c1c' : 'var(--color-text-muted)')),
                              fontWeight: 900,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {qNo}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewMode(prev => prev === 'single' ? 'list' : 'single')}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--color-border-input)',
                        background: 'var(--color-surface-hover)',
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {viewMode === 'single' ? 'Tüm Liste' : 'Tek Soru'}
                    </button>
                  </div>
                )}

                {/* Content */}
                {viewMode === 'single' && currentSecQuestions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(() => {
                      const q = currentSecQuestions[activeQIdx] || currentSecQuestions[0];
                      const qNo = activeQIdx + 1;
                      const uAns = currentSecAnswers.answers[qNo] ?? currentSecAnswers.answers[String(qNo)];
                      const cAns = q.correctAnswer;
                      const isBlank = uAns === null || uAns === undefined || uAns === '' || uAns === 'empty';
                      const isCorrect = isBlank ? null : checkIsAnswerCorrect(uAns, q.raw || q, activeSec.raw || activeSec, qNo);

                      return (
                        <MultipleChoiceReview
                          key={q.id || activeQIdx}
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
                    })()}

                    {/* Stepper Bottom Action */}
                    {currentSecQuestions.length > 1 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--color-surface)',
                        border: '1.5px solid var(--color-border)',
                        borderRadius: '0.85rem',
                        padding: '0.5rem 0.85rem',
                        marginTop: '0.25rem'
                      }}>
                        <button
                          type="button"
                          disabled={activeQIdx === 0}
                          onClick={() => setActiveQIdx(prev => Math.max(0, prev - 1))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '0.6rem',
                            border: '1.5px solid var(--color-border-input)',
                            background: activeQIdx === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                            color: activeQIdx === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: activeQIdx === 0 ? 'not-allowed' : 'pointer',
                            opacity: activeQIdx === 0 ? 0.45 : 1
                          }}
                        >
                          <ChevronLeft size={15} />
                          <span>Önceki Soru</span>
                        </button>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                          {activeQIdx + 1} / {currentSecQuestions.length}
                        </span>
                        <button
                          type="button"
                          disabled={activeQIdx >= currentSecQuestions.length - 1}
                          onClick={() => setActiveQIdx(prev => Math.min(currentSecQuestions.length - 1, prev + 1))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.4rem 0.85rem',
                            borderRadius: '0.6rem',
                            border: 'none',
                            background: activeQIdx >= currentSecQuestions.length - 1 ? 'var(--color-surface-hover)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                            color: activeQIdx >= currentSecQuestions.length - 1 ? 'var(--color-text-muted)' : '#ffffff',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            cursor: activeQIdx >= currentSecQuestions.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: activeQIdx >= currentSecQuestions.length - 1 ? 0.45 : 1
                          }}
                        >
                          <span>Sonraki Soru</span>
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  currentSecQuestions.map((q, idx) => {
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
                  })
                )}
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

      {/* ── MULTI-SECTION BOTTOM NAVIGATION DOCK (if rawSections.length > 1) ── */}
      {rawSections.length > 1 && (
        <div style={{
          background: 'var(--color-surface)',
          borderTop: '1.5px solid var(--color-border)',
          padding: isMobile ? '0.45rem 0.75rem' : '0.65rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.65rem',
          flexShrink: 0,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
          zIndex: 40,
          userSelect: 'none'
        }}>
          {/* Previous Section Button */}
          <button
            type="button"
            disabled={activeSecIdx === 0}
            onClick={() => {
              setActiveSecIdx(prev => Math.max(0, prev - 1));
              setActiveQIdx(0);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: isMobile ? '0.45rem 0.8rem' : '0.55rem 1.25rem',
              borderRadius: '0.75rem',
              border: '1.5px solid var(--color-border-input)',
              background: activeSecIdx === 0 ? 'var(--color-surface-hover)' : 'var(--color-surface)',
              color: activeSecIdx === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
              fontSize: isMobile ? '0.78rem' : '0.86rem',
              fontWeight: 800,
              cursor: activeSecIdx === 0 ? 'not-allowed' : 'pointer',
              opacity: activeSecIdx === 0 ? 0.45 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronLeft size={16} />
            <span>{isMobile ? 'Önceki Bölüm' : `Önceki: ${rawSections[activeSecIdx - 1]?.title || `${activeSecIdx}. Bölüm`}`}</span>
          </button>

          {/* Section Indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: isMobile ? '0.76rem' : '0.86rem', fontWeight: 900, color: 'var(--color-text)' }}>
              Bölüm {activeSecIdx + 1} / {rawSections.length}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              {activeSec.title || 'Bölüm İncelemesi'}
            </span>
          </div>

          {/* Next Section Button */}
          {activeSecIdx < rawSections.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                setActiveSecIdx(prev => Math.min(rawSections.length - 1, prev + 1));
                setActiveQIdx(0);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#ffffff',
                fontSize: isMobile ? '0.78rem' : '0.86rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(79,70,229,0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{isMobile ? 'Sonraki Bölüm' : `Sonraki: ${rawSections[activeSecIdx + 1]?.title || `${activeSecIdx + 2}. Bölüm`}`}</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                fontSize: isMobile ? '0.78rem' : '0.86rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={16} />
              <span>İncelemeyi Bitir</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
