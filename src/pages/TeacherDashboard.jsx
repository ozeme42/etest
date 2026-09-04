import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, X, Edit2, Users, BookOpen, ClipboardCheck,
  Clock, ChevronRight, FileText, Activity, GraduationCap,
  Search, Calendar, Layers, BarChart3, TrendingUp, Target,
  UserCheck, Sparkles, UserPlus, Eye, CheckCircle2, Flame,
  BookMarked, Star, Award, Zap, ArrowRight, Bell, Map, Key,
  Check, Trash2, ArrowUpRight, ShieldAlert, School, ShieldCheck, Clock3,
  AlertCircle, AlertTriangle, ArrowLeft
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

/* ── Mini Avatar ── */
function StudentAvatar({ name, index = 0, size = 36 }) {
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
  const { toggleCoachedStudent, getCoachedStudentIds, mockExams = [] } = useCoaching();
  const navigate = useNavigate();

  /* ── State ── */
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'students' | 'homeworks' | 'analytics'
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
  const [aiModalConfig, setAiModalConfig] = useState({ subject: '', topic: '' });

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

  const recentSubs = useMemo(() => {
    return [...teacherSubmissions]
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
      .slice(0, 7);
  }, [teacherSubmissions]);

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

  // Active & Upcoming Homeworks
  const upcomingHomeworks = useMemo(() => {
    const now = Date.now();
    return teacherHomeworks
      .filter(h => h.dueDate && new Date(h.dueDate) >= new Date(now - 86400000))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
  }, [teacherHomeworks]);

  // Subject/Branch Success Stats
  const activeSubjects = useMemo(() => {
    const map = {};
    teacherSubmissions.forEach(sub => {
      const subj = sub.subject || sub.lesson || 'Genel';
      if (!map[subj]) map[subj] = { name: subj, totalQ: 0, correctQ: 0, count: 0 };
      const c = Number(sub.correctCount ?? sub.correct ?? 0);
      const w = Number(sub.wrongCount ?? sub.wrong ?? 0);
      const b = Number(sub.emptyCount ?? sub.blankCount ?? 0);
      const total = Number(sub.totalQuestions || (c + w + b) || 10);
      map[subj].totalQ += total;
      map[subj].correctQ += c;
      map[subj].count += 1;
    });

    return Object.values(map)
      .map(s => ({
        ...s,
        avgScore: s.totalQ > 0 ? Math.round((s.correctQ / s.totalQ) * 100) : 0,
        theme: getSubjectTheme(s.name)
      }))
      .sort((a, b) => b.totalQ - a.totalQ);
  }, [teacherSubmissions]);

  // At-Risk Students
  const atRiskStudents = useMemo(() => {
    const list = [];
    const sevenDaysAgo = Date.now() - 7 * 86400000;

    students.forEach(std => {
      const { generalTrialExams = [], otherHomeworkSubmissions = [] } = computeStudentAnalyticsData({
        studentId: std.id,
        targetStudent: std,
        submissions,
        homeworks,
        books,
        bookTests
      });

      const all = [...generalTrialExams, ...otherHomeworkSubmissions];
      const recent = all.filter(s => new Date(s.date || s.submittedAt || 0).getTime() >= sevenDaysAgo);
      
      let totQ = 0, totC = 0;
      all.forEach(s => {
        const c = Number(s.correctCount ?? s.correct ?? 0);
        const w = Number(s.wrongCount ?? s.wrong ?? 0);
        const b = Number(s.emptyCount ?? s.blankCount ?? 0);
        totQ += Number(s.totalQuestions || (c + w + b) || 10);
        totC += c;
      });

      const avg = totQ > 0 ? Math.round((totC / totQ) * 100) : 0;
      
      if (all.length > 0 && avg < 50) {
        list.push({
          ...std,
          reason: `%${avg} Başarı`,
          severity: 'danger',
          avg,
          totalQuestions: totQ
        });
      } else if (all.length > 0 && recent.length === 0) {
        list.push({
          ...std,
          reason: '7 gündür test çözmedi',
          severity: 'warning',
          avg,
          totalQuestions: totQ
        });
      }
    });

    return list.slice(0, 4);
  }, [students, submissions, homeworks, books, bookTests]);

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

  /* ── Student Handlers ── */
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
    const firstQ = chosen[0];
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
              3. DÖRT TEMEL KPI METRİĞİ (BERRAK & NET)
              ═══════════════════════════════════════════════════ */}
          <div className="teacher-kpi-grid">
            <div className="teacher-kpi-card">
              <div className="teacher-kpi-icon" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
                <Users size={20} />
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Kayıtlı Öğrenciler</span>
                <span className="teacher-kpi-value">{students.length}</span>
                <span className="teacher-kpi-sub">{coachedIds.length} öğrenci koçlukta</span>
              </div>
            </div>

            <div className="teacher-kpi-card">
              <div className="teacher-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <FileText size={20} />
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Aktif Ödevler</span>
                <span className="teacher-kpi-value">{teacherHomeworks.length}</span>
                <span className="teacher-kpi-sub">{upcomingHomeworks.length} teslim süreci aktif</span>
              </div>
            </div>

            <div className="teacher-kpi-card">
              <div className="teacher-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <TrendingUp size={20} />
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Sınıf Başarısı</span>
                <span className="teacher-kpi-value">%{executiveMetrics.avgSuccess}</span>
                <span className="teacher-kpi-sub">{executiveMetrics.totalQuestions} soru çözüldü</span>
              </div>
            </div>

            <div className="teacher-kpi-card">
              <div className="teacher-kpi-icon" style={{
                background: totalPendingActionCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                color: totalPendingActionCount > 0 ? '#ef4444' : '#6366f1'
              }}>
                {totalPendingActionCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="teacher-kpi-info">
                <span className="teacher-kpi-label">Bekleyen İşlemler</span>
                <span className="teacher-kpi-value">{totalPendingActionCount}</span>
                <span className="teacher-kpi-sub">{totalPendingActionCount > 0 ? 'Onay / Puanlama bekliyor' : 'Tüm işlemler güncel'}</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              4. HIZLI ERİŞİM KARTLARI (4 PRATİK BUTON)
              ═══════════════════════════════════════════════════ */}
          <div className="teacher-actions-row">
            <div className="teacher-action-tile" onClick={() => navigate('/homeworks')}>
              <div className="teacher-action-tile-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <BookOpen size={18} />
              </div>
              <div className="teacher-action-tile-text">
                <h4>Ödev Ata</h4>
                <p>Sınıfa veya öğrenciye ödev ver</p>
              </div>
            </div>

            <div className="teacher-action-tile" onClick={() => navigate('/questions')}>
              <div className="teacher-action-tile-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                <Layers size={18} />
              </div>
              <div className="teacher-action-tile-text">
                <h4>Soru Bankası</h4>
                <p>Müfredat havuzu ve testler</p>
              </div>
            </div>

            <div className="teacher-action-tile" onClick={() => navigate('/remedial')}>
              <div className="teacher-action-tile-icon" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
                <Target size={18} />
              </div>
              <div className="teacher-action-tile-text">
                <h4>Telafi &amp; Koçluk</h4>
                <p>Eksik kazanımlar ve tekrarlar</p>
              </div>
            </div>

            <div className="teacher-action-tile" onClick={() => navigate('/approvals')}>
              <div className="teacher-action-tile-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <ShieldCheck size={18} />
              </div>
              <div className="teacher-action-tile-text">
                <h4>Onay Merkezi</h4>
                <p>Manuel test &amp; deneme onayları</p>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              5. DÖRT ANA SEKME ÇUBUĞU
              ═══════════════════════════════════════════════════ */}
          <nav className="teacher-tabs-nav">
            <button
              onClick={() => setActiveTab('overview')}
              className={`teacher-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <Activity size={16} />
              <span>Genel Bakış</span>
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
              SEKME 1: GENEL BAKIŞ (KOKPİT)
              ═══════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="teacher-overview-grid">
              {/* SOL SÜTUN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Son Çözülen Sınavlar & Aktiviteler */}
                <div className="teacher-card">
                  <div className="teacher-card-header">
                    <h3><Activity size={16} color="#10b981" /> Son Öğrenci Hareketleri</h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Canlı akış</span>
                  </div>

                  {recentSubs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                      Henüz çözülen bir test veya ödev yok.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {recentSubs.map((sub, idx) => {
                        const student = users.find(u => u.id === sub.studentId);
                        const scorePct = getSubmissionScorePct(sub);
                        const c = sub.correctCount ?? sub.correct;
                        const w = sub.wrongCount ?? sub.wrong;
                        const hasScore = scorePct !== null;
                        const isGood = hasScore && scorePct >= 70;
                        const isMid = hasScore && scorePct >= 45 && scorePct < 70;
                        return (
                          <div
                            key={sub.id || idx}
                            className="teacher-activity-row"
                            onClick={() => student && setSelectedReportStudent(student)}
                            title="Öğrencinin karnesini açmak için tıklayın"
                          >
                            <StudentAvatar name={student?.name} index={idx} size={32} />
                            <div className="teacher-activity-info">
                              <p className="teacher-activity-name">{student?.name || 'Öğrenci'}</p>
                              <p className="teacher-activity-meta">
                                {sub.testTitle || sub.title || 'Sınav'} · {timeAgo(sub.submittedAt)}
                                {c !== undefined && w !== undefined && ` (${c}D ${w}Y)`}
                              </p>
                            </div>
                            {hasScore ? (
                              <span className={`teacher-score-pill ${isGood ? 'good' : isMid ? 'warn' : 'bad'}`}>
                                %{scorePct}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Takip Edilmesi Gereken Öğrenciler */}
                {atRiskStudents.length > 0 && (
                  <div className="teacher-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                    <div className="teacher-card-header">
                      <h3 style={{ color: '#ef4444' }}>
                        <AlertTriangle size={16} color="#ef4444" /> Takip Edilmesi Gereken Öğrenciler
                      </h3>
                      <button onClick={() => setActiveTab('students')} className="teacher-card-link">
                        Tüm Sınıf <ChevronRight size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {atRiskStudents.map((std, i) => (
                        <div
                          key={std.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.55rem 0.75rem', borderRadius: '0.75rem',
                            background: std.severity === 'danger' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(245, 158, 11, 0.06)',
                            border: `1px solid ${std.severity === 'danger' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                            gap: '0.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                            <StudentAvatar name={std.name} index={i} size={28} />
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text)' }}>
                                {std.name}
                              </p>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: std.severity === 'danger' ? '#ef4444' : '#f59e0b' }}>
                                {std.reason}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedReportStudent(std)}
                            style={{
                              padding: '0.3rem 0.65rem', borderRadius: '0.5rem',
                              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                              color: 'var(--color-text)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                            }}
                          >
                            Karne Aç
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SAĞ SÜTUN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Yaklaşan & Aktif Ödevler */}
                <div className="teacher-card">
                  <div className="teacher-card-header">
                    <h3><FileText size={16} color="#f59e0b" /> Aktif &amp; Yaklaşan Ödevler</h3>
                    <button onClick={() => navigate('/homeworks')} className="teacher-card-link">
                      Ödevleri Yönet <ChevronRight size={13} />
                    </button>
                  </div>

                  {upcomingHomeworks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                      Şu an teslimi yaklaşan aktif ödev yok.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {upcomingHomeworks.map(hw => {
                        const due = new Date(hw.dueDate);
                        const daysLeft = Math.ceil((due - Date.now()) / 86400000);
                        const urgent = daysLeft <= 2;
                        const targetCount = hw.targetIds?.length || students.length;
                        return (
                          <div key={hw.id} className="teacher-hw-row">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p className="teacher-hw-title">{hw.title}</p>
                              <p className="teacher-hw-meta">{hw.subject || 'Genel'} · {targetCount} Öğrenci</p>
                            </div>
                            <span className={`teacher-hw-badge ${urgent ? 'urgent' : 'normal'}`}>
                              {daysLeft <= 0 ? 'Bugün!' : `${daysLeft} gün kaldı`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Branş Başarısı Özeti */}
                <div className="teacher-card">
                  <div className="teacher-card-header">
                    <h3><BookMarked size={16} color="#6366f1" /> Branş Başarı Dağılımı</h3>
                    <button onClick={() => setActiveTab('analytics')} className="teacher-card-link">
                      Detaylı Grafikler <ChevronRight size={13} />
                    </button>
                  </div>

                  {activeSubjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                      Branş bazlı sınav çözümü verisi henüz oluşmadı.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {activeSubjects.slice(0, 5).map(subj => {
                        const isHigh = subj.avgScore >= 70;
                        const isMid = subj.avgScore >= 45 && subj.avgScore < 70;
                        const color = isHigh ? '#10b981' : isMid ? '#f59e0b' : '#ef4444';
                        return (
                          <div key={subj.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{subj.name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{subj.totalQ} soru</span>
                                <span style={{ fontWeight: 800, color }}>%{subj.avgScore}</span>
                              </div>
                            </div>
                            <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${subj.avgScore}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
