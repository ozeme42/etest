import React from 'react';
import { Award, CheckCircle2, XCircle, Clock, Eye, X, Layers } from 'lucide-react';

/**
 * CompositeResultModal
 * Result summary modal for Composite Multi-Section Homeworks.
 * Displays overall score & net as well as per-section breakdown.
 */
export default function CompositeResultModal({
  isOpen,
  title = 'Birleşik Ödev Sonucu',
  overallStats = { correct: 0, wrong: 0, blank: 0, score: 0, net: 0, total: 1, isPending: false },
  sectionBreakdown = [],
  onClose,
  onReview
}) {
  if (!isOpen) return null;

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
        maxWidth: '560px',
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

        {/* Header Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#eff6ff',
          color: '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          fontSize: '1.75rem'
        }}>
          <Award size={32} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.4rem' }}>
          {title}
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem' }}>
          Tüm bölümleri tamamladınız. İşte detaylı sınav karneniz:
        </p>

        {/* Overall Summary Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          borderRadius: '1rem',
          padding: '1.25rem',
          color: '#ffffff',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 20px rgba(15,23,42,0.2)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', fontWeight: 700 }}>DOĞRU</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#4ade80' }}>{overallStats.correct}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', fontWeight: 700 }}>YANLIŞ</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f87171' }}>{overallStats.wrong}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', fontWeight: 700 }}>BOŞ</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#cbd5e1' }}>{overallStats.blank}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', fontWeight: 700 }}>NET / PUAN</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#60a5fa' }}>%{overallStats.score}</span>
            </div>
          </div>
        </div>

        {/* Section Breakdown List */}
        {sectionBreakdown && sectionBreakdown.length > 0 && (
          <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#334155', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={16} /> Bölüm Bölüm Sonuçlar:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sectionBreakdown.map((sec, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                      {sec.title}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {sec.isOE ? '✍️ Açık Uçlu / Yazılı' : `🔘 Çoktan Seçmeli (${sec.qCount} Soru)`}
                    </span>
                  </div>

                  <div>
                    {sec.isOE ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '0.4rem' }}>
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

        {/* Buttons */}
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
