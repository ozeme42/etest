import React from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';

const BOOK_PALETTES = [
  { from: '#4f46e5', to: '#6366f1', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: '#818cf8', shadow: 'rgba(99, 102, 241, 0.35)', tag: '#6366f1' },
  { from: '#059669', to: '#10b981', gradient: 'linear-gradient(135deg, #059669, #10b981)', border: '#34d399', shadow: 'rgba(16, 185, 129, 0.35)', tag: '#10b981' },
  { from: '#d97706', to: '#f59e0b', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', border: '#fbbf24', shadow: 'rgba(245, 158, 11, 0.35)', tag: '#f59e0b' },
  { from: '#e11d48', to: '#f43f5e', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)', border: '#fb7185', shadow: 'rgba(244, 63, 94, 0.35)', tag: '#f43f5e' },
  { from: '#7c3aed', to: '#9333ea', gradient: 'linear-gradient(135deg, #7c3aed, #9333ea)', border: '#c084fc', shadow: 'rgba(147, 51, 234, 0.35)', tag: '#7c3aed' },
  { from: '#0891b2', to: '#06b6d4', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', border: '#38bdf8', shadow: 'rgba(6, 182, 212, 0.35)', tag: '#0891b2' },
];

function MiniCircularProgress({ pct = 0, size = 44, stroke = 4.5, color = '#6366f1' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke="var(--color-border, #e2e8f0)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

export default function DashboardBooksCard({
  isMobile,
  isDark,
  assignedBooksList = [],
  onNavigateBooks,
  onNavigateBookDetail
}) {
  return (
    <div className="sd-card" style={{
      padding: isMobile ? '0.95rem 0.85rem' : '1.35rem 1.6rem',
      borderRadius: 16,
      background: 'var(--color-surface)',
      border: '1.5px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.95rem',
            boxShadow: '0 3px 10px rgba(99, 102, 241, 0.35)',
            color: 'white'
          }}>
            <BookOpen size={16} />
          </div>
          <div>
            <h2 style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
              Kitaplarım & İlerleme
            </h2>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Kitap test, soru ve başarı ilerlemesi
            </span>
          </div>
        </div>

        <button
          onClick={onNavigateBooks}
          className="sd-btn"
          style={{
            background: 'rgba(99, 102, 241, 0.12)',
            color: '#6366f1',
            border: '1px solid rgba(165, 180, 252, 0.35)',
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
          <span>Tümü ({assignedBooksList.length})</span>
          <ChevronRight size={12} />
        </button>
      </div>

      {assignedBooksList.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16, border: '1px dashed var(--color-border-input, #cbd5e1)' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>📚</div>
          <div style={{ fontWeight: 800, color: 'var(--color-text, #0f172a)', fontSize: '0.92rem', marginBottom: 4 }}>
            Henüz kayıtlı veya atanmış bir kitap bulunmuyor
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
            Kitap eklendiğinde veya ödev verildiğinde kitap ilerleme haritanız burada listelenecektir.
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : (assignedBooksList.length === 1 ? '1fr' : 'repeat(2, 1fr)'),
          gap: isMobile ? '0.75rem' : '1.1rem'
        }}>
          {assignedBooksList.map((book, idx) => {
            const pal = (BOOK_PALETTES && BOOK_PALETTES[idx % BOOK_PALETTES.length]) || { from: '#6366f1', to: '#4f46e5', tag: '#6366f1', shadow: 'rgba(99,102,241,0.3)' };
            const isCompleted = book.progressPct >= 100;

            return (
              <div
                key={book.id || idx}
                onClick={() => onNavigateBookDetail && onNavigateBookDetail(book.id)}
                className="sd-card"
                style={{
                  background: 'var(--color-surface, #ffffff)',
                  border: '1.5px solid var(--color-border, #e2e8f0)',
                  borderRadius: 16,
                  padding: isMobile ? '0.85rem' : '1.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isMobile ? '0.75rem' : '0.9rem',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: isDark ? '0 4px 14px -2px rgba(0,0,0,0.35)' : '0 4px 14px -2px rgba(0,0,0,0.03)'
                }}
              >
                {/* Top Header: Title, Publisher, Remaining Days */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: isMobile ? '0.9rem' : '1.05rem', color: 'var(--color-text, #0f172a)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                        {book.title}
                      </div>
                      {book.publisher && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700, marginTop: 2 }}>
                          {book.publisher}
                        </div>
                      )}
                    </div>

                    {book.remainingDays !== null && (
                      <span style={{
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 99,
                        background: book.remainingDays <= 3 
                          ? (isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2') 
                          : (isDark ? 'rgba(16, 185, 129, 0.18)' : '#f0fdf4'),
                        color: book.remainingDays <= 3 ? '#ef4444' : '#10b981',
                        border: isDark 
                          ? (book.remainingDays <= 3 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)') 
                          : (book.remainingDays <= 3 ? '1px solid #fca5a5' : '1px solid #86efac'),
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        {book.remainingDays === 0 ? '🔥 Bugün Son' : `⏳ ${book.remainingDays} gün`}
                      </span>
                    )}
                  </div>

                  {/* Subjects */}
                  {(book.subjects || []).length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {(book.subjects || []).slice(0, 3).map((subj, sIdx) => (
                        <span
                          key={subj.id || sIdx}
                          style={{
                            background: 'var(--color-surface-hover, #f1f5f9)',
                            color: 'var(--color-text, #475569)',
                            border: '1px solid var(--color-border, #cbd5e1)',
                            borderRadius: 6,
                            padding: '1px 6px',
                            fontSize: '0.62rem',
                            fontWeight: 700
                          }}
                        >
                          {subj.name}
                        </span>
                      ))}
                      {(book.subjects || []).length > 3 && (
                        <span style={{
                          background: 'var(--color-surface-hover, #f1f5f9)',
                          color: 'var(--color-text-muted, #64748b)',
                          border: '1px solid var(--color-border, #cbd5e1)',
                          borderRadius: 6,
                          padding: '1px 5px',
                          fontSize: '0.62rem',
                          fontWeight: 800
                        }}>
                          +{(book.subjects || []).length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Test Progress Box */}
                <div style={{
                  background: 'var(--color-surface-hover, #f8fafc)',
                  borderRadius: 12,
                  padding: isMobile ? '0.7rem 0.85rem' : '0.85rem 1rem',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: '0.66rem', fontWeight: 900, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Test İlerlemesi
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 900, color: isCompleted ? '#10b981' : pal.tag }}>
                        %{book.progressPct}
                      </span>
                    </div>

                    <div style={{ fontSize: isMobile ? '0.82rem' : '0.88rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', marginBottom: 5 }}>
                      {book.totalSolvedTests} / {book.totalBookTests} test <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600 }}>({book.totalBookTests - book.totalSolvedTests > 0 ? `${book.totalBookTests - book.totalSolvedTests} kaldı` : 'Tamamlandı'})</span>
                    </div>

                    <div style={{ height: 6, background: 'var(--color-border, #e2e8f0)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        width: `${book.progressPct}%`,
                        height: '100%',
                        background: isCompleted ? '#10b981' : `linear-gradient(90deg, ${pal.from}, ${pal.to})`,
                        borderRadius: 99,
                        transition: 'width 0.6s ease'
                      }} />
                    </div>
                  </div>

                  <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MiniCircularProgress pct={book.progressPct} size={44} stroke={4.5} color={isCompleted ? '#10b981' : pal.tag} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 900, color: isCompleted ? '#10b981' : 'var(--color-text, #0f172a)' }}>
                      %{book.progressPct}
                    </div>
                  </div>
                </div>

                {/* 4 KPI Stats: Doğru, Yanlış, Boş, Başarı */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? 4 : 6 }}>
                  <div style={{ background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4', border: isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #bbf7d0', borderRadius: 8, padding: '0.35rem 0.2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.58rem', color: '#10b981', fontWeight: 900, textTransform: 'uppercase' }}>Doğru</div>
                    <div style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 900, color: '#10b981', marginTop: 1 }}>{book.totalCorrect}</div>
                  </div>
                  <div style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #fecaca', borderRadius: 8, padding: '0.35rem 0.2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.58rem', color: '#ef4444', fontWeight: 900, textTransform: 'uppercase' }}>Yanlış</div>
                    <div style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 900, color: '#ef4444', marginTop: 1 }}>{book.totalWrong}</div>
                  </div>
                  <div style={{ background: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f8fafc', border: isDark ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid #e2e8f0', borderRadius: 8, padding: '0.35rem 0.2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 900, textTransform: 'uppercase' }}>Boş</div>
                    <div style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 900, color: 'var(--color-text, #64748b)', marginTop: 1 }}>{book.totalBlank}</div>
                  </div>
                  <div style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', border: isDark ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid #bfdbfe', borderRadius: 8, padding: '0.35rem 0.2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.58rem', color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase' }}>Başarı</div>
                    <div style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 900, color: '#3b82f6', marginTop: 1 }}>%{book.successRate}</div>
                  </div>
                </div>

                {/* Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateBookDetail && onNavigateBookDetail(book.id);
                  }}
                  style={{
                    width: '100%',
                    padding: isMobile ? '0.55rem' : '0.65rem',
                    background: isCompleted ? 'var(--color-surface-hover, #f1f5f9)' : `linear-gradient(135deg, ${pal.from}, ${pal.to})`,
                    color: isCompleted ? 'var(--color-text, #334155)' : '#ffffff',
                    border: isCompleted ? '1.5px solid var(--color-border, #cbd5e1)' : 'none',
                    borderRadius: 10,
                    fontWeight: 900,
                    fontSize: isMobile ? '0.78rem' : '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    boxShadow: isCompleted ? 'none' : `0 3px 12px ${pal.shadow}`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{isCompleted ? '📋 Haritayı Görüntüle' : '▶ Kitaba Devam Et'}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
