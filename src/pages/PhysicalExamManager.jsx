import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck, CheckCircle2, AlertCircle, Trash2, Plus, Sparkles,
  BookOpen, Calculator, FileText, Check, X, RefreshCw, ChevronRight,
  TrendingUp, Trophy, Layers, Award, FileCode2, Copy, ArrowRight, CornerDownRight, BarChart3
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useCoaching } from '../context/CoachingContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const EXAM_PRESETS = {
  LGS: {
    title: '🎓 LGS Sınav Formatı (90 Soru · 3 Yanlış 1 Doğruyu Götürür)',
    penaltyRatio: 3,
    subjects: [
      { name: 'Türkçe', count: 20, options: ['A', 'B', 'C', 'D'] },
      { name: 'Matematik', count: 20, options: ['A', 'B', 'C', 'D'] },
      { name: 'Fen Bilimleri', count: 20, options: ['A', 'B', 'C', 'D'] },
      { name: 'T.C. İnkılap Tarihi', count: 10, options: ['A', 'B', 'C', 'D'] },
      { name: 'Din Kültürü', count: 10, options: ['A', 'B', 'C', 'D'] },
      { name: 'İngilizce', count: 10, options: ['A', 'B', 'C', 'D'] },
    ]
  },
  TYT: {
    title: '🏛️ YKS TYT Sınav Formatı (120 Soru · 4 Yanlış 1 Doğruyu Götürür)',
    penaltyRatio: 4,
    subjects: [
      { name: 'Türkçe', count: 40, options: ['A', 'B', 'C', 'D', 'E'] },
      { name: 'Sosyal Bilimler', count: 20, options: ['A', 'B', 'C', 'D', 'E'] },
      { name: 'Temel Matematik', count: 40, options: ['A', 'B', 'C', 'D', 'E'] },
      { name: 'Fen Bilimleri', count: 20, options: ['A', 'B', 'C', 'D', 'E'] },
    ]
  },
  AYT: {
    title: '🏛️ YKS AYT Sınav Formatı (80 Soru · 4 Yanlış 1 Doğruyu Götürür)',
    penaltyRatio: 4,
    subjects: [
      { name: 'Matematik (AYT)', count: 40, options: ['A', 'B', 'C', 'D', 'E'] },
      { name: 'Fen Bilimleri (AYT)', count: 40, options: ['A', 'B', 'C', 'D', 'E'] },
    ]
  },
  CUSTOM: {
    title: '📊 Ara Sınıf / Özel Deneme Formatı (60 Soru · 3 Yanlış 1 Doğruyu Götürür)',
    penaltyRatio: 3,
    subjects: [
      { name: 'Türkçe', count: 15, options: ['A', 'B', 'C', 'D'] },
      { name: 'Matematik', count: 15, options: ['A', 'B', 'C', 'D'] },
      { name: 'Fen Bilimleri', count: 15, options: ['A', 'B', 'C', 'D'] },
      { name: 'Sosyal Bilgiler', count: 15, options: ['A', 'B', 'C', 'D'] },
    ]
  }
};

const SAMPLE_JSON_TEMPLATE = {
  examTitle: "Özdebir LGS 1. Genel Deneme Sınavı",
  examType: "LGS",
  examDate: new Date().toISOString().split('T')[0],
  studentId: "u1",
  answers: {
    "Türkçe": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"],
    "Matematik": ["A","B","C","D","A","B","","D","A","B","C","D","A","B","C","D","A","B","C","D"],
    "Fen Bilimleri": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"],
    "T.C. İnkılap Tarihi": ["A","B","C","D","A","B","C","D","A","B"],
    "Din Kültürü": ["A","B","C","D","A","B","C","D","A","B"],
    "İngilizce": ["A","B","C","D","A","B","C","D","A","B"]
  },
  answerKey: {
    "Türkçe": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"],
    "Matematik": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"],
    "Fen Bilimleri": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"],
    "T.C. İnkılap Tarihi": ["A","B","C","D","A","B","C","D","A","B"],
    "Din Kültürü": ["A","B","C","D","A","B","C","D","A","B"],
    "İngilizce": ["A","B","C","D","A","B","C","D","A","B"]
  }
};

export default function PhysicalExamManager() {
  const { users } = useUser();
  const { currentUser } = useAuth();
  const { mockExams, addMockExam, deleteMockExam } = useCoaching();

  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || 'u1');
  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];

  const [examType, setExamType] = useState('LGS');
  const [examTitle, setExamTitle] = useState('Özdebir LGS Genel Deneme 1');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);

  const preset = EXAM_PRESETS[examType] || EXAM_PRESETS.LGS;
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);

  // Student Answers State: { 'Türkçe': ['A', 'B', '', ...], 'Matematik': [...] }
  const [answers, setAnswers] = useState(() => {
    const init = {};
    preset.subjects.forEach(sub => { init[sub.name] = Array(sub.count).fill(''); });
    return init;
  });

  // Answer Key State: { 'Türkçe': ['A', 'B', 'C', ...], ... }
  const [answerKey, setAnswerKey] = useState(() => {
    const init = {};
    preset.subjects.forEach(sub => {
      // Default sample answer key for quick demo
      init[sub.name] = Array(sub.count).fill('').map((_, i) => sub.options[i % sub.options.length]);
    });
    return init;
  });

  // JSON Import Modal & Input State
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInputText, setJsonInputText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Switch Exam Type & reset forms
  const handleExamTypeChange = (newType) => {
    setExamType(newType);
    const newPreset = EXAM_PRESETS[newType] || EXAM_PRESETS.LGS;
    setActiveSubjectIndex(0);

    const initAnswers = {};
    const initKey = {};
    newPreset.subjects.forEach(sub => {
      initAnswers[sub.name] = Array(sub.count).fill('');
      initKey[sub.name] = Array(sub.count).fill('').map((_, i) => sub.options[i % sub.options.length]);
    });
    setAnswers(initAnswers);
    setAnswerKey(initKey);
  };

  // Toggle bubble answer selection
  const handleOptionClick = (subjectName, qIdx, option) => {
    setAnswers(prev => {
      const currentList = [...(prev[subjectName] || [])];
      currentList[qIdx] = currentList[qIdx] === option ? '' : option;
      return { ...prev, [subjectName]: currentList };
    });
  };

  // Clear answer bubble
  const handleClearOption = (subjectName, qIdx) => {
    setAnswers(prev => {
      const currentList = [...(prev[subjectName] || [])];
      currentList[qIdx] = '';
      return { ...prev, [subjectName]: currentList };
    });
  };

  // Answer Key Option Click
  const handleKeyOptionClick = (subjectName, qIdx, option) => {
    setAnswerKey(prev => {
      const currentList = [...(prev[subjectName] || [])];
      currentList[qIdx] = option;
      return { ...prev, [subjectName]: currentList };
    });
  };

  // Bulk JSON Import Parser
  const handleImportJson = (e) => {
    e.preventDefault();
    setJsonError('');
    try {
      const parsed = JSON.parse(jsonInputText.trim());
      if (parsed.examTitle) setExamTitle(parsed.examTitle);
      if (parsed.examType && EXAM_PRESETS[parsed.examType]) {
        handleExamTypeChange(parsed.examType);
      }
      if (parsed.examDate) setExamDate(parsed.examDate);

      if (parsed.answers && typeof parsed.answers === 'object') {
        setAnswers(prev => ({ ...prev, ...parsed.answers }));
      }
      if (parsed.answerKey && typeof parsed.answerKey === 'object') {
        setAnswerKey(prev => ({ ...prev, ...parsed.answerKey }));
      }
      setShowJsonModal(false);
      setJsonInputText('');
    } catch (err) {
      setJsonError('Geçersiz JSON formatı! Lütfen kontrol edin.');
    }
  };

  const handleCopySampleJson = () => {
    navigator.clipboard.writeText(JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2));
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  // Calculation Results
  const evaluationResults = useMemo(() => {
    let grandTotalCorrect = 0;
    let grandTotalWrong = 0;
    let grandTotalBlank = 0;
    let grandTotalNet = 0;

    const subjectStats = preset.subjects.map(sub => {
      const studentAns = answers[sub.name] || Array(sub.count).fill('');
      const correctAns = answerKey[sub.name] || Array(sub.count).fill('');

      let c = 0, w = 0, b = 0;
      for (let i = 0; i < sub.count; i++) {
        const s = studentAns[i];
        const k = correctAns[i];
        if (!s) {
          b++;
        } else if (s === k) {
          c++;
        } else {
          w++;
        }
      }

      const net = Math.max(0, c - w / preset.penaltyRatio);
      grandTotalCorrect += c;
      grandTotalWrong += w;
      grandTotalBlank += b;
      grandTotalNet += net;

      return {
        name: sub.name,
        count: sub.count,
        correct: c,
        wrong: w,
        blank: b,
        net: Number(net.toFixed(2))
      };
    });

    return {
      grandTotalCorrect,
      grandTotalWrong,
      grandTotalBlank,
      grandTotalNet: Number(grandTotalNet.toFixed(2)),
      subjectStats
    };
  }, [answers, answerKey, preset]);

  // Save Physical Mock Exam & Sync with Coaching Dossier Page 7
  const handleSaveExam = async () => {
    if (!examTitle.trim()) return;

    // Get specific subject nets for LGS format sync
    const findNet = (subjName) => {
      const found = evaluationResults.subjectStats.find(s => s.name.toLowerCase().includes(subjName.toLowerCase()));
      return found ? found.net : 0;
    };

    const newMockExam = {
      studentId: selectedStudent?.id,
      title: examTitle.trim(),
      date: examDate,
      examType,
      turkce: findNet('Türkçe'),
      mat: findNet('Matematik'),
      fen: findNet('Fen'),
      sosyal: findNet('Sosyal') || findNet('İnkılap'),
      din: findNet('Din'),
      ingilizce: findNet('İngilizce'),
      totalNet: evaluationResults.grandTotalNet,
      correctCount: evaluationResults.grandTotalCorrect,
      wrongCount: evaluationResults.grandTotalWrong,
      blankCount: evaluationResults.grandTotalBlank,
      errorReason: 'Fiziki Deneme Optik Kodlama',
      answers,
      answerKey
    };

    await addMockExam(newMockExam);
    alert('🎉 Fiziki deneme ve optik form başarıyla kaydedildi! Koçluk Dosyası Deneme Takibine yansıtıldı.');
  };

  const studentMockExams = mockExams.filter(m => String(m.studentId) === String(selectedStudent?.id));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 p-4 sm:p-6 pb-20">
      
      {/* HEADER BAR */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <ClipboardCheck className="w-7 h-7 text-indigo-500" />
            Fiziki Deneme & Dijital Optik Form Modülü
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Özdebir, Töder vb. fiziki kitapçık deneme cevaplarını ekrandan kodlayın veya Toplu JSON ile aktarın.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {students.length > 1 && (
            <div className="flex items-center gap-2 bg-white dark:bg-[#1E293B] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              {students.map(s => (
                <button key={s.id} onClick={() => setSelectedStudentId(s.id)} className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                  s.id === selectedStudent?.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                )}>
                  {s.name}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowJsonModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black shadow-md hover:opacity-90 active:scale-95 transition-all"
          >
            <FileCode2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> Toplu JSON Aktar
          </button>
        </div>
      </div>

      {/* TOP CONFIG BAR */}
      <div className="max-w-7xl mx-auto mb-6 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        
        {/* PRESET SELECTOR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.keys(EXAM_PRESETS).map(key => (
            <button
              key={key}
              onClick={() => handleExamTypeChange(key)}
              className={cn(
                'py-2.5 px-4 rounded-2xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-1',
                examType === key
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
              )}
            >
              <span>{key} Sınavı</span>
              <span className="text-[10px] font-bold opacity-80">{EXAM_PRESETS[key].subjects.reduce((a, s) => a + s.count, 0)} Soru</span>
            </button>
          ))}
        </div>

        {/* INPUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Fiziki Deneme Adı / Yayın</label>
            <input
              type="text"
              placeholder="Örn: Özdebir LGS Genel Deneme 1"
              value={examTitle}
              onChange={e => setExamTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Deneme Tarihi</label>
            <input
              type="date"
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Değerlendirme Formatı</label>
            <div className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-2">
              <Calculator className="w-4 h-4 shrink-0" />
              {preset.penaltyRatio} Yanlış 1 Doğruyu Götürür
            </div>
          </div>
        </div>

      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="max-w-7xl mx-auto mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#1E293B] border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Doğru Sayısı</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{evaluationResults.grandTotalCorrect} Doğru</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-900/50 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Yanlış Sayısı</span>
            <span className="text-base font-black text-rose-600 dark:text-rose-400">{evaluationResults.grandTotalWrong} Yanlış</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <MinusCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Boş Sayısı</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400">{evaluationResults.grandTotalBlank} Boş</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Toplam Net</span>
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{evaluationResults.grandTotalNet} Net</span>
          </div>
        </div>
      </div>

      {/* MAIN OPTICAL FORM SIMULATOR */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: DIGI OPTICAL SHEET SHEET */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* SUBJECT TABS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {preset.subjects.map((sub, idx) => {
              const active = activeSubjectIndex === idx;
              const subStat = evaluationResults.subjectStats.find(s => s.name === sub.name);
              return (
                <button
                  key={sub.name}
                  onClick={() => setActiveSubjectIndex(idx)}
                  className={cn(
                    'px-4 py-2 rounded-2xl border text-xs font-black transition-all shrink-0 flex items-center gap-2',
                    active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 shadow-md'
                      : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                  )}
                >
                  <span>{sub.name}</span>
                  <span className={cn('text-[10px] font-extrabold px-2 py-0.5 rounded-full', active ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-indigo-500')}>
                    {subStat?.net || 0} Net
                  </span>
                </button>
              );
            })}
          </div>

          {/* OPTICAL BUBBLE GRID FOR ACTIVE SUBJECT */}
          {(() => {
            const currentSub = preset.subjects[activeSubjectIndex];
            if (!currentSub) return null;

            const subAnswers = answers[currentSub.name] || Array(currentSub.count).fill('');
            const subKey = answerKey[currentSub.name] || Array(currentSub.count).fill('');

            return (
              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-500" />
                      {currentSub.name} Optik Kodlama Formu
                    </h3>
                    <p className="text-xs text-slate-400">Toplam {currentSub.count} Soru · Baloncuklara tıklayarak fiziki deneme cevaplarınızı kodlayın</p>
                  </div>
                  <span className="text-xs font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {subAnswers.filter(Boolean).length}/{currentSub.count} Dolduruldu
                  </span>
                </div>

                {/* BUBBLE ROWS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: currentSub.count }).map((_, qIdx) => {
                    const selected = subAnswers[qIdx];
                    const correctKey = subKey[qIdx];
                    const isAnswered = Boolean(selected);
                    const isCorrect = isAnswered && selected === correctKey;
                    const isWrong = isAnswered && selected !== correctKey;

                    return (
                      <div
                        key={qIdx}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-2xl border transition-all',
                          isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' :
                          isWrong ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' :
                          'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center shrink-0">
                            {qIdx + 1}
                          </span>
                          {isAnswered && (
                            <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-md', isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')}>
                              {isCorrect ? 'Doğru' : `Yanlış (Doğru: ${correctKey})`}
                            </span>
                          )}
                        </div>

                        {/* BUBBLE BUTTONS */}
                        <div className="flex items-center gap-1.5">
                          {currentSub.options.map(opt => {
                            const activeOpt = selected === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleOptionClick(currentSub.name, qIdx, opt)}
                                className={cn(
                                  'w-8 h-8 rounded-full border text-xs font-black transition-all active:scale-95 flex items-center justify-center',
                                  activeOpt
                                    ? isCorrect
                                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                      : isWrong
                                      ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                                      : 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                                )}
                              >
                                {opt}
                              </button>
                            );
                          })}

                          {selected && (
                            <button
                              type="button"
                              onClick={() => handleClearOption(currentSub.name, qIdx)}
                              className="ml-1 p-1 text-slate-300 hover:text-rose-500 transition-colors"
                              title="Boş Bırak"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={handleSaveExam}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-500/25 hover:shadow-xl active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Deneme Sonucunu Kaydet & Senkronize Et
                  </button>
                </div>

              </div>
            );
          })()}

        </div>

        {/* RIGHT: BREAKDOWN & PAST EXAMS */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* SUBJECT BREAKDOWN CARD */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <BarChart2Icon className="w-4 h-4 text-indigo-500" /> Ders Bazlı İnceleme
            </h3>

            <div className="space-y-2">
              {evaluationResults.subjectStats.map(s => (
                <div key={s.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{s.name}</p>
                    <p className="text-[10px] text-slate-400">{s.correct}D · {s.wrong}Y · {s.blank}B</p>
                  </div>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-lg">
                    {s.net} Net
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* PAST PHYSICAL EXAMS LIST */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Layers className="w-4 h-4 text-emerald-500" /> Kayıtlı Fiziki Denemeler ({studentMockExams.length})
            </h3>

            {studentMockExams.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 text-center">Henüz kaydedilmiş fiziki deneme bulunmuyor.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 hide-scrollbar">
                {studentMockExams.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:border-indigo-300 transition-all">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{m.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{m.date} · {m.examType || 'LGS'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-lg">
                        {m.totalNet} Net
                      </span>
                      <button onClick={() => deleteMockExam(m.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* JSON BULK IMPORT MODAL */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 w-full max-w-xl border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-base">
                <FileCode2 className="w-5 h-5" /> Toplu JSON Aktarımı
              </div>
              <button onClick={() => setShowJsonModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tüm deneme soru ve cevaplarını JSON formatında yapıştırarak optik formu tek tıkla saniyeler içinde doldurabilirsiniz.
            </p>

            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                📋 Örnek JSON Şablon Yapısı
              </div>
              <button
                type="button"
                onClick={handleCopySampleJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-all active:scale-95"
              >
                <Copy className="w-3.5 h-3.5" /> {copiedNotice ? 'Şablon Kopyalandı!' : 'Şablonu Kopyala'}
              </button>
            </div>

            {jsonError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {jsonError}
              </div>
            )}

            <form onSubmit={handleImportJson} className="space-y-3">
              <textarea
                rows={9}
                placeholder="Örnek JSON yapısını buraya yapıştırın..."
                value={jsonInputText}
                onChange={e => setJsonInputText(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowJsonModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">İptal</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Optik Formu Doldur & İçe Aktar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function MinusCircle(props) {
  return <AlertCircle {...props} />;
}

function BarChart2Icon(props) {
  return <BarChart3 {...props} />;
}
