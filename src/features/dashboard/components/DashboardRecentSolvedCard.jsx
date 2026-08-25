import React from 'react';
import { Plus, ChevronRight, CheckCircle2, Award, Trash2 } from 'lucide-react';

export default function DashboardRecentSolvedCard({
  isMobile,
  recentSolvedTests = [],
  onOpenManualModal,
  onNavigateResults,
  onReviewTest,
  onDeleteTest,
  selectedStudent
}) {
  return (
    <div className="sd-card" style={{
      padding: isMobile ? '0.75rem 0.65rem' : '1.35rem 1.6rem',
      borderRadius: isMobile ? 14 : 16,
      background: 'var(--color-surface)',
      border: '1.5px solid var(--color-border)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
    }}>
      {/* Kart Başlığı & Hızlı Aksiyonlar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? '0.6rem' : '0.85rem', flexWrap: 'wrap', gap: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: isMobile ? 24 : 30,
            height: isMobile ? 24 : 30,
            borderRadius: isMobile ? 6 : 8,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '0.8rem' : '0.95rem',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
            flexShrink: 0
          }}>
            📝
          </div>
          <div>
            <h2 style={{ fontSize: isMobile ? '0.88rem' : '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0, lineHeight: 1.2 }}>
              Son Çözülen Testler
            </h2>
            {!isMobile && (
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Son 5 test ve başarı analizleriniz
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={onOpenManualModal}
            className="sd-btn"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 99,
              padding: isMobile ? '0.22rem 0.55rem' : '0.3rem 0.75rem',
              fontSize: isMobile ? '0.65rem' : '0.7rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
            }}
          >
            <Plus size={isMobile ? 10 : 12} />
            <span>{isMobile ? '+ Manuel' : 'Test Sonucu Ekle'}</span>
          </button>

          <button
            onClick={onNavigateResults}
            className="sd-btn"
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.30)',
              borderRadius: 99,
              padding: isMobile ? '0.22rem 0.5rem' : '0.25rem 0.7rem',
              fontSize: isMobile ? '0.65rem' : '0.7rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <span>Tümü</span>
            <ChevronRight size={isMobile ? 10 : 12} />
          </button>
        </div>
      </div>

      {/* Test Listesi */}
      {recentSolvedTests.length === 0 ? (
        <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 12, border: '1px dashed var(--color-border-input, #cbd5e1)' }}>
          <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>📊</div>
          <div style={{ fontWeight: 800, color: 'var(--color-text, #0f172a)', fontSize: '0.85rem', marginBottom: 2 }}>
            Henüz tamamlanmış bir test bulunmuyor
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)' }}>
            Kitap testlerinizi veya atanan ödevlerinizi çözdüğünüzde sonuçlarınız burada listelenecektir.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.4rem' : '0.55rem' }}>
          {recentSolvedTests.map((test, idx) => {
            const totalQ = Number(test.totalQuestions) || ((Number(test.correctCount) || 0) + (Number(test.wrongCount) || 0) + (Number(test.emptyCount) || 0)) || 0;
            const correct = Number(test.correctCount) || 0;
            const wrong = Number(test.wrongCount) || 0;
            const empty = Number(test.emptyCount) || 0;
            const scoreRate = totalQ > 0 ? Math.round((correct / totalQ) * 100) : null;

            return (
              <div
                key={test.id || idx}
                onClick={() => onReviewTest && onReviewTest(test)}
                className="sd-card"
                style={{
                  background: 'var(--color-surface-hover, #f8fafc)',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: isMobile ? 10 : 12,
                  padding: isMobile ? '0.45rem 0.6rem' : '0.75rem 0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: isMobile ? '0.4rem' : '0.75rem',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Sol Taraf: Ders, Başlık ve D/Y/B Detayları */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  {/* Ders & Tarih Rozetleri */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: '#6366f1',
                      border: '1px solid rgba(165, 180, 252, 0.35)',
                      borderRadius: 4,
                      fontSize: isMobile ? '0.58rem' : '0.62rem',
                      fontWeight: 800,
                      padding: '0px 4px'
                    }}>
                      {test.subject}
                    </span>
                    {Boolean(test.unitTopic && test.unitTopic !== test.title && test.unitTopic !== test.subTitle && (!test.subTitle || !test.unitTopic.toLowerCase().includes(test.subTitle.toLowerCase()))) && (
                      <span style={{
                        background: 'rgba(245, 158, 11, 0.12)',
                        color: '#b45309',
                        border: '1px solid rgba(245, 158, 11, 0.30)',
                        borderRadius: 4,
                        fontSize: isMobile ? '0.58rem' : '0.62rem',
                        fontWeight: 800,
                        padding: '0px 4px',
                        maxWidth: isMobile ? 120 : 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        📌 {test.unitTopic}
                      </span>
                    )}
                    {test.date && (
                      <span style={{ fontSize: isMobile ? '0.58rem' : '0.65rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600 }}>
                        {new Date(test.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>

                  {/* Test Başlığı */}
                  <div style={{
                    fontWeight: 800,
                    fontSize: isMobile ? '0.78rem' : '0.86rem',
                    color: 'var(--color-text, #0f172a)',
                    lineHeight: 1.25,
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {test.title}
                  </div>

                  {/* Skor & İstatistik Satırı */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, fontSize: isMobile ? '0.64rem' : '0.7rem', fontWeight: 800, flexWrap: 'wrap' }}>
                    {test.isManualPending ? (
                      <span style={{ color: '#a855f7', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 900 }}>
                        ⏳ Onay Bekleniyor
                      </span>
                    ) : test.isManualRejected ? (
                      <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 900 }}>
                        ❌ Onaylanmadı
                      </span>
                    ) : (test.isPendingEvaluation || (test.isOpenEnded && !test.isEvaluated)) ? (
                      <span style={{ color: '#7c3aed', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        📝 {totalQ || 1} Açık Uçlu Soru • ⏳ İncelemede
                      </span>
                    ) : (
                      <>
                        <span style={{ color: '#16a34a' }}>
                          ✓ {correct}D
                        </span>
                        <span style={{ color: '#dc2626' }}>
                          ✗ {wrong}Y
                        </span>
                        {empty > 0 && (
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            ○ {empty}B
                          </span>
                        )}
                        <span style={{ color: 'var(--color-text-muted)', opacity: 0.75 }}>
                          • {totalQ} Soru
                        </span>
                        {test.net !== undefined && test.net !== null && (
                          <span style={{ color: '#6366f1', fontWeight: 900 }}>
                            • {test.net} Net
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Sağ Taraf: Skor Rozeti, Silme Butonu ve İnceleme Oku */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {scoreRate !== null && !test.isManualPending && !test.isPendingEvaluation && (
                    <span style={{
                      fontSize: isMobile ? '0.68rem' : '0.75rem',
                      fontWeight: 900,
                      color: scoreRate >= 70 ? '#166534' : scoreRate >= 50 ? '#b45309' : '#dc2626',
                      background: scoreRate >= 70 ? '#f0fdf4' : scoreRate >= 50 ? '#fffbeb' : '#fef2f2',
                      border: `1px solid ${scoreRate >= 70 ? '#bbf7d0' : scoreRate >= 50 ? '#fde68a' : '#fecaca'}`,
                      padding: isMobile ? '2px 6px' : '3px 8px',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2
                    }}>
                      %{scoreRate}
                    </span>
                  )}
                  {onDeleteTest && (
                    <button
                      type="button"
                      title="Test Sonucunu Sil"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTest(test);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: isMobile ? 3 : 4,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7,
                        transition: 'opacity 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                    >
                      <Trash2 size={isMobile ? 13 : 15} />
                    </button>
                  )}
                  <ChevronRight size={isMobile ? 14 : 16} color="var(--color-text-muted)" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
