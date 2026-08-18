import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useAuth } from '../context/AuthContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { toUUID } from '../services/supabaseService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import ResizablePdfPanel from '../components/ResizablePdfPanel';
import DrawingCanvas from '../components/quiz/common/DrawingCanvas';
import { 
  ArrowLeft, CheckCircle2, AlertCircle, Clock, 
  Send, X as XIcon, LayoutTemplate, Trophy, BarChart3, ListTree, 
  ChevronRight, ChevronDown, ChevronUp, FileText, PanelLeft, PanelTop, Maximize2,
  EyeOff, Eye, Pencil, FileSpreadsheet
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function PhysicalExamRunner() {
  const { hwId } = useParams();
  const navigate = useNavigate();
  const { homeworks, submitHomework } = useHomework();
  const { books } = useTrackedBooks();
  const { currentUser } = useAuth();
  const { submissions: evalSubmissions, addSubmission } = useEvaluation();
  const { users } = useUser();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Optional: Extract studentId from URL if teacher is viewing, otherwise use currentUser
  const queryParams = new URLSearchParams(window.location.search);
  const paramStudentId = queryParams.get('studentId');
  const isRetake = queryParams.get('retake') === 'true';
  const studentId = paramStudentId || currentUser?.id;

  const currentViewingStudent = users.find(u => u.id === studentId);
  const isTeacherReviewing = currentUser?.role !== 'student' && paramStudentId && paramStudentId !== currentUser?.id;
  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin' || currentUser?.role === 'coordinator' || isTeacherReviewing;

  const homework = useMemo(() => {
    const cleanId = String(hwId || '');
    let hw = (homeworks || []).find(h => String(h.id) === cleanId || toUUID(h.id) === cleanId);
    
    // Find matching book in books (e.g. physical exam created from ExamManager)
    const matchingBook = (books || []).find(b => 
      String(b.id) === cleanId || 
      toUUID(b.id) === cleanId || 
      String(b.id) === String(hw?.bookId) || 
      toUUID(b.id) === String(hw?.bookId)
    );

    const pdfUrl = hw?.pdfUrl || matchingBook?.pdfUrl || hw?.pdfPayload || '';

    if (!hw && matchingBook) {
      // Synthetic homework object from tracked book exam
      const subs = matchingBook.subjects || [];
      return {
        id: matchingBook.id,
        title: matchingBook.title || 'Fiziki Deneme',
        examType: matchingBook.publisher || 'LGS / YKS',
        type: 'physicalExam',
        subjects: subs.map((s, idx) => ({
          ...s,
          name: s.name || `Ders ${idx + 1}`,
          count: Number(s.count) || Number(s.questionCount) || 20
        })),
        answerKey: matchingBook.answerKey || {},
        penaltyRatio: matchingBook.penaltyRatio !== undefined ? matchingBook.penaltyRatio : 3,
        totalQuestions: subs.reduce((acc, s) => acc + (Number(s.count) || Number(s.questionCount) || 20), 0) || 90,
        pdfUrl: pdfUrl
      };
    }

    if (hw) {
      const subs = hw.subjects || matchingBook?.subjects || [];
      return {
        ...hw,
        type: 'physicalExam',
        pdfUrl: pdfUrl,
        subjects: subs.map((s, idx) => ({
          ...s,
          name: s.name || `Ders ${idx + 1}`,
          count: Number(s.count) || Number(s.questionCount) || 20
        })),
        answerKey: hw.answerKey || matchingBook?.answerKey || {},
        penaltyRatio: hw.penaltyRatio !== undefined ? hw.penaltyRatio : (matchingBook?.penaltyRatio !== undefined ? matchingBook.penaltyRatio : 3),
        totalQuestions: hw.totalQuestions || subs.reduce((acc, s) => acc + (Number(s.count) || Number(s.questionCount) || 20), 0) || 90
      };
    }

    return null;
  }, [homeworks, books, hwId]);

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
      const init = {};
      homework.subjects?.forEach(sub => {
        init[sub.name] = Array(sub.count).fill('');
      });
      setAnswers(init);
      setIsSubmitted(false);
      setResults(null);
      initializedRef.current = true;
      return;
    }

    // Check if already submitted in HomeworkContext or EvaluationContext
    const hwSub = (homework.submissions || []).find(s => String(s.studentId) === String(studentId));
    const evalSub = (evalSubmissions || []).find(s => (String(s.hwId) === String(hwId) || String(s.testId) === String(hwId)) && String(s.studentId) === String(studentId));
    const submission = hwSub || evalSub;

    if (submission) {
      setIsSubmitted(true);
      setShowOptikForm(true);
      
      let loadedAns = submission.studentAnswers || evalSub?.studentAnswers || hwSub?.studentAnswers;
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

      if (submission.subjectStats && submission.subjectStats.subjectStats) {
        calc = submission.subjectStats;
      } else if (submission.subjectStats && Array.isArray(submission.subjectStats)) {
        calc = {
          subjectStats: submission.subjectStats,
          totalNet: submission.score || calc?.totalNet || 0,
          totalCorrect: submission.correctCount || calc?.totalCorrect || 0,
          totalWrong: submission.wrongCount || calc?.totalWrong || 0,
          totalBlank: submission.blankCount || calc?.totalBlank || 0
        };
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

  const subjects = homework?.subjects || [];
  const activeSubject = subjects[activeSubjectIndex] || subjects[0];

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
        answers: []
      });
    } catch(e) {
      console.error("Failed to save to evaluation context", e);
    }

    try {
      localStorage.removeItem(draftKey);
      localStorage.removeItem(`${draftKey}_time`);
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

  const currentAnswers = answers[activeSubject?.name] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f8fafc', color: '#0f172a' }}>
      
      {/* ── HEADER ── */}
      <header style={{ 
        padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.25rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: '#ffffff', 
        borderBottom: '1.5px solid #e2e8f0',
        position: 'sticky', 
        top: 0, 
        zIndex: 10,
        flexShrink: 0,
        gap: '0.5rem',
        flexWrap: 'wrap',
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
              <ArrowLeft size={isMobile ? 18 : 22} />
            </button>
            <span style={{ fontSize: '0.62rem', fontWeight: 900, background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              FİZİKİ DENEME
            </span>
            <h2 style={{ 
              color: '#0f172a', 
              fontSize: isMobile ? '0.9rem' : '1.1rem', 
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
            <span style={{ color: '#64748b', fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 700 }}>
              {homework.examType || 'LGS / YKS'} • {homework.totalQuestions} Soru ({subjects.length} Ders)
            </span>
            {!isSubmitted && (
              <span style={{ color: '#16a34a', fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800 }}>
                • Kodlanan: {totalAnsweredCount}/{totalQuestionsCount}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          
          {/* Timer */}
          {!isSubmitted && !isTeacherReviewing && (
            <div style={{
              padding: isMobile ? '0.35rem 0.6rem' : '0.4rem 0.85rem',
              borderRadius: '0.65rem',
              background: timeLeft < 300 ? '#fef2f2' : '#ffffff',
              border: `1.5px solid ${timeLeft < 300 ? '#fecaca' : '#cbd5e1'}`,
              color: timeLeft < 300 ? '#dc2626' : '#0f172a',
              fontWeight: 900,
              fontSize: isMobile ? '0.75rem' : '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <Clock size={isMobile ? 14 : 16} color={timeLeft < 300 ? '#dc2626' : '#059669'} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          {/* PDF Mode Selector Buttons */}
          {hasPdf && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* Sol Panel (Desktop only) */}
              {!isMobile && (
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
              )}
              {/* Üst Panel */}
              <button
                onClick={() => setPdfMode('top')}
                title="Üst panele sabitle"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: isMobile ? '0.35rem' : '0.4rem 0.65rem',
                  borderRadius: '0.6rem', border: `1.5px solid ${pdfMode === 'top' ? '#2563eb' : '#cbd5e1'}`,
                  background: pdfMode === 'top' ? '#eff6ff' : '#ffffff',
                  color: pdfMode === 'top' ? '#1d4ed8' : '#475569',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <PanelTop size={isMobile ? 13 : 14} />
                {!isMobile && 'Üst Panel'}
              </button>
              {/* Yüzen Pencere */}
              <button
                onClick={() => setPdfMode('float')}
                title="Yüzen pencere"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: isMobile ? '0.35rem' : '0.4rem 0.65rem',
                  borderRadius: '0.6rem', border: `1.5px solid ${pdfMode === 'float' ? '#2563eb' : '#cbd5e1'}`,
                  background: pdfMode === 'float' ? '#eff6ff' : '#ffffff',
                  color: pdfMode === 'float' ? '#1d4ed8' : '#475569',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <Maximize2 size={isMobile ? 13 : 14} />
                {!isMobile && 'Pencere'}
              </button>
              {/* Gizle */}
              <button
                onClick={() => setPdfMode('hidden')}
                title="PDF'yi Gizle"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: isMobile ? '0.35rem' : '0.4rem 0.65rem',
                  borderRadius: '0.6rem', border: `1.5px solid ${pdfMode === 'hidden' ? '#fecaca' : '#cbd5e1'}`,
                  background: pdfMode === 'hidden' ? '#fef2f2' : '#ffffff',
                  color: pdfMode === 'hidden' ? '#dc2626' : '#64748b',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <XIcon size={isMobile ? 13 : 14} />
                {!isMobile && 'Gizle'}
              </button>
            </div>
          )}

          {/* Optik Göster / Gizle Button */}
          <button
            onClick={() => {
              const nextState = !showOptikForm;
              setShowOptikForm(nextState);
              if (nextState && isMobile) {
                setPdfMode('top');
              }
            }}
            style={{
              padding: isMobile ? '0.4rem 0.6rem' : '0.45rem 0.85rem',
              borderRadius: '0.7rem',
              background: showOptikForm ? '#eff6ff' : '#ffffff',
              border: `1.5px solid ${showOptikForm ? '#bfdbfe' : '#cbd5e1'}`,
              color: showOptikForm ? '#1d4ed8' : '#475569',
              fontWeight: 800,
              fontSize: isMobile ? '0.72rem' : '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title={showOptikForm ? "Optik Alanı Gizle (PDF'yi Tam Ekran Yap)" : "Optik Alanı Göster"}
          >
            {showOptikForm ? <EyeOff size={isMobile ? 13 : 15} /> : <Eye size={isMobile ? 13 : 15} />}
            <span>{showOptikForm ? 'Optik Gizle' : 'Optik Göster'}</span>
          </button>

          {/* Drawing Tool Button */}
          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{
              padding: isMobile ? '0.4rem 0.5rem' : '0.45rem 0.85rem',
              borderRadius: '0.7rem',
              background: isDrawingOpen ? '#fffbeb' : '#ffffff',
              border: `1.5px solid ${isDrawingOpen ? '#fde68a' : '#cbd5e1'}`,
              color: isDrawingOpen ? '#b45309' : '#475569',
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
            {!isMobile && (isDrawingOpen ? "Çizimi Kapat" : "Çizim Aracı")}
          </button>

          {/* Submit / Finish button */}
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
              {!isMobile && "Sınavı Bitir ve Gönder"}
              {isMobile && "Bitir"}
            </button>
          )}

          {isSubmitted && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 900 }}>
              <CheckCircle2 size={14} /> Sınav Tamamlandı
            </div>
          )}

        </div>
      </header>

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
      `}</style>

      {/* ── MAIN WORKSPACE: PDF (side/top) + OPTICAL AREA (scrollable) ── */}
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
        {/* LEFT/TOP: PDF panel */}
        {hasPdf && (
          <ResizablePdfPanel
            pdfUrl={homework.pdfUrl}
            title={homework.title}
            mode={effectivePdfMode}
            onModeChange={setPdfMode}
            isFullScreen={!showOptikForm}
            onToggleDrawing={() => setIsDrawingOpen(p => !p)}
            isDrawingOpen={isDrawingOpen}
          />
        )}

        {/* RIGHT/BOTTOM: Optical Form Area */}
        {showOptikForm && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0, background: '#f8fafc' }}>
            <div style={{ maxWidth: pdfMode === 'hidden' ? 1200 : undefined, width: '100%', margin: pdfMode === 'hidden' ? '0 auto' : undefined, padding: isMobile ? '0.75rem' : '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* 1. SCORECARD HERO (AFTER SUBMISSION) */}
              {isSubmitted && results && (
                <div style={{ background: '#ffffff', borderRadius: '1.25rem', padding: '1rem 1.25rem', color: '#0f172a', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)', border: '1.5px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fef3c7', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trophy size={22} color="#b45309" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Sonuç Karnesi</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>{homework.title}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0.4rem 0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#15803d' }}>{results.totalCorrect}</div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#16a34a' }}>Doğru</div>
                      </div>
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.4rem 0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#b91c1c' }}>{results.totalWrong}</div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#dc2626' }}>Yanlış</div>
                      </div>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.4rem 0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#475569' }}>{results.totalBlank}</div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b' }}>Boş</div>
                      </div>
                      <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderRadius: 12, padding: '0.4rem 1.1rem', textAlign: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{results.totalNet}</div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2, color: '#e0e7ff' }}>Toplam Net</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. SUBJECT TABS PILLS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {subjects.map((sub, idx) => {
                  const isActive = activeSubjectIndex === idx;
                  const subAns = answers[sub.name] || [];
                  const filled = subAns.filter(Boolean).length;
                  const sStat = results?.subjectStats?.find(s => s.name === sub.name);

                  return (
                    <button
                      key={sub.name}
                      type="button"
                      onClick={() => setActiveSubjectIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: isMobile ? '0.45rem 0.75rem' : '0.55rem 1rem',
                        borderRadius: '0.75rem',
                        background: isActive ? '#4f46e5' : '#ffffff',
                        border: `1.5px solid ${isActive ? '#4338ca' : '#cbd5e1'}`,
                        color: isActive ? 'white' : '#475569',
                        fontWeight: 900,
                        fontSize: isMobile ? '0.75rem' : '0.82rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 4px 12px rgba(79,70,229,0.3)' : '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                    >
                      <span>{sub.name}</span>
                      {isSubmitted && sStat ? (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: 6, fontWeight: 800 }}>
                          {sStat.net} Net
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9', padding: '1px 6px', borderRadius: 6, color: isActive ? 'white' : '#64748b', fontWeight: 800 }}>
                          {filled}/{sub.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 3. OPTICAL QUESTIONS GRID FOR ACTIVE SUBJECT */}
              {activeSubject && (
                <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: isMobile ? '1rem' : '1.25rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Subject Title Bar inside Optic Panel */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4f46e5' }} />
                      <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>
                        {activeSubject.name} — Optik Form
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                        ({activeSubject.count} Soru)
                      </span>
                    </div>

                    {isSubmitted && results && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 800 }}>
                        <span style={{ color: '#15803d' }}>
                          {results.subjectStats.find(s => s.name === activeSubject.name)?.correct} D
                        </span>
                        <span style={{ color: '#b91c1c' }}>
                          {results.subjectStats.find(s => s.name === activeSubject.name)?.wrong} Y
                        </span>
                        <span style={{ color: '#475569' }}>
                          {results.subjectStats.find(s => s.name === activeSubject.name)?.blank} B
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bubble rows grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                    {Array.from({ length: activeSubject.count }).map((_, qIdx) => {
                      const qNo = qIdx + 1;
                      const selected = currentAnswers[qIdx];
                      
                      let isCorrect = false;
                      let isWrong = false;
                      let correctKey = '';

                      if (isSubmitted) {
                        correctKey = homework.answerKey?.[activeSubject.name]?.[qIdx] || '';
                        isCorrect = selected && selected === correctKey;
                        isWrong = selected && selected !== correctKey;
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
                            background: selected ? '#eff6ff' : '#f8fafc',
                            padding: '0.75rem 0.85rem',
                            borderRadius: '0.85rem',
                            border: isCorrect ? '1.5px solid #bbf7d0' : isWrong ? '1.5px solid #fecaca' : selected ? '1.5px solid #93c5fd' : '1.5px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 65 }}>
                            <span style={{
                              fontWeight: 900,
                              fontSize: '0.82rem',
                              color: isCorrect ? '#15803d' : isWrong ? '#b91c1c' : '#0f172a'
                            }}>
                              Soru {qNo}
                            </span>
                            {isSubmitted && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: isCorrect ? '#15803d' : isWrong ? '#b91c1c' : '#64748b' }}>
                                {isCorrect ? '✓' : isWrong ? `(${correctKey})` : `—`}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '0.35rem', flex: 1, justifyContent: 'flex-end' }}>
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
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    fontWeight: 900,
                                    fontSize: '0.8rem',
                                    cursor: isSubmitted ? 'default' : 'pointer',
                                    border: isSelected ? 'none' : isSubmitted && isThisOptCorrect ? '2px solid #16a34a' : '1.5px solid #cbd5e1',
                                    background: isSubmitted && isThisOptCorrect ? '#16a34a' : isSubmitted && isSelected && isWrong ? '#dc2626' : isSelected ? '#4f46e5' : '#ffffff',
                                    color: isSelected || (isSubmitted && isThisOptCorrect) ? 'white' : '#334155',
                                    transition: 'all 0.12s ease',
                                    boxShadow: isSelected ? '0 2px 8px rgba(79,70,229,0.3)' : 'none'
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
                                  background: 'none',
                                  border: 'none',
                                  color: selected ? '#dc2626' : 'transparent',
                                  cursor: selected ? 'pointer' : 'default',
                                  padding: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  pointerEvents: selected ? 'auto' : 'none'
                                }}
                              >
                                <XIcon size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center', padding: '2rem', background: '#ffffff', borderRadius: '1.5rem', border: '1.5px solid #e2e8f0', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '1rem', color: '#0f172a', margin: '1rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <CheckCircle2 size={30} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>Sınavı Bitiriyorsunuz</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Tüm cevaplarınızı optik forma doğru geçirdiğinizden emin misiniz? Gönderdikten sonra optik form kilitlenecektir.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setShowFinishModal(false)}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '0.75rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#475569', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
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

            {/* Header with subject selector */}
            <div style={{
              padding: '1rem 1.25rem',
              background: '#ffffff',
              borderBottom: '1.5px solid #e2e8f0',
              display: 'flex', flexDirection: 'column', gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                    📝 Optik Cevap Formu
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                    Toplam {totalAnsweredCount}/{totalQuestionsCount} soru kodlandı
                  </p>
                </div>
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
                        background: isActive ? '#4f46e5' : '#f8fafc',
                        border: `1.5px solid ${isActive ? '#4338ca' : '#cbd5e1'}`,
                        color: isActive ? 'white' : '#64748b',
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
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
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

                  return (
                    <div key={qNo} style={{ background: '#ffffff', padding: '0.75rem 0.85rem', borderRadius: '0.75rem', border: selected ? '1.5px solid #93c5fd' : '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#0f172a', minWidth: 60 }}>
                        Soru {qNo}
                      </span>

                      <div style={{ display: 'flex', gap: '0.35rem', flex: 1, maxWidth: 260 }}>
                        {optionsList.map((opt) => {
                          const isSelected = selected === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleOptionClick(activeSubject.name, qIdx, opt)}
                              style={{
                                flex: 1, height: 36, borderRadius: '50%',
                                fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer',
                                border: isSelected ? '2px solid #4338ca' : '1.5px solid #cbd5e1',
                                background: isSelected ? '#4f46e5' : '#ffffff',
                                color: isSelected ? 'white' : '#334155',
                                transition: 'all 0.12s'
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

            {/* Footer */}
            <div style={{ padding: '0.75rem 1.25rem', background: '#ffffff', borderTop: '1.5px solid #e2e8f0' }}>
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
