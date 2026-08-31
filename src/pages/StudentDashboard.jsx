import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
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
import { isHomeworkForStudent, sortItemsByBookOrder, computeStudentAnalyticsData, isSubmissionMatchingBookTest } from '../utils/testResolver';
import { normalizeUnifiedTest } from '../services/unifiedQuizAdapter';
import { getAllUnifiedStudentSubmissions } from '../services/unifiedResultAdapter';
import { checkIsAnswerCorrect, normalizeAnswerIndex } from '../utils/answerEvaluation';
import { isSectionOpenEnded, isQuestionOpenEnded } from '../components/quiz/utils/quizTypeDetector';
import { toUUID } from '../services/supabaseService';
import { getTurkeyYMD, getTurkeyToday, getTurkeyWeekRange, getTurkeyMonthRange } from '../utils/dateHelpers';
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
import { syncWidgetData } from '../services/widgetSyncService';

// Lazy-loaded: PeriodicQuestionAnalytics is large (40KB) and not needed on first paint
const PeriodicQuestionAnalytics = lazy(() => import('../components/PeriodicQuestionAnalytics'));

function computeUnifiedSubmissionStats(sub, hw, allQuestions = []) {
  if (!sub) return null;
  const isMultiSec = Boolean(
    hw?.isBulk ||
    hw?.type === 'multi' ||
    sub?.type === 'multi' ||
    (Array.isArray(hw?.sections) && hw.sections.length > 1) ||
    (Array.isArray(hw?.tests) && hw.tests.length > 1) ||
    (Array.isArray(hw?.items) && hw.items.length > 1) ||
    (sub?.sections && typeof sub.sections === 'object' && Object.keys(sub.sections).length > 1)
  );

  if (!isMultiSec) return null;

  try {
    const unifiedTest = normalizeUnifiedTest(hw || sub, allQuestions);
    const rawSections = unifiedTest.sections;
    if (!rawSections || rawSections.length === 0) return null;

    if (sub.isEvaluatedByTeacher && typeof sub.correctCount === 'number' && typeof sub.wrongCount === 'number') {
      const correct = Number(sub.correctCount);
      const wrong = Number(sub.wrongCount);
      const blank = Number(sub.blankCount ?? sub.emptyCount ?? 0);
      const total = Number(sub.totalQuestions || (correct + wrong + blank) || 27);
      const scorePct = sub.scorePercentage ?? sub.score ?? (total > 0 ? Math.round((correct / total) * 100) : 0);
      const rawNet = typeof sub.netScore === 'number' ? sub.netScore : Math.max(0, correct - (wrong * 0.25));
      const netScore = Number.isInteger(rawNet) ? rawNet : Number(rawNet.toFixed(2));
      return { total, correct, wrong, blank, pending: 0, scorePct, netScore };
    }

    const unifiedSub = normalizeUnifiedSubmission(sub, unifiedTest);
    const sectionAnswersMap = unifiedSub.sections || {};
    const teacherScores = sub.teacherScores || sub.scores || (sub.raw_data && (sub.raw_data.teacherScores || sub.raw_data.scores)) || {};

    let totalQuestions = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let pendingCount = 0;

    const secOffsets = [];
    let acc = 0;
    rawSections.forEach(s => {
      secOffsets.push(acc);
      acc += (s.qCount || s.questions?.length || s.resolvedQuestions?.length || 1);
    });

    rawSections.forEach((sec, sIdx) => {
      const sa = sectionAnswersMap[sec.id] ||
                 sectionAnswersMap[sIdx] ||
                 sectionAnswersMap[String(sIdx)] ||
                 (sec.title && sectionAnswersMap[sec.title]) ||
                 (sec.raw?.id && sectionAnswersMap[sec.raw.id]) ||
                 (sec.raw?.questionId && sectionAnswersMap[sec.raw.questionId]) ||
                 { answers: {}, openEndedText: {}, teacherScores: {} };

      const secQs = sec.questions || sec.resolvedQuestions || [];
      const count = sec.qCount || secQs.length || 1;
      const isSecOpenEnded = sec.type === 'open_ended' || isSectionOpenEnded(sec, hw);
      const secStart = secOffsets[sIdx] || 0;

      for (let i = 1; i <= count; i++) {
        totalQuestions++;
        const globalQNo = secStart + i;
        const qObj = secQs[i - 1] || {};
        const isQOE = isSecOpenEnded || isQuestionOpenEnded(qObj, sec, hw);

        const rawAnsItem = Array.isArray(sub?.answers)
          ? sub.answers.find(a =>
              (a.sectionId && (String(a.sectionId) === String(sec.id) || String(a.sectionId) === String(sec.raw?.id)) && Number(a.questionNoInSection) === i) ||
              Number(a.questionNo) === globalQNo ||
              (sIdx === 0 && Number(a.questionNo) === i)
            )
          : null;

        const teacherScore = teacherScores[sec.id]?.[i] ??
                             teacherScores[sIdx]?.[i] ??
                             sa.teacherScores?.[i] ??
                             sa.teacherScores?.[String(i)] ??
                             rawAnsItem?.score;

        if (isQOE) {
          const textVal = sa.openEndedText?.[i] ?? sa.openEndedText?.[String(i)] ?? rawAnsItem?.userAnswerText;
          const hasText = textVal && String(textVal).trim() !== '';

          const isExplicitEmpty = teacherScore === 'empty' || rawAnsItem?.score === 'empty' || rawAnsItem?.evalStatus === 'empty' || (rawAnsItem?.score === 0 && rawAnsItem?.isCorrect === null);
          const hasExplicitTeacherScore = !isExplicitEmpty && teacherScore !== undefined && teacherScore !== null && teacherScore !== 'empty';

          if (isExplicitEmpty) {
            blankCount++;
          } else if (hasExplicitTeacherScore) {
            if (Number(teacherScore) >= 5) correctCount++;
            else wrongCount++;
          } else if (rawAnsItem && (rawAnsItem.evaluatedByTeacher || rawAnsItem.evaluatedAt) && rawAnsItem.score !== undefined && rawAnsItem.score !== null) {
            if (Number(rawAnsItem.score) >= 5) correctCount++;
            else if (Number(rawAnsItem.score) > 0 || hasText) wrongCount++;
            else blankCount++;
          } else if (hasText) {
            pendingCount++;
          } else {
            blankCount++;
          }
        } else {
          // Multiple choice
          const rawAns = sa.answers?.[i] ?? sa.answers?.[String(i)] ?? rawAnsItem?.userAnswer;
          const u = normalizeAnswerIndex(rawAns);

          if (u === null && (!rawAnsItem || (rawAnsItem.userAnswer === null && !rawAnsItem.answer))) {
            blankCount++;
          } else if (rawAnsItem && typeof rawAnsItem.isCorrect === 'boolean') {
            if (rawAnsItem.isCorrect) correctCount++;
            else wrongCount++;
          } else if (u !== null) {
            let isCorr = checkIsAnswerCorrect(u, qObj.raw || qObj, sec.raw || sec, i);
            if (isCorr === false) wrongCount++;
            else correctCount++;
          } else {
            blankCount++;
          }
        }
      }
    });

    const totalScored = correctCount + wrongCount + blankCount;
    const scorePct = totalScored > 0 ? Math.round((correctCount / totalScored) * 100) : 0;
    const rawNet = Math.max(0, correctCount - (wrongCount * 0.25));
    const netScore = Number.isInteger(rawNet) ? rawNet : Number(rawNet.toFixed(2));

    return {
      total: totalQuestions,
      correct: correctCount,
      wrong: wrongCount,
      blank: blankCount,
      pending: pendingCount,
      scorePct,
      netScore
    };
  } catch (err) {
    console.warn('computeUnifiedSubmissionStats error:', err);
    return null;
  }
}

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
  const { schedules, addSchedule, toggleScheduleDone, deleteSchedule } = useSchedule();
  const { currentUser } = useAuth();
  const { bookTests = [], books = [], refreshTrackedBooks } = useTrackedBooks() || {};
  const { getCoachingNoteForStudent, getMeetingsForStudent, getCoachingProfileForStudent, coachingLinks, saveCoachingProfile, getMockExamsForStudent } = useCoaching();

  // Background homework sync when opening the dashboard (only if stale)
  useEffect(() => {
    refreshHomeworks?.(false);
  }, []);

  const handleDashboardRefresh = async () => {
    await Promise.all([
      refreshHomeworks?.(true),
      refreshTrackedBooks?.(true),
      syncFromSupabase?.(false, true)
    ]);
  };

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  // Active Selected Day in Week Navigator (defaults to Today)
  const currentDayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
  const todayDayKey = currentDayIndex === 0 ? 'Paz' : DAYS_OF_WEEK[currentDayIndex - 1].key;
  const [activeDayKey, setActiveDayKey] = useState(todayDayKey);
  const [showAllDayTasks, setShowAllDayTasks] = useState(false);

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  
  // Synchronous, instant cache-first student initialization (0ms initial render)
  const [selectedStudent, setSelectedStudent] = useState(() => {
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

  const [dismissedTaskKeys, setDismissedTaskKeys] = useState(() => {
    try {
      const stored = localStorage.getItem(`dismissed_tasks_${selectedStudent?.id || 'default'}`);
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

  useEffect(() => {
    if (selectedStudent?.id) {
      try {
        localStorage.setItem('etest_selected_student_id', selectedStudent.id);
        localStorage.setItem('etest_selected_student_obj', JSON.stringify(selectedStudent));
        const stored = localStorage.getItem(`dismissed_tasks_${selectedStudent.id}`);
        if (stored) setDismissedTaskKeys(JSON.parse(stored));
      } catch {}
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (currentUser?.role === 'student') {
      setSelectedStudent(currentUser);
    } else if (studentMembers.length > 0) {
      const savedStudentId = localStorage.getItem('etest_selected_student_id');
      const found = studentMembers.find(s => String(s.id) === String(savedStudentId));
      if (found) {
        setSelectedStudent(found);
      } else if (!selectedStudent) {
        setSelectedStudent(studentMembers[0]);
      }
    }
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

  const studentId = selectedStudent?.id;

  const coachingNote = useMemo(
    () => getCoachingNoteForStudent(studentId),
    [studentId, getCoachingNoteForStudent]
  );
  const coachingProfile = useMemo(
    () => getCoachingProfileForStudent(studentId),
    [studentId, getCoachingProfileForStudent]
  );
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
    (homeworks || []).forEach(hw => {
      const hwSubs = hw.submissions || hw.raw_data?.submissions || [];
      (hwSubs || []).forEach(sub => {
        if (sub && isMatch(sub)) {
          if (!list.some(x => (x.id && x.id === sub.id) || (x.test_id && (x.test_id === sub.testId || x.test_id === sub.bookTestId)))) {
            list.push(sub);
          }
        }
      });
    });
    return list;
  }, [submissions, homeworks, selectedStudent]);

  // ── Fast O(1) Solved Tests Set for Student (with comprehensive ID & Content matching) ──
  // ── Fast O(1) Solved Tests Set for Student (with precise ID & Content matching) ──
  const studentSolvedSet = useMemo(() => {
    const set = new Set();
    const normalizeKey = (str) => String(str || '')
      .toLowerCase()
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/[^a-z0-9ğüşıöç]/g, '')
      .trim();

    // Include submissions from both studentSubmissions and homeworks.submissions
    const allStudentSubs = [...(studentSubmissions || [])];
    (homeworks || []).forEach(hw => {
      const hwSubs = hw.submissions || hw.raw_data?.submissions || [];
      (hwSubs || []).forEach(sub => {
        if (sub && (String(sub.studentId) === String(selectedStudent?.id) || String(sub.student_id) === String(selectedStudent?.id) || String(sub.userId) === String(selectedStudent?.id) || (toUUID(sub.studentId) && toUUID(sub.studentId) === toUUID(selectedStudent?.id)))) {
          if (!allStudentSubs.some(x => x.id === sub.id)) {
            allStudentSubs.push(sub);
          }
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
      if (normTitle && normTitle.length >= 4) {
        if (sName === 'genel' || sName === 'geneltestler') {
          set.add(`genel_title_${normTitle}`);
        } else if (sName) {
          set.add(`subj_title_${sName}_${normTitle}`);
        }
      }

      // Composite Keys
      if (sName && tName) {
        set.add(`subj_test_${sName}_${tName}`);
        set.add(`title_${sName}_${tName}`);
      }
      if (bTitle && tName) {
        set.add(`book_test_${bTitle}_${tName}`);
      }
      if (bTitle && sName && tName) {
        set.add(`full_${bTitle}_${sName}_${tName}`);
      }
      if (bTitle && sName && uTopic && tName) {
        set.add(`full_${bTitle}_${sName}_${uTopic}_${tName}`);
      }
      if (bId && tName) {
        set.add(`bid_tname_${bId}_${tName}`);
      }
      if (bId && sName && tName) {
        set.add(`bid_subj_tname_${bId}_${sName}_${tName}`);
      }

      // Full specific title (preserving exact page/test numbers for unique names)
      const fullTitleStr = normalizeKey(s.title || s.testTitle || s.testName);
      if (fullTitleStr && fullTitleStr.length >= 8) {
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
    if (item.done || item.isCompleted) return true;
    const normalizeKey = (str) => String(str || '')
      .toLowerCase()
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/[^a-z0-9ğüşıöç]/g, '')
      .trim();

    const tId = item.testId || item.bookTestId || item.realTestId;
    const bId = item.bookId ? String(item.bookId) : '';
    const sName = normalizeKey(item.subject || item.subjectName);
    const bTitle = normalizeKey(item.bookTitle);
    const uTopic = normalizeKey(item.unitTopic || item.topicName || item.topic);
    const tName = normalizeKey(item.testName || item.title);

    const cleanTestTitle = (t) => {
      if (!t) return '';
      let str = String(t);
      if (str.includes('—')) str = str.split('—').pop();
      if (str.includes('›')) str = str.split('›').pop();
      return str.trim();
    };

    const rawItemTitle = item.title || item.testName || '';
    const cleanedItemTitle = cleanTestTitle(rawItemTitle);
    const normItemTitle = normalizeKey(cleanedItemTitle);

    if (normItemTitle) {
      if (studentSolvedSet.has(`genel_title_${normItemTitle}`)) {
        return true;
      }
      if (sName && studentSolvedSet.has(`subj_title_${sName}_${normItemTitle}`)) {
        return true;
      }
    }

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
      if (sName) {
        if (studentSolvedSet.has(`subj_tid_${sName}_${tidStr}`) ||
            studentSolvedSet.has(`subj_tid_${sName}_${tidClean}`) ||
            (tidUuid && studentSolvedSet.has(`subj_tid_${sName}_${tidUuid}`))) {
          return true;
        }
      }
      if (bId) {
        if (studentSolvedSet.has(`bid_tid_${bId}_${tidStr}`) ||
            studentSolvedSet.has(`bid_tid_${bId}_${tidClean}`)) {
          return true;
        }
      }
    }

    // 2. Composite matching
    if (bTitle && sName && uTopic && tName && studentSolvedSet.has(`full_${bTitle}_${sName}_${uTopic}_${tName}`)) return true;
    if (bTitle && sName && tName && studentSolvedSet.has(`full_${bTitle}_${sName}_${tName}`)) return true;
    if (sName && tName && studentSolvedSet.has(`subj_test_${sName}_${tName}`)) return true;
    if (bTitle && tName && studentSolvedSet.has(`book_test_${bTitle}_${tName}`)) return true;
    if (bId && tName && studentSolvedSet.has(`bid_tname_${bId}_${tName}`)) return true;
    if (bId && sName && tName && studentSolvedSet.has(`bid_subj_tname_${bId}_${sName}_${tName}`)) return true;
    if (sName && tName && studentSolvedSet.has(`title_${sName}_${tName}`)) return true;

    const itemFullNorm = normalizeKey(item.title || item.testName);
    if (itemFullNorm && itemFullNorm.length >= 8) {
      if (sName) {
        if (studentSolvedSet.has(`title_${sName}_${itemFullNorm}`)) return true;
        if (studentSolvedSet.has(`title_genel_${itemFullNorm}`)) return true;
        if (studentSolvedSet.has(`title_${itemFullNorm}`)) return true;
      } else {
        if (studentSolvedSet.has(`title_${itemFullNorm}`)) return true;
      }
    }

    // 3. Fallback using isSubmissionMatchingBookTest
    if (Array.isArray(studentSubmissions) && studentSubmissions.length > 0) {
      if (studentSubmissions.some(s => isSubmissionMatchingBookTest(s, item, bookTests, books))) {
        return true;
      }
    }

    return false;
  }, [studentSolvedSet, studentSubmissions, bookTests, books]);

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
        const specClean = specStr.replace(/^q_/, '').replace(/^bt_/, '').replace(/^tbt_/, '');
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
        return []; // Kitap ödevleri Kitaplarım'da takip edildiğinden gösterilmiyor
      }

      const sub = (hw.submissions || []).find(s => isMatchHwSub(s, hw, bookObj)) ||
        (studentSubmissions || []).find(s => isMatchHwSub(s, hw, bookObj));

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
      if (!hw.isBookAssignment && !hw.bookId && !hw.title?.includes('(Tüm Kitap Görevi)') && !hw.title?.includes('(Tüm Kitap)') && !hw.title?.includes('(Kendi Eklediğim)') && hw.sourceType !== 'trackedBook') return false;
      return isHomeworkForStudent(hw, selectedStudent, curData?.grades);
    });

    const bookMap = {};
    const getNormKey = (b) => `${String(b.title || '').trim().toLowerCase().replace(/\s+/g, ' ')}___${String(b.publisher || '').trim().toLowerCase().replace(/\s+/g, ' ')}`;

    // 1. Add all standard / tracked books
    (books || []).filter(b => b && b.bookType !== 'exam').forEach(b => {
      const normK = getNormKey(b);
      if (!bookMap[normK]) {
        bookMap[normK] = { ...b, assignedHomeworks: [] };
      }
    });

    // 2. Process books assigned via homeworks
    bookAssignments.forEach(hw => {
      let book = books.find(b => (String(b.id) === String(hw.bookId) || toUUID(b.id) === toUUID(hw.bookId)) && b.bookType !== 'exam');
      if (!book && hw.title) {
        book = books.find(b => b.bookType !== 'exam' && (hw.title.includes(b.title) || b.title.includes(hw.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim())));
      }
      if (!book && Array.isArray(hw.tests) && hw.tests.length > 0) {
        const matchedBt = bookTests.find(bt => hw.tests.includes(bt.id) || (toUUID(bt.id) && hw.tests.includes(toUUID(bt.id))));
        if (matchedBt) {
          book = books.find(b => (String(b.id) === String(matchedBt.bookId) || toUUID(b.id) === toUUID(matchedBt.bookId)) && b.bookType !== 'exam');
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
        const score = Number(s.score || s.computedScore || (s.correct_count ?? s.correctCount ?? s.correct ?? 0));
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

      const testsInBook = (bookTests || []).filter(bt => {
        const btBId = String(bt.bookId || bt.book_id || '');
        return btBId === bId || (bUuid && btBId === bUuid) || (toUUID(btBId) && toUUID(btBId) === bUuid);
      });

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
        const matchingSubs = allMatchingSubs.filter(s => isSubmissionMatchingBookTest(s, contextualTest, bookTests, books));
        let bestSub = null;
        if (matchingSubs.length > 0) {
          bestSub = matchingSubs.reduce((prev, curr) => {
            const pScore = Number(curr.score || (curr.correct_count ?? curr.correctCount ?? 0));
            const prevScore = Number(prev.score || (prev.correct_count ?? prev.correctCount ?? 0));
            return pScore >= prevScore ? curr : prev;
          }, matchingSubs[0]);
        }

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
      submissions: studentSubmissions,
      homeworks,
      books,
      bookTests
    });
    return allSubs.slice(0, 5);
  }, [selectedStudent?.id, studentSubmissions, homeworks, books, bookTests]);

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

    // Index from bookTests array
    (bookTests || []).forEach(bt => {
      const bookId = String(bt.bookId || bt.book_id || '');
      const currentBook = (books || []).find(b => String(b.id) === bookId || (toUUID(b.id) && toUUID(b.id) === toUUID(bookId)));
      addToCache(bt.id, { tObj: bt, currentBook: currentBook || null, subjObj: null, topicObj: null });
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
          if (tSubjectId && (String(s.id) === tSubjectId || toUUID(s.id) === toUUID(tSubjectId) || (s.name && (tObj?.subjectName || tObj?.subject) && String(s.name).toLowerCase().trim() === String(tObj?.subjectName || tObj?.subject).toLowerCase().trim()))) {
            subjObj = s;
            if (!currentBook) currentBook = b;
            for (const tp of (s.topics || [])) {
              if (tTopicId && (String(tp.id) === tTopicId || toUUID(tp.id) === toUUID(tTopicId) || (tp.name && (tObj?.topicName || tObj?.topic) && String(tp.name).toLowerCase().trim() === String(tObj?.topicName || tObj?.topic).toLowerCase().trim()))) {
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
      currentBook = books.find(b => b.subjects && b.subjects.length > 0) || books[0];
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
      const rawToCheck = `${targetHw?.title || ''} ${targetHw?.subject || ''} ${currentBook?.title || ''}`;
      if (/matematik/i.test(rawToCheck)) subjectName = 'Matematik';
      else if (/turkce|türkçe|paragraf/i.test(rawToCheck)) subjectName = 'Türkçe';
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

  /* ─── Computed Day Program — only for the active day (7x faster than computing all 7) ─── */
  const fullProcessedWeekMap = useMemo(() => {
    try {
      const rawProg = coachingProfile?.weeklyProgram;
      const studentId = selectedStudent?.id;
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
              // Remedial tests scheduled by teacher should always show on their assigned day column
              if (item.isTeacherRemedial || item.type === 'remedialTest') {
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
          const bookObj = (books || []).find(b =>
            String(b?.id) === String(hw.bookId) ||
            toUUID(b?.id) === toUUID(hw.bookId) ||
            (b?.title && hw?.title && (
              b.title.toLowerCase().trim() === hw.title.toLowerCase().replace(/\s*\(tüm kitap görevi\)/gi, '').trim() ||
              hw.title.toLowerCase().includes(b.title.toLowerCase().trim())
            ))
          ) || ((hw.isBookAssignment || hw.bookId) ? { id: hw.bookId, title: hw.title || 'Kitap Takibi', subjects: [] } : null);

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

          const isBook = Boolean(
            hw.isBookAssignment ||
            hw.sourceType === 'trackedBook' ||
            hw.bookId ||
            hw.book_id ||
            hw.raw_data?.bookId ||
            hw.raw_data?.isBookAssignment ||
            (hw.testDueDates && Object.keys(hw.testDueDates).length > 0) ||
            (hw.scheduleDates && Object.keys(hw.scheduleDates).length > 0) ||
            (hw.title && /kitap|seti|soru bankası|paragraf|atlı karınca|artıbir/i.test(hw.title))
          );

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
              if (isSubmissionMatchingBookTest(s, specificTestId, bookTests, books)) return true;
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

          const testDueDatesMap = {
            ...(hw.testDueDates || hw.scheduleDates || hw.raw_data?.testDueDates || hw.raw_data?.scheduleDates || hw.testDates || {})
          };

          // Merge dates from bookTests if matching this book
          (bookTests || []).filter(bt => String(bt.bookId || bt.book_id) === String(hw.bookId) || toUUID(bt.bookId) === toUUID(hw.bookId)).forEach(bt => {
            const d = bt.dueDate || bt.testDueDate || bt.date;
            if (d && !testDueDatesMap[bt.id]) testDueDatesMap[bt.id] = d;
          });

          if (isBook) {
            // Collect all genuine tests belonging to this book
            const allGenuineTests = [];
            const seenTestIds = new Set();

            if (bookObj?.subjects && Array.isArray(bookObj.subjects)) {
              bookObj.subjects.forEach(s => {
                (s.tests || []).forEach(t => {
                  const tid = String(t.id);
                  if (!seenTestIds.has(tid)) {
                    seenTestIds.add(tid);
                    allGenuineTests.push({ ...t, subjectObj: s, topicObj: null });
                  }
                });
                (s.topics || []).forEach(tp => {
                  (tp.tests || []).forEach(t => {
                    const tid = String(t.id);
                    if (!seenTestIds.has(tid)) {
                      seenTestIds.add(tid);
                      allGenuineTests.push({ ...t, subjectObj: s, topicObj: tp });
                    }
                  });
                });
              });
            }

            (bookTests || []).filter(bt => String(bt.bookId || bt.book_id) === String(hw.bookId || bookObj?.id) || toUUID(bt.bookId) === toUUID(hw.bookId || bookObj?.id)).forEach(bt => {
              const tid = String(bt.id);
              const cleanTid = tid.replace(/^bt_/, '');
              if (!seenTestIds.has(tid) && !seenTestIds.has(cleanTid)) {
                seenTestIds.add(tid);
                allGenuineTests.push({ ...bt, isBookTest: true });
              }
            });

            if (allGenuineTests.length > 0 && typeof testDueDatesMap === 'object' && Object.keys(testDueDatesMap).length > 0) {
              allGenuineTests.forEach(testItem => {
                const tidStr = String(testItem.id);
                const tidClean = tidStr.replace(/^bt_/, '').replace(/^q_/, '');
                const tidUuid = String(toUUID(tidStr) || '');

                const tDateStr = testDueDatesMap[tidStr] ||
                  (tidUuid && testDueDatesMap[tidUuid]) ||
                  testDueDatesMap[tidClean] ||
                  testDueDatesMap[`bt_${tidClean}`] ||
                  testDueDatesMap[`bt_${tidStr}`] ||
                  testItem.dueDate || testItem.testDueDate || testItem.date;

                if (!tDateStr) return;
                const tYMD = extractItemYMD(tDateStr);
                if (dayYMD === tYMD) {
                  const info = resolveBookTestInfo(testItem.id, hw, bookObj);
                  if (!info || !info.testName || info.testName === 'Testi' || info.testName === info.cleanBookTitle) {
                    if (testItem.name && testItem.name !== 'Test' && testItem.name !== 'Kitap Testi') {
                      info.testName = testItem.name;
                    } else {
                      return; // Skip phantom/unnamed test
                    }
                  }
                  const testItemObj = {
                    ...testItem,
                    id: testItem.id,
                    testId: testItem.id,
                    bookTestId: testItem.id,
                    bookId: hw.bookId || hw.book_id || info.currentBook?.id || bookObj?.id,
                    name: testItem.name || info.testName,
                    testName: testItem.name || info.testName,
                    title: testItem.name || `${info.testName}${info.topicName ? ` (${info.topicName})` : ''}`,
                    unit: info.topicName || testItem.unit || testItem.unitName || '',
                    unitName: info.topicName || testItem.unit || testItem.unitName || '',
                    unitTopic: info.topicName || testItem.unit || testItem.unitName || '',
                    topic: info.topicName || '',
                    topicName: info.topicName || '',
                    subject: info.subjectName || testItem.subject || testItem.subjectName || '',
                    subjectName: info.subjectName || testItem.subject || testItem.subjectName || '',
                    parentSubjectName: info.subjectName || '',
                    bookTitle: info.cleanBookTitle
                  };

                  // Check if solved: direct ID match first, then subject-scoped name fallback
                  // (needed when submission test_id format differs from bookTest id format, e.g. UUID vs tbt_xxx)
                  const tidSolvedCheck = (() => {
                    const str = tidStr;
                    const clean = tidClean;
                    const u = tidUuid;
                    // Direct ID match from studentSolvedSet
                    if (studentSolvedSet.has(str) || studentSolvedSet.has(clean) || (u && studentSolvedSet.has(u))) return true;
                    if (studentSolvedSet.has(`tid_${str}`) || studentSolvedSet.has(`tid_${clean}`) || (u && studentSolvedSet.has(`tid_${u}`))) return true;
                    // Subject + testId
                    const sNameNorm = (info.subjectName || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '').trim();
                    if (sNameNorm) {
                      if (studentSolvedSet.has(`subj_tid_${sNameNorm}_${str}`) || studentSolvedSet.has(`subj_tid_${sNameNorm}_${clean}`)) return true;
                    }
                    // Subject + test name fallback — handles ID format mismatch between books
                    // (e.g. submission saved with UUID test_id but bookTest uses tbt_ prefix id)
                    if (sNameNorm && info.testName) {
                      const normKey = (s) => String(s || '').toLowerCase()
                        .replace(/[\u2010-\u2015\u2212]/g, '-').replace(/[^\p{L}\p{N}]/gu, '').trim();
                      const normTestName = normKey(info.testName);
                      if (normTestName && normTestName.length >= 3) {
                        if (studentSolvedSet.has(`subj_title_${sNameNorm}_${normTestName}`)) return true;
                        if (studentSolvedSet.has(`subj_test_${sNameNorm}_${normTestName}`)) return true;
                      }
                    }
                    return false;
                  })();
                  const isTestSolved = tidSolvedCheck ||
                    (hw.submissions || hw.raw_data?.submissions || []).some(s => isMatchHwSub(s, hw, testItem.id) || isSubmissionMatchingBookTest(s, testItemObj, bookTests, books)) ||
                    (studentSubmissions || []).some(s => isMatchHwSub(s, hw, testItem.id) || isSubmissionMatchingBookTest(s, testItemObj, bookTests, books));
                  const autoId = `auto_hw_${hw.id}_${testItem.id}_${dayYMD}`;

                  const isAlreadyPresent = dayManualItems.some(m => m.id === autoId || (m.hwId === hw.id && (m.testId === testItem.id || m.testId === tidClean))) ||
                    autoHwItems.some(a => String(a.testId) === tidStr || String(a.testId) === tidClean || (tidUuid && toUUID(a.testId) === tidUuid) || (a.testName === info.testName && a.subject === info.subjectName && a.bookTitle === info.cleanBookTitle));

                  if (!isAlreadyPresent) {
                    autoHwItems.push({
                      id: autoId,
                      hwId: hw.id,
                      testId: testItem.id,
                      bookTestId: testItem.id,
                      bookId: hw.bookId || hw.book_id || info.currentBook?.id || bookObj?.id,
                      isAutoHomework: true,
                      isBookTask: true,
                      taskType: 'kitap',
                      name: testItem.name || info.testName,
                      testName: testItem.name || info.testName,
                      title: `${info.testName}${info.topicName ? ` (${info.topicName})` : ''}`,
                      unit: info.topicName || '',
                      unitName: info.topicName || '',
                      unitTopic: info.topicName || '',
                      topic: info.topicName || '',
                      topicName: info.topicName || '',
                      subject: info.subjectName || '',
                      subjectName: info.subjectName || '',
                      parentSubjectName: info.subjectName || '',
                      bookTitle: info.cleanBookTitle,
                      questionCount: `${info.qCount} soru`,
                      time: `Hedef: ${new Date(tDateStr).toLocaleDateString('tr-TR')}`,
                      done: isTestSolved
                    });
                  }
                }
              });
              return;
            }
          }

          const startYMD = extractItemYMD(hw.startDate || hw.assignedAt || hw.createdAt);
          const dueYMD = extractItemYMD(hw.dueDate || hw.assignedDueDate);
          const startTime = startYMD ? new Date(startYMD).getTime() : null;
          const dueTime = dueYMD ? new Date(dueYMD).getTime() : null;

          // A.2) Genel Ödev / Kitap Teslim Tarihi
          const sub = (hw.submissions || hw.raw_data?.submissions || []).find(s => isMatchHwSub(s, hw)) ||
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

          if (isForThisDay && !isBook) {
            const rawDue = hw.dueDate || hw.assignedDueDate;
            let formattedDue = '';
            if (rawDue) {
              try { formattedDue = `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}`; } catch {}
            }

            const isExam = hw.type === 'physicalExam' || hw.contentType === 'physicalExam' || hw.isExamTask || hw.isPhysical;
            const autoId = `auto_hw_${hw.id}`;
            const isAlreadyIn = dayManualItems.some(m => m.id === autoId || m.hwId === hw.id) ||
              autoHwItems.some(a => a.hwId === hw.id || a.id === autoId);

            if (!isAlreadyIn) {
              autoHwItems.push({
                id: autoId,
                hwId: hw.id,
                isAutoHomework: true,
                isExamTask: isExam,
                taskType: isExam ? 'deneme' : 'ödev',
                subject: hw.subject || (isExam ? 'Deneme Sınavı' : 'Ödev'),
                title: hw.title || 'Ödev Görevi',
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

        // ID, testId ve içerik (kitap + ders + test adı) bazında tam tekilleştirme — done:true ve testId içerenleri önceliklendir
        const rawAllItems = sortItemsByBookOrder([...autoHwItems, ...dayManualItems, ...scheduleItems], books, bookTests);
        const seenIds = new Map();
        rawAllItems.forEach(item => {
          const cleanSubject = String(item.subject || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
          const cleanTitle = String(item.title || item.topic || item.testName || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
          const cleanBook = String(item.bookTitle || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');

          let key = '';
          if (item.testId) {
            key = `test_${cleanBook}_${cleanSubject}_${item.testId}`;
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
        const allItems = sortItemsByBookOrder(Array.from(seenIds.values()), books, bookTests);
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
  }, [coachingProfile, homeworks, selectedStudent, curData, studentSubmissions, studentSolvedSet, books, bookTests, schedules, studyAssignments, studyPlans, weekInfo, todayDayKey]);

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

    const isAlreadySeen = (it) => {
      if (!it) return false;
      const bTitle = String(it.bookTitle || '').toLocaleLowerCase('tr').replace(/\s*\(tüm kitap görevi\)/gi, '').trim();
      const sTitle = String(it.subject || '').toLocaleLowerCase('tr').trim();
      const uTopic = String(it.unitTopic || '').toLocaleLowerCase('tr').trim();
      const tName = String(it.testName || it.title || '').toLocaleLowerCase('tr').replace(/\s*\(tüm kitap görevi\)/gi, '').trim();

      if (it.id && seen.has(String(it.id))) return true;
      if (it.uniqueKey && seen.has(String(it.uniqueKey))) return true;
      if (tName && tName.length > 2) {
        const cleanK = `${bTitle}_${sTitle}_${uTopic}_${tName}`;
        if (seen.has(cleanK)) return true;
      }
      return false;
    };

    const addKeysToSeen = (it) => {
      if (!it) return;
      if (it.id) seen.add(String(it.id));
      if (it.uniqueKey) seen.add(String(it.uniqueKey));

      const bTitle = String(it.bookTitle || '').toLocaleLowerCase('tr').replace(/\s*\(tüm kitap görevi\)/gi, '').trim();
      const sTitle = String(it.subject || '').toLocaleLowerCase('tr').trim();
      const uTopic = String(it.unitTopic || '').toLocaleLowerCase('tr').trim();
      const tName = String(it.testName || it.title || '').toLocaleLowerCase('tr').replace(/\s*\(tüm kitap görevi\)/gi, '').trim();

      if (tName && tName.length > 2) {
        const cleanK = `${bTitle}_${sTitle}_${uTopic}_${tName}`;
        seen.add(cleanK);
      }
    };

    // HAFTALIK PROGRAMDAN GÜNÜ GEÇMİŞ (PAZARTESİ, SALI VB.) ÇÖZÜLMEMİŞ GÖREVLER
    const todayIdx = DAYS_OF_WEEK.findIndex(d => d.key === todayDayKey);
    DAYS_OF_WEEK.forEach((d, idx) => {
      if (idx < todayIdx) {
        const dData = fullProcessedWeekMap[d.key];
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
                dueDateStr: item.dueDateStr || dData.dateLabel || d.name,
                reason: `${d.name} gününden kalan görev`
              });
            }
          }
        });
      }
    });

    return sortItemsByBookOrder(list, books, bookTests);
  }, [selectedStudent, fullProcessedWeekMap, todayDayKey, isTaskDismissed, isItemSolved, books, bookTests]);

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
      const booksProgress = (books || []).filter(b => b && b.title && b.bookType !== 'exam').map(b => {
        const bId = String(b.id);
        const bUuid = String(toUUID(b.id) || '');
        const rawSubjects = (b.subjects && b.subjects.length > 0) ? b.subjects : (b.raw_data?.subjects || []);
        const testsInBook = (bookTests || []).filter(bt => {
          const btBId = String(bt.bookId || bt.book_id || '');
          return btBId === bId || (bUuid && btBId === bUuid);
        });
        const total = testsInBook.length > 0 ? testsInBook.length : (b.totalTests || b.total_tests || 20);
        let solved = 0;
        let totalCorrect = 0;
        let totalWrong = 0;
        let totalBlank = 0;

        const subjStats = [];
        rawSubjects.forEach(s => {
          if (!s?.name) return;
          const sTests = testsInBook.filter(t => String(t.subject_id || t.subjectId) === String(s.id));
          let sSolved = 0;
          sTests.forEach(t => {
            const isSolved = studentSubmissions.some(sub => isSubmissionMatchingBookTest(sub, { ...t, bookId: b.id, bookTitle: b.title }, testsInBook, books));
            if (isSolved) {
              sSolved++;
            }
          });
          if (sTests.length > 0) {
            subjStats.push(`${s.name}: ${sSolved}/${sTests.length}`);
          }
        });

        testsInBook.forEach(t => {
          const matchingSubs = studentSubmissions.filter(sub => isSubmissionMatchingBookTest(sub, { ...t, bookId: b.id, bookTitle: b.title }, testsInBook, books));
          if (matchingSubs.length > 0) {
            const best = matchingSubs.reduce((prev, curr) => {
              const pScore = Number(curr.score || (curr.correct_count ?? curr.correctCount ?? 0));
              const prevScore = Number(prev.score || (prev.correct_count ?? prev.correctCount ?? 0));
              return pScore >= prevScore ? curr : prev;
            }, matchingSubs[0]);

            solved++;
            totalCorrect += Number(best.correct_count ?? best.correctCount ?? best.correct ?? 0);
            totalWrong += Number(best.wrong_count ?? best.wrongCount ?? best.wrong ?? 0);
            totalBlank += Number(best.empty_count ?? best.blankCount ?? best.blank ?? 0);
          }
        });

        const totalQ = totalCorrect + totalWrong + totalBlank;
        const successRate = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
        const pRatio = Number(b.penaltyRatio) >= 0 ? Number(b.penaltyRatio) : 3;
        const rawNet = totalCorrect - (pRatio > 0 ? totalWrong / pRatio : 0);
        const net = Math.max(0, Number(rawNet.toFixed(1)));
        const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

        return {
          id: b.id,
          title: b.title,
          publisher: b.publisher || 'Özel / MEB Yayınları',
          solvedTests: solved,
          totalTests: total,
          percent: pct,
          totalCorrect,
          totalWrong,
          totalBlank,
          net,
          successRate,
          subjectsBreakdown: subjStats.join(' • ')
        };
      });

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
      overdueCount,
      completionRate
    };
  }, [dayProgramInfo, tests]);

  
  const studentGamification = useMemo(() => {
    if (!selectedStudent) return null;
    return computeStudentGamificationData({
      studentId: selectedStudent.id,
      submissions: studentSubmissions,
      homeworks,
      books,
      bookTests,
      mockExams: studentMockExams,
      studySessions: []
    });
  }, [selectedStudent, studentSubmissions, homeworks, books, bookTests, studentMockExams]);

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
        background: 'linear-gradient(125deg, #1e1065 0%, #2d1b8e 15%, #4338ca 38%, #6d28d9 58%, #9333ea 78%, #c026d3 100%)',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
        paddingBottom: isMobile ? '2.5rem' : '4rem'
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
          maxWidth: 1440,
          margin: '0 auto',
          padding: isMobile ? '1rem 0.85rem 0.75rem' : '2rem 2.5rem 1.25rem',
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
          <div style={{ display:'flex', alignItems:'center', gap: isMobile ? '0.75rem' : '1.6rem', minWidth: 0, flex: 1 }}>

            {/* Avatar with ring - Rütbe Profil Simgesi */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{
                position:'absolute',
                inset: -4,
                borderRadius:'50%',
                background: studentRank.bgGradient || 'conic-gradient(from 0deg, #818cf8, #c084fc, #f472b6, #818cf8)',
                padding: 2,
                opacity: 0.8,
                filter: 'blur(2px)'
              }} />
              <div style={{
                width: isMobile ? 58 : 92,
                height: isMobile ? 58 : 92,
                borderRadius: '50%',
                background: studentRank.bgGradient || `linear-gradient(145deg, ${avatarColor}cc 0%, ${avatarColor} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.95rem' : '3.1rem',
                fontWeight: 900,
                color: '#ffffff',
                position: 'relative',
                zIndex: 2,
                boxShadow: `0 0 0 3px rgba(255,255,255,0.35), 0 8px 28px ${studentRank.color || avatarColor}90`,
                userSelect: 'none'
              }}
              title={`Rütbe: ${studentRank.title} (Lv. ${studentRank.level})`}
              >
                <span>{studentRank.icon || '🛡️'}</span>
              </div>
              {/* Seviye (Lv) Alt Rozeti */}
              <div style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                zIndex: 4,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                border: '2px solid #ffffff',
                borderRadius: 99,
                padding: isMobile ? '1px 5px' : '2px 8px',
                fontSize: isMobile ? '0.58rem' : '0.74rem',
                fontWeight: 900,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap',
                lineHeight: 1.2
              }}>
                Lv.{studentRank.level}
              </div>
            </div>

            {/* İsim + Rozetler */}
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{
                fontSize: isMobile ? '0.62rem' : '0.75rem',
                fontWeight: 800,
                color:'rgba(196,181,253,0.95)',
                textTransform:'uppercase',
                letterSpacing:'0.14em',
                marginBottom: 2,
                display:'flex', alignItems:'center', gap:5
              }}>
                <span style={{ opacity:0.85 }}>HOŞ GELDİN</span>
                <span>👏</span>
              </div>

              <h1 style={{
                fontSize: isMobile ? '1.25rem' : '2.6rem',
                fontWeight: 900,
                color:'#ffffff',
                margin:'0 0 5px 0',
                lineHeight:1.1,
                letterSpacing:'-0.03em',
                textShadow:'0 4px 24px rgba(0,0,0,0.35)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
              }}>
                {selectedStudent?.name || 'Öğrenci'}
              </h1>

              {/* Pill badges */}
              <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
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
              width: isMobile ? 66 : 116,
              height: isMobile ? 66 : 116,
              position:'relative',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <svg width={isMobile ? 66 : 116} height={isMobile ? 66 : 116} style={{ position:'absolute', inset:0 }}>
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#67e8f9" />
                  </linearGradient>
                </defs>
                <circle
                  cx={isMobile ? 33 : 58} cy={isMobile ? 33 : 58}
                  r={isMobile ? 27 : 50}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={isMobile ? 4 : 6}
                />
                <circle
                  cx={isMobile ? 33 : 58} cy={isMobile ? 33 : 58}
                  r={isMobile ? 27 : 50}
                  fill="none"
                  stroke="url(#ringGrad)"
                  strokeWidth={isMobile ? 4 : 6}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * (isMobile ? 27 : 50)}`}
                  strokeDashoffset={`${2 * Math.PI * (isMobile ? 27 : 50) * (1 - overallSuccessRate / 100)}`}
                  transform={`rotate(-90 ${isMobile ? 33 : 58} ${isMobile ? 33 : 58})`}
                  style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                />
              </svg>
              <div style={{
                width: isMobile ? 50 : 90,
                height: isMobile ? 50 : 90,
                borderRadius:'50%',
                background:'rgba(255,255,255,0.1)',
                backdropFilter:'blur(12px)',
                border:'1.5px solid rgba(255,255,255,0.22)',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                boxShadow:'0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)'
              }}>
                <div style={{ fontSize: isMobile ? '0.98rem' : '1.75rem', fontWeight:900, color:'#fff', lineHeight:1, letterSpacing:'-0.03em' }}>
                  %{overallSuccessRate}
                </div>
                <div style={{ fontSize: isMobile ? '0.42rem' : '0.62rem', fontWeight:900, color:'rgba(196,181,253,0.9)', letterSpacing:'0.1em', marginTop:2, textTransform:'uppercase' }}>
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
        padding: isMobile ? '0 0.65rem' : '0 2.5rem',
        marginTop: isMobile ? '-28px' : '-52px',
        position: 'relative',
        zIndex: 10,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(5, minmax(0, 1fr))' : 'repeat(5, 1fr)',
          gap: isMobile ? '0.25rem' : '0.85rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {[
            { label:'TOPLAM',     value: taskStats.totalCount,           emoji:'📋', grad:'linear-gradient(160deg,#4f46e5,#3730a3)',  glow:'rgba(79,70,229,0.55)',   route:'/student/homeworks' },
            { label:'TAMAMLANDI', value: taskStats.completedCount,       emoji:'✅', grad:'linear-gradient(160deg,#059669,#047857)',   glow:'rgba(16,185,129,0.55)',  route:'/student/results' },
            { label:'BEKLİYOR',   value: taskStats.pendingCount,         emoji:'⏳', grad:'linear-gradient(160deg,#d97706,#b45309)',   glow:'rgba(245,158,11,0.55)',  route:'/student/homeworks' },
            { label:'GECİKTİ',   value: Math.max(taskStats.overdueCount, catchUpTasks.length), emoji:'🔥', grad:'linear-gradient(160deg,#e11d48,#be123c)',   glow:'rgba(239,68,68,0.55)',   route:'/student/homeworks' },
            { label:'TAMAMLANMA', value: `%${taskStats.completionRate}`, emoji:'🏆', grad:'linear-gradient(160deg,#7c3aed,#6d28d9)',  glow:'rgba(139,92,246,0.55)', route:'/student/results' },
          ].map((kpi) => (
            <div
              key={kpi.label}
              onClick={() => navigate(kpi.route)}
              className="sd-kpi"
              style={{
                background: kpi.grad,
                border: '1.5px solid rgba(255,255,255,0.22)',
                borderRadius: isMobile ? 12 : 20,
                padding: isMobile ? '0.45rem 0.2rem' : '1.1rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                boxShadow: `0 10px 30px ${kpi.glow}, 0 2px 0 rgba(255,255,255,0.15) inset`,
                minHeight: isMobile ? 64 : 112,
                minWidth: 0,
                overflow: 'hidden'
              }}
            >
              <div style={{ fontSize: isMobile ? '0.9rem' : '1.55rem', lineHeight: 1, marginBottom: 3 }}>{kpi.emoji}</div>
              <div style={{ fontSize: isMobile ? '1.05rem' : '2.35rem', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em' }}>{kpi.value}</div>
              <div style={{ fontSize: isMobile ? '0.42rem' : '0.68rem', fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: isMobile ? '0.01em' : '0.1em', marginTop: 3, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          ANA İÇERİK — DENGELİ ORTA-AÇIK SLATE TEMASI
      ════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: isMobile ? '0.75rem 0.65rem 1.5rem' : '1.75rem 2.5rem 4rem', width: '100%', boxSizing: 'border-box' }}>

        {/* ── MODERN UYGULAMA İKONLARI HIZLI KISAYOL ŞERİDİ (iOS/Android App Style) ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(6, minmax(0, 1fr))' : 'repeat(7, minmax(0, 1fr))',
            gap: isMobile ? '0.2rem' : '0.85rem',
            padding: isMobile ? '0.65rem 0.25rem 0.55rem' : '0.9rem 1.25rem',
            marginBottom: isMobile ? '0.9rem' : '1.35rem',
            background: 'var(--color-surface, #ffffff)',
            border: '1.5px solid var(--color-border, #e2e8f0)',
            borderRadius: isMobile ? 18 : 22,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            boxSizing: 'border-box',
            width: '100%'
          }}
        >
          {[
            {
              id: 'study_room',
              label: isMobile ? 'Oda' : 'Çalışma Odası',
              icon: Headphones,
              gradient: 'linear-gradient(135deg, #10b981, #059669)',
              shadow: 'rgba(16, 185, 129, 0.35)',
              badge: null,
              onClick: () => navigate('/study-room')
            },
            {
              id: 'homeworks',
              label: 'Ödevler',
              icon: ClipboardList,
              gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)',
              shadow: 'rgba(244, 63, 94, 0.35)',
              badge: catchUpTasks.length > 0 ? `${catchUpTasks.length} Telafi` : (pendingCount > 0 ? pendingCount : null),
              badgeBg: catchUpTasks.length > 0 ? '#ef4444' : '#e11d48',
              onClick: () => navigate('/student/homeworks')
            },
            ...(!isMobile ? [{
              id: 'program',
              label: 'Program',
              icon: CalendarDays,
              gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              shadow: 'rgba(59, 130, 246, 0.35)',
              badge: null,
              onClick: () => navigate('/my-program')
            }] : []),
            {
              id: 'books',
              label: 'Kitaplar',
              icon: BookOpen,
              gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              shadow: 'rgba(139, 92, 246, 0.35)',
              badge: assignedBooksList.length || null,
              badgeBg: '#6366f1',
              onClick: () => navigate('/student/books')
            },
            {
              id: 'results',
              label: 'Karne',
              icon: BarChart3,
              gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
              shadow: 'rgba(245, 158, 11, 0.35)',
              badge: null,
              onClick: () => navigate('/student/results')
            },
            {
              id: 'goals',
              label: 'Hedefler',
              icon: Target,
              gradient: 'linear-gradient(135deg, #ec4899, #d946ef)',
              shadow: 'rgba(236, 72, 153, 0.35)',
              badge: goalTrackingData.totalItemsCount || null,
              badgeBg: '#d946ef',
              onClick: () => navigate('/goals')
            },
            {
              id: 'add_test',
              label: isMobile ? '+ Test' : 'Test Ekle',
              icon: Plus,
              gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              shadow: 'rgba(6, 182, 212, 0.35)',
              badge: null,
              onClick: () => setIsManualTestModalOpen(true)
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: 0,
                  userSelect: 'none',
                  transition: 'transform 0.15s ease',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {/* App Squircle Icon */}
                <div
                  style={{
                    position: 'relative',
                    width: isMobile ? 38 : 50,
                    height: isMobile ? 38 : 50,
                    borderRadius: isMobile ? 12 : 16,
                    background: item.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: `0 4px 12px ${item.shadow}`,
                    marginBottom: isMobile ? 3 : 6,
                    border: '1px solid rgba(255, 255, 255, 0.25)'
                  }}
                >
                  <Icon size={isMobile ? 18 : 24} strokeWidth={2.4} />

                  {/* Notification Badge on top right of icon */}
                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      style={{
                        position: 'absolute',
                        top: isMobile ? -3 : -5,
                        right: isMobile ? -3 : -5,
                        background: '#ffffff',
                        color: item.badgeBg || '#e11d48',
                        border: `2px solid ${item.badgeBg || '#e11d48'}`,
                        fontSize: isMobile ? '0.55rem' : '0.65rem',
                        fontWeight: 900,
                        minWidth: isMobile ? 15 : 18,
                        height: isMobile ? 15 : 18,
                        borderRadius: 99,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 2px',
                        lineHeight: 1,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* App Title Label */}
                <span
                  style={{
                    fontSize: isMobile ? '0.62rem' : '0.74rem',
                    fontWeight: 800,
                    color: 'var(--color-text, #0f172a)',
                    lineHeight: 1.1,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%'
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>



        {/* ════════════════════════════════════════════
            4. ANA GRID (SOL: GÜNÜN GÖREVLERİ & TAKVİM, ÖDEVLER & TESTLER | SAĞ: PERİYODİK ANALİZ, HEDEFLER & İLHAM)
        ════════════════════════════════════════════ */}
        {/* 🎮 OYUNLAŞTIRMA & SEVİYE KARTI */}
        <div style={{ marginBottom: isMobile ? '1rem' : '1.5rem' }}>
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
        </div>

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
                onTaskClick={(task) => {
                  if (!task) return;
                  if (task.roadmapAssignmentId) {
                    navigate(`/student/study-plan/${task.roadmapAssignmentId}`, { state: { from: '/student' } });
                    return;
                  }
                  
                  if (task.type === 'remedialTest' || task.taskType === 'remedial' || task.isRemedial) {
                    navigate(`/quiz/${task.testId || task.realTestId || task.id}?studentId=${selectedStudent.id}`, { state: { from: '/student' } });
                    return;
                  }

                  const hwObj = (homeworks || []).find(h => String(h.id) === String(task.hwId || task.id));
                  const matchingBook = books?.find(b => String(b.id) === String(hwObj?.bookId || task.bookId));
                  const isExam = task.isExamTask || task.taskType === 'deneme' || task.type === 'physicalExam' || hwObj?.type === 'physicalExam' || hwObj?.contentType === 'physicalExam' || matchingBook?.bookType === 'exam' || hwObj?.isPhysical;
                  
                  if (isExam) {
                    navigate(`/physical-exam/${task.hwId || task.realTestId || task.id}?studentId=${selectedStudent.id}`, { state: { from: '/student' } });
                    return;
                  }

                  const targetBookTestId = task.bookTestId || task.testId || task.realTestId ||
                    (hwObj?.tests && hwObj.tests.length === 1 ? hwObj.tests[0] : null);

                  const isBook = Boolean(
                    task.isBookTask ||
                    task.taskType === 'kitap' ||
                    task.sourceType === 'trackedBook' ||
                    hwObj?.isBookAssignment ||
                    targetBookTestId
                  );

                  if (targetBookTestId) {
                    navigate(`/book-quiz/${targetBookTestId}?studentId=${selectedStudent.id}`, { state: { from: '/student' } });
                    return;
                  }

                  // Normal Homework Quiz
                  const quizTargetId = task.realTestId || task.hwId || task.id || task.testId;
                  if (quizTargetId) {
                    navigate(`/quiz/${quizTargetId}?studentId=${selectedStudent.id}`, { state: { from: '/student' } });
                    return;
                  }

                  handleToggleTask(task);
                }}
                getRowTheme={getRowTheme}
              />

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <Link to="/my-program" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Haftalık Programa Git <ChevronRight size={13} />
                </Link>
              </div>
            </div>

            {/* 📋 BÖLÜM 2: ÖDEVLERİM & GÖREV TAKİBİ */}
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
              myRoadmaps={myRoadmaps}
              onNavigateRoadmap={(id) => navigate(`/student/study-plan/${id}`)}
            />

          </div>

          {/* ──── SAĞ KOLON: ANALİZLER, HEDEFLERİM & İLHAM ──── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>

            {/* 📊 BÖLÜM 1: PERİYODİK SORU & BAŞARI ANALİZİ (GÜNLÜK / HAFTALIK / AYLIK) */}
            <div>
              <Suspense fallback={<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>📊 Analiz yükleniyor…</div>}>
                <PeriodicQuestionAnalytics
                  homeworkSubmissions={otherHomeworkSubmissions}
                  mockExams={generalTrialExams}
                  studentName={selectedStudent?.name || 'Öğrenci'}
                />
              </Suspense>
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
    </SmartPullToRefresh>
  );
}
