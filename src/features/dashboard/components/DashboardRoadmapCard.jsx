import React from 'react';
import { ChevronRight, Compass, Star, BookOpen } from 'lucide-react';

const DashboardRoadmapCard = React.memo(function DashboardRoadmapCard({
  isMobile,
  isDark,
  personalRoadmap = null,
  myRoadmaps = [],
  onNavigateRoadmap
}) {
  const hasPersonal = Boolean(personalRoadmap && personalRoadmap.totalTopics > 0);
  const hasTeacherRoadmaps = Boolean(myRoadmaps && myRoadmaps.length > 0);
  const hasAnyRoadmap = hasPersonal || hasTeacherRoadmaps;

  return (
    <div className="game-card-elevated" style={{
      padding: isMobile ? '1.1rem 0.9rem' : '1.5rem 1.8rem'
    }}>
      {/* Kart Başlığı */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', boxShadow: '0 4px 14px rgba(124,58,237,0.4)', color: 'white', flexShrink: 0 }}>
            🗺️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h2 style={{ fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 900, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
                Yol Haritam &amp; Konu Seferi
              </h2>
              <span className="game-badge-xp" style={{ fontSize: '0.65rem', padding: '1px 6px', color: '#a855f7', borderColor: 'rgba(168,85,247,0.4)' }}>
                ⭐ Sefer
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Müfredat ünite basamakları ve konu tamamlama ilerlemen
            </span>
          </div>
        </div>

        <span style={{ background: isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.12)', color: isDark ? '#c084fc' : '#7c3aed', border: '1.5px solid rgba(168, 85, 247, 0.4)', borderRadius: 999, padding: '0.3rem 0.85rem', fontSize: '0.74rem', fontWeight: 900 }}>
          {hasPersonal && hasTeacherRoadmaps
            ? `${myRoadmaps.length + 1} Aktif Harita`
            : hasPersonal
            ? 'Kişisel Yol Haritası'
            : hasTeacherRoadmaps
            ? `${myRoadmaps.length} Atanmış Harita`
            : 'Müfredat Haritası'}
        </span>
      </div>

      {!hasAnyRoadmap ? (
        /* Henüz Hiçbir Harita Yoksa: Karşılama ve Keşfet Kutusu */
        <div style={{ padding: '1.75rem 1.25rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16, border: '1.5px dashed var(--color-border-input, #cbd5e1)' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 6 }}>🗺️</div>
          <div style={{ fontWeight: 900, color: 'var(--color-text, #0f172a)', fontSize: '1rem', marginBottom: 4 }}>
            Sınıf &amp; Konu Yol Haritanız Hazır!
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #64748b)', maxWidth: 360, margin: '0 auto 1rem auto', lineHeight: 1.4 }}>
            Derslerinizin tüm ünite ve konularını görsel bir patika üzerinde adım adım takip edebilir, ilerlemenizi kaydedebilirsiniz.
          </div>
          <button
            type="button"
            onClick={() => onNavigateRoadmap && onNavigateRoadmap('curriculum-roadmap')}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
              border: 'none',
              borderRadius: 99,
              color: '#ffffff',
              padding: '0.55rem 1.35rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Compass size={15} /> 🗺️ Yol Haritasını Keşfet
          </button>
        </div>
      ) : (
        /* Haritalar Listesi - Large Bento Cards */
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.85rem' : '1.1rem' }}>
          
          {/* 1. ⭐ Öğrencinin Kendi Kişisel Yol Haritası */}
          {hasPersonal && (
            <div
              onClick={() => onNavigateRoadmap && onNavigateRoadmap('curriculum-roadmap')}
              className="game-quest-row"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(49, 46, 129, 0.45) 100%)'
                  : 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                border: isDark ? '2px solid rgba(168, 85, 247, 0.45)' : '2px solid #ddd6fe',
                borderRadius: 18,
                padding: isMobile ? '1rem 0.95rem' : '1.25rem 1.45rem',
                cursor: 'pointer',
                boxShadow: isDark ? '0 6px 20px rgba(124, 58, 237, 0.25)' : '0 6px 20px rgba(124, 58, 237, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                transition: 'all 0.22s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: isMobile ? 38 : 44,
                    height: isMobile ? 38 : 44,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                    color: '#ffffff',
                    flexShrink: 0
                  }}>
                    <Star size={isMobile ? 18 : 22} fill="#ffffff" color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: isMobile ? '0.98rem' : '1.12rem', color: 'var(--color-text)' }}>
                      Kişisel Yol Haritam
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 1 }}>
                      {personalRoadmap.subjectCount} Ders • {personalRoadmap.unitCount} Ünite
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  color: '#7c3aed',
                  background: isDark ? 'rgba(124, 58, 237, 0.25)' : '#ffffff',
                  padding: '4px 12px',
                  borderRadius: 999,
                  border: '1.5px solid rgba(124, 58, 237, 0.3)',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.15)'
                }}>
                  %{personalRoadmap.pct}
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ height: 9, background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${personalRoadmap.pct}%`,
                  background: 'linear-gradient(90deg, #8b5cf6, #10b981)',
                  borderRadius: 999,
                  boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)',
                  transition: 'width 0.8s ease'
                }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontSize: isMobile ? '0.74rem' : '0.8rem', fontWeight: 800 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  🎯 <strong>{personalRoadmap.doneTopics} / {personalRoadmap.totalTopics}</strong> Konu Tamamlandı
                </span>
                <button
                  type="button"
                  className="game-btn-3d game-btn-primary"
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: 12,
                    fontSize: '0.78rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <span>Haritayı Aç</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* 2. 🏫 Öğretmenin Atadığı Çalışma Planları / Haritalar */}
          {hasTeacherRoadmaps && myRoadmaps.map(({ assignment, plan, totalTopics, doneTopics, pct }) => (
            <div
              key={assignment.id}
              onClick={() => onNavigateRoadmap && onNavigateRoadmap(assignment.id)}
              className="game-quest-row"
              style={{
                background: 'var(--color-surface)',
                border: '2px solid var(--color-border)',
                borderRadius: 18,
                padding: isMobile ? '1rem 0.95rem' : '1.25rem 1.45rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                boxShadow: isDark ? '0 6px 20px rgba(0,0,0,0.35)' : '0 6px 20px rgba(0,0,0,0.04)',
                transition: 'all 0.22s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: isMobile ? 38 : 44,
                    height: isMobile ? 38 : 44,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                    color: '#ffffff',
                    flexShrink: 0
                  }}>
                    <BookOpen size={isMobile ? 18 : 22} />
                  </div>
                  <div>
                    <div style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: isMobile ? '0.96rem' : '1.1rem', color: 'var(--color-text)' }}>
                      {plan.title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#3b82f6', fontWeight: 800, marginTop: 1 }}>
                      🏫 Öğretmen Çalışma Planı
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  color: '#3b82f6',
                  background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                  padding: '4px 12px',
                  borderRadius: 999,
                  border: '1.5px solid rgba(59, 130, 246, 0.3)'
                }}>
                  %{pct}
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ height: 8, background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #38bdf8, #2563eb)', borderRadius: 999, boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)', transition: 'width 0.8s ease' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontSize: isMobile ? '0.74rem' : '0.8rem', fontWeight: 800 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  📌 <strong>{doneTopics} / {totalTopics}</strong> Konu Tamamlandı
                </span>
                <button
                  type="button"
                  className="game-btn-3d"
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    color: '#ffffff',
                    padding: '0.45rem 0.95rem',
                    borderRadius: 12,
                    fontSize: '0.78rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <span>Detayları Gör</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Haritayı Aç Bağlantısı */}
          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <button
              type="button"
              onClick={() => onNavigateRoadmap && onNavigateRoadmap('curriculum-roadmap')}
              className="game-btn-3d"
              style={{
                background: 'var(--color-surface)',
                border: '2px solid var(--color-border)',
                color: isDark ? '#c084fc' : '#7c3aed',
                fontSize: isMobile ? '0.82rem' : '0.88rem',
                fontWeight: 900,
                borderRadius: 999,
                padding: '0.6rem 1.4rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.15)'
              }}
            >
              <Compass size={16} /> 🗺️ Tüm Ders, Ünite &amp; Konu Yol Haritası ↗
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default DashboardRoadmapCard;
