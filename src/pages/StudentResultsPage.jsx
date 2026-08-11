import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListTree, Search, Calendar, Award, CheckCircle2, Clock3, Eye,
  ArrowLeft, GraduationCap, Ruler, TestTube2, BookCopy, Globe,
  MessageSquare, Sparkles, BookOpen, Layers, Trophy, TrendingUp,
  BarChart3, Target, BookMarked, XCircle, Table, List, Home,
  ChevronRight, AlertTriangle, Zap, FileText, BookCheck, GraduationCap as Exam,
  FlameKindling, ThumbsUp, ThumbsDown, Minus, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, ReferenceLine, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie
} from 'recharts';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useTrackedBooks } from '../context/TrackedBookContext';

/* ── Subject Config ────────────────────────────────────────────────── */
const SUBJECTS = ['Matematik', 'Fen Bilimleri', 'Türkçe', 'Sosyal Bilgiler', 'İngilizce', 'Genel Testler'];
const subjectThemes = {
  'Matematik':       { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: Ruler,         radar: '#3b82f6', light: '#dbeafe' },
  'Fen Bilimleri':   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: TestTube2,      radar: '#10b981', light: '#d1fae5' },
  'Türkçe':          { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: BookCopy,       radar: '#f97316', light: '#ffedd5' },
  'Sosyal Bilgiler': { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', icon: Globe,          radar: '#a855f7', light: '#f3e8ff' },
  'İngilizce':       { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', icon: MessageSquare,  radar: '#f43f5e', light: '#ffe4e6' },
  'Genel Testler':   { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', icon: Trophy,         radar: '#6366f1', light: '#e0e7ff' },
  'Diğer':           { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', icon: BookOpen,       radar: '#94a3b8', light: '#f1f5f9' },
};

const typeConfig = {
  physicalExam: { label: '🏛️ Deneme',     bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },
  homework:     { label: '📝 Ödev',        bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  book:         { label: '📕 Kitap Testi', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  individual:   { label: '⚡ Bireysel',    bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
};

function getSubjectKey(s) {
  const t = ((s.testTitle || '') + ' ' + (s.subjectKey || '')).toLowerCase();
  if (t.includes('matematik') || t.includes('mat')) return 'Matematik';
  if (t.includes('fen')) return 'Fen Bilimleri';
  if (t.includes('türkçe') || t.includes('turkce') || t.includes('türk')) return 'Türkçe';
  if (t.includes('sosyal') || t.includes('inkılap')) return 'Sosyal Bilgiler';
  if (t.includes('ingilizce') || t.includes('english') || t.includes('ing')) return 'İngilizce';
  if (t.includes('deneme') || t.includes('genel')) return 'Genel Testler';
  return s.subjectKey || 'Diğer';
}

function getTypeKey(s) {
  if (s.type === 'physicalExam') return 'physicalExam';
  if (s.bookTestId) return 'book';
  if (s.isHomework) return 'homework';
  return 'individual';
}

function ScoreBadge({ score, type, size = 'md' }) {
  const fontSize = size === 'lg' ? '1.35rem' : size === 'sm' ? '0.8rem' : '1rem';
  const pad = size === 'sm' ? '0.2rem 0.55rem' : '0.25rem 0.75rem';
  const color = score >= 80 ? '#166534' : score >= 60 ? '#854d0e' : '#991b1b';
  const bg = score >= 80 ? '#dcfce7' : score >= 60 ? '#fef9c3' : '#fee2e2';
  const border = score >= 80 ? '#86efac' : score >= 60 ? '#fde047' : '#fca5a5';
  return (
    <span style={{ fontSize, fontWeight: 900, background: bg, color, border: `1.5px solid ${border}`, borderRadius: 10, padding: pad, display: 'inline-block' }}>
      {type === 'physicalExam' ? `${score} Net` : `%${score}`}
    </span>
  );
}

function StatusTag({ accuracy }) {
  if (accuracy >= 80) return <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: 8, padding: '0.18rem 0.6rem', fontSize: '0.7rem', fontWeight: 900 }}>🏆 Güçlü</span>;
  if (accuracy >= 60) return <span style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: 8, padding: '0.18rem 0.6rem', fontSize: '0.7rem', fontWeight: 900 }}>📈 Gelişiyor</span>;
  return <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.18rem 0.6rem', fontSize: '0.7rem', fontWeight: 900 }}>⚠️ Kritik</span>;
}

const TAB_DEFS = [
  { key: 'overview',  label: '🏠 Genel Bakış',    icon: Home },
  { key: 'subjects',  label: '📚 Ders & Konu',     icon: BookOpen },
  { key: 'bytype',    label: '📝 Ödev & Deneme',   icon: FileText },
  { key: 'trend',     label: '📈 Zaman Trendi',    icon: TrendingUp },
  { key: 'all',       label: '🗃️ Tüm Sonuçlar',   icon: Table },
];

/* ── Custom Tooltip ─────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload || {};
  return (
    <div style={{ background: '#0f172a', color: 'white', padding: '0.75rem 1rem', borderRadius: 12, boxShadow: '0 8px 20px rgba(0,0,0,0.3)', border: '1px solid #334155', minWidth: 160 }}>
      <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#38bdf8', marginBottom: 4 }}>{d.title || d.ders || label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 2 }}>
          <span style={{ color: p.color || '#94a3b8' }}>{p.name}</span>
          <span style={{ fontWeight: 800 }}>{typeof p.value === 'number' && p.name?.includes('%') ? `%${p.value}` : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function StudentResultsPage() {
  const navigate = useNavigate();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { data: curData } = useCurriculum();
  const { books, bookTests } = useTrackedBooks();

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudent, setSelectedStudent] = useState(studentMembers[0] || null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [typeFilter, setTypeFilter]   = useState('all');
  const [viewMode, setViewMode]       = useState('table');
  const [trendSubject, setTrendSubject] = useState('all');
  const [byTypeTab, setByTypeTab]       = useState('homework');
  const [expandedSubject, setExpandedSubject] = useState(null);

  /* ── Curriculum test map ─── */
  const allCurTestsMap = useMemo(() => {
    const map = new Map();
    if (!curData) return map;
    (curData.tests || []).forEach(t => {
      if (t.id) map.set(t.id, { title: t.title || t.name, subject: t.subjectName || t.subject });
    });
    (curData.grades || []).forEach(g => {
      (g.subjects || []).forEach(s => {
        (s.units || []).forEach(u => {
          (u.topics || []).forEach(top => {
            (top.tests || []).forEach(t => {
              if (t.id) map.set(t.id, { title: t.title || t.name, subject: s.name, topic: top.name });
            });
          });
        });
      });
    });
    return map;
  }, [curData]);

  /* ── Build studentSubmissions ─── */
  const studentSubmissions = useMemo(() => {
    if (!selectedStudent) return [];

    const baseSubs = (submissions || [])
      .filter(s => String(s.studentId) === String(selectedStudent.id));

    const hwSubs = [];
    (homeworks || []).forEach(hw => {
      (hw.submissions || []).forEach(sub => {
        if (String(sub.studentId) !== String(selectedStudent.id)) return;
        const exists = baseSubs.some(s => s.hwId === hw.id || s.testId === hw.id || s.id === hw.id);
        if (!exists) {
          hwSubs.push({
            id: `hw_sub_${hw.id}_${selectedStudent.id}`,
            hwId: hw.id, testId: hw.id,
            testTitle: hw.title, studentId: selectedStudent.id,
            score: sub.score,
            submittedAt: sub.completedAt || sub.submittedAt || new Date().toISOString(),
            isHomework: true, type: hw.type || 'homework',
            totalQuestions: hw.totalQuestions || sub.totalQuestions || hw.questionCount || 0,
            correctCount: sub.correctCount || (sub.score ? Math.round((sub.score / 100) * (hw.totalQuestions || sub.totalQuestions || hw.questionCount || 0)) : 0),
            wrongCount: sub.wrongCount || 0, blankCount: sub.blankCount || 0,
            status: sub.status || 'completed',
            subjectStats: sub.subjectStats, studentAnswers: sub.studentAnswers
          });
        }
      });
    });

    // Book test submissions
    const bookSubs = [];
    (bookTests || []).forEach(bt => {
      (bt.submissions || []).forEach(sub => {
        if (String(sub.studentId) !== String(selectedStudent.id)) return;
        const parentBook = (books || []).find(b => b.id === bt.bookId);
        bookSubs.push({
          id: `book_sub_${bt.id}_${selectedStudent.id}`,
          hwId: bt.id, testId: bt.id,
          testTitle: bt.name || `${parentBook?.title || 'Kitap'} — Test`,
          studentId: selectedStudent.id,
          score: sub.score,
          submittedAt: sub.completedAt || sub.submittedAt || new Date().toISOString(),
          bookTestId: bt.id, type: 'book',
          totalQuestions: bt.questionCount || sub.totalQuestions || 0,
          correctCount: sub.correctCount || 0,
          wrongCount: sub.wrongCount || 0, blankCount: sub.blankCount || 0,
          status: sub.status || 'completed',
          bookTitle: parentBook?.title,
          publisher: parentBook?.publisher,
        });
      });
    });

    const allCombined = [...baseSubs, ...hwSubs, ...bookSubs];

    const deduplicatedMap = new Map();
    allCombined.forEach(s => {
      const key = s.hwId || s.testId || s.id;
      const existing = deduplicatedMap.get(key);
      if (!existing || new Date(s.submittedAt || 0) > new Date(existing.submittedAt || 0)) {
        deduplicatedMap.set(key, s);
      }
    });

    return Array.from(deduplicatedMap.values()).map(s => {
      let correct = s.correctCount ?? 0;
      let wrong = s.wrongCount ?? 0;
      let blank = s.blankCount ?? 0;

      if (s.answers?.length > 0) {
        correct = 0; wrong = 0; blank = 0;
        s.answers.forEach(ans => {
          if (ans.isCorrect === true) correct++;
          else if (ans.isCorrect === false) {
            if (!ans.userAnswer) blank++; else wrong++;
          }
        });
      }

      const matchedHw = (homeworks || []).find(h => h.id === s.hwId || h.id === s.testId || (Array.isArray(h.questionIds) && h.questionIds.includes(s.testId)));
      const matchedCur = allCurTestsMap.get(s.testId) || allCurTestsMap.get(s.hwId);

      let title = s.testTitle;
      const isGeneric = !title || ['test sınavı','test sinavi','test'].includes((title||'').trim().toLowerCase());
      if (matchedHw?.title) title = matchedHw.title;
      else if (matchedCur?.title) title = matchedCur.title;
      else if (isGeneric) title = matchedHw?.subject ? `${matchedHw.subject} Ödevi` : s.type === 'physicalExam' ? 'Fiziki Deneme' : 'Ödev Sınavı';

      const subjKey = getSubjectKey({ testTitle: title, subjectKey: matchedHw?.subject || matchedCur?.subject || s.subjectKey || '' });
      const typeKey = getTypeKey(s);
      const total = s.totalQuestions || (s.answers?.length) || (correct + wrong + blank) || (matchedHw?.totalQuestions) || 0;
      const score = s.score !== undefined && s.score !== null && s.score <= 100 ? s.score
        : total > 0 ? Math.round((correct / total) * 100) : (s.score ? Math.min(100, s.score) : 0);

      return { ...s, testTitle: title, subjectKey: subjKey, typeKey, correctCount: correct, wrongCount: wrong, blankCount: blank, totalQuestions: total, computedScore: score };
    }).sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [submissions, homeworks, bookTests, books, allCurTestsMap, selectedStudent]);

  /* ── Overall Stats ─── */
  const overallStats = useMemo(() => {
    const total = studentSubmissions.length;
    if (total === 0) return { total: 0, avgScore: 0, maxScore: 0, totalQ: 0, totalCorrect: 0, weakSubjects: 0 };
    let sumScore = 0, max = 0, totalQ = 0, totalCorrect = 0;
    studentSubmissions.forEach(s => {
      sumScore += s.computedScore;
      if (s.computedScore > max) max = s.computedScore;
      totalQ += s.totalQuestions;
      totalCorrect += s.correctCount;
    });
    const subjectAvgs = {};
    studentSubmissions.forEach(s => {
      if (!subjectAvgs[s.subjectKey]) subjectAvgs[s.subjectKey] = { sum: 0, count: 0 };
      subjectAvgs[s.subjectKey].sum += s.computedScore;
      subjectAvgs[s.subjectKey].count++;
    });
    const weakSubjects = Object.values(subjectAvgs).filter(v => v.count > 0 && (v.sum / v.count) < 60).length;
    return {
      total,
      avgScore: Math.round(sumScore / total),
      maxScore: Math.round(max),
      totalQ, totalCorrect, weakSubjects,
      completedCount: studentSubmissions.filter(s => s.status !== 'pending_evaluation').length,
    };
  }, [studentSubmissions]);

  /* ── Radar data (per-subject average) ─── */
  const radarData = useMemo(() => {
    const map = {};
    SUBJECTS.forEach(s => { map[s] = { sum: 0, count: 0 }; });
    studentSubmissions.forEach(s => {
      if (map[s.subjectKey]) { map[s.subjectKey].sum += s.computedScore; map[s.subjectKey].count++; }
    });
    return SUBJECTS.map(s => ({ subject: s.length > 8 ? s.slice(0, 7) + '.' : s, value: map[s].count > 0 ? Math.round(map[s].sum / map[s].count) : 0, fullSubject: s }));
  }, [studentSubmissions]);

  /* ── Pie / type breakdown ─── */
  const typeBreakdown = useMemo(() => {
    const counts = { physicalExam: 0, homework: 0, book: 0, individual: 0 };
    studentSubmissions.forEach(s => { counts[s.typeKey] = (counts[s.typeKey] || 0) + 1; });
    return [
      { name: 'Deneme', value: counts.physicalExam, fill: '#6366f1' },
      { name: 'Ödev',   value: counts.homework,     fill: '#f97316' },
      { name: 'Kitap',  value: counts.book,          fill: '#10b981' },
      { name: 'Bireysel',value: counts.individual,   fill: '#94a3b8' },
    ].filter(d => d.value > 0);
  }, [studentSubmissions]);

  /* ── Subject breakdown (for Ders & Konu tab) ─── */
  const subjectBreakdown = useMemo(() => {
    const map = {};
    SUBJECTS.forEach(s => { map[s] = { tests: [], totalQ: 0, totalCorrect: 0, topics: {} }; });
    studentSubmissions.forEach(s => {
      const sk = SUBJECTS.includes(s.subjectKey) ? s.subjectKey : 'Diğer';
      if (!map[sk]) map[sk] = { tests: [], totalQ: 0, totalCorrect: 0, topics: {} };
      map[sk].tests.push(s);
      map[sk].totalQ += s.totalQuestions;
      map[sk].totalCorrect += s.correctCount;
      const topicKey = s.testTitle || 'Genel';
      if (!map[sk].topics[topicKey]) map[sk].topics[topicKey] = { totalQ: 0, correctQ: 0, wrongQ: 0 };
      map[sk].topics[topicKey].totalQ += s.totalQuestions;
      map[sk].topics[topicKey].correctQ += s.correctCount;
      map[sk].topics[topicKey].wrongQ += s.wrongCount;
    });
    return Object.entries(map)
      .filter(([, v]) => v.tests.length > 0)
      .map(([subj, v]) => {
        const avgScore = v.tests.length > 0 ? Math.round(v.tests.reduce((a, s) => a + s.computedScore, 0) / v.tests.length) : 0;
        const topicArray = Object.entries(v.topics).map(([name, t]) => ({
          name: name.length > 30 ? name.slice(0, 28) + '…' : name,
          accuracy: t.totalQ > 0 ? Math.round((t.correctQ / t.totalQ) * 100) : 0,
          totalQ: t.totalQ,
        })).sort((a, b) => a.accuracy - b.accuracy);
        return { subj, ...v, avgScore, topicArray };
      })
      .sort((a, b) => a.avgScore - b.avgScore);
  }, [studentSubmissions]);

  /* ── Trend data ─── */
  const trendData = useMemo(() => {
    let data = [...studentSubmissions].sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));
    if (trendSubject !== 'all') data = data.filter(s => s.subjectKey === trendSubject);
    return data.map((s, i) => ({
      name: s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : `${i + 1}`,
      title: s.testTitle,
      'Başarı %': s.computedScore,
      'Doğru': s.correctCount,
      'Yanlış': s.wrongCount,
      'Boş': s.blankCount,
    }));
  }, [studentSubmissions, trendSubject]);

  /* ── Filtered for "Tüm Sonuçlar" tab ─── */
  const filteredSubs = useMemo(() => {
    return studentSubmissions.filter(s => {
      const titleMatch = (s.testTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
      const subjectMatch = subjectFilter === 'all' || s.subjectKey === subjectFilter;
      const typeMatch = typeFilter === 'all' || s.typeKey === typeFilter;
      return titleMatch && subjectMatch && typeMatch;
    });
  }, [studentSubmissions, searchQuery, subjectFilter, typeFilter]);

  /* ── By-type tab submissions ─── */
  const byTypeSubs = useMemo(() => {
    const map = { physicalExam: [], homework: [], book: [], individual: [] };
    studentSubmissions.forEach(s => { (map[s.typeKey] || []).push(s); });
    return map;
  }, [studentSubmissions]);

  /* ── Helpers ─── */
  const theme = (key) => subjectThemes[key] || subjectThemes['Diğer'];

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '1rem', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/student')} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.8rem', color: '#475569', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <ArrowLeft size={15} /> Geri
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={22} color="#6366f1" /> Gelişim Merkezi & Karne
              </h1>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>Ders bazlı · Konu bazlı · Ödev türü bazlı ayrıntılı analiz</p>
            </div>
          </div>

          {/* Student Selector */}
          <div style={{ display: 'flex', gap: 6, background: 'white', padding: 6, borderRadius: 16, border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            {studentMembers.map(s => {
              const active = selectedStudent?.id === s.id;
              return (
                <button key={s.id} onClick={() => setSelectedStudent(s)} style={{ padding: '0.4rem 0.9rem', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', background: active ? '#6366f1' : 'transparent', color: active ? 'white' : '#475569' }}>
                  <GraduationCap size={14} /> {s.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display: 'flex', gap: 4, background: 'white', padding: 6, borderRadius: 18, border: '1px solid #e2e8f0', marginBottom: 20, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {TAB_DEFS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: '1 1 auto', padding: '0.55rem 0.9rem', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s', background: activeTab === t.key ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent', color: activeTab === t.key ? 'white' : '#64748b', boxShadow: activeTab === t.key ? '0 4px 12px rgba(99,102,241,0.3)' : 'none', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            TAB 1: GENEL BAKIŞ
        ══════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {[
                { label: 'Çözülen Test', value: overallStats.total, icon: '📊', color: '#6366f1', bg: '#eef2ff' },
                { label: 'Ort. Başarı', value: `%${overallStats.avgScore}`, icon: '🎯', color: '#10b981', bg: '#f0fdf4' },
                { label: 'En Yüksek', value: `%${overallStats.maxScore}`, icon: '🏆', color: '#f59e0b', bg: '#fffbeb' },
                { label: 'Toplam Soru', value: overallStats.totalQ, icon: '📝', color: '#0ea5e9', bg: '#f0f9ff' },
                { label: 'Toplam Doğru', value: overallStats.totalCorrect, icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Kritik Ders', value: overallStats.weakSubjects, icon: '⚠️', color: '#ef4444', bg: '#fef2f2' },
              ].map((k, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 18, padding: '1rem 1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{k.icon}</div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginTop: 2 }}>{k.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Radar + Pie row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Radar */}
              <div style={{ background: 'white', borderRadius: 20, padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🕸️ Ders Bazlı Performans Haritası
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" style={{ fontSize: '0.72rem', fontWeight: 700, fill: '#475569' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} style={{ fontSize: '0.65rem' }} tick={{ fill: '#94a3b8' }} />
                    <Radar name="Başarı" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.22} strokeWidth={2} />
                    <Tooltip formatter={(v) => [`%${v}`, 'Ortalama Başarı']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie + legend */}
              <div style={{ background: 'white', borderRadius: 20, padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🍩 Ödev Türü Dağılımı
                </h3>
                {typeBreakdown.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                          {typeBreakdown.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {typeBreakdown.map((e, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 800 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: e.fill, flexShrink: 0 }} />
                          <span style={{ color: '#475569' }}>{e.name}: <b style={{ color: '#0f172a' }}>{e.value}</b></span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem 0', fontWeight: 700 }}>Henüz veri yok</div>
                )}
              </div>
            </div>

            {/* Recent 5 tests */}
            <div style={{ background: 'white', borderRadius: 20, padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                🕐 Son 5 Sınav / Ödev
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {studentSubmissions.slice(0, 5).map((s, i) => {
                  const th = theme(s.subjectKey);
                  const SubIcon = th.icon;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', borderRadius: 14, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: th.bg, border: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SubIcon size={18} color={th.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.testTitle}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginTop: 1 }}>
                          {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'} · {s.totalQuestions} Soru
                        </div>
                      </div>
                      <ScoreBadge score={s.computedScore} type={s.type} size="sm" />
                    </div>
                  );
                })}
                {studentSubmissions.length === 0 && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0', fontWeight: 700 }}>Henüz sonuç bulunmuyor</div>}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 2: DERS & KONU ANALİZİ
        ══════════════════════════════════════ */}
        {activeTab === 'subjects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {subjectBreakdown.length === 0 && (
              <div style={{ background: 'white', borderRadius: 20, padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 700, border: '1px solid #e2e8f0' }}>
                Henüz ders/konu verisi yok
              </div>
            )}
            {subjectBreakdown.map(({ subj, tests, avgScore, topicArray, totalQ, totalCorrect }) => {
              const th = theme(subj);
              const SubIcon = th.icon;
              const isExpanded = expandedSubject === subj;
              return (
                <div key={subj} style={{ background: 'white', borderRadius: 20, border: `1.5px solid ${th.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                  {/* Subject Header */}
                  <button onClick={() => setExpandedSubject(isExpanded ? null : subj)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.4rem', background: th.bg, border: 'none', cursor: 'pointer', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 14, background: 'white', border: `1.5px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SubIcon size={22} color={th.color} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 900, fontSize: '1.05rem', color: th.color }}>{subj}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>{tests.length} test · {totalQ} soru · {totalCorrect} doğru</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ScoreBadge score={avgScore} size="md" />
                      <StatusTag accuracy={avgScore} />
                      <ChevronRight size={18} color={th.color} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                  </button>

                  {/* Expanded: Topic horizontal bars */}
                  {isExpanded && topicArray.length > 0 && (
                    <div style={{ padding: '1.25rem 1.4rem' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                        📋 Konu / Test Bazlı Doğruluk Analizi
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {topicArray.map((t, i) => {
                          const barColor = t.accuracy >= 80 ? '#10b981' : t.accuracy >= 60 ? '#f59e0b' : '#ef4444';
                          return (
                            <div key={i}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>{t.totalQ}s</span>
                                  <span style={{ fontWeight: 900, fontSize: '0.82rem', color: barColor }}>%{t.accuracy}</span>
                                </div>
                              </div>
                              <div style={{ width: '100%', height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ width: `${t.accuracy}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Mini bar chart for subject */}
                      <div style={{ marginTop: 20 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>📊 Grafik Görünümü</div>
                        <ResponsiveContainer width="100%" height={Math.max(120, topicArray.length * 28)}>
                          <BarChart layout="vertical" data={topicArray} margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} style={{ fontSize: '0.68rem', fontWeight: 700 }} tick={{ fill: '#94a3b8' }} />
                            <YAxis type="category" dataKey="name" width={130} style={{ fontSize: '0.68rem', fontWeight: 700 }} tick={{ fill: '#475569' }} />
                            <Tooltip content={<ChartTooltip />} />
                            <ReferenceLine x={60} stroke="#f59e0b" strokeDasharray="4 4" />
                            <Bar dataKey="accuracy" name="% Doğruluk" radius={[0, 6, 6, 0]}>
                              {topicArray.map((t, idx) => (
                                <Cell key={idx} fill={t.accuracy >= 80 ? '#10b981' : t.accuracy >= 60 ? '#f59e0b' : '#ef4444'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 3: ÖDEV & DENEME TÜRÜ
        ══════════════════════════════════════ */}
        {activeTab === 'bytype' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Sub tabs */}
            <div style={{ display: 'flex', gap: 6, background: 'white', padding: 6, borderRadius: 16, border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              {[
                { key: 'homework',     label: '📝 Ödevler',        count: byTypeSubs.homework.length },
                { key: 'physicalExam', label: '🏛️ Denemeler',      count: byTypeSubs.physicalExam.length },
                { key: 'book',         label: '📕 Kitap Testleri', count: byTypeSubs.book.length },
                { key: 'individual',   label: '⚡ Bireysel',        count: byTypeSubs.individual.length },
              ].map(tab => (
                <button key={tab.key} onClick={() => setByTypeTab(tab.key)} style={{ flex: '1 1 auto', padding: '0.5rem 0.85rem', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: byTypeTab === tab.key ? '#6366f1' : '#f8fafc', color: byTypeTab === tab.key ? 'white' : '#64748b', whiteSpace: 'nowrap' }}>
                  {tab.label} <span style={{ background: byTypeTab === tab.key ? 'rgba(255,255,255,0.3)' : '#e2e8f0', color: byTypeTab === tab.key ? 'white' : '#475569', borderRadius: 99, padding: '0 6px', fontWeight: 900 }}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Stats mini row */}
            {(() => {
              const subs = byTypeSubs[byTypeTab] || [];
              const avg = subs.length > 0 ? Math.round(subs.reduce((a, s) => a + s.computedScore, 0) / subs.length) : 0;
              const max = subs.length > 0 ? Math.max(...subs.map(s => s.computedScore)) : 0;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Toplam', value: subs.length, icon: '📊', color: '#6366f1', bg: '#eef2ff' },
                    { label: 'Ortalama', value: `%${avg}`, icon: '🎯', color: '#10b981', bg: '#f0fdf4' },
                    { label: 'En Yüksek', value: `%${max}`, icon: '🏆', color: '#f59e0b', bg: '#fffbeb' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: 16, padding: '0.85rem 1rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.5rem' }}>{k.icon}</span>
                      <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>{k.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Cards list */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {(byTypeSubs[byTypeTab] || []).map((s, i) => {
                const th = theme(s.subjectKey);
                const SubIcon = th.icon;
                return (
                  <div key={i} style={{ background: 'white', borderRadius: 18, border: `1.5px solid ${th.border}`, padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ height: 4, background: th.color, position: 'absolute', top: 0, left: 0, right: 0 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: th.bg, border: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <SubIcon size={17} color={th.color} />
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, color: th.color, background: th.bg, border: `1px solid ${th.border}`, borderRadius: 8, padding: '0.18rem 0.5rem' }}>{s.subjectKey}</span>
                      </div>
                      <ScoreBadge score={s.computedScore} type={s.type} size="sm" />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', lineHeight: 1.3 }}>{s.testTitle}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', borderRadius: 7, padding: '0.18rem 0.5rem', fontSize: '0.72rem', fontWeight: 900 }}>✓ {s.correctCount}</span>
                      <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 7, padding: '0.18rem 0.5rem', fontSize: '0.72rem', fontWeight: 900 }}>✗ {s.wrongCount}</span>
                      <span style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 7, padding: '0.18rem 0.5rem', fontSize: '0.72rem', fontWeight: 900 }}>⚪ {s.blankCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 8, marginTop: 2 }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                        {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'} · {s.totalQuestions} Soru
                      </span>
                      {s.type !== 'physicalExam' && (
                        <button onClick={() => navigate(`/review/${s.id}`)} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 9, padding: '0.3rem 0.75rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Eye size={12} /> İncele
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {(byTypeSubs[byTypeTab] || []).length === 0 && (
                <div style={{ gridColumn: '1/-1', background: 'white', borderRadius: 18, padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 700, border: '1px solid #e2e8f0' }}>
                  Bu türde henüz sonuç bulunmuyor
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 4: ZAMAN TRENDİ
        ══════════════════════════════════════ */}
        {activeTab === 'trend' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'white', borderRadius: 20, padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📈 Zaman İçindeki Başarı Trendi
                </h3>
                <select value={trendSubject} onChange={e => setTrendSubject(e.target.value)} style={{ padding: '0.45rem 0.9rem', borderRadius: 12, border: '1px solid #e2e8f0', fontWeight: 800, fontSize: '0.8rem', background: '#f8fafc', color: '#1e293b', outline: 'none' }}>
                  <option value="all">Tüm Dersler</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trendData} margin={{ top: 10, right: 20, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" style={{ fontSize: '0.72rem', fontWeight: 700 }} tick={{ fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} style={{ fontSize: '0.72rem', fontWeight: 700 }} tick={{ fill: '#64748b' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={70} stroke="#10b981" strokeDasharray="5 5" label={{ value: 'Hedef %70', fill: '#10b981', fontSize: 11, fontWeight: 800 }} />
                    <Area type="monotone" dataKey="Başarı %" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#areaGrad)" dot={{ fill: '#6366f1', r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>Bu derse ait trend verisi yok</div>
              )}
            </div>

            {/* Doğru/Yanlış/Boş Stacked/Grouped Bar */}
            {trendData.length > 0 && (
              <div style={{ background: 'white', borderRadius: 20, padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h3 style={{ margin: '0 0 1rem', fontWeight: 900, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📊 Doğru / Yanlış / Boş Dağılımı
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={trendData} margin={{ top: 10, right: 20, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" style={{ fontSize: '0.72rem', fontWeight: 700 }} tick={{ fill: '#64748b' }} />
                    <YAxis style={{ fontSize: '0.72rem', fontWeight: 700 }} tick={{ fill: '#64748b' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.78rem', fontWeight: 800 }} />
                    <Bar dataKey="Doğru"  fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Yanlış" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Boş"    fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 5: TÜM SONUÇLAR
        ══════════════════════════════════════ */}
        {activeTab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Filter bar */}
            <div style={{ background: 'white', borderRadius: 18, padding: '0.85rem 1.1rem', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 140 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Sınav / ders ara..." style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 700, outline: 'none', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' }} />
              </div>
              <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} style={{ padding: '0.45rem 0.85rem', borderRadius: 12, border: '1.5px solid #e2e8f0', fontWeight: 800, fontSize: '0.78rem', background: '#f8fafc', color: '#1e293b', outline: 'none' }}>
                <option value="all">Tüm Dersler</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '0.45rem 0.85rem', borderRadius: 12, border: '1.5px solid #e2e8f0', fontWeight: 800, fontSize: '0.78rem', background: '#f8fafc', color: '#1e293b', outline: 'none' }}>
                <option value="all">Tüm Türler</option>
                <option value="homework">📝 Ödevler</option>
                <option value="physicalExam">🏛️ Denemeler</option>
                <option value="book">📕 Kitap Testleri</option>
                <option value="individual">⚡ Bireysel</option>
              </select>
              <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
                {['table', 'cards'].map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{ padding: '0.35rem 0.75rem', borderRadius: 9, border: 'none', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', background: viewMode === m ? '#6366f1' : 'transparent', color: viewMode === m ? 'white' : '#64748b' }}>
                    {m === 'table' ? '📋 Tablo' : '🃏 Kartlar'}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{filteredSubs.length} sonuç</span>
            </div>

            {/* TABLE VIEW */}
            {viewMode === 'table' && (
              <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700, fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        {['SINAV / BAŞLIK', 'DERS', 'TARİH', 'TÜR', 'D / Y / B', 'BAŞARI', 'EYLEM'].map(h => (
                          <th key={h} style={{ padding: '0.85rem 1rem', fontWeight: 900, fontSize: '0.72rem', color: '#475569', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubs.map((s, i) => {
                        const th = theme(s.subjectKey);
                        const SubIcon = th.icon;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 1 ? '#fafafa' : 'white', transition: 'background 0.1s' }}>
                            <td style={{ padding: '0.8rem 1rem' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.testTitle}</div>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: th.bg, color: th.color, border: `1px solid ${th.border}`, borderRadius: 8, padding: '0.22rem 0.6rem', fontSize: '0.72rem', fontWeight: 900 }}>
                                <SubIcon size={12} /> {s.subjectKey}
                              </span>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : '—'}</td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              <span style={{ background: typeConfig[s.typeKey]?.bg || '#f8fafc', color: typeConfig[s.typeKey]?.color || '#475569', border: `1px solid ${typeConfig[s.typeKey]?.border || '#e2e8f0'}`, borderRadius: 8, padding: '0.22rem 0.6rem', fontSize: '0.72rem', fontWeight: 900 }}>
                                {typeConfig[s.typeKey]?.label || '⚡ Bireysel'}
                              </span>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', borderRadius: 6, padding: '0.18rem 0.45rem', fontSize: '0.72rem', fontWeight: 900 }}>✓{s.correctCount}</span>
                                <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.18rem 0.45rem', fontSize: '0.72rem', fontWeight: 900 }}>✗{s.wrongCount}</span>
                                <span style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.18rem 0.45rem', fontSize: '0.72rem', fontWeight: 900 }}>○{s.blankCount}</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              <ScoreBadge score={s.computedScore} type={s.type} size="sm" />
                            </td>
                            <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                              {s.type !== 'physicalExam' ? (
                                <button onClick={() => navigate(`/review/${s.id}`)} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 9, padding: '0.35rem 0.8rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Eye size={12} /> İncele
                                </button>
                              ) : (
                                <button onClick={() => navigate(`/physical-exam/${s.hwId || s.testId}?studentId=${selectedStudent?.id}`)} style={{ background: '#4338ca', color: 'white', border: 'none', borderRadius: 9, padding: '0.35rem 0.8rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Eye size={12} /> Karne
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSubs.length === 0 && (
                        <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                          <ListTree size={36} style={{ display: 'block', margin: '0 auto 8px', color: '#e2e8f0' }} />
                          Sonuç bulunamadı. Filtreleri değiştirin.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CARDS VIEW */}
            {viewMode === 'cards' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
                {filteredSubs.map((s, i) => {
                  const th = theme(s.subjectKey);
                  const SubIcon = th.icon;
                  return (
                    <div key={i} style={{ background: 'white', borderRadius: 18, border: `1.5px solid ${th.border}`, padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ height: 4, background: th.color, position: 'absolute', top: 0, left: 0, right: 0 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: th.bg, color: th.color, border: `1px solid ${th.border}`, borderRadius: 8, padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 900 }}>
                          <SubIcon size={13} /> {s.subjectKey}
                        </span>
                        <span style={{ background: typeConfig[s.typeKey]?.bg || '#f8fafc', color: typeConfig[s.typeKey]?.color || '#475569', border: `1px solid ${typeConfig[s.typeKey]?.border || '#e2e8f0'}`, borderRadius: 8, padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 900 }}>
                          {typeConfig[s.typeKey]?.label || '⚡'}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', lineHeight: 1.3 }}>{s.testTitle}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', borderRadius: 7, padding: '0.18rem 0.5rem', fontSize: '0.72rem', fontWeight: 900 }}>✓ {s.correctCount}</span>
                        <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 7, padding: '0.18rem 0.5rem', fontSize: '0.72rem', fontWeight: 900 }}>✗ {s.wrongCount}</span>
                        <span style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 7, padding: '0.18rem 0.5rem', fontSize: '0.72rem', fontWeight: 900 }}>○ {s.blankCount}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                        <div>
                          <ScoreBadge score={s.computedScore} type={s.type} />
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, marginTop: 3 }}>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}</div>
                        </div>
                        {s.type !== 'physicalExam' ? (
                          <button onClick={() => navigate(`/review/${s.id}`)} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 10, padding: '0.4rem 0.85rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Eye size={12} /> İncele
                          </button>
                        ) : (
                          <button onClick={() => navigate(`/physical-exam/${s.hwId || s.testId}?studentId=${selectedStudent?.id}`)} style={{ background: '#4338ca', color: 'white', border: 'none', borderRadius: 10, padding: '0.4rem 0.85rem', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Eye size={12} /> Karne
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredSubs.length === 0 && (
                  <div style={{ gridColumn: '1/-1', background: 'white', borderRadius: 18, padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 700, border: '1px solid #e2e8f0' }}>
                    Sonuç bulunamadı
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom padding */}
        <div style={{ height: '2rem' }} />
      </div>
    </div>
  );
}
