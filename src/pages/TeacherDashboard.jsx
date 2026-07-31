import { useState, useMemo } from 'react';
import {
  Plus, TrendingUp, X, Edit2, Users, BookOpen, ClipboardCheck,
  BarChart2, Target, Zap, Award, Clock, CheckCircle2, AlertCircle,
  ChevronRight, FileText, Star, Activity, GraduationCap, Search,
  Filter, Trash2, Eye, ArrowUpRight, Calendar, BookMarked, Layers
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, gradient, glow }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '1.25rem',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${glow}`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Glow blob */}
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: gradient, opacity: 0.25, filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '0.75rem', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${glow}` }}>
          <Icon size={20} color="white" />
        </div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem', fontWeight: 600 }}>{sub}</div>}
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.5rem' }}>{label}</div>
    </div>
  );
}

// ─── Test Card ────────────────────────────────────────────────────────────────
const subjectColors = {
  'Matematik': { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)', badge: '#6366f1', text: '#a5b4fc' },
  'Fen Bilimleri': { bg: 'rgba(20,184,166,0.15)', border: 'rgba(20,184,166,0.3)', badge: '#14b8a6', text: '#5eead4' },
  'Türkçe': { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', badge: '#f97316', text: '#fdba74' },
  'Sosyal Bilgiler': { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', badge: '#a855f7', text: '#d8b4fe' },
  'İngilizce': { bg: 'rgba(244,63,94,0.15)', border: 'rgba(244,63,94,0.3)', badge: '#f43f5e', text: '#fda4af' },
};
const getSubjectColor = (sub) => subjectColors[sub] || { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', badge: '#64748b', text: '#94a3b8' };

function TestCard({ test, onEdit }) {
  const sc = getSubjectColor(test.subject);
  return (
    <div style={{
      background: sc.bg,
      border: `1px solid ${sc.border}`,
      borderRadius: '1rem',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, background: sc.badge, color: 'white', padding: '0.2rem 0.6rem', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {test.subject}
        </span>
        <button
          onClick={() => onEdit(test)}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem', padding: '0.35rem 0.6rem', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700 }}
        >
          <Edit2 size={12} /> Düzenle
        </button>
      </div>
      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'white', lineHeight: 1.3 }}>{test.title}</div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: sc.text }}>
          <FileText size={12} /> {test.questions || 0} Soru
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
          <Clock size={12} /> {test.time || 0} dk
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
          <Calendar size={12} /> {new Date(test.date).toLocaleDateString('tr-TR')}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const selectStyle = {
  padding: '0.75rem 1rem',
  borderRadius: '0.75rem',
  border: '1px solid rgba(255,255,255,0.15)',
  fontFamily: 'inherit',
  background: 'rgba(15,23,42,0.8)',
  color: 'white',
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
};

export default function TeacherDashboard() {
  const { data, addTest, updateTest } = useCurriculum();
  const { questions } = useQuestionBank();
  const { homeworks = [] } = useHomework();
  const { submissions = [] } = useEvaluation();
  const { users = [] } = useUser();
  const { currentUser } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);
  const [testName, setTestName] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(2);
  const [selGrade, setSelGrade] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selUnit, setSelUnit] = useState('');
  const [selTopic, setSelTopic] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const filteredSubjects = selGrade === 'all' ? data.subjects : data.subjects.filter(s => s.gradeId === selGrade);
  const filteredUnits = selSubject === 'all' ? data.units : data.units.filter(u => u.subjectId === selSubject);
  const filteredTopics = selUnit === 'all' ? data.topics : data.topics.filter(t => t.unitId === selUnit);

  const getCurrentCategoryId = () => {
    if (selTopic && selTopic !== 'all') return selTopic;
    if (selTopic === 'all') return `unit_${selUnit}_all`;
    if (selUnit === 'all') return `sub_${selSubject}_all`;
    if (selSubject === 'all') return `grade_${selGrade}_all`;
    if (selGrade === 'all') return `global_all`;
    return null;
  };

  const categoryId = getCurrentCategoryId();
  const filteredQuestions = questions.filter(q => q.topicId === categoryId);

  const handleToggleQuestion = (id) => {
    setSelectedQuestionIds(prev =>
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const openEditModal = (test) => {
    setEditingTestId(test.id);
    setTestName(test.title);
    setTimePerQuestion(test.timePerQuestion || 2);
    setSelectedQuestionIds(test.questionIds || []);
    if (test.filters) {
      setSelGrade(test.filters.selGrade);
      setSelSubject(test.filters.selSubject);
      setSelUnit(test.filters.selUnit);
      setSelTopic(test.filters.selTopic);
    } else {
      setSelGrade(''); setSelSubject(''); setSelUnit(''); setSelTopic('');
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingTestId(null);
    setTestName('');
    setTimePerQuestion(2);
    setSelGrade(''); setSelSubject(''); setSelUnit(''); setSelTopic('');
    setSelectedQuestionIds([]);
    setShowModal(false);
  };

  const handleCreateTest = (e) => {
    e.preventDefault();
    if (!testName || !categoryId || selectedQuestionIds.length === 0) return;
    const selectedQuestions = filteredQuestions.filter(q => selectedQuestionIds.includes(q.id));
    const totalQuestions = selectedQuestions.reduce((sum, q) => sum + (q.isBundle ? (q.questionCount || 1) : 1), 0);
    let subjectName = 'Genel (Tümü)';
    if (selSubject !== 'all' && selSubject !== '') {
      subjectName = data.subjects.find(s => s.id === selSubject)?.name || subjectName;
    }
    const testPayload = {
      title: testName,
      subject: subjectName,
      topicId: categoryId,
      questions: totalQuestions,
      questionIds: selectedQuestionIds,
      timePerQuestion: parseInt(timePerQuestion, 10),
      time: totalQuestions * parseInt(timePerQuestion, 10),
      color: 'primary',
      filters: { selGrade, selSubject, selUnit, selTopic }
    };
    if (editingTestId) { updateTest(editingTestId, testPayload); }
    else { addTest(testPayload); }
    resetForm();
  };

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const students = users.filter(u => u.role === 'student');
  const totalTests = data.tests.length;
  const totalHomeworks = homeworks.length;
  const totalSubmissions = submissions.length;
  const totalQuestions = questions.length;

  // Test filter
  const allSubjects = [...new Set(data.tests.map(t => t.subject).filter(Boolean))];
  const visibleTests = data.tests.filter(t => {
    const matchSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = !filterSubject || t.subject === filterSubject;
    return matchSearch && matchSubject;
  });

  // Recent activity (last 5 submissions)
  const recentSubmissions = [...submissions]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 5);

  const tabs = [
    { id: 'overview', label: 'Genel Bakış', icon: Activity },
    { id: 'tests', label: 'Testler', icon: FileText },
    { id: 'students', label: 'Öğrenciler', icon: Users },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', padding: '1.5rem', fontFamily: 'inherit' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.4rem' }}>
            🎓 Öğretmen Paneli
          </div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 900, color: 'white', margin: 0 }}>
            Hoş Geldiniz, {currentUser?.name?.split(' ')[0] || 'Öğretmen'} 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
            Sınıfınızı yönetin, testler oluşturun ve öğrenci gelişimini takip edin.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.5rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 800, fontSize: '0.9rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.4)', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.4)'; }}
        >
          <Plus size={18} /> Yeni Test Oluştur
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={FileText} label="Toplam Test" value={totalTests} sub="oluşturulmuş" gradient="linear-gradient(135deg,#6366f1,#8b5cf6)" glow="rgba(99,102,241,0.4)" />
        <StatCard icon={Users} label="Öğrenci" value={students.length} sub="kayıtlı" gradient="linear-gradient(135deg,#06b6d4,#3b82f6)" glow="rgba(59,130,246,0.4)" />
        <StatCard icon={BookOpen} label="Ödev" value={totalHomeworks} sub="verilmiş" gradient="linear-gradient(135deg,#f97316,#ef4444)" glow="rgba(239,68,68,0.4)" />
        <StatCard icon={ClipboardCheck} label="Çözülen" value={totalSubmissions} sub="sınav" gradient="linear-gradient(135deg,#10b981,#14b8a6)" glow="rgba(16,185,129,0.4)" />
        <StatCard icon={Layers} label="Soru" value={totalQuestions} sub="bankada" gradient="linear-gradient(135deg,#a855f7,#ec4899)" glow="rgba(168,85,247,0.4)" />
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '1rem', padding: '0.4rem', width: 'fit-content' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.1rem', borderRadius: '0.65rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s', background: active ? 'rgba(99,102,241,0.85)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.45)', boxShadow: active ? '0 4px 12px rgba(99,102,241,0.35)' : 'none' }}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Recent Tests */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <FileText size={18} color="#818cf8" /> Son Testler
              </h3>
              <button onClick={() => setActiveTab('tests')} style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                Tümü <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.tests.slice(-5).reverse().map(test => {
                const sc = getSubjectColor(test.subject);
                return (
                  <div key={test.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: '0.75rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.badge, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test.title}</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{test.questions} soru · {test.time} dk</div>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, background: sc.badge, color: 'white', padding: '0.15rem 0.5rem', borderRadius: '99px', whiteSpace: 'nowrap' }}>{test.subject}</span>
                  </div>
                );
              })}
              {data.tests.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                  Henüz test oluşturulmadı
                </div>
              )}
            </div>
          </div>

          {/* Recent Submissions */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Activity size={18} color="#10b981" /> Son Aktiviteler
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentSubmissions.map((sub, i) => {
                const student = users.find(u => u.id === sub.studentId);
                const test = data.tests.find(t => t.id === sub.testId);
                const score = sub.score !== undefined ? `${sub.score}%` : '—';
                return (
                  <div key={sub.id || i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, color: 'white', flexShrink: 0 }}>
                      {(student?.name || 'Ö').charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student?.name || 'Öğrenci'}</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test?.title || 'Test'}</div>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 900, color: parseInt(score) >= 70 ? '#10b981' : '#f43f5e', flexShrink: 0 }}>{score}</div>
                  </div>
                );
              })}
              {recentSubmissions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                  Henüz çözülen sınav yok
                </div>
              )}
            </div>
          </div>

          {/* Grade Distribution */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem', padding: '1.5rem', gridColumn: '1 / -1' }}>
            <h3 style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.25rem' }}>
              <GraduationCap size={18} color="#06b6d4" /> Sınıf Bazında Öğrenci Dağılımı
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {data.grades.map(grade => {
                const count = students.filter(s => s.gradeId === grade.id).length;
                const pct = students.length ? Math.round((count / students.length) * 100) : 0;
                return (
                  <div key={grade.id} style={{ flex: '1 1 140px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '0.85rem', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>{count}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#67e8f9', marginTop: '0.25rem' }}>{grade.name}</div>
                    <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', height: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#06b6d4,#3b82f6)', borderRadius: '99px', transition: 'width 1s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, marginTop: '0.3rem' }}>{pct}%</div>
                  </div>
                );
              })}
              {data.grades.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', padding: '1rem' }}>Sınıf tanımlanmamış</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tests Tab ── */}
      {activeTab === 'tests' && (
        <div>
          {/* Search + Filter */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
              <input
                placeholder="Test ara..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ ...selectStyle, paddingLeft: '2.5rem' }}
              />
            </div>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ ...selectStyle, flex: '0 1 180px' }}>
              <option value="">Tüm Dersler</option>
              {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Test Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {/* Create New Card */}
            <div
              onClick={() => { resetForm(); setShowModal(true); }}
              style={{ background: 'rgba(99,102,241,0.08)', border: '2px dashed rgba(99,102,241,0.4)', borderRadius: '1rem', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', minHeight: '160px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
            >
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={26} color="#818cf8" />
              </div>
              <span style={{ fontWeight: 800, color: '#818cf8', fontSize: '0.9rem' }}>Yeni Test Oluştur</span>
            </div>

            {visibleTests.map(test => (
              <TestCard key={test.id} test={test} onEdit={openEditModal} />
            ))}

            {visibleTests.length === 0 && searchQuery === '' && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
                Henüz test oluşturulmadı. Yeni test ekleyin!
              </div>
            )}
            {visibleTests.length === 0 && searchQuery !== '' && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
                Arama sonucu bulunamadı.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Students Tab ── */}
      {activeTab === 'students' && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'white', fontWeight: 800, fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#06b6d4" /> Kayıtlı Öğrenciler <span style={{ fontSize: '0.75rem', background: 'rgba(6,182,212,0.15)', color: '#67e8f9', borderRadius: '99px', padding: '0.15rem 0.6rem', fontWeight: 700 }}>{students.length}</span>
            </h3>
          </div>
          <div style={{ padding: '0.5rem' }}>
            {students.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                Kayıtlı öğrenci yok.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Öğrenci', 'Sınıf', 'E-posta', 'Çözülen Sınav'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, i) => {
                    const grade = data.grades.find(g => g.id === student.gradeId);
                    const solved = submissions.filter(s => s.studentId === student.id).length;
                    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f97316', '#a855f7', '#f43f5e'];
                    const color = colors[i % colors.length];
                    return (
                      <tr key={student.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900, color: 'white', flexShrink: 0 }}>
                              {student.name?.charAt(0) || 'Ö'}
                            </div>
                            <div style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>{student.name}</div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(6,182,212,0.15)', color: '#67e8f9', borderRadius: '99px', padding: '0.2rem 0.6rem' }}>
                            {grade?.name || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>{student.email}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontWeight: 800, color: solved > 0 ? '#10b981' : 'rgba(255,255,255,0.25)', fontSize: '0.88rem' }}>{solved}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto', background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,27,75,0.98))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '1.5rem', padding: '2rem', boxShadow: '0 24px 80px rgba(99,102,241,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <div>
                <h2 style={{ color: 'white', fontWeight: 900, fontSize: '1.25rem', margin: 0 }}>
                  {editingTestId ? '✏️ Testi Düzenle' : '🚀 Yeni Test Oluştur'}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', margin: '0.3rem 0 0' }}>Soru bankasından sorular seçerek test oluşturun</p>
              </div>
              <button onClick={resetForm} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.75rem', padding: '0.6rem', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Test Adı (Örn: Doğal Sayılar Quiz 1)"
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                  style={{ ...selectStyle, flex: '3 1 200px' }}
                  required
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.75rem', padding: '0.5rem 0.85rem', flex: '1 1 120px' }}>
                  <Clock size={14} color="rgba(255,255,255,0.4)" />
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>Soru/Dk:</label>
                  <input type="number" min="1" max="60" value={timePerQuestion} onChange={e => setTimePerQuestion(e.target.value)} style={{ border: 'none', outline: 'none', width: '45px', fontWeight: 800, background: 'transparent', color: 'white' }} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <select value={selGrade} onChange={e => { setSelGrade(e.target.value); setSelSubject(''); setSelUnit(''); setSelTopic(''); }} style={selectStyle} required>
                  <option value="">Sınıf Seçin...</option>
                  <option value="all">Tümü (Genel)</option>
                  {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <select value={selSubject} onChange={e => { setSelSubject(e.target.value); setSelUnit(''); setSelTopic(''); }} style={selectStyle} disabled={!selGrade} required>
                  <option value="">Ders Seçin...</option>
                  <option value="all">Tümü (Genel)</option>
                  {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={selUnit} onChange={e => { setSelUnit(e.target.value); setSelTopic(''); }} style={selectStyle} disabled={!selSubject} required>
                  <option value="">Ünite Seçin...</option>
                  <option value="all">Tümü (Genel)</option>
                  {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select value={selTopic} onChange={e => setSelTopic(e.target.value)} style={selectStyle} disabled={!selUnit} required>
                  <option value="">Konu Seçin...</option>
                  <option value="all">Tümü (Genel)</option>
                  {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {categoryId && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', margin: 0 }}>📚 Havuzdaki Sorular</h4>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: '99px', padding: '0.2rem 0.7rem' }}>
                      {selectedQuestionIds.length}/{filteredQuestions.length} seçili
                    </span>
                  </div>
                  {filteredQuestions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#f43f5e', fontSize: '0.85rem', background: 'rgba(244,63,94,0.08)', borderRadius: '0.75rem', border: '1px solid rgba(244,63,94,0.2)' }}>
                      Bu kategoriye ait soru bulunamadı. Önce Soru Bankası'ndan soru ekleyin.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                      {filteredQuestions.map(q => {
                        const selected = selectedQuestionIds.includes(q.id);
                        return (
                          <label key={q.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.85rem', background: selected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selected ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                            <input type="checkbox" checked={selected} onChange={() => handleToggleQuestion(q.id)} style={{ accentColor: '#6366f1', width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: selected ? '#a5b4fc' : 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                                {q.type === 'coktan_secmeli' ? '✅ Çoktan Seçmeli' : '✏️ Açık Uçlu'} · {q.contentType}
                              </div>
                              <div style={{ fontSize: '0.88rem', color: 'white', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.questionText}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={selectedQuestionIds.length === 0}
                style={{ padding: '0.9rem', borderRadius: '0.85rem', background: selectedQuestionIds.length === 0 ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 800, fontSize: '0.95rem', border: 'none', cursor: selectedQuestionIds.length === 0 ? 'not-allowed' : 'pointer', boxShadow: selectedQuestionIds.length > 0 ? '0 4px 20px rgba(99,102,241,0.4)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {editingTestId ? <><Edit2 size={16} /> Testi Güncelle</> : <><Plus size={16} /> Testi Oluştur ({selectedQuestionIds.length} Soru)</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
