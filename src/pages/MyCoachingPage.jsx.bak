import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, Save, Plus, Trash2, Check, ChevronDown, ChevronRight,
  Star, BookOpen, Calendar, Flame, Moon, Dumbbell,
  TrendingUp, Zap, CheckCircle2, Award, Clock,
  AlertTriangle, Smile, Gift, Activity, BarChart3,
  GraduationCap, User, Layers, ClipboardList, MessageSquare,
  FileText, ArrowLeft, Sparkles, Trophy, Heart, Eye, AlertCircle, X, RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useGoal } from '../context/GoalContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* ÔöÇÔöÇÔöÇ Helpers ÔöÇÔöÇÔöÇ */
const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const DAYS = ['Pzt', 'Sal', '├çr┼ş', 'Pr┼ş', 'Cum', 'Cts', 'Paz'];
const DAY_LONG = { 'Pzt': 'Pazartesi', 'Sal': 'Sal─▒', '├çr┼ş': '├çar┼şamba', 'Pr┼ş': 'Per┼şembe', 'Cum': 'Cuma', 'Cts': 'Cumartesi', 'Paz': 'Pazar' };
const SUBJECTS = ['T├╝rk├ğe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', '─░ngilizce', 'Genel Tekrar', 'Soru ├ç├Âz├╝m├╝', 'Deneme S─▒nav─▒', 'Paragraf / Problem'];
const TOPIC_STATUSES = ['Ba┼şlanmad─▒', 'Ba┼şland─▒', '├û─şrenildi', 'Tekrar Yap─▒ld─▒', 'Tamamland─▒'];
const STATUS_COLOR = { 'Ba┼şlanmad─▒': '#94a3b8', 'Ba┼şland─▒': '#f59e0b', '├û─şrenildi': '#3b82f6', 'Tekrar Yap─▒ld─▒': '#f97316', 'Tamamland─▒': '#10b981' };

const MOTIVATION_QUOTES = [
  { quote: "Ba┼şar─▒, her g├╝n tekrarlanan k├╝├ğ├╝k ├ğabalar─▒n toplam─▒d─▒r.", author: "Robert Collier", category: "Disiplin" },
  { quote: "Gelecek, bug├╝n ne yapt─▒─ş─▒na ba─şl─▒d─▒r. Yar─▒n de─şil, tam da ┼şimdi!", author: "Mahatma Gandhi", category: "Eylem" },
  { quote: "Zirveye t─▒rmanmak yorucudur ama oradaki manzara her ┼şeye de─şer.", author: "Anonim", category: "Zafer" },
  { quote: "Disiplin, ne istedi─şin ile en ├ğok ne istedi─şin aras─▒ndaki se├ğimdir.", author: "Abraham Lincoln", category: "Odak" },
  { quote: "Zafer, 'vazge├ğmeyenlerindir'. Yapabilece─şinin en iyisini yap!", author: "Mustafa Kemal Atat├╝rk", category: "─░nan├ğ" },
  { quote: "Zorluklar, ba┼şar─▒n─▒n de─şerini art─▒ran s├╝slerdir.", author: "Moli├¿re", category: "M├╝cadele" },
  { quote: "B├╝y├╝k i┼şler, bir anda de─şil, k├╝├ğ├╝k ┼şeylerin bir araya getirilmesiyle yap─▒l─▒r.", author: "Vincent van Gogh", category: "Disiplin" },
  { quote: "S─▒n─▒rlar─▒n─▒ zorlamayan biri, potansiyelinin ne oldu─şunu asla ├Â─şrenemez.", author: "Kobe Bryant", category: "├ûzg├╝ven" },
  { quote: "Ter d├Âk├╝lmeyen zafer, zafer de─şildir.", author: "Anonim", category: "Disiplin" },
  { quote: "┼Şans, haz─▒rl─▒kl─▒ zihinleri sever.", author: "Louis Pasteur", category: "Zeka" },
  { quote: "Yorulabilirsin, ama vazge├ğemezsin. Zirve seni bekliyor!", author: "Ko├ğluk Mottosu", category: "─░nan├ğ" },
  { quote: "R├╝yalar─▒n─▒z─▒ ger├ğekle┼ştirmenin en iyi yolu uyanmakt─▒r.", author: "Paul Val├®ry", category: "Eylem" },
  { quote: "Hata yapmaktan korkmay─▒n; hi├ğ denememi┼ş olmaktan korkun.", author: "Albert Einstein", category: "├ûzg├╝ven" },
  { quote: "R├╝zgar ne kadar sert eserse esin, sa─şlam a─şa├ğ k├Âklerinden kopmaz.", author: "Konf├╝├ğy├╝s", category: "M├╝cadele" },
  { quote: "Hedefine odaklan, g├╝r├╝lt├╝y├╝ kapat ve sadece i┼şini yap!", author: "Anonim", category: "Odak" },
  { quote: "S─▒nav─▒ kazand─▒ran zeka de─şil, b─▒kmadan g├Âsterilen s├╝rekliliktir.", author: "YKS / LGS Derece Mottosu", category: "Disiplin" }
];

export function getCurrentWeekKey() {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

export const normalizeWeeklyProgram = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DAYS.map(d => ({ day: d, items: [] }));
  }

  return DAYS.map(d => {
    const found = raw.find(r => r.day === d);
    if (!found) return { day: d, items: [] };

    if (Array.isArray(found.items)) {
      return { day: d, items: found.items };
    }

    const legacyItems = [];
    if (found.lessons || found.hours) {
      legacyItems.push({
        id: `legacy_${d}_1`,
        subject: found.lessons || 'Ders ├çal─▒┼şmas─▒',
        topic: '',
        hours: found.hours || '',
        isRecurring: true,
        done: !!found.done
      });
    }
    return { day: d, items: legacyItems };
  });
};

export const processWeeklyProgramWeekChange = (rawProgram, savedWeekKey) => {
  const currentWeek = getCurrentWeekKey();
  let normalized = normalizeWeeklyProgram(rawProgram);

  if (savedWeekKey && savedWeekKey !== currentWeek) {
    normalized = normalized.map(dayObj => ({
      ...dayObj,
      items: (dayObj.items || []).map(item => {
        const isRec = item.isRecurring !== false;
        if (isRec) {
          return { ...item, done: false }; // Reset tick for new week
        }
        // Non-recurring items: un-ticked items remain un-ticked in list
        return item;
      })
    }));
  }
  return normalized;
};

/* ÔöÇÔöÇÔöÇ Styles ÔöÇÔöÇÔöÇ */
const inp = { width: '100%', padding: '0.6rem 0.85rem', borderRadius: '0.7rem', border: '1.5px solid #e2e8f0', fontSize: '0.84rem', outline: 'none', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', fontFamily: 'inherit', boxSizing: 'border-box' };
const ta = { ...inp, minHeight: 72, resize: 'vertical', lineHeight: 1.6 };
const lbl = { fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' };

/* ÔöÇÔöÇÔöÇ Small components ÔöÇÔöÇÔöÇ */
function TabBtn({ id, active, label, onClick }) {
  return (
    <button onClick={() => onClick(id)} style={{
      padding: '0.55rem 0.9rem', border: active ? '2px solid #e2e8f0' : '2px solid transparent',
      borderBottom: active ? '2px solid white' : '2px solid transparent',
      borderRadius: '0.7rem 0.7rem 0 0', background: active ? 'white' : 'transparent',
      color: active ? '#7c3aed' : '#64748b', fontWeight: active ? 900 : 600,
      fontSize: '0.74rem', cursor: 'pointer', whiteSpace: 'nowrap',
      marginBottom: active ? -2 : 0, transition: 'all 0.15s'
    }}>{label}</button>
  );
}

function Card({ emoji, title, children, color = '#7c3aed' }) {
  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.8)', padding: '1.35rem', boxShadow: '0 10px 30px -10px rgba(30,41,59,0.06)', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.1rem', paddingBottom: '0.75rem', borderBottom: '2px solid #f8fafc' }}>
        <span style={{ fontSize: '1.1rem' }}>{emoji}</span>
        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Tip({ children }) {
  return <div style={{ background: '#f0f4ff', border: '1.5px solid #c7d2fe', borderRadius: '0.75rem', padding: '0.7rem 0.9rem', fontSize: '0.8rem', color: '#3730a3', fontWeight: 700, marginBottom: '1rem' }}>­şÆí {children}</div>;
}

function CheckItem({ label, checked, onChange, onDelete }) {
  return (
    <div onClick={onChange} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.8rem', background: checked ? '#f0fdf4' : '#f8fafc', borderRadius: '0.65rem', border: checked ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0', cursor: 'pointer', marginBottom: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 20, height: 20, borderRadius: 5, background: checked ? '#16a34a' : 'white', border: checked ? 'none' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {checked && <Check size={13} color="white" strokeWidth={3} />}
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.84rem', color: checked ? '#166534' : '#374151', textDecoration: checked ? 'line-through' : 'none' }}>{label}</span>
      </div>
      {onDelete && <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: 2 }}><Trash2 size={13} /></button>}
    </div>
  );
}

function AddInput({ value, onChange, onAdd, placeholder, color = '#7c3aed' }) {
  return (
    <form onSubmit={e => { e.preventDefault(); onAdd(); }} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      <input style={{ ...inp, flex: 1 }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      <button type="submit" style={{ background: color, color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.5rem 0.85rem', fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}><Plus size={15} /></button>
    </form>
  );
}

function Progress({ value, max, color = '#7c3aed', label }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ marginTop: 6 }}>
      {label && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: 4 }}>
        <span>{label}</span><span style={{ color }}>{pct}%</span>
      </div>}
      <div style={{ height: 10, background: 'rgba(255, 255, 255, 0.6)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

/* ÔöÇÔöÇÔöÇ G├Ârsel ├ûzel Hedef Takip Panosu Component ÔöÇÔöÇÔöÇ */
function VisualGoalSection({ studentId }) {
  const { goals: allGoals, addGoal, deleteGoal, updateGoalProgress } = useGoal();
  const [periodFilter, setPeriodFilter] = useState('T├╝m├╝');
  const [typeFilter, setTypeFilter] = useState('T├╝m├╝');
  const [showModal, setShowModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: 'Soru', period: 'G├╝nl├╝k', target: 50 });
  const [quickAddAmounts, setQuickAddAmounts] = useState({});

  const studentGoals = useMemo(() => (allGoals || []).filter(g => String(g.studentId) === String(studentId)), [allGoals, studentId]);

  const filteredGoals = useMemo(() => {
    return studentGoals.filter(g => {
      const matchPeriod = periodFilter === 'T├╝m├╝' || g.period === periodFilter;
      const matchType = typeFilter === 'T├╝m├╝' || g.type === typeFilter;
      return matchPeriod && matchType;
    });
  }, [studentGoals, periodFilter, typeFilter]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (newGoal.title.trim() && newGoal.target > 0) {
      addGoal({ ...newGoal, title: newGoal.title.trim(), studentId });
      setShowModal(false);
      setNewGoal({ title: '', type: 'Soru', period: 'G├╝nl├╝k', target: 50 });
    }
  };

  const TYPE_CONFIG = {
    'Soru': { color: '#f43f5e', bg: '#fff1f2', border: '#fecdd3', text: '#e11d48', unit: 'Soru', step: 10 },
    'Sayfa': { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', unit: 'Sayfa', step: 5 },
    'Konu': { color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff', text: '#9333ea', unit: 'Konu', step: 1 },
    'Dakika': { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', text: '#059669', unit: 'Dk', step: 15 },
  };

  return (
    <Card emoji="­şôè" title={`G├Ârsel ├ûzel Hedef Takip Panosu (${studentGoals.length} hedef)`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.6)', padding: 3, borderRadius: 8, gap: 2 }}>
            {['T├╝m├╝', 'G├╝nl├╝k', 'Haftal─▒k', 'Ayl─▒k'].map(p => (
              <button key={p} onClick={() => setPeriodFilter(p)} style={{ border: 'none', background: periodFilter === p ? '#4f46e5' : 'transparent', color: periodFilter === p ? 'white' : '#64748b', fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.55rem', borderRadius: 6, cursor: 'pointer' }}>
                {p}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.6)', padding: 3, borderRadius: 8, gap: 2 }}>
            {['T├╝m├╝', 'Soru', 'Sayfa', 'Konu', 'Dakika'].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} style={{ border: 'none', background: typeFilter === t ? '#e11d48' : 'transparent', color: typeFilter === t ? 'white' : '#64748b', fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.55rem', borderRadius: 6, cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setShowModal(true)} style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.45rem 0.85rem', fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={14} /> + ├ûzel Hedef Ekle
        </button>
      </div>

      {filteredGoals.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontWeight: 700, fontSize: '0.84rem', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '0.75rem', border: '1.5px dashed #e2e8f0' }}>
          ­şÄ» Hen├╝z ├Âzel bir g├Ârsel hedef tan─▒mlanmad─▒. Yukar─▒daki butondan hemen ekleyebilirsin!
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
                    {goal.period} ┬À {goal.type}
                  </span>
                  {isDone && <span style={{ background: '#10b981', color: 'white', fontSize: '0.62rem', fontWeight: 900, padding: '0.15rem 0.45rem', borderRadius: 99 }}>Ô£ô Tamam!</span>}
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
          <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '1.25rem', padding: '1.25rem', width: '100%', maxWidth: 420, border: '1px solid rgba(255,255,255,1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>­şÄ» Yeni ├ûzel G├Ârsel Hedef</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Hedef Ba┼şl─▒─ş─▒</label>
                <input style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }} placeholder="├ûrn: G├╝nl├╝k 30 Paragraf Sorusu" value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>T├╝r</label>
                  <select style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }} value={newGoal.type} onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))}>
                    <option value="Soru">­şÄ» Soru ├ç├Âzme</option>
                    <option value="Sayfa">­şôû Kitap Okuma</option>
                    <option value="Konu">­şğá Konu Tamamlama</option>
                    <option value="Dakika">ÔÅ▒´©Å ├çal─▒┼şma S├╝resi (dk)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Periyot</label>
                  <select style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }} value={newGoal.period} onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))}>
                    <option value="G├╝nl├╝k">ÔÜí G├╝nl├╝k</option>
                    <option value="Haftal─▒k">­şôà Haftal─▒k</option>
                    <option value="Ayl─▒k">­şÅå Ayl─▒k</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Hedef Miktar</label>
                <input type="number" min="1" style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }} placeholder="├ûrn: 50" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: Number(e.target.value) }))} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'rgba(255, 255, 255, 0.6)', color: '#64748b', border: 'none', borderRadius: '0.65rem', padding: '0.55rem 0.9rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>─░ptal</button>
                <button type="submit" style={{ background: '#e11d48', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.55rem 1rem', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer' }}>Hedefi Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
   ANA SAYFA
ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */
export default function MyCoachingPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    getCoachingProfileForStudent, saveCoachingProfile, coachingProfiles,
    isStudentCoached, getMockExamsForStudent, addMockExam, deleteMockExam
  } = useCoaching();
  const { submissions, deleteSubmission } = useEvaluation();
  const { homeworks = [] } = useHomework() || {};
  const { data: curriculumData = [] } = useCurriculum() || {};
  const { books = [], bookTests = [] } = useTrackedBooks() || {};

  const studentId = currentUser?.id;
  const isCoached = useMemo(() => {
    if (!studentId) return false;
    // Teacher or admin can view any profile, student can only view if coached
    if (currentUser?.role === 'teacher' || currentUser?.role === 'admin') return true;
    return isStudentCoached(studentId);
  }, [studentId, currentUser?.role, isStudentCoached]);

  const existingProfile = useMemo(() => getCoachingProfileForStudent(studentId) || {}, [studentId, coachingProfiles]);

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('hedefler');
  const [expandedExams, setExpandedExams] = useState({});
  const [chartMetric, setChartMetric] = useState('Toplam Net');

  const toggleExamExpand = (id) => {
    setExpandedExams(prev => ({ ...prev, [id]: !prev[id] }));
  };

  /* ÔöÇÔöÇ Hedeflerim ÔöÇÔöÇ */
  const [goals, setGoals] = useState({
    examGoalType: 'LGS 2026', customExamName: '', targetSchool: '', targetScore: '', targetNet: '',
    gradeClass: '', gradeTerm: '1', gradeTarget: 'Tak├ğek',
    monthlyGoals: [], weeklyGoals: [], dailyGoals: [], customGoals: [],
    counterGoals: [
      { id: '1', title: 'G├╝nl├╝k Soru ├ç├Âzme', period: 'G├╝nl├╝k', target: 50, current: 0, unit: 'Soru' },
      { id: '2', title: 'Haftal─▒k Soru ├ç├Âzme', period: 'Haftal─▒k', target: 350, current: 0, unit: 'Soru' },
      { id: '3', title: 'Ayl─▒k Kitap Okuma', period: 'Ayl─▒k', target: 200, current: 0, unit: 'Sayfa' }
    ]
  });
  const [addKind, setAddKind] = useState('gorev'); // 'gorev' | 'sayisal'
  const [goalTabMode, setGoalTabMode] = useState('sayisal'); // 'sayisal' | 'gorev'
  const [showAddCounterForm, setShowAddCounterForm] = useState(false);
  const [newCounterTitle, setNewCounterTitle] = useState('');
  const [newCounterPeriod, setNewCounterPeriod] = useState('Haftal─▒k');
  const [newCounterTarget, setNewCounterTarget] = useState('');
  const [newCounterUnit, setNewCounterUnit] = useState('Soru');
  const [customAddInputs, setCustomAddInputs] = useState({});

  const [newGoalType, setNewGoalType] = useState('G├╝nl├╝k'); // 'G├╝nl├╝k' | 'Haftal─▒k' | 'Ayl─▒k' | '├ûzel'
  const [newGoalCategory, setNewGoalCategory] = useState('');
  const [newGoalText, setNewGoalText] = useState('');
  const [groupAddInputs, setGroupAddInputs] = useState({});
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    birthDate: '',
    gender: '',
    gradeClass: '',
    schoolName: '',
    fieldBranch: 'Say─▒sal',
    studentPhone: '',
    parentName: '',
    parentRelation: 'Anne',
    parentPhone: '',
    parentJob: '',
    cityAddress: '',
    learningStyle: 'G├Ârsel',
    strongSubjects: '',
    weakSubjects: '',
    sleepHours: '8',
    bestStudyTime: 'Sabah',
    hobbies: '',
    studyChallenges: [],
    healthNotes: '',
    coachNotes: ''
  });
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [selectedQuoteCategory, setSelectedQuoteCategory] = useState('T├╝m├╝');
  const [dailyQuestDone, setDailyQuestDone] = useState(() => {
    return localStorage.getItem('dailyQuestDone_' + today()) === 'true';
  });

  const handleGroupProgressSubmit = (unitKey, amountVal) => {
    const amount = parseFloat(amountVal) || 0;
    if (amount <= 0) return;

    setGoals(prev => {
      const list = prev.counterGoals || [];
      const updatedList = list.map(g => {
        const gUnit = (g.unit || 'Soru').trim().toLowerCase();
        if (gUnit === unitKey.trim().toLowerCase()) {
          return { ...g, current: Math.max(0, (g.current || 0) + amount) };
        }
        return g;
      });
      return { ...prev, counterGoals: updatedList };
    });

    setGroupAddInputs(p => ({ ...p, [unitKey]: '' }));
  };

  const groupedCounterGoals = useMemo(() => {
    const groups = {};
    (goals.counterGoals || []).forEach(g => {
      const unitKey = (g.unit || 'Soru').trim();
      if (!groups[unitKey]) groups[unitKey] = [];
      groups[unitKey].push(g);
    });
    return groups;
  }, [goals.counterGoals]);

  const handleAddCounterProgress = (goalId, amountVal) => {
    const amount = parseFloat(amountVal) || 0;
    if (amount <= 0) return;

    setGoals(prev => {
      const list = prev.counterGoals || [];
      const targetGoal = list.find(g => g.id === goalId);
      if (!targetGoal) return prev;

      const targetUnit = (targetGoal.unit || 'Soru').toLowerCase().trim();
      const targetPeriod = targetGoal.period;

      const updatedList = list.map(g => {
        const gUnit = (g.unit || 'Soru').toLowerCase().trim();

        // 1) Target goal itself
        if (g.id === goalId) {
          return { ...g, current: Math.max(0, (g.current || 0) + amount) };
        }

        // 2) G├╝nl├╝─şe eklenen miktar Haftal─▒k ve Ayl─▒k e┼şle┼şen birimdeki hedeflere de otomatik eklenir
        if (targetPeriod === 'G├╝nl├╝k' && (g.period === 'Haftal─▒k' || g.period === 'Ayl─▒k') && gUnit === targetUnit) {
          return { ...g, current: Math.max(0, (g.current || 0) + amount) };
        }

        // 3) Haftal─▒─şa eklenen miktar Ayl─▒k e┼şle┼şen hedeflere de otomatik eklenir
        if (targetPeriod === 'Haftal─▒k' && g.period === 'Ayl─▒k' && gUnit === targetUnit) {
          return { ...g, current: Math.max(0, (g.current || 0) + amount) };
        }

        return g;
      });

      return { ...prev, counterGoals: updatedList };
    });

    setCustomAddInputs(p => ({ ...p, [goalId]: '' }));
  };

  const handleCreateCounterGoal = (e, periodOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newCounterTitle.trim() || !newCounterTarget || parseFloat(newCounterTarget) <= 0) return;
    const newItem = {
      id: uid(),
      title: newCounterTitle.trim(),
      period: periodOverride || newCounterPeriod || newGoalType || 'G├╝nl├╝k',
      target: parseFloat(newCounterTarget),
      current: 0,
      unit: newCounterUnit.trim() || 'Adet'
    };
    setGoals(prev => ({
      ...prev,
      counterGoals: [...(prev.counterGoals || []), newItem]
    }));
    setNewCounterTitle('');
    setNewCounterTarget('');
  };

  const handleDeleteCounterGoal = (goalId) => {
    setGoals(prev => ({
      ...prev,
      counterGoals: (prev.counterGoals || []).filter(g => g.id !== goalId)
    }));
  };

  const handleResetSingleCounterGoal = (goalId) => {
    setGoals(prev => ({
      ...prev,
      counterGoals: (prev.counterGoals || []).map(g => g.id === goalId ? { ...g, current: 0 } : g)
    }));
  };

  const handleAddUnifiedGoal = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newGoalText.trim()) return;
    const text = newGoalText.trim();
    const item = { id: uid(), text, done: false, period: newGoalType, category: newGoalType === '├ûzel' ? (newGoalCategory.trim() || '├ûzel') : newGoalType };

    if (newGoalType === 'G├╝nl├╝k') {
      setGoals(p => ({ ...p, dailyGoals: [...(p.dailyGoals || []), item] }));
    } else if (newGoalType === 'Haftal─▒k') {
      setGoals(p => ({ ...p, weeklyGoals: [...(p.weeklyGoals || []), item] }));
    } else if (newGoalType === 'Ayl─▒k') {
      setGoals(p => ({ ...p, monthlyGoals: [...(p.monthlyGoals || []), item] }));
    } else {
      setGoals(p => ({ ...p, customGoals: [...(p.customGoals || []), item] }));
    }

    setNewGoalText('');
    setNewGoalCategory('');
  };

  /* ÔöÇÔöÇ Haftal─▒k Program (Multi-item per day) ÔöÇÔöÇ */
  const [weeklyProgram, setWeeklyProgram] = useState(DAYS.map(d => ({ day: d, items: [] })));
  const [newScheduleInputs, setNewScheduleInputs] = useState(
    DAYS.reduce((acc, d) => ({ ...acc, [d]: { subject: SUBJECTS[0], topic: '', hours: '', isRecurring: true } }), {})
  );

  /* ÔöÇÔöÇ G├╝nl├╝k Takip ÔöÇÔöÇ */
  const [dailyLogs, setDailyLogs] = useState([]);
  const [newLog, setNewLog] = useState({ date: today(), studyHours: '', questions: '', revision: '', sport: false, sleepTime: '' });

  /* ÔöÇÔöÇ Manuel Deneme Giri┼şi (Modal & D/Y/B/Net) ÔöÇÔöÇ */
  const [showMockModal, setShowMockModal] = useState(false);
  const [newManualMock, setNewManualMock] = useState({
    title: '', date: today(),
    subjects: {
      'T├╝rk├ğe': { d: '', y: '', b: '', net: '' },
      'Matematik': { d: '', y: '', b: '', net: '' },
      'Fen Bilimleri': { d: '', y: '', b: '', net: '' },
      'Sosyal Bilgiler': { d: '', y: '', b: '', net: '' },
      '─░ngilizce': { d: '', y: '', b: '', net: '' },
    }
  });
  const [newSubjectName, setNewSubjectName] = useState('');

  /* ÔöÇÔöÇ Konu Takip ÔöÇÔöÇ */
  const [topicList, setTopicList] = useState([]);
  const [newTopic, setNewTopic] = useState({ subject: SUBJECTS[0], topic: '', status: 'Ba┼şlanmad─▒' });

  /* ÔöÇÔöÇ Soru Takip ÔöÇÔöÇ */
  const [questionTrack, setQuestionTrack] = useState({ dailyGoal: '50', solved: '' });

  /* ÔöÇÔöÇ Hata Defteri ÔöÇÔöÇ */
  const [errors, setErrors] = useState([]);
  const [newError, setNewError] = useState({ subject: SUBJECTS[0], topic: '', reason: '', correct: '', retakeDate: today() });

  /* ÔöÇÔöÇ Motivasyon ÔöÇÔöÇ */
  const [motivation, setMotivation] = useState({ weekQuote: '', achievements: '', selfNote: '', rewardSystem: '' });

  /* ÔöÇÔöÇ Al─▒┼şkanl─▒klar ÔöÇÔöÇ */
  const [habits, setHabits] = useState([
    { id: uid(), label: 'Erken Kalkt─▒m', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Plan Yapt─▒m', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Kitap Okudum', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Spor Yapt─▒m', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Telefon < 2 Saat', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
  ]);
  const [newHabit, setNewHabit] = useState('');
  const [selectedMonthlyHabit, setSelectedMonthlyHabit] = useState(null);
  const [isEditingLongTermGoal, setIsEditingLongTermGoal] = useState(false);

  /* ÔöÇÔöÇ Okul Yaz─▒l─▒ Notlar─▒ ÔöÇÔöÇ */
  const [schoolGrades, setSchoolGrades] = useState([]);
  const [gradeTemplateMode, setGradeTemplateMode] = useState('ortaokul'); // 'ortaokul' | 'lise'
  const [customSubjects, setCustomSubjects] = useState([]);
  const [newCustomSubjectInput, setNewCustomSubjectInput] = useState('');

  const SCHOOL_LEVEL_TEMPLATES = {
    ortaokul: {
      name: '­şÅ½ Ortaokul ┼Şablonu (5, 6, 7, 8. S─▒n─▒f)',
      subjects: ['T├╝rk├ğe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler / ─░nk─▒lap Tarihi', '─░ngilizce', 'Din K├╝lt├╝r├╝']
    },
    lise: {
      name: '­şÅø´©Å Lise ┼Şablonu (9, 10, 11, 12. S─▒n─▒f)',
      subjects: ['T├╝rk Dili ve Edebiyat─▒', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Co─şrafya', '─░ngilizce', 'Felsefe', 'Din K├╝lt├╝r├╝']
    }
  };

  const EXAM_TERMS = ['1. D├Ânem 1. Yaz─▒l─▒', '1. D├Ânem 2. Yaz─▒l─▒', '2. D├Ânem 1. Yaz─▒l─▒', '2. D├Ânem 2. Yaz─▒l─▒'];

  const handleGradeInputChange = (subject, examName, value) => {
    const valStr = String(value).trim();
    setSchoolGrades(prev => {
      const filtered = prev.filter(g => !(g.subject === subject && g.examName === examName));
      if (valStr === '' || isNaN(valStr)) return filtered;
      const score = Math.min(100, Math.max(0, parseFloat(valStr)));
      return [...filtered, { id: uid(), subject, examName, score, date: today() }];
    });
  };

  const addCustomSubject = () => {
    if (!newCustomSubjectInput.trim()) return;
    const name = newCustomSubjectInput.trim();
    if (!customSubjects.includes(name)) {
      setCustomSubjects(prev => [...prev, name]);
    }
    setNewCustomSubjectInput('');
  };

  const deleteCustomSubject = (subjectName) => {
    setCustomSubjects(prev => prev.filter(s => s !== subjectName));
    setSchoolGrades(prev => prev.filter(g => g.subject !== subjectName));
  };

  /* ÔöÇÔöÇ Konu Havuzu ÔöÇÔöÇ */
  const [topicPool, setTopicPool] = useState([]);
  const [newPoolSubject, setNewPoolSubject] = useState({ name: '', color: '#7c3aed' });
  const [newPoolTopics, setNewPoolTopics] = useState({});
  const [bulkTopicInput, setBulkTopicInput] = useState({});
  const [showBulkInput, setShowBulkInput] = useState({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedPoolSubjects, setExpandedPoolSubjects] = useState({});

  /* ÔöÇÔöÇ Konu & Program Merkezi State ÔöÇÔöÇ */
  const [hubSearch, setHubSearch] = useState('');
  const [hubFilter, setHubFilter] = useState('all'); // all, baslanmadi, devamediyor, bitti, unassigned
  const [assigningTopicKey, setAssigningTopicKey] = useState(null);
  const [assignDay, setAssignDay] = useState('Pzt');
  const [assignHours, setAssignHours] = useState('1 sa');
  const [assignType, setAssignType] = useState('Konu ├çal─▒┼şmas─▒');
  const [hideDoneInProgram, setHideDoneInProgram] = useState(true);

  const POOL_COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2','#db2777','#0f766e'];

  const TOPIC_TEMPLATES = {
    'LGS': [
      { name: 'T├╝rk├ğe', color: '#d97706', topics: ['S├Âzc├╝kte Anlam','C├╝mlede Anlam','S├Âz Varl─▒─ş─▒','Yap─▒sal Anlam','Yaz─▒m Kurallar─▒','Noktalama ─░┼şaretleri','Fiil','─░sim Soylu Fiiller','S─▒fat','Zarf','Zamir','Ba─şla├ğ','Edatlar','├£nl├╝ Uyumlar─▒','Paragraf','Anlat─▒m Bi├ğimleri','Metin T├╝rleri'] },
      { name: 'Matematik', color: '#2563eb', topics: ['Do─şal Say─▒lar','B├Âlme-Kalan','OBEB-OKEK','Kesirler','Ondal─▒k Say─▒lar','Y├╝zde','Oran-Orant─▒','Denklemler','E┼şitsizlikler','├£slular','K├Âkl├╝ Say─▒lar','Veri Analizi','Olas─▒l─▒k','Geometri Temelleri','├£├ğgenler','D├Ârtgenler','Daireler','Dik ├£├ğgen','Prizmalar'] },
      { name: 'Fen Bilimleri', color: '#059669', topics: ['H├╝creler','Biyolojik ├çe┼şitlilik','Kuvvet ve Hareket','Madde ve Atomun Yap─▒s─▒','Kimyasal Tepkimeler','Enerji D├Ân├╝┼ş├╝mleri','Elektrik ve Manyetizma','Optik','Ses','├çevre ve ─░klim','Canl─▒lar ve Ya┼şam'] },
      { name: 'Sosyal Bilgiler', color: '#dc2626', topics: ['Tarihte Yolculuk','Bilim Tarih ve Hukuk','Ya┼şad─▒─ş─▒m─▒z Yer','├£retim T├╝ketim','Demokrasi ve Kat─▒l─▒m','Ortak Miras─▒m─▒z','K├╝resel Ba─şlant─▒lar'] },
      { name: '─░ngilizce', color: '#0891b2', topics: ['Teens','Yummy Yummy','In the Kitchen','On the Phone','TV & Social Media','Adventures','Tourism','Emergency','Digital Era','Greens'] },
      { name: 'Din K├╝lt├╝r├╝', color: '#7c3aed', topics: ["Kur'an'─▒n Temel E─şitimi",'Hz. Muhammed','K├╝resel Etik','Din ve Hayat','Gen├ğlik D├Ânemi'] },
    ],
    'TYT': [
      { name: 'TYT T├╝rk├ğe', color: '#d97706', topics: ['S├Âzc├╝kte Anlam','Deyim-Atas├Âz├╝','C├╝mle Anlam─▒','Paragraf','Yaz─▒m Kurallar─▒','Noktalama','C├╝mle T├╝rleri','Fiil ├çekimleri','Edatlar-Ba─şla├ğlar','Anlat─▒m Bozukluklar─▒'] },
      { name: 'TYT Matematik', color: '#2563eb', topics: ['Temel Kavramlar','Say─▒ Basamaklar─▒','B├Âl├╝nebilme','OBEB-OKEK','├£slular-K├Âkl├╝ler','Kesirler','Denklemler','E┼şitsizlikler','Oran-Orant─▒','Y├╝zde-Faiz','K├╝meler','Fonksiyonlar','Kombinasyon','Olas─▒l─▒k','─░statistik'] },
      { name: 'TYT Fen', color: '#059669', topics: ['Atom Modelleri','Periyodik Sistem','Kimyasal Ba─şlar','Asit-Baz','Kinetik Enerji','Newton Yasalar─▒','Optik','Elektrik','DNA ve Kal─▒t─▒m','Ekosistem'] },
      { name: 'TYT Sosyal', color: '#dc2626', topics: ['Tarih Bilimi','─░lk Uygarl─▒klar','─░slam Tarihi','Osmanl─▒ Devleti','Birinci D├╝nya Sava┼ş─▒','─░stiklal Sava┼ş─▒','Cumhuriyet D├Ânemi','Co─şrafya Temelleri','T├╝rkiye Co─şrafyas─▒','Felsefe Giri┼ş'] },
    ],
    'AYT-S├Âzel': [
      { name: 'Edebiyat', color: '#d97706', topics: ['G├╝zel Sanatlar','Dil-Anlat─▒m','Halk Edebiyat─▒','Divan Edebiyat─▒','Tanzimat','Servetif├╝nun','Milli Edebiyat','Cumhuriyet Edebiyat─▒'] },
      { name: 'Tarih', color: '#dc2626', topics: ['Tarih Felsefesi','Me┼şrutiyet D├Ânemi','Birinci D├╝nya Sava┼ş─▒','Kurtulu┼ş Sava┼ş─▒','Atat├╝rk D├Ânemi','Siyasi Tarih','─░kinci D├╝nya Sava┼ş─▒','So─şuk Sava┼ş'] },
      { name: 'Co─şrafya', color: '#059669', topics: ['Do─şal Sistemler','K├╝resel Ortam','N├╝fus','G├Â├ğ','Yerle┼şme','Tar─▒m','End├╝stri','Enerji','Turizm','Afetler'] },
    ],
    'AYT-Say─▒sal': [
      { name: 'Matematik', color: '#2563eb', topics: ['Fonksiyonlar','Trigonometri','Logaritma','Dizi ve Seriler','Limit-T├╝rev','─░ntegral','Karma┼ş─▒k Say─▒lar','Kombinasyon-Olas─▒l─▒k','Analitik Geometri','Konik Kesitler'] },
      { name: 'Fizik', color: '#0891b2', topics: ['Vekt├Ârler','Kinematik','Dinamik','Enerji','─░tme-Momentum','Tork-D├Ând├╝rme','Bas─▒n├ğ','Dalgalar','Elektrik','Manyetizma','Modern Fizik'] },
      { name: 'Kimya', color: '#db2777', topics: ['Atom Modelleri','Periyodik Tablo','Kimyasal Ba─ş','Gaz Yasalar─▒','Termokimya','Kimyasal Denge','Elektrokimya','Organik Kimya'] },
      { name: 'Biyoloji', color: '#059669', topics: ['H├╝cre','Mitoz-Mayoz','Kal─▒t─▒m','Mutasyon','Ekosistem','Solunum Sistemleri','Sinir Sistemi','Hormonal Sistem','├£reme'] },
    ],
  };

  const addPoolSubject = () => {
    const name = newPoolSubject.name.trim();
    if (!name) return;
    if (topicPool.find(s => s.name.toLowerCase() === name.toLowerCase())) return;
    const color = POOL_COLORS[topicPool.length % POOL_COLORS.length];
    setTopicPool(prev => [...prev, { id: uid(), name, color: newPoolSubject.color || color, topics: [] }]);
    setNewPoolSubject({ name: '', color: POOL_COLORS[(topicPool.length + 1) % POOL_COLORS.length] });
  };

  const removePoolSubject = (subId) => setTopicPool(prev => prev.filter(s => s.id !== subId));

  const addPoolTopic = (subId) => {
    const name = (newPoolTopics[subId] || '').trim();
    if (!name) return;
    setTopicPool(prev => prev.map(s => s.id === subId
      ? { ...s, topics: [...s.topics, { id: uid(), name, done: false }] } : s));
    setNewPoolTopics(p => ({ ...p, [subId]: '' }));
  };

  const addBulkPoolTopics = (subId) => {
    const text = (bulkTopicInput[subId] || '').trim();
    if (!text) return;
    const names = text.split('\n').map(l => l.trim()).filter(Boolean);
    setTopicPool(prev => prev.map(s => {
      if (s.id !== subId) return s;
      const existingNames = new Set(s.topics.map(t => t.name));
      const newTopics = names.filter(n => !existingNames.has(n)).map(n => ({ id: uid(), name: n, done: false }));
      return { ...s, topics: [...s.topics, ...newTopics] };
    }));
    setBulkTopicInput(p => ({ ...p, [subId]: '' }));
    setShowBulkInput(p => ({ ...p, [subId]: false }));
  };

  const removePoolTopic = (subId, topicId) => {
    setTopicPool(prev => prev.map(s => s.id === subId
      ? { ...s, topics: s.topics.filter(t => t.id !== topicId) } : s));
  };

  const togglePoolTopic = (subId, topicId) => {
    setTopicPool(prev => prev.map(s => s.id === subId
      ? { ...s, topics: s.topics.map(t => t.id === topicId ? { ...t, done: !t.done, status: !t.done ? 'Bitti' : 'Ba┼şlanmad─▒' } : t) } : s));
  };

  const setPoolTopicStatus = (subId, topicId, status) => {
    setTopicPool(prev => prev.map(s => s.id === subId
      ? {
          ...s,
          topics: s.topics.map(t => {
            if (t.id !== topicId) return t;
            const isDone = status === 'Bitti';
            return { ...t, status, done: isDone };
          })
        }
      : s));
  };

  const assignTopicToDay = (subjectName, topicName, dayName, hours = '1 sa', activityType = 'Konu ├çal─▒┼şmas─▒') => {
    if (!subjectName || !topicName || !dayName) return;
    
    const targetDay = (dayName === 'Pazartesi' ? 'Pzt' :
                       dayName === 'Sal─▒' ? 'Sal' :
                       dayName === '├çar┼şamba' ? '├çr┼ş' :
                       dayName === 'Per┼şembe' ? 'Pr┼ş' :
                       dayName === 'Cuma' ? 'Cum' :
                       dayName === 'Cumartesi' ? 'Cts' :
                       dayName === 'Pazar' ? 'Paz' : dayName);

    // Add to weeklyProgram
    setWeeklyProgram(prev => {
      const normalized = normalizeWeeklyProgram(prev);
      return normalized.map(d => {
        if (d.day === targetDay) {
          const existing = (d.items || []).find(i => i.subject === subjectName && i.topic === topicName && i.type === activityType);
          if (existing) return d;
          return {
            ...d,
            items: [
              ...(d.items || []),
              {
                id: uid(),
                subject: subjectName,
                topic: topicName,
                type: activityType || 'Konu ├çal─▒┼şmas─▒',
                hours: hours || '1 sa',
                isRecurring: true,
                done: false
              }
            ]
          };
        }
        return d;
      });
    });

    // Update topic status to Devam Ediyor if currently Ba┼şlanmad─▒ or unset
    setTopicPool(prev => prev.map(s => {
      if (s.name !== subjectName) return s;
      return {
        ...s,
        topics: s.topics.map(t => {
          if (t.name === topicName && (!t.status || t.status === 'Ba┼şlanmad─▒')) {
            return { ...t, status: 'Devam Ediyor' };
          }
          return t;
        })
      };
    }));

    setAssigningTopicKey(null);
  };

  const loadTemplate = (tplKey) => {
    const subjects = TOPIC_TEMPLATES[tplKey];
    if (!subjects) return;
    setTopicPool(prev => {
      const next = [...prev];
      subjects.forEach(tplSub => {
        const existing = next.find(s => s.name.toLowerCase() === tplSub.name.toLowerCase());
        if (existing) {
          const existingNames = new Set(existing.topics.map(t => t.name));
          existing.topics = [...existing.topics, ...tplSub.topics.filter(n => !existingNames.has(n)).map(n => ({ id: uid(), name: n, done: false, status: 'Ba┼şlanmad─▒' }))];
        } else {
          next.push({ id: uid(), name: tplSub.name, color: tplSub.color, topics: tplSub.topics.map(n => ({ id: uid(), name: n, done: false, status: 'Ba┼şlanmad─▒' })) });
        }
      });
      return next;
    });
  };

  const loadGradeCurriculum = (gradeId) => {
    if (!curriculumData) return;
    const gradeObj = (curriculumData.grades || []).find(g => g.id === gradeId);
    if (!gradeObj) return;

    const gradeSubjects = (curriculumData.subjects || []).filter(s => s.gradeId === gradeId);
    if (gradeSubjects.length === 0) {
      alert(`"${gradeObj.name}" s─▒n─▒f─▒ i├ğin hen├╝z kay─▒tl─▒ ders m├╝fredat─▒ bulunamad─▒.`);
      return;
    }

    setTopicPool(prev => {
      const next = [...prev];
      gradeSubjects.forEach((sub, idx) => {
        const unitsForSub = (curriculumData.units || []).filter(u => u.subjectId === sub.id);
        const unitIds = new Set(unitsForSub.map(u => u.id));
        
        const topicsForSub = (curriculumData.topics || []).filter(t => t.subjectId === sub.id || unitIds.has(t.unitId));
        const topicNames = topicsForSub.map(t => t.name).filter(Boolean);

        const color = POOL_COLORS[idx % POOL_COLORS.length];
        const existing = next.find(s => s.name.toLowerCase() === sub.name.toLowerCase());

        if (existing) {
          const existingNames = new Set(existing.topics.map(t => t.name));
          const newTopics = topicNames.filter(n => !existingNames.has(n)).map(n => ({ id: uid(), name: n, done: false, status: 'Ba┼şlanmad─▒' }));
          existing.topics = [...existing.topics, ...newTopics];
        } else {
          next.push({
            id: uid(),
            name: sub.name,
            color,
            topics: topicNames.map(n => ({ id: uid(), name: n, done: false, status: 'Ba┼şlanmad─▒' }))
          });
        }
      });
      return next;
    });
  };

  /* ÔöÇÔöÇÔöÇ Profile y├╝kle ÔöÇÔöÇÔöÇ */
  useEffect(() => {
    if (!existingProfile || Object.keys(existingProfile).length === 0) return;
    setGoals(p => ({
      ...p,
      ...(existingProfile.goals || {}),
      examGoalType: existingProfile.examGoalType || existingProfile.goals?.examGoalType || p.examGoalType,
      customExamName: existingProfile.customExamName || existingProfile.goals?.customExamName || p.customExamName,
      targetSchool: existingProfile.targetSchool || existingProfile.goals?.targetSchool || p.targetSchool,
      targetScore:  existingProfile.targetScore  || existingProfile.goals?.targetScore  || p.targetScore,
      targetNet:    String(existingProfile.targetNet ?? existingProfile.goals?.targetNet ?? p.targetNet),
      monthlyGoals: existingProfile.monthlyGoals || existingProfile.goals?.monthlyGoals || p.monthlyGoals,
      weeklyGoals:  existingProfile.weeklyGoals  || existingProfile.goals?.weeklyGoals  || p.weeklyGoals,
      dailyGoals:   existingProfile.dailyGoals   || existingProfile.goals?.dailyGoals   || p.dailyGoals,
    }));
    if (existingProfile.weeklyProgram) {
      setWeeklyProgram(processWeeklyProgramWeekChange(existingProfile.weeklyProgram, existingProfile.weeklyProgramWeekKey));
    }
    if (existingProfile.dailyLogs) setDailyLogs(existingProfile.dailyLogs);
    if (existingProfile.topicList) setTopicList(existingProfile.topicList);
    if (existingProfile.questionTrack) setQuestionTrack(p => ({ ...p, ...existingProfile.questionTrack }));
    if (existingProfile.errors) setErrors(existingProfile.errors);
    if (existingProfile.motivation) setMotivation(p => ({ ...p, ...existingProfile.motivation }));
    if (existingProfile.habits) setHabits(existingProfile.habits);
    if (existingProfile.topicPool) setTopicPool(existingProfile.topicPool);
    if (existingProfile.schoolGrades) setSchoolGrades(existingProfile.schoolGrades);
    if (existingProfile.customSubjects) setCustomSubjects(existingProfile.customSubjects);
    if (existingProfile.personalInfo) {
      setPersonalInfo(p => ({ ...p, ...existingProfile.personalInfo }));
    } else if (currentUser) {
      setPersonalInfo(p => ({
        ...p,
        fullName: p.fullName || currentUser.name || '',
        studentPhone: p.studentPhone || currentUser.phone || ''
      }));
    }
  }, [existingProfile.studentId]);

  /* ÔöÇÔöÇÔöÇ Hedef Otomatik S─▒f─▒rlama Takibi (G├╝nl├╝k, Haftal─▒k, Ayl─▒k) ÔöÇÔöÇÔöÇ */
  useEffect(() => {
    const todayStr = today(); // 'YYYY-MM-DD'
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`; // '2026-08'

    const startOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    const weekKey = `${year}-W${weekNum}`;

    setGoals(prev => {
      let changed = false;
      const lastDaily = prev.lastDailyResetDate;
      const lastWeekly = prev.lastWeeklyResetKey;
      const lastMonthly = prev.lastMonthlyResetKey;

      const updatedCounters = (prev.counterGoals || []).map(g => {
        let newCurrent = g.current || 0;

        // Her gece 00:00 sonras─▒ yeni g├╝nde G├╝nl├╝k hedefler 0'lan─▒r
        if (g.period === 'G├╝nl├╝k' && lastDaily && lastDaily !== todayStr) {
          newCurrent = 0;
          changed = true;
        }

        // Her Pazartesi / yeni haftada Haftal─▒k hedefler 0'lan─▒r
        if (g.period === 'Haftal─▒k' && lastWeekly && lastWeekly !== weekKey) {
          newCurrent = 0;
          changed = true;
        }

        // Her ay─▒n 1'inde Ayl─▒k hedefler 0'lan─▒r
        if (g.period === 'Ayl─▒k' && lastMonthly && lastMonthly !== monthKey) {
          newCurrent = 0;
          changed = true;
        }

        return { ...g, current: newCurrent };
      });

      if (!lastDaily || !lastWeekly || !lastMonthly || changed) {
        return {
          ...prev,
          lastDailyResetDate: todayStr,
          lastWeeklyResetKey: weekKey,
          lastMonthlyResetKey: monthKey,
          counterGoals: updatedCounters
        };
      }

      return prev;
    });
  }, []);

  /* ÔöÇÔöÇÔöÇ Deneme sonu├ğlar─▒ (otomatik + manuel kombine) ÔöÇÔöÇÔöÇ */
  const mySubmissions = useMemo(() => submissions.filter(s => String(s.studentId) === String(studentId)), [submissions, studentId]);
  const studentMockExams = useMemo(() => getMockExamsForStudent(studentId) || [], [getMockExamsForStudent, studentId]);

  const updateSubjectScore = (subjectName, field, value) => {
    setNewManualMock(prev => {
      const currentSub = prev.subjects[subjectName] || { d: '', y: '', b: '', net: '' };
      const updatedSub = { ...currentSub, [field]: value };

      if (field === 'd' || field === 'y') {
        const d = parseFloat(field === 'd' ? value : updatedSub.d) || 0;
        const y = parseFloat(field === 'y' ? value : updatedSub.y) || 0;
        updatedSub.net = Math.max(0, d - (y / 4)).toFixed(2);
      }

      return {
        ...prev,
        subjects: {
          ...prev.subjects,
          [subjectName]: updatedSub
        }
      };
    });
  };

  const addSubjectToMock = () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;
    if (newManualMock.subjects[trimmed]) return; // zaten var
    setNewManualMock(prev => ({
      ...prev,
      subjects: { ...prev.subjects, [trimmed]: { d: '', y: '', b: '', net: '' } }
    }));
    setNewSubjectName('');
  };

  const removeSubjectFromMock = (subjectName) => {
    setNewManualMock(prev => {
      const updated = { ...prev.subjects };
      delete updated[subjectName];
      return { ...prev, subjects: updated };
    });
  };

  const totalMockD = Object.values(newManualMock.subjects).reduce((s, x) => s + (parseFloat(x.d) || 0), 0);
  const totalMockY = Object.values(newManualMock.subjects).reduce((s, x) => s + (parseFloat(x.y) || 0), 0);
  const totalMockB = Object.values(newManualMock.subjects).reduce((s, x) => s + (parseFloat(x.b) || 0), 0);
  const totalMockNet = Object.values(newManualMock.subjects).reduce((s, x) => s + (parseFloat(x.net) || 0), 0);

  const handleSaveManualMock = async (e) => {
    e.preventDefault();
    if (!newManualMock.title.trim()) return;

    const formattedScores = {};
    Object.entries(newManualMock.subjects).forEach(([subName, val]) => {
      formattedScores[subName] = {
        correct: parseFloat(val.d) || 0,
        wrong: parseFloat(val.y) || 0,
        empty: parseFloat(val.b) || 0,
        net: parseFloat(val.net) || 0
      };
    });

    await addMockExam({
      studentId,
      studentName: currentUser.name,
      title: newManualMock.title.trim(),
      date: newManualMock.date || today(),
      scores: formattedScores,
      totalCorrect: totalMockD,
      totalWrong: totalMockY,
      totalEmpty: totalMockB,
      totalNet: totalMockNet.toFixed(2),
      isManual: true,
      createdBy: 'student',
      approvalStatus: 'pending'
    });

    setShowMockModal(false);
    setNewManualMock({
      title: '', date: today(),
      subjects: {
        'T├╝rk├ğe': { d: '', y: '', b: '', net: '' },
        'Matematik': { d: '', y: '', b: '', net: '' },
        'Fen Bilimleri': { d: '', y: '', b: '', net: '' },
        'Sosyal Bilgiler': { d: '', y: '', b: '', net: '' },
        '─░ngilizce': { d: '', y: '', b: '', net: '' },
      }
    });
  };

  const { generalTrialExams, otherHomeworkSubmissions } = useMemo(() => {
    const normalizeSub = (s, parentObj, defaultType = 'online') => {
      let title = s.title || s.testTitle || parentObj?.title || parentObj?.name || 'S─▒nav / Test';
      
      let isExamBook = false;
      let relatedBook = null;
      if (parentObj && parentObj.bookId) {
        relatedBook = books.find(b => String(b.id) === String(parentObj.bookId));
        if (relatedBook && relatedBook.bookType === 'exam') {
          isExamBook = true;
          // We don't prepend subject name here anymore because we will group them by the book title
          title = relatedBook.title; 
        }
      }

      // ONLY treat as trial if it's an exam book, or explicitly marked
      const isTrial = isExamBook || s.isDeneme || parentObj?.isDeneme;

      let correct = s.correctCount ?? s.correct ?? s.totalCorrect ?? 0;
      let wrong = s.wrongCount ?? s.wrong ?? s.totalWrong ?? 0;
      let empty = s.emptyCount ?? s.empty ?? s.totalEmpty ?? 0;

      // Extract from answers array if available
      if (!correct && !wrong && !empty && Array.isArray(s.answers) && s.answers.length > 0) {
        correct = s.answers.filter(a => a.isCorrect === true || a.earnedPoints > 0).length;
        wrong = s.answers.filter(a => a.isCorrect === false).length;
        empty = Math.max(0, s.answers.length - (correct + wrong));
      }

      const totalQ = parentObj?.totalQuestions || parentObj?.questionCount || s.totalQuestions || (correct + wrong + empty) || 10;

      if (!correct && !wrong && s.score !== undefined && s.score !== null) {
        const numScore = parseFloat(s.score) || 0;
        if (numScore <= totalQ && numScore > 0) {
          correct = Math.round(numScore);
        } else if (numScore > 0) {
          correct = Math.round((numScore / 100) * totalQ);
        }
        empty = Math.max(0, totalQ - (correct + wrong));
      }

      let net = 0;
      if (s.net !== undefined && s.net !== null) {
        net = parseFloat(s.net);
      } else if (s.totalNet !== undefined && s.totalNet !== null) {
        net = parseFloat(s.totalNet);
      } else if (correct > 0 || wrong > 0) {
        const penaltyRatio = /lgs|bursluluk/i.test(title) ? 3 : 4;
        net = correct - (wrong / penaltyRatio);
      } else if (s.score !== undefined && parseFloat(s.score) <= totalQ) {
        net = parseFloat(s.score);
      }

      return {
        id: s.id || `sub_${Date.now()}_${Math.random()}`,
        originalSubmissionId: s.id,
        title,
        date: s.submittedAt?.slice(0, 10) || s.createdAt?.slice(0, 10) || today(),
        totalNet: parseFloat(net.toFixed(2)),
        correctCount: correct,
        wrongCount: wrong,
        emptyCount: empty,
        sourceType: defaultType,
        approvalStatus: 'approved',
        isTrial,
        isExamBook,
        parentBookId: relatedBook?.id || null,
        hwId: s.hwId || parentObj?.id || null,
        subjectName: parentObj?.name || 'Genel'
      };
    };

    // 1. EvaluationContext Online S─▒navlar ve BookTest S─▒navlar─▒
    const onlineEval = mySubmissions
      .filter(s => {
         if (!s.testId && !s.hwId && !s.bookTestId) return true;
         const hwMatch = (homeworks || []).some(h => String(h.id) === String(s.testId) || String(h.id) === String(s.hwId));
         if (hwMatch) return true;
         const btMatch = (bookTests || []).some(bt => String(bt.id) === String(s.testId) || String(bt.id) === String(s.bookTestId) || String(bt.id) === String(s.hwId));
         if (btMatch) return true;
         return false;
      })
      .map(s => {
        let parentObj = (homeworks || []).find(h => String(h.id) === String(s.testId) || String(h.id) === String(s.hwId));
        if (!parentObj) {
          parentObj = (bookTests || []).find(bt => String(bt.id) === String(s.testId) || String(bt.id) === String(s.bookTestId) || String(bt.id) === String(s.hwId));
        }
        return normalizeSub(s, parentObj, 'online');
      });

    // 2. HomeworkContext Optik / ├ûdev S─▒navlar─▒
    const hwSubmissions = [];
    (homeworks || []).forEach(hw => {
      if (hw.submissions && Array.isArray(hw.submissions)) {
        hw.submissions.forEach(sub => {
          if (String(sub.studentId) === String(studentId)) {
            hwSubmissions.push(normalizeSub(sub, hw, 'optik'));
          }
        });
      }
    });

    // 3. Fiziki Deneme Mod├╝l├╝ S─▒navlar─▒ (Her zaman Deneme S─▒nav─▒d─▒r)
    const manualExams = studentMockExams.map(m => ({
      id: m.id,
      title: m.title || 'Fiziki Deneme S─▒nav─▒',
      date: m.date || m.createdAt?.slice(0, 10) || today(),
      totalNet: parseFloat(m.totalNet) || 0,
      sourceType: 'manual',
      approvalStatus: m.approvalStatus || (m.createdBy === 'student' ? 'pending' : 'approved'),
      scores: m.scores || {},
      totalCorrect: m.totalCorrect || 0,
      totalWrong: m.totalWrong || 0,
      totalEmpty: m.totalEmpty || 0,
      isTrial: true
    }));

    const seen = new Set();
    const all = [];
    [...manualExams, ...onlineEval, ...hwSubmissions].forEach(item => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        all.push(item);
      }
    });

    const trials = [];
    const homeworksOnly = [];
    const groupedExams = {}; // key: hwId || (parentBookId + date)

    all.forEach(item => {
      if (item.sourceType === 'manual') {
        trials.push(item);
      } else if (item.isExamBook) {
        // We use parentBookId as the primary grouping key because homework IDs can vary
        const groupKey = `${item.parentBookId}_${item.date}`;
        if (!groupedExams[groupKey]) {
          const groupScores = {};
          if (item.parentBookId) {
             const testsForBook = (bookTests || []).filter(bt => String(bt.bookId) === String(item.parentBookId));
             testsForBook.forEach(bt => {
                groupScores[bt.name] = { d: 0, y: 0, b: bt.questionCount || 0, net: 0 };
             });
          }

          groupedExams[groupKey] = {
            id: `grp_${groupKey}`,
            title: item.title,
            date: item.date,
            totalNet: 0,
            totalCorrect: 0,
            totalWrong: 0,
            totalEmpty: 0,
            sourceType: item.sourceType,
            approvalStatus: item.approvalStatus,
            isTrial: true,
            scores: groupScores,
            submissions: []
          };
        }
        
        const group = groupedExams[groupKey];
        const subj = item.subjectName || 'Genel';
        
        group.scores[subj] = {
          d: item.correctCount || 0,
          y: item.wrongCount || 0,
          b: item.emptyCount || 0,
          net: item.totalNet || 0
        };

        if (item.originalSubmissionId) {
          group.submissions.push(item.originalSubmissionId);
        }
      } else {
        if (item.isTrial) {
          trials.push(item);
        } else {
          homeworksOnly.push(item);
        }
      }
    });

    Object.values(groupedExams).forEach(grp => {
      let tNet = 0, tCorrect = 0, tWrong = 0, tEmpty = 0;
      Object.values(grp.scores).forEach(sc => {
         tNet += sc.net || 0;
         tCorrect += sc.d || 0;
         tWrong += sc.y || 0;
         tEmpty += sc.b || 0;
      });
      grp.totalNet = parseFloat(tNet.toFixed(2));
      grp.totalCorrect = tCorrect;
      grp.totalWrong = tWrong;
      grp.totalEmpty = tEmpty;
      trials.push(grp);
    });

    trials.sort((a, b) => new Date(b.date) - new Date(a.date));
    homeworksOnly.sort((a, b) => new Date(b.date) - new Date(a.date));

    return { generalTrialExams: trials, otherHomeworkSubmissions: homeworksOnly };
  }, [mySubmissions, homeworks, studentMockExams, studentId, books, bookTests]);

  const pendingExams = useMemo(() => {
    return studentMockExams.filter(m => m.approvalStatus === 'pending' || (m.createdBy === 'student' && m.approvalStatus !== 'approved'));
  }, [studentMockExams]);

  /* ÔöÇÔöÇÔöÇ Kaydet ÔöÇÔöÇÔöÇ */
  const handleSave = useCallback(async () => {
    await saveCoachingProfile({
      ...existingProfile,
      studentId,
      weeklyProgramWeekKey: getCurrentWeekKey(),
      // /goals & ko├ğluk sayfas─▒yla senkron
      examGoalType: goals.examGoalType,
      customExamName: goals.customExamName,
      targetSchool: goals.targetSchool,
      targetScore:  goals.targetScore,
      targetNet:    Number(goals.targetNet) || 0,
      monthlyGoals: goals.monthlyGoals,
      weeklyGoals:  goals.weeklyGoals,
      dailyGoals:   goals.dailyGoals,
      schoolGrades: schoolGrades,
      customSubjects: customSubjects,
      personalInfo,
      goals, weeklyProgram, dailyLogs, topicList, questionTrack, errors, motivation, habits, topicPool, schoolGrades, customSubjects
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [goals, weeklyProgram, dailyLogs, topicList, questionTrack, errors, motivation, habits, topicPool, schoolGrades, customSubjects, personalInfo]);

  /* ÔöÇÔöÇÔöÇ Multi-Item Weekly Program Handlers ÔöÇÔöÇÔöÇ */
  const addWeeklyItem = (dayName) => {
    const input = newScheduleInputs[dayName] || { subject: poolSubjectNames[0] || SUBJECTS[0], topic: '', hours: '', isRecurring: true };
    if (!input.subject && !input.topic) return;

    // '__custom__' se├ğildiyse _customTopic'i kullan
    const resolvedTopic = input.topic === '__custom__'
      ? (input._customTopic || '').trim()
      : (input.topic || '');

    setWeeklyProgram(prev => {
      const normalized = normalizeWeeklyProgram(prev);
      return normalized.map(d => {
        if (d.day === dayName) {
          return {
            ...d,
            items: [
              ...(d.items || []),
              {
                id: uid(),
                subject: input.subject || 'Ders',
                topic: resolvedTopic,
                hours: input.hours || '',
                isRecurring: input.isRecurring !== false,
                done: false
              }
            ]
          };
        }
        return d;
      });
    });

    const defaultSubject = poolSubjectNames[0] || SUBJECTS[0];
    setNewScheduleInputs(p => ({
      ...p,
      [dayName]: { subject: defaultSubject, topic: '', hours: '', isRecurring: true }
    }));
  };


  const toggleWeeklyItem = (dayName, itemId) => {
    setWeeklyProgram(prev => {
      const normalized = normalizeWeeklyProgram(prev);
      return normalized.map(d => {
        if (d.day === dayName) {
          return {
            ...d,
            items: (d.items || []).map(item => item.id === itemId ? { ...item, done: !item.done } : item)
          };
        }
        return d;
      });
    });
  };

  const toggleRecurringItem = (dayName, itemId) => {
    setWeeklyProgram(prev => {
      const normalized = normalizeWeeklyProgram(prev);
      return normalized.map(d => {
        if (d.day === dayName) {
          return {
            ...d,
            items: (d.items || []).map(item => item.id === itemId ? { ...item, isRecurring: item.isRecurring === false ? true : false } : item)
          };
        }
        return d;
      });
    });
  };

  const deleteWeeklyItem = (dayName, itemId) => {
    setWeeklyProgram(prev => {
      const normalized = normalizeWeeklyProgram(prev);
      return normalized.map(d => {
        if (d.day === dayName) {
          return {
            ...d,
            items: (d.items || []).filter(item => item.id !== itemId)
          };
        }
        return d;
      });
    });
  };

  const calculateHabitStreak = (h) => {
    if (!h || !h.days) return { currentStreak: 0, maxStreak: 0, isStreakActive: false };
    const todayIdx = (new Date().getDay() + 6) % 7;
    let currentStreak = 0;

    for (let i = todayIdx; i >= 0; i--) {
      const dayKey = DAYS[i];
      if (h.days[dayKey]) {
        currentStreak++;
      } else {
        if (i === todayIdx && currentStreak === 0) continue;
        break;
      }
    }

    let maxStreak = 0;
    let temp = 0;
    DAYS.forEach(d => {
      if (h.days[d]) {
        temp++;
        if (temp > maxStreak) maxStreak = temp;
      } else {
        temp = 0;
      }
    });

    return { currentStreak, maxStreak, isStreakActive: currentStreak > 0 };
  };

  const getCurrentWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);

    const monthNames = ['Oca', '┼Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'A─şu', 'Eyl', 'Ekim', 'Kas', 'Ara'];

    return DAYS.map((dayName, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dateNum = d.getDate();
      const monthStr = monthNames[d.getMonth()];
      const isToday = d.toDateString() === now.toDateString();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const dayNumStr = String(dateNum).padStart(2, '0');
      const isoDate = `${d.getFullYear()}-${monthNum}-${dayNumStr}`;
      return {
        dayName,
        dateNum,
        monthStr,
        fullDateStr: `${dateNum} ${monthStr}`,
        isoDate,
        isToday
      };
    });
  };

  const weekDates = getCurrentWeekDates();

  const toggleHabitDay = (habitId, dayName, isoDate) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const isCurrentlyChecked = Boolean(h.days?.[dayName]);
      const newChecked = !isCurrentlyChecked;

      const newDays = { ...(h.days || {}), [dayName]: newChecked };
      const newHistory = { ...(h.history || {}), [isoDate]: newChecked };

      return { ...h, days: newDays, history: newHistory };
    }));
  };

  const toggleHabitHistoryDate = (habitId, dateStr) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const newChecked = !h.history?.[dateStr];
      const newHistory = { ...(h.history || {}), [dateStr]: newChecked };

      const matchedWeek = weekDates.find(w => w.isoDate === dateStr);
      const newDays = matchedWeek ? { ...(h.days || {}), [matchedWeek.dayName]: newChecked } : (h.days || {});

      return { ...h, days: newDays, history: newHistory };
    }));
  };

  const getDaysInCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();
    const monthNames = ['Ocak', '┼Şubat', 'Mart', 'Nisan', 'May─▒s', 'Haziran', 'Temmuz', 'A─şustos', 'Eyl├╝l', 'Ekim', 'Kas─▒m', 'Aral─▒k'];
    const dayNames = ['Paz', 'Pzt', 'Sal', '├çr┼ş', 'Pr┼ş', 'Cum', 'Cts'];

    const days = [];
    for (let d = 1; d <= numDays; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dayNames[dateObj.getDay()];
      const monthNum = String(month + 1).padStart(2, '0');
      const dayNumStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthNum}-${dayNumStr}`;
      const isToday = dateObj.toDateString() === now.toDateString();
      days.push({
        dayNum: d,
        dayOfWeek,
        dateStr,
        isToday,
        dateObj
      });
    }

    const firstDayObj = new Date(year, month, 1);
    const firstDayOffset = (firstDayObj.getDay() + 6) % 7;

    return {
      year,
      monthName: monthNames[month],
      days,
      firstDayOffset
    };
  };

  /* ÔöÇÔöÇÔöÇ Hesaplamalar ÔöÇÔöÇÔöÇ */
  const totalDailyQuestions = dailyLogs.reduce((s, l) => s + (parseFloat(l.questions) || 0), 0);
  const totalDailyHours = dailyLogs.reduce((s, l) => s + (parseFloat(l.studyHours) || 0), 0);
  const completedMonthly = (goals.monthlyGoals || []).filter(g => g.done).length;
  const todayIndex = (new Date().getDay() + 6) % 7;
  const todayDayKey = DAYS[todayIndex];
  const completedDaily = (habits || []).filter(h => h.days && h.days[todayDayKey]).length;
  const totalDaily = (habits || []).length;
  const totalPoolTopics = topicPool.reduce((sum, s) => sum + (s.topics?.length || 0), 0);
  const completedPoolTopics = topicPool.reduce((sum, s) => {
    return sum + (s.topics || []).filter(t => (t.status || (t.done ? 'Bitti' : 'Ba┼şlanmad─▒')) === 'Bitti' || t.status === 'Tamamland─▒').length;
  }, 0);
  const completedTopics = totalPoolTopics > 0 ? completedPoolTopics : topicList.filter(t => t.status === 'Tamamland─▒' || t.status === 'Bitti').length;
  const totalTopics = totalPoolTopics > 0 ? totalPoolTopics : topicList.length;
  const habitScore = habits.reduce((s, h) => s + Object.values(h.days).filter(Boolean).length, 0);
  const maxHabitScore = habits.length * 7;

  const totalWeeklyItems = weeklyProgram.reduce((s, d) => s + (d.items?.length || 0), 0);
  const completedWeeklyItems = weeklyProgram.reduce((s, d) => s + (d.items?.filter(i => i.done).length || 0), 0);

  const schoolGradesAvg = schoolGrades.length > 0
    ? (schoolGrades.reduce((sum, g) => sum + (parseFloat(g.score) || 0), 0) / schoolGrades.length).toFixed(1)
    : null;

  const TABS = [
    { id: 'ozet', label: '­şÅá ├ûzetim' },
    { id: 'kisiselbilgiler', label: '­şæñ Ki┼şisel Bilgiler' },
    { id: 'hedefler', label: '­şÄ» Hedeflerim & Takip Panosu' },
    { id: 'aliskanlik', label: '­şöÑ Al─▒┼şkanl─▒klar─▒m' },
    { id: 'konumerkezi', label: '­şğá Konu & Program Merkezi' },
    { id: 'calisma', label: 'ÔÅ▒´©Å ├çal─▒┼şmalar─▒m' },
    { id: 'motivasyon', label: 'Ô¡É Motivasyon' },
    { id: 'yazilinotlari', label: 'Ô£ı´©Å Yaz─▒l─▒ Notlar─▒m' },
    { id: 'denemeler', label: '­şôè Deneme Sonu├ğlar─▒m' },
    { id: 'testlerim', label: '­şôØ Testlerim' },
  ];

  // Konu havuzundan ders ve konu listeleri
  const poolSubjectNames = topicPool.map(s => s.name);
  const getPoolTopicsForSubject = (subjectName) => {
    const found = topicPool.find(s => s.name === subjectName);
    return found ? found.topics.map(t => t.name) : [];
  };

  /* ÔöÇÔöÇÔöÇ KO├ç ├û─ŞRETMEN─░ OLMAYAN ├û─ŞRENC─░ KONTROL├£ ÔöÇÔöÇÔöÇ */
  if (currentUser?.role === 'student' && !isCoached) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div style={{ padding: '2.5rem 2rem', textAlign: 'center', maxWidth: 480, width: '100%', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '1.5rem', border: '2px solid #e2e8f0', boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '2px solid #fde68a' }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontWeight: 900, fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.65rem' }}>Ko├ğ ├û─şretmeni Tan─▒mlanmad─▒</h2>
          <p style={{ color: '#64748b', fontSize: '0.86rem', lineHeight: 1.6, marginBottom: '1.75rem', fontWeight: 600 }}>
            Hen├╝z bir ko├ğ ├Â─şretmeniniz tan─▒mlanmam─▒┼şt─▒r. Ki┼şisel ├ğal─▒┼şma program─▒ ve ko├ğluk takibi i├ğin l├╝tfen rehber ├Â─şretmeninizle / ko├ğunuzla ileti┼şime ge├ğin.
          </p>
          <button onClick={() => navigate('/student')} style={{ padding: '0.75rem 1.6rem', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: '0.85rem', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
            ├û─şrenci Paneline D├Ân
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontWeight: 700 }}>Giri┼ş yapman─▒z gerekiyor.</p>
        <button onClick={() => navigate('/login')} style={{ marginTop: 12, padding: '0.6rem 1.4rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>Giri┼ş Yap</button>
      </div>
    );
  }

  const isStandardExam = ['LGS 2026', 'YKS (TYT/AYT) 2026', 'KPSS', 'Ara S─▒n─▒f Takip & Takdir Hedefi'].includes(goals.examGoalType);
  const isGradeTracking = goals.examGoalType === 'Ara S─▒n─▒f Takip & Takdir Hedefi';
  const displayExamName = isStandardExam ? goals.examGoalType : (goals.customExamName || goals.examGoalType || '├ûzel S─▒nav');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f5f3ff 0%,#ede9fe 40%,#fdf2f8 100%)', padding: 'clamp(0.75rem,3vw,1.75rem)', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* ÔöÇÔöÇ HEADER ÔöÇÔöÇ */}
      <div style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9,#5b21b6)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', boxShadow: '0 8px 32px rgba(124,58,237,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 900, backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.3)' }}>
            {currentUser.name?.charAt(0)?.toUpperCase() || '­şæñ'}
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>Merhaba, {currentUser.name?.split(' ')[0]} ­şæï</div>
            <div style={{ fontSize: '0.77rem', opacity: 0.8, fontWeight: 700 }}>­şôé Ki┼şisel Ko├ğluk & Geli┼şim Takip Dosyam</div>
          </div>
        </div>

        {/* Mini istatistikler */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(() => {
            const baseSubs = (mySubmissions || []);

            const hwSubs = [];
            (homeworks || []).forEach(hw => {
              (hw.submissions || []).forEach(sub => {
                if (String(sub.studentId) === String(studentId)) {
                  const alreadyExists = baseSubs.some(s => (s.hwId === hw.id || s.testId === hw.id || s.id === hw.id));
                  if (!alreadyExists) {
                    hwSubs.push({
                      totalQuestions: hw.totalQuestions || sub.totalQuestions || hw.questionCount || 0,
                      correctCount: sub.correctCount || (sub.score ? Math.round((sub.score/100)*(hw.totalQuestions||sub.totalQuestions||hw.questionCount||0)) : 0),
                      wrongCount: sub.wrongCount || 0,
                      blankCount: sub.blankCount || 0
                    });
                  }
                }
              });
            });

            const allCombined = [...baseSubs, ...hwSubs];
            const deduplicatedMap = new Map();
            allCombined.forEach(s => {
              const uniqueKey = s.hwId || s.testId || s.id;
              const existing = deduplicatedMap.get(uniqueKey);
              if (!existing || new Date(s.submittedAt || 0) > new Date(existing.submittedAt || 0)) {
                deduplicatedMap.set(uniqueKey, s);
              }
            });

            const unifiedSubmissions = Array.from(deduplicatedMap.values()).map(s => {
              let correctCount = s.correctCount !== undefined ? s.correctCount : 0;
              let wrongCount = s.wrongCount !== undefined ? s.wrongCount : 0;
              let blankCount = s.blankCount !== undefined ? s.blankCount : 0;
              if (s.answers && s.answers.length > 0) {
                correctCount = 0; wrongCount = 0; blankCount = 0;
                s.answers.forEach(ans => {
                  if (ans.isCorrect === true) correctCount++;
                  else if (ans.isCorrect === false) {
                    const isB = ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '';
                    if (isB) blankCount++; else wrongCount++;
                  }
                });
              }
              return { ...s, correctCount, wrongCount, blankCount };
            });

            let globalCorrect = 0, globalTotal = 0;
            unifiedSubmissions.forEach(s => {
              const correct = s.correctCount || 0;
              const qCount = s.totalQuestions || (correct + (s.wrongCount || 0) + (s.blankCount || 0));
              if (qCount > 0) {
                globalCorrect += correct;
                globalTotal += qCount;
              }
            });
            const overallSuccess = globalTotal > 0 ? Math.round((globalCorrect / globalTotal) * 100) : 0;
            const totalHwQuestions = globalTotal;

            return [
              { label: '├ç├Âz├╝len Soru', value: totalHwQuestions, icon: '­şôØ' },
              { label: 'Test', value: otherHomeworkSubmissions.length, icon: '­şôï' },
              { label: 'Deneme', value: generalTrialExams.length, icon: '­şôè' },
              { label: 'Ba┼şar─▒ Oran─▒', value: `%${overallSuccess}`, icon: '­şÄ»' },
              { label: '├çal─▒┼şma (s)', value: totalDailyHours.toFixed(1), icon: 'ÔÅ▒´©Å' },
              { label: 'Konu Bitti', value: completedTopics, icon: 'Ô£à' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: '0.75rem', padding: '0.5rem 0.85rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)', minWidth: 70, flex: '1 1 auto' }}>
                <div style={{ fontSize: '1.05rem', marginBottom: 2 }}>{s.icon}</div>
                <div style={{ fontWeight: 900, fontSize: '0.95rem', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.62rem', opacity: 0.8, fontWeight: 700, marginTop: 2 }}>{s.label}</div>
              </div>
            ));
          })()}
        </div>

        <button onClick={handleSave} style={{ background: saved ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '0.85rem', padding: '0.55rem 1.1rem', color: 'white', fontWeight: 900, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(8px)', transition: 'all 0.2s' }}>
          {saved ? <><CheckCircle2 size={16} /> Kaydedildi!</> : <><Save size={16} /> Kaydet</>}
        </button>
      </div>

      {/* ÔöÇÔöÇ TAB BAR ÔöÇÔöÇ */}
      <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '1rem 1rem 0 0', border: '2px solid #e2e8f0', borderBottom: 'none', display: 'flex', overflowX: 'auto', padding: '0.4rem 0.4rem 0', gap: 3, boxShadow: '0 -2px 8px rgba(0,0,0,0.04)' }}>
        {TABS.map(t => <TabBtn key={t.id} id={t.id} active={activeTab === t.id} label={t.label} onClick={setActiveTab} />)}
      </div>

      {/* ÔöÇÔöÇ CONTENT AREA ÔöÇÔöÇ */}
      <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '0 0 1.25rem 1.25rem', border: '2px solid #e2e8f0', borderTop: 'none', padding: '1.5rem', minHeight: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>

        {/* ÔòÉÔòÉÔòÉ KONU & PROGRAM MERKEZ─░ (Tek Ekran Ak─▒ll─▒ G├Âr├╝n├╝m) ÔòÉÔòÉÔòÉ */}
        {activeTab === 'konumerkezi' && (
          <div>
            <Tip>
              ­şğá <b>Konu & Program Merkezi</b>: T├╝m konular─▒n─▒ ve haftal─▒k program─▒n─▒ tek ekranda y├Ânet! Konu durumunu (­şö┤ <i>Ba┼şlanmad─▒</i> / ­şşí <i>Devam Ediyor</i> / ­şşó <i>Bitti</i>) de─şi┼ştir, <b>"­şôà G├╝ne Ata"</b> ile programa an─▒nda ekle.
            </Tip>

            {/* ├£st ─░statistik & Genel ─░lerleme ├çizgisi Kart─▒ */}
            {(() => {
              let totalTopics = 0;
              let notStarted = 0;
              let inProgress = 0;
              let finished = 0;

              topicPool.forEach(s => {
                s.topics.forEach(t => {
                  totalTopics++;
                  const st = t.status || (t.done ? 'Bitti' : 'Ba┼şlanmad─▒');
                  if (st === 'Bitti') finished++;
                  else if (st === 'Devam Ediyor') inProgress++;
                  else notStarted++;
                });
              });

              const totalPct = totalTopics > 0 ? Math.round((finished / totalTopics) * 100) : 0;
              const inProgressPct = totalTopics > 0 ? Math.round((inProgress / totalTopics) * 100) : 0;

              return (
                <div style={{ background: 'linear-gradient(135deg,#f8fafc,#edf2f7)', border: '2px solid #e2e8f0', borderRadius: '1.1rem', padding: '1.1rem 1.3rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  
                  {/* Ba┼şl─▒k ve Y├╝zde Bilgisi */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.1rem' }}>­şôè</span>
                      <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>Genel Konu ─░lerleme Durumu</span>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#059669', background: '#dcfce7', border: '1px solid #86efac', padding: '0.25rem 0.75rem', borderRadius: 99 }}>
                      %{totalPct} Tamamland─▒ ┬À ({finished}/{totalTopics} Konu)
                    </div>
                  </div>

                  {/* ─░lerleme ├çizgisi (├çoklu Renk Segmentli ├çubuk) */}
                  <div style={{ width: '100%', height: 12, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                    {/* Bitti (Ye┼şil) */}
                    <div style={{ width: `${totalPct}%`, background: 'linear-gradient(90deg, #10b981, #059669)', transition: 'width 0.4s ease' }} title={`Bitti: %${totalPct}`} />
                    {/* Devam Ediyor (Sar─▒) */}
                    <div style={{ width: `${inProgressPct}%`, background: 'linear-gradient(90deg, #f59e0b, #d97706)', transition: 'width 0.4s ease' }} title={`Devam Ediyor: %${inProgressPct}`} />
                  </div>

                  {/* Alt Detay Rozetleri */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', border: '1.5px solid #cbd5e1', padding: '0.35rem 0.75rem', borderRadius: '0.65rem', fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                        ­şôÜ Toplam Konu: <span style={{ color: '#6366f1' }}>{totalTopics}</span>
                      </div>
                      <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', padding: '0.35rem 0.75rem', borderRadius: '0.65rem', fontSize: '0.78rem', fontWeight: 800, color: '#dc2626' }}>
                        ­şö┤ Ba┼şlanmad─▒: {notStarted}
                      </div>
                      <div style={{ background: '#fefce8', border: '1.5px solid #fef08a', padding: '0.35rem 0.75rem', borderRadius: '0.65rem', fontSize: '0.78rem', fontWeight: 800, color: '#ca8a04' }}>
                        ­şşí Devam Ediyor: {inProgress}
                      </div>
                      <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', padding: '0.35rem 0.75rem', borderRadius: '0.65rem', fontSize: '0.78rem', fontWeight: 800, color: '#16a34a' }}>
                        ­şşó Bitti: {finished}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800, color: '#64748b' }}>
                      ­şôà Program ─░lerlemesi: <span style={{ color: '#4f46e5', fontWeight: 900 }}>{completedWeeklyItems}/{totalWeeklyItems} Ders</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Arama & Filtreleme & ┼Şablon Butonlar─▒ */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              {/* Filtre Butonlar─▒ */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: '­şîÉ T├╝m├╝' },
                  { id: 'baslanmadi', label: '­şö┤ Ba┼şlanmad─▒' },
                  { id: 'devamediyor', label: '­şşí Devam Ediyor' },
                  { id: 'bitti', label: '­şşó Bitti' },
                  { id: 'unassigned', label: 'ÔÜ¬ Programlanmam─▒┼ş' }
                ].map(f => (
                  <button key={f.id} onClick={() => setHubFilter(f.id)}
                    style={{
                      background: hubFilter === f.id ? '#4f46e5' : '#f8fafc',
                      color: hubFilter === f.id ? 'white' : '#475569',
                      border: hubFilter === f.id ? 'none' : '1.5px solid #e2e8f0',
                      borderRadius: '0.65rem', padding: '0.4rem 0.85rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s'
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Arama Kutusu & ┼Şablon Butonu */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  style={{ ...inp, width: 180, fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                  value={hubSearch}
                  onChange={e => setHubSearch(e.target.value)}
                  placeholder="­şöı Konu / ders ara..." />

                <button onClick={() => setShowTemplates(p => !p)}
                  style={{ background: 'rgba(255, 255, 255, 0.5)', color: '#6366f1', border: '1.5px solid #c7d2fe', borderRadius: '0.65rem', padding: '0.4rem 0.8rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  ÔÜí ┼Şablon Y├╝kle {showTemplates ? 'Ôû▓' : 'Ôû╝'}
                </button>
              </div>
            </div>

            {/* Haz─▒r ┼Şablon & M├╝fredat Y├╝kleme Kart─▒ (A├ğ─▒l─▒r/Kapan─▒r) */}
            {showTemplates && (
              <Card emoji="ÔÜí" title="Haz─▒r ┼Şablon & Kay─▒tl─▒ M├╝fredatlardan Y├╝kle">
                {/* 1. Sistem Haz─▒r S─▒nav ┼Şablonlar─▒ */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: 6 }}>­şÅå S─▒nav Haz─▒rl─▒k ┼Şablonlar─▒:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.keys(TOPIC_TEMPLATES).map(tplKey => (
                      <button key={tplKey} onClick={() => loadTemplate(tplKey)}
                        style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: 'white', border: 'none', borderRadius: '0.7rem', padding: '0.45rem 0.9rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Plus size={14} /> {tplKey} ┼Şablonu
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Kay─▒tl─▒ S─▒n─▒f M├╝fredatlar─▒ */}
                {curriculumData?.grades && curriculumData.grades.length > 0 && (
                  <div style={{ marginBottom: 12, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: 6 }}>­şÅ½ Kay─▒tl─▒ S─▒n─▒f M├╝fredat─▒ndan Y├╝kle (S─▒n─▒f Se├ğ):</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {curriculumData.grades.map(grade => {
                        const subCnt = (curriculumData.subjects || []).filter(s => s.gradeId === grade.id).length;
                        return (
                          <button key={grade.id} onClick={() => loadGradeCurriculum(grade.id)}
                            style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color: 'white', border: 'none', borderRadius: '0.7rem', padding: '0.45rem 0.9rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <GraduationCap size={15} /> {grade.name} ({subCnt} Ders)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {topicPool.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                    <button onClick={() => { if (window.confirm('T├╝m ders ve konular─▒ silmek istedi─şine emin misin?')) setTopicPool([]); }}
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: '0.65rem', padding: '0.4rem 0.85rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}>
                      ­şùæ´©Å T├╝m Havuzu Temizle
                    </button>
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  ­şÆí ┼Şablon veya s─▒n─▒f m├╝fredat─▒ y├╝kledi─şinde dersleriniz konu havuzunuza aktar─▒l─▒r ve hemen programlanabilir hale gelir.
                </div>
              </Card>
            )}

            {/* D├£ZEN: ├ç─░FT PANEL (Sol: Konu Havuzu & Durumlar, Sa─ş: Canl─▒ Haftal─▒k Program) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
              
              {/* SOL PANEL: DERSLER VE KONULAR */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <h3 style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ­şôÜ Dersler & Konu Durumlar─▒
                  </h3>
                  {topicPool.length > 0 && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { const allOpen = {}; topicPool.forEach(s => { allOpen[s.id] = true; }); setExpandedPoolSubjects(allOpen); }}
                        style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: '0.45rem', padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}>
                        Ôû╝ T├╝m├╝n├╝ A├ğ
                      </button>
                      <button onClick={() => setExpandedPoolSubjects({})}
                        style={{ background: 'rgba(255, 255, 255, 0.5)', color: '#64748b', border: '1px solid rgba(255,255,255,1)', borderRadius: '0.45rem', padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}>
                        Ôû▓ T├╝m├╝n├╝ Kapat
                      </button>
                    </div>
                  )}
                </div>

                {topicPool.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8', fontWeight: 700, background: 'rgba(255, 255, 255, 0.5)', borderRadius: '1rem', border: '2px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 6 }}>­şôÜ</div>
                    <div>Hen├╝z ders eklenmedi.</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>┼Şablon y├╝kleyebilir veya ders ekleyebilirsin.</div>
                  </div>
                )}

                {topicPool.map(sub => {
                  const isOpen = Boolean(expandedPoolSubjects[sub.id]);

                  // Filter topics inside subject
                  const filteredTopics = sub.topics.filter(t => {
                    const status = t.status || (t.done ? 'Bitti' : 'Ba┼şlanmad─▒');
                    
                    // Search match
                    if (hubSearch.trim()) {
                      const q = hubSearch.toLowerCase().trim();
                      const matchSub = sub.name.toLowerCase().includes(q);
                      const matchTop = t.name.toLowerCase().includes(q);
                      if (!matchSub && !matchTop) return false;
                    }

                    // Filter match
                    if (hubFilter === 'baslanmadi' && status !== 'Ba┼şlanmad─▒') return false;
                    if (hubFilter === 'devamediyor' && status !== 'Devam Ediyor') return false;
                    if (hubFilter === 'bitti' && status !== 'Bitti') return false;
                    if (hubFilter === 'unassigned') {
                      // Check if scheduled anywhere in weeklyProgram
                      const isScheduled = weeklyProgram.some(d => (d.items || []).some(i => i.subject === sub.name && i.topic === t.name));
                      if (isScheduled) return false;
                    }
                    return true;
                  });

                  if (hubSearch || hubFilter !== 'all') {
                    if (filteredTopics.length === 0) return null;
                  }

                  const doneCnt = sub.topics.filter(t => (t.status || (t.done ? 'Bitti' : 'Ba┼şlanmad─▒')) === 'Bitti').length;
                  const totalCnt = sub.topics.length;

                  return (
                    <div key={sub.id} style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', border: `2px solid ${sub.color}30`, borderRadius: '1rem', marginBottom: '1rem', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                      
                      {/* Ders Ba┼şl─▒─ş─▒ */}
                      <div 
                        onClick={() => setExpandedPoolSubjects(p => ({ ...p, [sub.id]: !p[sub.id] }))}
                        style={{ background: `linear-gradient(135deg, ${sub.color}15, ${sub.color}05)`, borderBottom: (isOpen || hubSearch || hubFilter !== 'all') ? `2px solid ${sub.color}20` : 'none', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: sub.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b', flex: 1 }}>{sub.name}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: sub.color, background: `${sub.color}15`, padding: '0.15rem 0.55rem', borderRadius: 99 }}>
                          {doneCnt}/{totalCnt} bitti
                        </span>
                        <div style={{ transform: (isOpen || hubSearch || hubFilter !== 'all') ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', color: sub.color }}>
                          <ChevronDown size={17} strokeWidth={3} />
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removePoolSubject(sub.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 3, borderRadius: 6, display: 'flex', marginLeft: 2 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Konular Listesi */}
                      {(isOpen || hubSearch || hubFilter !== 'all') && (
                        <div style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {filteredTopics.map(t => {
                              const status = t.status || (t.done ? 'Bitti' : 'Ba┼şlanmad─▒');
                              const topicKey = `${sub.id}-${t.id}`;
                              const isAssigningThis = assigningTopicKey === topicKey;

                              // Scheduled days list
                              const scheduledDays = [];
                              weeklyProgram.forEach(d => {
                                (d.items || []).forEach(item => {
                                  if (item.subject === sub.name && item.topic === t.name) {
                                    scheduledDays.push(d.day);
                                  }
                                });
                              });

                              return (
                                <div key={t.id} style={{
                                  background: status === 'Bitti' ? '#f0fdf4' : status === 'Devam Ediyor' ? '#fffbeb' : '#fafafa',
                                  border: status === 'Bitti' ? '1.5px solid #bbf7d0' : status === 'Devam Ediyor' ? '1.5px solid #fef08a' : '1px solid #e2e8f0',
                                  borderRadius: '0.75rem', padding: '0.55rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 6, transition: 'all 0.15s'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    {/* Durum Butonu (Tek t─▒kla de─şi┼ştirme) */}
                                    <button
                                      onClick={() => {
                                        const nextStatus = status === 'Ba┼şlanmad─▒' ? 'Devam Ediyor' : status === 'Devam Ediyor' ? 'Bitti' : 'Ba┼şlanmad─▒';
                                        setPoolTopicStatus(sub.id, t.id, nextStatus);
                                      }}
                                      style={{
                                        background: status === 'Bitti' ? '#dcfce7' : status === 'Devam Ediyor' ? '#fef9c3' : '#f1f5f9',
                                        color: status === 'Bitti' ? '#15803d' : status === 'Devam Ediyor' ? '#a16207' : '#64748b',
                                        border: status === 'Bitti' ? '1px solid #86efac' : status === 'Devam Ediyor' ? '1px solid #fde047' : '1px solid #cbd5e1',
                                        borderRadius: '0.5rem', padding: '0.2rem 0.55rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', shrink: 0
                                      }}
                                      title="T─▒klayarak durumu de─şi┼ştir">
                                      {status === 'Bitti' ? '­şşó Bitti' : status === 'Devam Ediyor' ? '­şşí Devam Ediyor' : '­şö┤ Ba┼şlanmad─▒'}
                                    </button>

                                    {/* Konu Ad─▒ */}
                                    <span style={{
                                      flex: 1, fontWeight: 700, fontSize: '0.84rem',
                                      color: status === 'Bitti' ? '#6b7280' : '#1e293b',
                                      textDecoration: status === 'Bitti' ? 'line-through' : 'none'
                                    }}>
                                      {t.name}
                                    </span>

                                    {/* Programlanm─▒┼ş G├╝n Badge'leri */}
                                    {scheduledDays.length > 0 && (
                                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {scheduledDays.map(d => (
                                          <span key={d} style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '0.4rem' }}>
                                            ­şôà {DAY_LONG[d] || d}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {/* "­şôà G├╝ne Ata" Butonu */}
                                    <button
                                      onClick={() => setAssigningTopicKey(isAssigningThis ? null : topicKey)}
                                      style={{
                                        background: isAssigningThis ? '#4f46e5' : '#eef2ff',
                                        color: isAssigningThis ? 'white' : '#4338ca',
                                        border: '1px solid #c7d2fe', borderRadius: '0.5rem', padding: '0.2rem 0.55rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3
                                      }}>
                                      <Plus size={12} /> G├╝ne Ata
                                    </button>

                                    {/* Sil */}
                                    <button onClick={() => removePoolTopic(sub.id, t.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2, display: 'flex' }}
                                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                      onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                                      <Trash2 size={12} />
                                    </button>
                                  </div>

                                  {/* H─▒zl─▒ G├╝ne Atama Modal─▒ / Popover */}
                                  {isAssigningThis && (
                                    <div style={{ marginTop: 6, background: 'rgba(255, 255, 255, 0.5)', border: '1.5px solid #c7d2fe', borderRadius: '0.65rem', padding: '0.65rem', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#374151' }}>G├╝n:</span>
                                      <select style={{ ...inp, padding: '0.25rem 0.5rem', fontSize: '0.78rem', width: 'auto' }} value={assignDay} onChange={e => setAssignDay(e.target.value)}>
                                        {DAYS.map(d => <option key={d} value={d}>{d} ({DAY_LONG[d]})</option>)}
                                      </select>

                                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginLeft: 2 }}>T├╝r:</span>
                                      <select style={{ ...inp, padding: '0.25rem 0.5rem', fontSize: '0.78rem', width: 'auto' }} value={assignType} onChange={e => setAssignType(e.target.value)}>
                                        <option value="Konu ├çal─▒┼şmas─▒">­şôû Konu ├çal─▒┼şmas─▒</option>
                                        <option value="Tekrar">­şöä Tekrar</option>
                                        <option value="Soru ├ç├Âz├╝m├╝">Ô£Å´©Å Soru ├ç├Âz├╝m├╝</option>
                                        <option value="Deneme / Test">­şôØ Deneme / Test</option>
                                        <option value="Etkinlik">­şÆí Etkinlik</option>
                                      </select>

                                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginLeft: 2 }}>S├╝re:</span>
                                      <input style={{ ...inp, padding: '0.25rem 0.5rem', fontSize: '0.78rem', width: 65 }} value={assignHours} onChange={e => setAssignHours(e.target.value)} placeholder="1 sa" />

                                      <button onClick={() => assignTopicToDay(sub.name, t.name, assignDay, assignHours, assignType)}
                                        style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.45rem', padding: '0.3rem 0.75rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', marginLeft: 'auto' }}>
                                        Ô£ô Programa Ekle
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Konu Ekleme Giri┼şleri */}
                          <div style={{ marginTop: 10, pt: 8, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              style={{ ...inp, flex: 1, fontSize: '0.8rem', padding: '0.35rem 0.6rem', borderColor: `${sub.color}40` }}
                              value={newPoolTopics[sub.id] || ''}
                              onChange={e => setNewPoolTopics(p => ({ ...p, [sub.id]: e.target.value }))}
                              placeholder="ÔŞò Yeni konu ad─▒ yaz..."
                              onKeyDown={e => {
                                if (e.key === 'Enter' && (newPoolTopics[sub.id] || '').trim()) {
                                  addPoolTopic(sub.id);
                                }
                              }} />
                            <button onClick={() => addPoolTopic(sub.id)}
                              disabled={!(newPoolTopics[sub.id] || '').trim()}
                              style={{ background: (newPoolTopics[sub.id] || '').trim() ? sub.color : '#e2e8f0', color: (newPoolTopics[sub.id] || '').trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: '0.55rem', padding: '0.35rem 0.75rem', fontWeight: 800, fontSize: '0.78rem', cursor: (newPoolTopics[sub.id] || '').trim() ? 'pointer' : 'not-allowed' }}>
                              Ekle
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Yeni Ders Ekle Kart─▒ */}
                <div style={{ background: 'rgba(255, 255, 255, 0.5)', border: '2px dashed #cbd5e1', borderRadius: '1rem', padding: '0.85rem 1.1rem', marginTop: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#475569', marginBottom: 6 }}>ÔŞò Yeni Ders Ekle</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input style={{ ...inp, flex: 1, fontSize: '0.82rem', padding: '0.4rem 0.7rem' }}
                      value={newPoolSubject.name}
                      onChange={e => setNewPoolSubject(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ders ad─▒ (├ûrn: Geometri)..." />
                    <button onClick={addPoolSubject} disabled={!newPoolSubject.name.trim()}
                      style={{ background: newPoolSubject.name.trim() ? '#059669' : '#e2e8f0', color: newPoolSubject.name.trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: '0.6rem', padding: '0.4rem 0.9rem', fontWeight: 800, fontSize: '0.8rem', cursor: newPoolSubject.name.trim() ? 'pointer' : 'not-allowed' }}>
                      Ekle
                    </button>
                  </div>
                </div>
              </div>

              {/* SA─Ş PANEL: HAFTALIK CANLI PROGRAM (7 G├£N) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                  <h3 style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ­şôà Canl─▒ Haftal─▒k Program
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button 
                      onClick={() => setHideDoneInProgram(p => !p)}
                      style={{ background: hideDoneInProgram ? '#f8fafc' : '#f0fdf4', color: hideDoneInProgram ? '#64748b' : '#15803d', border: '1px solid rgba(255,255,255,1)', borderRadius: '0.45rem', padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}>
                      {hideDoneInProgram ? '­şæü´©Å Bitenleri G├Âster' : '­şÖê Bitenleri Gizle'}
                    </button>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: 99 }}>
                      {completedWeeklyItems}/{totalWeeklyItems} bitti
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {DAYS.map(dayName => {
                    const dayData = weeklyProgram.find(w => w.day === dayName) || { day: dayName, items: [] };
                    const items = dayData.items || [];
                    const completedCount = items.filter(i => i.done).length;
                    const visibleItems = hideDoneInProgram ? items.filter(i => !i.done) : items;

                    return (
                      <div key={dayName} style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '0.9rem', border: '1.5px solid #e2e8f0', padding: '0.75rem 0.9rem', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: visibleItems.length > 0 ? 8 : 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ background: '#7c3aed', color: 'white', fontWeight: 900, fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '0.4rem' }}>{dayName}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#334155' }}>{DAY_LONG[dayName]}</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: completedCount === items.length && items.length > 0 ? '#16a34a' : '#94a3b8' }}>
                            {completedCount}/{items.length}
                          </span>
                        </div>

                        {items.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic', textAlign: 'center', padding: '0.3rem 0' }}>
                            Ders yok ÔÇö soldaki konulardan "G├╝ne Ata" ile ekleyebilirsin ­şæê
                          </div>
                        ) : visibleItems.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 800, textAlign: 'center', padding: '0.4rem 0', background: '#f0fdf4', borderRadius: '0.55rem', border: '1px solid #bbf7d0' }}>
                            Ô£ô Bug├╝nk├╝ t├╝m dersler tamamland─▒! ­şÄë
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {visibleItems.map(item => (
                              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '0.4rem 0.6rem', background: item.done ? '#f0fdf4' : '#f8fafc', border: item.done ? '1px solid #bbf7d0' : '1px solid #e2e8f0', borderRadius: '0.55rem' }}>
                                <button type="button" onClick={() => toggleWeeklyItem(dayName, item.id)}
                                  style={{ width: 18, height: 18, borderRadius: 4, background: item.done ? '#16a34a' : 'white', border: item.done ? 'none' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', shrink: 0 }}>
                                  {item.done && <Check size={12} color="white" strokeWidth={3} />}
                                </button>

                                <div style={{ flex: 1, minWidth: 0, fontSize: '0.78rem' }}>
                                  <span style={{ fontWeight: 800, color: '#475569', marginRight: 4 }}>[{item.subject}]</span>
                                  <span style={{ fontWeight: 700, color: item.done ? '#9ca3af' : '#1e293b', textDecoration: item.done ? 'line-through' : 'none' }}>{item.topic}</span>
                                  {item.type && (
                                    <span style={{ marginLeft: 4, fontSize: '0.66rem', fontWeight: 800, color: '#7c3aed', background: '#f3e8ff', border: '1px solid #e9d5ff', padding: '0.08rem 0.4rem', borderRadius: '0.35rem' }}>
                                      {item.type === 'Konu ├çal─▒┼şmas─▒' ? '­şôû Konu' : item.type === 'Tekrar' ? '­şöä Tekrar' : item.type === 'Soru ├ç├Âz├╝m├╝' ? 'Ô£Å´©Å Soru' : item.type === 'Deneme / Test' ? '­şôØ Test' : item.type}
                                    </span>
                                  )}
                                </div>

                                {item.hours && <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366f1', background: '#e0e7ff', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{item.hours}</span>}

                                <button onClick={() => removeWeeklyItem(dayName, item.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: 2, display: 'flex' }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={e => e.currentTarget.style.color = '#e2e8f0'}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}



        {/* ÔòÉÔòÉÔòÉ ├ûZET ÔòÉÔòÉÔòÉ */}
        {activeTab === 'ozet' && (
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color="#7c3aed" /> Bug├╝nk├╝ Durumum
            </div>

            {/* Uzun Vadeli Hedef Vitrini (├ûzet Sekmesinde ├çok ┼Ş─▒k G├Âr├╝n├╝m) */}
            {(() => {
              const hasSetLongTermGoal = isGradeTracking
                ? Boolean(goals.gradeClass || goals.gradeTarget)
                : Boolean(goals.targetSchool || goals.targetScore || goals.targetNet || goals.examGoalType);

              const showLongTermForm = !hasSetLongTermGoal || isEditingLongTermGoal;

              return (
                <div style={{ marginBottom: '1.25rem' }}>
                  <Card emoji="­şÅø´©Å" title="Uzun Vadeli Hedeflerim & S─▒nav Plan─▒m">
                    {!showLongTermForm ? (
                      /* Hedef Belirlendi─şinde G├Âr├╝nen ┼Ş─▒k ├ûzet Vitrini */
                      <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '0.85rem', padding: '1.15rem', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                              {isGradeTracking ? (goals.gradeTarget === 'Onur' ? 'Ô¡É' : goals.gradeTarget === 'Takdir' ? '­şÅà' : '­şğí') : '­şÅø´©Å'}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {goals.examGoalType || 'Hedef Plan─▒'}
                              </div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                                {isGradeTracking
                                  ? `${goals.gradeClass || 'S─▒n─▒f Belirtilmedi'} ┬À ${goals.gradeTerm === 'y─▒ll─▒k' ? 'Y─▒ll─▒k' : `${goals.gradeTerm}. D├Ânem`} ┬À Hedef: ${goals.gradeTarget || 'ÔÇö'}`
                                  : (goals.targetSchool || 'Hedef Okul / B├Âl├╝m Belirtilmedi')
                                }
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setIsEditingLongTermGoal(true)}
                            style={{
                              padding: '0.45rem 0.95rem', borderRadius: '0.65rem', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)',
                              border: '1px solid #cbd5e1', color: '#475569', fontWeight: 800, fontSize: '0.8rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                          >
                            Ô£Å´©Å Hedefleri D├╝zenle
                          </button>
                        </div>

                        {!isGradeTracking && (
                          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', paddingTop: '0.65rem', borderTop: '1px dashed #cbd5e1' }}>
                            {goals.targetScore && (
                              <div style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', color: '#15803d' }}>
                                ­şÅå Hedef Puan: {goals.targetScore}
                              </div>
                            )}
                            {goals.targetNet && (
                              <div style={{ background: '#e0e7ff', border: '1px solid #a5b4fc', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', color: '#4338ca' }}>
                                ­şÄ» Hedef Net: {goals.targetNet}
                              </div>
                            )}
                          </div>
                        )}

                        {isGradeTracking && goals.gradeTarget && (
                          <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 700, background: '#fef3c7', padding: '0.55rem 0.85rem', borderRadius: '0.5rem', border: '1px solid #fde68a' }}>
                            {goals.gradeTarget === 'Takdir' ? 'T├╝m derslerden 85 ve ├╝zeri ortalama hedefleniyor ­şÆ¬' :
                             goals.gradeTarget === 'Te┼şekk├╝r' ? 'T├╝m derslerden 70 ve ├╝zeri ortalama hedefleniyor ­şÆ¬' :
                             goals.gradeTarget === 'Onur' ? 'T├╝m derslerden Takdir belgesi hedefleniyor ­şîş' :
                             'Devams─▒zl─▒k ve ├Âdev takibi hedefleniyor ­şôÜ'}
                            {goals.targetScore && ` ┬À Maksimum devams─▒zl─▒k: ${goals.targetScore} g├╝n`}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Hedef D├╝zenleme Formu */
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                          <div>
                            <label style={lbl}>Hedef S─▒nav</label>
                            <select style={inp} value={isStandardExam ? goals.examGoalType : '├ûzel S─▒nav'} onChange={e => {
                              const val = e.target.value;
                              if (val === '├ûzel S─▒nav') {
                                setGoals(p => ({ ...p, examGoalType: '├ûzel S─▒nav', customExamName: p.customExamName || '' }));
                              } else {
                                setGoals(p => ({ ...p, examGoalType: val }));
                              }
                            }}>
                              <option value="LGS 2026">LGS (Liselere Ge├ği┼ş)</option>
                              <option value="YKS (TYT/AYT) 2026">YKS (TYT / AYT)</option>
                              <option value="KPSS">KPSS</option>
                              <option value="Ara S─▒n─▒f Takip & Takdir Hedefi">­şôè Ara S─▒n─▒f Takip & Takdir Hedefi</option>
                              <option value="├ûzel S─▒nav">Ô£Å´©Å ├ûzel S─▒nav (DGS, ALES, B─░LSEM...)</option>
                            </select>
                          </div>

                          {(!isStandardExam || goals.examGoalType === '├ûzel S─▒nav') && (
                            <div>
                              <label style={lbl}>├ûzel S─▒nav Ad─▒</label>
                              <input style={{ ...inp, borderColor: '#7c3aed', background: '#faf5ff' }}
                                value={goals.customExamName || (goals.examGoalType !== '├ûzel S─▒nav' ? goals.examGoalType : '')}
                                onChange={e => {
                                  const val = e.target.value;
                                  setGoals(p => ({ ...p, customExamName: val, examGoalType: val || '├ûzel S─▒nav' }));
                                }}
                                placeholder="├ûrn: DGS, B─░LSEM, ALES, Y├ûSD─░L, TUS..." />
                            </div>
                          )}

                          {isGradeTracking ? (
                            <>
                              <div>
                                <label style={lbl}>S─▒n─▒f / Seviye</label>
                                <select style={inp} value={goals.gradeClass} onChange={e => setGoals(p => ({ ...p, gradeClass: e.target.value }))}>
                                  <option value="">ÔÇö Se├ğin ÔÇö</option>
                                  {['1. S─▒n─▒f','2. S─▒n─▒f','3. S─▒n─▒f','4. S─▒n─▒f','5. S─▒n─▒f','6. S─▒n─▒f','7. S─▒n─▒f','8. S─▒n─▒f','9. S─▒n─▒f','10. S─▒n─▒f','11. S─▒n─▒f','12. S─▒n─▒f'].map(c => <option key={c}>{c}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={lbl}>D├Ânem</label>
                                <select style={inp} value={goals.gradeTerm} onChange={e => setGoals(p => ({ ...p, gradeTerm: e.target.value }))}>
                                  <option value="1">1. D├Ânem</option>
                                  <option value="2">2. D├Ânem</option>
                                  <option value="y─▒ll─▒k">Y─▒ll─▒k</option>
                                </select>
                              </div>
                              <div>
                                <label style={lbl}>Hedef Belgem</label>
                                <select style={{ ...inp, fontWeight: 800 }} value={goals.gradeTarget} onChange={e => setGoals(p => ({ ...p, gradeTarget: e.target.value }))}>
                                  <option value="Tak├ğek">­şşó Tak├ğek (Temel)</option>
                                  <option value="Te┼şekk├╝r">­şğí Te┼şekk├╝r (70ÔÇô84)</option>
                                  <option value="Takdir">­şÅà Takdir (85+)</option>
                                  <option value="Onur">Ô¡É Onur Belgesi (T├╝m dersler Takdir)</option>
                                </select>
                              </div>
                              <div>
                                <label style={lbl}>Devams─▒zl─▒k Hedefi</label>
                                <input style={inp} value={goals.targetScore} onChange={e => setGoals(p => ({ ...p, targetScore: e.target.value }))} placeholder="Maks. devams─▒zl─▒k (g├╝n)" />
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <label style={lbl}>Hedef Okul / B├Âl├╝m</label>
                                <input style={inp} value={goals.targetSchool} onChange={e => setGoals(p => ({ ...p, targetSchool: e.target.value }))} placeholder="├ûrn: Kabata┼ş Erkek Lisesi" />
                              </div>
                              <div>
                                <label style={lbl}>Puan Hedefim</label>
                                <input style={inp} value={goals.targetScore} onChange={e => setGoals(p => ({ ...p, targetScore: e.target.value }))} placeholder="├ûrn: 485" />
                              </div>
                              <div>
                                <label style={lbl}>Net Hedefim</label>
                                <input style={inp} value={goals.targetNet} onChange={e => setGoals(p => ({ ...p, targetNet: e.target.value }))} placeholder="├ûrn: 90" />
                              </div>
                            </>
                          )}
                        </div>

                        {hasSetLongTermGoal && (
                          <button
                            type="button"
                            onClick={() => setIsEditingLongTermGoal(false)}
                            style={{
                              marginTop: '1rem', width: '100%', padding: '0.6rem', borderRadius: '0.65rem',
                              background: '#4f46e5', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.85rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
                            }}
                          >
                            <CheckCircle2 size={16} /> Hedefleri Kaydet & Vitrine Al
                          </button>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              );
            })()}

            {/* ─░lerleme kartlar─▒ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
              {[
                { label: 'Ayl─▒k Hedefler', value: completedMonthly, max: (goals.monthlyGoals || []).length, color: '#2563eb', icon: '­şôà' },
                { label: 'Haftal─▒k Program', value: completedWeeklyItems, max: totalWeeklyItems, color: '#059669', icon: 'ÔÜí' },
                { label: 'G├╝nl├╝k Rutinler', value: completedDaily, max: totalDaily, color: '#dc2626', icon: '­şöÑ' },
                { label: 'Konular Tamamland─▒', value: completedTopics, max: totalTopics, color: '#7c3aed', icon: 'Ô£à' },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(255, 255, 255, 0.5)', borderRadius: '0.85rem', padding: '0.85rem', border: '1px solid rgba(255,255,255,1)' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontWeight: 900, fontSize: '1.3rem', color: item.color }}>{item.value}<span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>/{item.max || 'ÔÇö'}</span></div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>{item.label}</div>
                  {item.max > 0 && <Progress value={item.value} max={item.max} color={item.color} />}
                </div>
              ))}
            </div>

            {/* Son ├ğal─▒┼şma g├╝nl├╝kleri */}
            {dailyLogs.length > 0 && (
              <Card emoji="ÔÅ▒´©Å" title="Son ├çal─▒┼şmalar─▒m">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {dailyLogs.slice(0, 5).map(log => (
                    <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.85rem', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '0.65rem', fontSize: '0.82rem', border: '1px solid rgba(255,255,255,1)' }}>
                      <span style={{ color: '#64748b', fontWeight: 700, minWidth: 80 }}>{log.date}</span>
                      <span style={{ fontWeight: 900, color: '#4f46e5' }}>{log.studyHours}s</span>
                      <span style={{ color: '#374151', fontWeight: 700 }}>{log.questions} soru</span>
                      {log.sport && <span>­şÅâ</span>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Son deneme */}
            {mySubmissions.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '1.5px solid #bae6fd', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0c4a6e', marginBottom: 6 }}>­şôè Son Deneme: {mySubmissions[0].testTitle || 'ÔÇö'}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ background: '#0891b2', color: 'white', fontWeight: 900, fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderRadius: 99 }}>Net: {mySubmissions[0].score ?? 'ÔÇö'}</span>
                  <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.82rem' }}>Ô£à {mySubmissions[0].correctCount ?? 'ÔÇö'} D</span>
                  <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.82rem' }}>ÔØî {mySubmissions[0].wrongCount ?? 'ÔÇö'} Y</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ÔòÉÔòÉÔòÉ K─░┼Ş─░SEL B─░LG─░LER & ├û─ŞRENC─░ PROF─░L─░ ÔòÉÔòÉÔòÉ */}
        {activeTab === 'kisiselbilgiler' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Tip>
              ­şæñ <b>Ki┼şisel Bilgiler & ├û─şrenci Profili</b>: ├û─şrencinin ├Â─şrenme stili, veli ileti┼şim bilgileri, hedef ve ko├ğ de─şerlendirmeleri tek bir yerde d├╝zenlenir ve kaydedilir.
            </Tip>

            {/* 1. Temel ├û─şrenci & Okul Bilgileri */}
            <Card emoji="­şæñ" title="Temel ├û─şrenci & Okul Bilgileri">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={lbl}>Ad Soyad</label>
                  <input style={inp} value={personalInfo.fullName || ''} onChange={e => setPersonalInfo(p => ({ ...p, fullName: e.target.value }))} placeholder="├û─şrencinin Ad─▒ Soyad─▒" />
                </div>
                <div>
                  <label style={lbl}>Do─şum Tarihi</label>
                  <input type="date" style={inp} value={personalInfo.birthDate || ''} onChange={e => setPersonalInfo(p => ({ ...p, birthDate: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Cinsiyet</label>
                  <select style={inp} value={personalInfo.gender || ''} onChange={e => setPersonalInfo(p => ({ ...p, gender: e.target.value }))}>
                    <option value="">ÔÇö Se├ğin ÔÇö</option>
                    <option value="Erkek">Erkek</option>
                    <option value="K─▒z">K─▒z</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>S─▒n─▒f / Seviye</label>
                  <select style={inp} value={personalInfo.gradeClass || goals.gradeClass || ''} onChange={e => {
                    const val = e.target.value;
                    setPersonalInfo(p => ({ ...p, gradeClass: val }));
                    setGoals(g => ({ ...g, gradeClass: val }));
                  }}>
                    <option value="">ÔÇö Se├ğin ÔÇö</option>
                    {['1. S─▒n─▒f','2. S─▒n─▒f','3. S─▒n─▒f','4. S─▒n─▒f','5. S─▒n─▒f','6. S─▒n─▒f','7. S─▒n─▒f','8. S─▒n─▒f','9. S─▒n─▒f','10. S─▒n─▒f','11. S─▒n─▒f','12. S─▒n─▒f','Mezun'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Okul Ad─▒</label>
                  <input style={inp} value={personalInfo.schoolName || ''} onChange={e => setPersonalInfo(p => ({ ...p, schoolName: e.target.value }))} placeholder="Devam etti─şi okul..." />
                </div>
                <div>
                  <label style={lbl}>Alan / Bran┼ş</label>
                  <select style={inp} value={personalInfo.fieldBranch || 'Say─▒sal'} onChange={e => setPersonalInfo(p => ({ ...p, fieldBranch: e.target.value }))}>
                    <option value="Ortaokul / LGS">Ortaokul / LGS</option>
                    <option value="Say─▒sal">Say─▒sal (MF)</option>
                    <option value="E┼şit A─ş─▒rl─▒k">E┼şit A─ş─▒rl─▒k (TM)</option>
                    <option value="S├Âzel">S├Âzel (TS)</option>
                    <option value="Dil">Yabanc─▒ Dil (YDT)</option>
                    <option value="Genel">Genel Takip</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* 2. ─░leti┼şim & Veli Bilgileri */}
            <Card emoji="­şôŞ" title="─░leti┼şim & Veli Bilgileri">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={lbl}>├û─şrenci Telefonu</label>
                  <input style={inp} value={personalInfo.studentPhone || ''} onChange={e => setPersonalInfo(p => ({ ...p, studentPhone: e.target.value }))} placeholder="05xx xxx xx xx" />
                </div>
                <div>
                  <label style={lbl}>Veli Ad─▒ Soyad─▒</label>
                  <input style={inp} value={personalInfo.parentName || ''} onChange={e => setPersonalInfo(p => ({ ...p, parentName: e.target.value }))} placeholder="Velinin Ad─▒ Soyad─▒" />
                </div>
                <div>
                  <label style={lbl}>Yak─▒nl─▒k Derecesi</label>
                  <select style={inp} value={personalInfo.parentRelation || 'Anne'} onChange={e => setPersonalInfo(p => ({ ...p, parentRelation: e.target.value }))}>
                    <option value="Anne">Anne</option>
                    <option value="Baba">Baba</option>
                    <option value="Vasi / Yak─▒n─▒">Vasi / Yak─▒n─▒</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Veli Telefonu</label>
                  <input style={inp} value={personalInfo.parentPhone || ''} onChange={e => setPersonalInfo(p => ({ ...p, parentPhone: e.target.value }))} placeholder="05xx xxx xx xx" />
                </div>
                <div>
                  <label style={lbl}>Veli Mesle─şi</label>
                  <input style={inp} value={personalInfo.parentJob || ''} onChange={e => setPersonalInfo(p => ({ ...p, parentJob: e.target.value }))} placeholder="Velinin mesle─şi..." />
                </div>
                <div>
                  <label style={lbl}>┼Şehir / Adres</label>
                  <input style={inp} value={personalInfo.cityAddress || ''} onChange={e => setPersonalInfo(p => ({ ...p, cityAddress: e.target.value }))} placeholder="─░l, ─░l├ğe / ─░kamet adresi..." />
                </div>
              </div>
            </Card>

            {/* 3. ├û─şrenme Stili & ├çal─▒┼şma Profil Analizi */}
            <Card emoji="­şğá" title="├û─şrenme Stili & ├çal─▒┼şma Profili">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={lbl}>Bask─▒n ├û─şrenme Stili</label>
                  <select style={{ ...inp, fontWeight: 800 }} value={personalInfo.learningStyle || 'G├Ârsel'} onChange={e => setPersonalInfo(p => ({ ...p, learningStyle: e.target.value }))}>
                    <option value="G├Ârsel">­şæü´©Å G├Ârsel (Grafik, Renk, Harita, Okuma)</option>
                    <option value="─░┼şitsel">­şÄğ ─░┼şitsel (Dinleme, Anlatma, Tart─▒┼şma)</option>
                    <option value="Kinestetik">­şñ© Kinestetik (Yaparak-Ya┼şayarak, Dokunsal)</option>
                    <option value="Karma">­şîÇ Karma (├çoklu ├û─şrenme)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>G├╝nl├╝k Ortalama Uyku S├╝resi</label>
                  <select style={inp} value={personalInfo.sleepHours || '8'} onChange={e => setPersonalInfo(p => ({ ...p, sleepHours: e.target.value }))}>
                    <option value="6">6 Saat veya daha az</option>
                    <option value="7">7 Saat</option>
                    <option value="8">8 Saat (─░deal)</option>
                    <option value="9">9 Saat</option>
                    <option value="10">10 Saat veya daha fazla</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>En Verimli ├çal─▒┼şma Zaman─▒</label>
                  <select style={inp} value={personalInfo.bestStudyTime || 'Sabah'} onChange={e => setPersonalInfo(p => ({ ...p, bestStudyTime: e.target.value }))}>
                    <option value="Sabah">­şîà Erken Sabah (06:00 - 10:00)</option>
                    <option value="├û─şle">ÔİÇ´©Å G├╝n Ortas─▒ (10:00 - 15:00)</option>
                    <option value="Ak┼şam">­şîå Okul Sonras─▒ / Ak┼şam (16:00 - 21:00)</option>
                    <option value="Gece">­şîÖ Gece ├çal─▒┼şmas─▒ (21:00 sonras─▒)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Sevdi─şi / Ba┼şar─▒l─▒ Dersler</label>
                  <input style={inp} value={personalInfo.strongSubjects || ''} onChange={e => setPersonalInfo(p => ({ ...p, strongSubjects: e.target.value }))} placeholder="├ûrn: Matematik, Fen..." />
                </div>
                <div>
                  <label style={lbl}>Zorland─▒─ş─▒ / Destek ─░steyen Dersler</label>
                  <input style={inp} value={personalInfo.weakSubjects || ''} onChange={e => setPersonalInfo(p => ({ ...p, weakSubjects: e.target.value }))} placeholder="├ûrn: Paragraf, Fizik..." />
                </div>
                <div>
                  <label style={lbl}>Hobiler & ─░lgi Alanlar─▒</label>
                  <input style={inp} value={personalInfo.hobbies || ''} onChange={e => setPersonalInfo(p => ({ ...p, hobbies: e.target.value }))} placeholder="├ûrn: Basketbol, Satran├ğ, Ba─şlama..." />
                </div>
              </div>

              {/* Ders ├çal─▒┼ş─▒rken Ya┼şad─▒─ş─▒ Zorluklar Checkbox Grid */}
              <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed #e2e8f0' }}>
                <label style={{ ...lbl, marginBottom: '0.5rem' }}>Ders ├çal─▒┼ş─▒rken Kar┼ş─▒la┼ş─▒lan Ba┼şl─▒ca Zorluklar (├çoklu Se├ğim):</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    'Dikkat Da─ş─▒n─▒kl─▒─ş─▒ / Odaklanma',
                    'Zaman Y├Ânetimi / Planlama',
                    'S─▒nav Kayg─▒s─▒ / Stres',
                    'Motivasyon Eksikli─şi / Erteleme',
                    'H─▒zl─▒ Soru ├ç├Âzememe',
                    'Ezber Yapma Zorlu─şu',
                    'Telefon / Ekran Ba─ş─▒ml─▒l─▒─ş─▒'
                  ].map(challenge => {
                    const selectedList = personalInfo.studyChallenges || [];
                    const isSelected = selectedList.includes(challenge);
                    return (
                      <button
                        type="button"
                        key={challenge}
                        onClick={() => {
                          const next = isSelected
                            ? selectedList.filter(x => x !== challenge)
                            : [...selectedList, challenge];
                          setPersonalInfo(p => ({ ...p, studyChallenges: next }));
                        }}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.78rem', fontWeight: 800,
                          border: isSelected ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                          background: isSelected ? '#f3e8ff' : '#f8fafc',
                          color: isSelected ? '#6d28d9' : '#475569', cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        {isSelected ? 'Ô£ô ' : '+ '}{challenge}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* 4. Ko├ğ De─şerlendirme & ├ûzel Notlar */}
            <Card emoji="­şôØ" title="Ko├ğ ├û─şretmen De─şerlendirme & ├ûzel Notlar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={lbl}>Sa─şl─▒k Durumu / Alerji / ├ûzel Durumlar</label>
                  <input style={inp} value={personalInfo.healthNotes || ''} onChange={e => setPersonalInfo(p => ({ ...p, healthNotes: e.target.value }))} placeholder="Alerji, g├Âz bozuklu─şu, d├╝zenli ila├ğ kullan─▒m─▒ vb." />
                </div>
                <div>
                  <label style={lbl}>Ko├ğ ├û─şretmenin ├ûzel De─şerlendirme & G├Âzlem Notu</label>
                  <textarea
                    rows={3}
                    style={{ ...inp, height: 'auto', resize: 'vertical' }}
                    value={personalInfo.coachNotes || ''}
                    onChange={e => setPersonalInfo(p => ({ ...p, coachNotes: e.target.value }))}
                    placeholder="Ko├ğ ├Â─şretmenin ├Â─şrencinin genel geli┼şim s├╝reci, karakter ├Âzellikleri ve rehberlik takibi hakk─▒ndaki ├Âzel notlar─▒..."
                  />
                </div>
              </div>
            </Card>

            {/* Kaydet Butonu */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                onClick={handleSave}
                style={{
                  padding: '0.65rem 1.8rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  color: 'white', border: 'none', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <Save size={18} /> Ki┼şisel Bilgileri Kaydet
              </button>
            </div>
          </div>
        )}

        {/* ÔòÉÔòÉÔòÉ HEDEFLER─░M & TAK─░P PANOSU ÔòÉÔòÉÔòÉ */}
        {activeTab === 'hedefler' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* 1. ├£ST HERO HEDEF KARTI */}
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 75%, #6d28d9 100%)',
              borderRadius: 20, padding: '1.25rem 1.5rem', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
              boxShadow: '0 8px 24px rgba(49,46,129,0.22)', border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                  {isGradeTracking ? (goals.gradeTarget === 'Onur' ? 'Ô¡É' : goals.gradeTarget === 'Takdir' ? '­şÅà' : '­şÄô') : '­şÅø´©Å'}
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {goals.examGoalType || 'Hedef Plan─▒'}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'white', marginTop: 2 }}>
                    {isGradeTracking
                      ? `${goals.gradeClass || 'S─▒n─▒f Belirtilmedi'} ┬À ${goals.gradeTerm === 'y─▒ll─▒k' ? 'Y─▒ll─▒k' : `${goals.gradeTerm}. D├Ânem`} ┬À Hedef: ${goals.gradeTarget || 'Takdir'}`
                      : (goals.targetSchool || 'Hedef Okul / B├Âl├╝m Belirtilmedi')
                    }
                  </div>
                  {(goals.targetScore || goals.targetNet) && !isGradeTracking && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      {goals.targetScore && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.65rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800 }}>­şÅå Hedef Puan: {goals.targetScore}</span>}
                      {goals.targetNet && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.65rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800 }}>­şÄ» Hedef Net: {goals.targetNet}</span>}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setIsEditingLongTermGoal(prev => !prev)}
                style={{
                  background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.35)', borderRadius: 12, padding: '0.55rem 1.1rem',
                  fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                Ô£Å´©Å {isEditingLongTermGoal ? 'Kapat' : 'Hedefleri D├╝zenle'}
              </button>
            </div>

            {/* Form if editing long term goal */}
            {isEditingLongTermGoal && (
              <div style={{ background: 'white', borderRadius: 20, padding: '1.25rem', border: '1.5px solid #cbd5e1', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: 4 }}>Hedef S─▒nav</label>
                    <select style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.82rem' }} value={goals.examGoalType} onChange={e => setGoals(p => ({ ...p, examGoalType: e.target.value }))}>
                      <option value="LGS 2026">LGS (Liselere Ge├ği┼ş)</option>
                      <option value="YKS (TYT/AYT) 2026">YKS (TYT / AYT)</option>
                      <option value="KPSS">KPSS</option>
                      <option value="Ara S─▒n─▒f Takip & Takdir Hedefi">­şôè Ara S─▒n─▒f Takip & Takdir Hedefi</option>
                      <option value="├ûzel S─▒nav">Ô£Å´©Å ├ûzel S─▒nav</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: 4 }}>Hedef Okul / B├Âl├╝m</label>
                    <input type="text" style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.82rem' }} value={goals.targetSchool || ''} onChange={e => setGoals(p => ({ ...p, targetSchool: e.target.value }))} placeholder="├ûrn: Fen Lisesi / T─▒p" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: 4 }}>Hedef Puan</label>
                    <input type="text" style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.82rem' }} value={goals.targetScore || ''} onChange={e => setGoals(p => ({ ...p, targetScore: e.target.value }))} placeholder="├ûrn: 480" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: 4 }}>Hedef Net</label>
                    <input type="text" style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.82rem' }} value={goals.targetNet || ''} onChange={e => setGoals(p => ({ ...p, targetNet: e.target.value }))} placeholder="├ûrn: 85 Net" />
                  </div>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <button onClick={() => setIsEditingLongTermGoal(false)} style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, padding: '0.5rem 1.2rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>
                    Tamamland─▒
                  </button>
                </div>
              </div>
            )}

            {/* 2. SADE VE ┼ŞIK ─░STAT─░ST─░K ROZETLER─░ (4 KPI Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem' }}>
              {/* G├╝nl├╝k */}
              {(() => {
                const dDone = (goals.dailyGoals || []).filter(g => g.done).length;
                const dTotal = (goals.dailyGoals || []).length;
                const dPct = dTotal > 0 ? Math.round((dDone / dTotal) * 100) : 0;
                return (
                  <div style={{ background: '#fffbeb', borderRadius: 16, padding: '1rem', border: '1px solid #fef3c7' }}>
                    <div style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>ÔİÇ´©Å G├£NL├£K HEDEFLER</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#92400e', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{dDone}/{dTotal}</span>
                      <span style={{ fontSize: '0.8rem', background: '#fef3c7', padding: '0.15rem 0.5rem', borderRadius: 6 }}>%{dPct}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Haftal─▒k */}
              {(() => {
                const wDone = (goals.weeklyGoals || []).filter(g => g.done).length;
                const wTotal = (goals.weeklyGoals || []).length;
                const wPct = wTotal > 0 ? Math.round((wDone / wTotal) * 100) : 0;
                return (
                  <div style={{ background: '#f3e8ff', borderRadius: 16, padding: '1rem', border: '1px solid #e9d5ff' }}>
                    <div style={{ fontSize: '0.68rem', color: '#6b21a8', fontWeight: 800, textTransform: 'uppercase' }}>ÔÜí HAFTALIK HEDEFLER</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#7e22ce', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{wDone}/{wTotal}</span>
                      <span style={{ fontSize: '0.8rem', background: '#e9d5ff', padding: '0.15rem 0.5rem', borderRadius: 6 }}>%{wPct}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Ayl─▒k */}
              {(() => {
                const mDone = (goals.monthlyGoals || []).filter(g => g.done).length;
                const mTotal = (goals.monthlyGoals || []).length;
                const mPct = mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0;
                return (
                  <div style={{ background: '#eff6ff', borderRadius: 16, padding: '1rem', border: '1px solid #dbeafe' }}>
                    <div style={{ fontSize: '0.68rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>­şôà AYLIK HEDEFLER</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1d4ed8', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{mDone}/{mTotal}</span>
                      <span style={{ fontSize: '0.8rem', background: '#dbeafe', padding: '0.15rem 0.5rem', borderRadius: 6 }}>%{mPct}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Say─▒sal Saya├ğlar */}
              <div style={{ background: '#ecfdf5', borderRadius: 16, padding: '1rem', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '0.68rem', color: '#065f46', fontWeight: 800, textTransform: 'uppercase' }}>­şôè SAYISAL SAYA├çLAR</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#047857', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{(goals.counterGoals || []).length} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Hedef</span></span>
                  <span style={{ fontSize: '0.8rem', background: '#d1fae5', padding: '0.15rem 0.5rem', borderRadius: 6 }}>Soru/Sayfa</span>
                </div>
              </div>
            </div>

            {/* 3. TEK HEDEF & TAK─░P PANOSU */}
            <div style={{
              background: 'white', borderRadius: 24, padding: '1.5rem', border: '1px solid #e2e8f0',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '1.25rem'
            }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.85rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    ­şÄ»
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Hedef Listesi & Canl─▒ Takip Panosu</h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>G├Ârev ve say─▒sal hedeflerinizi canl─▒ takip edin.</div>
                  </div>
                </div>

                {/* ORTAK TEK HEDEF EKLEME FORMU */}
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (addKind === 'sayisal') {
                      handleCreateCounterGoal(e, newGoalType);
                    } else {
                      handleAddUnifiedGoal(e);
                    }
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', background: '#f8fafc', padding: '1rem', borderRadius: 16, border: '1px solid #cbd5e1' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                    {/* Periyot Se├ğimi */}
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginRight: 2 }}>Periyot:</span>
                      {['G├╝nl├╝k', 'Haftal─▒k', 'Ayl─▒k', '├ûzel'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewGoalType(t)}
                          style={{
                            padding: '0.32rem 0.65rem', borderRadius: 8, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                            background: newGoalType === t ? (t === 'G├╝nl├╝k' ? '#f59e0b' : t === 'Haftal─▒k' ? '#7c3aed' : t === 'Ayl─▒k' ? '#2563eb' : '#059669') : 'white',
                            color: newGoalType === t ? 'white' : '#64748b', border: newGoalType === t ? 'none' : '1px solid #cbd5e1'
                          }}
                        >
                          {t === 'G├╝nl├╝k' ? 'ÔİÇ´©Å G├╝nl├╝k' : t === 'Haftal─▒k' ? 'ÔÜí Haftal─▒k' : t === 'Ayl─▒k' ? '­şôà Ayl─▒k' : 'Ô¡É ├ûzel'}
                        </button>
                      ))}
                    </div>

                    {/* Hedef Tipi Se├ğimi */}
                    <div style={{ display: 'flex', gap: 4, background: '#e2e8f0', padding: 3, borderRadius: 10 }}>
                      <button
                        type="button"
                        onClick={() => setAddKind('gorev')}
                        style={{
                          padding: '0.3rem 0.75rem', borderRadius: 8, fontWeight: 800, fontSize: '0.75rem', border: 'none', cursor: 'pointer',
                          background: addKind === 'gorev' ? '#7c3aed' : 'transparent',
                          color: addKind === 'gorev' ? 'white' : '#475569', transition: 'all 0.15s'
                        }}
                      >
                        ­şôØ G├Ârev Ekle
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddKind('sayisal')}
                        style={{
                          padding: '0.3rem 0.75rem', borderRadius: 8, fontWeight: 800, fontSize: '0.75rem', border: 'none', cursor: 'pointer',
                          background: addKind === 'sayisal' ? '#4f46e5' : 'transparent',
                          color: addKind === 'sayisal' ? 'white' : '#475569', transition: 'all 0.15s'
                        }}
                      >
                        ­şôè Say─▒sal Saya├ğ Ekle
                      </button>
                    </div>
                  </div>

                  {/* Dinamik ─░├ğerik Alan─▒ */}
                  {addKind === 'gorev' ? (
                    <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {newGoalType === '├ûzel' && (
                        <input
                          type="text"
                          placeholder="Kategori..."
                          value={newGoalCategory}
                          onChange={e => setNewGoalCategory(e.target.value)}
                          style={{ width: 120, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}
                        />
                      )}
                      <input
                        type="text"
                        placeholder={`${newGoalType} yapaca─ş─▒n─▒z hedefi yaz─▒n (├Âr: Fizik 2. ├£nite Testlerini Bitir)...`}
                        value={newGoalText}
                        onChange={e => setNewGoalText(e.target.value)}
                        style={{ flex: 1, minWidth: 220, padding: '0.5rem 0.85rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
                      />
                      <button
                        type="submit"
                        style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem 1.25rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Plus size={15} /> Hedef Ekle
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', alignItems: 'end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: 2 }}>Saya├ğ Ad─▒</label>
                        <input type="text" placeholder="├Âr: Paragraf Sorusu" value={newCounterTitle} onChange={e => setNewCounterTitle(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700 }} required />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: 2 }}>Hedef Miktar─▒</label>
                        <input type="number" min="1" placeholder="├Âr: 200" value={newCounterTarget} onChange={e => setNewCounterTarget(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700 }} required />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: 2 }}>Birim</label>
                        <select value={newCounterUnit} onChange={e => setNewCounterUnit(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>
                          <option value="Soru">Soru</option>
                          <option value="Sayfa">Sayfa</option>
                          <option value="Saat">Saat</option>
                          <option value="Net">Net</option>
                          <option value="Adet">Adet</option>
                        </select>
                      </div>
                      <button type="submit" style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Plus size={15} /> Saya├ğ Ekle
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* PER─░YOTLARA G├ûRE L─░STE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* ÔİÇ´©Å G├£NL├£K HEDEFLER─░M */}
                {(() => {
                  const dTasks = goals.dailyGoals || [];
                  const dCounters = (goals.counterGoals || []).filter(c => c.period === 'G├╝nl├╝k');
                  const dCount = dTasks.length + dCounters.length;
                  return (
                    <div style={{ background: '#fffbeb', borderRadius: 18, padding: '1.15rem', border: '1px solid #fef3c7', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#b45309', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>ÔİÇ´©Å G├╝nl├╝k Hedeflerim ({dTasks.filter(g=>g.done).length + dCounters.filter(c=>(c.current||0)>=(c.target||1)).length}/{dCount})</span>
                      </div>

                      {dCount === 0 ? (
                        <div style={{ color: '#d97706', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', padding: '0.5rem' }}>Hen├╝z g├╝nl├╝k hedef veya saya├ğ eklenmedi.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {/* Say─▒sal Saya├ğlar (Ultra Modern Tasar─▒m) */}
                          {dCounters.map(cg => {
                            const current = cg.current || 0;
                            const target = cg.target || 100;
                            const pct = Math.min(100, Math.round((current / target) * 100));
                            const isCompleted = current >= target;
                            const unitName = (cg.unit || 'Soru').trim();
                            const icon = unitName.toLowerCase().includes('soru') ? '­şÄ»'
                                       : unitName.toLowerCase().includes('sayfa') ? '­şôÜ'
                                       : unitName.toLowerCase().includes('saat') ? 'ÔÅ▒´©Å'
                                       : unitName.toLowerCase().includes('net') ? '­şôê' : 'ÔÜí';

                            return (
                              <div
                                key={cg.id}
                                style={{
                                  background: isCompleted
                                    ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)'
                                    : 'linear-gradient(135deg, #ffffff 0%, #fffdf5 100%)',
                                  borderRadius: 16,
                                  padding: '0.9rem 1.1rem',
                                  border: isCompleted ? '1.5px solid #10b981' : '1px solid #fcd34d',
                                  boxShadow: isCompleted ? '0 4px 16px rgba(16,185,129,0.12)' : '0 4px 14px rgba(245,158,11,0.06)',
                                  display: 'flex', flexDirection: 'column', gap: '0.65rem'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 10, background: isCompleted ? '#d1fae5' : '#fef3c7', color: isCompleted ? '#047857' : '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                      {icon}
                                    </div>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>{cg.title}</span>
                                        {isCompleted && (
                                          <span style={{ fontSize: '0.65rem', background: '#10b981', color: 'white', padding: '0.1rem 0.45rem', borderRadius: 99, fontWeight: 900 }}>Ô£ô Tamamland─▒</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ÔİÇ´©Å G├╝nl├╝k Hedef ┬À {unitName}</div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: isCompleted ? '#059669' : '#1e293b' }}>
                                        {current} <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>/ {target} {unitName}</span>
                                      </div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: 8, background: isCompleted ? '#d1fae5' : '#fef3c7', color: isCompleted ? '#047857' : '#b45309', border: isCompleted ? '1px solid #a7f3d0' : '1px solid #fde68a' }}>
                                      %{pct}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <button type="button" onClick={() => handleResetSingleCounterGoal(cg.id)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }} title="S─▒f─▒rla"><RotateCcw size={13} /></button>
                                      <button type="button" onClick={() => handleDeleteCounterGoal(cg.id)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }} title="Sil"><Trash2 size={13} /></button>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ width: '100%', height: 8, background: '#fef3c7', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: isCompleted ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)', borderRadius: 99, transition: 'width 0.4s ease' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingTop: 2 }}>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {[10, 20, 50].map(step => (
                                      <button key={step} type="button" onClick={() => handleAddCounterProgress(cg.id, step)} style={{ padding: '0.18rem 0.45rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 800, background: '#ffffff', color: '#b45309', border: '1px solid #fde68a', cursor: 'pointer' }}>
                                        +{step} {unitName}
                                      </button>
                                    ))}
                                  </div>
                                  <form onSubmit={e => { e.preventDefault(); const amt = customAddInputs[cg.id]; if (amt) { handleAddCounterProgress(cg.id, amt); setCustomAddInputs(p => ({ ...p, [cg.id]: '' })); } }} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <input type="number" placeholder="+ Miktar" value={customAddInputs[cg.id] || ''} onChange={e => setCustomAddInputs(p => ({ ...p, [cg.id]: e.target.value }))} style={{ width: 75, padding: '0.22rem 0.45rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 700, outline: 'none' }} />
                                    <button type="submit" style={{ background: '#d97706', color: 'white', border: 'none', borderRadius: 6, padding: '0.22rem 0.55rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}>+ Ekle</button>
                                  </form>
                                </div>
                              </div>
                            );
                          })}

                          {/* G├Ârev Maddeleri */}
                          {dTasks.map(g => (
                            <CheckItem key={g.id} label={g.text} checked={g.done}
                              onChange={() => setGoals(p => ({ ...p, dailyGoals: p.dailyGoals.map(x => x.id === g.id ? { ...x, done: !x.done } : x) }))}
                              onDelete={() => setGoals(p => ({ ...p, dailyGoals: p.dailyGoals.filter(x => x.id !== g.id) }))} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ÔÜí HAFTALIK HEDEFLER─░M */}
                {(() => {
                  const wTasks = goals.weeklyGoals || [];
                  const wCounters = (goals.counterGoals || []).filter(c => c.period === 'Haftal─▒k');
                  const wCount = wTasks.length + wCounters.length;
                  return (
                    <div style={{ background: '#f3e8ff', borderRadius: 18, padding: '1.15rem', border: '1px solid #e9d5ff', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#6b21a8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>ÔÜí Haftal─▒k Hedeflerim ({wTasks.filter(g=>g.done).length + wCounters.filter(c=>(c.current||0)>=(c.target||1)).length}/{wCount})</span>
                      </div>

                      {wCount === 0 ? (
                        <div style={{ color: '#7e22ce', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', padding: '0.5rem' }}>Hen├╝z haftal─▒k hedef veya saya├ğ eklenmedi.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {/* Say─▒sal Saya├ğlar (Ultra Modern Tasar─▒m) */}
                          {wCounters.map(cg => {
                            const current = cg.current || 0;
                            const target = cg.target || 100;
                            const pct = Math.min(100, Math.round((current / target) * 100));
                            const isCompleted = current >= target;
                            const unitName = (cg.unit || 'Soru').trim();
                            const icon = unitName.toLowerCase().includes('soru') ? '­şÄ»'
                                       : unitName.toLowerCase().includes('sayfa') ? '­şôÜ'
                                       : unitName.toLowerCase().includes('saat') ? 'ÔÅ▒´©Å'
                                       : unitName.toLowerCase().includes('net') ? '­şôê' : 'ÔÜí';

                            return (
                              <div
                                key={cg.id}
                                style={{
                                  background: isCompleted
                                    ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)'
                                    : 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                                  borderRadius: 16,
                                  padding: '0.9rem 1.1rem',
                                  border: isCompleted ? '1.5px solid #10b981' : '1px solid #c084fc',
                                  boxShadow: isCompleted ? '0 4px 16px rgba(16,185,129,0.12)' : '0 4px 14px rgba(124,58,237,0.06)',
                                  display: 'flex', flexDirection: 'column', gap: '0.65rem'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 10, background: isCompleted ? '#d1fae5' : '#f3e8ff', color: isCompleted ? '#047857' : '#6b21a8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                      {icon}
                                    </div>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>{cg.title}</span>
                                        {isCompleted && (
                                          <span style={{ fontSize: '0.65rem', background: '#10b981', color: 'white', padding: '0.1rem 0.45rem', borderRadius: 99, fontWeight: 900 }}>Ô£ô Tamamland─▒</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ÔÜí Haftal─▒k Hedef ┬À {unitName}</div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: isCompleted ? '#059669' : '#1e293b' }}>
                                        {current} <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>/ {target} {unitName}</span>
                                      </div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: 8, background: isCompleted ? '#d1fae5' : '#f3e8ff', color: isCompleted ? '#047857' : '#6b21a8', border: isCompleted ? '1px solid #a7f3d0' : '1px solid #e9d5ff' }}>
                                      %{pct}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <button type="button" onClick={() => handleResetSingleCounterGoal(cg.id)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }} title="S─▒f─▒rla"><RotateCcw size={13} /></button>
                                      <button type="button" onClick={() => handleDeleteCounterGoal(cg.id)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }} title="Sil"><Trash2 size={13} /></button>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ width: '100%', height: 8, background: '#e9d5ff', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: isCompleted ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 'linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)', borderRadius: 99, transition: 'width 0.4s ease' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingTop: 2 }}>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {[10, 20, 50].map(step => (
                                      <button key={step} type="button" onClick={() => handleAddCounterProgress(cg.id, step)} style={{ padding: '0.18rem 0.45rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 800, background: '#ffffff', color: '#6b21a8', border: '1px solid #e9d5ff', cursor: 'pointer' }}>
                                        +{step} {unitName}
                                      </button>
                                    ))}
                                  </div>
                                  <form onSubmit={e => { e.preventDefault(); const amt = customAddInputs[cg.id]; if (amt) { handleAddCounterProgress(cg.id, amt); setCustomAddInputs(p => ({ ...p, [cg.id]: '' })); } }} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <input type="number" placeholder="+ Miktar" value={customAddInputs[cg.id] || ''} onChange={e => setCustomAddInputs(p => ({ ...p, [cg.id]: e.target.value }))} style={{ width: 75, padding: '0.22rem 0.45rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 700, outline: 'none' }} />
                                    <button type="submit" style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, padding: '0.22rem 0.55rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}>+ Ekle</button>
                                  </form>
                                </div>
                              </div>
                            );
                          })}

                          {/* G├Ârev Maddeleri */}
                          {wTasks.map(g => (
                            <CheckItem key={g.id} label={g.text} checked={g.done}
                              onChange={() => setGoals(p => ({ ...p, weeklyGoals: p.weeklyGoals.map(x => x.id === g.id ? { ...x, done: !x.done } : x) }))}
                              onDelete={() => setGoals(p => ({ ...p, weeklyGoals: p.weeklyGoals.filter(x => x.id !== g.id) }))} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ­şôà AYLIK HEDEFLER─░M */}
                {(() => {
                  const mTasks = goals.monthlyGoals || [];
                  const mCounters = (goals.counterGoals || []).filter(c => c.period === 'Ayl─▒k');
                  const mCount = mTasks.length + mCounters.length;
                  return (
                    <div style={{ background: '#eff6ff', borderRadius: 18, padding: '1.15rem', border: '1px solid #dbeafe', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e40af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>­şôà Ayl─▒k Hedeflerim ({mTasks.filter(g=>g.done).length + mCounters.filter(c=>(c.current||0)>=(c.target||1)).length}/{mCount})</span>
                      </div>

                      {mCount === 0 ? (
                        <div style={{ color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', padding: '0.5rem' }}>Hen├╝z ayl─▒k hedef veya saya├ğ eklenmedi.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {/* Say─▒sal Saya├ğlar (Ultra Modern Tasar─▒m) */}
                          {mCounters.map(cg => {
                            const current = cg.current || 0;
                            const target = cg.target || 100;
                            const pct = Math.min(100, Math.round((current / target) * 100));
                            const isCompleted = current >= target;
                            const unitName = (cg.unit || 'Soru').trim();
                            const icon = unitName.toLowerCase().includes('soru') ? '­şÄ»'
                                       : unitName.toLowerCase().includes('sayfa') ? '­şôÜ'
                                       : unitName.toLowerCase().includes('saat') ? 'ÔÅ▒´©Å'
                                       : unitName.toLowerCase().includes('net') ? '­şôê' : 'ÔÜí';

                            return (
                              <div
                                key={cg.id}
                                style={{
                                  background: isCompleted
                                    ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)'
                                    : 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
                                  borderRadius: 16,
                                  padding: '0.9rem 1.1rem',
                                  border: isCompleted ? '1.5px solid #10b981' : '1px solid #93c5fd',
                                  boxShadow: isCompleted ? '0 4px 16px rgba(16,185,129,0.12)' : '0 4px 14px rgba(37,99,235,0.06)',
                                  display: 'flex', flexDirection: 'column', gap: '0.65rem'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 10, background: isCompleted ? '#d1fae5' : '#dbeafe', color: isCompleted ? '#047857' : '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                      {icon}
                                    </div>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>{cg.title}</span>
                                        {isCompleted && (
                                          <span style={{ fontSize: '0.65rem', background: '#10b981', color: 'white', padding: '0.1rem 0.45rem', borderRadius: 99, fontWeight: 900 }}>Ô£ô Tamamland─▒</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>­şôà Ayl─▒k Hedef ┬À {unitName}</div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: isCompleted ? '#059669' : '#1e293b' }}>
                                        {current} <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>/ {target} {unitName}</span>
                                      </div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: 8, background: isCompleted ? '#d1fae5' : '#dbeafe', color: isCompleted ? '#047857' : '#1e40af', border: isCompleted ? '1px solid #a7f3d0' : '1px solid #bfdbfe' }}>
                                      %{pct}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <button type="button" onClick={() => handleResetSingleCounterGoal(cg.id)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }} title="S─▒f─▒rla"><RotateCcw size={13} /></button>
                                      <button type="button" onClick={() => handleDeleteCounterGoal(cg.id)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }} title="Sil"><Trash2 size={13} /></button>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ width: '100%', height: 8, background: '#dbeafe', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: isCompleted ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)', borderRadius: 99, transition: 'width 0.4s ease' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingTop: 2 }}>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {[10, 20, 50].map(step => (
                                      <button key={step} type="button" onClick={() => handleAddCounterProgress(cg.id, step)} style={{ padding: '0.18rem 0.45rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 800, background: '#ffffff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}>
                                        +{step} {unitName}
                                      </button>
                                    ))}
                                  </div>
                                  <form onSubmit={e => { e.preventDefault(); const amt = customAddInputs[cg.id]; if (amt) { handleAddCounterProgress(cg.id, amt); setCustomAddInputs(p => ({ ...p, [cg.id]: '' })); } }} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <input type="number" placeholder="+ Miktar" value={customAddInputs[cg.id] || ''} onChange={e => setCustomAddInputs(p => ({ ...p, [cg.id]: e.target.value }))} style={{ width: 75, padding: '0.22rem 0.45rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 700, outline: 'none' }} />
                                    <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '0.22rem 0.55rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}>+ Ekle</button>
                                  </form>
                                </div>
                              </div>
                            );
                          })}

                          {/* G├Ârev Maddeleri */}
                          {mTasks.map(g => (
                            <CheckItem key={g.id} label={g.text} checked={g.done}
                              onChange={() => setGoals(p => ({ ...p, monthlyGoals: p.monthlyGoals.map(x => x.id === g.id ? { ...x, done: !x.done } : x) }))}
                              onDelete={() => setGoals(p => ({ ...p, monthlyGoals: p.monthlyGoals.filter(x => x.id !== g.id) }))} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Ô¡É ├ûZEL HEDEFLER─░M */}
                {((goals.customGoals || []).length > 0 || (goals.counterGoals || []).some(c => c.period === '├ûzel')) && (
                  <div style={{ background: '#ecfdf5', borderRadius: 18, padding: '1.15rem', border: '1px solid #a7f3d0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#065f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Ô¡É ├ûzel Kategori Hedeflerim</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {(goals.customGoals || []).map(g => (
                        <CheckItem key={g.id} label={`${g.category ? `[${g.category}] ` : ''}${g.text}`} checked={g.done}
                          onChange={() => setGoals(p => ({ ...p, customGoals: p.customGoals.map(x => x.id === g.id ? { ...x, done: !x.done } : x) }))}
                          onDelete={() => setGoals(p => ({ ...p, customGoals: p.customGoals.filter(x => x.id !== g.id) }))} />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}



        {/* ÔòÉÔòÉÔòÉ ├çALI┼ŞMALARIM ÔòÉÔòÉÔòÉ */}
        {activeTab === 'calisma' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Tip>
              ÔÅ▒´©Å <b>Pratik ├çal─▒┼şma Panosu</b>: ├çal─▒┼şman─▒ 2 t─▒kla kaydet! H─▒zl─▒ s├╝re ve ders rozetlerini kullan. Soru ve s├╝re verilerin otomatik olarak saya├ğ hedeflerine de eklenir.
            </Tip>

            {/* ├£st ─░statistik ├ûzet Kartlar─▒ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: '0.9rem', padding: '1rem', color: 'white', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)' }}>
                <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 800, textTransform: 'uppercase' }}>Toplam ├çal─▒┼şma</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 2 }}>{totalDailyHours.toFixed(1)} <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Saat</span></div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: 2 }}>Kay─▒tl─▒ t├╝m oturumlar</div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius: '0.9rem', padding: '1rem', color: 'white', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)' }}>
                <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 800, textTransform: 'uppercase' }}>Toplam Soru</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 2 }}>{Math.round(totalDailyQuestions)} <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Soru</span></div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: 2 }}>├ç├Âz├╝len sorular</div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', borderRadius: '0.9rem', padding: '1rem', color: 'white', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)' }}>
                <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 800, textTransform: 'uppercase' }}>├çal─▒┼şma G├╝nleri</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 2 }}>{dailyLogs.length} <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>G├╝n</span></div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: 2 }}>D├╝zenli takip say─▒s─▒</div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: '0.9rem', padding: '1rem', color: 'white', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)' }}>
                <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 800, textTransform: 'uppercase' }}>Spor & Sa─şl─▒k</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 2 }}>{dailyLogs.filter(l => l.sport).length} <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>G├╝n</span></div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: 2 }}>Aktif ya┼şam takibi</div>
              </div>
            </div>

            {/* Yeni Pratik ├çal─▒┼şma Kay─▒t Kart─▒ */}
            <Card emoji="ÔÜí" title="Pratik ├çal─▒┼şma Giri┼şi (Tek T─▒kla Ekleyin)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

                {/* H─▒zl─▒ ├çal─▒┼şma T├╝r├╝ Se├ğimi */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '0.4rem' }}>­şÄ» ├çal─▒┼şma T├╝r├╝ Se├ğimi:</div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[
                      { label: '­şôû Konu ├çal─▒┼şmas─▒', type: 'Konu ├çal─▒┼şmas─▒' },
                      { label: '­şôÜ Kitap Okuma', type: 'Kitap Okuma' },
                      { label: 'Ô£Å´©Å Soru ├ç├Âz├╝m├╝', type: 'Soru ├ç├Âz├╝m├╝' },
                      { label: '­şöä Tekrar / Ezber', type: 'Tekrar' },
                      { label: '­şôØ Deneme / Test', type: 'Deneme' },
                      { label: '­şÆí Etkinlik / ├ûdev', type: '├ûdev' },
                    ].map(act => {
                      const isSelected = (newLog.activityType || 'Soru ├ç├Âz├╝m├╝') === act.type;
                      return (
                        <button
                          type="button"
                          key={act.type}
                          onClick={() => {
                            setNewLog(p => ({
                              ...p,
                              activityType: act.type,
                              revision: p.revision ? (p.revision.includes(act.label) ? p.revision : `${act.label} ┬À ${p.revision}`) : act.label
                            }));
                          }}
                          style={{
                            padding: '0.32rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.76rem', fontWeight: 800,
                            border: isSelected ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                            background: isSelected ? '#f3e8ff' : '#ffffff',
                            color: isSelected ? '#6d28d9' : '#475569', cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          {isSelected ? 'Ô£ô ' : ''}{act.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* H─▒zl─▒ S├╝re Rozetleri */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '0.4rem' }}>ÔÅ▒´©Å H─▒zl─▒ S├╝re Se├ğimi:</div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[
                      { label: '15 dk', val: '0.25' },
                      { label: '30 dk', val: '0.5' },
                      { label: '45 dk (Pomodoro)', val: '0.75' },
                      { label: '1 Saat', val: '1' },
                      { label: '1.5 Saat', val: '1.5' },
                      { label: '2 Saat', val: '2' },
                      { label: '3 Saat', val: '3' },
                    ].map(preset => {
                      const isSelected = String(newLog.studyHours) === preset.val;
                      return (
                        <button
                          type="button"
                          key={preset.label}
                          onClick={() => setNewLog(p => ({ ...p, studyHours: preset.val }))}
                          style={{
                            padding: '0.32rem 0.7rem', borderRadius: '0.45rem', fontSize: '0.78rem', fontWeight: 800,
                            border: isSelected ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                            background: isSelected ? '#f3e8ff' : '#f8fafc',
                            color: isSelected ? '#6d28d9' : '#334155', cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          {isSelected ? 'Ô£ô ' : ''}{preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* H─▒zl─▒ Ders Se├ğim Rozetleri */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '0.4rem' }}>­şôÜ H─▒zl─▒ Ders Se├ğimi:</div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {SUBJECTS.map(subName => {
                      const isSelected = (newLog.revision || '').includes(subName);
                      return (
                        <button
                          type="button"
                          key={subName}
                          onClick={() => {
                            setNewLog(p => {
                              const curr = p.revision ? p.revision.trim() : '';
                              if (curr.includes(subName)) return p;
                              const updated = curr ? `${curr}, ${subName}` : subName;
                              return { ...p, revision: updated };
                            });
                          }}
                          style={{
                            padding: '0.32rem 0.65rem', borderRadius: '0.45rem', fontSize: '0.76rem', fontWeight: 800,
                            border: isSelected ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            color: isSelected ? '#1d4ed8' : '#475569', cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          {isSelected ? 'Ô£ô ' : '+ '}{subName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detay Kutular─▒ Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed #e2e8f0' }}>
                  <div>
                    <label style={lbl}>Tarih</label>
                    <input style={inp} type="date" value={newLog.date} onChange={e => setNewLog(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>├çal─▒┼şma S├╝resi (saat)</label>
                    <input style={inp} type="number" step="0.25" value={newLog.studyHours} onChange={e => setNewLog(p => ({ ...p, studyHours: e.target.value }))} placeholder="├ûrn: 1.5" />
                  </div>
                  <div>
                    <label style={lbl}>Soru Say─▒s─▒ (Opsiyonel)</label>
                    <input style={inp} type="number" value={newLog.questions} onChange={e => setNewLog(p => ({ ...p, questions: e.target.value }))} placeholder="Soru yoksa bo┼ş b─▒rak" />
                  </div>
                  <div>
                    <label style={lbl}>Ders & Konu / Detay Notu</label>
                    <input style={inp} value={newLog.revision} onChange={e => setNewLog(p => ({ ...p, revision: e.target.value }))} placeholder="├ûrn: Konu tekrar─▒ / Kitap okuma..." />
                  </div>
                  <div>
                    <label style={lbl}>Uyku Yatma Saati</label>
                    <input style={inp} value={newLog.sleepTime} onChange={e => setNewLog(p => ({ ...p, sleepTime: e.target.value }))} placeholder="├ûrn: 23:30" />
                  </div>
                </div>

                {/* Alt Aksiyon ├çubu─şu */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.4rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.35rem 0.75rem', borderRadius: '0.55rem' }}>
                    <input type="checkbox" checked={newLog.sport} onChange={e => setNewLog(p => ({ ...p, sport: e.target.checked }))} /> ­şÅâ Bug├╝n Spor / Egzersiz Yapt─▒m
                  </label>

                  <button
                    onClick={() => {
                      if (!newLog.date) return;
                      const addedHours = parseFloat(newLog.studyHours) || 0;
                      const addedQuestions = parseFloat(newLog.questions) || 0;

                      // 1) Add to daily logs
                      setDailyLogs(p => [{ id: uid(), ...newLog }, ...p]);

                      // 2) Auto-increment matching Counter Goals!
                      if (addedQuestions > 0) {
                        handleGroupProgressSubmit('Soru', addedQuestions);
                      }
                      if (addedHours > 0) {
                        handleGroupProgressSubmit('Saat', addedHours);
                      }

                      // Reset form
                      setNewLog({ date: today(), studyHours: '', questions: '', revision: '', sport: false, sleepTime: '', activityType: 'Soru ├ç├Âz├╝m├╝' });
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: 'none',
                      borderRadius: '0.65rem', padding: '0.6rem 1.4rem', fontWeight: 900, fontSize: '0.85rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                    }}
                  >
                    <Plus size={16} /> ├çal─▒┼şmay─▒ Kaydet & Senkronize Et
                  </button>
                </div>
              </div>
            </Card>

            {/* ├çal─▒┼şma Ge├ğmi┼şi */}
            {dailyLogs.length > 0 && (
              <Card emoji="­şôï" title="├çal─▒┼şma Ge├ğmi┼şim & G├╝nl├╝k Takip">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {dailyLogs.map(log => (
                    <div key={log.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
                      padding: '0.65rem 0.9rem', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '0.75rem', fontSize: '0.82rem',
                      border: '1px solid rgba(255,255,255,1)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: '#64748b', background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.75rem' }}>
                          ­şôà {log.date}
                        </span>
                        {log.studyHours && (
                          <span style={{ fontWeight: 900, color: '#7c3aed', background: '#f3e8ff', padding: '0.15rem 0.55rem', borderRadius: '0.4rem', border: '1px solid #e9d5ff' }}>
                            ÔÅ▒´©Å {log.studyHours} Saat
                          </span>
                        )}
                        {parseFloat(log.questions) > 0 && (
                          <span style={{ fontWeight: 900, color: '#2563eb', background: '#eff6ff', padding: '0.15rem 0.55rem', borderRadius: '0.4rem', border: '1px solid #bfdbfe' }}>
                            Ô£Å´©Å {log.questions} Soru
                          </span>
                        )}
                        {log.sport && (
                          <span style={{ fontWeight: 800, color: '#15803d', background: '#f0fdf4', padding: '0.15rem 0.55rem', borderRadius: '0.4rem', border: '1px solid #bbf7d0', fontSize: '0.73rem' }}>
                            ­şÅâ Spor Yap─▒ld─▒
                          </span>
                        )}
                        {log.sleepTime && (
                          <span style={{ fontWeight: 800, color: '#d97706', background: '#fffbeb', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.73rem' }}>
                            ­şîÖ Yat─▒┼ş: {log.sleepTime}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ color: '#334155', fontWeight: 700, fontSize: '0.8rem' }}>
                          {log.revision || 'Detay girilmedi'}
                        </span>
                        <button
                          onClick={() => setDailyLogs(p => p.filter(x => x.id !== log.id))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2 }}
                          title="Kayd─▒ Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}





        {/* ÔòÉÔòÉÔòÉ MOT─░VASYON & ├çALI┼ŞMA STRATEJ─░LER─░ ÔòÉÔòÉÔòÉ */}
        {activeTab === 'motivasyon' && (
          (() => {
            // Canl─▒ Metrik ve Seviye Hesaplama
            const totalSolved = (goals.counterGoals || []).reduce((acc, c) => acc + (c.current || 0), 0);
            const totalCompletedGoals =
              (goals.dailyGoals || []).filter(g => g.done).length +
              (goals.weeklyGoals || []).filter(g => g.done).length +
              (goals.monthlyGoals || []).filter(g => g.done).length +
              (goals.counterGoals || []).filter(c => (c.current || 0) >= (c.target || 1)).length;

            const xp = (totalSolved * 2) + (totalCompletedGoals * 25) + (dailyQuestDone ? 50 : 0);
            let level = 1;
            let levelTitle = "­şî▒ ├çaylak ├û─şrenci";
            let nextThreshold = 200;
            let prevThreshold = 0;

            if (xp >= 1000) { level = 5; levelTitle = "­şææ Zirve Efsanesi"; nextThreshold = 2000; prevThreshold = 1000; }
            else if (xp >= 500) { level = 4; levelTitle = "­şğá Odak ┼Şampiyonu"; nextThreshold = 1000; prevThreshold = 500; }
            else if (xp >= 250) { level = 3; levelTitle = "­şÄ» Soru Avc─▒s─▒"; nextThreshold = 500; prevThreshold = 250; }
            else if (xp >= 100) { level = 2; levelTitle = "ÔÜí Disiplin ├ç─▒ra─ş─▒"; nextThreshold = 250; prevThreshold = 100; }

            const levelProgressPct = Math.min(100, Math.round(((xp - prevThreshold) / (nextThreshold - prevThreshold)) * 100));

            const filteredQuotes = selectedQuoteCategory === 'T├╝m├╝'
              ? MOTIVATION_QUOTES
              : MOTIVATION_QUOTES.filter(q => q.category === selectedQuoteCategory);

            const currentQ = filteredQuotes[quoteIdx % filteredQuotes.length] || MOTIVATION_QUOTES[0];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <Tip>
                  ­şÜÇ <b>Motivasyon & Zafer Merkezi</b>: Canl─▒ seviyeni takip et, g├╝n├╝n zafer g├Ârevini tamamla ve ilham verici stratejilerle zihnini zirveye ta┼ş─▒!
                </Tip>

                {/* 1. SEV─░YE & SER─░ HEADER PANOSU */}
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311b92 100%)',
                  borderRadius: 24, padding: '1.5rem 1.75rem', color: 'white',
                  boxShadow: '0 12px 35px rgba(15, 23, 42, 0.25)', position: 'relative', overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.6rem', boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
                        border: '2px solid rgba(255,255,255,0.3)'
                      }}>
                        ­şÅå
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>
                            Level {level}: {levelTitle}
                          </span>
                          <span style={{ fontSize: '0.7rem', background: '#f59e0b', color: '#78350f', padding: '0.15rem 0.55rem', borderRadius: 99, fontWeight: 900 }}>
                            {xp} XP
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, marginTop: 2 }}>
                          Sonraki Seviyeye: <b style={{ color: '#a7f3d0' }}>{Math.max(0, nextThreshold - xp)} XP</b> Kald─▒ ┬À {totalCompletedGoals} Hedef Tamamland─▒
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '0.5rem 0.9rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>­şöÑ Kesintisiz Seri</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f59e0b', marginTop: 1 }}>7 G├╝n Seride</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '0.5rem 0.9rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>­şÄ» ├ç├Âz├╝len Soru</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#38bdf8', marginTop: 1 }}>{totalSolved} Soru</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', marginBottom: 5 }}>
                      <span>Seviye ─░lerlemesi (%{levelProgressPct})</span>
                      <span>{xp} / {nextThreshold} XP</span>
                    </div>
                    <div style={{ width: '100%', height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        width: `${levelProgressPct}%`, height: '100%',
                        background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)',
                        borderRadius: 99, transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                </div>

                {/* 2. D─░NAM─░K CANLI KO├ç DE─ŞERLEND─░RMES─░ */}
                <div style={{
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  borderRadius: 20, padding: '1.25rem 1.5rem', border: '1.5px solid #a7f3d0',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', gap: 14
                }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                    ­şÆí
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Ak─▒ll─▒ Ko├ğ De─şerlendirmesi & Canl─▒ Tavsiye
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#064e3b', marginTop: 2, lineHeight: 1.4 }}>
                      {totalCompletedGoals > 3
                        ? "­şÜÇ Muazzam bir ivme yakalad─▒n! Hedeflerini tek tek tamaml─▒yorsun. Bu disiplin seni istedi─şin liseye/├╝niversiteye ta┼ş─▒yacak!"
                        : totalSolved > 50
                        ? "ÔÜí Soru saya├ğlar─▒ndaki harika ilerleme dikkat ├ğekiyor! Yanl─▒┼ş yapt─▒─ş─▒n sorular─▒n ├╝zerine gitmeyi unutma."
                        : "­şî▒ Ba┼şar─▒ b├╝y├╝k ad─▒mlarla de─şil, bug├╝n ataca─ş─▒n k├╝├ğ├╝k bir ad─▒mla ba┼şlar. Hemen 20 soru ├ğ├Âzerek motoru ├ğal─▒┼şt─▒r!"}
                    </div>
                  </div>
                </div>

                {/* 3. G├£N├£N M─░N─░ ZAFER M├£CADELES─░ */}
                <div style={{
                  background: dailyQuestDone ? '#f0fdf4' : '#fffbeb',
                  borderRadius: 20, padding: '1.25rem 1.5rem',
                  border: dailyQuestDone ? '1.5px solid #86efac' : '1.5px solid #fde68a',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: '1.8rem' }}>{dailyQuestDone ? '­şÄë' : '­şÄ»'}</div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 900, color: dailyQuestDone ? '#166534' : '#92400e', textTransform: 'uppercase' }}>
                        G├╝n├╝n Mini Zafer G├Ârevi
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: dailyQuestDone ? '#14532d' : '#78350f', marginTop: 2 }}>
                        {dailyQuestDone ? "Harika! Bug├╝n├╝n Zafer G├Ârevini Tamamlad─▒n (+50 XP Kazand─▒n!)" : "Bug├╝n 1 Konu Tekrar─▒ Yap veya En Az 30 Soru ├ç├Âz!"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !dailyQuestDone;
                      setDailyQuestDone(nextVal);
                      localStorage.setItem('dailyQuestDone_' + today(), nextVal ? 'true' : 'false');
                    }}
                    style={{
                      background: dailyQuestDone ? '#10b981' : '#f59e0b',
                      color: 'white', border: 'none', borderRadius: 12,
                      padding: '0.65rem 1.25rem', fontWeight: 900, fontSize: '0.85rem',
                      cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    {dailyQuestDone ? 'Ô£ô G├Ârev Tamamland─▒ (+50 XP)' : '­şÜÇ G├Ârevi Tamamlad─▒m (+50 XP)'}
                  </button>
                </div>

                {/* 4. ─░LHAM K├£T├£PHANES─░ & KATEGOR─░K S├ûZ KARTI */}
                <div style={{
                  background: 'white', borderRadius: 24, padding: '1.5rem', border: '1px solid #e2e8f0',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '1.1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={22} color="#7c3aed" />
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>G├╝n├╝n ─░lham Verici S├Âz├╝ & K├╝t├╝phanesi</h3>
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {['T├╝m├╝', 'Disiplin', 'Eylem', 'Zafer', 'Odak', '─░nan├ğ', '├ûzg├╝ven'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { setSelectedQuoteCategory(cat); setQuoteIdx(0); }}
                          style={{
                            padding: '0.28rem 0.65rem', borderRadius: 8, fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                            background: selectedQuoteCategory === cat ? '#7c3aed' : '#f1f5f9',
                            color: selectedQuoteCategory === cat ? 'white' : '#475569',
                            border: selectedQuoteCategory === cat ? 'none' : '1px solid #cbd5e1'
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)',
                    borderRadius: 20, padding: '1.5rem 1.75rem', color: 'white',
                    boxShadow: '0 8px 25px rgba(124, 58, 237, 0.25)', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.7rem', borderRadius: 99, backdropFilter: 'blur(4px)' }}>
                        ­şÅÀ´©Å {currentQ.category}
                      </span>

                      <button
                        type="button"
                        onClick={() => setQuoteIdx((quoteIdx + 1) % filteredQuotes.length)}
                        style={{
                          background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                          borderRadius: 10, padding: '0.35rem 0.85rem', color: 'white',
                          fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(6px)'
                        }}
                      >
                        ­şÄ▓ Sonraki S├Âz ({quoteIdx + 1}/{filteredQuotes.length})
                      </button>
                    </div>

                    <div style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.5, fontStyle: 'italic', marginBottom: '0.85rem' }}>
                      "{currentQ.quote}"
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.9rem', fontWeight: 800, opacity: 0.9 }}>
                      ÔÇö {currentQ.author}
                    </div>
                  </div>
                </div>

                {/* 5. KO├çTAN STRATEJ─░K TAVS─░YELER */}
                <Card emoji="­şÆí" title="Ko├ğtan Derece Yapt─▒ran ├çal─▒┼şma ├ûnerileri & Stratejiler">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div style={{ background: '#f8fafc', borderRadius: '0.85rem', padding: '1rem', border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.3rem' }}>­şğá</span>
                        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b' }}>1. Aktif Hat─▒rlama (Active Recall)</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.55, fontWeight: 600 }}>
                        Sadece alt─▒n─▒ ├ğizerek okuma! Bir konuyu okuduktan sonra kitab─▒ kapat─▒p kendi c├╝mlelerinle bir k├ó─ş─▒da yaz veya anlat.
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: '0.85rem', padding: '1rem', border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.3rem' }}>ÔÅ▒´©Å</span>
                        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b' }}>2. Pomodoro & Odaklanma</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.55, fontWeight: 600 }}>
                        25 dakika kesintisiz odaklan + 5 dakika mola. 4 blok sonras─▒ 20 dakikal─▒k uzun mola ver. Zihnin asla yorulmaz!
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: '0.85rem', padding: '1rem', border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.3rem' }}>Ô£ı´©Å</span>
                        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b' }}>3. Yanl─▒┼ş Defteri (Fener Defteri)</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.55, fontWeight: 600 }}>
                        S─▒nav─▒ kazand─▒ran do─şru yapt─▒klar─▒n de─şil, yanl─▒┼şlar─▒ndan ├Â─şrendiklerindir. Yanl─▒┼ş sorular─▒n─▒ bir not defterinde biriktir!
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: '0.85rem', padding: '1rem', border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.3rem' }}>­şô▒</span>
                        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b' }}>4. Dijital Detoks & Sessiz Alan</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.55, fontWeight: 600 }}>
                        ├çal─▒┼ş─▒rken telefonunu ba┼şka bir odaya koy veya sessize al. Bildirimler olmadan odaklanma kaliten 2 kat─▒na ├ğ─▒kar!
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 6. K─░┼Ş─░SEL MOT─░VASYON VE ZAFER DEFTER─░ */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <Card emoji="Ô¡É" title="Benim Haftal─▒k Mottom">
                    <textarea
                      style={{ ...ta, background: '#fffbeb', borderColor: '#fde68a', minHeight: 75, fontWeight: 700, color: '#92400e' }}
                      value={motivation.weekQuote}
                      onChange={e => setMotivation(p => ({ ...p, weekQuote: e.target.value }))}
                      placeholder="Bu hafta seni aya─şa kald─▒racak ki┼şisel c├╝mleni yaz..."
                    />
                  </Card>

                  <Card emoji="­şÅå" title="Bu Hafta Ba┼şard─▒klar─▒m & Zaferlerim">
                    <textarea
                      style={{ ...ta, background: '#f0fdf4', borderColor: '#bbf7d0', minHeight: 75, fontWeight: 700, color: '#166534' }}
                      value={motivation.achievements}
                      onChange={e => setMotivation(p => ({ ...p, achievements: e.target.value }))}
                      placeholder="├ç├Âzd├╝─ş├╝n zor sorular, tamamlad─▒─ş─▒n konular... Her ba┼şar─▒n─▒ buraya yaz ve kendini kutla! ­şÄë"
                    />
                  </Card>

                  <Card emoji="­şÆî" title="S─▒nav G├╝n├╝ Kendime Not">
                    <textarea
                      style={{ ...ta, background: '#f0f4ff', borderColor: '#c7d2fe', minHeight: 75, fontWeight: 700, color: '#3730a3' }}
                      value={motivation.selfNote}
                      onChange={e => setMotivation(p => ({ ...p, selfNote: e.target.value }))}
                      placeholder="S─▒nav g├╝n├╝ masaya oturdu─şunda zihninde ne olmal─▒? Kendine g├╝ven mesaj─▒n─▒ yaz..."
                    />
                  </Card>

                  <Card emoji="­şÄü" title="Hedef ├ûd├╝l Sistemim">
                    <textarea
                      style={{ ...ta, background: '#fdf2f8', borderColor: '#f0abfc', minHeight: 75, fontWeight: 700, color: '#831843' }}
                      value={motivation.rewardSystem}
                      onChange={e => setMotivation(p => ({ ...p, rewardSystem: e.target.value }))}
                      placeholder="Hedeflerimi tamamlarsam kendime hediyem: ├ûrn: 500 Soru = Sinema Bileti ­şÄ¼"
                    />
                  </Card>
                </div>

                {/* Kaydet Butonu */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleSave}
                    style={{
                      padding: '0.65rem 1.8rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                      color: 'white', border: 'none', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                  >
                    <Save size={18} /> Motivasyon Notlar─▒m─▒ Kaydet
                  </button>
                </div>
              </div>
            );
          })()
        )}

        {/* ÔòÉÔòÉÔòÉ ALI┼ŞKANLIKLARIM (Z─░NC─░R─░ KIRMA SEKMES─░) ÔòÉÔòÉÔòÉ */}
        {activeTab === 'aliskanlik' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Tip>Zinciri K─▒rma! Her g├╝n tamamlad─▒─ş─▒n al─▒┼şkanl─▒klar─▒ i┼şaretle, serini bozma ve hedeflerine ad─▒m ad─▒m ula┼ş!</Tip>

            {/* Zinciri K─▒rma ─░statistik Kartlar─▒ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', borderRadius: '1rem', padding: '1.15rem', color: 'white', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.25)' }}>
                <div style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: 700, marginBottom: 4 }}>EN UZUN AKT─░F SER─░</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  ­şöÑ {Math.max(0, ...habits.map(h => calculateHabitStreak(h).currentStreak))} G├╝n
                </div>
                <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: 4 }}>Kesintisiz al─▒┼şkanl─▒k seriniz</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '1rem', padding: '1.15rem', border: '1px solid rgba(255,255,255,1)' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: 4 }}>TOPLAM ─░┼ŞARETLENEN</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>
                  {habits.reduce((sum, h) => sum + Object.values(h.days || {}).filter(Boolean).length, 0)} / {habits.length * 7}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>Haftal─▒k yap─▒lan al─▒┼şkanl─▒k</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '1rem', padding: '1.15rem', border: '1px solid rgba(255,255,255,1)' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: 4 }}>Z─░NC─░R─░ TAMAMLIYOR</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#6366f1' }}>
                  {habits.filter(h => calculateHabitStreak(h).maxStreak >= 5).length} Al─▒┼şkanl─▒k
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>5+ g├╝n ├╝st ├╝ste yap─▒lan</div>
              </div>
            </div>

            {/* Al─▒┼şkanl─▒k Takibi & Zincir G├Âr├╝n├╝m├╝ */}
            <Card emoji="­şöÑ" title="Al─▒┼şkanl─▒k Takibim & Seri Rekorlar─▒">
              <form onSubmit={e => { e.preventDefault(); if (newHabit.trim()) { setHabits(p => [...p, { id: uid(), label: newHabit.trim(), days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) }]); setNewHabit(''); }}} style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
                <input style={{ ...inp, flex: 1 }} value={newHabit} onChange={e => setNewHabit(e.target.value)} placeholder="Yeni al─▒┼şkanl─▒k ekle (├Âr: Paragraf ├ç├Âz, Erken Kalk)..." />
                <button type="submit" style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1.15rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={16} /> Ekle
                </button>
              </form>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: 500 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 800, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Al─▒┼şkanl─▒k</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 800, fontSize: '0.75rem', color: '#ea580c', width: 95 }}>Seri / Zincir</th>
                      {weekDates.map(w => (
                        <th
                          key={w.dayName}
                          style={{
                            textAlign: 'center', width: 55, padding: '0.35rem 0.2rem',
                            background: w.isToday ? '#ffedd5' : 'transparent',
                            borderRadius: w.isToday ? '0.5rem 0.5rem 0 0' : '0'
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', fontWeight: 900, color: w.isToday ? '#c2410c' : '#475569' }}>{w.dayName}</div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: w.isToday ? '#ea580c' : '#94a3b8' }}>{w.fullDateStr}</div>
                        </th>
                      ))}
                      <th style={{ width: 35 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map(h => {
                      const streakInfo = calculateHabitStreak(h);
                      const count = Object.values(h.days || {}).filter(Boolean).length;

                      return (
                        <tr key={h.id}>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '0.65rem 0 0 0.65rem', border: '1px solid rgba(255,255,255,1)', borderRight: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                              <button
                                onClick={() => setSelectedMonthlyHabit(h)}
                                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                title="Ayl─▒k takvim ve detay─▒n─▒ g├Âr"
                              >
                                <span>{h.label}</span>
                                <span style={{ fontSize: '0.7rem', color: '#6366f1', background: '#eef2ff', padding: '0.1rem 0.35rem', borderRadius: 4, fontWeight: 700 }}>­şôà Ayl─▒k</span>
                              </button>
                              {count === 7 && <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: 4, fontWeight: 900 }}>ÔÜí 7/7</span>}
                            </div>
                          </td>

                          {/* Seri Badgesi */}
                          <td style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255,255,255,1)', borderLeft: 'none', borderRight: 'none', padding: '0.4rem 0.25rem' }}>
                            <button
                              onClick={() => setSelectedMonthlyHabit(h)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.2rem 0.55rem', borderRadius: '1rem',
                                background: streakInfo.currentStreak >= 3 ? '#ffedd5' : '#f1f5f9',
                                color: streakInfo.currentStreak >= 3 ? '#c2410c' : '#64748b',
                                fontWeight: 900, fontSize: '0.75rem', border: streakInfo.currentStreak >= 3 ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                                cursor: 'pointer'
                              }}
                              title="Ayl─▒k takvimi incele"
                            >
                              ­şöÑ {streakInfo.currentStreak} G├╝n
                            </button>
                          </td>

                          {/* G├╝nl├╝k Kutucuklar */}
                          {weekDates.map((w) => {
                            const d = w.dayName;
                            const isChecked = h.days?.[d];
                            const isToday = w.isToday;

                            return (
                              <td key={d} style={{ textAlign: 'center', background: isToday ? '#fff7ed' : '#f8fafc', border: isToday ? '1px solid #fdba74' : '1px solid #e2e8f0', borderLeft: 'none', borderRight: 'none', padding: 4 }}>
                                <button
                                  onClick={() => toggleHabitDay(h.id, d, w.isoDate)}
                                  style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: isChecked ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'white',
                                    border: isChecked ? 'none' : isToday ? '2px solid #fb923c' : '2px solid #cbd5e1',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto',
                                    transition: 'all 0.15s',
                                    boxShadow: isChecked ? '0 2px 6px rgba(220, 38, 38, 0.3)' : 'none'
                                  }}
                                  title={`${d} - ${w.fullDateStr}${isToday ? ' (Bug├╝n)' : ''}`}
                                >
                                  {isChecked && <Check size={14} color="white" strokeWidth={3} />}
                                </button>
                              </td>
                            );
                          })}

                          <td style={{ background: 'rgba(255, 255, 255, 0.5)', borderRadius: '0 0.65rem 0.65rem 0', border: '1px solid rgba(255,255,255,1)', borderLeft: 'none', textAlign: 'center' }}>
                            <button onClick={() => setHabits(p => p.filter(x => x.id !== h.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4 }} title="Sil">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ÔòÉÔòÉÔòÉ DENEME SONU├çLARIM ÔòÉÔòÉÔòÉ */}
        {activeTab === 'denemeler' && (
          <div>
            <Tip>├ç├Âzd├╝─ş├╝n online s─▒navlar buraya otomatik yans─▒r. D─▒┼şar─▒da girdi─şin denemeleri de yukar─▒daki buton ile ekleyebilirsin!</Tip>

            {/* Top Action Bar with Add Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', background: 'rgba(255, 255, 255, 0.5)', padding: '0.85rem 1.1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,1)', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>Harici / Fiziki Deneme Kayd─▒</span>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Fiziki girdi─şin denemelerin D/Y/B ve netlerini a├ğ─▒l─▒r pencereden kolayca ekle.</div>
              </div>
              <button onClick={() => setShowMockModal(true)} style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.1rem', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
                <Plus size={16} /> ÔŞò Yeni Deneme Sonucu Ekle
              </button>
            </div>

            {/* ­şÅå GENEL DENEME SINAVLARI */}
            {generalTrialExams.length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', fontWeight: 700 }}>
                <BarChart3 size={40} color="#e2e8f0" style={{ margin: '0 auto 1rem' }} />
                Hen├╝z ├ğ├Âz├╝lm├╝┼ş veya eklenmi┼ş Genel Deneme S─▒nav─▒ yok.
              </div>
            )}

            {generalTrialExams.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>­şÅå</span> Genel Testler ({generalTrialExams.length})
                </div>

                {/* Geli┼şim Grafi─şi */}
                {generalTrialExams.length > 0 && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.5)', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendingUp size={18} style={{ color: '#7c3aed' }} /> Net Geli┼şim Grafi─şi
                      </div>
                      <select 
                        value={chartMetric} 
                        onChange={(e) => setChartMetric(e.target.value)}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#334155', background: 'white', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="Toplam Net">Genel (Toplam Net)</option>
                        {Array.from(new Set(generalTrialExams.flatMap(e => Object.keys(e.scores || {})))).map(s => (
                          <option key={s} value={s}>{s} Net</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: '100%', height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...generalTrialExams].reverse().map((s, i) => {
                           let net = 0;
                           if (chartMetric === 'Toplam Net') {
                              net = s.totalNet;
                           } else {
                              if (s.scores && s.scores[chartMetric]) {
                                 net = s.scores[chartMetric].net !== undefined ? parseFloat(s.scores[chartMetric].net) : 0;
                              }
                           }
                           return { name: `D${i + 1}`, Net: parseFloat(Number(net).toFixed(2)), fullName: s.title, date: s.date };
                        })}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} domain={['dataMin - 5', 'dataMax + 5']} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '0.8rem', fontWeight: 700 }}
                            formatter={(value) => [`${value} Net`, 'Sonu├ğ']}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                          />
                          <Line type="monotone" dataKey="Net" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4, fill: '#7c3aed', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#6d28d9' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* ├ûzet istatistik */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  {[
                    { label: 'Toplam Deneme', value: generalTrialExams.length, color: '#7c3aed' },
                    { label: 'Ortalama Net', value: (generalTrialExams.reduce((s, x) => s + (x.totalNet || 0), 0) / generalTrialExams.length).toFixed(1), color: '#2563eb' },
                    { label: 'En Y├╝ksek Net', value: Math.max(...generalTrialExams.map(x => x.totalNet || 0)).toFixed(1), color: '#059669' },
                    { label: 'Son Deneme', value: generalTrialExams[0]?.totalNet ?? 'ÔÇö', color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255, 255, 255, 0.5)', borderRadius: '0.85rem', padding: '0.85rem', textAlign: 'center', border: '1px solid rgba(255,255,255,1)' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.3rem', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Deneme Listesi */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {generalTrialExams.map((s, i) => (
                    <div key={s.id || i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0.85rem 1rem', background: i === 0 ? '#f5f3ff' : '#f8fafc', borderRadius: '0.85rem', border: i === 0 ? '1.5px solid #ddd6fe' : '1px solid #e2e8f0' }}>
                      <div 
                        onClick={() => toggleExamExpand(s.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#7c3aed' : '#e2e8f0', color: i === 0 ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{s.title}</span>
                            {s.sourceType === 'online' && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.45rem', borderRadius: 4 }}>ÔÜí Online S─▒nav</span>
                            )}
                            {s.sourceType === 'optik' && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '0.15rem 0.45rem', borderRadius: 4 }}>­şÄ» Optik Form Deneme</span>
                            )}
                            {s.sourceType === 'manual' && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: 4 }}>­şôï Fiziki Deneme</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>Tarih: {s.date}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 6, fontSize: '0.75rem', fontWeight: 800, marginRight: 8, background: 'rgba(255,255,255,0.6)', padding: '0.2rem 0.6rem', borderRadius: 20 }}>
                             <span style={{ color: '#10b981' }}>{s.totalCorrect || 0}D</span>
                             <span style={{ color: '#ef4444' }}>{s.totalWrong || 0}Y</span>
                             <span style={{ color: '#94a3b8' }}>{s.totalEmpty || 0}B</span>
                          </div>
                          <span style={{ fontWeight: 900, fontSize: '1.15rem', color: '#7c3aed' }}>{s.totalNet}</span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>net</span>
                          <ChevronDown size={18} style={{ color: '#94a3b8', transform: expandedExams[s.id] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 4 }} />
                          <button type="button" onClick={(e) => {
                            e.stopPropagation();
                            if (!window.confirm("Bu denemeyi silmek istedi─şinize emin misiniz?")) return;
                            if (s.sourceType === 'manual') {
                              deleteMockExam(s.id);
                            } else if (s.submissions && s.submissions.length > 0) {
                              s.submissions.forEach(subId => deleteSubmission(subId));
                            } else {
                              deleteSubmission(s.id);
                            }
                          }} title="Denemeyi Sil" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, marginLeft: 4 }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Ders bazl─▒ detay tablosu */}
                      {expandedExams[s.id] && s.scores && Object.keys(s.scores).length > 0 && (
                        <div style={{ marginTop: '0.75rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem' }}>Ders Bazl─▒ Do─şru, Yanl─▒┼ş, Bo┼ş ve Net Say─▒lar─▒:</div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', minWidth: '400px' }}>
                              <thead>
                                <tr style={{ background: 'rgba(255, 255, 255, 0.5)', color: '#64748b' }}>
                                  <th style={{ padding: '0.5rem', borderBottom: '2px solid #e2e8f0' }}>Ders</th>
                                  <th style={{ padding: '0.5rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Do─şru (D)</th>
                                  <th style={{ padding: '0.5rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Yanl─▒┼ş (Y)</th>
                                  <th style={{ padding: '0.5rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Bo┼ş (B)</th>
                                  <th style={{ padding: '0.5rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Net</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(s.scores).map(([subName, sc], idx) => (
                                  <tr key={subName} style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.4)' : 'transparent', borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '0.5rem', fontWeight: 700, color: '#334155' }}>{subName}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{sc.d || 0}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{sc.y || 0}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>{sc.b || 0}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: '#7c3aed', fontWeight: 900 }}>{Number(sc.net || 0).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ÔòÉÔòÉÔòÉ OKUL YAZILI NOTLARIM ÔòÉÔòÉÔòÉ */}
        {activeTab === 'yazilinotlari' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Tip>Okuldaki 1. ve 2. d├Ânem yaz─▒l─▒ notlar─▒n─▒ girmek i├ğin Ortaokul veya Lise ┼şablonunu se├ğ. Kutucuklara notlar─▒n─▒ yazabilir, alt taraftan se├ğmeli ders de ekleyebilirsin!</Tip>

            {/* ├ûzet ─░statistik Kartlar─▒ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', borderRadius: '1rem', padding: '1.15rem', color: 'white', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.2)' }}>
                <div style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: 700, marginBottom: 4 }}>YAZILI ORTALAMASI</div>
                <div style={{ fontSize: '2rem', fontWeight: 900 }}>{schoolGradesAvg !== null ? `${schoolGradesAvg} Puan` : 'ÔÇö'}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: 4 }}>{schoolGrades.length} Yaz─▒l─▒ Kay─▒tl─▒</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '1rem', padding: '1.15rem', border: '1px solid rgba(255,255,255,1)' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: 4 }}>EN Y├£KSEK NOT</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>
                  {schoolGrades.length > 0 ? `${Math.max(...schoolGrades.map(g => parseFloat(g.score) || 0))}` : 'ÔÇö'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>En ba┼şar─▒l─▒ yaz─▒l─▒n─▒z</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '1rem', padding: '1.15rem', border: '1px solid rgba(255,255,255,1)' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: 4 }}>DERS ├çE┼Ş─░D─░</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b' }}>
                  {new Set(schoolGrades.map(g => g.subject)).size} Ders
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>Not girilen ders say─▒s─▒</div>
              </div>
            </div>

            {/* ┼Şablon Se├ğim Modu Butonlar─▒ */}
            <div style={{ display: 'flex', gap: '0.65rem', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', padding: '0.75rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,1)' }}>
              <button
                onClick={() => setGradeTemplateMode('ortaokul')}
                style={{
                  flex: 1, padding: '0.75rem 1rem', borderRadius: '0.65rem', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  background: gradeTemplateMode === 'ortaokul' ? '#4f46e5' : '#f8fafc',
                  color: gradeTemplateMode === 'ortaokul' ? 'white' : '#475569',
                  border: gradeTemplateMode === 'ortaokul' ? 'none' : '1px solid #cbd5e1',
                  transition: 'all 0.15s'
                }}
              >
                ­şÅ½ Ortaokul ┼Şablonu
              </button>

              <button
                onClick={() => setGradeTemplateMode('lise')}
                style={{
                  flex: 1, padding: '0.75rem 1rem', borderRadius: '0.65rem', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  background: gradeTemplateMode === 'lise' ? '#7c3aed' : '#f8fafc',
                  color: gradeTemplateMode === 'lise' ? 'white' : '#475569',
                  border: gradeTemplateMode === 'lise' ? 'none' : '1px solid #cbd5e1',
                  transition: 'all 0.15s'
                }}
              >
                ­şÅø´©Å Lise ┼Şablonu
              </button>
            </div>

            {/* Tablo G├Âr├╝n├╝m├╝ */}
            {(() => {
              const templateSubjects = SCHOOL_LEVEL_TEMPLATES[gradeTemplateMode]?.subjects || [];
              const extraFromGrades = schoolGrades.map(g => g.subject).filter(s => !templateSubjects.includes(s));
              const allSubjectsForTable = Array.from(new Set([...templateSubjects, ...customSubjects, ...extraFromGrades]));

              return (
                <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,1)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{SCHOOL_LEVEL_TEMPLATES[gradeTemplateMode].name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Kutucuklara do─şrudan puan─▒n─▒z─▒ girin</span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                      <thead>
                        <tr style={{ background: 'rgba(255, 255, 255, 0.5)', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Ders</th>
                          {EXAM_TERMS.map(term => (
                            <th key={term} style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.78rem', color: '#475569', fontWeight: 800, width: 110 }}>
                              {term}
                            </th>
                          ))}
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.78rem', color: '#475569', fontWeight: 800, width: 90 }}>Ders Ort.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSubjectsForTable.map(subject => {
                          const isCustom = !templateSubjects.includes(subject);
                          const subGrades = schoolGrades.filter(g => g.subject === subject);
                          const subScores = subGrades.map(g => parseFloat(g.score)).filter(s => !isNaN(s));
                          const subAvg = subScores.length > 0 ? (subScores.reduce((a, b) => a + b, 0) / subScores.length).toFixed(1) : 'ÔÇö';

                          return (
                            <tr key={subject} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  {isCustom && <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#b45309', padding: '0.1rem 0.4rem', borderRadius: 4, fontWeight: 700 }}>Se├ğmeli</span>}
                                  <span>{subject}</span>
                                </div>
                                {isCustom && (
                                  <button
                                    onClick={() => deleteCustomSubject(subject)}
                                    title="Se├ğmeli Dersi ve Notlar─▒n─▒ Sil"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2 }}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </td>

                              {EXAM_TERMS.map(term => {
                                const match = schoolGrades.find(g => g.subject === subject && g.examName === term);
                                const currentVal = match ? match.score : '';

                                return (
                                  <td key={term} style={{ padding: '0.5rem', textAlign: 'center' }}>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      placeholder="ÔÇö"
                                      value={currentVal}
                                      onChange={(e) => handleGradeInputChange(subject, term, e.target.value)}
                                      style={{
                                        width: 75, padding: '0.45rem', textAlign: 'center', borderRadius: '0.4rem',
                                        border: currentVal !== '' ? '1.5px solid #6366f1' : '1px solid #cbd5e1',
                                        background: currentVal !== '' ? '#eef2ff' : 'white',
                                        fontWeight: 800, fontSize: '0.9rem', color: currentVal !== '' ? '#3730a3' : '#334155'
                                      }}
                                    />
                                  </td>
                                );
                              })}

                              <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', color: subAvg !== 'ÔÇö' ? '#10b981' : '#94a3b8' }}>
                                {subAvg}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Liste Alt─▒nda Se├ğmeli / Ekstra Ders Ekle Formu */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); addCustomSubject(); }}
                    style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed #e2e8f0', alignItems: 'center' }}
                  >
                    <input
                      type="text"
                      placeholder="ÔŞò Liste d─▒┼ş─▒ veya se├ğmeli ders ad─▒ ekleyin (├Âr: Almanca, M├╝zik, G├Ârsel Sanatlar)..."
                      value={newCustomSubjectInput}
                      onChange={(e) => setNewCustomSubjectInput(e.target.value)}
                      style={{ flex: 1, padding: '0.6rem 0.85rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0.6rem 1.25rem', borderRadius: '0.5rem', background: '#4f46e5', color: 'white', border: 'none',
                        fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                        boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)', whiteSpace: 'nowrap'
                      }}
                    >
                      <Plus size={16} /> Se├ğmeli Ders Sat─▒r─▒ Ekle
                    </button>
                  </form>
                </div>
              );
            })()}
          </div>
        )}

        {/* ÔòÉÔòÉÔòÉ TESTLER─░M (├ûDEV VE KONU TESTLER─░ SEKME) ÔòÉÔòÉÔòÉ */}
        {activeTab === 'testlerim' && (
          <div>
            <Tip>Sistemde veya ├Âdevler sekmesinde ├ğ├Âzd├╝─ş├╝n t├╝m konu testleri ve ├Âdev sonu├ğlar─▒n burada saklan─▒r.</Tip>

            {otherHomeworkSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', fontWeight: 700 }}>
                <ClipboardList size={40} color="#e2e8f0" style={{ margin: '0 auto 1rem' }} />
                Hen├╝z ├ğ├Âz├╝lm├╝┼ş ├Âdev veya konu testi bulunmuyor.
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>­şôØ</span> ├ç├Âz├╝len ├ûdevler & Konu Testlerim ({otherHomeworkSubmissions.length})
                </div>

                {/* ├ûzet istatistik */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  {[
                    { label: '├ç├Âz├╝len Test', value: otherHomeworkSubmissions.length, color: '#2563eb' },
                    { label: 'Ortalama Net', value: (otherHomeworkSubmissions.reduce((s, x) => s + (x.totalNet || 0), 0) / otherHomeworkSubmissions.length).toFixed(1), color: '#7c3aed' },
                    { label: 'Toplam Do─şru', value: otherHomeworkSubmissions.reduce((s, x) => s + (x.correctCount || 0), 0), color: '#059669' },
                    { label: 'Toplam Yanl─▒┼ş', value: otherHomeworkSubmissions.reduce((s, x) => s + (x.wrongCount || 0), 0), color: '#dc2626' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255, 255, 255, 0.5)', borderRadius: '0.85rem', padding: '0.85rem', textAlign: 'center', border: '1px solid rgba(255,255,255,1)' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.3rem', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {otherHomeworkSubmissions.map((s, i) => (
                    <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0.85rem 1rem', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '0.85rem', border: '1px solid rgba(255,255,255,1)' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{s.title}</div>
                        <div style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                          Tarih: {s.date} ┬À Ô£à {s.correctCount} Do─şru ┬À ÔØî {s.wrongCount} Yanl─▒┼ş ┬À Ô¡ò {s.emptyCount} Bo┼ş
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#2563eb' }}>{s.totalNet}</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>net</span>
                        <button type="button" onClick={() => deleteSubmission(s.id)} title="Testi Sil" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, marginLeft: 4 }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

            {/* ÔòÉÔòÉÔòÉ DENEME EKLEME MODAL POPUP ÔòÉÔòÉÔòÉ */}
            {showMockModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '1.25rem', width: '100%', maxWidth: 650, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
                  
                  {/* Modal Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.2rem' }}>­şôØ</span>
                      <div>
                        <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#0f172a' }}>Yeni Deneme Sonucu Ekle</h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Sonu├ğlar─▒n─▒z an─▒nda sisteme kaydedilecektir.</p>
                      </div>
                    </div>
                    <button onClick={() => setShowMockModal(false)} style={{ background: 'rgba(255, 255, 255, 0.6)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveManualMock}>
                    {/* Header Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
                      <div>
                        <label style={lbl}>Deneme Ad─▒ / Yay─▒n</label>
                        <input style={inp} value={newManualMock.title} onChange={e => setNewManualMock(p => ({ ...p, title: e.target.value }))} placeholder="├ûrn: ├ûzdebir T├╝rkiye Geneli LGS-3" required />
                      </div>
                      <div>
                        <label style={lbl}>Tarih</label>
                        <input style={inp} type="date" value={newManualMock.date} onChange={e => setNewManualMock(p => ({ ...p, date: e.target.value }))} />
                      </div>
                    </div>

                    {/* Subject Table / Grid */}
                    <div style={{ fontWeight: 800, fontSize: '0.83rem', color: '#1e293b', marginBottom: 8 }}>Ders Bazl─▒ Do─şru, Yanl─▒┼ş, Bo┼ş ve Net Say─▒lar─▒:</div>
                    
                    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '0.85rem', overflow: 'hidden', marginBottom: '0.85rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255, 255, 255, 0.5)', borderBottom: '1.5px solid #e2e8f0', color: '#64748b', fontWeight: 800, fontSize: '0.73rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Ders</th>
                            <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#16a34a', width: 70 }}>Do─şru (D)</th>
                            <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#dc2626', width: 70 }}>Yanl─▒┼ş (Y)</th>
                            <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#d97706', width: 70 }}>Bo┼ş (B)</th>
                            <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#7c3aed', width: 85 }}>Net</th>
                            <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', width: 36 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(newManualMock.subjects).map((subName, idx) => {
                            const sub = newManualMock.subjects[subName];
                            const total = Object.keys(newManualMock.subjects).length;
                            return (
                              <tr key={subName} style={{ borderBottom: idx < total - 1 ? '1px solid #f1f5f9' : 'none', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                                <td style={{ padding: '0.55rem 0.75rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>{subName}</td>
                                <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                                  <input type="number" min="0" style={{ ...inp, padding: '0.3rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, borderColor: '#bbf7d0' }}
                                    value={sub.d} onChange={e => updateSubjectScore(subName, 'd', e.target.value)} placeholder="0" />
                                </td>
                                <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                                  <input type="number" min="0" style={{ ...inp, padding: '0.3rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, borderColor: '#fca5a5' }}
                                    value={sub.y} onChange={e => updateSubjectScore(subName, 'y', e.target.value)} placeholder="0" />
                                </td>
                                <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                                  <input type="number" min="0" style={{ ...inp, padding: '0.3rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, borderColor: '#fde68a' }}
                                    value={sub.b} onChange={e => updateSubjectScore(subName, 'b', e.target.value)} placeholder="0" />
                                </td>
                                <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                                  <input type="number" step="0.25" style={{ ...inp, padding: '0.3rem', textAlign: 'center', fontSize: '0.82rem', fontWeight: 900, color: '#7c3aed', background: '#f5f3ff', borderColor: '#ddd6fe' }}
                                    value={sub.net} onChange={e => updateSubjectScore(subName, 'net', e.target.value)} placeholder="0.00" />
                                </td>
                                <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                                  <button type="button" onClick={() => removeSubjectFromMock(subName)} title="Dersi kald─▒r"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Ders Ekle Sat─▒r─▒ */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', alignItems: 'center', background: 'rgba(255, 255, 255, 0.5)', border: '1.5px dashed #c7d2fe', borderRadius: '0.85rem', padding: '0.65rem 0.85rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', whiteSpace: 'nowrap' }}>ÔŞò Ders Ekle:</span>
                      <select
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                        style={{ ...inp, flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                      >
                        <option value="">ÔÇö Ders se├ğ veya yaz ÔÇö</option>
                        {['T├╝rk├ğe','Matematik','Fen Bilimleri','Sosyal Bilgiler','─░ngilizce','Din K├╝lt├╝r├╝','Yabanc─▒ Dil','Tarih','Co─şrafya','Fizik','Kimya','Biyoloji','Edebiyat','Geometri','TYT T├╝rk├ğe','TYT Matematik','TYT Fen','TYT Sosyal']
                          .filter(s => !newManualMock.subjects[s])
                          .map(s => <option key={s} value={s}>{s}</option>)
                        }
                      </select>
                      <input
                        type="text"
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubjectToMock())}
                        placeholder="veya ├Âzel ders ad─▒ yaz"
                        style={{ ...inp, flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                      />
                      <button
                        type="button"
                        onClick={addSubjectToMock}
                        disabled={!newSubjectName.trim() || !!newManualMock.subjects[newSubjectName.trim()]}
                        style={{ background: newSubjectName.trim() && !newManualMock.subjects[newSubjectName.trim()] ? '#6366f1' : '#e2e8f0', color: newSubjectName.trim() && !newManualMock.subjects[newSubjectName.trim()] ? 'white' : '#94a3b8', border: 'none', borderRadius: '0.6rem', padding: '0.4rem 0.9rem', fontWeight: 800, fontSize: '0.82rem', cursor: newSubjectName.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                      >
                        Ekle
                      </button>
                    </div>

                    {/* Summary Bar */}
                    <div style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: '0.85rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4c1d95', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span>Ô£à {totalMockD} Do─şru</span>
                        <span>ÔØî {totalMockY} Yanl─▒┼ş</span>
                        <span>Ô¡ò {totalMockB} Bo┼ş</span>
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#6d28d9' }}>
                        Toplam Net: <span style={{ fontSize: '1.2rem', color: '#7c3aed' }}>{totalMockNet.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button type="button" onClick={() => setShowMockModal(false)} style={{ background: 'rgba(255, 255, 255, 0.6)', color: '#64748b', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.2rem', fontWeight: 800, fontSize: '0.83rem', cursor: 'pointer' }}>
                        Vazge├ğ
                      </button>
                      <button type="submit" style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.4rem', fontWeight: 900, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
                        <Plus size={16} /> Kaydet
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

      {/* ÔòÉÔòÉÔòÉ AYLIK ALI┼ŞKANLIK DETAY MODALI ÔòÉÔòÉÔòÉ */}
      {selectedMonthlyHabit && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '1.25rem', width: '100%', maxWidth: 540,
            padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '90vh', overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>­şôà Ayl─▒k Takvim & Ge├ğmi┼ş</div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: '2px 0 0 0' }}>
                  {selectedMonthlyHabit.label}
                </h2>
              </div>
              <button
                onClick={() => setSelectedMonthlyHabit(null)}
                style={{ background: 'rgba(255, 255, 255, 0.6)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Monthly Stats Summary Cards */}
            {(() => {
              const monthInfo = getDaysInCurrentMonth();
              const activeHabit = habits.find(h => h.id === selectedMonthlyHabit.id) || selectedMonthlyHabit;
              const historyObj = activeHabit.history || {};

              const checkedInMonth = monthInfo.days.filter(d => historyObj[d.dateStr]).length;
              const totalDaysInMonth = monthInfo.days.length;
              const percentage = Math.round((checkedInMonth / totalDaysInMonth) * 100);
              const streakInfo = calculateHabitStreak(activeHabit);

              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.5)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,1)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>BU AY</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669', marginTop: 2 }}>{checkedInMonth} / {totalDaysInMonth}</div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Tamamlanan g├╝n</div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.5)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,1)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>BA┼ŞARI ORANI</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb', marginTop: 2 }}>%{percentage}</div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Ayl─▒k ba┼şar─▒m</div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.5)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,1)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>AKT─░F SER─░</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626', marginTop: 2 }}>­şöÑ {streakInfo.currentStreak} G├╝n</div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Kesintisiz zincir</div>
                    </div>
                  </div>

                  {/* Monthly Calendar Grid */}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#334155', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>­şôà {monthInfo.monthName} {monthInfo.year} Takvimi</span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>G├╝ne t─▒klayarak durumu de─şi┼ştirebilirsin</span>
                    </div>

                    {/* Grid Header Days */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 4 }}>
                      {['Pzt', 'Sal', '├çr┼ş', 'Pr┼ş', 'Cum', 'Cts', 'Paz'].map(d => (
                        <div key={d} style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', padding: '0.2rem' }}>{d}</div>
                      ))}
                    </div>

                    {/* Grid Day Boxes */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {/* Empty Offset cells */}
                      {Array.from({ length: monthInfo.firstDayOffset }).map((_, idx) => (
                        <div key={`offset_${idx}`} style={{ height: 42, background: 'transparent' }} />
                      ))}

                      {/* Days */}
                      {monthInfo.days.map(d => {
                        const isChecked = Boolean(historyObj[d.dateStr]);

                        return (
                          <button
                            key={d.dateStr}
                            onClick={() => toggleHabitHistoryDate(activeHabit.id, d.dateStr)}
                            style={{
                              height: 42, borderRadius: '0.5rem', border: d.isToday ? '2px solid #ef4444' : '1px solid #e2e8f0',
                              background: isChecked ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#f8fafc',
                              color: isChecked ? 'white' : '#334155', cursor: 'pointer',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s', position: 'relative'
                            }}
                            title={`${d.dayNum} ${monthInfo.monthName} (${d.dayOfWeek})`}
                          >
                            <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>{d.dayNum}</span>
                            {isChecked && <Check size={12} strokeWidth={3} style={{ marginTop: 1 }} />}
                            {d.isToday && !isChecked && <span style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 900 }}>BUG├£N</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

            <button
              onClick={() => setSelectedMonthlyHabit(null)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', background: '#334155', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Tamam / Kapat
            </button>
          </div>
        </div>
      )}

      </div>

      {/* ÔöÇÔöÇ FLOATING SAVE ÔöÇÔöÇ */}
      <div style={{ position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 100 }}>
        <button onClick={handleSave} style={{
          background: saved ? '#059669' : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
          color: 'white', border: 'none', borderRadius: '1rem',
          padding: '0.7rem 1.4rem', fontWeight: 900, fontSize: '0.85rem',
          cursor: 'pointer', boxShadow: '0 8px 24px rgba(124,58,237,0.35)',
          display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.25s'
        }}>
          {saved ? <><CheckCircle2 size={16} /> Kaydedildi!</> : <><Save size={16} /> Kaydet</>}
        </button>
      </div>

    </div>
  );
}
