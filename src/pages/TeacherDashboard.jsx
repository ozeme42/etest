import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, X, Edit2, Users, BookOpen, ClipboardCheck,
  Search, BarChart3, TrendingUp, UserPlus, CheckCircle2,
  AlertCircle, Scissors, Sparkles, Map, Bell, ArrowRight,
  Calendar, RotateCcw, CheckSquare, Layers, Eye, Filter,
  SlidersHorizontal, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { useTheme } from '../context/ThemeContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { getAvatarBg } from '../config/subjectThemes';
import { timeAgo } from '../utils/dateHelpers';
import { toUUID } from '../services/supabaseService';
import TeacherClassAnalytics from '../components/teacher/TeacherClassAnalytics';
import SmartPullToRefresh from '../components/common/SmartPullToRefresh';
import AiQuestionGeneratorModal from '../components/question-bank/AiQuestionGeneratorModal';
import TeacherStudentQuickReportModal from '../components/teacher/TeacherStudentQuickReportModal';
import { DAYS, normalizeWeeklyProgram, TASK_TYPES, checkHasItemBeenAttempted } from '../components/ProgramCenter';
import { isHomeworkForStudent } from '../utils/testResolver';
import { getSubmissionScorePct } from '../utils/scoreHelpers';
import './TeacherDashboard.css';

export { getSubmissionScorePct };

/* ── Mini Avatar Helper ── */
function StudentAvatar({ name, index = 0, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: getAvatarBg(index),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#ffffff', fontWeight: 800, fontSize: size * 0.38,
      flexShrink: 0
    }}>
      {(name || 'Ö').charAt(0).toUpperCase()}
    </div>
  );
}

export default function TeacherDashboard() {
  const { data = {}, addTest, updateTest } = useCurriculum();
  const { questions = [] } = useQuestionBank();
  const { homeworks = [] } = useHomework();
  const { books = [], bookTests = [] } = useTrackedBooks() || {};
  const { submissions = [] } = useEvaluation();
  const { users = [], addStudentForTeacher, updateUser } = useUser();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const {
    toggleCoachedStudent,
    getCoachedStudentIds,
    getCoachingProfileForStudent,
    saveCoachingProfile,
    mockExams = []
  } = useCoaching();
  const navigate = useNavigate();

  /* ── State ── */
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'submissions' | 'homeworks' | 'analytics'
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('');
  const [hwSearch, setHwSearch] = useState('');

  // Sub-view inside 'submissions' tab: 'feed' | 'remedials' | 'programs'
  const [submissionSubTab, setSubmissionSubTab] = useState('feed');

  // Submissions Feed Filters
  const [feedStudentFilter, setFeedStudentFilter] = useState('all');
  const [feedSubjectFilter, setFeedSubjectFilter] = useState('all');
  const [feedTypeFilter, setFeedTypeFilter] = useState('all'); // 'all' | 'remedial' | 'book' | 'exam'
  const [feedScoreFilter, setFeedScoreFilter] = useState('all'); // 'all' | 'high' | 'mid' | 'low'
  const [feedSearch, setFeedSearch] = useState('');

  // Telafi Havuzu (Geciken Görevler) Filters
  const [remedialStudentFilter, setRemedialStudentFilter] = useState('all');
  const [remedialSubjectFilter, setRemedialSubjectFilter] = useState('all');
  const [remedialSourceFilter, setRemedialSourceFilter] = useState('all'); // 'all' | 'program' | 'homework'
  const [remedialSearch, setRemedialSearch] = useState('');

  // Öğrenci Programları State
  const [selectedProgramStudentId, setSelectedProgramStudentId] = useState(null);
  const [programDayFilter, setProgramDayFilter] = useState('all');

  // Modals
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('123456');
  const [newStudentGrade, setNewStudentGrade] = useState('');

  const [editingStudent, setEditingStudent] = useState(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentPassword, setEditStudentPassword] = useState('');
  const [editStudentGrade, setEditStudentGrade] = useState('');

  const [selectedReportStudent, setSelectedReportStudent] = useState(null);

  // Test Creator Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);
  const [testName, setTestName] = useState('');
  const [timePerQ, setTimePerQ] = useState(2);
  const [selGrade, setSelGrade] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selUnit, setSelUnit] = useState('');
  const [selTopic, setSelTopic] = useState('');
  const [selQIds, setSelQIds] = useState([]);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalConfig, setAiModalConfig] = useState({ subject: 'Matematik', topic: '' });

  useEffect(() => {
    if (data?.grades?.length > 0 && !newStudentGrade) {
      setNewStudentGrade(data.grades[0].id);
    }
  }, [data?.grades, newStudentGrade]);

  /* ── Derived Data ── */
  const students = useMemo(() => {
    return (users || []).filter(u => u.role === 'student' &&
      (currentUser?.role === 'admin' || u.teacherId === currentUser?.id));
  }, [users, currentUser]);

  const coachedIds = getCoachedStudentIds(currentUser?.id || 'teacher_1');
  const teacherStudentIds = useMemo(() => students.map(s => s.id), [students]);

  const teacherHomeworks = useMemo(() => {
    if (currentUser?.role === 'admin') return homeworks || [];
    return (homeworks || []).filter(h =>
      h.assignedBy === currentUser?.id || h.createdBy === currentUser?.id || h.teacherId === currentUser?.id
    );
  }, [homeworks, currentUser]);

  const teacherHwIds = useMemo(() => teacherHomeworks.map(h => h.id), [teacherHomeworks]);

  const teacherSubmissions = useMemo(() => {
    // 1. Global submissions from evaluation context
    const globalList = (submissions || []).filter(sub =>
      currentUser?.role === 'admin' ||
      teacherStudentIds.includes(sub.studentId) ||
      teacherHwIds.includes(sub.testId)
    );

    // 2. Also collect valid embedded submissions inside teacherHomeworks
    const seenIds = new Set(globalList.map(s => String(s.id)));
    const embeddedList = [];
    teacherHomeworks.forEach(hw => {
      const subs = Array.isArray(hw.submissions)
        ? hw.submissions
        : (Array.isArray(hw.raw_data?.submissions) ? hw.raw_data.submissions : []);
      subs.forEach(s => {
        if (!s || s.status === 'in_progress' || s.status === 'draft') return;
        const sId = String(s.id || `hwsub_${hw.id}_${s.studentId}`);
        if (!seenIds.has(sId)) {
          seenIds.add(sId);
          embeddedList.push({
            ...s,
            id: sId,
            title: s.title || hw.title,
            subject: s.subject || hw.subject || 'Genel',
            homework_id: hw.id,
            testId: s.testId || hw.id,
            studentId: s.studentId || s.student_id
          });
        }
      });
    });

    return [...globalList, ...embeddedList];
  }, [submissions, teacherStudentIds, teacherHwIds, teacherHomeworks, currentUser]);

  // Comprehensive homework submission matcher
  const getHomeworkSubmissionStats = (hw) => {
    if (!hw) return { studentCount: 0, totalCount: 0 };

    const hwIdStr = String(hw.id || '');
    const hwCleanId = hwIdStr.replace(/^hw_/, '');
    const hwUuid = toUUID(hwIdStr);

    // 1. Direct submissions inside hw
    const embeddedSubs = Array.isArray(hw.submissions)
      ? hw.submissions
      : (Array.isArray(hw.raw_data?.submissions) ? hw.raw_data.submissions : []);
    const validEmbedded = embeddedSubs.filter(s => s && s.status !== 'in_progress' && s.status !== 'draft');

    // 2. Tests in this homework
    const rawTests = hw.tests || hw.raw_data?.tests || [];
    const testIdSet = new Set();
    if (Array.isArray(rawTests)) {
      rawTests.forEach(t => {
        if (!t) return;
        const tStr = String(t.id || t);
        testIdSet.add(tStr);
        testIdSet.add(tStr.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, ''));
        const u = toUUID(tStr);
        if (u) testIdSet.add(String(u));
      });
    }

    // 3. Match from teacherSubmissions
    const matchedGlobalSubs = (teacherSubmissions || []).filter(s => {
      if (!s) return false;
      let raw = {};
      if (typeof s.raw_data === 'string') {
        try { raw = JSON.parse(s.raw_data); } catch(e){}
      } else if (s.raw_data && typeof s.raw_data === 'object') {
        raw = s.raw_data;
      }
      if (s.status === 'in_progress' || s.status === 'draft' || raw.status === 'in_progress' || raw.status === 'draft') return false;

      const subFields = [
        s.id, s.test_id, s.testId, s.homework_id, s.hw_id, s.hwId, s.homeworkId,
        raw.id, raw.testId, raw.realTestId, raw.bookTestId, raw.hwId, raw.homeworkId, raw.homework_id
      ].filter(Boolean).map(String);

      const matchesHw = subFields.some(f => {
        return f === hwIdStr || f === hwCleanId || (hwUuid && f === String(hwUuid)) || toUUID(f) === hwUuid || toUUID(f) === hwIdStr;
      });
      if (matchesHw) return true;

      if (testIdSet.size > 0) {
        const matchesTest = subFields.some(f => {
          const cleanF = f.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
          return testIdSet.has(f) || testIdSet.has(cleanF) || (toUUID(f) && testIdSet.has(String(toUUID(f))));
        });
        if (matchesTest) return true;
      }

      if (hw.title && (s.title === hw.title || raw.title === hw.title)) {
        return true;
      }

      return false;
    });

    // Count unique students who submitted
    const uniqueStudents = new Set();
    validEmbedded.forEach(s => {
      const sid = s.studentId || s.student_id;
      if (sid) uniqueStudents.add(String(sid));
    });
    matchedGlobalSubs.forEach(s => {
      const sid = s.student_id || s.studentId || s.raw_data?.studentId;
      if (sid) uniqueStudents.add(String(sid));
    });

    const studentCount = uniqueStudents.size;
    const totalCount = Math.max(studentCount, validEmbedded.length, matchedGlobalSubs.length);

    return { studentCount, totalCount };
  };

  // Pending Approvals & Evaluations
  const pendingManualApprovals = useMemo(() => {
    const manualTests = (submissions || []).filter(sub => {
      if (!sub) return false;
      const isManual = Boolean(
        sub.isManual === true ||
        sub.sourceType === 'manual_test' ||
        String(sub.id || '').startsWith('sub_manual') ||
        String(sub.testId || '').startsWith('sub_manual')
      );
      if (!isManual) return false;
      const isPending = sub.approvalStatus === 'pending' || sub.status === 'pending_approval' || (sub.isApproved === false && sub.approvalStatus !== 'rejected');
      if (!isPending) return false;
      if (currentUser?.role === 'admin') return true;
      return teacherStudentIds.includes(String(sub.studentId)) || teacherStudentIds.includes(String(toUUID(sub.studentId)));
    });

    const manualMocks = (mockExams || []).filter(m => {
      if (!m) return false;
      const isPending = m.approvalStatus === 'pending' || m.status === 'pending_approval' || (m.isApproved === false && m.approvalStatus !== 'rejected');
      if (!isPending) return false;
      if (currentUser?.role === 'admin') return true;
      return teacherStudentIds.includes(String(m.studentId)) || teacherStudentIds.includes(String(toUUID(m.studentId)));
    });

    return [...manualTests, ...manualMocks];
  }, [submissions, mockExams, teacherStudentIds, currentUser]);

  const pendingEvaluations = useMemo(() => {
    return teacherSubmissions.filter(sub => {
      if (!sub) return false;
      if (
        sub.sourceType === 'trackedBook' ||
        sub.sourceType === 'online_quiz' ||
        sub.sourceType === 'modular_quiz' ||
        sub.sourceType === 'physical_exam' ||
        sub.isManual === true ||
        sub.sourceType === 'manual_test'
      ) return false;
      if (sub.isEvaluatedByTeacher || sub.status === 'evaluated' || sub.status === 'approved' || sub.evalStatus === 'graded' || sub.evaluatedAt) return false;

      const isOpenEndedType = sub.type === 'open_ended' || sub.sourceType === 'open_ended' || sub.format === 'open_ended';
      if (!isOpenEndedType) return false;

      const hasUnscoredOpenEnded = Array.isArray(sub.answers) && sub.answers.some(a =>
        (a.questionType === 'open_ended' || a.isOpenEnded) &&
        a.userAnswerText && String(a.userAnswerText).trim() !== '' &&
        typeof a.score !== 'number' &&
        !a.evaluatedByTeacher &&
        !a.evaluatedAt
      );
      return Boolean(hasUnscoredOpenEnded);
    });
  }, [teacherSubmissions]);

  const totalPendingActionCount = pendingManualApprovals.length + pendingEvaluations.length;

  // Executive Metrics
  const executiveMetrics = useMemo(() => {
    let totalQuestions = 0;
    let totalCorrect = 0;
    teacherSubmissions.forEach(sub => {
      const c = Number(sub.correctCount ?? sub.correct ?? 0);
      const w = Number(sub.wrongCount ?? sub.wrong ?? 0);
      const b = Number(sub.emptyCount ?? sub.blankCount ?? 0);
      totalQuestions += Number(sub.totalQuestions || (c + w + b) || 10);
      totalCorrect += c;
    });
    const avgSuccess = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    return { totalQuestions, avgSuccess, totalSubs: teacherSubmissions.length };
  }, [teacherSubmissions]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchQuery = !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase());
      const matchGrade = !selectedGradeFilter || String(s.grade || s.gradeId) === String(selectedGradeFilter);
      return matchQuery && matchGrade;
    });
  }, [students, studentSearch, selectedGradeFilter]);

  // Ensure default selected student for programs
  useEffect(() => {
    if (students.length > 0 && !selectedProgramStudentId) {
      setSelectedProgramStudentId(students[0].id);
    }
  }, [students, selectedProgramStudentId]);

  // Available subjects from submissions
  const availableSubjects = useMemo(() => {
    const set = new Set();
    teacherSubmissions.forEach(s => {
      const subj = s.subject || s.raw_data?.subject;
      if (subj && subj !== 'Genel' && subj !== 'null' && subj !== 'undefined') {
        set.add(subj);
      }
    });
    return Array.from(set).sort();
  }, [teacherSubmissions]);

  // Advanced Filtered Submissions (all 266+ submissions)
  const filteredSubmissions = useMemo(() => {
    return teacherSubmissions.filter(sub => {
      if (!sub) return false;
      const std = students.find(s => s.id === sub.studentId || toUUID(s.id) === sub.studentId) || { name: sub.studentName || 'Öğrenci' };

      // 1. Student filter
      if (feedStudentFilter !== 'all' && String(sub.studentId) !== String(feedStudentFilter) && String(toUUID(sub.studentId)) !== String(feedStudentFilter)) {
        return false;
      }

      // 2. Subject filter
      if (feedSubjectFilter !== 'all') {
        const subSubj = String(sub.subject || '').toLowerCase();
        if (!subSubj.includes(feedSubjectFilter.toLowerCase())) return false;
      }

      // 3. Type filter
      if (feedTypeFilter !== 'all') {
        const titleLower = String(sub.title || sub.testName || '').toLowerCase();
        const isRemedial = titleLower.includes('telafi') || sub.isRemedial || sub.sourceType === 'remedial';
        const isBook = sub.sourceType === 'trackedBook' || sub.bookId || titleLower.includes('ünite') || titleLower.includes('kitap');
        const isExam = sub.type === 'physicalExam' || sub.isManual || titleLower.includes('deneme');

        if (feedTypeFilter === 'remedial' && !isRemedial) return false;
        if (feedTypeFilter === 'book' && (!isBook || isRemedial)) return false;
        if (feedTypeFilter === 'exam' && !isExam) return false;
      }

      // 4. Score filter
      const score = getSubmissionScorePct(sub);
      if (feedScoreFilter === 'high' && score < 70) return false;
      if (feedScoreFilter === 'mid' && (score < 45 || score >= 70)) return false;
      if (feedScoreFilter === 'low' && score >= 45) return false;

      // 5. Search
      if (feedSearch.trim()) {
        const q = feedSearch.trim().toLowerCase();
        const titleMatch = (sub.title || sub.testName || '').toLowerCase().includes(q);
        const nameMatch = (std.name || '').toLowerCase().includes(q);
        const subjMatch = (sub.subject || '').toLowerCase().includes(q);
        if (!titleMatch && !nameMatch && !subjMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const tA = new Date(a.submittedAt || a.createdAt || a.date || 0).getTime();
      const tB = new Date(b.submittedAt || b.createdAt || b.date || 0).getTime();
      return tB - tA;
    });
  }, [teacherSubmissions, feedStudentFilter, feedSubjectFilter, feedTypeFilter, feedScoreFilter, feedSearch, students]);

  // Feed limited strictly to last 10 exams
  const feedSubmissions = useMemo(() => {
    return filteredSubmissions.slice(0, 10);
  }, [filteredSubmissions]);

  // Student submissions count
  const studentSubmissionsCount = useMemo(() => {
    const counts = {};
    students.forEach(st => { counts[st.id] = 0; });
    teacherSubmissions.forEach(s => {
      const sid = s.studentId;
      if (counts[sid] !== undefined) counts[sid]++;
    });
    return counts;
  }, [students, teacherSubmissions]);

  // ── 🔥 TELAFİ HAVUZU: TÜM ÖĞRENCİLERİN GECİKEN GÖREVLERİ (PROGRAM + ÖDEVLER) ──
  const allOverdueTasks = useMemo(() => {
    const list = [];
    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const dayKeys = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
    const currentDayNum = now.getDay(); // 0: Paz, 1: Pzt, 2: Sal, ... 6: Cts
    const todayKey = currentDayNum === 0 ? 'Paz' : dayKeys[currentDayNum - 1];
    const todayIndex = dayKeys.indexOf(todayKey);

    // 1. Haftalık Çalışma Programlarından Günü Geçen & Tamamlanmamış Görevler
    students.forEach((st) => {
      const profile = getCoachingProfileForStudent(st.id) || {};
      const weekly = normalizeWeeklyProgram(profile.weeklyProgram);

      weekly.forEach((d) => {
        const dIdx = dayKeys.indexOf(d.day);
        // Sadece bugünden önceki günlerin tamamlanmamış görevleri
        if (dIdx !== -1 && dIdx < todayIndex) {
          const dayInfo = DAYS.find(x => x.key === d.day) || { key: d.day, long: d.day };
          const daysOverdue = todayIndex - dIdx;

          (d.items || []).forEach((item, itemIdx) => {
            const isCompleted = Boolean(
              item.completed ||
              item.done ||
              item.isCompleted ||
              checkHasItemBeenAttempted(item, st.id, teacherSubmissions, teacherHomeworks)
            );

            if (!isCompleted) {
              const taskTypeObj = TASK_TYPES.find(t => t.id === (item.taskType || item.type)) || { label: 'Konu/Test', icon: '📌' };
              list.push({
                uniqueId: `prog_${st.id}_${d.day}_${item.id || item.key || itemIdx}`,
                id: item.id || item.key || `item_${itemIdx}`,
                studentId: st.id,
                studentName: st.name,
                studentGrade: st.grade || st.gradeId || '',
                title: item.text || item.title || item.testName || 'Program Görevi',
                subject: item.subject || 'Genel Ders',
                taskType: item.taskType || item.type || 'konu',
                taskTypeLabel: taskTypeObj.label,
                taskTypeIcon: taskTypeObj.icon,
                sourceType: 'program',
                sourceLabel: `Haftalık Program (${dayInfo.long})`,
                dayKey: d.day,
                dayName: dayInfo.long,
                daysOverdue,
                delayText: `${dayInfo.long} gününden (${daysOverdue} gün gecikti)`,
                page: item.page || (item.startPage && item.endPage ? `${item.startPage}-${item.endPage}` : ''),
                targetQuestionCount: item.targetQuestionCount || item.questionCount || null,
                rawItem: item
              });
            }
          });
        }
      });
    });

    // 2. Süresi Dolan & Teslim Edilmemiş Ödevler
    teacherHomeworks.forEach((hw) => {
      if (!hw.dueDate) return;
      const due = new Date(hw.dueDate);
      const dueTime = due.getTime();
      if (isNaN(dueTime) || dueTime >= todayZero) return;

      const diffDays = Math.max(1, Math.round((todayZero - dueTime) / (1000 * 60 * 60 * 24)));

      students.forEach((st) => {
        const isAssigned = isHomeworkForStudent(hw, st, data?.grades || []);
        if (!isAssigned) return;

        const stIdStr = String(st.id);
        const stUuidStr = String(toUUID(st.id) || '');

        // Check embedded submissions
        const embeddedSubs = Array.isArray(hw.submissions)
          ? hw.submissions
          : (Array.isArray(hw.raw_data?.submissions) ? hw.raw_data.submissions : []);
        const submittedInHw = embeddedSubs.some(s => {
          if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
          const sSid = String(s.studentId || s.student_id || '');
          return sSid === stIdStr || sSid === stUuidStr;
        });
        if (submittedInHw) return;

        // Check global teacher submissions
        const submittedInGlobal = teacherSubmissions.some(s => {
          if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
          const sSid = String(s.studentId || s.student_id || s.raw_data?.studentId || '');
          if (sSid !== stIdStr && sSid !== stUuidStr) return false;

          const hwIdStr = String(hw.id || '');
          const subHwId = String(s.homework_id || s.hw_id || s.hwId || s.homeworkId || '');
          if (subHwId && (subHwId === hwIdStr || toUUID(subHwId) === toUUID(hwIdStr))) return true;
          if (hw.title && (s.title === hw.title || s.testName === hw.title)) return true;

          return false;
        });
        if (submittedInGlobal) return;

        list.push({
          uniqueId: `hw_${st.id}_${hw.id}`,
          id: hw.id,
          studentId: st.id,
          studentName: st.name,
          studentGrade: st.grade || st.gradeId || '',
          title: hw.title || 'Ödev',
          subject: hw.subject || 'Genel Ders',
          taskType: 'ödev',
          taskTypeLabel: 'Ödev',
          taskTypeIcon: '📝',
          sourceType: 'homework',
          sourceLabel: 'Ödev',
          dueDate: hw.dueDate,
          daysOverdue: diffDays,
          delayText: `Son teslim: ${due.toLocaleDateString('tr-TR')} (${diffDays} gün gecikti)`,
          rawHomework: hw
        });
      });
    });

    // En çok gecikenler üstte olacak şekilde sırala
    return list.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [students, getCoachingProfileForStudent, teacherSubmissions, teacherHomeworks, data?.grades]);

  // Filtered Overdue Tasks for Telafi Havuzu
  const filteredOverdueTasks = useMemo(() => {
    return allOverdueTasks.filter(task => {
      // 1. Öğrenci filtresi
      if (remedialStudentFilter !== 'all' && String(task.studentId) !== String(remedialStudentFilter)) {
        return false;
      }
      // 2. Ders filtresi
      if (remedialSubjectFilter !== 'all' && (task.subject || '') !== remedialSubjectFilter) {
        return false;
      }
      // 3. Kaynak filtresi
      if (remedialSourceFilter !== 'all' && task.sourceType !== remedialSourceFilter) {
        return false;
      }
      // 4. Arama
      if (remedialSearch.trim()) {
        const q = remedialSearch.trim().toLowerCase();
        const tMatch = (task.title || '').toLowerCase().includes(q);
        const sMatch = (task.studentName || '').toLowerCase().includes(q);
        const subjMatch = (task.subject || '').toLowerCase().includes(q);
        if (!tMatch && !sMatch && !subjMatch) return false;
      }
      return true;
    });
  }, [allOverdueTasks, remedialStudentFilter, remedialSubjectFilter, remedialSourceFilter, remedialSearch]);

  // Unique count of students with delays
  const overdueStudentCount = useMemo(() => {
    return new Set(allOverdueTasks.map(t => t.studentId)).size;
  }, [allOverdueTasks]);

  // Available subjects for Telafi Havuzu filter
  const availableRemedialSubjects = useMemo(() => {
    const set = new Set();
    allOverdueTasks.forEach(t => {
      if (t.subject) set.add(t.subject);
    });
    return Array.from(set).sort();
  }, [allOverdueTasks]);

  // Program görevini tamamlandı olarak işaretle (haftalık programı günceller)
  const handleMarkProgramTaskCompleted = async (task) => {
    try {
      const profile = getCoachingProfileForStudent(task.studentId) || {};
      const weekly = normalizeWeeklyProgram(profile.weeklyProgram);
      const updatedWeekly = weekly.map(d => {
        if (d.day !== task.dayKey) return d;
        return {
          ...d,
          items: (d.items || []).map((it, idx) => {
            const isMatch = (it.id && String(it.id) === String(task.id)) ||
                            (it.key && String(it.key) === String(task.id)) ||
                            (`item_${idx}` === String(task.id)) ||
                            (it.text && it.text === task.title);
            if (isMatch) {
              return { ...it, completed: true, done: true, isCompleted: true };
            }
            return it;
          })
        };
      });

      await saveCoachingProfile({
        ...profile,
        studentId: task.studentId,
        weeklyProgram: updatedWeekly
      });
    } catch (err) {
      console.error('Görev tamamlandı olarak işaretlenirken hata:', err);
      alert('Görev güncellenirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
    }
  };

  // Active Program Student & Profiles
  const activeProgramStudent = useMemo(() => {
    return students.find(s => s.id === selectedProgramStudentId || toUUID(s.id) === selectedProgramStudentId) || students[0] || null;
  }, [students, selectedProgramStudentId]);

  const activeStudentProfile = useMemo(() => {
    if (!activeProgramStudent?.id) return {};
    return getCoachingProfileForStudent(activeProgramStudent.id) || {};
  }, [activeProgramStudent, getCoachingProfileForStudent]);

  const activeWeeklyProgram = useMemo(() => {
    return normalizeWeeklyProgram(activeStudentProfile?.weeklyProgram);
  }, [activeStudentProfile]);

  const programStats = useMemo(() => {
    let totalItems = 0;
    let completedItems = 0;
    activeWeeklyProgram.forEach(d => {
      (d.items || []).forEach(it => {
        totalItems++;
        if (it.completed) completedItems++;
      });
    });
    const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return { totalItems, completedItems, pct };
  }, [activeWeeklyProgram]);

  // Filtered Homeworks List
  const filteredHomeworks = useMemo(() => {
    return teacherHomeworks.filter(h => {
      return !hwSearch || h.title?.toLowerCase().includes(hwSearch.toLowerCase()) || h.subject?.toLowerCase().includes(hwSearch.toLowerCase());
    });
  }, [teacherHomeworks, hwSearch]);

  /* ── Handlers ── */
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentEmail.trim()) return;
    try {
      await addStudentForTeacher({
        name: newStudentName.trim(),
        email: newStudentEmail.trim(),
        password: newStudentPassword,
        grade: newStudentGrade,
        gradeId: newStudentGrade,
        role: 'student',
        teacherId: currentUser?.id
      });
      setShowAddStudentModal(false);
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentPassword('123456');
    } catch (err) {
      alert('Öğrenci eklenirken hata: ' + (err.message || 'Bilinmeyen hata'));
    }
  };

  const openEditStudent = (std) => {
    setEditingStudent(std);
    setEditStudentName(std.name || '');
    setEditStudentEmail(std.email || '');
    setEditStudentPassword(std.password || '');
    setEditStudentGrade(std.grade || std.gradeId || '');
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await updateUser(editingStudent.id, {
        name: editStudentName.trim(),
        email: editStudentEmail.trim(),
        password: editStudentPassword,
        grade: editStudentGrade,
        gradeId: editStudentGrade
      });
      setEditingStudent(null);
    } catch (err) {
      alert('Öğrenci güncellenirken hata: ' + (err.message || 'Bilinmeyen hata'));
    }
  };

  const handleSaveAiQuestions = (generatedList) => {
    setIsAiModalOpen(false);
    alert(`${generatedList.length} soru başarıyla oluşturuldu ve soru bankanıza kaydedildi!`);
  };

  // Test Creator cascade
  const filtSubs = useMemo(() => {
    if (!selGrade || selGrade === 'all') return data?.subjects || [];
    return (data?.subjects || []).filter(s => s.gradeId === selGrade);
  }, [data?.subjects, selGrade]);

  const filtUnits = useMemo(() => {
    if (!selSubject || selSubject === 'all') return [];
    return (data?.units || []).filter(u => u.subjectId === selSubject);
  }, [data?.units, selSubject]);

  const filtTopics = useMemo(() => {
    if (!selUnit || selUnit === 'all') return [];
    return (data?.topics || []).filter(t => t.unitId === selUnit);
  }, [data?.topics, selUnit]);

  const getCatId = () => {
    if (selTopic && selTopic !== 'all') return selTopic;
    if (selUnit && selUnit !== 'all') return `unit_${selUnit}_all`;
    if (selSubject && selSubject !== 'all') return `sub_${selSubject}_all`;
    if (selGrade && selGrade !== 'all') return `grade_${selGrade}_all`;
    return null;
  };
  const catId = getCatId();
  const poolQs = questions.filter(q => q.topicId === catId);
  const toggleQ = (id) => setSelQIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleSaveTest = (e) => {
    e.preventDefault();
    if (!testName.trim() || !catId || selQIds.length === 0) return;
    const chosen = poolQs.filter(q => selQIds.includes(q.id));
    const total = chosen.reduce((s, q) => s + (q.isBundle ? (q.questionCount || 1) : 1), 0);
    const payload = {
      title: testName.trim(),
      subject: selSubject !== 'all' && selSubject !== '' ? (data?.subjects?.find(s => s.id === selSubject)?.name || 'Genel') : 'Genel',
      gradeId: selGrade !== 'all' ? selGrade : 'all',
      timePerQuestion: Number(timePerQ) || 2,
      time: (Number(timePerQ) || 2) * total,
      questionCount: total,
      questionIds: selQIds,
      createdBy: currentUser?.id,
      filters: { selGrade, selSubject, selUnit, selTopic },
      date: new Date().toISOString()
    };
    if (editingTestId && updateTest) {
      updateTest(editingTestId, payload);
    } else if (addTest) {
      addTest(payload);
    }
    setShowTestModal(false);
    setEditingTestId(null);
    setTestName('');
    setSelQIds([]);
  };

  return (
    <SmartPullToRefresh>
      <div className="teacher-container">
        <div className="teacher-wrapper">

          {/* ═══════════════════════════════════════════════════
              1. HEADER (SADE BAŞLIK & EYLEM ÇUBUĞU)
              ═══════════════════════════════════════════════════ */}
          <header className="teacher-header">
            <div className="teacher-header-profile">
              <div className="teacher-header-icon">
                <Users size={22} />
              </div>
              <div className="teacher-header-text">
                <h1>Öğretmen Paneli</h1>
                <p className="teacher-header-sub">
                  Hoş geldiniz, {currentUser?.name || 'Öğretmenim'} • {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>

            <div className="teacher-header-actions">
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="btn-primary-action"
              >
                <UserPlus size={15} />
                <span>+ Yeni Öğrenci Ekle</span>
              </button>

              <button
                onClick={() => navigate('/homeworks')}
                className="btn-secondary-action"
              >
                <BookOpen size={15} />
                <span>+ Yeni Ödev Ver</span>
              </button>
            </div>
          </header>

          {/* ═══════════════════════════════════════════════════
              2. BEKLEYEN İŞLEMLER BİLDİRİMİ (VARSA)
              ═══════════════════════════════════════════════════ */}
          {totalPendingActionCount > 0 && (
            <div className="teacher-pending-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertCircle size={17} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#b91c1c' }}>
                    {totalPendingActionCount} adet onay / değerlendirme bekleyen işlem var.
                  </strong>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    {pendingManualApprovals.length > 0 && `${pendingManualApprovals.length} manuel sınav onayı`}
                    {pendingManualApprovals.length > 0 && pendingEvaluations.length > 0 && ' · '}
                    {pendingEvaluations.length > 0 && `${pendingEvaluations.length} açık uçlu test kağıdı`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/approvals')}
                className="btn-primary-action"
                style={{ background: '#dc2626' }}
              >
                Onay Merkezine Git <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              3. DÖRT TEMEL DURUM KARTI (NET & SADE)
              ═══════════════════════════════════════════════════ */}
          <div className="teacher-kpi-grid">
            {/* Toplam Öğrenci */}
            <div className="teacher-kpi-card" onClick={() => setActiveTab('students')} style={{ cursor: 'pointer' }}>
              <div className="teacher-kpi-icon" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
                <Users size={22} />
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Kayıtlı Öğrenciler</span>
                <span className="teacher-kpi-value">{students.length}</span>
                <span className="teacher-kpi-sub">{coachedIds.length} öğrenci koçlukta</span>
              </div>
            </div>

            {/* Aktif Ödevler */}
            <div className="teacher-kpi-card" onClick={() => setActiveTab('homeworks')} style={{ cursor: 'pointer' }}>
              <div className="teacher-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <BookOpen size={22} />
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Verilen Ödevler</span>
                <span className="teacher-kpi-value">{teacherHomeworks.length}</span>
                <span className="teacher-kpi-sub">Sınıfa atanan görevler</span>
              </div>
            </div>

            {/* Çözülen Sınavlar */}
            <div className="teacher-kpi-card" onClick={() => setActiveTab('submissions')} style={{ cursor: 'pointer' }}>
              <div className="teacher-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <ClipboardCheck size={22} />
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Çözülen Sınavlar</span>
                <span className="teacher-kpi-value">{teacherSubmissions.length}</span>
                <span className="teacher-kpi-sub">{executiveMetrics.totalQuestions} soru tamamlandı</span>
              </div>
            </div>

            {/* Sınıf Başarısı */}
            <div className="teacher-kpi-card" onClick={() => setActiveTab('analytics')} style={{ cursor: 'pointer' }}>
              <div className="teacher-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                <TrendingUp size={22} />
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Sınıf Başarısı</span>
                <span className="teacher-kpi-value">%{executiveMetrics.avgSuccess}</span>
                <span className="teacher-kpi-sub">Genel net ortalaması</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              4. DÖRT HIZLI VE NET EYLEM BUTONU
              ═══════════════════════════════════════════════════ */}
          <div className="teacher-quick-actions-grid">
            <button onClick={() => navigate('/homeworks')} className="teacher-action-card">
              <div className="teacher-action-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <BookOpen size={20} />
              </div>
              <div className="teacher-action-content">
                <h4>Ödev Ver &amp; Dağıt</h4>
                <p>Sınıfa veya öğrenciye test ödevi ata</p>
              </div>
            </button>

            <button onClick={() => setIsAiModalOpen(true)} className="teacher-action-card">
              <div className="teacher-action-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
                <Sparkles size={20} />
              </div>
              <div className="teacher-action-content">
                <h4>Yapay Zeka Soru Üret</h4>
                <p>Müfredata uygun yeni nesil soru türet</p>
              </div>
            </button>

            <button onClick={() => navigate('/pdf-slicer')} className="teacher-action-card">
              <div className="teacher-action-icon" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
                <Scissors size={20} />
              </div>
              <div className="teacher-action-content">
                <h4>PDF Soru Kırpıcı</h4>
                <p>Kitap veya denemeden soru kırpıp ekle</p>
              </div>
            </button>

            <button onClick={() => navigate('/approvals')} className="teacher-action-card">
              <div className="teacher-action-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <ClipboardCheck size={20} />
              </div>
              <div className="teacher-action-content">
                <h4>Onay &amp; Değerlendirme</h4>
                <p>Manuel sınavları ve kağıtları onayla</p>
              </div>
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════
              5. SADE VE ANLAŞILIR SEKME ÇUBUĞU
              ═══════════════════════════════════════════════════ */}
          <nav className="teacher-tabs-nav">
            <button
              onClick={() => setActiveTab('students')}
              className={`teacher-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            >
              <Users size={16} />
              <span>Öğrencilerim</span>
              <span className="teacher-tab-badge">{students.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('submissions')}
              className={`teacher-tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
            >
              <CheckCircle2 size={16} />
              <span>Son Çözülen Sınavlar</span>
              <span className="teacher-tab-badge">{teacherSubmissions.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('homeworks')}
              className={`teacher-tab-btn ${activeTab === 'homeworks' ? 'active' : ''}`}
            >
              <BookOpen size={16} />
              <span>Verilen Ödevler</span>
              <span className="teacher-tab-badge">{teacherHomeworks.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`teacher-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            >
              <BarChart3 size={16} />
              <span>Sınıf Analizi &amp; Grafikler</span>
            </button>
          </nav>

          {/* ═══════════════════════════════════════════════════
              SEKME 1: ÖĞRENCİLERİM (VARSAYILAN / EN ÇOK KULLANILAN)
              ═══════════════════════════════════════════════════ */}
          {activeTab === 'students' && (
            <div className="teacher-simple-card">
              <div className="teacher-filter-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 240 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Öğrenci adı veya e-posta ile ara..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="teacher-form-input"
                      style={{ paddingLeft: '2rem' }}
                    />
                  </div>
                  <select
                    value={selectedGradeFilter}
                    onChange={e => setSelectedGradeFilter(e.target.value)}
                    className="teacher-form-input"
                    style={{ width: 'auto', minWidth: 140 }}
                  >
                    <option value="">Tüm Sınıflar</option>
                    {data?.grades?.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="btn-primary-action"
                >
                  <UserPlus size={14} /> Yeni Öğrenci
                </button>
              </div>

              {filteredStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                  Arama kriterine uygun öğrenci bulunamadı.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="teacher-simple-table">
                    <thead>
                      <tr>
                        <th>Öğrenci</th>
                        <th>Sınıf</th>
                        <th>Çözülen Sınav</th>
                        <th>Başarı Oranı</th>
                        <th style={{ textAlign: 'right' }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((std, idx) => {
                        const isCoached = coachedIds.includes(std.id);
                        const stdSubs = teacherSubmissions.filter(s => s.studentId === std.id);
                        let totQ = 0, totC = 0;
                        stdSubs.forEach(s => {
                          const c = Number(s.correctCount ?? s.correct ?? 0);
                          const w = Number(s.wrongCount ?? s.wrong ?? 0);
                          const b = Number(s.emptyCount ?? s.blankCount ?? 0);
                          totQ += Number(s.totalQuestions || (c + w + b) || 10);
                          totC += c;
                        });
                        const avg = totQ > 0 ? Math.round((totC / totQ) * 100) : 0;
                        const gradeObj = data?.grades?.find(g => String(g.id) === String(std.grade || std.gradeId));

                        return (
                          <tr key={std.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <StudentAvatar name={std.name} index={idx} size={34} />
                                <div>
                                  <div style={{ fontWeight: 800, color: 'var(--color-text)' }}>{std.name}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{std.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="teacher-badge-pill">
                                {gradeObj?.name || 'Öğrenci'}
                              </span>
                            </td>
                            <td>
                              <strong>{stdSubs.length}</strong> test
                            </td>
                            <td>
                              <span style={{
                                fontWeight: 800,
                                color: avg >= 70 ? '#10b981' : avg >= 45 ? '#f59e0b' : '#ef4444'
                              }}>
                                %{avg}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <button
                                  onClick={() => setSelectedReportStudent(std)}
                                  className="btn-secondary-action"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem' }}
                                  title="Gelişim karnesini ve net durumunu gör"
                                >
                                  <BarChart3 size={13} /> Karne Aç
                                </button>

                                <button
                                  onClick={() => navigate(`/coaching/${std.id}`)}
                                  style={{
                                    padding: '0.35rem 0.65rem', borderRadius: '0.65rem',
                                    border: '1px solid var(--color-border)',
                                    background: isCoached ? 'rgba(139, 92, 246, 0.12)' : 'var(--color-surface)',
                                    color: isCoached ? '#8b5cf6' : 'var(--color-text-muted)',
                                    fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: 3
                                  }}
                                  title="Öğrencinin koçluk planını aç"
                                >
                                  <Map size={13} /> Koçluk
                                </button>

                                <button
                                  onClick={() => openEditStudent(std)}
                                  style={{
                                    padding: '0.35rem 0.5rem', borderRadius: '0.65rem',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-surface)',
                                    color: 'var(--color-text-muted)',
                                    cursor: 'pointer'
                                  }}
                                  title="Öğrenci bilgilerini / şifresini düzenle"
                                >
                                  <Edit2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SEKME 2: SON ÇÖZÜLEN SINAVLAR, TELAFİ HAVUZU & ÖĞRENCİ PROGRAMLARI
              ═══════════════════════════════════════════════════ */}
          {activeTab === 'submissions' && (
            <div className="teacher-simple-card">
              {/* 🧭 ÜÇLÜ ALT SEKME KONTROLÜ */}
              <div className="teacher-subtab-container">
                <div className="teacher-subtab-nav">
                  <button
                    type="button"
                    onClick={() => setSubmissionSubTab('feed')}
                    className={`teacher-subtab-pill ${submissionSubTab === 'feed' ? 'active' : ''}`}
                  >
                    <CheckCircle2 size={15} />
                    <span>Sınav Çözüm Akışı</span>
                    <span className="teacher-subtab-count">Son {feedSubmissions.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionSubTab('remedials')}
                    className={`teacher-subtab-pill ${submissionSubTab === 'remedials' ? 'active' : ''}`}
                  >
                    <AlertCircle size={15} />
                    <span>⚠️ Telafi Havuzu (Geciken Görevler)</span>
                    {allOverdueTasks.length > 0 ? (
                      <span className="teacher-subtab-count error">{allOverdueTasks.length} Gecikme</span>
                    ) : (
                      <span className="teacher-subtab-count" style={{ background: '#dcfce7', color: '#15803d' }}>0</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionSubTab('programs')}
                    className={`teacher-subtab-pill ${submissionSubTab === 'programs' ? 'active' : ''}`}
                  >
                    <Calendar size={15} />
                    <span>Öğrenci Çalışma Programları</span>
                    <span className="teacher-subtab-count">{students.length} Öğrenci</span>
                  </button>
                </div>

                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  {submissionSubTab === 'feed' && `Son ${feedSubmissions.length} Sınav Çözümü Gösteriliyor`}
                  {submissionSubTab === 'remedials' && `Toplam ${allOverdueTasks.length} Geciken Görev Bulundu`}
                  {submissionSubTab === 'programs' && `Haftalık İlerleme: %${programStats.pct}`}
                </div>
              </div>

              {/* ────────────────────────────────────────────────
                  ALT GÖRÜNÜM 1: GELİŞMİŞ SINAV ÇÖZÜM AKIŞI (SON 10)
                  ──────────────────────────────────────────────── */}
              {submissionSubTab === 'feed' && (
                <>
                  {/* GELİŞMİŞ FİLTRELEME ÇUBUĞU */}
                  <div className="teacher-advanced-filter-row">
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                      <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Sınav, ders veya öğrenci ara..."
                        value={feedSearch}
                        onChange={e => setFeedSearch(e.target.value)}
                        className="teacher-form-input"
                        style={{ paddingLeft: '1.9rem', fontSize: '0.8rem', padding: '0.45rem 0.75rem 0.45rem 1.9rem' }}
                      />
                    </div>

                    <select
                      value={feedStudentFilter}
                      onChange={e => setFeedStudentFilter(e.target.value)}
                      className="teacher-form-input"
                      style={{ width: 'auto', minWidth: 150, fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                    >
                      <option value="all">Tüm Öğrenciler ({students.length})</option>
                      {students.map(st => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({studentSubmissionsCount[st.id] || 0} Çözüm)
                        </option>
                      ))}
                    </select>

                    <select
                      value={feedSubjectFilter}
                      onChange={e => setFeedSubjectFilter(e.target.value)}
                      className="teacher-form-input"
                      style={{ width: 'auto', minWidth: 120, fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                    >
                      <option value="all">Tüm Dersler</option>
                      {availableSubjects.map(subj => (
                        <option key={subj} value={subj}>{subj}</option>
                      ))}
                    </select>

                    <select
                      value={feedTypeFilter}
                      onChange={e => setFeedTypeFilter(e.target.value)}
                      className="teacher-form-input"
                      style={{ width: 'auto', minWidth: 120, fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                    >
                      <option value="all">Tüm Türler</option>
                      <option value="remedial">⚡ Telafi Testleri</option>
                      <option value="book">📚 Kitap Testleri</option>
                      <option value="exam">📊 Deneme Sınavları</option>
                    </select>

                    <select
                      value={feedScoreFilter}
                      onChange={e => setFeedScoreFilter(e.target.value)}
                      className="teacher-form-input"
                      style={{ width: 'auto', minWidth: 125, fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                    >
                      <option value="all">Tüm Başarılar</option>
                      <option value="high">🟢 Yüksek (%70+)</option>
                      <option value="mid">🟡 Orta (%45-69)</option>
                      <option value="low">🔴 Destek Gereken (&lt;%45)</option>
                    </select>

                    {(feedStudentFilter !== 'all' || feedSubjectFilter !== 'all' || feedTypeFilter !== 'all' || feedScoreFilter !== 'all' || feedSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFeedStudentFilter('all');
                          setFeedSubjectFilter('all');
                          setFeedTypeFilter('all');
                          setFeedScoreFilter('all');
                          setFeedSearch('');
                        }}
                        className="btn-secondary-action"
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.74rem' }}
                        title="Tüm filtreleri kaldır"
                      >
                        ✕ Temizle
                      </button>
                    )}
                  </div>

                  {filteredSubmissions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                      Arama ve filtreleme kriterlerine uygun sınav çözümü bulunamadı.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="teacher-simple-table">
                        <thead>
                          <tr>
                            <th>Öğrenci</th>
                            <th>Sınav / Test Adı</th>
                            <th>Sonuç (D/Y/B)</th>
                            <th>Başarı</th>
                            <th>Yanlış / Boş</th>
                            <th>Zaman</th>
                            <th style={{ textAlign: 'right' }}>İşlemler</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feedSubmissions.map((sub, idx) => {
                            const std = students.find(s => s.id === sub.studentId || toUUID(s.id) === sub.studentId) || { name: sub.studentName || 'Öğrenci' };
                            const c = Number(sub.correctCount ?? sub.correct ?? 0);
                            const w = Number(sub.wrongCount ?? sub.wrong ?? 0);
                            const b = Number(sub.emptyCount ?? sub.blankCount ?? 0);
                            const score = getSubmissionScorePct(sub);
                            const subDate = sub.submittedAt || sub.createdAt || sub.date;
                            const title = sub.title || sub.testName || sub.bookTitle || 'Test';
                            const isRemedial = title.toLowerCase().includes('telafi') || sub.isRemedial || sub.sourceType === 'remedial';

                            return (
                              <tr key={sub.id || idx}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <StudentAvatar name={std.name} index={idx} size={32} />
                                    <div>
                                      <div style={{ fontWeight: 800, color: 'var(--color-text)' }}>{std.name}</div>
                                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{std.email || ''}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                      <strong style={{ color: 'var(--color-text)' }}>{title}</strong>
                                      {isRemedial && (
                                        <span style={{ fontSize: '0.64rem', fontWeight: 900, padding: '1px 5px', borderRadius: 4, background: '#fee2e2', color: '#dc2626' }}>
                                          ⚡ Telafi
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                      {sub.subject || 'Genel Ders'}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ color: '#10b981', fontWeight: 800 }}>{c}D</span>{' '}
                                  <span style={{ color: '#ef4444', fontWeight: 800 }}>{w}Y</span>{' '}
                                  <span style={{ color: '#64748b', fontWeight: 600 }}>{b}B</span>
                                </td>
                                <td>
                                  <span style={{
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '0.45rem',
                                    background: score >= 70 ? 'rgba(16, 185, 129, 0.12)' : score >= 45 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                    color: score >= 70 ? '#059669' : score >= 45 ? '#d97706' : '#dc2626'
                                  }}>
                                    %{score}
                                  </span>
                                </td>
                                <td>
                                  {w > 0 || b > 0 ? (
                                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: w > 0 ? '#dc2626' : 'var(--color-text-muted)' }}>
                                      {w > 0 && `${w} Yanlış`}
                                      {w > 0 && b > 0 && ' · '}
                                      {b > 0 && `${b} Boş`}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#10b981', fontSize: '0.74rem', fontWeight: 800 }}>
                                      ✓ Sıfır Hata
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    {timeAgo(subDate)}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <button
                                      onClick={() => setSelectedReportStudent(std)}
                                      className="btn-secondary-action"
                                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                                      title="Öğrencinin detaylı gelişim karnesini aç"
                                    >
                                      Karne Aç
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (sub.studentId) {
                                          setSelectedProgramStudentId(sub.studentId);
                                          setSubmissionSubTab('programs');
                                        }
                                      }}
                                      className="teacher-program-badge-btn"
                                      title="Öğrencinin haftalık çalışma programını gör"
                                    >
                                      <Calendar size={12} /> Program
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {filteredSubmissions.length > 10 && (
                    <div style={{
                      textAlign: 'center',
                      paddingTop: '0.65rem',
                      fontSize: '0.74rem',
                      color: 'var(--color-text-muted)',
                      fontWeight: 600
                    }}>
                      ⚡ Akışta en son çözülen 10 sınav gösterilmektedir. (Filtrelenen toplam: {filteredSubmissions.length} sınav)
                    </div>
                  )}
                </>
              )}

              {/* ────────────────────────────────────────────────
                  ALT GÖRÜNÜM 2: TELAFİ HAVUZU (GECİKEN GÖREVLER)
                  ──────────────────────────────────────────────── */}
              {submissionSubTab === 'remedials' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* BAŞLIK & BİLGİLENDİRME */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={18} color="#f43f5e" />
                        <span>Telafi Havuzu — Günü Geçen &amp; Geciken Görevler</span>
                      </h3>
                      <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                        Öğrencilerin haftalık çalışma programında geçmiş günlerden tamamlanmamış görevleri ve teslim süresi dolan ödevleri burada toplanır.
                      </p>
                    </div>

                    {allOverdueTasks.length > 0 && (
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '0.3rem 0.75rem', borderRadius: 999 }}>
                        ⚠️ Toplam {allOverdueTasks.length} Geciken Görev Var
                      </div>
                    )}
                  </div>

                  {/* 4 KPI ÖZET KARTI */}
                  <div className="teacher-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
                    <div className="teacher-kpi-card" style={{ borderLeft: '4px solid #f43f5e' }}>
                      <div className="teacher-kpi-header">
                        <span className="teacher-kpi-title">Toplam Gecikme</span>
                        <div className="teacher-kpi-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}>
                          <AlertCircle size={18} />
                        </div>
                      </div>
                      <div className="teacher-kpi-value" style={{ color: '#f43f5e' }}>{allOverdueTasks.length}</div>
                      <div className="teacher-kpi-subtext">Telafi bekleyen görev</div>
                    </div>

                    <div className="teacher-kpi-card" style={{ borderLeft: '4px solid #d97706' }}>
                      <div className="teacher-kpi-header">
                        <span className="teacher-kpi-title">Geciken Öğrenci</span>
                        <div className="teacher-kpi-icon" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
                          <Users size={18} />
                        </div>
                      </div>
                      <div className="teacher-kpi-value" style={{ color: '#d97706' }}>{overdueStudentCount}</div>
                      <div className="teacher-kpi-subtext">Öğrencinin eksiği var</div>
                    </div>

                    <div className="teacher-kpi-card" style={{ borderLeft: '4px solid #4f46e5' }}>
                      <div className="teacher-kpi-header">
                        <span className="teacher-kpi-title">Program Görevleri</span>
                        <div className="teacher-kpi-icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
                          <Calendar size={18} />
                        </div>
                      </div>
                      <div className="teacher-kpi-value" style={{ color: '#4f46e5' }}>
                        {allOverdueTasks.filter(t => t.sourceType === 'program').length}
                      </div>
                      <div className="teacher-kpi-subtext">Haftalık plandan kalan</div>
                    </div>

                    <div className="teacher-kpi-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                      <div className="teacher-kpi-header">
                        <span className="teacher-kpi-title">Geciken Ödevler</span>
                        <div className="teacher-kpi-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
                          <ClipboardCheck size={18} />
                        </div>
                      </div>
                      <div className="teacher-kpi-value" style={{ color: '#7c3aed' }}>
                        {allOverdueTasks.filter(t => t.sourceType === 'homework').length}
                      </div>
                      <div className="teacher-kpi-subtext">Teslim tarihi geçmiş</div>
                    </div>
                  </div>

                  {/* FİLTRELEME ÇUBUĞU */}
                  <div className="teacher-advanced-filter-row">
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                      <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Görev, ders veya öğrenci ara..."
                        value={remedialSearch}
                        onChange={e => setRemedialSearch(e.target.value)}
                        className="teacher-form-input"
                        style={{ paddingLeft: '1.9rem', fontSize: '0.8rem', padding: '0.45rem 0.75rem 0.45rem 1.9rem' }}
                      />
                    </div>

                    <select
                      value={remedialStudentFilter}
                      onChange={e => setRemedialStudentFilter(e.target.value)}
                      className="teacher-form-input"
                      style={{ width: 'auto', minWidth: 150, fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                    >
                      <option value="all">👨‍🎓 Tüm Öğrenciler ({allOverdueTasks.length})</option>
                      {students.map(st => {
                        const stCount = allOverdueTasks.filter(t => String(t.studentId) === String(st.id)).length;
                        return (
                          <option key={st.id} value={st.id}>
                            {st.name} {stCount > 0 ? `(${stCount} gecikme)` : ''}
                          </option>
                        );
                      })}
                    </select>

                    <select
                      value={remedialSubjectFilter}
                      onChange={e => setRemedialSubjectFilter(e.target.value)}
                      className="teacher-form-input"
                      style={{ width: 'auto', minWidth: 120, fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                    >
                      <option value="all">Tüm Dersler</option>
                      {availableRemedialSubjects.map(subj => (
                        <option key={subj} value={subj}>{subj}</option>
                      ))}
                    </select>

                    <select
                      value={remedialSourceFilter}
                      onChange={e => setRemedialSourceFilter(e.target.value)}
                      className="teacher-form-input"
                      style={{ width: 'auto', minWidth: 130, fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                    >
                      <option value="all">Tüm Kaynaklar</option>
                      <option value="program">📅 Haftalık Program</option>
                      <option value="homework">📝 Ödevler</option>
                    </select>

                    {(remedialStudentFilter !== 'all' || remedialSubjectFilter !== 'all' || remedialSourceFilter !== 'all' || remedialSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setRemedialStudentFilter('all');
                          setRemedialSubjectFilter('all');
                          setRemedialSourceFilter('all');
                          setRemedialSearch('');
                        }}
                        className="btn-secondary-action"
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.74rem' }}
                        title="Tüm filtreleri kaldır"
                      >
                        ✕ Temizle
                      </button>
                    )}
                  </div>

                  {/* TABLO VEYA BOŞ DURUM */}
                  {filteredOverdueTasks.length === 0 ? (
                    allOverdueTasks.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '3rem 1.5rem',
                        borderRadius: '0.75rem',
                        background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5',
                        border: '1.5px solid #a7f3d0',
                        color: '#065f46'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                        <h4 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem', fontWeight: 800 }}>
                          Harika! Geciken Görev Yok
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: isDark ? '#a7f3d0' : '#047857' }}>
                          Tüm öğrencilerinizin haftalık çalışma programı ve ödev teslimleri şu an için eksiksiz ve güncel.
                        </p>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                        Seçilen filtre kriterlerine uygun geciken görev bulunamadı.
                      </div>
                    )
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="teacher-simple-table">
                        <thead>
                          <tr>
                            <th>Öğrenci</th>
                            <th>Geciken Görev</th>
                            <th>Ders</th>
                            <th>Kaynak</th>
                            <th>Gecikme Durumu</th>
                            <th style={{ textAlign: 'right' }}>İşlemler</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOverdueTasks.map((task, idx) => {
                            const std = students.find(s => s.id === task.studentId || toUUID(s.id) === task.studentId) || { name: task.studentName || 'Öğrenci' };
                            const isProgram = task.sourceType === 'program';

                            return (
                              <tr key={task.uniqueId || idx}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <StudentAvatar name={std.name} index={idx} size={32} />
                                    <div>
                                      <div style={{ fontWeight: 800, color: 'var(--color-text)' }}>{std.name}</div>
                                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                                        {std.grade || std.gradeId ? `${std.grade || std.gradeId}. Sınıf` : ''}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '0.9rem' }}>{task.taskTypeIcon || '📌'}</span>
                                      <strong style={{ color: 'var(--color-text)' }}>{task.title}</strong>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                      {task.page && `Sayfa: ${task.page} · `}
                                      {task.targetQuestionCount && `${task.targetQuestionCount} Soru · `}
                                      {task.taskTypeLabel || ''}
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '0.35rem',
                                    background: 'var(--color-surface-hover, #f1f5f9)',
                                    color: 'var(--color-text)'
                                  }}>
                                    {task.subject || 'Genel'}
                                  </span>
                                </td>

                                <td>
                                  {isProgram ? (
                                    <span style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      padding: '0.18rem 0.55rem',
                                      borderRadius: '0.45rem',
                                      background: '#eef2ff',
                                      color: '#4338ca',
                                      border: '1px solid #c7d2fe',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}>
                                      <Calendar size={12} />
                                      {task.sourceLabel}
                                    </span>
                                  ) : (
                                    <span style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      padding: '0.18rem 0.55rem',
                                      borderRadius: '0.45rem',
                                      background: '#faf5ff',
                                      color: '#7c3aed',
                                      border: '1px solid #ddd6fe',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}>
                                      <ClipboardCheck size={12} />
                                      Ödev
                                    </span>
                                  )}
                                </td>

                                <td>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '0.45rem',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fecdd3'
                                  }}>
                                    <AlertCircle size={12} />
                                    {task.delayText}
                                  </span>
                                </td>

                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                    {isProgram ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleMarkProgramTaskCompleted(task)}
                                          className="btn-primary-action"
                                          style={{
                                            padding: '0.3rem 0.65rem',
                                            fontSize: '0.72rem',
                                            background: '#059669',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4
                                          }}
                                          title="Bu görevi tamamlandı olarak işaretle"
                                        >
                                          <Check size={12} />
                                          ✓ Tamamlandı
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (task.studentId) {
                                              setSelectedProgramStudentId(task.studentId);
                                              setSubmissionSubTab('programs');
                                            }
                                          }}
                                          className="teacher-program-badge-btn"
                                          title="Öğrencinin haftalık çalışma programını aç"
                                        >
                                          <Calendar size={12} />
                                          Program
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveTab('homeworks');
                                          setHwSearch(task.title || '');
                                        }}
                                        className="btn-secondary-action"
                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                                        title="Ödev detaylarını ve teslimleri yönet"
                                      >
                                        Ödevi Yönet ↗
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────────────────────────────────────
                  ALT GÖRÜNÜM 3: ÖĞRENCİ ÇALIŞMA PROGRAMLARI
                  ──────────────────────────────────────────────── */}
              {submissionSubTab === 'programs' && (
                <div className="teacher-program-container">
                  {/* ÖĞRENCİ SEÇİCİ ÇUBUĞU */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    overflowX: 'auto',
                    paddingBottom: '0.65rem',
                    borderBottom: '1px solid var(--color-border)'
                  }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      👨‍🎓 Öğrenci Seçin:
                    </span>
                    {students.map((st, idx) => {
                      const isSel = String(st.id) === String(selectedProgramStudentId);
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setSelectedProgramStudentId(st.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '0.65rem',
                            border: isSel ? '2px solid #8b5cf6' : '1px solid var(--color-border)',
                            background: isSel ? (isDark ? 'rgba(139,92,246,0.18)' : '#f5f3ff') : 'var(--color-surface)',
                            color: isSel ? '#8b5cf6' : 'var(--color-text)',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <StudentAvatar name={st.name} index={idx} size={22} />
                          <span>{st.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* ÖĞRENCİ ÇALIŞMA PROGRAMI ÖZET BAŞLIĞI */}
                  <div className="teacher-program-header-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <StudentAvatar name={activeProgramStudent?.name} size={44} />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text)' }}>
                          {activeProgramStudent?.name || 'Öğrenci'} — Haftalık Çalışma Programı
                        </h4>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                          {activeProgramStudent?.email || ''} · {programStats.totalItems} Planlanan Görev
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                      <div style={{
                        background: 'var(--color-surface-hover, #f8fafc)',
                        border: '1px solid var(--color-border, #e2e8f0)',
                        borderRadius: '0.75rem',
                        padding: '0.45rem 0.95rem',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '1.15rem',
                          fontWeight: 900,
                          color: programStats.pct >= 70 ? '#10b981' : '#6366f1',
                          lineHeight: 1
                        }}>
                          %{programStats.pct}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
                          {programStats.completedItems} / {programStats.totalItems} Tamamlandı
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/my-program?studentId=${activeProgramStudent?.id}`)}
                        className="btn-primary-action"
                        style={{ padding: '0.55rem 1.05rem', fontSize: '0.78rem' }}
                      >
                        <Calendar size={14} /> ✏️ Program Merkezinde Düzenle
                      </button>
                    </div>
                  </div>

                  {/* GÜN FİLTRE HAPLARI */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setProgramDayFilter('all')}
                      className={`program-day-pill ${programDayFilter === 'all' ? 'active' : ''}`}
                    >
                      Tüm Hafta (Pzt – Paz)
                    </button>
                    {DAYS.map(d => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setProgramDayFilter(d.key)}
                        className={`program-day-pill ${programDayFilter === d.key ? 'active' : ''}`}
                      >
                        {d.long}
                      </button>
                    ))}
                  </div>

                  {/* 7 GÜNLÜK DERS & ÇALIŞMA PROGRAMI GRİDİ */}
                  <div className="program-day-grid">
                    {DAYS.filter(d => programDayFilter === 'all' || programDayFilter === d.key).map(d => {
                      const dayData = activeWeeklyProgram.find(r => r.day === d.key) || { items: [] };
                      const items = dayData.items || [];
                      return (
                        <div key={d.key} className="program-day-column">
                          <div className="program-day-header">
                            <span>{d.long}</span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '0.1rem 0.45rem',
                              borderRadius: 999,
                              background: items.length > 0 ? '#e0e7ff' : 'var(--color-border)',
                              color: items.length > 0 ? '#4338ca' : 'var(--color-text-muted)'
                            }}>
                              {items.length} Görev
                            </span>
                          </div>
                          <div className="program-day-body">
                            {items.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                                Planlanan görev yok
                              </div>
                            ) : (
                              items.map((it, itIdx) => {
                                const isDone = Boolean(it.completed);
                                const taskTypeObj = TASK_TYPES.find(t => t.id === it.taskType || t.id === it.type) || { icon: '📌', label: 'Görev' };
                                return (
                                  <div key={it.id || itIdx} className={`program-task-card ${isDone ? 'completed' : ''}`}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <span style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        padding: '1px 5px',
                                        borderRadius: 4,
                                        background: isDone ? '#dcfce7' : '#e0e7ff',
                                        color: isDone ? '#15803d' : '#4338ca'
                                      }}>
                                        {taskTypeObj.icon} {it.subject || 'Ders'}
                                      </span>
                                      {isDone ? (
                                        <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                          <Check size={11} /> Bitti
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                                          Bekliyor
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.74rem', marginTop: 2 }}>
                                      {it.topic || it.title || it.name || 'Konu Çalışması'}
                                    </div>
                                    {it.targetQuestion > 0 && (
                                      <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                                        🎯 Hedef: {it.targetQuestion} Soru
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SEKME 3: VERİLEN ÖDEVLER
              ═══════════════════════════════════════════════════ */}
          {activeTab === 'homeworks' && (
            <div className="teacher-simple-card">
              <div className="teacher-filter-bar">
                <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Ödev veya ders ara..."
                    value={hwSearch}
                    onChange={e => setHwSearch(e.target.value)}
                    className="teacher-form-input"
                    style={{ paddingLeft: '2rem' }}
                  />
                </div>

                <button
                  onClick={() => navigate('/homeworks')}
                  className="btn-primary-action"
                >
                  <Plus size={14} /> Yeni Ödev Ata
                </button>
              </div>

              {filteredHomeworks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                  Tanımlanmış bir ödev bulunamadı.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="teacher-simple-table">
                    <thead>
                      <tr>
                        <th>Ödev Başlığı</th>
                        <th>Ders</th>
                        <th>Son Teslim Tarihi</th>
                        <th>Teslim Edenler</th>
                        <th style={{ textAlign: 'right' }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHomeworks.map(hw => {
                        const due = hw.dueDate ? new Date(hw.dueDate) : null;
                        const { studentCount, totalCount } = getHomeworkSubmissionStats(hw);
                        return (
                          <tr key={hw.id}>
                            <td>
                              <strong style={{ color: 'var(--color-text)' }}>{hw.title}</strong>
                            </td>
                            <td>
                              <span className="teacher-badge-pill">{hw.subject || 'Genel'}</span>
                            </td>
                            <td>
                              {due ? due.toLocaleDateString('tr-TR') : 'Tarih Yok'}
                            </td>
                            <td>
                              {studentCount > 0 ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  color: '#059669', fontWeight: 800, fontSize: '0.82rem'
                                }}>
                                  <CheckCircle2 size={15} color="#059669" />
                                  {studentCount} Öğrenci ({totalCount} Teslim)
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                  0 teslim (Bekliyor)
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => navigate('/homeworks')}
                                className="btn-secondary-action"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem' }}
                              >
                                Ödevi Yönet
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SEKME 4: SINIF ANALİZİ & GRAFİKLER
              ═══════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <div className="teacher-simple-card">
              <TeacherClassAnalytics
                submissions={teacherSubmissions}
                students={students}
                homeworks={teacherHomeworks}
                curData={data}
                books={books}
                bookTests={bookTests}
                grades={data?.grades || []}
              />
            </div>
          )}

        </div>

        {/* ══════════ MODAL: YENİ ÖĞRENCİ EKLE ══════════ */}
        {showAddStudentModal && (
          <div className="teacher-modal-overlay" onClick={() => setShowAddStudentModal(false)}>
            <div className="teacher-modal-card" onClick={e => e.stopPropagation()}>
              <div className="teacher-modal-header">
                <h3><UserPlus size={18} color="#4f46e5" /> Yeni Öğrenci Kaydı</h3>
                <button onClick={() => setShowAddStudentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="teacher-form-group">
                  <label className="teacher-form-label">Ad Soyad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Ahmet Yılmaz"
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    className="teacher-form-input"
                  />
                </div>

                <div className="teacher-form-group">
                  <label className="teacher-form-label">E-posta (Giriş İçin) *</label>
                  <input
                    type="email"
                    required
                    placeholder="Örn: ahmet@okul.com"
                    value={newStudentEmail}
                    onChange={e => setNewStudentEmail(e.target.value)}
                    className="teacher-form-input"
                  />
                </div>

                <div className="teacher-form-group">
                  <label className="teacher-form-label">Şifre *</label>
                  <input
                    type="text"
                    required
                    value={newStudentPassword}
                    onChange={e => setNewStudentPassword(e.target.value)}
                    className="teacher-form-input"
                  />
                </div>

                <div className="teacher-form-group">
                  <label className="teacher-form-label">Sınıf Düzeyi</label>
                  <select
                    value={newStudentGrade}
                    onChange={e => setNewStudentGrade(e.target.value)}
                    className="teacher-form-input"
                  >
                    {data?.grades?.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddStudentModal(false)}
                    className="btn-secondary-action"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="btn-primary-action"
                  >
                    Öğrenciyi Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════ MODAL: ÖĞRENCİ DÜZENLE ══════════ */}
        {editingStudent && (
          <div className="teacher-modal-overlay" onClick={() => setEditingStudent(null)}>
            <div className="teacher-modal-card" onClick={e => e.stopPropagation()}>
              <div className="teacher-modal-header">
                <h3><Edit2 size={18} color="#4f46e5" /> Öğrenciyi Düzenle</h3>
                <button onClick={() => setEditingStudent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="teacher-form-group">
                  <label className="teacher-form-label">Ad Soyad</label>
                  <input
                    type="text"
                    required
                    value={editStudentName}
                    onChange={e => setEditStudentName(e.target.value)}
                    className="teacher-form-input"
                  />
                </div>

                <div className="teacher-form-group">
                  <label className="teacher-form-label">E-posta</label>
                  <input
                    type="email"
                    required
                    value={editStudentEmail}
                    onChange={e => setEditStudentEmail(e.target.value)}
                    className="teacher-form-input"
                  />
                </div>

                <div className="teacher-form-group">
                  <label className="teacher-form-label">Şifre</label>
                  <input
                    type="text"
                    value={editStudentPassword}
                    onChange={e => setEditStudentPassword(e.target.value)}
                    className="teacher-form-input"
                  />
                </div>

                <div className="teacher-form-group">
                  <label className="teacher-form-label">Sınıf</label>
                  <select
                    value={editStudentGrade}
                    onChange={e => setEditStudentGrade(e.target.value)}
                    className="teacher-form-input"
                  >
                    {data?.grades?.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="btn-secondary-action"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="btn-primary-action"
                  >
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════ MODAL: HIZLI KARNE & VELİ RAPORU ══════════ */}
        {selectedReportStudent && (
          <TeacherStudentQuickReportModal
            student={selectedReportStudent}
            submissions={teacherSubmissions}
            homeworks={teacherHomeworks}
            books={books}
            bookTests={bookTests}
            grades={data?.grades || []}
            teacherName={currentUser?.name || 'Öğretmeniniz'}
            isCoached={coachedIds.includes(selectedReportStudent.id)}
            onToggleCoaching={() => toggleCoachedStudent(currentUser?.id || 'teacher_1', selectedReportStudent.id)}
            onEditStudent={(std) => openEditStudent(std)}
            onClose={() => setSelectedReportStudent(null)}
          />
        )}

        {/* ══════════ MODAL: AI SORU ÜRETİCİ ══════════ */}
        {isAiModalOpen && (
          <AiQuestionGeneratorModal
            isOpen={isAiModalOpen}
            onClose={() => setIsAiModalOpen(false)}
            onSaveQuestions={handleSaveAiQuestions}
            defaultSubject={aiModalConfig.subject || 'Matematik'}
            defaultTopic={aiModalConfig.topic || ''}
            curData={data}
            availableGrades={data?.grades || []}
            availableSubjects={data?.subjects || []}
            availableUnits={data?.units || []}
            availableTopics={data?.topics || []}
          />
        )}

        {/* ══════════ MODAL: TEST OLUŞTUR / DÜZENLE ══════════ */}
        {showTestModal && (
          <div className="teacher-modal-overlay" onClick={() => setShowTestModal(false)}>
            <div className="teacher-modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
              <div className="teacher-modal-header">
                <h3><Plus size={18} color="#4f46e5" /> {editingTestId ? 'Testi Düzenle' : 'Yeni Test Oluştur'}</h3>
                <button onClick={() => setShowTestModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveTest} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="teacher-form-group">
                  <label className="teacher-form-label">Test Başlığı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 8. Sınıf Üslü Sayılar Genel Tarama"
                    value={testName}
                    onChange={e => setTestName(e.target.value)}
                    className="teacher-form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="teacher-form-group">
                    <label className="teacher-form-label">Soru Başı Süre (dk)</label>
                    <input
                      type="number"
                      min="1"
                      value={timePerQ}
                      onChange={e => setTimePerQ(e.target.value)}
                      className="teacher-form-input"
                    />
                  </div>
                  <div className="teacher-form-group">
                    <label className="teacher-form-label">Sınıf</label>
                    <select
                      value={selGrade}
                      onChange={e => {
                        setSelGrade(e.target.value);
                        setSelSubject('');
                        setSelUnit('');
                        setSelTopic('');
                        setSelQIds([]);
                      }}
                      className="teacher-form-input"
                    >
                      <option value="">Sınıf Seçiniz</option>
                      <option value="all">Tüm Sınıflar</option>
                      {data?.grades?.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selGrade && (
                  <div className="teacher-form-group">
                    <label className="teacher-form-label">Ders</label>
                    <select
                      value={selSubject}
                      onChange={e => {
                        setSelSubject(e.target.value);
                        setSelUnit('');
                        setSelTopic('');
                        setSelQIds([]);
                      }}
                      className="teacher-form-input"
                    >
                      <option value="">Ders Seçiniz</option>
                      <option value="all">Tüm Dersler</option>
                      {filtSubs.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selSubject && selSubject !== 'all' && (
                  <div className="teacher-form-group">
                    <label className="teacher-form-label">Ünite</label>
                    <select
                      value={selUnit}
                      onChange={e => {
                        setSelUnit(e.target.value);
                        setSelTopic('');
                        setSelQIds([]);
                      }}
                      className="teacher-form-input"
                    >
                      <option value="">Ünite Seçiniz</option>
                      <option value="all">Tüm Üniteler</option>
                      {filtUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selUnit && selUnit !== 'all' && (
                  <div className="teacher-form-group">
                    <label className="teacher-form-label">Konu</label>
                    <select
                      value={selTopic}
                      onChange={e => {
                        setSelTopic(e.target.value);
                        setSelQIds([]);
                      }}
                      className="teacher-form-input"
                    >
                      <option value="">Konu Seçiniz</option>
                      <option value="all">Tüm Konular</option>
                      {filtTopics.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {catId && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase' }}>
                        Havuzdaki Sorular ({poolQs.length} soru)
                      </span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6366f1' }}>
                        {selQIds.length} soru seçildi
                      </span>
                    </div>

                    {poolQs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--color-surface-hover)', borderRadius: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Bu kazanımda henüz soru bulunmuyor.
                      </div>
                    ) : (
                      <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
                        {poolQs.map((q, idx) => {
                          const isChecked = selQIds.includes(q.id);
                          return (
                            <label
                              key={q.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '0.45rem 0.65rem', borderRadius: '0.5rem',
                                background: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'var(--color-surface-hover)',
                                border: `1px solid ${isChecked ? 'rgba(99, 102, 241, 0.3)' : 'var(--color-border)'}`,
                                cursor: 'pointer', fontSize: '0.78rem'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleQ(q.id)}
                              />
                              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Soru #{idx + 1}: {q.questionText || q.title || 'Çoktan Seçmeli Soru'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowTestModal(false)}
                    className="btn-secondary-action"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={selQIds.length === 0}
                    className="btn-primary-action"
                    style={{ opacity: selQIds.length === 0 ? 0.6 : 1 }}
                  >
                    {editingTestId ? 'Güncelle' : 'Testi Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </SmartPullToRefresh>
  );
}
