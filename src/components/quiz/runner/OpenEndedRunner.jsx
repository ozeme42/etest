import React, { memo, useMemo, useState, useEffect } from 'react';
import { Check, Edit3, Eye, Pencil } from 'lucide-react';
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
 * OpenEndedRunner Component
 * Dedicated runner for Open-Ended (Written / Classical) questions.
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

  const resolvedImages = useMemo(() => {
    const urls = [];
    if (Array.isArray(imageUrls) && imageUrls.length > 0) urls.push(...imageUrls);
    if (Array.isArray(question?.imageUrls) && question.imageUrls.length > 0) urls.push(...question.imageUrls);
    if (Array.isArray(question?.images) && question.images.length > 0) urls.push(...question.images);
    if (question?.imageUrl && typeof question.imageUrl === 'string' && question.imageUrl !== '[STORED_IN_INDEXEDDB]') urls.push(question.imageUrl);
    if (question?.contentPayload && typeof question.contentPayload === 'string') {
      if (question.contentPayload.includes('\n\n') || question.contentPayload.includes('\n') || question.contentPayload.includes('|')) {
        const parts = question.contentPayload.split(/\n\n|\n|\|/).map(s => s.trim()).filter(s => s.startsWith('data:image') || s.startsWith('http') || /\.(png|jpe?g|webp|gif)/i.test(s));
        urls.push(...parts);
      } else if (question.contentPayload.startsWith('data:image') || question.contentPayload.startsWith('http')) {
        urls.push(question.contentPayload);
      }
    }
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
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#d97706',
            borderRadius: '0.4rem',
            fontWeight: 800,
            fontSize: '0.75rem'
          }}>
            ✍️ Açık Uçlu / Yazılı
          </span>
        </div>

        {hasText ? (
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
      {qText && (
        <div style={{
          fontSize: '0.95rem',
          lineHeight: 1.6,
          color: '#1e293b',
          fontWeight: 600
        }}>
          {qText}
        </div>
      )}

      {/* Open-Ended Response Input Area */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        marginTop: '0.25rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <label style={{
            fontSize: '0.85rem',
            fontWeight: 800,
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Edit3 size={15} color="#2563eb" />
            Öğrenci Yanıtınız (Yazılı / Açıklamalı Çözüm):
          </label>

          {onOpenDrawing && (
            <button
              type="button"
              onClick={onOpenDrawing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '0.3rem 0.65rem',
                borderRadius: '0.5rem',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Pencil size={13} color="#6366f1" />
              Çizim ile Yanıtla
            </button>
          )}
        </div>

        <textarea
          rows={isMobile ? 4 : 5}
          value={textVal}
          onChange={(e) => handleChange && handleChange(e.target.value)}
          placeholder="Cevabınızı, işlem basamaklarınızı veya açıklamanızı buraya detaylıca yazabilirsiniz..."
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            borderRadius: '0.75rem',
            border: '1.5px solid #cbd5e1',
            fontSize: '0.92rem',
            lineHeight: 1.6,
            color: '#0f172a',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
            background: '#ffffff'
          }}
        />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.74rem',
          color: '#64748b'
        }}>
          <span>✍️ Cevabınız otomatik olarak kaydedilmektedir.</span>
          <span>{textVal.length} Karakter</span>
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
