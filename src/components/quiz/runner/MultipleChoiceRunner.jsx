import React, { memo } from 'react';
import { Check, Eye } from 'lucide-react';
import { extractQuestionText, extractQuestionOptions } from '../../../utils/testResolver';

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
  const rawOptions = extractQuestionOptions(question);
  const isFiveOpts = Number(optionsCount) === 5 || rawOptions.length >= 5;
  const optionLetters = isFiveOpts ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];

  const qText = extractQuestionText(question, null, qNo - 1) || question?.questionText || question?.text || question?.question || question?.title || `Soru ${qNo}`;

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
      {Array.isArray(imageUrls) && imageUrls.map((url, idx) => (
        <StandardImageFrame
          key={idx}
          src={url}
          alt={`Soru ${qNo} Görsel ${idx + 1}`}
          onOpenFullscreen={() => onOpenLightbox && onOpenLightbox(url)}
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
                key={optObj.letter}
                type="button"
                onClick={() => onSelectOption(optIdx)}
                style={{
                  width: '100%',
                  padding: isMobile ? '0.75rem 1rem' : '0.9rem 1.25rem',
                  borderRadius: '0.85rem',
                  border: isSelected ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1d4ed8' : '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.15)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isSelected ? '#2563eb' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  flexShrink: 0
                }}>
                  {optObj.letter}
                </span>
                <span style={{
                  fontSize: '0.95rem',
                  fontWeight: isSelected ? 800 : 600,
                  lineHeight: 1.5,
                  color: isSelected ? '#1e40af' : '#1e293b'
                }}>
                  {optObj.hasText ? optObj.text : `Seçenek ${optObj.letter}`}
                </span>
                {isSelected && (
                  <Check size={18} color="#2563eb" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Horizontal Compact Optical Buttons (for image-based questions) */
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: isMobile ? '0.45rem' : '0.75rem',
          marginTop: '0.25rem'
        }}>
          {optionLetters.map((opt, optIdx) => {
            const isSelected = selectedOption === optIdx;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onSelectOption(optIdx)}
                style={{
                  flex: isMobile ? '1 1 calc(50% - 0.45rem)' : '1 1 0',
                  minWidth: isMobile ? '70px' : '90px',
                  height: isMobile ? '48px' : '52px',
                  borderRadius: '0.85rem',
                  border: isSelected ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1d4ed8' : '#334155',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isSelected ? '#2563eb' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 900
                }}>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
