import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlayCircle, Target, AlertCircle, Timer, BookOpen, Check,
  Sparkles, Trophy, Flame, GraduationCap, BarChart3, Clock,
  Calendar, CheckCircle2, X, Plus, ExternalLink, Zap,
  ChevronRight, Star, TrendingUp, BookMarked, CalendarDays,
  Ruler, TestTube2, BookCopy, Globe, MessageSquare,
  FileText, ClipboardList, ArrowRight
} from 'lucide-react';
import { parse, isPast, isToday, differenceInDays, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useCurriculum } from '../context/CurriculumContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useGoal } from '../context/GoalContext';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

/* ─── helpers ──────────────────────────────────────────────────── */
const parseSafeDate = (d) => {
  if (!d) return new Date();
  const iso = new Date(d);
  if (!isNaN(iso)) return iso;
  return parse(d, 'dd MMMM yyyy', new Date(), { locale: tr });
};
export const getCategoryName = (t) => t.subject || 'Diğer';

/* ─── Subject Config ────────────────────────────────────────────── */
const subjectConfig = {
  'Matematik':            { icon: Ruler,        color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', badge: '#2563eb' },
  'Fen Bilimleri':        { icon: TestTube2,     color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', badge: '#059669' },
  'Türkçe':               { icon: BookCopy,      color: '#f97316', bg: '#fff7ed', border: '#fed7aa', badge: '#ea580c' },
  'Sosyal Bilgiler':      { icon: Globe,         color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff', badge: '#9333ea' },
  'İngilizce':            { icon: MessageSquare, color: '#f43f5e', bg: '#fff1f2', border: '#fecdd3', badge: '#e11d48' },
  'Genel Deneme Sınavları':{ icon: ClipboardList, color: '#6366f1', bg: '#eff6ff', border: '#c7d2fe', badge: '#4f46e5' },
  'Diğer':                { icon: FileText,      color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', badge: '#475569' },
};
const getSubConf = (s) => subjectConfig[s] || subjectConfig['Diğer'];

const getThemeKey = (cat) => {
  if (!cat) return 'Diğer';
  const c = cat.toLowerCase();
  if (c.includes('matematik')) return 'Matematik';
  if (c.includes('fen')) return 'Fen Bilimleri';
  if (c.includes('türkçe') || c.includes('turkce')) return 'Türkçe';
  if (c.includes('sosyal')) return 'Sosyal Bilgiler';
  if (c.includes('ingilizce')) return 'İngilizce';
  if (c.includes('deneme') || c.includes('genel')) return 'Genel Deneme Sınavları';
  return 'Diğer';
};

/* ─── Atom Components ──────────────────────────────────────────── */
function Avatar({ name, size = 40, color = '#6366f1' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 900, color: 'white', flexShrink: 0 }}>
      {name?.charAt(0) || 'Ö'}
    </div>
  );
}

function Pill({ children, color = '#6366f1', bg, border }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', fontWeight: 800, background: bg || `${color}18`, color, border: `1px solid ${border || `${color}33`}`, borderRadius: 99, padding: '0.18rem 0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </span>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color, bg, glow }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? bg : 'white', border: `1.5px solid ${hov ? color + '44' : '#f1f5f9'}`, borderRadius: '1.25rem', padding: '1.25rem', display: 'flex', gap: '0.9rem', alignItems: 'center', boxShadow: hov ? `0 8px 28px ${glow || color + '30'}` : '0 2px 10px rgba(0,0,0,0.05)', transition: 'all 0.2s', transform: hov ? 'translateY(-2px)' : 'none' }}
    >
      <div style={{ width: 48, height: 48, borderRadius: '0.9rem', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1.5px solid ${color}33` }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{sub}</div>}
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Homework Card ─────────────────────────────────────────────── */
function HomeworkCard({ task, selectedStudent }) {
  const conf = getSubConf(getThemeKey(task.subject));
  const Icon = conf.icon;
  const dueDate = task.dueDateObj;
  const overdue  = isPast(dueDate) && !isToday(dueDate);
  const dueToday = isToday(dueDate);
  const diff     = differenceInDays(dueDate, new Date());

  const urgency = overdue
    ? { label: `${differenceInDays(new Date(), dueDate)}g gecikti`, bg: '#ef4444', pulse: true }
    : dueToday
    ? { label: 'Bugün son!', bg: '#f97316', pulse: true }
    : diff <= 2
    ? { label: `${diff + 1}g kaldı`, bg: '#f59e0b', pulse: false }
    : { label: `${diff + 1}g kaldı`, bg: '#22c55e', pulse: false };

  return (
    <div style={{ background: 'white', border: `2px solid ${conf.border}`, borderRadius: '1.2rem', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${conf.color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
    >
      {/* Colored top bar */}
      <div style={{ height: 5, background: conf.badge }} />
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <Pill color={conf.badge} bg={conf.bg} border={conf.border}>{task.subject}</Pill>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.63rem', fontWeight: 800, background: urgency.bg, color: 'white', borderRadius: 99, padding: '0.18rem 0.6rem', animation: urgency.pulse ? 'pulse 1.5s infinite' : 'none' }}>
                ⏱ {urgency.label}
              </span>
            </div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{task.title}</h3>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: conf.bg, border: `1.5px solid ${conf.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} color={conf.color} />
          </div>
        </div>
        {/* Meta */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '0.65rem', padding: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Soru</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>{task.questionCount || '—'}</div>
          </div>
          <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '0.65rem', padding: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Süre</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>{task.durationMinutes}dk</div>
          </div>
          <div style={{ flex: 2, background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '0.65rem', padding: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Son Teslim</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{task.dueDateStr}</div>
          </div>
        </div>
        {/* CTA */}
        <Link to={task.sourceType === 'trackedBook' ? `/book-quiz/${task.id}?studentId=${selectedStudent?.id}` : `/quiz/${task.id}?studentId=${selectedStudent?.id}`} style={{ textDecoration: 'none', marginTop: 'auto' }}>
          <button style={{ width: '100%', padding: '0.7rem', borderRadius: '0.85rem', background: `linear-gradient(135deg,${conf.badge},${conf.color})`, color: 'white', fontWeight: 800, fontSize: '0.82rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 4px 16px ${conf.color}35`, transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <PlayCircle size={15} /> Ödevi Çöz
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ─── Goal Mini Card ────────────────────────────────────────────── */
function GoalMini({ goal, onDelete, onUpdateProgress, onNavigate }) {
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const done = pct >= 100;
  const strokes = { 'Soru': '#f43f5e', 'Sayfa': '#3b82f6', 'Dakika': '#10b981' };
  const stroke = done ? '#10b981' : (strokes[goal.type] || '#6366f1');

  return (
    <div style={{ background: done ? '#f0fdf4' : 'white', border: `1.5px solid ${done ? '#bbf7d0' : '#f1f5f9'}`, borderRadius: '1rem', padding: '0.9rem', display: 'flex', gap: '0.85rem', alignItems: 'center', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
    >
      <button onClick={(e) => { e.stopPropagation(); onDelete(goal.id); }} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: 12, display: 'flex', padding: 2 }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
      ><X size={13} /></button>
      {/* Radial */}
      <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
        <ResponsiveContainer width={56} height={56}>
          <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="100%" barSize={8} data={[{ value: pct, fill: stroke }]} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: '#f1f5f9' }} clockWise dataKey="value" cornerRadius={6} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: done ? '#059669' : '#0f172a' }}>{pct}%</span>
        </div>
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{goal.title}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill color="#64748b" bg="#f8fafc" border="#e2e8f0">{goal.period}</Pill>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{goal.current}/{goal.target} {goal.type}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {[5, 10, 25].map(v => (
            <button key={v} onClick={(e) => { e.stopPropagation(); onUpdateProgress(goal.id, v); }}
              style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.45rem', borderRadius: 6, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = stroke; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = stroke; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >+{v}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Quick Link Card ───────────────────────────────────────────── */
function QuickCard({ icon: Icon, label, sub, to, gradient, shadow }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(to)}
      style={{ background: gradient, borderRadius: '1.1rem', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', border: 'none', cursor: 'pointer', boxShadow: `0 4px 18px ${shadow}`, transition: 'all 0.2s', textAlign: 'left' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 12px 28px ${shadow}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 18px ${shadow}`; }}
    >
      <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color="white" />
      </div>
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginTop: 2 }}>{sub}</div>
      </div>
    </button>
  );
}

/* ─── Progress Bar ──────────────────────────────────────────────── */
function ProgressBar({ value, color = '#6366f1', bg = '#eff6ff', height = 8 }) {
  return (
    <div style={{ background: bg, borderRadius: 99, height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: 99, transition: 'width 1s ease' }} />
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────── */
const avatarColors = ['#6366f1', '#3b82f6', '#10b981', '#f97316', '#a855f7', '#f43f5e'];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { data } = useCurriculum();
  const { homeworks } = useHomework();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { studyAssignments, updateStudyAssignment } = useStudyPlan();
  const { goals, addGoal, updateGoalProgress, deleteGoal } = useGoal();
  const { schedules, addSchedule, toggleScheduleDone, deleteSchedule } = useSchedule();
  const { currentUser } = useAuth();

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    if (currentUser?.role === 'student') setSelectedStudent(currentUser);
    else if (studentMembers.length > 0) setSelectedStudent(studentMembers[0]);
    else setSelectedStudent(null);
  }, [currentUser, studentMembers]);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: 'Soru', period: 'Günlük', target: 50, linkPreset: '', customLink: '' });

  const handleSaveGoal = (e) => {
    e.preventDefault();
    if (newGoal.title && newGoal.target > 0) {
      const link = newGoal.linkPreset === 'custom' ? newGoal.customLink : newGoal.linkPreset;
      addGoal({ title: newGoal.title, type: newGoal.type, period: newGoal.period, target: +newGoal.target, link, studentId: selectedStudent?.id });
      setShowGoalModal(false);
      setNewGoal({ title: '', type: 'Soru', period: 'Günlük', target: 50, linkPreset: '', customLink: '' });
    }
  };

  /* ── Computed Data ── */
  const tests = useMemo(() => {
    if (!selectedStudent) return [];
    return homeworks.filter(hw => {
      if (hw.targetType === 'grade') return hw.targetIds?.includes(selectedStudent.gradeId);
      if (hw.targetType === 'student') return hw.targetIds?.includes(selectedStudent.id);
      return false;
    }).map(hw => {
      const sub = submissions.find(s =>
        (s.testId === hw.id || s.hwId === hw.id || (hw.tests && (hw.tests.includes(s.testId) || hw.tests.includes(s.bookTestId)))) && s.studentId === selectedStudent.id
      ) || (hw.submissions || []).find(s => s.studentId === selectedStudent.id);
      return { ...hw, status: sub ? 'Sonuçlandı' : 'Atandı', questionCount: hw.totalQuestions || 10, correctAnswers: sub ? (sub.score || 0) : 0 };
    });
  }, [homeworks, selectedStudent, submissions]);

  const assignments = useMemo(() => {
    if (!selectedStudent) return [];
    return studyAssignments.filter(s => s.studentId === selectedStudent?.id).map(a => ({ ...a, planName: 'Ders Planı', planLink: '#' }));
  }, [studyAssignments, selectedStudent]);

  const pendingTasks = useMemo(() => {
    const tTasks = tests.filter(t => t.status === 'Atandı').map(t => {
      const dueDateObj = parseSafeDate(t.dueDate);
      return { id: t.id, type: 'test', title: t.title, subject: getCategoryName(t), dueDateStr: new Date(t.dueDate).toLocaleDateString('tr-TR'), dueDateObj, questionCount: t.questionCount, durationMinutes: (t.questionCount || 0) * 2 || 30, sourceType: t.sourceType };
    });
    return [...tTasks].sort((a, b) => a.dueDateObj - b.dueDateObj);
  }, [tests, assignments]);

  const stats = useMemo(() => {
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı');
    const completedAssignments = assignments.filter(a => a.status === 'completed');
    const totalAll = tests.length + assignments.length;
    const totalDone = completedTests.length + completedAssignments.length;
    const completedRate = totalAll > 0 ? (totalDone / totalAll) * 100 : 0;
    let totalQ = 0, totalC = 0;
    completedTests.forEach(t => { totalQ += t.questionCount || 0; totalC += ((t.correctAnswers || 0) / 100) * (t.questionCount || 0); });
    const successRate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
    const overdueCount = tests.filter(t => t.status === 'Atandı' && isPast(parseSafeDate(t.dueDate)) && !isToday(parseSafeDate(t.dueDate))).length;
    return { testCount: tests.length, pendingCount: (tests.length - completedTests.length), successRate, overdueCount, completedRate };
  }, [tests, assignments]);

  const studentGoals = useMemo(() => {
    if (!selectedStudent) return [];
    return goals.filter(g => g.studentId === selectedStudent.id);
  }, [goals, selectedStudent]);

  const gradeLabel = data?.grades?.find(g => g.id === selectedStudent?.gradeId)?.name || '';
  const avatarColor = avatarColors[studentMembers.findIndex(s => s.id === selectedStudent?.id) % avatarColors.length] || '#6366f1';

  /* ── Input style ── */
  const inp = { padding: '0.65rem 0.9rem', borderRadius: '0.65rem', border: '1.5px solid #e2e8f0', fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a', fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box' };

  /* ── Render ── */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#f0f4ff 0%,#ffffff 55%,#fdf4ff 100%)', fontFamily: 'inherit' }}>

      {/* ═══ HERO BANNER ═══ */}
      <div style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#a21caf 100%)', padding: 'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,2rem)', position: 'relative', overflow: 'hidden' }}>
        {/* decorative blobs */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'rgba(255,255,255,0.08)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: 80, width: 160, height: 160, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(25px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', right: '10%', width: 100, height: 100, background: 'rgba(251,191,36,0.12)', borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none', transform: 'translateY(-50%)' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <Avatar name={selectedStudent?.name} size={68} color={avatarColor} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '0.25rem 0.75rem', marginBottom: 8 }}>
              <Sparkles size={12} color="#fbbf24" />
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hoş Geldin 👋</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.4rem,4vw,2.2rem)', fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.1 }}>
              {selectedStudent?.name || 'Öğrenci'}
            </h1>
            {gradeLabel && <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem', marginTop: 4, fontWeight: 600 }}>{gradeLabel} · Öğrenci Paneli</p>}
          </div>
          {/* Score bubble */}
          <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '1.25rem', padding: '1rem 1.5rem', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Genel Başarı</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>%{Math.floor(stats.successRate)}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{tests.filter(t => t.status === 'Sonuçlandı').length} sınav tamamlandı</div>
          </div>
        </div>

        {/* Student switcher pills */}
        {studentMembers.length > 1 && (
          <div style={{ maxWidth: 1100, margin: '1rem auto 0', position: 'relative', zIndex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {studentMembers.map((s, i) => {
              const active = selectedStudent?.id === s.id;
              const col = avatarColors[i % avatarColors.length];
              return (
                <button key={s.id} onClick={() => setSelectedStudent(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.85rem', borderRadius: 99, border: `2px solid ${active ? 'white' : 'rgba(255,255,255,0.3)'}`, background: active ? 'white' : 'rgba(255,255,255,0.12)', color: active ? col : 'rgba(255,255,255,0.8)', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 900, color: 'white' }}>{s.name.charAt(0)}</div>
                  {s.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(1rem,3vw,2rem)' }}>

        {/* STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '0.85rem', marginBottom: '2rem' }}>
          <StatCard icon={ClipboardList} label="Toplam Ödev"   value={tests.length}              sub="verilmiş"    color="#6366f1" bg="#eff6ff" />
          <StatCard icon={CheckCircle2} label="Tamamlanan"    value={tests.filter(t=>t.status==='Sonuçlandı').length} sub="sınav" color="#22c55e" bg="#f0fdf4" />
          <StatCard icon={Flame}        label="Bekleyen"       value={stats.pendingCount}          sub="ödev var"    color="#f97316" bg="#fff7ed" />
          <StatCard icon={AlertCircle}  label="Gecikmiş"       value={stats.overdueCount}          sub="ödev"        color="#ef4444" bg="#fff1f2" />
          <StatCard icon={TrendingUp}   label="Tamamlanma"     value={`%${Math.floor(stats.completedRate)}`} sub="oranı" color="#a855f7" bg="#faf5ff" />
        </div>

        {/* PROGRESS BAR */}
        <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', marginBottom: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={16} color="#f59e0b" /> Genel İlerleme
            </span>
            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#6366f1' }}>%{Math.floor(stats.completedRate)}</span>
          </div>
          <ProgressBar value={stats.completedRate} color="linear-gradient(90deg,#6366f1,#a855f7)" bg="#f0f4ff" height={12} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{tests.filter(t=>t.status==='Sonuçlandı').length} tamamlandı</span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{tests.length} toplam</span>
          </div>
        </div>

        {/* TWO-COL LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: '1.5rem', alignItems: 'start' }}>

          {/* LEFT: Homeworks + Quick Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Quick Links */}
            <div>
              <h2 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} color="#f59e0b" /> Hızlı Erişim
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '0.75rem' }}>
                <QuickCard icon={BarChart3}    label="Sonuçlarım"      sub="Karne & grafikler"      to="/student-results" gradient="linear-gradient(135deg,#6366f1,#8b5cf6)" shadow="rgba(99,102,241,0.35)" />
                <QuickCard icon={AlertCircle} label="Yanlışlarım"     sub="Hata havuzu"            to="/wrong-answers"   gradient="linear-gradient(135deg,#f43f5e,#db2777)" shadow="rgba(244,63,94,0.35)" />
                <QuickCard icon={Target}      label="Hedeflerim"      sub="Hedef & program"        to="/goals"           gradient="linear-gradient(135deg,#f97316,#dc2626)" shadow="rgba(249,115,22,0.35)" />
                <QuickCard icon={CalendarDays} label="Haftalık Plan"  sub="Çalışma saatleri"       to="/goals"           gradient="linear-gradient(135deg,#10b981,#0891b2)" shadow="rgba(16,185,129,0.35)" />
              </div>
            </div>

            {/* Pending Homeworks */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <BookOpen size={14} color="#6366f1" /> Bekleyen Ödevler
                  {stats.pendingCount > 0 && (
                    <span style={{ background: '#ef4444', color: 'white', borderRadius: 99, padding: '0.1rem 0.55rem', fontSize: '0.65rem', fontWeight: 800 }}>{stats.pendingCount}</span>
                  )}
                </h2>
              </div>
              {pendingTasks.length === 0 ? (
                <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: '1.25rem', padding: '3rem', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', marginBottom: 4 }}>Harika! Tüm ödevler tamamlandı.</div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Bekleyen göreviniz bulunmuyor.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '0.85rem' }}>
                  {pendingTasks.map(task => (
                    <HomeworkCard key={task.id} task={task} selectedStudent={selectedStudent} />
                  ))}
                </div>
              )}
            </div>

            {/* Completed exams */}
            {tests.filter(t => t.status === 'Sonuçlandı').length > 0 && (
              <div>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} color="#22c55e" /> Tamamlanan Sınavlar
                </h2>
                <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                  {tests.filter(t => t.status === 'Sonuçlandı').slice(0, 6).map((test, i, arr) => {
                    const conf = getSubConf(getThemeKey(getCategoryName(test)));
                    const score = test.correctAnswers || 0;
                    const good = score >= 70;
                    return (
                      <div key={test.id} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1.1rem', borderBottom: i < arr.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: conf.bg, border: `1.5px solid ${conf.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <conf.icon size={16} color={conf.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test.title}</div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{new Date(test.assignedDate).toLocaleDateString('tr-TR')}</div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, fontSize: '1rem', color: good ? '#16a34a' : '#dc2626' }}>%{score}</div>
                          <div style={{ width: 60, marginTop: 3 }}>
                            <ProgressBar value={score} color={good ? '#22c55e' : '#ef4444'} bg={good ? '#f0fdf4' : '#fff1f2'} height={5} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: Goals + Schedule */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Goals */}
            <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: '1.25rem', padding: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 5 }}><Target size={15} color="#f43f5e" /> Hedeflerim</span>
                <button onClick={() => setShowGoalModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', fontWeight: 800, color: '#6366f1', background: '#eff6ff', border: '1px solid #c7d2fe', borderRadius: '0.5rem', padding: '0.3rem 0.7rem', cursor: 'pointer' }}>
                  <Plus size={12} /> Ekle
                </button>
              </div>
              {studentGoals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🎯</div>
                  Henüz hedef eklenmedi.<br />
                  <button onClick={() => setShowGoalModal(true)} style={{ marginTop: 8, color: '#6366f1', fontWeight: 700, fontSize: '0.78rem', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>İlk hedefini ekle</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {studentGoals.slice(0, 4).map(g => (
                    <GoalMini key={g.id} goal={g} onDelete={deleteGoal} onUpdateProgress={updateGoalProgress} onNavigate={navigate} />
                  ))}
                  {studentGoals.length > 4 && (
                    <button onClick={() => navigate('/goals')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0.6rem', borderRadius: '0.65rem', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#6366f1', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>
                      +{studentGoals.length - 4} daha <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              )}
              <button onClick={() => navigate('/goals')} style={{ width: '100%', marginTop: 12, padding: '0.6rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 800, fontSize: '0.78rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                Tüm Hedefler <ChevronRight size={14} />
              </button>
            </div>

            {/* Streak / Motivasyon */}
            <div style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)', border: '1.5px solid #fcd34d', borderRadius: '1.25rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Flame size={24} color="#f59e0b" />
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#92400e' }}>Motivasyon!</div>
                  <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>Başarıya giden yol...</div>
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#78350f', lineHeight: 1.6, fontStyle: 'italic' }}>
                "Başarı, her gün biraz daha iyi olmakla gelir. Bugün bir adım daha at! 💪"
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                {['P','S','Ç','P','C','C','P'].map((d, i) => {
                  const done = i < 4;
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#92400e', marginBottom: 3 }}>{d}</div>
                      <div style={{ width: '100%', aspectRatio: 1, borderRadius: '0.4rem', background: done ? '#f59e0b' : '#fcd34d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {done && <Star size={8} color="white" fill="white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigate to Results */}
            <button onClick={() => navigate('/student-results')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eff6ff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart3 size={18} color="#6366f1" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>Detaylı Karne</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Grafik & analizler</div>
                </div>
              </div>
              <ChevronRight size={18} color="#6366f1" />
            </button>

          </div>
        </div>
      </div>

      {/* ═══ GOAL MODAL ═══ */}
      {showGoalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '1.5rem', padding: '2rem', width: '100%', maxWidth: 460, boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0f172a', margin: 0 }}>🎯 Yeni Hedef Ekle</h2>
              <button onClick={() => setShowGoalModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '0.65rem', padding: '0.5rem', cursor: 'pointer', display: 'flex' }}><X size={16} color="#64748b" /></button>
            </div>
            <form onSubmit={handleSaveGoal} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <input placeholder="Hedef başlığı..." value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} style={inp} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <select value={newGoal.type} onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))} style={inp}>
                  {['Soru','Sayfa','Dakika'].map(v => <option key={v}>{v}</option>)}
                </select>
                <select value={newGoal.period} onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))} style={inp}>
                  {['Günlük','Haftalık','Aylık'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <input type="number" min="1" placeholder="Hedef miktar" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))} style={inp} required />
              <button type="submit" style={{ padding: '0.8rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 800, fontSize: '0.9rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
                Hedef Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }`}</style>
    </div>
  );
}
