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
      
      // Update canvas size
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.lineCap = 'round';
        context.lineJoin = 'round';
        contextRef.current = context;
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
  }, [isDrawingMode]); // Re-init when toggling mode to ensure correct sizing

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

  const startDrawing = (e) => {
    if (!isDrawingMode || !contextRef.current) return;
    const { offsetX, offsetY } = getCoordinates(e);
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
    const { offsetX, offsetY } = getCoordinates(e);
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches && e.touches[0]) {
      return {
        offsetX: e.touches[0].clientX - rect.left,
        offsetY: e.touches[0].clientY - rect.top
      };
    }
    return {
      offsetX: e.nativeEvent.offsetX,
      offsetY: e.nativeEvent.offsetY
    };
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
        {/* The actual content (PDF, Image, Text) */}
        <div style={{ width: '100%', height: '100%' }}>
          {children}
        </div>
        
        {/* The Drawing Canvas overlay */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseMove={draw}
          onMouseLeave={finishDrawing}
          onTouchStart={startDrawing}
          onTouchEnd={finishDrawing}
          onTouchMove={draw}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: isDrawingMode ? 'auto' : 'none',
            cursor: isDrawingMode ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
            zIndex: 50
          }}
        />
      </div>
    </div>
  );
}
