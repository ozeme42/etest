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
import { useQuestionBank } from '../context/QuestionBankContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { isHomeworkForStudent } from '../utils/testResolver';
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
  'Genel Testler':{ icon: ClipboardList, color: '#6366f1', bg: '#eff6ff', border: '#c7d2fe', badge: '#4f46e5' },
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
  if (c.includes('deneme') || c.includes('genel')) return 'Genel Testler';
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
          background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)',
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
    <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', border: `1.5px solid ${color}25`, borderRadius: '1.1rem', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', transition: 'transform 0.2s', position: 'relative', overflow: 'hidden' }}>
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

  // Homework LogicCard ─────────────────────────────────────────────── */
function HomeworkCard({ task, selectedStudent, isMobile }) {
  const navigate = useNavigate();
  const category = task.subject;
  const conf = getSubConf(getThemeKey(category));
  const Icon = conf.icon;
  const dueDate = task.dueDateObj;
  const overdue = isPast(dueDate) && !isToday(dueDate);
  const dueToday = isToday(dueDate);
  const daysDiff = differenceInDays(dueDate, new Date());

  const urgencyPill = overdue ? (
    <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.6rem', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #fca5a5', boxShadow: '0 2px 8px rgba(185,28,28,0.15)' }}>
      <Flame size={12} fill="#ef4444" color="#ef4444" /> {differenceInDays(new Date(), dueDate)}g Gecikti
    </span>
  ) : dueToday ? (
    <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#fef3c7', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #fde68a', boxShadow: '0 2px 8px rgba(217,119,6,0.15)' }}>
      <Zap size={12} fill="#f59e0b" color="#f59e0b" /> Bugün Son
    </span>
  ) : (
    <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #86efac' }}>
      <Clock size={12} color="#16a34a" /> {daysDiff + 1} Gün Kaldı
    </span>
  );

  const typeTag = (
    <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#f3f4f6', color: '#4b5563', padding: '0.15rem 0.5rem', borderRadius: 6, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 3 }}>
      {task.type === 'acik_uclu' ? '📝 Açık Uçlu' : task.type === 'physicalExam' ? '📖 Optik Form' : task.type === 'coktan_secmeli' ? '🔘 Çoktan Seçmeli' : '📄 Sınav / Test'}
    </span>
  );

  const sourceTag = task.sourceType === 'trackedBook' ? (
    <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#f5f3ff', color: '#6d28d9', padding: '0.15rem 0.5rem', borderRadius: 6, border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: 3 }}>
      📚 Kitap Testi
    </span>
  ) : task.sourceType === 'pdf' ? (
    <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#fff1f2', color: '#be123c', padding: '0.15rem 0.5rem', borderRadius: 6, border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: 3 }}>
      📕 PDF
    </span>
  ) : task.sourceType === 'html' ? (
    <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#ecfdf5', color: '#047857', padding: '0.15rem 0.5rem', borderRadius: 6, border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: 3 }}>
      🌐 Web Testi
    </span>
  ) : null;

  const handleStart = () => {
    let path = `/quiz/${task.id}?studentId=${selectedStudent.id}`;
    if (task.sourceType === 'trackedBook') {
      path = `/book-quiz/${task.id}?studentId=${selectedStudent.id}`;
    } else if (task.type === 'physicalExam') {
      path = `/physical-exam/${task.id}?studentId=${selectedStudent.id}`;
    }
    navigate(path);
  };

  if (isMobile) {
    return (
      <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', border: `1.5px solid ${conf.border}`, borderRadius: '1rem', padding: '0.85rem', display: 'flex', gap: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'relative', alignItems: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: conf.bg, border: `1.5px solid ${conf.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} color={conf.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: conf.badge, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{category}</div>
            {sourceTag}
            {typeTag}
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.title}</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
             {urgencyPill}
             <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={12} color="#94a3b8" /> {task.dueDateStr}</span>
             <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800 }}>• {task.questionCount || 0} Soru</span>
          </div>
        </div>
        <button
          onClick={handleStart}
          style={{ width: 38, height: 38, borderRadius: '50%', background: conf.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0, boxShadow: `0 4px 10px ${conf.color}40`, transition: 'transform 0.15s' }}
        >
          <PlayCircle size={18} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', border: `1.5px solid ${conf.border}`, borderRadius: '1.25rem', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
      <div style={{ height: 4, background: conf.color, position: 'absolute', top: 0, left: 0, right: 0 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: conf.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: conf.badge, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{category}</span>
            {sourceTag}
            {typeTag}
          </div>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {task.title}
          </h3>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: conf.bg, border: `1.5px solid ${conf.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={conf.color} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        {urgencyPill}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255,255,255,1)', borderRadius: '0.5rem', padding: '0.2rem 0.55rem', fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>
          <Calendar size={12} color="#94a3b8" /> {task.dueDateStr}
        </div>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.5)', borderRadius: '0.75rem', padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f1f5f9' }}>
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
        onClick={handleStart}
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

const DASHBOARD_QUOTES = [
  { quote: "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.", author: "Robert Collier", category: "Disiplin" },
  { quote: "Gelecek, bugün ne yaptığına bağlıdır. Yarın değil, tam da şimdi!", author: "Mahatma Gandhi", category: "Eylem" },
  { quote: "Zirveye tırmanmak yorucudur ama oradaki manzara her şeye değer.", author: "Anonim", category: "Zafer" },
  { quote: "Disiplin, ne istediğin ile en çok ne istediğin arasındaki seçimdir.", author: "Abraham Lincoln", category: "Odak" },
  { quote: "Zafer, 'vazgeçmeyenlerindir'. Yapabileceğinin en iyisini yap!", author: "Mustafa Kemal Atatürk", category: "İnanç" },
  { quote: "Zorluklar, başarının değerini artıran süslerdir.", author: "Molière", category: "Mücadele" },
  { quote: "Sınırlarını zorlamayan biri, potansiyelinin ne olduğunu asla öğrenemez.", author: "Kobe Bryant", category: "Özgüven" },
  { quote: "Sınavı kazandıran zeka değil, bıkmadan gösterilen sürekliliktir.", author: "Koçluk Mottosu", category: "Disiplin" },
  { quote: "Rüzgar ne kadar sert eserse esin, sağlam ağaç köklerinden kopmaz.", author: "Konfüçyüs", category: "Mücadele" },
  { quote: "Başarı, her gün biraz daha iyi olmakla gelir! 💪", author: "Günün Mottosu", category: "Gelişim" }
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [dashQuoteIdx, setDashQuoteIdx] = useState(0);
  const { data: curData } = useCurriculum();
  const { questions: allQuestions } = useQuestionBank();
  const { homeworks } = useHomework();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { studyAssignments, studyPlans, updateStudyAssignment } = useStudyPlan();
  const { goals, addGoal, updateGoalProgress, deleteGoal } = useGoal();
  const { schedules, addSchedule, toggleScheduleDone, deleteSchedule } = useSchedule();
  const { currentUser } = useAuth();
  const { bookTests = [], books = [] } = useTrackedBooks() || {};
  const { getCoachingNoteForStudent, getMeetingsForStudent, getCoachingProfileForStudent, coachingLinks } = useCoaching();

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const myStudyAssignments = useMemo(() => {
    return (studyAssignments || []).filter(a => String(a.studentId) === String(selectedStudent?.id));
  }, [studyAssignments, selectedStudent]);

  const myRoadmaps = useMemo(() => {
    return (myStudyAssignments || []).map(assignment => {
      const targetPlanId = assignment.planId || assignment.studyPlanId;
      const plan = (studyPlans || []).find(p => String(p.id) === String(targetPlanId));
      if (!plan) return null;
      return { assignment, plan };
    }).filter(Boolean);
  }, [myStudyAssignments, studyPlans]);

  const coachingNote = getCoachingNoteForStudent(selectedStudent?.id);
  const coachingProfile = getCoachingProfileForStudent(selectedStudent?.id);
  const studentMeetings = getMeetingsForStudent(selectedStudent?.id);
  const upcomingMeeting = studentMeetings.find(m => m.nextMeetingDate);
  const hasCoach = coachingLinks?.some(l => String(l.studentId) === String(selectedStudent?.id));

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

    const gradesList = curData?.grades || [];

    return (homeworks || []).filter(hw => {
      return isHomeworkForStudent(hw, selectedStudent, gradesList);
    }).flatMap(hw => {
      if (hw.isBookAssignment && hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0) {
        const bookObj = books.find(b => String(b.id) === String(hw.bookId));
        const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

        return Object.entries(hw.testDueDates).map(([testId, tDateStr]) => {
          const testObj = bookTests.find(b => String(b.id) === String(testId));
          const sub = submissions.find(s => String(s.studentId) === String(selectedStudent.id) && s.status !== 'in_progress' && (String(s.testId) === String(testId) || String(s.bookTestId) === String(testId) || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === String(testId)))));
          const subjObj = (bookObj?.subjects || []).find(s => String(s.id) === String(testObj?.subjectId));
          const subjectName = subjObj?.name || hw.subject || cleanBookTitle;

          return {
            ...hw,
            id: `bt_${hw.id}_${testId}`,
            subject: subjectName,
            title: `${cleanBookTitle} — ${testObj?.name || 'Test'}`,
            dueDate: tDateStr,
            status: sub ? 'Sonuçlandı' : 'Atandı',
            questionCount: testObj?.questionCount || 20,
            correctAnswers: sub ? (sub.score || 0) : 0,
            submissionId: sub?.id
          };
        });
      }

      const sub = (hw.submissions || []).find(s => String(s.studentId) === String(selectedStudent.id)) ||
        submissions.find(s => (s.hwId === hw.id || s.testId === hw.id || String(s.testId) === String(hw.id)) && String(s.studentId) === String(selectedStudent.id));
      return [{ 
        ...hw, 
        status: sub ? 'Sonuçlandı' : 'Atandı', 
        questionCount: hw.totalQuestions || 10, 
        correctAnswers: sub ? (sub.score || 0) : 0,
        submissionId: sub?.id
      }];
    });
  }, [homeworks, selectedStudent, submissions, curData, books, bookTests]);

  const assignments = useMemo(() => {
    if (!selectedStudent) return [];
    return studyAssignments.filter(s => s.studentId === selectedStudent?.id).map(a => ({ ...a, planName: 'Ders Planı', planLink: '#' }));
  }, [studyAssignments, selectedStudent]);

  const pendingTasks = useMemo(() => {
    const tTasks = tests.filter(t => t.status === 'Atandı').map(t => {
      const dueDateObj = parseSafeDate(t.dueDate);
      
      let resolvedType = t.type;
      let resolvedSourceType = t.sourceType || t.contentType;
      
      if (!resolvedType || resolvedType === 'test') {
        if (t.isOpenEnded || t.questionType === 'acik_uclu') {
          resolvedType = 'acik_uclu';
        } else if (t.questionType === 'coktan_secmeli') {
          resolvedType = 'coktan_secmeli';
        } else {
          const firstQId = t.questionIds?.[0];
          const firstQ = allQuestions?.find(q => q.id === firstQId);
          if (firstQ) {
            resolvedType = firstQ.type || 'coktan_secmeli';
            if (!resolvedSourceType) {
              resolvedSourceType = firstQ.sourceType || firstQ.contentType;
            }
          }
        }
      }
      
      return { id: t.id, type: resolvedType || 'test', title: t.title, subject: getCategoryName(t), dueDateStr: dueDateObj.toLocaleDateString('tr-TR'), dueDateObj, questionCount: t.questionCount, durationMinutes: (t.questionCount || 0) * 2 || 30, sourceType: resolvedSourceType };
    });
    return [...tTasks].sort((a, b) => a.dueDateObj - b.dueDateObj);
  }, [tests, assignments, allQuestions]);

  const stats = useMemo(() => {
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı');
    const completedAssignments = assignments.filter(a => a.status === 'completed');
    const totalAll = tests.length + assignments.length;
    const totalDone = completedTests.length + completedAssignments.length;
    const completedRate = totalAll > 0 ? (totalDone / totalAll) * 100 : 0;
    let totalQ = 0, totalC = 0;
    completedTests.forEach(t => { totalQ += t.questionCount || 0; totalC += ((t.correctAnswers || 0) / 100) * (t.questionCount || 0); });
    
    // Calculate global success rate from unified submissions for 100% consistency with other pages
    const baseSubs = (submissions || [])
      .filter(s => selectedStudent && String(s.studentId) === String(selectedStudent.id));

    const hwSubs = [];
    (homeworks || []).forEach(hw => {
      (hw.submissions || []).forEach(sub => {
        if (selectedStudent && String(sub.studentId) === String(selectedStudent.id)) {
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
    const successRate = globalTotal > 0 ? (globalCorrect / globalTotal) * 100 : 0;

    const overdueCount = tests.filter(t => t.status === 'Atandı' && isPast(parseSafeDate(t.dueDate)) && !isToday(parseSafeDate(t.dueDate))).length;
    return { testCount: tests.length, pendingCount: (tests.length - completedTests.length), successRate, overdueCount, completedRate };
  }, [tests, assignments, submissions, selectedStudent]);

  const studentGoals = useMemo(() => {
    if (!selectedStudent) return [];
    return goals.filter(g => String(g.studentId) === String(selectedStudent.id));
  }, [goals, selectedStudent]);

  const gradeLabel = curData?.grades?.find(g => g.id === selectedStudent?.gradeId)?.name || '';
  const avatarColor = avatarColors[studentMembers.findIndex(s => s.id === selectedStudent?.id) % avatarColors.length] || '#6366f1';

  /* ─── Derived values ─── */
  const today = new Date();
  const todayStr = today.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  const todayProgramInfo = useMemo(() => {
    const daysMap = [
      { key: 'Paz', long: 'Pazar' },
      { key: 'Pzt', long: 'Pazartesi' },
      { key: 'Sal', long: 'Salı' },
      { key: 'Çrş', long: 'Çarşamba' },
      { key: 'Prş', long: 'Perşembe' },
      { key: 'Cum', long: 'Cuma' },
      { key: 'Cts', long: 'Cumartesi' }
    ];
    const now = new Date();
    const currentDayObj = daysMap[now.getDay()];
    
    const rawProg = coachingProfile?.weeklyProgram;
    let manualItems = [];
    if (Array.isArray(rawProg)) {
      const todayProg = rawProg.find(r => r.day === currentDayObj.key);
      manualItems = todayProg?.items || [];
    }

    // Auto-populate active homeworks based on start date & due date
    const autoHwItems = [];
    const todayYMD = now.toISOString().split('T')[0];
    const todayTime = new Date(todayYMD).getTime();
    const studentId = selectedStudent?.id;

    (homeworks || []).forEach(hw => {
      const gradesList = curData?.grades || [];
      if (!isHomeworkForStudent(hw, selectedStudent, gradesList)) return;

      // A) Book Assignment with testDueDates
      if (hw.isBookAssignment && hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0) {
        const bookObj = books.find(b => String(b.id) === String(hw.bookId));
        const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

        Object.entries(hw.testDueDates).forEach(([testId, tDateStr]) => {
          if (!tDateStr) return;
          const tYMD = tDateStr.split('T')[0];
          if (todayYMD === tYMD) {
            const tObj = bookTests.find(b => String(b.id) === String(testId));
            const testName = tObj?.name || 'Test';
            const qCount = tObj?.questionCount || 20;

            const subjObj = (bookObj?.subjects || []).find(s => String(s.id) === String(tObj?.subjectId));
            const subjectName = subjObj?.name || hw.subject || cleanBookTitle;
            const topicObj = (subjObj?.topics || []).find(tp => String(tp.id) === String(tObj?.topicId));
            const topicName = topicObj?.name || tObj?.topicName || '';

            const displayHeader = topicName ? `${subjectName} • ${topicName}` : subjectName;
            const displaySub = `${cleanBookTitle} — ${testName}`;

            const isSolved = submissions.some(s =>
              String(s.studentId) === String(studentId) &&
              s.status !== 'in_progress' && s.status !== 'draft' &&
              (String(s.testId) === String(testId) || String(s.bookTestId) === String(testId) || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === String(testId))))
            );

            // Exclude solved/completed tests so they disappear from today's program view
            if (isSolved) return;

            const existsInManual = manualItems.some(m => m.id === `book_test_${hw.id}_${testId}`);
            if (!existsInManual) {
              autoHwItems.push({
                id: `book_test_${hw.id}_${testId}`,
                hwId: hw.id,
                testId: testId,
                isAutoHomework: true,
                taskType: 'kitap',
                subject: displayHeader,
                topic: displaySub,
                questionCount: `${qCount} soru`,
                time: `Hedef: ${new Date(tDateStr).toLocaleDateString('tr-TR')}`,
                done: false
              });
            }
          }
        });
        return;
      }

      // B) Standard Homework or overall due date
      const rawStart = hw.startDate || hw.assignedAt || hw.createdAt;
      const startYMD = rawStart ? new Date(rawStart).toISOString().split('T')[0] : null;
      const startTime = startYMD ? new Date(startYMD).getTime() : null;

      const rawDue = hw.dueDate || hw.assignedDueDate;
      const dueYMD = rawDue ? new Date(rawDue).toISOString().split('T')[0] : null;
      const dueTime = dueYMD ? new Date(dueYMD).getTime() : null;

      let isForToday = false;
      if (dueTime && startTime) {
        isForToday = todayTime >= startTime && todayTime <= dueTime;
      } else if (dueTime) {
        isForToday = todayYMD === dueYMD || todayTime <= dueTime;
      } else if (startTime) {
        isForToday = todayTime === startTime;
      } else {
        isForToday = true;
      }

      if (isForToday) {
        const sub = (hw.submissions || []).find(s => String(s.studentId) === String(studentId)) ||
          submissions.find(s => (s.hwId === hw.id || s.testId === hw.id || String(s.testId) === String(hw.id)) && String(s.studentId) === String(studentId));
        const isDone = !!sub;

        // Exclude completed standard homeworks so they disappear from today's program view
        if (isDone) return;

        const existsInManual = manualItems.some(m => m.id === `auto_hw_${hw.id}` || m.hwId === hw.id);
        if (!existsInManual) {
          autoHwItems.push({
            id: `auto_hw_${hw.id}`,
            hwId: hw.id,
            isAutoHomework: true,
            taskType: hw.isBookAssignment ? 'kitap' : 'ödev',
            subject: hw.subject || 'Atanan Ödev',
            topic: hw.title || hw.name || 'Ödev Görevi',
            questionCount: hw.totalQuestions ? `${hw.totalQuestions}` : null,
            time: dueYMD ? `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}` : null,
            done: false
          });
        }
      }
    });

    return {
      dayName: currentDayObj.long,
      dayKey: currentDayObj.key,
      items: [...autoHwItems, ...manualItems]
    };
  }, [coachingProfile, homeworks, selectedStudent, curData, submissions, books, bookTests]);

  const handleToggleTodayTask = async (taskId) => {
    if (!coachingProfile || !coachingProfile.weeklyProgram) return;
    const updatedWeeklyProgram = coachingProfile.weeklyProgram.map(dayRow => {
      if (dayRow.day === todayProgramInfo.dayKey) {
        return {
          ...dayRow,
          items: (dayRow.items || []).map(item => item.id === taskId ? { ...item, done: !item.done } : item)
        };
      }
      return dayRow;
    });
    await saveCoachingProfile({
      ...coachingProfile,
      studentId: selectedStudent?.id,
      weeklyProgram: updatedWeeklyProgram
    });
  };

  const completedCount = tests.filter(t => t.status === 'Sonuçlandı').length;
  const overdueCount = stats.overdueCount;
  const pendingCount = stats.pendingCount;
  const successPct = Math.round(stats.successRate);
  const progressPct = Math.floor(stats.completedRate);

  /* ─── STYLES ─── */
  const S = {
    page: { minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" },
    hero: {
      background: 'linear-gradient(135deg, #3730a3 0%, #6d28d9 50%, #a21caf 100%)',
      padding: isMobile ? '1.5rem 1rem 3.5rem' : '2rem 2rem 4rem',
      position: 'relative', overflow: 'hidden'
    },
    section: { padding: isMobile ? '0 0.875rem' : '0 1.5rem', marginBottom: '1.5rem' },
    sectionTitle: { fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 },
    card: { background: '#ffffff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' },
    glassChip: { background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 99 },
  };

  /* ─── Stat chips ─── */
  const statChips = [
    { label: 'Toplam', value: tests.length, color: '#6366f1', bg: '#eef2ff' },
    { label: 'Tamamlandı', value: completedCount, color: '#16a34a', bg: '#dcfce7' },
    { label: 'Bekliyor', value: pendingCount, color: '#ea580c', bg: '#ffedd5' },
    { label: 'Gecikti', value: overdueCount, color: '#dc2626', bg: '#fee2e2' },
  ];

  /* ─── Quick action tiles ─── */
  const quickTiles = [
    { icon: '📊', label: 'Sonuçlarım', sub: 'Karne & analiz', to: '/student-results', g: 'linear-gradient(135deg,#4f46e5,#7c3aed)' },
    { icon: '❌', label: 'Yanlışlarım', sub: 'Hata havuzu', to: '/wrong-answers', g: 'linear-gradient(135deg,#db2777,#e11d48)' },
    { icon: '📚', label: 'Kitaplarım', sub: 'Kitap ilerlemesi', to: '/student/books', g: 'linear-gradient(135deg,#0891b2,#0d9488)' },
    { icon: '🎯', label: 'Hedeflerim', sub: 'Hedef takip', to: '/goals', g: 'linear-gradient(135deg,#ea580c,#dc2626)' },
  ];

  return (
    <div style={S.page}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes sdFadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sdPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.06); } }
        @keyframes sdShimmer { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
        @keyframes sdSpin { to { transform:rotate(360deg); } }
        .sd-tile { transition: transform 0.18s, box-shadow 0.18s; }
        .sd-tile:active { transform: scale(0.96); }
        .sd-btn { transition: all 0.18s; }
        .sd-btn:active { transform: scale(0.97); }
        .sd-chip { transition: transform 0.2s; }
        .sd-chip:hover { transform: translateY(-2px); }
        .sd-hw-card { transition: all 0.2s; }
        .sd-hw-card:active { transform: scale(0.98); }
        .sd-section { animation: sdFadeUp 0.4s ease both; }
      `}</style>

      {/* ════════════════ HERO ════════════════ */}
      <div style={S.hero}>
        {/* bg orbs */}
        <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220, background:'rgba(255,255,255,0.07)', borderRadius:'50%', filter:'blur(40px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, left:20, width:160, height:160, background:'rgba(255,255,255,0.05)', borderRadius:'50%', filter:'blur(30px)', pointerEvents:'none' }} />

        {/* Student switcher */}
        {studentMembers.length > 1 && (
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:8, marginBottom:12, scrollbarWidth:'none' }}>
            {studentMembers.map((s, i) => {
              const active = selectedStudent?.id === s.id;
              const col = avatarColors[i % avatarColors.length];
              return (
                <button key={s.id} onClick={() => setSelectedStudent(s)} className="sd-btn"
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'0.3rem 0.75rem', borderRadius:99, border:`1.5px solid ${active ? 'white' : 'rgba(255,255,255,0.35)'}`, background: active ? 'rgba(255,255,255,0.25)' : 'transparent', color:'white', fontWeight:700, fontSize:'0.75rem', cursor:'pointer', whiteSpace:'nowrap', backdropFilter:'blur(8px)' }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', background:col, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.55rem', fontWeight:900, color:'white', flexShrink:0 }}>{s.name.charAt(0)}</div>
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Hero main row */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, position:'relative', zIndex:2 }}>

          {/* Left: avatar + info */}
          <div style={{ display:'flex', alignItems:'center', gap:14, flex:1, minWidth:0 }}>
            {/* Avatar */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width: isMobile ? 60 : 72, height: isMobile ? 60 : 72, borderRadius:'50%', background: avatarColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize: isMobile ? '1.5rem' : '1.8rem', fontWeight:900, color:'white', border:'3px solid rgba(255,255,255,0.4)', boxShadow:'0 6px 20px rgba(0,0,0,0.25)', animation:'sdPulse 4s ease infinite' }}>
                {selectedStudent?.name?.charAt(0) || 'Ö'}
              </div>
              <div style={{ position:'absolute', bottom:2, right:2, width:14, height:14, borderRadius:'50%', background:'#22c55e', border:'2px solid white' }} />
            </div>

            {/* Name + date */}
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.7)', fontWeight:700, marginBottom:2 }}>Hoş Geldin 👋</div>
              <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.65rem', fontWeight:900, color:'white', margin:0, lineHeight:1.1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {selectedStudent?.name || 'Öğrenci'}
              </h1>
              {/* Dates Row: Today */}
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '0.2rem 0.6rem', backdropFilter: 'blur(8px)' }}>
                  <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>📅 {todayStr}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Ultra Premium Glassmorphic Circular Progress Badge */}
          <div style={{
            position: 'relative',
            width: isMobile ? 74 : 90,
            height: isMobile ? 74 : 90,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.28), rgba(255,255,255,0.08))',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(255,255,255,0.4)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.22), inset 0 1px 1px rgba(255,255,255,0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {/* SVG Circular Progress Ring */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255, 255, 255, 0.18)"
                strokeWidth="2.8"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={successPct >= 70 ? '#4ade80' : successPct >= 50 ? '#fbbf24' : '#f87171'}
                strokeWidth="3.2"
                strokeDasharray={`${Math.min(successPct, 100)}, 100`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1.2s ease-in-out' }}
              />
            </svg>

            {/* Inner Content */}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? '1.2rem' : '1.45rem', fontWeight: 900, color: '#ffffff', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                %{successPct}
              </div>
              <div style={{ fontSize: '0.52rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                Başarı
              </div>
            </div>
          </div>
        </div>

        {/* White wave at bottom */}
        <div style={{ position:'absolute', bottom:-2, left:0, right:0, lineHeight:0 }}>
          <svg viewBox="0 0 390 40" preserveAspectRatio="none" style={{ width:'100%', height:40, display:'block' }}>
            <path d="M0,40 C100,10 280,10 390,40 L390,40 L0,40 Z" fill="#f1f5f9" />
          </svg>
        </div>
      </div>

      {/* ════════════════ STAT CHIPS (5-Column Responsive Grid - 100% Mobile Fit) ════════════════ */}
      <div style={{ padding: isMobile ? '0 0.5rem' : '0 1.5rem', marginTop: isMobile ? 12 : -12, marginBottom: '1.25rem', position: 'relative', zIndex: 10 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: isMobile ? 4 : 10,
          width: '100%'
        }}>
          {statChips.map((c, i) => (
            <div key={i} className="sd-chip" style={{
              background: 'white',
              borderRadius: isMobile ? 12 : 16,
              padding: isMobile ? '0.55rem 0.2rem' : '0.75rem 1rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              border: `1.5px solid ${c.bg}`,
              animation: `sdFadeUp 0.4s ease ${i * 0.05}s both`,
              minWidth: 0
            }}>
              <div style={{ fontSize: isMobile ? '1.15rem' : '1.5rem', fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: isMobile ? '0.52rem' : '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.01em', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{c.label}</div>
            </div>
          ))}
          {/* Progress chip */}
          <div className="sd-chip" style={{
            background: 'white',
            borderRadius: isMobile ? 12 : 16,
            padding: isMobile ? '0.55rem 0.2rem' : '0.75rem 1rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            border: '1.5px solid #f3e8ff',
            animation: 'sdFadeUp 0.4s ease 0.25s both',
            minWidth: 0
          }}>
            <div style={{ fontSize: isMobile ? '1.15rem' : '1.5rem', fontWeight: 900, color: '#9333ea', lineHeight: 1 }}>%{progressPct}</div>
            <div style={{ fontSize: isMobile ? '0.52rem' : '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.01em', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>Tamamlanma</div>
          </div>
        </div>
      </div>

      {/* ════════════════ QUICK TILES ════════════════ */}
      <div style={S.section} className="sd-section">
        <div style={S.sectionTitle}>
          <span style={{ fontSize:14 }}>⚡</span> Hızlı Erişim
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.75rem' }}>
          {quickTiles.map((t, i) => (
            <button
              key={i}
              onClick={() => navigate(t.to)}
              className="sd-tile"
              style={{
                background: t.g,
                borderRadius: 20,
                padding: isMobile ? '0.85rem' : '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                animation: `sdFadeUp 0.4s ease ${i * 0.08}s both`
              }}
            >
              <div style={{
                fontSize: isMobile ? '1.35rem' : '1.65rem',
                lineHeight: 1,
                flexShrink: 0,
                background: 'rgba(255,255,255,0.2)',
                width: isMobile ? 40 : 46,
                height: isMobile ? 40 : 46,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(6px)'
              }}>
                {t.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 900, color: 'white', lineHeight: 1.2 }}>
                  {t.label}
                </div>
                <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.sub}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════ TODAY'S PROGRAM & TASKS (Günün Programı) ════════════════ */}
      <div style={S.section} className="sd-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={S.sectionTitle}>
            <span style={{ fontSize: 16 }}>🗓️</span> Günün Programı ({todayProgramInfo.dayName})
            {todayProgramInfo.items.length > 0 && (
              <span style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: 'white',
                borderRadius: 99,
                padding: '0.12rem 0.6rem',
                fontSize: '0.65rem',
                fontWeight: 900,
                marginLeft: 4
              }}>
                {todayProgramInfo.items.filter(i => i.done).length}/{todayProgramInfo.items.length} Tamamlandı
              </span>
            )}
          </div>

          <Link to="/my-program" style={{ textDecoration: 'none', fontSize: '0.72rem', fontWeight: 800, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 3 }}>
            Tüm Program <ChevronRight size={14} />
          </Link>
        </div>

        {todayProgramInfo.items.length === 0 ? (
          <div style={{
            background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
            borderRadius: 20,
            padding: '1.5rem 1.25rem',
            border: '1.5px dashed #cbd5e1',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8
          }}>
            <div style={{ fontSize: '2rem' }}>✨</div>
            <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b' }}>
              Bugün ({todayProgramInfo.dayName}) için tanımlı ders görevi yok
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Ders eklemek veya haftalık programını düzenlemek için aşağıdaki butona tıkla.
            </div>
            <Link to="/my-program" style={{
              marginTop: 6,
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white',
              borderRadius: 14,
              padding: '0.5rem 1.25rem',
              fontWeight: 800,
              fontSize: '0.8rem',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
            }}>
              📅 Programıma Git & Ders Ekle
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {todayProgramInfo.items.map((item, idx) => {
              const taskIcons = {
                konu: '📖',
                soru: '✏️',
                tekrar: '🔄',
                kitap: '📚',
                deneme: '📊',
                diger: '✨'
              };
              const icon = taskIcons[item.taskType] || '📌';
              const isQuizTask = item.isAutoHomework || item.testId || item.hwId;

              const handleTaskClick = () => {
                if (item.testId) {
                  navigate(`/book-quiz/${item.testId}?studentId=${selectedStudent.id}`);
                  return;
                }
                if (item.hwId) {
                  const hwObj = (homeworks || []).find(h => String(h.id) === String(item.hwId));
                  if (hwObj?.type === 'physicalExam') {
                    navigate(`/physical-exam/${item.hwId}?studentId=${selectedStudent.id}`);
                  } else if (hwObj?.isBookAssignment && hwObj?.tests && hwObj.tests.length > 0) {
                    navigate(`/book-quiz/${hwObj.tests[0]}?studentId=${selectedStudent.id}`);
                  } else {
                    navigate(`/quiz/${item.hwId}?studentId=${selectedStudent.id}`);
                  }
                  return;
                }
                handleToggleTodayTask(item.id);
              };

              return (
                <div
                  key={item.id || idx}
                  onClick={handleTaskClick}
                  style={{
                    background: item.done ? '#f8fafc' : '#ffffff',
                    borderRadius: 16,
                    padding: '0.85rem 1.1rem',
                    border: item.done ? '1.5px solid #e2e8f0' : '1.5px solid #e0e7ff',
                    boxShadow: item.done ? 'none' : '0 4px 16px rgba(99,102,241,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    cursor: 'pointer',
                    opacity: item.done ? 0.75 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    {/* Checkbox */}
                    <div style={{
                      width: 22, height: 22,
                      borderRadius: 7,
                      border: item.done ? 'none' : '2px solid #cbd5e1',
                      background: item.done ? '#16a34a' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s'
                    }}>
                      {item.done && <Check size={14} color="white" strokeWidth={3} />}
                    </div>

                    {/* Task Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: item.done ? '#64748b' : '#0f172a', textDecoration: item.done ? 'line-through' : 'none' }}>
                          {icon} {item.subject || item.bookName || 'Ders Görevi'}
                        </span>
                        {(item.startTime || item.endTime || item.time || item.saat) && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', border: '1px solid #c7d2fe', padding: '0.15rem 0.5rem', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            🕐 {item.startTime ? `${item.startTime}${item.endTime ? ` → ${item.endTime}` : ''}` : (item.time || item.saat)}
                          </span>
                        )}
                        {item.hours && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6366f1', background: '#eef2ff', padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                            ⏱️ {item.hours} sa
                          </span>
                        )}
                        {item.questionCount && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0891b2', background: '#ecfeff', padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                            ✏️ {item.questionCount} soru
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.topic || item.note || item.bookName || 'Günün ders çalışması'}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator Pill / Action Button */}
                  {isQuizTask ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick();
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 99,
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        boxShadow: '0 3px 10px rgba(79,70,229,0.3)',
                        flexShrink: 0
                      }}
                    >
                      <PlayCircle size={13} /> Çöz
                    </button>
                  ) : (
                    <div style={{
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      padding: '0.25rem 0.65rem',
                      borderRadius: 99,
                      background: item.done ? '#dcfce7' : '#eef2ff',
                      color: item.done ? '#15803d' : '#4f46e5',
                      flexShrink: 0
                    }}>
                      {item.done ? 'Tamamlandı ✓' : 'Tamamla'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════ STUDY PLANS ════════════════ */}
      {myRoadmaps.length > 0 && (
        <div style={S.section} className="sd-section">
          <div style={S.sectionTitle}>
            <span style={{ fontSize:14 }}>🗺️</span> Yol Haritalarım
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {myRoadmaps.map(({ assignment, plan }) => {
              const total = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || 0), 0) || 0;
              const done = assignment.completedTopics?.length || 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={assignment.id} onClick={() => navigate(`/student/study-plan/${assignment.id}`)} className="sd-hw-card"
                  style={{ ...S.card, padding:'1rem 1.1rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.85rem' }}>
                  <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Target size={20} color="white" />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:'0.88rem', color:'#0f172a', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{plan.title}</div>
                    <div style={{ height:6, background:'#f1f5f9', borderRadius:99, overflow:'hidden', marginBottom:3 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#6366f1,#a855f7)', borderRadius:99, transition:'width 1s' }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.65rem', fontWeight:700, color:'#94a3b8' }}>
                      <span>{done}/{total} konu</span>
                      <span style={{ color:'#6366f1' }}>%{pct}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#cbd5e1" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════ PENDING HOMEWORKS ════════════════ */}
      <div style={{ ...S.section, marginBottom:'1.25rem' }} className="sd-section">
        <div style={S.sectionTitle}>
          <span style={{ fontSize:14 }}>📋</span> Bekleyen Ödevler
          {pendingCount > 0 && (
            <span style={{ background:'#ef4444', color:'white', borderRadius:99, padding:'0.1rem 0.55rem', fontSize:'0.65rem', fontWeight:900, marginLeft:4, animation:'sdShimmer 2s infinite' }}>{pendingCount}</span>
          )}
        </div>

        {pendingTasks.length === 0 ? (
          <div style={{ ...S.card, padding:'2.5rem 1rem', textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🎉</div>
            <div style={{ fontWeight:800, color:'#0f172a', fontSize:'0.95rem', marginBottom:4 }}>Tüm ödevler tamamlandı!</div>
            <div style={{ fontSize:'0.78rem', color:'#94a3b8' }}>Harika iş çıkardın!</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem' }}>
            {pendingTasks.map(task => {
              const conf = getSubConf(getThemeKey(task.subject));
              const dueDate = task.dueDateObj;
              const overdue = isPast(dueDate) && !isToday(dueDate);
              const dueToday = isToday(dueDate);
              const daysDiff = differenceInDays(dueDate, new Date());

              const subjectIcons = {
                'Matematik': '📐',
                'Türkçe': '📚',
                'Fen Bilimleri': '🔬',
                'Sosyal Bilgiler': '🌍',
                'İnkılap Tarihi': '🏛️',
                'İngilizce': '🇬🇧',
                'Din Kültürü': '🌙'
              };
              const subIcon = subjectIcons[task.subject] || '📝';

              return (
                <div
                  key={task.id}
                  className="sd-hw-card"
                  onClick={() => {
                    let path = `/quiz/${task.id}?studentId=${selectedStudent.id}`;
                    if (task.sourceType === 'trackedBook') path = `/book-quiz/${task.id}?studentId=${selectedStudent.id}`;
                    else if (task.type === 'physicalExam') path = `/physical-exam/${task.id}?studentId=${selectedStudent.id}`;
                    navigate(path);
                  }}
                  style={{
                    background: '#ffffff',
                    borderRadius: 20,
                    padding: isMobile ? '1rem' : '1.25rem',
                    boxShadow: overdue
                      ? '0 10px 28px rgba(239, 68, 68, 0.12)'
                      : dueToday
                      ? '0 10px 28px rgba(245, 158, 11, 0.12)'
                      : '0 8px 24px rgba(0, 0, 0, 0.06)',
                    border: overdue
                      ? '1.5px solid rgba(239, 68, 68, 0.3)'
                      : dueToday
                      ? '1.5px solid rgba(245, 158, 11, 0.3)'
                      : '1.5px solid rgba(226, 232, 240, 0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.22s ease'
                  }}
                >
                  {/* Glowing Urgency Bar Top Accent */}
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 4,
                    background: overdue
                      ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                      : dueToday
                      ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                      : `linear-gradient(90deg, ${conf.color}, #6366f1)`
                  }} />

                  {/* Header Row: Subject Badge + Urgency Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: conf.bg,
                      border: `1.5px solid ${conf.border}`,
                      borderRadius: 99,
                      padding: '0.25rem 0.7rem',
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      color: conf.badge
                    }}>
                      <span>{subIcon}</span>
                      <span>{task.subject}</span>
                    </div>

                    {overdue ? (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 99,
                        padding: '0.22rem 0.65rem',
                        fontWeight: 900,
                        fontSize: '0.65rem',
                        color: '#dc2626'
                      }}>
                        <Flame size={12} fill="#ef4444" color="#ef4444" />
                        <span>{differenceInDays(new Date(), dueDate)}g Gecikti</span>
                      </div>
                    ) : dueToday ? (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        borderRadius: 99,
                        padding: '0.22rem 0.65rem',
                        fontWeight: 900,
                        fontSize: '0.65rem',
                        color: '#b45309'
                      }}>
                        <Zap size={12} fill="#f59e0b" color="#f59e0b" />
                        <span>Bugün Son</span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 99,
                        padding: '0.22rem 0.65rem',
                        fontWeight: 900,
                        fontSize: '0.65rem',
                        color: '#059669'
                      }}>
                        <Clock size={12} color="#10b981" />
                        <span>{daysDiff + 1} Gün Kaldı</span>
                      </div>
                    )}
                  </div>

                  {/* Task Title */}
                  <div style={{
                    fontWeight: 900,
                    fontSize: isMobile ? '0.95rem' : '1.05rem',
                    color: '#0f172a',
                    lineHeight: 1.35
                  }}>
                    {task.title}
                  </div>

                  {/* Footer Row: Meta Pills + Action Button */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    paddingTop: 4,
                    borderTop: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} color="#94a3b8" /> {task.dueDateStr}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={13} color="#94a3b8" /> {task.questionCount || 0} Soru
                      </span>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        let path = `/quiz/${task.id}?studentId=${selectedStudent.id}`;
                        if (task.sourceType === 'trackedBook') path = `/book-quiz/${task.id}?studentId=${selectedStudent.id}`;
                        else if (task.type === 'physicalExam') path = `/physical-exam/${task.id}?studentId=${selectedStudent.id}`;
                        navigate(path);
                      }}
                      className="sd-btn"
                      style={{
                        background: `linear-gradient(135deg, ${conf.color}, #4f46e5)`,
                        color: 'white',
                        border: 'none',
                        borderRadius: 14,
                        padding: isMobile ? '0.5rem 1rem' : '0.6rem 1.25rem',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: `0 6px 16px ${conf.color}44`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      <PlayCircle size={15} />
                      <span>Hemen Çöz</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* ════════════════ GOALS ════════════════ */}
      <div style={S.section} className="sd-section">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={S.sectionTitle}>
            <span style={{ fontSize:14 }}>🎯</span> Hedeflerim ({studentGoals.length})
          </div>
          <button onClick={() => setShowGoalModal(true)} className="sd-btn"
            style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:800, color:'#6366f1', background:'#eef2ff', border:'none', borderRadius:10, padding:'0.35rem 0.75rem', cursor:'pointer' }}>
            <Plus size={12} /> Ekle
          </button>
        </div>

        {studentGoals.length === 0 ? (
          <div style={{ ...S.card, padding:'1.75rem 1rem', textAlign:'center' }}>
            <div style={{ fontSize:'2rem', marginBottom:6 }}>🎯</div>
            <div style={{ fontWeight:700, color:'#64748b', fontSize:'0.85rem', marginBottom:6 }}>Henüz hedef yok</div>
            <button onClick={() => setShowGoalModal(true)} className="sd-btn"
              style={{ background:'#eef2ff', color:'#6366f1', border:'none', borderRadius:10, padding:'0.5rem 1rem', fontWeight:800, fontSize:'0.8rem', cursor:'pointer' }}>
              İlk hedefini ekle →
            </button>
          </div>
        ) : (
          <div style={{ ...S.card, overflow:'hidden' }}>
            {studentGoals.slice(0, 4).map((g, i, arr) => {
              const pct = Math.min(100, Math.round(((g.current || 0) / (g.target || 1)) * 100));
              const done = pct >= 100;
              return (
                <div key={g.id} style={{ padding:'0.85rem 1rem', borderBottom: i < arr.length-1 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'0.84rem', color:'#0f172a', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.title}</div>
                      <div style={{ display:'flex', gap:4 }}>
                        <span style={{ fontSize:'0.58rem', fontWeight:800, background:'#eff6ff', color:'#2563eb', padding:'0.1rem 0.4rem', borderRadius:99 }}>{g.period}</span>
                        <span style={{ fontSize:'0.58rem', fontWeight:800, background:'#fef3c7', color:'#b45309', padding:'0.1rem 0.4rem', borderRadius:99 }}>{g.type}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                      <span style={{ fontSize:'0.78rem', fontWeight:900, color: done ? '#16a34a' : '#6366f1' }}>%{pct}</span>
                      <button onClick={() => deleteGoal(g.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#cbd5e1', padding:2, display:'flex' }}><X size={13} /></button>
                    </div>
                  </div>
                  <div style={{ height:5, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background: done ? '#22c55e' : 'linear-gradient(90deg,#6366f1,#a855f7)', borderRadius:99, transition:'width 0.8s' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.62rem', color:'#94a3b8', fontWeight:600, marginTop:3 }}>
                    <span>{g.current || 0} / {g.target} {g.type}</span>
                    {done && <span style={{ color:'#16a34a', fontWeight:800 }}>✓ Tamamlandı</span>}
                  </div>
                </div>
              );
            })}
            <div style={{ padding:'0.75rem 1rem', background:'#fafafa', borderTop:'1px solid #f1f5f9' }}>
              <button onClick={() => navigate('/goals')} className="sd-btn"
                style={{ width:'100%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', border:'none', borderRadius:12, padding:'0.65rem', fontWeight:800, fontSize:'0.8rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, boxShadow:'0 4px 12px rgba(99,102,241,0.25)' }}>
                Tüm Hedefler <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════ COMPLETED EXAMS ════════════════ */}
      {completedCount > 0 && (
        <div style={S.section} className="sd-section">
          <div style={S.sectionTitle}><span style={{ fontSize:14 }}>✅</span> Tamamlanan Sınavlar ({completedCount})</div>
          <div style={S.card}>
            {tests.filter(t => t.status === 'Sonuçlandı').slice(0, 5).map((test, i, arr) => {
              const conf = getSubConf(getThemeKey(getCategoryName(test)));
              const score = test.correctAnswers || 0;
              const good = score >= 70;
              return (
                <div key={test.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.8rem 1rem', borderBottom: i < arr.length-1 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:conf.bg, border:`1.5px solid ${conf.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <conf.icon size={15} color={conf.color} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:'0.82rem', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{test.title}</div>
                    <div style={{ fontSize:'0.65rem', color:'#94a3b8', fontWeight:600 }}>{test.dueDate ? new Date(test.dueDate).toLocaleDateString('tr-TR') : 'Tamamlandı'}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:900, fontSize:'0.9rem', color: good ? '#16a34a' : '#dc2626' }}>%{score}</div>
                      <div style={{ width:40, marginTop:2 }}>
                        <div style={{ height:3, background: good ? '#dcfce7' : '#fee2e2', borderRadius:99 }}>
                          <div style={{ height:'100%', width:`${score}%`, background: good ? '#22c55e' : '#ef4444', borderRadius:99 }} />
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { if (test.type === 'physicalExam') { navigate(`/physical-exam/${test.id}?studentId=${selectedStudent.id}`); } else if (test.submissionId) { navigate(`/review/${test.submissionId}`); } else { navigate(`/quiz/${test.id}?studentId=${selectedStudent.id}`); } }}
                      className="sd-btn"
                      style={{ padding:'0.35rem', borderRadius:8, background:'#f8fafc', border:'1px solid #e2e8f0', cursor:'pointer', display:'flex', alignItems:'center' }}>
                      <Eye size={13} color="#475569" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════ MOTIVATION + RESULTS ════════════════ */}
      <div style={{ ...S.section, display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:'0.75rem' }} className="sd-section">
        {/* Motivation */}
        {(() => {
          const currentDashQuote = DASHBOARD_QUOTES[dashQuoteIdx % DASHBOARD_QUOTES.length];
          const dayLetters = ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'];
          const currentDayIdx = (new Date().getDay() + 6) % 7;

          return (
            <div style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)',
              borderRadius: 20, padding: '1rem 1.15rem', flex: 1,
              boxShadow: '0 6px 20px rgba(245,158,11,0.15)', border: '1px solid #fcd34d',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Flame size={20} color="#d97706" />
                    <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#92400e' }}>Günün Motivasyonu!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDashQuoteIdx(p => p + 1)}
                    style={{
                      background: 'rgba(255,255,255,0.7)', border: '1px solid #fde68a',
                      borderRadius: 8, padding: '0.2rem 0.5rem', color: '#b45309',
                      fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                    }}
                    title="Yeni Söz Göster"
                  >
                    <RefreshCw size={11} /> Sözü Değiştir
                  </button>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.5, fontWeight: 700, fontStyle: 'italic', borderLeft: '3px solid #f59e0b', paddingLeft: 8, margin: '4px 0 6px' }}>
                  "{currentDashQuote.quote}"
                  <div style={{ fontSize: '0.68rem', fontStyle: 'normal', fontWeight: 900, color: '#b45309', marginTop: 2, textAlign: 'right' }}>
                    — {currentDashQuote.author}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#92400e', textTransform: 'uppercase' }}>Haftalık İlerleme Serisi</span>
                  <button
                    type="button"
                    onClick={() => navigate('/my-coaching')}
                    style={{ background: 'none', border: 'none', color: '#b45309', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    Zafer Merkezini Aç <ArrowRight size={11} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 4 }}>
                  {dayLetters.map((d, i) => {
                    const isPassedOrToday = i <= currentDayIdx;
                    const isTodayActive = i === currentDayIdx;
                    return (
                      <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 900, color: isTodayActive ? '#78350f' : '#b45309', marginBottom: 2 }}>{d}</div>
                        <div style={{
                          width: '100%', aspectRatio: 1, borderRadius: 5,
                          background: isTodayActive ? '#f59e0b' : isPassedOrToday ? '#fbbf24' : 'rgba(245,158,11,0.25)',
                          border: isTodayActive ? '1.5px solid #d97706' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isPassedOrToday && <Star size={9} color="white" fill="white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Results CTA */}
        <button onClick={() => navigate('/student-results')} className="sd-btn"
          style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius:20, padding:'1rem 1.1rem', border:'none', cursor:'pointer', display:'flex', flexDirection: isMobile ? 'row' : 'column', alignItems:'center', gap:'0.75rem', boxShadow:'0 6px 20px rgba(99,102,241,0.25)', flex: isMobile ? 1 : undefined, textAlign:'left' }}>
          <div style={{ width:44, height:44, borderRadius:14, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <BarChart3 size={22} color="white" />
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:'0.9rem', color:'white' }}>Detaylı Karne</div>
            <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.75)', fontWeight:600, marginTop:2 }}>Grafik & performans analizi</div>
          </div>
        </button>
      </div>

      {/* Bottom padding for mobile nav */}
      <div style={{ height: isMobile ? '5rem' : '2rem' }} />

      {/* ════════════════ GOAL MODAL ════════════════ */}
      {showGoalModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', zIndex:1000, padding: isMobile ? 0 : '1rem' }}>
          <div style={{ background:'white', borderRadius: isMobile ? '24px 24px 0 0' : '24px', padding:'1.5rem', width:'100%', maxWidth: isMobile ? '100%' : 440, boxShadow:'0 32px 80px rgba(0,0,0,0.25)', animation:'sdFadeUp 0.3s ease' }}>
            {/* Drag handle for mobile */}
            {isMobile && <div style={{ width:40, height:4, background:'#e2e8f0', borderRadius:99, margin:'0 auto 1.25rem' }} />}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
              <h2 style={{ fontWeight:900, fontSize:'1.05rem', color:'#0f172a', margin:0 }}>🎯 Yeni Hedef Ekle</h2>
              <button onClick={() => setShowGoalModal(false)} style={{ background:'#f1f5f9', border:'none', borderRadius:10, padding:'0.5rem', cursor:'pointer', display:'flex' }}><X size={16} color="#64748b" /></button>
            </div>
            <form onSubmit={handleSaveGoal} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
              <input placeholder="Hedef başlığı..." value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                style={{ padding:'0.75rem 1rem', borderRadius:14, border:'1.5px solid #e2e8f0', fontSize:'0.9rem', fontFamily:'inherit', outline:'none', background:'#f8fafc', color:'#0f172a', width:'100%', boxSizing:'border-box' }} required />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <select value={newGoal.type} onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))}
                  style={{ padding:'0.75rem 1rem', borderRadius:14, border:'1.5px solid #e2e8f0', fontSize:'0.88rem', fontFamily:'inherit', outline:'none', background:'#f8fafc', color:'#0f172a' }}>
                  {['Soru','Sayfa','Dakika'].map(v => <option key={v}>{v}</option>)}
                </select>
                <select value={newGoal.period} onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))}
                  style={{ padding:'0.75rem 1rem', borderRadius:14, border:'1.5px solid #e2e8f0', fontSize:'0.88rem', fontFamily:'inherit', outline:'none', background:'#f8fafc', color:'#0f172a' }}>
                  {['Günlük','Haftalık','Aylık'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <input type="number" min="1" placeholder="Hedef miktar" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))}
                style={{ padding:'0.75rem 1rem', borderRadius:14, border:'1.5px solid #e2e8f0', fontSize:'0.9rem', fontFamily:'inherit', outline:'none', background:'#f8fafc', color:'#0f172a', width:'100%', boxSizing:'border-box' }} required />
              <button type="submit" className="sd-btn"
                style={{ padding:'0.9rem', borderRadius:14, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', fontWeight:900, fontSize:'0.9rem', border:'none', cursor:'pointer', boxShadow:'0 6px 20px rgba(99,102,241,0.35)' }}>
                Hedef Kaydet ✓
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
