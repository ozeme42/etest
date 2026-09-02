import React from 'react';
import { Volume2, VolumeX, Plus, Trash2, CheckSquare, Square, Edit3, Sparkles } from 'lucide-react';

export default function StudyAmbientNotes({
  themeObj,
  isMobile,
  // Ambient Audio
  soundVolumes,
  handleVolumeChange,
  ambientAudio,
  // To-Do List
  todoList = [],
  newTodoText,
  setNewTodoText,
  handleAddTodo,
  handleToggleTodo,
  handleDeleteTodo,
  // Scratchpad
  scratchNotes,
  setScratchNotes
}) {
  const sounds = [
    { id: 'rain', label: 'Yağmur', icon: '💧' },
    { id: 'fire', label: 'Şömine', icon: '🔥' },
    { id: 'whitenoise', label: 'Beyaz Ses', icon: '⬜' },
    { id: 'waves', label: 'Dalgalar', icon: '🌊' },
    { id: 'forest', label: 'Orman Kuşları', icon: '🌲' },
    { id: 'cafe', label: 'Sakin Kafe', icon: '☕' }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: '1.25rem'
    }}>
      {/* 1. AMBİYANS SESLERİ KARTI */}
      <div style={{
        background: themeObj.cardBg,
        border: `1px solid ${themeObj.border}`,
        borderRadius: isMobile ? 20 : 24,
        padding: isMobile ? '1rem' : '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: themeObj.isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${themeObj.border}`, paddingBottom: '0.75rem' }}>
          <Volume2 size={18} color={themeObj.accent} />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: themeObj.text }}>
            Odak Ambiyans Sesleri
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8
        }}>
          {sounds.map(s => {
            const vol = soundVolumes[s.id] || 0;
            const isActive = vol > 0;
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (isActive) {
                    handleVolumeChange(s.id, 0);
                    try { ambientAudio.stopSound(s.id); } catch (e) {}
                  } else {
                    handleVolumeChange(s.id, 45);
                  }
                }}
                style={{
                  background: isActive ? (themeObj.accentGradient || themeObj.accent) : themeObj.innerBg,
                  border: `1px solid ${isActive ? themeObj.accent : themeObj.border}`,
                  borderRadius: 14,
                  padding: '0.65rem 0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  color: isActive ? '#ffffff' : themeObj.text,
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? `0 4px 12px ${themeObj.accent}40` : 'none'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>{s.label}</span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  opacity: 0.85
                }}>
                  {isActive ? `%${vol}` : 'Kapalı'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. HIZLI GÖREVLER (TO-DO) & NOT DEFTERİ KARTI */}
      <div style={{
        background: themeObj.cardBg,
        border: `1px solid ${themeObj.border}`,
        borderRadius: isMobile ? 20 : 24,
        padding: isMobile ? '1rem' : '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: themeObj.isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${themeObj.border}`, paddingBottom: '0.75rem' }}>
          <Edit3 size={18} color={themeObj.accent} />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: themeObj.text }}>
            Hızlı Hedefler & Not Defteri
          </h3>
        </div>

        {/* Görev Ekleme Kutusu */}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            placeholder="Yeni bir hedef ekle..."
            value={newTodoText}
            onChange={e => setNewTodoText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddTodo(); }}
            style={{
              flex: 1,
              background: themeObj.innerBg,
              border: `1px solid ${themeObj.border}`,
              color: themeObj.text,
              borderRadius: 10,
              padding: '0.45rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              outline: 'none'
            }}
          />
          <button
            onClick={handleAddTodo}
            style={{
              background: themeObj.accentGradient || themeObj.accent,
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '0 0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Görev Listesi */}
        {todoList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 110, overflowY: 'auto' }}>
            {todoList.map(t => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: themeObj.innerBg,
                  borderRadius: 8,
                  padding: '0.35rem 0.6rem',
                  border: `1px solid ${themeObj.border}`
                }}
              >
                <div
                  onClick={() => handleToggleTodo(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    flex: 1,
                    textDecoration: t.completed ? 'line-through' : 'none',
                    opacity: t.completed ? 0.6 : 1
                  }}
                >
                  {t.completed ? <CheckSquare size={14} color="#10b981" /> : <Square size={14} color={themeObj.subText} />}
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: themeObj.text }}>{t.text}</span>
                </div>

                <button
                  onClick={() => handleDeleteTodo(t.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: themeObj.subText,
                    cursor: 'pointer',
                    padding: 2
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Karalama Defteri Textarea */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: themeObj.subText, marginBottom: 4 }}>
            📝 Karalama & Hızlı Notlar:
          </div>
          <textarea
            placeholder="Çalışırken aklına gelen formülleri veya önemli notları buraya yaz..."
            value={scratchNotes}
            onChange={e => setScratchNotes(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              background: themeObj.innerBg,
              border: `1px solid ${themeObj.border}`,
              color: themeObj.text,
              borderRadius: 12,
              padding: '0.55rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>
    </div>
  );
}
