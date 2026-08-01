import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Globe } from 'lucide-react';

export default function HtmlViewerWithControls({ payload, title = "HTML Dokümanı", height = "100%" }) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 20, 60));
  const handleResetZoom = () => setZoomLevel(100);
  const toggleExpanded = () => setIsExpanded(prev => !prev);

  const isUrl = typeof payload === 'string' && (payload.startsWith('http://') || payload.startsWith('https://') || payload.startsWith('blob:'));

  if (!payload) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#ecfdf5', border: '2px dashed #a7f3d0', borderRadius: '0.75rem', margin: '0.5rem 0' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
          <Globe size={24} />
        </div>
        <p style={{ fontSize: '1rem', fontWeight: 900, color: '#065f46', margin: 0 }}>
          🌐 Bu Test İçin HTML Dokümanı Bulunamadı
        </p>
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
    display: 'flex',
    flexDirection: 'column'
  } : {
    position: 'relative',
    width: '100%',
    height: height,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle}>
      {/* Sleek Minimal Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '0.4rem 0.75rem',
        background: '#064e3b',
        color: 'white',
        flexWrap: 'wrap',
        gap: '0.4rem',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={16} style={{ color: '#6ee7b7' }} />
          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#f8fafc' }}>
            {title} ({zoomLevel}%)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', background: '#022c22', borderRadius: '0.4rem', padding: '0.15rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Küçült (-20%)"
              style={{ background: 'transparent', border: 'none', color: '#a7f3d0', padding: '0.25rem 0.45rem', cursor: 'pointer', borderRadius: '0.25rem', display: 'flex', alignItems: 'center' }}
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Yakınlaştırmayı Sıfırla (%100)"
              style={{ background: 'transparent', border: 'none', color: '#ecfdf5', padding: '0.25rem 0.5rem', cursor: 'pointer', borderRadius: '0.25rem', fontSize: '0.72rem', fontWeight: 800 }}
            >
              <RotateCcw size={12} style={{ marginRight: '0.2rem' }} /> {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              title="Büyüt (+20%)"
              style={{ background: 'transparent', border: 'none', color: '#a7f3d0', padding: '0.25rem 0.45rem', cursor: 'pointer', borderRadius: '0.25rem', display: 'flex', alignItems: 'center' }}
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Fullscreen Expansion Toggle */}
          <button
            type="button"
            onClick={toggleExpanded}
            title={isExpanded ? "Tam Ekrandan Çık" : "Pencereyi Tam Ekran Yap"}
            style={{ background: isExpanded ? '#ef4444' : '#059669', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isExpanded ? 'Küçült' : 'Tam Ekran'}</span>
          </button>
        </div>
      </div>

      {/* Direct HTML Iframe */}
      <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'auto', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <iframe
          key={`${isUrl ? payload : 'html'}-${zoomLevel}`}
          src={isUrl ? payload : undefined}
          srcDoc={!isUrl ? payload : undefined}
          title="HTML Soru Dokümanı"
          style={{
            width: zoomLevel > 100 ? `${zoomLevel}%` : '100%',
            height: zoomLevel > 100 ? `${zoomLevel}%` : '100%',
            minWidth: '100%',
            minHeight: '100%',
            border: 'none',
            background: 'white'
          }}
        />
      </div>
    </div>
  );
}
