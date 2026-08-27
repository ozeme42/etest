import React, { memo, useMemo } from 'react';
import { Check } from 'lucide-react';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';

/**
 * SectionTabBar
 * Clean, app-like horizontal navigation bar for switching between sections in a composite assignment with an overall progress bar.
 */
export default memo(function SectionTabBar({
  sections = [],
  activeSecIdx = 0,
  onSelectSection,
  sectionAnswers = {},
  isReviewMode = false
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  const { totalExamQuestions, totalExamAnswered, progressPct } = useMemo(() => {
    if (!Array.isArray(sections) || sections.length <= 1) {
      return { totalExamQuestions: 0, totalExamAnswered: 0, progressPct: 0 };
    }
    let totQ = 0;
    let totA = 0;
    sections.forEach((sec, idx) => {
      const qCount = sec.qCount || sec.questionCount || sec.resolvedQuestions?.length || sec.questions?.length || 1;
      totQ += qCount;
      const sa = sectionAnswers[idx] ||
                 sectionAnswers[String(idx)] ||
                 sectionAnswers[sec.id] ||
                 (sec.raw?.id && sectionAnswers[sec.raw.id]) ||
                 (sec.title && sectionAnswers[sec.title]) ||
                 {};
      const ansCount = Object.keys(sa.answers || {}).filter(k => sa.answers[k] !== undefined && sa.answers[k] !== null && sa.answers[k] !== '' && sa.answers[k] !== 'empty').length +
                       Object.keys(sa.openEndedText || {}).filter(k => sa.openEndedText[k] && String(sa.openEndedText[k]).trim()).length;
      totA += ansCount;
    });
    const pct = totQ > 0 ? Math.min(100, Math.round((totA / totQ) * 100)) : 0;
    return { totalExamQuestions: totQ, totalExamAnswered: totA, progressPct: pct };
  }, [sections, sectionAnswers]);

  if (!sections || sections.length <= 1) return null;

  return (
    <div style={{ position: 'relative', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
      {/* Glowing Exam Progress Line */}
      <div style={{ width: '100%', height: '3px', background: 'var(--color-surface-hover)', overflow: 'hidden' }}>
        <div style={{
          width: `${progressPct}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #10b981)',
          transition: 'width 0.3s ease',
          boxShadow: '0 0 8px rgba(99,102,241,0.5)'
        }} />
      </div>

      {/* Tab Items Strip */}
      <div style={{
        padding: isMobile ? '0.4rem 0.65rem' : '0.5rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '0.4rem' : '0.6rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          flex: 1
        }}>
          {sections.map((sec, idx) => {
            const isActive = activeSecIdx === idx;
            const sa = sectionAnswers[idx] ||
                       sectionAnswers[String(idx)] ||
                       sectionAnswers[sec.id] ||
                       (sec.raw?.id && sectionAnswers[sec.raw.id]) ||
                       (sec.title && sectionAnswers[sec.title]) ||
                       {};
            const answeredCount = Object.keys(sa.answers || {}).filter(k => sa.answers[k] !== undefined && sa.answers[k] !== null && sa.answers[k] !== '' && sa.answers[k] !== 'empty').length +
                                  Object.keys(sa.openEndedText || {}).filter(k => sa.openEndedText[k] && String(sa.openEndedText[k]).trim()).length;
            const totalCount = sec.qCount || sec.questionCount || sec.resolvedQuestions?.length || sec.questions?.length || 1;
            const isComplete = answeredCount >= totalCount && totalCount > 0;

            return (
              <button
                key={sec.id || idx}
                type="button"
                onClick={() => onSelectSection(idx)}
                style={{
                  padding: isMobile ? '0.42rem 0.7rem' : '0.5rem 0.95rem',
                  borderRadius: '0.75rem',
                  border: `1.5px solid ${isActive ? '#6366f1' : 'var(--color-border)'}`,
                  background: isActive ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.1))' : 'var(--color-surface-hover)',
                  color: isActive ? '#4f46e5' : 'var(--color-text-secondary)',
                  fontWeight: 800,
                  fontSize: isMobile ? '0.78rem' : '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.15)' : 'none'
                }}
              >
                <span style={{ fontWeight: 900 }}>{sec.title || `${idx + 1}. Bölüm`}</span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  padding: '0.12rem 0.45rem',
                  borderRadius: '0.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  background: isComplete ? '#dcfce7' : (isActive ? '#6366f1' : 'var(--color-surface)'),
                  color: isComplete ? '#15803d' : (isActive ? '#ffffff' : 'var(--color-text-muted)'),
                  border: isComplete ? '1px solid #86efac' : '1px solid var(--color-border)'
                }}>
                  {isComplete && <Check size={11} strokeWidth={3} />}
                  {answeredCount}/{totalCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global Mini Stats Pill */}
        {!isMobile && (
          <div style={{
            fontSize: '0.76rem',
            fontWeight: 800,
            color: 'var(--color-text-muted)',
            flexShrink: 0,
            background: 'var(--color-surface-hover)',
            padding: '0.3rem 0.65rem',
            borderRadius: '99px',
            border: '1px solid var(--color-border)'
          }}>
            Genel: <b style={{ color: progressPct === 100 ? '#10b981' : '#4f46e5' }}>{totalExamAnswered}/{totalExamQuestions}</b> (%{progressPct})
          </div>
        )}
      </div>
    </div>
  );
});
