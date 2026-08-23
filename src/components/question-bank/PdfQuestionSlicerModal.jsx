import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Scissors, Upload, X, Check, Trash2, Plus, ArrowRight,
  ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon, FileText,
  CheckCircle2, ChevronLeft, ChevronRight, Loader2, AlertCircle
} from 'lucide-react';
import { compressImageToWebP } from '../../services/imageCompressionService';
import { useTheme } from '../../context/ThemeContext';
import { pdfjs } from 'react-pdf';

// Ensure PDF.js worker is configured
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

export default function PdfQuestionSlicerModal({
  isOpen,
  onClose,
  onSaveQuestions,
  subject = 'Matematik',
  grade = '8. Sınıf'
}) {
  const { isDark } = useTheme();
  const [sourceImage, setSourceImage] = useState(null);
  const [sourceFileName, setSourceFileName] = useState('');
  const [slicedQuestions, setSlicedQuestions] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // PDF Multi-page support
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageObjRef = useRef(null);

  const drawCanvas = useCallback((img = imageObjRef.current, rect = currentRect) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    if (canvas.width !== img.width || canvas.height !== img.height) {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw base image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Draw already sliced question rectangles
    slicedQuestions.forEach((sq) => {
      if (sq.rect && (!sq.page || sq.page === pdfCurrentPage)) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.fillRect(sq.rect.x, sq.rect.y, sq.rect.w, sq.rect.h);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.strokeRect(sq.rect.x, sq.rect.y, sq.rect.w, sq.rect.h);

        // Badge label
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(sq.rect.x, Math.max(0, sq.rect.y - 24), 68, 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`Soru ${sq.qNo}`, sq.rect.x + 8, Math.max(16, sq.rect.y - 7));
      }
    });

    // Draw active drawing rectangle
    if (rect && rect.w && rect.h) {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.setLineDash([]);
    }
  }, [slicedQuestions, currentRect, pdfCurrentPage]);

  // Render PDF Page to Canvas and Image
  const renderPdfPage = async (doc, pageNum) => {
    try {
      setIsLoadingFile(true);
      setLoadError(null);
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x high resolution for crisp text

      const offCanvas = document.createElement('canvas');
      offCanvas.width = viewport.width;
      offCanvas.height = viewport.height;
      const offCtx = offCanvas.getContext('2d');

      await page.render({ canvasContext: offCtx, viewport }).promise;

      const dataUrl = offCanvas.toDataURL('image/png');
      const img = new Image();
      img.onload = () => {
        imageObjRef.current = img;
        setSourceImage(dataUrl);
        setIsLoadingFile(false);
      };
      img.src = dataUrl;
    } catch (err) {
      console.error('PDF sayfa render hatası:', err);
      setLoadError('PDF sayfası açılırken bir hata oluştu.');
      setIsLoadingFile(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSourceFileName(file.name);
    setLoadError(null);
    setIsLoadingFile(true);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setPdfNumPages(doc.numPages);
        setPdfCurrentPage(1);
        await renderPdfPage(doc, 1);
      } catch (err) {
        console.error('PDF yükleme hatası:', err);
        setLoadError('PDF dosyası açılamadı. Lütfen geçerli bir PDF veya görsel dosyası seçin.');
        setIsLoadingFile(false);
      }
      return;
    }

    // Normal Image Files (PNG, JPG, JPEG, WEBP, GIF)
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        imageObjRef.current = img;
        setSourceImage(dataUrl);
        setPdfDoc(null);
        setPdfNumPages(0);
        setIsLoadingFile(false);
      };
      img.onerror = () => {
        setLoadError('Görsel dosyası yüklenemedi. Lütfen geçerli bir resim seçin.');
        setIsLoadingFile(false);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setLoadError('Dosya okunamadı.');
      setIsLoadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleNextPage = async () => {
    if (!pdfDoc || pdfCurrentPage >= pdfNumPages) return;
    const nextPage = pdfCurrentPage + 1;
    setPdfCurrentPage(nextPage);
    await renderPdfPage(pdfDoc, nextPage);
  };

  const handlePrevPage = async () => {
    if (!pdfDoc || pdfCurrentPage <= 1) return;
    const prevPage = pdfCurrentPage - 1;
    setPdfCurrentPage(prevPage);
    await renderPdfPage(pdfDoc, prevPage);
  };

  // Redraw canvas whenever sourceImage, zoom, or currentRect changes
  useEffect(() => {
    if (sourceImage && imageObjRef.current) {
      drawCanvas();
    }
  }, [sourceImage, zoom, currentRect, slicedQuestions, drawCanvas]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    return {
      x: (e.clientX - r.left) * scaleX,
      y: (e.clientY - r.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    if (!sourceImage) return;
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);
    setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !sourceImage) return;
    const coords = getCanvasCoords(e);
    const rect = {
      x: Math.min(startPos.x, coords.x),
      y: Math.min(startPos.y, coords.y),
      w: Math.abs(coords.x - startPos.x),
      h: Math.abs(coords.y - startPos.y)
    };
    setCurrentRect(rect);
  };

  const handleMouseUp = async () => {
    if (!isDrawing || !currentRect || currentRect.w < 25 || currentRect.h < 25) {
      setIsDrawing(false);
      setCurrentRect(null);
      return;
    }

    setIsDrawing(false);

    // Crop the sub-image on offscreen canvas
    const img = imageObjRef.current;
    if (!img) return;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = currentRect.w;
    cropCanvas.height = currentRect.h;
    const cropCtx = cropCanvas.getContext('2d');

    cropCtx.drawImage(
      img,
      currentRect.x, currentRect.y, currentRect.w, currentRect.h,
      0, 0, currentRect.w, currentRect.h
    );

    const croppedBase64 = cropCanvas.toDataURL('image/png');
    // Compress with WebP
    const compressed = await compressImageToWebP(croppedBase64, 1200, 0.85);

    const newQuestion = {
      id: `sq_${Date.now()}_${slicedQuestions.length + 1}`,
      qNo: slicedQuestions.length + 1,
      image: compressed.dataUrl || croppedBase64,
      sizeKb: compressed.sizeKb || 50,
      correctAnswer: 'A',
      optionCount: 4,
      subject,
      grade,
      page: pdfCurrentPage,
      rect: currentRect
    };

    setSlicedQuestions(prev => [...prev, newQuestion]);
    setCurrentRect(null);
  };

  const handleDeleteQuestion = (id) => {
    setSlicedQuestions(prev => prev.filter(q => q.id !== id).map((q, idx) => ({ ...q, qNo: idx + 1 })));
  };

  const handleUpdateAnswer = (id, ans) => {
    setSlicedQuestions(prev => prev.map(q => q.id === id ? { ...q, correctAnswer: ans } : q));
  };

  const handleUpdateOptionCount = (id, count) => {
    setSlicedQuestions(prev => prev.map(q => q.id === id ? { ...q, optionCount: count } : q));
  };

  const handleSaveAll = () => {
    if (slicedQuestions.length === 0) return;
    onSaveQuestions(slicedQuestions);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          background: 'var(--color-surface, #ffffff)',
          color: 'var(--color-text, #0f172a)',
          width: '96vw',
          maxWidth: 1240,
          height: '92vh',
          borderRadius: 24,
          border: '1.5px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 30px 70px rgba(0,0,0,0.4)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <Scissors size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>
                Akıllı Soru Kırpıcı & Ayırıcı (Smart Slicer)
              </h2>
              <p style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', margin: 0 }}>
                PDF veya test sayfasındaki soruları farenizle seçip kırparak anında soru bankasına aktarın.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: 6
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body: Left Canvas / Right Sliced Cards */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* LEFT: Slicer Canvas Area */}
          <div
            style={{
              flex: 1,
              background: isDark ? '#090d16' : '#e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Top Toolbar */}
            <div
              style={{
                padding: '8px 16px',
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 15px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(99,102,241,0.25)'
                  }}
                >
                  <Upload size={15} />
                  <span>{sourceImage ? 'Başka PDF / Görsel Yükle' : '📁 PDF veya Görsel Seç'}</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                {sourceFileName && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                    {sourceFileName}
                  </span>
                )}
              </div>

              {/* PDF Page Navigation */}
              {pdfNumPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', padding: '4px 10px', borderRadius: 10 }}>
                  <button
                    onClick={handlePrevPage}
                    disabled={pdfCurrentPage <= 1 || isLoadingFile}
                    style={{ background: 'transparent', border: 'none', cursor: pdfCurrentPage <= 1 ? 'not-allowed' : 'pointer', color: 'var(--color-text)', opacity: pdfCurrentPage <= 1 ? 0.4 : 1 }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                    Sayfa {pdfCurrentPage} / {pdfNumPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={pdfCurrentPage >= pdfNumPages || isLoadingFile}
                    style={{ background: 'transparent', border: 'none', cursor: pdfCurrentPage >= pdfNumPages ? 'not-allowed' : 'pointer', color: 'var(--color-text)', opacity: pdfCurrentPage >= pdfNumPages ? 0.4 : 1 }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              {sourceImage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
                    style={{ padding: 6, borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}
                    title="Uzaklaştır"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>%{Math.round(zoom * 100)}</span>
                  <button
                    onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}
                    style={{ padding: 6, borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}
                    title="Yakınlaştır"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    style={{ padding: 6, borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}
                    title="Sıfırla"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Canvas Scroll Viewport */}
            <div
              ref={containerRef}
              style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                cursor: sourceImage ? 'crosshair' : 'default',
                position: 'relative'
              }}
            >
              {isLoadingFile && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#6366f1' }}>
                  <Loader2 size={36} className="animate-spin" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>Dosya yükleniyor ve hazırlanıyor…</span>
                </div>
              )}

              {loadError && !isLoadingFile && (
                <div style={{ textAlign: 'center', color: '#ef4444', maxWidth: 360 }}>
                  <AlertCircle size={36} style={{ margin: '0 auto 8px auto' }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>{loadError}</p>
                </div>
              )}

              {!sourceImage && !isLoadingFile && !loadError && (
                <div style={{ textAlign: 'center', maxWidth: 380 }}>
                  <div style={{ width: 68, height: 68, borderRadius: 22, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
                    <FileText size={34} className="text-indigo-500" />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, margin: '0 0 6px 0' }}>PDF veya Görsel Yükleyin</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                    Kırpmak istediğiniz PDF testini veya soru görselini yukarıdaki butondan seçin.
                  </p>
                </div>
              )}

              {/* Canvas always mounted when sourceImage is loaded */}
              <div style={{ display: sourceImage && !isLoadingFile ? 'block' : 'none', transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.1s' }}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    borderRadius: 8,
                    maxWidth: 'none',
                    userSelect: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Sliced Questions List */}
          <div
            style={{
              width: 360,
              borderLeft: '1.5px solid var(--color-border)',
              background: 'var(--color-surface)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                padding: '1rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <h3 style={{ fontSize: '0.9rem', fontWeight: 900, margin: 0 }}>
                Kırpılan Sorular ({slicedQuestions.length})
              </h3>
              {slicedQuestions.length > 0 && (
                <button
                  onClick={() => setSlicedQuestions([])}
                  style={{ fontSize: '0.72rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                >
                  Tümünü Temizle
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {slicedQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  Sayfa üzerinden farenizle soru etrafında seçim yapın. Kırptığınız her soru otomatik olarak WebP formatına çevrilip burada listelenecektir. ✂️
                </div>
              ) : (
                slicedQuestions.map(q => (
                  <div
                    key={q.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 14,
                      border: '1.5px solid var(--color-border)',
                      background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>Soru #{q.qNo}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 800 }}>WebP ~{q.sizeKb} KB</span>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail */}
                    <div style={{ width: '100%', maxHeight: 110, overflow: 'hidden', borderRadius: 8, border: '1px solid var(--color-border)', background: '#ffffff' }}>
                      <img src={q.image} alt={`Soru ${q.qNo}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>

                    {/* Answer Key & Option Count Select */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Cevap:</span>
                        {['A', 'B', 'C', 'D', ...(q.optionCount === 5 ? ['E'] : [])].map(opt => (
                          <button
                            key={opt}
                            onClick={() => handleUpdateAnswer(q.id, opt)}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 6,
                              border: q.correctAnswer === opt ? 'none' : '1px solid var(--color-border)',
                              background: q.correctAnswer === opt ? '#6366f1' : 'transparent',
                              color: q.correctAnswer === opt ? 'white' : 'var(--color-text)',
                              fontWeight: 900,
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>

                      <select
                        value={q.optionCount}
                        onChange={(e) => handleUpdateOptionCount(q.id, Number(e.target.value))}
                        style={{
                          padding: '2px 4px',
                          borderRadius: 6,
                          border: '1px solid var(--color-border)',
                          fontSize: '0.7rem',
                          background: 'transparent',
                          color: 'var(--color-text)'
                        }}
                      >
                        <option value={4}>4 Şık</option>
                        <option value={5}>5 Şık</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Action */}
            <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <button
                onClick={handleSaveAll}
                disabled={slicedQuestions.length === 0}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.86rem',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: slicedQuestions.length === 0 ? 0.5 : 1,
                  cursor: slicedQuestions.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <CheckCircle2 size={16} />
                <span>{slicedQuestions.length} Soruyu Bankaya Ekle</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
