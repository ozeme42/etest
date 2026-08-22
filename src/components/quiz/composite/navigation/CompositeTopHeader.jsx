import React, { memo } from 'react';
import { ArrowLeft, Clock, Pencil, CheckCircle2 } from 'lucide-react';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';

/**
 * CompositeTopHeader
 * High-performance, responsive top app bar for Composite & Multi-section Homeworks.
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
  const isMobile = useMediaQuery('(max-width: 768px)');

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '--:--';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = n => String(n).padStart(2, '0');
    return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
  };

  const isLowTime = timeLeft > 0 && timeLeft < 300;

  return (
    <header style={{
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      userSelect: 'none'
    }}>
      {/* Left: Exit + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.85rem', minWidth: 0, flex: 1 }}>
        <button
          type="button"
          onClick={onExit}
          title="Çıkış"
          style={{
            padding: isMobile ? '0.45rem' : '0.55rem',
            borderRadius: '0.75rem',
            border: '1.5px solid var(--color-border-input)',
            background: 'var(--color-surface-hover)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text)',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
        >
          <ArrowLeft size={isMobile ? 18 : 20} />
        </button>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{
            margin: 0,
            fontSize: isMobile ? '0.92rem' : '1.1rem',
            fontWeight: 900,
            color: 'var(--color-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1px' }}>
            <span style={{
              fontSize: isMobile ? '0.68rem' : '0.75rem',
              fontWeight: 800,
              color: isComposite ? '#2563eb' : '#059669',
              background: isComposite ? 'rgba(37,99,235,0.1)' : 'rgba(5,150,105,0.1)',
              padding: '0.1rem 0.45rem',
              borderRadius: '99px',
              whiteSpace: 'nowrap'
            }}>
              {subtitle || (isComposite ? '📚 Çok Bölümlü Paket' : '🎯 Ödev Testi')}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Timer + Drawing + Finish Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.45rem' : '0.75rem', flexShrink: 0 }}>
        {!isReviewMode && timeLeft > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: isLowTime ? '#fee2e2' : 'var(--color-surface-hover)',
            border: `1.5px solid ${isLowTime ? '#fca5a5' : 'var(--color-border)'}`,
            color: isLowTime ? '#dc2626' : 'var(--color-text)',
            padding: isMobile ? '0.35rem 0.6rem' : '0.45rem 0.85rem',
            borderRadius: '0.75rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.78rem' : '0.88rem',
            fontVariantNumeric: 'tabular-nums'
          }}>
            <Clock size={isMobile ? 14 : 16} className={isLowTime ? 'animate-pulse' : ''} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleDrawing}
          title={isDrawingOpen ? "Çizimi Kapat" : "Çizim Aracı"}
          style={{
            padding: isMobile ? '0.4rem 0.6rem' : '0.55rem 0.95rem',
            borderRadius: '0.75rem',
            border: `1.5px solid ${isDrawingOpen ? '#93c5fd' : 'var(--color-border)'}`,
            background: isDrawingOpen ? 'rgba(37,99,235,0.12)' : 'var(--color-surface-hover)',
            color: isDrawingOpen ? '#2563eb' : 'var(--color-text)',
            fontWeight: 800,
            fontSize: isMobile ? '0.78rem' : '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Pencil size={isMobile ? 14 : 16} />
          {!isMobile && (isDrawingOpen ? "Çizimi Kapat" : "Çizim")}
        </button>

        {!isReviewMode && (
          <button
            type="button"
            onClick={onFinishExam}
            style={{
              padding: isMobile ? '0.45rem 0.85rem' : '0.6rem 1.35rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <CheckCircle2 size={isMobile ? 15 : 17} />
            <span>{isMobile ? 'Bitir' : 'Sınavı Bitir ve Gönder'}</span>
          </button>
        )}
      </div>
    </header>
  );
});
