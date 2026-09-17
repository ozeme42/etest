import React from 'react';
import { BookOpen, ChevronRight, Flame, Trophy, Plus } from 'lucide-react';
import { useReading } from '../../../context/ReadingContext';

export default function DashboardReadingCard({
  isMobile,
  isDark,
  onNavigateReading
}) {
  let readingData = null;
  try {
    readingData = useReading();
  } catch {}

  const activeBook = readingData?.activeBook || null;
  const todayPages = readingData?.todayPages || 0;
  const streak = readingData?.streak || 0;
  const stats = readingData?.stats || { monthlyPages: 0, finishedThisMonth: 0, totalBooks: 0 };
  const logReading = readingData?.logReading;

  const pct = activeBook && activeBook.totalPages > 0
    ? Math.min(100, Math.round(((activeBook.currentPage || 0) / activeBook.totalPages) * 100))
    : 0;

  const handleQuickAddPages = (e, pagesToAdd) => {
    e.stopPropagation();
    if (!activeBook || !logReading) return;
    const newCurrent = Math.min(activeBook.totalPages || 9999, (activeBook.currentPage || 0) + pagesToAdd);
    logReading(activeBook.id, pagesToAdd, newCurrent);
  };

  return (
    <div
      className="sd-card"
      style={{
        padding: isMobile ? '0.95rem 0.85rem' : '1.35rem 1.6rem',
        borderRadius: 16,
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.25)' : '0 2px 10px rgba(0,0,0,0.03)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.95rem',
            boxShadow: '0 3px 10px rgba(236, 72, 153, 0.35)',
            color: 'white'
          }}>
            <BookOpen size={16} />
          </div>
          <div>
            <h2 style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
              Kitap Okuma &amp; Alışkanlık Takibi
            </h2>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Günlük sayfa hedefleri ve okuma rutini
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateReading}
          className="sd-btn"
          style={{
            background: 'rgba(236, 72, 153, 0.12)',
            color: '#ec4899',
            border: '1px solid rgba(244, 114, 182, 0.35)',
            borderRadius: 99,
            padding: '0.25rem 0.75rem',
            fontSize: '0.7rem',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <span>Tüm Okumalarım</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: '0.5rem',
        marginBottom: '0.85rem'
      }}>
        <div style={{
          padding: '0.6rem 0.75rem',
          borderRadius: 12,
          background: isDark ? 'rgba(236, 72, 153, 0.08)' : '#fdf2f8',
          border: isDark ? '1px solid rgba(244, 114, 182, 0.2)' : '1px solid #fce7f3'
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: isDark ? '#f472b6' : '#db2777', textTransform: 'uppercase' }}>
            Bugün Okunan
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', marginTop: 2 }}>
            {todayPages} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>sayfa</span>
          </div>
        </div>

        <div style={{
          padding: '0.6rem 0.75rem',
          borderRadius: 12,
          background: isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb',
          border: isDark ? '1px solid rgba(251, 191, 36, 0.2)' : '1px solid #fef3c7'
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: isDark ? '#fbbf24' : '#d97706', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Flame size={12} /> Okuma Serisi
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', marginTop: 2 }}>
            {streak} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>gün</span>
          </div>
        </div>

        <div style={{
          padding: '0.6rem 0.75rem',
          borderRadius: 12,
          background: isDark ? 'rgba(99, 102, 241, 0.08)' : '#eef2ff',
          border: isDark ? '1px solid rgba(165, 180, 252, 0.2)' : '1px solid #e0e7ff'
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: isDark ? '#a5b4fc' : '#4f46e5', textTransform: 'uppercase' }}>
            Bu Ay Toplam
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', marginTop: 2 }}>
            {stats.monthlyPages} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>sf</span>
          </div>
        </div>

        <div style={{
          padding: '0.6rem 0.75rem',
          borderRadius: 12,
          background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
          border: isDark ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid #dcfce7'
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: isDark ? '#34d399' : '#059669', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Trophy size={12} /> Biten Kitap
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)', marginTop: 2 }}>
            {stats.finishedThisMonth} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>bu ay</span>
          </div>
        </div>
      </div>

      {/* Active Book Highlight or Empty CTA */}
      {activeBook ? (
        <div
          onClick={onNavigateReading}
          style={{
            padding: '0.85rem 1rem',
            borderRadius: 14,
            background: isDark ? 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(99,102,241,0.08))' : 'linear-gradient(135deg, #fdf2f8, #f5f3ff)',
            border: isDark ? '1.5px solid rgba(244,114,182,0.25)' : '1.5px solid #fbcfe8',
            cursor: 'pointer',
            transition: 'transform 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 99,
                  background: '#ec4899',
                  color: 'white',
                  letterSpacing: '0.03em'
                }}>
                  ŞU AN OKUNUYOR
                </span>
                {activeBook.category && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                    {activeBook.category}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.98rem', fontWeight: 900, color: 'var(--color-text)' }}>
                {activeBook.title}
              </div>
              {activeBook.author && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 1 }}>
                  {activeBook.author}
                </div>
              )}

              {/* Progress bar */}
              <div style={{ marginTop: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, marginBottom: 4 }}>
                  <span style={{ color: '#ec4899' }}>%{pct} tamamlandı</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {activeBook.currentPage || 0} / {activeBook.totalPages} sayfa ({Math.max(0, (activeBook.totalPages || 0) - (activeBook.currentPage || 0))} kaldı)
                  </span>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #ec4899, #8b5cf6)',
                    borderRadius: 99,
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            </div>

            {/* Quick page increment buttons */}
            <div
              onClick={e => e.stopPropagation()}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMobile ? 'flex-start' : 'flex-end',
                gap: 5,
                alignSelf: 'center'
              }}
            >
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                Hızlı İlerleme:
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[10, 20, 30].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={e => handleQuickAddPages(e, amt)}
                    style={{
                      background: isDark ? 'rgba(236,72,153,0.2)' : '#ffffff',
                      border: '1px solid #f472b6',
                      color: '#ec4899',
                      borderRadius: 8,
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                    title={`${amt} sayfa okudum`}
                  >
                    +{amt} sf
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '1rem',
          borderRadius: 14,
          background: isDark ? 'rgba(236,72,153,0.06)' : '#fdf2f8',
          border: isDark ? '1px dashed rgba(244,114,182,0.3)' : '1.5px dashed #fbcfe8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--color-text)' }}>
              Şu an okuduğunuz bir kitap bulunmuyor
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              Okumak istediğiniz kitapları ekleyin, sayfa takibi yapın ve alışkanlık kazanın.
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateReading}
            style={{
              background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '0.45rem 0.95rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 2px 8px rgba(236,72,153,0.35)'
            }}
          >
            <Plus size={14} /> Kitap Ekle
          </button>
        </div>
      )}
    </div>
  );
}
