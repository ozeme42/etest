import React, { useState, useEffect, useRef } from 'react';
import { Columns, Rows, X, GripVertical, GripHorizontal, ChevronLeft, ChevronUp, FileSpreadsheet } from 'lucide-react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export default function QuizPanelLayout({
  documentContent,
  answerContent,
  panelTitle = "Cevap Paneli",
  panelSubtitle = "Cevaplarınızı buradan işaretleyiniz",
  defaultPosition = 'right',
  defaultSize = 380,
  icon = "🎯",
  defaultOpenOnMobile = true
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
    if (position === 'right' && panelSize < 250) setPanelSize(380);
    if (position === 'bottom' && panelSize < 150) setPanelSize(300);
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = containerRef.current.getBoundingClientRect();

      if (position === 'right') {
        let newWidth = rect.right - clientX;
        if (newWidth < 250) newWidth = 250;
        if (newWidth > rect.width * 0.8) newWidth = rect.width * 0.8;
        setPanelSize(newWidth);
      } else {
        let newHeight = rect.bottom - clientY;
        if (newHeight < 150) newHeight = 150;
        if (newHeight > rect.height * 0.8) newHeight = rect.height * 0.8;
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
    <div ref={containerRef} style={{ display: 'flex', flexDirection: position === 'right' ? 'row' : 'column', flex: 1, overflow: 'hidden', background: 'var(--color-bg)', position: 'relative' }}>
      
      {/* ── LEFT / TOP: Document Viewer ── */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
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
              padding: '0.65rem 1rem',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: position === 'right' ? '1rem 0 0 1rem' : '1rem 1rem 0 0',
              fontWeight: 900,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
              zIndex: 50
            }}
          >
            {position === 'right' ? <ChevronLeft size={18} /> : <ChevronUp size={18} />}
            Optik Form
          </button>
        )}
      </div>

      {/* ── MOBILE FLOATING TOGGLE BUTTON (ABOVE MOBILE BOTTOM NAV) ── */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(prev => !prev)}
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.25rem)',
            right: '1rem',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isOpen ? '#ef4444' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(79, 70, 229, 0.45)',
            zIndex: 99999,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          title={isOpen ? "Optik Formu Gizle" : "Optik Formu Aç"}
          aria-label="Optik Form"
        >
          {isOpen ? <X size={22} /> : <FileSpreadsheet size={22} />}
        </button>
      )}

      {/* ── RESIZER & ANSWER PANEL ── */}
      {isOpen && (
        <>
          {/* Resizer Handle */}
          <div
            onMouseDown={() => setIsDragging(true)}
            onTouchStart={() => setIsDragging(true)}
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
            {/* Header / Controls (Hidden on mobile if answerContent provides its own full panel) */}
            {!isMobile && (
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
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

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
