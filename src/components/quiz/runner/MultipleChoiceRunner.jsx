import React, { memo, useMemo, useState, useEffect } from 'react';
import { Check, Eye, Pencil, Sparkles, HelpCircle, Zap, Star, Bookmark } from 'lucide-react';
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
      borderRadius: '1rem',
      overflow: 'hidden',
      background: 'var(--color-surface-hover)',
      border: '1.5px solid var(--color-border)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      marginBottom: '0.85rem'
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
            top: 10,
            right: 10,
            padding: '0.45rem',
            borderRadius: '0.65rem',
            background: 'rgba(15,23,42,0.75)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
          }}
        >
          <Eye size={16} />
        </button>
      )}
    </div>
  );
});

/**
 * Helper to render formatted text with styled bold keywords, premises (I, II, III), and code/math
 */
function FormattedQuestionText({ text }) {
  if (!text) return null;

  // Split by line breaks and process
  const lines = text.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} style={{ height: '0.3rem' }} />;

        // Check if this line is a Roman numeral premise (I., II., III., IV.) or bullet
        const isPremise = /^([IVXLCDM]+\.|\d+\.|[a-z]\))\s+/i.test(trimmed);

        // Bold parser
        const parts = line.split(/(\*{2,}[^*]+\*{2,})/g);

        const renderedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong
                key={pIdx}
                style={{
                  fontWeight: 900,
                  color: 'var(--color-text)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  padding: '1px 5px',
                  borderRadius: '4px'
                }}
              >
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isPremise) {
          return (
            <div
              key={lIdx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                background: 'var(--color-surface-hover)',
                borderLeft: '3.5px solid #6366f1',
                padding: '0.45rem 0.85rem',
                borderRadius: '0 0.65rem 0.65rem 0',
                fontSize: '0.96rem',
                lineHeight: 1.6,
                fontWeight: 600,
                color: 'var(--color-text)'
              }}
            >
              <span>{renderedLine}</span>
            </div>
          );
        }

        return (
          <div
            key={lIdx}
            style={{
              fontSize: '1rem',
              lineHeight: 1.7,
              color: 'var(--color-text)',
              fontWeight: 500
            }}
          >
            {renderedLine}
          </div>
        );
      })}
    </div>
  );
}

/**
 * MultipleChoiceRunner Component
 * Dedicated runner for Multiple-Choice questions with vibrant, high-contrast, modern UI.
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
  const subjectName = question?.subject || question?.subjectName || '';
  const topicName = question?.topic || question?.topicName || '';
  const difficulty = question?.difficulty || 'Orta';

  // Collect all resolved images
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

    if (Array.isArray(imageUrls) && imageUrls.length > 0) imageUrls.forEach(addVal);
    if (urls.length === 0 && question?.imageUrl) addVal(question.imageUrl);
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
    if (urls.length === 0) {
      addVal(question?.imagePayload);
      addVal(question?.contentPayload);
    }
    if (urls.length === 0 && idbImage) addVal(idbImage);

    return Array.from(new Set(urls.filter(Boolean)));
  }, [imageUrls, question, qNo, idbImage]);

  const handleOpenImage = (src) => {
    if (onOpenLightbox) onOpenLightbox(src);
    else setActiveLightbox(src);
  };

  // Extract option texts
  const optionsWithText = useMemo(() => {
    let opts = (Array.isArray(rawOptions) && rawOptions.length > 0) ? rawOptions : (
      (Array.isArray(question?.options) && question.options.length > 0) ? question.options : (
        (Array.isArray(question?.choices) && question.choices.length > 0) ? question.choices : (
          (Array.isArray(question?.secenekler) && question.secenekler.length > 0) ? question.secenekler : []
        )
      )
    );

    const cleanOptionPrefix = (str, idx) => {
      if (!str || typeof str !== 'string') return str;
      const letter = String.fromCharCode(65 + idx);
      const regex = new RegExp(`^(?:\\(|\\[)?${letter}(?:\\)|\\.|\\:|\\]|-)\\s*`, 'i');
      return str.replace(regex, '').trim();
    };

    return optionLetters.map((opt, optIdx) => {
      const raw = opts ? opts[optIdx] : null;
      let text = '';
      if (typeof raw === 'string') text = cleanOptionPrefix(raw.trim(), optIdx);
      else if (raw && typeof raw === 'object') {
        const rawT = raw.text || raw.optionText || raw.label || raw.title || raw.value || raw.content || raw.secenekText || '';
        text = cleanOptionPrefix(String(rawT).trim(), optIdx);
      }
      const cleanText = text.trim();
      const lower = cleanText.toLowerCase();
      const isPlaceholder = !cleanText || lower === opt.toLowerCase() || lower === `şık ${opt.toLowerCase()}` || lower === `sik ${opt.toLowerCase()}` || lower === `seçenek ${opt.toLowerCase()}` || lower === `secenek ${opt.toLowerCase()}` || lower === `option ${opt.toLowerCase()}`;
      return {
        letter: opt,
        text: isPlaceholder ? '' : cleanText,
        hasText: !isPlaceholder
      };
    });
  }, [rawOptions, question, optionLetters]);

  const hasAnyOptionText = optionsWithText.some(o => o.hasText);

  // Difficulty badge colors
  const diffBadge = {
    'Kolay': { bg: 'rgba(16,185,129,0.12)', text: '#10b981', border: 'rgba(16,185,129,0.3)', icon: '🌱' },
    'Orta': { bg: 'rgba(99,102,241,0.12)', text: '#6366f1', border: 'rgba(99,102,241,0.3)', icon: '🎯' },
    'Zor': { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)', icon: '🔥' },
    'Yeni Nesil': { bg: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(139,92,246,0.15))', text: '#ec4899', border: 'rgba(236,72,153,0.35)', icon: '🌟' }
  }[difficulty] || { bg: 'rgba(99,102,241,0.12)', text: '#6366f1', border: 'rgba(99,102,241,0.3)', icon: '🎯' };

  return (
    <div
      id={`q-card-${qNo}`}
      style={{
        background: 'var(--color-surface, #ffffff)',
        borderRadius: isMobile ? '1.25rem' : '1.5rem',
        border: (selectedOption !== null && selectedOption !== undefined) ? '2px solid #6366f1' : '1.5px solid var(--color-border)',
        padding: isMobile ? '1.1rem' : '1.65rem',
        boxShadow: (selectedOption !== null && selectedOption !== undefined)
          ? '0 12px 35px -5px rgba(99, 102, 241, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.1)'
          : '0 6px 25px -4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative'
      }}
    >
      {/* ── TOP HEADER BAR (Vibrant Badges & Status) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1.5px solid var(--color-border)',
        paddingBottom: '0.85rem',
        flexWrap: 'wrap',
        gap: '0.65rem'
      }}>
        {/* Left: Question Badge, Subject, Topic & Difficulty */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.85rem',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#ffffff',
            borderRadius: '0.75rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.82rem' : '0.9rem',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
            letterSpacing: '0.02em'
          }}>
            <span>SORU {qNo}</span>
            {totalQuestions > 1 && <span style={{ opacity: 0.8, fontSize: '0.76rem' }}>/ {totalQuestions}</span>}
          </div>

          {subjectName && (
            <span style={{
              padding: '0.25rem 0.65rem',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#3b82f6',
              borderRadius: '0.6rem',
              fontWeight: 800,
              fontSize: '0.74rem'
            }}>
              📘 {subjectName}
            </span>
          )}

          {topicName && (
            <span style={{
              padding: '0.25rem 0.65rem',
              background: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              borderRadius: '0.6rem',
              fontWeight: 700,
              fontSize: '0.74rem'
            }}>
              🏷️ {topicName}
            </span>
          )}

          <span style={{
            padding: '0.25rem 0.65rem',
            background: diffBadge.bg,
            border: `1px solid ${diffBadge.border}`,
            color: diffBadge.text,
            borderRadius: '0.6rem',
            fontWeight: 800,
            fontSize: '0.72rem',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span>{diffBadge.icon}</span>
            <span>{difficulty}</span>
          </span>
        </div>

        {/* Right: Drawing tool & Answer Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onOpenDrawing && (
            <button
              type="button"
              onClick={onOpenDrawing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '0.6rem',
                border: '1.5px solid var(--color-border-input)',
                background: 'var(--color-surface-hover)',
                color: 'var(--color-text)',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              title="Soru Üzerinde Çizim ve Karalama Yap"
            >
              <Pencil size={14} color="#6366f1" />
              <span>{isMobile ? 'Çizim' : 'Karalama Tahtası'}</span>
            </button>
          )}

          {selectedOption !== null && selectedOption !== undefined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                fontSize: '0.8rem',
                color: '#10b981',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                padding: '0.25rem 0.75rem',
                borderRadius: '99px',
                boxShadow: '0 2px 8px rgba(16,185,129,0.2)'
              }}>
                <Check size={14} strokeWidth={3} /> Cevaplandı ({optionLetters[selectedOption] || selectedOption})
              </span>
              <button
                type="button"
                onClick={() => onSelectOption && onSelectOption(null)}
                style={{
                  padding: '0.25rem 0.55rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-hover)',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                title="Seçilen Cevabı Temizle"
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
              padding: '0.25rem 0.65rem',
              borderRadius: '99px',
              border: '1px solid var(--color-border)'
            }}>
              ⏳ Yanıtlanmadı
            </span>
          )}
        </div>
      </div>

      {/* ── QUESTION STAGE (Framed Canvas with Rich Typography) ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.04) 0%, rgba(99, 102, 241, 0.01) 100%)',
        border: '1.5px solid rgba(99, 102, 241, 0.18)',
        borderRadius: '1.15rem',
        padding: isMobile ? '1rem 1.15rem' : '1.35rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.02)'
      }}>
        {/* Question Images */}
        {resolvedImages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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

        {/* Question Text with Rich Premises & Highlights */}
        {qText && !qText.startsWith('Soru ') && (
          <FormattedQuestionText text={qText} />
        )}
      </div>

      {/* ── OPTIONS RENDERING (Vibrant Interactive Tiles) ── */}
      {hasAnyOptionText ? (
        /* Vertical Stacked Options with Full Text */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.35rem' }}>
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
                  gap: '1rem',
                  padding: isMobile ? '0.85rem 1rem' : '1rem 1.25rem',
                  borderRadius: '1rem',
                  border: isSelected ? '2px solid #6366f1' : '1.5px solid var(--color-border)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.08))'
                    : 'var(--color-surface, #ffffff)',
                  color: isSelected ? '#4338ca' : 'var(--color-text)',
                  fontWeight: isSelected ? 800 : 500,
                  fontSize: isMobile ? '0.92rem' : '0.98rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isSelected
                    ? '0 6px 20px rgba(99,102,241,0.2), 0 0 0 1px rgba(99,102,241,0.2)'
                    : '0 2px 8px rgba(0,0,0,0.02)',
                  position: 'relative'
                }}
              >
                {/* Option Letter Pill */}
                <span style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '0.75rem',
                  background: isSelected
                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                    : 'var(--color-surface-hover)',
                  color: isSelected ? '#ffffff' : 'var(--color-text)',
                  border: isSelected ? 'none' : '1.5px solid var(--color-border)',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isSelected ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
                  transition: 'all 0.15s ease'
                }}>
                  {optObj.letter}
                </span>

                {/* Option Content Text */}
                <span style={{ flex: 1, lineHeight: 1.55 }}>
                  {optObj.text}
                </span>

                {/* Selected Checkmark Halo */}
                {isSelected && (
                  <span style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(16,185,129,0.35)'
                  }}>
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
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
          padding: isMobile ? '0.85rem 1.15rem' : '1rem 1.5rem',
          borderRadius: '1.15rem',
          border: '1.5px solid var(--color-border)',
          marginTop: '0.35rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text)' }}>
            🔘 Cevabınızı İşaretleyin:
          </span>
          <div style={{ display: 'flex', gap: isMobile ? '0.55rem' : '0.75rem' }}>
            {optionLetters.map((opt, optIdx) => {
              const isSelected = selectedOption === optIdx;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onSelectOption && onSelectOption(isSelected ? null : optIdx)}
                  style={{
                    width: isMobile ? '42px' : '48px',
                    height: isMobile ? '42px' : '48px',
                    borderRadius: '0.85rem',
                    border: isSelected ? '2px solid #4f46e5' : '1.5px solid var(--color-border-input)',
                    background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface)',
                    color: isSelected ? '#ffffff' : 'var(--color-text)',
                    fontWeight: 900,
                    fontSize: '1.05rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? '0 6px 16px rgba(99,102,241,0.35)' : 'none',
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
