import React, { useState, useEffect, useMemo } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import OpenEndedReview from '../review/OpenEndedReview';
import OpenEndedStatusPanel from '../panels/OpenEndedStatusPanel';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import { idbGetPayload } from '../../../services/indexedDbService';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';
import { ArrowLeft, Save, Clock, Award, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * SingleOpenEndedReview
 * Isolated review & teacher grading component for Single Open-Ended assignments.
 */
export default function SingleOpenEndedReview({
  submission = {},
  test = {},
  questions = [],
  isTeacher = false,
  onClose
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { updateSubmission } = useEvaluation();
  const { updateHomeworkSubmission } = useHomework();

  const [activeQIdx, setActiveQIdx] = useState(0);
  const [viewMode, setViewMode] = useState('single');

  const answers = submission.answers || [];

  // 1. Text Map
  const textMap = useMemo(() => {
    const map = {};
    answers.forEach(a => {
      const qNo = a.questionNoInSection || a.questionNo;
      if (qNo) {
        map[qNo] = a.userAnswerText || a.studentAnswerText || a.userAnswer || '';
      }
    });
    if (submission.openEndedText && typeof submission.openEndedText === 'object') {
      Object.entries(submission.openEndedText).forEach(([k, v]) => {
        if (!map[k] && v) map[k] = v;
      });
    }
    return map;
  }, [answers, submission.openEndedText]);

  // Robust questions list ensuring every question exists with its actual text
  const effectiveQuestions = useMemo(() => {
    const list = [...(questions || [])];
    const targetCount = Math.max(
      list.length,
      answers.length,
      submission.questionsList?.length || 0,
      test.questionCount || 0,
      test.questionsList?.length || 0,
      Object.keys(textMap).length,
      1
    );

    const isPlaceholder = (txt) => !txt || typeof txt !== 'string' || txt.trim() === '' || /^(soru\s*\d+|\d+\.\s*bölüm|bölüm\s*\d+|genel test)/i.test(txt.trim());

    const result = [];
    for (let i = 0; i < targetCount; i++) {
      const qNo = i + 1;
      const existing = list[i] || {};
      const subAns = (Array.isArray(answers) ? answers.find(a => (
        Number(a?.questionNo) === qNo ||
        Number(a?.questionNoInSection) === qNo ||
        String(a?.questionId).endsWith(`_${qNo}`) ||
        String(a?.id).endsWith(`_${qNo}`)
      )) : null) || (Array.isArray(answers) ? answers[i] : {}) || {};
      const subQ = (submission.questionsList && submission.questionsList[i]) || (test.questionsList && test.questionsList[i]) || {};

      let resolvedText = null;
      if (!isPlaceholder(existing.questionText)) resolvedText = existing.questionText;
      else if (!isPlaceholder(existing.text)) resolvedText = existing.text;
      else if (!isPlaceholder(subQ.questionText)) resolvedText = subQ.questionText;
      else if (!isPlaceholder(subQ.text)) resolvedText = subQ.text;
      else if (!isPlaceholder(subAns.questionText)) resolvedText = subAns.questionText;
      else if (!isPlaceholder(subAns.text)) resolvedText = subAns.text;
      else if (targetCount === 1 && !isPlaceholder(test.questionText)) resolvedText = test.questionText;
      else resolvedText = existing.questionText || `Soru ${qNo}`;

      result.push({
        ...existing,
        ...subQ,
        id: existing.id || subQ.id || subAns.questionId || `q_${qNo}`,
        questionNo: qNo,
        questionText: resolvedText,
        userAnswerText: textMap[qNo] || subAns.userAnswerText || subAns.studentAnswerText || existing.userAnswerText || ''
      });
    }
    return result;
  }, [questions, answers, test, submission, textMap]);

  const totalQuestions = effectiveQuestions.length;

  // 1. isTrulyEvaluated check
  const isTrulyEvaluated = useMemo(() => {
    if (submission.isEvaluatedByTeacher === true || submission.status === 'evaluated') {
      const hasPositiveScore = (submission.score !== undefined && submission.score !== null && Number(submission.score) > 0);
      const hasFeedback = Boolean(submission.teacherFeedback || submission.teacherNote);
      const hasGradedAns = answers.some(a => a.evaluatedByTeacher === true || (typeof a.score === 'number' && a.score > 0));
      return hasPositiveScore || hasFeedback || hasGradedAns;
    }
    return false;
  }, [submission, answers]);

  // 2. Teacher Scores & Notes
  const [teacherScores, setTeacherScores] = useState(() => {
    const map = { sec_1: {} };
    answers.forEach((a, idx) => {
      const qNo = a.questionNoInSection || a.questionNo || (idx + 1);
      if (qNo) {
        if (isTrulyEvaluated) {
          if (a.evalStatus === 'empty' || a.eval_status === 'empty' || a.score === 'empty') {
            map.sec_1[qNo] = 'empty';
          } else if (a.score !== undefined && a.score !== null && a.score !== '') {
            map.sec_1[qNo] = Number(a.score);
          } else if (a.isCorrect === true) {
            map.sec_1[qNo] = 10;
          } else if (a.isCorrect === false) {
            map.sec_1[qNo] = 0;
          }
        }
      }
    });
    return map;
  });

  const [teacherNotes, setTeacherNotes] = useState(() => {
    const map = { sec_1: {} };
    answers.forEach(a => {
      const qNo = a.questionNoInSection || a.questionNo;
      if (qNo) {
        map.sec_1[qNo] = a.teacherNote || a.teacher_note || '';
      }
    });
    return map;
  });

  const [idbPayloadMap, setIdbPayloadMap] = useState({});
  const [overallFeedback, setOverallFeedback] = useState(submission.teacherFeedback || submission.teacherNote || '');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleScoreChange = (secId, qNo, sc) => {
    setTeacherScores(prev => ({
      ...prev,
      [secId]: {
        ...(prev[secId] || {}),
        [qNo]: sc
      }
    }));
  };

  const handleNoteChange = (secId, qNo, nt) => {
    setTeacherNotes(prev => ({
      ...prev,
      [secId]: {
        ...(prev[secId] || {}),
        [qNo]: nt
      }
    }));
  };

  const stats = useMemo(() => {
    let cCount = 0;
    let wCount = 0;
    let bCount = 0;
    let pCount = 0;

    const sMap = teacherScores.sec_1 || {};
    for (let i = 1; i <= totalQuestions; i++) {
      const qNo = i;
      const ans = (Array.isArray(answers) ? answers.find(a => (
        Number(a?.questionNo) === qNo ||
        Number(a?.questionNoInSection) === qNo ||
        String(a?.questionId).endsWith(`_${qNo}`) ||
        String(a?.id).endsWith(`_${qNo}`)
      )) : null) || (Array.isArray(answers) ? answers[i - 1] : {}) || {};

      const textVal = ans.userAnswerText || ans.studentAnswerText || ans.userAnswer || textMap[qNo] || (questions[i - 1]?.userAnswerText) || '';
      const hasText = Boolean(textVal && String(textVal).trim() !== '' && String(textVal).trim() !== 'empty');
      const sc = sMap[qNo] !== undefined ? sMap[qNo] : ans.score;

      if (sc !== undefined && sc !== null && sc !== 'empty' && sc !== 'pending' && !isNaN(Number(sc))) {
        const numSc = Number(sc);
        if (numSc >= 5) cCount++;
        else wCount++;
      } else if (!hasText || sc === 'empty') {
        bCount++;
      } else {
        pCount++;
      }
    }

    return { correctCount: cCount, wrongCount: wCount, blankCount: bCount, pendingCount: pCount };
  }, [totalQuestions, answers, teacherScores, textMap, questions]);

  const { correctCount, wrongCount, blankCount, pendingCount } = stats;

  const totalEarnedScore = useMemo(() => {
    let earned = 0;
    const sMap = teacherScores.sec_1 || {};
    Object.values(sMap).forEach(sc => {
      if (sc !== undefined && sc !== null && sc !== 'empty' && !isNaN(Number(sc))) {
        earned += Number(sc);
      }
    });
    return earned;
  }, [teacherScores]);

  const totalMaxScore = totalQuestions * 10;
  const scorePercentage = useMemo(() => {
    const totalScored = correctCount + wrongCount;
    if (isTrulyEvaluated && totalScored > 0) {
      return Math.min(100, Math.round((correctCount / totalQuestions) * 100));
    }
    return 0;
  }, [correctCount, wrongCount, totalQuestions, isTrulyEvaluated]);

  const rawNet = Math.max(0, correctCount - (wrongCount * 0.25));
  const netScore = Number.isInteger(rawNet) ? rawNet : Number(rawNet.toFixed(2));

  const handleSaveAndClose = async () => {
    if (isSaving || !submission) return;
    setIsSaving(true);
    try {
      const sMap = teacherScores.sec_1 || {};
      const nMap = teacherNotes.sec_1 || {};

      const updatedAnswers = answers.map((ans, idx) => {
        const qNo = ans.questionNoInSection || ans.questionNo || (idx + 1);
        const sc = sMap[qNo];
        const nt = nMap[qNo] || '';

        let score = 0;
        let isCorrect = null;
        let evalStatus = 'empty';

        if (sc === 'empty') {
          score = 0;
          isCorrect = null;
          evalStatus = 'empty';
        } else if (sc !== undefined && sc !== null) {
          score = Number(sc);
          isCorrect = score >= 5;
          evalStatus = score >= 5 ? (score === 5 ? 'half' : 'correct') : 'wrong';
        } else if (ans.score !== undefined && ans.score !== null) {
          score = Number(ans.score);
          isCorrect = score >= 5;
          evalStatus = score >= 5 ? 'correct' : 'wrong';
        }

        return {
          ...ans,
          score,
          isCorrect,
          evalStatus,
          teacherNote: nt,
          evaluatedByTeacher: true
        };
      });

      const updatedSubPayload = {
        ...submission,
        answers: updatedAnswers,
        score: scorePercentage,
        isEvaluatedByTeacher: true,
        status: 'evaluated',
        teacherFeedback: overallFeedback,
        teacherNote: overallFeedback,
        evaluatedAt: new Date().toISOString()
      };

      if (typeof updateSubmission === 'function') {
        await updateSubmission(submission.id, updatedSubPayload);
      }

      if (submission.homeworkId || submission.hwId) {
        const hwId = submission.homeworkId || submission.hwId;
        if (typeof updateHomeworkSubmission === 'function') {
          await updateHomeworkSubmission(hwId, submission.studentId || submission.id, updatedSubPayload);
        }
      }

      if (onClose) onClose();
    } catch (err) {
      console.error('Error saving single open-ended evaluation:', err);
      if (onClose) onClose();
    } finally {
      setIsSaving(false);
    }
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
              ✍️ {test.title || (isTeacher ? 'Açık Uçlu Sınav Değerlendirmesi' : 'Açık Uçlu Sınav İncelemesi')}
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isTrulyEvaluated ? '#16a34a' : '#d97706' }}>
              {isTeacher
                ? `Öğrenci: ${submission.studentName || 'Öğrenci'} • ${totalQuestions} Yazılı Soru`
                : (isTrulyEvaluated ? `✍️ Açık Uçlu / Yazılı • ${totalQuestions} Soru` : `${totalQuestions} Yazılı Soru • ⏳ Değerlendirmede`)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          {/* Doğru Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: isMobile ? '0.25rem 0.5rem' : '0.35rem 0.65rem',
            borderRadius: '0.55rem',
            background: '#f0fdf4',
            border: '1px solid #86efac',
            color: '#15803d',
            fontWeight: 900,
            fontSize: isMobile ? '0.74rem' : '0.8rem'
          }}>
            <CheckCircle size={14} color="#16a34a" />
            <span>{correctCount} D</span>
          </div>

          {/* Yanlış Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: isMobile ? '0.25rem 0.5rem' : '0.35rem 0.65rem',
            borderRadius: '0.55rem',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            fontWeight: 900,
            fontSize: isMobile ? '0.74rem' : '0.8rem'
          }}>
            <XCircle size={14} color="#ef4444" />
            <span>{wrongCount} Y</span>
          </div>

          {/* Boş Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: isMobile ? '0.25rem 0.5rem' : '0.35rem 0.65rem',
            borderRadius: '0.55rem',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#475569',
            fontWeight: 800,
            fontSize: isMobile ? '0.74rem' : '0.8rem'
          }}>
            <AlertCircle size={14} color="#64748b" />
            <span>{blankCount} B</span>
          </div>

          {/* Başarı & Net Pill */}
          {isTrulyEvaluated ? (
            <div style={{
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: '#ffffff',
              padding: isMobile ? '0.25rem 0.55rem' : '0.35rem 0.85rem',
              borderRadius: '0.55rem',
              fontWeight: 900,
              fontSize: isMobile ? '0.76rem' : '0.84rem',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
            }}>
              %{scorePercentage} Başarı {netScore !== undefined && !isNaN(netScore) ? `(Net: ${netScore})` : ''}
            </div>
          ) : (
            <div style={{
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: '#ffffff',
              padding: isMobile ? '0.25rem 0.55rem' : '0.35rem 0.85rem',
              borderRadius: '0.55rem',
              fontWeight: 900,
              fontSize: isMobile ? '0.76rem' : '0.84rem',
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)'
            }}>
              ⏳ Değerlendirmede
            </div>
          )}

          {pendingCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: isMobile ? '0.25rem 0.5rem' : '0.35rem 0.65rem',
              borderRadius: '0.55rem',
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              color: '#7c3aed',
              fontWeight: 800,
              fontSize: isMobile ? '0.74rem' : '0.8rem'
            }}>
              <Clock size={14} color="#7c3aed" />
              <span>{pendingCount} Bekliyor</span>
            </div>
          )}

          {isTeacher ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndClose}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.85rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(22,163,74,0.25)'
              }}
            >
              <Save size={15} /> {isSaving ? 'Kaydediliyor...' : 'Puanları Kaydet ✓'}
            </button>
          ) : (
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
              Kapat & Çık
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <QuizPanelLayout
          panelTitle="Yazılı Yanıtlar"
          panelSubtitle={isTeacher ? 'Değerlendirme' : 'Cevap Durumu'}
          icon="✍️"
          defaultPosition="right"
          defaultSize={300}
          defaultOpenOnMobile={false}
          documentContent={
            <div style={{ padding: isMobile ? '0.75rem 0.65rem' : '1.25rem 1.5rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Question Bubbles Navigator & View Mode Toggle */}
              {totalQuestions > 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  background: 'var(--color-surface, #ffffff)',
                  border: '1.5px solid var(--color-border, #e2e8f0)',
                  borderRadius: '0.85rem',
                  padding: '0.45rem 0.75rem',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', scrollbarWidth: 'none', flex: 1 }}>
                    {effectiveQuestions.map((q, idx) => {
                      const qNo = idx + 1;
                      const score = teacherScores.sec_1?.[qNo];
                      const text = q.userAnswerText || textMap[qNo] || '';
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
                            border: isSelected ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                            background: isSelected ? '#7c3aed' : (isGraded ? '#dcfce7' : (isBlank ? '#ffffff' : '#faf5ff')),
                            color: isSelected ? '#ffffff' : (isGraded ? '#15803d' : (isBlank ? '#94a3b8' : '#7c3aed')),
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
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#475569',
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

              {/* Question Content */}
              {viewMode === 'single' && totalQuestions > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(() => {
                    const q = effectiveQuestions[activeQIdx] || effectiveQuestions[0];
                    const qNo = activeQIdx + 1;
                    const userText = q.userAnswerText || textMap[qNo] || '';
                    const teacherScore = teacherScores.sec_1?.[qNo];
                    const teacherNote = teacherNotes.sec_1?.[qNo] || '';
                    const qImage = idbPayloadMap[q.id] || idbPayloadMap[test.id] || q.imageUrl || (Array.isArray(q.imageUrls) ? q.imageUrls[0] : null);

                    return (
                      <OpenEndedReview
                        key={q.id || activeQIdx}
                        question={{ ...q, imageUrl: qImage || q.imageUrl }}
                        qNo={qNo}
                        totalQuestions={totalQuestions}
                        userAnswerText={userText}
                        studentAnswerText={userText}
                        teacherScore={teacherScore}
                        teacherNote={teacherNote}
                        isTrulyEvaluated={isTrulyEvaluated}
                        onScoreChange={(sc) => handleScoreChange('sec_1', qNo, sc)}
                        onNoteChange={(nt) => handleNoteChange('sec_1', qNo, nt)}
                        isTeacher={isTeacher}
                        isTeacherMode={isTeacher}
                        isMobile={isMobile}
                      />
                    );
                  })()}

                  {/* Stepper Bottom Action */}
                  {totalQuestions > 1 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--color-surface, #ffffff)',
                      border: '1.5px solid var(--color-border, #e2e8f0)',
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
                          border: '1.5px solid #cbd5e1',
                          background: activeQIdx === 0 ? '#f1f5f9' : '#ffffff',
                          color: activeQIdx === 0 ? '#94a3b8' : '#0f172a',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: activeQIdx === 0 ? 'not-allowed' : 'pointer',
                          opacity: activeQIdx === 0 ? 0.45 : 1
                        }}
                      >
                        <ChevronLeft size={15} />
                        <span>Önceki Soru</span>
                      </button>
                      <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text-secondary, #64748b)' }}>
                        {activeQIdx + 1} / {totalQuestions}
                      </span>
                      <button
                        type="button"
                        disabled={activeQIdx >= totalQuestions - 1}
                        onClick={() => setActiveQIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '0.6rem',
                          border: 'none',
                          background: activeQIdx >= totalQuestions - 1 ? '#f1f5f9' : 'linear-gradient(135deg, #7c3aed, #6366f1)',
                          color: activeQIdx >= totalQuestions - 1 ? '#94a3b8' : '#ffffff',
                          fontSize: '0.78rem',
                          fontWeight: 900,
                          cursor: activeQIdx >= totalQuestions - 1 ? 'not-allowed' : 'pointer',
                          opacity: activeQIdx >= totalQuestions - 1 ? 0.45 : 1
                        }}
                      >
                        <span>Sonraki Soru</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                effectiveQuestions.map((q, idx) => {
                  const qNo = idx + 1;
                  const userText = q.userAnswerText || textMap[qNo] || '';
                  const teacherScore = teacherScores.sec_1?.[qNo];
                  const teacherNote = teacherNotes.sec_1?.[qNo] || '';
                  const qImage = idbPayloadMap[q.id] || idbPayloadMap[test.id] || q.imageUrl || (Array.isArray(q.imageUrls) ? q.imageUrls[0] : null);

                  return (
                    <OpenEndedReview
                      key={q.id || idx}
                      question={{ ...q, imageUrl: qImage || q.imageUrl }}
                      qNo={qNo}
                      totalQuestions={totalQuestions}
                      userAnswerText={userText}
                      studentAnswerText={userText}
                      teacherScore={teacherScore}
                      teacherNote={teacherNote}
                      isTrulyEvaluated={isTrulyEvaluated}
                      onScoreChange={(sc) => handleScoreChange('sec_1', qNo, sc)}
                      onNoteChange={(nt) => handleNoteChange('sec_1', qNo, nt)}
                      isTeacher={isTeacher}
                      isTeacherMode={isTeacher}
                      isMobile={isMobile}
                    />
                  );
                })
              )}

              {/* Overall Feedback Box */}
              {isTeacher ? (
                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '1rem', border: '1.5px solid #e2e8f0' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a', display: 'block', marginBottom: '0.4rem' }}>
                    💬 Öğrenciye Genel Geri Bildirim Notu:
                  </label>
                  <textarea
                    rows="3"
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                    placeholder="Sınavın geneli hakkında öğrenciye tavsiyelerinizi yazabilirsiniz..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              ) : (
                overallFeedback && (
                  <div style={{ background: '#f5f3ff', padding: '1.25rem', borderRadius: '1rem', border: '1.5px solid #ddd6fe' }}>
                    <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', fontWeight: 900, color: '#6b21a8' }}>
                      💬 Öğretmeninizin Genel Notu:
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#1e1b4b', lineHeight: 1.5 }}>
                      {overallFeedback}
                    </p>
                  </div>
                )
              )}
            </div>
          }
          answerContent={
            <OpenEndedStatusPanel
              qCount={totalQuestions}
              openEndedText={textMap}
              resolvedQuestions={effectiveQuestions}
              isReviewMode={true}
              isTeacher={isTeacher}
              teacherScores={teacherScores.sec_1 || {}}
              teacherNotes={teacherNotes.sec_1 || {}}
              submissionAnswers={answers}
              isTrulyEvaluated={isTrulyEvaluated}
              onSetTeacherScore={(qNo, sc) => handleScoreChange('sec_1', qNo, sc)}
              onSetTeacherNote={(qNo, nt) => handleNoteChange('sec_1', qNo, nt)}
            />
          }
        />
      </div>
    </div>
  );
}
