import React, { memo } from 'react';
import { Layers } from 'lucide-react';

/**
 * SectionTabBar
 * Clean horizontal navigation bar for switching between sections in a composite assignment.
 */
export default memo(function SectionTabBar({
  sections = [],
  activeSecIdx = 0,
  onSelectSection,
  sectionAnswers = {},
  isReviewMode = false
}) {
  if (!sections || sections.length <= 1) return null;

  return (
    <div style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '0.4rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      overflowX: 'auto',
      whiteSpace: 'nowrap'
    }}>
      {sections.map((sec, idx) => {
        const isActive = activeSecIdx === idx;
        const sa = sectionAnswers[sec.id] || {};
        const answeredCount = Object.keys(sa.answers || {}).length + Object.keys(sa.openEndedText || {}).filter(k => sa.openEndedText[k]).length;
        const totalCount = sec.qCount || sec.resolvedQuestions?.length || 1;

        return (
          <button
            key={sec.id || idx}
            type="button"
            onClick={() => onSelectSection(idx)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              border: isActive ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
              background: isActive ? '#eff6ff' : '#ffffff',
              color: isActive ? '#1d4ed8' : '#475569',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{sec.title || `${idx + 1}. Bölüm`}</span>
            <span style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.4rem',
              borderRadius: '0.35rem',
              background: isActive ? '#2563eb' : '#f1f5f9',
              color: isActive ? '#ffffff' : '#64748b'
            }}>
              {answeredCount}/{totalCount}
            </span>
          </button>
        );
      })}
    </div>
  );
});
