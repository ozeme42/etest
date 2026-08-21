import React from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import MultipleChoiceReview from '../review/MultipleChoiceReview';
import OpticalBubblePanel from '../panels/OpticalBubblePanel';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import { ArrowLeft, Award, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

/**
 * SingleMultipleChoiceReview
 * Dedicated, isolated review screen strictly for Single Multiple-Choice assignments.
 * Features an informative stats header (Doğru, Yanlış, Boş, Başarı %, Net) and clean question review.
 */
export default function SingleMultipleChoiceReview({
  submission = {},
  test = {},
  questions = [],
  onClose
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
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

  const totalQuestions = questions.length || answers.length || 1;
  const correctCount = submission.correctCount ?? (Array.isArray(answers) ? answers.filter(a => a && a.isCorrect === true).length : 0);
  const wrongCount = submission.wrongCount ?? (Array.isArray(answers) ? answers.filter(a => a && a.isCorrect === false && a.userAnswer !== null && a.userAnswer !== undefined && a.userAnswer !== '' && a.userAnswer !== 'empty').length : 0);
  const blankCount = submission.blankCount ?? Math.max(0, totalQuestions - correctCount - wrongCount);
  const score = submission.score ?? (totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0);
  const rawNet = Math.max(0, correctCount - (wrongCount * 0.25));
  const netScore = Number.isInteger(rawNet) ? rawNet : rawNet.toFixed(2);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Top Header with Comprehensive Stats Bar */}
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
        {/* Left: Title & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem',
              borderRadius: '0.65rem',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#334155'
            }}
            title="Geri Dön"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 900, color: '#0f172a' }}>
              🔍 {test.title || 'Çoktan Seçmeli Test İncelemesi'}
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
              Öğrenci: {submission.studentName || 'Öğrenci'} • Toplam {totalQuestions} Soru
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
            <span>{correctCount} Doğru</span>
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
            <span>{wrongCount} Yanlış</span>
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
            <span>{blankCount} Boş</span>
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
            <span>%{score} Başarı (Net: {netScore})</span>
          </div>

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
            Kapat / Çık
          </button>
        </div>
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
                    selectedOption={uAns}
                    userAnswer={uAns}
                    correctOption={cAns}
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
              resolvedQuestions={questions}
              testCtx={test}
              isReviewMode={true}
            />
          }
        />
      </div>
    </div>
  );
}
