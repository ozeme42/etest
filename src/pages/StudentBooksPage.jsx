import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { isHomeworkForStudent } from '../utils/testResolver';
import {
  BookOpen, Map, ArrowRight, BarChart2, Star, Plus, X, Target,
  CheckCircle2, Activity, Layers, Trophy, TrendingUp, Zap, Clock,
  ChevronRight, BookMarked, Search, Filter, RotateCcw, Award
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadialBarChart, RadialBar, Cell
} from 'recharts';
import { toUUID } from '../services/supabaseService';

const DEBUG_PROGRESS = false;

/* ── Colour palette for book covers ─── */
const BOOK_PALETTES = [
  { from: '#6366f1', to: '#818cf8', shadow: 'rgba(99,102,241,0.35)' },
  { from: '#10b981', to: '#34d399', shadow: 'rgba(16,185,129,0.35)' },
  { from: '#f59e0b', to: '#fbbf24', shadow: 'rgba(245,158,11,0.35)' },
  { from: '#ef4444', to: '#f87171', shadow: 'rgba(239,68,68,0.35)' },
  { from: '#8b5cf6', to: '#a78bfa', shadow: 'rgba(139,92,246,0.35)' },
  { from: '#0ea5e9', to: '#38bdf8', shadow: 'rgba(14,165,233,0.35)' },
  { from: '#ec4899', to: '#f472b6', shadow: 'rgba(236,72,153,0.35)' },
  { from: '#14b8a6', to: '#2dd4bf', shadow: 'rgba(20,184,166,0.35)' },
];
const palette = (idx) => BOOK_PALETTES[idx % BOOK_PALETTES.length];

/* ── Stat Card ─── */
function StatCard({ icon, label, value, gradient, shadow, border, sub, iconBg = 'rgba(99,102,241,0.12)', iconColor = '#6366f1' }) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 18,
      padding: '1.1rem 1.3rem',
      border: '1.5px solid #e2e8f0',
      boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {React.cloneElement(icon, { size: 22, color: iconColor })}
      </div>
      <div>
        <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Circular progress ─── */
function CircularProgress({ pct, size = 64, stroke = 6, color }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

export default function StudentBooksPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { homeworks = [], addHomework } = useHomework();
  const { books = [], bookTests = [], isLoading: booksLoading, addTrackedBook, addTrackedBookTest } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();

  const studentId = currentUser?.id;
  const grade = currentUser?.grade;
  const gradeId = currentUser?.gradeId;
  const className = currentUser?.className;

  const defaultOptionCount = (grade && String(grade).match(/^[5-8]/)) ? 4 : 5;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', publisher: '', optionCount: defaultOptionCount, subjects: [{ id: 'sub_1', name: '', testCount: 20, questionsPerTest: 20 }] });
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('progress'); // 'progress' | 'title' | 'recent'
  const [showChart, setShowChart] = useState(true);
  const [bookChartMetric, setBookChartMetric] = useState('grouped'); // 'grouped' | 'rate'

  const handleSaveNewBook = async () => {
    if (!newBook.title || !newBook.publisher) return;
    setIsSaving(true);
    try {
      const bookSubjects = newBook.subjects
        .filter(s => s.name.trim() !== '' && s.testCount > 0)
        .map(s => ({ id: s.id, name: s.name }));
      if (bookSubjects.length === 0) bookSubjects.push({ id: 'genel', name: 'Genel' });

      const createdBook = await addTrackedBook({
        title: newBook.title,
        publisher: newBook.publisher,
        optionCount: newBook.optionCount || defaultOptionCount,
        subjects: bookSubjects
      });
      const testPromises = [];
      const testIds = [];

      newBook.subjects.forEach(subject => {
        if (subject.name.trim() === '' || subject.testCount <= 0) return;
        for (let i = 1; i <= subject.testCount; i++) {
          testPromises.push(
            addTrackedBookTest(createdBook.id, { subjectId: subject.id, name: `Test ${i}`, questionCount: subject.questionsPerTest, isOpenEnded: false })
              .then(test => testIds.push(test.id))
          );
        }
      });

      await Promise.all(testPromises);
      await addHomework({
        title: `${newBook.title} (Kendi Eklediğim)`,
        isBookAssignment: true, bookId: createdBook.id,
        targetType: 'student', targetIds: [studentId], tests: testIds
      });

      setIsAddModalOpen(false);
      setNewBook({ title: '', publisher: '', subjects: [{ id: 'sub_1', name: '', testCount: 20, questionsPerTest: 20 }] });
    } catch (e) { console.error('Failed to add book', e); }
    finally { setIsSaving(false); }
  };

  const { data: curData } = useCurriculum();

  const bookAssignments = useMemo(() => {
    return homeworks.filter(hw => {
      if (!hw.isBookAssignment) return false;
      return isHomeworkForStudent(hw, currentUser, curData?.grades);
    });
  }, [homeworks, currentUser, curData?.grades]);

  const studentIdStr = String(studentId || '');
  const studentUuidStr = String(toUUID(studentId) || '');

  const studentSubmissions = useMemo(() =>
    submissions.filter(s => {
      const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr) || (studentUuidStr && toUUID(s.studentId) === studentUuidStr);
      return isMatchStudent && s.status !== 'in_progress' && s.status !== 'draft';
    })
    , [submissions, studentIdStr, studentUuidStr]);

  const assignedBooks = useMemo(() => {
    const bookMap = {};

    bookAssignments.forEach(hw => {
      let book = books.find(b => String(b.id) === String(hw.bookId) && b.bookType !== 'exam');
      if (!book && hw.title) {
        book = books.find(b => b.bookType !== 'exam' && (hw.title.includes(b.title) || b.title.includes(hw.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim())));
      }
      if (!book && Array.isArray(hw.tests) && hw.tests.length > 0) {
        const matchedBt = bookTests.find(bt => hw.tests.includes(bt.id) || (toUUID(bt.id) && hw.tests.includes(toUUID(bt.id))));
        if (matchedBt) {
          book = books.find(b => String(b.id) === String(matchedBt.bookId) && b.bookType !== 'exam');
        }
      }
      if (!book) return;

      if (!bookMap[book.id]) {
        bookMap[book.id] = { ...book, assignedHomeworks: [], allAssignedTestIds: new Set(), allSolvedTestIds: new Set() };
      }

      bookMap[book.id].assignedHomeworks.push(hw);

      let hwTestIdsRaw = [];
      const hasTestDueDates = hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0;

      if (hasTestDueDates) {
        // Kitap takibinden tarih girilmiş testler: Sadece tarihi girilen testler görünsün
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
          if (field === undefined || field === null) return;
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
        const dueDate = new Date(hw.dueDate);
        if (!bookMap[book.id].targetDueDate || dueDate > bookMap[book.id].targetDueDate) bookMap[book.id].targetDueDate = dueDate;
      }
    });

    Object.values(bookMap).forEach(b => {
      b.totalAssignedTests = b.allAssignedTestIds.size;
      b.totalSolvedTests = Math.min(b.allSolvedTestIds.size, b.allAssignedTestIds.size);
      if (b.targetDueDate) {
        const diff = b.targetDueDate.getTime() - new Date().getTime();
        b.remainingDays = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
      }

      const bestSubsByKey = {};
      studentSubmissions.forEach(s => {
        const candidateFields = [s.testId, s.bookTestId, s.homeworkId, s.hwId];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) candidateFields.push(...s.bookTestIds);
        let belongs = false;
        candidateFields.forEach(field => {
          if (!field) return;
          if (b.allAssignedTestIds.has(String(field))) belongs = true;
          b.assignedHomeworks.forEach(hw => {
            if (String(hw.id) === String(field) || String(toUUID(hw.id)) === String(field)) belongs = true;
          });
        });
        if (belongs) {
          const key = String(s.testId || s.bookTestId || s.id);
          const ex = bestSubsByKey[key];
          if (!ex || s.score > ex.score || (s.score === ex.score && new Date(s.submittedAt || 0) > new Date(ex.submittedAt || 0))) bestSubsByKey[key] = s;
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
      b.successRate = (totalCorrect + totalWrong + totalBlank) > 0
        ? Math.round((totalCorrect / (totalCorrect + totalWrong + totalBlank)) * 100) : 0;
      b.progressPct = b.totalAssignedTests > 0
        ? Math.round((b.totalSolvedTests / b.totalAssignedTests) * 100) : 0;
    });

    return Object.values(bookMap);
  }, [bookAssignments, books, studentSubmissions, bookTests]);

  const overallStats = useMemo(() => {
    let totalD = 0, totalY = 0, totalB = 0, totalAssigned = 0, totalSolved = 0;
    assignedBooks.forEach(b => {
      totalD += b.totalCorrect || 0;
      totalY += b.totalWrong || 0;
      totalB += b.totalBlank || 0;
      totalAssigned += b.totalAssignedTests || 0;
      totalSolved += b.totalSolvedTests || 0;
    });
    const totalQ = totalD + totalY + totalB;
    return {
      totalD, totalY, totalB,
      successRate: totalQ > 0 ? Math.round((totalD / totalQ) * 100) : 0,
      progressRate: totalAssigned > 0 ? Math.round((totalSolved / totalAssigned) * 100) : 0,
      totalAssigned, totalSolved,
      totalBooks: assignedBooks.length,
      completedBooks: assignedBooks.filter(b => b.progressPct >= 100).length,
    };
  }, [assignedBooks]);

  /* ── filter + sort ─── */
  const displayedBooks = useMemo(() => {
    let list = assignedBooks.filter(b => b.title?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (sortBy === 'progress') list = [...list].sort((a, b) => b.progressPct - a.progressPct);
    else if (sortBy === 'title') list = [...list].sort((a, b) => a.title?.localeCompare(b.title));
    else if (sortBy === 'success') list = [...list].sort((a, b) => b.successRate - a.successRate);
    return list;
  }, [assignedBooks, searchQuery, sortBy]);

  /* ── Bar chart data ─── */
  const chartData = useMemo(() =>
    assignedBooks.map(b => {
      const d = b.totalCorrect || 0;
      const y = b.totalWrong || 0;
      const bl = b.totalBlank || 0;
      const totalQ = d + y + bl;
      const rate = b.successRate || (totalQ > 0 ? Math.round((d / totalQ) * 100) : 0);

      return {
        id: b.id,
        name: b.title?.length > 20 ? b.title.slice(0, 18) + '…' : b.title,
        fullName: b.title,
        Doğru: d,
        Yanlış: y,
        Boş: bl,
        rate: rate,
        totalQ: totalQ,
        progress: b.progressPct || 0,
        solvedTests: b.totalSolvedTests || 0,
        totalAssignedTests: b.totalAssignedTests || 0
      };
    })
    , [assignedBooks]);

  /* ════════════════════════
     RENDER
  ════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(244, 63, 94, 0.05) 0%, transparent 45%), #f8fafc', padding: '1.5rem 1.25rem', fontFamily: "'Inter', sans-serif", color: '#0f172a' }}>
      <div style={{ width: '100%', maxWidth: '100%', margin: 0 }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 99, padding: '0.3rem 0.9rem', marginBottom: 10 }}>
              <Map size={14} color="#3b82f6" />
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1d4ed8', letterSpacing: '0.05em' }}>KİTAP HARİTASI</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
              Kitaplarım ve İlerlemem 📚
            </h1>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.92rem', fontWeight: 600 }}>
              Atanan kitapları adım adım çöz, başarı oranını izle ve hedeflerine ulaş! 🚀
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{ padding: '0.75rem 1.4rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 900, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <Plus size={18} /> Kendi Kitabını Ekle
          </button>
        </div>

        {/* ── STAT CARDS ── */}
        {assignedBooks.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 12, marginBottom: 20 }}>
              <StatCard icon={<BookOpen />} label="Toplam Kitap" value={overallStats.totalBooks} iconBg="#eff6ff" iconColor="#3b82f6" sub={`${overallStats.completedBooks} tamamlandı`} />
              <StatCard icon={<Target />}   label="Genel Başarı" value={`%${overallStats.successRate}`} iconBg="#f0fdf4" iconColor="#10b981" sub={`${overallStats.totalD} doğru`} />
              <StatCard icon={<Activity />} label="Test İlerlemesi" value={`%${overallStats.progressRate}`} iconBg="#f5f3ff" iconColor="#8b5cf6" sub={`${overallStats.totalSolved}/${overallStats.totalAssigned} test`} />
              <StatCard icon={<CheckCircle2 />} label="Tamamlanan" value={overallStats.totalSolved} iconBg="#ecfdf5" iconColor="#059669" sub="test çözüldü" />
              <StatCard icon={<Trophy />} label="Toplam Doğru" value={overallStats.totalD} iconBg="#fffbeb" iconColor="#d97706" />
              <StatCard icon={<Zap />} label="Toplam Yanlış" value={overallStats.totalY} iconBg="#fff1f2" iconColor="#e11d48" />
            </div>

            {/* ── CHART PANEL ── */}
            <div style={{ background: '#ffffff', borderRadius: 20, border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', marginBottom: 22, overflow: 'hidden' }}>
              <div
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.4rem', borderBottom: showChart ? '1px solid #f1f5f9' : 'none', flexWrap: 'wrap', gap: 10 }}
              >
                <div
                  onClick={() => setShowChart(c => !c)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: '1rem', color: '#0f172a', cursor: 'pointer' }}
                >
                  <BarChart2 size={20} color="#6366f1" /> Kitaplara Göre Soru Dağılımı
                  <ChevronRight size={18} color="#64748b" style={{ transform: showChart ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>

                {showChart && (
                  <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <button
                      onClick={() => setBookChartMetric('grouped')}
                      style={{
                        padding: '0.35rem 0.8rem',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: bookChartMetric === 'grouped' ? '#6366f1' : 'transparent',
                        color: bookChartMetric === 'grouped' ? '#ffffff' : '#64748b',
                        boxShadow: bookChartMetric === 'grouped' ? '0 2px 8px rgba(99,102,241,0.25)' : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      📊 Soru Dağılımı (D / Y / B)
                    </button>
                    <button
                      onClick={() => setBookChartMetric('rate')}
                      style={{
                        padding: '0.35rem 0.8rem',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: bookChartMetric === 'rate' ? '#6366f1' : 'transparent',
                        color: bookChartMetric === 'rate' ? '#ffffff' : '#64748b',
                        boxShadow: bookChartMetric === 'rate' ? '0 2px 8px rgba(99,102,241,0.25)' : 'none',
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
                  {/* Interactive Mini Book Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
                    {chartData.map((item, idx) => {
                      const rateColor = item.rate >= 70 ? '#10b981' : item.rate >= 50 ? '#f59e0b' : item.totalQ === 0 ? '#94a3b8' : '#ef4444';
                      const rateBg = item.rate >= 70 ? '#f0fdf4' : item.rate >= 50 ? '#fffbeb' : item.totalQ === 0 ? '#f8fafc' : '#fff1f2';
                      const rateBorder = item.rate >= 70 ? '#bbf7d0' : item.rate >= 50 ? '#fde68a' : item.totalQ === 0 ? '#e2e8f0' : '#fecdd3';

                      const totalQ = item.totalQ || 0;
                      const pctD = totalQ > 0 ? ((item.Doğru || 0) / totalQ) * 100 : 0;
                      const pctY = totalQ > 0 ? ((item.Yanlış || 0) / totalQ) * 100 : 0;
                      const pctB = totalQ > 0 ? ((item.Boş || 0) / totalQ) * 100 : 0;

                      return (
                        <div
                          key={idx}
                          onClick={() => item.id && navigate(`/student/books/${item.id}`)}
                          style={{
                            background: rateBg,
                            border: `1.5px solid ${rateBorder}`,
                            borderRadius: '1rem',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                            cursor: item.id ? 'pointer' : 'default',
                            transition: 'all 0.18s ease'
                          }}
                          title={`${item.fullName} detaylarına gitmek için tıkla`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.fullName}
                            </span>
                            <span style={{ fontSize: '0.92rem', fontWeight: 900, color: rateColor }}>
                              %{item.rate}
                            </span>
                          </div>

                          {/* Multi-segment mini progress bar */}
                          <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 1 }}>
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

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                            <span>%{item.progress} İlerleme</span>
                            <span style={{ display: 'flex', gap: 6, fontWeight: 800 }}>
                              <span style={{ color: '#10b981' }}>{item.Doğru}D</span>
                              <span style={{ color: '#ef4444' }}>{item.Yanlış}Y</span>
                              <span style={{ color: '#64748b' }}>{item.Boş}B</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recharts Bar Chart */}
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="booksCorrectGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                          </linearGradient>
                          <linearGradient id="booksWrongGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fb7185" stopOpacity={1} />
                            <stop offset="100%" stopColor="#e11d48" stopOpacity={0.9} />
                          </linearGradient>
                          <linearGradient id="booksBlankGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#cbd5e1" stopOpacity={0.85} />
                            <stop offset="100%" stopColor="#64748b" stopOpacity={0.65} />
                          </linearGradient>
                          <linearGradient id="booksRateGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.9} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#ffffff', fontWeight: 800 }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#c7d2fe', fontWeight: 700 }} tickFormatter={v => bookChartMetric === 'rate' ? `%${v}` : v} domain={bookChartMetric === 'rate' ? [0, 100] : ['auto', 'auto']} />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ background: '#0f172a', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.22)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontWeight: 800, fontSize: '0.82rem', color: '#ffffff' }}
                          formatter={(value, name, props) => [
                            bookChartMetric === 'rate' ? `%${value} Başarı` : `${value} Soru`,
                            name
                          ]}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.8rem', fontWeight: 800 }} />

                        {bookChartMetric === 'grouped' ? (
                          <>
                            <Bar dataKey="Doğru" name="🟢 Doğru" fill="url(#booksCorrectGrad)" radius={[8, 8, 2, 2]} />
                            <Bar dataKey="Yanlış" name="🔴 Yanlış" fill="url(#booksWrongGrad)" radius={[8, 8, 2, 2]} />
                            <Bar dataKey="Boş" name="⚪ Boş" fill="url(#booksBlankGrad)" radius={[8, 8, 2, 2]} />
                            <Bar dataKey="Doğru" name="🟢 Doğru" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Yanlış" name="🔴 Yanlış" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Boş" name="⚪ Boş" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                          </>
                        ) : (
                          <Bar dataKey="rate" name="🎯 Başarı Oranı (%)" fill="#6366f1" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, idx) => {
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
          </>
        )}

        {/* ── SEARCH + SORT ── */}
        {assignedBooks.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Kitap ara..."
                style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: '0.84rem', fontWeight: 700, background: '#ffffff', outline: 'none', color: '#0f172a', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, background: '#ffffff', padding: 4, borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
              {[
                { key: 'progress', label: '📊 İlerleme' },
                { key: 'success',  label: '🏆 Başarı' },
                { key: 'title',    label: '🔤 A-Z' },
              ].map(s => (
                <button key={s.key} onClick={() => setSortBy(s.key)} style={{ padding: '0.4rem 0.85rem', borderRadius: 8, border: 'none', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer', background: sortBy === s.key ? '#eff6ff' : 'transparent', color: sortBy === s.key ? '#1d4ed8' : '#64748b', whiteSpace: 'nowrap' }}>
                  {s.label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b' }}>{displayedBooks.length} kitap</span>
          </div>
        )}

        {/* ── BOOK GRID ── */}
        {assignedBooks.length === 0 ? (
          booksLoading ? (
            <div style={{ background: '#ffffff', borderRadius: 20, padding: '4rem 2rem', textAlign: 'center', border: '1.5px solid #e2e8f0' }}>
              <div style={{ width: 44, height: 44, border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontWeight: 800, color: '#64748b' }}>Kitaplar yükleniyor…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: 20, padding: '5rem 2rem', textAlign: 'center', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 90, height: 90, background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1.5px solid #bfdbfe' }}>
                <BookOpen size={40} color="#3b82f6" />
              </div>
              <h2 style={{ margin: '0 0 8px', color: '#0f172a', fontWeight: 900 }}>Henüz Atanmış Kitap Yok</h2>
              <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: '0.92rem' }}>Öğretmenin sana bir kitap atadığında burada görünecek.</p>
              <button onClick={() => setIsAddModalOpen(true)} style={{ padding: '0.75rem 1.6rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                <Plus size={16} /> Kendi Kitabını Ekle
              </button>
            </div>
          )
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
            {displayedBooks.map((book, bookIdx) => {
              const pal = palette(bookIdx);
              const isCompleted = book.progressPct >= 100;
              const pct = book.progressPct;
              const urgentDue = book.remainingDays !== undefined && book.remainingDays <= 3;

              return (
                <div
                  key={book.id}
                  onClick={() => navigate(`/student/books/${book.id}`)}
                  style={{
                    background: '#ffffff',
                    borderRadius: 20,
                    border: isCompleted ? '2px solid #86efac' : '1.5px solid #e2e8f0',
                    padding: '1.4rem',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: isCompleted ? '0 4px 20px rgba(16, 185, 129, 0.1)' : '0 4px 16px -2px rgba(0,0,0,0.03)',
                    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isCompleted ? '0 4px 20px rgba(16, 185, 129, 0.1)' : '0 4px 16px -2px rgba(0,0,0,0.03)'; }}
                >
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${pal.from}, ${pal.to})`, position: 'absolute', top: 0, left: 0, right: 0 }} />

                  {isCompleted ? (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={11} fill="#16a34a" color="#16a34a" /> TAMAMLANDI
                    </div>
                  ) : urgentDue ? (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 900 }}>
                      ⚡ {book.remainingDays} gün kaldı
                    </div>
                  ) : book.remainingDays !== undefined ? (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 900 }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{book.remainingDays} gün
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16, marginTop: 8 }}>
                    <div style={{ width: 60, height: 84, borderRadius: 12, background: `linear-gradient(160deg, ${pal.from}, ${pal.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${pal.shadow}`, flexShrink: 0 }}>
                      <BookMarked size={28} color="#ffffff" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                      <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', lineHeight: 1.25, marginBottom: 4, paddingRight: book.remainingDays !== undefined || isCompleted ? 80 : 0 }}>
                        {book.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>{book.publisher}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {(book.subjects || []).slice(0, 3).map((s, i) => (
                          <span key={i} style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.2rem 0.55rem', fontSize: '0.68rem', fontWeight: 800 }}>{s.name}</span>
                        ))}
                        {(book.subjects || []).length > 3 && (
                          <span style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.2rem 0.55rem', fontSize: '0.68rem', fontWeight: 800 }}>+{(book.subjects || []).length - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', borderRadius: 16, padding: '1rem', marginBottom: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Test İlerlemesi</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{book.totalSolvedTests} / {book.totalAssignedTests} test</div>
                      </div>
                      <div style={{ position: 'relative', width: 56, height: 56 }}>
                        <CircularProgress pct={pct} size={56} stroke={5} color={isCompleted ? '#10b981' : pal.to} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.74rem', fontWeight: 900, color: isCompleted ? '#10b981' : '#0f172a' }}>
                          %{pct}
                        </div>
                      </div>
                    </div>

                    <div style={{ height: 7, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: isCompleted ? '#10b981' : `linear-gradient(90deg, ${pal.from}, ${pal.to})`, borderRadius: 99, transition: 'width 0.7s ease' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
                    {[
                      { label: 'Doğru',  value: book.totalCorrect, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                      { label: 'Yanlış', value: book.totalWrong,   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                      { label: 'Boş',    value: book.totalBlank,   color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
                      { label: 'Başarı', value: `%${book.successRate}`, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '0.45rem 0.3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.62rem', color: s.color, fontWeight: 900, textTransform: 'uppercase' }}>{s.label}</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/student/books/${book.id}`); }}
                    style={{ width: '100%', padding: '0.75rem', background: isCompleted ? '#f1f5f9' : `linear-gradient(135deg, ${pal.from}, ${pal.to})`, color: isCompleted ? '#334155' : 'white', border: isCompleted ? '1.5px solid #cbd5e1' : 'none', borderRadius: 12, fontWeight: 900, fontSize: '0.86rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: isCompleted ? 'none' : `0 4px 14px ${pal.shadow}`, transition: 'all 0.2s ease' }}
                  >
                    {isCompleted ? '📋 Haritayı Görüntüle' : '▶ Kitaba Devam Et'} <ArrowRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ height: '2.5rem' }} />
      </div>

      {/* ══════════════════════
          ADD BOOK MODAL
      ══════════════════════ */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', padding: '1rem' }}>
          <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: 20, width: '100%', maxWidth: 480, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Kendi Kitabını Ekle</h2>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Çalışmak istediğin kitabı kaydet ve ilerlemeni takip et</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Kitap Adı', key: 'title', placeholder: 'Örn: TYT Matematik Soru Bankası' },
                { label: 'Yayınevi', key: 'publisher', placeholder: 'Örn: 3D Yayınları' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>{field.label}</label>
                  <input
                    type="text"
                    value={newBook[field.key]}
                    onChange={e => setNewBook(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700, outline: 'none', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>
                  Optik Form Seçenek Sayısı (Seviye)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 0.8rem', borderRadius: 10, border: `1.5px solid ${newBook.optionCount === 4 ? '#3b82f6' : '#e2e8f0'}`, background: newBook.optionCount === 4 ? '#eff6ff' : '#f8fafc', cursor: 'pointer' }}>
                    <input
                      type="radio" name="studentBookOptionCount" value={4}
                      checked={newBook.optionCount === 4}
                      onChange={() => setNewBook(p => ({ ...p, optionCount: 4 }))}
                      style={{ accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>4 Seçenek (A-D)</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Ortaokul / LGS</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 0.8rem', borderRadius: 10, border: `1.5px solid ${newBook.optionCount === 5 ? '#3b82f6' : '#e2e8f0'}`, background: newBook.optionCount === 5 ? '#eff6ff' : '#f8fafc', cursor: 'pointer' }}>
                    <input
                      type="radio" name="studentBookOptionCount" value={5}
                      checked={newBook.optionCount === 5}
                      onChange={() => setNewBook(p => ({ ...p, optionCount: 5 }))}
                      style={{ accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>5 Seçenek (A-E)</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Lise / YKS</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
                  Dersler / Bölümler
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {newBook.subjects.map((subj, idx) => (
                    <div key={subj.id} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                      <input
                        type="text" value={subj.name} placeholder={`Ders ${idx + 1}`}
                        onChange={e => { const s = [...newBook.subjects]; s[idx].name = e.target.value; setNewBook({ ...newBook, subjects: s }); }}
                        style={{ flex: 2, padding: '0.6rem 0.75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, outline: 'none', background: '#ffffff', color: '#0f172a' }}
                      />
                      <input
                        type="number" min="1" value={subj.testCount} title="Test Sayısı"
                        onChange={e => { const s = [...newBook.subjects]; s[idx].testCount = Number(e.target.value); setNewBook({ ...newBook, subjects: s }); }}
                        style={{ width: 62, padding: '0.6rem 0.5rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, outline: 'none', textAlign: 'center', background: '#ffffff', color: '#0f172a' }}
                      />
                      <input
                        type="number" min="1" value={subj.questionsPerTest} title="Test başına soru"
                        onChange={e => { const s = [...newBook.subjects]; s[idx].questionsPerTest = Number(e.target.value); setNewBook({ ...newBook, subjects: s }); }}
                        style={{ width: 62, padding: '0.6rem 0.5rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, outline: 'none', textAlign: 'center', background: '#ffffff', color: '#0f172a' }}
                      />
                      <button
                        onClick={() => { const s = newBook.subjects.filter((_, i) => i !== idx); setNewBook({ ...newBook, subjects: s }); }}
                        disabled={newBook.subjects.length <= 1}
                        style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: newBook.subjects.length > 1 ? '#fee2e2' : '#f1f5f9', color: newBook.subjects.length > 1 ? '#ef4444' : '#cbd5e1', cursor: newBook.subjects.length > 1 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 4, fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>
                    <span style={{ flex: 2 }}>Ders Adı</span>
                    <span style={{ width: 62, textAlign: 'center' }}>Test Sayısı</span>
                    <span style={{ width: 62, textAlign: 'center' }}>Soru/Test</span>
                    <span style={{ width: 34 }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewBook(p => ({ ...p, subjects: [...p.subjects, { id: `sub_${Date.now()}`, name: '', testCount: 20, questionsPerTest: 20 }] }))}
                    style={{ padding: '0.55rem', background: '#eff6ff', color: '#2563eb', border: '1.5px dashed #bfdbfe', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 4 }}
                  >
                    <Plus size={14} /> Yeni Ders Ekle
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveNewBook}
              disabled={isSaving || !newBook.title || !newBook.publisher || newBook.subjects.every(s => !s.name)}
              style={{ padding: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: '0.9rem', cursor: (isSaving || !newBook.title || !newBook.publisher) ? 'not-allowed' : 'pointer', opacity: (isSaving || !newBook.title || !newBook.publisher) ? 0.65 : 1, boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}
            >
              {isSaving ? '⏳ Harita Oluşturuluyor…' : '🗺️ Kitabı Haritama Ekle'}
            </button>
          </div>
          <style>{`@keyframes scaleIn { from { transform: scale(0.93) translateY(10px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }`}</style>
        </div>
      )}
    </div>
  );
}