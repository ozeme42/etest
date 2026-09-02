import React from 'react';
import { ArrowLeft, Flame, Sun, Settings2, Maximize2, Minimize2 } from 'lucide-react';

export default function StudyRoomHeader({
  themeObj,
  isMobile,
  currentUser,
  streakData,
  wakeLockActive,
  isFullscreen,
  toggleFullscreen,
  showSettingsDrawer,
  setShowSettingsDrawer,
  activeTheme,
  setActiveTheme,
  themes,
  onBack
}) {
  return (
    <header style={{
      padding: isMobile ? '0.65rem 0.85rem' : '0.85rem 1.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${themeObj.border}`,
      background: themeObj.isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      gap: 10
    }}>
      {/* Sol: Geri butonu & Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, minWidth: 0 }}>
        <button
          onClick={onBack}
          style={{
            background: themeObj.buttonBg,
            border: `1px solid ${themeObj.border}`,
            color: themeObj.text,
            borderRadius: 12,
            width: isMobile ? 36 : 40,
            height: isMobile ? 36 : 40,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          title="Panoya Dön"
        >
          <ArrowLeft size={isMobile ? 17 : 19} />
        </button>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <h1 style={{
              margin: 0,
              fontSize: isMobile ? '0.95rem' : '1.15rem',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: themeObj.text,
              whiteSpace: 'nowrap'
            }}>
              Odak Odası
            </h1>

            {/* Streak Rozeti */}
            <span style={{
              background: themeObj.isDark ? 'rgba(249, 115, 22, 0.18)' : '#fff7ed',
              color: '#f97316',
              fontSize: isMobile ? '0.65rem' : '0.72rem',
              fontWeight: 900,
              padding: '0.15rem 0.5rem',
              borderRadius: 99,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              border: '1px solid rgba(249, 115, 22, 0.35)',
              whiteSpace: 'nowrap'
            }}>
              <Flame size={13} color="#f97316" fill="#f97316" />
              <span>{streakData.currentStreak} Gün Seri</span>
            </span>

            {/* Ekran Kilidi Rozeti */}
            {wakeLockActive && (
              <span style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                border: '1px solid rgba(16, 185, 129, 0.3)',
                whiteSpace: 'nowrap'
              }} title="Sayaç açıkken ekranınız kararmaz">
                <Sun size={11} />
                {!isMobile && <span>Ekran Açık</span>}
              </span>
            )}
          </div>

          {!isMobile && (
            <div style={{ fontSize: '0.72rem', color: themeObj.subText, fontWeight: 600, marginTop: 1 }}>
              {currentUser?.name || 'Öğrenci'} · Odaklanma, Soru Çözümü & Mola İstasyonu
            </div>
          )}
        </div>
      </div>

      {/* Sağ: Hızlı Temalar, Zen Modu & Ayarlar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Masaüstü Hızlı Tema Seçici */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            background: themeObj.innerBg,
            padding: 3,
            borderRadius: 12,
            border: `1px solid ${themeObj.border}`
          }}>
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTheme(t.id)}
                title={t.name}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: activeTheme === t.id ? themeObj.accent : 'transparent',
                  color: activeTheme === t.id ? '#ffffff' : themeObj.text,
                  transition: 'all 0.15s'
                }}
              >
                {t.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        {/* Zen Tam Ekran Butonu */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Tam Ekrandan Çık" : "Zen Tam Ekran"}
          style={{
            width: isMobile ? 36 : 40,
            height: isMobile ? 36 : 40,
            borderRadius: 12,
            border: `1px solid ${themeObj.border}`,
            background: isFullscreen ? themeObj.accent : themeObj.buttonBg,
            color: isFullscreen ? '#ffffff' : themeObj.text,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        {/* Ayarlar Çekmecesi Butonu */}
        <button
          onClick={() => setShowSettingsDrawer(true)}
          title="Çalışma Odası Ayarları"
          style={{
            background: showSettingsDrawer ? themeObj.accent : themeObj.buttonBg,
            border: `1px solid ${showSettingsDrawer ? themeObj.accent : themeObj.border}`,
            color: showSettingsDrawer ? '#ffffff' : themeObj.text,
            borderRadius: 12,
            height: isMobile ? 36 : 40,
            padding: isMobile ? '0 0.6rem' : '0 0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.78rem',
            fontWeight: 800,
            transition: 'all 0.15s'
          }}
        >
          <Settings2 size={16} />
          {!isMobile && <span>Ayarlar</span>}
        </button>
      </div>
    </header>
  );
}
