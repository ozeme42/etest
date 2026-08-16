import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, X, Edit2, Users, BookOpen, ClipboardCheck,
  Clock, ChevronRight, FileText, Activity, GraduationCap,
  Search, Calendar, Layers, BarChart3, TrendingUp, Target,
  UserCheck, Sparkles, UserPlus, Eye, CheckCircle2, Flame,
  BookMarked, Star, Award, Zap, ArrowRight, Bell, Map
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';


/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#14b8a6,#6366f1)',
];
const avatarBg = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length];

const SUBJECT_COLORS = {
  'Matematik':       { pill: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
  'Fen Bilimleri':   { pill: '#d1fae5', text: '#065f46', dot: '#10b981' },
  'Türkçe':          { pill: '#ffedd5', text: '#9a3412', dot: '#f97316' },
  'Sosyal Bilgiler': { pill: '#ede9fe', text: '#5b21b6', dot: '#8b5cf6' },
  'İngilizce':       { pill: '#fce7f3', text: '#9d174d', dot: '#ec4899' },
};
const subColor = (s) => SUBJECT_COLORS[s] || { pill: '#f1f5f9', text: '#475569', dot: '#94a3b8' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 1)  return 'şimdi';
  if (diff < 60) return `${diff}dk önce`;
  const h = Math.floor(diff / 60);
  if (h < 24)    return `${h}s önce`;
  return `${Math.floor(h / 24)}g önce`;
}

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */
function Avatar({ name, index, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarBg(index ?? 0),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 900, fontSize: size * 0.38,
      flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    }}>
      {(name || 'Ö').charAt(0).toUpperCase()}
    </div>
  );
}

function StatHeroCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '1rem',
      padding: '1rem 1.2rem',
      minWidth: 100,
      display: 'flex', flexDirection: 'column', gap: '0.3rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1rem' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '0.5rem',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={14} color="#fff" />
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <p style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{sub}</p>}
    </div>
  );
}

function QuickAction({ icon: Icon, label, sub, grad, shadow, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: grad,
      borderRadius: '1.1rem',
      padding: '1rem 1.1rem',
      border: 'none',
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      color: '#fff',
      boxShadow: shadow,
      transition: 'transform 0.15s, box-shadow 0.15s',
      textAlign: 'left',
      width: '100%',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = shadow.replace('0.2)', '0.35)'); }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = shadow; }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={e => e.currentTarget.style.transform = 'translateY(-2px)'}
    >
      <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontWeight: 900, fontSize: '0.85rem', margin: 0, lineHeight: 1.2 }}>{label}</p>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', margin: '0.15rem 0 0', fontWeight: 600 }}>{sub}</p>
      </div>
      <ChevronRight size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
    </button>
  );
}

function PillTab({ id, label, icon: Icon, badge, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.55rem 1rem',
        borderRadius: '2rem',
        border: active ? 'none' : '1.5px solid #e2e8f0',
        background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#fff',
        color: active ? '#fff' : '#64748b',
        fontWeight: 800, fontSize: '0.8rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap', flexShrink: 0,
        boxShadow: active ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
        transition: 'all 0.18s',
      }}
    >
      <Icon size={15} />
      <span>{label}</span>
      {badge !== undefined && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
          color: active ? '#fff' : '#64748b',
          fontSize: '0.65rem', fontWeight: 900,
          padding: '1px 7px', borderRadius: '1rem'
        }}>{badge}</span>
      )}
    </button>
  );
}

const C = {
  page:   { minHeight: '100vh', background: 'linear-gradient(145deg,#f8faff 0%,#f0f4ff 50%,#faf5ff 100%)', fontFamily: "'Inter','Segoe UI',sans-serif" },
  header: { position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #e2e8f0', padding: '0.7rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' },
  main:   { maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1.25rem 5rem' },
  card:   { background: '#fff', borderRadius: '1.25rem', border: '1px solid #e8ecf4', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' },
  input:  { width: '100%', padding: '0.6rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  label:  { display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  btnPrimary: { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '0.75rem', padding: '0.65rem 1.25rem', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(99,102,241,0.3)', transition: 'opacity 0.15s' },
  btnSuccess: { background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: '0.75rem', padding: '0.65rem 1.25rem', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', transition: 'opacity 0.15s' },
};

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
    { id: 'tests',     label: 'Testler',     icon: FileText,  badge: visibleTests.length },
    { id: 'students',  label: 'Öğrenciler',  icon: Users,     badge: students.length },
    { id: 'coaching',  label: 'Koçluk',      icon: Target },

  ];

  const quickActions = [
    { icon: UserPlus,  label: 'Öğrenci Ekle',   sub: 'Hızlı kayıt',       grad: 'linear-gradient(135deg,#10b981,#059669)', shadow: '0 6px 20px rgba(16,185,129,0.3)',  onClick: () => setShowAddStudentModal(true) },
    { icon: Plus,      label: 'Test Oluştur',    sub: 'Soru bankasından',   grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)', shadow: '0 6px 20px rgba(99,102,241,0.3)',  onClick: () => { resetForm(); setShowModal(true); } },
    { icon: BookOpen,  label: 'Ödev Ver',         sub: 'Sınıfa ödev ata',   grad: 'linear-gradient(135deg,#f59e0b,#ef4444)', shadow: '0 6px 20px rgba(245,158,11,0.3)',  onClick: () => navigate('/homeworks') },
    { icon: Layers,    label: 'Soru Bankası',     sub: 'Sorularını yönet',  grad: 'linear-gradient(135deg,#8b5cf6,#6366f1)', shadow: '0 6px 20px rgba(139,92,246,0.3)',  onClick: () => navigate('/questions') },
    { icon: BarChart3, label: 'İstatistikler',    sub: 'Analiz & raporlar', grad: 'linear-gradient(135deg,#ec4899,#8b5cf6)', shadow: '0 6px 20px rgba(236,72,153,0.3)',  onClick: () => navigate('/statistics') },
  ];

  /* ── render helpers ── */
  const ScoreBar = ({ value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 9 }}>
        <div style={{
          height: '100%', borderRadius: 9, width: `${value}%`,
          background: value >= 70 ? 'linear-gradient(90deg,#10b981,#059669)'
            : value >= 40 ? 'linear-gradient(90deg,#f59e0b,#f97316)'
            : 'linear-gradient(90deg,#f43f5e,#e11d48)',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: value >= 70 ? '#059669' : value >= 40 ? '#d97706' : '#e11d48', minWidth: 32 }}>
        %{value}
      </span>
    </div>
  );

  return (
    <div style={C.page}>

      {/* ══════════ STICKY HEADER ══════════ */}
      <header style={C.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '0.9rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
            <GraduationCap size={22} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: '0.62rem', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Öğretmen Paneli</p>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
              {currentUser?.name || 'Öğretmen'}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button onClick={() => { if (!newStudentGrade && data?.grades?.[0]?.id) setNewStudentGrade(data.grades[0].id); setShowAddStudentModal(true); }}
            style={{ ...C.btnSuccess, padding: '0.55rem 1rem', fontSize: '0.78rem' }}>
            <UserPlus size={15} />
            <span style={{ display: 'none' }} className="sm-show">Öğrenci Ekle</span>
          </button>
          <button onClick={() => { resetForm(); setShowModal(true); }}
            style={{ ...C.btnPrimary, padding: '0.55rem 1rem', fontSize: '0.78rem' }}>
            <Plus size={15} />
            <span style={{ display: 'none' }} className="sm-show">Test Oluştur</span>
          </button>
        </div>
      </header>

      <main style={C.main}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ══════════ HERO SECTION ══════════ */}
          <section style={{
            borderRadius: '1.5rem',
            background: 'linear-gradient(135deg,#1e1b4b 0%,#4c1d95 40%,#1e3a5f 100%)',
            overflow: 'hidden',
            position: 'relative',
            padding: '2rem 1.75rem',
            boxShadow: '0 8px 40px rgba(99,102,241,0.3)',
          }}>
            {/* decorative blobs */}
            <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(139,92,246,0.25)', filter: 'blur(60px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, left: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', filter: 'blur(50px)', pointerEvents: 'none' }} />
            {/* grid pattern */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
              {/* greeting */}
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '2rem', padding: '0.3rem 0.85rem', marginBottom: '0.75rem' }}>
                  <Sparkles size={13} color="#fbbf24" />
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Sınıf Yönetim Sistemi</span>
                </div>
                <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900, color: '#fff', margin: '0 0 0.5rem', lineHeight: 1.2 }}>
                  Hoş Geldiniz, {currentUser?.name?.split(' ')[0] || 'Hocam'} 👋
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0, maxWidth: 440, lineHeight: 1.5 }}>
                  Öğrencilerinizi yönetin, müfredata uygun testler oluşturun ve öğrenci gelişimini anlık takip edin.
                </p>
              </div>

              {/* stat mini-cards */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <StatHeroCard icon={Users}          label="Öğrenci"    value={students.length}          sub="sınıfınızda" />
                <StatHeroCard icon={BookOpen}        label="Ödev"       value={teacherHomeworks.length}  sub="atanan" />
                <StatHeroCard icon={ClipboardCheck}  label="Çözülen"    value={teacherSubmissions.length} sub="sınav kağıdı" />
                <StatHeroCard icon={Layers}           label="Soru"       value={teacherQuestions.length}  sub="bankada" />
              </div>
            </div>
          </section>

          {/* ══════════ QUICK ACTIONS ══════════ */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.85rem' }}>
            {quickActions.map(qa => (
              <QuickAction key={qa.label} {...qa} />
            ))}
          </section>

          {/* ══════════ TABS ══════════ */}
          <div style={{
            position: 'sticky', top: 57, zIndex: 30,
            background: 'linear-gradient(145deg,#f8faff 0%,#f0f4ff 50%,#faf5ff 100%)',
            paddingTop: '0.5rem', paddingBottom: '0.5rem',
            marginLeft: '-1.25rem', marginRight: '-1.25rem',
            paddingLeft: '1.25rem', paddingRight: '1.25rem',
            borderBottom: '1px solid rgba(226,232,240,0.6)',
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {tabs.map(t => (
                <PillTab key={t.id} {...t} active={tab === t.id} onClick={setTab} />
              ))}
            </div>
          </div>

          {/* ══════════ TAB: OVERVIEW ══════════ */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>

              {/* Recent Activity */}
              <div style={{ ...C.card, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Activity size={16} color="#10b981" /> Son Aktiviteler
                  </h3>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8' }}>{recentSubs.length} kayıt</span>
                </div>
                {recentSubs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                    <Activity size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                    <p style={{ margin: 0 }}>Henüz çözülen sınav yok</p>
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
                          padding: '0.65rem 0.9rem',
                          borderRadius: '0.85rem',
                          background: good ? 'rgba(16,185,129,0.06)' : score !== null ? 'rgba(244,63,94,0.05)' : '#f8fafc',
                          border: `1px solid ${good ? 'rgba(16,185,129,0.15)' : score !== null ? 'rgba(244,63,94,0.12)' : '#f1f5f9'}`,
                        }}>
                          <Avatar name={student?.name} index={si >= 0 ? si : i} size={34} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 800, fontSize: '0.8rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {student?.name || 'Öğrenci'}
                            </p>
                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {sub.testTitle || 'Sınav'} · {timeAgo(sub.submittedAt)}
                            </p>
                          </div>
                          {score !== null ? (
                            <span style={{
                              fontWeight: 900, fontSize: '0.78rem',
                              padding: '0.25rem 0.6rem', borderRadius: '0.5rem',
                              background: good ? '#d1fae5' : '#fee2e2',
                              color: good ? '#065f46' : '#991b1b', flexShrink: 0,
                            }}>%{score}</span>
                          ) : (
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, flexShrink: 0 }}>—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Student Leaderboard */}
              <div style={{ ...C.card, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Award size={16} color="#f59e0b" /> Öğrenci Sıralaması
                  </h3>
                  <button onClick={() => setTab('students')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Tümü <ChevronRight size={13} />
                  </button>
                </div>
                {leaderboard.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                    <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                    <p style={{ margin: 0 }}>Henüz öğrenci yok</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {leaderboard.slice(0, 7).map((std, rank) => (
                      <div key={std.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          background: rank === 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                            : rank === 1 ? 'linear-gradient(135deg,#94a3b8,#64748b)'
                            : rank === 2 ? 'linear-gradient(135deg,#f97316,#ea580c)'
                            : '#f1f5f9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.65rem', fontWeight: 900,
                          color: rank < 3 ? '#fff' : '#64748b',
                        }}>{rank + 1}</div>
                        <Avatar name={std.name} index={std.idx} size={30} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.78rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{std.name}</p>
                          <ScoreBar value={std.avg} />
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, flexShrink: 0 }}>{std.count} sınav</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Homeworks */}
              <div style={{ ...C.card, padding: '1.25rem', gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={16} color="#6366f1" /> Yaklaşan Ödevler
                  </h3>
                  <button onClick={() => navigate('/homeworks')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Tüm Ödevler <ChevronRight size={13} />
                  </button>
                </div>
                {upcomingHw.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                    <Calendar size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                    <p style={{ margin: 0 }}>Yaklaşan ödev yok. <button onClick={() => navigate('/homeworks')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 700 }}>Ödev oluştur →</button></p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {upcomingHw.map((hw, i) => {
                      const due = new Date(hw.dueDate);
                      const daysLeft = Math.ceil((due - Date.now()) / 86400000);
                      const urgent = daysLeft <= 2;
                      const tIds = hw.targetIds || [];
                      return (
                        <div key={hw.id} style={{
                          borderRadius: '1rem', padding: '1rem',
                          background: urgent ? 'linear-gradient(135deg,rgba(244,63,94,0.05),rgba(239,68,68,0.05))' : '#f8fafc',
                          border: `1.5px solid ${urgent ? 'rgba(244,63,94,0.2)' : '#e2e8f0'}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{
                              fontSize: '0.62rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: '1rem',
                              background: urgent ? '#fee2e2' : '#dbeafe',
                              color: urgent ? '#991b1b' : '#1d4ed8',
                            }}>
                              {urgent ? '🔥 ' : ''}{daysLeft <= 0 ? 'Bugün!' : `${daysLeft}g kaldı`}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>
                              👥 {tIds.length} öğrenci
                            </span>
                          </div>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.8rem', color: '#1e293b', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {hw.title}
                          </p>
                          <p style={{ margin: '0.4rem 0 0', fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>
                            {due.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Grade Distribution */}
              {data.grades.length > 0 && (
                <div style={{ ...C.card, padding: '1.25rem', gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <GraduationCap size={16} color="#6366f1" /> Sınıf Bazında Öğrenci Dağılımı
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                    {data.grades.map((grade, gi) => {
                      const count = students.filter(s =>
                        String(s.gradeId) === String(grade.id) || s.gradeId === grade.name ||
                        String(s.classId) === String(grade.id) || s.grade === grade.name || s.className === grade.name
                      ).length;
                      const pct = students.length ? Math.round((count / students.length) * 100) : 0;
                      const GRADE_COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#14b8a6','#f97316','#8b5cf6','#3b82f6'];
                      const gc = GRADE_COLORS[gi % GRADE_COLORS.length];
                      return (
                        <div key={grade.id} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
                          <p style={{ fontSize: '1.8rem', fontWeight: 900, color: gc, margin: 0, lineHeight: 1 }}>{count}</p>
                          <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', margin: '0.3rem 0' }}>{grade.name}</p>
                          <div style={{ height: 5, background: '#e2e8f0', borderRadius: 9, overflow: 'hidden', marginTop: '0.5rem' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: gc, borderRadius: 9, transition: 'width 0.6s ease' }} />
                          </div>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>%{pct}</span>
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
              <div style={{ ...C.card, padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="text" placeholder="Test adıyla ara..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    style={{ ...C.input, paddingLeft: '2.2rem' }} />
                </div>
                <select value={filterSub} onChange={e => setFilterSub(e.target.value)}
                  style={{ ...C.input, width: 'auto', minWidth: 140 }}>
                  <option value="">Tüm Dersler</option>
                  {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => { resetForm(); setShowModal(true); }} style={C.btnPrimary}>
                  <Plus size={15} /> Yeni Test
                </button>
              </div>

              {visibleTests.length === 0 ? (
                <div style={{ ...C.card, padding: '3rem', textAlign: 'center' }}>
                  <FileText size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
                  <p style={{ color: '#94a3b8', fontWeight: 700, margin: 0 }}>Arama kriterlerine uygun test bulunamadı.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                  {visibleTests.map(test => {
                    const sc = subColor(test.subject);
                    return (
                      <div key={test.id} style={{
                        ...C.card, padding: '1.1rem',
                        borderTop: `3px solid ${sc.dot}`,
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        cursor: 'default',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: '1rem', background: sc.pill, color: sc.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {test.subject}
                          </span>
                          <button onClick={() => openEdit(test)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '0.5rem', padding: '0.35rem', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                            <Edit2 size={13} />
                          </button>
                        </div>
                        <h4 style={{ margin: '0 0 0.75rem', fontWeight: 800, fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {test.title}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.6rem', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={12} color="#6366f1" />{test.questions || 0} Soru</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} color="#f59e0b" />{test.time || 0} dk</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} color="#94a3b8" />{test.date ? new Date(test.date).toLocaleDateString('tr-TR') : '—'}</span>
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
              <div style={{ ...C.card, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} color="#6366f1" /> Sınıfım
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '0.15rem 0.65rem', borderRadius: '1rem', background: '#ede9fe', color: '#7c3aed' }}>{students.length} Öğrenci</span>
                </h3>
                <button onClick={() => { if (!newStudentGrade && data?.grades?.[0]?.id) setNewStudentGrade(data.grades[0].id); setShowAddStudentModal(true); }}
                  style={C.btnSuccess}>
                  <UserPlus size={15} /> Öğrenci Ekle
                </button>
              </div>

              {students.length === 0 ? (
                <div style={{ ...C.card, padding: '3.5rem', textAlign: 'center' }}>
                  <Users size={44} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
                  <p style={{ color: '#64748b', fontWeight: 700, margin: '0 0 1rem' }}>Henüz sınıfınıza öğrenci eklemediniz.</p>
                  <button onClick={() => setShowAddStudentModal(true)} style={{ ...C.btnPrimary, margin: '0 auto' }}>
                    <UserPlus size={15} /> Öğrenci Ekle
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div style={{ ...C.card, overflow: 'hidden', display: window.innerWidth < 768 ? 'none' : 'block' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                          {['Öğrenci', 'Sınıfı', 'E-posta', 'Şifre', 'Çözülen', 'Koçluk', ''].map(h => (
                            <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, i) => {
                          const solved = submissions.filter(s => s.studentId === student.id).length;
                          const isCoached = coachedIds.includes(student.id);
                          const gObj = data?.grades?.find(g => String(g.id) === String(student.gradeId) || String(g.id) === String(student.classId))
                                    || data?.grades?.find(g => g.name === student.gradeId || g.name === student.grade || g.name === student.className);
                          return (
                            <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                  <Avatar name={student.name} index={i} size={34} />
                                  <span style={{ fontWeight: 800, color: '#1e293b' }}>{student.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <select
                                  value={gObj ? gObj.id : (student.gradeId || '')}
                                  onChange={async (e) => {
                                    const gId = e.target.value;
                                    const gName = data?.grades?.find(g => String(g.id) === String(gId))?.name || gId;
                                    await updateUser(student.id, { gradeId: gId, classId: gId, grade: gName, className: gName });
                                  }}
                                  style={{ padding: '0.3rem 0.6rem', borderRadius: '0.6rem', border: '1.5px solid #dbeafe', background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', outline: 'none' }}
                                >
                                  <option value="">— Sınıf Seçiniz</option>
                                  {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>{student.email}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span style={{ padding: '0.25rem 0.6rem', borderRadius: '0.5rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.75rem' }}>
                                  🔑 {student.password || '123456'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 900, color: '#334155' }}>{solved}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                {isCoached ? (
                                  <span style={{ padding: '0.2rem 0.65rem', borderRadius: '1rem', background: '#f3e8ff', color: '#7c3aed', fontWeight: 800, fontSize: '0.68rem' }}>🎯 Koçlukta</span>
                                ) : (
                                  <span style={{ color: '#cbd5e1', fontWeight: 700 }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                <button onClick={() => openEditStudentModal(student)}
                                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '0.6rem', padding: '0.35rem 0.75rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.72rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = '#fff'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
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

                  {/* Mobile cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                    {students.map((student, i) => {
                      const grade = data.grades.find(g => String(g.id) === String(student.gradeId) || String(g.id) === String(student.classId))
                                 || data.grades.find(g => g.name === student.gradeId || g.name === student.grade || g.name === student.className);
                      const solved  = submissions.filter(s => s.studentId === student.id).length;
                      const isCoached = coachedIds.includes(student.id);
                      return (
                        <div key={student.id} style={{ ...C.card, padding: '1.1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <Avatar name={student.name} index={i} size={38} />
                              <div>
                                <p style={{ margin: 0, fontWeight: 900, fontSize: '0.88rem', color: '#1e293b' }}>{student.name}</p>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '1rem', background: '#dbeafe', color: '#1d4ed8', display: 'inline-block' }}>
                                  {grade?.name || 'Sınıf Yok'}
                                </span>
                              </div>
                            </div>
                            <button onClick={() => openEditStudentModal(student)}
                              style={{ background: '#f1f5f9', border: 'none', borderRadius: '0.6rem', padding: '0.4rem', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                              <Edit2 size={14} />
                            </button>
                          </div>
                          <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '0.65rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.75rem' }}>
                            <p style={{ margin: '0 0 0.25rem', color: '#64748b' }}>📧 {student.email}</p>
                            <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 900, color: '#d97706' }}>🔑 {student.password || '123456'}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: '#64748b', fontWeight: 700 }}>Çözülen: <strong style={{ color: '#1e293b' }}>{solved}</strong></span>
                            {isCoached && <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '1rem', background: '#f3e8ff', color: '#7c3aed' }}>🎯 Koçlukta</span>}
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
              <div style={{ ...C.card, padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
                <h3 style={{ margin: '0 0 0.3rem', fontWeight: 900, fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Target size={16} color="#8b5cf6" /> Koçluk Sistemi Takibi
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Bireysel koçluk takibine almak istediğiniz öğrencileri seçin ve detaylı yol haritasını görüntüleyin.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
                {students.map((std, i) => {
                  const isCoached = coachedIds.includes(std.id);
                  return (
                    <div key={std.id} style={{ ...C.card, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Avatar name={std.name} index={i} size={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.88rem', color: '#1e293b' }}>{std.name}</h4>
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{std.email}</p>
                        </div>
                        <button
                          onClick={() => toggleCoachedStudent(currentUser?.id || 'teacher_1', std.id)}
                          style={{
                            padding: '0.3rem 0.75rem', borderRadius: '1rem', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900,
                            background: isCoached ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : '#f1f5f9',
                            color: isCoached ? '#fff' : '#64748b',
                            boxShadow: isCoached ? '0 2px 8px rgba(139,92,246,0.3)' : 'none',
                            transition: 'all 0.18s', flexShrink: 0,
                          }}>
                          {isCoached ? '✓ Koçlukta' : '+ Ekle'}
                        </button>
                      </div>
                      <Link to={`/coaching/${std.id}`} style={{ textDecoration: 'none' }}>
                        <button style={{
                          width: '100%', padding: '0.6rem', borderRadius: '0.75rem',
                          background: isCoached ? 'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(99,102,241,0.08))' : '#f8fafc',
                          border: `1.5px solid ${isCoached ? 'rgba(139,92,246,0.2)' : '#e2e8f0'}`,
                          color: isCoached ? '#7c3aed' : '#64748b',
                          fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                          transition: 'all 0.15s',
                        }}>
                          <Map size={14} /> Yol Haritası & Detaylar <ChevronRight size={13} />
                        </button>
                      </Link>
                    </div>
                  );
                })}
                {students.length === 0 && (
                  <div style={{ ...C.card, padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                    <Target size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
                    <p style={{ color: '#94a3b8', fontWeight: 700, margin: 0 }}>Sınıfınıza öğrenci ekledikten sonra koçluk takibini başlatabilirsiniz.</p>
                  </div>
                )}
              </div>
            </div>
          )}



        </div>
      </main>

      {/* ══════════ MODAL: TEST OLUŞTUR ══════════ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '1.5rem', width: '100%', maxWidth: 520, padding: '1.75rem', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1.5px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: '0.6rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={16} color="#fff" />
                </div>
                {editingTestId ? 'Testi Düzenle' : 'Yeni Test Oluştur'}
              </h3>
              <button onClick={resetForm} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={C.label}>Test Adı *</label>
                <input type="text" required placeholder="Örn: 8. Sınıf Üslü Sayılar" value={testName} onChange={e => setTestName(e.target.value)} style={C.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={C.label}>Soru Başı Süre (dk)</label>
                  <input type="number" min="1" value={timePerQ} onChange={e => setTimePerQ(e.target.value)} style={C.input} />
                </div>
                <div>
                  <label style={C.label}>Sınıf</label>
                  <select value={selGrade} onChange={e => { setSelGrade(e.target.value); setSelSubject(''); setSelUnit(''); setSelTopic(''); setSelQIds([]); }} style={C.input}>
                    <option value="">Sınıf Seçiniz</option>
                    <option value="all">Tüm Sınıflar</option>
                    {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              {selGrade && (
                <div>
                  <label style={C.label}>Ders</label>
                  <select value={selSubject} onChange={e => { setSelSubject(e.target.value); setSelUnit(''); setSelTopic(''); setSelQIds([]); }} style={C.input}>
                    <option value="">Ders Seçiniz</option>
                    <option value="all">Tüm Dersler</option>
                    {filtSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {selSubject && (
                <div>
                  <label style={C.label}>Ünite</label>
                  <select value={selUnit} onChange={e => { setSelUnit(e.target.value); setSelTopic(''); setSelQIds([]); }} style={C.input}>
                    <option value="">Ünite Seçiniz</option>
                    <option value="all">Tüm Üniteler</option>
                    {filtUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              {selUnit && (
                <div>
                  <label style={C.label}>Konu</label>
                  <select value={selTopic} onChange={e => { setSelTopic(e.target.value); setSelQIds([]); }} style={C.input}>
                    <option value="">Konu Seçiniz</option>
                    <option value="all">Tüm Konular</option>
                    {filtTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              {catId && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ ...C.label, margin: 0 }}>Soru Havuzu ({poolQs.length} soru)</label>
                    <button type="button" onClick={() => setSelQIds(selQIds.length === poolQs.length ? [] : poolQs.map(q => q.id))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800, color: '#6366f1' }}>
                      {selQIds.length === poolQs.length ? 'Seçimleri Kaldır' : 'Tümünü Seç'}
                    </button>
                  </div>
                  {poolQs.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', margin: 0 }}>
                      Bu kategoride henüz soru eklenmemiş.
                    </p>
                  ) : (
                    <div style={{ maxHeight: 160, overflowY: 'auto', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.5rem' }}>
                      {poolQs.map(q => (
                        <label key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                          <input type="checkbox" checked={selQIds.includes(q.id)} onChange={() => toggleQ(q.id)} />
                          {q.title || q.name || 'Soru'}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button type="submit" disabled={selQIds.length === 0} style={{
                ...C.btnPrimary, justifyContent: 'center', padding: '0.8rem',
                opacity: selQIds.length === 0 ? 0.4 : 1,
                cursor: selQIds.length === 0 ? 'not-allowed' : 'pointer',
                width: '100%',
              }}>
                {editingTestId ? 'Testi Güncelle' : `Test Oluştur (${selQIds.length} Soru Seçildi)`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: ÖĞRENCİ EKLE ══════════ */}
      {showAddStudentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '1.5rem', width: '100%', maxWidth: 460, padding: '1.75rem', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1.5px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: '0.6rem', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={15} color="#fff" />
                </div>
                Sınıfıma Öğrenci Ekle
              </h3>
              <button onClick={() => setShowAddStudentModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>

            {/* Quick link existing student */}
            {(() => {
              const unassigned = (users || []).filter(u => u.role === 'student' && !u.teacherId);
              if (!unassigned.length) return null;
              return (
                <div style={{ background: '#eff6ff', borderRadius: '0.85rem', border: '1.5px solid #bfdbfe', padding: '0.85rem', marginBottom: '1rem' }}>
                  <label style={{ ...C.label, color: '#1d4ed8', marginBottom: '0.5rem' }}>💡 Sahipsiz Öğrenci Bağla</label>
                  <select defaultValue="" onChange={async (e) => {
                    if (!e.target.value) return;
                    const s = unassigned.find(x => x.id === e.target.value);
                    if (s) { await updateUser(s.id, { teacherId: currentUser.id }); setShowAddStudentModal(false); alert(`🎉 ${s.name} sınıfınıza bağlandı!`); }
                  }} style={{ ...C.input, color: '#1d4ed8', borderColor: '#bfdbfe', background: '#fff' }}>
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
                <label style={C.label}>Öğrenci Adı Soyadı *</label>
                <input type="text" required placeholder="Örn: Ahmet Yılmaz" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} style={C.input} />
              </div>
              <div>
                <label style={C.label}>E-posta / Kullanıcı Adı (opsiyonel)</label>
                <input type="text" placeholder="Örn: ahmet veya ahmet@gmail.com" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} style={C.input} />
              </div>
              <div>
                <label style={C.label}>Giriş Şifresi *</label>
                <input type="text" required placeholder="Örn: 123456" value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)}
                  style={{ ...C.input, borderColor: '#fde68a', background: '#fffbeb', color: '#92400e', fontFamily: 'monospace', fontWeight: 900 }} />
              </div>
              <div>
                <label style={C.label}>Sınıf Seviyesi</label>
                <select value={newStudentGrade} onChange={e => setNewStudentGrade(e.target.value)} style={C.input}>
                  {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddStudentModal(false)}
                  style={{ flex: 1, padding: '0.7rem', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 800, fontSize: '0.82rem', color: '#64748b', cursor: 'pointer' }}>
                  İptal
                </button>
                <button type="submit" style={{ ...C.btnSuccess, flex: 1, justifyContent: 'center', padding: '0.7rem' }}>
                  💾 Kaydet & Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: ÖĞRENCİ DÜZENLE ══════════ */}
      {editingStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '1.5rem', width: '100%', maxWidth: 460, padding: '1.75rem', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1.5px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: '0.6rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={14} color="#fff" />
                </div>
                Öğrenci Bilgilerini Düzenle
              </h3>
              <button onClick={() => setEditingStudent(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
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
                <label style={C.label}>Öğrenci Adı Soyadı *</label>
                <input type="text" required value={editStudentName} onChange={e => setEditStudentName(e.target.value)} style={C.input} />
              </div>
              <div>
                <label style={C.label}>E-posta / Kullanıcı Adı</label>
                <input type="text" value={editStudentEmail} onChange={e => setEditStudentEmail(e.target.value)} style={C.input} />
              </div>
              <div>
                <label style={C.label}>Giriş Şifresi *</label>
                <input type="text" required value={editStudentPassword} onChange={e => setEditStudentPassword(e.target.value)}
                  style={{ ...C.input, borderColor: '#fde68a', background: '#fffbeb', color: '#92400e', fontFamily: 'monospace', fontWeight: 900 }} />
              </div>
              <div>
                <label style={C.label}>Sınıf Seviyesi</label>
                <select value={editStudentGrade} onChange={e => setEditStudentGrade(e.target.value)} style={C.input}>
                  {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditingStudent(null)}
                  style={{ flex: 1, padding: '0.7rem', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 800, fontSize: '0.82rem', color: '#64748b', cursor: 'pointer' }}>
                  İptal
                </button>
                <button type="submit" style={{ ...C.btnPrimary, flex: 1, justifyContent: 'center', padding: '0.7rem' }}>
                  💾 Güncelle & Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* responsive tweaks */}
      <style>{`
        @media (max-width: 640px) {
          .sm-show { display: inline !important; }
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9px; }
      `}</style>
    </div>
  );
}
