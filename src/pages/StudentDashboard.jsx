import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlayCircle, Target, AlertCircle, Timer, BookOpen, Check,
  Sparkles, Trophy, Flame, GraduationCap, BarChart3, Clock,
  Calendar, CheckCircle2, X, Plus, ExternalLink, Zap,
  ChevronRight, ChevronDown, ChevronUp, Star, TrendingUp, BookMarked, CalendarDays,
  Ruler, TestTube2, BookCopy, Globe, MessageSquare,
  FileText, ClipboardList, ArrowRight, RefreshCw, ClipboardCheck, Eye, RotateCcw,
  CheckSquare, Award, ArrowUpRight, Brain, Headphones
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
import { isHomeworkForStudent, sortItemsByBookOrder, computeStudentAnalyticsData, isSubmissionMatchingBookTest, isStandardOrMixedBook, isExamBook, createCompositeTestKey, getSubmissionCompositeKey, computeUnifiedSubmissionStats } from '../utils/testResolver';
import { normalizeUnifiedTest } from '../services/unifiedQuizAdapter';
import { getAllUnifiedStudentSubmissions } from '../services/unifiedResultAdapter';
import { checkIsAnswerCorrect, normalizeAnswerIndex } from '../utils/answerEvaluation';
import { isSectionOpenEnded, isQuestionOpenEnded } from '../components/quiz/utils/quizTypeDetector';
import { toUUID, isValidUUID } from '../services/supabaseService';
import { getTurkeyYMD, getTurkeyToday, getTurkeyWeekRange, getTurkeyMonthRange } from '../utils/dateHelpers';
import { checkHasItemBeenAttempted, normalizeWeeklyProgram } from '../components/ProgramCenter';
import AddTaskModal from '../components/program/AddTaskModal';
import ManualTestModal from '../components/ManualTestModal';
import DashboardWeeklyCalendar from '../features/dashboard/components/DashboardWeeklyCalendar';
import DashboardTodayTasks from '../features/dashboard/components/DashboardTodayTasks';
import DashboardHomeworksCard from '../features/dashboard/components/DashboardHomeworksCard';
import DashboardBooksCard from '../features/dashboard/components/DashboardBooksCard';
import DashboardRoadmapCard from '../features/dashboard/components/DashboardRoadmapCard';
import DashboardGoalsCard from '../features/dashboard/components/DashboardGoalsCard';
import DashboardRecentSolvedCard from '../features/dashboard/components/DashboardRecentSolvedCard';
import SmartPullToRefresh from '../components/common/SmartPullToRefresh';
import StudentGamificationCard from '../components/gamification/StudentGamificationCard';
import { computeStudentGamificationData } from '../services/gamificationService';
import { isRemedialStageDone, getRemedialLockStatus } from '../services/remedialSpacedRepetitionService';

// Lazy-loaded: PeriodicQuestionAnalytics is large (40KB) and not needed on first paint
const PeriodicQuestionAnalytics = lazy(() => import('../components/PeriodicQuestionAnalytics'));
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
  { key: 'Pzt', name: 'Pazartesi', short: 'Pzt', icon: '⚡', color: '#4f46e5', bg: '#eef2ff' },
  { key: 'Sal', name: 'Salı', short: 'Sal', icon: '🎯', color: '#0891b2', bg: '#ecfeff' },
  { key: 'Çrş', name: 'Çarşamba', short: 'Çrş', icon: '🌿', color: '#059669', bg: '#ecfdf5' },
  { key: 'Prş', name: 'Perşembe', short: 'Prş', icon: '🔥', color: '#d97706', bg: '#fffbeb' },
  { key: 'Cum', name: 'Cuma', short: 'Cum', icon: '✨', color: '#7c3aed', bg: '#faf5ff' },
  { key: 'Cts', name: 'Cumartesi', short: 'Cts', icon: '🚀', color: '#e11d48', bg: '#fff1f2' },
  { key: 'Paz', name: 'Pazar', short: 'Paz', icon: '🏖️', color: '#2563eb', bg: '#eff6ff' }
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
  const { homeworks, refreshHomeworks, addHomework, updateHomework, deleteHomework, clearHomeworkSubmissionsForStudent } = useHomework();
  const { submissions, syncFromSupabase, deleteSubmission, deleteSubmissionsByTestId, deleteStudentSubmissionsForBookOrHw } = useEvaluation();
  const { users } = useUser();
  const { studyAssignments, studyPlans, updateStudyAssignment } = useStudyPlan();
  const { goals, addGoal, updateGoalProgress, deleteGoal } = useGoal();
  const { schedules, addSchedule, toggleScheduleDone, deleteSchedule, refreshSchedules } = useSchedule();
  const { currentUser } = useAuth();
  const { bookTests = [], books = [], refreshTrackedBooks } = useTrackedBooks() || {};
  const { getCoachingNoteForStudent, getMeetingsForStudent, getCoachingProfileForStudent, coachingProfiles = [], coachingLinks, saveCoachingProfile, getMockExamsForStudent, refreshCoaching } = useCoaching();

  // Background sync when opening the dashboard (runs strictly ONCE on mount)
  useEffect(() => {
    refreshHomeworks?.(true);
    refreshTrackedBooks?.(true);
    syncFromSupabase?.(false, false);
    refreshCoaching?.(true);
    refreshSchedules?.(true);
  }, []);

  // Listen to remote submission updates with debouncing
  useEffect(() => {
    let timer = null;
    const onSubUpdated = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        refreshTrackedBooks?.(true);
      }, 500);
    };
    window.addEventListener('etest-submissions-updated', onSubUpdated);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('etest-submissions-updated', onSubUpdated);
    };
  }, []);

  const handleDashboardRefresh = async () => {
    await Promise.all([
      refreshHomeworks?.(true),
      refreshTrackedBooks?.(true),
      syncFromSupabase?.(false, true),
      refreshCoaching?.(true),
      refreshSchedules?.(true)
    ]);
  };

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Active Selected Day in Week Navigator (defaults to Today)
  const currentDayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
  const todayDayKey = currentDayIndex === 0 ? 'Paz' : DAYS_OF_WEEK[currentDayIndex - 1].key;
  const [activeDayKey, setActiveDayKey] = useState(todayDayKey);
  const [showAllDayTasks, setShowAllDayTasks] = useState(false);
  const [focusModeOnly, setFocusModeOnly] = useState(() => {
    try {
      return localStorage.getItem('etest_student_focus_mode') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleFocusMode = useCallback(() => {
    setFocusModeOnly(prev => {
      const next = !prev;
      try {
        localStorage.setItem('etest_student_focus_mode', String(next));
      } catch {}
      return next;
    });
  }, []);

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  
  // Synchronous, instant cache-first student initialization (0ms initial render, no re-renders)
  const [selectedStudent, setSelectedStudent] = useState(() => {
    if (currentUser?.role === 'student') return currentUser;
    try {
      const authUserStr = localStorage.getItem('eTestAuthUser');
      if (authUserStr) {
        const authUser = JSON.parse(authUserStr);
        if (authUser?.role === 'student') return authUser;
      }
      const savedObj = localStorage.getItem('etest_selected_student_obj');
      if (savedObj) {
        const parsed = JSON.parse(savedObj);
        if (parsed && parsed.id) return parsed;
      }
      const savedId = localStorage.getItem('etest_selected_student_id');
      const usersStr = localStorage.getItem('eTestUsers');
      if (usersStr) {
        const allU = JSON.parse(usersStr);
        const stList = (allU || []).filter(u => u.role === 'student');
        if (stList.length > 0) {
          const found = stList.find(s => String(s.id) === String(savedId));
          return found || stList[0];
        }
      }
    } catch {}
    return null;
  });

  const [isManualTestModalOpen, setIsManualTestModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAnalyticsReady, setIsAnalyticsReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsAnalyticsReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  const [dismissedTaskKeys, setDismissedTaskKeys] = useState(() => {
    try {
      const sid = selectedStudent?.id || currentUser?.id || 'default';
      const stored = localStorage.getItem(`dismissed_tasks_${sid}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isTaskDismissed = useCallback((task) => {
    if (!task || !Array.isArray(dismissedTaskKeys) || dismissedTaskKeys.length === 0) return false;
    const testId = task.testId || task.bookTestId || task.realTestId;
    const keysToCheck = [
      String(task.id || ''),
      String(task.uniqueKey || ''),
      testId ? `book_due_${task.bookId || task.hwId}_${testId}` : null,
      testId ? `dismiss_${testId}` : null
    ].filter(Boolean);

    return keysToCheck.some(k => dismissedTaskKeys.includes(k));
  }, [dismissedTaskKeys]);

  const prevPersistedStudentIdRef = useRef(selectedStudent?.id);
  useEffect(() => {
    if (selectedStudent?.id) {
      try {
        localStorage.setItem('etest_selected_student_id', selectedStudent.id);
        localStorage.setItem('etest_selected_student_obj', JSON.stringify(selectedStudent));
        if (prevPersistedStudentIdRef.current !== selectedStudent.id) {
          prevPersistedStudentIdRef.current = selectedStudent.id;
          const stored = localStorage.getItem(`dismissed_tasks_${selectedStudent.id}`);
          if (stored) setDismissedTaskKeys(JSON.parse(stored));
        }
      } catch {}
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (currentUser?.role === 'student') {
      if (selectedStudent?.id !== currentUser.id) {
        setSelectedStudent(currentUser);
      }
    } else if (studentMembers.length > 0) {
      const savedStudentId = localStorage.getItem('etest_selected_student_id');
      const found = studentMembers.find(s => String(s.id) === String(savedStudentId));
      if (found) {
        if (selectedStudent?.id !== found.id) setSelectedStudent(found);
      } else if (!selectedStudent) {
        setSelectedStudent(studentMembers[0]);
      }
    }
  }, [currentUser?.id, currentUser?.role, studentMembers]);

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

  const studentId = selectedStudent?.id;

  const coachingNote = useMemo(
    () => getCoachingNoteForStudent(studentId),
    [studentId, getCoachingNoteForStudent]
  );
  const coachingProfile = useMemo(
    () => getCoachingProfileForStudent(studentId),
    [studentId, getCoachingProfileForStudent]
  );

  const personalRoadmap = useMemo(() => {
    const rawPool = coachingProfile?.topicPool;
    if (!Array.isArray(rawPool) || rawPool.length === 0) return null;

    let totalTopics = 0;
    let doneTopics = 0;
    let inProgressTopics = 0;
    let totalUnits = 0;
    const subjectCount = rawPool.length;

    rawPool.forEach(sub => {
      if (Array.isArray(sub.units) && sub.units.length > 0) {
        totalUnits += sub.units.length;
        sub.units.forEach(u => {
          (u.topics || []).forEach(t => {
            totalTopics += 1;
            const status = typeof t === 'object' ? t?.status : 'Başlanmadı';
            if (status === 'Tamamlandı') doneTopics += 1;
            else if (status === 'Başlandı' || status === 'Öğrenildi' || status === 'Tekrar Yapıldı') inProgressTopics += 1;
          });
        });
      } else if (Array.isArray(sub.topics) && sub.topics.length > 0) {
        totalUnits += 1;
        sub.topics.forEach(t => {
          totalTopics += 1;
          const status = typeof t === 'object' ? t?.status : 'Başlanmadı';
          if (status === 'Tamamlandı') doneTopics += 1;
          else if (status === 'Başlandı' || status === 'Öğrenildi' || status === 'Tekrar Yapıldı') inProgressTopics += 1;
        });
      }
    });

    if (totalTopics === 0) return null;

    const pct = Math.round((doneTopics / totalTopics) * 100);

    return {
      hasRoadmap: true,
      subjectCount,
      unitCount: totalUnits,
      totalTopics,
      doneTopics,
      inProgressTopics,
      pct
    };
  }, [coachingProfile?.topicPool]);
  const studentMeetings = useMemo(
    () => getMeetingsForStudent(studentId),
    [studentId, getMeetingsForStudent]
  );
  const upcomingMeeting = useMemo(
    () => studentMeetings.find(m => m.nextMeetingDate),
    [studentMeetings]
  );
  const hasCoach = useMemo(
    () => coachingLinks?.some(l => String(l.studentId) === String(studentId)),
    [coachingLinks, studentId]
  );


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

  // ── Pre-filter submissions strictly for selected student once ──
  const studentSubmissions = useMemo(() => {
    if (!selectedStudent) return [];
    const studentIdStr = String(selectedStudent.id || '');
    const studentUuidStr = String(toUUID(selectedStudent.id) || selectedStudent.uuid || '');

    const isMatch = (s) => {
      if (!s) return false;
      const sStudentId = String(s.studentId || s.student_id || s.user_id || s.userId || '');
      if (!sStudentId) return false;
      return sStudentId === studentIdStr ||
        (studentUuidStr && (sStudentId === studentUuidStr || toUUID(sStudentId) === studentUuidStr)) ||
        (studentIdStr && toUUID(studentIdStr) === sStudentId);
    };

    const list = (submissions || []).filter(isMatch);
    // O(1) Set yerine O(N) list.some() — büyük veri setlerinde kritik fark
    const seenIds = new Set(list.map(x => x.id).filter(Boolean));
    const seenTestIds = new Set(list.map(x => x.testId || x.test_id || x.bookTestId).filter(Boolean));
    const seenHwIds = new Set(list.map(x => x.hwId || x.hw_id || (x.type === 'physicalExam' ? x.testId : null)).filter(Boolean));

    (homeworks || []).forEach(hw => {
      const hwSubs = hw.submissions || hw.raw_data?.submissions || [];
      const isHwAlreadyInList = seenHwIds.has(hw.id) || (toUUID(hw.id) && seenHwIds.has(String(toUUID(hw.id)))) ||
        seenTestIds.has(hw.id) || (toUUID(hw.id) && seenTestIds.has(String(toUUID(hw.id))));

      (hwSubs || []).forEach(sub => {
        if (sub && isMatch(sub)) {
          const subId = sub.id || sub.submissionId || sub.supabaseId;
          const subTestId = sub.testId || sub.test_id || sub.bookTestId;
          if (isHwAlreadyInList && !subTestId) return;
          if (subId && seenIds.has(subId)) return;
          if (subTestId && seenTestIds.has(subTestId)) return;

          const completeSub = {
            ...sub,
            id: subId || `hw_sub_${hw.id}_${selectedStudent.id}`,
            hwId: hw.id,
            testId: subTestId || hw.id,
            title: sub.title || sub.testTitle || hw.title,
            testTitle: sub.testTitle || sub.title || hw.title,
            type: sub.type || hw.type || 'homework'
          };
          list.push(completeSub);
          if (completeSub.id) seenIds.add(completeSub.id);
          if (completeSub.testId) seenTestIds.add(completeSub.testId);
          seenHwIds.add(hw.id);
        }
      });
    });
    return list;
  }, [submissions, homeworks, selectedStudent]);


  // ── Fast O(1) Solved Tests Set for Student (with comprehensive ID & Content matching) ──
  const studentSolvedSet = useMemo(() => {
    const set = new Set();
    const normalizeKey = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');

    // Include submissions from both studentSubmissions and homeworks.submissions
    const allStudentSubs = [...(studentSubmissions || [])];
    // O(1) Set - allStudentSubs.some() yerine
    const seenSubIds = new Set(allStudentSubs.map(x => x.id).filter(Boolean));
    const studentIdStr = String(selectedStudent?.id || '');
    const studentUuidStr = toUUID(studentIdStr) || '';
    (homeworks || []).forEach(hw => {
      const hwSubs = hw.submissions || hw.raw_data?.submissions || [];
      (hwSubs || []).forEach(sub => {
        if (!sub) return;
        const sid = String(sub.studentId || sub.student_id || sub.userId || '');
        const matches = sid === studentIdStr || sid === studentUuidStr ||
          (studentUuidStr && toUUID(sid) === studentUuidStr);
        if (matches && !seenSubIds.has(sub.id)) {
          allStudentSubs.push(sub);
          if (sub.id) seenSubIds.add(sub.id);
        }
      });
    });

    const cleanTestTitle = (t) => {
      if (!t) return '';
      let str = String(t);
      if (str.includes('—')) str = str.split('—').pop();
      if (str.includes('›')) str = str.split('›').pop();
      return str.trim();
    };

    allStudentSubs.forEach(s => {
      if (!s) return;
      if (s.status === 'in_progress' || s.status === 'draft') return;
      if (s.isManual && (s.approvalStatus === 'pending' || s.approvalStatus === 'rejected' || s.isApproved === false || s.status === 'pending_approval' || s.status === 'rejected')) return;

      const rawTitle = s.title || s.testTitle || s.testName || '';
      let rawSubject = s.subjectName || s.subject || s.metadata?.subjectName || s.metadata?.subject || s.lesson;
      if (!rawSubject) {
        const lowT = rawTitle.toLowerCase();
        if (lowT.includes('türkçe') || lowT.includes('turkce') || lowT.includes('paragraf')) rawSubject = 'Türkçe';
        else if (lowT.includes('matematik') || lowT.includes('mat') || lowT.includes('problem')) rawSubject = 'Matematik';
        else if (lowT.includes('fen')) rawSubject = 'Fen Bilimleri';
        else if (lowT.includes('sosyal')) rawSubject = 'Sosyal Bilgiler';
      }

      const sName = normalizeKey(rawSubject);
      const bTitle = normalizeKey(s.bookTitle || s.metadata?.bookTitle);
      let rawTopic = s.topicName || s.unitTopic || s.metadata?.topicName;
      if (!rawTopic) {
        const uM = rawTitle.match(/(\d+)\.\s*ünite/i);
        if (uM) rawTopic = `${uM[1]}. Ünite`;
      }
      const uTopic = normalizeKey(rawTopic);
      const tName = normalizeKey(s.testName || s.title || s.testTitle || s.metadata?.testName);
      const bId = String(s.bookId || s.metadata?.bookId || '');

      const testIds = [
        s.testId, s.test_id, s.bookTestId, s.realTestId,
        s.metadata?.testId, s.metadata?.bookTestId, s.metadata?.realTestId
      ];
      if (Array.isArray(s.bookTestIds) && s.bookTestIds.length === 1) {
        testIds.push(s.bookTestIds[0]);
      }

      testIds.forEach(id => {
        if (id) {
          const str = String(id);
          const clean = str.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
          const u = toUUID(str);
          
          set.add(str);
          set.add(clean);
          if (u) set.add(u);
          set.add(`tid_${str}`);
          set.add(`tid_${clean}`);
          if (u) set.add(`tid_${u}`);

          if (sName) {
            set.add(`subj_tid_${sName}_${str}`);
            set.add(`subj_tid_${sName}_${clean}`);
            if (u) set.add(`subj_tid_${sName}_${u}`);
          }
          if (bId) {
            set.add(`bid_tid_${bId}_${str}`);
            set.add(`bid_tid_${bId}_${clean}`);
          }
          if (bId && sName) {
            set.add(`bid_subj_tid_${bId}_${sName}_${str}`);
            set.add(`bid_subj_tid_${bId}_${sName}_${clean}`);
            if (u) set.add(`bid_subj_tid_${bId}_${sName}_${u}`);
          }
        }
      });

      // Cleaned Title Matching — subject-scoped so same name in different subjects don't collide
      const cleanedTitle = cleanTestTitle(rawTitle);
      const normTitle = normalizeKey(cleanedTitle);
      if (normTitle && normTitle.length >= 10) {
        if (sName === 'genel' || sName === 'geneltestler') {
          set.add(`genel_title_${normTitle}`);
        } else if (sName) {
          set.add(`subj_title_${sName}_${normTitle}`);
        }
      }

      const isGeneric = /^((test|yeninesil|udeg|unite|unitedegerlendirme|problemsayfasi|paragraftesti|kazanimtesti|degerlendirmetesti|etkinlik|alismalar|sorubankasi|yapraksoru|denemesinavi|konutesti)[\s-]*\d*|\d+|test|problemsayfasi|paragraftest|konutesti)$/i.test(tName);

      if (bTitle && sName && uTopic && tName) {
        set.add(`full_${bTitle}_${sName}_${uTopic}_${tName}`);
      }
      if (bId && sName && uTopic && tName) {
        set.add(`bid_subj_topic_tname_${bId}_${sName}_${uTopic}_${tName}`);
      }

      // ONLY add unit-less test matches if the test name is NOT a generic repeating name (like Test-13, Problem Sayfası, etc.)
      if (!isGeneric) {
        if (sName && tName) {
          set.add(`subj_test_${sName}_${tName}`);
          set.add(`title_${sName}_${tName}`);
        }
        if (bTitle && sName && tName) {
          set.add(`full_${bTitle}_${sName}_${tName}`);
        }
        if (bId && sName && tName) {
          set.add(`bid_subj_tname_${bId}_${sName}_${tName}`);
        }
      }

      // Immutable Composite Signature
      const compKey = getSubmissionCompositeKey(s);
      if (compKey) {
        set.add(compKey);
        set.add(`comp_${compKey}`);
      }

      // Full specific title (preserving exact page/test numbers for unique names)
      const fullTitleStr = normalizeKey(s.title || s.testTitle || s.testName);
      if (fullTitleStr && fullTitleStr.length >= 10 && !isGeneric) {
        if (sName) {
          set.add(`title_${sName}_${fullTitleStr}`);
        } else {
          set.add(`title_${fullTitleStr}`);
        }
      }
    });
    return set;
  }, [studentSubmissions, homeworks, selectedStudent?.id]);

  const isItemSolved = useCallback((item) => {
    if (!item) return false;

    const tId = item.testId || item.bookTestId || item.realTestId || item.hwId || item.homeworkId || item.id || item.assignmentId;

    // CASE 0: REMEDIAL TEST WITH SPACED REPETITION / STAGES / %100 MASTERY
    const isRemedial = Boolean(
      item.type === 'remedialTest' ||
      item.taskType === 'remedialTest' ||
      item.isTeacherRemedial ||
      item.isRemedial ||
      item.isRemedialTest ||
      item.stage !== undefined ||
      String(item.text || item.title || '').includes('Tekrar')
    );

    if (isRemedial && tId) {
      return isRemedialStageDone(item, studentSubmissions, selectedStudent?.id);
    }

    if (item.done || item.isCompleted) return true;

    // 1. Direct Test ID
    if (tId) {
      const tidStr = String(tId);
      const tidClean = tidStr.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
      const tidUuid = toUUID(tidStr);

      if (studentSolvedSet.has(tidStr) ||
          studentSolvedSet.has(tidClean) ||
          (tidUuid && studentSolvedSet.has(tidUuid)) ||
          studentSolvedSet.has(`tid_${tidStr}`) ||
          studentSolvedSet.has(`tid_${tidClean}`) ||
          (tidUuid && studentSolvedSet.has(`tid_${tidUuid}`))) {
        return true;
      }
    }

    // 2. Composite Key Check
    const itemCompKey = createCompositeTestKey(
      item.bookTitle,
      item.subject || item.subjectName,
      item.unitTopic || item.topicName || item.unit,
      item.testName || item.name || item.title
    );
    if (itemCompKey && (studentSolvedSet.has(itemCompKey) || studentSolvedSet.has(`comp_${itemCompKey}`))) {
      return true;
    }

    const normalizeKey = (str) => String(str || '')
      .toLowerCase()
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/[^a-z0-9ğüşıöç]/g, '')
      .trim();

    const bId = item.bookId ? String(item.bookId) : '';
    const sName = normalizeKey(item.subject || item.subjectName);
    const bTitle = normalizeKey(item.bookTitle);
    const uTopic = normalizeKey(item.unitTopic || item.topicName || item.topic);
    const tName = normalizeKey(item.testName || item.title);

    // 3. Normalized Name matching (with unit topic)
    if (bTitle && sName && uTopic && tName && studentSolvedSet.has(`full_${bTitle}_${sName}_${uTopic}_${tName}`)) return true;
    if (bId && sName && uTopic && tName && studentSolvedSet.has(`bid_subj_topic_tname_${bId}_${sName}_${uTopic}_${tName}`)) return true;

    // Only allow unit-less matching for non-generic test titles
    const isGeneric = /^((test|yeninesil|udeg|unite|unitedegerlendirme|problemsayfasi|paragraftesti|kazanimtesti|degerlendirmetesti|etkinlik|alismalar|sorubankasi|yapraksoru|denemesinavi|konutesti)[\s-]*\d*|\d+|test|problemsayfasi|paragraftest|konutesti)$/i.test(tName);
    if (!isGeneric) {
      if (bTitle && sName && tName && studentSolvedSet.has(`full_${bTitle}_${sName}_${tName}`)) return true;
      if (bId && sName && tName && studentSolvedSet.has(`bid_subj_tname_${bId}_${sName}_${tName}`)) return true;
      if (sName && tName && studentSolvedSet.has(`subj_test_${sName}_${tName}`)) return true;
      if (sName && tName && studentSolvedSet.has(`title_${sName}_${tName}`)) return true;
    }

    const itemFullNorm = normalizeKey(item.title || item.testName);
    if (!isGeneric && itemFullNorm && itemFullNorm.length >= 10) {
      if (sName) {
        if (studentSolvedSet.has(`title_${sName}_${itemFullNorm}`)) return true;
        if (studentSolvedSet.has(`title_genel_${itemFullNorm}`)) return true;
        if (studentSolvedSet.has(`title_${itemFullNorm}`)) return true;
      } else {
        if (studentSolvedSet.has(`title_${itemFullNorm}`)) return true;
      }
    }

    return false;
  }, [studentSolvedSet, studentSubmissions, selectedStudent?.id]);

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
      const hwUuid = toUUID(hw?.id) || '';
      const sHwId = String(s.hwId || s.homeworkId || s.homework_id || s.metadata?.hwId || s.metadata?.homeworkId || '');
      const sTestId = String(s.testId || s.test_id || s.metadata?.testId || '');
      const sRealTestId = String(s.realTestId || s.metadata?.realTestId || '');
      const sBookTestId = String(s.bookTestId || s.metadata?.bookTestId || '');
      const sId = String(s.id || s.supabaseId || '');

      if (specificTestId) {
        const specStr = String(specificTestId);
        const specClean = specStr.replace(/^q_/, '').replace(/^bt_/, '').replace(/^tbt_/, '');
        const specUuid = String(toUUID(specificTestId) || '');
        if (sTestId && (sTestId === specStr || sTestId === specClean || (specUuid && sTestId === specUuid))) return true;
        if (sRealTestId && (sRealTestId === specStr || sRealTestId === specClean || (specUuid && sRealTestId === specUuid))) return true;
        if (sBookTestId && (sBookTestId === specStr || sBookTestId === specClean || (specUuid && sBookTestId === specUuid))) return true;
        if (s.bookTestIds && Array.isArray(s.bookTestIds) && s.bookTestIds.some(tid => String(tid) === specStr || String(tid) === specClean)) return true;
        return false;
      }

      // 1. Direct ID match
      if (sHwId && (sHwId === hwIdStr || sHwId === cleanHwId || sHwId.replace(/^hw_/, '') === cleanHwId || (hwUuid && (sHwId === hwUuid || toUUID(sHwId) === hwUuid)))) return true;
      if (sTestId && (sTestId === hwIdStr || sTestId === cleanHwId || sTestId.replace(/^hw_/, '') === cleanHwId || sTestId.replace(/^q_/, '') === cleanHwId || (hwUuid && (sTestId === hwUuid || toUUID(sTestId) === hwUuid)))) return true;
      if (sId && (sId === hwIdStr || sId === cleanHwId || (hwUuid && sId === hwUuid))) return true;

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

    const subByHwId = new Map();
    (studentSubmissions || []).forEach(s => {
      if (!s || s.status === 'in_progress' || s.status === 'draft') return;
      const sHw = s.hwId || s.homeworkId || s.homework_id;
      const sTest = s.testId || s.test_id;
      if (sHw) {
        const shStr = String(sHw);
        subByHwId.set(shStr, s);
        subByHwId.set(shStr.replace(/^hw_/, ''), s);
        const u = toUUID(shStr);
        if (u) subByHwId.set(u, s);
      }
      if (sTest) {
        const stStr = String(sTest);
        subByHwId.set(stStr, s);
        subByHwId.set(stStr.replace(/^bt_/, '').replace(/^q_/, ''), s);
        const u = toUUID(stStr);
        if (u) subByHwId.set(u, s);
      }
      if (s.realTestId) subByHwId.set(String(s.realTestId), s);
      if (s.bookTestId) subByHwId.set(String(s.bookTestId), s);
      if (s.id) subByHwId.set(String(s.id), s);
      if (s.supabaseId) subByHwId.set(String(s.supabaseId), s);
    });

    const hwTests = (homeworks || []).filter(hw => {
      return isHomeworkForStudent(hw, selectedStudent, gradesList);
    }).flatMap(hw => {
      const bookObj = books.find(b => String(b.id) === String(hw.bookId));
      const isExam = hw.type === 'physicalExam' || hw.contentType === 'physicalExam' || bookObj?.bookType === 'exam' || hw.isPhysical;

      if (isExam) {
        const sub = (hw.submissions || []).find(s => isMatchHwSub(s, hw, bookObj)) ||
          subByHwId.get(String(hw.id)) ||
          (studentSubmissions || []).find(s => isMatchHwSub(s, hw, bookObj));

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

      const isBook = Boolean(
        hw.isBookAssignment ||
        hw.sourceType === 'trackedBook' ||
        (hw.bookId && bookObj) ||
        hw.title?.includes('(Tüm Kitap Görevi)') ||
        hw.title?.includes('(Tüm Kitap)') ||
        hw.title?.includes('(Kendi Eklediğim)')
      );

      if (isBook) {
        return []; // Kitap takibi testleri Ödevlerim'de gösterilmez; Haftalık Program'da ve Kitaplarım'da takip edilir
      }

      const sub = (hw.submissions || []).find(s => isMatchHwSub(s, hw, bookObj)) ||
        (studentSubmissions || []).find(s => isMatchHwSub(s, hw, bookObj));

      let qCount = hw.totalQuestions || hw.questionCount || 0;
      if (!qCount && Array.isArray(hw.tests) && hw.tests.length > 0) {
        qCount = hw.tests.reduce((acc, t) => acc + (typeof t === 'object' ? (t.questionCount || t.qCount || 12) : 12), 0);
      }
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
  }, [homeworks, studentSubmissions, selectedStudent, curData, books, bookTests]);

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
      submissions: studentSubmissions,
      homeworks,
      books,
      bookTests,
      studentMockExams
    });
  }, [selectedStudent, studentSubmissions, homeworks, books, bookTests, studentMockExams]);

  /* ─── Overall Student Success Rate (%) (Sonuçlarım & Koçluk ile %100 Senkronize) ─── */
  const overallSuccessRate = useMemo(() => {
    let totalCorrect = 0;
    let totalQuestions = 0;

    (otherHomeworkSubmissions || []).forEach(s => {
      // 🛡️ Exclude unevaluated open-ended tests from dragging down the overall success percentage
      if (s.isPendingEvaluation || (s.isOpenEnded && !s.isEvaluated) || s.scorePercentage === null || s.scorePercentage === undefined) return;

      const c = Number(s.correctCount) || 0;
      const w = Number(s.wrongCount) || 0;
      const e = Number(s.emptyCount) || 0;
      const explicitTotal = Number(s.totalQuestions) || 0;
      const q = (c + w + e > 0) ? (c + w + e) : explicitTotal;
      totalCorrect += c;
      totalQuestions += q;
    });

    (generalTrialExams || []).forEach(m => {
      if (m.isPendingEvaluation || (m.isOpenEnded && !m.isEvaluated)) return;

      const c = Number(m.totalCorrect ?? m.correctCount) || 0;
      const w = Number(m.totalWrong ?? m.wrongCount) || 0;
      const e = Number(m.totalEmpty ?? m.emptyCount ?? m.blankCount) || 0;
      const explicitTotal = Number(m.totalQuestions) || 0;
      const q = (c + w + e > 0) ? (c + w + e) : explicitTotal;
      totalCorrect += c;
      totalQuestions += q;
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
    
    // Build comprehensive ID set for selected student (aliases, UUIDs, matching email/name)
    const allStudentIds = new Set();
    const addId = (val) => {
      if (!val) return;
      const sVal = String(val).trim();
      allStudentIds.add(sVal);
      const uv = toUUID(sVal);
      if (uv) allStudentIds.add(uv);
    };

    addId(selectedStudent.id);
    addId(selectedStudent.student_id);
    addId(selectedStudent.studentId);
    addId(selectedStudent.uuid);

    const sName = String(selectedStudent.name || '').trim().toLowerCase();
    const sEmail = String(selectedStudent.email || '').trim().toLowerCase();

    (users || []).forEach(u => {
      const uName = String(u.name || '').trim().toLowerCase();
      const uEmail = String(u.email || '').trim().toLowerCase();
      const isNameMatch = sName && uName && sName === uName;
      const isEmailMatch = sEmail && uEmail && (sEmail === uEmail || sEmail.split('@')[0] === uEmail.split('@')[0]);
      if (isNameMatch || isEmailMatch) {
        addId(u.id);
        addId(u.student_id);
        addId(u.studentId);
      }
    });

    const studentSubs = studentSubmissions;

    const bookAssignments = (homeworks || []).filter(hw => {
      if (isExamBook(hw)) return false;
      if (!hw.isBookAssignment && !hw.bookId && !hw.title?.includes('(Tüm Kitap Görevi)') && !hw.title?.includes('(Tüm Kitap)') && !hw.title?.includes('(Kendi Eklediğim)') && hw.sourceType !== 'trackedBook') return false;
      return isHomeworkForStudent(hw, selectedStudent, curData?.grades);
    });

    const bookMap = {};
    const getNormKey = (b) => `${String(b.title || '').trim().toLowerCase().replace(/\s+/g, ' ')}___${String(b.publisher || '').trim().toLowerCase().replace(/\s+/g, ' ')}`;

    // 1. Add all standard / tracked books
    (books || []).filter(b => isStandardOrMixedBook(b)).forEach(b => {
      const normK = getNormKey(b);
      if (!bookMap[normK]) {
        bookMap[normK] = { ...b, assignedHomeworks: [] };
      }
    });

    // 2. Process books assigned via homeworks
    bookAssignments.forEach(hw => {
      let book = books.find(b => (String(b.id) === String(hw.bookId) || toUUID(b.id) === toUUID(hw.bookId)) && isStandardOrMixedBook(b));
      if (!book && hw.title) {
        book = books.find(b => isStandardOrMixedBook(b) && (hw.title.includes(b.title) || b.title.includes(hw.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim())));
      }
      if (!book && Array.isArray(hw.tests) && hw.tests.length > 0) {
        const matchedBt = bookTests.find(bt => hw.tests.includes(bt.id) || (toUUID(bt.id) && hw.tests.includes(toUUID(bt.id))));
        if (matchedBt) {
          book = books.find(b => (String(b.id) === String(matchedBt.bookId) || toUUID(b.id) === toUUID(matchedBt.bookId)) && isStandardOrMixedBook(b));
        }
      }
      if (!book) return;

      const normK = getNormKey(book);
      if (!bookMap[normK]) {
        bookMap[normK] = { ...book, assignedHomeworks: [] };
      }
      bookMap[normK].assignedHomeworks.push(hw);

      if (hw.dueDate) {
        const dueDate = new Date(hw.dueDate);
        if (!bookMap[normK].targetDueDate || dueDate > bookMap[normK].targetDueDate) bookMap[normK].targetDueDate = dueDate;
      }
    });

    // Pre-index book tests by bookId
    const bookTestsByBookIdMap = new Map();
    (bookTests || []).forEach(bt => {
      const bId = String(bt.bookId || bt.book_id || '');
      if (bId) {
        if (!bookTestsByBookIdMap.has(bId)) bookTestsByBookIdMap.set(bId, []);
        bookTestsByBookIdMap.get(bId).push(bt);
      }
      const bUuid = toUUID(bId);
      if (bUuid && bUuid !== bId) {
        if (!bookTestsByBookIdMap.has(bUuid)) bookTestsByBookIdMap.set(bUuid, []);
        bookTestsByBookIdMap.get(bUuid).push(bt);
      }
      if (bt.bookTitle) {
        const cleanTitle = String(bt.bookTitle).toLowerCase().trim();
        if (!bookTestsByBookIdMap.has(cleanTitle)) bookTestsByBookIdMap.set(cleanTitle, []);
        bookTestsByBookIdMap.get(cleanTitle).push(bt);
      }
    });

    // Pre-index all matching student submissions
    const allMatchingSubs = [...studentSubs];
    (homeworks || []).forEach(hw => {
      if (Array.isArray(hw.submissions)) {
        hw.submissions.forEach(s => {
          if (!s || s.status === 'in_progress' || s.status === 'draft') return;
          const sid = String(s.studentId || s.student_id || s.user_id || '');
          if (allStudentIds.has(sid) || (toUUID(sid) && allStudentIds.has(toUUID(sid)))) {
            allMatchingSubs.push(s);
          }
        });
      }
    });

    const solvedSubsMap = new Map();
    allMatchingSubs.forEach(s => {
      const score = Number(s.score || s.computedScore || (s.correct_count ?? s.correctCount ?? s.correct ?? 0));
      const compKey = getSubmissionCompositeKey(s);
      if (compKey) {
        const existing = solvedSubsMap.get(compKey);
        const exScore = Number(existing?.score || existing?.computedScore || (existing?.correct_count ?? existing?.correctCount ?? existing?.correct ?? 0));
        if (!existing || score >= exScore) {
          solvedSubsMap.set(compKey, s);
        }
      }

      const matchIds = [
        s.testId, s.test_id, s.bookTestId, s.realTestId, s.id,
        s.metadata?.testId, s.metadata?.bookTestId, s.metadata?.realTestId
      ];
      if (Array.isArray(s.bookTestIds)) matchIds.push(...s.bookTestIds);
      matchIds.forEach(id => {
        if (!id) return;
        const strId = String(id);
        const cleanId = strId.replace(/^bt_/, '').replace(/^q_/, '');
        const uuid = toUUID(strId);
        
        const existing = solvedSubsMap.get(strId) || solvedSubsMap.get(cleanId);
        const exScore = Number(existing?.score || existing?.computedScore || (existing?.correct_count ?? existing?.correctCount ?? existing?.correct ?? 0));
        if (!existing || score >= exScore) {
          solvedSubsMap.set(strId, s);
          solvedSubsMap.set(cleanId, s);
          if (uuid) solvedSubsMap.set(uuid, s);
        }
      });
    });

    // Compute statistics for each book
    const list = Object.values(bookMap).map((book, idx) => {
      const bId = String(book.id);
      const bUuid = toUUID(bId);
      const bTitle = String(book.title || '').toLowerCase().trim();

      const rawSubjects = (book.subjects && book.subjects.length > 0) ? book.subjects : (book.raw_data?.subjects || []);
      const subjects = rawSubjects.filter(s => s && s.name);

      // Deduplicate tests in book
      const deduplicatedMap = new Map();
      (bookTests || []).filter(bt => {
        const btBId = String(bt.bookId || bt.book_id || '');
        return btBId === bId || (bUuid && btBId === bUuid) || (toUUID(btBId) && toUUID(btBId) === bUuid);
      }).forEach(t => {
        const nameKey = String(t.name || t.title || '').trim().toLowerCase();
        const topKey = String(t.topicId || t.topic_id || 'direct').trim().toLowerCase();
        const sId = String(t.subjectId || t.subject_id || 'direct').trim().toLowerCase();
        const key = `${sId}___${topKey}___${nameKey}`;
        if (!deduplicatedMap.has(key)) {
          deduplicatedMap.set(key, t);
        }
      });
      const testsInBook = Array.from(deduplicatedMap.values());

      const totalBookTests = testsInBook.length > 0 ? testsInBook.length : (book.totalTests || 1);

      let totalCorrect = 0;
      let totalWrong = 0;
      let totalBlank = 0;
      let totalSolvedTests = 0;
      let nextTest = null;

      testsInBook.forEach(t => {
        const parentSubj = subjects.find(s => String(s.id) === String(t.subject_id || t.subjectId));
        const parentTopic = parentSubj ? (parentSubj.topics || []).find(tp => String(tp.id) === String(t.topic_id || t.topicId)) : null;

        const contextualTest = {
          ...t,
          subject: parentSubj?.name || t.subject || t.subjectName || '',
          subjectName: parentSubj?.name || t.subject || t.subjectName || '',
          unit: parentTopic?.name || t.unit || t.unitName || '',
          unitName: parentTopic?.name || t.unit || t.unitName || '',
          bookId: book.id,
          bookTitle: book.title
        };
        const tIdStr = String(t.id);
        const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
        const tUuid = toUUID(tIdStr);
        const tCleanUuid = toUUID(tCleanId);
        const tCompKey = createCompositeTestKey(book.title, contextualTest.subject, contextualTest.unit, t.name || t.title);

        let bestSub = solvedSubsMap.get(tIdStr) || 
                      solvedSubsMap.get(tCleanId) ||
                      (tUuid && solvedSubsMap.get(tUuid)) ||
                      (tCleanUuid && solvedSubsMap.get(tCleanUuid)) ||
                      (tCompKey && solvedSubsMap.get(tCompKey));

        if (bestSub) {
          totalSolvedTests++;
          totalCorrect += Number(bestSub.correct_count ?? bestSub.correctCount ?? bestSub.correct ?? 0);
          totalWrong += Number(bestSub.wrong_count ?? bestSub.wrongCount ?? bestSub.wrong ?? 0);
          totalBlank += Number(bestSub.empty_count ?? bestSub.blankCount ?? bestSub.blank ?? 0);
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
  }, [selectedStudent, books, bookTests, studentSubmissions, homeworks, curData]);

  const recentSolvedTests = useMemo(() => {
    if (!selectedStudent?.id) return [];
    const allSubs = getAllUnifiedStudentSubmissions({
      studentId: selectedStudent.id,
      targetStudent: selectedStudent,
      submissions,
      homeworks,
      books,
      bookTests
    });
    return allSubs;
  }, [selectedStudent, submissions, homeworks, books, bookTests]);

  const handleDeleteRecentTest = async (testItem) => {
    if (!testItem || !window.confirm(`"${testItem.title || 'Bu test'}" sonucunu silmek istediğinize emin misiniz? Tüm kaydı ve istatistikleri sıfırlanacaktır.`)) return;
    try {
      const allTestIdentifiers = [
        testItem.testId,
        testItem.bookTestId,
        testItem.realTestId,
        testItem.id,
        testItem.submissionId,
        testItem.supabaseId
      ].filter(Boolean);

      if (testItem.id) await deleteSubmission(testItem.id);
      if (testItem.supabaseId) await deleteSubmission(testItem.supabaseId);
      if (testItem.testId) await deleteSubmissionsByTestId(testItem.testId);
      if (testItem.hwId && testItem.hwId !== testItem.testId) await deleteSubmissionsByTestId(testItem.hwId);
      if (typeof deleteStudentSubmissionsForBookOrHw === 'function') {
        await deleteStudentSubmissionsForBookOrHw(selectedStudent?.id, testItem.hwId, testItem.bookId, allTestIdentifiers);
      }
      if (typeof clearHomeworkSubmissionsForStudent === 'function') {
        await clearHomeworkSubmissionsForStudent(testItem.hwId, selectedStudent?.id, testItem.bookId, allTestIdentifiers);
      }
    } catch (e) {
      console.error("Delete test from dashboard error:", e);
    }
  };

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

  // ── Pre-indexed Map for fast O(1) book test lookups ──
  // Replaces repeated O(n³) loops in resolveBookTestInfo
  const bookTestInfoCache = useMemo(() => {
    const cache = new Map();
    const addToCache = (testId, info) => {
      if (!testId) return;
      const idStr = String(testId);
      const idClean = idStr.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
      const idUuid = String(toUUID(idStr) || '');
      cache.set(idStr, info);
      cache.set(idClean, info);
      if (idUuid && idUuid !== idStr) cache.set(idUuid, info);
    };

    // Pre-index books Map for O(1) book lookup instead of repeated books.find()
    const bookByIdMap = new Map();
    (books || []).forEach(b => {
      if (!b?.id) return;
      const bId = String(b.id);
      bookByIdMap.set(bId, b);
      const bUuid = toUUID(bId);
      if (bUuid) bookByIdMap.set(bUuid, b);
    });

    // Index from bookTests array
    (bookTests || []).forEach(bt => {
      const bookId = String(bt.bookId || bt.book_id || '');
      const currentBook = bookByIdMap.get(bookId) || (toUUID(bookId) && bookByIdMap.get(toUUID(bookId))) || null;
      let subjObj = null;
      let topicObj = null;
      if (currentBook?.subjects) {
        const sId = String(bt.subject_id || bt.subjectId || '');
        const topId = String(bt.topic_id || bt.topicId || '');
        for (const s of currentBook.subjects) {
          if (!s || s.__meta || !s.name) continue;
          if (sId && (String(s.id) === sId || ((isValidUUID(s.id) || isValidUUID(sId)) && toUUID(s.id) === toUUID(sId)))) {
            subjObj = s;
            if (topId && s.topics) {
              topicObj = s.topics.find(tp => String(tp.id) === topId || ((isValidUUID(tp.id) || isValidUUID(topId)) && toUUID(tp.id) === toUUID(topId))) || null;
            }
            break;
          }
        }
      }
      addToCache(bt.id, { tObj: bt, currentBook, subjObj, topicObj });
    });

    // Index from books.subjects.topics.tests (deep scan, done once)
    (books || []).forEach(book => {
      (book.subjects || []).forEach(subj => {
        (subj.tests || []).forEach(t => {
          addToCache(t.id, { tObj: t, currentBook: book, subjObj: subj, topicObj: null });
        });
        (subj.topics || []).forEach(topic => {
          (topic.tests || []).forEach(t => {
            addToCache(t.id, { tObj: t, currentBook: book, subjObj: subj, topicObj: topic });
          });
        });
      });
    });

    return cache;
  }, [books, bookTests]);

  // ── Helper to resolve accurate subject, unit/topic, and test names for any testId / book / homework ──
  const resolveBookTestInfo = useCallback((testId, targetHw = null, targetBookObj = null) => {
    const tIdStr = String(testId || '');
    const tUuidStr = String(toUUID(tIdStr) || '');
    const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');

    // O(1) cache lookup — replaces repeated O(n³) deep loops
    const cached = bookTestInfoCache.get(tIdStr) || bookTestInfoCache.get(tCleanId) || (tUuidStr && bookTestInfoCache.get(tUuidStr));
    let tObj = cached?.tObj || null;
    let currentBook = (targetBookObj?.subjects && targetBookObj.subjects.length > 0) ? targetBookObj : (cached?.currentBook || null);
    let subjObj = cached?.subjObj || null;
    let topicObj = cached?.topicObj || null;

    // Only run expensive deep search if cache missed (rare: newly added tests)
    if (!tObj) {
      tObj = (bookTests || []).find(b => {
        const bId = String(b?.id || '');
        return bId === tIdStr ||
          (tUuidStr && bId === tUuidStr) ||
          (tUuidStr && toUUID(bId) === tUuidStr) ||
          bId.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '') === tCleanId;
      });
    }

    // Search in all books that have subjects (only if cache missed)
    if (!subjObj) {
      for (const b of (books || [])) {
        if (!b.subjects || b.subjects.length === 0) continue;

        const tSubjectId = String(tObj?.subject_id || tObj?.subjectId || '');
        const tTopicId = String(tObj?.topic_id || tObj?.topicId || '');

        for (const s of b.subjects) {
          if (!s || s.__meta || !s.name) continue;
          const isMatchSubj = tSubjectId && (String(s.id) === tSubjectId || ((isValidUUID(s.id) || isValidUUID(tSubjectId)) && toUUID(s.id) === toUUID(tSubjectId)) || (s.name && (tObj?.subjectName || tObj?.subject) && String(s.name).toLowerCase().trim() === String(tObj?.subjectName || tObj?.subject).toLowerCase().trim()));
          if (isMatchSubj) {
            subjObj = s;
            if (!currentBook) currentBook = b;
            for (const tp of (s.topics || [])) {
              if (tTopicId && (String(tp.id) === tTopicId || ((isValidUUID(tp.id) || isValidUUID(tTopicId)) && toUUID(tp.id) === toUUID(tTopicId)) || (tp.name && (tObj?.topicName || tObj?.topic) && String(tp.name).toLowerCase().trim() === String(tObj?.topicName || tObj?.topic).toLowerCase().trim()))) {
                topicObj = tp;
                break;
              }
            }
            break;
          }

          if (s.tests && Array.isArray(s.tests)) {
            const found = s.tests.find(t => String(t.id) === tIdStr || (tUuidStr && String(t.id) === tUuidStr) || String(t.id).replace(/^bt_/, '').replace(/^tbt_/, '') === tCleanId);
            if (found) {
              if (!tObj) tObj = found;
              subjObj = s;
              if (!currentBook) currentBook = b;
              break;
            }
          }
          if (s.topics && Array.isArray(s.topics)) {
            for (const tp of s.topics) {
              if (tp.tests && Array.isArray(tp.tests)) {
                const found = tp.tests.find(t => String(t.id) === tIdStr || (tUuidStr && String(t.id) === tUuidStr) || String(t.id).replace(/^bt_/, '').replace(/^tbt_/, '') === tCleanId);
                if (found) {
                  if (!tObj) tObj = found;
                  subjObj = s;
                  topicObj = tp;
                  if (!currentBook) currentBook = b;
                  break;
                }
              }
            }
          }
          if (subjObj) break;
        }
        if (subjObj) break;
      }
    }


    if (!currentBook) {
      currentBook = (books || []).find(b => 
        (b.subjects && b.subjects.length > 0) && (
          String(b?.id) === String(targetHw?.bookId || targetHw?.book_id || tObj?.book_id || tObj?.bookId) || 
          (toUUID(b?.id) && String(toUUID(b?.id)) === String(toUUID(targetHw?.bookId || targetHw?.book_id || tObj?.book_id || tObj?.bookId))) ||
          (targetHw?.title && String(b?.title).toLowerCase().trim().includes(String(targetHw?.title).toLowerCase().replace(/\s*\(tüm kitap görevi\)/gi, '').trim())) ||
          (targetHw?.title && String(targetHw?.title).toLowerCase().trim().includes(String(b?.title).toLowerCase().trim()))
        )
      );
    }

    if (!currentBook && books && books.length > 0) {
      currentBook = books.find(b => isStandardOrMixedBook(b) && b.subjects && b.subjects.length > 0) || books.find(b => isStandardOrMixedBook(b)) || null;
    }

    if (!tObj && currentBook?.subjects && Array.isArray(currentBook.subjects)) {
      for (const s of currentBook.subjects) {
        for (const t of (s.tests || [])) {
          if (String(t.id) === tIdStr || (tUuidStr && toUUID(t.id) === tUuidStr) || String(t.id).replace(/^bt_/, '').replace(/^tbt_/, '') === tCleanId || (t.name && String(t.name).toLowerCase() === tIdStr.toLowerCase())) {
            tObj = t;
            subjObj = s;
            break;
          }
        }
        for (const tp of (s.topics || [])) {
          for (const t of (tp.tests || [])) {
            if (String(t.id) === tIdStr || (tUuidStr && toUUID(t.id) === tUuidStr) || String(t.id).replace(/^bt_/, '').replace(/^tbt_/, '') === tCleanId || (t.name && String(t.name).toLowerCase() === tIdStr.toLowerCase())) {
              tObj = t;
              subjObj = s;
              topicObj = tp;
              break;
            }
          }
        }
        if (tObj) break;
      }
    }

    // Fallback: If testId is numeric index or matching by position in book
    if (!tObj && currentBook?.subjects) {
      const allFlatTests = [];
      currentBook.subjects.forEach(s => {
        (s.tests || []).forEach(t => allFlatTests.push({ ...t, subj: s, topic: null }));
        (s.topics || []).forEach(tp => {
          (tp.tests || []).forEach(t => allFlatTests.push({ ...t, subj: s, topic: tp }));
        });
      });
      const numericIndex = parseInt(tCleanId.replace(/\D/g, ''), 10);
      if (!isNaN(numericIndex) && numericIndex >= 0 && numericIndex < allFlatTests.length) {
        const found = allFlatTests[numericIndex];
        if (found) {
          tObj = found;
          if (!subjObj) subjObj = found.subj;
          if (!topicObj) topicObj = found.topic;
        }
      }
    }

    let subjectName = subjObj?.name || tObj?.subjectName || tObj?.subject;
    if (!subjectName || subjectName === 'Atlı Karınca' || subjectName === 'Artıbir' || subjectName === 'CUSTOM') {
      const rawToCheck = `${targetHw?.title || ''} ${targetHw?.subject || ''} ${currentBook?.title || ''} ${tObj?.name || ''} ${tObj?.title || ''}`;
      if (/problem/i.test(tObj?.name || tObj?.title || '') || (/matematik/i.test(rawToCheck) && !/paragraf/i.test(tObj?.name || tObj?.title || ''))) subjectName = 'Matematik';
      else if (/paragraf/i.test(tObj?.name || tObj?.title || '') || /turkce|türkçe|paragraf/i.test(rawToCheck)) subjectName = 'Türkçe';
      else if (/sosyal/i.test(rawToCheck)) subjectName = 'Sosyal Bilgiler';
      else if (/fen/i.test(rawToCheck)) subjectName = 'Fen Bilimleri';
      else if (/ingilizce/i.test(rawToCheck)) subjectName = 'İngilizce';
      else if (/din/i.test(rawToCheck)) subjectName = 'Din Kültürü';
      else subjectName = currentBook?.title ? currentBook.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim() : 'Kitap Takibi';
    }

    const topicName = topicObj?.name || tObj?.topicName || tObj?.topic || '';
    
    let cleanTitle = currentBook?.title ||
      targetHw?.bookTitle ||
      targetHw?.bookName ||
      tObj?.bookTitle ||
      tObj?.bookName ||
      '';

    if (cleanTitle) {
      cleanTitle = cleanTitle
        .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
        .replace(/\s*\(Tüm Kitap\)/gi, '')
        .replace(/\s*\(Kendi Eklediğim\)/gi, '')
        .replace(/\s*\(Görev\)/gi, '')
        .trim();
    }

    if (!cleanTitle || cleanTitle.toLowerCase() === 'kitap' || cleanTitle.toLowerCase() === 'takip kitabı') {
      const fb = (books || []).find(b => b.title && !b.title.toLowerCase().startsWith('kitap'));
      if (fb?.title) {
        cleanTitle = fb.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim();
      } else if (books?.[0]?.title) {
        cleanTitle = books[0].title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim();
      }
    }

    let testName = tObj?.name || tObj?.title;
    if (testName) {
      testName = testName
        .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
        .replace(/\s*\(Tüm Kitap\)/gi, '')
        .replace(/\s*\(Kendi Eklediğim\)/gi, '')
        .replace(/\s*\(Görev\)/gi, '')
        .trim();
    }

    // If testName matches book title or is generic, resolve from topic/subject
    if (!testName || testName === 'Test' || testName === 'Kitap Testi' || testName === cleanTitle || (cleanTitle && testName.toLowerCase() === cleanTitle.toLowerCase())) {
      if (topicName) {
        testName = `${topicName} Testi`;
      } else if (subjectName) {
        testName = `${subjectName} Testi`;
      } else {
        testName = 'Konu Testi';
      }
    }

    const qCount = tObj?.questionCount || 12;

    return {
      tObj,
      subjObj,
      topicObj,
      subjectName,
      topicName,
      testName,
      qCount,
      cleanBookTitle: cleanTitle || 'Takip Kitabı',
      currentBook
    };
  }, [books, bookTests, bookTestInfoCache]);

  /* ─── Day Key Resolver Helper ─── */
  const resolveDayKey = useCallback((input) => {
    if (!input) return null;
    const str = String(input).trim().toLowerCase();
    if (str.includes('-') || str.includes('t') || str.includes('.')) {
      const parsed = new Date(input);
      if (!isNaN(parsed.getTime())) {
        const map = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];
        return map[parsed.getDay()];
      }
    }
    const dayKeyMap = {
      pazartesi: 'Pzt', pzt: 'Pzt',
      sali: 'Sal', salı: 'Sal', sal: 'Sal',
      carsamba: 'Çrş', çarşamba: 'Çrş', çrş: 'Çrş', crs: 'Çrş',
      persembe: 'Prş', perşembe: 'Prş', prş: 'Prş', prs: 'Prş',
      cuma: 'Cum', cum: 'Cum',
      cumartesi: 'Cts', cts: 'Cts',
      pazar: 'Paz', paz: 'Paz'
    };
    return dayKeyMap[str] || null;
  }, []);

  /* ─── Computed Day Program (Instant O(1) Pre-indexed Memo) ─── */
  const fullProcessedWeekMap = useMemo(() => {
    try {
      const studentId = selectedStudent?.id;
      const sUuid = toUUID(studentId);
      const rawProg = coachingProfile?.weeklyProgram || (coachingProfiles || []).find(p => {
        if (!p) return false;
        const pSid = String(p.studentId || p.userId || p.id || '');
        return pSid === String(studentId) || (sUuid && (pSid === sUuid || toUUID(pSid) === sUuid));
      })?.weeklyProgram;
      const gradesList = curData?.grades || [];

      const studentHomeworks = (homeworks || []).filter(hw => {
        if (!selectedStudent || !hw) return false;
        return isHomeworkForStudent(hw, selectedStudent, gradesList);
      });

      // Pre-index sets & maps for 100x faster lookups across days
      const validHwIdSet = new Set();
      (homeworks || []).forEach(h => {
        if (!h?.id) return;
        validHwIdSet.add(String(h.id));
        const u = toUUID(h.id);
        if (u) validHwIdSet.add(u);
      });

      const validBtIdSet = new Set();
      (bookTests || []).forEach(b => {
        if (!b?.id) return;
        validBtIdSet.add(String(b.id));
        const u = toUUID(b.id);
        if (u) validBtIdSet.add(u);
      });

      const validQIdSet = new Set();
      (allQuestions || []).forEach(q => {
        if (!q?.id) return;
        validQIdSet.add(String(q.id));
        const u = toUUID(q.id);
        if (u) validQIdSet.add(u);
      });

      const studyAssignmentMap = new Map();
      (studyAssignments || []).forEach(a => {
        if (a?.id) studyAssignmentMap.set(String(a.id), a);
      });

      const studyPlanMap = new Map();
      (studyPlans || []).forEach(p => {
        if (p?.id) studyPlanMap.set(String(p.id), p);
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

        const isMatchHwSub = (s, targetHw = null, specificTestId = null) => {
          if (!s || !isMatchStudent(s)) return false;
          if (s.status === 'in_progress' || s.status === 'draft') return false;

          const hwIdStr = String(targetHw?.id || '');
          const cleanHwId = hwIdStr.replace(/^hw_/, '');
          const sHwId = String(s.hwId || s.homeworkId || '');
          const sTestId = String(s.testId || s.test_id || '');
          const sRealTestId = String(s.realTestId || s.metadata?.realTestId || '');
          const sBookTestId = String(s.bookTestId || s.metadata?.bookTestId || '');
          const sId = String(s.id || '');

          if (specificTestId) {
            const specStr = String(specificTestId);
            const specClean = specStr.replace(/^q_/, '').replace(/^bt_/, '').replace(/^tbt_/, '');
            const specUuid = String(toUUID(specificTestId) || '');
            if (sTestId && (sTestId === specStr || sTestId === specClean || (specUuid && sTestId === specUuid))) return true;
            if (sRealTestId && (sRealTestId === specStr || sRealTestId === specClean || (specUuid && sRealTestId === specUuid))) return true;
            if (sBookTestId && (sBookTestId === specStr || sBookTestId === specClean || (specUuid && sBookTestId === specUuid))) return true;
            if (s.bookTestIds && Array.isArray(s.bookTestIds) && s.bookTestIds.some(tid => String(tid) === specStr || String(tid) === specClean)) return true;
            return false;
          }

          if (targetHw) {
            if (sHwId && (sHwId === hwIdStr || sHwId === cleanHwId || (toUUID(hwIdStr) && sHwId === toUUID(hwIdStr)))) return true;
            if (sTestId && (sTestId === hwIdStr || sTestId === cleanHwId || (toUUID(hwIdStr) && sTestId === toUUID(hwIdStr)))) return true;
            if (sId && (sId === hwIdStr || sId === cleanHwId || (toUUID(hwIdStr) && sId === toUUID(hwIdStr)))) return true;
          }
          return false;
        };

        let dayManualItems = [];
        if (Array.isArray(rawProg)) {
          const found = rawProg.find(r => r?.day === dayMeta.key);
          if (found && Array.isArray(found.items)) {
            found.items.forEach(item => {
              if (!item) return;
              // Remedial tests scheduled by teacher/student: match strictly against specific scheduled date if present
              if (item.isTeacherRemedial || item.type === 'remedialTest' || item.isRemedial || item.isRemedialTest || item.isSpacedRepetition) {
                const itemYMD = extractItemYMD(item) || item.scheduledDate || item.date || item.specificDate || item.singleDate;
                if (itemYMD && dayYMD && itemYMD !== dayYMD) {
                  return;
                }
                dayManualItems.push({ ...item, isWeeklyProgItem: true });
                return;
              }
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

        // Filter out manual/program items referencing deleted homeworks, book tests, or deleted study plans/roadmaps using fast O(1) Sets
        dayManualItems = dayManualItems.filter(item => {
          if (item.type === 'remedialTest' || item.isRemedial || item.isRemedialTest || item.isTeacherRemedial || item.isSpacedRepetition) {
            return true;
          }
          if (item.hwId && !validHwIdSet.has(String(item.hwId))) return false;
          if (item.testId && !item.hwId && item.type !== 'remedialTest' && !item.isRemedial && !item.isTeacherRemedial && !item.isSpacedRepetition) {
            if (!validBtIdSet.has(String(item.testId)) && !validQIdSet.has(String(item.testId))) return false;
          }
          if (item.roadmapAssignmentId || item.isRoadmapTask || item.taskType === 'yol_haritasi' || item.taskType === 'konu') {
            const assignment = studyAssignmentMap.get(String(item.roadmapAssignmentId));
            if (!assignment) return false;
            const plan = studyPlanMap.get(String(assignment.planId || assignment.studyPlanId || assignment.study_plan_id));
            if (!plan) return false;
          }
          return true;
        });

        const scheduleItems = (schedules || []).filter(s => {
          if (!s || !studentId) return false;
          const sSid = String(s.studentId || s.student_id || '');
          if (sSid !== String(studentId) && (!sUuid || (toUUID(sSid) !== sUuid && toUUID(sSid) !== toUUID(studentId)))) return false;
          const sYMD = extractItemYMD(s);
          if (sYMD) {
            return sYMD === dayYMD;
          }
          const sDay = String(s.day || s.dayOfWeek || s.dayName || '').toLowerCase().trim();
          const dKey = String(dayMeta.key || '').toLowerCase().trim();
          const dName = String(dayMeta.name || '').toLowerCase().trim();
          return sDay === dKey || sDay === dName || sDay.startsWith(dKey) || dName.startsWith(sDay);
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

        // Scheduled book tests for this day (hw.testDueDates)
        const scheduledBookItems = [];
        const seenDayBtKeys = new Set();
        (studentHomeworks || []).forEach(hw => {
          const testDates = hw.testDueDates || hw.scheduleDates || hw.test_due_dates || hw.raw_data?.testDueDates || hw.raw_data?.scheduleDates || {};
          if (typeof testDates !== 'object' || Object.keys(testDates).length === 0) return;

          const bookObj = (books || []).find(b =>
            String(b.id) === String(hw.bookId || hw.raw_data?.bookId) ||
            (toUUID(b.id) && toUUID(b.id) === toUUID(hw.bookId || hw.raw_data?.bookId))
          );
          const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap')
            .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
            .replace(/\s*\(Tüm Kitap\)/gi, '')
            .trim();

          Object.entries(testDates).forEach(([testIdKey, tDateStr]) => {
            if (!tDateStr) return;
            const targetDayKey = resolveDayKey(tDateStr);
            const isExplicitDate = String(tDateStr).includes('-') || String(tDateStr).includes('.');
            const isMatchDate = isExplicitDate
              ? (dayYMD && String(tDateStr).startsWith(dayYMD))
              : (targetDayKey === dayMeta.key);
            if (!isMatchDate) return;

            const cleanTestId = String(testIdKey).replace(/^bt_/, '').replace(/^q_/, '');
            const dedupeKey = `bt_${cleanTestId}`;
            if (seenDayBtKeys.has(dedupeKey)) return;
            seenDayBtKeys.add(dedupeKey);

            const bt = (bookTests || []).find(b => {
              const bId = String(b.id);
              return bId === cleanTestId || bId === String(testIdKey) || (toUUID(cleanTestId) && toUUID(bId) === toUUID(cleanTestId));
            });

            let resolvedSubject = bt?.subject || bt?.subjectName || '';
            let resolvedUnit = bt?.unit || bt?.unitName || '';
            const sId = bt?.subjectId || bt?.subject_id;
            const tId = bt?.topicId || bt?.topic_id;

            let bookSubjects = bookObj?.subjects || [];
            if (typeof bookSubjects === 'string') {
              try { bookSubjects = JSON.parse(bookSubjects); } catch {}
            }

            if (Array.isArray(bookSubjects)) {
              for (const subj of bookSubjects) {
                const isSubjMatch = sId && String(subj.id) === String(sId);
                let isTopicMatch = false;
                for (const top of (subj.topics || [])) {
                  if ((tId && String(top.id) === String(tId)) || (top.tests || []).some(t => String(t.id) === cleanTestId)) {
                    resolvedUnit = top.name;
                    isTopicMatch = true;
                    break;
                  }
                }
                if (isSubjMatch || isTopicMatch) {
                  resolvedSubject = subj.name;
                  break;
                }
              }
            }

            if (!resolvedSubject) {
              resolvedSubject = bookObj?.subject || hw.subject || 'Genel Ders';
            }

            const testTitle = bt?.name || bt?.title || 'Kitap Testi';
            const qCount = Number(bt?.questionCount || bt?.question_count) || (bt?.answerKey ? Object.keys(bt.answerKey).filter(k => k !== '__meta' && k !== 'meta').length : 15);

            scheduledBookItems.push({
              id: dedupeKey,
              testId: cleanTestId,
              bookTestId: cleanTestId,
              realTestId: cleanTestId,
              hwId: hw.id,
              bookId: hw.bookId || bookObj?.id,
              bookTitle: cleanBookTitle,
              title: testTitle,
              testName: testTitle,
              subject: resolvedSubject || 'Genel Ders',
              unitTopic: resolvedUnit,
              topic: resolvedUnit,
              questionCount: qCount,
              targetQuestionCount: qCount,
              categoryType: 'kitap',
              isBookTask: true,
              isAutoHomework: true,
              dueDateStr: tDateStr,
              time: `Son Teslim: ${new Date(tDateStr).toLocaleDateString('tr-TR')}`,
              done: false
            });
          });
        });

        // ID, testId ve içerik (kitap + ders + test adı) bazında tam tekilleştirme — done:true ve testId içerenleri önceliklendir
        const rawAllItems = sortItemsByBookOrder([...scheduledBookItems, ...autoHwItems, ...dayManualItems, ...scheduleItems], books, bookTests);
        const seenIds = new Map();
        rawAllItems.forEach(item => {
          const cleanSubject = String(item.subject || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
          const cleanTitle = String(item.title || item.topic || item.testName || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
          const cleanBook = String(item.bookTitle || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');

          const cleanTestId = String(item.testId || item.bookTestId || '').replace(/^bt_/, '').replace(/^q_/, '');
          let key = '';
          if (cleanTestId) {
            key = `test_${cleanBook}_${cleanSubject}_${cleanTestId}`;
          } else if (item.hwId && !item.testId) {
            key = `hw_${cleanSubject}_${item.hwId}`;
          } else if (cleanTitle && (cleanSubject || cleanBook)) {
            key = `content_${cleanBook}_${cleanSubject}_${cleanTitle}`;
          } else {
            key = String(item.id || '');
          }

          if (!key) return;
          const existing = seenIds.get(key);
          if (!existing || (!existing.done && item.done) || (!existing.testId && item.testId)) {
            seenIds.set(key, item);
          }
        });
        const allItems = sortItemsByBookOrder(Array.from(seenIds.values()), books, bookTests).map(item => {
          const isAttempted = checkHasItemBeenAttempted(item, studentId, studentSubmissions || submissions, homeworks);

          const currentTestId = String(item.testId || item.bookTestId || item.realTestId || '').trim();
          const currentTestClean = currentTestId.replace(/^bt_/, '').replace(/^q_/, '');
          const currentTestUuid = String(toUUID(currentTestClean || currentTestId) || '').trim();
          const currentTitle = String(item.title || item.testName || '').toLowerCase().trim();
          const itemSubject = String(item.subject || item.subjectName || '').toLowerCase().trim();
          const itemTopic = String(item.unit || item.unitName || item.unitTopic || item.topic || item.topicName || '').toLowerCase().trim();
          const studentIdStr = String(studentId || '').trim();
          const studentUuid = String(toUUID(studentId) || '').trim();

          const matchingSubs = (studentSubmissions || submissions || []).filter(s => {
            if (!s || s.status === 'in_progress' || s.status === 'draft' || String(s.id || '').startsWith('draft_') || String(s.id || '').startsWith('64726166')) return false;
            const sId = String(s.studentId ?? s.userId ?? s.student_id ?? '');
            const isStudentMatch = !studentIdStr || sId === studentIdStr || sId === studentUuid || (toUUID(sId) && toUUID(sId) === studentUuid);
            if (!isStudentMatch) return false;

            return isSubmissionMatchingBookTest(s, item, bookTests, books);
          });

          const pastCount = matchingSubs.length;

          // Parse stage number for spaced repetition item
          const stageMatch = (item.text || item.title || item.topic || '').match(/\[(\d+)\.\s*Tekrar(?:\s*[-–(]\s*(\d+)g\s*[)]?)?/i);
          const detectedStage = item.stage || (stageMatch ? parseInt(stageMatch[1], 10) : null);
          const isRemedial = Boolean(item.isRemedial || item.isRemedialTest || item.type === 'remedialTest' || item.taskType === 'remedialTest' || item.isTeacherRemedial || item.isSpacedRepetition || detectedStage);

          // Dedicated target attempt for this repetition stage:
          // Stage 1 (1. Tekrar) requires at least 1 submission of the remedial test (pastCount >= 1).
          // Stage 2 (2. Tekrar) requires at least 2 submissions of the remedial test (pastCount >= 2).
          // Stage 3 (3. Tekrar) requires at least 3 submissions of the remedial test (pastCount >= 3).
          let isItemDone = Boolean(item.done);
          let targetAttemptNumber = detectedStage || (pastCount + 1);

          if (isRemedial && detectedStage) {
            targetAttemptNumber = detectedStage;
            const requiredSubmissionsCount = detectedStage;
            if (pastCount >= requiredSubmissionsCount) {
              isItemDone = true;
            }
          } else if (pastCount > 0) {
            isItemDone = true;
          } else if (!isItemDone) {
            isItemDone = Boolean(isItemSolved(item));
          }

          return {
            ...item,
            done: isItemDone,
            hasPastAttempt: isAttempted || pastCount > 0,
            isRetake: isAttempted || pastCount > 0,
            pastAttemptCount: pastCount,
            stage: detectedStage || item.stage,
            attemptNumber: targetAttemptNumber,
            pastSubmissionsCount: pastCount
          };
        });
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
  }, [coachingProfile, coachingProfiles, homeworks, selectedStudent, curData, studentSubmissions, studentSolvedSet, books, bookTests, schedules, studyAssignments, studyPlans, weekInfo, todayDayKey]);

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



  // ── 🔥 KAPSAMLI AKILLI TELAFİ HAVUZU (HAFTALIK ÇALIŞMA PROGRAMINDA GÜNÜ GEÇMİŞ TÜM ÇÖZÜLMEMİŞ GÖREVLER) ──
  const catchUpTasks = useMemo(() => {
    if (!selectedStudent) return [];
    const list = [];
    const seen = new Set();

    const extractKeys = (it) => {
      if (!it) return [];
      const keys = [];

      const hasSpecificTest = Boolean(it.testId || it.bookTestId || it.realTestId);

      const rawIds = [
        it.id,
        it.testId,
        it.realTestId,
        it.bookTestId,
        it.sourceTestId,
        it.sourceId,
        it.questionId,
        it.roadmapAssignmentId,
        it.assignmentId,
        it.uniqueKey
      ];

      // Only include hwId as standalone key if it's a pure homework without a specific test
      if (!hasSpecificTest) {
        if (it.hwId) rawIds.push(it.hwId);
        if (it.homeworkId) rawIds.push(it.homeworkId);
      } else if (it.hwId && it.testId) {
        keys.push(`hw_test:${it.hwId}_${it.testId}`);
      }

      rawIds.forEach(id => {
        if (!id) return;
        const s = String(id).trim();
        if (!s) return;
        keys.push(`id:${s}`);
        const clean = s.replace(/^hw_|^test_|^bt_|^tbt_|^q_|^item_|^catchup_bt_|^catchup_hw_/, '');
        if (clean && clean !== s) keys.push(`cleanId:${clean}`);
        if (isValidUUID(s)) keys.push(`uuid:${s.toLowerCase()}`);
        if (isValidUUID(clean)) keys.push(`uuid:${clean.toLowerCase()}`);
      });

      const tName = String(it.testName || it.title || it.name || '')
        .toLocaleLowerCase('tr')
        .replace(/\s*\(tüm kitap görevi\)/gi, '')
        .replace(/\s*\(tüm kitap\)/gi, '')
        .replace(/\s*\(kendi eklediğim\)/gi, '')
        .replace(/\s*\(görev\)/gi, '')
        .trim();

      const bTitle = String(it.bookTitle || '')
        .toLocaleLowerCase('tr')
        .replace(/\s*\(tüm kitap görevi\)/gi, '')
        .replace(/\s*\(tüm kitap\)/gi, '')
        .trim();

      const uTopic = String(it.unitTopic || it.topicName || it.topic || '')
        .toLocaleLowerCase('tr')
        .trim();

      const sSubj = String(it.subject || it.subjectName || '')
        .toLocaleLowerCase('tr')
        .trim();

      const pageStr = String(it.page || it.pageRange || (it.startPage && it.endPage ? `${it.startPage}-${it.endPage}` : it.startPage || '') || '')
        .toLocaleLowerCase('tr')
        .replace(/[^0-9-]/g, '');

      const normT = tName.replace(/[^a-z0-9ğüşıöç]/gi, '');
      const normB = bTitle.replace(/[^a-z0-9ğüşıöç]/gi, '');
      const normU = uTopic.replace(/[^a-z0-9ğüşıöç]/gi, '');
      const normS = sSubj.replace(/[^a-z0-9ğüşıöç]/gi, '');

      // Check if it's an exam / deneme
      const isExam = it.isExamTask || it.categoryType === 'deneme' || it.type === 'physicalExam' || /deneme/i.test(tName);
      if (isExam && normT.length >= 3) {
        keys.push(`exam:${normT}`);
      }

      const isGeneric = /^((test|yeninesil|udeg|unite|unitedegerlendirme|problemsayfasi|paragraftesti|kazanimtesti|degerlendirmetesti|etkinlik|alismalar|sorubankasi|yapraksoru|denemesinavi|konutesti)[\s-]*\d*|\d+|test|problemsayfasi|paragraftest|konutesti)$/i.test(normT);

      if (normT.length >= 3) {
        if (normB) {
          if (pageStr) {
            keys.push(`book_page_test:${normB}_${normS}_${pageStr}_${normT}`);
          }
          if (normU) {
            keys.push(`book_unit_test:${normB}_${normS}_${normU}_${normT}`);
          }
          if (!isGeneric && !pageStr && !normU) {
            keys.push(`book_test:${normB}_${normS}_${normT}`);
          }
        } else if (!isGeneric) {
          keys.push(`title:${normS}_${normT}`);
        }
      }

      return keys;
    };

    const isAlreadySeen = (it) => {
      const keys = extractKeys(it);
      return keys.some(k => seen.has(k));
    };

    const addKeysToSeen = (it) => {
      const keys = extractKeys(it);
      keys.forEach(k => seen.add(k));
    };

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const nowTime = now.getTime();
    const todayYMD = getTurkeyYMD();

    // 1. HAFTALIK PROGRAMDAN GÜNÜ GEÇMİŞ (PAZARTESİ, SALI VB.) ÇÖZÜLMEMİŞ GÖREVLER
    const todayIdx = DAYS_OF_WEEK.findIndex(d => d.key === todayDayKey);
    DAYS_OF_WEEK.forEach((d, idx) => {
      const dData = fullProcessedWeekMap[d.key];
      const isPastDay = idx < todayIdx || (dData?.ymd && todayYMD && dData.ymd < todayYMD);
      if (isPastDay) {
        (dData?.items || []).forEach(item => {
          if (!item.done && !isItemSolved(item) && !isTaskDismissed(item)) {
            if (!isAlreadySeen(item)) {
              addKeysToSeen(item);
              list.push({
                ...item,
                categoryType: item.categoryType || (item.isBookTask ? 'kitap' : (item.isExamTask ? 'deneme' : 'program')),
                sourceDayName: d.name,
                sourceDayKey: d.key,
                isCatchUp: true,
                time: item.time || `Hedef: ${d.name}`,
                dueDateStr: item.dueDateStr || dData?.dateLabel || d.name,
                reason: `${d.name} gününden kalan görev`
              });
            }
          }
        });
      }
    });

    // 2. ATANMIŞ KİTAP ÖDEVLERİNDEN (hw.testDueDates) VE ÖDEVLERDEN TARİHİ GEÇMİŞ TÜM ÇÖZÜLMEMİŞ TESTLER
    const gradesList = curData?.grades || [];
    (homeworks || []).filter(hw => {
      if (!selectedStudent || !hw) return false;
      return isHomeworkForStudent(hw, selectedStudent, gradesList);
    }).forEach(hw => {
      const testDates = hw.testDueDates || hw.scheduleDates || hw.test_due_dates || hw.raw_data?.testDueDates || hw.raw_data?.scheduleDates || {};
      const hasTestDueDates = typeof testDates === 'object' && Object.keys(testDates).length > 0;
      const bookObj = (books || []).find(b =>
        String(b.id) === String(hw.bookId || hw.raw_data?.bookId) ||
        (toUUID(b.id) && toUUID(b.id) === toUUID(hw.bookId || hw.raw_data?.bookId))
      );
      const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap')
        .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
        .replace(/\s*\(Tüm Kitap\)/gi, '')
        .trim();

      if (hasTestDueDates) {
        const seenCleanTestIds = new Set();
        Object.entries(testDates).forEach(([testIdKey, dStr]) => {
          if (!dStr) return;
          const cleanTestId = String(testIdKey).replace(/^bt_/, '').replace(/^q_/, '');
          if (seenCleanTestIds.has(cleanTestId)) return;
          seenCleanTestIds.add(cleanTestId);

          const due = new Date(dStr);
          const dueTime = due.getTime();
          const dueYMD = String(dStr).slice(0, 10);
          const isOverdue = (todayYMD && dueYMD && dueYMD < todayYMD) || (!isNaN(dueTime) && dueTime < nowTime);
          if (!isOverdue) return;
          const bt = (bookTests || []).find(b => {
            const bId = String(b.id);
            return bId === cleanTestId || bId === String(testIdKey) || (toUUID(cleanTestId) && toUUID(bId) === toUUID(cleanTestId));
          });

          let resolvedSubject = bt?.subject || bt?.subjectName || '';
          let resolvedUnit = bt?.unit || bt?.unitName || '';
          const sId = bt?.subjectId || bt?.subject_id;
          const tId = bt?.topicId || bt?.topic_id;

          let bookSubjects = bookObj?.subjects || [];
          if (typeof bookSubjects === 'string') {
            try { bookSubjects = JSON.parse(bookSubjects); } catch {}
          }

          if (Array.isArray(bookSubjects)) {
            for (const subj of bookSubjects) {
              const isSubjMatch = sId && String(subj.id) === String(sId);
              let isTopicMatch = false;
              for (const top of (subj.topics || [])) {
                if ((tId && String(top.id) === String(tId)) || (top.tests || []).some(t => String(t.id) === cleanTestId)) {
                  resolvedUnit = top.name;
                  isTopicMatch = true;
                  break;
                }
              }
              if (isSubjMatch || isTopicMatch) {
                resolvedSubject = subj.name;
                break;
              }
            }
          }

          if (!resolvedSubject) {
            resolvedSubject = bookObj?.subject || hw.subject || 'Genel Ders';
          }

          const testTitle = bt?.name || bt?.title || 'Kitap Testi';
          const qCount = Number(bt?.questionCount || bt?.question_count) || (bt?.answerKey ? Object.keys(bt.answerKey).filter(k => k !== '__meta' && k !== 'meta').length : 15);
          const diffDays = Math.max(1, Math.round((nowTime - dueTime) / (1000 * 60 * 60 * 24)));

          const candidateItem = {
            id: `catchup_bt_${hw.id}_${cleanTestId}`,
            testId: cleanTestId,
            bookTestId: cleanTestId,
            realTestId: cleanTestId,
            hwId: hw.id,
            bookId: hw.bookId || bookObj?.id,
            bookTitle: cleanBookTitle,
            title: testTitle,
            testName: testTitle,
            subject: resolvedSubject || 'Genel Ders',
            unitTopic: resolvedUnit,
            topic: resolvedUnit,
            categoryType: 'kitap',
            isCatchUp: true,
            isBookTask: true,
            dueDate: dStr,
            dueDateStr: due.toLocaleDateString('tr-TR'),
            time: `Son Teslim: ${due.toLocaleDateString('tr-TR')}`,
            reason: `${diffDays} gün geciken kitap ödevi`,
            daysOverdue: diffDays,
            questionCount: qCount,
            targetQuestionCount: qCount
          };

          if (isItemSolved(candidateItem)) return;

          const isSolvedInSubs = (studentSubmissions || submissions || []).some(s => {
            if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
            return isSubmissionMatchingBookTest(s, candidateItem, bookTests, books);
          });
          if (isSolvedInSubs) return;

          if (isTaskDismissed(candidateItem)) return;

          if (!isAlreadySeen(candidateItem)) {
            addKeysToSeen(candidateItem);
            list.push(candidateItem);
          }
        });
      } else {
        const hwDueDate = hw.dueDate || hw.due_date || hw.raw_data?.dueDate || hw.raw_data?.due_date;
        if (!hwDueDate) return;
        const due = new Date(hwDueDate);
        const dueTime = due.getTime();
        const dueYMD = String(hwDueDate).slice(0, 10);
        const isOverdue = (todayYMD && dueYMD && dueYMD < todayYMD) || (!isNaN(dueTime) && dueTime < nowTime);
        if (!isOverdue) return;

        const diffDays = Math.max(1, Math.round((nowTime - dueTime) / (1000 * 60 * 60 * 24)));
        const hwCandidate = {
          id: `catchup_hw_${hw.id}`,
          hwId: hw.id,
          testId: hw.id,
          realTestId: hw.id,
          title: hw.title || 'Ödev',
          testName: hw.title || 'Ödev',
          subject: hw.subject || 'Genel Ders',
          categoryType: 'ödev',
          isCatchUp: true,
          dueDate: hwDueDate,
          dueDateStr: due.toLocaleDateString('tr-TR'),
          time: `Son Teslim: ${due.toLocaleDateString('tr-TR')}`,
          reason: `${diffDays} gün geciken ödev`,
          daysOverdue: diffDays
        };

        if (isItemSolved(hwCandidate)) return;
        if (isTaskDismissed(hwCandidate)) return;

        const isSubmitted = (studentSubmissions || submissions || []).some(s => {
          if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
          const sHwId = String(s.hwId || s.homeworkId || s.homework_id || s.testId || '');
          return sHwId === String(hw.id) || toUUID(sHwId) === toUUID(hw.id);
        });
        if (isSubmitted) return;

        if (!isAlreadySeen(hwCandidate)) {
          addKeysToSeen(hwCandidate);
          list.push(hwCandidate);
        }
      }
    });

    return sortItemsByBookOrder(list, books, bookTests);
  }, [selectedStudent, fullProcessedWeekMap, todayDayKey, isTaskDismissed, isItemSolved, books, bookTests, curData, homeworks, studentSubmissions, submissions]);

  // ── 📱 3 AYRI ANDROID ANA EKRAN WIDGET SENKRONİZASYONU ──
  useEffect(() => {
    if (!selectedStudent?.id) return;
    if (!window?.Capacitor?.isNativePlatform?.()) return;
    try {
      // 1. 7-Day Program with day switching support
      const daysList = (DAYS_OF_WEEK || []).map(d => {
        const dData = fullProcessedWeekMap[d.key];
        const dayItems = (dData?.items || []).map(item => ({
          id: item.id || item.testId || item.uniqueKey,
          testId: item.testId || item.bookTestId || item.realTestId || item.id,
          title: item.title || item.testName || item.name || 'Test',
          subject: item.subject || item.subjectName || '',
          page: item.page || (item.startPage && item.endPage ? `${item.startPage}-${item.endPage}` : ''),
          isDone: Boolean(item.done || item.isCompleted || (typeof isItemSolved === 'function' && isItemSolved(item)))
        }));
        return {
          dayKey: d.key,
          dayName: d.name,
          dateLabel: dData?.dateLabel || d.short,
          isToday: d.key === todayDayKey,
          totalCount: dayItems.length,
          remainingCount: dayItems.filter(i => !i.isDone).length,
          items: dayItems
        };
      });

      const todayData = fullProcessedWeekMap[todayDayKey] || dayProgramInfo;
      const todayTasks = (todayData?.items || []).map(item => ({
        id: item.id || item.testId || item.uniqueKey,
        testId: item.testId || item.bookTestId || item.realTestId || item.id,
        title: item.title || item.testName || item.name || 'Test',
        subject: item.subject || item.subjectName || '',
        page: item.page || (item.startPage && item.endPage ? `${item.startPage}-${item.endPage}` : ''),
        isDone: Boolean(item.done || item.isCompleted || (typeof isItemSolved === 'function' && isItemSolved(item)))
      }));

      // 2. Active Books Progress with exact D, Y, B, Net, Success %, Progress % and subjects breakdown
      const booksProgress = (assignedBooksList || []).map(b => ({
        id: b.id,
        title: b.title,
        publisher: b.publisher || 'Özel / MEB Yayınları',
        solvedTests: b.totalSolvedTests || 0,
        totalTests: b.totalBookTests || 0,
        percent: b.progressPct || 0,
        totalCorrect: b.totalCorrect || 0,
        totalWrong: b.totalWrong || 0,
        totalBlank: b.totalBlank || 0,
        net: Math.max(0, Number(((b.totalCorrect || 0) - ((b.totalWrong || 0) / 4)).toFixed(1))),
        successRate: b.successRate || 0,
        subjectsBreakdown: ''
      }));

      syncWidgetData({
        studentName: selectedStudent?.name || 'Öğrenci',
        days: daysList,
        todayTasks: todayTasks,
        booksProgress: booksProgress,
        catchUpTasks: catchUpTasks || [],
        todayTotalCount: todayData?.totalCount || todayTasks.length,
        todayRemainingCount: todayTasks.filter(t => !t.isDone).length
      });
    } catch (err) {
      console.debug('Widget sync error:', err);
    }
  }, [selectedStudent?.id, selectedStudent?.name, fullProcessedWeekMap, todayDayKey, dayProgramInfo, books, bookTests, studentSubmissions, catchUpTasks, isItemSolved]);

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

  const handleAddScheduleTask = async (newItem, targetDayKey) => {
    try {
      const dayToUse = targetDayKey || activeDayKey || 'Pzt';
      const profile = coachingProfile || getCoachingProfileForStudent(selectedStudent?.id) || { studentId: selectedStudent?.id, weeklyProgram: [] };
      const rawWeekly = normalizeWeeklyProgram(profile.weeklyProgram);

      const updatedWeeklyProgram = rawWeekly.map(dayRow => {
        if (dayRow.day === dayToUse) {
          return {
            ...dayRow,
            items: [...(dayRow.items || []), newItem]
          };
        }
        return dayRow;
      });

      await saveCoachingProfile({
        ...profile,
        studentId: selectedStudent?.id,
        weeklyProgram: updatedWeeklyProgram
      });

      refreshCoaching?.(true);
      refreshSchedules?.(true);
    } catch (e) {
      console.error('Error adding schedule task from dashboard:', e);
    }
  };

  const handleTaskAction = useCallback((task) => {
    if (!task) return;
    if (task.roadmapAssignmentId) {
      navigate(`/student/study-plan/${task.roadmapAssignmentId}`, { state: { from: '/student' } });
      return;
    }
    
    if (task.type === 'remedialTest' || task.taskType === 'remedial' || task.isRemedial || task.isTeacherRemedial) {
      const testTargetId = task.testId || task.realTestId || task.id;
      if (task.done) {
        navigate(`/quiz-review/${testTargetId}?studentId=${selectedStudent?.id}`, { state: { from: '/student' } });
        return;
      }
      const lockStatus = getRemedialLockStatus(task, null, submissions, selectedStudent?.id);
      if (lockStatus.isLocked) {
        alert(lockStatus.lockMessage);
        return;
      }
      navigate(`/quiz/${testTargetId}?studentId=${selectedStudent?.id}&retake=true&mode=solve`, { state: { from: '/student', retake: true, mode: 'solve' } });
      return;
    }

    if (task.done) {
      const reviewTargetId = task.bookTestId || task.testId || task.realTestId || task.hwId || task.id;
      if (reviewTargetId) {
        navigate(`/quiz-review/${reviewTargetId}?studentId=${selectedStudent?.id}`, { state: { from: '/student' } });
        return;
      }
    }

    const hwObj = (homeworks || []).find(h => String(h.id) === String(task.hwId || task.id));
    const matchingBook = books?.find(b => String(b.id) === String(hwObj?.bookId || task.bookId));
    const isExam = task.isExamTask || task.taskType === 'deneme' || task.type === 'physicalExam' || hwObj?.type === 'physicalExam' || hwObj?.contentType === 'physicalExam' || matchingBook?.bookType === 'exam' || hwObj?.isPhysical;
    
    if (isExam) {
      navigate(`/physical-exam/${task.hwId || task.realTestId || task.id}?studentId=${selectedStudent?.id}`, { state: { from: '/student' } });
      return;
    }

    const targetBookTestId = task.bookTestId || task.testId || task.realTestId ||
      (hwObj?.tests && hwObj.tests.length === 1 ? hwObj.tests[0] : null);

    if (targetBookTestId) {
      navigate(`/book-quiz/${targetBookTestId}?studentId=${selectedStudent?.id}`, { state: { from: '/student' } });
      return;
    }

    // Normal Homework Quiz
    const quizTargetId = task.realTestId || task.hwId || task.id || task.testId;
    if (quizTargetId) {
      navigate(`/quiz/${quizTargetId}?studentId=${selectedStudent?.id}`, { state: { from: '/student' } });
      return;
    }

    handleToggleTask(task);
  }, [books, homeworks, navigate, selectedStudent?.id, submissions, handleToggleTask]);

  const handleDeleteTask = async (task) => {
    if (!task) return;

    if (task === 'RESTORE_DISMISSED_CATCHUP') {
      setDismissedTaskKeys([]);
      try {
        localStorage.removeItem(`dismissed_tasks_${selectedStudent?.id || 'default'}`);
        localStorage.removeItem('dismissed_tasks_default');
      } catch {}
      return;
    }

    if (task === 'CLEAR_ALL_CATCHUP' || task.isClearAllCatchUp) {
      if (!window.confirm('Tüm telafi havuzundaki görevleri kaldırmak istediğinize emin misiniz?')) return;
      const allKeys = [];
      catchUpTasks.forEach(t => {
        const testId = t.testId || t.bookTestId || t.realTestId;
        allKeys.push(
          String(t.id || ''),
          String(t.uniqueKey || ''),
          testId ? `book_due_${t.bookId || t.hwId}_${testId}` : null,
          testId ? `dismiss_${testId}` : null
        );
      });
      setDismissedTaskKeys(prev => {
        const next = Array.from(new Set([...prev, ...allKeys.filter(Boolean)]));
        try {
          localStorage.setItem(`dismissed_tasks_${selectedStudent?.id || 'default'}`, JSON.stringify(next));
        } catch {}
        return next;
      });
      return;
    }

    const taskTitle = task.testName || task.title || 'görev';
    if (!window.confirm(`"${taskTitle}" görevini telafi havuzundan kaldırmak istediğinize emin misiniz?`)) {
      return;
    }

    // 1. Optimistic Instant Dismissal from UI & LocalStorage
    const testId = task.testId || task.bookTestId || task.realTestId;
    const keysToAdd = [
      String(task.id || ''),
      String(task.uniqueKey || ''),
      testId ? `book_due_${task.bookId || task.hwId}_${testId}` : null,
      testId ? `dismiss_${testId}` : null
    ].filter(Boolean);

    setDismissedTaskKeys(prev => {
      const next = Array.from(new Set([...prev, ...keysToAdd]));
      try {
        localStorage.setItem(`dismissed_tasks_${selectedStudent?.id || 'default'}`, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Database cleanup
    try {
      const targetHwId = task.hwId || (task.id && String(task.id).startsWith('hw_') ? String(task.id).replace(/^hw_/, '') : null);
      if (targetHwId && typeof deleteHomework === 'function') {
        await deleteHomework(targetHwId);
      } else if (task.id && typeof deleteHomework === 'function') {
        await deleteHomework(task.id);
      }

      // If test has due date inside any homework, delete the date from homework
      if (task.testId && Array.isArray(homeworks)) {
        const matchingHws = homeworks.filter(h => h.testDueDates?.[task.testId] || h.scheduleDates?.[task.testId]);
        for (const mHw of matchingHws) {
          const newTestDueDates = { ...mHw.testDueDates };
          delete newTestDueDates[task.testId];
          const newScheduleDates = { ...mHw.scheduleDates };
          delete newScheduleDates[task.testId];
          if (typeof updateHomework === 'function') {
            await updateHomework(mHw.id, {
              ...mHw,
              testDueDates: newTestDueDates,
              scheduleDates: newScheduleDates
            });
          }
        }
      }

      if (task.isScheduleContextItem && typeof deleteSchedule === 'function') {
        await deleteSchedule(task.id);
      }

      if (coachingProfile && Array.isArray(coachingProfile.weeklyProgram)) {
        let modified = false;
        const updated = coachingProfile.weeklyProgram.map(dayRow => {
          const filtered = (dayRow.items || []).filter(item => 
            item.id !== task.id && 
            item.id !== task.hwId && 
            item.hwId !== task.hwId &&
            item.testId !== task.testId
          );
          if (filtered.length !== (dayRow.items || []).length) modified = true;
          return { ...dayRow, items: filtered };
        });
        if (modified && typeof saveCoachingProfile === 'function') {
          await saveCoachingProfile({
            ...coachingProfile,
            studentId: selectedStudent.id,
            weeklyProgram: updated
          });
        }
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const weekTasksCountMap = useMemo(() => {
    const map = {};
    DAYS_OF_WEEK.forEach(d => {
      map[d.key] = fullProcessedWeekMap[d.key]?.totalCount || 0;
    });
    return map;
  }, [fullProcessedWeekMap]);

  /* ─── Hero Date & Task Stats for Top KPI Cards (Program + Ödevler) ─── */
  const taskStats = useMemo(() => {
    let totalCount = 0;
    let completedCount = 0;
    let overdueCount = 0;
    let pendingCount = 0;
    const seenKeys = new Set();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 1. Program Görevleri (Aktif Günün Programı)
    const programItems = dayProgramInfo?.items || [];

    programItems.forEach(item => {
      const itemKey = String(item.uniqueKey || item.id || item.hwId || `${item.testId}_${item.dayKey || ''}`);
      if (seenKeys.has(itemKey)) return;
      seenKeys.add(itemKey);

      totalCount++;
      if (item.done) {
        completedCount++;
      } else if (item.isOverdue) {
        overdueCount++;
      } else {
        pendingCount++;
      }
    });

    // 2. Ödevler (Tüm Atanmış Ödev Testleri)
    (tests || []).forEach(t => {
      const hwKey = String(t.id || t.hwId || t.testId || '');
      const hwCleanKey = hwKey.replace(/^hw_/, '');
      // O(1) Set lookup — avoids expensive Array.from().some() O(n²) conversion
      if (seenKeys.has(hwKey) || seenKeys.has(hwCleanKey)) return;
      seenKeys.add(hwKey);

      totalCount++;
      const isDone = t.status === 'Sonuçlandı' || t.status === 'Tamamlandı';
      if (isDone) {
        completedCount++;
      } else {
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
      overdueCount: Math.max(overdueCount, catchUpTasks.length),
      completionRate
    };
  }, [dayProgramInfo, tests, catchUpTasks.length]);

  
  const studentGamification = useMemo(() => {
    if (!selectedStudent) return null;
    return computeStudentGamificationData({
      studentId: selectedStudent.id,
      submissions: studentSubmissions,
      homeworks,
      books,
      bookTests,
      mockExams: studentMockExams,
      studySessions: [],
      resolvedAnalytics: { generalTrialExams, otherHomeworkSubmissions }
    });
  }, [selectedStudent, studentSubmissions, homeworks, books, bookTests, studentMockExams, generalTrialExams, otherHomeworkSubmissions]);

  const studentRank = studentGamification?.levelInfo || {
    level: 1,
    title: 'Acemi',
    icon: '🥉',
    bgGradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#6366f1'
  };

  const completedCount = taskStats.completedCount;
  const overdueCount = taskStats.overdueCount;
  const pendingCount = taskStats.pendingCount;
  const gradeLabel = curData?.grades?.find(g => g.id === selectedStudent?.gradeId)?.name || '';
  const avatarColor = avatarColors[studentMembers.findIndex(s => s.id === selectedStudent?.id) % avatarColors.length] || '#6366f1';
  const todayStr = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  const studentStreak = studentGamification?.stats?.dailyStreak || studentGamification?.streakTierInfo?.streak || 0;
  const streakMultiplier = studentGamification?.streakTierInfo?.multiplier || 1.0;

  const dailyGoalProgress = useMemo(() => {
    const total = dayProgramInfo?.totalCount || 0;
    const completed = dayProgramInfo?.completedCount || 0;
    const remedial = catchUpTasks?.length || 0;

    if (total > 0) {
      const pct = Math.min(100, Math.round((completed / total) * 100));
      return {
        pct,
        completed,
        total,
        isAllDone: completed >= total && remedial === 0,
        label: `${completed}/${total} Görev`
      };
    }

    if (remedial === 0) {
      return {
        pct: 100,
        completed: 0,
        total: 0,
        isAllDone: true,
        label: 'Tümü Tamam'
      };
    }

    return {
      pct: 0,
      completed: 0,
      total: remedial,
      isAllDone: false,
      label: `${remedial} Telafi Bekliyor`
    };
  }, [dayProgramInfo?.totalCount, dayProgramInfo?.completedCount, catchUpTasks?.length]);

  const solvedQuestionsStats = useMemo(() => {
    if (!selectedStudent) return { today: 0, thisWeek: 0, thisMonth: 0, total: 0 };

    // Standart Türkiye Saati (UTC+3) Tarih Aralıkları
    const todayYMD = getTurkeyToday();
    const { startYMD: weekStartYMD, endYMD: weekEndYMD } = getTurkeyWeekRange();
    const { startYMD: monthStartYMD, endYMD: monthEndYMD } = getTurkeyMonthRange();

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let totalCount = 0;

    const countedSubIds = new Set();

    // 1. Student's Evaluation Submissions
    (studentSubmissions || []).forEach(s => {
      if (!s || s.status === 'in_progress' || s.status === 'draft') return;
      const isManualTest = s.isManual === true || s.sourceType === 'manual_test' || String(s.id || '').startsWith('sub_manual') || String(s.testId || '').startsWith('sub_manual');
      if (isManualTest) {
        const isApproved = s.approvalStatus === 'approved' || s.isApproved === true || s.status === 'completed';
        if (!isApproved) return;
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

      if (qCount <= 0) qCount = 12;

      const dateStr = s.submittedAt || s.completedAt || s.createdAt || s.date;
      const subYMD = getTurkeyYMD(dateStr);

      totalCount += qCount;

      if (subYMD) {
        if (subYMD === todayYMD) todayCount += qCount;
        if (subYMD >= weekStartYMD && subYMD <= weekEndYMD) weekCount += qCount;
        if (subYMD >= monthStartYMD && subYMD <= monthEndYMD) monthCount += qCount;
      }
    });

    // 2. All Mock Exams (Deneme Sınavları)
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
        if (subYMD === todayYMD) todayCount += qCount;
        if (subYMD >= weekStartYMD && subYMD <= weekEndYMD) weekCount += qCount;
        if (subYMD >= monthStartYMD && subYMD <= monthEndYMD) monthCount += qCount;
      }
    });

    const profile = coachingProfile;
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
  }, [selectedStudent, studentSubmissions, studentMockExams, coachingProfile]);

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
    <SmartPullToRefresh onRefresh={handleDashboardRefresh}>
      <div className="student-dashboard-page" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
      {/* styles are in StudentDashboard.css */}
      {/* ══════════════════════════════════════════════════════
          PREMIUM VIBRANT HEADER
      ══════════════════════════════════════════════════════ */}
      <div style={{
        background: isDark
          ? 'linear-gradient(135deg, #07090e 0%, #0f172a 35%, #1e1b4b 70%, #312e81 100%)'
          : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4338ca 70%, #6366f1 100%)',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
        paddingBottom: isMobile ? '2.2rem' : '3.2rem'
      }}>
        {/* Decorative subtle ambient glows */}
        <div style={{ position:'absolute', top: -80, right: isMobile ? -60 : 60, width: isMobile ? 220 : 380, height: isMobile ? 220 : 380, borderRadius:'50%', background:'radial-gradient(circle, rgba(196,91,253,0.18) 0%, transparent 68%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom: -60, left: '15%', width: 260, height: 260, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top: '10%', left: isMobile ? -40 : 0, width: 160, height: 160, borderRadius:'50%', background:'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)', pointerEvents:'none' }} />

        {/* Top glowing line */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, transparent 0%, rgba(196,91,253,0.8) 30%, rgba(99,102,241,0.9) 55%, rgba(196,91,253,0.8) 75%, transparent 100%)', pointerEvents:'none' }} />

        {/* ── Profil Satırı ── */}
        <div style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: isMobile ? '1rem 0.85rem 0.75rem' : '1.5rem clamp(1rem, 2vw, 2rem) 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '0.75rem' : '1.5rem',
          position: 'relative',
          zIndex: 1,
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* SOL: Avatar + İsim + Rozetler */}
          <div style={{ display:'flex', alignItems:'center', gap: isMobile ? '0.75rem' : '1.25rem', minWidth: 0, flex: 1 }}>

            {/* Avatar with circular progress ring & streak badges */}
            <div style={{
              position: 'relative',
              flexShrink: 0,
              width: isMobile ? 66 : 82,
              height: isMobile ? 66 : 82,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Circular Progress SVG Ring */}
              <svg
                width={isMobile ? 66 : 82}
                height={isMobile ? 66 : 82}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
              >
                <defs>
                  <linearGradient id="avatarProgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    {dailyGoalProgress.isAllDone ? (
                      <>
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#34d399" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="50%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#f472b6" />
                      </>
                    )}
                  </linearGradient>
                </defs>
                {/* Background track circle */}
                <circle
                  cx={isMobile ? 33 : 41}
                  cy={isMobile ? 33 : 41}
                  r={isMobile ? 29 : 36.5}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.16)"
                  strokeWidth={isMobile ? 3.5 : 4.5}
                />
                {/* Animated circular progress circle */}
                <circle
                  cx={isMobile ? 33 : 41}
                  cy={isMobile ? 33 : 41}
                  r={isMobile ? 29 : 36.5}
                  fill="none"
                  stroke="url(#avatarProgGrad)"
                  strokeWidth={isMobile ? 3.5 : 4.5}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * (isMobile ? 29 : 36.5)}`}
                  strokeDashoffset={`${2 * Math.PI * (isMobile ? 29 : 36.5) * (1 - dailyGoalProgress.pct / 100)}`}
                  transform={`rotate(-90 ${isMobile ? 33 : 41} ${isMobile ? 33 : 41})`}
                  style={{
                    transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: dailyGoalProgress.pct > 0 ? 'drop-shadow(0 0 4px rgba(192, 132, 252, 0.6))' : 'none'
                  }}
                />
              </svg>

              {/* Inner Avatar */}
              <div
                style={{
                  width: isMobile ? 52 : 64,
                  height: isMobile ? 52 : 64,
                  borderRadius: '50%',
                  background: studentRank.bgGradient || `linear-gradient(145deg, ${avatarColor}cc 0%, ${avatarColor} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '1.7rem' : '2.15rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  position: 'relative',
                  zIndex: 2,
                  boxShadow: `0 4px 16px ${studentRank.color || avatarColor}60`,
                  userSelect: 'none'
                }}
                title={`Rütbe: ${studentRank.title} (Lv. ${studentRank.level}) • Günlük İlerleme: %${dailyGoalProgress.pct}`}
              >
                <span>{studentRank.icon || '🛡️'}</span>
              </div>

              {/* Top-Left: Mini Streak Flame Badge on Avatar (if streak > 0) */}
              {studentStreak > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: -3,
                    left: -3,
                    zIndex: 5,
                    background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
                    color: '#ffffff',
                    border: '2px solid #ffffff',
                    borderRadius: 99,
                    padding: isMobile ? '1px 5px' : '1px 6px',
                    fontSize: isMobile ? '0.56rem' : '0.66rem',
                    fontWeight: 900,
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2
                  }}
                  title={`Günlük Kesintisiz Seri: ${studentStreak} Gün`}
                >
                  <span>🔥</span>
                  <span>{studentStreak}</span>
                </div>
              )}

              {/* Bottom-Right: Level (Lv) Badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  zIndex: 5,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  borderRadius: 99,
                  padding: isMobile ? '1px 5px' : '1px 7px',
                  fontSize: isMobile ? '0.56rem' : '0.66rem',
                  fontWeight: 900,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2
                }}
              >
                Lv.{studentRank.level}
              </div>

              {/* Bottom-Left: Daily Progress % Badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -2,
                  left: -2,
                  zIndex: 5,
                  background: dailyGoalProgress.isAllDone
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  borderRadius: 99,
                  padding: isMobile ? '1px 4px' : '1px 6px',
                  fontSize: isMobile ? '0.54rem' : '0.62rem',
                  fontWeight: 900,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2
                }}
                title={`Günün İlerlemesi: %${dailyGoalProgress.pct} (${dailyGoalProgress.label})`}
              >
                %{dailyGoalProgress.pct}
              </div>
            </div>

            {/* İsim + Rozetler */}
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{
                fontSize: isMobile ? '0.62rem' : '0.72rem',
                fontWeight: 800,
                color:'rgba(196,181,253,0.95)',
                textTransform:'uppercase',
                letterSpacing:'0.12em',
                marginBottom: 2,
                display:'flex', alignItems:'center', gap:5
              }}>
                <span style={{ opacity:0.85 }}>HOŞ GELDİN</span>
                <span>👏</span>
              </div>

              <h1 style={{
                fontSize: isMobile ? '1.2rem' : '1.75rem',
                fontWeight: 900,
                color:'#ffffff',
                margin:'0 0 4px 0',
                lineHeight:1.15,
                letterSpacing:'-0.025em',
                textShadow:'0 3px 18px rgba(0,0,0,0.35)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
              }}>
                {selectedStudent?.name || 'Öğrenci'}
              </h1>

              {/* Pill badges */}
              <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                {/* Günlük Kesintisiz Seri Rozeti */}
                <div
                  style={{
                    background: studentStreak > 0
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(239, 68, 68, 0.22))'
                      : 'rgba(255,255,255,0.1)',
                    border: studentStreak > 0
                      ? '1.5px solid rgba(245, 158, 11, 0.6)'
                      : '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 999,
                    padding: isMobile ? '2px 8px' : '4px 12px',
                    fontSize: isMobile ? '0.64rem' : '0.76rem',
                    fontWeight: 900,
                    color: studentStreak > 0 ? '#fef08a' : 'rgba(255,255,255,0.85)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: studentStreak > 0 ? '0 2px 10px rgba(245, 158, 11, 0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
                    backdropFilter: 'blur(16px)'
                  }}
                  title="Günlük Kesintisiz Seri"
                >
                  <Flame size={isMobile ? 12 : 14} style={{ color: studentStreak > 0 ? '#f59e0b' : '#94a3b8' }} />
                  <span>{studentStreak > 0 ? `${studentStreak} Gün Seri` : 'Seri: 0 Gün'}</span>
                  {streakMultiplier > 1.0 && (
                    <span style={{ fontSize: '0.6rem', background: '#f59e0b', color: '#ffffff', padding: '0 4px', borderRadius: 4, fontWeight: 900 }}>
                      {streakMultiplier}x
                    </span>
                  )}
                </div>

                {/* Günlük İlerleme Rozeti */}
                <div
                  style={{
                    background: dailyGoalProgress.isAllDone
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.25))'
                      : 'rgba(255,255,255,0.12)',
                    border: dailyGoalProgress.isAllDone
                      ? '1.5px solid rgba(16, 185, 129, 0.6)'
                      : '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 999,
                    padding: isMobile ? '2px 8px' : '4px 12px',
                    fontSize: isMobile ? '0.64rem' : '0.76rem',
                    fontWeight: 900,
                    color: dailyProgress.isAllDone ? '#a7f3d0' : 'rgba(255,255,255,0.95)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: dailyProgress.isAllDone ? '0 2px 10px rgba(16, 185, 129, 0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
                    backdropFilter: 'blur(16px)'
                  }}
                  title={`Günün Görev İlerlemesi: %${dailyGoalProgress.pct} (${dailyGoalProgress.label})`}
                >
                  <span>{dailyGoalProgress.isAllDone ? '🎯' : '⏳'}</span>
                  <span>%{dailyGoalProgress.pct} Günlük Hedef</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/study-room')}
                  className="sd-btn"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: '1.5px solid rgba(255,255,255,0.35)',
                    borderRadius: 999,
                    padding: isMobile ? '2px 9px' : '4px 14px',
                    fontSize: isMobile ? '0.64rem' : '0.78rem',
                    fontWeight: 900,
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    boxShadow: '0 3px 12px rgba(16,185,129,0.4)',
                    textDecoration: 'none'
                  }}
                  title="Çalışma Odasını Aç"
                >
                  <Headphones size={isMobile ? 12 : 14} />
                  <span>Çalışma Odası</span>
                </button>
                <div style={{
                  background:'rgba(255,255,255,0.12)',
                  backdropFilter:'blur(16px)',
                  border:'1px solid rgba(255,255,255,0.25)',
                  borderRadius:999,
                  padding: isMobile ? '2px 7px' : '5px 15px',
                  fontSize: isMobile ? '0.62rem' : '0.78rem',
                  fontWeight:700, color:'rgba(255,255,255,0.95)',
                  display:'inline-flex', alignItems:'center', gap:4,
                  boxShadow:'0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  <span>🗓</span><span>{heroDateStr}</span>
                </div>
                {Boolean(gradeLabel) && (
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter:'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius:999,
                    padding: isMobile ? '2px 7px' : '5px 15px',
                    fontSize: isMobile ? '0.62rem' : '0.78rem',
                    fontWeight:800,
                    color: 'rgba(255,255,255,0.9)',
                    display:'inline-flex', alignItems:'center', gap:4,
                    boxShadow:'0 2px 8px rgba(0,0,0,0.15)'
                  }}>
                    <span>🎓</span><span>{gradeLabel}</span>
                  </div>
                )}
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
              width: isMobile ? 64 : 80,
              height: isMobile ? 64 : 80,
              position:'relative',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <svg width={isMobile ? 64 : 80} height={isMobile ? 64 : 80} style={{ position:'absolute', inset:0 }}>
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#67e8f9" />
                  </linearGradient>
                </defs>
                <circle
                  cx={isMobile ? 32 : 40} cy={isMobile ? 32 : 40}
                  r={isMobile ? 26 : 33}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={isMobile ? 4 : 5}
                />
                <circle
                  cx={isMobile ? 32 : 40} cy={isMobile ? 32 : 40}
                  r={isMobile ? 26 : 33}
                  fill="none"
                  stroke="url(#ringGrad)"
                  strokeWidth={isMobile ? 4 : 5}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * (isMobile ? 26 : 33)}`}
                  strokeDashoffset={`${2 * Math.PI * (isMobile ? 26 : 33) * (1 - overallSuccessRate / 100)}`}
                  transform={`rotate(-90 ${isMobile ? 32 : 40} ${isMobile ? 32 : 40})`}
                  style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                />
              </svg>
              <div style={{
                width: isMobile ? 48 : 62,
                height: isMobile ? 48 : 62,
                borderRadius:'50%',
                background:'rgba(255,255,255,0.1)',
                backdropFilter:'blur(12px)',
                border:'1.5px solid rgba(255,255,255,0.22)',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                boxShadow:'0 6px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)'
              }}>
                <div style={{ fontSize: isMobile ? '0.94rem' : '1.25rem', fontWeight:900, color:'#fff', lineHeight:1, letterSpacing:'-0.03em' }}>
                  %{overallSuccessRate}
                </div>
                <div style={{ fontSize: isMobile ? '0.42rem' : '0.56rem', fontWeight:900, color:'rgba(196,181,253,0.9)', letterSpacing:'0.08em', marginTop:2, textTransform:'uppercase' }}>
                  BAŞARI
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Selector */}
        {currentUser?.role !== 'student' && studentMembers.length > 1 && (
          <div style={{ maxWidth:1440, margin:'0 auto', padding: isMobile ? '0 0.85rem 0.5rem' : '0 2.5rem 0.5rem', display:'flex', alignItems:'center', gap:8, position:'relative', zIndex:1, width:'100%', boxSizing:'border-box' }}>
            <span style={{ fontSize:'0.72rem', fontWeight:800, color:'#fde68a', whiteSpace:'nowrap' }}>👁️ Öğrenci:</span>
            <select
              value={selectedStudent?.id || ''}
              onChange={e => {
                const s = studentMembers.find(st => String(st.id) === String(e.target.value));
                if (s) {
                  setSelectedStudent(s);
                  try { localStorage.setItem('etest_selected_student_id', s.id); } catch {}
                }
              }}
              style={{ background:'rgba(15,23,42,0.85)', color:'white', border:'1px solid rgba(255,255,255,0.25)', borderRadius:10, padding:'0.35rem 0.65rem', fontSize:'0.76rem', fontWeight:700, backdropFilter:'blur(8px)', flex: 1, minWidth: 0 }}
            >
              {studentMembers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className || 'Sınıf'})</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── KPI Kartları — yarısı header'a biner, yarısı içeriğe taşar (Overlap) ── */}
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: isMobile ? '0 0.65rem' : '0 clamp(1rem, 2.5vw, 2.5rem)',
        marginTop: isMobile ? '-26px' : '-34px',
        position: 'relative',
        zIndex: 10,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(5, minmax(0, 1fr))' : 'repeat(5, 1fr)',
          gap: isMobile ? '0.25rem' : '0.75rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {[
            { label:'TOPLAM',     value: taskStats.totalCount,           emoji:'📋', grad:'linear-gradient(160deg,#4f46e5,#3730a3)',  glow:'rgba(79,70,229,0.4)',   route:'/student/homeworks' },
            { label:'TAMAMLANDI', value: taskStats.completedCount,       emoji:'✅', grad:'linear-gradient(160deg,#059669,#047857)',   glow:'rgba(16,185,129,0.4)',  route:'/student/results' },
            { label:'BEKLİYOR',   value: taskStats.pendingCount,         emoji:'⏳', grad:'linear-gradient(160deg,#d97706,#b45309)',   glow:'rgba(245,158,11,0.4)',  route:'/student/homeworks' },
            { label:'GECİKTİ',   value: Math.max(taskStats.overdueCount, catchUpTasks.length), emoji:'🔥', grad:'linear-gradient(160deg,#e11d48,#be123c)',   glow:'rgba(239,68,68,0.4)',   route:'/student/homeworks' },
            { label:'TAMAMLANMA', value: `%${taskStats.completionRate}`, emoji:'🏆', grad:'linear-gradient(160deg,#7c3aed,#6d28d9)',  glow:'rgba(139,92,246,0.4)', route:'/student/results' },
          ].map((kpi) => (
            <div
              key={kpi.label}
              onClick={() => navigate(kpi.route)}
              className="sd-kpi"
              style={{
                background: kpi.grad,
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: isMobile ? 12 : 16,
                padding: isMobile ? '0.45rem 0.2rem' : '0.8rem 0.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                boxShadow: `0 8px 22px ${kpi.glow}, 0 1px 0 rgba(255,255,255,0.2) inset`,
                minHeight: isMobile ? 62 : 82,
                minWidth: 0,
                overflow: 'hidden'
              }}
            >
              <div style={{ fontSize: isMobile ? '0.85rem' : '1.25rem', lineHeight: 1, marginBottom: 3 }}>{kpi.emoji}</div>
              <div style={{
                fontSize: isMobile ? '1.05rem' : '1.65rem',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1.1,
                letterSpacing: '-0.03em'
              }}>
                {kpi.value}
              </div>
              <div style={{
                fontSize: isMobile ? '0.42rem' : '0.64rem',
                fontWeight: 900,
                color: 'rgba(255,255,255,0.92)',
                letterSpacing: isMobile ? '0.01em' : '0.06em',
                marginTop: 3,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}>
                {kpi.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          ANA İÇERİK — DENGELİ ORTA-AÇIK SLATE TEMASI
      ════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: isMobile ? '0.75rem 0.65rem 1.5rem' : '1.5rem clamp(1rem, 2.5vw, 2.5rem) 4rem', width: '100%', boxSizing: 'border-box' }}>




        {/* ════════════════════════════════════════════
            4. ANA GRID (SOL: GÜNÜN GÖREVLERİ & TAKVİM, ÖDEVLER & TESTLER | SAĞ: PERİYODİK ANALİZ, HEDEFLER & İLHAM)
        ════════════════════════════════════════════ */}
        <div className="sd-grid-layout">

          {/* ──── SOL KOLON: GÜNÜN GÖREVLERİ & TAKVİM, ÇALIŞMA, ÖDEVLER & TESTLER ──── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>

            {/* 🎯 BİRLEŞİK TAKVİM & GÜNÜN GÖREVLERİ KARTI */}
            <div
              className="sd-card"
              style={{
                padding: isMobile ? '0.75rem 0.5rem' : '1.35rem 1.6rem',
                borderRadius: 18,
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
              }}
            >
              {/* ── ÜST KISIM: HAFTALIK ÇALIŞMA & GÖREV TAKVİMİ ── */}
              <DashboardWeeklyCalendar
                isMobile={isMobile}
                isDark={isDark}
                daysOfWeek={DAYS_OF_WEEK}
                activeDayKey={activeDayKey}
                todayDayKey={todayDayKey}
                weekTasksCountMap={weekTasksCountMap}
                weekInfo={weekInfo}
                onSelectDay={setActiveDayKey}
                onAddTask={() => setIsAddTaskModalOpen(true)}
              />

              {/* ── BİRLEŞİK AYIRICI ÇİZGİ ── */}
              <div style={{
                height: 1,
                background: 'var(--color-border)',
                margin: isMobile ? '0.85rem 0' : '1.1rem 0'
              }} />

              {/* ── ALT KISIM: SEÇİLEN GÜNÜN GÖREVLERİ (BUGÜN NE YAPACAĞIM?) ── */}
              <DashboardTodayTasks
                isMobile={isMobile}
                isDark={isDark}
                activeDayConfig={DAYS_OF_WEEK.find(d => d.key === activeDayKey) || DAYS_OF_WEEK[0]}
                dayProgramInfo={dayProgramInfo}
                catchUpTasks={catchUpTasks}
                showAllDayTasks={showAllDayTasks}
                setShowAllDayTasks={setShowAllDayTasks}
                onToggleTask={handleToggleTask}
                onTaskClick={handleTaskAction}
                getRowTheme={getRowTheme}
                onAddTask={() => setIsAddTaskModalOpen(true)}
              />

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <Link to="/my-program" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Haftalık Programa Git <ChevronRight size={13} />
                </Link>
              </div>
            </div>

            {/* 📋 BÖLÜM 2: ÖDEVLERİM & GÖREV TAKİBİ */}
            {!focusModeOnly && (
              <>
                <DashboardHomeworksCard
                  isMobile={isMobile}
                  pendingCount={pendingCount}
                  pendingTasks={pendingTasks}
                  onHwClick={(task) => {
                    const hwObj = (homeworks || []).find(h => String(h.id) === String(task.hwId || task.id));
                    const matchingBook = books?.find(b => String(b.id) === String(hwObj?.bookId));
                    const isExam = hwObj?.type === 'physicalExam' || hwObj?.contentType === 'physicalExam' || matchingBook?.bookType === 'exam' || hwObj?.isPhysical;
                    const realTestId = task.realTestId || task.testId;
                    if (isExam) navigate(`/physical-exam/${task.hwId || task.id}?studentId=${selectedStudent.id}`);
                    else if (realTestId && realTestId !== (task.hwId || task.id)) navigate(`/quiz/${realTestId}?studentId=${selectedStudent.id}`);
                    else if (hwObj?.id) navigate(`/quiz/${hwObj.id}?studentId=${selectedStudent.id}`);
                    else navigate('/student/homeworks');
                  }}
                  getRowTheme={getRowTheme}
                />

                {/* 📖 BÖLÜM 3: KİTAPLARIM & İLERLEME HARİTASI */}
                <DashboardBooksCard
                  isMobile={isMobile}
                  isDark={isDark}
                  assignedBooksList={assignedBooksList}
                  onNavigateBooks={() => navigate('/student/books')}
                  onNavigateBookDetail={(id) => navigate(`/student/books/${id}`)}
                />

                {/* 🗺️ BÖLÜM 4: YOL HARİTAM & KONU TAKİBİ */}
                <DashboardRoadmapCard
                  isMobile={isMobile}
                  isDark={isDark}
                  personalRoadmap={personalRoadmap}
                  myRoadmaps={myRoadmaps}
                  onNavigateRoadmap={(id) => {
                    if (id === 'curriculum-roadmap') {
                      navigate('/my-program?tab=konular');
                    } else {
                      navigate(`/student/study-plan/${id}`);
                    }
                  }}
                />
              </>
            )}

            {focusModeOnly && (
              <div style={{
                textAlign: 'center',
                padding: '1.25rem 1rem',
                borderRadius: 16,
                background: 'var(--color-surface)',
                border: '1.5px dashed var(--color-border)',
                color: 'var(--color-text-muted)',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6
              }}>
                <span>🎯 <strong>Sade Odak Modu Etkin:</strong> Günlük görevlerinize odaklanmanız için diğer tüm bölümler gizlendi.</span>
                <button
                  type="button"
                  onClick={handleToggleFocusMode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    textDecoration: 'underline'
                  }}
                >
                  Tüm istatistik ve kütüphane panellerini göster
                </button>
              </div>
            )}
          </div>

          {/* ──── SAĞ KOLON: ANALİZLER, HEDEFLERİM & İLHAM ──── */}
          {!focusModeOnly && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>

              {/* 🎮 OYUNLAŞTIRMA & SEVİYE KARTI */}
              <StudentGamificationCard
                student={selectedStudent}
                submissions={studentSubmissions}
                homeworks={homeworks}
                books={books}
                bookTests={bookTests}
                mockExams={studentMockExams}
                studySessions={[]}
                users={users}
                gamificationData={studentGamification}
              />

              {/* 📊 BÖLÜM 1: PERİYODİK SORU & BAŞARI ANALİZİ (GÜNLÜK / HAFTALIK / AYLIK) */}
              <div>
                {isAnalyticsReady ? (
                  <Suspense fallback={<div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, fontSize: '0.85rem' }}>📊 Analiz yükleniyor…</div>}>
                    <PeriodicQuestionAnalytics
                      homeworkSubmissions={otherHomeworkSubmissions}
                      mockExams={generalTrialExams}
                      studentName={selectedStudent?.name || 'Öğrenci'}
                    />
                  </Suspense>
                ) : (
                  <div style={{ height: 180, borderRadius: '1.25rem', background: isDark ? 'rgba(30, 41, 59, 0.3)' : 'rgba(241, 245, 249, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, fontSize: '0.82rem' }}>
                    📊 Analiz hazırlanıyor…
                  </div>
                )}
              </div>

              {/* 🎯 BÖLÜM 2: HEDEF TAKİP PANOSU */}
              <DashboardGoalsCard
                isMobile={isMobile}
                goalTrackingData={goalTrackingData}
                solvedQuestionsStats={solvedQuestionsStats}
                onNavigateGoals={() => navigate('/goals')}
                onUpdateGoalProgress={updateGoalProgress}
                goalTypeThemes={GOAL_TYPE_THEMES}
              />

              {/* 📝 BÖLÜM 3: SON ÇÖZÜLEN TESTLER */}
              <DashboardRecentSolvedCard
                isMobile={isMobile}
                recentSolvedTests={recentSolvedTests}
                onOpenManualModal={() => setIsManualTestModalOpen(true)}
                onNavigateResults={() => navigate('/student/results')}
                onReviewTest={(test) => {
                  const targetId = test.testId || test.submissionId || test.id;
                  navigate(`/quiz-review/${targetId}?studentId=${selectedStudent?.id || ''}&submissionId=${test.submissionId || test.id || ''}`, {
                    state: { from: '/student' }
                  });
                }}
                selectedStudent={selectedStudent}
              />

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
          )}

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

      {/* Gelişmiş Görev Ekleme Modalı (Mobil Uyumlu & Akıllı) */}
      {isAddTaskModalOpen && (
        <AddTaskModal
          dayKey={activeDayKey}
          onAdd={handleAddScheduleTask}
          onClose={() => setIsAddTaskModalOpen(false)}
          topicPool={coachingProfile?.topicPool || []}
          isDark={isDark}
        />
      )}
    </div>
    </SmartPullToRefresh>
  );
}
