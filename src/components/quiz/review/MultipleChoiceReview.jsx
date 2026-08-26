import React, { memo, useMemo, useState, useEffect } from 'react';
import { Eye, Key, Check, X, HelpCircle, Lightbulb, Sparkles, BookOpen } from 'lucide-react';
import { extractQuestionText, extractQuestionOptions } from '../../../utils/testResolver';
import { idbGetPayload } from '../../../services/indexedDbService';
import ImageLightbox from '../common/ImageLightbox';
import ScreenSnipperAndSolverModal from '../ai/ScreenSnipperAndSolverModal';

const MISTAKE_REASON_OPTIONS = [
  { label: '⚡ İşlem Hatası', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { label: '⚠️ Dikkat Kaybı', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  { label: '📖 Formül / Bilgi', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  { label: '🧠 Konu Eksiği', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
  { label: '⏱️ Zaman Yetmedi', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' }
];

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
      background: '#f8fafc',
      border: '1.5px solid #e2e8f0',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
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
            justifyContent: 'center'
          }}
        >
          <Eye size={16} />
        </button>
      )}
    </div>
  );
});

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
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [mistakeReason, setMistakeReason] = useState(() => {
    try {
      const saved = localStorage.getItem(`mistake_mc_${question?.id || qNo}`);
      return saved || '';
    } catch {
      return '';
    }
  });

  const handleSetMistakeReason = (reason) => {
    const next = mistakeReason === reason ? '' : reason;
    setMistakeReason(next);
    try {
      localStorage.setItem(`mistake_mc_${question?.id || qNo}`, next);
    } catch {}
  };

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
  const effectiveIsCorrect = (hasSelected && normalizedCorrect !== null)
    ? normalizedUser === normalizedCorrect
    : (isCorrect !== null && isCorrect !== undefined ? isCorrect : null);

  const rawOptions = extractQuestionOptions(question);
  const isFiveOpts = Number(optionsCount) === 5 || rawOptions.length >= 5;
  const optionLetters = isFiveOpts ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];

  const qText = extractQuestionText(question, null, qNo - 1) || question?.questionText || question?.text || question?.question || question?.title || `Soru ${qNo}`;
  const explanation = question?.explanation || question?.solution || question?.answerExplanation || '';
  const topicName = question?.topic || question?.topicName || '';

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

  let cardBorder = '1.5px solid #e2e8f0';
  let headerBg = 'linear-gradient(135deg, #4f46e5, #7c3aed)';
  if (effectiveIsCorrect === true) {
    cardBorder = '2px solid #86efac';
  } else if (effectiveIsCorrect === false) {
    cardBorder = '2px solid #fca5a5';
  }

  return (
    <div
      id={`review-q-${qNo}`}
      style={{
        background: '#ffffff',
        borderRadius: isMobile ? '1.25rem' : '1.5rem',
        border: cardBorder,
        padding: isMobile ? '1.1rem' : '1.65rem',
        boxShadow: effectiveIsCorrect === true
          ? '0 10px 30px -5px rgba(16, 185, 129, 0.12)'
          : effectiveIsCorrect === false
            ? '0 10px 30px -5px rgba(239, 68, 68, 0.12)'
            : '0 6px 20px -4px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        position: 'relative'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1.5px solid #f1f5f9',
        paddingBottom: '0.85rem',
        flexWrap: 'wrap',
        gap: '0.65rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.85rem',
            background: headerBg,
            color: '#ffffff',
            borderRadius: '0.75rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.82rem' : '0.88rem',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
          }}>
            <span>SORU {qNo}</span>
            {totalQuestions > 1 && <span style={{ opacity: 0.8, fontSize: '0.76rem' }}>/ {totalQuestions}</span>}
          </div>

          {topicName && (
            <span style={{ padding: '0.22rem 0.65rem', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '0.6rem', fontWeight: 800, fontSize: '0.74rem' }}>
              🏷️ {topicName}
            </span>
          )}

          <span style={{ padding: '0.22rem 0.65rem', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: '0.6rem', fontWeight: 800, fontSize: '0.72rem' }}>
            🔘 Çoktan Seçmeli
          </span>
        </div>

        {!hasSelected ? (
          <span style={{ fontSize: '0.82rem', color: '#64748b', background: '#f1f5f9', border: '1.5px solid #cbd5e1', padding: '0.25rem 0.85rem', borderRadius: '99px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5 }}>
            <HelpCircle size={15} /> BOŞ (Yanıtlanmadı)
          </span>
        ) : effectiveIsCorrect === true ? (
          <span style={{ fontSize: '0.82rem', color: '#15803d', background: '#dcfce7', border: '1.5px solid #86efac', padding: '0.25rem 0.85rem', borderRadius: '99px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(16,185,129,0.2)' }}>
            <Check size={16} strokeWidth={3} /> DOĞRU CEVAP (+1 Net)
          </span>
        ) : (
          <span style={{ fontSize: '0.82rem', color: '#b91c1c', background: '#fee2e2', border: '1.5px solid #fca5a5', padding: '0.25rem 0.85rem', borderRadius: '99px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(239,68,68,0.2)' }}>
            <X size={16} strokeWidth={3} /> YANLIŞ CEVAP (-0.25 Net)
          </span>
        )}
      </div>

      {/* Stage */}
      <div style={{
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: '1.15rem',
        padding: isMobile ? '1rem 1.15rem' : '1.35rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        {resolvedImages.map((url, idx) => (
          <StandardImageFrame
            key={idx}
            src={url}
            alt={`Soru ${qNo} Görsel ${idx + 1}`}
            onOpenFullscreen={() => handleOpenImage(url)}
          />
        ))}

        {qText && !qText.startsWith('Soru ') && (
          <div style={{
            fontSize: '1rem',
            lineHeight: 1.7,
            color: '#0f172a',
            fontWeight: 600,
            whiteSpace: 'pre-wrap'
          }}>
            {qText}
          </div>
        )}
      </div>

      {/* Options */}
      {hasAnyOptionText ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
          {optionsWithText.map((optObj, optIdx) => {
            const isUserSelected = normalizedUser === optIdx;
            const isKeyOption = normalizedCorrect === optIdx;

            let cardBg = '#ffffff';
            let cardBorder = '1.5px solid #e2e8f0';
            let circleBg = '#f1f5f9';
            let circleColor = '#475569';
            let textColor = '#1e293b';

            if (isUserSelected) {
              if (effectiveIsCorrect === true) {
                cardBg = 'linear-gradient(135deg, #f0fdf4, #dcfce7)';
                cardBorder = '2px solid #16a34a';
                circleBg = '#16a34a';
                circleColor = '#ffffff';
                textColor = '#14532d';
              } else {
                cardBg = 'linear-gradient(135deg, #fef2f2, #fee2e2)';
                cardBorder = '2px solid #dc2626';
                circleBg = '#dc2626';
                circleColor = '#ffffff';
                textColor = '#7f1d1d';
              }
            } else if (isKeyOption && !effectiveIsCorrect) {
              cardBg = 'linear-gradient(135deg, #f0fdf4, #ecfdf5)';
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
                  gap: '1rem',
                  padding: isMobile ? '0.85rem 1rem' : '1rem 1.25rem',
                  borderRadius: '1rem',
                  border: cardBorder,
                  background: cardBg,
                  color: textColor,
                  fontWeight: isUserSelected || isKeyOption ? 800 : 500,
                  fontSize: isMobile ? '0.92rem' : '0.98rem',
                  boxShadow: (isUserSelected || isKeyOption) ? '0 4px 14px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '0.75rem',
                  background: circleBg,
                  color: circleColor,
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: (isUserSelected || isKeyOption) ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                }}>
                  {optObj.letter}
                </span>

                <span style={{ flex: 1, lineHeight: 1.55 }}>
                  {optObj.text}
                </span>

                {isKeyOption && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    color: '#15803d',
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: '0 2px 6px rgba(16,185,129,0.2)'
                  }}>
                    <Key size={13} /> DOĞRU CEVAP
                  </span>
                )}

                {isUserSelected && !isKeyOption && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    color: '#b91c1c',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <X size={13} /> SİZİN SEÇİMİNİZ
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          background: '#f8fafc',
          padding: isMobile ? '0.85rem 1.15rem' : '1.15rem 1.5rem',
          borderRadius: '1.15rem',
          border: '1.5px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#64748b' }}>SİZİN CEVABINIZ:</span>
              <span style={{
                fontSize: '0.88rem',
                fontWeight: 900,
                color: !hasSelected ? '#64748b' : effectiveIsCorrect === true ? '#15803d' : '#b91c1c',
                background: !hasSelected ? '#e2e8f0' : effectiveIsCorrect === true ? '#dcfce7' : '#fee2e2',
                padding: '0.25rem 0.75rem',
                borderRadius: '0.5rem'
              }}>
                {hasSelected ? optionLetters[normalizedUser] : 'Boş'}
              </span>
            </div>

            {normalizedCorrect !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#64748b' }}>DOĞRU CEVAP:</span>
                <span style={{
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  color: '#15803d',
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Key size={13} /> {optionLetters[normalizedCorrect]}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.9), rgba(236, 253, 245, 0.6))',
          border: '1.5px solid #86efac',
          borderRadius: '1.15rem',
          padding: isMobile ? '1rem' : '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', fontWeight: 900, fontSize: '0.92rem' }}>
            <Lightbulb size={18} color="#10b981" />
            <span>💡 Çözüm Rehberi & Detaylı Açıklama:</span>
          </div>
          <div style={{ fontSize: '0.92rem', color: '#166534', lineHeight: 1.65, fontWeight: 500, whiteSpace: 'pre-wrap' }}>
            {explanation}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          MISTAKE DIAGNOSTIC SELECTOR & AI SOLVE BUTTON
      ════════════════════════════════════════════ */}
      {(effectiveIsCorrect === false || !hasSelected) && (
        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px dashed #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: effectiveIsCorrect === false ? '#b91c1c' : '#64748b' }}>
              {effectiveIsCorrect === false ? '🤔 Yanlış Sebebi:' : '⚪ Boş Sebebi:'}
            </span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {MISTAKE_REASON_OPTIONS.map(r => {
                const isSelected = mistakeReason === r.label || (mistakeReason && String(mistakeReason).includes(r.label.slice(2).trim()));
                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => handleSetMistakeReason(r.label)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      borderRadius: 6,
                      border: `1.5px solid ${isSelected ? r.color : r.border}`,
                      background: isSelected ? r.color : r.bg,
                      color: isSelected ? '#ffffff' : r.color,
                      cursor: 'pointer',
                      boxShadow: isSelected ? `0 2px 6px ${r.color}33` : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Soru ${qNo} için sebebi "${r.label}" olarak kaydet`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ✂️ AI Soru Çözümü Butonu */}
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            style={{
              padding: '0.3rem 0.85rem',
              fontSize: '0.78rem',
              fontWeight: 900,
              borderRadius: 8,
              border: '1.5px solid #a855f7',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.1))',
              color: '#7c3aed',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 2px 6px rgba(168,85,247,0.2)',
              transition: 'all 0.15s ease'
            }}
            title={`Soru ${qNo} için yapay zeka çözümü ve analizi`}
          >
            <Sparkles size={14} color="#a855f7" />
            <span>✨ AI Soru Çözümü</span>
          </button>
        </div>
      )}

      {activeLightbox && (
        <ImageLightbox
          isOpen={Boolean(activeLightbox)}
          src={activeLightbox}
          onClose={() => setActiveLightbox(null)}
        />
      )}

      {/* ── AI QUESTION SOLVER & SCREEN SNIPPER MODAL ── */}
      {aiModalOpen && (
        <ScreenSnipperAndSolverModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          questionNo={qNo}
          question={{
            ...question,
            questionText: parsedQuestionText || question?.questionText || '',
            options: parsedOptions.length > 0 ? parsedOptions : (question?.options || [])
          }}
          existingImageUrl={activeImgSrc}
          mistakeReason={mistakeReason || ''}
          onMistakeReasonChange={handleSetMistakeReason}
          studentAnswer={hasSelected ? optionLetters[normalizedUser] : 'Boş'}
          correctAnswer={normalizedCorrect !== null ? optionLetters[normalizedCorrect] : (question?.correctAnswerLetter || '')}
          subject={question?.subject || 'Genel'}
          topic={question?.topic || ''}
          testId={question?.testId || `mc_${qNo}`}
        />
      )}
    </div>
  );
}
