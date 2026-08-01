import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, X, Edit2, Users, BookOpen, ClipboardCheck,
  Clock, ChevronRight, FileText, Activity, GraduationCap,
  Search, Calendar, Layers, BarChart3, TrendingUp, Target, UserCheck, Sparkles, MessageSquare, UserPlus, Zap, Eye, CheckCircle2, ShieldCheck, Flame, BookMarked
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';

/* ── Subject Themes ── */
const subjectThemes = {
  'Matematik': { bg: 'bg-blue-50/80 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800/50', accent: 'bg-blue-500' },
  'Fen Bilimleri': { bg: 'bg-teal-50/80 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800/50', accent: 'bg-teal-500' },
  'Türkçe': { bg: 'bg-orange-50/80 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/50', accent: 'bg-orange-500' },
  'Sosyal Bilgiler': { bg: 'bg-purple-50/80 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800/50', accent: 'bg-purple-500' },
  'İngilizce': { bg: 'bg-rose-50/80 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800/50', accent: 'bg-rose-500' },
};
const getSubTheme = (sub) => subjectThemes[sub] || { bg: 'bg-slate-50 dark:bg-slate-900/30', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', accent: 'bg-slate-500' };

/* ── Compact Stat Card Component ── */
function StatCard({ icon: Icon, label, value, grad }) {
  return (
    <div className={`rounded-2xl p-2.5 sm:p-3 text-white shadow-md ${grad} flex items-center gap-2 sm:gap-3 min-w-[90px] sm:min-w-0 shrink-0 flex-1 hover:scale-[1.02] active:scale-95 transition-all`}>
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base sm:text-xl font-black leading-none">{value}</p>
        <p className="text-[10px] sm:text-xs font-bold text-white/90 truncate mt-0.5" title={label}>{label}</p>
      </div>
    </div>
  );
}

/* ── Test Card Component ── */
function TestCard({ test, onEdit }) {
  const theme = getSubTheme(test.subject);
  return (
    <div className={`rounded-2xl border ${theme.bg} ${theme.border} p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden group`}>
      <div className={`h-1 w-full absolute top-0 left-0 ${theme.accent}`} />
      <div>
        <div className="flex items-start justify-between gap-2 mb-2 pt-1">
          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border ${theme.border} ${theme.text}`}>
            {test.subject}
          </span>
          <button
            onClick={() => onEdit(test)}
            className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
            title="Testi Düzenle"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 mb-3">
          {test.title}
        </h3>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
        <span className="flex items-center gap-1 font-semibold">
          <FileText className="w-3.5 h-3.5 text-indigo-500" /> {test.questions || 0} Soru
        </span>
        <span className="flex items-center gap-1 font-semibold">
          <Clock className="w-3.5 h-3.5 text-amber-500" /> {test.time || 0} dk
        </span>
        <span className="flex items-center gap-1 text-[11px]">
          <Calendar className="w-3 h-3 text-slate-400" /> {new Date(test.date).toLocaleDateString('tr-TR')}
        </span>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const { data, addTest, updateTest } = useCurriculum();
  const { questions } = useQuestionBank();
  const { homeworks = [] } = useHomework();
  const { submissions = [] } = useEvaluation();
  const { users = [], addStudentForTeacher, updateUser } = useUser();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('123456');
  const [newStudentGrade, setNewStudentGrade] = useState('');

  // Automatically set default grade when curriculum data loads
  useEffect(() => {
    if (data?.grades?.length > 0 && !newStudentGrade) {
      setNewStudentGrade(data.grades[0].id);
    }
  }, [data?.grades]);

  const [editingStudent, setEditingStudent] = useState(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentPassword, setEditStudentPassword] = useState('');
  const [editStudentGrade, setEditStudentGrade] = useState('');

  const openEditStudentModal = (student) => {
    setEditingStudent(student);
    setEditStudentName(student.name || '');
    setEditStudentEmail(student.email || '');
    setEditStudentPassword(student.password || '123456');
    setEditStudentGrade(student.gradeId || data?.grades?.[0]?.id || 'g1');
  };

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

  /* stats - strictly scoped to teacher */
  const students = useMemo(() => {
    return (users || []).filter(u => u.role === 'student' && (currentUser?.role === 'admin' || u.teacherId === currentUser?.id));
  }, [users, currentUser]);

  const teacherStudentIds = useMemo(() => students.map(s => s.id), [students]);
  
  const teacherHomeworks = useMemo(() => {
    if (currentUser?.role === 'admin') return homeworks || [];
    return (homeworks || []).filter(h => h.assignedBy === currentUser?.id);
  }, [homeworks, currentUser]);

  const teacherHwIds = useMemo(() => teacherHomeworks.map(h => h.id), [teacherHomeworks]);

  const teacherQuestions = useMemo(() => {
    if (currentUser?.role === 'admin') return questions || [];
    return (questions || []).filter(q => q.createdBy === currentUser?.id);
  }, [questions, currentUser]);

  const teacherSubmissions = useMemo(() => {
    return (submissions || []).filter(sub =>
      currentUser?.role === 'admin' || teacherStudentIds.includes(sub.studentId) || teacherHwIds.includes(sub.testId)
    );
  }, [submissions, teacherStudentIds, teacherHwIds, currentUser]);

  const recentSubs = useMemo(() => {
    return [...teacherSubmissions].sort((a,b) => new Date(b.submittedAt||0) - new Date(a.submittedAt||0)).slice(0, 5);
  }, [teacherSubmissions]);

  const allSubjects = [...new Set(data.tests.map(t => t.subject).filter(Boolean))];
  const visibleTests = data.tests.filter(t => {
    const ms = !searchQ    || t.title.toLowerCase().includes(searchQ.toLowerCase());
    const mf = !filterSub  || t.subject === filterSub;
    return ms && mf;
  });

  const { toggleCoachedStudent, getCoachedStudentIds } = useCoaching();
  const coachedIds = getCoachedStudentIds(currentUser?.id || 'teacher_1');

  const tabs = [
    { id: 'overview', label: 'Genel Bakış', icon: Activity },
    { id: 'tests',    label: 'Testler',     icon: FileText, badge: visibleTests.length },
    { id: 'students', label: 'Öğrenciler',  icon: Users, badge: students.length },
    { id: 'coaching', label: '🎯 Koçluk Takibi', icon: Target },
  ];

  const quickLinks = [
    { label: 'Öğrenci Ekle', sub: 'Hızlı kayıt aç', icon: UserPlus, grad: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', action: () => setShowAddStudentModal(true) },
    { label: 'Test Oluştur', sub: 'Yeni soru ekle', icon: Plus, grad: 'from-indigo-500 to-blue-600', shadow: 'shadow-indigo-500/20', action: () => { resetForm(); setShowModal(true); } },
    { label: 'Soru Bankası', sub: 'Kendi soruların', icon: Layers, grad: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20', action: () => navigate('/questions') },
    { label: 'Ödev Ver', sub: 'Sınıfa ödev tanımla', icon: BookOpen, grad: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', action: () => navigate('/homeworks') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#0B1120] dark:via-[#0d1528] dark:to-[#0B1120] font-sans text-slate-800 dark:text-slate-200">
      
      {/* ── STICKY GLASS HEADER ── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0d1528]/80 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block">Öğretmen Paneli</span>
              <h1 className="text-base font-black text-slate-900 dark:text-white leading-none mt-0.5">
                {currentUser?.name || 'Öğretmen'}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!newStudentGrade && data?.grades?.[0]?.id) setNewStudentGrade(data.grades[0].id);
                setShowAddStudentModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Öğrenci Ekle</span>
            </button>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Test Oluştur</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">

        {/* ── HERO BANNER ── */}
        <section className="rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 shadow-2xl shadow-indigo-500/25 text-white">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-indigo-100 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Sınıf Yönetim Sistemi
              </span>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                Hoş Geldiniz, {currentUser?.name?.split(' ')[0] || 'Hocam'} 👋
              </h2>
              <p className="text-indigo-100/80 text-sm max-w-xl">
                Öğrencilerinizi yönetin, müfredata uygun testler oluşturun ve öğrenci sınav gelişimlerini anlık takip edin.
              </p>
            </div>
            
            <div className="flex items-center gap-3 self-stretch md:self-auto overflow-x-auto pb-1 md:pb-0">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 px-4 text-center shrink-0 min-w-[100px]">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200">Sınıfım</p>
                <p className="text-2xl font-black mt-0.5">{students.length}</p>
                <p className="text-[9px] text-white/60">Öğrenci</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 px-4 text-center shrink-0 min-w-[100px]">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200">Testlerim</p>
                <p className="text-2xl font-black mt-0.5">{visibleTests.length}</p>
                <p className="text-[9px] text-white/60">Oluşturulan</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 px-4 text-center shrink-0 min-w-[100px]">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200">Çözülen</p>
                <p className="text-2xl font-black mt-0.5">{teacherSubmissions.length}</p>
                <p className="text-[9px] text-white/60">Sınav Kağıdı</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── STAT CARDS (SINGLE ROW) ── */}
        <section className="grid grid-cols-5 gap-1.5 sm:gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <StatCard icon={FileText}       label="Toplam Test"  value={visibleTests.length} grad="bg-gradient-to-br from-indigo-500 to-blue-600" />
          <StatCard icon={Users}          label="Öğrenci"      value={students.length}     grad="bg-gradient-to-br from-blue-500 to-cyan-600" />
          <StatCard icon={BookOpen}       label="Ödev"         value={teacherHomeworks.length} grad="bg-gradient-to-br from-amber-500 to-orange-600" />
          <StatCard icon={ClipboardCheck} label="Çözülen Sınav" value={teacherSubmissions.length} grad="bg-gradient-to-br from-emerald-500 to-teal-600" />
          <StatCard icon={Layers}         label="Soru Bankası" value={teacherQuestions.length} grad="bg-gradient-to-br from-purple-500 to-violet-600" />
        </section>

        {/* ── QUICK ACTIONS BAR ── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map(({ label, sub, icon: Icon, grad, shadow, action }) => (
            <button
              key={label}
              onClick={action}
              className={`rounded-2xl p-3.5 text-white shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center gap-3 bg-gradient-to-br ${grad} ${shadow} text-left`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-xs sm:text-sm leading-tight truncate">{label}</h3>
                <p className="text-white/70 text-[10px] mt-0.5 truncate hidden sm:block">{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 opacity-60 shrink-0" />
            </button>
          ))}
        </section>

        {/* ── NAVIGATION TABS ── */}
        <section className="border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto max-w-full" style={{ scrollbarWidth: 'none' }}>
            {tabs.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-600/50"
                      : "bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                  {t.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── TAB 1: OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recent Tests Card */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> Son Testler
                </h3>
                <button onClick={() => setTab('tests')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                  Tümünü Gör <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {data.tests.slice(-5).reverse().map(test => {
                  const theme = getSubTheme(test.subject);
                  return (
                    <div key={test.id} className={`flex items-center justify-between gap-3 p-3 rounded-2xl border ${theme.bg} ${theme.border} transition-all hover:shadow-md`}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${theme.accent} shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{test.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{test.questions} soru</span>
                            <span>•</span>
                            <span>{test.time} dk</span>
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border ${theme.border} ${theme.text} shrink-0`}>
                        {test.subject}
                      </span>
                    </div>
                  );
                })}
                {data.tests.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">Henüz test oluşturulmadı</div>
                )}
              </div>
            </div>

            {/* Recent Submissions */}
            <div className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" /> Son Aktiviteler
                </h3>
              </div>

              <div className="space-y-2.5">
                {recentSubs.map((sub, i) => {
                  const student = users.find(u => u.id === sub.studentId);
                  const test    = data.tests.find(t => t.id === sub.testId);
                  const score   = sub.score !== undefined ? `${sub.score}%` : '—';
                  const good    = parseInt(score) >= 70;
                  return (
                    <div key={sub.id || i} className={`flex items-center justify-between gap-3 p-3 rounded-2xl border ${good ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shrink-0 ${good ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                        {(student?.name || 'Ö').charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{student?.name || 'Öğrenci'}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{test?.title || 'Test'}</p>
                      </div>
                      <span className={`font-black text-xs shrink-0 px-2 py-0.5 rounded-lg ${good ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'}`}>
                        {score}
                      </span>
                    </div>
                  );
                })}
                {recentSubs.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">Henüz çözülen sınav yok</div>
                )}
              </div>
            </div>

            {/* Grade Distribution */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-500" /> Sınıf Bazında Öğrenci Dağılımı
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {data.grades.map(grade => {
                  const count = students.filter(s => String(s.gradeId) === String(grade.id) || s.gradeId === grade.name).length;
                  const pct   = students.length ? Math.round((count / students.length) * 100) : 0;
                  return (
                    <div key={grade.id} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{count}</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">{grade.name}</p>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">%{pct}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ── TAB 2: TESTS ── */}
        {tab === 'tests' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Test başlığı ile ara..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={filterSub}
                onChange={e => setFilterSub(e.target.value)}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Tüm Dersler</option>
                {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {visibleTests.length === 0 ? (
              <div className="bg-white dark:bg-slate-800/60 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700/60 p-12 text-center">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Arama kriterlerine uygun test bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleTests.map(test => <TestCard key={test.id} test={test} onEdit={openEdit} />)}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: STUDENTS ── */}
        {tab === 'students' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Sınıfım
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold">
                  {students.length} Öğrenci
                </span>
              </h3>
              <button
                onClick={() => {
                  if (!newStudentGrade && data?.grades?.[0]?.id) setNewStudentGrade(data.grades[0].id);
                  setShowAddStudentModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" /> Yeni Öğrenci
              </button>
            </div>

            {students.length === 0 ? (
              <div className="bg-white dark:bg-slate-800/60 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700/60 p-12 text-center">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Henüz sınıfınıza öğrenci eklemediniz.</p>
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Öğrenci Eklemek İçin Tıklayın
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/60 text-slate-400 font-black uppercase tracking-wider">
                        <th className="py-3.5 px-4">Öğrenci</th>
                        <th className="py-3.5 px-4">Sınıfı</th>
                        <th className="py-3.5 px-4">E-posta / Kullanıcı Adı</th>
                        <th className="py-3.5 px-4">Giriş Şifresi</th>
                        <th className="py-3.5 px-4">Çözülen Sınav</th>
                        <th className="py-3.5 px-4">Koçluk Durumu</th>
                        <th className="py-3.5 px-4 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {students.map((student, i) => {
                        const grade  = data.grades.find(g => String(g.id) === String(student.gradeId) || g.name === student.gradeId);
                        const solved = submissions.filter(s => s.studentId === student.id).length;
                        const isCoached = coachedIds.includes(student.id);
                        const avatarColors = ['bg-indigo-500','bg-blue-500','bg-emerald-500','bg-orange-500','bg-purple-500','bg-rose-500'];
                        const av = avatarColors[i % avatarColors.length];
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${av} text-white font-black flex items-center justify-center text-xs shrink-0`}>
                                  {student.name?.charAt(0) || 'Ö'}
                                </div>
                                <span className="font-bold text-slate-800 dark:text-slate-100">{student.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 text-[10px]">
                                {grade?.name || '—'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-semibold">{student.email}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 font-mono font-black text-[11px]">
                                🔑 {student.password || '123456'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-black text-slate-700 dark:text-slate-200">{solved}</td>
                            <td className="py-3 px-4">
                              {isCoached ? (
                                <span className="px-2.5 py-0.5 rounded-full font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50 text-[10px]">
                                  🎯 Koçluk Takibinde
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => openEditStudentModal(student)}
                                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white font-bold transition-colors inline-flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" /> Düzenle
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                  {students.map((student, i) => {
                    const grade  = data.grades.find(g => String(g.id) === String(student.gradeId) || g.name === student.gradeId);
                    const solved = submissions.filter(s => s.studentId === student.id).length;
                    const isCoached = coachedIds.includes(student.id);
                    const avatarColors = ['bg-indigo-500','bg-blue-500','bg-emerald-500','bg-orange-500','bg-purple-500','bg-rose-500'];
                    const av = avatarColors[i % avatarColors.length];
                    return (
                      <div key={student.id} className="bg-white dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full ${av} text-white font-black flex items-center justify-center text-sm shrink-0`}>
                              {student.name?.charAt(0) || 'Ö'}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{student.name}</h4>
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                {grade?.name || 'Sınıf Belirtilmemiş'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => openEditStudentModal(student)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                          <p className="text-slate-500 dark:text-slate-400 truncate">📧 {student.email}</p>
                          <p className="font-mono font-bold text-amber-600 dark:text-amber-400">🔑 Şifre: {student.password || '123456'}</p>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="font-semibold text-slate-500 dark:text-slate-400">Çözülen Sınav: <strong className="text-slate-800 dark:text-slate-100">{solved}</strong></span>
                          {isCoached && (
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                              🎯 Koçlukta
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 4: COACHING ── */}
        {tab === 'coaching' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-1">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" /> Koçluk Sistemi Takibi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bireysel koçluk takibine almak istediğiniz öğrencileri seçin ve detaylı yol haritasını görüntüleyin.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map(std => {
                const isCoached = coachedIds.includes(std.id);
                return (
                  <div key={std.id} className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-4 space-y-3 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">{std.name}</h4>
                        <button
                          onClick={() => toggleCoachedStudent(currentUser?.id || 'teacher_1', std.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                            isCoached ? "bg-purple-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {isCoached ? '✓ Koçlukta' : '+ Eklemeler'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">{std.email}</p>
                    </div>

                    <Link to={`/coaching/${std.id}`} className="w-full">
                      <button className="w-full py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 font-bold text-xs hover:bg-purple-600 hover:text-white transition-colors flex items-center justify-center gap-1">
                        Yol Haritası & Detaylar <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* ── ADD TEST MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                {editingTestId ? 'Testi Düzenle' : 'Yeni Test Oluştur'}
              </h3>
              <button onClick={resetForm} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Test Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 8. Sınıf Üslü Sayılar Tarama Testi"
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Soru Başı Süre (dk)</label>
                  <input
                    type="number"
                    min="1"
                    value={timePerQ}
                    onChange={e => setTimePerQ(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Sınıf</label>
                  <select
                    value={selGrade}
                    onChange={e => { setSelGrade(e.target.value); setSelSubject(''); setSelUnit(''); setSelTopic(''); setSelQIds([]); }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sınıf Seçiniz</option>
                    <option value="all">Tüm Sınıflar</option>
                    {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>

              {selGrade && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ders</label>
                  <select
                    value={selSubject}
                    onChange={e => { setSelSubject(e.target.value); setSelUnit(''); setSelTopic(''); setSelQIds([]); }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Ders Seçiniz</option>
                    <option value="all">Tüm Dersler</option>
                    {filtSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {selSubject && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ünite</label>
                  <select
                    value={selUnit}
                    onChange={e => { setSelUnit(e.target.value); setSelTopic(''); setSelQIds([]); }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Ünite Seçiniz</option>
                    <option value="all">Tüm Üniteler</option>
                    {filtUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}

              {selUnit && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Konu</label>
                  <select
                    value={selTopic}
                    onChange={e => { setSelTopic(e.target.value); setSelQIds([]); }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Konu Seçiniz</option>
                    <option value="all">Tüm Konular</option>
                    {filtTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              {catId && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Soru Havuzu ({poolQs.length} Soru)</span>
                    <button
                      type="button"
                      onClick={() => setSelQIds(selQIds.length === poolQs.length ? [] : poolQs.map(q => q.id))}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      {selQIds.length === poolQs.length ? 'Seçimleri Kaldır' : 'Tümünü Seç'}
                    </button>
                  </div>

                  {poolQs.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Bu kategoride henüz soru eklenmemiş.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {poolQs.map(q => {
                        const checked = selQIds.includes(q.id);
                        return (
                          <label key={q.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleQ(q.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">{q.title || q.name || 'Soru'}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={selQIds.length === 0}
                className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all ${
                  selQIds.length === 0 ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25 active:scale-95'
                }`}
              >
                {editingTestId ? 'Testi Güncelle' : `Testi Oluştur (${selQIds.length} Soru)`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD STUDENT MODAL ── */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-500" /> Sınıfıma Öğrenci Ekle
              </h3>
              <button onClick={() => setShowAddStudentModal(false)} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Unassigned System Student Claim */}
            {(() => {
              const unassignedSystemStudents = (users || []).filter(u => u.role === 'student' && !u.teacherId);
              if (unassignedSystemStudents.length === 0) return null;
              return (
                <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800/50 space-y-2">
                  <label className="block text-xs font-black text-blue-700 dark:text-blue-300">
                    💡 VEYA Sistemdeki Sahipsiz Öğrencilerden Seç & Bağla:
                  </label>
                  <select
                    defaultValue=""
                    onChange={async (e) => {
                      if (!e.target.value) return;
                      const selectedStd = unassignedSystemStudents.find(s => s.id === e.target.value);
                      if (selectedStd) {
                        await updateUser(selectedStd.id, { teacherId: currentUser.id });
                        setShowAddStudentModal(false);
                        alert(`🎉 ${selectedStd.name} öğrencisi başarıyla sınıfınıza bağlandı!`);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-xs font-bold text-blue-700 dark:text-blue-300 focus:outline-none"
                  >
                    <option value="">Sınıfıma Eklenecek Öğrenciyi Seçin...</option>
                    {unassignedSystemStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                </div>
              );
            })()}

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newStudentName) return;
              await addStudentForTeacher({
                name: newStudentName,
                email: newStudentEmail || `ogrenci_${Date.now()}@etest.com`,
                password: newStudentPassword || '123456',
                gradeId: newStudentGrade
              }, currentUser.id);
              setNewStudentName('');
              setNewStudentEmail('');
              setNewStudentPassword('123456');
              setShowAddStudentModal(false);
              alert("🎉 Öğrenci başarıyla sınıfınıza eklendi ve giriş hesabı oluşturuldu!");
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Öğrenci Adı Soyadı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet Yılmaz"
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">E-posta / Kullanıcı Adı (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="Örn: ahmet veya ahmet@gmail.com"
                  value={newStudentEmail}
                  onChange={e => setNewStudentEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Giriş Şifresi *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 123456"
                  value={newStudentPassword}
                  onChange={e => setNewStudentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-mono font-black text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Sınıf Seviyesi</label>
                <select
                  value={newStudentGrade}
                  onChange={e => setNewStudentGrade(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {data.grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddStudentModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                  İptal
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-md hover:bg-emerald-500 transition-colors">
                  💾 Kaydet & Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT STUDENT MODAL ── */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-500" /> Öğrenci Bilgilerini Düzenle
              </h3>
              <button onClick={() => setEditingStudent(null)} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!editingStudent || !editStudentName) return;

              let cleanEmail = editStudentEmail.trim().toLowerCase();
              if (!cleanEmail) cleanEmail = editingStudent.email;

              await updateUser(editingStudent.id, {
                name: editStudentName,
                email: cleanEmail,
                password: editStudentPassword || '123456',
                gradeId: editStudentGrade
              });

              setEditingStudent(null);
              alert("🎉 Öğrenci bilgileri ve şifresi başarıyla güncellendi!");
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Öğrenci Adı Soyadı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet Yılmaz"
                  value={editStudentName}
                  onChange={e => setEditStudentName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">E-posta / Kullanıcı Adı</label>
                <input
                  type="text"
                  placeholder="Örn: ahmet veya ahmet@gmail.com"
                  value={editStudentEmail}
                  onChange={e => setEditStudentEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Giriş Şifresi *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 123456"
                  value={editStudentPassword}
                  onChange={e => setEditStudentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-mono font-black text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Sınıf Seviyesi</label>
                <select
                  value={editStudentGrade}
                  onChange={e => setEditStudentGrade(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {data.grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                  İptal
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-md hover:bg-indigo-500 transition-colors">
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
