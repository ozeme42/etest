import React, { useState, useMemo } from 'react';
import { ExternalLink, FileText, ChevronDown, ChevronUp, X } from 'lucide-react';

/**
 * Converts various PDF/Google Drive URLs to embeddable iframe src.
 * Supports:
 *  - Google Drive share links (drive.google.com/file/d/FILE_ID/view)
 *  - Google Drive open links (drive.google.com/open?id=FILE_ID)
 *  - Direct PDF URLs (https://...pdf)
 *  - Any other URL (passed through as-is)
 */
export function getEmbedUrl(url) {
  if (!url) return '';
  url = url.trim();

  // Google Drive: /file/d/FILE_ID/view or /file/d/FILE_ID/
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch) {
    return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
  }

  // Google Drive: open?id=FILE_ID
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch) {
    return `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`;
  }

  // Google Docs/Sheets viewer for non-Drive PDFs
  if (url.toLowerCase().endsWith('.pdf') && !url.includes('drive.google.com')) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  }

  // Return as-is for already-embed URLs or unknown
  return url;
}

/**
 * PdfViewerPanel
 * Props:
 *  - pdfUrl: string — the PDF URL (Drive, direct PDF, or embed URL)
 *  - title: string — label shown in header
 *  - defaultOpen: bool — whether panel starts open (default true on desktop)
 *  - className: string — extra CSS class for outer wrapper
 */
export default function PdfViewerPanel({ pdfUrl, title = 'PDF Doküman', defaultOpen = true, className = '' }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [iframeError, setIframeError] = useState(false);

  const embedUrl = useMemo(() => getEmbedUrl(pdfUrl), [pdfUrl]);

  if (!pdfUrl) return null;

  return (
    <div className={className} style={{
      display: 'flex',
      flexDirection: 'column',
      background: '#0f172a',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      border: '1px solid #1e293b',
      minHeight: isOpen ? 320 : 'auto',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0.85rem',
        background: '#1e293b',
        borderBottom: isOpen ? '1px solid #334155' : 'none',
        gap: 8,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <FileText size={15} color='#94a3b8' />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
          <span style={{ fontSize: '0.65rem', background: '#334155', color: '#94a3b8', padding: '1px 6px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>
            PDF
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <a
            href={pdfUrl}
            target='_blank'
            rel='noopener noreferrer'
            title='Yeni sekmede aç'
            style={{ display: 'flex', alignItems: 'center', padding: '3px 6px', borderRadius: 6, background: '#334155', color: '#94a3b8', textDecoration: 'none', fontSize: '0.7rem', fontWeight: 700, gap: 3 }}
          >
            <ExternalLink size={12} /> Aç
          </a>
          <button
            onClick={() => setIsOpen(o => !o)}
            title={isOpen ? 'Küçült' : 'PDF Göster'}
            style={{ display: 'flex', alignItems: 'center', padding: '3px 6px', borderRadius: 6, background: '#334155', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, gap: 3 }}
          >
            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {isOpen ? 'Küçült' : 'Göster'}
          </button>
        </div>
      </div>

      {/* PDF iframe */}
      {isOpen && (
        <div style={{ flex: 1, minHeight: 320, position: 'relative' }}>
          {iframeError ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100%', minHeight: 200, gap: 12, padding: '2rem', textAlign: 'center'
            }}>
              <FileText size={40} color='#475569' />
              <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>PDF yüklenemedi. Google Drive paylaşım iznini kontrol edin.</p>
              <a
                href={pdfUrl}
                target='_blank'
                rel='noopener noreferrer'
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', textDecoration: 'none' }}
              >
                <ExternalLink size={14} /> Yeni Sekmede Aç
              </a>
            </div>
          ) : (
            <iframe
              src={embedUrl}
              title={title}
              allow='autoplay'
              style={{
                width: '100%',
                height: '100%',
                minHeight: 320,
                border: 'none',
                display: 'block',
                background: '#fff',
              }}
              onError={() => setIframeError(true)}
            />
          )}
        </div>
      )}
    </div>
  );
}
