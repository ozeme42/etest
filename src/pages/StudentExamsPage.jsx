import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCoaching } from '../context/CoachingContext';
import { useCurriculum } from '../context/CurriculumContext';
import { isHomeworkForStudent } from '../utils/testResolver';
import {
  BookOpen, ArrowRight, Star, Plus, X, ClipboardList, TrendingUp,
  Pencil, Trash2, LayoutGrid, List, Trophy, Target, Activity,
  Zap, Clock, ChevronRight, FileBarChart2, FlameKindling, Award,
  CheckCircle2, AlertCircle, Calendar, Search
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell
} from 'recharts';
import { toUUID } from '../services/supabaseService';

/* ── Constants ─── */
const DEBUG_PROGRESS = false;

const DEFAULT_SUBJECTS = {
  'Türkçe': { d: '', y: '', b: '', net: '' },
  'Matematik': { d: '', y: '', b: '', net: '' },
  'Fen Bilimleri': { d: '', y: '', b: '', net: '' },
  'İngilizce': { d: '', y: '', b: '', net: '' },
  'Sosyal Bilgiler/İnkılap Tarihi': { d: '', y: '', b: '', net: '' },
  'Din Kültürü ve Ahlak Bilgisi': { d: '', y: '', b: '', net: '' },
};

const EXAM_PALETTES = [
  { from: '#8b5cf6', to: '#a78bfa', shadow: 'rgba(139,92,246,0.3)' },
  { from: '#6366f1', to: '#818cf8', shadow: 'rgba(99,102,241,0.3)' },
  { from: '#ec4899', to: '#f472b6', shadow: 'rgba(236,72,153,0.3)' },
  { from: '#0ea5e9', to: '#38bdf8', shadow: 'rgba(14,165,233,0.3)' },
  { from: '#10b981', to: '#34d399', shadow: 'rgba(16,185,129,0.3)' },
  { from: '#f59e0b', to: '#fbbf24', shadow: 'rgba(245,158,11,0.3)' },
];
const pal = (i) => EXAM_PALETTES[i % EXAM_PALETTES.length];

/* ── Mini circular progress ─── */
function Ring({ pct, size = 52, stroke = 5, color }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
    </svg>
  );
}

/* ── Stat card ─── */
function KPI({ icon, label, value, iconBg = '#eff6ff', iconColor = '#6366f1', sub }) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 18,
      padding: '1.1rem 1.25rem',
      border: '1.5px solid #e2e8f0',
      boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {React.cloneElement(icon, { size: 22, color: iconColor })}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Chart tooltip ─── */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload || {};
  return (
    <div style={{ background: '#0f172a', color: 'white', padding: '0.8rem 1.1rem', borderRadius: 12, boxShadow: '0 10px 25px -3px rgba(0,0,0,0.3)', border: '1px solid #334155', minWidth: 160 }}>
      <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#a5b4fc', marginBottom: 4 }}>{d.fullName || label}</div>
      {d.date && <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 6 }}>{d.date}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 3 }}>
          <span style={{ color: p.color || '#94a3b8', fontWeight: 700 }}>{p.name}</span>
          <span style={{ fontWeight: 900, color: '#ffffff' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function StudentExamsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { homeworks = [], addHomework } = useHomework();
  const { books = [], bookTests = [], isLoading: booksLoading, addTrackedBook, addTrackedBookTest } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();
  const { mockExams = [], addMockExam, updateMockExam, deleteMockExam } = useCoaching();

  const studentId = currentUser?.id;
  const grade = currentUser?.grade;
  const gradeId = currentUser?.gradeId;
  const className = currentUser?.className;

  const [isSaving, setIsSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', publisher: '', subjects: [{ id: 'sub_1', name: '', testCount: 20, questionsPerTest: 20 }] });

  const [chartMetric, setChartMetric] = useState('Toplam Net');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'book' | 'mock'
  const [searchQuery, setSearchQuery] = useState('');

  const [showMockModal, setShowMockModal] = useState(false);
  const [editingMockId, setEditingMockId] = useState(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [netRule, setNetRule] = useState('4');
  const [newManualMock, setNewManualMock] = useState({ title: '', date: new Date().toISOString().split('T')[0], subjects: DEFAULT_SUBJECTS });

  /* ── Modal helpers ─── */
  const handleOpenMockModal = (mock = null) => {
    if (mock) {
      setEditingMockId(mock.id);
      setNewManualMock({ title: mock.title || '', date: mock.date || mock.createdAt?.slice(0, 10) || new Date().toISOString().split('T')[0], subjects: mock.scores || {} });
    } else {
      setEditingMockId(null);
      setNewManualMock({ title: '', date: new Date().toISOString().split('T')[0], subjects: DEFAULT_SUBJECTS });
    }
    setShowMockModal(true);
  };

  const handleDeleteMock = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Bu denemeyi silmek istediğinize emin misiniz?')) {
      try { await deleteMockExam(id); window.location.reload(); } catch (err) { console.error(err); }
    }
  };

  const addSubjectToMock = () => {
    if (!newSubjectName.trim()) return;
    setNewManualMock(prev => ({ ...prev, subjects: { ...prev.subjects, [newSubjectName.trim()]: { d: '', y: '', b: '', net: '' } } }));
    setNewSubjectName('');
  };

  const handleNetRuleChange = (e) => {
    const newRule = e.target.value;
    setNetRule(newRule);
    setNewManualMock(prev => {
      const updated = { ...prev.subjects };
      Object.keys(updated).forEach(sn => {
        const d = Number(updated[sn].d) || 0;
        const y = Number(updated[sn].y) || 0;
        updated[sn].net = newRule === '0' ? d : parseFloat((d - (y / Number(newRule))).toFixed(2));
      });
      return { ...prev, subjects: updated };
    });
  };

  const updateSubjectScore = (sName, field, value) => {
    setNewManualMock(prev => {
      const cur = prev.subjects[sName] || { d: '', y: '', b: '', net: '' };
      const upd = { ...cur, [field]: value };
      if (field === 'd' || field === 'y') {
        const d = Number(upd.d) || 0, y = Number(upd.y) || 0;
        upd.net = netRule === '0' ? d : parseFloat((d - (y / Number(netRule))).toFixed(2));
      }
      return { ...prev, subjects: { ...prev.subjects, [sName]: upd } };
    });
  };

  const removeSubjectFromMock = (sName) => {
    setNewManualMock(prev => { const copy = { ...prev }; delete copy.subjects[sName]; return copy; });
  };

  const totalMockD = Object.values(newManualMock.subjects).reduce((s, v) => s + (Number(v.d) || 0), 0);
  const totalMockY = Object.values(newManualMock.subjects).reduce((s, v) => s + (Number(v.y) || 0), 0);
  const totalMockB = Object.values(newManualMock.subjects).reduce((s, v) => s + (Number(v.b) || 0), 0);
  const totalMockNet = Object.values(newManualMock.subjects).reduce((s, v) => s + (Number(v.net) || 0), 0);

  const handleSaveMock = async (e) => {
    e.preventDefault();
    if (!newManualMock.title) return;
    try {
      if (editingMockId) await updateMockExam(editingMockId, { title: newManualMock.title, date: newManualMock.date, totalNet: totalMockNet, scores: newManualMock.subjects });
      else await addMockExam({ studentId, title: newManualMock.title, date: newManualMock.date, totalNet: totalMockNet, scores: newManualMock.subjects });
      setShowMockModal(false);
      setEditingMockId(null);
      setNewManualMock({ title: '', date: new Date().toISOString().split('T')[0], subjects: DEFAULT_SUBJECTS });
      window.location.reload();
    } catch (err) { console.error(err); }
  };

  const handleSaveNewBook = async () => {
    if (!newBook.title || !newBook.publisher) return;
    setIsSaving(true);
    try {
      const bookSubjects = newBook.subjects.filter(s => s.name.trim() !== '' && s.testCount > 0).map(s => ({ id: s.id, name: s.name }));
      if (bookSubjects.length === 0) bookSubjects.push({ id: 'genel', name: 'Genel' });
      const createdBook = await addTrackedBook({ title: newBook.title, publisher: newBook.publisher, subjects: bookSubjects, bookType: 'exam' });
      const testPromises = [], testIds = [];
      newBook.subjects.forEach(subject => {
        if (!subject.name.trim() || subject.testCount <= 0) return;
        for (let i = 1; i <= subject.testCount; i++) {
          testPromises.push(addTrackedBookTest(createdBook.id, { subjectId: subject.id, name: `Test ${i}`, questionCount: subject.questionsPerTest, isOpenEnded: false }).then(t => testIds.push(t.id)));
        }
      });
      await Promise.all(testPromises);
      await addHomework({ title: `${newBook.title} (Kendi Eklediğim)`, isBookAssignment: true, bookId: createdBook.id, targetType: 'student', targetIds: [studentId], tests: testIds });
      setIsAddModalOpen(false);
      setNewBook({ title: '', publisher: '', subjects: [{ id: 'sub_1', name: '', testCount: 20, questionsPerTest: 20 }] });
    } catch (e) { console.error('Failed to add book', e); }
    finally { setIsSaving(false); }
  };

  const { data: curData } = useCurriculum();

  /* ── Data derivations (same logic as before, untouched) ─── */
  const bookAssignments = useMemo(() => homeworks.filter(hw => {
    if (!hw.isBookAssignment) return false;
    return isHomeworkForStudent(hw, currentUser, curData?.grades);
  }), [homeworks, currentUser, curData?.grades]);

  const studentSubmissions = useMemo(() => submissions.filter(s => {
    if (String(s.studentId) !== String(studentId) || s.status === 'in_progress' || s.status === 'draft') return false;
    const isHwSub = Boolean(s.hwId || s.homeworkId || s.isHomework || String(s.testId || '').startsWith('hw_') || String(s.id || '').startsWith('hw_'));
    if (isHwSub) {
      const hwId = s.hwId || s.homeworkId || s.testId || s.id;
      const exists = (homeworks || []).some(h => String(h.id) === String(hwId) || String(h.id) === String(s.hwId) || String(h.id) === String(s.testId));
      if (!exists) return false;
    }
    return true;
  }), [submissions, homeworks, studentId]);

  const assignedBooks = useMemo(() => {
    const bookMap = {};
    bookAssignments.forEach(hw => {
      const book = books.find(b => String(b.id) === String(hw.bookId) && b.bookType === 'exam');
      if (!book) return;
      if (!bookMap[book.id]) bookMap[book.id] = { ...book, assignedHomeworks: [], allAssignedTestIds: new Set(), allSolvedTestIds: new Set() };
      bookMap[book.id].assignedHomeworks.push(hw);
      let hwTestIdsRaw = [];
      const hasTestDueDates = hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0;

      if (hasTestDueDates) {
        // Kitap takibinden tarih girilmiş denemeler: Sadece tarihi girilen testler görünsün
        hwTestIdsRaw = Object.entries(hw.testDueDates)
          .filter(([_, dStr]) => dStr && String(dStr).trim() !== '')
          .map(([tId, _]) => tId);
      } else if (Array.isArray(hw.tests) && hw.tests.length > 0) {
        hwTestIdsRaw = hw.tests;
      } else if (hw.title?.includes('(Tüm Kitap Görevi)')) {
        hwTestIdsRaw = bookTests.filter(bt => String(bt.bookId) === String(book.id)).map(bt => bt.id);
      }
      hwTestIdsRaw.forEach(id => bookMap[book.id].allAssignedTestIds.add(String(id)));
      const hwIdSet = new Set([String(hw.id)]);
      const hwUUID = toUUID(hw.id);
      if (hwUUID) hwIdSet.add(String(hwUUID));
      studentSubmissions.forEach(s => {
        const candidateFields = [
          s.testId,
          s.realTestId,
          s.bookTestId,
          s.metadata?.realTestId,
          s.metadata?.bookTestId,
          s.metadata?.realId
        ];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) candidateFields.push(...s.bookTestIds);

        candidateFields.forEach(field => {
          if (field == null) return;
          const raw = String(field);
          const uuid = toUUID(field);
          hwTestIdsRaw.forEach(id => {
            const strId = String(id);
            const uuidId = toUUID(id);
            if (strId === raw || (uuid && String(uuidId) === String(uuid))) {
              bookMap[book.id].allSolvedTestIds.add(strId);
            }
          });
        });
      });
      if (hw.dueDate) {
        const d = new Date(hw.dueDate);
        if (!bookMap[book.id].targetDueDate || d > bookMap[book.id].targetDueDate) bookMap[book.id].targetDueDate = d;
      }
    });
    Object.values(bookMap).forEach(b => {
      b.totalAssignedTests = b.allAssignedTestIds.size;
      b.totalSolvedTests = Math.min(b.allSolvedTestIds.size, b.allAssignedTestIds.size);
      if (b.targetDueDate) {
        const diff = b.targetDueDate.getTime() - Date.now();
        b.remainingDays = Math.max(0, Math.ceil(diff / 86400000));
      }
      const bestSubsByKey = {};
      studentSubmissions.forEach(s => {
        const candidates = [s.testId, s.bookTestId, s.homeworkId, s.hwId];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) candidates.push(...s.bookTestIds);
        let belongs = false;
        candidates.forEach(field => {
          if (!field) return;
          if (b.allAssignedTestIds.has(String(field))) belongs = true;
          b.assignedHomeworks.forEach(hw => { if (String(hw.id) === String(field) || String(toUUID(hw.id)) === String(field)) belongs = true; });
        });
        if (belongs) {
          const key = String(s.testId || s.bookTestId || s.id);
          const ex = bestSubsByKey[key];
          if (!ex || s.score > ex.score || (s.score === ex.score && new Date(s.submittedAt || 0) > new Date(ex.submittedAt || 0))) bestSubsByKey[key] = s;
        }
      });
      let totalCorrect = 0, totalWrong = 0, totalBlank = 0;
      Object.values(bestSubsByKey).forEach(sub => { totalCorrect += sub.correctCount || 0; totalWrong += sub.wrongCount || 0; totalBlank += sub.blankCount || 0; });
      b.totalCorrect = totalCorrect; b.totalWrong = totalWrong; b.totalBlank = totalBlank;
      const pct = b.totalAssignedTests > 0 ? Math.round((b.totalSolvedTests / b.totalAssignedTests) * 100) : 0;
      b.progressPct = pct;
      b.penaltyRatio = /lgs|bursluluk/i.test(b.title) ? 3 : 4;
      b.net = parseFloat((totalCorrect - totalWrong / b.penaltyRatio).toFixed(2));
    });
    return Object.values(bookMap);
  }, [bookAssignments, books, studentSubmissions, bookTests]);

  const studentMockExams = useMemo(() => mockExams.filter(m => String(m.studentId) === String(studentId)), [mockExams, studentId]);

  const allExamsList = useMemo(() => {
    const list = [];
    studentMockExams.forEach(mock => {
      if (mock.approvalStatus === 'rejected') return;
      const mScores = mock.scores || {};
      const d = Object.values(mScores).reduce((s, v) => s + (Number(v.d) || 0), 0);
      const y = Object.values(mScores).reduce((s, v) => s + (Number(v.y) || 0), 0);
      const b = Object.values(mScores).reduce((s, v) => s + (Number(v.b) || 0), 0);
      list.push({ id: mock.id, type: 'mock', title: mock.title, date: mock.date || mock.createdAt?.slice(0, 10), d, y, b, net: Number(mock.totalNet || 0), isCompleted: true, scores: mock.scores, original: mock });
    });
    assignedBooks.forEach(book => {
      const bestSubs = studentSubmissions.filter(sub => {
        const testId = sub.testId || sub.bookTestId || sub.id;
        return book.allAssignedTestIds.has(String(testId));
      });
      list.push({ id: book.id, type: 'book', title: book.title, date: book.assignedHomeworks?.[0]?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10), d: book.totalCorrect, y: book.totalWrong, b: book.totalBlank, net: book.net, isCompleted: book.progressPct >= 100, progressPct: book.progressPct, remainingDays: book.remainingDays, subjects: book.subjects, bestSubs, original: book });
    });
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [studentMockExams, assignedBooks, studentSubmissions]);

  const overallStats = useMemo(() => {
    let totalD = 0, totalY = 0, totalB = 0, totalNet = 0, maxNet = 0;
    const subMap = {};
    allExamsList.forEach(exam => {
      totalD += exam.d || 0; totalY += exam.y || 0; totalB += exam.b || 0;
      const n = parseFloat(exam.net || 0);
      totalNet += n; if (n > maxNet) maxNet = n;
      if (exam.type === 'mock' && exam.scores) {
        Object.entries(exam.scores).forEach(([sName, sc]) => {
          if (!subMap[sName]) subMap[sName] = { name: sName, net: 0, count: 0 };
          subMap[sName].net += parseFloat(sc.net || 0); subMap[sName].count++;
        });
      }
    });
    const total = allExamsList.length;
    return { total, avgNet: total > 0 ? (totalNet / total).toFixed(1) : 0, maxNet: maxNet.toFixed(1), totalD, totalY, totalB, lastDate: total > 0 ? allExamsList[0].date : '—', subjects: Object.values(subMap).sort((a, b) => b.net - a.net), bookCount: assignedBooks.length, mockCount: studentMockExams.length };
  }, [allExamsList, assignedBooks.length, studentMockExams.length]);

  /* ── Filter ─── */
  const displayedExams = useMemo(() => {
    return allExamsList.filter(exam => {
      const sectionOk = activeSection === 'all' || exam.type === activeSection;
      const searchOk = (exam.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      return sectionOk && searchOk;
    });
  }, [allExamsList, activeSection, searchQuery]);

  /* ── Chart data ─── */
  const trendData = useMemo(() => {
    return [...allExamsList].reverse().map(exam => {
      let net = exam.net;
      if (chartMetric !== 'Toplam Net' && exam.type === 'mock' && exam.scores?.[chartMetric]) {
        const sc = exam.scores[chartMetric];
        net = sc.net !== undefined ? parseFloat(sc.net) : 0;
      }
      return { name: exam.title?.length > 14 ? exam.title.slice(0, 12) + '…' : exam.title, fullName: exam.title, date: exam.date, Net: parseFloat(net?.toFixed(2) || 0) };
    });
  }, [allExamsList, chartMetric]);

  const isEmpty = assignedBooks.length === 0 && studentMockExams.length === 0;

  /* ════════════════════════
     RENDER
  ════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(244, 63, 94, 0.05) 0%, transparent 45%), #f8fafc', padding: '1.5rem 1.5rem', fontFamily: "'Inter', system-ui, sans-serif", color: '#0f172a', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '100%', margin: 0 }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 99, padding: '0.35rem 0.95rem', marginBottom: 10 }}>
              <FileBarChart2 size={15} color="#7c3aed" />
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#6d28d9', letterSpacing: '0.05em' }}>DENEME MERKEZİ</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.95rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>Denemelerim</h1>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Fiziki deneme sınavları, manuel sonuçlar ve net gelişim analizin 📊</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleOpenMockModal()}
              style={{ padding: '0.65rem 1.15rem', background: '#ffffff', color: '#334155', border: '1.5px solid #cbd5e1', borderRadius: 12, fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}
            >
              <ClipboardList size={16} color="#6366f1" /> Manuel Sonuç Ekle
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{ padding: '0.65rem 1.15rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <Plus size={16} /> Kendi Denemeni Ekle
            </button>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        {!isEmpty && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 22 }}>
            <KPI icon={<FileBarChart2 />} label="Toplam Deneme" value={overallStats.total} iconBg="#eff6ff" iconColor="#3b82f6" sub={`${overallStats.bookCount} fiziki · ${overallStats.mockCount} manuel`} />
            <KPI icon={<Target />} label="Ortalama Net" value={overallStats.avgNet} iconBg="#f0fdf4" iconColor="#10b981" />
            <KPI icon={<Trophy />} label="En Yüksek Net" value={overallStats.maxNet} iconBg="#fffbeb" iconColor="#d97706" />
            <KPI icon={<Calendar />} label="Son Deneme" value={overallStats.lastDate} iconBg="#f5f3ff" iconColor="#8b5cf6" />
            <KPI icon={<CheckCircle2 />} label="Toplam Doğru" value={overallStats.totalD} iconBg="#ecfdf5" iconColor="#059669" />
            <KPI icon={<AlertCircle />} label="Toplam Yanlış" value={overallStats.totalY} iconBg="#fff1f2" iconColor="#e11d48" />
          </div>
        )}

        {/* ── TREND CHART ── */}
        {allExamsList.length > 1 && (
          <div style={{ background: '#ffffff', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: '1.4rem 1.6rem', marginBottom: 22, boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>
                <TrendingUp size={18} color="#7c3aed" /> Net Gelişim Grafiği
              </div>
              <select value={chartMetric} onChange={e => setChartMetric(e.target.value)}
                style={{ padding: '0.45rem 0.9rem', borderRadius: 10, border: '1.5px solid #cbd5e1', fontWeight: 800, fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', outline: 'none', cursor: 'pointer' }}>
                <option value="Toplam Net">Genel (Toplam Net)</option>
                {overallStats.subjects.map(s => <option key={s.name} value={s.name}>{s.name} Net</option>)}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData} margin={{ top: 8, right: 16, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} domain={['dataMin - 2', 'dataMax + 5']} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="Net" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#netGrad)" dot={{ fill: '#7c3aed', r: 4 }} activeDot={{ r: 7, fill: '#6d28d9', stroke: '#ffffff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── FILTERS + VIEW TOGGLE ── */}
        {!isEmpty && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18, alignItems: 'center' }}>
            {/* Section tabs */}
            <div style={{ display: 'flex', gap: 4, background: '#ffffff', padding: 4, borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
              {[
                { key: 'all',  label: `📋 Tümü (${allExamsList.length})` },
                { key: 'book', label: `📚 Fiziki (${assignedBooks.length})` },
                { key: 'mock', label: `✏️ Manuel (${studentMockExams.length})` },
              ].map(s => (
                <button key={s.key} onClick={() => setActiveSection(s.key)} style={{ padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', background: activeSection === s.key ? '#eff6ff' : 'transparent', color: activeSection === s.key ? '#1d4ed8' : '#64748b', whiteSpace: 'nowrap', transition: 'all 0.15s ease' }}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 180px' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Deneme ara…"
                style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontWeight: 700, background: '#ffffff', outline: 'none', color: '#0f172a', boxSizing: 'border-box' }} />
            </div>

            {/* View toggle */}
            <div style={{ display: 'flex', gap: 4, background: '#ffffff', padding: 4, borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
              {[{ k: 'cards', ic: <LayoutGrid size={15} /> }, { k: 'table', ic: <List size={15} /> }].map(m => (
                <button key={m.k} onClick={() => setViewMode(m.k)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: viewMode === m.k ? '#eff6ff' : 'transparent', color: viewMode === m.k ? '#1d4ed8' : '#64748b' }}>
                  {m.ic}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>{displayedExams.length} sonuç</span>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {isEmpty && (
          booksLoading ? (
            <div style={{ background: '#ffffff', borderRadius: 20, padding: '4rem 2rem', textAlign: 'center', border: '1.5px solid #e2e8f0' }}>
              <div style={{ width: 44, height: 44, border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontWeight: 800, color: '#64748b' }}>Denemeler yükleniyor…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: 20, padding: '5rem 2rem', textAlign: 'center', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 90, height: 90, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <FileBarChart2 size={40} color="#3b82f6" />
              </div>
              <h2 style={{ margin: '0 0 8px', color: '#0f172a', fontWeight: 900 }}>Henüz Deneme Yok</h2>
              <p style={{ color: '#64748b', margin: '0 0 24px', fontSize: '0.9rem' }}>Fiziki deneme sınavları atandığında veya manuel sonuç eklediğinde burada görünecek.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => handleOpenMockModal()} style={{ padding: '0.7rem 1.4rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                  <ClipboardList size={16} /> Manuel Sonuç Ekle
                </button>
              </div>
            </div>
          )
        )}

        {/* ── CARDS VIEW ── */}
        {!isEmpty && viewMode === 'cards' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {displayedExams.map((exam, idx) => {
              const p = pal(idx);
              const isMock = exam.type === 'mock';

              return (
                <div key={`${exam.type}-${exam.id}`}
                  style={{
                    background: '#ffffff',
                    borderRadius: 20,
                    border: `1.5px solid ${exam.isCompleted && !isMock ? '#86efac' : '#e2e8f0'}`,
                    padding: '1.3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    cursor: exam.type === 'book' ? 'pointer' : 'default'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px -2px rgba(0,0,0,0.03)'; }}
                  onClick={() => exam.type === 'book' && navigate(`/student/books/${exam.id}`)}
                >
                  {/* Accent line */}
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${p.from}, ${p.to})`, position: 'absolute', top: 0, left: 0, right: 0 }} />

                  {/* Badge */}
                  {exam.isCompleted && !isMock && (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.22rem 0.6rem', borderRadius: 99, fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Star size={10} fill="#16a34a" color="#16a34a" /> TAMAMLANDI
                    </div>
                  )}
                  {!isMock && !exam.isCompleted && exam.remainingDays !== undefined && (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: exam.remainingDays <= 3 ? '#fff1f2' : '#fffbeb', border: `1px solid ${exam.remainingDays <= 3 ? '#fecdd3' : '#fde68a'}`, color: exam.remainingDays <= 3 ? '#be123c' : '#b45309', padding: '0.22rem 0.6rem', borderRadius: 99, fontSize: '0.65rem', fontWeight: 900 }}>
                      ⏱ {exam.remainingDays}g kaldı
                    </div>
                  )}

                  {/* Header */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 6 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(145deg, ${p.from}, ${p.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${p.shadow}`, flexShrink: 0 }}>
                      {isMock ? <ClipboardList size={24} color="#ffffff" /> : <BookOpen size={24} color="#ffffff" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a', lineHeight: 1.3, paddingRight: exam.remainingDays !== undefined || exam.isCompleted ? 70 : 0 }}>{exam.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ background: isMock ? '#f5f3ff' : '#eff6ff', color: isMock ? '#6d28d9' : '#1d4ed8', border: `1px solid ${isMock ? '#ddd6fe' : '#bfdbfe'}`, borderRadius: 6, padding: '0.18rem 0.55rem', fontSize: '0.68rem', fontWeight: 900 }}>
                          {isMock ? '✏️ Manuel' : '📚 Fiziki'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>{exam.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar (books only) */}
                  {!isMock && (
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>Test İlerlemesi</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: p.to }}>%{exam.progressPct}</span>
                          <Ring pct={exam.progressPct || 0} size={36} stroke={4} color={exam.isCompleted ? '#10b981' : p.from} />
                        </div>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${exam.progressPct || 0}%`, height: '100%', background: exam.isCompleted ? '#10b981' : `linear-gradient(90deg, ${p.from}, ${p.to})`, borderRadius: 99, transition: 'width 0.7s ease' }} />
                      </div>
                    </div>
                  )}

                  {/* D/Y/B + Net */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {[
                      { l: 'Doğru', v: exam.d, c: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                      { l: 'Yanlış', v: exam.y, c: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                      { l: 'Boş',    v: exam.b, c: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
                      { l: 'Net',    v: exam.net, c: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '0.4rem 0.3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: s.c, fontWeight: 900, textTransform: 'uppercase' }}>{s.l}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 900, color: s.c }}>{s.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                    {exam.type === 'book' ? (
                      <button onClick={e => { e.stopPropagation(); navigate(`/student/books/${exam.id}`); }}
                        style={{ width: '100%', padding: '0.6rem', background: exam.isCompleted ? '#f1f5f9' : `linear-gradient(135deg, ${p.from}, ${p.to})`, color: exam.isCompleted ? '#334155' : 'white', border: exam.isCompleted ? '1.5px solid #cbd5e1' : 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: exam.isCompleted ? 'none' : `0 4px 12px ${p.shadow}` }}>
                        {exam.isCompleted ? '📋 Haritayı Görüntüle' : '▶ Devam Et'} <ArrowRight size={14} />
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                        <button onClick={e => { e.stopPropagation(); handleOpenMockModal(exam.original); }}
                          style={{ flex: 1, padding: '0.55rem', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <Pencil size={13} /> Düzenle
                        </button>
                        <button onClick={e => handleDeleteMock(e, exam.id)}
                          style={{ flex: 1, padding: '0.55rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <Trash2 size={13} /> Sil
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {displayedExams.length === 0 && (
              <div style={{ gridColumn: '1/-1', background: '#ffffff', borderRadius: 16, padding: '3rem', textAlign: 'center', color: '#64748b', fontWeight: 700, border: '1.5px solid #e2e8f0' }}>
                Filtreye uygun deneme bulunamadı
              </div>
            )}
          </div>
        )}

        {/* ── TABLE VIEW ── */}
        {!isEmpty && viewMode === 'table' && (
          <div style={{ background: '#ffffff', borderRadius: 18, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760, fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                    {['DENEME ADI', 'TARİH', 'TÜR', 'DOĞRU', 'YANLIŞ', 'BOŞ', 'NET', 'İŞLEM'].map(h => (
                      <th key={h} style={{ padding: '0.9rem 1rem', fontWeight: 900, fontSize: '0.7rem', color: '#64748b', textAlign: h === 'İŞLEM' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedExams.map((exam, idx) => (
                    <tr key={`${exam.type}-${exam.id}`}
                      style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#f8fafc' : '#ffffff', transition: 'background 0.15s', cursor: exam.type === 'book' ? 'pointer' : 'default' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? '#f8fafc' : '#ffffff'}
                      onClick={() => exam.type === 'book' && navigate(`/student/books/${exam.id}`)}
                    >
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#0f172a' }}>
                          {exam.type === 'mock' ? <ClipboardList size={16} color="#7c3aed" /> : <BookOpen size={16} color={exam.isCompleted ? '#10b981' : '#3b82f6'} />}
                          <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', color: '#64748b', fontWeight: 700 }}>{exam.date}</td>
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <span style={{ background: exam.type === 'mock' ? '#f5f3ff' : exam.isCompleted ? '#f0fdf4' : '#eff6ff', color: exam.type === 'mock' ? '#6d28d9' : exam.isCompleted ? '#166534' : '#1d4ed8', border: `1px solid ${exam.type === 'mock' ? '#ddd6fe' : exam.isCompleted ? '#bbf7d0' : '#bfdbfe'}`, borderRadius: 6, padding: '0.22rem 0.65rem', fontSize: '0.72rem', fontWeight: 900 }}>
                          {exam.type === 'mock' ? '✏️ Manuel' : exam.isCompleted ? '✅ Tamamlandı' : `📊 %${exam.progressPct}`}
                        </span>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: '#16a34a' }}>{exam.d}</td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: '#dc2626' }}>{exam.y}</td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: '#64748b' }}>{exam.b}</td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: '#7c3aed', fontSize: '1rem' }}>{exam.net}</td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                        {exam.type === 'book' ? (
                          <button onClick={e => { e.stopPropagation(); navigate(`/student/books/${exam.id}`); }}
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', padding: '0.38rem 0.9rem', borderRadius: 8, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                            {exam.isCompleted ? 'İncele' : 'Devam Et'}
                          </button>
                        ) : (
                          <div style={{ display: 'inline-flex', gap: 5 }}>
                            <button onClick={e => { e.stopPropagation(); handleOpenMockModal(exam.original); }}
                              style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '0.38rem 0.55rem', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Pencil size={13} />
                            </button>
                            <button onClick={e => handleDeleteMock(e, exam.id)}
                              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.38rem 0.55rem', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayedExams.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>Sonuç bulunamadı</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ height: '2.5rem' }} />
      </div>

      {/* ══════════════════════
          MANUEL MODAL
      ══════════════════════ */}
      {showMockModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: 20, border: '1.5px solid #e2e8f0', width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 3px', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{editingMockId ? 'Deneme Sonucunu Düzenle' : 'Manuel Deneme Sonucu Ekle'}</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Fiziki sınav veya dershanede giren denemenin sonuçlarını gir</p>
              </div>
              <button onClick={() => setShowMockModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveMock} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Net rule */}
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>Net Hesaplama Kuralı</label>
                <select value={netRule} onChange={handleNetRuleChange}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, outline: 'none', background: '#ffffff', color: '#0f172a', cursor: 'pointer' }}>
                  <option value="4">4 Yanlış → 1 Doğruyu Götürür (YKS/TYT)</option>
                  <option value="3">3 Yanlış → 1 Doğruyu Götürür (LGS)</option>
                  <option value="0">Yanlışlar Götürmez</option>
                </select>
              </div>

              {/* Title + Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>Deneme Adı</label>
                  <input required type="text" placeholder="Örn: Özdebir TYT 1" value={newManualMock.title}
                    onChange={e => setNewManualMock(p => ({ ...p, title: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box', background: '#ffffff', color: '#0f172a' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>Tarih</label>
                  <input required type="date" value={newManualMock.date}
                    onChange={e => setNewManualMock(p => ({ ...p, date: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box', background: '#ffffff', color: '#0f172a' }} />
                </div>
              </div>

              {/* Add subject */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>Ders Ekle</label>
                <div style={{ display: 'flex', gap: 7 }}>
                  <input type="text" placeholder="Ders adı (Türkçe, Matematik…)" value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubjectToMock(); } }}
                    style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, outline: 'none', background: '#ffffff', color: '#0f172a' }} />
                  <button type="button" onClick={addSubjectToMock}
                    style={{ padding: '0.65rem 1rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8, fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
                    Ekle
                  </button>
                </div>
              </div>

              {/* Subject rows */}
              {Object.keys(newManualMock.subjects).length > 0 && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 30px', gap: 6, fontWeight: 900, fontSize: '0.68rem', color: '#64748b', textAlign: 'center', marginBottom: 8 }}>
                    <div style={{ textAlign: 'left' }}>DERS</div>
                    <div>D</div><div>Y</div><div>B</div><div>NET</div><div></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(newManualMock.subjects).map(([sName, scores]) => (
                      <div key={sName} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 30px', gap: 6, alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sName}</div>
                        {['d', 'y', 'b'].map(f => (
                          <input key={f} type="number" placeholder="0" value={scores[f]}
                            onChange={e => updateSubjectScore(sName, f, e.target.value)}
                            style={{ padding: '0.45rem 0.3rem', borderRadius: 6, border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', outline: 'none', minWidth: 0 }} />
                        ))}
                        <input type="number" placeholder="Net" value={scores.net} step="0.25"
                          onChange={e => updateSubjectScore(sName, 'net', e.target.value)}
                          style={{ padding: '0.45rem 0.3rem', borderRadius: 6, border: '1.5px solid #bfdbfe', background: '#eff6ff', fontSize: '0.8rem', fontWeight: 900, textAlign: 'center', color: '#1d4ed8', outline: 'none', minWidth: 0 }} />
                        <button type="button" onClick={() => removeSubjectFromMock(sName)}
                          style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Totals */}
                  <div style={{ borderTop: '2px dashed #cbd5e1', marginTop: 10, paddingTop: 10, display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 30px', gap: 6, fontWeight: 900, textAlign: 'center', fontSize: '0.82rem' }}>
                    <div style={{ textAlign: 'left', color: '#0f172a' }}>TOPLAM</div>
                    <div style={{ color: '#16a34a' }}>{totalMockD}</div>
                    <div style={{ color: '#dc2626' }}>{totalMockY}</div>
                    <div style={{ color: '#64748b' }}>{totalMockB}</div>
                    <div style={{ color: '#7c3aed', fontSize: '1rem' }}>{totalMockNet.toFixed(2)}</div>
                    <div></div>
                  </div>
                </div>
              )}

              <button type="submit" style={{ padding: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                <ClipboardList size={16} style={{ display: 'inline', marginRight: 6 }} />
                {editingMockId ? 'Güncelle' : 'Sonucu Kaydet'}
              </button>
            </form>
          </div>
          <style>{`@keyframes scaleIn { from { transform: scale(0.93) translateY(10px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }`}</style>
        </div>
      )}

      {/* ══════════════════════
          ADD EXAM MODAL
      ══════════════════════ */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: 20, border: '1.5px solid #e2e8f0', width: '100%', maxWidth: 480, padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 3px', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Kendi Denemeni Ekle</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Fiziki deneme kitabını kaydet ve test testini takip et</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={17} />
              </button>
            </div>

            {[
              { label: 'Deneme Adı', key: 'title', placeholder: 'Örn: 1. Türkiye Geneli Denemesi' },
              { label: 'Yayın / Tür', key: 'publisher', placeholder: 'Örn: Özdebir TYT' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>{f.label}</label>
                <input type="text" value={newBook[f.key]} placeholder={f.placeholder}
                  onChange={e => setNewBook(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box', background: '#ffffff', color: '#0f172a' }} />
              </div>
            ))}

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>Dersler / Bölümler</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {newBook.subjects.map((subj, idx) => (
                  <div key={subj.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="text" value={subj.name} placeholder={`Ders ${idx + 1}`}
                      onChange={e => { const s = [...newBook.subjects]; s[idx].name = e.target.value; setNewBook({ ...newBook, subjects: s }); }}
                      style={{ flex: 2, padding: '0.6rem 0.7rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700, outline: 'none', background: '#ffffff', color: '#0f172a' }} />
                    <input type="number" min="1" value={subj.testCount} title="Test Sayısı"
                      onChange={e => { const s = [...newBook.subjects]; s[idx].testCount = Number(e.target.value); setNewBook({ ...newBook, subjects: s }); }}
                      style={{ width: 60, padding: '0.6rem 0.4rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', outline: 'none', background: '#ffffff', color: '#0f172a' }} />
                    <input type="number" min="1" value={subj.questionsPerTest} title="Soru/Test"
                      onChange={e => { const s = [...newBook.subjects]; s[idx].questionsPerTest = Number(e.target.value); setNewBook({ ...newBook, subjects: s }); }}
                      style={{ width: 60, padding: '0.6rem 0.4rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', outline: 'none', background: '#ffffff', color: '#0f172a' }} />
                    <button disabled={newBook.subjects.length <= 1}
                      onClick={() => setNewBook({ ...newBook, subjects: newBook.subjects.filter((_, i) => i !== idx) })}
                      style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: newBook.subjects.length > 1 ? '#fee2e2' : '#f1f5f9', color: newBook.subjects.length > 1 ? '#ef4444' : '#cbd5e1', cursor: newBook.subjects.length > 1 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 4, fontSize: '0.68rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>
                  <span style={{ flex: 2 }}>Ders Adı</span>
                  <span style={{ width: 60, textAlign: 'center' }}>Test Sayısı</span>
                  <span style={{ width: 60, textAlign: 'center' }}>Soru/Test</span>
                  <span style={{ width: 32 }} />
                </div>
                <button onClick={() => setNewBook(p => ({ ...p, subjects: [...p.subjects, { id: `sub_${Date.now()}`, name: '', testCount: 20, questionsPerTest: 20 }] }))}
                  style={{ padding: '0.5rem', background: '#eff6ff', color: '#2563eb', border: '1.5px dashed #bfdbfe', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 2 }}>
                  <Plus size={13} /> Yeni Ders Ekle
                </button>
              </div>
            </div>

            <button onClick={handleSaveNewBook}
              disabled={isSaving || !newBook.title || !newBook.publisher || newBook.subjects.every(s => !s.name)}
              style={{ padding: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)', opacity: (isSaving || !newBook.title || !newBook.publisher) ? 0.65 : 1 }}>
              {isSaving ? '⏳ Oluşturuluyor…' : '📚 Denemeyi Ekle'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}