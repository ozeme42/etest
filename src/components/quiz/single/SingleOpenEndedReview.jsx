import React, { useState, useEffect, useMemo } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import OpenEndedReview from '../review/OpenEndedReview';
import OpenEndedStatusPanel from '../panels/OpenEndedStatusPanel';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import { idbGetPayload } from '../../../services/indexedDbService';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';
import { ArrowLeft, Save, Clock, Award } from 'lucide-react';

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

  const answers = submission.answers || [];
  const totalQuestions = questions.length || answers.length || test.questionCount || 1;

  // 1. Text Map
  const textMap = useMemo(() => {
    const map = {};
    answers.forEach(a => {
      const qNo = a.questionNoInSection || a.questionNo;
      if (qNo) {
        map[qNo] = a.userAnswerText || a.studentAnswerText || a.userAnswer || '';
      }
    });
    return map;
  }, [answers]);

  // 2. Teacher Scores & Notes
  const [teacherScores, setTeacherScores] = useState(() => {
    const map = { sec_1: {} };
    answers.forEach(a => {
      const qNo = a.questionNoInSection || a.questionNo;
      if (qNo) {
        if (a.evalStatus === 'empty' || a.eval_status === 'empty' || a.score === 'empty') {
          map.sec_1[qNo] = 'empty';
        } else if (a.score !== undefined && a.score !== null) {
          map.sec_1[qNo] = Number(a.score);
        } else if (a.isCorrect === true) {
          map.sec_1[qNo] = 10;
        } else if (a.isCorrect === false) {
          map.sec_1[qNo] = 0;
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

  const totalEarnedScore = useMemo(() => {
    let earned = 0;
    const sMap = teacherScores.sec_1 || {};
    Object.values(sMap).forEach(sc => {
      if (sc !== undefined && sc !== null && sc !== 'empty') {
        earned += Number(sc);
      }
    });
    return earned;
  }, [teacherScores]);

  const totalMaxScore = totalQuestions * 10;
  const scorePercentage = totalMaxScore > 0 ? Math.min(100, Math.round((totalEarnedScore / totalMaxScore) * 100)) : 0;

  const isTrulyEvaluated = useMemo(() => {
    if (submission.isEvaluatedByTeacher === true || submission.status === 'evaluated') {
      return (
        totalEarnedScore > 0 ||
        Boolean(submission.teacherFeedback || submission.teacherNote) ||
        answers.some(a => a.evaluatedByTeacher === true && typeof a.score === 'number')
      );
    }
    return false;
  }, [submission, totalEarnedScore, answers]);

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
                : (isTrulyEvaluated ? `Puanlandı • %${scorePercentage} Başarı` : `${totalQuestions} Yazılı Soru • ⏳ Değerlendirmede`)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isTrulyEvaluated ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: '#ffffff',
              padding: '0.4rem 0.9rem',
              borderRadius: '0.65rem',
              fontWeight: 900,
              fontSize: '0.85rem'
            }}>
              <Award size={16} /> %{scorePercentage} Başarı ({totalEarnedScore} / {totalMaxScore} P)
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: '#f5f3ff',
              color: '#6b21a8',
              border: '1px solid #ddd6fe',
              padding: '0.4rem 0.9rem',
              borderRadius: '0.65rem',
              fontWeight: 900,
              fontSize: '0.85rem'
            }}>
              <Clock size={16} color="#7c3aed" />
              <span>⏳ Değerlendirmede</span>
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
            <div style={{ padding: isMobile ? '1rem' : '1.5rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {questions.map((q, idx) => {
                const qNo = idx + 1;
                const userText = textMap[qNo] || '';
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
                    onScoreChange={(sc) => handleScoreChange('sec_1', qNo, sc)}
                    onNoteChange={(nt) => handleNoteChange('sec_1', qNo, nt)}
                    isTeacher={isTeacher}
                    isTeacherMode={isTeacher}
                    isMobile={isMobile}
                  />
                );
              })}

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
              resolvedQuestions={questions}
            />
          }
        />
      </div>
    </div>
  );
}
