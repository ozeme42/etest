import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle, Search, Filter, Calendar, CheckCircle2, XCircle,
  ArrowLeft, GraduationCap, Ruler, TestTube2, BookCopy, Globe,
  MessageSquare, Sparkles, BookOpen, Layers, Trophy, HelpCircle, Eye,
  Table, List, ChevronRight, FolderOpen, Check, Clock, Plus, Upload,
  Image as ImageIcon, Trash2, Edit3, ZoomIn, X, Camera, BookMarked, FileText
} from 'lucide-react';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useCoaching } from '../context/CoachingContext';
import { useHomework } from '../context/HomeworkContext';

const subjectThemes = {
  'all_subjects': {
    bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    icon: GraduationCap,
    color: '#4f46e5',
    shadow: '0 12px 28px -5px rgba(79,70,229,0.45)'
  },
  'Matematik': {
    bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    icon: Ruler,
    color: '#2563eb',
    shadow: '0 10px 25px -5px rgba(37,99,235,0.4)'
  },
  'Fen Bilimleri': {
    bg: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    icon: TestTube2,
    color: '#0d9488',
    shadow: '0 10px 25px -5px rgba(13,148,136,0.4)'
  },
  'Türkçe': {
    bg: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    icon: BookCopy,
    color: '#ea580c',
    shadow: '0 10px 25px -5px rgba(234,88,12,0.4)'
  },
  'Sosyal Bilgiler': {
    bg: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
    icon: Globe,
    color: '#9333ea',
    shadow: '0 10px 25px -5px rgba(147,51,234,0.4)'
  },
  'İngilizce': {
    bg: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    icon: MessageSquare,
    color: '#e11d48',
    shadow: '0 10px 25px -5px rgba(225,29,72,0.4)'
  },
  'Genel Deneme Sınavları': {
    bg: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
    icon: Trophy,
    color: '#4f46e5',
    shadow: '0 10px 25px -5px rgba(79,70,229,0.4)'
  },
  'Diğer': {
    bg: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
    icon: BookOpen,
    color: '#475569',
    shadow: '0 10px 25px -5px rgba(71,85,105,0.4)'
  }
};

const REASON_PRESETS = [
  '⚡ İşlem Hatası',
  '⚠️ Dikkat Kaybı / Yanlış Okuma',
  '📖 Formül / Bilgi Unutuldu',
  '🧠 Konu Eksiği Var',
  '🧩 Soru Tarzını Anlamadım',
  '⏱️ Zaman Yetmedi'
];

export default function StudentWrongAnswersPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [selectedStudent, setSelectedStudent] = useState(studentMembers[0] || null);

  // Ana Sekme: 'error_notebook' (Hata Defterim) | 'wrong_controls' (Sınav Kontrol Takibi)
  const [activeMainTab, setActiveMainTab] = useState('error_notebook');

  // selectedSubject: null (Level 1: Subject Cards Portal) | 'Matematik' / 'Fen' / 'all' (Level 2: Inside Subject Folder)
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Restore selectedSubject if returning from review page
  useEffect(() => {
    if (location.state?.subject !== undefined) {
      setSelectedSubject(location.state.subject);
    }
  }, [location.state]);

  const handleOpenReview = (subId, e) => {
    if (e) e.stopPropagation();
    navigate(`/review/${subId}`, {
      state: { from: '/wrong-answers', subject: selectedSubject }
    });
  };

  // Persistent Whole-Test Review State in localStorage ('eTestReviewedSubmissions')
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

  // View Mode inside subject folder: 'table' (Excel single row table) | 'cards' (Test cards)
  const [viewMode, setViewMode] = useState('table');

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [ansTypeFilter, setAnsTypeFilter] = useState('all'); // 'all', 'wrong', 'blank'
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all', 'unreviewed', 'reviewed'

  // ════ HATA DEFTERİ STATE VE İŞLEMLERİ ════
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingErrorModal, setViewingErrorModal] = useState(null);

  const [notebookSubjectFilter, setNotebookSubjectFilter] = useState('all');
  const [notebookHomeworkFilter, setNotebookHomeworkFilter] = useState('all');
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

  // Current student's coaching profile error entries
  const currentProfile = useMemo(() => {
    if (!selectedStudent) return null;
    return getCoachingProfileForStudent(selectedStudent.id);
  }, [getCoachingProfileForStudent, selectedStudent]);

  const studentErrors = useMemo(() => {
    return currentProfile?.errors || [];
  }, [currentProfile]);

  // Group submissions with wrong & blank question numbers
  const testGroupedSubmissions = useMemo(() => {
    if (!selectedStudent) return [];

    const studentSubs = submissions.filter(s => s.studentId === selectedStudent.id);

    return studentSubs.map(sub => {
      const wrongQuestions = [];
      const blankQuestions = [];
      let correctCount = 0;

      (sub.answers || []).forEach((ans, idx) => {
        const qNum = ans.subIndex !== undefined ? ans.subIndex + 1 : idx + 1;
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

      // Infer subject
      let subject = 'Genel';
      const titleLower = (sub.testTitle || '').toLowerCase();
      if (titleLower.includes('mat')) subject = 'Matematik';
      else if (titleLower.includes('fen')) subject = 'Fen Bilimleri';
      else if (titleLower.includes('türk') || titleLower.includes('turk')) subject = 'Türkçe';
      else if (titleLower.includes('sosyal')) subject = 'Sosyal Bilgiler';
      else if (titleLower.includes('ing')) subject = 'İngilizce';
      else if (titleLower.includes('deneme')) subject = 'Genel Deneme Sınavları';

      const isReviewed = reviewedSubSet.has(sub.id);

      return {
        ...sub,
        subject,
        wrongQuestions,
        blankQuestions,
        correctCount,
        totalQuestions: sub.answers?.length || 0,
        isReviewed,
        hasErrors: wrongQuestions.length > 0 || blankQuestions.length > 0
      };
    }).filter(s => s.hasErrors)
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [submissions, selectedStudent, reviewedSubSet]);

  // Combine testGroupedSubmissions and all assigned homeworks for dropdown selection
  const availableHomeworkOptions = useMemo(() => {
    if (!selectedStudent) return [];

    const map = new Map();

    testGroupedSubmissions.forEach(sub => {
      map.set(sub.id, {
        id: sub.id,
        title: sub.testTitle || 'Sınav / Ödev',
        subject: sub.subject || 'Matematik',
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
            wrongCount: 0,
            blankCount: 0,
            date: hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('tr-TR') : ''
          });
        }
      });

    return Array.from(map.values());
  }, [testGroupedSubmissions, homeworks, selectedStudent]);

  // Handlers for Hata Defteri
  const handleSelectHomeworkForModal = (hwId) => {
    if (hwId === 'custom' || !hwId) {
      setNewErrorForm(prev => ({
        ...prev,
        homeworkId: 'custom',
        testTitle: prev.testTitle || '',
        subject: prev.subject || 'Matematik'
      }));
    } else {
      const selected = availableHomeworkOptions.find(o => o.id === hwId);
      if (selected) {
        setNewErrorForm(prev => ({
          ...prev,
          homeworkId: selected.id,
          testTitle: selected.title,
          subject: selected.subject || prev.subject
        }));
      }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert("Lütfen 8MB'dan küçük bir görsel dosyası seçin.");
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
      alert('Lütfen sorunun görselini yükleyin.');
      return;
    }
    if (!selectedStudent) return;

    await addStudentError(selectedStudent.id, {
      homeworkId: newErrorForm.homeworkId,
      testTitle: newErrorForm.testTitle || 'Genel / Ödev Dışı Soru',
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
    setNewErrorForm({
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

  // Filtered Student Errors
  const filteredStudentErrors = useMemo(() => {
    return studentErrors.filter(err => {
      const matchSubject = notebookSubjectFilter === 'all' || err.subject === notebookSubjectFilter;
      const matchHomework = notebookHomeworkFilter === 'all' || err.homeworkId === notebookHomeworkFilter || err.testTitle === notebookHomeworkFilter;
      const matchStatus = notebookStatusFilter === 'all' || err.status === notebookStatusFilter;
      const matchQuery = !notebookSearchQuery.trim() ||
        (err.testTitle || '').toLowerCase().includes(notebookSearchQuery.toLowerCase()) ||
        (err.topic || '').toLowerCase().includes(notebookSearchQuery.toLowerCase()) ||
        (err.note || '').toLowerCase().includes(notebookSearchQuery.toLowerCase()) ||
        (err.reason || '').toLowerCase().includes(notebookSearchQuery.toLowerCase());

      return matchSubject && matchHomework && matchStatus && matchQuery;
    });
  }, [studentErrors, notebookSubjectFilter, notebookHomeworkFilter, notebookStatusFilter, notebookSearchQuery]);

  // Subject Stats for Level 1
  const subjectCardStats = useMemo(() => {
    const statsMap = {};

    (curData?.subjects || []).forEach(s => {
      if (s.name) {
        statsMap[s.name] = { testCount: 0, wrongCount: 0, blankCount: 0, reviewedCount: 0 };
      }
    });

    testGroupedSubmissions.forEach(sub => {
      const subj = sub.subject || 'Diğer';
      if (!statsMap[subj]) {
        statsMap[subj] = { testCount: 0, wrongCount: 0, blankCount: 0, reviewedCount: 0 };
      }
      statsMap[subj].testCount += 1;
      statsMap[subj].wrongCount += sub.wrongQuestions.length;
      statsMap[subj].blankCount += sub.blankQuestions.length;
      if (sub.isReviewed) statsMap[subj].reviewedCount += 1;
    });

    return statsMap;
  }, [testGroupedSubmissions, curData]);

  // Global Counts
  const globalWrongCount = useMemo(() => testGroupedSubmissions.reduce((acc, sub) => acc + sub.wrongQuestions.length, 0), [testGroupedSubmissions]);
  const globalBlankCount = useMemo(() => testGroupedSubmissions.reduce((acc, sub) => acc + sub.blankQuestions.length, 0), [testGroupedSubmissions]);
  const globalReviewedCount = useMemo(() => testGroupedSubmissions.filter(sub => sub.isReviewed).length, [testGroupedSubmissions]);

  // Filtered Test Submissions
  const filteredTestSubmissions = useMemo(() => {
    if (!selectedSubject) return [];

    return testGroupedSubmissions.filter(sub => {
      const textMatch =
        (sub.testTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.subject || '').toLowerCase().includes(searchQuery.toLowerCase());

      const subjectMatch = selectedSubject === 'all' || sub.subject === selectedSubject;

      let sourceMatch = true;
      if (sourceFilter === 'homework') sourceMatch = !!sub.isHomework;
      else if (sourceFilter === 'quiz') sourceMatch = !sub.isHomework;

      let typeMatch = true;
      if (ansTypeFilter === 'wrong') typeMatch = sub.wrongQuestions.length > 0;
      else if (ansTypeFilter === 'blank') typeMatch = sub.blankQuestions.length > 0;

      let reviewMatch = true;
      if (reviewFilter === 'unreviewed') reviewMatch = !sub.isReviewed;
      else if (reviewFilter === 'reviewed') reviewMatch = sub.isReviewed;

      return textMatch && subjectMatch && sourceMatch && typeMatch && reviewMatch;
    });
  }, [testGroupedSubmissions, selectedSubject, searchQuery, sourceFilter, ansTypeFilter, reviewFilter]);

  const currentSubjectInfo = useMemo(() => {
    if (!selectedSubject || selectedSubject === 'all') return { title: 'Tüm Dersler', count: testGroupedSubmissions.length };
    const st = subjectCardStats[selectedSubject] || { testCount: 0, wrongCount: 0, blankCount: 0, reviewedCount: 0 };
    return { title: selectedSubject, ...st };
  }, [selectedSubject, subjectCardStats, testGroupedSubmissions]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '1.75rem', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => {
                if (selectedSubject !== null) {
                  setSelectedSubject(null);
                } else {
                  navigate('/student');
                }
              }}
              style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.75rem', padding: '0.6rem 0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#334155', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}
            >
              <ArrowLeft size={18} /> {selectedSubject !== null ? 'Ders Portalı / Kartlara Dön' : 'Öğrenci Paneli'}
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertCircle color="#ef4444" size={28} /> Yanlışlarım & Hata Defterim
              </h1>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Yanlış yaptığınız soruların görsellerini ödevlerinizle eşleştirerek kaydedin, sınav kontrollerinizi yapın.
              </p>
            </div>
          </div>

          {/* Student Selector Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.35rem 0.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
            {studentMembers.map(s => {
              const active = selectedStudent?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: active ? '#ef4444' : 'transparent',
                    color: active ? 'white' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <GraduationCap size={16} />
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* TOP LEVEL NAVIGATION TAB SWITCHER */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'white', padding: '0.4rem', borderRadius: '1.1rem', border: '1px solid #e2e8f0', marginBottom: '1.75rem', width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <button
            onClick={() => setActiveMainTab('error_notebook')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.85rem',
              border: 'none',
              background: activeMainTab === 'error_notebook' ? 'linear-gradient(135deg, #e11d48, #be123c)' : 'transparent',
              color: activeMainTab === 'error_notebook' ? 'white' : '#64748b',
              fontWeight: 900,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: activeMainTab === 'error_notebook' ? '0 4px 14px rgba(225,29,72,0.3)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <BookMarked size={18} /> 📕 Hata Defterim (Soru Görsel Deposu)
            <span style={{ background: activeMainTab === 'error_notebook' ? 'rgba(255,255,255,0.25)' : '#f1f5f9', color: activeMainTab === 'error_notebook' ? 'white' : '#475569', fontSize: '0.72rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 99 }}>
              {studentErrors.length} Görsel
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('wrong_controls')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.85rem',
              border: 'none',
              background: activeMainTab === 'wrong_controls' ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'transparent',
              color: activeMainTab === 'wrong_controls' ? 'white' : '#64748b',
              fontWeight: 900,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: activeMainTab === 'wrong_controls' ? '0 4px 14px rgba(79,70,229,0.3)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Layers size={18} /> 🔴 Sınav & Ödev Kontrol Takibi
            <span style={{ background: activeMainTab === 'wrong_controls' ? 'rgba(255,255,255,0.25)' : '#f1f5f9', color: activeMainTab === 'wrong_controls' ? 'white' : '#475569', fontSize: '0.72rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 99 }}>
              {testGroupedSubmissions.length} Sınav
            </span>
          </button>
        </div>

        {/* ════════════════════════════════════════════
           SEKME 1: HATA DEFTERİM (GÖRSEL SORU DEPOSU)
        ════════════════════════════════════════════ */}
        {activeMainTab === 'error_notebook' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ÖZET STAT KARTLARI & EYLEM BUTONU */}
            <div style={{ background: 'white', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Toplam Görsel</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{studentErrors.length} Soru</div>
                  </div>
                </div>

                <div style={{ width: 1, height: 32, background: '#e2e8f0' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>🔴 Çözülecek</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626' }}>
                      {studentErrors.filter(e => e.status !== 'resolved').length} Soru
                    </div>
                  </div>
                </div>

                <div style={{ width: 1, height: 32, background: '#e2e8f0' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>✅ Öğrenildi</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a' }}>
                      {studentErrors.filter(e => e.status === 'resolved').length} Soru
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #e11d48, #be123c)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.85rem',
                  padding: '0.7rem 1.25rem',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(225,29,72,0.3)',
                  transition: 'transform 0.15s'
                }}
              >
                <Plus size={18} /> + Yanlış Soru Görseli Ekle
              </button>
            </div>

            {/* FİLTRE VE ARAMA ÇUBUĞU */}
            <div style={{ background: 'white', borderRadius: '1.25rem', padding: '1.1rem 1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                
                {/* Search Bar */}
                <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Sınav adı, konu veya notlarda ara..."
                    value={notebookSearchQuery}
                    onChange={e => setNotebookSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem 0.55rem 2.3rem',
                      borderRadius: '0.75rem',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Ödev / Sınav Seçimi Filtresi */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>Ödev/Sınav:</span>
                  <select
                    value={notebookHomeworkFilter}
                    onChange={e => setNotebookHomeworkFilter(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.75rem',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      outline: 'none',
                      background: '#f8fafc'
                    }}
                  >
                    <option value="all">🎯 Tüm Ödev & Sınavlar</option>
                    {availableHomeworkOptions.map(hw => (
                      <option key={hw.id} value={hw.id}>{hw.title} ({hw.subject})</option>
                    ))}
                  </select>
                </div>

                {/* Durum Filtresi */}
                <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: '0.65rem', gap: 2 }}>
                  {[
                    { id: 'all', label: 'Tümü' },
                    { id: 'active', label: '🔴 Çözülecek' },
                    { id: 'resolved', label: '✅ Öğrenildi' }
                  ].map(st => (
                    <button
                      key={st.id}
                      onClick={() => setNotebookStatusFilter(st.id)}
                      style={{
                        border: 'none',
                        background: notebookStatusFilter === st.id ? '#e11d48' : 'transparent',
                        color: notebookStatusFilter === st.id ? 'white' : '#64748b',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.35rem 0.7rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer'
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ders Pills */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingTop: '0.4rem', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center', marginRight: 4 }}>DERS:</span>
                {['all', 'Matematik', 'Fen Bilimleri', 'Türkçe', 'Sosyal Bilgiler', 'İngilizce', 'Diğer'].map(subj => {
                  const active = notebookSubjectFilter === subj;
                  return (
                    <button
                      key={subj}
                      onClick={() => setNotebookSubjectFilter(subj)}
                      style={{
                        border: active ? 'none' : '1px solid #cbd5e1',
                        background: active ? '#4f46e5' : 'white',
                        color: active ? 'white' : '#475569',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.65rem',
                        borderRadius: 99,
                        cursor: 'pointer'
                      }}
                    >
                      {subj === 'all' ? 'Tüm Dersler' : subj}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GÖRSEL SORU KARTLARI GRID */}
            {filteredStudentErrors.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '1.25rem', padding: '3rem 2rem', textAlign: 'center', border: '2px dashed #cbd5e1' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <ImageIcon size={32} />
                </div>
                <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                  {studentErrors.length === 0 ? 'Hata Defteriniz Henüz Boş' : 'Aramanızla Eşleşen Soru Bulunamadı'}
                </h3>
                <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600, maxWidth: 460, marginInline: 'auto' }}>
                  {studentErrors.length === 0
                    ? 'Yanlış yaptığınız veya çözemediğiniz soruların fotoğraflarını çekip ödevlerinizle eşleştirerek hemen ekleyebilirsiniz.'
                    : 'Filtreleri sıfırlayarak tüm hata defteri görsellerinizi inceleyebilirsiniz.'}
                </p>
                {studentErrors.length === 0 ? (
                  <button
                    onClick={() => setShowAddModal(true)}
                    style={{ background: '#e11d48', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.65rem 1.25rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Plus size={16} /> İlk Soru Görselini Ekle
                  </button>
                ) : (
                  <button
                    onClick={() => { setNotebookSubjectFilter('all'); setNotebookHomeworkFilter('all'); setNotebookStatusFilter('all'); setNotebookSearchQuery(''); }}
                    style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.65rem 1.25rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {filteredStudentErrors.map(err => {
                  const theme = subjectThemes[err.subject] || subjectThemes['Diğer'];
                  const isResolved = err.status === 'resolved';

                  return (
                    <div
                      key={err.id}
                      style={{
                        background: 'white',
                        borderRadius: '1.25rem',
                        border: isResolved ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        position: 'relative'
                      }}
                    >
                      {/* Görsel Thumbnail Alanı */}
                      <div
                        onClick={() => setViewingErrorModal(err)}
                        style={{
                          height: 180,
                          background: '#0f172a',
                          position: 'relative',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'center'
                        }}
                      >
                        <img
                          src={err.imageUrl}
                          alt="Hata Görseli"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isResolved ? 0.8 : 1 }}
                        />

                        {/* Overlay Zoom Hint */}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.3)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, gap: 6 }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                        >
                          <ZoomIn size={22} /> Büyüt & İncele
                        </div>

                        {/* Durum Rozeti */}
                        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
                          {isResolved ? (
                            <span style={{ background: '#10b981', color: 'white', fontSize: '0.68rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                              <CheckCircle2 size={12} /> Öğrenildi
                            </span>
                          ) : (
                            <span style={{ background: '#e11d48', color: 'white', fontSize: '0.68rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                              <AlertCircle size={12} /> Çözülecek
                            </span>
                          )}
                        </div>

                        {/* Sil Butonu */}
                        <button
                          onClick={e => handleDeleteErrorRecord(err.id, e)}
                          title="Sil"
                          style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 3 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Kart İçerik */}
                      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                        
                        {/* Ders & Ödev Rozeti */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ background: theme.color + '15', color: theme.color, fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 6, textTransform: 'uppercase' }}>
                            {err.subject}
                          </span>
                          {err.testTitle && (
                            <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 6, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={err.testTitle}>
                              📌 {err.testTitle}
                            </span>
                          )}
                        </div>

                        {/* Başlık / Konu */}
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.3 }}>
                            {err.topic || 'Konu Belirtilmedi'} {err.questionNo ? `(${err.questionNo})` : ''}
                          </div>
                          {err.reason && (
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', marginTop: 2 }}>
                              {err.reason}
                            </div>
                          )}
                        </div>

                        {/* Öğrenci Notu */}
                        {err.note && (
                          <div style={{ fontSize: '0.78rem', color: '#475569', background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: '0.5rem', border: '1px solid #f1f5f9', lineHeight: 1.3 }}>
                            💬 {err.note}
                          </div>
                        )}

                        {/* Bottom Actions */}
                        <div style={{ marginTop: 'auto', paddingTop: '0.6rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setViewingErrorModal(err)}
                            style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.6rem', padding: '0.45rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                          >
                            <ZoomIn size={14} /> İncele
                          </button>
                          <button
                            onClick={e => handleToggleStatus(err.id, err.status, e)}
                            style={{
                              flex: 1.3,
                              background: isResolved ? '#f0fdf4' : '#fff1f2',
                              color: isResolved ? '#16a34a' : '#e11d48',
                              border: isResolved ? '1px solid #86efac' : '1px solid #fecdd3',
                              borderRadius: '0.6rem',
                              padding: '0.45rem',
                              fontWeight: 900,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justify: 'center',
                              gap: 4
                            }}
                          >
                            {isResolved ? <><RotateCcwIcon size={13} /> Tekrar Et</> : <><Check size={13} /> Öğrenildi Yap</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════
           SEKME 2: SINAV & ÖDEV KONTROL TAKİBİ (EXİSTİNG)
        ════════════════════════════════════════════ */}
        {activeMainTab === 'wrong_controls' && (
          <div>
            {/* LEVEL 1: COLORFUL SUBJECT CARDS PORTAL */}
            {selectedSubject === null && (
              <div>
                <div style={{ background: 'white', padding: '1.25rem 1.5rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FolderOpen size={22} color="#4f46e5" /> İncelemek İstediğiniz Ders Kartına Tıklayın:
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1.5px solid #fca5a5', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem' }}>
                      ❌ Yanlış: {globalWrongCount}
                    </span>
                    <span style={{ background: '#f8fafc', color: '#475569', border: '1.5px solid #cbd5e1', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem' }}>
                      ⚪ Boş: {globalBlankCount}
                    </span>
                    <span style={{ background: '#f0fdf4', color: '#15803d', border: '1.5px solid #86efac', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem' }}>
                      ✅ Kontrol Edilen Sınav: {globalReviewedCount} / {testGroupedSubmissions.length}
                    </span>
                  </div>
                </div>

                {/* VIBRANT COLORFUL SUBJECT CARDS GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                  
                  {/* SPECIAL "TÜM DERSLER" CARD */}
                  <div
                    onClick={() => setSelectedSubject('all')}
                    style={{
                      background: subjectThemes['all_subjects'].bg,
                      borderRadius: '1.5rem',
                      padding: '1.75rem',
                      color: 'white',
                      cursor: 'pointer',
                      boxShadow: subjectThemes['all_subjects'].shadow,
                      border: '1px solid rgba(255,255,255,0.3)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between',
                      minHeight: 180
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.3rem 0.75rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Tüm Portfolyo
                        </span>
                        <h3 style={{ margin: '0.75rem 0 0 0', fontSize: '1.4rem', fontWeight: 900 }}>Tüm Dersler</h3>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '1rem', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <GraduationCap size={26} />
                      </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)', borderRadius: '1rem', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 700 }}>TOPLAM SINAV</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{testGroupedSubmissions.length} Sınav</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 800 }}>
                        İncele <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>

                  {/* INDIVIDUAL SUBJECT CARDS */}
                  {Object.entries(subjectCardStats).map(([subjName, stats]) => {
                    const theme = subjectThemes[subjName] || subjectThemes['Diğer'];
                    const IconComp = theme.icon;

                    return (
                      <div
                        key={subjName}
                        onClick={() => setSelectedSubject(subjName)}
                        style={{
                          background: theme.bg,
                          borderRadius: '1.5rem',
                          padding: '1.75rem',
                          color: 'white',
                          cursor: 'pointer',
                          boxShadow: theme.shadow,
                          border: '1px solid rgba(255,255,255,0.25)',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justify: 'space-between',
                          minHeight: 180
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.3rem 0.75rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Ders Klasörü
                            </span>
                            <h3 style={{ margin: '0.75rem 0 0 0', fontSize: '1.35rem', fontWeight: 900 }}>{subjName}</h3>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '1rem', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconComp size={24} />
                          </div>
                        </div>

                        <div style={{ marginTop: '1.25rem', background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)', borderRadius: '1rem', padding: '0.65rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.85, fontWeight: 700 }}>SINAV / KONTROL</div>
                            <div style={{ fontSize: '1rem', fontWeight: 900 }}>
                              {stats.testCount} Sınav ({stats.wrongCount} Yanlış)
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem', fontWeight: 800 }}>
                            Aç <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LEVEL 2: INSIDE SUBJECT FOLDER LIST VIEW */}
            {selectedSubject !== null && (
              <div>
                {/* TOOLBAR */}
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ background: '#ef4444', color: 'white', fontWeight: 900, padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontSize: '0.9rem' }}>
                        {currentSubjectInfo.title}
                      </span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#64748b' }}>
                        Toplam {filteredTestSubmissions.length} sınav kaydı listeleniyor
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>Görünüm:</span>
                      <button
                        onClick={() => setViewMode('table')}
                        style={{
                          background: viewMode === 'table' ? '#0f172a' : '#f1f5f9',
                          color: viewMode === 'table' ? 'white' : '#64748b',
                          border: 'none',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '0.6rem',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Table size={15} /> Tablo
                      </button>
                      <button
                        onClick={() => setViewMode('cards')}
                        style={{
                          background: viewMode === 'cards' ? '#0f172a' : '#f1f5f9',
                          color: viewMode === 'cards' ? 'white' : '#64748b',
                          border: 'none',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '0.6rem',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <List size={15} /> Kartlar
                      </button>
                    </div>
                  </div>

                  {/* FILTERS */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                      <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Sınav veya ödev adıyla ara..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.85rem 0.5rem 2.2rem',
                          borderRadius: '0.65rem',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.82rem',
                          outline: 'none',
                          fontWeight: 600
                        }}
                      />
                    </div>

                    <select
                      value={ansTypeFilter}
                      onChange={e => setAnsTypeFilter(e.target.value)}
                      style={{ padding: '0.5rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      <option value="all">Tüm Hatalar (Yanlış & Boş)</option>
                      <option value="wrong">Sadece Yanlışı Olanlar</option>
                      <option value="blank">Sadece Boşu Olanlar</option>
                    </select>

                    <select
                      value={reviewFilter}
                      onChange={e => setReviewFilter(e.target.value)}
                      style={{ padding: '0.5rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      <option value="all">Tüm Kontrol Durumları</option>
                      <option value="unreviewed">⚠️ Kontrol Edilmeyenler</option>
                      <option value="reviewed">✓ Kontrol Edilenler</option>
                    </select>
                  </div>
                </div>

                {/* TEST LIST TABLE VIEW */}
                {viewMode === 'table' ? (
                  <div style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <th style={{ padding: '0.85rem 1.25rem' }}>Sınav / Ödev Adı</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Ders</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Yanlış Sorular</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Boş Sorular</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Tarih</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Kontrol Durumu</th>
                            <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTestSubmissions.map(sub => {
                            return (
                              <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: 900, color: '#0f172a' }}>
                                  {sub.testTitle || 'İsimsiz Sınav'}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  <span style={{ background: '#f1f5f9', color: '#334155', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 800 }}>
                                    {sub.subject}
                                  </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  {sub.wrongQuestions.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                      {sub.wrongQuestions.map(q => (
                                        <span key={q.qNum} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.1rem 0.45rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                                          Soru {q.qNum}
                                        </span>
                                      ))}
                                    </div>
                                  ) : <span style={{ color: '#94a3b8' }}>—</span>}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  {sub.blankQuestions.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                      {sub.blankQuestions.map(q => (
                                        <span key={q.qNum} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '0.1rem 0.45rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                                          Soru {q.qNum}
                                        </span>
                                      ))}
                                    </div>
                                  ) : <span style={{ color: '#94a3b8' }}>—</span>}
                                </td>
                                <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
                                  {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : '—'}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  <button
                                    onClick={(e) => toggleSubmissionReviewed(sub.id, e)}
                                    style={{
                                      border: 'none',
                                      background: sub.isReviewed ? '#f0fdf4' : '#fffbeb',
                                      color: sub.isReviewed ? '#16a34a' : '#d97706',
                                      padding: '0.35rem 0.75rem',
                                      borderRadius: '0.65rem',
                                      fontSize: '0.78rem',
                                      fontWeight: 900,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                  >
                                    {sub.isReviewed ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                    {sub.isReviewed ? '✓ Kontrol Edildi' : '⚠️ Kontrol Et'}
                                  </button>
                                </td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                  <button
                                    onClick={(e) => handleOpenReview(sub.id, e)}
                                    style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '0.65rem', fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <Eye size={14} /> İncele
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* CARDS VIEW */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {filteredTestSubmissions.map(sub => {
                      return (
                        <div key={sub.id} style={{ background: 'white', borderRadius: '1.25rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 6, textTransform: 'uppercase' }}>
                                {sub.subject}
                              </span>
                              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>{sub.testTitle}</h3>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.75rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '0.85rem' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>YANLIŞLAR ({sub.wrongQuestions.length})</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                {sub.wrongQuestions.map(q => <span key={q.qNum} style={{ background: '#fef2f2', color: '#dc2626', fontSize: '0.7rem', fontWeight: 800, padding: '0.1rem 0.35rem', borderRadius: 4 }}>S{q.qNum}</span>)}
                              </div>
                            </div>
                            <div style={{ width: 1, background: '#e2e8f0' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', marginBottom: 4 }}>BOŞLAR ({sub.blankQuestions.length})</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                {sub.blankQuestions.map(q => <span key={q.qNum} style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.7rem', fontWeight: 800, padding: '0.1rem 0.35rem', borderRadius: 4 }}>S{q.qNum}</span>)}
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                            <button
                              onClick={(e) => toggleSubmissionReviewed(sub.id, e)}
                              style={{ border: 'none', background: sub.isReviewed ? '#f0fdf4' : '#fffbeb', color: sub.isReviewed ? '#16a34a' : '#d97706', padding: '0.4rem 0.75rem', borderRadius: '0.65rem', fontSize: '0.78rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              {sub.isReviewed ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                              {sub.isReviewed ? '✓ Kontrol Edildi' : '⚠️ Kontrol Et'}
                            </button>

                            <button
                              onClick={(e) => handleOpenReview(sub.id, e)}
                              style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '0.65rem', fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <Eye size={14} /> Sınavı Aç
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════
         MODAL 1: + YANLIŞ SORU GÖRSELİ EKLE
      ════════════════════════════════════════════ */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '1.5rem', padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Yanlış Soru Görseli Ekle</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Sorunun fotoğrafını yükleyin ve ait olduğu ödevi seçin.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveNewError} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* 1. ÖDEV / SINAV SEÇİMİ (CRITICAL REQUIREMENT) */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>
                  📌 Ait Olduğu Ödev / Sınav
                </label>
                <select
                  value={newErrorForm.homeworkId}
                  onChange={e => handleSelectHomeworkForModal(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, outline: 'none', background: '#f8fafc' }}
                >
                  <option value="">-- Ödev / Sınav Seçin --</option>
                  <option value="custom">✏️ Diğer / Ödev Dışı Özel Soru</option>
                  {availableHomeworkOptions.map(hw => (
                    <option key={hw.id} value={hw.id}>
                      {hw.title} ({hw.subject}) {hw.wrongCount > 0 ? `— ❌ ${hw.wrongCount} Yanlış` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Özel Sınav Adı Girişi (Custom seçilirse) */}
              {newErrorForm.homeworkId === 'custom' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>Özel Sınav / Kaynak Adı</label>
                  <input
                    type="text"
                    placeholder="Örn: 3D Yayınları TYT Denemesi"
                    value={newErrorForm.testTitle}
                    onChange={e => setNewErrorForm(p => ({ ...p, testTitle: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                  />
                </div>
              )}

              {/* 2. DERS VE KONU SEÇİMİ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>Ders</label>
                  <select
                    value={newErrorForm.subject}
                    onChange={e => setNewErrorForm(p => ({ ...p, subject: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
                  >
                    <option value="Matematik">Matematik</option>
                    <option value="Fen Bilimleri">Fen Bilimleri</option>
                    <option value="Türkçe">Türkçe</option>
                    <option value="Sosyal Bilgiler">Sosyal Bilgiler</option>
                    <option value="İngilizce">İngilizce</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>Konu / Ünite (İsteğe Bağlı)</label>
                  <input
                    type="text"
                    placeholder="Örn: Çarpanlar ve Katlar"
                    value={newErrorForm.topic}
                    onChange={e => setNewErrorForm(p => ({ ...p, topic: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* 3. SORU GÖRSELİ YÜKLEME (FOTOĞRAF / KAMERA) */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>
                  📸 Soru Fotoğrafı Yükleyin
                </label>
                {newErrorForm.imageUrl ? (
                  <div style={{ position: 'relative', height: 160, borderRadius: '0.85rem', overflow: 'hidden', border: '2px solid #e11d48', background: '#0f172a' }}>
                    <img src={newErrorForm.imageUrl} alt="Soru Önizleme" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <button
                      type="button"
                      onClick={() => setNewErrorForm(p => ({ ...p, imageUrl: '' }))}
                      style={{ position: 'absolute', top: 8, right: 8, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '0.85rem', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                    <Upload size={28} color="#e11d48" style={{ marginBottom: 6 }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Fotoğraf Seç veya Kamera İle Çek</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>PNG, JPG (Maks 8MB)</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* 4. HATA SEBEBİ PRESETS */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>
                  ⚡ Hata Sebebi / Nedeni
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {REASON_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewErrorForm(p => ({ ...p, reason: preset }))}
                      style={{
                        border: newErrorForm.reason === preset ? 'none' : '1px solid #cbd5e1',
                        background: newErrorForm.reason === preset ? '#e11d48' : '#f8fafc',
                        color: newErrorForm.reason === preset ? 'white' : '#475569',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.55rem',
                        borderRadius: 6,
                        cursor: 'pointer'
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. ÖĞRENCİ NOTU VE ÇÖZÜM NOTU */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>Notunuz / Çözüm Açıklaması</label>
                <textarea
                  rows={2}
                  placeholder="Soru hakkında unutulmaması gereken notlar, doğru cevap veya çözüm adımları..."
                  value={newErrorForm.note}
                  onChange={e => setNewErrorForm(p => ({ ...p, note: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600, outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>İptal</button>
                <button type="submit" style={{ background: '#e11d48', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.25rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(225,29,72,0.3)' }}>Hata Defterine Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
         MODAL 2: GÖRSEL DETAY & YÜKSEK ÇÖZÜNÜRLÜK İNCELEME
      ════════════════════════════════════════════ */}
      {viewingErrorModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '1.5rem', padding: '1.5rem', width: '100%', maxWidth: 840, maxHeight: '92vh', overflowY: 'auto', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ background: '#e11d48', color: 'white', fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: 6, textTransform: 'uppercase' }}>
                  {viewingErrorModal.subject}
                </span>
                <h3 style={{ margin: '0.3rem 0 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  {viewingErrorModal.testTitle} {viewingErrorModal.topic ? `· ${viewingErrorModal.topic}` : ''}
                </h3>
              </div>
              <button onClick={() => setViewingErrorModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>

            {/* Büyük Görsel */}
            <div style={{ background: '#0f172a', borderRadius: '1rem', overflow: 'hidden', minHeight: 320, maxHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
              <img src={viewingErrorModal.imageUrl} alt="Büyük Soru Görseli" style={{ maxWidth: '100%', maxHeight: 460, objectFit: 'contain', borderRadius: '0.5rem' }} />
            </div>

            {/* Detaylar */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {viewingErrorModal.reason && (
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#dc2626' }}>
                  ⚡ Hata Nedeni: {viewingErrorModal.reason}
                </div>
              )}
              {viewingErrorModal.note && (
                <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                  💬 Not: {viewingErrorModal.note}
                </div>
              )}
              {viewingErrorModal.solutionNote && (
                <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 700, background: '#f0fdf4', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #86efac' }}>
                  ✅ Çözüm Adımları: {viewingErrorModal.solutionNote}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={e => handleDeleteErrorRecord(viewingErrorModal.id, e)}
                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '0.6rem 1rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Trash2 size={15} /> Görseli Sil
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={e => handleToggleStatus(viewingErrorModal.id, viewingErrorModal.status, e)}
                  style={{
                    background: viewingErrorModal.status === 'resolved' ? '#f0fdf4' : '#fff1f2',
                    color: viewingErrorModal.status === 'resolved' ? '#16a34a' : '#e11d48',
                    border: viewingErrorModal.status === 'resolved' ? '1.5px solid #86efac' : '1.5px solid #fecdd3',
                    borderRadius: '0.75rem',
                    padding: '0.6rem 1.25rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {viewingErrorModal.status === 'resolved' ? <><RotateCcwIcon size={16} /> Tekrar Et (Çözülecek Yap)</> : <><CheckCircle2 size={16} /> ✅ Öğrenildilarak İşaretle</>}
                </button>

                <button onClick={() => setViewingErrorModal(null)} style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.25rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}>Kapat</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helper icon component for rotate status
function RotateCcwIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
