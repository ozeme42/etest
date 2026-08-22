import React from 'react';
import { Plus, ChevronRight } from 'lucide-react';

export default function DashboardRecentSolvedCard({
  isMobile,
  recentSolvedTests = [],
  onOpenManualModal,
  onNavigateResults,
  onReviewTest,
  selectedStudent
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
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.95rem',
            boxShadow: '0 3px 10px rgba(16, 185, 129, 0.35)'
          }}>
            📝
          </div>
          <div>
            <h2 style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
              Son Çözülen Testler
            </h2>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Son 5 test ve başarı analizleriniz
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={onOpenManualModal}
            className="sd-btn"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 99,
              padding: '0.3rem 0.75rem',
              fontSize: '0.7rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Plus size={12} />
            <span>{isMobile ? 'Ekle' : 'Test Sonucu Ekle'}</span>
          </button>

          <button
            onClick={onNavigateResults}
            className="sd-btn"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: 99,
              padding: '0.25rem 0.7rem',
              fontSize: '0.7rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3
            }}
          >
            <span>Tümü</span>
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {recentSolvedTests.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16, border: '1px dashed var(--color-border-input, #cbd5e1)' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>📊</div>
          <div style={{ fontWeight: 800, color: 'var(--color-text, #0f172a)', fontSize: '0.92rem', marginBottom: 4 }}>
            Henüz tamamlanmış bir test bulunmuyor
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
            Kitap testlerinizi veya atanan ödevlerinizi çözdüğünüzde sonuçlarınız burada listelenecektir.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {recentSolvedTests.map((test, idx) => {
            return (
              <div
                key={test.id || idx}
                onClick={() => onReviewTest && onReviewTest(test)}
                className="sd-card"
                style={{
                  background: 'var(--color-surface-hover, #f8fafc)',
                  border: '1.5px solid var(--color-border, #e2e8f0)',
                  borderRadius: 14,
                  padding: isMobile ? '0.75rem 0.85rem' : '0.9rem 1.1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: '#6366f1',
                      border: '1px solid rgba(165, 180, 252, 0.35)',
                      borderRadius: 6,
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '1px 5px'
                    }}>
                      {test.subject}
                    </span>
                    {Boolean(test.unitTopic && test.unitTopic !== test.title && test.unitTopic !== test.subTitle && (!test.subTitle || !test.unitTopic.toLowerCase().includes(test.subTitle.toLowerCase()))) && (
                      <span style={{
                        background: 'rgba(245, 158, 11, 0.12)',
                        color: '#b45309',
                        border: '1px solid rgba(245, 158, 11, 0.30)',
                        borderRadius: 6,
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '1px 5px'
                      }}>
                        📌 {test.unitTopic}
                      </span>
                    )}
                    {test.date && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600 }}>
                        🕐 {new Date(test.date).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>

                  <div style={{ fontWeight: 900, fontSize: isMobile ? '0.84rem' : '0.88rem', color: 'var(--color-text, #0f172a)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                    {test.title}
                  </div>
                  {test.subTitle && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span>📖 {test.subTitle}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '0.7rem', fontWeight: 800, flexWrap: 'wrap' }}>
                    {test.isManualPending ? (
                      <span style={{ color: '#a855f7', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 900 }}>
                        ⏳ Manuel Test • Öğretmen Onayı Bekleniyor
                      </span>
                    ) : test.isManualRejected ? (
                      <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 900 }}>
                        ❌ Manuel Test • Onaylanmadı
                      </span>
                    ) : (test.isPendingEvaluation || (test.isOpenEnded && !test.isEvaluated)) ? (
                      <span style={{ color: '#7c3aed', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        📝 {test.totalQuestions || 1} Açık Uçlu Soru • ⏳ Değerlendirmede
                      </span>
                    ) : (
                      <>
                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          ✓ {test.correctCount ?? 0} D
                        </span>
                        <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          ✗ {test.wrongCount ?? 0} Y
                        </span>
                        {(test.emptyCount > 0 || ((test.correctCount ?? 0) === 0 && (test.wrongCount ?? 0) === 0)) && (
                          <span style={{ color: 'var(--color-text-muted, #64748b)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            ○ {test.emptyCount ?? 0} B
                          </span>
                        )}
                        <span style={{ color: 'var(--color-text-muted, #475569)', opacity: 0.8 }}>
                          • {test.totalQuestions} Soru
                        </span>
                        {test.net !== undefined && test.net !== null && (
                          <span style={{ color: '#6366f1', fontWeight: 800 }}>
                            • {test.net} Net
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
