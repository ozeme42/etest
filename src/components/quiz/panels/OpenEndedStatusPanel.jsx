import React, { memo } from 'react';
import { Edit3, CheckCircle2, Clock } from 'lucide-react';

/**
 * OpenEndedStatusPanel
 * Right-side question list panel dedicated exclusively to Open-Ended (Written) questions.
 * Shows answer status (Answered / Pending / Blank) without optical bubbles.
 */
export default memo(function OpenEndedStatusPanel({
  qCount = 1,
  openEndedText = {},
  resolvedQuestions = [],
  activeQNo = 1,
  onSelectQuestion
}) {
  const totalCount = Math.max(qCount, resolvedQuestions.length, 1);
  const answeredCount = Object.keys(openEndedText).filter(k => openEndedText[k] && openEndedText[k].trim() !== '').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>
      {/* Panel Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            ✍️ Yazılı Yanıt Listesi
          </h4>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', border: '1px solid #fde68a' }}>
            {answeredCount} / {totalCount} Yazıldı
          </span>
        </div>
      </div>

      {/* Questions Status List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Array.from({ length: totalCount }).map((_, idx) => {
            const qNo = idx + 1;
            const text = openEndedText[qNo];
            const hasText = text && text.trim() !== '';
            const isActive = activeQNo === qNo;

            return (
              <div
                key={qNo}
                onClick={() => onSelectQuestion && onSelectQuestion(qNo)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.75rem',
                  background: isActive ? '#eff6ff' : (hasText ? '#f0fdf4' : '#ffffff'),
                  border: isActive ? '1.5px solid #3b82f6' : (hasText ? '1px solid #bbf7d0' : '1px solid #e2e8f0'),
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isActive ? '#1d4ed8' : '#0f172a' }}>
                    Soru {qNo}
                  </span>
                </div>

                {hasText ? (
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={13} /> Yanıtlandı
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={13} /> Boş
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
