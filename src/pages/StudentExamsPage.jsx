import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCoaching } from '../context/CoachingContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useTheme } from '../context/ThemeContext';
import { isHomeworkForStudent } from '../utils/testResolver';
import {
  BookOpen, ArrowRight, Star, Plus, X, ClipboardList, TrendingUp,
  Pencil, Trash2, LayoutGrid, List, Trophy, Target, Activity,
  Zap, Clock, ChevronRight, FileBarChart2, BarChart2, BarChart3,
  FlameKindling, Award, CheckCircle2, AlertCircle, Calendar, Search
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell
} from 'recharts';
import { toUUID } from '../services/supabaseService';


/* ── Constants ─── */
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
function Ring({ pct, size = 52, stroke = 5, color, isDark = false }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
    </svg>
  );
}

/* ── Stat card ─── */
function KPI({ icon, label, value, iconBg = 'var(--color-surface-hover)', iconColor = '#6366f1', sub }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 18,
      padding: '1.1rem 1.25rem',
      border: '1.5px solid var(--color-border)',
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
        <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>{sub}</div>}
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

export default function StudentExamsPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
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
  const [examChartViewMode, setExamChartViewMode] = useState('exams'); // 'exams' | 'subjects'
  const [examChartMetric, setExamChartMetric] = useState('grouped'); // 'grouped' | 'net' | 'rate'
  const [showChart, setShowChart] = useState(true);
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

  /* ── Data derivations ─── */
  const bookAssignments = useMemo(() => homeworks.filter(hw => {
    const isTarget = isHomeworkForStudent(hw, currentUser, curData?.grades);
    if (!isTarget) return false;
    const isDirectExam = hw.type === 'physicalExam' || hw.contentType === 'physicalExam' || hw.isPhysical || (hw.subjects && hw.subjects.length > 0);
    const book = hw.bookId ? books.find(b => String(b.id) === String(hw.bookId)) : null;
    const isExamBook = book && book.bookType === 'exam';
    return isDirectExam || (hw.isBookAssignment && isExamBook);
  }), [homeworks, currentUser, curData?.grades, books]);

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
      const bookKey = book ? String(book.id) : `hw_${hw.id}`;
      const bookTitle = book ? book.title : hw.title;
      const bookSubjects = book ? book.subjects : hw.subjects;

      if (!bookMap[bookKey]) {
        bookMap[bookKey] = {
          ...(book || {}),
          id: book ? book.id : hw.id,
          hwId: hw.id,
          title: bookTitle,
          subjects: bookSubjects,
          assignedHomeworks: [],
          allAssignedTestIds: new Set(),
          allSolvedTestIds: new Set()
        };
      }
      bookMap[bookKey].assignedHomeworks.push(hw);
      if (hw.id) bookMap[bookKey].hwId = hw.id;

      let hwTestIdsRaw = [];
      const hasTestDueDates = hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0;

      if (hasTestDueDates) {
        hwTestIdsRaw = Object.entries(hw.testDueDates)
          .filter(([_, dStr]) => dStr && String(dStr).trim() !== '')
          .map(([tId, _]) => tId);
      } else if (Array.isArray(hw.tests) && hw.tests.length > 0) {
        hwTestIdsRaw = hw.tests;
      } else if (hw.title?.includes('(Tüm Kitap Görevi)') && book) {
        hwTestIdsRaw = bookTests.filter(bt => String(bt.bookId) === String(book.id)).map(bt => bt.id);
      }
      hwTestIdsRaw.forEach(id => bookMap[bookKey].allAssignedTestIds.add(String(id)));

      // If student has a direct submission in HomeworkContext or EvaluationContext:
      const hwDirectSub = (hw.submissions || []).find(s => String(s.studentId) === String(studentId));
      const evalDirectSub = studentSubmissions.find(s => String(s.hwId) === String(hw.id) || String(s.testId) === String(hw.id));
      if (hwDirectSub || evalDirectSub) {
        hwTestIdsRaw.forEach(id => bookMap[bookKey].allSolvedTestIds.add(String(id)));
        bookMap[bookKey].allSolvedTestIds.add(String(hw.id));
      }

      studentSubmissions.forEach(s => {
        const candidateFields = [
          s.testId,
          s.realTestId,
          s.bookTestId,
          s.metadata?.realTestId,
          s.metadata?.bookTestId,
          s.metadata?.realId,
          s.hwId
        ];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) candidateFields.push(...s.bookTestIds);

        candidateFields.forEach(field => {
          if (field == null) return;
          const raw = String(field);
          const uuid = toUUID(field);
          if (raw === String(hw.id) || (uuid && String(toUUID(hw.id)) === String(uuid))) {
            hwTestIdsRaw.forEach(id => bookMap[bookKey].allSolvedTestIds.add(String(id)));
            bookMap[bookKey].allSolvedTestIds.add(raw);
          }
          hwTestIdsRaw.forEach(id => {
            const strId = String(id);
            const uuidId = toUUID(id);
            if (strId === raw || (uuid && String(uuidId) === String(uuid))) {
              bookMap[bookKey].allSolvedTestIds.add(strId);
            }
          });
        });
      });

      if (hw.dueDate) {
        const d = new Date(hw.dueDate);
        if (!bookMap[bookKey].targetDueDate || d > bookMap[bookKey].targetDueDate) bookMap[bookKey].targetDueDate = d;
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
      // 1. Direct submissions in HomeworkContext
      b.assignedHomeworks.forEach(hw => {
        const hwSub = (hw.submissions || []).find(s => String(s.studentId) === String(studentId));
        if (hwSub) {
          bestSubsByKey[`hw_${hw.id}`] = {
            id: `hw_${hw.id}`,
            hwId: hw.id,
            testId: hw.id,
            correctCount: hwSub.correctCount ?? hwSub.subjectStats?.totalCorrect ?? 0,
            wrongCount: hwSub.wrongCount ?? hwSub.subjectStats?.totalWrong ?? 0,
            blankCount: hwSub.blankCount ?? hwSub.subjectStats?.totalBlank ?? 0,
            score: hwSub.score ?? hwSub.subjectStats?.totalNet ?? 0,
            subjectStats: hwSub.subjectStats,
            studentAnswers: hwSub.studentAnswers,
            submittedAt: hwSub.submittedAt
          };
        }
      });

      // 2. Submissions in EvaluationContext
      studentSubmissions.forEach(s => {
        const candidates = [s.testId, s.bookTestId, s.homeworkId, s.hwId];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) candidates.push(...s.bookTestIds);
        let belongs = false;
        candidates.forEach(field => {
          if (!field) return;
          if (b.allAssignedTestIds.has(String(field))) belongs = true;
          b.assignedHomeworks.forEach(hw => {
            if (String(hw.id) === String(field) || String(toUUID(hw.id)) === String(field)) belongs = true;
          });
        });
        if (belongs) {
          const key = String(s.testId || s.bookTestId || s.id);
          const ex = bestSubsByKey[key];
          if (!ex || s.score > ex.score || (s.score === ex.score && new Date(s.submittedAt || 0) > new Date(ex.submittedAt || 0))) {
            bestSubsByKey[key] = s;
          }
        }
      });

      let totalCorrect = 0, totalWrong = 0, totalBlank = 0;
      Object.values(bestSubsByKey).forEach(sub => {
        totalCorrect += sub.correctCount || 0;
        totalWrong += sub.wrongCount || 0;
        totalBlank += sub.blankCount || 0;
      });
      b.totalCorrect = totalCorrect;
      b.totalWrong = totalWrong;
      b.totalBlank = totalBlank;
      b.bestSubsByKey = bestSubsByKey;

      const hasDirectHwSub = b.assignedHomeworks.some(hw => (hw.submissions || []).some(s => String(s.studentId) === String(studentId)));
      const hasEvalSub = Object.keys(bestSubsByKey).length > 0 && (totalCorrect > 0 || totalWrong > 0 || totalBlank > 0);
      const isCompleted = hasDirectHwSub || hasEvalSub || (b.totalAssignedTests > 0 && b.allSolvedTestIds.size >= b.totalAssignedTests);

      b.progressPct = isCompleted ? 100 : (b.totalAssignedTests > 0 ? Math.round((b.totalSolvedTests / b.totalAssignedTests) * 100) : 0);
      b.isCompleted = isCompleted;
      b.penaltyRatio = /lgs|bursluluk/i.test(b.title) ? 3 : 4;
      b.net = parseFloat((totalCorrect - totalWrong / b.penaltyRatio).toFixed(2));
    });

    return Object.values(bookMap);
  }, [bookAssignments, books, studentSubmissions, bookTests, studentId]);

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
      const bestSubs = Object.values(book.bestSubsByKey || {});
      const primaryHw = book.assignedHomeworks?.[0];
      const isPhysical = primaryHw?.type === 'physicalExam' || primaryHw?.contentType === 'physicalExam' || primaryHw?.subjects?.length > 0 || book.bookType === 'exam';

      list.push({
        id: book.id,
        hwId: book.hwId || primaryHw?.id,
        type: 'book',
        isPhysical: isPhysical,
        title: book.title,
        date: primaryHw?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        d: book.totalCorrect,
        y: book.totalWrong,
        b: book.totalBlank,
        net: book.net,
        isCompleted: book.isCompleted || book.progressPct >= 100,
        progressPct: book.progressPct,
        remainingDays: book.remainingDays,
        subjects: book.subjects || primaryHw?.subjects || [],
        assignedHomeworks: book.assignedHomeworks,
        bestSubs,
        penaltyRatio: book.penaltyRatio,
        original: book
      });
    });
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [studentMockExams, assignedBooks]);

  const handleOpenExam = (exam) => {
    if (exam.type === 'mock') {
      handleOpenMockModal(exam.original);
    } else if (exam.hwId) {
      navigate(`/physical-exam/${exam.hwId}`);
    } else if (exam.assignedHomeworks?.[0]?.id) {
      navigate(`/physical-exam/${exam.assignedHomeworks[0].id}`);
    } else if (exam.type === 'book') {
      navigate(`/student/books/${exam.id}`);
    }
  };

  /* ── Universal helper to retrieve per-subject scores for any exam ─── */
  const getExamSubjectScores = useCallback((exam) => {
    const result = {};
    if (!exam) return result;

    // 1. Manual Mock Exam
    if (exam.type === 'mock' && exam.scores) {
      Object.entries(exam.scores).forEach(([sName, sc]) => {
        const d = Number(sc.d) || 0;
        const y = Number(sc.y) || 0;
        const b = Number(sc.b) || 0;
        const net = typeof sc.net === 'number' ? sc.net : parseFloat(sc.net || (d - y / 4).toFixed(2));
        result[sName] = {
          name: sName,
          d,
          y,
          b,
          net,
          totalQ: d + y + b
        };
      });
      return result;
    }

    // 2. Physical / Book Exam
    if (exam.type === 'book') {
      const origBook = exam.original || {};
      const primaryHw = (exam.assignedHomeworks && exam.assignedHomeworks[0]) || {};
      const declaredSubjects = exam.subjects || origBook.subjects || primaryHw.subjects || [];

      let rawStats = null;
      let studentAnswers = null;
      let answerKey = origBook.answerKey || primaryHw.answerKey || {};

      const subsToSearch = exam.bestSubs || [];
      for (const sub of subsToSearch) {
        if (sub.subjectStats) rawStats = sub.subjectStats;
        if (sub.studentAnswers) studentAnswers = sub.studentAnswers;
      }

      if (!rawStats && primaryHw.submissions) {
        const hwSub = primaryHw.submissions.find(s => String(s.studentId) === String(studentId));
        if (hwSub) {
          if (hwSub.subjectStats) rawStats = hwSub.subjectStats;
          if (hwSub.studentAnswers) studentAnswers = hwSub.studentAnswers;
        }
      }

      const penalty = exam.penaltyRatio || 3;

      const addStatItem = (sName, correct, wrong, blank, netVal, countVal) => {
        if (!sName || sName === 'totalCorrect' || sName === 'totalWrong' || sName === 'totalBlank' || sName === 'totalNet') return;
        const d = Number(correct) || 0;
        const y = Number(wrong) || 0;
        const b = Number(blank) || 0;
        const net = netVal !== undefined && netVal !== null ? Number(netVal) : parseFloat((d - y / penalty).toFixed(2));
        const totalQ = countVal || (d + y + b);
        result[sName] = {
          name: sName,
          d,
          y,
          b,
          net: parseFloat(net.toFixed(2)),
          totalQ
        };
      };

      if (Array.isArray(rawStats)) {
        rawStats.forEach(item => {
          if (item && item.name) {
            addStatItem(item.name, item.correct ?? item.d, item.wrong ?? item.y, item.blank ?? item.b, item.net, item.count);
          }
        });
      } else if (rawStats && typeof rawStats === 'object') {
        const innerStats = rawStats.subjectStats || rawStats;
        if (Array.isArray(innerStats)) {
          innerStats.forEach(item => {
            if (item && item.name) {
              addStatItem(item.name, item.correct ?? item.d, item.wrong ?? item.y, item.blank ?? item.b, item.net, item.count);
            }
          });
        } else {
          Object.entries(innerStats).forEach(([sName, sData]) => {
            if (typeof sData === 'object' && sData !== null) {
              const actualName = sData.name || sName;
              addStatItem(actualName, sData.correct ?? sData.d ?? sData.correctCount, sData.wrong ?? sData.y ?? sData.wrongCount, sData.blank ?? sData.b ?? sData.blankCount, sData.net, sData.count);
            }
          });
        }
      }

      // Ensure all declared subjects (Türkçe, Matematik, Fen, vb.) are included
      declaredSubjects.forEach(sub => {
        const sName = typeof sub === 'string' ? sub : (sub.name || 'Genel');
        if (!result[sName]) {
          const subAnswers = studentAnswers?.[sName] || [];
          const subKey = answerKey?.[sName] || [];
          const qCount = Number(sub.count || sub.questionCount) || Math.max(subAnswers.length, subKey.length, 0);

          if (subAnswers.length > 0 || subKey.length > 0) {
            let d = 0, y = 0, b = 0;
            const limit = Math.max(qCount, subAnswers.length, subKey.length);
            for (let i = 0; i < limit; i++) {
              const ans = subAnswers[i];
              const correct = subKey[i];
              if (!ans) b++;
              else if (ans === correct) d++;
              else y++;
            }
            const net = Math.max(0, parseFloat((d - y / penalty).toFixed(2)));
            result[sName] = {
              name: sName,
              d,
              y,
              b,
              net,
              totalQ: limit
            };
          } else {
            result[sName] = {
              name: sName,
              d: 0,
              y: 0,
              b: qCount,
              net: 0,
              totalQ: qCount
            };
          }
        }
      });

      if (Object.keys(result).length === 0 && (exam.d || exam.y || exam.b || exam.net)) {
        result['Genel Sınav'] = {
          name: 'Genel Sınav',
          d: exam.d || 0,
          y: exam.y || 0,
          b: exam.b || 0,
          net: Number(exam.net) || 0,
          totalQ: (exam.d || 0) + (exam.y || 0) + (exam.b || 0)
        };
      }
    }

    return result;
  }, [studentId]);

  const overallStats = useMemo(() => {
    let totalD = 0, totalY = 0, totalB = 0, totalNet = 0, maxNet = 0;
    const subMap = {};
    allExamsList.forEach(exam => {
      totalD += exam.d || 0;
      totalY += exam.y || 0;
      totalB += exam.b || 0;
      const n = parseFloat(exam.net || 0);
      totalNet += n;
      if (n > maxNet) maxNet = n;

      const examSubs = getExamSubjectScores(exam);
      Object.entries(examSubs).forEach(([sName, sc]) => {
        if (!subMap[sName]) subMap[sName] = { name: sName, net: 0, count: 0, d: 0, y: 0, b: 0, totalQ: 0 };
        subMap[sName].net += sc.net || 0;
        subMap[sName].d += sc.d || 0;
        subMap[sName].y += sc.y || 0;
        subMap[sName].b += sc.b || 0;
        subMap[sName].totalQ += sc.totalQ || (sc.d + sc.y + sc.b);
        subMap[sName].count++;
      });
    });
    const total = allExamsList.length;
    const totalQ = totalD + totalY + totalB;
    const successRate = totalQ > 0 ? Math.round((totalD / totalQ) * 100) : 0;
    const completedCount = allExamsList.filter(e => e.isCompleted).length;

    return {
      total,
      completedCount,
      avgNet: total > 0 ? (totalNet / total).toFixed(1) : '0',
      maxNet: maxNet.toFixed(1),
      successRate,
      totalD,
      totalY,
      totalB,
      totalQ,
      lastDate: total > 0 ? allExamsList[0].date : '—',
      subjects: Object.values(subMap).sort((a, b) => b.net - a.net),
      bookCount: assignedBooks.length,
      mockCount: studentMockExams.length
    };
  }, [allExamsList, assignedBooks.length, studentMockExams.length, getExamSubjectScores]);

  const examChartData = useMemo(() => {
    return allExamsList.slice(0, 15).map((exam, idx) => {
      const d = exam.d || 0;
      const y = exam.y || 0;
      const b = exam.b || 0;
      const totalQ = d + y + b;
      const net = typeof exam.net === 'number' ? exam.net : parseFloat(exam.net || 0);
      const rate = totalQ > 0 ? Math.round((d / totalQ) * 100) : 0;
      
      const shortTitle = exam.title?.length > 14 
        ? exam.title.slice(0, 12) + '…' 
        : (exam.title || `Deneme ${idx + 1}`);

      return {
        id: exam.id,
        hwId: exam.hwId,
        type: exam.type,
        name: shortTitle,
        fullName: exam.title,
        date: exam.date,
        Doğru: d,
        Yanlış: y,
        Boş: b,
        totalQ,
        net: parseFloat(net.toFixed(2)),
        rate,
        isCompleted: exam.isCompleted,
        original: exam
      };
    });
  }, [allExamsList]);

  /* ── Exam Subject Chart Data (Derslere Göre) ─── */
  const examSubjectChartData = useMemo(() => {
    const subMap = {};

    allExamsList.forEach(exam => {
      const examSubs = getExamSubjectScores(exam);
      Object.entries(examSubs).forEach(([sName, sc]) => {
        if (!subMap[sName]) {
          subMap[sName] = {
            name: sName,
            fullName: sName,
            Doğru: 0,
            Yanlış: 0,
            Boş: 0,
            net: 0,
            totalQ: 0,
            examCount: 0
          };
        }
        subMap[sName].Doğru += sc.d || 0;
        subMap[sName].Yanlış += sc.y || 0;
        subMap[sName].Boş += sc.b || 0;
        subMap[sName].net += sc.net || 0;
        subMap[sName].totalQ += sc.totalQ || (sc.d + sc.y + sc.b);
        subMap[sName].examCount += 1;
      });
    });

    return Object.values(subMap).map(item => {
      const totalQ = item.totalQ || (item.Doğru + item.Yanlış + item.Boş);
      const rate = totalQ > 0 ? Math.round((item.Doğru / totalQ) * 100) : 0;
      const avgNet = item.examCount > 0 ? parseFloat((item.net / item.examCount).toFixed(2)) : 0;
      return {
        ...item,
        totalQ,
        rate,
        avgNet,
        net: parseFloat(item.net.toFixed(2))
      };
    }).sort((a, b) => b.totalQ - a.totalQ);
  }, [allExamsList, getExamSubjectScores]);

  const activeExamChartData = examChartViewMode === 'exams' ? examChartData : examSubjectChartData;

  const displayedExams = useMemo(() => {
    return allExamsList.filter(exam => {
      const sectionOk = activeSection === 'all' || exam.type === activeSection;
      const searchOk = (exam.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      return sectionOk && searchOk;
    });
  }, [allExamsList, activeSection, searchQuery]);

  const trendData = useMemo(() => {
    return [...allExamsList].reverse().map(exam => {
      let net = exam.net;
      if (chartMetric !== 'Toplam Net') {
        const examSubs = getExamSubjectScores(exam);
        if (examSubs[chartMetric]) {
          net = examSubs[chartMetric].net;
        } else {
          net = 0;
        }
      }
      return { 
        name: exam.title?.length > 14 ? exam.title.slice(0, 12) + '…' : exam.title, 
        fullName: exam.title, 
        date: exam.date, 
        Net: parseFloat(net !== undefined && net !== null ? Number(net).toFixed(2) : 0) 
      };
    });
  }, [allExamsList, chartMetric, getExamSubjectScores]);

  const [showClassifiedQuestions, setShowClassifiedQuestions] = useState(false);

  const examMistakeStats = useMemo(() => {
    const studentIdStr = String(studentId || '');
    const studentUuidStr = String(toUUID(studentId) || '');

    const reasonDefs = {
      '⚡ İşlem Hatası': { key: '⚡ İşlem Hatası', color: '#d97706', bg: '#fffbeb', border: '#fde68a', count: 0 },
      '⚠️ Dikkat Kaybı': { key: '⚠️ Dikkat Kaybı', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', count: 0 },
      '📖 Formül / Bilgi': { key: '📖 Formül / Bilgi', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', count: 0 },
      '🧠 Konu Eksiği': { key: '🧠 Konu Eksiği', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', count: 0 },
      '⏱️ Zaman Yetmedi': { key: '⏱️ Zaman Yetmedi', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', count: 0 }
    };

    let totalWrongAndBlank = (overallStats.totalY || 0) + (overallStats.totalB || 0);
    const questionsList = [];
    const countedKeys = new Set();

    // 1. Scan LocalStorage for mistake reasons of all denemes
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('mistake_reasons_')) continue;
        const valStr = localStorage.getItem(k);
        if (!valStr) continue;
        try {
          const parsed = JSON.parse(valStr);
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([subKey, reason]) => {
              if (!reason || typeof reason !== 'string') return;
              const dedupeKey = `${k}_${subKey}`;
              if (countedKeys.has(dedupeKey)) return;
              countedKeys.add(dedupeKey);

              const matchedKey = Object.keys(reasonDefs).find(rk =>
                reason.includes(rk) || rk.includes(reason) ||
                (reason.includes('İşlem') && rk.includes('İşlem')) ||
                (reason.includes('Dikkat') && rk.includes('Dikkat')) ||
                (reason.includes('Formül') && rk.includes('Formül')) ||
                (reason.includes('Konu') && rk.includes('Konu')) ||
                (reason.includes('Zaman') && rk.includes('Zaman'))
              );
              if (matchedKey) {
                reasonDefs[matchedKey].count++;
                questionsList.push({
                  id: dedupeKey,
                  subject: subKey.includes('_') ? subKey.split('_')[0] : 'Deneme',
                  qNo: subKey.includes('_') ? subKey.split('_')[1] : subKey,
                  reason: matchedKey,
                  def: reasonDefs[matchedKey]
                });
              }
            });
          }
        } catch {}
      }
    } catch {}

    // 2. Scan Submissions
    (submissions || []).forEach(sub => {
      const isMatch = String(sub.studentId) === studentIdStr || (studentUuidStr && String(sub.studentId) === studentUuidStr);
      if (!isMatch || sub.status === 'in_progress' || sub.status === 'draft') return;
      const isExam = sub.type === 'physicalExam' || sub.contentType === 'physicalExam' || sub.isPhysical || allExamsList.some(e => String(e.id) === String(sub.testId) || String(e.id) === String(sub.hwId));
      if (!isExam && !sub.mistakeReasons) return;

      if (sub.mistakeReasons && typeof sub.mistakeReasons === 'object') {
        Object.entries(sub.mistakeReasons).forEach(([subKey, reason]) => {
          if (!reason || typeof reason !== 'string') return;
          const dedupeKey = `sub_${sub.id || sub.testId}_${subKey}`;
          if (countedKeys.has(dedupeKey)) return;
          countedKeys.add(dedupeKey);

          const matchedKey = Object.keys(reasonDefs).find(rk =>
            reason.includes(rk) || rk.includes(reason) ||
            (reason.includes('İşlem') && rk.includes('İşlem')) ||
            (reason.includes('Dikkat') && rk.includes('Dikkat')) ||
            (reason.includes('Formül') && rk.includes('Formül')) ||
            (reason.includes('Konu') && rk.includes('Konu')) ||
            (reason.includes('Zaman') && rk.includes('Zaman'))
          );
          if (matchedKey) {
            reasonDefs[matchedKey].count++;
            questionsList.push({
              id: dedupeKey,
              examTitle: sub.testTitle || 'Deneme',
              subject: subKey.includes('_') ? subKey.split('_')[0] : 'Deneme',
              qNo: subKey.includes('_') ? subKey.split('_')[1] : subKey,
              reason: matchedKey,
              def: reasonDefs[matchedKey]
            });
          }
        });
      }
    });

    const totalClassified = Object.values(reasonDefs).reduce((acc, r) => acc + r.count, 0);
    const unclassifiedCount = Math.max(0, totalWrongAndBlank - totalClassified);

    const sortedReasons = Object.values(reasonDefs).sort((a, b) => b.count - a.count);
    const topReason = sortedReasons[0]?.count > 0 ? sortedReasons[0] : null;

    return {
      reasonDefs,
      totalWrongAndBlank,
      totalClassified,
      unclassifiedCount,
      topReason,
      questionsList
    };
  }, [studentId, submissions, allExamsList, overallStats]);

  const isEmpty = assignedBooks.length === 0 && studentMockExams.length === 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '1.5rem 1.5rem', fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--color-text)', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '100%', margin: 0 }}>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 99, padding: '0.35rem 0.95rem', marginBottom: 10 }}>
              <FileBarChart2 size={15} color="#818cf8" />
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#818cf8', letterSpacing: '0.05em' }}>DENEME MERKEZİ</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.95rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>Denemelerim</h1>
            <p style={{ margin: '5px 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Fiziki deneme sınavları, manuel sonuçlar ve net gelişim analizin 📊</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleOpenMockModal()}
              style={{ padding: '0.65rem 1.15rem', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1.5px solid var(--color-border-input)', borderRadius: 12, fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}
            >
              <ClipboardList size={16} color="#818cf8" /> Manuel Sonuç Ekle
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

        {/* ── STAT CARDS ── */}
        {!isEmpty && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <KPI icon={<FileBarChart2 />} label="Toplam Deneme" value={overallStats.total} iconBg={isDark ? "rgba(37,99,235,0.18)" : "#eff6ff"} iconColor="#3b82f6" sub={`${overallStats.completedCount} çözüldü · ${overallStats.total - overallStats.completedCount} bekliyor`} />
            <KPI icon={<Target />} label="Genel Başarı" value={`%${overallStats.successRate}`} iconBg={isDark ? "rgba(16,185,129,0.18)" : "#ecfdf5"} iconColor="#10b981" sub={`${overallStats.totalD} doğru soru`} />
            <KPI icon={<Activity />} label="Ortalama Net" value={overallStats.avgNet} iconBg={isDark ? "rgba(139,92,246,0.18)" : "#faf5ff"} iconColor="#8b5cf6" sub="deneme başı net" />
            <KPI icon={<Trophy />} label="En Yüksek Net" value={overallStats.maxNet} iconBg={isDark ? "rgba(245,158,11,0.18)" : "#fffbeb"} iconColor="#f59e0b" sub="zirve performans" />
            <KPI icon={<CheckCircle2 />} label="Toplam Doğru" value={overallStats.totalD} iconBg={isDark ? "rgba(5,150,105,0.18)" : "#f0fdf4"} iconColor="#059669" sub="kazanılan soru" />
            <KPI icon={<AlertCircle />} label="Toplam Yanlış" value={overallStats.totalY} iconBg={isDark ? "rgba(225,29,72,0.18)" : "#fff1f2"} iconColor="#e11d48" sub="kaybedilen soru" />
          </div>
        )}

        {/* ── CHART PANEL (KİTAPLARIM STİLİ) ── */}
        {!isEmpty && (
          <div style={{ background: 'var(--color-surface)', borderRadius: 20, border: '1.5px solid var(--color-border)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', marginBottom: 22, overflow: 'hidden' }}>
            <div
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.4rem', borderBottom: showChart ? '1px solid var(--color-border)' : 'none', flexWrap: 'wrap', gap: 10 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div
                  onClick={() => setShowChart(c => !c)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)', cursor: 'pointer' }}
                >
                  <BarChart2 size={20} color="#818cf8" /> 
                  {examChartViewMode === 'exams' ? 'Denemelere Göre Soru & Net Dağılımı' : 'Derslere Göre Soru & Net Dağılımı'}
                  <ChevronRight size={18} color="var(--color-text-muted)" style={{ transform: showChart ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>

                {showChart && (
                  <div style={{ display: 'flex', background: 'var(--color-surface-hover)', padding: 3, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <button
                      onClick={() => setExamChartViewMode('exams')}
                      style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: examChartViewMode === 'exams' ? '#6366f1' : 'transparent',
                        color: examChartViewMode === 'exams' ? '#ffffff' : 'var(--color-text-muted)',
                        boxShadow: examChartViewMode === 'exams' ? '0 2px 8px rgba(99,102,241,0.25)' : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      🏆 Denemelere Göre
                    </button>
                    <button
                      onClick={() => setExamChartViewMode('subjects')}
                      style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: examChartViewMode === 'subjects' ? '#6366f1' : 'transparent',
                        color: examChartViewMode === 'subjects' ? '#ffffff' : 'var(--color-text-muted)',
                        boxShadow: examChartViewMode === 'subjects' ? '0 2px 8px rgba(99,102,241,0.25)' : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      🎓 Derslere Göre
                    </button>
                  </div>
                )}
              </div>

              {showChart && (
                <div style={{ display: 'flex', background: 'var(--color-surface-hover)', padding: 3, borderRadius: 10, border: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 2 }}>
                  <button
                    onClick={() => setExamChartMetric('grouped')}
                    style={{
                      padding: '0.35rem 0.8rem',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: examChartMetric === 'grouped' ? '#6366f1' : 'transparent',
                      color: examChartMetric === 'grouped' ? '#ffffff' : 'var(--color-text-muted)',
                      boxShadow: examChartMetric === 'grouped' ? '0 2px 8px rgba(99,102,241,0.25)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    📊 Soru Dağılımı (D / Y / B)
                  </button>
                  <button
                    onClick={() => setExamChartMetric('net')}
                    style={{
                      padding: '0.35rem 0.8rem',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: examChartMetric === 'net' ? '#6366f1' : 'transparent',
                      color: examChartMetric === 'net' ? '#ffffff' : 'var(--color-text-muted)',
                      boxShadow: examChartMetric === 'net' ? '0 2px 8px rgba(99,102,241,0.25)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    📈 Net Sayıları
                  </button>
                  <button
                    onClick={() => setExamChartMetric('rate')}
                    style={{
                      padding: '0.35rem 0.8rem',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: examChartMetric === 'rate' ? '#6366f1' : 'transparent',
                      color: examChartMetric === 'rate' ? '#ffffff' : 'var(--color-text-muted)',
                      boxShadow: examChartMetric === 'rate' ? '0 2px 8px rgba(99,102,241,0.25)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    🎯 Başarı Yüzdesi (%)
                  </button>
                </div>
              )}
            </div>

            {showChart && (
              <div style={{ padding: '1.25rem 1.4rem' }}>
                {/* Interactive Mini Exam / Subject Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
                  {activeExamChartData.map((item, idx) => {
                    const rateColor = item.rate >= 70 ? '#10b981' : item.rate >= 50 ? '#f59e0b' : item.totalQ === 0 ? '#94a3b8' : '#ef4444';
                    const rateBg = isDark
                      ? (item.rate >= 70 ? 'rgba(16,185,129,0.1)' : item.rate >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)')
                      : (item.rate >= 70 ? '#f0fdf4' : item.rate >= 50 ? '#fffbeb' : item.totalQ === 0 ? '#f8fafc' : '#fff1f2');
                    const rateBorder = isDark
                      ? (item.rate >= 70 ? 'rgba(16,185,129,0.3)' : item.rate >= 50 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)')
                      : (item.rate >= 70 ? '#bbf7d0' : item.rate >= 50 ? '#fde68a' : item.totalQ === 0 ? '#e2e8f0' : '#fecdd3');

                    const totalQ = item.totalQ || 0;
                    const pctD = totalQ > 0 ? ((item.Doğru || 0) / totalQ) * 100 : 0;
                    const pctY = totalQ > 0 ? ((item.Yanlış || 0) / totalQ) * 100 : 0;
                    const pctB = totalQ > 0 ? ((item.Boş || 0) / totalQ) * 100 : 0;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (examChartViewMode === 'exams' && item.original) {
                            handleOpenExam(item.original);
                          }
                        }}
                        style={{
                          background: rateBg,
                          border: `1.5px solid ${rateBorder}`,
                          borderRadius: '1rem',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                          cursor: examChartViewMode === 'exams' ? 'pointer' : 'default',
                          transition: 'all 0.18s ease'
                        }}
                        title={examChartViewMode === 'exams' ? `${item.fullName} açmak için tıkla` : item.fullName}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.fullName}
                          </span>
                          <span style={{ fontSize: '0.92rem', fontWeight: 900, color: rateColor }}>
                            {examChartMetric === 'net' ? `${item.net} Net` : `%${item.rate}`}
                          </span>
                        </div>

                        {/* Multi-segment mini progress bar */}
                        <div style={{ width: '100%', height: 6, background: isDark ? '#334155' : '#e2e8f0', borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 1 }}>
                          {totalQ > 0 ? (
                            <>
                              {pctD > 0 && <div style={{ width: `${pctD}%`, background: '#10b981', height: '100%' }} title={`Doğru: ${item.Doğru}`} />}
                              {pctY > 0 && <div style={{ width: `${pctY}%`, background: '#ef4444', height: '100%' }} title={`Yanlış: ${item.Yanlış}`} />}
                              {pctB > 0 && <div style={{ width: `${pctB}%`, background: '#94a3b8', height: '100%' }} title={`Boş: ${item.Boş}`} />}
                            </>
                          ) : (
                            <div style={{ width: '100%', background: '#cbd5e1', height: '100%' }} />
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                          <span>{examChartViewMode === 'exams' ? (item.date || 'Tarih yok') : `${item.examCount || 1} Deneme`}</span>
                          <span style={{ display: 'flex', gap: 6, fontWeight: 800 }}>
                            <span style={{ color: '#10b981' }}>{item.Doğru}D</span>
                            <span style={{ color: '#ef4444' }}>{item.Yanlış}Y</span>
                            <span style={{ color: '#94a3b8' }}>{item.Boş}B</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Recharts Bar Chart */}
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activeExamChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="examsCorrectGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                        </linearGradient>
                        <linearGradient id="examsWrongGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fb7185" stopOpacity={1} />
                          <stop offset="100%" stopColor="#e11d48" stopOpacity={0.9} />
                        </linearGradient>
                        <linearGradient id="examsBlankGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#cbd5e1" stopOpacity={0.85} />
                          <stop offset="100%" stopColor="#64748b" stopOpacity={0.65} />
                        </linearGradient>
                        <linearGradient id="examsNetGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.9} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text)', fontWeight: 800 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 700 }} tickFormatter={v => examChartMetric === 'rate' ? `%${v}` : v} domain={examChartMetric === 'rate' ? [0, 100] : ['auto', 'auto']} />
                      <Tooltip
                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                        contentStyle={{ background: 'var(--color-surface)', borderRadius: 14, border: '1.5px solid var(--color-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)' }}
                        formatter={(value, name) => [
                          examChartMetric === 'rate' ? `%${value} Başarı` : examChartMetric === 'net' ? `${value} Net` : `${value} Soru`,
                          name
                        ]}
                      />
                      <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.8rem', fontWeight: 800 }} />

                      {examChartMetric === 'grouped' ? (
                        <>
                          <Bar dataKey="Doğru" name="🟢 Doğru" fill="url(#examsCorrectGrad)" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="Yanlış" name="🔴 Yanlış" fill="url(#examsWrongGrad)" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="Boş" name="⚪ Boş" fill="url(#examsBlankGrad)" radius={[6, 6, 0, 0]} />
                        </>
                      ) : examChartMetric === 'net' ? (
                        <Bar dataKey="net" name="📈 Toplam Net" fill="url(#examsNetGrad)" radius={[6, 6, 0, 0]}>
                          {activeExamChartData.map((entry, idx) => (
                            <Cell key={`cell-net-${idx}`} fill={entry.net >= 60 ? '#10b981' : entry.net >= 40 ? '#6366f1' : entry.net >= 20 ? '#f59e0b' : '#ef4444'} />
                          ))}
                        </Bar>
                      ) : (
                        <Bar dataKey="rate" name="🎯 Başarı Oranı (%)" fill="#6366f1" radius={[6, 6, 0, 0]}>
                          {activeExamChartData.map((entry, idx) => {
                            const col = entry.rate >= 70 ? '#10b981' : entry.rate >= 50 ? '#f59e0b' : '#ef4444';
                            return <Cell key={`cell-bk-${idx}`} fill={col} />;
                          })}
                        </Bar>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── NET GELİŞİM TRENDİ (AREA CHART) ── */}
        {allExamsList.length > 1 && (
          <div style={{ background: 'var(--color-surface)', borderRadius: 20, border: '1.5px solid var(--color-border)', padding: '1.4rem 1.6rem', marginBottom: 22, boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                <TrendingUp size={18} color="#818cf8" /> Net Gelişim Trend Grafiği
              </div>
              <select value={chartMetric} onChange={e => setChartMetric(e.target.value)}
                style={{ padding: '0.45rem 0.9rem', borderRadius: 10, border: '1.5px solid var(--color-border-input)', fontWeight: 800, fontSize: '0.8rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', outline: 'none', cursor: 'pointer' }}>
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text)', fontWeight: 700 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 600 }} domain={['dataMin - 2', 'dataMax + 5']} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="Net" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#netGrad)" dot={{ fill: '#7c3aed', r: 4 }} activeDot={{ r: 7, fill: '#6d28d9', stroke: '#ffffff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <style>{`
          .sep-mistake-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 0.75rem;
            margin-bottom: 1.25rem;
          }
          @media (max-width: 1024px) {
            .sep-mistake-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          @media (max-width: 640px) {
            .sep-mistake-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 0.5rem;
            }
            .sep-mistake-card {
              padding: 0.65rem 0.75rem !important;
              border-radius: 11px !important;
            }
            .sep-mistake-card:last-child {
              grid-column: span 2;
            }
            .sep-mistake-card-title {
              font-size: 0.72rem !important;
            }
            .sep-mistake-card-pct {
              font-size: 0.82rem !important;
            }
            .sep-mistake-card-val {
              font-size: 1.05rem !important;
            }
          }
        `}</style>

        {/* 🤔 DENEME HATA & YANLIŞ SEBEPLERİ ANALİZİ WIDGET */}
        {!isEmpty && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 20,
            padding: '1.4rem 1.6rem',
            marginBottom: 22,
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(217,119,6,0.3)'
                }}>
                  <Zap size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>
                    🤔 Deneme Hata & Yanlış Sebepleri Analizi
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Denemelerde işaretlediğiniz yanlış ve boş soruların analiz özeti
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 800 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  Toplam Yanlış & Boş: <strong style={{ color: 'var(--color-text)' }}>{examMistakeStats.totalWrongAndBlank}</strong>
                </span>
                <span>•</span>
                <span style={{ color: '#10b981' }}>
                  Sınıflandırılan: <strong>{examMistakeStats.totalClassified}</strong>
                </span>
                <span>•</span>
                <span style={{ color: '#f59e0b' }}>
                  Bekleyen: <strong>{examMistakeStats.unclassifiedCount}</strong>
                </span>
              </div>
            </div>

            {/* Multi-segment Progress Bar */}
            {examMistakeStats.totalClassified > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  width: '100%',
                  height: 10,
                  borderRadius: 99,
                  background: 'var(--color-surface-hover, #f1f5f9)',
                  overflow: 'hidden',
                  display: 'flex',
                  border: '1px solid var(--color-border, #e2e8f0)'
                }}>
                  {Object.values(examMistakeStats.reasonDefs).map(r => {
                    if (r.count <= 0) return null;
                    const pct = (r.count / examMistakeStats.totalClassified) * 100;
                    return (
                      <div
                        key={r.key}
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: r.color,
                          transition: 'width 0.3s ease'
                        }}
                        title={`${r.key}: ${r.count} soru (%${Math.round(pct)})`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reason KPI Cards Grid */}
            <div className="sep-mistake-grid">
              {Object.values(examMistakeStats.reasonDefs).map(r => {
                const pct = examMistakeStats.totalClassified > 0 ? Math.round((r.count / examMistakeStats.totalClassified) * 100) : 0;
                return (
                  <div
                    key={r.key}
                    className="sep-mistake-card"
                    style={{
                      background: r.count > 0 ? r.bg : 'var(--color-surface-hover, #f8fafc)',
                      border: `1.5px solid ${r.count > 0 ? r.border : 'var(--color-border, #e2e8f0)'}`,
                      borderRadius: 14,
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span className="sep-mistake-card-title" style={{ fontSize: '0.78rem', fontWeight: 900, color: r.count > 0 ? r.color : 'var(--color-text-muted)' }}>
                        {r.key}
                      </span>
                      <span className="sep-mistake-card-pct" style={{ fontSize: '0.9rem', fontWeight: 900, color: r.count > 0 ? r.color : 'var(--color-text-muted)' }}>
                        %{pct}
                      </span>
                    </div>
                    <div className="sep-mistake-card-val" style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>
                      {r.count} <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>soru</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coaching Tip */}
            {examMistakeStats.topReason && examMistakeStats.topReason.count > 0 ? (
              <div style={{
                background: 'var(--color-surface-hover, #f8fafc)',
                border: '1.5px dashed var(--color-border, #cbd5e1)',
                borderRadius: 12,
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.82rem',
                color: 'var(--color-text)',
                marginBottom: examMistakeStats.questionsList.length > 0 ? 12 : 0
              }}>
                <span style={{ fontSize: '1.2rem' }}>💡</span>
                <div>
                  <strong>Deneme Analiz İpucu:</strong> Denemelerdeki en yaygın hata nedeniniz <strong style={{ color: examMistakeStats.topReason.color }}>{examMistakeStats.topReason.key}</strong> (%{Math.round((examMistakeStats.topReason.count / examMistakeStats.totalClassified) * 100)}).
                  {examMistakeStats.topReason.key.includes('Dikkat') && ' Soru köklerindeki olumsuz ifadelere ("değildir", "yanlıştır") dikkat etmeniz deneme netlerinizi hızla yukarı çekecektir.'}
                  {examMistakeStats.topReason.key.includes('İşlem') && ' Denemelerde işlem adımlarını kitapçık kenarına düzenli yazarak çözmeniz işlem hatalarını önleyecektir.'}
                  {examMistakeStats.topReason.key.includes('Konu') && ' Bu konulardaki eksikleri kapatmak için konu özetlerini ve çözümlü örnekleri tekrar incelemeniz önerilir.'}
                  {examMistakeStats.topReason.key.includes('Formül') && ' Deneme öncesi formül ve kural kartlarını 5 dakika gözden geçirmek net kaybını sıfırlayacaktır.'}
                  {examMistakeStats.topReason.key.includes('Zaman') && ' Turlama tekniği uygulayarak zorlandığınız sorulara işaret koyup 2. tura bırakmanız zaman yönetimini güçlendirecektir.'}
                </div>
              </div>
            ) : null}

            {/* Collapsible Classified Questions List */}
            {examMistakeStats.questionsList.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowClassifiedQuestions(p => !p)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6366f1',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: 0
                  }}
                >
                  <span>{showClassifiedQuestions ? '▲ Soru Listesini Gizle' : `▼ Sınıflandırılan Soruları İncele (${examMistakeStats.questionsList.length} Soru)`}</span>
                </button>

                {showClassifiedQuestions && (
                  <div style={{
                    marginTop: 10,
                    background: 'var(--color-surface-hover, #f8fafc)',
                    borderRadius: 12,
                    border: '1px solid var(--color-border, #e2e8f0)',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    maxHeight: 280,
                    overflowY: 'auto'
                  }}>
                    {examMistakeStats.questionsList.map(item => (
                      <div
                        key={item.id}
                        style={{
                          background: 'var(--color-surface, #ffffff)',
                          border: `1.5px solid ${item.def.border}`,
                          borderRadius: 8,
                          padding: '0.45rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 900, color: 'var(--color-text)' }}>
                            {item.examTitle ? `${item.examTitle} • ` : ''}{item.subject} Soru {item.qNo}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: item.def.color,
                          background: item.def.bg,
                          border: `1px solid ${item.def.border}`,
                          padding: '2px 8px',
                          borderRadius: 6
                        }}>
                          {item.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {!isEmpty && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface)', padding: 4, borderRadius: 12, border: '1.5px solid var(--color-border)' }}>
              {[
                { key: 'all',  label: `📋 Tümü (${allExamsList.length})` },
                { key: 'book', label: `📚 Fiziki (${assignedBooks.length})` },
                { key: 'mock', label: `✏️ Manuel (${studentMockExams.length})` },
              ].map(s => (
                <button key={s.key} onClick={() => setActiveSection(s.key)} style={{ padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', background: activeSection === s.key ? (isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)') : 'transparent', color: activeSection === s.key ? '#818cf8' : 'var(--color-text-muted)', whiteSpace: 'nowrap', transition: 'all 0.15s ease' }}>
                  {s.label}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative', flex: '1 1 180px' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Deneme ara…"
                style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 12, border: '1.5px solid var(--color-border-input)', fontSize: '0.82rem', fontWeight: 700, background: 'var(--color-surface)', outline: 'none', color: 'var(--color-text)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface)', padding: 4, borderRadius: 12, border: '1.5px solid var(--color-border)' }}>
              {[{ k: 'cards', ic: <LayoutGrid size={15} /> }, { k: 'table', ic: <List size={15} /> }].map(m => (
                <button key={m.k} onClick={() => setViewMode(m.k)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: viewMode === m.k ? (isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)') : 'transparent', color: viewMode === m.k ? '#818cf8' : 'var(--color-text-muted)' }}>
                  {m.ic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {isEmpty && (
          booksLoading ? (
            <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '4rem 2rem', textAlign: 'center', border: '1.5px solid var(--color-border)' }}>
              <div style={{ width: 44, height: 44, border: '4px solid var(--color-border)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontWeight: 800, color: 'var(--color-text-muted)' }}>Denemeler yükleniyor…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '5rem 2rem', textAlign: 'center', border: '1.5px solid var(--color-border)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 90, height: 90, background: isDark ? 'rgba(37,99,235,0.15)' : '#eff6ff', border: isDark ? '1.5px solid rgba(59,130,246,0.35)' : '1.5px solid #bfdbfe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <FileBarChart2 size={40} color="#3b82f6" />
              </div>
              <h2 style={{ margin: '0 0 8px', color: 'var(--color-text)', fontWeight: 900 }}>Henüz Deneme Yok</h2>
              <p style={{ color: 'var(--color-text-muted)', margin: '0 0 24px', fontSize: '0.9rem' }}>Fiziki deneme sınavları atandığında veya manuel sonuç eklediğinde burada görünecek.</p>
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
                    background: 'var(--color-surface)',
                    borderRadius: 20,
                    border: `1.5px solid ${exam.isCompleted && !isMock ? '#10b981' : 'var(--color-border)'}`,
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
                  onClick={() => handleOpenExam(exam)}
                >
                  {/* Accent line */}
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${p.from}, ${p.to})`, position: 'absolute', top: 0, left: 0, right: 0 }} />

                  {/* Badge */}
                  {exam.isCompleted && !isMock && (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5', border: isDark ? '1px solid rgba(16,185,129,0.4)' : '1px solid #a7f3d0', color: '#10b981', padding: '0.22rem 0.6rem', borderRadius: 99, fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Star size={10} fill="#10b981" color="#10b981" /> TAMAMLANDI
                    </div>
                  )}
                  {!isMock && !exam.isCompleted && exam.remainingDays !== undefined && (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: exam.remainingDays <= 3 ? (isDark ? 'rgba(239,68,68,0.2)' : '#fef2f2') : (isDark ? 'rgba(245,158,11,0.2)' : '#fffbeb'), border: exam.remainingDays <= 3 ? (isDark ? '1px solid rgba(239,68,68,0.4)' : '1px solid #fecaca') : (isDark ? '1px solid rgba(245,158,11,0.4)' : '1px solid #fde68a'), color: exam.remainingDays <= 3 ? '#ef4444' : '#d97706', padding: '0.22rem 0.6rem', borderRadius: 99, fontSize: '0.65rem', fontWeight: 900 }}>
                      ⏱ {exam.remainingDays}g kaldı
                    </div>
                  )}

                  {/* Header */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 6 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(145deg, ${p.from}, ${p.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${p.shadow}`, flexShrink: 0 }}>
                      {isMock ? <ClipboardList size={24} color="#ffffff" /> : <BookOpen size={24} color="#ffffff" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)', lineHeight: 1.3, paddingRight: exam.remainingDays !== undefined || exam.isCompleted ? 70 : 0 }}>{exam.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ background: isMock ? (isDark ? 'rgba(139,92,246,0.2)' : '#faf5ff') : (isDark ? 'rgba(37,99,235,0.2)' : '#eff6ff'), color: isMock ? '#8b5cf6' : '#3b82f6', border: `1px solid ${isMock ? (isDark ? 'rgba(139,92,246,0.4)' : '#e9d5ff') : (isDark ? 'rgba(37,99,235,0.4)' : '#bfdbfe')}`, borderRadius: 6, padding: '0.18rem 0.55rem', fontSize: '0.68rem', fontWeight: 900 }}>
                          {isMock ? '✏️ Manuel' : '📚 Fiziki'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{exam.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar (books only) */}
                  {!isMock && (
                    <div style={{ background: 'var(--color-surface-hover)', borderRadius: 12, padding: '0.75rem', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Test İlerlemesi</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: p.to }}>%{exam.progressPct}</span>
                          <Ring pct={exam.progressPct || 0} size={36} stroke={4} color={exam.isCompleted ? '#10b981' : p.from} isDark={isDark} />
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${exam.progressPct || 0}%`, height: '100%', background: exam.isCompleted ? '#10b981' : `linear-gradient(90deg, ${p.from}, ${p.to})`, borderRadius: 99, transition: 'width 0.7s ease' }} />
                      </div>
                    </div>
                  )}

                  {/* D/Y/B + Net */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {[
                      { l: 'Doğru', v: exam.d, c: '#10b981', bg: isDark ? 'rgba(16,185,129,0.15)' : '#f0fdf4', border: isDark ? 'rgba(16,185,129,0.3)' : '#bbf7d0' },
                      { l: 'Yanlış', v: exam.y, c: '#ef4444', bg: isDark ? 'rgba(239,68,68,0.15)' : '#fff1f2', border: isDark ? 'rgba(239,68,68,0.3)' : '#fecdd3' },
                      { l: 'Boş',    v: exam.b, c: 'var(--color-text-muted)', bg: 'var(--color-surface-hover)', border: 'var(--color-border)' },
                      { l: 'Net',    v: exam.net, c: '#8b5cf6', bg: isDark ? 'rgba(139,92,246,0.15)' : '#faf5ff', border: isDark ? 'rgba(139,92,246,0.3)' : '#e9d5ff' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '0.4rem 0.3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: s.c, fontWeight: 900, textTransform: 'uppercase' }}>{s.l}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 900, color: s.c }}>{s.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                    {exam.type === 'book' ? (
                      <button onClick={e => { e.stopPropagation(); handleOpenExam(exam); }}
                        style={{ width: '100%', padding: '0.6rem', background: exam.isCompleted ? 'var(--color-surface-hover)' : `linear-gradient(135deg, ${p.from}, ${p.to})`, color: exam.isCompleted ? 'var(--color-text)' : 'white', border: exam.isCompleted ? '1.5px solid var(--color-border-input)' : 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: exam.isCompleted ? 'none' : `0 4px 12px ${p.shadow}` }}>
                        {exam.isCompleted ? '📋 İncele' : '▶ Devam Et'} <ArrowRight size={14} />
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                        <button onClick={e => { e.stopPropagation(); handleOpenMockModal(exam.original); }}
                          style={{ flex: 1, padding: '0.55rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', borderRadius: 8, fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <Pencil size={13} /> Düzenle
                        </button>
                        <button onClick={e => handleDeleteMock(e, exam.id)}
                          style={{ flex: 1, padding: '0.55rem', background: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2', color: '#ef4444', border: isDark ? '1px solid rgba(239,68,68,0.3)' : '1px solid #fecaca', borderRadius: 8, fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <Trash2 size={13} /> Sil
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {displayedExams.length === 0 && (
              <div style={{ gridColumn: '1/-1', background: 'var(--color-surface)', borderRadius: 16, padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 700, border: '1.5px solid var(--color-border)' }}>
                Filtreye uygun deneme bulunamadı
              </div>
            )}
          </div>
        )}

        {/* ── TABLE VIEW ── */}
        {!isEmpty && viewMode === 'table' && (
          <div style={{ background: 'var(--color-surface)', borderRadius: 18, border: '1.5px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760, fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1.5px solid var(--color-border)' }}>
                    {['DENEME ADI', 'TARİH', 'TÜR', 'DOĞRU', 'YANLIŞ', 'BOŞ', 'NET', 'İŞLEM'].map(h => (
                      <th key={h} style={{ padding: '0.9rem 1rem', fontWeight: 900, fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: h === 'İŞLEM' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedExams.map((exam, idx) => (
                    <tr key={`${exam.type}-${exam.id}`}
                      style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 1 ? 'var(--color-surface-hover)' : 'var(--color-surface)', transition: 'background 0.15s', cursor: 'pointer' }}
                      onClick={() => handleOpenExam(exam)}
                    >
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: 'var(--color-text)' }}>
                          {exam.type === 'mock' ? <ClipboardList size={16} color="#818cf8" /> : <BookOpen size={16} color={exam.isCompleted ? '#10b981' : '#3b82f6'} />}
                          <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{exam.date}</td>
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <span style={{ background: exam.type === 'mock' ? (isDark ? 'rgba(139,92,246,0.2)' : '#faf5ff') : exam.isCompleted ? (isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5') : (isDark ? 'rgba(37,99,235,0.2)' : '#eff6ff'), color: exam.type === 'mock' ? '#8b5cf6' : exam.isCompleted ? '#10b981' : '#3b82f6', border: `1px solid ${exam.type === 'mock' ? (isDark ? 'rgba(139,92,246,0.4)' : '#e9d5ff') : exam.isCompleted ? (isDark ? 'rgba(16,185,129,0.4)' : '#a7f3d0') : (isDark ? 'rgba(37,99,235,0.4)' : '#bfdbfe')}`, borderRadius: 6, padding: '0.22rem 0.65rem', fontSize: '0.72rem', fontWeight: 900 }}>
                          {exam.type === 'mock' ? '✏️ Manuel' : exam.isCompleted ? '✅ Tamamlandı' : `📊 %${exam.progressPct}`}
                        </span>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: '#10b981' }}>{exam.d}</td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: '#ef4444' }}>{exam.y}</td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: 'var(--color-text-muted)' }}>{exam.b}</td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: '#8b5cf6', fontSize: '1rem' }}>{exam.net}</td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                        {exam.type === 'book' ? (
                          <button onClick={e => { e.stopPropagation(); handleOpenExam(exam); }}
                            style={{ background: exam.isCompleted ? 'var(--color-surface-hover)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: exam.isCompleted ? 'var(--color-text)' : 'white', border: exam.isCompleted ? '1.5px solid var(--color-border-input)' : 'none', padding: '0.38rem 0.9rem', borderRadius: 8, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                            {exam.isCompleted ? 'İncele' : 'Devam Et'}
                          </button>
                        ) : (
                          <div style={{ display: 'inline-flex', gap: 5 }}>
                            <button onClick={e => { e.stopPropagation(); handleOpenMockModal(exam.original); }}
                              style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border-input)', padding: '0.38rem 0.55rem', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Pencil size={13} />
                            </button>
                            <button onClick={e => handleDeleteMock(e, exam.id)}
                              style={{ background: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2', color: '#ef4444', border: isDark ? '1px solid rgba(239,68,68,0.3)' : '1px solid #fecaca', padding: '0.38rem 0.55rem', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayedExams.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 700 }}>Sonuç bulunamadı</td></tr>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay, rgba(15, 23, 42, 0.6))', backdropFilter: 'blur(6px)', padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 20, border: '1.5px solid var(--color-border)', width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 3px', fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-text)' }}>{editingMockId ? 'Deneme Sonucunu Düzenle' : 'Manuel Deneme Sonucu Ekle'}</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Fiziki sınav veya dershanede girilen denemenin sonuçlarını gir</p>
              </div>
              <button onClick={() => setShowMockModal(false)} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveMock} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Net rule */}
              <div style={{ background: 'var(--color-surface-hover)', padding: '0.85rem 1rem', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)' }}>Net Hesaplama Kuralı</label>
                <select value={netRule} onChange={handleNetRuleChange}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid var(--color-border-input)', fontSize: '0.82rem', fontWeight: 700, outline: 'none', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer' }}>
                  <option value="4">4 Yanlış → 1 Doğruyu Götürür (YKS/TYT)</option>
                  <option value="3">3 Yanlış → 1 Doğruyu Götürür (LGS)</option>
                  <option value="0">Yanlışlar Götürmez</option>
                </select>
              </div>

              {/* Title + Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)' }}>Deneme Adı</label>
                  <input required type="text" placeholder="Örn: Özdebir TYT 1" value={newManualMock.title}
                    onChange={e => setNewManualMock(p => ({ ...p, title: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1.5px solid var(--color-border-input)', fontSize: '0.85rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box', background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)' }}>Tarih</label>
                  <input required type="date" value={newManualMock.date}
                    onChange={e => setNewManualMock(p => ({ ...p, date: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1.5px solid var(--color-border-input)', fontSize: '0.85rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box', background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} />
                </div>
              </div>

              {/* Add subject */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)' }}>Ders Ekle</label>
                <div style={{ display: 'flex', gap: 7 }}>
                  <input type="text" placeholder="Ders adı (Türkçe, Matematik…)" value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubjectToMock(); } }}
                    style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: 8, border: '1.5px solid var(--color-border-input)', fontSize: '0.82rem', fontWeight: 700, outline: 'none', background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} />
                  <button type="button" onClick={addSubjectToMock}
                    style={{ padding: '0.65rem 1rem', background: isDark ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid #3b82f6', borderRadius: 8, fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
                    Ekle
                  </button>
                </div>
              </div>

              {/* Subject rows */}
              {Object.keys(newManualMock.subjects).length > 0 && (
                <div style={{ background: 'var(--color-surface-hover)', padding: '1rem', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 30px', gap: 6, fontWeight: 900, fontSize: '0.68rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 8 }}>
                    <div style={{ textAlign: 'left' }}>DERS</div>
                    <div>D</div><div>Y</div><div>B</div><div>NET</div><div></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(newManualMock.subjects).map(([sName, scores]) => (
                      <div key={sName} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 30px', gap: 6, alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sName}</div>
                        {['d', 'y', 'b'].map(f => (
                          <input key={f} type="number" placeholder="0" value={scores[f]}
                            onChange={e => updateSubjectScore(sName, f, e.target.value)}
                            style={{ padding: '0.45rem 0.3rem', borderRadius: 6, border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', outline: 'none', minWidth: 0 }} />
                        ))}
                        <input type="number" placeholder="Net" value={scores.net} step="0.25"
                          onChange={e => updateSubjectScore(sName, 'net', e.target.value)}
                          style={{ padding: '0.45rem 0.3rem', borderRadius: 6, border: '1.5px solid #3b82f6', background: isDark ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.12)', fontSize: '0.8rem', fontWeight: 900, textAlign: 'center', color: '#60a5fa', outline: 'none', minWidth: 0 }} />
                        <button type="button" onClick={() => removeSubjectFromMock(sName)}
                          style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Totals */}
                  <div style={{ borderTop: '2px dashed var(--color-border)', marginTop: 10, paddingTop: 10, display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 30px', gap: 6, fontWeight: 900, textAlign: 'center', fontSize: '0.82rem' }}>
                    <div style={{ textAlign: 'left', color: 'var(--color-text)' }}>TOPLAM</div>
                    <div style={{ color: '#10b981' }}>{totalMockD}</div>
                    <div style={{ color: '#ef4444' }}>{totalMockY}</div>
                    <div style={{ color: 'var(--color-text-muted)' }}>{totalMockB}</div>
                    <div style={{ color: '#8b5cf6', fontSize: '1rem' }}>{totalMockNet.toFixed(2)}</div>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay, rgba(15, 23, 42, 0.6))', backdropFilter: 'blur(6px)', padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 20, border: '1.5px solid var(--color-border)', width: '100%', maxWidth: 480, padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 3px', fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-text)' }}>Kendi Denemeni Ekle</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Fiziki deneme kitabını kaydet ve test testini takip et</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={17} />
              </button>
            </div>

            {[
              { label: 'Deneme Adı', key: 'title', placeholder: 'Örn: 1. Türkiye Geneli Denemesi' },
              { label: 'Yayın / Tür', key: 'publisher', placeholder: 'Örn: Özdebir TYT' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)' }}>{f.label}</label>
                <input type="text" value={newBook[f.key]} placeholder={f.placeholder}
                  onChange={e => setNewBook(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: 8, border: '1.5px solid var(--color-border-input)', fontSize: '0.88rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box', background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} />
              </div>
            ))}

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--color-border)' }}>Dersler / Bölümler</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {newBook.subjects.map((subj, idx) => (
                  <div key={subj.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="text" value={subj.name} placeholder={`Ders ${idx + 1}`}
                      onChange={e => { const s = [...newBook.subjects]; s[idx].name = e.target.value; setNewBook({ ...newBook, subjects: s }); }}
                      style={{ flex: 2, padding: '0.6rem 0.7rem', borderRadius: 8, border: '1.5px solid var(--color-border-input)', fontSize: '0.8rem', fontWeight: 700, outline: 'none', background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} />
                    <input type="number" min="1" value={subj.testCount} title="Test Sayısı"
                      onChange={e => { const s = [...newBook.subjects]; s[idx].testCount = Number(e.target.value); setNewBook({ ...newBook, subjects: s }); }}
                      style={{ width: 60, padding: '0.6rem 0.4rem', borderRadius: 8, border: '1.5px solid var(--color-border-input)', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', outline: 'none', background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} />
                    <input type="number" min="1" value={subj.questionsPerTest} title="Soru/Test"
                      onChange={e => { const s = [...newBook.subjects]; s[idx].questionsPerTest = Number(e.target.value); setNewBook({ ...newBook, subjects: s }); }}
                      style={{ width: 60, padding: '0.6rem 0.4rem', borderRadius: 8, border: '1.5px solid var(--color-border-input)', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', outline: 'none', background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} />
                    <button disabled={newBook.subjects.length <= 1}
                      onClick={() => setNewBook({ ...newBook, subjects: newBook.subjects.filter((_, i) => i !== idx) })}
                      style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: newBook.subjects.length > 1 ? (isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)') : 'var(--color-surface-hover)', color: newBook.subjects.length > 1 ? '#f87171' : 'var(--color-text-muted)', cursor: newBook.subjects.length > 1 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 4, fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
                  <span style={{ flex: 2 }}>Ders Adı</span>
                  <span style={{ width: 60, textAlign: 'center' }}>Test Sayısı</span>
                  <span style={{ width: 60, textAlign: 'center' }}>Soru/Test</span>
                  <span style={{ width: 32 }} />
                </div>
                <button onClick={() => setNewBook(p => ({ ...p, subjects: [...p.subjects, { id: `sub_${Date.now()}`, name: '', testCount: 20, questionsPerTest: 20 }] }))}
                  style={{ padding: '0.5rem', background: isDark ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1.5px dashed #3b82f6', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 2 }}>
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
