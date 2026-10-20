import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useTheme } from '../context/ThemeContext';
import {
  isHomeworkForStudent,
  isSubmissionMatchingBookTest,
  isExamBook,
  isStandardOrMixedBook,
  createCompositeTestKey,
  getSubmissionCompositeKey
} from '../utils/testResolver';
import {
  BookOpen, Map as MapIcon, ArrowRight, BarChart2, Star, Plus, X, Target,
  CheckCircle2, Activity, Layers, Trophy, TrendingUp, Zap, Clock,
  ChevronRight, BookMarked, Search, Filter, RotateCcw, Award, Edit3, ClipboardList, User,
  ArrowLeft, Play, Sparkles, Flame, ShieldCheck, Check
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell
} from 'recharts';
import { toUUID } from '../services/supabaseService';
import { isDeletedItem } from '../services/unifiedResultAdapter';
import ManualTestModal from '../components/ManualTestModal';
import './StudentDashboard.css';

/* ── Colour palette for book covers & badges ─── */
const BOOK_PALETTES = [
  { from: '#6366f1', to: '#4f46e5', accent: '#818cf8', shadow: 'rgba(99,102,241,0.35)', badgeBg: 'rgba(99,102,241,0.12)' },
  { from: '#10b981', to: '#059669', accent: '#34d399', shadow: 'rgba(16,185,129,0.35)', badgeBg: 'rgba(16,185,129,0.12)' },
  { from: '#f59e0b', to: '#d97706', accent: '#fbbf24', shadow: 'rgba(245,158,11,0.35)', badgeBg: 'rgba(245,158,11,0.12)' },
  { from: '#06b6d4', to: '#0891b2', accent: '#38bdf8', shadow: 'rgba(6,182,212,0.35)', badgeBg: 'rgba(6,182,212,0.12)' },
  { from: '#8b5cf6', to: '#7c3aed', accent: '#a78bfa', shadow: 'rgba(139,92,246,0.35)', badgeBg: 'rgba(139,92,246,0.12)' },
  { from: '#ec4899', to: '#db2777', accent: '#f472b6', shadow: 'rgba(236,72,153,0.35)', badgeBg: 'rgba(236,72,153,0.12)' },
  { from: '#14b8a6', to: '#0d9488', accent: '#2dd4bf', shadow: 'rgba(20,184,166,0.35)', badgeBg: 'rgba(20,184,166,0.12)' },
  { from: '#f43f5e', to: '#e11d48', accent: '#fb7185', shadow: 'rgba(244,63,94,0.35)', badgeBg: 'rgba(244,63,94,0.12)' },
];
const palette = (idx) => BOOK_PALETTES[idx % BOOK_PALETTES.length];

/* ── Mini Circular Progress Bar ─── */
function CircularProgress({ pct, size = 52, stroke = 5, color = '#6366f1' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border, rgba(0,0,0,0.08))" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

export default function StudentBooksPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, isDark } = useTheme();
  const { currentUser } = useAuth();
  const { users = [] } = useUser();
  const { homeworks = [], addHomework } = useHomework();
  const { books = [], bookTests = [], isLoading: booksLoading, addTrackedBook, addTrackedBookTest } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();
  const { data: curData } = useCurriculum();

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Student resolution
  const studentMembers = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const activeStudent = useMemo(() => {
    if (currentUser?.role === 'student') return currentUser;
    const queryStudentId = searchParams.get('studentId');
    if (queryStudentId) {
      const found = studentMembers.find(s => String(s.id) === String(queryStudentId) || (toUUID(s.id) && String(toUUID(s.id)) === String(queryStudentId)));
      if (found) return found;
    }
    if (selectedStudentId) {
      const found = studentMembers.find(s => String(s.id) === String(selectedStudentId) || (toUUID(s.id) && String(toUUID(s.id)) === String(selectedStudentId)));
      if (found) return found;
    }
    const saved = localStorage.getItem('etest_selected_student_id');
    if (saved) {
      const found = studentMembers.find(s => String(s.id) === String(saved) || (toUUID(s.id) && String(toUUID(s.id)) === String(saved)));
      if (found) return found;
    }
    return studentMembers[0] || currentUser;
  }, [currentUser, searchParams, selectedStudentId, studentMembers]);

  const studentId = activeStudent?.id || currentUser?.id;
  const grade = activeStudent?.grade;
  const studentDisplayName = activeStudent?.name || activeStudent?.username || currentUser?.name || 'Öğrenci';

  // Comprehensive Student ID Set for submissions matching
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

  // Tab State: 'kitaplar' | 'grafikler' | 'analiz'
  const [activeTab, setActiveTab] = useState('kitaplar');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in_progress' | 'completed' | 'urgent'
  const [sortBy, setSortBy] = useState('progress'); // 'progress' | 'success' | 'title'

  // Chart View Options
  const [bookChartViewMode, setBookChartViewMode] = useState('books'); // 'books' | 'subjects'
  const [bookChartMetric, setBookChartMetric] = useState('grouped'); // 'grouped' | 'rate'

  // Modals
  const defaultOptionCount = (grade && String(grade).match(/^[5-8]/)) ? 4 : 5;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManualTestModalOpen, setIsManualTestModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    publisher: '',
    optionCount: defaultOptionCount,
    subjects: [{ id: 'sub_1', name: '', testCount: 20, questionsPerTest: 20 }]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showClassifiedQuestions, setShowClassifiedQuestions] = useState(false);

  // Add Book action
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
        isBookAssignment: true,
        bookId: createdBook.id,
        targetType: 'student',
        targetIds: [studentId],
        tests: testIds
      });

      setIsAddModalOpen(false);
      setNewBook({ title: '', publisher: '', optionCount: defaultOptionCount, subjects: [{ id: 'sub_1', name: '', testCount: 20, questionsPerTest: 20 }] });
    } catch (e) {
      console.error('Failed to add book', e);
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Book Assignments
  const bookAssignments = useMemo(() => {
    return homeworks.filter(hw => {
      if (isExamBook(hw)) return false;
      const raw = hw.raw_data || {};
      const isBookHw = hw.isBookAssignment || raw.isBookAssignment || hw.bookId || raw.bookId || hw.sourceType === 'trackedBook' || hw.title?.includes('(Tüm Kitap') || hw.title?.includes('(Kendi Eklediğim)');
      if (!isBookHw) return false;
      return isHomeworkForStudent(hw, activeStudent, curData?.grades);
    });
  }, [homeworks, activeStudent, curData?.grades]);

  // 2. Student Submissions
  const studentSubmissions = useMemo(() => {
    const list = submissions.filter(s => {
      if (!s || isDeletedItem(s)) return false;
      const sId = String(s.studentId || s.student_id || s.userId || s.user_id || '');
      const isMatchStudent = allStudentIds.has(sId) || (toUUID(sId) && allStudentIds.has(toUUID(sId)));
      if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
      if (s.isManual && (s.approvalStatus === 'pending' || s.approvalStatus === 'rejected' || s.isApproved === false || s.status === 'pending_approval' || s.status === 'rejected')) return false;
      return true;
    });

    (homeworks || []).forEach(hw => {
      const hwSubs = hw.submissions || hw.raw_data?.submissions || [];
      (hwSubs || []).forEach(sub => {
        if (!sub || isDeletedItem(sub)) return;
        const sId = String(sub.studentId || sub.student_id || sub.userId || sub.user_id || '');
        const isMatchStudent = allStudentIds.has(sId) || (toUUID(sId) && allStudentIds.has(toUUID(sId)));
        if (isMatchStudent && sub.status !== 'in_progress' && sub.status !== 'draft') {
          if (!list.some(x => (x.id && x.id === sub.id) || (x.test_id && (x.test_id === sub.testId || x.test_id === sub.bookTestId)))) {
            list.push(sub);
          }
        }
      });
    });

    return list;
  }, [submissions, homeworks, allStudentIds]);

  // 3. Assigned Books and Multi-level Stats
  const assignedBooks = useMemo(() => {
    const bookMap = {};
    const getNormKey = (b) => `${String(b.title || '').trim().toLowerCase().replace(/\s+/g, ' ')}___${String(b.publisher || '').trim().toLowerCase().replace(/\s+/g, ' ')}`;
    const isStudentUser = currentUser?.role === 'student';

    // 1. If teacher/admin and not filtering by a specific student, show all standard books
    if (!isStudentUser && !selectedStudentId) {
      (books || []).filter(b => isStandardOrMixedBook(b)).forEach(b => {
        const normK = getNormKey(b);
        if (!bookMap[normK]) {
          bookMap[normK] = { ...b, assignedHomeworks: [] };
        }
      });
    }

    // 2. Attach assignments strictly from bookAssignments
    (bookAssignments || []).forEach(hw => {
      const raw = hw.raw_data || {};
      if (isExamBook(hw)) return;

      const targetBookId = String(hw.bookId || raw.bookId || '');
      let book = (books || []).find(b => {
        if (!isStandardOrMixedBook(b)) return false;
        const bId = String(b.id || '');
        return (targetBookId && (bId === targetBookId || toUUID(bId) === targetBookId || bId === toUUID(targetBookId) || (toUUID(bId) && toUUID(bId) === toUUID(targetBookId))));
      });

      if (!book && hw.title) {
        const cleanHwTitle = hw.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim().toLowerCase();
        book = (books || []).find(b => {
          const bT = String(b.title).toLowerCase().trim();
          return isStandardOrMixedBook(b) && (cleanHwTitle.includes(bT) || bT.includes(cleanHwTitle));
        });
      }

      if (!book && Array.isArray(hw.tests) && hw.tests.length > 0) {
        const matchedBt = (bookTests || []).find(bt => hw.tests.includes(bt.id) || (toUUID(bt.id) && hw.tests.includes(toUUID(bt.id))));
        if (matchedBt) {
          const matchedBtBookId = String(matchedBt.bookId || matchedBt.book_id || '');
          book = (books || []).find(b => (String(b.id) === matchedBtBookId || (toUUID(b.id) && toUUID(b.id) === toUUID(matchedBtBookId))) && isStandardOrMixedBook(b));
        }
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

    // 3. Also include books created by the student or directly targeting this student
    (books || []).filter(b => isStandardOrMixedBook(b)).forEach(b => {
      const isOwner = (b.studentId && allStudentIds.has(String(b.studentId))) || (b.userId && allStudentIds.has(String(b.userId)));
      const isCreator = (b.createdBy && allStudentIds.has(String(b.createdBy)));
      const isDirectlyAssigned = (Array.isArray(b.assignedStudents) && b.assignedStudents.some(sid => allStudentIds.has(String(sid)))) ||
                                 (Array.isArray(b.targetIds) && b.targetIds.some(tid => allStudentIds.has(String(tid))));
      if (isOwner || isCreator || isDirectlyAssigned) {
        const normK = getNormKey(b);
        if (!bookMap[normK]) {
          bookMap[normK] = { ...b, assignedHomeworks: [] };
        }
      }
    });

    // Pre-index student submissions for O(1) lookup
    const solvedSubsMap = new Map();
    (studentSubmissions || []).forEach(s => {
      const compKey = getSubmissionCompositeKey(s);
      const score = Number(s.score || s.computedScore || (s.correct_count ?? s.correctCount ?? s.correct ?? 0));
      if (compKey) {
        const existing = solvedSubsMap.get(compKey);
        const exScore = Number(existing?.score || existing?.computedScore || (existing?.correct_count ?? existing?.correctCount ?? existing?.correct ?? 0));
        if (!existing || score >= exScore) {
          solvedSubsMap.set(compKey, s);
        }
      }

      const matchIds = [
        s.testId, s.test_id, s.bookTestId, s.realTestId, s.id,
        s.metadata?.testId, s.metadata?.bookTestId, s.metadata?.realTestId
      ];
      if (Array.isArray(s.bookTestIds)) matchIds.push(...s.bookTestIds);
      matchIds.forEach(id => {
        if (!id) return;
        const strId = String(id);
        const cleanId = strId.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
        const uuid = toUUID(strId);
        
        const existing = solvedSubsMap.get(strId) || solvedSubsMap.get(cleanId);
        const exScore = Number(existing?.score || existing?.computedScore || (existing?.correct_count ?? existing?.correctCount ?? existing?.correct ?? 0));
        if (!existing || score >= exScore) {
          solvedSubsMap.set(strId, s);
          solvedSubsMap.set(cleanId, s);
          if (uuid) solvedSubsMap.set(uuid, s);
        }
      });
    });

    // Pre-index bookTests by bookId for O(1) lookup
    const bookTestsByBookIdMap = new Map();
    (bookTests || []).forEach(bt => {
      const bId = String(bt.bookId || bt.book_id || '');
      if (bId) {
        if (!bookTestsByBookIdMap.has(bId)) bookTestsByBookIdMap.set(bId, []);
        bookTestsByBookIdMap.get(bId).push(bt);
        const u = toUUID(bId);
        if (u && u !== bId) {
          if (!bookTestsByBookIdMap.has(u)) bookTestsByBookIdMap.set(u, []);
          bookTestsByBookIdMap.get(u).push(bt);
        }
      }
    });

    // 4. Compute stats for each book with multi-level submission matching
    Object.values(bookMap).forEach(b => {
      const bId = String(b.id);
      const bUuid = String(toUUID(b.id) || '');

      const rawSubjects = (b.subjects && b.subjects.length > 0) ? b.subjects : (b.raw_data?.subjects || []);
      const subjects = rawSubjects.filter(s => s && s.name);

      // Deduplicate tests in book
      const deduplicatedMap = new Map();
      const testsForThisBook = bookTestsByBookIdMap.get(bId) || (bUuid ? bookTestsByBookIdMap.get(bUuid) : null) || [];
      testsForThisBook.forEach(t => {
        const nameKey = String(t.name || t.title || '').trim().toLowerCase();
        const topKey = String(t.topicId || t.topic_id || 'direct').trim().toLowerCase();
        const sId = String(t.subjectId || t.subject_id || 'direct').trim().toLowerCase();
        const key = `${sId}___${topKey}___${nameKey}`;
        if (!deduplicatedMap.has(key)) {
          deduplicatedMap.set(key, t);
        }
      });
      const testsInBook = Array.from(deduplicatedMap.values());
      const totalBookTests = testsInBook.length > 0 ? testsInBook.length : (b.total_tests || b.totalTests || 1);

      let totalCorrect = 0;
      let totalWrong = 0;
      let totalBlank = 0;
      let totalSolvedTests = 0;

      testsInBook.forEach(t => {
        const parentSubj = subjects.find(s => String(s.id) === String(t.subject_id || t.subjectId));
        const parentTopic = parentSubj ? (parentSubj.topics || []).find(tp => String(tp.id) === String(t.topic_id || t.topicId)) : null;

        const contextualTest = {
          ...t,
          subject: parentSubj?.name || t.subject || t.subjectName || '',
          subjectName: parentSubj?.name || t.subject || t.subjectName || '',
          unit: parentTopic?.name || t.unit || t.unitName || '',
          unitName: parentTopic?.name || t.unit || t.unitName || '',
          bookId: b.id,
          bookTitle: b.title
        };

        const tIdStr = String(t.id);
        const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
        const tUuid = toUUID(tIdStr);
        const tCleanUuid = toUUID(tCleanId);
        const tCompKey = createCompositeTestKey(b.title, contextualTest.subject, contextualTest.unit, t.name || t.title);

        const bestSub = solvedSubsMap.get(tIdStr) || 
                        solvedSubsMap.get(tCleanId) ||
                        (tUuid && solvedSubsMap.get(tUuid)) ||
                        (tCleanUuid && solvedSubsMap.get(tCleanUuid)) ||
                        (tCompKey && solvedSubsMap.get(tCompKey));

        if (bestSub) {
          totalSolvedTests++;
          totalCorrect += Number(bestSub.correct_count ?? bestSub.correctCount ?? bestSub.correct ?? 0);
          totalWrong += Number(bestSub.wrong_count ?? bestSub.wrongCount ?? bestSub.wrong ?? 0);
          totalBlank += Number(bestSub.empty_count ?? bestSub.blankCount ?? bestSub.blank ?? 0);
        }
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
  }, [bookAssignments, books, studentSubmissions, bookTests, homeworks, allStudentIds, currentUser?.role, selectedStudentId]);

  // Overall statistics
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
    const completedBooks = assignedBooks.filter(b => b.progressPct >= 100).length;
    const inProgressBooks = assignedBooks.filter(b => b.progressPct < 100).length;
    const urgentBooks = assignedBooks.filter(b => b.remainingDays !== undefined && b.remainingDays <= 5 && b.progressPct < 100).length;

    // Gamification XP (Solved test: +25 XP, Completed book: +100 XP)
    const totalXp = (totalSolved * 25) + (completedBooks * 100);

    return {
      totalD, totalY, totalB, totalQ,
      successRate: totalQ > 0 ? Math.round((totalD / totalQ) * 100) : 0,
      progressRate: totalAssigned > 0 ? Math.round((totalSolved / totalAssigned) * 100) : 0,
      totalAssigned, totalSolved,
      totalBooks: assignedBooks.length,
      completedBooks,
      inProgressBooks,
      urgentBooks,
      totalXp
    };
  }, [assignedBooks]);

  // Filter + Sort Books
  const displayedBooks = useMemo(() => {
    let list = assignedBooks.filter(b => {
      const matchSearch = String(b.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(b.publisher || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (statusFilter === 'in_progress') return b.progressPct < 100;
      if (statusFilter === 'completed') return b.progressPct >= 100;
      if (statusFilter === 'urgent') return b.remainingDays !== undefined && b.remainingDays <= 5 && b.progressPct < 100;

      return true;
    });

    if (sortBy === 'progress') list = [...list].sort((a, b) => b.progressPct - a.progressPct);
    else if (sortBy === 'success') list = [...list].sort((a, b) => b.successRate - a.successRate);
    else if (sortBy === 'title') list = [...list].sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    return list;
  }, [assignedBooks, searchQuery, statusFilter, sortBy]);

  // Bar Chart Data (Books)
  const chartData = useMemo(() =>
    assignedBooks.map(b => {
      const d = b.totalCorrect || 0;
      const y = b.totalWrong || 0;
      const bl = b.totalBlank || 0;
      const totalQ = d + y + bl;
      const rate = b.successRate || (totalQ > 0 ? Math.round((d / totalQ) * 100) : 0);

      return {
        id: b.id,
        name: b.title?.length > 18 ? b.title.slice(0, 16) + '…' : b.title,
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
    }), [assignedBooks]);

  // Subject Chart Data (Subjects)
  const subjectChartData = useMemo(() => {
    const subMap = {};

    assignedBooks.forEach(b => {
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
            const sid = String(s.studentId || s.student_id || s.userId || s.user_id || '');
            const isMatchStudent = allStudentIds.has(sid) || (toUUID(sid) && allStudentIds.has(toUUID(sid)));
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
            subMap[subjectName].Doğru += Number(bestSub.correctCount ?? bestSub.correct_count ?? bestSub.correct ?? 0);
            subMap[subjectName].Yanlış += Number(bestSub.wrongCount ?? bestSub.wrong_count ?? bestSub.wrong ?? 0);
            subMap[subjectName].Boş += Number(bestSub.emptyCount ?? bestSub.blankCount ?? bestSub.blank ?? 0);
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
  }, [assignedBooks, bookTests, studentSubmissions, homeworks, allStudentIds]);

  const activeChartData = bookChartViewMode === 'books' ? chartData : subjectChartData;

  // Mistake Diagnostic Analysis
  const bookMistakeStats = useMemo(() => {
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

    // 1. Scan LocalStorage for mistake reasons
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
      const sid = String(sub.studentId || sub.student_id || sub.userId || sub.user_id || '');
      const isMatch = allStudentIds.has(sid) || (toUUID(sid) && allStudentIds.has(toUUID(sid)));
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
        const sid = String(hs.studentId || hs.student_id || hs.userId || hs.user_id || '');
        const isMatch = allStudentIds.has(sid) || (toUUID(sid) && allStudentIds.has(toUUID(sid)));
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
  }, [submissions, overallStats.totalY, overallStats.totalB, homeworks, allStudentIds]);

  if (!currentUser) return null;

  return (
    <div
      className="student-dashboard-page"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        backgroundImage: isDark
          ? 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.15) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(6, 182, 212, 0.12) 0%, transparent 45%), var(--color-bg)'
          : 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(6, 182, 212, 0.06) 0%, transparent 45%), var(--color-bg)',
        color: 'var(--color-text)',
        padding: isMobile ? '0.75rem 0.65rem calc(85px + env(safe-area-inset-bottom, 0px))' : '1.25rem 1.25rem 100px',
        boxSizing: 'border-box'
      }}
    >
      <style>{`
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .books-anim-in {
          animation: fadeInSlide 0.22s ease-out both;
        }
        .tab-btn-pill {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tab-btn-pill:hover {
          transform: translateY(-1px);
        }
        .book-quest-card {
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
        }
        .book-quest-card:hover {
          transform: translateY(-4px);
        }
        .filter-chip-pill {
          transition: all 0.18s ease;
        }
        .filter-chip-pill:hover {
          transform: translateY(-1px);
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>

        {/* ── TOP ACTION BAR (Öğrenci Paneli & Çalışma Odası & Manuel Giriş) ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/student')}
              className="game-btn-3d"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1.5px solid #e2e8f0',
                borderRadius: '0.75rem',
                padding: isMobile ? '0.42rem 0.75rem' : '0.5rem 1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 800,
                fontSize: isMobile ? '0.78rem' : '0.84rem',
                color: isDark ? '#ffffff' : '#334155',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <ArrowLeft size={16} />
              <span>Öğrenci Paneli</span>
            </button>

            <button
              onClick={() => navigate('/study-room')}
              className="game-btn-3d"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                borderRadius: '0.75rem',
                padding: isMobile ? '0.42rem 0.75rem' : '0.5rem 1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 900,
                fontSize: isMobile ? '0.78rem' : '0.84rem',
                color: '#ffffff',
                boxShadow: '0 3px 10px rgba(245,158,11,0.35)'
              }}
            >
              <Play size={13} fill="#ffffff" />
              <span>Çalışma Odası</span>
            </button>

            <button
              onClick={() => navigate('/my-program')}
              className="game-btn-3d"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.18)' : '1.5px solid #cbd5e1',
                borderRadius: '0.75rem',
                padding: isMobile ? '0.42rem 0.75rem' : '0.5rem 1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 800,
                fontSize: isMobile ? '0.78rem' : '0.84rem',
                color: isDark ? '#ffffff' : '#334155',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <Activity size={16} color="#6366f1" />
              <span>Haftalık Program</span>
            </button>
          </div>

          {/* Teacher/Admin Student Selector */}
          {currentUser?.role !== 'student' && studentMembers.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 12,
              padding: isMobile ? '0.35rem 0.65rem' : '0.4rem 0.8rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <User size={15} style={{ color: '#6366f1', flexShrink: 0 }} />
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Öğrenci:</label>
              <select
                value={activeStudent?.id || ''}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text)',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {studentMembers.map(st => (
                  <option key={st.id} value={st.id} style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                    {st.name} ({st.className || st.grade || 'Öğrenci'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── GAMIFIED HERO BENTO CARD ── */}
        <div
          className="game-card-elevated"
          style={{
            background: 'var(--color-surface, #ffffff)',
            border: '1.5px solid var(--color-border, #e2e8f0)',
            borderRadius: 22,
            padding: isMobile ? '1.1rem 1rem' : '1.35rem 1.6rem',
            boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.4)' : '0 8px 24px rgba(99, 102, 241, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Title & Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{
                width: isMobile ? 44 : 52,
                height: isMobile ? 44 : 52,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
                flexShrink: 0
              }}>
                📚
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h1 style={{
                    margin: 0,
                    fontSize: isMobile ? '1.15rem' : '1.45rem',
                    fontWeight: 900,
                    color: 'var(--color-text)',
                    fontFamily: "'Outfit', sans-serif",
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2
                  }}>
                    Soru Bankaları & Takip Kitapları Haritası 🗺️
                  </h1>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)'
                  }}>
                    ODAKLI MOD
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 3 }}>
                  Merhaba <strong>{studentDisplayName.split(' ')[0]}</strong> 👋 • Kitap testlerini adım adım bitir ve seviye atla!
                </div>
              </div>
            </div>

            {/* Quick Action 3D Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setIsManualTestModalOpen(true)}
                className="game-btn-3d game-btn-primary"
                style={{
                  borderRadius: 14,
                  padding: isMobile ? '0.48rem 0.85rem' : '0.55rem 1.15rem',
                  fontSize: isMobile ? '0.78rem' : '0.84rem',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title="Manuel Optik / Test Sonucu Girişi Yap"
              >
                <Edit3 size={16} strokeWidth={2.6} />
                <span>Manuel Test Gir</span>
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="game-btn-3d game-btn-emerald"
                style={{
                  borderRadius: 14,
                  padding: isMobile ? '0.48rem 0.85rem' : '0.55rem 1.15rem',
                  fontSize: isMobile ? '0.78rem' : '0.84rem',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Plus size={16} strokeWidth={2.8} />
                <span>Kendi Kitabını Ekle</span>
              </button>
            </div>
          </div>

          {/* Gamified Bento KPI Pills */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, minmax(0, 1fr))',
            gap: isMobile ? '0.55rem' : '0.85rem'
          }}>
            {/* 1. Toplam Kitap */}
            <div style={{
              background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
              border: isDark ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid #bfdbfe',
              borderRadius: 14,
              padding: isMobile ? '0.6rem 0.55rem' : '0.8rem 1rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                fontWeight: 900,
                color: isDark ? '#93c5fd' : '#2563eb',
                lineHeight: 1
              }}>
                {overallStats.totalBooks}
              </div>
              <div style={{
                fontSize: isMobile ? '0.66rem' : '0.74rem',
                color: 'var(--color-text)',
                fontWeight: 800,
                marginTop: 3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                Toplam Kitap
              </div>
              <div style={{
                fontSize: isMobile ? '0.58rem' : '0.66rem',
                color: 'var(--color-text-muted)',
                fontWeight: 600,
                marginTop: 2
              }}>
                {overallStats.completedBooks} Tamamlandı
              </div>
            </div>

            {/* 2. Genel Başarı */}
            <div style={{
              background: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5',
              border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #bbf7d0',
              borderRadius: 14,
              padding: isMobile ? '0.6rem 0.55rem' : '0.8rem 1rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                fontWeight: 900,
                color: isDark ? '#34d399' : '#059669',
                lineHeight: 1
              }}>
                %{overallStats.successRate}
              </div>
              <div style={{
                fontSize: isMobile ? '0.66rem' : '0.74rem',
                color: 'var(--color-text)',
                fontWeight: 800,
                marginTop: 3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                Genel Başarı
              </div>
              <div style={{
                fontSize: isMobile ? '0.58rem' : '0.66rem',
                color: 'var(--color-text-muted)',
                fontWeight: 600,
                marginTop: 2
              }}>
                {overallStats.totalD} Doğru / {overallStats.totalQ} Soru
              </div>
            </div>

            {/* 3. Test İlerlemesi */}
            <div style={{
              background: isDark ? 'rgba(139, 92, 246, 0.1)' : '#f5f3ff',
              border: isDark ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid #ddd6fe',
              borderRadius: 14,
              padding: isMobile ? '0.6rem 0.55rem' : '0.8rem 1rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                fontWeight: 900,
                color: isDark ? '#c4b5fd' : '#7c3aed',
                lineHeight: 1
              }}>
                %{overallStats.progressRate}
              </div>
              <div style={{
                fontSize: isMobile ? '0.66rem' : '0.74rem',
                color: 'var(--color-text)',
                fontWeight: 800,
                marginTop: 3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                Test İlerlemesi
              </div>
              <div style={{
                fontSize: isMobile ? '0.58rem' : '0.66rem',
                color: 'var(--color-text-muted)',
                fontWeight: 600,
                marginTop: 2
              }}>
                {overallStats.totalSolved} / {overallStats.totalAssigned} Test
              </div>
            </div>

            {/* 4. Kitap XP ve Seviye */}
            <div style={{
              background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
              border: isDark ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid #fde68a',
              borderRadius: 14,
              padding: isMobile ? '0.6rem 0.55rem' : '0.8rem 1rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                fontWeight: 900,
                color: isDark ? '#fbbf24' : '#d97706',
                lineHeight: 1
              }}>
                +{overallStats.totalXp} XP
              </div>
              <div style={{
                fontSize: isMobile ? '0.66rem' : '0.74rem',
                color: 'var(--color-text)',
                fontWeight: 800,
                marginTop: 3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                Kazanılan Kitap XP
              </div>
              <div style={{
                fontSize: isMobile ? '0.58rem' : '0.66rem',
                color: 'var(--color-text-muted)',
                fontWeight: 600,
                marginTop: 2
              }}>
                🏆 {overallStats.completedBooks} Kupa Tamamlandı
              </div>
            </div>
          </div>
        </div>

        {/* ── SEGMENTED NAVIGATION TABS ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 8,
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
          padding: '0.4rem',
          borderRadius: 16,
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1.5px solid #e2e8f0',
          boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          {[
            { id: 'kitaplar', label: isMobile ? 'Kitaplarım' : '📚 Kitaplarım & Görev Haritası', icon: BookOpen },
            { id: 'grafikler', label: isMobile ? 'Grafikler' : '📊 İlerleme & Başarı Grafikleri', icon: BarChart2 },
            { id: 'analiz', label: isMobile ? 'Hata Teşhisi' : '🧠 Hata & Yanlış Sebepleri', icon: Zap }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="tab-btn-pill"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: isMobile ? '0.55rem 0.6rem' : '0.65rem 1rem',
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.78rem' : '0.86rem',
                  fontFamily: "'Outfit', sans-serif",
                  background: isActive
                    ? 'linear-gradient(135deg, #0284c7, #2563eb)'
                    : 'transparent',
                  color: isActive ? '#ffffff' : (isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b'),
                  boxShadow: isActive ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none'
                }}
              >
                <Icon size={isMobile ? 14 : 16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 1: KİTAPLARIM & GÖREV HARİTASI (FOCUSED BOOKS HUB)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'kitaplar' && (
          <div className="books-anim-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>

            {/* Quick Status Filters + Search + Sort Bar */}
            {assignedBooks.length > 0 && (
              <div
                className="game-card-elevated"
                style={{
                  background: 'var(--color-surface, #ffffff)',
                  border: '1.5px solid var(--color-border, #e2e8f0)',
                  borderRadius: 18,
                  padding: isMobile ? '0.85rem 0.75rem' : '1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: isDark ? '0 6px 18px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                {/* 1. Row: Status Filter Chips */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  overflowX: 'auto',
                  paddingBottom: 2,
                  scrollbarWidth: 'none'
                }}>
                  {[
                    { id: 'all', label: `Tümü (${overallStats.totalBooks})`, icon: '📚' },
                    { id: 'in_progress', label: `Devam Edenler (${overallStats.inProgressBooks})`, icon: '⚡' },
                    { id: 'completed', label: `Tamamlananlar (${overallStats.completedBooks})`, icon: '🏆' },
                    ...(overallStats.urgentBooks > 0 ? [{ id: 'urgent', label: `Hedef Yaklaşan (${overallStats.urgentBooks})`, icon: '🔥' }] : [])
                  ].map(chip => {
                    const isSelected = statusFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        onClick={() => setStatusFilter(chip.id)}
                        className="filter-chip-pill"
                        style={{
                          background: isSelected
                            ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                            : (isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'),
                          color: isSelected ? '#ffffff' : 'var(--color-text-secondary)',
                          border: isSelected ? '1px solid #818cf8' : '1px solid var(--color-border)',
                          borderRadius: 10,
                          padding: isMobile ? '0.38rem 0.65rem' : '0.45rem 0.85rem',
                          fontWeight: 800,
                          fontSize: isMobile ? '0.72rem' : '0.78rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          whiteSpace: 'nowrap',
                          boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.35)' : 'none'
                        }}
                      >
                        <span>{chip.icon}</span>
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 2. Row: Search & Sort Tools */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.65rem'
                }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '1 1 260px' }}>
                    <Search
                      size={15}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)'
                      }}
                    />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Kitap veya yayınevi ara..."
                      style={{
                        width: '100%',
                        paddingLeft: 34,
                        paddingRight: 12,
                        paddingTop: isMobile ? 8 : 9,
                        paddingBottom: isMobile ? 8 : 9,
                        borderRadius: 12,
                        border: '1.5px solid var(--color-border-input)',
                        fontSize: isMobile ? '0.8rem' : '0.86rem',
                        fontWeight: 700,
                        background: 'var(--color-surface)',
                        outline: 'none',
                        color: 'var(--color-text)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Sort Pills */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                    padding: 3,
                    borderRadius: 11,
                    border: '1px solid var(--color-border)',
                    flex: isMobile ? '1 1 auto' : 'none'
                  }}>
                    {[
                      { key: 'progress', label: '📊 İlerleme' },
                      { key: 'success', label: '🏆 Başarı' },
                      { key: 'title', label: '🔤 A-Z' },
                    ].map(s => (
                      <button
                        key={s.key}
                        onClick={() => setSortBy(s.key)}
                        style={{
                          flex: isMobile ? 1 : 'none',
                          padding: isMobile ? '0.35rem 0.55rem' : '0.4rem 0.85rem',
                          borderRadius: 8,
                          border: 'none',
                          fontWeight: 800,
                          fontSize: isMobile ? '0.7rem' : '0.76rem',
                          cursor: 'pointer',
                          background: sortBy === s.key ? '#6366f1' : 'transparent',
                          color: sortBy === s.key ? '#ffffff' : 'var(--color-text-muted)',
                          boxShadow: sortBy === s.key ? '0 2px 6px rgba(99, 102, 241, 0.3)' : 'none',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <span style={{ fontSize: isMobile ? '0.72rem' : '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)', marginLeft: isMobile ? 'auto' : 0 }}>
                    {displayedBooks.length} kitap listeleniyor
                  </span>
                </div>
              </div>
            )}

            {/* ── BOOK QUEST CARDS GRID ── */}
            {assignedBooks.length === 0 ? (
              booksLoading ? (
                <div style={{
                  background: 'var(--color-surface)',
                  borderRadius: 20,
                  padding: isMobile ? '3rem 1.25rem' : '4rem 2rem',
                  textAlign: 'center',
                  border: '1.5px solid var(--color-border)'
                }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    border: '4px solid var(--color-border)',
                    borderTopColor: '#6366f1',
                    borderRadius: '50%',
                    animation: 'spin 0.9s linear infinite',
                    margin: '0 auto 14px'
                  }} />
                  <div style={{ fontWeight: 800, fontSize: isMobile ? '0.86rem' : '0.96rem', color: 'var(--color-text-muted)' }}>
                    Kitaplar ve ilerleme haritası yükleniyor…
                  </div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <div style={{
                  background: 'var(--color-surface)',
                  borderRadius: 22,
                  padding: isMobile ? '3rem 1.25rem' : '5rem 2rem',
                  textAlign: 'center',
                  border: '1.5px solid var(--color-border)',
                  boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: isMobile ? 68 : 88,
                    height: isMobile ? 68 : 88,
                    background: 'rgba(37,99,235,0.12)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    border: '2px solid #3b82f6',
                    fontSize: isMobile ? '2rem' : '2.5rem'
                  }}>
                    📚
                  </div>
                  <h2 style={{ margin: '0 0 6px', color: 'var(--color-text)', fontWeight: 900, fontSize: isMobile ? '1.2rem' : '1.5rem', fontFamily: "'Outfit', sans-serif" }}>
                    Henüz Atanmış Kitap Yok
                  </h2>
                  <p style={{ color: 'var(--color-text-muted)', margin: '0 auto 20px', maxWidth: 460, fontSize: isMobile ? '0.82rem' : '0.92rem', fontWeight: 600 }}>
                    Öğretmenin sana bir kitap atadığında burada görünecek veya hemen kendi soru bankanı ekleyip haritanı başlatabilirsin!
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="game-btn-3d game-btn-emerald"
                    style={{
                      padding: isMobile ? '0.65rem 1.25rem' : '0.75rem 1.6rem',
                      borderRadius: 14,
                      fontWeight: 900,
                      fontSize: isMobile ? '0.82rem' : '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Plus size={16} strokeWidth={2.8} /> Kendi Kitabını Ekle
                  </button>
                </div>
              )
            ) : displayedBooks.length === 0 ? (
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: 20,
                padding: '3rem 1.5rem',
                textAlign: 'center',
                border: '1.5px solid var(--color-border)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔍</div>
                <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--color-text)' }}>Aranan Kriterde Kitap Bulunamadı</h3>
                <p style={{ margin: '4px 0 14px', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Filtreleri veya arama kelimesini temizleyerek tüm kitaplarına erişebilirsin.</p>
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  className="game-btn-3d"
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 10,
                    background: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    color: 'var(--color-text)'
                  }}
                >
                  Filtreleri Temizle
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: isMobile ? '0.95rem' : '1.25rem'
              }}>
                {displayedBooks.map((book, bookIdx) => {
                  const pal = palette(bookIdx);
                  const isCompleted = book.progressPct >= 100;
                  const pct = book.progressPct || 0;
                  const urgentDue = book.remainingDays !== undefined && book.remainingDays <= 3 && !isCompleted;

                  return (
                    <div
                      key={book.id || bookIdx}
                      onClick={() => navigate(`/student/books/${book.id}`)}
                      className="book-quest-card game-card-elevated"
                      style={{
                        background: 'var(--color-surface)',
                        borderRadius: 22,
                        border: isCompleted
                          ? '2px solid #10b981'
                          : urgentDue
                          ? '2px solid #ef4444'
                          : '1.5px solid var(--color-border)',
                        padding: isMobile ? '1.1rem 1rem' : '1.35rem',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: isCompleted
                          ? '0 6px 24px rgba(16, 185, 129, 0.16)'
                          : urgentDue
                          ? '0 6px 24px rgba(239, 68, 68, 0.16)'
                          : '0 4px 18px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      {/* Top Gradient Banner Stripe */}
                      <div style={{
                        height: 5,
                        background: isCompleted ? 'linear-gradient(90deg, #10b981, #059669)' : `linear-gradient(90deg, ${pal.from}, ${pal.to})`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0
                      }} />

                      {/* Header row: Book Cover + Details + Badges */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                          {/* 3D Book Spine Cover */}
                          <div style={{
                            width: isMobile ? 50 : 62,
                            height: isMobile ? 68 : 84,
                            borderRadius: 12,
                            background: `linear-gradient(145deg, ${pal.from}, ${pal.to})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 8px 20px ${pal.shadow}`,
                            flexShrink: 0,
                            position: 'relative'
                          }}>
                            <BookMarked size={isMobile ? 24 : 30} color="#ffffff" />
                            {isCompleted && (
                              <div style={{
                                position: 'absolute',
                                bottom: -6,
                                background: '#10b981',
                                color: '#ffffff',
                                borderRadius: 99,
                                width: 20,
                                height: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(16,185,129,0.5)',
                                fontSize: '0.65rem'
                              }}>
                                ✓
                              </div>
                            )}
                          </div>

                          {/* Top Badges */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            {isCompleted ? (
                              <span style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#ffffff',
                                padding: '3px 9px',
                                borderRadius: 99,
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 2px 8px rgba(16,185,129,0.35)'
                              }}>
                                <Star size={11} fill="#ffffff" /> TAMAMLANDI
                              </span>
                            ) : urgentDue ? (
                              <span style={{
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: '#ffffff',
                                padding: '3px 9px',
                                borderRadius: 99,
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 2px 8px rgba(239,68,68,0.35)'
                              }}>
                                ⚡ {book.remainingDays} GÜN KALDI
                              </span>
                            ) : book.remainingDays !== undefined ? (
                              <span style={{
                                background: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb',
                                color: '#f59e0b',
                                border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #fde68a',
                                padding: '2px 8px',
                                borderRadius: 8,
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <Clock size={11} /> {book.remainingDays} gün
                              </span>
                            ) : (
                              <span className="game-badge-xp" style={{ fontSize: '0.64rem', padding: '2px 7px' }}>
                                +{isCompleted ? '100' : '50'} XP
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title and Publisher */}
                        <div style={{ marginBottom: 12 }}>
                          <h3 style={{
                            margin: '0 0 3px',
                            fontSize: isMobile ? '0.98rem' : '1.12rem',
                            fontWeight: 900,
                            color: 'var(--color-text)',
                            lineHeight: 1.3,
                            fontFamily: "'Outfit', sans-serif"
                          }}>
                            {book.title}
                          </h3>
                          <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                            {book.publisher || 'Kaynak Kitap'}
                          </div>

                          {/* Subject tags */}
                          <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                            {(book.subjects || []).slice(0, 3).map((s, i) => (
                              <span
                                key={i}
                                style={{
                                  background: 'var(--color-surface-hover)',
                                  color: 'var(--color-text)',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: 6,
                                  padding: '2px 7px',
                                  fontSize: '0.66rem',
                                  fontWeight: 800
                                }}
                              >
                                {s?.name || s}
                              </span>
                            ))}
                            {(book.subjects || []).length > 3 && (
                              <span style={{
                                background: 'var(--color-surface)',
                                color: 'var(--color-text-muted)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 6,
                                padding: '2px 7px',
                                fontSize: '0.66rem',
                                fontWeight: 800
                              }}>
                                +{(book.subjects || []).length - 3}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Section */}
                        <div style={{
                          background: isDark ? 'rgba(255,255,255,0.03)' : 'var(--color-surface-hover)',
                          borderRadius: 16,
                          padding: isMobile ? '0.75rem 0.85rem' : '0.85rem 1rem',
                          marginBottom: 12,
                          border: '1px solid var(--color-border)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: '0.66rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Test İlerlemesi
                              </div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--color-text)', marginTop: 2 }}>
                                {book.totalSolvedTests} <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>/ {book.totalAssignedTests} test</span>
                              </div>
                            </div>

                            <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CircularProgress pct={pct} size={44} stroke={4} color={isCompleted ? '#10b981' : pal.to} />
                              <div style={{ position: 'absolute', fontSize: '0.66rem', fontWeight: 900, color: isCompleted ? '#10b981' : 'var(--color-text)' }}>
                                %{pct}
                              </div>
                            </div>
                          </div>

                          {/* Linear Gradient Progress bar */}
                          <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: isCompleted ? '#10b981' : `linear-gradient(90deg, ${pal.from}, ${pal.to})`,
                                borderRadius: 99,
                                transition: 'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)'
                              }}
                            />
                          </div>
                        </div>

                        {/* 4 Mini Bento Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 14 }}>
                          {[
                            { label: 'Doğru', value: book.totalCorrect, color: '#10b981', bg: isDark ? 'rgba(16, 185, 129, 0.14)' : '#f0fdf4', border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#bbf7d0' },
                            { label: 'Yanlış', value: book.totalWrong, color: '#ef4444', bg: isDark ? 'rgba(239, 68, 68, 0.14)' : '#fef2f2', border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca' },
                            { label: 'Boş', value: book.totalBlank, color: 'var(--color-text-muted)', bg: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f8fafc', border: isDark ? 'rgba(148, 163, 184, 0.25)' : '#e2e8f0' },
                            { label: 'Başarı', value: `%${book.successRate}`, color: '#2563eb', bg: isDark ? 'rgba(37, 99, 235, 0.14)' : '#eff6ff', border: isDark ? 'rgba(37, 99, 235, 0.3)' : '#bfdbfe' },
                          ].map((s, i) => (
                            <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '0.4rem 0.2rem', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.58rem', color: s.color, fontWeight: 900, textTransform: 'uppercase' }}>{s.label}</div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 900, color: s.color, marginTop: 1 }}>{s.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 3D Action Button */}
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/student/books/${book.id}`); }}
                        className={`game-btn-3d ${isCompleted ? '' : 'game-btn-primary'}`}
                        style={{
                          width: '100%',
                          padding: isMobile ? '0.62rem' : '0.72rem',
                          background: isCompleted ? 'var(--color-surface-hover, #f1f5f9)' : `linear-gradient(135deg, ${pal.from}, ${pal.to})`,
                          color: isCompleted ? 'var(--color-text)' : '#ffffff',
                          border: isCompleted ? '1.5px solid var(--color-border)' : 'none',
                          borderRadius: 12,
                          fontWeight: 900,
                          fontSize: isMobile ? '0.8rem' : '0.86rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        {isCompleted ? '📋 Haritayı Görüntüle' : '▶ Kitaba Devam Et'}
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2: İLERLEME & BAŞARI GRAFİKLERİ (ANALYTICS HUB)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'grafikler' && (
          <div className="books-anim-in game-card-elevated" style={{
            background: 'var(--color-surface, #ffffff)',
            borderRadius: 22,
            border: '1.5px solid var(--color-border)',
            boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 8px 24px rgba(99,102,241,0.08)',
            padding: isMobile ? '1.1rem 0.95rem' : '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {/* Header + Mode Switcher */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              paddingBottom: '0.85rem',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart2 size={20} color="#6366f1" />
                  <span>Soru & Başarı Analizi</span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Kitap ve ders bazında doğru, yanlış, boş ve başarı yüzdelerini incele
                </p>
              </div>

              {/* View & Metric Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Books vs Subjects toggle */}
                <div style={{ display: 'flex', background: 'var(--color-surface-hover)', padding: 3, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                  <button
                    onClick={() => setBookChartViewMode('books')}
                    style={{
                      padding: isMobile ? '0.28rem 0.6rem' : '0.35rem 0.8rem',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: isMobile ? '0.72rem' : '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: bookChartViewMode === 'books' ? '#4f46e5' : 'transparent',
                      color: bookChartViewMode === 'books' ? '#ffffff' : 'var(--color-text-muted)',
                      boxShadow: bookChartViewMode === 'books' ? '0 2px 8px rgba(79,70,229,0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    📚 Kitaplar
                  </button>
                  <button
                    onClick={() => setBookChartViewMode('subjects')}
                    style={{
                      padding: isMobile ? '0.28rem 0.6rem' : '0.35rem 0.8rem',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: isMobile ? '0.72rem' : '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: bookChartViewMode === 'subjects' ? '#4f46e5' : 'transparent',
                      color: bookChartViewMode === 'subjects' ? '#ffffff' : 'var(--color-text-muted)',
                      boxShadow: bookChartViewMode === 'subjects' ? '0 2px 8px rgba(79,70,229,0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    🎓 Dersler
                  </button>
                </div>

                {/* Metric toggle */}
                <div style={{ display: 'flex', background: 'var(--color-surface-hover)', padding: 3, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                  <button
                    onClick={() => setBookChartMetric('grouped')}
                    style={{
                      padding: isMobile ? '0.28rem 0.6rem' : '0.35rem 0.8rem',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: isMobile ? '0.72rem' : '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: bookChartMetric === 'grouped' ? '#6366f1' : 'transparent',
                      color: bookChartMetric === 'grouped' ? '#ffffff' : 'var(--color-text-muted)',
                      boxShadow: bookChartMetric === 'grouped' ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isMobile ? '📊 D / Y / B' : '📊 Soru Dağılımı'}
                  </button>
                  <button
                    onClick={() => setBookChartMetric('rate')}
                    style={{
                      padding: isMobile ? '0.28rem 0.6rem' : '0.35rem 0.8rem',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: isMobile ? '0.72rem' : '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: bookChartMetric === 'rate' ? '#6366f1' : 'transparent',
                      color: bookChartMetric === 'rate' ? '#ffffff' : 'var(--color-text-muted)',
                      boxShadow: bookChartMetric === 'rate' ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isMobile ? '🎯 Başarı %' : '🎯 Başarı %'}
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Mini Cards (Books or Subjects) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(auto-fit, minmax(135px, 1fr))' : 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: isMobile ? 8 : 10
            }}>
              {activeChartData.map((item, idx) => {
                const rateColor = item.rate >= 70 ? '#10b981' : item.rate >= 50 ? '#f59e0b' : item.totalQ === 0 ? '#94a3b8' : '#ef4444';
                const rateBg = isDark ? (item.rate >= 70 ? 'rgba(16, 185, 129, 0.12)' : item.rate >= 50 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)') : (item.rate >= 70 ? '#f0fdf4' : item.rate >= 50 ? '#fffbeb' : '#fff1f2');
                const rateBorder = isDark ? (item.rate >= 70 ? 'rgba(16, 185, 129, 0.3)' : item.rate >= 50 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)') : (item.rate >= 70 ? '#bbf7d0' : item.rate >= 50 ? '#fde68a' : '#fecdd3');

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
                      borderRadius: 14,
                      padding: isMobile ? '0.65rem 0.75rem' : '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      cursor: bookChartViewMode === 'books' && item.id ? 'pointer' : 'default',
                      transition: 'all 0.18s ease'
                    }}
                    title={bookChartViewMode === 'books' && item.id ? `${item.fullName} haritasına git` : item.fullName}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: isMobile ? '0.78rem' : '0.86rem', fontWeight: 900, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.fullName}
                      </span>
                      <span style={{ fontSize: isMobile ? '0.84rem' : '0.94rem', fontWeight: 900, color: rateColor }}>
                        %{item.rate}
                      </span>
                    </div>

                    {/* Multi-segment mini progress bar */}
                    <div style={{ width: '100%', height: 6, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 1 }}>
                      {totalQ > 0 ? (
                        <>
                          {pctD > 0 && <div style={{ width: `${pctD}%`, background: '#10b981', height: '100%' }} title={`Doğru: ${item.Doğru}`} />}
                          {pctY > 0 && <div style={{ width: `${pctY}%`, background: '#ef4444', height: '100%' }} title={`Yanlış: ${item.Yanlış}`} />}
                          {pctB > 0 && <div style={{ width: `${pctB}%`, background: '#94a3b8', height: '100%' }} title={`Boş: ${item.Boş}`} />}
                        </>
                      ) : (
                        <div style={{ width: '100%', background: 'var(--color-border)', height: '100%' }} />
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: isMobile ? '0.66rem' : '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                      <span>%{item.progress} İlerleme</span>
                      <span style={{ display: 'flex', gap: 5, fontWeight: 800 }}>
                        <span style={{ color: '#10b981' }}>{item.Doğru}D</span>
                        <span style={{ color: '#ef4444' }}>{item.Yanlış}Y</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{item.Boş}B</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recharts Bar Chart Component */}
            <div style={{ width: '100%', height: isMobile ? 240 : 320, minWidth: 0, marginTop: 6 }}>
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
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12, fill: 'var(--color-text)', fontWeight: 800 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12, fill: 'var(--color-text-muted)', fontWeight: 700 }} tickFormatter={v => bookChartMetric === 'rate' ? `%${v}` : v} domain={bookChartMetric === 'rate' ? [0, 100] : ['auto', 'auto']} />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    contentStyle={{ background: 'var(--color-surface)', borderRadius: 14, border: '1.5px solid var(--color-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)' }}
                    formatter={(value, name) => [
                      bookChartMetric === 'rate' ? `%${value} Başarı` : `${value} Soru`,
                      name
                    ]}
                  />
                  <Legend wrapperStyle={{ paddingTop: 10, fontSize: isMobile ? '0.74rem' : '0.82rem', fontWeight: 800 }} />

                  {bookChartMetric === 'grouped' ? (
                    <>
                      <Bar dataKey="Doğru" name="🟢 Doğru" fill="url(#booksCorrectGrad)" radius={[8, 8, 2, 2]} />
                      <Bar dataKey="Yanlış" name="🔴 Yanlış" fill="url(#booksWrongGrad)" radius={[8, 8, 2, 2]} />
                      <Bar dataKey="Boş" name="⚪ Boş" fill="url(#booksBlankGrad)" radius={[8, 8, 2, 2]} />
                    </>
                  ) : (
                    <Bar dataKey="rate" name="🎯 Başarı Oranı (%)" fill="#6366f1" radius={[6, 6, 0, 0]}>
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

        {/* ═══════════════════════════════════════════════════════════════
            TAB 3: HATA & YANLIŞ SEBEPLERİ TEŞHİSİ (DIAGNOSTICS HUB)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'analiz' && (
          <div className="books-anim-in game-card-elevated" style={{
            background: 'var(--color-surface, #ffffff)',
            borderRadius: 22,
            border: '1.5px solid var(--color-border)',
            boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 8px 24px rgba(99,102,241,0.08)',
            padding: isMobile ? '1.1rem 0.95rem' : '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingBottom: '0.85rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: isMobile ? 34 : 40,
                  height: isMobile ? 34 : 40,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(217,119,6,0.3)',
                  flexShrink: 0
                }}>
                  <Zap size={isMobile ? 18 : 22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.18rem', fontWeight: 900, color: 'var(--color-text)', fontFamily: "'Outfit', sans-serif" }}>
                    Kitap & Test Hata Sebepleri Teşhis Analizi 🤔
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Yanlış ve boş bırakılan soruların kök nedenlerini analiz et
                  </p>
                </div>
              </div>

              {/* Status pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: isMobile ? '0.7rem' : '0.76rem', fontWeight: 800, flexWrap: 'wrap' }}>
                <span style={{ background: 'var(--color-surface-hover)', padding: '3px 8px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  Yanlış & Boş: <strong style={{ color: 'var(--color-text)' }}>{bookMistakeStats.totalWrongAndBlank}</strong>
                </span>
                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '3px 8px', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  Teşhis Edilen: <strong>{bookMistakeStats.totalClassified}</strong>
                </span>
                <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '3px 8px', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  Bekleyen: <strong>{bookMistakeStats.unclassifiedCount}</strong>
                </span>
              </div>
            </div>

            {/* Multi-segment Progress Bar */}
            {bookMistakeStats.totalClassified > 0 && (
              <div style={{
                width: '100%',
                height: 10,
                borderRadius: 99,
                background: 'var(--color-surface-hover, #f1f5f9)',
                overflow: 'hidden',
                display: 'flex',
                border: '1px solid var(--color-border)'
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
            )}

            {/* 5 Reason Bento Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
              gap: isMobile ? '0.65rem' : '0.85rem'
            }}>
              {Object.values(bookMistakeStats.reasonDefs).map((r, i) => {
                const pct = bookMistakeStats.totalClassified > 0 ? Math.round((r.count / bookMistakeStats.totalClassified) * 100) : 0;
                const isLastOnMobile = isMobile && i === 4;
                return (
                  <div
                    key={r.key}
                    style={{
                      background: r.count > 0 ? r.bg : 'var(--color-surface-hover)',
                      border: `1.5px solid ${r.count > 0 ? r.border : 'var(--color-border)'}`,
                      borderRadius: 14,
                      padding: isMobile ? '0.75rem 0.85rem' : '0.95rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      gridColumn: isLastOnMobile ? 'span 2' : 'auto',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span style={{ fontSize: isMobile ? '0.74rem' : '0.8rem', fontWeight: 900, color: r.count > 0 ? r.color : 'var(--color-text-muted)' }}>
                        {r.key}
                      </span>
                      <span style={{ fontSize: isMobile ? '0.82rem' : '0.88rem', fontWeight: 900, color: r.count > 0 ? r.color : 'var(--color-text-muted)' }}>
                        %{pct}
                      </span>
                    </div>
                    <div style={{ fontSize: isMobile ? '1.15rem' : '1.3rem', fontWeight: 900, color: 'var(--color-text)', marginTop: 2 }}>
                      {r.count} <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>soru</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Smart Coaching Tip */}
            {bookMistakeStats.topReason && bookMistakeStats.topReason.count > 0 ? (
              <div style={{
                background: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
                border: '1.5px dashed #818cf8',
                borderRadius: 14,
                padding: isMobile ? '0.75rem 0.85rem' : '0.95rem 1.15rem',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: isMobile ? '0.76rem' : '0.84rem',
                color: 'var(--color-text)'
              }}>
                <span style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', flexShrink: 0 }}>💡</span>
                <div style={{ lineHeight: 1.45 }}>
                  <strong>Kitap Çalışma İpucu:</strong> En yaygın hata nedeniniz <strong style={{ color: bookMistakeStats.topReason.color }}>{bookMistakeStats.topReason.key}</strong> (%{Math.round((bookMistakeStats.topReason.count / bookMistakeStats.totalClassified) * 100)}).
                  {bookMistakeStats.topReason.key.includes('Dikkat') && ' Soru köklerine ve altı çizili ifadelere odaklanarak test çözmeniz dikkat hatalarını sıfırlayacaktır.'}
                  {bookMistakeStats.topReason.key.includes('İşlem') && ' Karalama alanında adımları alt alta düzenli yazmanız işlem hatalarını önler.'}
                  {bookMistakeStats.topReason.key.includes('Konu') && ' Konu özetlerini ve çözümlü örnekleri tekrar çalıştıktan sonra yeni teste geçmeniz önerilir.'}
                  {bookMistakeStats.topReason.key.includes('Formül') && ' Formül özetlerini test öncesi 2 dakika gözden geçirebilirsiniz.'}
                  {bookMistakeStats.topReason.key.includes('Zaman') && ' Soru başına süre tutarak çalışmanız pratikliğinizi artıracaktır.'}
                </div>
              </div>
            ) : null}

            {/* Collapsible Questions List */}
            {bookMistakeStats.questionsList.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowClassifiedQuestions(p => !p)}
                  className="game-btn-3d"
                  style={{
                    background: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    color: '#6366f1',
                    fontSize: isMobile ? '0.74rem' : '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.45rem 0.85rem'
                  }}
                >
                  <span>{showClassifiedQuestions ? '▲ Soru Listesini Gizle' : `▼ Sınıflandırılan Soruları İncele (${bookMistakeStats.questionsList.length} Soru)`}</span>
                </button>

                {showClassifiedQuestions && (
                  <div style={{
                    marginTop: 10,
                    background: 'var(--color-surface-hover)',
                    borderRadius: 14,
                    border: '1px solid var(--color-border)',
                    padding: isMobile ? '0.65rem' : '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 7,
                    maxHeight: 280,
                    overflowY: 'auto'
                  }}>
                    {bookMistakeStats.questionsList.map(item => (
                      <div
                        key={item.id}
                        style={{
                          background: 'var(--color-surface)',
                          border: `1.5px solid ${item.def.border}`,
                          borderRadius: 10,
                          padding: isMobile ? '0.45rem 0.65rem' : '0.55rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          fontSize: isMobile ? '0.72rem' : '0.78rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                          <span style={{ fontWeight: 800, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.bookTitle}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>{item.subject}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                          <span style={{ fontWeight: 800, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>S.{item.qNo}</span>
                        </div>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: 6,
                          background: item.def.bg,
                          color: item.def.color,
                          fontWeight: 800,
                          fontSize: isMobile ? '0.66rem' : '0.72rem',
                          border: `1px solid ${item.def.border}`,
                          whiteSpace: 'nowrap',
                          flexShrink: 0
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

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ADD BOOK MODAL (GAMIFIED & MOBILE FRIENDLY)
      ═══════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-modal-overlay, rgba(0,0,0,0.65))',
          backdropFilter: 'blur(8px)',
          padding: isMobile ? '0.75rem' : '1.25rem'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            borderRadius: 22,
            width: '100%',
            maxWidth: 520,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: isMobile ? '1.25rem 1rem' : '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.15rem',
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
            animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 3px', fontSize: isMobile ? '1.2rem' : '1.35rem', fontWeight: 900, color: 'var(--color-text)', fontFamily: "'Outfit', sans-serif" }}>
                  Kendi Kitabını Ekle 📚
                </h2>
                <p style={{ margin: 0, fontSize: isMobile ? '0.72rem' : '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Çalışmak istediğin soru bankasını haritana dahil et
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{
                  background: 'var(--color-surface-hover)',
                  border: 'none',
                  borderRadius: 10,
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {[
                { label: 'Kitap Adı', key: 'title', placeholder: 'Örn: TYT Matematik Soru Bankası' },
                { label: 'Yayınevi', key: 'publisher', placeholder: 'Örn: 3D Yayınları' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)' }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={newBook[field.key]}
                    onChange={e => setNewBook(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{
                      width: '100%',
                      padding: isMobile ? '0.65rem 0.8rem' : '0.75rem 0.9rem',
                      borderRadius: 12,
                      border: '1.5px solid var(--color-border-input)',
                      fontSize: isMobile ? '0.84rem' : '0.9rem',
                      fontWeight: 700,
                      outline: 'none',
                      background: 'var(--color-surface-hover)',
                      color: 'var(--color-text)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}

              {/* Option Count (4 or 5) */}
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)' }}>
                  Optik Form Seçenek Sayısı (Seviye)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: isMobile ? '0.55rem 0.7rem' : '0.65rem 0.85rem',
                    borderRadius: 12,
                    border: `1.5px solid ${newBook.optionCount === 4 ? '#3b82f6' : 'var(--color-border)'}`,
                    background: newBook.optionCount === 4 ? 'rgba(37,99,235,0.12)' : 'var(--color-surface-hover)',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="studentBookOptionCount"
                      value={4}
                      checked={newBook.optionCount === 4}
                      onChange={() => setNewBook(p => ({ ...p, optionCount: 4 }))}
                      style={{ accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)' }}>4 Seçenek (A-D)</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Ortaokul / LGS</div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: isMobile ? '0.55rem 0.7rem' : '0.65rem 0.85rem',
                    borderRadius: 12,
                    border: `1.5px solid ${newBook.optionCount === 5 ? '#3b82f6' : 'var(--color-border)'}`,
                    background: newBook.optionCount === 5 ? 'rgba(37,99,235,0.12)' : 'var(--color-surface-hover)',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="studentBookOptionCount"
                      value={5}
                      checked={newBook.optionCount === 5}
                      onChange={() => setNewBook(p => ({ ...p, optionCount: 5 }))}
                      style={{ accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)' }}>5 Seçenek (A-E)</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Lise / YKS</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Subjects / Sections */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--color-border)' }}>
                  Dersler / Bölümler
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {newBook.subjects.map((subj, idx) => (
                    <div key={subj.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={subj.name}
                        placeholder={`Ders Adı ${idx + 1}`}
                        onChange={e => {
                          const s = [...newBook.subjects];
                          s[idx].name = e.target.value;
                          setNewBook({ ...newBook, subjects: s });
                        }}
                        style={{
                          flex: 2,
                          padding: isMobile ? '0.5rem 0.65rem' : '0.6rem 0.75rem',
                          borderRadius: 10,
                          border: '1.5px solid var(--color-border-input)',
                          fontSize: isMobile ? '0.78rem' : '0.82rem',
                          fontWeight: 700,
                          outline: 'none',
                          background: 'var(--color-surface-hover)',
                          color: 'var(--color-text)'
                        }}
                      />
                      <input
                        type="number"
                        min="1"
                        value={subj.testCount}
                        title="Test Sayısı"
                        onChange={e => {
                          const s = [...newBook.subjects];
                          s[idx].testCount = Number(e.target.value);
                          setNewBook({ ...newBook, subjects: s });
                        }}
                        style={{
                          width: isMobile ? 56 : 64,
                          padding: isMobile ? '0.5rem 0.4rem' : '0.6rem 0.5rem',
                          borderRadius: 10,
                          border: '1.5px solid var(--color-border-input)',
                          fontSize: isMobile ? '0.78rem' : '0.82rem',
                          fontWeight: 700,
                          outline: 'none',
                          textAlign: 'center',
                          background: 'var(--color-surface-hover)',
                          color: 'var(--color-text)'
                        }}
                      />
                      <input
                        type="number"
                        min="1"
                        value={subj.questionsPerTest}
                        title="Test başına soru"
                        onChange={e => {
                          const s = [...newBook.subjects];
                          s[idx].questionsPerTest = Number(e.target.value);
                          setNewBook({ ...newBook, subjects: s });
                        }}
                        style={{
                          width: isMobile ? 56 : 64,
                          padding: isMobile ? '0.5rem 0.4rem' : '0.6rem 0.5rem',
                          borderRadius: 10,
                          border: '1.5px solid var(--color-border-input)',
                          fontSize: isMobile ? '0.78rem' : '0.82rem',
                          fontWeight: 700,
                          outline: 'none',
                          textAlign: 'center',
                          background: 'var(--color-surface-hover)',
                          color: 'var(--color-text)'
                        }}
                      />
                      <button
                        onClick={() => {
                          const s = newBook.subjects.filter((_, i) => i !== idx);
                          setNewBook({ ...newBook, subjects: s });
                        }}
                        disabled={newBook.subjects.length <= 1}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: 'none',
                          background: newBook.subjects.length > 1 ? '#fee2e2' : 'var(--color-surface-hover)',
                          color: newBook.subjects.length > 1 ? '#ef4444' : 'var(--color-text-muted)',
                          cursor: newBook.subjects.length > 1 ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 4, fontSize: '0.66rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
                    <span style={{ flex: 2 }}>Ders Adı</span>
                    <span style={{ width: isMobile ? 56 : 64, textAlign: 'center' }}>Test</span>
                    <span style={{ width: isMobile ? 56 : 64, textAlign: 'center' }}>Soru</span>
                    <span style={{ width: 32 }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewBook(p => ({ ...p, subjects: [...p.subjects, { id: `sub_${Date.now()}`, name: '', testCount: 20, questionsPerTest: 20 }] }))}
                    style={{
                      padding: '0.55rem',
                      background: 'rgba(37,99,235,0.12)',
                      color: '#60a5fa',
                      border: '1.5px dashed #3b82f6',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.76rem' : '0.8rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      marginTop: 4
                    }}
                  >
                    <Plus size={14} /> Yeni Ders Ekle
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveNewBook}
              disabled={isSaving || !newBook.title || !newBook.publisher || newBook.subjects.every(s => !s.name)}
              className="game-btn-3d game-btn-emerald"
              style={{
                width: '100%',
                padding: isMobile ? '0.75rem' : '0.85rem',
                borderRadius: 14,
                fontWeight: 900,
                fontSize: isMobile ? '0.86rem' : '0.94rem',
                cursor: (isSaving || !newBook.title || !newBook.publisher) ? 'not-allowed' : 'pointer',
                opacity: (isSaving || !newBook.title || !newBook.publisher) ? 0.65 : 1
              }}
            >
              {isSaving ? '⏳ Harita Oluşturuluyor…' : '🗺️ Kitabı Haritama Ekle'}
            </button>
          </div>
          <style>{`@keyframes scaleIn { from { transform: scale(0.93) translateY(10px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }`}</style>
        </div>
      )}

      {/* ── Manuel Test Girişi Modalı ── */}
      <ManualTestModal
        isOpen={isManualTestModalOpen}
        onClose={() => setIsManualTestModalOpen(false)}
      />
    </div>
  );
}
