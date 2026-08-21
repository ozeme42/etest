import React from 'react';
import { Award, CheckCircle2, XCircle, Clock, Check, Eye, X } from 'lucide-react';

/**
 * SingleResultModal
 * Clean, lightweight result summary modal for Single Assignments (Multiple-Choice or Open-Ended).
 */
export default function SingleResultModal({
  isOpen,
  title = 'Sınav Sonucu',
  stats = { correct: 0, wrong: 0, blank: 0, pending: 0, score: 0, net: 0, total: 1 },
  isOpenEnded = false,
  onClose,
  onReview
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '1.5rem',
        maxWidth: '480px',
        width: '100%',
        padding: '2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Close Icon */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: isOpenEnded ? '#fef3c7' : '#ecfdf5',
          color: isOpenEnded ? '#d97706' : '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          fontSize: '1.75rem'
        }}>
          {isOpenEnded ? '✍️' : <Award size={32} />}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
          {title}
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 1.5rem' }}>
          {isOpenEnded
            ? 'Cevaplarınız başarıyla kaydedildi ve öğretmen değerlendirmesine gönderildi.'
            : 'Sınavınızı başarıyla tamamladınız. İşte detaylı sonuçlarınız:'}
        </p>

        {/* Stats Grid */}
        {isOpenEnded ? (
          <div style={{ background: '#f8fafc', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#b45309', fontWeight: 800 }}>
              <Clock size={18} /> Öğretmen Değerlendirmesi Bekleniyor
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.5rem 0 0' }}>
              Toplam {stats.total} açık uçlu sorununuz öğretmeniniz tarafından incelendikten sonra puanlanacaktır.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.85rem', padding: '0.85rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', display: 'block' }}>DOĞRU</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669' }}>{stats.correct}</span>
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.85rem', padding: '0.85rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', display: 'block' }}>YANLIŞ</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626' }}>{stats.wrong}</span>
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.85rem', padding: '0.85rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', display: 'block' }}>BAŞARI / NET</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#2563eb' }}>%{stats.score}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.85rem',
              borderRadius: '0.85rem',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Tamamla & Çık
          </button>
          {onReview && (
            <button
              onClick={onReview}
              style={{
                flex: 1,
                padding: '0.85rem',
                borderRadius: '0.85rem',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: '#ffffff',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Eye size={16} /> Sınavı İncele
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
