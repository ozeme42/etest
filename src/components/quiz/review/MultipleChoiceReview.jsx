import React, { memo } from 'react';
import { Eye, Key } from 'lucide-react';
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
 * MultipleChoiceReview Component
 * Displays multiple-choice review with student answer vs correct answer, option texts, and badges.
 */
export default function MultipleChoiceReview({
  question,
  qNo = 1,
  totalQuestions = 1,
  selectedOption = null,
  correctOption = null,
  isCorrect = null,
  optionsCount = 4,
  imageUrls = [],
  onOpenLightbox,
  isMobile = false
}) {
  const rawOptions = extractQuestionOptions(question);
  const isFiveOpts = Number(optionsCount) === 5 || rawOptions.length >= 5;
  const optionLetters = isFiveOpts ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
  const hasSelected = selectedOption !== null && selectedOption !== undefined && typeof selectedOption === 'number';

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
      border: isCorrect === true ? '1.5px solid #86efac' : isCorrect === false ? '1.5px solid #fca5a5' : '1.5px solid #cbd5e1',
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

        {/* Result Badge */}
        {!hasSelected ? (
          <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
            ○ BOŞ (0P)
          </span>
        ) : isCorrect === true ? (
          <span style={{ fontSize: '0.78rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
            ✓ DOĞRU (10P)
          </span>
        ) : (
          <span style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
            ✗ YANLIŞ (0P)
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
            const isKeyOption = correctOption === optIdx;

            let cardBg = '#ffffff';
            let cardBorder = '1.5px solid #cbd5e1';
            let circleBg = '#f1f5f9';
            let circleColor = '#475569';
            let textColor = '#1e293b';

            if (isSelected && isKeyOption) {
              cardBg = '#f0fdf4';
              cardBorder = '2px solid #16a34a';
              circleBg = '#16a34a';
              circleColor = '#ffffff';
              textColor = '#15803d';
            } else if (isSelected && !isKeyOption) {
              cardBg = '#fef2f2';
              cardBorder = '2px solid #ef4444';
              circleBg = '#ef4444';
              circleColor = '#ffffff';
              textColor = '#b91c1c';
            } else if (!isSelected && isKeyOption) {
              cardBg = '#f5f3ff';
              cardBorder = '2px solid #8b5cf6';
              circleBg = '#8b5cf6';
              circleColor = '#ffffff';
              textColor = '#6d28d9';
            }

            return (
              <div
                key={optObj.letter}
                style={{
                  width: '100%',
                  padding: isMobile ? '0.75rem 1rem' : '0.9rem 1.25rem',
                  borderRadius: '0.85rem',
                  border: cardBorder,
                  background: cardBg,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  userSelect: 'none'
                }}
              >
                <span style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: circleBg,
                  color: circleColor,
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
                  fontWeight: (isSelected || isKeyOption) ? 800 : 600,
                  lineHeight: 1.5,
                  color: textColor
                }}>
                  {optObj.hasText ? optObj.text : `Seçenek ${optObj.letter}`}
                </span>

                {isSelected && isKeyOption && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#15803d', background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontWeight: 900, flexShrink: 0 }}>
                    ✓ Doğru Yanıtınız
                  </span>
                )}
                {isSelected && !isKeyOption && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#b91c1c', background: '#fee2e2', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontWeight: 900, flexShrink: 0 }}>
                    ✗ Yanlış Yanıtınız
                  </span>
                )}
                {!isSelected && isKeyOption && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6d28d9', background: '#ede9fe', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontWeight: 900, flexShrink: 0 }}>
                    🔑 Doğru Cevap
                  </span>
                )}
              </div>
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
            const isKeyOption = correctOption === optIdx;

            let btnBg = '#ffffff';
            let btnBorder = '1.5px solid #cbd5e1';
            let btnColor = '#334155';
            let badgeText = opt;

            if (isSelected && isKeyOption) {
              btnBg = '#f0fdf4';
              btnBorder = '2px solid #16a34a';
              btnColor = '#15803d';
              badgeText = `${opt} ✓`;
            } else if (isSelected && !isKeyOption) {
              btnBg = '#fef2f2';
              btnBorder = '2px solid #ef4444';
              btnColor = '#b91c1c';
              badgeText = `${opt} ✗`;
            } else if (!isSelected && isKeyOption) {
              btnBg = '#f5f3ff';
              btnBorder = '2px solid #8b5cf6';
              btnColor = '#7c3aed';
              badgeText = `${opt} 🔑`;
            }

            return (
              <div
                key={opt}
                style={{
                  flex: isMobile ? '1 1 calc(50% - 0.45rem)' : '1 1 0',
                  minWidth: isMobile ? '70px' : '90px',
                  height: isMobile ? '48px' : '52px',
                  borderRadius: '0.85rem',
                  border: btnBorder,
                  background: btnBg,
                  color: btnColor,
                  fontWeight: 900,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  userSelect: 'none'
                }}
              >
                <span>{badgeText}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Answer Key Note */}
      {correctOption !== null && correctOption !== undefined && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.78rem',
          color: '#64748b',
          fontWeight: 700
        }}>
          <Key size={13} color="#8b5cf6" />
          <span>Doğru Cevap: <strong>{optionLetters[correctOption] || correctOption}</strong></span>
        </div>
      )}
    </div>
  );
}
