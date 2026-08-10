import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCoaching } from '../context/CoachingContext';
import { BookOpen, Map, ArrowRight, BarChart2, Star, Plus, X, ClipboardList, TrendingUp, Pencil, Trash2, LayoutGrid, List } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toUUID } from '../services/supabaseService';

// Debug flag - set to true to see matching details in console while diagnosing progress issues
const DEBUG_PROGRESS = false;

const DEFAULT_SUBJECTS = {
  'Türkçe': { d: '', y: '', b: '', net: '' },
  'Matematik': { d: '', y: '', b: '', net: '' },
  'Fen Bilimleri': { d: '', y: '', b: '', net: '' },
  'İngilizce': { d: '', y: '', b: '', net: '' },
  'Sosyal Bilgiler/İnkılap Tarihi': { d: '', y: '', b: '', net: '' },
  'Din Kültürü ve Ahlak Bilgisi': { d: '', y: '', b: '', net: '' }
};

export default function StudentExamsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { homeworks = [], addHomework } = useHomework();
  const { books = [], bookTests = [], isLoading: booksLoading, addTrackedBook, addTrackedBookTest } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();
  const [isSaving, setIsSaving] = useState(false);

  const studentId = currentUser?.id;
  const grade = currentUser?.grade;
  const gradeId = currentUser?.gradeId;
  const className = currentUser?.className;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', publisher: '', subjects: [{ id: 'sub_1', name: '', testCount: 20, questionsPerTest: 20 }] });


  const handleSaveNewBook = async () => {
    if (!newBook.title || !newBook.publisher) return;
    setIsSaving(true);
    try {
      const bookSubjects = newBook.subjects
         .filter(s => s.name.trim() !== '' && s.testCount > 0)
         .map(s => ({ id: s.id, name: s.name }));
         
      if (bookSubjects.length === 0) {
        bookSubjects.push({ id: 'genel', name: 'Genel' });
      }

      const createdBook = await addTrackedBook({
        title: newBook.title,
        publisher: newBook.publisher,
        subjects: bookSubjects,
        bookType: 'exam'
      });

      const testPromises = [];
      const testIds = [];
      
      newBook.subjects.forEach(subject => {
        if (subject.name.trim() === '' || subject.testCount <= 0) return;
        
        for (let i = 1; i <= subject.testCount; i++) {
          testPromises.push(
            addTrackedBookTest(createdBook.id, {
              subjectId: subject.id,
              name: `Test ${i}`,
              questionCount: subject.questionsPerTest,
              isOpenEnded: false
            }).then(test => testIds.push(test.id))
          );
        }
      });
      
      await Promise.all(testPromises);

      await addHomework({
        title: `${newBook.title} (Kendi Eklediğim)`,
        isBookAssignment: true,
        bookId: createdBook.id,
        targetType: 'student',
        targetIds: [studentId],
        tests: testIds
      });

      setIsAddModalOpen(false);
      setNewBook({ title: '', publisher: '', subjects: [{ id: 'sub_1', name: '', testCount: 20, questionsPerTest: 20 }] });
    } catch (e) {
      console.error('Failed to add book', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter book assignments
  const bookAssignments = useMemo(() => {
    return homeworks.filter(hw => {
      if (!hw.isBookAssignment) return false;
      if (hw.targetType === 'student' && hw.targetIds?.includes(studentId)) return true;
      if ((hw.targetType === 'class' || hw.targetType === 'grade') &&
          (hw.targetIds?.includes(grade) || hw.targetIds?.includes(gradeId) || hw.targetIds?.includes(className))) {
        return true;
      }
      return false;
    });
  }, [homeworks, studentId, grade, gradeId, className]);

  // Pre-filter this student's non-draft/non-in-progress submissions once
  const studentSubmissions = useMemo(() => {
    return submissions.filter(s =>
      String(s.studentId) === String(studentId) &&
      s.status !== 'in_progress' &&
      s.status !== 'draft'
    );
  }, [submissions, studentId]);

  // Group by bookId
  const assignedBooks = useMemo(() => {
    const bookMap = {};

    bookAssignments.forEach(hw => {
      const book = books.find(b => String(b.id) === String(hw.bookId) && b.bookType === 'exam');
      if (!book) return;

      if (!bookMap[book.id]) {
        bookMap[book.id] = {
          ...book,
          assignedHomeworks: [],
          allAssignedTestIds: new Set(),
          allSolvedTestIds: new Set(),
        };
      }

      bookMap[book.id].assignedHomeworks.push(hw);

      // ---- Build a normalized set of every possible ID form for this homework's tests ----
      let hwTestIdsRaw = hw.tests || [];
      if (hw.title && hw.title.includes('(Tüm Kitap Görevi)')) {
         const allBookTests = bookTests.filter(bt => String(bt.bookId) === String(book.id));
         hwTestIdsRaw = allBookTests.map(bt => bt.id);
      }
      hwTestIdsRaw.forEach(id => bookMap[book.id].allAssignedTestIds.add(String(id)));

      // Also allow matching directly on the homework id itself (some flows store
      // submissions against the homework, not the individual test)
      const hwIdSet = new Set([String(hw.id)]);
      const hwUUID = toUUID(hw.id);
      if (hwUUID) hwIdSet.add(String(hwUUID));

      studentSubmissions.forEach(s => {
        // Normalize every possible id field on the submission, both raw and UUID form
        const candidateFields = [s.testId, s.bookTestId, s.homeworkId, s.hwId];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
          candidateFields.push(...s.bookTestIds);
        }

        let isHwSolved = false;
        const matchedTestIds = new Set();

        candidateFields.forEach(field => {
          if (field === undefined || field === null) return;
          const raw = String(field);
          const uuid = toUUID(field);

          if (hwIdSet.has(raw) || (uuid && hwIdSet.has(String(uuid)))) {
            isHwSolved = true;
          }

          hwTestIdsRaw.forEach(id => {
            const strId = String(id);
            const uuidId = toUUID(id);
            if (strId === raw || (uuid && String(uuidId) === String(uuid))) {
              matchedTestIds.add(strId);
            }
          });
        });

        if (isHwSolved) {
          hwTestIdsRaw.forEach(id => bookMap[book.id].allSolvedTestIds.add(id));
        } else {
          matchedTestIds.forEach(id => bookMap[book.id].allSolvedTestIds.add(id));
        }
      });


      // Calculate earliest due date among unfinished assignments
      if (hw.dueDate) {
        const dueDate = new Date(hw.dueDate);
        if (!bookMap[book.id].targetDueDate || dueDate > bookMap[book.id].targetDueDate) {
          bookMap[book.id].targetDueDate = dueDate;
        }
      }
    });

    Object.values(bookMap).forEach(b => {
      b.totalAssignedTests = b.allAssignedTestIds.size;
      b.totalSolvedTests = b.allSolvedTestIds.size;
      
      // Guard against solved count exceeding assigned count due to overlapping homeworks
      if (b.totalSolvedTests > b.totalAssignedTests) {
        b.totalSolvedTests = b.totalAssignedTests;
      }
      if (b.targetDueDate) {
        const diff = b.targetDueDate.getTime() - new Date().getTime();
        b.remainingDays = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
      }

      // Calculate best submission stats
      let totalCorrect = 0;
      let totalWrong = 0;
      let totalBlank = 0;
      
      const bestSubsByKey = {};
      
      studentSubmissions.forEach(s => {
        const candidateFields = [s.testId, s.bookTestId, s.homeworkId, s.hwId];
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) candidateFields.push(...s.bookTestIds);
        
        let belongsToThisBook = false;
        candidateFields.forEach(field => {
           if (!field) return;
           const raw = String(field);
           if (b.allAssignedTestIds.has(raw)) belongsToThisBook = true;
           b.assignedHomeworks.forEach(hw => {
              if (String(hw.id) === raw || String(toUUID(hw.id)) === raw) belongsToThisBook = true;
           });
        });
        
        if (belongsToThisBook) {
           const key = String(s.testId || s.bookTestId || s.id);
           const existing = bestSubsByKey[key];
           if (!existing || (s.score > existing.score) || (s.score === existing.score && new Date(s.submittedAt || 0) > new Date(existing.submittedAt || 0))) {
             bestSubsByKey[key] = s;
           }
        }
      });
      
      Object.values(bestSubsByKey).forEach(sub => {
         totalCorrect += sub.correctCount || 0;
         totalWrong += sub.wrongCount || 0;
         totalBlank += sub.blankCount || 0;
      });
      
      b.totalCorrect = totalCorrect;
      b.totalWrong = totalWrong;
      b.totalBlank = totalBlank;
    });

    return Object.values(bookMap);
  }, [bookAssignments, books, studentSubmissions]);


  const { mockExams = [], addMockExam, updateMockExam, deleteMockExam } = useCoaching();
  const [chartMetric, setChartMetric] = useState('Toplam Net');
  const [viewMode, setViewMode] = useState('table');
  const [showMockModal, setShowMockModal] = useState(false);
  const [editingMockId, setEditingMockId] = useState(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [netRule, setNetRule] = useState('4');
  const [newManualMock, setNewManualMock] = useState({ title: '', date: new Date().toISOString().split('T')[0], subjects: DEFAULT_SUBJECTS });

  const handleOpenMockModal = (mock = null) => {
    if (mock) {
      setEditingMockId(mock.id);
      setNewManualMock({
        title: mock.title || '',
        date: mock.date || mock.createdAt?.slice(0, 10) || new Date().toISOString().split('T')[0],
        subjects: mock.scores || {}
      });
    } else {
      setEditingMockId(null);
      setNewManualMock({ title: '', date: new Date().toISOString().split('T')[0], subjects: DEFAULT_SUBJECTS });
    }
    setShowMockModal(true);
  };

  const handleDeleteMock = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Bu denemeyi silmek istediğinize emin misiniz?')) {
      try {
        await deleteMockExam(id);
        window.location.reload();
      } catch (err) { console.error(err); }
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
      const updatedSubjects = { ...prev.subjects };
      Object.keys(updatedSubjects).forEach(subjName => {
        const d = Number(updatedSubjects[subjName].d) || 0;
        const y = Number(updatedSubjects[subjName].y) || 0;
        if (newRule === '0') {
           updatedSubjects[subjName].net = d;
        } else {
           const penalty = Number(newRule);
           updatedSubjects[subjName].net = penalty > 0 ? (d - (y / penalty)).toFixed(2) : d;
        }
      });
      return { ...prev, subjects: updatedSubjects };
    });
  };

  const updateSubjectScore = (subjName, field, value) => {
    setNewManualMock(prev => {
      const currentSubject = prev.subjects[subjName] || { d: '', y: '', b: '', net: '' };
      const updatedSubject = { ...currentSubject, [field]: value };
      
      if (field === 'd' || field === 'y') {
        const d = Number(updatedSubject.d) || 0;
        const y = Number(updatedSubject.y) || 0;
        if (netRule === '0') {
           updatedSubject.net = d;
        } else {
           const penalty = Number(netRule);
           updatedSubject.net = penalty > 0 ? parseFloat((d - (y / penalty)).toFixed(2)) : d;
        }
      }
      return { ...prev, subjects: { ...prev.subjects, [subjName]: updatedSubject } };
    });
  };

  const removeSubjectFromMock = (subjName) => {
    setNewManualMock(prev => {
      const copy = { ...prev };
      delete copy.subjects[subjName];
      return copy;
    });
  };

  const totalMockD = Object.values(newManualMock.subjects).reduce((sum, s) => sum + (Number(s.d) || 0), 0);
  const totalMockY = Object.values(newManualMock.subjects).reduce((sum, s) => sum + (Number(s.y) || 0), 0);
  const totalMockB = Object.values(newManualMock.subjects).reduce((sum, s) => sum + (Number(s.b) || 0), 0);
  const totalMockNet = Object.values(newManualMock.subjects).reduce((sum, s) => sum + (Number(s.net) || 0), 0);

  const handleSaveMock = async (e) => {
    e.preventDefault();
    if (!newManualMock.title) return;
    try {
      if (editingMockId) {
        await updateMockExam(editingMockId, { title: newManualMock.title, date: newManualMock.date, totalNet: totalMockNet, scores: newManualMock.subjects });
      } else {
        await addMockExam({ studentId, title: newManualMock.title, date: newManualMock.date, totalNet: totalMockNet, scores: newManualMock.subjects });
      }
      setShowMockModal(false);
      setEditingMockId(null);
      setNewManualMock({ title: '', date: new Date().toISOString().split('T')[0], subjects: DEFAULT_SUBJECTS });
      window.location.reload();
    } catch(err) { console.error(err); }
  };

  const studentMockExams = useMemo(() => mockExams.filter(m => String(m.studentId) === String(studentId)), [mockExams, studentId]);

  const combinedExamsList = useMemo(() => {
    const arr = [];
    assignedBooks.forEach(b => {
      const pct = b.totalAssignedTests > 0 ? Math.round((b.totalSolvedTests / b.totalAssignedTests) * 100) : 0;
      const penaltyRatio = /lgs|bursluluk/i.test(b.title) ? 3 : 4;
      const net = (b.totalCorrect || 0) - ((b.totalWrong || 0) / penaltyRatio);
      arr.push({
        id: b.id,
        type: 'book',
        title: b.title,
        date: b.assignedHomeworks?.[0]?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        status: pct >= 100 ? 'Tamamlandı' : `%${pct} İlerleme`,
        d: b.totalCorrect || 0,
        y: b.totalWrong || 0,
        b: b.totalBlank || 0,
        net: parseFloat(net.toFixed(2)),
        original: b,
        isCompleted: pct >= 100,
        remainingDays: b.remainingDays
      });
    });
    studentMockExams.forEach(m => {
      const mScores = m.scores || {};
      const d = Object.values(mScores).reduce((sum, s) => sum + (Number(s.d) || 0), 0);
      const y = Object.values(mScores).reduce((sum, s) => sum + (Number(s.y) || 0), 0);
      const b = Object.values(mScores).reduce((sum, s) => sum + (Number(s.b) || 0), 0);
      arr.push({
        id: m.id,
        type: 'mock',
        title: m.title,
        date: m.date || m.createdAt?.slice(0, 10),
        status: 'Manuel Deneme',
        d, y, b,
        net: Number(m.totalNet || 0),
        original: m,
        isCompleted: true,
        remainingDays: undefined
      });
    });
    return arr.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [assignedBooks, studentMockExams]);

  // Compute allExamsList by combining mockExams and completed exam books
  const allExamsList = useMemo(() => {
    const list = [];
    
    // 1. Add mock exams
    studentMockExams.forEach(mock => {
      // Sadece onaylanmış olanlar (veya koç atamamışsa hepsi) chart'a yansıyabilir
      if (mock.approvalStatus === 'rejected') return;
      
      const mScores = mock.scores || {};
      const d = Object.values(mScores).reduce((sum, s) => sum + (Number(s.d) || 0), 0);
      const y = Object.values(mScores).reduce((sum, s) => sum + (Number(s.y) || 0), 0);
      const b = Object.values(mScores).reduce((sum, s) => sum + (Number(s.b) || 0), 0);
      
      list.push({
        id: mock.id,
        title: mock.title,
        date: mock.date || mock.createdAt?.slice(0, 10),
        totalCorrect: d,
        totalWrong: y,
        totalEmpty: b,
        totalNet: mock.totalNet,
        isManualMock: true,
        scores: mock.scores || {}
      });
    });

    // 2. Add completed book assignments (Fiziki Denemeler)
    assignedBooks.forEach(book => {
      // Sadece tamamlanmış denemeler
      const pct = book.totalAssignedTests > 0 ? Math.round((book.totalSolvedTests / book.totalAssignedTests) * 100) : 0;
      if (pct < 100) return;

      const penaltyRatio = /lgs|bursluluk/i.test(book.title) ? 3 : 4;
      const net = (book.totalCorrect || 0) - ((book.totalWrong || 0) / penaltyRatio);
      
      // Calculate subject-specific nets from the book's subjects and test submissions
      const bestSubs = [];
      studentSubmissions.forEach(sub => {
         const testId = sub.testId || sub.bookTestId || sub.id;
         if (book.allAssignedTestIds.has(String(testId))) {
             bestSubs.push(sub);
         }
      });

      list.push({
        id: book.id,
        title: book.title,
        date: book.assignedHomeworks?.[0]?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        totalCorrect: book.totalCorrect,
        totalWrong: book.totalWrong,
        totalEmpty: book.totalBlank,
        totalNet: parseFloat(net.toFixed(2)),
        isManualMock: false,
        bestSubs: bestSubs,
        subjects: book.subjects
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [studentMockExams, assignedBooks, studentSubmissions]);

  // Compute overallStats
  const overallStats = useMemo(() => {
    let totalD = 0, totalY = 0, totalB = 0, totalNet = 0;
    let maxNet = 0;
    
    // Subject distribution
    const subMap = {};

    allExamsList.forEach(exam => {
       totalD += (exam.totalCorrect || 0);
       totalY += (exam.totalWrong || 0);
       totalB += (exam.totalEmpty || 0);
       totalNet += parseFloat(exam.totalNet || 0);
       if (parseFloat(exam.totalNet || 0) > maxNet) {
         maxNet = parseFloat(exam.totalNet || 0);
       }

       if (exam.isManualMock && exam.scores) {
         Object.entries(exam.scores).forEach(([sName, sc]) => {
           if (!subMap[sName]) subMap[sName] = { name: sName, net: 0, count: 0 };
           subMap[sName].net += parseFloat(sc.net || 0);
           subMap[sName].count += 1;
         });
       } else if (!exam.isManualMock && exam.bestSubs) {
         const penaltyRatio = /lgs|bursluluk/i.test(exam.title) ? 3 : 4;
         exam.bestSubs.forEach(sub => {
            const testId = sub.testId || sub.bookTestId || sub.id;
            const bookTest = bookTests.find(t => String(t.id) === String(testId));
            if (bookTest && exam.subjects) {
              const subject = exam.subjects.find(s => String(s.id) === String(bookTest.subjectId));
              const subjName = subject ? subject.name : 'Genel';
              if (!subMap[subjName]) subMap[subjName] = { name: subjName, net: 0, count: 0 };
              
              const c = sub.correctCount || 0;
              const w = sub.wrongCount || 0;
              const n = c - (w / penaltyRatio);
              
              subMap[subjName].net += n;
              subMap[subjName].count += 1;
            }
         });
       }
    });

    const totalExams = allExamsList.length;

    return {
      totalExams,
      avgNet: totalExams > 0 ? (totalNet / totalExams).toFixed(1) : 0,
      maxNet: maxNet.toFixed(1),
      lastExamDate: totalExams > 0 ? allExamsList[0].date : '-',
      totalD, totalY, totalB,
      subjects: Object.values(subMap).sort((a,b) => b.net - a.net)
    };
  }, [allExamsList, bookTests]);

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <BookOpen size={28} /> Denemelerim
            </h1>
            <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
              Sana atanan veya kendi eklediğin fiziki deneme sınavları ve ilerleme haritan.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#8b5cf6', color: '#8b5cf6', background: 'white', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer' }} onClick={() => handleOpenMockModal()}>
              <ClipboardList size={18} /> Manuel Sonuç Ekle
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}
            >
              <Plus size={20} /> Kendi Denemeni Ekle
            </button>
          </div>
        </div>
      </header>

      {/* STATISTICS BANNER */}
      {allExamsList.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Toplam Deneme', value: overallStats.totalExams, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Ortalama Net', value: overallStats.avgNet, color: '#10b981', bg: '#ecfdf5' },
            { label: 'En Yüksek Net', value: overallStats.maxNet, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Son Deneme', value: overallStats.lastExamDate, color: '#8b5cf6', bg: '#f5f3ff' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, padding: '0.85rem', borderRadius: '0.85rem', textAlign: 'center', border: '1px solid rgba(255,255,255,1)' }}>
              <div style={{ fontWeight: 900, fontSize: '1.3rem', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* TREND CHART */}
      {allExamsList.length > 0 && (
        <div className="card glass" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={24} /> Net Gelişim Grafiği
            </h2>
            <select 
              value={chartMetric} 
              onChange={(e) => setChartMetric(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#334155', background: 'white', cursor: 'pointer', outline: 'none' }}
            >
              <option value="Toplam Net">Genel (Toplam Net)</option>
              {overallStats.subjects.map(s => (
                <option key={s.name} value={s.name}>{s.name} Net</option>
              ))}
            </select>
          </div>
          <div style={{ width: '100%', height: 280, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...allExamsList].reverse().map((exam, i) => {
                const penaltyRatio = /lgs|bursluluk/i.test(exam.title) ? 3 : 4;
                let net = 0;
                if (chartMetric === 'Toplam Net') {
                   net = (exam.totalCorrect || 0) - ((exam.totalWrong || 0) / penaltyRatio);
                } else {
                   if (exam.isManualMock) {
                      if (exam.scores && exam.scores[chartMetric]) {
                         const sc = exam.scores[chartMetric];
                         net = sc.net !== undefined && sc.net !== null ? parseFloat(sc.net) : ((sc.correct || 0) - ((sc.wrong || 0) / penaltyRatio));
                      }
                   } else {
                      let c = 0, w = 0;
                      exam.bestSubs?.forEach(sub => {
                        const testId = sub.testId || sub.bookTestId || sub.id;
                        const bookTest = bookTests.find(t => String(t.id) === String(testId));
                        if (bookTest && exam.subjects) {
                          const subject = exam.subjects.find(s => String(s.id) === String(bookTest.subjectId));
                          const subjName = subject ? subject.name : 'Genel';
                          if (subjName === chartMetric) {
                            c += sub.correctCount || 0;
                            w += sub.wrongCount || 0;
                          }
                        }
                      });
                      net = c - (w / penaltyRatio);
                   }
                }
                
                const shortName = exam.title.length > 15 ? exam.title.substring(0, 13) + '..' : exam.title;
                return { name: shortName, Net: parseFloat(net.toFixed(2)), fullName: exam.title, date: exam.date };
              })}>
                <defs>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} dx={-10} domain={['dataMin - 2', 'dataMax + 5']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '0.85rem', fontWeight: 800, background: 'rgba(255,255,255,0.95)' }}
                  formatter={(value) => [`${value} Net`, 'Skor']}
                  labelFormatter={(label, payload) => {
                    const full = payload?.[0]?.payload?.fullName || label;
                    const date = payload?.[0]?.payload?.date || '';
                    return `${full} ${date ? `(${date})` : ''}`;
                  }}
                />
                <Area type="monotone" dataKey="Net" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorNet)" activeDot={{ r: 8, fill: '#7c3aed', stroke: '#fff', strokeWidth: 3, boxShadow: '0 0 10px rgba(124,58,237,0.5)' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}


      {assignedBooks.length === 0 && studentMockExams.length === 0 ? (
        booksLoading ? (
          <div className="card glass" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <h3 style={{ marginTop: '1rem', color: '#64748b' }}>Denemeler Yükleniyor...</h3>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div className="card glass" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ background: '#f1f5f9', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#94a3b8' }}>
              <BookOpen size={40} />
            </div>
            <h2 style={{ color: '#475569', margin: '0 0 0.5rem 0' }}>Henüz Sana Atanmış Bir Deneme Yok</h2>
            <p style={{ color: '#64748b', margin: 0 }}>Öğretmenlerin sana bir deneme atadığında burada görünecek.</p>
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <div style={{ background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.5rem', display: 'flex', gap: '0.25rem' }}>
              <button 
                onClick={() => setViewMode('table')} 
                style={{ background: viewMode === 'table' ? 'white' : 'transparent', color: viewMode === 'table' ? '#6366f1' : '#64748b', border: 'none', padding: '0.5rem', borderRadius: '0.4rem', cursor: 'pointer', boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center' }}
                title="Liste Görünümü"
              >
                <List size={20} />
              </button>
              <button 
                onClick={() => setViewMode('grid')} 
                style={{ background: viewMode === 'grid' ? 'white' : 'transparent', color: viewMode === 'grid' ? '#6366f1' : '#64748b', border: 'none', padding: '0.5rem', borderRadius: '0.4rem', cursor: 'pointer', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center' }}
                title="Kart Görünümü"
              >
                <LayoutGrid size={20} />
              </button>
            </div>
          </div>
          
          {viewMode === 'table' ? (
            <div className="card glass" style={{ overflowX: 'auto', padding: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '1rem', color: '#475569', fontWeight: 800, fontSize: '0.9rem' }}>Sınav Adı</th>
                    <th style={{ padding: '1rem', color: '#475569', fontWeight: 800, fontSize: '0.9rem' }}>Tarih</th>
                    <th style={{ padding: '1rem', color: '#475569', fontWeight: 800, fontSize: '0.9rem' }}>Tür/Durum</th>
                    <th style={{ padding: '1rem', color: '#10b981', fontWeight: 800, fontSize: '0.9rem', textAlign: 'center' }}>Doğru</th>
                    <th style={{ padding: '1rem', color: '#ef4444', fontWeight: 800, fontSize: '0.9rem', textAlign: 'center' }}>Yanlış</th>
                    <th style={{ padding: '1rem', color: '#64748b', fontWeight: 800, fontSize: '0.9rem', textAlign: 'center' }}>Boş</th>
                    <th style={{ padding: '1rem', color: '#7c3aed', fontWeight: 900, fontSize: '0.9rem', textAlign: 'center' }}>Toplam Net</th>
                    <th style={{ padding: '1rem', color: '#475569', fontWeight: 800, fontSize: '0.9rem', textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedExamsList.map((exam, idx) => (
                    <tr key={`${exam.type}-${exam.id}`} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'transparent' : '#f8fafc', transition: 'background 0.2s' }} className="hover-row">
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {exam.type === 'mock' ? <ClipboardList size={18} color="#8b5cf6" /> : <BookOpen size={18} color={exam.isCompleted ? '#10b981' : '#f59e0b'} />}
                          {exam.title}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.9rem' }}>{exam.date}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 800, background: exam.type === 'mock' ? '#f5f3ff' : (exam.isCompleted ? '#ecfdf5' : '#fffbeb'), color: exam.type === 'mock' ? '#7c3aed' : (exam.isCompleted ? '#10b981' : '#d97706') }}>
                          {exam.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, color: '#059669' }}>{exam.d}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, color: '#b91c1c' }}>{exam.y}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, color: '#64748b' }}>{exam.b}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, color: '#7c3aed', fontSize: '1.1rem' }}>{exam.net}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {exam.type === 'book' ? (
                          <button onClick={() => navigate(`/student/books/${exam.id}`)} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '0.4rem 1rem', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                            {exam.isCompleted ? 'İncele' : 'Devam Et'}
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={(e) => { e.stopPropagation(); handleOpenMockModal(exam.original); }} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer' }} title="Düzenle">
                              <Pencil size={16} />
                            </button>
                            <button onClick={(e) => handleDeleteMock(e, exam.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer' }} title="Sil">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <style>{`.hover-row:hover { background: #f1f5f9 !important; }`}</style>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {assignedBooks.map(book => {
                const pct = book.totalAssignedTests > 0 ? Math.round((book.totalSolvedTests / book.totalAssignedTests) * 100) : 0;
                const isCompleted = pct >= 100;

            return (
              <div
                key={book.id}
                className="card glass hover-lift"
                style={{
                  padding: '1.5rem',
                  cursor: 'pointer',
                  border: isCompleted ? '2px solid #10b981' : '1px solid rgba(0,0,0,0.08)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => navigate(`/student/books/${book.id}`)}
              >
                {isCompleted ? (
                  <div style={{ position: 'absolute', top: 0, right: 0, background: '#10b981', color: 'white', padding: '0.4rem 1rem', borderBottomLeftRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Star size={14} fill="white" /> TAMAMLANDI
                  </div>
                ) : book.remainingDays !== undefined ? (
                  <div style={{ position: 'absolute', top: 0, right: 0, background: book.remainingDays < 7 ? '#ef4444' : '#f59e0b', color: 'white', padding: '0.4rem 1rem', borderBottomLeftRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Kalan Süre: {book.remainingDays} Gün
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: 64, height: 85, background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <BookOpen size={28} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', color: '#1e293b', fontWeight: 800, lineHeight: 1.2 }}>
                      {book.title}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{book.publisher}</div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 800 }}>
                    <span style={{ color: '#475569' }}>İlerleme Durumu</span>
                    <span style={{ color: isCompleted ? '#10b981' : 'var(--color-primary)' }}>% {pct}</span>
                  </div>
                  <div style={{ background: '#e2e8f0', height: 8, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, background: isCompleted ? '#10b981' : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))', height: '100%', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>
                    <span>Çözülen: {book.totalSolvedTests}</span>
                    <span>Toplam: {book.totalAssignedTests} Test</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', marginTop: '0.75rem', textAlign: 'center' }}>
                     <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800 }}>Doğru</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#059669' }}>{book.totalCorrect}</div>
                     </div>
                     <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 800 }}>Yanlış</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#b91c1c' }}>{book.totalWrong}</div>
                     </div>
                     <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>Boş</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#64748b' }}>{book.totalBlank}</div>
                     </div>
                     <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 800 }}>Başarı</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#4f46e5' }}>
                          %{(book.totalCorrect + book.totalWrong + book.totalBlank) > 0 ? Math.round((book.totalCorrect / (book.totalCorrect + book.totalWrong + book.totalBlank)) * 100) : 0}
                        </div>
                     </div>
                  </div>
                </div>

                <button
                  className="btn"
                  style={{
                    width: '100%',
                    background: isCompleted ? '#f1f5f9' : 'var(--color-primary)',
                    color: isCompleted ? '#475569' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    border: 'none',
                    fontWeight: 800
                  }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/student/books/${book.id}`); }}
                >
                  {isCompleted ? 'Haritayı Görüntüle' : 'Denemeye Devam Et'} <ArrowRight size={18} />
                </button>
              </div>
            );
          })}
          
          {/* Render Manual Mock Exams */}
          {studentMockExams.map(mock => {
            const mScores = mock.scores || {};
            const d = Object.values(mScores).reduce((sum, s) => sum + (Number(s.d) || 0), 0);
            const y = Object.values(mScores).reduce((sum, s) => sum + (Number(s.y) || 0), 0);
            const b = Object.values(mScores).reduce((sum, s) => sum + (Number(s.b) || 0), 0);
            
            return (
            <div key={mock.id} className="card glass hover-lift" style={{ padding: '1.5rem', border: '1px solid #c7d2fe', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ width: 64, height: 85, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                  <ClipboardList size={28} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', color: '#1e293b', fontWeight: 800, lineHeight: 1.2 }}>{mock.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenMockModal(mock); }} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Düzenle">
                        <Pencil size={16} />
                      </button>
                      <button onClick={(e) => handleDeleteMock(e, mock.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Sil">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Tarih: {mock.date || mock.createdAt?.slice(0, 10)}</div>
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem', textAlign: 'center' }}>
                  Toplam Net: <span style={{ color: '#7c3aed', fontSize: '1.2rem' }}>{Number(mock.totalNet || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem', textAlign: 'center' }}>
                  <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800 }}>Doğru</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#059669' }}>{d}</div>
                  </div>
                  <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #fca5a5' }}>
                    <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 800 }}>Yanlış</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#b91c1c' }}>{y}</div>
                  </div>
                  <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>Boş</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#64748b' }}>{b}</div>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
            </div>
          )}
        </div>
      )}

      {/* MANUAL MOCK MODAL */}
      {showMockModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#1e293b' }}>
                {editingMockId ? 'Deneme Sonucunu Düzenle' : 'Manuel Deneme Sonucu Ekle'}
              </h2>
              <button onClick={() => setShowMockModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveMock} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 800, fontSize: '0.85rem' }}>Net Hesaplama Kuralı</label>
                <select className="input" value={netRule} onChange={handleNetRuleChange}>
                  <option value="4">4 Yanlış 1 Doğruyu Götürür (YKS/TYT/AYT)</option>
                  <option value="3">3 Yanlış 1 Doğruyu Götürür (LGS vb.)</option>
                  <option value="0">Yanlışlar Doğruları Götürmez</option>
                </select>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Doğru ve yanlışları girdiğinizde netler bu kurala göre otomatik hesaplanacaktır.</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 800, fontSize: '0.85rem' }}>Sınav Adı (Örn: Özdebir TYT 1)</label>
                  <input required type="text" className="input" placeholder="Deneme Adı" value={newManualMock.title} onChange={e => setNewManualMock(prev => ({...prev, title: e.target.value}))} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 800, fontSize: '0.85rem' }}>Tarih</label>
                  <input required type="date" className="input" value={newManualMock.date} onChange={e => setNewManualMock(prev => ({...prev, date: e.target.value}))} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 800, fontSize: '0.85rem' }}>Ders Ekle (Örn: Türkçe, Matematik)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" className="input" placeholder="Ders Adı" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubjectToMock(); }}} />
                  <button type="button" className="btn" onClick={addSubjectToMock}>Ekle</button>
                </div>
              </div>

              {Object.keys(newManualMock.subjects).length > 0 && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 32px', gap: '0.5rem', fontWeight: 800, color: '#475569', fontSize: '0.8rem', textAlign: 'center' }}>
                    <div style={{ textAlign: 'left' }}>Ders</div>
                    <div>Doğru</div>
                    <div>Yanlış</div>
                    <div>Boş</div>
                    <div>Net</div>
                    <div></div>
                  </div>
                  {Object.entries(newManualMock.subjects).map(([sName, scores]) => (
                    <div key={sName} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 32px', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.85rem', wordBreak: 'break-word' }}>{sName}</div>
                      <input type="number" className="input" style={{ padding: '0.5rem', textAlign: 'center', minWidth: 0 }} placeholder="D" value={scores.d} onChange={e => updateSubjectScore(sName, 'd', e.target.value)} />
                      <input type="number" className="input" style={{ padding: '0.5rem', textAlign: 'center', minWidth: 0 }} placeholder="Y" value={scores.y} onChange={e => updateSubjectScore(sName, 'y', e.target.value)} />
                      <input type="number" className="input" style={{ padding: '0.5rem', textAlign: 'center', minWidth: 0 }} placeholder="B" value={scores.b} onChange={e => updateSubjectScore(sName, 'b', e.target.value)} />
                      <input type="number" className="input" style={{ padding: '0.5rem', textAlign: 'center', minWidth: 0 }} placeholder="N" value={scores.net} onChange={e => updateSubjectScore(sName, 'net', e.target.value)} step="0.25" />
                      <button type="button" onClick={() => removeSubjectFromMock(sName)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: '100%', height: '32px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
                    </div>
                  ))}
                  <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '1rem', marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 32px', gap: '0.5rem', fontWeight: 900, color: '#0f172a', textAlign: 'center', alignItems: 'center' }}>
                    <div style={{ textAlign: 'left' }}>TOPLAM</div>
                    <div style={{ color: '#10b981' }}>{totalMockD}</div>
                    <div style={{ color: '#ef4444' }}>{totalMockY}</div>
                    <div style={{ color: '#64748b' }}>{totalMockB}</div>
                    <div style={{ color: '#8b5cf6', fontSize: '1.2rem' }}>{totalMockNet}</div>
                    <div></div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn" style={{ width: '100%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <ClipboardList size={20} /> Sonucu Kaydet ve Gönder
              </button>
            </form>
          </div>
        </div>
      )}
      {/* NEW BOOK MODAL */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#1e293b' }}>Kendi Denemeni Ekle</h2>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Deneme Adı</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook(prev => ({...prev, title: e.target.value}))} placeholder="Örn: 1. Türkiye Geneli Denemesi" style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Yayın / Deneme Türü</label>
                <input type="text" value={newBook.publisher} onChange={e => setNewBook(prev => ({...prev, publisher: e.target.value}))} placeholder="Örn: Özdebir TYT" style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                  Dersler / Bölümler
                </label>
                {newBook.subjects.map((subj, index) => (
                  <div key={subj.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 2 }}>
                      {index === 0 && <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', color: '#64748b' }}>Ders Adı</label>}
                      <input type="text" value={subj.name} onChange={e => {
                        const newSubs = [...newBook.subjects];
                        newSubs[index].name = e.target.value;
                        setNewBook({...newBook, subjects: newSubs});
                      }} placeholder="Örn: Matematik" style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {index === 0 && <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', color: '#64748b' }}>Test Sayısı</label>}
                      <input type="number" min="1" value={subj.testCount} onChange={e => {
                        const newSubs = [...newBook.subjects];
                        newSubs[index].testCount = Number(e.target.value);
                        setNewBook({...newBook, subjects: newSubs});
                      }} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {index === 0 && <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', color: '#64748b' }}>Soru (Ort.)</label>}
                      <input type="number" min="1" value={subj.questionsPerTest} onChange={e => {
                        const newSubs = [...newBook.subjects];
                        newSubs[index].questionsPerTest = Number(e.target.value);
                        setNewBook({...newBook, subjects: newSubs});
                      }} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {index === 0 && <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', color: 'transparent' }}>X</label>}
                      <button onClick={() => {
                        const newSubs = newBook.subjects.filter((_, i) => i !== index);
                        setNewBook({...newBook, subjects: newSubs});
                      }} style={{ padding: '0.6rem', background: newBook.subjects.length > 1 ? '#fee2e2' : '#f1f5f9', color: newBook.subjects.length > 1 ? '#ef4444' : '#cbd5e1', border: 'none', borderRadius: '0.5rem', cursor: newBook.subjects.length > 1 ? 'pointer' : 'not-allowed', marginTop: index === 0 ? '0' : '0' }} disabled={newBook.subjects.length <= 1}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => setNewBook(prev => ({...prev, subjects: [...prev.subjects, { id: `sub_${Date.now()}`, name: '', testCount: 20, questionsPerTest: 20 }] }))}
                  style={{ padding: '0.5rem', background: '#f8fafc', color: '#3b82f6', border: '1px dashed #bfdbfe', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.25rem' }}
                >
                  <Plus size={16} /> Yeni Ders Ekle
                </button>
              </div>
            </div>

            <button 
              onClick={handleSaveNewBook} 
              disabled={isSaving || !newBook.title || !newBook.publisher || newBook.subjects.every(s => !s.name)}
              style={{ width: '100%', padding: '1rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 800, fontSize: '1rem', cursor: (isSaving || !newBook.title || !newBook.publisher || newBook.subjects.every(s => !s.name)) ? 'not-allowed' : 'pointer', opacity: (isSaving || !newBook.title || !newBook.publisher || newBook.subjects.every(s => !s.name)) ? 0.7 : 1, marginTop: '0.5rem' }}
            >
              {isSaving ? 'Harita Oluşturuluyor...' : 'Kitabı Haritama Ekle'}
            </button>
          </div>
          <style>{`@keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
        </div>
      )}
    </div>
  );
}