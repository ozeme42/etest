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
    <div className="sd-card" style={{
      padding: isMobile ? '0.95rem 0.85rem' : '1.35rem 1.6rem',
      borderRadius: 16,
      background: 'var(--color-surface)',
      border: '1.5px solid var(--color-border)'
    }}>
      {/* Kart Başlığı */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', boxShadow: '0 3px 10px rgba(124,58,237,0.35)', color: 'white' }}>
            🗺️
          </div>
          <div>
            <h2 style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
              Yol Haritam &amp; Konu Takibi
            </h2>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Müfredat konu tamamlama ilerlemeniz
            </span>
          </div>
        </div>

        <span style={{ background: isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.12)', color: isDark ? '#c084fc' : '#7c3aed', border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: 99, padding: '0.2rem 0.65rem', fontSize: '0.7rem', fontWeight: 900 }}>
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
        /* Haritalar Listesi */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          {/* 1. ⭐ Öğrencinin Kendi Kişisel Yol Haritası */}
          {hasPersonal && (
            <div
              onClick={() => onNavigateRoadmap && onNavigateRoadmap('curriculum-roadmap')}
              className="sd-card"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(49, 46, 129, 0.4) 100%)'
                  : 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                border: isDark ? '1.5px solid rgba(168, 85, 247, 0.4)' : '1.5px solid #ddd6fe',
                borderRadius: 14,
                padding: isMobile ? '0.85rem' : '1rem 1.15rem',
                cursor: 'pointer',
                boxShadow: isDark ? '0 4px 14px -2px rgba(124, 58, 237, 0.25)' : '0 4px 14px -2px rgba(124, 58, 237, 0.1)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Star size={16} color="#f59e0b" fill="#f59e0b" />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.94rem', color: 'var(--color-text, #0f172a)' }}>
                      Kişisel Yol Haritam
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      {personalRoadmap.subjectCount} Ders • {personalRoadmap.unitCount} Ünite
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  color: '#7c3aed',
                  background: isDark ? 'rgba(124, 58, 237, 0.25)' : '#ffffff',
                  padding: '2px 8px',
                  borderRadius: 99,
                  border: '1px solid rgba(124, 58, 237, 0.3)'
                }}>
                  %{personalRoadmap.pct}
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ height: 7, background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{
                  height: '100%',
                  width: `${personalRoadmap.pct}%`,
                  background: 'linear-gradient(90deg, #8b5cf6, #10b981)',
                  borderRadius: 99,
                  transition: 'width 0.8s ease'
                }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                <span>{personalRoadmap.doneTopics} / {personalRoadmap.totalTopics} Konu Tamamlandı</span>
                <span style={{ color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 800 }}>
                  Haritayı Aç <ChevronRight size={12} />
                </span>
              </div>
            </div>
          )}

          {/* 2. 🏫 Öğretmenin Atadığı Çalışma Planları / Haritalar */}
          {hasTeacherRoadmaps && myRoadmaps.map(({ assignment, plan, totalTopics, doneTopics, pct }) => (
            <div
              key={assignment.id}
              onClick={() => onNavigateRoadmap && onNavigateRoadmap(assignment.id)}
              className="sd-card"
              style={{
                background: 'var(--color-surface, #ffffff)',
                border: '1.5px solid var(--color-border, #e2e8f0)',
                borderRadius: 14,
                padding: isMobile ? '0.85rem' : '1rem 1.15rem',
                cursor: 'pointer',
                boxShadow: isDark ? '0 4px 14px -2px rgba(0,0,0,0.35)' : '0 4px 14px -2px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={15} color="#3b82f6" />
                  <div style={{ fontWeight: 900, fontSize: isMobile ? '0.86rem' : '0.92rem', color: 'var(--color-text, #0f172a)' }}>
                    {plan.title}
                  </div>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#3b82f6' }}>
                  %{pct}
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ height: 6, background: 'var(--color-border, #e2e8f0)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #38bdf8, #2563eb)', borderRadius: 99, transition: 'width 0.8s ease' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                <span>{doneTopics} / {totalTopics} Konu Tamamlandı (Öğretmen Planı)</span>
                <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 800 }}>
                  Detayları Gör <ChevronRight size={12} />
                </span>
              </div>
            </div>
          ))}

          {/* Haritayı Aç Bağlantısı */}
          <div style={{ textAlign: 'center', paddingTop: 6, borderTop: isDark ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed #e2e8f0' }}>
            <button
              type="button"
              onClick={() => onNavigateRoadmap && onNavigateRoadmap('curriculum-roadmap')}
              style={{
                background: 'none',
                border: 'none',
                color: isDark ? '#a5b4fc' : '#6366f1',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <Compass size={13} /> Tüm Ders, Ünite &amp; Konu Yol Haritası ↗
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default DashboardRoadmapCard;
