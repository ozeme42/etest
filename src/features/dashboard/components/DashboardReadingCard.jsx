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
      className="game-card-elevated"
      style={{
        padding: isMobile ? '1.1rem 0.9rem' : '1.5rem 1.8rem'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.15rem',
            boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
            color: 'white',
            flexShrink: 0
          }}>
            <BookOpen size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h2 style={{ fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 900, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
                Kitap Okuma &amp; Alışkanlık Mabedi
              </h2>
              <span className="game-badge-xp" style={{ fontSize: '0.65rem', padding: '1px 6px', color: '#ec4899', borderColor: 'rgba(236,72,153,0.4)' }}>
                📖 Seri
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Günlük sayfa görevleri, okuma serisi ve hedefin
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateReading}
          className="game-btn-3d"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 999,
            padding: isMobile ? '0.35rem 0.8rem' : '0.45rem 1.05rem',
            fontSize: '0.74rem',
            boxShadow: '0 2px 0 var(--color-border), 0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          <span>Tüm Okumalarım</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Metrics Row - Large Vibrant Bento Tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? '0.65rem' : '0.85rem',
        marginBottom: '1rem'
      }}>
        {/* 1. Bugün Okunan */}
        <div style={{
          padding: isMobile ? '0.85rem 0.95rem' : '1.1rem 1.25rem',
          borderRadius: 18,
          background: isDark ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(244, 63, 94, 0.08))' : 'linear-gradient(135deg, #fdf2f8, #fff1f2)',
          border: isDark ? '1.5px solid rgba(244, 114, 182, 0.3)' : '1.5px solid #fbcfe8',
          boxShadow: '0 4px 16px rgba(236, 72, 153, 0.08)',
          transition: 'transform 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: isDark ? '#f472b6' : '#db2777', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Bugün Okunan
            </span>
            <span style={{ fontSize: '1.15rem' }}>📖</span>
          </div>
          <div style={{ fontFamily: '"Outfit", sans-serif', fontSize: isMobile ? '1.35rem' : '1.65rem', fontWeight: 900, color: 'var(--color-text)' }}>
            {todayPages} <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>sayfa</span>
          </div>
        </div>

        {/* 2. Okuma Serisi */}
        <div style={{
          padding: isMobile ? '0.85rem 0.95rem' : '1.1rem 1.25rem',
          borderRadius: 18,
          background: isDark ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.08))' : 'linear-gradient(135deg, #fffbeb, #fef3c7)',
          border: isDark ? '1.5px solid rgba(251, 191, 36, 0.3)' : '1.5px solid #fde68a',
          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.08)',
          transition: 'transform 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: isDark ? '#fbbf24' : '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 3 }}>
              Okuma Serisi
            </span>
            <Flame size={18} color="#f59e0b" />
          </div>
          <div style={{ fontFamily: '"Outfit", sans-serif', fontSize: isMobile ? '1.35rem' : '1.65rem', fontWeight: 900, color: 'var(--color-text)' }}>
            {streak} <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>gün</span>
          </div>
        </div>

        {/* 3. Bu Ay Toplam */}
        <div style={{
          padding: isMobile ? '0.85rem 0.95rem' : '1.1rem 1.25rem',
          borderRadius: 18,
          background: isDark ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(79, 70, 229, 0.08))' : 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
          border: isDark ? '1.5px solid rgba(165, 180, 252, 0.3)' : '1.5px solid #c7d2fe',
          boxShadow: '0 4px 16px rgba(99, 102, 241, 0.08)',
          transition: 'transform 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: isDark ? '#a5b4fc' : '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Bu Ay Toplam
            </span>
            <span style={{ fontSize: '1.15rem' }}>📅</span>
          </div>
          <div style={{ fontFamily: '"Outfit", sans-serif', fontSize: isMobile ? '1.35rem' : '1.65rem', fontWeight: 900, color: 'var(--color-text)' }}>
            {stats.monthlyPages} <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>sf</span>
          </div>
        </div>

        {/* 4. Biten Kitap */}
        <div style={{
          padding: isMobile ? '0.85rem 0.95rem' : '1.1rem 1.25rem',
          borderRadius: 18,
          background: isDark ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.08))' : 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          border: isDark ? '1.5px solid rgba(52, 211, 153, 0.3)' : '1.5px solid #bbf7d0',
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)',
          transition: 'transform 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: isDark ? '#34d399' : '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 3 }}>
              Biten Kitap
            </span>
            <Trophy size={18} color="#10b981" />
          </div>
          <div style={{ fontFamily: '"Outfit", sans-serif', fontSize: isMobile ? '1.35rem' : '1.65rem', fontWeight: 900, color: 'var(--color-text)' }}>
            {stats.finishedThisMonth} <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>bu ay</span>
          </div>
        </div>
      </div>

      {/* Active Book Highlight or Empty CTA */}
      {activeBook ? (
        <div
          onClick={onNavigateReading}
          style={{
            padding: isMobile ? '1.1rem 1rem' : '1.4rem 1.6rem',
            borderRadius: 20,
            background: isDark ? 'linear-gradient(135deg, rgba(236,72,153,0.14), rgba(99,102,241,0.1))' : 'linear-gradient(135deg, #fdf2f8, #f5f3ff)',
            border: isDark ? '2px solid rgba(244,114,182,0.35)' : '2px solid #fbcfe8',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(236, 72, 153, 0.12)',
            transition: 'all 0.25s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 220 }}>
              <div style={{
                width: isMobile ? 44 : 52,
                height: isMobile ? 44 : 52,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.35rem' : '1.65rem',
                boxShadow: '0 6px 18px rgba(236, 72, 153, 0.45)',
                color: '#ffffff',
                flexShrink: 0
              }}>
                📚
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: '#ec4899',
                    color: 'white',
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 8px rgba(236, 72, 153, 0.4)'
                  }}>
                    ŞU AN OKUNUYOR
                  </span>
                  {activeBook.category && (
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                      📌 {activeBook.category}
                    </span>
                  )}
                </div>

                <div style={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: isMobile ? '1.08rem' : '1.25rem',
                  fontWeight: 900,
                  color: 'var(--color-text)',
                  lineHeight: 1.25
                }}>
                  {activeBook.title}
                </div>
                {activeBook.author && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
                    ✍️ {activeBook.author}
                  </div>
                )}

                {/* Progress bar */}
                <div style={{ marginTop: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 900, marginBottom: 5 }}>
                    <span style={{ color: '#ec4899', background: 'rgba(236,72,153,0.12)', padding: '2px 8px', borderRadius: 999 }}>
                      %{pct} tamamlandı
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 800 }}>
                      {activeBook.currentPage || 0} / {activeBook.totalPages} sayfa ({Math.max(0, (activeBook.totalPages || 0) - (activeBook.currentPage || 0))} kaldı)
                    </span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #ec4899, #8b5cf6)',
                      borderRadius: 999,
                      boxShadow: '0 0 10px rgba(236, 72, 153, 0.5)',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
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
                gap: 6,
                alignSelf: 'center',
                width: isMobile ? '100%' : 'auto',
                marginTop: isMobile ? 8 : 0
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-text-muted)' }}>
                ⚡ Hızlı Sayfa Ekle:
              </span>
              <div style={{ display: 'flex', gap: 6, width: isMobile ? '100%' : 'auto' }}>
                {[10, 20, 30].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={e => handleQuickAddPages(e, amt)}
                    className="game-btn-3d"
                    style={{
                      flex: isMobile ? 1 : 'none',
                      background: isDark ? 'rgba(236,72,153,0.22)' : '#ffffff',
                      border: '1.5px solid #f472b6',
                      color: '#ec4899',
                      borderRadius: 12,
                      padding: isMobile ? '0.5rem' : '0.5rem 0.85rem',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      textAlign: 'center'
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
