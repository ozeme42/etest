import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { isHomeworkForStudent } from '../utils/testResolver';
import { BookOpen, ArrowLeft, CheckCircle2, Lock, PlayCircle, Layers, Award, Target, Settings, X, Save, BarChart2, FileText, ChevronDown, ChevronRight, RotateCcw, RefreshCw, Eye, Edit } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { toUUID } from '../services/supabaseService';
import PdfViewerPanel from '../components/PdfViewerPanel';

export default function StudentBookDetailsPage() {
  const { bookId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users = [] } = useUser();
  const { homeworks = [], isLoading: hwLoading, clearHomeworkSubmissionsForStudent } = useHomework();
  const { books = [], bookTests = [], isLoading: booksLoading, updateTrackedBookTest } = useTrackedBooks();
  const { submissions = [], deleteSubmission, deleteStudentSubmissionsForBookOrHw } = useEvaluation();
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

    return (book.subjects || []).map(subject => {
      // Find all tests in this subject
      const allSubjectTests = bookTests.filter(t => String(t.subjectId) === String(subject.id));
      
      // Keep ALL tests in the subject (sorted naturally by test name and number)
      const subjTests = (allSubjectTests || [])
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr', { numeric: true, sensitivity: 'base' }));
      
      if (subjTests.length === 0) return null;

      const testsWithStatus = subjTests.map((t, index) => {
        // Is it solved? Check submissions strictly matching this test ID
        const tIdStr = String(t.id);
        const tUuidStr = String(toUUID(t.id) || '');
        const studentIdStr = String(studentId);
        const studentUuidStr = String(toUUID(studentId) || '');

        const solvedSubs = submissions.filter(s => {
          const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr) || (studentUuidStr && toUUID(s.studentId) === studentUuidStr);
          if (!isMatchStudent) return false;
          if (s.status === 'in_progress' || s.status === 'draft') return false;

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

          return matchFields.some(f => f && (f === tIdStr || (tUuidStr && f === tUuidStr) || toUUID(f) === tIdStr || (tUuidStr && toUUID(f) === tUuidStr)));
        });

        // Also check if any homework submission explicitly belongs to this test ID
        let hwSub = null;
        for (const hw of homeworks) {
          if (!hw.submissions || !Array.isArray(hw.submissions)) continue;
          const match = hw.submissions.find(s => {
            const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr);
            if (!isMatchStudent) return false;
            return String(s.testId || s.bookTestId) === tIdStr || (tUuidStr && String(s.testId || s.bookTestId) === tUuidStr);
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
          bestScore = Math.max(...solvedSubs.map(s => s.score || 0));
          bestSub = solvedSubs[solvedSubs.length - 1]; // get the latest one
        } else if (hwSub) {
          bestScore = hwSub.score || 0;
          bestSub = hwSub;
        }

        let testDueDate = null;
        const matchingHw = homeworks.find(hw => hw.isBookAssignment && String(hw.bookId) === String(bookId) && hw.testDueDates?.[t.id]);
        if (matchingHw?.testDueDates?.[t.id]) {
          testDueDate = matchingHw.testDueDates[t.id];
        }

        const isAssignedHomework = Boolean(testDueDate || assignedTestIds.has(String(t.id)));

        return {
          ...t,
          index: index + 1,
          isCompleted,
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
          .filter(t => String(t.topicId) === String(topic.id))
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr', { numeric: true, sensitivity: 'base' }));
        return {
          ...topic,
          tests: topicTests,
          completedCount: topicTests.filter(t => t.isCompleted).length,
          totalCount: topicTests.length
        };
      }).filter(top => top.tests.length > 0);

      const directTests = testsWithStatus
        .filter(t => !t.topicId || t.topicId === 'direct' || String(t.topicId) === String(subject.id) || !topicsList.some(top => String(top.id) === String(t.topicId)))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr', { numeric: true, sensitivity: 'base' }));

      return {
        ...subject,
        tests: testsWithStatus,
        topics: topicsWithTests,
        directTests,
        completedCount,
        totalCount: testsWithStatus.length,
        pct: Math.round((completedCount / testsWithStatus.length) * 100)
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
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
        overallCorrect += test.bestSub.correctCount || 0;
        overallWrong += test.bestSub.wrongCount || 0;
        overallBlank += test.bestSub.blankCount || 0;
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
              subjCorrect += test.bestSub.correctCount || 0;
              subjWrong += test.bestSub.wrongCount || 0;
              subjBlank += test.bestSub.blankCount || 0;
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

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.28) 0%, transparent 50%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.22) 0%, transparent 50%), radial-gradient(ellipse at 50% 85%, rgba(14, 165, 233, 0.22) 0%, transparent 55%), linear-gradient(180deg, #0d1527 0%, #131f3b 35%, #1a274d 70%, #101a33 100%)', padding: '1.5rem 1.5rem', maxWidth: '1600px', width: '100%', margin: '0 auto', fontFamily: "'Inter', system-ui, sans-serif", color: '#f8fafc', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .sbdp-anim { animation: fadeSlideUp 0.3s ease both; }
        .sbdp-subject-card { transition: box-shadow 0.2s, transform 0.2s; }
        .sbdp-subject-card:hover { box-shadow: 0 8px 32px rgba(99,102,241,0.3) !important; transform: translateY(-2px); }
        .sbdp-test-row { transition: background 0.15s, box-shadow 0.15s; }
        .sbdp-test-row:hover { background: rgba(255,255,255,0.1) !important; }
        .sbdp-btn-solve { transition: box-shadow 0.15s, transform 0.15s; }
        .sbdp-btn-solve:hover { box-shadow: 0 4px 16px rgba(99,102,241,0.45) !important; transform: translateY(-1px); }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={() => navigate(isFromTeacher ? `/books/${book?.id}` : (book?.bookType === 'exam' ? '/student/exams' : '/student/books'))}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: '0.75rem', padding: '0.5rem 1.1rem', fontWeight: 800, fontSize: '0.85rem', color: '#ffffff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
        >
          <ArrowLeft size={16} /> {isFromTeacher ? 'Kitap Yönetimine Dön' : (book?.bookType === 'exam' ? 'Denemelere Dön' : 'Kitaplarıma Dön')}
        </button>
        {bookData.isSelfAdded && (
          <button
            onClick={() => setIsBulkSettingsModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: '0.75rem', padding: '0.5rem 1.1rem', fontWeight: 900, fontSize: '0.85rem', color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
          >
            <Settings size={16} /> Cevap Anahtarı Gir
          </button>
        )}
      </div>

      {isFromTeacher && (
        <div className="sbdp-anim" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', color: 'white', padding: '0.9rem 1.25rem', borderRadius: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 6px 20px rgba(30,27,75,0.4)', border: '1.5px solid rgba(165,180,252,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              {(targetStudent?.name || 'Ö').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
                👤 {targetStudent?.name || 'Öğrenci'} <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#4f46e5', padding: '2px 8px', borderRadius: 99 }}>Öğrenci Kitap İlerleme Görünümü</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#c7d2fe', marginTop: 2 }}>
                Öğrencinin gördüğü birebir kitap ekranı • Çözülen testler, başarı oranları ve optik formlar
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/books/${book?.id}`)}
            style={{ background: 'white', border: 'none', color: '#1e1b4b', padding: '0.45rem 1rem', borderRadius: '0.6rem', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          >
            <ArrowLeft size={15} /> Kitap Yönetimine Dön
          </button>
        </div>
      )}

      {overallPct < 100 && bookData.remainingDays !== null && (
        <div className="sbdp-anim" style={{ background: 'linear-gradient(135deg, rgba(6,78,59,0.85), rgba(6,95,70,0.85))', border: '1.5px solid rgba(52,211,153,0.4)', borderRadius: '1.25rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 8px 24px rgba(6,78,59,0.35)' }}>
          <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(16,185,129,0.4)' }}>
            <Target size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#a7f3d0', marginBottom: 2 }}>Akıllı Tempo Önerisi</div>
            <div style={{ fontSize: '0.82rem', color: '#d1fae5', fontWeight: 600 }}>
              {bookData.remainingDays === 0
                ? 'Süren doldu! Testleri bir an önce tamamlamalısın.'
                : `Hedefe ${bookData.remainingDays} gün kaldı. Haftada ortalama ${Math.max(1, Math.ceil(((overallTotal - overallCompleted) / bookData.remainingDays) * 7))} test çözmelisin.`}
            </div>
          </div>
        </div>
      )}

      <div className="sbdp-anim" style={{ borderRadius: '1.5rem', overflow: 'hidden', marginBottom: '1.75rem', boxShadow: '0 16px 40px rgba(0,0,0,0.45)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
        <div style={{ background: 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #0369a1 100%)', padding: '2rem 2.5rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -50, right: 80, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap', position: 'relative' }}>
            <div style={{ width: 90, height: 120, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
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
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', margin: '0 0 0.75rem', lineHeight: 1.25, textShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
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

        <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.95) 100%)', display: 'flex', flexWrap: 'wrap', gap: 0, borderTop: '2px solid rgba(255,255,255,0.12)' }}>
          {[
            { label: 'Test', value: `${overallCompleted}/${overallTotal}`, color: '#a5b4fc', bg: 'rgba(99,102,241,0.12)', icon: '📋' },
            { label: 'Doğru', value: overallCorrect, color: '#4ade80', bg: 'rgba(5,150,105,0.15)', icon: '✅' },
            { label: 'Yanlış', value: overallWrong, color: '#f87171', bg: 'rgba(225,29,72,0.15)', icon: '❌' },
            { label: 'Boş', value: overallBlank, color: '#cbd5e1', bg: 'rgba(255,255,255,0.05)', icon: '⬜' },
            { label: 'Başarı', value: `%${overallSuccessRate}`, color: '#c084fc', bg: 'rgba(168,85,247,0.15)', icon: '🎯' },
          ].map((s, i) => (
            <div key={i} style={{ flex: '1 1 120px', padding: '1.1rem 0.75rem', textAlign: 'center', borderRight: i < 4 ? '1px solid rgba(255,255,255,0.08)' : 'none', background: s.bg }}>
              <div style={{ fontSize: '1.15rem', marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {subjectChartData.length > 0 && (
        <div className="sbdp-anim" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 27, 75, 0.94) 100%)', backdropFilter: 'blur(20px)', borderRadius: '1.4rem', border: '1.5px solid rgba(165, 180, 252, 0.25)', padding: '1.75rem 2rem', marginBottom: '2rem', boxShadow: '0 12px 36px rgba(0,0,0,0.35)' }}>
          
          {/* Chart Header & Selectors */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={22} color="#818cf8" />
                {selectedChartSubject === 'all' 
                  ? 'Derslere Göre Başarı Dağılımı' 
                  : selectedChartTopic === 'all' 
                    ? `${currentChartSubjectObj?.name || 'Ders'} - Ünitelere Göre Başarı` 
                    : `${currentChartTopicObj?.name || 'Ünite'} - Testlere Göre Başarı`}
              </h3>
              
              {/* Breadcrumb Path */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginTop: 4 }}>
                <span 
                  onClick={() => { setSelectedChartSubject('all'); setSelectedChartTopic('all'); }} 
                  style={{ cursor: 'pointer', color: selectedChartSubject === 'all' ? '#ffffff' : '#818cf8', background: selectedChartSubject === 'all' ? 'rgba(255,255,255,0.12)' : 'transparent', padding: '0.15rem 0.5rem', borderRadius: 6, transition: 'all 0.15s' }}
                >
                  📚 Tüm Dersler
                </span>
                {currentChartSubjectObj && (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>/</span>
                    <span 
                      onClick={() => setSelectedChartTopic('all')} 
                      style={{ cursor: 'pointer', color: selectedChartTopic === 'all' ? '#ffffff' : '#818cf8', background: selectedChartTopic === 'all' ? 'rgba(255,255,255,0.12)' : 'transparent', padding: '0.15rem 0.5rem', borderRadius: 6, transition: 'all 0.15s' }}
                    >
                      {currentChartSubjectObj.name}
                    </span>
                  </>
                )}
                {currentChartTopicObj && (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>/</span>
                    <span style={{ color: '#ffffff', fontWeight: 800, background: 'rgba(99,102,241,0.25)', padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                      {currentChartTopicObj.name}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Select Dropdowns & Metric Toggle */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Metric Toggle */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)' }}>
                <button
                  onClick={() => setBookChartMetric('grouped')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: bookChartMetric === 'grouped' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                    color: bookChartMetric === 'grouped' ? '#ffffff' : 'rgba(255,255,255,0.7)',
                    boxShadow: bookChartMetric === 'grouped' ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
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
                    background: bookChartMetric === 'rate' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                    color: bookChartMetric === 'rate' ? '#ffffff' : 'rgba(255,255,255,0.7)',
                    boxShadow: bookChartMetric === 'rate' ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
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
                style={{ padding: '0.45rem 0.9rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.18)', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', outline: 'none' }}
              >
                <option value="all" style={{ background: '#0f172a', color: '#ffffff' }}>📚 Tüm Dersler</option>
                {subjectProgress.map(s => <option key={s.id} value={String(s.id)} style={{ background: '#0f172a', color: '#ffffff' }}>{s.name}</option>)}
              </select>

              {/* Topic/Unit Select */}
              {currentChartSubjectObj && currentChartSubjectObj.topics && currentChartSubjectObj.topics.length > 0 && (
                <select
                  value={selectedChartTopic}
                  onChange={e => setSelectedChartTopic(e.target.value)}
                  style={{ padding: '0.45rem 0.9rem', borderRadius: '0.65rem', border: '1.5px solid rgba(165,180,252,0.4)', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', background: 'rgba(99,102,241,0.25)', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="all" style={{ background: '#0f172a', color: '#ffffff' }}>📑 Tüm Üniteler / Konular</option>
                  {currentChartSubjectObj.topics.map(tp => <option key={tp.id} value={String(tp.id)} style={{ background: '#0f172a', color: '#ffffff' }}>{tp.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Interactive Drill-down Cards (Grafiğin Üstünde) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
            {subjectChartData.map((item, idx) => {
              const rateColor = item.rate >= 70 ? '#4ade80' : item.rate >= 50 ? '#fbbf24' : item.totalQ === 0 ? '#94a3b8' : '#f87171';
              const rateBg = item.rate >= 70 ? 'rgba(5,150,105,0.18)' : item.rate >= 50 ? 'rgba(217,119,6,0.18)' : item.totalQ === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(225,29,72,0.18)';
              const rateBorder = item.rate >= 70 ? 'rgba(52,211,153,0.35)' : item.rate >= 50 ? 'rgba(253,186,116,0.35)' : item.totalQ === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(253,164,175,0.35)';
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
                    boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
                    cursor: isDrillable ? 'pointer' : 'default',
                    transition: 'all 0.18s ease'
                  }}
                  title={isDrillable ? `${item.name} detaylarını görmek için tıkla` : item.name}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: rateColor, textShadow: `0 0 10px ${rateColor}66` }}>
                      %{item.rate}
                    </span>
                  </div>

                  {/* Multi-segment mini progress bar */}
                  <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 1 }}>
                    {totalQ > 0 ? (
                      <>
                        {pctD > 0 && <div style={{ width: `${pctD}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', height: '100%' }} title={`Doğru: ${item.Doğru}`} />}
                        {pctY > 0 && <div style={{ width: `${pctY}%`, background: 'linear-gradient(90deg, #ef4444, #f87171)', height: '100%' }} title={`Yanlış: ${item.Yanlış}`} />}
                        {pctB > 0 && <div style={{ width: `${pctB}%`, background: '#94a3b8', height: '100%' }} title={`Boş: ${item.Boş}`} />}
                      </>
                    ) : (
                      <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', height: '100%' }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>
                    {item.totalTests ? (
                      <span>{item.solvedTests}/{item.totalTests} Test Çözüldü</span>
                    ) : (
                      <span>{item.isCompleted ? 'Tamamlandı' : 'Çözülmedi'}</span>
                    )}
                    <span style={{ display: 'flex', gap: 6, fontWeight: 800 }}>
                      <span style={{ color: '#4ade80' }}>{item.Doğru}D</span>
                      <span style={{ color: '#f87171' }}>{item.Yanlış}Y</span>
                      <span style={{ color: '#cbd5e1' }}>{item.Boş}B</span>
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
                <defs>
                  <linearGradient id="bookCorrectGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="bookWrongGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={1} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="bookBlankGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#cbd5e1" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#64748b" stopOpacity={0.65} />
                  </linearGradient>
                  <linearGradient id="bookRateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="displayName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#ffffff', fontWeight: 800 }} dy={10} tickFormatter={v => v.length > 24 ? v.substring(0, 24) + '…' : v} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#c7d2fe', fontWeight: 700 }} tickFormatter={v => bookChartMetric === 'rate' ? `%${v}` : v} domain={bookChartMetric === 'rate' ? [0, 100] : ['auto', 'auto']} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ background: '#0f172a', borderRadius: '0.85rem', border: '1.5px solid rgba(255,255,255,0.22)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontWeight: 800, fontSize: '0.83rem', color: '#ffffff' }} 
                  formatter={(value, name, props) => [
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
                      fill="url(#bookCorrectGrad)" 
                      radius={[8, 8, 2, 2]} 
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
                      fill="url(#bookWrongGrad)" 
                      radius={[8, 8, 2, 2]} 
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
                      fill="url(#bookBlankGrad)" 
                      radius={[8, 8, 2, 2]} 
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
                    fill="url(#bookRateGrad)" 
                    radius={[8, 8, 0, 0]} 
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

      {book.pdfUrl && showBookPdf && (
        <div style={{ marginBottom: '2rem' }}>
          <PdfViewerPanel pdfUrl={book.pdfUrl} title={book.title} defaultOpen={true} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {subjectProgress.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff' }}>📚 Ders Listesi</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(99,102,241,0.25)', color: '#c7d2fe', padding: '2px 8px', borderRadius: '99px', border: '1px solid rgba(165,180,252,0.3)' }}>{subjectProgress.length} Ders</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={expandAllSubjects} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#c7d2fe', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', padding: '4px 10px', borderRadius: '8px' }}>Tümünü Aç</button>
              <button onClick={collapseAllSubjects} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', padding: '4px 10px', borderRadius: '8px' }}>Kapat</button>
            </div>
          </div>
        )}

        {subjectProgress.map((subj, subjIdx) => {
          const isOpen = !!openSubjects[subj.id];
          const subjectColors = [
            { from: '#4f46e5', to: '#7c3aed', light: 'rgba(99,102,241,0.2)', accent: '#818cf8' },
            { from: '#0891b2', to: '#0e7490', light: 'rgba(8,145,178,0.2)', accent: '#38bdf8' },
            { from: '#059669', to: '#047857', light: 'rgba(5,150,105,0.2)', accent: '#34d399' },
            { from: '#d97706', to: '#b45309', light: 'rgba(217,119,6,0.2)', accent: '#fbbf24' },
            { from: '#7c3aed', to: '#6d28d9', light: 'rgba(124,58,237,0.2)', accent: '#c084fc' },
            { from: '#e11d48', to: '#be123c', light: 'rgba(225,29,72,0.2)', accent: '#fb7185' },
            { from: '#2563eb', to: '#1d4ed8', light: 'rgba(37,99,235,0.2)', accent: '#60a5fa' },
          ];
          const sc = subjectColors[subjIdx % subjectColors.length];

          return (
            <div key={subj.id} className="sbdp-subject-card" style={{ borderRadius: '1.3rem', overflow: 'hidden', border: `1.5px solid ${isOpen ? sc.accent + '66' : 'rgba(255,255,255,0.12)'}`, boxShadow: isOpen ? `0 8px 32px rgba(0,0,0,0.4)` : '0 4px 16px rgba(0,0,0,0.25)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)' }}>
              <div
                onClick={() => toggleSubject(subj.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', cursor: 'pointer', userSelect: 'none', background: isOpen ? `linear-gradient(135deg, ${sc.from}, ${sc.to})` : 'transparent', transition: 'background 0.25s', flexWrap: 'wrap', gap: '0.75rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '0.6rem', background: isOpen ? 'rgba(255,255,255,0.2)' : sc.light, color: isOpen ? 'white' : sc.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: isOpen ? '1.5px solid rgba(255,255,255,0.3)' : `1.5px solid ${sc.accent}55` }}>
                    <Layers size={18} />
                  </div>
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>{subj.name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isOpen ? 'rgba(255,255,255,0.18)' : sc.light, padding: '0.3rem 0.75rem', borderRadius: '99px', border: isOpen ? '1px solid rgba(255,255,255,0.3)' : `1px solid ${sc.accent}44` }}>
                    <div style={{ width: 60, height: 5, background: isOpen ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${subj.pct}%`, height: '100%', background: isOpen ? 'white' : `linear-gradient(90deg, ${sc.from}, ${sc.to})`, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isOpen ? 'white' : sc.accent, whiteSpace: 'nowrap' }}>{subj.completedCount}/{subj.totalCount}</span>
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: isOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isOpen ? 'white' : 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '0.85rem', background: 'rgba(0, 0, 0, 0.25)', borderTop: `1px solid rgba(255,255,255,0.1)`, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  
                  {/* Direct Tests */}
                  {subj.directTests && subj.directTests.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {subj.topics && subj.topics.length > 0 && (
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
                          <FileText size={14} color={sc.accent} /> Direkt Testler
                        </div>
                      )}
                      {subj.directTests.map(test => {
                        let stateBg = 'rgba(255,255,255,0.05)', stateBorder = 'rgba(255,255,255,0.1)', stateAccent = 'rgba(255,255,255,0.3)';
                        if (test.isCompleted) { stateBg = 'rgba(5,150,105,0.18)'; stateBorder = 'rgba(52,211,153,0.35)'; stateAccent = '#10b981'; }
                        else if (!test.isLocked) { stateBg = 'rgba(99,102,241,0.14)'; stateBorder = 'rgba(165,180,252,0.35)'; stateAccent = sc.accent; }

                        return (
                          <div key={test.id} className="sbdp-test-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: stateBg, border: `1px solid ${stateBorder}`, borderLeft: `4px solid ${stateAccent}`, borderRadius: '0.8rem', padding: '0.8rem 1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: test.isCompleted ? 'linear-gradient(135deg,#10b981,#059669)' : test.isLocked ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg,${sc.from},${sc.to})`, color: test.isLocked ? 'rgba(255,255,255,0.4)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0, boxShadow: test.isLocked ? 'none' : '0 2px 8px rgba(0,0,0,0.3)' }}>
                              {test.isCompleted ? <CheckCircle2 size={16} /> : test.index}
                            </div>

                            <div style={{ flex: 1, minWidth: 140 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: test.isLocked ? 'rgba(255,255,255,0.4)' : '#ffffff' }}>
                                {test.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span>{test.questionCount || 20} Soru</span>
                                {test.testDueDate ? (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    background: test.isCompleted ? 'rgba(5,150,105,0.25)' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? 'rgba(225,29,72,0.25)' : 'rgba(99,102,241,0.25)'),
                                    color: test.isCompleted ? '#4ade80' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#f87171' : '#a5b4fc'),
                                    border: `1px solid ${test.isCompleted ? 'rgba(52,211,153,0.35)' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? 'rgba(253,164,175,0.35)' : 'rgba(165,180,252,0.35)')}`
                                  }}>
                                    📅 Ödev Hedefi: {new Date(test.testDueDate).toLocaleDateString('tr-TR')}
                                  </span>
                                ) : (
                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: 'rgba(255,255,255,0.7)',
                                    border: '1px solid rgba(255,255,255,0.12)'
                                  }}>
                                    📖 Kitap Testi
                                  </span>
                                )}
                              </div>
                            </div>

                            {test.isCompleted && test.bestScore !== null && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#4ade80', background: 'rgba(5,150,105,0.25)', padding: '3px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid rgba(52,211,153,0.35)' }}>
                                  <Award size={12} /> %{test.bestScore}
                                </span>
                                {test.bestSub && (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(255,255,255,0.08)', padding: '3px 9px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.14)', display: 'inline-flex', gap: 6 }}>
                                    <span style={{ color: '#4ade80' }}>{test.bestSub.correctCount || 0}D</span>
                                    <span style={{ color: '#f87171' }}>{test.bestSub.wrongCount || 0}Y</span>
                                    <span style={{ color: '#cbd5e1' }}>{test.bestSub.blankCount || 0}B</span>
                                  </span>
                                )}
                              </div>
                            )}

                            <div style={{ flexShrink: 0 }}>
                              {test.isCompleted ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <button
                                    className="sbdp-btn-solve"
                                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '0.6rem', border: '1.5px solid rgba(52,211,153,0.4)', color: '#4ade80', background: 'rgba(5,150,105,0.15)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                    onClick={() => navigate(`/review/${test.latestSubId}`, { state: { from: `/student/books/${book?.id}?studentId=${studentId}&fromTeacher=${isFromTeacher}` } })}
                                  >
                                    <Eye size={13} /> Sonucu İncele
                                  </button>
                                  {isTeacherViewing && (
                                    <>
                                      <button
                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid rgba(165,180,252,0.3)', color: '#c7d2fe', background: 'rgba(99,102,241,0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        title="Testi Düzenle"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditTest(test);
                                        }}
                                      >
                                        <Edit size={12} /> Düzenle
                                      </button>
                                      <button
                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid rgba(253,164,175,0.3)', color: '#f87171', background: 'rgba(225,29,72,0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
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
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Lock size={14} /> Kilitli
                                </span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  {isTeacherViewing && (
                                    <button
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid rgba(165,180,252,0.3)', color: '#c7d2fe', background: 'rgba(99,102,241,0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
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
                                    style={{ padding: '0.4rem 1.2rem', fontSize: '0.82rem', fontWeight: 900, borderRadius: '0.6rem', border: 'none', color: 'white', background: `linear-gradient(135deg,${sc.from},${sc.to})`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 4px 12px ${sc.accent}44` }}
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
                        <div key={topic.id} style={{ borderRadius: '0.85rem', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                          <div
                            onClick={() => toggleTopic(topic.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', cursor: 'pointer', background: isTopicOpen ? sc.light : 'rgba(255,255,255,0.03)', borderBottom: isTopicOpen ? '1px solid rgba(255,255,255,0.1)' : 'none', flexWrap: 'wrap', gap: '0.5rem' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <FileText size={16} color={sc.accent} />
                              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>{topic.name}</span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ffffff', background: 'rgba(255,255,255,0.12)', padding: '2px 8px', borderRadius: 99, border: `1px solid rgba(255,255,255,0.2)` }}>
                                {topic.completedCount}/{topic.totalCount} Test
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                              {isTopicOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>
                          </div>

                          {isTopicOpen && (
                            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'rgba(0, 0, 0, 0.2)' }}>
                              {topic.tests.map(test => {
                                let stateBg = 'rgba(255,255,255,0.05)', stateBorder = 'rgba(255,255,255,0.1)', stateAccent = 'rgba(255,255,255,0.3)';
                                if (test.isCompleted) { stateBg = 'rgba(5,150,105,0.18)'; stateBorder = 'rgba(52,211,153,0.35)'; stateAccent = '#10b981'; }
                                else if (!test.isLocked) { stateBg = 'rgba(99,102,241,0.14)'; stateBorder = 'rgba(165,180,252,0.35)'; stateAccent = sc.accent; }

                                return (
                                  <div key={test.id} className="sbdp-test-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: stateBg, border: `1px solid ${stateBorder}`, borderLeft: `4px solid ${stateAccent}`, borderRadius: '0.8rem', padding: '0.8rem 1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: test.isCompleted ? 'linear-gradient(135deg,#10b981,#059669)' : test.isLocked ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg,${sc.from},${sc.to})`, color: test.isLocked ? 'rgba(255,255,255,0.4)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0, boxShadow: test.isLocked ? 'none' : '0 2px 8px rgba(0,0,0,0.3)' }}>
                                      {test.isCompleted ? <CheckCircle2 size={16} /> : test.index}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 140 }}>
                                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: test.isLocked ? 'rgba(255,255,255,0.4)' : '#ffffff' }}>
                                        {test.name}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span>{test.questionCount || 20} Soru</span>
                                        {test.testDueDate ? (
                                          <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 800,
                                            padding: '2px 7px',
                                            borderRadius: '6px',
                                            background: test.isCompleted ? 'rgba(5,150,105,0.25)' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? 'rgba(225,29,72,0.25)' : 'rgba(99,102,241,0.25)'),
                                            color: test.isCompleted ? '#4ade80' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#f87171' : '#a5b4fc'),
                                            border: `1px solid ${test.isCompleted ? 'rgba(52,211,153,0.35)' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? 'rgba(253,164,175,0.35)' : 'rgba(165,180,252,0.35)')}`
                                          }}>
                                            📅 Ödev Hedefi: {new Date(test.testDueDate).toLocaleDateString('tr-TR')}
                                          </span>
                                        ) : (
                                          <span style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                            background: 'rgba(255,255,255,0.08)',
                                            color: 'rgba(255,255,255,0.7)',
                                            border: '1px solid rgba(255,255,255,0.12)'
                                          }}>
                                            📖 Kitap Testi
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {test.isCompleted && test.bestScore !== null && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#4ade80', background: 'rgba(5,150,105,0.25)', padding: '3px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid rgba(52,211,153,0.35)' }}>
                                          <Award size={12} /> %{test.bestScore}
                                        </span>
                                        {test.bestSub && (
                                          <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(255,255,255,0.08)', padding: '3px 9px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.14)', display: 'inline-flex', gap: 6 }}>
                                            <span style={{ color: '#4ade80' }}>{test.bestSub.correctCount || 0}D</span>
                                            <span style={{ color: '#f87171' }}>{test.bestSub.wrongCount || 0}Y</span>
                                            <span style={{ color: '#cbd5e1' }}>{test.bestSub.blankCount || 0}B</span>
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    <div style={{ flexShrink: 0 }}>
                                      {test.isCompleted ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          <button
                                            className="sbdp-btn-solve"
                                            style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '0.6rem', border: '1.5px solid rgba(52,211,153,0.4)', color: '#4ade80', background: 'rgba(5,150,105,0.15)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            onClick={() => navigate(`/review/${test.latestSubId}`, { state: { from: `/student/books/${book?.id}?studentId=${studentId}&fromTeacher=${isFromTeacher}` } })}
                                          >
                                            <Eye size={13} /> Sonucu İncele
                                          </button>
                                          {isTeacherViewing && (
                                            <>
                                              <button
                                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid rgba(165,180,252,0.3)', color: '#c7d2fe', background: 'rgba(99,102,241,0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                title="Testi Düzenle"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenEditTest(test);
                                                }}
                                              >
                                                <Edit size={12} /> Düzenle
                                              </button>
                                              <button
                                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid rgba(253,164,175,0.3)', color: '#f87171', background: 'rgba(225,29,72,0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
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
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <Lock size={14} /> Kilitli
                                        </span>
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          {isTeacherViewing && (
                                            <button
                                              style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid rgba(165,180,252,0.3)', color: '#c7d2fe', background: 'rgba(99,102,241,0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
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
                                            style={{ padding: '0.4rem 1.2rem', fontSize: '0.82rem', fontWeight: 900, borderRadius: '0.6rem', border: 'none', color: 'white', background: `linear-gradient(135deg,${sc.from},${sc.to})`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 4px 12px ${sc.accent}44` }}
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
                      let stateBg = 'rgba(255,255,255,0.05)', stateBorder = 'rgba(255,255,255,0.1)', stateAccent = 'rgba(255,255,255,0.3)';
                      if (test.isCompleted) { stateBg = 'rgba(5,150,105,0.18)'; stateBorder = 'rgba(52,211,153,0.35)'; stateAccent = '#10b981'; }
                      else if (!test.isLocked) { stateBg = 'rgba(99,102,241,0.14)'; stateBorder = 'rgba(165,180,252,0.35)'; stateAccent = sc.accent; }

                      return (
                        <div key={test.id} className="sbdp-test-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: stateBg, border: `1px solid ${stateBorder}`, borderLeft: `4px solid ${stateAccent}`, borderRadius: '0.8rem', padding: '0.8rem 1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: test.isCompleted ? 'linear-gradient(135deg,#10b981,#059669)' : test.isLocked ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg,${sc.from},${sc.to})`, color: test.isLocked ? 'rgba(255,255,255,0.4)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0, boxShadow: test.isLocked ? 'none' : '0 2px 8px rgba(0,0,0,0.3)' }}>
                            {test.isCompleted ? <CheckCircle2 size={16} /> : test.index}
                          </div>

                          <div style={{ flex: 1, minWidth: 140 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: test.isLocked ? 'rgba(255,255,255,0.4)' : '#ffffff' }}>
                              {test.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>{test.questionCount || 20} Soru</span>
                              {test.testDueDate && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: test.isCompleted ? 'rgba(5,150,105,0.25)' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? 'rgba(225,29,72,0.25)' : 'rgba(99,102,241,0.25)'),
                                  color: test.isCompleted ? '#4ade80' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#f87171' : '#a5b4fc'),
                                  border: `1px solid ${test.isCompleted ? 'rgba(52,211,153,0.35)' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? 'rgba(253,164,175,0.35)' : 'rgba(165,180,252,0.35)')}`
                                }}>
                                  📅 Hedef: {new Date(test.testDueDate).toLocaleDateString('tr-TR')}
                                </span>
                              )}
                            </div>
                          </div>

                          {test.isCompleted && test.bestScore !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#4ade80', background: 'rgba(5,150,105,0.25)', padding: '3px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid rgba(52,211,153,0.35)' }}>
                                <Award size={12} /> %{test.bestScore}
                              </span>
                              {test.bestSub && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(255,255,255,0.08)', padding: '3px 9px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.14)', display: 'inline-flex', gap: 6 }}>
                                  <span style={{ color: '#4ade80' }}>{test.bestSub.correctCount || 0}D</span>
                                  <span style={{ color: '#f87171' }}>{test.bestSub.wrongCount || 0}Y</span>
                                  <span style={{ color: '#cbd5e1' }}>{test.bestSub.blankCount || 0}B</span>
                                </span>
                              )}
                            </div>
                          )}

                          <div style={{ flexShrink: 0 }}>
                            {test.isCompleted ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <button
                                  className="sbdp-btn-solve"
                                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '0.6rem', border: '1.5px solid rgba(52,211,153,0.4)', color: '#4ade80', background: 'rgba(5,150,105,0.15)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onClick={() => navigate(`/review/${test.latestSubId}`, { state: { from: `/student/books/${book?.id}?studentId=${studentId}&fromTeacher=${isFromTeacher}` } })}
                                >
                                  <Eye size={13} /> Sonucu İncele
                                </button>
                                {isTeacherViewing && (
                                  <>
                                    <button
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid rgba(165,180,252,0.3)', color: '#c7d2fe', background: 'rgba(99,102,241,0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                      title="Testi Düzenle"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditTest(test);
                                      }}
                                    >
                                      <Edit size={12} /> Düzenle
                                    </button>
                                    <button
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid rgba(253,164,175,0.3)', color: '#f87171', background: 'rgba(225,29,72,0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
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
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Lock size={14} /> Kilitli
                              </span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {isTeacherViewing && (
                                  <button
                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '0.6rem', border: '1px solid rgba(165,180,252,0.3)', color: '#c7d2fe', background: 'rgba(99,102,241,0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
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
                                  style={{ padding: '0.4rem 1.2rem', fontSize: '0.82rem', fontWeight: 900, borderRadius: '0.6rem', border: 'none', color: 'white', background: `linear-gradient(135deg,${sc.from},${sc.to})`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 4px 12px ${sc.accent}44` }}
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
          <div style={{ textAlign: 'center', padding: '3rem', background: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,27,75,0.85) 100%)', borderRadius: '1.25rem', border: '1.5px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
            {hwLoading || booksLoading ? 'Atanmış görevler yükleniyor…' : 'Bu kitaba ait atanmış görev bulunamadı.'}
          </div>
        )}
      </div>

      {isBulkSettingsModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem', fontWeight: 900 }}>
                  <Settings size={24} /> Toplu Test Ayarları
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Cevap anahtarlarını klavyeden doğrudan (Örn: ABCDE) yazabilirsiniz.
                </p>
              </div>
              <button onClick={() => setIsBulkSettingsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {subjectProgress.map(subj => (
                  <div key={subj.id}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                      {subj.name}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {subj.tests.map(t => {
                        const testData = bulkSettings[t.id] || { questionCount: 20, answerKeyString: '' };
                        const isFour = book?.optionCount === 4;
                        const cleanRegex = isFour ? /[^A-Da-d]/g : /[^A-Ea-e]/g;
                        const cleanedLen = testData.answerKeyString.replace(cleanRegex, '').length;

                        return (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <div style={{ fontWeight: 800, color: '#334155', marginBottom: '0.25rem' }}>{t.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                Girilen Cevap: <strong style={{ color: cleanedLen === testData.questionCount ? '#10b981' : '#ef4444' }}>{cleanedLen}</strong> / {testData.questionCount}
                              </div>
                            </div>
                            
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem' }}>Soru</label>
                              <input 
                                type="number" 
                                min="1" 
                                value={testData.questionCount} 
                                onChange={e => setBulkSettings(prev => ({
                                  ...prev, 
                                  [t.id]: { ...prev[t.id], questionCount: Number(e.target.value) }
                                }))}
                                style={{ width: '60px', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontWeight: 800, textAlign: 'center' }} 
                              />
                            </div>

                            <div style={{ flex: 3 }}>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem' }}>
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
                                  border: `1px solid ${cleanedLen > testData.questionCount ? '#ef4444' : '#cbd5e1'}`, 
                                  fontWeight: 800, letterSpacing: '0.25em', fontFamily: 'monospace' 
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

            <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#f8fafc', borderBottomLeftRadius: 'var(--border-radius-lg)', borderBottomRightRadius: 'var(--border-radius-lg)' }}>
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
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '450px', background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-primary)', fontSize: '1.15rem', fontWeight: 800 }}>Testi Düzenle: {editingTest.name}</h3>
            
            <div style={{ margin: '1rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>Test Adı</label>
              <input 
                type="text" 
                value={editTestFormData.name} 
                onChange={e => setEditTestFormData(p => ({ ...p, name: e.target.value }))} 
                style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontWeight: 700 }} 
                autoFocus 
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>Soru Sayısı</label>
              <input 
                type="number" 
                min="1"
                max="100"
                value={editTestFormData.questionCount} 
                onChange={e => setEditTestFormData(p => ({ ...p, questionCount: parseInt(e.target.value) || 0 }))} 
                style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontWeight: 700 }} 
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>PDF Linki (İsteğe Bağlı)</label>
              <input
                type="url"
                value={editTestFormData.pdfUrl || ''}
                onChange={e => setEditTestFormData(p => ({ ...p, pdfUrl: e.target.value }))}
                placeholder="https://drive.google.com/... veya PDF URL"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>
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
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', width: '150px', outline: 'none' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                {Array.from({ length: editTestFormData.questionCount }).map((_, i) => {
                  const qNum = i + 1;
                  const val = editTestFormData.answerKey?.[qNum] || '';
                  return (
                    <div key={qNum} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.35rem 0.5rem', borderRadius: '0.4rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ width: '18px', fontWeight: 800, fontSize: '0.75rem', color: '#64748b' }}>{qNum}.</div>
                      <div style={{ display: 'flex', gap: '0.2rem' }}>
                        {['A', 'B', 'C', 'D', 'E'].map(opt => {
                          const isSelected = val === opt;
                          return (
                            <button
                              type="button"
                              key={opt}
                              onClick={() => setEditTestFormData(p => ({ ...p, answerKey: { ...p.answerKey, [qNum]: opt } }))}
                              style={{
                                width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #cbd5e1',
                                background: isSelected ? 'var(--color-primary)' : 'white',
                                color: isSelected ? 'white' : '#1e293b', cursor: 'pointer', fontWeight: 800, fontSize: '0.7rem',
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
    </div>
  );
}
