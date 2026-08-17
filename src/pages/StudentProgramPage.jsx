import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, CheckCircle2, Calendar, ArrowLeft, Layers, Target, BookOpen, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
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
  const navigate = useNavigate();

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
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.28) 0%, transparent 50%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.22) 0%, transparent 50%), radial-gradient(ellipse at 50% 85%, rgba(14, 165, 233, 0.22) 0%, transparent 55%), linear-gradient(180deg, #0d1527 0%, #131f3b 35%, #1a274d 70%, #101a33 100%)', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: '#f8fafc', padding: '1.25rem 1rem', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .prog-anim { animation: fadeIn 0.3s ease both; }
        @media (max-width: 640px) {
          .prog-hero-card {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 1rem !important;
            gap: 0.9rem !important;
          }
          .prog-kpis {
            width: 100% !important;
            min-width: 100% !important;
          }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '100%', margin: 0 }}>
        {/* Top Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/student')}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1.5px solid rgba(255,255,255,0.18)',
              borderRadius: '0.75rem',
              padding: '0.5rem 0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 800,
              fontSize: '0.82rem',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s'
            }}
          >
            <ArrowLeft size={16} /> Öğrenci Paneli
          </button>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(165,180,252,0.3)',
            padding: '0.35rem 0.75rem',
            borderRadius: '99px',
            fontSize: '0.75rem',
            fontWeight: 800,
            color: '#c7d2fe'
          }}>
            <Calendar size={14} color="#818cf8" />
            <span>{weekRange}</span>
          </div>
        </div>

        {/* Hero Card with Profile & KPI Stats */}
        <div className="prog-hero-card prog-anim" style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '1.25rem',
          padding: '1.1rem 1.35rem',
          marginBottom: '1.25rem',
          boxShadow: '0 10px 32px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          flexWrap: 'wrap'
        }}>
          {/* Left: Avatar & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 200, flex: 1 }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.2rem',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.4)',
              boxShadow: '0 0 20px rgba(168,85,247,0.45)',
              flexShrink: 0
            }}>
              {currentUser.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontWeight: 900,
                fontSize: '1.25rem',
                color: '#ffffff',
                lineHeight: 1.25,
                textShadow: '0 2px 10px rgba(0,0,0,0.35)'
              }}>
                Haftalık Ders Programım 📅
              </h1>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginTop: 3 }}>
                Merhaba <strong>{currentUser.name?.split(' ')[0]}</strong> 👋 · Kişisel Çalışma Takvimi
              </div>
            </div>
          </div>

          {/* Right: Modern Responsive KPI Grid */}
          <div className="prog-kpis" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
            minWidth: 220
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1.5px solid rgba(129, 140, 248, 0.35)',
              borderRadius: '1rem',
              padding: '0.65rem 0.9rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#818cf8', lineHeight: 1 }}>
                %{weekPct}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', fontWeight: 800, marginTop: 4 }}>
                Haftalık İlerleme
              </div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 2 }}>
                {doneItems} / {totalItems} Görev
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1.5px solid rgba(52, 211, 153, 0.35)',
              borderRadius: '1rem',
              padding: '0.65rem 0.9rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#34d399', lineHeight: 1 }}>
                {doneTopics}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', fontWeight: 800, marginTop: 4 }}>
                Konu İlerleme
              </div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 2 }}>
                {totalTopics} Toplam Konu
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ paddingBottom: 100 }}>
          <ProgramCenter
            weeklyProgram={weeklyProgram}
            setWeeklyProgram={setWeeklyProgram}
            topicPool={topicPool}
            setTopicPool={setTopicPool}
            isDark={true}
          />
        </div>

        {/* Floating Save */}
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 200 }}>
          <button onClick={handleSave}
            style={{ padding: '0.85rem 1.6rem', background: saved ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: '1rem', fontWeight: 900, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.55rem', boxShadow: saved ? '0 8px 28px rgba(16,185,129,0.45)' : '0 8px 28px rgba(99,102,241,0.45)', transition: 'all 0.25s', backdropFilter: 'blur(10px)' }}>
            {saved ? <><CheckCircle2 size={20} /> Kaydedildi!</> : <><Save size={20} /> Değişiklikleri Kaydet</>}
          </button>
        </div>
      </div>
    </div>
  );
}