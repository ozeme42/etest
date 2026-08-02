import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck, CheckCircle2, AlertCircle, Trash2, Plus, Sparkles,
  BookOpen, Calculator, FileText, Check, X, RefreshCw, ChevronRight,
  TrendingUp, Trophy, Layers, Award, FileCode2, Copy, ArrowRight, CornerDownRight, BarChart3, Settings2,
  Eye, ArrowLeft, Calendar, FileSpreadsheet, KeyRound, Key, Edit3
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useHomework } from '../context/HomeworkContext';
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
    title: '📊 Özel / Boş Şablon (Hiçbir ders yok · Elle veya Toplu JSON ile ders ekleyin)',
    penaltyRatio: 0,
    subjects: [] // Empty by default for CUSTOM option
  }
};

const SAMPLE_JSON_TEMPLATE = {
  examTitle: "Özdebir LGS 1. Genel Deneme Sınavı",
  examType: "CUSTOM",
  examDate: new Date().toISOString().split('T')[0],
  penaltyRatio: 3,
  studentId: "u1",
  answers: {
    "Türkçe": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"],
    "Matematik": ["A","B","C","D","A","B","","D","A","B","C","D","A","B","C","D","A","B","C","D"],
    "Fen Bilimleri": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"]
  },
  answerKey: {
    "Türkçe": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"],
    "Matematik": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"],
    "Fen Bilimleri": ["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"]
  }
};

export default function PhysicalExamManager() {
  const { users } = useUser();
  const { currentUser } = useAuth();
  const { homeworks, addHomework, deleteHomework } = useHomework();

  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || 'u1');
  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];

  // UX Toggle: Default to List View (showAddForm === false)
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingExamDetails, setViewingExamDetails] = useState(null);

  const [examType, setExamType] = useState('LGS');
  const [examTitle, setExamTitle] = useState('Özdebir LGS Genel Deneme 1');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);

  // Optional Penalty Ratio (3, 4, 0, or custom)
  const [penaltyRatio, setPenaltyRatio] = useState(3);

  // Dynamic Subjects List State
  const [subjects, setSubjects] = useState(EXAM_PRESETS.LGS.subjects);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);

  // Answer Key State only: { 'Türkçe': ['A', 'B', 'C', ...], ... }
  const [answerKey, setAnswerKey] = useState(() => {
    const init = {};
    EXAM_PRESETS.LGS.subjects.forEach(sub => {
      init[sub.name] = Array(sub.count).fill('');
    });
    return init;
  });

  // Modal States
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInputText, setJsonInputText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCount, setNewSubCount] = useState(15);
  const [newSubOptions, setNewSubOptions] = useState(4);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');

  // Fetch existing physical exam homeworks for this student
  const studentMockExams = useMemo(() => {
    return homeworks.filter(hw => hw.type === 'physicalExam' && String(hw.studentId) === String(selectedStudent?.id));
  }, [homeworks, selectedStudent]);

  // Switch Preset Exam Format
  const handleExamTypeChange = (newType) => {
    setExamType(newType);
    const newPreset = EXAM_PRESETS[newType] || EXAM_PRESETS.LGS;
    setPenaltyRatio(newPreset.penaltyRatio);
    setSubjects(newPreset.subjects);
    setActiveSubjectIndex(0);

    const initKey = {};
    newPreset.subjects.forEach(sub => {
      initKey[sub.name] = Array(sub.count).fill('');
    });
    setAnswerKey(initKey);
  };

  // Update specific subject's question count dynamically
  const handleSubjectQuestionCountChange = (subjectName, newCount) => {
    const countNum = Math.max(1, Math.min(100, Number(newCount) || 1));
    setSubjects(prev => prev.map(s => s.name === subjectName ? { ...s, count: countNum } : s));
    setAnswerKey(prev => {
      const currentList = prev[subjectName] || [];
      if (countNum > currentList.length) {
        return { ...prev, [subjectName]: [...currentList, ...Array(countNum - currentList.length).fill('')] };
      }
      return { ...prev, [subjectName]: currentList.slice(0, countNum) };
    });
  };

  // Add custom new subject
  const handleAddCustomSubject = (e) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    const optArray = newSubOptions === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
    const newSubject = { name: newSubName.trim(), count: Number(newSubCount) || 10, options: optArray };
    setSubjects(prev => [...prev, newSubject]);
    setAnswerKey(prev => ({ ...prev, [newSubject.name]: Array(newSubject.count).fill('') }));
    setNewSubName('');
    setNewSubCount(15);
    setShowSettingsModal(false);
  };

  // Delete custom subject
  const handleDeleteSubject = (subjectName) => {
    setSubjects(prev => prev.filter(s => s.name !== subjectName));
    setActiveSubjectIndex(0);
  };

  // Clicking a bubble sets the answer key directly
  const handleOptionClick = (subjectName, qIdx, option) => {
    setAnswerKey(prev => {
      const currentList = [...(prev[subjectName] || [])];
      currentList[qIdx] = currentList[qIdx] === option ? '' : option;
      return { ...prev, [subjectName]: currentList };
    });
  };

  // Extract valid letters (A, B, C, D, E) from user text
  const parsedBulkInput = useMemo(() => {
    if (!bulkInputText) return [];
    return bulkInputText.toUpperCase().match(/[A-E]/g) || [];
  }, [bulkInputText]);

  // Apply Bulk Inputs to answer key (partial update supported)
  const handleApplyBulkInput = (e) => {
    e.preventDefault();
    const currentSub = subjects[activeSubjectIndex];
    if (!currentSub || parsedBulkInput.length === 0) return;
    setAnswerKey(prev => {
      const existing = [...(prev[currentSub.name] || Array(currentSub.count).fill(''))];
      parsedBulkInput.forEach((ans, idx) => {
        if (idx < currentSub.count) existing[idx] = ans;
      });
      return { ...prev, [currentSub.name]: existing };
    });
    setShowBulkModal(false);
    setBulkInputText('');
  };

  const openBulkModal = () => {
    setBulkInputText('');
    setShowBulkModal(true);
  };

  // Bulk JSON Import Parser
  const handleImportJson = (e) => {
    e.preventDefault();
    setJsonError('');
    try {
      const parsed = JSON.parse(jsonInputText.trim());
      if (parsed.examTitle) setExamTitle(parsed.examTitle);
      if (parsed.examType && EXAM_PRESETS[parsed.examType]) {
        setExamType(parsed.examType);
      } else {
        setExamType('CUSTOM');
      }

      if (parsed.penaltyRatio !== undefined) setPenaltyRatio(Number(parsed.penaltyRatio) || 0);
      if (parsed.examDate) setExamDate(parsed.examDate);

      if (parsed.answerKey && typeof parsed.answerKey === 'object') {
        const jsonSubjectNames = Object.keys(parsed.answerKey);
        if (jsonSubjectNames.length > 0) {
          const newSubjects = jsonSubjectNames.map(name => {
            const keyArr = parsed.answerKey[name] || [];
            const hasE = keyArr.includes('E');
            return { name, count: keyArr.length || 1, options: hasE ? ['A','B','C','D','E'] : ['A','B','C','D'] };
          });
          setSubjects(newSubjects);
          setActiveSubjectIndex(0);
        }
      }

      if (parsed.answerKey && typeof parsed.answerKey === 'object') {
        setAnswerKey(prev => ({ ...prev, ...parsed.answerKey }));
      }

      setShowJsonModal(false);
      setShowAddForm(true);
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

  // Count filled answer key slots per subject
  const evaluationResults = useMemo(() => {
    const subjectStats = subjects.map(sub => {
      const keyArr = answerKey[sub.name] || [];
      const filled = keyArr.filter(Boolean).length;
      return { name: sub.name, count: sub.count, filled };
    });
    const totalFilled = subjectStats.reduce((a, s) => a + s.filled, 0);
    const totalQuestions = subjects.reduce((a, s) => a + s.count, 0);
    return { subjectStats, totalFilled, totalQuestions };
  }, [answerKey, subjects]);

  // Save Physical Mock Exam as Homework
  const handleSaveExam = async () => {
    if (!examTitle.trim()) return;
    const newHomework = {
      type: 'physicalExam',
      studentId: selectedStudent?.id,
      title: examTitle.trim(),
      dueDate: examDate,
      examType,
      penaltyRatio,
      subjects, // We need to store subjects info for the runner
      totalQuestions: evaluationResults.totalQuestions,
      filledAnswers: evaluationResults.totalFilled,
      answerKey
    };
    await addHomework(newHomework);
    setShowAddForm(false);
    alert('🎉 Fiziki deneme başarıyla öğrenciye ödev olarak atandı!');
  };

  // Stats for the list view header (Optional, using filled answers or we can calculate avg if submitted)
  const avgNet = useMemo(() => {
    // We could calculate avg from submissions if we want, but for now let's just return 0 or calculate from submissions
    return 0;
  }, [studentMockExams]);

  const highestNet = useMemo(() => {
    return 0;
  }, [studentMockExams]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 p-4 sm:p-6 pb-20">
      
      {/* HEADER BAR */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <ClipboardCheck className="w-7 h-7 text-indigo-500" />
            Fiziki Deneme & Dijital Optik Form Girişi
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {showAddForm ? 'Yeni fiziki deneme cevaplarınızı optik forma kodlayın' : 'Kayıtlı fiziki deneme sınavları ve karne geçmişi'}
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

          {showAddForm ? (
            <button
              onClick={() => setShowAddForm(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black hover:bg-slate-300 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Kayıtlı Denemelere Dön
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowJsonModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all"
              >
                <FileCode2 className="w-4 h-4 text-emerald-500" /> Toplu JSON Aktar
              </button>

              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" /> + Yeni Deneme Girişi Yap
              </button>
            </>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: KAYITLI DENEMELER LİSTESİ */}
      {!showAddForm && (
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Girilen Deneme</span>
                <span className="text-base font-black text-slate-900 dark:text-white">{studentMockExams.length} Deneme</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1E293B] border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Net Ortalaması</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{avgNet} Net</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1E293B] border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Rekor Net</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">{highestNet} Net</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1E293B] border border-purple-200 dark:border-purple-900/50 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Koçluk Sync</span>
                <span className="text-xs font-black text-purple-600 dark:text-purple-400">Sayfa 7 Aktif</span>
              </div>
            </div>
          </div>

          {/* MAIN RECORDED EXAMS TABLE / CARDS GRID */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                {selectedStudent?.name} - Fiziki Deneme Sınav Geçmişi
              </h2>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-md hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-4 h-4" /> + Yeni Deneme Girişi Yap
              </button>
            </div>

            {studentMockExams.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto">
                  <ClipboardCheck className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Henüz Kaydedilmiş Fiziki Deneme Bulunmuyor</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Öğrencinizin Özdebir, Töder veya Kurumsal fiziki denemelerinin cevaplarını dijital optik forma kodlayarak ilk kaydı oluşturun.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black shadow-md hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" /> Yeni Fiziki Deneme Kodla
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentMockExams.map(m => (
                  <div key={m.id} className="bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 hover:border-indigo-300 transition-all group relative">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                          {m.examType || 'LGS'} Sınavı
                        </span>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug mt-1 line-clamp-2">{m.title}</h3>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> Son Teslim: {m.dueDate}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 leading-none block">{m.submissions && m.submissions.length > 0 ? 'Çözüldü' : 'Bekliyor'}</span>
                      </div>
                    </div>

                    {/* NET BREAKDOWN BADGES */}
                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 text-center">
                      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                        <span className="text-[9px] text-slate-400 block font-black">Türkçe</span>
                        <span>{m.turkce || 0} Net</span>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                        <span className="text-[9px] text-slate-400 block font-black">Matematik</span>
                        <span>{m.mat || 0} Net</span>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                        <span className="text-[9px] text-slate-400 block font-black">Fen</span>
                        <span>{m.fen || 0} Net</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setViewingExamDetails(m)}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detayları İncele
                      </button>

                      <button
                        onClick={() => deleteMockExam(m.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                        title="Denemeyi Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

      {/* VIEW MODE 2: YENİ FİZİKİ DENEME VE OPTİK FORM GİRİŞİ */}
      {showAddForm && (
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* TOP CONFIG BAR */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            
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
                  <span>{key === 'CUSTOM' ? 'Özel / Boş Şablon' : `${key} Sınavı`}</span>
                  <span className="text-[10px] font-bold opacity-80">
                    {subjects.length > 0 ? `${subjects.reduce((a, s) => a + s.count, 0)} Soru` : 'Boş (Elle / JSON)'}
                  </span>
                </button>
              ))}
            </div>

            {/* INPUTS & OPTIONAL PENALTY RATIO SELECTOR */}
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Değerlendirme Formatı (Opsiyonel)</label>
                <select
                  value={penaltyRatio}
                  onChange={e => setPenaltyRatio(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 outline-none"
                >
                  <option value={3}>📐 3 Yanlış 1 Doğruyu Götürür (LGS Standart)</option>
                  <option value={4}>🏛️ 4 Yanlış 1 Doğruyu Götürür (YKS Standart)</option>
                  <option value={0}>✨ Yanlışlar Doğruyu Götürmüyor (0 Yanlış)</option>
                  <option value={2}>⚡ 2 Yanlış 1 Doğruyu Götürür</option>
                  <option value={5}>🎯 5 Yanlış 1 Doğruyu Götürür</option>
                </select>
              </div>
            </div>

          </div>

          {/* STATS: filled answers */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-[#1E293B] border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Girilen Cevap</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">{evaluationResults.totalFilled} / {evaluationResults.totalQuestions}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1E293B] border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Toplam Soru</span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{evaluationResults.totalQuestions} Soru</span>
              </div>
            </div>
          </div>

          {/* EMPTY STATE IF CUSTOM FORMAT HAS NO SUBJECTS YET */}
          {subjects.length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto">
                <Plus className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Özel Şablon Seçildi - Henüz Ders Bulunmuyor</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Aşağıdaki buton ile derslerinizi elle tek tek ekleyin veya 'Toplu JSON Aktar' butonuyla verilerinizi yapıştırın.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-md hover:bg-indigo-700 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> + Elle Ders Ekle
                </button>
                <button
                  onClick={() => setShowJsonModal(true)}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  <FileCode2 className="w-4 h-4 text-emerald-400" /> Toplu JSON Aktar
                </button>
              </div>
            </div>
          ) : (
            /* MAIN OPTICAL FORM SIMULATOR FOR SUBJECTS */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT: DIGI OPTICAL SHEET */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* SUBJECT TABS + BULK PASTE BUTTON */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                  {subjects.map((sub, idx) => {
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
                        <span>{sub.name} ({sub.count} Soru)</span>
                        <span className={cn('text-[10px] font-extrabold px-2 py-0.5 rounded-full', active ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-amber-600')}>
                          {subStat?.filled || 0}/{sub.count}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    onClick={() => openBulkModal()}
                    className="px-3 py-2 rounded-2xl bg-amber-500 text-white text-xs font-black shrink-0 flex items-center gap-1.5 shadow-sm hover:bg-amber-600 transition-all"
                  >
                    <Key className="w-3.5 h-3.5" /> Toplu Yapıştır
                  </button>

                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="px-3 py-2 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-indigo-500 text-xs font-bold shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ders / Soru Düzenle
                  </button>
                </div>

                {/* OPTICAL BUBBLE GRID FOR ACTIVE SUBJECT */}
                {(() => {
                  const currentSub = subjects[activeSubjectIndex];
                  if (!currentSub) return null;
                  const subKey = answerKey[currentSub.name] || Array(currentSub.count).fill('');

                  return (
                    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">

                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
                        <div>
                          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Key className="w-5 h-5 text-amber-500" />
                            {currentSub.name} — Cevap Anahtarı
                          </h3>
                          <p className="text-xs text-slate-400">Şıklara tıklayarak veya toplu yapıştırarak cevap anahtarını girin</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-xl">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Soru:</span>
                            <input
                              type="number" min="1" max="100"
                              value={currentSub.count}
                              onChange={e => handleSubjectQuestionCountChange(currentSub.name, e.target.value)}
                              className="w-10 bg-transparent text-xs font-black text-indigo-600 dark:text-indigo-400 outline-none text-center"
                            />
                          </div>
                          <span className="text-xs font-black bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                            {subKey.filter(Boolean).length}/{currentSub.count} Girildi
                          </span>
                          <button type="button" onClick={() => openBulkModal()}
                            className="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            <Edit3 className="w-3.5 h-3.5" /> Toplu Yapıştır
                          </button>
                        </div>
                      </div>

                      {/* BUBBLE ROWS — answer key only */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Array.from({ length: currentSub.count }).map((_, qIdx) => {
                          const keyVal = subKey[qIdx] || '';
                          const isSet = Boolean(keyVal);

                          return (
                            <div
                              key={qIdx}
                              className={cn(
                                'flex items-center justify-between p-2.5 rounded-2xl border transition-all',
                                isSet
                                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                                  : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center shrink-0">
                                  {qIdx + 1}
                                </span>
                                {isSet && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-white">
                                    {keyVal}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                {currentSub.options.map(opt => {
                                  const isSelected = keyVal === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => handleOptionClick(currentSub.name, qIdx, opt)}
                                      className={cn(
                                        'w-8 h-8 rounded-full border text-xs font-black transition-all active:scale-95 flex items-center justify-center',
                                        isSelected
                                          ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                                      )}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}

                                {isSet && (
                                  <button
                                    type="button"
                                    onClick={() => handleOptionClick(currentSub.name, qIdx, keyVal)}
                                    className="ml-1 p-1 text-slate-300 hover:text-rose-500 transition-colors"
                                    title="Temizle"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                        <button
                          onClick={() => setShowAddForm(false)}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          İptal
                        </button>
                        <button
                          onClick={handleSaveExam}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-500/25 hover:shadow-xl active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Deneme Sonucunu Kaydet & Senkronize Et
                        </button>
                      </div>

                    </div>
                  );
                })()}

              </div>

              {/* RIGHT: SUBJECT BREAKDOWN */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <BarChart2Icon className="w-4 h-4 text-amber-500" /> Ders Bazlı Doluluk
                  </h3>
                  <div className="space-y-2">
                    {evaluationResults.subjectStats.map(s => (
                      <div key={s.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{s.name}</p>
                          <p className="text-[10px] text-slate-400">{s.filled}/{s.count} Soru Girildi</p>
                        </div>
                        <span className={cn(
                          'font-black text-sm px-2.5 py-1 rounded-lg',
                          s.filled === s.count
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                        )}>
                          {s.filled}/{s.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* TOPLU YAPIŞTIR MODAL — sadece cevap anahtarı */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-base">
                <Key className="w-5 h-5" />
                {subjects[activeSubjectIndex]?.name} — Cevap Anahtarı Yapıştır
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Cevapları yapıştırın (Örn: <code className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded">ABCDABCD</code> veya <code className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded">A, B, C, D</code>).
              <br/><strong className="text-amber-600 dark:text-amber-400">✨ Kaç soru girerseniz o kadarı uygulanır.</strong>
            </p>

            <form onSubmit={handleApplyBulkInput} className="space-y-3">
              <textarea
                rows={4}
                placeholder="Örn: A B C D A B C D A B C D A B C D A B C D"
                value={bulkInputText}
                onChange={e => setBulkInputText(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 uppercase tracking-widest"
              />

              {parsedBulkInput.length > 0 && (
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-800 dark:text-indigo-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {parsedBulkInput.length} Soru Cevabı Algılandı (Soru 1 ile {Math.min(parsedBulkInput.length, subjects[activeSubjectIndex]?.count || 20)} arası güncellenecektir):
                  </div>
                  <div className="font-mono text-[11px] truncate tracking-widest text-indigo-950 dark:text-indigo-100 font-bold">
                    {parsedBulkInput.slice(0, subjects[activeSubjectIndex]?.count || 20).join(' - ')}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowBulkModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">İptal</button>
              <button
                  type="submit"
                  disabled={parsedBulkInput.length === 0}
                  className="px-5 py-2 rounded-xl text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 bg-amber-500 hover:bg-amber-600"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Cevap Anahtarını Uygula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAY İNCELEME MODAL */}
      {viewingExamDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-500">{viewingExamDetails.examType || 'LGS'} Sınav Detayı</span>
                <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight">{viewingExamDetails.title}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{viewingExamDetails.date}</p>
              </div>
              <button onClick={() => setViewingExamDetails(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-2.5 rounded-xl">
                <span className="text-[10px] font-black text-slate-400 block">DOĞRU / YANLIŞ</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{viewingExamDetails.correctCount || 0}D / {viewingExamDetails.wrongCount || 0}Y</span>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 p-2.5 rounded-xl">
                <span className="text-[10px] font-black text-slate-400 block">TOPLAM NET</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{viewingExamDetails.totalNet} Net</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-black text-slate-800 dark:text-slate-200">Ders Bazlı Net Dağılımı:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border flex justify-between"><span>Türkçe:</span> <strong>{viewingExamDetails.turkce || 0} Net</strong></div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border flex justify-between"><span>Matematik:</span> <strong>{viewingExamDetails.mat || 0} Net</strong></div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border flex justify-between"><span>Fen Bilimleri:</span> <strong>{viewingExamDetails.fen || 0} Net</strong></div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border flex justify-between"><span>Sosyal/İnkılap:</span> <strong>{viewingExamDetails.sosyal || 0} Net</strong></div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setViewingExamDetails(null)} className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black">Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* DERS & SORU SAYISI DÜZENLEME MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-base">
                <Settings2 className="w-5 h-5" /> Ders Soru Sayıları & Özel Ders Ekle
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SUBJECT LIST WITH EDITABLE COUNTS */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {subjects.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 text-center">Henüz tanımlı ders yok. Aşağıdan ekleyebilirsiniz.</p>
              ) : (
                subjects.map(s => (
                  <div key={s.name} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Soru Sayısı:</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={s.count}
                        onChange={e => handleSubjectQuestionCountChange(s.name, e.target.value)}
                        className="w-14 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-black text-center"
                      />
                      <button onClick={() => handleDeleteSubject(s.name)} className="p-1 text-slate-400 hover:text-rose-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ADD NEW SUBJECT FORM */}
            <form onSubmit={handleAddCustomSubject} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="text-xs font-black text-slate-800 dark:text-slate-200">+ Yeni Özel Ders Tanımla</div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Ders Adı (Örn: Geometri)"
                  value={newSubName}
                  onChange={e => setNewSubName(e.target.value)}
                  className="col-span-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-none"
                  required
                />
                <input
                  type="number"
                  placeholder="Soru Sayısı"
                  value={newSubCount}
                  onChange={e => setNewSubCount(e.target.value)}
                  className="col-span-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-none"
                  required
                />
                <select
                  value={newSubOptions}
                  onChange={e => setNewSubOptions(Number(e.target.value))}
                  className="col-span-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-none"
                >
                  <option value={4}>4 Şıklı (A-D)</option>
                  <option value={5}>5 Şıklı (A-E)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowSettingsModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Kapat</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-all flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Dersi Ekle
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

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
