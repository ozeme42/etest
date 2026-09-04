import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, X, Edit2, Users, BookOpen, ClipboardCheck,
  Search, BarChart3, TrendingUp, UserPlus, CheckCircle2,
  AlertCircle, Scissors, Sparkles, Map, Bell, ArrowRight
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { getAvatarBg } from '../config/subjectThemes';
import { timeAgo } from '../utils/dateHelpers';
import { toUUID } from '../services/supabaseService';
import TeacherClassAnalytics from '../components/teacher/TeacherClassAnalytics';
import SmartPullToRefresh from '../components/common/SmartPullToRefresh';
import AiQuestionGeneratorModal from '../components/question-bank/AiQuestionGeneratorModal';
import TeacherStudentQuickReportModal from '../components/teacher/TeacherStudentQuickReportModal';
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
  const { toggleCoachedStudent, getCoachedStudentIds, mockExams = [] } = useCoaching();
  const navigate = useNavigate();

  /* ── State ── */
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'submissions' | 'homeworks' | 'analytics'
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

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchQuery = !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase());
      const matchGrade = !selectedGradeFilter || String(s.grade || s.gradeId) === String(selectedGradeFilter);
      return matchQuery && matchGrade;
    });
  }, [students, studentSearch, selectedGradeFilter]);

  // Recent Solved Submissions
  const recentSubmissions = useMemo(() => {
    return [...teacherSubmissions].sort((a, b) => {
      const tA = new Date(a.submittedAt || a.createdAt || a.date || 0).getTime();
      const tB = new Date(b.submittedAt || b.createdAt || b.date || 0).getTime();
      return tB - tA;
    }).slice(0, 25);
  }, [teacherSubmissions]);

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
              SEKME 2: SON ÇÖZÜLEN SINAVLAR (CANLI AKIŞ)
              ═══════════════════════════════════════════════════ */}
          {activeTab === 'submissions' && (
            <div className="teacher-simple-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Son Tamamlanan Sınavlar</h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Öğrencilerin çözdüğü son testler ve anlık başarı durumları
                  </p>
                </div>
                <span className="teacher-badge-pill">{recentSubmissions.length} Sınav Çözümü</span>
              </div>

              {recentSubmissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                  Henüz çözülmüş bir sınav veya test kaydı bulunmuyor.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="teacher-simple-table">
                    <thead>
                      <tr>
                        <th>Öğrenci</th>
                        <th>Sınav / Test Adı</th>
                        <th>Doğru / Yanlış / Boş</th>
                        <th>Başarı</th>
                        <th>Zaman</th>
                        <th style={{ textAlign: 'right' }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSubmissions.map((sub, idx) => {
                        const std = students.find(s => s.id === sub.studentId) || { name: sub.studentName || 'Öğrenci' };
                        const c = Number(sub.correctCount ?? sub.correct ?? 0);
                        const w = Number(sub.wrongCount ?? sub.wrong ?? 0);
                        const b = Number(sub.emptyCount ?? sub.blankCount ?? 0);
                        const score = getSubmissionScorePct(sub);
                        const subDate = sub.submittedAt || sub.createdAt || sub.date;

                        return (
                          <tr key={sub.id || idx}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <StudentAvatar name={std.name} index={idx} size={30} />
                                <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>{std.name}</span>
                              </div>
                            </td>
                            <td>
                              <div>
                                <strong style={{ color: 'var(--color-text)' }}>
                                  {sub.title || sub.testName || sub.bookTitle || 'Test'}
                                </strong>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
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
                                color: score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'
                              }}>
                                %{score}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {timeAgo(subDate)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => setSelectedReportStudent(std)}
                                className="btn-secondary-action"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.74rem' }}
                              >
                                Karne Aç
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
                        const subCount = teacherSubmissions.filter(s => s.homework_id === hw.id || s.testId === hw.id).length;
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
                              <strong>{subCount}</strong> teslim
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
