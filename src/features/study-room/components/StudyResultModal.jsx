import React from 'react';
import { CheckCircle2, Trophy, Clock, Target, ArrowRight, X } from 'lucide-react';
import { formatSecToMinSec } from '../constants/studyRoomConstants';

export default function StudyResultModal({
  result,
  onClose,
  onViewResults,
  themeObj,
  isMobile
}) {
  if (!result) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '1rem' : '1.5rem'
    }}>
      <div style={{
        background: themeObj.cardBg,
        border: `1px solid ${themeObj.border}`,
        borderRadius: 24,
        width: '100%',
        maxWidth: 480,
        padding: isMobile ? '1.5rem 1.25rem' : '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)',
        position: 'relative'
      }}>
        {/* Kapat Butonu */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: themeObj.subText,
            cursor: 'pointer',
            padding: 4
          }}
        >
          <X size={20} />
        </button>

        {/* Başarı İkonu */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
          marginBottom: 16
        }}>
          <Trophy size={32} />
        </div>

        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: themeObj.text }}>
          Harika İş Çıkardın! 🎉
        </h2>
        <div style={{ fontSize: '0.82rem', color: themeObj.subText, marginTop: 4, marginBottom: 18 }}>
          {result.title || result.testTitle || 'Test Sonucu'} başarıyla kaydedildi.
        </div>

        {/* Skor Kartları Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          width: '100%',
          marginBottom: 14
        }}>
          <div style={{
            background: themeObj.innerBg,
            borderRadius: 14,
            padding: '0.75rem 0.5rem',
            border: `1px solid ${themeObj.border}`
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10b981' }}>Doğru</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10b981', marginTop: 2 }}>
              {result.correctCount || 0}
            </div>
          </div>

          <div style={{
            background: themeObj.innerBg,
            borderRadius: 14,
            padding: '0.75rem 0.5rem',
            border: `1px solid ${themeObj.border}`
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ef4444' }}>Yanlış</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ef4444', marginTop: 2 }}>
              {result.wrongCount || 0}
            </div>
          </div>

          <div style={{
            background: themeObj.innerBg,
            borderRadius: 14,
            padding: '0.75rem 0.5rem',
            border: `1px solid ${themeObj.border}`
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366f1' }}>Net</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#6366f1', marginTop: 2 }}>
              {result.netScore ?? result.correctCount ?? 0}
            </div>
          </div>
        </div>

        {/* Süre & Doğruluk Oranı */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: themeObj.innerBg,
          borderRadius: 12,
          padding: '0.65rem 1rem',
          border: `1px solid ${themeObj.border}`,
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: themeObj.subText, fontWeight: 700 }}>
            <Clock size={15} color={themeObj.accent} />
            <span>Toplam Süre:</span>
            <strong style={{ color: themeObj.text }}>{formatSecToMinSec(result.durationSeconds || 0)}</strong>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#10b981' }}>
            %{result.score || 0} Başarı
          </div>
        </div>

        {/* Butonlar */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: themeObj.innerBg,
              border: `1px solid ${themeObj.border}`,
              color: themeObj.text,
              borderRadius: 14,
              padding: '0.75rem',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Tamam (Yeni Seans)
          </button>

          <button
            onClick={onViewResults}
            style={{
              flex: 1.2,
              background: themeObj.accentGradient || themeObj.accent,
              border: 'none',
              color: '#ffffff',
              borderRadius: 14,
              padding: '0.75rem',
              fontSize: '0.86rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: `0 4px 14px ${themeObj.accent}40`
            }}
          >
            <span>Sonuçları İncele</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
