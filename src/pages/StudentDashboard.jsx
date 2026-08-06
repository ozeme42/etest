import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlayCircle, Target, AlertCircle, Timer, BookOpen, Check,
  Sparkles, Trophy, Flame, GraduationCap, BarChart3, Clock,
  Calendar, CheckCircle2, X, Plus, ExternalLink, Zap,
  ChevronRight, Star, TrendingUp, BookMarked, CalendarDays,
  Ruler, TestTube2, BookCopy, Globe, MessageSquare,
  FileText, ClipboardList, ArrowRight, RefreshCw, ClipboardCheck, Eye, RotateCcw
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
import { useCoaching } from '../context/CoachingContext';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

/* ─── helpers ──────────────────────────────────────────────────── */
const parseSafeDate = (d) => {
  if (!d) return new Date();
  const iso = new Date(d);
  if (!isNaN(iso)) return iso;
  return parse(d, 'dd MMMM yyyy', new Date(), { locale: tr });
};
export const getCategoryName = (t) => t.subject || 'Diğer';

const renderGoalList = (goalsData) => {
  if (!goalsData) return null;
  if (typeof goalsData === 'string') return goalsData;
  if (Array.isArray(goalsData)) {
    if (goalsData.length === 0) return null;
    return goalsData.map(item => {
      if (typeof item === 'object' && item !== null) {
        const text = item.text || item.title || item.name || '';
        return text ? (item.done ? `✓ ${text}` : text) : null;
      }
      return String(item);
    }).filter(Boolean).join(' • ');
  }
  if (typeof goalsData === 'object') {
    return goalsData.text || goalsData.title || goalsData.name || null;
  }
  return String(goalsData);
};

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
function Avatar({ name, size = 44, color = '#6366f1' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 900, color: 'white', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
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
function StatCard({ icon: Icon, label, value, sub, color, bg, glow, isMobile }) {
  if (isMobile) {
    const shortLabel = label === 'Toplam Ödev' ? 'Toplam'
      : label === 'Tamamlanan' ? 'Biten'
      : label === 'Bekleyen' ? 'Bekleyen'
      : label === 'Gecikmiş' ? 'Geciken'
      : label === 'Tamamlanma' ? 'Oran' : label;

    return (
      <div
        style={{
          background: 'white',
          border: `1.5px solid ${color}30`,
          borderRadius: '0.75rem',
          padding: '0.5rem 0.2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          minWidth: 0
        }}
      >
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 3, border: `1px solid ${color}33` }}>
          <Icon size={12} color={color} />
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748b', marginTop: 1, textTransform: 'uppercase' }}>{shortLabel}</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', border: `1.5px solid ${color}25`, borderRadius: '1.1rem', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', transition: 'transform 0.2s', position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: bg, border: `1.5px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1, marginTop: 2 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Homework Card ─────────────────────────────────────────────── */
function HomeworkCard({ task, selectedStudent }) {
  const navigate = useNavigate();
  const category = task.subject;
  const conf = getSubConf(getThemeKey(category));
  const Icon = conf.icon;
  const dueDate = task.dueDateObj;
  const overdue = isPast(dueDate) && !isToday(dueDate);
  const dueToday = isToday(dueDate);
  const daysDiff = differenceInDays(dueDate, new Date());

  const urgencyPill = overdue ? (
    <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#ef4444', color: 'white', padding: '0.15rem 0.55rem', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <Flame size={10} /> {differenceInDays(new Date(), dueDate)}g Gecikti
    </span>
  ) : dueToday ? (
    <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#f59e0b', color: 'white', padding: '0.15rem 0.55rem', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      ⚡ Bugün Son
    </span>
  ) : (
    <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#10b981', color: 'white', padding: '0.15rem 0.55rem', borderRadius: 99 }}>
      {daysDiff + 1}g kaldı
    </span>
  );

  return (
    <div style={{ background: 'white', border: `1.5px solid ${conf.border}`, borderRadius: '1.25rem', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
      <div style={{ height: 4, background: conf.color, position: 'absolute', top: 0, left: 0, right: 0 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: conf.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: conf.badge, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{category}</span>
          </div>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {task.title}
          </h3>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: conf.bg, border: `1.5px solid ${conf.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={conf.color} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.2rem 0.55rem', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
          <Calendar size={12} /> {task.dueDateStr}
        </div>
        {urgencyPill}
      </div>

      <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f1f5f9' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Soru</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>{task.questionCount || '—'}</div>
        </div>
        <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Süre</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>{task.durationMinutes}dk</div>
        </div>
      </div>

      <button
        onClick={() => {
          let path = `/quiz/${task.id}?studentId=${selectedStudent.id}`;
          if (task.sourceType === 'trackedBook') {
            path = `/book-quiz/${task.id}?studentId=${selectedStudent.id}`;
          } else if (task.type === 'physicalExam') {
            path = `/physical-exam/${task.id}?studentId=${selectedStudent.id}`;
          }
          navigate(path);
        }}
        style={{ width: '100%', padding: '0.65rem', borderRadius: '0.75rem', background: conf.color, color: 'white', fontWeight: 800, fontSize: '0.82rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 4px 12px ${conf.color}40`, transition: 'transform 0.15s' }}
      >
        <PlayCircle size={16} /> {task.type === 'physicalExam' ? 'Optik Formu Doldur' : 'Ödevi Çöz'}
      </button>
    </div>
  );
}

/* ─── Goal Mini ─────────────────────────────────────────────────── */
function GoalMini({ goal, onDelete, onUpdateProgress, onNavigate }) {
  const pct = Math.min(100, Math.round(((goal.current || 0) / (goal.target || 1)) * 100));
  const done = pct >= 100;
  return (
    <div style={{ background: done ? '#f0fdf4' : '#fafafa', border: `1.5px solid ${done ? '#86efac' : '#f1f5f9'}`, borderRadius: '0.85rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#eff6ff', color: '#2563eb', padding: '0.1rem 0.45rem', borderRadius: 99, textTransform: 'uppercase' }}>{goal.period}</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#fef3c7', color: '#b45309', padding: '0.1rem 0.45rem', borderRadius: 99 }}>{goal.type}</span>
        </div>
        <button onClick={() => onDelete(goal.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 2 }}><X size={14} /></button>
      </div>
      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{goal.title}</div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 3 }}>
          <span>{goal.current || 0} / {goal.target}</span>
          <span style={{ color: done ? '#16a34a' : '#4f46e5', fontWeight: 900 }}>%{pct}</span>
        </div>
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: done ? '#22c55e' : '#6366f1', borderRadius: 99, transition: 'width 0.6s' }} />
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
      style={{ background: gradient, borderRadius: '1.1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: 'none', cursor: 'pointer', boxShadow: `0 4px 18px ${shadow}`, transition: 'all 0.2s', textAlign: 'left' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 12px 28px ${shadow}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 18px ${shadow}`; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: '0.75rem', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color="white" />
      </div>
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 2 }}>{sub}</div>
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
  const { getCoachingNoteForStudent, getMeetingsForStudent, getCoachingProfileForStudent } = useCoaching();

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const coachingNote = getCoachingNoteForStudent(selectedStudent?.id);
  const coachingProfile = getCoachingProfileForStudent(selectedStudent?.id);
  const studentMeetings = getMeetingsForStudent(selectedStudent?.id);
  const upcomingMeeting = studentMeetings.find(m => m.nextMeetingDate);

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
      const sub = (hw.submissions || []).find(s => s.studentId === selectedStudent.id) ||
        submissions.find(s => (s.hwId === hw.id || s.testId === hw.id) && s.studentId === selectedStudent.id);
      return { 
        ...hw, 
        status: sub ? 'Sonuçlandı' : 'Atandı', 
        questionCount: hw.totalQuestions || 10, 
        correctAnswers: sub ? (sub.score || 0) : 0,
        submissionId: sub?.id
      };
    });
  }, [homeworks, selectedStudent, submissions]);

  const assignments = useMemo(() => {
    if (!selectedStudent) return [];
    return studyAssignments.filter(s => s.studentId === selectedStudent?.id).map(a => ({ ...a, planName: 'Ders Planı', planLink: '#' }));
  }, [studyAssignments, selectedStudent]);

  const pendingTasks = useMemo(() => {
    const tTasks = tests.filter(t => t.status === 'Atandı').map(t => {
      const dueDateObj = parseSafeDate(t.dueDate);
      return { id: t.id, type: t.type || 'test', title: t.title, subject: getCategoryName(t), dueDateStr: new Date(t.dueDate).toLocaleDateString('tr-TR'), dueDateObj, questionCount: t.questionCount, durationMinutes: (t.questionCount || 0) * 2 || 30, sourceType: t.sourceType };
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
    return goals.filter(g => String(g.studentId) === String(selectedStudent.id));
  }, [goals, selectedStudent]);

  const gradeLabel = data?.grades?.find(g => g.id === selectedStudent?.gradeId)?.name || '';
  const avatarColor = avatarColors[studentMembers.findIndex(s => s.id === selectedStudent?.id) % avatarColors.length] || '#6366f1';

  /* ── Input style ── */
  const inp = { padding: '0.65rem 0.9rem', borderRadius: '0.65rem', border: '1.5px solid #e2e8f0', fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a', fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box' };

  /* ── Render ── */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#f0f4ff 0%,#ffffff 55%,#fdf4ff 100%)', fontFamily: 'inherit' }}>

      {/* ═══ HERO BANNER ═══ */}
      <div style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#a21caf 100%)', padding: isMobile ? '1.25rem 1rem' : 'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,2rem)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'rgba(255,255,255,0.08)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: 80, width: 160, height: 160, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(25px)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.25rem', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <Avatar name={selectedStudent?.name} size={isMobile ? 48 : 56} color={avatarColor} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '0.2rem 0.6rem', marginBottom: 4 }}>
              <Sparkles size={12} color="#fbbf24" />
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hoş Geldin 👋</span>
            </div>
            <h1 style={{ fontSize: isMobile ? '1.3rem' : '1.8rem', fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.1 }}>
              {selectedStudent?.name || 'Öğrenci'}
            </h1>
            {gradeLabel && <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', marginTop: 3, fontWeight: 700 }}>{gradeLabel} · Öğrenci Paneli</p>}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '1rem', padding: isMobile ? '0.65rem 1rem' : '0.75rem 1.25rem', textAlign: 'center', flexShrink: 0, width: isMobile ? '100%' : 'auto', marginTop: isMobile ? 6 : 0 }}>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.75)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Genel Başarı</div>
            <div style={{ fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>%{Math.floor(stats.successRate)}</div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{tests.filter(t => t.status === 'Sonuçlandı').length} sınav tamamlandı</div>
          </div>
        </div>

        {studentMembers.length > 1 && (
          <div style={{ width: '100%', position: 'relative', zIndex: 1, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginTop: 12, scrollbarWidth: 'none' }}>
            {studentMembers.map((s, i) => {
              const active = selectedStudent?.id === s.id;
              const col = avatarColors[i % avatarColors.length];
              return (
                <button key={s.id} onClick={() => setSelectedStudent(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.85rem', borderRadius: 99, border: `2px solid ${active ? 'white' : 'rgba(255,255,255,0.3)'}`, background: active ? 'white' : 'rgba(255,255,255,0.12)', color: active ? col : 'rgba(255,255,255,0.85)', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
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
      <div style={{ width: '100%', padding: isMobile ? '0.85rem' : 'clamp(1rem,2.5vw,2rem)', boxSizing: 'border-box' }}>

        {/* 🏛️ KOÇLUK AKADEMİK & STRATEJİK HEDEFLERİ CARD (All Coaching Dossier Goals) */}
        {coachingProfile && (coachingProfile.targetSchool || coachingProfile.targetNet || coachingProfile.monthlyGoals || coachingProfile.weeklyGoals || coachingProfile.dailyGoals || coachingProfile.gradeTarget || coachingProfile.goals?.gradeTarget) && (() => {
          const isGradeTracking = coachingProfile?.examGoalType === 'Ara Sınıf Takip & Takdir Hedefi';
          return (
            <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '2px solid #86efac', borderRadius: '1.25rem', padding: isMobile ? '1rem' : '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 4px 16px rgba(22,163,74,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GraduationCap size={22} color="#16a34a" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🏛️ Koçluktan Gelen Akademik & Stratejik Hedefleriniz</span>
                </div>
                {coachingProfile.examGoalType && (
                  <span style={{ fontSize: '0.72rem', background: '#16a34a', color: 'white', fontWeight: 900, padding: '0.25rem 0.75rem', borderRadius: 99 }}>
                    {coachingProfile.examGoalType}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
                {isGradeTracking ? (
                  <>
                    <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase' }}>🏅 Hedef Belge / Başarı</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#16a34a', marginTop: 2 }}>
                        {coachingProfile.gradeTarget || coachingProfile.goals?.gradeTarget || 'Takdir Belgesi'}
                      </div>
                    </div>
                    {(coachingProfile.gradeClass || coachingProfile.goals?.gradeClass) && (
                      <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase' }}>🎓 Sınıf / Dönem</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                          {coachingProfile.gradeClass || coachingProfile.goals?.gradeClass} {coachingProfile.gradeTerm || coachingProfile.goals?.gradeTerm ? `(${coachingProfile.gradeTerm || coachingProfile.goals?.gradeTerm}. Dönem)` : ''}
                        </div>
                      </div>
                    )}
                    {(coachingProfile.targetScore || coachingProfile.goals?.targetScore) && (
                      <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase' }}>📅 Devamsızlık Hedefi</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>Maks {coachingProfile.targetScore || coachingProfile.goals?.targetScore} gün</div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {coachingProfile.targetSchool && (
                      <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase' }}>🎯 İstenen Okul & Bölüm</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{coachingProfile.targetSchool}</div>
                      </div>
                    )}
                    {coachingProfile.targetScore && (
                      <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase' }}>🏆 Puan Hedefi</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{coachingProfile.targetScore} Puan</div>
                      </div>
                    )}
                    {coachingProfile.targetNet > 0 && (
                      <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase' }}>📈 Net Hedefi</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#16a34a', marginTop: 2 }}>{coachingProfile.targetNet} Net</div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {(() => {
                const mGoalsStr = renderGoalList(coachingProfile.monthlyGoals);
                const wGoalsStr = renderGoalList(coachingProfile.weeklyGoals);
                const dGoalsStr = renderGoalList(coachingProfile.dailyGoals);
                if (!mGoalsStr && !wGoalsStr && !dGoalsStr) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'white', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #bbf7d0' }}>
                    {mGoalsStr && (
                      <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 700 }}>
                        <span style={{ fontWeight: 900, color: '#15803d' }}>📅 Aylık Strateji:</span> {mGoalsStr}
                      </div>
                    )}
                    {wGoalsStr && (
                      <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 700 }}>
                        <span style={{ fontWeight: 900, color: '#15803d' }}>⚡ Haftalık Hedef:</span> {wGoalsStr}
                      </div>
                    )}
                    {dGoalsStr && (
                      <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 700 }}>
                        <span style={{ fontWeight: 900, color: '#15803d' }}>🔥 Günlük Rutin:</span> {dGoalsStr}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* 👨‍🏫 TEACHER COACHING GUIDANCE CARD */}
        {( (coachingNote && (coachingNote.note || coachingNote.weeklyFocus || (coachingNote.goals && coachingNote.goals.length > 0))) || upcomingMeeting ) && (
          <div style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: '1.5px solid #ddd6fe', borderRadius: '1.25rem', padding: isMobile ? '1rem' : '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 4px 16px rgba(124,58,237,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={18} color="#7c3aed" />
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>👨‍🏫 Koçunuzdan Tavsiye & Rehberlik Notu</span>
              </div>
              {upcomingMeeting && (
                <span style={{ fontSize: '0.72rem', background: '#7c3aed', color: 'white', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: 99 }}>
                  📅 Gelecek Görüşme: {upcomingMeeting.nextMeetingDate}
                </span>
              )}
            </div>

            {coachingNote?.weeklyFocus && (
              <div style={{ background: 'white', borderRadius: '0.75rem', padding: '0.6rem 0.9rem', marginBottom: 10, border: '1px solid #c4b5fd', fontWeight: 800, fontSize: '0.85rem', color: '#5b21b6' }}>
                🎯 Haftalık Odak: {coachingNote.weeklyFocus}
              </div>
            )}
            {coachingNote?.note && (
              <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#4c1d95', lineHeight: 1.5, fontWeight: 600 }}>
                "{coachingNote.note}"
              </p>
            )}
            {coachingNote?.goals && coachingNote.goals.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase' }}>Haftalık Koçluk Hedefleriniz:</div>
                {coachingNote.goals.map(g => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: g.done ? '#94a3b8' : '#3b0764', fontWeight: 700 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: g.done ? '#22c55e' : '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                      {g.done && <Check size={12} />}
                    </div>
                    <span style={{ textDecoration: g.done ? 'line-through' : 'none' }}>{g.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STAT CARDS - Non-scrollable 5-Column Grid on Mobile */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(5, 1fr)' : 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: isMobile ? '0.35rem' : '0.85rem',
          marginBottom: '1.25rem'
        }}>
          <StatCard icon={ClipboardList} label="Toplam Ödev"   value={tests.length}              sub="verilmiş"    color="#6366f1" bg="#eff6ff" isMobile={isMobile} />
          <StatCard icon={CheckCircle2} label="Tamamlanan"    value={tests.filter(t=>t.status==='Sonuçlandı').length} sub="sınav" color="#22c55e" bg="#f0fdf4" isMobile={isMobile} />
          <StatCard icon={Flame}        label="Bekleyen"       value={stats.pendingCount}          sub="ödev var"    color="#f97316" bg="#fff7ed" isMobile={isMobile} />
          <StatCard icon={AlertCircle}  label="Gecikmiş"       value={stats.overdueCount}          sub="ödev"        color="#ef4444" bg="#fff1f2" isMobile={isMobile} />
          <StatCard icon={TrendingUp}   label="Tamamlanma"     value={`%${Math.floor(stats.completedRate)}`} sub="oranı" color="#a855f7" bg="#faf5ff" isMobile={isMobile} />
        </div>

        {/* PROGRESS BAR */}
        <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: '1.25rem', padding: isMobile ? '1rem' : '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={16} color="#f59e0b" /> Genel İlerleme
            </span>
            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#6366f1' }}>%{Math.floor(stats.completedRate)}</span>
          </div>
          <ProgressBar value={stats.completedRate} color="linear-gradient(90deg,#6366f1,#a855f7)" bg="#f0f4ff" height={10} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{tests.filter(t=>t.status==='Sonuçlandı').length} tamamlandı</span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{tests.length} toplam</span>
          </div>
        </div>

        {/* MAIN LAYOUT: Single Column on Mobile, Split 2-Column on Desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 300px', gap: '1.5rem', alignItems: 'start' }}>

          {/* LEFT SECTION: Homeworks + Quick Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Quick Links */}
            <div>
              <h2 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} color="#f59e0b" /> Hızlı Erişim
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                <QuickCard icon={BarChart3}    label="Sonuçlarım"      sub="Karne & grafikler"      to="/student-results" gradient="linear-gradient(135deg,#6366f1,#8b5cf6)" shadow="rgba(99,102,241,0.35)" />
                <QuickCard icon={AlertCircle} label="Yanlışlarım"     sub="Hata havuzu"            to="/wrong-answers"   gradient="linear-gradient(135deg,#f43f5e,#db2777)" shadow="rgba(244,63,94,0.35)" />
                <QuickCard icon={Target}      label="Hedeflerim"      sub="Hedef & program"        to="/goals"           gradient="linear-gradient(135deg,#f97316,#dc2626)" shadow="rgba(249,115,22,0.35)" />
                <QuickCard icon={CalendarDays} label="Haftalık Plan"  sub="Çalışma saatleri"       to="/goals"           gradient="linear-gradient(135deg,#10b981,#0891b2)" shadow="rgba(16,185,129,0.35)" />
              </div>
            </div>

            {/* Pending Homeworks */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <BookOpen size={14} color="#6366f1" /> Bekleyen Ödevler
                  {stats.pendingCount > 0 && (
                    <span style={{ background: '#ef4444', color: 'white', borderRadius: 99, padding: '0.1rem 0.55rem', fontSize: '0.65rem', fontWeight: 800 }}>{stats.pendingCount}</span>
                  )}
                </h2>
              </div>
              {pendingTasks.length === 0 ? (
                <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: '1.25rem', padding: isMobile ? '2rem 1rem' : '3rem', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', marginBottom: 4 }}>Harika! Tüm ödevler tamamlandı.</div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Bekleyen göreviniz bulunmuyor.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
                  {pendingTasks.map(task => (
                    <HomeworkCard key={task.id} task={task} selectedStudent={selectedStudent} />
                  ))}
                </div>
              )}
            </div>

            {/* Completed exams */}
            {tests.filter(t => t.status === 'Sonuçlandı').length > 0 && (
              <div>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} color="#22c55e" /> Tamamlanan Sınavlar
                </h2>
                <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                  {tests.filter(t => t.status === 'Sonuçlandı').slice(0, 6).map((test, i, arr) => {
                    const conf = getSubConf(getThemeKey(getCategoryName(test)));
                    const score = test.correctAnswers || 0;
                    const good = score >= 70;
                    return (
                      <div key={test.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', borderBottom: i < arr.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.15s', flexWrap: isMobile ? 'wrap' : 'nowrap' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: conf.bg, border: `1.5px solid ${conf.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <conf.icon size={16} color={conf.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test.title}</div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{test.dueDate ? new Date(test.dueDate).toLocaleDateString('tr-TR') : 'Tamamlandı'}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 900, fontSize: '0.98rem', color: good ? '#16a34a' : '#dc2626' }}>%{score}</div>
                            <div style={{ width: 50, marginTop: 3 }}>
                              <ProgressBar value={score} color={good ? '#22c55e' : '#ef4444'} bg={good ? '#f0fdf4' : '#fff1f2'} height={4} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              onClick={() => {
                                if (test.type === 'physicalExam') {
                                  navigate(`/physical-exam/${test.id}?studentId=${selectedStudent.id}`);
                                } else if (test.submissionId) {
                                  navigate(`/review/${test.submissionId}`);
                                } else {
                                  navigate(`/quiz/${test.id}?studentId=${selectedStudent.id}`);
                                }
                              }}
                              title="İncele & Karne"
                              style={{ padding: '0.35rem 0.6rem', borderRadius: '0.5rem', background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}
                            >
                              <Eye size={12} /> İncele
                            </button>

                            {(currentUser?.role === 'teacher' || currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (
                              <button
                                onClick={() => {
                                  const retakePath = test.type === 'physicalExam'
                                    ? `/physical-exam/${test.id}?studentId=${selectedStudent.id}&retake=true`
                                    : test.sourceType === 'trackedBook'
                                    ? `/book-quiz/${test.id}?studentId=${selectedStudent.id}&retake=true`
                                    : `/quiz/${test.id}?studentId=${selectedStudent.id}&retake=true`;
                                  navigate(retakePath);
                                }}
                                title="Tekrar Çöz (Öğretmen Yetkisi)"
                                style={{ padding: '0.35rem 0.6rem', borderRadius: '0.5rem', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}
                              >
                                <RotateCcw size={12} /> Tekrar Çöz
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: Goals + Motivation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Goals */}
            <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: '1.25rem', padding: isMobile ? '1rem' : '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 5 }}><Target size={15} color="#f43f5e" /> Hedeflerim ({studentGoals.length})</span>
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
                  {studentGoals.slice(0, 5).map(g => (
                    <GoalMini key={g.id} goal={g} onDelete={deleteGoal} onUpdateProgress={updateGoalProgress} onNavigate={navigate} />
                  ))}
                  {studentGoals.length > 5 && (
                    <button onClick={() => navigate('/goals')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0.6rem', borderRadius: '0.65rem', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#6366f1', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>
                      +{studentGoals.length - 5} daha <ArrowRight size={12} />
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
          <div style={{ background: 'white', borderRadius: '1.5rem', padding: '1.75rem', width: '100%', maxWidth: 460, boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
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