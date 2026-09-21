import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BookOpen, FileText, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ZoomIn, ZoomOut, RotateCcw, ShieldCheck, Bookmark,
  Loader2, AlertCircle, Pencil, RefreshCw
} from 'lucide-react';

/**
 * AtaEbookViewer
 * Renders FlipHTML5 / Flip PDF based digital books (such as ATA E-Kitap)
 * with the authentic 3D interactive paper page-flipping ("kağıt çevirme") experience,
 * while securely truncating the book at the last exercise page so students
 * cannot access the answer keys at the end.
 *
 * Provides two synchronized viewing modes:
 *  1. 'flip'   -> 📖 FlipBook: Authentic 3D realistic page-curl, paper flip animation & FlipHTML5 player
 *  2. 'single' -> 📄 Düz Sayfa: High-resolution direct page view with zoom and drawing/scratchpad pen
 */
export default function AtaEbookViewer({
  url = '',
  title = 'E-Kitap',
  testName = '',
  testPageRange: propTestPageRange,
  maxPage: propMaxPage,
  hideAnswerKey = true,
  onToggleDrawing,
  isDrawingOpen = false
}) {
  // ── 1. Base URL Resolution ────────────────────────────────────
  const { baseUrl, urlMaxPage } = useMemo(() => {
    if (!url) return { baseUrl: '', urlMaxPage: null };
    const raw = String(url).trim();

    // Extract query parameter if provided: ?maxPage=277 or #max=277
    const maxMatch = raw.match(/[?&#]max(?:Page)?=(\d+)/i);
    const parsedUrlMax = maxMatch ? parseInt(maxMatch[1], 10) : null;

    const clean = raw.split('?')[0].split('#')[0];
    const base = clean.replace(/\/(?:index\.html)?\/?$/i, '');
    return { baseUrl: base, urlMaxPage: parsedUrlMax };
  }, [url]);

  // ── 2. Test Page Range Detection ──────────────────────────────
  const effectiveTestInfo = propTestPageRange || testName;
  const testPageRange = useMemo(() => {
    const textToSearch = `${effectiveTestInfo} ${title}`;
    // Matches: "Sayfa 14-15", "Sayfa 14 - 15", "s. 14-15", "14-15. Sayfa", "Sayfa 42"
    const m1 = textToSearch.match(/(?:sayfa|s\.)\s*(\d+)(?:\s*[-–]\s*(\d+))?/i);
    const m2 = textToSearch.match(/(\d+)(?:\s*[-–]\s*(\d+))?\.\s*(?:sayfa|s\.)/i);
    const m = m1 || m2;
    if (m) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : start;
      return { start, end, label: start === end ? `Sayfa ${start}` : `Sayfa ${start} - ${end}` };
    }
    return null;
  }, [effectiveTestInfo, title]);

  // ── 3. Maximum Allowed Page Resolution (Cutoff Detection) ─────
  const [detectedMaxPage, setDetectedMaxPage] = useState(null);
  const [detectedTotalPages, setDetectedTotalPages] = useState(null);

  useEffect(() => {
    if (!baseUrl || !hideAnswerKey) return;

    let isCancelled = false;

    async function detectCutoff() {
      try {
        const resp = await fetch(`${baseUrl}/mobile/javascript/search_config.js`);
        if (!resp.ok) return;
        const text = await resp.text();
        if (isCancelled) return;

        const arrayMatch = text.match(/var\s+textForPages\s*=\s*(\[[\s\S]*?\]);/);
        if (arrayMatch) {
          try {
            const pages = (new Function(`return ${arrayMatch[1]}`))();
            if (Array.isArray(pages) && pages.length > 0) {
              setDetectedTotalPages(pages.length);
              for (let i = 0; i < pages.length; i++) {
                const pText = pages[i] || '';
                if (/cevap\s*anahtar|yanıt\s*anahtar/i.test(pText)) {
                  if (!isCancelled && i >= 1) {
                    setDetectedMaxPage(i);
                    return;
                  }
                }
              }
            }
          } catch {}
        }

        const matchPos = text.search(/CEVAP\s*ANAHTARI|YANIT\s*ANAHTARI/i);
        if (matchPos !== -1) {
          if (/5_SINIF_MAT_SORUBANKAM/i.test(baseUrl)) {
            setDetectedMaxPage(277);
          }
        }
      } catch {
        if (/5_SINIF_MAT_SORUBANKAM/i.test(baseUrl)) {
          setDetectedMaxPage(277);
        }
      }
    }

    detectCutoff();
    return () => { isCancelled = true; };
  }, [baseUrl, hideAnswerKey]);

  // Effective maximum page boundary
  const effectiveMaxPage = useMemo(() => {
    if (!hideAnswerKey) return detectedTotalPages || 999;
    if (propMaxPage && Number(propMaxPage) > 0) return Number(propMaxPage);
    if (urlMaxPage && urlMaxPage > 0) return urlMaxPage;
    if (detectedMaxPage && detectedMaxPage > 0) return detectedMaxPage;
    if (/5_SINIF_MAT_SORUBANKAM/i.test(baseUrl)) return 277;
    return detectedTotalPages ? Math.max(1, detectedTotalPages - 4) : 277;
  }, [hideAnswerKey, propMaxPage, urlMaxPage, detectedMaxPage, detectedTotalPages, baseUrl]);

  // ── 4. View Mode & Page State ─────────────────────────────────
  // Default to 'flip' mode as requested ("kağıt çevirir gibi orijinal fliphtml5 görünümü")
  const [viewMode, setViewMode] = useState('flip'); // 'flip' | 'single'
  const initialPageNum = testPageRange?.start || 1;
  const [currentPage, setCurrentPage] = useState(initialPageNum);
  const [pageInputVal, setPageInputVal] = useState(String(initialPageNum));

  // Single Page View States
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isImgLoading, setIsImgLoading] = useState(true);
  const [hasImgError, setHasImgError] = useState(false);
  const [imageSubpath, setImageSubpath] = useState('files/mobile/');

  // FlipBook View States
  const flipIframeRef = useRef(null);
  const [isFlipLoading, setIsFlipLoading] = useState(true);

  // Synchronize start page when testPageRange updates
  useEffect(() => {
    if (testPageRange?.start) {
      const clamped = Math.min(testPageRange.start, effectiveMaxPage);
      setCurrentPage(clamped);
      setPageInputVal(String(clamped));
      if (flipIframeRef.current?.contentWindow) {
        try {
          flipIframeRef.current.contentWindow.postMessage({ action: 'gotoPage', page: clamped }, '*');
        } catch {}
      }
    }
  }, [testPageRange, effectiveMaxPage]);

  // Listen for page changes reported by the FlipBook iframe
  useEffect(() => {
    const handleMsg = (ev) => {
      if (ev.data && ev.data.action === 'flipPageChanged' && ev.data.page) {
        const p = Number(ev.data.page);
        if (p >= 1 && p <= effectiveMaxPage) {
          setCurrentPage(p);
          setPageInputVal(String(p));
        }
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [effectiveMaxPage]);

  // Unified page navigation function
  const goToPage = useCallback((pageNum) => {
    const target = Math.max(1, Math.min(effectiveMaxPage, Number(pageNum) || 1));
    setCurrentPage(target);
    setPageInputVal(String(target));
    setIsImgLoading(true);
    setHasImgError(false);

    if (flipIframeRef.current?.contentWindow) {
      try {
        flipIframeRef.current.contentWindow.postMessage({ action: 'gotoPage', page: target }, '*');
      } catch (err) {
        console.warn('Could not postMessage to flip iframe:', err);
      }
    }
  }, [effectiveMaxPage]);

  // Preload adjacent pages for single-page mode
  useEffect(() => {
    if (!baseUrl || viewMode !== 'single') return;
    const preload = (p) => {
      if (p >= 1 && p <= effectiveMaxPage) {
        const img = new Image();
        img.src = `${baseUrl}/${imageSubpath}${p}.jpg`;
      }
    };
    preload(currentPage + 1);
    preload(currentPage - 1);
  }, [currentPage, baseUrl, effectiveMaxPage, imageSubpath, viewMode]);

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const p = parseInt(pageInputVal, 10);
    if (!isNaN(p)) {
      goToPage(p);
    }
  };

  // ── 5. Generate Secure FlipBook HTML (srcdoc) ──────────────────
  const flipDocHtml = useMemo(() => {
    if (!baseUrl) return '';

    const cutoff = (hideAnswerKey && effectiveMaxPage && effectiveMaxPage > 0) ? effectiveMaxPage : null;
    const initPage = (initialPageNum && initialPageNum > 0) ? Math.min(initialPageNum, cutoff || 9999) : 1;

    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="monitor-signature" content="monitor:player:html5" />
  <title>${title || 'E-Kitap'}</title>
  <base href="${baseUrl}/" />
  <link rel="stylesheet" type="text/css" href="mobile/style/style.css" />
  <link rel="stylesheet" type="text/css" href="mobile/style/player.css" />
  <link rel="stylesheet" type="text/css" href="mobile/style/phoneTemplate.css" />
  <link rel="stylesheet" type="text/css" href="mobile/style/template.css" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #1e293b;
      user-select: none;
      -webkit-user-select: none;
    }
  </style>
  <script type="text/javascript" src="mobile/javascript/jquery-1.9.1.min.js"></script>
  <script type="text/javascript" src="mobile/javascript/config.js"></script>
  <script type="text/javascript">
    // Override cutoff and initial page before main.js initializes
    if (typeof bookConfig !== 'undefined') {
      ${cutoff ? `bookConfig.totalPageCount = ${cutoff};` : ''}
      ${initPage > 1 ? `bookConfig.OriginPageIndex = ${initPage};` : ''}
    }
  </script>
  <script type="text/javascript" src="mobile/javascript/search_config.js"></script>
  <script type="text/javascript">
    if (typeof textForPages !== 'undefined' && Array.isArray(textForPages)) {
      ${cutoff ? `textForPages = textForPages.slice(0, ${cutoff + 1});` : ''}
    }
  </script>
  <script type="text/javascript" src="mobile/javascript/bookmark_config.js"></script>
  <script type="text/javascript">
    if (typeof ols !== 'undefined' && Array.isArray(ols)) {
      ${cutoff ? `ols = ols.filter(function(b) { return !b.page || b.page <= ${cutoff}; });` : ''}
    }
  </script>
  <script type="text/javascript" src="mobile/javascript/LoadingJS.js"></script>
  <script type="text/javascript" src="mobile/javascript/main.js"></script>
  <script type="text/javascript">
    var sendvisitinfo = function(type, page){};

    // Listen for navigation messages from parent React component
    window.addEventListener('message', function(ev) {
      if (ev.data && ev.data.action === 'gotoPage' && ev.data.page) {
        var p = parseInt(ev.data.page, 10);
        ${cutoff ? `if (p > ${cutoff}) p = ${cutoff};` : ''}
        if (typeof gotoPageFun === 'function') {
          try { gotoPageFun(p); } catch(e) {}
        }
      }
    });

    $(document).ready(function() {
      ${initPage > 1 ? `
      setTimeout(function() {
        if (typeof gotoPageFun === 'function') {
          try { gotoPageFun(${initPage}); } catch(e) {}
        }
      }, 450);
      ` : ''}

      // Continuous monitoring: clamp page to cutoff and notify parent of page turns
      var lastReported = -1;
      setInterval(function() {
        try {
          ${cutoff ? `
          if (typeof bookConfig !== 'undefined' && bookConfig.totalPageCount > ${cutoff}) {
            bookConfig.totalPageCount = ${cutoff};
          }
          ` : ''}
          if (typeof BookInfo !== 'undefined' && typeof BookInfo.getCurrentPages === 'function') {
            var pages = BookInfo.getCurrentPages();
            if (pages && pages.length > 0) {
              ${cutoff ? `
              var isOver = pages.some(function(p) { return p > ${cutoff}; });
              if (isOver && typeof gotoPageFun === 'function') {
                gotoPageFun(${cutoff});
              }
              ` : ''}
              var cur = pages[0];
              if (cur !== lastReported) {
                lastReported = cur;
                window.parent.postMessage({ action: 'flipPageChanged', page: cur }, '*');
              }
            }
          }
        } catch(e) {}
      }, 400);
    });
  </script>
</head>
<body>
</body>
</html>`;
  }, [baseUrl, effectiveMaxPage, hideAnswerKey, initialPageNum, title]);

  const currentImageUrl = `${baseUrl}/${imageSubpath}${currentPage}.jpg`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#0f172a',
        color: '#f8fafc',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* ── TOP UNIFIED CONTROL BAR ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.45rem 0.85rem',
          background: '#0b1120',
          borderBottom: '1.5px solid #1e293b',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '0.5rem',
          zIndex: 10
        }}
      >
        {/* Left: View Mode Switcher Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#1e293b', borderRadius: '0.55rem', padding: '2px', border: '1px solid #334155' }}>
            <button
              type="button"
              onClick={() => setViewMode('flip')}
              title="FlipHTML5 Orijinal Kağıt Çevirme Görünümü"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.32rem 0.65rem',
                borderRadius: '0.45rem',
                border: 'none',
                background: viewMode === 'flip' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                color: viewMode === 'flip' ? '#ffffff' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: viewMode === 'flip' ? '0 2px 6px rgba(99,102,241,0.3)' : 'none'
              }}
            >
              <BookOpen size={14} /> <span>📖 FlipBook (Kağıt Çevir)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('single')}
              title="Düz Sayfa Yakınlaştırma ve Çizim Modu"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.32rem 0.65rem',
                borderRadius: '0.45rem',
                border: 'none',
                background: viewMode === 'single' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                color: viewMode === 'single' ? '#ffffff' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: viewMode === 'single' ? '0 2px 6px rgba(99,102,241,0.3)' : 'none'
              }}
            >
              <FileText size={14} /> <span>📄 Düz Sayfa / Çizim</span>
            </button>
          </div>

          {/* Test Page Quick Jump Button */}
          {testPageRange && (
            <button
              type="button"
              onClick={() => goToPage(testPageRange.start)}
              title={`Test Sayfasına Git (${testPageRange.label})`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '0.5rem',
                background: (currentPage >= testPageRange.start && currentPage <= testPageRange.end) ? '#10b981' : '#3b82f6',
                color: '#fff',
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Bookmark size={13} />
              <span>📍 {testPageRange.label}</span>
            </button>
          )}
        </div>

        {/* Center: Page Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <button
            type="button"
            onClick={() => goToPage(1)}
            disabled={currentPage <= 1}
            title="İlk Sayfa"
            style={navBtnStyle(currentPage <= 1)}
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Önceki Sayfa"
            style={navBtnStyle(currentPage <= 1)}
          >
            <ChevronLeft size={18} />
          </button>

          {/* Page Input Box */}
          <form onSubmit={handlePageInputSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="text"
              value={pageInputVal}
              onChange={(e) => setPageInputVal(e.target.value)}
              onBlur={() => {
                const p = parseInt(pageInputVal, 10);
                if (!isNaN(p)) goToPage(p);
              }}
              style={{
                width: '42px',
                textAlign: 'center',
                padding: '0.25rem 0.1rem',
                borderRadius: '0.4rem',
                border: '1.5px solid #334155',
                background: '#1e293b',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 800
              }}
            />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>
              / {effectiveMaxPage}
            </span>
          </form>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= effectiveMaxPage}
            title="Sonraki Sayfa"
            style={navBtnStyle(currentPage >= effectiveMaxPage)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => goToPage(effectiveMaxPage)}
            disabled={currentPage >= effectiveMaxPage}
            title="Son Sayfa"
            style={navBtnStyle(currentPage >= effectiveMaxPage)}
          >
            <ChevronsRight size={16} />
          </button>
        </div>

        {/* Right: Security Badge & Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {/* Security Shield Badge */}
          {hideAnswerKey ? (
            <div
              title={`Öğrenciler için cevap anahtarı gizlenmiştir (Maks: Sayfa ${effectiveMaxPage})`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.55rem',
                borderRadius: '0.4rem',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #059669',
                color: '#34d399',
                fontSize: '0.72rem',
                fontWeight: 800
              }}
            >
              <ShieldCheck size={14} />
              <span>Cevaplar Gizli (s.{effectiveMaxPage})</span>
            </div>
          ) : (
            <div
              title="Tüm kitap sayfaları ve cevap anahtarı görünür durumda"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.55rem',
                borderRadius: '0.4rem',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid #3b82f6',
                color: '#60a5fa',
                fontSize: '0.72rem',
                fontWeight: 800
              }}
            >
              <span>🔓 Tam Kitap</span>
            </div>
          )}

          {/* Zoom Controls (Active in Single Page Mode) */}
          {viewMode === 'single' && (
            <>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
                title="Uzaklaştır"
                style={toolBtnStyle}
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: '0.76rem', color: '#cbd5e1', minWidth: '38px', textAlign: 'center', fontWeight: 800 }}>
                %{zoomLevel}
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(220, z + 15))}
                title="Yakınlaştır"
                style={toolBtnStyle}
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                title="Sıfırla (%100)"
                style={toolBtnStyle}
              >
                <RotateCcw size={14} />
              </button>
            </>
          )}

          {/* Drawing Trigger Button */}
          {onToggleDrawing && (
            <button
              type="button"
              onClick={onToggleDrawing}
              title={isDrawingOpen ? "Çizimi Kapat" : "Sayfa Üzerine Çizim Yap"}
              style={{
                ...toolBtnStyle,
                background: isDrawingOpen ? '#eab308' : '#6366f1',
                color: '#fff',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.3rem 0.6rem'
              }}
            >
              <Pencil size={13} />
              <span>{isDrawingOpen ? 'Çizim Açık' : 'Çiz'}</span>
            </button>
          )}

          {/* Reload / Refresh FlipBook */}
          {viewMode === 'flip' && (
            <button
              type="button"
              onClick={() => {
                if (flipIframeRef.current) {
                  setIsFlipLoading(true);
                  flipIframeRef.current.srcdoc = flipDocHtml;
                }
              }}
              title="Kitabı Yeniden Yükle"
              style={toolBtnStyle}
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        
        {/* ── 1. FLIPBOOK 3D PAGE-TURNING MODE (FlipHTML5 engine) ── */}
        {viewMode === 'flip' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {isFlipLoading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#0f172a',
                  zIndex: 2,
                  gap: '0.75rem'
                }}
              >
                <Loader2 size={36} className="animate-spin" color="#6366f1" />
                <span style={{ fontSize: '0.88rem', color: '#cbd5e1', fontWeight: 700 }}>
                  3D Kağıt Çevirmeli Kitap Yükleniyor...
                </span>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  {hideAnswerKey ? `🔒 Cevap anahtarı gizleniyor (Sayfa 1 - ${effectiveMaxPage})` : 'Tüm sayfalar hazırlanıyor'}
                </span>
              </div>
            )}

            <iframe
              ref={flipIframeRef}
              srcDoc={flipDocHtml}
              title={`${title} - FlipBook`}
              onLoad={() => setIsFlipLoading(false)}
              allow="autoplay; fullscreen"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
                background: '#1e293b'
              }}
            />
          </div>
        )}

        {/* ── 2. SINGLE PAGE DIRECT IMAGE MODE (High Resolution + Scratchpad) ── */}
        {viewMode === 'single' && (
          <div
            style={{
              width: '100%',
              height: '100%',
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '1rem',
              position: 'relative'
            }}
          >
            {isImgLoading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(15, 23, 42, 0.75)',
                  zIndex: 5,
                  gap: '0.6rem'
                }}
              >
                <Loader2 size={32} className="animate-spin" color="#38bdf8" />
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
                  Sayfa {currentPage} yükleniyor...
                </span>
              </div>
            )}

            {hasImgError ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3rem 1rem',
                  color: '#f87171',
                  gap: '0.75rem',
                  textAlign: 'center'
                }}
              >
                <AlertCircle size={40} />
                <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  Sayfa {currentPage} yüklenemedi.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setImageSubpath(p => p === 'files/mobile/' ? 'files/large/' : 'files/mobile/');
                      setIsImgLoading(true);
                      setHasImgError(false);
                    }}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '0.5rem',
                      background: '#334155',
                      color: '#fff',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Alternatif Çözünürlüğü Dene
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('flip')}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '0.5rem',
                      background: '#6366f1',
                      color: '#fff',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    FlipBook Görünümüne Geç
                  </button>
                </div>
              </div>
            ) : (
              <img
                src={currentImageUrl}
                alt={`${title} - Sayfa ${currentPage}`}
                onLoad={() => setIsImgLoading(false)}
                onError={() => {
                  if (imageSubpath === 'files/mobile/') {
                    setImageSubpath('files/large/');
                  } else {
                    setIsImgLoading(false);
                    setHasImgError(true);
                  }
                }}
                style={{
                  width: zoomLevel === 100 ? 'auto' : `${zoomLevel}%`,
                  maxWidth: zoomLevel === 100 ? '100%' : 'none',
                  height: 'auto',
                  maxHeight: zoomLevel === 100 ? '100%' : 'none',
                  objectFit: 'contain',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                  borderRadius: '0.35rem',
                  transition: 'width 0.15s ease',
                  display: isImgLoading ? 'none' : 'block',
                  background: '#fff'
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ── BOTTOM STATUS BAR ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.35rem 0.85rem',
          background: '#0b1120',
          borderTop: '1px solid #1e293b',
          fontSize: '0.72rem',
          color: '#64748b'
        }}
      >
        <span>📖 {title}</span>
        <span>
          {hideAnswerKey ? `🔒 Cevap Anahtarı Gizli (Maks: ${effectiveMaxPage}. Sayfa)` : `🔓 Tam Kitap (${effectiveMaxPage} Sayfa)`}
        </span>
      </div>
    </div>
  );
}

function navBtnStyle(disabled) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '0.4rem',
    background: disabled ? '#1e293b' : '#334155',
    color: disabled ? '#475569' : '#f8fafc',
    border: '1px solid #475569',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease'
  };
}

const toolBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.3rem 0.5rem',
  borderRadius: '0.4rem',
  background: '#334155',
  color: '#f8fafc',
  border: '1px solid #475569',
  cursor: 'pointer',
  fontSize: '0.78rem'
};
