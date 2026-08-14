import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { isHomeworkForStudent } from '../utils/testResolver';
import { BookOpen, ArrowLeft, CheckCircle2, Lock, PlayCircle, Layers, Award, Target, Settings, X, Save, BarChart2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toUUID } from '../services/supabaseService';
import PdfViewerPanel from '../components/PdfViewerPanel';

export default function StudentBookDetailsPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { homeworks = [], isLoading: hwLoading } = useHomework();
  const { books = [], bookTests = [], isLoading: booksLoading, updateTrackedBookTest } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();
  const [openSubjects, setOpenSubjects] = useState({});
  const [openTopics, setOpenTopics] = useState({});

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

  const studentId = currentUser?.id;
  const grade = currentUser?.grade;
  const gradeId = currentUser?.gradeId;
  const className = currentUser?.className;

  // Find the book
  const book = useMemo(() => books.find(b => String(b.id) === String(bookId)), [books, bookId]);

  const { data: curData } = useCurriculum();

  // Find all test IDs assigned to this student for this book
  const bookData = useMemo(() => {
    const ids = new Set();
    let targetDueDate = null;

    const bookAssignments = homeworks.filter(hw => {
      if (!hw.isBookAssignment || String(hw.bookId) !== String(bookId)) return false;
      return isHomeworkForStudent(hw, currentUser, curData?.grades);
    });

    let isSelfAdded = false;

    bookAssignments.forEach(hw => {
      if (hw.title && hw.title.includes('(Kendi Eklediğim)')) {
        isSelfAdded = true;
      }
      
      if (hw.title && hw.title.includes('(Tüm Kitap Görevi)')) {
        bookTests.forEach(bt => {
           if (String(bt.bookId) === String(bookId)) {
             ids.add(String(bt.id));
           }
        });
      } else if (hw.tests) {
        hw.tests.forEach(tId => ids.add(String(tId)));
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
  }, [homeworks, bookId, studentId, grade, gradeId, className]);

  const assignedTestIds = bookData.ids;

  // Compute test completion logic and lock statuses
  // Hierarchy: For each Subject -> ordered list of assigned tests.
  const subjectProgress = useMemo(() => {
    if (!book) return [];

    return (book.subjects || []).map(subject => {
      // Find all tests in this subject
      const allSubjectTests = bookTests.filter(t => String(t.subjectId) === String(subject.id));
      
      // Filter only those assigned to the student (sorted naturally by test name and number)
      const assignedSubjTests = allSubjectTests
        .filter(t => assignedTestIds.has(String(t.id)))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr', { numeric: true, sensitivity: 'base' }));
      
      if (assignedSubjTests.length === 0) return null;

      // Check completions
      let hasFoundFirstUnfinished = false;
      
      const testsWithStatus = assignedSubjTests.map((t, index) => {
        // Is it solved?
        const solvedSubs = submissions.filter(s => {
          if (String(s.studentId) !== String(studentId)) return false;
          if (s.status === 'in_progress' || s.status === 'draft') return false;
          
          // Direct match
          if (String(s.testId) === String(t.id) || String(s.testId) === toUUID(t.id)) return true;
          if (String(s.bookTestId) === String(t.id) || String(s.bookTestId) === toUUID(t.id)) return true;
          if (s.bookTestIds && Array.isArray(s.bookTestIds) && s.bookTestIds.some(tid => String(tid) === String(t.id) || String(tid) === toUUID(t.id))) return true;

          // Homework match! If the submission is a homework (starts with hw_ or is its UUID equivalent)
          const relatedHw = homeworks.find(hw => String(hw.id) === String(s.testId) || toUUID(hw.id) === String(s.testId));
          if (relatedHw && relatedHw.tests && relatedHw.tests.some(tId => String(tId) === String(t.id) || String(tId) === toUUID(t.id))) {
            return true;
          }
          return false;
        });
        
        // Check if there is a homework submission for this test (from before UUID fix)
        const hwForTest = homeworks.find(hw => hw.tests && hw.tests.some(tId => String(tId) === String(t.id) || String(tId) === toUUID(t.id)));
        const hwSub = (hwForTest?.submissions || []).find(s => String(s.studentId) === String(studentId));
        
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

        // Is it locked? (Locked if it's NOT completed AND we already found an earlier unfinished test)
        let isLocked = false;
        
        if (!isCompleted) {
           if (hasFoundFirstUnfinished) {
             isLocked = true;
           } else {
             // This is the first unfinished test, so it's unlocked!
             hasFoundFirstUnfinished = true;
           }
        }

        let testDueDate = null;
        const matchingHw = homeworks.find(hw => hw.isBookAssignment && String(hw.bookId) === String(bookId) && hw.testDueDates?.[t.id]);
        if (matchingHw?.testDueDates?.[t.id]) {
          testDueDate = matchingHw.testDueDates[t.id];
        }

        return {
          ...t,
          index: index + 1,
          isCompleted,
          isLocked,
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
    }).filter(Boolean); // Remove subjects that have 0 assigned tests
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
    return <div className="container" style={{ padding: '2rem' }}>İçerik bulunamadı.</div>;
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

  const subjectChartData = useMemo(() => {
    if (selectedChartSubject === 'all') {
      return subjectProgress.map(subj => {
        let subjCorrect = 0;
        let subjWrong = 0;
        let subjBlank = 0;
        
        subj.tests.forEach(test => {
          if (test.isCompleted && test.bestSub) {
             subjCorrect += test.bestSub.correctCount || 0;
             subjWrong += test.bestSub.wrongCount || 0;
             subjBlank += test.bestSub.blankCount || 0;
          }
        });
        
        return {
          name: subj.name,
          Doğru: subjCorrect,
          Yanlış: subjWrong,
          Boş: subjBlank
        };
      });
    } else {
      const subj = subjectProgress.find(s => String(s.id) === selectedChartSubject);
      if (!subj) return [];
      
      return subj.tests.map(test => {
        return {
          name: test.name || `Test ${test.index}`,
          Doğru: (test.isCompleted && test.bestSub) ? (test.bestSub.correctCount || 0) : 0,
          Yanlış: (test.isCompleted && test.bestSub) ? (test.bestSub.wrongCount || 0) : 0,
          Boş: (test.isCompleted && test.bestSub) ? (test.bestSub.blankCount || 0) : 0,
        }
      });
    }
  }, [subjectProgress, selectedChartSubject]);

  return (
    <div style={{ padding: '1.5rem 1rem', maxWidth: 1000, margin: '0 auto', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .sbdp-anim { animation: fadeSlideUp 0.3s ease both; }
        .sbdp-subject-card { transition: box-shadow 0.2s, transform 0.2s; }
        .sbdp-subject-card:hover { box-shadow: 0 8px 32px rgba(99,102,241,0.13) !important; transform: translateY(-2px); }
        .sbdp-test-row { transition: background 0.15s, box-shadow 0.15s; }
        .sbdp-test-row:hover { background: #f1f5f9 !important; }
        .sbdp-btn-solve { transition: box-shadow 0.15s, transform 0.15s; }
        .sbdp-btn-solve:hover { box-shadow: 0 4px 16px rgba(99,102,241,0.35) !important; transform: translateY(-1px); }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={() => navigate(book?.bookType === 'exam' ? '/student/exams' : '/student/books')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '0.65rem', padding: '0.5rem 1rem', fontWeight: 800, fontSize: '0.85rem', color: '#334155', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <ArrowLeft size={16} /> {book?.bookType === 'exam' ? 'Denemelere Dön' : 'Kitaplarıma Dön'}
        </button>
        {bookData.isSelfAdded && (
          <button
            onClick={() => setIsBulkSettingsModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: '0.65rem', padding: '0.5rem 1.1rem', fontWeight: 900, fontSize: '0.85rem', color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
          >
            <Settings size={16} /> Cevap Anahtarı Gir
          </button>
        )}
      </div>

      {overallPct < 100 && bookData.remainingDays !== null && (
        <div className="sbdp-anim" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '2px solid #86efac', borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 4px 12px rgba(22,163,74,0.08)' }}>
          <div style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white', width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(22,163,74,0.3)' }}>
            <Target size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#15803d', marginBottom: 2 }}>Akıllı Tempo Önerisi</div>
            <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
              {bookData.remainingDays === 0
                ? 'Süren doldu! Testleri bir an önce tamamlamalısın.'
                : `Hedefe ${bookData.remainingDays} gün kaldı. Haftada ortalama ${Math.max(1, Math.ceil(((overallTotal - overallCompleted) / bookData.remainingDays) * 7))} test çözmelisin.`}
            </div>
          </div>
        </div>
      )}

      <div className="sbdp-anim" style={{ borderRadius: '1.25rem', overflow: 'hidden', marginBottom: '1.75rem', boxShadow: '0 12px 40px rgba(79,70,229,0.15)' }}>
        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #0891b2 100%)', padding: '2rem 2rem 1.25rem', position: 'relative', overflow: 'hidden' }}>
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
              <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: 'white', margin: '0 0 0.75rem', lineHeight: 1.25, textShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
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

              <div style={{ maxWidth: 420 }}>
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

        <div style={{ background: 'white', display: 'flex', flexWrap: 'wrap', gap: 0, borderTop: '3px solid #4f46e5' }}>
          {[
            { label: 'Test', value: `${overallCompleted}/${overallTotal}`, color: '#4f46e5', bg: '#eef2ff', icon: '📋' },
            { label: 'Doğru', value: overallCorrect, color: '#059669', bg: '#f0fdf4', icon: '✅' },
            { label: 'Yanlış', value: overallWrong, color: '#dc2626', bg: '#fff1f2', icon: '❌' },
            { label: 'Boş', value: overallBlank, color: '#94a3b8', bg: '#f8fafc', icon: '⬜' },
            { label: 'Başarı', value: `%${overallSuccessRate}`, color: '#7c3aed', bg: '#faf5ff', icon: '🎯' },
          ].map((s, i) => (
            <div key={i} style={{ flex: '1 1 80px', padding: '0.9rem 0.5rem', textAlign: 'center', borderRight: i < 4 ? '1px solid #f1f5f9' : 'none', background: s.bg }}>
              <div style={{ fontSize: '1rem', marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {subjectChartData.length > 0 && (
        <div className="sbdp-anim" style={{ background: 'white', borderRadius: '1.1rem', border: '1.5px solid #e2e8f0', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart2 size={18} color="#6366f1" /> {selectedChartSubject === 'all' ? 'Derslere Göre Başarı Dağılımı' : 'Testlere Göre Başarı'}
            </h3>
            <select
              value={selectedChartSubject}
              onChange={e => setSelectedChartSubject(e.target.value)}
              style={{ padding: '0.4rem 0.85rem', borderRadius: '0.6rem', border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontWeight: 700, color: '#475569', background: 'white', cursor: 'pointer', outline: 'none' }}
            >
              <option value="all">Tüm Dersler</option>
              {subjectProgress.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} dy={10} tickFormatter={v => v.length > 14 ? v.substring(0, 14) + '…' : v} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: '0.83rem' }} />
                <Legend wrapperStyle={{ paddingTop: '1rem', fontSize: '0.82rem', fontWeight: 700 }} />
                <Bar dataKey="Doğru" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Yanlış" stackId="a" fill="#ef4444" />
                <Bar dataKey="Boş" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
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
              <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>📚 Ders Listesi</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '99px' }}>{subjectProgress.length} Ders</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={expandAllSubjects} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}>Tümünü Aç</button>
              <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>|</span>
              <button onClick={collapseAllSubjects} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}>Kapat</button>
            </div>
          </div>
        )}

        {subjectProgress.map((subj, subjIdx) => {
          const isOpen = !!openSubjects[subj.id];
          const subjectColors = [
            { from: '#4f46e5', to: '#7c3aed', light: '#eef2ff', accent: '#4f46e5' },
            { from: '#0891b2', to: '#0e7490', light: '#ecfeff', accent: '#0891b2' },
            { from: '#059669', to: '#047857', light: '#ecfdf5', accent: '#059669' },
            { from: '#d97706', to: '#b45309', light: '#fffbeb', accent: '#d97706' },
            { from: '#7c3aed', to: '#6d28d9', light: '#f5f3ff', accent: '#7c3aed' },
            { from: '#e11d48', to: '#be123c', light: '#fff1f2', accent: '#e11d48' },
            { from: '#2563eb', to: '#1d4ed8', light: '#eff6ff', accent: '#2563eb' },
          ];
          const sc = subjectColors[subjIdx % subjectColors.length];

          return (
            <div key={subj.id} className="sbdp-subject-card" style={{ borderRadius: '1.1rem', overflow: 'hidden', border: `1.5px solid ${isOpen ? sc.accent + '44' : '#e2e8f0'}`, boxShadow: isOpen ? `0 4px 20px ${sc.accent}18` : '0 2px 8px rgba(0,0,0,0.03)', background: 'white' }}>
              <div
                onClick={() => toggleSubject(subj.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', cursor: 'pointer', userSelect: 'none', background: isOpen ? `linear-gradient(135deg, ${sc.from}, ${sc.to})` : 'white', transition: 'background 0.25s', flexWrap: 'wrap', gap: '0.75rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '0.6rem', background: isOpen ? 'rgba(255,255,255,0.2)' : sc.light, color: isOpen ? 'white' : sc.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: isOpen ? '1.5px solid rgba(255,255,255,0.3)' : `1.5px solid ${sc.accent}33` }}>
                    <Layers size={18} />
                  </div>
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: isOpen ? 'white' : '#0f172a' }}>{subj.name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isOpen ? 'rgba(255,255,255,0.18)' : sc.light, padding: '0.3rem 0.75rem', borderRadius: '99px', border: isOpen ? '1px solid rgba(255,255,255,0.3)' : `1px solid ${sc.accent}22` }}>
                    <div style={{ width: 60, height: 5, background: isOpen ? 'rgba(255,255,255,0.3)' : '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${subj.pct}%`, height: '100%', background: isOpen ? 'white' : `linear-gradient(90deg, ${sc.from}, ${sc.to})`, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isOpen ? 'white' : sc.accent, whiteSpace: 'nowrap' }}>{subj.completedCount}/{subj.totalCount}</span>
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: isOpen ? 'rgba(255,255,255,0.2)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isOpen ? 'white' : '#64748b', flexShrink: 0 }}>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '0.85rem', background: '#fafbff', borderTop: `2px solid ${sc.accent}22`, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  
                  {/* Direct Tests */}
                  {subj.directTests && subj.directTests.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {subj.topics && subj.topics.length > 0 && (
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
                          <FileText size={14} color={sc.accent} /> Direkt Testler
                        </div>
                      )}
                      {subj.directTests.map(test => {
                        let stateBg = '#f8fafc', stateBorder = '#e2e8f0', stateAccent = '#94a3b8';
                        if (test.isCompleted) { stateBg = '#f0fdf4'; stateBorder = '#bbf7d0'; stateAccent = '#10b981'; }
                        else if (!test.isLocked) { stateBg = '#fafafe'; stateBorder = sc.accent + '33'; stateAccent = sc.accent; }

                        return (
                          <div key={test.id} className="sbdp-test-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: stateBg, border: `1px solid ${stateBorder}`, borderLeft: `4px solid ${stateAccent}`, borderRadius: '0.8rem', padding: '0.8rem 1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: test.isCompleted ? 'linear-gradient(135deg,#10b981,#059669)' : test.isLocked ? '#e2e8f0' : `linear-gradient(135deg,${sc.from},${sc.to})`, color: test.isLocked ? '#94a3b8' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0, boxShadow: test.isLocked ? 'none' : '0 2px 8px rgba(0,0,0,0.18)' }}>
                              {test.isCompleted ? <CheckCircle2 size={16} /> : test.index}
                            </div>

                            <div style={{ flex: 1, minWidth: 140 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: test.isLocked ? '#94a3b8' : '#0f172a' }}>
                                {test.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span>{test.questionCount || 20} Soru</span>
                                {test.testDueDate && (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    background: test.isCompleted ? '#f0fdf4' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#fef2f2' : '#eef2ff'),
                                    color: test.isCompleted ? '#059669' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#ef4444' : '#4f46e5'),
                                    border: `1px solid ${test.isCompleted ? '#bbf7d0' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#fca5a5' : '#c7d2fe')}`
                                  }}>
                                    📅 Hedef: {new Date(test.testDueDate).toLocaleDateString('tr-TR')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {test.isCompleted && test.bestScore !== null && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#059669', background: '#dcfce7', padding: '3px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Award size={12} /> %{test.bestScore}
                                </span>
                                {test.bestSub && (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '99px' }}>
                                    <span style={{ color: '#10b981' }}>{test.bestSub.correctCount || 0}D</span>{' '}
                                    <span style={{ color: '#ef4444' }}>{test.bestSub.wrongCount || 0}Y</span>{' '}
                                    <span>{test.bestSub.blankCount || 0}B</span>
                                  </span>
                                )}
                              </div>
                            )}

                            <div style={{ flexShrink: 0 }}>
                              {test.isCompleted ? (
                                <button
                                  className="sbdp-btn-solve"
                                  style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 800, borderRadius: '0.6rem', border: '1.5px solid #10b981', color: '#059669', background: 'white', cursor: 'pointer' }}
                                  onClick={() => navigate(`/review/${test.latestSubId}`, { state: { from: `/student/books/${book.id}` } })}
                                >
                                  Sonucu İncele
                                </button>
                              ) : test.isLocked ? (
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Lock size={14} /> Kilitli
                                </span>
                              ) : (
                                <button
                                  className="sbdp-btn-solve"
                                  style={{ padding: '0.4rem 1.2rem', fontSize: '0.82rem', fontWeight: 900, borderRadius: '0.6rem', border: 'none', color: 'white', background: `linear-gradient(135deg,${sc.from},${sc.to})`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 4px 12px ${sc.accent}44` }}
                                  onClick={() => navigate(`/book-quiz/${test.id}`)}
                                >
                                  <PlayCircle size={14} /> Şimdi Çöz
                                </button>
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
                        <div key={topic.id} style={{ borderRadius: '0.85rem', border: '1px solid #e2e8f0', overflow: 'hidden', background: 'white' }}>
                          <div
                            onClick={() => toggleTopic(topic.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', cursor: 'pointer', background: isTopicOpen ? sc.light : '#f8fafc', borderBottom: isTopicOpen ? '1px solid #e2e8f0' : 'none', flexWrap: 'wrap', gap: '0.5rem' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <FileText size={16} color={sc.accent} />
                              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>{topic.name}</span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: sc.accent, background: 'white', padding: '2px 8px', borderRadius: 99, border: `1px solid ${sc.accent}33` }}>
                                {topic.completedCount}/{topic.totalCount} Test
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                              {isTopicOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>
                          </div>

                          {isTopicOpen && (
                            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', background: '#fafbff' }}>
                              {topic.tests.map(test => {
                                let stateBg = '#f8fafc', stateBorder = '#e2e8f0', stateAccent = '#94a3b8';
                                if (test.isCompleted) { stateBg = '#f0fdf4'; stateBorder = '#bbf7d0'; stateAccent = '#10b981'; }
                                else if (!test.isLocked) { stateBg = '#fafafe'; stateBorder = sc.accent + '33'; stateAccent = sc.accent; }

                                return (
                                  <div key={test.id} className="sbdp-test-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: stateBg, border: `1px solid ${stateBorder}`, borderLeft: `4px solid ${stateAccent}`, borderRadius: '0.8rem', padding: '0.8rem 1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: test.isCompleted ? 'linear-gradient(135deg,#10b981,#059669)' : test.isLocked ? '#e2e8f0' : `linear-gradient(135deg,${sc.from},${sc.to})`, color: test.isLocked ? '#94a3b8' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0, boxShadow: test.isLocked ? 'none' : '0 2px 8px rgba(0,0,0,0.18)' }}>
                                      {test.isCompleted ? <CheckCircle2 size={16} /> : test.index}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 140 }}>
                                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: test.isLocked ? '#94a3b8' : '#0f172a' }}>
                                        {test.name}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span>{test.questionCount || 20} Soru</span>
                                        {test.testDueDate && (
                                          <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 800,
                                            padding: '2px 7px',
                                            borderRadius: '6px',
                                            background: test.isCompleted ? '#f0fdf4' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#fef2f2' : '#eef2ff'),
                                            color: test.isCompleted ? '#059669' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#ef4444' : '#4f46e5'),
                                            border: `1px solid ${test.isCompleted ? '#bbf7d0' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#fca5a5' : '#c7d2fe')}`
                                          }}>
                                            📅 Hedef: {new Date(test.testDueDate).toLocaleDateString('tr-TR')}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {test.isCompleted && test.bestScore !== null && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#059669', background: '#dcfce7', padding: '3px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <Award size={12} /> %{test.bestScore}
                                        </span>
                                        {test.bestSub && (
                                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '99px' }}>
                                            <span style={{ color: '#10b981' }}>{test.bestSub.correctCount || 0}D</span>{' '}
                                            <span style={{ color: '#ef4444' }}>{test.bestSub.wrongCount || 0}Y</span>{' '}
                                            <span>{test.bestSub.blankCount || 0}B</span>
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    <div style={{ flexShrink: 0 }}>
                                      {test.isCompleted ? (
                                        <button
                                          className="sbdp-btn-solve"
                                          style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 800, borderRadius: '0.6rem', border: '1.5px solid #10b981', color: '#059669', background: 'white', cursor: 'pointer' }}
                                          onClick={() => navigate(`/review/${test.latestSubId}`, { state: { from: `/student/books/${book.id}` } })}
                                        >
                                          Sonucu İncele
                                        </button>
                                      ) : test.isLocked ? (
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <Lock size={14} /> Kilitli
                                        </span>
                                      ) : (
                                        <button
                                          className="sbdp-btn-solve"
                                          style={{ padding: '0.4rem 1.2rem', fontSize: '0.82rem', fontWeight: 900, borderRadius: '0.6rem', border: 'none', color: 'white', background: `linear-gradient(135deg,${sc.from},${sc.to})`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 4px 12px ${sc.accent}44` }}
                                          onClick={() => navigate(`/book-quiz/${test.id}`)}
                                        >
                                          <PlayCircle size={14} /> Şimdi Çöz
                                        </button>
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
                      let stateBg = '#f8fafc', stateBorder = '#e2e8f0', stateAccent = '#94a3b8';
                      if (test.isCompleted) { stateBg = '#f0fdf4'; stateBorder = '#bbf7d0'; stateAccent = '#10b981'; }
                      else if (!test.isLocked) { stateBg = '#fafafe'; stateBorder = sc.accent + '33'; stateAccent = sc.accent; }

                      return (
                        <div key={test.id} className="sbdp-test-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: stateBg, border: `1px solid ${stateBorder}`, borderLeft: `4px solid ${stateAccent}`, borderRadius: '0.8rem', padding: '0.8rem 1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: test.isCompleted ? 'linear-gradient(135deg,#10b981,#059669)' : test.isLocked ? '#e2e8f0' : `linear-gradient(135deg,${sc.from},${sc.to})`, color: test.isLocked ? '#94a3b8' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0, boxShadow: test.isLocked ? 'none' : '0 2px 8px rgba(0,0,0,0.18)' }}>
                            {test.isCompleted ? <CheckCircle2 size={16} /> : test.index}
                          </div>

                          <div style={{ flex: 1, minWidth: 140 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: test.isLocked ? '#94a3b8' : '#0f172a' }}>
                              {test.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>{test.questionCount || 20} Soru</span>
                              {test.testDueDate && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: test.isCompleted ? '#f0fdf4' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#fef2f2' : '#eef2ff'),
                                  color: test.isCompleted ? '#059669' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#ef4444' : '#4f46e5'),
                                  border: `1px solid ${test.isCompleted ? '#bbf7d0' : (new Date(test.testDueDate) < new Date().setHours(0,0,0,0) ? '#fca5a5' : '#c7d2fe')}`
                                }}>
                                  📅 Hedef: {new Date(test.testDueDate).toLocaleDateString('tr-TR')}
                                </span>
                              )}
                            </div>
                          </div>

                          {test.isCompleted && test.bestScore !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#059669', background: '#dcfce7', padding: '3px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Award size={12} /> %{test.bestScore}
                              </span>
                              {test.bestSub && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '99px' }}>
                                  <span style={{ color: '#10b981' }}>{test.bestSub.correctCount || 0}D</span>{' '}
                                  <span style={{ color: '#ef4444' }}>{test.bestSub.wrongCount || 0}Y</span>{' '}
                                  <span>{test.bestSub.blankCount || 0}B</span>
                                </span>
                              )}
                            </div>
                          )}

                          <div style={{ flexShrink: 0 }}>
                            {test.isCompleted ? (
                              <button
                                className="sbdp-btn-solve"
                                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 800, borderRadius: '0.6rem', border: '1.5px solid #10b981', color: '#059669', background: 'white', cursor: 'pointer' }}
                                onClick={() => navigate(`/review/${test.latestSubId}`, { state: { from: `/student/books/${book.id}` } })}
                              >
                                Sonucu İncele
                              </button>
                            ) : test.isLocked ? (
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Lock size={14} /> Kilitli
                              </span>
                            ) : (
                              <button
                                className="sbdp-btn-solve"
                                style={{ padding: '0.4rem 1.2rem', fontSize: '0.82rem', fontWeight: 900, borderRadius: '0.6rem', border: 'none', color: 'white', background: `linear-gradient(135deg,${sc.from},${sc.to})`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 4px 12px ${sc.accent}44` }}
                                onClick={() => navigate(`/book-quiz/${test.id}`)}
                              >
                                <PlayCircle size={14} /> Şimdi Çöz
                              </button>
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
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '1.1rem', border: '1.5px dashed #e2e8f0', color: '#94a3b8' }}>
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
    </div>
  );
}
