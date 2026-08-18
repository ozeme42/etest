import React from 'react';
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';

export default function QuestionGridNav({
  totalQuestions,
  currentIndex,
  onSelectIndex,
  answers = {},
  isReviewMode = false,
  darkMode = false
}) {
  return (
    <div
      style={{
        background: darkMode ? '#1e293b' : '#ffffff',
        border: `1.5px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
        borderRadius: '1.25rem',
        padding: '1rem',
        boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px -2px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 900, color: darkMode ? '#cbd5e1' : '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Soru Numaratörü ({currentIndex + 1} / {totalQuestions})
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.75rem',
              border: `1.5px solid ${darkMode ? '#334155' : '#cbd5e1'}`,
              background: currentIndex === 0 ? (darkMode ? '#0f172a' : '#f1f5f9') : (darkMode ? '#334155' : '#ffffff'),
              color: currentIndex === 0 ? (darkMode ? '#475569' : '#94a3b8') : (darkMode ? '#f8fafc' : '#334155'),
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
              background: currentIndex === totalQuestions - 1 ? (darkMode ? '#334155' : '#f1f5f9') : '#4f46e5',
              color: currentIndex === totalQuestions - 1 ? (darkMode ? '#64748b' : '#94a3b8') : '#ffffff',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: currentIndex === totalQuestions - 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              boxShadow: currentIndex === totalQuestions - 1 ? 'none' : '0 2px 8px rgba(79,70,229,0.25)'
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

          let bgColor = darkMode ? '#0f172a' : '#f8fafc';
          let textColor = darkMode ? '#94a3b8' : '#475569';
          let borderColor = darkMode ? '#334155' : '#e2e8f0';

          if (isReviewMode && isCorrect !== null) {
            if (isCorrect === true) {
              bgColor = darkMode ? '#064e3b' : '#f0fdf4';
              textColor = darkMode ? '#34d399' : '#15803d';
              borderColor = darkMode ? '#059669' : '#bbf7d0';
            } else if (isCorrect === false) {
              bgColor = darkMode ? '#7f1d1d' : '#fef2f2';
              textColor = darkMode ? '#f87171' : '#b91c1c';
              borderColor = darkMode ? '#dc2626' : '#fecaca';
            }
          } else if (isAnswered) {
            bgColor = darkMode ? '#312e81' : '#eff6ff';
            textColor = darkMode ? '#e0e7ff' : '#1d4ed8';
            borderColor = darkMode ? '#6366f1' : '#bfdbfe';
          }

          if (isActive) {
            borderColor = '#2563eb';
            bgColor = isReviewMode ? bgColor : (darkMode ? '#0284c7' : '#2563eb');
            textColor = isReviewMode ? textColor : '#ffffff';
          }

          return (
            <button
              key={idx}
              onClick={() => onSelectIndex(idx)}
              style={{
                height: '38px',
                borderRadius: '0.65rem',
                border: `2px solid ${isActive ? '#2563eb' : borderColor}`,
                background: bgColor,
                color: textColor,
                fontWeight: 900,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 0 10px rgba(37,99,235,0.3)' : 'none'
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
