import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, X, Edit2, Users, BookOpen, ClipboardCheck,
  Clock, ChevronRight, FileText, Activity, GraduationCap,
  Search, Calendar, Layers, BarChart3, TrendingUp, Target,
  UserCheck, Sparkles, UserPlus, Eye, CheckCircle2, Flame,
  BookMarked, Star, Award, Zap, ArrowRight, Bell, Map, Key,
  Check, Trash2, ArrowUpRight, ShieldAlert, School, ShieldCheck, Clock3
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { getAvatarBg, getSubjectTheme } from '../config/subjectThemes';
import { timeAgo } from '../utils/dateHelpers';
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
  const { questions }                   = useQuestionBank();
  const { homeworks = [] }              = useHomework();
  const { submissions = [] }            = useEvaluation();
  const { users = [], addStudentForTeacher, updateUser } = useUser();
  const { currentUser }                 = useAuth();
  const { toggleCoachedStudent, getCoachedStudentIds } = useCoaching();
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

  const tabs = [
    { id: 'overview',  label: 'Genel Bakış', icon: Activity },
    { id: 'tests',     label: 'Testler & Sınavlar', icon: FileText, badge: visibleTests.length },
    { id: 'students',  label: 'Sınıfım & Öğrenciler', icon: Users, badge: students.length },
    { id: 'coaching',  label: 'Koçluk & Takip', icon: Target },
  ];

  const pendingManualApprovals = useMemo(() => {
    return (submissions || []).filter(sub => {
      if (!sub.isManual && sub.sourceType !== 'manual_test') return false;
      const isPending = sub.approvalStatus === 'pending' || sub.status === 'pending_approval' || (sub.isApproved === false && sub.approvalStatus !== 'rejected');
      if (!isPending) return false;
      if (currentUser?.role === 'admin') return true;
      return teacherStudentIds.includes(String(sub.studentId)) || teacherStudentIds.includes(String(toUUID(sub.studentId)));
    });
  }, [submissions, teacherStudentIds, currentUser]);

  const quickActions = [
    { icon: UserPlus,  label: 'Öğrenci Ekle',   sub: 'Hızlı sınıf kaydı',       grad: 'linear-gradient(135deg,#059669,#10b981)', shadow: '0 6px 20px rgba(16,185,129,0.35)',  onClick: () => setShowAddStudentModal(true) },
    { icon: Plus,      label: 'Test Oluştur',    sub: 'Soru bankasından test',   grad: 'linear-gradient(135deg,#4f46e5,#6366f1)', shadow: '0 6px 20px rgba(99,102,241,0.35)',  onClick: () => { resetForm(); setShowModal(true); } },
    { icon: ShieldCheck, label: 'Onay Merkezi',  sub: pendingManualApprovals.length > 0 ? `⏳ ${pendingManualApprovals.length} test bekliyor` : 'Manuel test & onaylar', grad: 'linear-gradient(135deg,#7c3aed,#a855f7)', shadow: '0 6px 20px rgba(124,58,237,0.35)', onClick: () => navigate('/approvals') },
    { icon: BookOpen,  label: 'Ödev Ver',         sub: 'Öğrencilere ödev ata',    grad: 'linear-gradient(135deg,#d97706,#f59e0b)', shadow: '0 6px 20px rgba(245,158,11,0.35)',  onClick: () => navigate('/homeworks') },
    { icon: Layers,    label: 'Soru Bankası',     sub: 'Sorularını yönet',        grad: 'linear-gradient(135deg,#0284c7,#0369a1)', shadow: '0 6px 20px rgba(2,132,199,0.35)', onClick: () => navigate('/questions') },
    { icon: BarChart3, label: 'İstatistikler',    sub: 'Analiz & raporlar',       grad: 'linear-gradient(135deg,#e11d48,#f43f5e)', shadow: '0 6px 20px rgba(244,63,94,0.35)',  onClick: () => navigate('/statistics') },
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

        {/* ══════════ TOP HERO HEADER ══════════ */}
        <div className="teacher-hero-header">
          <div className="teacher-profile-group">
            <div className="teacher-avatar-icon" style={{ background: '#4f46e5' }}>
              <GraduationCap size={26} color="#fff" />
            </div>
            <div className="teacher-info-text">
              <div className="teacher-badge-row">
                <span className="teacher-badge-label" style={{ color: 'var(--color-text-muted)' }}>Öğretmen Paneli</span>
                <span className="teacher-pro-pill" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>PRO DESK</span>
              </div>
              <h1 style={{ color: 'var(--color-text)' }}>{currentUser?.name || 'Öğretmen'}</h1>
            </div>
          </div>

          <div className="teacher-header-actions">
            <button
              onClick={() => { if (!newStudentGrade && data?.grades?.[0]?.id) setNewStudentGrade(data.grades[0].id); setShowAddStudentModal(true); }}
              className="btn-header-add-student" style={{ background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)' }}
            >
              <UserPlus size={15} /> Öğrenci Ekle
            </button>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="btn-header-create-test" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#ffffff' }}
            >
              <Plus size={15} /> Test Oluştur
            </button>
          </div>
        </div>

        {/* ══════════ PENDING MANUAL TEST APPROVALS BANNER ══════════ */}
        {pendingManualApprovals.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(99, 102, 241, 0.12))',
            border: '1.5px solid rgba(168, 85, 247, 0.35)',
            borderRadius: '1.25rem',
            padding: '1rem 1.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 16px -2px rgba(124, 58, 237, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
              }}>
                <Clock3 size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                  {pendingManualApprovals.length} Adet Manuel Test Onayınızı Bekliyor!
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Öğrencilerinizin eklediği test sonuçlarını onaylayarak istatistiklerine yansımasını sağlayın.
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/approvals')}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
              }}
            >
              <span>Onay Merkezi'ne Git</span>
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* ══════════ 4 TOP KPI METRIC CARDS ══════════ */}
        <div className="teacher-stats-grid">
          <StatHeroCard icon={Users}          label="Sınıfımdaki Öğrenciler" value={`${students.length} Öğrenci`} sub="Aktif sınıf kaydı" color="#38bdf8" bg="rgba(2, 132, 199, 0.15)" border="rgba(2, 132, 199, 0.3)" />
          <StatHeroCard icon={BookOpen}       label="Verilen Ödevler"        value={`${teacherHomeworks.length} Ödev`} sub="Atanan ödevler" color="#fbbf24" bg="rgba(217, 119, 6, 0.15)" border="rgba(217, 119, 6, 0.3)" />
          <StatHeroCard icon={ClipboardCheck} label="Çözülen Sınavlar"       value={`${teacherSubmissions.length} Kağıt`} sub="Öğrenci yanıtı" color="#4ade80" bg="rgba(22, 163, 74, 0.15)" border="rgba(22, 163, 74, 0.3)" />
          <StatHeroCard icon={Layers}         label="Soru Bankası"           value={`${teacherQuestions.length} Soru`} sub="Eklediğiniz sorular" color="#c084fc" bg="rgba(124, 58, 237, 0.15)" border="rgba(124, 58, 237, 0.3)" />
        </div>

        {/* ══════════ QUICK ACTIONS GRID ══════════ */}
        <section className="teacher-quick-actions-grid">
          {quickActions.map(qa => (
            <QuickAction key={qa.label} {...qa} />
          ))}
        </section>

        {/* ══════════ TAB BAR ══════════ */}
        <div className="teacher-tab-bar custom-scrollbar">
          {tabs.map(t => (
            <PillTab key={t.id} {...t} active={tab === t.id} onClick={setTab} />
          ))}
        </div>

        {/* ══════════ TAB: OVERVIEW ══════════ */}
        {tab === 'overview' && (
          <div className="teacher-overview-grid">

            {/* Recent Activity */}
            <div className="overview-card-box">
              <div className="overview-card-header">
                <h3>
                  <Activity size={18} color="#10b981" /> Son Öğrenci Aktiviteleri
                </h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>{recentSubs.length} kayıt</span>
              </div>
              {recentSubs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                  <Activity size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>Henüz çözülen sınav yok</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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
                      <div key={sub.id || i} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.65rem 0.9rem', borderRadius: '0.85rem',
                        background: good ? 'rgba(16, 185, 129, 0.12)' : scorePct !== null ? 'rgba(239, 68, 68, 0.12)' : 'var(--color-surface-hover)',
                        border: `1px solid ${good ? 'rgba(16, 185, 129, 0.3)' : scorePct !== null ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
                      }}>
                        <Avatar name={student?.name} index={si >= 0 ? si : i} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {student?.name || 'Öğrenci'}
                          </p>
                          <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sub.testTitle || 'Sınav'} · {timeAgo(sub.submittedAt)}
                            {hasDetails && <span style={{ marginLeft: 6, color: 'var(--color-text-muted)' }}>({correct}D {wrong}Y{net !== undefined ? ` · ${net} Net` : ''})</span>}
                          </p>
                        </div>
                        {scorePct !== null ? (
                          <span style={{
                            fontWeight: 900, fontSize: '0.8rem',
                            padding: '0.2rem 0.6rem', borderRadius: '0.5rem',
                            background: good ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: good ? '#10b981' : '#ef4444', flexShrink: 0,
                            border: `1px solid ${good ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                          }}>%{scorePct}</span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, flexShrink: 0 }}>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Student Leaderboard */}
            <div className="overview-card-box">
              <div className="overview-card-header">
                <h3>
                  <Award size={18} color="#f59e0b" /> Öğrenci Başarı Sıralaması
                </h3>
                <button onClick={() => setTab('students')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Tümü <ChevronRight size={13} />
                </button>
              </div>
              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                  <Users size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>Henüz öğrenci yok</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {leaderboard.slice(0, 7).map((std, rank) => (
                    <div key={std.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        background: rank === 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                          : rank === 1 ? 'linear-gradient(135deg,#94a3b8,#64748b)'
                          : rank === 2 ? 'linear-gradient(135deg,#f97316,#ea580c)'
                          : 'var(--color-surface-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.68rem', fontWeight: 900,
                        color: rank < 3 ? '#fff' : 'var(--color-text-muted)',
                      }}>{rank + 1}</div>
                      <Avatar name={std.name} index={std.idx} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{std.name}</p>
                        <ScoreBar value={std.avg} />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, flexShrink: 0 }}>{std.count} sınav</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Homeworks */}
            <div className="overview-card-box" style={{ gridColumn: '1 / -1' }}>
              <div className="overview-card-header">
                <h3>
                  <Calendar size={18} color="#6366f1" /> Yaklaşan Ödev Teslimleri
                </h3>
                <button onClick={() => navigate('/homeworks')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Tüm Ödevler <ChevronRight size={13} />
                </button>
              </div>
              {upcomingHw.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                  <Calendar size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>Yaklaşan ödev teslimi yok. <button onClick={() => navigate('/homeworks')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 800 }}>Ödev oluştur →</button></p>
                </div>
              ) : (
                <div className="teacher-hw-grid">
                  {upcomingHw.map((hw) => {
                    const due = new Date(hw.dueDate);
                    const daysLeft = Math.ceil((due - Date.now()) / 86400000);
                    const urgent = daysLeft <= 2;
                    const tIds = hw.targetIds || [];
                    return (
                      <div key={hw.id} style={{
                        borderRadius: '1rem', padding: '1rem',
                        background: urgent ? 'rgba(239, 68, 68, 0.12)' : 'var(--color-surface-hover)',
                        border: `1.5px solid ${urgent ? 'rgba(239, 68, 68, 0.35)' : 'var(--color-border)'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: 99,
                            background: urgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                            color: urgent ? '#ef4444' : '#60a5fa',
                            border: `1px solid ${urgent ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`
                          }}>
                            {urgent ? '🔥 ' : ''}{daysLeft <= 0 ? 'Bugün!' : `${daysLeft}g kaldı`}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                            👥 {tIds.length} öğrenci
                          </span>
                        </div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {hw.title}
                        </p>
                        <p style={{ margin: '0.4rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                          Son: {due.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Grade Distribution */}
            {data.grades.length > 0 && (
              <div className="overview-card-box" style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <GraduationCap size={18} color="#6366f1" /> Sınıf Bazında Öğrenci Dağılımı
                </h3>
                <div className="teacher-grades-grid">
                  {data.grades.map((grade, gi) => {
                    const count = students.filter(s =>
                      String(s.gradeId) === String(grade.id) || s.gradeId === grade.name ||
                      String(s.classId) === String(grade.id) || s.grade === grade.name || s.className === grade.name
                    ).length;
                    const pct = students.length ? Math.round((count / students.length) * 100) : 0;
                    const GRADE_COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#14b8a6','#f97316','#8b5cf6','#0ea5e9'];
                    const gc = GRADE_COLORS[gi % GRADE_COLORS.length];
                    return (
                      <div key={grade.id} style={{ background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '1.8rem', fontWeight: 900, color: gc, margin: 0, lineHeight: 1 }}>{count}</p>
                        <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)', margin: '0.35rem 0' }}>{grade.name}</p>
                        <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 9, overflow: 'hidden', marginTop: '0.5rem' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: gc, borderRadius: 9, transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>%{pct}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB: TESTS ══════════ */}
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

        {/* ══════════ TAB: STUDENTS ══════════ */}
        {/* ══════════ TAB: STUDENTS ══════════ */}
        {tab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.25rem', padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="#6366f1" /> Sınıfım & Öğrenci Listesi
                <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: 99, background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)' }}>{students.length} Öğrenci</span>
              </h3>
              <button
                onClick={() => { if (!newStudentGrade && data?.grades?.[0]?.id) setNewStudentGrade(data.grades[0].id); setShowAddStudentModal(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.55rem 1.15rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg,#059669,#10b981)',
                  border: 'none', color: 'white', fontWeight: 900, fontSize: '0.8rem',
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.25)'
                }}
              >
                <UserPlus size={15} /> Öğrenci Ekle
              </button>
            </div>

            {students.length === 0 ? (
              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px dashed var(--color-border-input)',
                borderRadius: '1.25rem', padding: '3.5rem 1.5rem', textAlign: 'center',
                color: 'var(--color-text-muted)'
              }}>
                <Users size={44} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ fontWeight: 700, margin: '0 0 1rem', color: 'var(--color-text)' }}>Henüz sınıfınıza öğrenci eklemediniz.</p>
                <button onClick={() => setShowAddStudentModal(true)} style={{
                  padding: '0.65rem 1.35rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg,#059669,#10b981)',
                  border: 'none', color: 'white', fontWeight: 900, fontSize: '0.82rem',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                }}>
                  <UserPlus size={15} /> İlk Öğrenciyi Ekle
                </button>
              </div>
            ) : (
              <>
                {/* ── 1. DESKTOP TABLE VIEW ── */}
                <div className="teacher-students-desktop-table" style={{
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: '1.25rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
                  overflowX: 'auto', padding: 0
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
                        <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Öğrenci</th>
                        <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Sınıfı</th>
                        <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>E-Posta / Kullanıcı Adı</th>
                        <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Giriş Şifresi</th>
                        <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Çözülen Sınav</th>
                        <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Koçluk</th>
                        <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, i) => {
                        const solved = submissions.filter(s => s.studentId === student.id).length;
                        const isCoached = coachedIds.includes(student.id);
                        const gObj = data?.grades?.find(g => String(g.id) === String(student.gradeId) || String(g.id) === String(student.classId))
                                  || data?.grades?.find(g => g.name === student.gradeId || g.name === student.grade || g.name === student.className);
                        return (
                          <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <Avatar name={student.name} index={i} size={34} />
                                <span style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.88rem' }}>{student.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <select
                                value={gObj ? gObj.id : (student.gradeId || '')}
                                onChange={async (e) => {
                                  const gId = e.target.value;
                                  const gName = data?.grades?.find(g => String(g.id) === String(gId))?.name || gId;
                                  await updateUser(student.id, { gradeId: gId, classId: gId, grade: gName, className: gName });
                                }}
                                style={{ padding: '0.35rem 0.6rem', borderRadius: '0.55rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', outline: 'none' }}
                              >
                                <option value="">— Sınıf Seçiniz</option>
                                {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>{student.email}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.45rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Key size={11} /> {student.password || '123456'}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 900, color: solved > 0 ? '#10b981' : 'var(--color-text-muted)', fontSize: '0.88rem' }}>{solved}</td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                              {isCoached ? (
                                <span style={{ padding: '0.2rem 0.65rem', borderRadius: 99, background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)', fontWeight: 800, fontSize: '0.7rem' }}>🎯 Koçlukta</span>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Link to={`/coaching/${student.id}`} style={{ textDecoration: 'none' }}>
                                  <button
                                    style={{
                                      background: 'rgba(139, 92, 246, 0.15)',
                                      border: '1.5px solid rgba(139, 92, 246, 0.3)',
                                      borderRadius: '0.6rem', padding: '0.4rem 0.75rem', cursor: 'pointer',
                                      fontWeight: 800, fontSize: '0.75rem', color: '#c084fc',
                                      display: 'inline-flex', alignItems: 'center', gap: 4
                                    }}
                                  >
                                    <Calendar size={13} /> Program &amp; Koçluk
                                  </button>
                                </Link>
                                <button
                                  onClick={() => openEditStudentModal(student)}
                                  style={{
                                    background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
                                    borderRadius: '0.6rem', padding: '0.4rem 0.75rem', cursor: 'pointer',
                                    fontWeight: 800, fontSize: '0.75rem', color: 'var(--color-text)',
                                    display: 'inline-flex', alignItems: 'center', gap: 4
                                  }}
                                >
                                  <Edit2 size={12} /> Düzenle
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── 2. MOBILE CARD VIEW (SUPER SLEEK ON PHONES) ── */}
                <div className="teacher-students-mobile-list">
                  {students.map((student, i) => {
                    const solved = submissions.filter(s => s.studentId === student.id).length;
                    const isCoached = coachedIds.includes(student.id);
                    const gObj = data?.grades?.find(g => String(g.id) === String(student.gradeId) || String(g.id) === String(student.classId))
                              || data?.grades?.find(g => g.name === student.gradeId || g.name === student.grade || g.name === student.className);
                    return (
                      <div key={student.id} className="student-mobile-card">
                        <div className="student-mobile-top-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                            <Avatar name={student.name} index={i} size={40} />
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {student.name}
                              </h4>
                              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {student.email}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => openEditStudentModal(student)}
                            style={{
                              background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
                              borderRadius: '0.65rem', padding: '0.4rem 0.75rem', cursor: 'pointer',
                              fontWeight: 800, fontSize: '0.75rem', color: 'var(--color-text)',
                              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
                            }}
                          >
                            <Edit2 size={12} /> Düzenle
                          </button>
                        </div>

                        {/* Meta Grid */}
                        <div className="student-mobile-meta-grid">
                          <div className="student-meta-item">
                            <span className="student-meta-label">Sınıfı</span>
                            <select
                              value={gObj ? gObj.id : (student.gradeId || '')}
                              onChange={async (e) => {
                                const gId = e.target.value;
                                const gName = data?.grades?.find(g => String(g.id) === String(gId))?.name || gId;
                                await updateUser(student.id, { gradeId: gId, classId: gId, grade: gName, className: gName });
                              }}
                              style={{ padding: '0.3rem 0.5rem', borderRadius: '0.5rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', outline: 'none', width: '100%' }}
                            >
                              <option value="">— Seçiniz</option>
                              {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          </div>

                          <div className="student-meta-item">
                            <span className="student-meta-label">Giriş Şifresi</span>
                            <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.45rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                              <Key size={11} /> {student.password || '123456'}
                            </span>
                          </div>

                          <div className="student-meta-item">
                            <span className="student-meta-label">Çözülen Sınav</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: solved > 0 ? '#10b981' : 'var(--color-text-muted)' }}>
                              {solved} adet
                            </span>
                          </div>

                          <div className="student-meta-item">
                            <span className="student-meta-label">Koçluk Durumu</span>
                            {isCoached ? (
                              <span style={{ padding: '0.15rem 0.55rem', borderRadius: 99, background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)', fontWeight: 900, fontSize: '0.68rem', width: 'fit-content' }}>
                                🎯 Koçlukta
                              </span>
                            ) : (
                              <button
                                onClick={() => toggleCoachedStudent(currentUser?.id || 'teacher_1', student.id)}
                                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-input)', color: 'var(--color-text-muted)', borderRadius: 99, padding: '0.15rem 0.55rem', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer', width: 'fit-content' }}
                              >
                                + Koçluğa Ekle
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Direct Program & Coaching Navigation Button */}
                        <Link to={`/coaching/${student.id}`} style={{ textDecoration: 'none', width: '100%', marginTop: '0.35rem' }}>
                          <button
                            style={{
                              width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem',
                              background: 'rgba(139, 92, 246, 0.15)',
                              border: '1.5px solid rgba(139, 92, 246, 0.3)',
                              color: '#c084fc', fontWeight: 800, fontSize: '0.8rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                              boxShadow: '0 2px 8px rgba(124,58,237,0.08)'
                            }}
                          >
                            <Calendar size={14} /> Haftalık Program &amp; Koçluk Paneli ➔
                          </button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════ TAB: COACHING ══════════ */}
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
