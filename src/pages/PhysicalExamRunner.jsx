import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useAuth } from '../context/AuthContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { toUUID } from '../services/supabaseService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { sortSubjectsByTeacherOrder } from '../utils/answerEvaluation';
import ResizablePdfPanel from '../components/ResizablePdfPanel';
import DrawingCanvas from '../components/quiz/common/DrawingCanvas';
import { 
  ArrowLeft, CheckCircle2, AlertCircle, Clock, 
  Send, X as XIcon, LayoutTemplate, Trophy, BarChart3, ListTree, 
  ChevronRight, ChevronDown, ChevronUp, FileText, PanelLeft, PanelTop, Maximize2,
  EyeOff, Eye, Pencil, FileSpreadsheet, Flag, BookOpen, Play, Cloud, ShieldCheck, Sparkles, Check, Save
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

export default function PhysicalExamRunner() {
  const { hwId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { homeworks, submitHomework } = useHomework();
  const { books, bookTests } = useTrackedBooks();
  const { currentUser } = useAuth();
  const { submissions: evalSubmissions, addSubmission, updateSubmission } = useEvaluation();
  const { users } = useUser();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Optional: Extract studentId from URL if teacher is viewing, otherwise use currentUser
  const queryParams = new URLSearchParams(window.location.search);
  const paramStudentId = queryParams.get('studentId');
  const isRetake = queryParams.get('retake') === 'true';
  const returnUrl = location.state?.from || location.state?.returnUrl || queryParams.get('from');
  const studentId = paramStudentId || currentUser?.id;

  const handleGoBack = () => {
    if (returnUrl) {
      navigate(returnUrl);
    } else {
      navigate(-1);
    }
  };

  const currentViewingStudent = users.find(u => u.id === studentId);
  const isTeacherReviewing = currentUser?.role !== 'student' && paramStudentId && paramStudentId !== currentUser?.id;
  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin' || currentUser?.role === 'coordinator' || isTeacherReviewing;

  const homework = useMemo(() => {
    const cleanId = String(hwId || '');
    const matchedSub = (evalSubmissions || []).find(s => String(s.id) === cleanId || String(s.submissionId) === cleanId || (toUUID(s.id) && toUUID(s.id) === cleanId));
    const effectiveHwId = matchedSub?.hwId || matchedSub?.bookId || matchedSub?.testId || cleanId;

    let hw = (homeworks || []).find(h => String(h.id) === String(effectiveHwId) || toUUID(h.id) === String(effectiveHwId) || String(h.id) === cleanId);
    
    // Find matching book in books (e.g. physical exam created from ExamManager)
    const matchingBook = (books || []).find(b => 
      String(b.id) === String(effectiveHwId) || 
      toUUID(b.id) === String(effectiveHwId) || 
      String(b.id) === cleanId || 
      toUUID(b.id) === cleanId || 
      String(b.id) === String(hw?.bookId) || 
      toUUID(b.id) === String(hw?.bookId)
    );

    const pdfUrl = hw?.pdfUrl || matchingBook?.pdfUrl || hw?.pdfPayload || '';

    // Extract subjects and answerKeys from bookTests if available
    const testsForBook = (bookTests || []).filter(t => {
      if (!t) return false;
      const tBId = String(t.bookId || t.book_id || '');
      return tBId === String(matchingBook?.id) || (toUUID(matchingBook?.id) && tBId === toUUID(matchingBook?.id));
    });

    const builtAnswerKey = {};
    const subjectArray = [];
    if (testsForBook.length > 0) {
      testsForBook.forEach(t => {
        const subDef = (matchingBook?.subjects || []).find(s => s && (String(s.id) === String(t.subjectId || t.subject_id)));
        const subName = subDef ? subDef.name : String(t.name || 'Ders').replace(' Testi', '');
        builtAnswerKey[subName] = [];
        if (t.answerKey && typeof t.answerKey === 'object') {
          for (let i = 1; i <= (t.questionCount || 20); i++) {
            builtAnswerKey[subName].push(t.answerKey[i] || '');
          }
        }
        subjectArray.push({ name: subName, count: Number(t.questionCount) || 20, testId: t.id, subjectId: t.subjectId || t.subject_id });
      });
    }

    // Determine teacher's intended subjects list (source of truth for ordering)
    const validBookSubs = (Array.isArray(matchingBook?.subjects) ? matchingBook.subjects : [])
      .filter(s => s && s.id !== '__book_meta__' && s.__meta !== true && (s.name || typeof s === 'string'));

    const rawTeacherSubs = (Array.isArray(hw?.subjects) && hw.subjects.length > 0 ? hw.subjects : validBookSubs)
      .filter(s => s && s.id !== '__book_meta__' && s.__meta !== true && (s.name || typeof s === 'string'));

    const teacherSubs = sortSubjectsByTeacherOrder(rawTeacherSubs, validBookSubs);

    let subs = [];
    if (teacherSubs.length > 0) {
      // Use teacher's explicit order
      subs = teacherSubs.map((s, idx) => {
        const sName = typeof s === 'string' ? s : (s.name || `Ders ${idx + 1}`);
        const sId = typeof s === 'object' ? String(s.id || '') : '';
        const matchedTest = testsForBook.find(t => {
          if (sId && String(t.subjectId || t.subject_id) === sId) return true;
          const tSubName = String(t.name || '').replace(' Testi', '').trim();
          return tSubName.toLowerCase() === sName.toLowerCase() || String(t.name || '').toLowerCase().includes(sName.toLowerCase());
        });
        const count = Number((typeof s === 'object' ? (s.count || s.questionCount) : null) || matchedTest?.questionCount || 20);
        return {
          ...(typeof s === 'object' ? s : {}),
          name: sName,
          count: count,
          testId: matchedTest?.id || (typeof s === 'object' ? s.testId : null)
        };
      });
    } else if (subjectArray.length > 0) {
      // If no teacher-defined subjects array, sort subjectArray by canonical curriculum order
      subs = sortSubjectsByTeacherOrder(subjectArray, []);
    } else {
      subs = [
        { name: 'Türkçe', count: 20 },
        { name: 'Matematik', count: 20 },
        { name: 'Fen Bilimleri', count: 20 },
        { name: 'Sosyal Bilgiler', count: 20 }
      ];
    }

    if (!hw && matchingBook) {
      // Synthetic homework object from tracked book exam
      const combinedAnsKey = { ...(matchingBook.answerKey || {}), ...builtAnswerKey };

      return {
        id: matchingBook.id,
        title: matchingBook.title || 'Fiziki Deneme',
        examType: matchingBook.publisher || 'LGS / YKS',
        type: 'physicalExam',
        optionCount: matchingBook.optionCount || (matchingBook.publisher === 'LGS' ? 4 : 5),
        timePerQuestion: Number(matchingBook.timePerQuestion) || 2,
        subjects: subs.map((s, idx) => ({
          ...s,
          name: s.name || `Ders ${idx + 1}`,
          count: Number(s.count) || Number(s.questionCount) || 20
        })),
        answerKey: combinedAnsKey,
        penaltyRatio: matchingBook.penaltyRatio !== undefined ? matchingBook.penaltyRatio : 3,
        totalQuestions: subs.reduce((acc, s) => acc + (Number(s.count) || Number(s.questionCount) || 20), 0) || 90,
        pdfUrl: pdfUrl
      };
    }

    if (hw) {
      const combinedAnsKey = { ...(matchingBook?.answerKey || {}), ...(hw.answerKey || {}), ...builtAnswerKey };

      return {
        ...hw,
        type: 'physicalExam',
        pdfUrl: pdfUrl,
        optionCount: hw.optionCount || matchingBook?.optionCount || (hw.examType === 'LGS' ? 4 : 5),
        timePerQuestion: Number(hw.timePerQuestion || matchingBook?.timePerQuestion) || 2,
        subjects: subs.map((s, idx) => ({
          ...s,
          name: s.name || `Ders ${idx + 1}`,
          count: Number(s.count) || Number(s.questionCount) || 20
        })),
        answerKey: combinedAnsKey,
        penaltyRatio: hw.penaltyRatio !== undefined ? hw.penaltyRatio : (matchingBook?.penaltyRatio !== undefined ? matchingBook.penaltyRatio : 3),
        totalQuestions: hw.totalQuestions || subs.reduce((acc, s) => acc + (Number(s.count) || Number(s.questionCount) || 20), 0) || 90
      };
    }

    return null;
  }, [homeworks, books, bookTests, evalSubmissions, hwId]);

  const hasPdf = Boolean(homework?.pdfUrl);

  // PDF modes: 'side' | 'top' | 'float' | 'hidden'
  const [pdfMode, setPdfMode] = useState(() => hasPdf ? (isMobile ? 'top' : 'side') : 'hidden');
  const [showOptikForm, setShowOptikForm] = useState(true);
  const [showMobileOpticModal, setShowMobileOpticModal] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const effectivePdfMode = (isMobile && pdfMode === 'side') ? 'top' : pdfMode;
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);

  const isSubmittingRef = useRef(false);
  
  const draftKey = `draft_physical_exam_${hwId}_${studentId}`;

  // Student answers state: { "Türkçe": ["A", "B", "", "C", ...], "Matematik": [...] }
  const [answers, setAnswers] = useState(() => {
    try {
      const draftStr = localStorage.getItem(`draft_physical_exam_${hwId}_${studentId}`);
      if (draftStr) {
        const parsed = JSON.parse(draftStr);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [savedFeedbackToast, setSavedFeedbackToast] = useState(null);
  const [showMistakeSummary, setShowMistakeSummary] = useState(true);
  const [flagged, setFlagged] = useState({});

  const toggleFlag = (subjectName, qNo) => {
    const key = `${subjectName}_${qNo}`;
    setFlagged(p => ({ ...p, [key]: !p[key] }));
  };

  // Mistake reasons state: { "Türkçe_1": "⚡ İşlem Hatası", "Matematik_1": "⚠️ Dikkat Kaybı", ... }
  const [mistakeReasons, setMistakeReasons] = useState(() => {
    try {
      const saved = localStorage.getItem(`mistake_reasons_${hwId}_${studentId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const cleaned = {};
          Object.entries(parsed).forEach(([k, v]) => {
            if (k && k.includes('_')) cleaned[k] = v;
          });
          return cleaned;
        }
      }
    } catch {}
    return {};
  });

  const handleSetMistakeReason = useCallback((subjectName, qNo, reason) => {
    const key = `${subjectName}_${qNo}`;
    const next = {
      ...mistakeReasons,
      [key]: mistakeReasons[key] === reason ? null : reason
    };

    setMistakeReasons(next);

    try {
      localStorage.setItem(`mistake_reasons_${hwId}_${studentId}`, JSON.stringify(next));
    } catch {}

    const hwSub = (homework?.submissions || []).find(s => String(s.studentId) === String(studentId));
    const evalSub = (evalSubmissions || []).find(s => (String(s.hwId) === String(hwId) || String(s.testId) === String(hwId)) && String(s.studentId) === String(studentId));
    const subTarget = hwSub || evalSub;
    if (subTarget?.id && updateSubmission) {
      updateSubmission(subTarget.id, { mistakeReasons: next });
    }

    setSavedFeedbackToast(`${subjectName} Soru ${qNo} için "${reason}" kaydedildi ✓`);
    setTimeout(() => setSavedFeedbackToast(null), 2200);
  }, [mistakeReasons, hwId, studentId, homework, evalSubmissions, updateSubmission]);

  const [isSavingDb, setIsSavingDb] = useState(false);

  const handleSaveAllMistakesToDb = async () => {
    setIsSavingDb(true);
    try {
      localStorage.setItem(`mistake_reasons_${hwId}_${studentId}`, JSON.stringify(mistakeReasons));
      const hwSub = (homework?.submissions || []).find(s => String(s.studentId) === String(studentId));
      const evalSub = (evalSubmissions || []).find(s => (String(s.hwId) === String(hwId) || String(s.testId) === String(hwId)) && String(s.studentId) === String(studentId));
      const subTarget = hwSub || evalSub;
      if (subTarget?.id && updateSubmission) {
        await updateSubmission(subTarget.id, { mistakeReasons: mistakeReasons });
      }
      setSavedFeedbackToast('✓ Tüm hata analizleri veritabanına başarıyla kaydedildi!');
    } catch (e) {
      console.error(e);
      setSavedFeedbackToast('✓ Hata analizi sisteme kaydedildi!');
    } finally {
      setIsSavingDb(false);
      setTimeout(() => setSavedFeedbackToast(null), 3000);
    }
  };

  // Start Screen State (exam doesn't count down or start until student presses "Sınava Başla")
  const [isStarted, setIsStarted] = useState(() => {
    if (isTeacherReviewing || isRetake) return true;
    try {
      const started = localStorage.getItem(`${draftKey}_started`);
      if (started === 'true') return true;
      const draftStr = localStorage.getItem(draftKey);
      if (draftStr) {
        const parsed = JSON.parse(draftStr);
        if (parsed && typeof parsed === 'object') {
          const hasAnswers = Object.values(parsed).some(arr => Array.isArray(arr) && arr.some(Boolean));
          if (hasAnswers) return true;
        }
      }
    } catch {}
    return false;
  });

  const handleStartExam = () => {
    setIsStarted(true);
    try {
      localStorage.setItem(`${draftKey}_started`, 'true');
    } catch {}
  };

  // Timer state
  const durationMinutes = (homework?.timePerQuestion || 2) * (homework?.totalQuestions || 90);
  const totalSeconds = durationMinutes * 60 || 5400;

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

  // Calculate results based on a given answers map (or current state)
  const calculateResults = useCallback((answersToCalc) => {
    if (!homework) return null;
    const targetAnswers = answersToCalc || answers;
    const penaltyRatio = homework.penaltyRatio !== undefined ? homework.penaltyRatio : 3;
    let grandTotalCorrect = 0;
    let grandTotalWrong = 0;
    let grandTotalBlank = 0;
    const subjectStats = [];

    const subs = homework.subjects || [];
    subs.forEach(sub => {
      let correct = 0;
      let wrong = 0;
      let blank = 0;
      
      const subAns = targetAnswers[sub.name] || [];
      const subKey = homework.answerKey?.[sub.name] || [];

      for (let i = 0; i < sub.count; i++) {
        const a = subAns[i];
        const k = subKey[i];
        if (!a) {
          blank++;
        } else if (a === k) {
          correct++;
        } else {
          wrong++;
        }
      }

      const rawNet = correct - (penaltyRatio > 0 ? wrong / penaltyRatio : 0);
      const net = Math.max(0, Number(rawNet.toFixed(2)));

      grandTotalCorrect += correct;
      grandTotalWrong += wrong;
      grandTotalBlank += blank;
      
      subjectStats.push({
        name: sub.name,
        correct,
        wrong,
        blank,
        net,
        count: sub.count
      });
    });

    const rawTotalNet = grandTotalCorrect - (penaltyRatio > 0 ? grandTotalWrong / penaltyRatio : 0);
    const totalNet = Number(rawTotalNet.toFixed(2));

    return {
      subjectStats,
      totalNet,
      totalCorrect: grandTotalCorrect,
      totalWrong: grandTotalWrong,
      totalBlank: grandTotalBlank
    };
  }, [homework]);

  const initializedRef = useRef(false);

  // Load existing submission or draft
  useEffect(() => {
    if (!homework || initializedRef.current) return;

    if (isRetake) {
      localStorage.removeItem(draftKey);
      localStorage.removeItem(`${draftKey}_time`);
      localStorage.removeItem(`${draftKey}_started`);
      const init = {};
      homework.subjects?.forEach(sub => {
        init[sub.name] = Array(sub.count).fill('');
      });
      setAnswers(init);
      setIsSubmitted(false);
      setResults(null);
      setIsStarted(true);
      initializedRef.current = true;
      return;
    }

    // Check if already submitted in HomeworkContext or EvaluationContext
    const cleanHwId = String(hwId || '');
    const hwSub = (homework.submissions || []).find(s => String(s.studentId) === String(studentId));
    const evalSub = (evalSubmissions || []).find(s => (
      String(s.id) === cleanHwId ||
      String(s.submissionId) === cleanHwId ||
      String(s.hwId) === cleanHwId ||
      String(s.testId) === cleanHwId ||
      String(s.bookId) === cleanHwId ||
      String(s.bookTestId) === cleanHwId ||
      (homework.id && (String(s.hwId) === String(homework.id) || String(s.testId) === String(homework.id) || String(s.bookId) === String(homework.id)))
    ) && (!studentId || String(s.studentId) === String(studentId)));
    const submission = location.state?.submission || hwSub || evalSub;

    if (submission) {
      setIsSubmitted(true);
      setShowOptikForm(true);
      
      const subMeta = (submission?.answers && Array.isArray(submission.answers)) ? submission.answers.find(a => a?.type === 'metadata') : {};
      const evalMeta = (evalSub?.answers && Array.isArray(evalSub.answers)) ? evalSub.answers.find(a => a?.type === 'metadata') : {};

      let loadedAns = submission.studentAnswers || hwSub?.studentAnswers || evalSub?.studentAnswers || subMeta?.studentAnswers || evalMeta?.studentAnswers;
      if (!loadedAns || Object.keys(loadedAns).length === 0) {
        if (Array.isArray(submission.answers) && submission.answers.length > 0) {
          loadedAns = {};
          homework.subjects?.forEach(sub => {
            loadedAns[sub.name] = Array(sub.count).fill('');
          });
          submission.answers.forEach(a => {
            if (!a || a.type === 'metadata') return;
            const subName = a.subject || a.subjectName || (homework.subjects?.[0]?.name);
            const qNum = Number(a.questionNo || a.qNum || a.questionIndex) || 1;
            const ansVal = a.userAnswer ?? a.selectedOption ?? a.answer ?? '';
            if (subName && loadedAns[subName] && qNum >= 1 && qNum <= loadedAns[subName].length) {
              loadedAns[subName][qNum - 1] = (ansVal && ansVal !== 'empty' && ansVal !== 'Boş') ? ansVal : '';
            }
          });
        }
      }

      if (!loadedAns || Object.keys(loadedAns).length === 0) {
        const draftStr = localStorage.getItem(draftKey);
        if (draftStr) {
          try {
            const parsed = JSON.parse(draftStr);
            if (parsed && typeof parsed === 'object') loadedAns = parsed;
          } catch(e) {}
        }
      }

      if (!loadedAns || Object.keys(loadedAns).length === 0) {
        loadedAns = {};
        homework.subjects?.forEach(sub => {
          loadedAns[sub.name] = Array(sub.count).fill('');
        });
      }

      setAnswers(loadedAns);
      let calc = calculateResults(loadedAns);

      const rawStats = submission.subjectStats || hwSub?.subjectStats || evalSub?.subjectStats || subMeta?.subjectStats || evalMeta?.subjectStats;
      if (rawStats && rawStats.subjectStats) {
        calc = rawStats;
      } else if (rawStats && Array.isArray(rawStats)) {
        calc = {
          subjectStats: rawStats,
          totalNet: submission.score || hwSub?.score || calc?.totalNet || 0,
          totalCorrect: submission.correctCount || hwSub?.correctCount || calc?.totalCorrect || 0,
          totalWrong: submission.wrongCount || hwSub?.wrongCount || calc?.totalWrong || 0,
          totalBlank: submission.blankCount ?? hwSub?.blankCount ?? calc?.totalBlank ?? 0
        };
      }

      if (submission.mistakeReasons && typeof submission.mistakeReasons === 'object') {
        setMistakeReasons(prev => {
          const merged = { ...prev };
          Object.entries(submission.mistakeReasons).forEach(([k, v]) => {
            if (k && k.includes('_')) merged[k] = v;
          });
          return merged;
        });
      }

      setResults(calc);
      initializedRef.current = true;
    } else {
      // Draft mode
      setAnswers(prev => {
        const init = { ...prev };
        let modified = false;
        homework.subjects?.forEach(sub => {
          if (!init[sub.name] || !Array.isArray(init[sub.name])) {
            init[sub.name] = Array(sub.count).fill('');
            modified = true;
          }
        });
        return modified ? init : prev;
      });
      initializedRef.current = true;
    }
  }, [homework, hwId, studentId, isRetake, draftKey, evalSubmissions]);

  // Timer interval
  useEffect(() => {
    if (!isStarted || isSubmitted || timeLeft <= 0 || isTeacherReviewing) return;
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
  }, [isStarted, timeLeft, isSubmitted, isTeacherReviewing, draftKey]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const p = n => String(n).padStart(2, '0');
    return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
  };

  useEffect(() => {
    if (!isSubmitted && Object.keys(answers).length > 0 && !isTeacherReviewing) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(answers));
      } catch {}
    }
  }, [answers, isSubmitted, draftKey, isTeacherReviewing]);

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

  const subjects = homework?.subjects || [];
  const activeSubject = subjects[activeSubjectIndex] || subjects[0];

  const isSidePdf = Boolean(hasPdf && effectivePdfMode === 'side' && !isMobile);

  const questionColumns = useMemo(() => {
    const totalCount = activeSubject?.count || 0;
    return getQuestionColumns(totalCount, isMobile, containerWidth, isSidePdf);
  }, [activeSubject?.count, isMobile, containerWidth, isSidePdf]);

  const activeSubjectMistakeStats = useMemo(() => {
    if (!activeSubject) return { classified: 0, totalTarget: 0, counts: {} };
    const counts = {
      '⚡ İşlem Hatası': 0,
      '⚠️ Dikkat Kaybı': 0,
      '📖 Formül / Bilgi': 0,
      '🧠 Konu Eksiği': 0,
      '⏱️ Zaman Yetmedi': 0
    };
    let classified = 0;
    let totalTarget = 0;

    const subAns = answers[activeSubject.name] || [];
    const answerKey = homework?.answerKey?.[activeSubject.name] || [];

    for (let i = 0; i < activeSubject.count; i++) {
      const qNo = i + 1;
      const selected = subAns[i];
      const correctKey = answerKey[i];
      const isWrong = selected && selected !== correctKey;
      const isBlank = !selected;

      if (isSubmitted && (isWrong || isBlank)) {
        totalTarget++;
        const r = mistakeReasons[`${activeSubject.name}_${qNo}`];
        if (r && counts[r] !== undefined) {
          counts[r]++;
          classified++;
        }
      }
    }

    return { classified, totalTarget, counts };
  }, [activeSubject, answers, homework, isSubmitted, mistakeReasons]);

  const activeSubjectFlaggedCount = useMemo(() => {
    if (!activeSubject) return 0;
    let count = 0;
    for (let i = 1; i <= activeSubject.count; i++) {
      if (flagged[`${activeSubject.name}_${i}`]) count++;
    }
    return count;
  }, [flagged, activeSubject]);

  const subjectAnsweredCount = useMemo(() => {
    if (!activeSubject) return 0;
    const subAns = answers[activeSubject.name] || [];
    return subAns.filter(Boolean).length;
  }, [answers, activeSubject]);

  // Overall statistics for progress bar
  const totalAnsweredCount = useMemo(() => {
    let count = 0;
    Object.values(answers).forEach(arr => {
      if (Array.isArray(arr)) {
        count += arr.filter(Boolean).length;
      }
    });
    return count;
  }, [answers]);

  const totalQuestionsCount = homework?.totalQuestions || 0;
  const progressPercent = totalQuestionsCount > 0 ? Math.round((totalAnsweredCount / totalQuestionsCount) * 100) : 0;

  const handleOptionClick = (subjectName, qIndex, option) => {
    if (isSubmitted || isTeacherReviewing) return;
    setAnswers(prev => {
      const list = prev[subjectName] ? [...prev[subjectName]] : [];
      const subObj = (homework.subjects || []).find(s => s.name === subjectName);
      const targetLength = subObj?.count || (qIndex + 1);
      while (list.length < targetLength) {
        list.push('');
      }
      list[qIndex] = list[qIndex] === option ? '' : option;
      const updated = { ...prev, [subjectName]: list };
      try {
        localStorage.setItem(draftKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearOption = (subjectName, qIndex) => {
    if (isSubmitted || isTeacherReviewing) return;
    setAnswers(prev => {
      const list = prev[subjectName] ? [...prev[subjectName]] : [];
      const subObj = (homework.subjects || []).find(s => s.name === subjectName);
      const targetLength = subObj?.count || (qIndex + 1);
      while (list.length < targetLength) {
        list.push('');
      }
      list[qIndex] = '';
      const updated = { ...prev, [subjectName]: list };
      try {
        localStorage.setItem(draftKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSubmit = (force = false) => {
    if (isSubmittingRef.current || isTeacherReviewing) return;
    if (!force) {
      setShowFinishModal(true);
      return;
    }
    
    isSubmittingRef.current = true;
    setShowFinishModal(false);
    const calculated = calculateResults(answers);
    
    // Save to HomeworkContext
    submitHomework(hwId, studentId, calculated.totalNet, homework.totalQuestions, {
      subjectStats: calculated,
      studentAnswers: answers,
      correctCount: calculated.totalCorrect,
      wrongCount: calculated.totalWrong,
      blankCount: calculated.totalBlank
    });

    // Also save to EvaluationContext for central results tracking
    try {
      const qTotal = homework.totalQuestions || (calculated.totalCorrect + calculated.totalWrong + calculated.totalBlank) || 1;
      const scorePct = Math.min(100, Math.max(0, Math.round((calculated.totalCorrect / qTotal) * 100)));
      addSubmission({
        testId: hwId,
        hwId: hwId,
        testTitle: homework.title,
        studentId: studentId,
        score: calculated.totalNet,
        scorePercentage: scorePct,
        type: 'physicalExam',
        isHomework: true,
        status: 'completed',
        correctCount: calculated.totalCorrect,
        wrongCount: calculated.totalWrong,
        blankCount: calculated.totalBlank,
        totalQuestions: homework.totalQuestions,
        subjectStats: calculated.subjectStats,
        studentAnswers: answers,
        mistakeReasons: mistakeReasons,
        answers: []
      });
    } catch(e) {
      console.error("Failed to save to evaluation context", e);
    }

    try {
      localStorage.removeItem(draftKey);
      localStorage.removeItem(`${draftKey}_time`);
      localStorage.removeItem(`${draftKey}_started`);
    } catch {}

    setResults(calculated);
    setIsSubmitted(true);
    setShowOptikForm(true);
  };

  if (!homework) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#f8fafc', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(239, 68, 68, 0.15)', border: '2px solid #ef4444', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Fiziki Deneme Bulunamadı</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: 400, margin: 0 }}>Aradığınız deneme mevcut değil veya silinmiş olabilir.</p>
        <button 
          onClick={() => navigate(-1)} 
          style={{ marginTop: '0.5rem', padding: '0.75rem 1.5rem', background: '#4f46e5', color: 'white', fontWeight: 900, borderRadius: '0.75rem', border: 'none', cursor: 'pointer' }}
        >
          Geri Dön
        </button>
      </div>
    );
  }

  // ── PRE-EXAM START SCREEN (Sınava Başlama Ekranı) ──
  if (!isStarted && !isSubmitted && !isTeacherReviewing) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Header */}
        <header style={{
          padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--color-surface)',
          borderBottom: '1.5px solid var(--color-border)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate('/');
            }}
            style={{
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '0.65rem',
              padding: '0.45rem 0.85rem',
              color: 'var(--color-text)',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: 'white', padding: '0.2rem 0.65rem', borderRadius: '0.45rem' }}>
              FİZİKİ DENEME
            </span>
          </div>
        </header>

        {/* Start Screen Main Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '1rem' : '2rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            maxWidth: 720,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            
            {/* Hero Card */}
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5, #3730a3)',
              borderRadius: '1.5rem',
              padding: isMobile ? '1.5rem 1.25rem' : '2rem',
              color: 'white',
              boxShadow: '0 10px 30px rgba(79, 70, 229, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                pointerEvents: 'none'
              }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.04em' }}>
                  {homework.examType || 'GENEL DENEME'}
                </span>
                <span style={{ background: '#10b981', color: 'white', padding: '0.25rem 0.75rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 900 }}>
                  HAZIR
                </span>
              </div>

              <h1 style={{ margin: 0, fontSize: isMobile ? '1.35rem' : '1.8rem', fontWeight: 900, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
                {homework.title}
              </h1>

              <p style={{ margin: '0.5rem 0 0 0', color: '#e0e7ff', fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 500, lineHeight: 1.5 }}>
                Sınava başlamadan önce aşağıdaki bilgileri ve kuralları gözden geçiriniz. "Sınava Başla" butonuna bastığınızda sınav başlayacaktır.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: '0.75rem'
            }}>
              {/* Stat 1: Soru */}
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>TOPLAM SORU</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)' }}>{homework.totalQuestions} Soru</span>
                <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700 }}>{subjects.length} Farklı Ders</span>
              </div>

              {/* Stat 2: Süre */}
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>TOPLAM SÜRE</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)' }}>{durationMinutes} Dk</span>
                <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>Soru başı ~{homework.timePerQuestion || 2} dk</span>
              </div>

              {/* Stat 3: Net Kuralı */}
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>NET CEZA ORANI</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  {homework.penaltyRatio > 0 ? `${homework.penaltyRatio}Y = 1D` : 'Ceza Yok'}
                </span>
                <span style={{ fontSize: '0.7rem', color: homework.penaltyRatio > 0 ? '#b45309' : '#10b981', fontWeight: 700 }}>
                  {homework.penaltyRatio > 0 ? `${homework.penaltyRatio} yanlış 1 doğru götürür` : 'Yanlışlar doğruyu götürmez'}
                </span>
              </div>

              {/* Stat 4: Kitapçık */}
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>DOKÜMAN</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  {hasPdf ? 'PDF Kitapçık' : 'Sadece Optik'}
                </span>
                <span style={{ fontSize: '0.7rem', color: hasPdf ? '#2563eb' : '#64748b', fontWeight: 700 }}>
                  {hasPdf ? 'Ekranda PDF Mevcut' : 'Fiziki Kitapçık'}
                </span>
              </div>
            </div>

            {/* Subject Breakdown Card */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: '1.25rem',
              border: '1.5px solid var(--color-border)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ListTree size={16} color="#6366f1" /> Sınav Ders Dağılımı
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.5rem'
              }}>
                {subjects.map((sub, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: 'var(--color-surface-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                      {sub.name}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#4f46e5', background: 'rgba(79, 70, 229, 0.1)', padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                      {sub.count} Soru
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions & Autosave Reassurance Box */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: '1.25rem',
              border: '1.5px solid var(--color-border)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color="#10b981" /> Önemli Bilgiler & Yönergeler
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.45 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Cloud size={12} />
                  </div>
                  <div>
                    <strong>Anlık Otomatik Kayıt:</strong> İşaretlediğiniz her şık anında kaydedilir. İnternetiniz kopsa veya sayfayı yenileseniz dahi hiçbir cevabınız kaybolmaz.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.45 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Flag size={12} />
                  </div>
                  <div>
                    <strong>Şüpheli Soru İşareti:</strong> Kararsız kaldığınız soruları bayrak butonu ile işaretleyebilir ve test sırasında kolayca geri dönebilirsiniz.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.45 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Clock size={12} />
                  </div>
                  <div>
                    <strong>Süre Akışı:</strong> "Sınava Başla" butonuna bastığınız anda süreniz başlayacak, süre dolduğunda sınavınız otomatik teslim edilecektir.
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar (Sınava Başla) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
              paddingTop: '0.5rem',
              paddingBottom: '2rem'
            }}>
              <button
                onClick={handleStartExam}
                style={{
                  width: '100%',
                  maxWidth: 420,
                  padding: '1rem 2rem',
                  borderRadius: '1.25rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: '0 6px 25px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <Play size={22} fill="white" />
                {totalAnsweredCount > 0 ? `Sınava Devam Et (%${progressPercent} Kodlandı)` : 'Sınava Başla'}
              </button>

              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {totalAnsweredCount > 0 ? 'Daha önce kaydettiğiniz cevaplarla devam edeceksiniz.' : 'Butona bastığınızda sınav başlatılacak ve süre akmaya başlayacaktır.'}
              </span>
            </div>

          </div>
        </div>
      </div>
    );
  }

  const currentAnswers = answers[activeSubject?.name] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? '100vh' : '100%', width: '100%', boxSizing: 'border-box', background: 'var(--color-bg)', color: 'var(--color-text)', overflow: isMobile ? 'visible' : 'hidden' }}>
      
      {/* Save Feedback Toast */}
      {savedFeedbackToast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f172a',
          color: '#ffffff',
          padding: '0.55rem 1rem',
          borderRadius: 10,
          fontSize: '0.78rem',
          fontWeight: 800,
          zIndex: 99999,
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <CheckCircle2 size={14} color="#10b981" />
          {savedFeedbackToast}
        </div>
      )}

      {/* ── HEADER (MOBILE vs DESKTOP) ── */}
      {isMobile ? (
        <header style={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 40, 
          background: 'var(--color-surface)', 
          borderBottom: '1.5px solid var(--color-border)', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          {/* Top Row: Navigation + Title + Timer + Finish */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.45rem 0.65rem',
            gap: 8
          }}>
            {/* Left: Back Arrow + Title & Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
              <button
                onClick={() => {
                  if (window.history.length > 1) navigate(-1);
                  else navigate('/');
                }}
                style={{
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: 0
                }}
                title="Geri Dön"
              >
                <ArrowLeft size={16} />
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    fontSize: '0.55rem',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                    color: 'white',
                    padding: '1px 4px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    flexShrink: 0
                  }}>
                    DENEME
                  </span>
                  <h2 style={{
                    margin: 0,
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    color: 'var(--color-text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {homework.title}
                  </h2>
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {homework.examType || 'LGS'} • {homework.totalQuestions} Soru ({subjects.length} Ders)
                </div>
              </div>
            </div>

            {/* Right: Timer + Finish Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {!isSubmitted && !isTeacherReviewing && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  background: timeLeft < 300 ? '#fef2f2' : 'var(--color-surface-hover)',
                  border: `1px solid ${timeLeft < 300 ? '#fecaca' : 'var(--color-border)'}`,
                  color: timeLeft < 300 ? '#dc2626' : 'var(--color-text)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 8,
                  fontSize: '0.72rem',
                  fontWeight: 900
                }}>
                  <Clock size={12} color={timeLeft < 300 ? '#dc2626' : '#10b981'} />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              )}

              {!isSubmitted && !isTeacherReviewing ? (
                <button
                  onClick={() => handleSubmit(false)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>Bitir</span>
                </button>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.25rem 0.5rem', borderRadius: 8, fontSize: '0.68rem', fontWeight: 900 }}>
                  <CheckCircle2 size={12} /> Bitti
                </div>
              )}
            </div>
          </div>

          {/* Bottom Control Bar: Progress + Auto-save + Quick Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.25rem 0.65rem',
            background: 'var(--color-bg)',
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.68rem',
            fontWeight: 800,
            gap: 6
          }}>
            {/* Progress & Autosave */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
              {!isSubmitted && (
                <span style={{
                  color: '#15803d',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '1px 6px',
                  borderRadius: 6,
                  whiteSpace: 'nowrap',
                  fontSize: '0.64rem',
                  fontWeight: 900
                }}>
                  ✍️ {totalAnsweredCount}/{totalQuestionsCount}
                </span>
              )}

              {!isSubmitted && !isTeacherReviewing && (
                <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.62rem', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Kaydedildi
                </span>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {/* Optik Toggle Button */}
              <button
                onClick={() => {
                  const nextState = !showOptikForm;
                  setShowOptikForm(nextState);
                  if (nextState) setPdfMode('top');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '0.25rem 0.5rem',
                  borderRadius: 6,
                  background: showOptikForm ? '#eff6ff' : 'var(--color-surface)',
                  border: `1px solid ${showOptikForm ? '#bfdbfe' : 'var(--color-border)'}`,
                  color: showOptikForm ? '#1d4ed8' : 'var(--color-text)',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {showOptikForm ? <EyeOff size={11} /> : <Eye size={11} />}
                <span>{showOptikForm ? 'Optik Gizle' : 'Optik Göster'}</span>
              </button>

              {/* Drawing Button */}
              <button
                onClick={() => setIsDrawingOpen(!isDrawingOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '0.25rem 0.45rem',
                  borderRadius: 6,
                  background: isDrawingOpen ? '#fffbeb' : 'var(--color-surface)',
                  border: `1px solid ${isDrawingOpen ? '#fde68a' : 'var(--color-border)'}`,
                  color: isDrawingOpen ? '#b45309' : 'var(--color-text)',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                title="Çizim Aracı"
              >
                <Pencil size={11} />
                <span>Çizim</span>
              </button>
            </div>
          </div>
        </header>
      ) : (
        <header style={{ 
          padding: '0.65rem 1.25rem', 
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
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          {/* Left: Back + Title & Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                onClick={() => {
                  if (window.history.length > 1) navigate(-1);
                  else navigate('/');
                }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Geri Dön"
              >
                <ArrowLeft size={22} />
              </button>
              <span style={{ fontSize: '0.62rem', fontWeight: 900, background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                FİZİKİ DENEME
              </span>
              <h2 style={{ 
                color: 'var(--color-text)', 
                fontSize: '1.1rem', 
                fontWeight: 800, 
                margin: 0, 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis' 
              }}>
                {homework.title}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>
                {homework.examType || 'LGS / YKS'} • {homework.totalQuestions} Soru ({subjects.length} Ders)
              </span>
              {!isSubmitted && (
                <span style={{ color: '#16a34a', fontSize: '0.75rem', fontWeight: 800 }}>
                  • Kodlanan: {totalAnsweredCount}/{totalQuestionsCount}
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            
            {/* Autosave Status Indicator */}
            {!isSubmitted && !isTeacherReviewing && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#059669',
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.65rem',
                  boxShadow: '0 2px 6px rgba(16,185,129,0.1)'
                }} 
                title="İşaretlediğiniz tüm cevaplar anlık olarak otomatik kaydedilir"
              >
                <Cloud size={14} color="#10b981" />
                <span>Anlık Kaydediliyor</span>
              </div>
            )}

            {/* Timer */}
            {!isSubmitted && !isTeacherReviewing && (
              <div style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '0.65rem',
                background: timeLeft < 300 ? '#fef2f2' : 'var(--color-surface)',
                border: `1.5px solid ${timeLeft < 300 ? '#fecaca' : 'var(--color-border)'}`,
                color: timeLeft < 300 ? '#dc2626' : 'var(--color-text)',
                fontWeight: 900,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <Clock size={16} color={timeLeft < 300 ? '#dc2626' : '#059669'} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}

            {/* PDF Mode Selector Buttons */}
            {hasPdf && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <button
                  onClick={() => setPdfMode('side')}
                  title="Sol panele sabitle"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '0.4rem 0.65rem',
                    borderRadius: '0.6rem', border: `1.5px solid ${pdfMode === 'side' ? '#2563eb' : '#cbd5e1'}`,
                    background: pdfMode === 'side' ? '#eff6ff' : '#ffffff',
                    color: pdfMode === 'side' ? '#1d4ed8' : '#475569',
                    fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <PanelLeft size={14} />
                  Sol Panel
                </button>
                <button
                  onClick={() => setPdfMode('top')}
                  title="Üst panele sabitle"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '0.4rem 0.65rem',
                    borderRadius: '0.6rem', border: `1.5px solid ${pdfMode === 'top' ? '#2563eb' : '#cbd5e1'}`,
                    background: pdfMode === 'top' ? '#eff6ff' : '#ffffff',
                    color: pdfMode === 'top' ? '#1d4ed8' : '#475569',
                    fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <PanelTop size={14} />
                  Üst Panel
                </button>
                <button
                  onClick={() => setPdfMode('float')}
                  title="Yüzen pencere"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '0.4rem 0.65rem',
                    borderRadius: '0.6rem', border: `1.5px solid ${pdfMode === 'float' ? '#2563eb' : '#cbd5e1'}`,
                    background: pdfMode === 'float' ? '#eff6ff' : '#ffffff',
                    color: pdfMode === 'float' ? '#1d4ed8' : '#475569',
                    fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <Maximize2 size={14} />
                  Pencere
                </button>
                <button
                  onClick={() => setPdfMode('hidden')}
                  title="PDF'yi Gizle"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '0.4rem 0.65rem',
                    borderRadius: '0.6rem', border: `1.5px solid ${pdfMode === 'hidden' ? '#fecaca' : '#cbd5e1'}`,
                    background: pdfMode === 'hidden' ? '#fef2f2' : '#ffffff',
                    color: pdfMode === 'hidden' ? '#dc2626' : '#64748b',
                    fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <XIcon size={14} />
                  Gizle
                </button>
              </div>
            )}

            {/* Optik Göster / Gizle Button */}
            <button
              onClick={() => {
                const nextState = !showOptikForm;
                setShowOptikForm(nextState);
              }}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '0.7rem',
                background: showOptikForm ? '#eff6ff' : '#ffffff',
                border: `1.5px solid ${showOptikForm ? '#bfdbfe' : '#cbd5e1'}`,
                color: showOptikForm ? '#1d4ed8' : '#475569',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title={showOptikForm ? "Optik Alanı Gizle (PDF'yi Tam Ekran Yap)" : "Optik Alanı Göster"}
            >
              {showOptikForm ? <EyeOff size={15} /> : <Eye size={15} />}
              <span>{showOptikForm ? 'Optik Gizle' : 'Optik Göster'}</span>
            </button>

            {/* Drawing Tool Button */}
            <button
              onClick={() => setIsDrawingOpen(!isDrawingOpen)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '0.7rem',
                background: isDrawingOpen ? '#fffbeb' : '#ffffff',
                border: `1.5px solid ${isDrawingOpen ? '#fde68a' : '#cbd5e1'}`,
                color: isDrawingOpen ? '#b45309' : '#475569',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="Çizim Aracı"
            >
              <Pencil size={15} /> 
              <span>{isDrawingOpen ? "Çizimi Kapat" : "Çizim Aracı"}</span>
            </button>

            {/* Submit / Finish button */}
            {!isSubmitted && !isTeacherReviewing && (
              <button
                onClick={() => handleSubmit(false)}
                style={{
                  padding: '0.45rem 1.1rem',
                  borderRadius: '0.7rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 3px 10px rgba(16,185,129,0.25)'
                }}
              >
                <CheckCircle2 size={16} /> 
                <span>Sınavı Bitir ve Gönder</span>
              </button>
            )}

            {isSubmitted && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 900 }}>
                <CheckCircle2 size={14} /> Sınav Tamamlandı
              </div>
            )}

          </div>
        </header>
      )}

      {/* ── TEACHER BANNER (IF REVIEWING) ── */}
      {isTeacherReviewing && currentViewingStudent && (
        <div style={{ padding: '0.6rem 1.25rem', background: '#eff6ff', borderBottom: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 800, color: '#1e40af' }}>
            <span style={{ background: '#2563eb', color: 'white', padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem' }}>Öğretmen İncelemesi</span>
            <span>{currentViewingStudent.name} isimli öğrencinin optik formunu inceliyorsunuz.</span>
          </div>
          <button onClick={() => navigate(-1)} style={{ background: '#ffffff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '0.3rem 0.8rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>
            ← Geri
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          [data-quiz-layout] {
            flex-direction: column !important;
          }
        }
        [data-optical-panel] {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
        }
        [data-optical-panel]::-webkit-scrollbar {
          width: 7px;
        }
        [data-optical-panel]::-webkit-scrollbar-track {
          background: transparent;
        }
        [data-optical-panel]::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.4);
          border-radius: 99px;
        }
        [data-optical-panel]::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.7);
        }
      `}</style>

      {/* ── MAIN WORKSPACE: PDF (side/top) + OPTICAL AREA (scrollable) ── */}
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
        {/* LEFT/TOP: PDF panel */}
        {hasPdf && (
          <ResizablePdfPanel
            pdfUrl={homework.pdfUrl}
            title={homework.title}
            mode={effectivePdfMode}
            onModeChange={setPdfMode}
            defaultWidth="78%"
            isFullScreen={!showOptikForm}
            onToggleDrawing={() => setIsDrawingOpen(p => !p)}
            isDrawingOpen={isDrawingOpen}
          />
        )}

        {/* RIGHT/BOTTOM: Optical Form Area (Clean edge-to-edge compact strip) */}
        {showOptikForm && (
          <div 
            ref={opticalContainerRef}
            data-optical-panel
            tabIndex={0}
            style={{ 
              flex: 1, 
              width: '100%',
              overflowY: isMobile ? 'visible' : 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              minWidth: 0, 
              height: isMobile ? 'auto' : '100%',
              background: 'var(--color-bg)',
              outline: 'none',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              borderLeft: isSidePdf && !isMobile ? '1.5px solid var(--color-border)' : 'none'
            }}
          >
            <div style={{ 
              maxWidth: !isSidePdf ? 680 : undefined, 
              width: '100%', 
              margin: !isSidePdf ? '0 auto' : undefined, 
              padding: isMobile ? '0.5rem 0.5rem 1.25rem 0.5rem' : isSidePdf ? '0.45rem 0.55rem' : '1.25rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: isSidePdf ? '0.45rem' : '1rem', 
              boxSizing: 'border-box' 
            }}>
              
              {/* 1. SCORECARD HERO (AFTER SUBMISSION) */}
              {isSubmitted && results && (
                <div style={{ background: 'var(--color-surface)', borderRadius: '1.4rem', padding: '1.25rem 1.4rem', color: 'var(--color-text)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)', border: '1.5px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fef3c7', border: '1.5px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trophy size={26} color="#b45309" />
                      </div>
                      <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37,99,235,0.15)', border: '1px solid #3b82f6', borderRadius: 99, padding: '0.15rem 0.6rem', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#60a5fa', letterSpacing: '0.05em' }}>SINAV TAMAMLANDI</span>
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>{homework.title}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Doğru */}
                      <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: '0.55rem 0.95rem', textAlign: 'center', minWidth: 68 }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#15803d', lineHeight: 1.1 }}>{results.totalCorrect}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#16a34a', letterSpacing: '0.04em', marginTop: 3 }}>DOĞRU</div>
                      </div>

                      {/* Yanlış */}
                      <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 14, padding: '0.55rem 0.95rem', textAlign: 'center', minWidth: 68 }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#b91c1c', lineHeight: 1.1 }}>{results.totalWrong}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#dc2626', letterSpacing: '0.04em', marginTop: 3 }}>YANLIŞ</div>
                      </div>

                      {/* Boş */}
                      <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '0.55rem 0.95rem', textAlign: 'center', minWidth: 68 }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#475569', lineHeight: 1.1 }}>{results.totalBlank}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.04em', marginTop: 3 }}>BOŞ</div>
                      </div>

                      {/* Toplam Net */}
                      <div style={{
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        borderRadius: 16,
                        padding: '0.55rem 1.25rem',
                        textAlign: 'center',
                        minWidth: 95,
                        boxShadow: '0 4px 14px rgba(99,102,241,0.25)'
                      }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
                          {results.totalNet}
                        </div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#e0e7ff', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
                          🎯 TOPLAM NET
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons after submission */}
                  <div style={{ display: 'flex', gap: 10, marginTop: '1.1rem', paddingTop: '0.85rem', borderTop: '1.5px solid var(--color-border)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button 
                      onClick={handleGoBack}
                      style={{ padding: '0.6rem 1.35rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.86rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 3px 10px rgba(79,70,229,0.25)', transition: 'transform 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      <Trophy size={16} /> {returnUrl ? (returnUrl.includes('/program') || returnUrl.includes('/my-program') ? '📅 Programa Dön' : (returnUrl.includes('/homeworks') ? '📝 Ödevlere Dön' : (returnUrl === '/student' ? '🏠 Panoya Dön' : 'Geri Dön'))) : 'Denemelerime Dön'}
                    </button>
                  </div>
                </div>
              )}

              {/* 2. SUBJECT TABS PILLS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isSidePdf ? 4 : 6, overflowX: 'auto', paddingBottom: 2 }}>
                {subjects.map((sub, idx) => {
                  const isActive = activeSubjectIndex === idx;
                  const count = sub.count || 0;
                  const filledCount = (answers[sub.name] || []).filter(Boolean).length;
                  const isDone = filledCount === count && count > 0;

                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveSubjectIndex(idx)}
                      style={{
                        padding: isSidePdf ? '0.28rem 0.55rem' : isMobile ? '0.45rem 0.85rem' : '0.6rem 1.15rem',
                        borderRadius: isSidePdf ? '0.65rem' : '0.9rem',
                        border: isActive ? '2px solid #2563eb' : '1.5px solid var(--color-border)',
                        background: isActive ? '#2563eb' : 'var(--color-surface)',
                        color: isActive ? '#ffffff' : 'var(--color-text)',
                        fontWeight: 800,
                        fontSize: isSidePdf ? '0.72rem' : isMobile ? '0.78rem' : '0.86rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isSidePdf ? '0.35rem' : '0.5rem',
                        boxShadow: isActive ? '0 3px 10px rgba(37,99,235,0.2)' : 'none',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      <span>{sub.name}</span>
                      <span style={{
                        fontSize: isSidePdf ? '0.64rem' : '0.68rem',
                        padding: isSidePdf ? '0.1rem 0.35rem' : '0.15rem 0.45rem',
                        borderRadius: 99,
                        background: isActive ? 'rgba(255,255,255,0.2)' : isDone ? 'rgba(16,185,129,0.15)' : 'var(--color-surface-hover)',
                        color: isActive ? '#ffffff' : isDone ? '#10b981' : 'var(--color-text-muted)',
                        fontWeight: 900
                      }}>
                        {filledCount}/{count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 3. OPTICAL FORM CARD */}
              {activeSubject && (
                <div style={{
                  background: 'var(--color-surface)',
                  borderRadius: isSidePdf ? '0.9rem' : '1.25rem',
                  border: '1.5px solid var(--color-border)',
                  padding: isSidePdf ? '0.5rem 0.6rem' : isMobile ? '0.85rem' : '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isSidePdf ? '0.45rem' : '1rem',
                  boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
                }}>
                  {/* Subject Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: isSidePdf ? '0.35rem' : '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
                      <h3 style={{ margin: 0, fontSize: isSidePdf ? '0.82rem' : isMobile ? '0.95rem' : '1.1rem', fontWeight: 900, color: 'var(--color-text)' }}>
                        {activeSubject.name}
                      </h3>
                      <span style={{ fontSize: isSidePdf ? '0.7rem' : '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                        ({activeSubject.count} Soru)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: isSidePdf ? '0.68rem' : '0.75rem', fontWeight: 800, color: '#2563eb', background: 'rgba(37,99,235,0.1)', padding: isSidePdf ? '0.15rem 0.45rem' : '0.2rem 0.6rem', borderRadius: 99 }}>
                        {(answers[activeSubject.name] || []).filter(Boolean).length}/{activeSubject.count} Kodlandı
                      </span>
                    </div>
                  </div>

                  {/* Mistake Diagnostic Summary Bar for Active Subject */}
                  {isSubmitted && activeSubjectMistakeStats.totalTarget > 0 && (
                    <div style={{
                      background: 'var(--color-surface-hover, #f8fafc)',
                      border: '1.5px solid var(--color-border, #e2e8f0)',
                      borderRadius: 12,
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          📊 {activeSubject.name} Hata &amp; Boş Analizi Dağılımı
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: activeSubjectMistakeStats.classified === activeSubjectMistakeStats.totalTarget ? '#16a34a' : '#d97706', background: activeSubjectMistakeStats.classified === activeSubjectMistakeStats.totalTarget ? '#f0fdf4' : '#fffbeb', border: `1px solid ${activeSubjectMistakeStats.classified === activeSubjectMistakeStats.totalTarget ? '#bbf7d0' : '#fde68a'}`, padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                          {activeSubjectMistakeStats.classified} / {activeSubjectMistakeStats.totalTarget} Neden Belirtildi
                        </span>
                      </div>

                      {activeSubjectMistakeStats.classified > 0 && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '0.45rem',
                          marginTop: '0.25rem'
                        }}>
                          {MISTAKE_REASON_OPTIONS.map(opt => {
                            const count = activeSubjectMistakeStats.counts[opt.label] || 0;
                            return (
                              <div
                                key={opt.label}
                                style={{
                                  background: count > 0 ? opt.bg : 'var(--color-surface, #ffffff)',
                                  border: `1.5px solid ${count > 0 ? opt.border : 'var(--color-border, #e2e8f0)'}`,
                                  borderRadius: 10,
                                  padding: '0.45rem 0.65rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                              >
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: count > 0 ? opt.color : 'var(--color-text-muted)' }}>
                                  {opt.label}
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: count > 0 ? opt.color : 'var(--color-text-muted)' }}>
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Hata Analizini Veritabanına Kaydet Butonu */}
                      <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderTop: '1px dashed #e2e8f0', paddingTop: '0.65rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                          💡 Her soru için aşağıda işaretlediğiniz hata nedenleri veritabanına anlık senkronize edilir.
                        </span>
                        <button
                          type="button"
                          onClick={handleSaveAllMistakesToDb}
                          disabled={isSavingDb}
                          style={{
                            padding: '0.4rem 0.9rem',
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            color: 'white',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Save size={14} />
                          <span>{isSavingDb ? 'Kaydediliyor...' : '💾 Hata Analizini Veritabanına Kaydet'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Natural Question Columns Grid (Dynamic 1 or 2 Columns based on container width) */}
                  {(() => {
                    const isVeryNarrow = isMobile || containerWidth < 460;
                    const isCompact = isSidePdf || containerWidth < 680;
                    const bubbleSize = isSidePdf ? 26 : isVeryNarrow ? 28 : isCompact ? 32 : (questionColumns.length === 1 ? 40 : 36);
                    const bubbleFontSize = isSidePdf ? '0.74rem' : isVeryNarrow ? '0.76rem' : isCompact ? '0.84rem' : '0.95rem';

                    return (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: questionColumns.length === 1 ? '1fr' : `repeat(${questionColumns.length}, minmax(0, 1fr))`,
                        gap: isSidePdf ? '0.35rem' : isCompact ? '0.55rem' : '1rem',
                        alignItems: 'start',
                        width: '100%'
                      }}>
                        {questionColumns.map((col, colIdx) => (
                          <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: isSidePdf ? '0.3rem' : isCompact ? '0.45rem' : '0.75rem', width: '100%', minWidth: 0 }}>
                            {col.map(qNo => {
                              const qIdx = qNo - 1;
                              const currentAnswers = answers[activeSubject.name] || [];
                              const selected = currentAnswers[qIdx];
                              const isFlagged = Boolean(flagged[`${activeSubject.name}_${qNo}`]);
                              
                              let isCorrect = false;
                              let isWrong = false;
                              let correctKey = '';

                              if (isSubmitted) {
                                correctKey = homework.answerKey?.[activeSubject.name]?.[qIdx] || '';
                                isCorrect = selected && String(selected).toUpperCase() === String(correctKey).toUpperCase();
                                isWrong = selected && String(selected).toUpperCase() !== String(correctKey).toUpperCase();
                              }

                              const explicitCount = Number(homework.optionCount || homework.optionsCount || activeSubject.optionCount);
                              const optionsList = (activeSubject.options && activeSubject.options.length > 0) 
                                ? activeSubject.options 
                                : (explicitCount === 4 || (explicitCount !== 5 && homework.examType === 'LGS'))
                                  ? ['A', 'B', 'C', 'D']
                                  : ['A', 'B', 'C', 'D', 'E'];

                              return (
                                <div 
                                  key={qNo} 
                                  style={{
                                    background: isFlagged && !isSubmitted
                                      ? '#fffbeb'
                                      : selected 
                                        ? 'rgba(37,99,235,0.12)' 
                                        : 'var(--color-surface-hover)',
                                    padding: isSidePdf ? '0.22rem 0.4rem' : isVeryNarrow ? '0.4rem 0.55rem' : isCompact ? '0.5rem 0.7rem' : '0.65rem 1rem',
                                    borderRadius: isSidePdf ? '0.55rem' : '0.85rem',
                                    border: isCorrect 
                                      ? '1.5px solid #bbf7d0' 
                                      : isWrong 
                                      ? '1.5px solid #fecaca' 
                                      : isFlagged && !isSubmitted
                                      ? '1.5px solid #fde68a'
                                      : selected 
                                      ? '1.5px solid #93c5fd' 
                                      : '1.5px solid var(--color-border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: isSidePdf ? '0.2rem' : '0.45rem',
                                    transition: 'all 0.15s ease',
                                    boxShadow: selected ? '0 2px 8px rgba(37,99,235,0.08)' : 'none',
                                    boxSizing: 'border-box',
                                    width: '100%'
                                  }}
                                >
                                  {/* Top Question Row */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: isSidePdf ? '0.25rem' : isVeryNarrow ? '0.35rem' : '0.65rem' }}>
                                    {/* Question Number Badge & Flag */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: isSidePdf ? 2 : 4, minWidth: isSidePdf ? 36 : isVeryNarrow ? 44 : 64, flexShrink: 0 }}>
                                      <div style={{
                                        width: isSidePdf ? 22 : isVeryNarrow ? 24 : 30,
                                        height: isSidePdf ? 22 : isVeryNarrow ? 24 : 30,
                                        borderRadius: isSidePdf ? '0.4rem' : '0.5rem',
                                        background: selected ? '#2563eb' : 'var(--color-surface)',
                                        color: selected ? '#ffffff' : 'var(--color-text)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 900,
                                        fontSize: isSidePdf ? '0.7rem' : isVeryNarrow ? '0.74rem' : '0.84rem',
                                        border: selected ? 'none' : '1.5px solid var(--color-border-input)',
                                        boxShadow: selected ? '0 2px 6px rgba(37,99,235,0.25)' : 'none'
                                      }}>
                                        {qNo}
                                      </div>

                                      {!isSubmitted && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); toggleFlag(activeSubject.name, qNo); }}
                                          title={isFlagged ? "İşareti Kaldır" : "Şüpheli/İncele Olarak İşaretle"}
                                          style={{
                                            background: isFlagged ? '#fffbeb' : 'transparent',
                                            border: isFlagged ? '1px solid #fde68a' : 'none',
                                            borderRadius: '0.4rem',
                                            padding: isSidePdf ? '1px' : '2px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: isFlagged ? '#d97706' : '#94a3b8'
                                          }}
                                        >
                                          <Flag size={isSidePdf ? 10 : isVeryNarrow ? 11 : 13} fill={isFlagged ? '#d97706' : 'none'} />
                                        </button>
                                      )}

                                      {isSubmitted && (
                                        <span style={{ fontSize: isSidePdf ? '0.62rem' : isVeryNarrow ? '0.65rem' : '0.72rem', fontWeight: 900, color: isCorrect ? '#15803d' : isWrong ? '#b91c1c' : '#64748b' }}>
                                          {isCorrect ? '✓' : isWrong ? `(${correctKey})` : `(Boş)`}
                                        </span>
                                      )}
                                    </div>

                                    {/* Option Bubbles */}
                                    <div style={{ display: 'flex', gap: isSidePdf ? '3px' : isVeryNarrow ? '0.2rem' : isCompact ? '0.35rem' : '0.45rem', flex: 1, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'nowrap' }}>
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
                                            onClick={() => handleOptionClick(activeSubject.name, qIdx, opt)}
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
                                          onClick={() => handleClearOption(activeSubject.name, qIdx)}
                                          disabled={!selected}
                                          title="İşareti Kaldır"
                                          style={{
                                            width: isVeryNarrow ? 20 : 24,
                                            height: isVeryNarrow ? 24 : 24,
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

                                  {/* Mistake Diagnostic Selector for Wrong OR Blank questions */}
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
                                      <span style={{ fontSize: '0.66rem', fontWeight: 800, color: isWrong ? '#b91c1c' : '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {isWrong ? '🤔 Yanlış Sebebi:' : '○ Boş Sebebi:'}
                                      </span>
                                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                        {MISTAKE_REASON_OPTIONS.map(r => {
                                          const key = `${activeSubject.name}_${qNo}`;
                                          const isSelected = mistakeReasons[key] === r.label;
                                          return (
                                            <button
                                              key={r.label}
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); handleSetMistakeReason(activeSubject.name, qNo, r.label); }}
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
              )}

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
                    Sınavı Kaydet ve Gönder
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />

      {/* ── FINISH CONFIRMATION MODAL ── */}
      {showFinishModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay, rgba(15, 23, 42, 0.75))', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center', padding: '2rem', background: 'var(--color-surface, #ffffff)', borderRadius: '1.5rem', border: '1.5px solid var(--color-border, #e2e8f0)', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text, #0f172a)', margin: '1rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', border: '2px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <CheckCircle2 size={30} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>Sınavı Bitiriyorsunuz</h3>
            <p style={{ margin: 0, color: 'var(--color-text-muted, #64748b)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Tüm cevaplarınızı optik forma doğru geçirdiğinizden emin misiniz? Gönderdikten sonra optik form kilitlenecektir.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setShowFinishModal(false)}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #475569)', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Kontrole Dön
              </button>
              <button 
                onClick={() => handleSubmit(true)}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)' }}
              >
                Gönder
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
            background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '3.5rem',
            height: '3.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
            cursor: 'pointer'
          }}
          title="Optik Formu Aç"
        >
          <FileSpreadsheet size={24} />
        </button>
      )}

      {/* ── MOBILE BOTTOM-SHEET OPTIC MODAL ── */}
      {isMobile && showMobileOpticModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'var(--color-modal-overlay, rgba(15, 23, 42, 0.75))',
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }} onClick={() => setShowMobileOpticModal(false)}>
          <div style={{
            background: 'var(--color-surface, #ffffff)',
            color: 'var(--color-text, #0f172a)',
            borderRadius: '1.5rem 1.5rem 0 0',
            maxHeight: '85vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -10px 35px rgba(0,0,0,0.25)',
            borderTop: '1.5px solid var(--color-border, #e2e8f0)'
          }} onClick={e => e.stopPropagation()}>

            {/* Header with subject selector */}
            <div style={{
              padding: '1rem 1.25rem',
              background: 'var(--color-surface, #ffffff)',
              borderBottom: '1.5px solid var(--color-border, #e2e8f0)',
              display: 'flex', flexDirection: 'column', gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                    📝 Optik Cevap Formu
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600, marginTop: 2 }}>
                    Toplam {totalAnsweredCount}/{totalQuestionsCount} soru kodlandı
                  </p>
                </div>
                <button
                  onClick={() => setShowMobileOpticModal(false)}
                  style={{
                    background: 'var(--color-surface-hover, #f1f5f9)', border: 'none', borderRadius: '50%',
                    width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--color-text-muted, #475569)'
                  }}
                >
                  <XIcon size={18} />
                </button>
              </div>

              {/* Subject Tabs in Mobile Modal */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {subjects.map((sub, idx) => {
                  const isActive = activeSubjectIndex === idx;
                  const subAns = answers[sub.name] || [];
                  const filled = subAns.filter(Boolean).length;
                  return (
                    <button
                      key={sub.name}
                      type="button"
                      onClick={() => setActiveSubjectIndex(idx)}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: 8,
                        background: isActive ? '#4f46e5' : 'var(--color-surface-hover, #f8fafc)',
                        border: `1.5px solid ${isActive ? '#4338ca' : 'var(--color-border-input, #cbd5e1)'}`,
                        color: isActive ? 'white' : 'var(--color-text-muted, #64748b)',
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      {sub.name} ({filled}/{sub.count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, background: 'var(--color-surface-hover, #f8fafc)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {activeSubject && Array.from({ length: activeSubject.count }).map((_, qIdx) => {
                  const qNo = qIdx + 1;
                  const selected = currentAnswers[qIdx];
                  const explicitCount = Number(homework.optionCount || homework.optionsCount || activeSubject.optionCount);
                  const optionsList = (activeSubject.options && activeSubject.options.length > 0)
                    ? activeSubject.options
                    : (explicitCount === 4 || (explicitCount !== 5 && homework.examType === 'LGS'))
                      ? ['A', 'B', 'C', 'D']
                      : ['A', 'B', 'C', 'D', 'E'];

                  let isCorrect = false;
                  let isWrong = false;
                  let correctKey = '';

                  if (isSubmitted) {
                    correctKey = homework.answerKey?.[activeSubject.name]?.[qIdx] || '';
                    isCorrect = selected && selected === correctKey;
                    isWrong = selected && selected !== correctKey;
                  }

                  return (
                    <div key={qNo} style={{ background: 'var(--color-surface, #ffffff)', padding: '0.75rem 0.85rem', borderRadius: '0.75rem', border: isCorrect ? '1.5px solid #bbf7d0' : isWrong ? '1.5px solid #fecaca' : selected ? '1.5px solid #93c5fd' : '1.5px solid var(--color-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 60 }}>
                          <span style={{ fontWeight: 900, fontSize: '0.85rem', color: isCorrect ? '#15803d' : isWrong ? '#b91c1c' : 'var(--color-text, #0f172a)' }}>
                            Soru {qNo}
                          </span>
                          {isSubmitted && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: isCorrect ? '#15803d' : isWrong ? '#b91c1c' : 'var(--color-text-muted)' }}>
                              {isCorrect ? '✓' : isWrong ? `(${correctKey})` : `(Boş)`}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.35rem', flex: 1, maxWidth: 260, justifyContent: 'flex-end' }}>
                          {optionsList.map((opt) => {
                            const isSelected = selected === opt;
                            const isThisOptCorrect = isSubmitted && correctKey === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                disabled={isSubmitted}
                                onClick={() => handleOptionClick(activeSubject.name, qIdx, opt)}
                                style={{
                                  flex: 1, height: 36, borderRadius: '50%',
                                  fontWeight: 900, fontSize: '0.85rem', cursor: isSubmitted ? 'default' : 'pointer',
                                  border: isSelected ? 'none' : isSubmitted && isThisOptCorrect ? '2px solid #16a34a' : '1.5px solid var(--color-border-input, #cbd5e1)',
                                  background: isSubmitted && isThisOptCorrect ? '#16a34a' : isSubmitted && isSelected && isWrong ? '#dc2626' : isSelected ? '#4f46e5' : 'var(--color-surface, #ffffff)',
                                  color: isSelected || (isSubmitted && isThisOptCorrect) ? 'white' : 'var(--color-text, #334155)',
                                  transition: 'all 0.12s'
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mistake selector for mobile bottom-sheet */}
                      {isSubmitted && (isWrong || !selected) && (
                        <div style={{
                          width: '100%',
                          marginTop: '0.35rem',
                          paddingTop: '0.4rem',
                          borderTop: isWrong ? '1px dashed #fecaca' : '1px dashed #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.3rem'
                        }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: isWrong ? '#b91c1c' : '#475569' }}>
                            {isWrong ? '❌ Yanlış:' : '○ Boş:'}
                          </span>
                          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {MISTAKE_REASON_OPTIONS.map(r => {
                              const key = `${activeSubject.name}_${qNo}`;
                              const isSelected = mistakeReasons[key] === r.label;
                              return (
                                <button
                                  key={r.label}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleSetMistakeReason(activeSubject.name, qNo, r.label); }}
                                  style={{
                                    padding: '0.12rem 0.35rem',
                                    fontSize: '0.55rem',
                                    fontWeight: 800,
                                    borderRadius: 6,
                                    border: `1.5px solid ${isSelected ? r.color : r.border}`,
                                    background: isSelected ? r.color : r.bg,
                                    color: isSelected ? '#ffffff' : r.color,
                                    cursor: 'pointer'
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
            </div>

            {/* Footer */}
            <div style={{ padding: '0.75rem 1.25rem', background: 'var(--color-surface, #ffffff)', borderTop: '1.5px solid var(--color-border, #e2e8f0)' }}>
              <button
                onClick={() => setShowMobileOpticModal(false)}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white', border: 'none', fontWeight: 900, fontSize: '0.9rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 3px 10px rgba(16,185,129,0.25)'
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
      {!isMobile && (!showOptikForm || pdfMode === 'float') && (
        <button
          onClick={() => {
            setShowOptikForm(true);
            if (pdfMode === 'float') setPdfMode('side');
          }}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '1.5rem',
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(79,70,229,0.35)',
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
