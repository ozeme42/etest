import React, { useState, useMemo, useEffect } from 'react';
import { Save, CheckCircle2, Calendar, Layers } from 'lucide-react';
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
    <div style={{ minHeight: '100vh', background: '#f5f6fa', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#6366f1 50%,#7c3aed 100%)', padding: 'clamp(1rem,4vw,1.75rem) clamp(1rem,4vw,2rem)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 24px rgba(79,70,229,0.25)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', color: 'white', border: '2px solid rgba(255,255,255,0.35)', flexShrink: 0 }}>
              {currentUser.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 'clamp(0.95rem,2.5vw,1.15rem)', color: 'white' }}>Merhaba, {currentUser.name?.split(' ')[0]} 👋</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginTop: 1 }}>📅 {weekRange}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Haftalık', value: `%${weekPct}`, sub: `${doneItems}/${totalItems}` },
              { label: 'Konu',     value: doneTopics,    sub: `${totalTopics} toplam` },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: '0.75rem', padding: '0.5rem 0.9rem', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center', minWidth: 72 }}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'white' }}>{s.value}</div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(1rem,3vw,1.75rem) clamp(1rem,4vw,2rem)', paddingBottom: 100 }}>
        <ProgramCenter
          weeklyProgram={weeklyProgram}
          setWeeklyProgram={setWeeklyProgram}
          topicPool={topicPool}
          setTopicPool={setTopicPool}
        />
      </div>

      {/* Floating Save */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 200 }}>
        <button onClick={handleSave}
          style={{ padding: '0.8rem 1.5rem', background: saved ? '#16a34a' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', borderRadius: '1rem', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: saved ? '0 8px 24px rgba(22,163,74,0.4)' : '0 8px 24px rgba(99,102,241,0.4)', transition: 'all 0.25s', fontFamily: 'inherit' }}>
          {saved ? <><CheckCircle2 size={18} /> Kaydedildi!</> : <><Save size={18} /> Kaydet</>}
        </button>
      </div>
    </div>
  );
}