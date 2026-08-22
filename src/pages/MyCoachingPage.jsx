import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useUser } from '../context/UserContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useTheme } from '../context/ThemeContext';
import { toUUID } from '../services/supabaseService';
import ProgramCenter from '../components/ProgramCenter';
import CoachingReportModal from '../components/CoachingReportModal';
import { computeStudentAnalyticsData } from '../utils/testResolver';
import { getTurkeyToday, getTurkeyYMD } from '../utils/dateHelpers';
import PeriodicQuestionAnalytics from '../components/PeriodicQuestionAnalytics';
import VisualGoalSection from '../components/coaching/VisualGoalSection';
import CoachingQuoteCard, { MOTIVATION_QUOTES } from '../components/coaching/CoachingQuoteCard';
import { useMediaQuery } from '../hooks/useMediaQuery';

/* ─── Helpers ─── */
const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const today = () => getTurkeyToday();
const DAYS = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
const DAY_LONG = { 'Pzt': 'Pazartesi', 'Sal': 'Salı', 'Çrş': 'Çarşamba', 'Prş': 'Perşembe', 'Cum': 'Cuma', 'Cts': 'Cumartesi', 'Paz': 'Pazar' };
const SUBJECTS = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Genel Tekrar', 'Soru Çözümü', 'Deneme Sınavı', 'Paragraf / Problem'];
const TOPIC_STATUSES = ['Başlanmadı', 'Başlandı', 'Öğrenildi', 'Tekrar Yapıldı', 'Tamamlandı'];
const STATUS_COLOR = { 'Başlanmadı': '#94a3b8', 'Başlandı': '#f59e0b', 'Öğrenildi': '#3b82f6', 'Tekrar Yapıldı': '#f97316', 'Tamamlandı': '#10b981' };

const formatCleanDate = (rawDate) => {
  if (!rawDate) return '';
  try {
    if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
      const [y, m, d] = rawDate.trim().split('-').map(Number);
      const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      return `${d} ${months[m - 1] || ''} ${y}`;
    }
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return String(rawDate);
  } catch {
    return String(rawDate);
  }
};

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
        subject: found.lessons || 'Ders Çalışması',
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

/* ─── Styles ─── */
const inp = { width: '100%', padding: '0.6rem 0.85rem', borderRadius: '0.7rem', border: '1.5px solid var(--color-border-input, #e2e8f0)', fontSize: '0.84rem', outline: 'none', background: 'var(--color-surface, white)', color: 'var(--color-text, #0f172a)', fontFamily: 'inherit', boxSizing: 'border-box' };
const ta = { ...inp, minHeight: 72, resize: 'vertical', lineHeight: 1.6 };
const lbl = { fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' };

/* ─── Small components ─── */
function TabBtn({ id, active, label, onClick, isMobile }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      style={{
        padding: isMobile ? '0.45rem 0.75rem' : '0.55rem 0.9rem',
        borderRadius: isMobile ? '0.75rem' : '0.7rem 0.7rem 0 0',
        ...(isMobile
          ? {
              border: active ? '1.5px solid #818cf8' : '1.5px solid var(--color-border, #e2e8f0)'
            }
          : {
              borderTop: active ? '2px solid var(--color-border, #e2e8f0)' : '2px solid transparent',
              borderLeft: active ? '2px solid var(--color-border, #e2e8f0)' : '2px solid transparent',
              borderRight: active ? '2px solid var(--color-border, #e2e8f0)' : '2px solid transparent',
              borderBottom: active ? '2px solid var(--color-surface, white)' : '2px solid transparent'
            }),
        background: active
          ? (isMobile ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : 'var(--color-surface, white)')
          : (isMobile ? 'var(--color-surface-hover, #f8fafc)' : 'transparent'),
        color: active ? (isMobile ? '#ffffff' : 'var(--color-primary, #7c3aed)') : 'var(--color-text-muted, #64748b)',
        fontWeight: active ? 900 : 700,
        fontSize: '0.74rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        marginBottom: !isMobile && active ? -2 : 0,
        transition: 'all 0.15s ease',
        flexShrink: 0,
        boxShadow: isMobile && active ? '0 3px 10px rgba(124, 58, 237, 0.35)' : 'none'
      }}
    >
      {label}
    </button>
  );
}

function Card({ emoji, title, children, color = '#7c3aed', isMobile }) {
  return (
    <div style={{
      background: 'var(--color-surface, white)',
      borderRadius: isMobile ? '1rem' : '1.25rem',
      border: '1.5px solid var(--color-border, #f1f5f9)',
      padding: isMobile ? '1rem 0.85rem' : '1.35rem',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      marginBottom: '1rem',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.9rem', paddingBottom: '0.65rem', borderBottom: '1.5px solid var(--color-border, #f8fafc)' }}>
        <span style={{ fontSize: isMobile ? '1rem' : '1.1rem' }}>{emoji}</span>
        <span style={{ fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: 'var(--color-text, #0f172a)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Tip({ children }) {
  return <div style={{ background: 'rgba(99,102,241,0.12)', border: '1.5px solid rgba(99,102,241,0.3)', borderRadius: '0.75rem', padding: '0.7rem 0.9rem', fontSize: '0.8rem', color: '#818cf8', fontWeight: 700, marginBottom: '1rem' }}>💡 {children}</div>;
}

function CheckItem({ label, checked, onChange, onDelete }) {
  return (
    <div onClick={onChange} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.8rem', background: checked ? 'rgba(16,185,129,0.12)' : 'var(--color-surface-hover, #f8fafc)', borderRadius: '0.65rem', border: checked ? '1.5px solid rgba(16,185,129,0.35)' : '1px solid var(--color-border, #e2e8f0)', cursor: 'pointer', marginBottom: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 20, height: 20, borderRadius: 5, background: checked ? '#16a34a' : 'var(--color-surface, white)', border: checked ? 'none' : '2px solid var(--color-border-input, #cbd5e1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {checked && <Check size={13} color="white" strokeWidth={3} />}
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.84rem', color: checked ? '#34d399' : 'var(--color-text, #374151)', textDecoration: checked ? 'line-through' : 'none' }}>{label}</span>
      </div>
      {onDelete && <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted, #e2e8f0)', padding: 2 }}><Trash2 size={13} /></button>}
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
      {label && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: 4 }}>
        <span>{label}</span><span style={{ color }}>{pct}%</span>
      </div>}
      <div style={{ height: 10, background: 'var(--color-border, #f1f5f9)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   ANA SAYFA
══════════════════════════════════════ */
export default function MyCoachingPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isSmallMobile = useMediaQuery('(max-width: 480px)');
  const {
    getCoachingProfileForStudent, saveCoachingProfile, coachingProfiles,
    isStudentCoached, getMockExamsForStudent, addMockExam, deleteMockExam
  } = useCoaching();
  const { submissions, deleteSubmission } = useEvaluation();
  const { homeworks = [] } = useHomework() || {};
  const { data: curriculumData = [] } = useCurriculum() || {};
  const { books = [], bookTests = [] } = useTrackedBooks() || {};

  const { studentId: paramId } = useParams();
  const studentId = paramId || currentUser?.id;
  const isCoached = useMemo(() => {
    if (!studentId) return false;
    // Teacher or admin can view any profile, student can only view if coached
    if (currentUser?.role === 'teacher' || currentUser?.role === 'admin') return true;
    return isStudentCoached(studentId);
  }, [studentId, currentUser?.role, isStudentCoached]);

  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin';
  const existingProfile = useMemo(() => getCoachingProfileForStudent(studentId) || {}, [studentId, coachingProfiles]);
  const { users = [] } = useUser() || {};
  const targetStudent = useMemo(() => {
    return users.find(u => String(u.id) === String(studentId)) || (studentId === currentUser?.id ? currentUser : null);
  }, [users, studentId, currentUser]);

  const [saved, setSaved] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('hedefler');
  const [expandedExams, setExpandedExams] = useState({});
  const [chartMetric, setChartMetric] = useState('Toplam Net');

  const toggleExamExpand = (id) => {
    setExpandedExams(prev => ({ ...prev, [id]: !prev[id] }));
  };

  /* ── Hedeflerim ── */
  const [goals, setGoals] = useState({
    examGoalType: 'LGS 2026', customExamName: '', targetSchool: '', targetScore: '', targetNet: '',
    gradeClass: '', gradeTerm: '1', gradeTarget: 'Takçek',
    monthlyGoals: [], weeklyGoals: [], dailyGoals: [], customGoals: [],
    counterGoals: [
      { id: '1', title: 'Günlük Soru Çözme', period: 'Günlük', target: 50, current: 0, unit: 'Soru' },
      { id: '2', title: 'Haftalık Soru Çözme', period: 'Haftalık', target: 350, current: 0, unit: 'Soru' },
      { id: '3', title: 'Aylık Kitap Okuma', period: 'Aylık', target: 200, current: 0, unit: 'Sayfa' }
    ]
  });
  const [addKind, setAddKind] = useState('gorev'); // 'gorev' | 'sayisal'
  const [goalTabMode, setGoalTabMode] = useState('sayisal'); // 'sayisal' | 'gorev'
  const [showAddCounterForm, setShowAddCounterForm] = useState(false);
  const [newCounterTitle, setNewCounterTitle] = useState('');
  const [newCounterPeriod, setNewCounterPeriod] = useState('Haftalık');
  const [newCounterTarget, setNewCounterTarget] = useState('');
  const [newCounterUnit, setNewCounterUnit] = useState('Soru');
  const [customAddInputs, setCustomAddInputs] = useState({});

  const [newGoalType, setNewGoalType] = useState('Günlük'); // 'Günlük' | 'Haftalık' | 'Aylık' | 'Özel'
  const [newGoalCategory, setNewGoalCategory] = useState('');
  const [newGoalText, setNewGoalText] = useState('');
  const [groupAddInputs, setGroupAddInputs] = useState({});
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    birthDate: '',
    gender: '',
    gradeClass: '',
    schoolName: '',
    fieldBranch: 'Sayısal',
    studentPhone: '',
    parentName: '',
    parentRelation: 'Anne',
    parentPhone: '',
    parentJob: '',
    cityAddress: '',
    learningStyle: 'Görsel',
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
  const [selectedQuoteCategory, setSelectedQuoteCategory] = useState('Tümü');
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

        // 2) Günlüğe eklenen miktar Haftalık ve Aylık eşleşen birimdeki hedeflere de otomatik eklenir
        if (targetPeriod === 'Günlük' && (g.period === 'Haftalık' || g.period === 'Aylık') && gUnit === targetUnit) {
          return { ...g, current: Math.max(0, (g.current || 0) + amount) };
        }

        // 3) Haftalığa eklenen miktar Aylık eşleşen hedeflere de otomatik eklenir
        if (targetPeriod === 'Haftalık' && g.period === 'Aylık' && gUnit === targetUnit) {
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
      period: periodOverride || newCounterPeriod || newGoalType || 'Günlük',
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
    const item = { id: uid(), text, done: false, period: newGoalType, category: newGoalType === 'Özel' ? (newGoalCategory.trim() || 'Özel') : newGoalType };

    if (newGoalType === 'Günlük') {
      setGoals(p => ({ ...p, dailyGoals: [...(p.dailyGoals || []), item] }));
    } else if (newGoalType === 'Haftalık') {
      setGoals(p => ({ ...p, weeklyGoals: [...(p.weeklyGoals || []), item] }));
    } else if (newGoalType === 'Aylık') {
      setGoals(p => ({ ...p, monthlyGoals: [...(p.monthlyGoals || []), item] }));
    } else {
      setGoals(p => ({ ...p, customGoals: [...(p.customGoals || []), item] }));
    }

    setNewGoalText('');
    setNewGoalCategory('');
  };

  /* ── Haftalık Program (Multi-item per day) ── */
  const [weeklyProgram, setWeeklyProgram] = useState(DAYS.map(d => ({ day: d, items: [] })));
  const [newScheduleInputs, setNewScheduleInputs] = useState(
    DAYS.reduce((acc, d) => ({ ...acc, [d]: { subject: SUBJECTS[0], topic: '', hours: '', isRecurring: true } }), {})
  );

  /* ── Günlük Takip ── */
  const [dailyLogs, setDailyLogs] = useState([]);
  const [newLog, setNewLog] = useState({ date: today(), studyHours: '', questions: '', revision: '', sport: false, sleepTime: '' });

  /* ── Manuel Deneme Girişi (Modal & D/Y/B/Net) ── */
  const [showMockModal, setShowMockModal] = useState(false);
  const [newManualMock, setNewManualMock] = useState({
    title: '', date: today(),
    subjects: {
      'Türkçe': { d: '', y: '', b: '', net: '' },
      'Matematik': { d: '', y: '', b: '', net: '' },
      'Fen Bilimleri': { d: '', y: '', b: '', net: '' },
      'Sosyal Bilgiler': { d: '', y: '', b: '', net: '' },
      'İngilizce': { d: '', y: '', b: '', net: '' },
    }
  });
  const [newSubjectName, setNewSubjectName] = useState('');

  /* ── Konu Takip ── */
  const [topicList, setTopicList] = useState([]);
  const [newTopic, setNewTopic] = useState({ subject: SUBJECTS[0], topic: '', status: 'Başlanmadı' });

  /* ── Soru Takip ── */
  const [questionTrack, setQuestionTrack] = useState({ dailyGoal: '50', solved: '' });

  /* ── Hata Defteri ── */
  const [errors, setErrors] = useState([]);
  const [newError, setNewError] = useState({ subject: SUBJECTS[0], topic: '', reason: '', correct: '', retakeDate: today() });

  /* ── Motivasyon ── */
  const [motivation, setMotivation] = useState({ weekQuote: '', achievements: '', selfNote: '', rewardSystem: '' });

  /* ── Alışkanlıklar ── */
  const [habits, setHabits] = useState([
    { id: uid(), label: 'Erken Kalktım', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Plan Yaptım', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Kitap Okudum', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Spor Yaptım', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
    { id: uid(), label: 'Telefon < 2 Saat', days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) },
  ]);
  const [newHabit, setNewHabit] = useState('');
  const [selectedMonthlyHabit, setSelectedMonthlyHabit] = useState(null);
  const [isEditingLongTermGoal, setIsEditingLongTermGoal] = useState(false);

  /* ── Okul Yazılı Notları ── */
  const [schoolGrades, setSchoolGrades] = useState([]);
  const [gradeTemplateMode, setGradeTemplateMode] = useState('ortaokul'); // 'ortaokul' | 'lise'
  const [customSubjects, setCustomSubjects] = useState([]);
  const [newCustomSubjectInput, setNewCustomSubjectInput] = useState('');

  const SCHOOL_LEVEL_TEMPLATES = {
    ortaokul: {
      name: '🏫 Ortaokul Şablonu (5, 6, 7, 8. Sınıf)',
      subjects: ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler / İnkılap Tarihi', 'İngilizce', 'Din Kültürü']
    },
    lise: {
      name: '🏛️ Lise Şablonu (9, 10, 11, 12. Sınıf)',
      subjects: ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'İngilizce', 'Felsefe', 'Din Kültürü']
    }
  };

  const EXAM_TERMS = ['1. Dönem 1. Yazılı', '1. Dönem 2. Yazılı', '2. Dönem 1. Yazılı', '2. Dönem 2. Yazılı'];

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

  /* ── Konu Havuzu ── */
  const [topicPool, setTopicPool] = useState([]);
  const [newPoolSubject, setNewPoolSubject] = useState({ name: '', color: '#7c3aed' });
  const [newPoolTopics, setNewPoolTopics] = useState({});
  const [bulkTopicInput, setBulkTopicInput] = useState({});
  const [showBulkInput, setShowBulkInput] = useState({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedPoolSubjects, setExpandedPoolSubjects] = useState({});

  /* ── Çözülen Ödevler & Testler Filtreleme & Gruplama State ── */
  const [hwGroupByMode, setHwGroupByMode] = useState('subject'); // 'subject' | 'date'
  const [hwSubjectFilter, setHwSubjectFilter] = useState('all');
  const [hwSearchQuery, setHwSearchQuery] = useState('');
  const [expandedHwSubjects, setExpandedHwSubjects] = useState({});
  const [expandedHwDates, setExpandedHwDates] = useState({});

  const POOL_COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2','#db2777','#0f766e'];

  const TOPIC_TEMPLATES = {
    'LGS': [
      { name: 'Türkçe', color: '#d97706', topics: ['Sözcükte Anlam','Cümlede Anlam','Söz Varlığı','Yapısal Anlam','Yazım Kuralları','Noktalama İşaretleri','Fiil','İsim Soylu Fiiller','Sıfat','Zarf','Zamir','Bağlaç','Edatlar','Ünlü Uyumları','Paragraf','Anlatım Biçimleri','Metin Türleri'] },
      { name: 'Matematik', color: '#2563eb', topics: ['Doğal Sayılar','Bölme-Kalan','OBEB-OKEK','Kesirler','Ondalık Sayılar','Yüzde','Oran-Orantı','Denklemler','Eşitsizlikler','Üslular','Köklü Sayılar','Veri Analizi','Olasılık','Geometri Temelleri','Üçgenler','Dörtgenler','Daireler','Dik Üçgen','Prizmalar'] },
      { name: 'Fen Bilimleri', color: '#059669', topics: ['Hücreler','Biyolojik Çeşitlilik','Kuvvet ve Hareket','Madde ve Atomun Yapısı','Kimyasal Tepkimeler','Enerji Dönüşümleri','Elektrik ve Manyetizma','Optik','Ses','Çevre ve İklim','Canlılar ve Yaşam'] },
      { name: 'Sosyal Bilgiler', color: '#dc2626', topics: ['Tarihte Yolculuk','Bilim Tarih ve Hukuk','Yaşadığımız Yer','Üretim Tüketim','Demokrasi ve Katılım','Ortak Mirasımız','Küresel Bağlantılar'] },
      { name: 'İngilizce', color: '#0891b2', topics: ['Teens','Yummy Yummy','In the Kitchen','On the Phone','TV & Social Media','Adventures','Tourism','Emergency','Digital Era','Greens'] },
      { name: 'Din Kültürü', color: '#7c3aed', topics: ["Kur'an'ın Temel Eğitimi",'Hz. Muhammed','Küresel Etik','Din ve Hayat','Gençlik Dönemi'] },
    ],
    'TYT': [
      { name: 'TYT Türkçe', color: '#d97706', topics: ['Sözcükte Anlam','Deyim-Atasözü','Cümle Anlamı','Paragraf','Yazım Kuralları','Noktalama','Cümle Türleri','Fiil Çekimleri','Edatlar-Bağlaçlar','Anlatım Bozuklukları'] },
      { name: 'TYT Matematik', color: '#2563eb', topics: ['Temel Kavramlar','Sayı Basamakları','Bölünebilme','OBEB-OKEK','Üslular-Köklüler','Kesirler','Denklemler','Eşitsizlikler','Oran-Orantı','Yüzde-Faiz','Kümeler','Fonksiyonlar','Kombinasyon','Olasılık','İstatistik'] },
      { name: 'TYT Fen', color: '#059669', topics: ['Atom Modelleri','Periyodik Sistem','Kimyasal Bağlar','Asit-Baz','Kinetik Enerji','Newton Yasaları','Optik','Elektrik','DNA ve Kalıtım','Ekosistem'] },
      { name: 'TYT Sosyal', color: '#dc2626', topics: ['Tarih Bilimi','İlk Uygarlıklar','İslam Tarihi','Osmanlı Devleti','Birinci Dünya Savaşı','İstiklal Savaşı','Cumhuriyet Dönemi','Coğrafya Temelleri','Türkiye Coğrafyası','Felsefe Giriş'] },
    ],
    'AYT-Sözel': [
      { name: 'Edebiyat', color: '#d97706', topics: ['Güzel Sanatlar','Dil-Anlatım','Halk Edebiyatı','Divan Edebiyatı','Tanzimat','Servetifünun','Milli Edebiyat','Cumhuriyet Edebiyatı'] },
      { name: 'Tarih', color: '#dc2626', topics: ['Tarih Felsefesi','Meşrutiyet Dönemi','Birinci Dünya Savaşı','Kurtuluş Savaşı','Atatürk Dönemi','Siyasi Tarih','İkinci Dünya Savaşı','Soğuk Savaş'] },
      { name: 'Coğrafya', color: '#059669', topics: ['Doğal Sistemler','Küresel Ortam','Nüfus','Göç','Yerleşme','Tarım','Endüstri','Enerji','Turizm','Afetler'] },
    ],
    'AYT-Sayısal': [
      { name: 'Matematik', color: '#2563eb', topics: ['Fonksiyonlar','Trigonometri','Logaritma','Dizi ve Seriler','Limit-Türev','İntegral','Karmaşık Sayılar','Kombinasyon-Olasılık','Analitik Geometri','Konik Kesitler'] },
      { name: 'Fizik', color: '#0891b2', topics: ['Vektörler','Kinematik','Dinamik','Enerji','İtme-Momentum','Tork-Döndürme','Basınç','Dalgalar','Elektrik','Manyetizma','Modern Fizik'] },
      { name: 'Kimya', color: '#db2777', topics: ['Atom Modelleri','Periyodik Tablo','Kimyasal Bağ','Gaz Yasaları','Termokimya','Kimyasal Denge','Elektrokimya','Organik Kimya'] },
      { name: 'Biyoloji', color: '#059669', topics: ['Hücre','Mitoz-Mayoz','Kalıtım','Mutasyon','Ekosistem','Solunum Sistemleri','Sinir Sistemi','Hormonal Sistem','Üreme'] },
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
      ? { ...s, topics: s.topics.map(t => t.id === topicId ? { ...t, done: !t.done, status: !t.done ? 'Bitti' : 'Başlanmadı' } : t) } : s));
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

  const assignTopicToDay = (subjectName, topicName, dayName, hours = '1 sa', activityType = 'Konu Çalışması') => {
    if (!subjectName || !topicName || !dayName) return;
    
    const targetDay = (dayName === 'Pazartesi' ? 'Pzt' :
                       dayName === 'Salı' ? 'Sal' :
                       dayName === 'Çarşamba' ? 'Çrş' :
                       dayName === 'Perşembe' ? 'Prş' :
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
                type: activityType || 'Konu Çalışması',
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

    // Update topic status to Devam Ediyor if currently Başlanmadı or unset
    setTopicPool(prev => prev.map(s => {
      if (s.name !== subjectName) return s;
      return {
        ...s,
        topics: s.topics.map(t => {
          if (t.name === topicName && (!t.status || t.status === 'Başlanmadı')) {
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
          existing.topics = [...existing.topics, ...tplSub.topics.filter(n => !existingNames.has(n)).map(n => ({ id: uid(), name: n, done: false, status: 'Başlanmadı' }))];
        } else {
          next.push({ id: uid(), name: tplSub.name, color: tplSub.color, topics: tplSub.topics.map(n => ({ id: uid(), name: n, done: false, status: 'Başlanmadı' })) });
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
      alert(`"${gradeObj.name}" sınıfı için henüz kayıtlı ders müfredatı bulunamadı.`);
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
          const newTopics = topicNames.filter(n => !existingNames.has(n)).map(n => ({ id: uid(), name: n, done: false, status: 'Başlanmadı' }));
          existing.topics = [...existing.topics, ...newTopics];
        } else {
          next.push({
            id: uid(),
            name: sub.name,
            color,
            topics: topicNames.map(n => ({ id: uid(), name: n, done: false, status: 'Başlanmadı' }))
          });
        }
      });
      return next;
    });
  };

  /* ─── Profile yükle ─── */
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

  /* ─── Hedef Otomatik Sıfırlama Takibi (Günlük, Haftalık, Aylık) ─── */
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

        // Her gece 00:00 sonrası yeni günde Günlük hedefler 0'lanır
        if (g.period === 'Günlük' && lastDaily && lastDaily !== todayStr) {
          newCurrent = 0;
          changed = true;
        }

        // Her Pazartesi / yeni haftada Haftalık hedefler 0'lanır
        if (g.period === 'Haftalık' && lastWeekly && lastWeekly !== weekKey) {
          newCurrent = 0;
          changed = true;
        }

        // Her ayın 1'inde Aylık hedefler 0'lanır
        if (g.period === 'Aylık' && lastMonthly && lastMonthly !== monthKey) {
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

  /* ─── Deneme sonuçları (otomatik + manuel kombine) ─── */
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
        'Türkçe': { d: '', y: '', b: '', net: '' },
        'Matematik': { d: '', y: '', b: '', net: '' },
        'Fen Bilimleri': { d: '', y: '', b: '', net: '' },
        'Sosyal Bilgiler': { d: '', y: '', b: '', net: '' },
        'İngilizce': { d: '', y: '', b: '', net: '' },
      }
    });
  };

  const { generalTrialExams, otherHomeworkSubmissions } = useMemo(() => {
    return computeStudentAnalyticsData({
      studentId,
      targetStudent,
      submissions,
      homeworks,
      books,
      bookTests,
      studentMockExams
    });
  }, [submissions, homeworks, studentMockExams, studentId, targetStudent, books, bookTests]);

  const pendingExams = useMemo(() => {
    return studentMockExams.filter(m => m.approvalStatus === 'pending' || (m.createdBy === 'student' && m.approvalStatus !== 'approved'));
  }, [studentMockExams]);

  /* ─── Kaydet ─── */
  const handleSave = useCallback(async () => {
    await saveCoachingProfile({
      ...existingProfile,
      studentId,
      weeklyProgramWeekKey: getCurrentWeekKey(),
      // /goals & koçluk sayfasıyla senkron
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

  /* ─── Multi-Item Weekly Program Handlers ─── */
  const addWeeklyItem = (dayName) => {
    const input = newScheduleInputs[dayName] || { subject: poolSubjectNames[0] || SUBJECTS[0], topic: '', hours: '', isRecurring: true };
    if (!input.subject && !input.topic) return;

    // '__custom__' seçildiyse _customTopic'i kullan
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

    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Ekim', 'Kas', 'Ara'];

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
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];

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

  /* ─── Hesaplamalar ─── */
  const totalDailyQuestions = dailyLogs.reduce((s, l) => s + (parseFloat(l.questions) || 0), 0);
  const totalDailyHours = dailyLogs.reduce((s, l) => s + (parseFloat(l.studyHours) || 0), 0);
  const completedMonthly = (goals.monthlyGoals || []).filter(g => g.done).length;
  const todayIndex = (new Date().getDay() + 6) % 7;
  const todayDayKey = DAYS[todayIndex];
  const completedDaily = (habits || []).filter(h => h.days && h.days[todayDayKey]).length;
  const totalDaily = (habits || []).length;
  const totalPoolTopics = topicPool.reduce((sum, s) => sum + (s.topics?.length || 0), 0);
  const completedPoolTopics = topicPool.reduce((sum, s) => {
    return sum + (s.topics || []).filter(t => (t.status || (t.done ? 'Bitti' : 'Başlanmadı')) === 'Bitti' || t.status === 'Tamamlandı').length;
  }, 0);
  const completedTopics = totalPoolTopics > 0 ? completedPoolTopics : topicList.filter(t => t.status === 'Tamamlandı' || t.status === 'Bitti').length;
  const totalTopics = totalPoolTopics > 0 ? totalPoolTopics : topicList.length;
  const habitScore = habits.reduce((s, h) => s + Object.values(h.days).filter(Boolean).length, 0);
  const maxHabitScore = habits.length * 7;

  const totalWeeklyItems = weeklyProgram.reduce((s, d) => s + (d.items?.length || 0), 0);
  const completedWeeklyItems = weeklyProgram.reduce((s, d) => s + (d.items?.filter(i => i.done).length || 0), 0);

  const schoolGradesAvg = schoolGrades.length > 0
    ? (schoolGrades.reduce((sum, g) => sum + (parseFloat(g.score) || 0), 0) / schoolGrades.length).toFixed(1)
    : null;

  const TABS = [
    { id: 'ozet', label: '🏠 Özetim' },
    { id: 'soruanaliz', label: '📈 Soru Analizi' },
    { id: 'kisiselbilgiler', label: '👤 Kişisel Bilgiler' },
    { id: 'hedefler', label: '🎯 Hedeflerim & Takip Panosu' },
    { id: 'aliskanlik', label: '🔥 Alışkanlıklarım' },
    { id: 'konumerkezi', label: '🧠 Konu & Program Merkezi' },
    { id: 'calisma', label: '⏱️ Çalışmalarım' },
    { id: 'motivasyon', label: '⭐ Motivasyon' },
    { id: 'yazilinotlari', label: '✍️ Yazılı Notlarım' },
    { id: 'denemeler', label: '📊 Deneme Sonuçlarım' },
    { id: 'testlerim', label: '📝 Testlerim' },
  ];

  // Konu havuzundan ders ve konu listeleri
  const poolSubjectNames = topicPool.map(s => s.name);
  const getPoolTopicsForSubject = (subjectName) => {
    const found = topicPool.find(s => s.name === subjectName);
    return found ? found.topics.map(t => t.name) : [];
  };

  /* ─── GİRİŞ KONTROLÜ ─── */

  if (!currentUser) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontWeight: 700 }}>Giriş yapmanız gerekiyor.</p>
        <button onClick={() => navigate('/login')} style={{ marginTop: 12, padding: '0.6rem 1.4rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>Giriş Yap</button>
      </div>
    );
  }

  const isStandardExam = ['LGS 2026', 'YKS (TYT/AYT) 2026', 'KPSS', 'Ara Sınıf Takip & Takdir Hedefi'].includes(goals.examGoalType);
  const isGradeTracking = goals.examGoalType === 'Ara Sınıf Takip & Takdir Hedefi';
  const displayExamName = isStandardExam ? goals.examGoalType : (goals.customExamName || goals.examGoalType || 'Özel Sınav');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      padding: isMobile ? '0.65rem 0.5rem calc(80px + env(safe-area-inset-bottom)) 0.5rem' : 'clamp(0.75rem,3vw,1.75rem)',
      fontFamily: 'system-ui,-apple-system,sans-serif',
      boxSizing: 'border-box'
    }}>

      {/* ── NATIVE MOBILE APP / DESKTOP HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg,#7c3aed,#6d28d9,#5b21b6)',
        borderRadius: isMobile ? '1rem' : '1.25rem',
        padding: isMobile ? '0.9rem 0.85rem' : '1.25rem 1.5rem',
        marginBottom: isMobile ? '0.75rem' : '1.25rem',
        color: 'white',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: isMobile ? '0.75rem' : '1rem',
        boxShadow: '0 8px 32px rgba(124,58,237,0.3)',
        boxSizing: 'border-box'
      }}>
        {/* Top Student Title & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: isMobile ? 42 : 50,
              height: isMobile ? 42 : 50,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '1.15rem' : '1.4rem',
              fontWeight: 900,
              backdropFilter: 'blur(8px)',
              border: '2px solid rgba(255,255,255,0.3)',
              flexShrink: 0
            }}>
              {currentUser.name?.charAt(0)?.toUpperCase() || '👤'}
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: isMobile ? '0.98rem' : '1.1rem', letterSpacing: '-0.01em' }}>
                Merhaba, {currentUser.name?.split(' ')[0]} 👋
              </div>
              <div style={{ fontSize: isMobile ? '0.7rem' : '0.77rem', opacity: 0.85, fontWeight: 700 }}>
                📂 Koçluk & Gelişim Takip Dosyam
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button 
              onClick={() => setShowReportModal(true)} 
              title="Veli Karnesi (PDF)"
              style={{ 
                background: 'rgba(255, 255, 255, 0.22)', 
                border: '1.5px solid rgba(255,255,255,0.35)', 
                borderRadius: '0.75rem', 
                padding: isMobile ? '0.45rem 0.65rem' : '0.55rem 1.1rem', 
                color: 'white', 
                fontWeight: 900, 
                fontSize: isMobile ? '0.74rem' : '0.83rem', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 5, 
                backdropFilter: 'blur(8px)', 
                boxShadow: '0 4px 14px rgba(79,70,229,0.35)', 
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <FileText size={isMobile ? 14 : 16} /> <span>{isMobile ? 'Veli Karnesi' : 'Veli Karnesi (PDF)'}</span>
            </button>
            {!isMobile && (
              <button
                onClick={handleSave}
                style={{
                  background: saved ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.22)',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  borderRadius: '0.75rem',
                  padding: '0.55rem 1.1rem',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.83rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {saved ? <><CheckCircle2 size={16} /> Kaydedildi!</> : <><Save size={16} /> Kaydet</>}
              </button>
            )}
          </div>
        </div>

        {/* 6 Micro KPI Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, minmax(0, 1fr))' : 'repeat(6, minmax(70px, 1fr))',
          gap: isMobile ? 6 : 8
        }}>
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
              { label: 'Çözülen Soru', value: totalHwQuestions, icon: '📝' },
              { label: 'Test', value: otherHomeworkSubmissions.length, icon: '📋' },
              { label: 'Deneme', value: generalTrialExams.length, icon: '📊' },
              { label: 'Başarı Oranı', value: `%${overallSuccess}`, icon: '🎯' },
              { label: 'Çalışma (s)', value: totalDailyHours.toFixed(1), icon: '⏱️' },
              { label: 'Konu Bitti', value: completedTopics, icon: '✅' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                borderRadius: '0.65rem',
                padding: isMobile ? '0.4rem 0.25rem' : '0.5rem 0.85rem',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)',
                minWidth: 0
              }}>
                <div style={{ fontSize: isMobile ? '0.9rem' : '1.05rem', marginBottom: 1 }}>{s.icon}</div>
                <div style={{ fontWeight: 900, fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: isMobile ? '0.56rem' : '0.62rem', opacity: 0.85, fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* ── TAB BAR (Segmented Swipe Pill on Mobile) ── */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: isMobile ? '1rem' : '1rem 1rem 0 0',
        border: '1.5px solid var(--color-border)',
        borderBottom: isMobile ? '1.5px solid var(--color-border)' : 'none',
        display: 'flex',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        padding: isMobile ? '0.45rem 0.4rem' : '0.4rem 0.4rem 0',
        gap: isMobile ? 5 : 3,
        marginBottom: isMobile ? '0.75rem' : 0,
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        {TABS.map(t => <TabBtn key={t.id} id={t.id} active={activeTab === t.id} label={t.label} onClick={setActiveTab} isMobile={isMobile} />)}
      </div>

      {/* ── CONTENT AREA ── */}
      <div style={{
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        borderRadius: isMobile ? '1rem' : '0 0 1.25rem 1.25rem',
        border: '1.5px solid var(--color-border)',
        borderTop: isMobile ? '1.5px solid var(--color-border)' : 'none',
        padding: isMobile ? '0.85rem 0.65rem' : '1.5rem',
        minHeight: 480,
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        boxSizing: 'border-box'
      }}>

        {/* ═══ PERİYODİK SORU & BAŞARI ANALİZİ ═══ */}
        {activeTab === 'soruanaliz' && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <PeriodicQuestionAnalytics
              homeworkSubmissions={otherHomeworkSubmissions}
              mockExams={generalTrialExams}
              studentName={currentUser?.name || personalInfo?.fullName || 'Öğrenci'}
            />
          </div>
        )}

        {/* ═══ KONU & PROGRAM MERKEZİ (Tek Ekran Akıllı Görünüm) ═══ */}
        {activeTab === 'konumerkezi' && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <ProgramCenter
              weeklyProgram={weeklyProgram}
              setWeeklyProgram={setWeeklyProgram}
              topicPool={topicPool}
              setTopicPool={setTopicPool}
              studentId={studentId}
              targetStudent={targetStudent}
              isDark={isDark}
            />
          </div>
        )}

        {/* ═══ ÖZET ═══ */}
        {activeTab === 'ozet' && (
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--color-text, #0f172a)', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color="#a855f7" /> Bugünkü Durumum
            </div>

            {/* Uzun Vadeli Hedef Vitrini (Özet Sekmesinde Çok Şık Görünüm) */}
            {(() => {
              const hasSetLongTermGoal = isGradeTracking
                ? Boolean(goals.gradeClass || goals.gradeTarget)
                : Boolean(goals.targetSchool || goals.targetScore || goals.targetNet || goals.examGoalType);

              const showLongTermForm = !hasSetLongTermGoal || isEditingLongTermGoal;

              return (
                <div style={{ marginBottom: '1.25rem' }}>
                  <Card emoji="🏛️" title="Uzun Vadeli Hedeflerim & Sınav Planım">
                    {!showLongTermForm ? (
                      /* Hedef Belirlendiğinde Görünen Şık Özet Vitrini */
                      <div style={{ background: 'var(--color-surface-hover, #f8fafc)', borderRadius: '0.85rem', padding: '1.15rem', border: '1.5px solid var(--color-border-input, #cbd5e1)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                              {isGradeTracking ? (goals.gradeTarget === 'Onur' ? '⭐' : goals.gradeTarget === 'Takdir' ? '🏅' : '🧡') : '🏛️'}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {goals.examGoalType || 'Hedef Planı'}
                              </div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                                {isGradeTracking
                                  ? `${goals.gradeClass || 'Sınıf Belirtilmedi'} · ${goals.gradeTerm === 'yıllık' ? 'Yıllık' : `${goals.gradeTerm}. Dönem`} · Hedef: ${goals.gradeTarget || '—'}`
                                  : (goals.targetSchool || 'Hedef Okul / Bölüm Belirtilmedi')
                                }
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setIsEditingLongTermGoal(true)}
                            style={{
                              padding: '0.45rem 0.95rem', borderRadius: '0.65rem', background: 'var(--color-surface, #ffffff)', backdropFilter: 'blur(16px)',
                              border: '1px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #475569)', fontWeight: 800, fontSize: '0.8rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                          >
                            ✏️ Hedefleri Düzenle
                          </button>
                        </div>

                        {!isGradeTracking && (
                          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', paddingTop: '0.65rem', borderTop: '1px dashed var(--color-border-input, #cbd5e1)' }}>
                            {goals.targetScore && (
                              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', color: '#10b981' }}>
                                🏆 Hedef Puan: {goals.targetScore}
                              </div>
                            )}
                            {goals.targetNet && (
                              <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.35)', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', color: '#818cf8' }}>
                                🎯 Hedef Net: {goals.targetNet}
                              </div>
                            )}
                          </div>
                        )}

                        {isGradeTracking && goals.gradeTarget && (
                          <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', padding: '0.55rem 0.85rem', borderRadius: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                            {goals.gradeTarget === 'Takdir' ? 'Tüm derslerden 85 ve üzeri ortalama hedefleniyor 💪' :
                             goals.gradeTarget === 'Teşekkür' ? 'Tüm derslerden 70 ve üzeri ortalama hedefleniyor 💪' :
                             goals.gradeTarget === 'Onur' ? 'Tüm derslerden Takdir belgesi hedefleniyor 🌟' :
                             'Devamsızlık ve ödev takibi hedefleniyor 📚'}
                            {goals.targetScore && ` · Maksimum devamsızlık: ${goals.targetScore} gün`}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Hedef Düzenleme Formu */
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                          <div>
                            <label style={lbl}>Hedef Sınav</label>
                            <select style={inp} value={isStandardExam ? goals.examGoalType : 'Özel Sınav'} onChange={e => {
                              const val = e.target.value;
                              if (val === 'Özel Sınav') {
                                setGoals(p => ({ ...p, examGoalType: 'Özel Sınav', customExamName: p.customExamName || '' }));
                              } else {
                                setGoals(p => ({ ...p, examGoalType: val }));
                              }
                            }}>
                              <option value="LGS 2026">LGS (Liselere Geçiş)</option>
                              <option value="YKS (TYT/AYT) 2026">YKS (TYT / AYT)</option>
                              <option value="KPSS">KPSS</option>
                              <option value="Ara Sınıf Takip & Takdir Hedefi">📊 Ara Sınıf Takip & Takdir Hedefi</option>
                              <option value="Özel Sınav">✏️ Özel Sınav (DGS, ALES, BİLSEM...)</option>
                            </select>
                          </div>

                          {(!isStandardExam || goals.examGoalType === 'Özel Sınav') && (
                            <div>
                              <label style={lbl}>Özel Sınav Adı</label>
                              <input style={{ ...inp, borderColor: '#a855f7', background: 'var(--color-surface-hover)' }}
                                value={goals.customExamName || (goals.examGoalType !== 'Özel Sınav' ? goals.examGoalType : '')}
                                onChange={e => {
                                  const val = e.target.value;
                                  setGoals(p => ({ ...p, customExamName: val, examGoalType: val || 'Özel Sınav' }));
                                }}
                                placeholder="Örn: DGS, BİLSEM, ALES, YÖSDİL, TUS..." />
                            </div>
                          )}

                          {isGradeTracking ? (
                            <>
                              <div>
                                <label style={lbl}>Sınıf / Seviye</label>
                                <select style={inp} value={goals.gradeClass} onChange={e => setGoals(p => ({ ...p, gradeClass: e.target.value }))}>
                                  <option value="">— Seçin —</option>
                                  {['1. Sınıf','2. Sınıf','3. Sınıf','4. Sınıf','5. Sınıf','6. Sınıf','7. Sınıf','8. Sınıf','9. Sınıf','10. Sınıf','11. Sınıf','12. Sınıf'].map(c => <option key={c}>{c}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={lbl}>Dönem</label>
                                <select style={inp} value={goals.gradeTerm} onChange={e => setGoals(p => ({ ...p, gradeTerm: e.target.value }))}>
                                  <option value="1">1. Dönem</option>
                                  <option value="2">2. Dönem</option>
                                  <option value="yıllık">Yıllık</option>
                                </select>
                              </div>
                              <div>
                                <label style={lbl}>Hedef Belgem</label>
                                <select style={{ ...inp, fontWeight: 800 }} value={goals.gradeTarget} onChange={e => setGoals(p => ({ ...p, gradeTarget: e.target.value }))}>
                                  <option value="Takçek">🟢 Takçek (Temel)</option>
                                  <option value="Teşekkür">🧡 Teşekkür (70–84)</option>
                                  <option value="Takdir">🏅 Takdir (85+)</option>
                                  <option value="Onur">⭐ Onur Belgesi (Tüm dersler Takdir)</option>
                                </select>
                              </div>
                              <div>
                                <label style={lbl}>Devamsızlık Hedefi</label>
                                <input style={inp} value={goals.targetScore} onChange={e => setGoals(p => ({ ...p, targetScore: e.target.value }))} placeholder="Maks. devamsızlık (gün)" />
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <label style={lbl}>Hedef Okul / Bölüm</label>
                                <input style={inp} value={goals.targetSchool} onChange={e => setGoals(p => ({ ...p, targetSchool: e.target.value }))} placeholder="Örn: Kabataş Erkek Lisesi" />
                              </div>
                              <div>
                                <label style={lbl}>Puan Hedefim</label>
                                <input style={inp} value={goals.targetScore} onChange={e => setGoals(p => ({ ...p, targetScore: e.target.value }))} placeholder="Örn: 485" />
                              </div>
                              <div>
                                <label style={lbl}>Net Hedefim</label>
                                <input style={inp} value={goals.targetNet} onChange={e => setGoals(p => ({ ...p, targetNet: e.target.value }))} placeholder="Örn: 90" />
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
                              background: '#6366f1', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.85rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                              boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)'
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

            {/* ─── Çözülen Testler & Soru Başarı Karnesi (Şık Hero Kartı) ─── */}
            {(() => {
              const hwList = otherHomeworkSubmissions || [];
              const totalTests = hwList.length;
              const totalD = hwList.reduce((a, b) => a + (b.correctCount || 0), 0);
              const totalY = hwList.reduce((a, b) => a + (b.wrongCount || 0), 0);
              const totalB = hwList.reduce((a, b) => a + (b.emptyCount || 0), 0);
              const totalQ = totalD + totalY + totalB;
              const successRate = totalQ > 0 ? Math.round((totalD / totalQ) * 100) : 0;

              // Ders Bazlı Dağılım
              const subjMap = {};
              hwList.forEach(s => {
                const subj = s.subject || 'Genel';
                if (!subjMap[subj]) subjMap[subj] = { d: 0, y: 0, b: 0, count: 0 };
                subjMap[subj].d += (s.correctCount || 0);
                subjMap[subj].y += (s.wrongCount || 0);
                subjMap[subj].b += (s.emptyCount || 0);
                subjMap[subj].count += 1;
              });
              const topSubjs = Object.entries(subjMap).sort((a, b) => (b[1].d + b[1].y + b[1].b) - (a[1].d + a[1].y + a[1].b)).slice(0, 5);

              const rateColor = successRate >= 70 ? '#10b981' : successRate >= 50 ? '#f59e0b' : '#ef4444';
              const rateBg = successRate >= 70 ? 'rgba(16, 185, 129, 0.12)' : successRate >= 50 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)';
              const rateBorder = successRate >= 70 ? 'rgba(16, 185, 129, 0.35)' : successRate >= 50 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)';

              return (
                <div style={{
                  background: 'var(--color-surface, #ffffff)',
                  borderRadius: '1.25rem',
                  border: '1.5px solid var(--color-border, #e2e8f0)',
                  padding: '1.25rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                  marginBottom: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Arka plan süs efekti */}
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

                  {/* Başlık ve Hızlı Geçiş Butonu */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--color-border, #f1f5f9)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.1rem', boxShadow: '0 4px 10px rgba(79,70,229,0.25)' }}>
                        🎯
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.98rem', color: 'var(--color-text, #0f172a)' }}>
                          Soru & Test Çözme Performansım
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600 }}>
                          Sistemde çözülen tüm ödev ve konu testlerinin anlık karnesi
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setActiveTab('soruanaliz')}
                        style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          borderRadius: '0.65rem',
                          padding: '0.35rem 0.8rem',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>📈 Günlük/Haftalık Analiz</span>
                        <span>→</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('testlerim')}
                        style={{
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#818cf8',
                          border: '1px solid rgba(165, 180, 252, 0.35)',
                          borderRadius: '0.65rem',
                          padding: '0.35rem 0.8rem',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>Testlerimi İncele</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>

                  {/* 4'lü İstatistik Kartları Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                    
                    {/* 1. Çözülen Test */}
                    <div style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.35)', borderRadius: '0.9rem', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Çözülen Test</span>
                        <span style={{ fontSize: '1.1rem' }}>📝</span>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#93c5fd', lineHeight: 1 }}>{totalTests}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#60a5fa', marginTop: 3 }}>Ödev & Konu Testi</div>
                      </div>
                    </div>

                    {/* 2. Toplam Soru */}
                    <div style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: '0.9rem', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Toplam Soru</span>
                        <span style={{ fontSize: '1.1rem' }}>✏️</span>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#d8b4fe', lineHeight: 1 }}>{totalQ}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#c084fc', marginTop: 3 }}>Çözülen Soru Hacmi</div>
                      </div>
                    </div>

                    {/* 3. Başarı Durumu */}
                    <div style={{ background: rateBg, border: `1px solid ${rateBorder}`, borderRadius: '0.9rem', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: rateColor, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Başarı Durumu</span>
                        <span style={{ fontSize: '1.1rem' }}>🏆</span>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: '1.65rem', fontWeight: 900, color: rateColor, lineHeight: 1 }}>%{successRate}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: rateColor, marginTop: 3 }}>
                          {successRate >= 70 ? 'Harika Başarı 🌟' : successRate >= 50 ? 'İyi Seviyede 👍' : 'Geliştirilmeli 🎯'}
                        </div>
                      </div>
                    </div>

                    {/* 4. D / Y / B Dağılımı */}
                    <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '0.9rem', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted, #475569)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cevap Dağılımı</span>
                        <span style={{ fontSize: '1.1rem' }}>📊</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800 }}>
                          <span style={{ color: '#10b981' }}>✅ Doğru</span>
                          <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '1px 6px', borderRadius: 4 }}>{totalD}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800 }}>
                          <span style={{ color: '#ef4444' }}>❌ Yanlış</span>
                          <span style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '1px 6px', borderRadius: 4 }}>{totalY}</span>
                        </div>
                        {totalB > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800 }}>
                            <span style={{ color: 'var(--color-text-muted, #94a3b8)' }}>⭕ Boş</span>
                            <span style={{ color: 'var(--color-text-muted, #64748b)', background: 'var(--color-surface, #e2e8f0)', padding: '1px 6px', borderRadius: 4 }}>{totalB}</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Ders Bazlı Mini Başarı Şeridi */}
                  {topSubjs.length > 0 && (
                    <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--color-border, #e2e8f0)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginRight: 4 }}>
                        📚 En Çok Çözülen Dersler:
                      </span>
                      {topSubjs.map(([sName, stat], idx) => {
                        const sTotalQ = stat.d + stat.y + stat.b;
                        const sRate = sTotalQ > 0 ? Math.round((stat.d / sTotalQ) * 100) : 0;
                        return (
                          <div
                            key={`${sName}_${idx}`}
                            style={{
                              background: 'var(--color-surface, white)',
                              border: '1px solid var(--color-border-input, #cbd5e1)',
                              borderRadius: '0.5rem',
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: 'var(--color-text, #1e293b)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                          >
                            <span>{sName}</span>
                            <span style={{ color: '#818cf8', fontWeight: 800 }}>{sTotalQ} Soru</span>
                            <span style={{ color: sRate >= 70 ? '#10b981' : sRate >= 50 ? '#f59e0b' : '#ef4444', background: sRate >= 70 ? 'rgba(16,185,129,0.15)' : sRate >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', padding: '1px 5px', borderRadius: 4, fontWeight: 900, fontSize: '0.68rem' }}>
                              %{sRate}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* İlerleme kartları */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
              {[
                { label: 'Aylık Hedefler', value: completedMonthly, max: (goals.monthlyGoals || []).length, color: '#3b82f6', icon: '📅' },
                { label: 'Haftalık Program', value: completedWeeklyItems, max: totalWeeklyItems, color: '#10b981', icon: '⚡' },
                { label: 'Günlük Rutinler', value: completedDaily, max: totalDaily, color: '#ef4444', icon: '🔥' },
                { label: 'Konular Tamamlandı', value: completedTopics, max: totalTopics, color: '#a855f7', icon: '✅' },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--color-surface, #ffffff)', borderRadius: '0.85rem', padding: '0.85rem', border: '1px solid var(--color-border, #e2e8f0)' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontWeight: 900, fontSize: '1.3rem', color: item.color }}>{item.value}<span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 700 }}>/{item.max || '—'}</span></div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>{item.label}</div>
                  {item.max > 0 && <Progress value={item.value} max={item.max} color={item.color} />}
                </div>
              ))}
            </div>

            {/* Son çalışma günlükleri */}
            {dailyLogs.length > 0 && (
              <Card emoji="⏱️" title="Son Çalışmalarım">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {dailyLogs.slice(0, 5).map(log => (
                    <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.85rem', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: '0.65rem', fontSize: '0.82rem', border: '1px solid var(--color-border, #e2e8f0)' }}>
                      <span style={{ color: 'var(--color-text-muted, #64748b)', fontWeight: 700, minWidth: 80 }}>{log.date}</span>
                      <span style={{ fontWeight: 900, color: '#818cf8' }}>{log.studyHours}s</span>
                      <span style={{ color: 'var(--color-text, #374151)', fontWeight: 700 }}>{log.questions} soru</span>
                      {log.sport && <span>🏃</span>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Son deneme */}
            {mySubmissions.length > 0 && (
              <div style={{ background: 'rgba(14, 165, 233, 0.12)', border: '1.5px solid rgba(14, 165, 233, 0.35)', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
                <div style={{ fontWeight: 900, fontSize: '0.88rem', color: 'var(--color-text, #0c4a6e)', marginBottom: 6 }}>📊 Son Deneme: {mySubmissions[0].testTitle || '—'}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ background: '#0891b2', color: 'white', fontWeight: 900, fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderRadius: 99 }}>Net: {mySubmissions[0].score ?? '—'}</span>
                  <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.82rem' }}>✅ {mySubmissions[0].correctCount ?? '—'} D</span>
                  <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.82rem' }}>❌ {mySubmissions[0].wrongCount ?? '—'} Y</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ KİŞİSEL BİLGİLER & ÖĞRENCİ PROFİLİ ═══ */}
        {activeTab === 'kisiselbilgiler' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Tip>
              👤 <b>Kişisel Bilgiler & Öğrenci Profili</b>: Öğrencinin öğrenme stili, veli iletişim bilgileri, hedef ve koç değerlendirmeleri tek bir yerde düzenlenir ve kaydedilir.
            </Tip>

            {/* 1. Temel Öğrenci & Okul Bilgileri */}
            <Card emoji="👤" title="Temel Öğrenci & Okul Bilgileri">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={lbl}>Ad Soyad</label>
                  <input style={inp} value={personalInfo.fullName || ''} onChange={e => setPersonalInfo(p => ({ ...p, fullName: e.target.value }))} placeholder="Öğrencinin Adı Soyadı" />
                </div>
                <div>
                  <label style={lbl}>Doğum Tarihi</label>
                  <input type="date" style={inp} value={personalInfo.birthDate || ''} onChange={e => setPersonalInfo(p => ({ ...p, birthDate: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Cinsiyet</label>
                  <select style={inp} value={personalInfo.gender || ''} onChange={e => setPersonalInfo(p => ({ ...p, gender: e.target.value }))}>
                    <option value="">— Seçin —</option>
                    <option value="Erkek">Erkek</option>
                    <option value="Kız">Kız</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Sınıf / Seviye</label>
                  <select style={inp} value={personalInfo.gradeClass || goals.gradeClass || ''} onChange={e => {
                    const val = e.target.value;
                    setPersonalInfo(p => ({ ...p, gradeClass: val }));
                    setGoals(g => ({ ...g, gradeClass: val }));
                  }}>
                    <option value="">— Seçin —</option>
                    {['1. Sınıf','2. Sınıf','3. Sınıf','4. Sınıf','5. Sınıf','6. Sınıf','7. Sınıf','8. Sınıf','9. Sınıf','10. Sınıf','11. Sınıf','12. Sınıf','Mezun'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Okul Adı</label>
                  <input style={inp} value={personalInfo.schoolName || ''} onChange={e => setPersonalInfo(p => ({ ...p, schoolName: e.target.value }))} placeholder="Devam ettiği okul..." />
                </div>
                <div>
                  <label style={lbl}>Alan / Branş</label>
                  <select style={inp} value={personalInfo.fieldBranch || 'Sayısal'} onChange={e => setPersonalInfo(p => ({ ...p, fieldBranch: e.target.value }))}>
                    <option value="Ortaokul / LGS">Ortaokul / LGS</option>
                    <option value="Sayısal">Sayısal (MF)</option>
                    <option value="Eşit Ağırlık">Eşit Ağırlık (TM)</option>
                    <option value="Sözel">Sözel (TS)</option>
                    <option value="Dil">Yabancı Dil (YDT)</option>
                    <option value="Genel">Genel Takip</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* 2. İletişim & Veli Bilgileri */}
            <Card emoji="📞" title="İletişim & Veli Bilgileri">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={lbl}>Öğrenci Telefonu</label>
                  <input style={inp} value={personalInfo.studentPhone || ''} onChange={e => setPersonalInfo(p => ({ ...p, studentPhone: e.target.value }))} placeholder="05xx xxx xx xx" />
                </div>
                <div>
                  <label style={lbl}>Veli Adı Soyadı</label>
                  <input style={inp} value={personalInfo.parentName || ''} onChange={e => setPersonalInfo(p => ({ ...p, parentName: e.target.value }))} placeholder="Velinin Adı Soyadı" />
                </div>
                <div>
                  <label style={lbl}>Yakınlık Derecesi</label>
                  <select style={inp} value={personalInfo.parentRelation || 'Anne'} onChange={e => setPersonalInfo(p => ({ ...p, parentRelation: e.target.value }))}>
                    <option value="Anne">Anne</option>
                    <option value="Baba">Baba</option>
                    <option value="Vasi / Yakını">Vasi / Yakını</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Veli Telefonu</label>
                  <input style={inp} value={personalInfo.parentPhone || ''} onChange={e => setPersonalInfo(p => ({ ...p, parentPhone: e.target.value }))} placeholder="05xx xxx xx xx" />
                </div>
                <div>
                  <label style={lbl}>Veli Mesleği</label>
                  <input style={inp} value={personalInfo.parentJob || ''} onChange={e => setPersonalInfo(p => ({ ...p, parentJob: e.target.value }))} placeholder="Velinin mesleği..." />
                </div>
                <div>
                  <label style={lbl}>Şehir / Adres</label>
                  <input style={inp} value={personalInfo.cityAddress || ''} onChange={e => setPersonalInfo(p => ({ ...p, cityAddress: e.target.value }))} placeholder="İl, İlçe / İkamet adresi..." />
                </div>
              </div>
            </Card>

            {/* 3. Öğrenme Stili & Çalışma Profil Analizi */}
            <Card emoji="🧠" title="Öğrenme Stili & Çalışma Profili">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={lbl}>Baskın Öğrenme Stili</label>
                  <select style={{ ...inp, fontWeight: 800 }} value={personalInfo.learningStyle || 'Görsel'} onChange={e => setPersonalInfo(p => ({ ...p, learningStyle: e.target.value }))}>
                    <option value="Görsel">👁️ Görsel (Grafik, Renk, Harita, Okuma)</option>
                    <option value="İşitsel">🎧 İşitsel (Dinleme, Anlatma, Tartışma)</option>
                    <option value="Kinestetik">🤸 Kinestetik (Yaparak-Yaşayarak, Dokunsal)</option>
                    <option value="Karma">🌀 Karma (Çoklu Öğrenme)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Günlük Ortalama Uyku Süresi</label>
                  <select style={inp} value={personalInfo.sleepHours || '8'} onChange={e => setPersonalInfo(p => ({ ...p, sleepHours: e.target.value }))}>
                    <option value="6">6 Saat veya daha az</option>
                    <option value="7">7 Saat</option>
                    <option value="8">8 Saat (İdeal)</option>
                    <option value="9">9 Saat</option>
                    <option value="10">10 Saat veya daha fazla</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>En Verimli Çalışma Zamanı</label>
                  <select style={inp} value={personalInfo.bestStudyTime || 'Sabah'} onChange={e => setPersonalInfo(p => ({ ...p, bestStudyTime: e.target.value }))}>
                    <option value="Sabah">🌅 Erken Sabah (06:00 - 10:00)</option>
                    <option value="Öğle">☀️ Gün Ortası (10:00 - 15:00)</option>
                    <option value="Akşam">🌆 Okul Sonrası / Akşam (16:00 - 21:00)</option>
                    <option value="Gece">🌙 Gece Çalışması (21:00 sonrası)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Sevdiği / Başarılı Dersler</label>
                  <input style={inp} value={personalInfo.strongSubjects || ''} onChange={e => setPersonalInfo(p => ({ ...p, strongSubjects: e.target.value }))} placeholder="Örn: Matematik, Fen..." />
                </div>
                <div>
                  <label style={lbl}>Zorlandığı / Destek İsteyen Dersler</label>
                  <input style={inp} value={personalInfo.weakSubjects || ''} onChange={e => setPersonalInfo(p => ({ ...p, weakSubjects: e.target.value }))} placeholder="Örn: Paragraf, Fizik..." />
                </div>
                <div>
                  <label style={lbl}>Hobiler & İlgi Alanları</label>
                  <input style={inp} value={personalInfo.hobbies || ''} onChange={e => setPersonalInfo(p => ({ ...p, hobbies: e.target.value }))} placeholder="Örn: Basketbol, Satranç, Bağlama..." />
                </div>
              </div>

              {/* Ders Çalışırken Yaşadığı Zorluklar Checkbox Grid */}
              <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--color-border, #e2e8f0)' }}>
                <label style={{ ...lbl, marginBottom: '0.5rem' }}>Ders Çalışırken Karşılaşılan Başlıca Zorluklar (Çoklu Seçim):</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    'Dikkat Dağınıklığı / Odaklanma',
                    'Zaman Yönetimi / Planlama',
                    'Sınav Kaygısı / Stres',
                    'Motivasyon Eksikliği / Erteleme',
                    'Hızlı Soru Çözememe',
                    'Ezber Yapma Zorluğu',
                    'Telefon / Ekran Bağımlılığı'
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
                          border: isSelected ? '1.5px solid #a855f7' : '1px solid var(--color-border-input, #cbd5e1)',
                          background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'var(--color-surface-hover, #f8fafc)',
                          color: isSelected ? '#c084fc' : 'var(--color-text-muted, #475569)', cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}{challenge}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* 4. Koç Değerlendirme & Özel Notlar */}
            <Card emoji="📝" title="Koç Öğretmen Değerlendirme & Özel Notlar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={lbl}>Sağlık Durumu / Alerji / Özel Durumlar</label>
                  <input style={inp} value={personalInfo.healthNotes || ''} onChange={e => setPersonalInfo(p => ({ ...p, healthNotes: e.target.value }))} placeholder="Alerji, göz bozukluğu, düzenli ilaç kullanımı vb." />
                </div>
                <div>
                  <label style={lbl}>Koç Öğretmenin Özel Değerlendirme & Gözlem Notu</label>
                  <textarea
                    rows={3}
                    style={{ ...inp, height: 'auto', resize: 'vertical' }}
                    value={personalInfo.coachNotes || ''}
                    onChange={e => setPersonalInfo(p => ({ ...p, coachNotes: e.target.value }))}
                    placeholder="Koç öğretmenin öğrencinin genel gelişim süreci, karakter özellikleri ve rehberlik takibi hakkındaki özel notları..."
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
                <Save size={18} /> Kişisel Bilgileri Kaydet
              </button>
            </div>
          </div>
        )}

        {/* ═══ HEDEFLERİM & TAKİP PANOSU ═══ */}
        {activeTab === 'hedefler' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.85rem' : '1.25rem', animation: 'fadeIn 0.2s ease' }}>
            
            {/* 1. ÜST HERO HEDEF KARTI */}
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 75%, #6d28d9 100%)',
              borderRadius: isMobile ? 16 : 20,
              padding: isMobile ? '0.95rem 0.85rem' : '1.25rem 1.5rem',
              color: 'white',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
              justifyContent: 'space-between',
              gap: isMobile ? 10 : 14,
              boxShadow: '0 8px 24px rgba(49,46,129,0.22)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14 }}>
                  <div style={{
                    width: isMobile ? 40 : 48,
                    height: isMobile ? 40 : 48,
                    borderRadius: isMobile ? 12 : 16,
                    background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '1.25rem' : '1.5rem',
                    flexShrink: 0
                  }}>
                    {isGradeTracking ? (goals.gradeTarget === 'Onur' ? '⭐' : goals.gradeTarget === 'Takdir' ? '🏅' : '🎓') : '🏛️'}
                  </div>
                  <div>
                    <div style={{ fontSize: isMobile ? '0.65rem' : '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {goals.examGoalType || 'Hedef Planı'}
                    </div>
                    <div style={{ fontSize: isMobile ? '1.05rem' : '1.25rem', fontWeight: 900, color: 'white', marginTop: 1, lineHeight: 1.2 }}>
                      {isGradeTracking
                        ? `${goals.gradeClass || 'Sınıf Belirtilmedi'} · ${goals.gradeTerm === 'yıllık' ? 'Yıllık' : `${goals.gradeTerm}. Dönem`} · Hedef: ${goals.gradeTarget || 'Takdir'}`
                        : (goals.targetSchool || 'Hedef Okul / Bölüm Belirtilmedi')
                      }
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingLongTermGoal(prev => !prev)}
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.35)',
                    borderRadius: 10,
                    padding: isMobile ? '0.4rem 0.65rem' : '0.55rem 1.1rem',
                    fontWeight: 900,
                    fontSize: isMobile ? '0.74rem' : '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  ✏️ {isEditingLongTermGoal ? 'Kapat' : isMobile ? 'Düzenle' : 'Hedefleri Düzenle'}
                </button>
              </div>

              {(goals.targetScore || goals.targetNet) && !isGradeTracking && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: isMobile ? 2 : 0 }}>
                  {goals.targetScore && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 800 }}>🏆 Hedef: {goals.targetScore} Puan</span>}
                  {goals.targetNet && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 800 }}>🎯 Hedef: {goals.targetNet} Net</span>}
                </div>
              )}
            </div>

            {/* Form if editing long term goal */}
            {isEditingLongTermGoal && (
              <div style={{ background: 'var(--color-surface, white)', borderRadius: isMobile ? 16 : 20, padding: isMobile ? '0.95rem 0.85rem' : '1.25rem', border: '1.5px solid var(--color-border-input, #cbd5e1)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', boxSizing: 'border-box' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: 3 }}>Hedef Sınav</label>
                    <select style={{ width: '100%', padding: '0.55rem', borderRadius: 8, border: '1.5px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.82rem' }} value={goals.examGoalType} onChange={e => setGoals(p => ({ ...p, examGoalType: e.target.value }))}>
                      <option value="LGS 2026">LGS (Liselere Geçiş)</option>
                      <option value="YKS (TYT/AYT) 2026">YKS (TYT / AYT)</option>
                      <option value="KPSS">KPSS</option>
                      <option value="Ara Sınıf Takip & Takdir Hedefi">📊 Ara Sınıf Takip & Takdir Hedefi</option>
                      <option value="Özel Sınav">✏️ Özel Sınav</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: 3 }}>Hedef Okul / Bölüm</label>
                    <input type="text" style={{ width: '100%', padding: '0.55rem', borderRadius: 8, border: '1.5px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.82rem', boxSizing: 'border-box' }} value={goals.targetSchool || ''} onChange={e => setGoals(p => ({ ...p, targetSchool: e.target.value }))} placeholder="Örn: Fen Lisesi / Tıp" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: 3 }}>Hedef Puan</label>
                    <input type="text" style={{ width: '100%', padding: '0.55rem', borderRadius: 8, border: '1.5px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.82rem', boxSizing: 'border-box' }} value={goals.targetScore || ''} onChange={e => setGoals(p => ({ ...p, targetScore: e.target.value }))} placeholder="Örn: 480" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: 3 }}>Hedef Net</label>
                    <input type="text" style={{ width: '100%', padding: '0.55rem', borderRadius: 8, border: '1.5px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.82rem', boxSizing: 'border-box' }} value={goals.targetNet || ''} onChange={e => setGoals(p => ({ ...p, targetNet: e.target.value }))} placeholder="Örn: 85 Net" />
                  </div>
                </div>
                <div style={{ marginTop: '0.85rem', textAlign: 'right' }}>
                  <button type="button" onClick={() => setIsEditingLongTermGoal(false)} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem 1.2rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>
                    Tamamlandı
                  </button>
                </div>
              </div>
            )}

            {/* 2. SADE VE ŞIK İSTATİSTİK ROZETLERİ (4 KPI Cards - 2x2 on Mobile) */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: isMobile ? 6 : '0.85rem' }}>
              {/* Günlük */}
              {(() => {
                const dDone = (goals.dailyGoals || []).filter(g => g.done).length;
                const dTotal = (goals.dailyGoals || []).length;
                const dPct = dTotal > 0 ? Math.round((dDone / dTotal) * 100) : 0;
                return (
                  <div style={{ background: 'rgba(245, 158, 11, 0.12)', borderRadius: isMobile ? 12 : 16, padding: isMobile ? '0.75rem 0.65rem' : '1rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <div style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase' }}>☀️ GÜNLÜK</div>
                    <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 900, color: '#fbbf24', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{dDone}/{dTotal}</span>
                      <span style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', background: 'rgba(245, 158, 11, 0.2)', padding: '0.12rem 0.45rem', borderRadius: 6 }}>%{dPct}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Haftalık */}
              {(() => {
                const wDone = (goals.weeklyGoals || []).filter(g => g.done).length;
                const wTotal = (goals.weeklyGoals || []).length;
                const wPct = wTotal > 0 ? Math.round((wDone / wTotal) * 100) : 0;
                return (
                  <div style={{ background: 'rgba(124, 58, 237, 0.12)', borderRadius: isMobile ? 12 : 16, padding: isMobile ? '0.75rem 0.65rem' : '1rem', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
                    <div style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', color: '#c084fc', fontWeight: 800, textTransform: 'uppercase' }}>⚡ HAFTALIK</div>
                    <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 900, color: '#d8b4fe', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{wDone}/{wTotal}</span>
                      <span style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', background: 'rgba(124, 58, 237, 0.2)', padding: '0.12rem 0.45rem', borderRadius: 6 }}>%{wPct}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Aylık */}
              {(() => {
                const mDone = (goals.monthlyGoals || []).filter(g => g.done).length;
                const mTotal = (goals.monthlyGoals || []).length;
                const mPct = mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0;
                return (
                  <div style={{ background: 'rgba(59, 130, 246, 0.12)', borderRadius: isMobile ? 12 : 16, padding: isMobile ? '0.75rem 0.65rem' : '1rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <div style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', color: '#60a5fa', fontWeight: 800, textTransform: 'uppercase' }}>📅 AYLIK</div>
                    <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 900, color: '#93c5fd', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{mDone}/{mTotal}</span>
                      <span style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', background: 'rgba(59, 130, 246, 0.2)', padding: '0.12rem 0.45rem', borderRadius: 6 }}>%{mPct}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Sayısal Sayaçlar */}
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', borderRadius: isMobile ? 12 : 16, padding: isMobile ? '0.75rem 0.65rem' : '1rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', color: '#34d399', fontWeight: 800, textTransform: 'uppercase' }}>📊 SAYAÇLAR</div>
                <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 900, color: '#10b981', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{(goals.counterGoals || []).length} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Adet</span></span>
                  <span style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', background: 'rgba(16, 185, 129, 0.2)', padding: '0.12rem 0.45rem', borderRadius: 6 }}>Aktif</span>
                </div>
              </div>
            </div>

            {/* 3. TEK HEDEF & TAKİP PANOSU */}
            <div style={{
              background: 'var(--color-surface, white)',
              borderRadius: isMobile ? 16 : 24,
              padding: isMobile ? '0.95rem 0.75rem' : '1.5rem',
              border: '1.5px solid var(--color-border, #e2e8f0)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? '0.85rem' : '1.25rem',
              boxSizing: 'border-box'
            }}>
              <div style={{ borderBottom: '1px solid var(--color-border, #f1f5f9)', paddingBottom: isMobile ? '0.75rem' : '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isMobile ? '0.65rem' : '0.85rem' }}>
                  <div style={{ width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, borderRadius: 12, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '1.1rem' : '1.3rem', flexShrink: 0 }}>
                    🎯
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: isMobile ? '0.98rem' : '1.1rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>Hedef Listesi & Canlı Takip Panosu</h3>
                    <div style={{ fontSize: isMobile ? '0.72rem' : '0.78rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>Görev ve sayısal hedeflerinizi canlı takip edin.</div>
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
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isMobile ? '0.65rem' : '0.85rem',
                    background: 'var(--color-surface-hover, #f8fafc)',
                    padding: isMobile ? '0.75rem 0.65rem' : '1rem',
                    borderRadius: isMobile ? 12 : 16,
                    border: '1.5px solid var(--color-border-input, #cbd5e1)',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '0.65rem' }}>
                    {/* Periyot Seçimi */}
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: isMobile ? 2 : 0 }} className="hide-scrollbar">
                      <span style={{ fontSize: isMobile ? '0.72rem' : '0.78rem', fontWeight: 800, color: 'var(--color-text-muted, #475569)', marginRight: 2, whiteSpace: 'nowrap' }}>Periyot:</span>
                      {['Günlük', 'Haftalık', 'Aylık', 'Özel'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewGoalType(t)}
                          style={{
                            padding: isMobile ? '0.3rem 0.55rem' : '0.32rem 0.65rem',
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: isMobile ? '0.72rem' : '0.75rem',
                            cursor: 'pointer',
                            background: newGoalType === t ? (t === 'Günlük' ? '#f59e0b' : t === 'Haftalık' ? '#7c3aed' : t === 'Aylık' ? '#2563eb' : '#059669') : 'var(--color-surface, white)',
                            color: newGoalType === t ? 'white' : 'var(--color-text-muted, #64748b)',
                            border: newGoalType === t ? 'none' : '1px solid var(--color-border-input, #cbd5e1)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                        >
                          {t === 'Günlük' ? '☀️ Günlük' : t === 'Haftalık' ? '⚡ Haftalık' : t === 'Aylık' ? '📅 Aylık' : '⭐ Özel'}
                        </button>
                      ))}
                    </div>

                    {/* Hedef Tipi Seçimi (Segmented Pill) */}
                    <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface, #e2e8f0)', padding: 3, borderRadius: 10, border: '1px solid var(--color-border)', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
                      <button
                        type="button"
                        onClick={() => setAddKind('gorev')}
                        style={{
                          flex: isMobile ? 1 : 'none',
                          padding: isMobile ? '0.35rem 0.5rem' : '0.3rem 0.75rem',
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: isMobile ? '0.72rem' : '0.75rem',
                          border: 'none',
                          cursor: 'pointer',
                          background: addKind === 'gorev' ? '#7c3aed' : 'transparent',
                          color: addKind === 'gorev' ? 'white' : 'var(--color-text-muted, #475569)',
                          transition: 'all 0.15s'
                        }}
                      >
                        📝 Görev Ekle
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddKind('sayisal')}
                        style={{
                          flex: isMobile ? 1 : 'none',
                          padding: isMobile ? '0.35rem 0.5rem' : '0.3rem 0.75rem',
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: isMobile ? '0.72rem' : '0.75rem',
                          border: 'none',
                          cursor: 'pointer',
                          background: addKind === 'sayisal' ? '#4f46e5' : 'transparent',
                          color: addKind === 'sayisal' ? 'white' : 'var(--color-text-muted, #475569)',
                          transition: 'all 0.15s'
                        }}
                      >
                        📊 Sayısal Sayaç Ekle
                      </button>
                    </div>
                  </div>

                  {/* Dinamik İçerik Alanı */}
                  {addKind === 'gorev' ? (
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.55rem', alignItems: isMobile ? 'stretch' : 'center' }}>
                      {newGoalType === 'Özel' && (
                        <input
                          type="text"
                          placeholder="Kategori..."
                          value={newGoalCategory}
                          onChange={e => setNewGoalCategory(e.target.value)}
                          style={{ width: isMobile ? '100%' : 120, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 700, boxSizing: 'border-box' }}
                        />
                      )}
                      <input
                        type="text"
                        placeholder={`${newGoalType} hedefinizi yazın (ör: Fizik 2. Ünite Testlerini Bitir)...`}
                        value={newGoalText}
                        onChange={e => setNewGoalText(e.target.value)}
                        style={{ flex: 1, minWidth: isMobile ? '100%' : 220, padding: '0.5rem 0.85rem', borderRadius: 8, border: '1.5px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 700, boxSizing: 'border-box' }}
                      />
                      <button
                        type="submit"
                        style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, padding: isMobile ? '0.55rem 1rem' : '0.5rem 1.25rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                      >
                        <Plus size={15} /> Hedef Ekle
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.55rem', alignItems: 'end' }}>
                      <div style={{ gridColumn: isMobile ? 'span 2' : 'auto' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: 2 }}>Sayaç Adı</label>
                        <input type="text" placeholder="ör: Paragraf Sorusu" value={newCounterTitle} onChange={e => setNewCounterTitle(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 8, border: '1.5px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 700, boxSizing: 'border-box' }} required />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: 2 }}>Hedef Miktarı</label>
                        <input type="number" min="1" placeholder="ör: 200" value={newCounterTarget} onChange={e => setNewCounterTarget(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 8, border: '1.5px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 700, boxSizing: 'border-box' }} required />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: 2 }}>Birim</label>
                        <select value={newCounterUnit} onChange={e => setNewCounterUnit(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 8, border: '1.5px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 700, boxSizing: 'border-box' }}>
                          <option value="Soru">Soru</option>
                          <option value="Sayfa">Sayfa</option>
                          <option value="Saat">Saat</option>
                          <option value="Net">Net</option>
                          <option value="Adet">Adet</option>
                        </select>
                      </div>
                      <button type="submit" style={{ gridColumn: isMobile ? 'span 2' : 'auto', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, padding: '0.55rem 1rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: isMobile ? 4 : 0 }}>
                        <Plus size={15} /> Sayaç Ekle
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* PERİYOTLARA GÖRE LİSTE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.85rem' : '1.25rem' }}>

                {/* ☀️ GÜNLÜK HEDEFLERİM */}
                {(() => {
                  const dTasks = goals.dailyGoals || [];
                  const dCounters = (goals.counterGoals || []).filter(c => c.period === 'Günlük');
                  const dCount = dTasks.length + dCounters.length;
                  return (
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: isMobile ? 14 : 18, padding: isMobile ? '0.85rem 0.75rem' : '1.15rem', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: '#f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>☀️ Günlük Hedeflerim ({dTasks.filter(g=>g.done).length + dCounters.filter(c=>(c.current||0)>=(c.target||1)).length}/{dCount})</span>
                      </div>

                      {dCount === 0 ? (
                        <div style={{ color: '#d97706', fontSize: '0.78rem', fontWeight: 600, textAlign: 'center', padding: '0.4rem' }}>Henüz günlük hedef veya sayaç eklenmedi.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {/* Sayısal Sayaçlar (Ultra Modern Tasarım) */}
                          {dCounters.map(cg => {
                            const current = cg.current || 0;
                            const target = cg.target || 100;
                            const pct = Math.min(100, Math.round((current / target) * 100));
                            const isCompleted = current >= target;
                            const unitName = (cg.unit || 'Soru').trim();
                            const icon = unitName.toLowerCase().includes('soru') ? '🎯'
                                       : unitName.toLowerCase().includes('sayfa') ? '📚'
                                       : unitName.toLowerCase().includes('saat') ? '⏱️'
                                       : unitName.toLowerCase().includes('net') ? '📈' : '⚡';

                            return (
                              <div
                                key={cg.id}
                                style={{
                                  background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface, #ffffff)',
                                  borderRadius: isMobile ? 12 : 16,
                                  padding: isMobile ? '0.75rem 0.8rem' : '0.9rem 1.1rem',
                                  border: isCompleted ? '1.5px solid #10b981' : '1px solid rgba(245, 158, 11, 0.35)',
                                  boxShadow: isCompleted ? '0 4px 16px rgba(16,185,129,0.12)' : '0 4px 14px rgba(0,0,0,0.04)',
                                  display: 'flex', flexDirection: 'column', gap: '0.55rem',
                                  boxSizing: 'border-box'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                    <div style={{ width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: 8, background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: isCompleted ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '0.9rem' : '1rem', flexShrink: 0 }}>
                                      {icon}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: isMobile ? '0.84rem' : '0.9rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cg.title}</span>
                                        {isCompleted && (
                                          <span style={{ fontSize: '0.62rem', background: '#10b981', color: 'white', padding: '0.08rem 0.4rem', borderRadius: 99, fontWeight: 900 }}>✓ Tamam</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: isMobile ? '0.68rem' : '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>☀️ Günlük · {unitName}</div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: isMobile ? '0.92rem' : '1.05rem', fontWeight: 900, color: isCompleted ? '#10b981' : 'var(--color-text, #1e293b)' }}>
                                        {current} <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 700 }}>/{target}</span>
                                      </div>
                                    </div>
                                    <div style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 900, padding: '0.15rem 0.45rem', borderRadius: 6, background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: isCompleted ? '#10b981' : '#f59e0b', border: isCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)' }}>
                                      %{pct}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <button type="button" onClick={() => handleResetSingleCounterGoal(cg.id)} style={{ background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border-input)', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted, #64748b)' }} title="Sıfırla"><RotateCcw size={12} /></button>
                                      <button type="button" onClick={() => handleDeleteCounterGoal(cg.id)} style={{ background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border-input)', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }} title="Sil"><Trash2 size={12} /></button>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ width: '100%', height: 7, background: 'var(--color-border, #fef3c7)', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: isCompleted ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)', borderRadius: 99, transition: 'width 0.4s ease' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 5, paddingTop: 2 }}>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {[10, 20, 50].map(step => (
                                      <button key={step} type="button" onClick={() => handleAddCounterProgress(cg.id, step)} style={{ padding: isMobile ? '0.22rem 0.5rem' : '0.18rem 0.45rem', borderRadius: 6, fontSize: isMobile ? '0.7rem' : '0.68rem', fontWeight: 800, background: 'var(--color-surface-hover, #ffffff)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', cursor: 'pointer' }}>
                                        +{step}
                                      </button>
                                    ))}
                                  </div>
                                  <form onSubmit={e => { e.preventDefault(); const amt = customAddInputs[cg.id]; if (amt) { handleAddCounterProgress(cg.id, amt); setCustomAddInputs(p => ({ ...p, [cg.id]: '' })); } }} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <input type="number" placeholder="+ Değer" value={customAddInputs[cg.id] || ''} onChange={e => setCustomAddInputs(p => ({ ...p, [cg.id]: e.target.value }))} style={{ width: isMobile ? 65 : 75, padding: '0.22rem 0.45rem', borderRadius: 6, border: '1px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.72rem', fontWeight: 700, outline: 'none' }} />
                                    <button type="submit" style={{ background: '#d97706', color: 'white', border: 'none', borderRadius: 6, padding: '0.22rem 0.55rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}>+ Ekle</button>
                                  </form>
                                </div>
                              </div>
                            );
                          })}

                          {/* Görev Maddeleri */}
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

                {/* ⚡ HAFTALIK HEDEFLERİM */}
                {(() => {
                  const wTasks = goals.weeklyGoals || [];
                  const wCounters = (goals.counterGoals || []).filter(c => c.period === 'Haftalık');
                  const wCount = wTasks.length + wCounters.length;
                  return (
                    <div style={{ background: 'rgba(124, 58, 237, 0.08)', borderRadius: isMobile ? 14 : 18, padding: isMobile ? '0.85rem 0.75rem' : '1.15rem', border: '1px solid rgba(124, 58, 237, 0.25)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: '#c084fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>⚡ Haftalık Hedeflerim ({wTasks.filter(g=>g.done).length + wCounters.filter(c=>(c.current||0)>=(c.target||1)).length}/{wCount})</span>
                      </div>

                      {wCount === 0 ? (
                        <div style={{ color: '#c084fc', fontSize: '0.78rem', fontWeight: 600, textAlign: 'center', padding: '0.4rem' }}>Henüz haftalık hedef veya sayaç eklenmedi.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {/* Sayısal Sayaçlar (Ultra Modern Tasarım) */}
                          {wCounters.map(cg => {
                            const current = cg.current || 0;
                            const target = cg.target || 100;
                            const pct = Math.min(100, Math.round((current / target) * 100));
                            const isCompleted = current >= target;
                            const unitName = (cg.unit || 'Soru').trim();
                            const icon = unitName.toLowerCase().includes('soru') ? '🎯'
                                       : unitName.toLowerCase().includes('sayfa') ? '📚'
                                       : unitName.toLowerCase().includes('saat') ? '⏱️'
                                       : unitName.toLowerCase().includes('net') ? '📈' : '⚡';

                            return (
                              <div
                                key={cg.id}
                                style={{
                                  background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface, #ffffff)',
                                  borderRadius: isMobile ? 12 : 16,
                                  padding: isMobile ? '0.75rem 0.8rem' : '0.9rem 1.1rem',
                                  border: isCompleted ? '1.5px solid #10b981' : '1px solid rgba(168, 85, 247, 0.35)',
                                  boxShadow: isCompleted ? '0 4px 16px rgba(16,185,129,0.12)' : '0 4px 14px rgba(0,0,0,0.04)',
                                  display: 'flex', flexDirection: 'column', gap: '0.55rem',
                                  boxSizing: 'border-box'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                    <div style={{ width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: 8, background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(124, 58, 237, 0.2)', color: isCompleted ? '#10b981' : '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '0.9rem' : '1rem', flexShrink: 0 }}>
                                      {icon}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: isMobile ? '0.84rem' : '0.9rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cg.title}</span>
                                        {isCompleted && (
                                          <span style={{ fontSize: '0.62rem', background: '#10b981', color: 'white', padding: '0.08rem 0.4rem', borderRadius: 99, fontWeight: 900 }}>✓ Tamam</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: isMobile ? '0.68rem' : '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>⚡ Haftalık · {unitName}</div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: isMobile ? '0.92rem' : '1.05rem', fontWeight: 900, color: isCompleted ? '#10b981' : 'var(--color-text, #1e293b)' }}>
                                        {current} <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 700 }}>/{target}</span>
                                      </div>
                                    </div>
                                    <div style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 900, padding: '0.15rem 0.45rem', borderRadius: 6, background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(124, 58, 237, 0.2)', color: isCompleted ? '#10b981' : '#c084fc', border: isCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(168, 85, 247, 0.4)' }}>
                                      %{pct}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <button type="button" onClick={() => handleResetSingleCounterGoal(cg.id)} style={{ background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border-input)', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted, #64748b)' }} title="Sıfırla"><RotateCcw size={12} /></button>
                                      <button type="button" onClick={() => handleDeleteCounterGoal(cg.id)} style={{ background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border-input)', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }} title="Sil"><Trash2 size={12} /></button>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ width: '100%', height: 7, background: 'var(--color-border, #e9d5ff)', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: isCompleted ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 'linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)', borderRadius: 99, transition: 'width 0.4s ease' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 5, paddingTop: 2 }}>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {[10, 20, 50].map(step => (
                                      <button key={step} type="button" onClick={() => handleAddCounterProgress(cg.id, step)} style={{ padding: isMobile ? '0.22rem 0.5rem' : '0.18rem 0.45rem', borderRadius: 6, fontSize: isMobile ? '0.7rem' : '0.68rem', fontWeight: 800, background: 'var(--color-surface-hover, #ffffff)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)', cursor: 'pointer' }}>
                                        +{step}
                                      </button>
                                    ))}
                                  </div>
                                  <form onSubmit={e => { e.preventDefault(); const amt = customAddInputs[cg.id]; if (amt) { handleAddCounterProgress(cg.id, amt); setCustomAddInputs(p => ({ ...p, [cg.id]: '' })); } }} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <input type="number" placeholder="+ Değer" value={customAddInputs[cg.id] || ''} onChange={e => setCustomAddInputs(p => ({ ...p, [cg.id]: e.target.value }))} style={{ width: isMobile ? 65 : 75, padding: '0.22rem 0.45rem', borderRadius: 6, border: '1px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.72rem', fontWeight: 700, outline: 'none' }} />
                                    <button type="submit" style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, padding: '0.22rem 0.55rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}>+ Ekle</button>
                                  </form>
                                </div>
                              </div>
                            );
                          })}

                          {/* Görev Maddeleri */}
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

                {/* 📅 AYLIK HEDEFLERİM */}
                {(() => {
                  const mTasks = goals.monthlyGoals || [];
                  const mCounters = (goals.counterGoals || []).filter(c => c.period === 'Aylık');
                  const mCount = mTasks.length + mCounters.length;
                  return (
                    <div style={{ background: 'rgba(59, 130, 246, 0.08)', borderRadius: isMobile ? 14 : 18, padding: isMobile ? '0.85rem 0.75rem' : '1.15rem', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: '#60a5fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📅 Aylık Hedeflerim ({mTasks.filter(g=>g.done).length + mCounters.filter(c=>(c.current||0)>=(c.target||1)).length}/{mCount})</span>
                      </div>

                      {mCount === 0 ? (
                        <div style={{ color: '#60a5fa', fontSize: '0.78rem', fontWeight: 600, textAlign: 'center', padding: '0.4rem' }}>Henüz aylık hedef veya sayaç eklenmedi.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {/* Sayısal Sayaçlar (Ultra Modern Tasarım) */}
                          {mCounters.map(cg => {
                            const current = cg.current || 0;
                            const target = cg.target || 100;
                            const pct = Math.min(100, Math.round((current / target) * 100));
                            const isCompleted = current >= target;
                            const unitName = (cg.unit || 'Soru').trim();
                            const icon = unitName.toLowerCase().includes('soru') ? '🎯'
                                       : unitName.toLowerCase().includes('sayfa') ? '📚'
                                       : unitName.toLowerCase().includes('saat') ? '⏱️'
                                       : unitName.toLowerCase().includes('net') ? '📈' : '⚡';

                            return (
                              <div
                                key={cg.id}
                                style={{
                                  background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface, #ffffff)',
                                  borderRadius: isMobile ? 12 : 16,
                                  padding: isMobile ? '0.75rem 0.8rem' : '0.9rem 1.1rem',
                                  border: isCompleted ? '1.5px solid #10b981' : '1px solid rgba(59, 130, 246, 0.35)',
                                  boxShadow: isCompleted ? '0 4px 16px rgba(16,185,129,0.12)' : '0 4px 14px rgba(0,0,0,0.04)',
                                  display: 'flex', flexDirection: 'column', gap: '0.55rem',
                                  boxSizing: 'border-box'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                    <div style={{ width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: 8, background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: isCompleted ? '#10b981' : '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '0.9rem' : '1rem', flexShrink: 0 }}>
                                      {icon}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: isMobile ? '0.84rem' : '0.9rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cg.title}</span>
                                        {isCompleted && (
                                          <span style={{ fontSize: '0.62rem', background: '#10b981', color: 'white', padding: '0.08rem 0.4rem', borderRadius: 99, fontWeight: 900 }}>✓ Tamam</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: isMobile ? '0.68rem' : '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>📅 Aylık · {unitName}</div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: isMobile ? '0.92rem' : '1.05rem', fontWeight: 900, color: isCompleted ? '#10b981' : 'var(--color-text, #1e293b)' }}>
                                        {current} <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 700 }}>/{target}</span>
                                      </div>
                                    </div>
                                    <div style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 900, padding: '0.15rem 0.45rem', borderRadius: 6, background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: isCompleted ? '#10b981' : '#60a5fa', border: isCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(59, 130, 246, 0.4)' }}>
                                      %{pct}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <button type="button" onClick={() => handleResetSingleCounterGoal(cg.id)} style={{ background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border-input)', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted, #64748b)' }} title="Sıfırla"><RotateCcw size={12} /></button>
                                      <button type="button" onClick={() => handleDeleteCounterGoal(cg.id)} style={{ background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border-input)', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }} title="Sil"><Trash2 size={12} /></button>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ width: '100%', height: 7, background: 'var(--color-border, #dbeafe)', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: isCompleted ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)', borderRadius: 99, transition: 'width 0.4s ease' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 5, paddingTop: 2 }}>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {[10, 20, 50].map(step => (
                                      <button key={step} type="button" onClick={() => handleAddCounterProgress(cg.id, step)} style={{ padding: isMobile ? '0.22rem 0.5rem' : '0.18rem 0.45rem', borderRadius: 6, fontSize: isMobile ? '0.7rem' : '0.68rem', fontWeight: 800, background: 'var(--color-surface-hover, #ffffff)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)', cursor: 'pointer' }}>
                                        +{step}
                                      </button>
                                    ))}
                                  </div>
                                  <form onSubmit={e => { e.preventDefault(); const amt = customAddInputs[cg.id]; if (amt) { handleAddCounterProgress(cg.id, amt); setCustomAddInputs(p => ({ ...p, [cg.id]: '' })); } }} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <input type="number" placeholder="+ Değer" value={customAddInputs[cg.id] || ''} onChange={e => setCustomAddInputs(p => ({ ...p, [cg.id]: e.target.value }))} style={{ width: isMobile ? 65 : 75, padding: '0.22rem 0.45rem', borderRadius: 6, border: '1px solid var(--color-border-input, #cbd5e1)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.72rem', fontWeight: 700, outline: 'none' }} />
                                    <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '0.22rem 0.55rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}>+ Ekle</button>
                                  </form>
                                </div>
                              </div>
                            );
                          })}

                          {/* Görev Maddeleri */}
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

                {/* ⭐ ÖZEL HEDEFLERİM */}
                {((goals.customGoals || []).length > 0 || (goals.counterGoals || []).some(c => c.period === 'Özel')) && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: isMobile ? 14 : 18, padding: isMobile ? '0.85rem 0.75rem' : '1.15rem', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: '#10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>⭐ Özel Kategori Hedeflerim</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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



        {/* ═══ ÇALIŞMALARIM ═══ */}
        {/* ═══ ÇALIŞMALARIM (PRATİK ÇALIŞMA PANOSU) ═══ */}
        {activeTab === 'calisma' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.85rem' : '1.25rem', animation: 'fadeIn 0.2s ease' }}>
            <Tip>
              ⏱️ <b>Pratik Çalışma Panosu</b>: Çalışmanı 2 tıkla kaydet! Hızlı süre ve ders rozetlerini kullan. Soru ve süre verilerin otomatik olarak sayaç hedeflerine de eklenir.
            </Tip>

            {/* Üst İstatistik Özet Kartları (2x2 on mobile) */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: isMobile ? 6 : '0.85rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: isMobile ? 12 : '0.9rem', padding: isMobile ? '0.75rem 0.65rem' : '1rem', color: 'white', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)' }}>
                <div style={{ fontSize: isMobile ? '0.62rem' : '0.72rem', opacity: 0.85, fontWeight: 800, textTransform: 'uppercase' }}>Toplam Çalışma</div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.6rem', fontWeight: 900, marginTop: 2, lineHeight: 1.1 }}>{totalDailyHours.toFixed(1)} <span style={{ fontSize: isMobile ? '0.72rem' : '0.9rem', opacity: 0.9 }}>Saat</span></div>
                <div style={{ fontSize: isMobile ? '0.6rem' : '0.7rem', opacity: 0.8, marginTop: 2 }}>Kayıtlı oturumlar</div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius: isMobile ? 12 : '0.9rem', padding: isMobile ? '0.75rem 0.65rem' : '1rem', color: 'white', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)' }}>
                <div style={{ fontSize: isMobile ? '0.62rem' : '0.72rem', opacity: 0.85, fontWeight: 800, textTransform: 'uppercase' }}>Toplam Soru</div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.6rem', fontWeight: 900, marginTop: 2, lineHeight: 1.1 }}>{Math.round(totalDailyQuestions)} <span style={{ fontSize: isMobile ? '0.72rem' : '0.9rem', opacity: 0.9 }}>Soru</span></div>
                <div style={{ fontSize: isMobile ? '0.6rem' : '0.7rem', opacity: 0.8, marginTop: 2 }}>Çözülen sorular</div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', borderRadius: isMobile ? 12 : '0.9rem', padding: isMobile ? '0.75rem 0.65rem' : '1rem', color: 'white', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)' }}>
                <div style={{ fontSize: isMobile ? '0.62rem' : '0.72rem', opacity: 0.85, fontWeight: 800, textTransform: 'uppercase' }}>Çalışma Günleri</div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.6rem', fontWeight: 900, marginTop: 2, lineHeight: 1.1 }}>{dailyLogs.length} <span style={{ fontSize: isMobile ? '0.72rem' : '0.9rem', opacity: 0.9 }}>Gün</span></div>
                <div style={{ fontSize: isMobile ? '0.6rem' : '0.7rem', opacity: 0.8, marginTop: 2 }}>Düzenli takip</div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: isMobile ? 12 : '0.9rem', padding: isMobile ? '0.75rem 0.65rem' : '1rem', color: 'white', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)' }}>
                <div style={{ fontSize: isMobile ? '0.62rem' : '0.72rem', opacity: 0.85, fontWeight: 800, textTransform: 'uppercase' }}>Spor & Sağlık</div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.6rem', fontWeight: 900, marginTop: 2, lineHeight: 1.1 }}>{dailyLogs.filter(l => l.sport).length} <span style={{ fontSize: isMobile ? '0.72rem' : '0.9rem', opacity: 0.9 }}>Gün</span></div>
                <div style={{ fontSize: isMobile ? '0.6rem' : '0.7rem', opacity: 0.8, marginTop: 2 }}>Aktif yaşam</div>
              </div>
            </div>

            {/* Yeni Pratik Çalışma Kayıt Kartı */}
            <Card emoji="⚡" title="Pratik Çalışma Girişi (Tek Tıkla Ekleyin)" isMobile={isMobile}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '0.9rem' }}>

                {/* Hızlı Çalışma Türü Seçimi */}
                <div>
                  <div style={{ fontSize: isMobile ? '0.72rem' : '0.78rem', fontWeight: 800, color: 'var(--color-text-muted, #475569)', marginBottom: '0.35rem' }}>🎯 Çalışma Türü Seçimi:</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {[
                      { label: '📖 Konu Çalışması', type: 'Konu Çalışması' },
                      { label: '📚 Kitap Okuma', type: 'Kitap Okuma' },
                      { label: '✏️ Soru Çözümü', type: 'Soru Çözümü' },
                      { label: '🔄 Tekrar / Ezber', type: 'Tekrar' },
                      { label: '📝 Deneme / Test', type: 'Deneme' },
                      { label: '💡 Etkinlik / Ödev', type: 'Ödev' },
                    ].map(act => {
                      const isSelected = (newLog.activityType || 'Soru Çözümü') === act.type;
                      return (
                        <button
                          type="button"
                          key={act.type}
                          onClick={() => {
                            setNewLog(p => ({
                              ...p,
                              activityType: act.type,
                              revision: p.revision ? (p.revision.includes(act.label) ? p.revision : `${act.label} · ${p.revision}`) : act.label
                            }));
                          }}
                          style={{
                            padding: isMobile ? '0.28rem 0.55rem' : '0.32rem 0.65rem',
                            borderRadius: '0.45rem',
                            fontSize: isMobile ? '0.72rem' : '0.76rem',
                            fontWeight: 800,
                            border: isSelected ? '1.5px solid #a855f7' : '1px solid var(--color-border-input, #cbd5e1)',
                            background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'var(--color-surface, #ffffff)',
                            color: isSelected ? '#c084fc' : 'var(--color-text, #475569)',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {isSelected ? '✓ ' : ''}{act.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hızlı Süre Rozetleri */}
                <div>
                  <div style={{ fontSize: isMobile ? '0.72rem' : '0.78rem', fontWeight: 800, color: 'var(--color-text-muted, #475569)', marginBottom: '0.35rem' }}>⏱️ Hızlı Süre Seçimi:</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
                            padding: isMobile ? '0.28rem 0.55rem' : '0.32rem 0.7rem',
                            borderRadius: '0.45rem',
                            fontSize: isMobile ? '0.72rem' : '0.78rem',
                            fontWeight: 800,
                            border: isSelected ? '1.5px solid #a855f7' : '1px solid var(--color-border-input, #cbd5e1)',
                            background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'var(--color-surface-hover, #f8fafc)',
                            color: isSelected ? '#c084fc' : 'var(--color-text, #334155)',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {isSelected ? '✓ ' : ''}{preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hızlı Ders Seçim Rozetleri */}
                <div>
                  <div style={{ fontSize: isMobile ? '0.72rem' : '0.78rem', fontWeight: 800, color: 'var(--color-text-muted, #475569)', marginBottom: '0.35rem' }}>📚 Hızlı Ders Seçimi:</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {SUBJECTS.map((subName, idx) => {
                      const isSelected = (newLog.revision || '').includes(subName);
                      return (
                        <button
                          type="button"
                          key={`${subName}_${idx}`}
                          onClick={() => {
                            setNewLog(p => {
                              const curr = p.revision ? p.revision.trim() : '';
                              if (curr.includes(subName)) return p;
                              const updated = curr ? `${curr}, ${subName}` : subName;
                              return { ...p, revision: updated };
                            });
                          }}
                          style={{
                            padding: isMobile ? '0.28rem 0.55rem' : '0.32rem 0.65rem',
                            borderRadius: '0.45rem',
                            fontSize: isMobile ? '0.72rem' : '0.76rem',
                            fontWeight: 800,
                            border: isSelected ? '1.5px solid #3b82f6' : '1px solid var(--color-border-input, #cbd5e1)',
                            background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--color-surface, #ffffff)',
                            color: isSelected ? '#60a5fa' : 'var(--color-text, #475569)',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}{subName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detay Kutuları Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: isMobile ? '0.55rem' : '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--color-border, #e2e8f0)' }}>
                  <div>
                    <label style={lbl}>Tarih</label>
                    <input style={inp} type="date" value={newLog.date} onChange={e => setNewLog(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Çalışma Süresi (saat)</label>
                    <input style={inp} type="number" step="0.25" value={newLog.studyHours} onChange={e => setNewLog(p => ({ ...p, studyHours: e.target.value }))} placeholder="Örn: 1.5" />
                  </div>
                  <div>
                    <label style={lbl}>Soru Sayısı (Opsiyonel)</label>
                    <input style={inp} type="number" value={newLog.questions} onChange={e => setNewLog(p => ({ ...p, questions: e.target.value }))} placeholder="Soru yoksa boş" />
                  </div>
                  <div>
                    <label style={lbl}>Uyku Yatma Saati</label>
                    <input style={inp} value={newLog.sleepTime} onChange={e => setNewLog(p => ({ ...p, sleepTime: e.target.value }))} placeholder="Örn: 23:30" />
                  </div>
                  <div style={{ gridColumn: isMobile ? 'span 2' : 'auto' }}>
                    <label style={lbl}>Ders & Konu / Detay Notu</label>
                    <input style={inp} value={newLog.revision} onChange={e => setNewLog(p => ({ ...p, revision: e.target.value }))} placeholder="Örn: Konu tekrarı / Kitap okuma..." />
                  </div>
                </div>

                {/* Alt Aksiyon Çubuğu */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '0.65rem', paddingTop: '0.4rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: 6, cursor: 'pointer', fontWeight: 800, fontSize: isMobile ? '0.78rem' : '0.82rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: isMobile ? '0.45rem 0.75rem' : '0.35rem 0.75rem', borderRadius: '0.55rem', boxSizing: 'border-box' }}>
                    <input type="checkbox" checked={newLog.sport} onChange={e => setNewLog(p => ({ ...p, sport: e.target.checked }))} /> 🏃 Bugün Spor / Egzersiz Yaptım
                  </label>

                  <button
                    type="button"
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
                      setNewLog({ date: today(), studyHours: '', questions: '', revision: '', sport: false, sleepTime: '', activityType: 'Soru Çözümü' });
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.65rem',
                      padding: isMobile ? '0.65rem 1rem' : '0.6rem 1.4rem',
                      fontWeight: 900,
                      fontSize: isMobile ? '0.82rem' : '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                    }}
                  >
                    <Plus size={16} /> Çalışmayı Kaydet & Senkronize Et
                  </button>
                </div>
              </div>
            </Card>

            {/* Çalışma Geçmişi */}
            {dailyLogs.length > 0 && (
              <Card emoji="📋" title="Çalışma Geçmişim & Günlük Takip" isMobile={isMobile}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {dailyLogs.map(log => (
                    <div key={log.id} style={{
                      display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '0.5rem',
                      padding: isMobile ? '0.65rem 0.75rem' : '0.65rem 0.9rem', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: '0.75rem', fontSize: '0.82rem',
                      border: '1px solid var(--color-border, #e2e8f0)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: 'var(--color-text-muted, #64748b)', background: 'var(--color-surface, #e2e8f0)', padding: '0.12rem 0.45rem', borderRadius: '0.4rem', fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                          📅 {log.date}
                        </span>
                        {log.studyHours && (
                          <span style={{ fontWeight: 900, color: '#a855f7', background: 'rgba(168, 85, 247, 0.15)', padding: '0.12rem 0.45rem', borderRadius: '0.4rem', border: '1px solid rgba(168, 85, 247, 0.35)', fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                            ⏱️ {log.studyHours} Saat
                          </span>
                        )}
                        {parseFloat(log.questions) > 0 && (
                          <span style={{ fontWeight: 900, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.15)', padding: '0.12rem 0.45rem', borderRadius: '0.4rem', border: '1px solid rgba(59, 130, 246, 0.35)', fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                            ✏️ {log.questions} Soru
                          </span>
                        )}
                        {log.sport && (
                          <span style={{ fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '0.12rem 0.45rem', borderRadius: '0.4rem', border: '1px solid rgba(16, 185, 129, 0.35)', fontSize: isMobile ? '0.68rem' : '0.73rem' }}>
                            🏃 Spor
                          </span>
                        )}
                        {log.sleepTime && (
                          <span style={{ fontWeight: 800, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '0.12rem 0.45rem', borderRadius: '0.4rem', fontSize: isMobile ? '0.68rem' : '0.73rem' }}>
                            🌙 {log.sleepTime}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem', borderTop: isMobile ? '1px dashed var(--color-border, #e2e8f0)' : 'none', paddingTop: isMobile ? 4 : 0 }}>
                        <span style={{ color: 'var(--color-text, #334155)', fontWeight: 700, fontSize: isMobile ? '0.78rem' : '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.revision || 'Detay girilmedi'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDailyLogs(p => p.filter(x => x.id !== log.id))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                          title="Kaydı Sil"
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





        {/* ═══ MOTİVASYON & ÇALIŞMA STRATEJİLERİ ═══ */}
        {activeTab === 'motivasyon' && (
          (() => {
            // Canlı Metrik ve Seviye Hesaplama
            const totalSolved = (goals.counterGoals || []).reduce((acc, c) => acc + (c.current || 0), 0);
            const totalCompletedGoals =
              (goals.dailyGoals || []).filter(g => g.done).length +
              (goals.weeklyGoals || []).filter(g => g.done).length +
              (goals.monthlyGoals || []).filter(g => g.done).length +
              (goals.counterGoals || []).filter(c => (c.current || 0) >= (c.target || 1)).length;

            const xp = (totalSolved * 2) + (totalCompletedGoals * 25) + (dailyQuestDone ? 50 : 0);
            let level = 1;
            let levelTitle = "🌱 Çaylak Öğrenci";
            let nextThreshold = 200;
            let prevThreshold = 0;

            if (xp >= 1000) { level = 5; levelTitle = "👑 Zirve Efsanesi"; nextThreshold = 2000; prevThreshold = 1000; }
            else if (xp >= 500) { level = 4; levelTitle = "🧠 Odak Şampiyonu"; nextThreshold = 1000; prevThreshold = 500; }
            else if (xp >= 250) { level = 3; levelTitle = "🎯 Soru Avcısı"; nextThreshold = 500; prevThreshold = 250; }
            else if (xp >= 100) { level = 2; levelTitle = "⚡ Disiplin Çırağı"; nextThreshold = 250; prevThreshold = 100; }

            const levelProgressPct = Math.min(100, Math.round(((xp - prevThreshold) / (nextThreshold - prevThreshold)) * 100));

            const filteredQuotes = selectedQuoteCategory === 'Tümü'
              ? MOTIVATION_QUOTES
              : MOTIVATION_QUOTES.filter(q => q.category === selectedQuoteCategory);

            const currentQ = filteredQuotes[quoteIdx % filteredQuotes.length] || MOTIVATION_QUOTES[0];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.85rem' : '1.25rem', animation: 'fadeIn 0.2s ease' }}>
                <Tip>
                  🚀 <b>Motivasyon & Zafer Merkezi</b>: Canlı seviyeni takip et, günün zafer görevini tamamla ve ilham verici stratejilerle zihnini zirveye taşı!
                </Tip>

                {/* 1. SEVİYE & SERİ HEADER PANOSU */}
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311b92 100%)',
                  borderRadius: isMobile ? 16 : 24,
                  padding: isMobile ? '1rem 0.85rem' : '1.5rem 1.75rem',
                  color: 'white',
                  boxShadow: '0 12px 35px rgba(15, 23, 42, 0.25)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 10 : 12, marginBottom: isMobile ? '0.85rem' : '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12 }}>
                      <div style={{
                        width: isMobile ? 42 : 52,
                        height: isMobile ? 42 : 52,
                        borderRadius: isMobile ? 12 : 16,
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isMobile ? '1.3rem' : '1.6rem',
                        boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        flexShrink: 0
                      }}>
                        🏆
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 900 }}>
                            Level {level}: {levelTitle}
                          </span>
                          <span style={{ fontSize: isMobile ? '0.62rem' : '0.7rem', background: '#f59e0b', color: '#78350f', padding: '0.12rem 0.45rem', borderRadius: 99, fontWeight: 900 }}>
                            {xp} XP
                          </span>
                        </div>
                        <div style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', color: '#cbd5e1', fontWeight: 700, marginTop: 2 }}>
                          Sonraki Seviyeye: <b style={{ color: '#a7f3d0' }}>{Math.max(0, nextThreshold - xp)} XP</b> · {totalCompletedGoals} Hedef Bitti
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                      <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: isMobile ? '0.35rem 0.5rem' : '0.5rem 0.9rem', textAlign: 'center' }}>
                        <div style={{ fontSize: isMobile ? '0.6rem' : '0.68rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>🔥 Seri</div>
                        <div style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 900, color: '#f59e0b', marginTop: 1 }}>7 Gün</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: isMobile ? '0.35rem 0.5rem' : '0.5rem 0.9rem', textAlign: 'center' }}>
                        <div style={{ fontSize: isMobile ? '0.6rem' : '0.68rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>🎯 Soru</div>
                        <div style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 900, color: '#38bdf8', marginTop: 1 }}>{totalSolved}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>
                      <span>Seviye İlerlemesi (%{levelProgressPct})</span>
                      <span>{xp} / {nextThreshold} XP</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        width: `${levelProgressPct}%`, height: '100%',
                        background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)',
                        borderRadius: 99, transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                </div>

                {/* 2. DİNAMİK CANLI KOÇ DEĞERLENDİRMESİ */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)',
                  borderRadius: isMobile ? 14 : 20,
                  padding: isMobile ? '0.85rem 0.75rem' : '1.25rem 1.5rem',
                  border: '1.5px solid rgba(16, 185, 129, 0.35)',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? 10 : 14,
                  boxSizing: 'border-box'
                }}>
                  <div style={{ width: isMobile ? 36 : 46, height: isMobile ? 36 : 46, borderRadius: 12, background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '1.15rem' : '1.4rem', flexShrink: 0 }}>
                    💡
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Akıllı Koç Değerlendirmesi & Canlı Tavsiye
                    </div>
                    <div style={{ fontSize: isMobile ? '0.82rem' : '0.92rem', fontWeight: 800, color: 'var(--color-text, #064e3b)', marginTop: 2, lineHeight: 1.35 }}>
                      {totalCompletedGoals > 3
                        ? "🚀 Muazzam bir ivme yakaladın! Hedeflerini tek tek tamamlıyorsun. Bu disiplin seni istediğin liseye/üniversiteye taşıyacak!"
                        : totalSolved > 50
                        ? "⚡ Soru sayaçlarındaki harika ilerleme dikkat çekiyor! Yanlış yaptığın soruların üzerine gitmeyi unutma."
                        : "🌱 Başarı büyük adımlarla değil, bugün atacağın küçük bir adımla başlar. Hemen 20 soru çözerek motoru çalıştır!"}
                    </div>
                  </div>
                </div>

                {/* 3. GÜNÜN MİNİ ZAFER MÜCADELESİ */}
                <div style={{
                  background: dailyQuestDone ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  borderRadius: isMobile ? 14 : 20,
                  padding: isMobile ? '0.85rem 0.75rem' : '1.25rem 1.5rem',
                  border: dailyQuestDone ? '1.5px solid rgba(16, 185, 129, 0.35)' : '1.5px solid rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: isMobile ? 10 : 12,
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12 }}>
                    <div style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', flexShrink: 0 }}>{dailyQuestDone ? '🎉' : '🎯'}</div>
                    <div>
                      <div style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 900, color: dailyQuestDone ? '#10b981' : '#f59e0b', textTransform: 'uppercase' }}>
                        Günün Mini Zafer Görevi
                      </div>
                      <div style={{ fontSize: isMobile ? '0.86rem' : '0.95rem', fontWeight: 900, color: dailyQuestDone ? '#10b981' : '#f59e0b', marginTop: 1, lineHeight: 1.3 }}>
                        {dailyQuestDone ? "Harika! Bugünün Zafer Görevini Tamamladın (+50 XP Kazandın!)" : "Bugün 1 Konu Tekrarı Yap veya En Az 30 Soru Çöz!"}
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
                      color: 'white',
                      border: 'none',
                      borderRadius: 10,
                      padding: isMobile ? '0.55rem 1rem' : '0.65rem 1.25rem',
                      fontWeight: 900,
                      fontSize: isMobile ? '0.8rem' : '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    {dailyQuestDone ? '✓ Görev Tamamlandı (+50 XP)' : '🚀 Görevi Tamamladım (+50 XP)'}
                  </button>
                </div>

                {/* 4. İLHAM KÜTÜPHANESİ & KATEGORİK SÖZ KARTI */}
                <div style={{
                  background: 'var(--color-surface, #ffffff)',
                  borderRadius: isMobile ? 16 : 24,
                  padding: isMobile ? '0.95rem 0.75rem' : '1.5rem',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isMobile ? '0.75rem' : '1.1rem',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={isMobile ? 18 : 22} color="#7c3aed" />
                      <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>Günün İlham Verici Sözü</h3>
                    </div>

                    <div style={{ display: 'flex', gap: 3, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: isMobile ? 2 : 0 }} className="hide-scrollbar">
                      {['Tümü', 'Disiplin', 'Eylem', 'Zafer', 'Odak', 'İnanç', 'Özgüven'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { setSelectedQuoteCategory(cat); setQuoteIdx(0); }}
                          style={{
                            padding: isMobile ? '0.24rem 0.5rem' : '0.28rem 0.65rem',
                            borderRadius: 6,
                            fontSize: isMobile ? '0.68rem' : '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: selectedQuoteCategory === cat ? '#7c3aed' : 'var(--color-surface-hover, #f1f5f9)',
                            color: selectedQuoteCategory === cat ? 'white' : 'var(--color-text-muted, #475569)',
                            border: selectedQuoteCategory === cat ? 'none' : '1px solid var(--color-border-input, #cbd5e1)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)',
                    borderRadius: isMobile ? 14 : 20,
                    padding: isMobile ? '1rem 0.85rem' : '1.5rem 1.75rem',
                    color: 'white',
                    boxShadow: '0 8px 25px rgba(124, 58, 237, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '0.65rem' : '0.85rem' }}>
                      <span style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.55rem', borderRadius: 99, backdropFilter: 'blur(4px)' }}>
                        🏷️ {currentQ.category}
                      </span>

                      <button
                        type="button"
                        onClick={() => setQuoteIdx((quoteIdx + 1) % filteredQuotes.length)}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          border: '1px solid rgba(255,255,255,0.3)',
                          borderRadius: 8,
                          padding: isMobile ? '0.28rem 0.65rem' : '0.35rem 0.85rem',
                          color: 'white',
                          fontWeight: 800,
                          fontSize: isMobile ? '0.72rem' : '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          backdropFilter: 'blur(6px)'
                        }}
                      >
                        🎲 Sonraki ({quoteIdx + 1}/{filteredQuotes.length})
                      </button>
                    </div>

                    <div style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 900, lineHeight: 1.4, fontStyle: 'italic', marginBottom: isMobile ? '0.65rem' : '0.85rem' }}>
                      "{currentQ.quote}"
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: isMobile ? '0.8rem' : '0.9rem', fontWeight: 800, opacity: 0.9 }}>
                      — {currentQ.author}
                    </div>
                  </div>
                </div>

                {/* 5. KOÇTAN STRATEJİK TAVSİYELER */}
                <Card emoji="💡" title="Koçtan Derece Yaptıran Çalışma Stratejileri" isMobile={isMobile}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: isMobile ? '0.65rem' : '1rem' }}>
                    <div style={{ background: 'var(--color-surface-hover, #f8fafc)', borderRadius: '0.85rem', padding: isMobile ? '0.75rem' : '1rem', border: '1.5px solid var(--color-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>🧠</span>
                        <span style={{ fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: 'var(--color-text, #1e293b)' }}>1. Aktif Hatırlama (Active Recall)</span>
                      </div>
                      <div style={{ fontSize: isMobile ? '0.76rem' : '0.8rem', color: 'var(--color-text-muted, #475569)', lineHeight: 1.5, fontWeight: 600 }}>
                        Sadece altını çizerek okuma! Bir konuyu okuduktan sonra kitabı kapatıp kendi cümlelerinle bir kâğıda yaz veya anlat.
                      </div>
                    </div>

                    <div style={{ background: 'var(--color-surface-hover, #f8fafc)', borderRadius: '0.85rem', padding: isMobile ? '0.75rem' : '1rem', border: '1.5px solid var(--color-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>⏱️</span>
                        <span style={{ fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: 'var(--color-text, #1e293b)' }}>2. Pomodoro & Odaklanma</span>
                      </div>
                      <div style={{ fontSize: isMobile ? '0.76rem' : '0.8rem', color: 'var(--color-text-muted, #475569)', lineHeight: 1.5, fontWeight: 600 }}>
                        25 dakika kesintisiz odaklan + 5 dakika mola. 4 blok sonrası 20 dakikalık uzun mola ver. Zihnin asla yorulmaz!
                      </div>
                    </div>

                    <div style={{ background: 'var(--color-surface-hover, #f8fafc)', borderRadius: '0.85rem', padding: isMobile ? '0.75rem' : '1rem', border: '1.5px solid var(--color-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>✍️</span>
                        <span style={{ fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: 'var(--color-text, #1e293b)' }}>3. Yanlış Defteri (Fener Defteri)</span>
                      </div>
                      <div style={{ fontSize: isMobile ? '0.76rem' : '0.8rem', color: 'var(--color-text-muted, #475569)', lineHeight: 1.5, fontWeight: 600 }}>
                        Sınavı kazandıran doğru yaptıkların değil, yanlışlarından öğrendiklerindir. Yanlış sorularını bir not defterinde biriktir!
                      </div>
                    </div>

                    <div style={{ background: 'var(--color-surface-hover, #f8fafc)', borderRadius: '0.85rem', padding: isMobile ? '0.75rem' : '1rem', border: '1.5px solid var(--color-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>📱</span>
                        <span style={{ fontWeight: 900, fontSize: isMobile ? '0.88rem' : '0.95rem', color: 'var(--color-text, #1e293b)' }}>4. Dijital Detoks & Sessiz Alan</span>
                      </div>
                      <div style={{ fontSize: isMobile ? '0.76rem' : '0.8rem', color: 'var(--color-text-muted, #475569)', lineHeight: 1.5, fontWeight: 600 }}>
                        Çalışırken telefonunu başka bir odaya koy veya sessize al. Bildirimler olmadan odaklanma kaliten 2 katına çıkar!
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 6. KİŞİSEL MOTİVASYON VE ZAFER DEFTERİ */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? '0.65rem' : '1rem' }}>
                  <Card emoji="⭐" title="Benim Haftalık Mottom" isMobile={isMobile}>
                    <textarea
                      style={{ ...ta, background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.35)', minHeight: isMobile ? 60 : 75, fontWeight: 700, color: 'var(--color-text, #92400e)', fontSize: isMobile ? '0.82rem' : '0.9rem' }}
                      value={motivation.weekQuote}
                      onChange={e => setMotivation(p => ({ ...p, weekQuote: e.target.value }))}
                      placeholder="Bu hafta seni ayağa kaldıracak kişisel cümleni yaz..."
                    />
                  </Card>

                  <Card emoji="🏆" title="Bu Hafta Başardıklarım & Zaferlerim" isMobile={isMobile}>
                    <textarea
                      style={{ ...ta, background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.35)', minHeight: isMobile ? 60 : 75, fontWeight: 700, color: 'var(--color-text, #166534)', fontSize: isMobile ? '0.82rem' : '0.9rem' }}
                      value={motivation.achievements}
                      onChange={e => setMotivation(p => ({ ...p, achievements: e.target.value }))}
                      placeholder="Çözdüğün zor sorular, tamamladığın konular... Her başarını buraya yaz ve kendini kutla! 🎉"
                    />
                  </Card>

                  <Card emoji="💌" title="Sınav Günü Kendime Not" isMobile={isMobile}>
                    <textarea
                      style={{ ...ta, background: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.35)', minHeight: isMobile ? 60 : 75, fontWeight: 700, color: 'var(--color-text, #3730a3)', fontSize: isMobile ? '0.82rem' : '0.9rem' }}
                      value={motivation.selfNote}
                      onChange={e => setMotivation(p => ({ ...p, selfNote: e.target.value }))}
                      placeholder="Sınav günü masaya oturduğunda zihninde ne olmalı? Kendine güven mesajını yaz..."
                    />
                  </Card>

                  <Card emoji="🎁" title="Hedef Ödül Sistemim" isMobile={isMobile}>
                    <textarea
                      style={{ ...ta, background: 'rgba(236, 72, 153, 0.08)', borderColor: 'rgba(236, 72, 153, 0.35)', minHeight: isMobile ? 60 : 75, fontWeight: 700, color: 'var(--color-text, #831843)', fontSize: isMobile ? '0.82rem' : '0.9rem' }}
                      value={motivation.rewardSystem}
                      onChange={e => setMotivation(p => ({ ...p, rewardSystem: e.target.value }))}
                      placeholder="Hedeflerimi tamamlarsam kendime hediyem: Örn: 500 Soru = Sinema Bileti 🎬"
                    />
                  </Card>
                </div>

                {/* Kaydet Butonu */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleSave}
                    style={{
                      width: isMobile ? '100%' : 'auto',
                      justifyContent: 'center',
                      padding: isMobile ? '0.65rem 1.2rem' : '0.65rem 1.8rem',
                      borderRadius: '0.75rem',
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                      color: 'white',
                      border: 'none',
                      fontWeight: 900,
                      fontSize: isMobile ? '0.84rem' : '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Save size={18} /> Motivasyon Notlarımı Kaydet
                  </button>
                </div>
              </div>
            );
          })()
        )}

        {/* ═══ ALIŞKANLIKLARIM (ZİNCİRİ KIRMA SEKMESİ) ═══ */}
        {activeTab === 'aliskanlik' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.85rem' : '1.25rem', animation: 'fadeIn 0.2s ease' }}>
            <Tip>Zinciri Kırma! Her gün tamamladığın alışkanlıkları işaretle, serini bozma ve hedeflerine adım adım ulaş!</Tip>

            {/* Zinciri Kırma İstatistik Kartları */}
            <div style={{ display: 'grid', gridTemplateColumns: isSmallMobile ? '1fr' : isMobile ? 'repeat(3, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: isMobile ? 6 : '1rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', borderRadius: isMobile ? 12 : '1rem', padding: isMobile ? '0.75rem 0.65rem' : '1.15rem', color: 'white', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.25)' }}>
                <div style={{ fontSize: isMobile ? '0.62rem' : '0.78rem', opacity: 0.85, fontWeight: 700, marginBottom: 2 }}>EN UZUN SERİ</div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.3rem', lineHeight: 1.1 }}>
                  🔥 {Math.max(0, ...habits.map(h => calculateHabitStreak(h).currentStreak))} Gün
                </div>
                <div style={{ fontSize: isMobile ? '0.6rem' : '0.72rem', opacity: 0.8, marginTop: 3 }}>Kesintisiz seriniz</div>
              </div>

              <div style={{ background: 'var(--color-surface, rgba(255, 255, 255, 0.7))', backdropFilter: 'blur(16px)', borderRadius: isMobile ? 12 : '1rem', padding: isMobile ? '0.75rem 0.65rem' : '1.15rem', border: '1px solid var(--color-border, rgba(255,255,255,1))' }}>
                <div style={{ fontSize: isMobile ? '0.62rem' : '0.78rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700, marginBottom: 2 }}>TOPLAM İŞARET</div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: 900, color: '#10b981', lineHeight: 1.1 }}>
                  {habits.reduce((sum, h) => sum + Object.values(h.days || {}).filter(Boolean).length, 0)} <span style={{ fontSize: isMobile ? '0.72rem' : '1rem', color: 'var(--color-text-muted)' }}>/ {habits.length * 7}</span>
                </div>
                <div style={{ fontSize: isMobile ? '0.6rem' : '0.72rem', color: 'var(--color-text-muted, #94a3b8)', marginTop: 3 }}>Haftalık alışkanlık</div>
              </div>

              <div style={{ background: 'var(--color-surface, rgba(255, 255, 255, 0.7))', backdropFilter: 'blur(16px)', borderRadius: isMobile ? 12 : '1rem', padding: isMobile ? '0.75rem 0.65rem' : '1.15rem', border: '1px solid var(--color-border, rgba(255,255,255,1))' }}>
                <div style={{ fontSize: isMobile ? '0.62rem' : '0.78rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700, marginBottom: 2 }}>ZİNCİRİ TAMAM</div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: 900, color: '#818cf8', lineHeight: 1.1 }}>
                  {habits.filter(h => calculateHabitStreak(h).maxStreak >= 5).length} <span style={{ fontSize: isMobile ? '0.72rem' : '1rem', color: 'var(--color-text-muted)' }}>Adet</span>
                </div>
                <div style={{ fontSize: isMobile ? '0.6rem' : '0.72rem', color: 'var(--color-text-muted, #94a3b8)', marginTop: 3 }}>5+ gün üst üste</div>
              </div>
            </div>

            {/* Alışkanlık Takibi & Zincir Görünümü */}
            <Card emoji="🔥" title="Alışkanlık Takibim & Seri Rekorları" isMobile={isMobile}>
              <form onSubmit={e => { e.preventDefault(); if (newHabit.trim()) { setHabits(p => [...p, { id: uid(), label: newHabit.trim(), days: DAYS.reduce((a, d) => ({ ...a, [d]: false }), {}) }]); setNewHabit(''); }}} style={{ display: 'flex', gap: 6, marginBottom: isMobile ? '0.85rem' : '1.25rem' }}>
                <input style={{ ...inp, flex: 1 }} value={newHabit} onChange={e => setNewHabit(e.target.value)} placeholder="Yeni alışkanlık ekle (ör: Paragraf Çöz, Erken Kalk)..." />
                <button type="submit" style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.65rem', padding: isMobile ? '0.5rem 0.85rem' : '0.6rem 1.15rem', fontWeight: 800, fontSize: isMobile ? '0.78rem' : '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <Plus size={15} /> Ekle
                </button>
              </form>

              {habits.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted, #94a3b8)', padding: '2rem 1rem', fontWeight: 700, fontSize: '0.85rem' }}>
                  Henüz alışkanlık eklenmedi. Yukarıdan yeni bir alışkanlık ekleyerek zincirini başlat!
                </div>
              ) : isMobile ? (
                /* Mobile Native Habit Cards View */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {habits.map(h => {
                    const streakInfo = calculateHabitStreak(h);
                    const count = Object.values(h.days || {}).filter(Boolean).length;

                    return (
                      <div
                        key={h.id}
                        style={{
                          background: 'var(--color-surface, #ffffff)',
                          borderRadius: 14,
                          padding: '0.75rem 0.85rem',
                          border: '1.5px solid var(--color-border, #e2e8f0)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem',
                          boxSizing: 'border-box'
                        }}
                      >
                        {/* Top Row: Habit Name, 7/7 Badge, Streak Pill, Monthly Calendar, Delete */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <button
                              type="button"
                              onClick={() => setSelectedMonthlyHabit(h)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                textAlign: 'left',
                                fontWeight: 900,
                                fontSize: '0.88rem',
                                color: 'var(--color-text, #0f172a)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                minWidth: 0
                              }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.label}</span>
                            </button>
                            {count === 7 && (
                              <span style={{ fontSize: '0.6rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.08rem 0.35rem', borderRadius: 99, fontWeight: 900, flexShrink: 0 }}>
                                ⚡ 7/7
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => setSelectedMonthlyHabit(h)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                padding: '0.18rem 0.45rem',
                                borderRadius: '99px',
                                background: streakInfo.currentStreak >= 3 ? 'rgba(234, 88, 12, 0.15)' : 'var(--color-surface-hover, #f1f5f9)',
                                color: streakInfo.currentStreak >= 3 ? '#f97316' : 'var(--color-text-muted, #64748b)',
                                fontWeight: 900,
                                fontSize: '0.7rem',
                                border: streakInfo.currentStreak >= 3 ? '1px solid rgba(234, 88, 12, 0.35)' : '1px solid var(--color-border, #e2e8f0)',
                                cursor: 'pointer'
                              }}
                              title="Aylık takvimi incele"
                            >
                              🔥 {streakInfo.currentStreak} Gün
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedMonthlyHabit(h)}
                              style={{
                                background: 'rgba(99, 102, 241, 0.12)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                color: '#818cf8',
                                borderRadius: 6,
                                padding: '0.18rem 0.4rem',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                              title="Aylık takvim"
                            >
                              📅 Aylık
                            </button>

                            <button
                              type="button"
                              onClick={() => setHabits(p => p.filter(x => x.id !== h.id))}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-muted, #cbd5e1)',
                                padding: 2,
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* 7 Days Grid Circles for Fast Touch Logging */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                          gap: 3,
                          background: 'var(--color-surface-hover, #f8fafc)',
                          padding: '0.4rem 0.25rem',
                          borderRadius: 10,
                          border: '1px solid var(--color-border, #f1f5f9)'
                        }}>
                          {weekDates.map((w) => {
                            const d = w.dayName;
                            const isChecked = h.days?.[d];
                            const isToday = w.isToday;

                            return (
                              <div
                                key={d}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: 2,
                                  background: isToday ? 'rgba(234, 88, 12, 0.08)' : 'transparent',
                                  padding: '0.2rem 0.05rem',
                                  borderRadius: 6
                                }}
                              >
                                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: isToday ? '#f97316' : 'var(--color-text-muted, #64748b)' }}>
                                  {d}
                                </span>
                                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: isToday ? '#ea580c' : 'var(--color-text-muted, #94a3b8)' }}>
                                  {w.dateNum}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleHabitDay(h.id, d, w.isoDate)}
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: '50%',
                                    background: isChecked ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'var(--color-surface, white)',
                                    border: isChecked ? 'none' : isToday ? '2px solid #fb923c' : '1.5px solid var(--color-border-input, #cbd5e1)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isChecked ? '0 2px 6px rgba(220, 38, 38, 0.3)' : 'none',
                                    marginTop: 2
                                  }}
                                >
                                  {isChecked && <Check size={13} color="white" strokeWidth={3} />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Desktop Table View */
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: 500 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 800, fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase' }}>Alışkanlık</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 800, fontSize: '0.75rem', color: '#ea580c', width: 95 }}>Seri / Zincir</th>
                        {weekDates.map(w => (
                          <th
                            key={w.dayName}
                            style={{
                              textAlign: 'center', width: 55, padding: '0.35rem 0.2rem',
                              background: w.isToday ? 'rgba(234, 88, 12, 0.15)' : 'transparent',
                              borderRadius: w.isToday ? '0.5rem 0.5rem 0 0' : '0'
                            }}
                          >
                            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: w.isToday ? '#f97316' : 'var(--color-text-muted, #475569)' }}>{w.dayName}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: w.isToday ? '#ea580c' : 'var(--color-text-muted, #94a3b8)' }}>{w.fullDateStr}</div>
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
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text, #1e293b)', background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.5))', borderRadius: '0.65rem 0 0 0.65rem', border: '1px solid var(--color-border, rgba(255,255,255,1))', borderRight: 'none' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                                <button
                                  onClick={() => setSelectedMonthlyHabit(h)}
                                  style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text, #1e293b)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                  title="Aylık takvim ve detayını gör"
                                >
                                  <span>{h.label}</span>
                                  <span style={{ fontSize: '0.7rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '0.1rem 0.35rem', borderRadius: 4, fontWeight: 700 }}>📅 Aylık</span>
                                </button>
                                {count === 7 && <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.15rem 0.45rem', borderRadius: 4, fontWeight: 900 }}>⚡ 7/7</span>}
                              </div>
                            </td>

                            {/* Seri Badgesi */}
                            <td style={{ textAlign: 'center', background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.5))', border: '1px solid var(--color-border, rgba(255,255,255,1))', borderLeft: 'none', borderRight: 'none', padding: '0.4rem 0.25rem' }}>
                              <button
                                onClick={() => setSelectedMonthlyHabit(h)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.2rem 0.55rem', borderRadius: '1rem',
                                  background: streakInfo.currentStreak >= 3 ? 'rgba(234, 88, 12, 0.15)' : 'var(--color-surface, #f1f5f9)',
                                  color: streakInfo.currentStreak >= 3 ? '#f97316' : 'var(--color-text-muted, #64748b)',
                                  fontWeight: 900, fontSize: '0.75rem', border: streakInfo.currentStreak >= 3 ? '1px solid rgba(234, 88, 12, 0.35)' : '1px solid var(--color-border, #e2e8f0)',
                                  cursor: 'pointer'
                                }}
                                title="Aylık takvimi incele"
                              >
                                🔥 {streakInfo.currentStreak} Gün
                              </button>
                            </td>

                            {/* Günlük Kutucuklar */}
                            {weekDates.map((w) => {
                              const d = w.dayName;
                              const isChecked = h.days?.[d];
                              const isToday = w.isToday;

                              return (
                                <td key={d} style={{ textAlign: 'center', background: isToday ? 'rgba(234, 88, 12, 0.08)' : 'var(--color-surface-hover, #f8fafc)', border: isToday ? '1px solid #fb923c' : '1px solid var(--color-border, #e2e8f0)', borderLeft: 'none', borderRight: 'none', padding: 4 }}>
                                  <button
                                    onClick={() => toggleHabitDay(h.id, d, w.isoDate)}
                                    style={{
                                      width: 32, height: 32, borderRadius: '50%',
                                      background: isChecked ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'var(--color-surface, white)',
                                      border: isChecked ? 'none' : isToday ? '2px solid #fb923c' : '2px solid var(--color-border-input, #cbd5e1)',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto',
                                      transition: 'all 0.15s',
                                      boxShadow: isChecked ? '0 2px 6px rgba(220, 38, 38, 0.3)' : 'none'
                                    }}
                                    title={`${d} - ${w.fullDateStr}${isToday ? ' (Bugün)' : ''}`}
                                  >
                                    {isChecked && <Check size={14} color="white" strokeWidth={3} />}
                                  </button>
                                </td>
                              );
                            })}

                            <td style={{ background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.5))', borderRadius: '0 0.65rem 0.65rem 0', border: '1px solid var(--color-border, rgba(255,255,255,1))', borderLeft: 'none', textAlign: 'center' }}>
                              <button onClick={() => setHabits(p => p.filter(x => x.id !== h.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted, #cbd5e1)', padding: 4 }} title="Sil">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ═══ DENEME SONUÇLARIM ═══ */}
        {activeTab === 'denemeler' && (
          <div>
            <Tip>Çözdüğün online sınavlar buraya otomatik yansır. Dışarıda girdiğin denemeleri de yukarıdaki buton ile ekleyebilirsin!</Tip>

            {/* Top Action Bar with Add Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', background: 'var(--color-surface, rgba(255, 255, 255, 0.5))', padding: '0.85rem 1.1rem', borderRadius: '1rem', border: '1px solid var(--color-border, rgba(255,255,255,1))', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text, #0f172a)' }}>Harici / Fiziki Deneme Kaydı</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>Fiziki girdiğin denemelerin D/Y/B ve netlerini açılır pencereden kolayca ekle.</div>
              </div>
              <button onClick={() => setShowMockModal(true)} style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.1rem', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
                <Plus size={16} /> ➕ Yeni Deneme Sonucu Ekle
              </button>
            </div>

            {/* 🏆 GENEL DENEME SINAVLARI */}
            {generalTrialExams.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted, #94a3b8)', padding: '3rem', fontWeight: 700 }}>
                <BarChart3 size={40} color="var(--color-border, #e2e8f0)" style={{ margin: '0 auto 1rem' }} />
                Henüz çözülmüş veya eklenmiş Genel Deneme Sınavı yok.
              </div>
            )}

            {generalTrialExams.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--color-text, #0f172a)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🏆</span> Genel Testler ({generalTrialExams.length})
                </div>

                {/* Gelişim Grafiği */}
                {generalTrialExams.length > 0 && (
                  <div style={{ background: 'var(--color-surface, rgba(255, 255, 255, 0.5))', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid var(--color-border, rgba(255,255,255,1))', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--color-text, #334155)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendingUp size={18} style={{ color: '#7c3aed' }} /> Net Gelişim Grafiği
                      </div>
                      <select 
                        value={chartMetric} 
                        onChange={(e) => setChartMetric(e.target.value)}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border-input, #cbd5e1)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text, #334155)', background: 'var(--color-surface, white)', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="Toplam Net">Genel (Toplam Net)</option>
                        {Array.from(new Set(generalTrialExams.flatMap(e => Object.keys(e.scores || {})))).map((s, idx) => (
                          <option key={`${s}_${idx}`} value={s}>{s} Net</option>
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
                           return {
                              name: s.title ? (s.title.length > 12 ? s.title.substring(0, 10) + '..' : s.title) : `Deneme ${i+1}`,
                              net: parseFloat(Number(net).toFixed(2)),
                              fullTitle: s.title || `Deneme ${i+1}`,
                              date: s.date
                           };
                        })}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, rgba(226, 232, 240, 0.6))" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted, #64748b)' }} />
                          <YAxis domain={[0, 'dataMax + 5']} tick={{ fontSize: 11, fill: 'var(--color-text-muted, #64748b)' }} />
                          <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Line type="monotone" dataKey="net" stroke="#7c3aed" strokeWidth={3} dot={{ fill: '#7c3aed', r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Özet istatistik */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Toplam Deneme', value: generalTrialExams.length, color: '#a855f7' },
                    { label: 'Ortalama Net', value: (generalTrialExams.reduce((s, x) => s + (x.totalNet || 0), 0) / generalTrialExams.length).toFixed(1), color: '#3b82f6' },
                    { label: 'En Yüksek Net', value: Math.max(...generalTrialExams.map(x => x.totalNet || 0)).toFixed(1), color: '#10b981' },
                    { label: 'Son Deneme', value: generalTrialExams[0]?.totalNet ?? '—', color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--color-surface, rgba(255, 255, 255, 0.7))', backdropFilter: 'blur(12px)', borderRadius: '0.85rem', padding: '0.85rem 1rem', border: '1px solid var(--color-border, rgba(255,255,255,1))', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--color-text-muted, #64748b)', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Deneme Listesi */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {generalTrialExams.map((s, i) => (
                    <div key={s.id || i} style={{ background: 'var(--color-surface, rgba(255, 255, 255, 0.7))', backdropFilter: 'blur(12px)', borderRadius: '1rem', border: i === 0 ? '1.5px solid rgba(124, 58, 237, 0.3)' : '1px solid var(--color-border, rgba(255,255,255,1))', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text, #1e293b)' }}>{s.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span>📅 {s.date}</span>
                            {s.sourceType === 'manual' ? (
                              <span style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontSize: '0.7rem' }}>Fiziki Giriş</span>
                            ) : (
                              <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontSize: '0.7rem' }}>Optik / Online</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#7c3aed' }}>{s.totalNet} Net</div>
                            {s.totalQuestions > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)' }}>{s.totalQuestions} Soru</div>}
                          </div>

                          {s.sourceType === 'manual' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`"${s.title}" denemesini silmek istediğinize emin misiniz?`)) {
                                  deleteMockExam(s.id);
                                }
                              }}
                              title="Denemeyi Sil"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted, #94a3b8)', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted, #94a3b8)'}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Score breakdown per subject */}
                      {s.scores && Object.keys(s.scores).length > 0 && (
                        <div style={{ padding: '0 1.25rem 1rem' }}>
                          <div style={{ borderTop: '1px dashed var(--color-border, #e2e8f0)', paddingTop: '0.75rem' }}>
                            <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ color: 'var(--color-text-muted, #64748b)', textAlign: 'left' }}>
                                  <th style={{ padding: '0.5rem', borderBottom: '2px solid var(--color-border, #e2e8f0)' }}>Ders</th>
                                  <th style={{ padding: '0.5rem', borderBottom: '2px solid var(--color-border, #e2e8f0)', textAlign: 'center' }}>Doğru (D)</th>
                                  <th style={{ padding: '0.5rem', borderBottom: '2px solid var(--color-border, #e2e8f0)', textAlign: 'center' }}>Yanlış (Y)</th>
                                  <th style={{ padding: '0.5rem', borderBottom: '2px solid var(--color-border, #e2e8f0)', textAlign: 'center' }}>Boş (B)</th>
                                  <th style={{ padding: '0.5rem', borderBottom: '2px solid var(--color-border, #e2e8f0)', textAlign: 'center' }}>Net</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(s.scores).map(([subName, sc], idx) => (
                                  <tr key={`${subName}_${idx}`} style={{ background: idx % 2 === 0 ? 'var(--color-surface-hover, rgba(255,255,255,0.4))' : 'transparent', borderBottom: '1px solid var(--color-border, #e2e8f0)' }}>
                                    <td style={{ padding: '0.5rem', fontWeight: 700, color: 'var(--color-text, #334155)' }}>{subName}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{sc.d || 0}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{sc.y || 0}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 700 }}>{sc.b || 0}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: '#a855f7', fontWeight: 900 }}>{Number(sc.net || 0).toFixed(2)}</td>
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

        {/* ═══ OKUL YAZILI NOTLARIM ═══ */}
        {activeTab === 'yazilinotlari' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Tip>Okuldaki 1. ve 2. dönem yazılı notlarını girmek için Ortaokul veya Lise şablonunu seç. Kutucuklara notlarını yazabilir, alt taraftan seçmeli ders de ekleyebilirsin!</Tip>

            {/* Özet İstatistik Kartları */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', borderRadius: '1rem', padding: '1.15rem', color: 'white', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.2)' }}>
                <div style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: 700, marginBottom: 4 }}>YAZILI ORTALAMASI</div>
                <div style={{ fontSize: '2rem', fontWeight: 900 }}>{schoolGradesAvg !== null ? `${schoolGradesAvg} Puan` : '—'}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: 4 }}>{schoolGrades.length} Yazılı Kayıtlı</div>
              </div>

              <div style={{ background: 'var(--color-surface, rgba(255, 255, 255, 0.7))', backdropFilter: 'blur(16px)', borderRadius: '1rem', padding: '1.15rem', border: '1px solid var(--color-border, rgba(255,255,255,1))' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700, marginBottom: 4 }}>EN YÜKSEK NOT</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>
                  {schoolGrades.length > 0 ? `${Math.max(...schoolGrades.map(g => parseFloat(g.score) || 0))}` : '—'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)', marginTop: 4 }}>En başarılı yazılınız</div>
              </div>

              <div style={{ background: 'var(--color-surface, rgba(255, 255, 255, 0.7))', backdropFilter: 'blur(16px)', borderRadius: '1rem', padding: '1.15rem', border: '1px solid var(--color-border, rgba(255,255,255,1))' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700, marginBottom: 4 }}>DERS ÇEŞİDİ</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b' }}>
                  {new Set(schoolGrades.map(g => g.subject)).size} Ders
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)', marginTop: 4 }}>Not girilen ders sayısı</div>
              </div>
            </div>

            {/* Şablon Seçim Modu Butonları */}
            <div style={{ display: 'flex', gap: '0.65rem', background: 'var(--color-surface, rgba(255, 255, 255, 0.7))', backdropFilter: 'blur(16px)', padding: '0.75rem', borderRadius: '1rem', border: '1px solid var(--color-border, rgba(255,255,255,1))' }}>
              <button
                onClick={() => setGradeTemplateMode('ortaokul')}
                style={{
                  flex: 1, padding: '0.75rem 1rem', borderRadius: '0.65rem', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  background: gradeTemplateMode === 'ortaokul' ? '#4f46e5' : 'var(--color-surface-hover, #f8fafc)',
                  color: gradeTemplateMode === 'ortaokul' ? 'white' : 'var(--color-text-muted, #475569)',
                  border: gradeTemplateMode === 'ortaokul' ? 'none' : '1px solid var(--color-border-input, #cbd5e1)',
                  transition: 'all 0.15s'
                }}
              >
                🏫 Ortaokul Şablonu
              </button>

              <button
                onClick={() => setGradeTemplateMode('lise')}
                style={{
                  flex: 1, padding: '0.75rem 1rem', borderRadius: '0.65rem', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  background: gradeTemplateMode === 'lise' ? '#7c3aed' : 'var(--color-surface-hover, #f8fafc)',
                  color: gradeTemplateMode === 'lise' ? 'white' : 'var(--color-text-muted, #475569)',
                  border: gradeTemplateMode === 'lise' ? 'none' : '1px solid var(--color-border-input, #cbd5e1)',
                  transition: 'all 0.15s'
                }}
              >
                🏛️ Lise Şablonu
              </button>
            </div>

            {/* Tablo Görünümü */}
            {(() => {
              const templateSubjects = SCHOOL_LEVEL_TEMPLATES[gradeTemplateMode]?.subjects || [];
              const extraFromGrades = schoolGrades.map(g => g.subject).filter(s => !templateSubjects.includes(s));
              const allSubjectsForTable = Array.from(new Set([...templateSubjects, ...customSubjects, ...extraFromGrades]));

              return (
                <div style={{ background: 'var(--color-surface, rgba(255, 255, 255, 0.7))', backdropFilter: 'blur(16px)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid var(--color-border, rgba(255,255,255,1))', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text, #1e293b)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{SCHOOL_LEVEL_TEMPLATES[gradeTemplateMode].name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600 }}>Kutucuklara doğrudan puanınızı girin</span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                      <thead>
                        <tr style={{ background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.5))', borderBottom: '2px solid var(--color-border, #e2e8f0)' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-muted, #475569)', fontWeight: 800 }}>Ders</th>
                          {EXAM_TERMS.map(term => (
                            <th key={term} style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-muted, #475569)', fontWeight: 800, width: 110 }}>
                              {term}
                            </th>
                          ))}
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-muted, #475569)', fontWeight: 800, width: 90 }}>Ders Ort.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSubjectsForTable.map((subject, idx) => {
                          const isCustom = !templateSubjects.includes(subject);
                          const subGrades = schoolGrades.filter(g => g.subject === subject);
                          const subScores = subGrades.map(g => parseFloat(g.score)).filter(s => !isNaN(s));
                          const subAvg = subScores.length > 0 ? (subScores.reduce((a, b) => a + b, 0) / subScores.length).toFixed(1) : '—';

                          return (
                            <tr key={`${subject}_${idx}`} style={{ borderBottom: '1px solid var(--color-border, #f1f5f9)' }}>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  {isCustom && <span style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', padding: '0.1rem 0.4rem', borderRadius: 4, fontWeight: 700 }}>Seçmeli</span>}
                                  <span>{subject}</span>
                                </div>
                                {isCustom && (
                                  <button
                                    onClick={() => deleteCustomSubject(subject)}
                                    title="Seçmeli Dersi ve Notlarını Sil"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted, #cbd5e1)', padding: 2 }}
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
                                      placeholder="—"
                                      value={currentVal}
                                      onChange={(e) => handleGradeInputChange(subject, term, e.target.value)}
                                      style={{
                                        width: 75, padding: '0.45rem', textAlign: 'center', borderRadius: '0.4rem',
                                        border: currentVal !== '' ? '1.5px solid #6366f1' : '1px solid var(--color-border-input, #cbd5e1)',
                                        background: currentVal !== '' ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-surface, white)',
                                        fontWeight: 800, fontSize: '0.9rem', color: currentVal !== '' ? '#818cf8' : 'var(--color-text, #334155)'
                                      }}
                                    />
                                  </td>
                                );
                              })}

                              <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', color: subAvg !== '—' ? '#10b981' : 'var(--color-text-muted, #94a3b8)' }}>
                                {subAvg}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Liste Altında Seçmeli / Ekstra Ders Ekle Formu */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); addCustomSubject(); }}
                    style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--color-border, #e2e8f0)', alignItems: 'center' }}
                  >
                    <input
                      type="text"
                      placeholder="➕ Liste dışı veya seçmeli ders adı ekleyin (ör: Almanca, Müzik, Görsel Sanatlar)..."
                      value={newCustomSubjectInput}
                      onChange={(e) => setNewCustomSubjectInput(e.target.value)}
                      style={{ flex: 1, padding: '0.6rem 0.85rem', borderRadius: '0.5rem', border: '1px solid var(--color-border-input, #cbd5e1)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text, #1e293b)', background: 'var(--color-surface, white)' }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0.6rem 1.25rem', borderRadius: '0.5rem', background: '#4f46e5', color: 'white', border: 'none',
                        fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                        boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)', whiteSpace: 'nowrap'
                      }}
                    >
                      <Plus size={16} /> Seçmeli Ders Satırı Ekle
                    </button>
                  </form>
                </div>
              );
            })()}
          </div>
        )}

        {/* ═══ TESTLERİM (ÖDEV VE KONU TESTLERİ SEKME) ═══ */}
        {activeTab === 'testlerim' && (
          <div>
            <Tip>Sistemde veya ödevler sekmesinde çözdüğün tüm konu testleri ve ödev sonuçların burada ders bazında düzenli olarak listelenir.</Tip>

            {otherHomeworkSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', fontWeight: 700 }}>
                <ClipboardList size={40} color="#e2e8f0" style={{ margin: '0 auto 1rem' }} />
                Henüz çözülmüş ödev veya konu testi bulunmuyor.
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📝</span> Çözülen Ödevler & Konu Testlerim ({otherHomeworkSubmissions.length})
                </div>

                {/* Özet istatistik */}
                {(() => {
                  const hwTotalD = otherHomeworkSubmissions.reduce((s, x) => s + (x.correctCount || 0), 0);
                  const hwTotalY = otherHomeworkSubmissions.reduce((s, x) => s + (x.wrongCount || 0), 0);
                  const hwTotalB = otherHomeworkSubmissions.reduce((s, x) => s + (x.emptyCount || 0), 0);
                  const hwTotalQ = hwTotalD + hwTotalY + hwTotalB;
                  const hwSuccessRate = hwTotalQ > 0 ? Math.round((hwTotalD / hwTotalQ) * 100) : 0;

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                      {[
                        { label: 'Çözülen Test', value: otherHomeworkSubmissions.length, color: '#3b82f6' },
                        { label: 'Başarı Durumu', value: `%${hwSuccessRate}`, color: '#a855f7' },
                        { label: 'Toplam Doğru', value: hwTotalD, color: '#10b981' },
                        { label: 'Toplam Yanlış', value: hwTotalY, color: '#ef4444' },
                      ].map(s => (
                        <div key={s.label} style={{ background: 'var(--color-surface, rgba(255, 255, 255, 0.5))', borderRadius: '0.85rem', padding: '0.85rem', textAlign: 'center', border: '1px solid var(--color-border, rgba(255,255,255,1))' }}>
                          <div style={{ fontWeight: 900, fontSize: '1.3rem', color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700, marginTop: 2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Ders Filtreleri, Tarih Gruplama ve Arama Çubuğu */}
                {(() => {
                  const SUBJECT_ICONS = {
                    'Matematik': '📐',
                    'Türkçe': '📖',
                    'Fen Bilimleri': '🔬',
                    'Sosyal Bilgiler': '🌍',
                    'İngilizce': '🇬🇧',
                    'Din Kültürü': '🕌',
                    'Genel / Diğer': '📚'
                  };
                  const SUBJECT_COLORS = {
                    'Matematik': { text: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)' },
                    'Türkçe': { text: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)' },
                    'Fen Bilimleri': { text: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)' },
                    'Sosyal Bilgiler': { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)' },
                    'İngilizce': { text: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.35)' },
                    'Din Kültürü': { text: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.35)' },
                    'Genel / Diğer': { text: 'var(--color-text-muted, #64748b)', bg: 'var(--color-surface-hover, rgba(248, 250, 252, 0.7))', border: 'var(--color-border, #e2e8f0)' }
                  };

                  const formatDateTR = (dateStr) => {
                    if (!dateStr) return 'Tarih Belirtilmemiş';
                    try {
                      const d = new Date(dateStr);
                      if (isNaN(d.getTime())) return dateStr;
                      const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
                      const days = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
                      const isBugun = dateStr === today();
                      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${days[d.getDay()]}${isBugun ? ' (Bugün)' : ''}`;
                    } catch (e) {
                      return dateStr;
                    }
                  };

                  const subjectCounts = {};
                  otherHomeworkSubmissions.forEach(s => {
                    const subj = s.subject || 'Genel / Diğer';
                    subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
                  });
                  const availableSubjects = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]);

                  const filtered = otherHomeworkSubmissions.filter(s => {
                    if (hwSubjectFilter !== 'all' && (s.subject || 'Genel / Diğer') !== hwSubjectFilter) return false;
                    if (hwSearchQuery.trim()) {
                      const q = hwSearchQuery.toLowerCase().trim();
                      const matchTitle = (s.title || '').toLowerCase().includes(q);
                      const matchSubj = (s.subject || '').toLowerCase().includes(q);
                      const matchDate = (s.date || '').toLowerCase().includes(q);
                      if (!matchTitle && !matchSubj && !matchDate) return false;
                    }
                    return true;
                  });

                  // Derslere Göre Gruplar
                  const groupsBySubject = {};
                  filtered.forEach(s => {
                    const subj = s.subject || 'Genel / Diğer';
                    if (!groupsBySubject[subj]) groupsBySubject[subj] = [];
                    groupsBySubject[subj].push(s);
                  });
                  const subjectEntries = Object.entries(groupsBySubject).sort((a, b) => b[1].length - a[1].length);

                  // Tarihe / Günlere Göre Gruplar
                  const groupsByDate = {};
                  filtered.forEach(s => {
                    const d = s.date || 'Tarihsiz';
                    if (!groupsByDate[d]) groupsByDate[d] = [];
                    groupsByDate[d].push(s);
                  });
                  const dateEntries = Object.entries(groupsByDate).sort((a, b) => new Date(b[0]) - new Date(a[0]));

                  const currentEntries = hwGroupByMode === 'subject' ? subjectEntries : dateEntries;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Görünüm Modu ve Arama Çubuğu */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '0.75rem 0.9rem', background: 'var(--color-surface, rgba(255, 255, 255, 0.6))', borderRadius: '0.9rem', border: '1px solid var(--color-border, rgba(255,255,255,0.9))' }}>
                        {/* Görünüm Modu Seçici (Derslere Göre / Günlere Göre) */}
                        <div style={{ display: 'flex', gap: 6, background: 'var(--color-surface-hover, rgba(226, 232, 240, 0.8))', padding: 3, borderRadius: '0.65rem' }}>
                          <button
                            type="button"
                            onClick={() => setHwGroupByMode('subject')}
                            style={{
                              padding: '0.35rem 0.8rem',
                              borderRadius: '0.5rem',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              border: 'none',
                              background: hwGroupByMode === 'subject' ? 'var(--color-surface, white)' : 'transparent',
                              color: hwGroupByMode === 'subject' ? '#6366f1' : 'var(--color-text-muted, #64748b)',
                              boxShadow: hwGroupByMode === 'subject' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5
                            }}
                          >
                            <span>📚</span> Derslere Göre ({subjectEntries.length} Ders)
                          </button>
                          <button
                            type="button"
                            onClick={() => setHwGroupByMode('date')}
                            style={{
                              padding: '0.35rem 0.8rem',
                              borderRadius: '0.5rem',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              border: 'none',
                              background: hwGroupByMode === 'date' ? 'var(--color-surface, white)' : 'transparent',
                              color: hwGroupByMode === 'date' ? '#6366f1' : 'var(--color-text-muted, #64748b)',
                              boxShadow: hwGroupByMode === 'date' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5
                            }}
                          >
                            <span>📅</span> Günlere / Tarihe Göre ({dateEntries.length} Gün)
                          </button>
                        </div>

                        {/* Arama Kutusu (Yazı Rengi Net Koyu) */}
                        <div style={{ minWidth: 220, flex: '1 1 220px', maxWidth: 350 }}>
                          <input
                            type="text"
                            value={hwSearchQuery}
                            onChange={e => setHwSearchQuery(e.target.value)}
                            placeholder="🔍 Test, ders veya tarih ara..."
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.75rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: 'var(--color-text, #0f172a)',
                              background: 'var(--color-surface, #ffffff)',
                              borderRadius: '0.55rem',
                              border: '1.5px solid var(--color-border-input, #cbd5e1)',
                              outline: 'none',
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                            }}
                          />
                        </div>
                      </div>

                      {/* Ders Filtre Çipleri (Sadece Ders Modunda) */}
                      {hwGroupByMode === 'subject' && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setHwSubjectFilter('all')}
                            style={{
                              padding: '0.3rem 0.7rem',
                              borderRadius: '0.55rem',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              border: hwSubjectFilter === 'all' ? '1.5px solid #6366f1' : '1px solid var(--color-border, #e2e8f0)',
                              background: hwSubjectFilter === 'all' ? '#6366f1' : 'var(--color-surface, white)',
                              color: hwSubjectFilter === 'all' ? 'white' : 'var(--color-text-muted, #475569)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            🌐 Tüm Dersler ({otherHomeworkSubmissions.length})
                          </button>
                          {availableSubjects.map(([subj, count], idx) => {
                            const isSel = hwSubjectFilter === subj;
                            const col = SUBJECT_COLORS[subj] || SUBJECT_COLORS['Genel / Diğer'];
                            const ico = SUBJECT_ICONS[subj] || '📚';
                            return (
                              <button
                                key={`${subj}_${idx}`}
                                type="button"
                                onClick={() => setHwSubjectFilter(isSel ? 'all' : subj)}
                                style={{
                                  padding: '0.3rem 0.7rem',
                                  borderRadius: '0.55rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  border: isSel ? `1.5px solid ${col.text}` : `1px solid ${col.border}`,
                                  background: isSel ? col.text : col.bg,
                                  color: isSel ? 'white' : col.text,
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {ico} {subj} ({count})
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Tarihsel Hızlı Özet Şeridi (Sadece Tarih Modunda) */}
                      {hwGroupByMode === 'date' && dateEntries.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                          {dateEntries.slice(0, 10).map(([dStr, tests], idx) => {
                            const qCount = tests.reduce((a, b) => a + (b.correctCount || 0) + (b.wrongCount || 0) + (b.emptyCount || 0), 0);
                            const dCount = tests.reduce((a, b) => a + (b.correctCount || 0), 0);
                            const rate = qCount > 0 ? Math.round((dCount / qCount) * 100) : 0;
                            const isBugun = dStr === today();

                            return (
                              <div
                                key={`${dStr}_${idx}`}
                                onClick={() => setExpandedHwDates(prev => ({ ...prev, [dStr]: true }))}
                                style={{
                                  background: isBugun ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-surface-hover, rgba(255,255,255,0.7))',
                                  border: isBugun ? '1.5px solid #86efac' : '1px solid var(--color-border, #e2e8f0)',
                                  borderRadius: '0.65rem',
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.73rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                <span>{isBugun ? '📍 Bugün' : dStr}</span>
                                <span style={{ color: '#10b981', fontWeight: 800 }}>%{rate}</span>
                                <span style={{ color: 'var(--color-text-muted, #94a3b8)', fontSize: '0.68rem' }}>({tests.length}T)</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Boş Durum (Arama Sonucu Yoksa) */}
                      {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--color-surface, rgba(255, 255, 255, 0.6))', borderRadius: '1rem', border: '1px dashed var(--color-border, #cbd5e1)', color: 'var(--color-text-muted, #94a3b8)' }}>
                          <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🔍</div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Arama kriterlerine uygun test bulunamadı.</div>
                          <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Farklı bir ders veya arama kelimesi deneyebilirsin.</div>
                        </div>
                      )}

                      {/* ═══ GRUPLANMIŞ TEST KARTLARI ═══ */}
                      {filtered.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                          {/* ── 1. DERSLERE GÖRE GRUPLAMA ── */}
                          {hwGroupByMode === 'subject' && currentEntries.map(([subjName, tests], idx) => {
                            const isOpen = Boolean(expandedHwSubjects[subjName]);
                            const col = SUBJECT_COLORS[subjName] || SUBJECT_COLORS['Genel / Diğer'];
                            const ico = SUBJECT_ICONS[subjName] || '📚';

                            const grpD = tests.reduce((a, b) => a + (b.correctCount || 0), 0);
                            const grpY = tests.reduce((a, b) => a + (b.wrongCount || 0), 0);
                            const grpB = tests.reduce((a, b) => a + (b.emptyCount || 0), 0);
                            const grpTotalQ = grpD + grpY + grpB;
                            const grpRate = grpTotalQ > 0 ? Math.round((grpD / grpTotalQ) * 100) : 0;

                            return (
                              <div key={`${subjName}_${idx}`} style={{ background: 'var(--color-surface, rgba(255, 255, 255, 0.7))', backdropFilter: 'blur(12px)', borderRadius: '1rem', border: `1.5px solid ${col.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div
                                  onClick={() => setExpandedHwSubjects(prev => ({ ...prev, [subjName]: !prev[subjName] }))}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                    padding: '0.75rem 1rem',
                                    background: col.bg,
                                    cursor: 'pointer',
                                    borderBottom: isOpen ? `1.5px solid ${col.border}` : 'none',
                                    userSelect: 'none'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '1.1rem' }}>{ico}</span>
                                    <span style={{ fontWeight: 900, fontSize: '0.92rem', color: col.text }}>{subjName}</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: col.text, background: 'var(--color-surface, white)', border: `1px solid ${col.border}`, padding: '1px 7px', borderRadius: 99 }}>
                                      {tests.length} Test · {grpTotalQ} Soru
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                                      <span style={{ color: '#10b981', background: 'var(--color-surface, white)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '2px 6px', borderRadius: '0.4rem' }}>
                                        Ort. %{grpRate} Başarı
                                      </span>
                                      <span style={{ color: 'var(--color-text-muted, #475569)', background: 'var(--color-surface, white)', border: '1px solid var(--color-border, #e2e8f0)', padding: '2px 6px', borderRadius: '0.4rem' }}>
                                        ✅ {grpD} · ❌ {grpY}
                                      </span>
                                    </div>
                                    <div style={{ color: col.text, transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease', display: 'flex' }}>
                                      <ChevronDown size={18} strokeWidth={2.5} />
                                    </div>
                                  </div>
                                </div>

                                {isOpen && (
                                  <div style={{ padding: '0.85rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.4))' }}>
                                    {tests.map((s, i) => {
                                      const d = s.correctCount || 0;
                                      const y = s.wrongCount || 0;
                                      const b = s.emptyCount || 0;
                                      const totalQ = d + y + b;
                                      const rate = totalQ > 0 ? Math.round((d / totalQ) * 100) : 0;

                                      return (
                                        <div
                                          key={s.id || i}
                                          style={{
                                            background: 'var(--color-surface, white)',
                                            borderRadius: '0.75rem',
                                            border: '1px solid var(--color-border, #e2e8f0)',
                                            padding: '0.75rem 0.85rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                                          }}
                                        >
                                          <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                                              <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--color-text, #1e293b)' }}>
                                                {s.title || 'Konu Testi'}
                                              </span>
                                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: rate >= 70 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444', background: rate >= 70 ? 'rgba(16, 185, 129, 0.12)' : rate >= 50 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)', padding: '1px 6px', borderRadius: 4 }}>
                                                %{rate}
                                              </span>
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                              <span>📅 {formatCleanDate(s.date)}</span>
                                              {s.sourceType === 'online' && (
                                                <span style={{ color: '#0284c7', background: 'rgba(56, 189, 248, 0.12)', padding: '0 4px', borderRadius: 3, fontWeight: 700, fontSize: '0.65rem' }}>Online</span>
                                              )}
                                              {s.sourceType === 'optik' && (
                                                <span style={{ color: '#d97706', background: 'rgba(245, 158, 11, 0.12)', padding: '0 4px', borderRadius: 3, fontWeight: 700, fontSize: '0.65rem' }}>Optik</span>
                                              )}
                                            </div>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed var(--color-border, #f1f5f9)', fontSize: '0.73rem', fontWeight: 800 }}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                              <span style={{ color: '#10b981' }}>{d}D</span>
                                              <span style={{ color: '#ef4444' }}>{y}Y</span>
                                              {b > 0 && <span style={{ color: 'var(--color-text-muted, #94a3b8)' }}>{b}B</span>}
                                            </div>
                                            <div style={{ color: '#6366f1', fontWeight: 900 }}>
                                              {s.totalNet !== undefined ? `${s.totalNet} Net` : `${totalQ} Soru`}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* ── 2. GÜNLERE / TARİHE GÖRE GRUPLAMA ── */}
                          {hwGroupByMode === 'date' && currentEntries.map(([dateKey, tests], idx) => {
                            const isOpen = Boolean(expandedHwDates[dateKey]);
                            const isBugun = dateKey === today();

                            const grpD = tests.reduce((a, b) => a + (b.correctCount || 0), 0);
                            const grpY = tests.reduce((a, b) => a + (b.wrongCount || 0), 0);
                            const grpB = tests.reduce((a, b) => a + (b.emptyCount || 0), 0);
                            const grpTotalQ = grpD + grpY + grpB;
                            const grpRate = grpTotalQ > 0 ? Math.round((grpD / grpTotalQ) * 100) : 0;

                            return (
                              <div
                                key={`${dateKey}_${idx}`}
                                style={{
                                  background: 'var(--color-surface, rgba(255, 255, 255, 0.7))',
                                  backdropFilter: 'blur(12px)',
                                  borderRadius: '1rem',
                                  border: isBugun ? '2px solid #86efac' : '1.5px solid var(--color-border, #e2e8f0)',
                                  overflow: 'hidden',
                                  boxShadow: isBugun ? '0 4px 12px rgba(16,185,129,0.1)' : '0 2px 8px rgba(0,0,0,0.03)'
                                }}
                              >
                                <div
                                  onClick={() => setExpandedHwDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }))}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                    padding: '0.75rem 1rem',
                                    background: isBugun ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-surface-hover, rgba(248, 250, 252, 0.8))',
                                    cursor: 'pointer',
                                    borderBottom: isOpen ? (isBugun ? '1.5px solid #86efac' : '1.5px solid var(--color-border, #e2e8f0)') : 'none',
                                    userSelect: 'none'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '1.1rem' }}>{isBugun ? '🌟' : '📅'}</span>
                                    <span style={{ fontWeight: 900, fontSize: '0.92rem', color: 'var(--color-text, #1e293b)' }}>
                                      {formatCleanDate(dateKey)}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text, #475569)', background: 'var(--color-surface, white)', border: '1px solid var(--color-border, #e2e8f0)', padding: '1px 7px', borderRadius: 99 }}>
                                      {tests.length} Test · {grpTotalQ} Soru
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                                      <span style={{ color: '#10b981', background: 'var(--color-surface, white)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '2px 6px', borderRadius: '0.4rem' }}>
                                        Ort. %{grpRate} Başarı
                                      </span>
                                      <span style={{ color: 'var(--color-text-muted, #475569)', background: 'var(--color-surface, white)', border: '1px solid var(--color-border, #e2e8f0)', padding: '2px 6px', borderRadius: '0.4rem' }}>
                                        ✅ {grpD} · ❌ {grpY}
                                      </span>
                                    </div>
                                    <div style={{ color: 'var(--color-text-muted, #64748b)', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease', display: 'flex' }}>
                                      <ChevronDown size={18} strokeWidth={2.5} />
                                    </div>
                                  </div>
                                </div>

                                {isOpen && (
                                  <div style={{ padding: '0.85rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.4))' }}>
                                    {tests.map((s, i) => {
                                      const d = s.correctCount || 0;
                                      const y = s.wrongCount || 0;
                                      const b = s.emptyCount || 0;
                                      const totalQ = d + y + b;
                                      const rate = totalQ > 0 ? Math.round((d / totalQ) * 100) : 0;
                                      const col = SUBJECT_COLORS[s.subject] || SUBJECT_COLORS['Genel / Diğer'];
                                      const ico = SUBJECT_ICONS[s.subject] || '📚';

                                      return (
                                        <div
                                          key={s.id || i}
                                          style={{
                                            background: 'var(--color-surface, white)',
                                            borderRadius: '0.75rem',
                                            border: `1.5px solid ${col.border}`,
                                            padding: '0.75rem 0.85rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                                          }}
                                        >
                                          <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                                              <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--color-text, #1e293b)' }}>
                                                {s.title || 'Konu Testi'}
                                              </span>
                                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: rate >= 70 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444', background: rate >= 70 ? 'rgba(16, 185, 129, 0.12)' : rate >= 50 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)', padding: '1px 6px', borderRadius: 4 }}>
                                                %{rate}
                                              </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: col.text, background: col.bg, border: `1px solid ${col.border}`, padding: '1px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {ico} {s.subject || 'Genel'}
                                              </span>
                                              {s.sourceType === 'online' && (
                                                <span style={{ color: '#0284c7', background: 'rgba(56, 189, 248, 0.12)', padding: '0 4px', borderRadius: 3, fontWeight: 700, fontSize: '0.65rem' }}>Online</span>
                                              )}
                                              {s.sourceType === 'optik' && (
                                                <span style={{ color: '#d97706', background: 'rgba(245, 158, 11, 0.12)', padding: '0 4px', borderRadius: 3, fontWeight: 700, fontSize: '0.65rem' }}>Optik</span>
                                              )}
                                            </div>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed var(--color-border, #f1f5f9)', fontSize: '0.73rem', fontWeight: 800 }}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                              <span style={{ color: '#10b981' }}>{d}D</span>
                                              <span style={{ color: '#ef4444' }}>{y}Y</span>
                                              {b > 0 && <span style={{ color: 'var(--color-text-muted, #94a3b8)' }}>{b}B</span>}
                                            </div>
                                            <div style={{ color: '#6366f1', fontWeight: 900 }}>
                                              {s.totalNet !== undefined ? `${s.totalNet} Net` : `${totalQ} Soru`}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                        </div>
                      )}

                    </div>
                  );
                })()}

              </div>
            )}
          </div>
        )}

        {/* ─── MODAL: Manuel Deneme Girişi ─── */}
        {showMockModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0.5rem' : '1rem', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ background: 'var(--color-surface, #ffffff)', borderRadius: isMobile ? '1.1rem' : '1.25rem', padding: isMobile ? '1.1rem 0.9rem' : '1.5rem', width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto', border: '1.5px solid var(--color-border, #e2e8f0)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1.5px solid var(--color-border, #f1f5f9)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '0.65rem', background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.1rem' }}>
                    📝
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>Fiziki Deneme Sınavı Ekle</h3>
                    <div style={{ fontSize: isMobile ? '0.68rem' : '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600 }}>Ders bazlı doğru ve yanlışlarını gir, netin hesaplansın</div>
                  </div>
                </div>
                <button type="button" onClick={() => setShowMockModal(false)} style={{ background: 'var(--color-surface-hover, #f1f5f9)', border: 'none', borderRadius: '0.5rem', padding: '0.4rem', cursor: 'pointer', display: 'flex', color: 'var(--color-text-muted, #64748b)' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateManualMock}>
                {/* Title & Date */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted, #475569)', display: 'block', marginBottom: 4 }}>DENEME ADI / YAYIN *</label>
                    <input style={inp} value={newManualMock.title} onChange={e => setNewManualMock(p => ({ ...p, title: e.target.value }))} placeholder="Örn: Özdebir Türkiye Geneli LGS-3" required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted, #475569)', display: 'block', marginBottom: 4 }}>SINAV TARİHİ</label>
                    <input style={inp} type="date" value={newManualMock.date} onChange={e => setNewManualMock(p => ({ ...p, date: e.target.value }))} />
                  </div>
                </div>

                {/* Subject Table / Grid */}
                <div style={{ border: '1.5px solid var(--color-border, #e2e8f0)', borderRadius: '0.85rem', overflowX: 'auto', marginBottom: '0.85rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 320 }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.5))', borderBottom: '1.5px solid var(--color-border, #e2e8f0)', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, fontSize: '0.73rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Ders</th>
                        <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#10b981', width: 60 }}>D</th>
                        <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#ef4444', width: 60 }}>Y</th>
                        <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#f59e0b', width: 60 }}>B</th>
                        <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#a855f7', width: 75 }}>Net</th>
                        <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', width: 32 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(newManualMock.subjects).map((subName, idx) => {
                        const sub = newManualMock.subjects[subName];
                        const total = Object.keys(newManualMock.subjects).length;
                        return (
                          <tr key={`${subName}_${idx}`} style={{ borderBottom: idx < total - 1 ? '1px solid var(--color-border, #f1f5f9)' : 'none', background: idx % 2 === 0 ? 'var(--color-surface, white)' : 'var(--color-surface-hover, #fafafa)' }}>
                            <td style={{ padding: '0.55rem 0.75rem', fontWeight: 800, color: 'var(--color-text, #1e293b)', whiteSpace: 'nowrap' }}>{subName}</td>
                            <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                              <input type="number" min="0" style={{ ...inp, padding: '0.3rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, borderColor: 'rgba(16, 185, 129, 0.4)' }}
                                value={sub.d} onChange={e => updateSubjectScore(subName, 'd', e.target.value)} placeholder="0" />
                            </td>
                            <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                              <input type="number" min="0" style={{ ...inp, padding: '0.3rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, borderColor: 'rgba(239, 68, 68, 0.4)' }}
                                value={sub.y} onChange={e => updateSubjectScore(subName, 'y', e.target.value)} placeholder="0" />
                            </td>
                            <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                              <input type="number" min="0" style={{ ...inp, padding: '0.3rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, borderColor: 'rgba(245, 158, 11, 0.4)' }}
                                value={sub.b} onChange={e => updateSubjectScore(subName, 'b', e.target.value)} placeholder="0" />
                            </td>
                            <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                              <input type="number" step="0.25" style={{ ...inp, padding: '0.3rem', textAlign: 'center', fontSize: '0.82rem', fontWeight: 900, color: '#a855f7', background: 'rgba(124, 58, 237, 0.1)', borderColor: 'rgba(124, 58, 237, 0.3)' }}
                                value={sub.net} onChange={e => updateSubjectScore(subName, 'net', e.target.value)} placeholder="0.00" />
                            </td>
                            <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                              <button type="button" onClick={() => removeSubjectFromMock(subName)} title="Dersi kaldır"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted, #cbd5e1)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted, #cbd5e1)'}>
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Ders Ekle Satırı */}
                <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap', background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.5))', border: '1.5px dashed rgba(99, 102, 241, 0.4)', borderRadius: '0.85rem', padding: '0.65rem 0.85rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', whiteSpace: 'nowrap' }}>➕ Ders Ekle:</span>
                  <select
                    value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    style={{ ...inp, flex: '1 1 140px', minWidth: 120, padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                  >
                    <option value="">— Ders seç veya yaz —</option>
                    {['Türkçe','Matematik','Fen Bilimleri','Sosyal Bilgiler','İngilizce','Din Kültürü','Yabancı Dil','Tarih','Coğrafya','Fizik','Kimya','Biyoloji','Edebiyat','Geometri','TYT Türkçe','TYT Matematik','TYT Fen','TYT Sosyal']
                      .filter(s => !newManualMock.subjects[s])
                      .map((s, idx) => <option key={`${s}_${idx}`} value={s}>{s}</option>)
                    }
                  </select>
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubjectToMock())}
                    placeholder="veya özel ders adı"
                    style={{ ...inp, flex: '1 1 120px', minWidth: 100, padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                  />
                  <button
                    type="button"
                    onClick={addSubjectToMock}
                    disabled={!newSubjectName.trim() || !!newManualMock.subjects[newSubjectName.trim()]}
                    style={{ background: newSubjectName.trim() && !newManualMock.subjects[newSubjectName.trim()] ? '#6366f1' : 'var(--color-surface, #e2e8f0)', color: newSubjectName.trim() && !newManualMock.subjects[newSubjectName.trim()] ? 'white' : 'var(--color-text-muted, #94a3b8)', border: 'none', borderRadius: '0.6rem', padding: '0.4rem 0.9rem', fontWeight: 800, fontSize: '0.82rem', cursor: newSubjectName.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                  >
                    Ekle
                  </button>
                </div>

                {/* Summary Bar */}
                <div style={{ background: 'rgba(124, 58, 237, 0.1)', border: '1.5px solid rgba(124, 58, 237, 0.3)', borderRadius: '0.85rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text, #4c1d95)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>✅ {totalMockD} D</span>
                    <span>❌ {totalMockY} Y</span>
                    <span>⭕ {totalMockB} B</span>
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#a855f7' }}>
                    Toplam Net: <span style={{ fontSize: '1.15rem', color: '#a855f7' }}>{totalMockNet.toFixed(2)}</span>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" onClick={() => setShowMockModal(false)} style={{ background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.6))', color: 'var(--color-text-muted, #64748b)', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.2rem', fontWeight: 800, fontSize: '0.83rem', cursor: 'pointer' }}>
                    Vazgeç
                  </button>
                  <button type="submit" style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.4rem', fontWeight: 900, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
                    <Plus size={16} /> Kaydet
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      {/* ═══ AYLIK ALIŞKANLIK DETAY MODALI ═══ */}
      {selectedMonthlyHabit && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: isMobile ? '0.5rem' : '1rem'
        }}>
          <div style={{
            background: 'var(--color-surface, #ffffff)', borderRadius: isMobile ? '1.1rem' : '1.25rem', width: '100%', maxWidth: 540,
            padding: isMobile ? '1.1rem 0.9rem' : '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid var(--color-border, #e2e8f0)',
            display: 'flex', flexDirection: 'column', gap: isMobile ? '0.9rem' : '1.25rem', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border, #e2e8f0)', paddingBottom: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>📅 Aylık Takvim & Geçmiş</div>
                <h2 style={{ fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 900, color: 'var(--color-text, #1e293b)', margin: '2px 0 0 0' }}>
                  {selectedMonthlyHabit.label}
                </h2>
              </div>
              <button
                onClick={() => setSelectedMonthlyHabit(null)}
                style={{ background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.6))', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted, #64748b)' }}
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
                    <div style={{ background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.5))', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--color-border, rgba(255,255,255,1))', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>BU AY</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', marginTop: 2 }}>{checkedInMonth} / {totalDaysInMonth}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 600 }}>Tamamlanan gün</div>
                    </div>

                    <div style={{ background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.5))', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--color-border, rgba(255,255,255,1))', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>BAŞARI ORANI</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#3b82f6', marginTop: 2 }}>%{percentage}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 600 }}>Aylık başarım</div>
                    </div>

                    <div style={{ background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.5))', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--color-border, rgba(255,255,255,1))', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>AKTİF SERİ</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444', marginTop: 2 }}>🔥 {streakInfo.currentStreak} Gün</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 600 }}>Kesintisiz zincir</div>
                    </div>
                  </div>

                  {/* Monthly Calendar Grid */}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text, #334155)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>📅 {monthInfo.monthName} {monthInfo.year} Takvimi</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 600 }}>Güne tıklayarak durumu değiştirebilirsin</span>
                    </div>

                    {/* Grid Header Days */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 4 }}>
                      {['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'].map(d => (
                        <div key={d} style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', padding: '0.2rem' }}>{d}</div>
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
                              height: 42, borderRadius: '0.5rem', border: d.isToday ? '2px solid #ef4444' : '1px solid var(--color-border, #e2e8f0)',
                              background: isChecked ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'var(--color-surface-hover, #f8fafc)',
                              color: isChecked ? 'white' : 'var(--color-text, #334155)', cursor: 'pointer',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s', position: 'relative'
                            }}
                            title={`${d.dayNum} ${monthInfo.monthName} (${d.dayOfWeek})`}
                          >
                            <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>{d.dayNum}</span>
                            {isChecked && <Check size={12} strokeWidth={3} style={{ marginTop: 1 }} />}
                            {d.isToday && !isChecked && <span style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 900 }}>BUGÜN</span>}
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

      {/* ── FLOATING SAVE (Mobile: Above Bottom Nav / Desktop: Bottom-Right) ── */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          bottom: isMobile ? 'calc(62px + env(safe-area-inset-bottom) + 12px)' : '1.5rem',
          right: isMobile ? '0.85rem' : '1.5rem',
          zIndex: 80,
          pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease'
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          style={{
            pointerEvents: 'auto',
            background: saved ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: 'white',
            border: isMobile ? '1.5px solid rgba(255,255,255,0.45)' : '1px solid rgba(255,255,255,0.3)',
            borderRadius: isMobile ? '99px' : '1rem',
            padding: isMobile ? '0.55rem 1.15rem' : '0.75rem 1.5rem',
            fontWeight: 900,
            fontSize: isMobile ? '0.82rem' : '0.88rem',
            cursor: 'pointer',
            boxShadow: saved ? '0 6px 20px rgba(16,185,129,0.5)' : '0 8px 24px rgba(124,58,237,0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 6 : 8,
            backdropFilter: 'blur(8px)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1)'
          }}
        >
          {saved ? <><CheckCircle2 size={isMobile ? 16 : 18} /> Kaydedildi!</> : <><Save size={isMobile ? 16 : 18} /> Kaydet</>}
        </button>
      </div>

      {/* ── COACHING REPORT MODAL ── */}
      <CoachingReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        studentName={targetStudent?.name || personalInfo?.fullName || currentUser?.name || 'Öğrenci'}
        gradeClass={personalInfo?.gradeClass || goals?.gradeClass || '8. Sınıf'}
        targetExam={goals?.examGoalType || 'LGS 2026'}
        targetSchool={goals?.targetSchool || ''}
        targetNet={goals?.targetNet || ''}
        targetScore={goals?.targetScore || ''}
        weeklyProgram={weeklyProgram || []}
        mockExams={generalTrialExams || []}
        counterGoals={goals?.counterGoals || []}
        teacherNote={personalInfo?.coachNotes || ''}
        submissions={submissions || []}
        homeworkSubmissions={otherHomeworkSubmissions || []}
      />

    </div>
  );
}