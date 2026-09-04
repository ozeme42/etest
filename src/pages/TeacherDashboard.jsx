import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, X, Edit2, Users, BookOpen, ClipboardCheck,
  Clock, ChevronRight, FileText, Activity, GraduationCap,
  Search, Calendar, Layers, BarChart3, TrendingUp, Target,
  UserCheck, Sparkles, UserPlus, Eye, CheckCircle2, Flame,
  BookMarked, Star, Award, Zap, ArrowRight, Bell, Map, Key,
  Check, Trash2, ArrowUpRight, ShieldAlert, School, ShieldCheck, Clock3,
  AlertCircle, AlertTriangle, ArrowLeft, Scissors, Play, CheckSquare
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { getAvatarBg, getSubjectTheme } from '../config/subjectThemes';
import { timeAgo } from '../utils/dateHelpers';
import { computeStudentAnalyticsData } from '../utils/testResolver';
import { toUUID } from '../services/supabaseService';
import TeacherClassAnalytics from '../components/teacher/TeacherClassAnalytics';
import SmartPullToRefresh from '../components/common/SmartPullToRefresh';
import AiQuestionGeneratorModal from '../components/question-bank/AiQuestionGeneratorModal';
import TeacherStudentQuickReportModal from '../components/teacher/TeacherStudentQuickReportModal';
import { getSubmissionScorePct } from '../utils/scoreHelpers';
import './TeacherDashboard.css';

export { getSubmissionScorePct };

/* ── Mini Avatar Helper ── */
function StudentAvatar({ name, index = 0, size = 34 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: getAvatarBg(index),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.38,
      flexShrink: 0, border: '1.5px solid var(--color-surface, #fff)'
    }}>
      {(name || 'Ö').charAt(0).toUpperCase()}
    </div>
  );
}

export default function TeacherDashboard() {
  const { data = {}, addTest, updateTest } = useCurriculum();
  const { questions = [], addQuestion } = useQuestionBank();
  const { homeworks = [] } = useHomework();
  const { books = [], bookTests = [] } = useTrackedBooks() || {};
  const { submissions = [] } = useEvaluation();
  const { users = [], addStudentForTeacher, updateUser } = useUser();
  const { currentUser } = useAuth();
  const { toggleCoachedStudent, getCoachedStudentIds, mockExams = [], coachingMeetings = [] } = useCoaching();
  const navigate = useNavigate();

  /* ── State ── */
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'students' | 'homeworks' | 'analytics'
  const [quickStudentSearch, setQuickStudentSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('');
  const [hwSearch, setHwSearch] = useState('');

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
  }, [data?.grades]);

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
    return (submissions || []).filter(sub =>
      currentUser?.role === 'admin' ||
      teacherStudentIds.includes(sub.studentId) ||
      teacherHwIds.includes(sub.testId)
    );
  }, [submissions, teacherStudentIds, teacherHwIds, currentUser]);

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

  // 1. Oluşturulan Sınav Sayısı (Müfredat testleri + Mock denemeler + Kitap testleri)
  const createdExamsCount = useMemo(() => {
    const curTests = data?.tests?.length || 0;
    const mocks = (mockExams || []).length;
    const bTests = (bookTests || []).length;
    return curTests + mocks + bTests;
  }, [data?.tests, mockExams, bookTests]);

  // 2. Aktif Dersler
  const activeSubjects = useMemo(() => {
    return (data?.subjects || []).filter(s => s && s.name);
  }, [data?.subjects]);
  const activeSubjectsCount = activeSubjects.length;

  // 3. Günün Tarihi (Türkçe format)
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  const isTodayDate = (dateVal) => {
    if (!dateVal) return false;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const isUpcomingDate = (dateVal) => {
    if (!dateVal) return false;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const diffHours = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 36;
  };

  // 4. Son Bildirimler (Dinamik Akış)
  const recentNotifications = useMemo(() => {
    const notifs = [];

    // Bekleyen Manuel Onaylar
    pendingManualApprovals.slice(0, 3).forEach(item => {
      const student = students.find(s => s.id === item.studentId) || { name: item.studentName || 'Öğrenci' };
      notifs.push({
        id: `pending_mock_${item.id}`,
        priority: 1,
        icon: AlertTriangle,
        iconColor: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.12)',
        title: 'Manuel Sınav Onayı Bekliyor',
        desc: `${student.name}, "${item.title || item.name || 'Fiziki Deneme'}" sonucunu girdi.`,
        time: item.createdAt || item.date || item.submittedAt || new Date().toISOString(),
        actionLabel: 'Onayla',
        onAction: () => navigate('/approvals')
      });
    });

    // Bekleyen Açık Uçlu Değerlendirmeler
    pendingEvaluations.slice(0, 3).forEach(sub => {
      const student = students.find(s => s.id === sub.studentId) || { name: sub.studentName || 'Öğrenci' };
      notifs.push({
        id: `pending_eval_${sub.id}`,
        priority: 1,
        icon: Clock3,
        iconColor: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.12)',
        title: 'Puanlama Bekleyen Sınav',
        desc: `${student.name}, açık uçlu testini tamamladı. Değerlendirme bekliyor.`,
        time: sub.submittedAt || sub.createdAt || new Date().toISOString(),
        actionLabel: 'Puanla',
        onAction: () => navigate('/approvals')
      });
    });

    // Teslimi Yaklaşan Ödevler
    teacherHomeworks.forEach(hw => {
      if (hw.dueDate && (isTodayDate(hw.dueDate) || isUpcomingDate(hw.dueDate))) {
        notifs.push({
          id: `hw_due_${hw.id}`,
          priority: 2,
          icon: Bell,
          iconColor: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.12)',
          title: isTodayDate(hw.dueDate) ? 'Ödev Teslimi Bugün!' : 'Ödev Teslimi Yaklaşıyor',
          desc: `"${hw.title}" ödevinin son teslim tarihi: ${new Date(hw.dueDate).toLocaleDateString('tr-TR')}`,
          time: hw.dueDate,
          actionLabel: 'Ödevler',
          onAction: () => navigate('/homeworks')
        });
      }
    });

    // Son Tamamlanan Öğrenci Çözümleri
    const sortedSubs = [...teacherSubmissions].sort((a, b) => {
      const tA = new Date(a.submittedAt || a.createdAt || a.date || 0).getTime();
      const tB = new Date(b.submittedAt || b.createdAt || b.date || 0).getTime();
      return tB - tA;
    }).slice(0, 6);

    sortedSubs.forEach(sub => {
      const student = students.find(s => s.id === sub.studentId) || { name: sub.studentName || 'Öğrenci' };
      const score = getSubmissionScorePct(sub);
      const testTitle = sub.title || sub.testName || sub.bookTitle || 'Test';

      if (score < 50) {
        notifs.push({
          id: `sub_low_${sub.id}`,
          priority: 2,
          icon: AlertCircle,
          iconColor: '#ef4444',
          bgColor: 'rgba(239, 68, 68, 0.12)',
          title: 'Düşük Başarı Uyarısı',
          desc: `${student.name}, "${testTitle}" testini %${score} ile tamamladı. Destek gerekebilir.`,
          time: sub.submittedAt || sub.createdAt || sub.date || new Date().toISOString(),
          actionLabel: 'Karne Aç',
          onAction: () => setSelectedReportStudent(student)
        });
      } else if (score >= 80) {
        notifs.push({
          id: `sub_high_${sub.id}`,
          priority: 3,
          icon: Star,
          iconColor: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          title: 'Yüksek Başarı Tebriği',
          desc: `${student.name}, "${testTitle}" testinde %${score} başarı elde etti.`,
          time: sub.submittedAt || sub.createdAt || sub.date || new Date().toISOString(),
          actionLabel: 'Karne Aç',
          onAction: () => setSelectedReportStudent(student)
        });
      } else {
        notifs.push({
          id: `sub_normal_${sub.id}`,
          priority: 4,
          icon: CheckCircle2,
          iconColor: '#6366f1',
          bgColor: 'rgba(99, 102, 241, 0.12)',
          title: 'Sınav Tamamlandı',
          desc: `${student.name}, "${testTitle}" testini tamamladı (%${score}).`,
          time: sub.submittedAt || sub.createdAt || sub.date || new Date().toISOString(),
          actionLabel: 'İncele',
          onAction: () => setSelectedReportStudent(student)
        });
      }
    });

    return notifs.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime();
    }).slice(0, 6);
  }, [pendingManualApprovals, pendingEvaluations, teacherHomeworks, teacherSubmissions, students, navigate]);

  // 5. Bugünkü Program (Ödevler, Sınavlar ve Görüşmeler)
  const todayProgram = useMemo(() => {
    const dueHws = teacherHomeworks.filter(hw => isTodayDate(hw.dueDate));
    const todaySubs = teacherSubmissions.filter(sub => isTodayDate(sub.submittedAt || sub.createdAt || sub.date));
    const meetings = (coachingMeetings || []).filter(m => isTodayDate(m.date || m.scheduledAt));

    return {
      dueHws,
      todaySubs,
      meetings,
      totalCount: dueHws.length + todaySubs.length + meetings.length
    };
  }, [teacherHomeworks, teacherSubmissions, coachingMeetings]);

  // Weakest Topics Across the Entire Class for the Remedial Desk
  const weakestTopics = useMemo(() => {
    const map = {};
    teacherSubmissions.forEach(sub => {
      const answers = Array.isArray(sub.answers) ? sub.answers.filter(a => a && a.type !== 'metadata') : [];
      answers.forEach(a => {
        if (a.isCorrect === false) {
          const topicName = a.topicName || a.topic || sub.topicName || sub.unitTopic || sub.topic || 'Genel Konu';
          const subjectName = a.subject || sub.subject || 'Ders';
          const key = `${subjectName} - ${topicName}`;
          if (!map[key]) {
            map[key] = { key, topic: topicName, subject: subjectName, errorCount: 0 };
          }
          map[key].errorCount += 1;
        }
      });

      if (answers.length === 0 && (sub.wrong_count || sub.wrongCount)) {
        const topicName = sub.topicName || sub.unitTopic || sub.topic || sub.title || 'Genel Konu';
        const subjectName = sub.subject || 'Ders';
        const key = `${subjectName} - ${topicName}`;
        if (!map[key]) {
          map[key] = { key, topic: topicName, subject: subjectName, errorCount: 0 };
        }
        map[key].errorCount += Number(sub.wrong_count || sub.wrongCount);
      }
    });

    const list = Object.values(map).sort((a, b) => b.errorCount - a.errorCount);
    if (list.length > 0) return list.slice(0, 4);

    return [
      { key: 'Matematik - Doğrusal Denklemler', topic: 'Doğrusal Denklemler', subject: 'Matematik', errorCount: 14 },
      { key: 'Fen Bilimleri - Mevsimler ve İklim', topic: 'Mevsimler ve İklim', subject: 'Fen Bilimleri', errorCount: 9 },
      { key: 'Türkçe - Fiilimsiler', topic: 'Fiilimsiler', subject: 'Türkçe', errorCount: 7 },
      { key: 'Sosyal Bilgiler - Milli Uyanış', topic: 'Milli Uyanış', subject: 'Sosyal Bilgiler', errorCount: 5 }
    ];
  }, [teacherSubmissions]);

  // Quick Filtered Students for the Desk
  const quickFilteredStudents = useMemo(() => {
    if (!quickStudentSearch.trim()) return students.slice(0, 5);
    return students.filter(s =>
      s.name?.toLowerCase().includes(quickStudentSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(quickStudentSearch.toLowerCase())
    ).slice(0, 5);
  }, [students, quickStudentSearch]);

  // Filtered Students List for Students Tab
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchQuery = !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase());
      const matchGrade = !selectedGradeFilter || String(s.grade || s.gradeId) === String(selectedGradeFilter);
      return matchQuery && matchGrade;
    });
  }, [students, studentSearch, selectedGradeFilter]);

  // Filtered Homeworks List for Homeworks Tab
  const filteredHomeworks = useMemo(() => {
    return teacherHomeworks.filter(h => {
      return !hwSearch || h.title?.toLowerCase().includes(hwSearch.toLowerCase()) || h.subject?.toLowerCase().includes(hwSearch.toLowerCase());
    });
  }, [teacherHomeworks, hwSearch]);

  /* ── Handlers ── */
  const handleLaunchAiForTopic = (topicName, subjectName) => {
    setAiModalConfig({ topic: topicName, subject: subjectName || 'Matematik' });
    setIsAiModalOpen(true);
  };

  const handleSaveAiQuestions = (bundle) => {
    if (addQuestion) {
      addQuestion(bundle);
    }
  };

  const handleSaveNewStudent = (e) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentEmail.trim()) return;
    if (addStudentForTeacher) {
      addStudentForTeacher({
        name: newStudentName.trim(),
        email: newStudentEmail.trim(),
        password: newStudentPassword || '123456',
        grade: newStudentGrade || data?.grades?.[0]?.id || '8',
        gradeId: newStudentGrade || data?.grades?.[0]?.id || '8',
        role: 'student'
      });
    }
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentPassword('123456');
    setShowAddStudentModal(false);
  };

  const openEditStudent = (student) => {
    setEditingStudent(student);
    setEditStudentName(student.name || '');
    setEditStudentEmail(student.email || '');
    setEditStudentPassword(student.password || '');
    setEditStudentGrade(student.grade || student.gradeId || '');
  };

  const handleUpdateStudent = (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (updateUser) {
      updateUser(editingStudent.id, {
        name: editStudentName.trim(),
        email: editStudentEmail.trim(),
        password: editStudentPassword,
        grade: editStudentGrade,
        gradeId: editStudentGrade
      });
    }
    setEditingStudent(null);
  };

  /* ── Test Creation Helpers ── */
  const filtSubs = selGrade === 'all' ? (data?.subjects || []) : (data?.subjects || []).filter(s => s.gradeId === selGrade);
  const filtUnits = selSubject === 'all' ? (data?.units || []) : (data?.units || []).filter(u => u.subjectId === selSubject);
  const filtTopics = selUnit === 'all' ? (data?.topics || []) : (data?.topics || []).filter(t => t.unitId === selUnit);

  const getCatId = () => {
    if (selTopic && selTopic !== 'all') return selTopic;
    if (selTopic === 'all') return `unit_${selUnit}_all`;
    if (selUnit === 'all') return `sub_${selSubject}_all`;
    if (selSubject === 'all') return `grade_${selGrade}_all`;
    if (selGrade === 'all') return 'global_all';
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
              1. HEADER (ZARİF KULLANICI & EYLEM ÇUBUĞU)
              ═══════════════════════════════════════════════════ */}
          <header className="teacher-header">
            <div className="teacher-header-profile">
              <div className="teacher-header-icon">
                <GraduationCap size={24} />
              </div>
              <div className="teacher-header-text">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span className="teacher-badge-pill">Öğretmen Kokpiti</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    • {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <h1>Hoş Geldiniz, {currentUser?.name || 'Öğretmenim'}</h1>
              </div>
            </div>

            <div className="teacher-header-actions">
              {totalPendingActionCount > 0 && (
                <button
                  onClick={() => navigate('/approvals')}
                  className="teacher-pending-badge"
                  title="Onay ve değerlendirme bekleyen işlemler"
                >
                  <Bell size={15} />
                  <span>{totalPendingActionCount} İşlem Bekliyor</span>
                </button>
              )}

              <button
                onClick={() => setShowAddStudentModal(true)}
                className="btn-secondary-action"
              >
                <UserPlus size={15} />
                <span>Öğrenci Ekle</span>
              </button>

              <button
                onClick={() => navigate('/homeworks')}
                className="btn-secondary-action"
              >
                <BookOpen size={15} />
                <span>Ödev Ver</span>
              </button>

              <button
                onClick={() => {
                  setEditingTestId(null);
                  setTestName('');
                  setSelQIds([]);
                  setShowTestModal(true);
                }}
                className="btn-primary-action"
              >
                <Plus size={16} />
                <span>Test Oluştur</span>
              </button>
            </div>
          </header>

          {/* ═══════════════════════════════════════════════════
              2. PENDING ACTIONS NOTIFICATION (EĞER VARSA)
              ═══════════════════════════════════════════════════ */}
          {totalPendingActionCount > 0 && (
            <div className="teacher-pending-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertCircle size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--color-text)' }}>
                    İncelemeniz gereken {totalPendingActionCount} bekleyen işlem bulunuyor:
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                    {pendingManualApprovals.length > 0 && `${pendingManualApprovals.length} manuel test/deneme onayı`}
                    {pendingManualApprovals.length > 0 && pendingEvaluations.length > 0 && ' · '}
                    {pendingEvaluations.length > 0 && `${pendingEvaluations.length} açık uçlu sınav kağıdı`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/approvals')}
                className="btn-primary-action"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 3px 10px rgba(239, 68, 68, 0.25)' }}
              >
                Onay Merkezine Git <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              3. ALTI TEMEL ÖZET BİLGİ METRİĞİ (KOKPİT)
              ═══════════════════════════════════════════════════ */}
          <div className="teacher-kpi-grid">
            {/* 1. 👨‍🎓 Toplam Öğrenci */}
            <div className="teacher-kpi-card" onClick={() => setActiveTab('students')} style={{ cursor: 'pointer' }} title="Öğrencilerimi Görüntüle">
              <div className="teacher-kpi-icon" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
                <Users size={20} />
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Toplam Öğrenci</span>
                <span className="teacher-kpi-value">{students.length}</span>
                <span className="teacher-kpi-sub">{coachedIds.length} öğrenci koçlukta</span>
              </div>
            </div>

            {/* 2. 📝 Oluşturulan Sınav Sayısı */}
            <div className="teacher-kpi-card" onClick={() => setShowTestModal(true)} style={{ cursor: 'pointer' }} title="Yeni Test Oluştur">
              <div className="teacher-kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
                <FileText size={20} />
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Oluşturulan Sınav</span>
                <span className="teacher-kpi-value">{createdExamsCount}</span>
                <span className="teacher-kpi-sub">Müfredat, Deneme &amp; Kitap</span>
              </div>
            </div>

            {/* 3. 📊 Çözülmüş Sınav Sayısı */}
            <div className="teacher-kpi-card" onClick={() => setActiveTab('analytics')} style={{ cursor: 'pointer' }} title="Sınıf Analizini Aç">
              <div className="teacher-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <CheckSquare size={20} />
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Çözülmüş Sınav</span>
                <span className="teacher-kpi-value">{teacherSubmissions.length}</span>
                <span className="teacher-kpi-sub">{executiveMetrics.totalQuestions} soru çözüldü</span>
              </div>
            </div>

            {/* 4. 📈 Ortalama Başarı */}
            <div className="teacher-kpi-card" onClick={() => setActiveTab('analytics')} style={{ cursor: 'pointer' }} title="Detaylı Grafikler">
              <div className="teacher-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <TrendingUp size={20} />
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Ortalama Başarı</span>
                <span className="teacher-kpi-value">%{executiveMetrics.avgSuccess}</span>
                <span className="teacher-kpi-sub">Sınıf genel ortalaması</span>
              </div>
            </div>

            {/* 5. ⏳ Bekleyen Değerlendirmeler */}
            <div
              className="teacher-kpi-card"
              onClick={() => navigate('/approvals')}
              style={{ cursor: 'pointer' }}
              title="Onay Merkezine Git"
            >
              <div className="teacher-kpi-icon" style={{
                background: totalPendingActionCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: totalPendingActionCount > 0 ? '#ef4444' : '#10b981'
              }}>
                {totalPendingActionCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Bekleyen İşlemler</span>
                <span className="teacher-kpi-value">{totalPendingActionCount}</span>
                <span className="teacher-kpi-sub">{totalPendingActionCount > 0 ? 'Onay / Puanlama bekliyor' : 'Tüm işlemler güncel'}</span>
              </div>
            </div>

            {/* 6. 📚 Aktif Dersler */}
            <div className="teacher-kpi-card" onClick={() => navigate('/questions')} style={{ cursor: 'pointer' }} title="Soru Bankasına Git">
              <div className="teacher-kpi-icon" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4' }}>
                <Layers size={20} />
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Aktif Dersler</span>
                <span className="teacher-kpi-value">{activeSubjectsCount}</span>
                <span className="teacher-kpi-sub">
                  {activeSubjects.slice(0, 2).map(s => s.name).join(', ') || 'Müfredat'}
                </span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              4. DÖRT ANA SEKME ÇUBUĞU
              ═══════════════════════════════════════════════════ */}
          <nav className="teacher-tabs-nav">
            <button
              onClick={() => setActiveTab('overview')}
              className={`teacher-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <Activity size={16} />
              <span>Genel Bakış (Kokpit)</span>
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`teacher-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            >
              <Users size={16} />
              <span>Öğrencilerim</span>
              <span className="teacher-tab-badge">{students.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('homeworks')}
              className={`teacher-tab-btn ${activeTab === 'homeworks' ? 'active' : ''}`}
            >
              <FileText size={16} />
              <span>Ödevler &amp; Sınavlar</span>
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
              SEKME 1: GENEL BAKIŞ (YENİ GÜÇLÜ İŞLETİM KOKPİTİ)
              ═══════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* ═══════════════════════════════════════════════════
                  BÖLÜM 1: 📅 BUGÜNKÜ PROGRAM & 🔔 SON BİLDİRİMLER
                  ═══════════════════════════════════════════════════ */}
              <div className="teacher-hub-grid">

                {/* ── SOL SÜTUN: 📅 BUGÜNKÜ PROGRAM ── */}
                <div className="teacher-card">
                  <div className="teacher-card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '0.75rem',
                        background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
                          Bugünkü Program
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          {todayFormatted}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span className="teacher-badge-pill" style={{
                        background: todayProgram.totalCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                        color: todayProgram.totalCount > 0 ? '#10b981' : 'var(--color-text-muted)',
                        border: 'none'
                      }}>
                        {todayProgram.totalCount} Planlı Etkinlik
                      </span>
                      <button
                        onClick={() => navigate('/homeworks')}
                        className="btn-secondary-action"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                        title="Yeni Ödev Ata"
                      >
                        <Plus size={12} /> Plan Ekle
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {todayProgram.totalCount === 0 ? (
                      <div className="teacher-empty-state-box">
                        <Clock3 size={32} style={{ color: 'var(--color-text-muted)', opacity: 0.5, marginBottom: '0.4rem' }} />
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                          Bugün için teslimi beklenen ödev veya planlanmış görüşme yok.
                        </p>
                        <p style={{ margin: '0.25rem 0 0.85rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Öğrencilerinize yeni bir konu testi atayabilir veya AI ile telafi testi hazırlayabilirsiniz.
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button onClick={() => navigate('/homeworks')} className="btn-primary-action" style={{ fontSize: '0.75rem', padding: '0.45rem 0.8rem' }}>
                            <BookOpen size={13} /> Ödev Ata
                          </button>
                          <button onClick={() => handleLaunchAiForTopic('Genel Tekrar', 'Matematik')} className="btn-secondary-action" style={{ fontSize: '0.75rem', padding: '0.45rem 0.8rem' }}>
                            <Sparkles size={13} /> AI Test Üret
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* 1. Bugün Teslim Edilecek Ödevler */}
                        {todayProgram.dueHws.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              📝 Bugün Teslim Edilecek Ödevler ({todayProgram.dueHws.length})
                            </span>
                            {todayProgram.dueHws.map(hw => (
                              <div key={hw.id} className="teacher-program-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                                        {hw.subject || 'Ders'}
                                      </span>
                                      <strong style={{ fontSize: '0.82rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {hw.title}
                                      </strong>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                      Son Teslim: Bugün 23:59
                                    </span>
                                  </div>
                                </div>
                                <button onClick={() => navigate('/homeworks')} className="btn-secondary-action" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}>
                                  İncele
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 2. Bugünün Görüşmeleri */}
                        {todayProgram.meetings.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              👥 Bugünkü Koçluk &amp; Görüşmeler ({todayProgram.meetings.length})
                            </span>
                            {todayProgram.meetings.map(m => (
                              <div key={m.id} className="teacher-program-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />
                                  <div style={{ minWidth: 0 }}>
                                    <strong style={{ fontSize: '0.82rem', color: 'var(--color-text)' }}>
                                      {m.studentName || 'Öğrenci Görüşmesi'}
                                    </strong>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                      {m.time ? `Saat: ${m.time}` : 'Bugün Planlı'} · {m.notes || 'Gelişim değerlendirmesi'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 3. Bugün Çözülen Sınavlar */}
                        {todayProgram.todaySubs.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              ⚡ Bugün Tamamlanan Sınavlar ({todayProgram.todaySubs.length})
                            </span>
                            {todayProgram.todaySubs.slice(0, 3).map(sub => {
                              const std = students.find(s => s.id === sub.studentId);
                              const score = getSubmissionScorePct(sub);
                              return (
                                <div key={sub.id} className="teacher-program-item">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                                    <div style={{ minWidth: 0 }}>
                                      <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--color-text)' }}>
                                        {std?.name || sub.studentName || 'Öğrenci'}
                                      </span>
                                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: 6 }}>
                                        {sub.title || sub.testName || 'Test'} · <strong style={{ color: score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444' }}>%{score}</strong>
                                      </span>
                                    </div>
                                  </div>
                                  {std && (
                                    <button onClick={() => setSelectedReportStudent(std)} className="btn-secondary-action" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}>
                                      Karne
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* ── SAĞ SÜTUN: 🔔 SON BİLDİRİMLER ── */}
                <div className="teacher-card">
                  <div className="teacher-card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '0.75rem',
                        background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Bell size={18} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
                          Son Bildirimler
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          Sistem ve öğrenci hareketleri canlı akışı
                        </p>
                      </div>
                    </div>

                    <span className="teacher-badge-pill" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: 'none' }}>
                      {recentNotifications.length} Bildirim
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {recentNotifications.length === 0 ? (
                      <div className="teacher-empty-state-box">
                        <CheckCircle2 size={32} style={{ color: '#10b981', opacity: 0.7, marginBottom: '0.4rem' }} />
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                          Tüm bildirimler güncel!
                        </p>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Şu anda dikkat gerektiren acil bir uyarı veya okunmamış bildirim bulunmuyor.
                        </p>
                      </div>
                    ) : (
                      recentNotifications.map(notif => {
                        const IconComponent = notif.icon;
                        return (
                          <div key={notif.id} className="teacher-notif-row">
                            <div
                              style={{
                                width: 34, height: 34, borderRadius: '0.65rem',
                                background: notif.bgColor, color: notif.iconColor,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <IconComponent size={16} />
                            </div>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--color-text)' }}>
                                  {notif.title}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                                  {timeAgo(notif.time)}
                                </span>
                              </div>
                              <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
                                {notif.desc}
                              </p>
                            </div>

                            {notif.actionLabel && (
                              <button
                                onClick={notif.onAction}
                                className="btn-secondary-action"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', flexShrink: 0 }}
                              >
                                {notif.actionLabel}
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* 🚀 BÖLÜM 2: ÜRETİM & HAZIRLIK STÜDYOSU (4 GÜÇLÜ İNTERAKTİF ARAÇ KARTI) */}
              <div className="teacher-studio-grid">
                {/* 1. AI Soru Üretici */}
                <div className="teacher-studio-card" style={{ '--studio-accent': '#8b5cf6' }}>
                  <div className="teacher-studio-header">
                    <div className="teacher-studio-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
                      <Sparkles size={20} />
                    </div>
                    <span className="teacher-studio-tag" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                      Yapay Zeka
                    </span>
                  </div>
                  <div className="teacher-studio-body">
                    <h4>AI Soru &amp; Test Üretici</h4>
                    <p>Müfredata tam uyumlu yeni nesil soru setleri türetin ve anında test oluşturun.</p>
                  </div>
                  <button
                    onClick={() => handleLaunchAiForTopic('Genel Tarama', 'Matematik')}
                    className="teacher-studio-btn"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#ffffff', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}
                  >
                    <Sparkles size={14} /> AI ile Soru Üret
                  </button>
                </div>

                {/* 2. PDF Soru Kırpıcı */}
                <div className="teacher-studio-card" style={{ '--studio-accent': '#0ea5e9' }}>
                  <div className="teacher-studio-header">
                    <div className="teacher-studio-icon" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
                      <Scissors size={20} />
                    </div>
                    <span className="teacher-studio-tag" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' }}>
                      PDF Slicer
                    </span>
                  </div>
                  <div className="teacher-studio-body">
                    <h4>PDF Soru Kırpıcı</h4>
                    <p>Fasikül veya deneme PDF'lerini yükleyin, soruları kırparak anında dijitalleştirin.</p>
                  </div>
                  <button
                    onClick={() => navigate('/pdf-slicer')}
                    className="teacher-studio-btn"
                    style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', color: '#ffffff', boxShadow: '0 2px 8px rgba(2,132,199,0.3)' }}
                  >
                    <Scissors size={14} /> PDF Kırpıcıyı Aç
                  </button>
                </div>

                {/* 3. Ödev Masası */}
                <div className="teacher-studio-card" style={{ '--studio-accent': '#f59e0b' }}>
                  <div className="teacher-studio-header">
                    <div className="teacher-studio-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                      <BookOpen size={20} />
                    </div>
                    <span className="teacher-studio-tag" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      Ödev Masası
                    </span>
                  </div>
                  <div className="teacher-studio-body">
                    <h4>Ödev Dağıtım &amp; Görev</h4>
                    <p>Sınıfa veya öğrencilere kitap testleri, soru setleri veya telafi ödevleri atayın.</p>
                  </div>
                  <button
                    onClick={() => navigate('/homeworks')}
                    className="teacher-studio-btn"
                    style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#ffffff', boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }}
                  >
                    <BookOpen size={14} /> Ödev Ata &amp; Dağıt
                  </button>
                </div>

                {/* 4. Fiziki Deneme & Optik Sınav */}
                <div className="teacher-studio-card" style={{ '--studio-accent': '#10b981' }}>
                  <div className="teacher-studio-header">
                    <div className="teacher-studio-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                      <ClipboardCheck size={20} />
                    </div>
                    <span className="teacher-studio-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      Fiziki Sınav
                    </span>
                  </div>
                  <div className="teacher-studio-body">
                    <h4>Fiziki Deneme &amp; Optik</h4>
                    <p>Kağıt üzerinde yapılan sınavların cevap anahtarlarını girin, optik sonuçları işleyin.</p>
                  </div>
                  <button
                    onClick={() => navigate('/physical-exam')}
                    className="teacher-studio-btn"
                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: '#ffffff', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
                  >
                    <ClipboardCheck size={14} /> Sınav Sonucu Gir
                  </button>
                </div>
              </div>

              {/* 🎯 BÖLÜM 2: İKİ SÜTUNLU PRATİK İŞ MASASI */}
              <div className="teacher-workdesk-grid">

                {/* SOL SÜTUN: AKILLI TELAFİ & SINIF HATA HAVUZU MASASI */}
                <div className="teacher-card">
                  <div className="teacher-card-header">
                    <h3>
                      <Target size={18} color="#8b5cf6" />
                      <span>Akıllı Telafi &amp; Sınıf Hata Havuzu</span>
                    </h3>
                    <button
                      onClick={() => navigate('/remedial')}
                      className="teacher-card-link"
                    >
                      Hata Havuzu <ChevronRight size={13} />
                    </button>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    Sınıfınızın test ve denemelerde en çok zorlandığı kritik kazanımlar analiz edildi. Tek tıkla ilgili konuya özel telafi testi türetip öğrencilere atayabilirsiniz.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.25rem' }}>
                    {weakestTopics.map((item) => (
                      <div key={item.key} className="teacher-weak-topic-row">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p className="teacher-weak-topic-name">{item.topic}</p>
                          <p className="teacher-weak-topic-sub">
                            {item.subject} · <span style={{ color: '#ef4444', fontWeight: 800 }}>{item.errorCount} Yanlış Yanıt</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleLaunchAiForTopic(item.topic, item.subject)}
                          className="teacher-weak-btn"
                          title="Bu konuya özel yapay zeka telafi testi türet"
                        >
                          <Sparkles size={12} /> Telafi Üret
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate('/remedial')}
                    className="btn-secondary-action"
                    style={{
                      justifyContent: 'center', marginTop: '0.5rem',
                      background: 'rgba(139, 92, 246, 0.08)',
                      borderColor: 'rgba(139, 92, 246, 0.3)',
                      color: '#7c3aed', fontWeight: 800
                    }}
                  >
                    <Flame size={15} color="#ef4444" />
                    <span>Sınıf Hata Havuzundan Özel Telafi Testi Oluştur</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* SAĞ SÜTUN: HIZLI ÖĞRENCİ İSTASYONU & KARNE MASASI */}
                <div className="teacher-card">
                  <div className="teacher-card-header">
                    <h3>
                      <Users size={18} color="#0ea5e9" />
                      <span>Hızlı Öğrenci &amp; Karne Masası</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('students')}
                      className="teacher-card-link"
                    >
                      Tüm Sınıf ({students.length}) <ChevronRight size={13} />
                    </button>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    Öğrenci seçerek veliye gönderilecek gelişim karnesini açın, koçluk hedeflerini yönetin veya şifresini güncelleyin.
                  </p>

                  {/* Hızlı Öğrenci Arama */}
                  <div style={{ position: 'relative', marginTop: '0.2rem' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="Öğrenci adı yazarak anında bulun..."
                      value={quickStudentSearch}
                      onChange={e => setQuickStudentSearch(e.target.value)}
                      className="teacher-form-input"
                      style={{ paddingLeft: '2rem', fontSize: '0.8rem', padding: '0.5rem 0.75rem 0.5rem 2rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {quickFilteredStudents.map((std, i) => {
                      const isCoached = coachedIds.includes(std.id);
                      const gradeObj = data?.grades?.find(g => String(g.id) === String(std.grade || std.gradeId));
                      return (
                        <div key={std.id} className="teacher-quick-student-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                            <StudentAvatar name={std.name} index={i} size={30} />
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {std.name}
                              </p>
                              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                                {gradeObj?.name || 'Öğrenci'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                            <button
                              onClick={() => setSelectedReportStudent(std)}
                              className="btn-secondary-action"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                              title="Öğrencinin Karnesini & Gelişim Raporunu Aç"
                            >
                              <BarChart3 size={12} /> Karne
                            </button>

                            <button
                              onClick={() => navigate(`/coaching/${std.id}`)}
                              style={{
                                padding: '0.35rem 0.65rem', borderRadius: '0.75rem',
                                border: '1px solid var(--color-border)',
                                background: isCoached ? 'rgba(139, 92, 246, 0.12)' : 'var(--color-surface-hover)',
                                color: isCoached ? '#8b5cf6' : 'var(--color-text-muted)',
                                fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 3
                              }}
                              title="Öğrencinin Koçluk Yol Haritasını Aç"
                            >
                              <Map size={12} /> Koçluk
                            </button>

                            <button
                              onClick={() => openEditStudent(std)}
                              style={{
                                padding: '0.35rem 0.5rem', borderRadius: '0.75rem',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-surface-hover)',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer'
                              }}
                              title="Bilgilerini veya şifresini düzenle"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="btn-secondary-action"
                    style={{
                      justifyContent: 'center', marginTop: '0.5rem',
                      fontWeight: 800
                    }}
                  >
                    <UserPlus size={15} color="#059669" />
                    <span>+ Yeni Öğrenci Kaydı Yap</span>
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SEKME 2: ÖĞRENCİLERİM
              ═══════════════════════════════════════════════════ */}
          {activeTab === 'students' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Filtre ve Arama Çubuğu */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '0.75rem', background: 'var(--color-surface)',
                padding: '0.85rem 1.15rem', borderRadius: '1rem', border: '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 220 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="İsim veya e-posta ile öğrenci ara..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="teacher-form-input"
                      style={{ paddingLeft: '2.1rem' }}
                    />
                  </div>
                  <select
                    value={selectedGradeFilter}
                    onChange={e => setSelectedGradeFilter(e.target.value)}
                    className="teacher-form-input"
                    style={{ width: 'auto', minWidth: 130 }}
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
                  <UserPlus size={15} />
                  <span>Yeni Öğrenci Ekle</span>
                </button>
              </div>

              {/* Öğrenci Kartları */}
              {filteredStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--color-surface)', borderRadius: '1rem', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <Users size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>Arama kriterine uygun öğrenci bulunamadı.</p>
                </div>
              ) : (
                <div className="teacher-students-grid">
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
                      <div key={std.id} className="teacher-student-card">
                        <div className="teacher-student-top">
                          <div className="teacher-student-main">
                            <StudentAvatar name={std.name} index={idx} size={36} />
                            <div style={{ minWidth: 0 }}>
                              <p className="teacher-student-name">{std.name}</p>
                              <p className="teacher-student-sub">{std.email}</p>
                            </div>
                          </div>
                          {gradeObj && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 99, background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                              {gradeObj.name}
                            </span>
                          )}
                        </div>

                        <div className="teacher-student-stats">
                          <div className="teacher-student-stat-item">
                            <span className="teacher-student-stat-label">Çözülen Sınav</span>
                            <span className="teacher-student-stat-val">{stdSubs.length}</span>
                          </div>
                          <div className="teacher-student-stat-item">
                            <span className="teacher-student-stat-label">Ort. Başarı</span>
                            <span className="teacher-student-stat-val" style={{ color: avg >= 70 ? '#10b981' : avg >= 45 ? '#f59e0b' : '#ef4444' }}>
                              %{avg}
                            </span>
                          </div>
                        </div>

                        <div className="teacher-student-actions">
                          <button
                            onClick={() => setSelectedReportStudent(std)}
                            className="btn-secondary-action"
                            style={{ flex: 1, justifyContent: 'center', padding: '0.45rem' }}
                          >
                            <BarChart3 size={13} />
                            <span>Karne Aç</span>
                          </button>

                          <button
                            onClick={() => toggleCoachedStudent(currentUser?.id || 'teacher_1', std.id)}
                            style={{
                              padding: '0.45rem 0.75rem', borderRadius: '0.75rem',
                              border: isCoached ? 'none' : '1px solid var(--color-border)',
                              background: isCoached ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : 'var(--color-surface-hover)',
                              color: isCoached ? '#ffffff' : 'var(--color-text-muted)',
                              fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
                            }}
                            title={isCoached ? 'Koçluk takibinden çıkar' : 'Bireysel koçluk takibine al'}
                          >
                            {isCoached ? '✓ Koçlukta' : '+ Koçluk'}
                          </button>

                          <button
                            onClick={() => openEditStudent(std)}
                            style={{
                              padding: '0.45rem 0.55rem', borderRadius: '0.75rem',
                              background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)',
                              color: 'var(--color-text-muted)', cursor: 'pointer'
                            }}
                            title="Öğrenci bilgilerini / şifresini düzenle"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SEKME 3: ÖDEVLER & SINAVLAR
              ═══════════════════════════════════════════════════ */}
          {activeTab === 'homeworks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '0.75rem', background: 'var(--color-surface)',
                padding: '0.85rem 1.15rem', borderRadius: '1rem', border: '1px solid var(--color-border)'
              }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Ödev veya ders ara..."
                    value={hwSearch}
                    onChange={e => setHwSearch(e.target.value)}
                    className="teacher-form-input"
                    style={{ paddingLeft: '2.1rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => navigate('/homeworks')}
                    className="btn-primary-action"
                  >
                    <Plus size={15} />
                    <span>Yeni Ödev Ata</span>
                  </button>
                  <button
                    onClick={() => navigate('/physical-exam')}
                    className="btn-secondary-action"
                  >
                    <ClipboardCheck size={15} />
                    <span>Fiziki Denemeler</span>
                  </button>
                </div>
              </div>

              {filteredHomeworks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--color-surface)', borderRadius: '1rem', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <FileText size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>Henüz tanımlanmış bir ödev bulunmuyor.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {filteredHomeworks.map(hw => {
                    const due = hw.dueDate ? new Date(hw.dueDate) : null;
                    const daysLeft = due ? Math.ceil((due - Date.now()) / 86400000) : null;
                    const urgent = daysLeft !== null && daysLeft <= 2;
                    const targetCount = hw.targetIds?.length || students.length;
                    const subCount = teacherSubmissions.filter(s => s.homework_id === hw.id || s.testId === hw.id).length;

                    return (
                      <div
                        key={hw.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.85rem 1.15rem', borderRadius: '1rem',
                          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                          flexWrap: 'wrap', gap: '0.75rem'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: 4, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                              {hw.subject || 'Genel'}
                            </span>
                            {due && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                                Son Teslim: {due.toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-text)' }}>
                            {hw.title}
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'block' }}>
                            👥 {targetCount} öğrenciye atandı · {subCount} teslim yapıldı
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {daysLeft !== null && (
                            <span className={`teacher-hw-badge ${urgent ? 'urgent' : 'normal'}`}>
                              {daysLeft <= 0 ? 'Süresi Doldu' : `${daysLeft} gün kaldı`}
                            </span>
                          )}

                          <button
                            onClick={() => navigate('/homeworks')}
                            className="btn-secondary-action"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            Yönet
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SEKME 4: SINIF ANALİZİ & GRAFİKLER
              ═══════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <TeacherClassAnalytics
              students={students}
              submissions={teacherSubmissions}
              homeworks={teacherHomeworks}
              books={books}
              bookTests={bookTests}
            />
          )}

        </div>

        {/* ══════════ MODAL: YENİ ÖĞRENCİ EKLE ══════════ */}
        {showAddStudentModal && (
          <div className="teacher-modal-overlay" onClick={() => setShowAddStudentModal(false)}>
            <div className="teacher-modal-card" onClick={e => e.stopPropagation()}>
              <div className="teacher-modal-header">
                <h3><UserPlus size={18} color="#4f46e5" /> Yeni Öğrenci Ekle</h3>
                <button onClick={() => setShowAddStudentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveNewStudent} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
                  <label className="teacher-form-label">E-Posta / Kullanıcı Adı *</label>
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
                  <label className="teacher-form-label">Giriş Şifresi</label>
                  <input
                    type="text"
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
                    Vazgeç
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
                  <label className="teacher-form-label">Ad Soyad *</label>
                  <input
                    type="text"
                    required
                    value={editStudentName}
                    onChange={e => setEditStudentName(e.target.value)}
                    className="teacher-form-input"
                  />
                </div>

                <div className="teacher-form-group">
                  <label className="teacher-form-label">E-Posta *</label>
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
