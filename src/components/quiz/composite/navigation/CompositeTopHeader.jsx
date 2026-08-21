import React, { memo } from 'react';
import { ArrowLeft, Clock, Pencil, Send } from 'lucide-react';

/**
 * CompositeTopHeader
 * Top navigation header for Composite Homeworks, featuring Timer, Drawing Canvas toggle, and Finish button.
 */
export default memo(function CompositeTopHeader({
  title = 'Birleşik Ödev',
  subtitle = null,
  isComposite = true,
  timeLeft = 0,
  isReviewMode = false,
  isDrawingOpen = false,
  onToggleDrawing,
  onFinishExam,
  onExit
}) {
  const formatTime = (s) => {
    if (!s || isNaN(s)) return '--:--';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = n => String(n).padStart(2, '0');
    return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
  };

  return (
    <div style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    }}>
      {/* Left: Exit + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={onExit}
          style={{
            padding: '0.45rem',
            borderRadius: '0.6rem',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#475569'
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
            {title}
          </h3>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isComposite ? '#2563eb' : '#059669' }}>
            {subtitle || (isComposite ? '📚 Çok Bölümlü Birleşik Ödev Paketi' : '🎯 Ödev Testi')}
          </span>
        </div>
      </div>

      {/* Right: Timer + Drawing + Finish Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {!isReviewMode && timeLeft > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: timeLeft < 300 ? '#fee2e2' : '#f1f5f9',
            color: timeLeft < 300 ? '#dc2626' : '#334155',
            padding: '0.45rem 0.85rem',
            borderRadius: '0.75rem',
            fontWeight: 800,
            fontSize: '0.88rem'
          }}>
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleDrawing}
          style={{
            padding: '0.6rem 1rem',
            borderRadius: '0.75rem',
            border: '1.5px solid #cbd5e1',
            background: isDrawingOpen ? '#eff6ff' : '#ffffff',
            color: isDrawingOpen ? '#2563eb' : '#334155',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Pencil size={15} /> Çizim Tahtası
        </button>

        <button
          type="button"
          onClick={onFinishExam}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(22,163,74,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Send size={15} /> Sınavı Bitir ve Gönder
        </button>
      </div>
    </div>
  );
});
