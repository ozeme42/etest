import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { Check, Edit3, Eye, Pencil, Trash2, HelpCircle, Sparkles, CheckCircle2, FileText, CornerDownRight } from 'lucide-react';
import { idbGetPayload } from '../../../services/indexedDbService';
import ImageLightbox from '../common/ImageLightbox';

/**
 * StandardImageFrame Component
 */
const StandardImageFrame = memo(function StandardImageFrame({ src, alt, onOpenFullscreen }) {
  if (!src) return null;
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxHeight: '65vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '0.85rem',
      overflow: 'hidden',
      background: 'var(--color-surface-hover)',
      border: '1.5px solid var(--color-border)',
      boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
    }}>
      <img
        src={src}
        alt={alt || 'Soru Görseli'}
        style={{
          maxWidth: '100%',
          maxHeight: '65vh',
          objectFit: 'contain',
          display: 'block'
        }}
      />
      {onOpenFullscreen && (
        <button
          type="button"
          onClick={onOpenFullscreen}
          title="Tam Ekran Büyüt"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            padding: '0.45rem 0.65rem',
            borderRadius: '0.6rem',
            background: 'rgba(15,23,42,0.75)',
            backdropFilter: 'blur(6px)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            fontWeight: 800,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Eye size={14} />
          <span>Büyüt</span>
        </button>
      )}
    </div>
  );
});

/**
 * OpenEndedRunner Component
 * Dedicated runner for Open-Ended (Written / Classical / Numeric) questions.
 * Features a distinctive framed question viewer, math quick-symbols, drawing shortcut, and auto-saving text area.
 */
export default function OpenEndedRunner({
  question,
  qNo = 1,
  totalQuestions = 1,
  answerText,
  value,
  userAnswerText,
  onChangeAnswerText,
  onChange,
  onTextChange,
  imageUrls = [],
  onOpenLightbox,
  onOpenDrawing,
  isMobile = false
}) {
  const [activeLightbox, setActiveLightbox] = useState(null);
  const [idbImage, setIdbImage] = useState(null);
  const textareaRef = useRef(null);

  // Load IndexedDB image if stored locally
  useEffect(() => {
    let isMounted = true;
    async function loadIdb() {
      if (question?.id) {
        const variants = [question.id, `q_${question.id}`, String(question.id).replace(/^q_/, '')];
        for (const k of variants) {
          try {
            const val = await idbGetPayload(k);
            if (val && typeof val === 'string' && (val.startsWith('data:image') || val.startsWith('http') || val.length > 100) && !val.includes('[STORED_IN_INDEXEDDB]') && isMounted) {
              setIdbImage(val);
              return;
            }
          } catch {}
        }
      }
    }
    loadIdb();
    return () => { isMounted = false; };
  }, [question?.id]);

  const handleChange = onChangeAnswerText || onChange || onTextChange;
  const textVal = String(answerText ?? value ?? userAnswerText ?? '');
  const hasText = textVal.trim() !== '';
  const qText = question?.questionText || question?.text || question?.question || question?.title || `Soru ${qNo}`;

  // Collect all resolved images with single-source priority to avoid duplicate stacked images
  const resolvedImages = useMemo(() => {
    const isValidImg = (v) => typeof v === 'string' && v && !v.includes('[STORED_IN_INDEXEDDB]') && !v.includes('[LOCALSTORAGE_CACHE]') && (v.startsWith('data:image') || v.startsWith('http') || v.startsWith('blob:') || /\.(png|jpe?g|webp|gif|svg)/i.test(v) || v.length > 100);

    const urls = [];
    const addVal = (val) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(addVal);
      } else if (isValidImg(val)) {
        if (val.includes('\n\n') || val.includes('\n') || val.includes('|')) {
          const parts = val.split(/\n\n|\n|\|/).map(s => s.trim()).filter(isValidImg);
          urls.push(...parts);
        } else {
          urls.push(val.trim());
        }
      }
    };

    // 1. Explicit imageUrls prop passed specifically for this question
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      imageUrls.forEach(addVal);
    }

    // 2. Direct question.imageUrl (specific to this single question)
    if (urls.length === 0 && question?.imageUrl) {
      addVal(question.imageUrl);
    }

    // 3. Question-level images array
    if (urls.length === 0) {
      const qImages = question?.images || question?.imageUrls;
      if (Array.isArray(qImages) && qImages.length > 0) {
        const subIdx = (typeof question?.subIndex === 'number') ? question.subIndex : (qNo - 1);
        if (qImages.length > 1 && subIdx >= 0 && subIdx < qImages.length) {
          addVal(qImages[subIdx]);
        } else {
          qImages.forEach(addVal);
        }
      }
    }

    // 4. Content payload or image payload
    if (urls.length === 0) {
      addVal(question?.imagePayload);
      addVal(question?.contentPayload);
    }

    // 5. IndexedDB fallback only if still empty
    if (urls.length === 0 && idbImage) {
      addVal(idbImage);
    }

    return Array.from(new Set(urls.filter(Boolean)));
  }, [imageUrls, question, qNo, idbImage]);

  const handleOpenImage = (src) => {
    if (onOpenLightbox) {
      onOpenLightbox(src);
    } else {
      setActiveLightbox(src);
    }
  };

  const handleClearAnswer = () => {
    if (handleChange) handleChange('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div
      id={`q-card-${qNo}`}
      style={{
        background: 'var(--color-surface)',
        borderRadius: isMobile ? '1.15rem' : '1.35rem',
        border: hasText ? '1.5px solid rgba(124, 58, 237, 0.45)' : '1.5px solid var(--color-border)',
        padding: isMobile ? '1rem' : '1.35rem',
        boxShadow: hasText ? '0 8px 25px -4px rgba(124, 58, 237, 0.08)' : '0 4px 20px -2px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.15rem',
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
    >
      {/* ── TOP HEADER BAR ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{
            padding: '0.3rem 0.75rem',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.18), rgba(99, 102, 241, 0.12))',
            border: '1.5px solid rgba(124, 58, 237, 0.35)',
            color: '#7c3aed',
            borderRadius: '0.6rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.82rem' : '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.1)'
          }}>
            <FileText size={14} />
            SORU {qNo} {totalQuestions > 1 && `/ ${totalQuestions}`}
          </span>
          <span style={{
            padding: '0.22rem 0.55rem',
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            borderRadius: '0.5rem',
            fontWeight: 800,
            fontSize: '0.72rem'
          }}>
            ✍️ Yazılı / Açık Uçlu
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {hasText ? (
            <span style={{
              fontSize: '0.78rem',
              color: '#10b981',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.2rem 0.55rem',
              borderRadius: '99px'
            }}>
              <CheckCircle2 size={13} /> Cevaplandı
            </span>
          ) : (
            <span style={{
              fontSize: '0.76rem',
              color: 'var(--color-text-muted)',
              fontWeight: 800,
              background: 'var(--color-surface-hover)',
              padding: '0.2rem 0.55rem',
              borderRadius: '99px',
              border: '1px solid var(--color-border)'
            }}>
              ⏳ Yanıt Bekliyor
            </span>
          )}
        </div>
      </div>

      {/* ── BEAUTIFUL FRAMED QUESTION BOX ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(124, 58, 237, 0.04) 0%, rgba(99, 102, 241, 0.01) 100%)',
        border: '1.5px solid rgba(124, 58, 237, 0.22)',
        borderRadius: '1rem',
        padding: isMobile ? '0.85rem 1rem' : '1.15rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Frame Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#7c3aed', fontSize: '0.76rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <Sparkles size={13} />
          <span>Soru Metni & Görseller</span>
        </div>

        {/* Question Images */}
        {resolvedImages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {resolvedImages.map((url, idx) => (
              <StandardImageFrame
                key={idx}
                src={url}
                alt={`Soru ${qNo} Görsel ${idx + 1}`}
                onOpenFullscreen={() => handleOpenImage(url)}
              />
            ))}
          </div>
        )}

        {/* Question Text */}
        {qText && !qText.startsWith('Soru ') && (
          <div style={{
            fontSize: isMobile ? '0.94rem' : '1.02rem',
            lineHeight: 1.65,
            color: 'var(--color-text)',
            fontWeight: 600,
            whiteSpace: 'pre-wrap'
          }}>
            {qText}
          </div>
        )}
      </div>

      {/* ── STUDENT ANSWER & SOLUTION WORKSPACE ── */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '1rem',
        border: '1.5px solid var(--color-border)',
        padding: isMobile ? '0.85rem' : '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem'
      }}>
        {/* Workspace Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <label style={{
            fontSize: '0.84rem',
            fontWeight: 900,
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Edit3 size={15} color="#7c3aed" />
            <span>Öğrenci Yanıtı & Çözüm:</span>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {onOpenDrawing && (
              <button
                type="button"
                onClick={onOpenDrawing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '0.35rem 0.7rem',
                  borderRadius: '0.6rem',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#4f46e5',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Çizim Yaparak Çöz"
              >
                <Pencil size={13} />
                <span>Çizim Tahtası</span>
              </button>
            )}

            {hasText && (
              <button
                type="button"
                onClick={handleClearAnswer}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '0.35rem 0.6rem',
                  borderRadius: '0.6rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#dc2626',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Cevabı Temizle"
              >
                <Trash2 size={12} />
                <span>Temizle</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Answer Textarea */}
        <textarea
          ref={textareaRef}
          rows={isMobile ? 3 : 4}
          value={textVal}
          onChange={(e) => handleChange && handleChange(e.target.value)}
          placeholder="Cevabınızı, sayısal sonucunuzu veya çözüm basamaklarınızı buraya yazınız..."
          style={{
            width: '100%',
            padding: '0.75rem 0.95rem',
            borderRadius: '0.75rem',
            border: hasText ? '1.5px solid #7c3aed' : '1.5px solid var(--color-border-input)',
            fontSize: isMobile ? '0.9rem' : '0.94rem',
            lineHeight: 1.6,
            color: 'var(--color-text)',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
            background: 'var(--color-surface)',
            transition: 'border-color 0.15s ease',
            boxShadow: hasText ? '0 0 0 3px rgba(124, 58, 237, 0.12)' : 'none'
          }}
          onFocus={e => e.target.style.borderColor = '#7c3aed'}
          onBlur={e => {
            if (!hasText) e.target.style.borderColor = 'var(--color-border-input)';
          }}
        />

        {/* Status / Auto-save footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.73rem',
          color: 'var(--color-text-muted)',
          paddingTop: '0.1rem'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Cevabınız anında otomatik kaydedilir.
          </span>
          <span style={{ fontWeight: 800 }}>{textVal.length} Karakter</span>
        </div>
      </div>

      {/* Lightbox for Images */}
      {activeLightbox && (
        <ImageLightbox
          isOpen={Boolean(activeLightbox)}
          src={activeLightbox}
          onClose={() => setActiveLightbox(null)}
        />
      )}
    </div>
  );
}
