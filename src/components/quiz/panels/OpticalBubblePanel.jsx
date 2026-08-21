import React, { memo } from 'react';
import { Check } from 'lucide-react';

/**
 * OpticalBubblePanel
 * Right-side optical answer sheet panel dedicated exclusively to Multiple-Choice questions.
 */
export default memo(function OpticalBubblePanel({
  qCount = 1,
  answers = {},
  onSelectOption,
  optionsCount = 4,
  isReviewMode = false,
  resolvedQuestions = [],
  testCtx = {}
}) {
  const options = Number(optionsCount) === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
  const totalCount = Math.max(qCount, resolvedQuestions.length, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>
      {/* Panel Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            📋 Optik Cevap Kağıdı
          </h4>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', border: '1px solid #bfdbfe' }}>
            {Object.keys(answers).length} / {totalCount} Kodlandı
          </span>
        </div>
      </div>

      {/* Optical Bubbles Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Array.from({ length: totalCount }).map((_, idx) => {
            const qNo = idx + 1;
            const userAns = answers[qNo];
            const hasAns = userAns !== undefined && userAns !== null && userAns !== '';

            return (
              <div
                key={qNo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.65rem',
                  background: hasAns ? '#f0fdf4' : '#ffffff',
                  border: hasAns ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Question Number */}
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: hasAns ? '#15803d' : '#64748b', minWidth: '28px' }}>
                  {qNo}.
                </span>

                {/* Option Bubbles */}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {options.map((letter, optIdx) => {
                    const isSelected = userAns === optIdx;
                    return (
                      <button
                        key={letter}
                        type="button"
                        disabled={isReviewMode}
                        onClick={() => onSelectOption && onSelectOption(qNo, optIdx)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: isSelected ? '2px solid #16a34a' : '1.5px solid #cbd5e1',
                          background: isSelected ? '#16a34a' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#334155',
                          fontWeight: 900,
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isReviewMode ? 'default' : 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 2px 6px rgba(22, 163, 74, 0.3)' : 'none'
                        }}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
