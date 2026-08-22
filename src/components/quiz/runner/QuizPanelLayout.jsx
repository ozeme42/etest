import React, { useState, useEffect, useRef } from 'react';
import { Columns, Rows, X, GripVertical, GripHorizontal, ChevronLeft, ChevronUp, FileSpreadsheet, Check } from 'lucide-react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export default function QuizPanelLayout({
  documentContent,
  answerContent,
  panelTitle = "Cevap Paneli",
  panelSubtitle = "Cevaplarınızı buradan işaretleyiniz",
  defaultPosition = 'right',
  defaultSize = 360,
  icon = "📋",
  defaultOpenOnMobile = false
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [positionState, setPositionState] = useState(defaultPosition);
  const position = isMobile ? 'bottom' : positionState;
  
  const [isOpen, setIsOpen] = useState(() => {
    const isNowMobile = typeof window !== 'undefined' ? (window.innerWidth <= 768) : false;
    return isNowMobile ? defaultOpenOnMobile : true;
  });

  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (isMobile && !defaultOpenOnMobile) {
        setIsOpen(false);
      }
    }
  }, [isMobile, defaultOpenOnMobile]);

  const [panelSize, setPanelSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Switch default size based on position change if needed
  useEffect(() => {
    if (position === 'right' && panelSize < 260) setPanelSize(360);
    if (position === 'bottom' && panelSize < 180) setPanelSize(320);
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (position === 'right') {
        let newWidth = rect.right - clientX;
        if (newWidth < 260) newWidth = 260;
        if (newWidth > rect.width * 0.75) newWidth = rect.width * 0.75;
        setPanelSize(newWidth);
      } else {
        let newHeight = rect.bottom - clientY;
        if (newHeight < 180) newHeight = 180;
        if (newHeight > rect.height * 0.75) newHeight = rect.height * 0.75;
        setPanelSize(newHeight);
      }
    };

    const onUp = () => setIsDragging(false);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, [isDragging, position]);

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: position === 'right' ? 'row' : 'column', flex: 1, overflow: 'hidden', background: 'var(--color-bg)', position: 'relative', height: '100%', minHeight: 0 }}>
      
      {/* ── MAIN: Document / Question Content ── */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        {documentContent}
        
        {/* Desktop Floating Open Button when closed */}
        {!isMobile && !isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            style={{
              position: 'absolute',
              right: position === 'right' ? 0 : 'auto',
              bottom: position === 'bottom' ? 0 : 'auto',
              top: position === 'right' ? '50%' : 'auto',
              left: position === 'bottom' ? '50%' : 'auto',
              transform: position === 'right' ? 'translateY(-50%)' : 'translateX(-50%)',
              padding: '0.75rem 1.15rem',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: position === 'right' ? '1rem 0 0 1rem' : '1rem 1rem 0 0',
              fontWeight: 900,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 16px rgba(79, 70, 229, 0.35)',
              zIndex: 50
            }}
          >
            {position === 'right' ? <ChevronLeft size={18} /> : <ChevronUp size={18} />}
            <span>Optik Formu Aç</span>
          </button>
        )}
      </div>

      {/* ── MOBILE FLOATING CAPSULE BUTTON (Elevated above bottom navigation bar) ── */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)',
            right: '1rem',
            padding: '0.7rem 1.15rem',
            borderRadius: '2rem',
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 8px 25px rgba(79, 70, 229, 0.5)',
            zIndex: 9999,
            fontWeight: 900,
            fontSize: '0.85rem',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          aria-label="Optik Formu Aç"
        >
          <FileSpreadsheet size={18} />
          <span>Optik Form</span>
        </button>
      )}

      {/* ── MOBILE BOTTOM SHEET MODAL ── */}
      {isMobile && isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(4px)'
        }}>
          {/* Backdrop click to dismiss */}
          <div style={{ flex: 1 }} onClick={() => setIsOpen(false)} />

          {/* Sheet Container */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1.5rem 1.5rem 0 0',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
            maxHeight: '80vh',
            height: '75vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderTop: '1.5px solid var(--color-border)'
          }}>
            {/* Grab Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0 0.25rem' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '99px', background: 'var(--color-border)' }} />
            </div>

            {/* Mobile Sheet Header */}
            <div style={{
              padding: '0.5rem 1rem 0.65rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-surface-hover)'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {icon} {panelTitle}
                </h4>
                {panelSubtitle && (
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    {panelSubtitle}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid var(--color-border-input)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Answer Content */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {answerContent}
            </div>

            {/* Mobile Sheet Bottom Action */}
            <div style={{ padding: '0.65rem 1rem calc(env(safe-area-inset-bottom, 0px) + 0.65rem)', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <Check size={18} /> Sorulara Dön
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP SPLIT PANEL & RESIZER ── */}
      {!isMobile && isOpen && (
        <>
          {/* Resizer Handle */}
          <div
            onMouseDown={() => setIsDragging(true)}
            style={{
              width: position === 'right' ? '6px' : '100%',
              height: position === 'right' ? '100%' : '6px',
              background: isDragging ? '#6366f1' : 'var(--color-border)',
              cursor: position === 'right' ? 'col-resize' : 'row-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s ease',
              zIndex: 10
            }}
          >
            {position === 'right' ? <GripVertical size={14} color={isDragging ? 'white' : 'var(--color-text-muted)'} /> : <GripHorizontal size={14} color={isDragging ? 'white' : 'var(--color-text-muted)'} />}
          </div>

          {/* Right / Bottom: Answer Panel */}
          <div
            style={{
              width: position === 'right' ? panelSize : '100%',
              height: position === 'right' ? '100%' : panelSize,
              flexShrink: 0,
              background: 'var(--color-surface)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: position === 'right' ? '-4px 0 20px rgba(0,0,0,0.06)' : '0 -4px 20px rgba(0,0,0,0.06)',
              borderLeft: position === 'right' ? '1.5px solid var(--color-border)' : 'none',
              borderTop: position === 'bottom' ? '1.5px solid var(--color-border)' : 'none'
            }}
          >
            {/* Header / Controls */}
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface-hover)', flexShrink: 0 }}>
              <div style={{ minWidth: 0, flex: 1, paddingRight: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {icon} {panelTitle}
                </h3>
                {panelSubtitle && (
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {panelSubtitle}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                <button
                  onClick={() => setPositionState('right')}
                  title="Sağa Yasla"
                  style={{
                    width: '28px', height: '28px', borderRadius: '0.5rem',
                    background: position === 'right' ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                    border: `1px solid ${position === 'right' ? '#3b82f6' : 'transparent'}`,
                    color: position === 'right' ? '#3b82f6' : 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  <Columns size={16} />
                </button>
                <button
                  onClick={() => setPositionState('bottom')}
                  title="Alta Yasla"
                  style={{
                    width: '28px', height: '28px', borderRadius: '0.5rem',
                    background: position === 'bottom' ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                    border: `1px solid ${position === 'bottom' ? '#3b82f6' : 'transparent'}`,
                    color: position === 'bottom' ? '#3b82f6' : 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  <Rows size={16} />
                </button>
                <div style={{ width: '1px', height: '16px', background: 'var(--color-border)', margin: '0 0.25rem' }} />
                <button
                  onClick={() => setIsOpen(false)}
                  title="Gizle"
                  style={{
                    width: '28px', height: '28px', borderRadius: '0.5rem',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border-input)',
                    color: 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 0, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', minHeight: 0 }}>
              {answerContent}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
