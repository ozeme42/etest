import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, X, Edit2, Users, BookOpen, ClipboardCheck,
  Clock, ChevronRight, FileText, Activity, GraduationCap,
  Search, Calendar, Layers, BarChart3, TrendingUp, Target,
  UserCheck, Sparkles, UserPlus, Eye, CheckCircle2, Flame,
  BookMarked, Star, Award, Zap, ArrowRight, Bell, Map, Key,
  Check, Trash2, ArrowUpRight, ShieldAlert, School
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import './TeacherDashboard.css';

/* ─────────────────────────────────────────
   Helpers & Color Maps
───────────────────────────────────────── */
const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#38bdf8,#0284c7)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#14b8a6,#6366f1)',
];
const avatarBg = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length];

const SUBJECT_COLORS = {
  'Matematik':       { pill: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)', dot: '#38bdf8' },
  'Fen Bilimleri':   { pill: 'rgba(52, 211, 153, 0.15)', text: '#34d399', border: 'rgba(52, 211, 153, 0.35)', dot: '#34d399' },
  'Türkçe':          { pill: 'rgba(251, 146, 60, 0.15)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.35)', dot: '#fb923c' },
  'Sosyal Bilgiler': { pill: 'rgba(192, 132, 252, 0.15)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.35)', dot: '#c084fc' },
  'İngilizce':       { pill: 'rgba(244, 114, 182, 0.15)', text: '#f472b6', border: 'rgba(244, 114, 182, 0.35)', dot: '#f472b6' },
};
const subColor = (s) => SUBJECT_COLORS[s] || { pill: 'rgba(255, 255, 255, 0.08)', text: '#cbd5e1', border: 'rgba(255, 255, 255, 0.15)', dot: '#94a3b8' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 1)  return 'şimdi';
  if (diff < 60) return `${diff}dk önce`;
  const h = Math.floor(diff / 60);
  if (h < 24)    return `${h}s önce`;
  return `${Math.floor(h / 24)}g önce`;
}

function Avatar({ name, index, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarBg(index ?? 0),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 900, fontSize: size * 0.38,
      flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      border: '1.5px solid rgba(255,255,255,0.2)'
    }}>
      {(name || 'Ö').charAt(0).toUpperCase()}
    </div>
  );
}

function StatHeroCard({ label, value, sub, icon: Icon, color, bg, border }) {
  return (
    <div className="stat-hero-card" style={{ borderColor: border || 'rgba(255,255,255,0.14)' }}>
      <div className="stat-hero-icon" style={{ background: bg || 'rgba(99, 102, 241, 0.15)', color: color || '#818cf8' }}>
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
    <button onClick={onClick} className="quick-action-btn" style={{ background: grad, boxShadow: shadow }}>
      <div className="quick-action-icon">
        <Icon size={20} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontWeight: 900, fontSize: '0.88rem', margin: 0, lineHeight: 1.2 }}>{label}</p>
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', margin: '0.15rem 0 0', fontWeight: 600 }}>{sub}</p>
      </div>
      <ChevronRight size={16} style={{ opacity: 0.7, flexShrink: 0 }} />
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
        border: active ? '1.5px solid rgba(165, 180, 252, 0.5)' : '1px solid transparent',
        background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255, 255, 255, 0.06)',
        color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
        fontWeight: 800, fontSize: '0.82rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap', flexShrink: 0,
        boxShadow: active ? '0 4px 18px rgba(99,102,241,0.45)' : 'none',
        transition: 'all 0.18s',
      }}
    >
      <Icon size={16} />
      <span>{label}</span>
      {badge !== undefined && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
          color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
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
      const subs = teacherSubmissions.filter(sub => sub.studentId === s.id && sub.score !== undefined);
      const avg = subs.length ? Math.round(subs.reduce((acc, sub) => acc + sub.score, 0) / subs.length) : 0;
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

  const quickActions = [
    { icon: UserPlus,  label: 'Öğrenci Ekle',   sub: 'Hızlı sınıf kaydı',       grad: 'linear-gradient(135deg,#059669,#10b981)', shadow: '0 6px 20px rgba(16,185,129,0.35)',  onClick: () => setShowAddStudentModal(true) },
    { icon: Plus,      label: 'Test Oluştur',    sub: 'Soru bankasından test',   grad: 'linear-gradient(135deg,#4f46e5,#6366f1)', shadow: '0 6px 20px rgba(99,102,241,0.35)',  onClick: () => { resetForm(); setShowModal(true); } },
    { icon: BookOpen,  label: 'Ödev Ver',         sub: 'Öğrencilere ödev ata',    grad: 'linear-gradient(135deg,#d97706,#f59e0b)', shadow: '0 6px 20px rgba(245,158,11,0.35)',  onClick: () => navigate('/homeworks') },
    { icon: Layers,    label: 'Soru Bankası',     sub: 'Sorularını yönet',        grad: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', shadow: '0 6px 20px rgba(139,92,246,0.35)',  onClick: () => navigate('/questions') },
    { icon: BookMarked, label: 'Müfredat Özetleri', sub: 'Konu anlatımı & özet', grad: 'linear-gradient(135deg,#0284c7,#0369a1)', shadow: '0 6px 20px rgba(2,132,199,0.35)', onClick: () => navigate('/summaries') },
    { icon: BarChart3, label: 'İstatistikler',    sub: 'Analiz & raporlar',       grad: 'linear-gradient(135deg,#e11d48,#f43f5e)', shadow: '0 6px 20px rgba(244,63,94,0.35)',  onClick: () => navigate('/statistics') },
  ];

  /* ── render helpers ── */
  const ScoreBar = ({ value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 9, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 9, width: `${value}%`,
          background: value >= 70 ? 'linear-gradient(90deg,#10b981,#059669)'
            : value >= 40 ? 'linear-gradient(90deg,#f59e0b,#f97316)'
            : 'linear-gradient(90deg,#f43f5e,#e11d48)',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: value >= 70 ? '#34d399' : value >= 40 ? '#fbbf24' : '#fb7185', minWidth: 32 }}>
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
            <div className="teacher-avatar-icon">
              <GraduationCap size={26} color="#fff" />
            </div>
            <div className="teacher-info-text">
              <div className="teacher-badge-row">
                <span className="teacher-badge-label">Öğretmen Paneli</span>
                <span className="teacher-pro-pill">PRO DESK</span>
              </div>
              <h1>{currentUser?.name || 'Öğretmen'}</h1>
            </div>
          </div>

          <div className="teacher-header-actions">
            <button
              onClick={() => { if (!newStudentGrade && data?.grades?.[0]?.id) setNewStudentGrade(data.grades[0].id); setShowAddStudentModal(true); }}
              className="btn-header-add-student"
            >
              <UserPlus size={15} /> Öğrenci Ekle
            </button>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="btn-header-create-test"
            >
              <Plus size={15} /> Test Oluştur
            </button>
          </div>
        </div>

        {/* ══════════ 4 TOP KPI METRIC CARDS ══════════ */}
        <div className="teacher-stats-grid">
          <StatHeroCard icon={Users}          label="Sınıfımdaki Öğrenciler" value={`${students.length} Öğrenci`} sub="Aktif sınıf kaydı" color="#38bdf8" bg="rgba(56, 189, 248, 0.15)" border="rgba(56, 189, 248, 0.35)" />
          <StatHeroCard icon={BookOpen}       label="Verilen Ödevler"        value={`${teacherHomeworks.length} Ödev`} sub="Atanan ödevler" color="#fbbf24" bg="rgba(251, 191, 36, 0.15)" border="rgba(251, 191, 36, 0.35)" />
          <StatHeroCard icon={ClipboardCheck} label="Çözülen Sınavlar"       value={`${teacherSubmissions.length} Kağıt`} sub="Öğrenci yanıtı" color="#34d399" bg="rgba(52, 211, 153, 0.15)" border="rgba(52, 211, 153, 0.35)" />
          <StatHeroCard icon={Layers}         label="Soru Bankası"           value={`${teacherQuestions.length} Soru`} sub="Eklediğiniz sorular" color="#c084fc" bg="rgba(192, 132, 252, 0.15)" border="rgba(192, 132, 252, 0.35)" />
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
            <div className="overview-card-box" style={{ border: '1.5px solid rgba(52, 211, 153, 0.35)' }}>
              <div className="overview-card-header">
                <h3>
                  <Activity size={18} color="#34d399" /> Son Öğrenci Aktiviteleri
                </h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>{recentSubs.length} kayıt</span>
              </div>
              {recentSubs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
                  <Activity size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>Henüz çözülen sınav yok</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {recentSubs.map((sub, i) => {
                    const student = users.find(u => u.id === sub.studentId);
                    const score   = sub.score !== undefined ? sub.score : null;
                    const good    = score !== null && score >= 70;
                    const si      = students.findIndex(s => s.id === sub.studentId);
                    return (
                      <div key={sub.id || i} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.65rem 0.9rem', borderRadius: '0.85rem',
                        background: good ? 'rgba(5, 150, 105, 0.15)' : score !== null ? 'rgba(220, 38, 38, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${good ? 'rgba(52, 211, 153, 0.35)' : score !== null ? 'rgba(248, 113, 113, 0.35)' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                        <Avatar name={student?.name} index={si >= 0 ? si : i} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.82rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {student?.name || 'Öğrenci'}
                          </p>
                          <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sub.testTitle || 'Sınav'} · {timeAgo(sub.submittedAt)}
                          </p>
                        </div>
                        {score !== null ? (
                          <span style={{
                            fontWeight: 900, fontSize: '0.8rem',
                            padding: '0.2rem 0.6rem', borderRadius: '0.5rem',
                            background: good ? 'rgba(5, 150, 105, 0.25)' : 'rgba(220, 38, 38, 0.25)',
                            color: good ? '#34d399' : '#f87171', flexShrink: 0,
                            border: `1px solid ${good ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}`
                          }}>%{score}</span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, flexShrink: 0 }}>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Student Leaderboard */}
            <div className="overview-card-box" style={{ border: '1.5px solid rgba(251, 191, 36, 0.35)' }}>
              <div className="overview-card-header">
                <h3>
                  <Award size={18} color="#fbbf24" /> Öğrenci Başarı Sıralaması
                </h3>
                <button onClick={() => setTab('students')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Tümü <ChevronRight size={13} />
                </button>
              </div>
              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
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
                          : 'rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.68rem', fontWeight: 900,
                        color: rank < 3 ? '#fff' : 'rgba(255,255,255,0.6)',
                      }}>{rank + 1}</div>
                      <Avatar name={std.name} index={std.idx} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '0.82rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{std.name}</p>
                        <ScoreBar value={std.avg} />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, flexShrink: 0 }}>{std.count} sınav</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Homeworks */}
            <div className="overview-card-box" style={{ border: '1.5px solid rgba(99, 102, 241, 0.35)', gridColumn: '1 / -1' }}>
              <div className="overview-card-header">
                <h3>
                  <Calendar size={18} color="#818cf8" /> Yaklaşan Ödev Teslimleri
                </h3>
                <button onClick={() => navigate('/homeworks')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Tüm Ödevler <ChevronRight size={13} />
                </button>
              </div>
              {upcomingHw.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
                  <Calendar size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>Yaklaşan ödev teslimi yok. <button onClick={() => navigate('/homeworks')} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 800 }}>Ödev oluştur →</button></p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  {upcomingHw.map((hw) => {
                    const due = new Date(hw.dueDate);
                    const daysLeft = Math.ceil((due - Date.now()) / 86400000);
                    const urgent = daysLeft <= 2;
                    const tIds = hw.targetIds || [];
                    return (
                      <div key={hw.id} style={{
                        borderRadius: '1rem', padding: '1rem',
                        background: urgent ? 'rgba(220, 38, 38, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1.5px solid ${urgent ? 'rgba(248, 113, 113, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: 99,
                            background: urgent ? '#dc2626' : 'rgba(56, 189, 248, 0.2)',
                            color: '#ffffff',
                          }}>
                            {urgent ? '🔥 ' : ''}{daysLeft <= 0 ? 'Bugün!' : `${daysLeft}g kaldı`}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                            👥 {tIds.length} öğrenci
                          </span>
                        </div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: '#ffffff', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {hw.title}
                        </p>
                        <p style={{ margin: '0.4rem 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
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
              <div className="overview-card-box" style={{ border: '1.5px solid rgba(255, 255, 255, 0.14)', gridColumn: '1 / -1' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <GraduationCap size={18} color="#818cf8" /> Sınıf Bazında Öğrenci Dağılımı
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.85rem' }}>
                  {data.grades.map((grade, gi) => {
                    const count = students.filter(s =>
                      String(s.gradeId) === String(grade.id) || s.gradeId === grade.name ||
                      String(s.classId) === String(grade.id) || s.grade === grade.name || s.className === grade.name
                    ).length;
                    const pct = students.length ? Math.round((count / students.length) * 100) : 0;
                    const GRADE_COLORS = ['#818cf8','#34d399','#fbbf24','#f472b6','#2dd4bf','#fb923c','#c084fc','#38bdf8'];
                    const gc = GRADE_COLORS[gi % GRADE_COLORS.length];
                    return (
                      <div key={grade.id} style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '1.8rem', fontWeight: 900, color: gc, margin: 0, lineHeight: 1 }}>{count}</p>
                        <p style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff', margin: '0.35rem 0' }}>{grade.name}</p>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 9, overflow: 'hidden', marginTop: '0.5rem' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: gc, borderRadius: 9, transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>%{pct}</span>
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
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '1.25rem', padding: '1rem 1.25rem',
              display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)'
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="text" placeholder="Test adıyla ara..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.9rem 0.6rem 2.4rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <select value={filterSub} onChange={e => setFilterSub(e.target.value)}
                style={{ padding: '0.6rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>Tüm Dersler</option>
                {allSubjects.map(s => <option key={s} value={s} style={{ background: '#0f172a', color: '#ffffff' }}>{s}</option>)}
              </select>
              <button onClick={() => { resetForm(); setShowModal(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                  border: 'none', color: 'white', fontWeight: 900, fontSize: '0.82rem',
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
                }}>
                <Plus size={15} /> Yeni Test
              </button>
            </div>

            {visibleTests.length === 0 ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.9) 100%)',
                border: '1.5px dashed rgba(255,255,255,0.2)',
                borderRadius: '1.25rem', padding: '3rem 1.5rem', textAlign: 'center',
                color: 'rgba(255,255,255,0.5)', fontWeight: 700
              }}>
                <FileText size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ margin: 0 }}>Arama kriterlerine uygun test bulunamadı.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                {visibleTests.map(test => {
                  const sc = subColor(test.subject);
                  return (
                    <div key={test.id} style={{
                      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
                      border: `1.5px solid ${sc.border}`,
                      borderRadius: '1.25rem', padding: '1.15rem',
                      display: 'flex', flexDirection: 'column', gap: '0.75rem',
                      boxShadow: '0 12px 36px rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)',
                      transition: 'transform 0.15s ease'
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: 99, background: sc.pill, color: sc.text, border: `1px solid ${sc.border}`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {test.subject}
                        </span>
                        <button onClick={() => openEdit(test)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '0.5rem', padding: '0.35rem', cursor: 'pointer', color: '#ffffff', display: 'flex' }}>
                          <Edit2 size={13} />
                        </button>
                      </div>
                      <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: '#ffffff', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {test.title}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={13} color="#818cf8" />{test.questions || 0} Soru</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} color="#fbbf24" />{test.time || 0} dk</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} color="rgba(255,255,255,0.4)" />{test.date ? new Date(test.date).toLocaleDateString('tr-TR') : '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB: STUDENTS ══════════ */}
        {tab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '1.25rem', padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)'
            }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="#818cf8" /> Sınıfım & Öğrenci Listesi
                <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: 99, background: 'rgba(99,102,241,0.25)', color: '#c7d2fe', border: '1px solid rgba(165,180,252,0.35)' }}>{students.length} Öğrenci</span>
              </h3>
              <button
                onClick={() => { if (!newStudentGrade && data?.grades?.[0]?.id) setNewStudentGrade(data.grades[0].id); setShowAddStudentModal(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.55rem 1.15rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg,#059669,#10b981)',
                  border: 'none', color: 'white', fontWeight: 900, fontSize: '0.8rem',
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
                }}
              >
                <UserPlus size={15} /> Öğrenci Ekle
              </button>
            </div>

            {students.length === 0 ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.9) 100%)',
                border: '1.5px dashed rgba(255,255,255,0.2)',
                borderRadius: '1.25rem', padding: '3.5rem 1.5rem', textAlign: 'center',
                color: 'rgba(255,255,255,0.5)'
              }}>
                <Users size={44} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ fontWeight: 700, margin: '0 0 1rem', color: '#ffffff' }}>Henüz sınıfınıza öğrenci eklemediniz.</p>
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
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
                  border: '1.5px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '1.25rem', boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(20px)', overflowX: 'auto', padding: 0
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                        <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Öğrenci</th>
                        <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Sınıfı</th>
                        <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>E-Posta / Kullanıcı Adı</th>
                        <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Giriş Şifresi</th>
                        <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Çözülen Sınav</th>
                        <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Koçluk</th>
                        <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, i) => {
                        const solved = submissions.filter(s => s.studentId === student.id).length;
                        const isCoached = coachedIds.includes(student.id);
                        const gObj = data?.grades?.find(g => String(g.id) === String(student.gradeId) || String(g.id) === String(student.classId))
                                  || data?.grades?.find(g => g.name === student.gradeId || g.name === student.grade || g.name === student.className);
                        return (
                          <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s' }}>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <Avatar name={student.name} index={i} size={34} />
                                <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.88rem' }}>{student.name}</span>
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
                                style={{ padding: '0.35rem 0.6rem', borderRadius: '0.55rem', border: '1px solid rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', outline: 'none' }}
                              >
                                <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>— Sınıf Seçiniz</option>
                                {data.grades.map(g => <option key={g.id} value={g.id} style={{ background: '#0f172a', color: '#ffffff' }}>{g.name}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: 600 }}>{student.email}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.45rem', background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.25)', color: '#fbbf24', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Key size={11} /> {student.password || '123456'}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 900, color: solved > 0 ? '#34d399' : 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>{solved}</td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                              {isCoached ? (
                                <span style={{ padding: '0.2rem 0.65rem', borderRadius: 99, background: 'rgba(192, 132, 252, 0.2)', color: '#c084fc', border: '1px solid rgba(192, 132, 252, 0.35)', fontWeight: 800, fontSize: '0.7rem' }}>🎯 Koçlukta</span>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                              <button
                                onClick={() => openEditStudentModal(student)}
                                style={{
                                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                  borderRadius: '0.6rem', padding: '0.4rem 0.75rem', cursor: 'pointer',
                                  fontWeight: 800, fontSize: '0.75rem', color: '#ffffff',
                                  display: 'inline-flex', alignItems: 'center', gap: 4
                                }}
                              >
                                <Edit2 size={12} /> Düzenle
                              </button>
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
                              <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {student.name}
                              </h4>
                              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {student.email}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => openEditStudentModal(student)}
                            style={{
                              background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(165,180,252,0.35)',
                              borderRadius: '0.65rem', padding: '0.4rem 0.75rem', cursor: 'pointer',
                              fontWeight: 800, fontSize: '0.75rem', color: '#c7d2fe',
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
                              style={{ padding: '0.3rem 0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', outline: 'none', width: '100%' }}
                            >
                              <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>— Seçiniz</option>
                              {data.grades.map(g => <option key={g.id} value={g.id} style={{ background: '#0f172a', color: '#ffffff' }}>{g.name}</option>)}
                            </select>
                          </div>

                          <div className="student-meta-item">
                            <span className="student-meta-label">Giriş Şifresi</span>
                            <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.45rem', background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                              <Key size={11} /> {student.password || '123456'}
                            </span>
                          </div>

                          <div className="student-meta-item">
                            <span className="student-meta-label">Çözülen Sınav</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: solved > 0 ? '#34d399' : 'rgba(255,255,255,0.4)' }}>
                              {solved} adet
                            </span>
                          </div>

                          <div className="student-meta-item">
                            <span className="student-meta-label">Koçluk Durumu</span>
                            {isCoached ? (
                              <span style={{ padding: '0.15rem 0.55rem', borderRadius: 99, background: 'rgba(192, 132, 252, 0.25)', color: '#c084fc', border: '1px solid rgba(192, 132, 252, 0.4)', fontWeight: 900, fontSize: '0.68rem', width: 'fit-content' }}>
                                🎯 Koçlukta
                              </span>
                            ) : (
                              <button
                                onClick={() => toggleCoachedStudent(currentUser?.id || 'teacher_1', student.id)}
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', borderRadius: 99, padding: '0.15rem 0.55rem', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer', width: 'fit-content' }}
                              >
                                + Koçluğa Ekle
                              </button>
                            )}
                          </div>
                        </div>
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
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
              border: '1.5px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '1.25rem', padding: '1.25rem',
              boxShadow: '0 12px 36px rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)'
            }}>
              <h3 style={{ margin: '0 0 0.3rem', fontWeight: 900, fontSize: '0.95rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={18} color="#c084fc" /> Bireysel Koçluk Sistemi Takibi
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>
                Bireysel koçluk takibine almak istediğiniz öğrencileri seçin ve hedeflerini, denemelerini ve gelişim yol haritasını yönetin.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
              {students.map((std, i) => {
                const isCoached = coachedIds.includes(std.id);
                return (
                  <div key={std.id} style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
                    border: isCoached ? '1.5px solid rgba(168, 85, 247, 0.5)' : '1.5px solid rgba(255,255,255,0.12)',
                    borderRadius: '1.25rem', padding: '1.25rem',
                    display: 'flex', flexDirection: 'column', gap: '0.85rem',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Avatar name={std.name} index={i} size={42} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: '#ffffff' }}>{std.name}</h4>
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{std.email}</p>
                      </div>
                      <button
                        onClick={() => toggleCoachedStudent(currentUser?.id || 'teacher_1', std.id)}
                        style={{
                          padding: '0.35rem 0.85rem', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 900,
                          background: isCoached ? 'linear-gradient(135deg,#7c3aed,#6366f1)' : 'rgba(255,255,255,0.08)',
                          color: '#ffffff',
                          boxShadow: isCoached ? '0 2px 10px rgba(124,58,237,0.4)' : 'none',
                          flexShrink: 0
                        }}>
                        {isCoached ? '✓ Koçlukta' : '+ Ekle'}
                      </button>
                    </div>
                    <Link to={`/coaching/${std.id}`} style={{ textDecoration: 'none' }}>
                      <button style={{
                        width: '100%', padding: '0.65rem', borderRadius: '0.75rem',
                        background: isCoached ? 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(99,102,241,0.2))' : 'rgba(255,255,255,0.06)',
                        border: `1.5px solid ${isCoached ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.12)'}`,
                        color: isCoached ? '#c084fc' : 'rgba(255,255,255,0.7)',
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)',
            borderRadius: '1.5rem', width: '100%', maxWidth: 540, padding: '1.75rem',
            border: '1.5px solid rgba(255,255,255,0.18)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="#818cf8" />
                {editingTestId ? 'Testi Düzenle' : 'Yeni Test Oluştur'}
              </h3>
              <button onClick={resetForm} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Test Adı *</label>
                <input type="text" required placeholder="Örn: 8. Sınıf Üslü Sayılar Genel Tarama" value={testName} onChange={e => setTestName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Soru Başı Süre (dk)</label>
                  <input type="number" min="1" value={timePerQ} onChange={e => setTimePerQ(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Sınıf</label>
                  <select value={selGrade} onChange={e => { setSelGrade(e.target.value); setSelSubject(''); setSelUnit(''); setSelTopic(''); setSelQIds([]); }}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                    <option value="">Sınıf Seçiniz</option>
                    <option value="all">Tüm Sınıflar</option>
                    {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              {selGrade && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Ders</label>
                  <select value={selSubject} onChange={e => { setSelSubject(e.target.value); setSelUnit(''); setSelTopic(''); setSelQIds([]); }}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                    <option value="">Ders Seçiniz</option>
                    <option value="all">Tüm Dersler</option>
                    {filtSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {selSubject && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Ünite</label>
                  <select value={selUnit} onChange={e => { setSelUnit(e.target.value); setSelTopic(''); setSelQIds([]); }}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                    <option value="">Ünite Seçiniz</option>
                    <option value="all">Tüm Üniteler</option>
                    {filtUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              {selUnit && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Konu</label>
                  <select value={selTopic} onChange={e => { setSelTopic(e.target.value); setSelQIds([]); }}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                    <option value="">Konu Seçiniz</option>
                    <option value="all">Tüm Konular</option>
                    {filtTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              {catId && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', margin: 0 }}>Soru Havuzu ({poolQs.length} soru)</label>
                    <button type="button" onClick={() => setSelQIds(selQIds.length === poolQs.length ? [] : poolQs.map(q => q.id))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, color: '#818cf8' }}>
                      {selQIds.length === poolQs.length ? 'Seçimleri Kaldır' : 'Tümünü Seç'}
                    </button>
                  </div>
                  {poolQs.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', margin: 0 }}>
                      Bu kategoride henüz soru eklenmemiş.
                    </p>
                  ) : (
                    <div style={{ maxHeight: 180, overflowY: 'auto', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '0.75rem', padding: '0.5rem' }}>
                      {poolQs.map(q => (
                        <label key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>
                          <input type="checkbox" checked={selQIds.includes(q.id)} onChange={() => toggleQ(q.id)} />
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
                boxShadow: '0 4px 14px rgba(99,102,241,0.4)', width: '100%',
              }}>
                {editingTestId ? 'Testi Güncelle' : `Test Oluştur (${selQIds.length} Soru Seçildi)`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: ÖĞRENCİ EKLE ══════════ */}
      {showAddStudentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)',
            borderRadius: '1.5rem', width: '100%', maxWidth: 460, padding: '1.75rem',
            border: '1.5px solid rgba(255,255,255,0.18)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} color="#34d399" />
                Sınıfıma Öğrenci Ekle
              </h3>
              <button onClick={() => setShowAddStudentModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Quick link unassigned student */}
            {(() => {
              const unassigned = (users || []).filter(u => u.role === 'student' && !u.teacherId);
              if (!unassigned.length) return null;
              return (
                <div style={{ background: 'rgba(56, 189, 248, 0.12)', borderRadius: '0.85rem', border: '1.5px solid rgba(56, 189, 248, 0.3)', padding: '0.85rem', marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 4 }}>💡 Sahipsiz Öğrenci Bağla</label>
                  <select defaultValue="" onChange={async (e) => {
                    if (!e.target.value) return;
                    const s = unassigned.find(x => x.id === e.target.value);
                    if (s) { await updateUser(s.id, { teacherId: currentUser.id }); setShowAddStudentModal(false); alert(`🎉 ${s.name} sınıfınıza bağlandı!`); }
                  }} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1px solid rgba(56, 189, 248, 0.4)', background: 'rgba(15,23,42,0.95)', color: '#38bdf8', fontWeight: 800, fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}>
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
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Öğrenci Adı Soyadı *</label>
                <input type="text" required placeholder="Örn: Ahmet Yılmaz" value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>E-Posta / Kullanıcı Adı (opsiyonel)</label>
                <input type="text" placeholder="Örn: ahmet veya ahmet@gmail.com" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Giriş Şifresi *</label>
                <input type="text" required placeholder="Örn: 123456" value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(251, 191, 36, 0.4)', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 900, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Sınıf Seviyesi</label>
                <select value={newStudentGrade} onChange={e => setNewStudentGrade(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                  {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddStudentModal(false)}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}>
                  İptal
                </button>
                <button type="submit" style={{ flex: 1, padding: '0.65rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>
                  💾 Kaydet & Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: ÖĞRENCİ DÜZENLE ══════════ */}
      {editingStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)',
            borderRadius: '1.5rem', width: '100%', maxWidth: 460, padding: '1.75rem',
            border: '1.5px solid rgba(255,255,255,0.18)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={18} color="#818cf8" />
                Öğrenci Bilgilerini Düzenle
              </h3>
              <button onClick={() => setEditingStudent(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
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
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Öğrenci Adı Soyadı *</label>
                <input type="text" required value={editStudentName} onChange={e => setEditStudentName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>E-Posta / Kullanıcı Adı</label>
                <input type="text" value={editStudentEmail} onChange={e => setEditStudentEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Giriş Şifresi *</label>
                <input type="text" required value={editStudentPassword} onChange={e => setEditStudentPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(251, 191, 36, 0.4)', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 900, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Sınıf Seviyesi</label>
                <select value={editStudentGrade} onChange={e => setEditStudentGrade(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                  {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditingStudent(null)}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}>
                  İptal
                </button>
                <button type="submit" style={{ flex: 1, padding: '0.65rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#4f46e5,#6366f1)', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
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
