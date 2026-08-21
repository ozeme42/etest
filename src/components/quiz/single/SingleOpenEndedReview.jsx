import React from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import OpenEndedReview from '../review/OpenEndedReview';
import OpenEndedStatusPanel from '../panels/OpenEndedStatusPanel';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import { useTeacherGrading } from '../hooks/useTeacherGrading';
import { ArrowLeft, Save, CheckCircle2, Clock } from 'lucide-react';

/**
 * SingleOpenEndedReview
 * Dedicated review screen for Single Open-Ended assignments.
 * For Students: Clean read-only view of their submitted answers and teacher evaluations.
 * For Teachers: Interactive grading & scoring controls.
 */
export default function SingleOpenEndedReview({
  submission = {},
  test = {},
  questions = [],
  isTeacher = false,
  onClose
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');

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
    sections: [{ id: 'sec_1', resolvedQuestions: questions, qCount: questions.length }]
  });

  const answers = submission.answers || submission.formattedAnswers || submission.raw_data?.answers || [];
  const textMap = {};
  if (Array.isArray(answers)) {
    answers.forEach((a, idx) => {
      const qNo = a.questionNoInSection || a.questionNo || (idx + 1);
      const val = a.userAnswerText || a.user_answer_text || a.textAns || (typeof a.userAnswer === 'string' ? a.userAnswer : null) || (typeof a === 'string' ? a : null);
      if (val) textMap[qNo] = typeof val === 'string' ? val : (val.text || val.userAnswerText || '');
    });
  }
  if (submission.openEndedText && typeof submission.openEndedText === 'object') {
    Object.assign(textMap, submission.openEndedText);
  }
  if (submission.raw_data?.openEndedText && typeof submission.raw_data.openEndedText === 'object') {
    Object.assign(textMap, submission.raw_data.openEndedText);
  }

  const totalQuestions = questions.length || answers.length || 1;
  const isEvaluated = Boolean(
    submission.isEvaluatedByTeacher ||
    submission.status === 'evaluated' ||
    submission.status === 'graded' ||
    answers.some(a => a.evaluatedByTeacher || a.evaluatedAt || (typeof a.score === 'number' && a.score > 0))
  );

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
              ✍️ {test.title || (isTeacher ? 'Açık Uçlu Sınav Değerlendirmesi' : 'Açık Uçlu Sınav İncelemesi')}
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isEvaluated ? '#16a34a' : '#d97706' }}>
              {isTeacher
                ? `Öğrenci: ${submission.studentName || 'Öğrenci'} • ${totalQuestions} Yazılı Soru`
                : (isEvaluated ? `Puanlandı • %${submission.score ?? 0} Başarı` : `${totalQuestions} Yazılı Soru • Öğretmen Değerlendirmesi Bekleniyor`)}
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
              <Save size={15} /> {isSaving ? 'Kaydediliyor...' : 'Puanları Kaydet'}
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
                const teacherScore = teacherScores['sec_1']?.[qNo];
                const teacherNote = teacherNotes['sec_1']?.[qNo] || '';

                return (
                  <OpenEndedReview
                    key={q.id || idx}
                    question={q}
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
                    <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.9rem', fontWeight: 900, color: '#6b21a8' }}>
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
