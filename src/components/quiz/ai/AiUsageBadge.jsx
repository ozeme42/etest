import React, { useState, useEffect } from 'react';
import { Sparkles, History } from 'lucide-react';
import { getAiUsageForQuestion } from '../../../services/aiUsageLogService';

/**
 * AiUsageBadge
 * Discreet badge showing if/how many times a question was solved using AI.
 * Visible on Teacher review and Student review screens for complete transparency.
 */
export default function AiUsageBadge({
  testId,
  questionNo,
  studentId = null,
  compact = false
}) {
  const [usage, setUsage] = useState(() => getAiUsageForQuestion(testId, questionNo, studentId));

  useEffect(() => {
    // Initial fetch
    setUsage(getAiUsageForQuestion(testId, questionNo, studentId));

    // Listen for live update events
    const handleLogUpdate = (e) => {
      const detail = e.detail;
      if (
        detail &&
        String(detail.testId) === String(testId || 'test') &&
        Number(detail.questionNo) === Number(questionNo)
      ) {
        setUsage(detail.entry);
      }
    };

    window.addEventListener('etest_ai_log_updated', handleLogUpdate);
    return () => window.removeEventListener('etest_ai_log_updated', handleLogUpdate);
  }, [testId, questionNo, studentId]);

  if (!usage || !usage.count) return null;

  const count = Number(usage.count) || 1;
  const isMultiple = count > 1;

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const tooltipText = `✨ Yapay Zeka ile ${count} kez çözdürüldü\n• Son: ${formatDate(usage.lastUsedAt)}${usage.mistakeReason ? `\n• Sebep: ${usage.mistakeReason}` : ''}`;

  return (
    <span
      title={tooltipText}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: compact ? '0.12rem 0.4rem' : '0.2rem 0.55rem',
        borderRadius: '6px',
        fontSize: compact ? '0.68rem' : '0.72rem',
        fontWeight: 800,
        background: isMultiple
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(168, 85, 247, 0.15))'
          : 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(124, 58, 237, 0.08))',
        border: `1px solid ${isMultiple ? '#f87171' : '#c084fc'}`,
        color: isMultiple ? '#dc2626' : '#7c3aed',
        cursor: 'help',
        userSelect: 'none',
        transition: 'all 0.15s ease'
      }}
    >
      <Sparkles size={compact ? 11 : 12} color={isMultiple ? '#dc2626' : '#a855f7'} />
      <span>AI {count > 1 ? `(${count}x)` : '✓'}</span>
    </span>
  );
}
