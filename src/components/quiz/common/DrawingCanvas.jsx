import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Eraser, RotateCcw, Trash2, X, Eye, EyeOff } from 'lucide-react';

export default function DrawingCanvas({ isOpen, onClose }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil'); // 'pencil' | 'eraser'
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    const handleResize = () => {
      const prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.putImageData(prevData, 0, 0);
    };

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', handleResize);
    saveState();

    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Prevent scrolling ONLY on the canvas itself when DrawingCanvas is open and active
  useEffect(() => {
    if (!isOpen || isMinimized) {
      document.body.classList.remove('global-draw-lock');
      return;
    }
    const canvas = canvasRef.current;

    const preventCanvasScroll = (e) => {
      if (e.target === canvas || canvas?.contains(e.target)) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    if (canvas) {
      canvas.addEventListener('touchstart', preventCanvasScroll, { passive: false });
      canvas.addEventListener('touchmove', preventCanvasScroll, { passive: false });
      canvas.addEventListener('wheel', preventCanvasScroll, { passive: false });
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('touchstart', preventCanvasScroll);
        canvas.removeEventListener('touchmove', preventCanvasScroll);
        canvas.removeEventListener('wheel', preventCanvasScroll);
      }
      document.body.classList.remove('global-draw-lock');
    };
  }, [isOpen, isMinimized]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      return [...next, dataUrl];
    });
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex <= 0) {
      clearCanvas();
      return;
    }
    const targetUrl = history[historyIndex - 1];
    const img = new Image();
    img.src = targetUrl;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(prev => prev - 1);
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (isMinimized) return;
    if (e.cancelable && e.type.startsWith('touch')) {
      e.preventDefault();
    }
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || isMinimized) return;
    if (e.cancelable && e.type.startsWith('touch')) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e);

    ctx.lineWidth = tool === 'eraser' ? lineWidth * 6 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveState();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000000, pointerEvents: 'none' }}>
      <style>{`
        .drawing-toolbar-bar {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: auto;
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 1.25rem;
          padding: 0.5rem 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          color: white;
          user-select: none;
          max-width: 96vw;
          box-sizing: border-box;
          z-index: 1000000;
        }
        @media (max-width: 640px) {
          .drawing-toolbar-bar {
            bottom: 0.75rem;
            padding: 0.4rem 0.6rem;
            gap: 0.35rem;
            flex-wrap: wrap;
            justify-content: center;
            border-radius: 1rem;
            max-width: 98vw;
          }
          .drawing-color-palette {
            gap: 0.25rem !important;
          }
          .drawing-color-dot {
            width: 18px !important;
            height: 18px !important;
          }
        }
      `}</style>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{
          width: '100%',
          height: '100%',
          pointerEvents: isMinimized ? 'none' : 'auto',
          touchAction: 'none',
          cursor: tool === 'eraser' ? 'cell' : 'crosshair'
        }}
      />

      <div className="drawing-toolbar-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            onClick={() => setTool('pencil')}
            title="Kalem"
            style={{
              padding: '0.5rem',
              borderRadius: '0.75rem',
              background: tool === 'pencil' ? '#6366f1' : 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Pencil size={18} />
          </button>

          <button
            onClick={() => setTool('eraser')}
            title="Silgi"
            style={{
              padding: '0.5rem',
              borderRadius: '0.75rem',
              background: tool === 'eraser' ? '#f43f5e' : 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Eraser size={18} />
          </button>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)' }} />

        {tool === 'pencil' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#000000', '#ffffff'].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.15s ease'
                }}
              />
            ))}
          </div>
        )}

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={undo}
            title="Geri Al"
            style={{
              padding: '0.5rem',
              borderRadius: '0.75rem',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={clearCanvas}
            title="Tümünü Temizle"
            style={{
              padding: '0.5rem',
              borderRadius: '0.75rem',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Trash2 size={16} />
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Çizimi Aç" : "Çizimi Gizle"}
            style={{
              padding: '0.5rem',
              borderRadius: '0.75rem',
              background: isMinimized ? '#eab308' : 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isMinimized ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          <button
            onClick={onClose}
            title="Çizim Modundan Çık"
            style={{
              padding: '0.5rem',
              borderRadius: '0.75rem',
              background: 'rgba(244,63,94,0.3)',
              border: '1px solid rgba(244,63,94,0.5)',
              color: '#fecdd3',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
