import React, { memo } from 'react';
import { Eye, Key } from 'lucide-react';

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
 * Displays multiple-choice review with student answer vs correct answer and badges.
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
  const isFiveOpts = Number(optionsCount) === 5;
  const optionLetters = isFiveOpts ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
  const hasSelected = selectedOption !== null && selectedOption !== undefined && typeof selectedOption === 'number';
  const qText = question?.questionText || question?.text || question?.question || question?.title || `Soru ${qNo}`;

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
          fontSize: '0.95rem',
          lineHeight: 1.6,
          color: '#1e293b',
          fontWeight: 600
        }}>
          {qText}
        </div>
      )}

      {/* Review Options Row */}
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
