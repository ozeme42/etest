import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlayCircle, Target, AlertCircle, Timer, BookOpen, Check,
  Sparkles, Trophy, Flame, GraduationCap, BarChart3, Clock,
  Calendar, CheckCircle2, X, Plus, ExternalLink, Zap,
  ChevronRight, ChevronDown, ChevronUp, Star, TrendingUp, BookMarked, CalendarDays,
  Ruler, TestTube2, BookCopy, Globe, MessageSquare,
  FileText, ClipboardList, ArrowRight, RefreshCw, ClipboardCheck, Eye, RotateCcw,
  CheckSquare, Award, ArrowUpRight
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

  /* ─── Day-by-Day Schedule & Active Day Program ─── */
  const dayProgramInfo = useMemo(() => {
    const selectedDayObj = DAYS_OF_WEEK.find(d => d.key === activeDayKey) || DAYS_OF_WEEK[0];
    const rawProg = coachingProfile?.weeklyProgram;
    let manualItems = [];
    if (Array.isArray(rawProg)) {
      const foundProg = rawProg.find(r => r.day === selectedDayObj.key);
      manualItems = (foundProg?.items || []).map(item => ({ ...item, isWeeklyProgItem: true }));
    }

    const studentId = selectedStudent?.id;
    // Schedules from ScheduleContext
    const scheduleItems = (schedules || []).filter(s => {
      if (String(s.studentId) !== String(studentId)) return false;
      return s.day === selectedDayObj.key || s.dayOfWeek === selectedDayObj.key || s.dayName === selectedDayObj.name || s.day === selectedDayObj.name;
    }).map(s => ({
      id: s.id,
      title: s.title || s.subject || 'Ders Çalışması',
      subject: s.subject || 'Çalışma Planı',
      topic: s.topic || '',
      time: s.time || '',
      done: !!(s.done || s.completed),
      isScheduleContextItem: true
    }));

    const autoHwItems = [];
    const now = new Date();
    const todayYMD = now.toISOString().split('T')[0];

    // Auto-populate homeworks and roadmaps for today
    const isViewingToday = activeDayKey === todayDayKey;

    if (isViewingToday) {
      (homeworks || []).forEach(hw => {
        const gradesList = curData?.grades || [];
        if (!isHomeworkForStudent(hw, selectedStudent, gradesList)) return;

        const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || hw.bookId;
        if (isBook) {
          const bookObj = books.find(b => String(b.id) === String(hw.bookId));
          const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

          if (hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0) {
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

                const tIdStr = String(testId);
                const tUuidStr = String(toUUID(testId) || '');

                const isSolved = submissions.some(s =>
                  String(s.studentId) === String(studentId) &&
                  s.status !== 'in_progress' && s.status !== 'draft' &&
                  (String(s.testId) === tIdStr || String(s.realTestId) === tIdStr || String(s.bookTestId) === tIdStr || (tUuidStr && String(s.testId) === tUuidStr) || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr)))
                );

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
        }

        const rawDue = hw.dueDate || hw.assignedDueDate;
        const dueYMD = rawDue ? new Date(rawDue).toISOString().split('T')[0] : null;
        const isDueToday = dueYMD === todayYMD;

        if (isDueToday) {
          const sub = (hw.submissions || []).find(s => String(s.studentId) === String(studentId)) ||
            submissions.find(s => (s.hwId === hw.id || s.testId === hw.id || String(s.testId) === String(hw.id)) && String(s.studentId) === String(studentId));
          if (sub) return;

          const existsInManual = manualItems.some(m => m.id === `auto_hw_${hw.id}` || m.hwId === hw.id);
          if (!existsInManual) {
            autoHwItems.push({
              id: `auto_hw_${hw.id}`,
              hwId: hw.id,
              isAutoHomework: true,
              taskType: hw.isBookAssignment ? 'kitap' : 'ödev',
              subject: hw.subject || 'Atanan Ödev',
              topic: hw.title || hw.name || 'Ödev Görevi',
              questionCount: hw.totalQuestions ? `${hw.totalQuestions} soru` : null,
              time: 'Bugün Son',
              done: false
            });
          }
        }
      });

      // Study plan / roadmap topic milestones for today
      (studyAssignments || []).filter(a => String(a.studentId) === String(studentId)).forEach(assignment => {
        if (assignment.status === 'completed' || assignment.status === 'done') return;
        const plan = (studyPlans || []).find(p => String(p.id) === String(assignment.planId || assignment.studyPlanId));
        if (!plan) return;

        let compTopics = [];
        if (Array.isArray(assignment.completedTopics)) compTopics = assignment.completedTopics;
        else if (typeof assignment.completedTopics === 'string') {
          try { compTopics = JSON.parse(assignment.completedTopics); } catch(e) {}
        }
        const completedTopicsSet = new Set(compTopics.map(String));

        (plan.subjects || []).forEach(subject => {
          (subject.topics || []).forEach(topic => {
            if (topic.dueDate) {
              const tYMD = topic.dueDate.split('T')[0];
              if (todayYMD === tYMD && !completedTopicsSet.has(String(topic.id)) && !completedTopicsSet.has(topic.name)) {
                autoHwItems.push({
                  id: `roadmap_top_${assignment.id}_${topic.id}`,
                  roadmapAssignmentId: assignment.id,
                  isAutoHomework: true,
                  isRoadmapTask: true,
                  taskType: 'konu',
                  subject: `${plan.title} • ${subject.name}`,
                  topic: topic.name,
                  time: `Hedef: ${new Date(topic.dueDate).toLocaleDateString('tr-TR')}`,
                  done: false
                });
              }
            }
          });
        });
      });
    }

    const allItems = [...autoHwItems, ...manualItems, ...scheduleItems];
    const completedItems = allItems.filter(i => i.done);

    return {
      dayName: selectedDayObj.name,
      dayKey: selectedDayObj.key,
      isToday: isViewingToday,
      totalCount: allItems.length,
      completedCount: completedItems.length,
      items: allItems,
      hasAllCompleted: allItems.length > 0 && completedItems.length === allItems.length
    };
  }, [activeDayKey, todayDayKey, coachingProfile, homeworks, selectedStudent, curData, submissions, books, bookTests, schedules, studyAssignments, studyPlans]);

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

    if (coachingProfile && coachingProfile.weeklyProgram) {
      const updatedWeeklyProgram = coachingProfile.weeklyProgram.map(dayRow => {
        if (dayRow.day === activeDayKey) {
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
    }
  };

  /* ─── Task Count Per Day in Mini Navigator ─── */
  const weekTasksCountMap = useMemo(() => {
    const map = {};
    const rawProg = coachingProfile?.weeklyProgram || [];
    const studentId = selectedStudent?.id;

    DAYS_OF_WEEK.forEach(d => {
      const found = rawProg.find(r => r.day === d.key);
      const manualCount = found?.items?.length || 0;
      const schedCount = (schedules || []).filter(s => String(s.studentId) === String(studentId) && (s.day === d.key || s.dayOfWeek === d.key || s.dayName === d.name || s.day === d.name)).length;
      map[d.key] = manualCount + schedCount;
    });
    return map;
  }, [coachingProfile, schedules, selectedStudent]);

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

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.35) 0%, transparent 50%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.28) 0%, transparent 50%), radial-gradient(ellipse at 50% 85%, rgba(14, 165, 233, 0.28) 0%, transparent 55%), linear-gradient(180deg, #0d1527 0%, #131f3b 35%, #1a274d 70%, #101a33 100%)', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: '#f8fafc', boxSizing: 'border-box', overflowX: 'hidden' }}>

      <style>{`
        @keyframes sdFadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .sd-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .sd-card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.3) !important; }
        .sd-btn { transition: all 0.15s ease; user-select: none; }
        .sd-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .sd-btn:active { transform: scale(0.97); }
        .sd-anim { animation: sdFadeUp 0.35s ease both; }
        @media(min-width:900px) {
          .sd-grid-layout { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 1.25rem; align-items: start; }
        }
        @media(max-width:899px) {
          .sd-grid-layout { display: flex; flex-direction: column; gap: 1.25rem; }
        }
      `}</style>

      {/* ════════════════════════════════════════════
          1. HEADER (ÖĞRENCİ PROFİLİ & HIZLI ERİŞİM)
      ════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(49, 46, 129, 0.95) 50%, rgba(15, 23, 42, 0.98) 100%)',
        borderBottom: '1.5px solid rgba(255, 255, 255, 0.15)',
        padding: isMobile ? '1.25rem 1rem' : '1.75rem 2rem',
        backdropFilter: 'blur(20px)',
        position: 'relative'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          
          {/* Top Row: Avatar + Student Switcher (If Teacher) + Quick Links */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            
            {/* Student Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16 }}>
              <div style={{
                width: isMobile ? 54 : 64,
                height: isMobile ? 54 : 64,
                borderRadius: '50%',
                background: avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.4rem' : '1.7rem',
                fontWeight: 900,
                color: '#ffffff',
                border: '2.5px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                flexShrink: 0
              }}>
                {selectedStudent?.name?.charAt(0) || 'Ö'}
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: '#a5b4fc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {gradeLabel ? `${gradeLabel} Öğrenci Portalı` : 'Öğrenci Portalı'}
                </div>
                <h1 style={{ fontSize: isMobile ? '1.35rem' : '1.75rem', fontWeight: 900, color: '#ffffff', margin: '2px 0 0 0', lineHeight: 1.1 }}>
                  {selectedStudent?.name || 'Öğrenci'}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
                    📅 {todayStr}
                  </span>
                  {hasCoach && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#4ade80', background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.35)', padding: '1px 7px', borderRadius: 99 }}>
                      🎓 Koçluk Aktif
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/wrong-answers')}
                className="sd-btn"
                style={{
                  background: 'rgba(244, 63, 94, 0.18)',
                  border: '1.5px solid rgba(251, 113, 133, 0.4)',
                  color: '#fecdd3',
                  borderRadius: 12,
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <AlertCircle size={15} color="#fb7185" />
                <span>Yanlışlarım ({tests.filter(t => t.status === 'Sonuçlandı').length})</span>
              </button>

              <button
                onClick={() => navigate('/student/books')}
                className="sd-btn"
                style={{
                  background: 'rgba(8, 145, 178, 0.18)',
                  border: '1.5px solid rgba(56, 189, 248, 0.4)',
                  color: '#bae6fd',
                  borderRadius: 12,
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <BookOpen size={15} color="#38bdf8" />
                <span>Kitaplarım ({assignedBooksList.length})</span>
              </button>

              <button
                onClick={() => navigate('/student-results')}
                className="sd-btn"
                style={{
                  background: 'rgba(99, 102, 241, 0.22)',
                  border: '1.5px solid rgba(165, 180, 252, 0.4)',
                  color: '#c7d2fe',
                  borderRadius: 12,
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <BarChart3 size={15} color="#818cf8" />
                <span>Sonuçlarım</span>
              </button>
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

          {/* 7-Day Week Buttons Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 4 : 8 }}>
            {DAYS_OF_WEEK.map(day => {
              const isSelected = activeDayKey === day.key;
              const isCurrentToday = todayDayKey === day.key;
              const taskCount = weekTasksCountMap[day.key] || 0;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setActiveDayKey(day.key)}
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                      : isCurrentToday
                      ? 'rgba(99, 102, 241, 0.18)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: isSelected
                      ? '2px solid #818cf8'
                      : isCurrentToday
                      ? '1.5px solid #6366f1'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 12,
                    padding: isMobile ? '0.45rem 0.15rem' : '0.65rem 0.5rem',
                    color: isSelected ? '#ffffff' : isCurrentToday ? '#a5b4fc' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    boxShadow: isSelected ? '0 4px 14px rgba(99, 102, 241, 0.45)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: isMobile ? '0.68rem' : '0.8rem', fontWeight: 900 }}>
                    {day.short}
                  </span>
                  {isCurrentToday && (
                    <span style={{ fontSize: isMobile ? '0.52rem' : '0.6rem', fontWeight: 900, color: isSelected ? '#fbbf24' : '#f59e0b' }}>
                      ● Bugün
                    </span>
                  )}
                  {taskCount > 0 && !isCurrentToday && (
                    <span style={{ fontSize: isMobile ? '0.52rem' : '0.6rem', fontWeight: 800, opacity: 0.85 }}>
                      {taskCount} g.
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ════════════════════════════════════════════
            3. İKİLİ EYLEM MERKEZİ (GÜNÜN GÖREVLERİ & 1-TIKLA DEVAM ET)
        ════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          {/* KART 1: SEÇİLEN GÜNÜN GÖREVLERİ & ÖDEVLERİ */}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckSquare size={20} color="#818cf8" />
                  <span style={{ fontSize: '0.98rem', fontWeight: 900, color: '#ffffff' }}>
                    {dayProgramInfo.isToday ? '🎯 Bugün Ne Yapacağım?' : `📅 ${dayProgramInfo.dayName} Görevleri`}
                  </span>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: '160px', overflowY: 'auto' }}>
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
                          gap: 8,
                          background: task.done ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          border: task.done ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '0.5rem 0.8rem',
                          borderRadius: 12,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleToggleTask(task); }}
                            style={{
                              width: 20,
                              height: 20,
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
                            <div style={{
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              color: task.done ? '#94a3b8' : '#f8fafc',
                              textDecoration: task.done ? 'line-through' : 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {task.title || task.subject || 'Ders Çalışması'} {task.topic ? `(${task.topic})` : ''}
                            </div>
                            {task.time && (
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                                ⏰ {task.time}
                              </div>
                            )}
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
                              padding: '0.22rem 0.55rem',
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              flexShrink: 0
                            }}
                          >
                            <PlayCircle size={12} /> Çöz
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

          {/* KART 2: KALDIĞIN YERDEN DEVAM ET (KİTAP & TEST) */}
          <div
            className="sd-card"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.85) 0%, rgba(15, 23, 42, 0.98) 100%)',
              border: '1.5px solid rgba(52, 211, 153, 0.35)',
              borderRadius: 22,
              padding: isMobile ? '1rem' : '1.25rem 1.4rem',
              boxShadow: '0 12px 30px rgba(6, 78, 59, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            {resumeBookTest ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BookMarked size={20} color="#34d399" />
                    <span style={{ fontSize: '0.98rem', fontWeight: 900, color: '#ffffff' }}>
                      📚 Kaldığın Yerden Devam Et
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#6ee7b7', background: 'rgba(52, 211, 153, 0.2)', padding: '2px 8px', borderRadius: 99 }}>
                    {resumeBookTest.reason}
                  </span>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '0.85rem 1rem', border: '1px solid rgba(52, 211, 153, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a7f3d0', textTransform: 'uppercase' }}>
                      {resumeBookTest.book.subject || 'Ders Kitabı'}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {resumeBookTest.book.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#34d399', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>▶️</span> {resumeBookTest.test.name}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/book-quiz/${resumeBookTest.book.id}/${resumeBookTest.test.id}`)}
                    className="sd-btn"
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      padding: '0.6rem 1.15rem',
                      borderRadius: 12,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                      flexShrink: 0
                    }}
                  >
                    Hemen Çöz <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <BookMarked size={20} color="#34d399" />
                  <span style={{ fontSize: '0.98rem', fontWeight: 900, color: '#ffffff' }}>
                    📚 Kitaplarım & Testler
                  </span>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 14, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    Henüz aktif bir test kaydınız bulunmuyor. Kitaplar sekmesinden dilediğiniz testi başlatabilirsiniz.
                  </span>
                </div>
              </div>
            )}

            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <Link to="/student/books" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6ee7b7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Tüm Kitaplarımı Gör ({assignedBooksList.length}) <ChevronRight size={12} />
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

            {/* 📋 BÖLÜM 1: BEKLEYEN ÖDEVLERİM */}
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
                      Bekleyen Ödevlerim
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                      Öğretmeniniz veya koçunuz tarafından atanan görevler
                    </span>
                  </div>
                </div>

                {pendingCount > 0 && (
                  <span style={{ background: '#ef4444', color: 'white', borderRadius: 99, padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 900, boxShadow: '0 2px 10px rgba(239,68,68,0.5)' }}>
                    {pendingCount} Ödev
                  </span>
                )}
              </div>

              {pendingTasks.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
                  <div style={{ fontWeight: 900, color: '#ffffff', fontSize: '1.05rem', marginBottom: 4 }}>
                    Tüm ödevler tamamlandı!
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Harika bir iş çıkardın. Yeni ödevler atandığında burada görünecektir.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {pendingTasks.map(task => {
                    const dueDate = task.dueDateObj;
                    const overdue = isPast(dueDate) && !isToday(dueDate);
                    const dueToday = isToday(dueDate);
                    const daysDiff = differenceInDays(dueDate, new Date());
                    const conf = getSubConf(getThemeKey(task.subject));
                    const Icon = conf.icon;

                    const handleStart = () => {
                      const targetId = task.realTestId || task.testId || task.id;
                      if (task.type === 'physicalExam' || task.isPhysical) {
                        navigate(`/physical-exam/${task.hwId || targetId}?studentId=${selectedStudent.id}`);
                      } else if (task.sourceType === 'trackedBook' || task.isBookAssignment) {
                        navigate(`/book-quiz/${targetId}?studentId=${selectedStudent.id}`);
                      } else {
                        navigate(`/quiz/${targetId}?studentId=${selectedStudent.id}`);
                      }
                    };

                    return (
                      <div
                        key={task.id}
                        onClick={handleStart}
                        className="sd-card"
                        style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          border: overdue ? '1.5px solid rgba(239, 68, 68, 0.5)' : dueToday ? '1.5px solid rgba(245, 158, 11, 0.5)' : '1.5px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 16,
                          padding: '0.9rem 1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: conf.bg, border: `1.5px solid ${conf.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={20} color={conf.color} />
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: conf.color, background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                                {task.subject}
                              </span>

                              {overdue ? (
                                <span style={{ fontSize: '0.62rem', fontWeight: 900, background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '1px 6px', borderRadius: 99 }}>
                                  ⚡ Gecikti
                                </span>
                              ) : dueToday ? (
                                <span style={{ fontSize: '0.62rem', fontWeight: 900, background: 'rgba(245,158,11,0.2)', color: '#fbbf24', padding: '1px 6px', borderRadius: 99 }}>
                                  ⚠️ Bugün Son
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8' }}>
                                  {daysDiff + 1} gün kaldı
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.title}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleStart(); }}
                          className="sd-btn"
                          style={{
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '0.45rem 0.95rem',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
                          }}
                        >
                          <PlayCircle size={14} /> Başla
                        </button>
                      </div>
                    );
                  })}
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

            {/* 🎯 BÖLÜM 4: GÜNÜN MOTİVASYONU & HEDEFLERİM */}
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
