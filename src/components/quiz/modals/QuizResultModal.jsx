import React from 'react';
import { Award, CheckCircle2, XCircle, Clock, Eye, X, Layers } from 'lucide-react';

/**
 * QuizResultModal
 * Single, unified, beautifully styled exam result modal.
 * Supports both Single Assignments and Composite Multi-Section Assignments.
 */
export default function QuizResultModal({
  isOpen,
  title = 'Sınav Sonucu',
  stats = { correct: 0, wrong: 0, blank: 0, pending: 0, score: 0, net: 0, total: 1 },
  isOpenEnded = false,
  sectionBreakdown = [],
  onClose,
  onReview
}) {
  if (!isOpen) return null;

  const isMultiSection = Array.isArray(sectionBreakdown) && sectionBreakdown.length > 1;
  const isPureOpenEnded = isOpenEnded || (stats.pending > 0 && stats.correct === 0 && stats.wrong === 0);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
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
        maxWidth: isMultiSection ? '540px' : '460px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.1rem',
            right: '1.1rem',
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
          background: isPureOpenEnded ? '#fef3c7' : '#eff6ff',
          color: isPureOpenEnded ? '#d97706' : '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.15rem',
          fontSize: '1.75rem'
        }}>
          {isPureOpenEnded ? '✍️' : <Award size={32} />}
        </div>

        {/* Title & Subtitle */}
        <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.4rem' }}>
          {title}
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.35rem' }}>
          {isPureOpenEnded
            ? 'Cevaplarınız başarıyla kaydedildi ve öğretmen değerlendirmesine gönderildi.'
            : 'Sınavınızı başarıyla tamamladınız. İşte detaylı karneniz:'}
        </p>

        {/* Score & Key Metrics Banner */}
        {isPureOpenEnded ? (
          <div style={{
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: '1rem',
            padding: '1.25rem',
            marginBottom: '1.35rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#b45309', fontWeight: 900, fontSize: '0.95rem' }}>
              <Clock size={18} /> Öğretmen Değerlendirmesi Bekleniyor
            </div>
            <p style={{ fontSize: '0.82rem', color: '#92400e', margin: '0.4rem 0 0', lineHeight: 1.5 }}>
              Yazılı açık uçlu cevaplarınız öğretmeniniz tarafından incelenip puanlandıktan sonra sonuçlarınız güncellenecektir.
            </p>
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            borderRadius: '1.15rem',
            padding: '1.25rem',
            color: '#ffffff',
            marginBottom: '1.35rem',
            boxShadow: '0 6px 18px rgba(15,23,42,0.18)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', fontWeight: 700 }}>DOĞRU</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#4ade80' }}>{stats.correct ?? 0}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', fontWeight: 700 }}>YANLIŞ</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f87171' }}>{stats.wrong ?? 0}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', fontWeight: 700 }}>BOŞ</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#cbd5e1' }}>{stats.blank ?? 0}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', fontWeight: 700 }}>BAŞARI</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#60a5fa' }}>%{stats.score ?? 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Section Breakdown (Only if multi-section) */}
        {isMultiSection && (
          <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 900, color: '#334155', margin: '0 0 0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={15} /> Bölüm Bölüm Sonuçlar:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sectionBreakdown.map((sec, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 0.9rem',
                    background: '#f8fafc',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                      {sec.title}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {sec.isOE ? '✍️ Açık Uçlu / Yazılı' : `🔘 Çoktan Seçmeli (${sec.qCount} Soru)`}
                    </span>
                  </div>

                  <div>
                    {sec.isOE ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '0.35rem' }}>
                        Değerlendirme Bekliyor
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#16a34a' }}>
                        {sec.secDoğru} D / {sec.secYanlış} Y
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
            Kapat & Çık
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
