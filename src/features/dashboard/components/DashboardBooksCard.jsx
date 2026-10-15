import React, { useState, useMemo } from 'react';
import { BookOpen, ChevronRight, Trophy, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const BOOK_PALETTES = [
  { from: '#3b82f6', to: '#1d4ed8', border: '#60a5fa', shadow: 'rgba(59, 130, 246, 0.4)', tag: '#2563eb' },
  { from: '#10b981', to: '#047857', border: '#34d399', shadow: 'rgba(16, 185, 129, 0.4)', tag: '#059669' },
  { from: '#f59e0b', to: '#b45309', border: '#fbbf24', shadow: 'rgba(245, 158, 11, 0.4)', tag: '#d97706' },
  { from: '#ec4899', to: '#be185d', border: '#f472b6', shadow: 'rgba(236, 72, 153, 0.4)', tag: '#db2777' },
  { from: '#8b5cf6', to: '#6d28d9', border: '#c084fc', shadow: 'rgba(139, 92, 246, 0.4)', tag: '#7c3aed' },
  { from: '#06b6d4', to: '#0e7490', border: '#38bdf8', shadow: 'rgba(6, 182, 212, 0.4)', tag: '#0891b2' },
];

const DashboardBooksCard = React.memo(function DashboardBooksCard({
  isMobile,
  isDark,
  assignedBooksList = [],
  onNavigateBooks,
  onNavigateBookDetail
}) {
  const [showCompletedBooks, setShowCompletedBooks] = useState(false);

  const activeBooks = useMemo(() => {
    return (assignedBooksList || []).filter(b => (b.progressPct || 0) < 100);
  }, [assignedBooksList]);

  const completedBooks = useMemo(() => {
    return (assignedBooksList || []).filter(b => (b.progressPct || 0) >= 100);
  }, [assignedBooksList]);

  const renderBookItem = (book, idx, isCompleted) => {
    const pal = BOOK_PALETTES[idx % BOOK_PALETTES.length];

    return (
      <div
        key={book.id || idx}
        onClick={() => onNavigateBookDetail && onNavigateBookDetail(book.id)}
        className="game-book-card"
        style={{
          borderTop: `5px solid ${isCompleted ? '#10b981' : pal.from}`,
          borderLeft: isCompleted ? '2px solid rgba(16, 185, 129, 0.4)' : `2px solid ${pal.from}50`,
          borderRight: isCompleted ? '2px solid rgba(16, 185, 129, 0.4)' : `2px solid ${pal.from}50`,
          borderBottom: isCompleted ? '2px solid rgba(16, 185, 129, 0.4)' : `2px solid ${pal.from}50`,
          padding: isMobile ? '1.05rem 0.95rem' : '1.35rem 1.45rem',
          cursor: 'pointer',
          background: isDark
            ? (isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(15, 23, 42, 0.9)')
            : (isCompleted ? '#f0fdf4' : '#ffffff'),
          boxShadow: isCompleted
            ? '0 6px 20px rgba(16, 185, 129, 0.12)'
            : `0 8px 24px ${pal.shadow}20`
        }}
      >
        {/* Top Header: Title, Publisher, Badge */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
              <div style={{
                width: isMobile ? 38 : 44,
                height: isMobile ? 38 : 44,
                borderRadius: 14,
                background: isCompleted ? 'linear-gradient(135deg, #10b981, #059669)' : `linear-gradient(135deg, ${pal.from}, ${pal.to})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                boxShadow: isCompleted ? '0 4px 12px rgba(16, 185, 129, 0.4)' : `0 4px 14px ${pal.shadow}`,
                color: '#ffffff',
                flexShrink: 0
              }}>
                {isCompleted ? '🏆' : '📚'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 900,
                  fontSize: isMobile ? '1.02rem' : '1.18rem',
                  color: 'var(--color-text, #0f172a)',
                  lineHeight: 1.25,
                  wordBreak: 'break-word',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span>{book.title}</span>
                  {isCompleted && (
                    <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
                  )}
                </div>
                {book.publisher && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, marginTop: 2 }}>
                    🏢 {book.publisher}
                  </div>
                )}
              </div>
            </div>

            {isCompleted ? (
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 900,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                ✓ BİTTİ
              </span>
            ) : book.remainingDays !== null ? (
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 900,
                padding: '4px 10px',
                borderRadius: 999,
                background: book.remainingDays <= 3 
                  ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                  : 'linear-gradient(135deg, #0284c7, #0369a1)',
                color: '#ffffff',
                boxShadow: book.remainingDays <= 3 ? '0 2px 8px rgba(239, 68, 68, 0.35)' : 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                {book.remainingDays === 0 ? '🔥 Bugün Son' : `⏳ ${book.remainingDays} gün`}
              </span>
            ) : (
              <span className="game-badge-xp" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                +30 XP
              </span>
            )}
          </div>

          {/* Subjects */}
          {(book.subjects || []).length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
              {(book.subjects || []).slice(0, 4).map((subj, sIdx) => (
                <span
                  key={subj.id || sIdx}
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                    color: isDark ? '#e2e8f0' : '#334155',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: 8,
                    padding: '2px 8px',
                    fontSize: '0.66rem',
                    fontWeight: 800
                  }}
                >
                  {subj.name}
                </span>
              ))}
              {(book.subjects || []).length > 4 && (
                <span style={{
                  background: 'var(--color-surface-hover)',
                  color: 'var(--color-text-muted)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '2px 7px',
                  fontSize: '0.66rem',
                  fontWeight: 900
                }}>
                  +{(book.subjects || []).length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Test Progress Box */}
        <div style={{
          background: isDark ? 'rgba(30, 41, 59, 0.65)' : '#f8fafc',
          borderRadius: 16,
          padding: isMobile ? '0.85rem' : '1rem 1.15rem',
          border: '1.5px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Test İlerlemesi
            </span>
            <span style={{
              fontSize: '0.88rem',
              fontWeight: 900,
              color: isCompleted ? '#10b981' : pal.tag,
              background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : `${pal.tag}22`,
              border: `1px solid ${isCompleted ? '#10b981' : pal.tag}50`,
              padding: '2px 10px',
              borderRadius: 999
            }}>
              %{book.progressPct}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: isMobile ? '0.84rem' : '0.92rem', fontWeight: 900, color: 'var(--color-text)' }}>
            <span>{book.totalSolvedTests} / {book.totalBookTests} test tamamlandı</span>
            <span style={{ fontSize: '0.74rem', color: isCompleted ? '#10b981' : 'var(--color-text-muted)', fontWeight: 800 }}>
              {book.totalBookTests - book.totalSolvedTests > 0 ? `${book.totalBookTests - book.totalSolvedTests} test kaldı` : '🎉 Tamamı Bitti'}
            </span>
          </div>

          <div style={{ height: 9, background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginTop: 3 }}>
            <div style={{
              width: `${book.progressPct}%`,
              height: '100%',
              background: isCompleted
                ? 'linear-gradient(90deg, #10b981, #059669)'
                : `linear-gradient(90deg, ${pal.from}, #8b5cf6)`,
              borderRadius: 999,
              boxShadow: isCompleted ? '0 0 8px rgba(16, 185, 129, 0.5)' : `0 0 8px ${pal.shadow}`,
              transition: 'width 0.6s ease'
            }} />
          </div>
        </div>

        {/* 4 KPI Stats: Doğru, Yanlış, Boş, Başarı - Göz Alıcı Renkler */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: isMobile ? 6 : 8 }}>
          <div style={{ background: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5', border: '1.5px solid #10b981', borderRadius: 12, padding: '0.45rem 0.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.64rem', color: '#10b981', fontWeight: 900, textTransform: 'uppercase' }}>Doğru</div>
            <div style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 900, color: '#10b981', marginTop: 1 }}>{book.totalCorrect}</div>
          </div>
          <div style={{ background: isDark ? 'rgba(239, 68, 68, 0.18)' : '#fef2f2', border: '1.5px solid #ef4444', borderRadius: 12, padding: '0.45rem 0.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.64rem', color: '#ef4444', fontWeight: 900, textTransform: 'uppercase' }}>Yanlış</div>
            <div style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 900, color: '#ef4444', marginTop: 1 }}>{book.totalWrong}</div>
          </div>
          <div style={{ background: isDark ? 'rgba(148, 163, 184, 0.18)' : '#f8fafc', border: '1.5px solid #94a3b8', borderRadius: 12, padding: '0.45rem 0.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>Boş</div>
            <div style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 900, color: 'var(--color-text)', marginTop: 1 }}>{book.totalBlank}</div>
          </div>
          <div style={{ background: isDark ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff', border: '1.5px solid #3b82f6', borderRadius: 12, padding: '0.45rem 0.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.64rem', color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase' }}>Başarı</div>
            <div style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 900, color: '#3b82f6', marginTop: 1 }}>%{book.successRate}</div>
          </div>
        </div>

        {/* 3D Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigateBookDetail && onNavigateBookDetail(book.id);
          }}
          className={`game-btn-3d ${isCompleted ? 'game-btn-emerald' : 'game-btn-primary'}`}
          style={{
            width: '100%',
            padding: isMobile ? '0.75rem' : '0.85rem',
            borderRadius: 14,
            fontSize: isMobile ? '0.86rem' : '0.94rem',
            marginTop: 4
          }}
        >
          <span>{isCompleted ? '🏆 Haritayı & Sonuçları İncele' : '⚔️ Kitaba Devam Et'}</span>
          <ChevronRight size={17} />
        </button>
      </div>
    );
  };

  return (
    <div className="game-card-elevated" style={{
      padding: isMobile ? '1.1rem 0.9rem' : '1.5rem 1.8rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            boxShadow: '0 6px 18px rgba(99, 102, 241, 0.45)',
            color: 'white',
            flexShrink: 0
          }}>
            <BookOpen size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.28rem', fontWeight: 900, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
                Soru Bankası Kitaplarım
              </h2>
              <span className="game-badge-xp" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                🎒 {activeBooks.length} Aktif Kitap
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              Kayıtlı kitaplar, test basamakları ve başarı haritan
            </span>
          </div>
        </div>

        <button
          onClick={onNavigateBooks}
          className="game-btn-3d"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '2px solid var(--color-border)',
            borderRadius: 999,
            padding: isMobile ? '0.4rem 0.85rem' : '0.5rem 1.15rem',
            fontSize: '0.76rem',
            boxShadow: '0 2px 0 var(--color-border), 0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          <span>Tüm Kitaplar ({assignedBooksList.length})</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {assignedBooksList.length === 0 ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 20, border: '2px dashed var(--color-border-input, #cbd5e1)' }}>
          <div style={{ fontSize: '2.6rem', marginBottom: 8 }}>📚</div>
          <div style={{ fontWeight: 900, color: 'var(--color-text, #0f172a)', fontSize: '1rem', marginBottom: 4 }}>
            Henüz kayıtlı veya atanmış bir kitap bulunmuyor
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #64748b)' }}>
            Kitap eklendiğinde veya ödev verildiğinde kitap ilerleme haritanız burada listelenecektir.
          </div>
        </div>
      ) : (
        <div>
          {/* 1. AKTİF (DEVAM EDEN) KİTAPLAR */}
          {activeBooks.length === 0 ? (
            <div style={{
              padding: '1.75rem 1.25rem',
              borderRadius: 18,
              background: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
              border: '2px solid #10b981',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8
            }}>
              <span style={{ fontSize: '2.2rem' }}>🎉</span>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#10b981' }}>
                Harika İş! Tüm Aktif Kitaplarını Bitirdin!
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 600, maxWidth: 420 }}>
                Şu anda devam eden aktif bir kitabın kalmadı. Biten kitaplarını aşağıdaki butondan inceleyebilir veya kütüphaneden yeni kitap ekleyebilirsin.
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : (activeBooks.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))'),
              gap: isMobile ? '0.85rem' : '1.35rem'
            }}>
              {activeBooks.map((book, idx) => renderBookItem(book, idx, false))}
            </div>
          )}

          {/* 2. BİTEN KİTAPLAR (AYRICA AÇILIR) */}
          {completedBooks.length > 0 && (
            <div style={{ marginTop: '1.35rem' }}>
              <button
                type="button"
                onClick={() => setShowCompletedBooks(prev => !prev)}
                className="game-btn-3d game-btn-emerald"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.8rem 1rem' : '0.95rem 1.35rem',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: isMobile ? '0.88rem' : '0.98rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.25rem' }}>🏆</span>
                  <span style={{ fontWeight: 900 }}>Biten / Tamamlanan Kitaplar ({completedBooks.length})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 900 }}>
                  <span>{showCompletedBooks ? 'Kapat' : 'Görüntüle / İncele'}</span>
                  {showCompletedBooks ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {showCompletedBooks && (
                <div style={{
                  marginTop: '1rem',
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : (completedBooks.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))'),
                  gap: isMobile ? '0.85rem' : '1.35rem',
                  animation: 'sdFadeUp 0.25s ease'
                }}>
                  {completedBooks.map((book, idx) => renderBookItem(book, idx, true))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default DashboardBooksCard;
