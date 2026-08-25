import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { isHomeworkForStudent } from '../utils/testResolver';
import { BookOpen, ArrowLeft, CheckCircle2, Check, Lock, PlayCircle, Layers, Award, Target, Settings, X, Save, BarChart2, FileText, ChevronDown, ChevronRight, RotateCcw, RefreshCw, Eye, Edit, Edit3, ClipboardList, Plus } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { toUUID } from '../services/supabaseService';
import PdfViewerPanel from '../components/PdfViewerPanel';
import ManualTestModal from '../components/ManualTestModal';

export default function StudentBookDetailsPage() {
  const { bookId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users = [] } = useUser();
  const { homeworks = [], isLoading: hwLoading, clearHomeworkSubmissionsForStudent } = useHomework();
  const { books = [], bookTests = [], isLoading: booksLoading, updateTrackedBookTest } = useTrackedBooks();
  const { submissions = [], updateSubmission, deleteSubmission, deleteStudentSubmissionsForBookOrHw } = useEvaluation();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [mistakeModalTest, setMistakeModalTest] = useState(null);
  const [manualTestModalData, setManualTestModalData] = useState({ isOpen: false, data: null });
  const [openSubjects, setOpenSubjects] = useState({});
  const [openTopics, setOpenTopics] = useState({});
  const [isEditTestModalOpen, setIsEditTestModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [editTestFormData, setEditTestFormData] = useState({ name: '', questionCount: 20, answerKey: {}, pdfUrl: '' });

  const queryStudentId = searchParams.get('studentId');
  const isFromTeacher = searchParams.get('fromTeacher') === 'true' || (currentUser?.role !== 'student' && Boolean(queryStudentId));
  const isTeacherViewing = currentUser?.role === 'teacher' || currentUser?.role === 'admin' || isFromTeacher;

  const handleOpenEditTest = (test) => {
    setEditingTest(test);
    setEditTestFormData({
      name: test.name || '',
      questionCount: test.questionCount || 20,
      answerKey: test.answerKey || {},
      pdfUrl: test.pdfUrl || ''
    });
    setIsEditTestModalOpen(true);
  };

  const handleSaveEditTest = async () => {
    if (!editingTest || !editTestFormData.name?.trim()) return;
    try {
      await updateTrackedBookTest(editingTest.id, {
        bookId: String(book?.id || editingTest.bookId),
        subjectId: editingTest.subjectId ? String(editingTest.subjectId) : null,
        topicId: editingTest.topicId ? String(editingTest.topicId) : null,
        name: editTestFormData.name.trim(),
        questionCount: Number(editTestFormData.questionCount) || 20,
        answerKey: editTestFormData.answerKey || {},
        pdfUrl: editTestFormData.pdfUrl || ''
      });
      setIsEditTestModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenManualTest = (test = null, subjectName = '', topicName = '') => {
    if (test) {
      const bestSub = test.bestSub;
      setManualTestModalData({
        isOpen: true,
        data: {
          studentId: studentId,
          bookId: book?.id,
          bookTitle: book?.title,
          testId: test.id,
          testName: test.name,
          subject: subjectName || test.subjectName || (book?.subjects && book.subjects[0]?.name) || 'Genel',
          unitTopic: topicName || test.topicName || '',
          totalQuestions: test.questionCount || 20,
          correctCount: bestSub?.correctCount || 0,
          wrongCount: bestSub?.wrongCount || 0,
          emptyCount: bestSub?.blankCount ?? bestSub?.emptyCount ?? Math.max(0, (test.questionCount || 20) - ((bestSub?.correctCount || 0) + (bestSub?.wrongCount || 0))),
          submissionId: test.latestSubId || bestSub?.id,
          mistakeReasons: bestSub?.mistakeReasons || {}
        }
      });
    } else {
      setManualTestModalData({
        isOpen: true,
        data: {
          studentId: studentId,
          bookId: book?.id,
          bookTitle: book?.title
        }
      });
    }
  };

  const targetStudent = useMemo(() => {
    if (queryStudentId) {
      return (users || []).find(u => String(u.id) === String(queryStudentId) || toUUID(u.id) === toUUID(queryStudentId)) || { id: queryStudentId, name: 'Öğrenci' };
    }
    return currentUser;
  }, [queryStudentId, users, currentUser]);

  const toggleSubject = (subjId) => {
    setOpenSubjects(prev => ({ ...prev, [subjId]: !prev[subjId] }));
  };

  const toggleTopic = (topicId) => {
    setOpenTopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const expandAllSubjects = () => {
    const allS = {};
    const allT = {};
    subjectProgress.forEach(s => {
      allS[s.id] = true;
      (s.topics || []).forEach(t => { allT[t.id] = true; });
    });
    setOpenSubjects(allS);
    setOpenTopics(allT);
  };

  const collapseAllSubjects = () => {
    setOpenSubjects({});
    setOpenTopics({});
  };

  const studentId = targetStudent?.id || currentUser?.id;
  const grade = targetStudent?.grade;
  const gradeId = targetStudent?.gradeId;
  const className = targetStudent?.className;

  // Find the book
  const book = useMemo(() => books.find(b => String(b.id) === String(bookId)), [books, bookId]);

  const { data: curData } = useCurriculum();

  // Find all test IDs assigned to this student for this book
  const bookData = useMemo(() => {
    const ids = new Set();
    let targetDueDate = null;

    const bookAssignments = homeworks.filter(hw => {
      const isMatchBook = String(hw.bookId) === String(bookId) ||
        (book && hw.title && (hw.title.includes(book.title) || book.title.includes(hw.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim()))) ||
        (Array.isArray(hw.tests) && hw.tests.length > 0 && hw.tests.some(tid => bookTests.some(bt => String(bt.id) === String(tid) && String(bt.bookId) === String(bookId))));
      if (!isMatchBook) return false;
      return isHomeworkForStudent(hw, targetStudent, curData?.grades);
    });

    let isSelfAdded = false;

    bookAssignments.forEach(hw => {
      if (hw.title && hw.title.includes('(Kendi Eklediğim)')) {
        isSelfAdded = true;
      }
      
      const hasTestDueDates = hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0;

      if (hasTestDueDates) {
        // Kitap takibinden tarih girilmiş testler: Sadece tarihi girilen testler görünsün
        Object.entries(hw.testDueDates).forEach(([tId, dStr]) => {
          if (dStr && String(dStr).trim() !== '') {
            ids.add(String(tId));
          }
        });
      } else if (Array.isArray(hw.tests) && hw.tests.length > 0) {
        hw.tests.forEach(tId => ids.add(String(tId)));
      } else if (hw.title && hw.title.includes('(Tüm Kitap Görevi)')) {
        bookTests.forEach(bt => {
          if (String(bt.bookId) === String(bookId)) {
            ids.add(String(bt.id));
          }
        });
      }

      if (hw.dueDate) {
        const dueDate = new Date(hw.dueDate);
        if (!targetDueDate || dueDate > targetDueDate) {
          targetDueDate = dueDate;
        }
      }
    });

    let remainingDays = null;
    if (targetDueDate) {
      const diff = targetDueDate.getTime() - new Date().getTime();
      remainingDays = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
    }

    return { ids, targetDueDate, remainingDays, isSelfAdded };
  }, [homeworks, bookId, studentId, grade, gradeId, className, targetStudent, bookTests, curData]);

  const assignedTestIds = bookData.ids;

  // Compute test completion logic and lock statuses
  // Hierarchy: For each Subject -> ordered list of assigned tests.
  const subjectProgress = useMemo(() => {
    if (!book) return [];

    const rawSubjects = (book.subjects && book.subjects.length > 0) ? book.subjects : (book.raw_data?.subjects || []);
    const bId = String(book.id || '');
    const bUuid = String(toUUID(book.id) || '');
    const bTitle = String(book.title || '').toLowerCase().trim();
    const studentIdStr = String(studentId || '');
    const studentUuidStr = String(toUUID(studentId) || '');

    return rawSubjects.map(subject => {
      const sId = String(subject.id || '');

      // Find all tests in bookTests matching this subject OR book
      let allSubjectTests = (bookTests || []).filter(t => {
        const isMatchBook = String(t.bookId || t.book_id) === bId || (bUuid && String(t.bookId || t.book_id) === bUuid);
        if (!isMatchBook) return false;
        if (String(t.subjectId || t.subject_id) === sId) return true;
        if (subject.topics && Array.isArray(subject.topics) && subject.topics.some(tp => String(tp.id) === String(t.topicId || t.topic_id))) return true;
        return false;
      });

      // Fallback: If no tests found in bookTests, generate default 5 tests per unit topic
      if (allSubjectTests.length === 0 && subject.topics && Array.isArray(subject.topics)) {
        const gathered = [];
        subject.topics.forEach((tp) => {
          for (let i = 1; i <= 5; i++) {
            gathered.push({
              id: `tbt_${bId}_${sId}_${tp.id}_${i}`,
              bookId: bId,
              subjectId: sId,
              topicId: String(tp.id),
              name: i <= 3 ? `Test-${i}` : (i === 4 ? 'Yeni Nesil 1' : 'Yeni Nesil 2'),
              questionCount: 20,
              answerKey: {}
            });
          }
        });
        allSubjectTests = gathered;
      }

      // Sort tests naturally
      const subjTests = (allSubjectTests || [])
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr', { numeric: true, sensitivity: 'base' }));

      const testsWithStatus = subjTests.map((t, index) => {
        const tIdStr = String(t.id);
        const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '');
        const tUuidStr = String(toUUID(t.id) || '');

        const solvedSubs = submissions.filter(s => {
          const sStdId = String(s.studentId || s.student_id || '');
          const isMatchStudent = !studentIdStr || sStdId === studentIdStr || (studentUuidStr && sStdId === studentUuidStr) || (studentUuidStr && toUUID(sStdId) === studentUuidStr);
          if (!isMatchStudent) return false;
          if (s.status === 'in_progress' || s.status === 'draft') return false;

          const meta = (s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a.type === 'metadata') : (s.metadata || {});
          const matchFields = [
            String(s.testId || ''),
            String(s.test_id || ''),
            String(s.realTestId || ''),
            String(s.bookTestId || ''),
            String(meta?.realTestId || ''),
            String(meta?.bookTestId || ''),
            String(meta?.realId || '')
          ];
          if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
            matchFields.push(...s.bookTestIds.map(String));
          }

          const isDirectMatch = matchFields.some(f => f && (
            f === tIdStr ||
            f === tCleanId ||
            f.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId ||
            (tUuidStr && f === tUuidStr) ||
            toUUID(f) === tIdStr ||
            (tUuidStr && toUUID(f) === tUuidStr)
          ));
          return isDirectMatch;
        });

        let hwSub = null;
        for (const hw of homeworks) {
          if (!hw.submissions || !Array.isArray(hw.submissions)) continue;
          const match = hw.submissions.find(s => {
            const sStdId = String(s.studentId || s.student_id || '');
            const isMatchStudent = !studentIdStr || sStdId === studentIdStr || (studentUuidStr && sStdId === studentUuidStr) || (studentUuidStr && toUUID(sStdId) === studentUuidStr);
            if (!isMatchStudent || s.status === 'in_progress' || s.status === 'draft') return false;
            const subTId = String(s.testId || s.test_id || s.bookTestId || s.realTestId || '');
            return subTId === tIdStr || subTId === tCleanId || subTId.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId || (tUuidStr && subTId === tUuidStr);
          });
          if (match) {
            hwSub = match;
            break;
          }
        }

        const isCompleted = solvedSubs.length > 0 || !!hwSub;

        let bestScore = null;
        let bestSub = null;
        if (solvedSubs.length > 0) {
          bestScore = Math.max(...solvedSubs.map(s => Number(s.score || s.computedScore || (s.correct_count ?? s.correctCount ?? s.correct ?? 0))));
          bestSub = solvedSubs.reduce((prev, curr) => ((Number(curr.score || curr.correct_count || curr.correctCount || 0) > Number(prev.score || prev.correct_count || prev.correctCount || 0)) ? curr : prev), solvedSubs[0]);
        } else if (hwSub) {
          bestScore = hwSub.score || 0;
          bestSub = hwSub;
        }

        let testDueDate = null;
        const matchingHw = homeworks.find(hw => hw.isBookAssignment && String(hw.bookId || hw.book_id) === bId && hw.testDueDates?.[t.id]);
        if (matchingHw?.testDueDates?.[t.id]) {
          testDueDate = matchingHw.testDueDates[t.id];
        }

        const isAssignedHomework = Boolean(testDueDate || assignedTestIds.has(String(t.id)));

        return {
          ...t,
          index: index + 1,
          isCompleted,
          isPendingApproval: false,
          pendingManualSub: null,
          isLocked: false,
          isAssignedHomework,
          bestScore,
          bestSub,
          testDueDate,
          latestSubId: isCompleted ? (solvedSubs.length > 0 ? solvedSubs[solvedSubs.length - 1].id : (hwSub ? hwSub.id : null)) : null
        };
      });

      const completedCount = testsWithStatus.filter(t => t.isCompleted).length;
      
      const topicsList = subject.topics || [];
      const topicsWithTests = topicsList.map(topic => {
        const topicTests = testsWithStatus
          .filter(t => String(t.topicId || t.topic_id) === String(topic.id))
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr', { numeric: true, sensitivity: 'base' }));
        return {
          ...topic,
          tests: topicTests,
          completedCount: topicTests.filter(t => t.isCompleted).length,
          totalCount: topicTests.length
        };
      });

      const directTests = testsWithStatus
        .filter(t => !t.topicId || t.topicId === 'direct' || String(t.topicId) === String(subject.id) || !topicsList.some(top => String(top.id) === String(t.topicId || t.topic_id)))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr', { numeric: true, sensitivity: 'base' }));

      return {
        ...subject,
        tests: testsWithStatus,
        topics: topicsWithTests,
        directTests,
        completedCount,
        totalCount: testsWithStatus.length,
        pct: testsWithStatus.length > 0 ? Math.round((completedCount / testsWithStatus.length) * 100) : 0
      };
    }).filter(Boolean);
  }, [book, bookTests, assignedTestIds, submissions, studentId, homeworks]);

  const [isBulkSettingsModalOpen, setIsBulkSettingsModalOpen] = useState(false);
  const [bulkSettings, setBulkSettings] = useState({}); 
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [showBookPdf, setShowBookPdf] = useState(false);

  useEffect(() => {
    if (isBulkSettingsModalOpen) {
      const initial = {};
      subjectProgress.forEach(subj => {
        subj.tests.forEach(t => {
           let akString = "";
           if (t.answerKey && typeof t.answerKey === 'object') {
             const maxQ = Math.max(...Object.keys(t.answerKey).map(Number), 0);
             for(let i=1; i<=maxQ; i++) {
               akString += t.answerKey[i] || " ";
             }
           }
           initial[t.id] = {
             questionCount: t.questionCount || 20,
             answerKeyString: akString.trim()
           };
        });
      });
      setBulkSettings(initial);
    }
  }, [isBulkSettingsModalOpen, subjectProgress]);

  const handleSaveBulkSettings = async () => {
    setIsSavingBulk(true);
    try {
       const promises = [];
       Object.entries(bulkSettings).forEach(([testId, data]) => {
         const akStr = (data.answerKeyString || '').replace(/[^A-Ea-e]/g, '').toUpperCase();
         const akObj = {};
         for(let i=0; i<akStr.length; i++) {
            akObj[i+1] = akStr[i];
         }
         
         promises.push(
           updateTrackedBookTest(testId, {
             questionCount: data.questionCount,
             answerKey: akObj
           })
         );
       });
       await Promise.all(promises);
       setIsBulkSettingsModalOpen(false);
    } catch(e) {
      console.error('Save error:', e);
    } finally {
      setIsSavingBulk(false);
    }
  };

  const isDataLoading = booksLoading || (hwLoading && homeworks.length === 0);

  if (!book) {
    if (isDataLoading) {
      return (
        <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h3 style={{ marginTop: '1rem', color: '#64748b' }}>Harita Yükleniyor...</h3>
          <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .sbdp-anim { animation: fadeSlideUp 0.25s ease both; }
        .sbdp-subject-card { transition: box-shadow 0.2s, transform 0.2s; }
        .sbdp-subject-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.06) !important; transform: translateY(-2px); }
        .sbdp-test-row { transition: background 0.15s, box-shadow 0.15s; }
        .sbdp-test-row:hover { background: var(--color-surface-hover) !important; }
        .sbdp-btn-solve { transition: box-shadow 0.15s, transform 0.15s; }
        .sbdp-btn-solve:hover { box-shadow: 0 4px 14px rgba(99,102,241,0.3) !important; transform: translateY(-1px); }

        .sbdp-stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          width: 100%;
        }
        .sbdp-stat-item {
          border-right: 1px solid var(--color-border);
          padding: 1rem 0.6rem;
          text-align: center;
          box-sizing: border-box;
        }
        .sbdp-stat-item:last-child {
          border-right: none;
        }

        /* 📱 MOBIL UYGULAMA DÜZENİ VE RESPONSIVE ENTEGRASYONU */
        @media (max-width: 768px) {
          .sbdp-page-container {
            padding: 0.65rem 0.75rem 4rem 0.75rem !important;
          }
          .sbdp-hero-box {
            padding: 1.1rem 1.1rem 1rem 1.1rem !important;
            border-radius: 18px !important;
          }
          .sbdp-hero-cover {
            width: 52px !important;
            height: 68px !important;
            border-radius: 10px !important;
          }
          .sbdp-hero-title {
            font-size: 1.15rem !important;
            line-height: 1.3 !important;
            margin-bottom: 0.5rem !important;
          }
          .sbdp-stats-grid {
            grid-template-columns: repeat(5, 1fr) !important;
          }
          .sbdp-stat-item {
            padding: 0.65rem 0.2rem !important;
          }
          .sbdp-stat-val {
            font-size: 1.05rem !important;
          }
          .sbdp-stat-lbl {
            font-size: 0.62rem !important;
            letter-spacing: 0 !important;
          }
          .sbdp-test-row {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 0.75rem 0.85rem !important;
            border-radius: 14px !important;
            gap: 0.6rem !important;
          }
          .sbdp-test-header-mobile {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .sbdp-test-actions-mobile {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            width: 100% !important;
            flex-wrap: wrap !important;
          }
          .sbdp-test-actions-mobile button, .sbdp-test-actions-mobile a {
            flex: 1 !important;
            min-width: 110px !important;
            justify-content: center !important;
            padding: 0.5rem 0.65rem !important;
            font-size: 0.76rem !important;
            border-radius: 10px !important;
          }
          .sbdp-chart-card {
            padding: 1rem 0.85rem !important;
            border-radius: 16px !important;
          }
          .sbdp-subject-card {
            border-radius: 16px !important;
          }
        }

        .sbdp-mistake-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        @media (max-width: 1024px) {
          .sbdp-mistake-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 640px) {
          .sbdp-mistake-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
          .sbdp-mistake-card {
            padding: 0.65rem 0.75rem !important;
            border-radius: 11px !important;
          }
          .sbdp-mistake-card:last-child {
            grid-column: span 2;
          }
          .sbdp-mistake-card-title {
            font-size: 0.72rem !important;
          }
          .sbdp-mistake-card-pct {
            font-size: 0.82rem !important;
          }
          .sbdp-mistake-card-val {
            font-size: 1.05rem !important;
          }
        }
      `}</style>
        </div>
      );
    }
    return (
      <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📚</div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem 0' }}>İçerik Bulunamadı</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Aradığınız kitap veya test haritası bulunamadı veya silinmiş olabilir.</p>
        <button
          onClick={() => navigate('/student')}
          style={{ padding: '0.6rem 1.25rem', borderRadius: '0.75rem', background: '#4f46e5', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={16} /> Öğrenci Paneline Dön
        </button>
      </div>
    );
  }

  let overallCompleted = 0;
  let overallTotal = 0;
  let overallCorrect = 0;
  let overallWrong = 0;
  let overallBlank = 0;

  subjectProgress.forEach(subj => {
    overallCompleted += subj.completedCount;
    overallTotal += subj.totalCount;
    subj.tests.forEach(test => {
      if (test.isCompleted && test.bestSub) {
        overallCorrect += Number(test.bestSub.correct_count ?? test.bestSub.correctCount ?? test.bestSub.correct ?? 0);
        overallWrong += Number(test.bestSub.wrong_count ?? test.bestSub.wrongCount ?? test.bestSub.wrong ?? 0);
        overallBlank += Number(test.bestSub.empty_count ?? test.bestSub.blankCount ?? test.bestSub.blank ?? 0);
      }
    });
  });

  const overallPct = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;
  const totalQuestions = overallCorrect + overallWrong + overallBlank;
  const overallSuccessRate = totalQuestions > 0 ? Math.round((overallCorrect / totalQuestions) * 100) : 0;

  const [selectedChartSubject, setSelectedChartSubject] = useState('all');
  const [selectedChartTopic, setSelectedChartTopic] = useState('all');
  const [bookChartMetric, setBookChartMetric] = useState('grouped'); // 'grouped' | 'rate'

  const currentChartSubjectObj = useMemo(() => {
    if (selectedChartSubject === 'all') return null;
    return subjectProgress.find(s => String(s.id) === String(selectedChartSubject)) || null;
  }, [subjectProgress, selectedChartSubject]);

  const currentChartTopicObj = useMemo(() => {
    if (!currentChartSubjectObj || selectedChartTopic === 'all') return null;
    return (currentChartSubjectObj.topics || []).find(t => String(t.id) === String(selectedChartTopic)) || null;
  }, [currentChartSubjectObj, selectedChartTopic]);

  const subjectChartData = useMemo(() => {
    // LEVEL 1: ALL SUBJECTS
    if (selectedChartSubject === 'all') {
      return subjectProgress.map(subj => {
        let subjCorrect = 0;
        let subjWrong = 0;
        let subjBlank = 0;
        let solvedTests = 0;
        
        subj.tests.forEach(test => {
          if (test.isCompleted) {
            solvedTests++;
            if (test.bestSub) {
              subjCorrect += Number(test.bestSub.correct_count ?? test.bestSub.correctCount ?? test.bestSub.correct ?? 0);
              subjWrong += Number(test.bestSub.wrong_count ?? test.bestSub.wrongCount ?? test.bestSub.wrong ?? 0);
              subjBlank += Number(test.bestSub.empty_count ?? test.bestSub.blankCount ?? test.bestSub.blank ?? 0);
            }
          }
        });
        
        const totalQ = subjCorrect + subjWrong + subjBlank;
        const rate = totalQ > 0 ? Math.round((subjCorrect / totalQ) * 100) : 0;

        return {
          type: 'subject',
          id: subj.id,
          name: subj.name,
          displayName: `${subj.name} (%${rate})`,
          rate,
          totalQ,
          solvedTests,
          totalTests: subj.totalCount || subj.tests.length,
          Doğru: subjCorrect,
          Yanlış: subjWrong,
          Boş: subjBlank
        };
      });
    }

    const subj = subjectProgress.find(s => String(s.id) === String(selectedChartSubject));
    if (!subj) return [];

    // LEVEL 2: SPECIFIC SUBJECT, ALL TOPICS/UNITS
    if (selectedChartTopic === 'all' && subj.topics && subj.topics.length > 0) {
      const topicItems = subj.topics.map(topic => {
        let topicCorrect = 0;
        let topicWrong = 0;
        let topicBlank = 0;
        let solvedTests = 0;

        topic.tests.forEach(test => {
          if (test.isCompleted) {
            solvedTests++;
            if (test.bestSub) {
              topicCorrect += test.bestSub.correctCount || 0;
              topicWrong += test.bestSub.wrongCount || 0;
              topicBlank += test.bestSub.blankCount || 0;
            }
          }
        });

        const totalQ = topicCorrect + topicWrong + topicBlank;
        const rate = totalQ > 0 ? Math.round((topicCorrect / totalQ) * 100) : 0;

        return {
          type: 'topic',
          id: topic.id,
          name: topic.name,
          displayName: `${topic.name} (%${rate})`,
          rate,
          totalQ,
          solvedTests,
          totalTests: topic.totalCount || topic.tests.length,
          Doğru: topicCorrect,
          Yanlış: topicWrong,
          Boş: topicBlank
        };
      });

      if (subj.directTests && subj.directTests.length > 0) {
        subj.directTests.forEach(test => {
          const d = (test.isCompleted && test.bestSub) ? (test.bestSub.correctCount || 0) : 0;
          const y = (test.isCompleted && test.bestSub) ? (test.bestSub.wrongCount || 0) : 0;
          const b = (test.isCompleted && test.bestSub) ? (test.bestSub.blankCount || 0) : 0;
          const totalQ = d + y + b;
          const rate = (test.isCompleted && test.bestScore !== null) ? test.bestScore : (totalQ > 0 ? Math.round((d / totalQ) * 100) : 0);

          topicItems.push({
            type: 'test',
            id: test.id,
            name: test.name || `Test ${test.index}`,
            displayName: `${test.name || `Test ${test.index}`} (%${rate})`,
            rate,
            totalQ,
            isCompleted: test.isCompleted,
            Doğru: d,
            Yanlış: y,
            Boş: b
          });
        });
      }

      return topicItems;
    }

    // LEVEL 3: SPECIFIC TOPIC/UNIT OR DIRECT TESTS UNDER SUBJECT
    let targetTests = subj.tests;
    if (selectedChartTopic !== 'all') {
      const topicObj = (subj.topics || []).find(t => String(t.id) === String(selectedChartTopic));
      if (topicObj) {
        targetTests = topicObj.tests;
      }
    }

    return targetTests.map(test => {
      const d = (test.isCompleted && test.bestSub) ? (test.bestSub.correctCount || 0) : 0;
      const y = (test.isCompleted && test.bestSub) ? (test.bestSub.wrongCount || 0) : 0;
      const b = (test.isCompleted && test.bestSub) ? (test.bestSub.blankCount || 0) : 0;
      const totalQ = d + y + b;
      const rate = (test.isCompleted && test.bestScore !== null) ? test.bestScore : (totalQ > 0 ? Math.round((d / totalQ) * 100) : 0);

      return {
        type: 'test',
        id: test.id,
        name: test.name || `Test ${test.index}`,
        displayName: `${test.name || `Test ${test.index}`} (%${rate})`,
        rate,
        totalQ,
        isCompleted: test.isCompleted,
        Doğru: d,
        Yanlış: y,
        Boş: b,
      };
    });
  }, [subjectProgress, selectedChartSubject, selectedChartTopic]);

  // ── MISTAKE REASONS AGGREGATION ACROSS THE BOOK (DEEP RESILIENT SEARCH IN CURRICULUM ORDER) ──
  const bookMistakeStats = useMemo(() => {
    const reasonDefs = {
      '⚡ İşlem Hatası': { key: '⚡ İşlem Hatası', label: 'İşlem Hatası', color: '#d97706', bg: '#fffbeb', border: '#fde68a', count: 0 },
      '⚠️ Dikkat Kaybı': { key: '⚠️ Dikkat Kaybı', label: 'Dikkat Kaybı / Yanlış Okuma', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', count: 0 },
      '📖 Formül / Bilgi': { key: '📖 Formül / Bilgi', label: 'Formül / Bilgi Eksikliği', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', count: 0 },
      '🧠 Konu Eksiği': { key: '🧠 Konu Eksiği', label: 'Konu Eksiği Var', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', count: 0 },
      '⏱️ Zaman Yetmedi': { key: '⏱️ Zaman Yetmedi', label: 'Zaman Yetmedi', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', count: 0 },
    };

    const normalizeReason = (r) => {
      if (!r || typeof r !== 'string') return null;
      const str = r.toLowerCase().trim();
      if (str.includes('işlem') || str.includes('islem') || str.includes('hesap')) return '⚡ İşlem Hatası';
      if (str.includes('dikkat') || str.includes('okuma') || str.includes('yanlış okuma')) return '⚠️ Dikkat Kaybı';
      if (str.includes('formül') || str.includes('formul') || str.includes('bilgi') || str.includes('unutul')) return '📖 Formül / Bilgi';
      if (str.includes('konu') || str.includes('anlamadım') || str.includes('kavram') || str.includes('tarz')) return '🧠 Konu Eksiği';
      if (str.includes('zaman') || str.includes('süre') || str.includes('sure') || str.includes('yetmedi') || str.includes('yetiş')) return '⏱️ Zaman Yetmedi';
      return null;
    };

    // 1. Collect all mistake reason dictionaries from localStorage
    const localMap = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('mistake_reasons_') || k.startsWith('mistake_reason_'))) {
          try {
            const parsed = JSON.parse(localStorage.getItem(k));
            if (parsed && typeof parsed === 'object') {
              localMap[k] = parsed;
            }
          } catch {}
        }
      }
    } catch {}

    let totalWrongInBook = 0;
    let totalClassified = 0;
    const questionsList = [];
    const testsWithMistakesList = [];

    // Collect all tests in EXACT book curriculum order (Subject -> Topic/Unit -> Test)
    const allBookTestsHierarchical = [];
    (subjectProgress || []).forEach(subj => {
      // 1. Tests in topics (Units)
      (subj.topics || []).forEach(topic => {
        (topic.tests || []).forEach(t => {
          allBookTestsHierarchical.push({
            ...t,
            subjectId: subj.id,
            subjectName: subj.name,
            topicId: topic.id,
            topicName: topic.name || topic.title || ''
          });
        });
      });
      // 2. Direct tests in subject
      (subj.directTests || []).forEach(t => {
        allBookTestsHierarchical.push({
          ...t,
          subjectId: subj.id,
          subjectName: subj.name,
          topicId: null,
          topicName: ''
        });
      });
    });

    const studentIdStr = String(studentId || '');
    const studentUuidStr = String(toUUID(studentId) || '');
    const currentUserIdStr = String(currentUser?.id || '');
    const currentUserUuidStr = String(toUUID(currentUser?.id) || '');

    allBookTestsHierarchical.forEach(t => {
      const sub = t.bestSub || t.latestSub;
      const testWrong = t.isCompleted ? (sub?.wrongCount ?? 0) : 0;
      totalWrongInBook += testWrong;

      const tIdStr = String(t.id);
      const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '');
      const tUuidStr = String(toUUID(t.id) || '');

      const foundReasonsList = [];

      // A. Check from submissions (EvaluationContext)
      const matchingSubs = (submissions || []).filter(s => {
        const isMatchStudent = String(s.studentId) === studentIdStr ||
          (studentUuidStr && String(s.studentId) === studentUuidStr) ||
          (currentUserIdStr && String(s.studentId) === currentUserIdStr) ||
          (currentUserUuidStr && String(s.studentId) === currentUserUuidStr);
        if (!isMatchStudent) return false;

        const matchFields = [
          String(s.testId || ''),
          String(s.realTestId || ''),
          String(s.bookTestId || ''),
          String(s.metadata?.realTestId || ''),
          String(s.metadata?.bookTestId || ''),
          String(s.metadata?.realId || '')
        ].filter(f => Boolean(f) && f.length >= 2);
        if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
          matchFields.push(...s.bookTestIds.map(String).filter(f => Boolean(f) && f.length >= 2));
        }

        return matchFields.some(f => (
          f === tIdStr ||
          (tCleanId && tCleanId.length >= 2 && f === tCleanId) ||
          (tUuidStr && f === tUuidStr) ||
          (toUUID(f) && toUUID(f) === tIdStr) ||
          (tUuidStr && toUUID(f) === tUuidStr)
        ));
      });

      matchingSubs.forEach(s => {
        if (s.mistakeReasons && typeof s.mistakeReasons === 'object') {
          foundReasonsList.push(s.mistakeReasons);
        }
        if (Array.isArray(s.answers)) {
          const aObj = {};
          s.answers.forEach((a, aIdx) => {
            const qNum = a.questionNo || (aIdx + 1);
            const r = a.reason || a.mistakeReason || a.hataNedeni || a.hata_sebebi;
            if (r) aObj[qNum] = r;
          });
          if (Object.keys(aObj).length > 0) foundReasonsList.push(aObj);
        }
      });

      // B. Check from homeworks (HomeworkContext)
      (homeworks || []).forEach(hw => {
        const isMatchHwTest = (tIdStr && tIdStr.length >= 2 && (String(hw.id) === tIdStr || String(hw.testId) === tIdStr || String(hw.bookTestId) === tIdStr)) ||
          (tCleanId && tCleanId.length >= 2 && (String(hw.id) === tCleanId || String(hw.testId) === tCleanId)) ||
          (tUuidStr && (String(hw.id) === tUuidStr || String(hw.testId) === tUuidStr));

        if (isMatchHwTest && Array.isArray(hw.submissions)) {
          hw.submissions.forEach(hs => {
            const isMatchStudent = String(hs.studentId) === studentIdStr ||
              (studentUuidStr && String(hs.studentId) === studentUuidStr) ||
              (currentUserIdStr && String(hs.studentId) === currentUserIdStr) ||
              (currentUserUuidStr && String(hs.studentId) === currentUserUuidStr);
            if (isMatchStudent) {
              if (hs.mistakeReasons && typeof hs.mistakeReasons === 'object') {
                foundReasonsList.push(hs.mistakeReasons);
              }
              if (Array.isArray(hs.answers)) {
                const aObj = {};
                hs.answers.forEach((a, aIdx) => {
                  const qNum = a.questionNo || (aIdx + 1);
                  const r = a.reason || a.mistakeReason || a.hataNedeni || a.hata_sebebi;
                  if (r) aObj[qNum] = r;
                });
                if (Object.keys(aObj).length > 0) foundReasonsList.push(aObj);
              }
            }
          });
        }
      });

      // C. Check strictly from localStorage entries matching this test ID and student
      const validLocalKeys = [
        `mistake_reasons_${tIdStr}_${studentIdStr}`,
        `mistake_reasons_bt_${tIdStr}_${studentIdStr}`,
        `mistake_reasons_${tCleanId}_${studentIdStr}`,
        `mistake_reasons_bt_${tCleanId}_${studentIdStr}`,
        `mistake_reasons_${tUuidStr}_${studentIdStr}`,
        `mistake_reasons_bt_${tUuidStr}_${studentIdStr}`,
        `mistake_reasons_${tIdStr}_${currentUserIdStr}`,
        `mistake_reasons_bt_${tIdStr}_${currentUserIdStr}`,
        `mistake_reasons_${tCleanId}_${currentUserIdStr}`,
        `mistake_reasons_bt_${tCleanId}_${currentUserIdStr}`,
      ];

      validLocalKeys.forEach(vk => {
        if (localMap[vk]) {
          foundReasonsList.push(localMap[vk]);
        }
      });

      // Merge all reasons found for this test
      const testMergedReasons = {};
      foundReasonsList.forEach(rObj => {
        if (rObj && typeof rObj === 'object') {
          Object.entries(rObj).forEach(([qNo, r]) => {
            if (r && !testMergedReasons[qNo]) {
              testMergedReasons[qNo] = r;
            }
          });
        }
      });

      // Collect all wrong questions for this test in order
      const wrongQuestionsForTest = [];
      const seenQNos = new Set();

      if (matchingSubs.length > 0) {
        matchingSubs.forEach(ms => {
          if (Array.isArray(ms.answers)) {
            ms.answers.forEach((a, aIdx) => {
              const qNum = a.questionNo || (aIdx + 1);
              if (a.isCorrect === false && !seenQNos.has(qNum)) {
                seenQNos.add(qNum);
                const rawReason = testMergedReasons[qNum] || a.reason || a.mistakeReason || null;
                const normKey = normalizeReason(rawReason);
                wrongQuestionsForTest.push({
                  testId: t.id,
                  testName: t.name,
                  subjectName: t.subjectName,
                  topicName: t.topicName,
                  qNo: qNum,
                  subId: ms.id,
                  userAnswer: a.userAnswer || '—',
                  correctAnswer: a.correctAnswer || '—',
                  reason: normKey,
                  rawReason: rawReason
                });
                if (normKey && reasonDefs[normKey]) {
                  reasonDefs[normKey].count++;
                  totalClassified++;
                  questionsList.push({
                    testId: t.id,
                    testName: t.name,
                    subjectName: t.subjectName,
                    topicName: t.topicName,
                    qNo: qNum,
                    reasonKey: normKey,
                    reasonLabel: reasonDefs[normKey].label,
                    rawReason
                  });
                }
              }
            });
          }
        });
      }

      // If no detailed answers array, but test has wrong count:
      if (wrongQuestionsForTest.length === 0 && testWrong > 0) {
        for (let qNum = 1; qNum <= testWrong; qNum++) {
          const rawReason = testMergedReasons[qNum] || null;
          const normKey = normalizeReason(rawReason);
          wrongQuestionsForTest.push({
            testId: t.id,
            testName: t.name,
            subjectName: t.subjectName,
            topicName: t.topicName,
            qNo: qNum,
            subId: t.latestSubId,
            userAnswer: '—',
            correctAnswer: '—',
            reason: normKey,
            rawReason: rawReason
          });
          if (normKey && reasonDefs[normKey]) {
            reasonDefs[normKey].count++;
            totalClassified++;
            questionsList.push({
              testId: t.id,
              testName: t.name,
              subjectName: t.subjectName,
              topicName: t.topicName,
              qNo: qNum,
              reasonKey: normKey,
              reasonLabel: reasonDefs[normKey].label,
              rawReason
            });
          }
        }
      }

      if (wrongQuestionsForTest.length > 0) {
        const pendingCount = wrongQuestionsForTest.filter(q => !q.reason).length;
        const classifiedCount = wrongQuestionsForTest.filter(q => !!q.reason).length;
        testsWithMistakesList.push({
          testId: t.id,
          testName: t.name,
          subjectId: t.subjectId,
          subjectName: t.subjectName,
          topicId: t.topicId,
          topicName: t.topicName,
          latestSubId: t.latestSubId,
          wrongCount: wrongQuestionsForTest.length,
          pendingCount,
          classifiedCount,
          wrongQuestions: wrongQuestionsForTest
        });
      }
    });

    const unclassifiedCount = Math.max(0, totalWrongInBook - totalClassified);

    let topReason = null;
    let maxCount = 0;
    Object.values(reasonDefs).forEach(r => {
      if (r.count > maxCount) {
        maxCount = r.count;
        topReason = r;
      }
    });

    const pendingTestsList = testsWithMistakesList.filter(t => t.pendingCount > 0);
    const classifiedTestsList = testsWithMistakesList.filter(t => t.classifiedCount > 0);

    return {
      reasonDefs,
      totalWrongInBook,
      totalClassified,
      unclassifiedCount,
      topReason,
      questionsList,
      testsWithMistakesList,
      pendingTestsList,
      classifiedTestsList
    };
  }, [subjectProgress, studentId, submissions, homeworks, currentUser]);

  const handleAssignMistakeInModal = async (testItem, qNo, reasonLabel) => {
    const currentQ = testItem.wrongQuestions?.find(q => q.qNo === qNo);
    const nextReason = (currentQ?.reason === reasonLabel) ? null : reasonLabel;

    // Update mistakeModalTest in local state so UI updates immediately
    setMistakeModalTest(prev => {
      if (!prev) return null;
      const updatedWrongQ = (prev.wrongQuestions || []).map(q => {
        if (q.qNo === qNo) return { ...q, reason: nextReason, rawReason: nextReason };
        return q;
      });
      const newClassified = updatedWrongQ.filter(q => !!q.reason).length;
      const newPending = updatedWrongQ.length - newClassified;
      return {
        ...prev,
        wrongQuestions: updatedWrongQ,
        classifiedCount: newClassified,
        pendingCount: newPending
      };
    });

    // Save to localStorage & Supabase
    try {
      const targetStudentId = String(targetStudent?.id || currentUser?.id || 'u1');
      const key1 = `mistake_reasons_${testItem.testId}_${targetStudentId}`;
      const key2 = `mistake_reasons_bt_${testItem.testId}_${targetStudentId}`;
      let prevObj = {};
      try {
        prevObj = JSON.parse(localStorage.getItem(key1) || '{}') || {};
      } catch {}
      const nextObj = { ...prevObj, [qNo]: nextReason };
      try {
        localStorage.setItem(key1, JSON.stringify(nextObj));
        localStorage.setItem(key2, JSON.stringify(nextObj));
      } catch {}

      // Supabase sync
      const subTarget = submissions.find(s => String(s.id) === String(testItem.latestSubId || testItem.subId) || String(s.testId) === String(testItem.testId) || String(s.bookTestId) === String(testItem.testId));
      if (subTarget && updateSubmission) {
        const updatedAnswers = (subTarget.answers || []).map(a => {
          const num = a.questionNo || a.questionIndex;
          if (num === qNo || String(num) === String(qNo)) {
            return { ...a, reason: nextReason, mistakeReason: nextReason };
          }
          return a;
        });
        const nextReasons = { ...(subTarget.mistakeReasons || {}), [qNo]: nextReason };
        await updateSubmission(subTarget.id, {
          mistakeReasons: nextReasons,
          answers: updatedAnswers
        });
      }

      setFeedbackToast(nextReason ? `✓ Soru ${qNo}: "${nextReason}" veritabanına kaydedildi!` : `Soru ${qNo} sebebi kaldırıldı`);
      setTimeout(() => setFeedbackToast(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="sbdp-page-container" style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(244, 63, 94, 0.05) 0%, transparent 45%), var(--color-bg)', padding: isMobile ? '0.65rem 0.75rem 4rem' : '1.5rem 1.5rem', maxWidth: '1600px', width: '100%', margin: '0 auto', fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--color-text)', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .sbdp-anim { animation: fadeSlideUp 0.3s ease both; }
        .sbdp-subject-card { transition: box-shadow 0.2s, transform 0.2s; }
        .sbdp-subject-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.06) !important; transform: translateY(-2px); }
        .sbdp-test-row { transition: background 0.15s, box-shadow 0.15s; }
        .sbdp-test-row:hover { background: var(--color-surface-hover) !important; }
        .sbdp-btn-solve { transition: box-shadow 0.15s, transform 0.15s; }
        .sbdp-btn-solve:hover { box-shadow: 0 4px 14px rgba(99,102,241,0.3) !important; transform: translateY(-1px); }

        .sbdp-stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          width: 100%;
        }
        .sbdp-stat-item {
          border-right: 1px solid var(--color-border);
          padding: 1.1rem 0.75rem;
          text-align: center;
          box-sizing: border-box;
        }
        .sbdp-stat-item:last-child {
          border-right: none;
        }
        @media (max-width: 640px) {
          .sbdp-stats-grid {
            grid-template-columns: repeat(6, 1fr);
          }
          .sbdp-stat-dogru {
            grid-column: span 2;
            grid-row: 1;
            border-right: 1px solid var(--color-border);
            padding: 0.85rem 0.4rem;
          }
          .sbdp-stat-yanlis {
            grid-column: span 2;
            grid-row: 1;
            border-right: 1px solid var(--color-border);
            padding: 0.85rem 0.4rem;
          }
          .sbdp-stat-bos {
            grid-column: span 2;
            grid-row: 1;
            border-right: none;
            padding: 0.85rem 0.4rem;
          }
          .sbdp-stat-test {
            grid-column: span 3;
            grid-row: 2;
            border-top: 1px solid var(--color-border);
            border-right: 1px solid var(--color-border);
            padding: 0.85rem 0.5rem;
          }
          .sbdp-stat-basari {
            grid-column: span 3;
            grid-row: 2;
            border-top: 1px solid var(--color-border);
            border-right: none;
            padding: 0.85rem 0.5rem;
          }
        }

        .sbdp-mistake-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        @media (max-width: 1024px) {
          .sbdp-mistake-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 640px) {
          .sbdp-mistake-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
          .sbdp-mistake-card {
            padding: 0.65rem 0.75rem !important;
            border-radius: 11px !important;
          }
          .sbdp-mistake-card:last-child {
            grid-column: span 2;
          }
          .sbdp-mistake-card-title {
            font-size: 0.72rem !important;
          }
          .sbdp-mistake-card-pct {
            font-size: 0.82rem !important;
          }
          .sbdp-mistake-card-val {
            font-size: 1.05rem !important;
          }
        }
      `}</style>

      {feedbackToast && (
        <div style={{
          position: 'fixed',
          top: 76,
          right: 24,
          background: '#0f172a',
          color: '#ffffff',
          padding: '0.65rem 1.15rem',
          borderRadius: 12,
          fontSize: '0.82rem',
          fontWeight: 800,
          zIndex: 99999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeSlideUp 0.25s ease'
        }}>
          <CheckCircle2 size={16} color="#10b981" />
          <span>{feedbackToast}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={() => navigate(isFromTeacher ? `/books/${book?.id}` : (book?.bookType === 'exam' ? '/student/exams' : '/student/books'))}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-surface)', border: '1.5px solid var(--color-border-input)', borderRadius: '0.75rem', padding: '0.5rem 1.1rem', fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}
        >
          <ArrowLeft size={16} /> {isFromTeacher ? 'Kitap Yönetimine Dön' : (book?.bookType === 'exam' ? 'Denemelere Dön' : 'Kitaplarıma Dön')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleOpenManualTest(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '0.75rem', padding: '0.5rem 1.1rem', fontWeight: 900, fontSize: '0.85rem', color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}
          >
            <Plus size={16} /> Manuel Test Sonucu Ekle
          </button>
          {bookData.isSelfAdded && (
            <button
              onClick={() => setIsBulkSettingsModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: '0.75rem', padding: '0.5rem 1.1rem', fontWeight: 900, fontSize: '0.85rem', color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
            >
              <Settings size={16} /> Cevap Anahtarı Gir
            </button>
          )}
        </div>
      </div>

      {isFromTeacher && (
        <div className="sbdp-anim" style={{ background: 'rgba(37,99,235,0.12)', color: '#60a5fa', padding: '0.9rem 1.25rem', borderRadius: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)', border: '1.5px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              {(targetStudent?.name || 'Ö').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text)' }}>
                👤 {targetStudent?.name || 'Öğrenci'} <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(37,99,235,0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: 99 }}>Öğrenci Kitap İlerleme Görünümü</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                Öğrencinin gördüğü birebir kitap ekranı • Çözülen testler, başarı oranları ve optik formlar
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/books/${book?.id}`)}
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-input)', color: 'var(--color-text)', padding: '0.45rem 1rem', borderRadius: '0.6rem', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={15} /> Kitap Yönetimine Dön
          </button>
        </div>
      )}

      {overallPct < 100 && bookData.remainingDays !== null && (
        <div className="sbdp-anim" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '1.25rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
          <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Target size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#166534', marginBottom: 2 }}>Akıllı Tempo Önerisi</div>
            <div style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 600 }}>
              {bookData.remainingDays === 0
                ? 'Süren doldu! Testleri bir an önce tamamlamalısın.'
                : `Hedefe ${bookData.remainingDays} gün kaldı. Haftada ortalama ${Math.max(1, Math.ceil(((overallTotal - overallCompleted) / bookData.remainingDays) * 7))} test çözmelisin.`}
            </div>
          </div>
        </div>
      )}

      <div className="sbdp-anim" style={{ borderRadius: '1.5rem', overflow: 'hidden', marginBottom: '1.75rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)', border: '1.5px solid #e2e8f0' }}>
        <div className="sbdp-hero-box" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)', padding: isMobile ? '1.1rem 1.1rem 1rem' : '2rem 2.5rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -50, right: 80, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap', position: 'relative' }}>
            <div className="sbdp-hero-cover" style={{ width: isMobile ? 54 : 90, height: isMobile ? 70 : 120, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              <BookOpen size={44} />
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {book.publisher}
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.3)' }}>
                  {book.optionCount === 4 ? '🎯 4 Seçenekli Optik (Ortaokul A-D)' : '🎯 5 Seçenekli Optik (Lise A-E)'}
                </span>
              </div>
              <h1 className="sbdp-hero-title" style={{ fontSize: isMobile ? '1.15rem' : '1.75rem', fontWeight: 900, color: 'white', margin: '0 0 0.75rem', lineHeight: 1.25, textShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
                {book.title}
                {book.pdfUrl && (
                  <button
                    onClick={() => setShowBookPdf(p => !p)}
                    style={{ marginLeft: 10, verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: 800, border: '1.5px solid rgba(255,255,255,0.5)', background: showBookPdf ? 'white' : 'rgba(255,255,255,0.15)', color: showBookPdf ? '#4f46e5' : 'white', cursor: 'pointer' }}
                  >
                    <FileText size={12} /> {showBookPdf ? 'PDF Kapat' : 'PDF Görüntüle'}
                  </button>
                )}
              </h1>

              <div style={{ maxWidth: 500 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)' }}>Genel İlerleme</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: overallPct === 100 ? '#4ade80' : 'white' }}>%{overallPct}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', height: 8, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${overallPct}%`, height: '100%', background: overallPct === 100 ? 'linear-gradient(90deg,#4ade80,#22c55e)' : 'linear-gradient(90deg,#e0e7ff,white)', borderRadius: 99, transition: 'width 0.6s ease', boxShadow: '0 0 12px rgba(255,255,255,0.4)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sbdp-stats-grid" style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
          <div className="sbdp-stat-item sbdp-stat-dogru" style={{ background: 'rgba(16,185,129,0.08)' }}>
            <div style={{ fontSize: '1.15rem', marginBottom: 2 }}>✅</div>
            <div className="sbdp-stat-val" style={{ fontSize: isMobile ? '1.05rem' : '1.35rem', fontWeight: 900, color: '#16a34a' }}>{overallCorrect}</div>
            <div className="sbdp-stat-lbl" style={{ fontSize: isMobile ? '0.62rem' : '0.72rem', fontWeight: 900, color: '#16a34a', textTransform: 'uppercase' }}>Doğru</div>
          </div>
          <div className="sbdp-stat-item sbdp-stat-yanlis" style={{ background: 'rgba(239,68,68,0.08)' }}>
            <div style={{ fontSize: '1.15rem', marginBottom: 2 }}>❌</div>
            <div className="sbdp-stat-val" style={{ fontSize: isMobile ? '1.05rem' : '1.35rem', fontWeight: 900, color: '#dc2626' }}>{overallWrong}</div>
            <div className="sbdp-stat-lbl" style={{ fontSize: isMobile ? '0.62rem' : '0.72rem', fontWeight: 900, color: '#dc2626', textTransform: 'uppercase' }}>Yanlış</div>
          </div>
          <div className="sbdp-stat-item sbdp-stat-bos" style={{ background: 'var(--color-surface-hover)' }}>
            <div style={{ fontSize: '1.15rem', marginBottom: 2 }}>⬜</div>
            <div className="sbdp-stat-val" style={{ fontSize: isMobile ? '1.05rem' : '1.35rem', fontWeight: 900, color: 'var(--color-text-muted)' }}>{overallBlank}</div>
            <div className="sbdp-stat-lbl" style={{ fontSize: isMobile ? '0.62rem' : '0.72rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Boş</div>
          </div>
          <div className="sbdp-stat-item sbdp-stat-test" style={{ background: 'rgba(37,99,235,0.08)' }}>
            <div style={{ fontSize: '1.15rem', marginBottom: 2 }}>📋</div>
            <div className="sbdp-stat-val" style={{ fontSize: isMobile ? '1.05rem' : '1.35rem', fontWeight: 900, color: '#2563eb' }}>{overallCompleted}/{overallTotal}</div>
            <div className="sbdp-stat-lbl" style={{ fontSize: isMobile ? '0.62rem' : '0.72rem', fontWeight: 900, color: '#2563eb', textTransform: 'uppercase' }}>Test</div>
          </div>
          <div className="sbdp-stat-item sbdp-stat-basari" style={{ background: 'rgba(124,58,237,0.08)' }}>
            <div style={{ fontSize: '1.15rem', marginBottom: 2 }}>🎯</div>
            <div className="sbdp-stat-val" style={{ fontSize: isMobile ? '1.05rem' : '1.35rem', fontWeight: 900, color: '#7c3aed' }}>%{overallSuccessRate}</div>
            <div className="sbdp-stat-lbl" style={{ fontSize: isMobile ? '0.62rem' : '0.72rem', fontWeight: 900, color: '#7c3aed', textTransform: 'uppercase' }}>Başarı</div>
          </div>
        </div>
      </div>

      {subjectChartData.length > 0 && (
        <div className="sbdp-anim sbdp-chart-card" style={{ background: 'var(--color-surface)', borderRadius: isMobile ? '16px' : '1.4rem', border: '1.5px solid var(--color-border)', padding: isMobile ? '1rem 0.9rem' : '1.75rem 2rem', marginBottom: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}>
          
          {/* Chart Header & Selectors */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={22} color="#6366f1" />
                {selectedChartSubject === 'all' 
                  ? 'Derslere Göre Başarı Dağılımı' 
                  : selectedChartTopic === 'all' 
                    ? `${currentChartSubjectObj?.name || 'Ders'} - Ünitelere Göre Başarı` 
                    : `${currentChartTopicObj?.name || 'Ünite'} - Testlere Göre Başarı`}
              </h3>
              
              {/* Breadcrumb Path */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 4 }}>
                <span 
                  onClick={() => { setSelectedChartSubject('all'); setSelectedChartTopic('all'); }} 
                  style={{ cursor: 'pointer', color: selectedChartSubject === 'all' ? 'var(--color-text)' : '#2563eb', background: selectedChartSubject === 'all' ? 'var(--color-surface-hover)' : 'transparent', padding: '0.15rem 0.5rem', borderRadius: 6, transition: 'all 0.15s' }}
                >
                  📚 Tüm Dersler
                </span>
                {currentChartSubjectObj && (
                  <>
                    <span style={{ color: 'var(--color-border-input)' }}>/</span>
                    <span 
                      onClick={() => setSelectedChartTopic('all')} 
                      style={{ cursor: 'pointer', color: selectedChartTopic === 'all' ? 'var(--color-text)' : '#2563eb', background: selectedChartTopic === 'all' ? 'var(--color-surface-hover)' : 'transparent', padding: '0.15rem 0.5rem', borderRadius: 6, transition: 'all 0.15s' }}
                    >
                      {currentChartSubjectObj.name}
                    </span>
                  </>
                )}
                {currentChartTopicObj && (
                  <>
                    <span style={{ color: 'var(--color-border-input)' }}>/</span>
                    <span style={{ color: '#60a5fa', fontWeight: 800, background: 'rgba(37,99,235,0.12)', padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                      {currentChartTopicObj.name}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Select Dropdowns & Metric Toggle */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Metric Toggle */}
              <div style={{ display: 'flex', background: 'var(--color-surface-hover)', padding: 3, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => setBookChartMetric('grouped')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: bookChartMetric === 'grouped' ? 'rgba(37,99,235,0.12)' : 'transparent',
                    color: bookChartMetric === 'grouped' ? '#60a5fa' : 'var(--color-text-muted)',
                    transition: 'all 0.15s'
                  }}
                >
                  📊 Soru Dağılımı (D / Y / B)
                </button>
                <button
                  onClick={() => setBookChartMetric('rate')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: bookChartMetric === 'rate' ? '#eff6ff' : 'transparent',
                    color: bookChartMetric === 'rate' ? '#1d4ed8' : '#64748b',
                    transition: 'all 0.15s'
                  }}
                >
                  🎯 Başarı Yüzdesi (%)
                </button>
              </div>

              {/* Subject Select */}
              <select
                value={selectedChartSubject}
                onChange={e => {
                  setSelectedChartSubject(e.target.value);
                  setSelectedChartTopic('all');
                }}
                style={{ padding: '0.45rem 0.9rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', background: '#ffffff', cursor: 'pointer', outline: 'none' }}
              >
                <option value="all">📚 Tüm Dersler</option>
                {subjectProgress.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </select>

              {/* Topic/Unit Select */}
              {currentChartSubjectObj && currentChartSubjectObj.topics && currentChartSubjectObj.topics.length > 0 && (
                <select
                  value={selectedChartTopic}
                  onChange={e => setSelectedChartTopic(e.target.value)}
                  style={{ padding: '0.45rem 0.9rem', borderRadius: '0.65rem', border: '1.5px solid #bfdbfe', fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="all">📑 Tüm Üniteler / Konular</option>
                  {currentChartSubjectObj.topics.map(tp => <option key={tp.id} value={String(tp.id)}>{tp.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Interactive Drill-down Cards (Grafiğin Üstünde) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
            {subjectChartData.map((item, idx) => {
              const rateColor = item.rate >= 70 ? '#16a34a' : item.rate >= 50 ? '#d97706' : item.totalQ === 0 ? '#64748b' : '#dc2626';
              const rateBg = item.rate >= 70 ? '#f0fdf4' : item.rate >= 50 ? '#fffbeb' : item.totalQ === 0 ? '#f8fafc' : '#fef2f2';
              const rateBorder = item.rate >= 70 ? '#bbf7d0' : item.rate >= 50 ? '#fde68a' : item.totalQ === 0 ? '#e2e8f0' : '#fecaca';
              const isDrillable = item.type === 'subject' || item.type === 'topic';

              const totalQ = item.totalQ || 0;
              const pctD = totalQ > 0 ? ((item.Doğru || 0) / totalQ) * 100 : 0;
              const pctY = totalQ > 0 ? ((item.Yanlış || 0) / totalQ) * 100 : 0;
              const pctB = totalQ > 0 ? ((item.Boş || 0) / totalQ) * 100 : 0;

              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (item.type === 'subject') {
                      setSelectedChartSubject(String(item.id));
                      setSelectedChartTopic('all');
                    } else if (item.type === 'topic') {
                      setSelectedChartTopic(String(item.id));
                    }
                  }}
                  style={{
                    background: rateBg, 
                    border: `1.5px solid ${rateBorder}`, 
                    borderRadius: '1rem', 
                    padding: '0.9rem 1.1rem',
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    cursor: isDrillable ? 'pointer' : 'default',
                    transition: 'all 0.18s ease'
                  }}
                  title={isDrillable ? `${item.name} detaylarını görmek için tıkla` : item.name}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: rateColor }}>
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
                      <div style={{ width: '100%', background: '#e2e8f0', height: '100%' }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                    {item.totalTests ? (
                      <span>{item.solvedTests}/{item.totalTests} Test Çözüldü</span>
                    ) : (
                      <span>{item.isCompleted ? 'Tamamlandı' : 'Çözülmedi'}</span>
                    )}
                    <span style={{ display: 'flex', gap: 6, fontWeight: 800 }}>
                      <span style={{ color: '#16a34a' }}>{item.Doğru}D</span>
                      <span style={{ color: '#dc2626' }}>{item.Yanlış}Y</span>
                      <span style={{ color: '#64748b' }}>{item.Boş}B</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bar Chart View */}
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="displayName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text)', fontWeight: 800 }} dy={10} tickFormatter={v => v.length > 24 ? v.substring(0, 24) + '…' : v} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 700 }} tickFormatter={v => bookChartMetric === 'rate' ? `%${v}` : v} domain={bookChartMetric === 'rate' ? [0, 100] : ['auto', 'auto']} />
                <Tooltip 
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} 
                  contentStyle={{ background: 'var(--color-surface)', borderRadius: '0.85rem', border: '1.5px solid var(--color-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontWeight: 800, fontSize: '0.83rem', color: 'var(--color-text)' }} 
                  formatter={(value, name) => [
                    bookChartMetric === 'rate' ? `%${value} Başarı` : `${value} Soru`,
                    name
                  ]}
                />
                <Legend wrapperStyle={{ paddingTop: '1rem', fontSize: '0.85rem', fontWeight: 800 }} />

                {bookChartMetric === 'grouped' ? (
                  <>
                    <Bar 
                      dataKey="Doğru" 
                      name="🟢 Doğru"
                      fill="#10b981" 
                      radius={[4, 4, 0, 0]} 
                      cursor="pointer"
                      onClick={(entry) => {
                        if (entry && entry.payload) {
                          if (entry.payload.type === 'subject') {
                            setSelectedChartSubject(String(entry.payload.id));
                            setSelectedChartTopic('all');
                          } else if (entry.payload.type === 'topic') {
                            setSelectedChartTopic(String(entry.payload.id));
                          }
                        }
                      }}
                    />
                    <Bar 
                      dataKey="Yanlış" 
                      name="🔴 Yanlış"
                      fill="#ef4444" 
                      radius={[4, 4, 0, 0]} 
                      cursor="pointer"
                      onClick={(entry) => {
                        if (entry && entry.payload) {
                          if (entry.payload.type === 'subject') {
                            setSelectedChartSubject(String(entry.payload.id));
                            setSelectedChartTopic('all');
                          } else if (entry.payload.type === 'topic') {
                            setSelectedChartTopic(String(entry.payload.id));
                          }
                        }
                      }}
                    />
                    <Bar 
                      dataKey="Boş" 
                      name="⚪ Boş"
                      fill="#94a3b8" 
                      radius={[4, 4, 0, 0]} 
                      cursor="pointer"
                      onClick={(entry) => {
                        if (entry && entry.payload) {
                          if (entry.payload.type === 'subject') {
                            setSelectedChartSubject(String(entry.payload.id));
                            setSelectedChartTopic('all');
                          } else if (entry.payload.type === 'topic') {
                            setSelectedChartTopic(String(entry.payload.id));
                          }
                        }
                      }}
                    />
                  </>
                ) : (
                  <Bar 
                    dataKey="rate" 
                    name="🎯 Başarı Oranı (%)"
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]} 
                    cursor="pointer"
                    onClick={(entry) => {
                      if (entry && entry.payload) {
                        if (entry.payload.type === 'subject') {
                          setSelectedChartSubject(String(entry.payload.id));
                          setSelectedChartTopic('all');
                        } else if (entry.payload.type === 'topic') {
                          setSelectedChartTopic(String(entry.payload.id));
                        }
                      }
                    }}
                  >
                    {subjectChartData.map((entry, idx) => {
                      const col = entry.rate >= 70 ? '#10b981' : entry.rate >= 50 ? '#f59e0b' : '#ef4444';
                      return <Cell key={`cell-rate-${idx}`} fill={col} />;
                    })}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          YANLIŞ & HATA SEBEPLERİ ANALİZİ (DİKKAT KAYBI, BİLGİ EKSİKLİĞİ VB.)
      ════════════════════════════════════════════ */}
      <div className="sbdp-anim" style={{
        background: 'var(--color-surface)',
        borderRadius: '1.4rem',
        border: '1.5px solid var(--color-border)',
        padding: '1.5rem 1.75rem',
        marginBottom: '2rem',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.15rem',
              color: 'white',
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)'
            }}>
              🤔
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                Yanlış & Hata Sebepleri Analizi
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e11d48', background: '#ffe4e6', border: '1px solid #fecdd3', borderRadius: 99, padding: '2px 8px' }}>
                  {bookMistakeStats.totalClassified} Sebep Kayıtlı
                </span>
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Testleri çözerken optik formda yanlış sorular için işaretlenen hata nedenleri
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
            <span>Toplam Yanlış: <strong style={{ color: '#dc2626' }}>{bookMistakeStats.totalWrongInBook}</strong></span>
            <span>•</span>
            <span>Sınıflandırılan: <strong style={{ color: '#059669' }}>{bookMistakeStats.totalClassified}</strong></span>
            {bookMistakeStats.unclassifiedCount > 0 && (
              <>
                <span>•</span>
                <span style={{ color: '#d97706' }}>Bekleyen: {bookMistakeStats.unclassifiedCount}</span>
              </>
            )}
          </div>
        </div>

        {/* Multi-segment breakdown bar */}
        {bookMistakeStats.totalClassified > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ height: 10, width: '100%', background: 'var(--color-surface-hover, #f1f5f9)', borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 1 }}>
              {Object.values(bookMistakeStats.reasonDefs).map(r => {
                if (r.count === 0) return null;
                const pct = ((r.count / bookMistakeStats.totalClassified) * 100).toFixed(1);
                return (
                  <div
                    key={r.key}
                    style={{ width: `${pct}%`, background: r.color, height: '100%' }}
                    title={`${r.key}: ${r.count} soru (%${pct})`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Reason KPI Cards Grid */}
        <div className="sbdp-mistake-grid">
          {Object.values(bookMistakeStats.reasonDefs).map(r => {
            const pct = bookMistakeStats.totalClassified > 0 ? Math.round((r.count / bookMistakeStats.totalClassified) * 100) : 0;
            return (
              <div
                key={r.key}
                className="sbdp-mistake-card"
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
                  <span className="sbdp-mistake-card-title" style={{ fontSize: '0.78rem', fontWeight: 900, color: r.count > 0 ? r.color : 'var(--color-text-muted)' }}>
                    {r.key}
                  </span>
                  <span className="sbdp-mistake-card-pct" style={{ fontSize: '0.9rem', fontWeight: 900, color: r.count > 0 ? r.color : 'var(--color-text-muted)' }}>
                    %{pct}
                  </span>
                </div>
                <div className="sbdp-mistake-card-val" style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  {r.count} <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>soru</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Insight / Coaching Tip */}
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
            color: 'var(--color-text)'
          }}>
            <span style={{ fontSize: '1.2rem' }}>💡</span>
            <div>
              <strong>Hata Analiz İpucu:</strong> Bu kitaptaki en yaygın hata nedeniniz <strong style={{ color: bookMistakeStats.topReason.color }}>{bookMistakeStats.topReason.key}</strong> (%{Math.round((bookMistakeStats.topReason.count / bookMistakeStats.totalClassified) * 100)}).
              {bookMistakeStats.topReason.key.includes('Dikkat') && ' Sorulardaki olumsuz köklere ("değildir", "ulaşılamaz") ve işlem adımlarına ekstra özen göstermeniz netlerinizi hızla artıracaktır.'}
              {bookMistakeStats.topReason.key.includes('İşlem') && ' Basit işlem adımlarını zihinden değil, kağıt üzerine yazarak çözmeniz hata payını sıfırlayacaktır.'}
              {bookMistakeStats.topReason.key.includes('Konu') && ' Bu konudaki konu özetlerini tekrar gözden geçirmeniz ve kavram haritalarını incelemeniz önerilir.'}
              {bookMistakeStats.topReason.key.includes('Formül') && ' Formül ve kural kartları hazırlayarak soru çözmeden önce 2 dakika tekrar yapmanız faydalı olacaktır.'}
              {bookMistakeStats.topReason.key.includes('Zaman') && ' Turlama tekniği kullanarak uzun soruları ikinci tura bırakmanız zaman yönetimini güçlendirecektir.'}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--color-surface-hover, #f8fafc)',
            border: '1px dashed var(--color-border, #cbd5e1)',
            borderRadius: 12,
            padding: '0.75rem 1rem',
            fontSize: '0.78rem',
            color: 'var(--color-text-muted)',
            textAlign: 'center'
          }}>
            📝 Testleri bitirdikten sonra optik form ekranında yanlış yaptığınız soruların yanındaki <strong>"🤔 Yanlış Sebebi"</strong> butonlarına basarak nedenini (Dikkat, İşlem, Konu Eksiği vb.) seçtiğinizde detaylı analiz grafiğiniz burada otomatik olarak oluşacaktır.
          </div>
        )}

        {/* 1. Bekleyen Yanlışlar — Test Bazlı & Kitap Sıralı Listesi */}
        {bookMistakeStats.pendingTestsList && bookMistakeStats.pendingTestsList.length > 0 ? (
          <div style={{ marginTop: '0.85rem' }}>
            <details style={{ background: '#fffbeb', borderRadius: 14, border: '1.5px solid #fde68a', overflow: 'hidden' }}>
              <summary style={{ padding: '0.75rem 1.1rem', fontSize: '0.84rem', fontWeight: 900, color: '#92400e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                  <span>Bekleyen Yanlışlar ({bookMistakeStats.pendingTestsList.length} Testte Toplam {bookMistakeStats.unclassifiedCount} Soru)</span>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: 800 }}>Sıralı Test Listesi ▼</span>
              </summary>

              <div style={{ padding: '0.85rem 1.1rem', borderTop: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                {bookMistakeStats.pendingTestsList.map((tItem, tIdx) => (
                  <div
                    key={tItem.testId || tIdx}
                    onClick={() => setMistakeModalTest(tItem)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                      padding: '0.75rem 1rem',
                      background: '#ffffff',
                      borderRadius: 12,
                      border: '1.5px solid #fef3c7',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#fef3c7'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>
                        <span style={{ color: '#2563eb', background: '#eff6ff', padding: '1px 6px', borderRadius: 4 }}>
                          📚 {tItem.subjectName}
                        </span>
                        {tItem.topicName && (
                          <span style={{ color: '#475569', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                            🎯 {tItem.topicName}
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.88rem' }}>
                        📌 {tItem.testName}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 8 }}>
                        ⏳ {tItem.pendingCount} Bekleyen Soru ({tItem.wrongCount} Yanlış)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMistakeModalTest(tItem); }}
                        style={{
                          padding: '0.45rem 0.9rem',
                          borderRadius: 10,
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          border: 'none',
                          color: 'white',
                          fontSize: '0.76rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 8px rgba(99,102,241,0.25)'
                        }}
                      >
                        <span>⚡ Hata Analizi Yap</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        ) : null}

        {/* 2. Sınıflandırılan Sorular — Test Bazlı & Kitap Sıralı Listesi */}
        {bookMistakeStats.classifiedTestsList && bookMistakeStats.classifiedTestsList.length > 0 && (
          <div style={{ marginTop: '0.85rem' }}>
            <details style={{ background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 14, border: '1px solid var(--color-border, #e2e8f0)', overflow: 'hidden' }}>
              <summary style={{ padding: '0.75rem 1.1rem', fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
                <span>📋 Sınıflandırılan Sorular ({bookMistakeStats.totalClassified} Soru • {bookMistakeStats.classifiedTestsList.length} Test)</span>
                <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 800 }}>Test Listesini İncele ▼</span>
              </summary>
              <div style={{ padding: '0.85rem 1.1rem', borderTop: '1px solid var(--color-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {bookMistakeStats.classifiedTestsList.map((tItem, tIdx) => (
                  <div
                    key={tItem.testId || tIdx}
                    onClick={() => setMistakeModalTest(tItem)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      padding: '0.65rem 0.9rem',
                      background: 'var(--color-surface, #ffffff)',
                      borderRadius: 10,
                      border: '1px solid var(--color-border, #e2e8f0)',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 800 }}>
                        <span style={{ color: '#2563eb' }}>📚 {tItem.subjectName}</span>
                        {tItem.topicName && <span>• 🎯 {tItem.topicName}</span>}
                      </div>
                      <span style={{ fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                        📌 {tItem.testName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#059669', fontWeight: 900, background: '#ecfdf5', padding: '2px 8px', borderRadius: 6, fontSize: '0.74rem' }}>
                        ✓ {tItem.classifiedCount} Sınıflandırıldı
                      </span>
                      {tItem.pendingCount > 0 && (
                        <span style={{ color: '#d97706', fontWeight: 900, background: '#fffbeb', padding: '2px 8px', borderRadius: 6, fontSize: '0.74rem' }}>
                          ⏳ {tItem.pendingCount} Bekleyen
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMistakeModalTest(tItem); }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 8,
                          background: 'var(--color-surface-hover, #f1f5f9)',
                          border: '1px solid var(--color-border, #cbd5e1)',
                          color: 'var(--color-text, #334155)',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        İncele / Düzenle ➔
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {book.pdfUrl && showBookPdf && (
        <div style={{ marginBottom: '2rem' }}>
          <PdfViewerPanel pdfUrl={book.pdfUrl} title={book.title} defaultOpen={true} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {subjectProgress.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-text)' }}>📚 Ders Listesi</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(37,99,235,0.12)', color: '#60a5fa', padding: '2px 8px', borderRadius: '99px', border: '1px solid #3b82f6' }}>{subjectProgress.length} Ders</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={expandAllSubjects} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-input)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', padding: '4px 10px', borderRadius: '8px' }}>Tümünü Aç</button>
              <button onClick={collapseAllSubjects} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', padding: '4px 10px', borderRadius: '8px' }}>Kapat</button>
            </div>
          </div>
        )}

        {subjectProgress.map((subj, subjIdx) => {
          const isOpen = !!openSubjects[subj.id];
          const subjectColors = [
            { from: '#4f46e5', to: '#7c3aed', light: '#eff6ff', accent: '#4f46e5' },
            { from: '#0891b2', to: '#0e7490', light: '#ecfeff', accent: '#0891b2' },
            { from: '#059669', to: '#047857', light: '#f0fdf4', accent: '#059669' },
            { from: '#d97706', to: '#b45309', light: '#fffbeb', accent: '#d97706' },
            { from: '#7c3aed', to: '#6d28d9', light: '#faf5ff', accent: '#7c3aed' },
            { from: '#e11d48', to: '#be123c', light: '#fff1f2', accent: '#e11d48' },
            { from: '#2563eb', to: '#1d4ed8', light: '#eff6ff', accent: '#2563eb' },
          ];
          const sc = subjectColors[subjIdx % subjectColors.length];

          return (
            <div key={subj.id} className="sbdp-subject-card" style={{ borderRadius: '1.3rem', overflow: 'hidden', border: `1.5px solid ${isOpen ? 'var(--color-border-input)' : 'var(--color-border)'}`, boxShadow: isOpen ? '0 8px 24px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.02)', background: 'var(--color-surface)' }}>
              <div
                onClick={() => toggleSubject(subj.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', cursor: 'pointer', userSelect: 'none', background: isOpen ? 'var(--color-surface-hover)' : 'var(--color-surface)', transition: 'background 0.25s', flexWrap: 'wrap', gap: '0.75rem', borderBottom: isOpen ? '1px solid var(--color-border)' : 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '0.6rem', background: sc.light, color: sc.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${sc.light}` }}>
                    <Layers size={18} />
                  </div>
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>{subj.name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: sc.light, padding: '0.3rem 0.75rem', borderRadius: '99px', border: `1px solid ${sc.light}` }}>
                    <div style={{ width: 60, height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${subj.pct}%`, height: '100%', background: `linear-gradient(90deg, ${sc.from}, ${sc.to})`, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: sc.accent, whiteSpace: 'nowrap' }}>{subj.completedCount}/{subj.totalCount}</span>
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '0.85rem', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  
                  {/* Direct Tests */}
                  {subj.directTests && subj.directTests.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {subj.topics && subj.topics.length > 0 && (
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
                          <FileText size={14} color={sc.accent} /> Direkt Testler
                        </div>
                      )}
                      {subj.directTests.map(test => {
                        let stateBg = 'var(--color-surface)', stateBorder = 'var(--color-border)', stateAccent = 'var(--color-border-input)';
                        if (test.isCompleted) { stateBg = 'var(--color-surface)'; stateBorder = '#bbf7d0'; stateAccent = '#10b981'; }
                        else if (test.isPendingApproval) { stateBg = 'var(--color-surface)'; stateBorder = 'rgba(168, 85, 247, 0.4)'; stateAccent = '#a855f7'; }
                        else if (!test.isLocked) { stateBg = 'var(--color-surface)'; stateBorder = 'var(--color-border)'; stateAccent = sc.accent; }

                        return (
                          <div key={test.id} className="sbdp-test-row" style={{ display: 'flex', alignItems: 'center', background: stateBg, border: `1px solid ${stateBorder}`, borderLeft: `4px solid ${stateAccent}`, borderRadius: '0.8rem', padding: '0.8rem 1rem', flexWrap: 'wrap', gap: '0.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: test.isCompleted ? 'linear-gradient(135deg,#10b981,#059669)' : test.isPendingApproval ? 'linear-gradient(135deg,#7c3aed,#9333ea)' : test.isLocked ? 'var(--color-surface-hover)' : `linear-gradient(135deg,${sc.from},${sc.to})`, color: test.isLocked ? 'var(--color-text-muted)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                              {test.isCompleted ? <CheckCircle2 size={16} /> : (test.isPendingApproval ? '⏳' : test.index)}
                            </div>

                            <div style={{ flex: 1, minWidth: 140 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: test.isLocked ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                                {test.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span>{test.questionCount || 20} Soru</span>
                                {test.isPendingApproval && !test.isCompleted ? (
                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 900,
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    background: 'rgba(124, 58, 237, 0.12)',
                                    color: '#a855f7',
                                    border: '1px solid rgba(168, 85, 247, 0.35)'
                                  }}>
                                    ⏳ Öğretmen Onayı Bekliyor
                                  </span>
                                ) : test.testDueDate ? (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    background: test.isCompleted ? '#f0fdf4' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#fef2f2' : 'rgba(37,99,235,0.12)'),
                                    color: test.isCompleted ? '#166534' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#dc2626' : '#60a5fa'),
                                    border: `1px solid ${test.isCompleted ? '#bbf7d0' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#fecaca' : '#3b82f6')}`
                                  }}>
                                    📅 Ödev Hedefi: {new Date(test.testDueDate).toLocaleDateString('tr-TR')}
                                  </span>
                                ) : (
                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    background: 'var(--color-surface-hover)',
                                    color: 'var(--color-text-muted)',
                                    border: '1px solid var(--color-border)'
                                  }}>
                                    📖 Kitap Testi
                                  </span>
                                )}
                              </div>
                            </div>

                            {test.isCompleted && test.bestScore !== null && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#166534', background: '#f0fdf4', padding: '3px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #bbf7d0' }}>
                                  <Award size={12} /> %{test.bestScore}
                                </span>
                                {test.bestSub && (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#f8fafc', padding: '3px 9px', borderRadius: '99px', border: '1px solid #e2e8f0', display: 'inline-flex', gap: 6 }}>
                                    <span style={{ color: '#16a34a' }}>{test.bestSub.correctCount || 0}D</span>
                                    <span style={{ color: '#dc2626' }}>{test.bestSub.wrongCount || 0}Y</span>
                                    <span style={{ color: '#64748b' }}>{test.bestSub.blankCount || 0}B</span>
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="sbdp-test-actions-mobile" style={{ flexShrink: 0 }}>
                              {test.isCompleted ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <button
                                    className="sbdp-btn-solve"
                                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '0.6rem', border: '1.5px solid #bbf7d0', color: '#166534', background: '#f0fdf4', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                    onClick={() => navigate(`/review/${test.latestSubId}`, { state: { from: `/student/books/${book?.id}?studentId=${studentId}&fromTeacher=${isFromTeacher}` } })}
                                  >
                                    <Eye size={13} /> Sonucu İncele
                                  </button>
                                  <button
                                    style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                    title="Doğru/Yanlış Sonucunu Düzenle"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenManualTest(test, subj.name, null);
                                    }}
                                  >
                                    <Edit3 size={12} /> D/Y Düzenle
                                  </button>
                                  {isTeacherViewing && (
                                    <>
                                      <button
                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid #bfdbfe', color: '#1d4ed8', background: '#eff6ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        title="Testi Düzenle"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditTest(test);
                                        }}
                                      >
                                        <Edit size={12} /> Düzenle
                                      </button>
                                      <button
                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid #fecaca', color: '#dc2626', background: '#fef2f2', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        title="Bu testi sıfırla (Sadece Öğretmen)"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (window.confirm(`"${test.name}" testinin sonucunu sıfırlamak istiyor musunuz?`)) {
                                            if (test.latestSubId) {
                                              await deleteSubmission(test.latestSubId);
                                            }
                                            if (test.bestSub?.id) {
                                              await deleteSubmission(test.bestSub.id);
                                            }
                                            if (test.bestSub?.supabaseId) {
                                              await deleteSubmission(test.bestSub.supabaseId);
                                            }
                                            if (typeof deleteStudentSubmissionsForBookOrHw === 'function') {
                                              await deleteStudentSubmissionsForBookOrHw(studentId, null, book?.id, [test.id]);
                                            }
                                            if (typeof clearHomeworkSubmissionsForStudent === 'function') {
                                              await clearHomeworkSubmissionsForStudent(null, studentId, book?.id, [test.id]);
                                            }
                                          }
                                        }}
                                      >
                                        <RotateCcw size={12} /> Sıfırla
                                      </button>
                                    </>
                                  )}
                                </div>
                              ) : test.isLocked ? (
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Lock size={14} /> Kilitli
                                </span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <button
                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '0.6rem', border: '1.5px solid #86efac', color: '#166534', background: 'var(--color-surface)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                    title="Doğru/Yanlış/Boş Sayılarını Gir"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenManualTest(test, subj.name, null);
                                    }}
                                  >
                                    <Edit3 size={13} /> ⚡ D/Y Gir
                                  </button>
                                  {isTeacherViewing && (
                                    <button
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid #bfdbfe', color: '#1d4ed8', background: '#eff6ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                      title="Testi Düzenle"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditTest(test);
                                      }}
                                    >
                                      <Edit size={12} /> Düzenle
                                    </button>
                                  )}
                                  <button
                                    className="sbdp-btn-solve"
                                    style={{ padding: '0.4rem 1.1rem', fontSize: '0.82rem', fontWeight: 900, borderRadius: '0.6rem', border: 'none', color: 'white', background: `linear-gradient(135deg,${sc.from},${sc.to})`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 4px 12px ${sc.accent}44` }}
                                    onClick={() => navigate(`/book-quiz/${test.id}?studentId=${studentId}`)}
                                  >
                                    <PlayCircle size={14} /> {isFromTeacher ? 'Teste Git' : 'Şimdi Çöz'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Topics / Units List */}
                  {subj.topics && subj.topics.length > 0 ? (
                    subj.topics.map(topic => {
                      const isTopicOpen = !!openTopics[topic.id];

                      return (
                        <div key={topic.id} style={{ borderRadius: '0.85rem', border: '1px solid var(--color-border)', overflow: 'hidden', background: 'var(--color-surface)' }}>
                          <div
                            onClick={() => toggleTopic(topic.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', cursor: 'pointer', background: isTopicOpen ? 'var(--color-surface-hover)' : 'var(--color-surface)', borderBottom: isTopicOpen ? '1px solid var(--color-border)' : 'none', flexWrap: 'wrap', gap: '0.5rem' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <FileText size={16} color={sc.accent} />
                              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-text)' }}>{topic.name}</span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', background: 'var(--color-surface-hover)', padding: '2px 8px', borderRadius: 99, border: '1px solid var(--color-border)' }}>
                                {topic.completedCount}/{topic.totalCount} Test
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                              {isTopicOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>
                          </div>

                          {isTopicOpen && (
                            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'var(--color-bg)' }}>
                              {topic.tests.map(test => {
                                let stateBg = 'var(--color-surface)', stateBorder = 'var(--color-border)', stateAccent = 'var(--color-border-input)';
                                if (test.isCompleted) { stateBg = 'var(--color-surface)'; stateBorder = '#bbf7d0'; stateAccent = '#10b981'; }
                                else if (test.isPendingApproval) { stateBg = 'var(--color-surface)'; stateBorder = 'rgba(168, 85, 247, 0.4)'; stateAccent = '#a855f7'; }
                                else if (!test.isLocked) { stateBg = 'var(--color-surface)'; stateBorder = 'var(--color-border)'; stateAccent = sc.accent; }

                                return (
                                  <div key={test.id} className="sbdp-test-row" style={{ display: 'flex', alignItems: 'center', background: stateBg, border: `1px solid ${stateBorder}`, borderLeft: `4px solid ${stateAccent}`, borderRadius: '0.8rem', padding: '0.8rem 1rem', flexWrap: 'wrap', gap: '0.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: test.isCompleted ? 'linear-gradient(135deg,#10b981,#059669)' : test.isPendingApproval ? 'linear-gradient(135deg,#7c3aed,#9333ea)' : test.isLocked ? 'var(--color-surface-hover)' : `linear-gradient(135deg,${sc.from},${sc.to})`, color: test.isLocked ? 'var(--color-text-muted)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                                      {test.isCompleted ? <CheckCircle2 size={16} /> : (test.isPendingApproval ? '⏳' : test.index)}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 140 }}>
                                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: test.isLocked ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                                        {test.name}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span>{test.questionCount || 20} Soru</span>
                                        {test.isPendingApproval && !test.isCompleted ? (
                                          <span style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 900,
                                            padding: '2px 7px',
                                            borderRadius: '6px',
                                            background: 'rgba(124, 58, 237, 0.12)',
                                            color: '#a855f7',
                                            border: '1px solid rgba(168, 85, 247, 0.35)'
                                          }}>
                                            ⏳ Öğretmen Onayı Bekliyor
                                          </span>
                                        ) : test.testDueDate ? (
                                          <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 800,
                                            padding: '2px 7px',
                                            borderRadius: '6px',
                                            background: test.isCompleted ? '#f0fdf4' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#fef2f2' : 'rgba(37,99,235,0.12)'),
                                            color: test.isCompleted ? '#166534' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#dc2626' : '#60a5fa'),
                                            border: `1px solid ${test.isCompleted ? '#bbf7d0' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#fecaca' : '#3b82f6')}`
                                          }}>
                                            📅 Ödev Hedefi: {new Date(test.testDueDate).toLocaleDateString('tr-TR')}
                                          </span>
                                        ) : (
                                          <span style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                            background: 'var(--color-surface-hover)',
                                            color: 'var(--color-text-muted)',
                                            border: '1px solid var(--color-border)'
                                          }}>
                                            📖 Kitap Testi
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {test.isCompleted && test.bestScore !== null && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#166534', background: '#f0fdf4', padding: '3px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #bbf7d0' }}>
                                          <Award size={12} /> %{test.bestScore}
                                        </span>
                                        {test.bestSub && (
                                          <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#f8fafc', padding: '3px 9px', borderRadius: '99px', border: '1px solid #e2e8f0', display: 'inline-flex', gap: 6 }}>
                                            <span style={{ color: '#16a34a' }}>{test.bestSub.correctCount || 0}D</span>
                                            <span style={{ color: '#dc2626' }}>{test.bestSub.wrongCount || 0}Y</span>
                                            <span style={{ color: '#64748b' }}>{test.bestSub.blankCount || 0}B</span>
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    <div className="sbdp-test-actions-mobile" style={{ flexShrink: 0 }}>
                                      {test.isCompleted ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                          <button
                                            className="sbdp-btn-solve"
                                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '0.6rem', border: '1.5px solid #bbf7d0', color: '#166534', background: '#f0fdf4', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            onClick={() => navigate(`/review/${test.latestSubId}`, { state: { from: `/student/books/${book?.id}?studentId=${studentId}&fromTeacher=${isFromTeacher}` } })}
                                          >
                                            <Eye size={13} /> Sonucu İncele
                                          </button>
                                          <button
                                            style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            title="Doğru/Yanlış Sonucunu Düzenle"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenManualTest(test, subj.name, topic.name);
                                            }}
                                          >
                                            <Edit3 size={12} /> D/Y Düzenle
                                          </button>
                                          {isTeacherViewing && (
                                            <>
                                              <button
                                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid #bfdbfe', color: '#1d4ed8', background: '#eff6ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                title="Testi Düzenle"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenEditTest(test);
                                                }}
                                              >
                                                <Edit size={12} /> Düzenle
                                              </button>
                                              <button
                                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid #fecaca', color: '#dc2626', background: '#fef2f2', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                title="Bu testi sıfırla"
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  if (window.confirm(`"${test.name}" testinin sonucunu sıfırlamak istiyor musunuz?`)) {
                                                    if (test.latestSubId) {
                                                      await deleteSubmission(test.latestSubId);
                                                    }
                                                    if (test.bestSub?.id) {
                                                      await deleteSubmission(test.bestSub.id);
                                                    }
                                                    if (test.bestSub?.supabaseId) {
                                                      await deleteSubmission(test.bestSub.supabaseId);
                                                    }
                                                    if (typeof deleteStudentSubmissionsForBookOrHw === 'function') {
                                                      await deleteStudentSubmissionsForBookOrHw(studentId, null, book?.id, [test.id]);
                                                    }
                                                    if (typeof clearHomeworkSubmissionsForStudent === 'function') {
                                                      await clearHomeworkSubmissionsForStudent(null, studentId, book?.id, [test.id]);
                                                    }
                                                  }
                                                }}
                                              >
                                                <RotateCcw size={12} /> Sıfırla
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      ) : test.isLocked ? (
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <Lock size={14} /> Kilitli
                                        </span>
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                          <button
                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '0.6rem', border: '1.5px solid #86efac', color: '#166534', background: 'var(--color-surface)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            title="Doğru/Yanlış/Boş Sayılarını Gir"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenManualTest(test, subj.name, topic.name);
                                            }}
                                          >
                                            <Edit3 size={13} /> ⚡ D/Y Gir
                                          </button>
                                          {isTeacherViewing && (
                                            <button
                                              style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid #bfdbfe', color: '#1d4ed8', background: '#eff6ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                              title="Testi Düzenle"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenEditTest(test);
                                              }}
                                            >
                                              <Edit size={12} /> Düzenle
                                            </button>
                                          )}
                                          <button
                                            className="sbdp-btn-solve"
                                            style={{ padding: '0.4rem 1.1rem', fontSize: '0.82rem', fontWeight: 900, borderRadius: '0.6rem', border: 'none', color: 'white', background: `linear-gradient(135deg,${sc.from},${sc.to})`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 4px 12px ${sc.accent}44` }}
                                            onClick={() => navigate(`/book-quiz/${test.id}?studentId=${studentId}`)}
                                          >
                                            <PlayCircle size={14} /> {isFromTeacher ? 'Teste Git' : 'Şimdi Çöz'}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    subj.tests.map(test => {
                      let stateBg = 'var(--color-surface)', stateBorder = 'var(--color-border)', stateAccent = 'var(--color-border-input)';
                      if (test.isCompleted) { stateBg = 'var(--color-surface)'; stateBorder = '#bbf7d0'; stateAccent = '#10b981'; }
                      else if (!test.isLocked) { stateBg = 'var(--color-surface)'; stateBorder = 'var(--color-border)'; stateAccent = sc.accent; }

                      return (
                        <div key={test.id} className="sbdp-test-row" style={{ display: 'flex', alignItems: 'center', background: stateBg, border: `1px solid ${stateBorder}`, borderLeft: `4px solid ${stateAccent}`, borderRadius: '0.8rem', padding: '0.8rem 1rem', flexWrap: 'wrap', gap: '0.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: test.isCompleted ? 'linear-gradient(135deg,#10b981,#059669)' : test.isLocked ? 'var(--color-surface-hover)' : `linear-gradient(135deg,${sc.from},${sc.to})`, color: test.isLocked ? 'var(--color-text-muted)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                            {test.isCompleted ? <CheckCircle2 size={16} /> : test.index}
                          </div>

                          <div style={{ flex: 1, minWidth: 140 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: test.isLocked ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                              {test.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>{test.questionCount || 20} Soru</span>
                              {test.testDueDate && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: test.isCompleted ? '#f0fdf4' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#fef2f2' : 'rgba(37,99,235,0.12)'),
                                  color: test.isCompleted ? '#166534' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#dc2626' : '#60a5fa'),
                                  border: `1px solid ${test.isCompleted ? '#bbf7d0' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#fecaca' : '#3b82f6')}`
                                }}>
                                  📅 Hedef: {new Date(test.testDueDate).toLocaleDateString('tr-TR')}
                                </span>
                              )}
                            </div>
                          </div>

                          {test.isCompleted && test.bestScore !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#166534', background: '#f0fdf4', padding: '3px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #bbf7d0' }}>
                                <Award size={12} /> %{test.bestScore}
                              </span>
                              {test.bestSub && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'var(--color-surface-hover)', padding: '3px 9px', borderRadius: '99px', border: '1px solid var(--color-border)', display: 'inline-flex', gap: 6 }}>
                                  <span style={{ color: '#16a34a' }}>{test.bestSub.correctCount || 0}D</span>
                                  <span style={{ color: '#dc2626' }}>{test.bestSub.wrongCount || 0}Y</span>
                                  <span style={{ color: 'var(--color-text-muted)' }}>{test.bestSub.blankCount || 0}B</span>
                                </span>
                              )}
                            </div>
                          )}

                          <div className="sbdp-test-actions-mobile" style={{ flexShrink: 0 }}>
                            {test.isCompleted ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <button
                                  className="sbdp-btn-solve"
                                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '0.6rem', border: '1.5px solid #bbf7d0', color: '#166534', background: '#f0fdf4', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onClick={() => navigate(`/review/${test.latestSubId}`, { state: { from: `/student/books/${book?.id}?studentId=${studentId}&fromTeacher=${isFromTeacher}` } })}
                                >
                                  <Eye size={13} /> Sonucu İncele
                                </button>
                                <button
                                  style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  title="Doğru/Yanlış Sonucunu Düzenle"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenManualTest(test, null, null);
                                  }}
                                >
                                  <Edit3 size={12} /> D/Y Düzenle
                                </button>
                                {isTeacherViewing && (
                                  <>
                                    <button
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid #bfdbfe', color: '#1d4ed8', background: '#eff6ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                      title="Testi Düzenle"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditTest(test);
                                      }}
                                    >
                                      <Edit size={12} /> Düzenle
                                    </button>
                                    <button
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid #fecaca', color: '#dc2626', background: '#fef2f2', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                      title="Bu testi sıfırla (Sadece Öğretmen)"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`"${test.name}" testinin sonucunu sıfırlamak istiyor musunuz?`)) {
                                          if (test.latestSubId) {
                                            await deleteSubmission(test.latestSubId);
                                          }
                                          if (test.bestSub?.id) {
                                            await deleteSubmission(test.bestSub.id);
                                          }
                                          if (test.bestSub?.supabaseId) {
                                            await deleteSubmission(test.bestSub.supabaseId);
                                          }
                                          if (typeof deleteStudentSubmissionsForBookOrHw === 'function') {
                                            await deleteStudentSubmissionsForBookOrHw(studentId, null, book?.id, [test.id]);
                                          }
                                          if (typeof clearHomeworkSubmissionsForStudent === 'function') {
                                            await clearHomeworkSubmissionsForStudent(null, studentId, book?.id, [test.id]);
                                          }
                                        }
                                      }}
                                    >
                                      <RotateCcw size={12} /> Sıfırla
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : test.isLocked ? (
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Lock size={14} /> Kilitli
                              </span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <button
                                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '0.6rem', border: '1.5px solid #86efac', color: '#166534', background: 'var(--color-surface)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  title="Doğru/Yanlış/Boş Sayılarını Gir"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenManualTest(test, null, null);
                                  }}
                                >
                                  <Edit3 size={13} /> ⚡ D/Y Gir
                                </button>
                                {isTeacherViewing && (
                                  <button
                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid #bfdbfe', color: '#1d4ed8', background: '#eff6ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                    title="Testi Düzenle"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditTest(test);
                                    }}
                                  >
                                    <Edit size={12} /> Düzenle
                                  </button>
                                )}
                                <button
                                  className="sbdp-btn-solve"
                                  style={{ padding: '0.4rem 1.1rem', fontSize: '0.82rem', fontWeight: 900, borderRadius: '0.6rem', border: 'none', color: 'white', background: `linear-gradient(135deg,${sc.from},${sc.to})`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 4px 12px ${sc.accent}44` }}
                                  onClick={() => navigate(`/book-quiz/${test.id}?studentId=${studentId}`)}
                                >
                                  <PlayCircle size={14} /> {isFromTeacher ? 'Teste Git' : 'Şimdi Çöz'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                </div>
              )}
            </div>
          );
        })}

        {subjectProgress.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--color-surface)', borderRadius: '1.25rem', border: '1.5px dashed var(--color-border-input)', color: 'var(--color-text-muted)' }}>
            {hwLoading || booksLoading ? 'Atanmış görevler yükleniyor…' : 'Bu kitaba ait atanmış görev bulunamadı.'}
          </div>
        )}
      </div>

      {isBulkSettingsModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem', fontWeight: 900 }}>
                  <Settings size={24} color="#6366f1" /> Toplu Test Ayarları
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  Cevap anahtarlarını klavyeden doğrudan (Örn: ABCDE) yazabilirsiniz.
                </p>
              </div>
              <button onClick={() => setIsBulkSettingsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {subjectProgress.map(subj => (
                  <div key={subj.id}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-text)', fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                      {subj.name}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {subj.tests.map(t => {
                        const testData = bulkSettings[t.id] || { questionCount: 20, answerKeyString: '' };
                        const isFour = book?.optionCount === 4;
                        const cleanRegex = isFour ? /[^A-Da-d]/g : /[^A-Ea-e]/g;
                        const cleanedLen = testData.answerKeyString.replace(cleanRegex, '').length;

                        return (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'var(--color-surface-hover)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <div style={{ fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.25rem' }}>{t.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Girilen Cevap: <strong style={{ color: cleanedLen === testData.questionCount ? '#10b981' : '#ef4444' }}>{cleanedLen}</strong> / {testData.questionCount}
                              </div>
                            </div>
                            
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Soru</label>
                              <input 
                                type="number" 
                                min="1" 
                                value={testData.questionCount} 
                                onChange={e => setBulkSettings(prev => ({
                                  ...prev, 
                                  [t.id]: { ...prev[t.id], questionCount: Number(e.target.value) }
                                }))}
                                style={{ width: '60px', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border-input)', fontWeight: 800, textAlign: 'center', background: 'var(--color-surface)', color: 'var(--color-text)' }} 
                              />
                            </div>

                            <div style={{ flex: 3 }}>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                                Cevap Anahtarı ({isFour ? 'A,B,C,D - Ortaokul' : 'A,B,C,D,E - Lise'})
                              </label>
                              <input 
                                type="text" 
                                placeholder={isFour ? "Örn: ABCDABCD..." : "Örn: ABCDEADCBA..."} 
                                value={testData.answerKeyString}
                                onChange={e => {
                                  const raw = e.target.value.toUpperCase();
                                  setBulkSettings(prev => ({
                                    ...prev, 
                                    [t.id]: { ...prev[t.id], answerKeyString: raw }
                                  }));
                                }}
                                style={{ 
                                  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', 
                                  border: `1px solid ${cleanedLen > testData.questionCount ? '#ef4444' : 'var(--color-border-input)'}`, 
                                  fontWeight: 800, letterSpacing: '0.25em', fontFamily: 'monospace',
                                  background: 'var(--color-surface)', color: 'var(--color-text)'
                                }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--color-surface-hover)', borderBottomLeftRadius: 'var(--border-radius-lg)', borderBottomRightRadius: 'var(--border-radius-lg)' }}>
              <button className="btn btn-outline" onClick={() => setIsBulkSettingsModalOpen(false)}>İptal</button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveBulkSettings}
                disabled={isSavingBulk}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}
              >
                <Save size={18} /> {isSavingBulk ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Test Edit Modal (Teacher) */}
      {isEditTestModalOpen && editingTest && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '450px', background: 'var(--color-surface)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: '1.5px solid var(--color-border)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-text)', fontSize: '1.15rem', fontWeight: 800 }}>Testi Düzenle: {editingTest.name}</h3>
            
            <div style={{ margin: '1rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>Test Adı</label>
              <input 
                type="text" 
                value={editTestFormData.name} 
                onChange={e => setEditTestFormData(p => ({ ...p, name: e.target.value }))} 
                style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid var(--color-border-input)', fontWeight: 700, background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} 
                autoFocus 
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>Soru Sayısı</label>
              <input 
                type="number" 
                min="1" 
                max="100" 
                value={editTestFormData.questionCount} 
                onChange={e => setEditTestFormData(p => ({ ...p, questionCount: parseInt(e.target.value) || 0 }))} 
                style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid var(--color-border-input)', fontWeight: 700, background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} 
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>PDF Linki (İsteğe Bağlı)</label>
              <input 
                type="url" 
                value={editTestFormData.pdfUrl || ''} 
                onChange={e => setEditTestFormData(p => ({ ...p, pdfUrl: e.target.value }))} 
                placeholder="https://drive.google.com/... veya PDF URL" 
                style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid var(--color-border-input)', fontSize: '0.85rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} 
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                <span>Cevap Anahtarı</span>
                <input 
                  type="text" 
                  placeholder="Toplu Gir (Örn: ABC...)" 
                  onChange={(e) => {
                    const str = e.target.value;
                    const newKey = {};
                    str.replace(/[^A-Ea-e]/g, '').toUpperCase().split('').forEach((char, idx) => {
                      if (idx < editTestFormData.questionCount) newKey[idx + 1] = char;
                    });
                    setEditTestFormData(p => ({ ...p, answerKey: newKey }));
                  }}
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', borderRadius: '0.4rem', border: '1px solid var(--color-border-input)', width: '150px', outline: 'none', background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} 
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', background: 'var(--color-surface-hover)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                {Array.from({ length: editTestFormData.questionCount }).map((_, i) => {
                  const qNum = i + 1;
                  const val = editTestFormData.answerKey?.[qNum] || '';
                  return (
                    <div key={qNum} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-surface)', padding: '0.35rem 0.5rem', borderRadius: '0.4rem', border: '1px solid var(--color-border)' }}>
                      <div style={{ width: '18px', fontWeight: 800, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{qNum}.</div>
                      <div style={{ display: 'flex', gap: '0.2rem' }}>
                        {['A', 'B', 'C', 'D', 'E'].map(opt => {
                          const isSelected = val === opt;
                          return (
                            <button
                              type="button"
                              key={opt}
                              onClick={() => setEditTestFormData(p => ({ ...p, answerKey: { ...p.answerKey, [qNum]: opt } }))}
                              style={{
                                width: '24px', height: '24px', borderRadius: '50%', border: '1px solid var(--color-border-input)',
                                background: isSelected ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                color: isSelected ? 'white' : 'var(--color-text)', cursor: 'pointer', fontWeight: 800, fontSize: '0.7rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsEditTestModalOpen(false)} style={{ padding: '0.5rem 1rem', fontWeight: 700 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleSaveEditTest} style={{ padding: '0.5rem 1.25rem', fontWeight: 800 }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TEST HATA ANALİZİ MODALI (AÇILAN PENCERE) ── */}
      {mistakeModalTest && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            padding: '1rem'
          }}
          onClick={() => setMistakeModalTest(null)}
        >
          <div
            className="modal-content card glass animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--color-surface, #ffffff)',
              borderRadius: '1.25rem',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              border: '1.5px solid var(--color-border)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1.5px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: 'var(--color-surface-hover, #f8fafc)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  <span style={{ color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 6 }}>
                    📚 {mistakeModalTest.subjectName}
                  </span>
                  {mistakeModalTest.topicName && (
                    <span style={{ color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
                      🎯 {mistakeModalTest.topicName}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: 0, color: 'var(--color-text)', fontSize: '1.2rem', fontWeight: 900 }}>
                  📌 {mistakeModalTest.testName}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 6, border: '1px solid #fecaca' }}>
                    ❌ {mistakeModalTest.wrongCount || mistakeModalTest.wrongQuestions?.length || 0} Yanlış Soru
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, background: '#fffbeb', color: '#d97706', padding: '2px 8px', borderRadius: 6, border: '1px solid #fde68a' }}>
                    ⏳ {mistakeModalTest.pendingCount ?? 0} Bekleyen
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                    ✓ {mistakeModalTest.classifiedCount ?? 0} Sınıflandırıldı
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMistakeModalTest(null)}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  transition: 'all 0.15s'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#eff6ff', border: '1px dashed #bfdbfe', borderRadius: 10, padding: '0.65rem 1rem', fontSize: '0.78rem', color: '#1e40af', fontWeight: 700 }}>
                💡 Aşağıdaki yanlış yaptığınız her soru için hata nedenine tıklayın. Seçiminiz anında veritabanına kaydedilir.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(mistakeModalTest.wrongQuestions || []).map((qItem, qIdx) => {
                  const reasonObj = qItem.reason ? bookMistakeStats.reasonDefs[qItem.reason] : null;

                  return (
                    <div
                      key={qItem.qNo || qIdx}
                      style={{
                        background: 'var(--color-surface, #ffffff)',
                        border: `1.5px solid ${reasonObj ? reasonObj.border : 'var(--color-border, #e2e8f0)'}`,
                        borderRadius: 12,
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Top row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: '0.82rem',
                            fontWeight: 900,
                            background: '#fef2f2',
                            color: '#dc2626',
                            padding: '3px 10px',
                            borderRadius: 8,
                            border: '1px solid #fecaca'
                          }}>
                            Soru {qItem.qNo}
                          </span>
                          {qItem.userAnswer && qItem.userAnswer !== '—' && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                              Öğrenci: <strong style={{ color: '#dc2626' }}>{qItem.userAnswer}</strong> • Doğru: <strong style={{ color: '#16a34a' }}>{qItem.correctAnswer}</strong>
                            </span>
                          )}
                        </div>

                        {reasonObj ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: '0.76rem',
                              fontWeight: 900,
                              background: reasonObj.bg,
                              color: reasonObj.color,
                              padding: '3px 9px',
                              borderRadius: 8,
                              border: `1px solid ${reasonObj.border}`
                            }}>
                              ✓ {qItem.rawReason || reasonObj.key}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAssignMistakeInModal(mistakeModalTest, qItem.qNo, qItem.reason)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '0.68rem',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                fontWeight: 700
                              }}
                              title="Sebebi Kaldır"
                            >
                              Kaldır
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 6 }}>
                            ⏳ Sebep Seçilmedi
                          </span>
                        )}
                      </div>

                      {/* Reasons buttons */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[
                          { label: '⚡ İşlem Hatası', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                          { label: '⚠️ Dikkat Kaybı', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
                          { label: '📖 Formül / Bilgi', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
                          { label: '🧠 Konu Eksiği', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
                          { label: '⏱️ Zaman Yetmedi', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' }
                        ].map(r => {
                          const isSelected = qItem.reason === r.label;

                          return (
                            <button
                              key={r.label}
                              type="button"
                              onClick={() => handleAssignMistakeInModal(mistakeModalTest, qItem.qNo, r.label)}
                              style={{
                                padding: '0.4rem 0.75rem',
                                fontSize: '0.74rem',
                                fontWeight: 900,
                                borderRadius: 8,
                                border: `1.5px solid ${isSelected ? r.color : r.border}`,
                                background: isSelected ? r.color : r.bg,
                                color: isSelected ? '#ffffff' : r.color,
                                cursor: 'pointer',
                                transition: 'all 0.12s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: isSelected ? `0 2px 8px ${r.color}40` : 'none'
                              }}
                            >
                              {isSelected && <Check size={12} />}
                              <span>{r.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1.5px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--color-surface-hover, #f8fafc)'
            }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                Veriler anında veritabanı ile senkronize edilir.
              </span>
              <button
                type="button"
                onClick={() => setMistakeModalTest(null)}
                style={{
                  padding: '0.55rem 1.35rem',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Check size={16} /> Tamamla & Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manuel Test Sonucu Ekleme Modalı */}
      <ManualTestModal
        isOpen={manualTestModalData.isOpen}
        initialData={manualTestModalData.data}
        onClose={() => setManualTestModalData({ isOpen: false, data: null })}
      />
    </div>
  );
}
