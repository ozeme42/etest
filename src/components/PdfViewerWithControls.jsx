import React, { useState, useRef, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, ExternalLink, FileText } from 'lucide-react';
import { getEmbeddablePdfUrl } from '../utils/pdfUtils';

export default function PdfViewerWithControls({ payload, title = "PDF Dokümanı", height = "100%", onUploadFile, allowUpload = false }) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);
  const wrapperRef = useRef(null);

  const embedUrl = useMemo(() => {
    return getEmbeddablePdfUrl(payload);
  }, [payload]);

  const handleZoomIn = (e) => {
    e.preventDefault();
    setZoomLevel(prev => Math.min(prev + 20, 220));
  };
  const handleZoomOut = (e) => {
    e.preventDefault();
    setZoomLevel(prev => Math.max(prev - 20, 60));
  };
  const handleResetZoom = (e) => {
    e.preventDefault();
    setZoomLevel(100);
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
        <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justify: 'center', margin: '0 auto 0.75rem auto' }}>
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
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  return (
    <div ref={wrapperRef} style={containerStyle}>
      {/* Sleek Minimal Controls Bar - Seamless Edge-to-Edge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '0.4rem 0.75rem',
        background: '#1e293b',
        color: 'white',
        flexWrap: 'wrap',
        gap: '0.4rem',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={16} style={{ color: '#f87171' }} />
          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#f8fafc' }}>
            {title} ({zoomLevel}%)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', background: '#0f172a', borderRadius: '0.4rem', padding: '0.15rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Küçült (-20%)"
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '0.25rem 0.45rem', cursor: 'pointer', borderRadius: '0.25rem', display: 'flex', alignItems: 'center' }}
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Yakınlaştırmayı Sıfırla (%100)"
              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', padding: '0.25rem 0.5rem', cursor: 'pointer', borderRadius: '0.25rem', fontSize: '0.72rem', fontWeight: 800 }}
            >
              <RotateCcw size={12} style={{ marginRight: '0.2rem' }} /> {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              title="Büyüt (+20%)"
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '0.25rem 0.45rem', cursor: 'pointer', borderRadius: '0.25rem', display: 'flex', alignItems: 'center' }}
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Fullscreen Expansion Toggle */}
          <button
            type="button"
            onClick={toggleExpanded}
            title="Pencereyi Tam Ekran Yap"
            style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isExpanded ? 'Küçült' : 'Tam Ekran'}</span>
          </button>

          {/* Change File */}
          {allowUpload && onUploadFile && (
            <label style={{ cursor: 'pointer', background: '#dc2626', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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
              style={{ background: '#334155', color: '#f8fafc', padding: '0.35rem 0.55rem', borderRadius: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700 }}
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {/* Direct Seamless PDF Iframe - Smooth CSS Zoom Without Unmounting */}
      <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'auto', background: '#525659' }}>
        <div
          style={{
            width: `${zoomLevel}%`,
            height: `${zoomLevel}%`,
            minWidth: '100%',
            minHeight: '100%',
            transition: 'width 0.15s ease, height 0.15s ease'
          }}
        >
          <iframe
            key={embedUrl}
            src={embedUrl}
            title="PDF Sınav Dokümanı"
            style={{
              width: '100%',
              height: '100%',
              minWidth: '100%',
              minHeight: '100%',
              border: 'none',
              background: 'white'
            }}
          />
        </div>
      </div>
    </div>
  );
}
