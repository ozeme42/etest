import React, { useState, useEffect, useRef } from 'react';
import { Columns, Rows, X, GripVertical, GripHorizontal, ChevronLeft, ChevronUp } from 'lucide-react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export default function QuizPanelLayout({
  documentContent,
  answerContent,
  panelTitle = "Cevap Paneli",
  panelSubtitle = "Cevaplarınızı buradan işaretleyiniz",
  defaultPosition = 'right',
  defaultSize = 380,
  icon = "🎯"
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [positionState, setPositionState] = useState(defaultPosition);
  const position = isMobile ? 'bottom' : positionState;
  
  const [isOpen, setIsOpen] = useState(true);
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
    <div ref={containerRef} style={{ display: 'flex', flexDirection: position === 'right' ? 'row' : 'column', flex: 1, overflow: 'hidden', background: '#0f172a' }}>
      
      {/* ── LEFT / TOP: Document Viewer ── */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {documentContent}
        
        {/* Floating Open Button when closed */}
        {!isOpen && (
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
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              zIndex: 50
            }}
          >
            {position === 'right' ? <ChevronLeft size={18} /> : <ChevronUp size={18} />}
            Optik Form
          </button>
        )}
      </div>

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
              background: isDragging ? '#6366f1' : '#334155',
              cursor: position === 'right' ? 'col-resize' : 'row-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s ease',
              zIndex: 10
            }}
          >
            {position === 'right' ? <GripVertical size={14} color={isDragging ? 'white' : '#94a3b8'} /> : <GripHorizontal size={14} color={isDragging ? 'white' : '#94a3b8'} />}
          </div>

          {/* Right / Bottom: Answer Panel */}
          <div
            style={{
              width: position === 'right' ? panelSize : '100%',
              height: position === 'right' ? '100%' : panelSize,
              flexShrink: 0,
              background: '#1e293b',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: position === 'right' ? '-8px 0 24px rgba(0,0,0,0.3)' : '0 -8px 24px rgba(0,0,0,0.3)'
            }}
          >
            {/* Header / Controls */}
            <div style={{ padding: isMobile ? '0.45rem 0.75rem' : '0.85rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', flexShrink: 0 }}>
              <div style={{ minWidth: 0, flex: 1, paddingRight: isMobile ? '0.4rem' : '1rem' }}>
                <h3 style={{ margin: 0, fontSize: isMobile ? '0.82rem' : '0.95rem', fontWeight: 900, color: '#38bdf8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {icon} {panelTitle}
                </h3>
                {!isMobile && panelSubtitle && (
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {panelSubtitle}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                {!isMobile && (
                  <>
                    <button
                      onClick={() => setPositionState('right')}
                      title="Sağa Yasla"
                      style={{
                        width: '28px', height: '28px', borderRadius: '0.5rem',
                        background: position === 'right' ? 'rgba(99,102,241,0.2)' : 'transparent',
                        border: `1px solid ${position === 'right' ? '#6366f1' : 'transparent'}`,
                        color: position === 'right' ? '#818cf8' : '#94a3b8',
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
                        background: position === 'bottom' ? 'rgba(99,102,241,0.2)' : 'transparent',
                        border: `1px solid ${position === 'bottom' ? '#6366f1' : 'transparent'}`,
                        color: position === 'bottom' ? '#818cf8' : '#94a3b8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.15s ease'
                      }}
                    >
                      <Rows size={16} />
                    </button>
                    <div style={{ width: '1px', height: '16px', background: '#334155', margin: '0 0.25rem' }} />
                  </>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  title="Gizle"
                  style={{
                    width: '28px', height: '28px', borderRadius: '0.5rem',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid transparent',
                    color: '#f87171',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {answerContent}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
