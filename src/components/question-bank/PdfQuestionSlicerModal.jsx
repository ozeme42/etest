import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors, Upload, X, Check, Trash2, Plus, ArrowRight,
  ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon, FileText, CheckCircle2
} from 'lucide-react';
import { compressImageToWebP } from '../../services/imageCompressionService';
import { useTheme } from '../../context/ThemeContext';

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

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageObjRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSourceFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        imageObjRef.current = img;
        setSourceImage(dataUrl);
        drawCanvas(img);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const drawCanvas = (img = imageObjRef.current, rect = currentRect) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw main image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Draw previous sliced rectangles
    slicedQuestions.forEach((sq, idx) => {
      if (sq.rect) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.fillRect(sq.rect.x, sq.rect.y, sq.rect.w, sq.rect.h);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.strokeRect(sq.rect.x, sq.rect.y, sq.rect.w, sq.rect.h);

        // Badge label
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(sq.rect.x, sq.rect.y - 24, 60, 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`Soru ${idx + 1}`, sq.rect.x + 6, sq.rect.y - 7);
      }
    });

    // Draw active drawing rect
    if (rect && rect.w && rect.h) {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.setLineDash([]);
    }
  };

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
    drawCanvas(imageObjRef.current, rect);
  };

  const handleMouseUp = async () => {
    if (!isDrawing || !currentRect || currentRect.w < 20 || currentRect.h < 20) {
      setIsDrawing(false);
      setCurrentRect(null);
      drawCanvas();
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
      rect: currentRect
    };

    setSlicedQuestions(prev => [...prev, newQuestion]);
    setCurrentRect(null);
  };

  useEffect(() => {
    if (sourceImage && imageObjRef.current) {
      drawCanvas();
    }
  }, [slicedQuestions]);

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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
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
          width: '95vw',
          maxWidth: 1200,
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
                Sayfadaki soruların etrafını fareyle seçerek kırpın ve tek tıkla soru bankasına kaydedin.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                gap: 10
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 10,
                  background: '#6366f1',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Upload size={14} />
                <span>{sourceImage ? 'Başka Görsel Yükle' : 'Test Görseli / PDF Yükle'}</span>
                <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>

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
                cursor: sourceImage ? 'crosshair' : 'default'
              }}
            >
              {!sourceImage ? (
                <div style={{ textAlign: 'center', maxWidth: 360 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                    <ImageIcon size={32} className="text-indigo-500" />
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 6px 0' }}>Henüz Görsel Yüklenmedi</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Kırpmak istediğiniz test sayfasını yukarıdaki butondan yükleyin.
                  </p>
                </div>
              ) : (
                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.1s' }}>
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
              )}
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
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                  Sayfa üzerinden farenizle soru etrafında seçim yapın. Kırpılan sorular burada listelenecektir. ✂️
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
