import React, { memo, useMemo, useState, useEffect } from 'react';
import { Check, Eye } from 'lucide-react';
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
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
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
            padding: '0.35rem',
            borderRadius: '0.5rem',
            background: 'rgba(15,23,42,0.65)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Eye size={14} />
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

  // Collect all resolved images
  const resolvedImages = useMemo(() => {
    const urls = [];
    const addImg = (val) => {
      if (typeof val !== 'string' || !val || val.includes('[STORED_IN_INDEXEDDB]') || val.includes('[LOCALSTORAGE_CACHE]')) return;
      if (val.includes('\n\n') || val.includes('\n') || val.includes('|')) {
        const parts = val.split(/\n\n|\n|\|/).map(s => s.trim()).filter(s => s.startsWith('data:image') || s.startsWith('http') || /\.(png|jpe?g|webp|gif)/i.test(s));
        urls.push(...parts);
      } else if (val.startsWith('data:image') || val.startsWith('http') || val.length > 50) {
        urls.push(val);
      }
    };

    if (Array.isArray(imageUrls) && imageUrls.length > 0) imageUrls.forEach(addImg);
    if (Array.isArray(question?.images) && question.images.length > 0) question.images.forEach(addImg);
    if (Array.isArray(question?.imageUrls) && question.imageUrls.length > 0) question.imageUrls.forEach(addImg);
    addImg(question?.imageUrl);
    addImg(question?.contentPayload);
    addImg(question?.imagePayload);
    addImg(idbImage);
    return Array.from(new Set(urls.filter(Boolean)));
  }, [imageUrls, question, idbImage]);

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
    <div style={{
      background: '#ffffff',
      borderRadius: '1.25rem',
      border: '1.5px solid #e2e8f0',
      padding: isMobile ? '1rem' : '1.5rem',
      boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.15rem'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            padding: '0.35rem 0.85rem',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            borderRadius: '0.5rem',
            fontWeight: 900,
            fontSize: '0.9rem'
          }}>
            SORU {qNo} {totalQuestions > 1 && `/ ${totalQuestions}`}
          </span>
          <span style={{
            padding: '0.2rem 0.6rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            borderRadius: '0.4rem',
            fontWeight: 800,
            fontSize: '0.75rem'
          }}>
            Çoktan Seçmeli
          </span>
        </div>

        {selectedOption !== null && selectedOption !== undefined ? (
          <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={14} /> Cevaplandı
          </span>
        ) : (
          <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>
            — Yanıtlanmadı
          </span>
        )}
      </div>

      {/* Images */}
      {resolvedImages.map((url, idx) => (
        <StandardImageFrame
          key={idx}
          src={url}
          alt={`Soru ${qNo} Görsel ${idx + 1}`}
          onOpenFullscreen={() => handleOpenImage(url)}
        />
      ))}

      {/* Question Text */}
      {qText && !qText.startsWith('Soru ') && (
        <div style={{
          fontSize: '1rem',
          lineHeight: 1.65,
          color: '#0f172a',
          fontWeight: 700,
          whiteSpace: 'pre-wrap'
        }}>
          {qText}
        </div>
      )}

      {/* Options Rendering */}
      {hasAnyOptionText ? (
        /* Vertical Stacked Options with Full Text */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.25rem' }}>
          {optionsWithText.map((optObj, optIdx) => {
            const isSelected = selectedOption === optIdx;
            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => onSelectOption && onSelectOption(optIdx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.85rem',
                  border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1e40af' : '#1e293b',
                  fontWeight: isSelected ? 800 : 500,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.12)' : 'none'
                }}
              >
                <span style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: isSelected ? '#2563eb' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#475569',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
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
          background: '#f8fafc',
          padding: '0.85rem 1.25rem',
          borderRadius: '0.85rem',
          border: '1.5px solid #e2e8f0',
          marginTop: '0.25rem'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Cevabınızı İşaretleyin:
          </span>
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            {optionLetters.map((opt, optIdx) => {
              const isSelected = selectedOption === optIdx;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onSelectOption && onSelectOption(optIdx)}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`,
                    background: isSelected ? '#2563eb' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? '0 4px 10px rgba(37,99,235,0.25)' : 'none',
                    transition: 'all 0.15s ease'
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
