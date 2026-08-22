import React, { memo, useMemo, useState, useEffect } from 'react';
import { Check, Eye, Pencil } from 'lucide-react';
import { extractQuestionText, extractQuestionOptions } from '../../../utils/testResolver';
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
      border: '1px solid var(--color-border)',
      marginBottom: '0.75rem'
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
          title="Tam Ekran Görüntüle"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '0.4rem',
            borderRadius: '0.5rem',
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(4px)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Eye size={16} />
        </button>
      )}
    </div>
  );
});

/**
 * MultipleChoiceRunner Component
 * Dedicated runner for Multiple-Choice (A, B, C, D, E) questions.
 * Intelligently displays option texts (if present) or optical bubbles (for image-based tests).
 */
export default function MultipleChoiceRunner({
  question,
  qNo = 1,
  totalQuestions = 1,
  selectedOption = null,
  onSelectOption,
  optionsCount = 4,
  imageUrls = [],
  onOpenLightbox,
  onOpenDrawing,
  isMobile = false
}) {
  const [activeLightbox, setActiveLightbox] = useState(null);
  const [idbImage, setIdbImage] = useState(null);

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

  const rawOptions = extractQuestionOptions(question);
  const isFiveOpts = Number(optionsCount) === 5 || rawOptions.length >= 5;
  const optionLetters = isFiveOpts ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];

  const qText = extractQuestionText(question, null, qNo - 1) || question?.questionText || question?.text || question?.question || question?.title || `Soru ${qNo}`;

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

  // Extract option texts
  const optionsWithText = optionLetters.map((opt, optIdx) => {
    const raw = rawOptions[optIdx];
    let text = '';
    if (typeof raw === 'string') text = raw;
    else if (raw && typeof raw === 'object') {
      text = raw.text || raw.optionText || raw.label || raw.title || raw.value || raw.content || '';
    }
    const cleanText = text.trim();
    const isPlaceholder = !cleanText || cleanText.toLowerCase() === opt.toLowerCase() || cleanText.toLowerCase() === `şık ${opt.toLowerCase()}` || cleanText.toLowerCase() === `seçenek ${opt.toLowerCase()}`;
    return {
      letter: opt,
      text: isPlaceholder ? '' : cleanText,
      hasText: !isPlaceholder
    };
  });

  const hasAnyOptionText = optionsWithText.some(o => o.hasText);

  return (
    <div
      id={`q-card-${qNo}`}
      style={{
        background: 'var(--color-surface)',
        borderRadius: isMobile ? '1.15rem' : '1.35rem',
        border: (selectedOption !== null && selectedOption !== undefined) ? '1.5px solid rgba(99, 102, 241, 0.45)' : '1.5px solid var(--color-border)',
        padding: isMobile ? '1rem' : '1.35rem',
        boxShadow: (selectedOption !== null && selectedOption !== undefined) ? '0 8px 25px -4px rgba(99, 102, 241, 0.08)' : '0 4px 20px -2px rgba(0,0,0,0.03)',
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
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(79, 70, 229, 0.12))',
            border: '1.5px solid rgba(99, 102, 241, 0.35)',
            color: '#6366f1',
            borderRadius: '0.6rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.82rem' : '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.1)'
          }}>
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
            🔘 Çoktan Seçmeli
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {onOpenDrawing && (
            <button
              type="button"
              onClick={onOpenDrawing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.22rem 0.55rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-hover)',
                color: 'var(--color-text-secondary)',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="Çizim ve Karalama Tahtası"
            >
              <Pencil size={13} />
              <span>{isMobile ? 'Çizim' : 'Çizim Tahtası'}</span>
            </button>
          )}

          {selectedOption !== null && selectedOption !== undefined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                <Check size={13} strokeWidth={3} /> Cevaplandı ({optionLetters[selectedOption] || selectedOption})
              </span>
              <button
                type="button"
                onClick={() => onSelectOption && onSelectOption(null)}
                style={{
                  padding: '0.2rem 0.45rem',
                  borderRadius: '0.4rem',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-hover)',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                title="Seçimi Temizle"
              >
                Temizle
              </button>
            </div>
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
              — Yanıtlanmadı
            </span>
          )}
        </div>
      </div>

      {/* ── BEAUTIFUL FRAMED QUESTION BOX ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.04) 0%, rgba(99, 102, 241, 0.01) 100%)',
        border: '1.5px solid rgba(99, 102, 241, 0.22)',
        borderRadius: '1rem',
        padding: isMobile ? '0.85rem 1rem' : '1.15rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
      }}>
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

      {/* ── OPTIONS RENDERING ── */}
      {hasAnyOptionText ? (
        /* Vertical Stacked Options with Full Text */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.25rem' }}>
          {optionsWithText.map((optObj, optIdx) => {
            const isSelected = selectedOption === optIdx;
            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => onSelectOption && onSelectOption(isSelected ? null : optIdx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: isMobile ? '0.75rem 0.85rem' : '0.85rem 1rem',
                  borderRadius: '0.85rem',
                  border: `2px solid ${isSelected ? '#6366f1' : 'var(--color-border)'}`,
                  background: isSelected ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,70,229,0.06))' : 'var(--color-surface)',
                  color: isSelected ? '#4f46e5' : 'var(--color-text)',
                  fontWeight: isSelected ? 800 : 500,
                  fontSize: isMobile ? '0.88rem' : '0.92rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 12px rgba(99,102,241,0.15)' : 'none'
                }}
              >
                <span style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface-hover)',
                  color: isSelected ? '#ffffff' : 'var(--color-text)',
                  border: isSelected ? 'none' : '1px solid var(--color-border)',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isSelected ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                }}>
                  {optObj.letter}
                </span>
                <span style={{ flex: 1, lineHeight: 1.5 }}>
                  {optObj.text}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Optical Bubble Strip (A, B, C, D, E) */
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--color-surface-hover)',
          padding: isMobile ? '0.75rem 1rem' : '0.85rem 1.25rem',
          borderRadius: '0.85rem',
          border: '1.5px solid var(--color-border)',
          marginTop: '0.25rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
            Cevabınızı İşaretleyin:
          </span>
          <div style={{ display: 'flex', gap: isMobile ? '0.5rem' : '0.65rem' }}>
            {optionLetters.map((opt, optIdx) => {
              const isSelected = selectedOption === optIdx;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onSelectOption && onSelectOption(isSelected ? null : optIdx)}
                  style={{
                    width: isMobile ? '38px' : '42px',
                    height: isMobile ? '38px' : '42px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? '#4f46e5' : 'var(--color-border-input)'}`,
                    background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface)',
                    color: isSelected ? '#ffffff' : 'var(--color-text)',
                    fontWeight: 900,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                    transition: 'all 0.15s ease',
                    touchAction: 'manipulation'
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
