import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, ExternalLink, FileText, Loader2, Pencil, Eraser, Trash2, X } from 'lucide-react';
import { getEmbeddablePdfUrl } from '../utils/pdfUtils';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Document, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import LazyPdfPage from './quiz/common/LazyPdfPage';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PdfViewerWithControls({ payload, src, filePayload, pdfPayload, title = "PDF Dokümanı", height = "100%", onUploadFile, allowUpload = false, isDrawingOpen = false, onToggleDrawing }) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const wrapperRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Drawing states
  const [drawingTool, setDrawingTool] = useState('pencil');
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const overlayRefs = useRef([]);
  const [containerWidth, setContainerWidth] = useState(0);

  const activePayload = payload || src || filePayload || pdfPayload;

  useEffect(() => {
    const updateWidth = () => {
      if (wrapperRef.current) {
        setContainerWidth(wrapperRef.current.clientWidth);
      }
    };
    setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const embedUrl = useMemo(() => {
    return getEmbeddablePdfUrl(activePayload);
  }, [activePayload]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    overlayRefs.current = Array(numPages).fill(null);
  };

  const clearAllCanvases = () => {
    overlayRefs.current.forEach(ref => ref?.clear());
  };

  const handleZoomIn = (e) => {
    e.preventDefault();
    setZoomLevel(prev => Math.min(prev + 20, 300));
  };
  const handleZoomOut = (e) => {
    e.preventDefault();
    setZoomLevel(prev => Math.max(prev - 20, 40));
  };
  const handleResetZoom = (e) => {
    e.preventDefault();
    setZoomLevel(isMobile ? 80 : 100);
  };
  
  const toggleExpanded = (e) => {
    e.preventDefault();
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(() => setIsExpanded(prev => !prev));
    } else {
      document.exitFullscreen().catch(() => setIsExpanded(prev => !prev));
    }
  };

  if (!embedUrl) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#fff5f5', border: '2px dashed #fca5a5', borderRadius: '0.75rem', margin: '0.5rem 0' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
          <FileText size={24} />
        </div>
        <p style={{ fontSize: '1rem', fontWeight: 900, color: '#991b1b', margin: '0 0 0.25rem 0' }}>
          📕 Bu Test İçin PDF Dokümanı Bulunamadı
        </p>
        <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>
          Sınav dokümanı henüz yüklenmemiş veya erişilemiyor.
        </p>

        {allowUpload && onUploadFile && (
          <label style={{ marginTop: '1rem', cursor: 'pointer', background: '#dc2626', color: 'white', padding: '0.65rem 1.5rem', borderRadius: '0.65rem', fontWeight: 800, fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => e.target.files && onUploadFile(e.target.files[0])} />
            📁 Bilgisayardan PDF Seç & Yükle
          </label>
        )}
      </div>
    );
  }

  const containerStyle = {
    position: 'relative',
    width: '100%',
    height: height,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  return (
    <div ref={wrapperRef} style={containerStyle}>
      {/* Sleek Minimal Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0.2rem 0.5rem' : '0.45rem 0.85rem',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        color: '#0f172a',
        flexWrap: 'nowrap',
        gap: '0.35rem',
        minHeight: isMobile ? '30px' : '42px',
        boxSizing: 'border-box',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', minWidth: 0 }}>
          <FileText size={isMobile ? 13 : 16} style={{ color: '#ef4444', flexShrink: 0 }} />
          {!isMobile && (
            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.25rem' : '0.35rem', flexShrink: 0 }}>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.45rem', padding: '0.1rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Küçült (-20%)"
              style={{ background: 'transparent', border: 'none', color: '#64748b', padding: isMobile ? '0.15rem 0.35rem' : '0.25rem 0.45rem', cursor: 'pointer', borderRadius: '0.25rem', display: 'flex', alignItems: 'center' }}
            >
              <ZoomOut size={isMobile ? 12 : 15} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Yakınlaştırmayı Sıfırla (%100)"
              style={{ background: 'transparent', border: 'none', color: '#0f172a', padding: isMobile ? '0.15rem 0.35rem' : '0.25rem 0.5rem', cursor: 'pointer', borderRadius: '0.25rem', fontSize: isMobile ? '0.68rem' : '0.72rem', fontWeight: 800 }}
            >
              <RotateCcw size={isMobile ? 10 : 12} style={{ marginRight: '0.15rem' }} /> {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              title="Büyüt (+20%)"
              style={{ background: 'transparent', border: 'none', color: '#64748b', padding: isMobile ? '0.15rem 0.35rem' : '0.25rem 0.45rem', cursor: 'pointer', borderRadius: '0.25rem', display: 'flex', alignItems: 'center' }}
            >
              <ZoomIn size={isMobile ? 12 : 15} />
            </button>
          </div>

          {/* Fullscreen Expansion Toggle */}
          <button
            type="button"
            onClick={toggleExpanded}
            title="Pencereyi Tam Ekran Yap"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'white',
              border: 'none',
              padding: isMobile ? '0.2rem 0.45rem' : '0.35rem 0.75rem',
              borderRadius: '0.45rem',
              fontWeight: 800,
              fontSize: isMobile ? '0.68rem' : '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)'
            }}
          >
            {isExpanded ? <Minimize2 size={isMobile ? 12 : 15} /> : <Maximize2 size={isMobile ? 12 : 15} />}
            <span>{isExpanded ? 'Küçült' : (isMobile ? 'Tam Ekran' : 'Tam Ekran')}</span>
          </button>

          {/* Change File */}
          {allowUpload && onUploadFile && (
            <label style={{ cursor: 'pointer', background: '#dc2626', color: 'white', padding: isMobile ? '0.2rem 0.45rem' : '0.35rem 0.75rem', borderRadius: '0.45rem', fontWeight: 800, fontSize: isMobile ? '0.68rem' : '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => e.target.files && onUploadFile(e.target.files[0])} />
              📁 PDF Değiştir
            </label>
          )}

          {/* External Link */}
          {payload && payload.startsWith('http') && (
            <a
              href={payload}
              target="_blank"
              rel="noopener noreferrer"
              title="Yeni Sekmede Aç"
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', padding: '0.35rem 0.55rem', borderRadius: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700 }}
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {/* React PDF Document Container */}
      <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'auto', background: '#525659', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0' }}>
        <Document
          file={embedUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'white' }}>
              <Loader2 size={32} />
              <p>PDF Yükleniyor...</p>
            </div>
          }
          error={
            <div style={{ padding: '3rem', color: '#fca5a5', textAlign: 'center' }}>
              <FileText size={48} style={{ margin: '0 auto 1rem auto' }} />
              <p style={{ fontWeight: 'bold' }}>PDF Yüklenemedi.</p>
              <p style={{ fontSize: '0.85rem' }}>Lütfen dosyayı yenileyin veya tekrar deneyin.</p>
            </div>
          }
        >
          {Array.from(new Array(numPages), (el, index) => (
            <LazyPdfPage
              key={`page_${index + 1}`}
              index={index}
              containerWidth={containerWidth}
              pdfScale={zoomLevel / 100}
              isDrawingMode={isDrawingOpen}
              drawingTool={drawingTool}
              strokeWidth={strokeWidth}
              stylusOnly={false}
              overlayRef={el => overlayRefs.current[index] = el}
            />
          ))}
        </Document>
      </div>

      {/* Floating Drawing Toolbar */}
      {isDrawingOpen && (
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '1.5rem',
          padding: '0.6rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          zIndex: 100
        }}>
          {/* Tools */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setDrawingTool('pencil')}
              style={{
                padding: '0.6rem',
                borderRadius: '50%',
                background: drawingTool === 'pencil' ? '#6366f1' : 'transparent',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => setDrawingTool('eraser')}
              style={{
                padding: '0.6rem',
                borderRadius: '50%',
                background: drawingTool === 'eraser' ? '#f43f5e' : 'transparent',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Eraser size={18} />
            </button>
          </div>
          
          <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.15)' }} />
          
          {/* Colors */}
          {drawingTool === 'pencil' && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff', '#000000'].map(c => (
                <button
                  key={c}
                  onClick={() => setDrawingColor(c)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: c,
                    border: drawingColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    transform: drawingColor === c ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.2s'
                  }}
                />
              ))}
            </div>
          )}

          {drawingTool === 'pencil' && <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.15)' }} />}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={clearAllCanvases}
              style={{
                padding: '0.6rem',
                borderRadius: '50%',
                background: 'transparent',
                color: '#f87171',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Tüm Sayfaları Temizle"
            >
              <Trash2 size={18} />
            </button>
            
            <button
              onClick={() => onToggleDrawing && onToggleDrawing()}
              style={{
                padding: '0.6rem',
                borderRadius: '50%',
                background: 'rgba(244,63,94,0.3)',
                color: '#fecdd3',
                border: '1px solid rgba(244,63,94,0.5)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '0.5rem'
              }}
              title="Çizim Modundan Çık"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

