import React from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import MultipleChoiceReview from '../review/MultipleChoiceReview';
import OpticalBubblePanel from '../panels/OpticalBubblePanel';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import { ArrowLeft, Award } from 'lucide-react';

/**
 * SingleMultipleChoiceReview
 * Dedicated, isolated review screen strictly for Single Multiple-Choice assignments.
 */
export default function SingleMultipleChoiceReview({
  submission = {},
  test = {},
  questions = [],
  onClose
}) {
  const answers = submission.answers || submission.formattedAnswers || [];

  // Map answers to easy lookup with bulletproof null-checks
  const answersMap = {};
  if (Array.isArray(answers)) {
    answers.forEach((a, idx) => {
      if (!a) return;
      const qNo = a.questionNoInSection || a.questionNo || (idx + 1);
      const raw = a.userAnswer;
      answersMap[qNo] = (typeof raw === 'object' && raw !== null) ? raw.userAnswer : raw;
    });
  }

  const correctCount = submission.correctCount ?? (Array.isArray(answers) ? answers.filter(a => a && a.isCorrect === true).length : 0);
  const wrongCount = submission.wrongCount ?? (Array.isArray(answers) ? answers.filter(a => a && a.isCorrect === false && a.userAnswer !== null && a.userAnswer !== undefined).length : 0);
  const totalQuestions = questions.length || answers.length || 1;
  const score = submission.score ?? (totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0);

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
              🔍 {test.title || 'Çoktan Seçmeli Test İncelemesi'}
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a' }}>
              {correctCount} Doğru • {wrongCount} Yanlış • %{score} Başarı
            </span>
          </div>
        </div>

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
          Kapat / Çık
        </button>
      </div>

      {/* Main Layout */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <QuizPanelLayout
          panelTitle="Sınav Cevapları"
          panelSubtitle="Cevap Anahtarı"
          icon="🔍"
          defaultPosition="right"
          defaultSize={320}
          defaultOpenOnMobile={false}
          documentContent={
            <div style={{ padding: isMobile ? '1rem' : '1.5rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {questions.map((q, idx) => {
                const qNo = idx + 1;
                const ansObj = answers[idx] || {};
                const uAns = answersMap[qNo];
                const cAns = ansObj.correctAnswer ?? q.correctAnswer;
                const isCorrect = ansObj.isCorrect ?? (uAns !== null && uAns !== undefined ? uAns === cAns : null);

                return (
                  <MultipleChoiceReview
                    key={q.id || idx}
                    question={q}
                    qNo={qNo}
                    totalQuestions={totalQuestions}
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
              qCount={totalQuestions}
              answers={answersMap}
              isReviewMode={true}
              resolvedQuestions={questions}
            />
          }
        />
      </div>
    </div>
  );
}
