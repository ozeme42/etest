import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useAuth } from '../context/AuthContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { 
  ArrowLeft, CheckCircle2, AlertCircle, BookOpen, Clock, 
  Send, X, LayoutTemplate, Trophy, Award, BarChart3, ListTree, 
  Sparkles, Target, Zap, Check, HelpCircle, Info, Layers,
  ChevronRight, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import PdfViewerPanel from '../components/PdfViewerPanel';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function PhysicalExamRunner() {
  const { hwId } = useParams();
  const navigate = useNavigate();
  const { homeworks, submitHomework } = useHomework();
  const { currentUser } = useAuth();
  const { submissions: evalSubmissions, addSubmission } = useEvaluation();
  const { users } = useUser();
  
  // Optional: Extract studentId from URL if teacher is viewing, otherwise use currentUser
  const queryParams = new URLSearchParams(window.location.search);
  const paramStudentId = queryParams.get('studentId');
  const isRetake = queryParams.get('retake') === 'true';
  const studentId = paramStudentId || currentUser?.id;

  const currentViewingStudent = users.find(u => u.id === studentId);
  const isTeacherReviewing = currentUser?.role !== 'student' && paramStudentId && paramStudentId !== currentUser?.id;
  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin' || currentUser?.role === 'coordinator' || isTeacherReviewing;

  const homework = homeworks.find(h => h.id === hwId);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [showPdf, setShowPdf] = useState(() => Boolean(homework?.pdfUrl));
  const isSubmittingRef = useRef(false);
  
  // Student answers state: { "Türkçe": ["A", "B", "", "C", ...], "Matematik": [...] }
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerStarted, setTimerStarted] = useState(false);

  const draftKey = `draft_physical_exam_${hwId}_${studentId}`;

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

  // Load existing submission or draft
  useEffect(() => {
    if (!homework) return;

    if (isRetake) {
      localStorage.removeItem(draftKey);
      const init = {};
      homework.subjects?.forEach(sub => {
        init[sub.name] = Array(sub.count).fill('');
      });
      setAnswers(init);
      setIsSubmitted(false);
      setResults(null);
      return;
    }

    // Check if already submitted in HomeworkContext or EvaluationContext
    const hwSub = (homework.submissions || []).find(s => s.studentId === studentId);
    const evalSub = (evalSubmissions || []).find(s => (s.hwId === hwId || s.testId === hwId) && s.studentId === studentId);
    const submission = hwSub || evalSub;

    if (submission) {
      setIsSubmitted(true);
      
      // Try to recover student answers from all possible sources
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

      // If no answers exist, initialize empty answers for all subjects
      if (!loadedAns || Object.keys(loadedAns).length === 0) {
        loadedAns = {};
        homework.subjects?.forEach(sub => {
          loadedAns[sub.name] = Array(sub.count).fill('');
        });
      }

      setAnswers(loadedAns);

      // Calculate fresh comprehensive results from answers
      let calc = calculateResults(loadedAns);

      // If submission had saved subjectStats, ensure they are structured
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
    } else {
      const draftStr = localStorage.getItem(draftKey);
      if (draftStr) {
        try {
          setAnswers(JSON.parse(draftStr));
          return;
        } catch(e) {
          console.error("Draft parse error", e);
        }
      }
      // Initialize empty answers
      const init = {};
      homework.subjects?.forEach(sub => {
        init[sub.name] = Array(sub.count).fill('');
      });
      setAnswers(init);
    }
  }, [hwId, studentId, isRetake]);

  useEffect(() => {
    if (homework && !isSubmitted && !timerStarted && !isTeacherReviewing) {
      const durationMinutes = (homework.timePerQuestion || 2) * (homework.totalQuestions || 90);
      setTimeLeft(durationMinutes * 60);
      setTimerStarted(true);
    }
  }, [homework, isSubmitted, timerStarted, isTeacherReviewing]);

  useEffect(() => {
    if (isSubmitted || timeLeft === null || timeLeft <= 0 || isTeacherReviewing) return;
    const intervalId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft, isSubmitted, isTeacherReviewing]);

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isSubmitted && Object.keys(answers).length > 0 && !isTeacherReviewing) {
      localStorage.setItem(draftKey, JSON.stringify(answers));
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
    if (isSubmitted || isTeacherReviewing) return; // cannot edit after submission or if reviewing as teacher
    setAnswers(prev => {
      const list = prev[subjectName] ? [...prev[subjectName]] : [];
      const subObj = (homework.subjects || []).find(s => s.name === subjectName);
      const targetLength = subObj?.count || (qIndex + 1);
      while (list.length < targetLength) {
        list.push('');
      }
      list[qIndex] = list[qIndex] === option ? '' : option; // toggle
      return { ...prev, [subjectName]: list };
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
      return { ...prev, [subjectName]: list };
    });
  };

  const handleSubmit = () => {
    if (isSubmittingRef.current) return;
    if (isTeacherReviewing) return;
    if (!window.confirm("Cevaplarınızı göndermek istediğinize emin misiniz? Gönderdikten sonra optik form kilitlenecektir.")) return;
    
    isSubmittingRef.current = true;
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
      addSubmission({
        testId: hwId,
        hwId: hwId,
        testTitle: homework.title,
        studentId: studentId,
        score: calculated.totalNet,
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

    localStorage.removeItem(draftKey);
    setResults(calculated);
    setIsSubmitted(true);
  };

  if (!homework || homework.type !== 'physicalExam') {
    return (
      <div className="max-w-xl mx-auto p-12 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Fiziki Deneme Bulunamadı</h2>
        <p className="text-sm text-slate-500">Aradığınız deneme mevcut değil veya silinmiş olabilir.</p>
        <button 
          onClick={() => navigate(-1)} 
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all"
        >
          Geri Dön
        </button>
      </div>
    );
  }

  // Fallback if activeSubject is missing
  if (!activeSubject) return null;
  const currentAnswers = answers[activeSubject.name] || [];

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-10 py-5 sm:py-8 space-y-6 lg:space-y-8 pb-32">
      
      {/* TEACHER INSPECTION BANNER */}
      {isTeacherReviewing && currentViewingStudent && (
        <div className="bg-indigo-50/90 dark:bg-indigo-950/60 backdrop-blur-md border-2 border-indigo-200 dark:border-indigo-800 p-4 sm:p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-lg shadow-md shrink-0">
              {currentViewingStudent.name?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-3 py-0.5 rounded-lg">
                  Öğretmen İnceleme Modu
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {isSubmitted ? '🟢 Sınav Tamamlandı' : '⏳ Henüz Göndermedi'}
                </span>
              </div>
              <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                {currentViewingStudent.name} isimli öğrencinin optik formunu ve karnesini inceliyorsunuz
              </div>
            </div>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-black rounded-2xl text-slate-700 dark:text-slate-200 transition-colors shrink-0 cursor-pointer"
          >
            ← Geri Dön
          </button>
        </div>
      )}

      {/* 1. ÜST BAŞLIK BAR (HEADER - KOMPAKT) */}
      <div className="bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          {/* Left: Back + Title + Tags */}
          <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
              title="Geri Dön"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                  FİZİKİ DENEME
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
                  {homework.examType || 'LGS / YKS'}
                </span>
                <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                  {homework.totalQuestions} Soru
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                {homework.title}
              </h1>
            </div>
          </div>

          {/* Right: Timer + Live Progress / Status + Submit Action */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end shrink-0">
            
            {/* Live Progress or Timer */}
            {!isSubmitted && !isTeacherReviewing ? (
              <div className="flex items-center gap-2">
                {/* Progress Pill */}
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">İşaretlenen:</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">
                    {totalAnsweredCount}/{totalQuestionsCount} (%{progressPercent})
                  </span>
                </div>

                {/* Compact Timer */}
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs border shadow-xs transition-all",
                  timeLeft !== null && timeLeft < 300 
                    ? "bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950/50 dark:border-rose-900" 
                    : "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                )}>
                  <Clock className={cn("w-3.5 h-3.5", timeLeft !== null && timeLeft < 300 && "animate-pulse text-rose-500")} />
                  <span className="font-mono tracking-wider text-sm">{formatTime(timeLeft)}</span>
                </div>
              </div>
            ) : null}

            {/* Action Buttons */}
            {isTeacherReviewing && !isSubmitted ? (
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-black text-xs flex items-center gap-1.5 border border-amber-200 dark:border-amber-800 shadow-xs">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Öğrenci Henüz Göndermedi
              </div>
            ) : !isSubmitted ? (
              <div className="flex items-center gap-2">
                {homework.pdfUrl && (
                  <button
                    onClick={() => setShowPdf(p => !p)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs border transition-all cursor-pointer",
                      showPdf
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 hover:bg-blue-50"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {showPdf ? 'PDF Kapat' : 'PDF Görüntüle'}
                  </button>
                )}
                <button 
                  onClick={handleSubmit}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Gönder
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-black text-xs flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sınav Tamamlandı
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Global Progress Bar when solving */}
        {!isSubmitted && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>Optik Doluluk Oranı</span>
              <span className="font-black text-indigo-600 dark:text-indigo-400">{totalAnsweredCount} / {totalQuestionsCount} Soru (%{progressPercent})</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. ÜSTTE KARNE (KOMPAKT SCORECARD HERO) */}
      {isSubmitted && results && (
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-lg relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Left: Title & Info */}
            <div className="flex items-center gap-3.5 w-full lg:w-auto">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
                <Trophy className="w-5 h-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                    Sonuç Karnesi
                  </span>
                  <span className="text-xs text-indigo-200 font-bold">
                    {homework.examType || 'LGS / YKS'} • {homework.totalQuestions} Soru
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                  {homework.title}
                </h2>
              </div>
            </div>

            {/* Middle: Compact Stats 4-Pills */}
            <div className="grid grid-cols-4 gap-2 w-full lg:w-auto flex-1 max-w-md">
              <div className="bg-white/10 rounded-xl px-2.5 py-1.5 text-center border border-white/10">
                <div className="text-base sm:text-lg font-black text-emerald-300 leading-tight">{results.totalCorrect}</div>
                <div className="text-[9px] font-bold uppercase text-indigo-100">Doğru</div>
              </div>
              <div className="bg-white/10 rounded-xl px-2.5 py-1.5 text-center border border-white/10">
                <div className="text-base sm:text-lg font-black text-rose-300 leading-tight">{results.totalWrong}</div>
                <div className="text-[9px] font-bold uppercase text-indigo-100">Yanlış</div>
              </div>
              <div className="bg-white/10 rounded-xl px-2.5 py-1.5 text-center border border-white/10">
                <div className="text-base sm:text-lg font-black text-amber-300 leading-tight">{results.totalBlank}</div>
                <div className="text-[9px] font-bold uppercase text-indigo-100">Boş</div>
              </div>
              <div className="bg-white/10 rounded-xl px-2.5 py-1.5 text-center border border-white/10">
                <div className="text-base sm:text-lg font-black text-cyan-300 leading-tight">
                  %{homework.totalQuestions > 0 ? Math.round((results.totalCorrect / homework.totalQuestions) * 100) : 0}
                </div>
                <div className="text-[9px] font-bold uppercase text-indigo-100">Başarı</div>
              </div>
            </div>

            {/* Right: Net Score Box */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-center lg:justify-end">
              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-2.5 text-center shrink-0 shadow-inner">
                <div className="text-2xl sm:text-3xl font-black text-emerald-300 leading-none">
                  {results.totalNet}
                </div>
                <div className="text-[9px] font-black uppercase tracking-wider text-indigo-100 mt-0.5">
                  Toplam Net
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PDF VIEWER - collapsible, shown when pdfUrl present */}
      {homework.pdfUrl && showPdf && (
        <PdfViewerPanel
          pdfUrl={homework.pdfUrl}
          title={homework.title}
          defaultOpen={true}
          className="w-full"
        />
      )}

      {/* 3. ALT BÖLÜM: MASAÜSTÜNDE 2 SÜTUN (SOLDA DERS LİSTESİ - SAĞDA OPTİK), MOBİLDE KLASİK VE KOMPAKT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
        
        {/* SOL KOLON: MASAÜSTÜNDE DERS BAZLI SONUÇ TABLOSU (TEK TABLO) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  {isSubmitted ? 'Ders Bazlı Sonuç Tablosu' : 'Sınav Dersleri'}
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  {isSubmitted ? 'Optik formunu incelemek için derse tıklayın' : 'Doldurmak istediğiniz dersi seçin'}
                </p>
              </div>
              <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-xl">
                {subjects.length} Ders
              </span>
            </div>

            {/* TEK BİRLEŞİK DERS TABLOSU */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                      <th className="py-2.5 px-3">Ders</th>
                      <th className="py-2.5 px-1.5 text-center">Soru</th>
                      {isSubmitted ? (
                        <>
                          <th className="py-2.5 px-1.5 text-center text-emerald-600 dark:text-emerald-400">D</th>
                          <th className="py-2.5 px-1.5 text-center text-rose-600 dark:text-rose-400">Y</th>
                          <th className="py-2.5 px-1.5 text-center text-amber-600 dark:text-amber-400">B</th>
                          <th className="py-2.5 px-2 text-right text-indigo-600 dark:text-indigo-400 font-black">Net</th>
                          <th className="py-2.5 px-2 text-center">Başarı</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2.5 px-2 text-center">Dolu</th>
                          <th className="py-2.5 px-2 text-right">Oran</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {subjects.map((sub, idx) => {
                      const isActive = activeSubjectIndex === idx;
                      const subAns = answers[sub.name] || [];
                      const filled = subAns.filter(Boolean).length;
                      const sStat = results?.subjectStats?.find(s => s.name === sub.name);
                      const pct = sStat && sub.count > 0 ? Math.round((sStat.correct / sub.count) * 100) : (sub.count > 0 ? Math.round((filled / sub.count) * 100) : 0);

                      return (
                        <tr
                          key={sub.name}
                          onClick={() => setActiveSubjectIndex(idx)}
                          className={cn(
                            "transition-colors cursor-pointer select-none",
                            isActive 
                              ? "bg-indigo-50/90 dark:bg-indigo-950/50 font-bold" 
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          )}
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "w-2 h-2 rounded-full shrink-0 transition-transform",
                                isActive ? "bg-indigo-600 scale-125" : "bg-slate-300 dark:bg-slate-600"
                              )} />
                              <span className={cn("truncate", isActive && "text-indigo-600 dark:text-indigo-400 font-black")}>
                                {sub.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-1.5 text-center font-bold text-slate-600 dark:text-slate-400">
                            {sub.count}
                          </td>
                          {isSubmitted ? (
                            <>
                              <td className="py-2.5 px-1.5 text-center font-black text-emerald-600 dark:text-emerald-400">
                                {sStat?.correct ?? 0}
                              </td>
                              <td className="py-2.5 px-1.5 text-center font-black text-rose-600 dark:text-rose-400">
                                {sStat?.wrong ?? 0}
                              </td>
                              <td className="py-2.5 px-1.5 text-center font-bold text-amber-600 dark:text-amber-400">
                                {sStat?.blank ?? 0}
                              </td>
                              <td className="py-2.5 px-2 text-right font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                {sStat ? sStat.net : 0}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span className={cn(
                                  "text-[10px] font-black px-1.5 py-0.5 rounded-md",
                                  pct >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                                  pct >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
                                  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                )}>
                                  %{pct}
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2.5 px-2 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                {filled}
                              </td>
                              <td className="py-2.5 px-2 text-right font-black text-slate-600 dark:text-slate-300">
                                %{pct}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  {isSubmitted && results && (
                    <tfoot>
                      <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-t-2 border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white">
                        <td className="py-3 px-3 uppercase text-[10px] tracking-wider font-black">
                          TOPLAM
                        </td>
                        <td className="py-3 px-1.5 text-center font-black">
                          {homework.totalQuestions}
                        </td>
                        <td className="py-3 px-1.5 text-center text-emerald-600 dark:text-emerald-400 font-black">
                          {results.totalCorrect}
                        </td>
                        <td className="py-3 px-1.5 text-center text-rose-600 dark:text-rose-400 font-black">
                          {results.totalWrong}
                        </td>
                        <td className="py-3 px-1.5 text-center text-amber-600 dark:text-amber-400 font-black">
                          {results.totalBlank}
                        </td>
                        <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400 text-sm font-black">
                          {results.totalNet}
                        </td>
                        <td className="py-3 px-2 text-center font-black">
                          <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-md font-black">
                            %{homework.totalQuestions > 0 ? Math.round((results.totalCorrect / homework.totalQuestions) * 100) : 0}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Quick Links */}
            <div className="pt-1 flex flex-col gap-2">
              <button
                onClick={() => navigate('/student-results')}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ListTree className="w-4 h-4 text-indigo-500" /> Tüm Sınav Sonuçlarıma Git
              </button>
            </div>

          </div>
        </div>

        {/* SAĞ KOLON: OPTİK FORM & MOBİL GÖRÜNÜM TABS */}
        <div className="w-full lg:col-span-7 xl:col-span-7 space-y-4">
          
          {/* MOBİLDE DERS BAZLI SONUÇ TABLOSU AKORDİYONU */}
          {isSubmitted && results && (
            <div className="block lg:hidden bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs transition-all">
              <button
                type="button"
                onClick={() => setShowMobileStats(!showMobileStats)}
                className="w-full flex items-center justify-between text-xs font-black text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Ders Bazlı Sonuç Tablosu ({subjects.length} Ders)</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-[10px] font-bold">{showMobileStats ? 'Kapat' : 'Genişlet'}</span>
                  {showMobileStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showMobileStats && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 overflow-hidden rounded-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                          <th className="py-2 px-2.5">Ders</th>
                          <th className="py-2 px-1 text-center">Soru</th>
                          <th className="py-2 px-1 text-center text-emerald-600">D</th>
                          <th className="py-2 px-1 text-center text-rose-600">Y</th>
                          <th className="py-2 px-1 text-center text-amber-600">B</th>
                          <th className="py-2 px-1.5 text-right font-black text-indigo-600">Net</th>
                          <th className="py-2 px-1 text-center">Başarı</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {subjects.map((sub, idx) => {
                          const isActive = activeSubjectIndex === idx;
                          const sStat = results?.subjectStats?.find(s => s.name === sub.name);
                          const pct = sStat && sub.count > 0 ? Math.round((sStat.correct / sub.count) * 100) : 0;

                          return (
                            <tr
                              key={sub.name}
                              onClick={() => setActiveSubjectIndex(idx)}
                              className={cn(
                                "transition-colors cursor-pointer select-none",
                                isActive ? "bg-indigo-50/90 dark:bg-indigo-950/50 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                              )}
                            >
                              <td className="py-2 px-2.5 font-bold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">
                                {sub.name}
                              </td>
                              <td className="py-2 px-1 text-center text-slate-500 font-bold">{sub.count}</td>
                              <td className="py-2 px-1 text-center font-black text-emerald-600">{sStat?.correct ?? 0}</td>
                              <td className="py-2 px-1 text-center font-black text-rose-600">{sStat?.wrong ?? 0}</td>
                              <td className="py-2 px-1 text-center font-bold text-amber-600">{sStat?.blank ?? 0}</td>
                              <td className="py-2 px-1.5 text-right font-black text-indigo-600">{sStat ? sStat.net : 0}</td>
                              <td className="py-2 px-1 text-center font-black text-[10px]">%{pct}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-t-2 border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white text-[11px]">
                          <td className="py-2.5 px-2.5 uppercase font-black">TOPLAM</td>
                          <td className="py-2.5 px-1 text-center">{homework.totalQuestions}</td>
                          <td className="py-2.5 px-1 text-center text-emerald-600">{results.totalCorrect}</td>
                          <td className="py-2.5 px-1 text-center text-rose-600">{results.totalWrong}</td>
                          <td className="py-2.5 px-1 text-center text-amber-600">{results.totalBlank}</td>
                          <td className="py-2.5 px-1.5 text-right text-emerald-600 font-black">{results.totalNet}</td>
                          <td className="py-2.5 px-1 text-center font-black">
                            %{homework.totalQuestions > 0 ? Math.round((results.totalCorrect / homework.totalQuestions) * 100) : 0}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MOBİLDE YATAY KAYDIRILABİLİR DERS TABS (KLASİK & KOMPAKT) */}
          <div className="block lg:hidden">
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
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
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all shrink-0 cursor-pointer shadow-xs active:scale-95",
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                    )}
                  >
                    <span>{sub.name}</span>
                    {isSubmitted && sStat ? (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
                        isActive ? "bg-white/25 text-white" : "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                      )}>
                        {sStat.net} Net
                      </span>
                    ) : (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
                        isActive ? "bg-white/25 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                      )}>
                        {filled}/{sub.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-7 lg:p-8 shadow-sm space-y-5">
            
            {/* Header of Active Subject */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-md">
                    Optik Form
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    {activeSubject.count} Soru
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 mt-1">
                  <LayoutTemplate className="w-6 h-6 text-indigo-500" /> {activeSubject.name}
                </h3>
              </div>

              {isSubmitted && results && (
                <div className="flex items-center gap-2 text-xs font-black px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {results.subjectStats.find(s => s.name === activeSubject.name)?.correct} Doğru
                  </span>
                  <span>•</span>
                  <span className="text-rose-600 dark:text-rose-400">
                    {results.subjectStats.find(s => s.name === activeSubject.name)?.wrong} Yanlış
                  </span>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {results.subjectStats.find(s => s.name === activeSubject.name)?.blank} Boş
                  </span>
                </div>
              )}
            </div>

            {/* Questions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3.5">
              {Array.from({ length: activeSubject.count }).map((_, qIdx) => {
                const selected = currentAnswers[qIdx];
                
                let isCorrect = false;
                let isWrong = false;
                let correctKey = '';

                if (isSubmitted) {
                  correctKey = homework.answerKey?.[activeSubject.name]?.[qIdx] || '';
                  isCorrect = selected && selected === correctKey;
                  isWrong = selected && selected !== correctKey;
                }

                const optionsList = (activeSubject.options && activeSubject.options.length > 0) 
                  ? activeSubject.options 
                  : (homework.examType === 'LGS' ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E']);

                return (
                  <div 
                    key={qIdx}
                    className={cn(
                      'flex items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl border transition-all w-full shadow-sm hover:shadow-md',
                      isCorrect ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-400/20' :
                      isWrong ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 ring-1 ring-rose-400/20' :
                      selected ? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60' :
                      'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700/80 hover:border-indigo-300'
                    )}
                  >
                    {/* Question Number & Status */}
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-sm transition-all",
                        isCorrect ? "bg-emerald-500 text-white" :
                        isWrong ? "bg-rose-500 text-white" :
                        selected ? "bg-indigo-600 text-white" :
                        "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      )}>
                        {qIdx + 1}
                      </span>
                      {isSubmitted && (
                        <span className={cn(
                          'text-[10px] font-black uppercase px-2 py-0.5 rounded-lg whitespace-nowrap',
                          isCorrect ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          isWrong ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 
                          'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        )}>
                          {isCorrect ? 'Doğru' : isWrong ? `Cevap: ${correctKey}` : `Boş (${correctKey})`}
                        </span>
                      )}
                    </div>
                    
                    {/* Optical Option Circles */}
                    <div className="flex items-center gap-1.5">
                      {optionsList.map(opt => {
                        const isSelected = selected === opt;
                        const isThisOptCorrect = isSubmitted && correctKey === opt;

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleOptionClick(activeSubject.name, qIdx, opt)}
                            disabled={isSubmitted}
                            className={cn(
                              'w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full border-2 text-xs font-black transition-all flex items-center justify-center cursor-pointer select-none',
                              !isSubmitted && isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-110' :
                              !isSubmitted && !isSelected ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-indigo-500 hover:text-indigo-600 hover:scale-105 active:scale-95' :
                              isSubmitted && isThisOptCorrect ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-110' :
                              isSubmitted && isSelected && isWrong ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/30' :
                              'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 opacity-40 cursor-not-allowed'
                            )}
                          >
                            {opt}
                          </button>
                        );
                      })}

                      {/* Clear Button */}
                      {!isSubmitted && (
                        <button
                          type="button"
                          onClick={() => handleClearOption(activeSubject.name, qIdx)}
                          disabled={!selected}
                          title="İşareti Kaldır"
                          className={cn(
                            "p-1 rounded-lg transition-colors cursor-pointer ml-0.5",
                            selected ? "text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" : "opacity-0 pointer-events-none"
                          )}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
