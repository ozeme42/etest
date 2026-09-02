import React from 'react';
import { TreePine, Sprout, Award, Flame, CheckCircle } from 'lucide-react';

export default function StudyForestBadges({
  themeObj,
  isMobile,
  plantedForest = [],
  dailyStats = { totalMinutes: 0, questionsCount: 0, sessionsCount: 0 }
}) {
  const badges = [
    {
      label: '50 dk Hedefi',
      unlocked: dailyStats.totalMinutes >= 50,
      icon: '🥉',
      title: 'Bronz Odak',
      req: '50 dk'
    },
    {
      label: '100 dk Hedefi',
      unlocked: dailyStats.totalMinutes >= 100,
      icon: '🥈',
      title: 'Gümüş Odak',
      req: '100 dk'
    },
    {
      label: '150+ dk Şampiyon',
      unlocked: dailyStats.totalMinutes >= 150,
      icon: '🥇',
      title: 'Altın Şampiyon',
      req: '150 dk'
    }
  ];

  return (
    <div style={{
      background: themeObj.cardBg,
      border: `1px solid ${themeObj.border}`,
      borderRadius: isMobile ? 20 : 24,
      padding: isMobile ? '1rem' : '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      boxShadow: themeObj.isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.03)'
    }}>
      {/* 1. BUGÜNÜN BAŞARI ORMANI */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TreePine size={20} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: themeObj.text }}>
              Bugünün Başarı Ormanı
            </h3>
          </div>

          <span style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            padding: '0.2rem 0.6rem',
            borderRadius: 99,
            fontSize: '0.72rem',
            fontWeight: 900
          }}>
            {plantedForest.length} Ağaç Dikildi
          </span>
        </div>

        {plantedForest.length > 0 ? (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            background: themeObj.innerBg,
            borderRadius: 16,
            padding: '0.85rem',
            border: `1px solid ${themeObj.border}`,
            minHeight: 70,
            alignItems: 'center'
          }}>
            {plantedForest.map((tree, i) => (
              <div
                key={tree.id || i}
                title={`${tree.name} (${tree.time}) - ${tree.task || 'Odak Seansı'}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  background: themeObj.cardBg,
                  padding: '0.4rem 0.6rem',
                  borderRadius: 10,
                  border: `1px solid ${themeObj.border}`,
                  cursor: 'default'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>{tree.icon}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: themeObj.subText }}>{tree.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: themeObj.innerBg,
            borderRadius: 16,
            padding: '1.25rem 1rem',
            border: `1.5px dashed ${themeObj.border}`,
            textAlign: 'center',
            color: themeObj.subText
          }}>
            <Sprout size={26} color="#10b981" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: themeObj.text }}>Ormanın Henüz Boş</div>
            <div style={{ fontSize: '0.72rem', marginTop: 2 }}>
              Hedefini tamamla veya bir odaklanma seansını bitirip ilk ağacını dik!
            </div>
          </div>
        )}
      </div>

      {/* 2. GÜNLÜK HEDEF & ROZETLER */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={18} color="#f59e0b" />
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: themeObj.text }}>
              Günün Odaklanma Başarıları
            </h4>
          </div>

          <span style={{ fontSize: '0.74rem', color: themeObj.subText, fontWeight: 700 }}>
            Toplam: <strong style={{ color: themeObj.text }}>{dailyStats.totalMinutes} dk</strong>
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8
        }}>
          {badges.map((badge, i) => (
            <div
              key={i}
              style={{
                background: badge.unlocked
                  ? (themeObj.isDark ? 'rgba(234, 179, 8, 0.15)' : '#fefce8')
                  : themeObj.innerBg,
                borderRadius: 14,
                border: badge.unlocked ? '1.5px solid #facc15' : `1px solid ${themeObj.border}`,
                padding: '0.75rem 0.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 2,
                opacity: badge.unlocked ? 1 : 0.6
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>{badge.icon}</span>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 900,
                color: badge.unlocked ? (themeObj.isDark ? '#fde047' : '#854d0e') : themeObj.text,
                marginTop: 2
              }}>
                {badge.title}
              </span>
              <span style={{ fontSize: '0.64rem', color: themeObj.subText, fontWeight: 700 }}>
                {badge.unlocked ? '✅ Kazanıldı' : badge.req}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
