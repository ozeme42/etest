import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, ExternalLink,
  FileText, Loader2, Pencil, Eraser, Trash2, X, ChevronLeft, ChevronRight,
  BookOpen, Layers
} from 'lucide-react';
import { getEmbeddablePdfUrl } from '../utils/pdfUtils';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { idbGetPayload } from '../services/indexedDbService';
import { Document, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import LazyPdfPage from './quiz/common/LazyPdfPage';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PdfViewerWithControls({
  payload,
  src,
  filePayload,
  pdfPayload,
  pdfUrl,
  url,
  id,
  testId,
  title = "PDF Dokümanı",
  height = "100%",
  onUploadFile,
  allowUpload = false,
  isDrawingOpen = false,
  onToggleDrawing,
  initialPage = 1,
  defaultPageViewMode = 'continuous'
}) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage || 1);
  const [pageViewMode, setPageViewMode] = useState(defaultPageViewMode); // 'continuous' | 'single'
  const wrapperRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Drawing states
  const [drawingTool, setDrawingTool] = useState('pencil');
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const overlayRefs = useRef([]);
  const [containerWidth, setContainerWidth] = useState(0);

  const rawInput = payload || src || filePayload || pdfPayload || pdfUrl || url;
  const [idbLoadedPayload, setIdbLoadedPayload] = useState(null);

  // Reset page when payload/id changes
  useEffect(() => {
    setCurrentPage(1);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [id, testId, rawInput]);

  useEffect(() => {
    let isMounted = true;
    const isDirect = rawInput && typeof rawInput === 'string' && rawInput.trim().length > 0 && !rawInput.includes('[STORED_IN_INDEXEDDB]') && !rawInput.includes('[LOCALSTORAGE_CACHE]');
    if (isDirect) return;

    async function loadIdb() {
      const keys = [id, testId, rawInput?.replace(/\[STORED_IN_INDEXEDDB\]/g, '')].filter(Boolean);
      for (const k of keys) {
        const cleanK = String(k);
        const variants = [cleanK, cleanK.replace(/^q_?/, ''), cleanK.replace(/^test_?/, ''), `q_${cleanK.replace(/^q_?/, '')}`, `test_${cleanK.replace(/^test_?/, '')}`];
        for (const candidate of variants) {
          try {
            const val = await idbGetPayload(candidate);
            if (val && typeof val === 'string' && val.length > 10 && !val.includes('[STORED_IN_INDEXEDDB]') && isMounted) {
              setIdbLoadedPayload(val);
              return;
            }
          } catch {}
        }
      }
    }
    loadIdb();
    return () => { isMounted = false; };
  }, [rawInput, id, testId]);

  const activePayload = (rawInput && !rawInput.includes('[STORED_IN_INDEXEDDB]')) ? rawInput : (idbLoadedPayload || rawInput);

  useEffect(() => {
    const target = scrollContainerRef.current || wrapperRef.current;
    if (!target) return;

    const updateSize = () => {
      const el = scrollContainerRef.current || wrapperRef.current;
      if (el && el.clientWidth > 50) {
        setContainerWidth(el.clientWidth);
      }
    };

    updateSize();

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 50) {
            setContainerWidth(Math.floor(w));
          }
        }
      });
      ro.observe(target);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const embedUrl = useMemo(() => {
    return getEmbeddablePdfUrl(activePayload);
  }, [activePayload]);

  const isIframeUrl = useMemo(() => {
    if (!embedUrl || typeof embedUrl !== 'string') return false;
    return (
      embedUrl.includes('drive.google.com') ||
      embedUrl.includes('docs.google.com') ||
      embedUrl.includes('dropbox.com') ||
      embedUrl.includes('onedrive.live.com') ||
      embedUrl.includes('1drv.ms') ||
      embedUrl.includes('/preview')
    );
  }, [embedUrl]);

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

  const scrollToPage = (targetPage) => {
    if (pageViewMode === 'single') {
      setCurrentPage(targetPage);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    } else {
      setCurrentPage(targetPage);
      const el = document.getElementById(`pdf-page-${targetPage}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handlePrevPage = () => {
    const next = Math.max(1, currentPage - 1);
    scrollToPage(next);
  };

  const handleNextPage = () => {
    const next = Math.min(numPages || 1, currentPage + 1);
    scrollToPage(next);
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

  const toolbarStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.4rem 0.75rem',
    background: '#1e293b',
    color: '#ffffff',
    borderBottom: '1px solid #334155',
    flexShrink: 0,
    zIndex: 10,
    gap: '0.5rem',
    flexWrap: 'wrap'
  };

  const btnStyle = {
    background: 'transparent',
    border: 'none',
    color: '#cbd5e1',
    cursor: 'pointer',
    padding: '0.35rem',
    borderRadius: '0.35rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease'
  };

  const activeBtnStyle = {
    ...btnStyle,
    background: '#3b82f6',
    color: '#ffffff'
  };

  return (
    <div ref={wrapperRef} style={containerStyle}>
      {/* Top Toolbar */}
      <div style={toolbarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? '110px' : '200px' }}>
            {title}
          </span>
          {numPages && (
            <span style={{ fontSize: '0.72rem', background: '#334155', color: '#94a3b8', padding: '0.15rem 0.45rem', borderRadius: '0.25rem', fontWeight: 700 }}>
              {numPages} Sayfa
            </span>
          )}
        </div>

        {/* Page Navigation Controls (Works in both continuous scroll & single-page view) */}
        {numPages && numPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: '#0f172a', padding: '2px 6px', borderRadius: '0.45rem', border: '1px solid #334155' }}>
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                style={{ ...btnStyle, opacity: currentPage <= 1 ? 0.35 : 1, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', padding: '2px' }}
                title="Önceki Sayfa"
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f8fafc', padding: '0 4px', whiteSpace: 'nowrap' }}>
                Sayfa {currentPage} / {numPages}
              </span>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                style={{ ...btnStyle, opacity: currentPage >= numPages ? 0.35 : 1, cursor: currentPage >= numPages ? 'not-allowed' : 'pointer', padding: '2px' }}
                title="Sonraki Sayfa"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* View Mode Toggle: Akıcı Liste (Pencere İçi Kaydırma) vs Tek Sayfa */}
            <button
              type="button"
              onClick={() => setPageViewMode(m => m === 'single' ? 'continuous' : 'single')}
              style={{
                ...btnStyle,
                background: pageViewMode === 'continuous' ? '#334155' : '#475569',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.25rem 0.55rem',
                borderRadius: '0.45rem',
                gap: '0.3rem',
                display: 'flex',
                alignItems: 'center'
              }}
              title={pageViewMode === 'continuous' ? "Tek tek sayfa göster" : "Tüm sayfaları pencere içinde alt alta kaydır"}
            >
              {pageViewMode === 'continuous' ? <Layers size={13} /> : <BookOpen size={13} />}
              <span style={{ fontSize: '0.72rem' }}>{pageViewMode === 'continuous' ? 'Akıcı Liste' : 'Tek Sayfa'}</span>
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {/* Zoom Controls */}
          <button type="button" onClick={handleZoomOut} style={btnStyle} title="Uzaklaştır">
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1', minWidth: '36px', textAlign: 'center' }}>
            %{zoomLevel}
          </span>
          <button type="button" onClick={handleZoomIn} style={btnStyle} title="Yakınlaştır">
            <ZoomIn size={16} />
          </button>
          <button type="button" onClick={handleResetZoom} style={btnStyle} title="Sıfırla">
            <RotateCcw size={14} />
          </button>

          <div style={{ width: '1px', height: '16px', background: '#475569', margin: '0 0.25rem' }} />

          {/* Drawing toggle */}
          {onToggleDrawing && (
            <button
              type="button"
              onClick={onToggleDrawing}
              style={isDrawingOpen ? activeBtnStyle : btnStyle}
              title={isDrawingOpen ? "Çizimi Kapat" : "Üzerine Çizim Yap"}
            >
              <Pencil size={15} />
            </button>
          )}

          {/* Fullscreen */}
          <button type="button" onClick={toggleExpanded} style={btnStyle} title="Tam Ekran">
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Drawing Toolbar Overlay if active */}
      {isDrawingOpen && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '0.35rem 0.75rem',
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
          zIndex: 10
        }}>
          <button
            type="button"
            onClick={() => setDrawingTool('pencil')}
            style={drawingTool === 'pencil' ? activeBtnStyle : btnStyle}
            title="Kalem"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => setDrawingTool('eraser')}
            style={drawingTool === 'eraser' ? activeBtnStyle : btnStyle}
            title="Silgi"
          >
            <Eraser size={14} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#000000'].map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setDrawingColor(color)}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: color,
                  border: drawingColor === color ? '2px solid #ffffff' : '1px solid #475569',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={clearAllCanvases}
            style={btnStyle}
            title="Tüm Çizimleri Temizle"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* PDF View Container */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'auto',
          background: '#334155',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1rem',
          gap: '1rem',
          position: 'relative'
        }}
      >
        {!embedUrl ? (
          <div style={{ color: '#94a3b8', padding: '3rem 1.5rem', textAlign: 'center', maxWidth: 450 }}>
            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '0.5rem' }}>Geçerli Bir PDF Dokümanı Bulunamadı</p>
            <p style={{ fontSize: '0.85rem' }}>Bu içerik PDF formatında değil veya doküman kaynağı henüz yüklenemedi.</p>
          </div>
        ) : isIframeUrl ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '550px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.4rem 0.75rem',
              background: '#1e293b',
              borderRadius: '0.5rem 0.5rem 0 0',
              borderBottom: '1px solid #334155',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <FileText size={14} /> {title || "PDF Dokümanı"}
              </span>
              <a
                href={embedUrl.replace(/\/preview$/, '/view')}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#60a5fa',
                  textDecoration: 'none',
                  background: 'rgba(59, 130, 246, 0.15)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '0.35rem'
                }}
              >
                <ExternalLink size={13} /> Yeni Sekmede Aç ↗
              </a>
            </div>
            <iframe
              src={embedUrl}
              title={title || "PDF Dokümanı"}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '550px',
                border: 'none',
                background: '#ffffff',
                borderRadius: '0 0 0.5rem 0.5rem',
                flex: 1
              }}
              allow="autoplay"
            />
          </div>
        ) : (
          <Document
            file={embedUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff', padding: '2rem' }}>
                <Loader2 className="animate-spin" size={24} />
                <span>PDF Dokümanı Yükleniyor...</span>
              </div>
            }
            error={
              <div style={{ color: '#fca5a5', padding: '2rem', textAlign: 'center' }}>
                PDF Dokümanı yüklenirken bir sorun oluştu.
              </div>
            }
          >
            {pageViewMode === 'single' ? (
            /* Single Page View: renders only the selected page */
            <LazyPdfPage
              key={`page_${currentPage}`}
              index={currentPage - 1}
              pageNumber={currentPage}
              scale={zoomLevel / 100}
              pdfScale={zoomLevel / 100}
              containerWidth={containerWidth || 800}
              isDrawingOpen={isDrawingOpen}
              isDrawingMode={isDrawingOpen}
              drawingTool={drawingTool}
              drawingColor={drawingColor}
              strokeWidth={strokeWidth}
              overlayRef={el => { overlayRefs.current[currentPage - 1] = el; }}
            />
          ) : (
            /* Continuous Multi-Page View */
            Array.from(new Array(numPages || 0), (_, index) => (
              <LazyPdfPage
                key={`page_${index + 1}`}
                index={index}
                pageNumber={index + 1}
                scale={zoomLevel / 100}
                pdfScale={zoomLevel / 100}
                containerWidth={containerWidth || 800}
                isDrawingOpen={isDrawingOpen}
                isDrawingMode={isDrawingOpen}
                drawingTool={drawingTool}
                drawingColor={drawingColor}
                strokeWidth={strokeWidth}
                overlayRef={el => { overlayRefs.current[index] = el; }}
              />
            ))
          )}
        </Document>
        )}

        {/* Floating Bottom Page Switcher Pill for Single-Page Mode */}
        {numPages && numPages > 1 && pageViewMode === 'single' && (
          <div style={{
            position: 'sticky',
            bottom: '0.5rem',
            zIndex: 20,
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            borderRadius: '9999px',
            padding: '0.35rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            userSelect: 'none'
          }}>
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage <= 1 ? 0.35 : 1,
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
              title="Önceki Sayfa"
            >
              <ChevronLeft size={18} />
            </button>

            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap' }}>
              Sayfa {currentPage} / {numPages}
            </span>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: currentPage >= numPages ? 'not-allowed' : 'pointer',
                opacity: currentPage >= numPages ? 0.35 : 1,
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
              title="Sonraki Sayfa"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
