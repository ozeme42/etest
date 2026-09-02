import React from 'react';
import { X, Settings2, Maximize2, Minimize2, Volume2, VolumeX, ShieldAlert, Sparkles, Sun } from 'lucide-react';

export default function StudySettingsDrawer({
  show,
  onClose,
  themeObj,
  isMobile,
  themes = [],
  activeTheme,
  setActiveTheme,
  isFullscreen,
  toggleFullscreen,
  wakeLockActive,
  questionChimeEnabled,
  setQuestionChimeEnabled,
  pauseLimitMode,
  setPauseLimitMode
}) {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      display: 'flex'
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          flex: 1,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
      />

      {/* Slide-out Drawer Panel */}
      <div style={{
        width: isMobile ? '82vw' : 340,
        maxWidth: 380,
        background: themeObj.cardBg,
        borderLeft: `1px solid ${themeObj.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: '1.25rem 1.2rem',
        overflowY: 'auto',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.25)',
        zIndex: 201
      }}>
        {/* Başlık ve Kapat Butonu */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${themeObj.border}`, paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings2 size={18} color={themeObj.accent} />
            <span style={{ fontWeight: 900, fontSize: '1rem', color: themeObj.text }}>Çalışma Odası Ayarları</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: themeObj.subText, cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. Tema Seçici */}
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: themeObj.subText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            🎨 Odak Teması
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTheme(t.id)}
                style={{
                  padding: '0.55rem 0.65rem',
                  borderRadius: 12,
                  border: `1.5px solid ${activeTheme === t.id ? themeObj.accent : themeObj.border}`,
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: activeTheme === t.id ? themeObj.accent : themeObj.innerBg,
                  color: activeTheme === t.id ? '#ffffff' : themeObj.text,
                  textAlign: 'left',
                  transition: 'all 0.12s'
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Ekran & Görünüm */}
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: themeObj.subText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            🖥️ Ekran & Görünüm
          </div>
          <button
            onClick={toggleFullscreen}
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: 12,
              border: `1px solid ${themeObj.border}`,
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: isFullscreen ? themeObj.accent : themeObj.innerBg,
              color: isFullscreen ? '#ffffff' : themeObj.text,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.12s'
            }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span>{isFullscreen ? 'Tam Ekrandan Çık' : 'Zen Tam Ekran Modu'}</span>
          </button>
        </div>

        {/* 3. Ses Bildirimleri */}
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: themeObj.subText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            🔔 Ses Bildirimi
          </div>
          <button
            onClick={() => {
              setQuestionChimeEnabled(v => {
                const next = !v;
                localStorage.setItem('study_question_chime_enabled', String(next));
                return next;
              });
            }}
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: 12,
              border: `1px solid ${questionChimeEnabled ? themeObj.accent : themeObj.border}`,
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: questionChimeEnabled ? (themeObj.accentGradient || themeObj.accent) : themeObj.innerBg,
              color: questionChimeEnabled ? '#ffffff' : themeObj.text,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.12s'
            }}
          >
            {questionChimeEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>Soru Başı Zil Sesi {questionChimeEnabled ? '(Açık)' : '(Kapalı)'}</span>
          </button>
        </div>

        {/* 4. Duraklatma Sınırı / Disiplin Modu */}
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: themeObj.subText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            🛡️ Duraklatma Sınırı (Odak Disiplini)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {[
              { id: 'none', label: 'Sınırsız' },
              { id: '3', label: 'Maks 3 Kez' },
              { id: '1', label: 'Sert (1 Kez)' }
            ].map(m => {
              const isSelected = pauseLimitMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setPauseLimitMode(m.id);
                    localStorage.setItem('study_pause_limit_mode', m.id);
                  }}
                  style={{
                    padding: '0.5rem 0.4rem',
                    borderRadius: 10,
                    border: `1px solid ${isSelected ? themeObj.accent : themeObj.border}`,
                    background: isSelected ? themeObj.accent : themeObj.innerBg,
                    color: isSelected ? '#ffffff' : themeObj.text,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
