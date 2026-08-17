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
import { isHomeworkForStudent } from '../utils/testResolver';
import { toUUID } from '../services/supabaseService';

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
    // 1) Match ISO format YYYY-MM-DD
    const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    // 2) Match DD.MM.YYYY (Turkish date format: e.g. 16.08.2026 or "Hedef: 16.08.2026")
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
  const { getCoachingNoteForStudent, getMeetingsForStudent, getCoachingProfileForStudent, coachingLinks, saveCoachingProfile } = useCoaching();

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  // Active Selected Day in Week Navigator (defaults to Today)
  const currentDayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
  const todayDayKey = currentDayIndex === 0 ? 'Paz' : DAYS_OF_WEEK[currentDayIndex - 1].key;
  const [activeDayKey, setActiveDayKey] = useState(todayDayKey);

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

  /* ─── Homework Summary Groups for Dashboard Card (Yol Haritası style) ─── */
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

  /* ─── Overall Student Success Rate (%) ─── */
  const overallSuccessRate = useMemo(() => {
    const completedList = tests.filter(t => (t.status === 'Sonuçlandı' || t.status === 'Tamamlandı'));
    if (completedList.length > 0) {
      let totalScore = 0;
      let totalQuestions = 0;
      completedList.forEach(t => {
        const qCount = t.questionCount || 20;
        const cCount = t.correctAnswers || 0;
        totalQuestions += qCount;
        totalScore += cCount;
      });
      if (totalQuestions > 0) {
        return Math.round((totalScore / totalQuestions) * 100);
      }
    }

    const studentIdStr = String(selectedStudent?.id || '');
    const studentSubs = (submissions || []).filter(s => String(s.studentId) === studentIdStr && s.status !== 'in_progress' && s.status !== 'draft');
    if (studentSubs.length > 0) {
      let totalScore = 0;
      let count = 0;
      studentSubs.forEach(s => {
        if (typeof s.score === 'number' && s.totalQuestions && s.totalQuestions > 0) {
          totalScore += (s.score / s.totalQuestions) * 100;
          count++;
        } else if (typeof s.score === 'number') {
          totalScore += s.score;
          count++;
        }
      });
      if (count > 0) return Math.round(totalScore / count);
    }

    return 85;
  }, [tests, selectedStudent, submissions]);

  /* ─── 1-Click Resume Book & Next Test ─── */
  const resumeBookTest = useMemo(() => {
    if (!selectedStudent || !books || books.length === 0) return null;
    const studentSubs = (submissions || []).filter(s => {
      if (String(s.studentId) !== String(selectedStudent.id)) return false;
      return s.sourceType === 'trackedBook' || s.bookId || s.bookTestId;
    });

    if (studentSubs.length > 0) {
      const latestSub = [...studentSubs].sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0))[0];
      const targetBook = books.find(b => String(b.id) === String(latestSub.bookId));
      if (targetBook) {
        const testsInBook = (bookTests || []).filter(t => String(t.bookId) === String(targetBook.id));
        const uncompletedTest = testsInBook.find(t => !studentSubs.some(s => String(s.bookTestId || s.testId) === String(t.id)));
        if (uncompletedTest) {
          return { book: targetBook, test: uncompletedTest, reason: 'Kaldığın Yerden Devam Et' };
        }
      }
    }

    const pendingHw = (tests || []).find(t => t.status !== 'Sonuçlandı' && t.status !== 'Tamamlandı' && t.bookId);
    if (pendingHw) {
      const targetBook = books.find(b => String(b.id) === String(pendingHw.bookId));
      const targetTest = (bookTests || []).find(t => String(t.id) === String(pendingHw.realTestId || pendingHw.id));
      if (targetBook && targetTest) {
        return { book: targetBook, test: targetTest, reason: 'Öncelikli Ödev Testi' };
      }
    }

    if (books.length > 0) {
      const firstBook = books[0];
      const testsInBook = (bookTests || []).filter(t => String(t.bookId) === String(firstBook.id));
      if (testsInBook.length > 0) {
        return { book: firstBook, test: testsInBook[0], reason: 'Önerilen Test' };
      }
    }

    return null;
  }, [selectedStudent, books, bookTests, submissions, tests]);

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

    const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const MONTHS_SHORT_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

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

      // 1. Gather all daily repeating tasks across the weekly program
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

        // A) Manual items for this specific day (or items across the program matching this exact date)
        let dayManualItems = [];
        if (Array.isArray(rawProg)) {
          // 1. Primary items under this day key
          const found = rawProg.find(r => r?.day === dayMeta.key);
          if (found && Array.isArray(found.items)) {
            found.items.forEach(item => {
              if (!item) return;
              const itemYMD = extractItemYMD(item);
              // If item has an explicit date, it MUST match dayYMD!
              if (itemYMD && itemYMD !== dayYMD) return;
              if (item.createdYMD && dayYMD < item.createdYMD) return;
              if (item.repeatEndDate && dayYMD > item.repeatEndDate) return;
              dayManualItems.push({ ...item, isWeeklyProgItem: true });
            });
          }

          // 2. Items under other days that specifically have this day's date (date-targeting)
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

        // B) Inject Daily Repeating Items (only if no conflicting specific date, and starts fresh done: false)
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

        // C) Schedule Context Items (from useSchedule)
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

        // D) Auto Homeworks & Book Assignments for this day
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
              // Only place this test on its EXACT target date
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

                const isSolved = (submissions || []).some(s =>
                  String(s?.studentId) === String(studentId) &&
                  s.status !== 'in_progress' && s.status !== 'draft' &&
                  (String(s.testId) === tIdStr || String(s.realTestId) === tIdStr || String(s.bookTestId) === tIdStr || (tUuidStr && String(s.testId) === tUuidStr) || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr)))
                );

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

          // Check if student submitted / completed this homework
          const sub = (hw.submissions || []).find(s => String(s?.studentId) === String(studentId)) ||
            (submissions || []).find(s => (s.hwId === hw.id || s.testId === hw.id || String(s.testId) === String(hw.id)) && String(s.studentId) === String(studentId));
          const isDone = !!sub;
          const subYMD = (sub?.createdAt || sub?.submittedAt) ? extractItemYMD(sub.submittedAt || sub.createdAt) : null;

          let isForThisDay = false;
          if (isDone) {
            // If already completed, it ONLY shows on its submission date or original target date!
            const completionDay = subYMD || dueYMD || startYMD;
            isForThisDay = (completionDay === dayYMD);
          } else {
            // Pending homework: show strictly on its due date, or within its active period
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
                const isTestSolved = (submissions || []).some(s =>
                  String(s?.studentId) === String(studentId) &&
                  s.status !== 'in_progress' && s.status !== 'draft' &&
                  (String(s.testId) === tIdStr || String(s.realTestId) === tIdStr || (tUuidStr && String(s.testId) === tUuidStr) || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr)))
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

        // E) Roadmap Topic Milestones for this day
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

        const allItems = [...autoHwItems, ...dayManualItems, ...scheduleItems];
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

  /* ─── Toggle Task Done Status ─── */
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

  /* ─── Task Count Per Day in Mini Navigator ─── */
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

  /* ─── Real-Time Solved Questions Calculation (Today, Week, Month, Total) ─── */
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

    // 1. Process EvaluationContext Submissions
    (submissions || []).forEach(s => {
      const isMatch = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr);
      if (!isMatch || s.status === 'in_progress' || s.status === 'draft') return;

      const subId = s.id || s.supabaseId || `${s.testId}_${s.submittedAt}`;
      if (countedSubIds.has(subId)) return;
      countedSubIds.add(subId);

      // Determine question count
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

    // 2. Process Homework Submissions
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

    // 3. Process Coaching Daily Logs if present
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

  /* ─── Hedef Takip Panosu Verileri (Sınav, Net, Soru, Alışkanlıklar) ─── */
  const goalTrackingData = useMemo(() => {
    if (!selectedStudent?.id) {
      return { hasAnyGoals: false, visualGoals: [], monthly: [], weekly: [], daily: [], totalItemsCount: 0 };
    }
    const profile = getCoachingProfileForStudent(selectedStudent.id) || {};
    const g = profile.goals || {};

    const examType = profile.examGoalType || g.examGoalType || '';
    const customExam = profile.customExamName || g.customExamName || '';
    const school = profile.targetSchool || g.targetSchool || '';
    const score = profile.targetScore || g.targetScore || '';
    const net = (profile.targetNet !== undefined && String(profile.targetNet) !== '0') ? String(profile.targetNet) : (g.targetNet || '');
    const gradeTarget = profile.gradeTarget || g.gradeTarget || '';

    const hasExamOrTarget = Boolean(examType || school || score || (net && net !== '0') || gradeTarget);

    // Monthly goals
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

    // Weekly goals / habits
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

    // Daily goals / habits
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

    // Custom visual progress goals from GoalContext + automatic real-time sync with solved questions
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

    const totalItemsCount = visualGoals.length + monthly.length + weekly.length + daily.length + (hasExamOrTarget ? 1 : 0);

    return {
      hasAnyGoals: totalItemsCount > 0,
      examType: customExam || examType,
      school,
      score,
      net,
      gradeTarget,
      hasExamOrTarget,
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
      background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.22) 0%, transparent 50%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.16) 0%, transparent 50%), radial-gradient(ellipse at 50% 85%, rgba(14, 165, 233, 0.18) 0%, transparent 55%), linear-gradient(180deg, #0b1120 0%, #0f172a 40%, #172554 80%, #0b1120 100%)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#f8fafc',
      paddingBottom: '5rem'
    }}>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.04); opacity: 1; }
        }
        .sd-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .sd-btn:hover { transform: translateY(-2px); filter: brightness(1.12); }
        .sd-btn:active { transform: translateY(0); }
        .sd-card { transition: all 0.25s ease; }
        .sd-card:hover { transform: translateY(-2px); border-color: rgba(165, 180, 252, 0.45) !important; }
      `}</style>

      {/* ════════════════════════════════════════════
          1. HERO BANNER: ÖĞRENCİ KİMLİK & HIZLI ERİŞİM
      ════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
        borderBottom: '1.5px solid rgba(255, 255, 255, 0.12)',
        padding: isMobile ? '1.25rem 1rem' : '2rem 1.5rem',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? '0.85rem' : '1.25rem' }}>
          {/* ÜST SATIR: SOLDA İSİM/PROFİL <------> SAĞ KÖŞEDE YUVARLAK BAŞARI GRAFİĞİ */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            width: '100%'
          }}>
            {/* SOL: ÖĞRENCİ PROFİL KİMLİĞİ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.25rem', minWidth: 0 }}>
              <div style={{
                width: isMobile ? 48 : 64,
                height: isMobile ? 48 : 64,
                borderRadius: isMobile ? 16 : 20,
                background: `linear-gradient(135deg, ${avatarColor}, #4338ca)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.35rem' : '1.85rem',
                fontWeight: 900,
                color: '#ffffff',
                border: '2px solid rgba(255,255,255,0.35)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                flexShrink: 0
              }}>
                {selectedStudent?.name?.charAt(0) || 'Ö'}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? '0.64rem' : '0.68rem', color: '#a5b4fc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {gradeLabel ? `${gradeLabel} Öğrenci Portalı` : 'Öğrenci Portalı'}
                </div>
                <h1 style={{ fontSize: isMobile ? '1.2rem' : '1.75rem', fontWeight: 900, color: '#ffffff', margin: '2px 0 0 0', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedStudent?.name || 'Öğrenci'}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: isMobile ? '0.68rem' : '0.72rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
                    📅 {todayStr}
                  </span>
                  {hasCoach && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#4ade80', background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.35)', padding: '1px 6px', borderRadius: 99 }}>
                      🎓 Koçluk
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SAĞ KÖŞE: YUVARLAK BAŞARI TAMAMLAMA GRAFİĞİ (MOBİLDE VE MASAÜSTÜNDE SAĞDA) */}
            <div
              onClick={() => navigate('/student-results')}
              title="Detaylı Sonuçlar ve Başarı Analizini İncele"
              className="sd-btn"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: overallSuccessRate >= 80 ? '1.5px solid rgba(52, 211, 153, 0.55)' : '1.5px solid rgba(99, 102, 241, 0.45)',
                borderRadius: isMobile ? 14 : 16,
                padding: isMobile ? '0.35rem 0.65rem' : '0.45rem 0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 6 : 10,
                boxShadow: overallSuccessRate >= 80 ? '0 6px 20px rgba(16, 185, 129, 0.3)' : '0 6px 20px rgba(99, 102, 241, 0.25)',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              {/* Circular SVG Ring */}
              <div style={{ position: 'relative', width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width={isMobile ? 38 : 44} height={isMobile ? 38 : 44} viewBox={isMobile ? "0 0 38 38" : "0 0 44 44"} style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx={isMobile ? 19 : 22}
                    cy={isMobile ? 19 : 22}
                    r={isMobile ? 15 : 17}
                    fill="transparent"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth={isMobile ? 3.5 : 4}
                  />
                  <circle
                    cx={isMobile ? 19 : 22}
                    cy={isMobile ? 19 : 22}
                    r={isMobile ? 15 : 17}
                    fill="transparent"
                    stroke={overallSuccessRate >= 80 ? '#10b981' : overallSuccessRate >= 60 ? '#38bdf8' : '#f59e0b'}
                    strokeWidth={isMobile ? 3.5 : 4}
                    strokeDasharray={2 * Math.PI * (isMobile ? 15 : 17)}
                    strokeDashoffset={2 * Math.PI * (isMobile ? 15 : 17) * (1 - (overallSuccessRate || 0) / 100)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  fontSize: isMobile ? '0.64rem' : '0.72rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  lineHeight: 1,
                  textAlign: 'center'
                }}>
                  %{overallSuccessRate}
                </div>
              </div>

              {/* Text Info */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: isMobile ? '0.58rem' : '0.62rem', fontWeight: 800, color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Başarı Oranı
                </span>
                <span style={{ fontSize: isMobile ? '0.74rem' : '0.84rem', fontWeight: 900, color: overallSuccessRate >= 80 ? '#4ade80' : overallSuccessRate >= 60 ? '#38bdf8' : '#fbbf24', lineHeight: 1.15, marginTop: 1 }}>
                  {overallSuccessRate >= 80 ? '🏆 Yüksek' : overallSuccessRate >= 60 ? '📈 İyi' : '⚡ Geliştir'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Selector if viewed by teacher/admin */}
        {currentUser?.role !== 'student' && studentMembers.length > 1 && (
          <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fde68a' }}>👁️ Öğrenci İncele:</span>
            <select
              value={selectedStudent?.id || ''}
              onChange={e => {
                const s = studentMembers.find(st => String(st.id) === String(e.target.value));
                if (s) setSelectedStudent(s);
              }}
              style={{ background: '#1e293b', color: 'white', border: '1px solid #475569', borderRadius: 8, padding: '0.3rem 0.6rem', fontSize: '0.8rem', fontWeight: 700 }}
            >
              {studentMembers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className || 'Sınıf'})</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '1rem 0.75rem 3rem' : '1.5rem 1.5rem 4rem' }}>

        {/* ════════════════════════════════════════════
            2. HAFTALIK DERS PROGRAMI ŞERİDİ (7-DAY NAVIGATOR)
        ════════════════════════════════════════════ */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.14)',
          borderRadius: 20,
          padding: isMobile ? '0.85rem 0.75rem' : '1.1rem 1.4rem',
          marginBottom: '1.25rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(16px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="#818cf8" />
              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ffffff' }}>
                Haftalık Çalışma & Görev Takvimi
              </span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
                (Günü seçerek o günkü görevleri gör)
              </span>
            </div>

            <button
              onClick={() => navigate('/my-program')}
              className="sd-btn"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                border: 'none',
                color: '#ffffff',
                borderRadius: 10,
                padding: '0.35rem 0.85rem',
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

          {/* 7-Day Week Buttons Grid with clear Day and Date */}
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
                      ? 'rgba(99, 102, 241, 0.22)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: isSelected
                      ? '2px solid #818cf8'
                      : isCurrentToday
                      ? '1.5px solid #6366f1'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 14,
                    padding: isMobile ? '0.45rem 0.15rem' : '0.65rem 0.5rem',
                    color: isSelected ? '#ffffff' : isCurrentToday ? '#a5b4fc' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    boxShadow: isSelected ? '0 6px 18px rgba(99, 102, 241, 0.45)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: isMobile ? '0.68rem' : '0.82rem', fontWeight: 900 }}>
                    {day.short}
                  </span>

                  {/* Günün Tarihi (örn: 17 Ağu) */}
                  <span style={{
                    fontSize: isMobile ? '0.58rem' : '0.72rem',
                    fontWeight: 800,
                    color: isSelected ? '#ffffff' : isCurrentToday ? '#c7d2fe' : '#cbd5e1',
                    background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                    padding: isMobile ? '1px 3px' : '2px 6px',
                    borderRadius: 6
                  }}>
                    {dayDate?.dateLabel || ''}
                  </span>

                  {isCurrentToday ? (
                    <span style={{ fontSize: isMobile ? '0.50rem' : '0.60rem', fontWeight: 900, color: isSelected ? '#fde047' : '#f59e0b' }}>
                      ● Bugün
                    </span>
                  ) : taskCount > 0 ? (
                    <span style={{ fontSize: isMobile ? '0.50rem' : '0.60rem', fontWeight: 800, opacity: 0.85 }}>
                      {taskCount} g.
                    </span>
                  ) : (
                    <span style={{ fontSize: isMobile ? '0.50rem' : '0.60rem', opacity: 0.4 }}>
                      -
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ════════════════════════════════════════════
            3. EYLEM MERKEZİ (GÜNÜN GÖREVLERİ)
        ════════════════════════════════════════════ */}
        <div style={{
          marginBottom: '1.5rem'
        }}>
          {/* SEÇİLEN GÜNÜN GÖREVLERİ & ÖDEVLERİ */}
          <div
            className="sd-card"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(15, 23, 42, 0.98) 100%)',
              border: '1.5px solid rgba(165, 180, 252, 0.35)',
              borderRadius: 22,
              padding: isMobile ? '1rem' : '1.25rem 1.4rem',
              boxShadow: '0 12px 30px rgba(49, 46, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckSquare size={20} color="#818cf8" />
                  <div>
                    <span style={{ fontSize: '0.98rem', fontWeight: 900, color: '#ffffff' }}>
                      {dayProgramInfo.isToday ? '🎯 Bugün Ne Yapacağım?' : `📅 ${dayProgramInfo.dayName} Görevleri`}
                    </span>
                    {dayProgramInfo.fullDateLabel && (
                      <div style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 700, marginTop: 1 }}>
                        📌 {dayProgramInfo.fullDateLabel}
                      </div>
                    )}
                  </div>
                </div>

                {dayProgramInfo.totalCount > 0 && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '3px 9px',
                    borderRadius: 99,
                    background: dayProgramInfo.hasAllCompleted ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)',
                    color: dayProgramInfo.hasAllCompleted ? '#4ade80' : '#a5b4fc',
                    border: '1px solid rgba(255,255,255,0.15)'
                  }}>
                    {dayProgramInfo.completedCount}/{dayProgramInfo.totalCount} Tamam
                  </span>
                )}
              </div>

              {dayProgramInfo.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '320px', overflowY: 'auto', paddingRight: 4 }}>
                  {dayProgramInfo.items.map((task, idx) => {
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
                          background: task.done ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          border: task.done ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '0.6rem 0.8rem',
                          borderRadius: 12,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleToggleTask(task); }}
                            style={{
                              width: 20,
                              height: 20,
                              marginTop: 2,
                              borderRadius: 6,
                              border: task.done ? 'none' : '1.5px solid #64748b',
                              background: task.done ? '#22c55e' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            {task.done && <Check size={12} color="#ffffff" strokeWidth={3} />}
                          </button>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Satır 1: Ders / Rozet + Test Başlığı */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 2 }}>
                              {task.subject && (
                                <span style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 900,
                                  color: '#93c5fd',
                                  background: 'rgba(59, 130, 246, 0.2)',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  flexShrink: 0
                                }}>
                                  {task.subject}
                                </span>
                              )}
                              <span style={{
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                color: task.done ? '#94a3b8' : '#ffffff',
                                textDecoration: task.done ? 'line-through' : 'none',
                                wordBreak: 'break-word',
                                lineHeight: 1.3
                              }}>
                                {task.title || task.testName || task.topic || 'Ders Çalışması'}
                              </span>
                            </div>

                            {/* Satır 2: Kitap Adı & Hedef Tarihi */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>
                              {task.bookTitle && (
                                <span style={{ color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 140 : 200 }}>
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
                              borderRadius: 8,
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.72rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              flexShrink: 0,
                              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)'
                            }}
                          >
                            <PlayCircle size={13} /> Çöz
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.15)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    {dayProgramInfo.isToday ? 'Bugün için kayıtlı görev yok. Harika gidiyorsun! 🎉' : `${dayProgramInfo.dayName} günü için görev bulunamadı.`}
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <Link to="/my-program" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c7d2fe', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Haftalık Programa Git <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            4. ANA GRID (SOL: ÖDEVLER & YOL HARİTASI | SAĞ: KİTAPLAR & HEDEFLER)
        ════════════════════════════════════════════ */}
        <div className="sd-grid-layout">

          {/* ──── SOL KOLON: ÖDEVLER & YOL HARİTASI ──── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* 📋 BÖLÜM 1: ÖDEVLERİM & GÖREV TAKİBİ (YOL HARİTASI STİLİ) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.14)',
              borderRadius: 22,
              padding: isMobile ? '1rem' : '1.35rem 1.5rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(16px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 4px 12px rgba(239,68,68,0.4)' }}>
                    📋
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                      Ödevlerim & Görev Takibi
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                      Öğretmeniniz veya koçunuz tarafından atanan ödevlerin tamamlama durumu
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/student/homeworks')}
                  style={{
                    background: pendingCount > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)',
                    color: pendingCount > 0 ? '#fca5a5' : '#86efac',
                    border: pendingCount > 0 ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(34,197,94,0.35)',
                    borderRadius: 99,
                    padding: '0.25rem 0.75rem',
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
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: tests.length > 0 ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)', borderRadius: 16, border: tests.length > 0 ? '1px dashed rgba(34,197,94,0.3)' : '1px dashed rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>🎉</div>
                  <div style={{ fontWeight: 800, color: tests.length > 0 ? '#4ade80' : '#ffffff', fontSize: '0.92rem', marginBottom: 4 }}>
                    {tests.length > 0 ? 'Tüm Ödevler Başarıyla Tamamlandı!' : 'Henüz atanmış bir ödeviniz yok'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
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
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1.5px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: 16,
                        padding: '1rem 1.15rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                          {group.title}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: group.pct === 100 ? '#4ade80' : '#f87171' }}>
                          %{group.pct}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ height: 7, background: 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{
                          height: '100%',
                          width: `${group.pct}%`,
                          background: group.pct === 100 ? 'linear-gradient(90deg, #22c55e, #10b981)' : 'linear-gradient(90deg, #f97316, #ef4444)',
                          borderRadius: 99,
                          transition: 'width 0.8s ease'
                        }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
                        <span>{group.doneCount} / {group.totalCount} Test Tamamlandı {group.pendingCount > 0 && <span style={{ color: '#f87171', fontWeight: 800 }}>({group.pendingCount} Bekleyen)</span>}</span>
                        <span style={{ color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 800 }}>
                          Detayları Gör <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🗺️ BÖLÜM 2: YOL HARİTAM & KONU TAKİBİ */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.14)',
              borderRadius: 22,
              padding: isMobile ? '1rem' : '1.35rem 1.5rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(16px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
                    🗺️
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                      Yol Haritam & Konu Takibi
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                      Müfredat ve hedef sınav konu tamamlama ilerlemeniz
                    </span>
                  </div>
                </div>

                <span style={{ background: 'rgba(124, 58, 237, 0.25)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.35)', borderRadius: 99, padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 900 }}>
                  {myRoadmaps.length} Harita
                </span>
              </div>

              {myRoadmaps.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>🎯</div>
                  <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.92rem', marginBottom: 4 }}>
                    Henüz atanmış bir yol haritanız yok
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
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
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1.5px solid rgba(192, 132, 252, 0.25)',
                        borderRadius: 16,
                        padding: '1rem 1.15rem',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#ffffff' }}>
                          {plan.title}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#c084fc' }}>
                          %{pct}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ height: 7, background: 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #38bdf8, #a855f7)', borderRadius: 99, transition: 'width 0.8s ease' }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
                        <span>{doneTopics} / {totalTopics} Konu Tamamlandı</span>
                        <span style={{ color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 2 }}>
                          Detayları Gör <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ──── SAĞ KOLON: KİTAPLARIM & HEDEFLERİM ──── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* 📚 BÖLÜM 3: TAKİP EDİLEN KİTAPLARIM */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.14)',
              borderRadius: 22,
              padding: isMobile ? '1rem' : '1.35rem 1.5rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(16px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 4px 12px rgba(8,145,178,0.4)' }}>
                    📚
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                      Kitaplarım ({assignedBooksList.length})
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                      Takip edilen soru bankalarınız
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/student/books')}
                  className="sd-btn"
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    borderRadius: 8,
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Tümü →
                </button>
              </div>

              {assignedBooksList.length === 0 ? (
                <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 16 }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Henüz soru bankası eklenmedi.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {assignedBooksList.slice(0, 4).map((book, idx) => {
                    const pal = BOOK_PALETTES[idx % BOOK_PALETTES.length];
                    return (
                      <div
                        key={book.id}
                        onClick={() => navigate(`/book-details/${book.id}?studentId=${selectedStudent.id}`)}
                        className="sd-card"
                        style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          border: `1.5px solid ${pal.border}40`,
                          borderRadius: 14,
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 900, color: pal.border, background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                              {book.subject || 'Ders Kitabı'}
                            </span>
                            {book.publisher && (
                              <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>
                                {book.publisher}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {book.title}
                          </div>

                          <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${book.pct}%`, background: pal.gradient, borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>
                              {book.solvedCount}/{book.totalTests} Test (%{book.pct})
                            </span>
                          </div>
                        </div>

                        <ChevronRight size={16} color="rgba(255,255,255,0.5)" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🎯 BÖLÜM 4: HEDEF TAKİP PANOSU (HEDEFLERİM & ALIŞKANLIKLAR) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1.5px solid rgba(168, 85, 247, 0.35)',
              borderRadius: 22,
              padding: isMobile ? '1rem' : '1.35rem 1.5rem',
              boxShadow: '0 8px 30px rgba(168, 85, 247, 0.15)',
              backdropFilter: 'blur(16px)'
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
                    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)'
                  }}>
                    🎯
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                        Hedef Takip Panosu
                      </h2>
                      {goalTrackingData.totalItemsCount > 0 && (
                        <span style={{
                          background: 'rgba(168, 85, 247, 0.25)',
                          color: '#e9d5ff',
                          border: '1px solid rgba(192, 132, 252, 0.4)',
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
                          background: 'rgba(244, 63, 94, 0.2)',
                          color: '#fca5a5',
                          border: '1px solid rgba(251, 113, 133, 0.4)',
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
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(236, 72, 153, 0.25))',
                    border: '1px solid rgba(192, 132, 252, 0.45)',
                    color: '#f3e8ff',
                    borderRadius: 8,
                    padding: '0.28rem 0.7rem',
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

              {/* 1. HEDEF SINAV / OKUL / BELGE AFİŞİ */}
              {goalTrackingData.hasExamOrTarget && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(126, 34, 206, 0.25) 0%, rgba(15, 23, 42, 0.85) 100%)',
                  border: '1.5px solid rgba(192, 132, 252, 0.4)',
                  borderRadius: 16,
                  padding: '0.85rem 1rem',
                  marginBottom: '0.85rem',
                  boxShadow: '0 4px 16px rgba(126, 34, 206, 0.2)'
                }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    🏛️ HEDEF SINAV & BELGE
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', marginBottom: 6 }}>
                    {goalTrackingData.examType || 'Hedef Sınav Belirlendi'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {goalTrackingData.school && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a7f3d0', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(52, 211, 153, 0.35)', padding: '2px 8px', borderRadius: 8 }}>
                        🏫 {goalTrackingData.school}
                      </span>
                    )}
                    {goalTrackingData.score && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fde047', background: 'rgba(234, 179, 8, 0.2)', border: '1px solid rgba(250, 204, 21, 0.35)', padding: '2px 8px', borderRadius: 8 }}>
                        🎯 {goalTrackingData.score} Puan
                      </span>
                    )}
                    {goalTrackingData.net && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#67e8f9', background: 'rgba(6, 182, 212, 0.2)', border: '1px solid rgba(103, 232, 249, 0.35)', padding: '2px 8px', borderRadius: 8 }}>
                        📈 {goalTrackingData.net} Net
                      </span>
                    )}
                    {goalTrackingData.gradeTarget && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f472b6', background: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(244, 114, 182, 0.35)', padding: '2px 8px', borderRadius: 8 }}>
                        🎓 {goalTrackingData.gradeTarget}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 2. GÖRSEL İLERLEME HEDEFLERİ (SORU, SAYFA, DAKİKA, KONU VB.) */}
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
                          background: 'rgba(15, 23, 42, 0.75)',
                          border: `1.5px solid ${t.border}`,
                          borderRadius: 14,
                          padding: '0.75rem 0.95rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              background: t.bg,
                              color: t.text,
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
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {g.title}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isDone ? '#4ade80' : t.text }}>
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
                                  background: t.bg,
                                  border: `1px solid ${t.border}`,
                                  color: t.text,
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
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: isDone ? 'linear-gradient(90deg, #22c55e, #10b981)' : `linear-gradient(90deg, ${t.color}, #a855f7)`,
                            borderRadius: 99,
                            transition: 'width 0.8s ease'
                          }} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>
                          <span>
                            {currentVal} / {g.target} {t.unit}
                            {g.type === 'Soru' && g.autoSystemValue > 0 && (
                              <span style={{ marginLeft: 5, color: '#fb7185', fontWeight: 800, fontSize: '0.62rem' }}>
                                (🔄 {g.autoSystemValue} sistemden yansıdı)
                              </span>
                            )}
                          </span>
                          <span style={{ color: isDone ? '#4ade80' : '#cbd5e1' }}>
                            {isDone ? '🎉 Hedefe Ulaşıldı' : `${Math.max(0, g.target - currentVal)} ${t.unit} kaldı`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. ALIŞKANLIK & GÖREV MADDELERİ (GÜNLÜK & HAFTALIK) */}
              {(goalTrackingData.daily.length > 0 || goalTrackingData.weekly.length > 0 || goalTrackingData.monthly.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {goalTrackingData.daily.slice(0, 2).map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: '#f1f5f9' }}>
                      <span style={{ fontSize: '0.85rem' }}>⚡</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {item.text}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#f43f5e', background: 'rgba(244,63,94,0.15)', padding: '1px 5px', borderRadius: 4 }}>
                        Günlük
                      </span>
                    </div>
                  ))}

                  {goalTrackingData.weekly.slice(0, 2).map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: '#f1f5f9' }}>
                      <span style={{ fontSize: '0.85rem' }}>✨</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {item.text}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#c084fc', background: 'rgba(192,132,252,0.15)', padding: '1px 5px', borderRadius: 4 }}>
                        Haftalık
                      </span>
                    </div>
                  ))}

                  {goalTrackingData.monthly.slice(0, 2).map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: '#f1f5f9' }}>
                      <span style={{ fontSize: '0.85rem' }}>📅</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {item.text}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#38bdf8', background: 'rgba(56,189,248,0.15)', padding: '1px 5px', borderRadius: 4 }}>
                        Aylık
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. BOŞ DURUM (HENÜZ HİÇ HEDEF YOKSA) */}
              {!goalTrackingData.hasAnyGoals && (
                <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px dashed rgba(168, 85, 247, 0.3)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 4 }}>🎯</div>
                  <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.88rem', marginBottom: 3 }}>
                    Henüz Hedef Belirlenmedi
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 10 }}>
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
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.14)',
              borderRadius: 22,
              padding: isMobile ? '1rem' : '1.35rem 1.5rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(16px)'
            }}>
              {(() => {
                const currentQuote = DASHBOARD_QUOTES[dashQuoteIdx % DASHBOARD_QUOTES.length];
                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '1.1rem' }}>{currentQuote.emoji}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fde68a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Günün İlhamı ({currentQuote.category})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDashQuoteIdx(p => p + 1)}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '0.25rem 0.5rem', color: '#ffffff', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <RefreshCw size={11} /> Yeni
                      </button>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>
                      "{currentQuote.quote}"
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24' }}>
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
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.8)', backdropFilter:'blur(12px)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', zIndex:1000, padding: isMobile ? 0 : '1rem' }}>
          <div style={{ background:'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(49,46,129,0.98) 100%)', border:'1.5px solid rgba(255,255,255,0.25)', borderRadius: isMobile ? '24px 24px 0 0' : '24px', padding:'1.6rem', width:'100%', maxWidth: isMobile ? '100%' : 440, boxShadow:'0 32px 80px rgba(0,0,0,0.5)', animation:'sdFadeUp 0.3s ease', color: '#ffffff' }}>
            {isMobile && <div style={{ width:40, height:4, background:'rgba(255,255,255,0.2)', borderRadius:99, margin:'0 auto 1.25rem' }} />}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
              <h2 style={{ fontWeight:900, fontSize:'1.05rem', color:'white', margin:0 }}>🎯 Yeni Hedef Ekle</h2>
              <button onClick={() => setShowGoalModal(false)} style={{ background:'rgba(255,255,255,0.12)', border:'none', borderRadius:10, padding:'0.45rem', cursor:'pointer', display:'flex', color:'white' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveGoal} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
              <input placeholder="Hedef başlığı (örn: Günde 50 Matematik Sorusu)..." value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                style={{ padding:'0.8rem 1rem', borderRadius:14, border:'1.5px solid rgba(255,255,255,0.22)', fontSize:'0.9rem', fontFamily:'inherit', outline:'none', background:'rgba(255,255,255,0.1)', color:'white', width:'100%' }} required />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <select value={newGoal.type} onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))}
                  style={{ padding:'0.75rem 0.9rem', borderRadius:14, border:'1.5px solid rgba(255,255,255,0.22)', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', background:'#1e293b', color:'white' }}>
                  {['Soru','Sayfa','Dakika'].map(v => <option key={v} value={v} style={{ background:'#1e293b', color:'white' }}>{v}</option>)}
                </select>
                <select value={newGoal.period} onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))}
                  style={{ padding:'0.75rem 0.9rem', borderRadius:14, border:'1.5px solid rgba(255,255,255,0.22)', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', background:'#1e293b', color:'white' }}>
                  {['Günlük','Haftalık','Aylık'].map(v => <option key={v} value={v} style={{ background:'#1e293b', color:'white' }}>{v}</option>)}
                </select>
              </div>
              <input type="number" min="1" placeholder="Hedef miktar" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))}
                style={{ padding:'0.8rem 1rem', borderRadius:14, border:'1.5px solid rgba(255,255,255,0.22)', fontSize:'0.9rem', fontFamily:'inherit', outline:'none', background:'rgba(255,255,255,0.1)', color:'white', width:'100%' }} required />
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
