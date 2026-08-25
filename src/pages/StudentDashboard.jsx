import React, { useState, useEffect, useMemo } from 'react';
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
import { isHomeworkForStudent, sortItemsByBookOrder, computeStudentAnalyticsData } from '../utils/testResolver';
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
import StudentGamificationCard from '../components/gamification/StudentGamificationCard';
import { computeStudentGamificationData } from '../services/gamificationService';

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
  const { homeworks, clearHomeworkSubmissionsForStudent } = useHomework();
  const { submissions, deleteSubmission, deleteSubmissionsByTestId, deleteStudentSubmissionsForBookOrHw } = useEvaluation();
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

  /* ─── Son Çözülen 5 Test (Single Source of Truth via Unified Result Adapter) ─── */
  const recentSolvedTests = useMemo(() => {
    if (!selectedStudent?.id) return [];
    const allSubs = getAllUnifiedStudentSubmissions({
      studentId: selectedStudent.id,
      submissions,
      homeworks,
      books,
      bookTests
    });
    return allSubs.slice(0, 5);
  }, [selectedStudent?.id, submissions, homeworks, books, bookTests]);

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

          // A.1) Kitap Testlerine Özel Tarihler (hw.testDueDates)
          if (isBook && hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0) {
            Object.entries(hw.testDueDates).forEach(([testId, tDateStr]) => {
              if (!tDateStr) return;
              const tYMD = String(tDateStr).split('T')[0];
              if (dayYMD === tYMD) {
                const tObj = (bookTests || []).find(b => String(b?.id) === String(testId));
                const bookObj = (books || []).find(b => String(b?.id) === String(hw.bookId) || toUUID(b?.id) === toUUID(hw.bookId));
                const isTestSolved = (hw.submissions || []).some(s => isMatchHwSub(s, hw, testId)) ||
                  (submissions || []).some(s => isMatchHwSub(s, hw, testId));
                const testTitle = tObj?.name || 'Bölüm Testi';
                const cleanBookTitle = bookObj?.title || hw.title || 'Takip Kitabı';
                const autoId = `auto_hw_${hw.id}_${testId}_${dayYMD}`;

                const exists = dayManualItems.some(m => m.id === autoId || (m.hwId === hw.id && m.testId === testId));
                if (!exists) {
                  autoHwItems.push({
                    id: autoId,
                    hwId: hw.id,
                    testId: testId,
                    bookTestId: testId,
                    bookId: hw.bookId || bookObj?.id,
                    isAutoHomework: true,
                    isBookTask: true,
                    taskType: 'kitap',
                    subject: hw.subject || bookObj?.subject || 'Kitap Takibi',
                    bookTitle: cleanBookTitle,
                    title: `${cleanBookTitle} — ${testTitle}`,
                    questionCount: tObj?.questionCount ? `${tObj.questionCount} soru` : null,
                    time: `Hedef: ${new Date(tDateStr).toLocaleDateString('tr-TR')}`,
                    done: isTestSolved
                  });
                }
              }
            });
            return;
          }

          // A.2) Genel Ödev / Kitap Teslim Tarihi
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
                const bookObj = (books || []).find(b => String(b?.id) === String(hw.bookId) || toUUID(b?.id) === toUUID(hw.bookId));
                const testTitle = tObj?.name || `Test ${idx + 1}`;
                const cleanBookTitle = bookObj?.title || hw.title || 'Takip Kitabı';
                const exists = dayManualItems.some(m => m.id === `auto_hw_${hw.id}_${testId}` || m.hwId === hw.id);
                if (!exists) {
                  autoHwItems.push({
                    id: `auto_hw_${hw.id}_${testId}`,
                    hwId: hw.id,
                    testId: testId,
                    bookTestId: testId,
                    bookId: hw.bookId || bookObj?.id,
                    isAutoHomework: true,
                    isBookTask: true,
                    taskType: 'kitap',
                    subject: hw.subject || bookObj?.subject || 'Kitap Takibi',
                    bookTitle: cleanBookTitle,
                    title: `${cleanBookTitle} — ${testTitle}`,
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

        // ID, testId ve içerik (kitap + ders + test adı) bazında tam tekilleştirme — done:true ve testId içerenleri önceliklendir
        const rawAllItems = sortItemsByBookOrder([...autoHwItems, ...dayManualItems, ...scheduleItems], books, bookTests);
        const seenIds = new Map();
        rawAllItems.forEach(item => {
          const cleanSubject = String(item.subject || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
          const cleanTitle = String(item.title || item.topic || item.testName || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
          const cleanBook = String(item.bookTitle || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');

          let key = '';
          if (item.testId) {
            key = `test_${item.testId}`;
          } else if (item.hwId && !item.testId) {
            key = `hw_${item.hwId}`;
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

  // ── 🔥 KAPSAMLI AKILLI TELAFİ HAVUZU (KİTAP TAKİBİ, YOL HARİTASI, ÖDEVLER, SINAVLAR, PROGRAM) ──
  const catchUpTasks = useMemo(() => {
    if (!selectedStudent) return [];
    const list = [];
    const seen = new Set();
    const nowZero = new Date();
    nowZero.setHours(0, 0, 0, 0);
    const nowTime = nowZero.getTime();
    const studentId = String(selectedStudent.id);
    const studentUuid = String(toUUID(selectedStudent.id) || '');

    // Pure Submissions Matcher for Books and Tests
    const isTestSolvedByStudent = (targetTestId, targetHwId) => {
      const tIdStr = targetTestId ? String(targetTestId) : null;
      const tCleanId = tIdStr ? tIdStr.replace(/^bt_/, '').replace(/^q_/, '') : null;
      const tUuidStr = tIdStr ? String(toUUID(tIdStr) || '') : null;
      const hIdStr = targetHwId ? String(targetHwId) : null;

      return (submissions || []).some(s => {
        const isMatchStudent = String(s.studentId) === studentId || (studentUuid && String(s.studentId) === studentUuid) || (studentUuid && toUUID(s.studentId) === studentUuid);
        if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
        if (s.isManual && (s.approvalStatus === 'pending' || s.approvalStatus === 'rejected' || s.isApproved === false || s.status === 'pending_approval' || s.status === 'rejected')) return false;

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

        if (tIdStr && matchFields.some(f => f && (
          f === tIdStr ||
          f === tCleanId ||
          f.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId ||
          (tUuidStr && f === tUuidStr) ||
          toUUID(f) === tIdStr ||
          (tUuidStr && toUUID(f) === tUuidStr)
        ))) {
          return true;
        }

        const sHwId = String(s.homeworkId || s.hwId || '');
        if (hIdStr && sHwId === hIdStr) return true;

        return false;
      });
    };

    // ══════════════════════════════════════════════════════════
    // 1. KİTAP TAKİBİ (/student/books) TÜM TARİHLİ EKSİK TESTLER
    // ══════════════════════════════════════════════════════════
    const studentBookHws = (homeworks || []).filter(hw => {
      const isBook = hw.isBookAssignment || hw.bookId || hw.sourceType === 'trackedBook' || (Array.isArray(hw.tests) && hw.tests.length > 0);
      if (!isBook) return false;
      return isHomeworkForStudent(hw, selectedStudent, curData?.grades);
    });

    studentBookHws.forEach(hw => {
      // Find matched book object
      let bookObj = (books || []).find(b => String(b.id) === String(hw.bookId) && b.bookType !== 'exam');
      if (!bookObj && hw.title) {
        bookObj = (books || []).find(b => b.bookType !== 'exam' && (hw.title.includes(b.title) || b.title.includes(hw.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim())));
      }
      if (!bookObj && Array.isArray(hw.tests) && hw.tests.length > 0) {
        const matchedBt = (bookTests || []).find(bt => hw.tests.includes(bt.id) || (toUUID(bt.id) && hw.tests.includes(toUUID(bt.id))));
        if (matchedBt) {
          bookObj = (books || []).find(b => String(b.id) === String(matchedBt.bookId) && b.bookType !== 'exam');
        }
      }
      const cleanBookTitle = bookObj?.title || hw.title?.replace(/\s*\(Tüm Kitap Görevi\)/gi, '')?.replace(/\s*\(Kendi Eklediğim\)/gi, '')?.trim() || 'Takip Kitabı';

      // A) Bireysel Test Tarihleri (hw.testDueDates)
      if (hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0) {
        Object.entries(hw.testDueDates).forEach(([testId, tDateStr]) => {
          if (!tDateStr) return;
          const targetDateObj = parseSafeDate(tDateStr);
          if (targetDateObj && targetDateObj.getTime() < nowTime) {
            const isSolved = isTestSolvedByStudent(testId, hw.id);
            if (!isSolved) {
              const key = `book_test_${hw.id}_${testId}`;
              if (!seen.has(key)) {
                seen.add(key);
                const tObj = (bookTests || []).find(b => String(b.id) === String(testId) || toUUID(b.id) === toUUID(testId));
                list.push({
                  id: key,
                  hwId: hw.id,
                  testId: testId,
                  bookTestId: testId,
                  bookId: hw.bookId || bookObj?.id,
                  isAutoHomework: true,
                  isBookTask: true,
                  taskType: 'kitap',
                  categoryType: 'kitap',
                  subject: hw.subject || bookObj?.subject || bookObj?.subjects?.[0]?.name || 'Kitap Takibi',
                  bookTitle: cleanBookTitle,
                  title: `${cleanBookTitle} — ${tObj?.name || 'Bölüm Testi'}`,
                  questionCount: tObj?.questionCount ? `${tObj.questionCount} soru` : null,
                  dueDateStr: targetDateObj.toLocaleDateString('tr-TR'),
                  dueDateObj: targetDateObj,
                  isCatchUp: true,
                  reason: `📚 Kitap Testi Gecikti (Hedef: ${targetDateObj.toLocaleDateString('tr-TR')})`
                });
              }
            }
          }
        });
      }

      // B) Tüm Kitap İçin Genel Teslim Tarihi (hw.dueDate)
      const rawDue = hw.dueDate || hw.assignedDueDate;
      const dueDateObj = parseSafeDate(rawDue);
      if (dueDateObj && dueDateObj.getTime() < nowTime) {
        let targetTests = [];
        if (Array.isArray(hw.tests) && hw.tests.length > 0) {
          targetTests = hw.tests;
        } else if (bookObj?.id) {
          targetTests = (bookTests || []).filter(bt => String(bt.bookId) === String(bookObj.id)).map(bt => bt.id);
        }

        if (targetTests.length > 0) {
          targetTests.forEach((testId, idx) => {
            const isSolved = isTestSolvedByStudent(testId, hw.id);
            if (!isSolved) {
              const key = `book_test_${hw.id}_${testId}`;
              if (!seen.has(key)) {
                seen.add(key);
                const tObj = (bookTests || []).find(b => String(b.id) === String(testId) || toUUID(b.id) === toUUID(testId));
                list.push({
                  id: key,
                  hwId: hw.id,
                  testId: testId,
                  bookTestId: testId,
                  bookId: hw.bookId || bookObj?.id,
                  isAutoHomework: true,
                  isBookTask: true,
                  taskType: 'kitap',
                  categoryType: 'kitap',
                  subject: hw.subject || bookObj?.subject || bookObj?.subjects?.[0]?.name || 'Kitap Takibi',
                  bookTitle: cleanBookTitle,
                  title: `${cleanBookTitle} — ${tObj?.name || `Test ${idx + 1}`}`,
                  questionCount: tObj?.questionCount ? `${tObj.questionCount} soru` : null,
                  dueDateStr: dueDateObj.toLocaleDateString('tr-TR'),
                  dueDateObj,
                  isCatchUp: true,
                  reason: `📚 Kitap Ödevi Gecikti (Son Teslim: ${dueDateObj.toLocaleDateString('tr-TR')})`
                });
              }
            }
          });
        }
      }
    });

    // ══════════════════════════════════════════════════════════
    // 2. YOL HARİTASI (STUDY PLAN / ÇALIŞMA PLANI) GÖREVLERİ
    // ══════════════════════════════════════════════════════════
    (studyAssignments || []).filter(a => String(a?.studentId) === studentId).forEach(assignment => {
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
          const isCompleted = completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name);
          if (isCompleted) return;

          let targetDateObj = null;
          if (topic?.dueDate) {
            targetDateObj = parseSafeDate(topic.dueDate);
          } else if (subject?.dueDate) {
            targetDateObj = parseSafeDate(subject.dueDate);
          } else if (assignment?.dueDate) {
            targetDateObj = parseSafeDate(assignment.dueDate);
          }

          if (targetDateObj && targetDateObj.getTime() < nowTime) {
            const key = `roadmap_${assignment.id}_${topic.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              list.push({
                id: key,
                roadmapAssignmentId: assignment.id,
                isAutoHomework: true,
                isRoadmapTask: true,
                taskType: 'yol_haritasi',
                categoryType: 'yol_haritasi',
                subject: subject.name || 'Yol Haritası',
                bookTitle: plan.title,
                title: topic.name,
                dueDateStr: targetDateObj.toLocaleDateString('tr-TR'),
                dueDateObj: targetDateObj,
                isCatchUp: true,
                reason: `🗺️ Yol Haritası Gecikti (Hedef: ${targetDateObj.toLocaleDateString('tr-TR')})`
              });
            }
          }
        });
      });
    });

    // ══════════════════════════════════════════════════════════
    // 3. HAFTALIK PROGRAMDAN ÖNCEKİ GÜNLERDE KALAN TÜM GÖREVLER
    // ══════════════════════════════════════════════════════════
    const todayIdx = DAYS_OF_WEEK.findIndex(d => d.key === todayDayKey);
    DAYS_OF_WEEK.forEach((d, idx) => {
      if (idx < todayIdx) {
        const dData = fullProcessedWeekMap[d.key];
        (dData?.items || []).forEach(item => {
          if (!item.done) {
            const key = String(item.uniqueKey || item.id || item.hwId || `${item.testId || ''}_${d.key}`);
            const cleanKey = key.replace(/^auto_hw_/, '').replace(/^book_test_/, '');
            const alreadyIn = Array.from(seen).some(k => k === key || k.includes(cleanKey) || (cleanKey && k === cleanKey));
            if (!alreadyIn) {
              seen.add(key);
              list.push({
                ...item,
                categoryType: item.taskType || 'program',
                sourceDayName: d.name,
                sourceDayKey: d.key,
                isCatchUp: true,
                reason: `${d.name} gününden kalan program görevi`
              });
            }
          }
        });
      }
    });

    // ══════════════════════════════════════════════════════════
    // 4. DİĞER TÜM GECİKEN ÖDEVLER & DENEME SINAVLARI
    // ══════════════════════════════════════════════════════════
    (pendingTasks || []).forEach(task => {
      const dueDateObj = task.dueDateObj || parseSafeDate(task.dueDate);
      if (dueDateObj && dueDateObj.getTime() < nowTime) {
        const key = String(task.id || task.hwId || task.testId);
        const hwCleanKey = key.replace(/^hw_/, '').replace(/^auto_hw_/, '').replace(/^book_test_/, '');
        const alreadyIn = Array.from(seen).some(k => k === key || k === hwCleanKey || k.includes(hwCleanKey));
        if (!alreadyIn) {
          seen.add(key);
          const isExam = task.isExamTask || task.taskType === 'deneme' || task.type === 'physicalExam';
          list.push({
            ...task,
            isCatchUp: true,
            isOverdueHomework: true,
            categoryType: isExam ? 'deneme' : 'ödev',
            reason: isExam 
              ? `📊 Deneme Sınavı Gecikti (Son Teslim: ${task.dueDateStr})` 
              : `📝 Ödev Teslimi Gecikti (Son Teslim: ${task.dueDateStr})`
          });
        }
      }
    });

    return list;
  }, [selectedStudent, fullProcessedWeekMap, studyAssignments, studyPlans, homeworks, submissions, books, bookTests, pendingTasks, curData, todayDayKey]);

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

  /* ─── Hero Date & Task Stats for Top KPI Cards (Program + Ödevler) ─── */
  const taskStats = useMemo(() => {
    let totalCount = 0;
    let completedCount = 0;
    let overdueCount = 0;
    let pendingCount = 0;
    const seenKeys = new Set();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 1. Program Görevleri (Bugünün Programı veya Haftalık Program)
    const programItems = [];
    if (dayProgramInfo && Array.isArray(dayProgramInfo.items) && dayProgramInfo.items.length > 0) {
      programItems.push(...dayProgramInfo.items);
    } else {
      DAYS_OF_WEEK.forEach(day => {
        const dayData = fullProcessedWeekMap[day.key];
        if (dayData && Array.isArray(dayData.items)) {
          programItems.push(...dayData.items);
        }
      });
    }

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
      // Check if already counted in program tasks
      const isAlreadyCounted = Array.from(seenKeys).some(k => k === hwKey || k === hwCleanKey || k.includes(hwKey) || (hwCleanKey && k.includes(hwCleanKey)));
      if (isAlreadyCounted) return;
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
  }, [dayProgramInfo, fullProcessedWeekMap, tests]);

  
  const studentGamification = useMemo(() => {
    if (!selectedStudent) return null;
    return computeStudentGamificationData({
      studentId: selectedStudent.id,
      submissions,
      homeworks,
      books,
      bookTests,
      mockExams: selectedStudent ? getMockExamsForStudent(selectedStudent.id) : [],
      studySessions: []
    });
  }, [selectedStudent, submissions, homeworks, books, bookTests]);

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
    <div className="student-dashboard-page" style={{ paddingBottom: isMobile ? 'calc(75px + env(safe-area-inset-bottom) + 20px)' : '0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        .student-dashboard-page {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
          box-sizing: border-box;
        }
        .student-dashboard-page * {
          box-sizing: border-box;
        }
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
        .sd-card { transition: all 0.25s ease; box-sizing: border-box; max-width: 100%; }
        .sd-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(99, 102, 241, 0.15) !important; border-color: #818cf8 !important; }
        .sd-kpi { transition: all 0.22s cubic-bezier(0.4,0,0.2,1); cursor: pointer; position: relative; overflow: hidden; box-sizing: border-box; min-width: 0; }
        .sd-kpi::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%); border-radius: inherit; pointer-events: none; }
        .sd-kpi:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 18px 48px rgba(0,0,0,0.45) !important; }
        .sd-kpi:active { transform: scale(0.96); }
        .sd-success { transition: all 0.25s cubic-bezier(0.4,0,0.2,1); cursor: pointer; }
        .sd-success:hover { transform: scale(1.08) rotate(2deg); }
        .sd-online { animation: onlinePulse 2.2s ease-in-out infinite; }
        .sd-avatar-ring { animation: ringRotate 8s linear infinite; }
        .sd-grid-layout { display: grid; grid-template-columns: minmax(0, 1.22fr) minmax(0, 0.98fr); gap: 1.75rem; align-items: start; width: 100%; max-width: 100%; box-sizing: border-box; }
        @media (max-width: 1100px) { .sd-grid-layout { grid-template-columns: 1fr; gap: 1.25rem; } }
        .sd-hide-scrollbar::-webkit-scrollbar { display: none; }
        .sd-hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 99px; } ::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.3); border-radius: 99px; }
      `}</style>

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
                <div style={{
                  background: hasCoach ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.1)',
                  backdropFilter:'blur(16px)',
                  border: hasCoach ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.2)',
                  borderRadius:999,
                  padding: isMobile ? '2px 7px' : '5px 15px',
                  fontSize: isMobile ? '0.62rem' : '0.78rem',
                  fontWeight:800,
                  color: hasCoach ? '#86efac' : 'rgba(255,255,255,0.9)',
                  display:'inline-flex', alignItems:'center', gap:4,
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
                if (s) setSelectedStudent(s);
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
            { label:'GECİKTİ',   value: taskStats.overdueCount,         emoji:'🔥', grad:'linear-gradient(160deg,#e11d48,#be123c)',   glow:'rgba(239,68,68,0.55)',   route:'/student/homeworks' },
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
              badge: pendingCount > 0 ? pendingCount : null,
              badgeBg: '#e11d48',
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
            submissions={submissions}
            homeworks={homeworks}
            books={books}
            bookTests={bookTests}
            mockExams={selectedStudent ? getMockExamsForStudent(selectedStudent.id) : []}
            studySessions={[]}
            users={users}
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
                    navigate(`/student/study-plan/${task.roadmapAssignmentId}`);
                    return;
                  }
                  
                  const hwObj = (homeworks || []).find(h => String(h.id) === String(task.hwId || task.id));
                  const matchingBook = books?.find(b => String(b.id) === String(hwObj?.bookId || task.bookId));
                  const isExam = task.isExamTask || task.taskType === 'deneme' || task.type === 'physicalExam' || hwObj?.type === 'physicalExam' || hwObj?.contentType === 'physicalExam' || matchingBook?.bookType === 'exam' || hwObj?.isPhysical;
                  
                  if (isExam) {
                    navigate(`/physical-exam/${task.hwId || task.realTestId || task.id}?studentId=${selectedStudent.id}`);
                    return;
                  }

                  const isBook = Boolean(
                    task.isBookTask ||
                    task.taskType === 'kitap' ||
                    task.sourceType === 'trackedBook' ||
                    hwObj?.isBookAssignment ||
                    (task.bookTestId && String(task.bookTestId).startsWith('tbt_')) ||
                    (task.testId && String(task.testId).startsWith('tbt_'))
                  );

                  if (isBook) {
                    const targetBookTestId = (task.bookTestId && String(task.bookTestId).startsWith('tbt_') ? task.bookTestId : null) ||
                      (task.testId && String(task.testId).startsWith('tbt_') ? task.testId : null) ||
                      (hwObj?.tests && hwObj.tests.length > 0 ? hwObj.tests[0] : null) ||
                      task.bookTestId || task.testId;
                    if (targetBookTestId) {
                      navigate(`/book-quiz/${targetBookTestId}?studentId=${selectedStudent.id}`);
                      return;
                    }
                  }

                  // Normal Homework Quiz
                  const quizTargetId = task.realTestId || task.hwId || task.id || task.testId;
                  if (quizTargetId) {
                    navigate(`/quiz/${quizTargetId}?studentId=${selectedStudent.id}`);
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
              <PeriodicQuestionAnalytics
                homeworkSubmissions={otherHomeworkSubmissions}
                mockExams={generalTrialExams}
                studentName={selectedStudent?.name || 'Öğrenci'}
              />
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
              onDeleteTest={handleDeleteRecentTest}
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
  );
}
