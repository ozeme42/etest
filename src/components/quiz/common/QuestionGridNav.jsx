import React from 'react';
import { ChevronLeft, ChevronRight, Check, X, Circle } from 'lucide-react';

function getQuestionReviewStatus(userAns) {
  if (!userAns) return 'blank';
  if (userAns.hasAnswer === false) return 'blank';
  if (userAns.evalStatus === 'empty' || userAns.eval_status === 'empty' || userAns.score === 'empty') return 'blank';

  let raw = userAns.userAnswer !== undefined ? userAns.userAnswer : (userAns.answer !== undefined ? userAns.answer : (userAns.selectedOption !== undefined ? userAns.selectedOption : userAns));
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    raw = raw.userAnswer ?? raw.selectedOption ?? raw.answer ?? raw.value;
  }

  const isRawEmpty = (raw === undefined || raw === null || raw === '' || raw === 'empty' || raw === 'null' || raw === 'Boş' || raw === 'boş');
  const txt = typeof userAns.userAnswerText === 'string' ? userAns.userAnswerText.trim() : (typeof userAns.textAns === 'string' ? userAns.textAns.trim() : '');

  if (isRawEmpty && txt.length === 0) {
    return 'blank';
  }

  if (userAns.isCorrect === true || userAns.is_correct === true || userAns.isRight === true) {
    return 'correct';
  }
  if (userAns.isCorrect === false || userAns.is_correct === false || userAns.isRight === false) {
    return 'wrong';
  }
  return 'answered';
}

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: darkMode ? '#cbd5e1' : '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Soru Numaratörü ({currentIndex + 1} / {totalQuestions})
          </span>
          {isReviewMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 800 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', color: '#16a34a', background: darkMode ? 'rgba(34,197,94,0.15)' : '#dcfce7', padding: '0.15rem 0.4rem', borderRadius: '0.35rem' }}>
                ✓ Doğru
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', color: '#dc2626', background: darkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2', padding: '0.15rem 0.4rem', borderRadius: '0.35rem' }}>
                ✗ Yanlış
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', color: '#64748b', background: darkMode ? 'rgba(100,116,139,0.15)' : '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '0.35rem' }}>
                ○ Boş
              </span>
            </div>
          )}
        </div>

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
          gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
          gap: '0.45rem'
        }}
      >
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const isActive = idx === currentIndex;
          const qNo = idx + 1;
          const userAns = Array.isArray(answers)
            ? (answers[idx] ?? answers[qNo])
            : (answers[qNo] ?? answers[String(qNo)] ?? answers[idx] ?? answers[String(idx)]);

          const status = getQuestionReviewStatus(userAns);

          let bgColor = darkMode ? '#0f172a' : '#f8fafc';
          let textColor = darkMode ? '#94a3b8' : '#64748b';
          let borderColor = darkMode ? '#334155' : '#cbd5e1';
          let badgeIcon = null;

          if (isReviewMode) {
            if (status === 'correct') {
              bgColor = darkMode ? 'rgba(34, 197, 94, 0.22)' : '#dcfce7';
              textColor = darkMode ? '#4ade80' : '#166534';
              borderColor = '#22c55e';
              badgeIcon = '✓';
            } else if (status === 'wrong') {
              bgColor = darkMode ? 'rgba(239, 68, 68, 0.22)' : '#fee2e2';
              textColor = darkMode ? '#f87171' : '#991b1b';
              borderColor = '#ef4444';
              badgeIcon = '✗';
            } else {
              // Boş / Yanıtlanmadı
              bgColor = darkMode ? '#1e293b' : '#f1f5f9';
              textColor = darkMode ? '#94a3b8' : '#64748b';
              borderColor = darkMode ? '#475569' : '#cbd5e1';
              badgeIcon = '○';
            }
          } else if (status !== 'blank') {
            bgColor = darkMode ? '#312e81' : '#eff6ff';
            textColor = darkMode ? '#e0e7ff' : '#1d4ed8';
            borderColor = darkMode ? '#6366f1' : '#bfdbfe';
          }

          return (
            <button
              key={idx}
              onClick={() => onSelectIndex(idx)}
              style={{
                height: '42px',
                borderRadius: '0.75rem',
                border: `2px solid ${isActive ? '#4f46e5' : borderColor}`,
                background: bgColor,
                color: textColor,
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                position: 'relative',
                transform: isActive ? 'scale(1.06)' : 'scale(1)',
                boxShadow: isActive ? '0 0 0 3px rgba(79,70,229,0.35)' : 'none',
                zIndex: isActive ? 2 : 1
              }}
            >
              <span>{qNo}</span>
              {isReviewMode && badgeIcon && (
                <span style={{ fontSize: '0.65rem', lineHeight: 1, marginTop: '0.1rem', fontWeight: 900 }}>
                  {badgeIcon}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
