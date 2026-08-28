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
    <div className="sd-card" style={{
      padding: isMobile ? '0.95rem 0.85rem' : '1.35rem 1.6rem',
      borderRadius: 16,
      background: 'var(--color-surface)',
      border: '1.5px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.95rem',
            boxShadow: '0 3px 10px rgba(168, 85, 247, 0.35)'
          }}>
            🎯
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
                Hedef Takip Panosu
              </h2>
              {goalTrackingData.totalItemsCount > 0 && (
                <span style={{
                  background: 'rgba(124, 58, 237, 0.15)',
                  color: '#c084fc',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  borderRadius: 99,
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  padding: '1px 6px'
                }}>
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
            <span style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 600 }}>
              Sınav, net, soru ve çalışma hedefleriniz
            </span>
          </div>
        </div>

        <button
          onClick={onNavigateGoals}
          className="sd-btn"
          style={{
            background: 'rgba(124, 58, 237, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            color: '#c084fc',
            borderRadius: 8,
            padding: '0.25rem 0.65rem',
            fontSize: '0.7rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 3
          }}
        >
          <span>Panoya Git</span>
          <ChevronRight size={12} />
        </button>
      </div>

      {/* 1. GÖRSEL İLERLEME HEDEFLERİ */}
      {goalTrackingData.visualGoals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
          {goalTrackingData.visualGoals.map(g => {
            const t = goalTypeThemes[g.type] || goalTypeThemes.Soru || { icon: Target, unit: 'Soru', color: '#6366f1', step: 10 };
            const IconComp = t.icon || Target;
            const currentVal = g.effectiveCurrent !== undefined ? g.effectiveCurrent : (g.current || 0);
            const pct = g.target > 0 ? Math.min(100, Math.round((currentVal / g.target) * 100)) : 0;
            const isDone = currentVal >= g.target;

            return (
              <div
                key={g.id}
                className="sd-card"
                style={{
                  background: 'var(--color-surface-hover, #f8fafc)',
                  border: '1.5px solid var(--color-border, #e2e8f0)',
                  borderRadius: 12,
                  padding: isMobile ? '0.65rem 0.75rem' : '0.75rem 0.95rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#818cf8',
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      padding: '1px 5px',
                      borderRadius: 5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      <IconComp size={10} /> {g.type}
                    </span>
                    <span style={{ fontSize: isMobile ? '0.78rem' : '0.82rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', maxWidth: isMobile ? 120 : 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, color: isDone ? '#10b981' : '#6366f1' }}>
                      %{pct}
                    </span>
                    {!isDone && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateGoalProgress && onUpdateGoalProgress(g.id, t.step || 10);
                        }}
                        title={`+${t.step || 10} ${t.unit || 'Birim'} İlerleme Ekle`}
                        style={{
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(165, 180, 252, 0.35)',
                          color: '#818cf8',
                          borderRadius: 5,
                          padding: '1px 5px',
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        +{t.step || 10}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ height: 5, background: 'var(--color-border, #e2e8f0)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: isDone ? 'linear-gradient(90deg, #22c55e, #10b981)' : `linear-gradient(90deg, ${t.color || '#6366f1'}, #a855f7)`,
                    borderRadius: 99,
                    transition: 'width 0.8s ease'
                  }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                  <span>
                    {currentVal} / {g.target} {t.unit || 'Soru'}
                    {g.type === 'Soru' && g.autoSystemValue > 0 && (
                      <span style={{ marginLeft: 4, color: '#ef4444', fontWeight: 800, fontSize: '0.6rem' }}>
                        (🔄 {g.autoSystemValue})
                      </span>
                    )}
                  </span>
                  <span style={{ color: isDone ? '#10b981' : 'var(--color-text-muted, #64748b)' }}>
                    {isDone ? '🎉 Tamamlandı' : `${Math.max(0, g.target - currentVal)} ${t.unit || 'Soru'} kaldı`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. ALIŞKANLIK & GÖREV MADDELERİ */}
      {(goalTrackingData.daily.length > 0 || goalTrackingData.weekly.length > 0 || goalTrackingData.monthly.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {goalTrackingData.daily.slice(0, 2).map((item, idx) => (
            <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: 10, padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-text, #1e293b)' }}>
              <span style={{ fontSize: '0.85rem' }}>⚡</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                {item.text}
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '1px 5px', borderRadius: 4 }}>
                Günlük
              </span>
            </div>
          ))}

          {goalTrackingData.weekly.slice(0, 2).map((item, idx) => (
            <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: 10, padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-text, #1e293b)' }}>
              <span style={{ fontSize: '0.85rem' }}>✨</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                {item.text}
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#c084fc', background: 'rgba(124, 58, 237, 0.15)', padding: '1px 5px', borderRadius: 4 }}>
                Haftalık
              </span>
            </div>
          ))}

          {goalTrackingData.monthly.slice(0, 2).map((item, idx) => (
            <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: 10, padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-text, #1e293b)' }}>
              <span style={{ fontSize: '0.85rem' }}>📅</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                {item.text}
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#38bdf8', background: 'rgba(2, 132, 199, 0.15)', padding: '1px 5px', borderRadius: 4 }}>
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
