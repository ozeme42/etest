import React from 'react';
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';

export default function QuestionGridNav({
  totalQuestions,
  currentIndex,
  onSelectIndex,
  answers = {},
  isReviewMode = false
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '1.25rem',
        padding: '1rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Soru Numaratörü ({currentIndex + 1} / {totalQuestions})
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.75rem',
              border: '1px solid #cbd5e1',
              background: currentIndex === 0 ? '#f1f5f9' : '#ffffff',
              color: currentIndex === 0 ? '#94a3b8' : '#1e293b',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            <ChevronLeft size={16} /> Önceki
          </button>

          <button
            onClick={() => onSelectIndex(Math.min(totalQuestions - 1, currentIndex + 1))}
            disabled={currentIndex === totalQuestions - 1}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: currentIndex === totalQuestions - 1 ? '#e2e8f0' : '#4f46e5',
              color: currentIndex === totalQuestions - 1 ? '#94a3b8' : '#ffffff',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: currentIndex === totalQuestions - 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            Sonraki <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Grid of Number Pills */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
          gap: '0.4rem'
        }}
      >
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const isActive = idx === currentIndex;
          const userAns = answers[idx + 1] || answers[idx];

          let isAnswered = false;
          let isCorrect = null;

          if (userAns) {
            if (userAns.isCorrect !== undefined) isCorrect = userAns.isCorrect;
            if (userAns.userAnswer !== undefined && userAns.userAnswer !== null && userAns.userAnswer !== '') isAnswered = true;
            if (userAns.userAnswerText && userAns.userAnswerText.trim() !== '') isAnswered = true;
          }

          let bgColor = '#f8fafc';
          let textColor = '#475569';
          let borderColor = '#e2e8f0';

          if (isReviewMode && isCorrect !== null) {
            if (isCorrect === true) {
              bgColor = '#dcfce7';
              textColor = '#15803d';
              borderColor = '#86efac';
            } else if (isCorrect === false) {
              bgColor = '#fee2e2';
              textColor = '#b91c1c';
              borderColor = '#fca5a5';
            }
          } else if (isAnswered) {
            bgColor = '#e0e7ff';
            textColor = '#4338ca';
            borderColor = '#a5b4fc';
          }

          if (isActive) {
            borderColor = '#4f46e5';
            bgColor = isReviewMode ? bgColor : '#4f46e5';
            textColor = isReviewMode ? textColor : '#ffffff';
          }

          return (
            <button
              key={idx}
              onClick={() => onSelectIndex(idx)}
              style={{
                height: '38px',
                borderRadius: '0.65rem',
                border: `2px solid ${isActive ? '#4f46e5' : borderColor}`,
                background: bgColor,
                color: textColor,
                fontWeight: 900,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 0 0 3px rgba(79,70,229,0.2)' : 'none'
              }}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
