import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Globe } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { idbGetPayload } from '../services/indexedDbService';
import { toUUID } from '../services/supabaseService';

export function wrapInStyledHtmlDocument(content, title = 'Döküman / Soru') {
  if (!content) return '';
  
  // Eğer içerik zaten bir HTML belgesi ise, HİÇBİR stil veya etiket eklemeden %100 saf halini döndür.
  if (
    content.includes('<!DOCTYPE') ||
    content.includes('<html') ||
    content.includes('<body') ||
    content.includes('<head')
  ) {
    return content;
  }

  // Aksi halde metni düz (ham) formatında, sadece body'e pre-wrap vererek sarmala
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Döküman'}</title>
  <style>
    body {
      white-space: pre-wrap !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      padding: 1.5rem !important;
      word-wrap: break-word !important;
      background: #ffffff !important;
      color: #1e293b !important;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

function resolveIframeContent(payload, title) {
  if (!payload || typeof payload !== 'string') return { src: undefined, srcDoc: undefined };
  if (payload.includes('[STORED_IN_INDEXEDDB]') || payload.includes('[LOCALSTORAGE_CACHE]')) {
    return { src: undefined, srcDoc: undefined };
  }

  let trimmed = payload.trim();

  // If HTML contains pipe delimiters from previous DB mangling, un-mangle it back to proper HTML
  if (trimmed.includes('|') && (
    trimmed.includes('<!DOCTYPE') || trimmed.includes('<html') || trimmed.includes('<head') || 
    trimmed.includes('<body') || trimmed.includes('<style') || trimmed.includes('<div') || 
    trimmed.includes('<script') || trimmed.includes('<p')
  )) {
    trimmed = trimmed.split('|').join('\n');
  }

  // HTTP / HTTPS / BLOB URLs -> use src
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:')) {
    return { src: trimmed, srcDoc: undefined };
  }

  // DATA URLs (data:text/html...) -> decode to HTML string so srcDoc can be used safely
  if (trimmed.startsWith('data:')) {
    try {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx !== -1) {
        const meta = trimmed.slice(0, commaIdx);
        const dataPart = trimmed.slice(commaIdx + 1);
        if (meta.includes('base64')) {
          try {
            const decoded = decodeURIComponent(escape(atob(dataPart)));
            return { src: undefined, srcDoc: wrapInStyledHtmlDocument(decoded, title) };
          } catch {
            const decoded = atob(dataPart);
            return { src: undefined, srcDoc: wrapInStyledHtmlDocument(decoded, title) };
          }
        } else {
          const decoded = decodeURIComponent(dataPart);
          return { src: undefined, srcDoc: wrapInStyledHtmlDocument(decoded, title) };
        }
      }
    } catch (e) {
      console.warn('[HtmlViewer] Data URI decode fallback:', e);
    }
  }

  // Raw HTML or text payload -> wrap in styled HTML document layout
  return { src: undefined, srcDoc: wrapInStyledHtmlDocument(trimmed, title) };
}

export default React.memo(function HtmlViewerWithControls(props) {
  const { payload, htmlContent, src, contentPayload, htmlPayload, title = "HTML Dokümanı", height = "100%", id, testId, realTestId, qId } = props;
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fetchedHtml, setFetchedHtml] = useState(null);
  const [manualHtml, setManualHtml] = useState(null);
  const [idbHtml, setIdbHtml] = useState(null);
  const wrapperRef = useRef(null);

  const rawCandidates = [payload, htmlContent, src, contentPayload, htmlPayload];
  const directPayload = rawCandidates.find(p => typeof p === 'string' && p.trim().length > 5 && !p.includes('[STORED_IN_INDEXEDDB]') && !p.includes('[LOCALSTORAGE_CACHE]'));
  const activePayload = directPayload || idbHtml || rawCandidates.find(Boolean);

  useEffect(() => {
    let isMounted = true;
    async function loadFromIdb() {
      if (directPayload) return;
      const keysToTry = [id, testId, realTestId, qId, props?.bankQ?.id, props?.test?.id].filter(Boolean);
      for (const k of keysToTry) {
        const strK = String(k);
        const norm = strK.replace(/^q_?|^hw_?|^test_?|^bt_?/, '');
        const candidates = [
          strK,
          norm,
          `q_${norm}`,
          `hw_${norm}`,
          toUUID(strK),
          toUUID(norm)
        ].filter(Boolean);
        for (const candidate of candidates) {
          try {
            const val = await idbGetPayload(candidate);
            if (val && typeof val === 'string' && val.trim().length > 5 && !val.includes('[STORED_IN_INDEXEDDB]') && isMounted) {
              setIdbHtml(val);
              return;
            }
          } catch (e) {
            console.warn('[HtmlViewer] idb fallback error:', e);
          }
        }
      }
    }
    loadFromIdb();
    return () => { isMounted = false; };
  }, [directPayload, id, testId, realTestId, qId, props]);

  useEffect(() => {
    if (typeof activePayload === 'string' && (activePayload.startsWith('http://') || activePayload.startsWith('https://'))) {
      fetch(activePayload)
        .then(res => res.text())
        .then(text => {
          if (text && text.trim().length > 0 && !text.includes('[STORED_IN_INDEXEDDB]')) {
            setFetchedHtml(text);
          }
        })
        .catch(err => console.warn('[HtmlViewer] Error fetching remote HTML payload:', err));
    }
  }, [activePayload]);

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

  const isMobile = useMediaQuery('(max-width: 768px)');
  const activeHtml = manualHtml || fetchedHtml;
  const iframeContent = activeHtml ? { src: undefined, srcDoc: wrapInStyledHtmlDocument(activeHtml, title) } : resolveIframeContent(activePayload, title);
  const isValidContent = Boolean(iframeContent.src || iframeContent.srcDoc);

  const iframeElement = useMemo(() => {
    if (!isValidContent) return null;
    return (
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
    );
  }, [isValidContent, iframeContent.src, iframeContent.srcDoc]);

  if (!isValidContent) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '1rem', margin: '1rem', color: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', minHeight: '350px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
          🌐
        </div>
        <div style={{ maxWidth: '400px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            HTML Soru Dokümanı Yüklenemedi
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            Bu test için HTML dosyası sunucuda veya önbellekte bulunamadı. Lütfen HTML dosyasını bilgisayarınızdan seçip anında görüntüleyin:
          </p>
        </div>
        <label style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '0.75rem',
          background: 'linear-gradient(135deg, #059669, #10b981)',
          color: 'white',
          fontWeight: 900,
          fontSize: '0.88rem',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
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
    height: height || '100%',
    minHeight: 0,
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
        background: 'var(--color-surface-hover)',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        flexWrap: 'nowrap',
        gap: '0.35rem',
        minHeight: isMobile ? '30px' : '42px',
        boxSizing: 'border-box',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', minWidth: 0 }}>
          <Globe size={isMobile ? 13 : 16} style={{ color: '#059669', flexShrink: 0 }} />
          {!isMobile && (
            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.25rem' : '0.35rem', flexShrink: 0 }}>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', background: 'var(--color-surface)', border: '1px solid var(--color-border-input)', borderRadius: '0.45rem', padding: '0.1rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Küçült (-20%)"
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', padding: isMobile ? '0.15rem 0.35rem' : '0.25rem 0.45rem', cursor: 'pointer', borderRadius: '0.25rem', display: 'flex', alignItems: 'center' }}
            >
              <ZoomOut size={isMobile ? 12 : 15} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Yakınlaştırmayı Sıfırla (%100)"
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', padding: isMobile ? '0.15rem 0.35rem' : '0.25rem 0.5rem', cursor: 'pointer', borderRadius: '0.25rem', fontSize: isMobile ? '0.68rem' : '0.72rem', fontWeight: 800 }}
            >
              <RotateCcw size={isMobile ? 10 : 12} style={{ marginRight: '0.15rem' }} /> {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              title="Büyüt (+20%)"
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', padding: isMobile ? '0.15rem 0.35rem' : '0.25rem 0.45rem', cursor: 'pointer', borderRadius: '0.25rem', display: 'flex', alignItems: 'center' }}
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
              background: 'linear-gradient(135deg, #059669, #10b981)',
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
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
            }}
          >
            {isExpanded ? <Minimize2 size={isMobile ? 12 : 15} /> : <Maximize2 size={isMobile ? 12 : 15} />}
            <span>{isExpanded ? 'Küçült' : (isMobile ? 'Tam Ekran' : 'Tam Ekran')}</span>
          </button>
        </div>
      </div>

      {/* Direct HTML Iframe - Smooth CSS Zoom Without Unmounting */}
      <div style={{ flex: 1, width: '100%', height: '100%', minHeight: 0, overflow: 'auto', background: 'var(--color-surface-hover)', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            width: `${zoomLevel}%`,
            height: '100%',
            minWidth: '100%',
            minHeight: '100%',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.15s ease'
          }}
        >
          {iframeElement}
        </div>
      </div>
    </div>
  );
});
