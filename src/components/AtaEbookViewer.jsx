import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ZoomIn, ZoomOut, RotateCcw, ShieldCheck, Bookmark,
  Loader2, AlertCircle, ExternalLink, Pencil
} from 'lucide-react';

/**
 * AtaEbookViewer
 * Renders FlipHTML5 / Flip PDF based digital books (such as ATA E-Kitap)
 * directly in high resolution while securely blocking access to answer key pages.
 *
 * Props:
 *  - url: string (e-book URL, e.g. https://www.ataekitap.com/.../index.html)
 *  - title: string
 *  - testName: string (e.g. "Test 1 (Sayfa 14-15)")
 *  - maxPage: number (optional override for maximum allowed page)
 *  - hideAnswerKey: boolean (default true)
 *  - onToggleDrawing: function (optional drawing canvas trigger)
 *  - isDrawingOpen: boolean
 */
export default function AtaEbookViewer({
  url = '',
  title = 'E-Kitap',
  testName = '',
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
  const testPageRange = useMemo(() => {
    const textToSearch = `${testName} ${title}`;
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
  }, [testName, title]);

  // ── 3. Maximum Allowed Page Resolution ────────────────────────
  const [detectedMaxPage, setDetectedMaxPage] = useState(null);
  const [detectedTotalPages, setDetectedTotalPages] = useState(null);

  useEffect(() => {
    if (!baseUrl || !hideAnswerKey) return;

    let isCancelled = false;

    async function detectCutoff() {
      try {
        // Fetch search_config.js to inspect page contents for "CEVAP ANAHTARI"
        const resp = await fetch(`${baseUrl}/mobile/javascript/search_config.js`);
        if (!resp.ok) return;
        const text = await resp.text();
        if (isCancelled) return;

        // Try extracting textForPages array
        const arrayMatch = text.match(/var\s+textForPages\s*=\s*(\[[\s\S]*?\]);/);
        if (arrayMatch) {
          try {
            // Safer parsing of string array
            const pages = (new Function(`return ${arrayMatch[1]}`))();
            if (Array.isArray(pages) && pages.length > 0) {
              setDetectedTotalPages(pages.length);
              // Find first page containing answer key title
              for (let i = 0; i < pages.length; i++) {
                const pText = pages[i] || '';
                if (/cevap\s*anahtar|yanıt\s*anahtar/i.test(pText)) {
                  // Index i corresponds to page i+1. So cutoff is page i!
                  if (!isCancelled && i >= 1) {
                    setDetectedMaxPage(i);
                    return;
                  }
                }
              }
            }
          } catch {}
        }

        // Fallback: search for occurrences of CEVAP ANAHTARI
        const matchPos = text.search(/CEVAP\s*ANAHTARI|YANIT\s*ANAHTARI/i);
        if (matchPos !== -1) {
          // If ATA 5. Sınıf Soru Bankam, default cutoff is 277
          if (/5_SINIF_MAT_SORUBANKAM/i.test(baseUrl)) {
            setDetectedMaxPage(277);
          }
        }
      } catch {
        // Fallback for known books if offline or CORS blocked
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
    // Known book fallback: ATA 5. Sınıf Soru Bankam
    if (/5_SINIF_MAT_SORUBANKAM/i.test(baseUrl)) return 277;
    return detectedTotalPages ? Math.max(1, detectedTotalPages - 4) : 277;
  }, [hideAnswerKey, propMaxPage, urlMaxPage, detectedMaxPage, detectedTotalPages, baseUrl]);

  // ── 4. Current Page State & Navigation ────────────────────────
  const initialPageNum = testPageRange?.start || 1;
  const [currentPage, setCurrentPage] = useState(initialPageNum);
  const [pageInputVal, setPageInputVal] = useState(String(initialPageNum));
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isImgLoading, setIsImgLoading] = useState(true);
  const [hasImgError, setHasImgError] = useState(false);
  const [imageSubpath, setImageSubpath] = useState('files/mobile/'); // files/mobile/ or files/large/

  // Synchronize page when test changes
  useEffect(() => {
    if (testPageRange?.start) {
      const clamped = Math.min(testPageRange.start, effectiveMaxPage);
      setCurrentPage(clamped);
      setPageInputVal(String(clamped));
    }
  }, [testPageRange, effectiveMaxPage]);

  const goToPage = useCallback((pageNum) => {
    const target = Math.max(1, Math.min(effectiveMaxPage, Number(pageNum) || 1));
    setCurrentPage(target);
    setPageInputVal(String(target));
    setIsImgLoading(true);
    setHasImgError(false);
  }, [effectiveMaxPage]);

  // Preload adjacent pages for seamless instant flipping
  useEffect(() => {
    if (!baseUrl) return;
    const preload = (p) => {
      if (p >= 1 && p <= effectiveMaxPage) {
        const img = new Image();
        img.src = `${baseUrl}/${imageSubpath}${p}.jpg`;
      }
    };
    preload(currentPage + 1);
    preload(currentPage - 1);
  }, [currentPage, baseUrl, effectiveMaxPage, imageSubpath]);

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    goToPage(parseInt(pageInputVal, 10));
  };

  const currentImageUrl = `${baseUrl}/${imageSubpath}${currentPage}.jpg`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#1e293b',
        color: '#f8fafc',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* ── TOP CONTROL BAR ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.85rem',
          background: '#0f172a',
          borderBottom: '1px solid #334155',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '0.5rem',
          zIndex: 10
        }}
      >
        {/* Left: Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage <= 1}
            title="İlk Sayfa"
            style={navBtnStyle(currentPage <= 1)}
          >
            <ChevronsLeft size={16} />
          </button>
          <button
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
              onBlur={() => goToPage(parseInt(pageInputVal, 10))}
              style={{
                width: '44px',
                textAlign: 'center',
                padding: '0.25rem 0.1rem',
                borderRadius: '0.4rem',
                border: '1.5px solid #475569',
                background: '#1e293b',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700
              }}
            />
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
              / {effectiveMaxPage}
            </span>
          </form>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= effectiveMaxPage}
            title="Sonraki Sayfa"
            style={navBtnStyle(currentPage >= effectiveMaxPage)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => goToPage(effectiveMaxPage)}
            disabled={currentPage >= effectiveMaxPage}
            title="Son Test Sayfası"
            style={navBtnStyle(currentPage >= effectiveMaxPage)}
          >
            <ChevronsRight size={16} />
          </button>

          {/* Test Page Quick Jump Button */}
          {testPageRange && (
            <button
              onClick={() => goToPage(testPageRange.start)}
              title={`Teste Git (${testPageRange.label})`}
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
                marginLeft: '0.25rem'
              }}
            >
              <Bookmark size={13} />
              <span>{testPageRange.label}</span>
            </button>
          )}
        </div>

        {/* Right: Security Badge & Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {/* Security Shield Badge */}
          {hideAnswerKey && (
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
                fontWeight: 700
              }}
            >
              <ShieldCheck size={14} />
              <span>Cevaplar Gizli</span>
            </div>
          )}

          {/* Zoom Buttons */}
          <button
            onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
            title="Uzaklaştır"
            style={toolBtnStyle}
          >
            <ZoomOut size={15} />
          </button>
          <span style={{ fontSize: '0.78rem', color: '#cbd5e1', minWidth: '40px', textAlign: 'center', fontWeight: 700 }}>
            %{zoomLevel}
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(220, z + 15))}
            title="Yakınlaştır"
            style={toolBtnStyle}
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => setZoomLevel(100)}
            title="Sıfırla (%100)"
            style={toolBtnStyle}
          >
            <RotateCcw size={14} />
          </button>

          {/* Drawing Trigger */}
          {onToggleDrawing && (
            <button
              onClick={onToggleDrawing}
              title={isDrawingOpen ? "Çizimi Kapat" : "Üzerine Çizim Yap"}
              style={{
                ...toolBtnStyle,
                background: isDrawingOpen ? '#eab308' : '#6366f1',
                color: '#fff',
                fontWeight: 700,
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
        </div>
      </div>

      {/* ── MAIN IMAGE VIEWPORT ── */}
      <div
        style={{
          flex: 1,
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
            </div>
          </div>
        ) : (
          <img
            src={currentImageUrl}
            alt={`${title} - Sayfa ${currentPage}`}
            onLoad={() => setIsImgLoading(false)}
            onError={() => {
              if (imageSubpath === 'files/mobile/') {
                // Try large path fallback
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

      {/* ── BOTTOM NOTIFICATION BAR ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.35rem 0.85rem',
          background: '#0f172a',
          borderTop: '1px solid #334155',
          fontSize: '0.72rem',
          color: '#64748b'
        }}
      >
        <span>📖 {title}</span>
        <span>
          {hideAnswerKey && `🔒 Son Gösterim: ${effectiveMaxPage}. Sayfa (Cevap Anahtarı Gizli)`}
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
