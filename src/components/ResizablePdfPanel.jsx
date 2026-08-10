import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getEmbedUrl } from './PdfViewerPanel';
import {
  FileText, X, Maximize2, Minimize2, ExternalLink,
  GripVertical, PanelLeft, PanelRight, PanelTop, Layers
} from 'lucide-react';

/**
 * ResizablePdfPanel
 * Modes:
 *   'side'   – docked left panel (fills height, inline with quiz)
 *   'top'    – docked top panel (fills width, inline with quiz)
 *   'float'  – draggable + resizable floating window
 *   'hidden' – completely hidden, only toggle button in header
 *
 * Props:
 *   pdfUrl   – Google Drive or direct PDF URL
 *   title    – panel title
 *   mode     – 'side' | 'float' | 'hidden' (controlled by parent or internal toggle)
 *   onModeChange – callback when mode changes
 *   defaultWidth – initial width when docked (css string, default '48%')
 */
export default function ResizablePdfPanel({
  pdfUrl,
  title = 'Kitap PDF',
  mode = 'side',
  onModeChange,
  defaultWidth = '48%',
  isFullScreen = false
}) {
  const embedUrl = getEmbedUrl(pdfUrl);

  // ── Floating position & size ──────────────────────────────────
  const [floatPos, setFloatPos] = useState({ x: 24, y: 80 });
  const [floatSize, setFloatSize] = useState({ w: 560, h: 520 });

  // ── Dock dimensions (side and bottom mode) ────────────────────
  const [dockWidth, setDockWidth] = useState(defaultWidth);
  const [dockHeight, setDockHeight] = useState('50%');

  // ── Drag state (floating move) ────────────────────────────────
  const dragRef = useRef(null);
  const startDragRef = useRef(null);

  // ── Resize state (floating resize + dock resize) ──────────────
  const resizeRef = useRef(null);
  const dockResizeRef = useRef(null);
  const dockBarRef = useRef(null);

  const changeMode = (m) => { onModeChange?.(m); };

  // ── Float drag ─────────────────────────────────────────────────
  const onDragMouseDown = useCallback((e) => {
    e.preventDefault();
    startDragRef.current = {
      mx: e.clientX, my: e.clientY,
      ox: floatPos.x, oy: floatPos.y,
    };
    const onMove = (ev) => {
      const { mx, my, ox, oy } = startDragRef.current;
      setFloatPos({
        x: Math.max(0, ox + ev.clientX - mx),
        y: Math.max(0, oy + ev.clientY - my),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [floatPos]);

  const onDragTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    startDragRef.current = {
      mx: touch.clientX, my: touch.clientY,
      ox: floatPos.x, oy: floatPos.y,
    };
    const onMove = (ev) => {
      const t = ev.touches[0];
      const { mx, my, ox, oy } = startDragRef.current;
      setFloatPos({
        x: Math.max(0, ox + t.clientX - mx),
        y: Math.max(0, oy + t.clientY - my),
      });
    };
    const onUp = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [floatPos]);

  // ── Float resize ───────────────────────────────────────────────
  const onResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const startW = floatSize.w, startH = floatSize.h;
    const onMove = (ev) => {
      setFloatSize({
        w: Math.max(280, startW + ev.clientX - startX),
        h: Math.max(200, startH + ev.clientY - startY),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [floatSize]);

  const onResizeTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    const startX = touch.clientX, startY = touch.clientY;
    const startW = floatSize.w, startH = floatSize.h;
    const onMove = (ev) => {
      const t = ev.touches[0];
      setFloatSize({
        w: Math.max(280, startW + t.clientX - startX),
        h: Math.max(200, startH + t.clientY - startY),
      });
    };
    const onUp = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [floatSize]);

  // ── Dock divider resize ────────────────────────────────────────
  const onDockDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const parentW = e.currentTarget.closest('[data-quiz-layout]')?.getBoundingClientRect().width || window.innerWidth;
    const startDockPx = (parseFloat(dockWidth) / 100) * parentW;

    const onMove = (ev) => {
      const newPx = Math.max(200, Math.min(parentW - 300, startDockPx + ev.clientX - startX));
      setDockWidth(`${((newPx / parentW) * 100).toFixed(1)}%`);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [dockWidth]);

  const onDockDividerTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    const parentW = e.currentTarget.closest('[data-quiz-layout]')?.getBoundingClientRect().width || window.innerWidth;
    const startDockPx = (parseFloat(dockWidth) / 100) * parentW;

    const onMove = (ev) => {
      const t = ev.touches[0];
      const newPx = Math.max(200, Math.min(parentW - 300, startDockPx + t.clientX - startX));
      setDockWidth(`${((newPx / parentW) * 100).toFixed(1)}%`);
    };
    const onUp = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [dockWidth]);

  // ── Top Dock divider resize ─────────────────────────────────
  const onTopDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const parentH = e.currentTarget.closest('[data-quiz-layout]')?.getBoundingClientRect().height || window.innerHeight;
    const startDockPx = (parseFloat(dockHeight) / 100) * parentH;

    const onMove = (ev) => {
      // e.clientY goes DOWN when making top dock taller, so delta is ev.clientY - startY
      const newPx = Math.max(150, Math.min(parentH - 150, startDockPx + ev.clientY - startY));
      setDockHeight(`${((newPx / parentH) * 100).toFixed(1)}%`);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [dockHeight]);

  const onTopDividerTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    const startY = touch.clientY;
    const parentH = e.currentTarget.closest('[data-quiz-layout]')?.getBoundingClientRect().height || window.innerHeight;
    const startDockPx = (parseFloat(dockHeight) / 100) * parentH;

    const onMove = (ev) => {
      const t = ev.touches[0];
      const newPx = Math.max(150, Math.min(parentH - 150, startDockPx + t.clientY - startY));
      setDockHeight(`${((newPx / parentH) * 100).toFixed(1)}%`);
    };
    const onUp = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [dockHeight]);

  if (!pdfUrl) return null;

  // ──────────────────────────────────────────────────────────────
  // FLOATING MODE
  // ──────────────────────────────────────────────────────────────
  if (mode === 'float') {
    return (
      <div
        ref={dragRef}
        style={{
          position: 'fixed',
          left: floatPos.x,
          top: floatPos.y,
          width: floatSize.w,
          height: floatSize.h,
          zIndex: 9999,
          background: '#0f172a',
          border: '1.5px solid #334155',
          borderRadius: '0.85rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 280,
          minHeight: 200,
          userSelect: 'none',
        }}
      >
        {/* Float header – drag handle */}
        <div
          onMouseDown={onDragMouseDown}
          onTouchStart={onDragTouchStart}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.45rem 0.75rem',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            cursor: 'grab',
            flexShrink: 0,
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <GripVertical size={14} color="#475569" style={{ flexShrink: 0 }} />
            <FileText size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </span>
            <span style={{ fontSize: '0.6rem', background: '#334155', color: '#94a3b8', padding: '1px 5px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>PDF</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <ModeBtn title="Sol Panele Sabitle" onClick={() => changeMode('side')} icon={<PanelLeft size={12} />} />
            <ModeBtn title="Üst Panele Sabitle" onClick={() => changeMode('top')} icon={<PanelTop size={12} />} />
            <ModeBtn title="Yeni Sekmede Aç" href={pdfUrl} icon={<ExternalLink size={12} />} />
            <ModeBtn title="Gizle" onClick={() => changeMode('hidden')} icon={<X size={12} />} danger />
          </div>
        </div>

        {/* PDF iframe */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <iframe
            src={embedUrl}
            title={title}
            allow="autoplay"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#fff' }}
          />
        </div>

        {/* Resize handle – bottom-right corner */}
        <div
          onMouseDown={onResizeMouseDown}
          onTouchStart={onResizeTouchStart}
          style={{
            position: 'absolute', right: 0, bottom: 0,
            width: 20, height: 20,
            cursor: 'nwse-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Boyutu ayarla"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 11L11 1M5 11L11 5M9 11L11 9" stroke="#475569" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // SIDE (DOCKED) MODE
  // ──────────────────────────────────────────────────────────────
  if (mode === 'side') {
    return (
      <>
        <div
          style={{
            width: isFullScreen ? '100%' : dockWidth,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#0f172a',
            borderRight: '1px solid #334155',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Dock header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.45rem 0.75rem',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            flexShrink: 0,
            gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <FileText size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
              </span>
              <span style={{ fontSize: '0.6rem', background: '#334155', color: '#94a3b8', padding: '1px 5px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>PDF</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <ModeBtn title="Üst Panele Sabitle" onClick={() => changeMode('top')} icon={<PanelTop size={12} />} />
              <ModeBtn title="Pencere Yap (Sürüklenebilir)" onClick={() => changeMode('float')} icon={<Maximize2 size={12} />} />
              <ModeBtn title="Yeni Sekmede Aç" href={pdfUrl} icon={<ExternalLink size={12} />} />
              <ModeBtn title="Gizle" onClick={() => changeMode('hidden')} icon={<X size={12} />} danger />
            </div>
          </div>

          {/* PDF iframe */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <iframe
              src={embedUrl}
              title={title}
              allow="autoplay"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#fff' }}
            />
          </div>
        </div>

        {/* Drag divider to resize dock width */}
        {!isFullScreen && (
          <div
            data-dock-divider
            onMouseDown={onDockDividerMouseDown}
            onTouchStart={onDockDividerTouchStart}
            style={{
              width: 6, flexShrink: 0, cursor: 'col-resize',
              background: 'transparent',
              position: 'relative',
              zIndex: 2,
              height: '100%'
            }}
            title="Genişliği ayarla"
          >
            <div style={{
              position: 'absolute', inset: '2px 0', background: '#334155',
              borderRadius: 3,
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#3b82f6'}
              onMouseLeave={e => e.currentTarget.style.background = '#334155'}
            />
          </div>
        )}
      </>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // TOP (DOCKED) MODE
  // ──────────────────────────────────────────────────────────────
  if (mode === 'top') {
    return (
      <>
        <div
          style={{
            height: isFullScreen ? '100%' : dockHeight,
            minHeight: 150,
            display: 'flex',
            flexDirection: 'column',
            background: '#0f172a',
            borderBottom: '1px solid #334155',
            flexShrink: 0,
            overflow: 'hidden',
            width: '100%'
          }}
        >
          {/* Dock header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.45rem 0.75rem',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            flexShrink: 0,
            gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <FileText size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
              </span>
              <span style={{ fontSize: '0.6rem', background: '#334155', color: '#94a3b8', padding: '1px 5px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>PDF</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <ModeBtn title="Sol Panele Sabitle" onClick={() => changeMode('side')} icon={<PanelLeft size={12} />} />
              <ModeBtn title="Pencere Yap (Sürüklenebilir)" onClick={() => changeMode('float')} icon={<Maximize2 size={12} />} />
              <ModeBtn title="Yeni Sekmede Aç" href={pdfUrl} icon={<ExternalLink size={12} />} />
              <ModeBtn title="Gizle" onClick={() => changeMode('hidden')} icon={<X size={12} />} danger />
            </div>
          </div>

          {/* PDF iframe */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <iframe
              src={embedUrl}
              title={title}
              allow="autoplay"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#fff' }}
            />
          </div>
        </div>

        {!isFullScreen && (
          <div
            data-dock-divider
            onMouseDown={onTopDividerMouseDown}
            onTouchStart={onTopDividerTouchStart}
            style={{
              height: 16, flexShrink: 0, cursor: 'row-resize',
              background: '#f8fafc',
              position: 'relative',
              zIndex: 2,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            title="Yüksekliği ayarla"
          >
            <div style={{
              width: 40,
              height: 4,
              background: '#cbd5e1',
              borderRadius: 2,
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#94a3b8'}
              onMouseLeave={e => e.currentTarget.style.background = '#cbd5e1'}
            />
          </div>
        )}
      </>
    );
  }

  // ── hidden – renders nothing (button is in the header of parent) ──
  return null;
}

// ── Small icon button helper ─────────────────────────────────────
function ModeBtn({ title, onClick, href, icon, danger }) {
  const style = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22,
    borderRadius: 5,
    background: danger ? 'rgba(239,68,68,0.15)' : '#334155',
    color: danger ? '#f87171' : '#94a3b8',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 0.12s',
    flexShrink: 0,
  };
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style} title={title}>
        {icon}
      </a>
    );
  }
  return (
    <button onClick={onClick} style={style} title={title}>
      {icon}
    </button>
  );
}
