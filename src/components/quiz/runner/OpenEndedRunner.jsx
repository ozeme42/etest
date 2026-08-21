import React, { memo } from 'react';
import { Check, Edit3, Eye, Pencil } from 'lucide-react';

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
  const handleChange = onChangeAnswerText || onChange || onTextChange;
  const textVal = String(answerText ?? value ?? userAnswerText ?? '');
  const hasText = textVal.trim() !== '';
  const qText = question?.questionText || question?.text || question?.question || question?.title || `Soru ${qNo}`;

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
      {Array.isArray(imageUrls) && imageUrls.map((url, idx) => (
        <StandardImageFrame
          key={idx}
          src={url}
          alt={`Soru ${qNo} Görsel ${idx + 1}`}
          onOpenFullscreen={() => onOpenLightbox && onOpenLightbox(url)}
        />
      ))}

      {/* Question Text (if present and not a generic title) */}
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
              <Pencil size={13} /> Çizim ile Yanıtla
            </button>
          )}
        </div>

        <textarea
          value={textVal}
          onChange={(e) => handleChange && handleChange(e.target.value)}
          placeholder={`Soru ${qNo} için açık uçlu / yazılı yanıtınızı buraya detaylı olarak yazınız...`}
          rows={isMobile ? 4 : 5}
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            borderRadius: '0.85rem',
            border: hasText ? '1.5px solid #93c5fd' : '1.5px solid #cbd5e1',
            background: hasText ? '#f8faff' : '#ffffff',
            color: '#0f172a',
            fontSize: '0.92rem',
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s ease'
          }}
          onFocus={(e) => { e.target.style.borderColor = '#2563eb'; }}
          onBlur={(e) => { e.target.style.borderColor = hasText ? '#93c5fd' : '#cbd5e1'; }}
        />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.72rem',
          color: '#94a3b8',
          fontWeight: 700
        }}>
          <span>✍️ Cevabınız otomatik olarak kaydedilmektedir.</span>
          <span>{textVal.length} Karakter</span>
        </div>
      </div>
    </div>
  );
}
