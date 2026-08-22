import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, CheckCircle2, Calendar, ArrowLeft, Layers, Target, BookOpen, CheckCircle, Play, PlayCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { useTheme } from '../context/ThemeContext';
import ProgramCenter, { normalizeWeeklyProgram } from '../components/ProgramCenter';

function getWeekDateRange() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const mon = new Date(d.setDate(diff));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (dt) => `${dt.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][dt.getMonth()]}`;
  return `${fmt(mon)} – ${fmt(sun)} ${sun.getFullYear()}`;
}

export default function StudentProgramPage() {
  const { currentUser } = useAuth();
  const { getCoachingProfileForStudent, saveCoachingProfile } = useCoaching();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const studentId = currentUser?.id;
  const existingProfile = useMemo(
    () => getCoachingProfileForStudent(studentId) || {},
    [studentId, getCoachingProfileForStudent]
  );

  const [weeklyProgram, setWeeklyProgramState] = useState(() => normalizeWeeklyProgram(existingProfile.weeklyProgram));
  const [topicPool, setTopicPoolState] = useState(() => existingProfile.topicPool || []);
  const [saved, setSaved] = useState(false);

  const setWeeklyProgram = async (newProgramOrFn) => {
    const nextProg = typeof newProgramOrFn === 'function' ? newProgramOrFn(weeklyProgram) : newProgramOrFn;
    setWeeklyProgramState(nextProg);
    await saveCoachingProfile({ ...existingProfile, studentId, weeklyProgram: nextProg, topicPool });
  };

  const setTopicPool = async (newPoolOrFn) => {
    const nextPool = typeof newPoolOrFn === 'function' ? newPoolOrFn(topicPool) : newPoolOrFn;
    setTopicPoolState(nextPool);
    await saveCoachingProfile({ ...existingProfile, studentId, weeklyProgram, topicPool: nextPool });
  };

  const weekRange = getWeekDateRange();

  useEffect(() => {
    if (existingProfile.weeklyProgram && existingProfile.weeklyProgram.length > 0) {
      setWeeklyProgramState(normalizeWeeklyProgram(existingProfile.weeklyProgram));
    }
    if (existingProfile.topicPool && existingProfile.topicPool.length > 0) {
      setTopicPoolState(existingProfile.topicPool);
    }
  }, [existingProfile.id]);

  const handleSave = async () => {
    await saveCoachingProfile({ ...existingProfile, studentId, weeklyProgram, topicPool });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const totalItems = weeklyProgram.reduce((a, d) => a + (d.items?.length || 0), 0);
  const doneItems = weeklyProgram.reduce((a, d) => a + (d.items?.filter(i => i.done).length || 0), 0);
  const weekPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const totalTopics = topicPool.reduce((a, s) => a + s.topics.length, 0);
  const doneTopics = topicPool.reduce((a, s) => a + s.topics.filter(t => t.status === 'Tamamlandı').length, 0);

  if (!currentUser) return null;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      backgroundImage: isDark
        ? 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.15) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.10) 0%, transparent 45%), var(--color-bg)'
        : 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.05) 0%, transparent 45%), var(--color-bg)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: 'var(--color-text)',
      padding: isMobile ? '0.75rem 0.65rem 140px' : '1.25rem 1rem 100px',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .prog-anim { animation: fadeIn 0.25s ease both; }
        @media (max-width: 640px) {
          .prog-hero-card {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 0.9rem !important;
            gap: 0.8rem !important;
          }
          .prog-kpis {
            width: 100% !important;
            min-width: 100% !important;
          }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '100%', margin: 0 }}>
        {/* Top Action Bar */}
        <div className="no-print" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem',
          gap: '0.65rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/student')}
              style={{
                background: 'var(--color-surface, #ffffff)',
                border: '1.5px solid var(--color-border, #cbd5e1)',
                borderRadius: '0.75rem',
                padding: isMobile ? '0.45rem 0.75rem' : '0.5rem 0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 800,
                fontSize: isMobile ? '0.76rem' : '0.82rem',
                color: 'var(--color-text, #1e293b)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.15s'
              }}
            >
              <ArrowLeft size={15} /> Öğrenci Paneli
            </button>

            <button
              onClick={() => navigate('/study-room')}
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                borderRadius: '0.75rem',
                padding: isMobile ? '0.45rem 0.75rem' : '0.5rem 0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 900,
                fontSize: isMobile ? '0.76rem' : '0.82rem',
                color: '#ffffff',
                boxShadow: '0 3px 10px rgba(245,158,11,0.3)',
                transition: 'all 0.15s'
              }}
            >
              <Play size={14} fill="#ffffff" /> ⏱️ Çalışma Odası
            </button>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff',
            border: isDark ? '1px solid rgba(165, 180, 252, 0.35)' : '1px solid #c7d2fe',
            padding: '0.3rem 0.75rem',
            borderRadius: '99px',
            fontSize: isMobile ? '0.72rem' : '0.76rem',
            fontWeight: 800,
            color: isDark ? '#818cf8' : '#4338ca'
          }}>
            <Calendar size={13} color={isDark ? '#818cf8' : '#4f46e5'} />
            <span>{weekRange}</span>
          </div>
        </div>

        {/* Hero Card with Profile & KPI Stats */}
        <div className="prog-hero-card prog-anim no-print" style={{
          background: 'var(--color-surface, #ffffff)',
          border: '1.5px solid var(--color-border, #e2e8f0)',
          borderRadius: isMobile ? '1rem' : '1.25rem',
          padding: isMobile ? '0.85rem 1rem' : '1.15rem 1.4rem',
          marginBottom: '1rem',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.35)' : '0 4px 20px rgba(100, 116, 139, 0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '0.75rem' : '1.25rem',
          flexWrap: 'wrap',
          boxSizing: 'border-box'
        }}>
          {/* Left: Avatar & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
            <div style={{
              width: isMobile ? 40 : 48,
              height: isMobile ? 40 : 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: isMobile ? '1rem' : '1.2rem',
              color: 'white',
              border: isDark ? '2.5px solid rgba(255,255,255,0.2)' : '2.5px solid #ffffff',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              flexShrink: 0
            }}>
              {currentUser.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{
                margin: 0,
                fontWeight: 900,
                fontSize: isMobile ? '1.05rem' : '1.25rem',
                color: 'var(--color-text, #0f172a)',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                Haftalık Ders Programım 📅
              </h1>
              <div style={{ fontSize: isMobile ? '0.72rem' : '0.78rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Merhaba <strong>{currentUser.name?.split(' ')[0]}</strong> 👋 · Kişisel Çalışma Takvimi
              </div>
            </div>
          </div>

          {/* Right: Modern Responsive KPI Grid */}
          <div className="prog-kpis" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: isMobile ? '0.5rem' : '0.75rem',
            width: isMobile ? '100%' : 'auto',
            minWidth: isMobile ? '100%' : 220
          }}>
            <div style={{
              background: 'var(--color-surface-hover, #f8fafc)',
              border: '1.5px solid var(--color-border, #e2e8f0)',
              borderRadius: isMobile ? '0.85rem' : '1rem',
              padding: isMobile ? '0.5rem 0.65rem' : '0.65rem 0.95rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minWidth: 0
            }}>
              <div style={{ fontWeight: 900, fontSize: isMobile ? '1.1rem' : '1.25rem', color: isDark ? '#818cf8' : '#4f46e5', lineHeight: 1 }}>
                %{weekPct}
              </div>
              <div style={{ fontSize: isMobile ? '0.66rem' : '0.7rem', color: 'var(--color-text, #1e293b)', fontWeight: 800, marginTop: 3, whiteSpace: 'nowrap' }}>
                Haftalık İlerleme
              </div>
              <div style={{ fontSize: isMobile ? '0.58rem' : '0.62rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap' }}>
                {doneItems} / {totalItems} Görev
              </div>
            </div>

            <div style={{
              background: 'var(--color-surface-hover, #f8fafc)',
              border: '1.5px solid var(--color-border, #e2e8f0)',
              borderRadius: isMobile ? '0.85rem' : '1rem',
              padding: isMobile ? '0.5rem 0.65rem' : '0.65rem 0.95rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minWidth: 0
            }}>
              <div style={{ fontWeight: 900, fontSize: isMobile ? '1.1rem' : '1.25rem', color: isDark ? '#34d399' : '#16a34a', lineHeight: 1 }}>
                {doneTopics}
              </div>
              <div style={{ fontSize: isMobile ? '0.66rem' : '0.7rem', color: 'var(--color-text, #1e293b)', fontWeight: 800, marginTop: 3, whiteSpace: 'nowrap' }}>
                Konu İlerleme
              </div>
              <div style={{ fontSize: isMobile ? '0.58rem' : '0.62rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap' }}>
                {totalTopics} Toplam Konu
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <ProgramCenter
            weeklyProgram={weeklyProgram}
            setWeeklyProgram={setWeeklyProgram}
            topicPool={topicPool}
            setTopicPool={setTopicPool}
            isDark={isDark}
          />
        </div>

        {/* Floating Save Button - Positioned safely above MobileBottomNav on mobile */}
        <div
          className="no-print"
          style={{
            position: 'fixed',
            bottom: isMobile ? 'calc(62px + env(safe-area-inset-bottom) + 10px)' : '1.5rem',
            right: isMobile ? '1rem' : '1.5rem',
            left: isMobile ? '1rem' : 'auto',
            zIndex: 60,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          <button
            onClick={handleSave}
            style={{
              pointerEvents: 'auto',
              width: isMobile ? '100%' : 'auto',
              maxWidth: isMobile ? 420 : 'none',
              padding: isMobile ? '0.75rem 1.25rem' : '0.85rem 1.6rem',
              background: saved ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: 'white',
              border: 'none',
              borderRadius: '1rem',
              fontWeight: 900,
              fontSize: isMobile ? '0.86rem' : '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.55rem',
              boxShadow: saved ? '0 8px 28px rgba(16,185,129,0.4)' : '0 8px 28px rgba(79,70,229,0.4)',
              transition: 'all 0.25s'
            }}
          >
            {saved ? <><CheckCircle2 size={18} /> Kaydedildi!</> : <><Save size={18} /> Değişiklikleri Kaydet</>}
          </button>
        </div>
      </div>
    </div>
  );
}