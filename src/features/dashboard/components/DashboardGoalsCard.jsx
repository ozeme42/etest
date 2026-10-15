import React from 'react';
import { Target, ChevronRight, Plus } from 'lucide-react';

const DashboardGoalsCard = React.memo(function DashboardGoalsCard({
  isMobile,
  goalTrackingData = { visualGoals: [], daily: [], weekly: [], monthly: [], hasAnyGoals: false, totalItemsCount: 0 },
  solvedQuestionsStats = { today: 0 },
  onNavigateGoals,
  onUpdateGoalProgress,
  goalTypeThemes = {}
}) {
  return (
    <div className="game-card-elevated" style={{
      padding: isMobile ? '1.1rem 0.9rem' : '1.5rem 1.8rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.15rem',
            boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)',
            color: 'white',
            flexShrink: 0
          }}>
            🎯
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 900, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
                Hedef &amp; Başarı Panosu
              </h2>
              {goalTrackingData.totalItemsCount > 0 && (
                <span className="game-badge-xp" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                  {goalTrackingData.totalItemsCount} Hedef
                </span>
              )}
              {solvedQuestionsStats.today > 0 && (
                <span style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: 99,
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  padding: '1px 6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3
                }}>
                  <span>🔥</span>
                  <span>Bugün: {solvedQuestionsStats.today} Soru</span>
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Sınav, net, soru sayısı ve çalışma hedef kotaların
            </span>
          </div>
        </div>

        <button
          onClick={onNavigateGoals}
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
          <span>Panoya Git</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* 1. GÖRSEL İLERLEME HEDEFLERİ - Large Bento Cards */}
      {goalTrackingData.visualGoals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '0.95rem', marginBottom: '1rem' }}>
          {goalTrackingData.visualGoals.map(g => {
            const t = goalTypeThemes[g.type] || goalTypeThemes.Soru || { icon: Target, unit: 'Soru', color: '#6366f1', step: 10 };
            const IconComp = t.icon || Target;
            const currentVal = g.effectiveCurrent !== undefined ? g.effectiveCurrent : (g.current || 0);
            const pct = g.target > 0 ? Math.min(100, Math.round((currentVal / g.target) * 100)) : 0;
            const isDone = currentVal >= g.target;

            return (
              <div
                key={g.id}
                className="game-quest-row"
                style={{
                  background: 'var(--color-surface)',
                  border: isDone ? '2px solid rgba(16, 185, 129, 0.45)' : '2px solid var(--color-border)',
                  borderRadius: 18,
                  padding: isMobile ? '0.95rem 0.9rem' : '1.15rem 1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  boxShadow: isDone ? '0 4px 16px rgba(16, 185, 129, 0.12)' : '0 4px 16px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: isMobile ? 36 : 42,
                      height: isMobile ? 36 : 42,
                      borderRadius: 12,
                      background: isDone ? 'linear-gradient(135deg, #10b981, #059669)' : `linear-gradient(135deg, ${t.color || '#6366f1'}, #a855f7)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 4px 12px ${isDone ? 'rgba(16, 185, 129, 0.4)' : `${t.color || '#6366f1'}35`}`,
                      color: '#ffffff',
                      flexShrink: 0
                    }}>
                      <IconComp size={isMobile ? 18 : 20} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{
                          background: `${t.color || '#6366f1'}18`,
                          color: t.color || '#6366f1',
                          fontSize: '0.64rem',
                          fontWeight: 900,
                          padding: '1px 6px',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3
                        }}>
                          {g.type}
                        </span>
                      </div>
                      <div style={{
                        fontFamily: '"Outfit", sans-serif',
                        fontSize: isMobile ? '0.95rem' : '1.08rem',
                        fontWeight: 900,
                        color: 'var(--color-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {g.title}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.84rem',
                      fontWeight: 900,
                      color: isDone ? '#10b981' : (t.color || '#6366f1'),
                      background: isDone ? 'rgba(16, 185, 129, 0.12)' : `${t.color || '#6366f1'}15`,
                      padding: '3px 9px',
                      borderRadius: 999,
                      border: `1px solid ${isDone ? '#10b981' : (t.color || '#6366f1')}40`
                    }}>
                      %{pct}
                    </span>
                    {!isDone && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateGoalProgress && onUpdateGoalProgress(g.id, t.step || 10);
                        }}
                        className="game-btn-3d"
                        title={`+${t.step || 10} ${t.unit || 'Birim'} İlerleme Ekle`}
                        style={{
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: '#ffffff',
                          borderRadius: 10,
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.74rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2
                        }}
                      >
                        +{t.step || 10}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ height: 8, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: isDone ? 'linear-gradient(90deg, #22c55e, #10b981)' : `linear-gradient(90deg, ${t.color || '#6366f1'}, #a855f7)`,
                    borderRadius: 99,
                    boxShadow: isDone ? '0 0 10px rgba(34, 197, 94, 0.5)' : `0 0 10px ${t.color || '#6366f1'}60`,
                    transition: 'width 0.8s ease'
                  }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 800 }}>
                  <span>
                    🎯 {currentVal} / {g.target} {t.unit || 'Soru'}
                    {g.type === 'Soru' && g.autoSystemValue > 0 && (
                      <span style={{ marginLeft: 5, color: '#ef4444', fontWeight: 900 }}>
                        (🔄 {g.autoSystemValue})
                      </span>
                    )}
                  </span>
                  <span style={{ color: isDone ? '#10b981' : 'var(--color-text-muted)' }}>
                    {isDone ? '🎉 Hedefe Ulaşıldı!' : `⏳ ${Math.max(0, g.target - currentVal)} ${t.unit || 'Soru'} kaldı`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. ALIŞKANLIK & GÖREV MADDELERİ - Bento Rows */}
      {(goalTrackingData.daily.length > 0 || goalTrackingData.weekly.length > 0 || goalTrackingData.monthly.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {goalTrackingData.daily.slice(0, 2).map((item, idx) => (
            <div key={item.id || idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 14,
              padding: isMobile ? '0.65rem 0.85rem' : '0.75rem 1rem',
              fontSize: '0.82rem',
              color: 'var(--color-text)'
            }}>
              <span style={{ fontSize: '1.1rem' }}>⚡</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800 }}>
                {item.text}
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: 999 }}>
                Günlük
              </span>
            </div>
          ))}

          {goalTrackingData.weekly.slice(0, 2).map((item, idx) => (
            <div key={item.id || idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 14,
              padding: isMobile ? '0.65rem 0.85rem' : '0.75rem 1rem',
              fontSize: '0.82rem',
              color: 'var(--color-text)'
            }}>
              <span style={{ fontSize: '1.1rem' }}>✨</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800 }}>
                {item.text}
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#c084fc', background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.3)', padding: '2px 8px', borderRadius: 999 }}>
                Haftalık
              </span>
            </div>
          ))}

          {goalTrackingData.monthly.slice(0, 2).map((item, idx) => (
            <div key={item.id || idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 14,
              padding: isMobile ? '0.65rem 0.85rem' : '0.75rem 1rem',
              fontSize: '0.82rem',
              color: 'var(--color-text)'
            }}>
              <span style={{ fontSize: '1.1rem' }}>📅</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800 }}>
                {item.text}
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#38bdf8', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.3)', padding: '2px 8px', borderRadius: 999 }}>
                Aylık
              </span>
            </div>
          ))}
        </div>
      )}

      {!goalTrackingData.hasAnyGoals && (
        <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16, border: '1px dashed var(--color-border-input, #cbd5e1)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>🎯</div>
          <div style={{ fontWeight: 800, color: 'var(--color-text, #0f172a)', fontSize: '0.88rem', marginBottom: 3 }}>
            Henüz Hedef Belirlenmedi
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', marginBottom: 10 }}>
            Sınav, soru ve çalışma hedeflerinizi belirleyerek başarı yolculuğunuzu takip edin!
          </div>
          <button
            onClick={onNavigateGoals}
            className="sd-btn"
            style={{
              background: 'linear-gradient(135deg, #a855f7, #6366f1)',
              border: 'none',
              color: '#ffffff',
              borderRadius: 10,
              padding: '0.35rem 0.85rem',
              fontSize: '0.75rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Plus size={13} /> Hedef Belirle 🎯
          </button>
        </div>
      )}
    </div>
  );
});

export default DashboardGoalsCard;
