import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle, Search, Filter, CheckCircle2, XCircle,
  ArrowLeft, GraduationCap, Ruler, TestTube2, BookCopy, Globe,
  MessageSquare, Sparkles, BookOpen, Layers, Trophy, HelpCircle, Eye,
  Table, List, ChevronRight, Check, Clock, Plus, Upload,
  Image as ImageIcon, Trash2, ZoomIn, X, Camera, BookMarked,
  RotateCcw, ExternalLink
} from 'lucide-react';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useCoaching } from '../context/CoachingContext';
import { useHomework } from '../context/HomeworkContext';
import { useAuth } from '../context/AuthContext';

const SUBJECT_CONFIG = {
  'Tümü': { label: 'Tüm Dersler', icon: GraduationCap, color: '#818cf8', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(129, 140, 248, 0.35)' },
  'Matematik': { label: 'Matematik', icon: Ruler, color: '#60a5fa', bg: 'rgba(37, 99, 235, 0.12)', border: 'rgba(96, 165, 250, 0.35)' },
  'Fen Bilimleri': { label: 'Fen Bilimleri', icon: TestTube2, color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(52, 211, 153, 0.35)' },
  'Türkçe': { label: 'Türkçe', icon: BookCopy, color: '#fb923c', bg: 'rgba(234, 88, 12, 0.12)', border: 'rgba(251, 146, 60, 0.35)' },
  'Sosyal Bilgiler': { label: 'Sosyal Bilgiler', icon: Globe, color: '#c084fc', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(192, 132, 252, 0.35)' },
  'İngilizce': { label: 'İngilizce', icon: MessageSquare, color: '#fb7185', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(251, 113, 133, 0.35)' },
  'Din Kültürü': { label: 'Din Kültürü', icon: BookOpen, color: '#2dd4bf', bg: 'rgba(20, 184, 166, 0.12)', border: 'rgba(45, 212, 191, 0.35)' },
  'Genel Testler': { label: 'Genel Testler', icon: Trophy, color: '#a5b4fc', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(165, 180, 252, 0.35)' },
};

const REASON_PRESETS = [
  '⚡ İşlem Hatası',
  '⚠️ Dikkat / Yanlış Okuma',
  '📖 Formül / Bilgi Unutuldu',
  '🧠 Konu Eksiği Var',
  '🧩 Soru Tarzını Anlamadım',
  '⏱️ Zaman Yetmedi'
];

export default function StudentWrongAnswersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { questions: bankQuestions } = useQuestionBank();
  const { data: curData } = useCurriculum();
  const { homeworks } = useHomework();
  const {
    getCoachingProfileForStudent,
    addStudentError,
    updateStudentError,
    deleteStudentError
  } = useCoaching();

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    if (!selectedStudent) {
      if (currentUser?.role === 'student') {
        setSelectedStudent(currentUser);
      } else if (studentMembers.length > 0) {
        setSelectedStudent(studentMembers[0]);
      }
    }
  }, [currentUser, studentMembers, selectedStudent]);

  // Main Tabs: 'wrong_controls' (Sınav Yanlışları) vs 'error_notebook' (Hata Defterim)
  const [activeMainTab, setActiveMainTab] = useState('wrong_controls');

  // Selected Subject Filter (null or subject name)
  const [selectedSubject, setSelectedSubject] = useState('Tümü');

  useEffect(() => {
    if (location.state?.subject !== undefined) {
      setSelectedSubject(location.state.subject || 'Tümü');
    }
  }, [location.state]);

  // Persistent Whole-Test Review State in localStorage
  const [reviewedSubSet, setReviewedSubSet] = useState(() => {
    try {
      const saved = localStorage.getItem('eTestReviewedSubmissions');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  const toggleSubmissionReviewed = (subId, e) => {
    if (e) e.stopPropagation();
    setReviewedSubSet(prev => {
      const next = new Set(prev);
      if (next.has(subId)) {
        next.delete(subId);
      } else {
        next.add(subId);
      }
      try {
        localStorage.setItem('eTestReviewedSubmissions', JSON.stringify(Array.from(next)));
      } catch (err) {}
      return next;
    });
  };

  const handleOpenReview = (subId, e) => {
    if (e) e.stopPropagation();
    navigate(`/review/${subId}`, {
      state: { from: '/wrong-answers', subject: selectedSubject }
    });
  };

  // View Mode: 'cards' | 'table'
  const [viewMode, setViewMode] = useState('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all', 'unreviewed', 'reviewed'

  // Hata Defteri Modals & States
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingErrorModal, setViewingErrorModal] = useState(null);
  const [notebookStatusFilter, setNotebookStatusFilter] = useState('all'); // 'all', 'active', 'resolved'
  const [notebookSearchQuery, setNotebookSearchQuery] = useState('');

  const [newErrorForm, setNewErrorForm] = useState({
    homeworkId: '',
    testTitle: '',
    subject: 'Matematik',
    topic: '',
    questionNo: '',
    imageUrl: '',
    reason: '⚡ İşlem Hatası',
    note: '',
    solutionNote: ''
  });

  const activeStudent = useMemo(() => {
    return selectedStudent || (currentUser?.role === 'student' ? currentUser : studentMembers[0]) || { id: 'u1', name: 'Öğrenci' };
  }, [selectedStudent, currentUser, studentMembers]);

  const currentProfile = useMemo(() => {
    if (!activeStudent?.id) return null;
    return getCoachingProfileForStudent(activeStudent.id);
  }, [getCoachingProfileForStudent, activeStudent]);

  const studentErrors = useMemo(() => {
    return currentProfile?.errors || [];
  }, [currentProfile]);

  // Curriculum map
  const allCurTestsMap = useMemo(() => {
    const map = new Map();
    if (!curData) return map;
    (curData.tests || []).forEach(t => {
      if (t.id) map.set(t.id, { title: t.title || t.name, subject: t.subjectName || t.subject });
    });
    (curData.grades || []).forEach(g => {
      (g.subjects || []).forEach(s => {
        (s.units || []).forEach(u => {
          (u.topics || []).forEach(top => {
            (top.tests || []).forEach(t => {
              if (t.id) map.set(t.id, { title: t.title || t.name, subject: s.name, topic: top.name });
            });
          });
        });
      });
    });
    return map;
  }, [curData]);

  // Submissions for activeStudent
  const allSubmissions = useMemo(() => {
    if (!activeStudent?.id) return [];
    const studentIdStr = String(activeStudent.id);

    const baseSubs = (submissions || []).filter(s => {
      if (!s) return false;
      const sid = String(s.studentId || s.student_id || s.userId || '');
      return sid === studentIdStr;
    });

    const hwSubs = [];
    (homeworks || []).forEach(hw => {
      (hw.submissions || []).forEach(sub => {
        if (String(sub.studentId || sub.student_id || sub.userId) === studentIdStr) {
          const alreadyExists = baseSubs.some(s =>
            String(s.hwId || s.testId || s.id) === String(hw.id)
          );
          if (!alreadyExists) {
            hwSubs.push({
              id: `hw_sub_${hw.id}_${studentIdStr}`,
              hwId: hw.id,
              testId: hw.id,
              testTitle: hw.title,
              subject: hw.subject,
              studentId: studentIdStr,
              score: sub.score,
              submittedAt: sub.completedAt || sub.submittedAt || sub.createdAt || new Date().toISOString(),
              isHomework: true,
              type: hw.type || 'homework',
              totalQuestions: hw.totalQuestions || sub.totalQuestions || 0,
              correctCount: sub.correctCount,
              wrongCount: sub.wrongCount,
              blankCount: sub.blankCount,
              answers: sub.answers || sub.studentAnswers || []
            });
          }
        }
      });
    });

    return [...baseSubs, ...hwSubs];
  }, [submissions, homeworks, activeStudent]);

  // Grouped Submissions
  const testGroupedSubmissions = useMemo(() => {
    const parsedSubs = allSubmissions.map(sub => {
      const wrongQuestions = [];
      const blankQuestions = [];
      let correctCount = 0;

      const rawAnswers = sub.answers || sub.studentAnswers || [];

      if (Array.isArray(rawAnswers) && rawAnswers.length > 0) {
        rawAnswers.forEach((ans, idx) => {
          const qNum = ans.subIndex !== undefined ? ans.subIndex + 1 : (ans.questionNo || idx + 1);
          if (ans.isCorrect === true) {
            correctCount++;
          } else if (ans.isCorrect === false) {
            const isBlank = ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '' || (typeof ans.userAnswer === 'string' && ans.userAnswer.trim() === '');
            if (isBlank) {
              blankQuestions.push({ qNum, questionId: ans.questionId, subIndex: ans.subIndex });
            } else {
              wrongQuestions.push({ qNum, questionId: ans.questionId, subIndex: ans.subIndex });
            }
          }
        });
      } else {
        const wCount = sub.wrongCount !== undefined ? sub.wrongCount : (sub.wrong_count || 0);
        const eCount = sub.emptyCount !== undefined ? sub.emptyCount : (sub.empty_count || sub.blankCount || 0);
        correctCount = sub.correctCount !== undefined ? sub.correctCount : (sub.correct_count || 0);

        for (let i = 1; i <= wCount; i++) wrongQuestions.push({ qNum: i });
        for (let j = 1; j <= eCount; j++) blankQuestions.push({ qNum: wCount + j });
      }

      const matchedHw = (homeworks || []).find(h =>
        String(h.id) === String(sub.hwId) ||
        String(h.id) === String(sub.testId) ||
        String(h.id) === String(sub.id)
      );
      const matchedTest = allCurTestsMap.get(sub.testId) || allCurTestsMap.get(sub.hwId);

      let resolvedTitle = sub.testTitle || sub.title;
      const isGeneric = !resolvedTitle ||
        resolvedTitle.trim().toLowerCase() === 'test sınavı' ||
        resolvedTitle.trim().toLowerCase() === 'test sinavi' ||
        resolvedTitle.trim().toLowerCase() === 'test';

      if (matchedHw?.title) {
        resolvedTitle = matchedHw.title;
      } else if (matchedTest?.title) {
        resolvedTitle = matchedTest.title;
      } else if (isGeneric) {
        if (matchedHw?.subject) resolvedTitle = `${matchedHw.subject} Ödevi`;
        else resolvedTitle = 'Sınav Testi';
      }

      let subject = sub.subject;
      if (matchedHw?.subject && SUBJECT_CONFIG[matchedHw.subject]) {
        subject = matchedHw.subject;
      } else if (matchedTest?.subject && SUBJECT_CONFIG[matchedTest.subject]) {
        subject = matchedTest.subject;
      } else if (!subject || subject === 'Genel' || !SUBJECT_CONFIG[subject]) {
        const titleLower = (resolvedTitle || '').toLowerCase();
        if (titleLower.includes('mat')) subject = 'Matematik';
        else if (titleLower.includes('fen')) subject = 'Fen Bilimleri';
        else if (titleLower.includes('türk') || titleLower.includes('turk')) subject = 'Türkçe';
        else if (titleLower.includes('sosyal') || titleLower.includes('inkılap') || titleLower.includes('inkilap')) subject = 'Sosyal Bilgiler';
        else if (titleLower.includes('ing') || titleLower.includes('english')) subject = 'İngilizce';
        else if (titleLower.includes('din')) subject = 'Din Kültürü';
        else if (titleLower.includes('deneme')) subject = 'Genel Testler';
        else subject = 'Matematik';
      }

      const topic = sub.topic || matchedHw?.topic || matchedHw?.topicName || matchedHw?.unit || matchedTest?.topic || '';
      const isReviewed = reviewedSubSet.has(sub.id);
      const dateStr = sub.submittedAt || sub.createdAt || sub.created_at || new Date().toISOString();
      const totQ = sub.totalQuestions || rawAnswers.length || (wrongQuestions.length + blankQuestions.length + correctCount) || 10;

      return {
        ...sub,
        testTitle: resolvedTitle,
        subject,
        topic,
        submittedAt: dateStr,
        wrongQuestions,
        blankQuestions,
        correctCount: correctCount || Math.max(0, totQ - wrongQuestions.length - blankQuestions.length),
        totalQuestions: totQ,
        isReviewed,
        hasErrors: wrongQuestions.length > 0 || blankQuestions.length > 0
      };
    });

    return parsedSubs.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [allSubmissions, homeworks, allCurTestsMap, reviewedSubSet]);

  // Filtered Test Submissions
  const filteredTestSubmissions = useMemo(() => {
    return testGroupedSubmissions.filter(sub => {
      const textMatch =
        !searchQuery.trim() ||
        (sub.testTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.topic || '').toLowerCase().includes(searchQuery.toLowerCase());

      const subjectMatch = !selectedSubject || selectedSubject === 'Tümü' || sub.subject === selectedSubject;

      let reviewMatch = true;
      if (reviewFilter === 'unreviewed') reviewMatch = !sub.isReviewed;
      else if (reviewFilter === 'reviewed') reviewMatch = sub.isReviewed;
      else if (reviewFilter === 'wrong_only') reviewMatch = sub.wrongQuestions.length > 0;

      return textMatch && subjectMatch && reviewMatch;
    });
  }, [testGroupedSubmissions, selectedSubject, searchQuery, reviewFilter]);

  // Overall Global Counts
  const globalWrongCount = useMemo(() => testGroupedSubmissions.reduce((acc, sub) => acc + sub.wrongQuestions.length, 0), [testGroupedSubmissions]);
  const globalBlankCount = useMemo(() => testGroupedSubmissions.reduce((acc, sub) => acc + sub.blankQuestions.length, 0), [testGroupedSubmissions]);
  const globalReviewedCount = useMemo(() => testGroupedSubmissions.filter(sub => sub.isReviewed).length, [testGroupedSubmissions]);

  // Available Homework options for Add Modal
  const availableHomeworkOptions = useMemo(() => {
    if (!selectedStudent) return [];
    const map = new Map();

    testGroupedSubmissions.forEach(sub => {
      map.set(sub.id, {
        id: sub.id,
        title: sub.testTitle || 'Sınav / Ödev',
        subject: sub.subject || 'Matematik',
        topic: sub.topic || '',
        wrongCount: sub.wrongQuestions.length,
        blankCount: sub.blankQuestions.length,
        date: sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : ''
      });
    });

    homeworks.filter(hw => hw.studentId === selectedStudent.id || (hw.targetIds && hw.targetIds.includes(selectedStudent.id)))
      .forEach(hw => {
        if (!map.has(hw.id)) {
          map.set(hw.id, {
            id: hw.id,
            title: hw.title || 'Ödev',
            subject: hw.subject || 'Matematik',
            topic: hw.topic || '',
            wrongCount: 0,
            blankCount: 0,
            date: hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('tr-TR') : ''
          });
        }
      });

    return Array.from(map.values());
  }, [testGroupedSubmissions, homeworks, selectedStudent]);

  const handleOpenAddModal = (defaultSub = null) => {
    let initialHwId = defaultSub?.id || '';
    let initialTitle = defaultSub?.testTitle || defaultSub?.title || '';
    let initialSubject = defaultSub?.subject || 'Matematik';
    let initialTopic = defaultSub?.topic || '';

    if (!defaultSub && availableHomeworkOptions.length > 0) {
      const topOpt = availableHomeworkOptions[0];
      initialHwId = topOpt.id;
      initialTitle = topOpt.title;
      initialSubject = topOpt.subject || 'Matematik';
      initialTopic = topOpt.topic || '';
    }

    setNewErrorForm({
      homeworkId: initialHwId,
      testTitle: initialTitle,
      subject: initialSubject,
      topic: initialTopic,
      questionNo: '',
      imageUrl: '',
      reason: '⚡ İşlem Hatası',
      note: '',
      solutionNote: ''
    });
    setShowAddModal(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert("Lütfen 8MB'dan küçük bir görsel seçin.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewErrorForm(prev => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNewError = async (e) => {
    e.preventDefault();
    if (!newErrorForm.imageUrl) {
      alert('Lütfen sorunun fotoğrafını yükleyin.');
      return;
    }
    if (!selectedStudent) return;

    await addStudentError(selectedStudent.id, {
      homeworkId: newErrorForm.homeworkId,
      testTitle: newErrorForm.testTitle || 'Ödev / Deneme Sorusu',
      subject: newErrorForm.subject || 'Matematik',
      topic: newErrorForm.topic.trim(),
      questionNo: newErrorForm.questionNo.trim(),
      imageUrl: newErrorForm.imageUrl,
      reason: newErrorForm.reason,
      note: newErrorForm.note.trim(),
      solutionNote: newErrorForm.solutionNote.trim(),
      status: 'active'
    });

    setShowAddModal(false);
  };

  const handleToggleStatus = async (errId, currentStatus, e) => {
    if (e) e.stopPropagation();
    if (!selectedStudent) return;
    const nextStatus = currentStatus === 'resolved' ? 'active' : 'resolved';
    await updateStudentError(selectedStudent.id, errId, { status: nextStatus });

    if (viewingErrorModal && viewingErrorModal.id === errId) {
      setViewingErrorModal(prev => prev ? { ...prev, status: nextStatus } : null);
    }
  };

  const handleDeleteErrorRecord = async (errId, e) => {
    if (e) e.stopPropagation();
    if (!selectedStudent) return;
    if (window.confirm('Bu soru görselini hata defterinizden silmek istediğinize emin misiniz?')) {
      await deleteStudentError(selectedStudent.id, errId);
      if (viewingErrorModal && viewingErrorModal.id === errId) {
        setViewingErrorModal(null);
      }
    }
  };

  const filteredStudentErrors = useMemo(() => {
    return studentErrors.filter(err => {
      const matchSubject = selectedSubject === 'Tümü' || err.subject === selectedSubject;
      const matchStatus = notebookStatusFilter === 'all' || err.status === notebookStatusFilter;
      const matchQuery = !notebookSearchQuery.trim() ||
        (err.testTitle || '').toLowerCase().includes(notebookSearchQuery.toLowerCase()) ||
        (err.topic || '').toLowerCase().includes(notebookSearchQuery.toLowerCase()) ||
        (err.note || '').toLowerCase().includes(notebookSearchQuery.toLowerCase()) ||
        (err.reason || '').toLowerCase().includes(notebookSearchQuery.toLowerCase());

      return matchSubject && matchStatus && matchQuery;
    });
  }, [studentErrors, selectedSubject, notebookStatusFilter, notebookSearchQuery]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #090e1a 0%, #0f172a 50%, #090e1a 100%)',
      padding: '1.25rem 1rem',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      color: '#f8fafc',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .wa-card { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .wa-card:hover { transform: translateY(-2px); border-color: rgba(99, 102, 241, 0.4) !important; box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.5) !important; }
        .wa-pill { transition: all 0.15s ease; }
        .wa-pill:hover { opacity: 0.9; transform: scale(1.02); }
        .wa-scroll-x::-webkit-scrollbar { height: 4px; }
        .wa-scroll-x::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ════════════════════════════════════════════
            1. ÜST BAŞLIK VE GERİ BUTONU
        ════════════════════════════════════════════ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button
              onClick={() => navigate('/student')}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1.5px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '0.55rem 0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 800,
                fontSize: '0.82rem',
                color: '#ffffff',
                transition: 'all 0.15s'
              }}
            >
              <ArrowLeft size={16} /> Öğrenci Paneli
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.02em' }}>
                <AlertCircle color="#f87171" size={24} /> Yanlışlarım & Hata Defteri
              </h1>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>
                Sınavlarda yanlış veya boş bıraktığınız soruları tek tıkla inceleyin, hatalarınızı pekiştirin.
              </p>
            </div>
          </div>

          {/* TAB DEĞİŞTİRİCİ (2 Sade Sekme) */}
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '4px',
            borderRadius: '14px',
            border: '1.5px solid rgba(255, 255, 255, 0.1)',
            gap: 4
          }}>
            <button
              onClick={() => setActiveMainTab('wrong_controls')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.1rem',
                borderRadius: '10px',
                border: 'none',
                background: activeMainTab === 'wrong_controls' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                color: activeMainTab === 'wrong_controls' ? '#ffffff' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeMainTab === 'wrong_controls' ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <Layers size={16} /> Sınav Yanlışları
              <span style={{
                background: activeMainTab === 'wrong_controls' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: 99,
                fontWeight: 900
              }}>
                {testGroupedSubmissions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('error_notebook')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.1rem',
                borderRadius: '10px',
                border: 'none',
                background: activeMainTab === 'error_notebook' ? 'linear-gradient(135deg, #e11d48, #be123c)' : 'transparent',
                color: activeMainTab === 'error_notebook' ? '#ffffff' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeMainTab === 'error_notebook' ? '0 4px 12px rgba(225, 29, 72, 0.35)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <BookMarked size={16} /> Görsel Hata Defterim
              <span style={{
                background: activeMainTab === 'error_notebook' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: 99,
                fontWeight: 900
              }}>
                {studentErrors.length}
              </span>
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            2. ÖZET KPI İSTATİSTİK KARTLARI (3 Temiz Kart)
        ════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem'
        }}>
          {/* Kart 1: Yanlış Soru */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1.5px solid rgba(244, 63, 94, 0.25)',
            borderRadius: '16px',
            padding: '0.9rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              background: 'rgba(244, 63, 94, 0.2)',
              color: '#fb7185',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.1rem'
            }}>
              ❌
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#fda4af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Toplam Yanlış Soru</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>{globalWrongCount} Soru</div>
            </div>
          </div>

          {/* Kart 2: Boş Bırakılan */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1.5px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '16px',
            padding: '0.9rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              background: 'rgba(148, 163, 184, 0.15)',
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.1rem'
            }}>
              ⚪
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Boş Bırakılan Soru</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>{globalBlankCount} Soru</div>
            </div>
          </div>

          {/* Kart 3: Kontrol Durumu */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1.5px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '16px',
            padding: '0.9rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.1rem'
            }}>
              ✅
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.72rem', color: '#6ee7b7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kontrol Edilen Sınavlar</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>
                {globalReviewedCount} / {testGroupedSubmissions.length}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            3. DERS FİLTRELEME BUTONLARI (KAYDIRILABİLİR PİLLER)
        ════════════════════════════════════════════ */}
        <div className="wa-scroll-x" style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          alignItems: 'center'
        }}>
          {Object.entries(SUBJECT_CONFIG).map(([key, cfg]) => {
            const isSelected = selectedSubject === key;
            const Icon = cfg.icon;
            const count = key === 'Tümü'
              ? testGroupedSubmissions.length
              : testGroupedSubmissions.filter(s => s.subject === key).length;

            return (
              <button
                key={key}
                onClick={() => setSelectedSubject(key)}
                className="wa-pill"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '12px',
                  border: isSelected ? `1.5px solid ${cfg.color}` : '1.5px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? cfg.bg : 'rgba(15, 23, 42, 0.6)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? `0 4px 12px ${cfg.color}33` : 'none'
                }}
              >
                <Icon size={15} color={isSelected ? cfg.color : '#94a3b8'} />
                <span>{cfg.label}</span>
                <span style={{
                  background: isSelected ? cfg.color : 'rgba(255,255,255,0.08)',
                  color: isSelected ? '#0f172a' : '#cbd5e1',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '0.1rem 0.4rem',
                  borderRadius: 99
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════
            SEKME 1: SINAV YANLIŞLARI
        ════════════════════════════════════════════ */}
        {activeMainTab === 'wrong_controls' && (
          <div>
            {/* Arama & Kontrol Filtresi Araç Çubuğu */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1.5px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '0.65rem 0.9rem',
              marginBottom: '1rem'
            }}>
              {/* Arama Kutusu */}
              <div style={{ flex: '1 1 240px', position: 'relative' }}>
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Sınav veya konu adı ara..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                    borderRadius: '10px',
                    border: '1.5px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Filtre ve Görünüm Seçici */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  value={reviewFilter}
                  onChange={e => setReviewFilter(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '10px',
                    border: '1.5px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all" style={{ background: '#0f172a' }}>Tüm Durumlar</option>
                  <option value="unreviewed" style={{ background: '#0f172a' }}>⚠️ Kontrol Edilmeyenler</option>
                  <option value="reviewed" style={{ background: '#0f172a' }}>✅ Kontrol Edilenler</option>
                  <option value="wrong_only" style={{ background: '#0f172a' }}>❌ Sadece Yanlışı Olanlar</option>
                </select>

                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    onClick={() => setViewMode('cards')}
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: viewMode === 'cards' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                      color: viewMode === 'cards' ? '#818cf8' : '#94a3b8',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <List size={14} /> Kart
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: viewMode === 'table' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                      color: viewMode === 'table' ? '#818cf8' : '#94a3b8',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Table size={14} /> Tablo
                  </button>
                </div>
              </div>
            </div>

            {/* KART GÖRÜNÜMÜ */}
            {viewMode === 'cards' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '0.85rem'
              }}>
                {filteredTestSubmissions.map(sub => {
                  const cfg = SUBJECT_CONFIG[sub.subject] || SUBJECT_CONFIG['Matematik'];
                  const Icon = cfg.icon;

                  return (
                    <div
                      key={sub.id}
                      className="wa-card"
                      style={{
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
                        border: sub.isReviewed ? '1.5px solid rgba(52, 211, 153, 0.3)' : '1.5px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      {/* Üst Kısım: Ders Rozeti, Başlık, Tarih */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '8px'
                          }}>
                            <Icon size={13} /> {sub.subject}
                          </span>

                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.3, marginBottom: '0.2rem' }}>
                          {sub.testTitle || 'Test Sınavı'}
                        </div>
                        {sub.topic && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                            {sub.topic}
                          </div>
                        )}
                      </div>

                      {/* Orta Kısım: Yanlış & Boş Soru Çipleri */}
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: '12px',
                        padding: '0.65rem 0.8rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem'
                      }}>
                        {/* Yanlış Sorular */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#fb7185', minWidth: 70 }}>
                            ❌ {sub.wrongQuestions.length} Yanlış:
                          </span>
                          {sub.wrongQuestions.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {sub.wrongQuestions.map(q => (
                                <button
                                  key={q.qNum}
                                  onClick={(e) => handleOpenReview(sub.id, e)}
                                  title="Soruyu İncele"
                                  style={{
                                    background: 'rgba(244, 63, 94, 0.2)',
                                    color: '#f87171',
                                    border: '1px solid rgba(244, 63, 94, 0.35)',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '6px',
                                    fontWeight: 900,
                                    fontSize: '0.72rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  S.{q.qNum}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: 800 }}>✓ Yanlış Yok</span>
                          )}
                        </div>

                        {/* Boş Sorular */}
                        {sub.blankQuestions.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#cbd5e1', minWidth: 70 }}>
                              ⚪ {sub.blankQuestions.length} Boş:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {sub.blankQuestions.map(q => (
                                <button
                                  key={q.qNum}
                                  onClick={(e) => handleOpenReview(sub.id, e)}
                                  title="Soruyu İncele"
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    color: '#e2e8f0',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '6px',
                                    fontWeight: 900,
                                    fontSize: '0.72rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  S.{q.qNum}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Alt Kısım: Aksiyonlar & Kontrol Butonu */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '0.35rem' }}>
                        <button
                          onClick={(e) => toggleSubmissionReviewed(sub.id, e)}
                          style={{
                            background: sub.isReviewed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: sub.isReviewed ? '#34d399' : '#fbbf24',
                            border: sub.isReviewed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '0.45rem 0.75rem',
                            borderRadius: '10px',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          {sub.isReviewed ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                          <span>{sub.isReviewed ? 'Kontrol Edildi' : 'Kontrol Et'}</span>
                        </button>

                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenAddModal(sub); }}
                            title="Soru Görseli Ekle"
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: '#cbd5e1',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              padding: '0.45rem 0.65rem',
                              borderRadius: '10px',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Camera size={14} /> Foto
                          </button>

                          <button
                            onClick={(e) => handleOpenReview(sub.id, e)}
                            style={{
                              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.45rem 0.85rem',
                              borderRadius: '10px',
                              fontWeight: 900,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                            }}
                          >
                            <Eye size={14} /> İncele
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredTestSubmissions.length === 0 && (
                  <div style={{
                    gridColumn: '1 / -1',
                    padding: '3rem 1rem',
                    textAlign: 'center',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '16px',
                    border: '1.5px dashed rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8'
                  }}>
                    <CheckCircle2 size={36} color="#34d399" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>Harika! Eşleşen Yanlış Soru Bulunamadı</div>
                    <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Seçilen ders veya filtrede incelenecek sınav kaydı yok.</div>
                  </div>
                )}
              </div>
            )}

            {/* TABLO GÖRÜNÜMÜ */}
            {viewMode === 'table' && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: '16px',
                border: '1.5px solid rgba(255, 255, 255, 0.08)',
                overflowX: 'auto',
                boxShadow: '0 8px 30px rgba(0,0,0,0.35)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1.5px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.72rem' }}>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>SINAV / ÖDEV</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>DERS</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>TARİH</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>❌ YANLIŞLAR</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>⚪ BOŞLAR</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900 }}>DURUM</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 900, textAlign: 'right' }}>İŞLEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTestSubmissions.map((sub, idx) => {
                      const cfg = SUBJECT_CONFIG[sub.subject] || SUBJECT_CONFIG['Matematik'];

                      return (
                        <tr
                          key={sub.id || idx}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            background: sub.isReviewed ? 'rgba(16, 185, 129, 0.04)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#ffffff' }}>
                            {sub.testTitle || 'Test Sınavı'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: '0.7rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                              {sub.subject}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {sub.wrongQuestions.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {sub.wrongQuestions.map(q => (
                                  <button
                                    key={q.qNum}
                                    onClick={(e) => handleOpenReview(sub.id, e)}
                                    style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#f87171', border: '1px solid rgba(244, 63, 94, 0.35)', padding: '0.1rem 0.4rem', borderRadius: 4, fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer' }}
                                  >
                                    S.{q.qNum}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#34d399', fontWeight: 800, fontSize: '0.72rem' }}>✓ Yok</span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {sub.blankQuestions.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {sub.blankQuestions.map(q => (
                                  <button
                                    key={q.qNum}
                                    onClick={(e) => handleOpenReview(sub.id, e)}
                                    style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#e2e8f0', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '0.1rem 0.4rem', borderRadius: 4, fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer' }}
                                  >
                                    S.{q.qNum}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#64748b' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={(e) => toggleSubmissionReviewed(sub.id, e)}
                              style={{
                                background: sub.isReviewed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: sub.isReviewed ? '#34d399' : '#fbbf24',
                                border: sub.isReviewed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '0.25rem 0.55rem',
                                borderRadius: '8px',
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              {sub.isReviewed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              <span>{sub.isReviewed ? 'Kontrol Edildi' : 'Kontrol Et'}</span>
                            </button>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={(e) => handleOpenReview(sub.id, e)}
                              style={{
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '8px',
                                fontWeight: 900,
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              Sınavı Aç
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════
            SEKME 2: GÖRSEL HATA DEFTERİM
        ════════════════════════════════════════════ */}
        {activeMainTab === 'error_notebook' && (
          <div>
            {/* Üst Aksiyon & Filtre Çubuğu */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1.5px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '0.65rem 0.9rem',
              marginBottom: '1rem'
            }}>
              {/* Yeni Görsel Ekle Butonu */}
              <button
                onClick={() => handleOpenAddModal()}
                style={{
                  background: 'linear-gradient(135deg, #e11d48, #be123c)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.55rem 1rem',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)'
                }}
              >
                <Plus size={16} /> + Yeni Yanlış Soru Görseli Ekle
              </button>

              {/* Durum Filtresi */}
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[
                  { key: 'all', label: 'Tümü' },
                  { key: 'active', label: '⏳ Çözülecekler' },
                  { key: 'resolved', label: '✅ Öğrenilenler' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setNotebookStatusFilter(tab.key)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      border: notebookStatusFilter === tab.key ? '1px solid rgba(225, 29, 72, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: notebookStatusFilter === tab.key ? 'rgba(225, 29, 72, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      color: notebookStatusFilter === tab.key ? '#fb7185' : '#94a3b8',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hata Defteri Kart Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '0.85rem'
            }}>
              {filteredStudentErrors.map(err => {
                const cfg = SUBJECT_CONFIG[err.subject] || SUBJECT_CONFIG['Matematik'];
                const isResolved = err.status === 'resolved';

                return (
                  <div
                    key={err.id}
                    className="wa-card"
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: isResolved ? '1.5px solid rgba(16, 185, 129, 0.3)' : '1.5px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {/* Görsel Kutusu */}
                    <div
                      onClick={() => setViewingErrorModal(err)}
                      style={{
                        height: 160,
                        background: '#090e1a',
                        position: 'relative',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src={err.imageUrl}
                        alt="Soru"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <span style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.45rem',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3
                      }}>
                        <ZoomIn size={12} /> Büyüt
                      </span>
                    </div>

                    {/* Detaylar */}
                    <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                          {err.subject}
                        </span>
                        {err.reason && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fb7185' }}>
                            {err.reason}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
                        {err.testTitle || 'Ödev / Deneme Sorusu'}
                      </div>

                      {err.note && (
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '0.35rem 0.55rem', borderRadius: 6 }}>
                          💬 {err.note}
                        </div>
                      )}

                      {/* Aksiyon Butonları */}
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.4rem' }}>
                        <button
                          onClick={(e) => handleToggleStatus(err.id, err.status, e)}
                          style={{
                            flex: 1,
                            background: isResolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(225, 29, 72, 0.15)',
                            color: isResolved ? '#34d399' : '#fb7185',
                            border: isResolved ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(225, 29, 72, 0.3)',
                            padding: '0.45rem',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          {isResolved ? <><RotateCcw size={13} /> Tekrar Et</> : <><Check size={13} /> Öğrenildi</>}
                        </button>

                        <button
                          onClick={(e) => handleDeleteErrorRecord(err.id, e)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            padding: '0.45rem',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredStudentErrors.length === 0 && (
                <div style={{
                  gridColumn: '1 / -1',
                  padding: '3rem 1rem',
                  textAlign: 'center',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: '16px',
                  border: '1.5px dashed rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8'
                }}>
                  <Camera size={36} color="#fb7185" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>Görsel Hata Defteriniz Boş</div>
                  <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Çözemediğiniz veya tekrar etmek istediğiniz soruların fotoğrafını ekleyebilirsiniz.</div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════
          MODAL 1: + YANLIŞ SORU GÖRSELİ EKLE
      ════════════════════════════════════════════ */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', borderRadius: '20px', padding: '1.4rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', border: '1.5px solid rgba(255,255,255,0.15)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', color: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={20} color="#fb7185" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>Yanlış Soru Görseli Ekle</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveNewError} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* 1. Ait Olduğu Ödev / Sınav */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Ait Olduğu Sınav / Ödev</label>
                <select
                  value={newErrorForm.homeworkId}
                  onChange={e => {
                    const val = e.target.value;
                    const matched = availableHomeworkOptions.find(o => String(o.id) === String(val));
                    setNewErrorForm(p => ({
                      ...p,
                      homeworkId: val,
                      testTitle: matched?.title || p.testTitle,
                      subject: matched?.subject || p.subject
                    }));
                  }}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, outline: 'none' }}
                >
                  <option value="" style={{ background: '#0f172a' }}>-- Ödev veya Sınav Seçin --</option>
                  {availableHomeworkOptions.map(hw => (
                    <option key={hw.id} value={hw.id} style={{ background: '#0f172a' }}>
                      {hw.title} ({hw.subject})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Ders */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Ders</label>
                <select
                  value={newErrorForm.subject}
                  onChange={e => setNewErrorForm(p => ({ ...p, subject: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, outline: 'none' }}
                >
                  {Object.keys(SUBJECT_CONFIG).filter(k => k !== 'Tümü').map(k => (
                    <option key={k} value={k} style={{ background: '#0f172a' }}>{k}</option>
                  ))}
                </select>
              </div>

              {/* 3. Görsel Yükleme */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Soru Fotoğrafı</label>
                {newErrorForm.imageUrl ? (
                  <div style={{ position: 'relative', height: 140, borderRadius: '12px', overflow: 'hidden', border: '2px solid #e11d48', background: '#090e1a' }}>
                    <img src={newErrorForm.imageUrl} alt="Soru Önizleme" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <button
                      type="button"
                      onClick={() => setNewErrorForm(p => ({ ...p, imageUrl: '' }))}
                      style={{ position: 'absolute', top: 6, right: 6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '12px', cursor: 'pointer' }}>
                    <Upload size={24} color="#fb7185" style={{ marginBottom: 4 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>Fotoğraf Seç veya Çek</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* 4. Hata Nedeni */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Hata Nedeni</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {REASON_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewErrorForm(p => ({ ...p, reason: preset }))}
                      style={{
                        border: newErrorForm.reason === preset ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        background: newErrorForm.reason === preset ? 'linear-gradient(135deg, #e11d48, #be123c)' : 'rgba(255,255,255,0.05)',
                        color: newErrorForm.reason === preset ? 'white' : '#94a3b8',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.5rem',
                        borderRadius: 6,
                        cursor: 'pointer'
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Not */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Notunuz / Çözüm Açıklaması</label>
                <textarea
                  rows={2}
                  placeholder="Doğru çözüm adımları veya dikkat edilecek ipuçları..."
                  value={newErrorForm.note}
                  onChange={e => setNewErrorForm(p => ({ ...p, note: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#ffffff', fontSize: '0.8rem', fontWeight: 600, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.35rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', borderRadius: '10px', padding: '0.55rem 1rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>İptal</button>
                <button type="submit" style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.55rem 1.25rem', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer' }}>Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          MODAL 2: GÖRSEL DETAY & BÜYÜTME
      ════════════════════════════════════════════ */}
      {viewingErrorModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(7,10,18,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', borderRadius: '20px', padding: '1.4rem', width: '100%', maxWidth: 750, maxHeight: '92vh', overflowY: 'auto', border: '1.5px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', gap: '0.85rem', color: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.65rem' }}>
              <div>
                <span style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 6, textTransform: 'uppercase' }}>
                  {viewingErrorModal.subject}
                </span>
                <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.15rem', fontWeight: 900, color: '#ffffff' }}>
                  {viewingErrorModal.testTitle}
                </h3>
              </div>
              <button onClick={() => setViewingErrorModal(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}><X size={16} /></button>
            </div>

            {/* Büyük Görsel */}
            <div style={{ background: '#090e1a', borderRadius: '12px', overflow: 'hidden', minHeight: 300, maxHeight: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
              <img src={viewingErrorModal.imageUrl} alt="Soru" style={{ maxWidth: '100%', maxHeight: 440, objectFit: 'contain' }} />
            </div>

            {/* Detaylar */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {viewingErrorModal.reason && (
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fb7185' }}>
                  ⚡ Hata Nedeni: {viewingErrorModal.reason}
                </div>
              )}
              {viewingErrorModal.note && (
                <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                  💬 Not: {viewingErrorModal.note}
                </div>
              )}
            </div>

            {/* Aksiyonlar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={e => handleDeleteErrorRecord(viewingErrorModal.id, e)}
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '0.5rem 0.85rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Trash2 size={14} /> Görseli Sil
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={e => handleToggleStatus(viewingErrorModal.id, viewingErrorModal.status, e)}
                  style={{
                    background: viewingErrorModal.status === 'resolved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(225, 29, 72, 0.2)',
                    color: viewingErrorModal.status === 'resolved' ? '#34d399' : '#fb7185',
                    border: viewingErrorModal.status === 'resolved' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(225, 29, 72, 0.4)',
                    borderRadius: '10px',
                    padding: '0.5rem 1rem',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {viewingErrorModal.status === 'resolved' ? <><RotateCcw size={14} /> Tekrar Et</> : <><CheckCircle2 size={14} /> Öğrenildi Olarak İşaretle</>}
                </button>
                <button onClick={() => setViewingErrorModal(null)} style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>Kapat</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
