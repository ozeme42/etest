import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { toUUID } from '../services/supabaseService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import ResizablePdfPanel from '../components/ResizablePdfPanel';
import DrawingCanvas from '../components/quiz/common/DrawingCanvas';
import { 
  ArrowLeft, CheckCircle2, Clock, FileSpreadsheet, X as XIcon, 
  PanelLeft, PanelTop, Maximize2, Eye, EyeOff, Pencil, ChevronRight, 
  BookOpen, AlertCircle, Trophy, Sparkles, HelpCircle, Check, PlayCircle,
  Flag, RotateCcw, Cloud
} from 'lucide-react';

function getQuestionColumns(totalCount, isMobile = false) {
  if (totalCount <= 0) return [[]];
  if (isMobile || totalCount <= 6) {
    return [Array.from({ length: totalCount }, (_, i) => i + 1)];
  }

  let numCols = 2;
  if (totalCount <= 6) numCols = 1;
  else if (totalCount <= 24) numCols = 2;
  else if (totalCount <= 36) numCols = 3;
  else numCols = 4;

  const perCol = Math.ceil(totalCount / numCols);
  const cols = [];
  for (let i = 0; i < totalCount; i += perCol) {
    const col = [];
    for (let j = i; j < Math.min(i + perCol, totalCount); j++) {
      col.push(j + 1);
    }
    cols.push(col);
  }
  return cols;
}

export default function TrackedBookQuizRunner() {
  const { testId: routeParamId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { books, bookTests, loading: booksLoading } = useTrackedBooks();
  const { homeworks, submitHomework, loading: hwLoading } = useHomework();
  const { submissions, addSubmission } = useEvaluation();
  const { users } = useUser();
  const { currentUser } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const paramStudentId = searchParams.get('studentId');
  const isRetake = searchParams.get('retake') === 'true';
  const studentId = paramStudentId || currentUser?.id;
  const currentViewingStudent = users.find(u => u.id === studentId);
  const isTeacherReviewing = currentUser?.role !== 'student' && paramStudentId && paramStudentId !== currentUser?.id;

  const cleanId = String(routeParamId || '');

  // ── Robust Resolution of Test, Book, and Homework ──
  const { resolvedTest, resolvedBook, resolvedHw } = useMemo(() => {
    let t = null;
    let b = null;
    let h = null;

    if (!cleanId) return { resolvedTest: null, resolvedBook: null, resolvedHw: null };

    // 1. Composite ID (e.g. bt_hw_123_tbt_456 or bt_123_456)
    if (cleanId.startsWith('bt_')) {
      const parts = cleanId.split('_');
      // Candidate test ID is usually at the end
      const candidateTestId = parts.slice(2).join('_') || parts[parts.length - 1];
      t = (bookTests || []).find(test => 
        String(test.id) === candidateTestId || 
        toUUID(test.id) === candidateTestId ||
        cleanId.endsWith(String(test.id)) ||
        cleanId.endsWith(toUUID(test.id))
      );
      // Matching homework
      h = (homeworks || []).find(hw => cleanId.includes(String(hw.id)) || cleanId.includes(toUUID(hw.id)));
    }

    // 2. Direct match in bookTests
    if (!t) {
      t = (bookTests || []).find(test => 
        String(test.id) === cleanId || 
        toUUID(test.id) === cleanId ||
        String(test.id).replace(/-/g, '') === cleanId.replace(/-/g, '')
      );
    }

    // 3. Match from homeworks list
    if (!t) {
      const hwMatch = (homeworks || []).find(hw => String(hw.id) === cleanId || toUUID(hw.id) === cleanId);
      if (hwMatch) {
        h = hwMatch;
        if (hwMatch.tests && hwMatch.tests.length > 0) {
          const firstId = hwMatch.tests[0];
          t = (bookTests || []).find(test => String(test.id) === String(firstId) || toUUID(test.id) === String(firstId));
        }
      }
    }

    // 4. Match from books list (first test of the book)
    if (!t) {
      const bookMatch = (books || []).find(book => String(book.id) === cleanId || toUUID(book.id) === cleanId);
      if (bookMatch) {
        b = bookMatch;
        const testsForBook = (bookTests || []).filter(test => String(test.bookId) === String(bookMatch.id) || toUUID(test.bookId) === toUUID(bookMatch.id));
        if (testsForBook.length > 0) {
          t = testsForBook[0];
        }
      }
    }

    // Resolve book if not resolved yet (thorough match by ID, UUID, normalized ID, or subjects)
    if (t && !b) {
      const cleanTBookId = String(t.bookId || '');
      b = (books || []).find(book => {
        const cleanBId = String(book.id || '');
        return cleanBId === cleanTBookId ||
          toUUID(cleanBId) === cleanTBookId ||
          cleanBId === toUUID(cleanTBookId) ||
          toUUID(cleanBId) === toUUID(cleanTBookId) ||
          cleanBId.replace(/[^a-zA-Z0-9]/g, '') === cleanTBookId.replace(/[^a-zA-Z0-9]/g, '');
      });

      if (!b && books && books.length > 0) {
        b = books.find(book => {
          const sIds = (book.subjects || []).map(s => String(s.id));
          return sIds.includes(String(t.subjectId));
        }) || books.find(book => (bookTests || []).some(bt => String(bt.bookId) === String(book.id) && String(bt.id) === String(t.id))) || books[0];
      }
    }

    // Resolve homework if not resolved yet
    if (t && !h) {
      h = (homeworks || []).find(hw => 
        (hw.tests && hw.tests.some(tid => String(tid) === String(t.id) || toUUID(tid) === toUUID(t.id))) ||
        (hw.bookId && String(hw.bookId) === String(t.bookId)) ||
        (b && hw.bookId && (String(hw.bookId) === String(b.id) || toUUID(hw.bookId) === toUUID(b.id)))
      );
    }

    return { resolvedTest: t, resolvedBook: b, resolvedHw: h };
  }, [cleanId, bookTests, books, homeworks]);

  // If this is actually a full physical exam (bookType === 'exam'), redirect safely to /physical-exam/:id
  useEffect(() => {
    if (resolvedBook?.bookType === 'exam' || resolvedHw?.type === 'physicalExam') {
      const targetId = resolvedHw?.id || resolvedBook?.id || cleanId;
      navigate(`/physical-exam/${targetId}?studentId=${studentId || ''}`, { replace: true });
    }
  }, [resolvedBook, resolvedHw, cleanId, studentId, navigate]);

  const pdfUrl = resolvedTest?.pdfUrl || resolvedBook?.pdfUrl || resolvedHw?.pdfUrl || '';
  const hasPdf = Boolean(pdfUrl);

  // Layout and mode states
  const [pdfMode, setPdfMode] = useState(() => hasPdf ? (isMobile ? 'top' : 'side') : 'hidden');
  const effectivePdfMode = (isMobile && pdfMode === 'side') ? 'top' : pdfMode;
  const [showOptikForm, setShowOptikForm] = useState(true);
  const [showMobileOpticModal, setShowMobileOpticModal] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const testKey = resolvedTest ? (resolvedTest.id || cleanId) : cleanId;
  const draftKey = `draft_tracked_book_test_${testKey}_${studentId}`;

  // Student answers state: { 1: "A", 2: "B", 3: "" } or { 1: "Open ended text" }
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(`draft_tracked_book_test_${testKey}_${studentId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  });

  // Flagged questions for review (🚩)
  const [flagged, setFlagged] = useState(() => {
    try {
      const saved = localStorage.getItem(`draft_tracked_book_flagged_${testKey}_${studentId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  });

  const toggleFlag = useCallback((qNo) => {
    setFlagged(prev => {
      const next = { ...prev, [qNo]: !prev[qNo] };
      try {
        localStorage.setItem(`draft_tracked_book_flagged_${testKey}_${studentId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [testKey, studentId]);

  const flaggedCount = useMemo(() => {
    return Object.values(flagged).filter(Boolean).length;
  }, [flagged]);

  const [mistakeReasons, setMistakeReasons] = useState(() => {
    try {
      const saved = localStorage.getItem(`mistake_reasons_${resolvedTest?.id || testKey}_${studentId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  });

  const handleSetMistakeReason = (qNo, reason) => {
    setMistakeReasons(prev => {
      const next = { ...prev, [qNo]: prev[qNo] === reason ? null : reason };
      try {
        localStorage.setItem(`mistake_reasons_${resolvedTest?.id || testKey}_${studentId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState(null);

  const questionCount = Number(resolvedTest?.questionCount) || Number(resolvedTest?.question_count) || 20;
  const isOpenEnded = resolvedBook?.bookType === 'open_ended' || resolvedTest?.questionType === 'acik_uclu';

  const questionColumns = useMemo(() => {
    return getQuestionColumns(questionCount, isMobile);
  }, [questionCount, isMobile]);

  // Timer calculation
  const perQuestionMins = Number(resolvedTest?.timePerQuestion || resolvedBook?.timePerQuestion) || 2;
  const totalSeconds = (questionCount * perQuestionMins * 60) || 1800;

  const [timeLeft, setTimeLeft] = useState(() => {
    try {
      const saved = localStorage.getItem(`${draftKey}_time`);
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0 && val <= totalSeconds) return val;
      }
    } catch {}
    return totalSeconds;
  });

  // Calculate results based on answer key
  const calculateTestResults = useCallback((answersToCalc) => {
    if (!resolvedTest) return null;
    const targetAnswers = answersToCalc || answers;
    const answerKey = resolvedTest.answerKey || resolvedBook?.answerKey || {};
    const penaltyRatio = resolvedBook?.penaltyRatio !== undefined ? resolvedBook.penaltyRatio : 3;

    let correct = 0;
    let wrong = 0;
    let blank = 0;
    const detailed = [];

    for (let i = 1; i <= questionCount; i++) {
      const userAns = targetAnswers[i] || targetAnswers[String(i)] || '';
      // Support both array key or object key (0-indexed or 1-indexed)
      const correctKey = Array.isArray(answerKey) 
        ? (answerKey[i - 1] || '') 
        : (answerKey[i] || answerKey[String(i)] || answerKey[i - 1] || '');

      let isCorrect = false;
      let isWrong = false;

      if (!userAns) {
        blank++;
      } else if (correctKey && String(userAns).trim().toUpperCase() === String(correctKey).trim().toUpperCase()) {
        correct++;
        isCorrect = true;
      } else if (correctKey) {
        wrong++;
        isWrong = true;
      } else {
        // If no answer key defined, count marked as correct
        correct++;
        isCorrect = true;
      }

      detailed.push({
        questionNo: i,
        userAnswer: userAns,
        correctAnswer: correctKey,
        isCorrect,
        isWrong,
        isBlank: !userAns
      });
    }

    const rawNet = correct - (penaltyRatio > 0 ? wrong / penaltyRatio : 0);
    const net = Math.max(0, Number(rawNet.toFixed(2)));
    const scorePct = questionCount > 0 ? Math.round((correct / questionCount) * 100) : 0;

    return {
      correct,
      wrong,
      blank,
      net,
      scorePct,
      detailed,
      totalQuestions: questionCount
    };
  }, [resolvedTest, resolvedBook, questionCount, answers]);

  const initializedRef = useRef(false);

  // Load existing submission if already solved
  useEffect(() => {
    if (!resolvedTest || initializedRef.current) return;

    if (isRetake) {
      localStorage.removeItem(draftKey);
      localStorage.removeItem(`${draftKey}_time`);
      setAnswers({});
      setIsSubmitted(false);
      setResults(null);
      initializedRef.current = true;
      return;
    }

    const testIdStr = String(resolvedTest.id);
    const testUuidStr = String(toUUID(resolvedTest.id) || '');
    const studentIdStr = String(studentId || currentUser?.id || '');
    const studentUuidStr = String(toUUID(studentIdStr) || '');

    const existingSub = (submissions || []).find(s => {
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

      return matchFields.some(f => f && (f === testIdStr || (testUuidStr && f === testUuidStr) || toUUID(f) === testIdStr || (testUuidStr && toUUID(f) === testUuidStr)));
    });

    if (existingSub) {
      setIsSubmitted(true);
      setShowOptikForm(true);

      let loadedAnswers = existingSub.studentAnswers || {};
      if (Array.isArray(existingSub.answers) && existingSub.answers.length > 0 && Object.keys(loadedAnswers).length === 0) {
        existingSub.answers.forEach((a, idx) => {
          const qNo = a.questionNo || (idx + 1);
          loadedAnswers[qNo] = a.userAnswer || a.answer || '';
        });
      }

      if (Object.keys(loadedAnswers).length === 0) {
        try {
          const draftStr = localStorage.getItem(draftKey);
          if (draftStr) {
            const parsed = JSON.parse(draftStr);
            if (parsed && typeof parsed === 'object') loadedAnswers = parsed;
          }
        } catch {}
      }

      if (Object.keys(loadedAnswers).length > 0) {
        setAnswers(loadedAnswers);
      }

      const calculated = calculateTestResults(loadedAnswers || answers);
      setResults(calculated);
      initializedRef.current = true;
    } else {
      initializedRef.current = true;
    }
  }, [resolvedTest, resolvedHw, studentId, isRetake, draftKey, submissions, calculateTestResults]);

  // Timer interval
  useEffect(() => {
    if (isSubmitted || timeLeft <= 0 || isTeacherReviewing) return;
    try {
      localStorage.setItem(`${draftKey}_time`, String(timeLeft));
    } catch {}

    const intervalId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalId);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft, isSubmitted, isTeacherReviewing, draftKey]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const p = n => String(n).padStart(2, '0');
    return `${p(m)}:${p(s)}`;
  };

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter(Boolean).length;
  }, [answers]);

  const progressPct = questionCount > 0 ? Math.round((answeredCount / questionCount) * 100) : 0;

  // Single option toggle
  const handleSelectOption = (qNum, option) => {
    if (isSubmitted || isTeacherReviewing) return;
    setAnswers(prev => {
      const current = prev[qNum] || prev[String(qNum)] || '';
      const updated = {
        ...prev,
        [qNum]: current === option ? '' : option,
        [String(qNum)]: current === option ? '' : option
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save draft to localStorage", e);
      }
      return updated;
    });
  };

  const handleClearOption = (qNum) => {
    if (isSubmitted || isTeacherReviewing) return;
    setAnswers(prev => {
      const updated = { ...prev, [qNum]: '', [String(qNum)]: '' };
      try {
        localStorage.setItem(draftKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleOpenEndedChange = (qNum, text) => {
    if (isSubmitted || isTeacherReviewing) return;
    setAnswers(prev => {
      const updated = { ...prev, [qNum]: text, [String(qNum)]: text };
      try {
        localStorage.setItem(draftKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const isSubmittingRef = useRef(false);

  const handleSubmit = async (force = false) => {
    if (isSubmittingRef.current || isTeacherReviewing) return;
    if (!force && !showFinishModal) {
      setShowFinishModal(true);
      return;
    }

    isSubmittingRef.current = true;
    setShowFinishModal(false);

    const calculated = calculateTestResults(answers);
    const answersList = calculated.detailed.map(d => ({
      questionNo: d.questionNo,
      userAnswer: d.userAnswer,
      correctAnswer: d.correctAnswer,
      isCorrect: d.isCorrect
    }));

    // 1. Save to EvaluationContext
    try {
      await addSubmission({
        testId: resolvedTest.id,
        bookTestId: resolvedTest.id,
        bookId: resolvedBook?.id,
        hwId: resolvedHw?.id || null,
        testTitle: `${resolvedBook?.title || 'Kitap'} — ${resolvedTest.name}`,
        studentId: studentId,
        score: calculated.net,
        scorePercentage: calculated.scorePct,
        status: 'completed',
        correctCount: calculated.correct,
        wrongCount: calculated.wrong,
        blankCount: calculated.blank,
        totalQuestions: calculated.totalQuestions,
        answers: answersList,
        studentAnswers: answers,
        sourceType: 'trackedBook'
      });
    } catch (e) {
      console.error("Evaluation submission error", e);
    }

    // 2. Save to HomeworkContext if this test was assigned as homework
    if (resolvedHw) {
      try {
        await submitHomework(resolvedHw.id, studentId, calculated.net, calculated.totalQuestions, {
          testId: resolvedTest.id,
          studentAnswers: answers,
          correctCount: calculated.correct,
          wrongCount: calculated.wrong,
          blankCount: calculated.blank
        });
      } catch (e) {
        console.error("Homework submission error", e);
      }
    }

    // 3. Clear draft
    try {
      localStorage.removeItem(draftKey);
      localStorage.removeItem(`${draftKey}_time`);
    } catch {}

    setResults(calculated);
    setIsSubmitted(true);
    setShowOptikForm(true);
  };

  const handleRetakeWrong = () => {
    if (!window.confirm("Yanlış ve boş soruları tekrar çözmek için test modu açılacak. Doğru yaptıklarınız korunacak. Devam edilsin mi?")) return;
    const answerKey = resolvedTest?.answerKey || resolvedBook?.answerKey || {};
    const newAnswers = {};
    for (let i = 1; i <= questionCount; i++) {
      const selected = answers[i] || answers[String(i)];
      const idx = i - 1;
      const correctKey = Array.isArray(answerKey) ? answerKey[idx] : (answerKey[i] || answerKey[String(i)]);
      if (selected && String(selected).toUpperCase() === String(correctKey).toUpperCase()) {
        newAnswers[i] = selected;
      }
    }
    setAnswers(newAnswers);
    setIsSubmitted(false);
    setResults(null);
    try {
      localStorage.setItem(draftKey, JSON.stringify(newAnswers));
      localStorage.setItem(`${draftKey}_time`, String(totalSeconds));
      setTimeLeft(totalSeconds);
    } catch {}
  };

  // Find other tests in this book to offer "Sonraki Test" navigation
  const otherTestsInBook = useMemo(() => {
    if (!resolvedBook || !bookTests) return [];
    return (bookTests || []).filter(t => String(t.bookId) === String(resolvedBook.id));
  }, [resolvedBook, bookTests]);

  const currentTestIndex = otherTestsInBook.findIndex(t => String(t.id) === String(resolvedTest?.id));
  const nextTest = currentTestIndex >= 0 && currentTestIndex < otherTestsInBook.length - 1 ? otherTestsInBook[currentTestIndex + 1] : null;

  // Loading Screen
  if (booksLoading || hwLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>
        Kitap Testi Yükleniyor...
      </div>
    );
  }

  // Not Found Screen
  if (!resolvedTest) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#f8fafc', gap: '1.25rem', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(239, 68, 68, 0.15)', border: '2px solid #ef4444', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Kitap Testi Bulunamadı</h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', maxWidth: 420, lineHeight: 1.5 }}>
          Bu teste ait kayıt bulunamadı veya henüz yükleniyor olabilir. Lütfen kitap listenizi kontrol ediniz.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button onClick={() => navigate('/student/books')} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '0.85rem' }}>
            Kitaplarıma Dön
          </button>
          <button onClick={() => navigate('/student')} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: '#334155', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '0.85rem' }}>
            Öğrenci Paneli
          </button>
        </div>
      </div>
    );
  }

  const subjectName = (resolvedBook?.subjects || []).find(s => String(s.id) === String(resolvedTest.subjectId))?.name || resolvedBook?.title || 'Kitap Testi';
  
  const explicitOptionCount = Number(
    resolvedBook?.optionCount ||
    resolvedTest?.optionCount ||
    resolvedHw?.optionCount
  );

  const answerKeyHasE = Boolean(
    resolvedTest?.answerKey && (
      Array.isArray(resolvedTest.answerKey) 
        ? resolvedTest.answerKey.some(v => String(v || '').trim().toUpperCase() === 'E')
        : Object.values(resolvedTest.answerKey).some(v => String(v || '').trim().toUpperCase() === 'E')
    )
  );

  // If explicit 4, or if not explicit 5 and no E in answer key, default to 4 options
  const isFourOptions = explicitOptionCount === 4 || (
    explicitOptionCount !== 5 && !answerKeyHasE
  );
  const optionsList = isFourOptions ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f172a', color: '#f8fafc' }}>
      
      {/* ── HEADER ── */}
      <header style={{ 
        padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.25rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: '#1e293b', 
        borderBottom: '1px solid #334155',
        position: 'sticky', 
        top: 0, 
        zIndex: 10,
        flexShrink: 0,
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        {/* Left: Back + Book & Test Title */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              onClick={() => {
                if (resolvedBook) navigate(`/student/books/${resolvedBook.id}`);
                else if (window.history.length > 1) navigate(-1);
                else navigate('/student/books');
              }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Kitaba Dön"
            >
              <ArrowLeft size={isMobile ? 18 : 22} />
            </button>
            <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#0891b2', color: 'white', padding: '0.12rem 0.45rem', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              KİTAP TESTİ
            </span>
            <h2 style={{ 
              color: '#f8fafc', 
              fontSize: isMobile ? '0.9rem' : '1.05rem', 
              fontWeight: 800, 
              margin: 0, 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              {resolvedBook?.title ? `${resolvedBook.title} — ` : ''}{resolvedTest.name}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ color: '#94a3b8', fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 700 }}>
              {subjectName} • {questionCount} Soru
            </span>
            {!isSubmitted && (
              <span style={{ color: '#34d399', fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800 }}>
                • Kodlanan: {answeredCount}/{questionCount} (%{progressPct})
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          
          {/* Large Stylish Countdown Timer in Navbar */}
          {!isSubmitted && !isTeacherReviewing && (
            <div style={{
              padding: isMobile ? '0.4rem 0.75rem' : '0.45rem 1.15rem',
              borderRadius: '0.85rem',
              background: timeLeft < 300
                ? 'linear-gradient(135deg, rgba(153, 27, 27, 0.95), rgba(225, 29, 72, 0.95))'
                : 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 27, 75, 0.96) 100%)',
              border: timeLeft < 300 ? '2px solid #ef4444' : '1.5px solid rgba(129, 140, 248, 0.45)',
              boxShadow: timeLeft < 300 ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 4px 18px rgba(99, 102, 241, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.45rem' : '0.65rem',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                width: isMobile ? 26 : 30,
                height: isMobile ? 26 : 30,
                borderRadius: '50%',
                background: timeLeft < 300 ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={isMobile ? 15 : 18} color={timeLeft < 300 ? '#ffffff' : '#38bdf8'} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: timeLeft < 300 ? '#fecdd3' : '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {timeLeft < 300 ? '⚠️ AZ KALDI' : 'SÜRE'}
                </span>
                <span style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace",
                  fontSize: isMobile ? '1.05rem' : '1.25rem',
                  fontWeight: 900,
                  color: timeLeft < 300 ? '#ffffff' : '#38bdf8',
                  letterSpacing: '0.06em',
                  marginTop: 2,
                  textShadow: timeLeft < 300 ? '0 0 10px rgba(255,255,255,0.6)' : '0 0 10px rgba(56,189,248,0.4)'
                }}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          )}

          {/* PDF Mode Selector */}
          {hasPdf && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {!isMobile && (
                <button
                  onClick={() => setPdfMode('side')}
                  title="Sol panele sabitle"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '0.4rem 0.65rem',
                    borderRadius: '0.6rem', border: `1.5px solid ${effectivePdfMode === 'side' ? '#3b82f6' : '#334155'}`,
                    background: effectivePdfMode === 'side' ? '#1d4ed8' : '#0f172a',
                    color: effectivePdfMode === 'side' ? 'white' : '#93c5fd',
                    fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
                  }}
                >
                  <PanelLeft size={14} />
                  Sol Panel
                </button>
              )}
              <button
                onClick={() => setPdfMode('top')}
                title="Üst panele sabitle"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: isMobile ? '0.35rem' : '0.4rem 0.65rem',
                  borderRadius: '0.6rem', border: `1.5px solid ${effectivePdfMode === 'top' ? '#3b82f6' : '#334155'}`,
                  background: effectivePdfMode === 'top' ? '#1d4ed8' : '#0f172a',
                  color: effectivePdfMode === 'top' ? 'white' : '#93c5fd',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
                }}
              >
                <PanelTop size={isMobile ? 13 : 14} />
                {!isMobile && 'Üst Panel'}
              </button>
              <button
                onClick={() => setPdfMode('float')}
                title="Yüzen pencere"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: isMobile ? '0.35rem' : '0.4rem 0.65rem',
                  borderRadius: '0.6rem', border: `1.5px solid ${effectivePdfMode === 'float' ? '#3b82f6' : '#334155'}`,
                  background: effectivePdfMode === 'float' ? '#1d4ed8' : '#0f172a',
                  color: effectivePdfMode === 'float' ? 'white' : '#93c5fd',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
                }}
              >
                <Maximize2 size={isMobile ? 13 : 14} />
                {!isMobile && 'Pencere'}
              </button>
              <button
                onClick={() => setPdfMode('hidden')}
                title="PDF'yi Gizle"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: isMobile ? '0.35rem' : '0.4rem 0.65rem',
                  borderRadius: '0.6rem', border: `1.5px solid ${effectivePdfMode === 'hidden' ? '#ef4444' : '#334155'}`,
                  background: effectivePdfMode === 'hidden' ? '#7f1d1d' : '#0f172a',
                  color: effectivePdfMode === 'hidden' ? '#fca5a5' : '#94a3b8',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
                }}
              >
                <XIcon size={isMobile ? 13 : 14} />
                {!isMobile && 'Gizle'}
              </button>
            </div>
          )}

          {/* Optik Göster / Gizle Button */}
          <button
            onClick={() => setShowOptikForm(!showOptikForm)}
            style={{
              padding: isMobile ? '0.4rem 0.6rem' : '0.45rem 0.85rem',
              borderRadius: '0.7rem',
              background: showOptikForm ? '#0891b2' : '#0f172a',
              border: `1.5px solid ${showOptikForm ? '#06b6d4' : '#334155'}`,
              color: 'white',
              fontWeight: 800,
              fontSize: isMobile ? '0.72rem' : '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title={showOptikForm ? "Optik Alanı Gizle (PDF Tam Ekran)" : "Optik Alanı Göster"}
          >
            {showOptikForm ? <EyeOff size={isMobile ? 13 : 15} /> : <Eye size={isMobile ? 13 : 15} />}
            <span>{showOptikForm ? 'Optik Gizle' : 'Optik Göster'}</span>
          </button>

          {/* Drawing Canvas Button */}
          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: isMobile ? '0.4rem 0.5rem' : '0.45rem 0.85rem',
              borderRadius: '0.7rem',
              background: isDrawingOpen ? '#eab308' : '#0f172a',
              border: '1.5px solid #334155',
              color: isDrawingOpen ? 'white' : '#e2e8f0',
              fontWeight: 800,
              fontSize: isMobile ? '0.72rem' : '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title="Çizim Aracı"
          >
            <Pencil size={isMobile ? 13 : 15} /> 
            {!isMobile && (isDrawingOpen ? "Çizimi Kapat" : "Çizim")}
          </button>

          {/* Submit Button */}
          {!isSubmitted && !isTeacherReviewing && (
            <button
              onClick={() => handleSubmit(false)}
              style={{
                padding: isMobile ? '0.4rem 0.65rem' : '0.45rem 1.1rem',
                borderRadius: '0.7rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: isMobile ? '0.75rem' : '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
              }}
            >
              <CheckCircle2 size={isMobile ? 14 : 16} /> 
              {!isMobile && "Testi Bitir"}
              {isMobile && "Bitir"}
            </button>
          )}

          {isSubmitted && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#059669', color: 'white', padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 900 }}>
              <CheckCircle2 size={14} /> Test Tamamlandı
            </div>
          )}

        </div>
      </header>

      {/* ── CSS FOR RESPONSIVE COLUMN ── */}
      <style>{`
        @media (max-width: 768px) {
          [data-quiz-layout] {
            flex-direction: column !important;
          }
        }
      `}</style>

      {/* ── MAIN WORKSPACE: PDF + OPTICAL AREA ── */}
      <div
        data-quiz-layout
        style={{
          display: 'flex',
          flexDirection: (effectivePdfMode === 'top' || isMobile) ? 'column' : 'row',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* PDF Panel */}
        {hasPdf && (
          <ResizablePdfPanel
            pdfUrl={pdfUrl}
            title={resolvedTest.name || resolvedBook?.title || 'Kitap PDF'}
            mode={effectivePdfMode}
            onModeChange={setPdfMode}
            isFullScreen={!showOptikForm}
            onToggleDrawing={() => setIsDrawingOpen(p => !p)}
            isDrawingOpen={isDrawingOpen}
          />
        )}

        {/* Optical Area */}
        {showOptikForm && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0, background: '#0f172a' }}>
            <div style={{ maxWidth: effectivePdfMode === 'hidden' ? 960 : undefined, width: '100%', margin: effectivePdfMode === 'hidden' ? '0 auto' : undefined, padding: isMobile ? '0.75rem' : '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* 1. SCORECARD HERO AFTER SUBMISSION */}
              {isSubmitted && results && (
                <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 27, 75, 0.96) 100%)', borderRadius: '1.4rem', padding: '1.25rem 1.4rem', color: 'white', boxShadow: '0 12px 36px rgba(0,0,0,0.45)', border: '1.5px solid rgba(165, 180, 252, 0.28)', backdropFilter: 'blur(20px)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: results.scorePct >= 70 ? 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.4))' : results.scorePct >= 50 ? 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(217,119,6,0.4))' : 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(225,29,72,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: results.scorePct >= 70 ? '1.5px solid rgba(52,211,153,0.5)' : results.scorePct >= 50 ? '1.5px solid rgba(251,191,36,0.5)' : '1.5px solid rgba(251,113,133,0.5)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                        <Trophy size={26} color={results.scorePct >= 70 ? '#4ade80' : results.scorePct >= 50 ? '#fbbf24' : '#fb7185'} />
                      </div>
                      <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.22)', border: '1px solid rgba(165,180,252,0.35)', borderRadius: 99, padding: '0.15rem 0.6rem', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#c7d2fe', letterSpacing: '0.05em' }}>TEST TAMAMLANDI</span>
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff' }}>{resolvedTest.name}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Doğru */}
                      <div style={{ background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.85) 0%, rgba(5, 150, 105, 0.45) 100%)', border: '1.5px solid rgba(52, 211, 153, 0.65)', borderRadius: 14, padding: '0.55rem 0.95rem', textAlign: 'center', minWidth: 68, boxShadow: '0 4px 14px rgba(16,185,129,0.25)' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#4ade80', textShadow: '0 0 12px rgba(74,222,128,0.5)', lineHeight: 1.1 }}>{results.correct}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#a7f3d0', letterSpacing: '0.04em', marginTop: 3 }}>DOĞRU</div>
                      </div>

                      {/* Yanlış */}
                      <div style={{ background: 'linear-gradient(135deg, rgba(136, 19, 55, 0.85) 0%, rgba(225, 29, 72, 0.45) 100%)', border: '1.5px solid rgba(251, 113, 133, 0.65)', borderRadius: 14, padding: '0.55rem 0.95rem', textAlign: 'center', minWidth: 68, boxShadow: '0 4px 14px rgba(239,68,68,0.25)' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fb7185', textShadow: '0 0 12px rgba(251,113,133,0.5)', lineHeight: 1.1 }}>{results.wrong}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#fecdd3', letterSpacing: '0.04em', marginTop: 3 }}>YANLIŞ</div>
                      </div>

                      {/* Boş */}
                      <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.6) 100%)', border: '1.5px solid rgba(148, 163, 184, 0.45)', borderRadius: 14, padding: '0.55rem 0.95rem', textAlign: 'center', minWidth: 68, boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#e2e8f0', lineHeight: 1.1 }}>{results.blank}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.04em', marginTop: 3 }}>BOŞ</div>
                      </div>

                      {/* Başarı Yüzdesi (Net yerine) */}
                      <div style={{
                        background: results.scorePct >= 70
                          ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.95) 0%, rgba(13, 148, 136, 0.95) 100%)'
                          : results.scorePct >= 50
                            ? 'linear-gradient(135deg, rgba(120, 53, 15, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%)'
                            : 'linear-gradient(135deg, rgba(136, 19, 55, 0.95) 0%, rgba(225, 29, 72, 0.95) 100%)',
                        border: results.scorePct >= 70 ? '2px solid #34d399' : results.scorePct >= 50 ? '2px solid #fbbf24' : '2px solid #fb7185',
                        borderRadius: 16,
                        padding: '0.55rem 1.25rem',
                        textAlign: 'center',
                        minWidth: 95,
                        boxShadow: '0 6px 20px rgba(0,0,0,0.45)'
                      }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                          %{results.scorePct}
                        </div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
                          🎯 BAŞARI
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons after submission */}
                  <div style={{ display: 'flex', gap: 10, marginTop: '1.1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.12)', flexWrap: 'wrap', alignItems: 'center' }}>
                    {resolvedBook && (
                      <button 
                        onClick={() => navigate(`/student/books/${resolvedBook.id}`)}
                        style={{ padding: '0.6rem 1.35rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.86rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 14px rgba(79,70,229,0.4)', transition: 'transform 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                      >
                        <BookOpen size={16} /> Kitaba Dön
                      </button>
                    )}
                    {results && (results.wrong > 0 || results.blank > 0) && (
                      <button
                        onClick={handleRetakeWrong}
                        style={{ padding: '0.6rem 1.35rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.86rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 14px rgba(245,158,11,0.35)', transition: 'transform 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                      >
                        <RotateCcw size={16} /> Yanlış & Boşları Tekrar Çöz ({results.wrong + results.blank})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 2. OPTICAL BUBBLES / OPEN-ENDED FORM */}
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.25rem', padding: isMobile ? '1rem' : '1.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Header & Progress Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 12px #06b6d4' }} />
                      <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#f8fafc', letterSpacing: '-0.01em' }}>
                        Optik Form
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 800, background: '#0f172a', padding: '0.25rem 0.7rem', borderRadius: '0.6rem', border: '1px solid #334155' }}>
                        {questionCount} Soru
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {flaggedCount > 0 && (
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fbbf24', background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.4)', padding: '0.3rem 0.7rem', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Flag size={13} /> {flaggedCount} Şüpheli
                        </div>
                      )}
                      {!isSubmitted && (
                        <div style={{ fontSize: '0.84rem', fontWeight: 900, color: answeredCount === questionCount ? '#34d399' : '#38bdf8', background: 'rgba(255,255,255,0.06)', padding: '0.35rem 0.8rem', borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                          {answeredCount}/{questionCount} Kodlandı {questionCount > 0 ? `(%${Math.round((answeredCount / questionCount) * 100)})` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {!isSubmitted && questionCount > 0 && (
                    <div style={{ width: '100%', height: 6, background: '#0f172a', borderRadius: 99, overflow: 'hidden', border: '1px solid #334155' }}>
                      <div 
                        style={{ 
                          width: `${Math.min(100, Math.round((answeredCount / questionCount) * 100))}%`, 
                          height: '100%', 
                          background: answeredCount === questionCount ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #0891b2, #06b6d4)', 
                          transition: 'width 0.25s ease' 
                        }} 
                      />
                    </div>
                  )}
                </div>

                {/* Natural Question Grid (1 2 3... yukarıdan aşağıya sıralı akış) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : `repeat(${questionColumns.length}, minmax(0, 1fr))`,
                  gap: '1rem',
                  alignItems: 'start'
                }}>
                  {questionColumns.map((col, colIdx) => (
                    <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {col.map(qNo => {
                        const idx = qNo - 1;
                        const selected = answers[qNo] || answers[String(qNo)] || '';

                        let isCorrect = false;
                        let isWrong = false;
                        let correctKey = '';

                        if (isSubmitted) {
                          const answerKey = resolvedTest?.answerKey || resolvedBook?.answerKey || {};
                          correctKey = Array.isArray(answerKey) 
                            ? (answerKey[idx] || '') 
                            : (answerKey[qNo] || answerKey[String(qNo)] || '');
                          isCorrect = selected && String(selected).toUpperCase() === String(correctKey).toUpperCase();
                          isWrong = selected && String(selected).toUpperCase() !== String(correctKey).toUpperCase();
                        }

                        if (isOpenEnded) {
                          return (
                            <div key={qNo} style={{ background: '#0f172a', padding: '0.85rem 1rem', borderRadius: '1rem', border: selected ? '1.5px solid #0891b2' : '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#f8fafc' }}>
                                Soru {qNo}
                              </span>
                              <textarea
                                disabled={isSubmitted}
                                value={selected}
                                onChange={e => handleOpenEndedChange(qNo, e.target.value)}
                                placeholder="Cevabınızı buraya yazınız..."
                                rows={2}
                                style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '0.5rem', color: 'white', fontSize: '0.85rem', resize: 'vertical' }}
                              />
                            </div>
                          );
                        }

                        return (
                          <div 
                            key={qNo} 
                            style={{
                              background: flagged[qNo] && !isSubmitted
                                ? 'rgba(245, 158, 11, 0.08)'
                                : selected 
                                  ? 'rgba(8, 145, 178, 0.08)' 
                                  : '#0f172a',
                              padding: isMobile ? '0.6rem 0.75rem' : '0.65rem 1rem',
                              borderRadius: '1rem',
                              border: isCorrect 
                                ? '1.5px solid #10b981' 
                                : isWrong 
                                ? '1.5px solid #ef4444' 
                                : flagged[qNo] && !isSubmitted
                                ? '1.5px solid #f59e0b'
                                : selected 
                                ? '1.5px solid #0891b2' 
                                : '1px solid #334155',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.45rem',
                              transition: 'all 0.15s ease',
                              boxShadow: selected ? '0 4px 14px rgba(8,145,178,0.15)' : 'none'
                            }}
                          >
                            {/* Top Question Row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.75rem' }}>
                              {/* Question Number Badge & Flag */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 70, flexShrink: 0 }}>
                                <div style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '0.6rem',
                                  background: selected ? 'linear-gradient(135deg, #0891b2, #0e7490)' : '#1e293b',
                                  color: selected ? '#ffffff' : '#94a3b8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 900,
                                  fontSize: '0.85rem',
                                  border: selected ? 'none' : '1px solid #334155',
                                  boxShadow: selected ? '0 2px 8px rgba(8,145,178,0.4)' : 'none'
                                }}>
                                  {qNo}
                                </div>

                                {!isSubmitted && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleFlag(qNo); }}
                                    title={flagged[qNo] ? "İşareti Kaldır" : "Şüpheli/İncele Olarak İşaretle"}
                                    style={{
                                      background: flagged[qNo] ? 'rgba(245,158,11,0.25)' : 'transparent',
                                      border: flagged[qNo] ? '1px solid #f59e0b' : 'none',
                                      borderRadius: '0.4rem',
                                      padding: '4px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: flagged[qNo] ? '#fbbf24' : '#64748b'
                                    }}
                                  >
                                    <Flag size={14} fill={flagged[qNo] ? '#fbbf24' : 'none'} />
                                  </button>
                                )}

                                {isSubmitted && (
                                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isCorrect ? '#4ade80' : isWrong ? '#f87171' : '#94a3b8' }}>
                                    {isCorrect ? '✓' : isWrong ? `(${correctKey})` : `—`}
                                  </span>
                                )}
                              </div>

                              {/* Large Option Bubbles (A, B, C, D, E) */}
                              <div style={{ display: 'flex', gap: isMobile ? '0.35rem' : '0.5rem', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                                {optionsList.map((opt) => {
                                  const isSelected = selected === opt;
                                  const isThisOptCorrect = isSubmitted && correctKey === opt;

                                  let bubbleBg = '#1e293b';
                                  let bubbleBorder = '1.5px solid #475569';
                                  let bubbleColor = '#cbd5e1';
                                  let bubbleShadow = 'none';

                                  if (isSelected) {
                                    bubbleBg = 'linear-gradient(135deg, #0891b2, #06b6d4)';
                                    bubbleBorder = '2px solid #38bdf8';
                                    bubbleColor = '#ffffff';
                                    bubbleShadow = '0 4px 14px rgba(8,145,178,0.45)';
                                  }

                                  if (isSubmitted) {
                                    if (isThisOptCorrect) {
                                      bubbleBg = 'linear-gradient(135deg, #10b981, #059669)';
                                      bubbleBorder = '2px solid #34d399';
                                      bubbleColor = '#ffffff';
                                      bubbleShadow = '0 4px 12px rgba(16,185,129,0.4)';
                                    } else if (isSelected && !isThisOptCorrect) {
                                      bubbleBg = 'linear-gradient(135deg, #ef4444, #dc2626)';
                                      bubbleBorder = '2px solid #f87171';
                                      bubbleColor = '#ffffff';
                                      bubbleShadow = '0 4px 12px rgba(239,68,68,0.4)';
                                    }
                                  }

                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      disabled={isSubmitted}
                                      onClick={() => handleSelectOption(qNo, opt)}
                                      style={{
                                        width: isMobile ? 38 : 44,
                                        height: isMobile ? 38 : 44,
                                        borderRadius: '50%',
                                        fontWeight: 900,
                                        fontSize: isMobile ? '0.95rem' : '1.05rem',
                                        cursor: isSubmitted ? 'default' : 'pointer',
                                        border: bubbleBorder,
                                        background: bubbleBg,
                                        color: bubbleColor,
                                        transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: bubbleShadow,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0
                                      }}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}

                                {!isSubmitted && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearOption(qNo)}
                                    disabled={!selected}
                                    title="İşareti Kaldır"
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: '50%',
                                      background: selected ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                      border: selected ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
                                      color: selected ? '#f87171' : 'transparent',
                                      cursor: selected ? 'pointer' : 'default',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      pointerEvents: selected ? 'auto' : 'none',
                                      transition: 'all 0.12s ease',
                                      marginLeft: 2,
                                      padding: 0
                                    }}
                                  >
                                    <XIcon size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Mistake Diagnostic Selector (Why did I get it wrong?) */}
                            {isSubmitted && isWrong && (
                              <div style={{
                                width: '100%',
                                marginTop: '0.45rem',
                                paddingTop: '0.45rem',
                                borderTop: '1px dashed rgba(239, 68, 68, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '0.4rem'
                              }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  🤔 Yanlış Sebebi:
                                </span>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {[
                                    { label: '⚡ İşlem Hatası', color: '#f59e0b' },
                                    { label: '⚠️ Dikkat Kaybı', color: '#fb7185' },
                                    { label: '📖 Formül / Bilgi', color: '#38bdf8' },
                                    { label: '🧠 Konu Eksiği', color: '#a855f7' },
                                    { label: '⏱️ Zaman Yetmedi', color: '#ec4899' }
                                  ].map(r => {
                                    const isSelected = mistakeReasons[qNo] === r.label;
                                    return (
                                      <button
                                        key={r.label}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleSetMistakeReason(qNo, r.label); }}
                                        style={{
                                          padding: '0.18rem 0.5rem',
                                          fontSize: '0.62rem',
                                          fontWeight: 800,
                                          borderRadius: 6,
                                          border: isSelected ? `1.5px solid ${r.color}` : '1px solid rgba(255,255,255,0.12)',
                                          background: isSelected ? `${r.color}33` : 'rgba(15,23,42,0.6)',
                                          color: isSelected ? r.color : 'rgba(255,255,255,0.7)',
                                          cursor: 'pointer',
                                          boxShadow: isSelected ? `0 2px 8px ${r.color}40` : 'none',
                                          transition: 'all 0.15s'
                                        }}
                                      >
                                        {r.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Submit Button */}
              {!isSubmitted && !isTeacherReviewing && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '2rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => handleSubmit(false)}
                    style={{
                      padding: '0.9rem 2.5rem',
                      borderRadius: '1rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    <CheckCircle2 size={20} />
                    Testi Kaydet ve Tamamla
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />

      {/* ── FINISH MODAL ── */}
      {showFinishModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(5px)' }}>
          <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center', padding: '2rem', background: '#1e293b', borderRadius: '1.5rem', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '1rem', color: '#f8fafc', margin: '1rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #10b981', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <CheckCircle2 size={30} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>Testi Bitiriyorsunuz</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {answeredCount}/{questionCount} soru işaretlediniz. Testi tamamlayıp sonuçlarınızı kaydetmek istiyor musunuz?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setShowFinishModal(false)}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '0.75rem', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Geri Dön
              </button>
              <button 
                onClick={() => handleSubmit(true)}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE FLOATING ACTION BUTTON ── */}
      {isMobile && !showOptikForm && (
        <button
          onClick={() => setShowMobileOpticModal(true)}
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.25rem',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '3.5rem',
            height: '3.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(8,145,178,0.5)',
            cursor: 'pointer'
          }}
          title="Optik Formu Aç"
        >
          <FileSpreadsheet size={24} />
        </button>
      )}

      {/* ── MOBILE BOTTOM-SHEET MODAL ── */}
      {isMobile && showMobileOpticModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }} onClick={() => setShowMobileOpticModal(false)}>
          <div style={{
            background: '#0f172a',
            color: '#f8fafc',
            borderRadius: '1.5rem 1.5rem 0 0',
            maxHeight: '85vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -10px 35px rgba(0,0,0,0.5)',
            borderTop: '1px solid #334155'
          }} onClick={e => e.stopPropagation()}>

            <div style={{
              padding: '0.9rem 1.25rem',
              background: '#1e293b',
              borderBottom: '1px solid #334155',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#f8fafc' }}>
                  📝 {resolvedTest.name}
                </h3>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>
                  {answeredCount}/{questionCount} soru kodlandı
                </p>
              </div>

              {!isSubmitted && !isTeacherReviewing && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: timeLeft < 300
                    ? 'linear-gradient(135deg, rgba(153, 27, 27, 0.9), rgba(225, 29, 72, 0.9))'
                    : 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.95))',
                  border: timeLeft < 300 ? '1.5px solid #ef4444' : '1.5px solid rgba(129, 140, 248, 0.4)',
                  borderRadius: '0.75rem',
                  padding: '0.35rem 0.75rem'
                }}>
                  <Clock size={15} color={timeLeft < 300 ? '#ffffff' : '#38bdf8'} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: '1.05rem',
                    fontWeight: 900,
                    color: timeLeft < 300 ? '#ffffff' : '#38bdf8'
                  }}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}

              <button
                onClick={() => setShowMobileOpticModal(false)}
                style={{
                  background: '#334155', border: 'none', borderRadius: '50%',
                  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#cbd5e1'
                }}
              >
                <XIcon size={18} />
              </button>
            </div>

            <div style={{ padding: '0.85rem', overflowY: 'auto', flex: 1, background: '#0f172a' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {Array.from({ length: questionCount }).map((_, idx) => {
                  const qNo = idx + 1;
                  const selected = answers[qNo] || answers[String(qNo)] || '';

                  return (
                    <div 
                      key={qNo} 
                      style={{ 
                        background: selected ? 'rgba(8, 145, 178, 0.08)' : '#1e293b', 
                        padding: '0.55rem 0.85rem', 
                        borderRadius: '0.85rem', 
                        border: selected ? '1.5px solid #0891b2' : '1px solid #334155', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        gap: '0.5rem' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 45 }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '0.5rem',
                          background: selected ? 'linear-gradient(135deg, #0891b2, #0e7490)' : '#0f172a',
                          color: selected ? '#ffffff' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '0.8rem',
                          border: selected ? 'none' : '1px solid #334155'
                        }}>
                          {qNo}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {optionsList.map((opt) => {
                          const isSelected = selected === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleSelectOption(qNo, opt)}
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: '50%',
                                fontWeight: 900,
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                border: isSelected ? '2px solid #38bdf8' : '1.5px solid #475569',
                                background: isSelected ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#0f172a',
                                color: isSelected ? 'white' : '#cbd5e1',
                                transition: 'all 0.12s ease',
                                boxShadow: isSelected ? '0 4px 12px rgba(8,145,178,0.45)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}

                        {selected && (
                          <button
                            type="button"
                            onClick={() => handleClearOption(qNo)}
                            title="İşareti Kaldır"
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: 2,
                              padding: 0
                            }}
                          >
                            <XIcon size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: '0.75rem 1.25rem', background: '#1e293b', borderTop: '1px solid #334155' }}>
              <button
                onClick={() => setShowMobileOpticModal(false)}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                  color: 'white', border: 'none', fontWeight: 900, fontSize: '0.9rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                <CheckCircle2 size={16} />
                <span>Cevapları Onayla ve PDF'e Dön</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── DESKTOP FLOATING ACTION BUTTON ── */}
      {!isMobile && (!showOptikForm || effectivePdfMode === 'float') && (
        <button
          onClick={() => {
            setShowOptikForm(true);
            if (effectivePdfMode === 'float') setPdfMode('side');
          }}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '1.5rem',
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(8,145,178,0.5)',
            border: 'none',
            zIndex: 9999,
            cursor: 'pointer'
          }}
          title="Optik Formu Aç"
        >
          <FileSpreadsheet size={24} />
        </button>
      )}

    </div>
  );
}
