import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Globe } from 'lucide-react';

export function formatMarkdownToHtml(markdown) {
  if (!markdown || typeof markdown !== 'string') return '';

  let html = markdown;

  // Transform pipe-based tables into HTML tables cleanly
  const lines = html.split('\n');
  const processedLines = [];
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Check if line looks like table row (contains multiple |)
    const isPipeRow = line.startsWith('|') || (line.includes('|') && line.split('|').length >= 3);
    const isPurePipes = /^\|+$/.test(line.replace(/\s+/g, ''));

    if (isPurePipes) {
      // Ignore useless raw empty pipe separators like ||||||||||||
      continue;
    }

    if (isPipeRow) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1 || (!line.startsWith('|') && c));
      if (cells.length > 0) {
        const isHeaderSep = cells.every(c => /^[-:]+$/.test(c));
        if (!isHeaderSep) {
          tableRows.push(cells);
        }
      }
    } else {
      if (inTable) {
        // Output formatted table
        if (tableRows.length > 0) {
          let tableHtml = '<div class="table-container"><table class="data-table"><tbody>';
          tableRows.forEach((row, rIdx) => {
            tableHtml += `<tr>${row.map(c => `<td class="${rIdx === 0 ? 'header-cell' : 'data-cell'}">${c}</td>`).join('')}</tr>`;
          });
          tableHtml += '</tbody></table></div>';
          processedLines.push(tableHtml);
        }
        inTable = false;
        tableRows = [];
      }
      if (line) {
        // Check for chapter headers e.g. "1. BÖLÜM"
        if (/^\d+\.\s*BÖLÜM/i.test(line)) {
          processedLines.push(`<div class="chapter-header">${line}</div>`);
        } else if (/^#+\s/.test(line)) {
          const hLevel = line.match(/^#+/)[0].length;
          const hText = line.replace(/^#+\s*/, '');
          processedLines.push(`<h${Math.min(hLevel + 1, 4)}>${hText}</h${Math.min(hLevel + 1, 4)}>`);
        } else {
          processedLines.push(`<p>${line}</p>`);
        }
      }
    }
  }

  if (inTable && tableRows.length > 0) {
    let tableHtml = '<div class="table-container"><table class="data-table"><tbody>';
    tableRows.forEach((row, rIdx) => {
      tableHtml += `<tr>${row.map(c => `<td class="${rIdx === 0 ? 'header-cell' : 'data-cell'}">${c}</td>`).join('')}</tr>`;
    });
    tableHtml += '</tbody></table></div>';
    processedLines.push(tableHtml);
  }

  return processedLines.join('\n');
}

export function wrapInStyledHtmlDocument(content, title = 'Döküman / Soru') {
  if (!content) return '';
  if (content.includes('<!DOCTYPE') || content.includes('<html') || content.includes('<body')) {
    return content;
  }

  const parsedBody = formatMarkdownToHtml(content);

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.75;
      color: #1e293b;
      background: #f8fafc;
      padding: 1.5rem;
    }
    .doc-container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 2.25rem;
      border-radius: 1rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .chapter-header {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      font-weight: 900;
      font-size: 1.15rem;
      padding: 0.75rem 1.25rem;
      border-radius: 0.75rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
    }
    h1, h2, h3, h4 { color: #0f172a; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 800; }
    p { margin-bottom: 1rem; font-size: 1.02rem; color: #334155; }
    .table-container {
      width: 100%;
      overflow-x: auto;
      margin: 1.5rem 0;
      border-radius: 0.75rem;
      border: 1px solid #cbd5e1;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
      background: white;
    }
    .data-table td {
      padding: 0.85rem 1.1rem;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    .header-cell {
      background: #f1f5f9;
      font-weight: 800;
      color: #1e293b;
    }
    .data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; }
  </style>
</head>
<body>
  <div class="doc-container">
    ${parsedBody}
  </div>
</body>
</html>`;
}

function resolveIframeContent(payload) {
  if (!payload || typeof payload !== 'string') return { src: undefined, srcDoc: undefined };
  if (payload.includes('[STORED_IN_INDEXEDDB]') || payload.includes('[LOCALSTORAGE_CACHE]')) {
    return { src: undefined, srcDoc: undefined };
  }

  const trimmed = payload.trim();

  // HTTP / HTTPS / BLOB URLs -> use src
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:')) {
    return { src: trimmed, srcDoc: undefined };
  }

  // DATA URLs (data:text/html...) -> decode to HTML string so srcDoc can be used safely without Tracking Prevention blocks
  if (trimmed.startsWith('data:')) {
    try {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx !== -1) {
        const meta = trimmed.slice(0, commaIdx);
        const dataPart = trimmed.slice(commaIdx + 1);
        if (meta.includes('base64')) {
          try {
            const decoded = decodeURIComponent(escape(atob(dataPart)));
            return { src: undefined, srcDoc: wrapInStyledHtmlDocument(decoded) };
          } catch {
            const decoded = atob(dataPart);
            return { src: undefined, srcDoc: wrapInStyledHtmlDocument(decoded) };
          }
        } else {
          const decoded = decodeURIComponent(dataPart);
          return { src: undefined, srcDoc: wrapInStyledHtmlDocument(decoded) };
        }
      }
    } catch (e) {
      console.warn('[HtmlViewer] Data URI decode fallback:', e);
    }
  }

  // Raw HTML or Markdown string -> wrap in styled document layout
  return { src: undefined, srcDoc: wrapInStyledHtmlDocument(trimmed) };
}

export default React.memo(function HtmlViewerWithControls({ payload, title = "HTML Dokümanı", height = "100%" }) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fetchedHtml, setFetchedHtml] = useState(null);
  const [manualHtml, setManualHtml] = useState(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (typeof payload === 'string' && (payload.startsWith('http://') || payload.startsWith('https://'))) {
      fetch(payload)
        .then(res => res.text())
        .then(text => {
          if (text && text.trim().length > 0 && !text.includes('[STORED_IN_INDEXEDDB]')) {
            setFetchedHtml(text);
          }
        })
        .catch(err => console.warn('[HtmlViewer] Error fetching remote HTML payload:', err));
    }
  }, [payload]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const htmlText = event.target?.result;
      if (typeof htmlText === 'string') {
        setManualHtml(htmlText);
      }
    };
    reader.readAsText(file);
  };

  const handleZoomIn = (e) => {
    e.preventDefault();
    setZoomLevel(prev => Math.min(prev + 20, 200));
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

  const activeHtml = manualHtml || fetchedHtml;
  const iframeContent = activeHtml ? { src: undefined, srcDoc: activeHtml } : resolveIframeContent(payload);

  const isValidContent = Boolean(iframeContent.src || iframeContent.srcDoc);

  if (!isValidContent) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#0f172a', border: '2px dashed #334155', borderRadius: '1rem', margin: '1rem', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', minHeight: '350px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(6,182,212,0.15)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
          🌐
        </div>
        <div style={{ maxWidth: '400px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            HTML Soru Dokümanı Yüklenemedi
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
            Bu test için HTML dosyası sunucuda veya önbellekte bulunamadı. Lütfen HTML dosyasını bilgisayarınızdan seçip anında görüntüleyin:
          </p>
        </div>
        <label style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '0.75rem',
          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
          color: 'white',
          fontWeight: 900,
          fontSize: '0.88rem',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(6,182,212,0.4)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          📂 HTML Dosyası Seç & Görüntüle
          <input type="file" accept=".html,.htm" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
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

  const iframeElement = useMemo(() => (
    <iframe
      key={iframeContent.src || (iframeContent.srcDoc ? iframeContent.srcDoc.slice(0, 40) : 'html_frame')}
      src={iframeContent.src}
      srcDoc={iframeContent.srcDoc}
      title="HTML Soru Dokümanı"
      style={{
        width: '100%',
        height: '100%',
        minWidth: '100%',
        minHeight: '100%',
        border: 'none',
        background: 'white'
      }}
    />
  ), [iframeContent.src, iframeContent.srcDoc]);

  return (
    <div ref={wrapperRef} style={containerStyle}>
      {/* Sleek Minimal Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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
            title="Pencereyi Tam Ekran Yap"
            style={{ background: '#059669', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isExpanded ? 'Küçült' : 'Tam Ekran'}</span>
          </button>
        </div>
      </div>

      {/* Direct HTML Iframe - Smooth CSS Zoom Without Unmounting */}
      <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'auto', background: '#f8fafc' }}>
        <div
          style={{
            width: `${zoomLevel}%`,
            height: `${zoomLevel}%`,
            minWidth: '100%',
            minHeight: '100%',
            transition: 'width 0.15s ease, height 0.15s ease'
          }}
        >
          {iframeElement}
        </div>
      </div>
    </div>
  );
});
