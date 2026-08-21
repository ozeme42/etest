import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlayCircle, Target, AlertCircle, Timer, BookOpen, Check,
  Sparkles, Trophy, Flame, GraduationCap, BarChart3, Clock,
  Calendar, CheckCircle2, X, Plus, ExternalLink, Zap,
  ChevronRight, ChevronDown, ChevronUp, Star, TrendingUp, BookMarked, CalendarDays,
  Ruler, TestTube2, BookCopy, Globe, MessageSquare,
  FileText, ClipboardList, ArrowRight, RefreshCw, ClipboardCheck, Eye, RotateCcw,
  CheckSquare, Award, ArrowUpRight, Brain
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
import { useTheme } from '../context/ThemeContext';
import { isHomeworkForStudent, sortItemsByBookOrder, computeStudentAnalyticsData } from '../utils/testResolver';
import { toUUID } from '../services/supabaseService';
import { getTurkeyYMD, getTurkeyToday, getTurkeyWeekRange, getTurkeyMonthRange } from '../utils/dateHelpers';
import ManualTestModal from '../components/ManualTestModal';

const SUBJECT_ROW_THEMES = {
  'matematik':       { bg: '#f0f7ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1d4ed8', badgeBg: '#dbeafe' },
  'türkçe':          { bg: '#fff1f2', border: '#fecdd3', accent: '#f43f5e', text: '#be123c', badgeBg: '#ffe4e6' },
  'fen':             { bg: '#f0fdf4', border: '#bbf7d0', accent: '#10b981', text: '#15803d', badgeBg: '#dcfce7' },
  'sosyal':          { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', text: '#b45309', badgeBg: '#fef3c7' },
  'inkılap':         { bg: '#fff7ed', border: '#fed7aa', accent: '#ea580c', text: '#c2410c', badgeBg: '#ffedd5' },
  'ingilizce':       { bg: '#faf5ff', border: '#e9d5ff', accent: '#8b5cf6', text: '#6d28d9', badgeBg: '#f3e8ff' },
  'yabancı dil':     { bg: '#faf5ff', border: '#e9d5ff', accent: '#8b5cf6', text: '#6d28d9', badgeBg: '#f3e8ff' },
  'din':             { bg: '#ecfeff', border: '#a5f3fc', accent: '#06b6d4', text: '#0e7490', badgeBg: '#cffafe' },
  'geometri':        { bg: '#f0fdfa', border: '#99f6e4', accent: '#0d9488', text: '#0f766e', badgeBg: '#ccfbf1' },
  'fizik':           { bg: '#f5f3ff', border: '#ddd6fe', accent: '#6366f1', text: '#4338ca', badgeBg: '#ede9fe' },
  'kimya':           { bg: '#fdf4ff', border: '#f5d0fe', accent: '#c026d3', text: '#a21caf', badgeBg: '#fae8ff' },
  'biyoloji':        { bg: '#f0fdf4', border: '#a7f3d0', accent: '#059669', text: '#047857', badgeBg: '#d1fae5' },
  'tarih':           { bg: '#fffbeb', border: '#fed7aa', accent: '#d97706', text: '#9a3412', badgeBg: '#ffedd5' },
  'coğrafya':        { bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a', text: '#166534', badgeBg: '#dcfce7' },
  'felsefe':         { bg: '#fdf2f8', border: '#fbcfe8', accent: '#ec4899', text: '#be185d', badgeBg: '#fce7f3' },
};

const PALETTES_LIST = [
  { bg: '#f0f7ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1d4ed8', badgeBg: '#dbeafe' },
  { bg: '#fff1f2', border: '#fecdd3', accent: '#f43f5e', text: '#be123c', badgeBg: '#ffe4e6' },
  { bg: '#f0fdf4', border: '#bbf7d0', accent: '#10b981', text: '#15803d', badgeBg: '#dcfce7' },
  { bg: '#faf5ff', border: '#e9d5ff', accent: '#8b5cf6', text: '#6d28d9', badgeBg: '#f3e8ff' },
  { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', text: '#b45309', badgeBg: '#fef3c7' },
  { bg: '#ecfeff', border: '#a5f3fc', accent: '#06b6d4', text: '#0e7490', badgeBg: '#cffafe' },
];

const getRowTheme = (subject, idx) => {
  if (subject) {
    const sLower = String(subject).toLowerCase();
    for (const [key, val] of Object.entries(SUBJECT_ROW_THEMES)) {
      if (sLower.includes(key)) return val;
    }
  }
  return PALETTES_LIST[idx % PALETTES_LIST.length];
};

import PeriodicQuestionAnalytics from '../components/PeriodicQuestionAnalytics';
import './StudentDashboard.css';

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
  'Matematik':            { icon: Ruler,        color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)', badge: '#60a5fa' },
  'Fen Bilimleri':        { icon: TestTube2,     color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', badge: '#34d399' },
  'Türkçe':               { icon: BookCopy,      color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.35)', badge: '#fb923c' },
  'Sosyal Bilgiler':      { icon: Globe,         color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.35)', badge: '#c084fc' },
  'İngilizce':            { icon: MessageSquare, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.35)', badge: '#fb7185' },
  'Genel Testler':        { icon: ClipboardList, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.35)', badge: '#818cf8' },
  'Diğer':                { icon: FileText,      color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.35)', badge: '#94a3b8' },
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

const avatarColors = ['#6366f1', '#3b82f6', '#10b981', '#f97316', '#a855f7', '#f43f5e'];

const BOOK_PALETTES = [
  { from: '#4f46e5', to: '#6366f1', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: '#818cf8', shadow: 'rgba(99, 102, 241, 0.35)', tag: '#6366f1' },
  { from: '#059669', to: '#10b981', gradient: 'linear-gradient(135deg, #059669, #10b981)', border: '#34d399', shadow: 'rgba(16, 185, 129, 0.35)', tag: '#10b981' },
  { from: '#d97706', to: '#f59e0b', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', border: '#fbbf24', shadow: 'rgba(245, 158, 11, 0.35)', tag: '#f59e0b' },
  { from: '#e11d48', to: '#f43f5e', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)', border: '#fb7185', shadow: 'rgba(244, 63, 94, 0.35)', tag: '#f43f5e' },
  { from: '#7c3aed', to: '#9333ea', gradient: 'linear-gradient(135deg, #7c3aed, #9333ea)', border: '#c084fc', shadow: 'rgba(147, 51, 234, 0.35)', tag: '#7c3aed' },
  { from: '#0891b2', to: '#06b6d4', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', border: '#38bdf8', shadow: 'rgba(6, 182, 212, 0.35)', tag: '#0891b2' },
];

function MiniCircularProgress({ pct, size = 56, stroke = 5, color = '#6366f1' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const validPct = Math.min(100, Math.max(0, isNaN(pct) ? 0 : Number(pct)));
  const offset = circ - (validPct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border, rgba(0,0,0,0.08))" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

const DAYS_OF_WEEK = [
  { key: 'Pzt', name: 'Pazartesi', short: 'Pzt' },
  { key: 'Sal', name: 'Salı', short: 'Sal' },
  { key: 'Çrş', name: 'Çarşamba', short: 'Çrş' },
  { key: 'Prş', name: 'Perşembe', short: 'Prş' },
  { key: 'Cum', name: 'Cuma', short: 'Cum' },
  { key: 'Cts', name: 'Cumartesi', short: 'Cts' },
  { key: 'Paz', name: 'Pazar', short: 'Paz' }
];

const GOAL_TYPE_THEMES = {
  Soru:   { color: '#e11d48', bg: 'rgba(225, 29, 72, 0.12)', light: 'rgba(225, 29, 72, 0.08)', text: '#fb7185', border: 'rgba(225, 29, 72, 0.3)', icon: Target,      unit: 'soru', step: 10 },
  Sayfa:  { color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)', light: 'rgba(2, 132, 199, 0.08)', text: '#38bdf8', border: 'rgba(2, 132, 199, 0.3)', icon: BookOpen,    unit: 'sayfa', step: 5 },
  Konu:   { color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)', light: 'rgba(124, 58, 237, 0.08)', text: '#c084fc', border: 'rgba(124, 58, 237, 0.3)', icon: Brain,       unit: 'konu', step: 1 },
  Dakika: { color: '#059669', bg: 'rgba(5, 150, 105, 0.12)', light: 'rgba(5, 150, 105, 0.08)', text: '#34d399', border: 'rgba(5, 150, 105, 0.3)', icon: Timer,       unit: 'dk', step: 15 },
  Net:    { color: '#0891b2', bg: 'rgba(8, 145, 178, 0.12)', light: 'rgba(8, 145, 178, 0.08)', text: '#22d3ee', border: 'rgba(8, 145, 178, 0.3)', icon: TrendingUp, unit: 'net', step: 1 },
  Puan:   { color: '#d97706', bg: 'rgba(217, 119, 6, 0.12)', light: 'rgba(217, 119, 6, 0.08)', text: '#fbbf24', border: 'rgba(217, 119, 6, 0.3)', icon: Trophy,     unit: 'puan', step: 5 },
};

const DASHBOARD_QUOTES = [
  { quote: "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.", author: "Robert Collier", category: "Disiplin", emoji: "🔥" },
  { quote: "Disiplin, ne istediğin ile en çok ne istediğin arasındaki seçimdir.", author: "Abraham Lincoln", category: "Odak", emoji: "🎯" },
  { quote: "Zorluklar, başarının değerini artıran süslerdir.", author: "Molière", category: "Mücadele", emoji: "💪" },
  { quote: "Zafer, 'vazgeçmeyenlerindir'.", author: "Mustafa Kemal Atatürk", category: "İnanç", emoji: "⭐" },
  { quote: "Gelecek, bugün ne yaptığına bağlıdır.", author: "Mahatma Gandhi", category: "Eylem", emoji: "⚡" },
  { quote: "Zirveye tırmanmak yorucudur ama oradaki manzara her şeye değer.", author: "Anonim", category: "Zafer", emoji: "🏆" },
  { quote: "Başarı, her gün biraz daha iyi olmakla gelir.", author: "Günün Mottosu", category: "Gelişim", emoji: "🌱" },
  { quote: "Kendine inan. Dünya, kendine inanan insanların peşinden gider.", author: "Oprah Winfrey", category: "Özgüven", emoji: "✨" }
];

export function formatLocalYMD(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function extractItemYMD(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    const str = item.trim();
    const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const trMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (trMatch) return `${trMatch[3]}-${trMatch[2].padStart(2, '0')}-${trMatch[1].padStart(2, '0')}`;
    return null;
  }
  if (item instanceof Date && !isNaN(item.getTime())) {
    return formatLocalYMD(item);
  }
  if (typeof item !== 'object') return null;

  const candidates = [
    item.date,
    item.targetDate,
    item.dueDate,
    item.assignedDueDate,
    item.time,
    item.saat,
    item.note
  ];

  for (const val of candidates) {
    if (!val) continue;
    if (val instanceof Date && !isNaN(val.getTime())) {
      const res = formatLocalYMD(val);
      if (res) return res;
    }
    const str = String(val).trim();
    const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    const trMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (trMatch) {
      const d = trMatch[1].padStart(2, '0');
      const m = trMatch[2].padStart(2, '0');
      const y = trMatch[3];
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
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
  const { getCoachingNoteForStudent, getMeetingsForStudent, getCoachingProfileForStudent, coachingLinks, saveCoachingProfile, getMockExamsForStudent } = useCoaching();

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  // Active Selected Day in Week Navigator (defaults to Today)
  const currentDayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
  const todayDayKey = currentDayIndex === 0 ? 'Paz' : DAYS_OF_WEEK[currentDayIndex - 1].key;
  const [activeDayKey, setActiveDayKey] = useState(todayDayKey);
  const [showAllDayTasks, setShowAllDayTasks] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isManualTestModalOpen, setIsManualTestModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'student') setSelectedStudent(currentUser);
    else if (studentMembers.length > 0) setSelectedStudent(studentMembers[0]);
    else setSelectedStudent(null);
  }, [currentUser, studentMembers]);

  const myStudyAssignments = useMemo(() => {
    return (studyAssignments || []).filter(a => String(a.studentId) === String(selectedStudent?.id));
  }, [studyAssignments, selectedStudent]);

  const myRoadmaps = useMemo(() => {
    return (myStudyAssignments || []).map(assignment => {
      const targetPlanId = assignment.planId || assignment.studyPlanId;
      const plan = (studyPlans || []).find(p => String(p.id) === String(targetPlanId));
      if (!plan) return null;

      let compTopics = [];
      if (Array.isArray(assignment.completedTopics)) compTopics = assignment.completedTopics;
      else if (typeof assignment.completedTopics === 'string') {
        try { compTopics = JSON.parse(assignment.completedTopics); } catch (e) {}
      }

      const totalTopics = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || (s.dueDate ? 1 : 0)), 0) || 0;
      const doneTopics = compTopics.length;
      const pct = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

      return { assignment, plan, totalTopics, doneTopics, pct };
    }).filter(Boolean);
  }, [myStudyAssignments, studyPlans]);

  const coachingNote = getCoachingNoteForStudent(selectedStudent?.id);
  const coachingProfile = getCoachingProfileForStudent(selectedStudent?.id);
  const studentMeetings = getMeetingsForStudent(selectedStudent?.id);
  const upcomingMeeting = studentMeetings.find(m => m.nextMeetingDate);
  const hasCoach = coachingLinks?.some(l => String(l.studentId) === String(selectedStudent?.id));

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

  /* ─── Computed Tests Data ─── */
  const tests = useMemo(() => {
    if (!selectedStudent) return [];

    const gradesList = curData?.grades || [];
    const studentIdStr = String(selectedStudent.id || '');
    const studentUuidStr = String(toUUID(selectedStudent.id) || selectedStudent.uuid || '');
    const isMatchStudent = (s) => {
      if (!s) return false;
      const sStudentId = String(s.studentId || s.student_id || s.user_id || s.userId || '');
      if (!sStudentId) return false;
      if (sStudentId === studentIdStr) return true;
      if (studentUuidStr && (sStudentId === studentUuidStr || toUUID(sStudentId) === studentUuidStr)) return true;
      if (studentIdStr && toUUID(studentIdStr) === sStudentId) return true;
      return false;
    };

    const isMatchHwSub = (s, hw, bookObj, specificTestId = null) => {
      if (!s || !isMatchStudent(s)) return false;
      if (s.status === 'in_progress' || s.status === 'draft') return false;

      const hwIdStr = String(hw?.id || '');
      const cleanHwId = hwIdStr.replace(/^hw_/, '');
      const sHwId = String(s.hwId || s.homeworkId || '');
      const sTestId = String(s.testId || '');
      const sRealTestId = String(s.realTestId || s.metadata?.realTestId || '');
      const sBookTestId = String(s.bookTestId || s.metadata?.bookTestId || '');
      const sId = String(s.id || '');

      if (specificTestId) {
        const specStr = String(specificTestId);
        const specClean = specStr.replace(/^q_/, '').replace(/^bt_/, '');
        const specUuid = String(toUUID(specificTestId) || '');
        if (sTestId && (sTestId === specStr || sTestId === specClean || (specUuid && sTestId === specUuid))) return true;
        if (sRealTestId && (sRealTestId === specStr || sRealTestId === specClean || (specUuid && sRealTestId === specUuid))) return true;
        if (sBookTestId && (sBookTestId === specStr || sBookTestId === specClean || (specUuid && sBookTestId === specUuid))) return true;
        if (s.bookTestIds && Array.isArray(s.bookTestIds) && s.bookTestIds.some(tid => String(tid) === specStr || String(tid) === specClean)) return true;
        return false;
      }

      // 1. Direct ID match
      if (sHwId && (sHwId === hwIdStr || sHwId === cleanHwId || sHwId.replace(/^hw_/, '') === cleanHwId)) return true;
      if (sTestId && (sTestId === hwIdStr || sTestId === cleanHwId || sTestId.replace(/^hw_/, '') === cleanHwId || sTestId.replace(/^q_/, '') === cleanHwId)) return true;
      if (sId && (sId === hwIdStr || sId === cleanHwId)) return true;

      // 2. Question IDs / Sections / Tests match
      const qIds = [
        ...(Array.isArray(hw?.questionIds) ? hw.questionIds : []),
        ...(Array.isArray(hw?.selectedQuestions) ? hw.selectedQuestions : []),
        ...(Array.isArray(hw?.tests) ? hw.tests : []),
        ...(Array.isArray(hw?.items) ? hw.items : []),
        ...(Array.isArray(hw?.sections) ? hw.sections.map(sec => typeof sec === 'object' ? (sec.id || sec.questionId) : sec) : [])
      ].map(String);

      if (qIds.length > 0) {
        if (sTestId && qIds.some(qid => qid === sTestId || qid.replace(/^q_/, '') === sTestId.replace(/^q_/, ''))) return true;
        if (sRealTestId && qIds.some(qid => qid === sRealTestId || qid.replace(/^q_/, '') === sRealTestId.replace(/^q_/, ''))) return true;
        if (sBookTestId && qIds.some(qid => qid === sBookTestId || qid.replace(/^q_/, '') === sBookTestId.replace(/^q_/, ''))) return true;
        if (sHwId && qIds.some(qid => qid === sHwId || qid.replace(/^q_/, '') === sHwId.replace(/^q_/, ''))) return true;
      }

      // 3. Book match
      if (bookObj && (String(s.testId) === String(bookObj.id) || String(s.bookId) === String(bookObj.id))) return true;

      return false;
    };

    const hwTests = (homeworks || []).filter(hw => {
      return isHomeworkForStudent(hw, selectedStudent, gradesList);
    }).flatMap(hw => {
      const bookObj = books.find(b => String(b.id) === String(hw.bookId));
      const isExam = hw.type === 'physicalExam' || hw.contentType === 'physicalExam' || bookObj?.bookType === 'exam' || hw.isPhysical;

      if (isExam) {
        const sub = (hw.submissions || []).find(s => isMatchHwSub(s, hw, bookObj)) ||
          (submissions || []).find(s => isMatchHwSub(s, hw, bookObj));

        return [{
          ...hw,
          type: 'physicalExam',
          contentType: 'physicalExam',
          isPhysical: true,
          status: sub ? 'Sonuçlandı' : 'Atandı',
          questionCount: hw.totalQuestions || (bookObj?.subjects || []).reduce((acc, s) => acc + (s.count || 20), 0) || 90,
          correctAnswers: sub ? (sub.score || 0) : 0,
          submissionId: sub?.id,
          realTestId: hw.id,
          hwId: hw.id,
          bookId: hw.bookId || (bookObj ? bookObj.id : undefined)
        }];
      }

      const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || (hw.bookId && bookObj) || hw.title?.includes('(Tüm Kitap Görevi)') || hw.title?.includes('(Tüm Kitap)') || hw.title?.includes('(Kendi Eklediğim)');

      if (isBook) {
        return []; // Kitap ödevleri Kitaplarım'da takip edildiğinden gösterilmiyor
      }

      const sub = (hw.submissions || []).find(s => isMatchHwSub(s, hw, bookObj)) ||
        (submissions || []).find(s => isMatchHwSub(s, hw, bookObj));

      let qCount = hw.totalQuestions || hw.questionCount || 0;
      if (!qCount && Array.isArray(hw.sections) && hw.sections.length > 0) {
        qCount = hw.sections.reduce((acc, sec) => acc + (sec.qCount || sec.questionCount || 0), 0);
      }
      if (!qCount && Array.isArray(hw.questionIds) && hw.questionIds.length > 0) {
        qCount = hw.questionIds.length;
      }
      if (!qCount) qCount = 1;

      return [{
        ...hw,
        id: hw.id,
        realTestId: hw.id,
        testId: hw.id,
        hwId: hw.id,
        title: hw.title || hw.name || 'Ödev Testi',
        status: sub ? 'Sonuçlandı' : 'Atandı',
        questionCount: qCount,
        correctAnswers: sub ? (sub.score || sub.correctCount || 0) : 0,
        submissionId: sub?.id
      }];
    });

    return hwTests;
  }, [homeworks, submissions, selectedStudent, curData, books, bookTests]);

  /* ─── Homework Summary Groups for Dashboard Card ─── */
  const homeworkSummaryGroups = useMemo(() => {
    if (!tests || tests.length === 0) return [];
    const groups = {};
    tests.forEach(item => {
      const groupKey = item.bookId ? `book_${item.bookId}` : `hw_${item.hwId || item.id}`;
      const groupTitle = item.bookTitle || item.title?.split('—')?.[0]?.trim() || item.name || 'Ödev Seti';
      const subject = item.subject || '';

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          title: groupTitle,
          subject,
          totalCount: 0,
          doneCount: 0,
          pendingCount: 0,
          pct: 0
        };
      }
      groups[groupKey].totalCount++;
      const isDone = item.status === 'Sonuçlandı' || item.status === 'Tamamlandı';
      if (isDone) groups[groupKey].doneCount++;
      else groups[groupKey].pendingCount++;
    });

    return Object.values(groups)
      .map(g => ({
        ...g,
        pct: g.totalCount > 0 ? Math.round((g.doneCount / g.totalCount) * 100) : 0
      }))
      .filter(g => g.pendingCount > 0);
  }, [tests]);

  /* ─── All Submissions & Mock Exams For Question Analytics (Synced with Coaching & Results) ─── */
  const studentMockExams = useMemo(() => {
    if (!selectedStudent?.id || typeof getMockExamsForStudent !== 'function') return [];
    return getMockExamsForStudent(selectedStudent.id) || [];
  }, [selectedStudent, getMockExamsForStudent]);

  const { generalTrialExams, otherHomeworkSubmissions } = useMemo(() => {
    return computeStudentAnalyticsData({
      studentId: selectedStudent?.id,
      targetStudent: selectedStudent,
      submissions,
      homeworks,
      books,
      bookTests,
      studentMockExams
    });
  }, [selectedStudent, submissions, homeworks, books, bookTests, studentMockExams]);

  /* ─── Overall Student Success Rate (%) (Sonuçlarım & Koçluk ile %100 Senkronize) ─── */
  const overallSuccessRate = useMemo(() => {
    let totalCorrect = 0;
    let totalQuestions = 0;

    (otherHomeworkSubmissions || []).forEach(s => {
      const c = Number(s.correctCount) || 0;
      const w = Number(s.wrongCount) || 0;
      const e = Number(s.emptyCount) || 0;
      const q = c + w + e;
      totalCorrect += c;
      totalQuestions += q > 0 ? q : (c + w);
    });

    (generalTrialExams || []).forEach(m => {
      const c = Number(m.totalCorrect) || 0;
      const w = Number(m.totalWrong) || 0;
      const e = Number(m.totalEmpty) || 0;
      const q = c + w + e;
      totalCorrect += c;
      totalQuestions += q > 0 ? q : (c + w);
    });

    if (totalQuestions > 0) {
      return Math.round((totalCorrect / totalQuestions) * 100);
    }
    return 0;
  }, [otherHomeworkSubmissions, generalTrialExams]);

  /* ─── Hero Date for Top Welcome Banner ─── */
  const heroDateStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  }, []);

  /* ─── Assigned Books Summary List for Student ─── */
  const assignedBooksList = useMemo(() => {
    if (!selectedStudent || !books || books.length === 0) return [];
    
    const studentIdStr = String(selectedStudent.id || '');
    const studentUuidStr = String(toUUID(selectedStudent.id) || '');

    const studentSubs = (submissions || []).filter(s => {
      const sid = String(s?.studentId || s?.student_id || s?.userId || s?.user_id || '');
      const isMatchStudent = sid === studentIdStr || (studentUuidStr && sid === studentUuidStr) || (studentUuidStr && toUUID(sid) === studentUuidStr);
      if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
      if (s.isManual && (s.approvalStatus === 'pending' || s.approvalStatus === 'rejected' || s.isApproved === false || s.status === 'pending_approval' || s.status === 'rejected')) return false;
      return true;
    });

    const bookAssignments = (homeworks || []).filter(hw => {
      if (!hw.isBookAssignment && !hw.bookId && !hw.title?.includes('(Tüm Kitap Görevi)') && !hw.title?.includes('(Tüm Kitap)') && !hw.title?.includes('(Kendi Eklediğim)') && hw.sourceType !== 'trackedBook') return false;
      return isHomeworkForStudent(hw, selectedStudent, curData?.grades);
    });

    const bookMap = {};

    // 1. Process books assigned via homeworks
    bookAssignments.forEach(hw => {
      let book = books.find(b => String(b.id) === String(hw.bookId) && b.bookType !== 'exam');
      if (!book && hw.title) {
        book = books.find(b => b.bookType !== 'exam' && (hw.title.includes(b.title) || b.title.includes(hw.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim())));
      }
      if (!book && Array.isArray(hw.tests) && hw.tests.length > 0) {
        const matchedBt = bookTests.find(bt => hw.tests.includes(bt.id) || (toUUID(bt.id) && hw.tests.includes(toUUID(bt.id))));
        if (matchedBt) {
          book = books.find(b => String(b.id) === String(matchedBt.bookId) && b.bookType !== 'exam');
        }
      }
      if (!book) return;

      if (!bookMap[book.id]) {
        bookMap[book.id] = { ...book, assignedHomeworks: [] };
      }
      bookMap[book.id].assignedHomeworks.push(hw);

      if (hw.dueDate) {
        const dueDate = new Date(hw.dueDate);
        if (!bookMap[book.id].targetDueDate || dueDate > bookMap[book.id].targetDueDate) bookMap[book.id].targetDueDate = dueDate;
      }
    });

    // 2. Also include any non-exam book with solved tests
    books.filter(b => b.bookType !== 'exam').forEach(book => {
      if (bookMap[book.id]) return;
      const testsInBook = (bookTests || []).filter(bt => String(bt.bookId) === String(book.id));
      const hasSolvedTest = testsInBook.some(t => {
        const tIdStr = String(t.id);
        const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '');
        const tUuidStr = String(toUUID(t.id) || '');
        return studentSubs.some(s => {
          const matchFields = [
            String(s.testId || ''),
            String(s.realTestId || ''),
            String(s.bookTestId || ''),
            String(s.metadata?.realTestId || ''),
            String(s.metadata?.bookTestId || ''),
            String(s.metadata?.realId || '')
          ];
          if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
            matchFields.push(...s.bookTestIds.map(String));
          }
          return matchFields.some(f => f && (
            f === tIdStr || f === tCleanId || f.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId ||
            (tUuidStr && f === tUuidStr) || toUUID(f) === tIdStr || (tUuidStr && toUUID(f) === tUuidStr)
          ));
        });
      });

      if (hasSolvedTest) {
        bookMap[book.id] = { ...book, assignedHomeworks: [] };
      }
    });

    // Compute statistics for each book
    const list = Object.values(bookMap).map((book, idx) => {
      const testsInBook = (bookTests || []).filter(bt => String(bt.bookId) === String(book.id));
      const totalBookTests = testsInBook.length > 0 ? testsInBook.length : (book.totalTests || 1);

      let totalCorrect = 0;
      let totalWrong = 0;
      let totalBlank = 0;
      let totalSolvedTests = 0;
      let nextTest = null;

      testsInBook.forEach(t => {
        const tIdStr = String(t.id);
        const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '');
        const tUuidStr = String(toUUID(t.id) || '');

        const solvedSubs = studentSubs.filter(s => {
          const matchFields = [
            String(s.testId || ''),
            String(s.realTestId || ''),
            String(s.bookTestId || ''),
            String(s.metadata?.realTestId || ''),
            String(s.metadata?.bookTestId || ''),
            String(s.metadata?.realId || '')
          ];
          if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
            matchFields.push(...s.bookTestIds.map(String));
          }

          return matchFields.some(f => f && (
            f === tIdStr ||
            f === tCleanId ||
            f.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId ||
            (tUuidStr && f === tUuidStr) ||
            toUUID(f) === tIdStr ||
            (tUuidStr && toUUID(f) === tUuidStr)
          ));
        });

        let hwSub = null;
        for (const hw of homeworks) {
          if (!hw.submissions || !Array.isArray(hw.submissions)) continue;
          const match = hw.submissions.find(s => {
            const sid = String(s.studentId || s.student_id || s.user_id || '');
            const isMatchStudent = sid === studentIdStr || (studentUuidStr && sid === studentUuidStr) || (studentUuidStr && toUUID(sid) === studentUuidStr);
            if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
            const subTId = String(s.testId || s.bookTestId || s.realTestId || '');
            return subTId === tIdStr || subTId === tCleanId || subTId.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId || (tUuidStr && subTId === tUuidStr);
          });
          if (match) {
            hwSub = match;
            break;
          }
        }

        const isCompleted = solvedSubs.length > 0 || !!hwSub;
        if (isCompleted) {
          totalSolvedTests++;
          let bestSub = null;
          if (solvedSubs.length > 0) {
            bestSub = solvedSubs.reduce((prev, curr) => ((curr.score || 0) > (prev.score || 0) ? curr : prev), solvedSubs[0]);
          } else if (hwSub) {
            bestSub = hwSub;
          }

          if (bestSub) {
            totalCorrect += bestSub.correctCount || 0;
            totalWrong += bestSub.wrongCount || 0;
            totalBlank += bestSub.blankCount || 0;
          }
        } else if (!nextTest) {
          nextTest = t;
        }
      });

      if (!nextTest && testsInBook.length > 0) {
        nextTest = testsInBook[0];
      }

      const totalQuestions = totalCorrect + totalWrong + totalBlank;
      const successRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      const progressPct = totalBookTests > 0 ? Math.round((totalSolvedTests / totalBookTests) * 100) : 0;

      let remainingDays = null;
      if (book.targetDueDate) {
        const diff = book.targetDueDate.getTime() - new Date().getTime();
        remainingDays = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
      }

      return {
        ...book,
        totalBookTests,
        totalSolvedTests,
        totalCorrect,
        totalWrong,
        totalBlank,
        totalQuestions,
        successRate,
        progressPct,
        nextTest,
        remainingDays,
        paletteIdx: idx
      };
    });

    return list.sort((a, b) => b.totalSolvedTests - a.totalSolvedTests || b.progressPct - a.progressPct);
  }, [selectedStudent, books, bookTests, submissions, homeworks, curData]);

  /* ─── Son Çözülen 5 Test ─── */
  const recentSolvedTests = useMemo(() => {
    if (!selectedStudent) return [];
    const studentIdStr = String(selectedStudent.id || '');
    const studentUuidStr = String(toUUID(selectedStudent.id) || '');

    const isMatchStudent = (s) => {
      const sId = String(s?.studentId || s?.student_id || s?.userId || s?.user_id || '');
      return sId === studentIdStr || (studentUuidStr && sId === studentUuidStr) || (studentUuidStr && toUUID(sId) === studentUuidStr);
    };

    const isBookHomework = (hw) => Boolean(
      hw?.isBookAssignment ||
      hw?.bookId ||
      hw?.sourceType === 'trackedBook' ||
      hw?.title?.includes('(Tüm Kitap Görevi)') ||
      hw?.title?.includes('(Tüm Kitap)') ||
      hw?.title?.includes('(Kendi Eklediğim)')
    );

    const solvedList = [];
    const processedSubIds = new Set();
    const processedTestKeys = new Set();
    const allHomeworkIds = new Set();
    const compositeSectionIds = new Set();

    (homeworks || []).forEach(hw => {
      if (isBookHomework(hw)) return;

      allHomeworkIds.add(String(hw.id));
      if (toUUID(hw.id)) allHomeworkIds.add(String(toUUID(hw.id)));

      const subIds = [
        ...(Array.isArray(hw.sections) ? hw.sections.map(s => typeof s === 'object' ? (s.id || s.questionId) : s) : []),
        ...(Array.isArray(hw.tests) ? hw.tests.map(t => typeof t === 'object' ? t.id : t) : []),
        ...(Array.isArray(hw.questionIds) ? hw.questionIds : []),
        ...(Array.isArray(hw.selectedQuestions) ? hw.selectedQuestions.map(q => typeof q === 'object' ? q.id : q) : []),
        ...(Array.isArray(hw.items) ? hw.items.map(i => typeof i === 'object' ? (i.id || i.questionId) : i) : [])
      ].filter(Boolean).map(String);

      subIds.forEach(id => {
        compositeSectionIds.add(id);
        const clean = id.replace(/^q_/, '').replace(/^bt_/, '').replace(/^hw_/, '');
        if (clean) compositeSectionIds.add(clean);
        const uuid = toUUID(id);
        if (uuid) compositeSectionIds.add(String(uuid));
      });
    });

    const isEval = (s, isOE = false) => {
      if (!s) return false;
      if (!isOE) return true;
      if (s.status === 'pending' || s.status === 'pending_evaluation') return false;
      const rawObj = s.raw_data || {};
      if (rawObj.status === 'pending' || rawObj.status === 'pending_evaluation') return false;

      const hasTeacherGradingHeader = Boolean(
        s.isEvaluatedByTeacher ||
        s.isEvaluated ||
        rawObj.isEvaluatedByTeacher ||
        rawObj.isEvaluated ||
        s.status === 'evaluated' ||
        s.status === 'graded' ||
        rawObj.status === 'evaluated' ||
        rawObj.status === 'graded' ||
        s.evaluatedAt ||
        rawObj.evaluatedAt ||
        s.teacherFeedback ||
        s.teacherNote ||
        rawObj.teacherFeedback ||
        rawObj.teacherNote
      );
      if (hasTeacherGradingHeader) return true;

      if (Array.isArray(s.answers) && s.answers.length > 0) {
        return s.answers.some(a => 
          a.evaluatedAt || 
          a.teacherNote || 
          a.teacher_note || 
          a.feedback || 
          (typeof a.score === 'number' && a.score > 0) || 
          (typeof a.earnedScore === 'number' && a.earnedScore > 0) ||
          a.evalStatus === 'graded' ||
          a.evalStatus === 'evaluated'
        );
      }
      return false;
    };

    // 1. Process Non-Book Homeworks
    (homeworks || []).forEach(hw => {
      if (!hw) return;
      if (isBookHomework(hw)) return;
      if (hw.bookId && !books.some(b => String(b.id) === String(hw.bookId) || toUUID(b.id) === toUUID(hw.bookId))) return;
      if (hw.type === 'physicalExam' && (!hw.bookId || !books.some(b => String(b.id) === String(hw.bookId)))) return;
      if (curData?.grades && !isHomeworkForStudent(hw, selectedStudent, curData.grades)) return;

      const allMatchingSubs = [
        ...(hw.submissions || []).filter(isMatchStudent),
        ...(submissions || []).filter(s => isMatchStudent(s) && (
          String(s.hwId) === String(hw.id) ||
          String(s.homeworkId) === String(hw.id) ||
          String(s.testId) === String(hw.id) ||
          String(s.id) === String(hw.id) ||
          String(s.id) === `hw_sub_${hw.id}_${studentIdStr}`
        ))
      ].filter(s => s && s.status !== 'in_progress' && s.status !== 'draft');

      allMatchingSubs.sort((a, b) => {
        const aEval = isEval(a, true) ? 1 : 0;
        const bEval = isEval(b, true) ? 1 : 0;
        if (aEval !== bEval) return bEval - aEval;
        const aDate = new Date(a.submittedAt || a.completedAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.submittedAt || b.completedAt || b.createdAt || 0).getTime();
        return bDate - aDate;
      });

      const sub = allMatchingSubs[0];
      if (!sub) return;

      const subIdStr = String(sub.id || `hw_${hw.id}_${studentIdStr}`);
      processedSubIds.add(subIdStr);
      if (sub.id) processedSubIds.add(String(sub.id));
      processedTestKeys.add(String(hw.id));
      if (toUUID(hw.id)) processedTestKeys.add(String(toUUID(hw.id)));
      if (sub.testId) processedTestKeys.add(String(sub.testId));

      const raw = sub.raw_data || {};
      const dateVal = sub.submittedAt || sub.completedAt || raw.submittedAt || sub.createdAt || hw.createdAt;

      const title = hw.title || sub.testTitle || raw.testTitle || 'Ödev Testi';
      const subject = hw.subject || raw.subject || sub.subject || 'Genel Testler';
      const subTitle = null;

      // Detect open-ended vs multiple choice test
      const isExplicitMCQ = Boolean(
        hw.questionType === 'coktan_secmeli' ||
        hw.type === 'coktan_secmeli' ||
        hw.contentType === 'coktan_secmeli' ||
        sub.questionType === 'coktan_secmeli' ||
        sub.type === 'coktan_secmeli' ||
        sub.contentType === 'coktan_secmeli' ||
        raw.questionType === 'coktan_secmeli' ||
        (Array.isArray(sub.answers) && sub.answers.length > 0 && sub.answers.some(a => a.userAnswer !== null && a.userAnswer !== undefined && !a.userAnswerText))
      );

      const isOpenEnded = !isExplicitMCQ && Boolean(
        hw.questionType === 'acik_uclu' ||
        hw.type === 'acik_uclu' ||
        hw.contentType === 'acik_uclu' ||
        sub.isOpenEnded ||
        raw.isOpenEnded ||
        sub.questionType === 'acik_uclu' ||
        sub.type === 'acik_uclu' ||
        sub.contentType === 'acik_uclu' ||
        sub.status === 'pending' ||
        sub.status === 'pending_evaluation' ||
        raw.status === 'pending' ||
        raw.status === 'pending_evaluation' ||
        (Array.isArray(sub.answers) && sub.answers.length > 0 && sub.answers.some(a => a.userAnswerText))
      );

      const isEvaluated = isEval(sub, isOpenEnded);
      const isPendingEvaluation = isOpenEnded && !isEvaluated;

      let cCount = 0;
      let wCount = 0;
      let eCount = 0;

      if (Array.isArray(sub.answers) && sub.answers.length > 0) {
        sub.answers.forEach(ans => {
          const numScore = ans.score !== undefined && ans.score !== null ? Number(ans.score) : null;
          if (ans.isCorrect === true || (numScore !== null && numScore >= 5)) {
            cCount++;
          } else if (ans.evalStatus === 'empty') {
            eCount++;
          } else if (ans.isCorrect === false || ans.evalStatus === 'wrong' || (numScore !== null && numScore === 0)) {
            const isB = (ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '') && !ans.userAnswerText;
            if (isB) eCount++;
            else wCount++;
          } else if (ans.isCorrect === null || ans.isCorrect === undefined) {
            if (ans.userAnswer !== null && ans.userAnswer !== undefined && ans.userAnswer !== '' && ans.correctAnswer !== undefined) {
              if (String(ans.userAnswer).trim().toUpperCase() === String(ans.correctAnswer).trim().toUpperCase()) {
                cCount++;
              } else {
                wCount++;
              }
            } else if (ans.userAnswerText && (ans.userAnswer === null || ans.userAnswer === undefined)) {
              // Unevaluated open ended
            } else if (ans.userAnswer !== null && ans.userAnswer !== undefined && ans.userAnswer !== '') {
              cCount++;
            } else {
              eCount++;
            }
          }
        });
      } else {
        cCount = typeof sub.correctCount === 'number' ? sub.correctCount : (typeof raw.correctCount === 'number' ? raw.correctCount : 0);
        wCount = typeof sub.wrongCount === 'number' ? sub.wrongCount : (typeof raw.wrongCount === 'number' ? raw.wrongCount : 0);
        eCount = typeof sub.emptyCount === 'number' ? sub.emptyCount : (typeof sub.blankCount === 'number' ? sub.blankCount : (typeof raw.blankCount === 'number' ? raw.blankCount : 0));
      }

      const ansCount = Array.isArray(sub.answers) ? sub.answers.length : 0;
      const sumCount = cCount + wCount + eCount;
      let rawTotal = hw.totalQuestions || hw.questionCount || sub.totalQuestions || raw.totalQuestions || 0;
      if (!rawTotal && Array.isArray(hw.sections) && hw.sections.length > 0) {
        rawTotal = hw.sections.reduce((acc, sec) => acc + (sec.qCount || sec.questionCount || 0), 0);
      }
      if (!rawTotal && Array.isArray(hw.questionIds) && hw.questionIds.length > 0) {
        rawTotal = hw.questionIds.length;
      }
      const qCount = Math.max(rawTotal, ansCount, sumCount, 1);

      if (cCount > qCount && qCount > 0) {
        cCount = Math.min(qCount, Math.round((cCount / 100) * qCount));
        eCount = Math.max(0, qCount - (cCount + wCount));
      }

      let pct = 0;
      if (qCount > 0 && typeof cCount === 'number' && (cCount > 0 || wCount > 0 || eCount > 0)) {
        pct = Math.min(100, Math.max(0, Math.round((cCount / qCount) * 100)));
      } else if (typeof sub.scorePercentage === 'number' && !isNaN(sub.scorePercentage) && sub.scorePercentage > 0) {
        pct = Math.round(sub.scorePercentage);
      } else if (typeof raw.scorePercentage === 'number' && !isNaN(raw.scorePercentage) && raw.scorePercentage > 0) {
        pct = Math.round(raw.scorePercentage);
      } else if (typeof sub.score === 'number' && !isNaN(sub.score) && sub.score > 0 && sub.score <= 100) {
        pct = Math.round(sub.score);
      } else if (typeof raw.score === 'number' && !isNaN(raw.score) && raw.score > 0 && raw.score <= 100) {
        pct = Math.round(raw.score);
      } else if (sub.accuracy !== undefined && sub.accuracy !== null) {
        pct = Math.round(Number(sub.accuracy));
      }
      pct = Math.min(100, Math.max(0, pct));

      const calcNet = sub.totalNet !== undefined && sub.totalNet !== null
        ? Number(sub.totalNet)
        : Number(((cCount || 0) - ((wCount || 0) / 4)).toFixed(2));

      // Do not include if totally empty
      if (cCount === 0 && wCount === 0 && eCount === 0 && ansCount === 0 && (!sub.submittedAt && !sub.completedAt)) {
        return;
      }

      const unitTopic = (hw.unitTopic || hw.topic || hw.unit || sub.unitTopic || sub.topic || sub.unit || '').trim();

      solvedList.push({
        id: sub.id || hw.id,
        testId: hw.id,
        submissionId: sub.id,
        title,
        subject,
        unitTopic: unitTopic || null,
        subTitle,
        date: dateVal,
        correctCount: cCount,
        wrongCount: wCount,
        emptyCount: eCount,
        totalQuestions: qCount,
        pct,
        net: calcNet,
        isOpenEnded,
        isPendingEvaluation,
        type: 'ödev',
        isPhysical: hw.type === 'physicalExam' || hw.isPhysical
      });
    });

    // 2. Process All Test & Book Submissions
    (submissions || []).forEach(sub => {
      if (!isMatchStudent(sub) || sub.status === 'in_progress' || sub.status === 'draft') return;

      const subIdStr = String(sub.id || '');
      if (subIdStr && processedSubIds.has(subIdStr)) return;

      const raw = sub.raw_data || {};
      if (raw.status === 'draft' || raw.status === 'in_progress') return;

      const testId = String(sub.testId || sub.bookTestId || sub.realTestId || raw.testId || raw.bookTestId || '');
      const hwId = String(sub.hwId || sub.homeworkId || raw.hwId || raw.homeworkId || '');
      if (!testId && !hwId) return;

      // If this submission belongs to a regular non-book assigned homework that was already handled in Step 1, do not duplicate
      if (hwId && allHomeworkIds.has(hwId)) return;
      if (allHomeworkIds.has(testId)) return;
      if (compositeSectionIds.has(testId)) return;
      if (testId && (processedTestKeys.has(testId) || (toUUID(testId) && processedTestKeys.has(String(toUUID(testId)))))) return;

      const isNonBookHw = allHomeworkIds.has(testId) || compositeSectionIds.has(testId);
      if (isNonBookHw) return;

      // Skip sample mock submissions
      if (subIdStr.startsWith('sub_sample') || String(sub.id).startsWith('sub_sample')) {
        return;
      }

      const isManual = Boolean(
        sub.isManual === true ||
        sub.sourceType === 'manual_test' ||
        raw.isManual === true ||
        raw.sourceType === 'manual_test' ||
        String(sub.id || '').startsWith('sub_manual') ||
        String(testId).startsWith('sub_manual')
      );

      const targetTest = (bookTests || []).find(t => 
        String(t.id) === String(sub.bookTestId || sub.testId || raw.bookTestId || raw.testId || sub.realTestId) ||
        (toUUID(t.id) && String(toUUID(t.id)) === String(sub.bookTestId || sub.testId || raw.bookTestId || raw.testId || sub.realTestId))
      );
      const targetBook = (books || []).find(b => 
        String(b.id) === String(sub.bookId || raw.bookId || targetTest?.bookId) ||
        (toUUID(b.id) && String(toUUID(b.id)) === String(sub.bookId || raw.bookId || targetTest?.bookId))
      );
      const targetHw = (homeworks || []).find(h => String(h.id) === String(sub.hwId || sub.homeworkId || sub.testId || testId));
      const targetCurTest = (curData?.tests || []).find(t => String(t.id) === String(testId));
      const targetBankQ = (allQuestions || []).find(q => String(q.id) === String(testId));

      // If resource is not manual and no longer exists, it is a deleted test/exam/homework -> discard!
      if (!isManual) {
        if (!targetBook && !targetTest && !targetCurTest && !targetBankQ && !targetHw) {
          return;
        }
        if (sub.bookId && !targetBook) {
          return;
        }
        if (sub.hwId && !targetHw && !targetTest) {
          return;
        }
        if (targetHw && targetHw.bookId && !books.some(b => String(b.id) === String(targetHw.bookId) || toUUID(b.id) === toUUID(targetHw.bookId))) {
          return;
        }
        if (targetHw && targetHw.type === 'physicalExam' && !targetBook) {
          return;
        }
        const isExamSub = sub.type === 'physicalExam' || sub.isExam || sub.isTrial || String(sub.title || sub.testTitle || '').toLowerCase().includes('deneme');
        if (isExamSub && !targetBook && !(studentMockExams || []).some(m => String(m.id) === String(sub.id) || String(m.title) === String(sub.title || sub.testTitle))) {
          return;
        }
      }

      if (sub.id) processedSubIds.add(String(sub.id));
      if (testId) processedTestKeys.add(testId);

      const subjObj = (targetBook?.subjects || []).find(s => String(s.id) === String(targetTest?.subjectId));
      const topicObj = (subjObj?.topics || []).find(tp => String(tp.id) === String(targetTest?.topicId || raw.topicId || sub.topicId));
      const unitTopic = (sub.unitTopic || sub.topic || sub.unit || sub.topicName || sub.unitName || topicObj?.name || targetTest?.topicName || targetTest?.unit || targetTest?.unitName || raw.topic || raw.unit || raw.topicName || raw.unitName || '').trim();
      
      const bookTitle = sub.bookTitle || raw.bookTitle || targetBook?.title || targetHw?.title || '';
      const cleanBookTitle = bookTitle.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();

      let title = sub.testTitle || raw.testTitle || sub.title || targetTest?.name || (targetHw && !isBookHomework(targetHw) ? targetHw.title : null) || targetCurTest?.title || 'Test';
      title = title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();

      const subject = sub.subject || raw.subject || subjObj?.name || (targetHw && !isBookHomework(targetHw) ? targetHw.subject : null) || targetBook?.subject || cleanBookTitle || 'Genel Testler';
      const subTitle = cleanBookTitle && cleanBookTitle !== title && cleanBookTitle !== subject ? cleanBookTitle : null;

      const dateVal = sub.submittedAt || sub.completedAt || raw.submittedAt || sub.createdAt || sub.updatedAt;

      const isExplicitMCQ = Boolean(
        targetTest?.questionType === 'coktan_secmeli' ||
        targetHw?.questionType === 'coktan_secmeli' ||
        sub.questionType === 'coktan_secmeli' ||
        sub.type === 'coktan_secmeli' ||
        sub.contentType === 'coktan_secmeli' ||
        raw.questionType === 'coktan_secmeli' ||
        (Array.isArray(sub.answers) && sub.answers.length > 0 && sub.answers.some(a => a.userAnswer !== null && a.userAnswer !== undefined && !a.userAnswerText))
      );

      const isOpenEnded = !isExplicitMCQ && Boolean(
        sub.isOpenEnded ||
        raw.isOpenEnded ||
        targetTest?.isOpenEnded ||
        targetHw?.isOpenEnded ||
        sub.questionType === 'acik_uclu' ||
        sub.type === 'acik_uclu' ||
        sub.contentType === 'acik_uclu' ||
        sub.status === 'pending' ||
        sub.status === 'pending_evaluation' ||
        raw.status === 'pending' ||
        raw.status === 'pending_evaluation' ||
        (Array.isArray(sub.answers) && sub.answers.length > 0 && sub.answers.some(a => a.userAnswerText))
      );

      const isEvaluated = isEval(sub, isOpenEnded);
      const isPendingEvaluation = isOpenEnded && !isEvaluated;

      let cCount = 0;
      let wCount = 0;
      let eCount = 0;

      if (Array.isArray(sub.answers) && sub.answers.length > 0) {
        sub.answers.forEach(ans => {
          const numScore = ans.score !== undefined && ans.score !== null ? Number(ans.score) : null;
          if (ans.isCorrect === true || (numScore !== null && numScore >= 5)) {
            cCount++;
          } else if (ans.evalStatus === 'empty') {
            eCount++;
          } else if (ans.isCorrect === false || ans.evalStatus === 'wrong' || (numScore !== null && numScore === 0)) {
            const isB = (ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '') && !ans.userAnswerText;
            if (isB) eCount++;
            else wCount++;
          } else if (ans.isCorrect === null || ans.isCorrect === undefined) {
            if (ans.userAnswer !== null && ans.userAnswer !== undefined && ans.userAnswer !== '' && ans.correctAnswer !== undefined) {
              if (String(ans.userAnswer).trim().toUpperCase() === String(ans.correctAnswer).trim().toUpperCase()) {
                cCount++;
              } else {
                wCount++;
              }
            } else if (ans.userAnswerText && (ans.userAnswer === null || ans.userAnswer === undefined)) {
              // Unevaluated open ended
            } else if (ans.userAnswer !== null && ans.userAnswer !== undefined && ans.userAnswer !== '') {
              cCount++;
            } else {
              eCount++;
            }
          }
        });
      } else {
        cCount = typeof sub.correctCount === 'number' ? sub.correctCount : (typeof raw.correctCount === 'number' ? raw.correctCount : 0);
        wCount = typeof sub.wrongCount === 'number' ? sub.wrongCount : (typeof raw.wrongCount === 'number' ? raw.wrongCount : 0);
        eCount = typeof sub.emptyCount === 'number' ? sub.emptyCount : (typeof sub.blankCount === 'number' ? sub.blankCount : (typeof raw.blankCount === 'number' ? raw.blankCount : 0));
      }

      const ansCount = Array.isArray(sub.answers) ? sub.answers.length : 0;
      const sumCount = cCount + wCount + eCount;
      const rawTotal = targetTest?.questionCount || sub.totalQuestions || raw.totalQuestions || (targetHw && !isBookHomework(targetHw) ? targetHw.totalQuestions : 0) || (Array.isArray(sub.questions) ? sub.questions.length : 0);
      const qCount = Math.max(rawTotal, ansCount, sumCount, 1);

      if (cCount > qCount && qCount > 0) {
        cCount = Math.min(qCount, Math.round((cCount / 100) * qCount));
        eCount = Math.max(0, qCount - (cCount + wCount));
      }

      let pct = 0;
      if (qCount > 0 && typeof cCount === 'number' && (cCount > 0 || wCount > 0 || eCount > 0)) {
        pct = Math.min(100, Math.max(0, Math.round((cCount / qCount) * 100)));
      } else if (typeof sub.scorePercentage === 'number' && !isNaN(sub.scorePercentage) && sub.scorePercentage > 0) {
        pct = Math.round(sub.scorePercentage);
      } else if (typeof raw.scorePercentage === 'number' && !isNaN(raw.scorePercentage) && raw.scorePercentage > 0) {
        pct = Math.round(raw.scorePercentage);
      } else if (typeof sub.score === 'number' && !isNaN(sub.score) && sub.score > 0 && sub.score <= 100 && (!qCount || qCount <= 1)) {
        pct = Math.round(sub.score);
      } else if (typeof raw.score === 'number' && !isNaN(raw.score) && raw.score > 0 && raw.score <= 100 && (!qCount || qCount <= 1)) {
        pct = Math.round(raw.score);
      } else if (sub.accuracy !== undefined && sub.accuracy !== null) {
        pct = Math.round(Number(sub.accuracy));
      }
      pct = Math.min(100, Math.max(0, pct));

      const calcNet = sub.totalNet !== undefined && sub.totalNet !== null
        ? Number(sub.totalNet)
        : Number(((cCount || 0) - ((wCount || 0) / 4)).toFixed(2));

      // Do not include if totally empty
      if (cCount === 0 && wCount === 0 && eCount === 0 && ansCount === 0 && (!sub.submittedAt && !sub.completedAt)) {
        return;
      }

      const isManualPending = isManual && (sub.approvalStatus === 'pending' || sub.status === 'pending_approval' || (sub.isApproved === false && sub.approvalStatus !== 'rejected'));
      const isManualRejected = isManual && (sub.approvalStatus === 'rejected' || sub.status === 'rejected');

      solvedList.push({
        id: sub.id || testId,
        testId: sub.testId || testId,
        submissionId: sub.id,
        title,
        subject,
        unitTopic: unitTopic || null,
        subTitle,
        date: dateVal,
        correctCount: cCount,
        wrongCount: wCount,
        emptyCount: eCount,
        totalQuestions: qCount,
        pct,
        net: calcNet,
        isOpenEnded,
        isPendingEvaluation,
        isManual,
        isManualPending,
        isManualRejected,
        type: sub.type || (sub.bookTestId || targetTest ? 'kitap' : 'test'),
        isPhysical: sub.type === 'physicalExam' || sub.isPhysical
      });
    });

    return solvedList
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 5);
  }, [selectedStudent, submissions, homeworks, books, bookTests, curData, allQuestions]);


  /* ─── Pending Tasks ─── */
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
            if (!resolvedSourceType) resolvedSourceType = firstQ.sourceType || firstQ.contentType;
          }
        }
      }
      
      return { 
        ...t,
        id: t.id, 
        realTestId: t.realTestId || t.testId,
        testId: t.testId || t.realTestId,
        hwId: t.hwId,
        type: resolvedType || t.type || 'test', 
        title: t.title,
        bookTitle: t.bookTitle,
        testName: t.testName,
        subject: getCategoryName(t), 
        dueDateStr: dueDateObj.toLocaleDateString('tr-TR'), 
        dueDateObj, 
        questionCount: t.questionCount, 
        durationMinutes: (t.questionCount || 0) * 2 || 30, 
        sourceType: resolvedSourceType || t.sourceType 
      };
    });
    return [...tTasks].sort((a, b) => a.dueDateObj - b.dueDateObj);
  }, [tests, allQuestions]);

  /* ─── Current Week Dates Mapping (Pzt -> Paz) ─── */
  const weekInfo = useMemo(() => {
    const now = new Date();
    const currentDayIdx = now.getDay();
    const mondayDiff = now.getDate() - (currentDayIdx === 0 ? 6 : currentDayIdx - 1);
    const mondayDate = new Date(now.getFullYear(), now.getMonth(), mondayDiff, 12, 0, 0);

    const MONTHS_SHORT_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    const dayDateMap = {};
    DAYS_OF_WEEK.forEach((d, idx) => {
      const dObj = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + idx, 12, 0, 0);
      const ymd = formatLocalYMD(dObj);
      const dayNum = dObj.getDate();
      const mShort = MONTHS_SHORT_TR[dObj.getMonth()];
      const mLong = MONTHS_TR[dObj.getMonth()];

      dayDateMap[d.key] = {
        key: d.key,
        name: d.name,
        short: d.short,
        ymd,
        time: dObj.getTime(),
        dayNumber: dayNum,
        monthShort: mShort,
        monthLong: mLong,
        dateLabel: `${dayNum} ${mShort}`,
        fullDateLabel: `${dayNum} ${mLong} ${d.name}`
      };
    });

    return { mondayDate, dayDateMap };
  }, []);

  /* ─── Fully Processed Weekly Program Items for all 7 Days ─── */
  const fullProcessedWeekMap = useMemo(() => {
    try {
      const rawProg = coachingProfile?.weeklyProgram;
      const studentId = selectedStudent?.id;
      const gradesList = curData?.grades || [];

      const studentHomeworks = (homeworks || []).filter(hw => {
        if (!selectedStudent || !hw) return false;
        if (hw.isBookAssignment || hw.bookId || hw.sourceType === 'trackedBook') {
          const hasBook = (books || []).some(b => String(b.id) === String(hw.bookId) || toUUID(b.id) === toUUID(hw.bookId));
          if (!hasBook) return false;
        }
        return isHomeworkForStudent(hw, selectedStudent, gradesList);
      });

      const allDailyItems = [];
      if (Array.isArray(rawProg)) {
        rawProg.forEach(dObj => {
          (dObj?.items || []).forEach(item => {
            if (!item) return;
            if ((item.repeatType === 'daily' || item.isDaily) && !allDailyItems.some(i => i?.id === item.id)) {
              allDailyItems.push({ ...item, isDaily: true });
            }
          });
        });
      }

      const resultMap = {};

      DAYS_OF_WEEK.forEach(dayMeta => {
        const dayInfo = weekInfo?.dayDateMap?.[dayMeta.key];
        const dayYMD = dayInfo?.ymd || '';
        const dayTime = dayInfo?.time || 0;

        let dayManualItems = [];
        if (Array.isArray(rawProg)) {
          const found = rawProg.find(r => r?.day === dayMeta.key);
          if (found && Array.isArray(found.items)) {
            found.items.forEach(item => {
              if (!item) return;
              const itemYMD = extractItemYMD(item);
              if (itemYMD && itemYMD !== dayYMD) return;
              if (item.createdYMD && dayYMD < item.createdYMD) return;
              if (item.repeatEndDate && dayYMD > item.repeatEndDate) return;
              dayManualItems.push({ ...item, isWeeklyProgItem: true });
            });
          }

          rawProg.forEach(dObj => {
            if (dObj?.day !== dayMeta.key) {
              (dObj?.items || []).forEach(item => {
                if (!item) return;
                const itYMD = extractItemYMD(item);
                if (itYMD && itYMD === dayYMD) {
                  if (!dayManualItems.some(i => i?.id === item.id)) {
                    dayManualItems.push({ ...item, isWeeklyProgItem: true });
                  }
                }
              });
            }
          });
        }

        allDailyItems.forEach(dItem => {
          if (!dItem) return;
          const itemYMD = extractItemYMD(dItem);
          if (itemYMD && itemYMD !== dayYMD) return;
          if (dItem.createdYMD && dayYMD < dItem.createdYMD) return;
          if (dItem.repeatEndDate && dayYMD > dItem.repeatEndDate) return;
          const alreadyInDay = dayManualItems.find(i => i?.id === dItem.id);
          if (!alreadyInDay) {
            dayManualItems.push({ ...dItem, done: false, isWeeklyProgItem: true });
          }
        });

        // Filter out manual/program items referencing deleted homeworks or book tests
        dayManualItems = dayManualItems.filter(item => {
          if (item.hwId) {
            const hasHw = (homeworks || []).some(h => String(h.id) === String(item.hwId) || toUUID(h.id) === toUUID(item.hwId));
            if (!hasHw) return false;
          }
          if (item.testId && !item.hwId) {
            const hasBt = (bookTests || []).some(bt => String(bt.id) === String(item.testId) || toUUID(bt.id) === toUUID(item.testId));
            if (!hasBt) return false;
          }
          return true;
        });

        const scheduleItems = (schedules || []).filter(s => {
          if (!s || !studentId) return false;
          if (String(s.studentId) !== String(studentId)) return false;
          const sYMD = extractItemYMD(s);
          if (sYMD) {
            return sYMD === dayYMD;
          }
          return s.day === dayMeta.key || s.dayOfWeek === dayMeta.key || s.dayName === dayMeta.name || s.day === dayMeta.name;
        }).map(s => ({
          id: s.id,
          title: s.title || s.subject || 'Ders Çalışması',
          subject: s.subject || 'Çalışma Planı',
          topic: s.topic || '',
          time: s.time || s.saat || '',
          questionCount: s.questionCount ? `${s.questionCount} soru` : null,
          done: !!(s.done || s.completed),
          isScheduleContextItem: true
        }));

        const autoHwItems = [];

        studentHomeworks.forEach(hw => {
          if (!hw) return;
          const bookObj = (books || []).find(b => String(b?.id) === String(hw.bookId) || toUUID(b?.id) === toUUID(hw.bookId));
          if ((hw.isBookAssignment || hw.bookId) && !bookObj) return;

          const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

          const isExam = Boolean(
            hw.type === 'physicalExam' ||
            hw.contentType === 'physicalExam' ||
            hw.bookType === 'exam' ||
            bookObj?.bookType === 'exam' ||
            hw.isPhysical ||
            (hw.title && (hw.title.toLowerCase().includes('deneme') || hw.title.toLowerCase().includes('sınav')))
          );

          // ── DENEME & FİZİKSEL SINAV: TEK BİRLEŞİK GÖREV OLARAK GÖSTER ──
          if (isExam) {
            if (hw.bookId && !bookObj) return;
            const startYMD = extractItemYMD(hw.startDate || hw.assignedAt || hw.createdAt);
            const dueYMD = extractItemYMD(hw.dueDate || hw.assignedDueDate);
            const startTime = startYMD ? new Date(startYMD).getTime() : null;
            const dueTime = dueYMD ? new Date(dueYMD).getTime() : null;

            const studentIdStr = String(studentId || '');
            const studentUuidStr = String(toUUID(studentId) || '');
            const isMatchStudent = (s) => {
              if (!s) return false;
              const subStudentId = String(s.studentId || s.student_id || s.user_id || '');
              return subStudentId === studentIdStr ||
                (studentUuidStr && subStudentId === studentUuidStr) ||
                toUUID(subStudentId) === studentIdStr ||
                (studentUuidStr && toUUID(subStudentId) === studentUuidStr);
            };

            const isMatchHwSub = (s) => {
              if (!s || !isMatchStudent(s)) return false;
              if (s.status === 'in_progress' || s.status === 'draft') return false;
              const hwIdStr = String(hw.id || '');
              const cleanHwId = hwIdStr.replace(/^hw_/, '');
              const sHwId = String(s.hwId || s.homeworkId || '');
              const sTestId = String(s.testId || '');
              const sRealTestId = String(s.realTestId || s.metadata?.realTestId || '');
              const sBookTestId = String(s.bookTestId || s.metadata?.bookTestId || '');
              const sId = String(s.id || '');

              if (sHwId && (sHwId === hwIdStr || sHwId === cleanHwId || sHwId.replace(/^hw_/, '') === cleanHwId)) return true;
              if (sTestId && (sTestId === hwIdStr || sTestId === cleanHwId || sTestId.replace(/^hw_/, '') === cleanHwId)) return true;
              if (sId && (sId === hwIdStr || sId === cleanHwId)) return true;
              if (sRealTestId && (sRealTestId === hwIdStr || sRealTestId === cleanHwId)) return true;
              if (sBookTestId && (sBookTestId === hwIdStr || sBookTestId === cleanHwId)) return true;
              return false;
            };

            const isDone = (hw.submissions || []).some(isMatchHwSub) || (submissions || []).some(isMatchHwSub);
            const sub = (hw.submissions || []).find(isMatchHwSub) || (submissions || []).find(isMatchHwSub);
            const subYMD = (sub?.createdAt || sub?.submittedAt) ? extractItemYMD(sub.submittedAt || sub.createdAt) : null;

            let isForThisDay = false;
            if (isDone) {
              const completionDay = subYMD || dueYMD || startYMD;
              isForThisDay = (completionDay === dayYMD);
            } else {
              if (dueYMD) {
                isForThisDay = (dayYMD === dueYMD);
              } else if (dueTime && startTime) {
                isForThisDay = (dayTime >= startTime && dayTime <= dueTime);
              } else if (startTime) {
                isForThisDay = (dayTime === startTime);
              }
            }

            if (isForThisDay) {
              let totalQ = hw.totalQuestions;
              if (!totalQ && hw.tests && Array.isArray(hw.tests)) {
                totalQ = hw.tests.reduce((acc, tid) => {
                  const bt = (bookTests || []).find(b => String(b?.id) === String(tid));
                  return acc + (bt?.questionCount || 0);
                }, 0);
              }
              if (!totalQ) totalQ = (bookObj?.subjects || []).reduce((acc, s) => acc + (s.count || 20), 0) || 30;

              const rawDue = hw.dueDate || hw.assignedDueDate;
              let formattedDue = '';
              if (rawDue) {
                try { formattedDue = `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}`; } catch {}
              }

              const exists = dayManualItems.some(m => m.id === `auto_hw_${hw.id}` || m.hwId === hw.id);
              if (!exists) {
                autoHwItems.push({
                  id: `auto_hw_${hw.id}`,
                  hwId: hw.id,
                  isAutoHomework: true,
                  isExamTask: true,
                  taskType: 'deneme',
                  subject: '📋 Deneme',
                  title: cleanBookTitle || hw.title || 'Deneme Sınavı',
                  questionCount: `${totalQ} Soru`,
                  time: formattedDue || null,
                  done: isDone
                });
              }
            }
            return;
          }

          const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || hw.bookId;

          if (isBook && hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0) {
            Object.entries(hw.testDueDates).forEach(([testId, tDateStr]) => {
              if (!tDateStr) return;
              const tYMD = extractItemYMD(tDateStr);
              if (dayYMD === tYMD) {
                const tObj = (bookTests || []).find(b => String(b?.id) === String(testId));
                const testName = tObj?.name || 'Test';
                const qCount = tObj?.questionCount || 20;

                const subjObj = (bookObj?.subjects || []).find(s => String(s?.id) === String(tObj?.subjectId));
                const subjectName = subjObj?.name || hw.subject || cleanBookTitle;
                const topicObj = (subjObj?.topics || []).find(tp => String(tp?.id) === String(tObj?.topicId));
                const topicName = topicObj?.name || tObj?.topicName || '';

                const tIdStr = String(testId);
                const tUuidStr = String(toUUID(testId) || '');
                const studentIdStr = String(studentId || '');
                const studentUuidStr = String(toUUID(studentId) || '');

                const isMatchStudent = (s) => {
                  if (!s) return false;
                  const subStudentId = String(s.studentId || s.student_id || s.user_id || '');
                  return subStudentId === studentIdStr ||
                    (studentUuidStr && subStudentId === studentUuidStr) ||
                    toUUID(subStudentId) === studentIdStr ||
                    (studentUuidStr && toUUID(subStudentId) === studentUuidStr);
                };

                const isSolvedInSubs = (submissions || []).some(s => {
                  if (!s || !isMatchStudent(s)) return false;
                  if (s.status === 'in_progress' || s.status === 'draft') return false;

                  const subFields = [
                    s.testId,
                    s.realTestId,
                    s.bookTestId,
                    s.metadata?.realTestId,
                    s.metadata?.bookTestId,
                    s.metadata?.realId,
                    s.metadata?.testId,
                    s.hwId,
                    s.homeworkId,
                    s.id
                  ].filter(Boolean).map(String);

                  if (Array.isArray(s.bookTestIds)) {
                    s.bookTestIds.forEach(bid => { if (bid) subFields.push(String(bid)); });
                  }

                  return subFields.some(sf => sf && (
                    sf === tIdStr ||
                    (tUuidStr && sf === tUuidStr) ||
                    toUUID(sf) === tIdStr ||
                    (tUuidStr && toUUID(sf) === tUuidStr)
                  ));
                });

                const isSolvedInHw = Boolean(
                  hw.submissions && Array.isArray(hw.submissions) && hw.submissions.some(s => {
                    if (!s || !isMatchStudent(s)) return false;
                    if (s.status === 'in_progress' || s.status === 'draft') return false;
                    return String(s.testId) === tIdStr || String(s.realTestId) === tIdStr || String(s.bookTestId) === tIdStr;
                  })
                );

                const isSolved = isSolvedInSubs || isSolvedInHw;

                const exists = dayManualItems.some(m => m.id === `book_test_${hw.id}_${testId}`);
                if (!exists) {
                  let formattedTarget = '';
                  try { formattedTarget = `Hedef: ${new Date(tDateStr).toLocaleDateString('tr-TR')}`; } catch {}
                  autoHwItems.push({
                    id: `book_test_${hw.id}_${testId}`,
                    hwId: hw.id,
                    testId: testId,
                    isAutoHomework: true,
                    taskType: 'kitap',
                    subject: subjectName,
                    unitTopic: topicName,
                    bookTitle: cleanBookTitle,
                    testName: testName,
                    title: `${testName}${topicName ? ` (${topicName})` : ''}`,
                    questionCount: `${qCount} soru`,
                    time: formattedTarget,
                    done: isSolved
                  });
                }
              }
            });
            return;
          }

          const startYMD = extractItemYMD(hw.startDate || hw.assignedAt || hw.createdAt);
          const dueYMD = extractItemYMD(hw.dueDate || hw.assignedDueDate);
          const startTime = startYMD ? new Date(startYMD).getTime() : null;
          const dueTime = dueYMD ? new Date(dueYMD).getTime() : null;

          const studentIdStr = String(studentId || '');
          const studentUuidStr = String(toUUID(studentId) || '');
          const isMatchStudent = (s) => {
            if (!s) return false;
            const subStudentId = String(s.studentId || s.student_id || s.user_id || s.userId || '');
            return subStudentId === studentIdStr ||
              (studentUuidStr && subStudentId === studentUuidStr) ||
              toUUID(subStudentId) === studentIdStr ||
              (studentUuidStr && toUUID(subStudentId) === studentUuidStr);
          };

          const isMatchHwSub = (s, targetHw, specificTestId = null) => {
            if (!s || !isMatchStudent(s)) return false;
            if (s.status === 'in_progress' || s.status === 'draft') return false;

            const hwIdStr = String(targetHw?.id || '');
            const cleanHwId = hwIdStr.replace(/^hw_/, '');
            const sHwId = String(s.hwId || s.homeworkId || '');
            const sTestId = String(s.testId || '');
            const sRealTestId = String(s.realTestId || s.metadata?.realTestId || '');
            const sBookTestId = String(s.bookTestId || s.metadata?.bookTestId || '');
            const sId = String(s.id || '');

            if (specificTestId) {
              const specStr = String(specificTestId);
              const specClean = specStr.replace(/^q_/, '').replace(/^bt_/, '');
              const specUuid = String(toUUID(specificTestId) || '');
              if (sTestId && (sTestId === specStr || sTestId === specClean || (specUuid && sTestId === specUuid))) return true;
              if (sRealTestId && (sRealTestId === specStr || sRealTestId === specClean || (specUuid && sRealTestId === specUuid))) return true;
              if (sBookTestId && (sBookTestId === specStr || sBookTestId === specClean || (specUuid && sBookTestId === specUuid))) return true;
              if (s.bookTestIds && Array.isArray(s.bookTestIds) && s.bookTestIds.some(tid => String(tid) === specStr || String(tid) === specClean)) return true;
              return false;
            }

            if (sHwId && (sHwId === hwIdStr || sHwId === cleanHwId || sHwId.replace(/^hw_/, '') === cleanHwId)) return true;
            if (sTestId && (sTestId === hwIdStr || sTestId === cleanHwId || sTestId.replace(/^hw_/, '') === cleanHwId || sTestId.replace(/^q_/, '') === cleanHwId)) return true;
            if (sId && (sId === hwIdStr || sId === cleanHwId)) return true;

            const qIds = [
              ...(Array.isArray(targetHw?.questionIds) ? targetHw.questionIds : []),
              ...(Array.isArray(targetHw?.selectedQuestions) ? targetHw.selectedQuestions : []),
              ...(Array.isArray(targetHw?.tests) ? targetHw.tests : []),
              ...(Array.isArray(targetHw?.items) ? targetHw.items : []),
              ...(Array.isArray(targetHw?.sections) ? targetHw.sections.map(sec => typeof sec === 'object' ? (sec.id || sec.questionId) : sec) : [])
            ].map(String);

            if (qIds.length > 0) {
              if (sTestId && qIds.some(qid => qid === sTestId || qid.replace(/^q_/, '') === sTestId.replace(/^q_/, ''))) return true;
              if (sRealTestId && qIds.some(qid => qid === sRealTestId || qid.replace(/^q_/, '') === sRealTestId.replace(/^q_/, ''))) return true;
              if (sBookTestId && qIds.some(qid => qid === sBookTestId || qid.replace(/^q_/, '') === sBookTestId.replace(/^q_/, ''))) return true;
              if (sHwId && qIds.some(qid => qid === sHwId || qid.replace(/^q_/, '') === sHwId.replace(/^q_/, ''))) return true;
            }

            return false;
          };

          const sub = (hw.submissions || []).find(s => isMatchHwSub(s, hw)) ||
            (submissions || []).find(s => isMatchHwSub(s, hw));
          const isDone = !!sub;
          const subYMD = (sub?.createdAt || sub?.submittedAt) ? extractItemYMD(sub.submittedAt || sub.createdAt) : null;

          let isForThisDay = false;
          if (isDone) {
            const completionDay = subYMD || dueYMD || startYMD;
            isForThisDay = (completionDay === dayYMD);
          } else {
            if (dueYMD) {
              isForThisDay = (dayYMD === dueYMD);
            } else if (dueTime && startTime) {
              isForThisDay = (dayTime >= startTime && dayTime <= dueTime);
            } else if (startTime) {
              isForThisDay = (dayTime === startTime);
            }
          }

          if (isForThisDay) {
            const rawDue = hw.dueDate || hw.assignedDueDate;
            let formattedDue = '';
            if (rawDue) {
              try { formattedDue = `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}`; } catch {}
            }

            if (isBook && Array.isArray(hw.tests) && hw.tests.length > 1) {
              hw.tests.forEach((testId, idx) => {
                const isTestSolved = (hw.submissions || []).some(s => isMatchHwSub(s, hw, testId)) ||
                  (submissions || []).some(s => isMatchHwSub(s, hw, testId));

                const tObj = (bookTests || []).find(b => String(b?.id) === String(testId));
                const testTitle = tObj?.name || `Test ${idx + 1}`;
                const exists = dayManualItems.some(m => m.id === `auto_hw_${hw.id}_${testId}` || m.hwId === hw.id);
                if (!exists) {
                  autoHwItems.push({
                    id: `auto_hw_${hw.id}_${testId}`,
                    hwId: hw.id,
                    testId: testId,
                    isAutoHomework: true,
                    taskType: 'kitap',
                    subject: hw.subject || 'Atanan Kitap',
                    title: `${hw.title || 'Kitap'} — ${testTitle}`,
                    questionCount: tObj?.questionCount ? `${tObj.questionCount} soru` : null,
                    time: formattedDue || null,
                    done: isTestSolved
                  });
                }
              });
              return;
            }

            const exists = dayManualItems.some(m => m.id === `auto_hw_${hw.id}` || m.hwId === hw.id);
            if (!exists) {
              autoHwItems.push({
                id: `auto_hw_${hw.id}`,
                hwId: hw.id,
                isAutoHomework: true,
                taskType: hw.isBookAssignment ? 'kitap' : 'ödev',
                subject: hw.subject || 'Atanan Ödev',
                title: hw.title || hw.name || 'Ödev Görevi',
                questionCount: hw.totalQuestions ? `${hw.totalQuestions} soru` : null,
                time: formattedDue || null,
                done: isDone
              });
            }
          }
        });

        (studyAssignments || []).filter(a => String(a?.studentId) === String(studentId)).forEach(assignment => {
          if (!assignment || assignment.status === 'completed' || assignment.status === 'done') return;
          const plan = (studyPlans || []).find(p => String(p?.id) === String(assignment.planId || assignment.studyPlanId));
          if (!plan) return;

          let compTopics = [];
          if (Array.isArray(assignment.completedTopics)) compTopics = assignment.completedTopics;
          else if (typeof assignment.completedTopics === 'string') {
            try { compTopics = JSON.parse(assignment.completedTopics); } catch {}
          }
          const completedTopicsSet = new Set(compTopics.map(String));

          (plan.subjects || []).forEach(subject => {
            (subject?.topics || []).forEach(topic => {
              if (topic?.dueDate) {
                const tYMD = extractItemYMD(topic.dueDate);
                if (dayYMD === tYMD) {
                  const isCompleted = completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name);
                  let formattedTopicTarget = '';
                  try { formattedTopicTarget = `Hedef: ${new Date(topic.dueDate).toLocaleDateString('tr-TR')}`; } catch {}
                  const autoId = `roadmap_top_${assignment.id}_${topic.id}_${dayYMD}`;
                  if (!autoHwItems.some(x => x.id === autoId)) {
                    autoHwItems.push({
                      id: autoId,
                      roadmapAssignmentId: assignment.id,
                      isAutoHomework: true,
                      isRoadmapTask: true,
                      taskType: 'konu',
                      subject: subject.name,
                      bookTitle: plan.title,
                      title: topic.name,
                      time: formattedTopicTarget,
                      done: isCompleted
                    });
                  }
                }
              }
            });
          });
        });

        // ID'ye göre tekilleştir — done:true olanı önceliklendir (önceden kaydedilen duplikeleri temizle)
        const rawAllItems = sortItemsByBookOrder([...autoHwItems, ...dayManualItems, ...scheduleItems], books, bookTests);
        const seenIds = new Map();
        rawAllItems.forEach(item => {
          const key = String(item.id || '');
          if (!key) return;
          const existing = seenIds.get(key);
          if (!existing || (!existing.done && item.done)) {
            seenIds.set(key, item);
          }
        });
        const allItems = Array.from(seenIds.values());
        const completedItems = allItems.filter(i => i.done);

        resultMap[dayMeta.key] = {
          dayKey: dayMeta.key,
          dayName: dayMeta.name,
          short: dayMeta.short,
          dateLabel: dayInfo?.dateLabel || '',
          fullDateLabel: dayInfo?.fullDateLabel || '',
          ymd: dayYMD,
          isToday: dayMeta.key === todayDayKey,
          items: allItems,
          totalCount: allItems.length,
          completedCount: completedItems.length,
          hasAllCompleted: allItems.length > 0 && completedItems.length === allItems.length
        };
      });

      return resultMap;
    } catch (err) {
      console.error('Error computing fullProcessedWeekMap:', err);
      return {};
    }
  }, [coachingProfile, homeworks, selectedStudent, curData, submissions, books, bookTests, schedules, studyAssignments, studyPlans, weekInfo, todayDayKey]);

  const dayProgramInfo = useMemo(() => {
    return fullProcessedWeekMap[activeDayKey] || {
      dayKey: activeDayKey,
      dayName: 'Bugün',
      isToday: activeDayKey === todayDayKey,
      totalCount: 0,
      completedCount: 0,
      items: [],
      hasAllCompleted: false
    };
  }, [fullProcessedWeekMap, activeDayKey, todayDayKey]);

  const handleToggleTask = async (taskOrId) => {
    if (!taskOrId) return;
    const isObj = typeof taskOrId === 'object';
    const taskId = isObj ? taskOrId.id : taskOrId;
    const isScheduleItem = isObj && taskOrId.isScheduleContextItem;

    if (isScheduleItem) {
      await toggleScheduleDone(taskId);
      return;
    }

    // Auto-homework görevleri (kitap testleri, ödeve bağlı görevler) virtual'dır —
    // weeklyProgram'a eklenemeyen bu görevler için toggle yapma, duplike oluşturma
    if (isObj && (taskOrId.isAutoHomework || taskOrId.hwId || taskOrId.testId || taskOrId.roadmapAssignmentId)) {
      return;
    }

    if (coachingProfile) {
      const rawWeekly = Array.isArray(coachingProfile.weeklyProgram) ? coachingProfile.weeklyProgram : [];
      const currentDayRow = rawWeekly.find(r => r.day === activeDayKey);
      const existingItem = (currentDayRow?.items || []).find(i => i.id === taskId);

      let updatedWeeklyProgram;
      if (existingItem) {
        updatedWeeklyProgram = rawWeekly.map(dayRow => {
          if (dayRow.day === activeDayKey) {
            return {
              ...dayRow,
              items: (dayRow.items || []).map(item => item.id === taskId ? { ...item, done: !item.done } : item)
            };
          }
          return dayRow;
        });
      } else {
        // Programda olmayan görevler için ekleme yapma — sadece var olanları güncelle
        return;
      }

      await saveCoachingProfile({
        ...coachingProfile,
        studentId: selectedStudent?.id,
        weeklyProgram: updatedWeeklyProgram
      });
    }
  };

  const weekTasksCountMap = useMemo(() => {
    const map = {};
    DAYS_OF_WEEK.forEach(d => {
      map[d.key] = fullProcessedWeekMap[d.key]?.totalCount || 0;
    });
    return map;
  }, [fullProcessedWeekMap]);

  /* ─── Hero Date & Task Stats for Top KPI Cards (Today & Weekly Program) ─── */
  const taskStats = useMemo(() => {
    // 1. Öncelik: Bugünün Programı (dayProgramInfo) doluysa doğrudan bugünün görevlerini özetle
    if (dayProgramInfo && dayProgramInfo.totalCount > 0) {
      const totalCount = dayProgramInfo.totalCount;
      const completedCount = dayProgramInfo.completedCount;
      const overdueCount = (dayProgramInfo.items || []).filter(i => !i.done && i.isOverdue).length;
      const pendingCount = Math.max(0, totalCount - completedCount);
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : (completedCount > 0 ? 100 : 0);

      return {
        totalCount,
        completedCount,
        pendingCount,
        overdueCount,
        completionRate
      };
    }

    // 2. Öncelik: Haftalık Program (7 günün görevleri)
    let weekTotal = 0;
    let weekCompleted = 0;
    let weekOverdue = 0;
    const seen = new Set();

    DAYS_OF_WEEK.forEach(day => {
      const dayData = fullProcessedWeekMap[day.key];
      if (dayData && Array.isArray(dayData.items)) {
        dayData.items.forEach(item => {
          const itemKey = String(item.uniqueKey || item.id || `${item.hwId}_${item.testId}_${day.key}`);
          if (seen.has(itemKey)) return;
          seen.add(itemKey);

          weekTotal++;
          if (item.done) {
            weekCompleted++;
          } else {
            if (item.isOverdue) weekOverdue++;
          }
        });
      }
    });

    if (weekTotal > 0) {
      const completionRate = Math.round((weekCompleted / weekTotal) * 100);
      return {
        totalCount: weekTotal,
        completedCount: weekCompleted,
        pendingCount: Math.max(0, weekTotal - weekCompleted),
        overdueCount: weekOverdue,
        completionRate
      };
    }

    // 3. Öncelik: Bağımsız Ödevler (tests listesi)
    const totalCount = tests.length;
    const completedCount = tests.filter(t => t.status === 'Sonuçlandı' || t.status === 'Tamamlandı').length;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let overdueCount = 0;
    let pendingCount = 0;

    tests.forEach(t => {
      const isDone = t.status === 'Sonuçlandı' || t.status === 'Tamamlandı';
      if (!isDone) {
        const dueDateObj = parseSafeDate(t.dueDate);
        if (dueDateObj && dueDateObj < now) {
          overdueCount++;
        } else {
          pendingCount++;
        }
      }
    });

    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : (completedCount > 0 ? 100 : 0);

    return {
      totalCount,
      completedCount,
      pendingCount,
      overdueCount,
      completionRate
    };
  }, [dayProgramInfo, fullProcessedWeekMap, tests]);

  const completedCount = taskStats.completedCount;
  const overdueCount = taskStats.overdueCount;
  const pendingCount = taskStats.pendingCount;
  const gradeLabel = curData?.grades?.find(g => g.id === selectedStudent?.gradeId)?.name || '';
  const avatarColor = avatarColors[studentMembers.findIndex(s => s.id === selectedStudent?.id) % avatarColors.length] || '#6366f1';
  const todayStr = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  const solvedQuestionsStats = useMemo(() => {
    if (!selectedStudent) return { today: 0, thisWeek: 0, thisMonth: 0, total: 0 };

    const studentIdStr = String(selectedStudent.id);
    const studentUuidStr = String(toUUID(selectedStudent.id) || '');
    
    // Standart Türkiye Saati (UTC+3) Tarih Aralıkları
    const todayYMD = getTurkeyToday();
    const { startYMD: weekStartYMD, endYMD: weekEndYMD } = getTurkeyWeekRange();
    const { startYMD: monthStartYMD, endYMD: monthEndYMD } = getTurkeyMonthRange();

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let totalCount = 0;

    const countedSubIds = new Set();

    // 1. All Evaluation Submissions
    (submissions || []).forEach(s => {
      const isMatch = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr);
      const isManualTest = s.isManual === true || s.sourceType === 'manual_test' || String(s.id || '').startsWith('sub_manual') || String(s.testId || '').startsWith('sub_manual');
      if (isManualTest) {
        const isApproved = s.approvalStatus === 'approved' || s.isApproved === true || s.status === 'completed';
        if (!isApproved) return;
      } else {
        const testObj = (bookTests || []).find(bt => String(bt.id) === String(s.bookTestId || s.testId) || (toUUID(bt.id) && String(toUUID(bt.id)) === String(s.bookTestId || s.testId)));
        const bookObj = (books || []).find(b => String(b.id) === String(s.bookId || testObj?.bookId) || (toUUID(b.id) && String(toUUID(b.id)) === String(s.bookId || testObj?.bookId)));
        const parentHw = (homeworks || []).find(h => String(h.id) === String(s.testId) || String(h.id) === String(s.hwId) || String(h.id) === String(s.homeworkId) || (toUUID(h.id) && (String(toUUID(h.id)) === String(s.testId) || String(toUUID(h.id)) === String(s.hwId))));

        if ((s.bookId || s.bookTestId || s.isExamBook) && !bookObj && !testObj) return;
        if ((s.hwId || s.homeworkId) && !parentHw && !testObj) return;
        if (!bookObj && !testObj && !parentHw) return;
      }

      const subId = s.id || s.supabaseId || `${s.testId}_${s.submittedAt}`;
      if (countedSubIds.has(subId)) return;
      countedSubIds.add(subId);

      let qCount = 0;
      if (s.totalQuestions && Number(s.totalQuestions) > 0) {
        qCount = Number(s.totalQuestions);
      } else if (Array.isArray(s.answers) && s.answers.length > 0) {
        qCount = s.answers.length;
      } else if (Array.isArray(s.studentAnswers) && s.studentAnswers.length > 0) {
        qCount = s.studentAnswers.length;
      } else if ((s.correctCount !== undefined || s.correct_count !== undefined) && (s.wrongCount !== undefined || s.wrong_count !== undefined)) {
        qCount = (Number(s.correctCount || s.correct_count || 0)) + (Number(s.wrongCount || s.wrong_count || 0)) + (Number(s.blankCount || s.emptyCount || s.empty_count || s.blank_count || 0));
      }

      if (qCount <= 0) {
        const testObj = (tests || []).find(t => String(t.id) === String(s.testId) || String(t.realTestId) === String(s.testId) || String(t.submissionId) === String(s.id));
        qCount = testObj?.questionCount || 20;
      }

      const dateStr = s.submittedAt || s.completedAt || s.createdAt || s.date;
      const subYMD = getTurkeyYMD(dateStr);

      totalCount += qCount;

      if (subYMD) {
        if (subYMD === todayYMD) {
          todayCount += qCount;
        }
        if (subYMD >= weekStartYMD && subYMD <= weekEndYMD) {
          weekCount += qCount;
        }
        if (subYMD >= monthStartYMD && subYMD <= monthEndYMD) {
          monthCount += qCount;
        }
      }
    });

    // 2. All Homework Submissions
    (homeworks || []).forEach(hw => {
      const isBookHw = Boolean(hw.isBookAssignment || hw.bookId || hw.sourceType === 'trackedBook' || hw.title?.includes('(Tüm Kitap Görevi)') || hw.title?.includes('(Tüm Kitap)') || hw.title?.includes('(Kendi Eklediğim)'));
      if (isBookHw) return; // Book assignments are counted via individual test submissions

      (hw.submissions || []).forEach(sub => {
        const isMatch = String(sub.studentId || sub.student_id || sub.user_id) === studentIdStr || (studentUuidStr && String(sub.studentId || sub.student_id || sub.user_id) === studentUuidStr);
        if (!isMatch || sub.status === 'in_progress' || sub.status === 'draft') return;

        const subId = sub.id || `hw_${hw.id}_${studentIdStr}`;
        if (countedSubIds.has(subId)) return;
        countedSubIds.add(subId);

        let qCount = Number(hw.totalQuestions || sub.totalQuestions || (Array.isArray(sub.answers) ? sub.answers.length : 0) || 1);
        const dateStr = sub.completedAt || sub.submittedAt || sub.createdAt || hw.createdAt;
        const subYMD = getTurkeyYMD(dateStr);

        totalCount += qCount;

        if (subYMD) {
          if (subYMD === todayYMD) {
            todayCount += qCount;
          }
          if (subYMD >= weekStartYMD && subYMD <= weekEndYMD) {
            weekCount += qCount;
          }
          if (subYMD >= monthStartYMD && subYMD <= monthEndYMD) {
            monthCount += qCount;
          }
        }
      });
    });

    // 3. All Mock Exams (Deneme Sınavları)
    (studentMockExams || []).forEach(m => {
      if (!m) return;
      const mId = m.id || `mock_${m.title}_${m.date}`;
      if (countedSubIds.has(mId)) return;
      countedSubIds.add(mId);

      let qCount = 0;
      if (m.totalCorrect !== undefined || m.totalWrong !== undefined) {
        qCount = Number(m.totalCorrect || 0) + Number(m.totalWrong || 0) + Number(m.totalEmpty || 0);
      }
      if (qCount <= 0 && m.scores && typeof m.scores === 'object') {
        Object.values(m.scores).forEach(sc => {
          qCount += (Number(sc?.d || 0) + Number(sc?.y || 0) + Number(sc?.b || 0));
        });
      }
      if (qCount <= 0) qCount = Number(m.totalQuestions || m.questionCount || 90);

      const dateStr = m.date || m.createdAt || m.submittedAt;
      const subYMD = getTurkeyYMD(dateStr);

      totalCount += qCount;

      if (subYMD) {
        if (subYMD === todayYMD) {
          todayCount += qCount;
        }
        if (subYMD >= weekStartYMD && subYMD <= weekEndYMD) {
          weekCount += qCount;
        }
        if (subYMD >= monthStartYMD && subYMD <= monthEndYMD) {
          monthCount += qCount;
        }
      }
    });

    const profile = getCoachingProfileForStudent(selectedStudent.id);
    if (profile?.dailyLogs && Array.isArray(profile.dailyLogs)) {
      profile.dailyLogs.forEach(log => {
        if (!log.date) return;
        const logQCount = Number(log.questionCount || log.questionsCount || 0);
        if (logQCount > 0) {
          const logYMD = getTurkeyYMD(log.date);
          if (logYMD === todayYMD) {
            todayCount = Math.max(todayCount, logQCount);
          }
        }
      });
    }

    return {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      total: totalCount
    };
  }, [selectedStudent, submissions, homeworks, studentMockExams, tests, getCoachingProfileForStudent]);

  const goalTrackingData = useMemo(() => {
    if (!selectedStudent?.id) {
      return { hasAnyGoals: false, visualGoals: [], monthly: [], weekly: [], daily: [], totalItemsCount: 0 };
    }
    const profile = getCoachingProfileForStudent(selectedStudent.id) || {};
    const g = profile.goals || {};

    let monthly = [];
    const rawM = profile.monthlyGoals || g.monthlyGoals;
    if (Array.isArray(rawM)) {
      monthly = rawM.map((item, idx) => typeof item === 'string' ? { id: `m_${idx}`, text: item, done: false } : item);
    } else if (typeof rawM === 'string' && rawM.trim()) {
      monthly = rawM.split('\n').filter(Boolean).map((line, idx) => ({
        id: `m_${idx}`,
        text: line.replace(/^[•\-\*\d\.\s]+/, '').trim(),
        done: false
      }));
    }

    let weekly = [];
    const rawW = profile.weeklyGoals || g.weeklyGoals;
    if (Array.isArray(rawW)) {
      weekly = rawW.map((item, idx) => typeof item === 'string' ? { id: `w_${idx}`, text: item } : item);
    } else if (typeof rawW === 'string' && rawW.trim()) {
      weekly = rawW.split('\n').filter(Boolean).map((line, idx) => ({
        id: `w_${idx}`,
        text: line.replace(/^[•\-\*\d\.\s]+/, '').trim()
      }));
    }

    let daily = [];
    const rawD = profile.dailyGoals || g.dailyGoals;
    if (Array.isArray(rawD)) {
      daily = rawD.map((item, idx) => typeof item === 'string' ? { id: `d_${idx}`, text: item } : item);
    } else if (typeof rawD === 'string' && rawD.trim()) {
      daily = rawD.split('\n').filter(Boolean).map((line, idx) => ({
        id: `d_${idx}`,
        text: line.replace(/^[•\-\*\d\.\s]+/, '').trim()
      }));
    }

    const rawVisualGoals = (goals || []).filter(item => String(item.studentId) === String(selectedStudent.id));
    const visualGoals = rawVisualGoals.map(goalItem => {
      if (goalItem.type === 'Soru') {
        const autoSystemValue = (
          goalItem.period === 'Günlük' ? solvedQuestionsStats.today :
          goalItem.period === 'Haftalık' ? solvedQuestionsStats.thisWeek :
          goalItem.period === 'Aylık' ? solvedQuestionsStats.thisMonth :
          solvedQuestionsStats.total
        );
        const effectiveCurrent = Math.max(goalItem.current || 0, autoSystemValue);
        return {
          ...goalItem,
          autoSystemValue,
          effectiveCurrent,
          isAutoTracked: true
        };
      }
      return {
        ...goalItem,
        effectiveCurrent: goalItem.current || 0,
        isAutoTracked: false
      };
    });

    const totalItemsCount = visualGoals.length + monthly.length + weekly.length + daily.length;

    return {
      hasAnyGoals: totalItemsCount > 0,
      monthly,
      weekly,
      daily,
      visualGoals,
      totalItemsCount
    };
  }, [selectedStudent?.id, getCoachingProfileForStudent, coachingLinks, goals, solvedQuestionsStats]);

  return (
    <div className="student-dashboard-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.04); opacity: 1; }
        }
        @keyframes onlinePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.75); }
          60% { box-shadow: 0 0 0 7px rgba(34,197,94,0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes floatBlob {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-14px) scale(1.07); }
        }
        @keyframes ringRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sd-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .sd-btn:hover { transform: translateY(-2px); filter: brightness(1.12); }
        .sd-btn:active { transform: translateY(0); }
        .sd-card { transition: all 0.25s ease; }
        .sd-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(99, 102, 241, 0.15) !important; border-color: #818cf8 !important; }
        .sd-kpi { transition: all 0.22s cubic-bezier(0.4,0,0.2,1); cursor: pointer; position: relative; overflow: hidden; }
        .sd-kpi::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%); border-radius: inherit; pointer-events: none; }
        .sd-kpi:hover { transform: translateY(-6px) scale(1.04); box-shadow: 0 18px 48px rgba(0,0,0,0.45) !important; }
        .sd-success { transition: all 0.25s cubic-bezier(0.4,0,0.2,1); cursor: pointer; }
        .sd-success:hover { transform: scale(1.1) rotate(3deg); }
        .sd-online { animation: onlinePulse 2.2s ease-in-out infinite; }
        .sd-avatar-ring { animation: ringRotate 8s linear infinite; }
        .sd-grid-layout { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 1.5rem; align-items: start; }
        @media (max-width: 1024px) { .sd-grid-layout { grid-template-columns: 1fr; gap: 1.25rem; } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 99px; } ::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.3); border-radius: 99px; }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          PREMIUM VIBRANT HEADER
      ══════════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(125deg, #1e1065 0%, #2d1b8e 15%, #4338ca 38%, #6d28d9 58%, #9333ea 78%, #c026d3 100%)',
        position: 'relative',
        paddingBottom: isMobile ? '2.8rem' : '3.8rem'
      }}>
        {/* Mesh texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          opacity: 0.6
        }} />

        {/* Decorative blobs */}
        <div style={{ position:'absolute', top: -80, right: isMobile ? -60 : 60, width: isMobile ? 220 : 380, height: isMobile ? 220 : 380, borderRadius:'50%', background:'radial-gradient(circle, rgba(196,91,253,0.28) 0%, transparent 68%)', pointerEvents:'none', animation:'floatBlob 7s ease-in-out infinite' }} />
        <div style={{ position:'absolute', bottom: -60, left: '15%', width: 260, height: 260, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 65%)', pointerEvents:'none', animation:'floatBlob 9s ease-in-out infinite reverse' }} />
        <div style={{ position:'absolute', top: '10%', left: isMobile ? -40 : 0, width: 160, height: 160, borderRadius:'50%', background:'radial-gradient(circle, rgba(79,70,229,0.3) 0%, transparent 70%)', pointerEvents:'none' }} />

        {/* Top glowing line */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, transparent 0%, rgba(196,91,253,0.8) 30%, rgba(99,102,241,0.9) 55%, rgba(196,91,253,0.8) 75%, transparent 100%)', pointerEvents:'none' }} />

        {/* ── Profil Satırı ── */}
        <div style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: isMobile ? '1.25rem 1rem 0.9rem' : '1.8rem 2.5rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          position: 'relative',
          zIndex: 1
        }}>
          {/* SOL: Avatar + İsim + Rozetler */}
          <div style={{ display:'flex', alignItems:'center', gap: isMobile ? '1rem' : '1.6rem', minWidth: 0, flex: 1 }}>

            {/* Avatar with ring */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{
                position:'absolute',
                inset: -4,
                borderRadius:'50%',
                background:'conic-gradient(from 0deg, #818cf8, #c084fc, #f472b6, #818cf8)',
                padding: 2
              }}>
                <div style={{ inset:0, borderRadius:'50%', background:'rgba(30,16,101,0.7)', position:'absolute' }} />
              </div>
              <div style={{
                width: isMobile ? 66 : 88,
                height: isMobile ? 66 : 88,
                borderRadius:'50%',
                background: `linear-gradient(145deg, ${avatarColor}cc 0%, ${avatarColor} 100%)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: isMobile ? '1.75rem' : '2.45rem',
                fontWeight: 900,
                color:'#ffffff',
                position:'relative',
                zIndex:1,
                boxShadow:`0 0 0 3px rgba(255,255,255,0.25), 0 12px 32px ${avatarColor}80`
              }}>
                {selectedStudent?.name?.charAt(0)?.toUpperCase() || 'Ö'}
              </div>
              <div className="sd-online" style={{
                position:'absolute', bottom:3, right:3, zIndex:2,
                width: isMobile ? 16 : 20,
                height: isMobile ? 16 : 20,
                borderRadius:'50%',
                background:'linear-gradient(135deg, #4ade80, #22c55e)',
                border: `${isMobile ? 2.5 : 3}px solid rgba(30,16,101,0.9)`,
                boxShadow:'0 2px 8px rgba(34,197,94,0.6)'
              }} />
            </div>

            {/* İsim + Rozetler */}
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{
                fontSize: isMobile ? '0.65rem' : '0.75rem',
                fontWeight: 800,
                color:'rgba(196,181,253,0.95)',
                textTransform:'uppercase',
                letterSpacing:'0.14em',
                marginBottom: 3,
                display:'flex', alignItems:'center', gap:5
              }}>
                <span style={{ opacity:0.85 }}>HOŞ GELDİN</span>
                <span>👏</span>
              </div>

              <h1 style={{
                fontSize: isMobile ? '1.55rem' : '2.6rem',
                fontWeight: 900,
                color:'#ffffff',
                margin:'0 0 10px 0',
                lineHeight:1.05,
                letterSpacing:'-0.03em',
                textShadow:'0 4px 24px rgba(0,0,0,0.35)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
              }}>
                {selectedStudent?.name || 'Öğrenci'}
              </h1>

              {/* Pill badges */}
              <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                <div style={{
                  background:'rgba(255,255,255,0.12)',
                  backdropFilter:'blur(16px)',
                  border:'1px solid rgba(255,255,255,0.25)',
                  borderRadius:999,
                  padding: isMobile ? '4px 11px' : '5px 15px',
                  fontSize: isMobile ? '0.68rem' : '0.78rem',
                  fontWeight:700, color:'rgba(255,255,255,0.95)',
                  display:'inline-flex', alignItems:'center', gap:5,
                  boxShadow:'0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  <span>🗓</span><span>{heroDateStr}</span>
                </div>
                <div style={{
                  background: hasCoach ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.1)',
                  backdropFilter:'blur(16px)',
                  border: hasCoach ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.2)',
                  borderRadius:999,
                  padding: isMobile ? '4px 11px' : '5px 15px',
                  fontSize: isMobile ? '0.68rem' : '0.78rem',
                  fontWeight:800,
                  color: hasCoach ? '#86efac' : 'rgba(255,255,255,0.9)',
                  display:'inline-flex', alignItems:'center', gap:5,
                  boxShadow:'0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  <span>🎓</span><span>{hasCoach ? 'Koçum Var' : (gradeLabel || 'Öğrenci')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SAĞ: Premium Başarı Halkası */}
          <div
            onClick={() => navigate('/student/results')}
            className="sd-success"
            style={{ flexShrink:0 }}
          >
            <div style={{
              width: isMobile ? 84 : 116,
              height: isMobile ? 84 : 116,
              position:'relative',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <svg width={isMobile ? 84 : 116} height={isMobile ? 84 : 116} style={{ position:'absolute', inset:0 }}>
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#67e8f9" />
                  </linearGradient>
                </defs>
                <circle
                  cx={isMobile ? 42 : 58} cy={isMobile ? 42 : 58}
                  r={isMobile ? 36 : 50}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={isMobile ? 5 : 6}
                />
                <circle
                  cx={isMobile ? 42 : 58} cy={isMobile ? 42 : 58}
                  r={isMobile ? 36 : 50}
                  fill="none"
                  stroke="url(#ringGrad)"
                  strokeWidth={isMobile ? 5 : 6}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * (isMobile ? 36 : 50)}`}
                  strokeDashoffset={`${2 * Math.PI * (isMobile ? 36 : 50) * (1 - overallSuccessRate / 100)}`}
                  transform={`rotate(-90 ${isMobile ? 42 : 58} ${isMobile ? 42 : 58})`}
                  style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                />
              </svg>
              <div style={{
                width: isMobile ? 64 : 90,
                height: isMobile ? 64 : 90,
                borderRadius:'50%',
                background:'rgba(255,255,255,0.1)',
                backdropFilter:'blur(12px)',
                border:'1.5px solid rgba(255,255,255,0.22)',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                boxShadow:'0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)'
              }}>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight:900, color:'#fff', lineHeight:1, letterSpacing:'-0.03em' }}>
                  %{overallSuccessRate}
                </div>
                <div style={{ fontSize: isMobile ? '0.5rem' : '0.62rem', fontWeight:900, color:'rgba(196,181,253,0.9)', letterSpacing:'0.12em', marginTop:3, textTransform:'uppercase' }}>
                  BAŞARI
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Selector */}
        {currentUser?.role !== 'student' && studentMembers.length > 1 && (
          <div style={{ maxWidth:1280, margin:'0 auto', padding: isMobile ? '0 1rem 0.5rem' : '0 2.5rem 0.5rem', display:'flex', alignItems:'center', gap:10, position:'relative', zIndex:1 }}>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.12)' }} />
            <span style={{ fontSize:'0.75rem', fontWeight:800, color:'#fde68a', whiteSpace:'nowrap' }}>👁️ Öğrenci İncele:</span>
            <select
              value={selectedStudent?.id || ''}
              onChange={e => {
                const s = studentMembers.find(st => String(st.id) === String(e.target.value));
                if (s) setSelectedStudent(s);
              }}
              style={{ background:'rgba(15,23,42,0.85)', color:'white', border:'1px solid rgba(255,255,255,0.25)', borderRadius:10, padding:'0.35rem 0.75rem', fontSize:'0.8rem', fontWeight:700, backdropFilter:'blur(8px)' }}
            >
              {studentMembers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className || 'Sınıf'})</option>)}
            </select>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.12)' }} />
          </div>
        )}
      </div>

      {/* ── KPI Kartları — yarısı header'a biner, yarısı içeriğe taşar (Overlap) ── */}
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: isMobile ? '0 0.85rem' : '0 2.5rem',
        marginTop: isMobile ? '-36px' : '-52px',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: isMobile ? '0.4rem' : '0.75rem'
        }}>
          {[
            { label:'TOPLAM',     value: taskStats.totalCount,           emoji:'📋', grad:'linear-gradient(160deg,#4f46e5,#3730a3)',  glow:'rgba(79,70,229,0.55)',   route:'/student/homeworks' },
            { label:'TAMAMLANDI', value: taskStats.completedCount,       emoji:'✅', grad:'linear-gradient(160deg,#059669,#047857)',   glow:'rgba(16,185,129,0.55)',  route:'/student/results' },
            { label:'BEKLİYOR',   value: taskStats.pendingCount,         emoji:'⏳', grad:'linear-gradient(160deg,#d97706,#b45309)',   glow:'rgba(245,158,11,0.55)',  route:'/student/homeworks' },
            { label:'GECİKTİ',   value: taskStats.overdueCount,         emoji:'🔥', grad:'linear-gradient(160deg,#e11d48,#be123c)',   glow:'rgba(239,68,68,0.55)',   route:'/student/homeworks' },
            { label:'TAMAMLANMA', value: `%${taskStats.completionRate}`, emoji:'🏆', grad:'linear-gradient(160deg,#7c3aed,#6d28d9)',  glow:'rgba(139,92,246,0.55)', route:'/student/results' },
          ].map((kpi) => (
            <div
              key={kpi.label}
              onClick={() => navigate(kpi.route)}
              className="sd-kpi"
              style={{
                background: kpi.grad,
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: isMobile ? 16 : 22,
                padding: isMobile ? '0.7rem 0.25rem 0.6rem' : '1.15rem 0.5rem 1rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center',
                boxShadow: `0 12px 36px ${kpi.glow}, 0 2px 0 rgba(255,255,255,0.15) inset`,
                minHeight: isMobile ? 76 : 108
              }}
            >
              <div style={{ fontSize: isMobile ? '1.15rem' : '1.5rem', lineHeight: 1, marginBottom: 4 }}>{kpi.emoji}</div>
              <div style={{ fontSize: isMobile ? '1.4rem' : '2.2rem', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em' }}>{kpi.value}</div>
              <div style={{ fontSize: isMobile ? '0.5rem' : '0.66rem', fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.1em', marginTop: 5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          ANA İÇERİK — DENGELİ ORTA-AÇIK SLATE TEMASI
      ════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '1rem 0.85rem 3rem' : '1.5rem 2.5rem 4rem' }}>

        {/* ════════════════════════════════════════════
            2. HAFTALIK DERS PROGRAMI ŞERİDİ (7-DAY NAVIGATOR)
        ════════════════════════════════════════════ */}
        <div className="sd-card" style={{
          padding: isMobile ? '0.85rem 0.75rem' : '1.1rem 1.4rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={17} color="#6366f1" />
              </div>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  Haftalık Çalışma & Görev Takvimi
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, marginLeft: 8 }}>
                  (Günü seçerek o günkü görevleri gör)
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/my-program')}
              className="sd-btn"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                border: 'none',
                color: '#ffffff',
                borderRadius: 10,
                padding: '0.4rem 0.9rem',
                fontSize: '0.75rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
              }}
            >
              <CalendarDays size={13} /> Programı Düzenle <ChevronRight size={13} />
            </button>
          </div>

          {/* 7-Day Week Buttons Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 4 : 8 }}>
            {DAYS_OF_WEEK.map(day => {
              const isSelected = activeDayKey === day.key;
              const isCurrentToday = todayDayKey === day.key;
              const taskCount = weekTasksCountMap[day.key] || 0;
              const dayDate = weekInfo.dayDateMap[day.key];

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setActiveDayKey(day.key)}
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                      : isCurrentToday
                      ? 'var(--color-surface-hover)'
                      : 'var(--color-surface)',
                    border: isSelected
                      ? '2px solid #6366f1'
                      : isCurrentToday
                      ? '1.5px solid #6366f1'
                      : '1px solid var(--color-border)',
                    borderRadius: 14,
                    padding: isMobile ? '0.5rem 0.15rem' : '0.7rem 0.5rem',
                    color: isSelected ? '#ffffff' : isCurrentToday ? '#818cf8' : 'var(--color-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    boxShadow: isSelected ? '0 6px 20px rgba(99, 102, 241, 0.35)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: isMobile ? '0.7rem' : '0.85rem', fontWeight: 900 }}>
                    {day.short}
                  </span>

                  <span style={{
                    fontSize: isMobile ? '0.58rem' : '0.72rem',
                    fontWeight: 800,
                    color: isSelected ? '#ffffff' : isCurrentToday ? '#6366f1' : 'var(--color-text-muted, #64748b)',
                    background: isSelected ? 'rgba(255,255,255,0.22)' : 'var(--color-surface-hover, #e2e8f0)',
                    padding: isMobile ? '1px 3px' : '2px 6px',
                    borderRadius: 6
                  }}>
                    {dayDate?.dateLabel || ''}
                  </span>

                  {isCurrentToday ? (
                    <span style={{ fontSize: isMobile ? '0.50rem' : '0.62rem', fontWeight: 900, color: isSelected ? '#fde047' : '#d97706' }}>
                      ● Bugün
                    </span>
                  ) : taskCount > 0 ? (
                    <span style={{ fontSize: isMobile ? '0.50rem' : '0.62rem', fontWeight: 800, color: isSelected ? '#ffffff' : '#6366f1' }}>
                      {taskCount} görev
                    </span>
                  ) : (
                    <span style={{ fontSize: isMobile ? '0.50rem' : '0.62rem', opacity: 0.4 }}>
                      -
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ════════════════════════════════════════════
            4. ANA GRID (SOL: GÜNÜN GÖREVLERİ, ÖDEVLER & TESTLER | SAĞ: PERİYODİK ANALİZ, HEDEFLER & İLHAM)
        ════════════════════════════════════════════ */}
        <div className="sd-grid-layout">

          {/* ──── SOL KOLON: GÜNÜN GÖREVLERİ, ÇALIŞMA, ÖDEVLER & TESTLER ──── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* 🎯 BÖLÜM 1: EYLEM MERKEZİ (GÜNÜN GÖREVLERİ) */}
            <div
              className="sd-card"
              style={{
                padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
                      <CheckSquare size={18} color="#ffffff" />
                    </div>
                    <div>
                      <span style={{ fontSize: '1.02rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                        {dayProgramInfo.isToday ? '🎯 Bugün Ne Yapacağım?' : `📅 ${dayProgramInfo.dayName} Görevleri`}
                      </span>
                      {dayProgramInfo.fullDateLabel && (
                        <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 700, marginTop: 1 }}>
                          📌 {dayProgramInfo.fullDateLabel}
                        </div>
                      )}
                    </div>
                  </div>

                  {dayProgramInfo.totalCount > 0 && (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      padding: '4px 11px',
                      borderRadius: 99,
                      background: dayProgramInfo.hasAllCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: dayProgramInfo.hasAllCompleted ? '#10b981' : '#6366f1',
                      border: dayProgramInfo.hasAllCompleted ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(99, 102, 241, 0.35)'
                    }}>
                      {dayProgramInfo.completedCount}/{dayProgramInfo.totalCount} Tamamlandı
                    </span>
                  )}
                </div>

                {dayProgramInfo.items.length > 0 ? (
                  <div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      maxHeight: isMobile ? 'none' : '380px',
                      overflowY: isMobile ? 'visible' : 'auto',
                      paddingRight: isMobile ? 0 : 4,
                      overscrollBehavior: 'contain'
                    }}>
                      {(showAllDayTasks || !isMobile ? dayProgramInfo.items : dayProgramInfo.items.slice(0, 4)).map((task, idx) => {
                        const isQuizTask = task.isAutoHomework || task.testId || task.hwId || task.roadmapAssignmentId;
                        const handleTaskClick = () => {
                          if (task.roadmapAssignmentId) { navigate(`/student/study-plan/${task.roadmapAssignmentId}`); return; }
                          if (task.isExamTask || task.taskType === 'deneme') {
                            navigate(`/physical-exam/${task.hwId}?studentId=${selectedStudent.id}`);
                            return;
                          }
                          if (task.testId) { navigate(`/book-quiz/${task.testId}?studentId=${selectedStudent.id}`); return; }
                          if (task.hwId) {
                            const hwObj = (homeworks || []).find(h => String(h.id) === String(task.hwId));
                            const matchingBook = books?.find(b => String(b.id) === String(hwObj?.bookId) || toUUID(b.id) === toUUID(hwObj?.bookId));
                            const isExam = hwObj?.type === 'physicalExam' || hwObj?.contentType === 'physicalExam' || matchingBook?.bookType === 'exam' || hwObj?.isPhysical || task.isExamTask || (hwObj?.title && hwObj.title.toLowerCase().includes('deneme'));
                            if (isExam) navigate(`/physical-exam/${task.hwId}?studentId=${selectedStudent.id}`);
                            else if (hwObj?.isBookAssignment && hwObj?.tests?.length > 0) navigate(`/book-quiz/${hwObj.tests[0]}?studentId=${selectedStudent.id}`);
                            else navigate(`/quiz/${task.hwId}?studentId=${selectedStudent.id}`);
                            return;
                          }
                          handleToggleTask(task);
                        };

                        const isExamItem = task.isExamTask || task.taskType === 'deneme';

                        return (
                          <div
                            key={`${task.id || 'task'}_${idx}`}
                            onClick={handleTaskClick}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              background: task.done ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-surface-hover, #f8fafc)',
                              border: task.done ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--color-border, #e2e8f0)',
                              padding: '0.7rem 0.9rem',
                              borderRadius: 14,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, flex: 1, minWidth: 0 }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleToggleTask(task); }}
                                style={{
                                  width: 21,
                                  height: 21,
                                  marginTop: 2,
                                  borderRadius: 6,
                                  border: task.done ? 'none' : '1.5px solid var(--color-border-input, #94a3b8)',
                                  background: task.done ? '#22c55e' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                {task.done && <Check size={13} color="#ffffff" strokeWidth={3} />}
                              </button>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                                  {task.subject && (
                                    <span style={{
                                      fontSize: '0.62rem',
                                      fontWeight: 900,
                                      color: isExamItem ? '#92400e' : '#6366f1',
                                      background: isExamItem ? '#fef3c7' : 'rgba(99, 102, 241, 0.12)',
                                      border: isExamItem ? '1px solid #fde68a' : '1px solid rgba(165, 180, 252, 0.35)',
                                      padding: '1px 6px',
                                      borderRadius: 5,
                                      flexShrink: 0
                                    }}>
                                      {task.subject}
                                    </span>
                                  )}
                                  <span style={{
                                    fontSize: '0.84rem',
                                    fontWeight: 800,
                                    color: task.done ? 'var(--color-text-muted, #94a3b8)' : 'var(--color-text, #0f172a)',
                                    textDecoration: task.done ? 'line-through' : 'none',
                                    wordBreak: 'break-word',
                                    lineHeight: 1.3
                                  }}>
                                    {task.title || task.testName || task.topic || 'Ders Çalışması'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600, marginTop: 3 }}>
                                  {task.bookTitle && (
                                    <span style={{ color: 'var(--color-text, #334155)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 140 : 200 }}>
                                      📖 {task.bookTitle}
                                    </span>
                                  )}
                                  {task.unitTopic && !task.bookTitle && (
                                    <span>📌 {task.unitTopic}</span>
                                  )}
                                  {task.questionCount && (
                                    <span>• {task.questionCount}</span>
                                  )}
                                  {task.time && (
                                    <span>• ⏰ {task.time}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {isQuizTask && !task.done && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleTaskClick(); }}
                                style={{
                                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 9,
                                  padding: '0.4rem 0.75rem',
                                  fontSize: '0.74rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  flexShrink: 0,
                                  boxShadow: '0 3px 10px rgba(99, 102, 241, 0.35)'
                                }}
                              >
                                <PlayCircle size={14} /> Çöz
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {isMobile && dayProgramInfo.items.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setShowAllDayTasks(prev => !prev)}
                        style={{
                          width: '100%',
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: '1.5px dashed rgba(99, 102, 241, 0.4)',
                          borderRadius: 12,
                          padding: '0.55rem 0.8rem',
                          color: '#6366f1',
                          fontWeight: 800,
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          marginTop: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        {showAllDayTasks ? (
                          <>▲ Daha Az Göster</>
                        ) : (
                          <>▼ Diğer {dayProgramInfo.items.length - 4} Görevi Göster</>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '1.5rem', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16, border: '1px dashed var(--color-border-input, #cbd5e1)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.84rem', color: 'var(--color-text-muted, #64748b)', fontStyle: 'italic' }}>
                      {dayProgramInfo.isToday ? 'Bugün için kayıtlı görev yok. Harika gidiyorsun! 🎉' : `${dayProgramInfo.dayName} günü için görev bulunamadı.`}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <Link to="/my-program" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Haftalık Programa Git <ChevronRight size={13} />
                </Link>
              </div>
            </div>

            {/* 📋 BÖLÜM 1: ÖDEVLERİM & GÖREV TAKİBİ */}
            <div className="sd-card" style={{
              padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>
                    📋
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
                      Ödevlerim & Görev Takibi
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Öğretmeniniz veya koçunuz tarafından atanan ödevlerin durumu
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/student/homeworks')}
                  style={{
                    background: pendingCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: pendingCount > 0 ? '#ef4444' : '#10b981',
                    border: pendingCount > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: 99,
                    padding: '0.3rem 0.8rem',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  {pendingCount > 0 ? `${pendingCount} Bekleyen Ödev` : 'Tümü Tamamlandı 🎉'}
                  <ChevronRight size={12} />
                </button>
              </div>

              {pendingTasks.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16, border: '1px dashed var(--color-border-input, #cbd5e1)' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>🎉</div>
                  <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.92rem', marginBottom: 4 }}>
                    Henüz bekleyen ödeviniz yok!
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
                    Öğretmeniniz veya koçunuz yeni ödev atadığında burada listelenecektir. Geçmiş ödevleriniz için tümünü gör butonuna tıklayabilirsiniz.
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: '1.15rem',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  {pendingTasks.slice(0, 5).map((task, idx) => {
                    const rowTheme = getRowTheme(task.subject, idx);
                    const isOverdue = !task.isDone && task.dueDateObj && isPast(task.dueDateObj) && !isToday(task.dueDateObj);
                    const isLast = idx === Math.min(pendingTasks.length, 5) - 1;

                    const rawTitle = task.title || task.name || task.testName || 'Ödev Görevi';
                    const rawBook = task.bookTitle || '';
                    let displayTitle = rawTitle;
                    if (rawBook && displayTitle.toLowerCase().includes(rawBook.toLowerCase())) {
                      const regex = new RegExp(rawBook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                      displayTitle = displayTitle.replace(regex, '').replace(/^[\s\—\-\:\/]+/, '').trim();
                      if (!displayTitle) displayTitle = task.testName || rawTitle;
                    }

                    return (() => {
                    const handleHwClick = (e) => {
                      e?.stopPropagation();
                      const hwObj = (homeworks || []).find(h => String(h.id) === String(task.hwId || task.id));
                      const matchingBook = books?.find(b => String(b.id) === String(hwObj?.bookId));
                      const isExam = hwObj?.type === 'physicalExam' || hwObj?.contentType === 'physicalExam' || matchingBook?.bookType === 'exam' || hwObj?.isPhysical;
                      const realTestId = task.realTestId || task.testId;
                      if (isExam) navigate(`/physical-exam/${task.hwId || task.id}?studentId=${selectedStudent.id}`);
                      else if (realTestId && realTestId !== (task.hwId || task.id)) navigate(`/quiz/${realTestId}?studentId=${selectedStudent.id}`);
                      else if (hwObj?.id) navigate(`/quiz/${hwObj.id}?studentId=${selectedStudent.id}`);
                      else navigate('/student/homeworks');
                    };
                    const isDueToday = !task.isDone && task.dueDateObj && isToday(task.dueDateObj);
                    const dueLabel = task.dueDateObj ? task.dueDateObj.toLocaleDateString('tr-TR') : '';

                    return (
                      <div
                        key={task.id || idx}
                        onClick={handleHwClick}
                        className="hw-row"
                        style={{
                          background: 'var(--color-surface)',
                          borderLeft: `5px solid ${task.isDone ? '#10b981' : isOverdue ? '#e11d48' : isDueToday ? '#f59e0b' : (rowTheme.accent || '#6366f1')}`,
                          borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                          padding: '1rem 1.2rem 1rem 1.1rem',
                          display: 'flex',
                          alignItems: 'stretch',
                          gap: '0.9rem',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* SOL: Durum İkonu */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: task.isDone ? 'rgba(16,185,129,0.12)' : isOverdue ? 'rgba(225,29,72,0.1)' : isDueToday ? 'rgba(245,158,11,0.12)' : (rowTheme.badgeBg || 'var(--color-surface-hover)'),
                            color: task.isDone ? '#10b981' : isOverdue ? '#e11d48' : isDueToday ? '#f59e0b' : (rowTheme.accent || '#6366f1'),
                            border: `2px solid ${task.isDone ? 'rgba(16,185,129,0.3)' : isOverdue ? 'rgba(225,29,72,0.3)' : isDueToday ? 'rgba(245,158,11,0.3)' : (rowTheme.border || 'var(--color-border)')}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem', fontWeight: 900, flexShrink: 0
                          }}>
                            {task.isDone ? '✓' : isOverdue ? '!' : isDueToday ? '⚡' : '⏳'}
                          </div>
                        </div>

                        {/* ORTA: Tüm Bilgiler */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>

                          {/* Rozet Satırı */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            {task.isDone ? (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:'0.65rem', fontWeight:800, color:'#059669', background:'#d1fae5', padding:'2px 7px', borderRadius:99, border:'1px solid rgba(16,185,129,0.3)', whiteSpace:'nowrap' }}>✓ Tamamlandı</span>
                            ) : isOverdue ? (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:'0.65rem', fontWeight:800, color:'#be123c', background:'#ffe4e6', padding:'2px 7px', borderRadius:99, border:'1px solid rgba(225,29,72,0.25)', whiteSpace:'nowrap' }}>
                                {task.dueDateObj ? ((() => { const d = Math.abs(Math.ceil((task.dueDateObj.getTime() - new Date().setHours(0,0,0,0)) / 86400000)); return d === 1 ? '⚠ 1 gün geçti' : `⚠ ${d} gün geçti`; })()) : '⚠ Süresi Doldu'}
                              </span>
                            ) : isDueToday ? (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:'0.65rem', fontWeight:800, color:'#b45309', background:'#fef3c7', padding:'2px 7px', borderRadius:99, border:'1px solid rgba(245,158,11,0.3)', whiteSpace:'nowrap' }}>⚡ Bugün Son</span>
                            ) : (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:'0.65rem', fontWeight:800, color: rowTheme.text||'#6366f1', background: rowTheme.badgeBg||'var(--color-surface-hover)', padding:'2px 7px', borderRadius:99, border:`1px solid ${rowTheme.border||'var(--color-border)'}`, whiteSpace:'nowrap' }}>
                                {task.dueDateObj ? ((() => { const d = Math.ceil((task.dueDateObj.getTime() - new Date().setHours(0,0,0,0)) / 86400000); return d === 1 ? '⏳ Yarın son' : `⏳ ${d} gün kaldı`; })()) : '⏳ Bekliyor'}
                              </span>
                            )}
                            {task.subject && (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:'0.65rem', fontWeight:800, color: rowTheme.text||'#6366f1', background: rowTheme.badgeBg||'var(--color-surface-hover)', padding:'2px 8px', borderRadius:99, border:`1px solid ${rowTheme.border||'var(--color-border)'}`, whiteSpace:'nowrap' }}>
                                {task.subject}
                              </span>
                            )}
                            <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:'0.65rem', fontWeight:800, color: task.isPhysical?'#92400e':task.isBookAssignment?'#065f46':'#4c1d95', background: task.isPhysical?'#fef3c7':task.isBookAssignment?'#d1fae5':'#ede9fe', padding:'2px 8px', borderRadius:99, border: task.isPhysical?'1px solid #fde68a':task.isBookAssignment?'1px solid #6ee7b7':'1px solid #ddd6fe', whiteSpace:'nowrap' }}>
                              {task.isPhysical ? '📋 Deneme' : task.isBookAssignment ? '📖 Kitap' : '🎯 Dijital'}
                            </span>
                          </div>

                          {/* Başlık */}
                          <div style={{ fontSize:'0.95rem', fontWeight:900, color:'var(--color-text)', lineHeight:1.3, letterSpacing:'-0.01em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {displayTitle}
                          </div>

                          {/* Kitap adı */}
                          {rawBook && (
                            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--color-text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                              <BookOpen size={11} /> {rawBook}
                            </div>
                          )}

                          {/* Bilgi Çipleri */}
                          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:700, color:'var(--color-text-muted)' }}>
                              <Target size={11} style={{ color: rowTheme.accent||'#6366f1' }} />
                              {task.questionCount || 0} Soru
                            </span>
                            {dueLabel && (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:700, color: isOverdue?'#be123c': isDueToday?'#b45309':'var(--color-text-muted)' }}>
                                <Calendar size={11} style={{ color: isOverdue?'#e11d48':isDueToday?'#f59e0b':(rowTheme.accent||'#6366f1') }} />
                                Son: {dueLabel}
                              </span>
                            )}
                            {task.isDone && task.submittedAt && (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:700, color:'#059669' }}>
                                <CheckCircle2 size={11} /> {new Date(task.submittedAt).toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>

                          {/* Skor Çubuğu */}
                          {task.isDone && task.scorePct !== null && (
                            <div>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                                <span style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--color-text-muted)' }}>
                                  {task.correctAnswers||0} / {task.totalScoreQuestions||task.questionCount||20} doğru
                                </span>
                                <span style={{ fontSize:'0.8rem', fontWeight:900, color: task.scorePct>=80?'#10b981':task.scorePct>=50?'#3b82f6':'#e11d48' }}>
                                  %{task.scorePct}
                                </span>
                              </div>
                              <div style={{ height:5, background:'var(--color-border)', borderRadius:99, overflow:'hidden' }}>
                                <div style={{
                                  height:'100%', width:`${task.scorePct}%`,
                                  background: task.scorePct>=80?'linear-gradient(90deg,#34d399,#10b981)':task.scorePct>=50?'linear-gradient(90deg,#60a5fa,#3b82f6)':'linear-gradient(90deg,#fb7185,#e11d48)',
                                  borderRadius:99, transition:'width 0.8s ease'
                                }} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SAĞ: Aksiyon */}
                        <div style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
                          {task.isDone ? (
                            <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(16,185,129,0.12)', color:'#10b981', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', fontWeight:900 }}>✓</div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleHwClick}
                              style={{
                                background: isOverdue
                                  ? 'linear-gradient(135deg,#e11d48,#be123c)'
                                  : isDueToday
                                    ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                                    : `linear-gradient(135deg,${rowTheme.accent||'#6366f1'},${rowTheme.accent?rowTheme.accent+'cc':'#4f46e5'})`,
                                color:'#fff', border:'none', borderRadius:10,
                                padding:'0.5rem 1rem', fontSize:'0.75rem', fontWeight:900,
                                cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5,
                                boxShadow: isOverdue?'0 3px 12px rgba(225,29,72,0.3)':isDueToday?'0 3px 12px rgba(245,158,11,0.3)':`0 3px 12px ${rowTheme.accent?rowTheme.accent+'44':'rgba(99,102,241,0.3)'}`,
                                whiteSpace:'nowrap'
                              }}
                            >
                              <PlayCircle size={14} />
                              {isOverdue ? 'Hemen Çöz' : isDueToday ? 'Bugün Çöz' : 'Çöz'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                    })();
                  })}

                  {pendingTasks.length > 5 && (
                    <button
                      onClick={() => navigate('/student/homeworks')}
                      style={{
                        display: 'block',
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        borderTop: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                        padding: '0.7rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      Tüm Bekleyenleri Gör (+{pendingTasks.length - 5})
                    </button>
                  )}
                </div>
              )}
            </div>


            {/* 📖 BÖLÜM 3: KİTAPLARIM & İLERLEME HARİTASI */}
            <div className="sd-card" style={{
              padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                    color: 'white'
                  }}>
                    <BookOpen size={17} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
                      Kitaplarım & İlerleme Haritası
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Takip ettiğiniz kitapların test, soru ve genel başarı ilerlemesi
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/student/books')}
                  className="sd-btn"
                  style={{
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: '#6366f1',
                    border: '1px solid rgba(165, 180, 252, 0.35)',
                    borderRadius: 99,
                    padding: '0.3rem 0.8rem',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>Tüm Kitaplar ({assignedBooksList.length})</span>
                  <ChevronRight size={12} />
                </button>
              </div>

              {assignedBooksList.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16, border: '1px dashed var(--color-border-input, #cbd5e1)' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>📚</div>
                  <div style={{ fontWeight: 800, color: 'var(--color-text, #0f172a)', fontSize: '0.92rem', marginBottom: 4 }}>
                    Henüz kayıtlı veya atanmış bir kitap bulunmuyor
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
                    Kitap eklendiğinde veya ödev verildiğinde kitap ilerleme haritanız burada listelenecektir.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {assignedBooksList.map((book, idx) => {
                    const pal = BOOK_PALETTES[idx % BOOK_PALETTES.length];
                    const isCompleted = book.progressPct >= 100;

                    return (
                      <div
                        key={book.id || idx}
                        onClick={() => navigate(`/student/books/${book.id}`)}
                        className="sd-card"
                        style={{
                          background: 'var(--color-surface, #ffffff)',
                          border: '1.5px solid var(--color-border, #e2e8f0)',
                          borderRadius: 18,
                          padding: isMobile ? '1rem' : '1.25rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.9rem',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: isDark ? '0 4px 14px -2px rgba(0,0,0,0.35)' : '0 4px 14px -2px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Top Header: Title, Publisher, Remaining Days */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 900, fontSize: isMobile ? '0.95rem' : '1.05rem', color: 'var(--color-text, #0f172a)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                                {book.title}
                              </div>
                              {book.publisher && (
                                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700, marginTop: 2 }}>
                                  {book.publisher}
                                </div>
                              )}
                            </div>

                            {book.remainingDays !== null && (
                              <span style={{
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background: book.remainingDays <= 3 
                                  ? (isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2') 
                                  : (isDark ? 'rgba(16, 185, 129, 0.18)' : '#f0fdf4'),
                                color: book.remainingDays <= 3 ? '#ef4444' : '#10b981',
                                border: isDark 
                                  ? (book.remainingDays <= 3 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)') 
                                  : (book.remainingDays <= 3 ? '1px solid #fca5a5' : '1px solid #86efac'),
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}>
                                {book.remainingDays === 0 ? '🔥 Bugün Son' : `⏳ ${book.remainingDays} gün kaldı`}
                              </span>
                            )}
                          </div>

                          {/* Subjects */}
                          {(book.subjects || []).length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                              {(book.subjects || []).slice(0, 3).map((subj, sIdx) => (
                                <span
                                  key={subj.id || sIdx}
                                  style={{
                                    background: 'var(--color-surface-hover, #f1f5f9)',
                                    color: 'var(--color-text, #475569)',
                                    border: '1px solid var(--color-border, #cbd5e1)',
                                    borderRadius: 6,
                                    padding: '1px 6px',
                                    fontSize: '0.64rem',
                                    fontWeight: 700
                                  }}
                                >
                                  {subj.name}
                                </span>
                              ))}
                              {(book.subjects || []).length > 3 && (
                                <span style={{
                                  background: 'var(--color-surface-hover, #f1f5f9)',
                                  color: 'var(--color-text-muted, #64748b)',
                                  border: '1px solid var(--color-border, #cbd5e1)',
                                  borderRadius: 6,
                                  padding: '1px 5px',
                                  fontSize: '0.64rem',
                                  fontWeight: 800
                                }}>
                                  +{(book.subjects || []).length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Test Progress Box */}
                        <div style={{
                          background: 'var(--color-surface-hover, #f8fafc)',
                          borderRadius: 14,
                          padding: '0.85rem 1rem',
                          border: '1px solid var(--color-border, #e2e8f0)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.9rem'
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Test İlerlemesi
                              </span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: isCompleted ? '#10b981' : pal.tag }}>
                                %{book.progressPct}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', marginBottom: 6 }}>
                              {book.totalSolvedTests} / {book.totalBookTests} test <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600 }}>({book.totalBookTests - book.totalSolvedTests > 0 ? `${book.totalBookTests - book.totalSolvedTests} kaldı` : 'Tamamlandı'})</span>
                            </div>

                            <div style={{ height: 7, background: 'var(--color-border, #e2e8f0)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{
                                width: `${book.progressPct}%`,
                                height: '100%',
                                background: isCompleted ? '#10b981' : `linear-gradient(90deg, ${pal.from}, ${pal.to})`,
                                borderRadius: 99,
                                transition: 'width 0.6s ease'
                              }} />
                            </div>
                          </div>

                          <div style={{ position: 'relative', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <MiniCircularProgress pct={book.progressPct} size={50} stroke={5} color={isCompleted ? '#10b981' : pal.tag} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 900, color: isCompleted ? '#10b981' : 'var(--color-text, #0f172a)' }}>
                              %{book.progressPct}
                            </div>
                          </div>
                        </div>

                        {/* 4 KPI Stats: Doğru, Yanlış, Boş, Başarı */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                          <div style={{ background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4', border: isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #bbf7d0', borderRadius: 10, padding: '0.45rem 0.3rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 900, textTransform: 'uppercase' }}>Doğru</div>
                            <div style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 900, color: '#10b981', marginTop: 1 }}>{book.totalCorrect}</div>
                          </div>
                          <div style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #fecaca', borderRadius: 10, padding: '0.45rem 0.3rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 900, textTransform: 'uppercase' }}>Yanlış</div>
                            <div style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 900, color: '#ef4444', marginTop: 1 }}>{book.totalWrong}</div>
                          </div>
                          <div style={{ background: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f8fafc', border: isDark ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid #e2e8f0', borderRadius: 10, padding: '0.45rem 0.3rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 900, textTransform: 'uppercase' }}>Boş</div>
                            <div style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 900, color: 'var(--color-text, #64748b)', marginTop: 1 }}>{book.totalBlank}</div>
                          </div>
                          <div style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', border: isDark ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid #bfdbfe', borderRadius: 10, padding: '0.45rem 0.3rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6rem', color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase' }}>Başarı</div>
                            <div style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 900, color: '#3b82f6', marginTop: 1 }}>%{book.successRate}</div>
                          </div>
                        </div>

                        {/* Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/student/books/${book.id}`);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            background: isCompleted ? 'var(--color-surface-hover, #f1f5f9)' : `linear-gradient(135deg, ${pal.from}, ${pal.to})`,
                            color: isCompleted ? 'var(--color-text, #334155)' : '#ffffff',
                            border: isCompleted ? '1.5px solid var(--color-border, #cbd5e1)' : 'none',
                            borderRadius: 12,
                            fontWeight: 900,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                            boxShadow: isCompleted ? 'none' : `0 3px 12px ${pal.shadow}`,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span>{isCompleted ? '📋 Haritayı Görüntüle' : '▶ Kitaba Devam Et'}</span>
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🗺️ BÖLÜM 4: YOL HARİTAM & KONU TAKİBİ */}
            <div className="sd-card" style={{
              padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 4px 12px rgba(124,58,237,0.35)', color: 'white' }}>
                    🗺️
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
                      Yol Haritam & Konu Takibi
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Müfredat ve hedef sınav konu tamamlama ilerlemeniz
                    </span>
                  </div>
                </div>

                <span style={{ background: isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.12)', color: isDark ? '#c084fc' : '#7c3aed', border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: 99, padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 900 }}>
                  {myRoadmaps.length} Harita
                </span>
              </div>

              {myRoadmaps.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16, border: '1px dashed var(--color-border-input, #cbd5e1)' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>🎯</div>
                  <div style={{ fontWeight: 800, color: 'var(--color-text, #0f172a)', fontSize: '0.92rem', marginBottom: 4 }}>
                    Henüz atanmış bir yol haritanız yok
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
                    Koçunuz tarafından atanacak ders çalışma planları burada gösterilecektir.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {myRoadmaps.map(({ assignment, plan, totalTopics, doneTopics, pct }) => (
                    <div
                      key={assignment.id}
                      onClick={() => navigate(`/student/study-plan/${assignment.id}`)}
                      className="sd-card"
                      style={{
                        background: 'var(--color-surface, #ffffff)',
                        border: '1.5px solid var(--color-border, #e2e8f0)',
                        borderRadius: 16,
                        padding: '1rem 1.15rem',
                        cursor: 'pointer',
                        boxShadow: isDark ? '0 4px 14px -2px rgba(0,0,0,0.35)' : '0 4px 14px -2px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 900, fontSize: '0.92rem', color: 'var(--color-text, #0f172a)' }}>
                          {plan.title}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#c084fc' }}>
                          %{pct}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ height: 7, background: 'var(--color-border, #e2e8f0)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #38bdf8, #a855f7)', borderRadius: 99, transition: 'width 0.8s ease' }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                        <span>{doneTopics} / {totalTopics} Konu Tamamlandı</span>
                        <span style={{ color: '#6366f1', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 800 }}>
                          Detayları Gör <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 📝 BÖLÜM 5: SON ÇÖZÜLEN TESTLER */}
            <div className="sd-card" style={{
              padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                  }}>
                    📝
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
                      Son Çözülen Testler
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Son tamamlanan 5 test ve başarı analizleriniz
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setIsManualTestModalOpen(true)}
                    className="sd-btn"
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 99,
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Plus size={13} />
                    <span>Test Sonucu Ekle</span>
                  </button>

                  <button
                    onClick={() => navigate('/student/results')}
                    className="sd-btn"
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: 99,
                      padding: '0.3rem 0.8rem',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>Tüm Sonuçlar</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {recentSolvedTests.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16, border: '1px dashed var(--color-border-input, #cbd5e1)' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>📊</div>
                  <div style={{ fontWeight: 800, color: 'var(--color-text, #0f172a)', fontSize: '0.92rem', marginBottom: 4 }}>
                    Henüz tamamlanmış bir test bulunmuyor
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
                    Kitap testlerinizi veya atanan ödevlerinizi çözdüğünüzde sonuçlarınız burada listelenecektir.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recentSolvedTests.map((test, idx) => {
                    const pctColor = test.pct >= 80 ? '#10b981' : test.pct >= 60 ? '#f59e0b' : '#ef4444';
                    const pctBg = test.pct >= 80 ? 'rgba(16, 185, 129, 0.15)' : test.pct >= 60 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                    const pctBorder = test.pct >= 80 ? 'rgba(16, 185, 129, 0.35)' : test.pct >= 60 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)';

                    return (
                      <div
                        key={test.id || idx}
                        onClick={() => {
                          const targetId = test.testId || test.submissionId || test.id;
                          navigate(`/quiz-review/${targetId}?studentId=${selectedStudent?.id || ''}&submissionId=${test.submissionId || test.id || ''}`, {
                            state: { from: '/student' }
                          });
                        }}
                        className="sd-card"
                        style={{
                          background: 'var(--color-surface-hover, #f8fafc)',
                          border: '1.5px solid var(--color-border, #e2e8f0)',
                          borderRadius: 16,
                          padding: '0.9rem 1.1rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.85rem',
                          flexWrap: 'wrap',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ minWidth: 180, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{
                              background: 'rgba(99, 102, 241, 0.12)',
                              color: '#6366f1',
                              border: '1px solid rgba(165, 180, 252, 0.35)',
                              borderRadius: 6,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '1px 6px'
                            }}>
                              {test.subject}
                            </span>
                            {test.unitTopic && (
                              <span style={{
                                background: 'rgba(245, 158, 11, 0.12)',
                                color: '#b45309',
                                border: '1px solid rgba(245, 158, 11, 0.30)',
                                borderRadius: 6,
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '1px 6px'
                              }}>
                                📌 {test.unitTopic}
                              </span>
                            )}
                            {test.date && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600 }}>
                                🕐 {new Date(test.date).toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>

                          <div style={{ fontWeight: 900, fontSize: '0.88rem', color: 'var(--color-text, #0f172a)', lineHeight: 1.35, wordBreak: 'break-word' }}>
                            {test.title}
                          </div>
                          {test.subTitle && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>📖 {test.subTitle}</span>
                              {test.unitTopic && !test.title.includes(test.unitTopic) && (
                                <span>• 📌 {test.unitTopic}</span>
                              )}
                            </div>
                          )}
                          {!test.subTitle && test.unitTopic && !test.title.includes(test.unitTopic) && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600, marginTop: 2 }}>
                              📌 {test.unitTopic}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: '0.72rem', fontWeight: 800, flexWrap: 'wrap' }}>
                            {test.isManualPending ? (
                              <span style={{ color: '#a855f7', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 900 }}>
                                ⏳ Manuel Test • Öğretmen Onayı Bekleniyor
                              </span>
                            ) : test.isManualRejected ? (
                              <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 900 }}>
                                ❌ Manuel Test • Onaylanmadı
                              </span>
                            ) : test.isPendingEvaluation ? (
                              <span style={{ color: '#7c3aed', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                📝 {test.totalQuestions || 1} Açık Uçlu Soru • ⏳ Öğretmen Değerlendirmesinde
                              </span>
                            ) : test.isOpenEnded ? (
                              <>
                                <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 900 }}>
                                  ✓ Öğretmen Değerlendirdi
                                </span>
                                {test.correctCount > 0 && (
                                  <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    • ✓ {test.correctCount} D
                                  </span>
                                )}
                                <span style={{ color: 'var(--color-text-muted, #475569)', opacity: 0.8 }}>
                                  • {test.totalQuestions} Soru
                                </span>
                              </>
                            ) : (
                              <>
                                <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  ✓ {test.correctCount} D
                                </span>
                                <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  ✗ {test.wrongCount} Y
                                </span>
                                {test.emptyCount > 0 && (
                                  <span style={{ color: 'var(--color-text-muted, #64748b)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    ○ {test.emptyCount} B
                                  </span>
                                )}
                                <span style={{ color: 'var(--color-text-muted, #475569)', opacity: 0.8 }}>
                                  • {test.totalQuestions} Soru
                                </span>
                                {test.net !== undefined && test.net !== null && !test.isOpenEnded && (
                                  <span style={{ color: '#6366f1', fontWeight: 800 }}>
                                    • {test.net} Net
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          {test.isManualPending ? (
                            <div style={{
                              background: 'rgba(124, 58, 237, 0.12)',
                              border: '1.5px solid rgba(167, 139, 250, 0.35)',
                              color: '#a855f7',
                              padding: '0.4rem 0.65rem',
                              borderRadius: 12,
                              textAlign: 'center',
                              minWidth: 54
                            }}>
                              <div style={{ fontSize: '1.05rem', fontWeight: 900, lineHeight: 1 }}>
                                ⏳
                              </div>
                              <div style={{ fontSize: '0.58rem', fontWeight: 800, opacity: 0.9, marginTop: 2, whiteSpace: 'nowrap' }}>
                                Onay Bekliyor
                              </div>
                            </div>
                          ) : test.isManualRejected ? (
                            <div style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1.5px solid rgba(239, 68, 68, 0.35)',
                              color: '#ef4444',
                              padding: '0.4rem 0.65rem',
                              borderRadius: 12,
                              textAlign: 'center',
                              minWidth: 54
                            }}>
                              <div style={{ fontSize: '1.05rem', fontWeight: 900, lineHeight: 1 }}>
                                ❌
                              </div>
                              <div style={{ fontSize: '0.58rem', fontWeight: 800, opacity: 0.9, marginTop: 2, whiteSpace: 'nowrap' }}>
                                Reddedildi
                              </div>
                            </div>
                          ) : test.isPendingEvaluation ? (
                            <div style={{
                              background: 'rgba(124, 58, 237, 0.12)',
                              border: '1.5px solid rgba(167, 139, 250, 0.35)',
                              color: '#7c3aed',
                              padding: '0.4rem 0.65rem',
                              borderRadius: 12,
                              textAlign: 'center',
                              minWidth: 54
                            }}>
                              <div style={{ fontSize: '1.05rem', fontWeight: 900, lineHeight: 1 }}>
                                ⏳
                              </div>
                              <div style={{ fontSize: '0.58rem', fontWeight: 800, opacity: 0.9, marginTop: 2, whiteSpace: 'nowrap' }}>
                                Değerlendirmede
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              background: pctBg,
                              border: `1.5px solid ${pctBorder}`,
                              color: pctColor,
                              padding: '0.4rem 0.75rem',
                              borderRadius: 12,
                              textAlign: 'center',
                              minWidth: 54
                            }}>
                              <div style={{ fontSize: '1.05rem', fontWeight: 900, lineHeight: 1 }}>
                                %{test.pct}
                              </div>
                              <div style={{ fontSize: '0.58rem', fontWeight: 800, opacity: 0.9, marginTop: 2 }}>
                                Başarı
                              </div>
                            </div>
                          )}

                          <span style={{ color: '#6366f1', display: 'flex', alignItems: 'center' }}>
                            <ChevronRight size={16} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* ──── SAĞ KOLON: ANALİZLER, HEDEFLERİM & İLHAM ──── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* 📊 BÖLÜM 1: PERİYODİK SORU & BAŞARI ANALİZİ (GÜNLÜK / HAFTALIK / AYLIK) */}
            <div>
              <PeriodicQuestionAnalytics
                homeworkSubmissions={otherHomeworkSubmissions}
                mockExams={generalTrialExams}
                studentName={selectedStudent?.name || 'Öğrenci'}
              />
            </div>

            {/* 🎯 BÖLÜM 2: HEDEF TAKİP PANOSU */}
            <div className="sd-card" style={{
              padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.35)'
                  }}>
                    🎯
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
                        Hedef Takip Panosu
                      </h2>
                      {goalTrackingData.totalItemsCount > 0 && (
                        <span style={{
                          background: 'rgba(124, 58, 237, 0.15)',
                          color: '#c084fc',
                          border: '1px solid rgba(168, 85, 247, 0.35)',
                          borderRadius: 99,
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          padding: '1px 7px'
                        }}>
                          {goalTrackingData.totalItemsCount} Hedef
                        </span>
                      )}
                      {solvedQuestionsStats.today > 0 && (
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          borderRadius: 99,
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          padding: '1px 7px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3
                        }}>
                          <span>🔥</span>
                          <span>Bugün: {solvedQuestionsStats.today} Soru</span>
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 600 }}>
                      Sınav, net, soru ve alışkanlık hedefleriniz
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/goals')}
                  className="sd-btn"
                  style={{
                    background: 'rgba(124, 58, 237, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    color: '#c084fc',
                    borderRadius: 8,
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>Panoya Git</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              {/* 1. GÖRSEL İLERLEME HEDEFLERİ */}
              {goalTrackingData.visualGoals.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  {goalTrackingData.visualGoals.map(g => {
                    const t = GOAL_TYPE_THEMES[g.type] || GOAL_TYPE_THEMES.Soru;
                    const IconComp = t.icon || Target;
                    const currentVal = g.effectiveCurrent !== undefined ? g.effectiveCurrent : (g.current || 0);
                    const pct = g.target > 0 ? Math.min(100, Math.round((currentVal / g.target) * 100)) : 0;
                    const isDone = currentVal >= g.target;

                    return (
                      <div
                        key={g.id}
                        className="sd-card"
                        style={{
                          background: 'var(--color-surface-hover, #f8fafc)',
                          border: `1.5px solid var(--color-border, #e2e8f0)`,
                          borderRadius: 14,
                          padding: '0.75rem 0.95rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: '#818cf8',
                              fontSize: '0.62rem',
                              fontWeight: 900,
                              padding: '1px 6px',
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3
                            }}>
                              <IconComp size={11} /> {g.type}
                            </span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {g.title}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isDone ? '#10b981' : '#6366f1' }}>
                              %{pct}
                            </span>
                            {!isDone && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateGoalProgress(g.id, t.step || 10);
                                }}
                                title={`+${t.step} ${t.unit} İlerleme Ekle`}
                                style={{
                                  background: 'rgba(99, 102, 241, 0.15)',
                                  border: '1px solid rgba(165, 180, 252, 0.35)',
                                  color: '#818cf8',
                                  borderRadius: 6,
                                  padding: '1px 6px',
                                  fontSize: '0.68rem',
                                  fontWeight: 900,
                                  cursor: 'pointer'
                                }}
                              >
                                +{t.step}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ height: 6, background: 'var(--color-border, #e2e8f0)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: isDone ? 'linear-gradient(90deg, #22c55e, #10b981)' : `linear-gradient(90deg, ${t.color}, #a855f7)`,
                            borderRadius: 99,
                            transition: 'width 0.8s ease'
                          }} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                          <span>
                            {currentVal} / {g.target} {t.unit}
                            {g.type === 'Soru' && g.autoSystemValue > 0 && (
                              <span style={{ marginLeft: 5, color: '#ef4444', fontWeight: 800, fontSize: '0.62rem' }}>
                                (🔄 {g.autoSystemValue} sistemden)
                              </span>
                            )}
                          </span>
                          <span style={{ color: isDone ? '#10b981' : 'var(--color-text-muted, #64748b)' }}>
                            {isDone ? '🎉 Hedefe Ulaşıldı' : `${Math.max(0, g.target - currentVal)} ${t.unit} kaldı`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. ALIŞKANLIK & GÖREV MADDELERİ */}
              {(goalTrackingData.daily.length > 0 || goalTrackingData.weekly.length > 0 || goalTrackingData.monthly.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {goalTrackingData.daily.slice(0, 2).map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: 10, padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-text, #1e293b)' }}>
                      <span style={{ fontSize: '0.85rem' }}>⚡</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {item.text}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '1px 5px', borderRadius: 4 }}>
                        Günlük
                      </span>
                    </div>
                  ))}

                  {goalTrackingData.weekly.slice(0, 2).map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: 10, padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-text, #1e293b)' }}>
                      <span style={{ fontSize: '0.85rem' }}>✨</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {item.text}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#c084fc', background: 'rgba(124, 58, 237, 0.15)', padding: '1px 5px', borderRadius: 4 }}>
                        Haftalık
                      </span>
                    </div>
                  ))}

                  {goalTrackingData.monthly.slice(0, 2).map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: 10, padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-text, #1e293b)' }}>
                      <span style={{ fontSize: '0.85rem' }}>📅</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {item.text}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#38bdf8', background: 'rgba(2, 132, 199, 0.15)', padding: '1px 5px', borderRadius: 4 }}>
                        Aylık
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!goalTrackingData.hasAnyGoals && (
                <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16, border: '1px dashed var(--color-border-input, #cbd5e1)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 4 }}>🎯</div>
                  <div style={{ fontWeight: 800, color: 'var(--color-text, #0f172a)', fontSize: '0.88rem', marginBottom: 3 }}>
                    Henüz Hedef Belirlenmedi
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', marginBottom: 10 }}>
                    Sınav, soru ve çalışma hedeflerinizi belirleyerek başarı yolculuğunuzu takip edin!
                  </div>
                  <button
                    onClick={() => navigate('/goals')}
                    className="sd-btn"
                    style={{
                      background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: 10,
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Plus size={13} /> Hedef Belirle 🎯
                  </button>
                </div>
              )}
            </div>

            {/* 🎯 BÖLÜM 5: GÜNÜN MOTİVASYONU & İLHAMI */}
            <div style={{
              background: 'var(--color-surface, #ffffff)',
              border: '1.5px solid var(--color-border, #cbd5e1)',
              borderRadius: 22,
              padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              color: 'var(--color-text)'
            }}>
              {(() => {
                const currentQuote = DASHBOARD_QUOTES[dashQuoteIdx % DASHBOARD_QUOTES.length];
                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '1.1rem' }}>{currentQuote.emoji}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Günün İlhamı ({currentQuote.category})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDashQuoteIdx(p => p + 1)}
                        style={{ background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border-input, #cbd5e1)', borderRadius: 8, padding: '0.25rem 0.5rem', color: 'var(--color-text, #334155)', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <RefreshCw size={11} /> Yeni
                      </button>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text, #1e293b)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>
                      "{currentQuote.quote}"
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.72rem', fontWeight: 800, color: '#c084fc' }}>
                      — {currentQuote.author}
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>

        </div>

      </div>

      {/* GOAL MODAL */}
      {showGoalModal && (
        <div style={{ position:'fixed', inset:0, background:'var(--color-modal-overlay)', backdropFilter:'blur(10px)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', zIndex:1000, padding: isMobile ? 0 : '1rem' }}>
          <div style={{ background:'var(--color-surface)', border:'1.5px solid var(--color-border)', borderRadius: isMobile ? '24px 24px 0 0' : '24px', padding:'1.6rem', width:'100%', maxWidth: isMobile ? '100%' : 440, boxShadow:'0 32px 80px rgba(0,0,0,0.35)', animation:'sdFadeUp 0.3s ease', color: 'var(--color-text)' }}>
            {isMobile && <div style={{ width:40, height:4, background:'var(--color-border-input)', borderRadius:99, margin:'0 auto 1.25rem' }} />}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
              <h2 style={{ fontWeight:900, fontSize:'1.05rem', color:'var(--color-text)', margin:0 }}>🎯 Yeni Hedef Ekle</h2>
              <button onClick={() => setShowGoalModal(false)} style={{ background:'var(--color-surface-hover)', border:'1px solid var(--color-border-input)', borderRadius:10, padding:'0.45rem', cursor:'pointer', display:'flex', color:'var(--color-text-muted)' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveGoal} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
              <input placeholder="Hedef başlığı (örn: Günde 50 Matematik Sorusu)..." value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                style={{ padding:'0.8rem 1rem', borderRadius:14, border:'1.5px solid var(--color-border-input)', fontSize:'0.9rem', fontFamily:'inherit', outline:'none', background:'var(--color-surface-hover)', color:'var(--color-text)', width:'100%' }} required />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <select value={newGoal.type} onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))}
                  style={{ padding:'0.75rem 0.9rem', borderRadius:14, border:'1.5px solid var(--color-border-input)', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', background:'var(--color-surface-hover)', color:'var(--color-text)' }}>
                  {['Soru','Sayfa','Dakika'].map(v => <option key={v} value={v} style={{ background:'var(--color-surface)', color:'var(--color-text)' }}>{v}</option>)}
                </select>
                <select value={newGoal.period} onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))}
                  style={{ padding:'0.75rem 0.9rem', borderRadius:14, border:'1.5px solid var(--color-border-input)', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', background:'var(--color-surface-hover)', color:'var(--color-text)' }}>
                  {['Günlük','Haftalık','Aylık'].map(v => <option key={v} value={v} style={{ background:'var(--color-surface)', color:'var(--color-text)' }}>{v}</option>)}
                </select>
              </div>
              <input type="number" min="1" placeholder="Hedef miktar" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))}
                style={{ padding:'0.8rem 1rem', borderRadius:14, border:'1.5px solid var(--color-border-input)', fontSize:'0.9rem', fontFamily:'inherit', outline:'none', background:'var(--color-surface-hover)', color:'var(--color-text)', width:'100%' }} required />
              <button type="submit" className="sd-btn"
                style={{ padding:'0.9rem', borderRadius:14, background:'linear-gradient(135deg,#ea580c,#f97316)', color:'white', fontWeight:900, fontSize:'0.9rem', border:'none', cursor:'pointer', boxShadow:'0 6px 20px rgba(234,88,12,0.4)', marginTop:4 }}>
                Hedefi Kaydet ✓
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manuel Test Sonucu Ekleme Modalı */}
      <ManualTestModal
        isOpen={isManualTestModalOpen}
        studentId={selectedStudent?.id}
        onClose={() => setIsManualTestModalOpen(false)}
      />
    </div>
  );
}
