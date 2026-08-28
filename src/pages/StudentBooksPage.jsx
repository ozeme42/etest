import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { isHomeworkForStudent } from '../utils/testResolver';
import {
  BookOpen, Map as MapIcon, ArrowRight, BarChart2, Star, Plus, X, Target,
  CheckCircle2, Activity, Layers, Trophy, TrendingUp, Zap, Clock,
  ChevronRight, BookMarked, Search, Filter, RotateCcw, Award, Edit3, ClipboardList, User
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadialBarChart, RadialBar, Cell
} from 'recharts';
import { toUUID } from '../services/supabaseService';
import { isDeletedItem } from '../services/unifiedResultAdapter';
import { useTheme } from '../context/ThemeContext';
import ManualTestModal from '../components/ManualTestModal';

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
      background: 'var(--color-surface)',
      border: `1.5px solid ${border || 'var(--color-border)'}`,
      borderRadius: 16,
      padding: '1.1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: iconBg,
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: '1.2rem'
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </div>
        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2, marginTop: 2 }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: '0.72rem', color: iconColor, fontWeight: 700, marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Mini Circular Progress Bar ─── */
function CircularProgress({ pct, size = 56, stroke = 5, color = '#6366f1' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border, rgba(0,0,0,0.06))" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

export default function StudentBooksPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { currentUser } = useAuth();
  const { users = [] } = useUser();
  const { homeworks = [], addHomework } = useHomework();
  const { books = [], bookTests = [], isLoading: booksLoading, addTrackedBook, addTrackedBookTest } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();
  const { data: curData } = useCurriculum();

  const studentMembers = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const activeStudent = useMemo(() => {
    if (currentUser?.role === 'student') return currentUser;
    if (selectedStudentId) {
      const found = studentMembers.find(s => String(s.id) === String(selectedStudentId) || (toUUID(s.id) && String(toUUID(s.id)) === String(selectedStudentId)));
      if (found) return found;
    }
    return studentMembers[0] || currentUser;
  }, [currentUser, selectedStudentId, studentMembers]);

  const studentId = activeStudent?.id;
  const grade = activeStudent?.grade;
  const gradeId = activeStudent?.gradeId;
  const className = activeStudent?.className;

  // Build comprehensive ID set for active student (aliases, UUIDs, matching email/name)
  const allStudentIds = useMemo(() => {
    const ids = new Set();
    if (!activeStudent) return ids;

    const addId = (val) => {
      if (!val) return;
      const sVal = String(val).trim();
      ids.add(sVal);
      const uv = toUUID(sVal);
      if (uv) ids.add(uv);
    };

    addId(activeStudent.id);
    addId(activeStudent.student_id);
    addId(activeStudent.studentId);
    addId(activeStudent.uuid);

    const sName = String(activeStudent.name || '').trim().toLowerCase();
    const sEmail = String(activeStudent.email || '').trim().toLowerCase();

    (users || []).forEach(u => {
      const uName = String(u.name || '').trim().toLowerCase();
      const uEmail = String(u.email || '').trim().toLowerCase();
      const isNameMatch = sName && uName && sName === uName;
      const isEmailMatch = sEmail && uEmail && (sEmail === uEmail || sEmail.split('@')[0] === uEmail.split('@')[0]);
      if (isNameMatch || isEmailMatch) {
        addId(u.id);
        addId(u.student_id);
        addId(u.studentId);
      }
    });

    return ids;
  }, [activeStudent, users]);

  const defaultOptionCount = (grade && String(grade).match(/^[5-8]/)) ? 4 : 5;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManualTestModalOpen, setIsManualTestModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', publisher: '', optionCount: defaultOptionCount, subjects: [{ id: 'sub_1', name: '', testCount: 20, questionsPerTest: 20 }] });
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('progress'); // 'progress' | 'title' | 'recent'
  const [showChart, setShowChart] = useState(true);
  const [bookChartViewMode, setBookChartViewMode] = useState('books'); // 'books' | 'subjects'
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

  const bookAssignments = useMemo(() => {
    return homeworks.filter(hw => {
      if (!hw.isBookAssignment) return false;
      return isHomeworkForStudent(hw, activeStudent, curData?.grades);
    });
  }, [homeworks, activeStudent, curData?.grades]);

  const studentSubmissions = useMemo(() =>
    submissions.filter(s => {
      if (!s || isDeletedItem(s)) return false;
      const sId = String(s.studentId || s.student_id || s.userId || s.user_id || '');
      const isMatchStudent = allStudentIds.has(sId) || (toUUID(sId) && allStudentIds.has(toUUID(sId)));
      if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
      if (s.isManual && (s.approvalStatus === 'pending' || s.approvalStatus === 'rejected' || s.isApproved === false || s.status === 'pending_approval' || s.status === 'rejected')) return false;
      return true;
    })
    , [submissions, allStudentIds]);

  const assignedBooks = useMemo(() => {
    const isExamBook = (b) => {
      if (!b) return false;
      const raw = b.raw_data || {};
      if (b.id === 'tb_07kzdf_1787267196768') return true;
      if (b.title === '1.Ünite' && (b.publisher === 'CUSTOM' || !b.publisher)) return true;
      if (b.bookType === 'exam' || b.book_type === 'exam' || raw.bookType === 'exam' || b.type === 'exam') return true;
      return false;
    };
    const bookMap = {};
    const getNormKey = (b) => `${String(b.title || '').trim().toLowerCase().replace(/\s+/g, ' ')}___${String(b.publisher || '').trim().toLowerCase().replace(/\s+/g, ' ')}`;

    // 1. Add all standard / mixed books
    (books || []).filter(b => b && !isExamBook(b)).forEach(b => {
      const normK = getNormKey(b);
      if (!bookMap[normK]) {
        bookMap[normK] = { ...b, assignedHomeworks: [] };
      }
    });

    // 2. Attach any homework assignments from all homeworks (or bookAssignments)
    (homeworks || []).forEach(hw => {
      const raw = hw.raw_data || {};
      const isBookHw = hw.isBookAssignment || raw.isBookAssignment || hw.bookId || raw.bookId || hw.title?.includes('Kitap');
      if (!isBookHw) return;

      let book = (books || []).find(b => String(b.id) === String(hw.bookId || raw.bookId) && !isExamBook(b));
      if (!book && hw.title) {
        const cleanHwTitle = hw.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim().toLowerCase();
        book = (books || []).find(b => {
          const bT = String(b.title).toLowerCase().trim();
          return !isExamBook(b) && (cleanHwTitle.includes(bT) || bT.includes(cleanHwTitle));
        });
      }
      if (book) {
        const normK = getNormKey(book);
        if (!bookMap[normK]) {
          bookMap[normK] = { ...book, assignedHomeworks: [] };
        }
        bookMap[normK].assignedHomeworks.push(hw);
        if (hw.dueDate) {
          const dueDate = new Date(hw.dueDate);
          if (!bookMap[normK].targetDueDate || dueDate > bookMap[normK].targetDueDate) {
            bookMap[normK].targetDueDate = dueDate;
          }
        }
      }
    });

    // 3. Compute stats for each book with multi-level submission matching
    Object.values(bookMap).forEach(b => {
      const bId = String(b.id);
      const bUuid = String(toUUID(b.id) || '');
      const bTitle = String(b.title || '').toLowerCase().trim();

      const testsInBookRaw = (bookTests || []).filter(bt => {
        const btBId = String(bt.bookId || bt.book_id || '');
        if (btBId === bId || (bUuid && btBId === bUuid) || (toUUID(btBId) && toUUID(btBId) === bUuid)) return true;
        if (bt.bookTitle && String(bt.bookTitle).toLowerCase().trim() === bTitle) return true;
        return false;
      });

      const testsInBook = [];
      const seenTestKeys = new Set();
      testsInBookRaw.forEach(t => {
        const tKey = `${String(t.subjectId || t.subject_id || '')}_${String(t.topicId || t.topic_id || '')}_${String(t.name || '').trim().toLowerCase()}`;
        if (!seenTestKeys.has(tKey)) {
          seenTestKeys.add(tKey);
          testsInBook.push(t);
        }
      });

      // Check all assigned homeworks for total test arrays
      let maxHwTests = 0;
      (b.assignedHomeworks || []).forEach(hw => {
        const raw = hw.raw_data || {};
        const testsLen = Array.isArray(hw.tests) ? hw.tests.length : (Array.isArray(raw.tests) ? raw.tests.length : 0);
        if (testsLen > maxHwTests) maxHwTests = testsLen;
      });

      // Find all submissions associated with this book
      const matchedSubs = studentSubmissions.filter(s => {
        const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a.type === 'metadata') : (s.metadata || {});
        const sBookId = String(s.bookId || s.book_id || meta?.bookId || '');
        const sBookTitle = String(s.bookTitle || meta?.bookTitle || s.book_title || '').toLowerCase().trim();
        const sTitle = String(s.title || s.testTitle || s.test_title || meta?.testTitle || '').toLowerCase().trim();
        const cleanSTitle = sTitle.replace(/^.*?—\s*/, '').trim();
        const sTestId = String(s.bookTestId || s.testId || s.test_id || meta?.realTestId || meta?.bookTestId || '');

        const sSubj = String(s.subject || s.subjectName || meta?.subjectName || meta?.subject || '').toLowerCase().trim();

        if (sBookId && (sBookId === bId || (bUuid && sBookId === bUuid) || sBookId.includes(bId))) return true;
        if (sBookTitle && (sBookTitle === bTitle || sBookTitle.includes(bTitle) || bTitle.includes(sBookTitle))) return true;
        if (sTitle && bTitle && (sTitle.startsWith(bTitle) || sTitle.includes(bTitle))) return true;
        
        return testsInBook.some(t => {
          const tId = String(t.id);
          const tClean = tId.replace(/^bt_/, '').replace(/^q_/, '');
          const tUuid = String(toUUID(t.id) || '');
          const tName = String(t.name || '').toLowerCase().trim();

          const isDirect = (
            sTestId === tId ||
            sTestId === tClean ||
            (tUuid && sTestId === tUuid) ||
            (toUUID(sTestId) && toUUID(sTestId) === tUuid)
          );
          if (isDirect) return true;

          if (tName) {
            if (tName.includes('sayfa') || cleanSTitle.includes('sayfa')) {
              return cleanSTitle === tName || sTitle.includes(tName) || tName.includes(cleanSTitle);
            }
            const isTestNameMatch = cleanSTitle === tName || (cleanSTitle.length > 8 && (sTitle.includes(tName) || tName.includes(cleanSTitle)));
            if (isTestNameMatch) {
              const subjects = b.raw_data?.subjects || b.subjects || [];
              let sName = '';
              let topName = '';
              if (Array.isArray(subjects)) {
                const matchedSubj = subjects.find(sb => String(sb.id) === String(t.subjectId || t.subject_id));
                if (matchedSubj) {
                  sName = String(matchedSubj.name || '').toLowerCase().trim();
                  const matchedTop = (matchedSubj.topics || []).find(tp => String(tp.id) === String(t.topicId || t.topic_id));
                  if (matchedTop) topName = String(matchedTop.name || '').toLowerCase().trim();
                }
              }
              const isSubjectMatch = sName && (sTitle.includes(sName) || sSubj.includes(sName) || sName.includes(sSubj));
              if (isSubjectMatch) {
                if (topName) {
                  const isTopicMatch = sTitle.includes(topName) || topName.includes(sTitle.split('›')[1]?.split('(')[0]?.trim() || '');
                  return isTopicMatch;
                }
                return cleanSTitle === tName;
              }
            }
          }
          return false;
        });
      });

      // Calculate total test count in book
      const subjects = b.raw_data?.subjects || b.subjects || [];
      let countFromSubjects = 0;
      if (Array.isArray(subjects)) {
        subjects.forEach(sb => {
          if (sb.tests && Array.isArray(sb.tests)) countFromSubjects += sb.tests.length;
          else if (sb.topics && Array.isArray(sb.topics)) {
            sb.topics.forEach(tp => {
              if (tp.tests && Array.isArray(tp.tests)) countFromSubjects += tp.tests.length;
              else countFromSubjects += 1;
            });
          } else {
            countFromSubjects += (sb.testCount || 1);
          }
        });
      }

      const totalBookTests = Math.max(
        testsInBook.length,
        countFromSubjects,
        b.total_tests || b.totalTests || 0,
        1
      );

      let totalCorrect = 0;
      let totalWrong = 0;
      let totalBlank = 0;
      let totalSolvedTests = 0;

      // Group submissions by test (taking best score per test)
      const testSubsMap = {};
      matchedSubs.forEach(s => {
        const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a.type === 'metadata') : (s.metadata || {});
        const sTitle = String(s.title || s.testTitle || s.test_title || meta?.testTitle || '').toLowerCase().trim();
        const sSubj = String(s.subject || s.subjectName || meta?.subjectName || meta?.subject || '').toLowerCase().trim();
        const cleanSTitle = sTitle.replace(/^.*?—\s*/, '').trim();
        const sTestId = String(s.bookTestId || s.testId || s.test_id || meta?.realTestId || meta?.bookTestId || '');

        const matchingTest = testsInBook.find(t => {
          const tId = String(t.id);
          const tClean = tId.replace(/^bt_/, '').replace(/^q_/, '');
          const tUuid = String(toUUID(t.id) || '');
          const tName = String(t.name || '').toLowerCase().trim();

          const isDirect = (
            sTestId === tId ||
            sTestId === tClean ||
            (tUuid && sTestId === tUuid) ||
            (toUUID(sTestId) && toUUID(sTestId) === tUuid)
          );
          if (isDirect) return true;

          if (tName) {
            if (tName.includes('sayfa') || cleanSTitle.includes('sayfa')) {
              return cleanSTitle === tName || sTitle.includes(tName) || tName.includes(cleanSTitle);
            }
            const isTestNameMatch = cleanSTitle === tName || (cleanSTitle.length > 8 && (sTitle.includes(tName) || tName.includes(cleanSTitle)));
            if (isTestNameMatch) {
              const subjects = b.raw_data?.subjects || b.subjects || [];
              let sName = '';
              let topName = '';
              if (Array.isArray(subjects)) {
                const matchedSubj = subjects.find(sb => String(sb.id) === String(t.subjectId || t.subject_id));
                if (matchedSubj) {
                  sName = String(matchedSubj.name || '').toLowerCase().trim();
                  const matchedTop = (matchedSubj.topics || []).find(tp => String(tp.id) === String(t.topicId || t.topic_id));
                  if (matchedTop) topName = String(matchedTop.name || '').toLowerCase().trim();
                }
              }
              const isSubjectMatch = sName && (sTitle.includes(sName) || sSubj.includes(sName) || sName.includes(sSubj));
              if (isSubjectMatch) {
                if (topName) {
                  const isTopicMatch = sTitle.includes(topName) || topName.includes(sTitle.split('›')[1]?.split('(')[0]?.trim() || '');
                  return isTopicMatch;
                }
                return cleanSTitle === tName;
              }
            }
          }
          return false;
        });

        if (matchingTest) {
          const testKey = String(matchingTest.id);
          const existing = testSubsMap[testKey];
          const score = Number(s.score || s.computedScore || (s.correct_count ?? s.correctCount ?? s.correct ?? 0));
          if (!existing || score > Number(existing.score || existing.computedScore || (existing.correct_count ?? existing.correctCount ?? existing.correct ?? 0))) {
            testSubsMap[testKey] = s;
          }
        }
      });

      Object.values(testSubsMap).forEach(s => {
        totalSolvedTests++;
        totalCorrect += Number(s.correct_count ?? s.correctCount ?? s.correct ?? 0);
        totalWrong += Number(s.wrong_count ?? s.wrongCount ?? s.wrong ?? 0);
        totalBlank += Number(s.empty_count ?? s.blankCount ?? s.blank ?? 0);
      });

      if (b.targetDueDate) {
        const diff = b.targetDueDate.getTime() - new Date().getTime();
        b.remainingDays = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
      }

      b.totalAssignedTests = totalBookTests;
      b.totalBookTests = totalBookTests;
      b.totalSolvedTests = totalSolvedTests;
      b.totalCorrect = totalCorrect;
      b.totalWrong = totalWrong;
      b.totalBlank = totalBlank;

      const totalQuestions = totalCorrect + totalWrong + totalBlank;
      b.successRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      b.progressPct = totalBookTests > 0 ? Math.min(100, Math.round((totalSolvedTests / totalBookTests) * 100)) : 0;
    });

    return Object.values(bookMap);
  }, [bookAssignments, books, studentSubmissions, bookTests, homeworks, studentIdStr, studentUuidStr]);

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

  /* ── Bar chart data (Kitaplara Göre) ─── */
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

  /* ── Subject chart data (Derslere Göre) ─── */
  const subjectChartData = useMemo(() => {
    const subMap = {};

    assignedBooks.forEach(b => {
      // Ensure all declared subjects in the book are initialized
      if (b.subjects && Array.isArray(b.subjects)) {
        b.subjects.forEach(s => {
          const sName = typeof s === 'string' ? s : s?.name;
          if (sName && sName.trim() !== '' && !subMap[sName]) {
            subMap[sName] = {
              id: `sub_${sName}`,
              name: sName,
              fullName: sName,
              Doğru: 0,
              Yanlış: 0,
              Boş: 0,
              totalQ: 0,
              rate: 0,
              totalSolvedTests: 0,
              totalAssignedTests: Number(s.testCount) || 0
            };
          }
        });
      }

      const testsInBook = (bookTests || []).filter(bt => String(bt.bookId) === String(b.id));

      testsInBook.forEach(t => {
        const tIdStr = String(t.id);
        const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '');
        const tUuidStr = String(toUUID(t.id) || '');

        const subObj = (b.subjects || []).find(s => String(s.id) === String(t.subjectId) || String(s.name) === String(t.subjectName)) || { name: t.name || 'Genel' };
        let subjectName = subObj.name || t.name || 'Genel';
        if (/^test\s*\d+/i.test(subjectName) && b.subjects && b.subjects.length > 0) {
          subjectName = b.subjects[0]?.name || subjectName;
        }

        if (!subMap[subjectName]) {
          subMap[subjectName] = {
            id: `sub_${subjectName}`,
            name: subjectName,
            fullName: subjectName,
            Doğru: 0,
            Yanlış: 0,
            Boş: 0,
            totalQ: 0,
            rate: 0,
            totalSolvedTests: 0,
            totalAssignedTests: 0
          };
        }

        subMap[subjectName].totalAssignedTests++;

        const solvedSubs = studentSubmissions.filter(s => {
          const matchFields = [
            String(s.testId || ''),
            String(s.realTestId || ''),
            String(s.bookTestId || ''),
            String(s.metadata?.realTestId || ''),
            String(s.metadata?.bookTestId || ''),
            String(s.metadata?.realId || '')
          ];
          if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
            matchFields.push(...s.bookTestIds.map(String));
          }

          return matchFields.some(f => f && (
            f === tIdStr ||
            f === tCleanId ||
            f.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId ||
            (tUuidStr && f === tUuidStr) ||
            toUUID(f) === tIdStr ||
            (tUuidStr && toUUID(f) === tUuidStr)
          ));
        });

        let hwSub = null;
        for (const hw of homeworks) {
          if (!hw.submissions || !Array.isArray(hw.submissions)) continue;
          const match = hw.submissions.find(s => {
            const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr) || (studentUuidStr && toUUID(s.studentId) === studentUuidStr);
            if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
            const subTId = String(s.testId || s.bookTestId || s.realTestId || '');
            return subTId === tIdStr || subTId === tCleanId || subTId.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId || (tUuidStr && subTId === tUuidStr);
          });
          if (match) {
            hwSub = match;
            break;
          }
        }

        if (solvedSubs.length > 0 || !!hwSub) {
          subMap[subjectName].totalSolvedTests++;
          let bestSub = null;
          if (solvedSubs.length > 0) {
            bestSub = solvedSubs.reduce((prev, curr) => ((curr.score || 0) > (prev.score || 0) ? curr : prev), solvedSubs[0]);
          } else if (hwSub) {
            bestSub = hwSub;
          }

          if (bestSub) {
            subMap[subjectName].Doğru += bestSub.correctCount || 0;
            subMap[subjectName].Yanlış += bestSub.wrongCount || 0;
            subMap[subjectName].Boş += bestSub.blankCount || 0;
          }
        }
      });
    });

    return Object.values(subMap).map(item => {
      const totalQ = item.Doğru + item.Yanlış + item.Boş;
      const rate = totalQ > 0 ? Math.round((item.Doğru / totalQ) * 100) : 0;
      const progress = item.totalAssignedTests > 0 ? Math.round((item.totalSolvedTests / item.totalAssignedTests) * 100) : 0;
      return {
        ...item,
        totalQ,
        rate,
        progress
      };
    }).sort((a, b) => b.totalQ - a.totalQ);
  }, [assignedBooks, bookTests, studentSubmissions, homeworks, studentIdStr, studentUuidStr]);

  const activeChartData = bookChartViewMode === 'books' ? chartData : subjectChartData;

  const [showClassifiedQuestions, setShowClassifiedQuestions] = useState(false);

  const bookMistakeStats = useMemo(() => {
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

    // 1. Scan LocalStorage for mistake reasons of all book tests
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || (!k.startsWith('mistake_reasons_') && !k.startsWith('book_mistake_reasons_'))) continue;
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
                  bookTitle: 'Kitap Testi',
                  subject: subKey.includes('_') ? subKey.split('_')[0] : 'Soru',
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

    // 2. Scan Submissions in EvaluationContext
    (submissions || []).forEach(sub => {
      const isMatch = String(sub.studentId) === studentIdStr || (studentUuidStr && String(sub.studentId) === studentUuidStr);
      if (!isMatch || sub.status === 'in_progress' || sub.status === 'draft') return;
      if (!sub.mistakeReasons || typeof sub.mistakeReasons !== 'object') return;

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
            bookTitle: sub.testTitle || sub.bookTitle || 'Kitap Testi',
            subject: subKey.includes('_') ? subKey.split('_')[0] : (sub.testTitle || 'Soru'),
            qNo: subKey.includes('_') ? subKey.split('_')[1] : subKey,
            reason: matchedKey,
            def: reasonDefs[matchedKey]
          });
        }
      });
    });

    // 3. Scan Homeworks in HomeworkContext
    (homeworks || []).forEach(hw => {
      (hw.submissions || []).forEach(hs => {
        const isMatch = String(hs.studentId) === studentIdStr || (studentUuidStr && String(hs.studentId) === studentUuidStr);
        if (!isMatch) return;
        if (!hs.mistakeReasons || typeof hs.mistakeReasons !== 'object') return;

        Object.entries(hs.mistakeReasons).forEach(([subKey, reason]) => {
          if (!reason || typeof reason !== 'string') return;
          const dedupeKey = `hw_${hw.id}_${subKey}`;
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
              bookTitle: hw.title || 'Ödev / Test',
              subject: subKey.includes('_') ? subKey.split('_')[0] : (hw.subject || 'Soru'),
              qNo: subKey.includes('_') ? subKey.split('_')[1] : subKey,
              reason: matchedKey,
              def: reasonDefs[matchedKey]
            });
          }
        });
      });
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
      sortedReasons,
      questionsList
    };
  }, [submissions, overallStats.totalY, overallStats.totalB, studentId]);

  /* ════════════════════════
     RENDER
  ════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(244, 63, 94, 0.05) 0%, transparent 45%), var(--color-bg)', padding: '1.5rem 1.25rem', fontFamily: "'Inter', sans-serif", color: 'var(--color-text)' }}>
      <div style={{ width: '100%', maxWidth: '100%', margin: 0 }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,99,235,0.12)', border: '1.5px solid #3b82f6', borderRadius: 99, padding: '0.3rem 0.9rem', marginBottom: 10 }}>
              <MapIcon size={14} color="#3b82f6" />
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#60a5fa', letterSpacing: '0.05em' }}>KİTAP HARİTASI</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
              Kitaplarım ve İlerlemem 📚
            </h1>
            <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: '0.92rem', fontWeight: 600 }}>
              Atanan kitapları adım adım çöz, başarı oranını izle ve hedeflerine ulaş! 🚀
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {currentUser?.role !== 'student' && studentMembers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 12, padding: '0.4rem 0.8rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <User size={16} style={{ color: '#6366f1' }} />
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Öğrenci:</label>
                <select
                  value={activeStudent?.id || ''}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
                >
                  {studentMembers.map(st => (
                    <option key={st.id} value={st.id} style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                      {st.name} ({st.className || st.grade || 'Öğrenci'})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => setIsManualTestModalOpen(true)}
              style={{ padding: '0.75rem 1.4rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 900, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <Edit3 size={18} /> Manuel Test Girişi
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{ padding: '0.75rem 1.4rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 900, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <Plus size={18} /> Kendi Kitabını Ekle
            </button>
          </div>
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
            <div style={{ background: 'var(--color-surface)', borderRadius: 20, border: '1.5px solid var(--color-border)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', marginBottom: 22, overflow: 'hidden' }}>
              <div
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.4rem', borderBottom: showChart ? '1px solid var(--color-border)' : 'none', flexWrap: 'wrap', gap: 10 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div
                    onClick={() => setShowChart(c => !c)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)', cursor: 'pointer' }}
                  >
                    <BarChart2 size={20} color="#6366f1" /> 
                    {bookChartViewMode === 'books' ? 'Kitaplara Göre Soru Dağılımı' : 'Derslere Göre Soru Dağılımı'}
                    <ChevronRight size={18} color="var(--color-text-muted)" style={{ transform: showChart ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  {showChart && (
                    <div style={{ display: 'flex', background: 'var(--color-surface-hover)', padding: 3, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                      <button
                        onClick={() => setBookChartViewMode('books')}
                        style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: 8,
                          border: 'none',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: bookChartViewMode === 'books' ? '#4f46e5' : 'transparent',
                          color: bookChartViewMode === 'books' ? '#ffffff' : 'var(--color-text-muted)',
                          boxShadow: bookChartViewMode === 'books' ? '0 2px 8px rgba(79,70,229,0.25)' : 'none',
                          transition: 'all 0.15s'
                        }}
                      >
                        📚 Kitaplara Göre
                      </button>
                      <button
                        onClick={() => setBookChartViewMode('subjects')}
                        style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: 8,
                          border: 'none',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: bookChartViewMode === 'subjects' ? '#4f46e5' : 'transparent',
                          color: bookChartViewMode === 'subjects' ? '#ffffff' : 'var(--color-text-muted)',
                          boxShadow: bookChartViewMode === 'subjects' ? '0 2px 8px rgba(79,70,229,0.25)' : 'none',
                          transition: 'all 0.15s'
                        }}
                      >
                        🎓 Derslere Göre
                      </button>
                    </div>
                  )}
                </div>

                {showChart && (
                  <div style={{ display: 'flex', background: 'var(--color-surface-hover)', padding: 3, borderRadius: 10, border: '1px solid var(--color-border)' }}>
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
                        color: bookChartMetric === 'grouped' ? '#ffffff' : 'var(--color-text-muted)',
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
                        color: bookChartMetric === 'rate' ? '#ffffff' : 'var(--color-text-muted)',
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
                  {/* Interactive Mini Cards (Books or Subjects) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
                    {activeChartData.map((item, idx) => {
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
                          onClick={() => {
                            if (bookChartViewMode === 'books' && item.id) {
                              navigate(`/student/books/${item.id}`);
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
                            cursor: bookChartViewMode === 'books' && item.id ? 'pointer' : 'default',
                            transition: 'all 0.18s ease'
                          }}
                          title={bookChartViewMode === 'books' && item.id ? `${item.fullName} detaylarına gitmek için tıkla` : item.fullName}
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
                      <BarChart data={activeChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text)', fontWeight: 800 }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 700 }} tickFormatter={v => bookChartMetric === 'rate' ? `%${v}` : v} domain={bookChartMetric === 'rate' ? [0, 100] : ['auto', 'auto']} />
                        <Tooltip
                          cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                          contentStyle={{ background: 'var(--color-surface)', borderRadius: 14, border: '1.5px solid var(--color-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)' }}
                          formatter={(value, name) => [
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
                          </>
                        ) : (
                          <Bar dataKey="rate" name="🎯 Başarı Oranı (%)" fill="#6366f1" radius={[4, 4, 0, 0]}>
                            {activeChartData.map((entry, idx) => {
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

            <style>{`
              .sb-mistake-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 0.75rem;
                margin-bottom: 1.25rem;
              }
              @media (max-width: 1024px) {
                .sb-mistake-grid {
                  grid-template-columns: repeat(3, 1fr);
                }
              }
              @media (max-width: 640px) {
                .sb-mistake-grid {
                  grid-template-columns: repeat(2, 1fr);
                  gap: 0.5rem;
                }
                .sb-mistake-card {
                  padding: 0.65rem 0.75rem !important;
                  border-radius: 11px !important;
                }
                .sb-mistake-card:last-child {
                  grid-column: span 2;
                }
                .sb-mistake-card-title {
                  font-size: 0.72rem !important;
                }
                .sb-mistake-card-pct {
                  font-size: 0.82rem !important;
                }
                .sb-mistake-card-val {
                  font-size: 1.05rem !important;
                }
              }
            `}</style>

            {/* 🤔 KİTAP & TEST HATA & YANLIŞ SEBEPLERİ ANALİZİ WIDGET */}
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
                      🤔 Kitap & Test Hata & Yanlış Sebepleri Analizi
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Kitap testlerinde işaretlediğiniz yanlış ve boş soruların teşhis analizi
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 800 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    Toplam Yanlış & Boş: <strong style={{ color: 'var(--color-text)' }}>{bookMistakeStats.totalWrongAndBlank}</strong>
                  </span>
                  <span>•</span>
                  <span style={{ color: '#10b981' }}>
                    Sınıflandırılan: <strong>{bookMistakeStats.totalClassified}</strong>
                  </span>
                  <span>•</span>
                  <span style={{ color: '#f59e0b' }}>
                    Bekleyen: <strong>{bookMistakeStats.unclassifiedCount}</strong>
                  </span>
                </div>
              </div>

              {/* Multi-segment Progress Bar */}
              {bookMistakeStats.totalClassified > 0 && (
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
                    {Object.values(bookMistakeStats.reasonDefs).map(r => {
                      if (r.count <= 0) return null;
                      const pct = (r.count / bookMistakeStats.totalClassified) * 100;
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
              <div className="sb-mistake-grid">
                {Object.values(bookMistakeStats.reasonDefs).map(r => {
                  const pct = bookMistakeStats.totalClassified > 0 ? Math.round((r.count / bookMistakeStats.totalClassified) * 100) : 0;
                  return (
                    <div
                      key={r.key}
                      className="sb-mistake-card"
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
                        <span className="sb-mistake-card-title" style={{ fontSize: '0.78rem', fontWeight: 900, color: r.count > 0 ? r.color : 'var(--color-text-muted)' }}>
                          {r.key}
                        </span>
                        <span className="sb-mistake-card-pct" style={{ fontSize: '0.9rem', fontWeight: 900, color: r.count > 0 ? r.color : 'var(--color-text-muted)' }}>
                          %{pct}
                        </span>
                      </div>
                      <div className="sb-mistake-card-val" style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>
                        {r.count} <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>soru</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coaching Tip */}
              {bookMistakeStats.topReason && bookMistakeStats.topReason.count > 0 ? (
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
                  marginBottom: bookMistakeStats.questionsList.length > 0 ? 12 : 0
                }}>
                  <span style={{ fontSize: '1.2rem' }}>💡</span>
                  <div>
                    <strong>Kitap Çalışma İpucu:</strong> Testlerdeki en yaygın hata nedeniniz <strong style={{ color: bookMistakeStats.topReason.color }}>{bookMistakeStats.topReason.key}</strong> (%{Math.round((bookMistakeStats.topReason.count / bookMistakeStats.totalClassified) * 100)}).
                    {bookMistakeStats.topReason.key.includes('Dikkat') && ' Sorulardaki kök kelimelere ve altı çizili ifadelere odaklanarak test çözmek dikkat kaynaklı kayıpları sıfıra indirecektir.'}
                    {bookMistakeStats.topReason.key.includes('İşlem') && ' Karalama alanını düzenli kullanarak işlem basamaklarını alt alta yazmanız işlem hatası oranını düşürecektir.'}
                    {bookMistakeStats.topReason.key.includes('Konu') && ' Bu konudaki konu özetlerini ve çözümlü test örneklerini tekrar çalıştıktan sonra yeni teste geçmeniz önerilir.'}
                    {bookMistakeStats.topReason.key.includes('Formül') && ' Formül özet kağıdınızı masanıza asarak test çözmeden önce 2 dakika gözden geçirebilirsiniz.'}
                    {bookMistakeStats.topReason.key.includes('Zaman') && ' Test çözerken soru başına 1-1.5 dakika kuralı koyup süre tutarak çalışmanız pratikliğinizi artıracaktır.'}
                  </div>
                </div>
              ) : null}

              {/* Collapsible Classified Questions List */}
              {bookMistakeStats.questionsList.length > 0 && (
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
                    <span>{showClassifiedQuestions ? '▲ Soru Listesini Gizle' : `▼ Sınıflandırılan Soruları İncele (${bookMistakeStats.questionsList.length} Soru)`}</span>
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
                      {bookMistakeStats.questionsList.map(item => (
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>{item.bookTitle}</span>
                            <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                            <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>{item.subject}</span>
                            <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                            <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>Soru {item.qNo}</span>
                          </div>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: 6,
                            background: item.def.bg,
                            color: item.def.color,
                            fontWeight: 800,
                            fontSize: '0.7rem',
                            border: `1px solid ${item.def.border}`
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
          </>
        )}

        {/* ── SEARCH + SORT ── */}
        {assignedBooks.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Kitap ara..."
                style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 12, border: '1.5px solid var(--color-border-input)', fontSize: '0.84rem', fontWeight: 700, background: 'var(--color-surface)', outline: 'none', color: 'var(--color-text)', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, background: 'var(--color-surface)', padding: 4, borderRadius: 12, border: '1.5px solid var(--color-border)' }}>
              {[
                { key: 'progress', label: '📊 İlerleme' },
                { key: 'success',  label: '🏆 Başarı' },
                { key: 'title',    label: '🔤 A-Z' },
              ].map(s => (
                <button key={s.key} onClick={() => setSortBy(s.key)} style={{ padding: '0.4rem 0.85rem', borderRadius: 8, border: 'none', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer', background: sortBy === s.key ? 'rgba(37,99,235,0.12)' : 'transparent', color: sortBy === s.key ? '#60a5fa' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {s.label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>{displayedBooks.length} kitap</span>
          </div>
        )}

        {/* ── BOOK GRID ── */}
        {assignedBooks.length === 0 ? (
          booksLoading ? (
            <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '4rem 2rem', textAlign: 'center', border: '1.5px solid var(--color-border)' }}>
              <div style={{ width: 44, height: 44, border: '4px solid var(--color-border)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontWeight: 800, color: 'var(--color-text-muted)' }}>Kitaplar yükleniyor…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '5rem 2rem', textAlign: 'center', border: '1.5px solid var(--color-border)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 90, height: 90, background: 'rgba(37,99,235,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1.5px solid #3b82f6' }}>
                <BookOpen size={40} color="#3b82f6" />
              </div>
              <h2 style={{ margin: '0 0 8px', color: 'var(--color-text)', fontWeight: 900 }}>Henüz Atanmış Kitap Yok</h2>
              <p style={{ color: 'var(--color-text-muted)', margin: '0 0 20px', fontSize: '0.92rem' }}>Öğretmenin sana bir kitap atadığında burada görünecek.</p>
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
                    background: 'var(--color-surface)',
                    borderRadius: 20,
                    border: isCompleted ? '2px solid #86efac' : '1.5px solid var(--color-border)',
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
                    <div style={{ position: 'absolute', top: 14, right: 14, background: isDark ? 'rgba(16, 185, 129, 0.18)' : '#f0fdf4', color: '#10b981', border: isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #bbf7d0', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={11} fill="#10b981" color="#10b981" /> TAMAMLANDI
                    </div>
                  ) : urgentDue ? (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: isDark ? 'rgba(239, 68, 68, 0.18)' : '#fff1f2', color: '#ef4444', border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #fecdd3', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 900 }}>
                      ⚡ {book.remainingDays} gün kaldı
                    </div>
                  ) : book.remainingDays !== undefined ? (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb', color: '#f59e0b', border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #fde68a', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 900 }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{book.remainingDays} gün
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16, marginTop: 8 }}>
                    <div style={{ width: 60, height: 84, borderRadius: 12, background: `linear-gradient(160deg, ${pal.from}, ${pal.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${pal.shadow}`, flexShrink: 0 }}>
                      <BookMarked size={28} color="#ffffff" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                      <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--color-text)', lineHeight: 1.25, marginBottom: 4, paddingRight: book.remainingDays !== undefined || isCompleted ? 80 : 0 }}>
                        {book.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{book.publisher}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {(book.subjects || []).slice(0, 3).map((s, i) => (
                          <span key={i} style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.2rem 0.55rem', fontSize: '0.68rem', fontWeight: 800 }}>{s.name}</span>
                        ))}
                        {(book.subjects || []).length > 3 && (
                          <span style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.2rem 0.55rem', fontSize: '0.68rem', fontWeight: 800 }}>+{(book.subjects || []).length - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--color-surface-hover)', borderRadius: 16, padding: '1rem', marginBottom: 14, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Test İlerlemesi</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{book.totalSolvedTests} / {book.totalAssignedTests} test</div>
                      </div>
                      <div style={{ position: 'relative', width: 56, height: 56 }}>
                        <CircularProgress pct={pct} size={56} stroke={5} color={isCompleted ? '#10b981' : pal.to} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.74rem', fontWeight: 900, color: isCompleted ? '#10b981' : 'var(--color-text)' }}>
                          %{pct}
                        </div>
                      </div>
                    </div>

                    <div style={{ height: 7, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: isCompleted ? '#10b981' : `linear-gradient(90deg, ${pal.from}, ${pal.to})`, borderRadius: 99, transition: 'width 0.7s ease' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
                    {[
                      { label: 'Doğru',  value: book.totalCorrect, color: '#10b981', bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4', border: isDark ? 'rgba(16, 185, 129, 0.35)' : '#bbf7d0' },
                      { label: 'Yanlış', value: book.totalWrong,   color: '#ef4444', bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', border: isDark ? 'rgba(239, 68, 68, 0.35)' : '#fecaca' },
                      { label: 'Boş',    value: book.totalBlank,   color: 'var(--color-text-muted, #64748b)', bg: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f8fafc', border: isDark ? 'rgba(148, 163, 184, 0.3)' : '#e2e8f0' },
                      { label: 'Başarı', value: `%${book.successRate}`, color: '#3b82f6', bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', border: isDark ? 'rgba(59, 130, 246, 0.35)' : '#bfdbfe' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '0.45rem 0.3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.62rem', color: s.color, fontWeight: 900, textTransform: 'uppercase' }}>{s.label}</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/student/books/${book.id}`); }}
                    style={{ width: '100%', padding: '0.75rem', background: isCompleted ? 'var(--color-surface-hover, #f1f5f9)' : `linear-gradient(135deg, ${pal.from}, ${pal.to})`, color: isCompleted ? 'var(--color-text, #334155)' : 'white', border: isCompleted ? '1.5px solid var(--color-border, #cbd5e1)' : 'none', borderRadius: 12, fontWeight: 900, fontSize: '0.86rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: isCompleted ? 'none' : `0 4px 14px ${pal.shadow}`, transition: 'all 0.2s ease' }}
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(6px)', padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 20, width: '100%', maxWidth: 480, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)' }}>Kendi Kitabını Ekle</h2>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Çalışmak istediğin kitabı kaydet ve ilerlemeni takip et</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Kitap Adı', key: 'title', placeholder: 'Örn: TYT Matematik Soru Bankası' },
                { label: 'Yayınevi', key: 'publisher', placeholder: 'Örn: 3D Yayınları' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)' }}>{field.label}</label>
                  <input
                    type="text"
                    value={newBook[field.key]}
                    onChange={e => setNewBook(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 10, border: '1.5px solid var(--color-border-input)', fontSize: '0.9rem', fontWeight: 700, outline: 'none', background: 'var(--color-surface-hover)', color: 'var(--color-text)', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)' }}>
                  Optik Form Seçenek Sayısı (Seviye)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 0.8rem', borderRadius: 10, border: `1.5px solid ${newBook.optionCount === 4 ? '#3b82f6' : 'var(--color-border)'}`, background: newBook.optionCount === 4 ? 'rgba(37,99,235,0.12)' : 'var(--color-surface-hover)', color: 'var(--color-text)', cursor: 'pointer' }}>
                    <input
                      type="radio" name="studentBookOptionCount" value={4}
                      checked={newBook.optionCount === 4}
                      onChange={() => setNewBook(p => ({ ...p, optionCount: 4 }))}
                      style={{ accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)' }}>4 Seçenek (A-D)</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Ortaokul / LGS</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 0.8rem', borderRadius: 10, border: `1.5px solid ${newBook.optionCount === 5 ? '#3b82f6' : 'var(--color-border)'}`, background: newBook.optionCount === 5 ? 'rgba(37,99,235,0.12)' : 'var(--color-surface-hover)', color: 'var(--color-text)', cursor: 'pointer' }}>
                    <input
                      type="radio" name="studentBookOptionCount" value={5}
                      checked={newBook.optionCount === 5}
                      onChange={() => setNewBook(p => ({ ...p, optionCount: 5 }))}
                      style={{ accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)' }}>5 Seçenek (A-E)</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Lise / YKS</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--color-border)' }}>
                  Dersler / Bölümler
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {newBook.subjects.map((subj, idx) => (
                    <div key={subj.id} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                      <input
                        type="text" value={subj.name} placeholder={`Ders ${idx + 1}`}
                        onChange={e => { const s = [...newBook.subjects]; s[idx].name = e.target.value; setNewBook({ ...newBook, subjects: s }); }}
                        style={{ flex: 2, padding: '0.6rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--color-border-input)', fontSize: '0.82rem', fontWeight: 700, outline: 'none', background: 'var(--color-surface-hover)', color: 'var(--color-text)' }}
                      />
                      <input
                        type="number" min="1" value={subj.testCount} title="Test Sayısı"
                        onChange={e => { const s = [...newBook.subjects]; s[idx].testCount = Number(e.target.value); setNewBook({ ...newBook, subjects: s }); }}
                        style={{ width: 62, padding: '0.6rem 0.5rem', borderRadius: 8, border: '1.5px solid var(--color-border-input)', fontSize: '0.82rem', fontWeight: 700, outline: 'none', textAlign: 'center', background: 'var(--color-surface-hover)', color: 'var(--color-text)' }}
                      />
                      <input
                        type="number" min="1" value={subj.questionsPerTest} title="Test başına soru"
                        onChange={e => { const s = [...newBook.subjects]; s[idx].questionsPerTest = Number(e.target.value); setNewBook({ ...newBook, subjects: s }); }}
                        style={{ width: 62, padding: '0.6rem 0.5rem', borderRadius: 8, border: '1.5px solid var(--color-border-input)', fontSize: '0.82rem', fontWeight: 700, outline: 'none', textAlign: 'center', background: 'var(--color-surface-hover)', color: 'var(--color-text)' }}
                      />
                      <button
                        onClick={() => { const s = newBook.subjects.filter((_, i) => i !== idx); setNewBook({ ...newBook, subjects: s }); }}
                        disabled={newBook.subjects.length <= 1}
                        style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: newBook.subjects.length > 1 ? '#fee2e2' : 'var(--color-surface-hover)', color: newBook.subjects.length > 1 ? '#ef4444' : 'var(--color-text-muted)', cursor: newBook.subjects.length > 1 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 4, fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
                    <span style={{ flex: 2 }}>Ders Adı</span>
                    <span style={{ width: 62, textAlign: 'center' }}>Test Sayısı</span>
                    <span style={{ width: 62, textAlign: 'center' }}>Soru/Test</span>
                    <span style={{ width: 34 }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewBook(p => ({ ...p, subjects: [...p.subjects, { id: `sub_${Date.now()}`, name: '', testCount: 20, questionsPerTest: 20 }] }))}
                    style={{ padding: '0.55rem', background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1.5px dashed #3b82f6', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 4 }}
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

      {/* Manuel Test Sonucu Ekleme Modalı */}
      <ManualTestModal
        isOpen={isManualTestModalOpen}
        onClose={() => setIsManualTestModalOpen(false)}
      />
    </div>
  );
}