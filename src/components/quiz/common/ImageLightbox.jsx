import React, { useState } from 'react';
import { Maximize2, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('[STORED_IN_') ||
    trimmed.startsWith('[LOCALSTORAGE_') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('data:text/html') ||
    trimmed.startsWith('data:application/pdf') ||
    trimmed.startsWith('%PDF-')
  ) {
    return false;
  }
  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./')
  ) {
    return true;
  }
  if (/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(trimmed)) {
    return true;
  }
  return false;
}

export function StandardImageFrame({ src, alt, title, onOpenFullscreen }) {
  if (!src || !isValidImageUrl(src)) return null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxHeight: '60vh',
        borderRadius: '1rem',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}
    >
      <img
        src={src}
        alt={alt || "Soru Görseli"}
        style={{
          maxWidth: '100%',
          maxHeight: '55vh',
          objectFit: 'contain',
          display: 'block'
        }}
      />
      <button
        onClick={onOpenFullscreen}
        title="Büyüt / Tam Ekran Yap"
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          color: 'white',
          border: 'none',
          borderRadius: '0.75rem',
          padding: '0.5rem 0.75rem',
          fontSize: '0.78rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          transition: 'all 0.2s ease'
        }}
      >
        <Maximize2 size={15} /> Tam Ekran
      </button>
    </div>
  );
}

export default function ImageLightbox({ isOpen, src, alt, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !src) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.3, 0.6));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(11, 15, 25, 0.95)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
    >
      {/* Top Header */}
      <div
        style={{
          position: 'absolute',
          top: '1.25rem',
          left: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'white',
          zIndex: 10001
        }}
      >
        <div style={{ fontWeight: 900, fontSize: '1rem', color: '#a5b4fc' }}>
          🔍 Soru Görsel Detayı (Tam Ekran)
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleZoomIn}
            title="Yakınlaştır"
            style={{
              padding: '0.5rem',
              borderRadius: '0.75rem',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={handleZoomOut}
            title="Uzaklaştır"
            style={{
              padding: '0.5rem',
              borderRadius: '0.75rem',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleRotate}
            title="Döndür"
            style={{
              padding: '0.5rem',
              borderRadius: '0.75rem',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <RotateCw size={18} />
          </button>
          <button
            onClick={onClose}
            title="Kapat"
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '0.75rem',
              background: '#f43f5e',
              border: 'none',
              color: 'white',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <X size={18} /> Kapat
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          padding: '4rem 1rem 1rem 1rem'
        }}
      >
        <img
          src={src}
          alt={alt || "Tam Ekran Görsel"}
          style={{
            maxWidth: '90vw',
            maxHeight: '85vh',
            objectFit: 'contain',
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
            borderRadius: '0.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}
        />
      </div>
    </div>
  );
}
