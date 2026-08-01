import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, ExternalLink, FileText } from 'lucide-react';
import { getEmbeddablePdfUrl } from '../utils/pdfUtils';

export default function PdfViewerWithControls({ payload, title = "PDF Dokümanı", height = "600px", onUploadFile }) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);

  const embedUrl = getEmbeddablePdfUrl(payload);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 20, 220));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 20, 60));
  const handleResetZoom = () => setZoomLevel(100);
  const toggleExpanded = () => setIsExpanded(prev => !prev);

  if (!embedUrl) {
    return (
      <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', background: '#fff5f5', border: '2px dashed #fca5a5', borderRadius: '1rem', margin: '1rem 0' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
          <FileText size={28} />
        </div>
        <p style={{ fontSize: '1.1rem', fontWeight: 900, color: '#991b1b', margin: '0 0 0.5rem 0' }}>
          📕 Bu Test İçin PDF Dosyası Yüklü Değil veya Gösterilemiyor
        </p>
        <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: '0 0 1.5rem 0', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
          Lütfen bilgisayarınızdan veya telefonunuzdan bu teste ait PDF dosyasını seçerek hemen yükleyin:
        </p>

        {onUploadFile && (
          <label style={{ cursor: 'pointer', background: '#dc2626', color: 'white', padding: '0.85rem 2rem', borderRadius: '0.85rem', fontWeight: 900, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(220,38,38,0.35)' }}>
            <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => e.target.files && onUploadFile(e.target.files[0])} />
            📁 Bilgisayardan PDF Seç & Yükle
          </label>
        )}
      </div>
    );
  }

  const containerStyle = isExpanded ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    background: '#0f172a',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  } : {
    position: 'relative',
    background: 'white',
    borderRadius: '1rem',
    border: '1.5px solid #cbd5e1',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
    width: '100%',
    height: height,
    display: 'flex',
    flexDirection: 'column'
  };

  return (
    <div style={containerStyle}>
      {/* Sleek Dark PDF Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '0.55rem 1rem',
        background: '#0f172a',
        color: 'white',
        borderBottom: '1px solid #334155',
        flexWrap: 'wrap',
        gap: '0.5rem',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FileText size={18} style={{ color: '#ef4444' }} />
          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f8fafc' }}>
            {title} ({zoomLevel}%)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', background: '#1e293b', borderRadius: '0.5rem', padding: '0.2rem', border: '1px solid #334155', alignItems: 'center' }}>
            <button
              onClick={handleZoomOut}
              title="Küçült (-20%)"
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '0.35rem 0.55rem', cursor: 'pointer', borderRadius: '0.35rem', display: 'flex', alignItems: 'center' }}
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleResetZoom}
              title="Yakınlaştırmayı Sıfırla (%100)"
              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', padding: '0.35rem 0.6rem', cursor: 'pointer', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: 800 }}
            >
              <RotateCcw size={13} style={{ marginRight: '0.2rem' }} /> {zoomLevel}%
            </button>
            <button
              onClick={handleZoomIn}
              title="Büyüt (+20%)"
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '0.35rem 0.55rem', cursor: 'pointer', borderRadius: '0.35rem', display: 'flex', alignItems: 'center' }}
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Fullscreen Expansion Toggle */}
          <button
            onClick={toggleExpanded}
            title={isExpanded ? "Tam Ekrandan Çık" : "Pencereyi Tam Ekran Yap"}
            style={{ background: isExpanded ? '#ef4444' : '#4f46e5', color: 'white', border: 'none', padding: '0.45rem 0.85rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 2px 6px rgba(79,70,229,0.3)' }}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span>{isExpanded ? 'Küçült' : 'Tam Ekran'}</span>
          </button>

          {/* Change File */}
          {onUploadFile && (
            <label style={{ cursor: 'pointer', background: '#dc2626', color: 'white', padding: '0.45rem 0.85rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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
              style={{ background: '#334155', color: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* PDF View Frame */}
      <div style={{ flex: 1, width: '100%', overflow: 'hidden', background: '#525659', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <iframe
          src={`${embedUrl}#zoom=${zoomLevel}`}
          title="PDF Sınav Dokümanı"
          style={{
            width: '100%',
            height: '100%',
            minHeight: isExpanded ? 'calc(100vh - 70px)' : '500px',
            border: 'none',
            transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : 'none',
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-in-out'
          }}
        />
      </div>
    </div>
  );
}
