import React from 'react';
import { ArrowLeft, Flame, Sun, Settings2, Maximize2, Minimize2, Sparkles, Target, Zap } from 'lucide-react';

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
  onBack,
  isZenFocusMode,
  onToggleZenMode
}) {
  return (
    <header style={{
      padding: isMobile ? '0.75rem 0.9rem' : '0.95rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1.5px solid ${themeObj.border}`,
      background: themeObj.isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      gap: 12,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    }}>
      {/* Sol: Geri butonu & EduQuest Başlık Rozeti */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, minWidth: 0 }}>
        <button
          onClick={onBack}
          style={{
            background: themeObj.buttonBg,
            border: `1.5px solid ${themeObj.border}`,
            color: themeObj.text,
            borderRadius: 12,
            width: isMobile ? 38 : 42,
            height: isMobile ? 38 : 42,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            flexShrink: 0
          }}
          className="hover:scale-105 active:scale-95"
          title="Ana Panele Dön"
        >
          <ArrowLeft size={isMobile ? 18 : 20} />
        </button>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <h1 style={{
              margin: 0,
              fontSize: isMobile ? '1.05rem' : '1.3rem',
              fontWeight: 900,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '-0.025em',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap'
            }}>
              Odak &amp; Çalışma Odası
            </h1>

            {/* Streak Rozeti */}
            <span style={{
              background: themeObj.isDark ? 'rgba(249, 115, 22, 0.18)' : '#fff7ed',
              color: '#f97316',
              fontSize: isMobile ? '0.66rem' : '0.74rem',
              fontWeight: 900,
              fontFamily: "'Outfit', sans-serif",
              padding: '0.18rem 0.55rem',
              borderRadius: 99,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              border: '1.5px solid rgba(249, 115, 22, 0.35)',
              boxShadow: '0 2px 8px rgba(249, 115, 22, 0.15)',
              whiteSpace: 'nowrap'
            }}>
              <Flame size={13} color="#f97316" fill="#f97316" />
              <span>{streakData.currentStreak} Gün Seri</span>
            </span>

            {/* XP Rozeti */}
            <span style={{
              background: themeObj.isDark ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff',
              color: '#6366f1',
              fontSize: isMobile ? '0.66rem' : '0.74rem',
              fontWeight: 900,
              fontFamily: "'Outfit', sans-serif",
              padding: '0.18rem 0.55rem',
              borderRadius: 99,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              border: '1.5px solid rgba(99, 102, 241, 0.35)',
              whiteSpace: 'nowrap'
            }}>
              <Zap size={12} color="#6366f1" fill="#6366f1" />
              <span>+50 XP</span>
            </span>

            {/* Ekran Kilidi Rozeti */}
            {wakeLockActive && (
              <span style={{
                background: 'rgba(16, 185, 129, 0.14)',
                color: '#10b981',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.18rem 0.5rem',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                border: '1.5px solid rgba(16, 185, 129, 0.35)',
                whiteSpace: 'nowrap'
              }} title="Sayaç açıkken ekranınız kararmaz">
                <Sun size={12} />
                {!isMobile && <span>Ekran Açık</span>}
              </span>
            )}
          </div>

          {!isMobile && (
            <div style={{ fontSize: '0.73rem', color: themeObj.subText, fontWeight: 700, marginTop: 2 }}>
              {currentUser?.name || 'Öğrenci'} · Maarif Modeli Kişiselleştirilmiş Odak Seansı
            </div>
          )}
        </div>
      </div>

      {/* Sağ: Odak Modu Butonu, Temalar & Ayarlar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* 🎯 ÖZEL ODAK MODU (ZEN) TOGGLE BUTONU */}
        <button
          onClick={onToggleZenMode}
          title={isZenFocusMode ? "Normal Görünüme Dön" : "Tüm Dikkat Dağıtıcıları Gizle (Zen Odak Modu)"}
          style={{
            background: isZenFocusMode
              ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
              : (themeObj.isDark ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.22))' : '#eef2ff'),
            border: isZenFocusMode ? '1.5px solid #6366f1' : '1.5px solid rgba(99, 102, 241, 0.4)',
            color: isZenFocusMode ? '#ffffff' : (themeObj.isDark ? '#c7d2fe' : '#4f46e5'),
            borderRadius: 14,
            height: isMobile ? 38 : 42,
            padding: isMobile ? '0 0.75rem' : '0 1.05rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: isMobile ? '0.76rem' : '0.84rem',
            fontWeight: 900,
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: '0.01em',
            boxShadow: isZenFocusMode
              ? '0 4px 18px rgba(99, 102, 241, 0.45)'
              : '0 2px 8px rgba(99, 102, 241, 0.15)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="hover:scale-105 active:scale-95"
        >
          <Sparkles size={16} />
          <span>{isZenFocusMode ? 'Odaktan Çık' : 'Tam Odak Modu'}</span>
        </button>

        {/* Masaüstü Hızlı Tema Seçici */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            background: themeObj.innerBg,
            padding: 3,
            borderRadius: 12,
            border: `1.5px solid ${themeObj.border}`
          }}>
            {themes.slice(0, 4).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTheme(t.id)}
                title={t.name}
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: 9,
                  border: 'none',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: activeTheme === t.id ? (themeObj.accentGradient || themeObj.accent) : 'transparent',
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
          title={isFullscreen ? "Tam Ekrandan Çık" : "Tarayıcıyı Tam Ekran Yap"}
          style={{
            width: isMobile ? 38 : 42,
            height: isMobile ? 38 : 42,
            borderRadius: 12,
            border: `1.5px solid ${themeObj.border}`,
            background: isFullscreen ? (themeObj.accentGradient || themeObj.accent) : themeObj.buttonBg,
            color: isFullscreen ? '#ffffff' : themeObj.text,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          className="hover:scale-105 active:scale-95"
        >
          {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>

        {/* Ayarlar Çekmecesi Butonu */}
        <button
          onClick={() => setShowSettingsDrawer(true)}
          title="Çalışma Odası Ayarları"
          style={{
            background: showSettingsDrawer ? (themeObj.accentGradient || themeObj.accent) : themeObj.buttonBg,
            border: `1.5px solid ${showSettingsDrawer ? themeObj.accent : themeObj.border}`,
            color: showSettingsDrawer ? '#ffffff' : themeObj.text,
            borderRadius: 12,
            height: isMobile ? 38 : 42,
            padding: isMobile ? '0 0.65rem' : '0 0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.78rem',
            fontWeight: 800,
            transition: 'all 0.15s'
          }}
          className="hover:scale-105 active:scale-95"
        >
          <Settings2 size={17} />
          {!isMobile && <span>Ayarlar</span>}
        </button>
      </div>
    </header>
  );
}
