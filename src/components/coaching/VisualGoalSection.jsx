import React, { useState, useMemo } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useGoal } from '../../context/GoalContext';

function Progress({ value, max, color = '#7c3aed', label }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ marginTop: 6 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: 4 }}>
          <span>{label}</span>
          <span style={{ color }}>{pct}%</span>
        </div>
      )}
      <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function CoachingCard({ emoji, title, children }) {
  return (
    <div style={{ background: 'white', borderRadius: '1.25rem', border: '1.5px solid #e2e8f0', padding: '1.35rem', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.1rem', paddingBottom: '0.75rem', borderBottom: '1.5px solid #f8fafc' }}>
        <span style={{ fontSize: '1.1rem' }}>{emoji}</span>
        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function VisualGoalSection({ studentId }) {
  const { goals: allGoals, addGoal, deleteGoal, updateGoalProgress } = useGoal();
  const [periodFilter, setPeriodFilter] = useState('Tümü');
  const [typeFilter, setTypeFilter] = useState('Tümü');
  const [showModal, setShowModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: 'Soru', period: 'Günlük', target: 50 });
  const [quickAddAmounts, setQuickAddAmounts] = useState({});

  const studentGoals = useMemo(() => (allGoals || []).filter(g => String(g.studentId) === String(studentId)), [allGoals, studentId]);

  const filteredGoals = useMemo(() => {
    return studentGoals.filter(g => {
      const matchPeriod = periodFilter === 'Tümü' || g.period === periodFilter;
      const matchType = typeFilter === 'Tümü' || g.type === typeFilter;
      return matchPeriod && matchType;
    });
  }, [studentGoals, periodFilter, typeFilter]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (newGoal.title.trim() && newGoal.target > 0) {
      addGoal({ ...newGoal, title: newGoal.title.trim(), studentId });
      setShowModal(false);
      setNewGoal({ title: '', type: 'Soru', period: 'Günlük', target: 50 });
    }
  };

  const TYPE_CONFIG = {
    'Soru': { color: '#f43f5e', bg: '#fff1f2', border: '#fecdd3', text: '#e11d48', unit: 'Soru', step: 10 },
    'Sayfa': { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', unit: 'Sayfa', step: 5 },
    'Konu': { color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff', text: '#9333ea', unit: 'Konu', step: 1 },
    'Dakika': { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', text: '#059669', unit: 'Dk', step: 15 },
  };

  return (
    <CoachingCard emoji="📊" title={`Görsel Özel Hedef Takip Panosu (${studentGoals.length} hedef)`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 8, gap: 2 }}>
            {['Tümü', 'Günlük', 'Haftalık', 'Aylık'].map(p => (
              <button key={p} onClick={() => setPeriodFilter(p)} style={{ border: 'none', background: periodFilter === p ? '#4f46e5' : 'transparent', color: periodFilter === p ? 'white' : '#64748b', fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.55rem', borderRadius: 6, cursor: 'pointer' }}>
                {p}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 8, gap: 2 }}>
            {['Tümü', 'Soru', 'Sayfa', 'Konu', 'Dakika'].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} style={{ border: 'none', background: typeFilter === t ? '#e11d48' : 'transparent', color: typeFilter === t ? 'white' : '#64748b', fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.55rem', borderRadius: 6, cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setShowModal(true)} style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.45rem 0.85rem', fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={14} /> + Özel Hedef Ekle
        </button>
      </div>

      {filteredGoals.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontWeight: 700, fontSize: '0.84rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1.5px dashed #e2e8f0' }}>
          🎯 Henüz özel bir görsel hedef tanımlanmadı. Yukarıdaki butondan hemen ekleyebilirsin!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          {filteredGoals.map(goal => {
            const cfg = TYPE_CONFIG[goal.type] || TYPE_CONFIG['Soru'];
            const pct = Math.min(100, Math.round(((goal.current || 0) / (goal.target || 1)) * 100));
            const isDone = pct >= 100;
            const amt = quickAddAmounts[goal.id] || '';

            return (
              <div key={goal.id} style={{ background: isDone ? '#f0fdf4' : 'white', border: isDone ? '1.5px solid #86efac' : '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
                <button onClick={() => deleteGoal(goal.id)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
                  <Trash2 size={13} />
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, fontSize: '0.65rem', fontWeight: 900, padding: '0.15rem 0.45rem', borderRadius: 99, textTransform: 'uppercase' }}>
                    {goal.period} · {goal.type}
                  </span>
                  {isDone && <span style={{ background: '#10b981', color: 'white', fontSize: '0.62rem', fontWeight: 900, padding: '0.15rem 0.45rem', borderRadius: 99 }}>✓ Tamam!</span>}
                </div>

                <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.3 }}>{goal.title}</div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: 4 }}>
                    <span>Mevcut: <strong style={{ color: '#0f172a' }}>{goal.current || 0}</strong> / {goal.target} {cfg.unit}</span>
                    <span style={{ color: isDone ? '#10b981' : cfg.color }}>%{pct}</span>
                  </div>
                  <Progress value={goal.current || 0} max={goal.target} color={isDone ? '#10b981' : cfg.color} />
                </div>

                {!isDone && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button onClick={() => updateGoalProgress(goal.id, cfg.step)} style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, borderRadius: '0.5rem', padding: '0.3rem 0.6rem', fontWeight: 900, fontSize: '0.72rem', cursor: 'pointer', flexShrink: 0 }}>
                      +{cfg.step} {cfg.unit}
                    </button>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const num = Number(amt);
                      if (num > 0) {
                        updateGoalProgress(goal.id, num);
                        setQuickAddAmounts(p => ({ ...p, [goal.id]: '' }));
                      }
                    }} style={{ display: 'flex', gap: 4, flex: 1 }}>
                      <input type="number" min="1" placeholder={`+ ${cfg.unit}`} value={amt} onChange={e => setQuickAddAmounts(p => ({ ...p, [goal.id]: e.target.value }))} style={{ width: '100%', padding: '0.3rem 0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 700, outline: 'none' }} />
                      <button type="submit" style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.3rem 0.55rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}>Ekle</button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '1.25rem', padding: '1.25rem', width: '100%', maxWidth: 420, border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>🎯 Yeni Özel Görsel Hedef</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Hedef Başlığı</label>
                <input style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }} placeholder="Örn: Günlük 30 Paragraf Sorusu" value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Tür</label>
                  <select style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }} value={newGoal.type} onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))}>
                    <option value="Soru">🎯 Soru Çözme</option>
                    <option value="Sayfa">📖 Kitap Okuma</option>
                    <option value="Konu">🧠 Konu Tamamlama</option>
                    <option value="Dakika">⏱️ Çalışma Süresi (dk)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Periyot</label>
                  <select style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }} value={newGoal.period} onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))}>
                    <option value="Günlük">⚡ Günlük</option>
                    <option value="Haftalık">📅 Haftalık</option>
                    <option value="Aylık">🏆 Aylık</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Hedef Miktar</label>
                <input type="number" min="1" style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }} placeholder="Örn: 50" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: Number(e.target.value) }))} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '0.65rem', padding: '0.55rem 0.9rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>İptal</button>
                <button type="submit" style={{ background: '#e11d48', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.55rem 1rem', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer' }}>Hedefi Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CoachingCard>
  );
}
