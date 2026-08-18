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
import { isHomeworkForStudent, sortItemsByBookOrder, computeStudentAnalyticsData } from '../utils/testResolver';
import { toUUID } from '../services/supabaseService';
import PeriodicQuestionAnalytics from '../components/PeriodicQuestionAnalytics';

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
  'Genel Testler':        { icon: ClipboardList, color: '#6366f1', bg: '#eff6ff', border: '#c7d2fe', badge: '#4f46e5' },
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

const avatarColors = ['#6366f1', '#3b82f6', '#10b981', '#f97316', '#a855f7', '#f43f5e'];

const BOOK_PALETTES = [
  { gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: '#818cf8', shadow: 'rgba(99, 102, 241, 0.35)' },
  { gradient: 'linear-gradient(135deg, #059669, #10b981)', border: '#34d399', shadow: 'rgba(16, 185, 129, 0.35)' },
  { gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', border: '#fbbf24', shadow: 'rgba(245, 158, 11, 0.35)' },
  { gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)', border: '#fb7185', shadow: 'rgba(244, 63, 94, 0.35)' },
  { gradient: 'linear-gradient(135deg, #7c3aed, #9333ea)', border: '#c084fc', shadow: 'rgba(147, 51, 234, 0.35)' },
  { gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', border: '#38bdf8', shadow: 'rgba(6, 182, 212, 0.35)' },
];

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
  Soru:   { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.18)',    text: '#fb7185', border: 'rgba(244, 63, 94, 0.35)', icon: Target,      unit: 'soru', step: 10 },
  Sayfa:  { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)',   text: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)', icon: BookOpen,    unit: 'sayfa', step: 5 },
  Konu:   { color: '#c084fc', bg: 'rgba(192, 132, 252, 0.18)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.35)', icon: Brain,       unit: 'konu', step: 1 },
  Dakika: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.18)',  text: '#34d399', border: 'rgba(52, 211, 153, 0.35)', icon: Timer,       unit: 'dk', step: 15 },
  Net:    { color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.18)',   text: '#22d3ee', border: 'rgba(34, 211, 238, 0.35)', icon: TrendingUp, unit: 'net', step: 1 },
  Puan:   { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.18)',   text: '#fbbf24', border: 'rgba(251, 191, 36, 0.35)', icon: Trophy,     unit: 'puan', step: 5 },
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

    const hwTests = (homeworks || []).filter(hw => {
      return isHomeworkForStudent(hw, selectedStudent, gradesList);
    }).flatMap(hw => {
      const bookObj = books.find(b => String(b.id) === String(hw.bookId));
      const isExam = hw.type === 'physicalExam' || hw.contentType === 'physicalExam' || bookObj?.bookType === 'exam' || hw.isPhysical;
      const hwCreatedTime = hw.createdAt ? new Date(hw.createdAt).getTime() : 0;

      if (isExam) {
        const sub = (hw.submissions || []).find(s => String(s.studentId) === String(selectedStudent.id) && s.status !== 'in_progress' && s.status !== 'draft') ||
          submissions.find(s => {
            if (String(s.studentId) !== String(selectedStudent.id) || s.status === 'in_progress' || s.status === 'draft') return false;
            const matches = (
              String(s.hwId) === String(hw.id) ||
              String(s.homeworkId) === String(hw.id) ||
              String(s.testId) === String(hw.id) ||
              String(s.id) === String(hw.id) ||
              (bookObj && (String(s.testId) === String(bookObj.id) || String(s.bookId) === String(bookObj.id)))
            );
            if (!matches) return false;
            if (hwCreatedTime && s.submittedAt && hw.retakeCount && hw.retakeCount > 0) {
              return new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000);
            }
            return true;
          });

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

      const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || (hw.bookId && bookObj);

      if (isBook) {
        const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

        let testIdsList = [];
        const hasTestDueDates = hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0;

        if (hasTestDueDates) {
          testIdsList = Object.entries(hw.testDueDates)
            .filter(([_, dStr]) => dStr && String(dStr).trim() !== '')
            .map(([tId, _]) => tId);
        } else if (Array.isArray(hw.tests) && hw.tests.length > 0) {
          testIdsList = hw.tests;
        } else if (bookObj) {
          const allBookTests = bookTests.filter(bt => String(bt.bookId) === String(bookObj.id));
          if (allBookTests.length > 0) testIdsList = allBookTests.map(bt => bt.id);
        }

        if (testIdsList.length > 0) {
          return testIdsList.map((testId, idx) => {
            const testObj = bookTests.find(b => String(b.id) === String(testId));
            const tDateStr = hw.testDueDates?.[testId] || hw.dueDate || hw.assignedDueDate;
            const tIdStr = String(testId);
            const tUuidStr = String(toUUID(testId) || '');
            const studentIdStr = String(selectedStudent.id);
            const studentUuidStr = String(toUUID(selectedStudent.id) || '');

            const sub = (hw.submissions || []).find(s => {
              const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr);
              if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
              return String(s.testId) === tIdStr || String(s.bookTestId) === tIdStr || String(s.realTestId) === tIdStr || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr));
            }) || submissions.find(s => {
              const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr) || (studentUuidStr && toUUID(s.studentId) === studentUuidStr);
              if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
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
              const matches = matchFields.some(f => f && (f === tIdStr || (tUuidStr && f === tUuidStr) || toUUID(f) === tIdStr || (tUuidStr && toUUID(f) === tUuidStr)));
              if (!matches) return false;
              if (hwCreatedTime && s.submittedAt && hw.retakeCount && hw.retakeCount > 0) {
                return new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000);
              }
              return true;
            });

            const subjObj = (bookObj?.subjects || []).find(s => String(s.id) === String(testObj?.subjectId));
            const subjectName = subjObj?.name || hw.subject || cleanBookTitle;
            const testName = testObj?.name || (testIdsList.length > 1 ? `Test ${idx + 1}` : 'Test');

            return {
              ...hw,
              id: `bt_${hw.id}_${testId}`,
              realTestId: testId,
              testId: testId,
              bookTestId: testId,
              hwId: hw.id,
              bookId: hw.bookId || bookObj?.id,
              sourceType: 'trackedBook',
              isBookAssignment: true,
              subject: subjectName,
              bookTitle: cleanBookTitle,
              testName: testName,
              title: `${cleanBookTitle} — ${testName}`,
              dueDate: tDateStr,
              status: sub ? 'Sonuçlandı' : 'Atandı',
              questionCount: testObj?.questionCount || 20,
              correctAnswers: sub ? (sub.score || 0) : 0,
              submissionId: sub?.id || sub?.supabaseId
            };
          });
        }
      }

      if (Array.isArray(hw.tests) && hw.tests.length > 1) {
        return hw.tests.map((testId, idx) => {
          const tIdStr = String(testId);
          const tUuidStr = String(toUUID(testId) || '');

          const sub = (hw.submissions || []).find(s =>
            String(s.studentId) === String(selectedStudent.id) &&
            s.status !== 'in_progress' && s.status !== 'draft' &&
            (String(s.testId) === tIdStr || String(s.realTestId) === tIdStr || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr)))
          ) || submissions.find(s => {
            if (String(s.studentId) !== String(selectedStudent.id) || s.status === 'in_progress' || s.status === 'draft') return false;
            const matchFields = [
              String(s.testId || ''),
              String(s.realTestId || ''),
              String(s.metadata?.realTestId || ''),
              String(s.metadata?.realId || '')
            ];
            const matches = matchFields.some(f => f && (f === tIdStr || (tUuidStr && f === tUuidStr)));
            if (!matches) return false;
            if (hwCreatedTime && s.submittedAt && hw.retakeCount && hw.retakeCount > 0) {
              return new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000);
            }
            return true;
          });

          return {
            ...hw,
            id: `hw_${hw.id}_${testId}`,
            realTestId: testId,
            testId: testId,
            hwId: hw.id,
            title: `${hw.title || hw.name || 'Ödev'} (Test ${idx + 1})`,
            status: sub ? 'Sonuçlandı' : 'Atandı',
            questionCount: hw.totalQuestions ? Math.round(hw.totalQuestions / hw.tests.length) : 10,
            correctAnswers: sub ? (sub.score || 0) : 0,
            submissionId: sub?.id
          };
        });
      }

      const sub = (hw.submissions || []).find(s => String(s.studentId) === String(selectedStudent.id) && s.status !== 'in_progress' && s.status !== 'draft') ||
        submissions.find(s => {
          if (String(s.studentId) !== String(selectedStudent.id) || s.status === 'in_progress' || s.status === 'draft') return false;
          const matches = (
            String(s.hwId) === String(hw.id) ||
            String(s.homeworkId) === String(hw.id) ||
            String(s.testId) === String(hw.id) ||
            String(s.id) === String(hw.id) ||
            (hw.questionIds && Array.isArray(hw.questionIds) && hw.questionIds.some(qid => String(s.testId) === String(qid) || String(s.realTestId) === String(qid))) ||
            (hw.sections && Array.isArray(hw.sections) && hw.sections.some(sec => String(s.testId) === String(sec.id || sec.questionId))) ||
            (bookObj && (String(s.testId) === String(bookObj.id) || String(s.bookId) === String(bookObj.id)))
          );
          if (!matches) return false;
          if (hwCreatedTime && s.submittedAt && hw.retakeCount && hw.retakeCount > 0) {
            return new Date(s.submittedAt).getTime() >= (hwCreatedTime - 60000);
          }
          return true;
        });

      return [{
        ...hw,
        status: sub ? 'Sonuçlandı' : 'Atandı',
        questionCount: hw.totalQuestions || 10,
        correctAnswers: sub ? (sub.score || 0) : 0,
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

  /* ─── Hero Date & Task Stats for Top KPI Cards ─── */
  const heroDateStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  }, []);

  const taskStats = useMemo(() => {
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
  }, [tests]);

  /* ─── Assigned Books Summary List for Student ─── */
  const assignedBooksList = useMemo(() => {
    if (!selectedStudent || !books || books.length === 0) return [];
    
    const studentIdStr = String(selectedStudent.id);
    const studentUuidStr = String(toUUID(selectedStudent.id) || '');

    const studentSubs = (submissions || []).filter(s => {
      const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr);
      return isMatchStudent && s.status !== 'in_progress' && s.status !== 'draft';
    });

    const solvedTestIds = new Set(studentSubs.map(s => String(s.bookTestId || s.testId || '')));

    return books.filter(b => b.bookType !== 'exam').map((book, idx) => {
      const testsInBook = (bookTests || []).filter(t => String(t.bookId) === String(book.id));
      const solvedCount = testsInBook.filter(t => solvedTestIds.has(String(t.id))).length;
      const totalTests = Math.max(testsInBook.length, 1);
      const pct = Math.round((solvedCount / totalTests) * 100);
      const nextTest = testsInBook.find(t => !solvedTestIds.has(String(t.id))) || testsInBook[0];

      return {
        ...book,
        totalTests: testsInBook.length,
        solvedCount,
        pct,
        nextTest,
        paletteIdx: idx
      };
    }).sort((a, b) => b.solvedCount - a.solvedCount);
  }, [selectedStudent, books, bookTests, submissions]);

  /* ─── Son Çözülen 5 Test ─── */
  const recentSolvedTests = useMemo(() => {
    if (!selectedStudent) return [];
    const studentIdStr = String(selectedStudent.id || '');
    const studentUuidStr = String(toUUID(selectedStudent.id) || '');

    const solvedList = [];
    const seenKeys = new Set();

    (submissions || []).forEach(sub => {
      const isMatch = String(sub.studentId) === studentIdStr || (studentUuidStr && String(sub.studentId) === studentUuidStr);
      if (!isMatch || sub.status === 'in_progress' || sub.status === 'draft') return;

      const dateVal = sub.submittedAt || sub.createdAt || sub.updatedAt;
      const testId = sub.testId || sub.bookTestId || sub.realTestId || sub.id;
      const key = `${sub.id || testId}_${dateVal}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const targetBook = (books || []).find(b => String(b.id) === String(sub.bookId));
      const targetTest = (bookTests || []).find(t => String(t.id) === String(sub.bookTestId || sub.testId));

      const subjObj = (targetBook?.subjects || []).find(s => String(s.id) === String(targetTest?.subjectId));
      const cleanBookTitle = (targetBook?.title || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

      const title = sub.testTitle || targetTest?.name || sub.title || 'Test Çözümü';
      const subject = subjObj?.name || sub.subject || targetBook?.subject || cleanBookTitle || 'Ders';

      const qCount = sub.totalQuestions || targetTest?.questionCount || (Array.isArray(sub.questions) ? sub.questions.length : 20);
      const cCount = sub.correctCount !== undefined ? sub.correctCount : (sub.score !== undefined ? sub.score : 0);
      const wCount = sub.wrongCount !== undefined ? sub.wrongCount : 0;
      const eCount = sub.emptyCount !== undefined ? sub.emptyCount : Math.max(0, qCount - (cCount + wCount));

      const pct = qCount > 0 ? Math.round((cCount / qCount) * 100) : (typeof sub.score === 'number' ? sub.score : 0);

      solvedList.push({
        id: sub.id || testId,
        testId: sub.testId || testId,
        submissionId: sub.id,
        title,
        subject,
        subTitle: cleanBookTitle && cleanBookTitle !== subject ? cleanBookTitle : null,
        date: dateVal,
        correctCount: cCount,
        wrongCount: wCount,
        emptyCount: eCount,
        totalQuestions: qCount,
        pct: Math.min(100, Math.max(0, pct)),
        type: sub.type || (sub.bookTestId ? 'kitap' : 'test'),
        isPhysical: sub.type === 'physicalExam' || sub.isPhysical
      });
    });

    (homeworks || []).forEach(hw => {
      (hw.submissions || []).forEach(sub => {
        const isMatch = String(sub.studentId) === studentIdStr || (studentUuidStr && String(sub.studentId) === studentUuidStr);
        if (!isMatch || sub.status === 'in_progress' || sub.status === 'draft') return;

        const dateVal = sub.submittedAt || sub.createdAt || hw.createdAt;
        const key = `hw_${hw.id}_${sub.id || dateVal}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        const bookObj = (books || []).find(b => String(b.id) === String(hw.bookId));
        const cleanBookTitle = (bookObj?.title || hw.title || 'Ödev').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

        const qCount = hw.totalQuestions || sub.totalQuestions || 20;
        const cCount = sub.score !== undefined ? sub.score : (sub.correctCount || 0);
        const wCount = sub.wrongCount || 0;
        const eCount = Math.max(0, qCount - (cCount + wCount));
        const pct = qCount > 0 ? Math.round((cCount / qCount) * 100) : 0;

        solvedList.push({
          id: sub.id || hw.id,
          testId: hw.id,
          submissionId: sub.id,
          title: hw.title || 'Ödev Testi',
          subject: hw.subject || cleanBookTitle || 'Ödev',
          subTitle: cleanBookTitle && cleanBookTitle !== hw.subject ? cleanBookTitle : null,
          date: dateVal,
          correctCount: cCount,
          wrongCount: wCount,
          emptyCount: eCount,
          totalQuestions: qCount,
          pct: Math.min(100, Math.max(0, pct)),
          type: hw.isBookAssignment ? 'kitap' : 'ödev',
          isPhysical: hw.type === 'physicalExam' || hw.isPhysical
        });
      });
    });

    return solvedList
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 5);
  }, [selectedStudent, submissions, homeworks, books, bookTests]);


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
          const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || hw.bookId;
          const bookObj = (books || []).find(b => String(b?.id) === String(hw.bookId));
          const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

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
            const subStudentId = String(s.studentId || s.student_id || s.user_id || '');
            return subStudentId === studentIdStr ||
              (studentUuidStr && subStudentId === studentUuidStr) ||
              toUUID(subStudentId) === studentIdStr ||
              (studentUuidStr && toUUID(subStudentId) === studentUuidStr);
          };

          const sub = (hw.submissions || []).find(s => isMatchStudent(s) && s.status !== 'in_progress' && s.status !== 'draft') ||
            (submissions || []).find(s => (s.hwId === hw.id || s.testId === hw.id || String(s.testId) === String(hw.id)) && isMatchStudent(s) && s.status !== 'in_progress' && s.status !== 'draft');
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

            if (Array.isArray(hw.tests) && hw.tests.length > 1) {
              hw.tests.forEach((testId, idx) => {
                const tIdStr = String(testId);
                const tUuidStr = String(toUUID(testId) || '');
                const isTestSolved = (submissions || []).some(s => {
                  if (!s || !isMatchStudent(s)) return false;
                  if (s.status === 'in_progress' || s.status === 'draft') return false;
                  const subFields = [s.testId, s.realTestId, s.bookTestId, s.metadata?.realTestId, s.metadata?.bookTestId, s.metadata?.realId, s.hwId, s.homeworkId, s.id].filter(Boolean).map(String);
                  if (Array.isArray(s.bookTestIds)) s.bookTestIds.forEach(bid => { if (bid) subFields.push(String(bid)); });
                  return subFields.some(sf => sf === tIdStr || (tUuidStr && sf === tUuidStr) || toUUID(sf) === tIdStr || (tUuidStr && toUUID(sf) === tUuidStr));
                }) || Boolean(
                  hw.submissions && Array.isArray(hw.submissions) && hw.submissions.some(s => isMatchStudent(s) && s.status !== 'in_progress' && s.status !== 'draft' && (String(s.testId) === tIdStr || String(s.realTestId) === tIdStr))
                );

                const tObj = (bookTests || []).find(b => String(b?.id) === tIdStr);
                const testTitle = tObj?.name || `Test ${idx + 1}`;
                const exists = dayManualItems.some(m => m.id === `auto_hw_${hw.id}_${testId}` || m.hwId === hw.id);
                if (!exists) {
                  autoHwItems.push({
                    id: `auto_hw_${hw.id}_${testId}`,
                    hwId: hw.id,
                    testId: testId,
                    isAutoHomework: true,
                    taskType: isBook ? 'kitap' : 'ödev',
                    subject: hw.subject || 'Atanan Kitap/Ödev',
                    title: `${hw.title || 'Ödev'} — ${testTitle}`,
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
                  autoHwItems.push({
                    id: `roadmap_top_${assignment.id}_${topic.id}`,
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
            });
          });
        });

        const allItems = sortItemsByBookOrder([...autoHwItems, ...dayManualItems, ...scheduleItems], books, bookTests);
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
        const baseItem = isObj ? taskOrId : { id: taskId };
        updatedWeeklyProgram = DAYS_OF_WEEK.map(dMeta => {
          const row = rawWeekly.find(r => r.day === dMeta.key) || { day: dMeta.key, items: [] };
          if (dMeta.key === activeDayKey) {
            return {
              ...row,
              items: [...(row.items || []), { ...baseItem, done: true }]
            };
          }
          return row;
        });
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

  const completedCount = tests.filter(t => t.status === 'Sonuçlandı').length;
  const overdueCount = pendingTasks.filter(t => isPast(t.dueDateObj) && !isToday(t.dueDateObj)).length;
  const pendingCount = pendingTasks.length;
  const gradeLabel = curData?.grades?.find(g => g.id === selectedStudent?.gradeId)?.name || '';
  const avatarColor = avatarColors[studentMembers.findIndex(s => s.id === selectedStudent?.id) % avatarColors.length] || '#6366f1';
  const todayStr = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  const studentGoals = useMemo(() => {
    if (!selectedStudent) return [];
    return goals.filter(g => String(g.studentId) === String(selectedStudent.id));
  }, [goals, selectedStudent]);

  const solvedQuestionsStats = useMemo(() => {
    if (!selectedStudent) return { today: 0, thisWeek: 0, thisMonth: 0, total: 0 };

    const studentIdStr = String(selectedStudent.id);
    const studentUuidStr = String(toUUID(selectedStudent.id) || '');
    const todayYMD = formatLocalYMD(new Date());

    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let totalCount = 0;

    const countedSubIds = new Set();

    (submissions || []).forEach(s => {
      const isMatch = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr);
      if (!isMatch || s.status === 'in_progress' || s.status === 'draft') return;

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
      const subDate = dateStr ? new Date(dateStr) : null;

      totalCount += qCount;

      if (subDate && !isNaN(subDate.getTime())) {
        const subYMD = formatLocalYMD(subDate);
        if (subYMD === todayYMD || isToday(subDate)) {
          todayCount += qCount;
        }
        if (subDate >= startOfWeek) {
          weekCount += qCount;
        }
        if (subDate >= startOfMonth) {
          monthCount += qCount;
        }
      }
    });

    (homeworks || []).forEach(hw => {
      (hw.submissions || []).forEach(sub => {
        const isMatch = String(sub.studentId || sub.student_id || sub.user_id) === studentIdStr || (studentUuidStr && String(sub.studentId || sub.student_id || sub.user_id) === studentUuidStr);
        if (!isMatch || sub.status === 'in_progress' || sub.status === 'draft') return;

        const subId = sub.id || `hw_${hw.id}_${studentIdStr}`;
        if (countedSubIds.has(subId)) return;
        countedSubIds.add(subId);

        let qCount = Number(hw.totalQuestions || sub.totalQuestions || (Array.isArray(sub.answers) ? sub.answers.length : 0) || 10);
        const dateStr = sub.completedAt || sub.submittedAt || sub.createdAt || hw.createdAt;
        const subDate = dateStr ? new Date(dateStr) : null;

        totalCount += qCount;

        if (subDate && !isNaN(subDate.getTime())) {
          const subYMD = formatLocalYMD(subDate);
          if (subYMD === todayYMD || isToday(subDate)) {
            todayCount += qCount;
          }
          if (subDate >= startOfWeek) {
            weekCount += qCount;
          }
          if (subDate >= startOfMonth) {
            monthCount += qCount;
          }
        }
      });
    });

    const profile = getCoachingProfileForStudent(selectedStudent.id);
    if (profile?.dailyLogs && Array.isArray(profile.dailyLogs)) {
      profile.dailyLogs.forEach(log => {
        if (!log.date) return;
        const logDate = new Date(log.date);
        const logQCount = Number(log.questionCount || log.questionsCount || 0);
        if (logQCount > 0 && !isNaN(logDate.getTime())) {
          const logYMD = formatLocalYMD(logDate);
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
  }, [selectedStudent, submissions, homeworks, tests, getCoachingProfileForStudent]);

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
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(244, 63, 94, 0.05) 0%, transparent 45%), #f8fafc',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#0f172a',
      paddingBottom: '5rem'
    }}>
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
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: 22,
          padding: isMobile ? '0.85rem 0.75rem' : '1.1rem 1.4rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 20px rgba(100, 116, 139, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={17} color="#4f46e5" />
              </div>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>
                  Haftalık Çalışma & Görev Takvimi
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginLeft: 8 }}>
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
                      ? '#e0e7ff'
                      : '#f8fafc',
                    border: isSelected
                      ? '2px solid #6366f1'
                      : isCurrentToday
                      ? '1.5px solid #6366f1'
                      : '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: isMobile ? '0.5rem 0.15rem' : '0.7rem 0.5rem',
                    color: isSelected ? '#ffffff' : isCurrentToday ? '#4338ca' : '#334155',
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
                    color: isSelected ? '#ffffff' : isCurrentToday ? '#4338ca' : '#64748b',
                    background: isSelected ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
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
                    <span style={{ fontSize: isMobile ? '0.50rem' : '0.62rem', fontWeight: 800, color: isSelected ? '#ffffff' : '#4f46e5' }}>
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
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: 22,
                padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem',
                boxShadow: '0 4px 20px rgba(100, 116, 139, 0.08)',
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
                      <span style={{ fontSize: '1.02rem', fontWeight: 900, color: '#0f172a' }}>
                        {dayProgramInfo.isToday ? '🎯 Bugün Ne Yapacağım?' : `📅 ${dayProgramInfo.dayName} Görevleri`}
                      </span>
                      {dayProgramInfo.fullDateLabel && (
                        <div style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 700, marginTop: 1 }}>
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
                      background: dayProgramInfo.hasAllCompleted ? '#dcfce7' : '#e0e7ff',
                      color: dayProgramInfo.hasAllCompleted ? '#16a34a' : '#4338ca',
                      border: dayProgramInfo.hasAllCompleted ? '1px solid #86efac' : '1px solid #c7d2fe'
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
                          if (task.testId) { navigate(`/book-quiz/${task.testId}?studentId=${selectedStudent.id}`); return; }
                          if (task.hwId) {
                            const hwObj = (homeworks || []).find(h => String(h.id) === String(task.hwId));
                            const matchingBook = books?.find(b => String(b.id) === String(hwObj?.bookId));
                            const isExam = hwObj?.type === 'physicalExam' || hwObj?.contentType === 'physicalExam' || matchingBook?.bookType === 'exam' || hwObj?.isPhysical;
                            if (isExam) navigate(`/physical-exam/${task.hwId}?studentId=${selectedStudent.id}`);
                            else if (hwObj?.isBookAssignment && hwObj?.tests?.length > 0) navigate(`/book-quiz/${hwObj.tests[0]}?studentId=${selectedStudent.id}`);
                            else navigate(`/quiz/${task.hwId}?studentId=${selectedStudent.id}`);
                            return;
                          }
                          handleToggleTask(task);
                        };

                        return (
                          <div
                            key={task.id || idx}
                            onClick={handleTaskClick}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              background: task.done ? '#f0fdf4' : '#f8fafc',
                              border: task.done ? '1px solid #86efac' : '1px solid #e2e8f0',
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
                                  border: task.done ? 'none' : '1.5px solid #94a3b8',
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
                                      color: '#2563eb',
                                      background: '#dbeafe',
                                      border: '1px solid #bfdbfe',
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
                                    color: task.done ? '#94a3b8' : '#0f172a',
                                    textDecoration: task.done ? 'line-through' : 'none',
                                    wordBreak: 'break-word',
                                    lineHeight: 1.3
                                  }}>
                                    {task.title || task.testName || task.topic || 'Ders Çalışması'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: '0.68rem', color: '#64748b', fontWeight: 600, marginTop: 3 }}>
                                  {task.bookTitle && (
                                    <span style={{ color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 140 : 200 }}>
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
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1.5px dashed #a5b4fc',
                          borderRadius: 12,
                          padding: '0.55rem 0.8rem',
                          color: '#4f46e5',
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
                  <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: 16, border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic' }}>
                      {dayProgramInfo.isToday ? 'Bugün için kayıtlı görev yok. Harika gidiyorsun! 🎉' : `${dayProgramInfo.dayName} günü için görev bulunamadı.`}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <Link to="/my-program" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Haftalık Programa Git <ChevronRight size={13} />
                </Link>
              </div>
            </div>

            {/* 📋 BÖLÜM 1: ÖDEVLERİM & GÖREV TAKİBİ */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: 20,
              padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem',
              boxShadow: '0 4px 18px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>
                    📋
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      Ödevlerim & Görev Takibi
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                      Öğretmeniniz veya koçunuz tarafından atanan ödevlerin durumu
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/student/homeworks')}
                  style={{
                    background: pendingCount > 0 ? '#fee2e2' : '#dcfce7',
                    color: pendingCount > 0 ? '#dc2626' : '#16a34a',
                    border: pendingCount > 0 ? '1px solid #fca5a5' : '1px solid #86efac',
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

              {homeworkSummaryGroups.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>🎉</div>
                  <div style={{ fontWeight: 800, color: tests.length > 0 ? '#16a34a' : '#0f172a', fontSize: '0.92rem', marginBottom: 4 }}>
                    {tests.length > 0 ? 'Tüm Ödevler Başarıyla Tamamlandı!' : 'Henüz atanmış bir ödeviniz yok'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {tests.length > 0
                      ? 'Çözülmeyi bekleyen aktif ödeviniz bulunmuyor. Geçmiş ödevlerinizi görmek için tıklayın.'
                      : 'Öğretmeniniz veya koçunuz yeni ödev atadığında burada listelenecektir.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {homeworkSummaryGroups.map(group => (
                    <div
                      key={group.id}
                      onClick={() => navigate('/student/homeworks')}
                      className="sd-card"
                      style={{
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: 16,
                        padding: '1rem 1.15rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                          {group.title}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: group.pct === 100 ? '#16a34a' : '#dc2626' }}>
                          %{group.pct}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ height: 7, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{
                          height: '100%',
                          width: `${group.pct}%`,
                          background: group.pct === 100 ? 'linear-gradient(90deg, #22c55e, #10b981)' : 'linear-gradient(90deg, #f97316, #ef4444)',
                          borderRadius: 99,
                          transition: 'width 0.8s ease'
                        }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                        <span>{group.doneCount} / {group.totalCount} Test Tamamlandı {group.pendingCount > 0 && <span style={{ color: '#dc2626', fontWeight: 800 }}>({group.pendingCount} Bekleyen)</span>}</span>
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 800 }}>
                          Detayları Gör <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 📝 BÖLÜM 2: SON ÇÖZÜLEN TESTLER */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: 20,
              padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem',
              boxShadow: '0 4px 18px rgba(0,0,0,0.03)'
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
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      Son Çözülen Testler
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                      Son tamamlanan 5 test ve başarı analizleriniz
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/student/results')}
                  className="sd-btn"
                  style={{
                    background: '#dcfce7',
                    color: '#16a34a',
                    border: '1px solid #86efac',
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

              {recentSolvedTests.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>📊</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem', marginBottom: 4 }}>
                    Henüz tamamlanmış bir test bulunmuyor
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Kitap testlerinizi veya atanan ödevlerinizi çözdüğünüzde sonuçlarınız burada listelenecektir.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recentSolvedTests.map((test, idx) => {
                    const pctColor = test.pct >= 80 ? '#16a34a' : test.pct >= 60 ? '#d97706' : '#dc2626';
                    const pctBg = test.pct >= 80 ? '#dcfce7' : test.pct >= 60 ? '#fef3c7' : '#fee2e2';
                    const pctBorder = test.pct >= 80 ? '#86efac' : test.pct >= 60 ? '#fde68a' : '#fca5a5';

                    return (
                      <div
                        key={test.id || idx}
                        onClick={() => navigate('/student/results')}
                        className="sd-card"
                        style={{
                          background: '#f8fafc',
                          border: '1.5px solid #e2e8f0',
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                            <span style={{
                              background: '#e0e7ff',
                              color: '#4338ca',
                              border: '1px solid #c7d2fe',
                              borderRadius: 6,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '1px 6px'
                            }}>
                              {test.subject}
                            </span>
                            {test.date && (
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                                🕐 {new Date(test.date).toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>

                          <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0f172a', lineHeight: 1.35, wordBreak: 'break-word' }}>
                            {test.title}
                          </div>
                          {test.subTitle && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                              {test.subTitle}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                            <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              ✓ {test.correctCount} D
                            </span>
                            <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              ✗ {test.wrongCount} Y
                            </span>
                            {test.emptyCount > 0 && (
                              <span style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                ○ {test.emptyCount} B
                              </span>
                            )}
                            <span style={{ color: '#475569', opacity: 0.8 }}>
                              • {test.totalQuestions} Soru
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
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

                          <span style={{ color: '#4f46e5', display: 'flex', alignItems: 'center' }}>
                            <ChevronRight size={16} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🗺️ BÖLÜM 3: YOL HARİTAM & KONU TAKİBİ */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: 20,
              padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem',
              boxShadow: '0 4px 18px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
                    🗺️
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      Yol Haritam & Konu Takibi
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                      Müfredat ve hedef sınav konu tamamlama ilerlemeniz
                    </span>
                  </div>
                </div>

                <span style={{ background: '#f3e8ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 99, padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 900 }}>
                  {myRoadmaps.length} Harita
                </span>
              </div>

              {myRoadmaps.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>🎯</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem', marginBottom: 4 }}>
                    Henüz atanmış bir yol haritanız yok
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
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
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: 16,
                        padding: '1rem 1.15rem',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#0f172a' }}>
                          {plan.title}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#7c3aed' }}>
                          %{pct}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ height: 7, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #38bdf8, #a855f7)', borderRadius: 99, transition: 'width 0.8s ease' }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                        <span>{doneTopics} / {totalTopics} Konu Tamamlandı</span>
                        <span style={{ color: '#4f46e5', display: 'flex', alignItems: 'center', gap: 2 }}>
                          Detayları Gör <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  ))}
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
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: 20,
              padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem',
              boxShadow: '0 4px 18px rgba(0,0,0,0.03)'
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
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                        Hedef Takip Panosu
                      </h2>
                      {goalTrackingData.totalItemsCount > 0 && (
                        <span style={{
                          background: '#f3e8ff',
                          color: '#7c3aed',
                          border: '1px solid #ddd6fe',
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
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
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
                    <span style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 600 }}>
                      Sınav, net, soru ve alışkanlık hedefleriniz
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/goals')}
                  className="sd-btn"
                  style={{
                    background: '#f3e8ff',
                    border: '1px solid #ddd6fe',
                    color: '#7c3aed',
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
                          background: '#f8fafc',
                          border: `1.5px solid #e2e8f0`,
                          borderRadius: 14,
                          padding: '0.75rem 0.95rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              background: '#e0e7ff',
                              color: '#4338ca',
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
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {g.title}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isDone ? '#16a34a' : '#4f46e5' }}>
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
                                  background: '#e0e7ff',
                                  border: '1px solid #c7d2fe',
                                  color: '#4338ca',
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
                        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: isDone ? 'linear-gradient(90deg, #22c55e, #10b981)' : `linear-gradient(90deg, ${t.color}, #a855f7)`,
                            borderRadius: 99,
                            transition: 'width 0.8s ease'
                          }} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
                          <span>
                            {currentVal} / {g.target} {t.unit}
                            {g.type === 'Soru' && g.autoSystemValue > 0 && (
                              <span style={{ marginLeft: 5, color: '#e11d48', fontWeight: 800, fontSize: '0.62rem' }}>
                                (🔄 {g.autoSystemValue} sistemden)
                              </span>
                            )}
                          </span>
                          <span style={{ color: isDone ? '#16a34a' : '#64748b' }}>
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
                    <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: '#1e293b' }}>
                      <span style={{ fontSize: '0.85rem' }}>⚡</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {item.text}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#e11d48', background: '#fee2e2', padding: '1px 5px', borderRadius: 4 }}>
                        Günlük
                      </span>
                    </div>
                  ))}

                  {goalTrackingData.weekly.slice(0, 2).map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: '#1e293b' }}>
                      <span style={{ fontSize: '0.85rem' }}>✨</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {item.text}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#7c3aed', background: '#f3e8ff', padding: '1px 5px', borderRadius: 4 }}>
                        Haftalık
                      </span>
                    </div>
                  ))}

                  {goalTrackingData.monthly.slice(0, 2).map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: '#1e293b' }}>
                      <span style={{ fontSize: '0.85rem' }}>📅</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {item.text}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '1px 5px', borderRadius: 4 }}>
                        Aylık
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!goalTrackingData.hasAnyGoals && (
                <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 4 }}>🎯</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem', marginBottom: 3 }}>
                    Henüz Hedef Belirlenmedi
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 10 }}>
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
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: 22,
              padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem',
              boxShadow: '0 4px 20px rgba(100, 116, 139, 0.08)'
            }}>
              {(() => {
                const currentQuote = DASHBOARD_QUOTES[dashQuoteIdx % DASHBOARD_QUOTES.length];
                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '1.1rem' }}>{currentQuote.emoji}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Günün İlhamı ({currentQuote.category})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDashQuoteIdx(p => p + 1)}
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.25rem 0.5rem', color: '#334155', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <RefreshCw size={11} /> Yeni
                      </button>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#1e293b', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>
                      "{currentQuote.quote}"
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.72rem', fontWeight: 800, color: '#7c3aed' }}>
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
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', backdropFilter:'blur(10px)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', zIndex:1000, padding: isMobile ? 0 : '1rem' }}>
          <div style={{ background:'#ffffff', border:'1.5px solid #cbd5e1', borderRadius: isMobile ? '24px 24px 0 0' : '24px', padding:'1.6rem', width:'100%', maxWidth: isMobile ? '100%' : 440, boxShadow:'0 32px 80px rgba(0,0,0,0.25)', animation:'sdFadeUp 0.3s ease', color: '#1e293b' }}>
            {isMobile && <div style={{ width:40, height:4, background:'#cbd5e1', borderRadius:99, margin:'0 auto 1.25rem' }} />}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
              <h2 style={{ fontWeight:900, fontSize:'1.05rem', color:'#0f172a', margin:0 }}>🎯 Yeni Hedef Ekle</h2>
              <button onClick={() => setShowGoalModal(false)} style={{ background:'#f1f5f9', border:'1px solid #cbd5e1', borderRadius:10, padding:'0.45rem', cursor:'pointer', display:'flex', color:'#334155' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveGoal} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
              <input placeholder="Hedef başlığı (örn: Günde 50 Matematik Sorusu)..." value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                style={{ padding:'0.8rem 1rem', borderRadius:14, border:'1.5px solid #cbd5e1', fontSize:'0.9rem', fontFamily:'inherit', outline:'none', background:'#f8fafc', color:'#0f172a', width:'100%' }} required />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <select value={newGoal.type} onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))}
                  style={{ padding:'0.75rem 0.9rem', borderRadius:14, border:'1.5px solid #cbd5e1', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', background:'#f8fafc', color:'#0f172a' }}>
                  {['Soru','Sayfa','Dakika'].map(v => <option key={v} value={v} style={{ background:'#ffffff', color:'#0f172a' }}>{v}</option>)}
                </select>
                <select value={newGoal.period} onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))}
                  style={{ padding:'0.75rem 0.9rem', borderRadius:14, border:'1.5px solid #cbd5e1', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', background:'#f8fafc', color:'#0f172a' }}>
                  {['Günlük','Haftalık','Aylık'].map(v => <option key={v} value={v} style={{ background:'#ffffff', color:'#0f172a' }}>{v}</option>)}
                </select>
              </div>
              <input type="number" min="1" placeholder="Hedef miktar" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))}
                style={{ padding:'0.8rem 1rem', borderRadius:14, border:'1.5px solid #cbd5e1', fontSize:'0.9rem', fontFamily:'inherit', outline:'none', background:'#f8fafc', color:'#0f172a', width:'100%' }} required />
              <button type="submit" className="sd-btn"
                style={{ padding:'0.9rem', borderRadius:14, background:'linear-gradient(135deg,#ea580c,#f97316)', color:'white', fontWeight:900, fontSize:'0.9rem', border:'none', cursor:'pointer', boxShadow:'0 6px 20px rgba(234,88,12,0.4)', marginTop:4 }}>
                Hedefi Kaydet ✓
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
