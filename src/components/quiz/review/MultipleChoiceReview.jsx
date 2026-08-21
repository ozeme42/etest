import React, { memo, useMemo, useState, useEffect } from 'react';
import { Eye, Key } from 'lucide-react';
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
 * MultipleChoiceReview Component
 * Displays multiple-choice review with student answer vs correct answer, option texts, and badges.
 */
export default function MultipleChoiceReview({
  question,
  qNo = 1,
  totalQuestions = 1,
  selectedOption = null,
  userAnswer = null,
  correctOption = null,
  correctAnswer = null,
  isCorrect = null,
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

  const normalizeAns = (val) => {
    if (val === null || val === undefined || val === '' || val === 'empty') return null;
    if (typeof val === 'number') return val;
    const str = String(val).trim().toUpperCase();
    if (/^[A-E]$/.test(str)) return str.charCodeAt(0) - 65;
    const num = Number(str);
    return (!isNaN(num) && num >= 0 && num <= 4) ? num : null;
  };

  const rawUser = selectedOption ?? userAnswer;
  const rawCorrect = correctOption ?? correctAnswer ?? question?.correctAnswer;

  const normalizedUser = normalizeAns(rawUser);
  const normalizedCorrect = normalizeAns(rawCorrect);

  const hasSelected = normalizedUser !== null;
  const effectiveIsCorrect = isCorrect !== null && isCorrect !== undefined
    ? isCorrect
    : (hasSelected && normalizedCorrect !== null ? normalizedUser === normalizedCorrect : null);

  const rawOptions = extractQuestionOptions(question);
  const isFiveOpts = Number(optionsCount) === 5 || rawOptions.length >= 5;
  const optionLetters = isFiveOpts ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];

  const qText = extractQuestionText(question, null, qNo - 1) || question?.questionText || question?.text || question?.question || question?.title || `Soru ${qNo}`;

  // Collect all resolved images
  const resolvedImages = useMemo(() => {
    const urls = [];
    if (Array.isArray(imageUrls) && imageUrls.length > 0) urls.push(...imageUrls);
    if (Array.isArray(question?.imageUrls) && question.imageUrls.length > 0) urls.push(...question.imageUrls);
    if (question?.imageUrl && typeof question.imageUrl === 'string' && question.imageUrl !== '[STORED_IN_INDEXEDDB]') urls.push(question.imageUrl);
    if (question?.contentPayload && typeof question.contentPayload === 'string' && (question.contentPayload.startsWith('data:image') || question.contentPayload.startsWith('http'))) urls.push(question.contentPayload);
    if (question?.imagePayload && typeof question.imagePayload === 'string' && (question.imagePayload.startsWith('data:image') || question.imagePayload.startsWith('http'))) urls.push(question.imagePayload);
    if (idbImage) urls.push(idbImage);
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
      border: effectiveIsCorrect === true ? '1.5px solid #86efac' : (hasSelected && effectiveIsCorrect === false ? '1.5px solid #fca5a5' : '1.5px solid #cbd5e1'),
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
          <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 800 }}>
            ○ BOŞ (Yanıtlanmadı)
          </span>
        ) : effectiveIsCorrect === true ? (
          <span style={{ fontSize: '0.78rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
            ✓ DOĞRU
          </span>
        ) : (
          <span style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
            ✗ YANLIŞ
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
            const isSelected = normalizedUser === optIdx;
            const isKeyOption = normalizedCorrect === optIdx;

            let cardBg = '#ffffff';
            let cardBorder = '1.5px solid #cbd5e1';
            let circleBg = '#f1f5f9';
            let circleColor = '#475569';
            let textColor = '#1e293b';

            if (isSelected) {
              if (effectiveIsCorrect === true) {
                cardBg = '#f0fdf4';
                cardBorder = '2px solid #16a34a';
                circleBg = '#16a34a';
                circleColor = '#ffffff';
                textColor = '#14532d';
              } else if (effectiveIsCorrect === false) {
                cardBg = '#fef2f2';
                cardBorder = '2px solid #dc2626';
                circleBg = '#dc2626';
                circleColor = '#ffffff';
                textColor = '#7f1d1d';
              }
            } else if (isKeyOption && !effectiveIsCorrect) {
              // Highlight the correct answer if student got it wrong or left blank
              cardBg = '#f0fdf4';
              cardBorder = '2px solid #16a34a';
              circleBg = '#16a34a';
              circleColor = '#ffffff';
              textColor = '#14532d';
            }

            return (
              <div
                key={optIdx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.85rem',
                  border: cardBorder,
                  background: cardBg,
                  color: textColor,
                  fontWeight: isSelected || isKeyOption ? 800 : 500,
                  fontSize: '0.92rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: circleBg,
                  color: circleColor,
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

                {isKeyOption && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    color: '#15803d',
                    background: '#dcfce7',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '0.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}>
                    <Key size={12} /> DOĞRU CEVAP
                  </span>
                )}
                {isSelected && !isKeyOption && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    color: '#b91c1c',
                    background: '#fee2e2',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '0.4rem'
                  }}>
                    ÖĞRENCİ SEÇİMİ
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Optical Bubble Strip Review (A, B, C, D, E) */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          background: '#f8fafc',
          padding: '1rem 1.25rem',
          borderRadius: '0.85rem',
          border: '1.5px solid #e2e8f0',
          marginTop: '0.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b' }}>ÖĞRENCİ SEÇİMİ:</span>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: 900,
                color: !hasSelected ? '#64748b' : effectiveIsCorrect === true ? '#15803d' : '#b91c1c',
                background: !hasSelected ? '#e2e8f0' : effectiveIsCorrect === true ? '#dcfce7' : '#fee2e2',
                padding: '0.2rem 0.6rem',
                borderRadius: '0.4rem'
              }}>
                {hasSelected ? optionLetters[normalizedUser] : 'Boş'}
              </span>
            </div>

            {normalizedCorrect !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b' }}>DOĞRU CEVAP:</span>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  color: '#15803d',
                  background: '#dcfce7',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '0.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3
                }}>
                  <Key size={12} /> {optionLetters[normalizedCorrect]}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            {optionLetters.map((opt, optIdx) => {
              const isUserChoice = normalizedUser === optIdx;
              const isKeyOption = normalizedCorrect === optIdx;

              let btnBg = '#ffffff';
              let btnBorder = '2px solid #cbd5e1';
              let btnColor = '#475569';

              if (isUserChoice) {
                if (effectiveIsCorrect === true) {
                  btnBg = '#16a34a';
                  btnBorder = '2px solid #16a34a';
                  btnColor = '#ffffff';
                } else {
                  btnBg = '#dc2626';
                  btnBorder = '2px solid #dc2626';
                  btnColor = '#ffffff';
                }
              } else if (isKeyOption && !effectiveIsCorrect) {
                btnBg = '#dcfce7';
                btnBorder = '2px solid #16a34a';
                btnColor = '#15803d';
              }

              return (
                <div
                  key={opt}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: btnBorder,
                    background: btnBg,
                    color: btnColor,
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isUserChoice ? '0 4px 10px rgba(0,0,0,0.15)' : 'none'
                  }}
                >
                  {opt}
                </div>
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
