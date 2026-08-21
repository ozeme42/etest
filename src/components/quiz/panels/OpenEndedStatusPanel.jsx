import React, { memo } from 'react';
import { Edit3, CheckCircle2, Clock } from 'lucide-react';

/**
 * OpenEndedStatusPanel
 * Right-side question list and input panel for Open-Ended (Written) questions in PDF/HTML quiz runners & reviews.
 * Allows students to type and edit their written answers for each question directly next to the document.
 */
export default memo(function OpenEndedStatusPanel({
  qCount = 1,
  openEndedText = {},
  resolvedQuestions = [],
  activeQNo = 1,
  onSelectQuestion,
  onTextChange,
  isReviewMode = false
}) {
  const totalCount = Math.max(qCount, resolvedQuestions.length, 1);
  const answeredCount = Object.keys(openEndedText).filter(k => openEndedText[k] && String(openEndedText[k]).trim() !== '').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>
      {/* Panel Header */}
      <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            ✍️ Yazılı Yanıtlar
          </h4>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            background: answeredCount === totalCount ? '#dcfce7' : '#fef3c7',
            color: answeredCount === totalCount ? '#15803d' : '#b45309',
            padding: '0.2rem 0.55rem',
            borderRadius: '0.4rem',
            border: `1px solid ${answeredCount === totalCount ? '#86efac' : '#fde68a'}`
          }}>
            {answeredCount} / {totalCount} Yanıtlandı
          </span>
        </div>
      </div>

      {/* Questions List with Input Textareas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Array.from({ length: totalCount }).map((_, idx) => {
          const qNo = idx + 1;
          const text = String(openEndedText[qNo] || openEndedText[String(qNo)] || '');
          const hasText = text.trim() !== '';
          const qObj = resolvedQuestions[idx] || {};

          return (
            <div
              key={qNo}
              style={{
                borderRadius: '0.85rem',
                border: hasText ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                background: hasText ? '#f0fdf4' : '#ffffff',
                padding: '0.85rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Question Item Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.4rem',
                    background: hasText ? '#16a34a' : '#0f172a',
                    color: '#ffffff'
                  }}>
                    SORU {qNo}
                  </span>
                  {qObj.title && !qObj.title.startsWith('Soru') && (
                    <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {qObj.title}
                    </span>
                  )}
                </div>

                {hasText ? (
                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={13} /> Yanıtlandı
                  </span>
                ) : (
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={13} /> Boş
                  </span>
                )}
              </div>

              {/* Student Input / Review Content */}
              {!isReviewMode && onTextChange ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <textarea
                    rows={4}
                    value={text}
                    onChange={(e) => onTextChange(qNo, e.target.value)}
                    placeholder={`Soru ${qNo} için çözümünüzü veya yazılı yanıtınızı buraya giriniz...`}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '0.6rem',
                      border: hasText ? '1.5px solid #22c55e' : '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      lineHeight: 1.5,
                      color: '#0f172a',
                      fontFamily: 'inherit',
                      background: '#ffffff',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.7rem', color: '#64748b' }}>
                    <span>{text.length} Karakter</span>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '0.55rem',
                  background: hasText ? '#ffffff' : '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  color: hasText ? '#0f172a' : '#94a3b8',
                  fontStyle: hasText ? 'normal' : 'italic',
                  whiteSpace: 'pre-wrap'
                }}>
                  {hasText ? text : 'Öğrenci yanıt yazmadı (Boş)'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
