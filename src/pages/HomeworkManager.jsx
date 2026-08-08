import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Edit2, BarChart2, ArrowRight, ArrowLeft, CheckSquare, Sparkles, BookOpen, Layers, Check, Search, Filter,
  GraduationCap, Calendar, AlertCircle, Eye, Send, Trophy, FileText, Image, FileJson,
  Trash2, Zap, Target, ClipboardList, CheckCheck, RefreshCw, Clock, Plus, X, Globe, Users, CheckCircle
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useUser } from '../context/UserContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const subjectThemes = {
  'Matematik': { bg: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#2563eb' },
  'Fen Bilimleri': { bg: 'linear-gradient(135deg,#0d9488,#0f766e)', color: '#0d9488' },
  'Diger': { bg: 'linear-gradient(135deg,#475569,#334155)', color: '#475569' }
};
const getTheme = (subject) => subjectThemes[subject] || { bg: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#4f46e5' };

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', padding: '0.8rem 1.4rem', borderRadius: '1rem', fontWeight: 800, fontSize: '0.88rem', boxShadow: '0 8px 32px rgba(5,150,105,0.45)', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'hwToastIn 0.35s ease' }}>
      <Sparkles size={17} /> {msg}
    </div>
  );
}

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800 }}>
        <span style={{ color: '#64748b' }}>Tamamlanma</span>
        <span style={{ color: color || '#4f46e5' }}>{pct}% ({value}/{max})</span>
      </div>
      <div style={{ background: '#e2e8f0', borderRadius: 99, height: 6, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', background: pct === 100 ? '#10b981' : (color || '#4f46e5'), height: '100%', borderRadius: 99 }} />
      </div>
    </div>
  );
}

export default function HomeworkManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { data: curData } = useCurriculum();
  const { questions: allQuestions } = useQuestionBank();
  const { homeworks: allHomeworks, addHomework, updateHomework, deleteHomework, deleteAllHomeworks } = useHomework();
  const { users } = useUser();
  const { submissions, deleteSubmissionsByTestId, deleteAllSubmissions } = useEvaluation();

  const students = useMemo(() => (users || []).filter(u => u.role === 'student' && (currentUser?.role === 'admin' || u.teacherId === currentUser?.id)), [users, currentUser]);
  const homeworks = useMemo(() => currentUser?.role === 'admin' ? allHomeworks : (allHomeworks || []).filter(hw => hw.assignedBy === currentUser?.id), [allHomeworks, currentUser]);
  const questions = useMemo(() => currentUser?.role === 'admin' ? (allQuestions || []) : (allQuestions || []).filter(q => q.createdBy === currentUser?.id), [allQuestions, currentUser]);

  const [viewMode, setViewMode] = useState('list');
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [activeHomework, setActiveHomework] = useState(null);
  const [statsStudentFilter, setStatsStudentFilter] = useState('all');
  const [editingHwId, setEditingHwId] = useState(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(2);
  const [targetMode, setTargetMode] = useState('grade');
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [studentGradeFilter, setStudentGradeFilter] = useState('all');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [selGrade, setSelGrade] = useState('all');
  const [selSubject, setSelSubject] = useState('all');
  const [selUnit, setSelUnit] = useState('all');
  const [selTopic, setSelTopic] = useState('all');
  const [selQuestionType, setSelQuestionType] = useState('all');
  const [selContentType, setSelContentType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (location.state?.autoSelectQuestionId) {
      const qId = location.state.autoSelectQuestionId;
      setSelectedQuestionIds([qId]);
      const matchingQ = questions.find(q => q.id === qId);
      if (matchingQ && !title) setTitle(matchingQ.title || matchingQ.questionText || 'Soru Bankasi Odevi');
      setViewMode('create'); setStep(1);
    }
  }, [location.state, questions]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (selGrade !== 'all') {
        const gS = curData.subjects.filter(s => s.gradeId === selGrade).map(s => s.id);
        const gU = curData.units.filter(u => gS.includes(u.subjectId)).map(u => u.id);
        const gT = curData.topics.filter(t => gU.includes(t.unitId)).map(t => t.id);
        if (!gT.includes(q.topicId) && !gU.some(id => q.topicId === 'unit_' + id + '_all') && !gS.some(id => q.topicId === 'sub_' + id + '_all') && q.topicId !== 'grade_' + selGrade + '_all') return false;
      }
      if (selSubject !== 'all') {
        const sU = curData.units.filter(u => u.subjectId === selSubject).map(u => u.id);
        const sT = curData.topics.filter(t => sU.includes(t.unitId)).map(t => t.id);
        if (!sT.includes(q.topicId) && !sU.some(id => q.topicId === 'unit_' + id + '_all') && q.topicId !== 'sub_' + selSubject + '_all') return false;
      }
      if (selUnit !== 'all') {
        const uT = curData.topics.filter(t => t.unitId === selUnit).map(t => t.id);
        if (!uT.includes(q.topicId) && q.topicId !== 'unit_' + selUnit + '_all' && q.topicId !== selUnit) return false;
      }
      if (selTopic !== 'all' && q.topicId !== selTopic) return false;
      if (selQuestionType === 'coktan_secmeli' && q.type !== 'coktan_secmeli') return false;
      if (selQuestionType === 'acik_uclu' && q.type !== 'acik_uclu') return false;
      if (selQuestionType === 'bundle' && !q.isBundle) return false;
      if (selContentType !== 'all') {
        const ct = (q.contentType || '').toLowerCase();
        if (selContentType === 'pdf' && !ct.includes('pdf')) return false;
        if (selContentType === 'html' && !ct.includes('html')) return false;
        if (selContentType === 'text' && !ct.includes('text') && !ct.includes('metin')) return false;
        if (selContentType === 'gorsel' && !ct.includes('gorsel') && !ct.includes('image')) return false;
        if (selContentType === 'json' && !ct.includes('json') && !q.questionsList) return false;
      }
      if (searchQuery.trim()) {
        const sq = searchQuery.toLowerCase().trim();
        if (!(q.title || q.name || '').toLowerCase().includes(sq) && !(q.questionText || '').toLowerCase().includes(sq)) return false;
      }
      return true;
    });
  }, [questions, selGrade, selSubject, selUnit, selTopic, selQuestionType, selContentType, searchQuery, curData]);

  const resetForm = () => {
    setTitle(''); setDueDate(''); setTimePerQuestion(2);
    setTargetMode('grade'); setSelectedTargets([]); setStudentGradeFilter('all');
    setSelGrade('all'); setSelSubject('all'); setSelUnit('all'); setSelTopic('all');
    setSelQuestionType('all'); setSelContentType('all'); setSearchQuery('');
    setSelectedQuestionIds([]); setEditingHwId(null); setStep(1); setViewMode('list');
  };

  const openEditPage = (hw) => {
    setEditingHwId(hw.id); setTitle(hw.title || '');
    setDueDate(hw.dueDate ? hw.dueDate.split('T')[0] : '');
    setTimePerQuestion(hw.timePerQuestion || 2);
    setTargetMode(hw.targetType || 'grade'); setSelectedTargets(hw.targetIds || []);
    setSelectedQuestionIds(hw.questionIds || []);
    setStep(1); setViewMode('create');
  };

  const setDueDatePreset = (days) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const toggleQ = (id) => setSelectedQuestionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSelectAllFiltered = () => {
    const fIds = filteredQuestions.map(q => q.id);
    const allSel = fIds.every(id => selectedQuestionIds.includes(id));
    if (allSel) setSelectedQuestionIds(prev => prev.filter(id => !fIds.includes(id)));
    else setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...fIds])));
  };

  const filteredStudents = students.filter(s => studentGradeFilter === 'all' || s.gradeId === studentGradeFilter);

  const handleSelectAllTargets = () => {
    if (targetMode === 'grade') {
      const all = curData.grades.map(g => g.id);
      setSelectedTargets(selectedTargets.length === all.length ? [] : all);
    } else {
      const all = filteredStudents.map(s => s.id);
      setSelectedTargets(selectedTargets.length === all.length ? [] : all);
    }
  };

  const getHomeworkStats = (hw) => {
    const ids = (hw.targetType === 'grade' || hw.targetType === 'class')
      ? students.filter(s => (hw.targetIds || []).some(tid => s.gradeId === tid || s.grade === tid || s.className === tid)).map(s => s.id)
      : (hw.targetIds || []);
    const total = ids.length;
    const completed = ids.filter(stId => !!(
      (hw.submissions || []).find(s => s.studentId === stId) ||
      submissions.find(s => (s.hwId === hw.id || s.testId === hw.id) && s.studentId === stId)
    )).length;
    return { total, completed, rate: total > 0 ? Math.round((completed / total) * 100) : 0, targetStudentIds: ids };
  };

  const getTargetLabel = (hw) => {
    if (hw.targetType === 'grade' || hw.targetType === 'class') {
      const names = (curData?.grades || []).filter(g => (hw.targetIds || []).includes(g.id) || (hw.targetIds || []).includes(g.name)).map(g => g.name);
      if (names.length) return names.join(', ');
      if (Array.isArray(hw.targetIds) && hw.targetIds.length > 0) return hw.targetIds.join(', ');
      return 'Tüm Sınıflar';
    }
    return (hw.targetIds?.length || 0) + ' Öğrenci';
  };

  const globalAnalytics = useMemo(() => {
    const now = new Date(new Date().setHours(0,0,0,0));
    let active = 0, expired = 0, rateSum = 0;
    homeworks.forEach(hw => {
      if (new Date(hw.dueDate) < now) expired++; else active++;
      rateSum += getHomeworkStats(hw).rate;
    });
    return { total: homeworks.length, active, expired, avgRate: homeworks.length ? Math.round(rateSum / homeworks.length) : 0 };
  }, [homeworks, students, submissions]);

  const canStep2 = !!(title.trim() && dueDate);
  const canSubmit = !!(title.trim() && dueDate && selectedTargets.length > 0 && selectedQuestionIds.length > 0);

  const handleSave = () => {
    if (!title.trim()) {
      showToast('⚠️ Lütfen Ödev Başlığını giriniz!');
      setStep(1);
      return;
    }
    if (!dueDate) {
      showToast('⚠️ Lütfen Son Teslim Tarihini seçiniz!');
      setStep(1);
      return;
    }
    if (selectedTargets.length === 0) {
      showToast('⚠️ Lütfen ödev atanacak En Az 1 Sınıf veya Öğrenci seçiniz!');
      setStep(2);
      return;
    }
    if (selectedQuestionIds.length === 0) {
      showToast('⚠️ Lütfen ödeve eklenecek En Az 1 Soru seçiniz!');
      setStep(3);
      return;
    }

    const selectedQs = questions.filter(q => selectedQuestionIds.includes(q.id));
    const physicalExam = selectedQs.find(q => q.contentType === 'physicalExam');
    const isPhysical = !!physicalExam;
    const totalQCount = isPhysical ? physicalExam.totalQuestions : selectedQs.reduce((acc, q) => acc + (q.isBundle ? (q.questionCount || 1) : 1), 0);
    const firstQ = selectedQs[0] || {};
    const firstSub = firstQ.subject || firstQ.subjectName || 'Genel';
    const hwData = {
      title, dueDate, timePerQuestion: parseInt(timePerQuestion, 10),
      totalQuestions: totalQCount, subject: firstSub,
      targetType: targetMode, targetIds: selectedTargets,
      questionIds: selectedQuestionIds, assignedBy: currentUser?.id,
      type: isPhysical ? 'physicalExam' : 'test',
      contentType: isPhysical ? 'physicalExam' : (firstQ.contentType || firstQ.type || 'test'),
      contentPayload: firstQ.contentPayload,
      pdfPayload: firstQ.pdfPayload,
      htmlPayload: firstQ.htmlPayload,
      questionType: firstQ.questionType || firstQ.type,
      isOpenEnded: firstQ.isOpenEnded || firstQ.type === 'acik_uclu' || firstQ.contentType === 'acik_uclu',
      answerKey: isPhysical ? physicalExam.answerKey : undefined,
      subjects: isPhysical ? physicalExam.subjects : undefined,
      penaltyRatio: isPhysical ? physicalExam.penaltyRatio : undefined,
      examType: isPhysical ? physicalExam.examType : undefined
    };
    if (editingHwId) { updateHomework(editingHwId, hwData); showToast('🎉 Ödev güncellendi!'); }
    else { addHomework(hwData); showToast('🎉 Ödev başarıyla yayınlandı!'); }
    resetForm();
  };

  const C = {
    page: { minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#1e293b' },
    header: { position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #e2e8f0', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' },
    card: { background: '#fff', borderRadius: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' },
    label: { display: 'block', fontSize: '0.72rem', fontWeight: 900, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
    input: { width: '100%', padding: '0.6rem 0.85rem', borderRadius: '0.6rem', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
    chipBtn: (active) => ({ padding: '0.35rem 0.8rem', borderRadius: '0.6rem', border: active ? 'none' : '1.5px solid #e2e8f0', background: active ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#fff', color: active ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 800, fontSize: '0.77rem', transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }),
    primaryBtn: { padding: '0.65rem 1.4rem', borderRadius: '0.75rem', border: 'none', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', boxShadow: '0 4px 14px rgba(79,70,229,0.35)', transition: 'transform 0.15s, opacity 0.15s' },
  };

  const getQIcon = (ct) => {
    if (!ct) return <FileText size={13} />;
    const c = ct.toLowerCase();
    if (c.includes('pdf')) return <FileText size={13} color="#dc2626" />;
    if (c.includes('html')) return <Globe size={13} color="#2563eb" />;
    if (c.includes('gorsel') || c.includes('image')) return <Image size={13} color="#059669" />;
    if (c.includes('json')) return <FileJson size={13} color="#7c3aed" />;
    return <FileText size={13} color="#64748b" />;
  };

  if (viewMode === 'list') {
    const now = new Date(new Date().setHours(0,0,0,0));
    const filteredHw = homeworks.filter(hw => {
      const past = new Date(hw.dueDate) < now;
      if (activeTab === 'active') return !past;
      if (activeTab === 'expired') return past;
      return true;
    });
    return (
      <div style={C.page}>
        <Toast msg={toast} />
        <style>{`
          @keyframes hwToastIn { from{opacity:0;transform:translateX(40px) scale(0.95)} to{opacity:1;transform:translateX(0) scale(1)} }
          @keyframes hwFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
          .hw-tr:hover { background: #f8fafc !important; }
          .hw-actions { opacity: 0; transition: opacity 0.18s; }
          .hw-tr:hover .hw-actions { opacity: 1 !important; }
          .q-row:hover { background: #f8fafc !important; }
          .wiz-step { animation: hwFadeUp 0.22s ease; }
        `}</style>
        <header style={C.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}><BookOpen size={20} color="#fff" /></div>
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em' }}>E-Test LMS</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>Odev Yonetim Merkezi</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {currentUser?.role === 'admin' && (
              <button onClick={() => { if (window.confirm('Tum odevleri silmek istediginize emin misiniz?')) { if (typeof deleteAllHomeworks === 'function') deleteAllHomeworks(); if (typeof deleteAllSubmissions === 'function') deleteAllSubmissions(); }}} style={{ padding: '0.5rem 0.9rem', borderRadius: '0.65rem', background: '#fff1f2', border: '1.5px solid #fecaca', color: '#dc2626', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Trash2 size={14} /> Tumunu Sil
              </button>
            )}
            <button onClick={() => { resetForm(); setViewMode('create'); }} style={C.primaryBtn}>
              <Sparkles size={16} /> Yeni Odev Sihirbazi
            </button>
          </div>
        </header>
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.85rem' }}>
            {[
              { label: 'Yeni Odev', val: '+ Olustur', bg: 'linear-gradient(135deg,#4f46e5,#7c3aed)', Icon: Zap, onClick: () => { resetForm(); setViewMode('create'); } },
              { label: 'Aktif Odev', val: globalAnalytics.active, bg: 'linear-gradient(135deg,#059669,#047857)', Icon: Clock },
              { label: 'Ort. Katilim', val: '%' + globalAnalytics.avgRate, bg: 'linear-gradient(135deg,#2563eb,#1d4ed8)', Icon: Trophy },
              { label: 'Suresi Biten', val: globalAnalytics.expired, bg: 'linear-gradient(135deg,#e11d48,#9f1239)', Icon: AlertCircle },
            ].map(sc => (
              <div key={sc.label} onClick={sc.onClick} style={{ background: sc.bg, borderRadius: '1rem', padding: '1rem 1.15rem', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: '0.45rem', cursor: sc.onClick ? 'pointer' : 'default', transition: 'transform 0.15s' }}
                onMouseEnter={e => sc.onClick && (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseLeave={e => sc.onClick && (e.currentTarget.style.transform = 'scale(1)')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.9 }}>{sc.label}</span>
                  <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '0.5rem', padding: '0.28rem', display: 'flex' }}><sc.Icon size={15} /></div>
                </div>
                <div style={{ fontSize: '1.7rem', fontWeight: 900, lineHeight: 1 }}>{sc.val}</div>
              </div>
            ))}
          </div>
          <div style={{ ...C.card, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={17} color="#4f46e5" /> Odev Listesi
              </div>
              <div style={{ display: 'flex', gap: '0.3rem', background: '#f8fafc', borderRadius: '0.65rem', padding: '0.28rem' }}>
                {[
                  { key: 'all', label: 'Tumu (' + globalAnalytics.total + ')' },
                  { key: 'active', label: 'Aktif (' + globalAnalytics.active + ')' },
                  { key: 'expired', label: 'Biten (' + globalAnalytics.expired + ')' }
                ].map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '0.32rem 0.75rem', borderRadius: '0.5rem', border: 'none', fontWeight: 800, fontSize: '0.73rem', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', background: activeTab === t.key ? (t.key === 'expired' ? '#dc2626' : '#4f46e5') : 'transparent', color: activeTab === t.key ? '#fff' : '#64748b' }}>{t.label}</button>
                ))}
              </div>
            </div>
            {filteredHw.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <BookOpen size={44} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.25 }} />
                <div style={{ fontWeight: 700 }}>Bu kategoride odev bulunamadi.</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.35rem', color: '#cbd5e1' }}>Yeni Odev Sihirbazi araciligiyla odev olusturun!</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      {['Odev', 'Hedef Kitle', 'Son Tarih', 'Ilerleme', 'Islemler'].map((h, i) => (
                        <th key={h} style={{ padding: '0.8rem 1rem', textAlign: i === 4 ? 'right' : 'left', fontWeight: 900, fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHw.map(hw => {
                      const stats = getHomeworkStats(hw);
                      const isPast = new Date(hw.dueDate) < now;
                      const theme = getTheme(hw.subject);
                      return (
                        <tr key={hw.id} className="hw-tr" style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.13s' }}>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{ width: 36, height: 36, borderRadius: '0.6rem', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BookOpen size={15} color="#fff" /></div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#1e293b', lineHeight: 1.3 }}>{hw.title}</div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 1 }}>{hw.subject || 'Ders'} - {hw.totalQuestions} Soru - {hw.timePerQuestion} dk/soru</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.7rem', padding: '0.22rem 0.6rem', borderRadius: 99, border: '1px solid #bfdbfe', whiteSpace: 'nowrap' }}>{getTargetLabel(hw)}</span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 800, color: isPast ? '#dc2626' : '#374151', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.8rem' }}>
                              <Calendar size={12} /> {new Date(hw.dueDate).toLocaleDateString('tr-TR')}
                            </div>
                            <div style={{ fontSize: '0.67rem', fontWeight: 800, color: isPast ? '#dc2626' : '#059669', marginTop: 2 }}>{isPast ? 'Suresi Doldu' : 'Aktif'}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', minWidth: 170 }}>
                            <ProgressBar value={stats.completed} max={stats.total} color={theme.color} />
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div className="hw-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                              <button onClick={() => { setActiveHomework(hw); setStatsStudentFilter('all'); setShowStatsModal(true); }} style={{ padding: '0.38rem 0.7rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.73rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}><BarChart2 size={12} /> Rapor</button>
                              <button onClick={() => openEditPage(hw)} style={{ padding: '0.38rem', borderRadius: '0.5rem', background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex' }}><Edit2 size={14} color="#475569" /></button>
                              <button onClick={() => { if (window.confirm('Bu odevi silmek istediginize emin misiniz?')) { deleteHomework(hw.id); deleteSubmissionsByTestId(hw.id); } }} style={{ padding: '0.38rem', borderRadius: '0.5rem', background: '#fff1f2', border: 'none', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} color="#dc2626" /></button>
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
        </main>
        {showStatsModal && activeHomework && (() => {
          const stats = getHomeworkStats(activeHomework);
          const isPast = new Date(activeHomework.dueDate) < now;
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div style={{ ...C.card, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b' }}>{activeHomework.title}</div>
                    <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: 2 }}>Son Tarih: {new Date(activeHomework.dueDate).toLocaleDateString('tr-TR')} - {isPast ? 'Suresi Doldu' : 'Devam Ediyor'}</div>
                  </div>
                  <button onClick={() => setShowStatsModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '0.5rem', padding: '0.38rem', cursor: 'pointer', display: 'flex' }}><X size={17} color="#64748b" /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.7rem' }}>
                  {[
                    { label: 'Atanan', val: stats.total, bg: '#eff6ff', col: '#1d4ed8' },
                    { label: 'Tamamlayan', val: stats.completed, bg: '#f0fdf4', col: '#15803d' },
                    { label: 'Katilim', val: '%' + stats.rate, bg: '#fffbeb', col: '#b45309' },
                  ].map(x => (
                    <div key={x.label} style={{ background: x.bg, borderRadius: '0.75rem', padding: '0.85rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: x.col }}>{x.val}</div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 900, color: x.col, textTransform: 'uppercase', marginTop: 2 }}>{x.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', background: '#f8fafc', borderRadius: '0.75rem', padding: '0.4rem' }}>
                  {[
                    { key: 'all', label: 'Tumu (' + stats.total + ')', col: '#4f46e5' },
                    { key: 'completed', label: 'Cozenler (' + stats.completed + ')', col: '#059669' },
                    { key: 'pending', label: 'Bekleyenler (' + (stats.total - stats.completed) + ')', col: '#d97706' },
                  ].map(f => (
                    <button key={f.key} onClick={() => setStatsStudentFilter(f.key)} style={{ flex: 1, padding: '0.3rem 0.5rem', borderRadius: '0.55rem', border: 'none', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', background: statsStudentFilter === f.key ? f.col : '#fff', color: statsStudentFilter === f.key ? '#fff' : '#64748b' }}>{f.label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '38vh', overflowY: 'auto' }}>
                  {stats.targetStudentIds.filter(stId => {
                    const sub = submissions.find(s => (s.hwId === activeHomework.id || s.testId === activeHomework.id) && s.studentId === stId) || (activeHomework.submissions || []).find(s => s.studentId === stId);
                    if (statsStudentFilter === 'completed') return !!sub;
                    if (statsStudentFilter === 'pending') return !sub;
                    return true;
                  }).map(stId => {
                    const student = students.find(s => s.id === stId);
                    if (!student) return null;
                    const submission = (activeHomework.submissions || []).find(s => s.studentId === stId) || submissions.find(s => (s.hwId === activeHomework.id || s.testId === activeHomework.id) && s.studentId === stId);
                    const handleReview = () => { setShowStatsModal(false); if (activeHomework.type === 'physicalExam') navigate('/physical-exam/' + activeHomework.id + '?studentId=' + stId); else if (submission?.id) navigate('/review/' + submission.id); else navigate('/quiz/' + activeHomework.id + '?studentId=' + stId); };
                    return (
                      <div key={stId} onClick={submission ? handleReview : undefined} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', borderRadius: '0.7rem', border: '1px solid #f1f5f9', background: submission ? '#fafafa' : '#fff', cursor: submission ? 'pointer' : 'default' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{student.name.charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{student.name}</div>
                            {submission && <div style={{ fontSize: '0.67rem', color: '#7c3aed', fontWeight: 700 }}>Incelemek icin tikla</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          {submission ? (
                            <span style={{ background: '#f0fdf4', color: '#15803d', fontWeight: 900, fontSize: '0.7rem', padding: '0.22rem 0.55rem', borderRadius: '0.4rem', border: '1px solid #bbf7d0' }}>{submission.score} {activeHomework.type === 'physicalExam' ? 'Net' : 'Puan'}</span>
                          ) : (
                            <span style={{ background: '#fffbeb', color: '#b45309', fontWeight: 800, fontSize: '0.7rem', padding: '0.22rem 0.55rem', borderRadius: '0.4rem', border: '1px solid #fde68a' }}>Bekliyor</span>
                          )}
                          {submission ? (
                            <button onClick={e => { e.stopPropagation(); handleReview(); }} style={{ background: '#eff6ff', border: 'none', borderRadius: '0.4rem', padding: '0.28rem', cursor: 'pointer', display: 'flex' }}><Eye size={13} color="#1d4ed8" /></button>
                          ) : (
                            <button onClick={e => { e.stopPropagation(); showToast(student.name + ' adli ogrenciye hatirlatma gonderildi!'); }} style={{ background: '#fffbeb', border: 'none', borderRadius: '0.4rem', padding: '0.28rem', cursor: 'pointer', display: 'flex' }}><Send size={13} color="#b45309" /></button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  const STEPS_DEF = [
    { id: 1, label: 'Temel Bilgiler', icon: ClipboardList, desc: 'Baslik, tarih, sure' },
    { id: 2, label: 'Hedef Kitle', icon: Users, desc: 'Sinif veya ogrenci sec' },
    { id: 3, label: 'Soru Secimi', icon: CheckSquare, desc: selectedQuestionIds.length + ' soru secildi' },
  ];
  const selUnits = curData.units.filter(u => selSubject !== 'all' ? u.subjectId === selSubject : (selGrade !== 'all' ? curData.subjects.filter(s => s.gradeId === selGrade).map(s => s.id).includes(u.subjectId) : true));
  const selTopics = curData.topics.filter(t => selUnit !== 'all' ? t.unitId === selUnit : selUnits.map(u => u.id).includes(t.unitId));

  return (
    <div style={{ ...C.page, paddingBottom: '5rem' }}>
      <Toast msg={toast} />
      <style>{`
        @keyframes hwToastIn { from{opacity:0;transform:translateX(40px) scale(0.95)} to{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes hwFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .wiz-step { animation: hwFadeUp 0.22s ease; }
        .q-row:hover { background: #f8fafc !important; }
      `}</style>
      <header style={C.header}>
        <button onClick={resetForm} style={{ ...C.chipBtn(false), padding: '0.45rem 0.9rem' }}><ArrowLeft size={14} /> Geri Don</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: '0.98rem', color: '#1e293b' }}>{editingHwId ? 'Odevi Duzenle' : 'Odev Sihirbazi'}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Adim {step}/3 - {STEPS_DEF[step-1]?.desc}</div>
        </div>
        <button onClick={handleSave} style={{ ...C.primaryBtn, padding: '0.5rem 1rem', fontSize: '0.82rem' }}><CheckCheck size={15} /> Yayınla</button>
      </header>
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '1.4rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', background: '#fff', borderRadius: '0.9rem', padding: '0.4rem', border: '1px solid #e2e8f0' }}>
          {STEPS_DEF.map(s => {
            const isAct = step === s.id; const isDone = step > s.id;
            const canGo = s.id <= step || (s.id === 2 && canStep2) || (s.id === 3 && canStep2 && selectedTargets.length > 0);
            const SIcon = s.icon;
            return (
              <button key={s.id} onClick={() => canGo && setStep(s.id)} style={{ flex: 1, padding: '0.6rem 0.4rem', borderRadius: '0.65rem', border: 'none', cursor: canGo ? 'pointer' : 'not-allowed', background: isAct ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : isDone ? '#f0fdf4' : '#f8fafc', color: isAct ? '#fff' : isDone ? '#059669' : '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.18rem', transition: 'all 0.18s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {isDone ? <CheckCircle size={14} /> : <SIcon size={14} />}
                  <span style={{ fontWeight: 900, fontSize: '0.77rem' }}>{s.label}</span>
                </div>
                <span style={{ fontSize: '0.63rem', opacity: 0.8, fontWeight: 600 }}>{s.desc}</span>
              </button>
            );
          })}
        </div>
        {step === 1 && (
          <div className="wiz-step" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ ...C.card, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingBottom: '0.8rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ClipboardList size={18} color="#fff" /></div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>Temel Bilgiler</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Baslik, son tarih ve sure ayarlarini girin</div>
                </div>
              </div>
              <div>
                <label style={C.label}>Odev Basligi *</label>
                <input style={C.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ornegin: Hafta Sonu Matematik Uslu Ifadeler..." />
              </div>
              <div>
                <label style={C.label}>Son Teslim Tarihi *</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {[{ l: 'Yarin', d: 1 }, { l: '3 Gun', d: 3 }, { l: '1 Hafta', d: 7 }, { l: '2 Hafta', d: 14 }, { l: '1 Ay', d: 30 }].map(p => (
                    <button key={p.l} type="button" onClick={() => setDueDatePreset(p.d)} style={C.chipBtn(false)}>{p.l}</button>
                  ))}
                </div>
                <input type="date" style={C.input} value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div>
                <label style={C.label}>Soru Basi Sure (Dakika)</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {[1, 2, 3, 5, 10].map(t => (<button key={t} type="button" onClick={() => setTimePerQuestion(t)} style={C.chipBtn(timePerQuestion === t)}>{t} dk</button>))}
                </div>
                <input type="number" min={1} max={60} style={{ ...C.input, width: 110 }} value={timePerQuestion} onChange={e => setTimePerQuestion(e.target.value)} />
              </div>
            </div>
            <button onClick={() => { if (canStep2) setStep(2); else showToast('Lutfen baslik ve tarihi doldurun.'); }} style={{ ...C.primaryBtn, alignSelf: 'flex-end' }}>Devam Et <ArrowRight size={16} /></button>
          </div>
        )}
        {step === 2 && (
          <div className="wiz-step" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ ...C.card, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingBottom: '0.8rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: 'linear-gradient(135deg,#059669,#047857)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Target size={18} color="#fff" /></div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>Hedef Kitle</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Sinif bazli veya bireysel secim yapabilirsiniz</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', background: '#f8fafc', borderRadius: '0.75rem', padding: '0.3rem' }}>
                {[{ k: 'grade', l: 'Sinif Bazli Atama' }, { k: 'student', l: 'Bireysel Ogrenci' }].map(m => (
                  <button key={m.k} onClick={() => { setTargetMode(m.k); setSelectedTargets([]); }} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.6rem', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', background: targetMode === m.k ? 'linear-gradient(135deg,#059669,#047857)' : 'transparent', color: targetMode === m.k ? '#fff' : '#64748b' }}>{m.l}</button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>{selectedTargets.length} secildi</span>
                <button onClick={handleSelectAllTargets} style={{ ...C.chipBtn(false), fontSize: '0.72rem' }}><CheckCheck size={12} /> Tumunu Sec/Kaldir</button>
              </div>
              {targetMode === 'grade' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: '0.6rem' }}>
                  {curData.grades.map(g => {
                    const isSel = selectedTargets.includes(g.id);
                    return (
                      <div key={g.id} onClick={() => setSelectedTargets(prev => isSel ? prev.filter(x => x !== g.id) : [...prev, g.id])} style={{ padding: '0.85rem', borderRadius: '0.85rem', cursor: 'pointer', border: isSel ? '2px solid #059669' : '1.5px solid #e2e8f0', background: isSel ? '#f0fdf4' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem', transition: 'all 0.15s' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '0.6rem', background: isSel ? 'linear-gradient(135deg,#059669,#047857)' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GraduationCap size={16} color={isSel ? '#fff' : '#94a3b8'} /></div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.82rem', color: isSel ? '#15803d' : '#1e293b' }}>{g.name}</div>
                          <div style={{ fontSize: '0.67rem', color: '#94a3b8' }}>{students.filter(s => s.gradeId === g.id).length} ogrenci</div>
                        </div>
                        {isSel && <CheckCircle size={15} color="#059669" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <button onClick={() => setStudentGradeFilter('all')} style={C.chipBtn(studentGradeFilter === 'all')}>Tumu</button>
                    {curData.grades.map(g => (<button key={g.id} onClick={() => setStudentGradeFilter(g.id)} style={C.chipBtn(studentGradeFilter === g.id)}>{g.name}</button>))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: '0.45rem' }}>
                    {filteredStudents.map(s => {
                      const isSel = selectedTargets.includes(s.id);
                      return (
                        <div key={s.id} onClick={() => setSelectedTargets(prev => isSel ? prev.filter(x => x !== s.id) : [...prev, s.id])} style={{ padding: '0.6rem 0.85rem', borderRadius: '0.7rem', cursor: 'pointer', border: isSel ? '2px solid #059669' : '1.5px solid #e2e8f0', background: isSel ? '#f0fdf4' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: isSel ? 'linear-gradient(135deg,#059669,#047857)' : '#e2e8f0', color: isSel ? '#fff' : '#94a3b8', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.name.charAt(0)}</div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.8rem', color: isSel ? '#15803d' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                            <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{curData.grades.find(g => g.id === s.gradeId)?.name}</div>
                          </div>
                          {isSel && <CheckCircle size={13} color="#059669" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(1)} style={C.chipBtn(false)}><ArrowLeft size={14} /> Geri</button>
              <button onClick={() => { if (selectedTargets.length > 0) setStep(3); else showToast('Lutfen en az bir hedef secin.'); }} style={C.primaryBtn}>Sorulara Gec <ArrowRight size={15} /></button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="wiz-step" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ ...C.card, padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
                <Filter size={15} color="#4f46e5" />
                <span style={{ fontWeight: 900, fontSize: '0.88rem' }}>Soru Filtrele</span>
                <span style={{ marginLeft: 'auto', background: '#eff6ff', color: '#1d4ed8', fontWeight: 900, fontSize: '0.7rem', padding: '0.18rem 0.55rem', borderRadius: 99, border: '1px solid #bfdbfe', whiteSpace: 'nowrap' }}>{filteredQuestions.length} soru</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '0.45rem' }}>
                <select style={{ ...C.input, padding: '0.5rem 0.7rem', fontSize: '0.77rem' }} value={selGrade} onChange={e => { setSelGrade(e.target.value); setSelSubject('all'); setSelUnit('all'); setSelTopic('all'); }}>
                  <option value="all">Tum Siniflar</option>
                  {curData.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <select style={{ ...C.input, padding: '0.5rem 0.7rem', fontSize: '0.77rem' }} value={selSubject} onChange={e => { setSelSubject(e.target.value); setSelUnit('all'); setSelTopic('all'); }}>
                  <option value="all">Tum Dersler</option>
                  {curData.subjects.filter(s => selGrade === 'all' || s.gradeId === selGrade).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select style={{ ...C.input, padding: '0.5rem 0.7rem', fontSize: '0.77rem' }} value={selUnit} onChange={e => { setSelUnit(e.target.value); setSelTopic('all'); }}>
                  <option value="all">Tum Uniteler</option>
                  {selUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select style={{ ...C.input, padding: '0.5rem 0.7rem', fontSize: '0.77rem' }} value={selTopic} onChange={e => setSelTopic(e.target.value)}>
                  <option value="all">Tum Konular</option>
                  {selTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select style={{ ...C.input, padding: '0.5rem 0.7rem', fontSize: '0.77rem' }} value={selQuestionType} onChange={e => setSelQuestionType(e.target.value)}>
                  <option value="all">Tum Turler</option>
                  <option value="coktan_secmeli">Coktan Secmeli</option>
                  <option value="acik_uclu">Acik Uclu</option>
                  <option value="bundle">Soru Seti</option>
                </select>
                <select style={{ ...C.input, padding: '0.5rem 0.7rem', fontSize: '0.77rem' }} value={selContentType} onChange={e => setSelContentType(e.target.value)}>
                  <option value="all">Tum Tipler</option>
                  <option value="pdf">PDF</option>
                  <option value="html">HTML</option>
                  <option value="text">Metin</option>
                  <option value="gorsel">Gorsel</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input style={{ ...C.input, paddingLeft: '2.2rem' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Soru ara..." />
              </div>
            </div>
            <div style={{ ...C.card, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>Soru Bankasi <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 99, marginLeft: '0.4rem' }}>{selectedQuestionIds.length} secildi</span></span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={handleSelectAllFiltered} style={{ ...C.chipBtn(false), fontSize: '0.72rem' }}><CheckCheck size={12} /> Tumunu Sec/Kaldir</button>
                  {selectedQuestionIds.length > 0 && (<button onClick={() => setSelectedQuestionIds([])} style={{ ...C.chipBtn(false), fontSize: '0.72rem', color: '#dc2626', borderColor: '#fecaca' }}><RefreshCw size={12} /> Sifirla</button>)}
                </div>
              </div>
              {filteredQuestions.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                  <Search size={36} style={{ display: 'block', margin: '0 auto 0.7rem', opacity: 0.25 }} />
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Bu filtreye uygun soru bulunamadi.</div>
                </div>
              ) : (
                <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                  {filteredQuestions.map(q => {
                    const isSel = selectedQuestionIds.includes(q.id);
                    return (
                      <div key={q.id} className="q-row" onClick={() => toggleQ(q.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.65rem 1rem', borderBottom: '1px solid #f8fafc', cursor: 'pointer', background: isSel ? '#eff6ff' : '#fff', transition: 'background 0.1s' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '0.38rem', flexShrink: 0, border: isSel ? 'none' : '2px solid #e2e8f0', background: isSel ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{isSel && <Check size={12} color="#fff" strokeWidth={3} />}</div>
                        <div style={{ width: 32, height: 32, borderRadius: '0.52rem', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{getQIcon(q.contentType)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title || q.name || 'Baslıksız Soru'}</div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 1, display: 'flex', gap: '0.5rem' }}>
                            {q.isBundle && <span style={{ background: '#f3e8ff', color: '#7c3aed', fontWeight: 800, padding: '0.08rem 0.38rem', borderRadius: '0.3rem' }}>{(q.questionCount || q.questionsList?.length || 1)} Soru Seti</span>}
                            {q.type === 'acik_uclu' && <span style={{ background: '#fffbeb', color: '#b45309', fontWeight: 800, padding: '0.08rem 0.38rem', borderRadius: '0.3rem' }}>Acik Uclu</span>}
                            {q.contentType && <span>{q.contentType}</span>}
                          </div>
                        </div>
                        {isSel && <span style={{ background: '#4f46e5', color: '#fff', fontWeight: 900, fontSize: '0.62rem', padding: '0.12rem 0.45rem', borderRadius: 99, flexShrink: 0 }}>SECILDI</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ ...C.card, padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.7rem' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: '0.88rem' }}>{selectedQuestionIds.length > 0 ? selectedQuestionIds.length + ' Soru Secildi' : 'Henuz soru secilmedi'}</div>
                {selectedQuestionIds.length > 0 && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Tahmini sure: ~{selectedQuestionIds.length * timePerQuestion} dakika</div>}
              </div>
              <div style={{ display: 'flex', gap: '0.55rem' }}>
                <button onClick={() => setStep(2)} style={{ ...C.chipBtn(false), padding: '0.55rem 1rem' }}><ArrowLeft size={14} /> Geri</button>
                <button onClick={handleSave} style={{ ...C.primaryBtn }}><Sparkles size={15} /> {editingHwId ? 'Ödevi Güncelle' : 'Ödevi Yayınla!'}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
