import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, X, Edit2, Users, BookOpen, ClipboardCheck,
  Clock, ChevronRight, FileText, Activity, GraduationCap,
  Search, Calendar, Layers, BarChart3, TrendingUp, Target,
  UserCheck, Sparkles, UserPlus, Eye, CheckCircle2, Flame,
  BookMarked, Star, Award, Zap, ArrowRight, Bell, Map, Key,
  Check, Trash2, ArrowUpRight, ShieldAlert, School, ShieldCheck, Clock3,
  AlertCircle, AlertTriangle
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
import TeacherActionCenter from '../components/teacher/TeacherActionCenter';
import TeacherClassPulseRadar from '../components/teacher/TeacherClassPulseRadar';
import TeacherClassroomExplorer from '../components/teacher/TeacherClassroomExplorer';
import AiQuestionGeneratorModal from '../components/question-bank/AiQuestionGeneratorModal';
import TeacherStudentQuickReportModal from '../components/teacher/TeacherStudentQuickReportModal';
import './TeacherDashboard.css';

/* ─────────────────────────────────────────
   Calculation Helpers
───────────────────────────────────────── */
export function getSubmissionScorePct(sub) {
  if (!sub) return null;
  const correct = sub.correctCount ?? sub.correct;
  const wrong = sub.wrongCount ?? sub.wrong ?? 0;
  const blank = sub.blankCount ?? sub.emptyCount ?? sub.blank ?? 0;
  const ansCount = Array.isArray(sub.answers) ? sub.answers.length : 0;
  const total = sub.totalQuestions || ((correct !== undefined ? correct : 0) + wrong + blank) || ansCount;
  
  if (total > 0 && correct !== undefined && correct !== null && (correct > 0 || wrong > 0 || blank > 0)) {
    return Math.min(100, Math.max(0, Math.round((correct / total) * 100)));
  }
  if (sub.scorePercentage !== undefined && sub.scorePercentage !== null) {
    return Math.min(100, Math.max(0, Math.round(+sub.scorePercentage)));
  }
  if (sub.score !== undefined && sub.score !== null) {
    const s = +sub.score;
    if (total > 0 && s <= total) {
      return Math.min(100, Math.max(0, Math.round((s / total) * 100)));
    }
    return Math.min(100, Math.max(0, Math.round(s)));
  }
  return null;
}

/* ─────────────────────────────────────────
   Components & Sub-views
───────────────────────────────────────── */
function Avatar({ name, index, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: getAvatarBg(index ?? 0),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 900, fontSize: size * 0.38,
      flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1.5px solid var(--color-surface)'
    }}>
      {(name || 'Ö').charAt(0).toUpperCase()}
    </div>
  );
}

function StatHeroCard({ label, value, sub, icon: Icon, color, bg, border }) {
  return (
    <div className="stat-hero-card" style={{ borderColor: border || 'var(--color-border)' }}>
      <div className="stat-hero-icon" style={{ background: bg || 'rgba(99, 102, 241, 0.15)', color: color || '#6366f1' }}>
        <Icon size={24} />
      </div>
      <div style={{ minWidth: 0 }}>
        <span className="stat-hero-label">{label}</span>
        <span className="stat-hero-value">{value}</span>
        {sub && <span className="stat-hero-sub">{sub}</span>}
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, sub, grad, shadow, onClick }) {
  return (
    <button onClick={onClick} className="quick-action-btn" style={{ background: grad, boxShadow: shadow || '0 4px 14px rgba(0,0,0,0.06)' }}>
      <div className="quick-action-icon">
        <Icon size={20} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontWeight: 900, fontSize: '0.88rem', margin: 0, lineHeight: 1.2 }}>{label}</p>
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', margin: '0.15rem 0 0', fontWeight: 600 }}>{sub}</p>
      </div>
      <ChevronRight size={16} style={{ opacity: 0.8, flexShrink: 0 }} />
    </button>
  );
}

function PillTab({ id, label, icon: Icon, badge, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.65rem 1.15rem',
        borderRadius: '0.9rem',
        border: active ? '1.5px solid #6366f1' : '1.5px solid var(--color-border)',
        background: active ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-surface)',
        color: active ? '#6366f1' : 'var(--color-text-muted)',
        fontWeight: 800, fontSize: '0.82rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap', flexShrink: 0,
        boxShadow: active ? '0 2px 8px rgba(99,102,241,0.2)' : 'none',
        transition: 'all 0.15s',
      }}
    >
      <Icon size={16} />
      <span>{label}</span>
      {badge !== undefined && (
        <span style={{
          background: active ? 'rgba(99, 102, 241, 0.25)' : 'var(--color-surface-hover)',
          color: active ? '#818cf8' : 'var(--color-text)',
          fontSize: '0.68rem', fontWeight: 900,
          padding: '0.15rem 0.5rem', borderRadius: 99
        }}>{badge}</span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function TeacherDashboard() {
  const { data, addTest, updateTest }   = useCurriculum();
  const { questions, addQuestion }     = useQuestionBank();
  const { homeworks = [] }              = useHomework();
  const { books = [], bookTests = [] }  = useTrackedBooks() || {};
  const { submissions = [] }            = useEvaluation();
  const { users = [], addStudentForTeacher, updateUser } = useUser();
  const { currentUser }                 = useAuth();
  const { toggleCoachedStudent, getCoachedStudentIds, mockExams = [] } = useCoaching();
  const navigate = useNavigate();

  /* ── state ── */
  const [tab, setTab]           = useState('overview');
  const [searchQ, setSearchQ]   = useState('');
  const [filterSub, setFilterSub] = useState('');

  const [showModal, setShowModal]             = useState(false);
  const [editingTestId, setEditingTestId]     = useState(null);
  const [testName, setTestName]               = useState('');
  const [timePerQ, setTimePerQ]               = useState(2);
  const [selGrade, setSelGrade]               = useState('');
  const [selSubject, setSelSubject]           = useState('');
  const [selUnit, setSelUnit]                 = useState('');
  const [selTopic, setSelTopic]               = useState('');
  const [selQIds, setSelQIds]                 = useState([]);

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName]           = useState('');
  const [newStudentEmail, setNewStudentEmail]         = useState('');
  const [newStudentPassword, setNewStudentPassword]   = useState('123456');
  const [newStudentGrade, setNewStudentGrade]         = useState('');

  const [editingStudent, setEditingStudent]         = useState(null);
  const [editStudentName, setEditStudentName]       = useState('');
  const [editStudentEmail, setEditStudentEmail]     = useState('');
  const [editStudentPassword, setEditStudentPassword] = useState('');
  const [editStudentGrade, setEditStudentGrade]     = useState('');
  const [selectedReportStudent, setSelectedReportStudent] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalConfig, setAiModalConfig] = useState({ subject: '', topic: '' });

  useEffect(() => {
    if (data?.grades?.length > 0 && !newStudentGrade) {
      setNewStudentGrade(data.grades[0].id);
    }
  }, [data?.grades]);

  /* ── derived data ── */
  const students = useMemo(() =>
    (users || []).filter(u => u.role === 'student' &&
      (currentUser?.role === 'admin' || u.teacherId === currentUser?.id)),
    [users, currentUser]
  );
  const coachedIds = getCoachedStudentIds(currentUser?.id || 'teacher_1');

  const teacherStudentIds = useMemo(() => students.map(s => s.id), [students]);

  const teacherHomeworks = useMemo(() => {
    if (currentUser?.role === 'admin') return homeworks || [];
    return (homeworks || []).filter(h =>
      h.assignedBy === currentUser?.id || h.createdBy === currentUser?.id || h.teacherId === currentUser?.id
    );
  }, [homeworks, currentUser]);

  const teacherHwIds = useMemo(() => teacherHomeworks.map(h => h.id), [teacherHomeworks]);

  const teacherQuestions = useMemo(() => {
    if (currentUser?.role === 'admin') return questions || [];
    return (questions || []).filter(q => q.createdBy === currentUser?.id);
  }, [questions, currentUser]);

  const teacherSubmissions = useMemo(() =>
    (submissions || []).filter(sub =>
      currentUser?.role === 'admin' ||
      teacherStudentIds.includes(sub.studentId) ||
      teacherHwIds.includes(sub.testId)
    ), [submissions, teacherStudentIds, teacherHwIds, currentUser]
  );

  const recentSubs = useMemo(() =>
    [...teacherSubmissions]
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
      .slice(0, 8),
    [teacherSubmissions]
  );

  /* student leaderboard */
  const leaderboard = useMemo(() => {
    return students.map((s, i) => {
      const subs = teacherSubmissions.filter(sub => sub.studentId === s.id && getSubmissionScorePct(sub) !== null);
      const avg = subs.length ? Math.round(subs.reduce((acc, sub) => acc + (getSubmissionScorePct(sub) || 0), 0) / subs.length) : 0;
      return { ...s, avg, count: subs.length, idx: i };
    }).sort((a, b) => b.avg - a.avg);
  }, [students, teacherSubmissions]);

  /* upcoming homeworks */
  const pendingEvaluations = useMemo(() => {
    return teacherSubmissions.filter(sub => {
      if (!sub) return false;
      if (sub.isEvaluatedByTeacher || sub.status === 'evaluated' || sub.status === 'approved' || sub.evalStatus === 'graded' || sub.evaluatedAt) return false;
      
      // SADECE açık uçlu sınav kağıtları
      const isOpenEndedType = sub.type === 'open_ended' || sub.sourceType === 'open_ended' || sub.format === 'open_ended' || sub.status === 'pending_evaluation';
      if (!isOpenEndedType) return false;

      // İçerisinde henüz puanlanmamış açık uçlu soru yanıtı var mı?
      const hasUnscoredAnswers = Array.isArray(sub.answers) && sub.answers.some(a => 
        (a.questionType === 'open_ended' || a.isOpenEnded || sub.type === 'open_ended') &&
        a.userAnswerText && String(a.userAnswerText).trim() !== '' &&
        typeof a.score !== 'number'
      );
      return hasUnscoredAnswers || sub.status === 'pending_evaluation';
    });
  }, [teacherSubmissions]);

  const dueHomeworks = useMemo(() => {
    const now = Date.now();
    return teacherHomeworks.filter(h => {
      if (!h.dueDate) return false;
      const dueMs = new Date(h.dueDate).getTime();
      const daysLeft = Math.ceil((dueMs - now) / 86400000);
      return daysLeft >= 0 && daysLeft <= 2;
    });
  }, [teacherHomeworks]);

  const handleLaunchAiForTopic = (topicName, subjectName) => {
    setAiModalConfig({ topic: topicName, subject: subjectName || 'Matematik' });
    setIsAiModalOpen(true);
  };

  const handleSaveAiQuestions = (bundle) => {
    if (addQuestion) {
      addQuestion(bundle);
    }
  };

  // Aggregate top executive metrics across all students
  const executiveMetrics = useMemo(() => {
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalSubs = 0;

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
      totalSubs += all.length;
      all.forEach(sub => {
        const correct = Number(sub.correctCount ?? sub.correct ?? 0);
        const wrong = Number(sub.wrongCount ?? sub.wrong ?? 0);
        const blank = Number(sub.emptyCount ?? sub.blankCount ?? 0);
        const qCount = Number(sub.totalQuestions || (correct + wrong + blank) || 10);
        totalQuestions += qCount;
        totalCorrect += correct;
      });
    });

    const avgSuccess = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    return { totalQuestions, avgSuccess, totalSubs };
  }, [students, submissions, homeworks, books, bookTests]);

  const upcomingHw = useMemo(() => {
    const now = Date.now();
    return teacherHomeworks
      .filter(h => h.dueDate && new Date(h.dueDate) >= new Date(now - 86400000))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 6);
  }, [teacherHomeworks]);

  /* quiz modal */
  const filtSubs   = selGrade   === 'all' ? data.subjects : data.subjects.filter(s => s.gradeId === selGrade);
  const filtUnits  = selSubject === 'all' ? data.units    : data.units.filter(u => u.subjectId === selSubject);
  const filtTopics = selUnit    === 'all' ? data.topics   : data.topics.filter(t => t.unitId === selUnit);

  const getCatId = () => {
    if (selTopic   && selTopic   !== 'all') return selTopic;
    if (selTopic   === 'all') return `unit_${selUnit}_all`;
    if (selUnit    === 'all') return `sub_${selSubject}_all`;
    if (selSubject === 'all') return `grade_${selGrade}_all`;
    if (selGrade   === 'all') return 'global_all';
    return null;
  };
  const catId  = getCatId();
  const poolQs = questions.filter(q => q.topicId === catId);
  const toggleQ = id => setSelQIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const openEdit = (test) => {
    setEditingTestId(test.id); setTestName(test.title); setTimePerQ(test.timePerQuestion || 2);
    setSelQIds(test.questionIds || []);
    if (test.filters) {
      const f = test.filters;
      setSelGrade(f.selGrade); setSelSubject(f.selSubject);
      setSelUnit(f.selUnit);   setSelTopic(f.selTopic);
    } else { setSelGrade(''); setSelSubject(''); setSelUnit(''); setSelTopic(''); }
    setShowModal(true);
  };
  const resetForm = () => {
    setEditingTestId(null); setTestName(''); setTimePerQ(2);
    setSelGrade(''); setSelSubject(''); setSelUnit(''); setSelTopic('');
    setSelQIds([]); setShowModal(false);
  };
  const handleCreate = (e) => {
    e.preventDefault();
    if (!testName || !catId || selQIds.length === 0) return;
    const chosen = poolQs.filter(q => selQIds.includes(q.id));
    const total  = chosen.reduce((s, q) => s + (q.isBundle ? (q.questionCount || 1) : 1), 0);
    const firstQ = chosen[0];
    const payload = {
      title: testName, subject: (() => {
        let n = 'Genel (Tümü)';
        if (selSubject !== 'all' && selSubject !== '') n = data.subjects.find(s => s.id === selSubject)?.name || n;
        return n;
      })(),
      topicId: catId, questions: total, questionIds: selQIds,
      timePerQuestion: +timePerQ, time: total * +timePerQ,
      color: 'primary', filters: { selGrade, selSubject, selUnit, selTopic },
      type: firstQ?.type || 'coktan_secmeli', sourceType: firstQ?.sourceType || firstQ?.contentType || null
    };
    editingTestId ? updateTest(editingTestId, payload) : addTest(payload);
    resetForm();
  };

  const openEditStudentModal = (student) => {
    setEditingStudent(student);
    setEditStudentName(student.name || '');
    setEditStudentEmail(student.email || '');
    setEditStudentPassword(student.password || '123456');
    const g = data?.grades?.find(g => String(g.id) === String(student.gradeId) || String(g.id) === String(student.classId))
           || data?.grades?.find(g => g.name === student.gradeId || g.name === student.grade || g.name === student.className);
    setEditStudentGrade(g ? g.id : (student.gradeId || data?.grades?.[0]?.id || 'g1'));
  };

  const allSubjects  = [...new Set(data.tests.map(t => t.subject).filter(Boolean))];
  const visibleTests = data.tests.filter(t => {
    const ms = !searchQ   || t.title.toLowerCase().includes(searchQ.toLowerCase());
    const mf = !filterSub || t.subject === filterSub;
    return ms && mf;
  });

  // ── 1. ACTIVE SUBJECTS & BRANCH BREAKDOWN ──
  const activeSubjects = useMemo(() => {
    const map = {};
    students.forEach(std => {
      const { generalTrialExams = [], otherHomeworkSubmissions = [] } = computeStudentAnalyticsData({
        studentId: std.id,
        targetStudent: std,
        submissions,
        homeworks,
        books,
        bookTests
      });

      [...generalTrialExams, ...otherHomeworkSubmissions].forEach(sub => {
        let subj = sub.subject || 'Genel';
        const l = subj.toLowerCase();
        if (l.includes('matematik') || l.includes('geometri')) subj = 'Matematik';
        else if (l.includes('türkçe') || l.includes('paragraf') || l.includes('edebiyat')) subj = 'Türkçe';
        else if (l.includes('fen') || l.includes('fizik') || l.includes('kimya') || l.includes('biyoloji')) subj = 'Fen Bilimleri';
        else if (l.includes('sosyal') || l.includes('tarih') || l.includes('coğrafya') || l.includes('inkılap')) subj = 'Sosyal Bilgiler';
        else if (l.includes('ingilizce') || l.includes('english')) subj = 'İngilizce';
        else if (l.includes('din') || l.includes('ahlak')) subj = 'Din Kültürü';

        if (!map[subj]) {
          map[subj] = { name: subj, questions: 0, correct: 0, testCount: 0 };
        }
        const c = Number(sub.correctCount ?? sub.correct ?? 0);
        const w = Number(sub.wrongCount ?? sub.wrong ?? 0);
        const b = Number(sub.emptyCount ?? sub.blankCount ?? 0);
        const q = Number(sub.totalQuestions || (c + w + b) || 10);
        map[subj].questions += q;
        map[subj].correct += c;
        map[subj].testCount += 1;
      });
    });

    return Object.values(map).map(s => ({
      ...s,
      avgScore: s.questions > 0 ? Math.round((s.correct / s.questions) * 100) : 0,
      theme: getSubjectTheme(s.name)
    })).sort((a, b) => b.questions - a.questions);
  }, [students, submissions, homeworks, books, bookTests]);

  // ── 2. UPCOMING EXAMS & TESTS ──
  const upcomingExams = useMemo(() => {
    const list = [];
    // From homework exams
    (teacherHomeworks || []).forEach(hw => {
      if (hw.type === 'physicalExam' || hw.type === 'exam' || hw.isExam || hw.title?.toLowerCase().includes('deneme')) {
        list.push({
          id: hw.id,
          title: hw.title,
          subject: hw.subject || 'Genel Deneme',
          dueDate: hw.dueDate,
          type: 'Ödev Sınavı',
          studentCount: (hw.targetIds || []).length || students.length
        });
      }
    });

    // From exam books
    (books || []).forEach(b => {
      if (b.bookType === 'exam' || b.isExamBook) {
        list.push({
          id: b.id,
          title: b.title,
          subject: b.subject || 'Fiziki Deneme',
          type: 'Fiziki Kitap Denemesi',
          studentCount: students.length
        });
      }
    });

    return list.slice(0, 5);
  }, [teacherHomeworks, books, students]);

  // ── 3. AT-RISK / NEEDS ATTENTION STUDENTS ──
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
          reason: `Kritik Başarı (% ${avg})`,
          severity: 'danger',
          avg,
          totalQuestions: totQ,
          recentCount: recent.length
        });
      } else if (all.length > 0 && recent.length === 0) {
        list.push({
          ...std,
          reason: 'Son 7 gündür sınav çözmedi',
          severity: 'warning',
          avg,
          totalQuestions: totQ,
          recentCount: 0
        });
      }
    });

    return list.slice(0, 6);
  }, [students, submissions, homeworks, books, bookTests]);

  // ── 4. RECENTLY ADDED STUDENTS ──
  const recentlyAddedStudents = useMemo(() => {
    return [...students].slice(-5).reverse();
  }, [students]);

  // ── 5. TODAY'S LESSONS / DAILY AGENDA ──
  const todayAgenda = useMemo(() => {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const todayName = days[new Date().getDay()];
    const todayYMD = new Date().toISOString().split('T')[0];

    // Today due homeworks
    const dueTodayHw = (teacherHomeworks || []).filter(h => h.dueDate && h.dueDate.startsWith(todayYMD));

    return {
      todayName,
      todayDateStr: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
      dueTodayHw,
      activeBranchCount: activeSubjects.length
    };
  }, [teacherHomeworks, activeSubjects]);

  const pendingManualApprovals = useMemo(() => {
    // 1. Manuel Testler
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

    // 2. Manuel Denemeler (Mock Exams)
    const manualMocks = (mockExams || []).filter(m => {
      if (!m) return false;
      const isPending = m.approvalStatus === 'pending' || m.status === 'pending_approval' || (m.isApproved === false && m.approvalStatus !== 'rejected');
      if (!isPending) return false;
      if (currentUser?.role === 'admin') return true;
      return teacherStudentIds.includes(String(m.studentId)) || teacherStudentIds.includes(String(toUUID(m.studentId)));
    });

    return [...manualTests, ...manualMocks];
  }, [submissions, mockExams, teacherStudentIds, currentUser]);

  // Total pending notifications (SADECE öğretmenin onaylaması veya puanlaması gereken GERÇEK bekleyen işlemler)
  const totalPendingNotifications = pendingManualApprovals.length + pendingEvaluations.length;

  const tabs = [
    { id: 'overview',  label: 'Genel Bakış', icon: Activity },
    { id: 'analytics', label: 'Canlı Grafikler & Analiz', icon: BarChart3 },
    { id: 'tests',     label: 'Testler & Sınavlar', icon: FileText, badge: visibleTests.length },
    { id: 'students',  label: 'Sınıfım & Öğrenciler', icon: Users, badge: students.length },
    { id: 'coaching',  label: 'Koçluk & Takip', icon: Target },
  ];

  const quickActions = [
    { icon: UserPlus,  label: 'Öğrenci Ekle',   sub: 'Hızlı sınıf kaydı',       grad: 'linear-gradient(135deg,#059669,#10b981)', shadow: '0 6px 20px rgba(16,185,129,0.35)',  onClick: () => setShowAddStudentModal(true) },
    { icon: Plus,      label: 'Test Oluştur',    sub: 'Soru bankasından test',   grad: 'linear-gradient(135deg,#4f46e5,#6366f1)', shadow: '0 6px 20px rgba(99,102,241,0.35)',  onClick: () => { resetForm(); setShowModal(true); } },
    { icon: ShieldCheck, label: 'Onay Merkezi',  sub: pendingManualApprovals.length > 0 ? `⏳ ${pendingManualApprovals.length} test bekliyor` : 'Manuel test & onaylar', grad: 'linear-gradient(135deg,#7c3aed,#a855f7)', shadow: '0 6px 20px rgba(124,58,237,0.35)', onClick: () => navigate('/approvals') },
    { icon: BookOpen,  label: 'Ödev Ver',         sub: 'Öğrencilere ödev ata',    grad: 'linear-gradient(135deg,#d97706,#f59e0b)', shadow: '0 6px 20px rgba(245,158,11,0.35)',  onClick: () => navigate('/homeworks') },
    { icon: Layers,    label: 'Soru Bankası',     sub: 'Sorularını yönet',        grad: 'linear-gradient(135deg,#0284c7,#0369a1)', shadow: '0 6px 20px rgba(2,132,199,0.35)', onClick: () => navigate('/questions') },
    { icon: BarChart3, label: 'Canlı Analiz',     sub: 'Sınıf performans grafikleri', grad: 'linear-gradient(135deg,#e11d48,#f43f5e)', shadow: '0 6px 20px rgba(244,63,94,0.35)', onClick: () => setTab('analytics') },
  ];

  /* ── render helpers ── */
  const ScoreBar = ({ value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: 6, background: 'var(--color-border)', borderRadius: 9, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 9, width: `${value}%`,
          background: value >= 70 ? 'linear-gradient(90deg,#10b981,#059669)'
            : value >= 40 ? 'linear-gradient(90deg,#f59e0b,#f97316)'
            : 'linear-gradient(90deg,#f43f5e,#e11d48)',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444', minWidth: 32 }}>
        %{value}
      </span>
    </div>
  );

  return (
    <div className="teacher-dashboard-container">
      <div className="teacher-main-wrapper">

        {/* ═══════════════════════════════════════════════════
            1. TOP HERO HEADER & GREETING BAR
            ═══════════════════════════════════════════════════ */}
        <div className="teacher-hero-header">
          <div className="teacher-profile-group">
            <div className="teacher-avatar-icon" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <GraduationCap size={26} color="#ffffff" />
            </div>
            <div className="teacher-info-text">
              <div className="teacher-badge-row">
                <span className="teacher-badge-label">Öğretmen Yönetim Portalı</span>
                <span className="teacher-pro-pill" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.25)' }}>PRO DESK</span>
              </div>
              <h1 style={{ color: 'var(--color-text)' }}>{currentUser?.name || 'Öğretmen'}</h1>
              <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                📅 {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="teacher-header-actions">
            {totalPendingNotifications > 0 && (
              <button
                onClick={() => navigate('/approvals')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  padding: '0.55rem 0.95rem', borderRadius: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.12)', border: '1.5px solid rgba(239, 68, 68, 0.35)',
                  color: '#ef4444', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Bekleyen bildirim ve onaylara git"
              >
                <Bell size={15} color="#ef4444" />
                <span>{totalPendingNotifications} Bildirim</span>
              </button>
            )}
            <button
              onClick={() => { if (!newStudentGrade && data?.grades?.[0]?.id) setNewStudentGrade(data.grades[0].id); setShowAddStudentModal(true); }}
              className="btn-header-add-student"
              style={{ background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)' }}
            >
              <UserPlus size={15} /> Öğrenci Ekle
            </button>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="btn-header-create-test"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#ffffff' }}
            >
              <Plus size={15} /> Test Oluştur
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            2. PENDING ACTION / NOTIFICATION BANNER (IF ANY)
            ═══════════════════════════════════════════════════ */}
        {totalPendingNotifications > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(245, 158, 11, 0.08))',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '1rem',
            padding: '0.75rem 1.15rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '0.75rem',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={17} />
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)' }}>
                <span style={{ color: '#ef4444', fontWeight: 900 }}>{totalPendingNotifications} adet onay/değerlendirme bekliyor:</span>
                <span style={{ marginLeft: 6, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  {pendingManualApprovals.length > 0 && `${pendingManualApprovals.length} manuel test/deneme onayı`}
                  {pendingEvaluations.length > 0 && `${pendingManualApprovals.length > 0 ? ', ' : ''}${pendingEvaluations.length} açık uçlu sınav değerlendirmesi`}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/approvals')}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '0.6rem',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.75rem',
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)'
              }}
            >
              Onay Merkezine Git →
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            3. TOP 6 KPI METRIC CARDS (EXECUTIVE DASHBOARD)
            ═══════════════════════════════════════════════════ */}
        <div className="teacher-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <StatHeroCard icon={Users}          label="Toplam Öğrenci"       value={`${students.length} Öğrenci`} sub="Aktif sınıf kaydı" color="#38bdf8" bg="rgba(2, 132, 199, 0.15)" border="rgba(2, 132, 199, 0.4)" />
          <StatHeroCard icon={BookMarked}     label="Aktif Branşlar"       value={`${activeSubjects.length} Branş`} sub="Müfredat & Kitap Takibi" color="#c084fc" bg="rgba(147, 51, 234, 0.15)" border="rgba(147, 51, 234, 0.4)" />
          <StatHeroCard icon={FileText}       label="Bekleyen Ödevler"     value={`${teacherHomeworks.length} Ödev`} sub={dueHomeworks.length > 0 ? `🔥 ${dueHomeworks.length} süresi yaklaştı` : 'Tüm ödevler planlı'} color="#fbbf24" bg="rgba(217, 119, 6, 0.15)" border="rgba(217, 119, 6, 0.4)" />
          <StatHeroCard icon={ClipboardCheck} label="Yaklaşan Sınavlar"    value={`${upcomingExams.length} Sınav`} sub="Deneme & Optik Test" color="#6366f1" bg="rgba(99, 102, 241, 0.15)" border="rgba(99, 102, 241, 0.4)" />
          <StatHeroCard icon={TrendingUp}     label="Başarı Ortalaması"    value={`%${executiveMetrics.avgSuccess}`} sub={`${executiveMetrics.totalQuestions} Soru Çözüldü`} color="#4ade80" bg="rgba(22, 163, 74, 0.15)" border="rgba(22, 163, 74, 0.4)" />
          <StatHeroCard icon={Bell}           label="Bildirim & Onay"      value={`${totalPendingNotifications} Bildirim`} sub={totalPendingNotifications > 0 ? `${pendingManualApprovals.length} Onay, ${pendingEvaluations.length} Açık Uçlu` : 'Tüm işlemler güncel'} color="#f43f5e" bg="rgba(225, 29, 72, 0.15)" border="rgba(225, 29, 72, 0.4)" />
        </div>

        {/* ═══════════════════════════════════════════════════
            4. QUICK ACTIONS ROW
            ═══════════════════════════════════════════════════ */}
        <section className="teacher-quick-actions-grid">
          {quickActions.map(qa => (
            <QuickAction key={qa.label} {...qa} />
          ))}
        </section>

        {/* ═══════════════════════════════════════════════════
            5. MAIN TAB NAVIGATION BAR
            ═══════════════════════════════════════════════════ */}
        <div className="teacher-tab-bar custom-scrollbar">
          {tabs.map(t => (
            <PillTab key={t.id} {...t} active={tab === t.id} onClick={setTab} />
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════
            TAB 1: ANALYTICS (CANLI GRAFİKLER & PERFORMANS)
            ═══════════════════════════════════════════════════ */}
        {tab === 'analytics' && (
          <TeacherClassAnalytics
            students={students}
            submissions={teacherSubmissions}
            homeworks={teacherHomeworks}
            books={books}
            bookTests={bookTests}
          />
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 2: OVERVIEW (TAM DONANIMLI 10-MODÜLLÜ KOKPİT)
            ═══════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* ── 1. GÜNLÜK AJANDA ŞERİDİ ── */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.25rem',
              padding: '1rem 1.35rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.85rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    📅 Bugünkü Plan &amp; Dersler — <span style={{ color: '#6366f1' }}>{todayAgenda.todayDateStr} ({todayAgenda.todayName})</span>
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {todayAgenda.dueTodayHw.length > 0
                      ? `⚠️ Bugün teslim edilecek ${todayAgenda.dueTodayHw.length} ödev bulunuyor.`
                      : '✅ Bugün için acil ödev teslimi bulunmuyor. Tüm sınıflar planlı ilerliyor.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setTab('students')}
                  style={{
                    padding: '0.45rem 0.85rem', borderRadius: '0.65rem',
                    background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
                    color: 'var(--color-text)', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
                  }}
                >
                  👥 Sınıf Listesi
                </button>
                <button
                  onClick={() => setTab('analytics')}
                  style={{
                    padding: '0.45rem 0.85rem', borderRadius: '0.65rem',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none',
                    color: 'white', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  📈 Canlı Grafikler
                </button>
              </div>
            </div>

            {/* ── 2. ANA 2-SÜTUNLU KOKPİT GRID ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '1.25rem'
            }}>

              {/* ═══════════════════════════════════════════
                  SOL SÜTUN: DİKKAT LİSTESİ + SON AKTİVİTELER + BİLDİRİMLER
                  ═══════════════════════════════════════════ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* ⚠️ 1. TAKİP EDİLMESİ GEREKEN ÖĞRENCİLER (RİSK / DİKKAT LİSTESİ) */}
                <div className="overview-card-box" style={{ border: '1.5px solid rgba(239, 68, 68, 0.35)' }}>
                  <div className="overview-card-header">
                    <h3 style={{ color: '#ef4444' }}>
                      <AlertCircle size={18} color="#ef4444" /> ⚠️ Takip Edilmesi Gereken Öğrenciler
                    </h3>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '2px 8px', borderRadius: 99, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                      {atRiskStudents.length} Öğrenci
                    </span>
                  </div>

                  {atRiskStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.4rem' }} />
                      <p style={{ margin: 0, fontWeight: 800, color: '#10b981' }}>Tüm öğrenciler hedeflenen başarı düzeyinde!</p>
                      <span style={{ fontSize: '0.72rem' }}>Kritik başarı düşüşü veya devamsızlık gösteren öğrenci yok.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {atRiskStudents.map((std, i) => (
                        <div
                          key={std.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.65rem 0.85rem', borderRadius: '0.75rem',
                            background: std.severity === 'danger' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                            border: `1px solid ${std.severity === 'danger' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                            gap: '0.6rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                            <Avatar name={std.name} index={i} size={32} />
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 900, fontSize: '0.84rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {std.name}
                              </p>
                              <p style={{ margin: '1px 0 0', fontSize: '0.7rem', color: std.severity === 'danger' ? '#ef4444' : '#f59e0b', fontWeight: 800 }}>
                                {std.reason}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <button
                              onClick={() => setSelectedReportStudent(std)}
                              style={{
                                padding: '0.35rem 0.65rem', borderRadius: '0.5rem',
                                background: 'linear-gradient(135deg,#0284c7,#0369a1)',
                                border: 'none', color: 'white', fontWeight: 900, fontSize: '0.7rem',
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3
                              }}
                              title="Öğrencinin Karnesini & Gelişim Raporunu Aç"
                            >
                              <BarChart3 size={11} /> Karne
                            </button>
                            <button
                              onClick={() => handleLaunchAiForTopic('Genel Telafi', 'Matematik')}
                              style={{
                                padding: '0.35rem 0.65rem', borderRadius: '0.5rem',
                                background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                                border: 'none', color: 'white', fontWeight: 900, fontSize: '0.7rem',
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3
                              }}
                              title="Yapay Zeka ile Hızlı Telafi Testi Üret"
                            >
                              <Sparkles size={11} /> Telafi
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ⚡ 2. SON AKTİVİTELER (CANLI SINAV & ÇÖZÜM AKIŞI) */}
                <div className="overview-card-box">
                  <div className="overview-card-header">
                    <h3>
                      <Activity size={18} color="#10b981" /> ⚡ Son Çözülen Sınavlar &amp; Aktiviteler
                    </h3>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>{recentSubs.length} kayıt</span>
                  </div>
                  {recentSubs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                      <Activity size={32} style={{ margin: '0 auto 0.4rem', opacity: 0.3 }} />
                      <p style={{ margin: 0, fontWeight: 700 }}>Henüz çözülen sınav yok</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {recentSubs.map((sub, i) => {
                        const student = users.find(u => u.id === sub.studentId);
                        const scorePct = getSubmissionScorePct(sub);
                        const good = scorePct !== null && scorePct >= 70;
                        const si = students.findIndex(s => s.id === sub.studentId);
                        const correct = sub.correctCount ?? sub.correct;
                        const wrong = sub.wrongCount ?? sub.wrong;
                        const hasDetails = correct !== undefined && wrong !== undefined;
                        const net = sub.score !== undefined && sub.scorePercentage !== undefined ? sub.score : sub.net;
                        return (
                          <div
                            key={sub.id || i}
                            onClick={() => student && setSelectedReportStudent(student)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.75rem',
                              padding: '0.6rem 0.85rem', borderRadius: '0.8rem',
                              background: good ? 'rgba(16, 185, 129, 0.08)' : scorePct !== null ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-surface-hover)',
                              border: `1px solid ${good ? 'rgba(16, 185, 129, 0.25)' : scorePct !== null ? 'rgba(239, 68, 68, 0.25)' : 'var(--color-border)'}`,
                              cursor: 'pointer',
                              transition: 'transform 0.15s ease'
                            }}
                            title="Öğrencinin Karnesini & Gelişim Raporunu Aç"
                          >
                            <Avatar name={student?.name} index={si >= 0 ? si : i} size={32} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: '0.84rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {student?.name || 'Öğrenci'}
                              </p>
                              <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {sub.testTitle || 'Sınav'} · {timeAgo(sub.submittedAt)}
                                {hasDetails && <span style={{ marginLeft: 6, color: 'var(--color-text-muted)' }}>({correct}D {wrong}Y{net !== undefined ? ` · ${net} Net` : ''})</span>}
                              </p>
                            </div>
                            {scorePct !== null ? (
                              <span style={{
                                fontWeight: 900, fontSize: '0.78rem',
                                padding: '0.15rem 0.55rem', borderRadius: '0.5rem',
                                background: good ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                                color: good ? '#10b981' : '#ef4444', flexShrink: 0,
                                border: `1px solid ${good ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
                              }}>%{scorePct}</span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, flexShrink: 0 }}>—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 🔔 3. GÜNLÜK BİLDİRİM & ONAY MERKEZİ BANNERI */}
                <TeacherActionCenter
                  pendingManualApprovals={pendingManualApprovals}
                  pendingEvaluations={pendingEvaluations}
                  dueHomeworks={dueHomeworks}
                  students={students}
                />

              </div>

              {/* ═══════════════════════════════════════════
                  SAĞ SÜTUN: BRANŞLAR + BEKLEYEN ÖDEVLER + YAKLAŞAN SINAVLAR + SON EKLENENLER
                  ═══════════════════════════════════════════ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* 📚 1. AKTİF DERSLER & BRANŞ BAŞARISI */}
                <div className="overview-card-box">
                  <div className="overview-card-header">
                    <h3>
                      <BookOpen size={18} color="#6366f1" /> 📚 Aktif Dersler &amp; Branş Başarısı
                    </h3>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>{activeSubjects.length} Branş</span>
                  </div>

                  {activeSubjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                      Henüz branş bazlı soru çözümü verisi yok.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {activeSubjects.slice(0, 5).map(subj => {
                        const sc = subj.theme;
                        return (
                          <div key={subj.name} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '0.45rem 0.65rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 900, color: sc.accent || '#6366f1' }}>{subj.name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem' }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>{subj.questions} Soru</span>
                                <span style={{ fontWeight: 900, color: subj.avgScore >= 70 ? '#10b981' : subj.avgScore >= 45 ? '#f59e0b' : '#ef4444' }}>%{subj.avgScore}</span>
                              </div>
                            </div>
                            <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${subj.avgScore}%`, background: subj.avgScore >= 70 ? '#10b981' : '#f59e0b', borderRadius: 4, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 📝 2. BEKLEYEN ÖDEVLER */}
                <div className="overview-card-box">
                  <div className="overview-card-header">
                    <h3>
                      <FileText size={18} color="#f59e0b" /> 📝 Bekleyen &amp; Aktif Ödevler
                    </h3>
                    <button onClick={() => navigate('/homeworks')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Ödevleri Yönet <ChevronRight size={13} />
                    </button>
                  </div>
                  {upcomingHw.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      <Calendar size={30} style={{ margin: '0 auto 0.3rem', opacity: 0.3 }} />
                      <p style={{ margin: 0, fontWeight: 700 }}>Aktif bekleyen ödev yok</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {upcomingHw.slice(0, 3).map((hw) => {
                        const due = new Date(hw.dueDate);
                        const daysLeft = Math.ceil((due - Date.now()) / 86400000);
                        const urgent = daysLeft <= 2;
                        const tIds = hw.targetIds || [];
                        return (
                          <div key={hw.id} style={{
                            borderRadius: '0.75rem', padding: '0.65rem 0.85rem',
                            background: urgent ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-surface-hover)',
                            border: `1.5px solid ${urgent ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem'
                          }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {hw.title}
                              </p>
                              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>👥 {tIds.length || students.length} öğrenciye atandı</span>
                            </div>
                            <span style={{
                              fontSize: '0.65rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 99,
                              background: urgent ? 'rgba(239, 68, 68, 0.18)' : 'rgba(59, 130, 246, 0.15)',
                              color: urgent ? '#ef4444' : '#60a5fa', flexShrink: 0
                            }}>
                              {urgent ? '🔥 ' : ''}{daysLeft <= 0 ? 'Bugün!' : `${daysLeft}g kaldı`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 🧪 3. YAKLAŞAN SINAVLAR */}
                <div className="overview-card-box">
                  <div className="overview-card-header">
                    <h3>
                      <ClipboardCheck size={18} color="#10b981" /> 🧪 Yaklaşan Sınavlar &amp; Denemeler
                    </h3>
                    <button onClick={() => navigate('/physical-exam')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Sınavlar <ChevronRight size={13} />
                    </button>
                  </div>
                  {upcomingExams.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      <ClipboardCheck size={30} style={{ margin: '0 auto 0.3rem', opacity: 0.3 }} />
                      <p style={{ margin: 0, fontWeight: 700 }}>Planlanmış sınav bulunmuyor</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {upcomingExams.map(ex => (
                        <div key={ex.id} style={{ padding: '0.65rem 0.85rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)' }}>{ex.title}</p>
                            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{ex.subject} · {ex.type}</span>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '2px 7px', borderRadius: 99, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            Aktif
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 👥 4. SON EKLENEN ÖĞRENCİLER */}
                <div className="overview-card-box">
                  <div className="overview-card-header">
                    <h3>
                      <Users size={18} color="#0284c7" /> 👥 Son Eklenen Öğrenciler
                    </h3>
                    <button onClick={() => setShowAddStudentModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900, color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      + Yeni Ekle
                    </button>
                  </div>
                  {recentlyAddedStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      Henüz öğrenci kaydı bulunmuyor.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {recentlyAddedStudents.map((std, i) => (
                        <div key={std.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                            <Avatar name={std.name} index={i} size={28} />
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{std.name}</p>
                              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{std.email}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontFamily: 'monospace' }}>
                              🔑 {std.password || '123456'}
                            </span>
                            <button
                              onClick={() => setSelectedReportStudent(std)}
                              style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Karne
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 3: TESTS (TESTLER & SINAVLAR)
            ═══════════════════════════════════════════════════ */}
        {tab === 'tests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* search & filter bar */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.25rem', padding: '1rem 1.25rem',
              display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="text" placeholder="Test adıyla ara..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.9rem 0.6rem 2.4rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <select value={filterSub} onChange={e => setFilterSub(e.target.value)}
                style={{ padding: '0.6rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                <option value="">Tüm Dersler</option>
                {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => { resetForm(); setShowModal(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                  border: 'none', color: 'white', fontWeight: 900, fontSize: '0.82rem',
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.25)'
                }}>
                  <Plus size={15} /> Yeni Test
              </button>
            </div>

            {visibleTests.length === 0 ? (
              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px dashed var(--color-border-input)',
                borderRadius: '1.25rem', padding: '3rem 1.5rem', textAlign: 'center',
                color: 'var(--color-text-muted)', fontWeight: 700
              }}>
                <FileText size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ margin: 0 }}>Arama kriterlerine uygun test bulunamadı.</p>
              </div>
            ) : (
              <div className="teacher-tests-grid">
                {visibleTests.map(test => {
                  const sc = getSubjectTheme(test.subject);
                  return (
                    <div key={test.id} style={{
                      background: 'var(--color-surface)',
                      border: `1.5px solid ${sc.darkBorder || 'var(--color-border)'}`,
                      borderRadius: '1.25rem', padding: '1.15rem',
                      display: 'flex', flexDirection: 'column', gap: '0.75rem',
                      boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
                      transition: 'transform 0.15s ease'
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: 99, background: sc.darkBg || 'rgba(99, 102, 241, 0.15)', color: sc.accent || '#6366f1', border: `1px solid ${sc.darkBorder || 'rgba(99, 102, 241, 0.3)'}`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {test.subject}
                        </span>
                        <button onClick={() => openEdit(test)} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: '0.5rem', padding: '0.35rem', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                          <Edit2 size={13} />
                        </button>
                      </div>
                      <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: 'var(--color-text)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {test.title}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={13} color="#6366f1" />{test.questions || 0} Soru</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} color="#f59e0b" />{test.time || 0} dk</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} color="var(--color-text-muted)" />{test.date ? new Date(test.date).toLocaleDateString('tr-TR') : '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 4: STUDENTS (SINIFLAR & ÖĞRENCİ ANALİZ LİSTESİ)
            ═══════════════════════════════════════════════════ */}
        {tab === 'students' && (
          <TeacherClassroomExplorer
            students={students}
            submissions={teacherSubmissions}
            homeworks={teacherHomeworks}
            books={books}
            bookTests={bookTests}
            grades={data?.grades || []}
            coachedIds={coachedIds}
            onUpdateUser={updateUser}
            onOpenEditStudent={openEditStudentModal}
            onSelectStudentReport={(std) => setSelectedReportStudent(std)}
            onToggleCoaching={(stdId) => toggleCoachedStudent(currentUser?.id || 'teacher_1', stdId)}
            onAddStudentClick={() => {
              if (!newStudentGrade && data?.grades?.[0]?.id) setNewStudentGrade(data.grades[0].id);
              setShowAddStudentModal(true);
            }}
          />
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 5: COACHING (BİREYSEL KOÇLUK & TAKİP)
            ═══════════════════════════════════════════════════ */}
        {tab === 'coaching' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.25rem', padding: '1.25rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <h3 style={{ margin: '0 0 0.3rem', fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={18} color="#c084fc" /> Bireysel Koçluk Sistemi Takibi
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Bireysel koçluk takibine almak istediğiniz öğrencileri seçin ve hedeflerini, denemelerini ve gelişim yol haritasını yönetin.
              </p>
            </div>

            <div className="teacher-coaching-grid">
              {students.map((std, i) => {
                const isCoached = coachedIds.includes(std.id);
                return (
                  <div key={std.id} style={{
                    background: 'var(--color-surface)',
                    border: isCoached ? '1.5px solid #8b5cf6' : '1.5px solid var(--color-border)',
                    borderRadius: '1.25rem', padding: '1.25rem',
                    display: 'flex', flexDirection: 'column', gap: '0.85rem',
                    boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Avatar name={std.name} index={i} size={42} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: 'var(--color-text)' }}>{std.name}</h4>
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{std.email}</p>
                      </div>
                      <button
                        onClick={() => toggleCoachedStudent(currentUser?.id || 'teacher_1', std.id)}
                        style={{
                          padding: '0.35rem 0.85rem', borderRadius: 99, border: isCoached ? 'none' : '1px solid var(--color-border-input)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 900,
                          background: isCoached ? 'linear-gradient(135deg,#7c3aed,#6366f1)' : 'var(--color-surface-hover)',
                          color: isCoached ? '#ffffff' : 'var(--color-text-muted)',
                          boxShadow: isCoached ? '0 2px 10px rgba(124,58,237,0.3)' : 'none',
                          flexShrink: 0
                        }}>
                        {isCoached ? '✓ Koçlukta' : '+ Ekle'}
                      </button>
                    </div>
                    <Link to={`/coaching/${std.id}`} style={{ textDecoration: 'none' }}>
                      <button style={{
                        width: '100%', padding: '0.65rem', borderRadius: '0.75rem',
                        background: isCoached ? 'rgba(139, 92, 246, 0.15)' : 'var(--color-surface-hover)',
                        border: `1.5px solid ${isCoached ? 'rgba(139, 92, 246, 0.3)' : 'var(--color-border)'}`,
                        color: isCoached ? '#c084fc' : 'var(--color-text-muted)',
                        fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                      }}>
                        <Map size={15} /> Yol Haritası & Koçluk Paneli <ArrowUpRight size={14} />
                      </button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ══════════ MODAL: AI QUESTION GENERATOR FOR REMEDIAL TESTS ══════════ */}
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

      {/* ══════════ MODAL: ÖĞRENCİ HIZLI KARNE & VELİ RAPORU ══════════ */}
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
          onEditStudent={(std) => openEditStudentModal(std)}
          onClose={() => setSelectedReportStudent(null)}
        />
      )}

      {/* ══════════ MODAL: TEST OLUŞTUR / DÜZENLE ══════════ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-modal-overlay)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1.5rem', width: '100%', maxWidth: 540, padding: '1.75rem',
            border: '1.5px solid var(--color-border)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
            maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem',
            color: 'var(--color-text)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="#6366f1" />
                {editingTestId ? 'Testi Düzenle' : 'Yeni Test Oluştur'}
              </h3>
              <button onClick={resetForm} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Test Adı *</label>
                <input type="text" required placeholder="Örn: 8. Sınıf Üslü Sayılar Genel Tarama" value={testName} onChange={e => setTestName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Soru Başı Süre (dk)</label>
                  <input type="number" min="1" value={timePerQ} onChange={e => setTimePerQ(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Sınıf</label>
                  <select value={selGrade} onChange={e => { setSelGrade(e.target.value); setSelSubject(''); setSelUnit(''); setSelTopic(''); setSelQIds([]); }}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                    <option value="">Sınıf Seçiniz</option>
                    <option value="all">Tüm Sınıflar</option>
                    {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              {selGrade && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Ders</label>
                  <select value={selSubject} onChange={e => { setSelSubject(e.target.value); setSelUnit(''); setSelTopic(''); setSelQIds([]); }}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                    <option value="">Ders Seçiniz</option>
                    <option value="all">Tüm Dersler</option>
                    {filtSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {selSubject && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Ünite</label>
                  <select value={selUnit} onChange={e => { setSelUnit(e.target.value); setSelTopic(''); setSelQIds([]); }}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                    <option value="">Ünite Seçiniz</option>
                    <option value="all">Tüm Üniteler</option>
                    {filtUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              {selUnit && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Konu</label>
                  <select value={selTopic} onChange={e => { setSelTopic(e.target.value); setSelQIds([]); }}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                    <option value="">Konu Seçiniz</option>
                    <option value="all">Tüm Konular</option>
                    {filtTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              {catId && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', margin: 0 }}>Soru Havuzu ({poolQs.length} soru)</label>
                    <button type="button" onClick={() => setSelQIds(selQIds.length === poolQs.length ? [] : poolQs.map(q => q.id))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: '#6366f1' }}>
                      {selQIds.length === poolQs.length ? 'Seçimleri Kaldır' : 'Tümünü Seç'}
                    </button>
                  </div>
                  {poolQs.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.78rem', padding: '1rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', margin: 0 }}>
                      Bu kategoride henüz soru eklenmemiş.
                    </p>
                  ) : (
                    <div style={{ maxHeight: 180, overflowY: 'auto', background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.5rem' }}>
                      {poolQs.map(q => (
                        <label key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>
                          <input type="checkbox" checked={selQIds.includes(q.id)} onChange={() => toggleQ(q.id)} style={{ accentColor: '#6366f1' }} />
                          {q.title || q.name || 'Soru'}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button type="submit" disabled={selQIds.length === 0} style={{
                padding: '0.75rem', borderRadius: '0.75rem',
                background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                border: 'none', color: 'white', fontWeight: 900, fontSize: '0.85rem',
                opacity: selQIds.length === 0 ? 0.4 : 1,
                cursor: selQIds.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(99,102,241,0.3)', width: '100%',
              }}>
                {editingTestId ? 'Testi Güncelle' : `Test Oluştur (${selQIds.length} Soru Seçildi)`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: ÖĞRENCİ EKLE ══════════ */}
      {showAddStudentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-modal-overlay)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1.5rem', width: '100%', maxWidth: 460, padding: '1.75rem',
            border: '1.5px solid var(--color-border)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
            maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem',
            color: 'var(--color-text)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} color="#10b981" />
                Sınıfıma Öğrenci Ekle
              </h3>
              <button onClick={() => setShowAddStudentModal(false)} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Quick link unassigned student */}
            {(() => {
              const unassigned = (users || []).filter(u => u.role === 'student' && !u.teacherId);
              if (!unassigned.length) return null;
              return (
                <div style={{ background: 'rgba(2, 132, 199, 0.15)', borderRadius: '0.85rem', border: '1.5px solid rgba(2, 132, 199, 0.3)', padding: '0.85rem', marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 4 }}>💡 Sahipsiz Öğrenci Bağla</label>
                  <select defaultValue="" onChange={async (e) => {
                    if (!e.target.value) return;
                    const s = unassigned.find(x => x.id === e.target.value);
                    if (s) { await updateUser(s.id, { teacherId: currentUser.id }); setShowAddStudentModal(false); alert(`🎉 ${s.name} sınıfınıza bağlandı!`); }
                  }} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1px solid rgba(2, 132, 199, 0.4)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}>
                    <option value="">Öğrenci seçin...</option>
                    {unassigned.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                  </select>
                </div>
              );
            })()}

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newStudentName) return;
              await addStudentForTeacher({ name: newStudentName, email: newStudentEmail || `ogrenci_${Date.now()}@etest.com`, password: newStudentPassword || '123456', gradeId: newStudentGrade }, currentUser.id);
              setNewStudentName(''); setNewStudentEmail(''); setNewStudentPassword('123456');
              setShowAddStudentModal(false);
              alert('🎉 Öğrenci başarıyla eklendi!');
            }} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Öğrenci Adı Soyadı *</label>
                <input type="text" required placeholder="Örn: Ahmet Yılmaz" value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>E-Posta / Kullanıcı Adı (opsiyonel)</label>
                <input type="text" placeholder="Örn: ahmet veya ahmet@gmail.com" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Giriş Şifresi *</label>
                <input type="text" required placeholder="Örn: 123456" value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 900, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Sınıf Seviyesi</label>
                <select value={newStudentGrade} onChange={e => setNewStudentGrade(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                  {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddStudentModal(false)}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}>
                  İptal
                </button>
                <button type="submit" style={{ flex: 1, padding: '0.65rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                  💾 Kaydet & Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: ÖĞRENCİ DÜZENLE ══════════ */}
      {editingStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-modal-overlay)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1.5rem', width: '100%', maxWidth: 460, padding: '1.75rem',
            border: '1.5px solid var(--color-border)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
            maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem',
            color: 'var(--color-text)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={18} color="#6366f1" />
                Öğrenci Bilgilerini Düzenle
              </h3>
              <button onClick={() => setEditingStudent(null)} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!editingStudent || !editStudentName) return;
              let cleanEmail = editStudentEmail.trim().toLowerCase();
              if (!cleanEmail) cleanEmail = editingStudent.email;
              const gObj = data?.grades?.find(g => String(g.id) === String(editStudentGrade));
              const gName = gObj ? gObj.name : editStudentGrade;
              await updateUser(editingStudent.id, { name: editStudentName, email: cleanEmail, password: editStudentPassword || '123456', gradeId: editStudentGrade, classId: editStudentGrade, grade: gName });
              setEditingStudent(null);
              alert('🎉 Öğrenci bilgileri güncellendi!');
            }} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Öğrenci Adı Soyadı *</label>
                <input type="text" required value={editStudentName} onChange={e => setEditStudentName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>E-Posta / Kullanıcı Adı</label>
                <input type="text" value={editStudentEmail} onChange={e => setEditStudentEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Giriş Şifresi *</label>
                <input type="text" required value={editStudentPassword} onChange={e => setEditStudentPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 900, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: 4 }}>Sınıf Seviyesi</label>
                <select value={editStudentGrade} onChange={e => setEditStudentGrade(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                  {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditingStudent(null)}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}>
                  İptal
                </button>
                <button type="submit" style={{ flex: 1, padding: '0.65rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#4f46e5,#6366f1)', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                  💾 Güncelle & Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
