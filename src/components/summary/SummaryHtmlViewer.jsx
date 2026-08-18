import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import './SummaryHtmlViewer.css';

export default function SummaryHtmlViewer({
  htmlContent = '',
  fontSize = 16,
  title = '',
  targetType = 'topic',
  emptyMessage = 'Bu bölüm için henüz özet veya konu anlatımı eklenmemiş.'
}) {
  const { isDark } = useTheme();
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useState(600);

  // Clean and prepare HTML
  const hasContent = Boolean(htmlContent && typeof htmlContent === 'string' && htmlContent.trim());

  // Generate self-contained standalone document for iframe
  const iframeDoc = useMemo(() => {
    if (!hasContent) return '';

    let content = htmlContent.trim();
    const hasFullDoc = content.includes('<html') || content.includes('<!DOCTYPE');

    const customStyles = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 12px 16px !important;
        box-sizing: border-box !important;
      }
      body {
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: ${fontSize}px;
        line-height: 1.8;
        color: ${isDark ? '#e2e8f0' : '#334155'};
        background: ${isDark ? '#0f172a' : '#ffffff'};
        word-break: break-word;
        overflow-wrap: break-word;
      }
      div, table, p, h1, h2, h3, h4, h5, h6, ul, ol, li, pre, blockquote, img, .callout, .note, .box-info {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      h1, h2, h3, h4, h5, h6 {
        color: ${isDark ? '#f8fafc' : '#0f172a'};
        font-weight: 800;
        margin-top: 1.8em;
        margin-bottom: 0.6em;
        line-height: 1.35;
        letter-spacing: -0.02em;
      }
      h1 { font-size: 1.85em; border-bottom: 2px solid ${isDark ? '#334155' : '#e2e8f0'}; padding-bottom: 0.4em; color: ${isDark ? '#e0e7ff' : '#1e1b4b'}; margin-top: 0.5em; }
      h2 { font-size: 1.45em; border-bottom: 1.5px solid ${isDark ? '#1e293b' : '#f1f5f9'}; padding-bottom: 0.35em; color: ${isDark ? '#c7d2fe' : '#312e81'}; }
      h3 { font-size: 1.2em; color: ${isDark ? '#a5b4fc' : '#4338ca'}; }
      h4 { font-size: 1.05em; color: ${isDark ? '#38bdf8' : '#0284c7'}; }
      p { margin-bottom: 1.1em; color: ${isDark ? '#cbd5e1' : '#334155'}; }
      strong, b { color: ${isDark ? '#ffffff' : '#0f172a'}; font-weight: 800; }
      em, i { color: ${isDark ? '#94a3b8' : '#475569'}; font-style: italic; }
      ul, ol { margin-top: 0.4em; margin-bottom: 1.2em; padding-left: 1.6em; color: ${isDark ? '#cbd5e1' : '#334155'}; }
      li { margin-bottom: 0.4em; line-height: 1.7; }
      .callout, .note, .alert, .box-info {
        background: ${isDark ? 'rgba(30, 58, 138, 0.3)' : '#eff6ff'};
        border-left: 4.5px solid #3b82f6;
        border-radius: 0.75rem;
        padding: 1rem 1.25rem;
        margin: 1.25rem 0;
        color: ${isDark ? '#93c5fd' : '#1e3a8a'};
      }
      .callout strong, .note strong, .box-info strong { color: ${isDark ? '#bfdbfe' : '#1d4ed8'}; }
      .callout-success, .box-success, .tip {
        background: ${isDark ? 'rgba(6, 78, 59, 0.3)' : '#ecfdf5'};
        border-left: 4.5px solid #10b981;
        border-radius: 0.75rem;
        padding: 1rem 1.25rem;
        margin: 1.25rem 0;
        color: ${isDark ? '#6ee7b7' : '#064e3b'};
      }
      .callout-warning, .box-warning {
        background: ${isDark ? 'rgba(120, 53, 15, 0.3)' : '#fffbeb'};
        border-left: 4.5px solid #f59e0b;
        border-radius: 0.75rem;
        padding: 1rem 1.25rem;
        margin: 1.25rem 0;
        color: ${isDark ? '#fcd34d' : '#78350f'};
      }
      .callout-formula, .box-formula {
        background: ${isDark ? 'rgba(131, 24, 67, 0.3)' : '#fdf2f8'};
        border-left: 4.5px solid #ec4899;
        border-radius: 0.75rem;
        padding: 1.25rem;
        margin: 1.25rem 0;
        color: ${isDark ? '#f472b6' : '#831843'};
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        text-align: center;
        font-weight: 700;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1.25rem 0;
        border-radius: 0.75rem;
        overflow: hidden;
        border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
        background: ${isDark ? '#1e293b' : '#ffffff'};
      }
      th, td { padding: 0.75rem 1rem; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; text-align: left; }
      th { background: ${isDark ? '#0f172a' : '#f8fafc'}; color: ${isDark ? '#f8fafc' : '#0f172a'}; font-weight: 800; border-bottom: 2px solid ${isDark ? '#475569' : '#cbd5e1'}; }
      tr:nth-child(even) { background: ${isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'}; }
      img { max-width: 100%; height: auto; border-radius: 0.75rem; margin: 1rem auto; display: block; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      blockquote { border-left: 4px solid #6366f1; background: ${isDark ? 'rgba(99, 102, 241, 0.15)' : '#f8fafc'}; padding: 0.75rem 1rem; margin: 1rem 0; color: ${isDark ? '#cbd5e1' : '#475569'}; font-style: italic; }
      code { background: ${isDark ? '#1e293b' : '#f1f5f9'}; padding: 0.2rem 0.4rem; border-radius: 0.35rem; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; color: #f43f5e; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; }
      pre { background: ${isDark ? '#020617' : '#0f172a'}; color: #38bdf8; padding: 1rem; border-radius: 0.75rem; overflow-x: auto; margin: 1rem 0; font-family: 'JetBrains Mono', monospace; }
      pre code { background: transparent; color: inherit; border: none; padding: 0; }
    `;

    if (hasFullDoc) {
      if (content.includes('</head>')) {
        return content.replace('</head>', `<style>${customStyles}</style></head>`);
      }
      return `<style>${customStyles}</style>` + content;
    }

    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    ${customStyles}
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  }, [htmlContent, fontSize, hasContent, isDark]);

  // Auto-resize iframe based on content height
  const handleIframeLoad = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        const doc = iframeRef.current.contentWindow.document;
        if (doc && doc.body) {
          const scrollH = doc.documentElement.scrollHeight || doc.body.scrollHeight;
          if (scrollH > 100) {
            setIframeHeight(scrollH + 40);
          }
        }
      }
    } catch (e) {
      // Cross-origin fallback
    }
  };

  useEffect(() => {
    const timer = setTimeout(handleIframeLoad, 300);
    const timer2 = setTimeout(handleIframeLoad, 1000);
    return () => { clearTimeout(timer); clearTimeout(timer2); };
  }, [iframeDoc]);

  if (!hasContent) {
    return (
      <div className="summary-empty-state">
        <div className="summary-empty-icon">📖</div>
        <h3>{targetType === 'unit' ? 'Ünite Genel Özeti Bulunamadı' : 'Konu Özeti Bulunamadı'}</h3>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="summary-iframe-wrapper">
      <iframe
        ref={iframeRef}
        title={title || 'Ders Özeti'}
        srcDoc={iframeDoc}
        onLoad={handleIframeLoad}
        className="summary-content-iframe"
        style={{ height: `${iframeHeight}px` }}
        sandbox="allow-same-origin allow-scripts allow-popups"
      />
    </div>
  );
}
