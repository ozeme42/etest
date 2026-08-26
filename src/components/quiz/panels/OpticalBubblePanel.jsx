import React, { memo, useMemo } from 'react';
import { Check, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

/**
 * OpticalBubblePanel
 * Right-side optical answer sheet panel for Multiple-Choice questions.
 * Handles both active quiz answering and detailed review / analysis mode with Correct / Wrong / Blank color coding.
 */
export default memo(function OpticalBubblePanel({
  qCount = 1,
  answers = {},
  onSelectOption,
  optionsCount = 4,
  isReviewMode = false,
  resolvedQuestions = [],
  correctAnswers = [],
  isCorrectMap = {},
  submissionAnswers = [],
  testCtx = {},
  hideHeader = false
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const totalCount = Math.max(qCount, resolvedQuestions.length, Array.isArray(correctAnswers) ? correctAnswers.length : 0, 1);
  const options = Number(optionsCount) === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];

  const normalizeAns = (val) => {
    if (val === null || val === undefined || val === '' || val === 'empty') return null;
    if (typeof val === 'number') return val;
    const str = String(val).trim().toUpperCase();
    if (/^[A-E]$/.test(str)) return str.charCodeAt(0) - 65;
    const num = Number(str);
    return (!isNaN(num) && num >= 0 && num <= 4) ? num : null;
  };

  const resolveEvaluation = (idx) => {
    const qNo = idx + 1;
    const userAns = normalizeAns(answers[qNo] ?? answers[String(qNo)]);
    const hasAns = userAns !== null;
    const q = resolvedQuestions[idx] || {};
    const subAnsObj = (Array.isArray(submissionAnswers) ? submissionAnswers.find(a => Number(a?.questionNo) === qNo || Number(a?.questionNoInSection) === qNo) : null) || submissionAnswers[idx];

    // Determine correct answer
    let cAnsRaw = (Array.isArray(correctAnswers) && correctAnswers[idx] !== undefined)
      ? correctAnswers[idx]
      : (subAnsObj?.correctAnswer ?? subAnsObj?.correctAnswerLetter ?? q.correctAnswer ?? q.answer ?? q.correctOption ?? q.correctAnswerLetter ?? testCtx?.answerKey?.[idx]);

    let correctAns = normalizeAns(cAnsRaw);
    if (correctAns === null && Array.isArray(q.options)) {
      const optIdx = q.options.findIndex(o => typeof o === 'object' && o !== null && (o.isCorrect === true || o.correct === true));
      if (optIdx !== -1) correctAns = optIdx;
    }

    // Determine isCorrect
    let isCorrect = null;
    if (isReviewMode && hasAns) {
      if (isCorrectMap && isCorrectMap[qNo] !== undefined && isCorrectMap[qNo] !== null) {
        isCorrect = isCorrectMap[qNo];
      } else if (correctAns !== null && correctAns !== undefined) {
        isCorrect = (userAns === correctAns);
      } else if (subAnsObj?.isCorrect !== undefined && subAnsObj?.isCorrect !== null) {
        isCorrect = subAnsObj.isCorrect;
      } else if (q && Object.keys(q).length > 0) {
        isCorrect = checkIsAnswerCorrect(userAns, q.raw || q, testCtx?.raw || testCtx, qNo);
      } else if (cAnsRaw !== undefined && cAnsRaw !== null) {
        const normC = normalizeAns(cAnsRaw);
        isCorrect = normC !== null ? (userAns === normC) : null;
      }
    }

    return { qNo, userAns, hasAns, correctAns, isCorrect };
  };

  // Review stats
  const reviewStats = useMemo(() => {
    if (!isReviewMode) return null;
    let d = 0;
    let y = 0;
    let b = 0;

    for (let i = 0; i < totalCount; i++) {
      const { hasAns, isCorrect } = resolveEvaluation(i);
      if (!hasAns) {
        b++;
      } else if (isCorrect === true) {
        d++;
      } else {
        y++;
      }
    }
    const successRate = totalCount > 0 ? Math.round((d / totalCount) * 100) : 0;
    return { d, y, b, successRate };
  }, [isReviewMode, answers, resolvedQuestions, correctAnswers, isCorrectMap, submissionAnswers, totalCount, testCtx]);

  const answeredCount = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== null && answers[k] !== '' && answers[k] !== 'empty').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-surface)' }}>
      {/* Panel Header */}
      {!hideHeader && (
        <div style={{ padding: isMobile ? '0.65rem 0.85rem' : '0.85rem 1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-hover)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isReviewMode ? '0.45rem' : 0 }}>
            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📋 {isReviewMode ? 'Optik Değerlendirme' : 'Optik Cevap Kağıdı'}
            </h4>
            {!isReviewMode ? (
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 900,
                background: answeredCount === totalCount ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.12)',
                color: answeredCount === totalCount ? '#10b981' : '#6366f1',
                padding: '0.2rem 0.55rem',
                borderRadius: '0.4rem',
                border: `1px solid ${answeredCount === totalCount ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`
              }}>
                {answeredCount} / {totalCount} Kodlandı
              </span>
            ) : (
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                background: (reviewStats?.successRate || 0) >= 50 ? '#dcfce7' : '#fee2e2',
                color: (reviewStats?.successRate || 0) >= 50 ? '#15803d' : '#b91c1c',
                padding: '0.2rem 0.55rem',
                borderRadius: '0.4rem'
              }}>
                %{reviewStats?.successRate || 0} Başarı
              </span>
            )}
          </div>

          {/* Review summary badges in header */}
          {isReviewMode && reviewStats && (
            <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 800 }}>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '0.35rem', border: '1px solid #86efac' }}>
                {reviewStats.d} Doğru
              </span>
              <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.15rem 0.45rem', borderRadius: '0.35rem', border: '1px solid #fca5a5' }}>
                {reviewStats.y} Yanlış
              </span>
              <span style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', padding: '0.15rem 0.45rem', borderRadius: '0.35rem', border: '1px solid var(--color-border)' }}>
                {reviewStats.b} Boş
              </span>
            </div>
          )}
        </div>
      )}

      {/* Optical Bubbles Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0.65rem' : '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {Array.from({ length: totalCount }).map((_, idx) => {
            const { qNo, userAns, hasAns, correctAns, isCorrect } = resolveEvaluation(idx);

            let rowBg = 'var(--color-surface)';
            let rowBorder = '1px solid var(--color-border)';

            if (isReviewMode) {
              if (!hasAns) {
                rowBg = 'var(--color-surface-hover)';
                rowBorder = '1px solid var(--color-border)';
              } else if (isCorrect === true) {
                rowBg = 'rgba(16,185,129,0.08)';
                rowBorder = '1px solid rgba(16,185,129,0.3)';
              } else if (isCorrect === false) {
                rowBg = 'rgba(239,68,68,0.08)';
                rowBorder = '1px solid rgba(239,68,68,0.3)';
              }
            } else if (hasAns) {
              rowBg = 'rgba(99,102,241,0.06)';
              rowBorder = '1px solid rgba(99,102,241,0.25)';
            }

            return (
              <div
                key={qNo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isMobile ? '0.4rem 0.6rem' : '0.45rem 0.75rem',
                  borderRadius: '0.65rem',
                  background: rowBg,
                  border: rowBorder,
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Question Number & Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{
                    fontSize: isMobile ? '0.8rem' : '0.85rem',
                    fontWeight: 900,
                    color: isReviewMode ? (isCorrect === true ? '#10b981' : (isCorrect === false ? '#ef4444' : 'var(--color-text-muted)')) : (hasAns ? '#6366f1' : 'var(--color-text-secondary)'),
                    minWidth: '24px'
                  }}>
                    {qNo}.
                  </span>
                  {isReviewMode && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>
                      {!hasAns ? (
                        <span style={{ color: 'var(--color-text-muted)' }}>Boş</span>
                      ) : isCorrect === true ? (
                        <span style={{ color: '#10b981' }}>✓</span>
                      ) : (
                        <span style={{ color: '#ef4444' }}>✗</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Option Bubbles */}
                <div style={{ display: 'flex', gap: isMobile ? '0.3rem' : '0.4rem' }}>
                  {options.map((letter, optIdx) => {
                    const isSelected = userAns === optIdx;
                    const isKeyOption = isReviewMode && correctAns === optIdx;

                    let btnBg = 'var(--color-surface)';
                    let btnBorder = '1.5px solid var(--color-border-input)';
                    let btnColor = 'var(--color-text)';

                    if (isReviewMode) {
                      if (isSelected) {
                        if (isCorrect === true) {
                          btnBg = '#16a34a';
                          btnBorder = '2px solid #16a34a';
                          btnColor = '#ffffff';
                        } else {
                          btnBg = '#dc2626';
                          btnBorder = '2px solid #dc2626';
                          btnColor = '#ffffff';
                        }
                      } else if (isKeyOption && !isCorrect) {
                        // Highlight the correct answer if student got wrong or left blank
                        btnBg = '#dcfce7';
                        btnBorder = '2px solid #16a34a';
                        btnColor = '#15803d';
                      }
                    } else if (isSelected) {
                      btnBg = 'linear-gradient(135deg, #6366f1, #4f46e5)';
                      btnBorder = '2px solid #4f46e5';
                      btnColor = '#ffffff';
                    }

                    const bubbleSize = isMobile ? '32px' : '30px';

                    return (
                      <button
                        key={letter}
                        type="button"
                        disabled={isReviewMode}
                        onClick={() => onSelectOption && onSelectOption(qNo, isSelected ? null : optIdx)}
                        style={{
                          width: bubbleSize,
                          height: bubbleSize,
                          borderRadius: '50%',
                          border: btnBorder,
                          background: btnBg,
                          color: btnColor,
                          fontWeight: 900,
                          fontSize: isMobile ? '0.82rem' : '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isReviewMode ? 'default' : 'pointer',
                          transition: 'all 0.12s ease',
                          boxShadow: isSelected ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                          touchAction: 'manipulation'
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
