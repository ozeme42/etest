import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Eraser, Trash2, X, Maximize, Minimize } from 'lucide-react';

export default function DrawingOverlay({ children }) {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [color, setColor] = useState('#EF4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState('pen'); // 'pen' or 'eraser'
  
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const initCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      
      const width = Math.max(rect.width, container.clientWidth, container.offsetWidth || 300);
      const height = Math.max(rect.height, container.clientHeight, container.offsetHeight || 500);

      let tempCanvasData = null;
      if (canvas.width > 0 && canvas.height > 0 && contextRef.current) {
        try {
          tempCanvasData = contextRef.current.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {}
      }

      canvas.width = width;
      canvas.height = height;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        context.lineWidth = lineWidth;
        if (tool === 'eraser') {
          context.globalCompositeOperation = 'destination-out';
        } else {
          context.globalCompositeOperation = 'source-over';
        }
        contextRef.current = context;
        if (tempCanvasData) {
          try {
            context.putImageData(tempCanvasData, 0, 0);
          } catch (e) {}
        }
      }
    };
    
    initCanvas();
    
    const observer = new ResizeObserver(() => {
      initCanvas();
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [isDrawingMode]);

  // Update context when tools change
  useEffect(() => {
    if (!contextRef.current) return;
    contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    contextRef.current.lineWidth = lineWidth;
    
    if (tool === 'eraser') {
      contextRef.current.globalCompositeOperation = 'destination-out';
    } else {
      contextRef.current.globalCompositeOperation = 'source-over';
    }
  }, [color, lineWidth, tool, isDrawingMode]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);
    const clientX = touch ? touch.clientX : (e.clientX !== undefined ? e.clientX : 0);
    const clientY = touch ? touch.clientY : (e.clientY !== undefined ? e.clientY : 0);
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (!isDrawingMode || !contextRef.current) return;
    if (e.preventDefault) e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(e.nativeEvent || e);
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    contextRef.current.arc(offsetX, offsetY, (contextRef.current.lineWidth || 3) / 2, 0, Math.PI * 2);
    contextRef.current.fillStyle = contextRef.current.strokeStyle;
    contextRef.current.fill();
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    if (!isDrawingMode || !contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const draw = (e) => {
    if (!isDrawing || !isDrawingMode || !contextRef.current) return;
    if (e.preventDefault) e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(e.nativeEvent || e);
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const clearCanvas = () => {
    if (!canvasRef.current || !contextRef.current) return;
    contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (wrapperRef.current) wrapperRef.current.requestFullscreen().catch(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().catch(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  return (
    <div 
      ref={wrapperRef} 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        background: isFullscreen ? 'var(--color-bg)' : 'transparent',
        zIndex: isFullscreen ? 99999 : 1
      }}
    >
      
      {/* Drawing Toolbar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '0.5rem', 
        background: isDrawingMode ? 'var(--color-primary)' : 'rgba(0,0,0,0.03)',
        color: isDrawingMode ? 'white' : 'inherit',
        borderRadius: 'var(--border-radius-sm) var(--border-radius-sm) 0 0',
        transition: 'all 0.3s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            className={`btn-icon ${isDrawingMode ? 'active-white' : ''}`} 
            onClick={() => setIsDrawingMode(!isDrawingMode)}
            title={isDrawingMode ? "Çizim Modunu Kapat" : "Çizim Modunu Aç"}
            style={{ 
              background: isDrawingMode ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: isDrawingMode ? 'white' : 'var(--color-text)'
            }}
          >
            {isDrawingMode ? <X size={20} /> : <PenTool size={20} />}
            <span style={{ marginLeft: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
              {isDrawingMode ? 'Çizimi Kapat' : 'Çizim Yap'}
            </span>
          </button>
          
          <button 
            className="btn-icon" 
            onClick={toggleFullscreen}
            title={isFullscreen ? "Tam Ekrandan Çık" : "PDF/HTML Tam Ekran"}
            style={{ 
              background: 'transparent',
              color: isDrawingMode ? 'white' : 'var(--color-text)'
            }}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>

        {isDrawingMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#111827'].map(c => (
                <button
                  key={c}
                  onClick={() => { setTool('pen'); setColor(c); }}
                  style={{
                    width: '24px', height: '24px', borderRadius: '50%', background: c,
                    border: color === c && tool === 'pen' ? '3px solid white' : '2px solid transparent',
                    cursor: 'pointer', outline: 'none', padding: 0
                  }}
                  title="Renk Seç"
                />
              ))}
            </div>
            
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)' }}></div>
            
            <input 
              type="range" 
              min="1" max="15" 
              value={lineWidth} 
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              style={{ width: '80px', accentColor: 'white' }}
              title="Kalınlık"
            />
            
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)' }}></div>
            
            <button 
              className="btn-icon"
              style={{ background: tool === 'eraser' ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white' }}
              onClick={() => setTool('eraser')}
              title="Silgi"
            >
              <Eraser size={20} />
            </button>
            
            <button 
              className="btn-icon"
              style={{ background: 'transparent', color: 'white' }}
              onClick={clearCanvas}
              title="Tümünü Temizle"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Content & Canvas Container */}
      <div 
        ref={containerRef} 
        style={{ 
          position: 'relative', 
          flex: 1, 
          width: '100%', 
          overflow: isDrawingMode ? 'hidden' : 'auto' 
        }}
      >
        {/* The actual content (PDF, HTML iframe, Image, Text) */}
        <div style={{ width: '100%', height: '100%', pointerEvents: isDrawingMode ? 'none' : 'auto' }}>
          {children}
        </div>
        
        {/* The Drawing Canvas overlay */}
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          onPointerLeave={finishDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={finishDrawing}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={finishDrawing}
          onMouseLeave={finishDrawing}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: isDrawingMode ? 'auto' : 'none',
            cursor: isDrawingMode ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
            touchAction: 'none',
            zIndex: 99
          }}
        />
      </div>
    </div>
  );
}
