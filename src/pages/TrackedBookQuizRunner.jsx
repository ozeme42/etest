import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { toUUID } from '../services/supabaseService';
import { isDeletedItem, purgeTestCache } from '../services/unifiedResultAdapter';
import { useMediaQuery } from '../hooks/useMediaQuery';
import ResizablePdfPanel from '../components/ResizablePdfPanel';
import DrawingCanvas from '../components/quiz/common/DrawingCanvas';
import ScreenSnipperAndSolverModal from '../components/quiz/ai/ScreenSnipperAndSolverModal';
import { 
  ArrowLeft, CheckCircle2, Clock, FileSpreadsheet, X as XIcon, 
  PanelLeft, PanelTop, Maximize2, Eye, EyeOff, Pencil, ChevronRight, 
  BookOpen, AlertCircle, Trophy, Sparkles, HelpCircle, Check, PlayCircle,
  Flag, RotateCcw, Cloud, Save, Sun, Moon
} from 'lucide-react';

function getQuestionColumns(totalCount, isMobile = false, containerWidth = 1000, isSidePdf = false) {
  if (totalCount <= 0) return [[]];
  // Masaüstünde PDF yan paneldeyken veya mobilde veya dar alanda TEK SÜTUN olarak göster:
  if (isSidePdf || isMobile || containerWidth < 760) {
    return [Array.from({ length: totalCount }, (_, i) => i + 1)];
  }

  // Geniş panelde (PDF yokken veya gizliyken) soru sayısına göre 2 eşit/dengeli sütuna böl:
  const perCol = Math.ceil(totalCount / 2);
  const col1 = [];
  const col2 = [];

  for (let i = 1; i <= totalCount; i++) {
    if (i <= perCol) {
      col1.push(i);
    } else {
      col2.push(i);
    }
  }

  return col2.length > 0 ? [col1, col2] : [col1];
}

const MISTAKE_REASON_OPTIONS = [
  { label: '⚡ İşlem Hatası', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { label: '⚠️ Dikkat Kaybı', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  { label: '📖 Formül / Bilgi', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  { label: '🧠 Konu Eksiği', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
  { label: '⏱️ Zaman Yetmedi', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' }
];

export default function TrackedBookQuizRunner() {
  const { testId: routeParamId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const returnUrl = location.state?.from || location.state?.returnUrl || (searchParams.get('from'));

  const { books, bookTests, loading: booksLoading } = useTrackedBooks();
  const { homeworks, submitHomework, loading: hwLoading } = useHomework();
  const { submissions, addSubmission, updateSubmission } = useEvaluation();
  const { users } = useUser();
  const { currentUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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

    // 1. Composite ID (e.g. auto_hw_123_456_date or book_test_123_456 or bt_123_456)
    if (cleanId.startsWith('auto_hw_') || cleanId.startsWith('book_test_') || cleanId.startsWith('bt_') || cleanId.includes('_tbt_') || cleanId.includes('_bt_')) {
      const parts = cleanId.split('_');
      const candidateTestIds = parts.slice(2);
      for (const cand of candidateTestIds) {
        if (!t && cand) {
          t = (bookTests || []).find(test => 
            String(test.id) === cand || 
            toUUID(test.id) === cand ||
            toUUID(test.id) === toUUID(cand) ||
            String(test.id).replace(/^bt_/, '').replace(/^q_/, '') === cand.replace(/^bt_/, '').replace(/^q_/, '')
          );
        }
      }
      h = (homeworks || []).find(hw => cleanId.includes(String(hw.id)) || (toUUID(hw.id) && cleanId.includes(toUUID(hw.id))));
    }

    // 2. Direct match in bookTests
    if (!t && bookTests && bookTests.length > 0) {
      t = bookTests.find(test => 
        String(test.id) === cleanId || 
        toUUID(test.id) === cleanId ||
        toUUID(test.id) === toUUID(cleanId) ||
        String(test.id).replace(/[^a-zA-Z0-9]/g, '') === cleanId.replace(/[^a-zA-Z0-9]/g, '')
      );
    }

    // 3. Match from embedded subjects/topics in books
    if (!t && books && books.length > 0) {
      for (const book of books) {
        for (const subj of (book.subjects || [])) {
          for (const st of (subj.tests || [])) {
            if (String(st.id) === cleanId || toUUID(st.id) === cleanId || toUUID(st.id) === toUUID(cleanId) || String(st.id).replace(/^bt_/, '').replace(/^q_/, '') === cleanId.replace(/^bt_/, '').replace(/^q_/, '')) {
              t = { ...st, bookId: book.id, subjectId: subj.id };
              b = book;
              break;
            }
          }
          if (t) break;
          for (const top of (subj.topics || [])) {
            for (const tt of (top.tests || [])) {
              if (String(tt.id) === cleanId || toUUID(tt.id) === cleanId || toUUID(tt.id) === toUUID(cleanId) || String(tt.id).replace(/^bt_/, '').replace(/^q_/, '') === cleanId.replace(/^bt_/, '').replace(/^q_/, '')) {
                t = { ...tt, bookId: book.id, subjectId: subj.id, topicId: top.id };
                b = book;
                break;
              }
            }
            if (t) break;
          }
          if (t) break;
        }
        if (t) break;
      }
    }

    // 4. Match from homeworks list only if cleanId matches homework ID
    if (!t && homeworks && homeworks.length > 0) {
      const hwMatch = homeworks.find(hw => String(hw.id) === cleanId || toUUID(hw.id) === cleanId || toUUID(hw.id) === toUUID(cleanId));
      if (hwMatch) {
        h = hwMatch;
        if (hwMatch.tests && hwMatch.tests.length > 0) {
          const firstId = hwMatch.tests[0];
          t = (bookTests || []).find(test => String(test.id) === String(firstId) || toUUID(test.id) === toUUID(firstId));
        }
      }
    }

    // 5. Match from books list (first test of the book only if cleanId is actually a book ID)
    if (!t && books && books.length > 0) {
      const bookMatch = books.find(book => String(book.id) === cleanId || toUUID(book.id) === cleanId || toUUID(book.id) === toUUID(cleanId));
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

  // If this is actually a full physical exam (bookType === 'exam') or regular quiz, redirect safely
  useEffect(() => {
    if (resolvedBook?.bookType === 'exam' || resolvedHw?.type === 'physicalExam') {
      const targetId = resolvedHw?.id || resolvedBook?.id || cleanId;
      navigate(`/physical-exam/${targetId}?studentId=${studentId || ''}`, { replace: true });
      return;
    }
    // If not a tracked book test but a normal homework/quiz, redirect to /quiz/:id
    if (!resolvedTest && !booksLoading && !hwLoading && homeworks?.length > 0) {
      const cleanHwMatch = homeworks.find(hw => String(hw.id) === cleanId || toUUID(hw.id) === cleanId || cleanId.includes(String(hw.id)));
      if (cleanHwMatch && !cleanHwMatch.isBookAssignment) {
        navigate(`/quiz/${cleanHwMatch.id}?studentId=${studentId || ''}`, { replace: true });
      }
    }
  }, [resolvedBook, resolvedHw, resolvedTest, booksLoading, hwLoading, homeworks, cleanId, studentId, navigate]);

  const pdfUrl = resolvedTest?.pdfUrl || resolvedBook?.pdfUrl || resolvedHw?.pdfUrl || '';
  const hasPdf = Boolean(pdfUrl);

  // Layout and mode states
  const [pdfMode, setPdfMode] = useState(() => hasPdf ? (isMobile ? 'top' : 'side') : 'hidden');
  const effectivePdfMode = (isMobile && pdfMode === 'side') ? 'top' : pdfMode;
  const [showOptikForm, setShowOptikForm] = useState(true);
  const [showMobileOpticModal, setShowMobileOpticModal] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState(null);

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

  const [isSavingDb, setIsSavingDb] = useState(false);
  const [saveToast, setSaveToast] = useState(null);
  const [aiModalQuestionNo, setAiModalQuestionNo] = useState(null);

  const handleSetMistakeReason = (qNo, reason) => {
    setMistakeReasons(prev => {
      const next = { ...prev, [qNo]: prev[qNo] === reason ? null : reason };
      try {
        localStorage.setItem(`mistake_reasons_${resolvedTest?.id || testKey}_${studentId}`, JSON.stringify(next));
        localStorage.setItem(`mistake_reasons_bt_${resolvedTest?.id || testKey}_${studentId}`, JSON.stringify(next));
      } catch {}

      // Also persist to evaluation submission if exists
      const testId = resolvedTest?.id || testKey;
      const sub = submissions.find(s =>
        (String(s.testId) === String(testId) || String(s.bookTestId) === String(testId) || toUUID(s.testId) === toUUID(testId)) &&
        (String(s.studentId) === String(studentId) || toUUID(s.studentId) === toUUID(studentId))
      );
      if (sub && updateSubmission) {
        updateSubmission(sub.id, { mistakeReasons: next });
      }
      return next;
    });
  };

  const handleSaveAllMistakesToDb = async () => {
    setIsSavingDb(true);
    try {
      const testId = resolvedTest?.id || testKey;
      localStorage.setItem(`mistake_reasons_${testId}_${studentId}`, JSON.stringify(mistakeReasons));
      localStorage.setItem(`mistake_reasons_bt_${testId}_${studentId}`, JSON.stringify(mistakeReasons));

      const sub = submissions.find(s =>
        (String(s.testId) === String(testId) || String(s.bookTestId) === String(testId) || toUUID(s.testId) === toUUID(testId)) &&
        (String(s.studentId) === String(studentId) || toUUID(s.studentId) === toUUID(studentId))
      );
      if (sub && updateSubmission) {
        await updateSubmission(sub.id, { mistakeReasons: mistakeReasons });
      }
      setSaveToast('✓ Hata analizi veritabanına ve sisteme başarıyla kaydedildi!');
    } catch (e) {
      console.error(e);
      setSaveToast('✓ Hata analizi sisteme kaydedildi!');
    } finally {
      setIsSavingDb(false);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  const opticalContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1000);

  useEffect(() => {
    if (!opticalContainerRef.current) return;
    const updateSize = () => {
      if (opticalContainerRef.current) {
        setContainerWidth(opticalContainerRef.current.clientWidth);
      }
    };
    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect) {
            setContainerWidth(entry.contentRect.width);
          }
        }
      });
      observer.observe(opticalContainerRef.current);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, [showOptikForm, effectivePdfMode]);

  const questionCount = Number(resolvedTest?.questionCount) || Number(resolvedTest?.question_count) || 20;
  const rawAnsKey = resolvedTest?.answerKey || resolvedBook?.answerKey || {};
  const hasOptionLetters = Object.entries(rawAnsKey).some(([k, v]) => k !== '__meta' && k !== 'meta' && typeof v === 'string' && /^[A-Ea-e]$/.test(v.trim()));
  const isExplicitMC = resolvedTest?.isOpenEnded === false || resolvedTest?.is_open_ended === false || resolvedTest?.questionType === 'coktan_secmeli' || resolvedTest?.question_type === 'coktan_secmeli' || resolvedBook?.bookType === 'multiple_choice' || resolvedBook?.bookType === 'standard' || resolvedBook?.bookType === 'exam' || hasOptionLetters;

  const isOpenEnded = !isExplicitMC && Boolean(
    resolvedBook?.bookType === 'open_ended' ||
    resolvedTest?.isOpenEnded === true ||
    resolvedTest?.is_open_ended === true ||
    resolvedTest?.questionType === 'acik_uclu' ||
    resolvedTest?.question_type === 'acik_uclu' ||
    resolvedTest?.answerKey?.__meta?.isOpenEnded === true ||
    resolvedTest?.answerKey?.__meta?.questionType === 'acik_uclu' ||
    (resolvedTest?.name && /açık\s*uçlu|acik\s*uclu/i.test(resolvedTest.name) && !/çoktan\s*seçmeli|coktan\s*secmeli|test/i.test(resolvedTest.name))
  );

  const isSidePdf = Boolean(hasPdf && effectivePdfMode === 'side' && !isMobile);

  const questionColumns = useMemo(() => {
    return getQuestionColumns(questionCount, isMobile, containerWidth, isSidePdf);
  }, [questionCount, isMobile, containerWidth, isSidePdf]);

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

  const calculateTestResults = useCallback((answersToCalc) => {
    if (!resolvedTest) return null;
    const targetAnswers = answersToCalc || answers;
    const answerKey = resolvedTest.answerKey || resolvedBook?.answerKey || {};
    const penaltyRatio = resolvedBook?.penaltyRatio !== undefined ? resolvedBook.penaltyRatio : 3;
    const testIsOpenEnded = isOpenEnded;

    const toLetter = (val) => {
      if (val === null || val === undefined || val === '' || val === 'empty') return '';
      if (typeof val === 'number') return String.fromCharCode(65 + val);
      const str = String(val).trim().toUpperCase();
      if (/^[A-E]$/.test(str)) return str;
      const num = Number(str);
      if (!isNaN(num) && num >= 0 && num <= 4) return String.fromCharCode(65 + num);
      return str;
    };

    // Sayısal/metin cevap normalizer (açık uçlu için)
    const normalizeNumeric = (val) => {
      if (val === null || val === undefined || val === '') return '';
      const str = String(val).trim().replace(/\s/g, '').replace(',', '.');
      // Eğer sayıya çevrilebiliyorsa sayısal karşılaştır
      const num = Number(str);
      if (!isNaN(num)) return String(num);
      return str.toLowerCase();
    };

    let correct = 0;
    let wrong = 0;
    let blank = 0;
    let pending = 0; // Cevap anahtarı olmayan açık uçlu sorular
    const detailed = [];

    for (let i = 1; i <= questionCount; i++) {
      const rawUserAns = targetAnswers[i] || targetAnswers[String(i)] || '';

      const rawCorrectKey = Array.isArray(answerKey)
        ? (answerKey[i - 1] ?? answerKey[i] ?? '')
        : (answerKey[i] ?? answerKey[String(i)] ?? answerKey[i - 1] ?? '');

      let isCorrect = false;
      let isWrong = false;
      let isPending = false;

      if (!rawUserAns && rawUserAns !== 0) {
        blank++;
      } else if (testIsOpenEnded) {
        // Açık uçlu mod: sayısal/metin karşılaştırma
        if (rawCorrectKey !== '' && rawCorrectKey !== null && rawCorrectKey !== undefined) {
          const userNorm = normalizeNumeric(rawUserAns);
          const keyNorm = normalizeNumeric(rawCorrectKey);
          if (userNorm && keyNorm && userNorm === keyNorm) {
            correct++;
            isCorrect = true;
          } else if (userNorm) {
            wrong++;
            isWrong = true;
          } else {
            blank++;
          }
        } else {
          // Cevap anahtarı yok — pending (öğretmen onayı bekliyor)
          pending++;
          isPending = true;
        }
      } else {
        // Çoktan seçmeli mod (harf karşılaştırma)
        const userAns = toLetter(rawUserAns);
        const correctKey = toLetter(rawCorrectKey);

        if (!userAns) {
          blank++;
        } else if (correctKey && userAns === correctKey) {
          correct++;
          isCorrect = true;
        } else if (correctKey) {
          wrong++;
          isWrong = true;
        } else {
          // Cevap anahtarı tanımsız → doğru say
          correct++;
          isCorrect = true;
        }
      }

      detailed.push({
        questionNo: i,
        userAnswer: testIsOpenEnded ? String(rawUserAns || '') : toLetter(rawUserAns),
        correctAnswer: testIsOpenEnded ? String(rawCorrectKey || '') : toLetter(rawCorrectKey),
        isCorrect,
        isWrong,
        isBlank: !rawUserAns && rawUserAns !== 0,
        isPending
      });
    }

    const hasAnswerKey = testIsOpenEnded
      ? Object.keys(answerKey).length > 0
      : true;

    const rawNet = correct - (penaltyRatio > 0 ? wrong / penaltyRatio : 0);
    const net = Math.max(0, Number(rawNet.toFixed(2)));
    const scorePct = questionCount > 0 ? Math.round((correct / questionCount) * 100) : 0;

    return {
      correct,
      wrong,
      blank,
      pending,
      net,
      scorePct,
      detailed,
      totalQuestions: questionCount,
      isOpenEnded: testIsOpenEnded,
      hasAnswerKey
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
      if (!s || isDeletedItem(s)) return false;
      const isMatchStudent = String(s.studentId) === studentIdStr || (studentUuidStr && String(s.studentId) === studentUuidStr) || (studentUuidStr && toUUID(s.studentId) === studentUuidStr);
      if (!isMatchStudent) return false;
      if (s.status === 'in_progress' || s.status === 'draft') return false;

      const matchFields = [
        String(s.testId || ''),
        String(s.realTestId || ''),
        String(s.bookTestId || ''),
        String(s.metadata?.realTestId || ''),
        String(s.metadata?.bookTestId || ''),
        String(s.metadata?.realId || ''),
        String(s.metadata?.testId || '')
      ];
      if (s.bookTestIds && Array.isArray(s.bookTestIds)) {
        matchFields.push(...s.bookTestIds.map(String));
      }

      const isIdMatch = matchFields.some(f => f && (f === testIdStr || (testUuidStr && f === testUuidStr) || toUUID(f) === testIdStr || (testUuidStr && toUUID(f) === testUuidStr)));
      if (isIdMatch) return true;

      // Match by Book & Test Name/Unit
      const isSameBook = String(s.bookId || '') === String(resolvedBook?.id) || (s.bookTitle && resolvedBook?.title && (s.bookTitle.includes(resolvedBook.title) || resolvedBook.title.includes(s.bookTitle)));
      if (isSameBook && resolvedTest?.name) {
        const sTitleClean = String(s.testTitle || s.title || s.topic || s.unit || '').trim().toLowerCase();
        const tNameClean = String(resolvedTest.name || '').trim().toLowerCase();
        const cleanSTitle = sTitleClean.replace(/^.*?—\s*/, '').trim();

        if (tNameClean.includes('sayfa') || cleanSTitle.includes('sayfa')) {
          if (cleanSTitle === tNameClean || sTitleClean.includes(tNameClean)) return true;
        } else {
          const isTestNameMatch = cleanSTitle === tNameClean || sTitleClean.includes(`(${tNameClean})`) || sTitleClean.endsWith(` ${tNameClean}`);
          if (isTestNameMatch) {
            const currentSubj = (resolvedBook?.subjects || []).find(sb => sb.id === (resolvedTest.subject_id || resolvedTest.subjectId) || toUUID(sb.id) === toUUID(resolvedTest.subject_id || resolvedTest.subjectId));
            const subjName = (currentSubj?.name || resolvedTest.subjectName || resolvedTest.subject || '').toLowerCase().trim();
            const sSubj = String(s.subject || s.subjectName || '').toLowerCase().trim();

            const isSubjectMatch = !subjName || subjName === 'ders' || sTitleClean.includes(subjName) || sSubj.includes(subjName) || subjName.includes(sSubj);
            if (isSubjectMatch) {
              const currentTopic = currentSubj?.topics?.find(tp => tp.id === (resolvedTest.topic_id || resolvedTest.topicId) || toUUID(tp.id) === toUUID(resolvedTest.topic_id || resolvedTest.topicId));
              const topicName = (currentTopic?.name || resolvedTest.topicName || resolvedTest.topic || '').toLowerCase().trim();
              if (topicName && topicName !== 'genel konu') {
                return sTitleClean.includes(topicName) || topicName.includes(sTitleClean.split('›')[1]?.split('(')[0]?.trim() || '');
              }
              return true;
            }
          }
        }
      }

      return false;
    });

    if (existingSub) {
      setIsSubmitted(true);
      setShowOptikForm(true);

      let loadedAnswers = existingSub.studentAnswers || {};
      if (Array.isArray(existingSub.answers) && existingSub.answers.length > 0 && Object.keys(loadedAnswers).length === 0) {
        existingSub.answers.forEach((a, idx) => {
          const qNo = a.questionNo || (idx + 1);
          let val = a.userAnswerLetter || a.answerLetter || null;
          if (!val && a.userAnswer !== undefined && a.userAnswer !== null && a.userAnswer !== '' && a.userAnswer !== 'empty') {
            if (typeof a.userAnswer === 'number') {
              val = String.fromCharCode(65 + a.userAnswer);
            } else if (typeof a.userAnswer === 'string') {
              if (/^[A-Ea-e]$/.test(a.userAnswer.trim())) {
                val = a.userAnswer.trim().toUpperCase();
              } else if (!isNaN(Number(a.userAnswer))) {
                val = String.fromCharCode(65 + Number(a.userAnswer));
              }
            }
          }
          if (val) loadedAnswers[qNo] = val;
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

      if (existingSub.mistakeReasons && typeof existingSub.mistakeReasons === 'object') {
        setMistakeReasons(existingSub.mistakeReasons);
      }

      const calculated = calculateTestResults(loadedAnswers || answers);
      setResults(calculated);
      initializedRef.current = true;
    } else {
      // In-progress test (not yet submitted) -> restore draft answers if available
      setIsSubmitted(false);
      setResults(null);
      let draftAnswers = {};
      try {
        const draftStr = localStorage.getItem(draftKey) || 
                         localStorage.getItem(`draft_tracked_book_test_${cleanId}_${studentId}`) ||
                         (resolvedTest?.id ? localStorage.getItem(`draft_tracked_book_test_${resolvedTest.id}_${studentId}`) : null);
        if (draftStr) {
          const parsed = JSON.parse(draftStr);
          if (parsed && typeof parsed === 'object') draftAnswers = parsed;
        }
      } catch {}
      if (Object.keys(draftAnswers).length > 0) {
        setAnswers(draftAnswers);
      }
      initializedRef.current = true;
    }
  }, [resolvedTest, resolvedHw, resolvedBook, studentId, isRetake, draftKey, cleanId, submissions, calculateTestResults]);

  // Real-time synchronization on test reset or deletion
  useEffect(() => {
    const handleCachePurged = (e) => {
      const pTestId = e?.detail?.testId;
      const tKeyStr = String(testKey);
      const resTIdStr = String(resolvedTest?.id || '');
      if (!pTestId || pTestId === tKeyStr || pTestId === resTIdStr || pTestId.includes(tKeyStr) || (resTIdStr && pTestId.includes(resTIdStr))) {
        setIsSubmitted(false);
        setResults(null);
        setAnswers({});
        try {
          localStorage.removeItem(draftKey);
          localStorage.removeItem(`${draftKey}_time`);
        } catch {}
      }
    };
    window.addEventListener('test-cache-purged', handleCachePurged);
    window.addEventListener('test-reset-cleared', handleCachePurged);
    return () => {
      window.removeEventListener('test-cache-purged', handleCachePurged);
      window.removeEventListener('test-reset-cleared', handleCachePurged);
    };
  }, [testKey, resolvedTest, draftKey]);

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
        if (cleanId) localStorage.setItem(`draft_tracked_book_test_${cleanId}_${studentId}`, JSON.stringify(updated));
        if (resolvedTest?.id) localStorage.setItem(`draft_tracked_book_test_${resolvedTest.id}_${studentId}`, JSON.stringify(updated));
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
        if (cleanId) localStorage.setItem(`draft_tracked_book_test_${cleanId}_${studentId}`, JSON.stringify(updated));
        if (resolvedTest?.id) localStorage.setItem(`draft_tracked_book_test_${resolvedTest.id}_${studentId}`, JSON.stringify(updated));
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
        if (cleanId) localStorage.setItem(`draft_tracked_book_test_${cleanId}_${studentId}`, JSON.stringify(updated));
        if (resolvedTest?.id) localStorage.setItem(`draft_tracked_book_test_${resolvedTest.id}_${studentId}`, JSON.stringify(updated));
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
      const newSubId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const fullTestTitle = `${resolvedBook?.title || 'Kitap'} — ${resolvedSubject || 'Türkçe'} › ${resolvedUnit || resolvedTopic || '1. Ünite'} (${resolvedTest.name})`;
      await addSubmission({
        id: newSubId,
        testId: resolvedTest.id,
        realTestId: resolvedTest.id,
        bookTestId: resolvedTest.id,
        bookId: resolvedBook?.id,
        bookTitle: resolvedBook?.title || 'Kitap',
        subject: resolvedSubject || resolvedBook?.subject || 'Türkçe',
        subjectName: resolvedSubject || resolvedBook?.subject || 'Türkçe',
        topicName: resolvedUnit || resolvedTopic || '1. Ünite',
        unitTopic: resolvedUnit || resolvedTopic || '1. Ünite',
        testName: resolvedTest.name,
        testTitle: fullTestTitle,
        title: resolvedTest.name,
        fullTitle: fullTestTitle,
        hwId: resolvedHw?.id || null,
        studentId: studentId,
        score: calculated.net,
        scorePercentage: calculated.scorePct,
        status: 'completed',
        correctCount: calculated.correct,
        wrongCount: calculated.wrong,
        blankCount: calculated.blank,
        totalQuestions: calculated.totalQuestions,
        answers: [
          ...answersList,
          {
            type: 'metadata',
            realId: newSubId,
            submissionId: newSubId,
            realTestId: resolvedTest.id,
            bookTestId: resolvedTest.id,
            bookTitle: resolvedBook?.title || 'Kitap',
            subjectName: resolvedSubject || resolvedBook?.subject || 'Türkçe',
            topicName: resolvedUnit || resolvedTopic || '1. Ünite',
            unitTopic: resolvedUnit || resolvedTopic || '1. Ünite',
            testName: resolvedTest.name,
            testTitle: fullTestTitle,
            totalQuestions: calculated.totalQuestions,
            totalNet: calculated.net,
            sourceType: 'trackedBook'
          }
        ],
        studentAnswers: answers,
        mistakeReasons: mistakeReasons,
        sourceType: 'trackedBook',
        typeKey: 'book'
      });
    } catch (e) {
      console.error("Evaluation submission error", e);
    }

    // 2. Save to HomeworkContext if this test was assigned as homework
    if (resolvedHw) {
      try {
        const fullTestTitle = `${resolvedBook?.title || 'Kitap'} — ${resolvedSubject || 'Türkçe'} › ${resolvedUnit || resolvedTopic || '1. Ünite'} (${resolvedTest.name})`;
        await submitHomework(resolvedHw.id, studentId, calculated.net, calculated.totalQuestions, {
          testId: resolvedTest.id,
          bookTestId: resolvedTest.id,
          testName: resolvedTest.name,
          testTitle: fullTestTitle,
          subjectName: resolvedSubject || resolvedBook?.subject || 'Türkçe',
          topicName: resolvedUnit || resolvedTopic || '1. Ünite',
          unitTopic: resolvedUnit || resolvedTopic || '1. Ünite',
          studentAnswers: answers,
          correctCount: calculated.correct,
          wrongCount: calculated.wrong,
          blankCount: calculated.blank,
          totalQuestions: calculated.totalQuestions
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

  const { resolvedSubject, resolvedUnit, resolvedTopic } = useMemo(() => {
    let subj = null;
    let unit = null;
    let topic = null;

    if (resolvedBook?.subjects && Array.isArray(resolvedBook.subjects)) {
      for (const s of resolvedBook.subjects) {
        if (resolvedTest?.subjectId && String(s.id) === String(resolvedTest.subjectId)) {
          subj = s.name;
        }
        if (s.topics && Array.isArray(s.topics)) {
          for (const tp of s.topics) {
            const hasTest = String(tp.id) === String(resolvedTest?.topicId) || (tp.tests && Array.isArray(tp.tests) && tp.tests.some(t => String(t.id) === String(resolvedTest?.id) || toUUID(t.id) === String(resolvedTest?.id)));
            if (hasTest) {
              if (!subj) subj = s.name;
              topic = tp.name;
              break;
            }
          }
        }
        if (s.units && Array.isArray(s.units)) {
          for (const u of s.units) {
            const hasTest = String(u.id) === String(resolvedTest?.unitId) || (u.tests && Array.isArray(u.tests) && u.tests.some(t => String(t.id) === String(resolvedTest?.id)));
            if (hasTest) {
              if (!subj) subj = s.name;
              unit = u.name;
              break;
            }
          }
        }
        if (s.tests && Array.isArray(s.tests) && s.tests.some(t => String(t.id) === String(resolvedTest?.id))) {
          if (!subj) subj = s.name;
        }
      }
    }

    const finalSubj = subj || resolvedTest?.subject || resolvedBook?.subject || 'Ders';
    const finalUnit = unit || resolvedTest?.unit || resolvedTest?.unitName || topic || resolvedTest?.topic || resolvedTest?.topicName || '';

    return {
      resolvedSubject: finalSubj,
      resolvedUnit: finalUnit,
      resolvedTopic: topic || resolvedTest?.topic || ''
    };
  }, [resolvedBook, resolvedTest]);

  const subjectName = resolvedSubject;
  
  const explicitOptionCount = Number(
    resolvedTest?.optionCount ||
    resolvedBook?.optionCount ||
    resolvedHw?.optionCount
  );

  const answerKeyHasE = Boolean(
    resolvedTest?.answerKey && (
      Array.isArray(resolvedTest.answerKey) 
        ? resolvedTest.answerKey.some(v => String(v || '').trim().toUpperCase() === 'E')
        : Object.values(resolvedTest.answerKey).some(v => String(v || '').trim().toUpperCase() === 'E')
    )
  );

  // Strict priority: 4 -> 4 options, 5 -> 5 options. Otherwise check answer key or exam type.
  const isFourOptions = explicitOptionCount === 4 ? true : (
    explicitOptionCount === 5 ? false : (
      !answerKeyHasE && !Boolean(String(resolvedBook?.title || resolvedTest?.name || '').match(/tyt|ayt|yks|lise|9\s*sınıf|10\s*sınıf|11\s*sınıf|12\s*sınıf/i))
    )
  );
  const optionsList = isFourOptions ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];

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

  const handleGoBack = useCallback(() => {
    if (returnUrl) {
      navigate(returnUrl);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else if (resolvedBook?.bookType === 'exam') {
      navigate('/student/exams');
    } else if (resolvedBook?.id) {
      navigate(`/student/books/${resolvedBook.id}`);
    } else {
      navigate('/student');
    }
  }, [returnUrl, resolvedBook, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', width: '100%', boxSizing: 'border-box', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      
      {/* ── HEADER ── */}
      <header style={{ 
        padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.25rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: 'var(--color-surface)', 
        borderBottom: '1.5px solid var(--color-border)',
        position: 'sticky', 
        top: 0, 
        zIndex: 10,
        flexShrink: 0,
        gap: '0.5rem',
        flexWrap: 'wrap',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        {/* Left: Back + Book & Test Title */}
        {saveToast && (
          <div style={{
            position: 'fixed',
            top: 66,
            right: 20,
            background: '#0f172a',
            color: '#ffffff',
            padding: '0.55rem 1rem',
            borderRadius: 10,
            fontSize: '0.78rem',
            fontWeight: 800,
            zIndex: 999,
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            animation: 'fadeIn 0.2s ease'
          }}>
            <Check size={14} color="#10b981" />
            {saveToast}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              onClick={handleGoBack}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Geri Dön"
            >
              <ArrowLeft size={isMobile ? 18 : 22} />
            </button>
            <span style={{ fontSize: '0.62rem', fontWeight: 900, background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              KİTAP TESTİ
            </span>
            <h2 style={{ 
              color: 'var(--color-text)', 
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span>{resolvedSubject}</span>
              {resolvedUnit && (
                <span style={{ color: '#0284c7', fontWeight: 800, background: 'rgba(2,132,199,0.12)', padding: '0.08rem 0.45rem', borderRadius: 6, border: '1px solid rgba(2,132,199,0.25)' }}>
                  📌 {resolvedUnit}
                </span>
              )}
              <span>• {questionCount} Soru</span>
            </span>
            {!isSubmitted && (
              <span style={{ color: '#16a34a', fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800 }}>
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
              padding: isMobile ? '0.35rem 0.75rem' : '0.4rem 1rem',
              borderRadius: '0.75rem',
              background: timeLeft < 300
                ? '#fef2f2'
                : 'var(--color-surface)',
              border: timeLeft < 300 ? '1.5px solid #fecaca' : '1.5px solid var(--color-border)',
              boxShadow: timeLeft < 300 ? '0 0 15px rgba(239, 68, 68, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.45rem' : '0.65rem',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                width: isMobile ? 24 : 28,
                height: isMobile ? 24 : 28,
                borderRadius: '50%',
                background: timeLeft < 300 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(5, 150, 105, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={isMobile ? 14 : 16} color={timeLeft < 300 ? '#dc2626' : '#059669'} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: timeLeft < 300 ? '#dc2626' : 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {timeLeft < 300 ? '⚠️ AZ KALDI' : 'SÜRE'}
                </span>
                <span style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace",
                  fontSize: isMobile ? '1rem' : '1.15rem',
                  fontWeight: 900,
                  color: timeLeft < 300 ? '#dc2626' : 'var(--color-text)',
                  letterSpacing: '0.06em',
                  marginTop: 2
                }}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
            style={{
              padding: isMobile ? '0.35rem 0.6rem' : '0.45rem 0.85rem',
              borderRadius: '0.7rem',
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
              fontWeight: 800,
              fontSize: isMobile ? '0.75rem' : '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
          >
            {isDark ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#6366f1" />}
            {!isMobile && <span>{isDark ? 'Açık' : 'Koyu'}</span>}
          </button>

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
                    borderRadius: '0.6rem', border: `1.5px solid ${effectivePdfMode === 'side' ? '#2563eb' : '#cbd5e1'}`,
                    background: effectivePdfMode === 'side' ? '#eff6ff' : '#ffffff',
                    color: effectivePdfMode === 'side' ? '#1d4ed8' : '#475569',
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
                  borderRadius: '0.6rem', border: `1.5px solid ${effectivePdfMode === 'top' ? '#2563eb' : '#cbd5e1'}`,
                  background: effectivePdfMode === 'top' ? '#eff6ff' : '#ffffff',
                  color: effectivePdfMode === 'top' ? '#1d4ed8' : '#475569',
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
                  borderRadius: '0.6rem', border: `1.5px solid ${effectivePdfMode === 'float' ? '#2563eb' : '#cbd5e1'}`,
                  background: effectivePdfMode === 'float' ? '#eff6ff' : '#ffffff',
                  color: effectivePdfMode === 'float' ? '#1d4ed8' : '#475569',
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
                  borderRadius: '0.6rem', border: `1.5px solid ${effectivePdfMode === 'hidden' ? '#fecaca' : '#cbd5e1'}`,
                  background: effectivePdfMode === 'hidden' ? '#fef2f2' : '#ffffff',
                  color: effectivePdfMode === 'hidden' ? '#dc2626' : '#64748b',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
                }}
              >
                <XIcon size={isMobile ? 13 : 14} />
                {!isMobile && 'Gizle'}
              </button>
            </div>
          )}

          {/* Optik / Cevap Formu Göster / Gizle Button */}
          <button
            onClick={() => setShowOptikForm(!showOptikForm)}
            style={{
              padding: isMobile ? '0.4rem 0.6rem' : '0.45rem 0.85rem',
              borderRadius: '0.7rem',
              background: showOptikForm ? (isOpenEnded ? 'rgba(124,58,237,0.15)' : 'rgba(37,99,235,0.15)') : 'var(--color-surface)',
              border: `1.5px solid ${showOptikForm ? (isOpenEnded ? '#7c3aed' : '#3b82f6') : 'var(--color-border)'}`,
              color: showOptikForm ? (isOpenEnded ? '#a78bfa' : '#60a5fa') : 'var(--color-text)',
              fontWeight: 800,
              fontSize: isMobile ? '0.72rem' : '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title={showOptikForm ? (isOpenEnded ? "Cevap Formunu Gizle" : "Optik Alanı Gizle") : (isOpenEnded ? "Cevap Formunu Göster" : "Optik Alanı Göster")}
          >
            {showOptikForm ? <EyeOff size={isMobile ? 13 : 15} /> : <Eye size={isMobile ? 13 : 15} />}
            <span>{showOptikForm ? (isOpenEnded ? 'Cevapları Gizle' : 'Optik Gizle') : (isOpenEnded ? 'Cevapları Göster' : 'Optik Göster')}</span>
          </button>

          {/* Drawing Canvas Button */}
          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: isMobile ? '0.4rem 0.5rem' : '0.45rem 0.85rem',
              borderRadius: '0.7rem',
              background: isDrawingOpen ? '#fffbeb' : 'var(--color-surface)',
              border: `1.5px solid ${isDrawingOpen ? '#fde68a' : 'var(--color-border)'}`,
              color: isDrawingOpen ? '#b45309' : 'var(--color-text)',
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
                boxShadow: '0 3px 10px rgba(16,185,129,0.25)'
              }}
            >
              <CheckCircle2 size={isMobile ? 14 : 16} /> 
              {!isMobile && "Testi Bitir"}
              {isMobile && "Bitir"}
            </button>
          )}

          {isSubmitted && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 900 }}>
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
          overflow: isMobile ? 'visible' : 'hidden',
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
            defaultWidth="72%"
            isFullScreen={!showOptikForm}
            onToggleDrawing={() => setIsDrawingOpen(p => !p)}
            isDrawingOpen={isDrawingOpen}
          />
        )}

        {/* Optical Area */}
        {showOptikForm && (
          <div 
            ref={opticalContainerRef}
            style={{ 
              flex: 1, 
              overflowY: isMobile ? 'visible' : 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              minWidth: 0, 
              background: 'var(--color-bg)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ maxWidth: !isSidePdf ? 960 : undefined, width: '100%', margin: !isSidePdf ? '0 auto' : undefined, padding: isMobile ? '0.75rem 0.75rem 1.5rem 0.75rem' : isSidePdf ? '0.75rem 0.95rem' : '1.25rem', display: 'flex', flexDirection: 'column', gap: isSidePdf ? '0.75rem' : '1rem', boxSizing: 'border-box' }}>
              
              {/* 1. SCORECARD HERO AFTER SUBMISSION */}
              {isSubmitted && results && (
                <div style={{ background: 'var(--color-surface)', borderRadius: '1.4rem', padding: '1.25rem 1.4rem', color: 'var(--color-text)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)', border: '1.5px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: results.scorePct >= 70 ? '#f0fdf4' : results.scorePct >= 50 ? '#fffbeb' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', border: results.scorePct >= 70 ? '1.5px solid #bbf7d0' : results.scorePct >= 50 ? '1.5px solid #fde68a' : '1.5px solid #fecaca' }}>
                        <Trophy size={26} color={results.scorePct >= 70 ? '#15803d' : results.scorePct >= 50 ? '#b45309' : '#b91c1c'} />
                      </div>
                      <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37,99,235,0.15)', border: '1px solid #3b82f6', borderRadius: 99, padding: '0.15rem 0.6rem', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#60a5fa', letterSpacing: '0.05em' }}>TEST TAMAMLANDI</span>
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>
                          {resolvedUnit ? `${resolvedUnit} › ${resolvedTest.name}` : resolvedTest.name}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Doğru */}
                      <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: '0.55rem 0.95rem', textAlign: 'center', minWidth: 68 }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#15803d', lineHeight: 1.1 }}>{results.correct}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#16a34a', letterSpacing: '0.04em', marginTop: 3 }}>DOĞRU</div>
                      </div>

                      {/* Yanlış */}
                      <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 14, padding: '0.55rem 0.95rem', textAlign: 'center', minWidth: 68 }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#b91c1c', lineHeight: 1.1 }}>{results.wrong}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#dc2626', letterSpacing: '0.04em', marginTop: 3 }}>YANLIŞ</div>
                      </div>

                      {/* Boş */}
                      <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '0.55rem 0.95rem', textAlign: 'center', minWidth: 68 }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#475569', lineHeight: 1.1 }}>{results.blank}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.04em', marginTop: 3 }}>BOŞ</div>
                      </div>

                      {/* Kontrol Bekliyor (açık uçlu, anahtarsız) */}
                      {(results.pending || 0) > 0 && (
                        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14, padding: '0.55rem 0.95rem', textAlign: 'center', minWidth: 68 }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#b45309', lineHeight: 1.1 }}>{results.pending}</div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#d97706', letterSpacing: '0.04em', marginTop: 3 }}>KONTROL</div>
                        </div>
                      )}

                      {/* Toplam Net (çoktan seçmeli) veya Yüzde (açık uçlu) */}
                      {results.isOpenEnded && !results.hasAnswerKey ? (
                        <div style={{ background: 'rgba(8,145,178,0.12)', border: '1.5px solid #67e8f9', borderRadius: 16, padding: '0.55rem 1.25rem', textAlign: 'center', minWidth: 95 }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0891b2', lineHeight: 1.1 }}>
                            {results.pending}/{results.totalQuestions}
                          </div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#0e7490', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
                            ✍️ YAZILDI
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          borderRadius: 16,
                          padding: '0.55rem 1.25rem',
                          textAlign: 'center',
                          minWidth: 95,
                          boxShadow: '0 4px 14px rgba(99,102,241,0.25)'
                        }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
                            {results.isOpenEnded ? `%${results.scorePct}` : results.net}
                          </div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#e0e7ff', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
                            {results.isOpenEnded ? '🎯 BAŞARI' : '🎯 NET'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons after submission */}
                  <div style={{ display: 'flex', gap: 10, marginTop: '1.1rem', paddingTop: '0.85rem', borderTop: '1.5px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button 
                      onClick={handleGoBack}
                      style={{ padding: '0.6rem 1.35rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.86rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 3px 10px rgba(79,70,229,0.25)', transition: 'transform 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      <Trophy size={16} /> {returnUrl ? (returnUrl.includes('/program') || returnUrl.includes('/my-program') ? '📅 Programa Dön' : (returnUrl.includes('/homeworks') ? '📝 Ödevlere Dön' : (returnUrl === '/student' ? '🏠 Panoya Dön' : 'Geri Dön'))) : (resolvedBook?.bookType === 'exam' ? 'Denemelerime Dön' : 'Kitap Testlerine Dön')}
                    </button>

                    <button
                      onClick={handleSaveAllMistakesToDb}
                      disabled={isSavingDb}
                      style={{
                        padding: '0.6rem 1.35rem',
                        borderRadius: '0.75rem',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 900,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Save size={16} /> {isSavingDb ? 'Kaydediliyor...' : '💾 Hata Analizini Veritabanına Kaydet'}
                    </button>
                  </div>
                </div>
              )}

              {/* 2. OPTICAL FORM CARD */}
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: '1.25rem',
                border: '1.5px solid var(--color-border)',
                padding: isMobile ? '0.9rem' : '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: isOpenEnded ? '#7c3aed' : '#2563eb' }} />
                    <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 900, color: 'var(--color-text)' }}>
                      {resolvedUnit ? `${resolvedUnit} › ${resolvedTest.name}` : resolvedTest.name} — {isOpenEnded ? '✍️ Açık Uçlu Yanıt Formu' : '📋 Optik Form'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      ({questionCount} Soru)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isOpenEnded ? '#7c3aed' : '#2563eb', background: isOpenEnded ? 'rgba(124,58,237,0.1)' : 'rgba(37,99,235,0.1)', padding: '0.2rem 0.6rem', borderRadius: 99 }}>
                      {answeredCount}/{questionCount} {isOpenEnded ? 'Yanıtlandı' : 'Kodlandı'} (%{Math.round((answeredCount / (questionCount || 1)) * 100)})
                    </span>
                  </div>
                </div>

                {/* Natural Question Columns Grid (Dynamic 1 or 2 Columns based on container width) */}
                {(() => {
                  const isVeryNarrow = isMobile || containerWidth < 460;
                  const isCompact = containerWidth < 680;
                  const bubbleSize = isVeryNarrow ? 30 : isCompact ? 36 : (questionColumns.length === 1 ? 42 : 38);
                  const bubbleFontSize = isVeryNarrow ? '0.8rem' : isCompact ? '0.9rem' : '1rem';

                  return (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: questionColumns.length === 1 ? '1fr' : `repeat(${questionColumns.length}, minmax(0, 1fr))`,
                      gap: isCompact ? '0.65rem' : '1rem',
                      alignItems: 'start',
                      width: '100%'
                    }}>
                      {questionColumns.map((col, colIdx) => (
                        <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '0.55rem' : '0.75rem', width: '100%', minWidth: 0 }}>
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
                              // Açık uçlu soru değerlendirmesi
                              const answerKey = resolvedTest?.answerKey || resolvedBook?.answerKey || {};
                              const rawCorrectKey = Array.isArray(answerKey)
                                ? (answerKey[idx] ?? '')
                                : (answerKey[qNo] ?? answerKey[String(qNo)] ?? '');
                              const hasKey = rawCorrectKey !== '' && rawCorrectKey !== null && rawCorrectKey !== undefined;

                              const normalizeNum = (v) => {
                                const s = String(v || '').trim().replace(/\s/g, '').replace(',', '.');
                                const n = Number(s);
                                return !isNaN(n) ? String(n) : s.toLowerCase();
                              };

                              const isOeCorrect = isSubmitted && hasKey && selected &&
                                normalizeNum(selected) === normalizeNum(rawCorrectKey);
                              const isOeWrong = isSubmitted && hasKey && selected && !isOeCorrect;
                              const isOePending = isSubmitted && !hasKey && selected;

                              return (
                                <div key={qNo} style={{
                                  background: isOeCorrect ? 'rgba(22,163,74,0.08)'
                                    : isOeWrong ? 'rgba(220,38,38,0.06)'
                                    : isOePending ? 'rgba(245,158,11,0.08)'
                                    : selected ? 'rgba(37,99,235,0.07)'
                                    : 'var(--color-surface-hover)',
                                  padding: isVeryNarrow ? '0.65rem 0.75rem' : '0.85rem 1rem',
                                  borderRadius: '1rem',
                                  border: isOeCorrect ? '1.5px solid #bbf7d0'
                                    : isOeWrong ? '1.5px solid #fecaca'
                                    : isOePending ? '1.5px solid #fde68a'
                                    : selected ? '1.5px solid #93c5fd'
                                    : '1.5px solid var(--color-border)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 6,
                                  boxSizing: 'border-box',
                                  width: '100%',
                                  transition: 'all 0.15s ease'
                                }}>
                                  {/* Soru no + durum rozeti */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {flagged[qNo] && !isSubmitted && (
                                        <Flag size={12} color="#d97706" fill="#d97706" />
                                      )}
                                      <span style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                                        {qNo}.
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      {isOeCorrect && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#15803d', background: '#f0fdf4', padding: '0.1rem 0.5rem', borderRadius: 99, border: '1px solid #bbf7d0' }}>✓ Doğru</span>
                                      )}
                                      {isOeWrong && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#b91c1c', background: '#fef2f2', padding: '0.1rem 0.5rem', borderRadius: 99, border: '1px solid #fecaca' }}>✗ Yanlış</span>
                                      )}
                                      {isOePending && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#b45309', background: '#fffbeb', padding: '0.1rem 0.5rem', borderRadius: 99, border: '1px solid #fde68a' }}>? Kontrol</span>
                                      )}
                                      {!isSubmitted && (
                                        <button
                                          onClick={() => toggleFlag(qNo)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                          title={flagged[qNo] ? 'İşareti Kaldır' : 'Soruyu İşaretle'}
                                        >
                                          <Flag size={13} color={flagged[qNo] ? '#d97706' : '#94a3b8'} fill={flagged[qNo] ? '#d97706' : 'none'} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Cevap input alanı */}
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    disabled={isSubmitted}
                                    value={selected}
                                    onChange={e => handleOpenEndedChange(qNo, e.target.value)}
                                    placeholder={isSubmitted ? (selected ? '' : '— boş —') : 'Cevap (boş bırakılabilir)'}
                                    style={{
                                      width: '100%',
                                      background: isSubmitted ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                                      border: `1.5px solid ${isOeCorrect ? '#86efac' : isOeWrong ? '#fca5a5' : 'var(--color-border-input)'}`,
                                      borderRadius: 8,
                                      padding: '0.45rem 0.65rem',
                                      color: 'var(--color-text)',
                                      fontSize: '0.95rem',
                                      fontWeight: 700,
                                      fontFamily: "'JetBrains Mono', monospace",
                                      boxSizing: 'border-box',
                                      outline: 'none',
                                      letterSpacing: '0.04em'
                                    }}
                                  />

                                  {/* Doğru cevabı göster ve AI Çözüm butonu (gönderim sonrası) */}
                                  {isSubmitted && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, flexWrap: 'wrap', gap: 6 }}>
                                      {hasKey ? (
                                        <div style={{
                                          fontSize: '0.78rem',
                                          fontWeight: 800,
                                          color: isOeCorrect ? '#15803d' : '#b91c1c',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 4
                                        }}>
                                          <span style={{ color: '#94a3b8', fontWeight: 600 }}>Doğru:</span>
                                          <span style={{ fontFamily: 'monospace' }}>{rawCorrectKey}</span>
                                        </div>
                                      ) : (
                                        <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }}>
                                          ⚠️ Cevap anahtarı girilmemiş — öğretmen kontrolünde
                                        </div>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setAiModalQuestionNo(qNo); }}
                                        style={{
                                          padding: isVeryNarrow ? '0.14rem 0.4rem' : '0.18rem 0.55rem',
                                          fontSize: isVeryNarrow ? '0.55rem' : '0.65rem',
                                          fontWeight: 900,
                                          borderRadius: 6,
                                          border: '1.5px solid #a855f7',
                                          background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.1))',
                                          color: '#7c3aed',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 3,
                                          boxShadow: '0 2px 6px rgba(168,85,247,0.2)',
                                          transition: 'all 0.15s ease'
                                        }}
                                        title={`Soru ${qNo} için yapay zeka çözümü ve soru kırpma`}
                                      >
                                        <Sparkles size={12} color="#a855f7" />
                                        <span>✨ AI Çözüm & Kırp</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={qNo} 
                                style={{
                                  background: flagged[qNo] && !isSubmitted
                                    ? '#fffbeb'
                                    : selected 
                                      ? 'rgba(37,99,235,0.12)' 
                                      : 'var(--color-surface-hover)',
                                  padding: isVeryNarrow ? '0.5rem 0.65rem' : isCompact ? '0.6rem 0.8rem' : '0.65rem 1rem',
                                  borderRadius: '1rem',
                                  border: isCorrect 
                                    ? '1.5px solid #bbf7d0' 
                                    : isWrong 
                                    ? '1.5px solid #fecaca' 
                                    : flagged[qNo] && !isSubmitted
                                    ? '1.5px solid #fde68a'
                                    : selected 
                                    ? '1.5px solid #93c5fd' 
                                    : '1.5px solid var(--color-border)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.45rem',
                                  transition: 'all 0.15s ease',
                                  boxShadow: selected ? '0 2px 8px rgba(37,99,235,0.08)' : 'none',
                                  boxSizing: 'border-box',
                                  width: '100%'
                                }}
                              >
                                {/* Top Question Row */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: isVeryNarrow ? '0.35rem' : '0.65rem' }}>
                                  {/* Question Number Badge & Flag */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: isVeryNarrow ? 3 : 5, minWidth: isVeryNarrow ? 44 : 64, flexShrink: 0 }}>
                                    <div style={{
                                      width: isVeryNarrow ? 24 : 30,
                                      height: isVeryNarrow ? 24 : 30,
                                      borderRadius: '0.5rem',
                                      background: selected ? '#2563eb' : 'var(--color-surface)',
                                      color: selected ? '#ffffff' : 'var(--color-text)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 900,
                                      fontSize: isVeryNarrow ? '0.74rem' : '0.84rem',
                                      border: selected ? 'none' : '1.5px solid var(--color-border-input)',
                                      boxShadow: selected ? '0 2px 6px rgba(37,99,235,0.25)' : 'none'
                                    }}>
                                      {qNo}
                                    </div>

                                    {!isSubmitted && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleFlag(qNo); }}
                                        title={flagged[qNo] ? "İşareti Kaldır" : "Şüpheli/İncele Olarak İşaretle"}
                                        style={{
                                          background: flagged[qNo] ? '#fffbeb' : 'transparent',
                                          border: flagged[qNo] ? '1px solid #fde68a' : 'none',
                                          borderRadius: '0.4rem',
                                          padding: isVeryNarrow ? '1px' : '3px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: flagged[qNo] ? '#d97706' : '#94a3b8'
                                        }}
                                      >
                                        <Flag size={isVeryNarrow ? 11 : 13} fill={flagged[qNo] ? '#d97706' : 'none'} />
                                      </button>
                                    )}

                                    {isSubmitted && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                        <span style={{ fontSize: isVeryNarrow ? '0.65rem' : '0.72rem', fontWeight: 900, color: isCorrect ? '#15803d' : isWrong ? '#b91c1c' : '#64748b' }}>
                                          {isCorrect ? '✓' : isWrong ? `(${correctKey})` : `(Boş)`}
                                        </span>
                                        {isCorrect && (
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setAiModalQuestionNo(qNo); }}
                                            style={{
                                              padding: isVeryNarrow ? '0.1rem 0.3rem' : '0.14rem 0.45rem',
                                              fontSize: isVeryNarrow ? '0.52rem' : '0.62rem',
                                              fontWeight: 900,
                                              borderRadius: 6,
                                              border: '1.5px solid #a855f7',
                                              background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.1))',
                                              color: '#7c3aed',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 2,
                                              boxShadow: '0 2px 6px rgba(168,85,247,0.15)',
                                              transition: 'all 0.15s ease'
                                            }}
                                            title={`Soru ${qNo} için yapay zeka çözümü`}
                                          >
                                            <Sparkles size={10} color="#a855f7" />
                                            <span>AI</span>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Option Bubbles */}
                                  <div style={{ display: 'flex', gap: isVeryNarrow ? '0.2rem' : isCompact ? '0.35rem' : '0.45rem', flex: 1, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'nowrap' }}>
                                    {optionsList.map((opt) => {
                                      const isSelected = selected === opt;
                                      const isThisOptCorrect = isSubmitted && correctKey === opt;

                                      let bubbleBg = 'var(--color-surface)';
                                      let bubbleBorder = '1.5px solid var(--color-border-input)';
                                      let bubbleColor = 'var(--color-text)';
                                      let bubbleShadow = 'none';

                                      if (isSelected) {
                                        bubbleBg = '#2563eb';
                                        bubbleBorder = '2px solid #1d4ed8';
                                        bubbleColor = '#ffffff';
                                        bubbleShadow = '0 2px 8px rgba(37,99,235,0.3)';
                                      }

                                      if (isSubmitted) {
                                        if (isThisOptCorrect) {
                                          bubbleBg = '#16a34a';
                                          bubbleBorder = '2px solid #15803d';
                                          bubbleColor = '#ffffff';
                                          bubbleShadow = '0 2px 8px rgba(22,163,74,0.3)';
                                        } else if (isSelected && !isThisOptCorrect) {
                                          bubbleBg = '#dc2626';
                                          bubbleBorder = '2px solid #b91c1c';
                                          bubbleColor = '#ffffff';
                                          bubbleShadow = '0 2px 8px rgba(220,38,38,0.3)';
                                        }
                                      }

                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          disabled={isSubmitted}
                                          onClick={() => handleSelectOption(qNo, opt)}
                                          style={{
                                            width: bubbleSize,
                                            height: bubbleSize,
                                            borderRadius: '50%',
                                            fontWeight: 900,
                                            fontSize: bubbleFontSize,
                                            cursor: isSubmitted ? 'default' : 'pointer',
                                            border: bubbleBorder,
                                            background: bubbleBg,
                                            color: bubbleColor,
                                            transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: bubbleShadow,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 0,
                                            flexShrink: 0
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
                                          width: isVeryNarrow ? 20 : 24,
                                          height: isVeryNarrow ? 20 : 24,
                                          borderRadius: '50%',
                                          background: selected ? '#fef2f2' : 'transparent',
                                          border: selected ? '1px solid #fecaca' : 'none',
                                          color: selected ? '#dc2626' : 'transparent',
                                          cursor: selected ? 'pointer' : 'default',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          pointerEvents: selected ? 'auto' : 'none',
                                          transition: 'all 0.12s ease',
                                          marginLeft: 1,
                                          padding: 0,
                                          flexShrink: 0
                                        }}
                                      >
                                        <XIcon size={isVeryNarrow ? 10 : 12} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Mistake Diagnostic Selector & AI Button */}
                                {isSubmitted && (isWrong || !selected) && (
                                  <div style={{
                                    width: '100%',
                                    marginTop: '0.45rem',
                                    paddingTop: '0.45rem',
                                    borderTop: isWrong ? '1px dashed #fecaca' : '1px dashed #cbd5e1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '0.35rem'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '0.66rem', fontWeight: 800, color: isWrong ? '#b91c1c' : '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {isWrong ? '🤔 Yanlış Sebebi:' : '○ Boş Sebebi:'}
                                      </span>
                                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                        {MISTAKE_REASON_OPTIONS.map(r => {
                                          const isSelected = mistakeReasons[qNo] === r.label;
                                          return (
                                            <button
                                              key={r.label}
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); handleSetMistakeReason(qNo, r.label); }}
                                              style={{
                                                padding: isVeryNarrow ? '0.12rem 0.35rem' : '0.18rem 0.5rem',
                                                fontSize: isVeryNarrow ? '0.55rem' : '0.62rem',
                                                fontWeight: 800,
                                                borderRadius: 6,
                                                border: `1.5px solid ${isSelected ? r.color : r.border}`,
                                                background: isSelected ? r.color : r.bg,
                                                color: isSelected ? '#ffffff' : r.color,
                                                cursor: 'pointer',
                                                boxShadow: isSelected ? `0 2px 6px ${r.color}33` : 'none',
                                                transition: 'all 0.15s'
                                              }}
                                              title={`Soru ${qNo} için sebebi "${r.label}" olarak kaydet`}
                                            >
                                              {r.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* ✂️ AI Soru Çözümü & Kırpma Butonu */}
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setAiModalQuestionNo(qNo); }}
                                      style={{
                                        padding: isVeryNarrow ? '0.16rem 0.45rem' : '0.2rem 0.6rem',
                                        fontSize: isVeryNarrow ? '0.58rem' : '0.66rem',
                                        fontWeight: 900,
                                        borderRadius: 6,
                                        border: '1.5px solid #a855f7',
                                        background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.1))',
                                        color: '#7c3aed',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        boxShadow: '0 2px 6px rgba(168,85,247,0.2)',
                                        transition: 'all 0.15s ease'
                                      }}
                                      title={`Soru ${qNo} için yapay zeka çözümü ve soru kırpma`}
                                    >
                                      <Sparkles size={12} color="#a855f7" />
                                      <span>✨ AI Çözüm & Kırp</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })()}
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
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center', padding: '2rem', background: 'var(--color-surface)', borderRadius: '1.5rem', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text)', margin: '1rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <CheckCircle2 size={30} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)' }}>Testi Bitiriyorsunuz</h3>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {answeredCount}/{questionCount} soru işaretlediniz. Testi tamamlayıp sonuçlarınızı kaydetmek istiyor musunuz?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setShowFinishModal(false)}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Geri Dön
              </button>
              <button 
                onClick={() => handleSubmit(true)}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)' }}
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
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '3.5rem',
            height: '3.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
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
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }} onClick={() => setShowMobileOpticModal(false)}>
          <div style={{
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '1.5rem 1.5rem 0 0',
            maxHeight: '85vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -10px 35px rgba(0,0,0,0.15)',
            borderTop: '1.5px solid #e2e8f0'
          }} onClick={e => e.stopPropagation()}>

            <div style={{
              padding: '0.9rem 1.25rem',
              background: '#ffffff',
              borderBottom: '1.5px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                  📝 {resolvedTest.name}
                </h3>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>
                  {answeredCount}/{questionCount} soru kodlandı
                </p>
              </div>

              {!isSubmitted && !isTeacherReviewing && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: timeLeft < 300 ? '#fef2f2' : '#f8fafc',
                  border: timeLeft < 300 ? '1.5px solid #fecaca' : '1.5px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  padding: '0.35rem 0.75rem'
                }}>
                  <Clock size={15} color={timeLeft < 300 ? '#dc2626' : '#059669'} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: '1.05rem',
                    fontWeight: 900,
                    color: timeLeft < 300 ? '#dc2626' : '#0f172a'
                  }}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}

              <button
                onClick={() => setShowMobileOpticModal(false)}
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: '50%',
                  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#475569'
                }}
              >
                <XIcon size={18} />
              </button>
            </div>

            <div style={{ padding: '0.85rem', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {Array.from({ length: questionCount }).map((_, idx) => {
                  const qNo = idx + 1;
                  const selected = answers[qNo] || answers[String(qNo)] || '';

                  return (
                    <div 
                      key={qNo} 
                      style={{ 
                        background: selected ? '#eff6ff' : '#ffffff', 
                        padding: '0.55rem 0.85rem', 
                        borderRadius: '0.85rem', 
                        border: selected ? '1.5px solid #93c5fd' : '1.5px solid #e2e8f0', 
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
                          background: selected ? '#2563eb' : '#ffffff',
                          color: selected ? '#ffffff' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '0.8rem',
                          border: selected ? 'none' : '1.5px solid #cbd5e1'
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
                                border: isSelected ? '2px solid #1d4ed8' : '1.5px solid #cbd5e1',
                                background: isSelected ? '#2563eb' : '#ffffff',
                                color: isSelected ? 'white' : '#334155',
                                transition: 'all 0.12s ease',
                                boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
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
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
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

            <div style={{ padding: '0.75rem 1.25rem', background: '#ffffff', borderTop: '1.5px solid #e2e8f0' }}>
              <button
                onClick={() => setShowMobileOpticModal(false)}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: 'white', border: 'none', fontWeight: 900, fontSize: '0.9rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 3px 10px rgba(37,99,235,0.25)'
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
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(37,99,235,0.35)',
            border: 'none',
            zIndex: 9999,
            cursor: 'pointer'
          }}
          title="Optik Formu Aç"
        >
          <FileSpreadsheet size={24} />
        </button>
      )}

      {/* ── AI SCREEN SNIPPER & SOLVER MODAL ── */}
      {aiModalQuestionNo && (() => {
        const targetQNo = aiModalQuestionNo;
        const targetQIdx = targetQNo - 1;
        const rawUserAns = answers[targetQNo] || answers[String(targetQNo)] || '';
        const answerKey = resolvedTest?.answerKey || resolvedBook?.answerKey || {};
        const rawKeyVal = Array.isArray(answerKey) ? (answerKey[targetQIdx] ?? '') : (answerKey[targetQNo] ?? answerKey[String(targetQNo)] ?? '');
        const studentAns = rawUserAns || 'Boş';
        const correctAns = rawKeyVal || '';

        return (
          <ScreenSnipperAndSolverModal
            isOpen={Boolean(aiModalQuestionNo)}
            onClose={() => setAiModalQuestionNo(null)}
            questionNo={targetQNo}
            question={{
              questionNo: targetQNo,
              userAnswer: rawUserAns || null,
              correctAnswerLetter: rawKeyVal || null,
              userAnswerText: rawUserAns || ''
            }}
            mistakeReason={mistakeReasons[targetQNo] || ''}
            onMistakeReasonChange={(r) => handleSetMistakeReason(targetQNo, r)}
            studentAnswer={studentAns}
            correctAnswer={correctAns}
            subject={resolvedBook?.subject || 'Genel'}
            topic={resolvedUnit ? `${resolvedUnit} - ${resolvedTest?.name || ''}` : (resolvedTest?.name || '')}
            testId={cleanId}
          />
        );
      })()}

    </div>
  );
}
