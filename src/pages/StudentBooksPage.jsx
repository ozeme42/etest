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
function StatCard({ icon, label, value, gradient, shadow, border, sub }) {
  return (
    <div style={{
      background: gradient || 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,27,75,0.9) 100%)',
      borderRadius: 20,
      padding: '1.1rem 1.3rem',
      border: border || '1.5px solid rgba(255,255,255,0.15)',
      boxShadow: shadow || '0 8px 24px rgba(0,0,0,0.35)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.18)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        {React.cloneElement(icon, { size: 22, color: '#ffffff' })}
      </div>
      <div>
        <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#ffffff', lineHeight: 1, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{value}</div>
        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginTop: 2 }}>{sub}</div>}
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
    assignedBooks.map(b => ({
      name: b.title?.length > 18 ? b.title.slice(0, 16) + '…' : b.title,
      Doğru: b.totalCorrect,
      Yanlış: b.totalWrong,
      Boş: b.totalBlank,
    }))
    , [assignedBooks]);

  /* ════════════════════════
     RENDER
  ════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.22) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.18) 0%, transparent 45%), radial-gradient(ellipse at 50% 85%, rgba(14, 165, 233, 0.18) 0%, transparent 50%), linear-gradient(180deg, #070a12 0%, #0d1224 35%, #13112c 70%, #070a12 100%)', padding: '1.5rem 1.25rem', fontFamily: "'Inter', sans-serif", color: '#f8fafc' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 28 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.22)', border: '1.5px solid rgba(165,180,252,0.35)', borderRadius: 99, padding: '0.3rem 0.9rem', marginBottom: 10 }}>
              <Map size={14} color="#a5b4fc" />
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#c7d2fe', letterSpacing: '0.05em' }}>KİTAP HARİTASI</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.2, textShadow: '0 2px 10px rgba(0,0,0,0.35)' }}>
              Kitaplarım ve İlerlemem 📚
            </h1>
            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', fontWeight: 600 }}>
              Atanan kitapları adım adım çöz, başarı oranını izle ve hedeflerine ulaş! 🚀
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{ padding: '0.75rem 1.4rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 900, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', boxShadow: '0 6px 20px rgba(16,185,129,0.4)', transition: 'transform 0.15s' }}
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
              <StatCard icon={<BookOpen />} label="Toplam Kitap" value={overallStats.totalBooks} gradient="linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)" shadow="0 8px 24px rgba(67, 56, 202, 0.4)" border="1.5px solid rgba(165, 180, 252, 0.35)" sub={`${overallStats.completedBooks} tamamlandı`} />
              <StatCard icon={<Target />}   label="Genel Başarı" value={`%${overallStats.successRate}`} gradient="linear-gradient(135deg, #064e3b 0%, #059669 100%)" shadow="0 8px 24px rgba(5, 150, 105, 0.4)" border="1.5px solid rgba(110, 231, 183, 0.35)" sub={`${overallStats.totalD} doğru`} />
              <StatCard icon={<Activity />} label="Test İlerlemesi" value={`%${overallStats.progressRate}`} gradient="linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)" shadow="0 8px 24px rgba(2, 132, 199, 0.4)" border="1.5px solid rgba(125, 211, 252, 0.35)" sub={`${overallStats.totalSolved}/${overallStats.totalAssigned} test`} />
              <StatCard icon={<CheckCircle2 />} label="Tamamlanan" value={overallStats.totalSolved} gradient="linear-gradient(135deg, #581c87 0%, #9333ea 100%)" shadow="0 8px 24px rgba(147, 51, 234, 0.4)" border="1.5px solid rgba(216, 180, 254, 0.35)" sub="test çözüldü" />
              <StatCard icon={<Trophy />} label="Toplam Doğru" value={overallStats.totalD} gradient="linear-gradient(135deg, #78350f 0%, #d97706 100%)" shadow="0 8px 24px rgba(217, 119, 6, 0.4)" border="1.5px solid rgba(253, 186, 116, 0.35)" />
              <StatCard icon={<Zap />} label="Toplam Yanlış" value={overallStats.totalY} gradient="linear-gradient(135deg, #831843 0%, #e11d48 100%)" shadow="0 8px 24px rgba(225, 29, 72, 0.4)" border="1.5px solid rgba(253, 164, 175, 0.35)" />
            </div>

            {/* ── CHART PANEL ── */}
            <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', backdropFilter: 'blur(20px)', borderRadius: 22, border: '1.5px solid rgba(255, 255, 255, 0.14)', boxShadow: '0 12px 36px rgba(0,0,0,0.35)', marginBottom: 22, overflow: 'hidden' }}>
              <button
                onClick={() => setShowChart(c => !c)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.4rem', background: 'none', border: 'none', cursor: 'pointer', borderBottom: showChart ? '1px solid rgba(255, 255, 255, 0.08)' : 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: '0.95rem', color: '#ffffff' }}>
                  <BarChart2 size={18} color="#818cf8" /> Kitaplara Göre Soru Dağılımı
                </div>
                <ChevronRight size={18} color="#c7d2fe" style={{ transform: showChart ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {showChart && (
                <div style={{ padding: '0 1rem 1rem' }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 14, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#c7d2fe', fontWeight: 700 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#c7d2fe', fontWeight: 600 }} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ background: '#0f172a', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontWeight: 800, fontSize: '0.82rem', color: '#ffffff' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.8rem', fontWeight: 800 }} />
                      <Bar dataKey="Doğru"  fill="#10b981" stackId="a" radius={[0, 0, 6, 6]} />
                      <Bar dataKey="Yanlış" fill="#ef4444" stackId="a" />
                      <Bar dataKey="Boş"    fill="#94a3b8" stackId="a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SEARCH + SORT ── */}
        {assignedBooks.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
              <input
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Kitap ara..."
                style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.15)', fontSize: '0.84rem', fontWeight: 700, background: 'rgba(255,255,255,0.07)', outline: 'none', color: '#ffffff', boxSizing: 'border-box', backdropFilter: 'blur(8px)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.06)', padding: 5, borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
              {[
                { key: 'progress', label: '📊 İlerleme' },
                { key: 'success',  label: '🏆 Başarı' },
                { key: 'title',    label: '🔤 A-Z' },
              ].map(s => (
                <button key={s.key} onClick={() => setSortBy(s.key)} style={{ padding: '0.4rem 0.85rem', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer', background: sortBy === s.key ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'transparent', color: sortBy === s.key ? 'white' : 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', boxShadow: sortBy === s.key ? '0 2px 8px rgba(99,102,241,0.4)' : 'none' }}>
                  {s.label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>{displayedBooks.length} kitap</span>
          </div>
        )}

        {/* ── BOOK GRID ── */}
        {assignedBooks.length === 0 ? (
          booksLoading ? (
            <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 27, 75, 0.85) 100%)', borderRadius: 22, padding: '4rem 2rem', textAlign: 'center', border: '1.5px solid rgba(255,255,255,0.12)' }}>
              <div style={{ width: 44, height: 44, border: '4px solid rgba(255,255,255,0.15)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>Kitaplar yükleniyor…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 27, 75, 0.85) 100%)', borderRadius: 24, padding: '5rem 2rem', textAlign: 'center', border: '1.5px solid rgba(255,255,255,0.14)', boxShadow: '0 12px 36px rgba(0,0,0,0.35)' }}>
              <div style={{ width: 90, height: 90, background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1.5px solid rgba(255,255,255,0.2)' }}>
                <BookOpen size={40} color="#c7d2fe" />
              </div>
              <h2 style={{ margin: '0 0 8px', color: '#ffffff', fontWeight: 900 }}>Henüz Atanmış Kitap Yok</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 20px', fontSize: '0.92rem' }}>Öğretmenin sana bir kitap atadığında burada görünecek.</p>
              <button onClick={() => setIsAddModalOpen(true)} style={{ padding: '0.75rem 1.6rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
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
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 24,
                    border: isCompleted ? '2px solid rgba(34, 197, 94, 0.6)' : '1.5px solid rgba(255, 255, 255, 0.14)',
                    padding: '1.4rem',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: isCompleted ? '0 8px 30px rgba(34, 197, 94, 0.25)' : '0 12px 36px rgba(0,0,0,0.35)',
                    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 14px 40px ${pal.shadow}`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isCompleted ? '0 8px 30px rgba(34, 197, 94, 0.25)' : '0 12px 36px rgba(0,0,0,0.35)'; }}
                >
                  {/* Top accent line */}
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${pal.from}, ${pal.to})`, position: 'absolute', top: 0, left: 0, right: 0 }} />

                  {/* Badge */}
                  {isCompleted ? (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: 'linear-gradient(135deg,#059669,#10b981)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 10px rgba(16,185,129,0.4)', border: '1px solid rgba(255,255,255,0.3)' }}>
                      <Star size={11} fill="white" /> TAMAMLANDI
                    </div>
                  ) : urgentDue ? (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: 'linear-gradient(135deg,#e11d48,#f43f5e)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 900, boxShadow: '0 2px 10px rgba(225,29,72,0.4)', border: '1px solid rgba(255,255,255,0.3)' }}>
                      ⚡ {book.remainingDays} gün kaldı
                    </div>
                  ) : book.remainingDays !== undefined ? (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: 'linear-gradient(135deg,#d97706,#f59e0b)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 900, boxShadow: '0 2px 10px rgba(217,119,6,0.4)', border: '1px solid rgba(255,255,255,0.3)' }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{book.remainingDays} gün
                    </div>
                  ) : null}

                  {/* Book cover + title */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16, marginTop: 8 }}>
                    <div style={{ width: 60, height: 84, borderRadius: 12, background: `linear-gradient(160deg, ${pal.from}, ${pal.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px ${pal.shadow}`, flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.3)' }}>
                      <BookMarked size={28} color="rgba(255,255,255,0.95)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                      <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#ffffff', lineHeight: 1.25, marginBottom: 4, paddingRight: book.remainingDays !== undefined || isCompleted ? 80 : 0 }}>
                        {book.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{book.publisher}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {(book.subjects || []).slice(0, 3).map((s, i) => (
                          <span key={i} style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 800 }}>{s.name}</span>
                        ))}
                        {(book.subjects || []).length > 3 && (
                          <span style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 800 }}>+{(book.subjects || []).length - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress section */}
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', borderRadius: 18, padding: '1rem', marginBottom: 14, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Test İlerlemesi</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', marginTop: 2 }}>{book.totalSolvedTests} / {book.totalAssignedTests} test</div>
                      </div>
                      <div style={{ position: 'relative', width: 56, height: 56 }}>
                        <CircularProgress pct={pct} size={56} stroke={5} color={isCompleted ? '#10b981' : pal.to} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.74rem', fontWeight: 900, color: isCompleted ? '#4ade80' : '#ffffff' }}>
                          %{pct}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 7, background: 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: isCompleted ? '#10b981' : `linear-gradient(90deg, ${pal.from}, ${pal.to})`, borderRadius: 99, transition: 'width 0.7s ease', boxShadow: `0 0 8px ${pal.from}` }} />
                    </div>
                  </div>

                  {/* D/Y/B mini stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
                    {[
                      { label: 'Doğru',  value: book.totalCorrect, color: '#4ade80', bg: 'rgba(5, 150, 105, 0.25)', border: 'rgba(52, 211, 153, 0.35)' },
                      { label: 'Yanlış', value: book.totalWrong,   color: '#f87171', bg: 'rgba(225, 29, 72, 0.25)', border: 'rgba(253, 164, 175, 0.35)' },
                      { label: 'Boş',    value: book.totalBlank,   color: '#cbd5e1', bg: 'rgba(255, 255, 255, 0.08)', border: 'rgba(255, 255, 255, 0.15)' },
                      { label: 'Başarı', value: `%${book.successRate}`, color: '#ffffff', bg: 'rgba(99, 102, 241, 0.25)', border: 'rgba(165, 180, 252, 0.35)' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '0.45rem 0.3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.62rem', color: s.color, fontWeight: 900, textTransform: 'uppercase' }}>{s.label}</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* CTA button */}
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/student/books/${book.id}`); }}
                    style={{ width: '100%', padding: '0.75rem', background: isCompleted ? 'rgba(255,255,255,0.12)' : `linear-gradient(135deg, ${pal.from}, ${pal.to})`, color: 'white', border: isCompleted ? '1.5px solid rgba(255,255,255,0.25)' : 'none', borderRadius: 14, fontWeight: 900, fontSize: '0.86rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: isCompleted ? 'none' : `0 4px 16px ${pal.shadow}`, transition: 'all 0.2s ease' }}
                  >
                    {isCompleted ? '📋 Haritayı Görüntüle' : '▶ Kitaba Devam Et'} <ArrowRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* bottom space */}
        <div style={{ height: '2.5rem' }} />
      </div>

      {/* ══════════════════════
          ADD BOOK MODAL
      ══════════════════════ */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', padding: '1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 24, width: '100%', maxWidth: 480, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 900, color: '#ffffff' }}>Kendi Kitabını Ekle</h2>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Çalışmak istediğin kitabı kaydet ve ilerlemeni takip et</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ffffff' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Kitap Adı', key: 'title', placeholder: 'Örn: TYT Matematik Soru Bankası' },
                { label: 'Yayınevi', key: 'publisher', placeholder: 'Örn: 3D Yayınları' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>{field.label}</label>
                  <input
                    type="text"
                    value={newBook[field.key]}
                    onChange={e => setNewBook(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.18)', fontSize: '0.9rem', fontWeight: 700, outline: 'none', background: 'rgba(255,255,255,0.08)', color: '#ffffff', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>
                  Optik Form Seçenek Sayısı (Seviye)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 0.8rem', borderRadius: 10, border: `1.5px solid ${newBook.optionCount === 4 ? '#818cf8' : 'rgba(255,255,255,0.15)'}`, background: newBook.optionCount === 4 ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                    <input
                      type="radio" name="studentBookOptionCount" value={4}
                      checked={newBook.optionCount === 4}
                      onChange={() => setNewBook(p => ({ ...p, optionCount: 4 }))}
                      style={{ accentColor: '#6366f1' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>4 Seçenek (A-D)</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Ortaokul / LGS</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 0.8rem', borderRadius: 10, border: `1.5px solid ${newBook.optionCount === 5 ? '#818cf8' : 'rgba(255,255,255,0.15)'}`, background: newBook.optionCount === 5 ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                    <input
                      type="radio" name="studentBookOptionCount" value={5}
                      checked={newBook.optionCount === 5}
                      onChange={() => setNewBook(p => ({ ...p, optionCount: 5 }))}
                      style={{ accentColor: '#6366f1' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>5 Seçenek (A-E)</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Lise / YKS</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  Dersler / Bölümler
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {newBook.subjects.map((subj, idx) => (
                    <div key={subj.id} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                      <input
                        type="text" value={subj.name} placeholder={`Ders ${idx + 1}`}
                        onChange={e => { const s = [...newBook.subjects]; s[idx].name = e.target.value; setNewBook({ ...newBook, subjects: s }); }}
                        style={{ flex: 2, padding: '0.6rem 0.75rem', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.18)', fontSize: '0.82rem', fontWeight: 700, outline: 'none', background: 'rgba(255,255,255,0.08)', color: '#ffffff' }}
                      />
                      <input
                        type="number" min="1" value={subj.testCount} title="Test Sayısı"
                        onChange={e => { const s = [...newBook.subjects]; s[idx].testCount = Number(e.target.value); setNewBook({ ...newBook, subjects: s }); }}
                        style={{ width: 62, padding: '0.6rem 0.5rem', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.18)', fontSize: '0.82rem', fontWeight: 700, outline: 'none', textAlign: 'center', background: 'rgba(255,255,255,0.08)', color: '#ffffff' }}
                      />
                      <input
                        type="number" min="1" value={subj.questionsPerTest} title="Test başına soru"
                        onChange={e => { const s = [...newBook.subjects]; s[idx].questionsPerTest = Number(e.target.value); setNewBook({ ...newBook, subjects: s }); }}
                        style={{ width: 62, padding: '0.6rem 0.5rem', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.18)', fontSize: '0.82rem', fontWeight: 700, outline: 'none', textAlign: 'center', background: 'rgba(255,255,255,0.08)', color: '#ffffff' }}
                      />
                      <button
                        onClick={() => { const s = newBook.subjects.filter((_, i) => i !== idx); setNewBook({ ...newBook, subjects: s }); }}
                        disabled={newBook.subjects.length <= 1}
                        style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: newBook.subjects.length > 1 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)', color: newBook.subjects.length > 1 ? '#f87171' : 'rgba(255,255,255,0.3)', cursor: newBook.subjects.length > 1 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 4, fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginTop: 2 }}>
                    <span style={{ flex: 2 }}>Ders Adı</span>
                    <span style={{ width: 62, textAlign: 'center' }}>Test Sayısı</span>
                    <span style={{ width: 62, textAlign: 'center' }}>Soru/Test</span>
                    <span style={{ width: 34 }} />
                  </div>
                  <button
                    onClick={() => setNewBook(p => ({ ...p, subjects: [...p.subjects, { id: `sub_${Date.now()}`, name: '', testCount: 20, questionsPerTest: 20 }] }))}
                    style={{ padding: '0.55rem', background: 'rgba(14,165,233,0.18)', color: '#38bdf8', border: '1.5px dashed rgba(56,189,248,0.4)', borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 4 }}
                  >
                    <Plus size={14} /> Yeni Ders Ekle
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveNewBook}
              disabled={isSaving || !newBook.title || !newBook.publisher || newBook.subjects.every(s => !s.name)}
              style={{ padding: '0.9rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 900, fontSize: '0.95rem', cursor: (isSaving || !newBook.title || !newBook.publisher) ? 'not-allowed' : 'pointer', opacity: (isSaving || !newBook.title || !newBook.publisher) ? 0.65 : 1, boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}
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