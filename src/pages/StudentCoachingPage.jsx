import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Check, ChevronDown, ChevronRight,
  User, Target, BookOpen, Calendar, BarChart3, MessageSquare, Star,
  Printer, Brain, GraduationCap, Clock, AlertTriangle, Heart,
  TrendingUp, Flame, Moon, Dumbbell, Phone, Zap, CheckCircle2,
  Award, FileText, Edit3, RefreshCw, X, CheckSquare, Square,
  Smile, Gift, Activity, ClipboardList, Eye, Layers
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useCoaching } from '../context/CoachingContext';
import { useAuth } from '../context/AuthContext';
import { useGoal } from '../context/GoalContext';
/* ─── Helpers ─── */
const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const DAYS_SHORT = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
const SUBJECTS = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'];
const TOPIC_STATUS = ['Başlandı', 'Öğrenildi', 'Soru Çözüldü', 'Tekrar Yapıldı', 'Tamamlandı'];
const STATUS_COLOR = {
  'Başlandı': '#f59e0b',
  'Öğrenildi': '#3b82f6',
  'Soru Çözüldü': '#8b5cf6',
  'Tekrar Yapıldı': '#f97316',
  'Tamamlandı': '#10b981',
};

export const normalizeWeeklyProgram = (raw) => {
  const DAYS = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
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
        subject: found.lessons || 'Ders Çalışması',
        topic: '',
        hours: found.hours || '',
        done: !!found.done
      });
    }
    return { day: d, items: legacyItems };
  });
};

const inputStyle = {
  width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem',
  border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none',
  background: 'white', fontFamily: 'inherit', boxSizing: 'border-box'
};
const textareaStyle = { ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.6 };
const labelStyle = { fontSize: '0.73rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' };
const sectionTitle = (icon, text, color = '#1e293b') => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
    <span style={{ color }}>{icon}</span>
    <span style={{ fontWeight: 900, fontSize: '1rem', color }}>{text}</span>
  </div>
);

/* ─── Accordion Wrapper ─── */
function Accordion({ title, icon, badge, color = '#1e293b', bg = '#f8fafc', border = '#e2e8f0', defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: '1.1rem', overflow: 'hidden', marginBottom: '0.85rem' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {open ? <ChevronDown size={16} color={color} /> : <ChevronRight size={16} color={color} />}
          <span style={{ color }}>{icon}</span>
          <span style={{ fontWeight: 900, fontSize: '0.92rem', color }}>{title}</span>
        </div>
        {badge && <span style={{ background: border, color, fontWeight: 800, fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: 99 }}>{badge}</span>}
      </button>
      {open && <div style={{ padding: '0 1.25rem 1.25rem' }}>{children}</div>}
    </div>
  );
}

/* ─── Section Card ─── */
function SectionCard({ num, title, icon, color = '#4f46e5', children }) {
  return (
    <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid #f1f5f9' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color }}>{icon}</span> {title}
        </h3>
        <span style={{ background: `${color}18`, color, fontWeight: 800, fontSize: '0.7rem', padding: '0.25rem 0.7rem', borderRadius: 99, border: `1px solid ${color}30` }}>
          Bölüm {num}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ─── Field Grid ─── */
function FieldGrid({ cols = 2, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1rem' }}>
      {children}
    </div>
  );
}

function Field({ label, children, full = false }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : {}}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

/* ─── Checkbox Row ─── */
function CheckRow({ label, checked, onChange, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.85rem', background: checked ? '#eff6ff' : '#f8fafc', borderRadius: '0.65rem', border: checked ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0', cursor: 'pointer' }} onClick={onChange}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 20, height: 20, borderRadius: 5, background: checked ? '#2563eb' : 'white', border: checked ? 'none' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {checked && <Check size={13} color="white" strokeWidth={3} />}
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: checked ? '#1e40af' : '#374151', textDecoration: checked ? 'line-through' : 'none' }}>{label}</span>
      </div>
      {onDelete && <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2 }}><Trash2 size={14} /></button>}
    </div>
  );
}

/* ─── Rating Selector ─── */
function Rating({ value, onChange, max = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <button key={i} type="button" onClick={() => onChange(i + 1)}
          style={{ width: 28, height: 28, borderRadius: '50%', background: i < value ? '#f59e0b' : '#f1f5f9', border: i < value ? 'none' : '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
          <Star size={14} fill={i < value ? 'white' : 'none'} color={i < value ? 'white' : '#94a3b8'} />
        </button>
      ))}
    </div>
  );
}

/* ─── SWOT ─── */
function SwotBox({ label, color, bg, border, value, onChange }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: '0.85rem', padding: '0.85rem' }}>
      <div style={{ fontWeight: 800, fontSize: '0.75rem', color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={`${label} hakkında notlar...`}
        style={{ ...textareaStyle, minHeight: 70, border: 'none', background: 'transparent', color, padding: 0, fontSize: '0.82rem' }} />
    </div>
  );
}

/* ─── Görsel Özel Hedef Takip Panosu Component ─── */
function VisualGoalSection({ studentId }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
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
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem', fontWeight: 700, fontSize: '0.84rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1.5px dashed #e2e8f0' }}>
          🎯 Henüz özel bir görsel hedef tanımlanmadı.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
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
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: isDone ? '#10b981' : cfg.color, borderRadius: 99, transition: 'width 0.4s' }} />
                  </div>
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
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════ */
export default function StudentCoachingPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { users } = useUser();
  const { currentUser } = useAuth();
  const { submissions } = useEvaluation();
  const { homeworks } = useHomework();
  const {
    getCoachingProfileForStudent, saveCoachingProfile, coachingProfiles,
    addCoachingMeeting, getMeetingsForStudent, coachingMeetings,
    approveMockExam, deleteMockExam, getMockExamsForStudent
  } = useCoaching();

  const studentMockExams = useMemo(() => getMockExamsForStudent(studentId) || [], [getMockExamsForStudent, studentId]);

  const pendingMockExams = useMemo(() => {
    return studentMockExams.filter(m => m.approvalStatus === 'pending' || (m.createdBy === 'student' && m.approvalStatus !== 'approved'));
  }, [studentMockExams]);

  const student = users.find(u => String(u.id) === String(studentId));
  const isStudent = currentUser?.role === 'student';
  const isCoach = currentUser?.role === 'teacher' || currentUser?.role === 'admin' || currentUser?.role === 'coordinator';

  /* ─── Profile State ─── */
  const existingProfile = useMemo(() => getCoachingProfileForStudent(studentId) || {}, [studentId, coachingProfiles]);

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // ── Bölüm 1: Öğrenci Bilgi Formu ──
  const [info, setInfo] = useState({ name: '', grade: '', school: '', birthDate: '', parentName: '', parentPhone: '', email: '', targetSchool: '', strengths: '', improvements: '' });

  // ── Bölüm 2: İlk Tanışma Analizi ──
  const [intake, setIntake] = useState({
    studentExpectations: '', parentExpectations: '', motivationLevel: 3,
    studyHabit: '', timeManagement: 3, attentionSpan: 3, anxietyLevel: 3, learningStyle: '',
    swotStrengths: '', swotWeaknesses: '', swotOpportunities: '', swotThreats: ''
  });

  // ── Bölüm 3: Hedef Belirleme ──
  // Not: examGoalType, targetSchool, targetScore, targetNet, monthlyGoals, weeklyGoals, dailyGoals
  // /goals sayfasıyla aynı root-level alan adları kullanılır (CoachingContext senkronu)
  const [goals, setGoals] = useState({
    examGoalType: 'LGS', targetSchool: '', targetScore: '', targetNet: '',
    monthlyGoals: [], weeklyGoals: [], dailyGoals: []
  });
  const [newMonthly, setNewMonthly] = useState('');
  const [newWeekly, setNewWeekly] = useState('');
  const [newDaily, setNewDaily] = useState('');

  // ── Bölüm 4: Ders Analizi ──
  const [subjectAnalysis, setSubjectAnalysis] = useState(
    SUBJECTS.reduce((acc, s) => ({ ...acc, [s]: { topics: '', gaps: '', examNet: '', errorTypes: '', retakeDate: '' } }), {})
  );
  const [activeSubject, setActiveSubject] = useState(SUBJECTS[0]);

  // ── Bölüm 5: Haftalık Program (Multi-item per day) ──
  const [weeklyProgram, setWeeklyProgram] = useState(
    DAYS_SHORT.map(d => ({ day: d, items: [] }))
  );
  const [newScheduleInputs, setNewScheduleInputs] = useState(
    DAYS_SHORT.reduce((acc, d) => ({ ...acc, [d]: { subject: SUBJECTS[0], topic: '', hours: '' } }), {})
  );

  // ── Bölüm 6: Günlük Çalışma Takibi ──
  const [dailyLogs, setDailyLogs] = useState([]);
  const [newLog, setNewLog] = useState({ date: today(), studyHours: '', questions: '', revision: '', videoLesson: '', reading: '', sport: false, sleepTime: '' });

  // ── Bölüm 7: Deneme Takibi ──
  const [mockExams, setMockExams] = useState([]);
  const [newMock, setNewMock] = useState({ date: today(), name: '', turkce: '', matematik: '', fen: '', sosyal: '', ingilizce: '', totalNet: '', wrongReason: '', timeNote: '' });

  // ── Bölüm 8: Konu Takip Çizelgesi ──
  const [topicList, setTopicList] = useState([]);
  const [newTopic, setNewTopic] = useState({ subject: SUBJECTS[0], topic: '', status: 'Başlandı' });

  // ── Bölüm 9: Soru Takip ──
  const [questionTrack, setQuestionTrack] = useState({ dailyGoal: '50', solved: '', remaining: '', hardestSubject: '' });

  // ── Bölüm 10: Hata Defteri ──
  const [errors, setErrors] = useState([]);
  const [newError, setNewError] = useState({ subject: SUBJECTS[0], topic: '', reason: '', correct: '', retakeDate: today() });

  // ── Bölüm 11: Koç Görüşme ──
  const [meetings, setMeetings] = useState([]);
  const [newMeeting, setNewMeeting] = useState({ date: today(), duration: '45', evaluation: '', strengths: '', improvements: '', nextGoals: '' });

  // ── Bölüm 12: Veli Görüşme ──
  const [parentMeetings, setParentMeetings] = useState([]);
  const [newParentMeeting, setNewParentMeeting] = useState({ date: today(), topics: '', feedback: '', decisions: '' });

  // ── Bölüm 13: Motivasyon Sayfası ──
  const [motivation, setMotivation] = useState({ weekQuote: '', achievements: '', selfNote: '', rewardSystem: '' });

  // ── Bölüm 14: Alışkanlık Takibi ──
  const [habits, setHabits] = useState([
    { id: uid(), label: 'Erken Kalktım', days: DAYS_SHORT.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Plan Yaptım', days: DAYS_SHORT.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Kitap Okudum', days: DAYS_SHORT.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Spor Yaptım', days: DAYS_SHORT.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Telefon < 2 Saat', days: DAYS_SHORT.reduce((a, d) => ({ ...a, [d]: false }), {}) },
  ]);
  const [newHabit, setNewHabit] = useState('');

  // ── Bölüm 15: Aylık Değerlendirme ──
  const [monthly, setMonthly] = useState({ learned: '', bestAchievement: '', biggestMistake: '', nextGoal: '', netChange: '', studyHoursNote: '' });

  // ── Bölüm 16: Koç Notları ──
  const [coachNotes, setCoachNotes] = useState({ observations: '', psychStatus: '', motivationChange: '', parentNotes: '', suggestions: '' });

  /* ─── Load from existing profile ─── */
  useEffect(() => {
    if (!existingProfile || Object.keys(existingProfile).length === 0) return;
    if (existingProfile.info) setInfo(p => ({ ...p, ...existingProfile.info }));
    if (existingProfile.intake) setIntake(p => ({ ...p, ...existingProfile.intake }));

    // /goals sayfasıyla senkron: root-level alanları goals state'ine yükle
    setGoals(p => ({
      ...p,
      ...(existingProfile.goals || {}),
      // /goals sayfasının root-level alanlarını öncelikli al
      examGoalType: existingProfile.examGoalType || existingProfile.goals?.examGoalType || existingProfile.goals?.examType || p.examGoalType,
      targetSchool: existingProfile.targetSchool || existingProfile.goals?.targetSchool || p.targetSchool,
      targetScore:  existingProfile.targetScore  || existingProfile.goals?.targetScore  || p.targetScore,
      targetNet:    String(existingProfile.targetNet  ?? existingProfile.goals?.targetNet  ?? p.targetNet),
      monthlyGoals: existingProfile.monthlyGoals || existingProfile.goals?.monthlyGoals || p.monthlyGoals,
      weeklyGoals:  existingProfile.weeklyGoals  || existingProfile.goals?.weeklyGoals  || p.weeklyGoals,
      dailyGoals:   existingProfile.dailyGoals   || existingProfile.goals?.dailyGoals   || p.dailyGoals,
    }));

    if (existingProfile.subjectAnalysis) setSubjectAnalysis(p => ({ ...p, ...existingProfile.subjectAnalysis }));
    if (existingProfile.weeklyProgram) {
      setWeeklyProgram(normalizeWeeklyProgram(existingProfile.weeklyProgram));
    }
    if (existingProfile.dailyLogs) setDailyLogs(existingProfile.dailyLogs);
    if (existingProfile.mockExams) setMockExams(existingProfile.mockExams);
    if (existingProfile.topicList) setTopicList(existingProfile.topicList);
    if (existingProfile.questionTrack) setQuestionTrack(p => ({ ...p, ...existingProfile.questionTrack }));
    if (existingProfile.errors) setErrors(existingProfile.errors);
    if (existingProfile.meetings) setMeetings(existingProfile.meetings);
    if (existingProfile.parentMeetings) setParentMeetings(existingProfile.parentMeetings);
    if (existingProfile.motivation) setMotivation(p => ({ ...p, ...existingProfile.motivation }));
    if (existingProfile.habits) setHabits(existingProfile.habits);
    if (existingProfile.monthly) setMonthly(p => ({ ...p, ...existingProfile.monthly }));
    if (existingProfile.coachNotes) setCoachNotes(p => ({ ...p, ...existingProfile.coachNotes }));
  }, [existingProfile.studentId]);

  /* ─── Auto-sync with student's real data ─── */
  const studentSubmissions = useMemo(() => {
    if (!studentId) return [];
    return submissions.filter(s => String(s.studentId) === String(studentId));
  }, [submissions, studentId]);

  /* ─── Save all ─── */
  // /goals sayfasıyla tam senkron: aynı root-level alan adlarını kullan
  const handleSave = useCallback(async () => {
    await saveCoachingProfile({
      ...existingProfile,
      studentId,
      // /goals sayfasının beklediği root-level alanlar (senkron için kritik)
      examGoalType:  goals.examGoalType,
      targetSchool:  goals.targetSchool,
      targetScore:   goals.targetScore,
      targetNet:     Number(goals.targetNet) || 0,
      monthlyGoals:  goals.monthlyGoals,
      weeklyGoals:   goals.weeklyGoals,
      dailyGoals:    goals.dailyGoals,
      // Koçluk dosyasına özgü tüm alanlar
      info, intake, goals, subjectAnalysis, weeklyProgram, dailyLogs,
      mockExams, topicList, questionTrack, errors, meetings, parentMeetings,
      motivation, habits, monthly, coachNotes
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [info, intake, goals, subjectAnalysis, weeklyProgram, dailyLogs, mockExams, topicList, questionTrack, errors, meetings, parentMeetings, motivation, habits, monthly, coachNotes]);

  if (!student) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: '#64748b' }}>Öğrenci bulunamadı.</h2>
        <button onClick={() => navigate(-1)} style={{ marginTop: 16, padding: '0.6rem 1.4rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>Geri Dön</button>
      </div>
    );
  }

  /* ─── Tab Definitions ─── */
  const tabs = [
    { id: 'info', label: '👤 Bilgi Formu', num: 1 },
    { id: 'intake', label: '🧠 İlk Tanışma', num: 2 },
    { id: 'goals', label: '🎯 Hedefler', num: 3 },
    { id: 'visualgoals', label: '📊 Görsel Hedef Panosu', num: '3B' },
    { id: 'subjects', label: '📚 Ders Analizi', num: 4 },
    { id: 'weekly', label: '📅 Haftalık Program', num: 5 },
    { id: 'daily', label: '⏱️ Günlük Takip', num: 6 },
    { id: 'mock', label: '📊 Deneme Takibi', num: 7 },
    { id: 'topics', label: '📋 Konu Çizelgesi', num: 8 },
    { id: 'questions', label: '❓ Soru Takip', num: 9 },
    { id: 'errors', label: '🔴 Hata Defteri', num: 10 },
    { id: 'meetings', label: '💬 Koç Görüşme', num: 11 },
    { id: 'parent', label: '👨‍👩‍👧 Veli Görüşme', num: 12 },
    { id: 'motivation', label: '⭐ Motivasyon', num: 13 },
    { id: 'habits', label: '🔥 Alışkanlıklar', num: 14 },
    { id: 'monthly', label: '📈 Aylık Değerlendirme', num: 15 },
    { id: 'coachnotes', label: '📝 Koç Notları', num: 16 },
  ];

  /* ─── Render ─── */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 100%)', padding: 'clamp(1rem,3vw,2rem)', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '0.85rem', padding: '0.6rem 1.2rem', color: '#334155', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <ArrowLeft size={15} /> Geri Dön
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, padding: '0 0.5rem' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
            {student.name?.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>{student.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>📂 Koçluk Takip Dosyası · {student.gradeId || 'Sınıf belirtilmedi'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '0.85rem', padding: '0.6rem 1.2rem', color: '#475569', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
            <Printer size={15} /> PDF/Yazdır
          </button>
          <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, background: saved ? '#059669' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '0.85rem', padding: '0.6rem 1.4rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.25)', transition: 'all 0.2s' }}>
            {saved ? <><CheckCircle2 size={15} /> Kaydedildi!</> : <><Save size={15} /> Kaydet</>}
          </button>
        </div>
      </div>

      {/* MAIN CARD */}
      <div style={{ background: 'white', borderRadius: '1.5rem', border: '2px solid #e2e8f0', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

        {/* TAB BAR */}
        <div style={{ display: 'flex', overflowX: 'auto', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', padding: '0.5rem 0.5rem 0', gap: 3 }}>
          {tabs.map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '0.6rem 0.85rem', border: active ? '2px solid #e2e8f0' : '2px solid transparent',
                borderBottom: active ? '2px solid white' : '2px solid transparent',
                borderRadius: '0.75rem 0.75rem 0 0', background: active ? 'white' : 'transparent',
                color: active ? '#4f46e5' : '#64748b', fontWeight: active ? 900 : 600,
                fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap',
                marginBottom: active ? -2 : 0, transition: 'all 0.15s'
              }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENT */}
        <div style={{ padding: '1.75rem', minHeight: 500 }}>

          {/* ════ BÖLÜM 1: ÖĞRENCİ BİLGİ FORMU ════ */}
          {activeTab === 'info' && (
            <SectionCard num={1} title="Öğrenci Bilgi Formu" icon={<User size={20} />} color="#4f46e5">
              <div style={{ background: '#f0f4ff', border: '1.5px solid #c7d2fe', borderRadius: '0.85rem', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#3730a3', fontWeight: 700 }}>
                💡 Bu bölüm öğrenci ve koç tarafından birlikte doldurulur. Temel bilgileri girin.
              </div>
              <FieldGrid cols={2}>
                <Field label="Ad Soyad">
                  <input style={inputStyle} value={info.name || student.name || ''} onChange={e => setInfo(p => ({ ...p, name: e.target.value }))} placeholder="Öğrencinin tam adı" />
                </Field>
                <Field label="Sınıf">
                  <input style={inputStyle} value={info.grade} onChange={e => setInfo(p => ({ ...p, grade: e.target.value }))} placeholder="Örn: 8-B" />
                </Field>
                <Field label="Okul">
                  <input style={inputStyle} value={info.school} onChange={e => setInfo(p => ({ ...p, school: e.target.value }))} placeholder="Mevcut okul adı" />
                </Field>
                <Field label="Doğum Tarihi">
                  <input style={inputStyle} type="date" value={info.birthDate} onChange={e => setInfo(p => ({ ...p, birthDate: e.target.value }))} />
                </Field>
                <Field label="Veli Adı">
                  <input style={inputStyle} value={info.parentName} onChange={e => setInfo(p => ({ ...p, parentName: e.target.value }))} placeholder="Anne / Baba adı" />
                </Field>
                <Field label="Telefon">
                  <input style={inputStyle} value={info.parentPhone} onChange={e => setInfo(p => ({ ...p, parentPhone: e.target.value }))} placeholder="05xx xxx xx xx" />
                </Field>
                <Field label="E-posta">
                  <input style={inputStyle} type="email" value={info.email} onChange={e => setInfo(p => ({ ...p, email: e.target.value }))} placeholder="ornek@mail.com" />
                </Field>
                <Field label="Hedeflediği Okul / Bölüm">
                  <input style={inputStyle} value={info.targetSchool} onChange={e => setInfo(p => ({ ...p, targetSchool: e.target.value }))} placeholder="Örn: Galatasaray Lisesi / Tıp" />
                </Field>
                <Field label="Güçlü Yönleri" full>
                  <textarea style={textareaStyle} value={info.strengths} onChange={e => setInfo(p => ({ ...p, strengths: e.target.value }))} placeholder="Öğrencinin güçlü olduğu alanlar..." />
                </Field>
                <Field label="Geliştirilmesi Gereken Yönler" full>
                  <textarea style={textareaStyle} value={info.improvements} onChange={e => setInfo(p => ({ ...p, improvements: e.target.value }))} placeholder="Üzerinde çalışılması gereken alanlar..." />
                </Field>
              </FieldGrid>
            </SectionCard>
          )}

          {/* ════ BÖLÜM 2: İLK TANIŞMA ANALİZİ ════ */}
          {activeTab === 'intake' && (
            <SectionCard num={2} title="İlk Tanışma Analizi" icon={<Brain size={20} />} color="#7c3aed">
              <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: '0.85rem', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#6b21a8', fontWeight: 700 }}>
                💡 Bu bölüm ilk koçluk görüşmesinde koç tarafından doldurulur. Öğrenci beklentilerini kendi doldurabilir.
              </div>

              <FieldGrid cols={1}>
                <Field label="Öğrencinin Beklentileri" full>
                  <textarea style={textareaStyle} value={intake.studentExpectations} onChange={e => setIntake(p => ({ ...p, studentExpectations: e.target.value }))} placeholder="Öğrenci koçluktan ne bekliyor?" />
                </Field>
                <Field label="Ailenin Beklentileri" full>
                  <textarea style={textareaStyle} value={intake.parentExpectations} onChange={e => setIntake(p => ({ ...p, parentExpectations: e.target.value }))} placeholder="Aile hedefleri ve beklentileri..." />
                </Field>
              </FieldGrid>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem', margin: '1.25rem 0' }}>
                {[
                  { key: 'motivationLevel', label: 'Motivasyon Düzeyi' },
                  { key: 'timeManagement', label: 'Zaman Yönetimi' },
                  { key: 'attentionSpan', label: 'Dikkat Süresi' },
                  { key: 'anxietyLevel', label: 'Kaygı Düzeyi' },
                ].map(item => (
                  <div key={item.key} style={{ background: '#f8fafc', borderRadius: '0.85rem', padding: '0.85rem', border: '1px solid #e2e8f0' }}>
                    <label style={labelStyle}>{item.label}</label>
                    <Rating value={intake[item.key]} onChange={v => setIntake(p => ({ ...p, [item.key]: v }))} />
                  </div>
                ))}
              </div>

              <FieldGrid cols={2}>
                <Field label="Ders Çalışma Alışkanlığı">
                  <textarea style={{ ...textareaStyle, minHeight: 60 }} value={intake.studyHabit} onChange={e => setIntake(p => ({ ...p, studyHabit: e.target.value }))} placeholder="Nasıl ders çalışıyor?" />
                </Field>
                <Field label="Öğrenme Stili">
                  <select style={inputStyle} value={intake.learningStyle} onChange={e => setIntake(p => ({ ...p, learningStyle: e.target.value }))}>
                    <option value="">Seçin...</option>
                    <option value="Görsel">Görsel (Şema, Grafik)</option>
                    <option value="İşitsel">İşitsel (Dinleyerek)</option>
                    <option value="Kinestetik">Kinestetik (Yaparak)</option>
                    <option value="Okuma/Yazma">Okuma / Yazma</option>
                  </select>
                </Field>
              </FieldGrid>

              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={18} color="#7c3aed" /> SWOT Analizi
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <SwotBox label="💪 Güçlü Yönler" color="#166534" bg="#f0fdf4" border="#bbf7d0" value={intake.swotStrengths} onChange={v => setIntake(p => ({ ...p, swotStrengths: v }))} />
                  <SwotBox label="⚠️ Zayıf Yönler" color="#991b1b" bg="#fef2f2" border="#fecaca" value={intake.swotWeaknesses} onChange={v => setIntake(p => ({ ...p, swotWeaknesses: v }))} />
                  <SwotBox label="🌟 Fırsatlar" color="#1e40af" bg="#eff6ff" border="#bfdbfe" value={intake.swotOpportunities} onChange={v => setIntake(p => ({ ...p, swotOpportunities: v }))} />
                  <SwotBox label="🔥 Tehditler" color="#92400e" bg="#fffbeb" border="#fde68a" value={intake.swotThreats} onChange={v => setIntake(p => ({ ...p, swotThreats: v }))} />
                </div>
              </div>
            </SectionCard>
          )}

          {/* ════ BÖLÜM 3: HEDEF BELİRLEME ════ */}
          {activeTab === 'goals' && (
            <SectionCard num={3} title="Hedef Belirleme" icon={<Target size={20} />} color="#059669">
              <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '0.85rem', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#166534', fontWeight: 700 }}>
                💡 Uzun vadeli hedefleri koç, aylık/haftalık/günlük hedefleri birlikte belirleyin. Öğrenci kendi hedeflerini yazabilir.
              </div>

              {/* Uzun Vadeli */}
              <Accordion title="🏛️ Uzun Vadeli Hedefler" icon={<GraduationCap size={16} />} color="#166534" bg="#f0fdf4" border="#bbf7d0" defaultOpen>
                <FieldGrid cols={2}>
                  <Field label="Hedef Sınav">
                    <select style={inputStyle} value={['LGS 2026', 'YKS (TYT/AYT) 2026', 'KPSS'].includes(goals.examGoalType) ? goals.examGoalType : 'Özel Sınav'} onChange={e => {
                      const val = e.target.value;
                      if (val === 'Özel Sınav') {
                        setGoals(p => ({ ...p, examGoalType: 'Özel Sınav', customExamName: p.customExamName || '' }));
                      } else {
                        setGoals(p => ({ ...p, examGoalType: val }));
                      }
                    }}>
                      <option value="LGS 2026">LGS (Liselere Geçiş Sınavı)</option>
                      <option value="YKS (TYT/AYT) 2026">YKS (TYT / AYT)</option>
                      <option value="KPSS">KPSS</option>
                      <option value="Özel Sınav">✏️ Özel Sınav (DGS, ALES, BİLSEM...)</option>
                    </select>
                  </Field>
                  {(!['LGS 2026', 'YKS (TYT/AYT) 2026', 'KPSS'].includes(goals.examGoalType) || goals.examGoalType === 'Özel Sınav') && (
                    <Field label="Özel Sınav Adı">
                      <input style={{ ...inputStyle, borderColor: '#7c3aed', background: '#faf5ff' }}
                        value={goals.customExamName || (goals.examGoalType !== 'Özel Sınav' ? goals.examGoalType : '')}
                        onChange={e => {
                          const val = e.target.value;
                          setGoals(p => ({ ...p, customExamName: val, examGoalType: val || 'Özel Sınav' }));
                        }}
                        placeholder="Örn: DGS, BİLSEM, ALES, YÖSDİL..." />
                    </Field>
                  )}
                  <Field label="İstenen Okul / Bölüm">
                    <input style={inputStyle} value={goals.targetSchool} onChange={e => setGoals(p => ({ ...p, targetSchool: e.target.value }))} placeholder="Örn: Kabataş Lisesi / İTÜ" />
                  </Field>
                  <Field label="Puan Hedefi">
                    <input style={inputStyle} value={goals.targetScore} onChange={e => setGoals(p => ({ ...p, targetScore: e.target.value }))} placeholder="Örn: 485" />
                  </Field>
                  <Field label="Net Hedefi">
                    <input style={inputStyle} value={goals.targetNet} onChange={e => setGoals(p => ({ ...p, targetNet: e.target.value }))} placeholder="Örn: 90 Net" />
                  </Field>
                </FieldGrid>
              </Accordion>

              {/* Aylık Hedefler */}
              <Accordion title="📅 Aylık Hedefler" icon={<Calendar size={16} />} color="#1e40af" bg="#eff6ff" border="#bfdbfe"
                badge={`${(goals.monthlyGoals || []).filter(g => g.done).length}/${(goals.monthlyGoals || []).length} tamamlandı`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '0.85rem' }}>
                  {(goals.monthlyGoals || []).map(g => (
                    <CheckRow key={g.id} label={g.text} checked={g.done}
                      onChange={() => setGoals(p => ({ ...p, monthlyGoals: p.monthlyGoals.map(x => x.id === g.id ? { ...x, done: !x.done } : x) }))}
                      onDelete={() => setGoals(p => ({ ...p, monthlyGoals: p.monthlyGoals.filter(x => x.id !== g.id) }))} />
                  ))}
                </div>
                <form onSubmit={e => { e.preventDefault(); if (newMonthly.trim()) { setGoals(p => ({ ...p, monthlyGoals: [...(p.monthlyGoals || []), { id: uid(), text: newMonthly.trim(), done: false }] })); setNewMonthly(''); } }} style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={newMonthly} onChange={e => setNewMonthly(e.target.value)} placeholder="Yeni aylık hedef ekle..." />
                  <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1rem', fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /></button>
                </form>
              </Accordion>

              {/* Haftalık Hedefler */}
              <Accordion title="⚡ Haftalık Hedefler" icon={<Zap size={16} />} color="#7c3aed" bg="#faf5ff" border="#e9d5ff">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '0.85rem' }}>
                  {(goals.weeklyGoals || []).map(g => (
                    <CheckRow key={g.id} label={g.text} checked={g.done}
                      onChange={() => setGoals(p => ({ ...p, weeklyGoals: p.weeklyGoals.map(x => x.id === g.id ? { ...x, done: !x.done } : x) }))}
                      onDelete={() => setGoals(p => ({ ...p, weeklyGoals: p.weeklyGoals.filter(x => x.id !== g.id) }))} />
                  ))}
                </div>
                <form onSubmit={e => { e.preventDefault(); if (newWeekly.trim()) { setGoals(p => ({ ...p, weeklyGoals: [...(p.weeklyGoals || []), { id: uid(), text: newWeekly.trim(), done: false }] })); setNewWeekly(''); } }} style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={newWeekly} onChange={e => setNewWeekly(e.target.value)} placeholder="Yeni haftalık hedef..." />
                  <button type="submit" style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1rem', fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /></button>
                </form>
              </Accordion>

              {/* Günlük Hedefler */}
              <Accordion title="🌅 Günlük Hedefler" icon={<Flame size={16} />} color="#dc2626" bg="#fef2f2" border="#fecaca">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '0.85rem' }}>
                  {(goals.dailyGoals || []).map(g => (
                    <CheckRow key={g.id} label={g.text} checked={g.done}
                      onChange={() => setGoals(p => ({ ...p, dailyGoals: p.dailyGoals.map(x => x.id === g.id ? { ...x, done: !x.done } : x) }))}
                      onDelete={() => setGoals(p => ({ ...p, dailyGoals: p.dailyGoals.filter(x => x.id !== g.id) }))} />
                  ))}
                </div>
                <form onSubmit={e => { e.preventDefault(); if (newDaily.trim()) { setGoals(p => ({ ...p, dailyGoals: [...(p.dailyGoals || []), { id: uid(), text: newDaily.trim(), done: false }] })); setNewDaily(''); } }} style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={newDaily} onChange={e => setNewDaily(e.target.value)} placeholder="Yeni günlük hedef..." />
                  <button type="submit" style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1rem', fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /></button>
                </form>
              </Accordion>
            </SectionCard>
          )}

          {/* ════ BÖLÜM: GÖRSEL ÖZEL HEDEF PANOSU ════ */}
          {activeTab === 'visualgoals' && (
            <SectionCard title="Görsel Özel Hedef Takip Panosu" icon={<BarChart3 size={20} />} color="#0284c7">
              <VisualGoalSection studentId={studentId} />
            </SectionCard>
          )}

          {/* ════ BÖLÜM 4: DERS ANALİZİ ════ */}
          {activeTab === 'subjects' && (
            <SectionCard num={4} title="Ders Analizi" icon={<BookOpen size={20} />} color="#f59e0b">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {SUBJECTS.map(s => (
                  <button key={s} onClick={() => setActiveSubject(s)} style={{
                    padding: '0.5rem 1rem', borderRadius: '0.65rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                    background: activeSubject === s ? '#f59e0b' : '#f8fafc',
                    color: activeSubject === s ? 'white' : '#475569',
                    border: activeSubject === s ? 'none' : '1.5px solid #e2e8f0'
                  }}>{s}</button>
                ))}
              </div>

              {/* Senkronlu deneme netleri */}
              {(() => {
                const subNets = studentSubmissions
                  .filter(s => s.subjectStats)
                  .slice(0, 5)
                  .map(s => {
                    const stats = Array.isArray(s.subjectStats) ? s.subjectStats : s.subjectStats?.subjectStats;
                    const subStat = (stats || []).find(x => x.name === activeSubject);
                    return subStat ? { net: subStat.net, date: s.submittedAt || s.createdAt } : null;
                  }).filter(Boolean);

                return subNets.length > 0 && (
                  <div style={{ background: '#fefce8', border: '1.5px solid #fde68a', borderRadius: '0.85rem', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#92400e', marginBottom: 6 }}>📊 Son Deneme Netleri (Otomatik Senkron)</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {subNets.map((n, i) => (
                        <span key={i} style={{ background: '#f59e0b', color: 'white', fontWeight: 900, fontSize: '0.78rem', padding: '0.25rem 0.65rem', borderRadius: 99 }}>
                          {n.net} net
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <FieldGrid cols={2}>
                <Field label="Konular / Kazanımlar">
                  <textarea style={textareaStyle} value={subjectAnalysis[activeSubject]?.topics || ''} onChange={e => setSubjectAnalysis(p => ({ ...p, [activeSubject]: { ...p[activeSubject], topics: e.target.value } }))} placeholder="İşlenen konular ve kazanımlar..." />
                </Field>
                <Field label="Eksikler / Zayıf Noktalar">
                  <textarea style={textareaStyle} value={subjectAnalysis[activeSubject]?.gaps || ''} onChange={e => setSubjectAnalysis(p => ({ ...p, [activeSubject]: { ...p[activeSubject], gaps: e.target.value } }))} placeholder="Tamamlanması gereken eksikler..." />
                </Field>
                <Field label="Son Deneme Neti">
                  <input style={inputStyle} value={subjectAnalysis[activeSubject]?.examNet || ''} onChange={e => setSubjectAnalysis(p => ({ ...p, [activeSubject]: { ...p[activeSubject], examNet: e.target.value } }))} placeholder="Örn: 18.5" />
                </Field>
                <Field label="Hata Türü">
                  <select style={inputStyle} value={subjectAnalysis[activeSubject]?.errorTypes || ''} onChange={e => setSubjectAnalysis(p => ({ ...p, [activeSubject]: { ...p[activeSubject], errorTypes: e.target.value } }))}>
                    <option value="">Seçin...</option>
                    <option value="Dikkat Hatası">Dikkat Hatası</option>
                    <option value="Bilgi Eksikliği">Bilgi Eksikliği</option>
                    <option value="İşlem Hatası">İşlem Hatası</option>
                    <option value="Süre Yönetimi">Süre Yönetimi</option>
                    <option value="Konu Kavramama">Konu Kavramama</option>
                  </select>
                </Field>
                <Field label="Tekrar Tarihi" full>
                  <input style={inputStyle} type="date" value={subjectAnalysis[activeSubject]?.retakeDate || ''} onChange={e => setSubjectAnalysis(p => ({ ...p, [activeSubject]: { ...p[activeSubject], retakeDate: e.target.value } }))} />
                </Field>
              </FieldGrid>
            </SectionCard>
          )}

          {/* ════ BÖLÜM 5: HAFTALIK PROGRAM ════ */}
          {activeTab === 'weekly' && (
            <SectionCard num={5} title="Haftalık Program" icon={<Calendar size={20} />} color="#0369a1">
              <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '0.85rem', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#0c4a6e', fontWeight: 700 }}>
                💡 Haftanın her gününe istediğiniz sayıda ders, konu ve süre ekleyebilirsiniz. Öğrenci tamamladıkça tik atabilir.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {DAYS_SHORT.map(dayName => {
                  const normalizedProg = normalizeWeeklyProgram(weeklyProgram);
                  const dayData = normalizedProg.find(w => w.day === dayName) || { day: dayName, items: [] };
                  const items = dayData.items || [];
                  const completedCount = items.filter(i => i.done).length;
                  const input = newScheduleInputs[dayName] || { subject: SUBJECTS[0], topic: '', hours: '', isRecurring: true };

                  const addTeacherWeeklyItem = () => {
                    if (!input.subject && !input.topic) return;
                    setWeeklyProgram(prev => {
                      const norm = normalizeWeeklyProgram(prev);
                      return norm.map(d => d.day === dayName ? {
                        ...d,
                        items: [...(d.items || []), {
                          id: uid(),
                          subject: input.subject || 'Ders',
                          topic: input.topic || '',
                          hours: input.hours || '',
                          isRecurring: input.isRecurring !== false,
                          done: false
                        }]
                      } : d);
                    });
                    setNewScheduleInputs(p => ({ ...p, [dayName]: { subject: SUBJECTS[0], topic: '', hours: '', isRecurring: true } }));
                  };

                  const toggleTeacherWeeklyItem = (itemId) => {
                    setWeeklyProgram(prev => {
                      const norm = normalizeWeeklyProgram(prev);
                      return norm.map(d => d.day === dayName ? {
                        ...d,
                        items: (d.items || []).map(item => item.id === itemId ? { ...item, done: !item.done } : item)
                      } : d);
                    });
                  };

                  const toggleTeacherRecurringItem = (itemId) => {
                    setWeeklyProgram(prev => {
                      const norm = normalizeWeeklyProgram(prev);
                      return norm.map(d => d.day === dayName ? {
                        ...d,
                        items: (d.items || []).map(item => item.id === itemId ? { ...item, isRecurring: item.isRecurring === false ? true : false } : item)
                      } : d);
                    });
                  };

                  const deleteTeacherWeeklyItem = (itemId) => {
                    setWeeklyProgram(prev => {
                      const norm = normalizeWeeklyProgram(prev);
                      return norm.map(d => d.day === dayName ? {
                        ...d,
                        items: (d.items || []).filter(item => item.id !== itemId)
                      } : d);
                    });
                  };

                  return (
                    <div key={dayName} style={{ background: '#f8fafc', borderRadius: '1rem', border: '1.5px solid #e2e8f0', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1.5px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ background: '#0369a1', color: 'white', fontWeight: 900, fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '0.4rem' }}>{dayName}</span>
                          <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#1e293b' }}>{dayName} Programı</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, background: completedCount === items.length && items.length > 0 ? '#dcfce7' : '#e2e8f0', color: completedCount === items.length && items.length > 0 ? '#15803d' : '#64748b', padding: '0.2rem 0.5rem', borderRadius: 99 }}>
                          {completedCount}/{items.length}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, marginBottom: '0.85rem' }}>
                        {items.length === 0 && (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', padding: '0.75rem 0', fontStyle: 'italic' }}>
                            Ders eklenmedi.
                          </div>
                        )}
                        {items.map(item => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0.5rem 0.7rem', background: item.done ? '#f0fdf4' : 'white', border: item.done ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0', borderRadius: '0.65rem' }}>
                            <button type="button" onClick={() => toggleTeacherWeeklyItem(item.id)} style={{ width: 22, height: 22, borderRadius: 6, background: item.done ? '#16a34a' : 'white', border: item.done ? 'none' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                              {item.done && <Check size={14} color="white" strokeWidth={3} />}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: item.done ? '#15803d' : '#1e293b', textDecoration: item.done ? 'line-through' : 'none' }}>{item.subject}</span>
                                {item.hours && <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.4rem', borderRadius: 4 }}>⏱️ {item.hours}</span>}
                                <button type="button" onClick={() => toggleTeacherRecurringItem(item.id)} title={item.isRecurring !== false ? "Tıkla: Tek Seferlik Yap" : "Tıkla: Her Hafta Tekrarlı Yap"} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                                  {item.isRecurring !== false ? (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#e0e7ff', color: '#3730a3', padding: '0.1rem 0.4rem', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                      🔁 Her Hafta
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.4rem', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                      📌 Tek Seferlik
                                    </span>
                                  )}
                                </button>
                              </div>
                              {item.topic && <div style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>{item.topic}</div>}
                            </div>
                            <button type="button" onClick={() => deleteTeacherWeeklyItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2 }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.65rem', marginTop: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                          <select style={{ ...inputStyle, padding: '0.35rem 0.55rem', fontSize: '0.78rem' }} value={input.subject} onChange={e => setNewScheduleInputs(p => ({ ...p, [dayName]: { ...p[dayName], subject: e.target.value } }))}>
                            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                          </select>
                          <input style={{ ...inputStyle, padding: '0.35rem 0.55rem', fontSize: '0.78rem' }} value={input.hours} onChange={e => setNewScheduleInputs(p => ({ ...p, [dayName]: { ...p[dayName], hours: e.target.value } }))} placeholder="Süre/Saat" />
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                          <input style={{ ...inputStyle, flex: 1, padding: '0.35rem 0.55rem', fontSize: '0.78rem' }} value={input.topic} onChange={e => setNewScheduleInputs(p => ({ ...p, [dayName]: { ...p[dayName], topic: e.target.value } }))} placeholder="Konu / Detay" />
                          <button type="button" onClick={addTeacherWeeklyItem} style={{ background: '#0369a1', color: 'white', border: 'none', borderRadius: '0.55rem', padding: '0.35rem 0.7rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Plus size={14} /> Ekle
                          </button>
                        </div>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.73rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                          <input type="checkbox"
                            checked={input.isRecurring !== false}
                            onChange={e => setNewScheduleInputs(p => ({ ...p, [dayName]: { ...p[dayName], isRecurring: e.target.checked } }))} />
                          🔁 Her Hafta Tekrar Et
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ════ BÖLÜM 6: GÜNLÜK ÇALIŞMA TAKİBİ ════ */}
          {activeTab === 'daily' && (
            <SectionCard num={6} title="Günlük Çalışma Takibi" icon={<Clock size={20} />} color="#0891b2">
              <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '0.85rem', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#0c4a6e', fontWeight: 700 }}>
                💡 Öğrenci her gün kendi kaydını girer. Koç gözlemleyebilir.
              </div>

              {/* New Entry Form */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.85rem' }}>➕ Yeni Gün Kaydı</div>
                <FieldGrid cols={3}>
                  <Field label="Tarih"><input style={inputStyle} type="date" value={newLog.date} onChange={e => setNewLog(p => ({ ...p, date: e.target.value }))} /></Field>
                  <Field label="Çalışma Süresi (saat)"><input style={inputStyle} type="number" value={newLog.studyHours} onChange={e => setNewLog(p => ({ ...p, studyHours: e.target.value }))} placeholder="Örn: 3.5" /></Field>
                  <Field label="Çözülen Soru"><input style={inputStyle} type="number" value={newLog.questions} onChange={e => setNewLog(p => ({ ...p, questions: e.target.value }))} placeholder="Örn: 120" /></Field>
                  <Field label="Yapılan Tekrar"><input style={inputStyle} value={newLog.revision} onChange={e => setNewLog(p => ({ ...p, revision: e.target.value }))} placeholder="Ders/konu" /></Field>
                  <Field label="İzlenen Ders"><input style={inputStyle} value={newLog.videoLesson} onChange={e => setNewLog(p => ({ ...p, videoLesson: e.target.value }))} placeholder="Konu/süre" /></Field>
                  <Field label="Uyku Saati"><input style={inputStyle} value={newLog.sleepTime} onChange={e => setNewLog(p => ({ ...p, sleepTime: e.target.value }))} placeholder="Örn: 23:00" /></Field>
                </FieldGrid>
                <div style={{ display: 'flex', gap: 12, marginTop: '0.85rem', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#374151' }}>
                    <input type="checkbox" checked={newLog.sport} onChange={e => setNewLog(p => ({ ...p, sport: e.target.checked }))} /> 🏃 Spor Yaptım
                  </label>
                  <button onClick={() => {
                    if (!newLog.date) return;
                    setDailyLogs(p => [{ id: uid(), ...newLog }, ...p]);
                    setNewLog({ date: today(), studyHours: '', questions: '', revision: '', videoLesson: '', reading: '', sport: false, sleepTime: '' });
                  }} style={{ background: '#0891b2', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', marginLeft: 'auto' }}>
                    <Plus size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />Kaydet
                  </button>
                </div>
              </div>

              {/* Log Table */}
              {dailyLogs.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ color: '#64748b', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        {['Tarih', 'Süre', 'Soru', 'Tekrar', 'Video', 'Uyku', 'Spor', ''].map(h => (
                          <th key={h} style={{ padding: '0.4rem 0.65rem', textAlign: 'left', fontWeight: 800 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dailyLogs.map(log => (
                        <tr key={log.id} style={{ background: '#f8fafc' }}>
                          <td style={{ padding: '0.5rem 0.65rem', borderRadius: '0.5rem 0 0 0.5rem', fontWeight: 700 }}>{log.date}</td>
                          <td style={{ padding: '0.5rem 0.65rem' }}>{log.studyHours}s</td>
                          <td style={{ padding: '0.5rem 0.65rem', fontWeight: 800, color: '#4f46e5' }}>{log.questions}</td>
                          <td style={{ padding: '0.5rem 0.65rem', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.revision}</td>
                          <td style={{ padding: '0.5rem 0.65rem', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.videoLesson}</td>
                          <td style={{ padding: '0.5rem 0.65rem' }}>{log.sleepTime}</td>
                          <td style={{ padding: '0.5rem 0.65rem' }}>{log.sport ? '✅' : '—'}</td>
                          <td style={{ padding: '0.5rem 0.65rem', borderRadius: '0 0.5rem 0.5rem 0' }}>
                            <button onClick={() => setDailyLogs(p => p.filter(x => x.id !== log.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {/* ════ BÖLÜM 7: DENEME TAKİBİ ════ */}
          {activeTab === 'mock' && (
            <SectionCard num={7} title="Deneme Takibi" icon={<BarChart3 size={20} />} color="#7c3aed">
              {/* Senkronlu veriler */}
              {studentSubmissions.length > 0 && (
                <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: '0.85rem', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#6b21a8', marginBottom: 8 }}>📊 Senkronize Deneme Sonuçları (Otomatik)</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: '#7c3aed', color: 'white' }}>
                          {['Deneme', 'Net', 'D', 'Y', 'B', 'Tarih'].map(h => (
                            <th key={h} style={{ padding: '0.45rem 0.65rem', fontWeight: 800, fontSize: '0.72rem', textAlign: 'center' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {studentSubmissions.slice(0, 10).map((s, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? '#faf5ff' : 'white' }}>
                            <td style={{ padding: '0.45rem 0.65rem', fontWeight: 700, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.testTitle || '—'}</td>
                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center', fontWeight: 900, color: '#7c3aed' }}>{s.score ?? '—'}</td>
                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>{s.correctCount ?? '—'}</td>
                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center', color: '#dc2626', fontWeight: 800 }}>{s.wrongCount ?? '—'}</td>
                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center', color: '#d97706', fontWeight: 800 }}>{s.blankCount ?? '—'}</td>
                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center', color: '#64748b' }}>{s.submittedAt?.slice(0, 10) || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ⏳ Öğrencinin Girdiği Onay Bekleyen Denemeler */}
              {pendingMockExams.length > 0 && (
                <div style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: '1rem', padding: '1.1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
                    <span>⏳</span> Öğrencinin Eklediği Onay Bekleyen Denemeler ({pendingMockExams.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pendingMockExams.map(m => (
                      <div key={m.id} style={{ background: 'white', border: '1px solid #fef08a', borderRadius: '0.75rem', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#1e293b' }}>{m.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                            Tarih: {m.date} · Tür: {m.examType || 'Deneme'} · Toplam Net: <strong style={{ color: '#7c3aed' }}>{m.totalNet}</strong>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" onClick={() => approveMockExam(m.id)} style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.6rem', padding: '0.45rem 0.9rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={14} /> Onayla
                          </button>
                          <button type="button" onClick={() => deleteMockExam(m.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.6rem', padding: '0.45rem 0.9rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Trash2 size={14} /> Reddet / Sil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manuel deneme ekleme */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.85rem' }}>➕ Manuel Deneme Ekle (Dışarıdan alınan denemeler için)</div>
                <FieldGrid cols={3}>
                  <Field label="Tarih"><input style={inputStyle} type="date" value={newMock.date} onChange={e => setNewMock(p => ({ ...p, date: e.target.value }))} /></Field>
                  <Field label="Deneme Adı"><input style={inputStyle} value={newMock.name} onChange={e => setNewMock(p => ({ ...p, name: e.target.value }))} placeholder="Örn: TYT Deneme #4" /></Field>
                  <Field label="Türkçe Net"><input style={inputStyle} value={newMock.turkce} onChange={e => setNewMock(p => ({ ...p, turkce: e.target.value }))} placeholder="0.00" /></Field>
                  <Field label="Matematik Net"><input style={inputStyle} value={newMock.matematik} onChange={e => setNewMock(p => ({ ...p, matematik: e.target.value }))} placeholder="0.00" /></Field>
                  <Field label="Fen Net"><input style={inputStyle} value={newMock.fen} onChange={e => setNewMock(p => ({ ...p, fen: e.target.value }))} placeholder="0.00" /></Field>
                  <Field label="Sosyal Net"><input style={inputStyle} value={newMock.sosyal} onChange={e => setNewMock(p => ({ ...p, sosyal: e.target.value }))} placeholder="0.00" /></Field>
                  <Field label="Yanlış Nedeni">
                    <select style={inputStyle} value={newMock.wrongReason} onChange={e => setNewMock(p => ({ ...p, wrongReason: e.target.value }))}>
                      <option value="">Seçin...</option>
                      <option value="Dikkat Hatası">Dikkat Hatası</option>
                      <option value="Süre Yönetimi">Süre Yönetimi</option>
                      <option value="Bilgi Eksikliği">Bilgi Eksikliği</option>
                      <option value="İşlem Hatası">İşlem Hatası</option>
                    </select>
                  </Field>
                  <Field label="Süre Notu"><input style={inputStyle} value={newMock.timeNote} onChange={e => setNewMock(p => ({ ...p, timeNote: e.target.value }))} placeholder="Süre nasıl geçti?" /></Field>
                </FieldGrid>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button onClick={() => {
                    if (!newMock.name) return;
                    const total = [newMock.turkce, newMock.matematik, newMock.fen, newMock.sosyal].reduce((s, v) => s + (parseFloat(v) || 0), 0);
                    setMockExams(p => [{ id: uid(), ...newMock, totalNet: total.toFixed(2) }, ...p]);
                    setNewMock({ date: today(), name: '', turkce: '', matematik: '', fen: '', sosyal: '', ingilizce: '', totalNet: '', wrongReason: '', timeNote: '' });
                  }} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <Plus size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />Deneme Ekle
                  </button>
                </div>
              </div>

              {mockExams.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ color: '#64748b', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        {['Tarih', 'Deneme', 'Tr', 'Mat', 'Fen', 'Sos', 'Toplam', 'Neden', ''].map(h => <th key={h} style={{ padding: '0.4rem 0.65rem', textAlign: 'center', fontWeight: 800 }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {mockExams.map(m => (
                        <tr key={m.id} style={{ background: '#f8fafc', textAlign: 'center' }}>
                          <td style={{ padding: '0.5rem 0.65rem', borderRadius: '0.5rem 0 0 0.5rem', fontWeight: 700, textAlign: 'left' }}>{m.date}</td>
                          <td style={{ padding: '0.5rem 0.65rem', textAlign: 'left', fontWeight: 700, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</td>
                          <td style={{ padding: '0.5rem 0.65rem' }}>{m.turkce || '—'}</td>
                          <td style={{ padding: '0.5rem 0.65rem' }}>{m.matematik || '—'}</td>
                          <td style={{ padding: '0.5rem 0.65rem' }}>{m.fen || '—'}</td>
                          <td style={{ padding: '0.5rem 0.65rem' }}>{m.sosyal || '—'}</td>
                          <td style={{ padding: '0.5rem 0.65rem', fontWeight: 900, color: '#7c3aed' }}>{m.totalNet}</td>
                          <td style={{ padding: '0.5rem 0.65rem', color: '#64748b', fontSize: '0.75rem' }}>{m.wrongReason || '—'}</td>
                          <td style={{ padding: '0.5rem 0.65rem', borderRadius: '0 0.5rem 0.5rem 0' }}>
                            <button onClick={() => setMockExams(p => p.filter(x => x.id !== m.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {/* ════ BÖLÜM 8: KONU TAKİP ════ */}
          {activeTab === 'topics' && (
            <SectionCard num={8} title="Konu Takip Çizelgesi" icon={<ClipboardList size={20} />} color="#0369a1">
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.85rem' }}>➕ Yeni Konu Ekle</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: 8, alignItems: 'flex-end' }}>
                  <Field label="Ders">
                    <select style={inputStyle} value={newTopic.subject} onChange={e => setNewTopic(p => ({ ...p, subject: e.target.value }))}>
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Konu Adı">
                    <input style={inputStyle} value={newTopic.topic} onChange={e => setNewTopic(p => ({ ...p, topic: e.target.value }))} placeholder="Konu adı..." />
                  </Field>
                  <Field label="Durum">
                    <select style={inputStyle} value={newTopic.status} onChange={e => setNewTopic(p => ({ ...p, status: e.target.value }))}>
                      {TOPIC_STATUS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <button onClick={() => {
                    if (!newTopic.topic.trim()) return;
                    setTopicList(p => [...p, { id: uid(), ...newTopic }]);
                    setNewTopic(p => ({ ...p, topic: '' }));
                  }} style={{ background: '#0369a1', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.65rem 1rem', fontWeight: 800, cursor: 'pointer', marginBottom: 0 }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SUBJECTS.map(subj => {
                  const items = topicList.filter(t => t.subject === subj);
                  if (items.length === 0) return null;
                  return (
                    <div key={subj}>
                      <div style={{ fontWeight: 900, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, marginTop: 8 }}>{subj}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {items.map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.85rem', background: '#f8fafc', borderRadius: '0.65rem', border: '1px solid #e2e8f0' }}>
                            <span style={{ flex: 1, fontWeight: 700, fontSize: '0.85rem', color: '#374151' }}>{t.topic}</span>
                            <select value={t.status} onChange={e => setTopicList(p => p.map(x => x.id === t.id ? { ...x, status: e.target.value } : x))}
                              style={{ padding: '0.3rem 0.5rem', borderRadius: '0.5rem', border: `1.5px solid ${STATUS_COLOR[t.status]}30`, background: `${STATUS_COLOR[t.status]}15`, color: STATUS_COLOR[t.status], fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', outline: 'none' }}>
                              {TOPIC_STATUS.map(s => <option key={s}>{s}</option>)}
                            </select>
                            <button onClick={() => setTopicList(p => p.filter(x => x.id !== t.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={13} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {topicList.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '0.85rem', fontWeight: 700 }}>Henüz konu eklenmedi. Yukarıdan ekleyebilirsiniz.</div>}
              </div>
            </SectionCard>
          )}

          {/* ════ BÖLÜM 9: SORU TAKİP ════ */}
          {activeTab === 'questions' && (
            <SectionCard num={9} title="Soru Takip Formu" icon={<Target size={20} />} color="#dc2626">
              <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '0.85rem', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#991b1b', fontWeight: 700 }}>
                💡 Öğrenci her gün günceller. Günlük soru hedefini gir ve takibini yap.
              </div>
              <FieldGrid cols={2}>
                <Field label="Günlük Soru Hedefi">
                  <input style={inputStyle} type="number" value={questionTrack.dailyGoal} onChange={e => setQuestionTrack(p => ({ ...p, dailyGoal: e.target.value }))} placeholder="Örn: 100" />
                </Field>
                <Field label="Çözülen Soru">
                  <input style={inputStyle} type="number" value={questionTrack.solved} onChange={e => setQuestionTrack(p => ({ ...p, solved: e.target.value }))} placeholder="Bugün kaç soru çözdün?" />
                </Field>
                <Field label="En Çok Zorlanılan Ders">
                  <select style={inputStyle} value={questionTrack.hardestSubject} onChange={e => setQuestionTrack(p => ({ ...p, hardestSubject: e.target.value }))}>
                    <option value="">Seçin...</option>
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Eksik Kalan">
                  <input style={inputStyle} type="number" value={questionTrack.remaining} onChange={e => setQuestionTrack(p => ({ ...p, remaining: e.target.value }))} placeholder="Tamamlanmayan soru sayısı" />
                </Field>
              </FieldGrid>

              {/* Progress */}
              {questionTrack.dailyGoal && questionTrack.solved && (
                <div style={{ marginTop: '1.25rem', background: '#f8fafc', borderRadius: '0.85rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.82rem', color: '#374151', marginBottom: 6 }}>
                    <span>Günlük İlerleme</span>
                    <span style={{ color: '#dc2626' }}>{Math.min(100, Math.round((parseFloat(questionTrack.solved) / parseFloat(questionTrack.dailyGoal)) * 100))}%</span>
                  </div>
                  <div style={{ height: 12, background: '#fee2e2', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.round((parseFloat(questionTrack.solved) / parseFloat(questionTrack.dailyGoal)) * 100))}%`, background: 'linear-gradient(90deg,#dc2626,#f87171)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* ════ BÖLÜM 10: HATA DEFTERİ ════ */}
          {activeTab === 'errors' && (
            <SectionCard num={10} title="Hata Defteri" icon={<AlertTriangle size={20} />} color="#dc2626">
              <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '0.85rem', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#991b1b', fontWeight: 700 }}>
                💡 Her yanlış için ayrı kayıt. Öğrenci ve koç birlikte doldurur.
              </div>

              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.85rem' }}>➕ Yeni Hata Kaydı</div>
                <FieldGrid cols={2}>
                  <Field label="Ders">
                    <select style={inputStyle} value={newError.subject} onChange={e => setNewError(p => ({ ...p, subject: e.target.value }))}>
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Konu">
                    <input style={inputStyle} value={newError.topic} onChange={e => setNewError(p => ({ ...p, topic: e.target.value }))} placeholder="Hangi konuda?" />
                  </Field>
                  <Field label="Yanlış Nedeni">
                    <select style={inputStyle} value={newError.reason} onChange={e => setNewError(p => ({ ...p, reason: e.target.value }))}>
                      <option value="">Seçin...</option>
                      <option value="Dikkat Hatası">Dikkat Hatası</option>
                      <option value="Bilgi Eksikliği">Bilgi Eksikliği</option>
                      <option value="İşlem Hatası">İşlem Hatası</option>
                      <option value="Süre Baskısı">Süre Baskısı</option>
                      <option value="Soru Yanlış Anlaşıldı">Soru Yanlış Anlaşıldı</option>
                    </select>
                  </Field>
                  <Field label="Tekrar Tarihi">
                    <input style={inputStyle} type="date" value={newError.retakeDate} onChange={e => setNewError(p => ({ ...p, retakeDate: e.target.value }))} />
                  </Field>
                  <Field label="Doğrusu / Açıklama" full>
                    <textarea style={{ ...textareaStyle, minHeight: 60 }} value={newError.correct} onChange={e => setNewError(p => ({ ...p, correct: e.target.value }))} placeholder="Doğru çözüm veya açıklama..." />
                  </Field>
                </FieldGrid>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button onClick={() => {
                    if (!newError.topic.trim()) return;
                    setErrors(p => [{ id: uid(), ...newError }, ...p]);
                    setNewError({ subject: SUBJECTS[0], topic: '', reason: '', correct: '', retakeDate: today() });
                  }} style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <Plus size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />Kaydet
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {errors.map(err => (
                  <div key={err.id} style={{ background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: '0.85rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ background: '#dc2626', color: 'white', fontWeight: 800, fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 99 }}>{err.subject}</span>
                        <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#374151', marginLeft: 8 }}>{err.topic}</span>
                        {err.reason && <span style={{ marginLeft: 8, background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.73rem', padding: '0.15rem 0.5rem', borderRadius: 6, border: '1px solid #fecaca' }}>{err.reason}</span>}
                      </div>
                      <button onClick={() => setErrors(p => p.filter(x => x.id !== err.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={14} /></button>
                    </div>
                    {err.correct && <div style={{ marginTop: 6, fontSize: '0.82rem', color: '#475569', background: 'white', borderRadius: '0.55rem', padding: '0.5rem 0.75rem', border: '1px solid #fee2e2' }}>{err.correct}</div>}
                    {err.retakeDate && <div style={{ marginTop: 4, fontSize: '0.73rem', color: '#94a3b8', fontWeight: 700 }}>🔁 Tekrar: {err.retakeDate}</div>}
                  </div>
                ))}
                {errors.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '0.85rem', fontWeight: 700 }}>Henüz hata kaydı yok. Yukarıdan ekleyebilirsiniz.</div>}
              </div>
            </SectionCard>
          )}

          {/* ════ BÖLÜM 11: KOÇ GÖRÜŞME FORMU ════ */}
          {activeTab === 'meetings' && (
            <SectionCard num={11} title="Koç Görüşme Formu" icon={<MessageSquare size={20} />} color="#0891b2">
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.85rem' }}>➕ Yeni Görüşme Kaydı</div>
                <FieldGrid cols={2}>
                  <Field label="Görüşme Tarihi"><input style={inputStyle} type="date" value={newMeeting.date} onChange={e => setNewMeeting(p => ({ ...p, date: e.target.value }))} /></Field>
                  <Field label="Süre (dk)"><input style={inputStyle} type="number" value={newMeeting.duration} onChange={e => setNewMeeting(p => ({ ...p, duration: e.target.value }))} placeholder="Dakika" /></Field>
                  <Field label="O Haftanın Değerlendirmesi" full>
                    <textarea style={textareaStyle} value={newMeeting.evaluation} onChange={e => setNewMeeting(p => ({ ...p, evaluation: e.target.value }))} placeholder="Bu hafta nasıl geçti? Genel değerlendirme..." />
                  </Field>
                  <Field label="Güçlü Yönler">
                    <textarea style={{ ...textareaStyle, minHeight: 60 }} value={newMeeting.strengths} onChange={e => setNewMeeting(p => ({ ...p, strengths: e.target.value }))} placeholder="Bu hafta iyi giden şeyler..." />
                  </Field>
                  <Field label="Geliştirilmesi Gerekenler">
                    <textarea style={{ ...textareaStyle, minHeight: 60 }} value={newMeeting.improvements} onChange={e => setNewMeeting(p => ({ ...p, improvements: e.target.value }))} placeholder="Önümüzdeki haftada çalışılacaklar..." />
                  </Field>
                  <Field label="Sonraki Hafta Hedefleri" full>
                    <textarea style={{ ...textareaStyle, minHeight: 60 }} value={newMeeting.nextGoals} onChange={e => setNewMeeting(p => ({ ...p, nextGoals: e.target.value }))} placeholder="Somut hedefler..." />
                  </Field>
                </FieldGrid>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button onClick={() => {
                    if (!newMeeting.evaluation.trim()) return;
                    setMeetings(p => [{ id: uid(), ...newMeeting }, ...p]);
                    setNewMeeting({ date: today(), duration: '45', evaluation: '', strengths: '', improvements: '', nextGoals: '' });
                  }} style={{ background: '#0891b2', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Görüşmeyi Kaydet
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {meetings.map(m => (
                  <div key={m.id} style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '0.85rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0c4a6e' }}>{m.date} · {m.duration} dk</div>
                      <button onClick={() => setMeetings(p => p.filter(x => x.id !== m.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={14} /></button>
                    </div>
                    {m.evaluation && <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#374151' }}><strong>Değerlendirme:</strong> {m.evaluation}</p>}
                    {m.strengths && <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#16a34a' }}><strong>💪 Güçlü:</strong> {m.strengths}</p>}
                    {m.improvements && <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#dc2626' }}><strong>🔧 Gelişim:</strong> {m.improvements}</p>}
                    {m.nextGoals && <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#7c3aed' }}><strong>🎯 Sonraki Hedefler:</strong> {m.nextGoals}</p>}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ════ BÖLÜM 12: VELİ GÖRÜŞME ════ */}
          {activeTab === 'parent' && (
            <SectionCard num={12} title="Veli Görüşme Formu" icon={<Phone size={20} />} color="#059669">
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.85rem' }}>➕ Yeni Veli Görüşmesi</div>
                <FieldGrid cols={2}>
                  <Field label="Tarih"><input style={inputStyle} type="date" value={newParentMeeting.date} onChange={e => setNewParentMeeting(p => ({ ...p, date: e.target.value }))} /></Field>
                  <Field label="Konular">
                    <input style={inputStyle} value={newParentMeeting.topics} onChange={e => setNewParentMeeting(p => ({ ...p, topics: e.target.value }))} placeholder="Görüşme konuları..." />
                  </Field>
                  <Field label="Velinin Geri Bildirimi" full>
                    <textarea style={textareaStyle} value={newParentMeeting.feedback} onChange={e => setNewParentMeeting(p => ({ ...p, feedback: e.target.value }))} placeholder="Veli ne söyledi?" />
                  </Field>
                  <Field label="Alınan Kararlar" full>
                    <textarea style={{ ...textareaStyle, minHeight: 60 }} value={newParentMeeting.decisions} onChange={e => setNewParentMeeting(p => ({ ...p, decisions: e.target.value }))} placeholder="Belirlenen eylem maddeleri..." />
                  </Field>
                </FieldGrid>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button onClick={() => {
                    if (!newParentMeeting.topics.trim()) return;
                    setParentMeetings(p => [{ id: uid(), ...newParentMeeting }, ...p]);
                    setNewParentMeeting({ date: today(), topics: '', feedback: '', decisions: '' });
                  }} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Kaydet
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {parentMeetings.map(m => (
                  <div key={m.id} style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '0.85rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 900, color: '#166534' }}>{m.date} · {m.topics}</div>
                      <button onClick={() => setParentMeetings(p => p.filter(x => x.id !== m.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={14} /></button>
                    </div>
                    {m.feedback && <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#374151' }}><strong>Geri Bildirim:</strong> {m.feedback}</p>}
                    {m.decisions && <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#7c3aed' }}><strong>Kararlar:</strong> {m.decisions}</p>}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ════ BÖLÜM 13: MOTİVASYON ════ */}
          {activeTab === 'motivation' && (
            <SectionCard num={13} title="Motivasyon Sayfası" icon={<Star size={20} />} color="#f59e0b">
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '0.85rem', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#92400e', fontWeight: 700 }}>
                💡 Bu sayfa tamamen öğrenciye aittir! Kendi sözlerini, başarılarını ve ödül sistemini yazar.
              </div>
              <FieldGrid cols={1}>
                <Field label="⭐ Haftanın Sözü / Motivasyon Cümlesi">
                  <textarea style={{ ...textareaStyle, minHeight: 60, background: '#fffbeb', borderColor: '#fde68a' }} value={motivation.weekQuote} onChange={e => setMotivation(p => ({ ...p, weekQuote: e.target.value }))} placeholder="Bu haftanın motivasyon sözü..." />
                </Field>
                <Field label="🏆 Başarılarım (Bu hafta ne başardım?)">
                  <textarea style={{ ...textareaStyle, background: '#f0fdf4', borderColor: '#bbf7d0' }} value={motivation.achievements} onChange={e => setMotivation(p => ({ ...p, achievements: e.target.value }))} placeholder="Küçük ya da büyük fark etmez, başarılarını yaz..." />
                </Field>
                <Field label="💌 Kendime Not">
                  <textarea style={{ ...textareaStyle, background: '#f0f4ff', borderColor: '#c7d2fe' }} value={motivation.selfNote} onChange={e => setMotivation(p => ({ ...p, selfNote: e.target.value }))} placeholder="Gelecekteki kendine bir not bırak..." />
                </Field>
                <Field label="🎁 Ödül Sistemim">
                  <textarea style={{ ...textareaStyle, minHeight: 60, background: '#fdf2f8', borderColor: '#f0abfc' }} value={motivation.rewardSystem} onChange={e => setMotivation(p => ({ ...p, rewardSystem: e.target.value }))} placeholder="Hedeflerimi tutarsam kendime ne hediye alacağım..." />
                </Field>
              </FieldGrid>
            </SectionCard>
          )}

          {/* ════ BÖLÜM 14: ALIŞKANLIK TAKİBİ ════ */}
          {activeTab === 'habits' && (
            <SectionCard num={14} title="Alışkanlık Takibi" icon={<Flame size={20} />} color="#dc2626">
              <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '0.85rem', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#991b1b', fontWeight: 700 }}>
                💡 Her gün akşam tamamlanan alışkanlıkları işaretle. Hücreye tıkla.
              </div>

              {/* Add habit */}
              <form onSubmit={e => { e.preventDefault(); if (newHabit.trim()) { setHabits(p => [...p, { id: uid(), label: newHabit.trim(), days: DAYS_SHORT.reduce((a, d) => ({ ...a, [d]: false }), {}) }]); setNewHabit(''); } }} style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
                <input style={{ ...inputStyle, flex: 1 }} value={newHabit} onChange={e => setNewHabit(e.target.value)} placeholder="Yeni alışkanlık ekle..." />
                <button type="submit" style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1rem', fontWeight: 800, cursor: 'pointer' }}><Plus size={16} /></button>
              </form>

              {/* Habit table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.4rem 0.85rem', fontWeight: 800, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Alışkanlık</th>
                      {DAYS_SHORT.map(d => <th key={d} style={{ textAlign: 'center', width: 44, fontWeight: 800, fontSize: '0.75rem', color: '#64748b' }}>{d}</th>)}
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map(h => (
                      <tr key={h.id}>
                        <td style={{ padding: '0.45rem 0.85rem', fontWeight: 700, fontSize: '0.85rem', color: '#374151', background: '#f8fafc', borderRadius: '0.5rem 0 0 0.5rem', border: '1px solid #e2e8f0', borderRight: 'none' }}>{h.label}</td>
                        {DAYS_SHORT.map(d => (
                          <td key={d} style={{ textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: 'none', borderRight: 'none', padding: 2 }}>
                            <button onClick={() => setHabits(p => p.map(x => x.id === h.id ? { ...x, days: { ...x.days, [d]: !x.days[d] } } : x))}
                              style={{ width: 32, height: 32, borderRadius: '50%', background: h.days[d] ? '#dc2626' : 'white', border: h.days[d] ? 'none' : '2px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto', transition: 'all 0.15s' }}>
                              {h.days[d] && <Check size={14} color="white" strokeWidth={3} />}
                            </button>
                          </td>
                        ))}
                        <td style={{ background: '#f8fafc', borderRadius: '0 0.5rem 0.5rem 0', border: '1px solid #e2e8f0', borderLeft: 'none', paddingRight: 6, textAlign: 'center' }}>
                          <button onClick={() => setHabits(p => p.filter(x => x.id !== h.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Streak summary */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '1rem' }}>
                {habits.map(h => {
                  const count = Object.values(h.days).filter(Boolean).length;
                  return (
                    <span key={h.id} style={{ background: count >= 5 ? '#fef2f2' : '#f8fafc', border: `1.5px solid ${count >= 5 ? '#fecaca' : '#e2e8f0'}`, color: count >= 5 ? '#dc2626' : '#64748b', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.7rem', borderRadius: 99 }}>
                      {h.label}: {count}/7 gün {count >= 5 ? '🔥' : ''}
                    </span>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ════ BÖLÜM 15: AYLIK DEĞERLENDİRME ════ */}
          {activeTab === 'monthly' && (
            <SectionCard num={15} title="Aylık Değerlendirme" icon={<TrendingUp size={20} />} color="#0369a1">
              <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '0.85rem', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#0c4a6e', fontWeight: 700 }}>
                💡 Ay sonunda birlikte doldurun. Gelişimi net olarak görmek için idealdir.
              </div>
              <FieldGrid cols={2}>
                <Field label="Bu Ay Öğrendiklerim" full>
                  <textarea style={textareaStyle} value={monthly.learned} onChange={e => setMonthly(p => ({ ...p, learned: e.target.value }))} placeholder="Bu ay neler öğrendim?" />
                </Field>
                <Field label="🏆 En Büyük Başarım">
                  <textarea style={{ ...textareaStyle, minHeight: 60 }} value={monthly.bestAchievement} onChange={e => setMonthly(p => ({ ...p, bestAchievement: e.target.value }))} placeholder="Bu ayın en büyük başarısı..." />
                </Field>
                <Field label="⚠️ En Büyük Hatam">
                  <textarea style={{ ...textareaStyle, minHeight: 60 }} value={monthly.biggestMistake} onChange={e => setMonthly(p => ({ ...p, biggestMistake: e.target.value }))} placeholder="Neyi farklı yapabilirdim?" />
                </Field>
                <Field label="Gelecek Ay Hedefim" full>
                  <textarea style={{ ...textareaStyle, minHeight: 60 }} value={monthly.nextGoal} onChange={e => setMonthly(p => ({ ...p, nextGoal: e.target.value }))} placeholder="Gelecek ay ne hedefliyorum?" />
                </Field>
                <Field label="Net Değişimi">
                  <input style={inputStyle} value={monthly.netChange} onChange={e => setMonthly(p => ({ ...p, netChange: e.target.value }))} placeholder="Örn: +5 net (70 → 75)" />
                </Field>
                <Field label="Çalışma Saati Notu">
                  <input style={inputStyle} value={monthly.studyHoursNote} onChange={e => setMonthly(p => ({ ...p, studyHoursNote: e.target.value }))} placeholder="Toplam kaç saat çalışıldı?" />
                </Field>
              </FieldGrid>

              {/* Auto-synced stats */}
              {studentSubmissions.length > 0 && (
                <div style={{ marginTop: '1.25rem', background: '#f8fafc', borderRadius: '0.85rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>📊 Otomatik Senkronize İstatistikler</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                    <div style={{ background: 'white', borderRadius: '0.65rem', padding: '0.65rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#4f46e5' }}>{studentSubmissions.length}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Toplam Deneme</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '0.65rem', padding: '0.65rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#16a34a' }}>
                        {studentSubmissions.length > 0 ? (studentSubmissions.reduce((s, x) => s + (x.score || 0), 0) / studentSubmissions.length).toFixed(1) : '—'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Ort. Net</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '0.65rem', padding: '0.65rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#dc2626' }}>
                        {studentSubmissions.length > 0 ? Math.max(...studentSubmissions.map(x => x.score || 0)) : '—'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>En Yüksek Net</div>
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* ════ BÖLÜM 16: KOÇ NOTLARI ════ */}
          {activeTab === 'coachnotes' && (
            <SectionCard num={16} title="Koç Notları (Özel)" icon={<FileText size={20} />} color="#475569">
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '0.85rem', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>
                🔒 Bu alan yalnızca koç / öğretmen tarafından görülür ve doldurulur. Öğrencinin görmesi önerilmez.
              </div>
              <FieldGrid cols={1}>
                <Field label="📝 Önemli Gözlemler">
                  <textarea style={textareaStyle} value={coachNotes.observations} onChange={e => setCoachNotes(p => ({ ...p, observations: e.target.value }))} placeholder="Öğrenci hakkında dikkat çeken gözlemler..." />
                </Field>
                <Field label="🧘 Psikolojik Durum">
                  <textarea style={{ ...textareaStyle, minHeight: 60 }} value={coachNotes.psychStatus} onChange={e => setCoachNotes(p => ({ ...p, psychStatus: e.target.value }))} placeholder="Kaygı, özgüven, stres durumu..." />
                </Field>
                <Field label="📈 Motivasyon Değişimi">
                  <textarea style={{ ...textareaStyle, minHeight: 60 }} value={coachNotes.motivationChange} onChange={e => setCoachNotes(p => ({ ...p, motivationChange: e.target.value }))} placeholder="Motivasyon nasıl değişti, ne tetikliyor..." />
                </Field>
                <Field label="👨‍👩‍👧 Aile ile Görüşmeler">
                  <textarea style={{ ...textareaStyle, minHeight: 60 }} value={coachNotes.parentNotes} onChange={e => setCoachNotes(p => ({ ...p, parentNotes: e.target.value }))} placeholder="Veli ile yapılan görüşmelerin özeti..." />
                </Field>
                <Field label="💡 Öneriler ve Stratejiler">
                  <textarea style={textareaStyle} value={coachNotes.suggestions} onChange={e => setCoachNotes(p => ({ ...p, suggestions: e.target.value }))} placeholder="Koçun önerileri, stratejiler, uygulanacak yöntemler..." />
                </Field>
              </FieldGrid>
            </SectionCard>
          )}

        </div>
      </div>

      {/* FLOATING SAVE */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100 }}>
        <button onClick={handleSave} style={{
          background: saved ? '#059669' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          color: 'white', border: 'none', borderRadius: '1rem',
          padding: '0.75rem 1.5rem', fontWeight: 900, fontSize: '0.88rem',
          cursor: 'pointer', boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
          display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.25s'
        }}>
          {saved ? <><CheckCircle2 size={18} /> Kaydedildi!</> : <><Save size={18} /> Tümünü Kaydet</>}
        </button>
      </div>

    </div>
  );
}