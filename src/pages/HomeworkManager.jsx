import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, CheckCircle, Clock, X, Users, Edit2, BarChart2,
  ArrowRight, ArrowLeft, CheckSquare, Sparkles, BookOpen, Layers, Check, Search, Filter,
  GraduationCap, Calendar, AlertCircle, Eye, Bell, Send, Trophy, Ruler, TestTube2, BookCopy,
  Globe, MessageSquare, ChevronRight, School, LayoutGrid, List, FileText, Image, FileJson, Trash2
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useUser } from '../context/UserContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const subjectThemes = {
  'Matematik': { bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', icon: Ruler, color: '#2563eb' },
  'Fen Bilimleri': { bg: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', icon: TestTube2, color: '#0d9488' },
  'Türkçe': { bg: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', icon: BookCopy, color: '#ea580c' },
  'Sosyal Bilgiler': { bg: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)', icon: Globe, color: '#9333ea' },
  'T.C. İnkılap Tarihi ve Atatürkçülük': { bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', icon: Globe, color: '#7c3aed' },
  'İngilizce': { bg: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', icon: MessageSquare, color: '#e11d48' },
  'Din Kültürü ve Ahlak Bilgisi': { bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', icon: Sparkles, color: '#0284c7' },
  'all_subjects': { bg: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', icon: Layers, color: '#4f46e5' },
  'Diğer': { bg: 'linear-gradient(135deg, #475569 0%, #334155 100%)', icon: Layers, color: '#475569' }
};

const gradeThemes = {
  '5. Sınıf': { bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', badgeBg: '#dbeafe', badgeText: '#1e40af', icon: GraduationCap },
  '6. Sınıf': { bg: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', badgeBg: '#d1fae5', badgeText: '#065f46', icon: GraduationCap },
  '7. Sınıf': { bg: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', badgeBg: '#fef3c7', badgeText: '#92400e', icon: GraduationCap },
  '8. Sınıf': { bg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', badgeBg: '#fce7f3', badgeText: '#9d174d', icon: Trophy },
  'LGS Hazırlık': { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', badgeBg: '#ede9fe', badgeText: '#5b21b6', icon: Trophy },
  'Diğer': { bg: 'linear-gradient(135deg, #64748b 0%, #334155 100%)', badgeBg: '#f1f5f9', badgeText: '#334155', icon: School }
};

export default function HomeworkManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { data: curData } = useCurriculum();
  const { questions: allQuestions } = useQuestionBank();
  const { homeworks: allHomeworks, addHomework, updateHomework, deleteHomework } = useHomework();
  const { users } = useUser();
  const { submissions } = useEvaluation();

  // Filter students: Teachers see ONLY students added by themselves, Admin sees all
  const students = useMemo(() => {
    return (users || []).filter(u => u.role === 'student' && (currentUser?.role === 'admin' || u.teacherId === currentUser?.id));
  }, [users, currentUser]);

  // Filter homeworks: Teachers see ONLY homeworks assigned by themselves, Admin sees all
  const homeworks = useMemo(() => {
    if (currentUser?.role === 'admin') return allHomeworks;
    return (allHomeworks || []).filter(hw => hw.assignedBy === currentUser?.id);
  }, [allHomeworks, currentUser]);

  // Filter questions: Teachers see ONLY questions created by themselves, Admin sees all
  const questions = useMemo(() => {
    if (currentUser?.role === 'admin') return allQuestions || [];
    return (allQuestions || []).filter(q => q.createdBy === currentUser?.id);
  }, [allQuestions, currentUser]);

  const [isDirectAssignment, setIsDirectAssignment] = useState(false);

  // View mode: 'list' vs 'create'
  const [viewMode, setViewMode] = useState('list');
  
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [activeHomework, setActiveHomework] = useState(null);
  const [statsStudentFilter, setStatsStudentFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState(null);
  
  const [activeTab, setActiveTab] = useState('active'); // 'all', 'active', 'expired'
  
  const [step, setStep] = useState(1);
  
  const [editingHwId, setEditingHwId] = useState(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(2);
  
  const [targetMode, setTargetMode] = useState('grade');
  const [selectedTargets, setSelectedTargets] = useState([]);
  
  const [studentGradeFilter, setStudentGradeFilter] = useState('all');
  const [step2Mode, setStep2Mode] = useState('subjects');

  const [selGrade, setSelGrade] = useState('all');
  const [selSubject, setSelSubject] = useState('all');
  const [selUnit, setSelUnit] = useState('all');
  const [selTopic, setSelTopic] = useState('all');

  const [selQuestionType, setSelQuestionType] = useState('all');
  const [selContentType, setSelContentType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);

  useEffect(() => {
    if (location.state?.autoSelectQuestionId) {
      const qId = location.state.autoSelectQuestionId;
      setSelectedQuestionIds([qId]);
      setIsDirectAssignment(true);
      const matchingQ = questions.find(q => q.id === qId);
      if (matchingQ && !title) {
        setTitle(matchingQ.title || matchingQ.questionText || 'Soru Bankası Ödevi');
      }
      setViewMode('create');
      setStep(1);
    }
  }, [location.state, questions]);

  const filteredStudents = students.filter(s => {
    if (studentGradeFilter === 'all') return true;
    return s.gradeId === studentGradeFilter;
  });

  const setDueDatePreset = (days) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    setDueDate(targetDate.toISOString().split('T')[0]);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const subjectQuestionCounts = useMemo(() => {
    const counts = {};
    curData.subjects.forEach(s => {
      const sUnits = curData.units.filter(u => u.subjectId === s.id).map(u => u.id);
      const sTopics = curData.topics.filter(t => sUnits.includes(t.unitId)).map(t => t.id);
      const matchCount = questions.filter(q => 
        sTopics.includes(q.topicId) || 
        sUnits.some(uId => q.topicId === `unit_${uId}_all`) || 
        q.topicId === `sub_${s.id}_all`
      ).length;
      counts[s.id] = matchCount;
    });
    return counts;
  }, [curData, questions]);

  const gradeQuestionCounts = useMemo(() => {
    const counts = {};
    curData.grades.forEach(g => {
      const gSubjects = curData.subjects.filter(s => s.gradeId === g.id).map(s => s.id);
      const gUnits = curData.units.filter(u => gSubjects.includes(u.subjectId)).map(u => u.id);
      const gTopics = curData.topics.filter(t => gUnits.includes(t.unitId)).map(t => t.id);
      const matchCount = questions.filter(q => 
        gTopics.includes(q.topicId) || 
        gUnits.some(uId => q.topicId === `unit_${uId}_all`) || 
        gSubjects.some(sId => q.topicId === `sub_${sId}_all`) || 
        q.topicId === `grade_${g.id}_all`
      ).length;
      counts[g.id] = matchCount;
    });
    return counts;
  }, [curData, questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (selGrade !== 'all') {
        const gSubjects = curData.subjects.filter(s => s.gradeId === selGrade).map(s => s.id);
        const gUnits = curData.units.filter(u => gSubjects.includes(u.subjectId)).map(u => u.id);
        const gTopics = curData.topics.filter(t => gUnits.includes(t.unitId)).map(t => t.id);
        const belongsToGrade = gTopics.includes(q.topicId) || gUnits.some(uId => q.topicId === `unit_${uId}_all`) || gSubjects.some(sId => q.topicId === `sub_${sId}_all`) || q.topicId === `grade_${selGrade}_all`;
        if (!belongsToGrade) return false;
      }
      if (selSubject !== 'all') {
        const sUnits = curData.units.filter(u => u.subjectId === selSubject).map(u => u.id);
        const sTopics = curData.topics.filter(t => sUnits.includes(t.unitId)).map(t => t.id);
        const belongsToSubject = sTopics.includes(q.topicId) || sUnits.some(uId => q.topicId === `unit_${uId}_all`) || q.topicId === `sub_${selSubject}_all`;
        if (!belongsToSubject) return false;
      }
      if (selUnit !== 'all') {
        const uTopics = curData.topics.filter(t => t.unitId === selUnit).map(t => t.id);
        const belongsToUnit = uTopics.includes(q.topicId) || q.topicId === `unit_${selUnit}_all` || q.topicId === selUnit;
        if (!belongsToUnit) return false;
      }
      if (selTopic !== 'all' && q.topicId !== selTopic) return false;

      if (selQuestionType === 'coktan_secmeli' && q.type !== 'coktan_secmeli') return false;
      if (selQuestionType === 'acik_uclu' && q.type !== 'acik_uclu') return false;
      if (selQuestionType === 'bundle' && !q.isBundle) return false;

      if (selContentType !== 'all') {
        const qCT = (q.contentType || '').toLowerCase();
        if (selContentType === 'pdf' && !qCT.includes('pdf')) return false;
        if (selContentType === 'html' && !qCT.includes('html')) return false;
        if (selContentType === 'text' && !qCT.includes('text') && !qCT.includes('metin')) return false;
        if (selContentType === 'gorsel' && !qCT.includes('gorsel') && !qCT.includes('image')) return false;
        if (selContentType === 'json' && !qCT.includes('json') && !q.questionsList) return false;
      }

      if (searchQuery.trim() !== '') {
        const qStr = searchQuery.toLowerCase().trim();
        const titleMatch = (q.title || q.name || '').toLowerCase().includes(qStr);
        const textMatch = (q.questionText || '').toLowerCase().includes(qStr);
        if (!titleMatch && !textMatch) return false;
      }

      return true;
    });
  }, [questions, selGrade, selSubject, selUnit, selTopic, selQuestionType, selContentType, searchQuery, curData]);

  const resetForm = () => {
    setTitle('');
    setDueDate('');
    setTimePerQuestion(2);
    setTargetMode('grade');
    setSelectedTargets([]);
    setStudentGradeFilter('all');
    setStep2Mode('subjects');
    setSelGrade('all');
    setSelSubject('all');
    setSelUnit('all');
    setSelTopic('all');
    setSelQuestionType('all');
    setSelContentType('all');
    setSearchQuery('');
    setSelectedQuestionIds([]);
    setIsDirectAssignment(false);
    setEditingHwId(null);
    setStep(1);
    setViewMode('list');
  };

  const openCreatePage = () => {
    resetForm();
    setViewMode('create');
  };

  const openEditPage = (hw) => {
    setEditingHwId(hw.id);
    setTitle(hw.title || '');
    setDueDate(hw.dueDate ? hw.dueDate.split('T')[0] : '');
    setTimePerQuestion(hw.timePerQuestion || 2);
    setTargetMode(hw.targetType || 'grade');
    setSelectedTargets(hw.targetIds || []);
    setSelectedQuestionIds(hw.questionIds || []);
    setStep(1);
    setViewMode('create');
  };

  const toggleQuestionSelection = (id) => {
    setSelectedQuestionIds(prev =>
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const handleSelectAllFilteredQuestions = () => {
    const fIds = filteredQuestions.map(q => q.id);
    const allSelected = fIds.every(id => selectedQuestionIds.includes(id));
    if (allSelected) {
      setSelectedQuestionIds(prev => prev.filter(id => !fIds.includes(id)));
    } else {
      setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...fIds])));
    }
  };

  const handleSelectAllTargets = () => {
    if (targetMode === 'grade') {
      const allG = curData.grades.map(g => g.id);
      setSelectedTargets(selectedTargets.length === allG.length ? [] : allG);
    } else {
      const allS = filteredStudents.map(s => s.id);
      setSelectedTargets(selectedTargets.length === allS.length ? [] : allS);
    }
  };

  const handleSaveHomework = () => {
    if (!title.trim() || !dueDate || selectedTargets.length === 0 || selectedQuestionIds.length === 0) {
      alert("Lütfen başlık, son teslim tarihi, atanacak kitle ve en az 1 soru seçimini eksiksiz tamamlayın.");
      return;
    }

    const selectedQs = questions.filter(q => selectedQuestionIds.includes(q.id));
    const physicalExam = selectedQs.find(q => q.contentType === 'physicalExam');
    const isPhysicalExam = !!physicalExam;
    
    const totalQCount = isPhysicalExam 
      ? physicalExam.totalQuestions 
      : selectedQs.reduce((acc, q) => acc + (q.isBundle ? (q.questionCount || 1) : 1), 0);

    let firstSubName = 'Genel Dersler';
    if (selectedQs.length > 0 && selectedQs[0].subject) {
      firstSubName = selectedQs[0].subject;
    }

    const hwData = {
      title,
      dueDate,
      timePerQuestion: parseInt(timePerQuestion, 10),
      totalQuestions: totalQCount,
      subject: firstSubName,
      targetType: targetMode,
      targetIds: selectedTargets,
      questionIds: selectedQuestionIds,
      assignedBy: currentUser?.id,
      // Physical Exam specific fields
      type: isPhysicalExam ? 'physicalExam' : 'test',
      answerKey: isPhysicalExam ? physicalExam.answerKey : undefined,
      subjects: isPhysicalExam ? physicalExam.subjects : undefined,
      penaltyRatio: isPhysicalExam ? physicalExam.penaltyRatio : undefined,
      examType: isPhysicalExam ? physicalExam.examType : undefined
    };

    if (editingHwId) {
      updateHomework(editingHwId, hwData);
      showToast("🎉 Ödev başarıyla güncellendi!");
    } else {
      addHomework(hwData);
      showToast("🚀 Yeni ödev başarıyla yayınlandı ve öğrencilere atandı!");
    }

    resetForm();
  };

  const getHomeworkStats = (hw) => {
    let targetStudentIds = [];
    if (hw.targetType === 'grade') {
      targetStudentIds = students.filter(s => hw.targetIds.includes(s.gradeId)).map(s => s.id);
    } else {
      targetStudentIds = hw.targetIds || [];
    }

    const totalAssigned = targetStudentIds.length;

    const completedStudents = targetStudentIds.filter(stId => {
      const sub = (hw.submissions || []).find(s => s.studentId === stId) || submissions.find(s => 
        (s.hwId === hw.id || s.testId === hw.id) && s.studentId === stId
      );
      return !!sub;
    });

    const completed = completedStudents.length;
    const rate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

    return { totalAssigned, completed, rate, targetStudentIds };
  };

  const getTargetLabel = (hw) => {
    if (hw.targetType === 'grade') {
      const gNames = curData.grades.filter(g => hw.targetIds.includes(g.id)).map(g => g.name);
      return gNames.length > 0 ? gNames.join(', ') : 'Tüm Sınıflar';
    } else {
      return `${hw.targetIds?.length || 0} Özel Öğrenci`;
    }
  };

  const globalAnalytics = useMemo(() => {
    const total = homeworks.length;
    let active = 0;
    let expired = 0;
    let totalRateSum = 0;

    homeworks.forEach(hw => {
      const isPast = new Date(hw.dueDate) < new Date(new Date().setHours(0,0,0,0));
      if (isPast) expired++;
      else active++;
      const st = getHomeworkStats(hw);
      totalRateSum += st.rate;
    });

    const avgRate = total > 0 ? Math.round(totalRateSum / total) : 0;
    return { total, active, expired, avgRate };
  }, [homeworks, students]);

  const canProceedToStep2 = title.trim() !== '' && dueDate !== '' && selectedTargets.length > 0;

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE VIEW 1: HOMEWORK LIST & OVERVIEW DASHBOARD
  // ═════════════════════════════════════════════════════════════════════
  if (viewMode === 'list') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#0B1120] dark:via-[#0d1528] dark:to-[#0B1120] font-sans text-slate-800 dark:text-slate-200">
        
        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl font-black shadow-xl shadow-emerald-600/30 flex items-center gap-2 animate-bounce text-xs sm:text-sm">
            <Sparkles className="w-5 h-5" />
            <span>{toastMessage}</span>
          </div>
        )}

        <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0d1528]/80 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block">E-Test LMS</span>
                <h1 className="text-base font-black text-slate-900 dark:text-white leading-none mt-0.5">
                  Ödev Takip Portalı 📝
                </h1>
              </div>
            </div>
            
            <button
              onClick={openCreatePage}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Yeni Ödev Atayın</span>
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">
          
          {/* ANALYTICS STAT CARDS */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div
              onClick={openCreatePage}
              className="rounded-2xl p-3.5 sm:p-4 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-black">➕ Yeni Ödev</span>
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-white/80 mt-2 truncate">Ödev Oluştur ➔</p>
            </div>

            <div className="rounded-2xl p-3.5 sm:p-4 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-xl font-black leading-none">{globalAnalytics.active}</p>
                <p className="text-[10px] sm:text-xs font-bold text-white/90 truncate mt-0.5">Devam Eden</p>
              </div>
            </div>

            <div className="rounded-2xl p-3.5 sm:p-4 bg-blue-600 text-white shadow-lg shadow-blue-500/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-xl font-black leading-none">%{globalAnalytics.avgRate}</p>
                <p className="text-[10px] sm:text-xs font-bold text-white/90 truncate mt-0.5">Ort. Katılım</p>
              </div>
            </div>

            <div className="rounded-2xl p-3.5 sm:p-4 bg-rose-500 text-white shadow-lg shadow-rose-500/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-xl font-black leading-none">{globalAnalytics.expired}</p>
                <p className="text-[10px] sm:text-xs font-bold text-white/90 truncate mt-0.5">Süresi Biten</p>
              </div>
            </div>

          </section>

          {/* HOMEWORK TABLE & TABS */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Ödev Listesi
              </h3>
              
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  onClick={() => setActiveTab('all')}
                >
                  Tümü ({homeworks.length})
                </button>
                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'active' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  onClick={() => setActiveTab('active')}
                >
                  Devam Edenler ({globalAnalytics.active})
                </button>
                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'expired' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  onClick={() => setActiveTab('expired')}
                >
                  Süresi Bitenler ({globalAnalytics.expired})
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/60 text-slate-400 font-black uppercase tracking-wider">
                    <th className="py-3.5 px-4">Ödev Başlığı</th>
                    <th className="py-3.5 px-4">Hedef Kitle</th>
                    <th className="py-3.5 px-4">Son Teslim Tarihi</th>
                    <th className="py-3.5 px-4">Tamamlanma Oranı</th>
                    <th className="py-3.5 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {homeworks.filter(hw => {
                    const isPast = new Date(hw.dueDate) < new Date(new Date().setHours(0,0,0,0));
                    if (activeTab === 'active') return !isPast;
                    if (activeTab === 'expired') return isPast;
                    return true;
                  }).map(hw => {
                    const stats = getHomeworkStats(hw);
                    const isPast = new Date(hw.dueDate) < new Date(new Date().setHours(0,0,0,0));
                    
                    return (
                      <tr key={hw.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{hw.title}</div>
                          <div className="text-[11px] text-slate-400 font-semibold mt-0.5">📚 {hw.subject || 'Ders'} • {hw.totalQuestions} Soru</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 text-[10px]">
                            {getTargetLabel(hw)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className={`font-bold flex items-center gap-1 text-xs ${isPast ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{new Date(hw.dueDate).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <span className={`text-[10px] font-bold block mt-0.5 ${isPast ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {isPast ? '⚠️ Süresi Doldu' : '🟢 Aktif Ödev'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="space-y-1">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${stats.rate === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${stats.rate}%` }} />
                            </div>
                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                              %{stats.rate} <span className="text-slate-400 font-semibold">({stats.completed}/{stats.totalAssigned})</span>
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setActiveHomework(hw); setStatsStudentFilter('all'); setShowStatsModal(true); }}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors inline-flex items-center gap-1 shadow-sm"
                            >
                              <BarChart2 className="w-3.5 h-3.5" /> Rapor
                            </button>
                            
                            <button onClick={() => openEditPage(hw)} title="Düzenle" className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600">
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button onClick={() => { if(window.confirm('Bu ödevi silmek istediğinize emin misiniz?')) deleteHomework(hw.id); }} title="Sil" className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-600 hover:text-white">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {homeworks.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400 text-xs">
                        <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        Henüz ödev bulunmuyor. Yeni ödev butonuna tıklayarak ilk ödevinizi verebilirsiniz.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
              {homeworks.filter(hw => {
                const isPast = new Date(hw.dueDate) < new Date(new Date().setHours(0,0,0,0));
                if (activeTab === 'active') return !isPast;
                if (activeTab === 'expired') return isPast;
                return true;
              }).map(hw => {
                const stats = getHomeworkStats(hw);
                const isPast = new Date(hw.dueDate) < new Date(new Date().setHours(0,0,0,0));
                return (
                  <div key={hw.id} className="bg-white dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-2">{hw.title}</h4>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                          {getTargetLabel(hw)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditPage(hw)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if(window.confirm('Bu ödevi silmek istediğinize emin misiniz?')) deleteHomework(hw.id); }} className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(hw.dueDate).toLocaleDateString('tr-TR')}
                      </span>
                      <span className={`font-bold text-[10px] ${isPast ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {isPast ? 'Süresi Doldu' : 'Aktif'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-500 dark:text-slate-400">Tamamlanma</span>
                        <span className="text-slate-800 dark:text-slate-200">%{stats.rate} ({stats.completed}/{stats.totalAssigned})</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${stats.rate === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${stats.rate}%` }} />
                      </div>
                    </div>

                    <button
                      onClick={() => { setActiveHomework(hw); setStatsStudentFilter('all'); setShowStatsModal(true); }}
                      className="w-full py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <BarChart2 className="w-3.5 h-3.5" /> Rapor ve Öğrenci Takibi
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

        </main>

        {/* DETAILED STUDENT PROGRESS MODAL */}
        {showStatsModal && activeHomework && (() => {
          const stats = getHomeworkStats(activeHomework);
          const isPast = new Date(activeHomework.dueDate) < new Date(new Date().setHours(0,0,0,0));

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                      📊 {activeHomework.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Son Teslim: {new Date(activeHomework.dueDate).toLocaleDateString('tr-TR')} • {isPast ? '⚠️ Süresi Doldu' : '🟢 Devam Ediyor'}
                    </p>
                  </div>
                  <button onClick={() => setShowStatsModal(false)} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-2xl text-center border border-indigo-200 dark:border-indigo-800/50">
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{stats.totalAssigned}</p>
                    <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase mt-0.5">Atanan</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl text-center border border-emerald-200 dark:border-emerald-800/50">
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase mt-0.5">Tamamlayan</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl text-center border border-amber-200 dark:border-amber-800/50">
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400">%{stats.rate}</p>
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase mt-0.5">Katılım</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="font-black text-xs text-slate-800 dark:text-slate-200">Öğrenci Listesi</span>
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setStatsStudentFilter('all')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${statsStudentFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                    >
                      Tümü ({stats.targetStudentIds.length})
                    </button>
                    <button
                      onClick={() => setStatsStudentFilter('completed')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${statsStudentFilter === 'completed' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
                    >
                      Çözenler ({stats.completed})
                    </button>
                    <button
                      onClick={() => setStatsStudentFilter('pending')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${statsStudentFilter === 'pending' ? 'bg-amber-600 text-white' : 'text-slate-500'}`}
                    >
                      Bekleyenler ({stats.totalAssigned - stats.completed})
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {stats.targetStudentIds.filter(stId => {
                    const submission = submissions.find(s => 
                      (s.testId === activeHomework.id || s.hwId === activeHomework.id || (activeHomework.tests && (activeHomework.tests.includes(s.testId) || activeHomework.tests.includes(s.bookTestId)))) && 
                      s.studentId === stId
                    ) || (activeHomework.submissions || []).find(s => s.studentId === stId);

                    if (statsStudentFilter === 'completed') return !!submission;
                    if (statsStudentFilter === 'pending') return !submission;
                    return true;
                  }).map(stId => {
                    const student = students.find(s => s.id === stId);
                    if (!student) return null;
                    
                    const submission = (activeHomework.submissions || []).find(s => s.studentId === stId) || 
                      submissions.find(s => (s.hwId === activeHomework.id || s.testId === activeHomework.id) && s.studentId === stId);

                    const handleOpenReview = () => {
                      setShowStatsModal(false);
                      if (activeHomework.type === 'physicalExam') {
                        navigate(`/physical-exam/${activeHomework.id}?studentId=${stId}`);
                      } else if (submission && submission.id) {
                        navigate(`/review/${submission.id}`);
                      } else {
                        navigate(`/quiz/${activeHomework.id}?studentId=${stId}`);
                      }
                    };

                    return (
                      <div 
                        key={stId} 
                        onClick={submission ? handleOpenReview : undefined}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border text-xs transition-all ${
                          submission 
                            ? 'bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800 cursor-pointer shadow-sm' 
                            : 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{student.name}</span>
                            {submission && (
                              <span className="text-[9px] text-indigo-500 font-bold block">İncelemek için tıkla ↗</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {submission ? (
                            <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg text-[10px]">
                              ✓ {submission.score} {activeHomework.type === 'physicalExam' ? 'Net' : 'Puan'}
                            </span>
                          ) : (
                            <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg text-[10px]">
                              ⏳ Bekliyor
                            </span>
                          )}

                          {submission ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenReview();
                              }}
                              className="p-1 rounded-lg bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-600 hover:text-white transition-colors"
                              title="Kağıdı İncele"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                showToast(`${student.name} isimli öğrenciye ödev hatırlatması gönderildi! 📩`);
                              }}
                              className="p-1 rounded-lg bg-amber-50 text-amber-600 font-bold hover:bg-amber-500 hover:text-white transition-colors"
                              title="Hatırlat"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE VIEW 2: FULL PAGE HOMEWORK BUILDER WORKSPACE (2-STEP WIZARD)
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] font-sans text-slate-800 dark:text-slate-200 pb-20">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0d1528]/80 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <button 
            onClick={resetForm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Ödev Listesine Dön</span>
          </button>

          <div className="text-right">
            <h2 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
              {editingHwId ? '✏️ Ödevi Düzenle' : '➕ Ödev Sihirbazı'}
            </h2>
            <p className="text-[10px] text-slate-400">
              {step === 1 ? 'Adım 1: Bilgiler & Hedef' : 'Adım 2: Soru Seçimi'}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Step Indicator */}
        <div className="bg-white dark:bg-slate-800/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center gap-2">
          <button 
            onClick={() => setStep(1)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
              step === 1 ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            <span className="truncate">Genel Bilgiler & Kitle</span>
          </button>

          <button 
            onClick={() => { if (canProceedToStep2) setStep(2); else alert("Lütfen başlık, tarih ve kitleyi eksiksiz seçin."); }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
              step === 2 ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            <span className="truncate">Soru Seçimi ({selectedQuestionIds.length})</span>
          </button>
        </div>

        {/* STEP 1: INFO & TARGETS */}
        {step === 1 && (
          <div className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-5 sm:p-6 space-y-5 shadow-sm">
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">📌 Ödev Başlığı *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Örn: Hafta Sonu Matematik Üslü İfadeler Ödevi..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">⏱️ Soru Başı Süre (Dk)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={timePerQuestion}
                    onChange={e => setTimePerQuestion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">📅 Son Teslim Tarihi *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Date Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button type="button" onClick={() => setDueDatePreset(1)} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">⚡ Yarın</button>
                <button type="button" onClick={() => setDueDatePreset(3)} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">⚡ 3 Gün</button>
                <button type="button" onClick={() => setDueDatePreset(7)} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">⚡ 1 Hafta</button>
              </div>
            </div>

            {/* TARGET SELECTION */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xs text-slate-900 dark:text-white">🎓 Atanacak Kitle *</h4>
                <button type="button" onClick={handleSelectAllTargets} className="text-[11px] font-bold text-indigo-600 hover:underline">
                  Tümünü Seç / Kaldır
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => { setTargetMode('grade'); setSelectedTargets([]); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${targetMode === 'grade' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  Sınıf Bazlı ({curData.grades.length})
                </button>
                <button 
                  type="button" 
                  onClick={() => { setTargetMode('student'); setSelectedTargets([]); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${targetMode === 'student' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  Öğrenci Bazlı ({students.length})
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                {targetMode === 'grade' ? (
                  curData.grades.map(g => {
                    const checked = selectedTargets.includes(g.id);
                    return (
                      <label key={g.id} className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer ${checked ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 font-bold text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={checked} onChange={() => setSelectedTargets(p => p.includes(g.id) ? p.filter(id => id !== g.id) : [...p, g.id])} />
                          <span>🎓 {g.name}</span>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  filteredStudents.map(s => {
                    const checked = selectedTargets.includes(s.id);
                    return (
                      <label key={s.id} className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer ${checked ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 font-bold text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={checked} onChange={() => setSelectedTargets(p => p.includes(s.id) ? p.filter(id => id !== s.id) : [...p, s.id])} />
                          <span className="truncate">👤 {s.name}</span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <button 
              type="button" 
              onClick={() => { if (canProceedToStep2) setStep(2); else alert("Lütfen başlık, tarih ve atanacak kitleyi eksiksiz seçin."); }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span>Adım 2: Soru Seçimine Geç</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>
        )}

        {/* STEP 2: QUESTION SELECTION */}
        {step === 2 && (
          <div className="space-y-4">
            
            <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Seçilen Soru: <strong className="text-emerald-500 font-black">{selectedQuestionIds.length} Soru</strong>
              </span>
              <button type="button" onClick={handleSelectAllFilteredQuestions} className="text-xs font-bold text-indigo-600 hover:underline">
                Tümünü Seç / Kaldır
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 Soruları canlı ara..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto p-1">
              {filteredQuestions.map(q => {
                const checked = selectedQuestionIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleQuestionSelection(q.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      checked
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 shadow-sm"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input type="checkbox" checked={checked} readOnly className="rounded text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{q.title || q.questionText || 'Soru'}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{q.subject || 'Ders'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* STICKY SAVE BAR */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92vw] max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-3xl shadow-2xl flex items-center justify-between gap-3 z-50">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                {selectedQuestionIds.length} Soru Seçildi
              </span>
              <button
                type="button"
                onClick={handleSaveHomework}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> Ödevi Yayınla 🚀
              </button>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
