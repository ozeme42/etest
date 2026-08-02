import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, CheckCircle2, AlertCircle, BookOpen, Clock, 
  Send, X, LayoutTemplate
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
  const { currentUser } = useAuth();
  
  // Optional: Extract studentId from URL if teacher is viewing, otherwise use currentUser
  const queryParams = new URLSearchParams(window.location.search);
  const paramStudentId = queryParams.get('studentId');
  const studentId = paramStudentId || currentUser?.id;

  const homework = homeworks.find(h => h.id === hwId);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  
  // Student answers state: { "Türkçe": ["A", "B", "", "C", ...], "Matematik": [...] }
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerStarted, setTimerStarted] = useState(false);

  useEffect(() => {
    if (homework && !isSubmitted && !timerStarted) {
      const durationMinutes = (homework.timePerQuestion || 2) * (homework.totalQuestions || 90);
      setTimeLeft(durationMinutes * 60);
      setTimerStarted(true);
    }
  }, [homework, isSubmitted, timerStarted]);

  useEffect(() => {
    if (isSubmitted || timeLeft === null || timeLeft <= 0) return;
    const intervalId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft, isSubmitted]);

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const draftKey = `draft_physical_exam_${hwId}_${studentId}`;

  useEffect(() => {
    if (homework && !isSubmitted) {
      // Check if already submitted
      const submission = (homework.submissions || []).find(s => s.studentId === studentId);
      if (submission) {
        setIsSubmitted(true);
        setResults(submission.subjectStats);
        setAnswers(submission.studentAnswers || {});
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
    }
  }, [homework, studentId, isSubmitted, draftKey]);

  useEffect(() => {
    if (!isSubmitted && Object.keys(answers).length > 0) {
      localStorage.setItem(draftKey, JSON.stringify(answers));
    }
  }, [answers, isSubmitted, draftKey]);

  if (!homework || homework.type !== 'physicalExam') {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Fiziki deneme bulunamadı.</h2>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">Geri Dön</button>
      </div>
    );
  }

  const subjects = homework.subjects || [];
  const activeSubject = subjects[activeSubjectIndex];

  const handleOptionClick = (subjectName, qIndex, option) => {
    if (isSubmitted) return; // cannot edit after submission
    setAnswers(prev => {
      const list = [...(prev[subjectName] || [])];
      list[qIndex] = list[qIndex] === option ? '' : option; // toggle
      return { ...prev, [subjectName]: list };
    });
  };

  const handleClearOption = (subjectName, qIndex) => {
    if (isSubmitted) return;
    setAnswers(prev => {
      const list = [...(prev[subjectName] || [])];
      list[qIndex] = '';
      return { ...prev, [subjectName]: list };
    });
  };

  const calculateResults = () => {
    const penaltyRatio = homework.penaltyRatio || 3;
    let grandTotalCorrect = 0;
    let grandTotalWrong = 0;
    let grandTotalBlank = 0;
    const subjectStats = [];

    subjects.forEach(sub => {
      let correct = 0;
      let wrong = 0;
      let blank = 0;
      
      const subAns = answers[sub.name] || [];
      const subKey = homework.answerKey[sub.name] || [];

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
      const net = Math.max(0, Number(rawNet.toFixed(2))); // Optional: don't allow negative net per subject, or allow it

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
  };

  const handleSubmit = () => {
    if (!window.confirm("Cevaplarını göndermek istediğine emin misin? Gönderdikten sonra değiştiremezsin.")) return;
    
    const calculated = calculateResults();
    
    // Save to HomeworkContext
    // we need to pass a payload to submitHomework
    // Wait, the existing submitHomework takes (hwId, studentId, score, totalQuestions)
    // We should probably just pass the net as score. But we can also pass extra data.
    
    submitHomework(hwId, studentId, calculated.totalNet, homework.totalQuestions, {
      subjectStats: calculated,
      studentAnswers: answers
    });

    localStorage.removeItem(draftKey);
    setResults(calculated);
    setIsSubmitted(true);
  };

  // Safe checks
  if (!activeSubject) return null;
  const currentAnswers = answers[activeSubject.name] || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                FİZİKİ DENEME
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md">
                {homework.examType}
              </span>
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              {homework.title}
            </h1>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-3 sm:mt-0 w-full sm:w-auto">
          {!isSubmitted && (
            <div className={cn(
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm flex-1 sm:flex-none border",
              timeLeft !== null && timeLeft < 300 
                ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900" 
                : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            )}>
              <Clock className={cn("w-4 h-4", timeLeft !== null && timeLeft < 300 && "animate-pulse")} />
              {formatTime(timeLeft)}
            </div>
          )}

          {!isSubmitted && (
            <button 
              onClick={handleSubmit}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Gönder ve Sonucu Gör
            </button>
          )}
        </div>
      </div>

      {isSubmitted && results && (
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-white/20 pb-4">
            <h2 className="text-xl font-black flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" /> Sınav Sonuçların
            </h2>
            <div className="text-right">
              <div className="text-3xl font-black text-emerald-400 leading-none">{results.totalNet}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mt-1">Toplam Net</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
              <div className="text-2xl font-black text-emerald-400">{results.totalCorrect}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Doğru</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
              <div className="text-2xl font-black text-rose-400">{results.totalWrong}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Yanlış</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
              <div className="text-2xl font-black text-amber-400">{results.totalBlank}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Boş</div>
            </div>
          </div>
        </div>
      )}

      {/* SUBJECTS & OPTICAL FORM */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* LEFT: SUBJECT TABS */}
        <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Dersler</h3>
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {subjects.map((sub, idx) => {
              const active = activeSubjectIndex === idx;
              const subAns = answers[sub.name] || [];
              const filled = subAns.filter(Boolean).length;
              
              let resultPill = null;
              if (isSubmitted && results) {
                const sStat = results.subjectStats.find(s => s.name === sub.name);
                if (sStat) {
                  resultPill = <span className="text-[10px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full">{sStat.net} N</span>;
                }
              }

              return (
                <button
                  key={sub.name}
                  onClick={() => setActiveSubjectIndex(idx)}
                  className={cn(
                    'text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-between gap-3 border',
                    active 
                      ? 'bg-white dark:bg-[#1E293B] border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <span className="truncate">{sub.name}</span>
                  {isSubmitted ? resultPill : (
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md', active ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-500')}>
                      {filled}/{sub.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: BUBBLES */}
        <div className="flex-1 p-5 md:p-8 bg-slate-50/30 dark:bg-transparent">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-indigo-500" /> {activeSubject.name}
            </h3>
            {isSubmitted && results && (
              <div className="text-xs font-black px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {results.subjectStats.find(s => s.name === activeSubject.name)?.correct}D {results.subjectStats.find(s => s.name === activeSubject.name)?.wrong}Y
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {Array.from({ length: activeSubject.count }).map((_, qIdx) => {
              const selected = currentAnswers[qIdx];
              
              let isCorrect = false;
              let isWrong = false;
              let correctKey = '';

              if (isSubmitted) {
                correctKey = homework.answerKey[activeSubject.name]?.[qIdx] || '';
                isCorrect = selected && selected === correctKey;
                isWrong = selected && selected !== correctKey;
              }

              return (
                <div 
                  key={qIdx}
                  className={cn(
                    'flex items-center justify-between gap-3 p-3 sm:p-2.5 rounded-2xl border transition-all w-full',
                    isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' :
                    isWrong ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' :
                    'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    {isSubmitted && (
                      <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-md', isCorrect ? 'bg-emerald-500 text-white' : isWrong ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500')}>
                        {isCorrect ? 'Doğru' : isWrong ? `Yanlış (Cevap: ${correctKey})` : `Boş (Cevap: ${correctKey})`}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 flex items-center justify-between sm:justify-end sm:gap-1.5 pl-2 sm:pl-0">
                    {activeSubject.options.map(opt => {
                      const isSelected = selected === opt;
                      // When submitted, we can show what they selected and what was correct
                      const isThisOptCorrect = isSubmitted && correctKey === opt;

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleOptionClick(activeSubject.name, qIdx, opt)}
                          disabled={isSubmitted}
                          className={cn(
                            'w-8 h-8 rounded-full border text-xs font-black transition-all flex items-center justify-center',
                            !isSubmitted && isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm scale-110' :
                            !isSubmitted && !isSelected ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-500' :
                            isSubmitted && isThisOptCorrect ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm scale-110' :
                            isSubmitted && isSelected && isWrong ? 'bg-rose-500 border-rose-500 text-white shadow-sm' :
                            'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleClearOption(activeSubject.name, qIdx)}
                      disabled={isSubmitted || !selected}
                      className={cn(
                        "ml-1 p-1 transition-colors",
                        !isSubmitted && selected ? "text-slate-300 hover:text-rose-500" : "opacity-0 pointer-events-none"
                      )}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
