import { useState } from 'react';
import {
  Plus, X, Edit2, Users, BookOpen, ClipboardCheck,
  Clock, ChevronRight, FileText, Activity, GraduationCap,
  Search, Calendar, Layers, BarChart3, TrendingUp
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';

/* ─── Renk Paleti ─────────────────────────────────────────────────── */
const subjectColors = {
  'Matematik':       { light: '#eff6ff', border: '#bfdbfe', badge: '#3b82f6', dark: '#1d4ed8', text: '#1e40af' },
  'Fen Bilimleri':   { light: '#f0fdf4', border: '#bbf7d0', badge: '#22c55e', dark: '#16a34a', text: '#15803d' },
  'Türkçe':          { light: '#fff7ed', border: '#fed7aa', badge: '#f97316', dark: '#ea580c', text: '#c2410c' },
  'Sosyal Bilgiler': { light: '#faf5ff', border: '#e9d5ff', badge: '#a855f7', dark: '#9333ea', text: '#7e22ce' },
  'İngilizce':       { light: '#fff1f2', border: '#fecdd3', badge: '#f43f5e', dark: '#e11d48', text: '#be123c' },
};
const getSubC = (sub) => subjectColors[sub] || { light: '#f8fafc', border: '#e2e8f0', badge: '#64748b', dark: '#475569', text: '#334155' };

/* ─── Stat Card ────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${color}33`,
      borderRadius: '1rem',
      padding: '1rem',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      transition: 'transform 0.18s, box-shadow 0.18s',
      cursor: 'default'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${color}33`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; }}
    >
      <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>{sub}</div>}
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Test Card ────────────────────────────────────────────────────── */
function TestCard({ test, onEdit }) {
  const sc = getSubC(test.subject);
  return (
    <div style={{
      background: 'white',
      border: `1px solid ${sc.border}`,
      borderRadius: '0.85rem',
      padding: '0.9rem',
      display: 'flex', flexDirection: 'column', gap: '0.8rem',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      transition: 'transform 0.18s, box-shadow 0.18s',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 800, background: sc.badge, color: 'white', padding: '0.2rem 0.65rem', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {test.subject}
        </span>
        <button onClick={() => onEdit(test)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.3rem 0.65rem', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
        >
          <Edit2 size={11} /> Düzenle
        </button>
      </div>
      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.35 }}>{test.title}</div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.7rem', fontWeight: 700, color: sc.text, background: sc.light, border: `1px solid ${sc.border}`, borderRadius: '99px', padding: '0.15rem 0.55rem' }}>
          <FileText size={11} /> {test.questions || 0} Soru
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>
          <Clock size={11} /> {test.time || 0} dk
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8' }}>
          <Calendar size={11} /> {new Date(test.date).toLocaleDateString('tr-TR')}
        </span>
      </div>
    </div>
  );
}

/* ─── Select Style (modal) ──────────────────────────────────────────── */
const selStyle = {
  padding: '0.7rem 0.9rem',
  borderRadius: '0.7rem',
  border: '1.5px solid #e2e8f0',
  fontFamily: 'inherit',
  background: 'white',
  color: '#0f172a',
  fontSize: '0.88rem',
  outline: 'none',
  width: '100%',
};

/* ─── Main ────────────────────────────────────────────────────────── */
export default function TeacherDashboard() {
  const { data, addTest, updateTest } = useCurriculum();
  const { questions } = useQuestionBank();
  const { homeworks = [] } = useHomework();
  const { submissions = [] } = useEvaluation();
  const { users = [] } = useUser();
  const { currentUser } = useAuth();

  const [showModal, setShowModal]         = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);
  const [testName, setTestName]           = useState('');
  const [timePerQ, setTimePerQ]           = useState(2);
  const [selGrade, setSelGrade]           = useState('');
  const [selSubject, setSelSubject]       = useState('');
  const [selUnit, setSelUnit]             = useState('');
  const [selTopic, setSelTopic]           = useState('');
  const [selQIds, setSelQIds]             = useState([]);
  const [searchQ, setSearchQ]             = useState('');
  const [filterSub, setFilterSub]         = useState('');
  const [tab, setTab]                     = useState('overview');

  const filtSubs   = selGrade === 'all'   ? data.subjects : data.subjects.filter(s => s.gradeId === selGrade);
  const filtUnits  = selSubject === 'all' ? data.units    : data.units.filter(u => u.subjectId === selSubject);
  const filtTopics = selUnit === 'all'    ? data.topics   : data.topics.filter(t => t.unitId === selUnit);

  const getCatId = () => {
    if (selTopic   && selTopic   !== 'all') return selTopic;
    if (selTopic   === 'all') return `unit_${selUnit}_all`;
    if (selUnit    === 'all') return `sub_${selSubject}_all`;
    if (selSubject === 'all') return `grade_${selGrade}_all`;
    if (selGrade   === 'all') return `global_all`;
    return null;
  };
  const catId    = getCatId();
  const poolQs   = questions.filter(q => q.topicId === catId);

  const toggleQ = id => setSelQIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const openEdit = (test) => {
    setEditingTestId(test.id); setTestName(test.title); setTimePerQ(test.timePerQuestion || 2);
    setSelQIds(test.questionIds || []);
    if (test.filters) { const f = test.filters; setSelGrade(f.selGrade); setSelSubject(f.selSubject); setSelUnit(f.selUnit); setSelTopic(f.selTopic); }
    else { setSelGrade(''); setSelSubject(''); setSelUnit(''); setSelTopic(''); }
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
    let subName  = 'Genel (Tümü)';
    if (selSubject !== 'all' && selSubject !== '') subName = data.subjects.find(s => s.id === selSubject)?.name || subName;
    const payload = {
      title: testName, subject: subName, topicId: catId,
      questions: total, questionIds: selQIds,
      timePerQuestion: +timePerQ, time: total * +timePerQ,
      color: 'primary', filters: { selGrade, selSubject, selUnit, selTopic }
    };
    editingTestId ? updateTest(editingTestId, payload) : addTest(payload);
    resetForm();
  };

  /* stats */
  const students    = users.filter(u => u.role === 'student');
  const allSubjects = [...new Set(data.tests.map(t => t.subject).filter(Boolean))];
  const visibleTests = data.tests.filter(t => {
    const ms = !searchQ    || t.title.toLowerCase().includes(searchQ.toLowerCase());
    const mf = !filterSub  || t.subject === filterSub;
    return ms && mf;
  });
  const recentSubs = [...submissions].sort((a,b) => new Date(b.submittedAt||0) - new Date(a.submittedAt||0)).slice(0, 5);

  const tabs = [
    { id: 'overview', label: 'Genel Bakış', icon: Activity },
    { id: 'tests',    label: 'Testler',     icon: FileText },
    { id: 'students', label: 'Öğrenciler',  icon: Users },
  ];

  /* ─── Render ─── */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#f0f4ff 0%,#fafafa 60%,#f5f3ff 100%)', padding: 'clamp(1rem,3vw,2rem)', fontFamily: 'inherit' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.3rem' }}>
            🎓 Öğretmen Paneli
          </div>
          <h1 style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)', fontWeight: 900, color: '#0f172a', margin: 0 }}>
            Hoş Geldiniz, {currentUser?.name?.split(' ')[0] || 'Öğretmen'} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.86rem', marginTop: '0.3rem' }}>
            Sınıfınızı yönetin, testler oluşturun ve öğrenci gelişimini takip edin.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.4rem', borderRadius: '0.9rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 800, fontSize: '0.88rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(99,102,241,0.35)', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(99,102,241,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(99,102,241,0.35)'; }}
        >
          <Plus size={17} /> Yeni Test Oluştur
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={FileText}       label="Toplam Test"  value={data.tests.length} sub="oluşturulmuş" color="#6366f1" bg="#eff6ff" />
        <StatCard icon={Users}          label="Öğrenci"      value={students.length}   sub="kayıtlı"     color="#3b82f6" bg="#eff6ff" />
        <StatCard icon={BookOpen}       label="Ödev"         value={homeworks.length}  sub="verilmiş"    color="#f97316" bg="#fff7ed" />
        <StatCard icon={ClipboardCheck} label="Çözülen Sınav" value={submissions.length} sub="toplam"   color="#22c55e" bg="#f0fdf4" />
        <StatCard icon={Layers}         label="Soru Bankası" value={questions.length}  sub="soru"        color="#a855f7" bg="#faf5ff" />
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', background: '#f1f5f9', borderRadius: '0.85rem', padding: '0.35rem', width: 'fit-content' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.18s', background: active ? 'white' : 'transparent', color: active ? '#6366f1' : '#64748b', boxShadow: active ? '0 2px 10px rgba(0,0,0,0.1)' : 'none' }}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.5rem' }}>
          {/* Son Testler */}
          <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <FileText size={18} color="#6366f1" /> Son Testler
              </h3>
              <button onClick={() => setTab('tests')} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                Tümü <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {data.tests.slice(-5).reverse().map(test => {
                const sc = getSubC(test.subject);
                return (
                  <div key={test.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.9rem', background: sc.light, border: `1px solid ${sc.border}`, borderRadius: '0.75rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.badge, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.83rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test.title}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{test.questions} soru · {test.time} dk</div>
                    </div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, background: sc.badge, color: 'white', padding: '0.15rem 0.5rem', borderRadius: '99px', whiteSpace: 'nowrap' }}>{test.subject}</span>
                  </div>
                );
              })}
              {data.tests.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>Henüz test oluşturulmadı</div>}
            </div>
          </div>

          {/* Son Aktiviteler */}
          <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.25rem' }}>
              <Activity size={18} color="#22c55e" /> Son Aktiviteler
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {recentSubs.map((sub, i) => {
                const student = users.find(u => u.id === sub.studentId);
                const test    = data.tests.find(t => t.id === sub.testId);
                const score   = sub.score !== undefined ? `${sub.score}%` : '—';
                const good    = parseInt(score) >= 70;
                return (
                  <div key={sub.id || i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.9rem', background: good ? '#f0fdf4' : '#fff1f2', border: `1px solid ${good ? '#bbf7d0' : '#fecdd3'}`, borderRadius: '0.75rem' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: good ? '#22c55e' : '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, color: 'white', flexShrink: 0 }}>
                      {(student?.name || 'Ö').charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student?.name || 'Öğrenci'}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test?.title || 'Test'}</div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '0.9rem', color: good ? '#16a34a' : '#dc2626', flexShrink: 0 }}>{score}</div>
                  </div>
                );
              })}
              {recentSubs.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>Henüz çözülen sınav yok</div>}
            </div>
          </div>

          {/* Sınıf Dağılımı */}
          <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', gridColumn: '1 / -1' }}>
            <h3 style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.25rem' }}>
              <GraduationCap size={18} color="#3b82f6" /> Sınıf Bazında Öğrenci Dağılımı
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {data.grades.map(grade => {
                const count = students.filter(s => s.gradeId === grade.id).length;
                const pct   = students.length ? Math.round((count / students.length) * 100) : 0;
                return (
                  <div key={grade.id} style={{ flex: '1 1 130px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.9rem', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e40af' }}>{count}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.2rem' }}>{grade.name}</div>
                    <div style={{ marginTop: '0.75rem', background: '#dbeafe', borderRadius: '99px', height: '5px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#3b82f6)', borderRadius: '99px', transition: 'width 1s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, marginTop: '0.25rem' }}>{pct}%</div>
                  </div>
                );
              })}
              {data.grades.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '1rem' }}>Sınıf tanımlanmamış</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── TESTS TAB ── */}
      {tab === 'tests' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              <input placeholder="Test ara..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ ...selStyle, paddingLeft: '2.5rem' }} />
            </div>
            <select value={filterSub} onChange={e => setFilterSub(e.target.value)} style={{ ...selStyle, flex: '0 1 180px' }}>
              <option value="">Tüm Dersler</option>
              {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: '1rem' }}>
            {/* Yeni Test Kartı */}
            <div
              onClick={() => { resetForm(); setShowModal(true); }}
              style={{ background: 'white', border: '2px dashed #c7d2fe', borderRadius: '1.1rem', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', minHeight: '155px' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#6366f1'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
            >
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={24} color="#6366f1" />
              </div>
              <span style={{ fontWeight: 800, color: '#6366f1', fontSize: '0.88rem' }}>Yeni Test Oluştur</span>
            </div>
            {visibleTests.map(test => <TestCard key={test.id} test={test} onEdit={openEdit} />)}
            {visibleTests.length === 0 && searchQ === '' && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Henüz test oluşturulmadı.</div>
            )}
            {visibleTests.length === 0 && searchQ !== '' && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Arama sonucu bulunamadı.</div>
            )}
          </div>
        </div>
      )}

      {/* ── STUDENTS TAB ── */}
      {tab === 'students' && (
        <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
            <h3 style={{ color: '#0f172a', fontWeight: 800, fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#3b82f6" /> Kayıtlı Öğrenciler
              <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: '99px', padding: '0.15rem 0.6rem', fontWeight: 700 }}>{students.length}</span>
            </h3>
          </div>
          {students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.9rem' }}>Kayıtlı öğrenci yok.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Öğrenci', 'Sınıf', 'E-posta', 'Çözülen Sınav'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1.25rem', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, i) => {
                    const grade  = data.grades.find(g => g.id === student.gradeId);
                    const solved = submissions.filter(s => s.studentId === student.id).length;
                    const avatarColors = ['#6366f1','#3b82f6','#22c55e','#f97316','#a855f7','#f43f5e'];
                    const av = avatarColors[i % avatarColors.length];
                    return (
                      <tr key={student.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <td style={{ padding: '0.9rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: av, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900, color: 'white', flexShrink: 0 }}>
                              {student.name?.charAt(0) || 'Ö'}
                            </div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{student.name}</div>
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1.25rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', borderRadius: '99px', padding: '0.2rem 0.65rem' }}>
                            {grade?.name || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1.25rem', color: '#64748b', fontSize: '0.82rem' }}>{student.email}</td>
                        <td style={{ padding: '0.9rem 1.25rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: solved > 0 ? '#16a34a' : '#94a3b8' }}>{solved}</span>
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

      {/* ── MODAL ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '740px', maxHeight: '90vh', overflowY: 'auto', background: 'white', borderRadius: '1.5rem', padding: '2rem', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
              <div>
                <h2 style={{ color: '#0f172a', fontWeight: 900, fontSize: '1.2rem', margin: 0 }}>
                  {editingTestId ? '✏️ Testi Düzenle' : '🚀 Yeni Test Oluştur'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.3rem 0 0' }}>Soru bankasından sorular seçerek test oluşturun</p>
              </div>
              <button onClick={resetForm} style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.55rem', cursor: 'pointer', color: '#64748b', display: 'flex', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Test Adı (Örn: Doğal Sayılar Quiz 1)" value={testName} onChange={e => setTestName(e.target.value)} style={{ ...selStyle, flex: '3 1 200px' }} required />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '0.7rem', padding: '0.5rem 0.85rem', flex: '1 1 120px' }}>
                  <Clock size={14} color="#94a3b8" />
                  <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>Soru/Dk:</label>
                  <input type="number" min="1" max="60" value={timePerQ} onChange={e => setTimePerQ(e.target.value)} style={{ border: 'none', outline: 'none', width: '45px', fontWeight: 800, background: 'transparent', color: '#0f172a' }} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <select value={selGrade}   onChange={e => { setSelGrade(e.target.value); setSelSubject(''); setSelUnit(''); setSelTopic(''); }} style={selStyle} required>
                  <option value="">Sınıf Seçin...</option>
                  <option value="all">Tümü (Genel)</option>
                  {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <select value={selSubject} onChange={e => { setSelSubject(e.target.value); setSelUnit(''); setSelTopic(''); }} style={selStyle} disabled={!selGrade} required>
                  <option value="">Ders Seçin...</option>
                  <option value="all">Tümü (Genel)</option>
                  {filtSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={selUnit}    onChange={e => { setSelUnit(e.target.value); setSelTopic(''); }} style={selStyle} disabled={!selSubject} required>
                  <option value="">Ünite Seçin...</option>
                  <option value="all">Tümü (Genel)</option>
                  {filtUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select value={selTopic}   onChange={e => setSelTopic(e.target.value)} style={selStyle} disabled={!selUnit} required>
                  <option value="">Konu Seçin...</option>
                  <option value="all">Tümü (Genel)</option>
                  {filtTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {catId && (
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.88rem', margin: 0 }}>📚 Havuzdaki Sorular</h4>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#eff6ff', color: '#4338ca', borderRadius: '99px', padding: '0.2rem 0.7rem', border: '1px solid #c7d2fe' }}>
                      {selQIds.length}/{poolQs.length} seçili
                    </span>
                  </div>
                  {poolQs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#dc2626', fontSize: '0.85rem', background: '#fff1f2', borderRadius: '0.75rem', border: '1px solid #fecdd3' }}>
                      Bu kategoriye ait soru bulunamadı. Önce Soru Bankası'ndan soru ekleyin.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                      {poolQs.map(q => {
                        const sel = selQIds.includes(q.id);
                        return (
                          <label key={q.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.85rem', background: sel ? '#eff6ff' : 'white', border: `1.5px solid ${sel ? '#a5b4fc' : '#e2e8f0'}`, borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                            <input type="checkbox" checked={sel} onChange={() => toggleQ(q.id)} style={{ accentColor: '#6366f1', width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: sel ? '#4338ca' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                                {q.type === 'coktan_secmeli' ? '✅ Çoktan Seçmeli' : '✏️ Açık Uçlu'} · {q.contentType}
                              </div>
                              <div style={{ fontSize: '0.87rem', color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.questionText}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={selQIds.length === 0} style={{ padding: '0.88rem', borderRadius: '0.85rem', background: selQIds.length === 0 ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: selQIds.length === 0 ? '#94a3b8' : 'white', fontWeight: 800, fontSize: '0.92rem', border: 'none', cursor: selQIds.length === 0 ? 'not-allowed' : 'pointer', boxShadow: selQIds.length > 0 ? '0 4px 16px rgba(99,102,241,0.35)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {editingTestId ? <><Edit2 size={16} /> Testi Güncelle</> : <><Plus size={16} /> Testi Oluştur ({selQIds.length} Soru)</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
