import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle, Search, Filter, Calendar, CheckCircle2, XCircle,
  ArrowLeft, GraduationCap, Ruler, TestTube2, BookCopy, Globe,
  MessageSquare, Sparkles, BookOpen, Layers, Trophy, HelpCircle, Eye,
  Table, List, ChevronRight, FolderOpen, Check, Clock, Plus, Upload,
  Image as ImageIcon, Trash2, ZoomIn, X, Camera, BookMarked
} from 'lucide-react';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useCoaching } from '../context/CoachingContext';
import { useHomework } from '../context/HomeworkContext';
import { useAuth } from '../context/AuthContext';

const subjectThemes = {
  'all_subjects': {
    bg: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
    icon: GraduationCap,
    color: '#818cf8',
    border: 'rgba(129,140,248,0.35)',
    shadow: '0 12px 28px -5px rgba(99,102,241,0.4)'
  },
  'Matematik': {
    bg: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    icon: Ruler,
    color: '#60a5fa',
    border: 'rgba(96,165,250,0.35)',
    shadow: '0 10px 25px -5px rgba(37,99,235,0.4)'
  },
  'Fen Bilimleri': {
    bg: 'linear-gradient(135deg, #064e3b 0%, #0d9488 100%)',
    icon: TestTube2,
    color: '#34d399',
    border: 'rgba(52,211,153,0.35)',
    shadow: '0 10px 25px -5px rgba(13,148,136,0.4)'
  },
  'Türkçe': {
    bg: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
    icon: BookCopy,
    color: '#fb923c',
    border: 'rgba(251,146,60,0.35)',
    shadow: '0 10px 25px -5px rgba(234,88,12,0.4)'
  },
  'Sosyal Bilgiler': {
    bg: 'linear-gradient(135deg, #581c87 0%, #9333ea 100%)',
    icon: Globe,
    color: '#c084fc',
    border: 'rgba(192,132,252,0.35)',
    shadow: '0 10px 25px -5px rgba(147,51,234,0.4)'
  },
  'İngilizce': {
    bg: 'linear-gradient(135deg, #831843 0%, #e11d48 100%)',
    icon: MessageSquare,
    color: '#fb7185',
    border: 'rgba(251,113,133,0.35)',
    shadow: '0 10px 25px -5px rgba(225,29,72,0.4)'
  },
  'Genel Testler': {
    bg: 'linear-gradient(135deg, #312e81 0%, #4f46e5 100%)',
    icon: Trophy,
    color: '#a5b4fc',
    border: 'rgba(165,180,252,0.35)',
    shadow: '0 10px 25px -5px rgba(79,70,229,0.4)'
  },
  'Diğer': {
    bg: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
    icon: BookOpen,
    color: '#cbd5e1',
    border: 'rgba(255,255,255,0.15)',
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

  // Auto-sync selectedStudent when users or currentUser updates
  useEffect(() => {
    if (!selectedStudent) {
      if (currentUser?.role === 'student') {
        setSelectedStudent(currentUser);
      } else if (studentMembers.length > 0) {
        setSelectedStudent(studentMembers[0]);
      }
    }
  }, [currentUser, studentMembers, selectedStudent]);

  // Default main tab is 'wrong_controls' so the original Yanlışlarım page is 100% preserved as default!
  const [activeMainTab, setActiveMainTab] = useState('wrong_controls');

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

  const activeStudent = useMemo(() => {
    return selectedStudent || (currentUser?.role === 'student' ? currentUser : studentMembers[0]) || { id: 'u1', name: 'Öğrenci' };
  }, [selectedStudent, currentUser, studentMembers]);

  // Current student's coaching profile error entries
  const currentProfile = useMemo(() => {
    if (!activeStudent?.id) return null;
    return getCoachingProfileForStudent(activeStudent.id);
  }, [getCoachingProfileForStudent, activeStudent]);

  const studentErrors = useMemo(() => {
    return currentProfile?.errors || [];
  }, [currentProfile]);

  // Build a lookup map of all tests from CurriculumContext
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

  // Combine submissions from EvaluationContext and HomeworkContext for activeStudent
  const allSubmissions = useMemo(() => {
    if (!activeStudent?.id) return [];

    const studentIdStr = String(activeStudent.id);

    // 1. Gather all base submissions from EvaluationContext
    const baseSubs = (submissions || []).filter(s => {
      if (!s.studentId && !s.user_id && !s.student_id) return true;
      return String(s.studentId || s.student_id || s.user_id) === studentIdStr;
    });

    // 2. Also incorporate completed homeworks from HomeworkContext if not already in EvaluationContext
    const hwSubs = [];
    (homeworks || []).forEach(hw => {
      (hw.submissions || []).forEach(sub => {
        if (String(sub.studentId || sub.student_id || sub.user_id) === studentIdStr) {
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

  // Group submissions with wrong & blank question numbers
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

      // Match homework and curriculum test for real title and subject
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

      // Infer subject
      let subject = sub.subject;
      if (matchedHw?.subject && subjectThemes[matchedHw.subject]) {
        subject = matchedHw.subject;
      } else if (matchedTest?.subject && subjectThemes[matchedTest.subject]) {
        subject = matchedTest.subject;
      } else if (!subject || subject === 'Genel' || !subjectThemes[subject]) {
        const titleLower = (resolvedTitle || '').toLowerCase();
        if (titleLower.includes('mat')) subject = 'Matematik';
        else if (titleLower.includes('fen')) subject = 'Fen Bilimleri';
        else if (titleLower.includes('türk') || titleLower.includes('turk')) subject = 'Türkçe';
        else if (titleLower.includes('sosyal') || titleLower.includes('inkılap') || titleLower.includes('inkilap')) subject = 'Sosyal Bilgiler';
        else if (titleLower.includes('ing') || titleLower.includes('english')) subject = 'İngilizce';
        else if (titleLower.includes('deneme')) subject = 'Genel Testler';
        else subject = 'Matematik';
      }

      // Infer topic
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

  // Combine testGroupedSubmissions and all assigned homeworks for dropdown selection
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
          const matchedTest = allCurTestsMap.get(hw.id);
          map.set(hw.id, {
            id: hw.id,
            title: hw.title || 'Ödev',
            subject: hw.subject || 'Matematik',
            topic: hw.topic || hw.topicName || hw.unit || matchedTest?.topic || '',
            wrongCount: 0,
            blankCount: 0,
            date: hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('tr-TR') : ''
          });
        }
      });

    return Array.from(map.values());
  }, [testGroupedSubmissions, homeworks, selectedStudent, allCurTestsMap]);

  // Open Add Image Modal pre-selecting a test
  const handleOpenAddModal = (defaultSub = null) => {
    let initialHwId = defaultSub?.id || '';
    let initialTitle = defaultSub?.testTitle || defaultSub?.title || '';
    let initialSubject = defaultSub?.subject || '';
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
      subject: initialSubject || 'Matematik',
      topic: initialTopic || '',
      questionNo: '',
      imageUrl: '',
      reason: '⚡ İşlem Hatası',
      note: '',
      solutionNote: ''
    });
    setShowAddModal(true);
  };

  const handleOpenAddModalForTest = (sub, e) => {
    if (e) e.stopPropagation();
    handleOpenAddModal(sub);
  };

  const handleSelectHomeworkForModal = (hwId) => {
    if (hwId === 'custom' || !hwId) {
      setNewErrorForm(prev => ({
        ...prev,
        homeworkId: hwId || 'custom',
        testTitle: prev.testTitle || '',
        subject: prev.subject || 'Matematik',
        topic: prev.topic || ''
      }));
    } else {
      const selected = availableHomeworkOptions.find(o => String(o.id) === String(hwId));
      if (selected) {
        setNewErrorForm(prev => ({
          ...prev,
          homeworkId: selected.id,
          testTitle: selected.title,
          subject: selected.subject || prev.subject || 'Matematik',
          topic: selected.topic || ''
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

  const mistakeReasonDistribution = useMemo(() => {
    const counts = {
      '⚡ İşlem Hatası': { count: 0, color: '#f59e0b', label: 'İşlem Hatası' },
      '⚠️ Dikkat Kaybı / Yanlış Okuma': { count: 0, color: '#fb7185', label: 'Dikkat / Yanlış Okuma' },
      '📖 Formül / Bilgi Unutuldu': { count: 0, color: '#38bdf8', label: 'Formül / Bilgi Eksik' },
      '🧠 Konu Eksiği Var': { count: 0, color: '#a855f7', label: 'Konu Eksiği' },
      '⏱️ Zaman Yetmedi': { count: 0, color: '#ec4899', label: 'Zaman Yetmedi' },
    };
    let totalTagged = 0;

    studentErrors.forEach(err => {
      if (err.reason && counts[err.reason]) {
        counts[err.reason].count += 1;
        totalTagged += 1;
      } else if (err.reason) {
        const foundKey = Object.keys(counts).find(k => k.includes(err.reason) || err.reason.includes(counts[k].label));
        if (foundKey) {
          counts[foundKey].count += 1;
          totalTagged += 1;
        }
      }
    });

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mistake_reasons_')) {
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          Object.values(val).forEach(reason => {
            if (reason) {
              const matched = Object.keys(counts).find(k => k.includes(reason) || reason.includes(counts[k].label));
              if (matched) {
                counts[matched].count += 1;
                totalTagged += 1;
              }
            }
          });
        }
      }
    } catch {}

    return { counts, totalTagged };
  }, [studentErrors]);

  // Filtered Test Submissions (Returns all tests when selectedSubject is null or 'all')
  const filteredTestSubmissions = useMemo(() => {
    return testGroupedSubmissions.filter(sub => {
      const textMatch =
        !searchQuery.trim() ||
        (sub.testTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.subject || '').toLowerCase().includes(searchQuery.toLowerCase());

      const subjectMatch = !selectedSubject || selectedSubject === 'all' || sub.subject === selectedSubject;

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
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.28) 0%, transparent 50%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.22) 0%, transparent 50%), radial-gradient(ellipse at 50% 85%, rgba(14, 165, 233, 0.22) 0%, transparent 55%), linear-gradient(180deg, #0d1527 0%, #131f3b 35%, #1a274d 70%, #101a33 100%)', padding: '1.25rem 1rem', fontFamily: "'Inter', system-ui, sans-serif", color: '#f8fafc', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .wa-anim { animation: fadeSlideUp 0.3s ease both; }
        .wa-card-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .wa-card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(99,102,241,0.3) !important; }
        @media (max-width: 768px) {
          .wa-header-wrap { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .wa-tab-switcher { width: 100% !important; justify-content: stretch !important; }
          .wa-tab-switcher button { flex: 1 !important; justify-content: center !important; font-size: 0.76rem !important; padding: 0.5rem 0.65rem !important; }
          .wa-subject-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)) !important; gap: 10px !important; }
          .wa-filter-bar { flex-direction: column !important; align-items: stretch !important; }
          .wa-filter-bar input, .wa-filter-bar select { width: 100% !important; }
          .wa-cards-grid { grid-template-columns: 1fr !important; }
          .wa-notebook-stats { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '100%', margin: 0 }}>

        {/* HEADER */}
        <div className="wa-header-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => {
                if (selectedSubject !== null) {
                  setSelectedSubject(null);
                } else {
                  navigate('/student');
                }
              }}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: '0.75rem', padding: '0.55rem 0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#ffffff', boxShadow: '0 4px 14px rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
            >
              <ArrowLeft size={18} /> {selectedSubject !== null ? 'Ders Portalı / Kartlara Dön' : 'Öğrenci Paneli'}
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.55rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.6rem', textShadow: '0 2px 10px rgba(0,0,0,0.35)' }}>
                <AlertCircle color="#f87171" size={26} /> Yanlışlarım & Sınav Kontrol Takibi
              </h1>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                {activeMainTab === 'wrong_controls'
                  ? (selectedSubject === null
                      ? 'Ders kartlarına tıklayarak içerisine girin, hangi sınavların yanlışlarını kontrol ettiğinizi görün.'
                      : `${currentSubjectInfo.title} dersine ait tüm sınavları ve kontrol durumlarını inceliyorsunuz.`)
                  : 'Yanlış yaptığınız veya çözemediğiniz soruların görsellerini yükleyin, ödevlerinizle eşleştirin.'}
              </p>
            </div>
          </div>
        </div>

        {/* TOP LEVEL NAVIGATION TAB SWITCHER */}
        <div className="wa-tab-switcher" style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', padding: '0.4rem', borderRadius: '1.1rem', border: '1.5px solid rgba(255,255,255,0.12)', marginBottom: '1.75rem', width: 'fit-content', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)' }}>
          <button
            onClick={() => setActiveMainTab('wrong_controls')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.85rem',
              border: 'none',
              background: activeMainTab === 'wrong_controls' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: activeMainTab === 'wrong_controls' ? 'white' : 'rgba(255,255,255,0.7)',
              fontWeight: 900,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: activeMainTab === 'wrong_controls' ? '0 4px 14px rgba(99,102,241,0.4)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Layers size={18} /> 🔴 Sınav & Ödev Kontrol Takibi
            <span style={{ background: activeMainTab === 'wrong_controls' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', color: 'white', fontSize: '0.72rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 99 }}>
              {testGroupedSubmissions.length} Sınav
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('error_notebook')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.85rem',
              border: 'none',
              background: activeMainTab === 'error_notebook' ? 'linear-gradient(135deg, #e11d48, #f43f5e)' : 'transparent',
              color: activeMainTab === 'error_notebook' ? 'white' : 'rgba(255,255,255,0.7)',
              fontWeight: 900,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: activeMainTab === 'error_notebook' ? '0 4px 14px rgba(225,29,72,0.4)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <BookMarked size={18} /> 📕 Görsel Hata Defterim
            <span style={{ background: activeMainTab === 'error_notebook' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', color: 'white', fontSize: '0.72rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 99 }}>
              {studentErrors.length} Görsel
            </span>
          </button>
        </div>

        {/* ════════════════════════════════════════════
           SEKME 1: ORİJİNAL SINAV & ÖDEV KONTROL TAKİBİ
        ════════════════════════════════════════════ */}
        {activeMainTab === 'wrong_controls' && (
          <div className="wa-anim">
            {/* HATA SEBEBİ ANALİZİ (MISTAKE DIAGNOSTICS BAR) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1.5px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '1.25rem',
              padding: '1.15rem 1.4rem',
              marginBottom: '1.5rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(16px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(244, 63, 94, 0.2)', border: '1px solid rgba(251, 113, 133, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={18} color="#fb7185" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#ffffff' }}>
                      🧠 Hata Sebebi Dağılımı (Neden Yanlış Yaptım?)
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                      Optik testlerde ve hata defterinde etiketlenen yanlış sebeplerinin analizi
                    </p>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0.25rem 0.75rem', borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.72rem', fontWeight: 800, color: '#e2e8f0' }}>
                  Toplam {mistakeReasonDistribution.totalTagged} Etiketli Yanlış
                </div>
              </div>

              {/* Reason Pills Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                {Object.entries(mistakeReasonDistribution.counts).map(([key, item]) => {
                  const pct = mistakeReasonDistribution.totalTagged > 0
                    ? Math.round((item.count / mistakeReasonDistribution.totalTagged) * 100)
                    : 0;

                  return (
                    <div
                      key={key}
                      style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: `1.5px solid ${item.count > 0 ? `${item.color}40` : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '0.85rem',
                        padding: '0.75rem 0.95rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 6
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: item.color }}>
                          {item.label}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#ffffff' }}>
                          {item.count}
                        </span>
                      </div>

                      <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
                      </div>

                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textAlign: 'right' }}>
                        %{pct}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LEVEL 1: SUMMARY STATS BAR */}
            <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', padding: '1.25rem 1.5rem', borderRadius: '1.25rem', border: '1.5px solid rgba(255, 255, 255, 0.14)', boxShadow: '0 12px 36px rgba(0,0,0,0.35)', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backdropFilter: 'blur(20px)' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderOpen size={22} color="#a5b4fc" /> Ders Kartlarına Tıklayarak Filtreleyin:
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(225,29,72,0.2)', color: '#f87171', border: '1.5px solid rgba(253,164,175,0.35)', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem' }}>
                  ❌ Yanlış: {globalWrongCount}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', border: '1.5px solid rgba(255,255,255,0.15)', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem' }}>
                  ⚪ Boş: {globalBlankCount}
                </span>
                <span style={{ background: 'rgba(5,150,105,0.2)', color: '#4ade80', border: '1.5px solid rgba(52,211,153,0.35)', padding: '0.4rem 0.85rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.85rem' }}>
                  ✅ Kontrol Edilen Sınav: {globalReviewedCount} / {testGroupedSubmissions.length}
                </span>
              </div>
            </div>

            {/* VIBRANT COLORFUL SUBJECT CARDS GRID */}
            <div className="wa-subject-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              
              {/* SPECIAL "TÜM DERSLER" CARD */}
              <div
                onClick={() => setSelectedSubject(null)}
                className="wa-card-hover"
                style={{
                  background: selectedSubject === null || selectedSubject === 'all' ? subjectThemes['all_subjects'].bg : 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 27, 75, 0.85) 100%)',
                  color: 'white',
                  borderRadius: '1.35rem',
                  padding: '1.35rem',
                  cursor: 'pointer',
                  boxShadow: selectedSubject === null || selectedSubject === 'all' ? subjectThemes['all_subjects'].shadow : '0 4px 16px rgba(0,0,0,0.25)',
                  border: selectedSubject === null || selectedSubject === 'all' ? '1.5px solid rgba(255,255,255,0.4)' : '1.5px solid rgba(255,255,255,0.12)',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 150,
                  backdropFilter: 'blur(16px)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', padding: '0.25rem 0.65rem', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      Tüm Portfolyo
                    </span>
                    <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>Tüm Dersler</h3>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: '0.85rem', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <GraduationCap size={22} />
                  </div>
                </div>

                <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.85rem', padding: '0.55rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>TOPLAM SINAV</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff' }}>{testGroupedSubmissions.length} Sınav</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.78rem', fontWeight: 800, color: '#a5b4fc' }}>
                    {selectedSubject === null ? 'Tümü Seçili' : 'Seç'} <ChevronRight size={14} />
                  </div>
                </div>
              </div>

              {/* INDIVIDUAL SUBJECT CARDS */}
              {Object.entries(subjectCardStats).map(([subjName, stats]) => {
                const theme = subjectThemes[subjName] || subjectThemes['Diğer'];
                const IconComp = theme.icon;
                const isSelected = selectedSubject === subjName;

                return (
                  <div
                    key={subjName}
                    onClick={() => setSelectedSubject(isSelected ? null : subjName)}
                    className="wa-card-hover"
                    style={{
                      background: isSelected ? theme.bg : 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 27, 75, 0.85) 100%)',
                      color: 'white',
                      borderRadius: '1.35rem',
                      padding: '1.35rem',
                      cursor: 'pointer',
                      boxShadow: isSelected ? theme.shadow : '0 4px 16px rgba(0,0,0,0.25)',
                      border: isSelected ? `1.5px solid ${theme.border}` : '1.5px solid rgba(255,255,255,0.12)',
                      transition: 'all 0.25s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 150,
                      backdropFilter: 'blur(16px)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', color: '#ffffff', padding: '0.25rem 0.65rem', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
                          Ders Klasörü
                        </span>
                        <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>{subjName}</h3>
                      </div>
                      <div style={{ background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', color: isSelected ? 'white' : theme.color, borderRadius: '0.85rem', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${theme.border}` }}>
                        <IconComp size={22} />
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.85rem', padding: '0.55rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>SINAV / KONTROL</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ffffff' }}>
                          {stats.testCount} Sınav ({stats.wrongCount} Yanlış)
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.78rem', fontWeight: 800, color: theme.color }}>
                        {isSelected ? 'Seçili' : 'Filtrele'} <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BREADCRUMB / ACTIVE FILTER INDICATOR */}
            {selectedSubject && selectedSubject !== 'all' && (
              <div style={{ background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(49, 46, 129, 0.95) 100%)', padding: '0.85rem 1.25rem', borderRadius: '1rem', border: '1.5px solid rgba(165,180,252,0.35)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, backdropFilter: 'blur(16px)' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FolderOpen size={18} color="#a5b4fc" />
                  <span>Şu an sadece <strong style={{ color: '#ffffff' }}>{selectedSubject}</strong> dersine ait sınavlar listeleniyor ({filteredTestSubmissions.length} Sınav)</span>
                </div>
                <button
                  onClick={() => setSelectedSubject(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.6rem', padding: '0.35rem 0.75rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', color: '#ffffff' }}
                >
                  ✕ Tüm Dersleri Göster
                </button>
              </div>
            )}

            {/* SEARCH & FILTERS BAR INSIDE FOLDER */}
            <div className="wa-filter-bar" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', padding: '1.15rem 1.35rem', borderRadius: '1.25rem', border: '1.5px solid rgba(255, 255, 255, 0.14)', boxShadow: '0 12px 36px rgba(0,0,0,0.35)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(20px)' }}>
              
              {/* Live Search Bar */}
              <div style={{ flex: '1 1 280px', position: 'relative' }}>
                <Search size={18} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Sınav adı veya ders ara..."
                  style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', fontSize: '0.9rem', fontWeight: 600, outline: 'none', background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                {/* REVIEWED TRACKING FILTER */}
                <select
                  value={reviewFilter}
                  onChange={e => setReviewFilter(e.target.value)}
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="all" style={{ background: '#0f172a', color: '#ffffff' }}>Tüm İnceleme Durumları</option>
                  <option value="unreviewed" style={{ background: '#0f172a', color: '#ffffff' }}>⚠️ Kontrol Edilmeyen Sınavlar</option>
                  <option value="reviewed" style={{ background: '#0f172a', color: '#ffffff' }}>✅ Kontrol Edilen Sınavlar</option>
                </select>

                {/* Answer Type Filter */}
                <select
                  value={ansTypeFilter}
                  onChange={e => setAnsTypeFilter(e.target.value)}
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="all" style={{ background: '#0f172a', color: '#ffffff' }}>Tüm Yanlış ve Boşlar</option>
                  <option value="wrong" style={{ background: '#0f172a', color: '#ffffff' }}>❌ Sadece Yanlış Yapılanlar</option>
                  <option value="blank" style={{ background: '#0f172a', color: '#ffffff' }}>⚪ Sadece Boş Bırakılanlar</option>
                </select>

                {/* View Switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.06)', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    onClick={() => setViewMode('table')}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: '0.6rem',
                      border: 'none',
                      background: viewMode === 'table' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                      color: viewMode === 'table' ? 'white' : 'rgba(255,255,255,0.6)',
                      fontWeight: 900,
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
                      padding: '0.45rem 0.75rem',
                      borderRadius: '0.6rem',
                      border: 'none',
                      background: viewMode === 'cards' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                      color: viewMode === 'cards' ? 'white' : 'rgba(255,255,255,0.6)',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <List size={15} /> Kart
                  </button>
                </div>
              </div>
            </div>

            {/* INSIDE FOLDER MODE 1: EXCEL SINGLE-ROW TABLE VIEW */}
            {viewMode === 'table' && (
              <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', borderRadius: '1.25rem', border: '1.5px solid rgba(255, 255, 255, 0.14)', overflow: 'hidden', boxShadow: '0 12px 36px rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: 800 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1.5px solid rgba(255,255,255,0.12)', fontSize: '0.74rem', color: '#c7d2fe' }}>
                        <th style={{ padding: '1rem 1.15rem', fontWeight: 900, whiteSpace: 'nowrap' }}>SINAV / ÖDEV BAŞLIĞI</th>
                        <th style={{ padding: '1rem 1.15rem', fontWeight: 900, whiteSpace: 'nowrap' }}>DERS</th>
                        <th style={{ padding: '1rem 1.15rem', fontWeight: 900, whiteSpace: 'nowrap' }}>TARİH</th>
                        <th style={{ padding: '1rem 1.15rem', fontWeight: 900, whiteSpace: 'nowrap' }}>TÜR</th>
                        <th style={{ padding: '1rem 1.15rem', fontWeight: 900, whiteSpace: 'nowrap' }}>❌ YANLIŞ SORULAR</th>
                        <th style={{ padding: '1rem 1.15rem', fontWeight: 900, whiteSpace: 'nowrap' }}>⚪ BOŞ SORULAR</th>
                        <th style={{ padding: '1rem 1.15rem', fontWeight: 900, whiteSpace: 'nowrap' }}>KONTROL DURUMU</th>
                        <th style={{ padding: '1rem 1.15rem', fontWeight: 900, textAlign: 'right', whiteSpace: 'nowrap' }}>İŞLEM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTestSubmissions.map((sub, idx) => {
                        const theme = subjectThemes[sub.subject] || subjectThemes['Diğer'];
                        const SubjectIcon = theme.icon;

                        return (
                          <tr
                            key={sub.id || idx}
                            style={{
                              borderBottom: '1px solid rgba(255,255,255,0.06)',
                              background: sub.isReviewed ? 'rgba(99,102,241,0.08)' : (idx % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent'),
                              transition: 'background 0.15s'
                            }}
                          >
                            <td style={{ padding: '1rem 1.15rem', fontWeight: 900, color: '#ffffff' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <SubjectIcon size={16} color={theme.color} />
                                <span>{sub.testTitle || 'Test Sınavı'}</span>
                              </div>
                            </td>

                            <td style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>
                              <span style={{ background: theme.color + '22', color: theme.color, border: `1px solid ${theme.border}`, fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: '0.5rem' }}>
                                {sub.subject}
                              </span>
                            </td>

                            <td style={{ padding: '1rem 1.15rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                            </td>

                            <td style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '0.5rem' }}>
                                {sub.isHomework ? '📝 Ödev' : '⚡ Bireysel'}
                              </span>
                            </td>

                            <td style={{ padding: '1rem 1.15rem' }}>
                              {sub.wrongQuestions.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                  {sub.wrongQuestions.map(qObj => (
                                    <button
                                      key={qObj.qNum}
                                      onClick={(e) => handleOpenReview(sub.id, e)}
                                      style={{
                                        background: 'rgba(225,29,72,0.2)',
                                        color: '#f87171',
                                        border: '1.5px solid rgba(253,164,175,0.4)',
                                        padding: '0.2rem 0.55rem',
                                        borderRadius: '0.5rem',
                                        fontWeight: 900,
                                        fontSize: '0.78rem',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Soru {qObj.qNum}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: '#4ade80', fontWeight: 800, fontSize: '0.8rem' }}>✓ Yanlış Yok</span>
                              )}
                            </td>

                            <td style={{ padding: '1rem 1.15rem' }}>
                              {sub.blankQuestions.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                  {sub.blankQuestions.map(qObj => (
                                    <button
                                      key={qObj.qNum}
                                      onClick={(e) => handleOpenReview(sub.id, e)}
                                      style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        color: '#cbd5e1',
                                        border: '1.5px solid rgba(255,255,255,0.15)',
                                        padding: '0.2rem 0.55rem',
                                        borderRadius: '0.5rem',
                                        fontWeight: 900,
                                        fontSize: '0.78rem',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Soru {qObj.qNum}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>—</span>
                              )}
                            </td>

                            <td style={{ padding: '1rem 1.15rem', whiteSpace: 'nowrap' }}>
                              <button
                                onClick={(e) => toggleSubmissionReviewed(sub.id, e)}
                                style={{
                                  background: sub.isReviewed ? 'rgba(5,150,105,0.25)' : 'rgba(245,158,11,0.25)',
                                  color: sub.isReviewed ? '#4ade80' : '#fbbf24',
                                  border: sub.isReviewed ? '1.5px solid rgba(52,211,153,0.4)' : '1.5px solid rgba(253,186,116,0.4)',
                                  fontSize: '0.78rem',
                                  fontWeight: 900,
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '0.65rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem'
                                }}
                              >
                                {sub.isReviewed ? <CheckCircle2 size={14} color="#4ade80" /> : <Clock size={14} color="#fbbf24" />}
                                <span>{sub.isReviewed ? '✓ Kontrol Edildi' : '⚠️ Kontrol Et'}</span>
                              </button>
                            </td>

                            <td style={{ padding: '1rem 1.15rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={(e) => handleOpenAddModalForTest(sub, e)}
                                  title="Soru Görseli Ekle"
                                  style={{
                                    background: 'rgba(225,29,72,0.2)',
                                    color: '#fb7185',
                                    border: '1.5px solid rgba(251,113,133,0.35)',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.65rem',
                                    fontWeight: 800,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                  }}
                                >
                                  <Camera size={14} /> + Görsel Ekle
                                </button>

                                <button
                                  onClick={(e) => handleOpenReview(sub.id, e)}
                                  style={{
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.5rem 0.95rem',
                                    borderRadius: '0.65rem',
                                    fontWeight: 900,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    boxShadow: '0 4px 12px rgba(99,102,241,0.35)'
                                  }}
                                >
                                  <Eye size={15} /> Sınavı Aç
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredTestSubmissions.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                            Sonuç bulunamadı. Filtreleri değiştirmeyi deneyin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* INSIDE FOLDER MODE 2: TEST CARDS VIEW */}
            {viewMode === 'cards' && (
              <div className="wa-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.25rem' }}>
                {filteredTestSubmissions.map((sub, idx) => {
                  const theme = subjectThemes[sub.subject] || subjectThemes['Diğer'];
                  const SubjectIcon = theme.icon;

                  return (
                    <div
                      key={sub.id || idx}
                      className="wa-card-hover"
                      style={{
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
                        borderRadius: '1.25rem',
                        padding: '1.35rem',
                        border: '1.5px solid rgba(255, 255, 255, 0.14)',
                        boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1.15rem',
                        position: 'relative',
                        overflow: 'hidden',
                        backdropFilter: 'blur(20px)'
                      }}
                    >
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: theme.color }} />

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                          <span style={{ background: theme.color + '22', color: theme.color, border: `1px solid ${theme.border}`, fontSize: '0.75rem', fontWeight: 900, padding: '0.25rem 0.65rem', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <SubjectIcon size={14} color={theme.color} /> {sub.subject}
                          </span>

                          <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '0.5rem' }}>
                            {sub.isHomework ? '📝 Ödev Sınavı' : '⚡ Bireysel Sınav'}
                          </span>
                        </div>

                        <h3 style={{ margin: '0.35rem 0', fontSize: '1.1rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.35 }}>
                          {sub.testTitle || 'Test Sınavı'}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: '0.4rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={14} /> {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                          </span>
                          <span style={{ color: '#4ade80', fontWeight: 800 }}>✓ {sub.correctCount} / {sub.totalQuestions} Doğru</span>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {sub.wrongQuestions.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#f87171', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <XCircle size={14} color="#f87171" /> Yanlış Yapılan Sorular:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {sub.wrongQuestions.map(qObj => (
                                <button
                                  key={qObj.qNum}
                                  onClick={(e) => handleOpenReview(sub.id, e)}
                                  style={{
                                    background: 'rgba(225,29,72,0.2)',
                                    color: '#f87171',
                                    border: '1.5px solid rgba(253,164,175,0.4)',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '0.5rem',
                                    fontWeight: 900,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Soru {qObj.qNum}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {sub.blankQuestions.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#cbd5e1', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <HelpCircle size={14} color="#cbd5e1" /> Boş Bırakılan Sorular:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {sub.blankQuestions.map(qObj => (
                                <button
                                  key={qObj.qNum}
                                  onClick={(e) => handleOpenReview(sub.id, e)}
                                  style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#cbd5e1',
                                    border: '1.5px solid rgba(255,255,255,0.15)',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '0.5rem',
                                    fontWeight: 900,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Soru {qObj.qNum}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.85rem', flexWrap: 'wrap', gap: 8 }}>
                        <button
                          onClick={(e) => toggleSubmissionReviewed(sub.id, e)}
                          style={{
                            background: sub.isReviewed ? 'rgba(5,150,105,0.25)' : 'rgba(245,158,11,0.25)',
                            color: sub.isReviewed ? '#4ade80' : '#fbbf24',
                            border: sub.isReviewed ? '1.5px solid rgba(52,211,153,0.4)' : '1.5px solid rgba(253,186,116,0.4)',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            padding: '0.35rem 0.75rem',
                            borderRadius: '0.65rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          {sub.isReviewed ? <CheckCircle2 size={14} color="#4ade80" /> : <Clock size={14} color="#fbbf24" />}
                          <span>{sub.isReviewed ? '✓ Kontrol Edildi' : '⚠️ Kontrol Et'}</span>
                        </button>

                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={(e) => handleOpenAddModalForTest(sub, e)}
                            style={{
                              background: 'rgba(225,29,72,0.2)',
                              color: '#fb7185',
                              border: '1.5px solid rgba(251,113,133,0.35)',
                              padding: '0.55rem 0.85rem',
                              borderRadius: '0.75rem',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Camera size={14} /> + Görsel Ekle
                          </button>

                          <button
                            onClick={(e) => handleOpenReview(sub.id, e)}
                            style={{
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              color: 'white',
                              border: 'none',
                              padding: '0.55rem 1.15rem',
                              borderRadius: '0.75rem',
                              fontWeight: 900,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              boxShadow: '0 4px 12px rgba(99,102,241,0.35)'
                            }}
                          >
                            <Eye size={16} /> Sınavı Aç
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
           SEKME 2: GÖRSEL HATA DEFTERİM (SORU DEPOSU)
        ════════════════════════════════════════════ */}
        {activeMainTab === 'error_notebook' && (
          <div className="wa-anim" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ÖZET STAT KARTLARI & EYLEM BUTONU */}
            <div className="wa-notebook-stats" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', border: '1.5px solid rgba(255, 255, 255, 0.14)', boxShadow: '0 12px 36px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backdropFilter: 'blur(20px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Toplam Görsel</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff' }}>{studentErrors.length} Soru</div>
                  </div>
                </div>

                <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.12)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: 'rgba(225,29,72,0.2)', color: '#f87171', border: '1px solid rgba(253,164,175,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>🔴 Çözülecek</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f87171' }}>
                      {studentErrors.filter(e => e.status !== 'resolved').length} Soru
                    </div>
                  </div>
                </div>

                <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.12)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: 'rgba(5,150,105,0.2)', color: '#4ade80', border: '1px solid rgba(52,211,153,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>✅ Öğrenildi</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#4ade80' }}>
                      {studentErrors.filter(e => e.status === 'resolved').length} Soru
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenAddModal()}
                style={{
                  background: 'linear-gradient(135deg, #e11d48, #f43f5e)',
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
                  boxShadow: '0 4px 14px rgba(225,29,72,0.4)',
                  transition: 'transform 0.15s'
                }}
              >
                <Plus size={18} /> + Yanlış Soru Görseli Ekle
              </button>
            </div>

            {/* FİLTRE VE ARAMA ÇUBUĞU */}
            <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)', borderRadius: '1.25rem', padding: '1.1rem 1.25rem', border: '1.5px solid rgba(255, 255, 255, 0.14)', boxShadow: '0 12px 36px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '0.85rem', backdropFilter: 'blur(20px)' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                
                {/* Search Bar */}
                <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
                  <Search size={16} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Sınav adı, konu veya notlarda ara..."
                    value={notebookSearchQuery}
                    onChange={e => setNotebookSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem 0.55rem 2.3rem',
                      borderRadius: '0.75rem',
                      border: '1.5px solid rgba(255,255,255,0.16)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      outline: 'none',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Ödev / Sınav Seçimi Filtresi */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>Ödev/Sınav:</span>
                  <select
                    value={notebookHomeworkFilter}
                    onChange={e => setNotebookHomeworkFilter(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.75rem',
                      border: '1.5px solid rgba(255,255,255,0.16)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      outline: 'none',
                      background: 'rgba(255,255,255,0.08)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all" style={{ background: '#0f172a', color: '#ffffff' }}>🎯 Tüm Ödev & Sınavlar</option>
                    {availableHomeworkOptions.map(hw => (
                      <option key={hw.id} value={hw.id} style={{ background: '#0f172a', color: '#ffffff' }}>{hw.title} ({hw.subject})</option>
                    ))}
                  </select>
                </div>

                {/* Durum Filtresi */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', padding: 3, borderRadius: '0.65rem', gap: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
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
                        background: notebookStatusFilter === st.id ? 'linear-gradient(135deg, #e11d48, #f43f5e)' : 'transparent',
                        color: notebookStatusFilter === st.id ? 'white' : 'rgba(255,255,255,0.7)',
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
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', marginRight: 4 }}>DERS:</span>
                {['all', 'Genel Testler', 'Matematik', 'Fen Bilimleri', 'Türkçe', 'Sosyal Bilgiler', 'İngilizce', 'Diğer'].map(subj => {
                  const active = notebookSubjectFilter === subj;
                  return (
                    <button
                      key={subj}
                      onClick={() => setNotebookSubjectFilter(subj)}
                      style={{
                        border: active ? 'none' : '1px solid rgba(255,255,255,0.15)',
                        background: active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
                        color: active ? 'white' : 'rgba(255,255,255,0.7)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.65rem',
                        borderRadius: 99,
                        cursor: 'pointer'
                      }}
                    >
                      {subj === 'all' ? 'Tüm Dersler' : (subj === 'Genel Testler' ? '🏆 Genel Denemeler' : subj)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GÖRSEL SORU KARTLARI GRID */}
            {filteredStudentErrors.length === 0 ? (
              <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 27, 75, 0.85) 100%)', borderRadius: '1.25rem', padding: '3rem 2rem', textAlign: 'center', border: '2px dashed rgba(255,255,255,0.18)' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(225,29,72,0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '1px solid rgba(253,164,175,0.35)' }}>
                  <ImageIcon size={32} />
                </div>
                <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: 900, color: '#ffffff' }}>
                  {studentErrors.length === 0 ? 'Hata Defteriniz Henüz Boş' : 'Aramanızla Eşleşen Soru Bulunamadı'}
                </h3>
                <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, maxWidth: 460, marginInline: 'auto' }}>
                  {studentErrors.length === 0
                    ? 'Yanlış yaptığınız veya çözemediğiniz soruların fotoğraflarını çekip ödevlerinizle eşleştirerek hemen ekleyebilirsiniz.'
                    : 'Filtreleri sıfırlayarak tüm hata defteri görsellerinizi inceleyebilirsiniz.'}
                </p>
                {studentErrors.length === 0 ? (
                  <button
                    onClick={() => setShowAddModal(true)}
                    style={{ background: 'linear-gradient(135deg, #e11d48, #f43f5e)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.65rem 1.25rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(225,29,72,0.4)' }}
                  >
                    <Plus size={16} /> İlk Soru Görselini Ekle
                  </button>
                ) : (
                  <button
                    onClick={() => { setNotebookSubjectFilter('all'); setNotebookHomeworkFilter('all'); setNotebookStatusFilter('all'); setNotebookSearchQuery(''); }}
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.65rem 1.25rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
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
                      className="wa-card-hover"
                      style={{
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
                        borderRadius: '1.25rem',
                        border: isResolved ? '1.5px solid rgba(52,211,153,0.5)' : '1.5px solid rgba(255,255,255,0.14)',
                        boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        backdropFilter: 'blur(20px)'
                      }}
                    >
                      {/* Görsel Thumbnail Alanı */}
                      <div
                        onClick={() => setViewingErrorModal(err)}
                        style={{
                          height: 180,
                          background: '#0d1527',
                          position: 'relative',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img
                          src={err.imageUrl}
                          alt="Hata Görseli"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isResolved ? 0.8 : 1 }}
                        />

                        {/* Overlay Zoom Hint */}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, gap: 6 }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                        >
                          <ZoomIn size={22} /> Büyüt & İncele
                        </div>

                        {/* Durum Rozeti */}
                        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
                          {isResolved ? (
                            <span style={{ background: '#10b981', color: 'white', fontSize: '0.68rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
                              <CheckCircle2 size={12} /> Öğrenildi
                            </span>
                          ) : (
                            <span style={{ background: '#e11d48', color: 'white', fontSize: '0.68rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
                              <AlertCircle size={12} /> Çözülecek
                            </span>
                          )}
                        </div>

                        {/* Sil Butonu */}
                        <button
                          onClick={e => handleDeleteErrorRecord(err.id, e)}
                          title="Sil"
                          style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 3 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Kart İçerik */}
                      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                        
                        {/* Ders & Ödev Rozeti */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ background: theme.color + '22', color: theme.color, border: `1px solid ${theme.border}`, fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: 6, textTransform: 'uppercase' }}>
                            {err.subject}
                          </span>
                          {err.testTitle && (
                            <span style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 6, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={err.testTitle}>
                              📌 {err.testTitle}
                            </span>
                          )}
                        </div>

                        {/* Başlık / Konu */}
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#ffffff', lineHeight: 1.3 }}>
                            {err.topic || 'Konu Belirtilmedi'} {err.questionNo ? `(${err.questionNo})` : ''}
                          </div>
                          {err.reason && (
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f87171', marginTop: 2 }}>
                              {err.reason}
                            </div>
                          )}
                        </div>

                        {/* Öğrenci Notu */}
                        {err.note && (
                          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', background: 'rgba(0,0,0,0.3)', padding: '0.45rem 0.65rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.08)', lineHeight: 1.3 }}>
                            💬 {err.note}
                          </div>
                        )}

                        {/* Bottom Actions */}
                        <div style={{ marginTop: 'auto', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setViewingErrorModal(err)}
                            style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.6rem', padding: '0.45rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                          >
                            <ZoomIn size={14} /> İncele
                          </button>
                          <button
                            onClick={e => handleToggleStatus(err.id, err.status, e)}
                            style={{
                              flex: 1.3,
                              background: isResolved ? 'rgba(5,150,105,0.25)' : 'rgba(225,29,72,0.25)',
                              color: isResolved ? '#4ade80' : '#f87171',
                              border: isResolved ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(253,164,175,0.4)',
                              borderRadius: '0.6rem',
                              padding: '0.45rem',
                              fontWeight: 900,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
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

            {/* Bottom padding */}
            <div style={{ height: '2.5rem' }} />
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════
         MODAL 1: + YANLIŞ SORU GÖRSELİ EKLE
      ════════════════════════════════════════════ */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', borderRadius: '1.5rem', padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', border: '1.5px solid rgba(255,255,255,0.18)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', color: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: 'rgba(225,29,72,0.2)', color: '#f87171', border: '1px solid rgba(253,164,175,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#ffffff' }}>Yanlış Soru Görseli Ekle</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Sorunun fotoğrafını yükleyin ve ait olduğu ödevi seçin.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveNewError} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* 1. ÖDEV / SINAV SEÇİMİ */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#c7d2fe', display: 'block', marginBottom: 4 }}>
                  📌 Ait Olduğu Ödev / Sınav
                </label>
                <select
                  value={newErrorForm.homeworkId}
                  onChange={e => handleSelectHomeworkForModal(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', fontSize: '0.85rem', fontWeight: 700, outline: 'none', background: 'rgba(255,255,255,0.08)', color: '#ffffff', boxSizing: 'border-box', cursor: 'pointer' }}
                >
                  <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>-- Ödev / Sınav Seçin --</option>
                  <option value="custom" style={{ background: '#0f172a', color: '#ffffff' }}>✏️ Diğer / Ödev Dışı Özel Soru</option>
                  {availableHomeworkOptions.map(hw => (
                    <option key={hw.id} value={hw.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                      {hw.title} ({hw.subject}) {hw.wrongCount > 0 ? `— ❌ ${hw.wrongCount} Yanlış` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Özel Sınav Adı Girişi (Custom seçilirse) */}
              {newErrorForm.homeworkId === 'custom' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c7d2fe', display: 'block', marginBottom: 4 }}>Özel Sınav / Kaynak Adı</label>
                  <input
                    type="text"
                    placeholder="Örn: 3D Yayınları TYT Denemesi"
                    value={newErrorForm.testTitle}
                    onChange={e => setNewErrorForm(p => ({ ...p, testTitle: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.16)', fontSize: '0.82rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {/* 2. DERS VE KONU SEÇİMİ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c7d2fe', display: 'block', marginBottom: 4 }}>Ders</label>
                  <select
                    value={newErrorForm.subject}
                    onChange={e => setNewErrorForm(p => ({ ...p, subject: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.16)', fontSize: '0.82rem', fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#ffffff', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="Genel Testler" style={{ background: '#0f172a', color: '#ffffff' }}>🏆 Genel Testler (Tüm Dersler)</option>
                    <option value="Matematik" style={{ background: '#0f172a', color: '#ffffff' }}>Matematik</option>
                    <option value="Fen Bilimleri" style={{ background: '#0f172a', color: '#ffffff' }}>Fen Bilimleri</option>
                    <option value="Türkçe" style={{ background: '#0f172a', color: '#ffffff' }}>Türkçe</option>
                    <option value="Sosyal Bilgiler" style={{ background: '#0f172a', color: '#ffffff' }}>Sosyal Bilgiler</option>
                    <option value="İngilizce" style={{ background: '#0f172a', color: '#ffffff' }}>İngilizce</option>
                    <option value="Diğer" style={{ background: '#0f172a', color: '#ffffff' }}>Diğer</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c7d2fe', display: 'block', marginBottom: 4 }}>Konu / Ünite (İsteğe Bağlı)</label>
                  <input
                    type="text"
                    placeholder="Örn: Çarpanlar ve Katlar"
                    value={newErrorForm.topic}
                    onChange={e => setNewErrorForm(p => ({ ...p, topic: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.16)', fontSize: '0.82rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* 3. SORU GÖRSELİ YÜKLEME (FOTOĞRAF / KAMERA) */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c7d2fe', display: 'block', marginBottom: 4 }}>
                  📸 Soru Fotoğrafı Yükleyin
                </label>
                {newErrorForm.imageUrl ? (
                  <div style={{ position: 'relative', height: 160, borderRadius: '0.85rem', overflow: 'hidden', border: '2px solid #e11d48', background: '#0d1527' }}>
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
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '0.85rem', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                    <Upload size={28} color="#f87171" style={{ marginBottom: 6 }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>Fotoğraf Seç veya Kamera İle Çek</span>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>PNG, JPG (Maks 8MB)</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* 4. HATA SEBEBİ PRESETS */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c7d2fe', display: 'block', marginBottom: 4 }}>
                  ⚡ Hata Sebebi / Nedeni
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {REASON_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewErrorForm(p => ({ ...p, reason: preset }))}
                      style={{
                        border: newErrorForm.reason === preset ? 'none' : '1px solid rgba(255,255,255,0.15)',
                        background: newErrorForm.reason === preset ? 'linear-gradient(135deg, #e11d48, #f43f5e)' : 'rgba(255,255,255,0.06)',
                        color: newErrorForm.reason === preset ? 'white' : 'rgba(255,255,255,0.7)',
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
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c7d2fe', display: 'block', marginBottom: 4 }}>Notunuz / Çözüm Açıklaması</label>
                <textarea
                  rows={2}
                  placeholder="Soru hakkında unutulmaması gereken notlar, doğru cevap veya çözüm adımları..."
                  value={newErrorForm.note}
                  onChange={e => setNewErrorForm(p => ({ ...p, note: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid rgba(255,255,255,0.16)', fontSize: '0.82rem', fontWeight: 600, outline: 'none', resize: 'vertical', background: 'rgba(255,255,255,0.06)', color: '#ffffff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>İptal</button>
                <button type="submit" style={{ background: 'linear-gradient(135deg, #e11d48, #f43f5e)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.25rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(225,29,72,0.4)' }}>Hata Defterine Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
         MODAL 2: GÖRSEL DETAY & YÜKSEK ÇÖZÜNÜRLÜK İNCELEME
      ════════════════════════════════════════════ */}
      {viewingErrorModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(7,10,18,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', borderRadius: '1.5rem', padding: '1.5rem', width: '100%', maxWidth: 840, maxHeight: '92vh', overflowY: 'auto', border: '1.5px solid rgba(255,255,255,0.18)', display: 'flex', flexDirection: 'column', gap: '1rem', color: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ background: 'linear-gradient(135deg, #e11d48, #f43f5e)', color: 'white', fontSize: '0.72rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: 6, textTransform: 'uppercase' }}>
                  {viewingErrorModal.subject}
                </span>
                <h3 style={{ margin: '0.3rem 0 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                  {viewingErrorModal.testTitle} {viewingErrorModal.topic ? `· ${viewingErrorModal.topic}` : ''}
                </h3>
              </div>
              <button onClick={() => setViewingErrorModal(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}><X size={18} /></button>
            </div>

            {/* Büyük Görsel */}
            <div style={{ background: '#0d1527', borderRadius: '1rem', overflow: 'hidden', minHeight: 320, maxHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img src={viewingErrorModal.imageUrl} alt="Büyük Soru Görseli" style={{ maxWidth: '100%', maxHeight: 460, objectFit: 'contain', borderRadius: '0.5rem' }} />
            </div>

            {/* Detaylar */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {viewingErrorModal.reason && (
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#f87171' }}>
                  ⚡ Hata Nedeni: {viewingErrorModal.reason}
                </div>
              )}
              {viewingErrorModal.note && (
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                  💬 Not: {viewingErrorModal.note}
                </div>
              )}
              {viewingErrorModal.solutionNote && (
                <div style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 700, background: 'rgba(5,150,105,0.2)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(52,211,153,0.35)' }}>
                  ✅ Çözüm Adımları: {viewingErrorModal.solutionNote}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', gap: 8 }}>
              <button
                onClick={e => handleDeleteErrorRecord(viewingErrorModal.id, e)}
                style={{ background: 'rgba(225,29,72,0.2)', color: '#f87171', border: '1px solid rgba(253,164,175,0.35)', borderRadius: '0.75rem', padding: '0.6rem 1rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Trash2 size={15} /> Görseli Sil
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={e => handleToggleStatus(viewingErrorModal.id, viewingErrorModal.status, e)}
                  style={{
                    background: viewingErrorModal.status === 'resolved' ? 'rgba(5,150,105,0.25)' : 'rgba(225,29,72,0.25)',
                    color: viewingErrorModal.status === 'resolved' ? '#4ade80' : '#f87171',
                    border: viewingErrorModal.status === 'resolved' ? '1.5px solid rgba(52,211,153,0.4)' : '1.5px solid rgba(253,164,175,0.4)',
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
                  {viewingErrorModal.status === 'resolved' ? <><RotateCcwIcon size={16} /> Tekrar Et (Çözülecek Yap)</> : <><CheckCircle2 size={16} /> ✅ Öğrenildi Olarak İşaretle</>}
                </button>

                <button onClick={() => setViewingErrorModal(null)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.75rem', padding: '0.6rem 1.25rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}>Kapat</button>
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
