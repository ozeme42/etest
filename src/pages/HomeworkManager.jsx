import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, CheckCircle, Clock, X, Users, Edit2, BarChart2,
  ArrowRight, ArrowLeft, CheckSquare, Sparkles, BookOpen, Layers, Check, Search, Filter,
  GraduationCap, Calendar, AlertCircle, Eye, Bell, Send, Trophy, Ruler, TestTube2, BookCopy,
  Globe, MessageSquare, ChevronRight, School, LayoutGrid, List, FileText, Image, FileJson
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useUser } from '../context/UserContext';
import { useEvaluation } from '../context/EvaluationContext';
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

import { useAuth } from '../context/AuthContext';

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

  // Filter questions: Teachers see only their created questions, Admin sees all
  const questions = useMemo(() => {
    if (currentUser?.role === 'admin') return allQuestions;
    return (allQuestions || []).filter(q => q.createdBy === currentUser?.id || !q.createdBy);
  }, [allQuestions, currentUser]);

  const [isDirectAssignment, setIsDirectAssignment] = useState(false);

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

  // View mode: 'list' (homework dashboard & tracker) vs 'create' (2-step workspace)
  const [viewMode, setViewMode] = useState('list');
  
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [activeHomework, setActiveHomework] = useState(null);
  const [statsStudentFilter, setStatsStudentFilter] = useState('all'); // 'all', 'completed', 'pending'
  const [toastMessage, setToastMessage] = useState(null);
  
  const [activeTab, setActiveTab] = useState('active'); // 'all', 'active', 'expired'
  
  const [step, setStep] = useState(1); // 1: Info & Targets, 2: Question Selection
  
  const [editingHwId, setEditingHwId] = useState(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(2);
  
  const [targetMode, setTargetMode] = useState('grade'); // 'grade' or 'student'
  const [selectedTargets, setSelectedTargets] = useState([]); // array of IDs
  
  // Student Grade Filter for Student-based assignment
  const [studentGradeFilter, setStudentGradeFilter] = useState('all');

  // Question Bank Portal Mode inside Step 2: 'subjects' | 'grades' | 'questions'
  const [step2Mode, setStep2Mode] = useState('subjects');

  // Curriculum & Subject Card Filters for Step 2
  const [selGrade, setSelGrade] = useState('all');
  const [selSubject, setSelSubject] = useState('all');
  const [selUnit, setSelUnit] = useState('all');
  const [selTopic, setSelTopic] = useState('all');

  // Advanced Type & Format Filters for Step 2
  const [selQuestionType, setSelQuestionType] = useState('all');
  const [selContentType, setSelContentType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);

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

  // Calculate question count per subject
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

  // Calculate question count per grade
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

  // Filtered Questions Logic for Builder Step 2
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // 1. Grade Filter
      if (selGrade !== 'all') {
        const gSubjects = curData.subjects.filter(s => s.gradeId === selGrade).map(s => s.id);
        const gUnits = curData.units.filter(u => gSubjects.includes(u.subjectId)).map(u => u.id);
        const gTopics = curData.topics.filter(t => gUnits.includes(t.unitId)).map(t => t.id);
        const belongsToGrade = gTopics.includes(q.topicId) || gUnits.some(uId => q.topicId === `unit_${uId}_all`) || gSubjects.some(sId => q.topicId === `sub_${sId}_all`) || q.topicId === `grade_${selGrade}_all`;
        if (!belongsToGrade) return false;
      }

      // 2. Subject Filter
      if (selSubject !== 'all') {
        const sUnits = curData.units.filter(u => u.subjectId === selSubject).map(u => u.id);
        const sTopics = curData.topics.filter(t => sUnits.includes(t.unitId)).map(t => t.id);
        const belongsToSubject = sTopics.includes(q.topicId) || sUnits.some(uId => q.topicId === `unit_${uId}_all`) || q.topicId === `sub_${selSubject}_all`;
        if (!belongsToSubject) return false;
      }

      // 3. Unit Filter
      if (selUnit !== 'all') {
        const uTopics = curData.topics.filter(t => t.unitId === selUnit).map(t => t.id);
        const belongsToUnit = uTopics.includes(q.topicId) || q.topicId === `unit_${selUnit}_all` || q.topicId === selUnit;
        if (!belongsToUnit) return false;
      }

      // 4. Topic Filter
      if (selTopic !== 'all' && q.topicId !== selTopic) return false;

      // 5. Question Type Filter
      if (selQuestionType === 'coktan_secmeli' && q.type !== 'coktan_secmeli') return false;
      if (selQuestionType === 'acik_uclu' && q.type !== 'acik_uclu') return false;
      if (selQuestionType === 'bundle' && !q.isBundle) return false;

      // 6. Content Format Filter
      if (selContentType !== 'all') {
        const qCT = (q.contentType || '').toLowerCase();
        if (selContentType === 'pdf' && !qCT.includes('pdf')) return false;
        if (selContentType === 'html' && !qCT.includes('html')) return false;
        if (selContentType === 'text' && !qCT.includes('text') && !qCT.includes('metin')) return false;
        if (selContentType === 'gorsel' && !qCT.includes('gorsel') && !qCT.includes('image')) return false;
        if (selContentType === 'json' && !qCT.includes('json') && !q.questionsList) return false;
      }

      // 7. Search Filter (Title, Text, Topic/Unit/Subject/Grade Names)
      if (searchQuery.trim() !== '') {
        const qStr = searchQuery.toLowerCase().trim();
        let topicName = '';
        let unitName = '';
        let subjectName = '';

        const topicObj = curData.topics.find(t => t.id === q.topicId);
        if (topicObj) {
          topicName = topicObj.name.toLowerCase();
          const unitObj = curData.units.find(u => u.id === topicObj.unitId);
          if (unitObj) {
            unitName = unitObj.name.toLowerCase();
            const subjectObj = curData.subjects.find(s => s.id === unitObj.subjectId);
            if (subjectObj) subjectName = subjectObj.name.toLowerCase();
          }
        }

        const titleMatch = (q.title || q.name || '').toLowerCase().includes(qStr);
        const textMatch = (q.questionText || '').toLowerCase().includes(qStr);
        const payloadMatch = (q.contentPayload || '').toLowerCase().includes(qStr);
        const bundleMatch = q.questionsList?.some(item => (item.questionText || '').toLowerCase().includes(qStr));

        if (!titleMatch && !textMatch && !payloadMatch && !bundleMatch && !topicName.includes(qStr) && !unitName.includes(qStr) && !subjectName.includes(qStr)) {
          return false;
        }
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
      const gIds = curData.grades.map(g => g.id);
      const allSelected = gIds.every(id => selectedTargets.includes(id));
      setSelectedTargets(allSelected ? [] : gIds);
    } else {
      const fSIds = filteredStudents.map(s => s.id);
      const allSelected = fSIds.every(id => selectedTargets.includes(id));
      if (allSelected) {
        setSelectedTargets(prev => prev.filter(id => !fSIds.includes(id)));
      } else {
        setSelectedTargets(prev => Array.from(new Set([...prev, ...fSIds])));
      }
    }
  };

  const handleSaveHomework = (e) => {
    if (e) e.preventDefault();
    if (!title || !dueDate || selectedTargets.length === 0 || selectedQuestionIds.length === 0) {
      alert("Lütfen başlık, bitiş tarihi, atanacak kişiler ve soruları eksiksiz seçin.");
      return;
    }
    
    const selectedQuestions = questions.filter(q => selectedQuestionIds.includes(q.id));
    const totalQuestions = selectedQuestions.reduce((sum, q) => sum + (q.isBundle ? (q.questionCount || 1) : 1), 0);

    let subjectName = 'Genel (Tümü)';
    if (selSubject !== 'all' && selSubject !== '') {
      subjectName = curData.subjects.find(s => s.id === selSubject)?.name || subjectName;
    }

    const payload = {
      title,
      subject: subjectName,
      dueDate,
      timePerQuestion: parseInt(timePerQuestion, 10),
      time: totalQuestions * parseInt(timePerQuestion, 10),
      targetType: targetMode,
      targetIds: selectedTargets,
      questionIds: selectedQuestionIds,
      totalQuestions,
      filters: { selGrade, selSubject, selUnit, selTopic },
      assignedBy: currentUser?.id || 'admin'
    };

    if (editingHwId) {
      updateHomework(editingHwId, payload);
      showToast("Ödev başarıyla güncellendi! ✨");
    } else {
      addHomework(payload);
      showToast("Yeni ödev öğrencilere atandı! 🚀");
    }
    
    resetForm();
  };

  const getTargetLabel = (hw) => {
    if (hw.targetType === 'grade') {
      const names = hw.targetIds.map(id => curData.grades.find(g => g.id === id)?.name || id);
      return names.join(', ');
    } else {
      return `${hw.targetIds.length} Öğrenci`;
    }
  };

  const getHomeworkStats = (hw) => {
    let targetStudentIds = [];
    if (hw.targetType === 'grade') {
      targetStudentIds = students.filter(s => hw.targetIds.includes(s.gradeId)).map(s => s.id);
    } else {
      targetStudentIds = hw.targetIds;
    }
    
    const totalAssigned = targetStudentIds.length;
    const completedStudentIds = targetStudentIds.filter(stId => {
      const subInEval = submissions.find(s => 
        (s.testId === hw.id || s.hwId === hw.id || (hw.tests && (hw.tests.includes(s.testId) || hw.tests.includes(s.bookTestId)))) && 
        s.studentId === stId
      );
      const subInHw = (hw.submissions || []).find(s => s.studentId === stId);
      return !!(subInEval || subInHw);
    });

    const completed = completedStudentIds.length;
    const rate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
    
    return { totalAssigned, completed, rate, targetStudentIds };
  };

  // Overall Global Homework Analytics
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

  const selectStyle = {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '0.85rem',
    border: '1.5px solid #cbd5e1',
    fontSize: '0.95rem',
    fontWeight: 600,
    background: 'white'
  };

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE VIEW 1: HOMEWORK LIST & OVERVIEW DASHBOARD
  // ═════════════════════════════════════════════════════════════════════════
  if (viewMode === 'list') {
    return (
      <div className="container dashboard">
        
        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, background: '#10b981', color: 'white', padding: '0.85rem 1.5rem', borderRadius: '1rem', fontWeight: 900, boxShadow: '0 10px 25px rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} />
            <span>{toastMessage}</span>
          </div>
        )}

        <header className="dashboard-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Ödev Takip &amp; İnceleme Portalı 📝
            </h2>
            <p className="text-muted" style={{ margin: 0, fontWeight: 600 }}>
              Soru bankasından saniyeler içinde yeni ödev atayın, öğrencilerin teslim durumunu canlı izleyin.
            </p>
          </div>
        </header>

        <div className="dashboard-content">
          
          {/* ANALYTICS HEADER STAT CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            
            {/* Create Homework Card */}
            <div
              onClick={openCreatePage}
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                color: 'white', padding: '1.5rem', borderRadius: '1.5rem',
                cursor: 'pointer', boxShadow: '0 12px 28px -5px rgba(79,70,229,0.4)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px'
              }}
              className="hover:scale-[1.02] transition-all"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>➕ Yeni Ödev Atayın</span>
                <div style={{ width: '40px', height: '40px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={24} color="white" />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, fontWeight: 700 }}>
                Ders ve soru seçerek saniyeler içinde ödev hazırlayın ➔
              </p>
            </div>

            {/* Active Homeworks Stat */}
            <div className="card glass" style={{ padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '1.25rem', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={28} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 800 }}>Devam Eden Ödevler</p>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>{globalAnalytics.active} Ödev</h3>
              </div>
            </div>

            {/* Average Completion Stat */}
            <div className="card glass" style={{ padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '1.25rem', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={28} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 800 }}>Ortalama Katılım</p>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.8rem', fontWeight: 900, color: '#4f46e5' }}>%{globalAnalytics.avgRate}</h3>
              </div>
            </div>

            {/* Expired Homeworks Stat */}
            <div className="card glass" style={{ padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '1.25rem', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={28} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 800 }}>Süresi Dolanlar</p>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.8rem', fontWeight: 900, color: '#dc2626' }}>{globalAnalytics.expired} Ödev</h3>
              </div>
            </div>

          </div>

          {/* HOMEWORK TABLE & TAB SWITCHER */}
          <section className="available-tests">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 className="section-title" style={{ marginBottom: 0, fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={22} color="#4f46e5" />
                Ödev Listesi ve Canlı Takip Tablosu
              </h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', background: '#e2e8f0', padding: '0.3rem', borderRadius: '0.85rem' }}>
                <button
                  className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('all')}
                  style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem', borderRadius: '0.65rem', border: 'none' }}
                >
                  Tümü ({homeworks.length})
                </button>
                <button
                  className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('active')}
                  style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem', borderRadius: '0.65rem', border: 'none' }}
                >
                  Devam Edenler ({globalAnalytics.active})
                </button>
                <button
                  className={`btn ${activeTab === 'expired' ? 'btn-error' : 'btn-outline'}`}
                  onClick={() => setActiveTab('expired')}
                  style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem', borderRadius: '0.65rem', border: 'none' }}
                >
                  Süresi Bitenler ({globalAnalytics.expired})
                </button>
              </div>
            </div>
            
            <div className="card glass" style={{ borderRadius: '1.5rem', overflow: 'hidden', padding: 0 }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                    <th style={{ padding: '1.15rem 1.25rem', fontWeight: 900 }}>ÖDEV BAŞLIĞI</th>
                    <th style={{ padding: '1.15rem 1.25rem', fontWeight: 900 }}>HEDEF KİTLE</th>
                    <th style={{ padding: '1.15rem 1.25rem', fontWeight: 900 }}>SON TESLİM TARİHİ</th>
                    <th style={{ padding: '1.15rem 1.25rem', fontWeight: 900 }}>TAMAMLANMA ORANI</th>
                    <th style={{ padding: '1.15rem 1.25rem', textAlign: 'right', fontWeight: 900 }}>İŞLEMLER &amp; RAPOR</th>
                  </tr>
                </thead>
                <tbody>
                  {homeworks.filter(hw => {
                    const isPast = new Date(hw.dueDate) < new Date(new Date().setHours(0,0,0,0));
                    if (activeTab === 'active') return !isPast;
                    if (activeTab === 'expired') return isPast;
                    return true;
                  }).map(hw => {
                    const stats = getHomeworkStats(hw);
                    const isPast = new Date(hw.dueDate) < new Date(new Date().setHours(0,0,0,0));
                    
                    return (
                      <tr key={hw.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', background: 'white' }} className="hover:bg-slate-50">
                        <td style={{ padding: '1.15rem 1.25rem' }}>
                          <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                            {hw.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem', fontWeight: 600 }}>
                            📚 {hw.subject || 'Ders'} • {hw.totalQuestions} Soru
                          </div>
                        </td>

                        <td style={{ padding: '1.15rem 1.25rem' }}>
                          <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.8rem', fontWeight: 900, padding: '0.35rem 0.85rem', borderRadius: '20px' }}>
                            {getTargetLabel(hw)}
                          </span>
                        </td>

                        <td style={{ padding: '1.15rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.9rem', color: isPast ? '#dc2626' : '#1e293b' }}>
                            <Calendar size={16} />
                            <span>{new Date(hw.dueDate).toLocaleDateString('tr-TR')}</span>
                          </div>
                          {isPast ? (
                            <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 900, display: 'block', marginTop: '0.2rem' }}>⚠️ Süresi Doldu</span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 900, display: 'block', marginTop: '0.2rem' }}>🟢 Aktif Ödev</span>
                          )}
                        </td>

                        <td style={{ padding: '1.15rem 1.25rem', minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ flex: 1, background: '#e2e8f0', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                              <div style={{ width: `${stats.rate}%`, background: stats.rate === 100 ? '#10b981' : '#4f46e5', height: '100%', transition: 'width 0.5s ease' }}></div>
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>
                              %{stats.rate} <span style={{ color: '#64748b', fontWeight: 600 }}>({stats.completed}/{stats.totalAssigned})</span>
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '1.15rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => { setActiveHomework(hw); setStatsStudentFilter('all'); setShowStatsModal(true); }}
                              style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.55rem 1rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 8px rgba(79,70,229,0.25)' }}
                            >
                              <BarChart2 size={16} /> Rapor &amp; Detay Takip
                            </button>
                            
                            <button className="btn-icon" onClick={() => openEditPage(hw)} title="Düzenle" style={{ padding: '0.55rem', borderRadius: '0.65rem', background: '#f1f5f9' }}>
                              <Edit2 size={18} />
                            </button>

                            <button className="btn-icon text-error" onClick={() => { if(window.confirm('Bu ödevi silmek istediğinize emin misiniz?')) deleteHomework(hw.id); }} title="Sil" style={{ padding: '0.55rem', borderRadius: '0.65rem', background: '#fee2e2' }}>
                              <X size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {homeworks.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b', background: 'white' }}>
                        <BookOpen size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                        <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: '#334155' }}>Henüz Atanmış Ödev Bulunmuyor</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>Yukarıdaki "Yeni Ödev Atayın" butonuna tıklayarak ilk ödevinizi hazırlayabilirsiniz.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* DETAILED STUDENT PROGRESS & COMPLETION MODAL */}
        {showStatsModal && activeHomework && (() => {
          const stats = getHomeworkStats(activeHomework);
          const isPast = new Date(activeHomework.dueDate) < new Date(new Date().setHours(0,0,0,0));

          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
              <div className="card glass" style={{ width: '94vw', maxWidth: '850px', maxHeight: '92vh', overflowY: 'auto', padding: '2.5rem', borderRadius: '1.75rem', background: 'white', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📊 {activeHomework.title} Ödev Raporu
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                      Son Teslim Tarihi: {new Date(activeHomework.dueDate).toLocaleDateString('tr-TR')} • {isPast ? '⚠️ Süresi Doldu' : '🟢 Devam Ediyor'}
                    </p>
                  </div>

                  <button className="btn-icon" onClick={() => setShowStatsModal(false)} style={{ borderRadius: '50%', padding: '0.6rem', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}>
                    <X size={22} />
                  </button>
                </div>

                {/* Top Stat Summary Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
                  <div style={{ background: '#e0e7ff', padding: '1.15rem', borderRadius: '1.25rem', textAlign: 'center', border: '1px solid #c7d2fe' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#3730a3', lineHeight: 1 }}>{stats.totalAssigned}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4338ca', marginTop: '0.35rem' }}>Atanan Öğrenci</div>
                  </div>
                  <div style={{ background: '#ecfdf5', padding: '1.15rem', borderRadius: '1.25rem', textAlign: 'center', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', lineHeight: 1 }}>{stats.completed}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#047857', marginTop: '0.35rem' }}>Tamamlayan</div>
                  </div>
                  <div style={{ background: '#fef3c7', padding: '1.15rem', borderRadius: '1.25rem', textAlign: 'center', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#d97706', lineHeight: 1 }}>%{stats.rate}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#b45309', marginTop: '0.35rem' }}>Katılım Oranı</div>
                  </div>
                </div>

                {/* Filter Tabs for Students */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>Öğrenci Teslim Listesi</span>
                  <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.75rem' }}>
                    <button
                      onClick={() => setStatsStudentFilter('all')}
                      style={{ padding: '0.35rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', background: statsStudentFilter === 'all' ? '#4f46e5' : 'transparent', color: statsStudentFilter === 'all' ? 'white' : '#475569' }}
                    >
                      Tümü ({stats.targetStudentIds.length})
                    </button>
                    <button
                      onClick={() => setStatsStudentFilter('completed')}
                      style={{ padding: '0.35rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', background: statsStudentFilter === 'completed' ? '#10b981' : 'transparent', color: statsStudentFilter === 'completed' ? 'white' : '#475569' }}
                    >
                      Çözenler ({stats.completed})
                    </button>
                    <button
                      onClick={() => setStatsStudentFilter('pending')}
                      style={{ padding: '0.35rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', background: statsStudentFilter === 'pending' ? '#d97706' : 'transparent', color: statsStudentFilter === 'pending' ? 'white' : '#475569' }}
                    >
                      Bekleyenler ({stats.totalAssigned - stats.completed})
                    </button>
                  </div>
                </div>

                {/* Student List Table */}
                <div style={{ borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>
                        <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>ÖĞRENCİ</th>
                        <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>SINIF</th>
                        <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>DURUM</th>
                        <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>SKOR / NOT</th>
                        <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 900 }}>EYLEM</th>
                      </tr>
                    </thead>
                    <tbody>
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
                        
                        const submission = submissions.find(s => 
                          (s.testId === activeHomework.id || s.hwId === activeHomework.id || (activeHomework.tests && (activeHomework.tests.includes(s.testId) || activeHomework.tests.includes(s.bookTestId)))) && 
                          s.studentId === stId
                        ) || (activeHomework.submissions || []).find(s => s.studentId === stId);

                        const gradeName = curData.grades.find(g => g.id === student.gradeId)?.name || '-';
                        
                        const matchingSubInEval = submission || submissions.find(sub => sub.testId === activeHomework.id && sub.studentId === stId);

                        return (
                          <tr key={stId} style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4f46e5', color: 'white', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {student.name.charAt(0)}
                                </div>
                                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{student.name}</span>
                              </div>
                            </td>

                            <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                              {gradeName}
                            </td>

                            <td style={{ padding: '0.85rem 1rem' }}>
                              {submission ? (
                                <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.8rem', fontWeight: 900, padding: '0.25rem 0.65rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <CheckCircle size={14} /> Çözdü
                                </span>
                              ) : (
                                <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.8rem', fontWeight: 900, padding: '0.25rem 0.65rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Clock size={14} /> Bekliyor
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '0.85rem 1rem' }}>
                              {submission ? (
                                <span style={{ fontWeight: 900, color: '#10b981', fontSize: '0.95rem' }}>
                                  {submission.score} Puan
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>—</span>
                              )}
                            </td>

                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                              {submission ? (
                                <button
                                  onClick={() => {
                                    setShowStatsModal(false);
                                    if (matchingSubInEval) navigate(`/review/${matchingSubInEval.id}`);
                                    else showToast("Öğrenci sınav kağıdı hazırlanıyor...");
                                  }}
                                  style={{ background: '#e0e7ff', color: '#3730a3', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                  <Eye size={14} /> Kağıdı İncele
                                </button>
                              ) : (
                                <button
                                  onClick={() => showToast(`${student.name} isimli öğrenciye ödev hatırlatması gönderildi! 📩`)}
                                  style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                  <Send size={14} /> Hatırlat
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="container dashboard" style={{ paddingBottom: '5rem' }}>
      
      {/* Full-Page Top Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button 
          onClick={resetForm}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, padding: '0.65rem 1.25rem', borderRadius: '0.85rem' }}
        >
          <ArrowLeft size={20} />
          <span>Ödev Listesine Dön</span>
        </button>

        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.6rem', color: '#0f172a' }}>
            {editingHwId ? '✏️ Ödevi Düzenle' : '➕ Yeni Ödev Hazırlama Sihirbazı'}
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            {step === 1 ? 'Adım 1: Ödev Genel Bilgileri & Hedef Kitle' : 'Adım 2: Soru Bankasından Soruları Seçiniz'}
          </p>
        </div>
      </div>

      {/* Step Navigation Bar */}
      <div className="card glass" style={{ padding: '0.75rem', borderRadius: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', gap: '1rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '1rem' }}>
          
          <div 
            onClick={() => setStep(1)}
            style={{
              flex: 1, padding: '0.85rem 1.25rem', borderRadius: '0.75rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 900, fontSize: '0.95rem',
              background: step === 1 ? 'white' : 'transparent',
              color: step === 1 ? '#4f46e5' : '#64748b',
              boxShadow: step === 1 ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: step === 1 ? '#4f46e5' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>1</div>
            <span>1. Genel Bilgiler &amp; Hedef Kitle</span>
            {canProceedToStep2 && <CheckCircle size={18} color="#10b981" style={{ marginLeft: 'auto' }} />}
          </div>

          <div 
            onClick={() => { if (canProceedToStep2) setStep(2); else alert("Lütfen önce ödev başlığı, son tarih ve atanacak kitleyi seçin."); }}
            style={{
              flex: 1, padding: '0.85rem 1.25rem', borderRadius: '0.75rem',
              cursor: canProceedToStep2 ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 900, fontSize: '0.95rem',
              opacity: canProceedToStep2 ? 1 : 0.6,
              background: step === 2 ? 'white' : 'transparent',
              color: step === 2 ? '#4f46e5' : '#64748b',
              boxShadow: step === 2 ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: step === 2 ? '#4f46e5' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>2</div>
            <span>2. Soru Bankası Seçim Alanı ({selectedQuestionIds.length} Seçildi)</span>
          </div>

        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          STEP 1: GENERAL INFO & TARGET SELECTION
      ═════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="card glass" style={{ padding: '2.25rem', borderRadius: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', background: 'white' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            
            {/* Homework Title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', gridColumn: 'span 2' }}>
              <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
                📌 Ödev Başlığı <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={selectStyle}
                required
                placeholder="Örn: Hafta Sonu Matematik Üslü İfadeler Ödevi..."
              />
            </div>

            {/* Time per Question */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
                ⏱️ Soru Başı Süre (Dk)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={timePerQuestion}
                onChange={e => setTimePerQuestion(e.target.value)}
                style={selectStyle}
                required
              />
            </div>

            {/* Due Date with Quick Presets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', gridColumn: 'span 3' }}>
              <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
                📅 Son Teslim Tarihi <span style={{ color: 'red' }}>*</span>
              </label>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{ ...selectStyle, maxWidth: '240px' }}
                  required
                />

                {/* 1-Click Quick Date Presets */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setDueDatePreset(1)}
                    style={{ background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', padding: '0.45rem 0.85rem', borderRadius: '0.65rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    ⚡ Yarın
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueDatePreset(3)}
                    style={{ background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', padding: '0.45rem 0.85rem', borderRadius: '0.65rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    ⚡ 3 Gün Sonra
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueDatePreset(7)}
                    style={{ background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', padding: '0.45rem 0.85rem', borderRadius: '0.65rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    ⚡ Gelecek Hafta (7g)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueDatePreset(14)}
                    style={{ background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', padding: '0.45rem 0.85rem', borderRadius: '0.65rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    ⚡ 2 Hafta
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* TARGET SELECTION AREA */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: '#0f172a' }}>
                  🎓 Atanacak Hedef Kitle <span style={{ color: 'red' }}>*</span>
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  Sınıf bazında tüm şubeye veya seçtiğiniz özel öğrencilere atayın.
                </p>
              </div>

              <button 
                type="button" 
                onClick={handleSelectAllTargets}
                style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', background: '#e0e7ff', padding: '0.5rem 1rem', borderRadius: '0.65rem', border: '1.5px solid #a5b4fc', cursor: 'pointer' }}
              >
                {targetMode === 'grade' ? 'Tüm Sınıfları Seç / Kaldır' : 'Öğrencileri Seç / Kaldır'}
              </button>
            </div>

            {/* Target Mode Switch Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
              <button 
                type="button" 
                className={`btn ${targetMode === 'grade' ? 'btn-primary' : 'btn-outline'}`} 
                onClick={() => { setTargetMode('grade'); setSelectedTargets([]); }}
                style={{ flex: 1, padding: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '0.85rem' }}
              >
                <Layers size={20} /> Sınıf Bazlı Ata ({curData.grades.length} Sınıf)
              </button>
              <button 
                type="button" 
                className={`btn ${targetMode === 'student' ? 'btn-primary' : 'btn-outline'}`} 
                onClick={() => { setTargetMode('student'); setSelectedTargets([]); }}
                style={{ flex: 1, padding: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '0.85rem' }}
              >
                <Users size={20} /> Öğrenci Bazlı Ata ({students.length} Öğrenci)
              </button>
            </div>

            {/* Target Checkbox Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', padding: '1.25rem', background: '#f8fafc', borderRadius: '1.25rem', border: '1px solid #cbd5e1' }}>
              {targetMode === 'grade' ? (
                curData.grades.map(g => {
                  const isChecked = selectedTargets.includes(g.id);
                  const stCount = students.filter(s => s.gradeId === g.id).length;
                  return (
                    <label 
                      key={g.id} 
                      style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', 
                        borderRadius: '0.75rem', border: isChecked ? '2px solid #4f46e5' : '1px solid #cbd5e1', 
                        background: isChecked ? '#e0e7ff' : 'white', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem',
                        color: isChecked ? '#3730a3' : '#334155'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => {
                            setSelectedTargets(prev => 
                              prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                            );
                          }}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span>🎓 {g.name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', background: isChecked ? '#4f46e5' : '#e2e8f0', color: isChecked ? 'white' : '#64748b', padding: '0.2rem 0.55rem', borderRadius: '12px' }}>
                        {stCount} Öğrenci
                      </span>
                    </label>
                  );
                })
              ) : (
                filteredStudents.map(s => {
                  const isChecked = selectedTargets.includes(s.id);
                  const gName = curData.grades.find(g => g.id === s.gradeId)?.name || '-';
                  return (
                    <label 
                      key={s.id} 
                      style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', 
                        borderRadius: '0.75rem', border: isChecked ? '2px solid #4f46e5' : '1px solid #cbd5e1', 
                        background: isChecked ? '#e0e7ff' : 'white', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem',
                        color: isChecked ? '#3730a3' : '#334155'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => {
                            setSelectedTargets(prev => 
                              prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                            );
                          }}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span>👤 {s.name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', background: '#cbd5e1', color: '#1e293b', padding: '0.15rem 0.5rem', borderRadius: '10px' }}>
                        {gName}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Footer for Step 1 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => {
                if (canProceedToStep2) setStep(2);
                else alert("Lütfen başlık, son tarih ve atanacak kitleyi eksiksiz doldurun.");
              }}
              style={{
                padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: 900,
                display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.85rem',
                background: (isDirectAssignment && selectedQuestionIds.length > 0) ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined,
                boxShadow: (isDirectAssignment && selectedQuestionIds.length > 0) ? '0 6px 16px rgba(16,185,129,0.35)' : undefined
              }}
            >
              <span>{(isDirectAssignment && selectedQuestionIds.length > 0) ? 'Adım 2: Ödev Atamasını Tamamla 🚀' : 'Adım 2: Soru Bankası Seçimine Geç'}</span>
              <ArrowRight size={20} />
            </button>
          </div>

        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          STEP 2: EXACT QUESTION BANK PORTAL VIEW OR DIRECT ASSIGNMENT SUMMARY
      ═════════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* DIRECT ASSIGNMENT MODE UI (SORU BANKASINDAN DİREKT ATAMA ÖZETİ) */}
          {isDirectAssignment && selectedQuestionIds.length > 0 ? (
            <div className="card glass" style={{ padding: '2.25rem', borderRadius: '1.75rem', background: 'white', display: 'flex', flexDirection: 'column', gap: '1.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem' }}>
                <div>
                  <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.82rem', fontWeight: 900, padding: '0.35rem 0.85rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} /> Soru Bankasından Direkt Atama
                  </span>
                  <h3 style={{ margin: '0.5rem 0 0 0', fontWeight: 900, fontSize: '1.5rem', color: '#0f172a' }}>
                    🚀 Ödev Atama Özeti ve Yayınlama Onayı
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDirectAssignment(false)}
                  style={{ background: '#eff6ff', color: '#4f46e5', border: '1.5px solid #c7d2fe', padding: '0.65rem 1.25rem', borderRadius: '0.85rem', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <Search size={16} /> Soru Bankasından Başka Sorular da Ekle
                </button>
              </div>

              {/* Grid Summaries */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.35rem' }}>
                
                {/* Selected Question Details */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1.35rem', padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                    📚 Atanacak Soru / İçerik ({selectedQuestionIds.length})
                  </div>
                  {questions.filter(q => selectedQuestionIds.includes(q.id)).map(q => (
                    <div key={q.id} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.95rem', padding: '1rem', marginBottom: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.05rem', lineHeight: 1.35 }}>
                        {q.title || q.questionText || 'Seçilen Soru'}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 700, marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                          {q.subject || 'Ders'}
                        </span>
                        <span>
                          {q.contentType === 'gorsel' ? '🖼️ Görsel Soru' : (q.contentType === 'pdf' ? '📕 PDF Paketi' : (q.contentType === 'html' ? '🌐 HTML Paketi' : (q.questionsList ? `📚 Toplu Test (${q.questionsList.length} Soru)` : '📝 Metin Sorusu')))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Target Audience Summary */}
                <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '1.35rem', padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                    👥 Atanacak Hedef Kitle
                  </div>
                  <div style={{ fontWeight: 900, color: '#1e3a8a', fontSize: '1.25rem' }}>
                    {targetMode === 'grade' 
                      ? curData.grades.filter(g => selectedTargets.includes(g.id)).map(g => g.name).join(', ')
                      : `${selectedTargets.length} Öğrenci Seçildi`
                    }
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 700, margin: '0.45rem 0 0 0' }}>
                    Seçilen tüm öğrencilerin paneline ödev anında düşecektir.
                  </p>
                </div>

                {/* Date & Duration Summary */}
                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '1.35rem', padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                    📅 Bitiş Tarihi &amp; Süre
                  </div>
                  <div style={{ fontWeight: 900, color: '#14532d', fontSize: '1.25rem' }}>
                    {dueDate ? new Date(dueDate).toLocaleDateString('tr-TR') : '-'}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 700, margin: '0.45rem 0 0 0' }}>
                    ⏱️ Soru başına {timePerQuestion} dakika süre verilecek.
                  </p>
                </div>

              </div>

              {/* Primary Direct Save Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '0.85rem 1.5rem', borderRadius: '0.85rem', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ArrowLeft size={18} />
                  <span>1. Adıma Dön (Tarih &amp; Kitle Değiştir)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveHomework}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', padding: '1rem 2.5rem', borderRadius: '0.85rem', fontWeight: 900, fontSize: '1.15rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 8px 24px rgba(16,185,129,0.4)' }}
                >
                  <CheckCircle size={22} />
                  <span>Ödevi Hemen Atayarak Yayınla 🚀</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Top Switcher Tabs (Ders Kartları vs Sınıf Kartları vs Tüm Sorular) */}
              <div className="card glass" style={{ padding: '0.75rem 1.25rem', borderRadius: '1.5rem', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '0.85rem' }}>
                    <button
                      type="button"
                      onClick={() => { setStep2Mode('subjects'); setSelSubject('all'); setSelGrade('all'); }}
                      style={{
                        padding: '0.55rem 1.25rem', borderRadius: '0.65rem', border: 'none', cursor: 'pointer',
                        fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: step2Mode === 'subjects' ? '#4f46e5' : 'transparent',
                        color: step2Mode === 'subjects' ? 'white' : '#475569',
                        boxShadow: step2Mode === 'subjects' ? '0 4px 10px rgba(79,70,229,0.3)' : 'none'
                      }}
                    >
                      <LayoutGrid size={18} /> Ders Kartları ile Seç ({curData.subjects.length} Ders)
                    </button>

                <button
                  type="button"
                  onClick={() => { setStep2Mode('grades'); setSelGrade('all'); setSelSubject('all'); }}
                  style={{
                    padding: '0.55rem 1.25rem', borderRadius: '0.65rem', border: 'none', cursor: 'pointer',
                    fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: step2Mode === 'grades' ? '#4f46e5' : 'transparent',
                    color: step2Mode === 'grades' ? 'white' : '#475569',
                    boxShadow: step2Mode === 'grades' ? '0 4px 10px rgba(79,70,229,0.3)' : 'none'
                  }}
                >
                  <GraduationCap size={18} /> Sınıf Kartları ile Seç ({curData.grades.length} Sınıf)
                </button>

                <button
                  type="button"
                  onClick={() => { setStep2Mode('questions'); }}
                  style={{
                    padding: '0.55rem 1.25rem', borderRadius: '0.65rem', border: 'none', cursor: 'pointer',
                    fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: step2Mode === 'questions' ? '#4f46e5' : 'transparent',
                    color: step2Mode === 'questions' ? 'white' : '#475569',
                    boxShadow: step2Mode === 'questions' ? '0 4px 10px rgba(79,70,229,0.3)' : 'none'
                  }}
                >
                  <List size={18} /> Tüm Soru Listesi ({questions.length})
                </button>
              </div>

              {/* Selected Counter Badge */}
              <span style={{ background: '#10b981', color: 'white', padding: '0.55rem 1.25rem', borderRadius: '20px', fontWeight: 900, fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={18} /> {selectedQuestionIds.length} Soru / Test Ödeve Eklendi
              </span>

            </div>
          </div>

          {/* VIEW 1: SUBJECT CARDS GRID (DERS KARTLARI GÖRÜNÜMÜ) */}
          {step2Mode === 'subjects' && selSubject === 'all' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              
              {/* All Subjects Card */}
              <div
                onClick={() => { setSelSubject('all'); setStep2Mode('questions'); }}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                  color: 'white', padding: '1.75rem', borderRadius: '1.5rem', cursor: 'pointer',
                  boxShadow: '0 10px 25px rgba(79,70,229,0.3)', display: 'flex', flexDirection: 'column',
                  justify: 'space-between', minHeight: '160px', transition: 'all 0.2s'
                }}
                className="hover:scale-[1.02]"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.65rem', borderRadius: '12px', uppercase: 'true' }}>GENEL PORTFÖY</span>
                    <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.35rem', fontWeight: 900 }}>🌟 Tüm Dersler &amp; Testler</h3>
                  </div>
                  <div style={{ width: '44px', height: '44px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={24} color="white" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{questions.length} Soru / Test Mevcut</span>
                  <ChevronRight size={20} />
                </div>
              </div>

              {/* Individual Subject Cards */}
              {curData.subjects.map(s => {
                const count = subjectQuestionCounts[s.id] || 0;
                const theme = subjectThemes[s.name] || subjectThemes['Diğer'];
                const IconComponent = theme.icon;

                return (
                  <div
                    key={s.id}
                    onClick={() => { setSelSubject(s.id); setStep2Mode('questions'); }}
                    style={{
                      background: theme.bg, color: 'white', padding: '1.75rem', borderRadius: '1.5rem',
                      cursor: 'pointer', boxShadow: '0 10px 22px rgba(0,0,0,0.12)', display: 'flex',
                      flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px', transition: 'all 0.2s'
                    }}
                    className="hover:scale-[1.02]"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.65rem', borderRadius: '12px' }}>DERS KARTI</span>
                        <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.35rem', fontWeight: 900 }}>{s.name}</h3>
                      </div>
                      <div style={{ width: '44px', height: '44px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconComponent size={24} color="white" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{count} Soru &amp; Test İçeriği</span>
                      <ChevronRight size={20} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: GRADE CARDS GRID (SINIF KARTLARI GÖRÜNÜMÜ) */}
          {step2Mode === 'grades' && selGrade === 'all' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {curData.grades.map(g => {
                const count = gradeQuestionCounts[g.id] || 0;
                const theme = gradeThemes[g.name] || gradeThemes['Diğer'];
                const IconComponent = theme.icon;

                return (
                  <div
                    key={g.id}
                    onClick={() => { setSelGrade(g.id); setStep2Mode('questions'); }}
                    style={{
                      background: theme.bg, color: 'white', padding: '1.75rem', borderRadius: '1.5rem',
                      cursor: 'pointer', boxShadow: '0 10px 22px rgba(0,0,0,0.12)', display: 'flex',
                      flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px', transition: 'all 0.2s'
                    }}
                    className="hover:scale-[1.02]"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(255,255,255,0.25)', padding: '0.25rem 0.65rem', borderRadius: '12px' }}>SINIF PORTFÖYÜ</span>
                        <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.4rem', fontWeight: 900 }}>🎓 {g.name}</h3>
                      </div>
                      <div style={{ width: '44px', height: '44px', borderRadius: '1rem', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconComponent size={24} color="white" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{count} Soru &amp; Test İçeriği</span>
                      <ChevronRight size={20} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 3: QUESTIONS LIST (DESIRED QUESTION BANK LIST VIEW) */}
          {(step2Mode === 'questions' || selSubject !== 'all' || selGrade !== 'all') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Breadcrumb / Back Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '0.85rem 1.25rem', borderRadius: '1.25rem', border: '1px solid #cbd5e1' }}>
                <button
                  type="button"
                  onClick={() => { setSelSubject('all'); setSelGrade('all'); setStep2Mode('subjects'); }}
                  style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '0.45rem 0.85rem', borderRadius: '0.65rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <ArrowLeft size={16} /> Kartlara Dön
                </button>

                <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                  📌 {selSubject !== 'all' ? curData.subjects.find(s => s.id === selSubject)?.name : (selGrade !== 'all' ? curData.grades.find(g => g.id === selGrade)?.name : 'Tüm Sorular')} ({filteredQuestions.length} İçerik Bulundu)
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllFilteredQuestions}
                  style={{ background: '#e0e7ff', color: '#3730a3', border: '1px solid #a5b4fc', padding: '0.45rem 0.85rem', borderRadius: '0.65rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <CheckSquare size={16} /> Tümünü Seç / Kaldır
                </button>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="🔍 Soru metni, test ismi veya konuya göre canlı ara..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.2rem 0.75rem 2.75rem',
                    borderRadius: '1rem',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    background: 'white'
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Question Cards List (2-Column Grid) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.15rem' }}>
                {filteredQuestions.map(q => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestionSelection(q.id)}
                      style={{
                        background: isSelected ? '#ecfdf5' : 'white',
                        borderRadius: '1.25rem',
                        border: isSelected ? '2.5px solid #10b981' : '1px solid #cbd5e1',
                        padding: '1.25rem 1.5rem',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 6px 16px rgba(16,185,129,0.15)' : '0 2px 4px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        gap: '1rem'
                      }}
                      className="hover:shadow-md"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#10b981' }}
                        />

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                            {(q.title || q.name) && (
                              <span style={{ background: '#4f46e5', color: 'white', fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.65rem', borderRadius: '6px' }}>
                                🏷️ {q.title || q.name}
                              </span>
                            )}
                            <span style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                              {q.contentType === 'gorsel' ? '🖼️ Görsel Soru' : (q.contentType === 'pdf' ? '📕 PDF Paketi' : (q.contentType === 'html' ? '🌐 HTML Paketi' : (q.questionsList ? '📚 Toplu Test' : '📝 Metin Sorusu')))}
                            </span>
                            <span style={{ background: q.type === 'coktan_secmeli' ? '#dcfce7' : '#fef3c7', color: q.type === 'coktan_secmeli' ? '#166534' : '#92400e', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                              {q.type === 'coktan_secmeli' ? '🔘 Çoktan Seçmeli' : '📝 Açık Uçlu'}
                            </span>
                          </div>

                          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.4 }}>
                            {q.questionsList ? `Toplu Test Paketi (${q.questionsList.length} Soru)` : (q.questionText || q.title || 'İçerik Sorusu')}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleQuestionSelection(q.id); }}
                        style={{
                          background: isSelected ? '#10b981' : '#4f46e5',
                          color: 'white', border: 'none', padding: '0.6rem 1.2rem',
                          borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: isSelected ? '0 4px 10px rgba(16,185,129,0.3)' : '0 4px 10px rgba(79,70,229,0.3)'
                        }}
                      >
                        {isSelected ? <Check size={16} /> : <Plus size={16} />}
                        <span>{isSelected ? 'Ödeve Eklendi' : 'Ödeve Ekle'}</span>
                      </button>
                    </div>
                  );
                })}

                {filteredQuestions.length === 0 && (
                  <div className="card glass" style={{ padding: '3.5rem', textAlign: 'center', background: 'white', borderRadius: '1.5rem', border: '2px dashed #cbd5e1' }}>
                    <Search size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: '#334155' }}>Aranan Filtrelere Uygun Soru Bulunamadı</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>Lütfen farklı bir ders seçin veya arama kriterini değiştirin.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Sticky Bottom Save Bar */}
          <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', width: '92vw', maxWidth: '1000px', background: 'white', border: '2.5px solid #4f46e5', padding: '1.15rem 2rem', borderRadius: '1.5rem', boxShadow: '0 20px 40px rgba(15,23,42,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', zIndex: 1000 }}>
            <div>
              <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🚀 Ödev Hazırlama Özeti
              </span>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>
                {selectedQuestionIds.length} Soru/Test Seçildi • Atanacak Hedef: {selectedTargets.length} Kitle/Öğrenci
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '0.75rem 1.25rem', borderRadius: '0.85rem', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer' }}
              >
                Geri Dön (1. Adım)
              </button>
              
              <button
                type="button"
                onClick={handleSaveHomework}
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '0.85rem', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 6px 16px rgba(16,185,129,0.35)' }}
              >
                <CheckCircle size={20} />
                <span>{editingHwId ? 'Değişiklikleri Kaydet' : 'Ödevi Yayınla ve Ata'}</span>
              </button>
            </div>
          </div>
            </>
          )}

        </div>
      )}

    </div>
  );
}
